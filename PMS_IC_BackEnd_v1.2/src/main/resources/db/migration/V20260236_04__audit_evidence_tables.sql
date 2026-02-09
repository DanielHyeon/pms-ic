-- V20260236_04: Audit Evidence Export tables
-- Design spec: 16_감사증빙_화면설계.md v2.1

CREATE SCHEMA IF NOT EXISTS audit;

-- Evidence Export Packages
CREATE TABLE IF NOT EXISTS audit.evidence_packages (
    id                  VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id          VARCHAR(36) NOT NULL,
    requested_by        VARCHAR(36) NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        -- PENDING, PROCESSING, COMPLETED, FAILED
    package_type        VARCHAR(10) NOT NULL DEFAULT 'ZIP',
        -- ZIP, PDF
    filter_snapshot     JSONB,
    selection_ids       JSONB,
    total_items         INTEGER DEFAULT 0,
    processed_items     INTEGER DEFAULT 0,
    file_path           VARCHAR(500),
    file_size_bytes     BIGINT,
    download_url        VARCHAR(500),
    download_expires_at TIMESTAMPTZ,
    sealed_at           TIMESTAMPTZ,
    selection_hash      VARCHAR(64),
    error_message       TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ep_project ON audit.evidence_packages(project_id);
CREATE INDEX IF NOT EXISTS idx_ep_status ON audit.evidence_packages(status);
CREATE INDEX IF NOT EXISTS idx_ep_requested ON audit.evidence_packages(requested_by);

-- Evidence Audit Trail
CREATE TABLE IF NOT EXISTS audit.evidence_audit_trail (
    id                  VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id          VARCHAR(36) NOT NULL,
    user_id             VARCHAR(36) NOT NULL,
    event_type          VARCHAR(30) NOT NULL,
        -- EVIDENCE_VIEWED, EVIDENCE_SELECTED, EXPORT_STARTED, EXPORT_COMPLETED, EXPORT_DOWNLOADED, EXPORT_SEALED, URL_REISSUED
    package_id          VARCHAR(36),
    evidence_ids        JSONB,
    filter_snapshot     JSONB,
    ip_address          VARCHAR(45),
    proxy_ip            VARCHAR(45),
    user_agent          VARCHAR(500),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eat_project ON audit.evidence_audit_trail(project_id);
CREATE INDEX IF NOT EXISTS idx_eat_user ON audit.evidence_audit_trail(user_id);
CREATE INDEX IF NOT EXISTS idx_eat_event ON audit.evidence_audit_trail(event_type);
CREATE INDEX IF NOT EXISTS idx_eat_created ON audit.evidence_audit_trail(created_at DESC);
