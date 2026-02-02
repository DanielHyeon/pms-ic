# [Agent/Feature] LLM Documentation

> **Status**: Draft | Review | Final
> **Last Updated**: YYYY-MM-DD
> **Author**: [Name]

<!-- affects: backend, frontend -->
<!-- requires-update: 01_architecture/, 99_decisions/ -->

---

## Questions This Document Answers

- What does [LLM feature] do and NOT do?
- How reliable is it?
- What happens when it fails?
- How should we interpret its outputs?

---

## 1. LLM Role Definition

### What It Does

- Capability A
- Capability B
- Capability C

### What It Does NOT Do

- **Does NOT**: Make final database state decisions
- **Does NOT**: Determine user permissions
- **Does NOT**: Calculate numeric values for business logic
- **Does NOT**: [specific limitation]

### Why These Boundaries?

<!-- Explain the rationale for LLM scope limitations -->

---

## 2. Trust Level

### Classification

| Output Type | Trust Level | Requires Human Review |
|-------------|-------------|----------------------|
| Summaries | Medium | For critical decisions |
| Recommendations | Low | Always |
| Factual queries | High (with RAG) | Spot check |

### Confidence Scoring

- **0.0 - 0.3**: Low confidence, require human review
- **0.4 - 0.7**: Medium confidence, flag for attention
- **0.8 - 1.0**: High confidence, can proceed

### Evidence Requirements

All LLM outputs must include:
- Source document references
- Confidence score
- Uncertainty flags

---

## 3. Prompt Policy

### System Prompt Structure

```
[Role definition]
[Constraints and boundaries]
[Output format requirements]
[Safety guidelines]
```

### Prompt Versioning

| Version | Date | Changes | ADR |
|---------|------|---------|-----|
| v1.0 | YYYY-MM-DD | Initial | ADR-XXX |
| v1.1 | YYYY-MM-DD | [Changes] | ADR-YYY |

### Forbidden in Prompts

- User-provided content without sanitization
- Direct database query construction
- Permission elevation instructions

---

## 4. RAG Pipeline

### Data Sources

| Source | Type | Update Frequency | Priority |
|--------|------|------------------|----------|
| Technical docs | Vector | On change | High |
| ADRs | Graph | On change | High |
| Code comments | Vector | Daily | Medium |

### Retrieval Strategy

- **Vector Search**: For semantic similarity
- **Graph Traversal**: For relationship-based queries
- **Hybrid**: Combine both with RRF

### Quality Thresholds

| Metric | Threshold | Action if Below |
|--------|-----------|-----------------|
| Relevance score | 0.7 | Expand query |
| Chunk coverage | 3+ sources | Flag low evidence |

---

## 5. Tool Calling

### Available Tools

| Tool | Purpose | Authority Level |
|------|---------|-----------------|
| retrieve_docs | Fetch relevant documents | SUGGEST |
| retrieve_graph | Query knowledge graph | SUGGEST |
| analyze_risk | Assess project risks | DECIDE |

### Tool Invocation Rules

- **Always call**: retrieve_docs for factual questions
- **Never call**: write operations without explicit approval
- **Conditional**: [tool] only when [condition]

---

## 6. Failure Handling

### LLM Service Unavailable

- **User notification**: "AI assistant is temporarily unavailable"
- **Fallback**: Show cached suggestions or manual input
- **Retry**: 3 attempts with exponential backoff

### Low Quality Response

- **Detection**: Confidence < 0.3 or no evidence
- **Action**: Request clarification from user
- **Escalation**: Flag for human review

### Hallucination Prevention

- All factual claims must cite sources
- Numeric values must come from database, not LLM
- Dates and deadlines must be retrieved, not generated

---

## 7. Evaluation Criteria

### Quality Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Groundedness | > 90% | Citations present |
| Relevance | > 85% | User feedback |
| Latency | < 5s | P95 response time |

### Testing Requirements

- Unit tests for prompt templates
- Integration tests for RAG pipeline
- Evaluation set for response quality

---

## 8. Security Considerations

### Input Sanitization

- Strip prompt injection attempts
- Limit input length
- Validate against allowed patterns

### Output Filtering

- Remove PII before display
- Sanitize any generated code
- Validate JSON structure

---

## Related Documents

- [01_architecture/system_overview.md](../01_architecture/system_overview.md) - System boundaries
- [ADR-XXX](../99_decisions/ADR-XXX.md) - LLM scope decision
- [rag_pipeline.md](./rag_pipeline.md) - RAG implementation details

---

*Never mix LLM docs with API docs. LLM is non-deterministic with different failure patterns.*
