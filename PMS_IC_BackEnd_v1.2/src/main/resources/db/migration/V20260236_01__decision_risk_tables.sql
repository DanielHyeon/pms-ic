-- V20260236_01: Decision/Risk Board tables
-- Design spec: 12_결정리스크_화면설계.md v2.1

-- ============================================================
-- 1. Decisions
-- ============================================================
CREATE TABLE IF NOT EXISTS project.decisions (
    id                  VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id          VARCHAR(36) NOT NULL,
    decision_code       VARCHAR(50) NOT NULL,
    title               VARCHAR(500) NOT NULL,
    description         TEXT,
    status              VARCHAR(30) NOT NULL DEFAULT 'PROPOSED',
    priority            VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    category            VARCHAR(50),
    owner_id            VARCHAR(36) NOT NULL,
    part_id             VARCHAR(36),
    phase_id            VARCHAR(36),
    options_json        JSONB DEFAULT '[]'::jsonb,
    selected_option     VARCHAR(100),
    rationale           TEXT,
    due_date            DATE,
    decided_at          TIMESTAMPTZ,
    decided_by          VARCHAR(36),
    etag                VARCHAR(64) NOT NULL DEFAULT gen_random_uuid()::text,
    sla_hours           INTEGER DEFAULT 168,
    escalated_from_id   VARCHAR(36),
    escalated_from_type VARCHAR(20),
    version             INTEGER NOT NULL DEFAULT 1,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    created_by          VARCHAR(36),
    updated_by          VARCHAR(36),
    CONSTRAINT uq_decision_code_project UNIQUE(project_id, decision_code)
);

CREATE INDEX IF NOT EXISTS idx_dec_project ON project.decisions(project_id);
CREATE INDEX IF NOT EXISTS idx_dec_status ON project.decisions(status);
CREATE INDEX IF NOT EXISTS idx_dec_owner ON project.decisions(owner_id);
CREATE INDEX IF NOT EXISTS idx_dec_project_status ON project.decisions(project_id, status);

COMMENT ON TABLE project.decisions IS 'Project decisions with Kanban workflow (PROPOSED -> UNDER_REVIEW -> APPROVED/REJECTED/DEFERRED)';

-- ============================================================
-- 2. Risks
-- ============================================================
CREATE TABLE IF NOT EXISTS project.risks (
    id                  VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id          VARCHAR(36) NOT NULL,
    risk_code           VARCHAR(50) NOT NULL,
    title               VARCHAR(500) NOT NULL,
    description         TEXT,
    status              VARCHAR(30) NOT NULL DEFAULT 'IDENTIFIED',
    category            VARCHAR(50),
    impact              INTEGER NOT NULL DEFAULT 3 CHECK (impact BETWEEN 1 AND 5),
    probability         INTEGER NOT NULL DEFAULT 3 CHECK (probability BETWEEN 1 AND 5),
    score               INTEGER GENERATED ALWAYS AS (impact * probability) STORED,
    owner_id            VARCHAR(36) NOT NULL,
    part_id             VARCHAR(36),
    phase_id            VARCHAR(36),
    mitigation_plan     TEXT,
    contingency_plan    TEXT,
    due_date            DATE,
    etag                VARCHAR(64) NOT NULL DEFAULT gen_random_uuid()::text,
    escalated_from_id   VARCHAR(36),
    escalated_from_type VARCHAR(20),
    escalated_to_id     VARCHAR(36),
    version             INTEGER NOT NULL DEFAULT 1,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    created_by          VARCHAR(36),
    updated_by          VARCHAR(36),
    CONSTRAINT uq_risk_code_project UNIQUE(project_id, risk_code)
);

CREATE INDEX IF NOT EXISTS idx_risk_project ON project.risks(project_id);
CREATE INDEX IF NOT EXISTS idx_risk_status ON project.risks(status);
CREATE INDEX IF NOT EXISTS idx_risk_score ON project.risks(score DESC);
CREATE INDEX IF NOT EXISTS idx_risk_project_status ON project.risks(project_id, status);

COMMENT ON TABLE project.risks IS 'Project risks with 5x5 impact-probability matrix';

-- ============================================================
-- 3. Risk Assessments (history)
-- ============================================================
CREATE TABLE IF NOT EXISTS project.risk_assessments (
    id                  VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    risk_id             VARCHAR(36) NOT NULL REFERENCES project.risks(id) ON DELETE CASCADE,
    assessed_by         VARCHAR(36) NOT NULL,
    impact              INTEGER NOT NULL CHECK (impact BETWEEN 1 AND 5),
    probability         INTEGER NOT NULL CHECK (probability BETWEEN 1 AND 5),
    score               INTEGER GENERATED ALWAYS AS (impact * probability) STORED,
    justification       TEXT,
    ai_assisted         BOOLEAN DEFAULT FALSE,
    ai_confidence       DECIMAL(3,2),
    assessment_source   VARCHAR(30) DEFAULT 'MANUAL',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ra_risk ON project.risk_assessments(risk_id, created_at DESC);

-- ============================================================
-- 4. Decision/Risk Audit Trail
-- ============================================================
CREATE TABLE IF NOT EXISTS project.decision_risk_audit_trail (
    id                  VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    entity_type         VARCHAR(20) NOT NULL,
    entity_id           VARCHAR(36) NOT NULL,
    project_id          VARCHAR(36) NOT NULL,
    action              VARCHAR(50) NOT NULL,
    from_status         VARCHAR(30),
    to_status           VARCHAR(30),
    actor_id            VARCHAR(36) NOT NULL,
    details_json        JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drat_entity ON project.decision_risk_audit_trail(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_drat_project ON project.decision_risk_audit_trail(project_id);

-- ============================================================
-- 5. Escalation Links (Issue -> Risk -> Decision chain)
-- ============================================================
CREATE TABLE IF NOT EXISTS project.escalation_links (
    id                  VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    source_type         VARCHAR(20) NOT NULL,
    source_id           VARCHAR(36) NOT NULL,
    target_type         VARCHAR(20) NOT NULL,
    target_id           VARCHAR(36) NOT NULL,
    escalated_by        VARCHAR(36) NOT NULL,
    reason              TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_escalation_link UNIQUE(source_type, source_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_el_source ON project.escalation_links(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_el_target ON project.escalation_links(target_type, target_id);
