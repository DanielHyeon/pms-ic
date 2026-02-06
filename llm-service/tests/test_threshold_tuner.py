"""
Tests for threshold auto-tuner.

Phase 3: Threshold Auto-Tuning
"""

import pytest
from unittest.mock import MagicMock

from config.constants import NormalizationConfig
from services.threshold_tuner import (
    ThresholdTuner,
    ThresholdRecommendation,
    TuningSignal,
    KEYWORD_TO_GROUP,
    DEFAULT_GROUP_THRESHOLDS,
    get_keyword_threshold,
    get_keyword_group,
    init_threshold_tuner,
    get_threshold_tuner,
)


# =============================================================================
# Config
# =============================================================================

def _enabled_config():
    return NormalizationConfig(ENABLE_THRESHOLD_TUNING=True)


def _disabled_config():
    return NormalizationConfig(ENABLE_THRESHOLD_TUNING=False)


# =============================================================================
# Keyword Group Mapping Tests
# =============================================================================

class TestKeywordGroups:
    def test_domain_fixed_keywords(self):
        assert KEYWORD_TO_GROUP["스프린트"] == "domain_fixed"
        assert KEYWORD_TO_GROUP["sprint"] == "domain_fixed"
        assert KEYWORD_TO_GROUP["백로그"] == "domain_fixed"
        assert KEYWORD_TO_GROUP["backlog"] == "domain_fixed"
        assert KEYWORD_TO_GROUP["태스크"] == "domain_fixed"
        assert KEYWORD_TO_GROUP["task"] == "domain_fixed"
        # "리스크"/"risk" moved to ambiguous (jamo_sim("리스크","리스트")=0.833 > 0.80)
        assert KEYWORD_TO_GROUP["리스크"] == "ambiguous"
        assert KEYWORD_TO_GROUP["risk"] == "ambiguous"

    def test_ambiguous_keywords(self):
        assert KEYWORD_TO_GROUP["테스트 중"] == "ambiguous"
        assert KEYWORD_TO_GROUP["검토 중"] == "ambiguous"
        assert KEYWORD_TO_GROUP["진행 중"] == "ambiguous"
        assert KEYWORD_TO_GROUP["in review"] == "ambiguous"

    def test_time_context_keywords(self):
        assert KEYWORD_TO_GROUP["이번 주"] == "time_context"
        assert KEYWORD_TO_GROUP["this week"] == "time_context"

    def test_unknown_keyword_returns_default(self):
        assert get_keyword_group("unknown_keyword") == "default"

    def test_default_group_thresholds(self):
        assert DEFAULT_GROUP_THRESHOLDS["domain_fixed"] == 0.80
        assert DEFAULT_GROUP_THRESHOLDS["ambiguous"] == 0.85
        assert DEFAULT_GROUP_THRESHOLDS["time_context"] == 0.82
        assert DEFAULT_GROUP_THRESHOLDS["default"] == 0.82


# =============================================================================
# Threshold Lookup Tests
# =============================================================================

class TestThresholdLookup:
    def test_domain_fixed_threshold(self):
        tuner = ThresholdTuner(config=_enabled_config())
        assert tuner.get_threshold("스프린트") == 0.80
        assert tuner.get_threshold("sprint") == 0.80
        assert tuner.get_threshold("백로그") == 0.80

    def test_ambiguous_threshold(self):
        tuner = ThresholdTuner(config=_enabled_config())
        assert tuner.get_threshold("테스트 중") == 0.85
        assert tuner.get_threshold("in review") == 0.85

    def test_time_context_threshold(self):
        tuner = ThresholdTuner(config=_enabled_config())
        assert tuner.get_threshold("이번 주") == 0.82
        assert tuner.get_threshold("this week") == 0.82

    def test_unknown_keyword_default_threshold(self):
        tuner = ThresholdTuner(config=_enabled_config())
        assert tuner.get_threshold("some_unknown") == 0.82

    def test_override_takes_precedence(self):
        tuner = ThresholdTuner(config=_enabled_config())
        tuner.apply_override("domain_fixed", 0.83)
        assert tuner.get_threshold("스프린트") == 0.83
        assert tuner.get_threshold("백로그") == 0.83

    def test_convenience_function(self):
        init_threshold_tuner(config=_enabled_config())
        assert get_keyword_threshold("스프린트") == 0.80
        assert get_keyword_threshold("테스트 중") == 0.85

    def test_get_group(self):
        tuner = ThresholdTuner(config=_enabled_config())
        assert tuner.get_group("스프린트") == "domain_fixed"
        assert tuner.get_group("테스트 중") == "ambiguous"
        assert tuner.get_group("unknown") == "default"


# =============================================================================
# Signal Recording Tests
# =============================================================================

class TestSignalRecording:
    def test_record_increments_counter(self):
        tuner = ThresholdTuner(config=_enabled_config())
        tuner.record_signal("domain_fixed", "true_positive")
        tuner.record_signal("domain_fixed", "true_positive")
        tuner.record_signal("domain_fixed", "fp_proxy")

        stats = tuner.stats()
        assert stats["groups"]["domain_fixed"]["total"] == 3
        assert stats["groups"]["domain_fixed"]["fp_proxy"] == 1

    def test_record_disabled_does_nothing(self):
        tuner = ThresholdTuner(config=_disabled_config())
        tuner.record_signal("domain_fixed", "true_positive")
        assert tuner.stats()["groups"] == {}

    def test_record_multiple_groups(self):
        tuner = ThresholdTuner(config=_enabled_config())
        tuner.record_signal("domain_fixed", "true_positive")
        tuner.record_signal("ambiguous", "fp_proxy")

        stats = tuner.stats()
        assert "domain_fixed" in stats["groups"]
        assert "ambiguous" in stats["groups"]

    def test_signal_types(self):
        tuner = ThresholdTuner(config=_enabled_config())
        tuner.record_signal("g1", "fp_proxy")
        tuner.record_signal("g1", "fn_proxy")
        tuner.record_signal("g1", "l3_call")
        tuner.record_signal("g1", "true_positive")

        counters = tuner.stats()["groups"]["g1"]
        assert counters["total"] == 4
        assert counters["fp_proxy"] == 1
        assert counters["fn_proxy"] == 1
        assert counters["l3_call"] == 1


# =============================================================================
# Recommendation Tests
# =============================================================================

class TestRecommendation:
    def test_insufficient_samples_returns_none(self):
        tuner = ThresholdTuner(config=_enabled_config())
        for _ in range(500):  # < MIN_SAMPLE_COUNT
            tuner.record_signal("domain_fixed", "true_positive")
        assert tuner.get_recommendation("domain_fixed") is None

    def test_sufficient_samples_returns_recommendation(self):
        tuner = ThresholdTuner(config=_enabled_config())
        for _ in range(1000):
            tuner.record_signal("domain_fixed", "true_positive")

        rec = tuner.get_recommendation("domain_fixed")
        assert rec is not None
        assert rec.keyword_group == "domain_fixed"
        assert rec.sample_count == 1000

    def test_high_fp_rate_increases_threshold(self):
        tuner = ThresholdTuner(config=_enabled_config())
        # 10% FP rate (> 5% threshold)
        for _ in range(900):
            tuner.record_signal("domain_fixed", "true_positive")
        for _ in range(100):
            tuner.record_signal("domain_fixed", "fp_proxy")

        rec = tuner.get_recommendation("domain_fixed")
        assert rec is not None
        assert rec.recommended_threshold > rec.current_threshold
        assert "FP" in rec.reason

    def test_high_fn_rate_decreases_threshold(self):
        tuner = ThresholdTuner(config=_enabled_config())
        # 15% FN rate (> 10% threshold)
        for _ in range(850):
            tuner.record_signal("ambiguous", "true_positive")
        for _ in range(150):
            tuner.record_signal("ambiguous", "fn_proxy")

        rec = tuner.get_recommendation("ambiguous")
        assert rec is not None
        assert rec.recommended_threshold < rec.current_threshold
        assert "FN" in rec.reason

    def test_balanced_keeps_threshold(self):
        tuner = ThresholdTuner(config=_enabled_config())
        # Low FP and FN rates
        for _ in range(980):
            tuner.record_signal("domain_fixed", "true_positive")
        for _ in range(10):
            tuner.record_signal("domain_fixed", "fp_proxy")
        for _ in range(10):
            tuner.record_signal("domain_fixed", "fn_proxy")

        rec = tuner.get_recommendation("domain_fixed")
        assert rec is not None
        assert rec.recommended_threshold == rec.current_threshold
        assert "balanced" in rec.reason

    def test_very_high_fp_rate_doubles_step(self):
        tuner = ThresholdTuner(config=_enabled_config())
        # >10% FP rate -> double step
        for _ in range(800):
            tuner.record_signal("domain_fixed", "true_positive")
        for _ in range(200):
            tuner.record_signal("domain_fixed", "fp_proxy")

        rec = tuner.get_recommendation("domain_fixed")
        assert rec is not None
        # Double step: current (0.80) + 0.04 = 0.84
        assert rec.recommended_threshold == pytest.approx(0.84, abs=0.001)

    def test_very_high_fn_rate_doubles_step(self):
        tuner = ThresholdTuner(config=_enabled_config())
        # >20% FN rate -> double step
        for _ in range(700):
            tuner.record_signal("ambiguous", "true_positive")
        for _ in range(300):
            tuner.record_signal("ambiguous", "fn_proxy")

        rec = tuner.get_recommendation("ambiguous")
        assert rec is not None
        # Double step: current (0.85) - 0.04 = 0.81
        assert rec.recommended_threshold == pytest.approx(0.81, abs=0.001)

    def test_threshold_bounded_by_max(self):
        tuner = ThresholdTuner(config=_enabled_config())
        tuner.apply_override("test_group", 0.91)
        # Very high FP rate at high threshold
        for _ in range(800):
            tuner.record_signal("test_group", "true_positive")
        for _ in range(200):
            tuner.record_signal("test_group", "fp_proxy")

        rec = tuner.get_recommendation("test_group")
        assert rec is not None
        assert rec.recommended_threshold <= tuner.THRESHOLD_MAX

    def test_threshold_bounded_by_min(self):
        tuner = ThresholdTuner(config=_enabled_config())
        tuner.apply_override("test_group", 0.76)
        # Very high FN rate at low threshold
        for _ in range(700):
            tuner.record_signal("test_group", "true_positive")
        for _ in range(300):
            tuner.record_signal("test_group", "fn_proxy")

        rec = tuner.get_recommendation("test_group")
        assert rec is not None
        assert rec.recommended_threshold >= tuner.THRESHOLD_MIN

    def test_cost_calculation(self):
        tuner = ThresholdTuner(config=_enabled_config())
        for _ in range(1000):
            tuner.record_signal("g1", "true_positive")
        for _ in range(50):
            tuner.record_signal("g1", "fp_proxy")
        for _ in range(30):
            tuner.record_signal("g1", "fn_proxy")
        for _ in range(20):
            tuner.record_signal("g1", "l3_call")

        rec = tuner.get_recommendation("g1")
        expected_cost = 50 * 10 + 30 * 3 + 20 * 2
        assert rec.total_cost == expected_cost

    def test_get_all_recommendations(self):
        tuner = ThresholdTuner(config=_enabled_config())
        # Group 1: sufficient samples
        for _ in range(1000):
            tuner.record_signal("g1", "true_positive")
        # Group 2: insufficient
        for _ in range(500):
            tuner.record_signal("g2", "true_positive")

        recs = tuner.get_all_recommendations()
        assert len(recs) == 1
        assert recs[0].keyword_group == "g1"

    def test_confidence_levels(self):
        tuner = ThresholdTuner(config=_enabled_config())

        # Medium confidence (1000-4999)
        for _ in range(1000):
            tuner.record_signal("g1", "true_positive")
        rec = tuner.get_recommendation("g1")
        assert rec.confidence == "medium"

        # High confidence (>=5000)
        for _ in range(4000):
            tuner.record_signal("g1", "true_positive")
        rec = tuner.get_recommendation("g1")
        assert rec.confidence == "high"

    def test_nonexistent_group_returns_none(self):
        tuner = ThresholdTuner(config=_enabled_config())
        assert tuner.get_recommendation("nonexistent") is None


# =============================================================================
# Override Tests
# =============================================================================

class TestOverride:
    def test_apply_override(self):
        tuner = ThresholdTuner(config=_enabled_config())
        tuner.apply_override("domain_fixed", 0.83)

        thresholds = tuner.get_current_thresholds()
        assert thresholds["domain_fixed"] == 0.83

    def test_override_out_of_bounds_low(self):
        tuner = ThresholdTuner(config=_enabled_config())
        with pytest.raises(ValueError):
            tuner.apply_override("domain_fixed", 0.50)

    def test_override_out_of_bounds_high(self):
        tuner = ThresholdTuner(config=_enabled_config())
        with pytest.raises(ValueError):
            tuner.apply_override("domain_fixed", 0.99)

    def test_remove_override(self):
        tuner = ThresholdTuner(config=_enabled_config())
        tuner.apply_override("domain_fixed", 0.83)
        assert tuner.get_threshold("스프린트") == 0.83

        tuner.remove_override("domain_fixed")
        assert tuner.get_threshold("스프린트") == 0.80  # back to default

    def test_remove_nonexistent_override(self):
        tuner = ThresholdTuner(config=_enabled_config())
        assert tuner.remove_override("nonexistent") is False

    def test_get_current_thresholds_with_override(self):
        tuner = ThresholdTuner(config=_enabled_config())
        tuner.apply_override("custom_group", 0.88)

        thresholds = tuner.get_current_thresholds()
        assert thresholds["domain_fixed"] == 0.80  # default
        assert thresholds["custom_group"] == 0.88  # override

    def test_override_at_boundary_values(self):
        tuner = ThresholdTuner(config=_enabled_config())
        tuner.apply_override("domain_fixed", tuner.THRESHOLD_MIN)
        # "스프린트" -> domain_fixed group -> picks up the override
        assert tuner.get_threshold("스프린트") == tuner.THRESHOLD_MIN

        tuner.apply_override("ambiguous", tuner.THRESHOLD_MAX)
        assert tuner.get_threshold("테스트 중") == tuner.THRESHOLD_MAX


# =============================================================================
# Stats Tests
# =============================================================================

class TestStats:
    def test_stats_empty(self):
        tuner = ThresholdTuner(config=_enabled_config())
        stats = tuner.stats()
        assert stats["enabled"] is True
        assert stats["groups"] == {}
        assert stats["overrides"] == {}
        assert stats["keyword_count"] == len(KEYWORD_TO_GROUP)

    def test_stats_disabled(self):
        tuner = ThresholdTuner(config=_disabled_config())
        assert tuner.stats()["enabled"] is False

    def test_stats_after_recording(self):
        tuner = ThresholdTuner(config=_enabled_config())
        tuner.record_signal("g1", "true_positive")
        tuner.apply_override("g1", 0.83)

        stats = tuner.stats()
        assert "g1" in stats["groups"]
        assert stats["overrides"]["g1"] == 0.83


# =============================================================================
# Redis Integration Tests (Mock)
# =============================================================================

class TestRedisIntegration:
    def test_record_writes_to_redis(self):
        redis = MagicMock()
        tuner = ThresholdTuner(config=_enabled_config(), redis_client=redis)
        tuner.record_signal("domain_fixed", "fp_proxy")

        assert redis.hincrby.called

    def test_redis_failure_falls_back(self):
        redis = MagicMock()
        redis.hincrby.side_effect = ConnectionError("Redis down")
        tuner = ThresholdTuner(config=_enabled_config(), redis_client=redis)

        # Should not raise
        tuner.record_signal("domain_fixed", "fp_proxy")
        # Should have recorded in memory
        assert tuner.stats()["groups"]["domain_fixed"]["fp_proxy"] == 1


# =============================================================================
# Integration: Classifier uses per-group thresholds
# =============================================================================

class TestClassifierIntegration:
    def test_classifier_uses_per_group_threshold(self):
        """Verify the classifier passes per-group thresholds to fuzzy matching."""
        from classifiers.answer_type_classifier import classify_answer_type

        # "스프린트" (domain_fixed, threshold=0.80) should match with
        # slightly more tolerance than "테스트 중" (ambiguous, threshold=0.85)
        result = classify_answer_type("스프린트 진행 상황 알려줘")
        assert result.answer_type.value == "sprint_progress"

    def test_domain_fixed_keywords_still_classify(self):
        """Ensure domain-fixed keywords work with lower threshold."""
        from classifiers.answer_type_classifier import classify_answer_type

        result = classify_answer_type("백로그 보여줘")
        assert result.answer_type.value == "backlog_list"

    def test_ambiguous_keywords_still_classify(self):
        """Ensure ambiguous keywords work with higher threshold."""
        from classifiers.answer_type_classifier import classify_answer_type

        result = classify_answer_type("테스트 중인 태스크 뭐 있어?")
        assert result.answer_type.value == "tasks_by_status"


# =============================================================================
# Singleton Tests
# =============================================================================

class TestSingleton:
    def test_init_and_get(self):
        tuner = init_threshold_tuner(config=_enabled_config())
        assert tuner is get_threshold_tuner()

    def test_get_creates_default(self):
        import services.threshold_tuner as mod
        mod._tuner = None
        tuner = mod.get_threshold_tuner()
        assert tuner is not None
