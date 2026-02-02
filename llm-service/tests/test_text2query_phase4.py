"""
Phase 4 Tests for Text2Query Hybrid Query Executor.

Tests cover:
1. HybridQueryExecutor initialization
2. SQL-only execution
3. Cypher-only execution
4. Hybrid (combined) execution
5. Merge strategies (append, join_on_id, separate)
6. Error handling
"""

import pytest
from unittest.mock import MagicMock, patch

from text2query.models import QueryType, ExecutionResult
from text2query.hybrid_executor import (
    HybridQueryExecutor,
    HybridExecutionResult,
    get_hybrid_executor,
)


class TestHybridExecutionResult:
    """Test HybridExecutionResult dataclass."""

    def test_default_values(self):
        """Test default values are set correctly."""
        result = HybridExecutionResult()

        assert result.success is False
        assert result.sql_result is None
        assert result.cypher_result is None
        assert result.combined_data == []
        assert result.total_row_count == 0
        assert result.execution_time_ms == 0.0
        assert result.errors == []

    def test_with_values(self):
        """Test initialization with values."""
        result = HybridExecutionResult(
            success=True,
            sql_result={"data": [{"id": "1"}]},
            cypher_result={"data": [{"name": "Doc1"}]},
            combined_data=[{"id": "1"}, {"name": "Doc1"}],
            total_row_count=2,
            execution_time_ms=150.0,
        )

        assert result.success is True
        assert result.total_row_count == 2


class TestHybridQueryExecutor:
    """Test HybridQueryExecutor class."""

    @pytest.fixture
    def mock_executor(self):
        """Create mock SafeQueryExecutor."""
        mock = MagicMock()

        def execute_side_effect(query, query_type, project_id, params=None):
            if query_type == QueryType.SQL:
                return ExecutionResult(
                    success=True,
                    data=[{"id": "1", "title": "Story 1"}, {"id": "2", "title": "Story 2"}],
                    columns=["id", "title"],
                    row_count=2,
                    execution_time_ms=50.0,
                )
            else:
                return ExecutionResult(
                    success=True,
                    data=[{"id": "doc1", "name": "Document 1"}],
                    columns=["id", "name"],
                    row_count=1,
                    execution_time_ms=30.0,
                )

        mock.execute.side_effect = execute_side_effect
        return mock

    @pytest.fixture
    def hybrid_executor(self, mock_executor):
        """Create HybridQueryExecutor with mock."""
        return HybridQueryExecutor(executor=mock_executor)

    # =========================================================================
    # SQL-only Execution Tests
    # =========================================================================

    def test_execute_sql_only(self, hybrid_executor, mock_executor):
        """Test SQL-only execution."""
        sql_query = "SELECT id, title FROM task.user_stories WHERE project_id = :project_id LIMIT 50"

        result = hybrid_executor.execute_sql_only(
            sql_query=sql_query,
            project_id="proj-001",
        )

        assert result.success is True
        assert result.sql_result is not None
        assert result.sql_result["row_count"] == 2
        assert result.cypher_result is None
        assert len(result.combined_data) == 2
        mock_executor.execute.assert_called_once()

    def test_execute_hybrid_sql_only(self, hybrid_executor):
        """Test hybrid execution with only SQL query."""
        result = hybrid_executor.execute_hybrid(
            question="List stories",
            project_id="proj-001",
            sql_query="SELECT id FROM task.user_stories LIMIT 10",
            cypher_query=None,
        )

        assert result.success is True
        assert result.sql_result is not None
        assert result.cypher_result is None

    # =========================================================================
    # Cypher-only Execution Tests
    # =========================================================================

    def test_execute_cypher_only(self, hybrid_executor, mock_executor):
        """Test Cypher-only execution."""
        cypher_query = "MATCH (d:Document) WHERE d.project_id = $project_id RETURN d.id, d.name LIMIT 50"

        result = hybrid_executor.execute_cypher_only(
            cypher_query=cypher_query,
            project_id="proj-001",
        )

        assert result.success is True
        assert result.cypher_result is not None
        assert result.cypher_result["row_count"] == 1
        assert result.sql_result is None
        mock_executor.execute.assert_called_once()

    def test_execute_hybrid_cypher_only(self, hybrid_executor):
        """Test hybrid execution with only Cypher query."""
        result = hybrid_executor.execute_hybrid(
            question="Find documents",
            project_id="proj-001",
            sql_query=None,
            cypher_query="MATCH (d:Document) RETURN d.title LIMIT 10",
        )

        assert result.success is True
        assert result.sql_result is None
        assert result.cypher_result is not None

    # =========================================================================
    # Hybrid (Combined) Execution Tests
    # =========================================================================

    def test_execute_hybrid_both(self, hybrid_executor, mock_executor):
        """Test hybrid execution with both SQL and Cypher."""
        sql_query = "SELECT id, title FROM task.user_stories LIMIT 10"
        cypher_query = "MATCH (d:Document) RETURN d.id, d.name LIMIT 10"

        result = hybrid_executor.execute_hybrid(
            question="Combined query",
            project_id="proj-001",
            sql_query=sql_query,
            cypher_query=cypher_query,
        )

        assert result.success is True
        assert result.sql_result is not None
        assert result.cypher_result is not None
        # Combined data should have both SQL (2 rows) and Cypher (1 row)
        assert result.total_row_count == 3
        assert mock_executor.execute.call_count == 2

    def test_hybrid_result_has_source_markers(self, hybrid_executor):
        """Test that combined results have source markers."""
        result = hybrid_executor.execute_hybrid(
            question="Combined query",
            project_id="proj-001",
            sql_query="SELECT id FROM task.user_stories LIMIT 10",
            cypher_query="MATCH (d:Document) RETURN d.id LIMIT 10",
        )

        # Check that rows have _source marker
        sql_rows = [r for r in result.combined_data if r.get("_source") == "postgresql"]
        cypher_rows = [r for r in result.combined_data if r.get("_source") == "neo4j"]

        assert len(sql_rows) == 2
        assert len(cypher_rows) == 1

    # =========================================================================
    # Merge Strategy Tests
    # =========================================================================

    def test_merge_strategy_append(self, hybrid_executor):
        """Test append merge strategy."""
        result = hybrid_executor.execute_hybrid(
            question="Test",
            project_id="proj-001",
            sql_query="SELECT id FROM task.user_stories LIMIT 10",
            cypher_query="MATCH (d:Document) RETURN d.id LIMIT 10",
            merge_strategy="append",
        )

        # All rows should be present
        assert result.total_row_count == 3
        assert all("_source" in row for row in result.combined_data)

    def test_merge_strategy_separate(self, hybrid_executor):
        """Test separate merge strategy."""
        result = hybrid_executor.execute_hybrid(
            question="Test",
            project_id="proj-001",
            sql_query="SELECT id FROM task.user_stories LIMIT 10",
            cypher_query="MATCH (d:Document) RETURN d.id LIMIT 10",
            merge_strategy="separate",
        )

        # Should have 2 sections
        assert len(result.combined_data) == 2
        assert result.combined_data[0]["_section"] == "postgresql"
        assert result.combined_data[1]["_section"] == "neo4j"

    def test_merge_strategy_join_on_id(self, hybrid_executor, mock_executor):
        """Test join_on_id merge strategy."""
        # Set up mock to return overlapping IDs
        def execute_side_effect(query, query_type, project_id, params=None):
            if query_type == QueryType.SQL:
                return ExecutionResult(
                    success=True,
                    data=[
                        {"id": "shared-1", "title": "Story 1"},
                        {"id": "sql-only", "title": "Story 2"},
                    ],
                    columns=["id", "title"],
                    row_count=2,
                )
            else:
                return ExecutionResult(
                    success=True,
                    data=[
                        {"id": "shared-1", "doc_name": "Doc 1"},
                        {"id": "neo4j-only", "doc_name": "Doc 2"},
                    ],
                    columns=["id", "doc_name"],
                    row_count=2,
                )

        mock_executor.execute.side_effect = execute_side_effect

        result = hybrid_executor.execute_hybrid(
            question="Test",
            project_id="proj-001",
            sql_query="SELECT id, title FROM test LIMIT 10",
            cypher_query="MATCH (d:Doc) RETURN d.id, d.doc_name LIMIT 10",
            merge_strategy="join_on_id",
        )

        # Should have 3 rows: shared-1 (merged), sql-only, neo4j-only
        assert result.total_row_count == 3

        # Find the merged row
        merged_row = next(
            (r for r in result.combined_data if r.get("id") == "shared-1"),
            None
        )
        assert merged_row is not None
        assert merged_row.get("title") == "Story 1"
        assert merged_row.get("neo4j_doc_name") == "Doc 1"

    # =========================================================================
    # Error Handling Tests
    # =========================================================================

    def test_sql_error_handling(self, hybrid_executor, mock_executor):
        """Test handling of SQL execution errors."""
        mock_executor.execute.side_effect = Exception("Database connection failed")

        result = hybrid_executor.execute_sql_only(
            sql_query="SELECT * FROM test",
            project_id="proj-001",
        )

        assert result.success is False
        assert len(result.errors) > 0
        assert "SQL error" in result.errors[0]

    def test_cypher_error_handling(self, hybrid_executor, mock_executor):
        """Test handling of Cypher execution errors."""
        mock_executor.execute.side_effect = Exception("Neo4j connection failed")

        result = hybrid_executor.execute_cypher_only(
            cypher_query="MATCH (n) RETURN n",
            project_id="proj-001",
        )

        assert result.success is False
        assert len(result.errors) > 0
        assert "Cypher error" in result.errors[0]

    def test_partial_failure_sql_success_cypher_fail(self, hybrid_executor, mock_executor):
        """Test partial failure: SQL succeeds, Cypher fails."""
        call_count = 0

        def execute_side_effect(query, query_type, project_id, params=None):
            nonlocal call_count
            call_count += 1
            if query_type == QueryType.SQL:
                return ExecutionResult(
                    success=True,
                    data=[{"id": "1"}],
                    row_count=1,
                )
            else:
                return ExecutionResult(
                    success=False,
                    error="Neo4j connection timeout",
                )

        mock_executor.execute.side_effect = execute_side_effect

        result = hybrid_executor.execute_hybrid(
            question="Test",
            project_id="proj-001",
            sql_query="SELECT id FROM test",
            cypher_query="MATCH (n) RETURN n",
        )

        # Overall should fail because Cypher failed
        assert result.success is False
        assert result.sql_result["success"] is True
        assert result.cypher_result["success"] is False
        assert len(result.errors) > 0

    def test_empty_queries(self, hybrid_executor):
        """Test execution with no queries provided."""
        result = hybrid_executor.execute_hybrid(
            question="Test",
            project_id="proj-001",
            sql_query=None,
            cypher_query=None,
        )

        # Should succeed with empty results
        assert result.success is True
        assert result.sql_result is None
        assert result.cypher_result is None
        assert result.combined_data == []

    # =========================================================================
    # Execution Time Tests
    # =========================================================================

    def test_execution_time_recorded(self, hybrid_executor):
        """Test that execution time is recorded."""
        result = hybrid_executor.execute_hybrid(
            question="Test",
            project_id="proj-001",
            sql_query="SELECT id FROM test LIMIT 10",
            cypher_query=None,
        )

        assert result.execution_time_ms > 0


class TestHybridExecutorSingleton:
    """Test singleton pattern for HybridQueryExecutor."""

    def test_get_hybrid_executor_returns_same_instance(self):
        """Test that get_hybrid_executor returns singleton."""
        # Reset singleton for test
        import text2query.hybrid_executor as module
        module._hybrid_executor = None

        with patch.object(
            module.HybridQueryExecutor,
            "__init__",
            return_value=None
        ):
            executor1 = get_hybrid_executor()
            executor2 = get_hybrid_executor()

            assert executor1 is executor2


class TestMergeStrategies:
    """Detailed tests for merge strategies."""

    def test_merge_append_empty_sql(self):
        """Test append with empty SQL result."""
        executor = HybridQueryExecutor(executor=MagicMock())

        result = executor._merge_append(
            sql_data=[],
            cypher_data=[{"id": "1", "name": "Doc"}],
        )

        assert len(result) == 1
        assert result[0]["_source"] == "neo4j"

    def test_merge_append_empty_cypher(self):
        """Test append with empty Cypher result."""
        executor = HybridQueryExecutor(executor=MagicMock())

        result = executor._merge_append(
            sql_data=[{"id": "1", "title": "Story"}],
            cypher_data=[],
        )

        assert len(result) == 1
        assert result[0]["_source"] == "postgresql"

    def test_merge_append_both_empty(self):
        """Test append with both empty."""
        executor = HybridQueryExecutor(executor=MagicMock())

        result = executor._merge_append(
            sql_data=[],
            cypher_data=[],
        )

        assert len(result) == 0

    def test_merge_join_no_common_ids(self):
        """Test join when no common IDs exist."""
        executor = HybridQueryExecutor(executor=MagicMock())

        result = executor._merge_join_on_id(
            sql_data=[{"id": "sql-1", "title": "Story"}],
            cypher_data=[{"id": "neo4j-1", "name": "Doc"}],
        )

        assert len(result) == 2
        # Both should be present as unmatched
        ids = {r.get("id") for r in result}
        assert ids == {"sql-1", "neo4j-1"}

    def test_merge_separate_structure(self):
        """Test separate merge structure."""
        executor = HybridQueryExecutor(executor=MagicMock())

        result = executor._merge_separate(
            sql_data=[{"id": "1"}],
            cypher_data=[{"id": "2"}, {"id": "3"}],
        )

        assert len(result) == 2
        assert result[0]["_section"] == "postgresql"
        assert result[0]["_row_count"] == 1
        assert result[1]["_section"] == "neo4j"
        assert result[1]["_row_count"] == 2

    def test_unknown_merge_strategy_defaults_to_append(self):
        """Test that unknown strategy defaults to append."""
        executor = HybridQueryExecutor(executor=MagicMock())

        result = executor._merge_results(
            sql_data=[{"id": "1"}],
            cypher_data=[{"id": "2"}],
            strategy="unknown_strategy",
        )

        # Should behave like append
        assert len(result) == 2
        assert all("_source" in r for r in result)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
