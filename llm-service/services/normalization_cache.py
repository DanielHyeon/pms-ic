"""
Normalization Cache Manager - Tiered Redis + Memory cache with circuit breaker.

Provides three cache tiers:
1. Normalization cache: raw_query -> normalized + layers (TTL 1h)
2. Negative cache: raw_query -> "confirmed UNKNOWN" (TTL 3min)
3. Classification cache: normalized_query -> intent + confidence (TTL 10min)

Redis is used when available; falls back to in-memory LRU on failure.
Circuit breaker prevents timeout amplification when Redis is unhealthy.

Reference: docs/NORMALIZATION_OPERATIONAL_HARDENING.md
"""

import hashlib
import json
import logging
import random
import threading
import time
from collections import OrderedDict
from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional

from config.constants import NORMALIZATION

logger = logging.getLogger(__name__)


# =============================================================================
# Circuit Breaker
# =============================================================================

class CircuitState:
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


class RedisCircuitBreaker:
    """Simple circuit breaker for Redis operations.

    CLOSED -> OPEN: N failures within window_seconds
    OPEN -> HALF_OPEN: after recovery_seconds
    HALF_OPEN -> CLOSED: 1 success
    HALF_OPEN -> OPEN: 1 failure
    """

    def __init__(
        self,
        failure_threshold: int = NORMALIZATION.CIRCUIT_BREAKER_FAILURE_THRESHOLD,
        window_seconds: int = NORMALIZATION.CIRCUIT_BREAKER_WINDOW_SECONDS,
        recovery_seconds: int = NORMALIZATION.CIRCUIT_BREAKER_RECOVERY_SECONDS,
    ):
        self._state = CircuitState.CLOSED
        self._failure_threshold = failure_threshold
        self._window_seconds = window_seconds
        self._recovery_seconds = recovery_seconds
        self._failures: List[float] = []
        self._opened_at: float = 0.0
        self._lock = threading.Lock()

    @property
    def state(self) -> str:
        with self._lock:
            if self._state == CircuitState.OPEN:
                if time.time() - self._opened_at >= self._recovery_seconds:
                    self._state = CircuitState.HALF_OPEN
            return self._state

    @property
    def is_usable(self) -> bool:
        """Check if Redis calls should be attempted."""
        return self.state != CircuitState.OPEN

    def record_success(self) -> None:
        with self._lock:
            if self._state == CircuitState.HALF_OPEN:
                self._state = CircuitState.CLOSED
                self._failures.clear()
                logger.info("Circuit breaker: HALF_OPEN -> CLOSED (recovery)")

    def record_failure(self) -> None:
        now = time.time()
        with self._lock:
            if self._state == CircuitState.HALF_OPEN:
                self._state = CircuitState.OPEN
                self._opened_at = now
                logger.warning("Circuit breaker: HALF_OPEN -> OPEN (failed probe)")
                return

            self._failures = [
                t for t in self._failures
                if now - t < self._window_seconds
            ]
            self._failures.append(now)

            if len(self._failures) >= self._failure_threshold:
                self._state = CircuitState.OPEN
                self._opened_at = now
                logger.warning(
                    f"Circuit breaker: CLOSED -> OPEN "
                    f"({len(self._failures)} failures in {self._window_seconds}s)"
                )


# =============================================================================
# Memory Fallback Cache
# =============================================================================

class MemoryLRUCache:
    """Thread-safe LRU cache using OrderedDict."""

    def __init__(self, maxsize: int = NORMALIZATION.MEMORY_CACHE_MAXSIZE):
        self._cache: OrderedDict = OrderedDict()
        self._maxsize = maxsize
        self._lock = threading.Lock()

    def get(self, key: str) -> Optional[str]:
        with self._lock:
            if key in self._cache:
                self._cache.move_to_end(key)
                return self._cache[key]
        return None

    def put(self, key: str, value: str) -> None:
        with self._lock:
            if key in self._cache:
                self._cache.move_to_end(key)
            else:
                if len(self._cache) >= self._maxsize:
                    self._cache.popitem(last=False)
            self._cache[key] = value

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()


# =============================================================================
# Fingerprint Utilities
# =============================================================================

def query_fingerprint(query: str) -> str:
    """Full SHA256 fingerprint of canonicalized query."""
    canonical = query.strip().lower()
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def short_fingerprint(query: str) -> str:
    """Short (16-char) fingerprint for cache keys."""
    return query_fingerprint(query)[:16]


# =============================================================================
# L3 Rate Limiter
# =============================================================================

class L3RateLimiter:
    """Cluster-wide L3 rate limiter (Redis) with local fallback."""

    def __init__(
        self,
        redis_client: Optional[Any] = None,
        circuit_breaker: Optional[RedisCircuitBreaker] = None,
        max_per_minute: int = NORMALIZATION.L3_MAX_CALLS_PER_MINUTE,
    ):
        self._redis = redis_client
        self._cb = circuit_breaker
        self._max = max_per_minute
        self._local_count = 0
        self._local_window_start = time.time()
        self._lock = threading.Lock()

    def is_allowed(self) -> bool:
        """Check if an L3 call is allowed under the rate limit."""
        # Try Redis cluster-wide limit first
        if self._redis and self._cb and self._cb.is_usable:
            try:
                minute_bucket = int(time.time()) // 60
                key = f"{NORMALIZATION.L3_RATE_LIMIT_KEY}:{minute_bucket}"
                count = self._redis.incr(key)
                if count == 1:
                    self._redis.expire(key, 120)
                self._cb.record_success()
                return count <= self._max
            except Exception:
                if self._cb:
                    self._cb.record_failure()

        # Local fallback
        with self._lock:
            now = time.time()
            if now - self._local_window_start >= 60:
                self._local_count = 0
                self._local_window_start = now
            self._local_count += 1
            return self._local_count <= self._max


# =============================================================================
# Normalization Cache Manager
# =============================================================================

@dataclass
class NormCacheEntry:
    """Normalization cache value."""
    normalized: str
    layers: List[str]
    q_fp: str
    ts: float = 0.0

    def to_json(self) -> str:
        return json.dumps(asdict(self), ensure_ascii=False)

    @classmethod
    def from_json(cls, data: str) -> "NormCacheEntry":
        d = json.loads(data)
        return cls(**d)


@dataclass
class ClassCacheEntry:
    """Classification cache value."""
    intent: str
    confidence: float
    q_fp: str
    classifier_ver: str = ""
    dict_ver: str = ""
    threshold_ver: str = ""

    def to_json(self) -> str:
        return json.dumps(asdict(self), ensure_ascii=False)

    @classmethod
    def from_json(cls, data: str) -> "ClassCacheEntry":
        d = json.loads(data)
        return cls(**d)


class NormalizationCacheManager:
    """Tiered normalization cache with Redis + memory fallback."""

    def __init__(
        self,
        redis_client: Optional[Any] = None,
        config=NORMALIZATION,
    ):
        self._redis = redis_client
        self._config = config
        self._cb = RedisCircuitBreaker(
            failure_threshold=config.CIRCUIT_BREAKER_FAILURE_THRESHOLD,
            window_seconds=config.CIRCUIT_BREAKER_WINDOW_SECONDS,
            recovery_seconds=config.CIRCUIT_BREAKER_RECOVERY_SECONDS,
        )
        self._mem_norm = MemoryLRUCache(config.MEMORY_CACHE_MAXSIZE)
        self._mem_neg = MemoryLRUCache(config.MEMORY_CACHE_MAXSIZE)
        self._mem_class = MemoryLRUCache(config.MEMORY_CACHE_MAXSIZE)
        self._rate_limiter = L3RateLimiter(redis_client, self._cb)

    @property
    def circuit_breaker(self) -> RedisCircuitBreaker:
        return self._cb

    @property
    def rate_limiter(self) -> L3RateLimiter:
        return self._rate_limiter

    # --- Redis helpers ---

    def _redis_get(self, key: str) -> Optional[str]:
        if not self._redis or not self._config.ENABLE_REDIS_CACHE:
            return None
        if not self._cb.is_usable:
            return None
        try:
            val = self._redis.get(key)
            self._cb.record_success()
            return val
        except Exception as e:
            self._cb.record_failure()
            logger.debug(f"Redis GET failed: {e}")
            return None

    def _redis_set(self, key: str, value: str, ttl: int) -> None:
        if not self._redis or not self._config.ENABLE_REDIS_CACHE:
            return
        if not self._cb.is_usable:
            return
        try:
            self._redis.setex(key, ttl, value)
            self._cb.record_success()
        except Exception as e:
            self._cb.record_failure()
            logger.debug(f"Redis SET failed: {e}")

    # --- Normalization cache ---

    def get_normalization(self, query: str) -> Optional[NormCacheEntry]:
        """Get cached normalization result."""
        sfp = short_fingerprint(query)
        key = f"{self._config.NORM_CACHE_PREFIX}{sfp}"

        # Try Redis first
        redis_val = self._redis_get(key)
        if redis_val:
            try:
                return NormCacheEntry.from_json(redis_val)
            except Exception:
                pass

        # Memory fallback
        mem_val = self._mem_norm.get(key)
        if mem_val:
            try:
                return NormCacheEntry.from_json(mem_val)
            except Exception:
                pass

        return None

    def set_normalization(
        self, query: str, normalized: str, layers: List[str]
    ) -> None:
        """Cache a normalization result."""
        sfp = short_fingerprint(query)
        key = f"{self._config.NORM_CACHE_PREFIX}{sfp}"
        entry = NormCacheEntry(
            normalized=normalized,
            layers=layers,
            q_fp=query_fingerprint(query),
            ts=time.time(),
        )
        val = entry.to_json()
        self._redis_set(key, val, self._config.NORMALIZATION_CACHE_TTL_SECONDS)
        self._mem_norm.put(key, val)

    # --- Negative cache ---

    def get_negative(self, query: str) -> bool:
        """Check if query is in the negative (confirmed UNKNOWN) cache."""
        if not self._config.ENABLE_NEGATIVE_CACHE:
            return False
        sfp = short_fingerprint(query)
        key = f"{self._config.NEG_CACHE_PREFIX}{sfp}"

        redis_val = self._redis_get(key)
        if redis_val:
            return True

        mem_val = self._mem_neg.get(key)
        if mem_val:
            return True

        return False

    def set_negative(self, query: str) -> None:
        """Mark query as confirmed UNKNOWN (L3 called and still UNKNOWN)."""
        if not self._config.ENABLE_NEGATIVE_CACHE:
            return
        sfp = short_fingerprint(query)
        key = f"{self._config.NEG_CACHE_PREFIX}{sfp}"
        val = json.dumps({
            "q_fp": query_fingerprint(query),
            "ts": time.time(),
        })
        self._redis_set(key, val, self._config.NEGATIVE_CACHE_TTL_SECONDS)
        self._mem_neg.put(key, val)

    # --- Classification cache ---

    def get_classification(
        self, query: str,
        classifier_ver: str = "",
        dict_ver: str = "",
        threshold_ver: str = "",
    ) -> Optional[ClassCacheEntry]:
        """Get cached classification result (non-UNKNOWN only)."""
        sfp = short_fingerprint(query)
        ver_suffix = f":{classifier_ver}" if classifier_ver else ""
        key = f"{self._config.CLASS_CACHE_PREFIX}{sfp}{ver_suffix}"

        redis_val = self._redis_get(key)
        if redis_val:
            try:
                return ClassCacheEntry.from_json(redis_val)
            except Exception:
                pass

        mem_val = self._mem_class.get(key)
        if mem_val:
            try:
                return ClassCacheEntry.from_json(mem_val)
            except Exception:
                pass

        return None

    def set_classification(
        self,
        query: str,
        intent: str,
        confidence: float,
        classifier_ver: str = "",
        dict_ver: str = "",
        threshold_ver: str = "",
    ) -> None:
        """Cache classification result. Only called for non-UNKNOWN intents."""
        sfp = short_fingerprint(query)
        ver_suffix = f":{classifier_ver}" if classifier_ver else ""
        key = f"{self._config.CLASS_CACHE_PREFIX}{sfp}{ver_suffix}"
        entry = ClassCacheEntry(
            intent=intent,
            confidence=confidence,
            q_fp=query_fingerprint(query),
            classifier_ver=classifier_ver,
            dict_ver=dict_ver,
            threshold_ver=threshold_ver,
        )
        val = entry.to_json()
        self._redis_set(key, val, self._config.CLASSIFICATION_CACHE_TTL_SECONDS)
        self._mem_class.put(key, val)

    # --- Event sampling ---

    def should_emit_event(
        self, l3_called: bool = False, negative_cache_hit: bool = False
    ) -> bool:
        """Determine if a QUERY_NORMALIZED event should be emitted."""
        if not self._config.ENABLE_EVENT_LOGGING:
            return False
        if l3_called or negative_cache_hit:
            return random.random() < self._config.EVENT_SAMPLE_RATE_L3
        return random.random() < self._config.EVENT_SAMPLE_RATE_NORMAL

    # --- Stats ---

    def stats(self) -> Dict[str, Any]:
        """Return cache health stats."""
        return {
            "redis_available": self._redis is not None,
            "circuit_breaker_state": self._cb.state,
            "circuit_breaker_usable": self._cb.is_usable,
        }


# =============================================================================
# Module-level singleton
# =============================================================================

_cache_manager: Optional[NormalizationCacheManager] = None


def init_normalization_cache(redis_client: Optional[Any] = None) -> NormalizationCacheManager:
    """Initialize the global normalization cache manager."""
    global _cache_manager
    _cache_manager = NormalizationCacheManager(redis_client=redis_client)
    logger.info(
        f"NormalizationCacheManager initialized "
        f"(redis={'yes' if redis_client else 'no'})"
    )
    return _cache_manager


def get_normalization_cache() -> NormalizationCacheManager:
    """Get the global normalization cache manager."""
    global _cache_manager
    if _cache_manager is None:
        _cache_manager = NormalizationCacheManager()
    return _cache_manager
