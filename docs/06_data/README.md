# Data Architecture

> **Version**: 1.0 | **Status**: Final | **Last Updated**: 2026-01-31

---

## Questions This Document Answers

- What data exists and where is it stored?
- How does data flow through the system?
- How is data synchronized between stores?

---

## Documents in This Section

| Document | Purpose |
|----------|---------|
| [database_schema.md](./database_schema.md) | PostgreSQL table structures |
| [entity_relationship.md](./entity_relationship.md) | ER diagrams and relationships |
| [neo4j_model.md](./neo4j_model.md) | Graph nodes and relationships |
| [data_lifecycle.md](./data_lifecycle.md) | Data creation, usage, deletion |

---

## 1. Data Store Overview

| Store | Purpose | Data Types |
|-------|---------|------------|
| **PostgreSQL** | Primary transactional data | Users, Projects, Tasks, etc. |
| **Neo4j** | Graph relationships, RAG | Nodes, Relations, Embeddings |
| **Redis** | Caching, sessions | Session tokens, query cache |

---

## 2. Schema Summary

### PostgreSQL (6 Schemas, 54+ Tables)

| Schema | Tables | Purpose |
|--------|--------|---------|
| **auth** | 3 | User accounts, permissions |
| **project** | 31 | Projects, phases, WBS, deliverables |
| **task** | 7 | Tasks, sprints, user stories |
| **chat** | 4 | AI chat sessions and messages |
| **report** | 13 | Report templates and generated reports |

### Neo4j (12 Node Types, 17 Relationship Types)

| Category | Count | Examples |
|----------|-------|----------|
| **Entity Nodes** | 12 | Project, Phase, Task, Sprint |
| **Relationships** | 17 | HAS_PHASE, DEPENDS_ON, ASSIGNED_TO |
| **Document Nodes** | 2 | Document, Chunk |
| **Indexes** | 3 | Vector, Fulltext, Unique |

---

## 3. Data Flow Patterns

### Write Path (User → PostgreSQL → Neo4j)

```
User Action
    │
    ▼
Frontend (Optimistic UI)
    │
    ▼
Backend API
    │
    ├─── PostgreSQL (Transactional Write)
    │         │
    │         ▼
    │    Outbox Event
    │
    └─── Response to Frontend

[Async] Outbox Poller
    │
    ▼
Neo4j Sync (Node/Relationship Update)
```

### Read Path (RAG Query)

```
User Query
    │
    ▼
LLM Service
    │
    ├─── Neo4j (Hybrid Search)
    │         │
    │         ▼
    │    Chunks + Graph Context
    │
    └─── LLM Generation with Context
```

---

## 4. Key Design Decisions

### Why PostgreSQL for Primary Data?

| Reason | Benefit |
|--------|---------|
| ACID transactions | Data consistency |
| R2DBC support | Reactive performance |
| Schema enforcement | Data integrity |
| Mature ecosystem | Tooling, backup, monitoring |

### Why Neo4j for RAG?

| Reason | Benefit |
|--------|---------|
| Graph traversal | Relationship-aware retrieval |
| Vector index | Similarity search |
| Cypher queries | Flexible knowledge extraction |
| Read-optimized | High RAG throughput |

### Why Not Direct Neo4j Writes?

| Constraint | Rationale |
|------------|-----------|
| No ACID | Can't guarantee consistency |
| Sync complexity | Two-phase commit issues |
| Single source of truth | PostgreSQL is authoritative |

---

## 5. Data Synchronization

### Outbox Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                    Transactional Boundary                        │
│                                                                  │
│  INSERT INTO project.tasks (...)                                │
│  INSERT INTO project.outbox_events (entity, action, payload)    │
│                                                                  │
│  COMMIT                                                         │
└─────────────────────────────────────────────────────────────────┘

[Every 5 minutes]

┌─────────────────────────────────────────────────────────────────┐
│                    Outbox Poller Service                         │
│                                                                  │
│  SELECT * FROM outbox_events WHERE processed = false            │
│  → Apply to Neo4j                                               │
│  UPDATE outbox_events SET processed = true                      │
└─────────────────────────────────────────────────────────────────┘
```

### Sync Configuration

| Setting | Value |
|---------|-------|
| Incremental sync | Every 5 minutes |
| Full sync | Every 24 hours |
| Event retention | 7 days |

---

## 6. Related Documents

| Document | Description |
|----------|-------------|
| [../01_architecture/](../01_architecture/) | System architecture |
| [../03_backend/](../03_backend/) | Backend implementation |

---

*Last Updated: 2026-01-31*
