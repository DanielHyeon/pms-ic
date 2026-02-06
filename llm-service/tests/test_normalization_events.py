"""
Tests for QUERY_NORMALIZED event payload and P4 event integration.

Phase 1: Redis Cache + Circuit Breaker + Event Logging
"""

import pytest
from dataclasses import asdict

from observability.p4_events import (
    EventType,
    QueryNormalizedPayload,
    PAYLOAD_CLASSES,
    create_payload,
    P4EventEmitter,
    MemoryBackend,
    PIIMasker,
)


# =============================================================================
# EventType Extension Tests
# =============================================================================

class TestEventTypeExtension:
    def test_query_normalized_exists(self):
        assert hasattr(EventType, "QUERY_NORMALIZED")
        assert EventType.QUERY_NORMALIZED.value == "query_normalized"

    def test_query_normalized_in_payload_classes(self):
        assert EventType.QUERY_NORMALIZED.value in PAYLOAD_CLASSES
        assert PAYLOAD_CLASSES[EventType.QUERY_NORMALIZED.value] is QueryNormalizedPayload


# =============================================================================
# QueryNormalizedPayload Tests
# =============================================================================

class TestQueryNormalizedPayload:
    def test_default_values(self):
        payload = QueryNormalizedPayload(
            original_query="test",
            normalized_query="test",
            q_fingerprint="abc123",
        )
        assert payload.layers_applied == []
        assert payload.cache_hit is False
        assert payload.negative_cache_hit is False
        assert payload.l3_called is False
        assert payload.l3_success is False
        assert payload.duration_ms == 0

    def test_full_payload(self):
        payload = QueryNormalizedPayload(
            original_query="스프런트 현황",
            normalized_query="스프린트 현황",
            q_fingerprint="abc123def456",
            layers_applied=["L2"],
            cache_hit=False,
            negative_cache_hit=False,
            l3_called=False,
            l3_success=False,
            original_intent="unknown",
            final_intent="sprint_status",
            duration_ms=5,
            normalizer_version="v1.0",
            typo_dict_version="v1.0",
            threshold_version="v1.0",
        )
        d = asdict(payload)
        assert d["original_query"] == "스프런트 현황"
        assert d["layers_applied"] == ["L2"]
        assert d["normalizer_version"] == "v1.0"

    def test_l3_payload(self):
        payload = QueryNormalizedPayload(
            original_query="masked query",
            normalized_query="masked corrected",
            q_fingerprint="fp123",
            layers_applied=["L3"],
            l3_called=True,
            l3_success=True,
            original_intent="unknown",
            final_intent="tasks_by_status",
            duration_ms=350,
        )
        assert payload.l3_called is True
        assert payload.l3_success is True

    def test_negative_cache_hit_payload(self):
        payload = QueryNormalizedPayload(
            original_query="gibberish",
            normalized_query="gibberish",
            q_fingerprint="fp456",
            negative_cache_hit=True,
            original_intent="unknown",
            final_intent="unknown",
        )
        assert payload.negative_cache_hit is True
        assert payload.l3_called is False


# =============================================================================
# create_payload Integration
# =============================================================================

class TestCreatePayload:
    def test_create_query_normalized_payload(self):
        result = create_payload(
            EventType.QUERY_NORMALIZED.value,
            original_query="test",
            normalized_query="test",
            q_fingerprint="abc",
            layers_applied=["L2"],
            l3_called=False,
        )
        assert isinstance(result, dict)
        assert result["original_query"] == "test"
        assert result["layers_applied"] == ["L2"]
        assert result["l3_called"] is False

    def test_create_payload_filters_unknown_fields(self):
        result = create_payload(
            EventType.QUERY_NORMALIZED.value,
            original_query="test",
            normalized_query="test",
            q_fingerprint="abc",
            unknown_field="should_be_ignored",
        )
        assert "unknown_field" not in result

    def test_existing_payload_types_still_work(self):
        result = create_payload(
            EventType.INTENT_CLASSIFIED.value,
            query="test",
            intent="backlog_list",
            confidence=0.9,
            threshold=0.5,
            basis="keyword_match",
        )
        assert result["intent"] == "backlog_list"


# =============================================================================
# Event Emission Integration
# =============================================================================

class TestEventEmission:
    def test_emit_query_normalized_event(self):
        emitter = P4EventEmitter()
        backend = MemoryBackend()
        emitter.add_backend(backend)

        event = emitter.emit(
            event_type=EventType.QUERY_NORMALIZED.value,
            payload=asdict(QueryNormalizedPayload(
                original_query="raw",
                normalized_query="corrected",
                q_fingerprint="fp123",
                layers_applied=["L3"],
                l3_called=True,
                l3_success=True,
            )),
            phase="P0.5",
            step_name="query_normalization",
            outcome="ok",
            duration_ms=150,
        )

        assert event is not None
        assert event.event_type == "query_normalized"
        assert event.phase == "P0.5"

        stored = backend.get_events()
        assert len(stored) == 1
        assert stored[0].payload["l3_called"] is True

    def test_pii_masking_in_payload(self):
        emitter = P4EventEmitter()
        backend = MemoryBackend()
        emitter.add_backend(backend)

        masked_query = PIIMasker.mask_query("email test@email.com query")
        assert "[EMAIL_MASKED]" in masked_query

        emitter.emit(
            event_type=EventType.QUERY_NORMALIZED.value,
            payload={
                "original_query": masked_query,
                "normalized_query": masked_query,
                "q_fingerprint": "fp",
            },
        )

        stored = backend.get_events()
        assert "[EMAIL_MASKED]" in stored[0].payload["original_query"]


# =============================================================================
# Version Tracking Tests
# =============================================================================

class TestVersionTracking:
    def test_version_fields_present(self):
        payload = QueryNormalizedPayload(
            original_query="q",
            normalized_query="q",
            q_fingerprint="fp",
            normalizer_version="v1.0",
            typo_dict_version="v1.0",
            threshold_version="v1.0",
        )
        d = asdict(payload)
        assert d["normalizer_version"] == "v1.0"
        assert d["typo_dict_version"] == "v1.0"
        assert d["threshold_version"] == "v1.0"
