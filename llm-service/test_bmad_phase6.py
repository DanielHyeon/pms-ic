"""
BMAD Phase 6 Tests: Observability & Metrics

Tests for:
- BMAD Metrics Emitter
- State Store
- Timing Wrapper
- Trace ID Propagation

Reference: docs/llm-improvement/06-observability-metrics.md
"""

import pytest
import time
from datetime import datetime, timedelta


# =============================================================================
# Test BMAD Metrics Emitter
# =============================================================================

class TestBMADMetricsEmitter:
    """Tests for BMADMetricsEmitter."""

    def test_emit_guardian_verdict(self):
        """Test emitting guardian verdict metric."""
        from observability.bmad_metrics import BMADMetricsEmitter
        from observability.metrics import MetricsCollector

        collector = MetricsCollector()
        emitter = BMADMetricsEmitter(collector)

        emitter.emit_guardian_verdict("QUALITY", "PASS")

        metric = collector.get_metric(
            "guardian_verdict_total",
            labels={"track": "QUALITY", "verdict": "PASS"}
        )
        assert metric is not None
        assert metric["value"] == 1.0

    def test_emit_retry_count(self):
        """Test emitting retry count histogram."""
        from observability.bmad_metrics import BMADMetricsEmitter
        from observability.metrics import MetricsCollector

        collector = MetricsCollector()
        emitter = BMADMetricsEmitter(collector)

        emitter.emit_retry_count("QUALITY", 2)

        metric = collector.get_metric(
            "retry_count_histogram",
            labels={"track": "QUALITY"}
        )
        assert metric is not None
        assert metric["count"] == 1

    def test_emit_policy_violation(self):
        """Test emitting policy violation counter."""
        from observability.bmad_metrics import BMADMetricsEmitter
        from observability.metrics import MetricsCollector

        collector = MetricsCollector()
        emitter = BMADMetricsEmitter(collector)

        emitter.emit_policy_violation("banned_keyword")

        metric = collector.get_metric(
            "policy_violation_total",
            labels={"type": "banned_keyword"}
        )
        assert metric is not None
        assert metric["value"] == 1.0

    def test_emit_evidence_coverage(self):
        """Test emitting evidence coverage metric."""
        from observability.bmad_metrics import BMADMetricsEmitter
        from observability.metrics import MetricsCollector

        collector = MetricsCollector()
        emitter = BMADMetricsEmitter(collector)

        emitter.emit_evidence_coverage("QUALITY", "STATUS_METRIC", True)

        total = collector.get_metric(
            "evidence_coverage_total",
            labels={"track": "QUALITY", "request_type": "STATUS_METRIC"}
        )
        sufficient = collector.get_metric(
            "evidence_sufficient_total",
            labels={"track": "QUALITY", "request_type": "STATUS_METRIC"}
        )

        assert total is not None
        assert sufficient is not None

    def test_emit_node_timing(self):
        """Test emitting node timing histogram."""
        from observability.bmad_metrics import BMADMetricsEmitter
        from observability.metrics import MetricsCollector

        collector = MetricsCollector()
        emitter = BMADMetricsEmitter(collector)

        emitter.emit_node_timing("analyst_plan", "QUALITY", 500)

        metric = collector.get_metric(
            "node_timing_ms",
            labels={"node": "analyst_plan", "track": "QUALITY"}
        )
        assert metric is not None
        assert metric["count"] == 1

    def test_emit_request_complete(self):
        """Test emitting all metrics for completed request."""
        from observability.bmad_metrics import BMADMetricsEmitter
        from observability.metrics import MetricsCollector

        collector = MetricsCollector()
        emitter = BMADMetricsEmitter(collector)

        state = {
            "track": "QUALITY",
            "request_type": "DESIGN_ARCH",
            "guardian": {
                "verdict": "PASS",
                "reasons": [],
                "required_actions": [],
                "risk_level": "low"
            },
            "evidence": [{"source": "doc"}, {"source": "policy"}],
            "retry_count": 1,
            "timings_ms": {"analyst_plan": 100, "guardian_verify": 50}
        }

        # Should not raise
        emitter.emit_request_complete(state)

        # Verify guardian verdict was emitted
        metric = collector.get_metric(
            "guardian_verdict_total",
            labels={"track": "QUALITY", "verdict": "PASS"}
        )
        assert metric is not None

    def test_emit_fast_track_metrics(self):
        """Test FAST track specific metrics."""
        from observability.bmad_metrics import BMADMetricsEmitter
        from observability.metrics import MetricsCollector

        collector = MetricsCollector()
        emitter = BMADMetricsEmitter(collector)

        emitter.emit_fast_track_total()
        emitter.emit_fast_upgrade()
        emitter.emit_fast_safe_exit()

        fast = collector.get_metric("fast_track_total")
        upgrade = collector.get_metric("fast_upgrade_to_quality_total")
        safe_exit = collector.get_metric("fast_safe_exit_total")

        assert fast is not None
        assert upgrade is not None
        assert safe_exit is not None


class TestBMADMetricsGlobal:
    """Tests for global BMAD metrics instance."""

    def test_get_bmad_metrics(self):
        """Test getting global metrics instance."""
        from observability.bmad_metrics import get_bmad_metrics, BMADMetricsEmitter

        metrics = get_bmad_metrics()
        assert isinstance(metrics, BMADMetricsEmitter)

    def test_bmad_metrics_alias(self):
        """Test bmad_metrics convenience alias."""
        from observability.bmad_metrics import bmad_metrics, BMADMetricsEmitter

        assert isinstance(bmad_metrics, BMADMetricsEmitter)


# =============================================================================
# Test State Store
# =============================================================================

class TestStateStore:
    """Tests for StateStore."""

    def test_store_state(self):
        """Test storing any state."""
        from observability.state_store import StateStore

        store = StateStore()
        state = {
            "trace_id": "test123",
            "track": "QUALITY",
            "user_query": "What is the status?",
            "guardian": {"verdict": "PASS"}
        }

        store.store_state(state)

        recent = store.get_recent_states(1)
        assert len(recent) == 1
        assert recent[0]["trace_id"] == "test123"

    def test_store_failed_state(self):
        """Test storing failed state."""
        from observability.state_store import StateStore

        store = StateStore()
        state = {
            "trace_id": "fail123",
            "track": "QUALITY",
            "user_query": "Test query",
            "guardian": {
                "verdict": "FAIL",
                "reasons": ["test_reason"]
            }
        }

        store.store_failed_state(state)

        failed = store.get_failed_states(1)
        assert len(failed) == 1
        assert failed[0]["trace_id"] == "fail123"
        assert "test_reason" in failed[0]["guardian_reasons"]

    def test_get_state_by_trace(self):
        """Test getting state by trace ID."""
        from observability.state_store import StateStore

        store = StateStore()
        state = {
            "trace_id": "unique123",
            "track": "FAST",
            "guardian": {"verdict": "PASS"}
        }

        store.store_state(state)

        found = store.get_state_by_trace("unique123")
        assert found is not None
        assert found["track"] == "FAST"

        not_found = store.get_state_by_trace("nonexistent")
        assert not_found is None

    def test_get_failed_states_with_filter(self):
        """Test getting failed states with reason filter."""
        from observability.state_store import StateStore

        store = StateStore()

        # Store multiple failed states
        store.store_failed_state({
            "trace_id": "f1",
            "guardian": {"verdict": "FAIL", "reasons": ["policy:banned_keyword"]}
        })
        store.store_failed_state({
            "trace_id": "f2",
            "guardian": {"verdict": "FAIL", "reasons": ["numbers_without_evidence"]}
        })

        # Filter by reason
        policy_fails = store.get_failed_states(reason_filter="policy")
        assert len(policy_fails) == 1
        assert policy_fails[0]["trace_id"] == "f1"

    def test_query_states_by_track(self):
        """Test querying states by track."""
        from observability.state_store import StateStore

        store = StateStore()

        store.store_state({"trace_id": "q1", "track": "QUALITY", "guardian": {}})
        store.store_state({"trace_id": "q2", "track": "FAST", "guardian": {}})

        quality = store.query_states(track="QUALITY")
        assert len(quality) == 1
        assert quality[0]["track"] == "QUALITY"

    def test_get_stats(self):
        """Test getting store statistics."""
        from observability.state_store import StateStore

        store = StateStore()

        store.store_state({"trace_id": "s1", "track": "QUALITY", "guardian": {"verdict": "PASS"}})
        store.store_state({"trace_id": "s2", "track": "QUALITY", "guardian": {"verdict": "FAIL"}})
        store.store_failed_state({"trace_id": "s2", "track": "QUALITY", "guardian": {"verdict": "FAIL", "reasons": ["test"]}})

        stats = store.get_stats()

        assert stats["total_states"] == 3  # 2 + 1 from store_failed_state
        assert stats["failed_states"] == 1
        assert "verdict_distribution" in stats

    def test_clear(self):
        """Test clearing store."""
        from observability.state_store import StateStore

        store = StateStore()
        store.store_state({"trace_id": "c1", "guardian": {}})

        store.clear()

        recent = store.get_recent_states()
        assert len(recent) == 0


class TestStateStoreHelpers:
    """Tests for state store helper functions."""

    def test_store_if_failed(self):
        """Test store_if_failed helper."""
        from observability.state_store import store_if_failed, get_state_store

        store = get_state_store()
        store.clear()

        # PASS verdict - should not store
        store_if_failed({"trace_id": "p1", "guardian": {"verdict": "PASS"}})

        # FAIL verdict - should store
        store_if_failed({"trace_id": "f1", "guardian": {"verdict": "FAIL", "reasons": ["test"]}})

        failed = store.get_failed_states()
        assert any(s["trace_id"] == "f1" for s in failed)


# =============================================================================
# Test Timing Wrapper
# =============================================================================

class TestTimingWrapper:
    """Tests for timing wrapper."""

    def test_time_node_records_duration(self):
        """Test that time_node records duration in state."""
        from nodes.timing import time_node

        state = {"user_query": "test", "track": "QUALITY"}

        def slow_node(s):
            time.sleep(0.05)  # 50ms
            return s

        result = time_node("test_node", state, slow_node)

        assert "timings_ms" in result
        assert "test_node" in result["timings_ms"]
        assert result["timings_ms"]["test_node"] >= 50

    def test_timed_decorator(self):
        """Test timed decorator."""
        from nodes.timing import timed

        @timed("decorated_node")
        def my_node(state):
            time.sleep(0.05)
            return state

        state = {"track": "FAST"}
        result = my_node(state)

        assert "timings_ms" in result
        assert "decorated_node" in result["timings_ms"]
        assert result["timings_ms"]["decorated_node"] >= 50

    def test_init_trace(self):
        """Test trace ID initialization."""
        from nodes.timing import init_trace

        state = {}
        result = init_trace(state)

        assert "trace_id" in result
        assert len(result["trace_id"]) > 0

    def test_init_trace_preserves_existing(self):
        """Test that existing trace ID is preserved."""
        from nodes.timing import init_trace

        state = {"trace_id": "existing123"}
        result = init_trace(state)

        assert result["trace_id"] == "existing123"

    def test_get_trace_id(self):
        """Test getting trace ID."""
        from nodes.timing import get_trace_id

        assert get_trace_id({"trace_id": "abc123"}) == "abc123"
        assert get_trace_id({}) == "no-trace"


class TestTimingHelpers:
    """Tests for timing helper functions."""

    def test_get_timings(self):
        """Test getting timings from state."""
        from nodes.timing import get_timings

        state = {"timings_ms": {"node1": 100, "node2": 200}}
        timings = get_timings(state)

        assert timings == {"node1": 100, "node2": 200}

    def test_get_timings_empty(self):
        """Test getting timings from empty state."""
        from nodes.timing import get_timings

        assert get_timings({}) == {}
        assert get_timings({"timings_ms": None}) == {}

    def test_get_total_time(self):
        """Test getting total time."""
        from nodes.timing import get_total_time

        state = {"timings_ms": {"node1": 100, "node2": 200}}
        assert get_total_time(state) == 300

    def test_get_node_time(self):
        """Test getting specific node time."""
        from nodes.timing import get_node_time

        state = {"timings_ms": {"node1": 100, "node2": 200}}

        assert get_node_time(state, "node1") == 100
        assert get_node_time(state, "nonexistent") == 0

    def test_get_slowest_node(self):
        """Test getting slowest node."""
        from nodes.timing import get_slowest_node

        state = {"timings_ms": {"fast": 50, "slow": 500, "medium": 200}}
        name, duration = get_slowest_node(state)

        assert name == "slow"
        assert duration == 500

    def test_format_timings(self):
        """Test formatting timings string."""
        from nodes.timing import format_timings

        state = {"timings_ms": {"node1": 100, "node2": 200}}
        formatted = format_timings(state)

        assert "node1=100ms" in formatted
        assert "node2=200ms" in formatted
        assert "total=300ms" in formatted


class TestRequestWrapper:
    """Tests for request wrapper functions."""

    def test_wrap_request(self):
        """Test wrapping request with trace and timing."""
        from nodes.timing import wrap_request

        state = {"user_query": "test"}
        result = wrap_request(state)

        assert "trace_id" in result
        assert "timings_ms" in result
        assert "_request_start" in result

    def test_finalize_request(self):
        """Test finalizing request."""
        from nodes.timing import wrap_request, finalize_request

        state = wrap_request({"user_query": "test", "track": "QUALITY"})
        state["guardian"] = {"verdict": "PASS", "reasons": []}

        time.sleep(0.05)

        result = finalize_request(state)

        assert "timings_ms" in result
        assert "_total" in result["timings_ms"]
        assert result["timings_ms"]["_total"] >= 50


# =============================================================================
# Test Package Exports
# =============================================================================

class TestObservabilityExports:
    """Tests for observability package exports."""

    def test_bmad_metrics_exported(self):
        """Test BMAD metrics exported from package."""
        from observability import (
            BMADMetricsEmitter,
            get_bmad_metrics,
            bmad_metrics,
        )

        assert BMADMetricsEmitter is not None
        assert callable(get_bmad_metrics)
        assert bmad_metrics is not None

    def test_state_store_exported(self):
        """Test state store exported from package."""
        from observability import (
            StateStore,
            get_state_store,
            state_store,
            store_if_failed,
            store_completed_state,
        )

        assert StateStore is not None
        assert callable(get_state_store)
        assert state_store is not None
        assert callable(store_if_failed)
        assert callable(store_completed_state)


class TestNodesTimingExports:
    """Tests for nodes timing exports."""

    def test_timing_functions_exported(self):
        """Test timing functions exported from nodes package."""
        from nodes import (
            time_node,
            emit_timing_metric,
            timed,
            init_trace,
            get_trace_id,
            get_timings,
            get_total_time,
            get_node_time,
            get_slowest_node,
            format_timings,
            wrap_request,
            finalize_request,
        )

        assert callable(time_node)
        assert callable(timed)
        assert callable(wrap_request)
        assert callable(finalize_request)


# =============================================================================
# Test Integration
# =============================================================================

class TestObservabilityIntegration:
    """Integration tests for observability components."""

    def test_full_request_flow(self):
        """Test complete request flow with observability."""
        from nodes.timing import wrap_request, time_node, finalize_request
        from observability.state_store import get_state_store

        store = get_state_store()
        store.clear()

        # Start request
        state = wrap_request({
            "user_query": "What is the status?",
            "track": "QUALITY",
            "request_type": "STATUS_METRIC"
        })

        # Simulate node executions
        def mock_analyst(s):
            time.sleep(0.02)
            s["analyst_plan"] = {"sources": ["neo4j"]}
            return s

        def mock_guardian(s):
            time.sleep(0.01)
            s["guardian"] = {"verdict": "PASS", "reasons": [], "risk_level": "low"}
            return s

        state = time_node("analyst_plan", state, mock_analyst)
        state = time_node("guardian_verify", state, mock_guardian)

        # Finalize
        result = finalize_request(state)

        # Verify timings
        assert "analyst_plan" in result["timings_ms"]
        assert "guardian_verify" in result["timings_ms"]
        assert result["timings_ms"]["analyst_plan"] >= 20
        assert result["timings_ms"]["guardian_verify"] >= 10

        # Verify state stored
        recent = store.get_recent_states(1)
        assert len(recent) >= 1


# =============================================================================
# Run tests
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
