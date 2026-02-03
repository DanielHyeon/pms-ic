"""
P4 Observability Tests - Event Schema, Emitter, and Metrics.

Tests cover:
- Event types and enums
- PII masking
- Runtime metadata
- P4 Event creation and serialization
- Event payloads (typed payloads)
- Trace context propagation
- Event backends
- Event emitter
- Sampling policy
- Metrics registry
- Health summary calculations
- Intent stats aggregation
"""

import pytest
from datetime import datetime
from dataclasses import asdict
import json

from p4_events import (
    EventType,
    FinalStatus,
    EventTier,
    PIIMasker,
    RuntimeMetadata,
    P4Event,
    IntentClassifiedPayload,
    DataQueryExecutedPayload,
    DataEmptyDetectedPayload,
    RecoveryPlanCreatedPayload,
    FallbackActivatedPayload,
    ClarificationTriggeredPayload,
    ClarificationResolvedPayload,
    ClarificationAbandonedPayload,
    ResponseGeneratedPayload,
    create_payload,
    TraceContext,
    set_trace_id,
    get_trace_id,
    generate_trace_id,
    extract_or_create_trace_id,
    MemoryBackend,
    ConsoleBackend,
    P4EventEmitter,
    emit_event,
    get_emitter,
    SamplingPolicy,
    set_default_runtime,
    get_default_runtime,
)

from p4_metrics import (
    MetricType,
    MetricValue,
    SimpleMetricsRegistry,
    get_registry,
    RESPONSE_TOTAL,
    CLARIFICATION_TOTAL,
    FALLBACK_TOTAL,
    RESPONSE_DURATION,
    PENDING_CLARIFICATIONS,
    EMISSION_FAILURES,
    record_response,
    record_clarification,
    record_fallback,
    set_pending_clarifications,
    record_emission_failure,
    MetricsAggregator,
    HealthSummary,
    calculate_health_summary,
    IntentStats,
    get_intent_stats,
    HeatmapCell,
    get_failure_heatmap,
)


# =============================================================================
# Event Type Tests
# =============================================================================

class TestEventTypes:
    """Test event types and enums."""

    def test_event_type_values(self):
        """All event types have expected values."""
        assert EventType.QUERY_RECEIVED.value == "query_received"
        assert EventType.INTENT_CLASSIFIED.value == "intent_classified"
        assert EventType.HANDLER_SELECTED.value == "handler_selected"
        assert EventType.DATA_QUERY_EXECUTED.value == "data_query_executed"
        assert EventType.RESPONSE_GENERATED.value == "response_generated"

    def test_final_status_values(self):
        """Final status enum has all expected values."""
        assert FinalStatus.SUCCESS.value == "success"
        assert FinalStatus.RECOVERED_SUCCESS.value == "recovered_success"
        assert FinalStatus.RECOVERED_GUIDANCE.value == "recovered_guidance"
        assert FinalStatus.FAILED.value == "failed"

    def test_event_tier_values(self):
        """Event tier enum has all expected values."""
        assert EventTier.TRACE.value == "trace"
        assert EventTier.PROVENANCE.value == "provenance"
        assert EventTier.DEBUG.value == "debug"

    def test_event_type_is_string_enum(self):
        """EventType inherits from str for JSON serialization."""
        assert isinstance(EventType.INTENT_CLASSIFIED, str)
        assert EventType.INTENT_CLASSIFIED == "intent_classified"


# =============================================================================
# PII Masking Tests
# =============================================================================

class TestPIIMasking:
    """Test PII masking functionality."""

    def test_mask_email(self):
        """Email addresses are masked."""
        query = "user@example.com asked about the project"
        masked = PIIMasker.mask_query(query)
        assert "user@example.com" not in masked
        assert "[EMAIL_MASKED]" in masked

    def test_mask_korean_phone(self):
        """Korean phone numbers are masked."""
        query = "연락처 010-1234-5678 입니다"
        masked = PIIMasker.mask_query(query)
        assert "010-1234-5678" not in masked
        assert "[PHONE_KR_MASKED]" in masked

    def test_mask_credit_card(self):
        """Credit card numbers are masked."""
        query = "card 1234-5678-9012-3456"
        masked = PIIMasker.mask_query(query)
        assert "1234-5678-9012-3456" not in masked
        assert "[CARD_MASKED]" in masked

    def test_sanitize_payload_removes_secrets(self):
        """Sensitive keys are removed from payload."""
        payload = {
            "intent": "backlog_list",
            "password": "secret123",
            "api_key": "key-abc",
            "project_id": "123",
        }
        sanitized = PIIMasker.sanitize_payload(payload)
        assert "password" not in sanitized
        assert "api_key" not in sanitized
        assert "intent" in sanitized
        assert "project_id" in sanitized

    def test_hash_user_id(self):
        """User ID is hashed consistently."""
        user_id = "user123"
        hash1 = PIIMasker.hash_user_id(user_id)
        hash2 = PIIMasker.hash_user_id(user_id)
        assert hash1 == hash2
        assert user_id not in hash1
        assert len(hash1) == 16  # Truncated to 16 chars

    def test_hash_user_id_with_salt(self):
        """Different salt produces different hash."""
        user_id = "user123"
        hash1 = PIIMasker.hash_user_id(user_id, salt="salt1")
        hash2 = PIIMasker.hash_user_id(user_id, salt="salt2")
        assert hash1 != hash2

    def test_no_false_positives_on_normal_text(self):
        """Normal text is not masked."""
        query = "show me the backlog for project Alpha"
        masked = PIIMasker.mask_query(query)
        assert masked == query


# =============================================================================
# Runtime Metadata Tests
# =============================================================================

class TestRuntimeMetadata:
    """Test runtime metadata."""

    def test_runtime_metadata_defaults(self):
        """RuntimeMetadata has sensible defaults."""
        runtime = RuntimeMetadata()
        assert runtime.build_version == ""
        assert runtime.git_sha == ""
        assert runtime.env == ""

    def test_runtime_metadata_to_dict(self):
        """RuntimeMetadata serializes to dict."""
        runtime = RuntimeMetadata(
            build_version="v2.4.0",
            git_sha="abc1234",
            env="prod",
        )
        d = runtime.to_dict()
        assert d["build_version"] == "v2.4.0"
        assert d["git_sha"] == "abc1234"
        assert d["env"] == "prod"

    def test_set_default_runtime(self):
        """Default runtime can be set globally."""
        runtime = RuntimeMetadata(build_version="v2.5.0")
        set_default_runtime(runtime)
        assert get_default_runtime().build_version == "v2.5.0"
        # Reset for other tests
        set_default_runtime(RuntimeMetadata())


# =============================================================================
# P4 Event Tests
# =============================================================================

class TestP4Event:
    """Test P4 event creation and serialization."""

    def test_event_creation(self):
        """P4Event is created with defaults."""
        event = P4Event()
        assert event.event_id  # Auto-generated
        assert event.trace_id == ""
        assert event.event_type == ""
        assert isinstance(event.timestamp, datetime)

    def test_event_with_values(self):
        """P4Event accepts custom values."""
        event = P4Event(
            trace_id="trace-123",
            event_type=EventType.INTENT_CLASSIFIED.value,
            payload={"intent": "backlog_list"},
            phase="P0",
            outcome="ok",
        )
        assert event.trace_id == "trace-123"
        assert event.event_type == "intent_classified"
        assert event.payload["intent"] == "backlog_list"
        assert event.phase == "P0"
        assert event.outcome == "ok"

    def test_event_to_dict(self):
        """P4Event serializes to dict."""
        event = P4Event(
            trace_id="trace-456",
            event_type=EventType.DATA_QUERY_EXECUTED.value,
            payload={"query_name": "sprint_query"},
        )
        d = event.to_dict()
        assert d["trace_id"] == "trace-456"
        assert d["event_type"] == "data_query_executed"
        assert d["payload"]["query_name"] == "sprint_query"
        assert "timestamp" in d
        assert "runtime" in d

    def test_event_json_serializable(self):
        """P4Event dict is JSON serializable."""
        event = P4Event(
            trace_id="trace-789",
            event_type=EventType.RESPONSE_GENERATED.value,
        )
        json_str = json.dumps(event.to_dict())
        assert "trace-789" in json_str


# =============================================================================
# Event Payload Tests
# =============================================================================

class TestEventPayloads:
    """Test typed event payloads."""

    def test_intent_classified_payload(self):
        """IntentClassifiedPayload is created correctly."""
        payload = IntentClassifiedPayload(
            query="show backlog",
            intent="backlog_list",
            confidence=0.92,
            threshold=0.5,
            basis="keyword_match",
            matched_patterns=["backlog", "show"],
        )
        assert payload.query == "show backlog"
        assert payload.intent == "backlog_list"
        assert payload.confidence == 0.92

    def test_data_query_executed_payload(self):
        """DataQueryExecutedPayload is created correctly."""
        payload = DataQueryExecutedPayload(
            query_type="sql",
            query_name="backlog_items",
            row_count=25,
            is_empty=False,
            cache_hit=True,
            duration_ms=45,
        )
        assert payload.query_type == "sql"
        assert payload.row_count == 25
        assert payload.cache_hit is True

    def test_response_generated_payload(self):
        """ResponseGeneratedPayload is created correctly."""
        payload = ResponseGeneratedPayload(
            intent="sprint_progress",
            final_status=FinalStatus.SUCCESS.value,
            has_data=True,
            total_duration_ms=350,
        )
        assert payload.intent == "sprint_progress"
        assert payload.final_status == "success"
        assert payload.has_data is True

    def test_create_payload_function(self):
        """create_payload creates typed payload dict."""
        payload_dict = create_payload(
            EventType.INTENT_CLASSIFIED.value,
            query="show sprint",
            intent="sprint_progress",
            confidence=0.85,
            threshold=0.5,
            basis="keyword_match",
        )
        assert payload_dict["query"] == "show sprint"
        assert payload_dict["intent"] == "sprint_progress"
        assert payload_dict["confidence"] == 0.85

    def test_create_payload_filters_unknown_fields(self):
        """create_payload ignores unknown fields."""
        payload_dict = create_payload(
            EventType.INTENT_CLASSIFIED.value,
            query="test",
            intent="test_intent",
            confidence=0.9,
            threshold=0.5,
            basis="rule",
            unknown_field="should_be_ignored",
        )
        assert "unknown_field" not in payload_dict


# =============================================================================
# Trace Context Tests
# =============================================================================

class TestTraceContext:
    """Test trace context propagation."""

    def test_generate_trace_id(self):
        """generate_trace_id creates unique IDs."""
        id1 = generate_trace_id()
        id2 = generate_trace_id()
        assert id1 != id2
        assert len(id1) > 0

    def test_set_get_trace_id(self):
        """Trace ID can be set and retrieved."""
        set_trace_id("test-trace-123")
        assert get_trace_id() == "test-trace-123"
        set_trace_id("")  # Reset

    def test_trace_context_manager(self):
        """TraceContext sets and resets trace_id."""
        original = get_trace_id()
        with TraceContext("ctx-trace-456"):
            assert get_trace_id() == "ctx-trace-456"
        assert get_trace_id() == original

    def test_extract_trace_id_from_header(self):
        """Trace ID is extracted from X-Trace-ID header."""
        headers = {"X-Trace-ID": "header-trace-789"}
        trace_id = extract_or_create_trace_id(headers)
        assert trace_id == "header-trace-789"

    def test_extract_trace_id_from_request_id(self):
        """Trace ID falls back to X-Request-ID."""
        headers = {"X-Request-ID": "request-123"}
        trace_id = extract_or_create_trace_id(headers)
        assert trace_id == "request-123"

    def test_extract_trace_id_from_traceparent(self):
        """Trace ID is extracted from W3C traceparent."""
        # W3C format: version-trace_id-parent_id-flags
        headers = {"traceparent": "00-abc123def456-parent789-01"}
        trace_id = extract_or_create_trace_id(headers)
        assert trace_id == "abc123def456"

    def test_extract_creates_new_when_missing(self):
        """New trace ID is created when headers are empty."""
        headers = {}
        trace_id = extract_or_create_trace_id(headers)
        assert trace_id  # Non-empty
        assert len(trace_id) > 0


# =============================================================================
# Event Backend Tests
# =============================================================================

class TestEventBackends:
    """Test event backends."""

    def test_memory_backend_stores_events(self):
        """MemoryBackend stores events in memory."""
        backend = MemoryBackend()
        event = P4Event(trace_id="mem-trace-1", event_type="test")
        backend.write(event)
        assert len(backend.get_events()) == 1
        assert backend.get_events()[0].trace_id == "mem-trace-1"

    def test_memory_backend_get_by_trace(self):
        """MemoryBackend filters by trace_id."""
        backend = MemoryBackend()
        backend.write(P4Event(trace_id="trace-a", event_type="test"))
        backend.write(P4Event(trace_id="trace-b", event_type="test"))
        backend.write(P4Event(trace_id="trace-a", event_type="test2"))

        events = backend.get_events_by_trace("trace-a")
        assert len(events) == 2

    def test_memory_backend_get_by_type(self):
        """MemoryBackend filters by event_type."""
        backend = MemoryBackend()
        backend.write(P4Event(trace_id="t1", event_type="type_a"))
        backend.write(P4Event(trace_id="t2", event_type="type_b"))
        backend.write(P4Event(trace_id="t3", event_type="type_a"))

        events = backend.get_events_by_type("type_a")
        assert len(events) == 2

    def test_memory_backend_clear(self):
        """MemoryBackend clears all events."""
        backend = MemoryBackend()
        backend.write(P4Event(trace_id="t1", event_type="test"))
        backend.clear()
        assert len(backend.get_events()) == 0


# =============================================================================
# Event Emitter Tests
# =============================================================================

class TestEventEmitter:
    """Test P4 event emitter."""

    def test_emitter_with_backend(self):
        """Emitter writes to backends."""
        backend = MemoryBackend()
        emitter = P4EventEmitter()
        emitter.add_backend(backend)

        emitter.emit(
            event_type=EventType.INTENT_CLASSIFIED.value,
            payload={"intent": "backlog_list"},
            trace_id="emit-trace-1",
        )

        assert len(backend.get_events()) == 1
        assert backend.get_events()[0].payload["intent"] == "backlog_list"

    def test_emitter_sanitizes_payload(self):
        """Emitter sanitizes PII from payload."""
        backend = MemoryBackend()
        emitter = P4EventEmitter()
        emitter.add_backend(backend)

        emitter.emit(
            event_type="test",
            payload={"intent": "test", "password": "secret"},
            trace_id="sanitize-trace",
        )

        event = backend.get_events()[0]
        assert "password" not in event.payload
        assert "intent" in event.payload

    def test_emitter_disable_enable(self):
        """Emitter can be disabled and enabled."""
        backend = MemoryBackend()
        emitter = P4EventEmitter()
        emitter.add_backend(backend)

        emitter.disable()
        emitter.emit("test", {"data": "ignored"}, trace_id="disabled")
        assert len(backend.get_events()) == 0

        emitter.enable()
        emitter.emit("test", {"data": "captured"}, trace_id="enabled")
        assert len(backend.get_events()) == 1

    def test_emitter_remove_backend(self):
        """Backend can be removed from emitter."""
        backend = MemoryBackend()
        emitter = P4EventEmitter()
        emitter.add_backend(backend)
        emitter.remove_backend(backend)

        emitter.emit("test", {"data": "test"}, trace_id="removed")
        assert len(backend.get_events()) == 0


# =============================================================================
# Sampling Policy Tests
# =============================================================================

class TestSamplingPolicy:
    """Test event sampling policy."""

    def test_trace_tier_always_sampled(self):
        """TRACE tier is always sampled (100%)."""
        for status in [FinalStatus.SUCCESS, FinalStatus.FAILED]:
            rate = SamplingPolicy.get_rate(EventTier.TRACE.value, status.value)
            assert rate == 1.0

    def test_provenance_tier_varied_by_status(self):
        """PROVENANCE tier rate varies by status."""
        success_rate = SamplingPolicy.get_rate(
            EventTier.PROVENANCE.value, FinalStatus.SUCCESS.value
        )
        failed_rate = SamplingPolicy.get_rate(
            EventTier.PROVENANCE.value, FinalStatus.FAILED.value
        )
        assert success_rate == 0.1  # 10% on success
        assert failed_rate == 1.0   # 100% on failure

    def test_debug_tier_failure_only(self):
        """DEBUG tier is 0% on success, 100% on failure."""
        success_rate = SamplingPolicy.get_rate(
            EventTier.DEBUG.value, FinalStatus.SUCCESS.value
        )
        failed_rate = SamplingPolicy.get_rate(
            EventTier.DEBUG.value, FinalStatus.FAILED.value
        )
        assert success_rate == 0.0
        assert failed_rate == 1.0

    def test_recovered_guidance_intermediate_rates(self):
        """RECOVERED_GUIDANCE has intermediate debug rate (50%)."""
        rate = SamplingPolicy.get_rate(
            EventTier.DEBUG.value, FinalStatus.RECOVERED_GUIDANCE.value
        )
        assert rate == 0.5


# =============================================================================
# Metrics Registry Tests
# =============================================================================

class TestMetricsRegistry:
    """Test simple metrics registry."""

    def setup_method(self):
        """Reset registry before each test."""
        get_registry().reset()

    def test_counter_increment(self):
        """Counter increments correctly."""
        registry = get_registry()
        labels = {"intent": "backlog_list"}

        registry.inc_counter("test_counter", labels)
        registry.inc_counter("test_counter", labels)
        registry.inc_counter("test_counter", labels, 5)

        assert registry.get_counter("test_counter", labels) == 7

    def test_gauge_set(self):
        """Gauge sets value correctly."""
        registry = get_registry()
        labels = {"intent": "sprint_progress"}

        registry.set_gauge("test_gauge", labels, 42)
        assert registry.get_gauge("test_gauge", labels) == 42

        registry.set_gauge("test_gauge", labels, 100)
        assert registry.get_gauge("test_gauge", labels) == 100

    def test_histogram_observe(self):
        """Histogram observes values correctly."""
        registry = get_registry()
        labels = {"intent": "backlog_list"}

        registry.observe_histogram("test_histogram", labels, 10)
        registry.observe_histogram("test_histogram", labels, 20)
        registry.observe_histogram("test_histogram", labels, 30)

        values = registry.get_histogram_values("test_histogram", labels)
        assert values == [10, 20, 30]

    def test_different_labels_tracked_separately(self):
        """Different label combinations are tracked separately."""
        registry = get_registry()

        registry.inc_counter("counter", {"intent": "backlog_list"})
        registry.inc_counter("counter", {"intent": "sprint_progress"})
        registry.inc_counter("counter", {"intent": "backlog_list"})

        assert registry.get_counter("counter", {"intent": "backlog_list"}) == 2
        assert registry.get_counter("counter", {"intent": "sprint_progress"}) == 1


# =============================================================================
# Metric Recording Tests
# =============================================================================

class TestMetricRecording:
    """Test metric recording functions."""

    def setup_method(self):
        """Reset registry before each test."""
        get_registry().reset()

    def test_record_response(self):
        """record_response updates counters and histograms."""
        record_response(
            intent="backlog_list",
            final_status="success",
            duration_ms=150,
            env="prod",
        )

        registry = get_registry()
        labels = {
            "intent": "backlog_list",
            "final_status": "success",
            "env": "prod",
            "build_version": "",
        }
        assert registry.get_counter(RESPONSE_TOTAL, labels) == 1

    def test_record_clarification(self):
        """record_clarification updates counter."""
        record_clarification(
            intent="backlog_list",
            trigger_type="empty",
            env="dev",
        )

        registry = get_registry()
        labels = {
            "intent": "backlog_list",
            "trigger_type": "empty",
            "env": "dev",
        }
        assert registry.get_counter(CLARIFICATION_TOTAL, labels) == 1

    def test_record_fallback(self):
        """record_fallback updates counter."""
        record_fallback(
            intent="sprint_progress",
            action_type="auto_scope",
            success=True,
        )

        registry = get_registry()
        labels = {
            "intent": "sprint_progress",
            "action_type": "auto_scope",
            "success": "true",
        }
        assert registry.get_counter(FALLBACK_TOTAL, labels) == 1

    def test_set_pending_clarifications(self):
        """set_pending_clarifications updates gauge."""
        set_pending_clarifications("backlog_list", 3)

        registry = get_registry()
        assert registry.get_gauge(PENDING_CLARIFICATIONS, {"intent": "backlog_list"}) == 3

    def test_record_emission_failure(self):
        """record_emission_failure updates counter."""
        record_emission_failure()
        record_emission_failure()

        registry = get_registry()
        assert registry.get_counter(EMISSION_FAILURES, {}) == 2


# =============================================================================
# Health Summary Tests
# =============================================================================

class TestHealthSummary:
    """Test health summary calculations."""

    def test_success_rate_calculation(self):
        """Success rate is calculated correctly."""
        summary = HealthSummary(
            total_queries=100,
            success_count=80,
            recovered_count=10,
            failed_count=10,
        )
        # Success rate = (success + recovered) / total * 100
        assert summary.success_rate == 90.0

    def test_recovery_rate_calculation(self):
        """Recovery rate is calculated correctly."""
        summary = HealthSummary(
            total_queries=100,
            recovered_count=8,
            failed_count=2,
        )
        # Recovery rate = recovered / (recovered + failed) * 100
        assert summary.recovery_rate == 80.0

    def test_recovery_rate_no_recovery_needed(self):
        """Recovery rate is 100% when no recovery needed."""
        summary = HealthSummary(
            total_queries=100,
            recovered_count=0,
            failed_count=0,
        )
        assert summary.recovery_rate == 100.0

    def test_clarification_rate_calculation(self):
        """Clarification rate is calculated correctly."""
        summary = HealthSummary(
            total_queries=100,
            clarification_count=15,
        )
        assert summary.clarification_rate == 15.0

    def test_failure_rate_calculation(self):
        """Failure rate is calculated correctly."""
        summary = HealthSummary(
            total_queries=100,
            failed_count=5,
        )
        assert summary.failure_rate == 5.0

    def test_health_status_healthy(self):
        """HEALTHY status when rates are good."""
        summary = HealthSummary(
            total_queries=100,
            success_count=90,
            recovered_count=8,
            failed_count=2,
        )
        # success_rate = 98%, recovery_rate = 80%
        assert summary.health_status == "HEALTHY"

    def test_health_status_warning(self):
        """WARNING status when rates are borderline."""
        summary = HealthSummary(
            total_queries=100,
            success_count=85,
            recovered_count=5,
            failed_count=10,
        )
        # success_rate = 90%, recovery_rate = 33%
        assert summary.health_status == "WARNING"

    def test_health_status_critical(self):
        """CRITICAL status when rates are poor."""
        summary = HealthSummary(
            total_queries=100,
            success_count=60,
            recovered_count=5,
            failed_count=35,
        )
        # success_rate = 65%, recovery_rate = 12.5%
        assert summary.health_status == "CRITICAL"

    def test_to_dict(self):
        """Health summary serializes to dict."""
        summary = HealthSummary(
            total_queries=100,
            success_count=85,
            recovered_count=10,
            failed_count=5,
        )
        d = summary.to_dict()
        assert d["total_queries"] == 100
        assert d["success_rate"] == 95.0
        assert "health_status" in d

    def test_to_narrative(self):
        """Health summary generates readable narrative."""
        summary = HealthSummary(
            total_queries=100,
            success_count=85,
            recovered_count=10,
            failed_count=5,
        )
        narrative = summary.to_narrative()
        assert "System Health" in narrative
        assert "Total Queries" in narrative
        assert "100" in narrative

    def test_zero_queries_no_division_error(self):
        """No division by zero when total_queries is 0."""
        summary = HealthSummary(total_queries=0)
        assert summary.success_rate == 0.0
        assert summary.clarification_rate == 0.0
        assert summary.failure_rate == 0.0


# =============================================================================
# Intent Stats Tests
# =============================================================================

class TestIntentStats:
    """Test intent-level statistics."""

    def test_intent_stats_success_rate(self):
        """IntentStats calculates success rate correctly."""
        stats = IntentStats(
            intent="backlog_list",
            total=100,
            success=70,
            recovered=20,
            failed=10,
        )
        # Success rate = (success + recovered) / total * 100
        assert stats.success_rate == 90.0

    def test_intent_stats_failure_rate(self):
        """IntentStats calculates failure rate correctly."""
        stats = IntentStats(
            intent="sprint_progress",
            total=50,
            success=40,
            recovered=5,
            failed=5,
        )
        assert stats.failure_rate == 10.0

    def test_intent_stats_zero_total(self):
        """IntentStats handles zero total."""
        stats = IntentStats(intent="unknown", total=0)
        assert stats.success_rate == 0.0
        assert stats.failure_rate == 0.0


# =============================================================================
# Heatmap Cell Tests
# =============================================================================

class TestHeatmapCell:
    """Test failure heatmap cells."""

    def test_severity_low(self):
        """Low severity for count < 10."""
        cell = HeatmapCell(intent="backlog_list", failure_type="empty", count=5)
        assert cell.severity == "low"

    def test_severity_medium(self):
        """Medium severity for count 10-29."""
        cell = HeatmapCell(intent="backlog_list", failure_type="empty", count=15)
        assert cell.severity == "medium"

    def test_severity_high(self):
        """High severity for count 30-49."""
        cell = HeatmapCell(intent="backlog_list", failure_type="empty", count=35)
        assert cell.severity == "high"

    def test_severity_critical(self):
        """Critical severity for count >= 50."""
        cell = HeatmapCell(intent="backlog_list", failure_type="empty", count=75)
        assert cell.severity == "critical"


# =============================================================================
# Integration Tests
# =============================================================================

class TestP4Integration:
    """Integration tests for P4 observability."""

    def setup_method(self):
        """Reset state before each test."""
        get_registry().reset()
        set_trace_id("")

    def test_full_query_flow_events(self):
        """Simulate full query flow with events."""
        backend = MemoryBackend()
        emitter = P4EventEmitter()
        emitter.add_backend(backend)

        trace_id = generate_trace_id()

        # P0: Query received
        emitter.emit(
            EventType.QUERY_RECEIVED.value,
            {"query": "show backlog"},
            trace_id=trace_id,
            phase="P0",
        )

        # P0: Intent classified
        emitter.emit(
            EventType.INTENT_CLASSIFIED.value,
            create_payload(
                EventType.INTENT_CLASSIFIED.value,
                query="show backlog",
                intent="backlog_list",
                confidence=0.92,
                threshold=0.5,
                basis="keyword_match",
            ),
            trace_id=trace_id,
            phase="P0",
        )

        # P1: Data query
        emitter.emit(
            EventType.DATA_QUERY_EXECUTED.value,
            create_payload(
                EventType.DATA_QUERY_EXECUTED.value,
                query_type="sql",
                query_name="backlog_items",
                row_count=25,
                is_empty=False,
            ),
            trace_id=trace_id,
            phase="P1",
        )

        # Final: Response generated
        emitter.emit(
            EventType.RESPONSE_GENERATED.value,
            create_payload(
                EventType.RESPONSE_GENERATED.value,
                intent="backlog_list",
                final_status=FinalStatus.SUCCESS.value,
                has_data=True,
                total_duration_ms=150,
            ),
            trace_id=trace_id,
            phase="P4",
        )

        # Verify all events captured
        events = backend.get_events_by_trace(trace_id)
        assert len(events) == 4

        event_types = [e.event_type for e in events]
        assert EventType.QUERY_RECEIVED.value in event_types
        assert EventType.INTENT_CLASSIFIED.value in event_types
        assert EventType.DATA_QUERY_EXECUTED.value in event_types
        assert EventType.RESPONSE_GENERATED.value in event_types

    def test_metrics_from_events(self):
        """Metrics are updated from events via aggregator."""
        from p4_events import P4Event

        # Create mock event
        event = P4Event(
            event_type=EventType.RESPONSE_GENERATED.value,
            payload={
                "intent": "backlog_list",
                "final_status": FinalStatus.SUCCESS.value,
                "total_duration_ms": 200,
            },
            runtime=RuntimeMetadata(env="test"),
        )

        # Process with aggregator
        MetricsAggregator.process_event(event)

        # Verify metrics updated
        registry = get_registry()
        labels = {
            "intent": "backlog_list",
            "final_status": "success",
            "env": "test",
            "build_version": "",
        }
        assert registry.get_counter(RESPONSE_TOTAL, labels) == 1

    def test_calculate_health_summary_from_metrics(self):
        """Health summary is calculated from recorded metrics."""
        # Record various responses
        record_response("backlog_list", "success", 100)
        record_response("backlog_list", "success", 120)
        record_response("sprint_progress", "success", 150)
        record_response("backlog_list", "recovered_success", 300)
        record_response("sprint_progress", "failed", 500)

        record_clarification("backlog_list", "empty")

        summary = calculate_health_summary()

        assert summary.total_queries == 5
        assert summary.success_count == 3
        assert summary.recovered_count == 1
        assert summary.failed_count == 1
        assert summary.clarification_count == 1

    def test_intent_stats_from_metrics(self):
        """Intent stats are aggregated from recorded metrics."""
        # Record responses for different intents
        record_response("backlog_list", "success", 100)
        record_response("backlog_list", "success", 110)
        record_response("backlog_list", "failed", 200)
        record_response("sprint_progress", "success", 150)

        stats = get_intent_stats()

        # Should be sorted by total (descending)
        assert len(stats) >= 2
        assert stats[0].intent == "backlog_list"
        assert stats[0].total == 3
        assert stats[0].success == 2
        assert stats[0].failed == 1
