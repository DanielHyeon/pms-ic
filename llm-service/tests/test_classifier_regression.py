#!/usr/bin/env python3
"""
Answer Type Classifier Regression Test Suite

Tests for preventing status queries from leaking to document route.
Reference: docs/할루시네이션검증.pdf Section 1

Categories:
1. Weak keyword status queries - MUST go to STATUS
2. Mixed queries - Status should not be pushed to document
3. HOWTO traps - Queries that look like status but are HOWTO
4. Ambiguous queries - Should fail safely
"""

import sys
import logging
from dataclasses import dataclass
from typing import List, Tuple, Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class RegressionCase:
    """Test case definition (renamed from TestCase to avoid pytest collection)"""
    query: str
    expected_type: str  # "status", "howto", "mixed", "casual"
    expected_specific: Optional[str] = None  # "status_metric", "status_list", etc.
    description: str = ""
    critical: bool = False  # If True, failure is critical


# =============================================================================
# Test Case Definitions
# =============================================================================

# Category 1: Weak keyword status queries - MUST route to STATUS
# These are the most common misclassification cases in production
WEAK_KEYWORD_STATUS_CASES = [
    RegressionCase(
        query="지금 어디까지 왔어?",
        expected_type="status",
        description="Progress without explicit keywords",
        critical=True,
    ),
    RegressionCase(
        query="요즘 진행 어때?",
        expected_type="status",
        description="Casual progress inquiry",
        critical=True,
    ),
    RegressionCase(
        query="이번 주 마무리 가능?",
        expected_type="status",
        description="Completion feasibility check",
        critical=True,
    ),
    RegressionCase(
        query="남은 거 뭐야?",
        expected_type="status",
        expected_specific="status_list",
        description="Remaining items inquiry",
        critical=True,
    ),
    RegressionCase(
        query="막힌 거 있어?",
        expected_type="status",
        expected_specific="status_list",
        description="Blocker inquiry without explicit keywords",
        critical=True,
    ),
    RegressionCase(
        query="완료된 것만 보여줘",
        expected_type="status",
        expected_specific="status_list",
        description="Completed items filter",
        critical=True,
    ),
    RegressionCase(
        query="뭐 해야 돼?",
        expected_type="status",
        description="Work inquiry",
        critical=True,
    ),
    RegressionCase(
        query="오늘 할 일 있어?",
        expected_type="status",
        description="Today's tasks",
        critical=True,
    ),
    RegressionCase(
        query="다음에 뭐 해?",
        expected_type="status",
        description="Next work item",
        critical=True,
    ),
    RegressionCase(
        query="급한 거 있어?",
        expected_type="status",
        description="Urgent items",
        critical=True,
    ),
    RegressionCase(
        query="일정 괜찮아?",
        expected_type="status",
        description="Schedule status",
        critical=True,
    ),
    RegressionCase(
        query="늦어지는 거 있어?",
        expected_type="status",
        expected_specific="status_list",
        description="Delayed items",
        critical=True,
    ),
]

# Category 2: Mixed queries - Status MUST NOT be pushed to document
MIXED_QUERY_CASES = [
    RegressionCase(
        query="현재 진행률 알려주고, 진행률 산정 기준도 알려줘",
        expected_type="mixed",
        description="Status + criteria explanation",
        critical=True,
    ),
    RegressionCase(
        query="스프린트 현황이랑 회고 템플릿도 줘",
        expected_type="mixed",
        description="Status + template request",
        critical=True,
    ),
    RegressionCase(
        query="지금 진행 상황 알려주고 앞으로 어떻게 할지 가이드해줘",
        expected_type="mixed",
        description="Status + future guidance",
        critical=True,
    ),
    RegressionCase(
        query="완료율이랑 완료율 계산 방식 알려줘",
        expected_type="mixed",
        description="Rate + calculation method",
        critical=True,
    ),
]

# Category 3: HOWTO traps - Look like status but are HOWTO
# These should NOT route to status
HOWTO_TRAP_CASES = [
    RegressionCase(
        query="진행률은 어떻게 계산해?",
        expected_type="howto",
        description="Calculation method (not actual progress)",
        critical=True,
    ),
    RegressionCase(
        query="현황 보고서는 어떻게 작성해?",
        expected_type="howto",
        description="Report writing method",
        critical=True,
    ),
    RegressionCase(
        query="스프린트 플래닝은 어떻게 해?",
        expected_type="howto",
        description="Planning methodology",
        critical=True,
    ),
    RegressionCase(
        query="백로그 우선순위는 어떻게 정해?",
        expected_type="howto",
        description="Prioritization method",
        critical=True,
    ),
    RegressionCase(
        query="번다운 차트 보는 법 알려줘",
        expected_type="howto",
        description="Chart reading method",
        critical=True,
    ),
    RegressionCase(
        query="완료 기준이 뭐야?",
        expected_type="howto",
        description="Definition of Done",
        critical=True,
    ),
    RegressionCase(
        query="스토리 포인트 산정 방법 알려줘",
        expected_type="howto",
        description="Estimation methodology",
        critical=True,
    ),
]

# Category 4: Ambiguous queries - Should route safely
AMBIGUOUS_QUERY_CASES = [
    RegressionCase(
        query="프로젝트 상태 알려줘",
        expected_type="status",
        description="Generic project status (should use default project)",
        critical=False,
    ),
    RegressionCase(
        query="어떻게 되고 있어?",
        expected_type="status",
        description="Vague progress inquiry",
        critical=False,
    ),
    RegressionCase(
        query="상황이 어때?",
        expected_type="status",
        description="Generic situation inquiry",
        critical=False,
    ),
]

# Category 5: Standard cases (should always work)
STANDARD_STATUS_CASES = [
    RegressionCase(
        query="현재 프로젝트 진행 현황 알려줘",
        expected_type="status",
        expected_specific="status_metric",
        description="Standard progress query",
    ),
    RegressionCase(
        query="이번 스프린트 완료율이 어떻게 돼?",
        expected_type="status",
        expected_specific="status_metric",
        description="Sprint completion rate",
    ),
    RegressionCase(
        query="차단된 태스크 목록 알려줘",
        expected_type="status",
        expected_specific="status_list",
        description="Blocked task list",
    ),
    RegressionCase(
        query="WIP 현황 알려줘",
        expected_type="status",
        expected_specific="status_metric",
        description="WIP status",
    ),
]

STANDARD_HOWTO_CASES = [
    RegressionCase(
        query="스프린트란 뭐야?",
        expected_type="howto",
        description="Definition question",
    ),
    RegressionCase(
        query="WBS가 무엇인가요?",
        expected_type="howto",
        description="Concept explanation",
    ),
    RegressionCase(
        query="애자일 방법론 설명해줘",
        expected_type="howto",
        description="Methodology explanation",
    ),
]

CASUAL_CASES = [
    RegressionCase(
        query="안녕",
        expected_type="casual",
        description="Greeting",
    ),
    RegressionCase(
        query="고마워",
        expected_type="casual",
        description="Thanks",
    ),
]


# =============================================================================
# Test Runner
# =============================================================================

def run_tests():
    """Run all regression tests"""
    from classifiers.answer_type_classifier import (
        get_answer_type_classifier, AnswerType
    )

    classifier = get_answer_type_classifier()

    # Type mapping
    type_map = {
        "status": {AnswerType.STATUS_METRIC, AnswerType.STATUS_LIST, AnswerType.STATUS_DRILLDOWN},
        "howto": {AnswerType.HOWTO_POLICY},
        "mixed": {AnswerType.MIXED},
        "casual": {AnswerType.CASUAL},
    }

    all_cases = [
        ("Weak Keyword Status (CRITICAL)", WEAK_KEYWORD_STATUS_CASES),
        ("Mixed Queries (CRITICAL)", MIXED_QUERY_CASES),
        ("HOWTO Traps (CRITICAL)", HOWTO_TRAP_CASES),
        ("Ambiguous Queries", AMBIGUOUS_QUERY_CASES),
        ("Standard Status", STANDARD_STATUS_CASES),
        ("Standard HOWTO", STANDARD_HOWTO_CASES),
        ("Casual", CASUAL_CASES),
    ]

    total_passed = 0
    total_failed = 0
    critical_failed = 0
    failures = []

    for category_name, cases in all_cases:
        print(f"\n{'=' * 60}")
        print(f"Category: {category_name}")
        print("=" * 60)

        for tc in cases:
            result = classifier.classify(tc.query)
            actual_type = result.answer_type

            # Check if type matches
            expected_types = type_map.get(tc.expected_type, set())
            type_match = actual_type in expected_types

            # Check specific type if required
            specific_match = True
            if tc.expected_specific:
                specific_match = result.answer_type.value == tc.expected_specific

            passed = type_match and specific_match

            if passed:
                total_passed += 1
                status = "✅"
            else:
                total_failed += 1
                if tc.critical:
                    critical_failed += 1
                    status = "🔴"
                else:
                    status = "❌"
                failures.append((tc, result))

            print(f"{status} \"{tc.query[:40]}...\"")
            print(f"   Expected: {tc.expected_type}" +
                  (f" ({tc.expected_specific})" if tc.expected_specific else ""))
            print(f"   Got: {actual_type.value} (confidence: {result.confidence:.2f})")
            if tc.description:
                print(f"   Desc: {tc.description}")

    # Summary
    print("\n" + "=" * 60)
    print("REGRESSION TEST SUMMARY")
    print("=" * 60)
    print(f"Total: {total_passed} passed, {total_failed} failed")
    print(f"Critical failures: {critical_failed}")

    if failures:
        print("\nFailed cases:")
        for tc, result in failures:
            marker = "🔴 CRITICAL" if tc.critical else "❌"
            print(f"  {marker}: \"{tc.query}\"")
            print(f"       Expected: {tc.expected_type}, Got: {result.answer_type.value}")
            print(f"       Patterns: {result.matched_patterns}")

    # Return success only if no critical failures
    return critical_failed == 0


def test_secondary_gate_signals():
    """Test that secondary gate signals are working"""
    from classifiers.answer_type_classifier import get_answer_type_classifier

    print("\n" + "=" * 60)
    print("Secondary Gate Signal Test")
    print("=" * 60)

    classifier = get_answer_type_classifier()

    # Queries with aggregation signals should lean toward status
    aggregation_queries = [
        "몇 개 남았어?",
        "완료된 건 몇 %야?",
        "지연된 건 몇 건이야?",
        "블로커 목록 보여줘",
        "리스크 있어?",
    ]

    # Queries with howto signals should lean toward howto
    howto_queries = [
        "스프린트 정의가 뭐야?",
        "절차를 알려줘",
        "가이드 있어?",
        "템플릿 줘",
    ]

    print("\nAggregation signal queries (should be STATUS):")
    for q in aggregation_queries:
        result = classifier.classify(q)
        is_status = classifier.is_status_query(result.answer_type)
        status = "✅" if is_status else "❌"
        print(f"  {status} \"{q}\" -> {result.answer_type.value}")

    print("\nHOWTO signal queries (should be HOWTO):")
    for q in howto_queries:
        result = classifier.classify(q)
        is_howto = result.answer_type == classifier.classify("").answer_type.__class__.HOWTO_POLICY
        from classifiers.answer_type_classifier import AnswerType
        is_howto = result.answer_type == AnswerType.HOWTO_POLICY
        status = "✅" if is_howto else "❌"
        print(f"  {status} \"{q}\" -> {result.answer_type.value}")


def test_classifier_regression_all():
    """
    Main pytest function to run all regression tests.
    Fails if any CRITICAL test case fails.
    """
    success = run_tests()
    assert success, "Critical regression test failures detected"


if __name__ == "__main__":
    print("=" * 60)
    print("Answer Type Classifier Regression Test Suite")
    print("=" * 60)

    success = run_tests()
    test_secondary_gate_signals()

    sys.exit(0 if success else 1)
