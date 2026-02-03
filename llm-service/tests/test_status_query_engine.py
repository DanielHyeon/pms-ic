#!/usr/bin/env python3
"""
Test script for Status Query Engine.

Tests the complete flow:
1. Answer Type Classification
2. Status Query Plan creation
3. Query Execution
4. Response Building
"""

import os
import sys
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def test_answer_type_classifier():
    """Test answer type classification"""
    print("\n" + "=" * 60)
    print("TEST 1: Answer Type Classifier")
    print("=" * 60)

    from classifiers.answer_type_classifier import classify_answer_type, AnswerType

    test_cases = [
        # Status queries (should route to Status Query Engine)
        ("현재 프로젝트 진행 현황 알려줘", AnswerType.STATUS_METRIC),
        ("이번 스프린트 완료율이 어떻게 돼?", AnswerType.STATUS_METRIC),
        ("지금 차단된 태스크 목록 알려줘", AnswerType.STATUS_LIST),
        ("남은 작업이 뭐가 있어?", AnswerType.STATUS_LIST),
        ("프로젝트 진행 상태 요약해줘", AnswerType.STATUS_METRIC),

        # How-to queries (should route to Document RAG)
        ("스프린트란 뭐야?", AnswerType.HOWTO_POLICY),
        ("WBS가 무엇인가요?", AnswerType.HOWTO_POLICY),
        ("프로젝트 진행률 산정 방법 알려줘", AnswerType.HOWTO_POLICY),
        ("애자일 방법론 설명해줘", AnswerType.HOWTO_POLICY),

        # Casual
        ("안녕", AnswerType.CASUAL),
    ]

    passed = 0
    failed = 0

    for query, expected_type in test_cases:
        result = classify_answer_type(query)
        status = "✅" if result.answer_type == expected_type else "❌"

        if result.answer_type == expected_type:
            passed += 1
        else:
            failed += 1

        print(f"{status} '{query[:30]}...'")
        print(f"   Expected: {expected_type.value}, Got: {result.answer_type.value}")
        print(f"   Confidence: {result.confidence:.2f}, Patterns: {result.matched_patterns[:2]}")
        print()

    print(f"Results: {passed} passed, {failed} failed")
    return failed == 0


def test_status_query_plan():
    """Test status query plan creation and validation"""
    print("\n" + "=" * 60)
    print("TEST 2: Status Query Plan")
    print("=" * 60)

    from query.status_query_plan import (
        create_default_plan, validate_plan, StatusQueryPlan,
        ALLOWED_METRICS
    )

    # Test 1: Create default plan
    print("\n[Test 2.1] Create default plan")
    plan = create_default_plan("proj-001", access_level=3)
    print(f"  ✅ Plan created with {len(plan.metrics)} metrics")
    print(f"  Metrics: {plan.metrics}")
    print(f"  Validated: {plan.validated}")

    # Test 2: Validate plan with invalid metrics
    print("\n[Test 2.2] Validate plan with invalid metrics")
    plan2 = StatusQueryPlan()
    plan2.metrics = ["invalid_metric", "completion_rate", "blocked_items"]
    plan2 = validate_plan(plan2, user_access_level=3, default_project_id="proj-001")
    print(f"  Validation errors: {plan2.validation_errors}")
    print(f"  Validation warnings: {plan2.validation_warnings}")
    print(f"  Final metrics: {plan2.metrics}")
    assert "invalid_metric" not in plan2.metrics, "Invalid metric should be removed"
    print("  ✅ Invalid metrics correctly removed")

    # Test 3: Access level enforcement
    print("\n[Test 2.3] Access level enforcement")
    plan3 = create_default_plan("proj-001", access_level=6)
    plan3.filters.access_level_max = 10  # Try to elevate
    plan3 = validate_plan(plan3, user_access_level=3, default_project_id="proj-001")
    assert plan3.filters.access_level_max == 3, "Access level should be capped"
    print(f"  ✅ Access level correctly capped to user level (3)")

    return True


def test_status_query_executor():
    """Test status query execution against database"""
    print("\n" + "=" * 60)
    print("TEST 3: Status Query Executor")
    print("=" * 60)

    from query.status_query_plan import create_default_plan, validate_plan
    from query.status_query_executor import get_status_query_executor

    # Create and validate plan
    plan = create_default_plan("proj-001", access_level=6)
    plan.metrics = [
        "story_counts_by_status",
        "completion_rate",
        "active_sprint",
        "project_summary",
        "wip_status",
    ]
    plan = validate_plan(plan, user_access_level=6, default_project_id="proj-001")

    print(f"\n[Test 3.1] Execute query for project: proj-001")
    print(f"  Metrics: {plan.metrics}")

    executor = get_status_query_executor()
    try:
        result = executor.execute(plan)

        print(f"\n  Query completed in {result.total_query_time_ms:.1f}ms")
        print(f"  Errors: {result.errors}")

        for metric_name, metric_result in result.metrics.items():
            if metric_result.error:
                print(f"  ❌ {metric_name}: ERROR - {metric_result.error}")
            else:
                data_preview = str(metric_result.data)[:100]
                print(f"  ✅ {metric_name}: {data_preview}...")

        return len(result.errors) == 0 or result.has_data()

    except Exception as e:
        print(f"  ❌ Execution failed: {e}")
        return False


def test_status_response_builder():
    """Test status response building"""
    print("\n" + "=" * 60)
    print("TEST 4: Status Response Builder")
    print("=" * 60)

    from query.status_query_plan import create_default_plan, validate_plan
    from query.status_query_executor import get_status_query_executor
    from contracts.status_response_contract import build_status_response

    # Execute a query first
    plan = create_default_plan("proj-001", access_level=6)
    plan.metrics = ["story_counts_by_status", "completion_rate", "active_sprint", "project_summary"]
    plan = validate_plan(plan, user_access_level=6, default_project_id="proj-001")

    executor = get_status_query_executor()
    try:
        query_result = executor.execute(plan)

        # Build response
        print("\n[Test 4.1] Build response contract")
        contract = build_status_response(query_result, "proj-001")

        print(f"  Reference time: {contract.reference_time}")
        print(f"  Scope: {contract.scope}")
        print(f"  Has data: {contract.has_data()}")
        print(f"  Completion rate: {contract.completion_rate}")
        print(f"  Total stories: {contract.total_stories}")
        print(f"  Data gaps: {contract.data_gaps}")

        # Generate text
        print("\n[Test 4.2] Generate response text")
        text = contract.to_text()
        print("-" * 40)
        print(text[:500])
        if len(text) > 500:
            print(f"... ({len(text)} chars total)")
        print("-" * 40)

        return True

    except Exception as e:
        print(f"  ❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_source_policy_gate():
    """Test source policy gate"""
    print("\n" + "=" * 60)
    print("TEST 5: Source Policy Gate")
    print("=" * 60)

    from classifiers.answer_type_classifier import AnswerType
    from guards.source_policy_gate import get_source_policy_gate

    gate = get_source_policy_gate()

    # Test 1: Status query should block RAG documents
    print("\n[Test 5.1] Status query should block RAG documents")
    db_results = {"metrics": {"completion_rate": {"data": {"rate": 60.0}}}}
    rag_results = [{"title": "PDF Document", "content": "Method description..."}]

    context = gate.filter_context(
        AnswerType.STATUS_METRIC,
        db_results=db_results,
        rag_results=rag_results
    )

    assert context.db_data is not None, "DB data should be included"
    assert len(context.documents) == 0, "RAG documents should be blocked"
    print(f"  ✅ DB data included: {context.db_data is not None}")
    print(f"  ✅ RAG documents blocked: {len(context.documents)} docs")
    print(f"  Warnings: {context.warnings}")

    # Test 2: Howto query should include RAG documents
    print("\n[Test 5.2] Howto query should include RAG documents")
    context2 = gate.filter_context(
        AnswerType.HOWTO_POLICY,
        db_results=db_results,
        rag_results=rag_results
    )

    assert len(context2.documents) > 0, "RAG documents should be included"
    print(f"  ✅ RAG documents included: {len(context2.documents)} docs")
    print(f"  Document label: {context2.document_label}")

    # Test 3: Should skip RAG for status queries
    print("\n[Test 5.3] Should skip RAG check")
    assert gate.should_skip_rag(AnswerType.STATUS_METRIC) == True
    assert gate.should_skip_rag(AnswerType.HOWTO_POLICY) == False
    print(f"  ✅ Skip RAG for STATUS_METRIC: True")
    print(f"  ✅ Skip RAG for HOWTO_POLICY: False")

    return True


def test_end_to_end():
    """Test end-to-end flow simulation"""
    print("\n" + "=" * 60)
    print("TEST 6: End-to-End Flow Simulation")
    print("=" * 60)

    from classifiers.answer_type_classifier import classify_answer_type, get_answer_type_classifier
    from query.status_query_plan import create_default_plan, validate_plan
    from query.status_query_executor import get_status_query_executor
    from contracts.status_response_contract import build_status_response
    from guards.source_policy_gate import get_source_policy_gate

    query = "현재 프로젝트 진행 현황을 알려줘"
    project_id = "proj-001"
    user_access_level = 3  # PM level

    print(f"\nQuery: '{query}'")
    print(f"Project: {project_id}, Access Level: {user_access_level}")
    print("-" * 40)

    # Step 1: Classify answer type
    print("\n[Step 1] Classify answer type")
    classifier = get_answer_type_classifier()
    answer_result = classifier.classify(query)
    print(f"  Type: {answer_result.answer_type.value}")
    print(f"  Confidence: {answer_result.confidence:.2f}")
    print(f"  Is status query: {classifier.is_status_query(answer_result.answer_type)}")

    if not classifier.is_status_query(answer_result.answer_type):
        print("  ❌ Should be classified as status query!")
        return False

    # Step 2: Check source policy
    print("\n[Step 2] Check source policy")
    gate = get_source_policy_gate()
    should_skip_rag = gate.should_skip_rag(answer_result.answer_type)
    print(f"  Skip RAG: {should_skip_rag}")

    # Step 3: Create and execute query plan
    print("\n[Step 3] Execute status query")
    plan = create_default_plan(project_id, user_access_level)
    plan.metrics.extend(answer_result.metrics_requested)
    plan = validate_plan(plan, user_access_level, project_id)

    executor = get_status_query_executor()
    query_result = executor.execute(plan)
    print(f"  Query time: {query_result.total_query_time_ms:.1f}ms")
    print(f"  Metrics retrieved: {len(query_result.metrics)}")

    # Step 4: Build response
    print("\n[Step 4] Build response")
    contract = build_status_response(query_result, project_id)
    response_text = contract.to_text()

    print("-" * 40)
    print(response_text[:600])
    if len(response_text) > 600:
        print(f"... ({len(response_text)} chars total)")
    print("-" * 40)

    # Verify: Response should NOT contain hallucinated content
    print("\n[Step 5] Verify no hallucination")
    hallucination_markers = ["잭애스 팀", "x팀", "y팀", "z팀", "스프린트 15"]
    found_hallucination = False
    for marker in hallucination_markers:
        if marker in response_text:
            print(f"  ❌ Found hallucinated content: '{marker}'")
            found_hallucination = True

    if not found_hallucination:
        print("  ✅ No hallucination markers found")

    return not found_hallucination


def main():
    """Run all tests"""
    print("=" * 60)
    print("Status Query Engine Test Suite")
    print("=" * 60)

    results = []

    # Test 1: Answer Type Classifier
    try:
        results.append(("Answer Type Classifier", test_answer_type_classifier()))
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        results.append(("Answer Type Classifier", False))

    # Test 2: Status Query Plan
    try:
        results.append(("Status Query Plan", test_status_query_plan()))
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        results.append(("Status Query Plan", False))

    # Test 3: Status Query Executor (requires DB)
    try:
        results.append(("Status Query Executor", test_status_query_executor()))
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        results.append(("Status Query Executor", False))

    # Test 4: Status Response Builder (requires DB)
    try:
        results.append(("Status Response Builder", test_status_response_builder()))
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        results.append(("Status Response Builder", False))

    # Test 5: Source Policy Gate
    try:
        results.append(("Source Policy Gate", test_source_policy_gate()))
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        results.append(("Source Policy Gate", False))

    # Test 6: End-to-End (requires DB)
    try:
        results.append(("End-to-End Flow", test_end_to_end()))
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        results.append(("End-to-End Flow", False))

    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)

    passed = sum(1 for _, r in results if r)
    failed = sum(1 for _, r in results if not r)

    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {status}: {name}")

    print(f"\nTotal: {passed} passed, {failed} failed")

    return failed == 0


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
