# Implementation Plan: Audit Evidence Export Backend

> **Plan Version**: 1.0
> **Date**: 2026-02-10
> **Design Spec Reference**: `docs/10_menu/화면설계/16_감사증빙_화면설계.md` (v2.1)
> **Status**: NOT STARTED

---

## 1. Gap Summary

The Audit Evidence Export screen (route `/audit/evidence`) has a detailed v2.1 design spec with a 3-step workflow (Select -> Preview -> Export), compliance checklist, and a sealed export package model. However, **no audit evidence controller, service, or export logic exists**. The gap includes:

- No `ReactiveAuditEvidenceController` or `ReactiveAuditEvidenceService`
- No evidence aggregation logic across schemas (deliverables, decisions, test results, change history, approval logs, meeting minutes)
- No export package generation (ZIP/PDF bundling)
- No audit trail for export actions
- No compliance checklist calculation

This implementation is primarily a **read-only aggregation layer** with export functionality. It does **not require new core data tables** for evidence itself (evidence items come from existing schemas), but it does require tables for:
- Export package tracking (seal metadata)
- Export audit trail (who exported what, when)
- Compliance checklist state

Key design principles:
- Read-only access to source data (no modification capability)
- Single Preset: AUDIT_EVIDENCE (locked, no switching)
- Export Package sealing with `filterSnapshot`, `policySnapshot`, `selectionHash`, `sealedAt`
- Complete audit trail for all export actions
- Server-scoped JWT enforcement (`allowedProjectIds`, `allowedDateRange`)

---

## 2. DB Schema Changes (Flyway Migration)

**File**: `V20260236_04__audit_evidence_tables.sql`
**Schema**: `audit` (new schema)

```sql
-- V20260236_04: Audit Evidence Export tables
-- Design spec: 16_감사증빙_화면설계.md v2.1

CREATE SCHEMA IF NOT EXISTS audit;

-- ============================================================
-- 1. Evidence Export Packages (sealed, immutable)
-- ============================================================
CREATE TABLE audit.evidence_export_packages (
    id                  VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id          VARCHAR(36) NOT NULL,
    package_name        VARCHAR(255) NOT NULL,
    format              VARCHAR(10) NOT NULL DEFAULT 'ZIP',
        -- ZIP, PDF
    status              VARCHAR(20) NOT NULL DEFAULT 'GENERATING',
        -- GENERATING, COMPLETED, FAILED, EXPIRED
    total_items         INTEGER NOT NULL DEFAULT 0,
    included_items      INTEGER NOT NULL DEFAULT 0,
    failed_items        INTEGER NOT NULL DEFAULT 0,
        -- v2.1: partial failure tracking for PDF merge
    file_path           VARCHAR(500),
    file_size           BIGINT,
    checksum            VARCHAR(128),
        -- SHA-256 of the export file
    download_url        VARCHAR(1000),
    download_expires_at TIMESTAMPTZ,
    -- Seal metadata (v2.1: immutable evidence of what was exported)
    filter_snapshot     JSONB NOT NULL,
        -- Exact filter state at export time
    policy_snapshot     JSONB NOT NULL,
        -- OriginPolicy + capability snapshot
    selection_hash      VARCHAR(128) NOT NULL,
        -- Hash of selected item IDs (reproducibility proof)
    selected_item_ids   JSONB NOT NULL,
        -- Array of { type, id } for all selected items
    sealed_at           TIMESTAMPTZ NOT NULL,
    -- Cover Sheet data (v2.1)
    cover_sheet_json    JSONB,
        -- { scope, dateRange, itemCount, preparedBy, approvedBy }
    requested_by        VARCHAR(36) NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at        TIMESTAMPTZ,
    error_message       TEXT
);

CREATE INDEX idx_eep_project ON audit.evidence_export_packages(project_id);
CREATE INDEX idx_eep_status ON audit.evidence_export_packages(status);
CREATE INDEX idx_eep_requested ON audit.evidence_export_packages(requested_by);
CREATE INDEX idx_eep_created ON audit.evidence_export_packages(created_at DESC);

COMMENT ON TABLE audit.evidence_export_packages IS 'Sealed export packages with full reproducibility metadata';

-- ============================================================
-- 2. Evidence Export Audit Trail
-- ============================================================
CREATE TABLE audit.evidence_audit_trail (
    id                  VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id          VARCHAR(36) NOT NULL,
    event_type          VARCHAR(50) NOT NULL,
        -- EVIDENCE_VIEWED, EVIDENCE_SELECTED, EVIDENCE_PREVIEWED,
        -- EXPORT_STARTED, EXPORT_SEALED, EXPORT_DOWNLOADED,
        -- DOWNLOAD_URL_REISSUED, FILTER_APPLIED
    actor_id            VARCHAR(36) NOT NULL,
    actor_ip            VARCHAR(45),
        -- v2.1: origin IP
    proxy_ip            VARCHAR(45),
        -- v2.1: proxy IP (if applicable)
    package_id          VARCHAR(36),
    details_json        JSONB,
        -- Event-specific details
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_eat_project ON audit.evidence_audit_trail(project_id);
CREATE INDEX idx_eat_actor ON audit.evidence_audit_trail(actor_id);
CREATE INDEX idx_eat_event ON audit.evidence_audit_trail(event_type);
CREATE INDEX idx_eat_created ON audit.evidence_audit_trail(created_at DESC);
CREATE INDEX idx_eat_package ON audit.evidence_audit_trail(package_id) WHERE package_id IS NOT NULL;

-- ============================================================
-- 3. Compliance Checklist Items
-- ============================================================
CREATE TABLE audit.compliance_checklist_items (
    id                  VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id          VARCHAR(36) NOT NULL,
    phase_id            VARCHAR(36),
    evidence_type       VARCHAR(30) NOT NULL,
        -- deliverable, test_result, decision_record, change_history, approval_log, meeting_minutes
    label               VARCHAR(500) NOT NULL,
    is_required         BOOLEAN NOT NULL DEFAULT TRUE,
    is_satisfied        BOOLEAN NOT NULL DEFAULT FALSE,
    satisfied_by_id     VARCHAR(36),
        -- ID of the evidence item that satisfies this checklist item
    satisfied_by_type   VARCHAR(30),
    checked_at          TIMESTAMPTZ,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cci_project ON audit.compliance_checklist_items(project_id);
CREATE INDEX idx_cci_phase ON audit.compliance_checklist_items(phase_id) WHERE phase_id IS NOT NULL;
CREATE INDEX idx_cci_type ON audit.compliance_checklist_items(evidence_type);
CREATE INDEX idx_cci_project_required ON audit.compliance_checklist_items(project_id, is_required) WHERE is_required = TRUE;
```

---

## 3. Java Package Structure

```
com.insuretech.pms.audit
  +-- controller/
  |   +-- ReactiveAuditEvidenceController.java
  +-- service/
  |   +-- ReactiveAuditEvidenceService.java       (evidence aggregation from multiple schemas)
  |   +-- ReactiveEvidenceExportService.java       (ZIP/PDF package generation)
  |   +-- ReactiveComplianceChecklistService.java  (checklist calculation)
  |   +-- ReactiveAuditTrailService.java           (audit trail recording)
  |   +-- EvidenceAggregator.java                  (collects items from deliverables, decisions, tests, etc.)
  +-- reactive/
  |   +-- entity/
  |   |   +-- R2dbcEvidenceExportPackage.java
  |   |   +-- R2dbcEvidenceAuditTrail.java
  |   |   +-- R2dbcComplianceChecklistItem.java
  |   +-- repository/
  |       +-- ReactiveEvidenceExportPackageRepository.java
  |       +-- ReactiveEvidenceAuditTrailRepository.java
  |       +-- ReactiveComplianceChecklistItemRepository.java
  +-- dto/
      +-- EvidenceItemDto.java              (unified evidence item from any source)
      +-- EvidenceListDto.java              (paginated list with scope/filter metadata)
      +-- EvidencePreviewDto.java           (preview with content snippet)
      +-- ExportPackageDto.java
      +-- ExportRequestDto.java
      +-- CoverSheetDto.java                (v2.1: submission summary)
      +-- ComplianceChecklistDto.java
      +-- AuditEvidenceKpiDto.java
      +-- AuditEvidenceFilterRequest.java
      +-- ExportHistoryDto.java
```

---

## 4. Evidence Source Mapping

The evidence aggregation layer reads from existing tables across multiple schemas:

| Evidence Type | Source Table(s) | Schema | Join Key |
|--------------|----------------|--------|----------|
| `deliverable` | `project.deliverables` | project | `project_id` |
| `test_result` | `task.test_runs` + `task.test_cases` | task | `project_id` (Plan 10) |
| `decision_record` | `project.decisions` + `project.decision_risk_audit_trail` | project | `project_id` (Plan 12) |
| `change_history` | `lineage.outbox_events` | lineage | `project_id` |
| `approval_log` | `project.deliverables` (status=APPROVED) + `project.decision_risk_audit_trail` (action=APPROVED) | project | `project_id` |
| `meeting_minutes` | `project.meeting_minutes` | project | `project_id` (Plan 17) |

---

## 5. API Endpoint List

Base path: `/api/v2/projects/{projectId}/audit/evidence`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/` | List evidence items (FilterSpec: phaseId, evidenceType, dateRange, status, q). Supports pagination. Server enforces JWT scope (allowedProjectIds, allowedDateRange). | `export_audit_evidence` |
| `GET` | `/{evidenceId}` | Get evidence item detail with preview | `export_audit_evidence` |
| `GET` | `/kpi` | KPI summary (evidence_coverage, pending_approvals, total_evidence_items, export_count, missing_evidence_count) | `export_audit_evidence` |
| `GET` | `/checklist` | Compliance checklist (grouped by phase and evidence type) | `export_audit_evidence` |
| `POST` | `/export` | Start export package generation (accepts selected item IDs, format, cover sheet data). Returns package ID for polling. | `export_audit_evidence` |
| `GET` | `/export/{packageId}` | Get export package status/metadata | `export_audit_evidence` |
| `GET` | `/export/{packageId}/download` | Download export package file | `export_audit_evidence` |
| `POST` | `/export/{packageId}/reissue-url` | Reissue expired download URL without regenerating package (v2.1) | `export_audit_evidence` |
| `GET` | `/export/history` | Export history (past packages with seal metadata) | `export_audit_evidence` |
| `POST` | `/select-all` | Server-side select all items matching current filter (v2.1: server-total, not page-only) | `export_audit_evidence` |

---

## 6. LLM Workflow

**Not applicable** -- Audit Evidence Export is a pure data aggregation and export feature with no AI/LLM requirements.

---

## 7. Implementation Steps (Ordered)

### Phase 1: Database & Entities (1 day)
1. Create Flyway migration `V20260236_04__audit_evidence_tables.sql`
2. Implement R2DBC entities: `R2dbcEvidenceExportPackage`, `R2dbcEvidenceAuditTrail`, `R2dbcComplianceChecklistItem`
3. Implement reactive repositories

### Phase 2: Evidence Aggregation (2 days)
4. Implement `EvidenceAggregator` -- queries across schemas to build a unified evidence list:
   - Deliverables from `project.deliverables`
   - Test results from `task.test_runs` (depends on Plan 10)
   - Decision records from `project.decisions` (depends on Plan 12)
   - Change history from `lineage.outbox_events`
   - Approval logs from deliverable/decision approval events
   - Meeting minutes from `project.meeting_minutes` (depends on Plan 17)
5. Implement `EvidenceItemDto` as the unified evidence item format
6. Implement pagination and FilterSpec query building for evidence listing
7. Implement server-side JWT scope enforcement (`allowedProjectIds`, `allowedDateRange`)

### Phase 3: Compliance Checklist (1 day)
8. Implement `ReactiveComplianceChecklistService`:
   - Determine required evidence items per phase based on project methodology
   - Check satisfaction status against available evidence
   - Calculate `submissionReady` (approved/required) vs `inProgress` ((approved+pending)/required)
9. Implement KPI calculation (evidence_coverage, missing_evidence_count, pending_approvals)

### Phase 4: Export Package Generation (2 days)
10. Implement `ReactiveEvidenceExportService`:
    - Accept selection (item IDs or select-all)
    - Create sealed package record with `filterSnapshot`, `policySnapshot`, `selectionHash`
    - Generate Cover Sheet (v2.1)
    - Bundle selected items into ZIP or merge into PDF
    - Handle partial PDF merge failure (v2.1: exclude failed items, suggest ZIP alternative)
    - Store file, update package status, generate download URL
11. Implement async package generation (return package ID immediately, poll for status)
12. Implement download URL with expiry and reissue endpoint
13. Implement `selectionHash` computation (deterministic hash of sorted item IDs)

### Phase 5: Audit Trail (1 day)
14. Implement `ReactiveAuditTrailService`:
    - Log all events: EVIDENCE_VIEWED, EVIDENCE_SELECTED, EXPORT_STARTED, EXPORT_SEALED, EXPORT_DOWNLOADED, DOWNLOAD_URL_REISSUED
    - Capture IP information (origin + proxy, v2.1)
    - EXPORT_SEALED event contains the full selection set + filter + policy snapshot
15. Integrate audit trail logging into all controller actions

### Phase 6: Controller (1 day)
16. Implement `ReactiveAuditEvidenceController` with all endpoints
17. Add `@PreAuthorize("@reactiveProjectSecurity.hasCapability('export_audit_evidence')")` on all endpoints
18. Add ScopeEcho (`scope: { projectId, phaseId }`)
19. Implement `droppedFilters` warning for invalid enum values (v2.1)

### Phase 7: Testing & Documentation (2 days)
20. Unit tests for evidence aggregation across schemas
21. Unit tests for compliance checklist calculation
22. Unit tests for export package sealing (filterSnapshot, selectionHash)
23. Integration tests for export workflow (start -> poll -> download)
24. Integration tests for audit trail recording
25. Test that AUDIT_EVIDENCE preset users cannot access other screens
26. Add OpenAPI annotations

---

## 8. Verification Steps

- [ ] All 3 tables created in `audit` schema with correct indexes
- [ ] Evidence aggregation correctly queries across project, task, lineage schemas
- [ ] FilterSpec supports all 5 keys (phaseId, evidenceType, dateRange, status, q)
- [ ] dateRange normalization: `dateFrom > dateTo` -> swap; `dateFrom` only -> `dateTo = today`
- [ ] Server enforces JWT scope: `allowedProjectIds` and `allowedDateRange` from claims
- [ ] Compliance checklist correctly identifies required vs satisfied items per phase
- [ ] KPI metrics: `evidence_coverage`, `pending_approvals`, `total_evidence_items`, `export_count`, `missing_evidence_count`
- [ ] Export package sealed with: `filterSnapshot`, `policySnapshot`, `selectionHash`, `sealedAt`
- [ ] Cover Sheet generated with scope, date range, item count, preparedBy
- [ ] ZIP export includes all selected items
- [ ] PDF export handles partial failures gracefully (excluded items listed, ZIP suggested)
- [ ] Download URL expires and can be reissued without regenerating package
- [ ] `selectAll` applies to server-total (all filter matches), not just current page
- [ ] Audit trail records every action with actor, IP, timestamp
- [ ] EXPORT_SEALED event contains complete selection set in one atomic event
- [ ] `droppedFilters` warning returned when invalid filter values are silently dropped
- [ ] Only `export_audit_evidence` capability required (no other management capabilities)
- [ ] 404 returned for non-existent evidence (not 403, to prevent existence leakage)
