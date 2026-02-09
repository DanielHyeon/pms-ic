-- ============================================================
-- V20260212: Governance & Organization Schemas
-- Implements screens #20 (Authority Anchor), #21 (Assignment),
-- #22 (Authority Orchestration)
-- Reference: docs/10_menu/화면설계/20_22_DB설계_권한거버넌스.md
-- NOTE: All IDs use VARCHAR(36) to match existing schema pattern
-- ============================================================

-- Schema creation (idempotent for safety)
CREATE SCHEMA IF NOT EXISTS governance;
CREATE SCHEMA IF NOT EXISTS organization;

-- ============================================================
-- 1. GOVERNANCE SCHEMA: #20 Authority Anchor
-- ============================================================

CREATE TABLE IF NOT EXISTS governance.project_accountability (
    project_id            VARCHAR(36) PRIMARY KEY,
    primary_pm_user_id    VARCHAR(36) NOT NULL,
    co_pm_user_id         VARCHAR(36) NULL,
    sponsor_user_id       VARCHAR(36) NULL,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by            VARCHAR(36) NOT NULL
);

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

-- ============================================================
-- 2. GOVERNANCE SCHEMA: #22 Roles & Capabilities
-- ============================================================

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

CREATE TABLE IF NOT EXISTS governance.role_capabilities (
    role_id       VARCHAR(36) NOT NULL,
    capability_id VARCHAR(36) NOT NULL,
    PRIMARY KEY (role_id, capability_id),
    FOREIGN KEY (role_id) REFERENCES governance.roles(id) ON DELETE CASCADE,
    FOREIGN KEY (capability_id) REFERENCES governance.capabilities(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_role_caps_cap
    ON governance.role_capabilities(capability_id);

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

-- ============================================================
-- 3. GOVERNANCE SCHEMA: #22 Delegations
-- ============================================================

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

-- ============================================================
-- 4. GOVERNANCE SCHEMA: Audit, SoD, Governance Checks
-- ============================================================

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

CREATE TABLE IF NOT EXISTS governance.governance_check_runs (
    id            VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id    VARCHAR(36) NOT NULL,
    checked_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    checked_by    VARCHAR(36) NULL,
    summary_json  JSONB NOT NULL DEFAULT '{}'::JSONB
);

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

-- ============================================================
-- 5. GOVERNANCE SCHEMA: Outbox Events (for Neo4j sync)
-- ============================================================

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

-- ============================================================
-- 6. ORGANIZATION SCHEMA: #21 Parts & Memberships
-- ============================================================

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

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_primary_membership
    ON organization.part_memberships(project_id, user_id)
    WHERE left_at IS NULL AND membership_type = 'PRIMARY';

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
