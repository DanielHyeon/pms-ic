-- Admin DB Settings Tables Migration
-- Version: 20260201
-- Description: Create backup_history and sync_history tables for admin DB management

-- ============================================
-- 1. Create admin schema if not exists
-- ============================================

CREATE SCHEMA IF NOT EXISTS admin;

-- ============================================
-- 2. Backup History Table
-- ============================================

CREATE TABLE IF NOT EXISTS admin.backup_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Backup identification
    backup_type VARCHAR(20) NOT NULL,        -- POSTGRES, NEO4J, FULL
    backup_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size_bytes BIGINT,

    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',  -- IN_PROGRESS, COMPLETED, FAILED
    error_message TEXT,

    -- Metadata
    created_by VARCHAR(50) NOT NULL,
    duration_ms INT,

    -- Timestamps
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_backup_history_type ON admin.backup_history(backup_type);
CREATE INDEX IF NOT EXISTS idx_backup_history_status ON admin.backup_history(status);
CREATE INDEX IF NOT EXISTS idx_backup_history_created ON admin.backup_history(created_at DESC);

COMMENT ON TABLE admin.backup_history IS 'Tracks database backup operations for PostgreSQL and Neo4j';
COMMENT ON COLUMN admin.backup_history.backup_type IS 'Type of backup: POSTGRES, NEO4J, or FULL (both)';
COMMENT ON COLUMN admin.backup_history.status IS 'Backup status: IN_PROGRESS, COMPLETED, FAILED';
COMMENT ON COLUMN admin.backup_history.file_path IS 'Path to backup file(s) in the backup directory';


-- ============================================
-- 3. Sync History Table
-- ============================================

CREATE TABLE IF NOT EXISTS admin.sync_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Sync identification
    sync_type VARCHAR(20) NOT NULL,          -- FULL, INCREMENTAL
    status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',  -- IN_PROGRESS, COMPLETED, FAILED

    -- Results
    entities_synced JSONB,                   -- {"Project": 10, "Task": 50, ...}
    total_records_synced INT DEFAULT 0,
    total_records_failed INT DEFAULT 0,

    error_message TEXT,

    -- Metadata
    triggered_by VARCHAR(50) NOT NULL,
    duration_ms INT,

    -- Timestamps
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sync_history_type ON admin.sync_history(sync_type);
CREATE INDEX IF NOT EXISTS idx_sync_history_status ON admin.sync_history(status);
CREATE INDEX IF NOT EXISTS idx_sync_history_created ON admin.sync_history(created_at DESC);

COMMENT ON TABLE admin.sync_history IS 'Tracks PostgreSQL to Neo4j synchronization operations';
COMMENT ON COLUMN admin.sync_history.sync_type IS 'Sync type: FULL (all data) or INCREMENTAL (changes only)';
COMMENT ON COLUMN admin.sync_history.entities_synced IS 'JSON object with per-entity sync counts';
COMMENT ON COLUMN admin.sync_history.status IS 'Sync status: IN_PROGRESS, COMPLETED, FAILED';
