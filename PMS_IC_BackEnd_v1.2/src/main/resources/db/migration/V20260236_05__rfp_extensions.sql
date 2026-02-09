-- RFP Extensions: Origin policy, versions, document chunks, extraction runs, candidates
-- Version: 20260236_05
-- Spec: docs/10_menu/화면설계/24_RFP_화면설계.md v2.2

CREATE SCHEMA IF NOT EXISTS rfp;

----------------------------------------------------------------------
-- 1. Origin policy per project
----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rfp.origin_policies (
    id                      VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id              VARCHAR(36) NOT NULL UNIQUE,
    origin_type             VARCHAR(30) NOT NULL CHECK (origin_type IN ('EXTERNAL_RFP','INTERNAL_INITIATIVE','MODERNIZATION','MIXED')),
    require_source_rfp_id   BOOLEAN NOT NULL DEFAULT true,
    evidence_level          VARCHAR(10) NOT NULL DEFAULT 'FULL' CHECK (evidence_level IN ('FULL','PARTIAL')),
    change_approval_required BOOLEAN NOT NULL DEFAULT true,
    auto_analysis_enabled   BOOLEAN NOT NULL DEFAULT true,
    lineage_enforcement     VARCHAR(10) NOT NULL DEFAULT 'STRICT' CHECK (lineage_enforcement IN ('STRICT','RELAXED')),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by              VARCHAR(36),
    updated_by              VARCHAR(36)
);

CREATE INDEX IF NOT EXISTS idx_origin_policies_project ON rfp.origin_policies(project_id);

----------------------------------------------------------------------
-- 2. Add new columns to project.rfps
----------------------------------------------------------------------
ALTER TABLE project.rfps ADD COLUMN IF NOT EXISTS origin_type VARCHAR(30);
ALTER TABLE project.rfps ADD COLUMN IF NOT EXISTS version_label VARCHAR(20) DEFAULT 'v1.0';
ALTER TABLE project.rfps ADD COLUMN IF NOT EXISTS checksum VARCHAR(100);
ALTER TABLE project.rfps ADD COLUMN IF NOT EXISTS previous_status VARCHAR(50);
ALTER TABLE project.rfps ADD COLUMN IF NOT EXISTS failure_reason TEXT;
ALTER TABLE project.rfps ADD COLUMN IF NOT EXISTS source_name VARCHAR(255);
ALTER TABLE project.rfps ADD COLUMN IF NOT EXISTS rfp_type VARCHAR(50);

-- Update status comment to reflect new states
COMMENT ON COLUMN project.rfps.status IS 'EMPTY, ORIGIN_DEFINED, UPLOADED, PARSING, PARSED, EXTRACTING, EXTRACTED, REVIEWING, CONFIRMED, NEEDS_REANALYSIS, ON_HOLD, FAILED (also legacy: DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED)';

----------------------------------------------------------------------
-- 3. RFP versions
----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rfp.rfp_versions (
    id              VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    rfp_id          VARCHAR(36) NOT NULL REFERENCES project.rfps(id) ON DELETE CASCADE,
    version_label   VARCHAR(20) NOT NULL,
    file_name       VARCHAR(255),
    file_path       VARCHAR(500),
    file_type       VARCHAR(50),
    file_size       BIGINT,
    checksum        VARCHAR(100),
    uploaded_by     VARCHAR(36),
    uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rfp_versions_rfp ON rfp.rfp_versions(rfp_id);
CREATE INDEX IF NOT EXISTS idx_rfp_versions_label ON rfp.rfp_versions(rfp_id, version_label);

----------------------------------------------------------------------
-- 4. Document chunks (parsed sections/paragraphs)
----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rfp.rfp_document_chunks (
    id              VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    rfp_id          VARCHAR(36) NOT NULL REFERENCES project.rfps(id) ON DELETE CASCADE,
    version_id      VARCHAR(36) REFERENCES rfp.rfp_versions(id) ON DELETE SET NULL,
    section_id      VARCHAR(50),
    paragraph_id    VARCHAR(50),
    chunk_order     INTEGER NOT NULL DEFAULT 0,
    heading         VARCHAR(500),
    content         TEXT NOT NULL,
    page_number     INTEGER,
    chunk_type      VARCHAR(30) DEFAULT 'PARAGRAPH' CHECK (chunk_type IN ('HEADING','PARAGRAPH','TABLE','LIST','FIGURE')),
    token_count     INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rfp_chunks_rfp ON rfp.rfp_document_chunks(rfp_id);
CREATE INDEX IF NOT EXISTS idx_rfp_chunks_section ON rfp.rfp_document_chunks(rfp_id, section_id);

----------------------------------------------------------------------
-- 5. Extraction runs (AI analysis runs)
----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rfp.rfp_extraction_runs (
    id                  VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    rfp_id              VARCHAR(36) NOT NULL REFERENCES project.rfps(id) ON DELETE CASCADE,
    rfp_version_id      VARCHAR(36) REFERENCES rfp.rfp_versions(id) ON DELETE SET NULL,
    model_name          VARCHAR(100) NOT NULL,
    model_version       VARCHAR(50),
    prompt_version      VARCHAR(20),
    schema_version      VARCHAR(20) DEFAULT 'v1.0',
    generation_params   JSONB,
    status              VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','RUNNING','COMPLETED','FAILED')),
    is_active           BOOLEAN NOT NULL DEFAULT false,
    total_candidates    INTEGER DEFAULT 0,
    ambiguity_count     INTEGER DEFAULT 0,
    avg_confidence      DECIMAL(3,2) DEFAULT 0,
    category_breakdown  JSONB,
    error_message       TEXT,
    started_at          TIMESTAMPTZ,
    finished_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by          VARCHAR(36)
);

CREATE INDEX IF NOT EXISTS idx_extraction_runs_rfp ON rfp.rfp_extraction_runs(rfp_id);
CREATE INDEX IF NOT EXISTS idx_extraction_runs_active ON rfp.rfp_extraction_runs(rfp_id, is_active) WHERE is_active = true;

----------------------------------------------------------------------
-- 6. Requirement candidates (AI-extracted, before human review)
----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rfp.rfp_requirement_candidates (
    id                      VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    extraction_run_id       VARCHAR(36) NOT NULL REFERENCES rfp.rfp_extraction_runs(id) ON DELETE CASCADE,
    rfp_id                  VARCHAR(36) NOT NULL REFERENCES project.rfps(id) ON DELETE CASCADE,
    req_key                 VARCHAR(50) NOT NULL,
    text                    TEXT NOT NULL,
    category                VARCHAR(30) NOT NULL DEFAULT 'FUNCTIONAL' CHECK (category IN ('FUNCTIONAL','NON_FUNCTIONAL','CONSTRAINT')),
    priority_hint           VARCHAR(20) DEFAULT 'UNKNOWN' CHECK (priority_hint IN ('MUST','SHOULD','COULD','UNKNOWN')),
    confidence              DECIMAL(3,2) NOT NULL DEFAULT 0,
    source_section          VARCHAR(100),
    source_paragraph_id     VARCHAR(100),
    source_quote            VARCHAR(500),
    is_ambiguous            BOOLEAN NOT NULL DEFAULT false,
    ambiguity_questions     JSONB DEFAULT '[]'::jsonb,
    duplicate_refs          JSONB DEFAULT '[]'::jsonb,
    status                  VARCHAR(20) NOT NULL DEFAULT 'PROPOSED' CHECK (status IN ('PROPOSED','ACCEPTED','REJECTED','EDITED')),
    edited_text             TEXT,
    reviewed_by             VARCHAR(36),
    reviewed_at             TIMESTAMPTZ,
    confirmed_requirement_id VARCHAR(36),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_candidates_run ON rfp.rfp_requirement_candidates(extraction_run_id);
CREATE INDEX IF NOT EXISTS idx_candidates_rfp ON rfp.rfp_requirement_candidates(rfp_id);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON rfp.rfp_requirement_candidates(status);

----------------------------------------------------------------------
-- 7. RFP change events (for diff/impact tracking)
----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rfp.rfp_change_events (
    id              VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    rfp_id          VARCHAR(36) NOT NULL REFERENCES project.rfps(id) ON DELETE CASCADE,
    change_type     VARCHAR(30) NOT NULL CHECK (change_type IN ('VERSION_UPLOAD','REANALYSIS','REQUIREMENT_CHANGE','STATUS_CHANGE')),
    reason          TEXT,
    from_version_id VARCHAR(36),
    to_version_id   VARCHAR(36),
    impact_snapshot JSONB,
    changed_by      VARCHAR(36),
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_change_events_rfp ON rfp.rfp_change_events(rfp_id);

COMMENT ON TABLE rfp.origin_policies IS 'Per-project origin type and governance policy settings';
COMMENT ON TABLE rfp.rfp_versions IS 'Version history for RFP document uploads';
COMMENT ON TABLE rfp.rfp_document_chunks IS 'Parsed document sections/paragraphs for lineage tracking';
COMMENT ON TABLE rfp.rfp_extraction_runs IS 'AI extraction run metadata (model, prompt, results)';
COMMENT ON TABLE rfp.rfp_requirement_candidates IS 'AI-extracted requirement candidates before human confirmation';
COMMENT ON TABLE rfp.rfp_change_events IS 'Change events for diff/impact tracking';
