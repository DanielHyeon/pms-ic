# Implementation Plan: Collaboration Tools (Meetings + Notices) Backend

> **Plan Version**: 1.0
> **Date**: 2026-02-10
> **Design Spec Reference**: `docs/10_menu/화면설계/17_협업도구_화면설계.md` (v2.1)
> **Status**: NOT STARTED

---

## 1. Gap Summary

The Collaboration Tools screen covers two routes: `/meetings` (Meeting Management) and `/notices` (Notice Board). The current state:

**Meeting (partially exists)**:
- `ReactiveMeetingController.java` exists with 4 basic CRUD endpoints (GET list, POST create, PUT update, DELETE)
- `ReactiveMeetingService.java` exists with basic CRUD
- `R2dbcMeeting.java` entity exists in `project` schema with basic fields
- **Missing**: Meeting participants table, meeting minutes (structured), agenda items, meeting decisions, action items, action-to-issue/task linking, AI meeting minutes generation, calendar view data

**Notice (entirely missing)**:
- No tables, entities, controllers, or services for notices
- No read tracking (notice_read_state, notice_read_events)
- No priority-based notification model

Key v2.1 design requirements:
- Trace Link integration (Action Item -> Issue/Task via Neo4j)
- Capability decomposition: `manage_meetings` / `manage_meeting_minutes` / `manage_meeting_actions` / `update_action_item_self`
- Customer sharing granularity (meeting schedule / minutes / action items independently shareable)
- Read tracking dual model (current state 1-row + event log N-rows)
- AI meeting minutes generation (new LLM workflow)
- 404 concealment policy for Customer PM accessing unshared entities

---

## 2. DB Schema Changes (Flyway Migration)

**File**: `V20260236_05__collaboration_tables.sql`
**Schema**: `project`

```sql
-- V20260236_05: Collaboration tools - Meeting extensions + Notice tables
-- Design spec: 17_협업도구_화면설계.md v2.1

-- ============================================================
-- 1. Meeting Participants
-- ============================================================
CREATE TABLE project.meeting_participants (
    id                  VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    meeting_id          VARCHAR(36) NOT NULL REFERENCES project.meetings(id) ON DELETE CASCADE,
    user_id             VARCHAR(36) NOT NULL,
    role                VARCHAR(30) NOT NULL DEFAULT 'PARTICIPANT',
        -- ORGANIZER, PRESENTER, PARTICIPANT, OPTIONAL
    attendance_status   VARCHAR(20) DEFAULT 'PENDING',
        -- PENDING, ACCEPTED, DECLINED, ATTENDED, ABSENT
    responded_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_meeting_participant UNIQUE(meeting_id, user_id)
);

CREATE INDEX idx_mp_meeting ON project.meeting_participants(meeting_id);
CREATE INDEX idx_mp_user ON project.meeting_participants(user_id);

-- ============================================================
-- 2. Meeting Agenda Items
-- ============================================================
CREATE TABLE project.meeting_agenda_items (
    id                  VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    meeting_id          VARCHAR(36) NOT NULL REFERENCES project.meetings(id) ON DELETE CASCADE,
    order_num           INTEGER NOT NULL,
    title               VARCHAR(500) NOT NULL,
    description         TEXT,
    presenter_id        VARCHAR(36),
    duration_minutes    INTEGER,
    status              VARCHAR(20) DEFAULT 'PENDING',
        -- PENDING, DISCUSSED, DEFERRED, SKIPPED
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_agenda_order UNIQUE(meeting_id, order_num)
);

CREATE INDEX idx_mai_meeting ON project.meeting_agenda_items(meeting_id);

-- ============================================================
-- 3. Meeting Minutes (structured, per meeting)
-- ============================================================
CREATE TABLE project.meeting_minutes (
    id                  VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    meeting_id          VARCHAR(36) NOT NULL REFERENCES project.meetings(id) ON DELETE CASCADE,
    content             TEXT NOT NULL,
    summary             TEXT,
    generation_method   VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
        -- MANUAL, AI_DRAFT, AI_FINAL
    ai_model_version    VARCHAR(50),
    ai_confidence       DECIMAL(3,2),
    status              VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
        -- DRAFT, CONFIRMED, ARCHIVED
    confirmed_by        VARCHAR(36),
    confirmed_at        TIMESTAMPTZ,
    is_shared_customer  BOOLEAN DEFAULT FALSE,
        -- v2.1: customer sharing flag (independent of meeting sharing)
    version             INTEGER NOT NULL DEFAULT 1,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    created_by          VARCHAR(36),
    updated_by          VARCHAR(36),
    CONSTRAINT uq_minutes_meeting UNIQUE(meeting_id)
);

CREATE INDEX idx_mm_meeting ON project.meeting_minutes(meeting_id);
CREATE INDEX idx_mm_status ON project.meeting_minutes(status);

-- ============================================================
-- 4. Meeting Decisions (decisions made during meeting)
-- ============================================================
CREATE TABLE project.meeting_decisions (
    id                  VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    minutes_id          VARCHAR(36) NOT NULL REFERENCES project.meeting_minutes(id) ON DELETE CASCADE,
    meeting_id          VARCHAR(36) NOT NULL,
    description         TEXT NOT NULL,
    linked_decision_id  VARCHAR(36),
        -- FK to project.decisions (Plan 12) if escalated
    status              VARCHAR(20) NOT NULL DEFAULT 'PROPOSED',
        -- PROPOSED (AI draft), CONFIRMED, LINKED
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by          VARCHAR(36)
);

CREATE INDEX idx_md_minutes ON project.meeting_decisions(minutes_id);
CREATE INDEX idx_md_meeting ON project.meeting_decisions(meeting_id);

-- ============================================================
-- 5. Meeting Action Items
-- ============================================================
CREATE TABLE project.meeting_action_items (
    id                  VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    minutes_id          VARCHAR(36) NOT NULL REFERENCES project.meeting_minutes(id) ON DELETE CASCADE,
    meeting_id          VARCHAR(36) NOT NULL,
    title               VARCHAR(500) NOT NULL,
    description         TEXT,
    assignee_id         VARCHAR(36) NOT NULL,
    due_date            DATE,
    status              VARCHAR(20) NOT NULL DEFAULT 'PROPOSED',
        -- PROPOSED (AI draft), OPEN, IN_PROGRESS, COMPLETED, CANCELLED
    priority            VARCHAR(20) DEFAULT 'MEDIUM',
        -- HIGH, MEDIUM, LOW
    linked_issue_id     VARCHAR(36),
        -- FK to issues if linked
    linked_task_id      VARCHAR(36),
        -- FK to tasks if linked
    is_shared_customer  BOOLEAN DEFAULT FALSE,
        -- v2.1: customer sharing flag
    completed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    created_by          VARCHAR(36),
    updated_by          VARCHAR(36)
);

CREATE INDEX idx_mai2_minutes ON project.meeting_action_items(minutes_id);
CREATE INDEX idx_mai2_meeting ON project.meeting_action_items(meeting_id);
CREATE INDEX idx_mai2_assignee ON project.meeting_action_items(assignee_id);
CREATE INDEX idx_mai2_status ON project.meeting_action_items(status);
CREATE INDEX idx_mai2_due ON project.meeting_action_items(due_date) WHERE status NOT IN ('COMPLETED', 'CANCELLED');
CREATE INDEX idx_mai2_assignee_status ON project.meeting_action_items(assignee_id, status);

-- ============================================================
-- 6. Notices
-- ============================================================
CREATE TABLE project.notices (
    id                  VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id          VARCHAR(36) NOT NULL,
    title               VARCHAR(500) NOT NULL,
    content             TEXT NOT NULL,
    category            VARCHAR(30) NOT NULL DEFAULT 'general',
        -- announcement, change_alert, urgent, general
    priority            VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
        -- URGENT, NORMAL, INFO
    status              VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
        -- DRAFT, PUBLISHED, ARCHIVED
    is_pinned           BOOLEAN DEFAULT FALSE,
    published_at        TIMESTAMPTZ,
    archived_at         TIMESTAMPTZ,
    author_id           VARCHAR(36) NOT NULL,
    target_audience     VARCHAR(30) DEFAULT 'ALL',
        -- ALL, TEAM, STAKEHOLDER, SPECIFIC_ROLES
    target_roles        JSONB,
        -- Array of role names if target_audience = SPECIFIC_ROLES
    attachment_paths    JSONB,
        -- Array of file paths
    read_tracking_level VARCHAR(20) NOT NULL DEFAULT 'AGGREGATE',
        -- v2.1: INDIVIDUAL (for URGENT), AGGREGATE (for INFO/NORMAL)
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    created_by          VARCHAR(36),
    updated_by          VARCHAR(36)
);

CREATE INDEX idx_notice_project ON project.notices(project_id);
CREATE INDEX idx_notice_status ON project.notices(status);
CREATE INDEX idx_notice_priority ON project.notices(priority);
CREATE INDEX idx_notice_category ON project.notices(category);
CREATE INDEX idx_notice_project_published ON project.notices(project_id, published_at DESC) WHERE status = 'PUBLISHED';
CREATE INDEX idx_notice_pinned ON project.notices(project_id, is_pinned) WHERE is_pinned = TRUE;

-- ============================================================
-- 7. Notice Read State (current state -- 1 row per user+notice)
-- ============================================================
CREATE TABLE project.notice_read_state (
    id                  VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    notice_id           VARCHAR(36) NOT NULL REFERENCES project.notices(id) ON DELETE CASCADE,
    user_id             VARCHAR(36) NOT NULL,
    is_read             BOOLEAN NOT NULL DEFAULT FALSE,
    first_read_at       TIMESTAMPTZ,
    last_read_at        TIMESTAMPTZ,
    read_count          INTEGER DEFAULT 0,
    CONSTRAINT uq_notice_read UNIQUE(notice_id, user_id)
);

CREATE INDEX idx_nrs_notice ON project.notice_read_state(notice_id);
CREATE INDEX idx_nrs_user ON project.notice_read_state(user_id);
CREATE INDEX idx_nrs_unread ON project.notice_read_state(notice_id, is_read) WHERE is_read = FALSE;

-- ============================================================
-- 8. Notice Read Events (event log -- N rows per user+notice)
-- ============================================================
CREATE TABLE project.notice_read_events (
    id                  VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    notice_id           VARCHAR(36) NOT NULL REFERENCES project.notices(id) ON DELETE CASCADE,
    user_id             VARCHAR(36) NOT NULL,
    event_type          VARCHAR(30) NOT NULL,
        -- FIRST_READ, RE_READ, PUSH_SENT, PUSH_ACKNOWLEDGED, RESENT
    channel             VARCHAR(20),
        -- WEB, EMAIL, PUSH
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_nre_notice ON project.notice_read_events(notice_id);
CREATE INDEX idx_nre_user ON project.notice_read_events(user_id, created_at DESC);

-- ============================================================
-- 9. Alter existing meetings table: add sharing flags
-- ============================================================
ALTER TABLE project.meetings
    ADD COLUMN IF NOT EXISTS is_shared_customer BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS meeting_code VARCHAR(50);

CREATE UNIQUE INDEX IF NOT EXISTS uq_meeting_code_project
    ON project.meetings(project_id, meeting_code) WHERE meeting_code IS NOT NULL;
```

---

## 3. Java Package Structure

```
com.insuretech.pms.project.collaboration
  +-- controller/
  |   +-- ReactiveMeetingMinutesController.java     (extends meeting context)
  |   +-- ReactiveMeetingActionItemController.java
  |   +-- ReactiveMeetingAgendaController.java
  |   +-- ReactiveNoticeController.java
  |   +-- ReactiveNoticeReadController.java
  +-- service/
  |   +-- ReactiveMeetingMinutesService.java
  |   +-- ReactiveMeetingActionItemService.java
  |   +-- ReactiveMeetingAgendaService.java
  |   +-- ReactiveNoticeService.java
  |   +-- ReactiveNoticeReadService.java
  |   +-- ReactiveAiMinutesService.java            (AI meeting minutes generation)
  +-- reactive/
  |   +-- entity/
  |   |   +-- R2dbcMeetingParticipant.java
  |   |   +-- R2dbcMeetingAgendaItem.java
  |   |   +-- R2dbcMeetingMinutes.java
  |   |   +-- R2dbcMeetingDecision.java
  |   |   +-- R2dbcMeetingActionItem.java
  |   |   +-- R2dbcNotice.java
  |   |   +-- R2dbcNoticeReadState.java
  |   |   +-- R2dbcNoticeReadEvent.java
  |   +-- repository/
  |       +-- ReactiveMeetingParticipantRepository.java
  |       +-- ReactiveMeetingAgendaItemRepository.java
  |       +-- ReactiveMeetingMinutesRepository.java
  |       +-- ReactiveMeetingDecisionRepository.java
  |       +-- ReactiveMeetingActionItemRepository.java
  |       +-- ReactiveNoticeRepository.java
  |       +-- ReactiveNoticeReadStateRepository.java
  |       +-- ReactiveNoticeReadEventRepository.java
  +-- dto/
      +-- MeetingParticipantDto.java
      +-- MeetingAgendaItemDto.java
      +-- MeetingMinutesDto.java
      +-- MeetingMinutesCreateRequest.java
      +-- MeetingDecisionDto.java
      +-- MeetingActionItemDto.java
      +-- MeetingActionItemCreateRequest.java
      +-- MeetingActionItemUpdateRequest.java
      +-- ActionInboxDto.java
      +-- NoticeDto.java
      +-- NoticeCreateRequest.java
      +-- NoticeUpdateRequest.java
      +-- NoticeReadStatusDto.java
      +-- NoticeReadStatsDto.java
      +-- CollaborationKpiDto.java
```

---

## 4. API Endpoint List

### 4.1 Meeting Extensions (added to existing `/api/v2/projects/{projectId}/meetings`)

#### Participants

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/{meetingId}/participants` | List meeting participants | `view_meetings` |
| `POST` | `/{meetingId}/participants` | Add participants | `manage_meetings` |
| `PATCH` | `/{meetingId}/participants/{participantId}/status` | Update attendance status | `manage_meetings` |
| `DELETE` | `/{meetingId}/participants/{participantId}` | Remove participant | `manage_meetings` |

#### Agenda

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/{meetingId}/agenda` | List agenda items | `view_meetings` |
| `POST` | `/{meetingId}/agenda` | Add agenda item | `manage_meetings` |
| `PUT` | `/{meetingId}/agenda/{itemId}` | Update agenda item | `manage_meetings` |
| `DELETE` | `/{meetingId}/agenda/{itemId}` | Remove agenda item | `manage_meetings` |
| `PATCH` | `/{meetingId}/agenda/reorder` | Reorder agenda items | `manage_meetings` |

#### Minutes

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/{meetingId}/minutes` | Get meeting minutes | `view_meetings` |
| `POST` | `/{meetingId}/minutes` | Create minutes (manual or AI-generated) | `manage_meeting_minutes` |
| `PUT` | `/{meetingId}/minutes` | Update minutes content | `manage_meeting_minutes` |
| `PATCH` | `/{meetingId}/minutes/confirm` | Confirm minutes (DRAFT -> CONFIRMED) | `manage_meeting_minutes` |
| `POST` | `/{meetingId}/minutes/generate-ai` | Trigger AI minutes generation | `manage_meeting_minutes` |

#### Decisions (from minutes)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/{meetingId}/decisions` | List meeting decisions | `view_meetings` |
| `POST` | `/{meetingId}/decisions/{decisionItemId}/confirm` | Confirm AI-proposed decision | `manage_meeting_minutes` |
| `POST` | `/{meetingId}/decisions/{decisionItemId}/link` | Link to Decision entity (Plan 12) | `manage_decisions` |

#### Action Items

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/{meetingId}/action-items` | List action items for meeting | `view_meetings` |
| `POST` | `/{meetingId}/action-items` | Create action item | `manage_meeting_actions` |
| `PUT` | `/{meetingId}/action-items/{itemId}` | Update action item | `manage_meeting_actions` |
| `PATCH` | `/{meetingId}/action-items/{itemId}/status` | Update status (self-update allowed) | `update_action_item_self` |
| `POST` | `/{meetingId}/action-items/{itemId}/link-issue` | Link to Issue | `manage_meeting_actions` |
| `POST` | `/{meetingId}/action-items/{itemId}/link-task` | Link to Task | `manage_meeting_actions` |

#### Action Inbox (cross-meeting, my items)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/action-inbox` | My action items across all meetings (v2.1: DEV primary view) | `view_meetings` |
| `GET` | `/action-inbox/overdue` | Overdue action items | `view_meetings` |

### 4.2 Notices

Base path: `/api/v2/projects/{projectId}/notices`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/` | List notices (FilterSpec: category, priority, dateFrom, dateTo, authorId, readStatus, q) | `view_notices` |
| `GET` | `/{noticeId}` | Get notice detail | `view_notices` |
| `POST` | `/` | Create notice (DRAFT) | `manage_notices` |
| `PUT` | `/{noticeId}` | Update notice | `manage_notices` |
| `DELETE` | `/{noticeId}` | Delete notice | `manage_notices` |
| `PATCH` | `/{noticeId}/publish` | Publish notice (DRAFT -> PUBLISHED) | `manage_notices` |
| `PATCH` | `/{noticeId}/archive` | Archive notice (PUBLISHED -> ARCHIVED) | `manage_notices` |
| `PATCH` | `/{noticeId}/pin` | Toggle pin status | `manage_notices` |

#### Read Tracking

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/{noticeId}/read` | Mark as read (creates/updates read state + event) | `view_notices` |
| `GET` | `/{noticeId}/read-stats` | Read statistics (aggregate count, per-user list for URGENT) | `manage_notices` |
| `GET` | `/unread-count` | Count of unread notices for current user | `view_notices` |

### 4.3 Collaboration KPI

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/v2/projects/{projectId}/collaboration/kpi` | Collaboration metrics (upcoming_meetings, overdue_action_items, this_week_meetings, pending_action_items, action_item_completion_rate, unread_notices) | `view_meetings` |

---

## 5. LLM Workflow: AI Meeting Minutes Generation

### New Workflow: `g7_meeting_minutes.py`

**Location**: `llm-service/routes/meeting_routes.py` + `llm-service/agents/meeting_minutes_agent.py` (new)

#### REST Endpoint

```python
@meeting_bp.route('/api/meetings/generate-minutes', methods=['POST'])
def generate_meeting_minutes():
    """
    Generate structured meeting minutes from agenda + participant info.

    Input:
    {
        "project_id": "uuid",
        "meeting_id": "uuid",
        "meeting_title": "Sprint 5 Review",
        "meeting_type": "SPRINT_RETRO",
        "agenda_items": [
            { "title": "Sprint progress", "description": "..." },
            { "title": "Blockers", "description": "..." }
        ],
        "participants": ["Kim PM", "Lee Dev", "Park QA"],
        "notes": "Optional free-text notes from the meeting"
    }

    Output:
    {
        "minutes_content": "## Meeting Minutes\n\n### Sprint 5 Review\n...",
        "summary": "Sprint 5 review covered progress (85% complete), 2 blockers identified...",
        "proposed_decisions": [
            { "description": "Extend sprint by 2 days due to blocker B-12", "confidence": 0.85 }
        ],
        "proposed_action_items": [
            {
                "title": "Resolve database migration issue",
                "suggested_assignee_name": "Lee Dev",
                "suggested_due_date": "2026-02-15",
                "priority": "HIGH",
                "confidence": 0.90
            }
        ],
        "model_version": "gemma-3-12b-Q5_K_M",
        "confidence": 0.87
    }
    """
```

#### Agent Design

The meeting minutes agent uses LangGraph with the following nodes:
1. **Context Node**: Fetch project context (current sprint, open issues, recent decisions)
2. **Structure Node**: Parse agenda items and notes into structured sections
3. **Extraction Node**: Extract decisions and action items from content
4. **Summary Node**: Generate concise summary
5. **Quality Gate**: Validate output structure and confidence

#### Spring Integration

```java
// In ReactiveAiMinutesService.java
public Mono<AiMinutesResult> generateMinutes(String projectId, String meetingId) {
    return meetingService.getMeetingWithAgenda(meetingId)
        .flatMap(meeting -> webClient.post()
            .uri(aiServiceUrl + "/api/meetings/generate-minutes")
            .bodyValue(buildAiRequest(meeting))
            .retrieve()
            .bodyToMono(AiMinutesResponse.class))
        .flatMap(response -> saveDraftMinutes(meetingId, response));
}
```

---

## 6. Implementation Steps (Ordered)

### Phase 1: Database & Entities (2 days)
1. Create Flyway migration `V20260236_05__collaboration_tables.sql`
2. Implement R2DBC entities for all 8 new tables + meeting table alter
3. Implement reactive repositories with custom query methods

### Phase 2: Meeting Extensions - Participants & Agenda (1 day)
4. Implement `ReactiveMeetingParticipantRepository` and service
5. Implement `ReactiveMeetingAgendaService` with reordering logic
6. Add participant/agenda endpoints to existing meeting controller or new sub-controllers

### Phase 3: Meeting Minutes & Decisions (2 days)
7. Implement `ReactiveMeetingMinutesService` (CRUD + DRAFT -> CONFIRMED workflow)
8. Implement `MeetingDecisionService` (PROPOSED -> CONFIRMED -> LINKED workflow)
9. Implement minutes-to-decision linking (meeting decision -> Plan 12 Decision entity)
10. Implement controllers for minutes and decisions

### Phase 4: Action Items (2 days)
11. Implement `ReactiveMeetingActionItemService`:
    - CRUD with status workflow (PROPOSED -> OPEN -> IN_PROGRESS -> COMPLETED/CANCELLED)
    - Self-update capability (`update_action_item_self` allows assignee to change status)
    - Issue/Task linking
12. Implement Action Inbox (cross-meeting query for current user's items)
13. Implement overdue detection
14. Add controllers for action items + action inbox

### Phase 5: Notices (2 days)
15. Implement `ReactiveNoticeService`:
    - CRUD with status workflow (DRAFT -> PUBLISHED -> ARCHIVED)
    - Pin/unpin functionality
    - Priority-based sorting (URGENT pinned first)
    - Category filtering
16. Implement `ReactiveNoticeReadService`:
    - Dual model: update `notice_read_state` (upsert) + insert `notice_read_event`
    - Privacy-aware read stats (URGENT: per-user list, INFO: aggregate only)
    - Unread count for current user
17. Implement notice controller with all endpoints

### Phase 6: AI Meeting Minutes (2 days)
18. Create `llm-service/agents/meeting_minutes_agent.py` with LangGraph workflow
19. Create `llm-service/routes/meeting_routes.py` with REST endpoint
20. Implement `ReactiveAiMinutesService` in Spring (WebClient call to LLM service)
21. Handle AI-proposed decisions and action items (PROPOSED status, require PM confirmation)
22. Unit test the LLM agent with mock data

### Phase 7: Customer Sharing & Security (1 day)
23. Implement customer sharing flags on meeting, minutes, and action items (independent flags)
24. Implement 404 concealment: return 404 instead of 403 for Customer PM accessing unshared entities
25. Add `@PreAuthorize` with decomposed capabilities

### Phase 8: Testing & Documentation (2 days)
26. Unit tests for minutes workflow, action item status transitions, read tracking
27. Integration tests for meeting extension endpoints
28. Integration tests for notice CRUD + read tracking
29. Integration tests for AI minutes generation
30. Add OpenAPI annotations

---

## 7. Verification Steps

- [ ] All 8 new tables created with correct indexes, constraints, and foreign keys
- [ ] Existing `meetings` table altered with `is_shared_customer` and `meeting_code` columns
- [ ] Meeting participants CRUD works with attendance status tracking
- [ ] Agenda items support reordering (order_num updates)
- [ ] Minutes creation works for both MANUAL and AI_DRAFT generation methods
- [ ] Minutes DRAFT -> CONFIRMED transition requires `manage_meeting_minutes` capability
- [ ] AI-generated decisions and action items start in PROPOSED status
- [ ] PM confirmation moves PROPOSED -> CONFIRMED for decisions and PROPOSED -> OPEN for action items
- [ ] Action item self-update works with `update_action_item_self` (assignee can change own status)
- [ ] Action item linking to Issue/Task creates records (and Neo4j trace link in future)
- [ ] Action Inbox returns current user's items across all meetings, sorted by due date
- [ ] Overdue detection correctly identifies items past due_date with non-terminal status
- [ ] Notice DRAFT -> PUBLISHED -> ARCHIVED workflow enforced
- [ ] Pin/unpin toggles `is_pinned` flag; pinned notices sort first
- [ ] Read tracking dual model: `notice_read_state` upserted + `notice_read_event` appended
- [ ] Privacy-aware read stats: URGENT shows per-user list, INFO/NORMAL shows aggregate only
- [ ] Unread count correctly calculated for current user
- [ ] Customer sharing flags work independently (meeting shared != minutes auto-shared)
- [ ] 404 returned for Customer PM accessing unshared entity (not 403)
- [ ] AI meeting minutes generation returns structured output with proposed decisions and action items
- [ ] LLM workflow handles missing agenda gracefully (generates from notes only)
- [ ] Collaboration KPI endpoint returns all 6 metrics correctly
