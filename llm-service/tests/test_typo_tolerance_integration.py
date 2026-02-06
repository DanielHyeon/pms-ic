"""
Integration tests: Typo queries should route to correct intent.

Verifies the 3-layer normalization (L1: jamo fuzzy, L2: typo dict, L3: LLM)
works end-to-end through the answer type classifier.

Run: pytest tests/test_typo_tolerance_integration.py -v
"""

import pytest
from classifiers.answer_type_classifier import AnswerTypeClassifier, AnswerType


class TestTypoToleranceEndToEnd:
    """Integration tests: typo queries should classify correctly"""

    @pytest.fixture
    def classifier(self):
        return AnswerTypeClassifier()

    # ----- TASKS_BY_STATUS -----

    def test_tasks_by_status_typo_teteuteu(self, classifier):
        """'테트트 중인 task는?' should route to TASKS_BY_STATUS"""
        result = classifier.classify("테트트 중인 task는?")
        assert result.answer_type == AnswerType.TASKS_BY_STATUS, \
            f"Got {result.answer_type} with patterns {result.matched_patterns}"

    def test_tasks_by_status_typo_testing(self, classifier):
        """'현재 테트트 중인 task는?' should route to TASKS_BY_STATUS"""
        result = classifier.classify("현재 테트트 중인 task는?")
        assert result.answer_type == AnswerType.TASKS_BY_STATUS

    def test_tasks_by_status_correct_spelling(self, classifier):
        """Correctly spelled query should still work"""
        result = classifier.classify("테스트 중인 task는?")
        assert result.answer_type == AnswerType.TASKS_BY_STATUS

    # ----- SPRINT_PROGRESS -----

    def test_sprint_progress_typo(self, classifier):
        """'스프런트 진행 상황' should route to SPRINT_PROGRESS"""
        result = classifier.classify("스프런트 진행 상황")
        assert result.answer_type == AnswerType.SPRINT_PROGRESS, \
            f"Got {result.answer_type} with patterns {result.matched_patterns}"

    def test_sprint_progress_typo2(self, classifier):
        """'스프린크 현황 보여줘' should route to SPRINT_PROGRESS"""
        result = classifier.classify("스프린크 현황 보여줘")
        assert result.answer_type == AnswerType.SPRINT_PROGRESS

    def test_sprint_progress_correct(self, classifier):
        """Correctly spelled should still work"""
        result = classifier.classify("스프린트 진행 상황")
        assert result.answer_type == AnswerType.SPRINT_PROGRESS

    # ----- BACKLOG_LIST -----

    def test_backlog_typo(self, classifier):
        """'백러그 보여줘' should route to BACKLOG_LIST"""
        result = classifier.classify("백러그 보여줘")
        assert result.answer_type == AnswerType.BACKLOG_LIST, \
            f"Got {result.answer_type} with patterns {result.matched_patterns}"

    def test_backlog_correct(self, classifier):
        """Correctly spelled should still work"""
        result = classifier.classify("백로그 보여줘")
        assert result.answer_type == AnswerType.BACKLOG_LIST

    # ----- RISK_ANALYSIS -----

    def test_risk_typo(self, classifier):
        """'리스거 분석해줘' should route to RISK_ANALYSIS (via typo dict)"""
        result = classifier.classify("리스거 분석해줘")
        assert result.answer_type == AnswerType.RISK_ANALYSIS, \
            f"Got {result.answer_type} with patterns {result.matched_patterns}"

    def test_risk_correct(self, classifier):
        """Correctly spelled should still work"""
        result = classifier.classify("리스크 분석해줘")
        assert result.answer_type == AnswerType.RISK_ANALYSIS

    # ----- COMPLETED_TASKS -----

    def test_completed_tasks_typo_task(self, classifier):
        """'완료된 테스크 보여줘' should route to COMPLETED_TASKS"""
        result = classifier.classify("완료된 테스크 보여줘")
        assert result.answer_type == AnswerType.COMPLETED_TASKS, \
            f"Got {result.answer_type} with patterns {result.matched_patterns}"

    # ----- NO FALSE POSITIVES -----

    def test_no_false_positive_progress(self, classifier):
        """'진행 상황 알려줘' should NOT become TASKS_BY_STATUS"""
        result = classifier.classify("진행 상황 알려줘")
        assert result.answer_type != AnswerType.TASKS_BY_STATUS, \
            f"False positive: 진행 상황 matched as TASKS_BY_STATUS"

    def test_no_false_positive_project_status(self, classifier):
        """'현재 프로젝트 진행 현황' should NOT become TASKS_BY_STATUS"""
        result = classifier.classify("현재 프로젝트 진행 현황 알려줘")
        assert result.answer_type != AnswerType.TASKS_BY_STATUS, \
            f"False positive: 진행 현황 matched as TASKS_BY_STATUS"

    def test_no_false_positive_task_vs_risk(self, classifier):
        """'이번 주 마감 태스크' should NOT become RISK_ANALYSIS"""
        result = classifier.classify("이번 주 마감 태스크")
        assert result.answer_type == AnswerType.TASK_DUE_THIS_WEEK, \
            f"Got {result.answer_type}, expected TASK_DUE_THIS_WEEK"

    # ----- OBSERVABILITY: typo correction is noted in reasoning -----

    def test_typo_correction_noted_in_reasoning(self, classifier):
        """When typo dict corrects a query, reasoning should mention it"""
        result = classifier.classify("테트트 중인 task는?")
        assert "typo corrected" in result.reasoning.lower() or \
               "테트트" in result.reasoning, \
            f"Reasoning should note typo correction: {result.reasoning}"
