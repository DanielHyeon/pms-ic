"""
Unit tests for Korean Query Normalizer.

Tests all 3 layers:
- Layer 1: Jamo decomposition + fuzzy matching
- Layer 2: PM-domain typo dictionary
- Layer 3: LLM normalization (mocked)

Run: pytest tests/test_korean_normalizer.py -v
"""

import pytest
from unittest.mock import MagicMock, patch

from utils.korean_normalizer import (
    decompose_korean,
    jamo_similarity,
    fuzzy_keyword_in_query,
    apply_typo_corrections,
    normalize_query,
    normalize_query_with_llm,
    has_korean,
    KOREAN_TYPO_MAP,
)


# =============================================================================
# Layer 1: Jamo Decomposition Tests
# =============================================================================

class TestJamoDecomposition:
    """Test Korean jamo decomposition"""

    def test_basic_korean(self):
        # "한" = ㅎ + ㅏ + ㄴ
        result = decompose_korean("한")
        assert result == ['ㅎ', 'ㅏ', 'ㄴ']

    def test_no_jongseong(self):
        # "하" = ㅎ + ㅏ (no final consonant)
        result = decompose_korean("하")
        assert result == ['ㅎ', 'ㅏ']

    def test_multi_syllable(self):
        # "테스트" = ㅌㅔ + ㅅㅡ + ㅌㅡ
        result = decompose_korean("테스트")
        assert result == ['ㅌ', 'ㅔ', 'ㅅ', 'ㅡ', 'ㅌ', 'ㅡ']

    def test_english_passthrough(self):
        result = decompose_korean("task")
        assert result == ['t', 'a', 's', 'k']

    def test_mixed_text(self):
        result = decompose_korean("AB한")
        assert result == ['A', 'B', 'ㅎ', 'ㅏ', 'ㄴ']

    def test_empty_string(self):
        assert decompose_korean("") == []

    def test_spaces_preserved(self):
        result = decompose_korean("테스트 중")
        assert ' ' in result


# =============================================================================
# Layer 1: Jamo Similarity Tests
# =============================================================================

class TestJamoSimilarity:
    """Test jamo-level similarity computation"""

    def test_identical_strings(self):
        assert jamo_similarity("테스트", "테스트") == 1.0

    def test_typo_high_similarity(self):
        # "테트트" vs "테스트" - differ in one consonant (ㅅ vs ㅌ)
        sim = jamo_similarity("테스트", "테트트")
        assert sim >= 0.6, f"Expected >= 0.6, got {sim}"

    def test_completely_different(self):
        sim = jamo_similarity("테스트", "프로젝트")
        assert sim < 0.5, f"Expected < 0.5, got {sim}"

    def test_empty_strings(self):
        assert jamo_similarity("", "테스트") == 0.0
        assert jamo_similarity("테스트", "") == 0.0
        assert jamo_similarity("", "") == 0.0

    def test_english_similarity(self):
        assert jamo_similarity("task", "task") == 1.0
        sim = jamo_similarity("task", "taks")
        assert sim >= 0.5

    def test_korean_english_low_similarity(self):
        sim = jamo_similarity("테스트", "test")
        assert sim < 0.5

    def test_sprint_typo(self):
        sim = jamo_similarity("스프린트", "스프런트")
        assert sim >= 0.7, f"Expected >= 0.7, got {sim}"

    def test_backlog_typo(self):
        sim = jamo_similarity("백로그", "백러그")
        assert sim >= 0.7, f"Expected >= 0.7, got {sim}"


# =============================================================================
# Layer 1: Fuzzy Keyword Matching Tests
# =============================================================================

class TestFuzzyKeywordMatch:
    """Test fuzzy keyword matching in queries"""

    def test_exact_match(self):
        assert fuzzy_keyword_in_query("테스트 중", "현재 테스트 중인 task는?")

    def test_typo_match(self):
        assert fuzzy_keyword_in_query("테스트 중", "현재 테트트 중인 task는?")

    def test_no_match_different_word(self):
        assert not fuzzy_keyword_in_query("테스트 중", "프로젝트 현황 알려줘")

    def test_exact_english_match(self):
        assert fuzzy_keyword_in_query("task", "이번 주 task 뭐있어?")

    def test_english_typo_match_via_dict(self):
        # English typo "taks" has 0.75 jamo similarity (below 0.82 threshold),
        # but Layer 2 typo dict corrects it first.
        corrected = apply_typo_corrections("이번 주 taks 뭐있어?")
        assert fuzzy_keyword_in_query("task", corrected)

    def test_empty_keyword(self):
        assert not fuzzy_keyword_in_query("", "some query")

    def test_empty_query(self):
        assert not fuzzy_keyword_in_query("keyword", "")

    def test_keyword_longer_than_query(self):
        assert not fuzzy_keyword_in_query("very long keyword", "short")

    def test_sprint_typo_in_query(self):
        assert fuzzy_keyword_in_query("스프린트", "스프런트 진행 상황")

    def test_backlog_typo_in_query(self):
        assert fuzzy_keyword_in_query("백로그", "백러그 보여줘")

    def test_risk_typo_in_query_via_dict(self):
        # "리스거" has only 67% jamo similarity to "리스크" (below 0.75 threshold),
        # but Layer 2 typo dict corrects it first, so the combined flow works.
        corrected = apply_typo_corrections("리스거 분석")
        assert fuzzy_keyword_in_query("리스크", corrected)

    def test_no_false_positive_shared_prefix(self):
        # "진행 상" should NOT match "진행 중" (shared prefix, different meaning)
        assert not fuzzy_keyword_in_query("진행 중", "진행 상황 알려줘")

    def test_threshold_respected(self):
        # With very high threshold, typos should NOT match
        assert not fuzzy_keyword_in_query("테스트", "프로젝트", threshold=0.95)

    def test_exact_always_matches_regardless_of_threshold(self):
        assert fuzzy_keyword_in_query("테스트", "테스트 중", threshold=0.99)


# =============================================================================
# Layer 2: Typo Dictionary Tests
# =============================================================================

class TestTypoDictionary:
    """Test PM-domain typo dictionary corrections"""

    def test_known_typo_correction(self):
        assert apply_typo_corrections("테트트 중인") == "테스트 중인"

    def test_sprint_typo(self):
        assert apply_typo_corrections("스프런트 진행") == "스프린트 진행"

    def test_backlog_typo(self):
        assert apply_typo_corrections("백러그 보여줘") == "백로그 보여줘"

    def test_risk_typo(self):
        assert apply_typo_corrections("리스거 분석") == "리스크 분석"

    def test_no_change_for_correct_text(self):
        correct = "테스트 중인 task는?"
        assert apply_typo_corrections(correct) == correct

    def test_multiple_typos_in_one_query(self):
        result = apply_typo_corrections("스프런트에서 테트트 중인 테스크")
        assert "스프린트" in result
        assert "테스트" in result
        assert "태스크" in result

    def test_english_typo(self):
        assert apply_typo_corrections("taks 보여줘") == "task 보여줘"

    def test_project_typo(self):
        assert apply_typo_corrections("프로잭트 현황") == "프로젝트 현황"

    def test_review_typo(self):
        assert apply_typo_corrections("검코 중인 건") == "검토 중인 건"


# =============================================================================
# Combined Normalization Tests
# =============================================================================

class TestNormalizeQuery:
    """Test combined Layer 1+2 normalization"""

    def test_returns_corrected_query(self):
        result = normalize_query("테트트 중인 task")
        assert result == "테스트 중인 task"

    def test_empty_input(self):
        assert normalize_query("") == ""

    def test_none_input(self):
        assert normalize_query(None) is None

    def test_correct_input_unchanged(self):
        original = "테스트 중인 task는?"
        assert normalize_query(original) == original


# =============================================================================
# Layer 3: LLM Normalization Tests (Mocked)
# =============================================================================

class TestLLMNormalization:
    """Test LLM-based normalization with mocked LLM"""

    def test_successful_normalization(self):
        mock_llm = MagicMock()
        mock_llm.return_value = {
            "choices": [{"text": "테스트 중인 task는?"}]
        }

        result = normalize_query_with_llm(mock_llm, "테트트 중인 task는?")
        assert result == "테스트 중인 task는?"
        mock_llm.assert_called_once()

    def test_none_llm(self):
        result = normalize_query_with_llm(None, "some query")
        assert result is None

    def test_empty_query(self):
        mock_llm = MagicMock()
        result = normalize_query_with_llm(mock_llm, "")
        assert result is None

    def test_llm_failure_returns_none(self):
        mock_llm = MagicMock(side_effect=Exception("LLM error"))
        result = normalize_query_with_llm(mock_llm, "테트트 중인 task")
        assert result is None

    def test_llm_empty_response(self):
        mock_llm = MagicMock()
        mock_llm.return_value = {"choices": [{"text": ""}]}
        result = normalize_query_with_llm(mock_llm, "테트트")
        assert result is None

    def test_llm_response_too_long_rejected(self):
        mock_llm = MagicMock()
        mock_llm.return_value = {
            "choices": [{"text": "x" * 1000}]
        }
        result = normalize_query_with_llm(mock_llm, "짧은 쿼리")
        assert result is None

    def test_caching_avoids_duplicate_calls(self):
        mock_llm = MagicMock()
        mock_llm.return_value = {
            "choices": [{"text": "테스트 중인 task"}]
        }

        # First call
        result1 = normalize_query_with_llm(mock_llm, "테트트 중인 task")
        # Second call with same query (should hit cache)
        result2 = normalize_query_with_llm(mock_llm, "테트트 중인 task")

        assert result1 == result2
        # LLM should only be called once (second call hits cache)
        assert mock_llm.call_count == 1


# =============================================================================
# Utility Tests
# =============================================================================

class TestHasKorean:
    """Test Korean detection utility"""

    def test_korean_text(self):
        assert has_korean("테스트")

    def test_english_text(self):
        assert not has_korean("test query")

    def test_mixed_text(self):
        assert has_korean("test 중인 task")

    def test_empty_text(self):
        assert not has_korean("")
