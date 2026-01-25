"""
Metrics Module - Metrics collection and aggregation

Provides metric types:
- Counter: Monotonically increasing values
- Gauge: Point-in-time values
- Histogram: Distribution of values
"""

from typing import Dict, Any, Optional, List, Callable
from dataclasses import dataclass, field
from datetime import datetime
import threading
import statistics
import logging

logger = logging.getLogger(__name__)


@dataclass
class Counter:
    """
    Monotonically increasing counter.

    Used for counting events (requests, errors, etc.)
    """
    name: str
    value: float = 0.0
    labels: Dict[str, str] = field(default_factory=dict)
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    last_updated: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def increment(self, amount: float = 1.0) -> "Counter":
        """Increment counter by amount."""
        self.value += amount
        self.last_updated = datetime.utcnow().isoformat()
        return self

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "type": "counter",
            "value": self.value,
            "labels": self.labels,
            "created_at": self.created_at,
            "last_updated": self.last_updated,
        }


@dataclass
class Gauge:
    """
    Point-in-time value gauge.

    Used for values that can go up or down (queue size, memory, etc.)
    """
    name: str
    value: float = 0.0
    labels: Dict[str, str] = field(default_factory=dict)
    last_updated: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def set(self, value: float) -> "Gauge":
        """Set gauge value."""
        self.value = value
        self.last_updated = datetime.utcnow().isoformat()
        return self

    def increment(self, amount: float = 1.0) -> "Gauge":
        """Increment gauge."""
        self.value += amount
        self.last_updated = datetime.utcnow().isoformat()
        return self

    def decrement(self, amount: float = 1.0) -> "Gauge":
        """Decrement gauge."""
        self.value -= amount
        self.last_updated = datetime.utcnow().isoformat()
        return self

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "type": "gauge",
            "value": self.value,
            "labels": self.labels,
            "last_updated": self.last_updated,
        }


@dataclass
class Histogram:
    """
    Distribution of values.

    Used for latency, sizes, etc. with percentile calculations.
    """
    name: str
    values: List[float] = field(default_factory=list)
    labels: Dict[str, str] = field(default_factory=dict)
    bucket_boundaries: List[float] = field(default_factory=lambda: [10, 25, 50, 100, 250, 500, 1000, 2500, 5000])
    max_values: int = 10000
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    last_updated: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def observe(self, value: float) -> "Histogram":
        """Record a value observation."""
        self.values.append(value)
        if len(self.values) > self.max_values:
            self.values = self.values[-self.max_values:]
        self.last_updated = datetime.utcnow().isoformat()
        return self

    @property
    def count(self) -> int:
        return len(self.values)

    @property
    def sum(self) -> float:
        return sum(self.values)

    @property
    def mean(self) -> float:
        return statistics.mean(self.values) if self.values else 0.0

    @property
    def min(self) -> float:
        return min(self.values) if self.values else 0.0

    @property
    def max(self) -> float:
        return max(self.values) if self.values else 0.0

    def percentile(self, p: float) -> float:
        """Get percentile value (0-100)."""
        if not self.values:
            return 0.0
        sorted_values = sorted(self.values)
        idx = int(len(sorted_values) * p / 100)
        return sorted_values[min(idx, len(sorted_values) - 1)]

    def buckets(self) -> Dict[str, int]:
        """Get bucket counts."""
        result = {}
        for boundary in self.bucket_boundaries:
            count = sum(1 for v in self.values if v <= boundary)
            result[f"le_{boundary}"] = count
        result["le_inf"] = len(self.values)
        return result

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "type": "histogram",
            "count": self.count,
            "sum": self.sum,
            "mean": self.mean,
            "min": self.min,
            "max": self.max,
            "p50": self.percentile(50),
            "p90": self.percentile(90),
            "p99": self.percentile(99),
            "buckets": self.buckets(),
            "labels": self.labels,
            "created_at": self.created_at,
            "last_updated": self.last_updated,
        }


class MetricsCollector:
    """
    Central metrics collector.

    Thread-safe collection and aggregation of metrics.
    """

    def __init__(self, service_name: str = "llm-service"):
        """
        Initialize metrics collector.

        Args:
            service_name: Service name for metric labeling
        """
        self.service_name = service_name
        self._counters: Dict[str, Counter] = {}
        self._gauges: Dict[str, Gauge] = {}
        self._histograms: Dict[str, Histogram] = {}
        self._lock = threading.Lock()

    def _make_key(self, name: str, labels: Dict[str, str] = None) -> str:
        """Create unique key for metric + labels."""
        if not labels:
            return name
        label_str = ",".join(f"{k}={v}" for k, v in sorted(labels.items()))
        return f"{name}[{label_str}]"

    def counter(self, name: str, labels: Dict[str, str] = None) -> Counter:
        """
        Get or create a counter.

        Args:
            name: Counter name
            labels: Optional labels

        Returns:
            Counter instance
        """
        key = self._make_key(name, labels)
        with self._lock:
            if key not in self._counters:
                self._counters[key] = Counter(name=name, labels=labels or {})
            return self._counters[key]

    def gauge(self, name: str, labels: Dict[str, str] = None) -> Gauge:
        """
        Get or create a gauge.

        Args:
            name: Gauge name
            labels: Optional labels

        Returns:
            Gauge instance
        """
        key = self._make_key(name, labels)
        with self._lock:
            if key not in self._gauges:
                self._gauges[key] = Gauge(name=name, labels=labels or {})
            return self._gauges[key]

    def histogram(self, name: str, labels: Dict[str, str] = None) -> Histogram:
        """
        Get or create a histogram.

        Args:
            name: Histogram name
            labels: Optional labels

        Returns:
            Histogram instance
        """
        key = self._make_key(name, labels)
        with self._lock:
            if key not in self._histograms:
                self._histograms[key] = Histogram(name=name, labels=labels or {})
            return self._histograms[key]

    # Convenience methods

    def record_count(self, name: str, labels: Dict[str, str] = None, amount: float = 1.0):
        """Record a count increment."""
        self.counter(name, labels).increment(amount)

    def record_success(self, name: str, success: bool, labels: Dict[str, str] = None):
        """Record success/failure counts."""
        labels = labels or {}
        if success:
            self.counter(f"{name}.success", labels).increment()
        else:
            self.counter(f"{name}.failure", labels).increment()

    def record(self, name: str, value: float, labels: Dict[str, str] = None):
        """Record a histogram observation."""
        self.histogram(name, labels).observe(value)

    def set_gauge(self, name: str, value: float, labels: Dict[str, str] = None):
        """Set a gauge value."""
        self.gauge(name, labels).set(value)

    def get_all_metrics(self) -> Dict[str, Any]:
        """
        Get all metrics.

        Returns:
            Dict with all metric data
        """
        with self._lock:
            return {
                "service": self.service_name,
                "timestamp": datetime.utcnow().isoformat(),
                "counters": {k: v.to_dict() for k, v in self._counters.items()},
                "gauges": {k: v.to_dict() for k, v in self._gauges.items()},
                "histograms": {k: v.to_dict() for k, v in self._histograms.items()},
            }

    def get_metric(self, name: str, labels: Dict[str, str] = None) -> Optional[Dict[str, Any]]:
        """
        Get a specific metric.

        Args:
            name: Metric name
            labels: Optional labels

        Returns:
            Metric data or None
        """
        key = self._make_key(name, labels)
        with self._lock:
            if key in self._counters:
                return self._counters[key].to_dict()
            if key in self._gauges:
                return self._gauges[key].to_dict()
            if key in self._histograms:
                return self._histograms[key].to_dict()
        return None

    def export_prometheus(self) -> str:
        """
        Export metrics in Prometheus format.

        Returns:
            Prometheus-formatted metric string
        """
        lines = []

        with self._lock:
            # Counters
            for counter in self._counters.values():
                labels_str = ",".join(f'{k}="{v}"' for k, v in counter.labels.items())
                name = counter.name.replace(".", "_")
                if labels_str:
                    lines.append(f'{name}{{{labels_str}}} {counter.value}')
                else:
                    lines.append(f'{name} {counter.value}')

            # Gauges
            for gauge in self._gauges.values():
                labels_str = ",".join(f'{k}="{v}"' for k, v in gauge.labels.items())
                name = gauge.name.replace(".", "_")
                if labels_str:
                    lines.append(f'{name}{{{labels_str}}} {gauge.value}')
                else:
                    lines.append(f'{name} {gauge.value}')

            # Histograms
            for hist in self._histograms.values():
                name = hist.name.replace(".", "_")
                labels_str = ",".join(f'{k}="{v}"' for k, v in hist.labels.items())

                # Buckets
                for boundary in hist.bucket_boundaries:
                    count = sum(1 for v in hist.values if v <= boundary)
                    bucket_labels = f'{labels_str},le="{boundary}"' if labels_str else f'le="{boundary}"'
                    lines.append(f'{name}_bucket{{{bucket_labels}}} {count}')

                # +Inf bucket
                inf_labels = f'{labels_str},le="+Inf"' if labels_str else 'le="+Inf"'
                lines.append(f'{name}_bucket{{{inf_labels}}} {hist.count}')

                # Sum and count
                if labels_str:
                    lines.append(f'{name}_sum{{{labels_str}}} {hist.sum}')
                    lines.append(f'{name}_count{{{labels_str}}} {hist.count}')
                else:
                    lines.append(f'{name}_sum {hist.sum}')
                    lines.append(f'{name}_count {hist.count}')

        return "\n".join(lines)

    def reset(self):
        """Reset all metrics."""
        with self._lock:
            self._counters.clear()
            self._gauges.clear()
            self._histograms.clear()


# Global metrics collector instance
_global_collector: Optional[MetricsCollector] = None


def get_metrics_collector(service_name: str = "llm-service") -> MetricsCollector:
    """
    Get the global metrics collector.

    Args:
        service_name: Service name for metrics

    Returns:
        Global MetricsCollector instance
    """
    global _global_collector
    if _global_collector is None:
        _global_collector = MetricsCollector(service_name)
    return _global_collector


# Convenience alias
metrics_collector = get_metrics_collector()
