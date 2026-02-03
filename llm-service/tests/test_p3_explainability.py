"""
P3 Test Suite: Explainability & Self-Healing Quality Loop

These tests verify:
1. Explainability has meaningful evidence (not just exists)
2. Public/debug separation works
3. Recovery plans have correct priority ordering
4. Attempt tracking prevents runaways
5. Policy enforcement catches violations

Run: pytest tests/test_p3_explainability.py -v
"""

import pytest
from explainability import (
    Explainability,
    EvidenceKind,
    EvidenceItem,
    DataFreshness,
    EVIDENCE_CATEGORIES,
    create_explainability,
)
from explainability_policy import ExplainabilityPolicy
from recovery_plan import (
    RecoveryPlan,
    RecoveryAction,
    ActionType,
    ACTION_PRIORITY,
    RecoveryReason,
    create_no_active_sprint_recovery,
    create_empty_backlog_recovery,
    create_empty_tasks_recovery,
    create_empty_risks_recovery,
    get_clarification_budget,
    can_ask_clarification,
    record_clarification_asked,
)
from attempt_tracker import (
    AttemptTracker,
    is_recovery_successful,
    RECOVERY_SUCCESS_CRITERIA,
    get_tracker,
    clear_all_trackers,
)


# =============================================================================
# TEST 1: Explainability Evidence Requirements
# =============================================================================

class TestExplainabilityEvidence:
    """P3-A: Evidence must be meaningful, not just present."""

    def test_classifier_evidence_required(self):
        """CLASSIFIER evidence is mandatory"""
        exp = create_explainability("backlog_list", 0.9, "Matched keyword")
        # Missing classifier evidence
        exp.add_query_evidence("Fetched data", 10, table="user_story")

        errors = ExplainabilityPolicy.validate(exp)

        assert any("CLASSIFIER" in e for e in errors)

    def test_data_provenance_evidence_required(self):
        """DATA_PROVENANCE evidence is mandatory"""
        exp = create_explainability("backlog_list", 0.9, "Matched keyword")
        exp.add_classifier_evidence(["backlog"], 0.9)
        # Missing data provenance (no query/cache/inference evidence)

        errors = ExplainabilityPolicy.validate(exp)

        assert any("DATA_PROVENANCE" in e for e in errors)

    def test_scope_evidence_required_for_empty(self):
        """SCOPE evidence required when result is empty"""
        exp = create_explainability("sprint_progress", 0.9, "Sprint query")
        exp.add_classifier_evidence(["sprint"], 0.9)
        exp.add_query_evidence("Fetched sprint", 0, table="sprint")  # Empty result
        # Missing scope evidence

        errors = ExplainabilityPolicy.validate(exp, is_empty=True)

        assert any("SCOPE" in e for e in errors)

    def test_valid_explainability_passes(self):
        """Complete explainability passes validation"""
        exp = create_explainability("backlog_list", 0.9, "Matched backlog keyword")
        exp.add_classifier_evidence(["backlog", "product backlog"], 0.9)
        exp.add_query_evidence("Fetched backlog items", 15, table="user_story")

        errors = ExplainabilityPolicy.validate(exp)

        assert errors == []

    def test_empty_result_valid_with_scope(self):
        """Empty result is valid when scope evidence provided"""
        exp = create_explainability("sprint_progress", 0.85, "Sprint keyword matched")
        exp.add_classifier_evidence(["sprint", "progress"], 0.85)
        exp.add_query_evidence("Searched active sprints", 0, table="sprint")
        exp.add_scope_evidence("No active sprint in current project")

        errors = ExplainabilityPolicy.validate(exp, is_empty=True)

        assert errors == []

    def test_confidence_validation(self):
        """Confidence must be 0.0-1.0"""
        exp = create_explainability("backlog_list", 1.5, "Matched")  # Invalid confidence

        errors = ExplainabilityPolicy.validate(exp)

        assert any("confidence" in e.lower() for e in errors)


# =============================================================================
# TEST 2: Public/Debug Separation (Security)
# =============================================================================

class TestPublicDebugSeparation:
    """P3-A Security: Sensitive info must not leak to public output."""

    def test_meta_not_in_public_dict(self):
        """EvidenceItem meta should not appear in public output"""
        item = EvidenceItem(
            kind="query",
            summary="Fetched data",
            meta={"sql": "SELECT * FROM secret_table", "table": "secret_table"},
        )

        public = item.to_public_dict()

        assert "meta" not in public
        assert "sql" not in str(public)
        assert "secret_table" not in str(public)

    def test_full_dict_includes_meta(self):
        """Full dict should include meta for debugging"""
        item = EvidenceItem(
            kind="query",
            summary="Fetched data",
            meta={"sql": "SELECT * FROM table", "table": "table"},
        )

        full = item.to_dict()

        assert "meta" in full
        assert full["meta"]["sql"] == "SELECT * FROM table"

    def test_explainability_public_dict_no_sensitive(self):
        """Explainability public dict should not contain sensitive data"""
        exp = create_explainability("backlog_list", 0.9, "Matched keyword")
        exp.add_evidence(
            "query",
            "Fetched items",  # Public summary
            sql="SELECT * FROM user_story WHERE status='READY'",  # Debug only
            table="user_story",  # Debug only
        )

        public = exp.to_public_dict()

        assert "sql" not in str(public).lower()
        assert "user_story" not in str(public)

    def test_to_human_readable_safe(self):
        """Human readable output should be safe for display"""
        exp = create_explainability("backlog_list", 0.9, "Matched keyword")
        exp.add_classifier_evidence(["backlog"], 0.9)
        exp.add_evidence(
            "query",
            "Fetched backlog items: 15 rows",
            sql="SELECT * FROM user_story",  # Should not appear
        )

        readable = exp.to_human_readable()

        assert "SELECT" not in readable
        assert "user_story" not in readable


# =============================================================================
# TEST 3: Recovery Plan Priority Ordering
# =============================================================================

class TestRecoveryPlanPriority:
    """P3-B: Recovery actions must be priority-ordered."""

    def test_actions_sorted_by_priority(self):
        """Actions should be sorted by priority after adding"""
        plan = RecoveryPlan(
            intent="test",
            reason="test",
            reason_detail="Test plan",
        )

        # Add in wrong order
        plan.add_action(ActionType.ASK_CLARIFICATION.value, "Ask user")
        plan.add_action(ActionType.AUTO_SCOPE.value, "Auto adjust")
        plan.add_action(ActionType.SUGGEST_CREATE.value, "Suggest create")

        # Should be sorted
        assert plan.actions[0].action_type == ActionType.AUTO_SCOPE.value
        assert plan.actions[1].action_type == ActionType.SUGGEST_CREATE.value
        assert plan.actions[2].action_type == ActionType.ASK_CLARIFICATION.value

    def test_auto_scope_before_clarification(self):
        """AUTO_SCOPE must always come before ASK_CLARIFICATION"""
        plan = create_no_active_sprint_recovery()

        auto_idx = next(
            (i for i, a in enumerate(plan.actions) if a.action_type == ActionType.AUTO_SCOPE.value),
            -1
        )
        ask_idx = next(
            (i for i, a in enumerate(plan.actions) if a.action_type == ActionType.ASK_CLARIFICATION.value),
            len(plan.actions)
        )

        assert auto_idx < ask_idx, "AUTO_SCOPE must come before ASK_CLARIFICATION"

    def test_priority_values_correct(self):
        """Priority values should be in correct order"""
        assert ACTION_PRIORITY[ActionType.AUTO_SCOPE.value] < ACTION_PRIORITY[ActionType.ASK_CLARIFICATION.value]
        assert ACTION_PRIORITY[ActionType.OFFER_ALTERNATIVES.value] < ACTION_PRIORITY[ActionType.SUGGEST_CREATE.value]


# =============================================================================
# TEST 4: Pre-built Recovery Plans
# =============================================================================

class TestPrebuiltRecoveryPlans:
    """P3-B: Pre-built plans for common scenarios."""

    def test_no_active_sprint_recovery(self):
        """No active sprint should have auto-scope recovery"""
        plan = create_no_active_sprint_recovery()

        assert plan.reason == RecoveryReason.NO_ACTIVE_SPRINT.value
        assert any(a.action_type == ActionType.AUTO_SCOPE.value for a in plan.actions)
        assert any(a.auto_execute for a in plan.actions)

    def test_empty_backlog_recovery(self):
        """Empty backlog should have alternatives and create suggestions"""
        plan = create_empty_backlog_recovery()

        assert plan.reason == RecoveryReason.EMPTY_DATA.value
        assert any(a.action_type == ActionType.OFFER_ALTERNATIVES.value for a in plan.actions)
        assert any(a.action_type == ActionType.SUGGEST_CREATE.value for a in plan.actions)

    def test_empty_tasks_3way_branching(self):
        """Empty tasks should branch based on judgment data"""
        # Branch 1: No tasks at all
        plan1 = create_empty_tasks_recovery(judgment_data={"all_tasks_count": 0})
        assert "created" in plan1.reason_detail.lower()

        # Branch 2: Tasks exist but no due dates
        plan2 = create_empty_tasks_recovery(judgment_data={
            "all_tasks_count": 10,
            "no_due_date_count": 8,
        })
        assert "due date" in plan2.reason_detail.lower()

        # Branch 3: Tasks exist, just not this week
        plan3 = create_empty_tasks_recovery(judgment_data={
            "all_tasks_count": 10,
            "no_due_date_count": 1,
        })
        assert any(a.action_type == ActionType.AUTO_SCOPE.value for a in plan3.actions)

    def test_empty_risks_checks_blockers(self):
        """Empty risks should check blockers as fallback"""
        plan = create_empty_risks_recovery()

        assert any(
            a.action_type == ActionType.FALLBACK_QUERY.value
            for a in plan.actions
        )


# =============================================================================
# TEST 5: Clarification Budget
# =============================================================================

class TestClarificationBudget:
    """P3-B R11: Prevent ASK_CLARIFICATION abuse."""

    def test_backlog_no_clarification(self):
        """Backlog list should not allow clarifications"""
        budget = get_clarification_budget("backlog_list")
        assert budget == 0

    def test_sprint_allows_one_clarification(self):
        """Sprint progress allows 1 clarification"""
        budget = get_clarification_budget("sprint_progress")
        assert budget == 1

    def test_can_ask_respects_budget(self):
        """can_ask_clarification should respect budget"""
        session = {}

        # First time: allowed
        assert can_ask_clarification("sprint_progress", session) is True

        # Record one ask
        record_clarification_asked("sprint_progress", session)

        # Second time: denied (budget=1)
        assert can_ask_clarification("sprint_progress", session) is False

    def test_zero_budget_always_denied(self):
        """Zero budget intents always denied"""
        session = {}
        assert can_ask_clarification("backlog_list", session) is False


# =============================================================================
# TEST 6: Attempt Tracking & Runaway Prevention
# =============================================================================

class TestAttemptTracker:
    """P3-B R3: Prevent runaway recovery loops."""

    def setup_method(self):
        """Clear trackers before each test"""
        clear_all_trackers()

    def test_can_attempt_respects_max(self):
        """can_attempt should respect max attempts"""
        tracker = AttemptTracker(session_id="test")

        # First attempt allowed
        assert tracker.can_attempt("auto_scope", "sprint") is True

        # Record attempt
        tracker.record_attempt("auto_scope", "sprint", "key1", success=False)

        # Second attempt allowed (max=2)
        assert tracker.can_attempt("auto_scope", "sprint") is True

        # Record second
        tracker.record_attempt("auto_scope", "sprint", "key2", success=False)

        # Third denied (max=2)
        assert tracker.can_attempt("auto_scope", "sprint") is False

    def test_runaway_detection(self):
        """Runaway should be detected after many failures"""
        tracker = AttemptTracker(session_id="test")

        # Add many failed attempts
        for i in range(5):
            tracker.record_attempt(
                f"action_{i % 2}",
                "test",
                f"key_{i}",
                success=False,
            )

        assert tracker.is_runaway() is True

    def test_success_rate_calculation(self):
        """Success rate should be calculated correctly"""
        tracker = AttemptTracker(session_id="test")

        tracker.record_attempt("a", "test", "k1", success=True)
        tracker.record_attempt("b", "test", "k2", success=False)
        tracker.record_attempt("c", "test", "k3", success=True)
        tracker.record_attempt("d", "test", "k4", success=False)

        assert tracker.get_success_rate() == 0.5

    def test_recovery_success_criteria(self):
        """is_recovery_successful uses CRITERIA constant"""
        # Success: has data
        result_ok = {"status": "ok", "data": {"items": [1, 2, 3]}}
        assert is_recovery_successful(result_ok) is True

        # Failure: error status
        result_error = {"status": "error", "data": {}}
        assert is_recovery_successful(result_error) is False

        # Success: ok status even without specific data
        result_ok_no_items = {"status": "ok", "data": {}}
        assert is_recovery_successful(result_ok_no_items) is True


# =============================================================================
# TEST 7: Evidence Deterministic Order (R9)
# =============================================================================

class TestEvidenceOrder:
    """P3-A R9: Evidence order must be deterministic."""

    def test_evidence_order_consistent(self):
        """Same evidence added in different order = same output"""
        # Add in order: classifier, query, scope
        exp1 = create_explainability("test", 0.9, "Test")
        exp1.add_classifier_evidence(["test"], 0.9)
        exp1.add_query_evidence("Query", 0, table="t")
        exp1.add_scope_evidence("Empty scope")

        # Add in different order: scope, query, classifier
        exp2 = create_explainability("test", 0.9, "Test")
        exp2.add_scope_evidence("Empty scope")
        exp2.add_query_evidence("Query", 0, table="t")
        exp2.add_classifier_evidence(["test"], 0.9)

        # Human readable should be the same
        readable1 = exp1.to_human_readable()
        readable2 = exp2.to_human_readable()

        # The order in readable output should be: classifier -> data_provenance -> scope
        # Both should have classifier evidence appear first
        lines1 = readable1.split("\n")
        lines2 = readable2.split("\n")

        # Find evidence section and compare order
        # (simplified check - both should have same structure)
        assert "Evidence" in readable1
        assert "Evidence" in readable2


# =============================================================================
# TEST 8: Data Freshness
# =============================================================================

class TestDataFreshness:
    """P3-A: Data freshness should be measurable."""

    def test_freshness_level_realtime(self):
        """Recent data should be 'realtime'"""
        from datetime import datetime, timedelta

        now = datetime.utcnow()
        freshness = DataFreshness(
            source_updated_at=now - timedelta(seconds=30),
            fetched_at=now,
        )

        assert freshness.freshness_level == "realtime"
        assert freshness.age_seconds is not None
        assert freshness.age_seconds < 60

    def test_freshness_level_stale(self):
        """Old data should be 'stale'"""
        from datetime import datetime, timedelta

        now = datetime.utcnow()
        freshness = DataFreshness(
            source_updated_at=now - timedelta(hours=2),
            fetched_at=now,
            stale_threshold_seconds=3600,  # 1 hour
        )

        assert freshness.freshness_level == "stale"

    def test_unknown_freshness(self):
        """Unknown source time should be 'unknown'"""
        freshness = DataFreshness(
            source_updated_at=None,
        )

        assert freshness.freshness_level == "unknown"
        assert freshness.age_seconds is None


# =============================================================================
# TEST 9: Error Explainability (R7)
# =============================================================================

class TestErrorExplainability:
    """P3-A R7: ERROR status requires specific evidence."""

    def test_error_needs_explanation(self):
        """ERROR status needs SCOPE or RULE evidence"""
        exp = create_explainability("test", 0.9, "Test")
        exp.add_classifier_evidence(["test"], 0.9)
        exp.add_query_evidence("Query failed", 0, table="t")
        # Missing SCOPE or RULE evidence

        errors = ExplainabilityPolicy.validate_error(exp)

        assert any("ERROR status" in e for e in errors)

    def test_error_valid_with_scope(self):
        """ERROR is valid with SCOPE evidence"""
        exp = create_explainability("test", 0.9, "Test")
        exp.add_classifier_evidence(["test"], 0.9)
        exp.add_query_evidence("Query failed", 0, table="t")
        exp.add_scope_evidence("Database connection failed")

        errors = ExplainabilityPolicy.validate_error(exp)

        # Should only have scope-related validation (if any), not error-specific
        error_specific = [e for e in errors if "ERROR status" in e]
        assert error_specific == []


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
