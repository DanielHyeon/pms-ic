"""
Entity Resolver for WBS Entity Progress Queries.

Extracts entity names from progress queries and resolves them
to specific database records using 2-step search + tie-breaker.

Reference: docs/P6_WBS_ENTITY_PROGRESS.md Section 7
"""

import re
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

logger = logging.getLogger(__name__)

# =============================================================================
# Entity Name Extraction (regex capture based)
# =============================================================================

_entity_progress_patterns = [
    re.compile(r"(.+?)\s*(진행률|진행율|진척률|완료율|몇\s*%|몇\s*퍼센트)"),
    re.compile(r"(.+?)\s*(어디까지|얼마나)\s*(진행|완료|됐|했)"),
]

# Scope words: project-level terms that should be stripped
_scope_words = {"프로젝트", "전체", "overall", "project", "현재", "지금", "우리", "단계"}

# Time adverbs: separated from scope words for sprint/period KPI routing
_time_adverbs = {"이번", "이번주", "이번 주", "오늘", "금주", "이달", "이번달"}

# Sprint synonyms: delegate to sprint_progress if detected
_sprint_synonyms = {"스프린트", "sprint", "iteration", "이터레이션"}
_sprint_pattern = re.compile(r"sprint\s*\d+", re.IGNORECASE)

# Korean josa (postpositions) to strip from candidates
_josa_pattern = re.compile(r"[은는이가을를의에서도]$")


def extract_entity_name(query: str) -> Optional[str]:
    """
    Extract entity name from progress query using regex capture.

    Examples:
        "ocr 성능 평가 진행율은" → "ocr 성능 평가"
        "프로젝트 OCR 성능 평가 진행률" → "OCR 성능 평가"
        "진행률 보여줘" → None (no entity)
        "Sprint 1 진행률" → None (sprint synonym delegation)
        "금주 OCR 평가 진행률" → "OCR 평가" (time adverb stripped)
    """
    query_lower = query.lower().strip()

    for pattern in _entity_progress_patterns:
        m = pattern.search(query_lower)
        if m:
            raw = m.group(1).strip()

            # Step 1: Strip scope words + time adverbs
            # Strip colons from tokens before scope word comparison
            # (e.g., "단계:" → "단계" for scope check)
            tokens = raw.split()
            cleaned = [t for t in tokens
                       if t.rstrip(":") not in _scope_words
                       and t.rstrip(":") not in _time_adverbs]
            candidate = " ".join(cleaned).strip()
            # Strip leading/trailing colons and whitespace (e.g., residual ":" after scope strip)
            candidate = candidate.strip(":").strip()

            # Step 2: Strip josa from last token only (protect word endings)
            tokens_c = candidate.split()
            if tokens_c:
                last = tokens_c[-1]
                stripped_last = _josa_pattern.sub("", last)
                if len(stripped_last) >= 2:
                    tokens_c[-1] = stripped_last
                candidate = " ".join(tokens_c)

            # Step 3: Length validation
            if len(candidate) <= 2:
                return None

            # Step 4: Sprint synonym delegation
            candidate_lower = candidate.lower()
            if any(syn in candidate_lower for syn in _sprint_synonyms):
                return None
            if _sprint_pattern.search(candidate_lower):
                return None

            return candidate

    return None


def has_progress_signal(query: str) -> bool:
    """Check if query contains a progress signal keyword."""
    query_lower = query.lower()
    signals = ["진행률", "진행율", "진척률", "완료율", "몇 %", "몇%", "몇 퍼센트",
               "몇퍼센트", "어디까지", "얼마나"]
    return any(s in query_lower for s in signals)


# =============================================================================
# Tie-Breaker for Multi-Match Resolution
# =============================================================================

def select_best_match(matches: list) -> Optional[dict]:
    """
    Apply tie-breaker rules for multi-match resolution.

    Rules (in priority order):
    1. Exact match (=) over fuzzy match (ILIKE)
    2. Lower priority number wins (item > group > task > story)
       2b. Progress-aware override: if winner has 0/NULL progress
           but another level has meaningful progress, prefer it
    3. Active status (IN_PROGRESS) over completed/not-started
    4. Context score (hierarchy, sprint, recency)

    Returns:
        best_match dict if auto-selection confident, None if disambiguation needed
    """
    if not matches:
        return None

    # Rule 1: Exact match filter
    exact = [m for m in matches if m.get("match_mode") == "exact"]
    if len(exact) == 1:
        return exact[0]
    if exact:
        matches = exact

    # Rule 2: Priority-based (lowest priority number wins)
    min_priority = min(m["priority"] for m in matches)
    top_priority = [m for m in matches if m["priority"] == min_priority]
    if len(top_priority) == 1:
        winner = top_priority[0]
        # Rule 2b: Progress-aware override
        # If the priority winner has empty progress (0 or NULL) but a
        # different hierarchy level has meaningful progress, prefer it.
        # This prevents showing 0% for a wbs_item when the wbs_group
        # the user sees in the WBS tree actually has 79%.
        if _has_empty_progress(winner) and len(matches) > 1:
            with_progress = [m for m in matches if not _has_empty_progress(m)]
            if len(with_progress) == 1:
                return with_progress[0]
        return winner

    # Rule 3: Active status preference
    active = [m for m in top_priority if m.get("status") == "IN_PROGRESS"]
    if len(active) == 1:
        return active[0]

    # Rule 4: Context scoring
    candidates = active if active else top_priority
    if len(candidates) > 1:
        scored = [(_context_score(m), m) for m in candidates]
        scored.sort(key=lambda x: x[0], reverse=True)
        # Auto-select if top score leads by >= 2
        if scored[0][0] - scored[1][0] >= 2:
            return scored[0][1]

    # Disambiguation needed
    return None


def _has_empty_progress(match: dict) -> bool:
    """Check if match has empty/zero progress (0, None, or progress_is_null)."""
    if match.get("progress_is_null"):
        return True
    progress = match.get("progress")
    if progress is None or progress == 0:
        return True
    return False


def _context_score(match: dict) -> int:
    """
    Calculate context-based relevance score for tie-breaking.

    Score components:
    - WBS item with phase/group hierarchy: +3
    - Connected to active sprint: +2
    - Recently updated (within 7 days): +2
    - Has children (non-leaf): +1
    - user_story with status DONE: -1 (likely stale)
    """
    score = 0

    if match.get("entity_type") == "wbs_item" and match.get("phase_name"):
        score += 3

    if match.get("active_sprint_connected"):
        score += 2

    if match.get("updated_at"):
        try:
            updated = match["updated_at"]
            if isinstance(updated, str):
                updated = datetime.fromisoformat(updated)
            if updated > datetime.now(timezone.utc) - timedelta(days=7):
                score += 2
        except (ValueError, TypeError):
            pass

    if match.get("has_children"):
        score += 1

    if match.get("entity_type") == "user_story" and match.get("status") == "DONE":
        score -= 1

    return score


# =============================================================================
# Progress Calculation Helpers (NULL-safe)
# =============================================================================

def calc_weighted_progress(rows: list) -> dict:
    """
    Calculate weighted progress from child rows (NULL-safe).

    Returns:
        {
            "progress": float | None,
            "calculation": str,
            "null_count": int,
            "null_ratio": float,
            "confidence": str,
        }
    """
    total_wp = sum(r.get("weighted_progress_nonnull") or 0 for r in rows)
    total_w = sum(r.get("total_weight_nonnull") or 0 for r in rows)
    null_count = sum(r.get("null_progress_count") or 0 for r in rows)
    total_count = sum(r.get("total_count") or 0 for r in rows)

    null_ratio = null_count / total_count if total_count > 0 else 1.0

    if total_w == 0:
        return {
            "progress": None,
            "calculation": "status_based",
            "null_count": null_count,
            "null_ratio": null_ratio,
            "confidence": "low",
        }

    progress = round(total_wp / total_w, 1)
    return {
        "progress": progress,
        "calculation": "child_weighted_avg",
        "null_count": null_count,
        "null_ratio": null_ratio,
        "confidence": _calc_confidence(null_ratio),
    }


def _calc_confidence(null_ratio: float) -> str:
    """Map null ratio to confidence level."""
    if null_ratio == 0:
        return "high"
    elif null_ratio < 0.3:
        return "medium"
    else:
        return "low"
