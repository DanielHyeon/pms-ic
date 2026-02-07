-- V20260232_05: Data quality snapshots table for history tracking
-- "Query-time snapshot" strategy: auto-saved when /data-quality API is called

CREATE TABLE IF NOT EXISTS audit.data_quality_snapshots (
    id                 VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id         VARCHAR(36) NOT NULL,
    snapshot_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    overall_score      NUMERIC(5,1) NOT NULL,
    grade              VARCHAR(1) NOT NULL,
    integrity_score    NUMERIC(5,1) NOT NULL,
    readiness_score    NUMERIC(5,1) NOT NULL,
    traceability_score NUMERIC(5,1) NOT NULL,
    metrics_json       JSONB NOT NULL,
    created_at         TIMESTAMP DEFAULT NOW(),
    UNIQUE(project_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_dq_snapshots_project_date
    ON audit.data_quality_snapshots(project_id, snapshot_date);
