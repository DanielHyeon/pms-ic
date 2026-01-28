# PMS-IC Menu Structure (9-Zone Framework)

> **Version**: 1.0 | **Status**: Final | **Last Updated**: 2026-01-28

---

## 1. Overview

PMS-IC uses a **9-Zone PM Framework** that organizes features by project lifecycle workflow:

**Setup → Planning → Execution → Verification → Communication → Capability → Insight → Admin**

---

## 2. Menu Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. Dashboard                                    [OVERVIEW ZONE]    │
│     └─ Unified project overview with KPIs                          │
├─────────────────────────────────────────────────────────────────────┤
│  2. Project Setup                               [SETUP ZONE]        │
│     ├─ 2.1 Project List/Creation                                    │
│     ├─ 2.2 Part/Organization Setup                                  │
│     └─ 2.3 Team Members & Roles                                     │
├─────────────────────────────────────────────────────────────────────┤
│  3. Requirements Management                     [PLANNING ZONE]     │
│     ├─ 3.1 RFP Management                                           │
│     ├─ 3.2 Requirements Definition                                  │
│     └─ 3.3 Traceability Matrix                                      │
├─────────────────────────────────────────────────────────────────────┤
│  4. Execution Management                        [EXECUTION ZONE]    │
│     │                                                               │
│     │  [Planning Level - PM View]                                   │
│     ├─ 4.1 Phase Management (Waterfall)                             │
│     ├─ 4.2 Master Schedule (WBS/Gantt)                              │
│     │                                                               │
│     │  [Execution Level - Team View]                                │
│     ├─ 4.3 Backlog Management (Sprint Integration)                  │
│     └─ 4.4 Kanban Board                                             │
├─────────────────────────────────────────────────────────────────────┤
│  5. Quality Management                          [VERIFICATION ZONE] │
│     ├─ 5.1 Test Management                                          │
│     ├─ 5.2 Issue Management                                         │
│     └─ 5.3 Deliverables Management                                  │
├─────────────────────────────────────────────────────────────────────┤
│  6. Collaboration                               [COMMUNICATION ZONE]│
│     ├─ 6.1 Meeting Management                                       │
│     ├─ 6.2 Announcements/Board                                      │
│     └─ 6.3 AI Assistant                                             │
├─────────────────────────────────────────────────────────────────────┤
│  7. Education Management                        [CAPABILITY ZONE]   │
│     └─ 7.1 Education Roadmap                                        │
├─────────────────────────────────────────────────────────────────────┤
│  8. Analytics & Reports                         [INSIGHT ZONE]      │
│     ├─ 8.1 Lineage & History                                        │
│     ├─ 8.2 Project Reports                                          │
│     └─ 8.3 Statistics Dashboard                                     │
├─────────────────────────────────────────────────────────────────────┤
│  9. System Settings                             [ADMIN ZONE]        │
│     ├─ 9.1 User/Permission Management                               │
│     ├─ 9.2 System Configuration                                     │
│     └─ 9.3 Audit Logs                                               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Zone Details

### Zone 1: Dashboard (Overview)

| Menu | Component | Description |
|------|-----------|-------------|
| Dashboard | `Dashboard.tsx` | Project KPIs, progress, budget, recent activities |

### Zone 2: Project Setup

| Menu | Component | Description |
|------|-----------|-------------|
| Projects | `ProjectManagement.tsx` | Project CRUD, status management |
| Parts | `PartManagement.tsx` | Organization structure, departments |
| Roles | `RoleManagement.tsx` | Team members, role assignments |

### Zone 3: Requirements Management (Planning)

| Menu | Component | Description |
|------|-----------|-------------|
| RFP | `RfpManagement.tsx` | RFP import, requirement extraction |
| Requirements | `RequirementManagement.tsx` | Requirement definition, categorization |
| Traceability | `TraceabilityManagement.tsx` | Requirement-to-task mapping |

### Zone 4: Execution Management

| Menu | Component | Description | Level |
|------|-----------|-------------|-------|
| Phases | `PhaseManagement.tsx` | 6-phase waterfall management | PM |
| WBS | `WbsManagement.tsx` | Work breakdown structure, Gantt | PM |
| Backlog | `BacklogManagement.tsx` | 4-level hierarchy (Epic→Feature→Story→Task) | Team |
| Kanban | `KanbanBoard.tsx` | Drag-drop task board | Team |

### Zone 5: Quality Management (Verification)

| Menu | Component | Description |
|------|-----------|-------------|
| Testing | `TestingPage.tsx` | Test cases, execution tracking |
| Issues | `IssuesPage.tsx` | Issue registration, status tracking |
| Deliverables | `DeliverablesPage.tsx` | Document uploads, approval workflow |

### Zone 6: Collaboration (Communication)

| Menu | Component | Description |
|------|-----------|-------------|
| Meetings | `MeetingsPage.tsx` | Meeting scheduling, minutes |
| Announcements | `AnnouncementsPage.tsx` | Project notices, communications |
| AI Assistant | `AIAssistant.tsx` | RAG-based intelligent chatbot |

### Zone 7: Education Management (Capability)

| Menu | Component | Description |
|------|-----------|-------------|
| Education | `EducationManagement.tsx` | Training programs, completion tracking |

### Zone 8: Analytics & Reports (Insight)

| Menu | Component | Description |
|------|-----------|-------------|
| Lineage | `LineageManagement.tsx` | Data lineage visualization, history |
| Reports | `ReportManagement.tsx` | Weekly/monthly report generation |
| Statistics | `StatisticsPage.tsx` | Analytics dashboard, metrics |

### Zone 9: System Settings (Admin)

| Menu | Component | Description |
|------|-----------|-------------|
| Users | `UserManagementPage.tsx` | User CRUD, permission management |
| Settings | `Settings.tsx` | System configuration |
| Audit Logs | `AuditLogsPage.tsx` | Activity logs, audit trail |

---

## 4. Backlog Hierarchy (4-Level Structure)

```
┌─────────────────────────────────────────────────────────────────────┐
│  EPIC (Large Goal)                                                   │
│  └─ Example: "AI-based Auto Assessment System"                       │
│  └─ Manager: Product Owner / PM                                      │
│                                                                      │
│     ┌───────────────────────────────────────────────────────────────┐│
│     │  FEATURE (Functional Unit)                                    ││
│     │  └─ Example: "OCR Document Recognition"                       ││
│     │  └─ Manager: Part Leader / Tech Lead                          ││
│     │                                                               ││
│     │     ┌───────────────────────────────────────────────────────┐ ││
│     │     │  USER STORY (User Requirement)                        │ ││
│     │     │  └─ Example: "As an assessor, when I upload a         │ ││
│     │     │             diagnosis form, text is auto-extracted"   │ ││
│     │     │  └─ Manager: Scrum Master / PM                        │ ││
│     │     │  └─ Sprint assignment unit                            │ ││
│     │     │                                                       │ ││
│     │     │     ┌───────────────────────────────────────────────┐ │ ││
│     │     │     │  TASK (Development Work)                      │ │ ││
│     │     │     │  └─ Example: "Implement OCR API integration"  │ │ ││
│     │     │     │  └─ Manager: Developer                        │ │ ││
│     │     │     │  └─ Kanban card unit                          │ │ ││
│     │     │     └───────────────────────────────────────────────┘ │ ││
│     │     └───────────────────────────────────────────────────────┘ ││
│     └───────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Phase Template (6-Phase AI Insurance Claims)

| Phase | Name | Key Deliverables |
|-------|------|------------------|
| 1 | Business Analysis | AS-IS Process Report, KPI Definition, AI Feasibility Report |
| 2 | Data Preparation | Data Inventory, Cleansing Report, Feature Engineering Spec |
| 3 | AI Modeling | Model Architecture, Training Report, Performance Metrics |
| 4 | System Integration | Integration Design, API Spec, Security Review |
| 5 | Validation & PoC | Test Cases, PoC Results, Performance Report |
| 6 | Change Management | Training Materials, Rollout Plan, Support Procedures |

**Template Design:**
- **Core (Locked)**: Phase names, required deliverables, minimum KPIs
- **Extension (Editable)**: Additional activities, supplementary deliverables, KPI weights

---

## 6. Language Policy

| Category | Language | Examples |
|----------|----------|----------|
| **Menu Names** | Korean | 대시보드, 프로젝트 설정, 백로그 관리 |
| **Buttons/Labels** | Korean | 저장, 삭제, 수정, 새로 만들기 |
| **Status Values** | English | TODO, IN_PROGRESS, DONE, OPEN, CLOSED |
| **Technical Terms** | English | Sprint, Kanban, Epic, Feature, User Story, Task |
| **DB Columns/Code** | English | status, created_at, assignee_id |
| **Error Messages** | Korean | "필수 항목입니다", "저장에 실패했습니다" |
| **Abbreviations** | English | WBS, RFP, KPI, OCR, NER, AI |

---

## 7. Role-Based Access

| Role | Accessible Zones |
|------|------------------|
| **ADMIN** | All zones |
| **AUDITOR** | Dashboard, Insight, Admin (read-only) |
| **SPONSOR** | Dashboard, Setup, Planning, Insight |
| **PMO_HEAD** | All zones except Admin |
| **PM** | All zones except Admin |
| **DEVELOPER** | Dashboard, Execution (Team), Verification, Collaboration |
| **QA** | Dashboard, Execution (Team), Verification, Collaboration |
| **BUSINESS_ANALYST** | Dashboard, Planning, Collaboration, Insight |
| **MEMBER** | Dashboard, Execution (Team), Collaboration |

---

## 8. Related Documents

| Document | Description |
|----------|-------------|
| [ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md) | System architecture summary |
| [MODULE_COMPOSITION.md](./MODULE_COMPOSITION.md) | Module/component structure |
| [Project-Scoped-Authorization-Design.md](./Project-Scoped-Authorization-Design.md) | RBAC design |

---

*This document reflects the final implemented menu structure of PMS-IC.*
