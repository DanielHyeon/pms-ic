# Phase 2: Enhancement

## Document Info
| Item | Value |
|------|-------|
| Phase | 2 of 3 |
| Duration | 2 weeks |
| Status | Planning |
| Prerequisites | Phase 1 Complete |

---

## 1. Objectives

Enhance SQL generation quality and reliability:
- **Structured Output**: Enforce JSON schema for all LLM responses
- **Chain-of-Thought**: Add reasoning step before generation
- **SQL Correction**: Improve error handling with 3 attempts and strategies
- **SQL Knowledge**: Support calculated fields, metrics, and functions

---

## 2. Deliverables

### 2.1 Structured Output (JSON Schema)

#### 2.1.1 Response Models

**File**: `llm-service/text2query/models/response_models.py`

```python
"""
Structured Response Models

Pydantic models for enforcing JSON schema on all LLM outputs.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from enum import Enum


class SQLGenerationResponse(BaseModel):
    """Structured response for SQL generation."""

    class Config:
        json_schema_extra = {
            "example": {
                "sql": "SELECT COUNT(*) FROM task.tasks WHERE project_id = :project_id",
                "confidence": 0.95,
                "tables_used": ["task.tasks"],
                "reasoning": "Counting tasks with project filter",
                "warnings": []
            }
        }

    sql: str = Field(
        ...,
        description="Generated SQL query",
        min_length=10
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Confidence score for the generated SQL"
    )
    tables_used: List[str] = Field(
        default_factory=list,
        description="List of tables referenced in the query"
    )
    reasoning: Optional[str] = Field(
        None,
        description="Explanation of query construction logic"
    )
    warnings: List[str] = Field(
        default_factory=list,
        description="Any warnings about the query"
    )


class CypherGenerationResponse(BaseModel):
    """Structured response for Cypher generation."""

    cypher: str = Field(
        ...,
        description="Generated Cypher query",
        min_length=10
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0
    )
    node_types: List[str] = Field(
        default_factory=list,
        description="Node labels used in the query"
    )
    relationship_types: List[str] = Field(
        default_factory=list,
        description="Relationship types traversed"
    )
    reasoning: Optional[str] = None


class ReasoningStep(BaseModel):
    """Single step in chain-of-thought reasoning."""

    step_number: int
    description: str
    sql_fragment: Optional[str] = None
    tables_involved: List[str] = Field(default_factory=list)


class QueryReasoningResponse(BaseModel):
    """Structured response for query reasoning."""

    understanding: str = Field(
        ...,
        description="Summary of what the user is asking"
    )
    steps: List[ReasoningStep] = Field(
        ...,
        description="Step-by-step query construction plan"
    )
    estimated_complexity: Literal["simple", "moderate", "complex"] = Field(
        "moderate",
        description="Estimated query complexity"
    )
    requires_joins: bool = Field(
        False,
        description="Whether the query needs JOIN operations"
    )
    aggregation_needed: bool = Field(
        False,
        description="Whether aggregation (GROUP BY) is needed"
    )


class CorrectionResponse(BaseModel):
    """Structured response for SQL correction."""

    corrected_sql: str = Field(
        ...,
        description="Corrected SQL query"
    )
    error_analysis: str = Field(
        ...,
        description="Analysis of what was wrong"
    )
    fix_applied: str = Field(
        ...,
        description="Description of the fix applied"
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0
    )


class ErrorType(str, Enum):
    SYNTAX = "syntax_error"
    SCHEMA = "schema_error"
    SECURITY = "security_violation"
    PERFORMANCE = "performance_issue"
    LOGIC = "logic_error"
    UNKNOWN = "unknown"


class ValidationErrorDetail(BaseModel):
    """Detailed validation error information."""

    error_type: ErrorType
    message: str
    location: Optional[str] = None
    suggestion: Optional[str] = None


class QueryValidationResponse(BaseModel):
    """Structured validation result."""

    is_valid: bool
    errors: List[ValidationErrorDetail] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    sanitized_query: Optional[str] = None
```

#### 2.1.2 JSON Schema Enforcement

**File**: `llm-service/text2query/llm/structured_generator.py`

```python
"""
Structured LLM Generator

Enforces JSON schema output from LLM responses.
"""
import json
from typing import Type, TypeVar, Protocol
from pydantic import BaseModel, ValidationError
import logging

logger = logging.getLogger(__name__)

T = TypeVar('T', bound=BaseModel)


class LLMService(Protocol):
    def generate(
        self,
        prompt: str,
        max_tokens: int = 2000,
        temperature: float = 0,
        response_format: dict = None
    ) -> str:
        ...


class StructuredGenerator:
    """
    Generates structured responses using JSON schema enforcement.

    Features:
    - Pydantic model validation
    - Automatic retry on parse failure
    - Fallback extraction for non-compliant responses
    """

    def __init__(self, llm_service: LLMService):
        self.llm = llm_service

    def generate(
        self,
        prompt: str,
        response_model: Type[T],
        max_retries: int = 2,
        temperature: float = 0
    ) -> T:
        """Generate a structured response conforming to the given model."""

        # Build JSON schema from Pydantic model
        schema = response_model.model_json_schema()

        # Append schema instruction to prompt
        schema_prompt = self._build_schema_prompt(prompt, schema)

        for attempt in range(max_retries + 1):
            try:
                # Generate with response format hint
                response = self.llm.generate(
                    prompt=schema_prompt,
                    max_tokens=2000,
                    temperature=temperature,
                    response_format={
                        "type": "json_schema",
                        "json_schema": {
                            "name": response_model.__name__,
                            "schema": schema
                        }
                    }
                )

                # Parse and validate
                parsed = self._extract_json(response)
                return response_model.model_validate(parsed)

            except (json.JSONDecodeError, ValidationError) as e:
                logger.warning(
                    f"Structured generation attempt {attempt + 1} failed: {e}"
                )
                if attempt == max_retries:
                    raise ValueError(
                        f"Failed to generate valid {response_model.__name__} "
                        f"after {max_retries + 1} attempts"
                    )

                # Adjust prompt for retry
                schema_prompt = self._build_retry_prompt(
                    prompt, schema, str(e)
                )

    def _build_schema_prompt(self, prompt: str, schema: dict) -> str:
        """Build prompt with JSON schema instruction."""
        schema_str = json.dumps(schema, indent=2)
        return f"""{prompt}

## Response Format
You MUST respond with a valid JSON object conforming to this schema:

```json
{schema_str}
```

Respond with ONLY the JSON object, no additional text."""

    def _build_retry_prompt(
        self,
        prompt: str,
        schema: dict,
        error: str
    ) -> str:
        """Build prompt for retry after failure."""
        schema_str = json.dumps(schema, indent=2)
        return f"""{prompt}

## Response Format
You MUST respond with a valid JSON object conforming to this schema:

```json
{schema_str}
```

IMPORTANT: Your previous response was invalid. Error: {error}
Please ensure your response is valid JSON matching the schema exactly.

Respond with ONLY the JSON object, no additional text."""

    def _extract_json(self, response: str) -> dict:
        """Extract JSON from response, handling markdown blocks."""
        response = response.strip()

        # Try direct parse first
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            pass

        # Try extracting from markdown code block
        if "```json" in response:
            start = response.find("```json") + 7
            end = response.find("```", start)
            if end > start:
                return json.loads(response[start:end].strip())

        if "```" in response:
            start = response.find("```") + 3
            end = response.find("```", start)
            if end > start:
                return json.loads(response[start:end].strip())

        # Try finding JSON object
        start = response.find("{")
        end = response.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(response[start:end])

        raise json.JSONDecodeError("No valid JSON found", response, 0)


def get_structured_generator(llm_service: LLMService) -> StructuredGenerator:
    """Factory function for structured generator."""
    return StructuredGenerator(llm_service)
```

---

### 2.2 Chain-of-Thought Reasoning

#### 2.2.1 Reasoning Prompts

**File**: `llm-service/text2query/prompts/reasoning_prompt.py`

```python
"""
Chain-of-Thought Reasoning Prompts

Prompts for query decomposition and planning before generation.
"""

REASONING_SYSTEM_PROMPT = """You are a SQL query planning expert for a Project Management System.

Your task is to analyze a natural language question and create a step-by-step plan
for constructing the appropriate SQL query.

## Database Context
{schema_context}

## Available Metrics
{metrics_context}

## Rules
1. Identify all entities mentioned in the question
2. Determine the required tables and their relationships
3. Plan the SELECT, FROM, WHERE, GROUP BY, ORDER BY clauses
4. Consider performance implications (indexes, LIMIT)
5. Always include project_id filter for project-scoped tables

## Response Format
Provide a structured reasoning in JSON format."""


REASONING_USER_PROMPT = """## Question
{question}

## Additional Context
- Project ID: {project_id}
- User Role: {user_role}
- Previous Query Context: {previous_context}

Analyze this question and provide a step-by-step SQL construction plan."""


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
                    "description": "Filter for project scope and recent sprints",
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
    }
]
```

#### 2.2.2 Reasoning Node Implementation

**File**: `llm-service/text2query/nodes/reasoning_node.py`

```python
"""
Chain-of-Thought Reasoning Node

LangGraph node for query reasoning before generation.
"""
from typing import TypedDict, Optional, List
from ..models.response_models import QueryReasoningResponse, ReasoningStep
from ..llm.structured_generator import StructuredGenerator
from ..semantic.semantic_layer import get_semantic_layer
from .prompts.reasoning_prompt import (
    REASONING_SYSTEM_PROMPT,
    REASONING_USER_PROMPT,
    REASONING_EXAMPLES
)
import json


class ReasoningState(TypedDict):
    question: str
    project_id: int
    user_role: str
    previous_context: Optional[str]
    reasoning: Optional[QueryReasoningResponse]
    relevant_tables: List[str]


def build_reasoning_prompt(state: ReasoningState) -> str:
    """Build the reasoning prompt with context."""
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

    # Build system prompt
    system_prompt = REASONING_SYSTEM_PROMPT.format(
        schema_context=schema_context,
        metrics_context=metrics_context
    )

    # Build user prompt
    user_prompt = REASONING_USER_PROMPT.format(
        question=state["question"],
        project_id=state["project_id"],
        user_role=state["user_role"],
        previous_context=state.get("previous_context", "None")
    )

    # Add few-shot examples
    examples_str = "\n\n## Examples\n"
    for ex in REASONING_EXAMPLES[:2]:
        examples_str += f"\nQuestion: {ex['question']}\n"
        examples_str += f"Reasoning: {json.dumps(ex['reasoning'], indent=2)}\n"

    return f"{system_prompt}\n{examples_str}\n{user_prompt}"


async def reasoning_node(
    state: ReasoningState,
    generator: StructuredGenerator
) -> ReasoningState:
    """
    LangGraph node for chain-of-thought reasoning.

    Analyzes the question and creates a query construction plan.
    """
    prompt = build_reasoning_prompt(state)

    # Generate structured reasoning
    reasoning = generator.generate(
        prompt=prompt,
        response_model=QueryReasoningResponse,
        temperature=0
    )

    # Extract relevant tables from reasoning
    relevant_tables = set()
    for step in reasoning.steps:
        relevant_tables.update(step.tables_involved)

    # Update state
    return {
        **state,
        "reasoning": reasoning,
        "relevant_tables": list(relevant_tables)
    }


def should_use_reasoning(state: dict) -> bool:
    """Determine if reasoning step should be used."""
    # Use reasoning for complex queries
    question = state.get("question", "").lower()

    # Keywords suggesting complex queries
    complex_indicators = [
        "velocity", "trend", "compare", "ratio", "percentage",
        "over time", "by month", "by week", "correlation",
        "top", "bottom", "ranking", "average", "growth"
    ]

    return any(ind in question for ind in complex_indicators)
```

---

### 2.3 SQL Correction Enhancement

#### 2.3.1 Error-Specific Correction Strategies

**File**: `llm-service/text2query/correction/correction_strategies.py`

```python
"""
Error-Specific Correction Strategies

Targeted correction approaches based on error type.
"""
from typing import Dict, Callable, Optional
from dataclasses import dataclass
from enum import Enum


class ErrorCategory(Enum):
    COLUMN_NOT_FOUND = "column_not_found"
    TABLE_NOT_FOUND = "table_not_found"
    SYNTAX_ERROR = "syntax_error"
    AMBIGUOUS_COLUMN = "ambiguous_column"
    TYPE_MISMATCH = "type_mismatch"
    MISSING_PROJECT_FILTER = "missing_project_filter"
    INVALID_AGGREGATION = "invalid_aggregation"
    PERMISSION_DENIED = "permission_denied"
    TIMEOUT = "timeout"
    UNKNOWN = "unknown"


@dataclass
class CorrectionStrategy:
    category: ErrorCategory
    prompt_modifier: str
    schema_hint: Optional[str] = None
    example_fix: Optional[str] = None


# Error pattern matching
ERROR_PATTERNS = {
    "column .* does not exist": ErrorCategory.COLUMN_NOT_FOUND,
    "relation .* does not exist": ErrorCategory.TABLE_NOT_FOUND,
    "syntax error": ErrorCategory.SYNTAX_ERROR,
    "ambiguous column": ErrorCategory.AMBIGUOUS_COLUMN,
    "cannot cast": ErrorCategory.TYPE_MISMATCH,
    "operator does not exist": ErrorCategory.TYPE_MISMATCH,
    "permission denied": ErrorCategory.PERMISSION_DENIED,
    "statement timeout": ErrorCategory.TIMEOUT,
    "missing project_id": ErrorCategory.MISSING_PROJECT_FILTER,
    "must appear in.*GROUP BY": ErrorCategory.INVALID_AGGREGATION,
}


CORRECTION_STRATEGIES: Dict[ErrorCategory, CorrectionStrategy] = {
    ErrorCategory.COLUMN_NOT_FOUND: CorrectionStrategy(
        category=ErrorCategory.COLUMN_NOT_FOUND,
        prompt_modifier="""
The column name is incorrect. Please:
1. Check the exact column names in the schema provided
2. Use the correct column name (case-sensitive)
3. Consider if the column might be in a different table
""",
        schema_hint="Focus on available columns in the referenced tables",
        example_fix="Change 'taskStatus' to 'status' (exact column name)"
    ),

    ErrorCategory.TABLE_NOT_FOUND: CorrectionStrategy(
        category=ErrorCategory.TABLE_NOT_FOUND,
        prompt_modifier="""
The table name is incorrect. Please:
1. Use the full schema-qualified table name (e.g., task.tasks, project.issues)
2. Check the available tables in the schema
3. Ensure correct spelling
""",
        schema_hint="Always use schema.table format",
        example_fix="Change 'tasks' to 'task.tasks'"
    ),

    ErrorCategory.SYNTAX_ERROR: CorrectionStrategy(
        category=ErrorCategory.SYNTAX_ERROR,
        prompt_modifier="""
There is a SQL syntax error. Please:
1. Check for missing or extra commas, parentheses, quotes
2. Verify keyword spelling (SELECT, FROM, WHERE, etc.)
3. Ensure proper clause ordering
4. Check string literals are properly quoted
""",
        example_fix="Add missing closing parenthesis or fix keyword spelling"
    ),

    ErrorCategory.AMBIGUOUS_COLUMN: CorrectionStrategy(
        category=ErrorCategory.AMBIGUOUS_COLUMN,
        prompt_modifier="""
A column reference is ambiguous. Please:
1. Prefix all column references with table alias (e.g., t.status, s.name)
2. Use consistent aliases throughout the query
3. Define clear aliases for all JOINed tables
""",
        example_fix="Change 'status' to 't.status' or 's.status' with appropriate alias"
    ),

    ErrorCategory.TYPE_MISMATCH: CorrectionStrategy(
        category=ErrorCategory.TYPE_MISMATCH,
        prompt_modifier="""
There is a data type mismatch. Please:
1. Check column data types in the schema
2. Use appropriate casting (::integer, ::text, ::date)
3. Ensure comparison operands have compatible types
""",
        example_fix="Change 'id = '123'' to 'id = 123' (remove quotes for integer)"
    ),

    ErrorCategory.MISSING_PROJECT_FILTER: CorrectionStrategy(
        category=ErrorCategory.MISSING_PROJECT_FILTER,
        prompt_modifier="""
CRITICAL: Project filter is missing. This is a multi-tenant system.
You MUST add 'project_id = :project_id' to the WHERE clause for these tables:
- task.tasks
- task.user_stories
- task.sprints
- project.issues
- project.risks
- All project-scoped tables
""",
        example_fix="Add 'WHERE project_id = :project_id' or 'AND project_id = :project_id'"
    ),

    ErrorCategory.INVALID_AGGREGATION: CorrectionStrategy(
        category=ErrorCategory.INVALID_AGGREGATION,
        prompt_modifier="""
Invalid aggregation. Please:
1. All non-aggregated columns in SELECT must be in GROUP BY
2. Use aggregate functions (COUNT, SUM, AVG, etc.) for other columns
3. Check that GROUP BY columns match SELECT columns exactly
""",
        example_fix="Add 's.name' to GROUP BY clause if it's in SELECT"
    ),

    ErrorCategory.TIMEOUT: CorrectionStrategy(
        category=ErrorCategory.TIMEOUT,
        prompt_modifier="""
Query is too slow. Please optimize by:
1. Add LIMIT clause (max 100 rows)
2. Reduce subquery depth
3. Use more specific WHERE conditions
4. Avoid SELECT * - select only needed columns
5. Ensure indexed columns are used in WHERE
""",
        example_fix="Add 'LIMIT 100' and use specific column names"
    ),

    ErrorCategory.PERMISSION_DENIED: CorrectionStrategy(
        category=ErrorCategory.PERMISSION_DENIED,
        prompt_modifier="""
Access denied. This is likely a read-only system restriction.
Please ensure:
1. Only SELECT statements (no INSERT, UPDATE, DELETE, DROP)
2. No administrative functions (pg_*, information_schema writes)
3. Only accessible tables are queried
""",
        example_fix="Change to SELECT query, remove any DML/DDL operations"
    ),

    ErrorCategory.UNKNOWN: CorrectionStrategy(
        category=ErrorCategory.UNKNOWN,
        prompt_modifier="""
An error occurred. Please:
1. Review the query structure carefully
2. Check all table and column names
3. Verify SQL syntax
4. Ensure proper data types
""",
        example_fix="Review and fix based on error message"
    ),
}


def categorize_error(error_message: str) -> ErrorCategory:
    """Categorize an error based on its message."""
    import re

    error_lower = error_message.lower()

    for pattern, category in ERROR_PATTERNS.items():
        if re.search(pattern, error_lower):
            return category

    return ErrorCategory.UNKNOWN


def get_correction_strategy(error_message: str) -> CorrectionStrategy:
    """Get the appropriate correction strategy for an error."""
    category = categorize_error(error_message)
    return CORRECTION_STRATEGIES.get(category, CORRECTION_STRATEGIES[ErrorCategory.UNKNOWN])
```

#### 2.3.2 Enhanced Corrector

**File**: `llm-service/text2query/correction/enhanced_corrector.py`

```python
"""
Enhanced Query Corrector

Intelligent SQL correction with error-specific strategies.
"""
from typing import Protocol, Optional, Tuple
from dataclasses import dataclass
from ..models.response_models import CorrectionResponse, ErrorType
from ..llm.structured_generator import StructuredGenerator
from .correction_strategies import (
    get_correction_strategy,
    CorrectionStrategy,
    ErrorCategory
)
import logging

logger = logging.getLogger(__name__)


@dataclass
class CorrectionResult:
    success: bool
    corrected_query: str
    attempts: int
    final_error: Optional[str] = None
    strategy_used: Optional[str] = None


CORRECTION_PROMPT = """You are a SQL debugging expert. Fix the following SQL query error.

## Original Question
{question}

## Invalid SQL
```sql
{invalid_sql}
```

## Error Message
{error_message}

## Error Analysis
Category: {error_category}
{strategy_hint}

## Database Schema
{schema_context}

## Correction Guidelines
1. Analyze the root cause of the error
2. Apply the minimum necessary fix
3. Preserve the original query intent
4. Ensure project_id filter is present for scoped tables
5. Add LIMIT if missing

{example_fix}

Fix the SQL and explain your correction."""


class EnhancedQueryCorrector:
    """
    Multi-attempt query correction with intelligent strategies.

    Features:
    - Error categorization
    - Strategy-specific prompts
    - Up to 3 correction attempts
    - Structured correction response
    """

    MAX_ATTEMPTS = 3

    def __init__(
        self,
        generator: StructuredGenerator,
        validator  # QueryValidator instance
    ):
        self.generator = generator
        self.validator = validator

    async def correct(
        self,
        question: str,
        invalid_sql: str,
        error_message: str,
        schema_context: str,
        project_id: int
    ) -> CorrectionResult:
        """
        Attempt to correct an invalid SQL query.

        Returns CorrectionResult with success status and corrected query.
        """
        current_sql = invalid_sql
        current_error = error_message

        for attempt in range(self.MAX_ATTEMPTS):
            logger.info(f"Correction attempt {attempt + 1}/{self.MAX_ATTEMPTS}")

            # Get strategy for current error
            strategy = get_correction_strategy(current_error)

            # Generate correction
            correction = await self._generate_correction(
                question=question,
                invalid_sql=current_sql,
                error_message=current_error,
                schema_context=schema_context,
                strategy=strategy
            )

            corrected_sql = correction.corrected_sql

            # Validate corrected query
            validation_result = await self.validator.validate(
                corrected_sql,
                project_id=project_id
            )

            if validation_result.is_valid:
                logger.info(f"Correction successful on attempt {attempt + 1}")
                return CorrectionResult(
                    success=True,
                    corrected_query=corrected_sql,
                    attempts=attempt + 1,
                    strategy_used=strategy.category.value
                )

            # Prepare for next attempt
            current_sql = corrected_sql
            current_error = (
                validation_result.errors[0].message
                if validation_result.errors
                else "Unknown validation error"
            )

            logger.warning(
                f"Correction attempt {attempt + 1} failed: {current_error}"
            )

        # All attempts failed
        return CorrectionResult(
            success=False,
            corrected_query=current_sql,
            attempts=self.MAX_ATTEMPTS,
            final_error=current_error,
            strategy_used=strategy.category.value
        )

    async def _generate_correction(
        self,
        question: str,
        invalid_sql: str,
        error_message: str,
        schema_context: str,
        strategy: CorrectionStrategy
    ) -> CorrectionResponse:
        """Generate a correction using the LLM."""

        # Build example fix hint
        example_fix = ""
        if strategy.example_fix:
            example_fix = f"\n## Example Fix\n{strategy.example_fix}\n"

        prompt = CORRECTION_PROMPT.format(
            question=question,
            invalid_sql=invalid_sql,
            error_message=error_message,
            error_category=strategy.category.value,
            strategy_hint=strategy.prompt_modifier,
            schema_context=schema_context,
            example_fix=example_fix
        )

        return self.generator.generate(
            prompt=prompt,
            response_model=CorrectionResponse,
            temperature=0
        )


def get_enhanced_corrector(
    generator: StructuredGenerator,
    validator
) -> EnhancedQueryCorrector:
    """Factory function for enhanced corrector."""
    return EnhancedQueryCorrector(generator, validator)
```

---

### 2.4 SQL Knowledge Components

#### 2.4.1 SQL Knowledge Manager

**File**: `llm-service/text2query/knowledge/sql_knowledge.py`

```python
"""
SQL Knowledge Components

Manages calculated fields, metrics, and SQL functions for query generation.
"""
from typing import Dict, List, Optional
from dataclasses import dataclass
from ..semantic.semantic_layer import get_semantic_layer, Metric


@dataclass
class CalculatedFieldInfo:
    name: str
    expression: str
    return_type: str
    description: str
    model: str


@dataclass
class SQLFunctionInfo:
    name: str
    syntax: str
    description: str
    examples: List[str]
    category: str  # aggregate, date, string, etc.


class SQLKnowledgeManager:
    """
    Manages SQL knowledge for enhanced query generation.

    Provides:
    - Calculated field definitions
    - Metric templates
    - SQL function documentation
    - JSON field access patterns
    """

    def __init__(self):
        self.semantic_layer = get_semantic_layer()
        self._calculated_fields: Dict[str, CalculatedFieldInfo] = {}
        self._sql_functions: Dict[str, SQLFunctionInfo] = {}
        self._load_knowledge()

    def _load_knowledge(self):
        """Load knowledge from semantic layer and defaults."""
        # Extract calculated fields from semantic layer
        for model in self.semantic_layer.models.values():
            for col in model.columns:
                if col.expression:
                    self._calculated_fields[f"{model.name}.{col.name}"] = CalculatedFieldInfo(
                        name=col.name,
                        expression=col.expression,
                        return_type=col.type,
                        description=col.description or "",
                        model=model.name
                    )

        # Load default SQL functions
        self._load_default_functions()

    def _load_default_functions(self):
        """Load PostgreSQL function documentation."""
        self._sql_functions = {
            # Aggregate functions
            "COUNT": SQLFunctionInfo(
                name="COUNT",
                syntax="COUNT(*) | COUNT(column) | COUNT(DISTINCT column)",
                description="Counts rows or non-null values",
                examples=[
                    "COUNT(*) -- total rows",
                    "COUNT(DISTINCT status) -- unique statuses"
                ],
                category="aggregate"
            ),
            "SUM": SQLFunctionInfo(
                name="SUM",
                syntax="SUM(numeric_column)",
                description="Sums numeric values",
                examples=["SUM(story_points)", "SUM(estimated_hours)"],
                category="aggregate"
            ),
            "AVG": SQLFunctionInfo(
                name="AVG",
                syntax="AVG(numeric_column)",
                description="Calculates average of numeric values",
                examples=["AVG(story_points)", "AVG(actual_hours)"],
                category="aggregate"
            ),
            "FILTER": SQLFunctionInfo(
                name="FILTER",
                syntax="aggregate_function(...) FILTER (WHERE condition)",
                description="Applies filter to aggregate function",
                examples=[
                    "COUNT(*) FILTER (WHERE status = 'DONE')",
                    "SUM(hours) FILTER (WHERE billable = true)"
                ],
                category="aggregate"
            ),

            # Date functions
            "DATE_TRUNC": SQLFunctionInfo(
                name="DATE_TRUNC",
                syntax="DATE_TRUNC('unit', timestamp)",
                description="Truncates timestamp to specified precision",
                examples=[
                    "DATE_TRUNC('month', created_at)",
                    "DATE_TRUNC('week', start_date)"
                ],
                category="date"
            ),
            "NOW": SQLFunctionInfo(
                name="NOW",
                syntax="NOW()",
                description="Returns current timestamp",
                examples=["NOW()", "NOW() - INTERVAL '1 month'"],
                category="date"
            ),
            "INTERVAL": SQLFunctionInfo(
                name="INTERVAL",
                syntax="INTERVAL 'value unit'",
                description="Represents a time interval",
                examples=[
                    "INTERVAL '1 month'",
                    "INTERVAL '7 days'",
                    "NOW() - INTERVAL '1 week'"
                ],
                category="date"
            ),
            "EXTRACT": SQLFunctionInfo(
                name="EXTRACT",
                syntax="EXTRACT(field FROM timestamp)",
                description="Extracts date/time component",
                examples=[
                    "EXTRACT(MONTH FROM created_at)",
                    "EXTRACT(YEAR FROM start_date)"
                ],
                category="date"
            ),

            # String functions
            "CONCAT": SQLFunctionInfo(
                name="CONCAT",
                syntax="CONCAT(string1, string2, ...)",
                description="Concatenates strings",
                examples=["CONCAT(first_name, ' ', last_name)"],
                category="string"
            ),
            "LOWER": SQLFunctionInfo(
                name="LOWER",
                syntax="LOWER(string)",
                description="Converts to lowercase",
                examples=["LOWER(status)", "LOWER(email)"],
                category="string"
            ),
            "UPPER": SQLFunctionInfo(
                name="UPPER",
                syntax="UPPER(string)",
                description="Converts to uppercase",
                examples=["UPPER(code)"],
                category="string"
            ),
            "LIKE": SQLFunctionInfo(
                name="LIKE",
                syntax="column LIKE 'pattern'",
                description="Pattern matching with wildcards",
                examples=[
                    "title LIKE '%bug%'",
                    "name LIKE 'Sprint%'"
                ],
                category="string"
            ),
            "ILIKE": SQLFunctionInfo(
                name="ILIKE",
                syntax="column ILIKE 'pattern'",
                description="Case-insensitive pattern matching",
                examples=["title ILIKE '%urgent%'"],
                category="string"
            ),

            # Conditional
            "CASE": SQLFunctionInfo(
                name="CASE",
                syntax="CASE WHEN condition THEN result [ELSE default] END",
                description="Conditional expression",
                examples=[
                    "CASE WHEN status = 'DONE' THEN 1 ELSE 0 END",
                    "CASE severity WHEN 'HIGH' THEN 3 WHEN 'MEDIUM' THEN 2 ELSE 1 END"
                ],
                category="conditional"
            ),
            "COALESCE": SQLFunctionInfo(
                name="COALESCE",
                syntax="COALESCE(value1, value2, ...)",
                description="Returns first non-null value",
                examples=[
                    "COALESCE(actual_hours, estimated_hours, 0)",
                    "COALESCE(description, 'No description')"
                ],
                category="conditional"
            ),
            "NULLIF": SQLFunctionInfo(
                name="NULLIF",
                syntax="NULLIF(value1, value2)",
                description="Returns null if values are equal",
                examples=["NULLIF(COUNT(*), 0) -- avoid division by zero"],
                category="conditional"
            ),
        }

    def get_calculated_field_instructions(
        self,
        models: List[str]
    ) -> str:
        """Generate instructions for calculated fields in specified models."""
        instructions = []

        for model_name in models:
            for key, field in self._calculated_fields.items():
                if field.model == model_name:
                    instructions.append(
                        f"- {model_name}.{field.name}: Use expression `{field.expression}` "
                        f"({field.description})"
                    )

        if not instructions:
            return ""

        return "## Calculated Fields\n" + "\n".join(instructions)

    def get_metric_instructions(self) -> str:
        """Generate instructions for predefined metrics."""
        instructions = ["## Predefined Metrics"]

        for metric in self.semantic_layer.metrics.values():
            dimensions = ", ".join(metric.dimension) if metric.dimension else "None"
            measures = ", ".join(metric.measure)

            instructions.append(
                f"\n### {metric.display_name or metric.name}\n"
                f"- Description: {metric.description or 'N/A'}\n"
                f"- Base Table: {metric.base_model}\n"
                f"- Dimensions: {dimensions}\n"
                f"- Measures: {measures}\n"
                f"- Time Grain: {metric.time_grain or 'N/A'}"
            )

        return "\n".join(instructions)

    def get_sql_functions_context(
        self,
        categories: Optional[List[str]] = None
    ) -> str:
        """Generate SQL functions documentation for prompt."""
        context = ["## Available SQL Functions"]

        funcs_by_category: Dict[str, List[SQLFunctionInfo]] = {}
        for func in self._sql_functions.values():
            if categories and func.category not in categories:
                continue
            if func.category not in funcs_by_category:
                funcs_by_category[func.category] = []
            funcs_by_category[func.category].append(func)

        for category, funcs in funcs_by_category.items():
            context.append(f"\n### {category.title()} Functions")
            for func in funcs:
                examples = ", ".join(func.examples[:2])
                context.append(f"- `{func.name}`: {func.description}")
                context.append(f"  Syntax: `{func.syntax}`")
                context.append(f"  Examples: {examples}")

        return "\n".join(context)

    def get_json_field_instructions(self) -> str:
        """Generate instructions for JSON field access."""
        return """## JSON Field Access (PostgreSQL)
- Access JSON key: `column->>'key'` (returns text)
- Access nested: `column->'level1'->>'level2'`
- Array element: `column->0` (first element)
- Check key exists: `column ? 'key'`
- Example: `metadata->>'author'` for metadata.author"""


# Singleton instance
_sql_knowledge: Optional[SQLKnowledgeManager] = None


def get_sql_knowledge() -> SQLKnowledgeManager:
    """Get or create SQL knowledge manager singleton."""
    global _sql_knowledge
    if _sql_knowledge is None:
        _sql_knowledge = SQLKnowledgeManager()
    return _sql_knowledge
```

---

## 3. Workflow Integration

### 3.1 Updated Workflow

**File**: `llm-service/workflows/text2query_workflow_v2.py` (partial)

```python
"""
Enhanced Text2Query Workflow

LangGraph workflow with reasoning, structured output, and enhanced correction.
"""
from langgraph.graph import StateGraph, END
from typing import TypedDict, Optional, List, Literal
from ..text2query.models.response_models import (
    SQLGenerationResponse,
    QueryReasoningResponse,
    QueryValidationResponse
)
from ..text2query.nodes.reasoning_node import (
    reasoning_node,
    should_use_reasoning
)
from ..text2query.intent.intent_classifier import IntentClassifier
from ..text2query.intent.intent_types import IntentType
from ..text2query.correction.enhanced_corrector import EnhancedQueryCorrector


class Text2QueryState(TypedDict):
    # Input
    question: str
    project_id: int
    user_id: int
    user_role: str
    context: Optional[str]

    # Intent
    intent: Optional[IntentType]
    intent_confidence: float

    # Reasoning (Phase 2)
    reasoning: Optional[QueryReasoningResponse]
    relevant_tables: List[str]

    # Generation
    generated_query: Optional[str]
    generation_response: Optional[SQLGenerationResponse]

    # Validation
    validation_result: Optional[QueryValidationResponse]
    is_valid: bool

    # Correction
    correction_attempts: int
    final_query: Optional[str]

    # Output
    result: Optional[dict]
    error: Optional[str]


def create_enhanced_workflow(
    intent_classifier: IntentClassifier,
    structured_generator,
    validator,
    corrector: EnhancedQueryCorrector,
    executor
) -> StateGraph:
    """Create the enhanced Text2Query workflow."""

    workflow = StateGraph(Text2QueryState)

    # Define nodes
    async def classify_intent(state: Text2QueryState) -> Text2QueryState:
        result = intent_classifier.classify(
            question=state["question"],
            context=state.get("context", ""),
            project_id=state["project_id"]
        )
        return {
            **state,
            "intent": result.intent,
            "intent_confidence": result.confidence,
            "relevant_tables": result.relevant_models
        }

    async def apply_reasoning(state: Text2QueryState) -> Text2QueryState:
        return await reasoning_node(state, structured_generator)

    async def generate_query(state: Text2QueryState) -> Text2QueryState:
        # Build prompt with reasoning context
        # ... generation logic ...
        pass

    async def validate_query(state: Text2QueryState) -> Text2QueryState:
        result = await validator.validate(
            state["generated_query"],
            project_id=state["project_id"]
        )
        return {
            **state,
            "validation_result": result,
            "is_valid": result.is_valid
        }

    async def correct_query(state: Text2QueryState) -> Text2QueryState:
        error_msg = (
            state["validation_result"].errors[0].message
            if state["validation_result"].errors
            else "Unknown error"
        )

        result = await corrector.correct(
            question=state["question"],
            invalid_sql=state["generated_query"],
            error_message=error_msg,
            schema_context="",  # Build from relevant_tables
            project_id=state["project_id"]
        )

        return {
            **state,
            "correction_attempts": result.attempts,
            "generated_query": result.corrected_query,
            "is_valid": result.success,
            "error": result.final_error if not result.success else None
        }

    async def execute_query(state: Text2QueryState) -> Text2QueryState:
        # ... execution logic ...
        pass

    async def format_response(state: Text2QueryState) -> Text2QueryState:
        # ... formatting logic ...
        pass

    async def handle_non_sql(state: Text2QueryState) -> Text2QueryState:
        # Handle GENERAL, MISLEADING, CLARIFICATION intents
        pass

    # Add nodes
    workflow.add_node("classify_intent", classify_intent)
    workflow.add_node("reasoning", apply_reasoning)
    workflow.add_node("generate", generate_query)
    workflow.add_node("validate", validate_query)
    workflow.add_node("correct", correct_query)
    workflow.add_node("execute", execute_query)
    workflow.add_node("format", format_response)
    workflow.add_node("handle_non_sql", handle_non_sql)

    # Define edges
    workflow.set_entry_point("classify_intent")

    # Conditional routing after intent classification
    def route_by_intent(state: Text2QueryState) -> Literal["reasoning", "generate", "handle_non_sql"]:
        if state["intent"] in [IntentType.TEXT_TO_SQL, IntentType.TEXT_TO_CYPHER]:
            if should_use_reasoning(state):
                return "reasoning"
            return "generate"
        return "handle_non_sql"

    workflow.add_conditional_edges(
        "classify_intent",
        route_by_intent,
        {
            "reasoning": "reasoning",
            "generate": "generate",
            "handle_non_sql": "handle_non_sql"
        }
    )

    workflow.add_edge("reasoning", "generate")
    workflow.add_edge("generate", "validate")

    # Conditional routing after validation
    def route_after_validation(state: Text2QueryState) -> Literal["execute", "correct"]:
        if state["is_valid"]:
            return "execute"
        return "correct"

    workflow.add_conditional_edges(
        "validate",
        route_after_validation,
        {
            "execute": "execute",
            "correct": "correct"
        }
    )

    # Conditional routing after correction
    def route_after_correction(state: Text2QueryState) -> Literal["execute", "format"]:
        if state["is_valid"]:
            return "execute"
        return "format"  # Return error response

    workflow.add_conditional_edges(
        "correct",
        route_after_correction,
        {
            "execute": "execute",
            "format": "format"
        }
    )

    workflow.add_edge("execute", "format")
    workflow.add_edge("format", END)
    workflow.add_edge("handle_non_sql", END)

    return workflow.compile()
```

---

## 4. Implementation Tasks

### Week 3: Structured Output + Reasoning

| Day | Task | Owner | Output |
|-----|------|-------|--------|
| D1 | Define response models | AI Dev | `response_models.py` |
| D2 | Implement StructuredGenerator | AI Dev | `structured_generator.py` |
| D3 | Build reasoning prompts | AI Dev | `reasoning_prompt.py` |
| D4 | Implement reasoning node | AI Dev | `reasoning_node.py` |
| D5 | Integration + testing | AI Dev | Tests |

### Week 4: Correction + Knowledge

| Day | Task | Owner | Output |
|-----|------|-------|--------|
| D1 | Define error strategies | AI Dev | `correction_strategies.py` |
| D2 | Implement enhanced corrector | AI Dev | `enhanced_corrector.py` |
| D3 | Build SQL knowledge manager | AI Dev | `sql_knowledge.py` |
| D4 | Update workflow | AI Dev | `text2query_workflow_v2.py` |
| D5 | E2E testing + documentation | AI Dev | Test suite, docs |

---

## 5. Test Plan

### 5.1 Structured Output Tests

```python
# tests/test_structured_output.py

def test_sql_generation_response_schema():
    """Test SQL generation response matches schema."""
    response = SQLGenerationResponse(
        sql="SELECT * FROM tasks",
        confidence=0.9,
        tables_used=["tasks"],
        reasoning="Simple select"
    )
    assert response.sql
    assert 0 <= response.confidence <= 1

def test_generator_produces_valid_response():
    """Test structured generator produces valid model."""
    generator = get_structured_generator(mock_llm)
    result = generator.generate(
        prompt="Generate SQL for counting tasks",
        response_model=SQLGenerationResponse
    )
    assert isinstance(result, SQLGenerationResponse)
    assert result.sql.upper().startswith("SELECT")
```

### 5.2 Reasoning Tests

```python
# tests/test_reasoning.py

@pytest.mark.asyncio
async def test_reasoning_identifies_complexity():
    """Test reasoning correctly identifies query complexity."""
    state = {
        "question": "What is the trend of sprint velocity over time?",
        "project_id": 1,
        "user_role": "PM"
    }

    result = await reasoning_node(state, mock_generator)

    assert result["reasoning"].estimated_complexity in ["moderate", "complex"]
    assert result["reasoning"].requires_joins
    assert result["reasoning"].aggregation_needed
```

### 5.3 Correction Tests

```python
# tests/test_correction.py

@pytest.mark.asyncio
async def test_column_not_found_correction():
    """Test correction for column not found error."""
    corrector = get_enhanced_corrector(mock_generator, mock_validator)

    result = await corrector.correct(
        question="Count tasks",
        invalid_sql="SELECT COUNT(*) FROM task.tasks WHERE taskStatus = 'DONE'",
        error_message='column "taskstatus" does not exist',
        schema_context="...",
        project_id=1
    )

    assert result.success
    assert "status" in result.corrected_query.lower()
    assert "taskstatus" not in result.corrected_query.lower()

@pytest.mark.asyncio
async def test_max_correction_attempts():
    """Test correction respects max attempts."""
    # Mock validator that always fails
    always_fail_validator = MockValidator(always_fail=True)
    corrector = get_enhanced_corrector(mock_generator, always_fail_validator)

    result = await corrector.correct(...)

    assert not result.success
    assert result.attempts == 3  # Max attempts
```

---

## 6. Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Structured output compliance | 100% | All responses parse to Pydantic models |
| Reasoning accuracy | +20% for complex queries | A/B test on complex query set |
| Correction success rate | > 80% | Corrections that pass validation |
| Error categorization accuracy | > 90% | Manual review of 100 errors |

---

## 7. Rollback Plan

Feature flags for safe rollback:

```python
FEATURE_FLAGS = {
    "use_structured_output": True,
    "use_chain_of_thought": True,
    "use_enhanced_correction": True,
    "max_correction_attempts": 3,  # Can reduce to 2
}
```

If issues arise:
1. Set `use_chain_of_thought = False` to skip reasoning
2. Set `use_structured_output = False` for text-based parsing
3. Set `max_correction_attempts = 2` to reduce correction
