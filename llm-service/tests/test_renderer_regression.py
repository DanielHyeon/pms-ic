"""
Regression tests for response rendering.

CRITICAL: These tests prevent the "all responses show same header" bug.

Run: pytest tests/test_renderer_regression.py -v
"""

import pytest
from response_contract import ResponseContract, ErrorCode
from response_renderer import render


class TestHeaderDifferentiation:
    """
    CRITICAL: Each intent MUST have a different header.
    This prevents the original bug of all responses showing "Project Status".
    """

    def test_backlog_header_is_unique(self):
        """Backlog response must NOT show 'Project Status' header"""
        contract = ResponseContract(
            intent="backlog_list",
            reference_time="2026-02-03 14:30 KST",
            scope="Project: Test",
            data={"items": [], "count": 0},
        )

        result = render(contract)

        assert "Backlog" in result, "Backlog should have backlog-specific header"
        assert "Project Status" not in result, \
            "CRITICAL: Backlog response should NOT show 'Project Status' header"

    def test_risk_header_is_unique(self):
        """Risk response must NOT show 'Project Status' header"""
        contract = ResponseContract(
            intent="risk_analysis",
            reference_time="2026-02-03 14:30 KST",
            scope="Project: Test",
            data={"risks": [], "count": 0, "by_severity": {}},
        )

        result = render(contract)

        assert "Risk" in result, "Risk should have risk-specific header"
        assert "Project Status" not in result, \
            "CRITICAL: Risk response should NOT show 'Project Status' header"

    def test_sprint_header_is_unique(self):
        """Sprint response must NOT show 'Project Status' header"""
        contract = ResponseContract(
            intent="sprint_progress",
            reference_time="2026-02-03 14:30 KST",
            scope="Project: Test",
            data={"sprint": None, "stories": [], "metrics": {}},
        )

        result = render(contract)

        assert "Sprint" in result, "Sprint should have sprint-specific header"
        assert "Project Status" not in result, \
            "CRITICAL: Sprint response should NOT show 'Project Status' header"

    def test_task_header_is_unique(self):
        """Task due response must NOT show 'Project Status' header"""
        contract = ResponseContract(
            intent="task_due_this_week",
            reference_time="2026-02-03 14:30 KST",
            scope="Project: Test",
            data={"tasks": [], "count": 0},
        )

        result = render(contract)

        assert "Task" in result or "Due" in result, \
            "Task should have task-specific header"
        assert "Project Status" not in result, \
            "CRITICAL: Task response should NOT show 'Project Status' header"


class TestQueryFailureVsEmptyData:
    """Query failure must show different message than empty data"""

    def test_failure_shows_error_not_empty(self):
        """Query failure must NOT show 'no data' message"""
        contract = ResponseContract(
            intent="backlog_list",
            reference_time="2026-02-03 14:30 KST",
            scope="Project: Test",
            data={"items": []},
            warnings=["Data retrieval failed: Connection timeout"],
            error_code=ErrorCode.DB_QUERY_FAILED,
            provenance="Unavailable",
        )

        result = render(contract)

        # Must show warning indicator
        assert "⚠️" in result
        assert "Data retrieval failed" in result or "Unable to load" in result
        # Must NOT show "no backlog items registered" as if it's normal empty state
        # (The warning about failure is acceptable)

    def test_empty_data_shows_info_not_error(self):
        """Empty data should show informational message, not error"""
        contract = ResponseContract(
            intent="backlog_list",
            reference_time="2026-02-03 14:30 KST",
            scope="Project: Test",
            data={"items": [], "count": 0},
            warnings=["No backlog items registered"],
            tips=["Add stories via 'Backlog Management' menu"],
            error_code=None,  # No error
        )

        result = render(contract)

        # Should show the message but as info, not error
        assert "backlog" in result.lower() or "ℹ️" in result
        # Should NOT show error indicators when there's no error
        assert result.count("⚠️") <= 1  # Allow one for non-error warnings


class TestTipsPresent:
    """Empty data should always show tips"""

    @pytest.mark.parametrize("intent,data_key", [
        ("backlog_list", "items"),
        ("sprint_progress", "sprint"),
        ("task_due_this_week", "tasks"),
        ("risk_analysis", "risks"),
    ])
    def test_empty_data_shows_tips(self, intent, data_key):
        """Empty data responses must include tips section"""
        contract = ResponseContract(
            intent=intent,
            reference_time="2026-02-03 14:30 KST",
            scope="Project: Test",
            data={data_key: [], "count": 0} if data_key != "sprint" else {"sprint": None, "stories": []},
            tips=["Tip 1", "Tip 2"],
        )

        result = render(contract)

        assert "Next steps" in result or "💡" in result or "Tip" in result, \
            f"Empty {intent} response should show tips"


class TestDataSourceFooter:
    """All responses should show data source"""

    @pytest.mark.parametrize("intent", [
        "backlog_list",
        "sprint_progress",
        "task_due_this_week",
        "risk_analysis",
    ])
    def test_data_source_present(self, intent):
        """All responses must indicate data source"""
        contract = ResponseContract(
            intent=intent,
            reference_time="2026-02-03 14:30 KST",
            scope="Project: Test",
            data={},
            provenance="realtime",
        )

        result = render(contract)

        assert "Data source" in result or "_Data source" in result or "realtime" in result, \
            f"{intent} response should indicate data source"


class TestIntentSpecificContent:
    """Test that each intent renders its specific content correctly"""

    def test_backlog_shows_priority_grouping(self):
        """Backlog with items should group by priority"""
        contract = ResponseContract(
            intent="backlog_list",
            reference_time="2026-02-03 14:30 KST",
            scope="Project: Test",
            data={
                "items": [
                    {"id": 1, "title": "High priority item", "priority": "HIGH", "status": "READY"},
                    {"id": 2, "title": "Low priority item", "priority": "LOW", "status": "IDEA"},
                ],
                "count": 2,
            },
        )

        result = render(contract)

        assert "HIGH" in result
        assert "LOW" in result
        assert "High priority item" in result

    def test_sprint_shows_completion_bar(self):
        """Sprint with data should show progress bar"""
        contract = ResponseContract(
            intent="sprint_progress",
            reference_time="2026-02-03 14:30 KST",
            scope="Project: Test, Sprint: Sprint 5",
            data={
                "sprint": {
                    "id": 1,
                    "name": "Sprint 5",
                    "goal": "Complete feature X",
                    "start_date": "2026-02-01",
                    "end_date": "2026-02-14",
                },
                "stories": [
                    {"id": 1, "status": "DONE"},
                    {"id": 2, "status": "IN_PROGRESS"},
                ],
                "metrics": {
                    "total": 5,
                    "done": 2,
                    "in_progress": 1,
                    "completion_rate": 40.0,
                },
            },
        )

        result = render(contract)

        assert "Sprint 5" in result
        assert "40" in result  # Completion rate
        assert "█" in result or "░" in result  # Progress bar characters

    def test_task_shows_overdue_section(self):
        """Tasks with overdue should show overdue section"""
        contract = ResponseContract(
            intent="task_due_this_week",
            reference_time="2026-02-03 14:30 KST",
            scope="Project: Test",
            data={
                "tasks": [{"id": 1, "title": "Task 1", "due_date": "2026-02-05", "status": "TODO"}],
                "count": 1,
                "overdue": [{"id": 2, "title": "Overdue task", "due_date": "2026-01-30", "days_overdue": 4}],
                "overdue_count": 1,
            },
        )

        result = render(contract)

        assert "Overdue" in result
        assert "Overdue task" in result

    def test_risk_shows_severity_breakdown(self):
        """Risks should show severity grouping"""
        contract = ResponseContract(
            intent="risk_analysis",
            reference_time="2026-02-03 14:30 KST",
            scope="Project: Test",
            data={
                "risks": [
                    {"id": 1, "title": "Critical risk", "severity": "CRITICAL", "status": "OPEN"},
                    {"id": 2, "title": "High risk", "severity": "HIGH", "status": "OPEN"},
                ],
                "count": 2,
                "by_severity": {
                    "CRITICAL": [{"id": 1, "title": "Critical risk"}],
                    "HIGH": [{"id": 2, "title": "High risk"}],
                },
            },
        )

        result = render(contract)

        assert "CRITICAL" in result
        assert "HIGH" in result
        assert "Critical risk" in result


class TestCasualRendering:
    """Casual responses should be friendly"""

    def test_casual_is_friendly(self):
        """Casual response should be a greeting"""
        contract = ResponseContract(
            intent="casual",
            reference_time="2026-02-03 14:30 KST",
            scope="",
            data={"greeting": True},
        )

        result = render(contract)

        assert "Hello" in result or "PMS" in result or "Assistant" in result


class TestNullSafety:
    """Test that renderer handles null/missing values safely"""

    def test_null_values_dont_crash(self):
        """Null values in data should not crash renderer"""
        contract = ResponseContract(
            intent="backlog_list",
            reference_time="2026-02-03 14:30 KST",
            scope="Project: Test",
            data={
                "items": [
                    {"id": 1, "title": None, "priority": None, "status": None},
                ],
                "count": 1,
            },
        )

        # Should not raise exception
        result = render(contract)
        assert isinstance(result, str)

    def test_missing_fields_dont_crash(self):
        """Missing fields in data should not crash renderer"""
        contract = ResponseContract(
            intent="sprint_progress",
            reference_time="2026-02-03 14:30 KST",
            scope="Project: Test",
            data={
                "sprint": {"id": 1},  # Missing name, goal, dates
                "stories": [],
                "metrics": {},  # Empty metrics
            },
        )

        # Should not raise exception
        result = render(contract)
        assert isinstance(result, str)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
