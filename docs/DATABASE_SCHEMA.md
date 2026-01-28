# PMS-IC Database Schema

> **Version**: 1.0 | **Status**: Final | **Last Updated**: 2026-01-28

---

## 1. Overview

PMS-IC uses a multi-schema PostgreSQL database with Neo4j for graph-based RAG operations.

### Database Infrastructure

| Component | Technology | Port | Purpose |
|-----------|------------|------|---------|
| **PostgreSQL** | PostgreSQL 15 | 5433 | Primary relational database |
| **Neo4j** | Neo4j 5.20 | 7687 (Bolt), 7474 (HTTP) | Graph database for RAG |
| **Redis** | Redis 7 | 6379 | Cache & session management |

### Connection Information

```yaml
# PostgreSQL
Host: postgres (docker) / localhost
Port: 5433
Database: pms_db
User: pms_user
Password: ${POSTGRES_PASSWORD}

# Neo4j
URI: bolt://neo4j:7687
User: neo4j
Password: ${NEO4J_PASSWORD}
```

---

## 2. PostgreSQL Schema Structure

### 2.1 Schema Overview (6 Schemas, 54+ Tables)

```sql
CREATE SCHEMA IF NOT EXISTS auth;     -- Authentication & authorization (3 tables)
CREATE SCHEMA IF NOT EXISTS project;  -- Project management (31 tables)
CREATE SCHEMA IF NOT EXISTS task;     -- Task & sprint management (7 tables)
CREATE SCHEMA IF NOT EXISTS chat;     -- AI chat (4 tables)
CREATE SCHEMA IF NOT EXISTS report;   -- Reporting (13 tables)
CREATE SCHEMA IF NOT EXISTS risk;     -- Risk management (planned)
```

### 2.2 Schema Table Summary

| Schema | Tables | Key Entities |
|--------|--------|--------------|
| **auth** | 3 | users, permissions, role_permissions |
| **project** | 31 | projects, phases, epics, features, wbs_groups, wbs_items, wbs_tasks, deliverables, issues, rfps, requirements, backlogs, backlog_items, meetings, kpis, template_sets, phase_templates |
| **task** | 7 | tasks, kanban_columns, sprints, user_stories, backlogs, backlog_items, weekly_reports |
| **chat** | 4 | chat_sessions, chat_messages, ai_responses, approval_requests |
| **report** | 13 | reports, report_templates, template_sections, user_report_settings, report_metrics_history, generation_logs |

---

## 3. Entity Relationship Diagram

### 3.1 Core Hierarchies

```
PROJECT HIERARCHY:
┌─────────────────────────────────────────────────────────────────────────┐
│  Project                                                                 │
│    └── Phase (6 phases: AI Insurance Claims methodology)                │
│          └── WBS Group (2nd level)                                      │
│                └── WBS Item (3rd level)                                 │
│                      └── WBS Task (4th level) ─────→ Task (Kanban)      │
│                                                                         │
│  Project                                                                 │
│    └── Epic (business goals) ─────────────────────→ WBS Group           │
│          └── Feature (functional units) ───────────→ WBS Item           │
│                └── User Story (user requirements) ─→ Sprint             │
│                      └── Task (Kanban card)                             │
└─────────────────────────────────────────────────────────────────────────┘

TRACEABILITY CHAIN:
┌─────────────────────────────────────────────────────────────────────────┐
│  RFP → Requirement → Backlog Item → User Story → Task                   │
│                                                                         │
│  Phase → WBS Group → WBS Item → WBS Task → Task                        │
│    ↑          ↑           ↑          ↑                                  │
│  Epic → Feature → User Story → Task                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Auth Schema

```
┌────────────────────┐      ┌────────────────────┐      ┌────────────────────┐
│       users        │      │    permissions     │      │  role_permissions  │
├────────────────────┤      ├────────────────────┤      ├────────────────────┤
│ id (PK)           │      │ id (PK)           │      │ id (PK)           │
│ email (UNIQUE)    │      │ category          │      │ role              │
│ password          │      │ name              │      │ permission_id (FK)│
│ name              │      │ description       │      │ granted           │
│ role              │      └────────────────────┘      └────────────────────┘
│ department        │
│ active            │      ┌────────────────────┐
│ last_login_at     │      │ project_members    │
│ created_at        │      ├────────────────────┤
│ updated_at        │      │ id (PK)           │
└────────────────────┘      │ project_id (FK)   │
                            │ user_id (FK)      │
                            │ role              │
                            │ joined_at         │
                            └────────────────────┘
```

### 3.3 Project Schema (Core)

```
┌────────────────────┐
│     projects       │
├────────────────────┤
│ id (PK)           │◄──────────────────────────────────────────────────┐
│ name              │                                                    │
│ description       │      ┌────────────────────┐                       │
│ status            │      │       phases       │                       │
│ start_date        │      ├────────────────────┤                       │
│ end_date          │      │ id (PK)           │◄──────────────────────┐│
│ budget            │      │ project_id (FK)───┼────────────────────────┘│
│ progress          │      │ name              │                        │
│ created_at        │      │ order_num         │      ┌────────────────┐│
│ updated_at        │      │ status            │      │  deliverables  ││
└────────────────────┘      │ gate_status       │      ├────────────────┤│
                            │ start_date        │      │ id (PK)        ││
                            │ end_date          │      │ phase_id (FK)──┼┘
                            │ progress          │      │ name           │
                            │ track_type        │      │ type           │
                            └────────────────────┘      │ status         │
                                     │                 │ file_path      │
                                     │                 │ approved_by    │
                            ┌────────▼────────┐        └────────────────┘
                            │     epics       │
                            ├─────────────────┤
                            │ id (PK)         │◄─────────────────────┐
                            │ project_id (FK) │                      │
                            │ phase_id (FK)   │    ┌────────────────┐│
                            │ name            │    │    features    ││
                            │ description     │    ├────────────────┤│
                            │ status          │    │ id (PK)        ││
                            │ business_value  │    │ epic_id (FK)───┼┘
                            │ progress        │    │ wbs_group_id   │
                            │ color           │    │ name           │
                            └─────────────────┘    │ status         │
                                                   │ priority       │
                                                   └────────────────┘
```

### 3.4 WBS Schema (Project Schema)

```
┌────────────────────┐
│      phases        │
├────────────────────┤
│ id (PK)           │◄──────────────────────────────────────────────────┐
└────────────────────┘                                                   │
                            ┌────────────────────┐                       │
                            │    wbs_groups      │                       │
                            ├────────────────────┤                       │
                            │ id (PK)           │◄──────────────────────┐│
                            │ phase_id (FK)─────┼────────────────────────┘│
                            │ code              │                        │
                            │ name              │                        │
                            │ status            │                        │
                            │ progress          │                        │
                            │ planned_start     │      ┌────────────────┐│
                            │ planned_end       │      │   wbs_items    ││
                            │ linked_epic_id    │      ├────────────────┤│
                            │ weight            │      │ id (PK)        ││
                            └────────────────────┘      │ group_id (FK)──┼┘
                                                       │ phase_id (FK)  │
                                                       │ code           │
                                                       │ name           │
                                                       │ status         │◄───────┐
                                                       │ progress       │        │
                                                       │ estimated_hrs  │        │
                                                       │ assignee_id    │        │
                                                       └────────────────┘        │
                                                                                 │
                                                       ┌────────────────┐        │
                                                       │   wbs_tasks    │        │
                                                       ├────────────────┤        │
                                                       │ id (PK)        │        │
                                                       │ item_id (FK)───┼────────┘
                                                       │ group_id (FK)  │
                                                       │ code           │
                                                       │ name           │
                                                       │ status         │
                                                       │ progress       │
                                                       │ linked_task_id │→ task.tasks
                                                       │ assignee_id    │
                                                       └────────────────┘

┌────────────────────────────┐
│    wbs_dependencies        │
├────────────────────────────┤
│ id (PK)                   │
│ predecessor_id (FK)       │→ wbs_tasks.id
│ successor_id (FK)         │→ wbs_tasks.id
│ dependency_type           │  -- FS, SS, FF, SF
│ lag_days                  │
└────────────────────────────┘
```

### 3.5 Task Schema

```
┌────────────────────┐      ┌────────────────────┐
│  kanban_columns    │      │      sprints       │
├────────────────────┤      ├────────────────────┤
│ id (PK)           │      │ id (PK)           │◄──────────────────────┐
│ project_id        │      │ project_id        │                       │
│ name              │      │ name              │                       │
│ order_num         │      │ start_date        │                       │
│ wip_limit_soft    │      │ end_date          │                       │
│ wip_limit_hard    │      │ status            │                       │
└────────┬──────────┘      │ goal              │                       │
         │                 │ conwip_limit      │                       │
         │                 └────────────────────┘                       │
┌────────▼──────────┐                                                   │
│       tasks       │      ┌────────────────────┐                       │
├────────────────────┤      │    user_stories    │                       │
│ id (PK)           │      ├────────────────────┤                       │
│ column_id (FK)    │      │ id (PK)           │                       │
│ phase_id          │      │ project_id        │                       │
│ title             │      │ sprint_id (FK)────┼───────────────────────┘
│ description       │      │ feature_id (FK)   │→ project.features
│ assignee_id       │      │ wbs_item_id (FK)  │→ project.wbs_items
│ priority          │      │ epic              │
│ status            │      │ title             │
│ track_type        │      │ story_points      │
│ due_date          │      │ status            │
│ order_num         │      │ acceptance_criteria│
│ user_story_id     │      └────────────────────┘
│ sprint_id         │
│ neo4j_node_id     │
└────────────────────┘
```

### 3.6 RFP & Requirements Schema (Project Schema)

```
┌────────────────────┐      ┌────────────────────┐
│        rfps        │      │   requirements     │
├────────────────────┤      ├────────────────────┤
│ id (PK)           │◄─────┤ id (PK)           │
│ project_id        │      │ rfp_id (FK)       │
│ title             │      │ code              │
│ version           │      │ title             │
│ status            │      │ description       │
│ source_file_name  │      │ category          │
│ uploaded_at       │      │ priority          │
│ parsed_at         │      │ status            │
│ total_requirements│      │ story_points      │
│ approved_count    │      │ progress_percentage│
│ rejected_count    │      │ assigned_to       │
└────────────────────┘      └────────────────────┘
                                     │
                            ┌────────▼────────┐
                            │  backlog_items  │
                            ├─────────────────┤
                            │ id (PK)         │
                            │ backlog_id (FK) │
                            │ requirement_id  │
                            │ epic_id_ref     │
                            │ priority_order  │
                            │ status          │
                            │ story_points    │
                            └─────────────────┘
```

### 3.7 Chat Schema

```
┌────────────────────┐      ┌────────────────────┐
│   chat_sessions    │      │   chat_messages    │
├────────────────────┤      ├────────────────────┤
│ id (PK)           │◄─────┤ id (PK)           │
│ user_id           │      │ session_id (FK)   │
│ project_id        │      │ role              │
│ title             │      │ content           │
│ active            │      │ created_at        │
│ created_at        │      └────────────────────┘
└────────────────────┘
                            ┌────────────────────┐
                            │   ai_responses     │
                            ├────────────────────┤
                            │ id (PK)           │
                            │ message_id (FK)   │
                            │ authority_level   │ -- SUGGEST/DECIDE/EXECUTE/COMMIT
                            │ evidence_count    │
                            │ failure_code      │
                            │ response_time_ms  │
                            └────────────────────┘

                            ┌────────────────────┐
                            │ approval_requests  │
                            ├────────────────────┤
                            │ id (PK)           │
                            │ response_id (FK)  │
                            │ action_type       │
                            │ status            │ -- PENDING/APPROVED/REJECTED
                            │ requested_at      │
                            │ reviewed_by       │
                            │ reviewed_at       │
                            └────────────────────┘
```

### 3.8 Report Schema

```
┌────────────────────┐      ┌────────────────────┐
│      reports       │      │  report_templates  │
├────────────────────┤      ├────────────────────┤
│ id (PK)           │      │ id (PK)           │◄─────────────────┐
│ project_id        │      │ name              │                  │
│ template_id (FK)  │      │ type              │                  │
│ title             │      │ category          │                  │
│ type              │      │ description       │                  │
│ status            │      │ default_layout    │                  │
│ generated_at      │      │ is_system         │                  │
│ content           │      └────────────────────┘                  │
│ file_path         │                                             │
└────────────────────┘      ┌────────────────────┐                 │
                            │ template_sections  │                 │
                            ├────────────────────┤                 │
                            │ id (PK)           │                 │
                            │ template_id (FK)──┼─────────────────┘
                            │ name              │
                            │ order_num         │
                            │ content_type      │
                            │ query_template    │
                            └────────────────────┘

┌────────────────────┐      ┌────────────────────┐
│ user_report_settings│     │   weekly_reports   │
├────────────────────┤      ├────────────────────┤
│ id (PK)           │      │ id (PK)           │
│ user_id           │      │ project_id        │
│ template_id       │      │ sprint_id         │
│ preferences       │      │ week_number       │
│ schedule          │      │ year              │
└────────────────────┘      │ summary           │
                            │ achievements      │
                            │ blockers          │
                            │ next_week_plans   │
                            │ generated_by_ai   │
                            └────────────────────┘
```

---

## 4. Neo4j Graph Schema

### 4.1 Node Types (12)

| Node Type | Properties | Synced From |
|-----------|------------|-------------|
| **Project** | id, name, status, progress | project.projects |
| **Phase** | id, name, status, progress, order_num | project.phases |
| **Sprint** | id, name, status, start_date, end_date | task.sprints |
| **Task** | id, title, status, priority, assignee_id | task.tasks |
| **UserStory** | id, title, story_points, status | task.user_stories |
| **Epic** | id, name, status, business_value | project.epics |
| **Feature** | id, name, status, priority | project.features |
| **WbsGroup** | id, code, name, status, progress | project.wbs_groups |
| **WbsItem** | id, code, name, status, progress | project.wbs_items |
| **User** | id, name, email, role | auth.users |
| **Deliverable** | id, name, type, status | project.deliverables |
| **Issue** | id, title, status, priority | project.issues |

### 4.2 Relationship Types (17)

| Relationship | Direction | Purpose |
|--------------|-----------|---------|
| **HAS_PHASE** | Project → Phase | Project contains phases |
| **HAS_SPRINT** | Project → Sprint | Project contains sprints |
| **HAS_EPIC** | Project → Epic | Project contains epics |
| **HAS_FEATURE** | Epic → Feature | Epic contains features |
| **HAS_WBS_GROUP** | Phase → WbsGroup | Phase contains WBS groups |
| **HAS_WBS_ITEM** | WbsGroup → WbsItem | WBS group contains items |
| **HAS_TASK** | Sprint → Task | Sprint contains tasks |
| **HAS_STORY** | Sprint → UserStory | Sprint contains stories |
| **HAS_DELIVERABLE** | Phase → Deliverable | Phase has deliverables |
| **BELONGS_TO** | Generic belonging | Entity belongs to parent |
| **BELONGS_TO_PHASE** | Epic → Phase | Epic linked to phase |
| **LINKED_TO_WBS_GROUP** | Feature → WbsGroup | Feature linked to WBS |
| **DEPENDS_ON** | Task → Task | Task dependency |
| **BLOCKED_BY** | Task → Task | Task blocker |
| **ASSIGNED_TO** | Task → User | Task assignment |
| **CREATED_BY** | * → User | Creator tracking |
| **PART_OF** | Generic hierarchy | Part of structure |

### 4.3 Graph Visualization

```cypher
// Project Structure
(:Project)-[:HAS_PHASE]->(:Phase)-[:HAS_WBS_GROUP]->(:WbsGroup)-[:HAS_WBS_ITEM]->(:WbsItem)
(:Project)-[:HAS_SPRINT]->(:Sprint)-[:HAS_TASK]->(:Task)
(:Project)-[:HAS_EPIC]->(:Epic)-[:HAS_FEATURE]->(:Feature)

// Cross-linking
(:Epic)-[:BELONGS_TO_PHASE]->(:Phase)
(:Feature)-[:LINKED_TO_WBS_GROUP]->(:WbsGroup)
(:UserStory)-[:PART_OF]->(:Feature)
(:Task)-[:PART_OF]->(:UserStory)

// Dependencies
(:Task)-[:DEPENDS_ON]->(:Task)
(:Task)-[:BLOCKED_BY]->(:Task)
(:Task)-[:ASSIGNED_TO]->(:User)
```

### 4.4 Vector Index (RAG)

```cypher
// Document and Chunk nodes for RAG
(:Document {doc_id, title, content, file_type, created_at})
(:Chunk {chunk_id, content, embedding, chunk_index, doc_id})

// Relationships
(:Document)-[:HAS_CHUNK]->(:Chunk)
(:Chunk)-[:NEXT_CHUNK]->(:Chunk)
(:Document)-[:BELONGS_TO]->(:Category)

// Vector Index
CREATE VECTOR INDEX chunk_embeddings
FOR (c:Chunk) ON c.embedding
OPTIONS {
    indexConfig: {
        `vector.dimensions`: 1024,
        `vector.similarity_function`: 'cosine'
    }
}
```

---

## 5. Migration History

### 5.1 Flyway Migrations (26 files)

| Migration | Description |
|-----------|-------------|
| V20260117 | RFP and Requirements tables |
| V20260118 | Parts tables |
| V20260119 | Project members table |
| V20260120 | Scrum workflow tables, lineage mapping |
| V20260121 | Outbox events table (event sourcing) |
| V20260122 | Project-scoped authorization |
| V20260123 | Backlog management (epics, backlogs, backlog_items) |
| V20260124 | Weekly report service |
| V20260125 | WBS hierarchy and Features |
| V20260126 | Template tables |
| V20260127 | Report tables |
| V20260128 | Report templates |
| V20260129 | Report settings |
| V20260130 | AI response logging (chat schema) |
| V20260131 | Comprehensive mock data |
| V20260201 | Backup history tables |
| V20260202 | WBS tasks by role |
| V20260203 | Outbox project_id addition |
| V20260204 | WBS dependencies (Gantt) |
| V20260205 | WBS task dates |
| V20260206-210 | Mock data and samples |
| V20260211 | Story status enhancement |

### 5.2 Migration Location

```
PMS_IC_BackEnd_v1.2/src/main/resources/db/migration/
```

---

## 6. Data Synchronization

### 6.1 PostgreSQL → Neo4j Sync

```
┌─────────────────────┐                    ┌─────────────────────┐
│   PostgreSQL        │     Outbox Pattern │      Neo4j          │
│                     │    ┌──────────┐    │                     │
│ auth.users ─────────┼───►│ outbox_  │───►│ (:User)            │
│ project.projects ───┼───►│ events   │───►│ (:Project)         │
│ project.phases ─────┼───►│          │───►│ (:Phase)           │
│ project.epics ──────┼───►│          │───►│ (:Epic)            │
│ task.sprints ───────┼───►│          │───►│ (:Sprint)          │
│ task.tasks ─────────┼───►│          │───►│ (:Task)            │
│ task.user_stories ──┼───►│          │───►│ (:UserStory)       │
└─────────────────────┘    └──────────┘    └─────────────────────┘
```

### 6.2 Sync Configuration

```bash
SYNC_ENABLED=true
SYNC_FULL_INTERVAL_HOURS=24
SYNC_INCREMENTAL_INTERVAL_MINUTES=5
```

### 6.3 Manual Sync Commands

```bash
# Full sync
docker exec -it pms-llm-service python run_sync.py full

# Incremental sync
docker exec -it pms-llm-service python run_sync.py incremental
```

---

## 7. Index Strategy

### 7.1 PostgreSQL Indexes

| Table | Index | Purpose |
|-------|-------|---------|
| project.projects | idx_projects_status | Status filtering |
| project.phases | idx_phases_project_id | Project lookup |
| project.epics | idx_epics_project_id, idx_epics_status | Project/status filtering |
| project.wbs_groups | idx_wbs_groups_phase_id | Phase lookup |
| project.wbs_items | idx_wbs_items_group_id | Group lookup |
| project.wbs_tasks | idx_wbs_tasks_item_id | Item lookup |
| task.tasks | idx_tasks_column_id, idx_tasks_status | Column/status filtering |
| task.user_stories | idx_user_stories_sprint_id | Sprint lookup |
| project.requirements | idx_requirements_rfp_id | RFP lookup |

### 7.2 Neo4j Indexes

```cypher
-- Uniqueness constraints (12)
CREATE CONSTRAINT FOR (p:Project) REQUIRE p.id IS UNIQUE
CREATE CONSTRAINT FOR (ph:Phase) REQUIRE ph.id IS UNIQUE
CREATE CONSTRAINT FOR (s:Sprint) REQUIRE s.id IS UNIQUE
... (one per node type)

-- Status indexes (10)
CREATE INDEX task_status FOR (t:Task) ON (t.status)
CREATE INDEX sprint_status FOR (s:Sprint) ON (s.status)
... (for major node types)
```

---

## 8. Related Documents

| Document | Description |
|----------|-------------|
| [ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md) | System architecture summary |
| [MODULE_COMPOSITION.md](./MODULE_COMPOSITION.md) | Module structure |
| [DOCKER_SETUP.md](./DOCKER_SETUP.md) | Infrastructure setup |

---

*This document reflects the current database schema of PMS-IC as of 2026-01-28.*
