"""
Safety Scenario Tests for Status Query Engine.

Reference: docs/HALLUCINATION_VERIFICATION_PLAN.md - Phase 8-C

Tests that the system safely handles edge cases and failures
WITHOUT generating hallucinated or fabricated data.

Key principle: When in doubt, return nothing (safe failure).
"""

import pytest
from datetime import datetime
from unittest.mock import patch, MagicMock
from psycopg2 import OperationalError, ProgrammingError

from status_query_plan import (
    StatusQueryPlan,
    QueryScope,
    TimeRange,
    QueryFilters,
    OutputConfig,
)
from status_query_executor import (
    StatusQueryExecutor,
    StatusQueryResult,
    MetricResult,
    get_cursor,
)
from status_response_contract import (
    build_status_response,
    StatusResponseContract,
    create_no_data_response,
)


# =============================================================================
# Empty Data Scenarios
# =============================================================================

class TestEmptyDataScenarios:
    """Test safe handling of empty data situations"""

    @pytest.fixture
    def executor(self):
        return StatusQueryExecutor()

    @pytest.fixture
    def base_plan(self):
        return StatusQueryPlan(
            answer_type="test_empty_data",
            scope=QueryScope(project_id="test-project"),
            metrics=["story_counts_by_status", "completion_rate", "blocked_items"],
            validated=True,
        )

    @patch("status_query_executor.get_cursor")
    def test_nonexistent_project_returns_empty(self, mock_get_cursor, executor, base_plan):
        """Query with nonexistent project_id should return empty, not fabricated data"""
        mock_cursor = MagicMock()
        mock_cursor.fetchall.return_value = []
        mock_cursor.fetchone.return_value = {"done": 0, "total": 0, "rate": 0}
        mock_get_cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_get_cursor.return_value.__exit__ = MagicMock(return_value=False)

        base_plan.scope.project_id = "nonexistent-project-xyz"

        result = executor.execute(base_plan)

        # Should have results but with empty/zero data
        assert result.has_data() is False or _all_metrics_empty(result)

        # Verify no fabricated numbers
        for metric_name, metric in result.metrics.items():
            if metric.data is not None:
                _assert_no_fabricated_data(metric_name, metric.data)

    @patch("status_query_executor.get_cursor")
    def test_no_sprint_returns_project_level(self, mock_get_cursor, executor, base_plan):
        """Query without sprint should return project-level data for core metrics"""
        mock_cursor = MagicMock()
        mock_cursor.fetchall.return_value = [{"status": "DONE", "count": 5}]
        mock_cursor.fetchone.return_value = {"done": 5, "total": 10, "rate": 50.0}
        mock_get_cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_get_cursor.return_value.__exit__ = MagicMock(return_value=False)

        base_plan.scope.sprint_id = None
        # Only test core metrics (blocked_items requires more complex mock)
        base_plan.metrics = ["story_counts_by_status", "completion_rate"]

        result = executor.execute(base_plan)

        # Should work without sprint_id
        assert len(result.errors) == 0

    @patch("status_query_executor.get_cursor")
    def test_empty_stories_table_safe_response(self, mock_get_cursor, executor, base_plan):
        """Empty user_stories table should return safe empty response"""
        mock_cursor = MagicMock()
        mock_cursor.fetchall.return_value = []
        mock_cursor.fetchone.return_value = {"done": 0, "total": 0, "rate": 0}
        mock_get_cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_get_cursor.return_value.__exit__ = MagicMock(return_value=False)

        result = executor.execute(base_plan)

        # story_counts should be empty
        counts = result.metrics.get("story_counts_by_status")
        if counts and counts.data:
            assert sum(counts.data.values()) == 0

        # completion_rate should be 0
        rate = result.metrics.get("completion_rate")
        if rate and rate.data:
            assert rate.data["rate"] == 0
            assert rate.data["total"] == 0

    def test_missing_project_id_rejected(self, executor):
        """Plan without project_id should be rejected"""
        plan = StatusQueryPlan(
            answer_type="test_no_project",
            scope=QueryScope(project_id=None),  # Missing!
            metrics=["completion_rate"],
            validated=True,
        )

        result = executor.execute(plan)

        # Should have error about missing project_id
        assert len(result.errors) > 0
        assert any("project_id" in err.lower() for err in result.errors)

    def test_unvalidated_plan_rejected(self, executor):
        """Unvalidated plan should be rejected"""
        plan = StatusQueryPlan(
            answer_type="test_unvalidated",
            scope=QueryScope(project_id="test-project"),
            metrics=["completion_rate"],
            validated=False,  # Not validated!
        )

        result = executor.execute(plan)

        assert len(result.errors) > 0
        assert any("not validated" in err.lower() for err in result.errors)


# =============================================================================
# Database Failure Scenarios
# =============================================================================

class TestDatabaseFailureScenarios:
    """Test safe handling of database failures"""

    @pytest.fixture
    def executor(self):
        return StatusQueryExecutor()

    @pytest.fixture
    def base_plan(self):
        return StatusQueryPlan(
            answer_type="test_db_failure",
            scope=QueryScope(project_id="test-project"),
            metrics=["story_counts_by_status", "completion_rate"],
            validated=True,
        )

    @patch("status_query_executor.get_cursor")
    def test_connection_failure_safe_response(self, mock_get_cursor, executor, base_plan):
        """Database connection failure should return error, not fabricated data"""
        mock_get_cursor.side_effect = OperationalError("Connection refused")

        result = executor.execute(base_plan)

        # Should have errors
        assert len(result.errors) > 0

        # Should NOT have any metric data
        for metric_name, metric in result.metrics.items():
            assert metric.data is None or metric.error is not None, \
                f"Metric {metric_name} should not have data after connection failure"

    @patch("status_query_executor.get_cursor")
    def test_query_error_safe_response(self, mock_get_cursor, executor, base_plan):
        """SQL query error should return error for that metric, not fabrication"""
        mock_cursor = MagicMock()

        def execute_with_error(query, params):
            if "GROUP BY status" in query:
                raise ProgrammingError("Syntax error in SQL")
            elif "FILTER (WHERE status" in query:
                return None  # This one succeeds
            mock_cursor._result = []

        mock_cursor.execute = execute_with_error
        mock_cursor.fetchone.return_value = {"done": 5, "total": 10, "rate": 50.0}
        mock_cursor.fetchall.return_value = []
        mock_get_cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_get_cursor.return_value.__exit__ = MagicMock(return_value=False)

        result = executor.execute(base_plan)

        # story_counts should have error
        counts_metric = result.metrics.get("story_counts_by_status")
        if counts_metric:
            assert counts_metric.error is not None or counts_metric.data is None

    @patch("status_query_executor.get_cursor")
    def test_timeout_safe_response(self, mock_get_cursor, executor, base_plan):
        """Query timeout should return error, not fabricated data"""
        mock_get_cursor.side_effect = OperationalError("Query timeout")

        result = executor.execute(base_plan)

        # Should have errors
        assert len(result.errors) > 0

        # Should NOT fabricate data
        assert not result.has_data() or all(
            m.error is not None for m in result.metrics.values()
        )


# =============================================================================
# Response Contract Safety Tests
# =============================================================================

class TestResponseContractSafety:
    """Test that response contract prevents hallucination"""

    def test_no_data_response_safe(self):
        """No data response should not contain fabricated numbers"""
        contract = create_no_data_response(
            project_id="test-project",
            reason="Project not found"
        )

        # Should be a StatusResponseContract
        assert isinstance(contract, StatusResponseContract)

        # Convert to text for content check
        response_text = contract.to_text()

        # Should have data gap reason
        assert "Project not found" in contract.data_gaps or len(contract.data_gaps) > 0

        # Should NOT have fabricated numbers
        assert contract.completion_rate is None
        assert contract.total_stories == 0
        assert contract.done_stories == 0
        assert len(contract.blocked_items) == 0
        assert len(contract.overdue_items) == 0

    def test_empty_result_contract_validation(self):
        """Empty StatusQueryResult should produce safe contract"""
        plan = StatusQueryPlan(
            answer_type="test",
            scope=QueryScope(project_id="test"),
            metrics=["completion_rate"],
            validated=True,
        )

        result = StatusQueryResult(plan=plan)
        # No metrics added - empty result

        contract = build_status_response(result, "test")

        # Should be a StatusResponseContract
        assert isinstance(contract, StatusResponseContract)

        # Contract should indicate no data via data_gaps or empty metrics
        assert len(contract.data_gaps) > 0 or contract.total_stories == 0

        # Should NOT have fabricated values
        assert contract.completion_rate is None or contract.completion_rate == 0
        assert contract.total_stories == 0

    def test_partial_failure_contract_safety(self):
        """Partial metric failure should not fabricate missing data"""
        plan = StatusQueryPlan(
            answer_type="test",
            scope=QueryScope(project_id="test"),
            metrics=["completion_rate", "story_counts_by_status"],
            validated=True,
        )

        result = StatusQueryResult(plan=plan)

        # Only completion_rate succeeds
        result.metrics["completion_rate"] = MetricResult(
            metric_name="completion_rate",
            data={"done": 5, "total": 10, "rate": 50.0},
            count=10,
        )

        # story_counts fails
        result.metrics["story_counts_by_status"] = MetricResult(
            metric_name="story_counts_by_status",
            data=None,
            error="Database error",
        )

        contract = build_status_response(result, "test")

        # Should be a StatusResponseContract
        assert isinstance(contract, StatusResponseContract)

        # Should show completion rate from successful metric
        assert contract.completion_rate == 50.0
        assert contract.done_stories == 5
        assert contract.total_stories == 10

        # story_counts_by_status should be empty (not fabricated)
        # Since that metric failed, it shouldn't populate story_counts_by_status
        assert contract.story_counts_by_status == {} or contract.story_counts_by_status is None


# =============================================================================
# Misclassification Safety Tests
# =============================================================================

class TestMisclassificationSafety:
    """Test that misclassification doesn't cause data fabrication"""

    def test_status_query_without_db_returns_empty(self):
        """Status query that can't reach DB should return empty, not fabrication"""
        # This tests the scenario where a query is correctly classified as STATUS
        # but database is unavailable

        executor = StatusQueryExecutor()
        plan = StatusQueryPlan(
            answer_type="get_progress",
            scope=QueryScope(project_id="test"),
            metrics=["completion_rate"],
            validated=True,
        )

        with patch("status_query_executor.get_cursor") as mock_cursor:
            mock_cursor.side_effect = Exception("DB unavailable")

            result = executor.execute(plan)

            # Should have errors, no data
            assert len(result.errors) > 0
            assert not result.has_data()


# =============================================================================
# Access Control Safety Tests
# =============================================================================

class TestAccessControlSafety:
    """Test that access control prevents data leakage"""

    @pytest.fixture
    def executor(self):
        return StatusQueryExecutor()

    @patch("status_query_executor.get_cursor")
    def test_project_id_always_filtered(self, mock_get_cursor, executor):
        """Every query should include project_id filter"""
        mock_cursor = MagicMock()
        queries_executed = []

        def capture_query(query, params):
            queries_executed.append((query, params))
            mock_cursor._result = []

        mock_cursor.execute = capture_query
        mock_cursor.fetchall.return_value = []
        mock_cursor.fetchone.return_value = {"done": 0, "total": 0, "rate": 0}
        mock_get_cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_get_cursor.return_value.__exit__ = MagicMock(return_value=False)

        plan = StatusQueryPlan(
            answer_type="test_project_filter",
            scope=QueryScope(project_id="test-project-123"),
            metrics=[
                "story_counts_by_status",
                "completion_rate",
                "blocked_items",
                "wip_status",
            ],
            validated=True,
        )

        executor.execute(plan)

        # Verify all queries include project_id filter
        for query, params in queries_executed:
            # Check that project_id is in params
            assert params and "test-project-123" in params, \
                f"Query missing project_id filter: {query[:100]}..."


# =============================================================================
# Helper Functions
# =============================================================================

def _all_metrics_empty(result: StatusQueryResult) -> bool:
    """Check if all metrics are empty"""
    for metric in result.metrics.values():
        if metric.data:
            if isinstance(metric.data, dict):
                if any(v for v in metric.data.values() if v and v != 0):
                    return False
            elif isinstance(metric.data, list):
                if len(metric.data) > 0:
                    return False
    return True


def _assert_no_fabricated_data(metric_name: str, data):
    """Assert that data doesn't contain suspicious fabricated values"""
    # Common LLM hallucination patterns for metrics
    SUSPICIOUS_PERCENTAGES = [32, 45, 67, 75, 80, 85, 90, 95]
    SUSPICIOUS_COUNTS = [10, 15, 20, 25, 30, 50, 100]

    if isinstance(data, dict):
        if "rate" in data and data.get("total", 0) == 0:
            # Can't have a rate if total is 0
            assert data["rate"] == 0, \
                f"{metric_name}: rate should be 0 when total is 0"

        if "done" in data and "total" in data:
            # Done can't exceed total
            assert data["done"] <= data["total"], \
                f"{metric_name}: done ({data['done']}) > total ({data['total']})"


def _assert_no_numbers_in_response(response: str):
    """Assert that response doesn't contain fabricated numbers"""
    import re

    # Check for percentage patterns
    percentages = re.findall(r'\d+\.?\d*%', response)
    for pct in percentages:
        # 0% is OK for empty data
        if pct != "0%" and pct != "0.0%":
            pytest.fail(f"Found percentage in no-data response: {pct}")

    # Check for count patterns like "5개", "10건"
    counts = re.findall(r'\d+\s*(개|건|명)', response)
    for count in counts:
        if not count.startswith("0"):
            pytest.fail(f"Found count in no-data response: {count}")


# =============================================================================
# Integration Tests
# =============================================================================

class TestEndToEndSafety:
    """End-to-end safety tests"""

    @patch("status_query_executor.get_cursor")
    def test_full_workflow_empty_project(self, mock_get_cursor):
        """Full workflow with empty project returns safe response"""
        mock_cursor = MagicMock()
        mock_cursor.fetchall.return_value = []
        mock_cursor.fetchone.return_value = None
        mock_get_cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_get_cursor.return_value.__exit__ = MagicMock(return_value=False)

        executor = StatusQueryExecutor()
        plan = StatusQueryPlan(
            answer_type="get_project_status",
            scope=QueryScope(project_id="empty-project"),
            metrics=["story_counts_by_status", "completion_rate", "active_sprint"],
            validated=True,
        )

        result = executor.execute(plan)

        # Should not crash
        assert result is not None

        # Should have no data (or safe empty values)
        if result.has_data():
            for metric_name, metric in result.metrics.items():
                if metric.data:
                    _assert_no_fabricated_data(metric_name, metric.data)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
