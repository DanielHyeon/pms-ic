"""
P0 Test Suite: Intent Routing & Handler Implementation

These tests verify:
1. Priority-based intent classification
2. Handler routing
3. Response rendering with distinct headers
4. Graceful degradation with error_code

Run: pytest tests/test_p0_intent_routing.py -v
"""

import pytest
from unittest.mock import patch, MagicMock

# Import modules under test
from classifiers.answer_type_classifier import (
    AnswerTypeClassifier, AnswerType, get_answer_type_classifier
)
from contracts.response_contract import ResponseContract, ErrorCode
from contracts.response_renderer import render
from workflows.intent_handlers import (
    get_handler, has_dedicated_handler, HandlerContext, INTENT_HANDLERS
)


# =============================================================================
# Classifier Tests
# =============================================================================

class TestPriority1Intents:
    """Priority 1 intents should win over STATUS_*"""

    @pytest.fixture
    def classifier(self):
        return AnswerTypeClassifier()

    def test_backlog_list(self, classifier):
        """Backlog queries should be BACKLOG_LIST"""
        cases = [
            "백로그에 뭐가 있어?",
            "제품 백로그 보여줘",
            "백로그 항목 알려줘",
        ]
        for msg in cases:
            result = classifier.classify(msg)
            assert result.answer_type == AnswerType.BACKLOG_LIST, \
                f"Expected BACKLOG_LIST for '{msg}', got {result.answer_type}"

    def test_risk_analysis(self, classifier):
        """Risk queries should be RISK_ANALYSIS"""
        cases = [
            "리스크 분석해줘",
            "현재 위험 요소가 뭐야",
            "프로젝트 리스크 알려줘",
        ]
        for msg in cases:
            result = classifier.classify(msg)
            assert result.answer_type == AnswerType.RISK_ANALYSIS, \
                f"Expected RISK_ANALYSIS for '{msg}', got {result.answer_type}"

    def test_sprint_progress(self, classifier):
        """Sprint progress queries should be SPRINT_PROGRESS"""
        cases = [
            "현재 스프린트 진행 상황",
            "스프린트 진척률 알려줘",
            "스프린트 현황 보여줘",
        ]
        for msg in cases:
            result = classifier.classify(msg)
            assert result.answer_type == AnswerType.SPRINT_PROGRESS, \
                f"Expected SPRINT_PROGRESS for '{msg}', got {result.answer_type}"

    def test_task_due_this_week(self, classifier):
        """This week task queries should be TASK_DUE_THIS_WEEK"""
        cases = [
            "이번 주 마감 태스크",
            "이번주 해야 할 일",
            "금주 완료해야 할 작업",
        ]
        for msg in cases:
            result = classifier.classify(msg)
            assert result.answer_type == AnswerType.TASK_DUE_THIS_WEEK, \
                f"Expected TASK_DUE_THIS_WEEK for '{msg}', got {result.answer_type}"


class TestStatusListNotBlackHole:
    """STATUS_LIST should NOT absorb all list queries"""

    @pytest.fixture
    def classifier(self):
        return AnswerTypeClassifier()

    def test_backlog_with_list_keyword(self, classifier):
        """'백로그 목록' should be BACKLOG_LIST, not STATUS_LIST"""
        result = classifier.classify("백로그 목록 보여줘")
        assert result.answer_type == AnswerType.BACKLOG_LIST, \
            f"Expected BACKLOG_LIST, got {result.answer_type}"

    def test_risk_with_list_keyword(self, classifier):
        """'리스크 목록' should be RISK_ANALYSIS"""
        result = classifier.classify("리스크 목록")
        assert result.answer_type == AnswerType.RISK_ANALYSIS, \
            f"Expected RISK_ANALYSIS, got {result.answer_type}"


class TestFallbackIsNotStatus:
    """Unknown intents should NOT fall back to STATUS_METRIC"""

    @pytest.fixture
    def classifier(self):
        return AnswerTypeClassifier()

    def test_ambiguous_question(self, classifier):
        """Ambiguous questions should be UNKNOWN, not STATUS_METRIC"""
        cases = [
            "이거 어떻게 생각해?",
            "그냥 궁금해서",
            "뭐라고 해야 하지",
        ]
        for msg in cases:
            result = classifier.classify(msg)
            # Must be UNKNOWN, NOT STATUS_METRIC
            assert result.answer_type != AnswerType.STATUS_METRIC, \
                f"'{msg}' should NOT be STATUS_METRIC, got {result.answer_type}"


class TestCasualShortOnly:
    """CASUAL should only match short messages"""

    @pytest.fixture
    def classifier(self):
        return AnswerTypeClassifier()

    def test_short_greeting(self, classifier):
        """Short greeting should be CASUAL"""
        result = classifier.classify("안녕")
        assert result.answer_type == AnswerType.CASUAL

    def test_long_with_greeting(self, classifier):
        """Long message with greeting should NOT be CASUAL"""
        result = classifier.classify("안녕하세요 프로젝트 현황 알려주세요")
        assert result.answer_type != AnswerType.CASUAL


# =============================================================================
# Handler Registry Tests
# =============================================================================

class TestHandlerRegistry:
    """Handler registry must use lowercase keys only"""

    def test_lowercase_keys_work(self):
        """Lowercase keys should return handlers"""
        assert get_handler("backlog_list") is not None
        assert get_handler("sprint_progress") is not None
        assert get_handler("task_due_this_week") is not None
        assert get_handler("risk_analysis") is not None
        assert get_handler("casual") is not None
        assert get_handler("unknown") is not None

    def test_uppercase_keys_return_none(self):
        """STRICT MODE: Uppercase keys must return None"""
        assert get_handler("BACKLOG_LIST") is None
        assert get_handler("SPRINT_PROGRESS") is None
        assert get_handler("Backlog_List") is None

    def test_status_not_in_handlers(self):
        """STATUS_* must NOT be in INTENT_HANDLERS"""
        assert not has_dedicated_handler("status_metric")
        assert not has_dedicated_handler("status_list")


# =============================================================================
# Renderer Tests (Header Differentiation)
# =============================================================================

class TestIntentHeaders:
    """Each intent must have a distinct header - REGRESSION TEST"""

    def test_backlog_header_not_status(self):
        """CRITICAL: Backlog must NOT have Project Status header"""
        contract = ResponseContract(
            intent="backlog_list",
            reference_time="2026-02-04 14:30 KST",
            scope="Project: Test",
            data={"items": [], "count": 0},
        )
        result = render(contract)

        assert "📋 **제품 백로그**" in result
        # REGRESSION CHECK: Must NOT have status header
        assert "📊 **Project Status**" not in result, \
            "REGRESSION: Status header in backlog response!"

    def test_sprint_header_not_status(self):
        """CRITICAL: Sprint must NOT have Project Status header"""
        contract = ResponseContract(
            intent="sprint_progress",
            reference_time="2026-02-04 14:30 KST",
            scope="Project: Test",
            data={"sprint": None, "stories": [], "metrics": {}},
        )
        result = render(contract)

        assert "🏃 **스프린트 진행 현황**" in result
        assert "📊 **Project Status**" not in result, \
            "REGRESSION: Status header in sprint response!"

    def test_task_header_not_status(self):
        """CRITICAL: Task must NOT have Project Status header"""
        contract = ResponseContract(
            intent="task_due_this_week",
            reference_time="2026-02-04 14:30 KST",
            scope="Project: Test",
            data={"tasks": [], "count": 0},
        )
        result = render(contract)

        assert "📅 **이번 주 마감 태스크**" in result
        assert "📊 **Project Status**" not in result, \
            "REGRESSION: Status header in task response!"

    def test_risk_header_not_status(self):
        """CRITICAL: Risk must NOT have Project Status header"""
        contract = ResponseContract(
            intent="risk_analysis",
            reference_time="2026-02-04 14:30 KST",
            scope="Project: Test",
            data={"risks": [], "count": 0, "by_severity": {}},
        )
        result = render(contract)

        assert "⚠️ **리스크 분석**" in result
        assert "📊 **Project Status**" not in result, \
            "REGRESSION: Status header in risk response!"


class TestGracefulDegradation:
    """Renderer should handle error cases gracefully using error_code"""

    def test_error_response_uses_error_code(self):
        """Error contract should use error_code field"""
        contract = ResponseContract(
            intent="backlog_list",
            reference_time="2026-02-04 14:30 KST",
            scope="Project: Test",
            data={},
            warnings=["Data retrieval failed: Connection timeout"],
            tips=["Contact administrator"],
            error_code=ErrorCode.DB_QUERY_FAILED,
        )

        # Verify error detection works via error_code
        assert contract.has_error()

        result = render(contract)
        assert "⚠️" in result
        assert "Data retrieval failed" in result

    def test_non_error_contract_has_no_error(self):
        """Contract without error_code should not be detected as error"""
        contract = ResponseContract(
            intent="backlog_list",
            reference_time="2026-02-04 14:30 KST",
            scope="Project: Test",
            data={"items": [{"title": "Test"}], "count": 1},
        )

        assert not contract.has_error()


# =============================================================================
# Response Contract Tests
# =============================================================================

class TestResponseContract:
    """ResponseContract validation"""

    def test_has_data_with_items(self):
        """has_data should return True when items exist"""
        contract = ResponseContract(
            intent="backlog_list",
            reference_time="2026-02-04 14:30 KST",
            scope="Project: Test",
            data={"items": [{"title": "Test"}], "count": 1},
        )
        assert contract.has_data()

    def test_has_data_empty(self):
        """has_data should return False when empty"""
        contract = ResponseContract(
            intent="backlog_list",
            reference_time="2026-02-04 14:30 KST",
            scope="Project: Test",
            data={"items": [], "count": 0},
        )
        assert not contract.has_data()

    def test_error_code_detection(self):
        """has_error should detect error_code"""
        contract = ResponseContract(
            intent="backlog_list",
            reference_time="2026-02-04 14:30 KST",
            scope="Project: Test",
            data={},
            error_code=ErrorCode.DB_QUERY_FAILED,
        )
        assert contract.has_error()
        assert not contract.has_data()


# =============================================================================
# Intent Value Tests
# =============================================================================

class TestIntentValues:
    """AnswerType values must be lowercase snake_case"""

    def test_all_values_lowercase(self):
        """All AnswerType values must be lowercase"""
        for answer_type in AnswerType:
            assert answer_type.value == answer_type.value.lower(), \
                f"AnswerType.{answer_type.name} value must be lowercase: {answer_type.value}"

    def test_all_values_snake_case(self):
        """All AnswerType values must be snake_case"""
        import re
        snake_case_pattern = re.compile(r'^[a-z]+(_[a-z]+)*$')
        for answer_type in AnswerType:
            assert snake_case_pattern.match(answer_type.value), \
                f"AnswerType.{answer_type.name} value must be snake_case: {answer_type.value}"


# =============================================================================
# Phase 1: Kanban Classification Fix Tests
# =============================================================================

class TestKanbanClassificationFixes:
    """Regression tests for Kanban board classification fixes (Phase 1)"""

    @pytest.fixture
    def classifier(self):
        return AnswerTypeClassifier()

    def test_backlog_리스트_not_risk(self, classifier):
        """'백로그 항목 리스트' should be BACKLOG_LIST, not RISK_ANALYSIS"""
        result = classifier.classify("백로그 항목 리스트")
        assert result.answer_type == AnswerType.BACKLOG_LIST, \
            f"Expected BACKLOG_LIST, got {result.answer_type}"

    def test_not_in_sprint_is_backlog(self, classifier):
        """Negation: items NOT in sprint should be BACKLOG_LIST"""
        cases = [
            "아직 스프린트에 안들어간 스토리들 뭐 있어?",
            "스프린트에 못 들어간 항목 보여줘",
            "미배정 스토리 뭐 있어",
        ]
        for msg in cases:
            result = classifier.classify(msg)
            assert result.answer_type == AnswerType.BACKLOG_LIST, \
                f"Expected BACKLOG_LIST for '{msg}', got {result.answer_type}"

    def test_not_started_in_sprint(self, classifier):
        """Tasks not started in sprint should be SPRINT_PROGRESS"""
        result = classifier.classify("이번 스프린트에서 아직 시작 안한 태스크가 뭐야?")
        assert result.answer_type == AnswerType.SPRINT_PROGRESS, \
            f"Expected SPRINT_PROGRESS, got {result.answer_type}"

    def test_작업중_tasks(self, classifier):
        """'작업 중인 태스크 목록' should be TASKS_BY_STATUS"""
        result = classifier.classify("지금 작업 중인 태스크 목록")
        assert result.answer_type == AnswerType.TASKS_BY_STATUS, \
            f"Expected TASKS_BY_STATUS, got {result.answer_type}"

    def test_REVIEW_status_tasks(self, classifier):
        """'REVIEW 상태인 태스크' should be TASKS_BY_STATUS"""
        result = classifier.classify("REVIEW 상태인 태스크")
        assert result.answer_type == AnswerType.TASKS_BY_STATUS, \
            f"Expected TASKS_BY_STATUS, got {result.answer_type}"

    def test_QA_tasks(self, classifier):
        """'QA 중인 작업들' should be TASKS_BY_STATUS"""
        result = classifier.classify("QA 중인 작업들 보여줘")
        assert result.answer_type == AnswerType.TASKS_BY_STATUS, \
            f"Expected TASKS_BY_STATUS, got {result.answer_type}"

    def test_코드리뷰_tasks(self, classifier):
        """'코드 리뷰 중인 태스크' should be TASKS_BY_STATUS"""
        result = classifier.classify("코드 리뷰 중인 태스크 뭐 있어?")
        assert result.answer_type == AnswerType.TASKS_BY_STATUS, \
            f"Expected TASKS_BY_STATUS, got {result.answer_type}"

    def test_코드리뷰_것은(self, classifier):
        """REGRESSION: '코드 리뷰 중인 것은' should be TASKS_BY_STATUS, not UNKNOWN"""
        cases = [
            "코드 리뷰 중인 것은",        # "것" (thing/item)
            "코드 리뷰 중인 거 있어?",    # "거" (colloquial for 것)
            "검토 중인 건 뭐야",          # "건" (counter for items)
            "진행 중인 것 보여줘",         # "것" with "보여줘"
            "테스트 중인 거",             # "거" alone
        ]
        for msg in cases:
            result = classifier.classify(msg)
            assert result.answer_type == AnswerType.TASKS_BY_STATUS, \
                f"Expected TASKS_BY_STATUS for '{msg}', got {result.answer_type}"

    def test_완료_상태인거(self, classifier):
        """REGRESSION: '완료 상태인거' should be COMPLETED_TASKS, not UNKNOWN"""
        cases = [
            "완료 상태인거",              # "완료 상태" + "거"
            "완료 상태인 것은",            # "완료 상태" + "것"
            "완료된 거",                 # "완료된" + "거"
            "완료한 건 뭐야",             # "완료한" + "건"
        ]
        for msg in cases:
            result = classifier.classify(msg)
            assert result.answer_type == AnswerType.COMPLETED_TASKS, \
                f"Expected COMPLETED_TASKS for '{msg}', got {result.answer_type}"


# =============================================================================
# Phase 2: Kanban Overview Tests
# =============================================================================

class TestEntityProgressClassification:
    """Entity progress classification tests (P6)"""

    @pytest.fixture
    def classifier(self):
        return AnswerTypeClassifier()

    def test_specific_entity_progress(self, classifier):
        """Named WBS entity + progress keyword → ENTITY_PROGRESS"""
        cases = [
            "ocr 성능 평가 진행율은",
            "요구사항 분석 진행률 알려줘",
            "데이터 처리 파이프라인 어디까지 됐어",
            "UI 설계 검토 몇 퍼센트야",
        ]
        for msg in cases:
            result = classifier.classify(msg)
            assert result.answer_type == AnswerType.ENTITY_PROGRESS, \
                f"Expected ENTITY_PROGRESS for '{msg}', got {result.answer_type}"

    def test_project_progress_stays_metric(self, classifier):
        """Project-level progress → status_metric (NOT entity_progress)"""
        cases = [
            "프로젝트 진행율은",
            "전체 진행률 보여줘",
            "진행률 알려줘",
        ]
        for msg in cases:
            result = classifier.classify(msg)
            assert result.answer_type != AnswerType.ENTITY_PROGRESS, \
                f"'{msg}' should NOT be ENTITY_PROGRESS, got {result.answer_type}"

    def test_sprint_progress_not_entity(self, classifier):
        """Sprint progress → sprint_progress (NOT entity_progress)"""
        result = classifier.classify("이번 스프린트 진행률")
        assert result.answer_type == AnswerType.SPRINT_PROGRESS

    def test_short_name_stays_metric(self, classifier):
        """Too-short entity name (<=2 chars) → NOT entity_progress"""
        cases = [
            "UI 진행률",
            "QA 진행률",
        ]
        for msg in cases:
            result = classifier.classify(msg)
            assert result.answer_type != AnswerType.ENTITY_PROGRESS, \
                f"'{msg}' should NOT be ENTITY_PROGRESS (name too short)"

    def test_scope_word_stripped(self, classifier):
        """Scope words in candidate should be stripped"""
        result = classifier.classify("프로젝트 OCR 성능 평가 진행률")
        assert result.answer_type == AnswerType.ENTITY_PROGRESS

    def test_sprint_synonym_delegation(self, classifier):
        """Sprint synonym in query → NOT entity_progress"""
        cases = [
            "Sprint 1 진행률",
            "스프린트 3 진행률",
            "iteration 진행률",
        ]
        for msg in cases:
            result = classifier.classify(msg)
            assert result.answer_type != AnswerType.ENTITY_PROGRESS, \
                f"'{msg}' should NOT be ENTITY_PROGRESS (sprint delegation)"

    def test_time_adverb_stripped(self, classifier):
        """Time adverbs should be stripped from candidate"""
        result = classifier.classify("금주 OCR 평가 진행률")
        # "금주" stripped, "OCR 평가" remains (4 chars > 2, valid)
        assert result.answer_type == AnswerType.ENTITY_PROGRESS

    def test_phase_prefix_query(self, classifier):
        """Phase prefix '단계:' queries → ENTITY_PROGRESS"""
        cases = [
            "단계: AI 모델 설계/학습 진행율은",
            "단계 데이터 처리 진행률",
        ]
        for msg in cases:
            result = classifier.classify(msg)
            assert result.answer_type == AnswerType.ENTITY_PROGRESS, \
                f"Expected ENTITY_PROGRESS for '{msg}', got {result.answer_type}"

    def test_phase_only_stays_metric(self, classifier):
        """'단계 진행률' alone should NOT be entity_progress"""
        result = classifier.classify("단계 진행률")
        assert result.answer_type != AnswerType.ENTITY_PROGRESS


class TestEntityProgressHandler:
    """Entity progress handler registration and rendering tests"""

    def test_entity_progress_handler_registered(self):
        """entity_progress handler should be registered"""
        assert has_dedicated_handler("entity_progress")
        assert get_handler("entity_progress") is not None

    def test_entity_progress_header_rendering(self):
        """Entity progress should render with distinct WBS header"""
        contract = ResponseContract(
            intent="entity_progress",
            reference_time="2026-02-07 14:30 KST",
            scope="Project: Test",
            data={
                "entity": {
                    "name": "OCR 성능 평가", "type": "wbs_item",
                    "status": "IN_PROGRESS", "progress": 65,
                    "progress_is_null": False,
                },
                "completeness": {
                    "calculation": "child_weighted_avg",
                    "confidence": "high",
                    "null_count": 0,
                    "null_ratio": 0.0,
                },
            },
        )
        result = render(contract)
        assert "📊 **WBS 항목 진행률**" in result
        assert "📊 **Project Status**" not in result, \
            "REGRESSION: Status header in entity_progress response!"
        assert "OCR 성능 평가" in result

    def test_null_progress_shows_dash_not_zero(self):
        """NULL progress renders as dash with warning, NOT '0%'"""
        contract = ResponseContract(
            intent="entity_progress",
            reference_time="2026-02-07 14:30 KST",
            scope="Project: Test",
            data={
                "entity": {
                    "name": "테스트 항목", "type": "wbs_item",
                    "status": "IN_PROGRESS", "progress": None,
                    "progress_is_null": True,
                },
                "completeness": {
                    "calculation": "status_based",
                    "confidence": "low",
                    "null_count": 5,
                    "null_ratio": 1.0,
                },
            },
        )
        result = render(contract)
        assert "미설정" in result
        # 0% should NOT appear when progress_is_null
        assert "0%" not in result or "추정" in result

    def test_disambiguation_list_rendering(self):
        """Multiple matches render as disambiguation list"""
        contract = ResponseContract(
            intent="entity_progress",
            reference_time="2026-02-07 14:30 KST",
            scope="Project: Test",
            data={
                "disambiguation": [
                    {"name": "OCR 1단계", "type": "wbs_item", "status": "IN_PROGRESS", "progress": 40},
                    {"name": "OCR 2단계", "type": "wbs_item", "status": "NOT_STARTED", "progress": 0},
                ],
                "match_count": 2,
                "search_term": "OCR",
            },
            warnings=["2건의 항목이 검색되었습니다. 정확한 이름을 입력해 주세요."],
        )
        result = render(contract)
        assert "OCR 1단계" in result
        assert "OCR 2단계" in result
        assert "2건" in result

    def test_completeness_info_shown(self):
        """Completeness metadata is rendered"""
        contract = ResponseContract(
            intent="entity_progress",
            reference_time="2026-02-07 14:30 KST",
            scope="Project: Test",
            data={
                "entity": {
                    "name": "데이터 처리", "type": "wbs_item",
                    "status": "IN_PROGRESS", "progress": 45,
                    "progress_is_null": False,
                },
                "completeness": {
                    "calculation": "child_weighted_avg",
                    "confidence": "medium",
                    "null_count": 2,
                    "null_ratio": 0.4,
                    "progress": 45,
                },
                "children_summary": {
                    "total": 5,
                    "by_status": {"IN_PROGRESS": 2, "COMPLETED": 1, "NOT_STARTED": 2},
                },
            },
        )
        result = render(contract)
        assert "산출 근거" in result or "confidence" in result.lower() or "신뢰도" in result

    def test_child_calculated_preferred_over_direct(self):
        """Child-weighted average should be preferred over stale direct value"""
        contract = ResponseContract(
            intent="entity_progress",
            reference_time="2026-02-07 14:30 KST",
            scope="Project: Test",
            data={
                "entity": {
                    "name": "분류 모델 학습", "type": "wbs_item",
                    "status": "IN_PROGRESS", "progress": 85,
                    "progress_is_null": False,
                },
                "completeness": {
                    "calculation": "child_weighted_avg",
                    "confidence": "high",
                    "null_count": 0,
                    "null_ratio": 0.0,
                    "progress": 83,
                },
            },
        )
        result = render(contract)
        # Should show child-calculated 83%, not stale 85%
        assert "83%" in result
        assert "하위 항목 기준" in result
        # Should warn about discrepancy
        assert "85%" in result
        assert "차이" in result

    def test_no_discrepancy_warning_when_values_match(self):
        """No discrepancy warning when direct and calculated values match"""
        contract = ResponseContract(
            intent="entity_progress",
            reference_time="2026-02-07 14:30 KST",
            scope="Project: Test",
            data={
                "entity": {
                    "name": "OCR 평가", "type": "wbs_item",
                    "status": "IN_PROGRESS", "progress": 60,
                    "progress_is_null": False,
                },
                "completeness": {
                    "calculation": "child_weighted_avg",
                    "confidence": "high",
                    "null_count": 0,
                    "null_ratio": 0.0,
                    "progress": 60,
                },
            },
        )
        result = render(contract)
        assert "60%" in result
        assert "차이" not in result


    def test_phase_entity_type_rendering(self):
        """Phase entity type should render correctly with Phase label"""
        contract = ResponseContract(
            intent="entity_progress",
            reference_time="2026-02-07 14:30 KST",
            scope="Project: Test",
            data={
                "entity": {
                    "name": "AI 모델 설계/학습", "type": "phase",
                    "status": "IN_PROGRESS", "progress": 45,
                    "progress_is_null": False,
                },
                "completeness": {
                    "calculation": "child_weighted_avg",
                    "confidence": "medium",
                    "null_count": 1,
                    "null_ratio": 0.2,
                    "progress": 42,
                },
                "children": {
                    "total": 5,
                    "by_status": {"IN_PROGRESS": 3, "COMPLETED": 1, "NOT_STARTED": 1},
                    "completion_rate": 20.0,
                },
            },
        )
        result = render(contract)
        assert "AI 모델 설계/학습" in result
        assert "Phase" in result
        assert "42%" in result  # child-calculated preferred


class TestKanbanOverviewIntent:
    """Kanban board overview intent tests (Phase 2)"""

    @pytest.fixture
    def classifier(self):
        return AnswerTypeClassifier()

    def test_kanban_overview_classification(self, classifier):
        """Kanban board questions should be KANBAN_OVERVIEW"""
        cases = [
            "칸반 보드 현황 보여줘",
            "전체 현황 알려줘",
            "컬럼별 태스크 몇 개야",
        ]
        for msg in cases:
            result = classifier.classify(msg)
            assert result.answer_type == AnswerType.KANBAN_OVERVIEW, \
                f"Expected KANBAN_OVERVIEW for '{msg}', got {result.answer_type}"

    def test_kanban_handler_registered(self):
        """kanban_overview handler should be registered"""
        assert has_dedicated_handler("kanban_overview")
        assert get_handler("kanban_overview") is not None

    def test_kanban_header_rendering(self):
        """Kanban overview should render with distinct header"""
        contract = ResponseContract(
            intent="kanban_overview",
            reference_time="2026-02-06 14:30 KST",
            scope="Project: Test",
            data={"columns": [], "total_tasks": 0},
        )
        result = render(contract)
        assert "📊 **칸반 보드 현황**" in result
        assert "📊 **Project Status**" not in result


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
