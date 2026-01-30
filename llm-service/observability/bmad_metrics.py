"""
BMAD Metrics Emitter - Phase 6: Observability

Centralized BMAD-specific metrics emission.

Reference: docs/llm-improvement/06-observability-metrics.md
"""

from typing import Dict, Any, List
import logging

from observability.metrics import get_metrics_collector, MetricsCollector

logger = logging.getLogger(__name__)


# =============================================================================
# BMAD Metrics Emitter
# =============================================================================

class BMADMetricsEmitter:
    """
    Centralized metrics emission for BMAD workflow.
    Adapts to observability backend (MetricsCollector).
    """

    def __init__(self, collector: MetricsCollector = None):
        """
        Initialize BMAD metrics emitter.

        Args:
            collector: Optional MetricsCollector instance
        """
        self.collector = collector or get_metrics_collector()

    # =========================================================================
    # Guardian Metrics
    # =========================================================================

    def emit_guardian_verdict(self, track: str, verdict: str) -> None:
        """
        Emit guardian verdict metric.

        Metric: guardian_verdict_total{track, verdict}

        Args:
            track: Track type (FAST, QUALITY)
            verdict: Guardian verdict (PASS, RETRY, FAIL)
        """
        self.collector.record_count(
            "guardian_verdict_total",
            labels={"track": track, "verdict": verdict}
        )
        logger.debug(f"emit_guardian_verdict: track={track}, verdict={verdict}")

    def emit_retry_count(self, track: str, count: int) -> None:
        """
        Emit retry count histogram.

        Metric: retry_count_histogram{track}

        Args:
            track: Track type
            count: Number of retries
        """
        self.collector.record(
            "retry_count_histogram",
            value=float(count),
            labels={"track": track}
        )
        logger.debug(f"emit_retry_count: track={track}, count={count}")

    # =========================================================================
    # Policy Metrics
    # =========================================================================

    def emit_policy_violation(self, violation_type: str) -> None:
        """
        Emit policy violation counter.

        Metric: policy_violation_total{type}

        Args:
            violation_type: Type of violation (banned_keyword, sensitive_topic, etc.)
        """
        self.collector.record_count(
            "policy_violation_total",
            labels={"type": violation_type}
        )
        logger.info(f"emit_policy_violation: type={violation_type}")

    # =========================================================================
    # Evidence Metrics
    # =========================================================================

    def emit_evidence_coverage(
        self,
        track: str,
        request_type: str,
        has_sufficient_evidence: bool
    ) -> None:
        """
        Emit evidence coverage metric.

        Metric: evidence_coverage_ratio{track, request_type}

        Args:
            track: Track type
            request_type: Request type
            has_sufficient_evidence: Whether evidence is sufficient
        """
        self.collector.record_count(
            "evidence_coverage_total",
            labels={"track": track, "request_type": request_type}
        )
        if has_sufficient_evidence:
            self.collector.record_count(
                "evidence_sufficient_total",
                labels={"track": track, "request_type": request_type}
            )
        logger.debug(
            f"emit_evidence_coverage: track={track}, "
            f"request_type={request_type}, sufficient={has_sufficient_evidence}"
        )

    # =========================================================================
    # Timing Metrics
    # =========================================================================

    def emit_node_timing(self, node: str, track: str, duration_ms: int) -> None:
        """
        Emit node timing histogram.

        Metric: node_timing_ms{node, track}

        Args:
            node: Node name
            track: Track type
            duration_ms: Duration in milliseconds
        """
        self.collector.record(
            "node_timing_ms",
            value=float(duration_ms),
            labels={"node": node, "track": track}
        )
        logger.debug(
            f"emit_node_timing: node={node}, track={track}, duration_ms={duration_ms}"
        )

    def emit_total_latency(self, track: str, duration_ms: int) -> None:
        """
        Emit total request latency.

        Metric: total_latency_ms{track}

        Args:
            track: Track type
            duration_ms: Total duration in milliseconds
        """
        self.collector.record(
            "total_latency_ms",
            value=float(duration_ms),
            labels={"track": track}
        )

    # =========================================================================
    # FAST Track Metrics
    # =========================================================================

    def emit_fast_track_total(self) -> None:
        """Emit FAST track request counter."""
        self.collector.record_count("fast_track_total")

    def emit_fast_upgrade(self) -> None:
        """Emit FAST to QUALITY upgrade counter."""
        self.collector.record_count("fast_upgrade_to_quality_total")

    def emit_fast_safe_exit(self) -> None:
        """Emit FAST track safe exit counter."""
        self.collector.record_count("fast_safe_exit_total")

    # =========================================================================
    # Composite Emission
    # =========================================================================

    def emit_request_complete(self, state: Dict[str, Any]) -> None:
        """
        Emit all metrics for a completed request.

        Args:
            state: Final ChatState dictionary
        """
        track = state.get("track", "unknown")
        guardian = state.get("guardian", {})
        request_type = state.get("request_type", "unknown")

        # Guardian verdict
        verdict = guardian.get("verdict", "unknown")
        self.emit_guardian_verdict(track, verdict)

        # Retry count
        retry_count = state.get("retry_count", 0)
        self.emit_retry_count(track, retry_count)

        # Policy violations from reasons
        for reason in guardian.get("reasons", []):
            if "policy:" in reason:
                self.emit_policy_violation(reason)

        # Evidence coverage
        evidence = state.get("evidence", [])
        min_evidence = 2 if track == "QUALITY" else 1
        has_sufficient = len(evidence) >= min_evidence
        self.emit_evidence_coverage(track, request_type, has_sufficient)

        # FAST track specific
        if track == "FAST":
            self.emit_fast_track_total()
            if state.get("_upgrade_to_quality"):
                self.emit_fast_upgrade()
            if state.get("_safe_exit"):
                self.emit_fast_safe_exit()

        # Total latency from timings
        timings = state.get("timings_ms", {})
        if timings:
            total_ms = sum(timings.values())
            self.emit_total_latency(track, total_ms)

        logger.debug(f"emit_request_complete: track={track}, verdict={verdict}")

    # =========================================================================
    # Summary Methods
    # =========================================================================

    def get_guardian_stats(self) -> Dict[str, Any]:
        """
        Get guardian verdict statistics.

        Returns:
            Dict with verdict counts by track
        """
        stats = {
            "QUALITY": {"PASS": 0, "RETRY": 0, "FAIL": 0},
            "FAST": {"PASS": 0, "FAIL": 0},
        }

        for track in ["QUALITY", "FAST"]:
            for verdict in stats[track].keys():
                metric = self.collector.get_metric(
                    "guardian_verdict_total",
                    labels={"track": track, "verdict": verdict}
                )
                if metric:
                    stats[track][verdict] = int(metric.get("value", 0))

        return stats

    def get_latency_stats(self) -> Dict[str, Any]:
        """
        Get latency statistics.

        Returns:
            Dict with latency percentiles by track
        """
        stats = {}

        for track in ["QUALITY", "FAST"]:
            metric = self.collector.get_metric(
                "total_latency_ms",
                labels={"track": track}
            )
            if metric:
                stats[track] = {
                    "p50": metric.get("p50", 0),
                    "p90": metric.get("p90", 0),
                    "p99": metric.get("p99", 0),
                    "mean": metric.get("mean", 0),
                }

        return stats


# =============================================================================
# Global Instance
# =============================================================================

_bmad_metrics: BMADMetricsEmitter = None


def get_bmad_metrics() -> BMADMetricsEmitter:
    """
    Get the global BMAD metrics emitter.

    Returns:
        Global BMADMetricsEmitter instance
    """
    global _bmad_metrics
    if _bmad_metrics is None:
        _bmad_metrics = BMADMetricsEmitter()
    return _bmad_metrics


# Convenience alias
bmad_metrics = get_bmad_metrics()


# =============================================================================
# Exports
# =============================================================================

__all__ = [
    "BMADMetricsEmitter",
    "get_bmad_metrics",
    "bmad_metrics",
]
