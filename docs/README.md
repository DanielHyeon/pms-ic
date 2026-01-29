# PMS-IC Documentation Index

**Project**: Insurance Claims Project Management System with AI Support
**Status**: ✅ Production Ready
**Last Updated**: 2026-01-30

---

## Quick Navigation

| Category | Document | Description |
|----------|----------|-------------|
| **Overview** | [ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md) | Concise system architecture summary |
| **Menu** | [MENU_STRUCTURE.md](./MENU_STRUCTURE.md) | 9-Zone menu framework |
| **Modules** | [MODULE_COMPOSITION.md](./MODULE_COMPOSITION.md) | Module/component structure |
| **Database** | [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | Database schema & ERD |
| **Full Spec** | [ARCHITECTURE.md](./ARCHITECTURE.md) | Complete technical specification |
| **AI System** | [LLM_ARCHITECTURE.md](./LLM_ARCHITECTURE.md) | LLM service design & RAG |
| **Security** | [Project-Scoped-Authorization-Design.md](./Project-Scoped-Authorization-Design.md) | RBAC & authorization |

---

## Implementation Status

| Component | Status | Coverage |
|-----------|--------|----------|
| Frontend | ✅ Complete | 26 pages, 23 hooks |
| Backend API | ✅ Complete | 38 controllers, 150+ endpoints |
| Database | ✅ Complete | 54 tables (PostgreSQL) + Neo4j |
| LLM Service | ✅ Complete | 6 agents, 10 skills, 5 workflows |
| AI Phase 1 (Gates) | ✅ Complete | Authority, Evidence, Failure Taxonomy |
| AI Phase 2 (Workflows) | ✅ Complete | LangGraph Templates (G1-G5) |
| AI Phase 3 (Productization) | ✅ Complete | Subagent Pool, MCP, Value Metrics |
| Security (RBAC) | ✅ Complete | Project-Scoped Authorization |

---

## 📁 Final Documents

### Core Architecture

| Document | Description | Status |
|----------|-------------|--------|
| [ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md) | **NEW** - Concise architecture summary | ✅ Final |
| [MENU_STRUCTURE.md](./MENU_STRUCTURE.md) | **NEW** - 9-Zone menu framework | ✅ Final |
| [MODULE_COMPOSITION.md](./MODULE_COMPOSITION.md) | **NEW** - Module/component structure | ✅ Final |
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | **NEW** - Database schema & ERD | ✅ Final |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Complete technical specification | ✅ Final |
| [LLM_ARCHITECTURE.md](./LLM_ARCHITECTURE.md) | LLM service design & RAG | ✅ Final |

### Security & Authorization

| Document | Description | Status |
|----------|-------------|--------|
| [Project-Scoped-Authorization-Design.md](./Project-Scoped-Authorization-Design.md) | RBAC design, JWT, roles | ✅ Final |

### AI Architecture (Phase 1-3)

| Document | Description | Status |
|----------|-------------|--------|
| [ai-architecture/README.md](./ai-architecture/README.md) | AI platform evolution roadmap | ✅ Final |
| [ai-architecture/phase1-gates-and-foundation.md](./ai-architecture/phase1-gates-and-foundation.md) | Decision gates, evidence, failure taxonomy | ✅ Final |
| [ai-architecture/phase2-workflow-and-skills.md](./ai-architecture/phase2-workflow-and-skills.md) | LangGraph workflows, skill library | ✅ Final |
| [ai-architecture/phase3-productization.md](./ai-architecture/phase3-productization.md) | Subagent pool, MCP gateway | ✅ Final |
| [ai-architecture/implementation-status.md](./ai-architecture/implementation-status.md) | Implementation verification | ✅ Final |

### Development Standards

| Document | Description | Status |
|----------|-------------|--------|
| [coding-rules.md](./coding-rules.md) | Coding standards (Martin Fowler principles) | ✅ Final |
| [code-inspection.md](./code-inspection.md) | Code inspection protocol | ✅ Final |

### Infrastructure

| Document | Description | Status |
|----------|-------------|--------|
| [DOCKER_SETUP.md](./DOCKER_SETUP.md) | Container orchestration guide | ✅ Final |
| [GEMMA3_STABILITY_IMPROVEMENTS.md](./GEMMA3_STABILITY_IMPROVEMENTS.md) | LLM stability enhancements | ✅ Final |
| [critical-path-implementation.md](./critical-path-implementation.md) | Gantt critical path | ✅ Final |

---

## 📋 Working Documents

### Implementation Plans (Reference)

| Document | Description | Status |
|----------|-------------|--------|
| [IMPLEMENTATION_PLAN_MENU_RESTRUCTURE.md](./IMPLEMENTATION_PLAN_MENU_RESTRUCTURE.md) | Menu restructure implementation guide | 📋 Reference |
| [REACT19_MIGRATION_PLAN.md](./REACT19_MIGRATION_PLAN.md) | React 18→19 migration plan | 📋 Planned |
| [implementation/Phase-G-Report-System-Implementation-Plan.md](./implementation/Phase-G-Report-System-Implementation-Plan.md) | Report system implementation | 📋 Reference |

### Data Governance (Planning)

| Document | Description | Status |
|----------|-------------|--------|
| [OpenMetadata_도입_로드맵.md](./OpenMetadata_도입_로드맵.md) | OpenMetadata adoption roadmap | 📋 Planned |
| [PMS 최적화 방안.md](./PMS%20최적화%20방안.md) | Architecture optimization | 📋 Reference |

### Project Management (Korean)

| Document | Description | Status |
|----------|-------------|--------|
| [스프린트_DoD_메타데이터_체크리스트.md](./스프린트_DoD_메타데이터_체크리스트.md) | Sprint DoD checklist | ✅ Final |

---

## 📚 Reference Materials

### Binary Documents

| File | Description |
|------|-------------|
| [AIMAX_PMS설계문서_V1.0_20260123.xlsx](./AIMAX_PMS설계문서_V1.0_20260123.xlsx) | Excel design document |
| [보험금지급심사 AI기반 수행 단계별 절차와 방법론.pdf](./보험금지급심사%20AI기반%20수행%20단계별%20절차와%20방법론.pdf) | Methodology PDF |
| [PMS-제품화전략.pdf](./PMS-제품화전략.pdf) | Productization strategy PDF |

---

## Tech Stack Summary

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend | React + TypeScript + Vite | React 18, Vite 5 |
| Backend | Spring Boot + WebFlux + R2DBC | Spring Boot 3.2 |
| LLM Service | Flask + LangGraph | Python 3.11 |
| Database | PostgreSQL (R2DBC) | 15 |
| Graph DB | Neo4j (Outbox Pattern) | 5.20 |
| Cache | Redis (Reactive) | 7 |
| Container | Docker Compose | - |

---

## Quick Start

```bash
# Start all services
docker-compose up -d

# Service URLs
# Frontend:    http://localhost:5173
# Backend:     http://localhost:8083
# LLM Service: http://localhost:8000
# Neo4j:       http://localhost:7474
```

---

## Document Conventions

- **English**: Architecture, technical specifications, code standards
- **Korean**: Implementation plans, project management features
- **File naming**: lowercase with hyphens for English, Korean titles preserved
- **Status indicators**:
  - ✅ Final: Production-ready documentation
  - 📋 Reference: Implementation guidance, working documents
  - 📋 Planned: Future implementation

---

## Contributing

1. Follow coding standards in [coding-rules.md](./coding-rules.md)
2. Update this index when adding new documents
3. Use proper status indicators for document maturity

---

*Last Updated: 2026-01-30*
