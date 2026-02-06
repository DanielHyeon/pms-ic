"""
Tests for normalization cache manager, circuit breaker, and rate limiter.

Phase 1: Redis Cache + Circuit Breaker + Event Logging
"""

import json
import time
import pytest
from unittest.mock import MagicMock, patch

from services.normalization_cache import (
    RedisCircuitBreaker,
    CircuitState,
    MemoryLRUCache,
    NormalizationCacheManager,
    NormCacheEntry,
    ClassCacheEntry,
    L3RateLimiter,
    query_fingerprint,
    short_fingerprint,
    init_normalization_cache,
    get_normalization_cache,
)


# =============================================================================
# Fingerprint Tests
# =============================================================================

class TestFingerprint:
    def test_query_fingerprint_deterministic(self):
        fp1 = query_fingerprint("test query")
        fp2 = query_fingerprint("test query")
        assert fp1 == fp2

    def test_query_fingerprint_canonical(self):
        """strip() + lower() should normalize before hashing."""
        fp1 = query_fingerprint("  Test Query  ")
        fp2 = query_fingerprint("test query")
        assert fp1 == fp2

    def test_short_fingerprint_is_16_chars(self):
        sfp = short_fingerprint("test query")
        assert len(sfp) == 16

    def test_different_queries_different_fps(self):
        fp1 = query_fingerprint("query one")
        fp2 = query_fingerprint("query two")
        assert fp1 != fp2

    def test_korean_fingerprint(self):
        fp = query_fingerprint("스프린트 현황 알려줘")
        assert len(fp) == 64  # full sha256 hex


# =============================================================================
# Circuit Breaker Tests
# =============================================================================

class TestCircuitBreaker:
    def test_initial_state_is_closed(self):
        cb = RedisCircuitBreaker()
        assert cb.state == CircuitState.CLOSED
        assert cb.is_usable

    def test_stays_closed_below_threshold(self):
        cb = RedisCircuitBreaker(failure_threshold=3)
        cb.record_failure()
        cb.record_failure()
        assert cb.state == CircuitState.CLOSED

    def test_opens_at_threshold(self):
        cb = RedisCircuitBreaker(failure_threshold=3, window_seconds=30)
        cb.record_failure()
        cb.record_failure()
        cb.record_failure()
        assert cb.state == CircuitState.OPEN
        assert not cb.is_usable

    def test_open_to_half_open_after_recovery(self):
        cb = RedisCircuitBreaker(
            failure_threshold=3, recovery_seconds=60
        )
        cb.record_failure()
        cb.record_failure()
        cb.record_failure()
        # Verify OPEN (with long recovery, stays OPEN)
        assert not cb.is_usable
        # Force recovery by backdating opened_at
        cb._opened_at = time.time() - 61
        assert cb.state == CircuitState.HALF_OPEN

    def test_half_open_to_closed_on_success(self):
        cb = RedisCircuitBreaker(
            failure_threshold=3, recovery_seconds=60
        )
        for _ in range(3):
            cb.record_failure()
        # Force into HALF_OPEN
        cb._opened_at = time.time() - 61
        assert cb.state == CircuitState.HALF_OPEN
        cb.record_success()
        assert cb.state == CircuitState.CLOSED

    def test_half_open_to_open_on_failure(self):
        cb = RedisCircuitBreaker(
            failure_threshold=3, recovery_seconds=60
        )
        for _ in range(3):
            cb.record_failure()
        # Force into HALF_OPEN
        cb._opened_at = time.time() - 61
        assert cb.state == CircuitState.HALF_OPEN
        cb.record_failure()
        assert not cb.is_usable  # back to OPEN

    def test_old_failures_expire(self):
        cb = RedisCircuitBreaker(
            failure_threshold=3, window_seconds=0
        )
        cb.record_failure()
        cb.record_failure()
        time.sleep(0.01)
        # Old failures should have expired
        cb.record_failure()
        assert cb.state == CircuitState.CLOSED


# =============================================================================
# Memory LRU Cache Tests
# =============================================================================

class TestMemoryLRUCache:
    def test_get_miss(self):
        cache = MemoryLRUCache(maxsize=10)
        assert cache.get("nonexistent") is None

    def test_put_and_get(self):
        cache = MemoryLRUCache(maxsize=10)
        cache.put("key1", "value1")
        assert cache.get("key1") == "value1"

    def test_eviction_on_maxsize(self):
        cache = MemoryLRUCache(maxsize=2)
        cache.put("k1", "v1")
        cache.put("k2", "v2")
        cache.put("k3", "v3")
        assert cache.get("k1") is None  # evicted
        assert cache.get("k2") == "v2"
        assert cache.get("k3") == "v3"

    def test_lru_ordering(self):
        cache = MemoryLRUCache(maxsize=2)
        cache.put("k1", "v1")
        cache.put("k2", "v2")
        cache.get("k1")  # access k1, making k2 least recently used
        cache.put("k3", "v3")
        assert cache.get("k1") == "v1"
        assert cache.get("k2") is None  # k2 evicted
        assert cache.get("k3") == "v3"

    def test_clear(self):
        cache = MemoryLRUCache(maxsize=10)
        cache.put("k1", "v1")
        cache.clear()
        assert cache.get("k1") is None


# =============================================================================
# NormCacheEntry / ClassCacheEntry Tests
# =============================================================================

class TestCacheEntries:
    def test_norm_entry_round_trip(self):
        entry = NormCacheEntry(
            normalized="corrected", layers=["L2"], q_fp="abc123", ts=1000.0
        )
        json_str = entry.to_json()
        restored = NormCacheEntry.from_json(json_str)
        assert restored.normalized == "corrected"
        assert restored.layers == ["L2"]
        assert restored.q_fp == "abc123"

    def test_class_entry_round_trip(self):
        entry = ClassCacheEntry(
            intent="backlog_list",
            confidence=0.92,
            q_fp="def456",
            classifier_ver="v2.1",
        )
        json_str = entry.to_json()
        restored = ClassCacheEntry.from_json(json_str)
        assert restored.intent == "backlog_list"
        assert restored.confidence == 0.92


# =============================================================================
# NormalizationCacheManager Tests (Memory-Only)
# =============================================================================

class TestNormalizationCacheManager:
    def test_normalization_cache_miss(self):
        mgr = NormalizationCacheManager(redis_client=None)
        assert mgr.get_normalization("unknown query") is None

    def test_normalization_cache_set_get(self):
        mgr = NormalizationCacheManager(redis_client=None)
        mgr.set_normalization("raw query", "normalized query", ["L2"])
        entry = mgr.get_normalization("raw query")
        assert entry is not None
        assert entry.normalized == "normalized query"
        assert entry.layers == ["L2"]
        assert len(entry.q_fp) == 64  # full sha256

    def test_negative_cache_miss(self):
        mgr = NormalizationCacheManager(redis_client=None)
        assert mgr.get_negative("some query") is False

    def test_negative_cache_set_get(self):
        mgr = NormalizationCacheManager(redis_client=None)
        mgr.set_negative("unknown query")
        assert mgr.get_negative("unknown query") is True

    def test_classification_cache_miss(self):
        mgr = NormalizationCacheManager(redis_client=None)
        assert mgr.get_classification("some query") is None

    def test_classification_cache_set_get(self):
        mgr = NormalizationCacheManager(redis_client=None)
        mgr.set_classification(
            "query", "backlog_list", 0.92, classifier_ver="v2.1"
        )
        entry = mgr.get_classification("query", classifier_ver="v2.1")
        assert entry is not None
        assert entry.intent == "backlog_list"
        assert entry.confidence == 0.92

    def test_classification_cache_version_mismatch(self):
        mgr = NormalizationCacheManager(redis_client=None)
        mgr.set_classification(
            "query", "backlog_list", 0.92, classifier_ver="v2.1"
        )
        # Different version should miss
        entry = mgr.get_classification("query", classifier_ver="v3.0")
        assert entry is None

    def test_stats(self):
        mgr = NormalizationCacheManager(redis_client=None)
        stats = mgr.stats()
        assert stats["redis_available"] is False
        assert stats["circuit_breaker_state"] == CircuitState.CLOSED

    def test_canonical_key_normalization(self):
        """Cache keys should be case/whitespace insensitive."""
        mgr = NormalizationCacheManager(redis_client=None)
        mgr.set_normalization("  Hello World  ", "hello world", ["L2"])
        entry = mgr.get_normalization("hello world")
        assert entry is not None
        assert entry.normalized == "hello world"


# =============================================================================
# NormalizationCacheManager Tests (With Mock Redis)
# =============================================================================

class TestCacheManagerWithRedis:
    def _make_redis_mock(self):
        redis = MagicMock()
        redis.get.return_value = None
        redis.setex.return_value = True
        return redis

    def test_norm_cache_with_redis(self):
        redis = self._make_redis_mock()
        mgr = NormalizationCacheManager(redis_client=redis)

        mgr.set_normalization("query", "corrected", ["L2"])
        assert redis.setex.called

    def test_norm_cache_redis_get_hit(self):
        redis = self._make_redis_mock()
        entry = NormCacheEntry(
            normalized="from_redis", layers=["L3"], q_fp="abc", ts=1000.0
        )
        redis.get.return_value = entry.to_json()
        mgr = NormalizationCacheManager(redis_client=redis)

        result = mgr.get_normalization("query")
        assert result is not None
        assert result.normalized == "from_redis"

    def test_redis_failure_falls_back_to_memory(self):
        redis = self._make_redis_mock()
        redis.get.side_effect = ConnectionError("Redis down")
        redis.setex.side_effect = ConnectionError("Redis down")
        mgr = NormalizationCacheManager(redis_client=redis)

        # SET should not raise
        mgr.set_normalization("query", "corrected", ["L2"])

        # GET from memory fallback
        entry = mgr.get_normalization("query")
        assert entry is not None
        assert entry.normalized == "corrected"

    def test_circuit_breaker_opens_after_failures(self):
        redis = self._make_redis_mock()
        redis.get.side_effect = ConnectionError("Redis down")
        mgr = NormalizationCacheManager(redis_client=redis)

        # Trigger 3 failures (GET attempts)
        for _ in range(3):
            mgr.get_normalization("query")

        assert mgr.circuit_breaker.state == CircuitState.OPEN
        # Subsequent calls should NOT attempt Redis
        redis.get.reset_mock()
        mgr.get_normalization("another_query")
        redis.get.assert_not_called()

    def test_negative_cache_with_redis(self):
        redis = self._make_redis_mock()
        redis.get.return_value = '{"q_fp":"abc","ts":1000}'
        mgr = NormalizationCacheManager(redis_client=redis)

        assert mgr.get_negative("query") is True


# =============================================================================
# L3 Rate Limiter Tests
# =============================================================================

class TestL3RateLimiter:
    def test_local_allows_under_limit(self):
        limiter = L3RateLimiter(
            redis_client=None, circuit_breaker=None, max_per_minute=5
        )
        for _ in range(5):
            assert limiter.is_allowed()

    def test_local_blocks_over_limit(self):
        limiter = L3RateLimiter(
            redis_client=None, circuit_breaker=None, max_per_minute=3
        )
        assert limiter.is_allowed()
        assert limiter.is_allowed()
        assert limiter.is_allowed()
        assert not limiter.is_allowed()

    def test_redis_rate_limit(self):
        redis = MagicMock()
        redis.incr.return_value = 1
        cb = RedisCircuitBreaker()
        limiter = L3RateLimiter(
            redis_client=redis, circuit_breaker=cb, max_per_minute=30
        )
        assert limiter.is_allowed()
        assert redis.incr.called

    def test_redis_rate_limit_exceeded(self):
        redis = MagicMock()
        redis.incr.return_value = 31
        cb = RedisCircuitBreaker()
        limiter = L3RateLimiter(
            redis_client=redis, circuit_breaker=cb, max_per_minute=30
        )
        assert not limiter.is_allowed()

    def test_redis_failure_falls_back_to_local(self):
        redis = MagicMock()
        redis.incr.side_effect = ConnectionError("Redis down")
        cb = RedisCircuitBreaker()
        limiter = L3RateLimiter(
            redis_client=redis, circuit_breaker=cb, max_per_minute=30
        )
        # Should fall back to local and allow
        assert limiter.is_allowed()


# =============================================================================
# Event Sampling Tests
# =============================================================================

class TestEventSampling:
    def test_l3_events_always_sampled(self):
        mgr = NormalizationCacheManager(redis_client=None)
        # L3 called -> rate=1.0, should always pass
        results = [mgr.should_emit_event(l3_called=True) for _ in range(100)]
        assert all(results)

    def test_negative_cache_hit_always_sampled(self):
        mgr = NormalizationCacheManager(redis_client=None)
        results = [
            mgr.should_emit_event(negative_cache_hit=True) for _ in range(100)
        ]
        assert all(results)

    def test_normal_events_sampled_at_10_percent(self):
        mgr = NormalizationCacheManager(redis_client=None)
        results = [mgr.should_emit_event() for _ in range(1000)]
        # With 10% rate, expect ~100. Allow wide range for randomness.
        count = sum(results)
        assert 30 < count < 200

    def test_disabled_event_logging(self):
        from config.constants import NormalizationConfig
        config = NormalizationConfig(ENABLE_EVENT_LOGGING=False)
        mgr = NormalizationCacheManager(redis_client=None, config=config)
        assert not mgr.should_emit_event(l3_called=True)


# =============================================================================
# Module-level singleton Tests
# =============================================================================

class TestSingleton:
    def test_init_and_get(self):
        mgr = init_normalization_cache(None)
        assert mgr is get_normalization_cache()

    def test_get_creates_default(self):
        # Reset by importing fresh
        import services.normalization_cache as mod
        mod._cache_manager = None
        mgr = mod.get_normalization_cache()
        assert mgr is not None
