-- PMS Insurance Claims Database Schema
-- PostgreSQL with multiple schemas
-- Updated: 2026-02-12

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
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS governance;
CREATE SCHEMA IF NOT EXISTS organization;

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
    health_score_current DECIMAL(5,2),
    health_grade VARCHAR(5),
    budget_burn_rate DECIMAL(5,2),
    portfolio_status VARCHAR(50) DEFAULT 'ACTIVE',
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
    evidence_required BOOLEAN DEFAULT FALSE,
    compliance_status VARCHAR(50),
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
    actual_hours DECIMAL(10, 2) DEFAULT 0,
    assignee_id VARCHAR(36)
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
    target_completion_date DATE,
    order_num INTEGER DEFAULT 0
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
    escalation_level INTEGER DEFAULT 0,
    escalation_chain_id VARCHAR(36),
    sla_due_at TIMESTAMP,
    sla_breached BOOLEAN DEFAULT FALSE,
    resolution_type VARCHAR(50),
    reopen_count INTEGER DEFAULT 0,
    last_reopened_at TIMESTAMP,
    linked_requirement_id VARCHAR(36),
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
    source_requirement_id VARCHAR(36),
    requirement_code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) DEFAULT 'FUNCTIONAL',
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    status VARCHAR(50) DEFAULT 'IDENTIFIED',
    progress INTEGER DEFAULT 0,
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
    progress_calc_method VARCHAR(50) DEFAULT 'STORY_POINT',
    trace_status VARCHAR(50) DEFAULT 'NOT_TRACED',
    trace_coverage DECIMAL(5,2) DEFAULT 0,
    ai_si_type VARCHAR(20) DEFAULT 'COMMON'
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

-- Project Health Scores (Dashboard - Screen 01)
CREATE TABLE IF NOT EXISTS project.project_health_scores (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id VARCHAR(36) NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    score_date DATE NOT NULL DEFAULT CURRENT_DATE,
    overall_score DECIMAL(5,2) NOT NULL,
    schedule_score DECIMAL(5,2),
    budget_score DECIMAL(5,2),
    quality_score DECIMAL(5,2),
    risk_score DECIMAL(5,2),
    resource_score DECIMAL(5,2),
    grade VARCHAR(5),
    trend VARCHAR(20) DEFAULT 'STABLE',
    calculated_by VARCHAR(36),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, score_date)
);

-- Requirement Trace Links (Screen 02 - Trace Chain)
CREATE TABLE IF NOT EXISTS project.requirement_trace_links (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    requirement_id VARCHAR(36) NOT NULL,
    linked_entity_type VARCHAR(50) NOT NULL,
    linked_entity_id VARCHAR(36) NOT NULL,
    link_type VARCHAR(50) DEFAULT 'IMPLEMENTS',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    UNIQUE(requirement_id, linked_entity_type, linked_entity_id)
);

-- Requirement Step Events (Screen 02 - Workflow History)
CREATE TABLE IF NOT EXISTS project.requirement_step_events (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    requirement_id VARCHAR(36) NOT NULL,
    from_step VARCHAR(50),
    to_step VARCHAR(50) NOT NULL,
    changed_by VARCHAR(36),
    change_reason TEXT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Requirement Change Requests (Screen 02 - Change Control)
CREATE TABLE IF NOT EXISTS project.requirement_change_requests (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id VARCHAR(36) NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    requirement_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    change_type VARCHAR(50) NOT NULL DEFAULT 'MODIFICATION',
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    status VARCHAR(50) DEFAULT 'DRAFT',
    impact_analysis TEXT,
    requested_by VARCHAR(36),
    reviewed_by VARCHAR(36),
    approved_by VARCHAR(36),
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    approved_at TIMESTAMP,
    rejected_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

-- Test Suites (Screen 10 - Test Management)
CREATE TABLE IF NOT EXISTS project.test_suites (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id VARCHAR(36) NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    test_type VARCHAR(50) DEFAULT 'FUNCTIONAL',
    phase_id VARCHAR(36) REFERENCES project.phases(id),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    owner_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

-- Test Cases (Screen 10 - Test Management)
CREATE TABLE IF NOT EXISTS project.test_cases (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    suite_id VARCHAR(36) NOT NULL REFERENCES project.test_suites(id) ON DELETE CASCADE,
    project_id VARCHAR(36) NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    preconditions TEXT,
    test_steps TEXT,
    expected_result TEXT,
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    status VARCHAR(50) DEFAULT 'DRAFT',
    test_type VARCHAR(50) DEFAULT 'MANUAL',
    assignee_id VARCHAR(36),
    estimated_minutes INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

-- Test Executions (Screen 10 - Test Runs)
CREATE TABLE IF NOT EXISTS project.test_executions (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    test_case_id VARCHAR(36) NOT NULL REFERENCES project.test_cases(id) ON DELETE CASCADE,
    project_id VARCHAR(36) NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    sprint_id VARCHAR(36),
    executor_id VARCHAR(36),
    result VARCHAR(50) NOT NULL DEFAULT 'NOT_RUN',
    actual_result TEXT,
    defect_id VARCHAR(36),
    environment VARCHAR(100),
    execution_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    duration_minutes INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

-- Test Case Trace Links (Screen 10 - Traceability)
CREATE TABLE IF NOT EXISTS project.test_case_trace_links (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    test_case_id VARCHAR(36) NOT NULL REFERENCES project.test_cases(id) ON DELETE CASCADE,
    linked_entity_type VARCHAR(50) NOT NULL,
    linked_entity_id VARCHAR(36) NOT NULL,
    link_type VARCHAR(50) DEFAULT 'VERIFIES',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    UNIQUE(test_case_id, linked_entity_type, linked_entity_id)
);

-- Issue Comments (Screen 09 - Issue Management)
CREATE TABLE IF NOT EXISTS project.issue_comments (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    issue_id VARCHAR(36) NOT NULL REFERENCES project.issues(id) ON DELETE CASCADE,
    author_id VARCHAR(36) NOT NULL,
    content TEXT NOT NULL,
    comment_type VARCHAR(50) DEFAULT 'COMMENT',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

-- Health Snapshots (Screen 15 - PMO Governance)
CREATE TABLE IF NOT EXISTS project.health_snapshots (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id VARCHAR(36) NOT NULL REFERENCES project.projects(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    overall_health DECIMAL(5,2),
    schedule_health DECIMAL(5,2),
    budget_health DECIMAL(5,2),
    quality_health DECIMAL(5,2),
    risk_health DECIMAL(5,2),
    resource_health DECIMAL(5,2),
    grade VARCHAR(5),
    trend VARCHAR(20) DEFAULT 'STABLE',
    phase_id VARCHAR(36),
    notes TEXT,
    snapshot_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, snapshot_date)
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
    epic_id VARCHAR(36),
    priority_order INTEGER,
    feature_id VARCHAR(36),
    wbs_item_id VARCHAR(36),
    part_id VARCHAR(36),
    backlog_item_id VARCHAR(36),
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

-- Task Time Logs (Screen 08 - My Work)
CREATE TABLE IF NOT EXISTS task.task_time_logs (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    task_id VARCHAR(36) NOT NULL REFERENCES task.tasks(id) ON DELETE CASCADE,
    project_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    logged_hours DECIMAL(5,2) NOT NULL,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

-- Task Comments (Screen 08 - My Work)
CREATE TABLE IF NOT EXISTS task.task_comments (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    task_id VARCHAR(36) NOT NULL REFERENCES task.tasks(id) ON DELETE CASCADE,
    author_id VARCHAR(36) NOT NULL,
    content TEXT NOT NULL,
    comment_type VARCHAR(50) DEFAULT 'COMMENT',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
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
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    report_type VARCHAR(30),
    scope VARCHAR(50) DEFAULT 'SYSTEM',
    target_roles TEXT[],
    target_report_scopes TEXT[],
    structure JSONB,
    styling JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    version INTEGER DEFAULT 1,
    template_content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS report.template_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES report.report_templates(id) ON DELETE CASCADE,
    section_key VARCHAR(100) NOT NULL,
    section_title VARCHAR(255) NOT NULL,
    section_type VARCHAR(50) NOT NULL DEFAULT 'DATA_TABLE',
    description TEXT,
    config JSONB,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_required BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(template_id, section_key)
);

CREATE TABLE IF NOT EXISTS report.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id VARCHAR(50) NOT NULL,
    report_type VARCHAR(30) NOT NULL,
    report_scope VARCHAR(30) NOT NULL,
    title VARCHAR(500),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    scope_phase_id VARCHAR(50),
    scope_team_id VARCHAR(50),
    scope_user_id VARCHAR(50),
    created_by VARCHAR(50),
    creator_role VARCHAR(30) NOT NULL,
    generation_mode VARCHAR(20) NOT NULL,
    template_id UUID,
    status VARCHAR(20) DEFAULT 'DRAFT',
    content JSONB NOT NULL DEFAULT '{}',
    metrics_snapshot JSONB,
    llm_generated_sections TEXT[],
    llm_model VARCHAR(100),
    llm_confidence_score DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(50),
    published_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS report.report_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES report.reports(id) ON DELETE CASCADE,
    user_id VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    parent_comment_id UUID REFERENCES report.report_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS report.report_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES report.reports(id) ON DELETE CASCADE,
    shared_with_user_id VARCHAR(50),
    shared_with_team_id VARCHAR(50),
    shared_with_role VARCHAR(30),
    permission VARCHAR(20) DEFAULT 'VIEW',
    shared_by VARCHAR(50) NOT NULL,
    shared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    CONSTRAINT chk_share_target CHECK (
        (shared_with_user_id IS NOT NULL AND shared_with_team_id IS NULL AND shared_with_role IS NULL) OR
        (shared_with_user_id IS NULL AND shared_with_team_id IS NOT NULL AND shared_with_role IS NULL) OR
        (shared_with_user_id IS NULL AND shared_with_team_id IS NULL AND shared_with_role IS NOT NULL)
    )
);

CREATE TABLE IF NOT EXISTS report.user_template_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50) NOT NULL,
    report_type VARCHAR(30) NOT NULL,
    preferred_template_id UUID REFERENCES report.report_templates(id),
    section_overrides JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, report_type)
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
-- RISK SCHEMA (Screen 12 - Decisions & Risk)
-- ============================================

CREATE TABLE IF NOT EXISTS risk.risks (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'TECHNICAL',
    status VARCHAR(50) DEFAULT 'IDENTIFIED',
    probability INTEGER DEFAULT 3 CHECK (probability BETWEEN 1 AND 5),
    impact INTEGER DEFAULT 3 CHECK (impact BETWEEN 1 AND 5),
    risk_score INTEGER GENERATED ALWAYS AS (probability * impact) STORED,
    severity VARCHAR(20) GENERATED ALWAYS AS (
        CASE
            WHEN probability * impact >= 20 THEN 'CRITICAL'
            WHEN probability * impact >= 12 THEN 'HIGH'
            WHEN probability * impact >= 6 THEN 'MEDIUM'
            ELSE 'LOW'
        END
    ) STORED,
    owner_id VARCHAR(36),
    identified_by VARCHAR(36),
    identified_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    phase_id VARCHAR(36),
    linked_requirement_id VARCHAR(36),
    linked_issue_id VARCHAR(36),
    mitigation_strategy TEXT,
    contingency_plan TEXT,
    trigger_conditions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS risk.risk_responses (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    risk_id VARCHAR(36) NOT NULL REFERENCES risk.risks(id) ON DELETE CASCADE,
    response_type VARCHAR(50) NOT NULL DEFAULT 'MITIGATE',
    description TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'PLANNED',
    owner_id VARCHAR(36),
    due_date DATE,
    cost_estimate DECIMAL(15,2),
    effectiveness VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS risk.decisions (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'TECHNICAL',
    status VARCHAR(50) DEFAULT 'PENDING',
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    decision_maker_id VARCHAR(36),
    decided_option_id VARCHAR(36),
    decided_at TIMESTAMP,
    deadline DATE,
    rationale TEXT,
    impact_analysis TEXT,
    phase_id VARCHAR(36),
    linked_risk_id VARCHAR(36),
    linked_requirement_id VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS risk.decision_options (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    decision_id VARCHAR(36) NOT NULL REFERENCES risk.decisions(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    pros TEXT,
    cons TEXT,
    cost_estimate DECIMAL(15,2),
    risk_level VARCHAR(20) DEFAULT 'MEDIUM',
    recommended BOOLEAN DEFAULT FALSE,
    order_num INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

CREATE TABLE IF NOT EXISTS risk.risk_audit_trail (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(36) NOT NULL,
    action VARCHAR(50) NOT NULL,
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    changed_by VARCHAR(36),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    project_id VARCHAR(36)
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
CREATE INDEX IF NOT EXISTS idx_reports_period ON report.reports(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_reports_type_scope ON report.reports(report_type, report_scope);
CREATE INDEX IF NOT EXISTS idx_report_comments_report ON report.report_comments(report_id);
CREATE INDEX IF NOT EXISTS idx_report_comments_user ON report.report_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_report_shares_report ON report.report_shares(report_id);
CREATE INDEX IF NOT EXISTS idx_report_shares_user ON report.report_shares(shared_with_user_id);
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
CREATE INDEX IF NOT EXISTS idx_outbox_events_project ON lineage.outbox_events(project_id);

-- Project Health Scores indexes
CREATE INDEX IF NOT EXISTS idx_health_scores_project ON project.project_health_scores(project_id);
CREATE INDEX IF NOT EXISTS idx_health_scores_date ON project.project_health_scores(score_date DESC);

-- Requirement Trace Links indexes
CREATE INDEX IF NOT EXISTS idx_req_trace_links_req ON project.requirement_trace_links(requirement_id);
CREATE INDEX IF NOT EXISTS idx_req_trace_links_entity ON project.requirement_trace_links(linked_entity_type, linked_entity_id);

-- Requirement Step Events indexes
CREATE INDEX IF NOT EXISTS idx_req_step_events_req ON project.requirement_step_events(requirement_id);
CREATE INDEX IF NOT EXISTS idx_req_step_events_time ON project.requirement_step_events(changed_at DESC);

-- Requirement Change Requests indexes
CREATE INDEX IF NOT EXISTS idx_req_change_requests_project ON project.requirement_change_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_req_change_requests_req ON project.requirement_change_requests(requirement_id);
CREATE INDEX IF NOT EXISTS idx_req_change_requests_status ON project.requirement_change_requests(status);

-- Test Suites indexes
CREATE INDEX IF NOT EXISTS idx_test_suites_project ON project.test_suites(project_id);
CREATE INDEX IF NOT EXISTS idx_test_suites_phase ON project.test_suites(phase_id);

-- Test Cases indexes
CREATE INDEX IF NOT EXISTS idx_test_cases_suite ON project.test_cases(suite_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_project ON project.test_cases(project_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_status ON project.test_cases(status);
CREATE INDEX IF NOT EXISTS idx_test_cases_assignee ON project.test_cases(assignee_id);

-- Test Executions indexes
CREATE INDEX IF NOT EXISTS idx_test_executions_case ON project.test_executions(test_case_id);
CREATE INDEX IF NOT EXISTS idx_test_executions_project ON project.test_executions(project_id);
CREATE INDEX IF NOT EXISTS idx_test_executions_result ON project.test_executions(result);
CREATE INDEX IF NOT EXISTS idx_test_executions_date ON project.test_executions(execution_date DESC);

-- Test Case Trace Links indexes
CREATE INDEX IF NOT EXISTS idx_tc_trace_links_case ON project.test_case_trace_links(test_case_id);
CREATE INDEX IF NOT EXISTS idx_tc_trace_links_entity ON project.test_case_trace_links(linked_entity_type, linked_entity_id);

-- Issue Comments indexes
CREATE INDEX IF NOT EXISTS idx_issue_comments_issue ON project.issue_comments(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_comments_author ON project.issue_comments(author_id);

-- Health Snapshots indexes
CREATE INDEX IF NOT EXISTS idx_health_snapshots_project ON project.health_snapshots(project_id);
CREATE INDEX IF NOT EXISTS idx_health_snapshots_date ON project.health_snapshots(snapshot_date DESC);

-- Task Time Logs indexes
CREATE INDEX IF NOT EXISTS idx_task_time_logs_task ON task.task_time_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_time_logs_user ON task.task_time_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_task_time_logs_date ON task.task_time_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_task_time_logs_project ON task.task_time_logs(project_id);

-- Task Comments indexes
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_author ON task.task_comments(author_id);

-- Risk indexes
CREATE INDEX IF NOT EXISTS idx_risks_project ON risk.risks(project_id);
CREATE INDEX IF NOT EXISTS idx_risks_status ON risk.risks(status);
CREATE INDEX IF NOT EXISTS idx_risks_severity ON risk.risks(severity);
CREATE INDEX IF NOT EXISTS idx_risks_owner ON risk.risks(owner_id);
CREATE INDEX IF NOT EXISTS idx_risks_phase ON risk.risks(phase_id);
CREATE INDEX IF NOT EXISTS idx_risk_responses_risk ON risk.risk_responses(risk_id);
CREATE INDEX IF NOT EXISTS idx_risk_responses_status ON risk.risk_responses(status);

-- Decision indexes
CREATE INDEX IF NOT EXISTS idx_decisions_project ON risk.decisions(project_id);
CREATE INDEX IF NOT EXISTS idx_decisions_status ON risk.decisions(status);
CREATE INDEX IF NOT EXISTS idx_decisions_maker ON risk.decisions(decision_maker_id);
CREATE INDEX IF NOT EXISTS idx_decision_options_decision ON risk.decision_options(decision_id);

-- Risk Audit Trail indexes
CREATE INDEX IF NOT EXISTS idx_risk_audit_entity ON risk.risk_audit_trail(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_risk_audit_project ON risk.risk_audit_trail(project_id);
CREATE INDEX IF NOT EXISTS idx_risk_audit_time ON risk.risk_audit_trail(changed_at DESC);

-- ============================================
-- AUDIT SCHEMA
-- ============================================

CREATE TABLE IF NOT EXISTS audit.status_transition_events (
    id               VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id        VARCHAR(36),
    project_id       VARCHAR(36),
    entity_type      VARCHAR(32) NOT NULL,
    entity_id        VARCHAR(36) NOT NULL,
    from_status      VARCHAR(32),
    to_status        VARCHAR(32) NOT NULL,
    changed_by       VARCHAR(36),
    change_source    VARCHAR(32) NOT NULL,
    changed_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    metadata         JSONB
);

CREATE INDEX IF NOT EXISTS idx_transition_entity_time
    ON audit.status_transition_events(entity_type, entity_id, changed_at);
CREATE INDEX IF NOT EXISTS idx_transition_project_time
    ON audit.status_transition_events(project_id, changed_at);

-- Phase 4: Data quality snapshots for history tracking
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

-- Evidence Items (Screen 16 - Audit Evidence)
CREATE TABLE IF NOT EXISTS audit.evidence_items (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id VARCHAR(36) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(36) NOT NULL,
    evidence_type VARCHAR(50) NOT NULL DEFAULT 'DOCUMENT',
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_path TEXT,
    file_name VARCHAR(255),
    file_size BIGINT,
    hash_value VARCHAR(128),
    status VARCHAR(50) DEFAULT 'COLLECTED',
    collected_by VARCHAR(36),
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_by VARCHAR(36),
    verified_at TIMESTAMP,
    phase_id VARCHAR(36),
    compliance_category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

CREATE INDEX IF NOT EXISTS idx_evidence_items_project ON audit.evidence_items(project_id);
CREATE INDEX IF NOT EXISTS idx_evidence_items_entity ON audit.evidence_items(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_evidence_items_status ON audit.evidence_items(status);
CREATE INDEX IF NOT EXISTS idx_evidence_items_phase ON audit.evidence_items(phase_id);

-- Evidence Packages (Screen 16 - Bundled Evidence Export)
CREATE TABLE IF NOT EXISTS audit.evidence_packages (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    package_type VARCHAR(50) DEFAULT 'AUDIT_REPORT',
    status VARCHAR(50) DEFAULT 'DRAFT',
    phase_id VARCHAR(36),
    include_criteria JSONB,
    generated_file_path TEXT,
    generated_at TIMESTAMP,
    generated_by VARCHAR(36),
    approved_by VARCHAR(36),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

CREATE INDEX IF NOT EXISTS idx_evidence_packages_project ON audit.evidence_packages(project_id);
CREATE INDEX IF NOT EXISTS idx_evidence_packages_status ON audit.evidence_packages(status);

-- Compliance Checklists (Screen 16 - Compliance Tracking)
CREATE TABLE IF NOT EXISTS audit.compliance_checklists (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id VARCHAR(36) NOT NULL,
    checklist_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    item_description TEXT NOT NULL,
    required BOOLEAN DEFAULT TRUE,
    status VARCHAR(50) DEFAULT 'NOT_STARTED',
    evidence_item_id VARCHAR(36),
    phase_id VARCHAR(36),
    assignee_id VARCHAR(36),
    due_date DATE,
    completed_at TIMESTAMP,
    completed_by VARCHAR(36),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    created_by VARCHAR(36),
    updated_by VARCHAR(36)
);

CREATE INDEX IF NOT EXISTS idx_compliance_checklists_project ON audit.compliance_checklists(project_id);
CREATE INDEX IF NOT EXISTS idx_compliance_checklists_status ON audit.compliance_checklists(status);
CREATE INDEX IF NOT EXISTS idx_compliance_checklists_phase ON audit.compliance_checklists(phase_id);

-- Export Audit Trails (Screen 16 - Export Log)
CREATE TABLE IF NOT EXISTS audit.export_audit_trails (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id VARCHAR(36) NOT NULL,
    export_type VARCHAR(50) NOT NULL,
    export_format VARCHAR(20) NOT NULL DEFAULT 'PDF',
    exported_by VARCHAR(36) NOT NULL,
    exported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    file_path TEXT,
    file_size BIGINT,
    record_count INTEGER,
    filters_applied JSONB,
    status VARCHAR(50) DEFAULT 'COMPLETED',
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_export_audit_trails_project ON audit.export_audit_trails(project_id);
CREATE INDEX IF NOT EXISTS idx_export_audit_trails_exported ON audit.export_audit_trails(exported_at DESC);

-- ============================================
-- GOVERNANCE SCHEMA (#20 Authority Anchor, #22 Authority Orchestration)
-- Reference: docs/10_menu/화면설계/20_22_DB설계_권한거버넌스.md
-- All IDs use VARCHAR(36) to match existing schema pattern
-- ============================================

-- Current accountability: mutable, exactly 1 row per project
CREATE TABLE IF NOT EXISTS governance.project_accountability (
    project_id            VARCHAR(36) PRIMARY KEY,
    primary_pm_user_id    VARCHAR(36) NOT NULL,
    co_pm_user_id         VARCHAR(36) NULL,
    sponsor_user_id       VARCHAR(36) NULL,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by            VARCHAR(36) NOT NULL
);

-- Accountability change log: immutable audit trail
CREATE TABLE IF NOT EXISTS governance.accountability_change_log (
    id                    VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id            VARCHAR(36) NOT NULL,
    change_type           TEXT NOT NULL CHECK (change_type IN ('PM_CHANGE','CO_PM_CHANGE','SPONSOR_CHANGE')),
    previous_user_id      VARCHAR(36) NULL,
    new_user_id           VARCHAR(36) NULL,
    changed_by            VARCHAR(36) NOT NULL,
    change_reason         TEXT NOT NULL,
    changed_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_acc_log_project_time
    ON governance.accountability_change_log(project_id, changed_at DESC);

-- Role definitions (global + project-scoped)
CREATE TABLE IF NOT EXISTS governance.roles (
    id                VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id        VARCHAR(36) NULL,
    code              TEXT NOT NULL,
    name              TEXT NOT NULL,
    description       TEXT NULL,
    is_project_scoped BOOLEAN NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by        VARCHAR(36) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_roles_scope_code
    ON governance.roles(COALESCE(project_id, '00000000-0000-0000-0000-000000000000'), code);

-- Capability definitions
CREATE TABLE IF NOT EXISTS governance.capabilities (
    id                  VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    code                TEXT NOT NULL UNIQUE,
    name                TEXT NOT NULL,
    category            TEXT NOT NULL CHECK (category IN (
                          'APPROVAL','MANAGEMENT','VIEW','EXECUTION','GOVERNANCE'
                        )),
    description         TEXT NULL,
    is_delegatable      BOOLEAN NOT NULL DEFAULT false,
    allow_redelegation  BOOLEAN NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by          VARCHAR(36) NOT NULL
);

-- Role-capability preset mapping
CREATE TABLE IF NOT EXISTS governance.role_capabilities (
    role_id       VARCHAR(36) NOT NULL,
    capability_id VARCHAR(36) NOT NULL,
    PRIMARY KEY (role_id, capability_id),
    FOREIGN KEY (role_id) REFERENCES governance.roles(id) ON DELETE CASCADE,
    FOREIGN KEY (capability_id) REFERENCES governance.capabilities(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_role_caps_cap
    ON governance.role_capabilities(capability_id);

-- User role assignments
CREATE TABLE IF NOT EXISTS governance.user_roles (
    id          VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id  VARCHAR(36) NOT NULL,
    user_id     VARCHAR(36) NOT NULL,
    role_id     VARCHAR(36) NOT NULL,
    granted_by  VARCHAR(36) NOT NULL,
    granted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    reason      TEXT NULL,
    FOREIGN KEY (role_id) REFERENCES governance.roles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_roles_project_user
    ON governance.user_roles(project_id, user_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_project_role
    ON governance.user_roles(project_id, role_id);

-- Direct capability grants
CREATE TABLE IF NOT EXISTS governance.user_capabilities (
    id            VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id    VARCHAR(36) NOT NULL,
    user_id       VARCHAR(36) NOT NULL,
    capability_id VARCHAR(36) NOT NULL,
    granted_by    VARCHAR(36) NOT NULL,
    granted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    reason        TEXT NULL,
    FOREIGN KEY (capability_id) REFERENCES governance.capabilities(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_cap_project_user_cap
    ON governance.user_capabilities(project_id, user_id, capability_id);

-- Delegations with full lifecycle
CREATE TABLE IF NOT EXISTS governance.delegations (
    id                    VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id            VARCHAR(36) NOT NULL,
    delegator_id          VARCHAR(36) NOT NULL,
    delegatee_id          VARCHAR(36) NOT NULL,
    capability_id         VARCHAR(36) NOT NULL,
    scope_type            TEXT NOT NULL CHECK (scope_type IN ('PROJECT','PART','FUNCTION')),
    scope_part_id         VARCHAR(36) NULL,
    scope_function_desc   TEXT NULL,
    duration_type         TEXT NOT NULL CHECK (duration_type IN ('PERMANENT','TEMPORARY')),
    start_at              DATE NOT NULL,
    end_at                DATE NULL,
    approver_id           VARCHAR(36) NOT NULL,
    approved_at           TIMESTAMPTZ NULL,
    status                TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('ACTIVE','EXPIRED','REVOKED','PENDING')),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by            VARCHAR(36) NOT NULL,
    revoked_at            TIMESTAMPTZ NULL,
    revoked_by            VARCHAR(36) NULL,
    revoke_reason         TEXT NULL,
    parent_delegation_id  VARCHAR(36) NULL,

    FOREIGN KEY (capability_id) REFERENCES governance.capabilities(id),
    FOREIGN KEY (parent_delegation_id) REFERENCES governance.delegations(id) ON DELETE SET NULL,

    CONSTRAINT chk_temp_end_required
        CHECK ((duration_type = 'TEMPORARY' AND end_at IS NOT NULL) OR (duration_type = 'PERMANENT')),
    CONSTRAINT chk_scope_part_required
        CHECK ((scope_type <> 'PART') OR (scope_part_id IS NOT NULL)),
    CONSTRAINT chk_scope_function_required
        CHECK ((scope_type <> 'FUNCTION') OR (scope_function_desc IS NOT NULL AND length(scope_function_desc) > 0)),
    CONSTRAINT chk_no_self_approval
        CHECK (approver_id <> delegator_id)
);

CREATE INDEX IF NOT EXISTS idx_delegations_project_status
    ON governance.delegations(project_id, status);

CREATE INDEX IF NOT EXISTS idx_delegations_project_delegatee
    ON governance.delegations(project_id, delegatee_id);

CREATE INDEX IF NOT EXISTS idx_delegations_project_delegator
    ON governance.delegations(project_id, delegator_id);

CREATE INDEX IF NOT EXISTS idx_delegations_scope_part
    ON governance.delegations(project_id, scope_part_id)
    WHERE scope_type = 'PART';

CREATE INDEX IF NOT EXISTS idx_delegations_active_time
    ON governance.delegations(project_id, end_at)
    WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_delegations_parent
    ON governance.delegations(parent_delegation_id)
    WHERE parent_delegation_id IS NOT NULL;

-- Permission audit log (immutable, append-only)
CREATE TABLE IF NOT EXISTS governance.permission_audit_log (
    id            VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id    VARCHAR(36) NOT NULL,
    actor_id      VARCHAR(36) NOT NULL,
    action_type   TEXT NOT NULL,
    target_type   TEXT NOT NULL,
    target_id     VARCHAR(36) NOT NULL,
    reason        TEXT NULL,
    payload_json  JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gov_audit_project_time
    ON governance.permission_audit_log(project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gov_audit_target
    ON governance.permission_audit_log(target_type, target_id);

-- Separation of Duties rules
CREATE TABLE IF NOT EXISTS governance.sod_rules (
    id              VARCHAR(36) PRIMARY KEY,
    capability_a_id VARCHAR(36) NOT NULL,
    capability_b_id VARCHAR(36) NOT NULL,
    description     TEXT NOT NULL,
    severity        TEXT NOT NULL CHECK (severity IN ('HIGH','MEDIUM','LOW')),
    is_blocking     BOOLEAN NOT NULL DEFAULT false,
    FOREIGN KEY (capability_a_id) REFERENCES governance.capabilities(id),
    FOREIGN KEY (capability_b_id) REFERENCES governance.capabilities(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sod_pair
    ON governance.sod_rules(
        LEAST(capability_a_id, capability_b_id),
        GREATEST(capability_a_id, capability_b_id)
    );

-- Governance check execution records
CREATE TABLE IF NOT EXISTS governance.governance_check_runs (
    id            VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id    VARCHAR(36) NOT NULL,
    checked_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    checked_by    VARCHAR(36) NULL,
    summary_json  JSONB NOT NULL DEFAULT '{}'::JSONB
);

-- Governance findings
CREATE TABLE IF NOT EXISTS governance.governance_findings (
    id            VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    run_id        VARCHAR(36) NOT NULL,
    project_id    VARCHAR(36) NOT NULL,
    finding_type  TEXT NOT NULL CHECK (finding_type IN (
                    'SOD_VIOLATION','SELF_APPROVAL','EXPIRING_SOON',
                    'EXPIRED','DUPLICATE_CAP','ORPHAN_DELEGATION'
                  )),
    severity      TEXT NOT NULL CHECK (severity IN ('HIGH','MEDIUM','LOW','INFO')),
    user_id       VARCHAR(36) NULL,
    delegation_id VARCHAR(36) NULL,
    message       TEXT NOT NULL,
    details_json  JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    FOREIGN KEY (run_id) REFERENCES governance.governance_check_runs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_findings_project_run
    ON governance.governance_findings(project_id, run_id);

CREATE INDEX IF NOT EXISTS idx_findings_project_type
    ON governance.governance_findings(project_id, finding_type);

-- Outbox Events (for Neo4j sync)
CREATE TABLE IF NOT EXISTS governance.outbox_events (
    id              VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    aggregate_type  TEXT NOT NULL,
    aggregate_id    VARCHAR(36) NOT NULL,
    event_type      TEXT NOT NULL,
    project_id      VARCHAR(36) NOT NULL,
    payload         JSONB NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at    TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_gov_outbox_unprocessed
    ON governance.outbox_events(processed_at)
    WHERE processed_at IS NULL;

-- ============================================
-- ORGANIZATION SCHEMA (#21 Part Management Enhanced)
-- ============================================

-- Enhanced parts table with part types
CREATE TABLE IF NOT EXISTS organization.parts (
    id                VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id        VARCHAR(36) NOT NULL,
    name              TEXT NOT NULL,
    part_type         TEXT NOT NULL CHECK (part_type IN (
                        'AI_DEVELOPMENT','SI_DEVELOPMENT','QA',
                        'BUSINESS_ANALYSIS','COMMON','PMO','CUSTOM'
                      )),
    custom_type_name  TEXT NULL,
    status            TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','CLOSED')),
    leader_user_id    VARCHAR(36) NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by        VARCHAR(36) NOT NULL,
    closed_at         TIMESTAMPTZ NULL,
    closed_by         VARCHAR(36) NULL,

    CONSTRAINT chk_custom_type_name
        CHECK ((part_type <> 'CUSTOM') OR (custom_type_name IS NOT NULL AND length(custom_type_name) > 0))
);

CREATE INDEX IF NOT EXISTS idx_org_parts_project_status
    ON organization.parts(project_id, status);

CREATE INDEX IF NOT EXISTS idx_org_parts_project_type
    ON organization.parts(project_id, part_type);

-- Co-leaders (0..N per part)
CREATE TABLE IF NOT EXISTS organization.part_co_leaders (
    part_id       VARCHAR(36) NOT NULL,
    user_id       VARCHAR(36) NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by    VARCHAR(36) NOT NULL,
    PRIMARY KEY (part_id, user_id),
    FOREIGN KEY (part_id) REFERENCES organization.parts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_part_co_leaders_user
    ON organization.part_co_leaders(user_id);

-- Part memberships with PRIMARY/SECONDARY type
CREATE TABLE IF NOT EXISTS organization.part_memberships (
    id                VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id        VARCHAR(36) NOT NULL,
    part_id           VARCHAR(36) NOT NULL,
    user_id           VARCHAR(36) NOT NULL,
    membership_type   TEXT NOT NULL CHECK (membership_type IN ('PRIMARY','SECONDARY')),
    joined_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    joined_by         VARCHAR(36) NOT NULL,
    left_at           TIMESTAMPTZ NULL,
    left_by           VARCHAR(36) NULL,
    FOREIGN KEY (part_id) REFERENCES organization.parts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_memberships_part_active
    ON organization.part_memberships(part_id)
    WHERE left_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_memberships_user_active
    ON organization.part_memberships(project_id, user_id)
    WHERE left_at IS NULL;

-- PRIMARY uniqueness: exactly one active PRIMARY per user per project
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_primary_membership
    ON organization.part_memberships(project_id, user_id)
    WHERE left_at IS NULL AND membership_type = 'PRIMARY';

-- Assignment change log (audit trail)
CREATE TABLE IF NOT EXISTS organization.assignment_change_log (
    id              VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id      VARCHAR(36) NOT NULL,
    part_id         VARCHAR(36) NULL,
    user_id         VARCHAR(36) NOT NULL,
    change_type     TEXT NOT NULL CHECK (change_type IN (
                      'MEMBERSHIP_ADD','MEMBERSHIP_REMOVE','PRIMARY_SWITCH',
                      'LEADER_CHANGE','PART_CLOSE','PART_OPEN'
                    )),
    previous_value  TEXT NULL,
    new_value       TEXT NULL,
    changed_by      VARCHAR(36) NOT NULL,
    change_reason   TEXT NULL,
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assignment_log_project_time
    ON organization.assignment_change_log(project_id, changed_at DESC);

-- ============================================
-- GOVERNANCE VIEWS: Effective Capability Computation
-- Priority: DELEGATION(1) > DIRECT(2) > ROLE(3)
-- ============================================

-- Role-based capabilities (source: user_roles -> role_capabilities)
CREATE OR REPLACE VIEW governance.v_role_caps AS
SELECT
    ur.project_id,
    ur.user_id,
    rc.capability_id,
    'ROLE'::TEXT AS source_type,
    ur.role_id AS source_id
FROM governance.user_roles ur
JOIN governance.role_capabilities rc ON rc.role_id = ur.role_id;

-- Directly granted capabilities (source: user_capabilities)
CREATE OR REPLACE VIEW governance.v_direct_caps AS
SELECT
    uc.project_id,
    uc.user_id,
    uc.capability_id,
    'DIRECT'::TEXT AS source_type,
    uc.id AS source_id
FROM governance.user_capabilities uc;

-- Delegation-based capabilities (time-aware, active only)
CREATE OR REPLACE VIEW governance.v_delegated_caps AS
SELECT
    d.project_id,
    d.delegatee_id AS user_id,
    d.capability_id,
    'DELEGATION'::TEXT AS source_type,
    d.id AS source_id
FROM governance.delegations d
WHERE d.status = 'ACTIVE'
  AND d.start_at <= current_date
  AND (d.duration_type = 'PERMANENT' OR d.end_at >= current_date);

-- Effective capabilities: priority-applied final view
CREATE OR REPLACE VIEW governance.v_effective_caps AS
SELECT DISTINCT ON (project_id, user_id, capability_id)
    project_id, user_id, capability_id, source_type, source_id
FROM (
    SELECT * FROM governance.v_delegated_caps
    UNION ALL
    SELECT * FROM governance.v_direct_caps
    UNION ALL
    SELECT * FROM governance.v_role_caps
) s
ORDER BY project_id, user_id, capability_id,
    CASE source_type
        WHEN 'DELEGATION' THEN 1
        WHEN 'DIRECT' THEN 2
        WHEN 'ROLE' THEN 3
        ELSE 9
    END;
