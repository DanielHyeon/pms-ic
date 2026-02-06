"""
Threshold Auto-Tuner for Query Normalization.

Phase 3: Per-keyword-group threshold management with FP proxy signal
analysis and offline threshold recommendations.

Key concepts:
- Keywords are grouped by domain characteristics (domain_fixed, ambiguous, etc.)
- Each group has its own jamo similarity threshold
- FP proxy signals (re-query, empty handler, L3 correction) are recorded
- Offline analysis recommends threshold adjustments per group
- Min sample guard prevents premature recommendations

Design principles:
- FP_WEIGHT=10 (wrong handler, bad UX) > FN_WEIGHT=3 (triggers L3, recoverable)
- L3_WEIGHT=2 (adds latency but not incorrect)
- MIN_SAMPLE_COUNT=1000 events before generating recommendations
- Threshold bounds: [0.75, 0.92]
"""

import logging
import time
import threading
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Dict, List, Optional

from config.constants import NormalizationConfig

logger = logging.getLogger(__name__)


# =============================================================================
# Keyword Group Definitions
# =============================================================================

KEYWORD_TO_GROUP: Dict[str, str] = {
    # domain_fixed: unambiguous PM domain terms -> lower threshold (0.80)
    "스프린트": "domain_fixed",
    "sprint": "domain_fixed",
    "백로그": "domain_fixed",
    "backlog": "domain_fixed",
    "제품 백로그": "domain_fixed",
    "태스크": "domain_fixed",
    "task": "domain_fixed",
    "리스크": "domain_fixed",
    "risk": "domain_fixed",
    "위험": "domain_fixed",
    "위험요소": "domain_fixed",
    "리스크 분석": "domain_fixed",
    "완료된": "domain_fixed",
    "완료한": "domain_fixed",
    "끝난": "domain_fixed",
    "done": "domain_fixed",
    "completed": "domain_fixed",
    "완료 task": "domain_fixed",
    "완료 태스크": "domain_fixed",

    # ambiguous: share many jamo with common words -> higher threshold (0.85)
    "테스트 중": "ambiguous",
    "검토 중": "ambiguous",
    "리뷰 중": "ambiguous",
    "진행 중": "ambiguous",
    "대기 중": "ambiguous",
    "in review": "ambiguous",
    "in progress": "ambiguous",
    "testing": "ambiguous",

    # time_context: temporal keywords -> standard threshold (0.82)
    "이번 주": "time_context",
    "이번주": "time_context",
    "금주": "time_context",
    "this week": "time_context",
}

DEFAULT_GROUP_THRESHOLDS: Dict[str, float] = {
    "domain_fixed": 0.80,
    "ambiguous": 0.85,
    "time_context": 0.82,
    "default": 0.82,
}


# =============================================================================
# Data Classes
# =============================================================================

@dataclass
class TuningSignal:
    """A single signal for threshold tuning."""
    keyword_group: str
    signal_type: str      # "fp_proxy", "fn_proxy", "true_positive", "l3_call"
    keyword: str = ""
    timestamp: float = field(default_factory=time.time)


@dataclass
class ThresholdRecommendation:
    """Threshold recommendation for a keyword group."""
    keyword_group: str
    current_threshold: float
    recommended_threshold: float
    sample_count: int
    fp_proxy_count: int
    fn_proxy_count: int
    l3_call_count: int
    total_cost: float
    confidence: str       # "high" (>=5000), "medium" (>=1000), "low" (<1000)
    reason: str = ""


# =============================================================================
# Threshold Tuner
# =============================================================================

class ThresholdTuner:
    """
    Offline threshold tuner using weighted cost function.

    Records FP/FN proxy signals per keyword group and recommends
    threshold adjustments. Requires MIN_SAMPLE_COUNT events before
    generating recommendations.

    Cost function: FP_WEIGHT * fp + FN_WEIGHT * fn + L3_WEIGHT * l3
    """

    FP_WEIGHT = 10     # False positives: wrong handler, bad UX
    FN_WEIGHT = 3      # False negatives: triggers L3, recoverable
    L3_WEIGHT = 2      # L3 calls: adds latency

    MIN_SAMPLE_COUNT = 1000
    THRESHOLD_STEP = 0.02
    THRESHOLD_MIN = 0.75
    THRESHOLD_MAX = 0.92

    FP_RATE_THRESHOLD = 0.05   # >5% FP rate triggers increase
    FN_RATE_THRESHOLD = 0.10   # >10% FN rate triggers decrease
    HIGH_RATE_MULTIPLIER = 2   # Double step for very high rates

    def __init__(self, config: Optional[NormalizationConfig] = None,
                 redis_client=None):
        self._config = config or NormalizationConfig()
        self._redis = redis_client
        self._lock = threading.Lock()

        # Per-group signal counters (memory-only)
        self._counters: Dict[str, Dict[str, int]] = defaultdict(
            lambda: {"total": 0, "fp_proxy": 0, "fn_proxy": 0, "l3_call": 0}
        )

        # Admin threshold overrides (group -> threshold)
        self._overrides: Dict[str, float] = {}

    @property
    def enabled(self) -> bool:
        return self._config.ENABLE_THRESHOLD_TUNING

    def get_threshold(self, keyword: str) -> float:
        """Get the active threshold for a keyword.

        Priority: admin override > default group threshold > global default
        """
        group = KEYWORD_TO_GROUP.get(keyword.lower(), "default")

        # Check admin overrides first
        if group in self._overrides:
            return self._overrides[group]

        return DEFAULT_GROUP_THRESHOLDS.get(group, 0.82)

    def get_group(self, keyword: str) -> str:
        """Get the group name for a keyword."""
        return KEYWORD_TO_GROUP.get(keyword.lower(), "default")

    def record_signal(self, keyword_group: str, signal_type: str,
                      keyword: str = "") -> None:
        """Record a tuning signal.

        signal_type: "fp_proxy" | "fn_proxy" | "true_positive" | "l3_call"
        """
        if not self.enabled:
            return

        with self._lock:
            counters = self._counters[keyword_group]
            counters["total"] += 1
            if signal_type in counters:
                counters[signal_type] += 1

        # Also record in Redis if available
        if self._redis:
            try:
                redis_key = f"tuning:v1:{keyword_group}"
                self._redis.hincrby(redis_key, "total", 1)
                if signal_type in ("fp_proxy", "fn_proxy", "l3_call"):
                    self._redis.hincrby(redis_key, signal_type, 1)
            except Exception as e:
                logger.debug(f"Redis tuning signal write failed: {e}")

    def get_recommendation(
        self, keyword_group: str
    ) -> Optional[ThresholdRecommendation]:
        """Get threshold recommendation for a keyword group.

        Returns None if insufficient samples (< MIN_SAMPLE_COUNT).
        """
        with self._lock:
            counters = self._counters.get(keyword_group)
            if counters:
                counters = dict(counters)

        if not counters:
            return None

        total = counters["total"]
        if total < self.MIN_SAMPLE_COUNT:
            return None

        fp = counters["fp_proxy"]
        fn = counters["fn_proxy"]
        l3 = counters["l3_call"]

        current = DEFAULT_GROUP_THRESHOLDS.get(keyword_group, 0.82)
        if keyword_group in self._overrides:
            current = self._overrides[keyword_group]

        current_cost = (
            fp * self.FP_WEIGHT + fn * self.FN_WEIGHT + l3 * self.L3_WEIGHT
        )

        # Compute FP/FN rates
        fp_rate = fp / total if total > 0 else 0
        fn_rate = fn / total if total > 0 else 0

        # Directional recommendation based on rates
        recommended = current
        reason = "Current threshold is balanced"

        if fp_rate > self.FP_RATE_THRESHOLD:
            step = self.THRESHOLD_STEP
            if fp_rate > self.FP_RATE_THRESHOLD * self.HIGH_RATE_MULTIPLIER:
                step = self.THRESHOLD_STEP * self.HIGH_RATE_MULTIPLIER
            recommended = min(current + step, self.THRESHOLD_MAX)
            reason = f"High FP rate ({fp_rate:.1%}) → increase threshold"
        elif fn_rate > self.FN_RATE_THRESHOLD:
            step = self.THRESHOLD_STEP
            if fn_rate > self.FN_RATE_THRESHOLD * self.HIGH_RATE_MULTIPLIER:
                step = self.THRESHOLD_STEP * self.HIGH_RATE_MULTIPLIER
            recommended = max(current - step, self.THRESHOLD_MIN)
            reason = f"High FN rate ({fn_rate:.1%}) → decrease threshold"

        # Confidence based on sample count
        if total >= 5000:
            confidence = "high"
        elif total >= self.MIN_SAMPLE_COUNT:
            confidence = "medium"
        else:
            confidence = "low"

        return ThresholdRecommendation(
            keyword_group=keyword_group,
            current_threshold=current,
            recommended_threshold=round(recommended, 3),
            sample_count=total,
            fp_proxy_count=fp,
            fn_proxy_count=fn,
            l3_call_count=l3,
            total_cost=current_cost,
            confidence=confidence,
            reason=reason,
        )

    def get_all_recommendations(self) -> List[ThresholdRecommendation]:
        """Get recommendations for all groups with sufficient data."""
        results = []
        with self._lock:
            groups = list(self._counters.keys())

        for group in groups:
            rec = self.get_recommendation(group)
            if rec is not None:
                results.append(rec)

        return results

    def get_current_thresholds(self) -> Dict[str, float]:
        """Get all current active thresholds (defaults + overrides)."""
        thresholds = dict(DEFAULT_GROUP_THRESHOLDS)
        thresholds.update(self._overrides)
        return thresholds

    def apply_override(self, keyword_group: str, threshold: float) -> None:
        """Apply admin threshold override for a keyword group.

        Args:
            keyword_group: The group to override
            threshold: New threshold (must be in [THRESHOLD_MIN, THRESHOLD_MAX])

        Raises:
            ValueError: If threshold is out of bounds
        """
        if not (self.THRESHOLD_MIN <= threshold <= self.THRESHOLD_MAX):
            raise ValueError(
                f"Threshold {threshold} out of bounds "
                f"[{self.THRESHOLD_MIN}, {self.THRESHOLD_MAX}]"
            )

        with self._lock:
            self._overrides[keyword_group] = threshold

        logger.info(
            f"Threshold override applied: {keyword_group} = {threshold}"
        )

    def remove_override(self, keyword_group: str) -> bool:
        """Remove admin threshold override, reverting to default.

        Returns True if override existed and was removed.
        """
        with self._lock:
            if keyword_group in self._overrides:
                del self._overrides[keyword_group]
                logger.info(f"Threshold override removed: {keyword_group}")
                return True
        return False

    def stats(self) -> dict:
        """Get tuner statistics."""
        with self._lock:
            counters_copy = {
                group: dict(c) for group, c in self._counters.items()
            }
            overrides_copy = dict(self._overrides)

        return {
            "enabled": self.enabled,
            "groups": counters_copy,
            "overrides": overrides_copy,
            "default_thresholds": dict(DEFAULT_GROUP_THRESHOLDS),
            "keyword_count": len(KEYWORD_TO_GROUP),
        }


# =============================================================================
# Convenience Functions
# =============================================================================

def get_keyword_threshold(keyword: str) -> float:
    """Get the active threshold for a keyword.

    Uses the global threshold tuner if initialized,
    falls back to static group defaults.
    """
    tuner = get_threshold_tuner()
    return tuner.get_threshold(keyword)


def get_keyword_group(keyword: str) -> str:
    """Get the group name for a keyword."""
    return KEYWORD_TO_GROUP.get(keyword.lower(), "default")


# =============================================================================
# Module Singleton
# =============================================================================

_tuner: Optional[ThresholdTuner] = None


def init_threshold_tuner(
    redis_client=None, config: Optional[NormalizationConfig] = None
) -> ThresholdTuner:
    """Initialize the global threshold tuner."""
    global _tuner
    _tuner = ThresholdTuner(config=config, redis_client=redis_client)
    return _tuner


def get_threshold_tuner() -> ThresholdTuner:
    """Get the global threshold tuner instance."""
    global _tuner
    if _tuner is None:
        _tuner = ThresholdTuner()
    return _tuner
