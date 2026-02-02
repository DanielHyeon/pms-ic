"""
Quality Metrics Collector

Collects and aggregates metrics for Text2Query operations.
Tracks success rates, latencies, and quality indicators.
"""
import logging
import time
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import defaultdict
from enum import Enum

logger = logging.getLogger(__name__)


class MetricType(str, Enum):
    """Types of metrics tracked."""
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"
    SUMMARY = "summary"


@dataclass
class QueryMetrics:
    """
    Metrics for a single query execution.

    Captures all quality indicators for analysis.
    """
    query_id: str
    timestamp: datetime = field(default_factory=datetime.now)

    # Classification
    intent_type: str = ""
    intent_confidence: float = 0.0

    # Generation
    generation_time_ms: float = 0.0
    validation_time_ms: float = 0.0
    correction_attempts: int = 0
    total_time_ms: float = 0.0

    # Token usage
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0

    # Quality indicators
    success: bool = False
    error_type: Optional[str] = None
    error_message: Optional[str] = None

    # Query details
    query_type: str = ""  # sql, cypher
    tables_used: List[str] = field(default_factory=list)
    complexity: str = ""  # simple, moderate, complex

    # Semantic layer usage
    used_semantic_layer: bool = False
    used_fewshot: bool = False
    fewshot_count: int = 0

    # User feedback (optional)
    user_rating: Optional[int] = None  # 1-5
    user_feedback: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "query_id": self.query_id,
            "timestamp": self.timestamp.isoformat(),
            "intent_type": self.intent_type,
            "intent_confidence": self.intent_confidence,
            "generation_time_ms": self.generation_time_ms,
            "validation_time_ms": self.validation_time_ms,
            "correction_attempts": self.correction_attempts,
            "total_time_ms": self.total_time_ms,
            "prompt_tokens": self.prompt_tokens,
            "completion_tokens": self.completion_tokens,
            "total_tokens": self.total_tokens,
            "success": self.success,
            "error_type": self.error_type,
            "error_message": self.error_message,
            "query_type": self.query_type,
            "tables_used": self.tables_used,
            "complexity": self.complexity,
            "used_semantic_layer": self.used_semantic_layer,
            "used_fewshot": self.used_fewshot,
            "fewshot_count": self.fewshot_count,
            "user_rating": self.user_rating,
        }


class MetricsCollector:
    """
    Collects and aggregates Text2Query metrics.

    Features:
    - Real-time metric collection
    - Time-window aggregations
    - Success rate tracking
    - Latency percentiles
    - Quality score calculation
    """

    def __init__(self, retention_hours: int = 24, bucket_minutes: int = 5):
        """
        Initialize the metrics collector.

        Args:
            retention_hours: Hours to retain metrics
            bucket_minutes: Aggregation bucket size in minutes
        """
        self.retention_hours = retention_hours
        self.bucket_minutes = bucket_minutes

        # Raw metrics storage
        self._metrics: List[QueryMetrics] = []

        # Counters
        self._counters: Dict[str, int] = defaultdict(int)

        # Histograms (latency buckets)
        self._latency_buckets = [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
        self._latency_histogram: Dict[str, List[int]] = defaultdict(lambda: [0] * len(self._latency_buckets))

        # Aggregated stats
        self._stats_cache: Dict[str, Any] = {}
        self._stats_cache_time: Optional[datetime] = None

    def record(self, metrics: QueryMetrics) -> None:
        """
        Record metrics for a query.

        Args:
            metrics: QueryMetrics instance
        """
        self._metrics.append(metrics)

        # Update counters
        self._counters["total_queries"] += 1
        if metrics.success:
            self._counters["successful_queries"] += 1
        else:
            self._counters["failed_queries"] += 1
            if metrics.error_type:
                self._counters[f"errors_{metrics.error_type}"] += 1

        self._counters[f"intent_{metrics.intent_type}"] += 1
        self._counters[f"query_type_{metrics.query_type}"] += 1
        self._counters[f"complexity_{metrics.complexity}"] += 1
        self._counters["total_tokens"] += metrics.total_tokens
        self._counters["total_correction_attempts"] += metrics.correction_attempts

        # Update latency histogram
        self._update_latency_histogram("generation", metrics.generation_time_ms)
        self._update_latency_histogram("total", metrics.total_time_ms)

        # Clean old metrics
        self._cleanup_old_metrics()

        # Invalidate cache
        self._stats_cache_time = None

        logger.debug(f"Recorded metrics for query {metrics.query_id}")

    def _update_latency_histogram(self, name: str, latency_ms: float) -> None:
        """Update latency histogram for given metric."""
        for i, bucket in enumerate(self._latency_buckets):
            if latency_ms <= bucket:
                self._latency_histogram[name][i] += 1
                return
        # Greater than all buckets
        self._latency_histogram[name][-1] += 1

    def _cleanup_old_metrics(self) -> None:
        """Remove metrics older than retention period."""
        cutoff = datetime.now() - timedelta(hours=self.retention_hours)
        self._metrics = [m for m in self._metrics if m.timestamp > cutoff]

    def get_success_rate(self, window_hours: Optional[int] = None) -> float:
        """
        Calculate success rate.

        Args:
            window_hours: Time window (None for all time)

        Returns:
            Success rate as decimal (0.0 to 1.0)
        """
        metrics = self._get_metrics_in_window(window_hours)
        if not metrics:
            return 0.0
        return sum(1 for m in metrics if m.success) / len(metrics)

    def get_average_latency(
        self,
        metric: str = "total",
        window_hours: Optional[int] = None
    ) -> float:
        """
        Calculate average latency.

        Args:
            metric: "generation", "validation", or "total"
            window_hours: Time window

        Returns:
            Average latency in milliseconds
        """
        metrics = self._get_metrics_in_window(window_hours)
        if not metrics:
            return 0.0

        if metric == "generation":
            values = [m.generation_time_ms for m in metrics]
        elif metric == "validation":
            values = [m.validation_time_ms for m in metrics]
        else:
            values = [m.total_time_ms for m in metrics]

        return sum(values) / len(values)

    def get_latency_percentiles(
        self,
        metric: str = "total",
        percentiles: List[int] = None,
        window_hours: Optional[int] = None
    ) -> Dict[str, float]:
        """
        Calculate latency percentiles.

        Args:
            metric: "generation", "validation", or "total"
            percentiles: List of percentiles (default: p50, p90, p95, p99)
            window_hours: Time window

        Returns:
            Dictionary of percentile values
        """
        if percentiles is None:
            percentiles = [50, 90, 95, 99]

        metrics = self._get_metrics_in_window(window_hours)
        if not metrics:
            return {f"p{p}": 0.0 for p in percentiles}

        if metric == "generation":
            values = sorted([m.generation_time_ms for m in metrics])
        elif metric == "validation":
            values = sorted([m.validation_time_ms for m in metrics])
        else:
            values = sorted([m.total_time_ms for m in metrics])

        result = {}
        for p in percentiles:
            idx = int(len(values) * p / 100)
            idx = min(idx, len(values) - 1)
            result[f"p{p}"] = values[idx]

        return result

    def get_error_breakdown(
        self,
        window_hours: Optional[int] = None
    ) -> Dict[str, int]:
        """
        Get breakdown of error types.

        Args:
            window_hours: Time window

        Returns:
            Dictionary of error_type -> count
        """
        metrics = self._get_metrics_in_window(window_hours)
        errors: Dict[str, int] = defaultdict(int)

        for m in metrics:
            if not m.success and m.error_type:
                errors[m.error_type] += 1

        return dict(errors)

    def get_intent_distribution(
        self,
        window_hours: Optional[int] = None
    ) -> Dict[str, int]:
        """
        Get distribution of intent types.

        Args:
            window_hours: Time window

        Returns:
            Dictionary of intent_type -> count
        """
        metrics = self._get_metrics_in_window(window_hours)
        distribution: Dict[str, int] = defaultdict(int)

        for m in metrics:
            if m.intent_type:
                distribution[m.intent_type] += 1

        return dict(distribution)

    def get_complexity_distribution(
        self,
        window_hours: Optional[int] = None
    ) -> Dict[str, int]:
        """
        Get distribution of query complexity.

        Args:
            window_hours: Time window

        Returns:
            Dictionary of complexity -> count
        """
        metrics = self._get_metrics_in_window(window_hours)
        distribution: Dict[str, int] = defaultdict(int)

        for m in metrics:
            if m.complexity:
                distribution[m.complexity] += 1

        return dict(distribution)

    def get_token_usage(
        self,
        window_hours: Optional[int] = None
    ) -> Dict[str, int]:
        """
        Get total token usage.

        Args:
            window_hours: Time window

        Returns:
            Dictionary with prompt, completion, and total tokens
        """
        metrics = self._get_metrics_in_window(window_hours)

        return {
            "prompt_tokens": sum(m.prompt_tokens for m in metrics),
            "completion_tokens": sum(m.completion_tokens for m in metrics),
            "total_tokens": sum(m.total_tokens for m in metrics),
            "avg_tokens_per_query": (
                sum(m.total_tokens for m in metrics) / len(metrics)
                if metrics else 0
            )
        }

    def get_quality_score(
        self,
        window_hours: Optional[int] = None
    ) -> float:
        """
        Calculate overall quality score (0-100).

        Factors:
        - Success rate (40%)
        - Low correction attempts (20%)
        - Fast response time (20%)
        - High confidence (20%)
        """
        metrics = self._get_metrics_in_window(window_hours)
        if not metrics:
            return 0.0

        # Success rate score (0-40)
        success_rate = self.get_success_rate(window_hours)
        success_score = success_rate * 40

        # Correction score (0-20): fewer corrections = better
        avg_corrections = sum(m.correction_attempts for m in metrics) / len(metrics)
        correction_score = max(0, 20 - avg_corrections * 5)

        # Latency score (0-20): faster = better
        avg_latency = self.get_average_latency("total", window_hours)
        if avg_latency < 500:
            latency_score = 20
        elif avg_latency < 1000:
            latency_score = 15
        elif avg_latency < 2000:
            latency_score = 10
        elif avg_latency < 5000:
            latency_score = 5
        else:
            latency_score = 0

        # Confidence score (0-20)
        avg_confidence = sum(m.intent_confidence for m in metrics) / len(metrics)
        confidence_score = avg_confidence * 20

        return success_score + correction_score + latency_score + confidence_score

    def get_dashboard_stats(
        self,
        window_hours: int = 1
    ) -> Dict[str, Any]:
        """
        Get all stats for dashboard display.

        Args:
            window_hours: Time window for stats

        Returns:
            Comprehensive statistics dictionary
        """
        # Use cache if fresh (< 30 seconds)
        if (
            self._stats_cache_time
            and (datetime.now() - self._stats_cache_time).total_seconds() < 30
        ):
            return self._stats_cache

        stats = {
            "window_hours": window_hours,
            "timestamp": datetime.now().isoformat(),
            "total_queries": len(self._get_metrics_in_window(window_hours)),
            "success_rate": self.get_success_rate(window_hours),
            "quality_score": self.get_quality_score(window_hours),
            "latency": {
                "average_ms": self.get_average_latency("total", window_hours),
                "percentiles": self.get_latency_percentiles("total", window_hours=window_hours),
            },
            "token_usage": self.get_token_usage(window_hours),
            "errors": self.get_error_breakdown(window_hours),
            "intent_distribution": self.get_intent_distribution(window_hours),
            "complexity_distribution": self.get_complexity_distribution(window_hours),
            "counters": dict(self._counters),
        }

        self._stats_cache = stats
        self._stats_cache_time = datetime.now()

        return stats

    def _get_metrics_in_window(
        self,
        window_hours: Optional[int]
    ) -> List[QueryMetrics]:
        """Get metrics within time window."""
        if window_hours is None:
            return self._metrics

        cutoff = datetime.now() - timedelta(hours=window_hours)
        return [m for m in self._metrics if m.timestamp > cutoff]

    def get_recent_metrics(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get recent metrics for debugging."""
        return [m.to_dict() for m in self._metrics[-limit:]]


# Singleton instance
_metrics_collector: Optional[MetricsCollector] = None


def get_metrics_collector(**kwargs) -> MetricsCollector:
    """Get or create the metrics collector singleton."""
    global _metrics_collector
    if _metrics_collector is None:
        _metrics_collector = MetricsCollector(**kwargs)
    return _metrics_collector


def reset_metrics_collector() -> None:
    """Reset the metrics collector singleton (for testing)."""
    global _metrics_collector
    _metrics_collector = None
