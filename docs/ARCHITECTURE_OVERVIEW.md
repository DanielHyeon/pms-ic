# PMS-IC Architecture Overview

> **Version**: 1.1 | **Status**: Final | **Last Updated**: 2026-01-31

---

## 1. System Overview

PMS Insurance Claims is an **AI-integrated Project Management Platform** for insurance claims project lifecycle management with GraphRAG-based intelligent assistant.

### Tech Stack Summary

| Layer | Technology | Version |
|-------|------------|---------|
| **Frontend** | React + TypeScript + Vite | React 18, Vite 5 |
| **Backend** | Spring Boot + WebFlux + R2DBC | Spring Boot 3.5, Java 21 |
| **LLM Service** | Flask + LangGraph | Python 3.11 |
| **Database** | PostgreSQL | 15 |
| **Graph DB** | Neo4j | 5.20 |
| **Cache** | Redis | 7 |
| **Container** | Docker Compose | - |

---

## 2. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                                  │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                 React SPA (Port 5173)                           ││
│  │  [Dashboard] [Kanban] [Backlog] [AI Chat] [Reports] [Settings]  ││
│  └─────────────────────────────────────────────────────────────────┘│
└────────────────────────────┬────────────────────────────────────────┘
                             │ REST API
┌────────────────────────────▼────────────────────────────────────────┐
│                     APPLICATION LAYER                                │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │            Spring Boot Backend (Port 8083)                      ││
│  │  [38 Controllers] [80+ Entities] [40+ Services] [150+ Endpoints]││
│  │  ├── auth: User, Permission, RBAC                               ││
│  │  ├── project: Project, Phase, WBS, Deliverable                  ││
│  │  ├── task: Task, Sprint, UserStory, Kanban                      ││
│  │  └── report: Report, Dashboard, WeeklyReport                    ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────┬────────────────────────────────┬──────────────────────────┘
          │ R2DBC                          │ HTTP
          ▼                                ▼
┌─────────────────────┐     ┌──────────────────────────────────────────┐
│  PostgreSQL (5433)  │     │      LLM Service (Port 8000)             │
│  ├── auth (3)       │     │  ┌──────────────────────────────────────┐│
│  ├── project (31)   │     │  │   Two-Track Workflow (LangGraph)     ││
│  ├── task (7)       │     │  │   ├── Track A: Fast (2.6B params)    ││
│  ├── report (13)    │     │  │   └── Track B: Quality (12B params)  ││
│  └── Total: 54 tbl  │     │  ├── Policy Engine (L0 enforcement)     ││
└─────────────────────┘     │  ├── Hybrid RAG (Vector + Keyword)      ││
          │                 │  ├── 6 Subagents (Orchestrator, etc.)   ││
          │ Outbox Pattern  │  ├── 10 Skills (Retrieve, Analyze, etc.)││
          ▼                 │  └── MCP Gateway & Registry             ││
┌─────────────────────┐     │  └──────────────────────────────────────┘│
│  Neo4j (Port 7687)  │     └──────────────────────────────────────────┘
│  ├── 12 Node Types  │                      │
│  ├── 17 Rel Types   │                      │ Cypher
│  └── Vector Index   │◄─────────────────────┘
└─────────────────────┘
```

---

## 3. Data Architecture

### 3.1 PostgreSQL Schemas (54 Tables)

| Schema | Tables | Key Entities |
|--------|--------|--------------|
| **auth** | 3 | User, Permission, RolePermission |
| **project** | 31 | Project, Phase, WBS, Epic, Feature, Deliverable, Issue, RFP, Requirement |
| **task** | 7 | Task, KanbanColumn, Sprint, UserStory, Backlog, BacklogItem |
| **report** | 13 | Report, ReportTemplate, WeeklyReport, UserReportSettings |

### 3.2 Neo4j Graph Structure

**Node Types (12):**
Project, Sprint, Task, UserStory, Phase, Deliverable, Issue, User, Epic, Feature, WbsGroup, WbsItem

**Relationship Types (17):**
BELONGS_TO, DEPENDS_ON, BLOCKED_BY, ASSIGNED_TO, CREATED_BY, PART_OF, HAS_SPRINT, HAS_TASK, HAS_STORY, HAS_PHASE, HAS_DELIVERABLE, HAS_EPIC, HAS_FEATURE, HAS_WBS_GROUP, HAS_WBS_ITEM, BELONGS_TO_PHASE, LINKED_TO_WBS_GROUP

---

## 4. AI Architecture (3-Phase Implementation)

### 4.1 Phase 1: Gates & Foundation ✅

| Component | Purpose |
|-----------|---------|
| **Decision Authority Gate** | 4-level classification (SUGGEST/DECIDE/EXECUTE/COMMIT) |
| **Evidence System** | RAG-based evidence extraction and linking |
| **Failure Taxonomy** | 16 failure codes with recovery strategies |
| **Response Schema** | Standardized AI response format |

### 4.2 Phase 2: Workflow & Skills ✅

| Component | Details |
|-----------|---------|
| **LangGraph Templates** | G1-G5 (Weekly Report, Sprint Planning, Traceability, Risk Radar, Knowledge QA) |
| **Skill Library** | 10 skills (Retrieve 3, Analyze 3, Generate 2, Validate 2) |
| **Observability** | OpenTelemetry tracing + Prometheus metrics |

### 4.3 Phase 3: Productization ✅

| Component | Details |
|-----------|---------|
| **Subagent Pool** | 6 agents (Orchestrator, Planner, Scrum Master, Reporter, Knowledge Curator, Risk/Quality) |
| **MCP Gateway** | Rate limiting, access control, telemetry |
| **Value Metrics** | Efficiency, Quality, Adoption, Cost metrics |
| **Lifecycle Manager** | Semantic versioning, state machine |

---

## 5. Security Architecture

### 5.1 Authentication & Authorization

| Feature | Implementation |
|---------|----------------|
| **Authentication** | JWT Token (24-hour validity) |
| **System Roles** | ADMIN, AUDITOR |
| **Project Roles** | SPONSOR, PMO_HEAD, PM, DEVELOPER, QA, BUSINESS_ANALYST, MEMBER |
| **Authorization** | Project-Scoped RBAC via ProjectSecurityService |

### 5.2 Access Control Pattern

```java
@PreAuthorize("@projectSecurity.hasRole(#projectId, 'PM')")
public void updateProject(String projectId, ProjectData data) { ... }
```

---

## 6. Integration Architecture

### 6.1 Service Communication

| Source | Target | Protocol | Purpose |
|--------|--------|----------|---------|
| Frontend | Backend | REST/HTTP | API calls |
| Backend | LLM Service | REST/HTTP | AI chat requests |
| Backend | PostgreSQL | R2DBC | Data persistence |
| Backend | Redis | Redis Protocol | Session/Cache |
| LLM Service | Neo4j | Bolt | RAG search |
| Backend | Neo4j | Outbox Pattern | Data sync |

### 6.2 RAG Pipeline

```
Query → Embedding (E5-Large) → Hybrid Search (Vector + Keyword)
      → RRF Merge → Graph Expansion → Context Assembly → LLM Response
```

---

## 7. Deployment Configuration

### Docker Compose Services

| Service | Port | Purpose |
|---------|------|---------|
| **postgres** | 5433 | Primary database |
| **redis** | 6379 | Cache & session |
| **neo4j** | 7687 (Bolt), 7474 (HTTP) | Graph database |
| **backend** | 8083 | Spring Boot API |
| **frontend** | 5173 | React SPA |
| **llm-service** | 8000 | AI/LLM service |

### Key Environment Variables

```yaml
AI_SERVICE_URL: http://llm-service:8000
MODEL_PATH: ./models/google.gemma-3-12b-pt.Q5_K_M.gguf
JWT_SECRET: ${JWT_SECRET}
NEO4J_URI: bolt://neo4j:7687
```

---

## 8. Related Documents

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Full technical specification |
| [LLM_ARCHITECTURE.md](./LLM_ARCHITECTURE.md) | LLM service deep dive |
| [Project-Scoped-Authorization-Design.md](./Project-Scoped-Authorization-Design.md) | Security design |
| [ai-architecture/README.md](./ai-architecture/README.md) | AI evolution roadmap |

---

*This document provides a concise overview. For detailed specifications, refer to the linked documents.*
