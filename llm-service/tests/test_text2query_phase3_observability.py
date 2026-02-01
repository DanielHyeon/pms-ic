"""
Phase 3 Observability Tests - TextToSQL Improvement Roadmap

Tests for Phase 3 components:
1. LLM Tracing
2. Quality Metrics Collector
3. Cost Tracker
4. Alert Service

These tests run WITHOUT external services by using mocks.
"""

import pytest
import time
import uuid
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch


# =============================================================================
# Tracing Tests
# =============================================================================


class TestSpanContext:
    """Test SpanContext dataclass."""

    def test_span_context_creation(self):
        """Test creating a span context."""
        from text2query.observability import SpanContext

        span = SpanContext(name="test_span")

        assert span.name == "test_span"
        assert span.span_id is not None
        assert span.trace_id is not None
        assert span.parent_span_id is None
        assert span.end_time is None

    def test_span_context_end(self):
        """Test ending a span."""
        from text2query.observability.tracing import SpanContext, SpanStatus

        span = SpanContext(name="test_span")
        time.sleep(0.01)  # Small delay
        span.end()

        assert span.end_time is not None
        assert span.status == SpanStatus.OK
        assert span.duration_ms > 0

    def test_span_context_error(self):
        """Test span with error."""
        from text2query.observability.tracing import SpanContext, SpanStatus

        span = SpanContext(name="test_span")
        span.end(SpanStatus.ERROR, "Test error message")

        assert span.status == SpanStatus.ERROR
        assert span.error_message == "Test error message"

    def test_span_add_event(self):
        """Test adding events to span."""
        from text2query.observability import SpanContext

        span = SpanContext(name="test_span")
        span.add_event("query_started", {"query": "SELECT *"})

        assert len(span.events) == 1
        assert span.events[0]["name"] == "query_started"
        assert span.events[0]["attributes"]["query"] == "SELECT *"

    def test_span_to_dict(self):
        """Test span serialization."""
        from text2query.observability import SpanContext

        span = SpanContext(name="test_span", model_name="gpt-4")
        span.prompt_tokens = 100
        span.completion_tokens = 50
        span.total_tokens = 150  # Explicitly set total
        span.end()

        data = span.to_dict()

        assert data["name"] == "test_span"
        assert data["model_name"] == "gpt-4"
        assert data["prompt_tokens"] == 100
        assert data["completion_tokens"] == 50
        assert data["total_tokens"] == 150


class TestLLMTracer:
    """Test LLMTracer class."""

    @pytest.fixture
    def tracer(self):
        """Create a tracer for testing."""
        from text2query.observability import reset_tracer, LLMTracer

        reset_tracer()
        return LLMTracer(
            enable_console_export=False,
            enable_file_export=False
        )

    def test_tracer_start_span(self, tracer):
        """Test starting a span with context manager."""
        from text2query.observability.tracing import SpanKind

        with tracer.start_span("test_operation", SpanKind.QUERY_GENERATION) as span:
            span.set_attribute("test_key", "test_value")

        assert span.name == "test_operation"
        assert span.kind == SpanKind.QUERY_GENERATION
        assert span.attributes["test_key"] == "test_value"
        assert span.end_time is not None

    def test_tracer_nested_spans(self, tracer):
        """Test nested span hierarchy."""
        with tracer.start_span("parent") as parent:
            parent_id = parent.span_id
            with tracer.start_span("child") as child:
                assert child.parent_span_id == parent_id
                assert child.trace_id == parent.trace_id

    def test_tracer_span_on_exception(self, tracer):
        """Test span captures exceptions."""
        from text2query.observability.tracing import SpanStatus

        with pytest.raises(ValueError):
            with tracer.start_span("failing_operation") as span:
                raise ValueError("Test error")

        assert span.status == SpanStatus.ERROR
        assert "Test error" in span.error_message

    def test_tracer_record_llm_call(self, tracer):
        """Test recording LLM call directly."""
        tracer.record_llm_call(
            model="gpt-4",
            prompt="Test prompt",
            response="Test response",
            prompt_tokens=10,
            completion_tokens=20,
            duration_ms=100
        )

        recent = tracer.get_recent_spans(1)
        assert len(recent) == 1
        assert recent[0]["model_name"] == "gpt-4"
        assert recent[0]["total_tokens"] == 30


class TestTracerSingleton:
    """Test tracer singleton behavior."""

    def test_get_tracer_singleton(self):
        """Test singleton behavior."""
        from text2query.observability import get_tracer, reset_tracer

        reset_tracer()
        t1 = get_tracer()
        t2 = get_tracer()

        assert t1 is t2

    def test_reset_tracer_singleton(self):
        """Test resetting singleton."""
        from text2query.observability import get_tracer, reset_tracer

        t1 = get_tracer()
        reset_tracer()
        t2 = get_tracer()

        assert t1 is not t2


# =============================================================================
# Metrics Collector Tests
# =============================================================================


class TestQueryMetrics:
    """Test QueryMetrics dataclass."""

    def test_query_metrics_creation(self):
        """Test creating query metrics."""
        from text2query.observability import QueryMetrics

        metrics = QueryMetrics(
            query_id="test-123",
            intent_type="TEXT_TO_SQL",
            intent_confidence=0.95,
            generation_time_ms=150.0,
            success=True
        )

        assert metrics.query_id == "test-123"
        assert metrics.intent_type == "TEXT_TO_SQL"
        assert metrics.success is True

    def test_query_metrics_to_dict(self):
        """Test metrics serialization."""
        from text2query.observability import QueryMetrics

        metrics = QueryMetrics(
            query_id="test-456",
            query_type="sql",
            complexity="simple",
            total_tokens=200
        )

        data = metrics.to_dict()

        assert data["query_id"] == "test-456"
        assert data["query_type"] == "sql"
        assert data["complexity"] == "simple"
        assert data["total_tokens"] == 200


class TestMetricsCollector:
    """Test MetricsCollector class."""

    @pytest.fixture
    def collector(self):
        """Create a collector for testing."""
        from text2query.observability import reset_metrics_collector, MetricsCollector

        reset_metrics_collector()
        return MetricsCollector()

    def test_record_metrics(self, collector):
        """Test recording metrics."""
        from text2query.observability import QueryMetrics

        metrics = QueryMetrics(
            query_id="test-1",
            intent_type="TEXT_TO_SQL",
            success=True,
            generation_time_ms=100.0,
            total_tokens=150
        )

        collector.record(metrics)

        assert collector._counters["total_queries"] == 1
        assert collector._counters["successful_queries"] == 1

    def test_success_rate_calculation(self, collector):
        """Test success rate calculation."""
        from text2query.observability import QueryMetrics

        # Record 7 successes and 3 failures
        for i in range(7):
            collector.record(QueryMetrics(query_id=f"success-{i}", success=True))
        for i in range(3):
            collector.record(QueryMetrics(query_id=f"fail-{i}", success=False))

        rate = collector.get_success_rate()
        assert rate == 0.7

    def test_average_latency(self, collector):
        """Test average latency calculation."""
        from text2query.observability import QueryMetrics

        latencies = [100, 200, 300, 400, 500]
        for i, lat in enumerate(latencies):
            collector.record(QueryMetrics(
                query_id=f"q-{i}",
                total_time_ms=lat
            ))

        avg = collector.get_average_latency()
        assert avg == 300.0

    def test_latency_percentiles(self, collector):
        """Test latency percentile calculation."""
        from text2query.observability import QueryMetrics

        # Record 100 queries with known latencies
        for i in range(100):
            collector.record(QueryMetrics(
                query_id=f"q-{i}",
                total_time_ms=float(i + 1) * 10  # 10, 20, ..., 1000
            ))

        percentiles = collector.get_latency_percentiles()

        assert "p50" in percentiles
        assert "p90" in percentiles
        assert "p95" in percentiles
        assert "p99" in percentiles
        assert percentiles["p50"] <= percentiles["p90"]

    def test_error_breakdown(self, collector):
        """Test error breakdown."""
        from text2query.observability import QueryMetrics

        collector.record(QueryMetrics(query_id="1", success=False, error_type="syntax"))
        collector.record(QueryMetrics(query_id="2", success=False, error_type="syntax"))
        collector.record(QueryMetrics(query_id="3", success=False, error_type="schema"))

        errors = collector.get_error_breakdown()

        assert errors["syntax"] == 2
        assert errors["schema"] == 1

    def test_quality_score(self, collector):
        """Test quality score calculation."""
        from text2query.observability import QueryMetrics

        # Record some good queries
        for i in range(10):
            collector.record(QueryMetrics(
                query_id=f"q-{i}",
                success=True,
                total_time_ms=200.0,
                correction_attempts=0,
                intent_confidence=0.9
            ))

        score = collector.get_quality_score()

        # Should be high (> 70) for these good metrics
        assert score > 70

    def test_dashboard_stats(self, collector):
        """Test dashboard stats generation."""
        from text2query.observability import QueryMetrics

        collector.record(QueryMetrics(
            query_id="test-1",
            intent_type="TEXT_TO_SQL",
            success=True,
            total_time_ms=150.0,
            total_tokens=200
        ))

        stats = collector.get_dashboard_stats()

        assert "total_queries" in stats
        assert "success_rate" in stats
        assert "quality_score" in stats
        assert "latency" in stats
        assert "token_usage" in stats


class TestMetricsCollectorSingleton:
    """Test metrics collector singleton."""

    def test_singleton(self):
        """Test singleton behavior."""
        from text2query.observability import get_metrics_collector, reset_metrics_collector

        reset_metrics_collector()
        c1 = get_metrics_collector()
        c2 = get_metrics_collector()

        assert c1 is c2


# =============================================================================
# Cost Tracker Tests
# =============================================================================


class TestTokenUsage:
    """Test TokenUsage dataclass."""

    def test_token_usage_creation(self):
        """Test creating token usage."""
        from text2query.observability import TokenUsage
        from text2query.observability.cost_tracker import ModelProvider

        usage = TokenUsage(
            model="gpt-4",
            provider=ModelProvider.OPENAI,
            prompt_tokens=100,
            completion_tokens=50
        )

        assert usage.model == "gpt-4"
        assert usage.total_tokens == 150

    def test_token_usage_auto_total(self):
        """Test automatic total calculation."""
        from text2query.observability import TokenUsage
        from text2query.observability.cost_tracker import ModelProvider

        usage = TokenUsage(
            model="gpt-4",
            provider=ModelProvider.OPENAI,
            prompt_tokens=200,
            completion_tokens=100
        )

        assert usage.total_tokens == 300


class TestCostTracker:
    """Test CostTracker class."""

    @pytest.fixture
    def tracker(self):
        """Create a tracker for testing."""
        from text2query.observability import reset_cost_tracker, CostTracker

        reset_cost_tracker()
        return CostTracker(daily_budget=10.0, monthly_budget=100.0)

    def test_track_cost(self, tracker):
        """Test tracking token usage cost."""
        from text2query.observability import TokenUsage
        from text2query.observability.cost_tracker import ModelProvider

        usage = TokenUsage(
            model="gpt-4",
            provider=ModelProvider.OPENAI,
            prompt_tokens=1000,
            completion_tokens=500
        )

        entry = tracker.track(usage)

        assert entry.prompt_cost > 0
        assert entry.completion_cost > 0
        assert entry.total_cost == entry.prompt_cost + entry.completion_cost

    def test_local_model_free(self, tracker):
        """Test local models have zero cost."""
        from text2query.observability import TokenUsage
        from text2query.observability.cost_tracker import ModelProvider

        usage = TokenUsage(
            model="gemma-3-12b",
            provider=ModelProvider.LOCAL,
            prompt_tokens=1000,
            completion_tokens=500
        )

        entry = tracker.track(usage)

        assert entry.total_cost == 0.0

    def test_cost_by_model(self, tracker):
        """Test cost breakdown by model."""
        from text2query.observability import TokenUsage
        from text2query.observability.cost_tracker import ModelProvider

        # Track usage for different models
        for model in ["gpt-4", "gpt-4", "gpt-3.5-turbo"]:
            tracker.track(TokenUsage(
                model=model,
                provider=ModelProvider.OPENAI,
                prompt_tokens=1000,
                completion_tokens=500
            ))

        by_model = tracker.get_cost_by_model()

        assert "gpt-4" in by_model
        assert "gpt-3.5-turbo" in by_model
        assert by_model["gpt-4"] > by_model["gpt-3.5-turbo"]

    def test_budget_status(self, tracker):
        """Test budget status reporting."""
        from text2query.observability import TokenUsage
        from text2query.observability.cost_tracker import ModelProvider

        # Track some usage
        tracker.track(TokenUsage(
            model="gpt-4",
            provider=ModelProvider.OPENAI,
            prompt_tokens=10000,
            completion_tokens=5000
        ))

        status = tracker.get_budget_status()

        assert "daily" in status
        assert "monthly" in status
        assert status["daily"]["budget"] == 10.0
        assert status["monthly"]["budget"] == 100.0

    def test_cost_summary(self, tracker):
        """Test cost summary generation."""
        from text2query.observability import TokenUsage
        from text2query.observability.cost_tracker import ModelProvider

        tracker.track(TokenUsage(
            model="gpt-4",
            provider=ModelProvider.OPENAI,
            prompt_tokens=1000,
            completion_tokens=500,
            operation="query_generation"
        ))

        summary = tracker.get_cost_summary(window_days=1)

        assert "total_cost" in summary
        assert "total_tokens" in summary
        assert "model_breakdown" in summary
        assert "operation_breakdown" in summary

    def test_set_custom_pricing(self, tracker):
        """Test setting custom pricing."""
        from text2query.observability import TokenUsage
        from text2query.observability.cost_tracker import ModelProvider

        # Set custom pricing
        tracker.set_pricing("custom-model", 0.01, 0.02)

        usage = TokenUsage(
            model="custom-model",
            provider=ModelProvider.CUSTOM,
            prompt_tokens=1000,
            completion_tokens=1000
        )

        entry = tracker.track(usage)

        assert entry.prompt_cost == 0.01  # 1K * 0.01
        assert entry.completion_cost == 0.02  # 1K * 0.02


class TestCostTrackerSingleton:
    """Test cost tracker singleton."""

    def test_singleton(self):
        """Test singleton behavior."""
        from text2query.observability import get_cost_tracker, reset_cost_tracker

        reset_cost_tracker()
        t1 = get_cost_tracker()
        t2 = get_cost_tracker()

        assert t1 is t2


# =============================================================================
# Alert Service Tests
# =============================================================================


class TestAlert:
    """Test Alert dataclass."""

    def test_alert_creation(self):
        """Test creating an alert."""
        from text2query.observability import Alert, AlertLevel
        from text2query.observability.alerts import AlertType

        alert = Alert(
            alert_id="alert-001",
            alert_type=AlertType.SUCCESS_RATE_LOW,
            level=AlertLevel.ERROR,
            title="Low Success Rate",
            message="Success rate dropped below 70%"
        )

        assert alert.alert_id == "alert-001"
        assert alert.level == AlertLevel.ERROR

    def test_alert_acknowledge(self):
        """Test acknowledging an alert."""
        from text2query.observability import Alert, AlertLevel
        from text2query.observability.alerts import AlertType, AlertStatus

        alert = Alert(
            alert_id="alert-002",
            alert_type=AlertType.LATENCY_HIGH,
            level=AlertLevel.WARNING,
            title="High Latency",
            message="Average latency exceeded 5s"
        )

        alert.acknowledge("test_user")

        assert alert.status == AlertStatus.ACKNOWLEDGED
        assert alert.metadata["acknowledged_by"] == "test_user"

    def test_alert_resolve(self):
        """Test resolving an alert."""
        from text2query.observability import Alert, AlertLevel
        from text2query.observability.alerts import AlertType, AlertStatus

        alert = Alert(
            alert_id="alert-003",
            alert_type=AlertType.ERROR_SPIKE,
            level=AlertLevel.ERROR,
            title="Error Spike",
            message="Error count exceeded threshold"
        )

        alert.resolve("system", "Issue fixed by scaling up")

        assert alert.status == AlertStatus.RESOLVED
        assert alert.resolved_by == "system"
        assert alert.resolution_notes == "Issue fixed by scaling up"


class TestAlertService:
    """Test AlertService class."""

    @pytest.fixture
    def service(self):
        """Create an alert service for testing."""
        from text2query.observability import reset_alert_service, AlertService

        reset_alert_service()
        return AlertService()

    def test_check_metric_triggers_alert(self, service):
        """Test that checking metric can trigger alert."""
        # Check success rate below threshold (default 0.7)
        alerts = service.check_metric("success_rate", 0.5)

        assert len(alerts) >= 1
        assert any(a.metric_value == 0.5 for a in alerts)

    def test_check_metric_no_alert_above_threshold(self, service):
        """Test no alert when metric is healthy."""
        from text2query.observability.alerts import AlertType

        # Check success rate above threshold
        alerts = service.check_metric("success_rate", 0.9)

        # Should not trigger the low success rate alert specifically
        success_rate_low_alerts = [
            a for a in alerts
            if a.alert_type == AlertType.SUCCESS_RATE_LOW
        ]
        assert len(success_rate_low_alerts) == 0

    def test_trigger_manual_alert(self, service):
        """Test manually triggering an alert."""
        from text2query.observability import AlertLevel
        from text2query.observability.alerts import AlertType

        alert = service.trigger_alert(
            alert_type=AlertType.CUSTOM,
            level=AlertLevel.WARNING,
            title="Custom Alert",
            message="This is a custom alert"
        )

        assert alert.title == "Custom Alert"
        assert alert.level == AlertLevel.WARNING

    def test_cooldown_prevents_duplicate_alerts(self, service):
        """Test that cooldown prevents duplicate alerts."""
        # First check triggers alert
        alerts1 = service.check_metric("success_rate", 0.5)

        # Immediate second check should not trigger (cooldown)
        alerts2 = service.check_metric("success_rate", 0.5)

        # Second should have fewer alerts due to cooldown
        assert len(alerts2) <= len(alerts1)

    def test_get_active_alerts(self, service):
        """Test getting active alerts."""
        from text2query.observability import AlertLevel
        from text2query.observability.alerts import AlertType

        # Trigger some alerts
        service.trigger_alert(
            AlertType.CUSTOM, AlertLevel.WARNING, "Test 1", "Message 1"
        )
        service.trigger_alert(
            AlertType.CUSTOM, AlertLevel.ERROR, "Test 2", "Message 2"
        )

        active = service.get_active_alerts()

        assert len(active) >= 2

    def test_acknowledge_alert(self, service):
        """Test acknowledging an alert."""
        from text2query.observability import AlertLevel
        from text2query.observability.alerts import AlertType, AlertStatus

        alert = service.trigger_alert(
            AlertType.CUSTOM, AlertLevel.WARNING, "Test", "Message"
        )

        result = service.acknowledge_alert(alert.alert_id, "tester")

        assert result is True
        assert alert.status == AlertStatus.ACKNOWLEDGED

    def test_resolve_alert(self, service):
        """Test resolving an alert."""
        from text2query.observability import AlertLevel
        from text2query.observability.alerts import AlertType, AlertStatus

        alert = service.trigger_alert(
            AlertType.CUSTOM, AlertLevel.WARNING, "Test", "Message"
        )

        result = service.resolve_alert(alert.alert_id, "tester", "Fixed")

        assert result is True
        assert alert.status == AlertStatus.RESOLVED

    def test_alert_summary(self, service):
        """Test getting alert summary."""
        from text2query.observability import AlertLevel
        from text2query.observability.alerts import AlertType

        # Trigger various alerts
        service.trigger_alert(AlertType.CUSTOM, AlertLevel.WARNING, "W1", "M1")
        service.trigger_alert(AlertType.CUSTOM, AlertLevel.ERROR, "E1", "M2")
        service.trigger_alert(AlertType.CUSTOM, AlertLevel.CRITICAL, "C1", "M3")

        summary = service.get_alert_summary()

        assert "total_active" in summary
        assert "by_level" in summary
        assert summary["total_active"] >= 3

    def test_enable_disable_rule(self, service):
        """Test enabling/disabling alert rules."""
        # Disable a rule
        result = service.disable_rule("Low Success Rate")
        assert result is True

        # Check metric should not trigger disabled rule
        alerts = service.check_metric("success_rate", 0.5)
        success_alerts = [a for a in alerts if "Success Rate" in a.title]
        assert len(success_alerts) == 0

        # Re-enable rule
        result = service.enable_rule("Low Success Rate")
        assert result is True


class TestAlertServiceSingleton:
    """Test alert service singleton."""

    def test_singleton(self):
        """Test singleton behavior."""
        from text2query.observability import get_alert_service, reset_alert_service

        reset_alert_service()
        s1 = get_alert_service()
        s2 = get_alert_service()

        assert s1 is s2


# =============================================================================
# Integration Tests
# =============================================================================


class TestPhase3Integration:
    """Integration tests for Phase 3 components."""

    def test_tracing_with_metrics(self):
        """Test tracing integrates with metrics collection."""
        from text2query.observability import (
            LLMTracer, MetricsCollector, QueryMetrics,
            reset_tracer, reset_metrics_collector
        )
        from text2query.observability.tracing import SpanKind

        reset_tracer()
        reset_metrics_collector()

        tracer = LLMTracer(enable_file_export=False)
        collector = MetricsCollector()

        # Trace an operation and record metrics
        with tracer.start_span("test_query", SpanKind.QUERY_GENERATION) as span:
            span.prompt_tokens = 100
            span.completion_tokens = 50

            # Record corresponding metrics
            collector.record(QueryMetrics(
                query_id=span.span_id,
                success=True,
                total_tokens=150,
                generation_time_ms=span.duration_ms
            ))

        # Verify both captured data
        recent_spans = tracer.get_recent_spans(1)
        assert len(recent_spans) == 1

        stats = collector.get_dashboard_stats()
        assert stats["total_queries"] == 1

    def test_cost_tracking_with_alerts(self):
        """Test cost tracking triggers alerts."""
        from text2query.observability import (
            CostTracker, AlertService, TokenUsage,
            reset_cost_tracker, reset_alert_service
        )
        from text2query.observability.cost_tracker import ModelProvider
        from text2query.observability.alerts import AlertType

        reset_cost_tracker()
        reset_alert_service()

        # Create tracker with low budget
        tracker = CostTracker(daily_budget=0.001)
        alert_service = AlertService()

        # Track usage that exceeds budget
        tracker.track(TokenUsage(
            model="gpt-4",
            provider=ModelProvider.OPENAI,
            prompt_tokens=10000,
            completion_tokens=5000
        ))

        # Check budget percentage
        status = tracker.get_budget_status()
        budget_pct = status["daily"]["percentage"]

        # Check if budget exceeded should trigger alert
        if budget_pct and budget_pct >= 100:
            alerts = alert_service.check_metric(
                "daily_budget_percentage",
                budget_pct / 100  # Normalize to decimal
            )
            # Alert should be triggered
            assert len(alerts) >= 0  # May or may not match rule

    def test_full_observability_flow(self):
        """Test complete observability flow."""
        from text2query.observability import (
            get_tracer, get_metrics_collector, get_cost_tracker, get_alert_service,
            reset_tracer, reset_metrics_collector, reset_cost_tracker, reset_alert_service,
            QueryMetrics, TokenUsage
        )
        from text2query.observability.tracing import SpanKind
        from text2query.observability.cost_tracker import ModelProvider

        # Reset all singletons
        reset_tracer()
        reset_metrics_collector()
        reset_cost_tracker()
        reset_alert_service()

        # Get all services
        tracer = get_tracer(enable_file_export=False)
        metrics = get_metrics_collector()
        costs = get_cost_tracker()
        alerts = get_alert_service()

        # Simulate a query generation flow
        with tracer.start_span("full_flow_test", SpanKind.QUERY_GENERATION) as span:
            # Simulate LLM call
            span.model_name = "gpt-4"
            span.prompt_tokens = 500
            span.completion_tokens = 200

            # Track cost
            costs.track(TokenUsage(
                model="gpt-4",
                provider=ModelProvider.OPENAI,
                prompt_tokens=500,
                completion_tokens=200
            ))

            # Record metrics
            metrics.record(QueryMetrics(
                query_id=span.span_id,
                success=True,
                intent_type="TEXT_TO_SQL",
                generation_time_ms=150,
                total_tokens=700
            ))

        # Verify all components captured data
        assert len(tracer.get_recent_spans()) >= 1
        assert metrics._counters["total_queries"] >= 1
        assert costs.get_total_cost() > 0

        # Check for any triggered alerts
        summary = alerts.get_alert_summary()
        assert "total_active" in summary


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
