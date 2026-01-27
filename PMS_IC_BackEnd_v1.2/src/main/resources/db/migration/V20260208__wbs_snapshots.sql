-- WBS Snapshot tables for backup/restore before template application
-- Version: 20260208
-- Description: Create WBS snapshot system for backup and restore functionality

-- ============================================
-- 1. WBS Snapshot Metadata Table
-- ============================================

CREATE TABLE IF NOT EXISTS project.wbs_snapshots (
    id VARCHAR(36) PRIMARY KEY,
    phase_id VARCHAR(50) NOT NULL,
    project_id VARCHAR(50) NOT NULL,
    snapshot_name VARCHAR(255) NOT NULL,
    description TEXT,
    snapshot_type VARCHAR(20) NOT NULL DEFAULT 'PRE_TEMPLATE',  -- PRE_TEMPLATE, MANUAL

    -- Statistics
    group_count INTEGER DEFAULT 0,
    item_count INTEGER DEFAULT 0,
    task_count INTEGER DEFAULT 0,
    dependency_count INTEGER DEFAULT 0,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE, RESTORED, DELETED

    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(36),
    restored_at TIMESTAMP,
    restored_by VARCHAR(36),

    CONSTRAINT fk_wbs_snapshot_phase FOREIGN KEY (phase_id)
        REFERENCES project.phases(id) ON DELETE CASCADE,
    CONSTRAINT fk_wbs_snapshot_project FOREIGN KEY (project_id)
        REFERENCES project.projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_wbs_snapshots_phase ON project.wbs_snapshots(phase_id);
CREATE INDEX IF NOT EXISTS idx_wbs_snapshots_project ON project.wbs_snapshots(project_id);
CREATE INDEX IF NOT EXISTS idx_wbs_snapshots_status ON project.wbs_snapshots(status);
CREATE INDEX IF NOT EXISTS idx_wbs_snapshots_created ON project.wbs_snapshots(created_at DESC);

COMMENT ON TABLE project.wbs_snapshots IS 'WBS snapshot metadata for backup/restore functionality';
COMMENT ON COLUMN project.wbs_snapshots.snapshot_type IS 'PRE_TEMPLATE=auto backup before template, MANUAL=user triggered backup';
COMMENT ON COLUMN project.wbs_snapshots.status IS 'ACTIVE=can be restored, RESTORED=already used, DELETED=soft deleted';

-- ============================================
-- 2. WBS Groups Snapshot Table
-- ============================================

CREATE TABLE IF NOT EXISTS project.wbs_groups_snapshot (
    id VARCHAR(36) PRIMARY KEY,
    snapshot_id VARCHAR(36) NOT NULL,
    original_id VARCHAR(36) NOT NULL,  -- Original WbsGroup ID for restoration

    -- Cloned fields from wbs_groups
    phase_id VARCHAR(50) NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL,
    progress INTEGER,
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    weight INTEGER,
    order_num INTEGER,
    linked_epic_id VARCHAR(36),
    original_created_at TIMESTAMP,
    original_created_by VARCHAR(36),
    original_updated_at TIMESTAMP,
    original_updated_by VARCHAR(36),

    CONSTRAINT fk_wbs_group_snap_snapshot FOREIGN KEY (snapshot_id)
        REFERENCES project.wbs_snapshots(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_wbs_groups_snap_snapshot ON project.wbs_groups_snapshot(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_wbs_groups_snap_original ON project.wbs_groups_snapshot(original_id);

-- ============================================
-- 3. WBS Items Snapshot Table
-- ============================================

CREATE TABLE IF NOT EXISTS project.wbs_items_snapshot (
    id VARCHAR(36) PRIMARY KEY,
    snapshot_id VARCHAR(36) NOT NULL,
    original_id VARCHAR(36) NOT NULL,
    original_group_id VARCHAR(36) NOT NULL,

    -- Cloned fields from wbs_items
    phase_id VARCHAR(50) NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL,
    progress INTEGER,
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    weight INTEGER,
    order_num INTEGER,
    estimated_hours INTEGER,
    actual_hours INTEGER,
    assignee_id VARCHAR(36),
    original_created_at TIMESTAMP,
    original_created_by VARCHAR(36),
    original_updated_at TIMESTAMP,
    original_updated_by VARCHAR(36),

    CONSTRAINT fk_wbs_item_snap_snapshot FOREIGN KEY (snapshot_id)
        REFERENCES project.wbs_snapshots(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_wbs_items_snap_snapshot ON project.wbs_items_snapshot(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_wbs_items_snap_original ON project.wbs_items_snapshot(original_id);
CREATE INDEX IF NOT EXISTS idx_wbs_items_snap_group ON project.wbs_items_snapshot(original_group_id);

-- ============================================
-- 4. WBS Tasks Snapshot Table
-- ============================================

CREATE TABLE IF NOT EXISTS project.wbs_tasks_snapshot (
    id VARCHAR(36) PRIMARY KEY,
    snapshot_id VARCHAR(36) NOT NULL,
    original_id VARCHAR(36) NOT NULL,
    original_item_id VARCHAR(36) NOT NULL,
    original_group_id VARCHAR(36) NOT NULL,

    -- Cloned fields from wbs_tasks
    phase_id VARCHAR(50) NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL,
    progress INTEGER,
    weight INTEGER,
    order_num INTEGER,
    estimated_hours INTEGER,
    actual_hours INTEGER,
    assignee_id VARCHAR(36),
    linked_task_id VARCHAR(50),
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    original_created_at TIMESTAMP,
    original_created_by VARCHAR(36),
    original_updated_at TIMESTAMP,
    original_updated_by VARCHAR(36),

    CONSTRAINT fk_wbs_task_snap_snapshot FOREIGN KEY (snapshot_id)
        REFERENCES project.wbs_snapshots(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_wbs_tasks_snap_snapshot ON project.wbs_tasks_snapshot(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_snap_original ON project.wbs_tasks_snapshot(original_id);
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_snap_item ON project.wbs_tasks_snapshot(original_item_id);

-- ============================================
-- 5. WBS Dependencies Snapshot Table
-- ============================================

CREATE TABLE IF NOT EXISTS project.wbs_dependencies_snapshot (
    id VARCHAR(36) PRIMARY KEY,
    snapshot_id VARCHAR(36) NOT NULL,
    original_id VARCHAR(36) NOT NULL,

    -- Cloned fields from wbs_dependencies
    predecessor_type VARCHAR(20) NOT NULL,
    predecessor_id VARCHAR(36) NOT NULL,
    successor_type VARCHAR(20) NOT NULL,
    successor_id VARCHAR(36) NOT NULL,
    dependency_type VARCHAR(10) NOT NULL,
    lag_days INTEGER,
    project_id VARCHAR(50) NOT NULL,
    original_created_at TIMESTAMP,
    original_created_by VARCHAR(36),
    original_updated_at TIMESTAMP,
    original_updated_by VARCHAR(36),

    CONSTRAINT fk_wbs_dep_snap_snapshot FOREIGN KEY (snapshot_id)
        REFERENCES project.wbs_snapshots(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_wbs_deps_snap_snapshot ON project.wbs_dependencies_snapshot(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_wbs_deps_snap_original ON project.wbs_dependencies_snapshot(original_id);

-- ============================================
-- Summary
-- ============================================
-- Created tables:
-- 1. project.wbs_snapshots - Snapshot metadata
-- 2. project.wbs_groups_snapshot - Group data snapshots
-- 3. project.wbs_items_snapshot - Item data snapshots
-- 4. project.wbs_tasks_snapshot - Task data snapshots
-- 5. project.wbs_dependencies_snapshot - Dependency snapshots
--
-- All snapshot data tables cascade delete when parent snapshot is deleted
-- ============================================
