"""
Korean Query Normalizer for Typo Tolerance.

3-Layer normalization strategy:
- Layer 1: Korean jamo decomposition + fuzzy matching (0ms)
- Layer 2: PM-domain typo dictionary (0ms)
- Layer 3: LLM-based correction (200-500ms, UNKNOWN fallback only)

No external dependencies - pure Python jamo decomposition via Unicode arithmetic.
"""

import logging
import threading
from collections import OrderedDict
from difflib import SequenceMatcher
from typing import List, Optional

logger = logging.getLogger(__name__)


# =============================================================================
# Korean Jamo Constants (Unicode Standard)
# =============================================================================

HANGUL_BASE = 0xAC00
HANGUL_END = 0xD7A3
JUNGSEONG_COUNT = 21
JONGSEONG_COUNT = 28

CHOSEONG_LIST = [
    'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ',
    'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
]
JUNGSEONG_LIST = [
    'ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ',
    'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ',
]
JONGSEONG_LIST = [
    '', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ',
    'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ',
    'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
]


# =============================================================================
# Layer 1: Korean Jamo Decomposition + Fuzzy Matching
# =============================================================================

def decompose_korean(text: str) -> List[str]:
    """
    Decompose Korean text into jamo (consonant/vowel) sequence.

    Uses Unicode arithmetic - no external dependencies.
    Non-Korean characters are passed through as-is.

    Examples:
        "테스트" -> ['ㅌ', 'ㅔ', 'ㅅ', 'ㅡ', 'ㅌ', 'ㅡ']
        "task"  -> ['t', 'a', 's', 'k']
    """
    result = []
    for ch in text:
        code = ord(ch)
        if HANGUL_BASE <= code <= HANGUL_END:
            offset = code - HANGUL_BASE
            cho = offset // (JUNGSEONG_COUNT * JONGSEONG_COUNT)
            jung = (offset % (JUNGSEONG_COUNT * JONGSEONG_COUNT)) // JONGSEONG_COUNT
            jong = offset % JONGSEONG_COUNT
            result.append(CHOSEONG_LIST[cho])
            result.append(JUNGSEONG_LIST[jung])
            if jong > 0:
                result.append(JONGSEONG_LIST[jong])
        else:
            result.append(ch)
    return result


def jamo_similarity(a: str, b: str) -> float:
    """
    Compute jamo-level similarity between two strings.

    Decomposes both strings into jamo sequences, then uses
    SequenceMatcher for edit-distance-based similarity ratio.

    Returns:
        Float between 0.0 (completely different) and 1.0 (identical)
    """
    if not a or not b:
        return 0.0

    jamo_a = decompose_korean(a)
    jamo_b = decompose_korean(b)

    if not jamo_a or not jamo_b:
        return 0.0

    return SequenceMatcher(None, jamo_a, jamo_b).ratio()


def fuzzy_keyword_in_query(keyword: str, query: str, threshold: float = 0.82) -> bool:
    """
    Check if keyword exists in query with fuzzy jamo matching.

    Fast path: exact substring match first.
    Slow path: sliding window with jamo similarity comparison.

    Args:
        keyword: The keyword to search for (e.g., "테스트 중")
        query: The query text to search in
        threshold: Minimum jamo similarity ratio (default 0.82)
            Tuned to avoid false positives from shared prefixes
            (e.g., "진행 상" should NOT match "진행 중" at 0.80)

    Returns:
        True if keyword is found (exact or fuzzy)
    """
    if not keyword or not query:
        return False

    # Fast path: exact substring match
    if keyword in query:
        return True

    kw_len = len(keyword)
    query_len = len(query)

    if kw_len > query_len:
        return False

    # Sliding window: check windows of exact keyword length only.
    # Jamo-level comparison already handles single-character typos
    # (a typo changes 2-3 jamo positions, not the whole character count).
    for i in range(query_len - kw_len + 1):
        window = query[i:i + kw_len]
        sim = jamo_similarity(keyword, window)
        if sim >= threshold:
            return True

    return False


# =============================================================================
# Layer 2: PM-Domain Typo Dictionary
# =============================================================================

KOREAN_TYPO_MAP = {
    # Korean PM-domain typos -> correct form
    "테트트": "테스트",
    "텟트": "테스트",
    "테스크": "태스크",
    "태스트": "태스크",
    "테스트크": "태스크",
    "스프런트": "스프린트",
    "스프린크": "스프린트",
    "스프릿": "스프린트",
    "백로거": "백로그",
    "백러그": "백로그",
    "베로그": "백로그",
    "리스거": "리스크",
    "리스크르": "리스크",
    "프로젝크": "프로젝트",
    "프로잭트": "프로젝트",
    "마갑": "마감",
    "검코": "검토",
    "점토": "검토",
    "리듀": "리뷰",
    "리뷸": "리뷰",
    "리불": "리뷰",
    "완룐": "완료",
    "완룔": "완료",
    "진행율": "진행률",
    "완료율": "완료률",
    # Common English typos in PM context
    "taks": "task",
    "tsak": "task",
    "tast": "task",
    "spint": "sprint",
    "sprnt": "sprint",
    "baklog": "backlog",
    "bakclog": "backlog",
    "reveiw": "review",
    "reivew": "review",
}


def apply_typo_corrections(query: str) -> str:
    """
    Apply known typo corrections to query text.

    Iterates through the typo dictionary and replaces known typos.
    Safe to call on already-correct text (no false replacements).

    Args:
        query: User query text

    Returns:
        Corrected query text
    """
    corrected = query
    for typo, correct in KOREAN_TYPO_MAP.items():
        if typo in corrected:
            corrected = corrected.replace(typo, correct)
    return corrected


def normalize_query(query: str) -> str:
    """
    Combined Layer 1+2 normalization (no LLM call).

    Applies typo dictionary corrections.
    Fuzzy matching is handled separately at keyword-match time.

    Args:
        query: User query text

    Returns:
        Normalized query text
    """
    if not query:
        return query
    return apply_typo_corrections(query)


# =============================================================================
# Layer 3: LLM-Based Query Normalization (Fallback Only)
# =============================================================================

class LLMNormalizerCache:
    """Thread-safe LRU cache for LLM normalization results.

    Legacy in-memory cache. Now superseded by NormalizationCacheManager
    for production use, but kept as fallback when cache manager is not initialized.
    """

    def __init__(self, maxsize: int = 256):
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


_llm_cache = LLMNormalizerCache(maxsize=256)


def _build_normalization_prompt(query: str, model_path: str = "") -> str:
    """Build a short prompt for typo correction."""
    instruction = (
        "Fix Korean typos in this sentence. "
        "Only correct typos, do not change meaning or add words.\n"
        f"Input: {query}\n"
        "Output:"
    )

    model_path_lower = (model_path or "").lower()
    if "gemma" in model_path_lower:
        return (
            f"<start_of_turn>user\n{instruction}<end_of_turn>\n"
            f"<start_of_turn>model\n"
        )
    elif "qwen" in model_path_lower:
        return (
            f"<|im_start|>user\n{instruction}/no_think<|im_end|>\n"
            f"<|im_start|>assistant\n"
        )
    else:
        # ChatML (LFM2, Llama, etc.)
        return (
            f"<|im_start|>user\n{instruction}<|im_end|>\n"
            f"<|im_start|>assistant\n"
        )


def normalize_query_with_llm(llm, query: str, model_path: str = "") -> Optional[str]:
    """
    Use lightweight LLM to correct typos in the query.

    Only called when Layer 1+2 fail (classification = UNKNOWN).
    Results are cached via NormalizationCacheManager (Redis + memory)
    with fallback to the legacy in-memory LRU cache.

    Args:
        llm: Llama model instance (L1 lightweight preferred)
        query: User query text
        model_path: Model path for prompt format detection

    Returns:
        Corrected query text, or None if correction fails
    """
    if not llm or not query:
        return None

    # Check tiered cache (Redis + memory) first
    try:
        from services.normalization_cache import get_normalization_cache
        cache_mgr = get_normalization_cache()
        cached_entry = cache_mgr.get_normalization(query)
        if cached_entry and "L3" in cached_entry.layers:
            logger.debug(f"LLM normalization cache hit (tiered): '{query}'")
            return cached_entry.normalized
    except Exception:
        cache_mgr = None

    # Legacy in-memory cache fallback
    cache_key = query.strip().lower()
    cached = _llm_cache.get(cache_key)
    if cached is not None:
        logger.debug(f"LLM normalization cache hit (legacy): '{query}'")
        return cached

    try:
        prompt = _build_normalization_prompt(query, model_path)

        llm.reset()
        response = llm(
            prompt,
            max_tokens=100,
            temperature=0.1,
            top_p=0.90,
            stop=["\n", "<end_of_turn>", "<start_of_turn>", "</s>", "<|im_end|>"],
            echo=False,
        )

        choices = response.get("choices") if response else None
        if choices and len(choices) > 0:
            text = choices[0].get("text", "").strip()
            if text and len(text) <= len(query) * 2:
                _llm_cache.put(cache_key, text)
                # Also store in tiered cache with L3 layer info
                if cache_mgr:
                    try:
                        cache_mgr.set_normalization(query, text, ["L3"])
                    except Exception:
                        pass
                logger.info(f"LLM normalization: '{query}' -> '{text}'")
                return text

    except Exception as e:
        logger.warning(f"LLM normalization failed: {e}")

    return None


# =============================================================================
# Utility: Korean Detection
# =============================================================================

def has_korean(text: str) -> bool:
    """Check if text contains Korean characters."""
    return any(HANGUL_BASE <= ord(c) <= HANGUL_END for c in text)
