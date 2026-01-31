# Service Boundaries

> **Version**: 1.0 | **Status**: Final | **Last Updated**: 2026-01-31

<!-- affects: backend, llm, data -->

---

## Questions This Document Answers

- Why are services separated this way?
- What happens when one service fails?
- Where are sync/async boundaries?

---

## 1. Service Boundary Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SYNCHRONOUS BOUNDARY                             │
│  ┌─────────────┐         REST          ┌─────────────────────────────┐  │
│  │   Frontend  │◄─────────────────────►│        Backend              │  │
│  │   (React)   │                       │    (Spring WebFlux)         │  │
│  └─────────────┘                       └──────────────┬──────────────┘  │
│                                                       │                  │
└───────────────────────────────────────────────────────│──────────────────┘
                                                        │
                              ┌─────────────────────────┼─────────────────┐
                              │   ASYNC BOUNDARY        │                 │
                              │                         ▼                 │
                              │  ┌──────────────────────────────────────┐│
                              │  │          LLM Service                 ││
                              │  │   ┌────────────────────────────────┐ ││
                              │  │   │ HTTP (timeout: 90s)            │ ││
                              │  │   │ SSE streaming for responses    │ ││
                              │  │   └────────────────────────────────┘ ││
                              │  └──────────────────────────────────────┘│
                              │                                          │
                              └──────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                      EVENT-DRIVEN BOUNDARY                               │
│                                                                         │
│   ┌───────────────┐    Outbox Events    ┌───────────────────────────┐  │
│   │  PostgreSQL   │─────────────────────►│     Neo4j                 │  │
│   │               │    (polling)         │   (graph sync)            │  │
│   └───────────────┘                      └───────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Service Responsibilities

### Backend (Spring Boot)

**Owns:**
- User authentication and authorization
- All transactional data operations
- Business rule enforcement
- API contract with frontend

**Calls:**
- PostgreSQL (R2DBC - reactive)
- Redis (caching, sessions)
- LLM Service (HTTP - with circuit breaker)

**Does NOT:**
- Run LLM inference
- Directly write to Neo4j
- Hold long-lived connections to LLM

### LLM Service (Flask)

**Owns:**
- LLM model management
- RAG pipeline execution
- Response generation
- Neo4j read operations

**Calls:**
- Neo4j (read-only, Cypher queries)
- Local LLM models (GGUF/vLLM)
- Embedding service

**Does NOT:**
- Access PostgreSQL
- Make authorization decisions
- Persist chat history (backend does)

---

## 3. Failure Isolation

| Failure Scenario | Impact | Recovery |
|------------------|--------|----------|
| LLM Service down | AI chat unavailable | Mock response, graceful degradation |
| Neo4j down | RAG unavailable | LLM responds without context |
| PostgreSQL down | System unavailable | Full outage, health check fails |
| Redis down | Cache miss | Direct DB queries, slower |
| Frontend down | UI unavailable | Backend APIs still work |

### Circuit Breaker Configuration

```yaml
# LLM Service circuit breaker
llm-service:
  timeout: 90s
  failure-rate-threshold: 50%
  wait-duration-in-open-state: 60s
  permitted-calls-in-half-open: 3
```

---

## 4. Data Ownership

| Data Type | Primary Store | Replicated To |
|-----------|---------------|---------------|
| User accounts | PostgreSQL (auth) | - |
| Projects, Phases | PostgreSQL (project) | Neo4j (nodes) |
| Tasks, Sprints | PostgreSQL (task) | Neo4j (nodes) |
| Chat sessions | PostgreSQL (chat) | - |
| Reports | PostgreSQL (report) | - |
| Graph relationships | - | Neo4j (relations) |
| Document chunks | - | Neo4j (vectors) |

---

## 5. Integration Points

### Backend → LLM Service

```
Endpoint: POST /api/chat/v2
Timeout: 90 seconds
Retry: 0 (fail fast)
Circuit Breaker: Yes

Success: 200 + SSE stream
Failure: 503 + mock response
```

### PostgreSQL → Neo4j (Outbox)

```
Pattern: Transactional Outbox
Polling interval: 5 minutes
Full sync: 24 hours
Events: CREATE, UPDATE, DELETE
```

---

## 6. Why These Boundaries?

| Decision | Rationale |
|----------|-----------|
| Backend owns all writes | Single source of truth, transactional integrity |
| LLM Service is stateless | Horizontal scaling, easy recovery |
| Event-driven graph sync | Decoupling, eventual consistency acceptable |
| SSE for streaming | Real-time responses without polling |

---

*Last Updated: 2026-01-31*
