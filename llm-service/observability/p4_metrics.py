"""
P4 Metrics - Prometheus Integration for Observability.

PURPOSE:
- Export key metrics to Prometheus for real-time monitoring
- Track success rate, recovery rate, clarification rate
- Monitor latency and failure patterns

DESIGN:
- Core metrics exported to Prometheus (counters, histograms, gauges)
- Detail events stored in PostgreSQL for drill-down
- This bridges the gap between real-time monitoring and detailed analysis

Reference: docs/P4_OBSERVABILITY_DASHBOARD.md Section 7.0
"""

from dataclasses import dataclass
from typing import Dict, Any, Optional, List
from enum import Enum
import logging
import time
from collections import defaultdict
from threading import Lock

logger = logging.getLogger("p4_metrics")


# =============================================================================
# Metric Types (without external dependencies)
# =============================================================================

class MetricType(str, Enum):
    """Types of metrics."""
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"


@dataclass
class MetricValue:
    """A metric value with labels."""
    name: str
    metric_type: MetricType
    value: float
    labels: Dict[str, str]
    timestamp: float


class SimpleMetricsRegistry:
    """
    Simple in-memory metrics registry.

    For production, replace with prometheus_client library.
    This implementation allows testing without external dependencies.
    """

    def __init__(self):
        self._counters: Dict[str, Dict[tuple, float]] = defaultdict(lambda: defaultdict(float))
        self._gauges: Dict[str, Dict[tuple, float]] = defaultdict(lambda: defaultdict(float))
        self._histograms: Dict[str, Dict[tuple, List[float]]] = defaultdict(lambda: defaultdict(list))
        self._lock = Lock()

    def inc_counter(self, name: str, labels: Dict[str, str], value: float = 1.0) -> None:
        """Increment a counter."""
        label_key = tuple(sorted(labels.items()))
        with self._lock:
            self._counters[name][label_key] += value

    def set_gauge(self, name: str, labels: Dict[str, str], value: float) -> None:
        """Set a gauge value."""
        label_key = tuple(sorted(labels.items()))
        with self._lock:
            self._gauges[name][label_key] = value

    def observe_histogram(self, name: str, labels: Dict[str, str], value: float) -> None:
        """Observe a histogram value."""
        label_key = tuple(sorted(labels.items()))
        with self._lock:
            self._histograms[name][label_key].append(value)

    def get_counter(self, name: str, labels: Dict[str, str]) -> float:
        """Get counter value."""
        label_key = tuple(sorted(labels.items()))
        return self._counters[name][label_key]

    def get_gauge(self, name: str, labels: Dict[str, str]) -> float:
        """Get gauge value."""
        label_key = tuple(sorted(labels.items()))
        return self._gauges[name][label_key]

    def get_histogram_values(self, name: str, labels: Dict[str, str]) -> List[float]:
        """Get histogram values."""
        label_key = tuple(sorted(labels.items()))
        return self._histograms[name][label_key]

    def get_all_counters(self) -> Dict[str, Dict[tuple, float]]:
        """Get all counters."""
        return dict(self._counters)

    def reset(self) -> None:
        """Reset all metrics."""
        with self._lock:
            self._counters.clear()
            self._gauges.clear()
            self._histograms.clear()


# Global registry
_registry = SimpleMetricsRegistry()


def get_registry() -> SimpleMetricsRegistry:
    """Get the global metrics registry."""
    return _registry


# =============================================================================
# P4 Metrics
# =============================================================================

# Metric names
RESPONSE_TOTAL = "p4_response_generated_total"
CLARIFICATION_TOTAL = "p4_clarification_triggered_total"
FALLBACK_TOTAL = "p4_fallback_activated_total"
RESPONSE_DURATION = "p4_response_duration_ms"
PENDING_CLARIFICATIONS = "p4_pending_clarifications"
EMISSION_FAILURES = "p4_emission_failures_total"


def record_response(
    intent: str,
    final_status: str,
    duration_ms: int,
    env: str = "",
    build_version: str = "",
) -> None:
    """
    Record a response metric.

    This is the primary metric for tracking success/recovery/failure rates.
    """
    labels = {
        "intent": intent,
        "final_status": final_status,
        "env": env,
        "build_version": build_version,
    }

    _registry.inc_counter(RESPONSE_TOTAL, labels)
    _registry.observe_histogram(RESPONSE_DURATION, {
        "intent": intent,
        "final_status": final_status,
    }, duration_ms)


def record_clarification(
    intent: str,
    trigger_type: str,
    env: str = "",
) -> None:
    """Record a clarification trigger metric."""
    labels = {
        "intent": intent,
        "trigger_type": trigger_type,
        "env": env,
    }
    _registry.inc_counter(CLARIFICATION_TOTAL, labels)


def record_fallback(
    intent: str,
    action_type: str,
    success: bool,
) -> None:
    """Record a fallback activation metric."""
    labels = {
        "intent": intent,
        "action_type": action_type,
        "success": str(success).lower(),
    }
    _registry.inc_counter(FALLBACK_TOTAL, labels)


def set_pending_clarifications(intent: str, count: int) -> None:
    """Set the current pending clarifications gauge."""
    _registry.set_gauge(PENDING_CLARIFICATIONS, {"intent": intent}, count)


def record_emission_failure() -> None:
    """Record a P4 event emission failure."""
    _registry.inc_counter(EMISSION_FAILURES, {})


# =============================================================================
# Metrics Aggregator
# =============================================================================

class MetricsAggregator:
    """
    Aggregates P4 events into metrics.

    This class processes P4Event objects and updates the metrics registry.
    """

    @classmethod
    def process_event(cls, event: "P4Event") -> None:
        """Process a P4 event and update metrics."""
        from observability.p4_events import EventType

        if event.event_type == EventType.RESPONSE_GENERATED.value:
            cls._process_response(event)
        elif event.event_type == EventType.CLARIFICATION_TRIGGERED.value:
            cls._process_clarification(event)
        elif event.event_type == EventType.FALLBACK_ACTIVATED.value:
            cls._process_fallback(event)

    @classmethod
    def _process_response(cls, event: "P4Event") -> None:
        """Process response generated event."""
        payload = event.payload
        record_response(
            intent=payload.get("intent", "unknown"),
            final_status=payload.get("final_status", "unknown"),
            duration_ms=payload.get("total_duration_ms", 0),
            env=event.runtime.env if event.runtime else "",
            build_version=event.runtime.build_version if event.runtime else "",
        )

    @classmethod
    def _process_clarification(cls, event: "P4Event") -> None:
        """Process clarification triggered event."""
        payload = event.payload
        record_clarification(
            intent=payload.get("intent", "unknown"),
            trigger_type=payload.get("trigger_type", "unknown"),
            env=event.runtime.env if event.runtime else "",
        )

    @classmethod
    def _process_fallback(cls, event: "P4Event") -> None:
        """Process fallback activated event."""
        payload = event.payload
        record_fallback(
            intent=payload.get("intent", "unknown"),
            action_type=payload.get("action_type", "unknown"),
            success=payload.get("success", False),
        )


# =============================================================================
# Health Summary
# =============================================================================

@dataclass
class HealthSummary:
    """
    System health summary for dashboard display.

    Provides the "narrative" view of system health.
    """
    total_queries: int = 0
    success_count: int = 0
    recovered_count: int = 0
    guidance_count: int = 0
    failed_count: int = 0
    clarification_count: int = 0
    avg_duration_ms: float = 0.0

    @property
    def success_rate(self) -> float:
        """Calculate success rate (success + recovered)."""
        if self.total_queries == 0:
            return 0.0
        return (self.success_count + self.recovered_count) / self.total_queries * 100

    @property
    def recovery_rate(self) -> float:
        """Calculate recovery rate (recovered / (recovered + failed))."""
        total_needing_recovery = self.recovered_count + self.failed_count
        if total_needing_recovery == 0:
            return 100.0  # No recovery needed
        return self.recovered_count / total_needing_recovery * 100

    @property
    def clarification_rate(self) -> float:
        """Calculate clarification rate."""
        if self.total_queries == 0:
            return 0.0
        return self.clarification_count / self.total_queries * 100

    @property
    def failure_rate(self) -> float:
        """Calculate failure rate."""
        if self.total_queries == 0:
            return 0.0
        return self.failed_count / self.total_queries * 100

    @property
    def health_status(self) -> str:
        """Get overall health status."""
        if self.success_rate >= 95 and self.recovery_rate >= 80:
            return "HEALTHY"
        elif self.success_rate >= 90 or self.recovery_rate >= 70:
            return "WARNING"
        else:
            return "CRITICAL"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_queries": self.total_queries,
            "success_count": self.success_count,
            "recovered_count": self.recovered_count,
            "guidance_count": self.guidance_count,
            "failed_count": self.failed_count,
            "clarification_count": self.clarification_count,
            "avg_duration_ms": round(self.avg_duration_ms, 1),
            "success_rate": round(self.success_rate, 1),
            "recovery_rate": round(self.recovery_rate, 1),
            "clarification_rate": round(self.clarification_rate, 1),
            "failure_rate": round(self.failure_rate, 1),
            "health_status": self.health_status,
        }

    def to_narrative(self) -> str:
        """Generate human-readable health narrative."""
        status_emoji = {
            "HEALTHY": "good",
            "WARNING": "needs attention",
            "CRITICAL": "critical",
        }

        lines = [
            f"**System Health**: {self.health_status} ({status_emoji.get(self.health_status, 'unknown')})",
            "",
            f"**Total Queries**: {self.total_queries}",
            f"**Success Rate**: {self.success_rate:.1f}%",
            f"**Recovery Rate**: {self.recovery_rate:.1f}%",
            f"**Clarification Rate**: {self.clarification_rate:.1f}%",
            "",
        ]

        # Alerts
        alerts = []
        if self.success_rate < 90:
            alerts.append(f"Success rate below 90%: {self.success_rate:.1f}%")
        if self.recovery_rate < 70:
            alerts.append(f"Recovery rate below 70%: {self.recovery_rate:.1f}%")
        if self.clarification_rate > 30:
            alerts.append(f"High clarification rate: {self.clarification_rate:.1f}%")

        if alerts:
            lines.append("**Alerts**:")
            for alert in alerts:
                lines.append(f"  - {alert}")

        return "\n".join(lines)


def calculate_health_summary() -> HealthSummary:
    """
    Calculate health summary from current metrics.

    In production, this would query from Prometheus or PostgreSQL.
    """
    from observability.p4_events import FinalStatus

    summary = HealthSummary()

    # Get counters for each status
    for status in FinalStatus:
        for label_key, value in _registry._counters.get(RESPONSE_TOTAL, {}).items():
            labels = dict(label_key)
            if labels.get("final_status") == status.value:
                summary.total_queries += int(value)
                if status == FinalStatus.SUCCESS:
                    summary.success_count += int(value)
                elif status == FinalStatus.RECOVERED_SUCCESS:
                    summary.recovered_count += int(value)
                elif status == FinalStatus.RECOVERED_GUIDANCE:
                    summary.guidance_count += int(value)
                elif status == FinalStatus.FAILED:
                    summary.failed_count += int(value)

    # Get clarification count
    for label_key, value in _registry._counters.get(CLARIFICATION_TOTAL, {}).items():
        summary.clarification_count += int(value)

    # Calculate average duration
    all_durations = []
    for label_key, values in _registry._histograms.get(RESPONSE_DURATION, {}).items():
        all_durations.extend(values)
    if all_durations:
        summary.avg_duration_ms = sum(all_durations) / len(all_durations)

    return summary


# =============================================================================
# Intent Stats
# =============================================================================

@dataclass
class IntentStats:
    """Statistics for a single intent."""
    intent: str
    total: int = 0
    success: int = 0
    recovered: int = 0
    failed: int = 0
    avg_duration_ms: float = 0.0

    @property
    def success_rate(self) -> float:
        if self.total == 0:
            return 0.0
        return (self.success + self.recovered) / self.total * 100

    @property
    def failure_rate(self) -> float:
        if self.total == 0:
            return 0.0
        return self.failed / self.total * 100


def get_intent_stats() -> List[IntentStats]:
    """Get statistics per intent."""
    from observability.p4_events import FinalStatus

    intent_data: Dict[str, IntentStats] = {}

    for label_key, value in _registry._counters.get(RESPONSE_TOTAL, {}).items():
        labels = dict(label_key)
        intent = labels.get("intent", "unknown")
        status = labels.get("final_status", "unknown")

        if intent not in intent_data:
            intent_data[intent] = IntentStats(intent=intent)

        stats = intent_data[intent]
        stats.total += int(value)

        if status == FinalStatus.SUCCESS.value:
            stats.success += int(value)
        elif status == FinalStatus.RECOVERED_SUCCESS.value:
            stats.recovered += int(value)
        elif status == FinalStatus.FAILED.value:
            stats.failed += int(value)

    return sorted(intent_data.values(), key=lambda s: s.total, reverse=True)


# =============================================================================
# Failure Heatmap Data
# =============================================================================

@dataclass
class HeatmapCell:
    """A cell in the failure heatmap."""
    intent: str
    failure_type: str
    count: int

    @property
    def severity(self) -> str:
        """Get severity level for coloring."""
        if self.count < 10:
            return "low"
        elif self.count < 30:
            return "medium"
        elif self.count < 50:
            return "high"
        else:
            return "critical"


def get_failure_heatmap() -> List[HeatmapCell]:
    """
    Get failure heatmap data.

    In production, this would aggregate from PostgreSQL events.
    """
    # This is a simplified implementation
    # Real implementation would query p4_events grouped by intent and failure reason
    cells = []

    # Get from fallback metrics
    for label_key, value in _registry._counters.get(FALLBACK_TOTAL, {}).items():
        labels = dict(label_key)
        if labels.get("success", "true") == "false":
            cells.append(HeatmapCell(
                intent=labels.get("intent", "unknown"),
                failure_type=labels.get("action_type", "unknown"),
                count=int(value),
            ))

    return sorted(cells, key=lambda c: c.count, reverse=True)
