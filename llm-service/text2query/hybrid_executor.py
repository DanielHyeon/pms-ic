"""
Hybrid Query Executor for combined PostgreSQL + Neo4j queries.

Supports scenarios where both relational and graph data are needed.
"""

import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field

from .models import QueryType, ExecutionResult
from .query_executor import get_query_executor, SafeQueryExecutor

logger = logging.getLogger(__name__)


@dataclass
class HybridExecutionResult:
    """Result of hybrid query execution."""

    success: bool = False
    sql_result: Optional[Dict[str, Any]] = None
    cypher_result: Optional[Dict[str, Any]] = None
    combined_data: List[Dict[str, Any]] = field(default_factory=list)
    total_row_count: int = 0
    execution_time_ms: float = 0.0
    errors: List[str] = field(default_factory=list)


class HybridQueryExecutor:
    """
    Executes hybrid queries combining PostgreSQL and Neo4j results.

    Use cases:
    - Status metrics from PG + related documents from Neo4j
    - Project info from PG + knowledge graph context from Neo4j
    - Sprint data from PG + document chunks from Neo4j
    """

    def __init__(self, executor: Optional[SafeQueryExecutor] = None):
        self.executor = executor or get_query_executor()

    def execute_hybrid(
        self,
        question: str,
        project_id: str,
        sql_query: Optional[str] = None,
        cypher_query: Optional[str] = None,
        merge_strategy: str = "append",
    ) -> HybridExecutionResult:
        """
        Execute both SQL and Cypher queries and merge results.

        Args:
            question: Original question (for logging)
            project_id: Project ID for scoping
            sql_query: Optional SQL query
            cypher_query: Optional Cypher query
            merge_strategy: How to merge results ("append", "join_on_id", "separate")

        Returns:
            HybridExecutionResult with combined data
        """
        import time

        start_time = time.time()
        result = HybridExecutionResult()

        # Execute SQL if provided
        if sql_query:
            sql_result = self._execute_sql(sql_query, project_id)
            result.sql_result = sql_result
            if not sql_result["success"]:
                result.errors.append(f"SQL error: {sql_result.get('error', 'Unknown')}")

        # Execute Cypher if provided
        if cypher_query:
            cypher_result = self._execute_cypher(cypher_query, project_id)
            result.cypher_result = cypher_result
            if not cypher_result["success"]:
                result.errors.append(
                    f"Cypher error: {cypher_result.get('error', 'Unknown')}"
                )

        # Determine overall success
        sql_ok = result.sql_result is None or result.sql_result.get("success", False)
        cypher_ok = result.cypher_result is None or result.cypher_result.get(
            "success", False
        )
        result.success = sql_ok and cypher_ok

        # Merge data based on strategy
        if result.success:
            sql_data = (
                result.sql_result.get("data", []) if result.sql_result else []
            )
            cypher_data = (
                result.cypher_result.get("data", []) if result.cypher_result else []
            )

            result.combined_data = self._merge_results(
                sql_data=sql_data,
                cypher_data=cypher_data,
                strategy=merge_strategy,
            )
            result.total_row_count = len(result.combined_data)

        result.execution_time_ms = (time.time() - start_time) * 1000

        logger.info(
            f"Hybrid query completed: success={result.success}, "
            f"rows={result.total_row_count}, time={result.execution_time_ms:.2f}ms"
        )

        return result

    def execute_sql_only(
        self, sql_query: str, project_id: str
    ) -> HybridExecutionResult:
        """Execute SQL query only."""
        return self.execute_hybrid(
            question="",
            project_id=project_id,
            sql_query=sql_query,
            cypher_query=None,
        )

    def execute_cypher_only(
        self, cypher_query: str, project_id: str
    ) -> HybridExecutionResult:
        """Execute Cypher query only."""
        return self.execute_hybrid(
            question="",
            project_id=project_id,
            sql_query=None,
            cypher_query=cypher_query,
        )

    def _execute_sql(self, query: str, project_id: str) -> Dict[str, Any]:
        """Execute SQL query and return result dict."""
        try:
            result = self.executor.execute(
                query=query,
                query_type=QueryType.SQL,
                project_id=project_id,
            )
            return {
                "success": result.success,
                "data": result.data,
                "columns": result.columns,
                "row_count": result.row_count,
                "error": result.error,
                "execution_time_ms": result.execution_time_ms,
            }
        except Exception as e:
            logger.error(f"SQL execution failed: {e}")
            return {
                "success": False,
                "data": [],
                "columns": [],
                "row_count": 0,
                "error": str(e),
            }

    def _execute_cypher(self, query: str, project_id: str) -> Dict[str, Any]:
        """Execute Cypher query and return result dict."""
        try:
            result = self.executor.execute(
                query=query,
                query_type=QueryType.CYPHER,
                project_id=project_id,
            )
            return {
                "success": result.success,
                "data": result.data,
                "columns": result.columns,
                "row_count": result.row_count,
                "error": result.error,
                "execution_time_ms": result.execution_time_ms,
            }
        except Exception as e:
            logger.error(f"Cypher execution failed: {e}")
            return {
                "success": False,
                "data": [],
                "columns": [],
                "row_count": 0,
                "error": str(e),
            }

    def _merge_results(
        self,
        sql_data: List[Dict],
        cypher_data: List[Dict],
        strategy: str = "append",
    ) -> List[Dict]:
        """
        Merge SQL and Cypher results.

        Strategies:
        - append: Simply concatenate both result sets
        - join_on_id: Join on common 'id' field
        - separate: Keep results in separate sections
        """
        if strategy == "append":
            return self._merge_append(sql_data, cypher_data)
        elif strategy == "join_on_id":
            return self._merge_join_on_id(sql_data, cypher_data)
        elif strategy == "separate":
            return self._merge_separate(sql_data, cypher_data)
        else:
            logger.warning(f"Unknown merge strategy: {strategy}, using append")
            return self._merge_append(sql_data, cypher_data)

    def _merge_append(
        self, sql_data: List[Dict], cypher_data: List[Dict]
    ) -> List[Dict]:
        """Append both result sets with source markers."""
        combined = []

        # Add SQL data with source marker
        for row in sql_data:
            combined.append({**row, "_source": "postgresql"})

        # Add Cypher data with source marker
        for row in cypher_data:
            combined.append({**row, "_source": "neo4j"})

        return combined

    def _merge_join_on_id(
        self, sql_data: List[Dict], cypher_data: List[Dict]
    ) -> List[Dict]:
        """Join SQL and Cypher data on common 'id' field."""
        # Build index of Cypher data by ID
        cypher_by_id: Dict[str, Dict] = {}
        for row in cypher_data:
            row_id = row.get("id")
            if row_id:
                cypher_by_id[str(row_id)] = row

        combined = []
        matched_ids = set()

        # Join SQL rows with matching Cypher rows
        for sql_row in sql_data:
            row_id = str(sql_row.get("id", ""))
            merged_row = {**sql_row, "_source": "postgresql"}

            if row_id in cypher_by_id:
                # Merge Cypher data (prefix keys to avoid collision)
                for key, value in cypher_by_id[row_id].items():
                    if key != "id":
                        merged_row[f"neo4j_{key}"] = value
                matched_ids.add(row_id)

            combined.append(merged_row)

        # Add unmatched Cypher rows
        for row in cypher_data:
            row_id = str(row.get("id", ""))
            if row_id not in matched_ids:
                combined.append({**row, "_source": "neo4j"})

        return combined

    def _merge_separate(
        self, sql_data: List[Dict], cypher_data: List[Dict]
    ) -> List[Dict]:
        """Keep results in separate sections."""
        return [
            {
                "_section": "postgresql",
                "_data": sql_data,
                "_row_count": len(sql_data),
            },
            {
                "_section": "neo4j",
                "_data": cypher_data,
                "_row_count": len(cypher_data),
            },
        ]


# Singleton
_hybrid_executor: Optional[HybridQueryExecutor] = None


def get_hybrid_executor() -> HybridQueryExecutor:
    """Get singleton HybridQueryExecutor instance."""
    global _hybrid_executor
    if _hybrid_executor is None:
        _hybrid_executor = HybridQueryExecutor()
    return _hybrid_executor
