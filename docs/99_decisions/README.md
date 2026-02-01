# Architecture Decision Records (ADR)

> **Version**: 1.1 | **Last Updated**: 2026-02-02

---

## Purpose

This directory contains Architecture Decision Records (ADRs) documenting significant technical decisions made in this project.

ADRs answer the question: **"Why did we build it this way?"**

---

## Why ADRs Matter

| Without ADRs | With ADRs |
|--------------|-----------|
| "Why is this like this?" | Clear documented rationale |
| Repeated debates | Reference past decisions |
| Context lost with people | Context preserved in docs |
| Inconsistent decisions | Pattern-based decisions |

---

## ADR Format

Each ADR follows this structure:

```markdown
# ADR-XXX: [Decision Title]

## Status
Accepted | Deprecated | Superseded by ADR-YYY

## Context
What is the issue that we're seeing that is motivating this decision?

## Considered Options
1. Option A
2. Option B
3. Option C

## Decision
What is the change that we're proposing and/or doing?

## Rationale
Why is this decision the best option?

## Consequences
- Positive impacts
- Negative impacts
- Risks

## Review Conditions
When should this decision be revisited?
```

---

## Index of Decisions

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [ADR-001](./ADR-001-service-separation.md) | Backend and LLM Service Separation | Accepted | 2026-01-31 |
| [ADR-002](./ADR-002-outbox-pattern.md) | PostgreSQL to Neo4j Sync via Outbox | Accepted | 2026-01-31 |
| [ADR-003](./ADR-003-two-track-llm.md) | Two-Track LLM Workflow | Accepted | 2026-01-31 |
| [ADR-004](./ADR-004-project-scoped-rbac.md) | Project-Scoped RBAC | Accepted | 2026-01-26 |
| [ADR-005](./ADR-005-query-validation-security.md) | Query Validation Security Layer | Accepted | 2026-02-02 |

---

## When to Create an ADR

Create an ADR when:

- Choosing between multiple viable options
- Making a decision that's hard to reverse
- Establishing a pattern for future work
- Deviating from common practice
- Adding significant new technology

---

## ADR Lifecycle

```
PROPOSED → ACCEPTED → [DEPRECATED | SUPERSEDED]
    │
    └── REJECTED (documented why)
```

---

*ADRs are "immutable" once accepted. To change a decision, create a new ADR that supersedes the old one.*
