# Backend Documentation

> **Version**: 1.0 | **Status**: Final | **Last Updated**: 2026-01-31

<!-- affects: backend, api -->

---

## Questions This Document Answers

- How is the backend structured?
- What are the core domain entities?
- How does the reactive architecture work?
- What modules exist and what do they do?

---

## Documents in This Section

| Document | Purpose |
|----------|---------|
| [domain_model.md](./domain_model.md) | Core entities and relationships |
| [module_structure.md](./module_structure.md) | Package organization |
| [reactive_patterns.md](./reactive_patterns.md) | WebFlux and R2DBC patterns |

---

## 1. Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | Spring Boot 3.2 | Application framework |
| Reactive | Spring WebFlux | Non-blocking web layer |
| Database Access | R2DBC | Reactive database access |
| Database | PostgreSQL 15 | Primary data storage |
| Cache | Redis 7 (Reactive) | Session & caching |
| Graph DB | Neo4j 5.20 | Lineage & RAG |

---

## 2. Module Overview

```
com.insuretech.pms/
├── auth/           # Authentication & user management
├── project/        # Project, Phase, WBS, Deliverables
├── task/           # Sprint, UserStory, Task, Kanban
├── chat/           # AI chat sessions & messages
├── rfp/            # RFP and requirements
├── report/         # Report generation
├── education/      # Training management
├── lineage/        # Neo4j graph operations
├── rag/            # RAG search integration
└── common/         # Shared utilities, security, config
```

---

## 3. Layered Architecture

```
┌─────────────────────────────────────────┐
│           Controller Layer              │
│    ReactiveXxxController (WebFlux)      │
├─────────────────────────────────────────┤
│            Service Layer                │
│     ReactiveXxxService (Business)       │
├─────────────────────────────────────────┤
│          Repository Layer               │
│   ReactiveXxxRepository (R2DBC)         │
├─────────────────────────────────────────┤
│            Entity Layer                 │
│      R2dbcXxx extends R2dbcBaseEntity   │
└─────────────────────────────────────────┘
```

### Naming Convention

| Layer | Prefix | Example |
|-------|--------|---------|
| Entity | `R2dbc` | `R2dbcProject`, `R2dbcPhase` |
| Repository | `Reactive` | `ReactiveProjectRepository` |
| Service | `Reactive` | `ReactiveProjectService` |
| Controller | `Reactive` | `ReactiveProjectController` |

---

## 4. Key Design Decisions

### Why Reactive (WebFlux + R2DBC)?

| Aspect | Decision |
|--------|----------|
| High concurrency | Non-blocking I/O handles more concurrent requests |
| External service calls | LLM Service calls benefit from reactive backpressure |
| Resource efficiency | Thread pool not blocked during I/O |

### Why Separate Schemas?

PostgreSQL schemas by domain:
- `auth` - User, Permission, RolePermission
- `project` - Project, Phase, WBS, Deliverable
- `task` - Sprint, UserStory, Task, KanbanColumn
- `chat` - ChatSession, ChatMessage
- `report` - Report, ReportTemplate
- `rfp` - Rfp, Requirement
- `lineage` - OutboxEvent

---

## 5. Security Architecture

### Project-Scoped RBAC

```java
@PreAuthorize("@reactiveProjectSecurity.isProjectMember(#projectId)")
public Mono<List<TaskDto>> getProjectTasks(String projectId) { ... }

@PreAuthorize("@reactiveProjectSecurity.hasRole(#projectId, 'PM')")
public Mono<Void> updateProject(String projectId, ProjectDto dto) { ... }
```

### Role Hierarchy

| Role | Access Level |
|------|--------------|
| ADMIN | System-wide access |
| AUDITOR | Read-only system-wide |
| PM | Full project access |
| PMO_HEAD | Multiple project oversight |
| SPONSOR | Strategic decisions |
| DEVELOPER | Task execution |
| QA | Testing tasks |
| BUSINESS_ANALYST | Requirements |
| MEMBER | Basic read access |

---

## 6. External Integrations

### LLM Service Integration

```
Backend ──HTTP/SSE──> LLM Service (localhost:8000)
         WebClient      Flask + LangGraph
```

### Neo4j Integration

```
Backend ──Bolt──> Neo4j (localhost:7687)
         Driver    Graph DB for lineage
```

### Redis Integration

```
Backend ──Reactive──> Redis (localhost:6379)
         Lettuce       Caching, Streams
```

---

## 7. Configuration

### Key Properties (application.yml)

```yaml
spring:
  r2dbc:
    url: r2dbc:postgresql://localhost:5433/pms_db
  data:
    redis:
      host: localhost
      port: 6379
  neo4j:
    uri: bolt://localhost:7687

app:
  llm:
    service-url: http://localhost:8000
  jwt:
    secret: ${JWT_SECRET}
    expiration: 86400000
```

---

## 8. Prohibited Patterns

- Blocking calls in reactive chains (use `publishOn` if unavoidable)
- Direct database access from controllers
- Hardcoded credentials in code
- Exposing internal entity IDs in API responses
- Skipping project membership checks on project-scoped endpoints

---

## 9. Related Documents

| Document | Description |
|----------|-------------|
| [../02_api/](../02_api/) | API endpoint documentation |
| [../06_data/](../06_data/) | Database schema documentation |
| [../07_security/](../07_security/) | Security architecture |

---

*Last Updated: 2026-01-31*
