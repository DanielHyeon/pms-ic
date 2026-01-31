# System Overview

> **Version**: 2.0 | **Status**: Final | **Last Updated**: 2026-01-31

<!-- affects: frontend, backend, llm, data -->

---

## Questions This Document Answers

- What is the overall system structure?
- How do components interact?
- What are the key architectural boundaries?

---

## 1. Four-Layer Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                                  │
│  React SPA with TypeScript                                          │
│  - 26 pages across 9 zones                                          │
│  - 23 custom hooks                                                  │
│  - Zustand state management                                         │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ REST + SSE
┌─────────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                               │
│  Spring Boot 3.5 (WebFlux + R2DBC)                                 │
│  - 38 Controllers                                                   │
│  - 150+ REST endpoints                                              │
│  - Project-Scoped RBAC                                              │
│  - JWT Authentication                                               │
└─────────────────────────────────────────────────────────────────────┘
                          │                    │
                          ▼                    ▼
┌────────────────────────────────┐    ┌───────────────────────────────┐
│        DATA LAYER              │    │       AI LAYER                │
│  PostgreSQL + Redis + Neo4j    │    │  Flask + LangGraph            │
│  - Transactional operations    │    │  - Two-Track inference        │
│  - Session management          │    │  - Hybrid RAG                 │
│  - Graph-based RAG             │    │  - GGUF/vLLM Gateway          │
└────────────────────────────────┘    └───────────────────────────────┘
```

---

## 2. Component Responsibilities

| Component | Responsibility | Does NOT Do |
|-----------|---------------|-------------|
| **Frontend** | UI rendering, state management | Business logic, direct DB access |
| **Backend** | Business logic, authorization | LLM inference, graph traversal |
| **LLM Service** | AI inference, RAG search | Data persistence, authorization |
| **PostgreSQL** | Transactional data | Complex graph queries |
| **Neo4j** | Graph relationships, vector search | Primary data storage |
| **Redis** | Caching, session storage | Persistent data |

---

## 3. Communication Patterns

### Synchronous (REST)

| From | To | Purpose |
|------|----|----|
| Frontend | Backend | All API calls |
| Backend | LLM Service | Chat requests (with timeout) |

### Asynchronous (Event-based)

| From | To | Mechanism | Purpose |
|------|----|----|---------|
| Backend | Neo4j | Outbox Pattern | Graph sync |
| LLM Service | Frontend | SSE | Streaming responses |

### Data Replication

| Source | Target | Pattern | Delay |
|--------|--------|---------|-------|
| PostgreSQL | Neo4j | Outbox + Polling | < 5 minutes |

---

## 4. Boundary Decisions

### Why Separate LLM Service?

1. **Different scaling profile**: CPU/GPU intensive vs I/O intensive
2. **Failure isolation**: LLM failures don't cascade to core operations
3. **Technology stack**: Python ML ecosystem vs Java enterprise
4. **Independent deployment**: Can upgrade models without backend changes

### Why Neo4j for RAG?

1. **Graph traversal**: Relationships between entities
2. **Vector index**: Native support for similarity search
3. **Cypher queries**: Flexible knowledge retrieval
4. **Separation of concerns**: Read-heavy RAG vs write-heavy PostgreSQL

---

## 5. Key Constraints

| Constraint | Rationale |
|------------|-----------|
| Backend never calls Neo4j directly for writes | Transactional consistency |
| LLM Service never accesses PostgreSQL | Security, separation |
| Frontend never stores sensitive data | Security |
| All API calls require JWT | Authentication |

---

## 6. Evidence Sources

- Architecture decision: [../99_decisions/ADR-001-service-separation.md](../99_decisions/ADR-001-service-separation.md)
- Implementation: [../../docker-compose.yml](../../docker-compose.yml)

---

*Last Updated: 2026-01-31*
