"""
Safe Query Executor with Resource Guards.

Implements timeout, row limits, and memory guards for all query execution.
"""

import os
import logging
import time
import signal
from typing import Dict, Any, Optional
from dataclasses import dataclass
from contextlib import contextmanager

from .models import QueryType, ExecutionResult

logger = logging.getLogger(__name__)


# =============================================================================
# Safe Execution Configuration
# =============================================================================


@dataclass
class SafeExecutionConfig:
    """Configuration for safe query execution."""

    timeout_ms: int = 5000  # Query timeout (5 seconds default)
    max_rows: int = 100  # Maximum rows to return
    max_memory_mb: int = 256  # Memory limit (soft limit via statement_mem)
    enable_cost_check: bool = True  # Check EXPLAIN cost before execution
    cost_threshold: int = 10000  # Reject if estimated cost exceeds
    enable_statement_timeout: bool = True  # Use PostgreSQL statement_timeout


# =============================================================================
# Timeout Handler
# =============================================================================


class QueryTimeoutError(Exception):
    """Raised when query execution exceeds timeout."""

    pass


@contextmanager
def execution_timeout(timeout_seconds: int):
    """
    Context manager that enforces execution timeout.

    Uses SIGALRM on Unix systems.
    """

    def timeout_handler(signum, frame):
        raise QueryTimeoutError(
            f"Query execution exceeded {timeout_seconds} seconds"
        )

    # Set up the signal handler
    original_handler = signal.signal(signal.SIGALRM, timeout_handler)
    signal.alarm(timeout_seconds)

    try:
        yield
    finally:
        # Restore original handler and cancel alarm
        signal.alarm(0)
        signal.signal(signal.SIGALRM, original_handler)


# =============================================================================
# Safe Query Executor
# =============================================================================


class SafeQueryExecutor:
    """
    Executes queries with safety guarantees.

    ## Safety Contracts:

    ### Contract 1: Timeout Guarantee
    - All queries MUST complete within config.timeout_ms
    - Exceeded timeout -> raise QueryTimeoutError
    - PostgreSQL: Uses SET statement_timeout
    - Neo4j: Uses transaction timeout

    ### Contract 2: Row Limit Guarantee
    - Results MUST NOT exceed config.max_rows
    - Extra rows are discarded (not raised as error)
    - Warning logged if rows were truncated

    ### Contract 3: Memory Guard (PostgreSQL)
    - Sets work_mem/statement_mem to limit memory usage
    - Prevents single query from consuming excessive memory

    ### Contract 4: Cost Pre-check (Optional)
    - Runs EXPLAIN before execution to estimate cost
    - Rejects queries with cost > config.cost_threshold
    - Prevents expensive full-table scans

    ### Contract 5: Read-Only Guarantee
    - All connections use READ ONLY transaction mode
    - Prevents any accidental writes even if validation missed something
    """

    def __init__(self, config: Optional[SafeExecutionConfig] = None):
        self.config = config or SafeExecutionConfig()

    def execute(
        self,
        query: str,
        query_type: QueryType,
        project_id: str,
        params: Optional[Dict[str, Any]] = None,
    ) -> ExecutionResult:
        """
        Execute query with all safety guards.

        Args:
            query: Validated query string
            query_type: SQL or Cypher
            project_id: Project ID for logging
            params: Query parameters

        Returns:
            ExecutionResult with data or error
        """
        start_time = time.time()

        try:
            if query_type == QueryType.SQL:
                return self._execute_sql_safely(query, params)
            else:
                return self._execute_cypher_safely(query, params)

        except QueryTimeoutError as e:
            logger.warning(f"Query timeout for project {project_id}: {e}")
            return ExecutionResult(
                success=False,
                error=f"Query timed out after {self.config.timeout_ms}ms",
                execution_time_ms=(time.time() - start_time) * 1000,
                query_used=query,
            )
        except Exception as e:
            logger.error(f"Query execution failed: {e}")
            return ExecutionResult(
                success=False,
                error=str(e),
                execution_time_ms=(time.time() - start_time) * 1000,
                query_used=query,
            )

    def _execute_sql_safely(
        self,
        query: str,
        params: Optional[Dict[str, Any]] = None,
    ) -> ExecutionResult:
        """Execute SQL with PostgreSQL-specific safety guards."""
        import psycopg2
        from psycopg2.extras import RealDictCursor

        conn = None
        start_time = time.time()

        try:
            conn = self._get_pg_connection()

            # Contract 5: Read-only transaction
            conn.set_session(readonly=True, autocommit=False)

            cursor = conn.cursor(cursor_factory=RealDictCursor)

            # Contract 1: Statement timeout
            if self.config.enable_statement_timeout:
                cursor.execute(f"SET statement_timeout = '{self.config.timeout_ms}ms'")

            # Contract 3: Memory limit
            cursor.execute(f"SET work_mem = '{self.config.max_memory_mb // 4}MB'")

            # Contract 4: Cost pre-check (optional)
            if self.config.enable_cost_check:
                cost = self._estimate_query_cost(cursor, query)
                if cost > self.config.cost_threshold:
                    return ExecutionResult(
                        success=False,
                        error=f"Query cost ({cost}) exceeds threshold ({self.config.cost_threshold})",
                        execution_time_ms=(time.time() - start_time) * 1000,
                        query_used=query,
                    )

            # Execute with timeout context
            timeout_seconds = (self.config.timeout_ms // 1000) + 1
            with execution_timeout(timeout_seconds):
                cursor.execute(query, params or {})
                rows = cursor.fetchmany(
                    self.config.max_rows + 1
                )  # Fetch +1 to detect truncation

            # Contract 2: Row limit
            truncated = len(rows) > self.config.max_rows
            if truncated:
                logger.warning(
                    f"Query results truncated to {self.config.max_rows} rows"
                )
                rows = rows[: self.config.max_rows]

            data = [dict(row) for row in rows]
            columns = (
                [desc[0] for desc in cursor.description] if cursor.description else []
            )

            return ExecutionResult(
                success=True,
                data=data,
                columns=columns,
                row_count=len(data),
                execution_time_ms=(time.time() - start_time) * 1000,
                query_used=query,
            )

        finally:
            if conn:
                conn.rollback()  # Always rollback read-only transaction
                conn.close()

    def _execute_cypher_safely(
        self,
        query: str,
        params: Optional[Dict[str, Any]] = None,
    ) -> ExecutionResult:
        """Execute Cypher with Neo4j-specific safety guards."""
        from neo4j import GraphDatabase

        driver = None
        start_time = time.time()

        try:
            driver = self._get_neo4j_driver()

            # Contract 1: Transaction timeout
            timeout_seconds = self.config.timeout_ms / 1000

            with driver.session(
                database="neo4j",
                default_access_mode="READ",  # Contract 5: Read-only
            ) as session:
                # Execute with timeout
                result = session.run(query, params or {}, timeout=timeout_seconds)

                # Contract 2: Row limit with LIMIT enforcement
                records = []
                for i, record in enumerate(result):
                    if i >= self.config.max_rows:
                        logger.warning(
                            f"Cypher results truncated to {self.config.max_rows} rows"
                        )
                        break
                    records.append(dict(record))

                return ExecutionResult(
                    success=True,
                    data=records,
                    columns=list(records[0].keys()) if records else [],
                    row_count=len(records),
                    execution_time_ms=(time.time() - start_time) * 1000,
                    query_used=query,
                )

        finally:
            if driver:
                driver.close()

    def _estimate_query_cost(self, cursor, query: str) -> float:
        """
        Estimate query cost using EXPLAIN.

        Returns estimated total cost from query plan.
        """
        try:
            cursor.execute(f"EXPLAIN (FORMAT JSON) {query}")
            plan = cursor.fetchone()[0][0]
            return plan.get("Plan", {}).get("Total Cost", 0)
        except Exception as e:
            logger.warning(f"Cost estimation failed: {e}")
            return 0  # Allow execution if estimation fails

    def _get_pg_connection(self):
        """Get PostgreSQL connection."""
        import psycopg2

        return psycopg2.connect(
            host=os.getenv("PG_HOST", "postgres"),
            port=int(os.getenv("PG_PORT", "5432")),
            database=os.getenv("PG_DATABASE", "pms_db"),
            user=os.getenv("PG_USER", "pms_user"),
            password=os.getenv("PG_PASSWORD", "pms_password"),
        )

    def _get_neo4j_driver(self):
        """Get Neo4j driver."""
        from neo4j import GraphDatabase

        uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
        user = os.getenv("NEO4J_USER", "neo4j")
        password = os.getenv("NEO4J_PASSWORD", "pmspassword123")
        return GraphDatabase.driver(uri, auth=(user, password))


# =============================================================================
# Singleton
# =============================================================================

_executor: Optional[SafeQueryExecutor] = None


def get_query_executor() -> SafeQueryExecutor:
    """Get singleton SafeQueryExecutor instance."""
    global _executor
    if _executor is None:
        _executor = SafeQueryExecutor()
    return _executor
