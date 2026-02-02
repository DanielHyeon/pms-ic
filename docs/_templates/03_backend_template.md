# [Module/Service] Backend Documentation

> **Status**: Draft | Review | Final
> **Last Updated**: YYYY-MM-DD
> **Author**: [Name]

<!-- affects: api, data -->
<!-- requires-update: 02_api/, 06_data/ -->

---

## Questions This Document Answers

- What does [module] do internally?
- Where are transaction boundaries?
- What patterns are used and why?
- What are the coding rules for this module?

---

## 1. Module Overview

### Purpose

<!-- What business/technical problem does this module solve? -->

### Key Classes/Components

| Class | Responsibility |
|-------|---------------|
| Controller | HTTP request handling |
| Service | Business logic |
| Repository | Data access |

---

## 2. Domain Model

### Core Entities

```
[Entity diagram or description]
```

### Entity Relationships

| From | To | Type | Description |
|------|----|------|-------------|
| Project | Sprint | 1:N | A project has many sprints |

### State Transitions

```
[State diagram if applicable]
```

---

## 3. Transaction Boundaries

### Creation Operations

| Operation | Transaction Scope | Why |
|-----------|------------------|-----|
| Create X | Single entity | Atomic creation |
| Create X with Y | X + Y together | Data consistency |

### Update Operations

| Operation | Transaction Scope | Why |
|-----------|------------------|-----|
| | | |

### Rules

- **Transaction must include**: [list what must be atomic]
- **Transaction must NOT include**: [list what should be separate]

---

## 4. Async Patterns

### Event/Message Handling

| Event | Handler | When Used |
|-------|---------|-----------|
| | | |

### Why Event/Outbox Pattern?

<!-- Explain the rationale -->

### Failure Handling

- **Retry policy**:
- **Dead letter queue**:
- **Compensation**:

---

## 5. Concurrency Policies

### Optimistic Locking

- **Applies to**: [list entities]
- **Version field**: `version` column
- **Conflict resolution**: [describe approach]

### Pessimistic Locking

- **When used**: [describe scenarios]
- **Lock timeout**: [duration]

---

## 6. Database Access Rules

### Allowed Patterns

- Repository calls through Service layer only
- Reactive chain for all DB operations
- Explicit transaction annotation

### Forbidden Patterns

- Controller -> Repository direct call
- Blocking calls in reactive chain
- N+1 queries

### Query Conventions

```java
// Good
Flux<Entity> findByProjectId(UUID projectId);

// Bad - too generic
Flux<Entity> findAll();
```

---

## 7. Validation Rules

### Input Validation

| Field | Rule | Error Code |
|-------|------|------------|
| | | |

### Business Validation

| Rule | When Checked | Error Code |
|------|--------------|------------|
| | | |

---

## 8. Coding Guidelines

### Naming Conventions

- Services: `[Domain]Service`
- Repositories: `R2dbc[Domain]Repository`
- DTOs: `[Domain]Request`, `[Domain]Response`

### Required Annotations

```java
@Service
@Transactional
@Validated
```

### Error Handling

```java
// Pattern to follow
.onErrorResume(EntityNotFoundException.class, e ->
    Mono.error(new ResourceNotFoundException(e.getMessage())))
```

---

## Related Documents

- [02_api/[resource].md](../02_api/[resource].md) - API specification
- [06_data/database_schema.md](../06_data/database_schema.md) - Schema details
- [ADR-XXX](../99_decisions/ADR-XXX.md) - Design decisions

---

*This document becomes code review criteria.*
