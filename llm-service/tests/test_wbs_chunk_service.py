"""
WBS Chunk Service Unit Tests

Tests for WBS entity text generation (group + item) used in RAG vectorization.

Run: pytest tests/test_wbs_chunk_service.py -v
"""

import pytest

from services.entity_chunk_service import EntityTextGenerator


# =============================================================================
# WBS Group Text Generation
# =============================================================================

class TestGenerateWbsGroupStatus:
    """WBS group status text generation tests"""

    def test_basic_group(self):
        """Standard WBS group with all fields"""
        group = {
            "name": "OCR 성능 평가",
            "code": "WG-001",
            "status": "IN_PROGRESS",
            "progress": 65,
            "weight": 100,
            "planned_start_date": "2026-01-01",
            "planned_end_date": "2026-03-31",
            "item_count": 3,
        }
        result = EntityTextGenerator.generate_wbs_group_status(
            group, project_name="AI 프로젝트", phase_name="Phase 1"
        )
        assert "WBS 그룹 현황" in result
        assert "OCR 성능 평가" in result
        assert "AI 프로젝트" in result
        assert "Phase 1" in result
        assert "65%" in result
        assert "WG-001" in result
        assert "3개" in result

    def test_group_null_progress(self):
        """NULL progress should show as '미설정', not '0%' or 'None%'"""
        group = {
            "name": "데이터 처리",
            "code": "WG-002",
            "status": "NOT_STARTED",
            "progress": None,
            "weight": 100,
        }
        result = EntityTextGenerator.generate_wbs_group_status(group)
        assert "미설정" in result
        assert "None%" not in result

    def test_group_zero_progress(self):
        """Zero progress should show '0%'"""
        group = {
            "name": "분류 모델 개발",
            "code": "WG-003",
            "status": "IN_PROGRESS",
            "progress": 0,
        }
        result = EntityTextGenerator.generate_wbs_group_status(group)
        assert "0%" in result

    def test_group_with_description(self):
        """Description should be included (truncated to 300 chars)"""
        group = {
            "name": "테스트 그룹",
            "code": "WG-004",
            "status": "IN_PROGRESS",
            "progress": 50,
            "description": "A" * 500,
        }
        result = EntityTextGenerator.generate_wbs_group_status(group)
        assert "설명:" in result
        # Verify truncation: 300 chars + "설명: " prefix
        assert "A" * 300 in result
        assert "A" * 301 not in result

    def test_group_no_optional_fields(self):
        """Missing optional fields should not crash"""
        group = {
            "name": "최소 그룹",
            "code": "WG-005",
            "status": "NOT_STARTED",
        }
        result = EntityTextGenerator.generate_wbs_group_status(group)
        assert "WBS 그룹 현황" in result
        assert "최소 그룹" in result

    def test_group_search_keywords_present(self):
        """Generated text should contain search-relevant keywords"""
        group = {
            "name": "요구사항 분석",
            "code": "WG-010",
            "status": "IN_PROGRESS",
            "progress": 40,
        }
        result = EntityTextGenerator.generate_wbs_group_status(group)
        # Keywords that RAG vector search should match
        assert "WBS" in result
        assert "그룹" in result
        assert "상태" in result
        assert "진행률" in result


# =============================================================================
# WBS Item Text Generation
# =============================================================================

class TestGenerateWbsItemStatus:
    """WBS item status text generation tests"""

    def test_basic_item(self):
        """Standard WBS item with all fields"""
        item = {
            "name": "분류 모델 개발",
            "code": "WI-001",
            "status": "IN_PROGRESS",
            "progress": 79,
            "weight": 100,
            "planned_start_date": "2026-01-15",
            "planned_end_date": "2026-02-28",
            "estimated_hours": 120,
            "actual_hours": 80,
            "task_count": 5,
        }
        result = EntityTextGenerator.generate_wbs_item_status(
            item,
            project_name="AI 프로젝트",
            group_name="OCR 성능 평가",
            phase_name="Phase 1",
        )
        assert "WBS 항목 현황" in result
        assert "분류 모델 개발" in result
        assert "AI 프로젝트" in result
        assert "OCR 성능 평가" in result
        assert "Phase 1" in result
        assert "79%" in result
        assert "WI-001" in result
        assert "120시간" in result
        assert "80시간" in result
        assert "5개" in result

    def test_item_null_progress(self):
        """NULL progress should show as '미설정'"""
        item = {
            "name": "UI 설계",
            "code": "WI-002",
            "status": "NOT_STARTED",
            "progress": None,
        }
        result = EntityTextGenerator.generate_wbs_item_status(item)
        assert "미설정" in result
        assert "None%" not in result

    def test_item_with_description(self):
        """Description should be included"""
        item = {
            "name": "데이터 전처리",
            "code": "WI-003",
            "status": "IN_PROGRESS",
            "progress": 30,
            "description": "OCR 엔진 결과물에 대한 데이터 전처리 및 정제 작업",
        }
        result = EntityTextGenerator.generate_wbs_item_status(item)
        assert "데이터 전처리 및 정제 작업" in result

    def test_item_no_optional_fields(self):
        """Missing optional fields should not crash"""
        item = {
            "name": "최소 항목",
            "code": "WI-004",
            "status": "NOT_STARTED",
        }
        result = EntityTextGenerator.generate_wbs_item_status(item)
        assert "WBS 항목 현황" in result
        assert "최소 항목" in result
        # estimated_hours, actual_hours, task_count should not appear
        assert "예상 공수" not in result
        assert "실제 공수" not in result
        assert "하위 태스크" not in result

    def test_item_zero_hours(self):
        """Zero hours should still be displayed"""
        item = {
            "name": "테스트 항목",
            "code": "WI-005",
            "status": "IN_PROGRESS",
            "progress": 10,
            "estimated_hours": 0,
            "actual_hours": 0,
        }
        result = EntityTextGenerator.generate_wbs_item_status(item)
        assert "예상 공수: 0시간" in result
        assert "실제 공수: 0시간" in result

    def test_item_search_keywords_present(self):
        """Generated text should contain search-relevant keywords"""
        item = {
            "name": "AI 모델 설계/학습",
            "code": "WI-010",
            "status": "IN_PROGRESS",
            "progress": 55,
        }
        result = EntityTextGenerator.generate_wbs_item_status(item)
        assert "WBS" in result
        assert "항목" in result
        assert "상태" in result
        assert "진행률" in result


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
