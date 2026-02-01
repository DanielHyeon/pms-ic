"""
Observability Module for Text2Query

Provides tracing, metrics, and alerting for LLM operations.
"""

from .tracing import (
    LLMTracer,
    SpanContext,
    get_tracer,
    reset_tracer,
    trace_llm_call,
)
from .metrics import (
    MetricsCollector,
    QueryMetrics,
    get_metrics_collector,
    reset_metrics_collector,
)
from .cost_tracker import (
    CostTracker,
    TokenUsage,
    CostEntry,
    get_cost_tracker,
    reset_cost_tracker,
)
from .alerts import (
    AlertService,
    AlertLevel,
    Alert,
    get_alert_service,
    reset_alert_service,
)

__all__ = [
    # Tracing
    "LLMTracer",
    "SpanContext",
    "get_tracer",
    "reset_tracer",
    "trace_llm_call",
    # Metrics
    "MetricsCollector",
    "QueryMetrics",
    "get_metrics_collector",
    "reset_metrics_collector",
    # Cost tracking
    "CostTracker",
    "TokenUsage",
    "CostEntry",
    "get_cost_tracker",
    "reset_cost_tracker",
    # Alerts
    "AlertService",
    "AlertLevel",
    "Alert",
    "get_alert_service",
    "reset_alert_service",
]
