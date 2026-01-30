"""
BMAD Phase 1 Tests - State & Contract Design

Tests for:
- contracts/state.py: TypedDict definitions and helper functions
- contracts/schemas.py: JSON schema validation
- guards/json_parse.py: JSON extraction from LLM output
- guards/output_guard.py: Role-specific output validation

Reference: docs/llm-improvement/01-state-contract-design.md
"""

import pytest
from typing import Dict, Any


# =============================================================================
# Test: contracts/state.py
# =============================================================================

class TestContractsState:
    """Tests for contracts/state.py"""

    def test_request_type_enum_values(self):
        """RequestType enum should have all expected values."""
        from contracts.state import RequestType

        expected = [
            "STATUS_METRIC", "STATUS_SUMMARY", "STATUS_LIST",
            "HOWTO_POLICY", "DESIGN_ARCH", "DATA_DEFINITION",
            "TROUBLESHOOTING", "KNOWLEDGE_QA", "CASUAL"
        ]
        actual = [rt.value for rt in RequestType]

        assert set(expected) == set(actual)

    def test_track_enum_values(self):
        """Track enum should have FAST and QUALITY."""
        from contracts.state import Track

        assert Track.FAST.value == "FAST"
        assert Track.QUALITY.value == "QUALITY"

    def test_guardian_verdict_enum_values(self):
        """GuardianVerdict enum should have PASS, RETRY, FAIL."""
        from contracts.state import GuardianVerdict

        assert GuardianVerdict.PASS.value == "PASS"
        assert GuardianVerdict.RETRY.value == "RETRY"
        assert GuardianVerdict.FAIL.value == "FAIL"

    def test_get_track_policy_quality(self):
        """get_track_policy should return correct policy for QUALITY track."""
        from contracts.state import get_track_policy

        policy = get_track_policy("QUALITY")

        assert policy["min_evidence"] == 2
        assert policy["allow_retry"] is True
        assert policy["max_retry"] == 2
        assert policy["guardian_type"] == "full"

    def test_get_track_policy_fast(self):
        """get_track_policy should return correct policy for FAST track."""
        from contracts.state import get_track_policy

        policy = get_track_policy("FAST")

        assert policy["min_evidence"] == 0
        assert policy["allow_retry"] is False
        assert policy["guardian_type"] == "light"

    def test_get_required_sources_status_metric(self):
        """STATUS_METRIC should require db source."""
        from contracts.state import get_required_sources

        sources = get_required_sources("STATUS_METRIC")
        assert "db" in sources

    def test_get_forbidden_sources_status_metric(self):
        """STATUS_METRIC should forbid doc source."""
        from contracts.state import get_forbidden_sources

        forbidden = get_forbidden_sources("STATUS_METRIC")
        assert "doc" in forbidden

    def test_is_source_allowed_status_metric_db(self):
        """db source should be allowed for STATUS_METRIC."""
        from contracts.state import is_source_allowed

        assert is_source_allowed("STATUS_METRIC", "db") is True

    def test_is_source_not_allowed_status_metric_doc(self):
        """doc source should not be allowed for STATUS_METRIC."""
        from contracts.state import is_source_allowed

        assert is_source_allowed("STATUS_METRIC", "doc") is False

    def test_create_initial_state(self):
        """create_initial_state should return valid ChatState."""
        from contracts.state import create_initial_state

        state = create_initial_state(
            user_query="What is the sprint velocity?",
            user_id="user123",
            project_id="proj456"
        )

        assert state["user_query"] == "What is the sprint velocity?"
        assert state["user_id"] == "user123"
        assert state["project_id"] == "proj456"
        assert state["track"] == "QUALITY"  # Default
        assert state["retry_count"] == 0
        assert state["evidence"] == []
        assert "trace_id" in state


# =============================================================================
# Test: contracts/schemas.py
# =============================================================================

class TestContractsSchemas:
    """Tests for contracts/schemas.py"""

    def test_validate_analyst_output_valid(self):
        """Valid Analyst output should pass validation."""
        from contracts.schemas import validate_role_output

        valid_output = {
            "intent": "query_sprint_velocity",
            "request_type": "STATUS_METRIC",
            "track": "QUALITY",
            "required_sources": ["db"],
            "missing_info_questions": [],
            "expected_output_schema": "status_metric_v1"
        }

        is_valid, errors = validate_role_output("ANALYST", valid_output)

        assert is_valid is True
        assert errors == []

    def test_validate_analyst_output_missing_intent(self):
        """Analyst output without intent should fail."""
        from contracts.schemas import validate_role_output

        invalid_output = {
            "request_type": "STATUS_METRIC",
            "track": "QUALITY",
            "required_sources": ["db"]
        }

        is_valid, errors = validate_role_output("ANALYST", invalid_output)

        assert is_valid is False
        assert any("intent" in e for e in errors)

    def test_validate_analyst_status_no_doc(self):
        """STATUS request with doc source should fail."""
        from contracts.schemas import validate_role_output

        invalid_output = {
            "intent": "query_sprint_velocity",
            "request_type": "STATUS_METRIC",
            "track": "QUALITY",
            "required_sources": ["db", "doc"],  # doc is forbidden for STATUS
            "missing_info_questions": [],
            "expected_output_schema": "status_metric_v1"
        }

        is_valid, errors = validate_role_output("ANALYST", invalid_output)

        assert is_valid is False
        assert any("doc" in e.lower() for e in errors)

    def test_validate_analyst_status_requires_db(self):
        """STATUS request without db source should fail."""
        from contracts.schemas import validate_role_output

        invalid_output = {
            "intent": "query_sprint_velocity",
            "request_type": "STATUS_METRIC",
            "track": "QUALITY",
            "required_sources": ["policy"],  # missing db
            "missing_info_questions": [],
            "expected_output_schema": "status_metric_v1"
        }

        is_valid, errors = validate_role_output("ANALYST", invalid_output)

        assert is_valid is False
        assert any("db" in e.lower() for e in errors)

    def test_validate_analyst_max_one_question(self):
        """Analyst output with >1 question should fail."""
        from contracts.schemas import validate_role_output

        invalid_output = {
            "intent": "unclear_request",
            "request_type": "KNOWLEDGE_QA",
            "track": "QUALITY",
            "required_sources": ["doc"],
            "missing_info_questions": ["Question 1?", "Question 2?"],  # Too many
            "expected_output_schema": "answer_v1"
        }

        is_valid, errors = validate_role_output("ANALYST", invalid_output)

        assert is_valid is False
        assert any("question" in e.lower() or "1" in e for e in errors)

    def test_validate_analyst_fast_no_questions(self):
        """FAST track should not have questions."""
        from contracts.schemas import validate_role_output

        invalid_output = {
            "intent": "simple_query",
            "request_type": "KNOWLEDGE_QA",
            "track": "FAST",
            "required_sources": ["doc"],
            "missing_info_questions": ["Clarifying question?"],  # Not allowed in FAST
            "expected_output_schema": "answer_v1"
        }

        is_valid, errors = validate_role_output("ANALYST", invalid_output)

        assert is_valid is False
        assert any("fast" in e.lower() or "question" in e.lower() for e in errors)

    def test_validate_architect_output_valid(self):
        """Valid Architect output should pass validation."""
        from contracts.schemas import validate_role_output

        valid_output = {
            "response_format": "markdown",
            "domain_terms": ["Sprint", "Velocity", "Backlog"],
            "forbidden_content": ["inventing facts", "speculation"],
            "required_sections": ["Summary", "Evidence", "Answer"]
        }

        is_valid, errors = validate_role_output("ARCHITECT", valid_output)

        assert is_valid is True
        assert errors == []

    def test_validate_architect_empty_forbidden(self):
        """Architect output with empty forbidden_content should fail."""
        from contracts.schemas import validate_role_output

        invalid_output = {
            "response_format": "markdown",
            "domain_terms": ["Sprint"],
            "forbidden_content": [],  # Should not be empty
            "required_sections": ["Summary"]
        }

        is_valid, errors = validate_role_output("ARCHITECT", invalid_output)

        assert is_valid is False
        assert any("forbidden" in e.lower() for e in errors)

    def test_validate_guardian_output_pass(self):
        """Valid PASS Guardian output should pass validation."""
        from contracts.schemas import validate_role_output

        valid_output = {
            "verdict": "PASS",
            "reasons": [],
            "required_actions": [],
            "risk_level": "low"
        }

        is_valid, errors = validate_role_output("GUARDIAN", valid_output)

        assert is_valid is True
        assert errors == []

    def test_validate_guardian_output_retry(self):
        """Valid RETRY Guardian output should pass validation."""
        from contracts.schemas import validate_role_output

        valid_output = {
            "verdict": "RETRY",
            "reasons": ["insufficient_evidence"],
            "required_actions": ["RETRIEVE_MORE", "DIVERSIFY_SOURCES"],
            "risk_level": "med"
        }

        is_valid, errors = validate_role_output("GUARDIAN", valid_output)

        assert is_valid is True
        assert errors == []

    def test_validate_guardian_retry_needs_actions(self):
        """RETRY verdict without actions should fail."""
        from contracts.schemas import validate_role_output

        invalid_output = {
            "verdict": "RETRY",
            "reasons": ["some_reason"],
            "required_actions": [],  # RETRY needs actions
            "risk_level": "med"
        }

        is_valid, errors = validate_role_output("GUARDIAN", invalid_output)

        assert is_valid is False
        assert any("action" in e.lower() for e in errors)

    def test_validate_guardian_pass_no_reasons(self):
        """PASS verdict with reasons should fail."""
        from contracts.schemas import validate_role_output

        invalid_output = {
            "verdict": "PASS",
            "reasons": ["should_be_empty"],  # PASS should have no reasons
            "required_actions": [],
            "risk_level": "low"
        }

        is_valid, errors = validate_role_output("GUARDIAN", invalid_output)

        assert is_valid is False
        assert any("reason" in e.lower() for e in errors)


# =============================================================================
# Test: guards/json_parse.py
# =============================================================================

class TestJsonParse:
    """Tests for guards/json_parse.py"""

    def test_extract_first_json_pure(self):
        """Extract JSON from pure JSON string."""
        from guards.json_parse import extract_first_json

        text = '{"key": "value", "number": 42}'
        result = extract_first_json(text)

        assert result == {"key": "value", "number": 42}

    def test_extract_first_json_code_block(self):
        """Extract JSON from markdown code block."""
        from guards.json_parse import extract_first_json

        text = '''Here is my response:
```json
{"intent": "test", "track": "QUALITY"}
```
That's all.'''

        result = extract_first_json(text)

        assert result["intent"] == "test"
        assert result["track"] == "QUALITY"

    def test_extract_first_json_surrounded_text(self):
        """Extract JSON from text with surrounding content."""
        from guards.json_parse import extract_first_json

        text = '''Based on the query, here is my analysis:
{"request_type": "STATUS_METRIC", "required_sources": ["db"]}
I hope this helps!'''

        result = extract_first_json(text)

        assert result["request_type"] == "STATUS_METRIC"
        assert result["required_sources"] == ["db"]

    def test_extract_first_json_nested(self):
        """Extract nested JSON object."""
        from guards.json_parse import extract_first_json

        text = '{"outer": {"inner": "value"}, "list": [1, 2, 3]}'
        result = extract_first_json(text)

        assert result["outer"]["inner"] == "value"
        assert result["list"] == [1, 2, 3]

    def test_extract_first_json_empty_raises(self):
        """Empty text should raise ValueError."""
        from guards.json_parse import extract_first_json

        with pytest.raises(ValueError):
            extract_first_json("")

    def test_extract_first_json_no_json_raises(self):
        """Text without JSON should raise ValueError."""
        from guards.json_parse import extract_first_json

        with pytest.raises(ValueError):
            extract_first_json("This is just plain text without any JSON")

    def test_try_extract_json_returns_default(self):
        """try_extract_json should return default on failure."""
        from guards.json_parse import try_extract_json

        default = {"fallback": True}
        result = try_extract_json("invalid text", default=default)

        assert result == default

    def test_extract_json_array(self):
        """Extract JSON array from text."""
        from guards.json_parse import extract_json_array

        text = 'The list is: ["a", "b", "c"]'
        result = extract_json_array(text)

        assert result == ["a", "b", "c"]


# =============================================================================
# Test: guards/output_guard.py
# =============================================================================

class TestOutputGuard:
    """Tests for guards/output_guard.py"""

    def test_create_analyst_guard(self):
        """create_analyst_guard should return OutputGuard for ANALYST."""
        from guards.output_guard import create_analyst_guard

        guard = create_analyst_guard()

        assert guard.role == "ANALYST"

    def test_create_architect_guard(self):
        """create_architect_guard should return OutputGuard for ARCHITECT."""
        from guards.output_guard import create_architect_guard

        guard = create_architect_guard()

        assert guard.role == "ARCHITECT"

    def test_create_guardian_guard(self):
        """create_guardian_guard should return OutputGuard for GUARDIAN."""
        from guards.output_guard import create_guardian_guard

        guard = create_guardian_guard()

        assert guard.role == "GUARDIAN"

    def test_output_guard_invalid_role_raises(self):
        """OutputGuard with invalid role should raise ValueError."""
        from guards.output_guard import OutputGuard

        with pytest.raises(ValueError):
            OutputGuard("INVALID_ROLE")

    def test_output_guard_validate_analyst(self):
        """OutputGuard should validate Analyst output correctly."""
        from guards.output_guard import create_analyst_guard

        guard = create_analyst_guard()

        valid_output = {
            "intent": "test",
            "request_type": "KNOWLEDGE_QA",
            "track": "QUALITY",
            "required_sources": ["doc"],
            "missing_info_questions": [],
            "expected_output_schema": "answer_v1"
        }

        is_valid, errors = guard.validate(valid_output)

        assert is_valid is True
        assert errors == []

    def test_output_guard_parse_and_validate(self):
        """OutputGuard should parse JSON and validate."""
        from guards.output_guard import create_analyst_guard

        guard = create_analyst_guard()

        raw_text = '''```json
{
    "intent": "test_intent",
    "request_type": "KNOWLEDGE_QA",
    "track": "FAST",
    "required_sources": ["doc"],
    "missing_info_questions": [],
    "expected_output_schema": "answer_v1"
}
```'''

        is_valid, obj, errors = guard.parse_and_validate(raw_text)

        assert is_valid is True
        assert obj["intent"] == "test_intent"

    def test_get_analyst_fallback(self):
        """get_analyst_fallback should return valid fallback."""
        from guards.output_guard import get_analyst_fallback, validate_analyst_output

        fallback = get_analyst_fallback("test_error")

        is_valid, errors = validate_analyst_output(fallback)

        assert is_valid is True
        assert fallback["track"] == "QUALITY"

    def test_get_architect_fallback(self):
        """get_architect_fallback should return valid fallback."""
        from guards.output_guard import get_architect_fallback, validate_architect_output

        fallback = get_architect_fallback()

        is_valid, errors = validate_architect_output(fallback)

        assert is_valid is True
        assert fallback["response_format"] == "markdown"

    def test_get_guardian_fallback(self):
        """get_guardian_fallback should return valid fallback."""
        from guards.output_guard import get_guardian_fallback, validate_guardian_output

        fallback = get_guardian_fallback()

        is_valid, errors = validate_guardian_output(fallback)

        assert is_valid is True
        assert fallback["verdict"] == "FAIL"


# =============================================================================
# Integration Tests
# =============================================================================

class TestPhase1Integration:
    """Integration tests for Phase 1 components."""

    def test_full_analyst_flow(self):
        """Test complete Analyst output flow from text to validated object."""
        from guards.json_parse import extract_first_json
        from contracts.schemas import validate_role_output

        raw_llm_output = '''Based on the user query about sprint velocity, I analyzed it:

```json
{
    "intent": "query_sprint_velocity",
    "request_type": "STATUS_METRIC",
    "track": "QUALITY",
    "required_sources": ["db"],
    "missing_info_questions": [],
    "expected_output_schema": "status_metric_v1_json"
}
```

This is a status metric request requiring database access.'''

        # Parse JSON
        obj = extract_first_json(raw_llm_output)

        # Validate
        is_valid, errors = validate_role_output("ANALYST", obj)

        assert is_valid is True
        assert obj["request_type"] == "STATUS_METRIC"
        assert "db" in obj["required_sources"]

    def test_state_with_analyst_plan(self):
        """Test ChatState with AnalystPlan."""
        from contracts.state import create_initial_state, AnalystPlan

        state = create_initial_state(
            user_query="What is the sprint velocity?",
            project_id="test_project"
        )

        analyst_plan: AnalystPlan = {
            "intent": "query_sprint_velocity",
            "request_type": "STATUS_METRIC",
            "track": "QUALITY",
            "required_sources": ["db"],
            "missing_info_questions": [],
            "expected_output_schema": "status_metric_v1"
        }

        state["analyst_plan"] = analyst_plan
        state["request_type"] = analyst_plan["request_type"]
        state["track"] = analyst_plan["track"]

        assert state["analyst_plan"]["intent"] == "query_sprint_velocity"
        assert state["request_type"] == "STATUS_METRIC"

    def test_guardian_report_flow(self):
        """Test Guardian report creation and validation."""
        from contracts.state import GuardianReport
        from contracts.schemas import validate_role_output

        # Simulate Guardian finding insufficient evidence
        guardian_report: GuardianReport = {
            "verdict": "RETRY",
            "reasons": ["insufficient_evidence_count(<2)"],
            "required_actions": ["RETRIEVE_MORE", "ADD_EVIDENCE"],
            "risk_level": "med"
        }

        is_valid, errors = validate_role_output("GUARDIAN", guardian_report)

        assert is_valid is True
        assert guardian_report["verdict"] == "RETRY"
        assert "RETRIEVE_MORE" in guardian_report["required_actions"]


# =============================================================================
# Run tests
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
