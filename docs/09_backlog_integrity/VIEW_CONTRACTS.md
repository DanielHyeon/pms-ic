# View API Contract Specification

## PO Backlog View
- **Endpoint**: `GET /api/projects/{projectId}/views/po-backlog`
- **Capability**: `VIEW_BACKLOG`
- **Scope**: Full project
- **KPIs**:
  - `requirementCoverage`: `(backlog_items WITH requirement_id / total backlog_items) × 100`
  - `storyDecompositionRate`: `(backlog_items WITH >=1 story / total backlog_items) × 100`
  - `completedStoryRate` (per Epic): `(DONE stories / total stories in epic) × 100`

## PM Workboard View
- **Endpoint**: `GET /api/projects/{projectId}/views/pm-workboard`
- **Capability**: `VIEW_STORY`
- **Scope**: `allowedPartIds` restriction (service layer enforced)
- **KPIs**:
  - `sprintVelocity`: total story points in active sprint
  - `partWorkload`: per-part story count, story points, member count
- **Security**: `scopedPartIds` exposed in DTO (audit/debug). Service filters all queries by allowed parts.

## PMO Portfolio View
- **Endpoint**: `GET /api/projects/{projectId}/views/pmo-portfolio`
- **Capability**: `VIEW_KPI`
- **Scope**: Full project (read-only)
- **Coverage KPIs** (5):
  - Requirement Traceability (threshold: 80%)
  - Story Decomposition Rate (threshold: 70%)
  - Epic Coverage (threshold: 80%)
  - Part Assignment Rate (threshold: 90%)
  - Sprint Commitment Rate (threshold: 50%)
- **Operational KPIs** (3, event-based from audit.status_transition_events):
  - Story Lead Time: `median(DONE.transitioned_at - READY.transitioned_at)`, 14-day window
  - REVIEW Dwell Time Ratio: `avg(DONE-REVIEW) / avg(total_lead_time)`, P90
  - Sprint Completion Rate: `stories reaching DONE / stories entering IN_SPRINT`
- **Data Quality**:
  - Integrity: invalid refs, mismatches (penalty: -10/item)
  - Readiness: null epic, null part, unlinked stories/items (penalty: -3~5/item)
  - Score: `integrityScore × 0.6 + readinessScore × 0.4`
