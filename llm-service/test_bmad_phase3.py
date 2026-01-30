"""
BMAD Phase 3 Tests: Analyst Plan

Tests for the Analyst Plan node that generates intent, scope,
and required sources BEFORE retrieval.

Reference: docs/llm-improvement/03-analyst-plan.md
"""

import pytest
import json
from typing import Dict, Any

from nodes.analyst_plan import (
    analyst_plan,
    REQUEST_TYPES,
    TRACKS,
    VALID_SOURCES,
    REQUIRED_SOURCES_BY_TYPE,
    FORBIDDEN_SOURCES_BY_TYPE,
    ANALYST_PROMPT,
    resolve_source_conflicts,
    get_required_sources,
    get_forbidden_sources,
    is_source_allowed,
    enforce_question_limits,
    has_clarification_questions,
    get_clarification_questions,
    get_sources_from_plan,
    get_expected_schema,
    should_skip_retrieval,
)


# =============================================================================
# Mock LLM Functions
# =============================================================================

class MockLLM:
    """Mock LLM that returns predefined responses."""

    def __init__(self, response: str):
        self.response = response
        self.call_count = 0
        self.last_prompt = None

    def __call__(self, prompt: str) -> str:
        self.call_count += 1
        self.last_prompt = prompt
        return self.response


def make_valid_analyst_response(
    intent: str = "test_intent",
    request_type: str = "KNOWLEDGE_QA",
    track: str = "QUALITY",
    sources: list = None,
    questions: list = None,
    schema: str = "answer_v1_markdown"
) -> str:
    """Create a valid JSON response for mock LLM."""
    return json.dumps({
        "intent": intent,
        "request_type": request_type,
        "track": track,
        "required_sources": sources if sources is not None else ["doc", "neo4j"],
        "missing_info_questions": questions if questions is not None else [],
        "expected_output_schema": schema
    })


# =============================================================================
# Test Constants
# =============================================================================

class TestConstants:
    """Test that constants are properly defined."""

    def test_request_types_defined(self):
        """All expected request types should be defined."""
        expected = [
            "STATUS_METRIC", "STATUS_SUMMARY", "STATUS_LIST",
            "HOWTO_POLICY", "DESIGN_ARCH", "DATA_DEFINITION",
            "TROUBLESHOOTING", "KNOWLEDGE_QA", "CASUAL"
        ]
        for rt in expected:
            assert rt in REQUEST_TYPES

    def test_tracks_defined(self):
        """Both FAST and QUALITY tracks should be defined."""
        assert "FAST" in TRACKS
        assert "QUALITY" in TRACKS

    def test_valid_sources_defined(self):
        """All valid sources should be defined."""
        expected = ["db", "neo4j", "doc", "policy"]
        for src in expected:
            assert src in VALID_SOURCES

    def test_required_sources_mapping(self):
        """Required sources should be defined for each type."""
        # STATUS types require db
        assert "db" in REQUIRED_SOURCES_BY_TYPE["STATUS_METRIC"]
        assert "db" in REQUIRED_SOURCES_BY_TYPE["STATUS_SUMMARY"]
        assert "db" in REQUIRED_SOURCES_BY_TYPE["STATUS_LIST"]

        # DESIGN types require doc or policy
        assert "doc" in REQUIRED_SOURCES_BY_TYPE["DESIGN_ARCH"] or \
               "policy" in REQUIRED_SOURCES_BY_TYPE["DESIGN_ARCH"]

        # CASUAL requires nothing
        assert REQUIRED_SOURCES_BY_TYPE["CASUAL"] == []

    def test_forbidden_sources_mapping(self):
        """Forbidden sources should be defined for STATUS types."""
        assert "doc" in FORBIDDEN_SOURCES_BY_TYPE["STATUS_METRIC"]
        assert "doc" in FORBIDDEN_SOURCES_BY_TYPE["STATUS_SUMMARY"]
        assert "doc" in FORBIDDEN_SOURCES_BY_TYPE["STATUS_LIST"]

    def test_analyst_prompt_contains_schema(self):
        """Prompt should contain schema definition."""
        assert "intent" in ANALYST_PROMPT
        assert "request_type" in ANALYST_PROMPT
        assert "required_sources" in ANALYST_PROMPT
        assert "missing_info_questions" in ANALYST_PROMPT


# =============================================================================
# Test Analyst Plan Node
# =============================================================================

class TestAnalystPlan:
    """Test analyst_plan() main function."""

    def test_valid_llm_response(self):
        """Valid LLM response should create analyst_plan in state."""
        state = {"user_query": "What's the sprint completion rate?"}
        mock_llm = MockLLM(make_valid_analyst_response(
            intent="query_sprint_completion",
            request_type="STATUS_METRIC",
            track="QUALITY",
            sources=["db"]
        ))

        result = analyst_plan(state, mock_llm)

        assert "analyst_plan" in result
        assert result["analyst_plan"]["intent"] == "query_sprint_completion"
        assert result["analyst_plan"]["request_type"] == "STATUS_METRIC"
        assert "db" in result["analyst_plan"]["required_sources"]

    def test_syncs_request_type_to_state(self):
        """Analyst plan should sync request_type to state."""
        state = {"user_query": "test"}
        mock_llm = MockLLM(make_valid_analyst_response(request_type="DESIGN_ARCH"))

        result = analyst_plan(state, mock_llm)

        assert result["request_type"] == "DESIGN_ARCH"

    def test_syncs_track_to_state(self):
        """Analyst plan should sync track to state."""
        state = {"user_query": "test"}
        mock_llm = MockLLM(make_valid_analyst_response(track="QUALITY"))

        result = analyst_plan(state, mock_llm)

        assert result["track"] == "QUALITY"

    def test_no_llm_fn_uses_fallback(self):
        """No LLM function should trigger fallback."""
        state = {"user_query": "test"}

        result = analyst_plan(state, None)

        assert "analyst_plan" in result
        assert result["analyst_plan"]["track"] == "QUALITY"
        assert "route_reason" in result
        assert "fallback" in result["route_reason"]

    def test_llm_error_uses_fallback(self):
        """LLM error should trigger fallback."""
        state = {"user_query": "test"}

        def failing_llm(prompt):
            raise Exception("LLM connection failed")

        result = analyst_plan(state, failing_llm)

        assert "analyst_plan" in result
        assert "route_reason" in result
        assert "llm_error" in result["route_reason"]

    def test_invalid_json_uses_fallback(self):
        """Invalid JSON should trigger fallback."""
        state = {"user_query": "test"}
        mock_llm = MockLLM("This is not valid JSON")

        result = analyst_plan(state, mock_llm)

        assert "analyst_plan" in result
        assert "route_reason" in result
        assert "fallback" in result["route_reason"]

    def test_prompt_includes_user_query(self):
        """Prompt should include the user query."""
        state = {"user_query": "What is the project status?"}
        mock_llm = MockLLM(make_valid_analyst_response())

        analyst_plan(state, mock_llm)

        assert mock_llm.last_prompt is not None
        assert "What is the project status?" in mock_llm.last_prompt


# =============================================================================
# Test Fallback Plan
# =============================================================================

class TestFallbackPlan:
    """Test _fallback_plan() behavior."""

    def test_fallback_uses_quality_track(self):
        """Fallback should default to QUALITY track."""
        state = {"user_query": "test"}
        mock_llm = MockLLM("invalid json")

        result = analyst_plan(state, mock_llm)

        assert result["analyst_plan"]["track"] == "QUALITY"

    def test_fallback_preserves_existing_request_type(self):
        """Fallback should preserve existing request_type if set."""
        state = {"user_query": "test", "request_type": "STATUS_METRIC"}
        mock_llm = MockLLM("invalid json")

        result = analyst_plan(state, mock_llm)

        assert result["analyst_plan"]["request_type"] == "STATUS_METRIC"

    def test_fallback_sets_route_reason(self):
        """Fallback should set route_reason."""
        state = {"user_query": "test"}
        mock_llm = MockLLM("invalid json")

        result = analyst_plan(state, mock_llm)

        assert "route_reason" in result
        assert "analyst_plan_fallback" in result["route_reason"]


# =============================================================================
# Test Source Conflict Resolution
# =============================================================================

class TestSourceConflictResolution:
    """Test resolve_source_conflicts() function."""

    def test_status_metric_removes_doc(self):
        """STATUS_METRIC should have doc removed from sources."""
        plan = {
            "request_type": "STATUS_METRIC",
            "required_sources": ["db", "doc"]
        }

        result = resolve_source_conflicts(plan)

        assert "doc" not in result["required_sources"]
        assert "db" in result["required_sources"]

    def test_status_summary_removes_doc(self):
        """STATUS_SUMMARY should have doc removed from sources."""
        plan = {
            "request_type": "STATUS_SUMMARY",
            "required_sources": ["doc", "neo4j"]
        }

        result = resolve_source_conflicts(plan)

        assert "doc" not in result["required_sources"]

    def test_status_list_removes_doc(self):
        """STATUS_LIST should have doc removed from sources."""
        plan = {
            "request_type": "STATUS_LIST",
            "required_sources": ["doc"]
        }

        result = resolve_source_conflicts(plan)

        assert "doc" not in result["required_sources"]
        # Should add db as required
        assert "db" in result["required_sources"]

    def test_adds_required_sources(self):
        """Should add required sources if missing."""
        plan = {
            "request_type": "STATUS_METRIC",
            "required_sources": []
        }

        result = resolve_source_conflicts(plan)

        assert "db" in result["required_sources"]

    def test_design_arch_keeps_doc(self):
        """DESIGN_ARCH should keep doc in sources."""
        plan = {
            "request_type": "DESIGN_ARCH",
            "required_sources": ["doc", "policy"]
        }

        result = resolve_source_conflicts(plan)

        assert "doc" in result["required_sources"]
        assert "policy" in result["required_sources"]

    def test_casual_no_required_sources(self):
        """CASUAL should not require any sources."""
        plan = {
            "request_type": "CASUAL",
            "required_sources": []
        }

        result = resolve_source_conflicts(plan)

        assert result["required_sources"] == []


class TestSourceHelpers:
    """Test source helper functions."""

    def test_get_required_sources(self):
        """get_required_sources should return correct sources."""
        assert "db" in get_required_sources("STATUS_METRIC")
        assert "doc" in get_required_sources("DESIGN_ARCH")
        assert get_required_sources("CASUAL") == []

    def test_get_forbidden_sources(self):
        """get_forbidden_sources should return correct sources."""
        assert "doc" in get_forbidden_sources("STATUS_METRIC")
        assert get_forbidden_sources("DESIGN_ARCH") == []

    def test_is_source_allowed_true(self):
        """is_source_allowed should return True for allowed sources."""
        assert is_source_allowed("STATUS_METRIC", "db")
        assert is_source_allowed("DESIGN_ARCH", "doc")
        assert is_source_allowed("CASUAL", "anything")

    def test_is_source_allowed_false(self):
        """is_source_allowed should return False for forbidden sources."""
        assert not is_source_allowed("STATUS_METRIC", "doc")
        assert not is_source_allowed("STATUS_SUMMARY", "doc")


# =============================================================================
# Test Question Limits
# =============================================================================

class TestQuestionLimits:
    """Test enforce_question_limits() function."""

    def test_fast_track_removes_questions(self):
        """FAST track should have all questions removed."""
        plan = {
            "track": "FAST",
            "missing_info_questions": ["Question 1", "Question 2"]
        }

        result = enforce_question_limits(plan)

        assert result["missing_info_questions"] == []

    def test_quality_track_max_one_question(self):
        """QUALITY track should have max 1 question."""
        plan = {
            "track": "QUALITY",
            "missing_info_questions": ["Q1", "Q2", "Q3"]
        }

        result = enforce_question_limits(plan)

        assert len(result["missing_info_questions"]) == 1
        assert result["missing_info_questions"][0] == "Q1"

    def test_quality_track_keeps_single_question(self):
        """QUALITY track should keep single question."""
        plan = {
            "track": "QUALITY",
            "missing_info_questions": ["Which sprint?"]
        }

        result = enforce_question_limits(plan)

        assert result["missing_info_questions"] == ["Which sprint?"]

    def test_empty_questions_unchanged(self):
        """Empty questions should remain empty."""
        plan = {
            "track": "QUALITY",
            "missing_info_questions": []
        }

        result = enforce_question_limits(plan)

        assert result["missing_info_questions"] == []


class TestQuestionHelpers:
    """Test question helper functions."""

    def test_has_clarification_questions_true(self):
        """has_clarification_questions should return True when questions exist."""
        state = {
            "analyst_plan": {
                "missing_info_questions": ["Which sprint?"]
            }
        }

        assert has_clarification_questions(state) is True

    def test_has_clarification_questions_false(self):
        """has_clarification_questions should return False when no questions."""
        state = {
            "analyst_plan": {
                "missing_info_questions": []
            }
        }

        assert has_clarification_questions(state) is False

    def test_has_clarification_questions_no_plan(self):
        """has_clarification_questions should return False when no plan."""
        state = {}

        assert has_clarification_questions(state) is False

    def test_get_clarification_questions(self):
        """get_clarification_questions should return questions list."""
        state = {
            "analyst_plan": {
                "missing_info_questions": ["Q1", "Q2"]
            }
        }

        result = get_clarification_questions(state)

        assert result == ["Q1", "Q2"]

    def test_get_clarification_questions_empty(self):
        """get_clarification_questions should return empty list when no plan."""
        state = {}

        result = get_clarification_questions(state)

        assert result == []


# =============================================================================
# Test Track Conflict Resolution
# =============================================================================

class TestTrackConflictResolution:
    """Test track conflict resolution between Router and Analyst."""

    def test_analyst_can_promote_to_quality(self):
        """Analyst should be able to promote FAST to QUALITY."""
        state = {"user_query": "test", "track": "FAST"}
        mock_llm = MockLLM(make_valid_analyst_response(track="QUALITY"))

        result = analyst_plan(state, mock_llm)

        assert result["track"] == "QUALITY"

    def test_high_stakes_types_force_quality(self):
        """High-stakes types should always use QUALITY."""
        state = {"user_query": "test", "track": "FAST"}
        mock_llm = MockLLM(make_valid_analyst_response(
            request_type="DESIGN_ARCH",
            track="FAST"
        ))

        result = analyst_plan(state, mock_llm)

        assert result["track"] == "QUALITY"

    def test_casual_can_use_fast(self):
        """CASUAL requests can use FAST track."""
        state = {"user_query": "hi"}
        mock_llm = MockLLM(make_valid_analyst_response(
            request_type="CASUAL",
            track="FAST",
            sources=[]
        ))

        result = analyst_plan(state, mock_llm)

        assert result["track"] == "FAST"


# =============================================================================
# Test Retrieve Integration Helpers
# =============================================================================

class TestRetrieveIntegration:
    """Test helper functions for Retrieve node integration."""

    def test_get_sources_from_plan(self):
        """get_sources_from_plan should return required_sources."""
        state = {
            "analyst_plan": {
                "required_sources": ["db", "neo4j"]
            }
        }

        result = get_sources_from_plan(state)

        assert result == ["db", "neo4j"]

    def test_get_sources_from_plan_empty(self):
        """get_sources_from_plan should return empty list when no plan."""
        state = {}

        result = get_sources_from_plan(state)

        assert result == []

    def test_get_expected_schema(self):
        """get_expected_schema should return expected_output_schema."""
        state = {
            "analyst_plan": {
                "expected_output_schema": "status_metric_v1_json"
            }
        }

        result = get_expected_schema(state)

        assert result == "status_metric_v1_json"

    def test_get_expected_schema_default(self):
        """get_expected_schema should return default when not set."""
        state = {}

        result = get_expected_schema(state)

        assert result == "answer_v1_markdown"

    def test_should_skip_retrieval_casual(self):
        """should_skip_retrieval should return True for CASUAL."""
        state = {
            "analyst_plan": {
                "request_type": "CASUAL"
            }
        }

        assert should_skip_retrieval(state) is True

    def test_should_skip_retrieval_non_casual(self):
        """should_skip_retrieval should return False for non-CASUAL."""
        state = {
            "analyst_plan": {
                "request_type": "STATUS_METRIC"
            }
        }

        assert should_skip_retrieval(state) is False


# =============================================================================
# Test Request Type Specific Behaviors
# =============================================================================

class TestRequestTypeSpecific:
    """Test behaviors specific to each request type."""

    def test_status_metric_no_doc(self):
        """STATUS_METRIC should not include doc in sources."""
        state = {"user_query": "What's the completion rate?"}
        mock_llm = MockLLM(make_valid_analyst_response(
            request_type="STATUS_METRIC",
            sources=["db", "doc"]  # LLM incorrectly includes doc
        ))

        result = analyst_plan(state, mock_llm)

        # Source conflict resolution should remove doc
        assert "doc" not in result["analyst_plan"]["required_sources"]
        assert "db" in result["analyst_plan"]["required_sources"]

    def test_design_arch_requires_doc_or_policy(self):
        """DESIGN_ARCH should include doc or policy."""
        state = {"user_query": "Design the auth module"}
        mock_llm = MockLLM(make_valid_analyst_response(
            request_type="DESIGN_ARCH",
            sources=[]  # LLM returns empty sources
        ))

        result = analyst_plan(state, mock_llm)

        sources = result["analyst_plan"]["required_sources"]
        assert "doc" in sources or "policy" in sources

    def test_troubleshooting_sources(self):
        """TROUBLESHOOTING should include db and neo4j."""
        state = {"user_query": "Why is the API failing?"}
        mock_llm = MockLLM(make_valid_analyst_response(
            request_type="TROUBLESHOOTING",
            sources=[]
        ))

        result = analyst_plan(state, mock_llm)

        sources = result["analyst_plan"]["required_sources"]
        # Should add required sources
        assert "db" in sources or "neo4j" in sources


# =============================================================================
# Test Integration
# =============================================================================

class TestPhase3Integration:
    """Integration tests for Phase 3."""

    def test_full_analyst_flow_status_metric(self):
        """Full flow for STATUS_METRIC query."""
        state = {
            "user_query": "What is the sprint velocity?",
            "request_type": "STATUS_METRIC",
            "track": "QUALITY"
        }
        mock_llm = MockLLM(make_valid_analyst_response(
            intent="query_sprint_velocity",
            request_type="STATUS_METRIC",
            track="QUALITY",
            sources=["db"],
            schema="status_metric_v1_json"
        ))

        result = analyst_plan(state, mock_llm)

        # Validate full state
        assert result["analyst_plan"]["intent"] == "query_sprint_velocity"
        assert result["request_type"] == "STATUS_METRIC"
        assert result["track"] == "QUALITY"
        assert "db" in get_sources_from_plan(result)
        assert not should_skip_retrieval(result)
        assert not has_clarification_questions(result)

    def test_full_analyst_flow_with_question(self):
        """Full flow with clarification question."""
        state = {
            "user_query": "Show me the metrics",
            "track": "QUALITY"
        }
        mock_llm = MockLLM(make_valid_analyst_response(
            intent="unclear_metric_request",
            request_type="STATUS_METRIC",
            track="QUALITY",
            sources=["db"],
            questions=["Which specific metrics are you interested in?"]
        ))

        result = analyst_plan(state, mock_llm)

        assert has_clarification_questions(result)
        questions = get_clarification_questions(result)
        assert len(questions) == 1

    def test_full_analyst_flow_casual(self):
        """Full flow for CASUAL query."""
        state = {
            "user_query": "Hello!",
            "track": "FAST"
        }
        mock_llm = MockLLM(make_valid_analyst_response(
            intent="greeting",
            request_type="CASUAL",
            track="FAST",
            sources=[],
            schema="casual_v1"
        ))

        result = analyst_plan(state, mock_llm)

        assert result["request_type"] == "CASUAL"
        assert result["track"] == "FAST"
        assert should_skip_retrieval(result)
        assert get_sources_from_plan(result) == []

    def test_package_imports(self):
        """All Phase 3 exports should be importable from nodes package."""
        from nodes import (
            analyst_plan,
            REQUEST_TYPES,
            TRACKS,
            VALID_SOURCES,
            REQUIRED_SOURCES_BY_TYPE,
            FORBIDDEN_SOURCES_BY_TYPE,
            resolve_source_conflicts,
            get_required_sources,
            get_forbidden_sources,
            is_source_allowed,
            enforce_question_limits,
            has_clarification_questions,
            get_clarification_questions,
            get_sources_from_plan,
            get_expected_schema,
            should_skip_retrieval,
        )

        # Verify they are callable/accessible
        assert callable(analyst_plan)
        assert callable(resolve_source_conflicts)
        assert isinstance(REQUEST_TYPES, list)


# =============================================================================
# Run Tests
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
