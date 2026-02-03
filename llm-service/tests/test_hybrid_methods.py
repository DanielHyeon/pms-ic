#!/usr/bin/env python3
"""
Test script to compare hybrid search merge methods:
1. weighted - Traditional weighted scoring (current default)
2. rrf - Reciprocal Rank Fusion
3. rrf_rerank - RRF + Cross-encoder reranking

Usage:
    python test_hybrid_methods.py
"""

import os
import sys
import time
import logging
from typing import List, Dict, Tuple

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

# Test queries with expected keywords in correct answer
TEST_QUERIES = [
    {
        "query": "플래닝 포커란",
        "expected_keywords": ["13장", "카드", "추정", "스토리 포인트", "planning poker"],
        "description": "Definition query - should return Planning Poker definition"
    },
    {
        "query": "번다운 차트가 뭐야",
        "expected_keywords": ["번다운", "burndown", "스프린트", "진척", "잔여"],
        "description": "Definition query - should return Burndown chart definition"
    },
    {
        "query": "스크럼 마스터 역할",
        "expected_keywords": ["스크럼 마스터", "scrum master", "팀", "장애물", "퍼실리테이터"],
        "description": "Role query - should return Scrum Master responsibilities"
    },
    {
        "query": "리스크 관리 방법",
        "expected_keywords": ["리스크", "risk", "식별", "대응", "완화"],
        "description": "Concept query - should return risk management methods"
    },
]


def test_search_method(rag_service, query: str, method: str, top_k: int = 5) -> Tuple[List[Dict], float]:
    """Test a single search method and return results with timing."""
    os.environ["HYBRID_MERGE_METHOD"] = method

    start_time = time.time()
    results = rag_service.search(query, top_k=top_k)
    elapsed = time.time() - start_time

    return results, elapsed


def calculate_quality_score(results: List[Dict], expected_keywords: List[str]) -> Tuple[float, int]:
    """
    Calculate quality score based on expected keywords found in top results.

    Returns:
        Tuple of (score 0-100, keyword_hits)
    """
    if not results:
        return 0.0, 0

    # Check top 3 results
    top_content = " ".join([r.get("content", "").lower() for r in results[:3]])

    keyword_hits = 0
    for keyword in expected_keywords:
        if keyword.lower() in top_content:
            keyword_hits += 1

    # Score = percentage of expected keywords found
    score = (keyword_hits / len(expected_keywords)) * 100 if expected_keywords else 0

    return score, keyword_hits


def print_results(results: List[Dict], method: str, max_display: int = 3):
    """Print search results in a readable format."""
    print(f"\n  Top {max_display} results:")
    for i, r in enumerate(results[:max_display]):
        content_preview = r.get("content", "")[:100].replace("\n", " ")
        score = r.get("relevance_score", 0)
        search_type = r.get("search_type", "?")

        # Additional info based on method
        extra_info = ""
        if method == "rrf" or method == "rrf_rerank":
            ranks = r.get("rrf_ranks", {})
            extra_info = f" v_rank={ranks.get('vector', '-')}, k_rank={ranks.get('keyword', '-')}"
        if method == "rrf_rerank" and "cross_encoder_score" in r:
            extra_info += f" ce={r.get('cross_encoder_score', 0):.3f}"

        print(f"    {i+1}. [{search_type}] score={score:.4f}{extra_info}")
        print(f"       {content_preview}...")


def main():
    print("=" * 80)
    print("Hybrid Search Method Comparison Test")
    print("=" * 80)

    # Initialize RAG service
    print("\nInitializing RAG service...")
    try:
        from services.rag_service_neo4j import RAGServiceNeo4j
        rag = RAGServiceNeo4j()
        print("✅ RAG service initialized")
    except Exception as e:
        print(f"❌ Failed to initialize RAG service: {e}")
        sys.exit(1)

    methods = ["weighted", "rrf", "rrf_rerank"]
    results_summary = {method: {"total_score": 0, "total_time": 0, "scores": []} for method in methods}

    for test_case in TEST_QUERIES:
        query = test_case["query"]
        expected_keywords = test_case["expected_keywords"]
        description = test_case["description"]

        print(f"\n{'='*80}")
        print(f"Query: \"{query}\"")
        print(f"Description: {description}")
        print(f"Expected keywords: {expected_keywords}")
        print("-" * 80)

        for method in methods:
            print(f"\n📊 Method: {method.upper()}")

            try:
                results, elapsed = test_search_method(rag, query, method)
                quality_score, keyword_hits = calculate_quality_score(results, expected_keywords)

                results_summary[method]["total_score"] += quality_score
                results_summary[method]["total_time"] += elapsed
                results_summary[method]["scores"].append(quality_score)

                print(f"  ⏱️  Time: {elapsed*1000:.0f}ms")
                print(f"  🎯 Quality: {quality_score:.0f}% ({keyword_hits}/{len(expected_keywords)} keywords)")

                print_results(results, method)

            except Exception as e:
                print(f"  ❌ Error: {e}")
                results_summary[method]["scores"].append(0)

    # Print summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)

    num_queries = len(TEST_QUERIES)
    print(f"\n{'Method':<15} {'Avg Quality':<15} {'Avg Time':<15} {'Scores'}")
    print("-" * 70)

    best_method = None
    best_score = -1

    for method in methods:
        avg_score = results_summary[method]["total_score"] / num_queries
        avg_time = (results_summary[method]["total_time"] / num_queries) * 1000
        scores = results_summary[method]["scores"]

        if avg_score > best_score:
            best_score = avg_score
            best_method = method

        print(f"{method:<15} {avg_score:>6.1f}%        {avg_time:>6.0f}ms        {scores}")

    print("-" * 70)
    print(f"\n🏆 Best method: {best_method.upper()} with {best_score:.1f}% average quality")

    # Recommendations
    print("\n📋 Recommendations:")
    for method in methods:
        avg_score = results_summary[method]["total_score"] / num_queries
        avg_time = (results_summary[method]["total_time"] / num_queries) * 1000

        if method == "weighted":
            print(f"  - weighted: Baseline ({avg_score:.0f}% quality, {avg_time:.0f}ms)")
        elif method == "rrf":
            improvement = avg_score - (results_summary["weighted"]["total_score"] / num_queries)
            print(f"  - rrf: {'+' if improvement >= 0 else ''}{improvement:.0f}% vs baseline ({avg_time:.0f}ms)")
        elif method == "rrf_rerank":
            improvement = avg_score - (results_summary["weighted"]["total_score"] / num_queries)
            print(f"  - rrf_rerank: {'+' if improvement >= 0 else ''}{improvement:.0f}% vs baseline ({avg_time:.0f}ms, first call loads model)")

    # Close connection
    rag.close()
    print("\n✅ Test completed")


if __name__ == "__main__":
    main()
