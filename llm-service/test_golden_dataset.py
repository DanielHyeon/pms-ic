"""
Golden Dataset Test for Status Query Engine.

Reference: docs/HALLUCINATION_VERIFICATION_PLAN.md - Phase 8-A

Tests that the Status Query Engine returns EXACT values matching
a pre-defined test dataset. This verifies data accuracy and
prevents any hallucinated/fabricated numbers.
"""

import pytest
from datetime import datetime, date, timedelta
from unittest.mock import patch, MagicMock
from dataclasses import dataclass
from typing import Dict, List, Any

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
)


# =============================================================================
# Golden Dataset Definition
# =============================================================================

GOLDEN_PROJECT_ID = "test-proj-001"
GOLDEN_SPRINT_ID = "test-sprint-001"


@dataclass
class GoldenStory:
    """Test story for golden dataset"""
    id: str
    title: str
    status: str
    sprint_id: str = None
    assignee_id: str = None
    story_points: int = 0
    priority: str = "MEDIUM"
    updated_at: datetime = None

    def __post_init__(self):
        if self.updated_at is None:
            self.updated_at = datetime.now()


# 20 stories with known status distribution
GOLDEN_STORIES = [
    # DONE: 5 stories
    GoldenStory(id="s1", title="User login", status="DONE", sprint_id=GOLDEN_SPRINT_ID, story_points=3),
    GoldenStory(id="s2", title="User logout", status="DONE", sprint_id=GOLDEN_SPRINT_ID, story_points=2),
    GoldenStory(id="s3", title="Password reset", status="DONE", sprint_id=GOLDEN_SPRINT_ID, story_points=5),
    GoldenStory(id="s4", title="Email verification", status="DONE", sprint_id=GOLDEN_SPRINT_ID, story_points=3),
    GoldenStory(id="s5", title="User profile view", status="DONE", sprint_id=GOLDEN_SPRINT_ID, story_points=2),

    # IN_PROGRESS: 4 stories
    GoldenStory(id="s6", title="Dashboard widget", status="IN_PROGRESS", sprint_id=GOLDEN_SPRINT_ID, story_points=5),
    GoldenStory(id="s7", title="Chart component", status="IN_PROGRESS", sprint_id=GOLDEN_SPRINT_ID, story_points=3),
    GoldenStory(id="s8", title="API integration", status="IN_PROGRESS", sprint_id=GOLDEN_SPRINT_ID, story_points=8),
    GoldenStory(id="s9", title="Search feature", status="IN_PROGRESS", sprint_id=GOLDEN_SPRINT_ID, story_points=5,
                updated_at=datetime.now() - timedelta(days=5)),  # Stale - potential blocked

    # REVIEW: 2 stories
    GoldenStory(id="s10", title="Export to PDF", status="REVIEW", sprint_id=GOLDEN_SPRINT_ID, story_points=3),
    GoldenStory(id="s11", title="Print report", status="REVIEW", sprint_id=GOLDEN_SPRINT_ID, story_points=2,
                updated_at=datetime.now() - timedelta(days=4)),  # Stale - potential blocked

    # READY: 3 stories
    GoldenStory(id="s12", title="Notification system", status="READY", sprint_id=GOLDEN_SPRINT_ID, story_points=5),
    GoldenStory(id="s13", title="Email templates", status="READY", sprint_id=GOLDEN_SPRINT_ID, story_points=3),
    GoldenStory(id="s14", title="SMS gateway", status="READY", sprint_id=GOLDEN_SPRINT_ID, story_points=5),

    # IN_SPRINT: 2 stories
    GoldenStory(id="s15", title="Admin panel", status="IN_SPRINT", sprint_id=GOLDEN_SPRINT_ID, story_points=8),
    GoldenStory(id="s16", title="User management", status="IN_SPRINT", sprint_id=GOLDEN_SPRINT_ID, story_points=5),

    # IDEA: 2 stories (backlog)
    GoldenStory(id="s17", title="AI assistant", status="IDEA", story_points=13),
    GoldenStory(id="s18", title="Mobile app", status="IDEA", story_points=21),

    # CANCELLED: 2 stories (excluded from completion rate)
    GoldenStory(id="s19", title="Legacy feature X", status="CANCELLED", sprint_id=GOLDEN_SPRINT_ID, story_points=5),
    GoldenStory(id="s20", title="Deprecated API", status="CANCELLED", sprint_id=GOLDEN_SPRINT_ID, story_points=3),
]


# Expected metrics (hand-calculated)
EXPECTED_METRICS = {
    "story_counts_by_status": {
        # All 20 stories by status
        "DONE": 5,
        "IN_PROGRESS": 4,
        "REVIEW": 2,
        "READY": 3,
        "IN_SPRINT": 2,
        "IDEA": 2,
        "CANCELLED": 2,
    },
    "story_counts_by_status_sprint_only": {
        # Only sprint stories (18, excluding IDEA stories without sprint)
        "DONE": 5,
        "IN_PROGRESS": 4,
        "REVIEW": 2,
        "READY": 3,
        "IN_SPRINT": 2,
        "CANCELLED": 2,
    },
    "completion_rate": {
        # DONE=5, total excluding CANCELLED = 20-2 = 18
        # Rate = 5/18 * 100 = 27.8%
        "done": 5,
        "total": 18,
        "rate": 27.8,
    },
    "completion_rate_sprint_only": {
        # Sprint has 18 stories total (s1-s16 + s19-s20)
        # Excluding CANCELLED (s19, s20) = 16 stories
        # DONE = 5
        # Rate = 5/16 * 100 = 31.25 → round(31.25, 1) = 31.2
        "done": 5,
        "total": 16,
        "rate": 31.2,
    },
    "blocked_items": {
        # Stories IN_PROGRESS or REVIEW with updated_at > 3 days ago
        "count": 2,  # s9 (Search feature) and s11 (Print report)
        "ids": ["s9", "s11"],
    },
    "wip_status": {
        # IN_PROGRESS count = 4
        "wip_count": 4,
    },
}


# =============================================================================
# Mock Database Helper
# =============================================================================

def create_mock_cursor_for_golden_dataset():
    """Create a mock cursor that returns golden dataset data"""
    mock_cursor = MagicMock()

    def mock_execute(query, params):
        # Store query for inspection
        mock_cursor.last_query = query
        mock_cursor.last_params = params

        project_id = params[0] if params else None

        # Match query pattern and return appropriate data
        if "GROUP BY status" in query:
            # story_counts_by_status
            sprint_id = params[1] if len(params) > 1 else None

            if sprint_id:
                # Filter by sprint
                counts = {}
                for story in GOLDEN_STORIES:
                    if story.sprint_id == sprint_id:
                        counts[story.status] = counts.get(story.status, 0) + 1
            else:
                # All project stories
                counts = {}
                for story in GOLDEN_STORIES:
                    counts[story.status] = counts.get(story.status, 0) + 1

            mock_cursor._result = [
                {"status": status, "count": count}
                for status, count in counts.items()
            ]

        elif "FILTER (WHERE status = 'DONE')" in query:
            # completion_rate
            sprint_id = params[1] if len(params) > 1 else None

            stories = GOLDEN_STORIES
            if sprint_id:
                stories = [s for s in stories if s.sprint_id == sprint_id]

            # Exclude CANCELLED
            active_stories = [s for s in stories if s.status != "CANCELLED"]
            done_stories = [s for s in active_stories if s.status == "DONE"]

            done = len(done_stories)
            total = len(active_stories)
            rate = round(100.0 * done / total, 1) if total > 0 else 0

            mock_cursor._result = [{"done": done, "total": total, "rate": rate}]

        elif "updated_at < NOW() - INTERVAL '3 days'" in query:
            # blocked_items
            blocked = [
                s for s in GOLDEN_STORIES
                if s.status in ("IN_PROGRESS", "REVIEW")
                and s.updated_at < datetime.now() - timedelta(days=3)
            ]
            mock_cursor._result = [
                {
                    "id": s.id,
                    "title": s.title,
                    "status": s.status,
                    "assignee_id": s.assignee_id,
                    "updated_at": s.updated_at,
                    "priority": s.priority,
                }
                for s in blocked
            ]

        elif "status = 'IN_PROGRESS'" in query and "COUNT(*)" in query:
            # wip_status (wip_count)
            wip_count = len([s for s in GOLDEN_STORIES if s.status == "IN_PROGRESS"])
            mock_cursor._result = [{"wip_count": wip_count}]

        elif "conwip_limit" in query:
            # wip_status (limit)
            mock_cursor._result = [{"conwip_limit": 5}]

        elif "task.sprints" in query and "status = 'ACTIVE'" in query:
            # active_sprint
            mock_cursor._result = [{
                "id": GOLDEN_SPRINT_ID,
                "name": "Test Sprint 1",
                "goal": "Complete core features",
                "status": "ACTIVE",
                "start_date": date.today() - timedelta(days=7),
                "end_date": date.today() + timedelta(days=7),
                "conwip_limit": 5,
            }]

        elif "project.projects" in query:
            # project_summary
            mock_cursor._result = [{
                "id": GOLDEN_PROJECT_ID,
                "name": "Test Project",
                "description": "Golden dataset test project",
                "status": "ACTIVE",
                "progress": 25,
                "start_date": date.today() - timedelta(days=30),
                "end_date": date.today() + timedelta(days=60),
            }]

        else:
            mock_cursor._result = []

    def mock_fetchall():
        return mock_cursor._result

    def mock_fetchone():
        return mock_cursor._result[0] if mock_cursor._result else None

    mock_cursor.execute = mock_execute
    mock_cursor.fetchall = mock_fetchall
    mock_cursor.fetchone = mock_fetchone
    mock_cursor._result = []

    return mock_cursor


# =============================================================================
# Test Cases
# =============================================================================

class TestGoldenDatasetAccuracy:
    """Verify engine returns exact values matching golden dataset"""

    @pytest.fixture
    def executor(self):
        return StatusQueryExecutor()

    @pytest.fixture
    def base_plan(self):
        """Base plan for golden dataset tests"""
        return StatusQueryPlan(
            answer_type="test_golden_dataset",
            scope=QueryScope(
                project_id=GOLDEN_PROJECT_ID,
                sprint_id=None,
            ),
            metrics=[],
            time_range=TimeRange(),
            filters=QueryFilters(),
            output=OutputConfig(),
            validated=True,
        )

    @patch("status_query_executor.get_cursor")
    def test_story_counts_by_status_exact_match(self, mock_get_cursor, executor, base_plan):
        """Verify story_counts_by_status returns exact counts"""
        mock_cursor = create_mock_cursor_for_golden_dataset()
        mock_get_cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_get_cursor.return_value.__exit__ = MagicMock(return_value=False)

        base_plan.metrics = ["story_counts_by_status"]
        result = executor.execute(base_plan)

        assert "story_counts_by_status" in result.metrics
        metric = result.metrics["story_counts_by_status"]

        # Verify exact counts
        expected = EXPECTED_METRICS["story_counts_by_status"]
        for status, expected_count in expected.items():
            actual_count = metric.data.get(status, 0)
            assert actual_count == expected_count, \
                f"Status {status}: expected {expected_count}, got {actual_count}"

        # Verify total
        assert metric.count == 20, f"Total count: expected 20, got {metric.count}"

    @patch("status_query_executor.get_cursor")
    def test_completion_rate_exact_match(self, mock_get_cursor, executor, base_plan):
        """Verify completion_rate matches hand-calculated value"""
        mock_cursor = create_mock_cursor_for_golden_dataset()
        mock_get_cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_get_cursor.return_value.__exit__ = MagicMock(return_value=False)

        base_plan.metrics = ["completion_rate"]
        result = executor.execute(base_plan)

        assert "completion_rate" in result.metrics
        metric = result.metrics["completion_rate"]

        expected = EXPECTED_METRICS["completion_rate"]

        # Verify exact values
        assert metric.data["done"] == expected["done"], \
            f"Done count: expected {expected['done']}, got {metric.data['done']}"
        assert metric.data["total"] == expected["total"], \
            f"Total count: expected {expected['total']}, got {metric.data['total']}"
        assert metric.data["rate"] == expected["rate"], \
            f"Rate: expected {expected['rate']}, got {metric.data['rate']}"

    @patch("status_query_executor.get_cursor")
    def test_completion_rate_sprint_scope_exact_match(self, mock_get_cursor, executor, base_plan):
        """Verify completion_rate with sprint scope"""
        mock_cursor = create_mock_cursor_for_golden_dataset()
        mock_get_cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_get_cursor.return_value.__exit__ = MagicMock(return_value=False)

        base_plan.scope.sprint_id = GOLDEN_SPRINT_ID
        base_plan.metrics = ["completion_rate"]
        result = executor.execute(base_plan)

        assert "completion_rate" in result.metrics
        metric = result.metrics["completion_rate"]

        expected = EXPECTED_METRICS["completion_rate_sprint_only"]

        assert metric.data["done"] == expected["done"], \
            f"Done count: expected {expected['done']}, got {metric.data['done']}"
        assert metric.data["total"] == expected["total"], \
            f"Total count: expected {expected['total']}, got {metric.data['total']}"
        assert metric.data["rate"] == expected["rate"], \
            f"Rate: expected {expected['rate']}, got {metric.data['rate']}"

    @patch("status_query_executor.get_cursor")
    def test_blocked_items_exact_match(self, mock_get_cursor, executor, base_plan):
        """Verify blocked_items returns exact stale stories"""
        mock_cursor = create_mock_cursor_for_golden_dataset()
        mock_get_cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_get_cursor.return_value.__exit__ = MagicMock(return_value=False)

        base_plan.metrics = ["blocked_items"]
        result = executor.execute(base_plan)

        assert "blocked_items" in result.metrics
        metric = result.metrics["blocked_items"]

        expected = EXPECTED_METRICS["blocked_items"]

        assert metric.count == expected["count"], \
            f"Blocked count: expected {expected['count']}, got {metric.count}"

        # Verify specific blocked items
        blocked_ids = [item["id"] for item in metric.data]
        for expected_id in expected["ids"]:
            assert expected_id in blocked_ids, \
                f"Expected blocked item {expected_id} not found"

    @patch("status_query_executor.get_cursor")
    def test_wip_status_exact_match(self, mock_get_cursor, executor, base_plan):
        """Verify WIP status returns exact count"""
        mock_cursor = create_mock_cursor_for_golden_dataset()
        mock_get_cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_get_cursor.return_value.__exit__ = MagicMock(return_value=False)

        base_plan.metrics = ["wip_status"]
        result = executor.execute(base_plan)

        assert "wip_status" in result.metrics
        metric = result.metrics["wip_status"]

        expected = EXPECTED_METRICS["wip_status"]

        assert metric.data["wip_count"] == expected["wip_count"], \
            f"WIP count: expected {expected['wip_count']}, got {metric.data['wip_count']}"

    @patch("status_query_executor.get_cursor")
    def test_all_metrics_together(self, mock_get_cursor, executor, base_plan):
        """Verify all metrics return correct values when queried together"""
        mock_cursor = create_mock_cursor_for_golden_dataset()
        mock_get_cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_get_cursor.return_value.__exit__ = MagicMock(return_value=False)

        base_plan.metrics = [
            "story_counts_by_status",
            "completion_rate",
            "blocked_items",
            "wip_status",
        ]
        result = executor.execute(base_plan)

        # Verify all metrics present
        assert len(result.metrics) == 4

        # Verify no errors
        assert len(result.errors) == 0, f"Unexpected errors: {result.errors}"

        # Verify has data
        assert result.has_data()


class TestNoFabricatedNumbers:
    """Ensure no fabricated numbers appear in results"""

    @pytest.fixture
    def executor(self):
        return StatusQueryExecutor()

    @patch("status_query_executor.get_cursor")
    def test_empty_result_no_fabrication(self, mock_get_cursor, executor):
        """Empty DB should return zeros, not fabricated numbers"""
        mock_cursor = MagicMock()
        mock_cursor.fetchall.return_value = []
        mock_cursor.fetchone.return_value = {"done": 0, "total": 0, "rate": 0}
        mock_get_cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_get_cursor.return_value.__exit__ = MagicMock(return_value=False)

        plan = StatusQueryPlan(
            answer_type="test_empty",
            scope=QueryScope(project_id="empty-project"),
            metrics=["story_counts_by_status", "completion_rate"],
            validated=True,
        )

        result = executor.execute(plan)

        # story_counts should be empty dict or all zeros
        counts = result.metrics["story_counts_by_status"].data
        assert counts == {} or all(v == 0 for v in counts.values()), \
            f"Expected empty/zero counts, got {counts}"

        # completion_rate should be 0
        rate_data = result.metrics["completion_rate"].data
        assert rate_data["rate"] == 0, f"Expected rate 0, got {rate_data['rate']}"
        assert rate_data["total"] == 0, f"Expected total 0, got {rate_data['total']}"

    @patch("status_query_executor.get_cursor")
    def test_common_hallucinated_values_not_present(self, mock_get_cursor, executor):
        """Check that common hallucination values don't appear falsely"""
        # Common hallucinated percentages: 32%, 45%, 67%, 75%, 80%, 85%
        HALLUCINATION_TRAP_VALUES = [32.0, 45.0, 67.0, 75.0, 80.0, 85.0, 90.0, 95.0]

        mock_cursor = create_mock_cursor_for_golden_dataset()
        mock_get_cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_get_cursor.return_value.__exit__ = MagicMock(return_value=False)

        plan = StatusQueryPlan(
            answer_type="test_no_hallucination",
            scope=QueryScope(project_id=GOLDEN_PROJECT_ID),
            metrics=["completion_rate"],
            validated=True,
        )

        result = executor.execute(plan)

        actual_rate = result.metrics["completion_rate"].data["rate"]
        expected_rate = EXPECTED_METRICS["completion_rate"]["rate"]

        # Must match expected, not any common hallucinated value
        assert actual_rate == expected_rate, \
            f"Rate {actual_rate} doesn't match expected {expected_rate}"

        if actual_rate not in HALLUCINATION_TRAP_VALUES:
            # Good - actual rate is not a common hallucination
            pass
        else:
            # If actual rate happens to match a trap value, verify it's correct
            assert actual_rate == expected_rate, \
                f"Rate {actual_rate} matches hallucination trap but calculation is wrong"


class TestDataConsistency:
    """Verify data consistency across related metrics"""

    @pytest.fixture
    def executor(self):
        return StatusQueryExecutor()

    @patch("status_query_executor.get_cursor")
    def test_story_counts_sum_consistency(self, mock_get_cursor, executor):
        """Total from story_counts should equal sum of individual statuses"""
        mock_cursor = create_mock_cursor_for_golden_dataset()
        mock_get_cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_get_cursor.return_value.__exit__ = MagicMock(return_value=False)

        plan = StatusQueryPlan(
            answer_type="test_consistency",
            scope=QueryScope(project_id=GOLDEN_PROJECT_ID),
            metrics=["story_counts_by_status"],
            validated=True,
        )

        result = executor.execute(plan)

        metric = result.metrics["story_counts_by_status"]

        # Sum of all status counts should equal total count
        sum_of_statuses = sum(metric.data.values())
        assert sum_of_statuses == metric.count, \
            f"Sum of statuses ({sum_of_statuses}) != total count ({metric.count})"

    @patch("status_query_executor.get_cursor")
    def test_completion_rate_math_consistency(self, mock_get_cursor, executor):
        """Completion rate calculation should be mathematically correct"""
        mock_cursor = create_mock_cursor_for_golden_dataset()
        mock_get_cursor.return_value.__enter__ = MagicMock(return_value=mock_cursor)
        mock_get_cursor.return_value.__exit__ = MagicMock(return_value=False)

        plan = StatusQueryPlan(
            answer_type="test_math",
            scope=QueryScope(project_id=GOLDEN_PROJECT_ID),
            metrics=["completion_rate"],
            validated=True,
        )

        result = executor.execute(plan)

        data = result.metrics["completion_rate"].data

        # Verify: rate = done / total * 100
        if data["total"] > 0:
            expected_rate = round(100.0 * data["done"] / data["total"], 1)
            assert data["rate"] == expected_rate, \
                f"Rate calculation wrong: {data['done']}/{data['total']} should be {expected_rate}, got {data['rate']}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
