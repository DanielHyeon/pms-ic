# [System/Component] Architecture

> **Status**: Draft | Review | Final
> **Last Updated**: YYYY-MM-DD
> **Author**: [Name]

<!-- affects: api, frontend, backend, llm -->
<!-- requires-update: [list documents that must be updated if this changes] -->

---

## Questions This Document Answers

- Why is [system] structured this way?
- What are the boundaries between components?
- What happens when something fails?

---

## 1. Architecture Overview

### Diagram

```
[Insert Mermaid or link to diagram]
```

### Design Principles

1. **Principle 1**: Explanation
2. **Principle 2**: Explanation
3. **Principle 3**: Explanation

---

## 2. Component Responsibilities

| Component | Responsibility | Does NOT Do |
|-----------|---------------|-------------|
| Backend API | | |
| LLM Service | | |
| Frontend | | |

---

## 3. Service Boundaries

### Why These Boundaries?

<!-- Explain the rationale for how services are divided -->

### Sync vs Async Communication

| From | To | Type | Why |
|------|----|------|-----|
| Frontend | Backend | Sync (HTTP) | |
| Backend | LLM | Async (Queue) | |

### Data Sharing Rules

- **Allowed**: [describe allowed patterns]
- **Forbidden**: [describe forbidden patterns]

---

## 4. Failure Handling

### When LLM Fails

- Behavior:
- Fallback:
- User notification:

### When Database Fails

- Behavior:
- Fallback:
- Recovery:

### When External Service Fails

- Behavior:
- Timeout policy:
- Retry policy:

---

## 5. Decisions

### Why This Architecture?

| Decision | Chosen Option | Rejected Alternative | Reason |
|----------|--------------|---------------------|--------|
| | | | |

### Related ADRs

- [ADR-XXX](../99_decisions/ADR-XXX.md)

---

## 6. Constraints

### Technical Constraints

- Constraint 1: Reason
- Constraint 2: Reason

### Business Constraints

- Constraint 1: Reason
- Constraint 2: Reason

---

## Related Documents

- [00_overview/README.md](../00_overview/README.md) - What this system is
- [03_backend/module_structure.md](../03_backend/module_structure.md) - Implementation details

---

*Focus on "why this boundary exists", not "what exists where"*
