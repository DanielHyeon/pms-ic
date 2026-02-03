"""
PMS-Specific Monitoring - Track A/B Metrics

Collects and analyzes metrics specific to PMS use cases:

Track A Metrics:
- p95_latency_ms: Target < 500ms
- cache_hit_rate: Target > 70%
- tool_call_count: Avg per query
- additional_question_rate: Info insufficiency indicator
- hallucination_report_rate: User feedback

Track B Metrics:
- generation_time_seconds: 30-90s acceptable
- evidence_link_rate: Issue key/doc link inclusion
- omission_rate: Missing blockers/changes

Reference: docs/PMS 최적화 방안.md
"""

import logging
import time
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import deque
from enum import Enum
import json
import statistics

logger = logging.getLogger(__name__)


# =============================================================================
# Metric Types
# =============================================================================

class Track(Enum):
    """Workflow track type"""
    A = "track_a"  # High-frequency, low-cost
    B = "track_b"  # High-value outputs


@dataclass
class RequestMetric:
    """Single request metric record"""
    request_id: str
    track: Track
    timestamp: datetime
    latency_ms: float
    success: bool

    # Track A specific
    cache_hit: bool = False
    tool_call_count: int = 0
    triggered_follow_up: bool = False  # Did user ask follow-up question?

    # Track B specific
    generation_time_s: float = 0.0
    evidence_links_count: int = 0
    has_omissions: bool = False

    # Common
    rag_docs_count: int = 0
    intent: Optional[str] = None
    confidence: float = 0.0

    # User feedback
    user_reported_hallucination: bool = False
    user_feedback_score: Optional[int] = None  # 1-5

    def to_dict(self) -> Dict[str, Any]:
        return {
            "request_id": self.request_id,
            "track": self.track.value,
            "timestamp": self.timestamp.isoformat(),
            "latency_ms": self.latency_ms,
            "success": self.success,
            "cache_hit": self.cache_hit,
            "tool_call_count": self.tool_call_count,
            "triggered_follow_up": self.triggered_follow_up,
            "generation_time_s": self.generation_time_s,
            "evidence_links_count": self.evidence_links_count,
            "has_omissions": self.has_omissions,
            "rag_docs_count": self.rag_docs_count,
            "intent": self.intent,
            "confidence": self.confidence,
            "user_reported_hallucination": self.user_reported_hallucination,
            "user_feedback_score": self.user_feedback_score,
        }


@dataclass
class TrackAMetrics:
    """Aggregated Track A metrics"""
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0

    # Latency
    p50_latency_ms: float = 0.0
    p95_latency_ms: float = 0.0
    p99_latency_ms: float = 0.0
    avg_latency_ms: float = 0.0

    # Cache
    cache_hits: int = 0
    cache_misses: int = 0
    cache_hit_rate: float = 0.0

    # Tool calls
    avg_tool_calls: float = 0.0
    total_tool_calls: int = 0

    # Follow-up questions (info insufficiency)
    follow_up_count: int = 0
    additional_question_rate: float = 0.0

    # Hallucination reports
    hallucination_reports: int = 0
    hallucination_report_rate: float = 0.0

    # Targets
    latency_target_met: bool = False  # p95 < 500ms
    cache_target_met: bool = False  # > 70%

    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_requests": self.total_requests,
            "successful_requests": self.successful_requests,
            "failed_requests": self.failed_requests,
            "p50_latency_ms": round(self.p50_latency_ms, 2),
            "p95_latency_ms": round(self.p95_latency_ms, 2),
            "p99_latency_ms": round(self.p99_latency_ms, 2),
            "avg_latency_ms": round(self.avg_latency_ms, 2),
            "cache_hits": self.cache_hits,
            "cache_misses": self.cache_misses,
            "cache_hit_rate": round(self.cache_hit_rate, 4),
            "avg_tool_calls": round(self.avg_tool_calls, 2),
            "total_tool_calls": self.total_tool_calls,
            "follow_up_count": self.follow_up_count,
            "additional_question_rate": round(self.additional_question_rate, 4),
            "hallucination_reports": self.hallucination_reports,
            "hallucination_report_rate": round(self.hallucination_report_rate, 4),
            "latency_target_met": self.latency_target_met,
            "cache_target_met": self.cache_target_met,
        }


@dataclass
class TrackBMetrics:
    """Aggregated Track B metrics"""
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0

    # Generation time
    avg_generation_time_s: float = 0.0
    p50_generation_time_s: float = 0.0
    p95_generation_time_s: float = 0.0
    max_generation_time_s: float = 0.0

    # Evidence linking
    avg_evidence_links: float = 0.0
    total_evidence_links: int = 0
    evidence_link_rate: float = 0.0  # % of responses with at least one link

    # Omissions
    omission_count: int = 0
    omission_rate: float = 0.0

    # Targets
    generation_target_met: bool = False  # < 90s

    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_requests": self.total_requests,
            "successful_requests": self.successful_requests,
            "failed_requests": self.failed_requests,
            "avg_generation_time_s": round(self.avg_generation_time_s, 2),
            "p50_generation_time_s": round(self.p50_generation_time_s, 2),
            "p95_generation_time_s": round(self.p95_generation_time_s, 2),
            "max_generation_time_s": round(self.max_generation_time_s, 2),
            "avg_evidence_links": round(self.avg_evidence_links, 2),
            "total_evidence_links": self.total_evidence_links,
            "evidence_link_rate": round(self.evidence_link_rate, 4),
            "omission_count": self.omission_count,
            "omission_rate": round(self.omission_rate, 4),
            "generation_target_met": self.generation_target_met,
        }


# =============================================================================
# PMS Metrics Collector
# =============================================================================

class PMSMetricsCollector:
    """
    Collects and analyzes PMS-specific metrics.

    Usage:
        collector = PMSMetricsCollector()

        # Record a request
        collector.record(RequestMetric(
            request_id="req-123",
            track=Track.A,
            timestamp=datetime.now(),
            latency_ms=150.0,
            success=True,
            cache_hit=True,
        ))

        # Get aggregated metrics
        track_a_metrics = collector.get_track_a_metrics()
        track_b_metrics = collector.get_track_b_metrics()
    """

    # Target thresholds
    TRACK_A_LATENCY_TARGET_MS = 500
    TRACK_A_CACHE_TARGET_RATE = 0.70
    TRACK_B_GENERATION_TARGET_S = 90

    def __init__(
        self,
        window_hours: int = 24,
        max_records: int = 10000,
    ):
        self.window_hours = window_hours
        self.max_records = max_records

        # Use deques for efficient sliding window
        self._track_a_records: deque = deque(maxlen=max_records)
        self._track_b_records: deque = deque(maxlen=max_records)

        # Quick counters for efficiency
        self._track_a_counters = {
            "total": 0,
            "success": 0,
            "cache_hits": 0,
            "tool_calls": 0,
            "follow_ups": 0,
            "hallucinations": 0,
        }
        self._track_b_counters = {
            "total": 0,
            "success": 0,
            "with_evidence": 0,
            "with_omissions": 0,
        }

    def record(self, metric: RequestMetric):
        """Record a request metric"""
        if metric.track == Track.A:
            self._track_a_records.append(metric)
            self._track_a_counters["total"] += 1
            if metric.success:
                self._track_a_counters["success"] += 1
            if metric.cache_hit:
                self._track_a_counters["cache_hits"] += 1
            self._track_a_counters["tool_calls"] += metric.tool_call_count
            if metric.triggered_follow_up:
                self._track_a_counters["follow_ups"] += 1
            if metric.user_reported_hallucination:
                self._track_a_counters["hallucinations"] += 1
        else:
            self._track_b_records.append(metric)
            self._track_b_counters["total"] += 1
            if metric.success:
                self._track_b_counters["success"] += 1
            if metric.evidence_links_count > 0:
                self._track_b_counters["with_evidence"] += 1
            if metric.has_omissions:
                self._track_b_counters["with_omissions"] += 1

        logger.debug(f"Recorded {metric.track.value} metric: {metric.request_id}")

    def _filter_by_window(self, records: deque) -> List[RequestMetric]:
        """Filter records within time window"""
        cutoff = datetime.now() - timedelta(hours=self.window_hours)
        return [r for r in records if r.timestamp > cutoff]

    def _calculate_percentile(self, values: List[float], percentile: float) -> float:
        """Calculate percentile from list of values"""
        if not values:
            return 0.0
        sorted_values = sorted(values)
        index = int(len(sorted_values) * percentile / 100)
        return sorted_values[min(index, len(sorted_values) - 1)]

    def get_track_a_metrics(self) -> TrackAMetrics:
        """Get aggregated Track A metrics"""
        records = self._filter_by_window(self._track_a_records)

        if not records:
            return TrackAMetrics()

        # Calculate metrics
        latencies = [r.latency_ms for r in records]
        total = len(records)
        successful = sum(1 for r in records if r.success)
        cache_hits = sum(1 for r in records if r.cache_hit)
        tool_calls = sum(r.tool_call_count for r in records)
        follow_ups = sum(1 for r in records if r.triggered_follow_up)
        hallucinations = sum(1 for r in records if r.user_reported_hallucination)

        metrics = TrackAMetrics(
            total_requests=total,
            successful_requests=successful,
            failed_requests=total - successful,

            p50_latency_ms=self._calculate_percentile(latencies, 50),
            p95_latency_ms=self._calculate_percentile(latencies, 95),
            p99_latency_ms=self._calculate_percentile(latencies, 99),
            avg_latency_ms=statistics.mean(latencies) if latencies else 0,

            cache_hits=cache_hits,
            cache_misses=total - cache_hits,
            cache_hit_rate=cache_hits / total if total > 0 else 0,

            avg_tool_calls=tool_calls / total if total > 0 else 0,
            total_tool_calls=tool_calls,

            follow_up_count=follow_ups,
            additional_question_rate=follow_ups / total if total > 0 else 0,

            hallucination_reports=hallucinations,
            hallucination_report_rate=hallucinations / total if total > 0 else 0,
        )

        # Check targets
        metrics.latency_target_met = metrics.p95_latency_ms < self.TRACK_A_LATENCY_TARGET_MS
        metrics.cache_target_met = metrics.cache_hit_rate > self.TRACK_A_CACHE_TARGET_RATE

        return metrics

    def get_track_b_metrics(self) -> TrackBMetrics:
        """Get aggregated Track B metrics"""
        records = self._filter_by_window(self._track_b_records)

        if not records:
            return TrackBMetrics()

        # Calculate metrics
        gen_times = [r.generation_time_s for r in records if r.generation_time_s > 0]
        total = len(records)
        successful = sum(1 for r in records if r.success)
        with_evidence = sum(1 for r in records if r.evidence_links_count > 0)
        with_omissions = sum(1 for r in records if r.has_omissions)
        total_links = sum(r.evidence_links_count for r in records)

        metrics = TrackBMetrics(
            total_requests=total,
            successful_requests=successful,
            failed_requests=total - successful,

            avg_generation_time_s=statistics.mean(gen_times) if gen_times else 0,
            p50_generation_time_s=self._calculate_percentile(gen_times, 50),
            p95_generation_time_s=self._calculate_percentile(gen_times, 95),
            max_generation_time_s=max(gen_times) if gen_times else 0,

            avg_evidence_links=total_links / total if total > 0 else 0,
            total_evidence_links=total_links,
            evidence_link_rate=with_evidence / total if total > 0 else 0,

            omission_count=with_omissions,
            omission_rate=with_omissions / total if total > 0 else 0,
        )

        # Check targets
        metrics.generation_target_met = metrics.p95_generation_time_s < self.TRACK_B_GENERATION_TARGET_S

        return metrics

    def get_combined_metrics(self) -> Dict[str, Any]:
        """Get combined metrics for both tracks"""
        track_a = self.get_track_a_metrics()
        track_b = self.get_track_b_metrics()

        return {
            "track_a": track_a.to_dict(),
            "track_b": track_b.to_dict(),
            "timestamp": datetime.now().isoformat(),
            "window_hours": self.window_hours,
        }

    def get_alerts(self) -> List[Dict[str, Any]]:
        """Get list of metric alerts"""
        alerts = []
        track_a = self.get_track_a_metrics()
        track_b = self.get_track_b_metrics()

        # Track A alerts
        if not track_a.latency_target_met and track_a.total_requests > 10:
            alerts.append({
                "severity": "warning",
                "track": "A",
                "metric": "p95_latency_ms",
                "message": f"Track A p95 latency ({track_a.p95_latency_ms:.0f}ms) exceeds target ({self.TRACK_A_LATENCY_TARGET_MS}ms)",
                "value": track_a.p95_latency_ms,
                "target": self.TRACK_A_LATENCY_TARGET_MS,
            })

        if not track_a.cache_target_met and track_a.total_requests > 10:
            alerts.append({
                "severity": "info",
                "track": "A",
                "metric": "cache_hit_rate",
                "message": f"Track A cache hit rate ({track_a.cache_hit_rate:.1%}) below target ({self.TRACK_A_CACHE_TARGET_RATE:.0%})",
                "value": track_a.cache_hit_rate,
                "target": self.TRACK_A_CACHE_TARGET_RATE,
            })

        if track_a.hallucination_report_rate > 0.05 and track_a.total_requests > 20:
            alerts.append({
                "severity": "critical",
                "track": "A",
                "metric": "hallucination_report_rate",
                "message": f"High hallucination report rate: {track_a.hallucination_report_rate:.1%}",
                "value": track_a.hallucination_report_rate,
                "target": 0.05,
            })

        # Track B alerts
        if not track_b.generation_target_met and track_b.total_requests > 5:
            alerts.append({
                "severity": "warning",
                "track": "B",
                "metric": "p95_generation_time_s",
                "message": f"Track B p95 generation time ({track_b.p95_generation_time_s:.1f}s) exceeds target ({self.TRACK_B_GENERATION_TARGET_S}s)",
                "value": track_b.p95_generation_time_s,
                "target": self.TRACK_B_GENERATION_TARGET_S,
            })

        if track_b.omission_rate > 0.1 and track_b.total_requests > 5:
            alerts.append({
                "severity": "warning",
                "track": "B",
                "metric": "omission_rate",
                "message": f"High omission rate in Track B: {track_b.omission_rate:.1%}",
                "value": track_b.omission_rate,
                "target": 0.1,
            })

        return alerts

    def reset(self):
        """Reset all metrics"""
        self._track_a_records.clear()
        self._track_b_records.clear()
        self._track_a_counters = {k: 0 for k in self._track_a_counters}
        self._track_b_counters = {k: 0 for k in self._track_b_counters}
        logger.info("PMS metrics reset")

    def export_to_json(self, filepath: str):
        """Export metrics to JSON file"""
        data = {
            "metrics": self.get_combined_metrics(),
            "alerts": self.get_alerts(),
            "track_a_records": [r.to_dict() for r in self._track_a_records],
            "track_b_records": [r.to_dict() for r in self._track_b_records],
        }
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        logger.info(f"Metrics exported to {filepath}")


# =============================================================================
# Hallucination Detector
# =============================================================================

class HallucinationDetector:
    """Detects potential hallucinations in responses"""

    # Patterns indicating unsupported claims
    UNSUPPORTED_CLAIM_PATTERNS = [
        r"확실히",
        r"분명히",
        r"반드시",
        r"definitely",
        r"certainly",
        r"always",
        r"never",
    ]

    # Patterns indicating fabricated data
    FABRICATION_PATTERNS = [
        r"\d{4}년\s*\d{1,2}월\s*\d{1,2}일",  # Specific dates
        r"\d+%\s*(증가|감소|완료)",  # Specific percentages
        r"약\s*\d+\s*(명|개|건)",  # Specific counts with "약"
    ]

    def detect(
        self,
        response: str,
        context_docs: List[str],
    ) -> Dict[str, Any]:
        """
        Detect potential hallucinations in response.

        Args:
            response: The generated response
            context_docs: RAG documents used for context

        Returns:
            {
                "has_potential_hallucination": bool,
                "confidence": float (0-1),
                "issues": list of detected issues,
            }
        """
        import re

        issues = []
        confidence = 0.0

        # Combine context for checking
        context_text = " ".join(context_docs).lower() if context_docs else ""
        response_lower = response.lower()

        # Check for unsupported claims not in context
        for pattern in self.UNSUPPORTED_CLAIM_PATTERNS:
            if re.search(pattern, response_lower):
                # Check if the claim context exists in documents
                # This is a simple heuristic - in production, use more sophisticated checking
                issues.append(f"Strong claim pattern without clear evidence: {pattern}")
                confidence += 0.1

        # Check for specific data that might be fabricated
        for pattern in self.FABRICATION_PATTERNS:
            matches = re.findall(pattern, response)
            for match in matches:
                # Check if this data appears in context
                if match.lower() not in context_text:
                    issues.append(f"Specific data not found in context: {match}")
                    confidence += 0.2

        # Cap confidence at 1.0
        confidence = min(confidence, 1.0)

        return {
            "has_potential_hallucination": len(issues) > 0,
            "confidence": confidence,
            "issues": issues,
        }


# =============================================================================
# Evidence Link Tracker
# =============================================================================

class EvidenceLinkTracker:
    """Tracks evidence linking in responses"""

    # Patterns for issue keys (e.g., PROJ-123, TASK-456)
    ISSUE_KEY_PATTERN = r"[A-Z]{2,10}-\d+"

    # Patterns for document references
    DOC_REF_PATTERNS = [
        r"\[문서\s*\d+\]",
        r"\[Doc\s*\d+\]",
        r"문서\s*\d+에",
        r"참고:\s*\S+",
    ]

    def count_evidence_links(self, response: str) -> Dict[str, Any]:
        """
        Count evidence links in response.

        Returns:
            {
                "total_links": int,
                "issue_keys": list of issue keys found,
                "doc_references": list of doc refs found,
            }
        """
        import re

        issue_keys = re.findall(self.ISSUE_KEY_PATTERN, response)
        doc_refs = []
        for pattern in self.DOC_REF_PATTERNS:
            doc_refs.extend(re.findall(pattern, response))

        return {
            "total_links": len(issue_keys) + len(doc_refs),
            "issue_keys": list(set(issue_keys)),
            "doc_references": list(set(doc_refs)),
        }


# =============================================================================
# Singleton instance
# =============================================================================

_pms_collector: Optional[PMSMetricsCollector] = None


def get_pms_collector() -> PMSMetricsCollector:
    """Get singleton PMS metrics collector instance"""
    global _pms_collector
    if _pms_collector is None:
        _pms_collector = PMSMetricsCollector()
    return _pms_collector
