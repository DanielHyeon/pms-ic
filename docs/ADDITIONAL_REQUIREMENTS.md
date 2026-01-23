# Additional Requirements (추가 요건)

## Overview
This document tracks additional feature requirements and enhancement ideas for the PMS Insurance Claims project.

---

## 1. Phase-Backlog Integration (Phase와 백로그 연결)

**Status**: Pending
**Priority**: TBD
**Created**: 2026-01-24

### Current State
| Connection | Status |
|------------|--------|
| Task → Phase | `phaseId` field exists (string only, no FK) |
| UserStory → Phase | Not connected |
| Sprint → Phase | Not connected |
| UI Integration | PhaseManagement and BacklogManagement are separated |

### Current Structure
```
Project
├── Phase (Waterfall stages) ← Currently independent
│   ├── Deliverables
│   └── KPIs
│
└── Sprint (Agile iterations)
    └── UserStory
        └── Task (has phaseId field, but not utilized)
```

### Proposed Enhancement
Connect Phase with Backlog items to:
1. Assign Tasks/UserStories to specific Phases
2. Track backlog progress per Phase
3. View Phase-based backlog statistics
4. Filter backlog items by Phase

### Implementation Considerations

#### Backend Changes
- [ ] Add FK constraint to `Task.phaseId`
- [ ] Add `phaseId` field to `UserStory` entity
- [ ] Create API endpoints for Phase-based backlog queries
- [ ] Add Phase statistics in PhaseDto (task count, completion rate)

#### Frontend Changes
- [ ] Add Phase selector in Task/UserStory creation forms
- [ ] Add Phase filter in BacklogManagement
- [ ] Show Phase-based progress in PhaseManagement
- [ ] Cross-link between Phase and Backlog views

#### Database Migration
- [ ] Add FK constraint: `task.tasks.phase_id` → `project.phases.id`
- [ ] Add column: `task.user_stories.phase_id`
- [ ] Create index for Phase-based queries

---

## 2. [Reserved for future requirements]

**Status**: -
**Priority**: -
**Created**: -

### Description
(To be added)

---

## Change Log

| Date | Description | Author |
|------|-------------|--------|
| 2026-01-24 | Initial document creation | - |
| 2026-01-24 | Added Phase-Backlog integration requirement | - |
