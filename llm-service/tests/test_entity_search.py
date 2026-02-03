#!/usr/bin/env python3
"""Test script to verify entity chunks are searchable via RAG."""

import logging
logging.basicConfig(level=logging.WARNING)

from services.rag_service_neo4j import RAGServiceNeo4j

def main():
    print("Initializing RAG service...")
    rag = RAGServiceNeo4j()

    print("\nSearching for: '현재 프로젝트 진행 현황'")
    print("Filter: project_id=proj-001, access_level=4")
    print("-" * 60)

    results = rag.search(
        '현재 프로젝트 진행 현황',
        top_k=5,
        filter_metadata={'project_id': 'proj-001', 'user_access_level': 4}
    )

    print(f"\nFound {len(results)} results:\n")

    for i, r in enumerate(results):
        title = r.get('title', 'N/A')
        score = r.get('relevance_score', 0)
        entity_type = r.get('entity_type', 'document')
        content = r.get('content', '')[:200]

        print(f"[{i+1}] Title: {title}")
        print(f"    Score: {score:.4f}")
        print(f"    Entity Type: {entity_type}")
        print(f"    Content: {content}...")
        print()

if __name__ == "__main__":
    main()
