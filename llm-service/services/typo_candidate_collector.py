"""
Typo Candidate Collector - Auto-expansion shadow pipeline.

Collects L3 correction patterns automatically:
1. Records (original_fp -> corrected_fp) with counts via ZSET
2. Tracks intent distribution per correction pair
3. Evaluates shadow dictionary candidates

Safety pipeline: Collect -> Filter -> Shadow (observe-only) -> Manual promote

NEVER auto-applies corrections to production dictionary.

Reference: docs/NORMALIZATION_OPERATIONAL_HARDENING.md (Phase 2)
"""

import json
import logging
import random
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from config.constants import NORMALIZATION
from observability.p4_events import PIIMasker
from services.normalization_cache import (
    query_fingerprint,
    short_fingerprint,
    get_normalization_cache,
)

logger = logging.getLogger(__name__)


# =============================================================================
# Data Structures
# =============================================================================

@dataclass
class CandidateInfo:
    """Info about a typo correction candidate."""
    original_fp: str
    corrected_fp: str
    masked_original: str
    masked_corrected: str
    total_count: int = 0
    stability: float = 0.0           # top1_count / total_count
    top_intent: str = ""
    intent_stability: float = 0.0    # top_intent_count / total
    first_seen: float = 0.0
    last_seen: float = 0.0


@dataclass
class ShadowEvalResult:
    """Result of shadow dictionary evaluation."""
    q_fingerprint: str
    shadow_corrected: str
    production_intent: str
    shadow_intent: str
    would_change_routing: bool


# =============================================================================
# Redis Key Helpers
# =============================================================================

_PREFIX_CAND = "typo:cand:v1:"
_PREFIX_META = "typo:cand:meta:v1:"
_PREFIX_INTENT = "typo:intent:v1:"
_PREFIX_SHADOW = "typo:shadow:v1"


# =============================================================================
# Typo Candidate Collector
# =============================================================================

class TypoCandidateCollector:
    """Collects and manages typo correction candidates from L3 results.

    Uses Redis ZSETs for correction variance tracking and in-memory
    fallback when Redis is unavailable.
    """

    def __init__(
        self,
        redis_client: Optional[Any] = None,
        config=NORMALIZATION,
    ):
        self._redis = redis_client
        self._config = config
        # In-memory fallback for candidate counting
        self._mem_candidates: Dict[str, Dict[str, int]] = {}
        self._mem_meta: Dict[str, Dict[str, Any]] = {}
        self._mem_intents: Dict[str, Dict[str, int]] = {}
        # Shadow dictionary: {original_fp: corrected_text}
        self._shadow_dict: Dict[str, str] = {}

    @property
    def shadow_dict(self) -> Dict[str, str]:
        return dict(self._shadow_dict)

    # --- Recording ---

    def record_correction(
        self,
        original: str,
        corrected: str,
        intent: str,
    ) -> None:
        """Record an L3 correction success for candidate tracking.

        Args:
            original: Original query text (will be masked + fingerprinted)
            corrected: L3-corrected query text
            intent: Intent after re-classification with corrected text
        """
        if not self._config.ENABLE_CANDIDATE_COLLECTION:
            return

        orig_fp = query_fingerprint(original)
        corr_fp = query_fingerprint(corrected)
        masked_orig = PIIMasker.mask_query(original)
        masked_corr = PIIMasker.mask_query(corrected)
        now = time.time()

        if self._redis:
            try:
                self._record_redis(
                    orig_fp, corr_fp, masked_orig, masked_corr, intent, now
                )
                return
            except Exception as e:
                logger.debug(f"Redis record failed, using memory: {e}")

        # Memory fallback
        self._record_memory(
            orig_fp, corr_fp, masked_orig, masked_corr, intent, now
        )

    def _record_redis(
        self,
        orig_fp: str, corr_fp: str,
        masked_orig: str, masked_corr: str,
        intent: str, now: float,
    ) -> None:
        pipe = self._redis.pipeline()

        # 1. Correction distribution ZSET
        cand_key = f"{_PREFIX_CAND}{orig_fp[:16]}"
        pipe.zincrby(cand_key, 1, corr_fp[:16])
        pipe.expire(cand_key, 86400 * 30)  # 30 days

        # 2. Metadata HASH
        meta_key = f"{_PREFIX_META}{orig_fp[:16]}"
        pipe.hincrby(meta_key, "total_count", 1)
        pipe.hset(meta_key, "last_seen", str(now))
        pipe.hsetnx(meta_key, "first_seen", str(now))
        pipe.hsetnx(meta_key, "masked_original", masked_orig)
        pipe.hsetnx(meta_key, "masked_corrected", masked_corr)
        pipe.expire(meta_key, 86400 * 30)

        # 3. Intent distribution ZSET
        intent_key = f"{_PREFIX_INTENT}{orig_fp[:16]}:{corr_fp[:16]}"
        pipe.zincrby(intent_key, 1, intent)
        pipe.expire(intent_key, 86400 * 30)

        pipe.execute()

    def _record_memory(
        self,
        orig_fp: str, corr_fp: str,
        masked_orig: str, masked_corr: str,
        intent: str, now: float,
    ) -> None:
        ofp_short = orig_fp[:16]
        cfp_short = corr_fp[:16]

        # Correction distribution
        if ofp_short not in self._mem_candidates:
            self._mem_candidates[ofp_short] = {}
        self._mem_candidates[ofp_short][cfp_short] = (
            self._mem_candidates[ofp_short].get(cfp_short, 0) + 1
        )

        # Metadata
        if ofp_short not in self._mem_meta:
            self._mem_meta[ofp_short] = {
                "first_seen": now,
                "masked_original": masked_orig,
                "masked_corrected": masked_corr,
                "total_count": 0,
            }
        self._mem_meta[ofp_short]["total_count"] = (
            self._mem_meta[ofp_short].get("total_count", 0) + 1
        )
        self._mem_meta[ofp_short]["last_seen"] = now

        # Intent distribution
        intent_key = f"{ofp_short}:{cfp_short}"
        if intent_key not in self._mem_intents:
            self._mem_intents[intent_key] = {}
        self._mem_intents[intent_key][intent] = (
            self._mem_intents[intent_key].get(intent, 0) + 1
        )

    # --- Querying ---

    def get_candidates(self, min_count: int = 10, min_stability: float = 0.9) -> List[CandidateInfo]:
        """Get filtered candidates ready for shadow dict promotion.

        Args:
            min_count: Minimum occurrence count
            min_stability: Minimum correction stability (top1/total)
        """
        candidates = []
        if self._redis:
            try:
                return self._get_candidates_redis(min_count, min_stability)
            except Exception as e:
                logger.debug(f"Redis get_candidates failed: {e}")

        return self._get_candidates_memory(min_count, min_stability)

    def _get_candidates_redis(
        self, min_count: int, min_stability: float
    ) -> List[CandidateInfo]:
        candidates = []
        # Scan for candidate keys
        cursor = 0
        while True:
            cursor, keys = self._redis.scan(
                cursor, match=f"{_PREFIX_META}*", count=100
            )
            for meta_key in keys:
                ofp_short = meta_key.replace(_PREFIX_META, "")
                meta = self._redis.hgetall(meta_key)
                total = int(meta.get("total_count", 0))
                if total < min_count:
                    continue

                # Get correction distribution
                cand_key = f"{_PREFIX_CAND}{ofp_short}"
                top_corrections = self._redis.zrevrangebyscore(
                    cand_key, "+inf", "-inf", withscores=True, start=0, num=1
                )
                if not top_corrections:
                    continue

                top_corr_fp, top_count = top_corrections[0]
                stability = top_count / total if total > 0 else 0.0
                if stability < min_stability:
                    continue

                # Get intent distribution
                intent_key = f"{_PREFIX_INTENT}{ofp_short}:{top_corr_fp}"
                top_intents = self._redis.zrevrangebyscore(
                    intent_key, "+inf", "-inf", withscores=True, start=0, num=1
                )
                top_intent = ""
                intent_stab = 0.0
                if top_intents:
                    intent_total_key = f"{_PREFIX_INTENT}{ofp_short}:{top_corr_fp}"
                    all_scores = self._redis.zrangebyscore(
                        intent_total_key, "-inf", "+inf", withscores=True
                    )
                    intent_total = sum(s for _, s in all_scores) if all_scores else 0
                    top_intent = top_intents[0][0]
                    intent_stab = (
                        top_intents[0][1] / intent_total if intent_total > 0 else 0.0
                    )

                candidates.append(CandidateInfo(
                    original_fp=ofp_short,
                    corrected_fp=top_corr_fp,
                    masked_original=meta.get("masked_original", ""),
                    masked_corrected=meta.get("masked_corrected", ""),
                    total_count=total,
                    stability=stability,
                    top_intent=top_intent,
                    intent_stability=intent_stab,
                    first_seen=float(meta.get("first_seen", 0)),
                    last_seen=float(meta.get("last_seen", 0)),
                ))

            if cursor == 0:
                break

        return candidates

    def _get_candidates_memory(
        self, min_count: int, min_stability: float
    ) -> List[CandidateInfo]:
        candidates = []
        for ofp_short, corrections in self._mem_candidates.items():
            meta = self._mem_meta.get(ofp_short, {})
            total = meta.get("total_count", 0)
            if total < min_count:
                continue

            # Find top correction
            top_corr = max(corrections, key=corrections.get)
            top_count = corrections[top_corr]
            stability = top_count / total if total > 0 else 0.0
            if stability < min_stability:
                continue

            # Intent distribution
            intent_key = f"{ofp_short}:{top_corr}"
            intents = self._mem_intents.get(intent_key, {})
            top_intent = ""
            intent_stab = 0.0
            if intents:
                intent_total = sum(intents.values())
                top_intent = max(intents, key=intents.get)
                intent_stab = (
                    intents[top_intent] / intent_total if intent_total > 0 else 0.0
                )

            candidates.append(CandidateInfo(
                original_fp=ofp_short,
                corrected_fp=top_corr,
                masked_original=meta.get("masked_original", ""),
                masked_corrected=meta.get("masked_corrected", ""),
                total_count=total,
                stability=stability,
                top_intent=top_intent,
                intent_stability=intent_stab,
                first_seen=meta.get("first_seen", 0),
                last_seen=meta.get("last_seen", 0),
            ))

        return candidates

    # --- Shadow Dictionary ---

    def promote_to_shadow(self, original_fp: str, corrected_text: str) -> None:
        """Add a candidate to the shadow dictionary for observation.

        Shadow entries are NOT applied to production routing.
        They are evaluated in parallel to measure "what would change".
        """
        self._shadow_dict[original_fp] = corrected_text
        if self._redis:
            try:
                self._redis.sadd(_PREFIX_SHADOW, f"{original_fp}:{corrected_text}")
            except Exception:
                pass
        logger.info(
            f"Promoted to shadow dict: {original_fp} -> "
            f"{PIIMasker.mask_query(corrected_text)}"
        )

    def evaluate_shadow(
        self, query: str, production_intent: str, classifier_fn=None
    ) -> Optional[ShadowEvalResult]:
        """Evaluate shadow dict: would this correction change routing?

        Only runs on sampled requests (UNKNOWN/L3 cases or 5-10% random).
        Does NOT affect production routing.

        Args:
            query: Original query
            production_intent: Intent from production classification
            classifier_fn: callable(text) -> intent string
        """
        if not self._config.ENABLE_SHADOW_DICT or not classifier_fn:
            return None
        if not self._shadow_dict:
            return None

        qfp = query_fingerprint(query)[:16]
        corrected = self._shadow_dict.get(qfp)
        if not corrected:
            return None

        shadow_intent = classifier_fn(corrected)
        would_change = shadow_intent != production_intent

        return ShadowEvalResult(
            q_fingerprint=qfp,
            shadow_corrected=PIIMasker.mask_query(corrected),
            production_intent=production_intent,
            shadow_intent=shadow_intent,
            would_change_routing=would_change,
        )

    # --- Stats ---

    def stats(self) -> Dict[str, Any]:
        """Return collector statistics."""
        return {
            "candidate_count": len(self._mem_candidates),
            "shadow_dict_size": len(self._shadow_dict),
            "collection_enabled": self._config.ENABLE_CANDIDATE_COLLECTION,
            "shadow_enabled": self._config.ENABLE_SHADOW_DICT,
        }


# =============================================================================
# Module-level singleton
# =============================================================================

_collector: Optional[TypoCandidateCollector] = None


def init_candidate_collector(
    redis_client: Optional[Any] = None,
) -> TypoCandidateCollector:
    """Initialize the global candidate collector."""
    global _collector
    _collector = TypoCandidateCollector(redis_client=redis_client)
    return _collector


def get_candidate_collector() -> TypoCandidateCollector:
    """Get the global candidate collector."""
    global _collector
    if _collector is None:
        _collector = TypoCandidateCollector()
    return _collector
