"""
Chain-of-Thought Reasoning Node

LangGraph node for query reasoning before generation.
Analyzes the question and creates a step-by-step query construction plan.
"""
import json
import logging
from typing import TypedDict, Optional, List, Dict, Any

from ..response_models import QueryReasoningResponse, ReasoningStep
from ..llm.structured_generator import StructuredGenerator

logger = logging.getLogger(__name__)


class ReasoningState(TypedDict):
    """State for reasoning node."""
    question: str
    project_id: int
    user_role: str
    previous_context: Optional[str]
    reasoning: Optional[QueryReasoningResponse]
    relevant_tables: List[str]


# =============================================================================
# Reasoning Prompts
# =============================================================================

REASONING_SYSTEM_PROMPT = """You are a SQL query planning expert for a Project Management System.

Your task is to analyze a natural language question and create a step-by-step plan
for constructing the appropriate SQL query.

## Database Schema
{schema_context}

## Available Metrics
{metrics_context}

## Planning Rules
1. Identify all entities mentioned in the question
2. Determine the required tables and their relationships
3. Plan the SELECT, FROM, WHERE, JOIN, GROUP BY, ORDER BY clauses
4. Consider performance implications (indexes, LIMIT)
5. ALWAYS include project_id filter for project-scoped tables:
   - task.tasks, task.user_stories, task.sprints
   - project.issues, project.risks, project.phases

## Response Format
Provide a structured reasoning plan in JSON format."""


REASONING_USER_PROMPT = """## Question
{question}

## Context
- Project ID: {project_id}
- User Role: {user_role}
- Previous Context: {previous_context}

Analyze this question and provide a step-by-step SQL construction plan.

Think through:
1. What data is being requested?
2. Which tables contain this data?
3. Are JOINs needed between tables?
4. What filters (WHERE conditions) are needed?
5. Is aggregation (COUNT, SUM, AVG, GROUP BY) required?
6. What ordering makes sense for the results?"""


# Few-shot examples for reasoning
REASONING_EXAMPLES = [
    {
        "question": "What is the sprint velocity for the last 3 sprints?",
        "reasoning": {
            "understanding": "User wants to calculate story points completed per sprint for recent sprints",
            "steps": [
                {
                    "step_number": 1,
                    "description": "Identify base tables: sprints and user_stories",
                    "tables_involved": ["task.sprints", "task.user_stories"]
                },
                {
                    "step_number": 2,
                    "description": "Join sprints with user_stories on sprint_id",
                    "sql_fragment": "FROM task.sprints s JOIN task.user_stories us ON s.id = us.sprint_id",
                    "tables_involved": ["task.sprints", "task.user_stories"]
                },
                {
                    "step_number": 3,
                    "description": "Filter for completed stories (status = 'DONE')",
                    "sql_fragment": "WHERE us.status = 'DONE'",
                    "tables_involved": []
                },
                {
                    "step_number": 4,
                    "description": "Filter for project scope and order by recent",
                    "sql_fragment": "AND s.project_id = :project_id ORDER BY s.end_date DESC LIMIT 3",
                    "tables_involved": []
                },
                {
                    "step_number": 5,
                    "description": "Aggregate story points per sprint",
                    "sql_fragment": "SELECT s.name, SUM(us.story_points) as velocity GROUP BY s.id, s.name",
                    "tables_involved": []
                }
            ],
            "estimated_complexity": "moderate",
            "requires_joins": True,
            "aggregation_needed": True
        }
    },
    {
        "question": "How many blocked tasks are there?",
        "reasoning": {
            "understanding": "User wants a count of tasks with blocked status",
            "steps": [
                {
                    "step_number": 1,
                    "description": "Identify base table: tasks",
                    "tables_involved": ["task.tasks"]
                },
                {
                    "step_number": 2,
                    "description": "Filter for blocked status and project scope",
                    "sql_fragment": "WHERE status = 'BLOCKED' AND project_id = :project_id",
                    "tables_involved": []
                },
                {
                    "step_number": 3,
                    "description": "Count the results",
                    "sql_fragment": "SELECT COUNT(*) as count",
                    "tables_involved": []
                }
            ],
            "estimated_complexity": "simple",
            "requires_joins": False,
            "aggregation_needed": True
        }
    },
    {
        "question": "Show tasks assigned to each team member with their completion rate",
        "reasoning": {
            "understanding": "User wants task counts per assignee with completion percentage",
            "steps": [
                {
                    "step_number": 1,
                    "description": "Identify base tables: tasks and users for assignee info",
                    "tables_involved": ["task.tasks", "auth.users"]
                },
                {
                    "step_number": 2,
                    "description": "Join tasks with users on assignee_id",
                    "sql_fragment": "FROM task.tasks t LEFT JOIN auth.users u ON t.assignee_id = u.id",
                    "tables_involved": ["task.tasks", "auth.users"]
                },
                {
                    "step_number": 3,
                    "description": "Filter by project and group by assignee",
                    "sql_fragment": "WHERE t.project_id = :project_id GROUP BY u.id, u.full_name",
                    "tables_involved": []
                },
                {
                    "step_number": 4,
                    "description": "Calculate completion rate using FILTER aggregate",
                    "sql_fragment": "SELECT u.full_name, COUNT(*) as total, COUNT(*) FILTER (WHERE t.status = 'DONE') * 100.0 / NULLIF(COUNT(*), 0) as completion_rate",
                    "tables_involved": []
                }
            ],
            "estimated_complexity": "moderate",
            "requires_joins": True,
            "aggregation_needed": True
        }
    }
]


# =============================================================================
# Helper Functions
# =============================================================================

def build_reasoning_prompt(state: ReasoningState) -> str:
    """Build the reasoning prompt with context."""
    # Try to get semantic layer
    try:
        from ..semantic import get_semantic_layer
        semantic_layer = get_semantic_layer()

        # Find relevant models based on question
        relevant_models = semantic_layer.find_relevant_models(state["question"])
        model_names = [m.name for m in relevant_models]

        # Generate schema context
        schema_context = semantic_layer.generate_schema_context(model_names)

        # Get metrics context
        metrics_context = "\n".join([
            f"- {m.display_name or m.name}: {m.description or 'No description'}"
            for m in semantic_layer.metrics.values()
        ])
    except Exception as e:
        logger.warning(f"Could not load semantic layer for reasoning: {e}")
        schema_context = "Schema information not available"
        metrics_context = "Metrics information not available"

    # Build system prompt
    system_prompt = REASONING_SYSTEM_PROMPT.format(
        schema_context=schema_context,
        metrics_context=metrics_context
    )

    # Build user prompt
    user_prompt = REASONING_USER_PROMPT.format(
        question=state["question"],
        project_id=state["project_id"],
        user_role=state.get("user_role", "USER"),
        previous_context=state.get("previous_context") or "None"
    )

    # Add few-shot examples
    examples_str = "\n\n## Examples\n"
    for ex in REASONING_EXAMPLES[:2]:
        examples_str += f"\n**Question**: {ex['question']}\n"
        examples_str += f"**Reasoning**:\n```json\n{json.dumps(ex['reasoning'], indent=2)}\n```\n"

    return f"{system_prompt}\n{examples_str}\n{user_prompt}"


def should_use_reasoning(state: Dict[str, Any]) -> bool:
    """
    Determine if reasoning step should be used.

    Uses reasoning for complex queries that benefit from step-by-step planning.
    """
    question = state.get("question", "").lower()

    # Keywords suggesting complex queries
    complex_indicators = [
        "velocity", "trend", "compare", "comparison",
        "ratio", "percentage", "rate", "proportion",
        "over time", "by month", "by week", "by day",
        "correlation", "relationship between",
        "top", "bottom", "ranking", "ranked",
        "average", "mean", "median",
        "growth", "decline", "change",
        "per", "each", "every",
        "across", "breakdown",
    ]

    # Return True if any complex indicator is found
    return any(ind in question for ind in complex_indicators)


# =============================================================================
# Node Implementation
# =============================================================================

def reasoning_node(
    state: ReasoningState,
    generator: StructuredGenerator
) -> ReasoningState:
    """
    LangGraph node for chain-of-thought reasoning.

    Analyzes the question and creates a query construction plan.
    This helps improve SQL generation accuracy for complex queries.

    Args:
        state: Current workflow state
        generator: Structured generator for LLM calls

    Returns:
        Updated state with reasoning and relevant tables
    """
    logger.info(f"Running reasoning node for: {state['question'][:50]}...")

    prompt = build_reasoning_prompt(state)

    try:
        # Generate structured reasoning
        reasoning = generator.generate(
            prompt=prompt,
            response_model=QueryReasoningResponse,
            temperature=0
        )

        # Extract relevant tables from reasoning steps
        relevant_tables = set()
        for step in reasoning.steps:
            relevant_tables.update(step.tables_involved)

        logger.info(
            f"Reasoning complete: complexity={reasoning.estimated_complexity}, "
            f"joins={reasoning.requires_joins}, agg={reasoning.aggregation_needed}"
        )

        # Update state
        return {
            **state,
            "reasoning": reasoning,
            "relevant_tables": list(relevant_tables)
        }

    except Exception as e:
        logger.error(f"Reasoning node failed: {e}")
        # Return state with empty reasoning (generation will proceed without it)
        return {
            **state,
            "reasoning": None,
            "relevant_tables": []
        }


async def async_reasoning_node(
    state: ReasoningState,
    generator: StructuredGenerator
) -> ReasoningState:
    """Async version of reasoning node for async workflows."""
    return reasoning_node(state, generator)
