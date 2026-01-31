# LLM Service Architecture

> **Version**: 2.0 | **Status**: Final | **Last Updated**: 2026-01-31

---

## Questions This Document Answers

- What does the AI do and NOT do?
- How trustworthy are AI responses?
- How does the RAG pipeline work?
- When does which model get used?

---

## Why This Section is Separate

LLM systems are fundamentally different from traditional software:

| Aspect | Traditional Software | LLM Systems |
|--------|---------------------|-------------|
| Determinism | Same input → Same output | Same input → Variable output |
| Failure mode | Crashes, errors | Hallucinations, irrelevance |
| Testing | Unit tests | Evaluation metrics |
| Liability | Clear ownership | Shared human-AI responsibility |

---

## Documents in This Section

| Document | Purpose |
|----------|---------|
| [llm_scope.md](./llm_scope.md) | What AI does and doesn't do |
| [prompt_policy.md](./prompt_policy.md) | Prompt design guidelines |
| [rag_pipeline.md](./rag_pipeline.md) | Retrieval-Augmented Generation |
| [two_track_workflow.md](./two_track_workflow.md) | Model selection logic |
| [evaluation.md](./evaluation.md) | Response quality metrics |

---

## Quick Reference

### Two-Track Workflow

```
User Query
    │
    ▼
┌─────────────────┐
│ Intent Classify │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│Track A│ │Track B│
│ (L1)  │ │ (L2)  │
│ Fast  │ │Quality│
│ 2-4B  │ │ 8-12B │
└───┬───┘ └───┬───┘
    │         │
    └────┬────┘
         │
         ▼
    Final Response
```

### Track Selection

| Query Type | Track | Max Tokens | Model |
|------------|-------|------------|-------|
| Definition questions | A (L1) | 300 | LFM2-2.6B |
| Simple FAQ | A (L1) | 1800 | LFM2-2.6B |
| Report generation | B (L2) | 3000 | Gemma-12B |
| Complex analysis | B (L2) | 3000 | Gemma-12B |

### RAG Pipeline

```
Query → Embedding → Hybrid Search → RRF Merge → Context → LLM → Response
         (E5)      (Vector+KW)    (Rank Fusion)
```

---

## Key Decisions

### AI Authority Levels

| Level | Description | Human Approval |
|-------|-------------|----------------|
| **SUGGEST** | AI recommends only | Not needed |
| **DECIDE** | AI makes decision | Review recommended |
| **EXECUTE** | AI performs action | Logged, monitored |
| **COMMIT** | AI commits change | Required |

### Trust Boundaries

| Trust Level | Source | Example |
|-------------|--------|---------|
| HIGH | Database values | Task count, progress % |
| MEDIUM | RAG retrieval | Referenced documents |
| LOW | LLM generation | Summaries, suggestions |

---

## Related Documents

| Document | Description |
|----------|-------------|
| [../01_architecture/](../01_architecture/) | System architecture |
| [../06_data/neo4j_model.md](../06_data/neo4j_model.md) | Graph schema for RAG |

---

*Last Updated: 2026-01-31*
