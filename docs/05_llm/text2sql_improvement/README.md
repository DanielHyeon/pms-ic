# TextToSQL Improvement Roadmap

## Document Info
| Item | Value |
|------|-------|
| Owner | AI/LLM Team |
| Status | **In Progress** |
| Created | 2026-02-01 |
| Updated | 2026-02-02 |
| Reference | WrenAI Analysis |

---

## 1. Executive Summary

This document outlines the comprehensive improvement plan for the TextToSQL functionality in PMS-IC, based on analysis of the WrenAI project's implementation patterns and best practices.

### Current State Assessment

| Capability | Current | Target | Status |
|------------|---------|--------|--------|
| Semantic Layer | MDL-based (pms_mdl.json) | MDL-based business logic | **Done** |
| Intent Classification | 5 categories | Multi-level (5 categories) | **Done** |
| RAG Storage | Neo4j unified | Dedicated vector collections | Planned |
| Few-shot Retrieval | Vector similarity | Vector similarity search | **Done** |
| Correction Attempts | Max 2 | Max 3 with error strategies | Planned |
| Output Format | Text parsing | JSON Schema enforcement | Planned |
| Observability | Basic logging | Full LLM tracing | Planned |
| Reasoning | None | Chain-of-Thought | Planned |
| Security Validation | 4-layer + bypass detection | Comprehensive security | **Done** |

### Expected Outcomes

- **Accuracy**: SQL generation accuracy improvement from ~70% to ~90%
- **Latency**: Maintain <2s response time with enhanced pipeline
- **Reliability**: Reduce failed queries by 40% through better correction
- **Maintainability**: Structured, observable, and testable components

---

## 2. Architecture Overview

### Current Architecture
```
User Query
    ↓
classify_query_type (SQL/Cypher)
    ↓
generate_query (LLM + keyword few-shot)
    ↓
validate_query (4-layer)
    ↓
correct_query (max 2 attempts)
    ↓
execute_query (safe executor)
    ↓
format_response
```

### Target Architecture
```
User Query
    ↓
┌─────────────────────────────────────┐
│ Intent Classification Pipeline      │
│ (TEXT_TO_SQL/CYPHER/GENERAL/        │
│  MISLEADING/CLARIFICATION)          │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Semantic Layer Resolution           │
│ (MDL → Business Terms → Schema)     │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Chain-of-Thought Reasoning          │
│ (Query decomposition & planning)    │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ RAG-Enhanced Generation             │
│ (Vector few-shot + schema + rules)  │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Multi-Layer Validation              │
│ (Syntax → Schema → Security → Perf) │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Intelligent Correction              │
│ (Error-specific strategies, max 3)  │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Safe Execution + Learning           │
│ (Execute → Store successful pairs)  │
└─────────────────────────────────────┘
    ↓
Structured Response (JSON Schema)
```

---

## 3. Implementation Phases

### Phase 1: Foundation (2 weeks) ✅ COMPLETE

**Focus**: Core infrastructure for semantic understanding and intent handling

| Task | Priority | Effort | Status |
| ---- | -------- | ------ | ------ |
| Semantic Layer (MDL) Design | High | 3d | ✅ Done |
| MDL Schema Definition | High | 2d | ✅ Done |
| Intent Classification Extension | High | 3d | ✅ Done |
| Few-shot Vectorization | High | 3d | ✅ Done |
| Dynamic Top-K with Score Threshold | High | 2d | ✅ Done |
| Relationship-Aware Expansion | High | 2d | ✅ Done |
| Intent-Based Filtering | High | 1d | ✅ Done |

**Deliverables**:

- ✅ `semantic_layer.py` - MDL parser and resolver with dynamic scoring
- ✅ `pms_mdl.json` - Business metadata definitions
- ✅ Enhanced intent classifier with 5 categories
- ✅ Vector-based few-shot retrieval
- ✅ Relationship-aware table expansion

**Success Criteria**:

- [x] MDL covers 100% of project-scoped tables
- [x] Intent classification accuracy > 95% (achieved: 100%)
- [x] Table relevance improved (56.3% → >70%)

→ [Phase 1 Detailed Plan](./phase1_foundation.md)

---

### Phase 2: Enhancement (2 weeks)
**Focus**: Quality improvements and advanced generation features

| Task | Priority | Effort | Dependencies |
|------|----------|--------|--------------|
| Structured Output (JSON Schema) | High | 2d | None |
| Chain-of-Thought Reasoning | High | 3d | None |
| SQL Correction Enhancement | Medium | 2d | None |
| Error-Specific Strategies | Medium | 2d | Correction Enhancement |
| SQL Knowledge Components | Medium | 2d | Semantic Layer |

**Deliverables**:
- Pydantic models for all LLM outputs
- Reasoning node in LangGraph workflow
- 3-attempt correction with error strategies
- Calculated fields and metrics support

**Success Criteria**:
- [ ] 100% structured output compliance
- [ ] Reasoning improves complex query accuracy by 20%
- [ ] Correction success rate > 80%

→ [Phase 2 Detailed Plan](./phase2_enhancement.md)

---

### Phase 3: Observability (1 week)
**Focus**: Production readiness and monitoring

| Task | Priority | Effort | Dependencies |
|------|----------|--------|--------------|
| LLM Tracing Integration | Medium | 2d | None |
| Cost Tracking | Medium | 1d | Tracing |
| Quality Metrics Dashboard | Low | 2d | Tracing |
| Alerting Setup | Low | 1d | Dashboard |

**Deliverables**:
- Langfuse/OpenTelemetry integration
- Token usage and cost tracking
- Grafana dashboard for LLM metrics
- Automated quality alerts

**Success Criteria**:
- [ ] 100% LLM call tracing coverage
- [ ] Real-time cost visibility
- [ ] Automated alerts for quality degradation

→ [Phase 3 Detailed Plan](./phase3_observability.md)

---

## 4. Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| LLM latency increase | High | Medium | Parallel retrieval, caching |
| Vector DB learning curve | Medium | Low | Start with Neo4j vector index |
| MDL maintenance overhead | Medium | Medium | Auto-generation from schema |
| Breaking existing queries | High | Low | Comprehensive test suite |

---

## 5. Resource Requirements

### Team
- 1 Senior Backend Developer (LLM focus)
- 1 Data Engineer (Vector DB, Schema)
- 0.5 DevOps (Observability setup)

### Infrastructure
- Qdrant or Neo4j Vector Index (existing)
- Langfuse Cloud or Self-hosted
- Additional Redis cache for MDL

### Timeline
| Phase | Duration | Start | End |
|-------|----------|-------|-----|
| Phase 1 | 2 weeks | Week 1 | Week 2 |
| Phase 2 | 2 weeks | Week 3 | Week 4 |
| Phase 3 | 1 week | Week 5 | Week 5 |
| **Total** | **5 weeks** | | |

---

## 6. Quick Wins (Immediate)

These can be implemented before the formal phases:

1. **Increase correction attempts to 3**
   - File: `llm-service/text2query/query_corrector.py`
   - Change: `max_attempts = 3`
   - Effort: 5 minutes

2. **Add 20+ domain-specific few-shot examples**
   - File: `llm-service/text2query/fewshot_manager.py`
   - Effort: 2 hours

3. **Improve error messages**
   - File: `llm-service/text2query/query_validator.py`
   - Effort: 1 hour

---

## 7. Related Documents

- [Phase 1: Foundation](./phase1_foundation.md)
- [Phase 2: Enhancement](./phase2_enhancement.md)
- [Phase 3: Observability](./phase3_observability.md)
- [RAG Pipeline](../rag_pipeline.md)
- [LLM Scope](../llm_scope.md)

---

## 8. Appendix: WrenAI Reference

Key patterns adopted from WrenAI:

| Pattern | WrenAI Implementation | Our Adaptation |
|---------|----------------------|----------------|
| Semantic Layer | MDL JSON Schema | Simplified MDL for PMS domain |
| Intent Classification | Hamilton Pipeline | LangGraph Node |
| Few-shot Storage | Qdrant collections | Neo4j Vector Index |
| SQL Correction | Max 3 attempts | Same |
| Structured Output | Pydantic + JSON Schema | Same |
| Observability | Langfuse | Langfuse or OpenTelemetry |
