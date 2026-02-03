"""
Response Quality Metrics Collection.

Purpose: Early warning system for AI degradation.
Key insight: These metrics monitor ROUTING QUALITY, not just response quality.

Critical thresholds:
- status_metric_ratio > 60% = Intent routing is broken
- empty_data_rate > 50% per intent = Data layer issues
- Any intent > 80% of traffic = Classifier bias

Reference: docs/P2_QUALITY_ENHANCEMENT.md
"""

import logging
import threading
from collections import defaultdict
from datetime import datetime
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
import random

logger = logging.getLogger(__name__)

# Sampling rate for metrics collection (to avoid performance impact)
SAMPLING_RATE = 0.3  # 30% sampling is sufficient for insights


@dataclass
class IntentMetrics:
    """Metrics for a single intent"""
    count: int = 0
    empty_data_count: int = 0
    query_failure_count: int = 0
    total_response_time_ms: float = 0


class ResponseMetricsCollector:
    """
    Collects and reports response quality metrics.

    This is an early warning system that detects:
    1. Intent routing degradation (STATUS_METRIC black hole)
    2. Data layer issues (high empty_data_rate)
    3. Classifier bias (intent distribution imbalance)
    """

    def __init__(self, sampling_rate: float = SAMPLING_RATE):
        self._metrics: Dict[str, IntentMetrics] = defaultdict(IntentMetrics)
        self._window_start: datetime = datetime.now()
        self._lock = threading.Lock()
        self._sampling_rate = sampling_rate

    def record(
        self,
        intent: str,
        has_data: bool,
        response_time_ms: float,
        query_success: bool = True,
    ):
        """
        Record a response event (with sampling).

        Args:
            intent: The classified intent
            has_data: Whether response contains meaningful data
            response_time_ms: Response time in milliseconds
            query_success: Whether DB query succeeded
        """
        # Apply sampling to avoid performance impact
        if random.random() > self._sampling_rate:
            return

        with self._lock:
            metrics = self._metrics[intent]
            metrics.count += 1
            metrics.total_response_time_ms += response_time_ms

            if not has_data:
                metrics.empty_data_count += 1

            if not query_success:
                metrics.query_failure_count += 1

    def get_summary(self) -> Dict[str, Any]:
        """Get summary of metrics with health indicators"""
        with self._lock:
            total_requests = sum(m.count for m in self._metrics.values())
            window_minutes = (datetime.now() - self._window_start).total_seconds() / 60

            summary = {
                "window_start": self._window_start.isoformat(),
                "window_duration_minutes": round(window_minutes, 1),
                "sampling_rate": self._sampling_rate,
                "estimated_total_requests": int(total_requests / self._sampling_rate) if self._sampling_rate > 0 else 0,
                "intents": {},
                "health_indicators": {},
                "alerts": [],
            }

            # Per-intent metrics
            for intent, metrics in self._metrics.items():
                avg_time = metrics.total_response_time_ms / max(metrics.count, 1)
                empty_rate = metrics.empty_data_count / max(metrics.count, 1)
                failure_rate = metrics.query_failure_count / max(metrics.count, 1)
                distribution_pct = metrics.count / max(total_requests, 1) * 100

                summary["intents"][intent] = {
                    "count": metrics.count,
                    "distribution_pct": round(distribution_pct, 1),
                    "empty_data_count": metrics.empty_data_count,
                    "empty_data_rate": round(empty_rate * 100, 1),
                    "query_failure_count": metrics.query_failure_count,
                    "query_failure_rate": round(failure_rate * 100, 1),
                    "avg_response_time_ms": round(avg_time, 1),
                }

            # Calculate health indicators
            summary["health_indicators"] = self._calculate_health_indicators(summary["intents"], total_requests)

            # Generate alerts
            summary["alerts"] = self._generate_alerts(summary["intents"], summary["health_indicators"])

            return summary

    def _calculate_health_indicators(self, intents: Dict, total_requests: int) -> Dict[str, Any]:
        """Calculate system-wide health indicators"""
        indicators: Dict[str, Any] = {}

        # STATUS_METRIC ratio - KEY indicator for routing health
        status_metric_count = intents.get("status_metric", {}).get("count", 0)
        indicators["status_metric_ratio"] = round(status_metric_count / max(total_requests, 1) * 100, 1)

        # Overall empty data rate
        total_empty = sum(i.get("empty_data_count", 0) for i in intents.values())
        indicators["overall_empty_data_rate"] = round(total_empty / max(total_requests, 1) * 100, 1)

        # Overall query failure rate
        total_failures = sum(i.get("query_failure_count", 0) for i in intents.values())
        indicators["overall_query_failure_rate"] = round(total_failures / max(total_requests, 1) * 100, 1)

        # Intent diversity (entropy-based, simplified)
        if intents:
            max_single_intent_pct = max(i.get("distribution_pct", 0) for i in intents.values())
            indicators["max_single_intent_pct"] = max_single_intent_pct
            indicators["intent_diversity"] = "LOW" if max_single_intent_pct > 60 else "HEALTHY"
        else:
            indicators["max_single_intent_pct"] = 0
            indicators["intent_diversity"] = "N/A"

        return indicators

    def _generate_alerts(self, intents: Dict, indicators: Dict) -> List[Dict[str, str]]:
        """Generate alerts based on thresholds"""
        alerts = []

        # CRITICAL: STATUS_METRIC black hole detection
        if indicators.get("status_metric_ratio", 0) > 60:
            alerts.append({
                "level": "CRITICAL",
                "code": "STATUS_METRIC_BLACKHOLE",
                "message": f"STATUS_METRIC captures {indicators['status_metric_ratio']}% of requests - routing likely broken",
            })

        # WARNING: High empty data rate per intent
        for intent, data in intents.items():
            if data.get("empty_data_rate", 0) > 50 and data.get("count", 0) > 10:
                alerts.append({
                    "level": "WARNING",
                    "code": f"HIGH_EMPTY_DATA_{intent.upper()}",
                    "message": f"{intent} has {data['empty_data_rate']}% empty data rate",
                })

        # WARNING: Query failures
        if indicators.get("overall_query_failure_rate", 0) > 10:
            alerts.append({
                "level": "WARNING",
                "code": "QUERY_FAILURES",
                "message": f"Query failure rate is {indicators['overall_query_failure_rate']}%",
            })

        # INFO: Single intent dominance
        if indicators.get("max_single_intent_pct", 0) > 80:
            alerts.append({
                "level": "INFO",
                "code": "INTENT_IMBALANCE",
                "message": f"Single intent captures {indicators['max_single_intent_pct']}% of traffic",
            })

        return alerts

    def reset(self):
        """Reset metrics (e.g., at start of new window)"""
        with self._lock:
            self._metrics = defaultdict(IntentMetrics)
            self._window_start = datetime.now()

    def log_summary(self):
        """Log metrics summary with alerts"""
        summary = self.get_summary()

        logger.info("=== Response Metrics Summary ===")
        logger.info(f"Window: {summary['window_duration_minutes']:.1f} minutes")
        logger.info(f"Estimated total requests: {summary['estimated_total_requests']}")

        # Health indicators
        hi = summary["health_indicators"]
        logger.info(f"STATUS_METRIC ratio: {hi.get('status_metric_ratio', 0)}%")
        logger.info(f"Overall empty data rate: {hi.get('overall_empty_data_rate', 0)}%")
        logger.info(f"Intent diversity: {hi.get('intent_diversity', 'N/A')}")

        # Per-intent breakdown
        for intent, metrics in summary["intents"].items():
            logger.info(
                f"  {intent}: {metrics['count']} requests ({metrics['distribution_pct']}%), "
                f"{metrics['empty_data_rate']}% empty, "
                f"{metrics['avg_response_time_ms']}ms avg"
            )

        # Alerts
        for alert in summary["alerts"]:
            log_method = logger.critical if alert["level"] == "CRITICAL" else \
                         logger.warning if alert["level"] == "WARNING" else logger.info
            log_method(f"[{alert['level']}] {alert['code']}: {alert['message']}")


# Global collector instance
_collector: Optional[ResponseMetricsCollector] = None


def get_metrics_collector() -> ResponseMetricsCollector:
    """Get singleton metrics collector"""
    global _collector
    if _collector is None:
        _collector = ResponseMetricsCollector()
    return _collector


def record_response(
    intent: str,
    has_data: bool,
    response_time_ms: float,
    query_success: bool = True,
):
    """Convenience function to record a response"""
    get_metrics_collector().record(intent, has_data, response_time_ms, query_success)


def get_metrics_summary() -> Dict[str, Any]:
    """Convenience function to get metrics summary"""
    return get_metrics_collector().get_summary()


def reset_metrics():
    """Convenience function to reset metrics"""
    get_metrics_collector().reset()


def log_metrics_summary():
    """Convenience function to log metrics summary"""
    get_metrics_collector().log_summary()
