"""
Entity Resolver Unit Tests

Tests for:
1. Entity name extraction (regex capture, scope/time stripping, sprint delegation)
2. Tie-breaker logic (priority, status, context scoring)
3. Progress calculation integrity (NULL-safe weighted average)

Run: pytest tests/test_entity_resolver.py -v
"""

import pytest
from datetime import datetime, timedelta, timezone

from utils.entity_resolver import (
    extract_entity_name,
    has_progress_signal,
    select_best_match,
    calc_weighted_progress,
)


# =============================================================================
# Entity Name Extraction Tests
# =============================================================================

class TestExtractEntityName:
    """Entity name extraction from progress queries"""

    def test_basic_extraction(self):
        """Standard entity + progress keyword"""
        assert extract_entity_name("ocr 성능 평가 진행율은") == "ocr 성능 평가"
        assert extract_entity_name("요구사항 분석 진행률 알려줘") == "요구사항 분석"
        # "평가" ends in "가" but should NOT be stripped (word, not josa)
        assert extract_entity_name("ocr 성능 평가 진행률") == "ocr 성능 평가"

    def test_progress_keywords(self):
        """Various progress keywords should trigger extraction"""
        assert extract_entity_name("데이터 파이프라인 진행률") == "데이터 파이프라인"
        assert extract_entity_name("데이터 파이프라인 진척률") == "데이터 파이프라인"
        assert extract_entity_name("데이터 파이프라인 완료율") == "데이터 파이프라인"
        assert extract_entity_name("데이터 파이프라인 몇 %") == "데이터 파이프라인"
        assert extract_entity_name("데이터 파이프라인 몇 퍼센트") == "데이터 파이프라인"

    def test_conversational_form(self):
        """Conversational forms like '어디까지 됐어'"""
        result = extract_entity_name("데이터 처리 파이프라인 어디까지 됐어")
        assert result == "데이터 처리 파이프라인"

    def test_scope_words_stripped(self):
        """Scope words (프로젝트, 전체, etc.) should be removed"""
        assert extract_entity_name("프로젝트 OCR 성능 평가 진행률") == "ocr 성능 평가"
        assert extract_entity_name("전체 데이터 처리 진행률") == "데이터 처리"
        assert extract_entity_name("우리 요구사항 분석 진행률") == "요구사항 분석"

    def test_time_adverbs_stripped(self):
        """Time adverbs (이번, 금주, etc.) should be removed"""
        result = extract_entity_name("금주 OCR 평가 진행률")
        assert result == "ocr 평가"

        result = extract_entity_name("이번달 데이터 처리 진행률")
        assert result == "데이터 처리"

    def test_josa_stripped(self):
        """Korean postpositions (josa) should be stripped"""
        assert extract_entity_name("ocr 성능 평가의 진행률") == "ocr 성능 평가"
        assert extract_entity_name("요구사항 분석은 진행률") == "요구사항 분석"

    def test_short_name_returns_none(self):
        """Entity names <= 2 chars should return None"""
        assert extract_entity_name("UI 진행률") is None
        assert extract_entity_name("QA 진행률") is None

    def test_no_entity_returns_none(self):
        """Queries without entity name should return None"""
        assert extract_entity_name("진행률 보여줘") is None
        assert extract_entity_name("진행률 알려줘") is None

    def test_sprint_synonym_returns_none(self):
        """Sprint-related queries should return None (delegation)"""
        assert extract_entity_name("Sprint 1 진행률") is None
        assert extract_entity_name("스프린트 3 진행률") is None
        assert extract_entity_name("iteration 진행률") is None
        assert extract_entity_name("이터레이션 진행률") is None

    def test_only_scope_words_returns_none(self):
        """If only scope words remain after stripping, return None"""
        # "프로젝트" stripped, nothing left
        assert extract_entity_name("프로젝트 진행률") is None
        # "전체" stripped, nothing left
        assert extract_entity_name("전체 진행률") is None

    def test_phase_prefix_stripped(self):
        """'단계' scope word and colon should be stripped"""
        # "단계:" prefix should be removed, leaving "ai 모델 설계/학습"
        result = extract_entity_name("단계: AI 모델 설계/학습 진행율은")
        assert result == "ai 모델 설계/학습"

        # Without colon
        result = extract_entity_name("단계 AI 모델 설계/학습 진행률")
        assert result == "ai 모델 설계/학습"

    def test_only_phase_scope_word_returns_none(self):
        """'단계' alone after stripping returns None"""
        assert extract_entity_name("단계 진행률") is None

    def test_colon_stripped(self):
        """Colons should be stripped from entity name"""
        result = extract_entity_name("단계: 데이터 처리 진행률")
        assert result == "데이터 처리"
        # No leading colon in result
        assert not result.startswith(":")

    def test_slash_in_name_preserved(self):
        """Slash in composite names should be preserved for search"""
        result = extract_entity_name("설계/학습 진행률")
        assert result == "설계/학습"

        result = extract_entity_name("AI 모델 설계/학습 진행률")
        assert result == "ai 모델 설계/학습"


class TestHasProgressSignal:
    """Progress signal detection tests"""

    def test_positive_signals(self):
        assert has_progress_signal("OCR 진행률 알려줘")
        assert has_progress_signal("몇 % 됐어?")
        assert has_progress_signal("몇 퍼센트야")
        assert has_progress_signal("어디까지 했어")

    def test_no_signal(self):
        assert not has_progress_signal("OCR 현황 알려줘")
        assert not has_progress_signal("태스크 목록 보여줘")


# =============================================================================
# Tie-Breaker Tests
# =============================================================================

class TestSelectBestMatch:
    """Tie-breaker logic for multi-match resolution"""

    def test_empty_list(self):
        assert select_best_match([]) is None

    def test_single_match_returned(self):
        """Single match auto-selected regardless of mode"""
        match = {"name": "OCR", "priority": 1, "match_mode": "exact",
                 "status": "IN_PROGRESS", "entity_type": "wbs_item"}
        assert select_best_match([match]) == match

    def test_exact_over_fuzzy(self):
        """Rule 1: Exact match wins over fuzzy"""
        matches = [
            {"name": "OCR 1", "priority": 1, "match_mode": "ilike",
             "status": "IN_PROGRESS", "entity_type": "wbs_item"},
            {"name": "OCR 2", "priority": 1, "match_mode": "exact",
             "status": "IN_PROGRESS", "entity_type": "wbs_item"},
        ]
        best = select_best_match(matches)
        assert best["name"] == "OCR 2"

    def test_priority_item_over_group(self):
        """Rule 2: Lower priority number wins (item=1 > group=2)"""
        matches = [
            {"name": "데이터 처리", "priority": 2, "match_mode": "exact",
             "status": "IN_PROGRESS", "entity_type": "wbs_group"},
            {"name": "데이터 처리", "priority": 1, "match_mode": "exact",
             "status": "IN_PROGRESS", "entity_type": "wbs_item"},
        ]
        best = select_best_match(matches)
        assert best is not None
        assert best["entity_type"] == "wbs_item"
        assert best["priority"] == 1

    def test_active_status_preference(self):
        """Rule 3: IN_PROGRESS preferred over other statuses"""
        matches = [
            {"name": "OCR 평가", "priority": 1, "match_mode": "exact",
             "status": "NOT_STARTED", "entity_type": "wbs_item"},
            {"name": "OCR 평가", "priority": 1, "match_mode": "exact",
             "status": "IN_PROGRESS", "entity_type": "wbs_item"},
        ]
        best = select_best_match(matches)
        assert best["status"] == "IN_PROGRESS"

    def test_context_score_tiebreaker(self):
        """Rule 4: Context score breaks final ties"""
        recent = datetime.now(timezone.utc) - timedelta(days=1)
        old = datetime.now(timezone.utc) - timedelta(days=30)
        matches = [
            {"name": "OCR A", "priority": 1, "match_mode": "exact",
             "status": "IN_PROGRESS", "entity_type": "wbs_item",
             "phase_name": "Phase 1", "active_sprint_connected": True,
             "updated_at": recent.isoformat(), "has_children": True},
            {"name": "OCR B", "priority": 1, "match_mode": "exact",
             "status": "IN_PROGRESS", "entity_type": "wbs_item",
             "phase_name": None, "active_sprint_connected": False,
             "updated_at": old.isoformat(), "has_children": False},
        ]
        best = select_best_match(matches)
        # OCR A has much higher context score
        assert best["name"] == "OCR A"

    def test_phase_over_group(self):
        """Phase (priority=0) should win over group (priority=2)"""
        matches = [
            {"name": "AI 모델 설계/학습", "priority": 2, "match_mode": "exact",
             "status": "IN_PROGRESS", "entity_type": "wbs_group"},
            {"name": "AI 모델 설계/학습", "priority": 0, "match_mode": "exact",
             "status": "IN_PROGRESS", "entity_type": "phase"},
        ]
        best = select_best_match(matches)
        assert best is not None
        assert best["entity_type"] == "phase"
        assert best["priority"] == 0

    def test_progress_aware_override_item_zero_group_has_data(self):
        """Rule 2b: wbs_item with 0% should yield to wbs_group with 79%

        Scenario: "분류 모델 개발" exists as both wbs_item (progress=0)
        and wbs_group (progress=79). The user sees 79% in WBS tree.
        Rule 2 normally picks wbs_item (priority=1), but Rule 2b
        overrides when the winner has empty progress.
        """
        matches = [
            {"name": "분류 모델 개발", "priority": 1, "match_mode": "exact",
             "status": "IN_PROGRESS", "entity_type": "wbs_item",
             "progress": 0, "progress_is_null": False},
            {"name": "분류 모델 개발", "priority": 2, "match_mode": "exact",
             "status": "IN_PROGRESS", "entity_type": "wbs_group",
             "progress": 79, "progress_is_null": False},
        ]
        best = select_best_match(matches)
        assert best is not None
        assert best["entity_type"] == "wbs_group"
        assert best["progress"] == 79

    def test_progress_aware_override_null_vs_data(self):
        """Rule 2b: NULL progress item yields to group with data"""
        matches = [
            {"name": "데이터 처리", "priority": 1, "match_mode": "exact",
             "status": "IN_PROGRESS", "entity_type": "wbs_item",
             "progress": None, "progress_is_null": True},
            {"name": "데이터 처리", "priority": 2, "match_mode": "exact",
             "status": "IN_PROGRESS", "entity_type": "wbs_group",
             "progress": 55, "progress_is_null": False},
        ]
        best = select_best_match(matches)
        assert best is not None
        assert best["entity_type"] == "wbs_group"

    def test_progress_aware_no_override_when_both_have_data(self):
        """Rule 2b: When winner has non-zero progress, normal priority wins"""
        matches = [
            {"name": "분류 모델", "priority": 1, "match_mode": "exact",
             "status": "IN_PROGRESS", "entity_type": "wbs_item",
             "progress": 50, "progress_is_null": False},
            {"name": "분류 모델", "priority": 2, "match_mode": "exact",
             "status": "IN_PROGRESS", "entity_type": "wbs_group",
             "progress": 79, "progress_is_null": False},
        ]
        best = select_best_match(matches)
        assert best is not None
        assert best["entity_type"] == "wbs_item"  # Normal priority wins
        assert best["progress"] == 50

    def test_progress_aware_no_override_ambiguous(self):
        """Rule 2b: Conservative - no override if multiple alternatives have progress"""
        matches = [
            {"name": "OCR", "priority": 1, "match_mode": "exact",
             "status": "IN_PROGRESS", "entity_type": "wbs_item",
             "progress": 0, "progress_is_null": False},
            {"name": "OCR", "priority": 2, "match_mode": "exact",
             "status": "IN_PROGRESS", "entity_type": "wbs_group",
             "progress": 79, "progress_is_null": False},
            {"name": "OCR", "priority": 3, "match_mode": "exact",
             "status": "IN_PROGRESS", "entity_type": "wbs_task",
             "progress": 50, "progress_is_null": False},
        ]
        # Two alternatives with progress → Rule 2b can't pick one
        # Falls back to normal priority winner (conservative)
        best = select_best_match(matches)
        assert best is not None
        assert best["entity_type"] == "wbs_item"
        assert best["priority"] == 1

    def test_disambiguation_when_tied(self):
        """Returns None when no clear winner (disambiguation needed)"""
        matches = [
            {"name": "OCR A", "priority": 1, "match_mode": "exact",
             "status": "IN_PROGRESS", "entity_type": "wbs_item"},
            {"name": "OCR B", "priority": 1, "match_mode": "exact",
             "status": "IN_PROGRESS", "entity_type": "wbs_item"},
        ]
        assert select_best_match(matches) is None


# =============================================================================
# Progress Calculation Integrity Tests (NULL-safe)
# =============================================================================

class TestProgressCalculationIntegrity:
    """Progress calculation should not distort NULL values"""

    def test_all_null_progress_uses_status_based(self):
        """
        When all children have progress=NULL:
        - MUST NOT calculate as 0%
        - MUST use calculation='status_based'
        - MUST set confidence='low'
        - progress should be None
        """
        rows = [
            {"weighted_progress_nonnull": None, "total_weight_nonnull": None,
             "null_progress_count": 5, "total_count": 5, "status": "IN_PROGRESS"},
        ]
        result = calc_weighted_progress(rows)
        assert result["calculation"] == "status_based"
        assert result["confidence"] == "low"
        assert result["progress"] is None  # NOT 0

    def test_partial_null_excludes_from_average(self):
        """
        3/5 children have progress, 2 are NULL:
        - Average calculated from 3 non-NULL only
        - null_ratio = 0.4, confidence = 'low'
        """
        # 3 items: 80*100 + 60*100 + 40*100 = 18000, weight=300
        rows = [
            {"weighted_progress_nonnull": 18000, "total_weight_nonnull": 300,
             "null_progress_count": 2, "total_count": 5, "status": "IN_PROGRESS"},
        ]
        result = calc_weighted_progress(rows)
        assert result["progress"] == 60.0
        assert result["null_ratio"] == 0.4
        assert result["confidence"] == "low"

    def test_all_non_null_high_confidence(self):
        """All children have progress → high confidence"""
        rows = [
            {"weighted_progress_nonnull": 15000, "total_weight_nonnull": 300,
             "null_progress_count": 0, "total_count": 3, "status": "IN_PROGRESS"},
        ]
        result = calc_weighted_progress(rows)
        assert result["progress"] == 50.0
        assert result["null_ratio"] == 0.0
        assert result["confidence"] == "high"

    def test_low_null_ratio_medium_confidence(self):
        """Small null ratio → medium confidence"""
        # 1 out of 5 is NULL → 0.2
        rows = [
            {"weighted_progress_nonnull": 24000, "total_weight_nonnull": 400,
             "null_progress_count": 1, "total_count": 5, "status": "IN_PROGRESS"},
        ]
        result = calc_weighted_progress(rows)
        assert result["confidence"] == "medium"
        assert result["null_ratio"] == 0.2

    def test_empty_rows_returns_none(self):
        """Empty row list → status_based, progress None"""
        result = calc_weighted_progress([])
        assert result["progress"] is None
        assert result["calculation"] == "status_based"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
