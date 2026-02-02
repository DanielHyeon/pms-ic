"""
BMAD Observability Package

Provides tracing, metrics, and state storage for BMAD workflow monitoring.

Components:
- Tracing: OpenTelemetry-compatible trace/span recording
- Metrics: Counter, gauge, histogram metrics collection
- BMAD Metrics: BMAD-specific metrics emission (Phase 6)
- State Store: Failed state storage for debugging (Phase 6)

Usage:
    from observability import tracer, metrics_collector, bmad_metrics

    # Tracing
    with tracer.start_span("workflow_execution") as span:
        span.set_attribute("intent", "weekly_report")
        # ... workflow logic ...
        span.set_status("ok")

    # Metrics
    metrics_collector.record_count("workflow.executed")
    metrics_collector.record("workflow.latency", 150.5)

    # BMAD Metrics
    bmad_metrics.emit_guardian_verdict("QUALITY", "PASS")
    bmad_metrics.emit_request_complete(state)
"""

from .tracing import (
    Tracer,
    Span,
    SpanContext,
    get_tracer,
    tracer,
)

from .metrics import (
    MetricsCollector,
    Counter,
    Gauge,
    Histogram,
    get_metrics_collector,
    metrics_collector,
)

# Phase 6: BMAD-specific observability
from .bmad_metrics import (
    BMADMetricsEmitter,
    get_bmad_metrics,
    bmad_metrics,
)

from .state_store import (
    StateStore,
    get_state_store,
    state_store,
    store_if_failed,
    store_completed_state,
)

__all__ = [
    # Tracing
    "Tracer",
    "Span",
    "SpanContext",
    "get_tracer",
    "tracer",
    # Metrics
    "MetricsCollector",
    "Counter",
    "Gauge",
    "Histogram",
    "get_metrics_collector",
    "metrics_collector",
    # BMAD Metrics (Phase 6)
    "BMADMetricsEmitter",
    "get_bmad_metrics",
    "bmad_metrics",
    # State Store (Phase 6)
    "StateStore",
    "get_state_store",
    "state_store",
    "store_if_failed",
    "store_completed_state",
]
