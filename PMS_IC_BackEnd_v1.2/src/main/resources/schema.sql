-- PMS Insurance Claims Database Schema
-- PostgreSQL with multiple schemas
-- Updated: 2026-02-07

-- ============================================
-- Schema Creation
-- ============================================
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS project;
CREATE SCHEMA IF NOT EXISTS task;
CREATE SCHEMA IF NOT EXISTS chat;
CREATE SCHEMA IF NOT EXISTS report;
CREATE SCHEMA IF NOT EXISTS rfp;
CREATE SCHEMA IF NOT EXISTS education;
CREATE SCHEMA IF NOT EXISTS lineage;
CREATE SCHEMA IF NOT EXISTS risk;

-- ============================================
-- AUTH SCHEMA
-- ============================================

CREATE TABLE IF NOT EXISTS auth.users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'MEMBER',
    department VARCHAR(100),
    active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS auth.permissions (
    id VARCHAR(36) PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    resource VARCHAR(100),
    action VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    UNIQUE(category, name)
);

CREATE TABLE IF NOT EXISTS auth.role_permissions (
    id VARCHAR(36) PRIMARY KEY,
    role VARCHAR(50) NOT NULL,
    permission_id VARCHAR(36) NOT NULL REFERENCES auth.permissions(id),
    granted BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    UNIQUE(role, permission_id)
);

-- ============================================
-- PROJECT SCHEMA
-- ============================================

CREATE TABLE IF NOT EXISTS project.projects (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'PLANNING',
    start_date DATE,
    end_date DATE,
    budget DECIMAL(15, 2),
    ai_weight DECIMAL(5, 2) DEFAULT 0.70,
    si_weight DECIMAL(5, 2) DEFAULT 0.30,
    progress INTEGER DEFAULT 0,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS project.project_members (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL REFERENCES auth.users(id),
    role VARCHAR(50) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    UNIQUE(project_id, user_id)
);

CREATE TABLE IF NOT EXISTS project.project_role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id VARCHAR(36) NOT NULL,
    role VARCHAR(50) NOT NULL,
    permission_id VARCHAR(36) NOT NULL,
    granted BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, role, permission_id)
);

CREATE TABLE IF NOT EXISTS project.default_role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role VARCHAR(50) NOT NULL,
    permission_id VARCHAR(36) NOT NULL,
    granted BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role, permission_id)
);

CREATE TABLE IF NOT EXISTS project.phases (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    parent_id VARCHAR(36) REFERENCES project.phases(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    order_num INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'NOT_STARTED',
    gate_status VARCHAR(50),
    start_date DATE,
    end_date DATE,
    progress INTEGER DEFAULT 0,
    description TEXT,
    track_type VARCHAR(20) DEFAULT 'COMMON',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS project.parts (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    leader_id VARCHAR(36),
    leader_name VARCHAR(100),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    start_date DATE,
    end_date DATE,
    progress INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

-- Part members junction table
CREATE TABLE IF NOT EXISTS project.part_members (
    part_id VARCHAR(36) NOT NULL REFERENCES project.parts(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL REFERENCES auth.users(id),
    PRIMARY KEY (part_id, user_id)
);

CREATE TABLE IF NOT EXISTS project.wbs_groups (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    phase_id VARCHAR(36) REFERENCES project.phases(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    order_num INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    code VARCHAR(50),
    status VARCHAR(50) DEFAULT 'NOT_STARTED',
    linked_epic_id VARCHAR(36),
    progress INTEGER DEFAULT 0,
    weight DECIMAL(5, 2) DEFAULT 1.0,
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE
);

CREATE TABLE IF NOT EXISTS project.wbs_items (
    id VARCHAR(36) PRIMARY KEY,
    group_id VARCHAR(36) REFERENCES project.wbs_groups(id) ON DELETE CASCADE,
    phase_id VARCHAR(36) REFERENCES project.phases(id),
    code VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    order_num INTEGER,
    status VARCHAR(50) DEFAULT 'NOT_STARTED',
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    progress INTEGER DEFAULT 0,
    weight DECIMAL(5, 2) DEFAULT 1.0,
    track_type VARCHAR(20) DEFAULT 'COMMON',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    estimated_hours DECIMAL(10, 2) DEFAULT 0,
    actual_hours DECIMAL(10, 2) DEFAULT 0,
    assignee_id VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS project.wbs_tasks (
    id VARCHAR(36) PRIMARY KEY,
    item_id VARCHAR(36) REFERENCES project.wbs_items(id) ON DELETE CASCADE,
    group_id VARCHAR(36) REFERENCES project.wbs_groups(id),
    phase_id VARCHAR(36) REFERENCES project.phases(id),
    code VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    order_num INTEGER,
    status VARCHAR(50) DEFAULT 'NOT_STARTED',
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    progress INTEGER DEFAULT 0,
    weight DECIMAL(5, 2) DEFAULT 1.0,
    linked_task_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    estimated_hours DECIMAL(10, 2) DEFAULT 0,
    actual_hours DECIMAL(10, 2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS project.wbs_dependencies (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    source_item_id VARCHAR(36) NOT NULL,
    target_item_id VARCHAR(36) NOT NULL,
    dependency_type VARCHAR(20) DEFAULT 'FS',
    lag_days INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS project.epics (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    goal TEXT,
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    status VARCHAR(50) DEFAULT 'BACKLOG',
    owner_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    phase_id VARCHAR(36) REFERENCES project.phases(id) ON DELETE SET NULL,
    color VARCHAR(20),
    progress INTEGER DEFAULT 0,
    business_value INTEGER DEFAULT 0,
    total_story_points INTEGER DEFAULT 0,
    item_count INTEGER DEFAULT 0,
    target_completion_date DATE
);

CREATE TABLE IF NOT EXISTS project.features (
    id VARCHAR(36) PRIMARY KEY,
    epic_id VARCHAR(36) REFERENCES project.epics(id) ON DELETE CASCADE,
    project_id VARCHAR(36) NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    status VARCHAR(50) DEFAULT 'BACKLOG',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    part_id VARCHAR(36),
    wbs_group_id VARCHAR(36),
    order_num INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS project.backlogs (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    name VARCHAR(255) DEFAULT 'Product Backlog',
    description TEXT,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS project.backlog_items (
    id VARCHAR(36) PRIMARY KEY,
    backlog_id VARCHAR(36) NOT NULL REFERENCES project.backlogs(id) ON DELETE CASCADE,
    requirement_id VARCHAR(36),
    origin_type VARCHAR(50) DEFAULT 'MANUAL',
    epic_id VARCHAR(36),
    epic_id_ref VARCHAR(36),
    priority_order INTEGER,
    status VARCHAR(50) DEFAULT 'BACKLOG',
    story_points INTEGER,
    estimated_effort_hours INTEGER,
    acceptance_criteria TEXT,
    sprint_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

-- Requirement to Task link table (for lineage tracking)
CREATE TABLE IF NOT EXISTS project.requirement_task_links (
    requirement_id VARCHAR(36) NOT NULL,
    task_id VARCHAR(36) NOT NULL,
    PRIMARY KEY (requirement_id, task_id)
);

CREATE TABLE IF NOT EXISTS project.deliverables (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    phase_id VARCHAR(36) REFERENCES project.phases(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'DRAFT',
    file_path TEXT,
    file_name VARCHAR(255),
    file_size BIGINT,
    uploaded_by VARCHAR(36),
    approver VARCHAR(36),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    rag_status VARCHAR(50) DEFAULT 'PENDING',
    rag_last_error TEXT,
    rag_updated_at TIMESTAMP,
    rag_version INTEGER DEFAULT 1,
    rag_doc_id VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS project.issues (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    issue_type VARCHAR(50) DEFAULT 'BUG',
    status VARCHAR(50) DEFAULT 'OPEN',
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    assignee VARCHAR(36),
    reporter VARCHAR(36),
    reviewer VARCHAR(36),
    due_date DATE,
    resolved_at TIMESTAMP,
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    resolution VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS project.kpis (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50),
    target DECIMAL(15, 2),
    current DECIMAL(15, 2),
    status VARCHAR(50) DEFAULT 'ON_TRACK',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS project.meetings (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    meeting_type VARCHAR(50) DEFAULT 'REGULAR',
    scheduled_at TIMESTAMP,
    organizer VARCHAR(36),
    attendees TEXT,
    agenda TEXT,
    minutes TEXT,
    actual_start_at TIMESTAMP,
    actual_end_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

-- WBS Snapshot Tables (legacy format)
CREATE TABLE IF NOT EXISTS project.wbs_snapshots (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    snapshot_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS project.wbs_group_snapshots (
    id VARCHAR(36) PRIMARY KEY,
    snapshot_id VARCHAR(36) NOT NULL REFERENCES project.wbs_snapshots(id) ON DELETE CASCADE,
    original_id VARCHAR(36),
    name VARCHAR(255),
    order_num INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project.wbs_item_snapshots (
    id VARCHAR(36) PRIMARY KEY,
    snapshot_id VARCHAR(36) NOT NULL REFERENCES project.wbs_snapshots(id) ON DELETE CASCADE,
    group_snapshot_id VARCHAR(36) REFERENCES project.wbs_group_snapshots(id),
    original_id VARCHAR(36),
    name VARCHAR(255),
    status VARCHAR(50),
    progress INTEGER,
    planned_start_date DATE,
    planned_end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project.wbs_task_snapshots (
    id VARCHAR(36) PRIMARY KEY,
    snapshot_id VARCHAR(36) NOT NULL REFERENCES project.wbs_snapshots(id) ON DELETE CASCADE,
    item_snapshot_id VARCHAR(36) REFERENCES project.wbs_item_snapshots(id),
    original_id VARCHAR(36),
    name VARCHAR(255),
    status VARCHAR(50),
    progress INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project.wbs_dependency_snapshots (
    id VARCHAR(36) PRIMARY KEY,
    snapshot_id VARCHAR(36) NOT NULL REFERENCES project.wbs_snapshots(id) ON DELETE CASCADE,
    source_item_id VARCHAR(36),
    target_item_id VARCHAR(36),
    dependency_type VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

-- WBS Snapshot Tables (V20260208 format)
CREATE TABLE IF NOT EXISTS project.wbs_groups_snapshot (
    id VARCHAR(36) PRIMARY KEY,
    snapshot_id VARCHAR(36) NOT NULL REFERENCES project.wbs_snapshots(id) ON DELETE CASCADE,
    original_id VARCHAR(36),
    phase_id VARCHAR(36),
    code VARCHAR(50),
    name VARCHAR(255),
    description TEXT,
    status VARCHAR(50),
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
    original_updated_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS project.wbs_items_snapshot (
    id VARCHAR(36) PRIMARY KEY,
    snapshot_id VARCHAR(36) NOT NULL REFERENCES project.wbs_snapshots(id) ON DELETE CASCADE,
    original_id VARCHAR(36),
    original_group_id VARCHAR(36),
    phase_id VARCHAR(36),
    code VARCHAR(50),
    name VARCHAR(255),
    description TEXT,
    status VARCHAR(50),
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
    original_updated_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS project.wbs_tasks_snapshot (
    id VARCHAR(36) PRIMARY KEY,
    snapshot_id VARCHAR(36) NOT NULL REFERENCES project.wbs_snapshots(id) ON DELETE CASCADE,
    original_id VARCHAR(36),
    original_item_id VARCHAR(36),
    original_group_id VARCHAR(36),
    phase_id VARCHAR(36),
    code VARCHAR(50),
    name VARCHAR(255),
    description TEXT,
    status VARCHAR(50),
    progress INTEGER,
    weight INTEGER,
    order_num INTEGER,
    estimated_hours INTEGER,
    actual_hours INTEGER,
    assignee_id VARCHAR(36),
    linked_task_id VARCHAR(36),
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    original_created_at TIMESTAMP,
    original_created_by VARCHAR(36),
    original_updated_at TIMESTAMP,
    original_updated_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS project.wbs_dependencies_snapshot (
    id VARCHAR(36) PRIMARY KEY,
    snapshot_id VARCHAR(36) NOT NULL REFERENCES project.wbs_snapshots(id) ON DELETE CASCADE,
    original_id VARCHAR(36),
    predecessor_type VARCHAR(50),
    predecessor_id VARCHAR(36),
    successor_type VARCHAR(50),
    successor_id VARCHAR(36),
    dependency_type VARCHAR(20),
    lag_days INTEGER,
    project_id VARCHAR(36),
    original_created_at TIMESTAMP,
    original_created_by VARCHAR(36),
    original_updated_at TIMESTAMP,
    original_updated_by VARCHAR(36)
);

-- Project Outbox Events
CREATE TABLE IF NOT EXISTS project.outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id VARCHAR(36) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP,
    retry_count INTEGER DEFAULT 0,
    last_error TEXT,
    idempotency_key VARCHAR(255) UNIQUE,
    project_id VARCHAR(36)
);

-- Part Relationships
CREATE TABLE IF NOT EXISTS project.part_relationships (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    source_part_id VARCHAR(36) NOT NULL,
    target_part_id VARCHAR(36) NOT NULL,
    relationship_type VARCHAR(50) NOT NULL,
    description TEXT,
    dependency_description TEXT,
    strength VARCHAR(20) DEFAULT 'MEDIUM',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    UNIQUE(source_part_id, target_part_id, relationship_type)
);

-- Part Change History
CREATE TABLE IF NOT EXISTS project.part_change_history (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(36) NOT NULL,
    entity_name VARCHAR(255),
    previous_part_id VARCHAR(36),
    previous_part_name VARCHAR(255),
    new_part_id VARCHAR(36),
    new_part_name VARCHAR(255),
    project_id VARCHAR(36),
    change_reason TEXT,
    changed_by_user_id VARCHAR(36),
    changed_by_user_name VARCHAR(255),
    effective_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    effective_to TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Deliverable Outbox
CREATE TABLE IF NOT EXISTS project.deliverable_outbox (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    aggregate_type VARCHAR(100) DEFAULT 'DELIVERABLE',
    aggregate_id VARCHAR(36) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    stream_id VARCHAR(255),
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 5,
    next_retry_at TIMESTAMP,
    last_error TEXT,
    last_error_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    relayed_at TIMESTAMP,
    project_id VARCHAR(36),
    partition_date DATE DEFAULT CURRENT_DATE
);

-- Deliverable Outbox Dead Letter
CREATE TABLE IF NOT EXISTS project.deliverable_outbox_dead_letter (
    id VARCHAR(36) PRIMARY KEY,
    aggregate_type VARCHAR(100),
    aggregate_id VARCHAR(36),
    event_type VARCHAR(100),
    payload JSONB,
    stream_id VARCHAR(255),
    error_history JSONB,
    delivery_count INTEGER,
    created_at TIMESTAMP,
    moved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    project_id VARCHAR(36),
    resolution_status VARCHAR(50) DEFAULT 'UNRESOLVED',
    resolution_notes TEXT,
    resolved_by VARCHAR(36),
    resolved_at TIMESTAMP
);

-- Template Sets
CREATE TABLE IF NOT EXISTS project.template_sets (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    version VARCHAR(20) DEFAULT '1.0',
    is_default BOOLEAN DEFAULT FALSE,
    tags TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

-- Phase Templates
CREATE TABLE IF NOT EXISTS project.phase_templates (
    id VARCHAR(36) PRIMARY KEY,
    template_set_id VARCHAR(36) NOT NULL REFERENCES project.template_sets(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    relative_order INTEGER DEFAULT 0,
    default_duration_days INTEGER,
    color VARCHAR(20),
    track_type VARCHAR(20) DEFAULT 'COMMON',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(template_set_id, relative_order)
);

-- WBS Group Templates
CREATE TABLE IF NOT EXISTS project.wbs_group_templates (
    id VARCHAR(36) PRIMARY KEY,
    phase_template_id VARCHAR(36) NOT NULL REFERENCES project.phase_templates(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    relative_order INTEGER DEFAULT 0,
    default_weight INTEGER DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(phase_template_id, relative_order)
);

-- WBS Item Templates
CREATE TABLE IF NOT EXISTS project.wbs_item_templates (
    id VARCHAR(36) PRIMARY KEY,
    group_template_id VARCHAR(36) NOT NULL REFERENCES project.wbs_group_templates(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    relative_order INTEGER DEFAULT 0,
    default_weight INTEGER DEFAULT 100,
    estimated_hours INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_template_id, relative_order)
);

-- WBS Task Templates
CREATE TABLE IF NOT EXISTS project.wbs_task_templates (
    id VARCHAR(36) PRIMARY KEY,
    item_template_id VARCHAR(36) NOT NULL REFERENCES project.wbs_item_templates(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    relative_order INTEGER DEFAULT 0,
    default_weight INTEGER DEFAULT 100,
    estimated_hours INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(item_template_id, relative_order)
);

-- Template Applications
CREATE TABLE IF NOT EXISTS project.template_applications (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    template_set_id VARCHAR(36) NOT NULL REFERENCES project.template_sets(id),
    project_id VARCHAR(36) NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    applied_by VARCHAR(36),
    phases_created INTEGER DEFAULT 0,
    wbs_groups_created INTEGER DEFAULT 0,
    wbs_items_created INTEGER DEFAULT 0,
    notes TEXT
);

-- WBS Item to Story Links
CREATE TABLE IF NOT EXISTS project.wbs_item_story_links (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    wbs_item_id VARCHAR(36) NOT NULL,
    story_id VARCHAR(36) NOT NULL,
    linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    linked_by VARCHAR(36),
    UNIQUE(wbs_item_id, story_id)
);

-- Requirement Sprint Mapping
CREATE TABLE IF NOT EXISTS project.requirement_sprint_mapping (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    requirement_id VARCHAR(36) NOT NULL,
    sprint_id VARCHAR(36) NOT NULL,
    mapped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    mapped_by VARCHAR(36),
    UNIQUE(requirement_id, sprint_id)
);

-- Requirement Story Mapping
CREATE TABLE IF NOT EXISTS project.requirement_story_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requirement_id VARCHAR(36) NOT NULL,
    story_id VARCHAR(36) NOT NULL,
    mapped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    mapped_by VARCHAR(36),
    notes TEXT,
    UNIQUE(requirement_id, story_id)
);

-- Sprint Requirement Coverage
CREATE TABLE IF NOT EXISTS project.sprint_requirement_coverage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sprint_id VARCHAR(36) NOT NULL,
    requirement_id VARCHAR(36) NOT NULL,
    coverage_type VARCHAR(50) DEFAULT 'PARTIAL',
    covered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sprint_id, requirement_id)
);

-- Project-scoped Requirements
CREATE TABLE IF NOT EXISTS project.requirements (
    id VARCHAR(36) PRIMARY KEY,
    rfp_id VARCHAR(36),
    project_id VARCHAR(36) NOT NULL,
    requirement_code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'FUNCTIONAL',
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    status VARCHAR(50) DEFAULT 'IDENTIFIED',
    progress_percentage INTEGER DEFAULT 0,
    source_text TEXT,
    page_number INTEGER,
    assignee_id VARCHAR(36),
    due_date DATE,
    acceptance_criteria TEXT,
    estimated_effort INTEGER,
    actual_effort INTEGER,
    tenant_id VARCHAR(36) NOT NULL,
    neo4j_node_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    story_points INTEGER,
    estimated_effort_hours INTEGER,
    actual_effort_hours INTEGER,
    remaining_effort_hours INTEGER,
    last_progress_update TIMESTAMP,
    progress_calc_method VARCHAR(50) DEFAULT 'STORY_POINT'
);

-- Project-scoped RFPs
CREATE TABLE IF NOT EXISTS project.rfps (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) REFERENCES project.projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    description TEXT,
    status VARCHAR(50) DEFAULT 'DRAFT',
    processing_status VARCHAR(50) DEFAULT 'PENDING',
    submitted_at TIMESTAMP,
    deadline DATE,
    tenant_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

-- ============================================
-- TASK SCHEMA
-- ============================================

CREATE TABLE IF NOT EXISTS task.sprints (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    goal TEXT,
    start_date DATE,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'PLANNED',
    conwip_limit INTEGER,
    enable_wip_validation BOOLEAN DEFAULT TRUE,
    neo4j_node_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS task.user_stories (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    sprint_id VARCHAR(36) REFERENCES task.sprints(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    acceptance_criteria TEXT,
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    story_points INTEGER,
    status VARCHAR(50) DEFAULT 'IDEA',
    assignee_id VARCHAR(36),
    epic VARCHAR(100),
    priority_order INTEGER,
    feature_id VARCHAR(36),
    wbs_item_id VARCHAR(36),
    part_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    neo4j_node_id VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS task.tasks (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    sprint_id VARCHAR(36) REFERENCES task.sprints(id),
    user_story_id VARCHAR(36) REFERENCES task.user_stories(id),
    kanban_column_id VARCHAR(36),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'TODO',
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    assignee_id VARCHAR(36),
    estimated_hours DECIMAL(5, 2),
    actual_hours DECIMAL(5, 2),
    due_date DATE,
    order_num INTEGER,
    neo4j_node_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    part_id VARCHAR(50),
    phase_id VARCHAR(36),
    track_type VARCHAR(20) DEFAULT 'COMMON',
    tags TEXT,
    column_id VARCHAR(36),
    requirement_id VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS task.kanban_columns (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    order_num INTEGER NOT NULL,
    wip_limit INTEGER,
    color VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

-- User Story to Requirement link table (for lineage tracking)
CREATE TABLE IF NOT EXISTS task.user_story_requirement_links (
    user_story_id VARCHAR(36) NOT NULL REFERENCES task.user_stories(id) ON DELETE CASCADE,
    requirement_id VARCHAR(36) NOT NULL,
    PRIMARY KEY (user_story_id, requirement_id)
);

CREATE TABLE IF NOT EXISTS task.weekly_reports (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36) NOT NULL,
    sprint_id VARCHAR(36) REFERENCES task.sprints(id),
    week_number INTEGER NOT NULL,
    year INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    generated_by VARCHAR(36),
    generated_at TIMESTAMP,
    total_tasks INTEGER DEFAULT 0,
    completed_tasks INTEGER DEFAULT 0,
    in_progress_tasks INTEGER DEFAULT 0,
    pending_tasks INTEGER DEFAULT 0,
    blocked_tasks INTEGER DEFAULT 0,
    velocity DECIMAL(5, 2),
    planned_story_points INTEGER,
    completed_story_points INTEGER,
    completion_rate DECIMAL(5, 2),
    summary TEXT,
    highlights TEXT,
    blockers TEXT,
    next_week_plans TEXT,
    status VARCHAR(50) DEFAULT 'DRAFT',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36),
    part_id VARCHAR(36),
    scope_type VARCHAR(50) DEFAULT 'PROJECT'
);

CREATE TABLE IF NOT EXISTS task.weekly_report_trends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id VARCHAR(36) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10, 2),
    week_end_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, metric_name, week_end_date)
);

-- ============================================
-- CHAT SCHEMA
-- ============================================

CREATE TABLE IF NOT EXISTS chat.chat_sessions (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    title VARCHAR(200),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS chat.chat_messages (
    id VARCHAR(50) PRIMARY KEY,
    session_id VARCHAR(50) NOT NULL REFERENCES chat.chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    trace_id VARCHAR(100),
    engine VARCHAR(50),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);

-- ============================================
-- REPORT SCHEMA
-- ============================================

CREATE TABLE IF NOT EXISTS report.report_templates (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_content TEXT,
    scope VARCHAR(50) DEFAULT 'PROJECT',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS report.reports (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36),
    template_id VARCHAR(36) REFERENCES report.report_templates(id),
    title VARCHAR(255) NOT NULL,
    content TEXT,
    report_type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'DRAFT',
    generated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS report.report_data_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id VARCHAR(36) NOT NULL,
    snapshot_date DATE NOT NULL,
    snapshot_type VARCHAR(50) NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, snapshot_date, snapshot_type)
);

CREATE TABLE IF NOT EXISTS report.report_metrics_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id VARCHAR(36) NOT NULL,
    metric_date DATE NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    fiscal_year INTEGER,
    fiscal_quarter INTEGER,
    fiscal_month INTEGER,
    fiscal_week INTEGER,
    total_tasks INTEGER DEFAULT 0,
    completed_tasks INTEGER DEFAULT 0,
    in_progress_tasks INTEGER DEFAULT 0,
    blocked_tasks INTEGER DEFAULT 0,
    delayed_tasks INTEGER DEFAULT 0,
    completion_rate DECIMAL(5, 2),
    velocity DECIMAL(10, 2),
    story_points_completed INTEGER DEFAULT 0,
    story_points_planned INTEGER DEFAULT 0,
    bug_count INTEGER DEFAULT 0,
    bug_resolved INTEGER DEFAULT 0,
    test_coverage DECIMAL(5, 2),
    scope_type VARCHAR(50),
    scope_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, metric_date, report_type, scope_type, scope_id)
);

CREATE TABLE IF NOT EXISTS report.role_report_defaults (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role VARCHAR(50) NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    default_scope VARCHAR(50),
    default_sections TEXT[] NOT NULL,
    can_change_scope BOOLEAN DEFAULT FALSE,
    can_select_sections BOOLEAN DEFAULT TRUE,
    can_extend_period BOOLEAN DEFAULT FALSE,
    max_period_days INTEGER DEFAULT 7,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role, report_type)
);

CREATE TABLE IF NOT EXISTS report.text_to_sql_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(36) NOT NULL,
    project_id VARCHAR(36),
    user_role VARCHAR(50),
    natural_language_query TEXT NOT NULL,
    generated_sql TEXT,
    sql_explanation TEXT,
    execution_status VARCHAR(50),
    result_count INTEGER,
    error_message TEXT,
    was_sanitized BOOLEAN DEFAULT FALSE,
    sanitization_notes TEXT,
    blocked_patterns TEXT[],
    generation_ms INTEGER,
    execution_ms INTEGER,
    llm_model VARCHAR(100),
    llm_confidence DECIMAL(5, 3),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- RFP SCHEMA
-- ============================================

CREATE TABLE IF NOT EXISTS rfp.rfps (
    id VARCHAR(36) PRIMARY KEY,
    project_id VARCHAR(36),
    title VARCHAR(255) NOT NULL,
    content TEXT,
    description TEXT,
    status VARCHAR(50) DEFAULT 'DRAFT',
    processing_status VARCHAR(50) DEFAULT 'PENDING',
    submitted_at TIMESTAMP,
    deadline DATE,
    tenant_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS rfp.requirements (
    id VARCHAR(36) PRIMARY KEY,
    rfp_id VARCHAR(36) NOT NULL REFERENCES rfp.rfps(id) ON DELETE CASCADE,
    project_id VARCHAR(36),
    requirement_code VARCHAR(50),
    code VARCHAR(50),
    category VARCHAR(100),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    status VARCHAR(50) DEFAULT 'DRAFT',
    processing_status VARCHAR(50) DEFAULT 'PENDING',
    progress INTEGER DEFAULT 0,
    order_num INTEGER,
    tenant_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

-- ============================================
-- EDUCATION SCHEMA
-- ============================================

CREATE TABLE IF NOT EXISTS education.educations (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    level VARCHAR(50),
    duration_hours INTEGER,
    content TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS education.education_roadmaps (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_role VARCHAR(50),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS education.education_sessions (
    id VARCHAR(36) PRIMARY KEY,
    roadmap_id VARCHAR(36) REFERENCES education.education_roadmaps(id) ON DELETE CASCADE,
    education_id VARCHAR(36) REFERENCES education.educations(id),
    order_num INTEGER,
    status VARCHAR(50) DEFAULT 'NOT_STARTED',
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS education.education_histories (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    education_id VARCHAR(36) REFERENCES education.educations(id),
    session_id VARCHAR(36) REFERENCES education.education_sessions(id),
    progress INTEGER DEFAULT 0,
    score DECIMAL(5, 2),
    completed BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

-- ============================================
-- LINEAGE SCHEMA
-- ============================================

CREATE TABLE IF NOT EXISTS lineage.outbox_events (
    id UUID PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id VARCHAR(36) NOT NULL,
    project_id VARCHAR(36),
    payload TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    retry_count INTEGER DEFAULT 0,
    last_error TEXT,
    idempotency_key VARCHAR(255) UNIQUE,
    published_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

-- ============================================
-- INDEXES
-- ============================================

-- Auth indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON auth.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON auth.users(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON auth.role_permissions(role);

-- Project indexes
CREATE INDEX IF NOT EXISTS idx_projects_status ON project.projects(status);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON project.project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project.project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_pm_project_active ON project.project_members(project_id, active);
CREATE INDEX IF NOT EXISTS idx_pm_user_active ON project.project_members(user_id, active);
CREATE INDEX IF NOT EXISTS idx_project_members_role ON project.project_members(role);

-- Phases
CREATE INDEX IF NOT EXISTS idx_phases_project ON project.phases(project_id);
CREATE INDEX IF NOT EXISTS idx_phases_parent ON project.phases(parent_id);
CREATE INDEX IF NOT EXISTS idx_phases_parent_id ON project.phases(parent_id);

-- Parts
CREATE INDEX IF NOT EXISTS idx_parts_project_id ON project.parts(project_id);
CREATE INDEX IF NOT EXISTS idx_parts_leader_id ON project.parts(leader_id);
CREATE INDEX IF NOT EXISTS idx_parts_status ON project.parts(status);
CREATE INDEX IF NOT EXISTS idx_part_members_user_id ON project.part_members(user_id);

-- WBS Groups
CREATE INDEX IF NOT EXISTS idx_wbs_groups_phase_id ON project.wbs_groups(phase_id);
CREATE INDEX IF NOT EXISTS idx_wbs_groups_code ON project.wbs_groups(code);
CREATE INDEX IF NOT EXISTS idx_wbs_groups_status ON project.wbs_groups(status);
CREATE INDEX IF NOT EXISTS idx_wbs_groups_linked_epic_id ON project.wbs_groups(linked_epic_id);
CREATE INDEX IF NOT EXISTS idx_wbs_groups_order ON project.wbs_groups(order_num);

-- WBS Items
CREATE INDEX IF NOT EXISTS idx_wbs_items_group ON project.wbs_items(group_id);
CREATE INDEX IF NOT EXISTS idx_wbs_items_group_id ON project.wbs_items(group_id);
CREATE INDEX IF NOT EXISTS idx_wbs_items_phase_id ON project.wbs_items(phase_id);
CREATE INDEX IF NOT EXISTS idx_wbs_items_status ON project.wbs_items(status);
CREATE INDEX IF NOT EXISTS idx_wbs_items_order ON project.wbs_items(order_num);
CREATE INDEX IF NOT EXISTS idx_wbs_items_assignee_id ON project.wbs_items(assignee_id);

-- WBS Tasks
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_item ON project.wbs_tasks(item_id);
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_item_id ON project.wbs_tasks(item_id);
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_group_id ON project.wbs_tasks(group_id);
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_phase_id ON project.wbs_tasks(phase_id);
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_status ON project.wbs_tasks(status);
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_linked_task_id ON project.wbs_tasks(linked_task_id);
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_planned_start ON project.wbs_tasks(planned_start_date);
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_planned_end ON project.wbs_tasks(planned_end_date);
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_actual_start ON project.wbs_tasks(actual_start_date);
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_actual_end ON project.wbs_tasks(actual_end_date);
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_estimated_hours ON project.wbs_tasks(estimated_hours);

-- WBS Dependencies
CREATE INDEX IF NOT EXISTS idx_wbs_dep_project ON project.wbs_dependencies(project_id);

-- Epics
CREATE INDEX IF NOT EXISTS idx_epics_project_id ON project.epics(project_id);
CREATE INDEX IF NOT EXISTS idx_epics_status ON project.epics(status);
CREATE INDEX IF NOT EXISTS idx_epics_phase_id ON project.epics(phase_id);
CREATE INDEX IF NOT EXISTS idx_epics_owner_id ON project.epics(owner_id);

-- Features
CREATE INDEX IF NOT EXISTS idx_features_epic_id ON project.features(epic_id);
CREATE INDEX IF NOT EXISTS idx_features_part_id ON project.features(part_id);
CREATE INDEX IF NOT EXISTS idx_features_wbs_group_id ON project.features(wbs_group_id);
CREATE INDEX IF NOT EXISTS idx_features_status ON project.features(status);
CREATE INDEX IF NOT EXISTS idx_features_priority ON project.features(priority);
CREATE INDEX IF NOT EXISTS idx_features_part_status ON project.features(part_id, status);

-- Backlogs
CREATE INDEX IF NOT EXISTS idx_backlogs_project_id ON project.backlogs(project_id);
CREATE INDEX IF NOT EXISTS idx_backlogs_status ON project.backlogs(status);
CREATE INDEX IF NOT EXISTS idx_backlog_items_backlog_id ON project.backlog_items(backlog_id);
CREATE INDEX IF NOT EXISTS idx_backlog_items_status ON project.backlog_items(status);
CREATE INDEX IF NOT EXISTS idx_backlog_items_requirement_id ON project.backlog_items(requirement_id);
CREATE INDEX IF NOT EXISTS idx_backlog_items_epic_id ON project.backlog_items(epic_id);
CREATE INDEX IF NOT EXISTS idx_backlog_items_epic_id_ref ON project.backlog_items(epic_id_ref);
CREATE INDEX IF NOT EXISTS idx_backlog_items_origin_type ON project.backlog_items(origin_type);
CREATE INDEX IF NOT EXISTS idx_backlog_items_priority_order ON project.backlog_items(priority_order);

-- Requirement Task Links
CREATE INDEX IF NOT EXISTS idx_req_task_links_task_id ON project.requirement_task_links(task_id);

-- Deliverables
CREATE INDEX IF NOT EXISTS idx_deliverables_project ON project.deliverables(project_id);
CREATE INDEX IF NOT EXISTS idx_deliverables_rag_status ON project.deliverables(rag_status);
CREATE INDEX IF NOT EXISTS idx_deliverables_rag_doc_id ON project.deliverables(rag_doc_id) WHERE rag_doc_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deliverables_rag_failed ON project.deliverables(rag_status, rag_updated_at) WHERE rag_status = 'FAILED';

-- Issues
CREATE INDEX IF NOT EXISTS idx_issues_project ON project.issues(project_id);

-- WBS Snapshots (legacy)
CREATE INDEX IF NOT EXISTS idx_wbs_snapshots_project ON project.wbs_snapshots(project_id);
CREATE INDEX IF NOT EXISTS idx_wbs_snapshots_created ON project.wbs_snapshots(created_at DESC);

-- WBS Snapshots (V20260208 format)
CREATE INDEX IF NOT EXISTS idx_wbs_groups_snap_snapshot ON project.wbs_groups_snapshot(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_wbs_groups_snap_original ON project.wbs_groups_snapshot(original_id);
CREATE INDEX IF NOT EXISTS idx_wbs_items_snap_snapshot ON project.wbs_items_snapshot(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_wbs_items_snap_original ON project.wbs_items_snapshot(original_id);
CREATE INDEX IF NOT EXISTS idx_wbs_items_snap_group ON project.wbs_items_snapshot(original_group_id);
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_snap_snapshot ON project.wbs_tasks_snapshot(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_snap_original ON project.wbs_tasks_snapshot(original_id);
CREATE INDEX IF NOT EXISTS idx_wbs_tasks_snap_item ON project.wbs_tasks_snapshot(original_item_id);
CREATE INDEX IF NOT EXISTS idx_wbs_deps_snap_snapshot ON project.wbs_dependencies_snapshot(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_wbs_deps_snap_original ON project.wbs_dependencies_snapshot(original_id);

-- Project Outbox
CREATE INDEX IF NOT EXISTS idx_outbox_aggregate ON project.outbox_events(aggregate_type, aggregate_id);
CREATE INDEX IF NOT EXISTS idx_outbox_event_type ON project.outbox_events(event_type);
CREATE INDEX IF NOT EXISTS idx_outbox_status_created ON project.outbox_events(status, created_at) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_outbox_events_project_created ON project.outbox_events(project_id, created_at DESC);

-- Project Role Permissions
CREATE INDEX IF NOT EXISTS idx_prp_project_role ON project.project_role_permissions(project_id, role);

-- Part Relationships
CREATE INDEX IF NOT EXISTS idx_part_rel_source ON project.part_relationships(source_part_id);
CREATE INDEX IF NOT EXISTS idx_part_rel_target ON project.part_relationships(target_part_id);
CREATE INDEX IF NOT EXISTS idx_part_rel_type ON project.part_relationships(relationship_type);
CREATE INDEX IF NOT EXISTS idx_part_rel_active ON project.part_relationships(active);

-- Part Change History
CREATE INDEX IF NOT EXISTS idx_part_history_entity ON project.part_change_history(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_part_history_project ON project.part_change_history(project_id);
CREATE INDEX IF NOT EXISTS idx_part_history_prev_part ON project.part_change_history(previous_part_id);
CREATE INDEX IF NOT EXISTS idx_part_history_new_part ON project.part_change_history(new_part_id);
CREATE INDEX IF NOT EXISTS idx_part_history_effective ON project.part_change_history(effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_part_history_created ON project.part_change_history(created_at);

-- Deliverable Outbox
CREATE INDEX IF NOT EXISTS idx_deliverable_outbox_pending ON project.deliverable_outbox(status, next_retry_at, created_at) WHERE status IN ('PENDING', 'PROCESSING');
CREATE INDEX IF NOT EXISTS idx_deliverable_outbox_aggregate ON project.deliverable_outbox(aggregate_type, aggregate_id);
CREATE INDEX IF NOT EXISTS idx_deliverable_outbox_event_type ON project.deliverable_outbox(event_type);
CREATE INDEX IF NOT EXISTS idx_deliverable_outbox_project ON project.deliverable_outbox(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deliverable_outbox_partition ON project.deliverable_outbox(partition_date);
CREATE INDEX IF NOT EXISTS idx_deliverable_outbox_failed ON project.deliverable_outbox(status, last_error_at) WHERE status = 'FAILED';

-- Deliverable Outbox Dead Letter
CREATE INDEX IF NOT EXISTS idx_dl_aggregate ON project.deliverable_outbox_dead_letter(aggregate_type, aggregate_id);
CREATE INDEX IF NOT EXISTS idx_dl_event_type ON project.deliverable_outbox_dead_letter(event_type);
CREATE INDEX IF NOT EXISTS idx_dl_project ON project.deliverable_outbox_dead_letter(project_id, moved_at DESC);
CREATE INDEX IF NOT EXISTS idx_dl_moved_at ON project.deliverable_outbox_dead_letter(moved_at);
CREATE INDEX IF NOT EXISTS idx_dl_unresolved ON project.deliverable_outbox_dead_letter(resolution_status, moved_at) WHERE resolution_status = 'UNRESOLVED';

-- Template Sets
CREATE INDEX IF NOT EXISTS idx_template_sets_category ON project.template_sets(category);
CREATE INDEX IF NOT EXISTS idx_template_sets_status ON project.template_sets(status);
CREATE INDEX IF NOT EXISTS idx_template_sets_is_default ON project.template_sets(is_default);

-- Phase Templates
CREATE INDEX IF NOT EXISTS idx_phase_templates_template_set_id ON project.phase_templates(template_set_id);
CREATE INDEX IF NOT EXISTS idx_phase_templates_order ON project.phase_templates(relative_order);

-- WBS Group/Item/Task Templates
CREATE INDEX IF NOT EXISTS idx_wbs_group_templates_phase_template_id ON project.wbs_group_templates(phase_template_id);
CREATE INDEX IF NOT EXISTS idx_wbs_group_templates_order ON project.wbs_group_templates(relative_order);
CREATE INDEX IF NOT EXISTS idx_wbs_item_templates_group_template_id ON project.wbs_item_templates(group_template_id);
CREATE INDEX IF NOT EXISTS idx_wbs_item_templates_order ON project.wbs_item_templates(relative_order);
CREATE INDEX IF NOT EXISTS idx_wbs_task_templates_item_template_id ON project.wbs_task_templates(item_template_id);
CREATE INDEX IF NOT EXISTS idx_wbs_task_templates_order ON project.wbs_task_templates(relative_order);

-- Template Applications
CREATE INDEX IF NOT EXISTS idx_template_applications_project_id ON project.template_applications(project_id);
CREATE INDEX IF NOT EXISTS idx_template_applications_template_set_id ON project.template_applications(template_set_id);
CREATE INDEX IF NOT EXISTS idx_template_applications_applied_at ON project.template_applications(applied_at);

-- WBS Item Story Links
CREATE INDEX IF NOT EXISTS idx_wis_links_wbs_item_id ON project.wbs_item_story_links(wbs_item_id);
CREATE INDEX IF NOT EXISTS idx_wis_links_story_id ON project.wbs_item_story_links(story_id);

-- Requirement Sprint Mapping
CREATE INDEX IF NOT EXISTS idx_req_sprint_mapping_sprint ON project.requirement_sprint_mapping(sprint_id);

-- Requirement Story Mapping
CREATE INDEX IF NOT EXISTS idx_rsm_requirement_id ON project.requirement_story_mapping(requirement_id);
CREATE INDEX IF NOT EXISTS idx_rsm_story_id ON project.requirement_story_mapping(story_id);

-- Sprint Requirement Coverage (no additional indexes beyond PK and UNIQUE)

-- Requirements (project schema)
CREATE INDEX IF NOT EXISTS idx_requirements_project_id ON project.requirements(project_id);
CREATE INDEX IF NOT EXISTS idx_requirements_rfp_id ON project.requirements(rfp_id);
CREATE INDEX IF NOT EXISTS idx_requirements_status ON project.requirements(status);
CREATE INDEX IF NOT EXISTS idx_requirements_code ON project.requirements(requirement_code);
CREATE INDEX IF NOT EXISTS idx_requirements_category ON project.requirements(category);
CREATE INDEX IF NOT EXISTS idx_requirements_assignee_id ON project.requirements(assignee_id);
CREATE INDEX IF NOT EXISTS idx_requirements_tenant_id ON project.requirements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_requirements_effort ON project.requirements(estimated_effort_hours);
CREATE INDEX IF NOT EXISTS idx_requirements_progress_percentage ON project.requirements(progress_percentage);

-- RFPs (project schema)
CREATE INDEX IF NOT EXISTS idx_rfps_project_id ON project.rfps(project_id);
CREATE INDEX IF NOT EXISTS idx_rfps_status ON project.rfps(status);
CREATE INDEX IF NOT EXISTS idx_rfps_tenant_id ON project.rfps(tenant_id);

-- Task indexes
CREATE INDEX IF NOT EXISTS idx_sprints_project ON task.sprints(project_id);
CREATE INDEX IF NOT EXISTS idx_user_stories_project ON task.user_stories(project_id);
CREATE INDEX IF NOT EXISTS idx_user_stories_sprint ON task.user_stories(sprint_id);
CREATE INDEX IF NOT EXISTS idx_user_stories_feature_id ON task.user_stories(feature_id);
CREATE INDEX IF NOT EXISTS idx_user_stories_part_id ON task.user_stories(part_id);
CREATE INDEX IF NOT EXISTS idx_user_stories_wbs_item_id ON task.user_stories(wbs_item_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON task.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_sprint ON task.tasks(sprint_id);
CREATE INDEX IF NOT EXISTS idx_tasks_column_id ON task.tasks(column_id);
CREATE INDEX IF NOT EXISTS idx_tasks_part_id ON task.tasks(part_id);
CREATE INDEX IF NOT EXISTS idx_tasks_phase_id ON task.tasks(phase_id);
CREATE INDEX IF NOT EXISTS idx_tasks_track_type ON task.tasks(track_type);
CREATE INDEX IF NOT EXISTS idx_tasks_sprint_id ON task.tasks(sprint_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_story_id ON task.tasks(user_story_id);

-- Weekly Reports
CREATE INDEX IF NOT EXISTS idx_weekly_reports_project_id ON task.weekly_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_sprint_id ON task.weekly_reports(sprint_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_part_id ON task.weekly_reports(part_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_part_week ON task.weekly_reports(part_id, year, week_number);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_project_part ON task.weekly_reports(project_id, part_id);

-- Weekly Report Trends
CREATE INDEX IF NOT EXISTS idx_weekly_report_trends_project_id ON task.weekly_report_trends(project_id);
CREATE INDEX IF NOT EXISTS idx_weekly_report_trends_metric ON task.weekly_report_trends(metric_name, week_end_date);

-- Chat indexes
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_trace ON chat.chat_messages(trace_id);

-- Report indexes
CREATE INDEX IF NOT EXISTS idx_reports_project ON report.reports(project_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON report.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_creator ON report.reports(created_by);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON report.reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_templates_scope ON report.report_templates(scope);
CREATE INDEX IF NOT EXISTS idx_templates_creator ON report.report_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_snapshots_project_date ON report.report_data_snapshots(project_id, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_snapshots_type ON report.report_data_snapshots(snapshot_type);
CREATE INDEX IF NOT EXISTS idx_metrics_project_date ON report.report_metrics_history(project_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_metrics_fiscal ON report.report_metrics_history(fiscal_year, fiscal_quarter, fiscal_month);
CREATE INDEX IF NOT EXISTS idx_metrics_scope ON report.report_metrics_history(scope_type, scope_id);
CREATE INDEX IF NOT EXISTS idx_sql_logs_user ON report.text_to_sql_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sql_logs_status ON report.text_to_sql_logs(execution_status);
CREATE INDEX IF NOT EXISTS idx_sql_logs_date ON report.text_to_sql_logs(created_at DESC);

-- Lineage indexes
CREATE INDEX IF NOT EXISTS idx_outbox_events_status ON lineage.outbox_events(status);
CREATE INDEX IF NOT EXISTS idx_outbox_events_aggregate ON lineage.outbox_events(aggregate_type, aggregate_id);
