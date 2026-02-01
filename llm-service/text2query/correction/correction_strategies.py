"""
Error-Specific Correction Strategies

Targeted correction approaches based on error type.
Each strategy provides specific guidance for fixing common SQL errors.
"""
import re
import logging
from typing import Dict, Optional
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class ErrorCategory(Enum):
    """Categories of SQL errors for targeted correction."""
    COLUMN_NOT_FOUND = "column_not_found"
    TABLE_NOT_FOUND = "table_not_found"
    SYNTAX_ERROR = "syntax_error"
    AMBIGUOUS_COLUMN = "ambiguous_column"
    TYPE_MISMATCH = "type_mismatch"
    MISSING_PROJECT_FILTER = "missing_project_filter"
    INVALID_AGGREGATION = "invalid_aggregation"
    PERMISSION_DENIED = "permission_denied"
    TIMEOUT = "timeout"
    MISSING_LIMIT = "missing_limit"
    SELECT_STAR = "select_star"
    UNKNOWN = "unknown"


@dataclass
class CorrectionStrategy:
    """Strategy for correcting a specific error category."""
    category: ErrorCategory
    prompt_modifier: str
    schema_hint: Optional[str] = None
    example_fix: Optional[str] = None
    priority: int = 1  # Higher = more important to fix


# Error pattern matching - maps error message patterns to categories
ERROR_PATTERNS: Dict[str, ErrorCategory] = {
    # PostgreSQL errors
    r'column "?([^"]+)"? does not exist': ErrorCategory.COLUMN_NOT_FOUND,
    r'relation "?([^"]+)"? does not exist': ErrorCategory.TABLE_NOT_FOUND,
    r'syntax error': ErrorCategory.SYNTAX_ERROR,
    r'column reference "?([^"]+)"? is ambiguous': ErrorCategory.AMBIGUOUS_COLUMN,
    r'cannot cast': ErrorCategory.TYPE_MISMATCH,
    r'operator does not exist': ErrorCategory.TYPE_MISMATCH,
    r'permission denied': ErrorCategory.PERMISSION_DENIED,
    r'statement timeout': ErrorCategory.TIMEOUT,
    r'canceling statement due to statement timeout': ErrorCategory.TIMEOUT,
    r'must appear in.*GROUP BY': ErrorCategory.INVALID_AGGREGATION,
    r'not included in.*GROUP BY': ErrorCategory.INVALID_AGGREGATION,

    # Custom validation errors
    r'missing project_id': ErrorCategory.MISSING_PROJECT_FILTER,
    r'project scope.*required': ErrorCategory.MISSING_PROJECT_FILTER,
    r'LIMIT.*required': ErrorCategory.MISSING_LIMIT,
    r'SELECT \*.*not allowed': ErrorCategory.SELECT_STAR,
}


# Detailed correction strategies for each error category
CORRECTION_STRATEGIES: Dict[ErrorCategory, CorrectionStrategy] = {
    ErrorCategory.COLUMN_NOT_FOUND: CorrectionStrategy(
        category=ErrorCategory.COLUMN_NOT_FOUND,
        prompt_modifier="""
The column name is incorrect. Please:
1. Check the exact column names in the schema provided
2. Use the correct column name (columns are case-sensitive)
3. Consider if the column might be in a different table
4. Use table alias prefix (e.g., t.column_name) when using JOINs

Common mistakes:
- 'taskStatus' → 'status'
- 'userName' → 'full_name' or 'username'
- 'storyPoint' → 'story_points'
""",
        schema_hint="Focus on available columns in the referenced tables",
        example_fix="Change 'taskStatus' to 'status' (exact column name from schema)",
        priority=2
    ),

    ErrorCategory.TABLE_NOT_FOUND: CorrectionStrategy(
        category=ErrorCategory.TABLE_NOT_FOUND,
        prompt_modifier="""
The table name is incorrect. Please:
1. Use the FULL schema-qualified table name (e.g., task.tasks, project.issues)
2. Check the available tables in the schema
3. Ensure correct spelling

Available schemas: auth, project, task, chat
Common tables:
- task.tasks, task.user_stories, task.sprints
- project.projects, project.phases, project.issues, project.risks
- auth.users
""",
        schema_hint="ALWAYS use schema.table format: task.tasks, project.issues, etc.",
        example_fix="Change 'tasks' to 'task.tasks', 'users' to 'auth.users'",
        priority=3
    ),

    ErrorCategory.SYNTAX_ERROR: CorrectionStrategy(
        category=ErrorCategory.SYNTAX_ERROR,
        prompt_modifier="""
There is a SQL syntax error. Please check for:
1. Missing or extra commas
2. Unclosed parentheses or quotes
3. Misspelled keywords (SELECT, FROM, WHERE, JOIN, GROUP BY, ORDER BY, LIMIT)
4. Incorrect clause ordering (SELECT -> FROM -> WHERE -> GROUP BY -> ORDER BY -> LIMIT)
5. Missing spaces between keywords
6. String literals should use single quotes: 'value'
""",
        example_fix="Check for typos in keywords and add missing punctuation",
        priority=3
    ),

    ErrorCategory.AMBIGUOUS_COLUMN: CorrectionStrategy(
        category=ErrorCategory.AMBIGUOUS_COLUMN,
        prompt_modifier="""
A column reference is ambiguous (exists in multiple tables). Please:
1. Prefix ALL column references with table alias (e.g., t.status, s.name)
2. Use consistent aliases throughout the query
3. Define clear aliases for all JOINed tables

Example:
WRONG: SELECT id, status FROM task.tasks t JOIN task.sprints s ON ...
RIGHT: SELECT t.id, t.status FROM task.tasks t JOIN task.sprints s ON ...
""",
        example_fix="Change 'status' to 't.status' or 's.status' with appropriate table alias",
        priority=2
    ),

    ErrorCategory.TYPE_MISMATCH: CorrectionStrategy(
        category=ErrorCategory.TYPE_MISMATCH,
        prompt_modifier="""
There is a data type mismatch. Please:
1. Check column data types in the schema
2. Use appropriate casting when needed: ::integer, ::text, ::date, ::timestamp
3. Ensure comparison operands have compatible types
4. Don't use quotes around numeric values

Common fixes:
- Integer column: WHERE id = 123 (not '123')
- Date comparison: WHERE date_col >= '2024-01-01'::date
- Text to int: WHERE id = value::integer
""",
        example_fix="Remove quotes around numbers: 'id = '123'' → 'id = 123'",
        priority=2
    ),

    ErrorCategory.MISSING_PROJECT_FILTER: CorrectionStrategy(
        category=ErrorCategory.MISSING_PROJECT_FILTER,
        prompt_modifier="""
CRITICAL: Project filter is REQUIRED. This is a multi-tenant system.

You MUST add 'project_id = :project_id' to the WHERE clause for these tables:
- task.tasks
- task.user_stories
- task.sprints
- project.phases
- project.issues
- project.risks
- All project-scoped tables

Example:
WRONG: SELECT * FROM task.tasks WHERE status = 'DONE'
RIGHT: SELECT id, title FROM task.tasks WHERE project_id = :project_id AND status = 'DONE'
""",
        example_fix="Add 'WHERE project_id = :project_id' or 'AND project_id = :project_id' to existing WHERE",
        priority=4  # Highest priority - security requirement
    ),

    ErrorCategory.INVALID_AGGREGATION: CorrectionStrategy(
        category=ErrorCategory.INVALID_AGGREGATION,
        prompt_modifier="""
Invalid aggregation - columns in SELECT don't match GROUP BY. Please:
1. ALL non-aggregated columns in SELECT MUST appear in GROUP BY
2. Use aggregate functions (COUNT, SUM, AVG, MAX, MIN) for columns not in GROUP BY
3. Check that GROUP BY column references match SELECT exactly

Example:
WRONG: SELECT s.name, us.title, SUM(us.story_points) GROUP BY s.id
RIGHT: SELECT s.name, SUM(us.story_points) GROUP BY s.id, s.name
""",
        example_fix="Add missing columns to GROUP BY or wrap them in aggregate functions",
        priority=2
    ),

    ErrorCategory.TIMEOUT: CorrectionStrategy(
        category=ErrorCategory.TIMEOUT,
        prompt_modifier="""
Query execution timed out - too slow. Please optimize by:
1. Add LIMIT clause (max 100 rows)
2. Use specific columns instead of SELECT *
3. Add more specific WHERE conditions
4. Reduce subquery depth
5. Use indexed columns in WHERE clause when possible
6. Simplify complex JOINs

Indexes typically exist on: id, project_id, status columns
""",
        example_fix="Add 'LIMIT 100' and use specific column names instead of *",
        priority=2
    ),

    ErrorCategory.PERMISSION_DENIED: CorrectionStrategy(
        category=ErrorCategory.PERMISSION_DENIED,
        prompt_modifier="""
Access denied - this is likely a READ-ONLY restriction. Please ensure:
1. ONLY use SELECT statements
2. NO INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE
3. NO administrative functions
4. Only query tables you have access to

This system only allows SELECT queries for data retrieval.
""",
        example_fix="Convert to SELECT query, remove any DML/DDL operations",
        priority=4
    ),

    ErrorCategory.MISSING_LIMIT: CorrectionStrategy(
        category=ErrorCategory.MISSING_LIMIT,
        prompt_modifier="""
LIMIT clause is required to prevent excessive result sets.

Add 'LIMIT 100' at the end of your query (or less if appropriate).
Maximum allowed is 100 rows.
""",
        example_fix="Add 'LIMIT 100' at the end of the query",
        priority=2
    ),

    ErrorCategory.SELECT_STAR: CorrectionStrategy(
        category=ErrorCategory.SELECT_STAR,
        prompt_modifier="""
SELECT * is not allowed - specify columns explicitly.

Replace SELECT * with specific column names:
WRONG: SELECT * FROM task.tasks
RIGHT: SELECT id, title, status, assignee_id FROM task.tasks

This improves performance and prevents exposing unnecessary data.
""",
        example_fix="Replace SELECT * with specific column names from schema",
        priority=2
    ),

    ErrorCategory.UNKNOWN: CorrectionStrategy(
        category=ErrorCategory.UNKNOWN,
        prompt_modifier="""
An error occurred. Please carefully review:
1. All table names (must include schema: task.tasks, not just tasks)
2. All column names (check spelling against schema)
3. SQL syntax (keywords, punctuation, clause order)
4. Data types (string vs number comparisons)
5. Required filters (project_id for scoped tables)
6. Required LIMIT clause
""",
        example_fix="Review and fix based on the specific error message",
        priority=1
    ),
}


def categorize_error(error_message: str) -> ErrorCategory:
    """
    Categorize an error based on its message.

    Args:
        error_message: The error message from validation or execution

    Returns:
        ErrorCategory for the error type
    """
    error_lower = error_message.lower()

    for pattern, category in ERROR_PATTERNS.items():
        if re.search(pattern, error_lower, re.IGNORECASE):
            logger.debug(f"Error matched pattern '{pattern}' -> {category}")
            return category

    logger.debug(f"Error not matched, returning UNKNOWN: {error_message[:100]}")
    return ErrorCategory.UNKNOWN


def get_correction_strategy(error_message: str) -> CorrectionStrategy:
    """
    Get the appropriate correction strategy for an error.

    Args:
        error_message: The error message

    Returns:
        CorrectionStrategy with hints for fixing the error
    """
    category = categorize_error(error_message)
    strategy = CORRECTION_STRATEGIES.get(category, CORRECTION_STRATEGIES[ErrorCategory.UNKNOWN])

    logger.info(f"Correction strategy selected: {strategy.category.value}")
    return strategy


def get_all_strategies_for_errors(error_messages: list) -> list:
    """
    Get strategies for multiple errors, sorted by priority.

    Args:
        error_messages: List of error messages

    Returns:
        List of CorrectionStrategy, highest priority first
    """
    strategies = [get_correction_strategy(msg) for msg in error_messages]
    # Remove duplicates and sort by priority
    seen = set()
    unique_strategies = []
    for s in strategies:
        if s.category not in seen:
            seen.add(s.category)
            unique_strategies.append(s)

    return sorted(unique_strategies, key=lambda s: s.priority, reverse=True)
