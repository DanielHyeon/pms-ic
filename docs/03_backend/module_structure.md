# Module Structure

> **Version**: 1.0 | **Status**: Final | **Last Updated**: 2026-01-31

<!-- affects: backend -->

---

## Questions This Document Answers

- How is the backend package organized?
- What does each module contain?
- Where should new code be placed?

---

## 1. Package Overview

```
com.insuretech.pms/
├── auth/           # Authentication & authorization
├── project/        # Project management core
├── task/           # Agile task management
├── chat/           # AI chat functionality
├── rfp/            # RFP & requirements
├── report/         # Report generation
├── education/      # Training management
├── lineage/        # Data lineage (Neo4j)
├── rag/            # RAG search integration
└── common/         # Shared components
```

---

## 2. Module Structure Pattern

Each domain module follows this structure:

```
{module}/
├── package-info.java      # Module documentation
├── reactive/
│   ├── entity/           # R2DBC entities
│   └── repository/       # Reactive repositories
├── dto/                  # Data transfer objects
├── enums/                # Domain enums
├── service/              # Business logic
└── controller/           # REST endpoints
```

---

## 3. Module Details

### 3.1 auth/ - Authentication

**Purpose**: User authentication, authorization, permissions

| Package | Contents |
|---------|----------|
| `reactive/entity/` | R2dbcUser, R2dbcPermission, R2dbcRolePermission |
| `reactive/repository/` | ReactiveUserRepository, ReactivePermissionRepository |
| `service/` | ReactiveAuthService, JwtTokenProvider |
| `controller/` | ReactiveUserController, ReactivePermissionController |

### 3.2 project/ - Project Management

**Purpose**: Core project management entities

| Package | Contents |
|---------|----------|
| `reactive/entity/` | R2dbcProject, R2dbcPhase, R2dbcWbsGroup, R2dbcWbsItem, R2dbcWbsTask, R2dbcDeliverable, R2dbcPart, R2dbcProjectMember, R2dbcIssue, R2dbcMeeting, R2dbcKpi |
| `reactive/repository/` | ReactiveProjectRepository, ReactivePhaseRepository, etc. |
| `dto/` | ProjectDto, PhaseDto, WbsDto, DeliverableDto |
| `service/` | ReactiveProjectService, ReactiveDeliverableService |
| `controller/` | ReactiveProjectController |

### 3.3 task/ - Task Management

**Purpose**: Sprint, user story, and kanban task management

| Package | Contents |
|---------|----------|
| `reactive/entity/` | R2dbcSprint, R2dbcUserStory, R2dbcTask, R2dbcKanbanColumn, R2dbcWeeklyReport |
| `reactive/repository/` | ReactiveSprintRepository, ReactiveTaskRepository |
| `service/` | ReactiveSprintService, ReactiveTaskService |
| `controller/` | ReactiveSprintController, ReactiveTaskController |

### 3.4 chat/ - AI Chat

**Purpose**: AI assistant chat sessions and messages

| Package | Contents |
|---------|----------|
| `reactive/entity/` | R2dbcChatSession, R2dbcChatMessage |
| `reactive/repository/` | ReactiveChatSessionRepository, ReactiveChatMessageRepository |
| `dto/` | ChatRequest, ChatResponse, ChatMessageDto |
| `service/` | ReactiveChatService |
| `controller/` | ReactiveChatController |

### 3.5 rfp/ - RFP & Requirements

**Purpose**: Request for Proposal and requirement tracking

| Package | Contents |
|---------|----------|
| `reactive/entity/` | R2dbcRfp, R2dbcRequirement |
| `enums/` | RfpStatus, RequirementStatus, RequirementCategory, Priority |
| `service/` | ReactiveRfpService, ReactiveRequirementService |
| `controller/` | ReactiveRfpController, ReactiveRequirementController |

### 3.6 report/ - Report Generation

**Purpose**: Report templates and generation

| Package | Contents |
|---------|----------|
| `reactive/entity/` | R2dbcReport, R2dbcReportTemplate |
| `enums/` | ReportType, ReportStatus, ReportScope, GenerationMode |
| `service/` | ReactiveReportService |
| `controller/` | ReactiveReportController |

### 3.7 education/ - Training Management

**Purpose**: Education sessions and history tracking

| Package | Contents |
|---------|----------|
| `reactive/entity/` | R2dbcEducation, R2dbcEducationSession, R2dbcEducationHistory, R2dbcEducationRoadmap |
| `reactive/repository/` | ReactiveEducationRepository, etc. |
| `service/` | ReactiveEducationService |
| `controller/` | ReactiveEducationController |

### 3.8 lineage/ - Data Lineage

**Purpose**: Neo4j graph operations for data lineage

| Package | Contents |
|---------|----------|
| `reactive/entity/` | R2dbcOutboxEvent |
| `config/` | Neo4jConfig |
| `enums/` | LineageEventType |
| `service/` | ReactiveLineageService |
| `controller/` | ReactiveLineageController |

### 3.9 rag/ - RAG Integration

**Purpose**: Integration with LLM service for RAG search

| Package | Contents |
|---------|----------|
| `service/` | RAGSearchService, RAGIndexingService |

### 3.10 common/ - Shared Components

**Purpose**: Cross-cutting concerns shared by all modules

| Package | Contents |
|---------|----------|
| `reactive/entity/` | R2dbcBaseEntity |
| `config/` | R2dbcConfig, ReactiveRedisConfig, WebClientConfig, MailConfig |
| `security/` | JwtWebFilter, ReactiveProjectSecurityService, RoleAccessLevel |
| `exception/` | CustomException, GlobalExceptionHandler, ErrorResponse |
| `service/` | FileStorageService, ExcelService |
| `client/` | WebClientErrorHandler |
| `util/` | EnumParser |

---

## 4. Where to Add New Code

| New Code Type | Location |
|---------------|----------|
| New domain entity | `{domain}/reactive/entity/R2dbc{Name}.java` |
| New repository | `{domain}/reactive/repository/Reactive{Name}Repository.java` |
| New service | `{domain}/service/Reactive{Name}Service.java` |
| New controller | `{domain}/controller/Reactive{Name}Controller.java` |
| New DTO | `{domain}/dto/{Name}Dto.java` |
| New enum | `{domain}/enums/{Name}.java` |
| Shared utility | `common/util/{Name}.java` |
| Security filter | `common/security/{Name}.java` |
| Configuration | `common/config/{Name}Config.java` |

---

## 5. Cross-Module Dependencies

```
common (shared by all)
   │
   ├─── auth (independent)
   │
   ├─── project ─── depends on auth
   │       │
   │       ├─── task ─── depends on project
   │       │
   │       ├─── chat ─── depends on project
   │       │
   │       ├─── rfp ─── depends on project
   │       │
   │       └─── report ─── depends on project
   │
   ├─── lineage ─── depends on project, task
   │
   └─── rag ─── depends on project, chat
```

---

## 6. Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Entity | `R2dbc` prefix | `R2dbcProject` |
| Repository | `Reactive` prefix | `ReactiveProjectRepository` |
| Service | `Reactive` prefix | `ReactiveProjectService` |
| Controller | `Reactive` prefix | `ReactiveProjectController` |
| DTO | `Dto` suffix | `ProjectDto` |
| Enum | PascalCase | `ProjectStatus` |
| Config | `Config` suffix | `R2dbcConfig` |

---

*Last Updated: 2026-01-31*
