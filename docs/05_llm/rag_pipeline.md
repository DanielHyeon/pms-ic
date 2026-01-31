# RAG Pipeline

> **Version**: 2.0 | **Status**: Final | **Last Updated**: 2026-01-31

<!-- affects: llm, data -->

---

## Questions This Document Answers

- How does document retrieval work?
- What is Hybrid Search?
- How does RRF merge results?

---

## 1. Pipeline Overview

```
User Query
    │
    ▼
┌─────────────────────────┐
│    Query Preprocessing   │
│  - Language detection    │
│  - Query expansion       │
└───────────┬─────────────┘
            │
    ┌───────┴───────┐
    │               │
    ▼               ▼
┌─────────────┐ ┌─────────────┐
│Vector Search│ │Keyword Search│
│ (Embedding) │ │  (Lucene)    │
│ E5-Large    │ │ chunk_fts    │
└──────┬──────┘ └──────┬──────┘
       │               │
       └───────┬───────┘
               │
               ▼
       ┌───────────────┐
       │   RRF Merge   │
       │ (Rank Fusion) │
       └───────┬───────┘
               │
               ▼
       ┌───────────────┐
       │ Graph Expand  │
       │ (Optional)    │
       └───────┬───────┘
               │
               ▼
       ┌───────────────┐
       │ Context Build │
       │ (Chunk + Meta)│
       └───────┬───────┘
               │
               ▼
         LLM Generation
```

---

## 2. Hybrid Search

### Vector Search

| Component | Value |
|-----------|-------|
| Embedding Model | multilingual-e5-large |
| Dimensions | 1024 |
| Similarity | Cosine |
| Index | chunk_vector_index |

```cypher
CALL db.index.vector.queryNodes(
  'chunk_vector_index',
  10,
  $query_embedding
) YIELD node, score
RETURN node.content, score
```

### Keyword Search

| Component | Value |
|-----------|-------|
| Index Type | Fulltext (Lucene) |
| Index Name | chunk_fulltext |
| Fields | content, title |
| Boost | Title +0.3, Definition +0.4 |

```cypher
CALL db.index.fulltext.queryNodes(
  'chunk_fulltext',
  $query
) YIELD node, score
RETURN node.content, score
```

---

## 3. RRF (Reciprocal Rank Fusion)

### Formula

```
RRF_score(d) = Σ 1 / (k + rank_i(d))

where:
  d = document
  k = constant (default: 60)
  rank_i(d) = document rank in list i
```

### Example Calculation

```
Vector Results:              Keyword Results:
Rank 1: Doc_A (0.95)        Rank 1: Doc_A (8.5)
Rank 2: Doc_B (0.82)        Rank 2: Doc_C (7.2)
Rank 3: Doc_C (0.78)        Rank 3: Doc_D (6.1)

RRF with k=60:
Doc_A: 1/(60+1) + 1/(60+1) = 0.0328 ← Highest
Doc_C: 1/(60+3) + 1/(60+2) = 0.0320
Doc_B: 1/(60+2) + 0        = 0.0161
Doc_D: 0        + 1/(60+3) = 0.0159

Final: Doc_A > Doc_C > Doc_B > Doc_D
```

### Why RRF?

| Advantage | Explanation |
|-----------|-------------|
| Scale-invariant | Works with different score ranges |
| Robust | Not sensitive to score outliers |
| Fast | Simple arithmetic, no normalization |
| Effective | Proven in IR research |

---

## 4. Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HYBRID_SEARCH_ENABLED` | true | Enable hybrid search |
| `HYBRID_MERGE_METHOD` | rrf | rrf, weighted, rrf_rerank |
| `HYBRID_VECTOR_WEIGHT` | 0.4 | Weight for vector (if weighted) |
| `HYBRID_KEYWORD_WEIGHT` | 0.6 | Weight for keyword (if weighted) |
| `RRF_K` | 60 | RRF k constant |

### Merge Methods

| Method | Speed | Quality | Use Case |
|--------|-------|---------|----------|
| `rrf` | Fast (36ms) | Good | **Default, recommended** |
| `weighted` | Medium (129ms) | Good | When tuning needed |
| `rrf_rerank` | Slow (1667ms) | Better (English) | English-only |

---

## 5. Relevance Thresholds

### Score Interpretation

| Method | Score Range | Min Threshold |
|--------|-------------|---------------|
| RRF | 0 - 0.033 | 0.005 |
| Weighted | 0 - 1.0 | 0.3 |

### "Out of Scope" Decision

```python
if max_score < MIN_RELEVANCE_SCORE:
    return "No relevant information found"
```

---

## 6. Graph Expansion (Optional)

After hybrid search, optionally expand context via graph:

```cypher
MATCH (c:Chunk)-[:BELONGS_TO]->(d:Document)
MATCH (d)-[:BELONGS_TO]->(p:Project {id: $project_id})
WHERE c.chunk_id IN $chunk_ids
OPTIONAL MATCH (c)-[:NEXT_CHUNK]->(next:Chunk)
RETURN c, d, next
```

---

## 7. Performance Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Search latency | < 100ms | 36ms (RRF) |
| Relevance (MRR) | > 0.5 | 0.55 |
| Top-3 recall | > 0.7 | 0.72 |

---

*Last Updated: 2026-01-31*
