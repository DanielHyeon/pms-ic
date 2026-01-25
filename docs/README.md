# PMS-IC Documentation Index

**Project**: Insurance Claims Project Management System with AI Support
**Last Updated**: 2026-01-26

---

## Quick Navigation

| Category | Document | Description |
|----------|----------|-------------|
| **Architecture** | [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture overview |
| **AI/LLM** | [LLM_ARCHITECTURE.md](./LLM_ARCHITECTURE.md) | LLM service design & RAG |
| **Infrastructure** | [DOCKER_SETUP.md](./DOCKER_SETUP.md) | Docker Compose setup guide |
| **Security** | [Project-Scoped-Authorization-Design.md](./Project-Scoped-Authorization-Design.md) | RBAC & authorization |

---

## 1. Core Architecture

### System Design
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Comprehensive system architecture
  - Frontend: React 18 + TypeScript + Vite
  - Backend: Spring Boot 3.2 + JPA + PostgreSQL 15
  - LLM Service: Flask + LangGraph + Gemma-3-12B
  - Graph DB: Neo4j 5.20 (Vector + Graph RAG)

### Infrastructure
- **[DOCKER_SETUP.md](./DOCKER_SETUP.md)** - Container orchestration
  - Service ports, credentials, health checks
  - Backup procedures, troubleshooting

---

## 2. AI & LLM System

### Architecture & Operations
- **[LLM_ARCHITECTURE.md](./LLM_ARCHITECTURE.md)** - Complete LLM service documentation
  - Two-track workflow (L1 lightweight vs L2 quality)
  - Hybrid search: Vector + Keyword (RRF algorithm)
  - CPU/GPU setup and operations guide

### Stability
- **[GEMMA3_STABILITY_IMPROVEMENTS.md](./GEMMA3_STABILITY_IMPROVEMENTS.md)** - Gemma 3 stability (Korean)
  - Response validation system (7 failure types)
  - Retry limits, timeout handling

### AI Evolution Roadmap
- **[ai-architecture/README.md](./ai-architecture/README.md)** - AI platform evolution roadmap
- **[ai-architecture/phase1-gates-and-foundation.md](./ai-architecture/phase1-gates-and-foundation.md)** - Decision gates & evidence system
- **[ai-architecture/phase2-workflow-and-skills.md](./ai-architecture/phase2-workflow-and-skills.md)** - LangGraph workflows & skills
- **[ai-architecture/phase3-productization.md](./ai-architecture/phase3-productization.md)** - Subagent pool & MCP gateway
- **[ai-architecture/implementation-status.md](./ai-architecture/implementation-status.md)** - Current implementation status

---

## 3. Security & Authorization

- **[Project-Scoped-Authorization-Design.md](./Project-Scoped-Authorization-Design.md)** - Multi-role authorization
  - Project-scoped RBAC design
  - Database schema changes
  - Migration strategy

---

## 4. Development Standards

### Code Quality
- **[coding-rules.md](./coding-rules.md)** - Coding standards (Martin Fowler principles)
  - Naming conventions, method/class size limits
  - Code smell detection

- **[code-inspection.md](./code-inspection.md)** - Code inspection protocol
  - Cognitive complexity checks
  - Test-first principles

---

## 5. Implementation Plans

### Frontend
- **[REACT19_MIGRATION_PLAN.md](./REACT19_MIGRATION_PLAN.md)** - React 18 to 19 migration
  - 4-phase migration plan
  - Breaking changes handling

### Menu & Phase Management
- **[IMPLEMENTATION_PLAN_MENU_RESTRUCTURE.md](./IMPLEMENTATION_PLAN_MENU_RESTRUCTURE.md)** - Menu restructuring
  - 4-level backlog hierarchy (Epic > Feature > Story > Task)
  - WBS integration, phase templates

### Report System
- **[implementation/Phase-G-Report-System-Implementation-Plan.md](./implementation/Phase-G-Report-System-Implementation-Plan.md)** - Report generation
  - TextToSQL natural language queries
  - Role-based customizable reports

---

## 6. Project Management Features (Korean)

### Core Implementation
- **[프로젝트관리_구현계획.md](./프로젝트관리_구현계획.md)** - Project management implementation
  - Multi-project support
  - Hierarchical permission system

### RFP Management
- **[구현계획_RFP관리_v2.0.md](./구현계획_RFP관리_v2.0.md)** - RFP management v2.0
  - Backlog entity integration
  - Requirement collection & prioritization

### Sprint & Metadata
- **[스프린트_DoD_메타데이터_체크리스트.md](./스프린트_DoD_메타데이터_체크리스트.md)** - Sprint DoD checklist
  - Definition of Done standards
  - Metadata requirements

---

## 7. Data Governance

- **[OpenMetadata_도입_로드맵.md](./OpenMetadata_도입_로드맵.md)** - OpenMetadata adoption (Korean)
  - Data lineage tracking
  - 3-phase implementation plan

- **[PMS 최적화 방안.md](./PMS%20최적화%20방안.md)** - Architecture optimization (Korean)
  - L0/L1/L2 layering strategy

---

## 8. Reference Materials

### Binary Documents
| File | Description |
|------|-------------|
| [AIMAX_PMS설계문서_V1.0_20260123.xlsx](./AIMAX_PMS설계문서_V1.0_20260123.xlsx) | Excel design document |
| [보험금지급심사 AI기반 수행 단계별 절차와 방법론.pdf](./보험금지급심사%20AI기반%20수행%20단계별%20절차와%20방법론.pdf) | Methodology PDF |
| [PMS-제품화전략.pdf](./PMS-제품화전략.pdf) | Productization strategy PDF |

### Archived
- **[_archived/](./_archived/)** - Deprecated/superseded documents
  - `RFP_관리_기능_설계서_v1.0.md` - Superseded by v2.0
  - `LLM_GUIDE.md` - Consolidated into LLM_ARCHITECTURE.md

---

## Implementation Status Summary

| Component | Status | Coverage |
|-----------|--------|----------|
| Frontend | 🔄 In Progress | 62% |
| Backend API | ✅ Complete | 95% |
| Database | ✅ Complete | 95% |
| LLM Service | ✅ Complete | 100% |
| AI Phase 1 (Gates) | ✅ Complete | 100% |
| AI Phase 2 (Workflows) | ✅ Complete | 100% |
| AI Phase 3 (Productization) | ✅ Complete | 100% |

For detailed status, see [ai-architecture/implementation-status.md](./ai-architecture/implementation-status.md).

---

## Document Conventions

- **English**: Architecture, technical specifications, code standards
- **Korean**: Implementation plans, project management features
- **File naming**: lowercase with hyphens for English, Korean titles preserved

---

## Contributing

1. Follow coding standards in [coding-rules.md](./coding-rules.md)
2. Update this index when adding new documents
3. Archive (don't delete) superseded documents in `_archived/`
