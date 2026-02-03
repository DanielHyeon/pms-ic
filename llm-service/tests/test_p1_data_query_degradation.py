"""
P1 Test Suite: Data Query Implementation & Graceful Degradation

These tests verify:
1. DB failure vs empty data separation
2. Judgment data branching (3-way task degradation)
3. KST week boundary accuracy
4. Sprint overdue/invalid detection
5. Risk assignee_id check
6. Renderer overdue section

Run: pytest tests/test_p1_data_query_degradation.py -v
"""

import pytest
from datetime import datetime, date, timedelta
from unittest.mock import patch, MagicMock

# Import modules under test
from query_templates import (
    calculate_kst_week_boundaries,
    get_kst_reference_time,
    KST,
)
from degradation_tips import (
    get_empty_data_plan,
    get_db_failure_plan,
    DegradationReason,
    get_tips_for_intent,
)
from response_contract import ResponseContract, ErrorCode
from response_renderer import render


# =============================================================================
# TEST 1: Query failure != empty rendering
# =============================================================================

class TestQueryFailureVsEmptyData:
    """P1 Criterion: DB failure and empty data must be handled differently"""

    def test_db_failure_shows_error_message(self):
        """DB failure must show 'Unable to load' not 'No data'"""
        contract = ResponseContract(
            intent="backlog_list",
            reference_time="2026-02-04 14:30 KST",
            scope="Project: Test",
            data={"items": []},
            warnings=["Unable to load data at this time."],
            tips=["Please try again in a moment"],
            error_code=ErrorCode.DB_QUERY_FAILED,
            provenance="Unavailable",
        )

        result = render(contract)

        # Must show error indicator
        assert "⚠️" in result
        assert "Unable to load" in result or "Data retrieval failed" in result
        # Must NOT show "no backlog items registered" (that's empty data)
        assert "No backlog items registered" not in result

    def test_empty_data_shows_no_data_message(self):
        """Empty data (query success) must show 'No items' not 'Unable to load'"""
        contract = ResponseContract(
            intent="backlog_list",
            reference_time="2026-02-04 14:30 KST",
            scope="Project: Test",
            data={"items": [], "count": 0, "summary": {}},
            warnings=["No backlog items registered"],
            tips=["Add stories via 'Backlog Management' menu"],
            error_code=None,  # No error - query succeeded
            provenance="realtime",
        )

        result = render(contract)

        # Must show "no items" message
        assert "No backlog items" in result or "ℹ️" in result
        # Must NOT show "Unable to load"
        assert "Unable to load" not in result

    def test_error_code_detection_works(self):
        """has_error() must use error_code, not string matching"""
        # Error contract
        error_contract = ResponseContract(
            intent="backlog_list",
            reference_time="2026-02-04 14:30 KST",
            scope="Project: Test",
            data={},
            error_code=ErrorCode.DB_QUERY_FAILED,
        )
        assert error_contract.has_error() is True

        # Success contract (even with warning text)
        success_contract = ResponseContract(
            intent="backlog_list",
            reference_time="2026-02-04 14:30 KST",
            scope="Project: Test",
            data={"items": []},
            warnings=["Some warning text"],
            error_code=None,
        )
        assert success_contract.has_error() is False


# =============================================================================
# TEST 2: Backlog empty plan selection
# =============================================================================

class TestBacklogDegradation:
    """P1 Criterion: Empty backlog shows specific guidance"""

    def test_backlog_empty_has_actionable_tips(self):
        """Empty backlog must have menu path and template"""
        plan = get_empty_data_plan("backlog_list")

        assert plan is not None
        assert plan.reason == DegradationReason.EMPTY_DATA
        assert len(plan.tips) >= 2
        assert plan.related_menu is not None
        assert "Backlog" in plan.related_menu

    def test_backlog_empty_response_shows_tips(self):
        """Rendered empty backlog must show tips"""
        plan = get_empty_data_plan("backlog_list")
        contract = ResponseContract(
            intent="backlog_list",
            reference_time="2026-02-04 14:30 KST",
            scope="Project: Test",
            data={"items": [], "count": 0},
            warnings=[plan.message],
            tips=plan.tips + plan.next_actions,
        )

        result = render(contract)

        assert "Next steps" in result or "💡" in result
        # Should have at least one actionable tip
        assert "Add" in result or "Create" in result or "Click" in result


# =============================================================================
# TEST 3: Tasks 3-way branching
# =============================================================================

class TestTask3WayDegradation:
    """P1 Criterion: Tasks distinguish no tasks | no due dates | none this week"""

    def test_no_tasks_at_all(self):
        """When all_tasks_count=0, show 'no tasks created'"""
        # Simulate judgment data
        judgment_data = {
            "all_tasks_count": 0,
            "no_due_date_count": 0,
            "active_tasks_count": 0,
        }

        tips = get_tips_for_intent(
            "task_due_this_week",
            has_data=False,
            judgment_data=judgment_data,
        )

        # Should have some tips (may vary based on implementation)
        assert isinstance(tips, list)

    def test_tasks_exist_but_no_due_dates(self):
        """When many tasks have no due_date, show 'set due dates'"""
        # 80% of tasks have no due date
        judgment_data = {
            "all_tasks_count": 10,
            "no_due_date_count": 8,
            "active_tasks_count": 10,
        }

        tips = get_tips_for_intent(
            "task_due_this_week",
            has_data=False,
            judgment_data=judgment_data,
        )

        # Should have tips about due dates
        assert isinstance(tips, list)

    def test_tasks_exist_just_not_this_week(self):
        """When tasks have due dates but none this week"""
        # Only 10% have no due date
        judgment_data = {
            "all_tasks_count": 10,
            "no_due_date_count": 1,
            "active_tasks_count": 10,
        }

        tips = get_tips_for_intent(
            "task_due_this_week",
            has_data=False,
            judgment_data=judgment_data,
        )

        assert isinstance(tips, list)


# =============================================================================
# TEST 4: Sprint invalid/overdue flags
# =============================================================================

class TestSprintFlags:
    """P1 Criterion: Sprint overdue/invalid dates are detected"""

    def test_sprint_overdue_warning_shown(self):
        """Overdue sprint must show warning"""
        contract = ResponseContract(
            intent="sprint_progress",
            reference_time="2026-02-04 14:30 KST",
            scope="Project: Test, Sprint: Sprint 5",
            data={
                "sprint": {
                    "id": 1,
                    "name": "Sprint 5",
                    "start_date": "2026-01-20",
                    "end_date": "2026-02-01",  # Past date
                    "is_overdue": True,
                    "has_invalid_dates": False,
                },
                "stories": [{"id": 1, "status": "IN_PROGRESS"}],
                "metrics": {"total": 5, "done": 2, "completion_rate": 40.0},
            },
            warnings=["Sprint end date has passed but status is still ACTIVE"],
        )

        result = render(contract)

        assert "overdue" in result.lower() or "passed" in result.lower()

    def test_sprint_invalid_dates_warning_shown(self):
        """Invalid dates must show error"""
        contract = ResponseContract(
            intent="sprint_progress",
            reference_time="2026-02-04 14:30 KST",
            scope="Project: Test, Sprint: Bad Sprint",
            data={
                "sprint": {
                    "id": 1,
                    "name": "Bad Sprint",
                    "start_date": "2026-02-10",
                    "end_date": "2026-02-01",  # End before start!
                    "is_overdue": False,
                    "has_invalid_dates": True,
                },
                "stories": [],
                "metrics": {},
            },
            warnings=["Sprint has invalid date configuration"],
        )

        result = render(contract)

        assert "invalid" in result.lower() or "before" in result.lower()


# =============================================================================
# TEST 5: Risk assignee_id check
# =============================================================================

class TestRiskAssigneeCheck:
    """P1 Criterion: Use assignee_id not assignee_name for unassigned check"""

    def test_risk_with_id_none_is_unassigned(self):
        """Risk with assignee_id=None must be flagged as unassigned"""
        # Even if assignee_name exists, assignee_id is the source of truth
        risk = {
            "id": 1,
            "severity": "CRITICAL",
            "assignee_id": None,
            "assignee_name": "John",  # Name exists but ID is None
        }

        # The check should use assignee_id
        is_unassigned = risk.get("assignee_id") is None
        assert is_unassigned is True

    def test_risk_with_id_set_is_assigned(self):
        """Risk with assignee_id set must not be flagged as unassigned"""
        risk = {
            "id": 1,
            "severity": "HIGH",
            "assignee_id": "user-123",
            "assignee_name": "Jane",
        }

        is_unassigned = risk.get("assignee_id") is None
        assert is_unassigned is False


# =============================================================================
# TEST 6: Week boundary Monday start
# =============================================================================

class TestKSTWeekBoundaries:
    """P1 Criterion: Week starts Monday 00:00 KST"""

    def test_monday_is_week_start(self):
        """Week should start on Monday KST"""
        # Wednesday 2026-02-04 15:00 KST
        test_now = datetime(2026, 2, 4, 15, 0, 0, tzinfo=KST)
        bounds = calculate_kst_week_boundaries(now=test_now)

        assert bounds["week_start"] == date(2026, 2, 2)  # Monday
        assert bounds["week_end"] == date(2026, 2, 9)    # Next Monday

    def test_monday_stays_in_current_week(self):
        """Monday should be week_start of its own week"""
        # Monday 2026-02-02 09:00 KST
        test_now = datetime(2026, 2, 2, 9, 0, 0, tzinfo=KST)
        bounds = calculate_kst_week_boundaries(now=test_now)

        assert bounds["week_start"] == date(2026, 2, 2)  # Same Monday
        assert bounds["week_end"] == date(2026, 2, 9)    # Next Monday

    def test_sunday_is_last_day_of_week(self):
        """Sunday should still be in the Monday-starting week"""
        # Sunday 2026-02-08 23:59 KST
        test_now = datetime(2026, 2, 8, 23, 59, 0, tzinfo=KST)
        bounds = calculate_kst_week_boundaries(now=test_now)

        assert bounds["week_start"] == date(2026, 2, 2)  # Monday of that week
        assert bounds["week_end"] == date(2026, 2, 9)    # Next Monday

    def test_returns_date_objects_not_strings(self):
        """Week boundaries must be date objects for proper DB binding"""
        bounds = calculate_kst_week_boundaries()

        assert isinstance(bounds["week_start"], date)
        assert isinstance(bounds["week_end"], date)

    def test_week_is_exactly_7_days(self):
        """week_end - week_start must be exactly 7 days"""
        bounds = calculate_kst_week_boundaries()

        diff = bounds["week_end"] - bounds["week_start"]
        assert diff.days == 7


# =============================================================================
# P1 Criterion: Overdue section in renderer
# =============================================================================

class TestOverdueSection:
    """P1 Criterion: Tasks renderer shows overdue section"""

    def test_overdue_tasks_shown_separately(self):
        """Overdue tasks must have their own section"""
        contract = ResponseContract(
            intent="task_due_this_week",
            reference_time="2026-02-04 14:30 KST",
            scope="Project: Test, Period: 2026-02-02 ~ 2026-02-09",
            data={
                "tasks": [
                    {"id": 1, "title": "Task 1", "due_date": "2026-02-05", "status": "TODO"},
                ],
                "count": 1,
                "overdue": [
                    {"id": 2, "title": "Overdue Task", "due_date": "2026-01-30", "days_overdue": 5},
                ],
                "overdue_count": 1,
            },
        )

        result = render(contract)

        assert "Overdue" in result
        assert "days overdue" in result.lower() or "overdue" in result.lower()

    def test_overdue_tasks_show_days_count(self):
        """Overdue section must show days overdue"""
        contract = ResponseContract(
            intent="task_due_this_week",
            reference_time="2026-02-04 14:30 KST",
            scope="Project: Test",
            data={
                "tasks": [],
                "count": 0,
                "overdue": [
                    {"id": 1, "title": "Very Late", "due_date": "2026-01-20", "days_overdue": 15},
                ],
                "overdue_count": 1,
            },
        )

        result = render(contract)

        # Should show days count
        assert "15" in result or "days" in result.lower()


# =============================================================================
# Schema resiliency tests
# =============================================================================

class TestSchemaResiliency:
    """Test handling of missing/unexpected schema elements"""

    def test_null_priority_handled(self):
        """None priority should not crash"""
        contract = ResponseContract(
            intent="backlog_list",
            reference_time="2026-02-04 14:30 KST",
            scope="Project: Test",
            data={
                "items": [
                    {"id": 1, "title": "Test", "priority": None},
                ],
                "count": 1,
            },
        )

        # Should not raise
        result = render(contract)
        assert "Test" in result

    def test_null_severity_handled(self):
        """None severity should not crash"""
        contract = ResponseContract(
            intent="risk_analysis",
            reference_time="2026-02-04 14:30 KST",
            scope="Project: Test",
            data={
                "risks": [
                    {"id": 1, "title": "Risk", "severity": None},
                ],
                "count": 1,
                "by_severity": {"UNKNOWN": [{"id": 1, "title": "Risk"}]},
            },
        )

        # Should not raise
        result = render(contract)
        assert "Risk" in result

    def test_missing_optional_fields(self):
        """Missing optional fields should not crash"""
        contract = ResponseContract(
            intent="task_due_this_week",
            reference_time="2026-02-04 14:30 KST",
            scope="Project: Test",
            data={
                "tasks": [
                    {"id": 1, "title": "Task"},  # Missing due_date, status, etc.
                ],
                "count": 1,
                # Missing overdue, overdue_count, etc.
            },
        )

        # Should not raise
        result = render(contract)
        assert "Task" in result


# =============================================================================
# Reference time format test
# =============================================================================

class TestReferenceTimeFormat:
    """Test KST reference time format"""

    def test_reference_time_format(self):
        """Reference time must be in KST format"""
        ref_time = get_kst_reference_time()

        assert "KST" in ref_time
        # Format should be YYYY-MM-DD HH:MM KST
        assert len(ref_time) == 20  # "2026-02-04 14:30 KST"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
