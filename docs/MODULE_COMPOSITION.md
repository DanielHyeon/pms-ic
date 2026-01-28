# PMS-IC Module Composition

> **Version**: 1.0 | **Status**: Final | **Last Updated**: 2026-01-28

---

## 1. Overview

This document describes the module structure across all three service layers: Frontend, Backend, and LLM Service.

---

## 2. Frontend Module Structure

### 2.1 Directory Structure

```
PMS_IC_FrontEnd_v1.2/
├── src/
│   ├── main.tsx                    # Entry point
│   ├── app/
│   │   ├── App.tsx                 # Main app component
│   │   └── components/             # Page components (26 pages)
│   │       ├── Dashboard.tsx
│   │       ├── ProjectManagement.tsx
│   │       ├── PhaseManagement.tsx
│   │       ├── BacklogManagement.tsx
│   │       ├── KanbanBoard.tsx
│   │       ├── AIAssistant.tsx
│   │       ├── backlog/            # Backlog subcomponents
│   │       ├── lineage/            # Lineage subcomponents
│   │       └── ui/                 # Common UI components
│   │
│   ├── api/                        # API hooks (23 hooks)
│   │   ├── useProjects.ts
│   │   ├── usePhases.ts
│   │   ├── useTasks.ts
│   │   ├── useStories.ts
│   │   ├── useSprints.ts
│   │   ├── useEpics.ts
│   │   ├── useFeatures.ts
│   │   ├── useWbs.ts
│   │   └── ...
│   │
│   ├── store/                      # State management (Zustand)
│   │   ├── authStore.ts
│   │   └── uiStore.ts
│   │
│   ├── contexts/
│   │   └── ProjectContext.tsx
│   │
│   ├── types/                      # TypeScript definitions
│   │   ├── project.ts
│   │   ├── backlog.ts
│   │   ├── lineage.ts
│   │   └── ...
│   │
│   ├── utils/                      # Utility functions
│   │   ├── status.ts
│   │   ├── storyTypes.ts
│   │   └── ...
│   │
│   └── styles/
│       ├── index.css
│       └── tailwind.css
│
├── index.html
├── vite.config.ts
└── package.json
```

### 2.2 Component Summary (26 Pages)

| Zone | Components | Status |
|------|------------|--------|
| **Overview** | Dashboard.tsx | ✅ |
| **Setup** | ProjectManagement.tsx, PartManagement.tsx, RoleManagement.tsx | ✅ |
| **Planning** | RfpManagement.tsx, RequirementManagement.tsx, TraceabilityManagement.tsx | ✅ |
| **Execution** | PhaseManagement.tsx, WbsManagement.tsx, BacklogManagement.tsx, KanbanBoard.tsx | ✅ |
| **Verification** | TestingPage.tsx, IssuesPage.tsx, DeliverablesPage.tsx | ✅ |
| **Communication** | MeetingsPage.tsx, AnnouncementsPage.tsx, AIAssistant.tsx | ✅ |
| **Capability** | EducationManagement.tsx | ✅ |
| **Insight** | LineageManagement.tsx, ReportManagement.tsx, StatisticsPage.tsx | ✅ |
| **Admin** | UserManagementPage.tsx, Settings.tsx, AuditLogsPage.tsx | ✅ |

### 2.3 API Hooks (23 Hooks)

| Hook | Backend Endpoint | Purpose |
|------|------------------|---------|
| useProjects | `/api/projects/*` | Project CRUD |
| usePhases | `/api/phases/*` | Phase management |
| useTasks | `/api/tasks/*` | Task CRUD |
| useStories | `/api/user-stories/*` | User story management |
| useSprints | `/api/sprints/*` | Sprint management |
| useEpics | `/api/epics/*` | Epic management |
| useFeatures | `/api/features/*` | Feature management |
| useWbs | `/api/wbs/*` | WBS management |
| useRequirements | `/api/requirements/*` | Requirements |
| useRfps | `/api/rfps/*` | RFP management |
| useChat | `/api/chat/*` | AI chat |
| useLineage | `/api/lineage/*` | Lineage queries |
| useDashboard | `/api/dashboard/*` | Dashboard data |

---

## 3. Backend Module Structure

### 3.1 Directory Structure

```
PMS_IC_BackEnd_v1.2/src/main/java/com/insuretech/pms/
├── PmsApplication.java             # Main application
│
├── auth/                           # Authentication module
│   ├── controller/
│   │   ├── AuthController.java
│   │   ├── UserController.java
│   │   └── PermissionController.java
│   ├── service/
│   │   ├── AuthService.java
│   │   ├── JwtTokenProvider.java
│   │   └── UserService.java
│   ├── entity/
│   │   ├── User.java
│   │   ├── Permission.java
│   │   └── RolePermission.java
│   └── repository/
│
├── project/                        # Project management module
│   ├── controller/
│   │   ├── ProjectController.java
│   │   ├── PhaseController.java
│   │   ├── DeliverableController.java
│   │   ├── IssueController.java
│   │   ├── MeetingController.java
│   │   ├── EpicController.java
│   │   ├── FeatureController.java
│   │   ├── WbsController.java
│   │   └── TemplateController.java
│   ├── service/
│   │   ├── ProjectService.java
│   │   ├── PhaseService.java
│   │   ├── WbsService.java
│   │   └── TemplateService.java
│   ├── entity/
│   │   ├── Project.java
│   │   ├── Phase.java
│   │   ├── Deliverable.java
│   │   ├── Issue.java
│   │   ├── Epic.java
│   │   ├── Feature.java
│   │   ├── WbsGroup.java
│   │   ├── WbsItem.java
│   │   └── WbsTask.java
│   └── repository/
│
├── task/                           # Task management module
│   ├── controller/
│   │   ├── TaskController.java
│   │   ├── SprintController.java
│   │   ├── UserStoryController.java
│   │   └── BacklogController.java
│   ├── service/
│   │   ├── TaskService.java
│   │   ├── SprintService.java
│   │   ├── UserStoryService.java
│   │   └── BacklogService.java
│   ├── entity/
│   │   ├── Task.java
│   │   ├── KanbanColumn.java
│   │   ├── Sprint.java
│   │   ├── UserStory.java
│   │   ├── Backlog.java
│   │   └── BacklogItem.java
│   └── repository/
│
├── chat/                           # AI chat module
│   ├── controller/
│   │   ├── ChatController.java
│   │   └── LlmController.java
│   ├── service/
│   │   ├── ChatService.java
│   │   └── AIChatClient.java
│   ├── entity/
│   │   ├── ChatSession.java
│   │   └── ChatMessage.java
│   └── repository/
│
├── report/                         # Report module
│   ├── controller/
│   │   ├── ReportController.java
│   │   ├── DashboardController.java
│   │   └── WeeklyReportController.java
│   ├── service/
│   │   ├── ReportService.java
│   │   └── DashboardService.java
│   └── entity/
│
├── lineage/                        # Lineage module
│   ├── controller/
│   │   └── LineageController.java
│   ├── service/
│   │   ├── LineageQueryService.java
│   │   └── LineageEventProducer.java
│   └── entity/
│       └── OutboxEvent.java
│
├── education/                      # Education module
│   ├── controller/
│   ├── service/
│   ├── entity/
│   └── repository/
│
├── rfp/                            # RFP module
│   ├── controller/
│   │   ├── RfpController.java
│   │   └── RequirementController.java
│   ├── service/
│   └── entity/
│
└── common/                         # Common module
    ├── config/
    │   ├── SecurityConfig.java
    │   ├── CorsConfig.java
    │   ├── RedisConfig.java
    │   └── WebClientConfig.java
    ├── entity/
    │   └── BaseEntity.java
    ├── exception/
    │   ├── GlobalExceptionHandler.java
    │   └── CustomException.java
    └── dto/
        └── ApiResponse.java
```

### 3.2 Module Summary

| Module | Controllers | Entities | Endpoints |
|--------|-------------|----------|-----------|
| **auth** | 3 | 3 | 15+ |
| **project** | 9 | 12 | 45+ |
| **task** | 4 | 6 | 25+ |
| **chat** | 2 | 2 | 10+ |
| **report** | 3 | 6 | 30+ |
| **lineage** | 1 | 1 | 10+ |
| **education** | 2 | 3 | 15+ |
| **rfp** | 2 | 2 | 15+ |
| **Total** | **38** | **80+** | **150+** |

---

## 4. LLM Service Module Structure

### 4.1 Directory Structure

```
llm-service/
├── app.py                          # Flask entry point
├── chat_workflow_v2.py             # Two-Track LangGraph workflow
│
├── # Core Services
├── policy_engine.py                # L0 Policy enforcement
├── context_snapshot.py             # Now/Next/Why snapshots
├── rag_service_neo4j.py            # GraphRAG with Neo4j
├── hybrid_rag.py                   # Hybrid search (Vector + Keyword)
├── pg_neo4j_sync.py                # PostgreSQL → Neo4j sync
├── response_validator.py           # Quality validation
├── response_monitoring.py          # Metrics collection
│
├── # Phase 1: Gates & Foundation
├── authority_classifier.py         # Decision Authority Gate
├── evidence_service.py             # Evidence extraction/linking
├── failure_taxonomy.py             # 16 failure codes + recovery
├── schemas/
│   ├── __init__.py
│   └── ai_response.py              # Standard response schema
│
├── # Phase 2: Workflow & Skills
├── workflows/                      # LangGraph templates
│   ├── __init__.py
│   ├── common_state.py             # CommonWorkflowState
│   ├── common_nodes.py             # 9 standard node types
│   ├── g1_weekly_report.py         # Weekly report workflow
│   ├── g2_sprint_planning.py       # Sprint planning workflow
│   ├── g3_traceability.py          # Traceability check workflow
│   ├── g4_risk_radar.py            # Risk radar workflow
│   └── g5_knowledge_qa.py          # Knowledge Q&A workflow
├── skills/                         # Skill library
│   ├── __init__.py
│   ├── registry.py                 # Skill registry
│   ├── retrieve_skills.py          # Docs, Graph, Metrics
│   ├── analyze_skills.py           # Risk, Dependency, Sentiment
│   ├── generate_skills.py          # Summary, Report
│   └── validate_skills.py          # Evidence, Policy
├── observability/                  # Tracing & Metrics
│   ├── __init__.py
│   ├── tracing.py                  # OpenTelemetry-compatible
│   └── metrics.py                  # Prometheus-compatible
│
├── # Phase 3: Productization
├── agents/                         # Subagent pool
│   ├── __init__.py
│   ├── orchestrator_agent.py       # Request routing
│   ├── planner_agent.py            # Sprint planning
│   ├── scrum_master_agent.py       # Sprint execution
│   ├── reporter_agent.py           # Report generation
│   ├── knowledge_curator_agent.py  # Document curation
│   └── risk_quality_agent.py       # Risk & traceability
├── mcp/                            # MCP Gateway & Tools
│   ├── __init__.py
│   ├── gateway.py                  # Rate limiting, access control
│   ├── registry.py                 # Tool registration
│   └── tools/
│       ├── __init__.py
│       ├── database_tools.py       # 5 database tools
│       └── llm_tools.py            # 4 LLM tools
├── value_metrics/                  # Business value metrics
│   ├── __init__.py
│   └── collector.py                # Efficiency, Quality, Adoption, Cost
├── lifecycle/                      # Resource lifecycle
│   ├── __init__.py
│   └── manager.py                  # Versioning, state machine
│
├── # API Routes
├── routes/
│   ├── chat_routes.py              # /api/chat/v2
│   ├── model_routes.py             # /api/model/*
│   ├── rag_admin_routes.py         # /api/admin/rag/*
│   ├── report_routes.py            # /api/report/*
│   ├── document_routes.py          # /api/documents/*
│   ├── scrum_routes.py             # /api/scrum/*
│   └── monitoring_routes.py        # /api/monitoring/*
│
├── config/
│   └── constants.py
├── requirements.txt
├── Dockerfile
└── Dockerfile.gpu
```

### 4.2 AI Architecture Components

| Component | Files | Purpose |
|-----------|-------|---------|
| **Decision Authority** | `authority_classifier.py` | 4-level classification (SUGGEST/DECIDE/EXECUTE/COMMIT) |
| **Evidence System** | `evidence_service.py` | RAG-based evidence extraction |
| **Failure Handling** | `failure_taxonomy.py` | 16 failure codes + recovery |
| **Workflow Templates** | `workflows/g1-g5_*.py` | 5 LangGraph templates |
| **Skill Library** | `skills/*.py` | 10 reusable skills |
| **Subagent Pool** | `agents/*.py` | 6 role-based agents |
| **MCP Gateway** | `mcp/gateway.py` | Rate limiting, access control |
| **Value Metrics** | `value_metrics/` | Business value measurement |

### 4.3 Subagent Pool (6 Agents)

| Agent | Role | Max Authority | Primary Workflows |
|-------|------|---------------|-------------------|
| **Orchestrator** | Request routing | DECIDE | All |
| **Planner** | Sprint planning | SUGGEST | G2 |
| **Scrum Master** | Sprint execution | EXECUTE | G2 |
| **Reporter** | Report generation | EXECUTE | G1 |
| **Knowledge Curator** | Document curation | SUGGEST | G5 |
| **Risk/Quality** | Risk & traceability | SUGGEST | G3, G4 |

### 4.4 Skill Library (10 Skills)

| Category | Skills | Purpose |
|----------|--------|---------|
| **Retrieve** | RetrieveDocsSkill, RetrieveGraphSkill, RetrieveMetricsSkill | Data retrieval |
| **Analyze** | AnalyzeRiskSkill, AnalyzeDependencySkill, AnalyzeSentimentSkill | Data analysis |
| **Generate** | GenerateSummarySkill, GenerateReportSkill | Content generation |
| **Validate** | ValidateEvidenceSkill, ValidatePolicySkill | Quality validation |

---

## 5. Database Schema Summary

### 5.1 PostgreSQL (54 Tables)

| Schema | Tables | Key Entities |
|--------|--------|--------------|
| **auth** | 3 | users, permissions, role_permissions |
| **project** | 31 | projects, phases, wbs_groups, wbs_items, epics, features, deliverables, issues, rfps, requirements, template_sets |
| **task** | 7 | tasks, kanban_columns, sprints, user_stories, backlogs, backlog_items, weekly_reports |
| **report** | 13 | reports, report_templates, template_sections, user_report_settings |

### 5.2 Neo4j (12 Node Types, 17 Relationships)

**Node Types:** Project, Sprint, Task, UserStory, Phase, Deliverable, Issue, User, Epic, Feature, WbsGroup, WbsItem

**Key Relationships:** BELONGS_TO, DEPENDS_ON, BLOCKED_BY, ASSIGNED_TO, HAS_SPRINT, HAS_TASK, HAS_STORY, HAS_PHASE, HAS_EPIC, HAS_FEATURE

---

## 6. Integration Summary

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│    Frontend      │────►│    Backend       │────►│   LLM Service    │
│  (React + TS)    │     │ (Spring Boot)    │     │ (Flask+LangGraph)│
│                  │     │                  │     │                  │
│  26 Pages        │     │  38 Controllers  │     │  6 Agents        │
│  23 API Hooks    │     │  80+ Entities    │     │  10 Skills       │
│  2 Stores        │     │  40+ Services    │     │  5 Workflows     │
└──────────────────┘     └────────┬─────────┘     └────────┬─────────┘
                                  │                        │
                         ┌────────▼─────────┐     ┌────────▼─────────┐
                         │   PostgreSQL     │     │     Neo4j        │
                         │   (54 Tables)    │────►│  (12 Nodes,      │
                         │                  │     │   17 Relations)  │
                         └──────────────────┘     └──────────────────┘
                               Outbox Pattern
```

---

## 7. Related Documents

| Document | Description |
|----------|-------------|
| [ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md) | System architecture summary |
| [MENU_STRUCTURE.md](./MENU_STRUCTURE.md) | 9-Zone menu framework |
| [ai-architecture/README.md](./ai-architecture/README.md) | AI evolution roadmap |

---

*This document reflects the final implemented module structure of PMS-IC.*
