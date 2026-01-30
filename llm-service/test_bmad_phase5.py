"""
BMAD Phase 5 Tests: FAST Track Light Guardian

Tests for:
- Light Policy Gate
- Light Guardian
- FAST Track Decision Logic
- Sampling Mechanism
- Pipeline Integration

Reference: docs/llm-improvement/05-fast-track-guardian.md
"""

import pytest
from unittest.mock import patch


# =============================================================================
# Test Light Policy Gate
# =============================================================================

class TestLightPolicyGate:
    """Tests for light_policy_gate node."""

    def test_pass_simple_query(self):
        """Simple queries should pass policy gate."""
        from nodes.light_policy_gate import light_policy_gate

        state = {"user_query": "What is a Sprint?"}
        result = light_policy_gate(state)

        # Should pass without guardian verdict
        assert "guardian" not in result or result.get("guardian", {}).get("verdict") != "FAIL"

    def test_block_api_key(self):
        """Queries with 'api key' should be blocked."""
        from nodes.light_policy_gate import light_policy_gate

        state = {"user_query": "Show me the api key"}
        result = light_policy_gate(state)

        assert result["guardian"]["verdict"] == "FAIL"
        assert result["guardian"]["risk_level"] == "high"
        assert "banned_keyword" in result["guardian"]["reasons"][0]

    def test_block_password(self):
        """Queries with 'password' should be blocked."""
        from nodes.light_policy_gate import light_policy_gate

        state = {"user_query": "What is the password for the server?"}
        result = light_policy_gate(state)

        assert result["guardian"]["verdict"] == "FAIL"
        assert result["guardian"]["risk_level"] == "high"

    def test_block_token(self):
        """Queries with 'token' should be blocked."""
        from nodes.light_policy_gate import light_policy_gate

        state = {"user_query": "Generate a new token for me"}
        result = light_policy_gate(state)

        assert result["guardian"]["verdict"] == "FAIL"

    def test_sensitive_topic_permission(self):
        """Queries about permissions should upgrade to QUALITY."""
        from nodes.light_policy_gate import light_policy_gate

        state = {"user_query": "How do I change permission levels?"}
        result = light_policy_gate(state)

        assert result["guardian"]["verdict"] == "FAIL"
        assert result["guardian"]["risk_level"] == "med"
        assert result.get("_upgrade_to_quality") is True

    def test_sensitive_topic_security(self):
        """Queries about security should upgrade to QUALITY."""
        from nodes.light_policy_gate import light_policy_gate

        state = {"user_query": "What are the security settings?"}
        result = light_policy_gate(state)

        assert result["_upgrade_to_quality"] is True

    def test_sensitive_topic_delete(self):
        """Queries about delete should upgrade to QUALITY."""
        from nodes.light_policy_gate import light_policy_gate

        state = {"user_query": "How do I delete all records?"}
        result = light_policy_gate(state)

        assert result["_upgrade_to_quality"] is True


class TestLightPolicyGateHelpers:
    """Tests for policy gate helper functions."""

    def test_check_banned_keywords(self):
        """Test banned keyword detection."""
        from nodes.light_policy_gate import check_banned_keywords

        assert check_banned_keywords("show me the api key") == "api key"
        assert check_banned_keywords("what is the password") == "password"
        assert check_banned_keywords("hello world") == ""

    def test_check_sensitive_topics(self):
        """Test sensitive topic detection."""
        from nodes.light_policy_gate import check_sensitive_topics

        assert check_sensitive_topics("change permission") == "permission"
        assert check_sensitive_topics("security audit") == "security"
        assert check_sensitive_topics("hello world") == ""

    def test_is_policy_blocked(self):
        """Test policy blocked check."""
        from nodes.light_policy_gate import is_policy_blocked

        blocked_state = {"guardian": {"verdict": "FAIL"}}
        passed_state = {"guardian": {"verdict": "PASS"}}
        empty_state = {}

        assert is_policy_blocked(blocked_state) is True
        assert is_policy_blocked(passed_state) is False
        assert is_policy_blocked(empty_state) is False

    def test_is_upgrade_required(self):
        """Test upgrade required check."""
        from nodes.light_policy_gate import is_upgrade_required

        upgrade_state = {"_upgrade_to_quality": True}
        no_upgrade_state = {}

        assert is_upgrade_required(upgrade_state) is True
        assert is_upgrade_required(no_upgrade_state) is False


# =============================================================================
# Test Light Guardian
# =============================================================================

class TestLightGuardian:
    """Tests for light_guardian node."""

    def test_pass_simple_response(self):
        """Simple responses should pass Light Guardian."""
        from nodes.light_guardian import light_guardian

        state = {
            "user_query": "What is a Sprint?",
            "track": "FAST",
            "draft_answer": "A Sprint is a time-boxed iteration in Scrum methodology.",
            "evidence": []
        }
        result = light_guardian(state)

        assert result["guardian"]["verdict"] == "PASS"

    def test_fail_response_too_short(self):
        """Too short responses should fail."""
        from nodes.light_guardian import light_guardian

        state = {
            "user_query": "What is Scrum?",
            "track": "FAST",
            "draft_answer": "It is agile.",
            "evidence": []
        }
        result = light_guardian(state)

        assert result["guardian"]["verdict"] == "FAIL"
        assert "response_too_short" in result["guardian"]["reasons"]

    def test_fail_numbers_without_evidence(self):
        """Numbers without evidence should fail."""
        from nodes.light_guardian import light_guardian

        state = {
            "user_query": "What's the completion rate?",
            "track": "FAST",
            "draft_answer": "The completion rate is 85%.",
            "evidence": []
        }
        result = light_guardian(state)

        assert result["guardian"]["verdict"] == "FAIL"
        assert "numbers_without_evidence_in_fast_track" in result["guardian"]["reasons"]

    def test_pass_numbers_with_evidence(self):
        """Numbers with evidence should pass."""
        from nodes.light_guardian import light_guardian

        state = {
            "user_query": "What's the completion rate?",
            "track": "FAST",
            "draft_answer": "The completion rate is 85% based on database query.",
            "evidence": [{"source": "neo4j", "content": "85%"}]
        }
        result = light_guardian(state)

        assert result["guardian"]["verdict"] == "PASS"

    def test_fail_sensitive_content(self):
        """Sensitive content in response should fail."""
        from nodes.light_guardian import light_guardian

        state = {
            "user_query": "Show me the config",
            "track": "FAST",
            "draft_answer": "Here's the api_key: sk-123456789abcdef",
            "evidence": []
        }
        result = light_guardian(state)

        assert result["guardian"]["verdict"] == "FAIL"
        assert result["guardian"]["risk_level"] == "high"
        assert "potential_sensitive_leak" in result["guardian"]["reasons"]

    def test_fail_password_leak(self):
        """Password in response should fail."""
        from nodes.light_guardian import light_guardian

        state = {
            "draft_answer": "The password is admin123 for the system.",
            "evidence": []
        }
        result = light_guardian(state)

        assert result["guardian"]["verdict"] == "FAIL"
        assert result["guardian"]["risk_level"] == "high"

    def test_fail_definitive_claim_without_evidence(self):
        """Definitive claims without evidence should fail."""
        from nodes.light_guardian import light_guardian

        state = {
            "draft_answer": "This method is definitely the best approach for your problem.",
            "evidence": []
        }
        result = light_guardian(state)

        assert result["guardian"]["verdict"] == "FAIL"
        assert "definitive_claim_without_strong_evidence" in result["guardian"]["reasons"]

    def test_pass_definitive_claim_with_evidence(self):
        """Definitive claims with sufficient evidence should pass."""
        from nodes.light_guardian import light_guardian

        state = {
            "draft_answer": "This method is definitely the best approach for your problem.",
            "evidence": [
                {"source": "doc", "content": "approach 1"},
                {"source": "neo4j", "content": "approach 2"}
            ]
        }
        result = light_guardian(state)

        assert result["guardian"]["verdict"] == "PASS"


class TestLightGuardianChecks:
    """Tests for Light Guardian check functions."""

    def test_check_sensitive_leak(self):
        """Test sensitive leak detection."""
        from nodes.light_guardian import check_sensitive_leak

        assert check_sensitive_leak("password: abc123") == "password"
        assert check_sensitive_leak("api key: sk-123") == "api[_\\s]?key"
        assert check_sensitive_leak("hello world") == ""

    def test_check_definitive_claims(self):
        """Test definitive claims detection."""
        from nodes.light_guardian import check_definitive_claims

        assert check_definitive_claims("This is definitely true.", []) == "definitely"
        assert check_definitive_claims("This is absolutely correct.", []) == "absolutely"
        assert check_definitive_claims("This might work.", []) == ""

        # With evidence, should not flag
        evidence = [{"a": 1}, {"b": 2}]
        assert check_definitive_claims("This is definitely true.", evidence) == ""


# =============================================================================
# Test Light Guardian Sampling
# =============================================================================

class TestLightGuardianSampling:
    """Tests for Light Guardian sampling mechanism."""

    def test_should_apply_light_guardian(self):
        """Test sampling function."""
        from nodes.light_guardian import should_apply_light_guardian

        # Run multiple times to verify it returns boolean
        results = [should_apply_light_guardian() for _ in range(100)]
        assert all(isinstance(r, bool) for r in results)

    def test_light_guardian_with_sampling_skip(self):
        """Test sampling skip scenario."""
        from nodes.light_guardian import light_guardian_with_sampling

        with patch('nodes.light_guardian.should_apply_light_guardian', return_value=False):
            state = {"draft_answer": "test", "evidence": []}
            result = light_guardian_with_sampling(state)

            assert result["guardian"]["verdict"] == "PASS"
            assert "sampling_skip" in result["guardian"]["reasons"]

    def test_light_guardian_with_sampling_apply(self):
        """Test sampling apply scenario."""
        from nodes.light_guardian import light_guardian_with_sampling

        with patch('nodes.light_guardian.should_apply_light_guardian', return_value=True):
            state = {
                "draft_answer": "A Sprint is a time-boxed iteration.",
                "evidence": []
            }
            result = light_guardian_with_sampling(state)

            # Should actually apply the guardian
            assert result["guardian"]["verdict"] == "PASS"
            assert "sampling_skip" not in result["guardian"]["reasons"]

    def test_set_and_get_sampling_rate(self):
        """Test sampling rate setters and getters."""
        from nodes.light_guardian import set_sampling_rate, get_sampling_rate

        original_rate = get_sampling_rate()

        set_sampling_rate(0.5)
        assert get_sampling_rate() == 0.5

        set_sampling_rate(1.5)  # Should be clamped to 1.0
        assert get_sampling_rate() == 1.0

        set_sampling_rate(-0.5)  # Should be clamped to 0.0
        assert get_sampling_rate() == 0.0

        # Restore original
        set_sampling_rate(original_rate)


# =============================================================================
# Test FAST Track Decision Logic
# =============================================================================

class TestFastGuardDecision:
    """Tests for FAST track decision logic."""

    def test_decision_pass_end(self):
        """PASS verdict should return 'end'."""
        from nodes.fast_track import fast_guard_decision

        state = {
            "guardian": {"verdict": "PASS"},
            "draft_answer": "This is the answer."
        }
        decision = fast_guard_decision(state)

        assert decision == "end"
        assert state["final_answer"] == "This is the answer."

    def test_decision_fail_upgrade_design(self):
        """FAIL with DESIGN_ARCH should upgrade."""
        from nodes.fast_track import fast_guard_decision

        state = {
            "guardian": {"verdict": "FAIL"},
            "request_type": "DESIGN_ARCH"
        }
        decision = fast_guard_decision(state)

        assert decision == "upgrade"

    def test_decision_fail_upgrade_troubleshooting(self):
        """FAIL with TROUBLESHOOTING should upgrade."""
        from nodes.fast_track import fast_guard_decision

        state = {
            "guardian": {"verdict": "FAIL"},
            "request_type": "TROUBLESHOOTING"
        }
        decision = fast_guard_decision(state)

        assert decision == "upgrade"

    def test_decision_fail_upgrade_marked(self):
        """FAIL with _upgrade_to_quality should upgrade."""
        from nodes.fast_track import fast_guard_decision

        state = {
            "guardian": {"verdict": "FAIL"},
            "_upgrade_to_quality": True
        }
        decision = fast_guard_decision(state)

        assert decision == "upgrade"

    def test_decision_fail_safe_exit(self):
        """FAIL without upgrade triggers should safe exit."""
        from nodes.fast_track import fast_guard_decision

        state = {
            "guardian": {"verdict": "FAIL"},
            "request_type": "CASUAL"
        }
        decision = fast_guard_decision(state)

        assert decision == "safe_exit"


class TestFastTrackHelpers:
    """Tests for FAST track helper functions."""

    def test_apply_safe_exit(self):
        """Test safe exit application."""
        from nodes.fast_track import apply_safe_exit, SAFE_EXIT_MESSAGE

        state = {}
        result = apply_safe_exit(state)

        assert result["final_answer"] == SAFE_EXIT_MESSAGE
        assert result["_safe_exit"] is True

    def test_is_safe_exit(self):
        """Test safe exit check."""
        from nodes.fast_track import is_safe_exit

        assert is_safe_exit({"_safe_exit": True}) is True
        assert is_safe_exit({"_safe_exit": False}) is False
        assert is_safe_exit({}) is False

    def test_is_fast_track(self):
        """Test FAST track check."""
        from nodes.fast_track import is_fast_track

        assert is_fast_track({"track": "FAST"}) is True
        assert is_fast_track({"track": "fast"}) is True
        assert is_fast_track({"track": "QUALITY"}) is False
        assert is_fast_track({}) is False

    def test_mark_for_quality_upgrade(self):
        """Test marking for quality upgrade."""
        from nodes.fast_track import mark_for_quality_upgrade

        state = {}
        result = mark_for_quality_upgrade(state)

        assert result["_upgrade_to_quality"] is True

    def test_should_upgrade_to_quality(self):
        """Test upgrade to quality check."""
        from nodes.fast_track import should_upgrade_to_quality

        upgrade_state = {
            "guardian": {"verdict": "FAIL"},
            "request_type": "DESIGN_ARCH"
        }
        no_upgrade_state = {
            "guardian": {"verdict": "PASS"}
        }

        assert should_upgrade_to_quality(upgrade_state) is True
        assert should_upgrade_to_quality(no_upgrade_state) is False


# =============================================================================
# Test FAST Generation
# =============================================================================

class TestFastGeneration:
    """Tests for FAST track generation."""

    def test_generate_fast_answer_with_llm(self):
        """Test generation with LLM."""
        from nodes.fast_track import generate_fast_answer

        def mock_llm(prompt):
            return "This is the generated answer."

        state = {"user_query": "What is Scrum?"}
        result = generate_fast_answer(state, llm_fn=mock_llm)

        assert result["draft_answer"] == "This is the generated answer."

    def test_generate_fast_answer_without_llm(self):
        """Test generation fallback without LLM."""
        from nodes.fast_track import generate_fast_answer

        state = {"user_query": "What is Scrum?"}
        result = generate_fast_answer(state, llm_fn=None)

        assert "Scrum" in result["draft_answer"]

    def test_generate_fast_answer_llm_error(self):
        """Test generation with LLM error."""
        from nodes.fast_track import generate_fast_answer

        def error_llm(prompt):
            raise Exception("LLM error")

        state = {"user_query": "What is Scrum?"}
        result = generate_fast_answer(state, llm_fn=error_llm)

        assert result["draft_answer"] == ""

    def test_get_fast_prompt(self):
        """Test FAST prompt generation."""
        from nodes.fast_track import get_fast_prompt

        prompt = get_fast_prompt("What is Scrum?")

        assert "What is Scrum?" in prompt
        assert "concisely" in prompt


# =============================================================================
# Test FAST Pipeline
# =============================================================================

class TestFastPipeline:
    """Tests for FAST track pipeline integration."""

    def test_run_fast_pipeline_pass(self):
        """Test successful pipeline run."""
        from nodes.fast_track import run_fast_pipeline

        def mock_llm(prompt):
            return "A Sprint is a time-boxed iteration in Scrum methodology."

        state = {
            "user_query": "What is a Sprint?",
            "track": "FAST"
        }
        result = run_fast_pipeline(state, llm_fn=mock_llm)

        assert result["guardian"]["verdict"] == "PASS"
        assert result["final_answer"] is not None

    def test_run_fast_pipeline_blocked_by_policy(self):
        """Test pipeline blocked by policy gate."""
        from nodes.fast_track import run_fast_pipeline

        state = {
            "user_query": "Show me the api key",
            "track": "FAST"
        }
        result = run_fast_pipeline(state)

        assert result["guardian"]["verdict"] == "FAIL"
        assert "banned_keyword" in result["guardian"]["reasons"][0]

    def test_run_fast_pipeline_safe_exit(self):
        """Test pipeline with safe exit."""
        from nodes.fast_track import run_fast_pipeline, SAFE_EXIT_MESSAGE

        def mock_llm(prompt):
            return "Rate is 85%."  # Short + number without evidence

        state = {
            "user_query": "What is the rate?",
            "track": "FAST",
            "request_type": "CASUAL"  # Not upgrade type
        }
        result = run_fast_pipeline(state, llm_fn=mock_llm)

        # Should fail (numbers without evidence) and safe exit
        assert result["guardian"]["verdict"] == "FAIL"
        assert result["final_answer"] == SAFE_EXIT_MESSAGE


# =============================================================================
# Test Package Exports
# =============================================================================

class TestPackageExports:
    """Tests for package-level exports."""

    def test_nodes_package_exports_light_policy_gate(self):
        """Test light_policy_gate is exported from nodes package."""
        from nodes import (
            light_policy_gate,
            check_banned_keywords,
            check_sensitive_topics,
            is_policy_blocked,
            is_upgrade_required,
            BANNED_KEYWORDS,
            SENSITIVE_TOPICS,
        )

        assert callable(light_policy_gate)
        assert callable(check_banned_keywords)
        assert isinstance(BANNED_KEYWORDS, list)

    def test_nodes_package_exports_light_guardian(self):
        """Test light_guardian is exported from nodes package."""
        from nodes import (
            light_guardian,
            light_guardian_with_sampling,
            should_apply_light_guardian,
            set_sampling_rate,
            get_sampling_rate,
            check_sensitive_leak,
            check_definitive_claims,
            SENSITIVE_PATTERNS,
            DEFINITIVE_PHRASES,
        )

        assert callable(light_guardian)
        assert callable(light_guardian_with_sampling)
        assert isinstance(SENSITIVE_PATTERNS, list)

    def test_nodes_package_exports_fast_track(self):
        """Test fast_track is exported from nodes package."""
        from nodes import (
            fast_guard_decision,
            apply_safe_exit,
            should_upgrade_to_quality,
            is_safe_exit,
            generate_fast_answer,
            get_fast_prompt,
            run_fast_pipeline,
            is_fast_track,
            mark_for_quality_upgrade,
            UPGRADE_REQUEST_TYPES,
            SAFE_EXIT_MESSAGE,
            FAST_PROMPT,
        )

        assert callable(fast_guard_decision)
        assert callable(run_fast_pipeline)
        assert isinstance(UPGRADE_REQUEST_TYPES, list)


# =============================================================================
# Test Constants
# =============================================================================

class TestConstants:
    """Tests for Phase 5 constants."""

    def test_banned_keywords_list(self):
        """Test BANNED_KEYWORDS constant."""
        from nodes.light_policy_gate import BANNED_KEYWORDS

        assert "api key" in BANNED_KEYWORDS
        assert "password" in BANNED_KEYWORDS
        assert "token" in BANNED_KEYWORDS
        assert len(BANNED_KEYWORDS) >= 5

    def test_sensitive_topics_list(self):
        """Test SENSITIVE_TOPICS constant."""
        from nodes.light_policy_gate import SENSITIVE_TOPICS

        assert "permission" in SENSITIVE_TOPICS
        assert "security" in SENSITIVE_TOPICS
        assert "delete" in SENSITIVE_TOPICS

    def test_upgrade_request_types(self):
        """Test UPGRADE_REQUEST_TYPES constant."""
        from nodes.fast_track import UPGRADE_REQUEST_TYPES

        assert "DESIGN_ARCH" in UPGRADE_REQUEST_TYPES
        assert "TROUBLESHOOTING" in UPGRADE_REQUEST_TYPES
        assert "HOWTO_POLICY" in UPGRADE_REQUEST_TYPES

    def test_sensitive_patterns(self):
        """Test SENSITIVE_PATTERNS constant."""
        from nodes.light_guardian import SENSITIVE_PATTERNS

        assert any("password" in p for p in SENSITIVE_PATTERNS)
        assert any("secret" in p for p in SENSITIVE_PATTERNS)

    def test_definitive_phrases(self):
        """Test DEFINITIVE_PHRASES constant."""
        from nodes.light_guardian import DEFINITIVE_PHRASES

        assert any("definitely" in p for p in DEFINITIVE_PHRASES)
        assert any("absolutely" in p for p in DEFINITIVE_PHRASES)


# =============================================================================
# Run tests
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
