#!/usr/bin/env python3
"""Test search specifically for entity chunks."""

import os
import sys

def main():
    from sentence_transformers import SentenceTransformer
    from neo4j import GraphDatabase

    print("Connecting to Neo4j...")
    driver = GraphDatabase.driver(
        os.getenv('NEO4J_URI', 'bolt://neo4j:7687'),
        auth=('neo4j', 'pmspassword123')
    )

    print("Loading embedding model...")
    model = SentenceTransformer('intfloat/multilingual-e5-large', device='cuda')

    query = '현재 프로젝트 진행 현황 알려줘'
    print(f"\nQuery: {query}")

    embedding = model.encode(f'query: {query}').tolist()

    with driver.session() as session:
        # Search ALL chunks first
        print("\n=== All Chunks (Top 5) ===")
        result = session.run('''
            CALL db.index.vector.queryNodes("chunk_embeddings", 10, $embedding)
            YIELD node AS c, score
            WHERE c.project_id = "proj-001" OR c.project_id = "default"
            RETURN c.title as title, c.structure_type as stype, c.entity_type as etype, score
            ORDER BY score DESC
            LIMIT 5
        ''', embedding=embedding)

        for r in result:
            stype = r["stype"] or "doc"
            etype = r["etype"] or "-"
            title = (r["title"] or "N/A")[:50]
            print(f"  [{stype}:{etype}] {title} (score: {r['score']:.4f})")

        # Search ONLY entity chunks
        print("\n=== Entity Chunks Only (Top 5) ===")
        result = session.run('''
            CALL db.index.vector.queryNodes("chunk_embeddings", 20, $embedding)
            YIELD node AS c, score
            WHERE c.structure_type = "entity"
              AND c.project_id = "proj-001"
            RETURN c.title as title, c.entity_type as etype, score
            ORDER BY score DESC
            LIMIT 5
        ''', embedding=embedding)

        for r in result:
            etype = r["etype"] or "-"
            title = (r["title"] or "N/A")[:50]
            print(f"  [{etype}] {title} (score: {r['score']:.4f})")

    driver.close()
    print("\nDone.")

if __name__ == "__main__":
    main()
