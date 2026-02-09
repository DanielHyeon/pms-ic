-- ============================================================
-- V20260212_2: Governance Seed Data
-- Predefined roles, capabilities, role-capability mappings, SoD rules
-- Plain INSERT with ON CONFLICT for idempotency (compatible with R2DBC data loader)
-- ============================================================

-- ============================================================
-- 1. ROLES (global, project_id = NULL)
-- ============================================================
INSERT INTO governance.roles (id, project_id, code, name, description, is_project_scoped, created_by) VALUES
    ('role-pm',       NULL, 'PM',                'Project Manager',      'Primary project manager with full project authority', true, 'SYSTEM'),
    ('role-co-pm',    NULL, 'CO_PM',             'Co-Project Manager',   'Assistant project manager', true, 'SYSTEM'),
    ('role-pmo-head', NULL, 'PMO_HEAD',          'PMO Head',             'PMO office head with governance authority', true, 'SYSTEM'),
    ('role-pmo-mem',  NULL, 'PMO_MEMBER',        'PMO Member',           'PMO office member', true, 'SYSTEM'),
    ('role-sponsor',  NULL, 'SPONSOR',           'Sponsor',              'Project sponsor with approval authority', true, 'SYSTEM'),
    ('role-part-ldr', NULL, 'PART_LEADER',       'Part Leader',          'Sub-project (part) team leader', true, 'SYSTEM'),
    ('role-dev-lead', NULL, 'DEV_LEAD',          'Development Lead',     'Development team lead', true, 'SYSTEM'),
    ('role-qa-lead',  NULL, 'QA_LEAD',           'QA Lead',              'Quality assurance team lead', true, 'SYSTEM'),
    ('role-dev',      NULL, 'DEVELOPER',         'Developer',            'Software developer', true, 'SYSTEM'),
    ('role-qa-eng',   NULL, 'QA_ENGINEER',       'QA Engineer',          'Quality assurance engineer', true, 'SYSTEM'),
    ('role-ba',       NULL, 'BUSINESS_ANALYST',  'Business Analyst',     'Business requirements analyst', true, 'SYSTEM'),
    ('role-member',   NULL, 'MEMBER',            'Member',               'General project member with basic access', true, 'SYSTEM')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. CAPABILITIES
-- ============================================================
INSERT INTO governance.capabilities (id, code, name, category, description, is_delegatable, allow_redelegation, created_by) VALUES
    -- VIEW capabilities
    ('cap-view-project',     'view_project',             'View Project',             'VIEW',       'View project details and summary', false, false, 'SYSTEM'),
    ('cap-view-part',        'view_part',                'View Part',                'VIEW',       'View part/team structure', false, false, 'SYSTEM'),
    ('cap-view-role-perm',   'view_role_permission',     'View Role & Permission',   'VIEW',       'View roles, capabilities, and delegations', false, false, 'SYSTEM'),
    ('cap-view-dashboard',   'view_dashboard',           'View Dashboard',           'VIEW',       'View project dashboard', false, false, 'SYSTEM'),
    ('cap-view-backlog',     'view_backlog',             'View Backlog',             'VIEW',       'View backlog items', false, false, 'SYSTEM'),
    ('cap-view-kanban',      'view_kanban',              'View Kanban',              'VIEW',       'View kanban board', false, false, 'SYSTEM'),
    ('cap-view-sprint',      'view_sprint',              'View Sprint',              'VIEW',       'View sprint board', false, false, 'SYSTEM'),
    ('cap-view-report',      'view_report',              'View Report',              'VIEW',       'View reports and statistics', false, false, 'SYSTEM'),

    -- MANAGEMENT capabilities
    ('cap-edit-acct',        'edit_project_accountability', 'Edit Project Accountability', 'MANAGEMENT', 'Change PM/Co-PM/Sponsor assignments', true, false, 'SYSTEM'),
    ('cap-manage-part',      'manage_part',              'Manage Part',              'MANAGEMENT', 'Create, update, close parts', true, false, 'SYSTEM'),
    ('cap-manage-part-mem',  'manage_part_member',       'Manage Part Member',       'MANAGEMENT', 'Add/remove part members, switch membership type', true, false, 'SYSTEM'),
    ('cap-manage-roles',     'manage_roles',             'Manage Roles',             'MANAGEMENT', 'Assign/revoke roles to users', true, false, 'SYSTEM'),
    ('cap-manage-caps',      'manage_capabilities',      'Manage Capabilities',      'MANAGEMENT', 'Grant/revoke direct capabilities', true, false, 'SYSTEM'),
    ('cap-manage-deleg',     'manage_delegations',       'Manage Delegations',       'MANAGEMENT', 'Create, approve, revoke delegations', true, true, 'SYSTEM'),
    ('cap-manage-backlog',   'manage_backlog',           'Manage Backlog',           'MANAGEMENT', 'Create/edit backlog items', true, false, 'SYSTEM'),
    ('cap-manage-sprint',    'manage_sprint',            'Manage Sprint',            'MANAGEMENT', 'Create/edit sprints', true, false, 'SYSTEM'),
    ('cap-manage-kanban',    'manage_kanban',            'Manage Kanban',            'MANAGEMENT', 'Move tasks on kanban board', false, false, 'SYSTEM'),

    -- APPROVAL capabilities
    ('cap-approve-code',     'approve_code',             'Approve Code',             'APPROVAL',   'Approve code reviews and merges', true, true, 'SYSTEM'),
    ('cap-approve-test',     'approve_test',             'Approve Test',             'APPROVAL',   'Approve test results and sign-off', true, true, 'SYSTEM'),
    ('cap-approve-deliv',    'approve_deliverable',      'Approve Deliverable',      'APPROVAL',   'Approve project deliverables', true, true, 'SYSTEM'),
    ('cap-approve-req',      'approve_requirement',      'Approve Requirement',      'APPROVAL',   'Approve requirements sign-off', true, false, 'SYSTEM'),

    -- EXECUTION capabilities
    ('cap-execute-task',     'execute_task',             'Execute Task',             'EXECUTION',  'Work on assigned tasks', false, false, 'SYSTEM'),
    ('cap-assign-task',      'assign_task',              'Assign Task',              'EXECUTION',  'Assign tasks to team members', true, false, 'SYSTEM'),

    -- GOVERNANCE capabilities
    ('cap-audit-gov',        'audit_governance',         'Audit Governance',         'GOVERNANCE', 'Run governance checks and view findings', true, false, 'SYSTEM')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. ROLE-CAPABILITY MAPPINGS (Presets)
-- ============================================================

-- PM: full project authority
INSERT INTO governance.role_capabilities (role_id, capability_id) VALUES
    ('role-pm', 'cap-view-project'), ('role-pm', 'cap-view-part'), ('role-pm', 'cap-view-role-perm'),
    ('role-pm', 'cap-view-dashboard'), ('role-pm', 'cap-view-backlog'), ('role-pm', 'cap-view-kanban'),
    ('role-pm', 'cap-view-sprint'), ('role-pm', 'cap-view-report'),
    ('role-pm', 'cap-edit-acct'), ('role-pm', 'cap-manage-part'), ('role-pm', 'cap-manage-part-mem'),
    ('role-pm', 'cap-manage-roles'), ('role-pm', 'cap-manage-caps'), ('role-pm', 'cap-manage-deleg'),
    ('role-pm', 'cap-manage-backlog'), ('role-pm', 'cap-manage-sprint'), ('role-pm', 'cap-manage-kanban'),
    ('role-pm', 'cap-approve-code'), ('role-pm', 'cap-approve-test'), ('role-pm', 'cap-approve-deliv'),
    ('role-pm', 'cap-approve-req'), ('role-pm', 'cap-assign-task'), ('role-pm', 'cap-audit-gov')
ON CONFLICT (role_id, capability_id) DO NOTHING;

-- CO_PM: most PM capabilities except accountability edit
INSERT INTO governance.role_capabilities (role_id, capability_id) VALUES
    ('role-co-pm', 'cap-view-project'), ('role-co-pm', 'cap-view-part'), ('role-co-pm', 'cap-view-role-perm'),
    ('role-co-pm', 'cap-view-dashboard'), ('role-co-pm', 'cap-view-backlog'), ('role-co-pm', 'cap-view-kanban'),
    ('role-co-pm', 'cap-view-sprint'), ('role-co-pm', 'cap-view-report'),
    ('role-co-pm', 'cap-manage-part'), ('role-co-pm', 'cap-manage-part-mem'), ('role-co-pm', 'cap-manage-deleg'),
    ('role-co-pm', 'cap-manage-backlog'), ('role-co-pm', 'cap-manage-sprint'), ('role-co-pm', 'cap-manage-kanban'),
    ('role-co-pm', 'cap-approve-code'), ('role-co-pm', 'cap-approve-test'), ('role-co-pm', 'cap-approve-deliv'),
    ('role-co-pm', 'cap-assign-task'), ('role-co-pm', 'cap-audit-gov')
ON CONFLICT (role_id, capability_id) DO NOTHING;

-- PMO_HEAD: governance + management
INSERT INTO governance.role_capabilities (role_id, capability_id) VALUES
    ('role-pmo-head', 'cap-view-project'), ('role-pmo-head', 'cap-view-part'), ('role-pmo-head', 'cap-view-role-perm'),
    ('role-pmo-head', 'cap-view-dashboard'), ('role-pmo-head', 'cap-view-backlog'), ('role-pmo-head', 'cap-view-kanban'),
    ('role-pmo-head', 'cap-view-sprint'), ('role-pmo-head', 'cap-view-report'),
    ('role-pmo-head', 'cap-edit-acct'), ('role-pmo-head', 'cap-manage-roles'), ('role-pmo-head', 'cap-manage-caps'),
    ('role-pmo-head', 'cap-manage-deleg'), ('role-pmo-head', 'cap-audit-gov')
ON CONFLICT (role_id, capability_id) DO NOTHING;

-- PMO_MEMBER: view + basic management
INSERT INTO governance.role_capabilities (role_id, capability_id) VALUES
    ('role-pmo-mem', 'cap-view-project'), ('role-pmo-mem', 'cap-view-part'), ('role-pmo-mem', 'cap-view-role-perm'),
    ('role-pmo-mem', 'cap-view-dashboard'), ('role-pmo-mem', 'cap-view-report')
ON CONFLICT (role_id, capability_id) DO NOTHING;

-- SPONSOR: view + approvals
INSERT INTO governance.role_capabilities (role_id, capability_id) VALUES
    ('role-sponsor', 'cap-view-project'), ('role-sponsor', 'cap-view-part'), ('role-sponsor', 'cap-view-role-perm'),
    ('role-sponsor', 'cap-view-dashboard'), ('role-sponsor', 'cap-view-report'),
    ('role-sponsor', 'cap-approve-deliv'), ('role-sponsor', 'cap-approve-req')
ON CONFLICT (role_id, capability_id) DO NOTHING;

-- PART_LEADER: part-scoped management
INSERT INTO governance.role_capabilities (role_id, capability_id) VALUES
    ('role-part-ldr', 'cap-view-project'), ('role-part-ldr', 'cap-view-part'), ('role-part-ldr', 'cap-view-dashboard'),
    ('role-part-ldr', 'cap-view-backlog'), ('role-part-ldr', 'cap-view-kanban'), ('role-part-ldr', 'cap-view-sprint'),
    ('role-part-ldr', 'cap-manage-part-mem'), ('role-part-ldr', 'cap-manage-backlog'),
    ('role-part-ldr', 'cap-manage-sprint'), ('role-part-ldr', 'cap-manage-kanban'),
    ('role-part-ldr', 'cap-assign-task'), ('role-part-ldr', 'cap-approve-code')
ON CONFLICT (role_id, capability_id) DO NOTHING;

-- DEV_LEAD: development management
INSERT INTO governance.role_capabilities (role_id, capability_id) VALUES
    ('role-dev-lead', 'cap-view-project'), ('role-dev-lead', 'cap-view-part'), ('role-dev-lead', 'cap-view-dashboard'),
    ('role-dev-lead', 'cap-view-backlog'), ('role-dev-lead', 'cap-view-kanban'), ('role-dev-lead', 'cap-view-sprint'),
    ('role-dev-lead', 'cap-manage-backlog'), ('role-dev-lead', 'cap-manage-sprint'), ('role-dev-lead', 'cap-manage-kanban'),
    ('role-dev-lead', 'cap-approve-code'), ('role-dev-lead', 'cap-assign-task')
ON CONFLICT (role_id, capability_id) DO NOTHING;

-- QA_LEAD: QA management
INSERT INTO governance.role_capabilities (role_id, capability_id) VALUES
    ('role-qa-lead', 'cap-view-project'), ('role-qa-lead', 'cap-view-part'), ('role-qa-lead', 'cap-view-dashboard'),
    ('role-qa-lead', 'cap-view-kanban'), ('role-qa-lead', 'cap-view-sprint'),
    ('role-qa-lead', 'cap-manage-kanban'), ('role-qa-lead', 'cap-approve-test')
ON CONFLICT (role_id, capability_id) DO NOTHING;

-- DEVELOPER: execution focus
INSERT INTO governance.role_capabilities (role_id, capability_id) VALUES
    ('role-dev', 'cap-view-project'), ('role-dev', 'cap-view-part'), ('role-dev', 'cap-view-dashboard'),
    ('role-dev', 'cap-view-backlog'), ('role-dev', 'cap-view-kanban'), ('role-dev', 'cap-view-sprint'),
    ('role-dev', 'cap-manage-kanban'), ('role-dev', 'cap-execute-task')
ON CONFLICT (role_id, capability_id) DO NOTHING;

-- QA_ENGINEER: testing focus
INSERT INTO governance.role_capabilities (role_id, capability_id) VALUES
    ('role-qa-eng', 'cap-view-project'), ('role-qa-eng', 'cap-view-part'), ('role-qa-eng', 'cap-view-dashboard'),
    ('role-qa-eng', 'cap-view-kanban'), ('role-qa-eng', 'cap-view-sprint'),
    ('role-qa-eng', 'cap-manage-kanban'), ('role-qa-eng', 'cap-execute-task')
ON CONFLICT (role_id, capability_id) DO NOTHING;

-- BUSINESS_ANALYST: requirements focus
INSERT INTO governance.role_capabilities (role_id, capability_id) VALUES
    ('role-ba', 'cap-view-project'), ('role-ba', 'cap-view-part'), ('role-ba', 'cap-view-dashboard'),
    ('role-ba', 'cap-view-backlog'), ('role-ba', 'cap-view-report'),
    ('role-ba', 'cap-manage-backlog'), ('role-ba', 'cap-approve-req')
ON CONFLICT (role_id, capability_id) DO NOTHING;

-- MEMBER: basic access
INSERT INTO governance.role_capabilities (role_id, capability_id) VALUES
    ('role-member', 'cap-view-project'), ('role-member', 'cap-view-part'), ('role-member', 'cap-view-dashboard'),
    ('role-member', 'cap-view-kanban'), ('role-member', 'cap-view-sprint'),
    ('role-member', 'cap-execute-task')
ON CONFLICT (role_id, capability_id) DO NOTHING;

-- ============================================================
-- 4. SoD RULES
-- ============================================================
INSERT INTO governance.sod_rules (id, capability_a_id, capability_b_id, description, severity, is_blocking) VALUES
    ('SOD-001', 'cap-approve-code', 'cap-approve-test',
     'Same person cannot approve both code and test results', 'HIGH', true),
    ('SOD-002', 'cap-approve-deliv', 'cap-approve-req',
     'Same person cannot approve both deliverables and requirements', 'MEDIUM', false),
    ('SOD-003', 'cap-manage-roles', 'cap-audit-gov',
     'Role manager should not be the sole governance auditor', 'LOW', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 5. SAMPLE DATA (for proj-001)
-- ============================================================

-- Project accountability
INSERT INTO governance.project_accountability (project_id, primary_pm_user_id, updated_by)
VALUES ('proj-001', 'user-pm-001', 'user-pm-001')
ON CONFLICT (project_id) DO NOTHING;

-- Assign PM role to PM user
INSERT INTO governance.user_roles (id, project_id, user_id, role_id, granted_by)
VALUES ('ur-pm-001', 'proj-001', 'user-pm-001', 'role-pm', 'user-pm-001')
ON CONFLICT (id) DO NOTHING;

-- Assign Sponsor role
INSERT INTO governance.user_roles (id, project_id, user_id, role_id, granted_by)
VALUES ('ur-sponsor-001', 'proj-001', 'user-sponsor-001', 'role-sponsor', 'user-pm-001')
ON CONFLICT (id) DO NOTHING;

-- Sample organization parts
INSERT INTO organization.parts (id, project_id, name, part_type, leader_user_id, created_by) VALUES
    ('org-part-ai-001', 'proj-001', 'AI Development', 'AI_DEVELOPMENT', 'user-dev-002', 'user-pm-001'),
    ('org-part-qa-001', 'proj-001', 'QA Team', 'QA', 'user-qa-001', 'user-pm-001')
ON CONFLICT (id) DO NOTHING;

-- Sample memberships
INSERT INTO organization.part_memberships (id, project_id, part_id, user_id, membership_type, joined_by) VALUES
    ('mem-001', 'proj-001', 'org-part-ai-001', 'user-dev-002', 'PRIMARY', 'user-pm-001'),
    ('mem-002', 'proj-001', 'org-part-ai-001', 'user-dev-003', 'SECONDARY', 'user-pm-001'),
    ('mem-003', 'proj-001', 'org-part-qa-001', 'user-qa-001', 'PRIMARY', 'user-pm-001')
ON CONFLICT (id) DO NOTHING;
