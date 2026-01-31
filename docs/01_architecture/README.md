# System Architecture

> **Version**: 2.0 | **Status**: Final | **Last Updated**: 2026-01-31

---

## Questions This Document Answers

- How is the system structured?
- Why are services separated this way?
- Where do failures get isolated?
- What are the sync/async boundaries?

---

## 1. Architecture Documents

| Document | Purpose |
|----------|---------|
| [system_overview.md](./system_overview.md) | High-level system structure |
| [logical_architecture.md](./logical_architecture.md) | Logical component design |
| [physical_architecture.md](./physical_architecture.md) | Deployment architecture |
| [service_boundaries.md](./service_boundaries.md) | Service separation rationale |
| [data_flow.md](./data_flow.md) | Data movement patterns |
| [failure_handling.md](./failure_handling.md) | Failure isolation strategy |

---

## 2. Quick Overview

### Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Frontend** | React + TypeScript + Vite | React 18, Vite 5 |
| **Backend** | Spring Boot + WebFlux + R2DBC | Spring Boot 3.5, Java 21 |
| **LLM Service** | Flask + LangGraph | Python 3.11 |
| **Database** | PostgreSQL | 15 |
| **Graph DB** | Neo4j | 5.20 |
| **Cache** | Redis | 7 |

### Service Ports

| Service | Port | Purpose |
|---------|------|---------|
| Frontend | 5173 | React SPA |
| Backend | 8083 | Spring Boot API |
| LLM Service | 8000 | AI/LLM processing |
| PostgreSQL | 5433 | Primary database |
| Redis | 6379 | Cache & sessions |
| Neo4j | 7687 (Bolt), 7474 (HTTP) | Graph database |

---

## 3. System Diagram

```
                           ┌──────────────────────────────────┐
                           │       React SPA (5173)           │
                           │  Dashboard | Kanban | AI Chat    │
                           └────────────────┬─────────────────┘
                                           │ REST API
                           ┌────────────────▼─────────────────┐
                           │   Spring Boot Backend (8083)     │
                           │   ┌────────────────────────────┐ │
                           │   │ 38 Controllers             │ │
                           │   │ 80+ Entities               │ │
                           │   │ 40+ Services               │ │
                           │   │ Project-Scoped RBAC        │ │
                           │   └────────────────────────────┘ │
                           └──────┬─────────────┬─────────────┘
                                  │ R2DBC       │ HTTP
          ┌───────────────────────┘             └──────────────────────┐
          ▼                                                            ▼
┌──────────────────────┐                              ┌────────────────────────────┐
│  PostgreSQL (5433)   │                              │   LLM Service (8000)       │
│  ├── auth (3 tables) │                              │   ┌──────────────────────┐ │
│  ├── project (31)    │                              │   │ Two-Track Workflow   │ │
│  ├── task (7)        │                              │   │ ├─ L1: Fast (2.6B)   │ │
│  ├── chat (4)        │                              │   │ └─ L2: Quality (12B) │ │
│  ├── report (13)     │                              │   │ Hybrid RAG           │ │
│  └── Total: 54+ tbl  │                              │   │ 6 Subagents          │ │
└──────────┬───────────┘                              │   │ 10 Skills            │ │
           │ Outbox Pattern                           │   └──────────────────────┘ │
           ▼                                          └─────────────┬──────────────┘
┌──────────────────────┐                                            │ Cypher
│    Neo4j (7687)      │◄───────────────────────────────────────────┘
│  ├── 12 Node Types   │
│  ├── 17 Relationship │
│  └── Vector Index    │
└──────────────────────┘
```

---

## 4. Design Principles

### Decisions

1. **Service Separation**: Backend and LLM are separate services
   - Rationale: Different scaling needs, failure isolation

2. **Reactive Stack**: WebFlux + R2DBC for backend
   - Rationale: Non-blocking I/O for better throughput

3. **Outbox Pattern**: PostgreSQL → Neo4j sync
   - Rationale: Transactional consistency, eventual consistency for graph

### Prohibited

- Direct Neo4j writes from Backend (use Outbox)
- Synchronous calls from Backend to LLM for critical paths
- Sharing database connections between services

---

## 5. Related Documents

| Document | Description |
|----------|-------------|
| [../05_llm/](../05_llm/) | LLM service architecture |
| [../06_data/](../06_data/) | Data architecture |
| [../08_operations/](../08_operations/) | Deployment and operations |

---

*Last Updated: 2026-01-31*
