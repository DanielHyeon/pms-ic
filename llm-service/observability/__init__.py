"""
Phase 2: Basic Observability

Provides tracing and metrics collection for workflow monitoring.

Components:
- Tracing: OpenTelemetry-compatible trace/span recording
- Metrics: Counter, gauge, histogram metrics collection

Usage:
    from observability import tracer, metrics_collector

    # Tracing
    with tracer.start_span("workflow_execution") as span:
        span.set_attribute("intent", "weekly_report")
        # ... workflow logic ...
        span.set_status("ok")

    # Metrics
    metrics_collector.record_count("workflow.executed")
    metrics_collector.record("workflow.latency", 150.5)
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
]
