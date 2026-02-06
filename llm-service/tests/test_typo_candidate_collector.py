"""
Tests for typo candidate collector and shadow pipeline.

Phase 2: Typo Dictionary Auto-Expansion (Shadow Pipeline)
"""

import time
import pytest
from unittest.mock import MagicMock, patch
from dataclasses import asdict

from config.constants import NormalizationConfig
from services.typo_candidate_collector import (
    TypoCandidateCollector,
    CandidateInfo,
    ShadowEvalResult,
    init_candidate_collector,
    get_candidate_collector,
)
from observability.p4_events import (
    EventType,
    ShadowDictEvaluatedPayload,
    PAYLOAD_CLASSES,
    create_payload,
)


# =============================================================================
# Config with collection enabled
# =============================================================================

def _enabled_config():
    return NormalizationConfig(
        ENABLE_CANDIDATE_COLLECTION=True,
        ENABLE_SHADOW_DICT=True,
    )


def _disabled_config():
    return NormalizationConfig(
        ENABLE_CANDIDATE_COLLECTION=False,
        ENABLE_SHADOW_DICT=False,
    )


# =============================================================================
# Recording Tests (Memory-Only)
# =============================================================================

class TestRecordCorrection:
    def test_record_increments_count(self):
        collector = TypoCandidateCollector(config=_enabled_config())
        collector.record_correction("스프런트 현황", "스프린트 현황", "sprint_status")
        collector.record_correction("스프런트 현황", "스프린트 현황", "sprint_status")

        candidates = collector.get_candidates(min_count=2, min_stability=0.5)
        assert len(candidates) == 1
        assert candidates[0].total_count == 2

    def test_record_disabled_does_nothing(self):
        collector = TypoCandidateCollector(config=_disabled_config())
        collector.record_correction("test", "corrected", "intent")
        candidates = collector.get_candidates(min_count=1, min_stability=0.0)
        assert len(candidates) == 0

    def test_multiple_corrections_same_original(self):
        """Same original, different corrections should reduce stability."""
        collector = TypoCandidateCollector(config=_enabled_config())
        for _ in range(8):
            collector.record_correction("오타 쿼리", "교정A", "intent_a")
        for _ in range(2):
            collector.record_correction("오타 쿼리", "교정B", "intent_b")

        # min_stability=0.9 should filter out (8/10 = 0.8)
        stable = collector.get_candidates(min_count=5, min_stability=0.9)
        assert len(stable) == 0

        # min_stability=0.7 should pass (8/10 = 0.8)
        unstable = collector.get_candidates(min_count=5, min_stability=0.7)
        assert len(unstable) == 1
        assert unstable[0].stability == pytest.approx(0.8, abs=0.01)

    def test_stability_calculation(self):
        collector = TypoCandidateCollector(config=_enabled_config())
        for _ in range(10):
            collector.record_correction("q1", "corrected1", "intent_a")

        candidates = collector.get_candidates(min_count=5, min_stability=0.9)
        assert len(candidates) == 1
        assert candidates[0].stability == 1.0

    def test_intent_stability(self):
        collector = TypoCandidateCollector(config=_enabled_config())
        for _ in range(9):
            collector.record_correction("q1", "c1", "sprint_status")
        collector.record_correction("q1", "c1", "backlog_list")

        candidates = collector.get_candidates(min_count=5, min_stability=0.5)
        assert len(candidates) == 1
        assert candidates[0].top_intent == "sprint_status"
        assert candidates[0].intent_stability == pytest.approx(0.9, abs=0.01)

    def test_pii_masking_applied(self):
        collector = TypoCandidateCollector(config=_enabled_config())
        collector.record_correction(
            "test@email.com query", "corrected query", "intent"
        )
        # The masked_original should have PII masked
        for ofp, meta in collector._mem_meta.items():
            assert "email.com" not in meta.get("masked_original", "")

    def test_min_count_filter(self):
        collector = TypoCandidateCollector(config=_enabled_config())
        for _ in range(3):
            collector.record_correction("q1", "c1", "intent")

        assert len(collector.get_candidates(min_count=5)) == 0
        assert len(collector.get_candidates(min_count=3)) == 1


# =============================================================================
# Shadow Dictionary Tests
# =============================================================================

class TestShadowDictionary:
    def test_promote_to_shadow(self):
        collector = TypoCandidateCollector(config=_enabled_config())
        collector.promote_to_shadow("abc123", "corrected text")

        shadow = collector.shadow_dict
        assert "abc123" in shadow
        assert shadow["abc123"] == "corrected text"

    def test_shadow_dict_is_copy(self):
        collector = TypoCandidateCollector(config=_enabled_config())
        collector.promote_to_shadow("abc", "text")
        shadow = collector.shadow_dict
        shadow["new_key"] = "new_value"
        assert "new_key" not in collector.shadow_dict

    def test_evaluate_shadow_no_match(self):
        collector = TypoCandidateCollector(config=_enabled_config())
        result = collector.evaluate_shadow(
            "unmatched query", "unknown", classifier_fn=lambda q: "unknown"
        )
        assert result is None

    def test_evaluate_shadow_match_changes_routing(self):
        collector = TypoCandidateCollector(config=_enabled_config())
        from services.normalization_cache import query_fingerprint
        qfp = query_fingerprint("test query")[:16]
        collector.promote_to_shadow(qfp, "corrected query")

        result = collector.evaluate_shadow(
            "test query",
            "unknown",
            classifier_fn=lambda q: "sprint_status",
        )
        assert result is not None
        assert result.would_change_routing is True
        assert result.shadow_intent == "sprint_status"
        assert result.production_intent == "unknown"

    def test_evaluate_shadow_match_no_change(self):
        collector = TypoCandidateCollector(config=_enabled_config())
        from services.normalization_cache import query_fingerprint
        qfp = query_fingerprint("test query")[:16]
        collector.promote_to_shadow(qfp, "corrected query")

        result = collector.evaluate_shadow(
            "test query",
            "sprint_status",
            classifier_fn=lambda q: "sprint_status",
        )
        assert result is not None
        assert result.would_change_routing is False

    def test_evaluate_shadow_disabled(self):
        collector = TypoCandidateCollector(config=_disabled_config())
        result = collector.evaluate_shadow(
            "query", "unknown", classifier_fn=lambda q: "intent"
        )
        assert result is None

    def test_evaluate_shadow_no_classifier(self):
        collector = TypoCandidateCollector(config=_enabled_config())
        result = collector.evaluate_shadow("query", "unknown", classifier_fn=None)
        assert result is None


# =============================================================================
# Redis Integration Tests (Mock)
# =============================================================================

class TestRedisIntegration:
    def _make_redis_mock(self):
        redis = MagicMock()
        pipe = MagicMock()
        redis.pipeline.return_value = pipe
        pipe.execute.return_value = []
        return redis, pipe

    def test_record_uses_redis_pipeline(self):
        redis, pipe = self._make_redis_mock()
        collector = TypoCandidateCollector(
            redis_client=redis, config=_enabled_config()
        )
        collector.record_correction("original", "corrected", "intent")
        assert pipe.zincrby.called
        assert pipe.hincrby.called
        assert pipe.execute.called

    def test_redis_failure_falls_back_to_memory(self):
        redis, pipe = self._make_redis_mock()
        pipe.execute.side_effect = ConnectionError("Redis down")
        collector = TypoCandidateCollector(
            redis_client=redis, config=_enabled_config()
        )
        # Should not raise
        collector.record_correction("original", "corrected", "intent")
        # Should have recorded in memory
        assert len(collector._mem_candidates) > 0

    def test_promote_to_shadow_with_redis(self):
        redis, _ = self._make_redis_mock()
        collector = TypoCandidateCollector(
            redis_client=redis, config=_enabled_config()
        )
        collector.promote_to_shadow("fp123", "corrected")
        redis.sadd.assert_called_once()


# =============================================================================
# Stats Tests
# =============================================================================

class TestCollectorStats:
    def test_stats_empty(self):
        collector = TypoCandidateCollector(config=_enabled_config())
        stats = collector.stats()
        assert stats["candidate_count"] == 0
        assert stats["shadow_dict_size"] == 0
        assert stats["collection_enabled"] is True
        assert stats["shadow_enabled"] is True

    def test_stats_after_recording(self):
        collector = TypoCandidateCollector(config=_enabled_config())
        collector.record_correction("q1", "c1", "intent")
        collector.promote_to_shadow("fp", "text")

        stats = collector.stats()
        assert stats["candidate_count"] == 1
        assert stats["shadow_dict_size"] == 1


# =============================================================================
# Event Payload Tests
# =============================================================================

class TestShadowDictEvent:
    def test_shadow_dict_evaluated_event_type(self):
        assert hasattr(EventType, "SHADOW_DICT_EVALUATED")
        assert EventType.SHADOW_DICT_EVALUATED.value == "shadow_dict_evaluated"

    def test_shadow_dict_evaluated_payload(self):
        payload = ShadowDictEvaluatedPayload(
            q_fingerprint="fp123",
            shadow_corrected="corrected",
            production_intent="unknown",
            shadow_intent="sprint_status",
            would_change_routing=True,
        )
        d = asdict(payload)
        assert d["would_change_routing"] is True
        assert d["shadow_intent"] == "sprint_status"

    def test_shadow_dict_in_payload_classes(self):
        assert EventType.SHADOW_DICT_EVALUATED.value in PAYLOAD_CLASSES

    def test_create_shadow_payload(self):
        result = create_payload(
            EventType.SHADOW_DICT_EVALUATED.value,
            q_fingerprint="fp",
            shadow_corrected="c",
            production_intent="unknown",
            shadow_intent="sprint_status",
            would_change_routing=True,
        )
        assert result["would_change_routing"] is True


# =============================================================================
# Singleton Tests
# =============================================================================

class TestSingleton:
    def test_init_and_get(self):
        collector = init_candidate_collector(None)
        assert collector is get_candidate_collector()

    def test_get_creates_default(self):
        import services.typo_candidate_collector as mod
        mod._collector = None
        collector = mod.get_candidate_collector()
        assert collector is not None
