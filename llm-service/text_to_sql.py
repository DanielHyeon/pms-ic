"""
Text-to-SQL Module for Dynamic Query Generation

Uses LLM to generate SQL queries from natural language questions,
with safety validation and schema-aware context.
"""

import os
import re
import logging
from datetime import datetime
from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Tuple
from contextlib import contextmanager

import psycopg2
from psycopg2.extras import RealDictCursor

logger = logging.getLogger(__name__)


# =============================================================================
# Database Schema Definition (for LLM context)
# =============================================================================

PMS_SCHEMA = """
## Database Schema for PMS (Project Management System)

### task.user_stories (User Stories / Backlog Items)
- id: VARCHAR (PK)
- title: VARCHAR (story title)
- description: TEXT
- status: VARCHAR (BACKLOG, SELECTED, IN_PROGRESS, REVIEW, DONE, CANCELLED)
- priority: VARCHAR (HIGH, MEDIUM, LOW)
- priority_order: INTEGER (ordering within backlog)
- story_points: INTEGER (effort estimation)
- assignee_id: VARCHAR (FK to auth.users)
- project_id: VARCHAR (FK to project.projects)
- sprint_id: VARCHAR (FK to task.sprints, nullable)
- feature_id: VARCHAR (FK, nullable)
- epic: VARCHAR (epic name)
- acceptance_criteria: TEXT
- created_at, updated_at: TIMESTAMP

### task.sprints (Sprints)
- id: VARCHAR (PK)
- name: VARCHAR (sprint name like "Sprint 1 - Design")
- goal: TEXT
- status: VARCHAR (PLANNED, ACTIVE, COMPLETED)
- start_date, end_date: DATE
- conwip_limit: INTEGER (WIP limit)
- project_id: VARCHAR (FK)

### task.tasks (Sub-tasks under User Stories)
- id: VARCHAR (PK)
- title: VARCHAR
- description: TEXT
- status: VARCHAR
- priority: VARCHAR
- assignee_id: VARCHAR
- user_story_id: VARCHAR (FK to user_stories)
- sprint_id: VARCHAR
- due_date: DATE

### project.projects
- id: VARCHAR (PK)
- name: VARCHAR
- description: TEXT
- status: VARCHAR (PLANNING, IN_PROGRESS, COMPLETED, ON_HOLD)
- progress: INTEGER (0-100)
- start_date, end_date: DATE

### project.backlog_items (Product Backlog)
- id: VARCHAR (PK)
- status: VARCHAR
- story_points: INTEGER
- priority_order: INTEGER
- backlog_id: VARCHAR (FK)
- epic_id: VARCHAR

### auth.users
- id: VARCHAR (PK)
- name: VARCHAR
- email: VARCHAR
- role: VARCHAR (ADMIN, PM, DEVELOPER, QA, etc.)
- department: VARCHAR

### Common Status Values:
- User Stories: BACKLOG, SELECTED, IN_PROGRESS, REVIEW, DONE, CANCELLED
- Sprints: PLANNED, ACTIVE, COMPLETED
- Projects: PLANNING, IN_PROGRESS, COMPLETED, ON_HOLD
"""

# SQL Safety patterns - FORBIDDEN operations
FORBIDDEN_PATTERNS = [
    r'\b(DROP|DELETE|TRUNCATE|INSERT|UPDATE|ALTER|CREATE|GRANT|REVOKE)\b',
    r'\b(EXECUTE|EXEC)\b',
    r';\s*\w',  # Multiple statements
    r'--',      # SQL comments (potential injection)
    r'/\*',     # Block comments
]

# Maximum rows to return
MAX_RESULT_ROWS = 50


# =============================================================================
# Data Classes
# =============================================================================

@dataclass
class SQLGenerationResult:
    """Result of SQL generation"""
    sql: str
    is_valid: bool
    validation_error: Optional[str] = None
    explanation: str = ""


@dataclass
class QueryExecutionResult:
    """Result of query execution"""
    success: bool
    data: List[Dict[str, Any]] = field(default_factory=list)
    row_count: int = 0
    columns: List[str] = field(default_factory=list)
    error: Optional[str] = None
    execution_time_ms: float = 0.0
    sql_used: str = ""


# =============================================================================
# Database Connection
# =============================================================================

def get_pg_connection():
    """Get PostgreSQL connection from environment"""
    return psycopg2.connect(
        host=os.getenv("PG_HOST", "postgres"),
        port=int(os.getenv("PG_PORT", "5432")),
        database=os.getenv("PG_DATABASE", "pms_db"),
        user=os.getenv("PG_USER", "pms_user"),
        password=os.getenv("PG_PASSWORD", "pms_password"),
    )


@contextmanager
def get_cursor():
    """Context manager for database cursor"""
    conn = None
    try:
        conn = get_pg_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        yield cursor
        conn.commit()
    except Exception as e:
        if conn:
            conn.rollback()
        raise e
    finally:
        if conn:
            conn.close()


# =============================================================================
# SQL Validation
# =============================================================================

def validate_sql(sql: str) -> Tuple[bool, Optional[str]]:
    """
    Validate SQL for safety (read-only operations only).

    Returns:
        Tuple of (is_valid, error_message)
    """
    sql_upper = sql.upper().strip()

    # Must start with SELECT
    if not sql_upper.startswith('SELECT'):
        return False, "Only SELECT queries are allowed"

    # Check for forbidden patterns
    for pattern in FORBIDDEN_PATTERNS:
        if re.search(pattern, sql_upper, re.IGNORECASE):
            return False, f"Forbidden SQL pattern detected: {pattern}"

    # Check for reasonable length
    if len(sql) > 5000:
        return False, "Query too long (max 5000 characters)"

    return True, None


# =============================================================================
# SQL Generation Prompt
# =============================================================================

def build_sql_generation_prompt(
    question: str,
    project_id: str,
    additional_context: str = ""
) -> str:
    """Build prompt for SQL generation"""
    return f"""You are a SQL expert. Generate a PostgreSQL query to answer the user's question.

{PMS_SCHEMA}

## Rules:
1. ONLY generate SELECT queries (no INSERT, UPDATE, DELETE, DROP, etc.)
2. Always filter by project_id = '{project_id}' when querying project-specific data
3. Use appropriate JOINs when needed
4. Limit results to {MAX_RESULT_ROWS} rows
5. Order results meaningfully (by priority, date, status, etc.)
6. Include relevant columns that help answer the question
7. Use Korean-friendly column aliases when appropriate

## User Question:
{question}

{additional_context}

## Output Format:
Return ONLY the SQL query, no explanations or markdown.
The query must be a valid PostgreSQL SELECT statement.

SQL:"""


# =============================================================================
# Text-to-SQL Generator
# =============================================================================

class TextToSQLGenerator:
    """
    Generates SQL from natural language using LLM.
    """

    def __init__(self, llm_service=None):
        """
        Initialize with optional LLM service.
        If not provided, will use local model via model_service.
        """
        self.llm_service = llm_service

    def generate_sql(
        self,
        question: str,
        project_id: str,
        context: str = ""
    ) -> SQLGenerationResult:
        """
        Generate SQL from natural language question.

        Args:
            question: User's question in natural language
            project_id: Project ID for filtering
            context: Additional context

        Returns:
            SQLGenerationResult with generated SQL
        """
        prompt = build_sql_generation_prompt(question, project_id, context)

        try:
            # Use the model service for generation
            from services.model_service import get_model_service
            model_service = get_model_service()

            # Generate SQL using LLM
            response = model_service.generate(
                prompt=prompt,
                max_tokens=500,
                temperature=0.1,  # Low temperature for deterministic SQL
                stop=["```", "\n\n\n"]
            )

            # Extract SQL from response
            sql = self._extract_sql(response)

            # Validate SQL
            is_valid, error = validate_sql(sql)

            return SQLGenerationResult(
                sql=sql,
                is_valid=is_valid,
                validation_error=error,
                explanation=f"Generated from: {question[:50]}..."
            )

        except Exception as e:
            logger.error(f"SQL generation failed: {e}")
            return SQLGenerationResult(
                sql="",
                is_valid=False,
                validation_error=str(e),
            )

    def _extract_sql(self, response: str) -> str:
        """Extract SQL from LLM response"""
        # Remove common prefixes
        response = response.strip()

        # Remove markdown code blocks if present
        if response.startswith("```sql"):
            response = response[6:]
        elif response.startswith("```"):
            response = response[3:]

        if response.endswith("```"):
            response = response[:-3]

        # Clean up
        response = response.strip()

        # If response starts with SELECT, it's already SQL
        if response.upper().startswith("SELECT"):
            return response

        # Try to find SELECT statement in response
        select_match = re.search(r'(SELECT\s+.+?)(?:;|$)', response, re.IGNORECASE | re.DOTALL)
        if select_match:
            return select_match.group(1).strip()

        return response


# =============================================================================
# Query Executor
# =============================================================================

class DynamicQueryExecutor:
    """
    Executes dynamically generated SQL queries safely.
    """

    def __init__(self):
        self.generator = TextToSQLGenerator()

    def execute_natural_query(
        self,
        question: str,
        project_id: str,
        context: str = ""
    ) -> QueryExecutionResult:
        """
        Execute a natural language query.

        Args:
            question: User's question
            project_id: Project ID for context
            context: Additional context

        Returns:
            QueryExecutionResult with data
        """
        start_time = datetime.now()

        # Generate SQL
        gen_result = self.generator.generate_sql(question, project_id, context)

        if not gen_result.is_valid:
            return QueryExecutionResult(
                success=False,
                error=f"SQL generation failed: {gen_result.validation_error}",
                sql_used=gen_result.sql,
            )

        # Execute SQL
        try:
            with get_cursor() as cursor:
                cursor.execute(gen_result.sql)
                rows = cursor.fetchall()

                # Convert to list of dicts
                data = [dict(row) for row in rows[:MAX_RESULT_ROWS]]

                # Get column names
                columns = [desc[0] for desc in cursor.description] if cursor.description else []

                execution_time = (datetime.now() - start_time).total_seconds() * 1000

                return QueryExecutionResult(
                    success=True,
                    data=data,
                    row_count=len(data),
                    columns=columns,
                    execution_time_ms=execution_time,
                    sql_used=gen_result.sql,
                )

        except Exception as e:
            logger.error(f"Query execution failed: {e}")
            return QueryExecutionResult(
                success=False,
                error=str(e),
                sql_used=gen_result.sql,
            )

    def execute_with_fallback(
        self,
        question: str,
        project_id: str,
        fallback_sql: Optional[str] = None
    ) -> QueryExecutionResult:
        """
        Execute query with fallback SQL if generation fails.
        """
        result = self.execute_natural_query(question, project_id)

        if not result.success and fallback_sql:
            logger.info(f"Using fallback SQL for: {question[:50]}")

            is_valid, error = validate_sql(fallback_sql)
            if not is_valid:
                return result

            try:
                with get_cursor() as cursor:
                    cursor.execute(fallback_sql)
                    rows = cursor.fetchall()
                    data = [dict(row) for row in rows[:MAX_RESULT_ROWS]]
                    columns = [desc[0] for desc in cursor.description] if cursor.description else []

                    return QueryExecutionResult(
                        success=True,
                        data=data,
                        row_count=len(data),
                        columns=columns,
                        sql_used=fallback_sql,
                    )
            except Exception as e:
                return QueryExecutionResult(
                    success=False,
                    error=str(e),
                    sql_used=fallback_sql,
                )

        return result


# =============================================================================
# Result Formatter
# =============================================================================

def format_query_result(
    result: QueryExecutionResult,
    question: str,
    format_type: str = "markdown"
) -> str:
    """
    Format query result for display.

    Args:
        result: Query execution result
        question: Original question
        format_type: "markdown", "table", or "list"

    Returns:
        Formatted string
    """
    if not result.success:
        return f"**Query Failed**\n\nError: {result.error}"

    if result.row_count == 0:
        return f"**No results found**\n\n_Query: {question}_"

    # Build output based on format type
    if format_type == "table":
        return _format_as_table(result)
    elif format_type == "list":
        return _format_as_list(result)
    else:
        return _format_as_markdown(result)


def _format_as_markdown(result: QueryExecutionResult) -> str:
    """Format as markdown with details"""
    lines = [f"**Results** ({result.row_count} rows)\n"]

    for i, row in enumerate(result.data[:20], 1):
        lines.append(f"**{i}.** ")
        # Find the main identifier (title, name, id)
        title = row.get('title') or row.get('name') or row.get('id', '')
        status = row.get('status', '')

        if title:
            lines[-1] += f"{title}"
        if status:
            lines[-1] += f" [{status}]"

        # Add relevant details
        details = []
        for key, value in row.items():
            if key not in ('id', 'title', 'name', 'status', 'created_at', 'updated_at', 'created_by', 'updated_by'):
                if value is not None:
                    # Truncate long values
                    str_val = str(value)
                    if len(str_val) > 100:
                        str_val = str_val[:100] + "..."
                    details.append(f"{key}: {str_val}")

        if details:
            lines.append(f"   _{', '.join(details[:5])}_")
        lines.append("")

    if result.row_count > 20:
        lines.append(f"_... and {result.row_count - 20} more rows_")

    lines.append(f"\n_Data source: PostgreSQL ({result.execution_time_ms:.1f}ms)_")

    return "\n".join(lines)


def _format_as_table(result: QueryExecutionResult) -> str:
    """Format as markdown table"""
    if not result.columns:
        return "No columns"

    # Select key columns (max 5)
    display_cols = result.columns[:5]

    lines = ["| " + " | ".join(display_cols) + " |"]
    lines.append("| " + " | ".join(["---"] * len(display_cols)) + " |")

    for row in result.data[:20]:
        values = []
        for col in display_cols:
            val = row.get(col, '')
            str_val = str(val) if val is not None else ''
            if len(str_val) > 30:
                str_val = str_val[:30] + "..."
            values.append(str_val)
        lines.append("| " + " | ".join(values) + " |")

    return "\n".join(lines)


def _format_as_list(result: QueryExecutionResult) -> str:
    """Format as simple list"""
    lines = []
    for row in result.data[:20]:
        title = row.get('title') or row.get('name') or str(row.get('id', ''))
        status = row.get('status', '')
        points = row.get('story_points', '')

        line = f"- {title}"
        if status:
            line += f" [{status}]"
        if points:
            line += f" ({points}pt)"
        lines.append(line)

    return "\n".join(lines)


# =============================================================================
# Convenience Functions
# =============================================================================

_executor: Optional[DynamicQueryExecutor] = None


def get_dynamic_query_executor() -> DynamicQueryExecutor:
    """Get singleton executor instance"""
    global _executor
    if _executor is None:
        _executor = DynamicQueryExecutor()
    return _executor


def execute_dynamic_query(
    question: str,
    project_id: str,
    format_type: str = "markdown"
) -> Tuple[str, QueryExecutionResult]:
    """
    Convenience function to execute a natural language query and get formatted result.

    Returns:
        Tuple of (formatted_response, raw_result)
    """
    executor = get_dynamic_query_executor()
    result = executor.execute_natural_query(question, project_id)
    formatted = format_query_result(result, question, format_type)
    return formatted, result
