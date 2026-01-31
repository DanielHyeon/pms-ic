# Domain Model

> **Version**: 1.0 | **Status**: Final | **Last Updated**: 2026-01-31

<!-- affects: backend, api, data -->

---

## Questions This Document Answers

- What are the core domain entities?
- How are entities related to each other?
- What are the key fields and enums?

---

## 1. Entity Relationship Overview

```
User ──────────────────────────────────────────────────┐
  │                                                     │
  └─ ProjectMember ─── Project ─── Phase               │
                          │          │                  │
                          │          └─ WbsGroup       │
                          │               │             │
                          │               └─ WbsItem    │
                          │                    │        │
                          │                    └─ WbsTask
                          │
                          ├─── Part ─── PartMember
                          │
                          ├─── Sprint ─── UserStory ─── Task
                          │
                          ├─── Deliverable
                          │
                          ├─── Issue
                          │
                          ├─── Meeting
                          │
                          └─── ChatSession ─── ChatMessage
```

---

## 2. Core Entities

### 2.1 Project

| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Primary key |
| name | String | Project name |
| description | String | Project description |
| status | Enum | PLANNING, IN_PROGRESS, ON_HOLD, COMPLETED, CANCELLED |
| startDate | LocalDate | Start date |
| endDate | LocalDate | End date |
| budget | BigDecimal | Total budget |
| aiWeight | BigDecimal | AI track weight (default 0.70) |
| siWeight | BigDecimal | SI track weight (default 0.30) |
| progress | Integer | Overall progress (0-100) |
| isDefault | Boolean | Default project flag |

### 2.2 Phase

| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Primary key |
| projectId | String | Foreign key to Project |
| name | String | Phase name |
| orderNum | Integer | Display order |
| status | Enum | NOT_STARTED, IN_PROGRESS, COMPLETED, ON_HOLD |
| gateStatus | Enum | PENDING, SUBMITTED, APPROVED, REJECTED |
| trackType | Enum | AI, SI, COMMON |
| progress | Integer | Phase progress (0-100) |

### 2.3 WbsGroup / WbsItem / WbsTask

**WbsGroup** (Work Breakdown Structure Level 1)

| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Primary key |
| phaseId | String | Foreign key to Phase |
| name | String | Group name |
| orderNum | Integer | Display order |

**WbsItem** (Work Breakdown Structure Level 2)

| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Primary key |
| groupId | String | Foreign key to WbsGroup |
| name | String | Item name |
| orderNum | Integer | Display order |
| weight | BigDecimal | Weight for progress calculation |

**WbsTask** (Work Breakdown Structure Level 3)

| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Primary key |
| itemId | String | Foreign key to WbsItem |
| name | String | Task name |
| status | Enum | NOT_STARTED, IN_PROGRESS, COMPLETED |
| assigneeId | String | Assigned user |
| weight | BigDecimal | Weight for progress |

### 2.4 Sprint & UserStory & Task

**Sprint** (Agile iteration)

| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Primary key |
| projectId | String | Foreign key to Project |
| name | String | Sprint name |
| status | Enum | PLANNING, ACTIVE, COMPLETED |
| startDate | LocalDate | Sprint start |
| endDate | LocalDate | Sprint end |
| goal | String | Sprint goal |

**UserStory** (Agile work item)

| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Primary key |
| sprintId | String | Foreign key to Sprint |
| title | String | Story title |
| description | String | Story description |
| points | Integer | Story points |
| status | Enum | TODO, IN_PROGRESS, REVIEW, DONE |

**Task** (Kanban work item)

| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Primary key |
| projectId | String | Foreign key to Project |
| userStoryId | String | Optional FK to UserStory |
| title | String | Task title |
| status | Enum | TODO, IN_PROGRESS, REVIEW, DONE |
| priority | Enum | LOW, MEDIUM, HIGH, CRITICAL |
| assigneeId | String | Assigned user |

---

## 3. Supporting Entities

### 3.1 ChatSession & ChatMessage

**ChatSession** (AI conversation container)

| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Primary key |
| projectId | String | Foreign key to Project |
| userId | String | Session owner |
| title | String | Session title |
| status | Enum | ACTIVE, ARCHIVED |

**ChatMessage** (Individual message)

| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Primary key |
| sessionId | String | Foreign key to ChatSession |
| role | Enum | USER, ASSISTANT, SYSTEM |
| content | String | Message content |
| metadata | JSON | Sources, citations |

### 3.2 Deliverable

| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Primary key |
| projectId | String | Foreign key to Project |
| phaseId | String | Foreign key to Phase |
| name | String | Deliverable name |
| type | String | Document type |
| status | Enum | DRAFT, REVIEW, APPROVED, REJECTED |
| filePath | String | Storage path |
| ragStatus | Enum | PENDING, INDEXED, FAILED |

### 3.3 Issue

| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Primary key |
| projectId | String | Foreign key to Project |
| title | String | Issue title |
| description | String | Issue description |
| severity | Enum | LOW, MEDIUM, HIGH, CRITICAL |
| status | Enum | OPEN, IN_PROGRESS, RESOLVED, CLOSED |
| assigneeId | String | Assigned user |

---

## 4. Base Entity

All entities extend `R2dbcBaseEntity`:

```java
public abstract class R2dbcBaseEntity {
    @CreatedDate
    private LocalDateTime createdAt;

    @LastModifiedDate
    private LocalDateTime updatedAt;
}
```

---

## 5. Key Enums Reference

### Project Status

```java
PLANNING, IN_PROGRESS, ON_HOLD, COMPLETED, CANCELLED
```

### Phase Status

```java
NOT_STARTED, IN_PROGRESS, COMPLETED, ON_HOLD
```

### Gate Status

```java
PENDING, SUBMITTED, APPROVED, REJECTED
```

### Track Type

```java
AI, SI, COMMON
```

### Task Priority

```java
LOW, MEDIUM, HIGH, CRITICAL
```

---

## 6. Entity Location Reference

| Entity | File Path |
|--------|-----------|
| R2dbcProject | `project/reactive/entity/R2dbcProject.java` |
| R2dbcPhase | `project/reactive/entity/R2dbcPhase.java` |
| R2dbcWbsGroup | `project/reactive/entity/R2dbcWbsGroup.java` |
| R2dbcWbsItem | `project/reactive/entity/R2dbcWbsItem.java` |
| R2dbcWbsTask | `project/reactive/entity/R2dbcWbsTask.java` |
| R2dbcSprint | `task/reactive/entity/R2dbcSprint.java` |
| R2dbcTask | `task/reactive/entity/R2dbcTask.java` |
| R2dbcChatSession | `chat/reactive/entity/R2dbcChatSession.java` |
| R2dbcDeliverable | `project/reactive/entity/R2dbcDeliverable.java` |

---

*Last Updated: 2026-01-31*
