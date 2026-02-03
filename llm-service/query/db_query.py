"""
Database Query Utility for Intent Handlers.

IMPORTANT: This is SEPARATE from status_query_executor.
- status_query_executor: whitelist metrics only, strict policy
- db_query: intent handler queries, project-scoped, limited

============================================================
SAFETY GUARDS (P0 Minimum)
============================================================
1. project_id REQUIRED - All queries MUST have project_id parameter
2. LIMIT ENFORCED - Outer wrapper guarantees cap at MAX_QUERY_LIMIT
3. TIMEOUT SET - Statement timeout (QUERY_TIMEOUT_MS)
4. was_limited - Uses LIMIT+1 fetch for accurate detection
5. used_fallback - Tracks when fallback query was used
============================================================
"""

import os
import logging
from typing import Any, Dict, List, Optional
from dataclasses import dataclass
from contextlib import contextmanager

import psycopg2
from psycopg2.extras import RealDictCursor

logger = logging.getLogger(__name__)

# =============================================================================
# Safety Constants
# =============================================================================

MAX_QUERY_LIMIT = 100        # Hard limit: never return more than this
QUERY_TIMEOUT_MS = 5000      # 5 seconds max per query
DEFAULT_LIMIT = 50           # Default if handler doesn't specify


# =============================================================================
# Query Result
# =============================================================================

@dataclass
class QueryResult:
    """Result from database query"""
    success: bool
    data: List[Dict[str, Any]]
    error: Optional[str] = None
    row_count: int = 0
    was_limited: bool = False    # True if results were truncated (accurate via LIMIT+1)
    used_fallback: bool = False  # True if fallback query was used (Risk M)


# =============================================================================
# Database Connection
# =============================================================================

def _get_pg_connection():
    """Get PostgreSQL connection from environment"""
    return psycopg2.connect(
        host=os.getenv("PG_HOST", "postgres"),
        port=int(os.getenv("PG_PORT", "5432")),
        database=os.getenv("PG_DATABASE", "pms_db"),
        user=os.getenv("PG_USER", "pms_user"),
        password=os.getenv("PG_PASSWORD", "pms_password"),
    )


@contextmanager
def _get_connection_with_timeout():
    """
    Get database connection with statement timeout set.
    """
    conn = None
    try:
        conn = _get_pg_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Set statement timeout (PostgreSQL specific)
        cursor.execute(f"SET statement_timeout = {QUERY_TIMEOUT_MS}")
        logger.debug(f"Set statement_timeout = {QUERY_TIMEOUT_MS}ms")

        yield cursor

        conn.commit()
    except Exception as e:
        if conn:
            conn.rollback()
        raise
    finally:
        if conn:
            try:
                # Reset timeout before closing
                cursor = conn.cursor()
                cursor.execute("SET statement_timeout = 0")
                cursor.close()
                logger.debug("Reset statement_timeout to 0")
            except Exception as e:
                logger.warning(f"Failed to reset statement_timeout: {e}")
            finally:
                conn.close()


# =============================================================================
# Safety Validation
# =============================================================================

def _validate_params(params: Dict[str, Any]) -> Optional[str]:
    """
    Validate query parameters.

    Returns error message if validation fails, None if OK.
    """
    # GUARD 1: project_id is REQUIRED
    if "project_id" not in params:
        return "Missing required parameter: project_id"

    if not params["project_id"]:
        return "project_id cannot be empty"

    return None


def _wrap_with_outer_limit(sql: str, effective_limit: int) -> str:
    """
    Wrap query with outer LIMIT to guarantee row cap.

    IMPORTANT (Risk I completeness):
    Even if inner SQL has LIMIT 10000, outer wrapper enforces our cap.

    Pattern: SELECT * FROM ( <original SQL> ) AS q LIMIT :effective_limit

    We use LIMIT+1 to accurately detect truncation.
    """
    # Remove trailing semicolon if present
    sql_clean = sql.rstrip().rstrip(';')

    # Wrap with outer SELECT to enforce limit
    # Use effective_limit + 1 to detect truncation accurately
    wrapped = f"SELECT * FROM ( {sql_clean} ) AS __limited_q LIMIT {effective_limit + 1}"

    logger.debug(f"Wrapped query with outer LIMIT {effective_limit + 1}")
    return wrapped


def _calculate_effective_limit(requested_limit: Optional[int]) -> int:
    """Calculate the effective limit to use."""
    if requested_limit is None:
        return DEFAULT_LIMIT
    return min(requested_limit, MAX_QUERY_LIMIT)


# =============================================================================
# Query Execution
# =============================================================================

def execute_query(
    sql: str,
    params: Dict[str, Any],
    limit: Optional[int] = None,
) -> QueryResult:
    """
    Execute a parameterized SQL query safely.

    Args:
        sql: SQL query with %(param)s placeholders (psycopg2 style)
        params: Parameter dict (MUST include project_id)
        limit: Optional row limit (capped at MAX_QUERY_LIMIT)

    Returns:
        QueryResult with data or error

    Safety:
        - project_id is REQUIRED (returns error if missing)
        - LIMIT is enforced via outer wrapper (always effective)
        - TIMEOUT is set (QUERY_TIMEOUT_MS)
        - was_limited uses LIMIT+1 pattern for accuracy
    """
    # GUARD 1: Validate parameters
    validation_error = _validate_params(params)
    if validation_error:
        logger.error(f"Query validation failed: {validation_error}")
        return QueryResult(success=False, data=[], error=validation_error)

    # GUARD 2: Calculate effective limit
    effective_limit = _calculate_effective_limit(limit)

    # GUARD 3: Wrap with outer LIMIT (guarantees limit works even with inner LIMIT)
    wrapped_sql = _wrap_with_outer_limit(sql, effective_limit)

    try:
        # GUARD 4: Execute with timeout
        with _get_connection_with_timeout() as cursor:
            cursor.execute(wrapped_sql, params)

            # Fetch all results
            rows = cursor.fetchall()

            # Convert to list of dicts
            data = [dict(row) for row in rows]

            # ============================================================
            # CRITICAL (Risk L): Accurate was_limited detection
            # We fetched LIMIT+1 rows. If we got exactly limit+1,
            # there's more data. Drop the extra row.
            # ============================================================
            was_limited = len(data) > effective_limit
            if was_limited:
                data = data[:effective_limit]
                logger.debug(f"Query result truncated to {effective_limit} rows")

            return QueryResult(
                success=True,
                data=data,
                row_count=len(data),
                was_limited=was_limited,
            )

    except psycopg2.extensions.QueryCanceledError:
        # Timeout
        logger.error(f"Query timeout after {QUERY_TIMEOUT_MS}ms")
        return QueryResult(
            success=False,
            data=[],
            error=f"Query timeout ({QUERY_TIMEOUT_MS}ms exceeded)",
        )

    except psycopg2.Error as e:
        error_msg = str(e)
        logger.error(f"Database error: {e}")
        return QueryResult(success=False, data=[], error=error_msg)

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Query execution failed: {e}")
        return QueryResult(success=False, data=[], error=error_msg)


def execute_query_with_fallback(
    sql: str,
    params: Dict[str, Any],
    fallback_sql: Optional[str] = None,
    limit: Optional[int] = None,
) -> QueryResult:
    """
    Execute query with optional fallback for schema mismatches.

    GRACEFUL DEGRADATION (Risk J):
    - If primary query fails (e.g., column doesn't exist), try fallback
    - If fallback also fails, return empty result with error in warnings
    - NEVER crash the handler

    MONITORING (Risk M):
    - Sets used_fallback=True when fallback query was used
    - Also adds warning for logging/monitoring
    """
    result = execute_query(sql, params, limit)

    if not result.success and fallback_sql:
        logger.info(f"Primary query failed ({result.error}), trying fallback")
        result = execute_query(fallback_sql, params, limit)

        if result.success:
            logger.info("Fallback query succeeded")
            # Mark that fallback was used (Risk M: tracking)
            result.used_fallback = True

    return result


# =============================================================================
# Convenience Functions
# =============================================================================

def query_single(
    sql: str,
    params: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    """
    Execute query and return single row or None.

    Useful for queries that should return exactly one result.
    """
    result = execute_query(sql, params, limit=1)
    if result.success and result.data:
        return result.data[0]
    return None
