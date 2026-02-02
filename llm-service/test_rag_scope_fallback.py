"""
Tests for RAG scope decision and 2-pass fallback logic.

Tests:
1. Scope decision for HOWTO_POLICY queries
2. Fallback trigger conditions
3. Result merge with doc_id-based deduplication
"""

import pytest
from chat_workflow_v2 import (
    decide_search_project_id_for_howto,
    should_fallback_to_global,
    merge_results_project_first,
    max_relevance_score,
    _contains_any,
    DOC_SEEK_KEYWORDS,
    PROJECT_FORCE_KEYWORDS,
    GENERAL_HOWTO_KEYWORDS,
)


def mk_chunk(doc_id: str, score: float, chunk_id: str = None):
    """Helper to create a test RAG chunk"""
    return {
        "chunk_id": chunk_id or f"c_{doc_id}",
        "content": f"test content for {doc_id}",
        "metadata": {
            "doc_id": doc_id,
            "project_id": "proj-001",
            "access_level": 2,
            "title": f"Title {doc_id}",
            "doc_title": f"Doc Title {doc_id}",
            "chunk_index": 0,
            "structure_type": "text",
            "has_table": False,
            "has_list": False,
            "category": "general",
            "file_path": f"/docs/{doc_id}.md",
            "part_id": "part-1",
        },
        "distance": 1.0 - score,
        "relevance_score": score,
    }


class TestContainsAny:
    """Test _contains_any helper"""

    def test_contains_keyword(self):
        assert _contains_any("플래닝 포커가 뭐야?", GENERAL_HOWTO_KEYWORDS) is True

    def test_not_contains_keyword(self):
        assert _contains_any("프로젝트 진행 현황", GENERAL_HOWTO_KEYWORDS) is False

    def test_empty_text(self):
        assert _contains_any("", GENERAL_HOWTO_KEYWORDS) is False

    def test_none_text(self):
        assert _contains_any(None, GENERAL_HOWTO_KEYWORDS) is False


class TestScopeDecision:
    """Test decide_search_project_id_for_howto"""

    def test_general_concept_goes_global(self):
        """General concept questions should search globally"""
        pid = decide_search_project_id_for_howto(
            query="플래닝 포커가 뭐야?",
            project_id="proj-001",
        )
        assert pid is None

    def test_definition_question_goes_global(self):
        """Definition questions should search globally"""
        pid = decide_search_project_id_for_howto(
            query="리스크 관리가 뭐야?",
            project_id="proj-001",
        )
        assert pid is None

    def test_explanation_request_goes_global(self):
        """Explanation requests should search globally"""
        pid = decide_search_project_id_for_howto(
            query="스크럼 방법론 설명해줘",
            project_id="proj-001",
        )
        assert pid is None

    def test_project_doc_stays_project(self):
        """Project document requests should stay project-scoped"""
        pid = decide_search_project_id_for_howto(
            query="이 프로젝트 리스크 관리 문서 보여줘",
            project_id="proj-001",
        )
        assert pid == "proj-001"

    def test_doc_seek_stays_project(self):
        """Document search keywords should stay project-scoped"""
        pid = decide_search_project_id_for_howto(
            query="가이드 문서 찾아줘",
            project_id="proj-001",
        )
        assert pid == "proj-001"

    def test_project_id_in_query_stays_project(self):
        """Query containing project_id should stay project-scoped"""
        pid = decide_search_project_id_for_howto(
            query="proj-001의 정책 문서",
            project_id="proj-001",
        )
        assert pid == "proj-001"

    def test_empty_query_goes_global(self):
        """Empty query should go global for better recall"""
        pid = decide_search_project_id_for_howto(
            query="",
            project_id="proj-001",
        )
        assert pid is None

    def test_ambiguous_query_goes_global(self):
        """Ambiguous query without clear signals should go global"""
        pid = decide_search_project_id_for_howto(
            query="애자일",
            project_id="proj-001",
        )
        assert pid is None


class TestMaxRelevanceScore:
    """Test max_relevance_score helper"""

    def test_empty_results(self):
        assert max_relevance_score([]) == 0.0

    def test_none_results(self):
        assert max_relevance_score(None) == 0.0

    def test_single_result(self):
        results = [mk_chunk("D1", 0.5)]
        assert max_relevance_score(results) == 0.5

    def test_multiple_results(self):
        results = [mk_chunk("D1", 0.3), mk_chunk("D2", 0.5), mk_chunk("D3", 0.2)]
        assert max_relevance_score(results) == 0.5


class TestFallbackDecision:
    """Test should_fallback_to_global"""

    def test_fallback_when_empty_results(self):
        """Should fallback when no results"""
        assert should_fallback_to_global(
            primary_project_id="proj-001",
            results=[],
            min_results=1,
            min_max_score=0.01,
        ) is True

    def test_fallback_when_none_results(self):
        """Should fallback when results is None"""
        assert should_fallback_to_global(
            primary_project_id="proj-001",
            results=None,
            min_results=1,
            min_max_score=0.01,
        ) is True

    def test_fallback_when_low_score(self):
        """Should fallback when max score is too low (noise)"""
        results = [mk_chunk("D1", 0.005)]
        assert should_fallback_to_global(
            primary_project_id="proj-001",
            results=results,
            min_results=1,
            min_max_score=0.01,
        ) is True

    def test_no_fallback_when_good_score(self):
        """Should NOT fallback when score is good"""
        results = [mk_chunk("D1", 0.02)]
        assert should_fallback_to_global(
            primary_project_id="proj-001",
            results=results,
            min_results=1,
            min_max_score=0.01,
        ) is False

    def test_no_fallback_when_already_global(self):
        """Should NOT fallback when already global (primary_project_id is None)"""
        assert should_fallback_to_global(
            primary_project_id=None,
            results=[],
            min_results=1,
            min_max_score=0.01,
        ) is False

    def test_fallback_when_below_min_results(self):
        """Should fallback when results count is below minimum"""
        results = [mk_chunk("D1", 0.5)]
        assert should_fallback_to_global(
            primary_project_id="proj-001",
            results=results,
            min_results=2,  # Requires 2 results
            min_max_score=0.01,
        ) is True


class TestMergeResults:
    """Test merge_results_project_first"""

    def test_dedupe_by_doc_id(self):
        """Should deduplicate by metadata.doc_id, project results first"""
        proj = [mk_chunk("D1", 0.03), mk_chunk("D2", 0.02)]
        glob = [mk_chunk("D2", 0.04), mk_chunk("D3", 0.01)]  # D2 is duplicate
        merged = merge_results_project_first(proj, glob)

        doc_ids = [m["metadata"]["doc_id"] for m in merged]
        assert doc_ids == ["D1", "D2", "D3"]  # D2 from project kept, global D2 skipped

    def test_project_results_first(self):
        """Project results should come before global results"""
        proj = [mk_chunk("D1", 0.01)]
        glob = [mk_chunk("D2", 0.05)]  # Higher score but should come after
        merged = merge_results_project_first(proj, glob)

        doc_ids = [m["metadata"]["doc_id"] for m in merged]
        assert doc_ids == ["D1", "D2"]  # Project first, then global

    def test_empty_project_results(self):
        """Should work with empty project results"""
        proj = []
        glob = [mk_chunk("D1", 0.05), mk_chunk("D2", 0.03)]
        merged = merge_results_project_first(proj, glob)

        doc_ids = [m["metadata"]["doc_id"] for m in merged]
        assert doc_ids == ["D1", "D2"]

    def test_empty_global_results(self):
        """Should work with empty global results"""
        proj = [mk_chunk("D1", 0.05), mk_chunk("D2", 0.03)]
        glob = []
        merged = merge_results_project_first(proj, glob)

        doc_ids = [m["metadata"]["doc_id"] for m in merged]
        assert doc_ids == ["D1", "D2"]

    def test_both_empty(self):
        """Should return empty list when both are empty"""
        merged = merge_results_project_first([], [])
        assert merged == []

    def test_none_inputs(self):
        """Should handle None inputs gracefully"""
        merged = merge_results_project_first(None, None)
        assert merged == []

    def test_fallback_to_chunk_id(self):
        """Should use chunk_id for dedupe when doc_id is missing"""
        proj = [{"chunk_id": "c1", "content": "x", "metadata": {}, "relevance_score": 0.5}]
        glob = [{"chunk_id": "c1", "content": "y", "metadata": {}, "relevance_score": 0.6}]  # Same chunk_id
        merged = merge_results_project_first(proj, glob)

        assert len(merged) == 1
        assert merged[0]["content"] == "x"  # Project version kept


class TestKeywordCoverage:
    """Test keyword coverage for real-world queries"""

    @pytest.mark.parametrize("query,expected_global", [
        # General concept questions -> global (None)
        ("플래닝 포커가 뭐야?", True),
        ("스크럼이란 무엇인가요?", True),
        ("번다운 차트 설명해줘", True),
        ("애자일과 워터폴의 차이점", True),
        ("리스크 관리의 개념", True),
        # Document search -> project
        ("이 프로젝트 가이드 문서 보여줘", False),
        ("정책 문서 어디 있어?", False),
        ("템플릿 파일 찾아줘", False),
        ("우리 프로젝트 위키", False),
    ])
    def test_query_scope_decision(self, query: str, expected_global: bool):
        pid = decide_search_project_id_for_howto(query, "proj-001")
        if expected_global:
            assert pid is None, f"Expected global for: {query}"
        else:
            assert pid == "proj-001", f"Expected project for: {query}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
