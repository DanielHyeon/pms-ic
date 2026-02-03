"""
Regression tests for intent classifier.

These tests ensure that:
1. Specific question patterns always map to expected intents
2. Priority conflicts resolve correctly (e.g., SPRINT_PROGRESS beats STATUS_METRIC)
3. No false positives capture unrelated questions

Run after any classifier changes to prevent regressions.
Run: pytest tests/test_intent_classifier_regression.py -v
"""

import pytest
from classifiers.answer_type_classifier import get_answer_type_classifier, AnswerType


class TestBacklogClassification:
    """Backlog-related questions must classify as BACKLOG_LIST"""

    @pytest.fixture
    def classifier(self):
        return get_answer_type_classifier()

    @pytest.mark.parametrize("question", [
        "백로그에 뭐가 있어?",
        "제품 백로그 보여줘",
        "백로그 항목 알려줘",
        "product backlog",
        "백로그 현황",
        "백로그 목록",
        "What's in the backlog?",
    ])
    def test_backlog_questions(self, classifier, question):
        result = classifier.classify(question)
        assert result.answer_type == AnswerType.BACKLOG_LIST, \
            f"Expected BACKLOG_LIST for '{question}', got {result.answer_type}"


class TestRiskClassification:
    """Risk-related questions must classify as RISK_ANALYSIS"""

    @pytest.fixture
    def classifier(self):
        return get_answer_type_classifier()

    @pytest.mark.parametrize("question", [
        "리스크 분석해줘",
        "현재 위험 요소가 뭐야",
        "프로젝트 리스크 알려줘",
        "위험 관리 현황",
        "리스크 목록",
        "risk analysis",
        "What are the risks?",
    ])
    def test_risk_questions(self, classifier, question):
        result = classifier.classify(question)
        assert result.answer_type == AnswerType.RISK_ANALYSIS, \
            f"Expected RISK_ANALYSIS for '{question}', got {result.answer_type}"


class TestSprintProgressClassification:
    """Sprint-related questions must classify as SPRINT_PROGRESS"""

    @pytest.fixture
    def classifier(self):
        return get_answer_type_classifier()

    @pytest.mark.parametrize("question", [
        "현재 스프린트 진행 상황",
        "스프린트 진척률 알려줘",
        "스프린트 현황",
        "sprint progress",
        "How is the sprint going?",
    ])
    def test_sprint_questions(self, classifier, question):
        result = classifier.classify(question)
        assert result.answer_type == AnswerType.SPRINT_PROGRESS, \
            f"Expected SPRINT_PROGRESS for '{question}', got {result.answer_type}"


class TestTaskDueClassification:
    """This week task questions must classify as TASK_DUE_THIS_WEEK"""

    @pytest.fixture
    def classifier(self):
        return get_answer_type_classifier()

    @pytest.mark.parametrize("question", [
        "이번 주 마감 태스크",
        "이번주 해야 할 일",
        "금주 완료해야 할 작업",
        "tasks due this week",
        "What's due this week?",
    ])
    def test_task_due_questions(self, classifier, question):
        result = classifier.classify(question)
        assert result.answer_type == AnswerType.TASK_DUE_THIS_WEEK, \
            f"Expected TASK_DUE_THIS_WEEK for '{question}', got {result.answer_type}"


class TestCasualClassification:
    """Greetings must classify as CASUAL"""

    @pytest.fixture
    def classifier(self):
        return get_answer_type_classifier()

    @pytest.mark.parametrize("question", [
        "안녕",
        "안녕하세요",
        "고마워",
        "감사합니다",
        "hello",
        "hi",
    ])
    def test_casual_questions(self, classifier, question):
        result = classifier.classify(question)
        assert result.answer_type == AnswerType.CASUAL, \
            f"Expected CASUAL for '{question}', got {result.answer_type}"


# =============================================================================
# CRITICAL: Priority Conflict Tests
# =============================================================================
# These tests address the root cause of P0/P1 STATUS_METRIC black hole issue:
# "The correct pattern existed, but a stronger pattern captured the query"

class TestPriorityConflictResolution:
    """
    CRITICAL: Test that specific intents win over generic STATUS_METRIC.

    The STATUS_METRIC black hole was caused by priority conflicts.
    These tests ensure proper priority ordering.
    """

    @pytest.fixture
    def classifier(self):
        return get_answer_type_classifier()

    def test_sprint_beats_status(self, classifier):
        """Sprint progress must NOT fall back to STATUS_METRIC"""
        question = "현재 스프린트 진행률은?"
        result = classifier.classify(question)

        assert result.answer_type == AnswerType.SPRINT_PROGRESS, \
            f"SPRINT_PROGRESS should beat STATUS_METRIC for '{question}', got {result.answer_type}"

    def test_backlog_beats_status(self, classifier):
        """Backlog must NOT fall back to STATUS_METRIC"""
        questions = [
            "백로그 현황",      # Contains "현황" which could match status
            "백로그 상태",      # Contains "상태" which could match status
        ]
        for q in questions:
            result = classifier.classify(q)
            assert result.answer_type == AnswerType.BACKLOG_LIST, \
                f"BACKLOG_LIST should beat STATUS_METRIC for '{q}', got {result.answer_type}"

    def test_risk_beats_status(self, classifier):
        """Risk analysis must NOT fall back to STATUS_METRIC"""
        questions = [
            "리스크 현황",
            "위험 상태",
        ]
        for q in questions:
            result = classifier.classify(q)
            assert result.answer_type == AnswerType.RISK_ANALYSIS, \
                f"RISK_ANALYSIS should beat STATUS_METRIC for '{q}', got {result.answer_type}"

    def test_specific_intents_never_go_to_status_metric(self, classifier):
        """REGRESSION TEST: Specific domain keywords must NEVER result in STATUS_METRIC"""
        specific_questions = [
            ("백로그", AnswerType.BACKLOG_LIST),
            ("리스크", AnswerType.RISK_ANALYSIS),
            ("스프린트 진행", AnswerType.SPRINT_PROGRESS),
            ("이번주 마감", AnswerType.TASK_DUE_THIS_WEEK),
        ]

        for question, expected_intent in specific_questions:
            result = classifier.classify(question)
            assert result.answer_type != AnswerType.STATUS_METRIC, \
                f"'{question}' fell to STATUS_METRIC! Should be {expected_intent}"


class TestNoFalsePositives:
    """Ensure specific intents don't capture unrelated questions"""

    @pytest.fixture
    def classifier(self):
        return get_answer_type_classifier()

    def test_status_not_captured_as_backlog(self, classifier):
        """Status questions should not be classified as BACKLOG_LIST"""
        questions = [
            "프로젝트 현황",
            "진행률 알려줘",
            "완료율이 얼마야",
        ]
        for q in questions:
            result = classifier.classify(q)
            assert result.answer_type != AnswerType.BACKLOG_LIST, \
                f"'{q}' should not be BACKLOG_LIST, got {result.answer_type}"

    def test_general_list_not_risk(self, classifier):
        """General list questions should not be classified as RISK_ANALYSIS"""
        questions = [
            "이슈 목록",    # General issues, not risks
            "버그 리스트",  # Bugs, not risks
        ]
        for q in questions:
            result = classifier.classify(q)
            assert result.answer_type != AnswerType.RISK_ANALYSIS, \
                f"'{q}' should not be RISK_ANALYSIS, got {result.answer_type}"


class TestFallbackBehavior:
    """Test fallback behavior for ambiguous questions"""

    @pytest.fixture
    def classifier(self):
        return get_answer_type_classifier()

    def test_ambiguous_goes_to_unknown_not_status(self, classifier):
        """Truly ambiguous questions should go to UNKNOWN, not STATUS_METRIC"""
        ambiguous_questions = [
            "이거 어떻게 생각해?",
            "뭐라고 해야 하지",
        ]
        for q in ambiguous_questions:
            result = classifier.classify(q)
            # Should be UNKNOWN (which routes to RAG), not STATUS_METRIC
            assert result.answer_type != AnswerType.STATUS_METRIC, \
                f"Ambiguous '{q}' should NOT go to STATUS_METRIC"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
