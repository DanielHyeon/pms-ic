# Phase 1: Foundation

## Document Info
| Item | Value |
|------|-------|
| Phase | 1 of 3 |
| Duration | 2 weeks |
| Status | **Complete** |
| Prerequisites | None |
| Completed | 2026-02-02 |

---

## Implementation Summary (Completed)

### Implemented Features

| Feature | Status | Location |
| ------- | ------ | -------- |
| Dynamic Top-K with Score Threshold | ✅ Complete | `semantic_layer.py:350-453` |
| Relationship-Aware Expansion | ✅ Complete | `semantic_layer.py:455-486` |
| Intent-Based Filtering | ✅ Complete | `nodes.py:69-105` |
| MDL Schema Definition | ✅ Complete | `pms_mdl.json` |
| Intent Classification (5 categories) | ✅ Complete | `intent_classifier.py` |
| Few-shot Vector Retrieval | ✅ Complete | `fewshot_manager.py` |

### Key Implementation Details

**Dynamic Top-K Configuration**:

```python
MIN_RELEVANCE_SCORE = 2   # Minimum score to include
SCORE_DROP_RATIO = 0.5    # Include if score >= top_score * ratio
MAX_MODELS = 5            # Hard cap
```

**Relationship Triggers**:

```python
RELATIONSHIP_TRIGGERS = {
    "담당자": ["task_assignee", "user_story_assignee"],
    "assignee": ["task_assignee", "user_story_assignee"],
    "사용자": ["task_assignee", "user_story_assignee"],
}
```

**Intent-Based Filtering**: `semantic_node()` skips SQL table retrieval for `TEXT_TO_CYPHER` intent

### Benchmark Results

| Metric | Before | After |
| ------ | ------ | ----- |
| Intent Accuracy | 100% | 100% (preserved) |
| Table Relevance Score | 56.3% | >70% |
| CYPHER SQL Table Returns | Yes | 0 (fixed) |

---

## 1. Objectives

Build the foundational infrastructure for intelligent TextToSQL:
- **Semantic Layer**: Bridge business terminology and database schema
- **Intent Classification**: Accurately route queries to appropriate handlers
- **Few-shot Vectorization**: Improve example retrieval quality

---

## 2. Deliverables

### 2.1 Semantic Layer (MDL)

#### 2.1.1 MDL Schema Definition

**File**: `llm-service/text2query/semantic/mdl_schema.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "PMS Metadata Definition Language",
  "type": "object",
  "properties": {
    "catalog": {
      "type": "string",
      "description": "Database catalog name"
    },
    "schema": {
      "type": "string",
      "description": "Database schema name"
    },
    "models": {
      "type": "array",
      "items": { "$ref": "#/definitions/Model" }
    },
    "relationships": {
      "type": "array",
      "items": { "$ref": "#/definitions/Relationship" }
    },
    "metrics": {
      "type": "array",
      "items": { "$ref": "#/definitions/Metric" }
    }
  },
  "definitions": {
    "Model": {
      "type": "object",
      "required": ["name", "tableReference", "columns"],
      "properties": {
        "name": { "type": "string" },
        "displayName": { "type": "string" },
        "description": { "type": "string" },
        "tableReference": {
          "type": "object",
          "properties": {
            "schema": { "type": "string" },
            "table": { "type": "string" }
          }
        },
        "columns": {
          "type": "array",
          "items": { "$ref": "#/definitions/Column" }
        },
        "primaryKey": { "type": "string" },
        "projectScoped": { "type": "boolean" }
      }
    },
    "Column": {
      "type": "object",
      "required": ["name", "type"],
      "properties": {
        "name": { "type": "string" },
        "displayName": { "type": "string" },
        "type": { "type": "string" },
        "description": { "type": "string" },
        "notNull": { "type": "boolean" },
        "expression": { "type": "string" }
      }
    },
    "Relationship": {
      "type": "object",
      "required": ["name", "models", "joinType", "condition"],
      "properties": {
        "name": { "type": "string" },
        "models": {
          "type": "array",
          "items": { "type": "string" },
          "minItems": 2,
          "maxItems": 2
        },
        "joinType": {
          "enum": ["ONE_TO_ONE", "ONE_TO_MANY", "MANY_TO_ONE", "MANY_TO_MANY"]
        },
        "condition": { "type": "string" }
      }
    },
    "Metric": {
      "type": "object",
      "required": ["name", "baseModel", "measure"],
      "properties": {
        "name": { "type": "string" },
        "displayName": { "type": "string" },
        "description": { "type": "string" },
        "baseModel": { "type": "string" },
        "dimension": {
          "type": "array",
          "items": { "type": "string" }
        },
        "measure": {
          "type": "array",
          "items": { "type": "string" }
        },
        "timeGrain": {
          "enum": ["DAY", "WEEK", "MONTH", "QUARTER", "YEAR"]
        }
      }
    }
  }
}
```

#### 2.1.2 PMS Domain MDL

**File**: `llm-service/text2query/semantic/pms_mdl.json`

```json
{
  "catalog": "pms",
  "schema": "multiple",
  "models": [
    {
      "name": "projects",
      "displayName": "Project",
      "description": "Insurance claims project with lifecycle management",
      "tableReference": {
        "schema": "project",
        "table": "projects"
      },
      "columns": [
        {
          "name": "id",
          "displayName": "Project ID",
          "type": "BIGINT",
          "notNull": true
        },
        {
          "name": "name",
          "displayName": "Project Name",
          "type": "VARCHAR",
          "description": "Human-readable project identifier"
        },
        {
          "name": "status",
          "displayName": "Status",
          "type": "VARCHAR",
          "description": "PLANNING, IN_PROGRESS, ON_HOLD, COMPLETED, CANCELLED"
        },
        {
          "name": "start_date",
          "displayName": "Start Date",
          "type": "DATE"
        },
        {
          "name": "end_date",
          "displayName": "End Date",
          "type": "DATE"
        },
        {
          "name": "is_delayed",
          "displayName": "Is Delayed",
          "type": "BOOLEAN",
          "expression": "end_date < NOW() AND status != 'COMPLETED'"
        }
      ],
      "primaryKey": "id",
      "projectScoped": false
    },
    {
      "name": "user_stories",
      "displayName": "User Story",
      "description": "Agile user story for sprint planning",
      "tableReference": {
        "schema": "task",
        "table": "user_stories"
      },
      "columns": [
        {
          "name": "id",
          "type": "BIGINT",
          "notNull": true
        },
        {
          "name": "title",
          "displayName": "Title",
          "type": "VARCHAR"
        },
        {
          "name": "status",
          "displayName": "Status",
          "type": "VARCHAR",
          "description": "TODO, IN_PROGRESS, IN_REVIEW, DONE"
        },
        {
          "name": "story_points",
          "displayName": "Story Points",
          "type": "INTEGER",
          "description": "Effort estimation in Fibonacci scale"
        },
        {
          "name": "sprint_id",
          "type": "BIGINT"
        },
        {
          "name": "project_id",
          "type": "BIGINT"
        }
      ],
      "primaryKey": "id",
      "projectScoped": true
    },
    {
      "name": "tasks",
      "displayName": "Task",
      "description": "Individual work item under a user story",
      "tableReference": {
        "schema": "task",
        "table": "tasks"
      },
      "columns": [
        {
          "name": "id",
          "type": "BIGINT",
          "notNull": true
        },
        {
          "name": "title",
          "displayName": "Title",
          "type": "VARCHAR"
        },
        {
          "name": "status",
          "displayName": "Status",
          "type": "VARCHAR",
          "description": "TODO, IN_PROGRESS, DONE, BLOCKED"
        },
        {
          "name": "assignee_id",
          "displayName": "Assignee",
          "type": "BIGINT"
        },
        {
          "name": "estimated_hours",
          "displayName": "Estimated Hours",
          "type": "DECIMAL"
        },
        {
          "name": "actual_hours",
          "displayName": "Actual Hours",
          "type": "DECIMAL"
        },
        {
          "name": "user_story_id",
          "type": "BIGINT"
        },
        {
          "name": "project_id",
          "type": "BIGINT"
        }
      ],
      "primaryKey": "id",
      "projectScoped": true
    },
    {
      "name": "sprints",
      "displayName": "Sprint",
      "description": "Time-boxed iteration for agile development",
      "tableReference": {
        "schema": "task",
        "table": "sprints"
      },
      "columns": [
        {
          "name": "id",
          "type": "BIGINT",
          "notNull": true
        },
        {
          "name": "name",
          "displayName": "Sprint Name",
          "type": "VARCHAR"
        },
        {
          "name": "start_date",
          "displayName": "Start Date",
          "type": "DATE"
        },
        {
          "name": "end_date",
          "displayName": "End Date",
          "type": "DATE"
        },
        {
          "name": "status",
          "displayName": "Status",
          "type": "VARCHAR",
          "description": "PLANNING, ACTIVE, COMPLETED"
        },
        {
          "name": "project_id",
          "type": "BIGINT"
        },
        {
          "name": "velocity",
          "displayName": "Velocity",
          "type": "INTEGER",
          "expression": "SELECT SUM(story_points) FROM task.user_stories WHERE sprint_id = sprints.id AND status = 'DONE'"
        }
      ],
      "primaryKey": "id",
      "projectScoped": true
    },
    {
      "name": "issues",
      "displayName": "Issue",
      "description": "Project issue or problem tracking",
      "tableReference": {
        "schema": "project",
        "table": "issues"
      },
      "columns": [
        {
          "name": "id",
          "type": "BIGINT",
          "notNull": true
        },
        {
          "name": "title",
          "type": "VARCHAR"
        },
        {
          "name": "severity",
          "displayName": "Severity",
          "type": "VARCHAR",
          "description": "LOW, MEDIUM, HIGH, CRITICAL"
        },
        {
          "name": "status",
          "displayName": "Status",
          "type": "VARCHAR",
          "description": "OPEN, IN_PROGRESS, RESOLVED, CLOSED"
        },
        {
          "name": "project_id",
          "type": "BIGINT"
        }
      ],
      "primaryKey": "id",
      "projectScoped": true
    },
    {
      "name": "risks",
      "displayName": "Risk",
      "description": "Project risk identification and tracking",
      "tableReference": {
        "schema": "project",
        "table": "risks"
      },
      "columns": [
        {
          "name": "id",
          "type": "BIGINT",
          "notNull": true
        },
        {
          "name": "title",
          "type": "VARCHAR"
        },
        {
          "name": "probability",
          "displayName": "Probability",
          "type": "VARCHAR",
          "description": "LOW, MEDIUM, HIGH"
        },
        {
          "name": "impact",
          "displayName": "Impact",
          "type": "VARCHAR",
          "description": "LOW, MEDIUM, HIGH, CRITICAL"
        },
        {
          "name": "status",
          "displayName": "Status",
          "type": "VARCHAR",
          "description": "IDENTIFIED, MITIGATING, MITIGATED, OCCURRED"
        },
        {
          "name": "project_id",
          "type": "BIGINT"
        }
      ],
      "primaryKey": "id",
      "projectScoped": true
    }
  ],
  "relationships": [
    {
      "name": "project_user_stories",
      "models": ["projects", "user_stories"],
      "joinType": "ONE_TO_MANY",
      "condition": "projects.id = user_stories.project_id"
    },
    {
      "name": "sprint_user_stories",
      "models": ["sprints", "user_stories"],
      "joinType": "ONE_TO_MANY",
      "condition": "sprints.id = user_stories.sprint_id"
    },
    {
      "name": "user_story_tasks",
      "models": ["user_stories", "tasks"],
      "joinType": "ONE_TO_MANY",
      "condition": "user_stories.id = tasks.user_story_id"
    },
    {
      "name": "project_sprints",
      "models": ["projects", "sprints"],
      "joinType": "ONE_TO_MANY",
      "condition": "projects.id = sprints.project_id"
    },
    {
      "name": "project_issues",
      "models": ["projects", "issues"],
      "joinType": "ONE_TO_MANY",
      "condition": "projects.id = issues.project_id"
    },
    {
      "name": "project_risks",
      "models": ["projects", "risks"],
      "joinType": "ONE_TO_MANY",
      "condition": "projects.id = risks.project_id"
    }
  ],
  "metrics": [
    {
      "name": "sprint_velocity",
      "displayName": "Sprint Velocity",
      "description": "Total story points completed per sprint",
      "baseModel": "user_stories",
      "dimension": ["sprint_id"],
      "measure": ["SUM(story_points)"],
      "timeGrain": "WEEK"
    },
    {
      "name": "task_completion_rate",
      "displayName": "Task Completion Rate",
      "description": "Percentage of tasks completed",
      "baseModel": "tasks",
      "dimension": ["project_id"],
      "measure": ["COUNT(*) FILTER (WHERE status = 'DONE') * 100.0 / COUNT(*)"]
    },
    {
      "name": "open_issues_count",
      "displayName": "Open Issues",
      "description": "Number of unresolved issues",
      "baseModel": "issues",
      "dimension": ["project_id", "severity"],
      "measure": ["COUNT(*) FILTER (WHERE status IN ('OPEN', 'IN_PROGRESS'))"]
    },
    {
      "name": "high_risk_count",
      "displayName": "High Risks",
      "description": "Number of high probability/impact risks",
      "baseModel": "risks",
      "dimension": ["project_id"],
      "measure": ["COUNT(*) FILTER (WHERE probability = 'HIGH' OR impact IN ('HIGH', 'CRITICAL'))"]
    }
  ]
}
```

#### 2.1.3 Semantic Layer Implementation

**File**: `llm-service/text2query/semantic/semantic_layer.py`

```python
"""
Semantic Layer - MDL Parser and Resolver

Bridges business terminology and database schema for intelligent SQL generation.
"""
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set
import json
from pathlib import Path


@dataclass
class Column:
    name: str
    type: str
    display_name: Optional[str] = None
    description: Optional[str] = None
    not_null: bool = False
    expression: Optional[str] = None  # Calculated field


@dataclass
class Model:
    name: str
    table_reference: Dict[str, str]  # {"schema": "task", "table": "tasks"}
    columns: List[Column]
    display_name: Optional[str] = None
    description: Optional[str] = None
    primary_key: Optional[str] = None
    project_scoped: bool = False

    @property
    def full_table_name(self) -> str:
        schema = self.table_reference.get("schema", "public")
        table = self.table_reference.get("table", self.name)
        return f"{schema}.{table}"


@dataclass
class Relationship:
    name: str
    models: List[str]  # [source, target]
    join_type: str  # ONE_TO_ONE, ONE_TO_MANY, MANY_TO_ONE, MANY_TO_MANY
    condition: str  # JOIN condition


@dataclass
class Metric:
    name: str
    base_model: str
    measure: List[str]
    display_name: Optional[str] = None
    description: Optional[str] = None
    dimension: List[str] = field(default_factory=list)
    time_grain: Optional[str] = None


class SemanticLayer:
    """
    MDL-based semantic layer for PMS domain.

    Provides:
    - Business term to schema mapping
    - Relationship inference for JOINs
    - Calculated field expansion
    - Metric definitions
    """

    def __init__(self, mdl_path: Optional[str] = None):
        self.models: Dict[str, Model] = {}
        self.relationships: Dict[str, Relationship] = {}
        self.metrics: Dict[str, Metric] = {}
        self._display_name_index: Dict[str, str] = {}  # display_name -> model_name
        self._term_index: Dict[str, Set[str]] = {}  # term -> model_names

        if mdl_path:
            self.load_mdl(mdl_path)

    def load_mdl(self, path: str) -> None:
        """Load MDL from JSON file."""
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # Parse models
        for model_data in data.get("models", []):
            columns = [
                Column(
                    name=c["name"],
                    type=c["type"],
                    display_name=c.get("displayName"),
                    description=c.get("description"),
                    not_null=c.get("notNull", False),
                    expression=c.get("expression")
                )
                for c in model_data.get("columns", [])
            ]

            model = Model(
                name=model_data["name"],
                table_reference=model_data["tableReference"],
                columns=columns,
                display_name=model_data.get("displayName"),
                description=model_data.get("description"),
                primary_key=model_data.get("primaryKey"),
                project_scoped=model_data.get("projectScoped", False)
            )
            self.models[model.name] = model

            # Build display name index
            if model.display_name:
                self._display_name_index[model.display_name.lower()] = model.name

            # Build term index from description
            self._index_terms(model)

        # Parse relationships
        for rel_data in data.get("relationships", []):
            rel = Relationship(
                name=rel_data["name"],
                models=rel_data["models"],
                join_type=rel_data["joinType"],
                condition=rel_data["condition"]
            )
            self.relationships[rel.name] = rel

        # Parse metrics
        for metric_data in data.get("metrics", []):
            metric = Metric(
                name=metric_data["name"],
                base_model=metric_data["baseModel"],
                measure=metric_data["measure"],
                display_name=metric_data.get("displayName"),
                description=metric_data.get("description"),
                dimension=metric_data.get("dimension", []),
                time_grain=metric_data.get("timeGrain")
            )
            self.metrics[metric.name] = metric

    def _index_terms(self, model: Model) -> None:
        """Index model by relevant terms for search."""
        terms = set()

        # Model name and display name
        terms.add(model.name.lower())
        if model.display_name:
            terms.update(model.display_name.lower().split())

        # Description words
        if model.description:
            terms.update(model.description.lower().split())

        # Column names and descriptions
        for col in model.columns:
            terms.add(col.name.lower())
            if col.display_name:
                terms.update(col.display_name.lower().split())

        for term in terms:
            if term not in self._term_index:
                self._term_index[term] = set()
            self._term_index[term].add(model.name)

    def resolve_model(self, term: str) -> Optional[Model]:
        """Resolve a business term to a model."""
        term_lower = term.lower()

        # Direct match by name
        if term_lower in self.models:
            return self.models[term_lower]

        # Match by display name
        if term_lower in self._display_name_index:
            return self.models[self._display_name_index[term_lower]]

        # Fuzzy match by terms
        if term_lower in self._term_index:
            model_names = self._term_index[term_lower]
            if len(model_names) == 1:
                return self.models[list(model_names)[0]]

        return None

    def find_relevant_models(self, query: str) -> List[Model]:
        """Find models relevant to a natural language query."""
        query_terms = set(query.lower().split())
        model_scores: Dict[str, int] = {}

        for term in query_terms:
            if term in self._term_index:
                for model_name in self._term_index[term]:
                    model_scores[model_name] = model_scores.get(model_name, 0) + 1

        # Sort by relevance score
        sorted_models = sorted(
            model_scores.items(),
            key=lambda x: x[1],
            reverse=True
        )

        return [self.models[name] for name, _ in sorted_models[:5]]

    def find_join_path(self, model1: str, model2: str) -> Optional[Relationship]:
        """Find relationship between two models."""
        for rel in self.relationships.values():
            if model1 in rel.models and model2 in rel.models:
                return rel
        return None

    def get_project_scoped_tables(self) -> List[Model]:
        """Get all tables that require project_id filtering."""
        return [m for m in self.models.values() if m.project_scoped]

    def get_metric(self, name: str) -> Optional[Metric]:
        """Get a predefined metric by name."""
        return self.metrics.get(name)

    def expand_calculated_field(self, model: str, column: str) -> Optional[str]:
        """Expand a calculated field to its SQL expression."""
        if model not in self.models:
            return None

        for col in self.models[model].columns:
            if col.name == column and col.expression:
                return col.expression

        return None

    def generate_schema_context(self, models: List[str]) -> str:
        """Generate DDL-like context for LLM prompt."""
        context_parts = []

        for model_name in models:
            if model_name not in self.models:
                continue

            model = self.models[model_name]

            # Table definition
            columns_ddl = []
            for col in model.columns:
                col_def = f"  {col.name} {col.type}"
                if col.not_null:
                    col_def += " NOT NULL"
                if col.description:
                    col_def += f"  -- {col.description}"
                columns_ddl.append(col_def)

            table_ddl = f"""
-- {model.display_name or model.name}: {model.description or ''}
-- Project Scoped: {model.project_scoped}
CREATE TABLE {model.full_table_name} (
{chr(10).join(columns_ddl)}
);
"""
            context_parts.append(table_ddl.strip())

        # Add relationships
        rel_context = []
        for rel in self.relationships.values():
            if rel.models[0] in models or rel.models[1] in models:
                rel_context.append(
                    f"-- Relationship: {rel.name} ({rel.join_type})"
                    f"\n-- {rel.condition}"
                )

        if rel_context:
            context_parts.append("\n-- Relationships:\n" + "\n".join(rel_context))

        return "\n\n".join(context_parts)


# Singleton instance
_semantic_layer: Optional[SemanticLayer] = None


def get_semantic_layer() -> SemanticLayer:
    """Get or create semantic layer singleton."""
    global _semantic_layer
    if _semantic_layer is None:
        mdl_path = Path(__file__).parent / "pms_mdl.json"
        _semantic_layer = SemanticLayer(str(mdl_path))
    return _semantic_layer
```

---

### 2.2 Intent Classification Extension

#### 2.2.1 Intent Types

**File**: `llm-service/text2query/intent/intent_types.py`

```python
"""
Intent Classification Types

Defines the multi-level intent classification for query routing.
"""
from enum import Enum
from dataclasses import dataclass
from typing import Optional, List


class IntentType(Enum):
    TEXT_TO_SQL = "TEXT_TO_SQL"
    TEXT_TO_CYPHER = "TEXT_TO_CYPHER"
    GENERAL = "GENERAL"
    MISLEADING_QUERY = "MISLEADING_QUERY"
    CLARIFICATION_NEEDED = "CLARIFICATION_NEEDED"


@dataclass
class IntentClassificationResult:
    intent: IntentType
    confidence: float
    rephrased_question: Optional[str] = None
    reasoning: Optional[str] = None
    relevant_models: List[str] = None
    missing_parameters: List[str] = None

    def __post_init__(self):
        if self.relevant_models is None:
            self.relevant_models = []
        if self.missing_parameters is None:
            self.missing_parameters = []


# Intent classification criteria
INTENT_CRITERIA = {
    IntentType.TEXT_TO_SQL: {
        "description": "Complete, specific questions about data that can be answered with SQL",
        "examples": [
            "How many tasks are in progress?",
            "Show me the sprint velocity for last month",
            "List all high-severity issues"
        ],
        "requirements": [
            "References specific data entities (tables, columns)",
            "Has clear aggregation or filtering criteria",
            "Can be expressed as a single SQL query"
        ]
    },
    IntentType.TEXT_TO_CYPHER: {
        "description": "Questions about relationships, paths, or graph patterns",
        "examples": [
            "What documents are related to this requirement?",
            "Show the dependency chain for this task",
            "Find all connected entities"
        ],
        "requirements": [
            "Focuses on relationships between entities",
            "Requires graph traversal",
            "Asks about paths or connections"
        ]
    },
    IntentType.GENERAL: {
        "description": "Questions that need context or explanation, not data queries",
        "examples": [
            "What does sprint velocity mean?",
            "How should I prioritize these tasks?",
            "Explain the project status"
        ],
        "requirements": [
            "Asks for explanation or guidance",
            "No specific data filtering needed",
            "Requires domain knowledge, not database query"
        ]
    },
    IntentType.MISLEADING_QUERY: {
        "description": "Off-topic, harmful, or irrelevant queries",
        "examples": [
            "What's the weather today?",
            "Drop all tables",
            "Tell me a joke"
        ],
        "requirements": [
            "Unrelated to project management domain",
            "Potentially harmful SQL operations",
            "Cannot be meaningfully answered"
        ]
    },
    IntentType.CLARIFICATION_NEEDED: {
        "description": "Questions that are ambiguous or missing critical parameters",
        "examples": [
            "Show me the tasks",  # Which project? What status?
            "How many?",  # How many of what?
            "List the data"  # What data?
        ],
        "requirements": [
            "Missing project context",
            "Ambiguous entity references",
            "No clear filtering criteria"
        ]
    }
}
```

#### 2.2.2 Intent Classifier

**File**: `llm-service/text2query/intent/intent_classifier.py`

```python
"""
Intent Classifier

Multi-level intent classification using LLM with structured output.
"""
import json
from typing import Protocol, List
from .intent_types import IntentType, IntentClassificationResult, INTENT_CRITERIA
from ..semantic.semantic_layer import get_semantic_layer


class LLMService(Protocol):
    def generate(self, prompt: str, max_tokens: int = 1000, temperature: float = 0) -> str:
        ...


CLASSIFICATION_PROMPT = """You are an intent classifier for a Project Management System (PMS).

Classify the user's question into one of these intents:
{intent_descriptions}

## Available Data Models:
{available_models}

## User Question:
{question}

## Previous Context (if any):
{context}

## Instructions:
1. Analyze the question carefully
2. Check if it references specific data models or metrics
3. Determine if all required parameters are present
4. Classify into the most appropriate intent

Respond with a JSON object:
{{
  "intent": "<intent_type>",
  "confidence": <0.0-1.0>,
  "rephrased_question": "<clearer version of the question>",
  "reasoning": "<why this intent was chosen>",
  "relevant_models": ["<model1>", "<model2>"],
  "missing_parameters": ["<param1>"] // only if CLARIFICATION_NEEDED
}}
"""


class IntentClassifier:
    """
    Classifies user queries into intent types for routing.

    Uses semantic layer for model awareness and LLM for classification.
    """

    def __init__(self, llm_service: LLMService):
        self.llm = llm_service
        self.semantic_layer = get_semantic_layer()

    def classify(
        self,
        question: str,
        context: str = "",
        project_id: int = None
    ) -> IntentClassificationResult:
        """Classify a user question into an intent type."""

        # Build intent descriptions
        intent_descriptions = self._build_intent_descriptions()

        # Get available models from semantic layer
        available_models = self._get_available_models_summary()

        # Build prompt
        prompt = CLASSIFICATION_PROMPT.format(
            intent_descriptions=intent_descriptions,
            available_models=available_models,
            question=question,
            context=context or "None"
        )

        # Get LLM response
        response = self.llm.generate(prompt, max_tokens=500, temperature=0)

        # Parse response
        return self._parse_response(response, question)

    def _build_intent_descriptions(self) -> str:
        """Build formatted intent descriptions for prompt."""
        descriptions = []
        for intent_type, criteria in INTENT_CRITERIA.items():
            desc = f"""
### {intent_type.value}
{criteria['description']}

Examples:
{chr(10).join(f'- {ex}' for ex in criteria['examples'])}

Requirements:
{chr(10).join(f'- {req}' for req in criteria['requirements'])}
"""
            descriptions.append(desc)
        return "\n".join(descriptions)

    def _get_available_models_summary(self) -> str:
        """Get summary of available data models."""
        summaries = []
        for model in self.semantic_layer.models.values():
            cols = ", ".join(c.name for c in model.columns[:5])
            if len(model.columns) > 5:
                cols += f", ... (+{len(model.columns) - 5} more)"

            summaries.append(
                f"- {model.display_name or model.name} ({model.full_table_name}): {cols}"
            )
        return "\n".join(summaries)

    def _parse_response(
        self,
        response: str,
        original_question: str
    ) -> IntentClassificationResult:
        """Parse LLM response into IntentClassificationResult."""
        try:
            # Extract JSON from response
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                json_str = response[json_start:json_end]
                data = json.loads(json_str)

                return IntentClassificationResult(
                    intent=IntentType(data.get("intent", "TEXT_TO_SQL")),
                    confidence=float(data.get("confidence", 0.5)),
                    rephrased_question=data.get("rephrased_question"),
                    reasoning=data.get("reasoning"),
                    relevant_models=data.get("relevant_models", []),
                    missing_parameters=data.get("missing_parameters", [])
                )
        except (json.JSONDecodeError, ValueError, KeyError) as e:
            pass

        # Default fallback
        return IntentClassificationResult(
            intent=IntentType.TEXT_TO_SQL,
            confidence=0.5,
            rephrased_question=original_question,
            reasoning="Failed to parse LLM response, defaulting to TEXT_TO_SQL"
        )


def get_intent_classifier(llm_service: LLMService) -> IntentClassifier:
    """Factory function for intent classifier."""
    return IntentClassifier(llm_service)
```

---

### 2.3 Few-shot Vectorization

#### 2.3.1 Vector-based Few-shot Manager

**File**: `llm-service/text2query/fewshot/vector_fewshot_manager.py`

```python
"""
Vector-based Few-shot Manager

Stores and retrieves SQL examples using vector similarity search.
"""
from dataclasses import dataclass
from typing import List, Optional, Protocol
from datetime import datetime
import hashlib


@dataclass
class FewshotExample:
    question: str
    query: str  # SQL or Cypher
    query_type: str  # "sql" or "cypher"
    keywords: List[str]
    embedding: Optional[List[float]] = None
    verified: bool = False
    created_at: datetime = None
    success_count: int = 0

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.utcnow()

    @property
    def id(self) -> str:
        """Generate unique ID from question hash."""
        return hashlib.md5(self.question.encode()).hexdigest()[:12]


class EmbeddingService(Protocol):
    async def embed(self, text: str) -> List[float]:
        ...

    async def embed_batch(self, texts: List[str]) -> List[List[float]]:
        ...


class VectorStore(Protocol):
    async def upsert(
        self,
        collection: str,
        id: str,
        vector: List[float],
        payload: dict
    ) -> None:
        ...

    async def search(
        self,
        collection: str,
        query_vector: List[float],
        limit: int = 5,
        score_threshold: float = 0.7,
        filters: dict = None
    ) -> List[dict]:
        ...

    async def delete(self, collection: str, id: str) -> None:
        ...


class VectorFewshotManager:
    """
    Vector-based few-shot example management.

    Features:
    - Semantic similarity search for relevant examples
    - Automatic learning from successful queries
    - Verification status tracking
    - Query type separation (SQL vs Cypher)
    """

    COLLECTION_SQL = "sql_fewshot_examples"
    COLLECTION_CYPHER = "cypher_fewshot_examples"

    def __init__(
        self,
        embedding_service: EmbeddingService,
        vector_store: VectorStore
    ):
        self.embedder = embedding_service
        self.store = vector_store

    async def add_example(self, example: FewshotExample) -> None:
        """Add a new few-shot example."""
        # Generate embedding if not provided
        if example.embedding is None:
            example.embedding = await self.embedder.embed(example.question)

        # Determine collection
        collection = (
            self.COLLECTION_SQL if example.query_type == "sql"
            else self.COLLECTION_CYPHER
        )

        # Store in vector DB
        await self.store.upsert(
            collection=collection,
            id=example.id,
            vector=example.embedding,
            payload={
                "question": example.question,
                "query": example.query,
                "query_type": example.query_type,
                "keywords": example.keywords,
                "verified": example.verified,
                "created_at": example.created_at.isoformat(),
                "success_count": example.success_count
            }
        )

    async def find_similar(
        self,
        question: str,
        query_type: str = "sql",
        limit: int = 3,
        verified_only: bool = True
    ) -> List[FewshotExample]:
        """Find similar examples using vector similarity."""
        # Generate query embedding
        query_embedding = await self.embedder.embed(question)

        # Determine collection
        collection = (
            self.COLLECTION_SQL if query_type == "sql"
            else self.COLLECTION_CYPHER
        )

        # Build filters
        filters = {}
        if verified_only:
            filters["verified"] = True

        # Search
        results = await self.store.search(
            collection=collection,
            query_vector=query_embedding,
            limit=limit,
            score_threshold=0.7,
            filters=filters if filters else None
        )

        # Convert to FewshotExample objects
        examples = []
        for result in results:
            payload = result.get("payload", {})
            examples.append(FewshotExample(
                question=payload["question"],
                query=payload["query"],
                query_type=payload["query_type"],
                keywords=payload.get("keywords", []),
                verified=payload.get("verified", False),
                success_count=payload.get("success_count", 0)
            ))

        return examples

    async def learn_from_success(
        self,
        question: str,
        query: str,
        query_type: str = "sql"
    ) -> None:
        """Learn from a successful query execution."""
        # Check if similar example already exists
        existing = await self.find_similar(
            question,
            query_type=query_type,
            limit=1,
            verified_only=False
        )

        if existing and existing[0].query == query:
            # Increment success count for existing example
            example = existing[0]
            example.success_count += 1
            if example.success_count >= 3:
                example.verified = True
            await self.add_example(example)
        else:
            # Add new example (unverified)
            keywords = self._extract_keywords(question)
            example = FewshotExample(
                question=question,
                query=query,
                query_type=query_type,
                keywords=keywords,
                verified=False,
                success_count=1
            )
            await self.add_example(example)

    async def mark_verified(self, example_id: str, query_type: str = "sql") -> None:
        """Mark an example as verified (human-approved)."""
        collection = (
            self.COLLECTION_SQL if query_type == "sql"
            else self.COLLECTION_CYPHER
        )

        # This would need to fetch, update, and re-upsert
        # Implementation depends on vector store capabilities
        pass

    def _extract_keywords(self, question: str) -> List[str]:
        """Extract keywords from question for indexing."""
        # Simple keyword extraction
        stopwords = {
            'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
            'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
            'would', 'could', 'should', 'may', 'might', 'must', 'shall',
            'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in',
            'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
            'through', 'during', 'before', 'after', 'above', 'below',
            'between', 'under', 'again', 'further', 'then', 'once',
            'here', 'there', 'when', 'where', 'why', 'how', 'all',
            'each', 'few', 'more', 'most', 'other', 'some', 'such',
            'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
            'too', 'very', 'just', 'and', 'but', 'if', 'or', 'because',
            'until', 'while', 'what', 'which', 'who', 'whom', 'this',
            'that', 'these', 'those', 'am', 'show', 'me', 'list', 'get',
            'find', 'give', 'tell', 'many', 'much'
        }

        words = question.lower().split()
        keywords = [w for w in words if w not in stopwords and len(w) > 2]
        return list(set(keywords))


# Default SQL examples for initialization
DEFAULT_SQL_EXAMPLES = [
    FewshotExample(
        question="How many tasks are in progress?",
        query="""SELECT COUNT(*) as count
FROM task.tasks
WHERE project_id = :project_id AND status = 'IN_PROGRESS'""",
        query_type="sql",
        keywords=["tasks", "progress", "count"],
        verified=True
    ),
    FewshotExample(
        question="Show me all user stories for the current sprint",
        query="""SELECT us.id, us.title, us.status, us.story_points
FROM task.user_stories us
JOIN task.sprints s ON us.sprint_id = s.id
WHERE us.project_id = :project_id
  AND s.status = 'ACTIVE'
ORDER BY us.story_points DESC
LIMIT 100""",
        query_type="sql",
        keywords=["user", "stories", "sprint", "current"],
        verified=True
    ),
    FewshotExample(
        question="What is the sprint velocity for last month?",
        query="""SELECT s.name as sprint_name,
       SUM(us.story_points) as velocity
FROM task.sprints s
JOIN task.user_stories us ON s.id = us.sprint_id
WHERE s.project_id = :project_id
  AND s.end_date >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
  AND s.end_date < DATE_TRUNC('month', NOW())
  AND us.status = 'DONE'
GROUP BY s.id, s.name
LIMIT 100""",
        query_type="sql",
        keywords=["sprint", "velocity", "month"],
        verified=True
    ),
    FewshotExample(
        question="List all high severity issues",
        query="""SELECT id, title, status, created_at
FROM project.issues
WHERE project_id = :project_id
  AND severity = 'HIGH'
ORDER BY created_at DESC
LIMIT 100""",
        query_type="sql",
        keywords=["issues", "high", "severity"],
        verified=True
    ),
    FewshotExample(
        question="Show tasks assigned to me",
        query="""SELECT t.id, t.title, t.status, t.estimated_hours
FROM task.tasks t
WHERE t.project_id = :project_id
  AND t.assignee_id = :user_id
ORDER BY t.created_at DESC
LIMIT 100""",
        query_type="sql",
        keywords=["tasks", "assigned", "me"],
        verified=True
    ),
    FewshotExample(
        question="What is the task completion rate?",
        query="""SELECT
  COUNT(*) FILTER (WHERE status = 'DONE') * 100.0 / NULLIF(COUNT(*), 0) as completion_rate,
  COUNT(*) as total_tasks,
  COUNT(*) FILTER (WHERE status = 'DONE') as completed_tasks
FROM task.tasks
WHERE project_id = :project_id
LIMIT 1""",
        query_type="sql",
        keywords=["task", "completion", "rate"],
        verified=True
    ),
    FewshotExample(
        question="How many open issues by severity?",
        query="""SELECT severity, COUNT(*) as count
FROM project.issues
WHERE project_id = :project_id
  AND status IN ('OPEN', 'IN_PROGRESS')
GROUP BY severity
ORDER BY
  CASE severity
    WHEN 'CRITICAL' THEN 1
    WHEN 'HIGH' THEN 2
    WHEN 'MEDIUM' THEN 3
    WHEN 'LOW' THEN 4
  END
LIMIT 100""",
        query_type="sql",
        keywords=["issues", "open", "severity"],
        verified=True
    ),
    FewshotExample(
        question="Show me blocked tasks",
        query="""SELECT t.id, t.title, t.assignee_id, t.updated_at
FROM task.tasks t
WHERE t.project_id = :project_id
  AND t.status = 'BLOCKED'
ORDER BY t.updated_at DESC
LIMIT 100""",
        query_type="sql",
        keywords=["tasks", "blocked"],
        verified=True
    )
]

DEFAULT_CYPHER_EXAMPLES = [
    FewshotExample(
        question="What documents are related to this requirement?",
        query="""MATCH (r:Requirement {id: $requirement_id})-[:RELATED_TO|REFERENCES*1..2]-(d:Document)
WHERE r.project_id = $project_id
RETURN d.id, d.title, d.type
LIMIT 50""",
        query_type="cypher",
        keywords=["documents", "related", "requirement"],
        verified=True
    ),
    FewshotExample(
        question="Show the dependency chain for this task",
        query="""MATCH path = (t:Task {id: $task_id})-[:DEPENDS_ON*1..5]->(dep:Task)
WHERE t.project_id = $project_id
RETURN path
LIMIT 100""",
        query_type="cypher",
        keywords=["dependency", "chain", "task"],
        verified=True
    ),
    FewshotExample(
        question="Find all entities connected to this user story",
        query="""MATCH (us:UserStory {id: $user_story_id})-[r]-(connected)
WHERE us.project_id = $project_id
RETURN type(r) as relationship, labels(connected) as type, connected.id, connected.title
LIMIT 100""",
        query_type="cypher",
        keywords=["entities", "connected", "user", "story"],
        verified=True
    )
]
```

---

## 3. Implementation Tasks

### Week 1: Semantic Layer + Intent Classification

| Day | Task | Owner | Output |
|-----|------|-------|--------|
| D1 | Design MDL schema | AI Dev | `mdl_schema.json` |
| D2 | Implement MDL parser | AI Dev | `semantic_layer.py` |
| D3 | Create PMS domain MDL | AI Dev + Domain | `pms_mdl.json` |
| D4 | Implement intent classifier | AI Dev | `intent_classifier.py` |
| D5 | Integration tests | AI Dev | `test_semantic_layer.py`, `test_intent.py` |

### Week 2: Few-shot Vectorization

| Day | Task | Owner | Output |
|-----|------|-------|--------|
| D1 | Setup vector collection | Data Eng | Neo4j vector index config |
| D2 | Implement VectorFewshotManager | AI Dev | `vector_fewshot_manager.py` |
| D3 | Migrate existing examples | AI Dev | Migration script |
| D4 | Integrate with workflow | AI Dev | Updated `text2query_workflow.py` |
| D5 | E2E testing | AI Dev | Test suite |

---

## 4. Test Plan

### 4.1 Unit Tests

```python
# tests/test_semantic_layer.py

def test_load_mdl():
    """Test MDL loading from JSON."""
    layer = SemanticLayer("test_mdl.json")
    assert len(layer.models) > 0
    assert "projects" in layer.models

def test_resolve_model_by_name():
    """Test model resolution by exact name."""
    layer = get_semantic_layer()
    model = layer.resolve_model("tasks")
    assert model is not None
    assert model.name == "tasks"

def test_resolve_model_by_display_name():
    """Test model resolution by display name."""
    layer = get_semantic_layer()
    model = layer.resolve_model("User Story")
    assert model is not None
    assert model.name == "user_stories"

def test_find_relevant_models():
    """Test relevant model search."""
    layer = get_semantic_layer()
    models = layer.find_relevant_models("sprint velocity user stories")
    assert any(m.name == "sprints" for m in models)
    assert any(m.name == "user_stories" for m in models)

def test_project_scoped_tables():
    """Test project-scoped table identification."""
    layer = get_semantic_layer()
    scoped = layer.get_project_scoped_tables()
    assert all(m.project_scoped for m in scoped)
```

### 4.2 Integration Tests

```python
# tests/test_intent_classification.py

@pytest.mark.asyncio
async def test_text_to_sql_intent():
    """Test TEXT_TO_SQL classification."""
    classifier = get_intent_classifier(mock_llm)
    result = classifier.classify("How many tasks are in progress?")
    assert result.intent == IntentType.TEXT_TO_SQL

@pytest.mark.asyncio
async def test_clarification_needed_intent():
    """Test CLARIFICATION_NEEDED classification."""
    classifier = get_intent_classifier(mock_llm)
    result = classifier.classify("Show me the data")
    assert result.intent == IntentType.CLARIFICATION_NEEDED
    assert len(result.missing_parameters) > 0
```

---

## 5. Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| MDL coverage | 100% of project tables | Count models in MDL |
| Intent accuracy | > 95% | Test suite pass rate |
| Few-shot MRR | > 0.8 | Mean Reciprocal Rank on test set |
| Integration tests | 100% pass | CI pipeline |

---

## 6. Rollback Plan

If issues arise:

1. **Semantic Layer**: Feature flag to bypass MDL resolution
2. **Intent Classification**: Fallback to binary SQL/Cypher classification
3. **Few-shot Vector**: Fallback to keyword-based retrieval

```python
# Feature flags in config
FEATURE_FLAGS = {
    "use_semantic_layer": True,
    "use_advanced_intent": True,
    "use_vector_fewshot": True
}
```
