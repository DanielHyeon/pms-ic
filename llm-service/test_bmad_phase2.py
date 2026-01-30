"""
BMAD Phase 2 Tests: Guardian System

Tests for:
- Evidence check (guards/evidence_check.py)
- Contract check (guards/contract_check.py)
- Policy check (guards/policy_check.py)
- Guardian verify node (nodes/guardian_verify.py)
- Retry bump node (nodes/retry_bump.py)

Reference: docs/llm-improvement/02-guardian-system.md
"""

import pytest
from typing import Dict, Any, List


# =============================================================================
# Evidence Check Tests
# =============================================================================

class TestEvidenceCheck:
    """Tests for guards/evidence_check.py"""

    def test_quality_track_minimum_evidence(self):
        """QUALITY track requires minimum 2 evidence items."""
        from guards.evidence_check import check_evidence

        state = {
            "track": "QUALITY",
            "request_type": "KNOWLEDGE_QA",
            "evidence": [
                {"source": "doc", "ref": "d1", "snippet": "...", "confidence": 0.8}
            ]
        }

        ok, reason, actions = check_evidence(state)

        assert not ok
        assert "insufficient_evidence_count" in reason
        assert "RETRIEVE_MORE" in actions

    def test_quality_track_source_diversity(self):
        """QUALITY track requires at least 2 different sources."""
        from guards.evidence_check import check_evidence

        state = {
            "track": "QUALITY",
            "request_type": "KNOWLEDGE_QA",
            "evidence": [
                {"source": "doc", "ref": "d1", "snippet": "...", "confidence": 0.8},
                {"source": "doc", "ref": "d2", "snippet": "...", "confidence": 0.7},
            ]
        }

        ok, reason, actions = check_evidence(state)

        assert not ok
        assert "low_source_diversity" in reason
        assert "DIVERSIFY_SOURCES" in actions

    def test_quality_track_passes_with_diverse_evidence(self):
        """QUALITY track passes with 2+ evidence from 2+ sources."""
        from guards.evidence_check import check_evidence

        state = {
            "track": "QUALITY",
            "request_type": "KNOWLEDGE_QA",
            "evidence": [
                {"source": "doc", "ref": "d1", "snippet": "...", "confidence": 0.8},
                {"source": "policy", "ref": "p1", "snippet": "...", "confidence": 0.7},
            ]
        }

        ok, reason, actions = check_evidence(state)

        assert ok
        assert reason == "ok"
        assert actions == []

    def test_status_metric_requires_db(self):
        """STATUS_METRIC must use db source."""
        from guards.evidence_check import check_evidence

        state = {
            "track": "QUALITY",
            "request_type": "STATUS_METRIC",
            "evidence": [
                {"source": "doc", "ref": "d1", "snippet": "...", "confidence": 0.8},
                {"source": "policy", "ref": "p1", "snippet": "...", "confidence": 0.7},
            ]
        }

        ok, reason, actions = check_evidence(state)

        assert not ok
        assert "status_request_must_not_use_doc" in reason
        assert "REMOVE_DOC_EVIDENCE" in actions or "USE_DB_ONLY" in actions

    def test_status_summary_forbids_doc(self):
        """STATUS_SUMMARY must not use doc source."""
        from guards.evidence_check import check_evidence

        state = {
            "track": "QUALITY",
            "request_type": "STATUS_SUMMARY",
            "evidence": [
                {"source": "db", "ref": "q1", "snippet": "...", "confidence": 0.9},
                {"source": "doc", "ref": "d1", "snippet": "...", "confidence": 0.8},
            ]
        }

        ok, reason, actions = check_evidence(state)

        assert not ok
        assert "doc" in reason

    def test_status_list_passes_with_db_only(self):
        """STATUS_LIST passes with db evidence (source diversity not required for STATUS)."""
        from guards.evidence_check import check_evidence

        # Note: STATUS types have request-type rules that override diversity requirement
        state = {
            "track": "QUALITY",
            "request_type": "STATUS_LIST",
            "evidence": [
                {"source": "db", "ref": "q1", "snippet": "...", "confidence": 0.9},
                {"source": "neo4j", "ref": "n1", "snippet": "...", "confidence": 0.8},
            ]
        }

        ok, reason, actions = check_evidence(state)

        assert ok

    def test_design_arch_requires_doc_or_policy(self):
        """DESIGN_ARCH requires doc or policy source in QUALITY track."""
        from guards.evidence_check import check_evidence

        state = {
            "track": "QUALITY",
            "request_type": "DESIGN_ARCH",
            "evidence": [
                {"source": "db", "ref": "q1", "snippet": "...", "confidence": 0.9},
                {"source": "neo4j", "ref": "n1", "snippet": "...", "confidence": 0.8},
            ]
        }

        ok, reason, actions = check_evidence(state)

        assert not ok
        assert "design_policy_requires_doc_or_policy" in reason

    def test_low_confidence_triggers_retry(self):
        """Low average confidence should trigger retrieval."""
        from guards.evidence_check import check_evidence

        state = {
            "track": "QUALITY",
            "request_type": "KNOWLEDGE_QA",
            "evidence": [
                {"source": "doc", "ref": "d1", "snippet": "...", "confidence": 0.3},
                {"source": "policy", "ref": "p1", "snippet": "...", "confidence": 0.4},
            ]
        }

        ok, reason, actions = check_evidence(state)

        assert not ok
        assert "low_evidence_confidence" in reason
        assert "REFINE_QUERY" in actions

    def test_fast_track_no_diversity_requirement(self):
        """FAST track has no diversity requirement."""
        from guards.evidence_check import check_evidence

        state = {
            "track": "FAST",
            "request_type": "KNOWLEDGE_QA",
            "evidence": [
                {"source": "doc", "ref": "d1", "snippet": "...", "confidence": 0.8},
            ]
        }

        ok, reason, actions = check_evidence(state)

        assert ok

    def test_helper_get_evidence_sources(self):
        """Test helper function to get unique sources."""
        from guards.evidence_check import get_evidence_sources

        evidence = [
            {"source": "doc", "ref": "d1", "snippet": "..."},
            {"source": "db", "ref": "q1", "snippet": "..."},
            {"source": "doc", "ref": "d2", "snippet": "..."},
        ]

        sources = get_evidence_sources(evidence)

        assert set(sources) == {"doc", "db"}

    def test_helper_calculate_average_confidence(self):
        """Test average confidence calculation."""
        from guards.evidence_check import calculate_average_confidence

        evidence = [
            {"source": "doc", "confidence": 0.8},
            {"source": "db", "confidence": 0.6},
        ]

        avg = calculate_average_confidence(evidence)

        assert avg == pytest.approx(0.7)


# =============================================================================
# Contract Check Tests
# =============================================================================

class TestContractCheck:
    """Tests for guards/contract_check.py"""

    def test_missing_required_sections(self):
        """Draft missing required sections should fail."""
        from guards.contract_check import check_contract

        state = {
            "architect_spec": {
                "required_sections": ["Summary", "Evidence", "Answer"],
                "forbidden_content": [],
                "domain_terms": [],
            },
            "draft_answer": "## Summary\nSome content here."
        }

        ok, reason, actions = check_contract(state)

        assert not ok
        assert "missing_required_sections" in reason
        assert "Evidence" in reason or "Answer" in reason
        assert "ADD_REQUIRED_SECTIONS" in actions

    def test_all_required_sections_present(self):
        """Draft with all required sections should pass."""
        from guards.contract_check import check_contract

        state = {
            "architect_spec": {
                "required_sections": ["Summary", "Evidence"],
                "forbidden_content": [],
                "domain_terms": [],
            },
            "draft_answer": "## Summary\nOverview.\n\n## Evidence\nData here."
        }

        ok, reason, actions = check_contract(state)

        assert ok
        assert reason == "ok"

    def test_forbidden_content_detected(self):
        """Draft with forbidden content should fail."""
        from guards.contract_check import check_contract

        state = {
            "architect_spec": {
                "required_sections": [],
                "forbidden_content": ["inventing facts", "unauthorized access"],
                "domain_terms": [],
            },
            "draft_answer": "This might involve inventing facts about the project."
        }

        ok, reason, actions = check_contract(state)

        assert not ok
        assert "forbidden_content_detected" in reason
        assert "REMOVE_FORBIDDEN_CONTENT" in actions

    def test_domain_terms_not_used(self):
        """Draft not using any domain terms should fail."""
        from guards.contract_check import check_contract

        state = {
            "architect_spec": {
                "required_sections": [],
                "forbidden_content": [],
                "domain_terms": ["Sprint", "Backlog", "UserStory"],
            },
            "draft_answer": "The project is progressing well with good velocity."
        }

        ok, reason, actions = check_contract(state)

        assert not ok
        assert "domain_terms_not_used" in reason
        assert "USE_DOMAIN_TERMS" in actions

    def test_domain_terms_used(self):
        """Draft using domain terms should pass."""
        from guards.contract_check import check_contract

        state = {
            "architect_spec": {
                "required_sections": [],
                "forbidden_content": [],
                "domain_terms": ["Sprint", "Backlog"],
            },
            "draft_answer": "The current Sprint contains 5 items from the Backlog."
        }

        ok, reason, actions = check_contract(state)

        assert ok

    def test_no_draft_answer(self):
        """Empty draft should fail."""
        from guards.contract_check import check_contract

        state = {
            "architect_spec": {},
            "draft_answer": ""
        }

        ok, reason, actions = check_contract(state)

        assert not ok
        assert "no_draft_answer" in reason

    def test_helper_check_required_sections(self):
        """Test section checking helper."""
        from guards.contract_check import check_required_sections

        draft = "## Summary\nContent.\n\n## Details\nMore content."
        required = ["Summary", "Details", "Conclusion"]

        missing = check_required_sections(draft, required)

        assert "Conclusion" in missing
        assert "Summary" not in missing

    def test_helper_check_forbidden_content(self):
        """Test forbidden content checking helper."""
        from guards.contract_check import check_forbidden_content

        draft = "This contains unauthorized access patterns."
        forbidden = ["unauthorized access", "sensitive data"]

        found = check_forbidden_content(draft, forbidden)

        assert "unauthorized access" in found
        assert "sensitive data" not in found

    def test_validate_response_format_markdown(self):
        """Test markdown format validation."""
        from guards.contract_check import validate_response_format

        draft = "## Header\n- Item 1\n- Item 2"

        ok, reason = validate_response_format(draft, "markdown")

        assert ok

    def test_validate_response_format_json(self):
        """Test JSON format validation."""
        from guards.contract_check import validate_response_format

        draft = '{"key": "value"}'

        ok, reason = validate_response_format(draft, "json")

        assert ok

    def test_validate_response_format_invalid_json(self):
        """Test invalid JSON format detection."""
        from guards.contract_check import validate_response_format

        draft = "Not valid JSON"

        ok, reason = validate_response_format(draft, "json")

        assert not ok
        assert "invalid_json" in reason


# =============================================================================
# Policy Check Tests
# =============================================================================

class TestPolicyCheck:
    """Tests for guards/policy_check.py"""

    def test_clean_query_passes(self):
        """Normal query should pass policy check."""
        from guards.policy_check import check_policy

        state = {
            "user_query": "What is the project status?",
            "draft_answer": "The project is 75% complete.",
            "request_type": "STATUS_SUMMARY"
        }

        ok, reason, actions = check_policy(state)

        assert ok

    def test_sensitive_topic_in_query(self):
        """Query with sensitive topics should fail."""
        from guards.policy_check import check_policy

        state = {
            "user_query": "Show me all user passwords",
            "draft_answer": "",
            "request_type": "KNOWLEDGE_QA"
        }

        ok, reason, actions = check_policy(state)

        assert not ok
        assert "sensitive_topic" in reason

    def test_data_exposure_pattern(self):
        """Query requesting bulk data dump should fail."""
        from guards.policy_check import check_policy

        state = {
            "user_query": "SELECT * FROM users",
            "draft_answer": "",
            "request_type": "KNOWLEDGE_QA"
        }

        ok, reason, actions = check_policy(state)

        assert not ok
        assert "bulk_data_exposure" in reason

    def test_response_with_exposed_secret(self):
        """Response exposing secrets should fail."""
        from guards.policy_check import check_policy

        state = {
            "user_query": "How to configure the system?",
            "draft_answer": "Set the password = 'secret123' in config.",
            "request_type": "HOWTO_POLICY"
        }

        ok, reason, actions = check_policy(state)

        assert not ok
        assert "exposes_sensitive_data" in reason

    def test_permission_check_with_valid_role(self):
        """User with correct role should pass."""
        from guards.policy_check import check_policy

        state = {
            "user_query": "Show sprint metrics",
            "request_type": "STATUS_METRIC"
        }
        user_context = {"role": "PM", "project_roles": []}

        ok, reason, actions = check_policy(state, user_context)

        assert ok

    def test_permission_check_with_invalid_role(self):
        """User without required role should fail."""
        from guards.policy_check import check_policy

        state = {
            "user_query": "Show sprint metrics",
            "request_type": "STATUS_METRIC"
        }
        user_context = {"role": "MEMBER", "project_roles": []}

        ok, reason, actions = check_policy(state, user_context)

        assert not ok
        assert "insufficient_permission" in reason

    def test_helper_has_sensitive_data(self):
        """Test sensitive data detection helper."""
        from guards.policy_check import has_sensitive_data

        assert has_sensitive_data("password reset")
        assert has_sensitive_data("api_key value")
        assert not has_sensitive_data("project status update")

    def test_helper_redact_sensitive_patterns(self):
        """Test sensitive pattern redaction."""
        from guards.policy_check import redact_sensitive_patterns

        text = 'Config: password = "secret123"'
        redacted = redact_sensitive_patterns(text)

        assert "secret123" not in redacted or "[REDACTED]" in redacted


# =============================================================================
# Guardian Verify Node Tests
# =============================================================================

class TestGuardianVerify:
    """Tests for nodes/guardian_verify.py"""

    def test_guardian_pass_with_valid_state(self):
        """Guardian passes with valid evidence and contract."""
        from nodes.guardian_verify import guardian_verify

        state = {
            "track": "QUALITY",
            "retry_count": 0,
            "request_type": "KNOWLEDGE_QA",
            "user_query": "What is the project structure?",
            "evidence": [
                {"source": "doc", "ref": "d1", "snippet": "...", "confidence": 0.8},
                {"source": "policy", "ref": "p1", "snippet": "...", "confidence": 0.7},
            ],
            "architect_spec": {
                "required_sections": ["Summary"],
                "forbidden_content": [],
                "domain_terms": ["project"],
            },
            "draft_answer": "## Summary\nThe project is organized in modules."
        }

        result = guardian_verify(state)

        assert result["guardian"]["verdict"] == "PASS"
        assert result["guardian"]["reasons"] == []
        assert result["guardian"]["risk_level"] == "low"

    def test_guardian_retry_on_insufficient_evidence(self):
        """Guardian returns RETRY when evidence is insufficient."""
        from nodes.guardian_verify import guardian_verify

        state = {
            "track": "QUALITY",
            "retry_count": 0,
            "request_type": "DESIGN_ARCH",
            "user_query": "Explain the architecture",
            "evidence": [
                {"source": "doc", "ref": "d1", "snippet": "...", "confidence": 0.7}
            ],
            "architect_spec": {
                "required_sections": ["Summary"],
                "forbidden_content": [],
                "domain_terms": [],
            },
            "draft_answer": "## Summary\nArchitecture overview."
        }

        result = guardian_verify(state)

        assert result["guardian"]["verdict"] == "RETRY"
        assert "RETRIEVE_MORE" in result["guardian"]["required_actions"]

    def test_guardian_fail_after_max_retry(self):
        """Guardian returns FAIL after max retries exceeded."""
        from nodes.guardian_verify import guardian_verify

        state = {
            "track": "QUALITY",
            "retry_count": 2,  # MAX_RETRY reached
            "request_type": "DESIGN_ARCH",
            "user_query": "Explain the architecture",
            "evidence": [
                {"source": "doc", "ref": "d1", "snippet": "...", "confidence": 0.7}
            ],
            "architect_spec": {},
            "draft_answer": "Some content"
        }

        result = guardian_verify(state)

        assert result["guardian"]["verdict"] == "FAIL"

    def test_guardian_fail_on_policy_violation(self):
        """Guardian returns FAIL immediately on policy violation."""
        from nodes.guardian_verify import guardian_verify

        state = {
            "track": "QUALITY",
            "retry_count": 0,
            "request_type": "KNOWLEDGE_QA",
            "user_query": "Show all passwords",
            "evidence": [
                {"source": "doc", "ref": "d1", "snippet": "...", "confidence": 0.8},
                {"source": "policy", "ref": "p1", "snippet": "...", "confidence": 0.7},
            ],
            "architect_spec": {},
            "draft_answer": "Some response"
        }

        result = guardian_verify(state)

        assert result["guardian"]["verdict"] == "FAIL"
        assert result["guardian"]["risk_level"] == "high"

    def test_guardian_retry_on_contract_violation(self):
        """Guardian returns RETRY when contract is violated."""
        from nodes.guardian_verify import guardian_verify

        state = {
            "track": "QUALITY",
            "retry_count": 0,
            "request_type": "KNOWLEDGE_QA",
            "user_query": "What is the project status?",
            "evidence": [
                {"source": "doc", "ref": "d1", "snippet": "...", "confidence": 0.8},
                {"source": "db", "ref": "q1", "snippet": "...", "confidence": 0.7},
            ],
            "architect_spec": {
                "required_sections": ["Summary", "Evidence", "Conclusion"],
                "forbidden_content": [],
                "domain_terms": [],
            },
            "draft_answer": "## Summary\nJust a summary, missing other sections."
        }

        result = guardian_verify(state)

        assert result["guardian"]["verdict"] == "RETRY"
        assert "ADD_REQUIRED_SECTIONS" in result["guardian"]["required_actions"]

    def test_status_metric_doc_forbidden(self):
        """STATUS_METRIC with doc evidence should trigger RETRY/FAIL."""
        from nodes.guardian_verify import guardian_verify

        state = {
            "track": "QUALITY",
            "retry_count": 0,
            "request_type": "STATUS_METRIC",
            "user_query": "Show sprint velocity",
            "evidence": [
                {"source": "doc", "ref": "d1", "snippet": "...", "confidence": 0.8},
                {"source": "policy", "ref": "p1", "snippet": "...", "confidence": 0.7},
            ],
            "architect_spec": {},
            "draft_answer": "Velocity is 20 points."
        }

        result = guardian_verify(state)

        assert result["guardian"]["verdict"] in ["RETRY", "FAIL"]
        assert any("DOC" in a or "DB" in a for a in result["guardian"]["required_actions"])

    def test_fast_track_skips_contract_check(self):
        """FAST track skips contract check."""
        from nodes.guardian_verify import guardian_verify

        state = {
            "track": "FAST",
            "retry_count": 0,
            "request_type": "CASUAL",
            "user_query": "Hello!",
            "evidence": [],
            "architect_spec": {
                "required_sections": ["Summary"],  # Would fail if checked
                "forbidden_content": [],
                "domain_terms": [],
            },
            "draft_answer": "Hello! How can I help?"
        }

        result = guardian_verify(state)

        # FAST track doesn't check contract, so should PASS
        assert result["guardian"]["verdict"] == "PASS"

    def test_helper_decide_verdict(self):
        """Test verdict decision helper."""
        from nodes.guardian_verify import decide_verdict

        # All OK -> PASS
        assert decide_verdict(True, True, True, 0, 2) == "PASS"

        # Policy fail -> immediate FAIL
        assert decide_verdict(True, True, False, 0, 2) == "FAIL"

        # Evidence fail, can retry -> RETRY
        assert decide_verdict(False, True, True, 0, 2) == "RETRY"

        # Evidence fail, max retry -> FAIL
        assert decide_verdict(False, True, True, 2, 2) == "FAIL"

    def test_helper_should_functions(self):
        """Test verdict checking helpers."""
        from nodes.guardian_verify import should_pass, should_retry, should_fail

        pass_state = {"guardian": {"verdict": "PASS"}}
        retry_state = {"guardian": {"verdict": "RETRY"}}
        fail_state = {"guardian": {"verdict": "FAIL"}}

        assert should_pass(pass_state)
        assert should_retry(retry_state)
        assert should_fail(fail_state)


# =============================================================================
# Retry Bump Node Tests
# =============================================================================

class TestRetryBump:
    """Tests for nodes/retry_bump.py"""

    def test_bump_retry_increments(self):
        """bump_retry should increment retry_count."""
        from nodes.retry_bump import bump_retry

        state = {"retry_count": 0}
        result = bump_retry(state)

        assert result["retry_count"] == 1

    def test_bump_retry_from_undefined(self):
        """bump_retry should handle undefined retry_count."""
        from nodes.retry_bump import bump_retry

        state = {}
        result = bump_retry(state)

        assert result["retry_count"] == 1

    def test_bump_retry_multiple_times(self):
        """Multiple bump_retry calls should accumulate."""
        from nodes.retry_bump import bump_retry

        state = {"retry_count": 0}
        state = bump_retry(state)
        state = bump_retry(state)

        assert state["retry_count"] == 2

    def test_reset_retry(self):
        """reset_retry should set retry_count to 0."""
        from nodes.retry_bump import reset_retry

        state = {"retry_count": 3}
        result = reset_retry(state)

        assert result["retry_count"] == 0

    def test_get_retry_count(self):
        """get_retry_count should return current count."""
        from nodes.retry_bump import get_retry_count

        assert get_retry_count({"retry_count": 5}) == 5
        assert get_retry_count({}) == 0

    def test_can_retry(self):
        """can_retry should check against max_retry."""
        from nodes.retry_bump import can_retry

        assert can_retry({"retry_count": 0}, max_retry=2)
        assert can_retry({"retry_count": 1}, max_retry=2)
        assert not can_retry({"retry_count": 2}, max_retry=2)
        assert not can_retry({"retry_count": 3}, max_retry=2)


# =============================================================================
# Integration Tests
# =============================================================================

class TestPhase2Integration:
    """Integration tests for Phase 2 Guardian System."""

    def test_full_guardian_workflow_pass(self):
        """Test complete Guardian workflow that passes."""
        from nodes.guardian_verify import guardian_verify
        from nodes.retry_bump import reset_retry

        state = {
            "track": "QUALITY",
            "request_type": "KNOWLEDGE_QA",
            "user_query": "How does the sprint planning work?",
            "evidence": [
                {"source": "doc", "ref": "guide.md", "snippet": "Sprint planning involves...", "confidence": 0.85},
                {"source": "policy", "ref": "proc.pdf", "snippet": "Process guidelines...", "confidence": 0.75},
            ],
            "architect_spec": {
                "required_sections": ["Summary"],
                "forbidden_content": ["unauthorized"],
                "domain_terms": ["Sprint"],
            },
            "draft_answer": "## Summary\nSprint planning is a collaborative event where the team selects items from the Backlog."
        }

        # Reset and verify
        state = reset_retry(state)
        result = guardian_verify(state)

        assert result["guardian"]["verdict"] == "PASS"

    def test_full_guardian_workflow_retry_then_pass(self):
        """Test Guardian workflow with retry then pass."""
        from nodes.guardian_verify import guardian_verify
        from nodes.retry_bump import bump_retry

        # Initial state with insufficient evidence
        state = {
            "track": "QUALITY",
            "retry_count": 0,
            "request_type": "KNOWLEDGE_QA",
            "user_query": "What is the architecture?",
            "evidence": [
                {"source": "doc", "ref": "d1", "snippet": "...", "confidence": 0.7},
            ],
            "architect_spec": {"required_sections": [], "forbidden_content": [], "domain_terms": []},
            "draft_answer": "Architecture description."
        }

        # First pass - should RETRY
        result = guardian_verify(state)
        assert result["guardian"]["verdict"] == "RETRY"

        # Simulate adding more evidence and retry
        state["evidence"].append(
            {"source": "policy", "ref": "p1", "snippet": "...", "confidence": 0.8}
        )
        state = bump_retry(state)

        # Second pass - should PASS now
        result = guardian_verify(state)
        assert result["guardian"]["verdict"] == "PASS"

    def test_full_guardian_workflow_max_retry_fail(self):
        """Test Guardian workflow that fails after max retries."""
        from nodes.guardian_verify import guardian_verify
        from nodes.retry_bump import bump_retry

        # State that will keep failing
        state = {
            "track": "QUALITY",
            "retry_count": 0,
            "request_type": "KNOWLEDGE_QA",
            "user_query": "What is this?",
            "evidence": [
                {"source": "doc", "ref": "d1", "snippet": "...", "confidence": 0.3},
            ],
            "architect_spec": {},
            "draft_answer": "Response"
        }

        # Retry loop simulation
        for i in range(3):
            result = guardian_verify(state)
            if result["guardian"]["verdict"] == "FAIL":
                break
            state = bump_retry(state)

        assert result["guardian"]["verdict"] == "FAIL"

    def test_imports_from_package(self):
        """Test that all Phase 2 components can be imported from packages."""
        # Guards package
        from guards import (
            check_evidence,
            check_contract,
            check_policy,
            EVIDENCE_ACTIONS,
            CONTRACT_ACTIONS,
            POLICY_ACTIONS,
        )

        # Nodes package
        from nodes import (
            guardian_verify,
            bump_retry,
            reset_retry,
            MAX_RETRY,
            VERDICT_PASS,
            VERDICT_RETRY,
            VERDICT_FAIL,
        )

        # Verify imports work
        assert MAX_RETRY == 2
        assert VERDICT_PASS == "PASS"
        assert "RETRIEVE_MORE" in EVIDENCE_ACTIONS


# =============================================================================
# Run Tests
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
