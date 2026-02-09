# Implementation Plan: Decision/Risk Board Backend

> **Plan Version**: 1.0
> **Date**: 2026-02-10
> **Design Spec Reference**: `docs/10_menu/화면설계/12_결정리스크_화면설계.md` (v2.1)
> **Status**: NOT STARTED

---

## 1. Gap Summary

The Decision/Risk Board (route `/decisions`) has a comprehensive v2.1 design spec covering Decision and Risk entities with Kanban/Matrix views, escalation chains, and AI risk assessment integration, but **no backend implementation exists**. There are:

- No database tables for decisions, risks, risk assessments, escalation links, or audit trails
- No R2DBC entities, repositories, services, or controllers
- No API endpoints for decision CRUD, risk management, escalation, or matrix data
- No Flyway migration for the `project` schema decision/risk tables
- The LLM service has an existing `risk_quality_agent.py` that could be extended for risk analysis

The design spec defines 16 intents, 7 metrics, 13 FilterSpec keys, server-driven `allowedTransitions`, Summary DTO separation, and an Idempotency-Key/If-Match concurrency model.

---

## 2. DB Schema Changes (Flyway Migration)

**File**: `V20260236_02__decision_risk_tables.sql`
**Schema**: `project`

```sql
-- V20260236_02: Decision/Risk Board tables
-- Design spec: 12_결정리스크_화면설계.md v2.1

-- ============================================================
-- 1. Decisions
-- ============================================================
CREATE TABLE project.decisions (
    id                  VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id          VARCHAR(36) NOT NULL,
    decision_code       VARCHAR(50) NOT NULL,
    title               VARCHAR(500) NOT NULL,
    description         TEXT,
    status              VARCHAR(30) NOT NULL DEFAULT 'PROPOSED',
        -- PROPOSED, UNDER_REVIEW, APPROVED, REJECTED, DEFERRED
    priority            VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
        -- CRITICAL, HIGH, MEDIUM, LOW
    category            VARCHAR(50),
        -- ARCHITECTURE, SCOPE, RESOURCE, PROCESS, TECHNICAL, BUSINESS
    owner_id            VARCHAR(36) NOT NULL,
    part_id             VARCHAR(36),
    phase_id            VARCHAR(36),
    options_json        JSONB DEFAULT '[]'::jsonb,
        -- Array of { id, label, description, pros, cons }
    selected_option     VARCHAR(100),
    rationale           TEXT,
    due_date            DATE,
    decided_at          TIMESTAMPTZ,
    decided_by          VARCHAR(36),
    etag                VARCHAR(64) NOT NULL DEFAULT gen_random_uuid()::text,
    sla_hours           INTEGER DEFAULT 168,  -- 7 days default
    escalated_from_id   VARCHAR(36),
    escalated_from_type VARCHAR(20),
        -- ISSUE, RISK
    version             INTEGER NOT NULL DEFAULT 1,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    created_by          VARCHAR(36),
    updated_by          VARCHAR(36),
    CONSTRAINT uq_decision_code_project UNIQUE(project_id, decision_code)
);

CREATE INDEX idx_dec_project ON project.decisions(project_id);
CREATE INDEX idx_dec_status ON project.decisions(status);
CREATE INDEX idx_dec_owner ON project.decisions(owner_id);
CREATE INDEX idx_dec_part ON project.decisions(part_id) WHERE part_id IS NOT NULL;
CREATE INDEX idx_dec_phase ON project.decisions(phase_id) WHERE phase_id IS NOT NULL;
CREATE INDEX idx_dec_escalated ON project.decisions(escalated_from_id) WHERE escalated_from_id IS NOT NULL;
CREATE INDEX idx_dec_project_status ON project.decisions(project_id, status);

COMMENT ON TABLE project.decisions IS 'Project decisions with Kanban workflow (PROPOSED -> UNDER_REVIEW -> APPROVED/REJECTED/DEFERRED)';
COMMENT ON COLUMN project.decisions.etag IS 'Optimistic concurrency control via If-Match header';

-- ============================================================
-- 2. Risks
-- ============================================================
CREATE TABLE project.risks (
    id                  VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id          VARCHAR(36) NOT NULL,
    risk_code           VARCHAR(50) NOT NULL,
    title               VARCHAR(500) NOT NULL,
    description         TEXT,
    status              VARCHAR(30) NOT NULL DEFAULT 'IDENTIFIED',
        -- IDENTIFIED, ASSESSED, MITIGATING, RESOLVED, ACCEPTED
    category            VARCHAR(50),
        -- TECHNICAL, SCHEDULE, COST, RESOURCE, EXTERNAL, SCOPE, QUALITY
    impact              INTEGER NOT NULL DEFAULT 3 CHECK (impact BETWEEN 1 AND 5),
    probability         INTEGER NOT NULL DEFAULT 3 CHECK (probability BETWEEN 1 AND 5),
    score               INTEGER GENERATED ALWAYS AS (impact * probability) STORED,
    severity            VARCHAR(20) GENERATED ALWAYS AS (
        CASE
            WHEN impact * probability >= 16 THEN 'CRITICAL'
            WHEN impact * probability >= 10 THEN 'HIGH'
            WHEN impact * probability >= 5 THEN 'MEDIUM'
            ELSE 'LOW'
        END
    ) STORED,
    owner_id            VARCHAR(36) NOT NULL,
    part_id             VARCHAR(36),
    phase_id            VARCHAR(36),
    mitigation_plan     TEXT,
    contingency_plan    TEXT,
    due_date            DATE,
    etag                VARCHAR(64) NOT NULL DEFAULT gen_random_uuid()::text,
    escalated_from_id   VARCHAR(36),
    escalated_from_type VARCHAR(20),
        -- ISSUE
    escalated_to_id     VARCHAR(36),  -- decision_id if escalated to decision
    version             INTEGER NOT NULL DEFAULT 1,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    created_by          VARCHAR(36),
    updated_by          VARCHAR(36),
    CONSTRAINT uq_risk_code_project UNIQUE(project_id, risk_code)
);

CREATE INDEX idx_risk_project ON project.risks(project_id);
CREATE INDEX idx_risk_status ON project.risks(status);
CREATE INDEX idx_risk_severity ON project.risks(severity);
CREATE INDEX idx_risk_score ON project.risks(score DESC);
CREATE INDEX idx_risk_owner ON project.risks(owner_id);
CREATE INDEX idx_risk_part ON project.risks(part_id) WHERE part_id IS NOT NULL;
CREATE INDEX idx_risk_phase ON project.risks(phase_id) WHERE phase_id IS NOT NULL;
CREATE INDEX idx_risk_project_status ON project.risks(project_id, status);
CREATE INDEX idx_risk_escalated ON project.risks(escalated_from_id) WHERE escalated_from_id IS NOT NULL;

COMMENT ON TABLE project.risks IS 'Project risks with 5x5 impact-probability matrix';
COMMENT ON COLUMN project.risks.score IS 'impact * probability (server-computed, READ-ONLY)';
COMMENT ON COLUMN project.risks.severity IS 'Derived from score: CRITICAL(>=16), HIGH(>=10), MEDIUM(>=5), LOW(<5)';

-- ============================================================
-- 3. Risk Assessments (history of assessments)
-- ============================================================
CREATE TABLE project.risk_assessments (
    id                  VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    risk_id             VARCHAR(36) NOT NULL REFERENCES project.risks(id) ON DELETE CASCADE,
    assessed_by         VARCHAR(36) NOT NULL,
    impact              INTEGER NOT NULL CHECK (impact BETWEEN 1 AND 5),
    probability         INTEGER NOT NULL CHECK (probability BETWEEN 1 AND 5),
    score               INTEGER GENERATED ALWAYS AS (impact * probability) STORED,
    severity            VARCHAR(20) GENERATED ALWAYS AS (
        CASE
            WHEN impact * probability >= 16 THEN 'CRITICAL'
            WHEN impact * probability >= 10 THEN 'HIGH'
            WHEN impact * probability >= 5 THEN 'MEDIUM'
            ELSE 'LOW'
        END
    ) STORED,
    justification       TEXT,
    ai_assisted         BOOLEAN DEFAULT FALSE,
    ai_confidence       DECIMAL(3,2),
    assessment_source   VARCHAR(30) DEFAULT 'MANUAL',
        -- MANUAL, AI_ASSISTED, AI_AUTO
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ra_risk ON project.risk_assessments(risk_id, created_at DESC);

-- ============================================================
-- 4. Decision/Risk Audit Trail
-- ============================================================
CREATE TABLE project.decision_risk_audit_trail (
    id                  VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    entity_type         VARCHAR(20) NOT NULL,
        -- DECISION, RISK
    entity_id           VARCHAR(36) NOT NULL,
    project_id          VARCHAR(36) NOT NULL,
    action              VARCHAR(50) NOT NULL,
        -- CREATED, STATUS_CHANGED, ESCALATED, ASSESSED, OPTION_SELECTED, APPROVED, REJECTED, DEFERRED
    from_status         VARCHAR(30),
    to_status           VARCHAR(30),
    actor_id            VARCHAR(36) NOT NULL,
    details_json        JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_drat_entity ON project.decision_risk_audit_trail(entity_type, entity_id);
CREATE INDEX idx_drat_project ON project.decision_risk_audit_trail(project_id);
CREATE INDEX idx_drat_created ON project.decision_risk_audit_trail(created_at DESC);

-- ============================================================
-- 5. Escalation Links (Issue -> Risk -> Decision chain)
-- ============================================================
CREATE TABLE project.escalation_links (
    id                  VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    source_type         VARCHAR(20) NOT NULL,
        -- ISSUE, RISK
    source_id           VARCHAR(36) NOT NULL,
    target_type         VARCHAR(20) NOT NULL,
        -- RISK, DECISION
    target_id           VARCHAR(36) NOT NULL,
    escalated_by        VARCHAR(36) NOT NULL,
    reason              TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_escalation_link UNIQUE(source_type, source_id, target_type, target_id)
);

CREATE INDEX idx_el_source ON project.escalation_links(source_type, source_id);
CREATE INDEX idx_el_target ON project.escalation_links(target_type, target_id);
```

---

## 3. Java Package Structure

```
com.insuretech.pms.decision
  +-- controller/
  |   +-- ReactiveDecisionController.java
  |   +-- ReactiveRiskController.java
  |   +-- ReactiveEscalationController.java
  +-- service/
  |   +-- ReactiveDecisionService.java
  |   +-- ReactiveRiskService.java
  |   +-- ReactiveRiskAssessmentService.java
  |   +-- ReactiveEscalationService.java
  |   +-- ReactiveDecisionRiskAuditService.java
  +-- reactive/
  |   +-- entity/
  |   |   +-- R2dbcDecision.java
  |   |   +-- R2dbcRisk.java
  |   |   +-- R2dbcRiskAssessment.java
  |   |   +-- R2dbcDecisionRiskAuditTrail.java
  |   |   +-- R2dbcEscalationLink.java
  |   +-- repository/
  |       +-- ReactiveDecisionRepository.java
  |       +-- ReactiveRiskRepository.java
  |       +-- ReactiveRiskAssessmentRepository.java
  |       +-- ReactiveDecisionRiskAuditRepository.java
  |       +-- ReactiveEscalationLinkRepository.java
  +-- dto/
      +-- DecisionDto.java
      +-- DecisionSummaryDto.java      (v2.1: lightweight list DTO)
      +-- DecisionCreateRequest.java
      +-- DecisionUpdateRequest.java
      +-- DecisionTransitionRequest.java
      +-- RiskDto.java
      +-- RiskSummaryDto.java           (v2.1: lightweight list DTO)
      +-- RiskCreateRequest.java
      +-- RiskUpdateRequest.java
      +-- RiskAssessmentDto.java
      +-- RiskAssessmentRequest.java
      +-- EscalationRequest.java
      +-- EscalationChainDto.java
      +-- DecisionRiskKpiDto.java
      +-- RiskMatrixDto.java
      +-- AllowedTransitionsDto.java
```

---

## 4. API Endpoint List

### 4.1 Decisions

Base path: `/api/v2/projects/{projectId}/decisions`

| Method | Path | Description | Auth | Headers |
|--------|------|-------------|------|---------|
| `GET` | `/` | List decisions (Summary DTO, FilterSpec: decisionStatus[], ownerId, partId, phaseId, dateRange, q, view, selected) | `view_decisions` | |
| `GET` | `/{decisionId}` | Get decision detail (full DTO + allowedTransitions) | `view_decisions` | |
| `GET` | `/{decisionId}/audit` | Get audit trail for a decision (v2.1: separate endpoint) | `view_decisions` | |
| `POST` | `/` | Create decision | `manage_decisions` | `Idempotency-Key` |
| `PUT` | `/{decisionId}` | Update decision | `manage_decisions` | `If-Match: {etag}` |
| `PATCH` | `/{decisionId}/transition` | Transition status (server-driven: uses allowedTransitions) | `manage_decisions` | `If-Match: {etag}` |
| `POST` | `/{decisionId}/approve` | Approve decision (validates: options>=2, selectedOption, rationale) | `manage_decisions` | `If-Match: {etag}` |
| `POST` | `/{decisionId}/reject` | Reject decision | `manage_decisions` | `If-Match: {etag}` |
| `POST` | `/{decisionId}/defer` | Defer decision | `manage_decisions` | `If-Match: {etag}` |
| `DELETE` | `/{decisionId}` | Delete decision (only if PROPOSED) | `manage_decisions` | |

### 4.2 Risks

Base path: `/api/v2/projects/{projectId}/risks`

| Method | Path | Description | Auth | Headers |
|--------|------|-------------|------|---------|
| `GET` | `/` | List risks (Summary DTO, FilterSpec: riskStatus[], severity, ownerId, partId, phaseId, dateRange, hasEscalation, q) | `view_decisions` | |
| `GET` | `/{riskId}` | Get risk detail + latest assessment + allowedTransitions | `view_decisions` | |
| `GET` | `/{riskId}/audit` | Get audit trail for a risk | `view_decisions` | |
| `GET` | `/{riskId}/assessments` | List risk assessment history | `view_decisions` | |
| `POST` | `/` | Create risk | `manage_decisions` | `Idempotency-Key` |
| `PUT` | `/{riskId}` | Update risk metadata | `manage_decisions` | `If-Match: {etag}` |
| `PATCH` | `/{riskId}/transition` | Transition risk status | `manage_decisions` | `If-Match: {etag}` |
| `POST` | `/{riskId}/assess` | Record risk assessment (manual or AI-assisted) | `manage_decisions` | |
| `DELETE` | `/{riskId}` | Delete risk (only if IDENTIFIED) | `manage_decisions` | |

### 4.3 Escalation

Base path: `/api/v2/projects/{projectId}/escalations`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/` | Create escalation (new or link existing target) | `manage_decisions` |
| `GET` | `/chain/{entityType}/{entityId}` | Get escalation chain (Issue->Risk->Decision) | `view_decisions` |

### 4.4 KPI & Matrix

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/v2/projects/{projectId}/decision-risk/kpi` | KPI summary (total_decisions, pending_decisions, total_risks, critical_risks, avg_decision_time, escalation_count, risk_score_trend) | `view_decisions` |
| `GET` | `/api/v2/projects/{projectId}/risks/matrix` | 5x5 Risk Matrix data (positions + severity counts) | `view_decisions` |

---

## 5. LLM Workflow: Risk Analysis Integration

The existing `llm-service/agents/risk_quality_agent.py` provides risk assessment capabilities. Integration approach:

### Integration via Spring WebClient -> LLM Service

```java
// In ReactiveRiskAssessmentService.java
public Mono<RiskAssessmentDto> assessRiskWithAi(String projectId, String riskId) {
    return webClient.post()
        .uri(aiServiceUrl + "/api/risk/assess")
        .bodyValue(Map.of(
            "project_id", projectId,
            "risk_id", riskId,
            "risk_description", risk.getDescription(),
            "context", "project_context_snapshot"
        ))
        .retrieve()
        .bodyToMono(AiRiskAssessmentResponse.class)
        .map(this::toRiskAssessment);
}
```

### LLM Service Enhancement (if needed)

If `risk_quality_agent.py` does not expose a REST endpoint for single-risk assessment, add:

**File**: `llm-service/routes/risk_routes.py`

```python
@risk_bp.route('/api/risk/assess', methods=['POST'])
def assess_risk():
    """AI-assisted risk assessment for a single risk."""
    data = request.get_json()
    # Uses existing risk_quality_agent with project context
    result = risk_quality_agent.assess_single_risk(
        project_id=data['project_id'],
        risk_description=data['risk_description']
    )
    return jsonify({
        'impact': result.impact,
        'probability': result.probability,
        'justification': result.justification,
        'confidence': result.confidence
    })
```

---

## 6. Implementation Steps (Ordered)

### Phase 1: Database & Entities (2 days)
1. Create Flyway migration `V20260236_02__decision_risk_tables.sql`
2. Implement R2DBC entities: `R2dbcDecision`, `R2dbcRisk`, `R2dbcRiskAssessment`, `R2dbcDecisionRiskAuditTrail`, `R2dbcEscalationLink`
3. Implement reactive repositories with custom query methods
4. Add `findByProjectIdAndStatus`, `findByProjectIdAndSeverity`, matrix aggregation queries

### Phase 2: Service Layer (3 days)
5. Implement `ReactiveDecisionService` with state machine (PROPOSED -> UNDER_REVIEW -> APPROVED/REJECTED/DEFERRED)
6. Implement `ReactiveRiskService` with state machine (IDENTIFIED -> ASSESSED -> MITIGATING -> RESOLVED/ACCEPTED)
7. Implement `ReactiveRiskAssessmentService` (manual + AI-assisted assessment recording)
8. Implement `ReactiveEscalationService` (create-vs-link logic, chain resolution)
9. Implement `ReactiveDecisionRiskAuditService` (audit trail recording for all state transitions)
10. Implement server-driven `allowedTransitions` logic per entity status + user capability
11. Implement ETag generation and If-Match validation for optimistic concurrency
12. Implement Idempotency-Key check (store in Redis with 24h TTL)

### Phase 3: Controllers (2 days)
13. Implement `ReactiveDecisionController` with all CRUD + transition + approve/reject/defer endpoints
14. Implement `ReactiveRiskController` with all CRUD + transition + assess endpoints
15. Implement `ReactiveEscalationController` with create + chain endpoints
16. Add KPI aggregation endpoint (`/decision-risk/kpi`)
17. Add Risk Matrix data endpoint (`/risks/matrix`)
18. Add `@PreAuthorize` for `view_decisions` and `manage_decisions`
19. Add Idempotency-Key and If-Match header handling
20. Add ScopeEcho + reliability 3-tuple to all responses

### Phase 4: AI Integration (1 day)
21. Add WebClient call to LLM service for AI risk assessment
22. Create or extend `risk_quality_agent.py` with single-risk assessment endpoint
23. Store AI assessment with `ai_assisted=true`, `ai_confidence`, `assessment_source='AI_ASSISTED'`

### Phase 5: Testing & Documentation (2 days)
24. Unit tests for state machines (decision transitions, risk transitions)
25. Unit tests for ETag/If-Match concurrency control
26. Integration tests for escalation chain resolution
27. Integration tests for Risk Matrix aggregation
28. Add OpenAPI annotations

---

## 7. Verification Steps

- [ ] All 5 tables created in `project` schema with correct indexes, constraints, and generated columns
- [ ] `score` and `severity` columns are correctly generated from `impact * probability`
- [ ] Decision state machine enforces valid transitions only
- [ ] Decision APPROVED transition validates: `options.length >= 2`, `selectedOption` set, `rationale` non-empty
- [ ] Risk state machine enforces valid transitions only
- [ ] `allowedTransitions` included in detail endpoint responses, driven by current status + user capabilities
- [ ] ETag updated on every mutation; `If-Match` mismatch returns 412 Precondition Failed
- [ ] `Idempotency-Key` prevents duplicate creation within 24h window
- [ ] Audit trail records every state change with actor, timestamp, from/to status
- [ ] Escalation chain correctly resolves Issue -> Risk -> Decision links
- [ ] Risk Matrix endpoint returns 5x5 grid with risk counts per cell
- [ ] KPI endpoint returns all 7 metrics correctly
- [ ] Summary DTOs used for list endpoints (no `options_json`, no `audit_trail`)
- [ ] Full DTOs used for detail endpoints
- [ ] AI risk assessment stores result with `ai_assisted=true`
- [ ] FilterSpec supports all 13 keys including multi-value `decisionStatus[]` and `riskStatus[]`
- [ ] `@PreAuthorize` correctly enforces capabilities
