-- Mock Data for PMS Insurance Claims
-- Version: 20260123
-- Description: Sample data with 2 projects for testing (Korean localized)

-- ============================================
-- 1. USERS (auth.users)
-- ============================================
INSERT INTO auth.users (id, email, password, name, role, department, active, created_at, updated_at)
VALUES
    -- Admin (password: password123)
    ('user-admin-001', 'admin@insuretech.com', '$2b$10$pnu8J3dTzmxXXaX.w8UqXuu/JySVGgeO/.bTHBKxdeQ9mBLaaBicy', '시스템관리자', 'ADMIN', 'IT운영팀', true, NOW(), NOW()),
    -- PMO Head
    ('user-pmo-001', 'pmo.head@insuretech.com', '$2b$10$pnu8J3dTzmxXXaX.w8UqXuu/JySVGgeO/.bTHBKxdeQ9mBLaaBicy', '제임스 윌슨', 'PMO_HEAD', 'PMO', true, NOW(), NOW()),
    -- Project Managers
    ('user-pm-001', 'pm.kim@insuretech.com', '$2b$10$pnu8J3dTzmxXXaX.w8UqXuu/JySVGgeO/.bTHBKxdeQ9mBLaaBicy', '김민수', 'PM', '프로젝트관리팀', true, NOW(), NOW()),
    ('user-pm-002', 'pm.lee@insuretech.com', '$2b$10$pnu8J3dTzmxXXaX.w8UqXuu/JySVGgeO/.bTHBKxdeQ9mBLaaBicy', '이지혜', 'PM', '프로젝트관리팀', true, NOW(), NOW()),
    -- Developers
    ('user-dev-001', 'dev.park@insuretech.com', '$2b$10$pnu8J3dTzmxXXaX.w8UqXuu/JySVGgeO/.bTHBKxdeQ9mBLaaBicy', '박성호', 'DEVELOPER', '개발팀', true, NOW(), NOW()),
    ('user-dev-002', 'dev.choi@insuretech.com', '$2b$10$pnu8J3dTzmxXXaX.w8UqXuu/JySVGgeO/.bTHBKxdeQ9mBLaaBicy', '최은지', 'DEVELOPER', '개발팀', true, NOW(), NOW()),
    ('user-dev-003', 'dev.jung@insuretech.com', '$2b$10$pnu8J3dTzmxXXaX.w8UqXuu/JySVGgeO/.bTHBKxdeQ9mBLaaBicy', '정원재', 'DEVELOPER', '개발팀', true, NOW(), NOW()),
    -- QA
    ('user-qa-001', 'qa.han@insuretech.com', '$2b$10$pnu8J3dTzmxXXaX.w8UqXuu/JySVGgeO/.bTHBKxdeQ9mBLaaBicy', '한수진', 'QA', '품질보증팀', true, NOW(), NOW()),
    -- Business Analyst
    ('user-ba-001', 'ba.yoon@insuretech.com', '$2b$10$pnu8J3dTzmxXXaX.w8UqXuu/JySVGgeO/.bTHBKxdeQ9mBLaaBicy', '윤혜미', 'BUSINESS_ANALYST', '현업분석팀', true, NOW(), NOW()),
    -- Sponsor
    ('user-sponsor-001', 'sponsor.kang@insuretech.com', '$2b$10$pnu8J3dTzmxXXaX.w8UqXuu/JySVGgeO/.bTHBKxdeQ9mBLaaBicy', '강대현', 'SPONSOR', '경영진', true, NOW(), NOW()),

    -- Frontend Demo Users (matching LoginScreen.tsx, password: password123)
    ('U001', 'sponsor@insure.com', '$2b$10$pnu8J3dTzmxXXaX.w8UqXuu/JySVGgeO/.bTHBKxdeQ9mBLaaBicy', '이사장', 'SPONSOR', '경영진', true, NOW(), NOW()),
    ('U002', 'pmo@insure.com', '$2b$10$pnu8J3dTzmxXXaX.w8UqXuu/JySVGgeO/.bTHBKxdeQ9mBLaaBicy', 'PMO 총괄', 'PMO_HEAD', 'PMO', true, NOW(), NOW()),
    ('U003', 'pm@insure.com', '$2b$10$pnu8J3dTzmxXXaX.w8UqXuu/JySVGgeO/.bTHBKxdeQ9mBLaaBicy', '김철수', 'PM', 'IT혁신팀', true, NOW(), NOW()),
    ('U004', 'dev@insure.com', '$2b$10$pnu8J3dTzmxXXaX.w8UqXuu/JySVGgeO/.bTHBKxdeQ9mBLaaBicy', '박민수', 'DEVELOPER', 'AI개발팀', true, NOW(), NOW()),
    ('U005', 'qa@insure.com', '$2b$10$pnu8J3dTzmxXXaX.w8UqXuu/JySVGgeO/.bTHBKxdeQ9mBLaaBicy', '최지훈', 'QA', '품질보증팀', true, NOW(), NOW()),
    ('U006', 'ba@insure.com', '$2b$10$pnu8J3dTzmxXXaX.w8UqXuu/JySVGgeO/.bTHBKxdeQ9mBLaaBicy', '이영희', 'BUSINESS_ANALYST', '보험심사팀', true, NOW(), NOW()),
    ('U007', 'auditor@insure.com', '$2b$10$pnu8J3dTzmxXXaX.w8UqXuu/JySVGgeO/.bTHBKxdeQ9mBLaaBicy', '감리인', 'AUDITOR', '외부감리법인', true, NOW(), NOW()),
    ('U008', 'admin@insure.com', '$2b$10$pnu8J3dTzmxXXaX.w8UqXuu/JySVGgeO/.bTHBKxdeQ9mBLaaBicy', '시스템관리자', 'ADMIN', 'IT운영팀', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 1.1. PERMISSIONS (auth.permissions)
-- ============================================
INSERT INTO auth.permissions (id, category, name, description, resource, action, created_at, updated_at)
VALUES
    -- PROJECT permissions
    ('perm-proj-create', 'PROJECT', 'PROJECT_CREATE', 'Create new projects', 'project', 'CREATE', NOW(), NOW()),
    ('perm-proj-read', 'PROJECT', 'PROJECT_READ', 'View project details', 'project', 'READ', NOW(), NOW()),
    ('perm-proj-update', 'PROJECT', 'PROJECT_UPDATE', 'Modify project settings', 'project', 'UPDATE', NOW(), NOW()),
    ('perm-proj-delete', 'PROJECT', 'PROJECT_DELETE', 'Delete projects', 'project', 'DELETE', NOW(), NOW()),

    -- PROJECT_MEMBER permissions
    ('perm-member-add', 'PROJECT_MEMBER', 'MEMBER_ADD', 'Add members to project', 'project_member', 'CREATE', NOW(), NOW()),
    ('perm-member-update', 'PROJECT_MEMBER', 'MEMBER_UPDATE', 'Update member roles', 'project_member', 'UPDATE', NOW(), NOW()),
    ('perm-member-remove', 'PROJECT_MEMBER', 'MEMBER_REMOVE', 'Remove members from project', 'project_member', 'DELETE', NOW(), NOW()),

    -- TASK permissions
    ('perm-task-create', 'TASK', 'TASK_CREATE', 'Create tasks', 'task', 'CREATE', NOW(), NOW()),
    ('perm-task-read', 'TASK', 'TASK_READ', 'View tasks', 'task', 'READ', NOW(), NOW()),
    ('perm-task-update', 'TASK', 'TASK_UPDATE', 'Update tasks', 'task', 'UPDATE', NOW(), NOW()),
    ('perm-task-delete', 'TASK', 'TASK_DELETE', 'Delete tasks', 'task', 'DELETE', NOW(), NOW()),
    ('perm-task-assign', 'TASK', 'TASK_ASSIGN', 'Assign tasks to users', 'task', 'ASSIGN', NOW(), NOW()),

    -- SPRINT permissions
    ('perm-sprint-create', 'SPRINT', 'SPRINT_CREATE', 'Create sprints', 'sprint', 'CREATE', NOW(), NOW()),
    ('perm-sprint-read', 'SPRINT', 'SPRINT_READ', 'View sprints', 'sprint', 'READ', NOW(), NOW()),
    ('perm-sprint-update', 'SPRINT', 'SPRINT_UPDATE', 'Update sprints', 'sprint', 'UPDATE', NOW(), NOW()),
    ('perm-sprint-start', 'SPRINT', 'SPRINT_START', 'Start sprints', 'sprint', 'START', NOW(), NOW()),
    ('perm-sprint-complete', 'SPRINT', 'SPRINT_COMPLETE', 'Complete sprints', 'sprint', 'COMPLETE', NOW(), NOW()),

    -- BACKLOG permissions
    ('perm-backlog-manage', 'BACKLOG', 'BACKLOG_MANAGE', 'Manage product backlog', 'backlog', 'MANAGE', NOW(), NOW()),
    ('perm-backlog-read', 'BACKLOG', 'BACKLOG_READ', 'View backlog items', 'backlog', 'READ', NOW(), NOW()),
    ('perm-backlog-prioritize', 'BACKLOG', 'BACKLOG_PRIORITIZE', 'Prioritize backlog items', 'backlog', 'PRIORITIZE', NOW(), NOW()),

    -- RFP permissions
    ('perm-rfp-create', 'RFP', 'RFP_CREATE', 'Create RFPs', 'rfp', 'CREATE', NOW(), NOW()),
    ('perm-rfp-read', 'RFP', 'RFP_READ', 'View RFPs', 'rfp', 'READ', NOW(), NOW()),
    ('perm-rfp-update', 'RFP', 'RFP_UPDATE', 'Update RFPs', 'rfp', 'UPDATE', NOW(), NOW()),
    ('perm-rfp-approve', 'RFP', 'RFP_APPROVE', 'Approve RFPs', 'rfp', 'APPROVE', NOW(), NOW()),

    -- REQUIREMENT permissions
    ('perm-req-create', 'REQUIREMENT', 'REQUIREMENT_CREATE', 'Create requirements', 'requirement', 'CREATE', NOW(), NOW()),
    ('perm-req-read', 'REQUIREMENT', 'REQUIREMENT_READ', 'View requirements', 'requirement', 'READ', NOW(), NOW()),
    ('perm-req-update', 'REQUIREMENT', 'REQUIREMENT_UPDATE', 'Update requirements', 'requirement', 'UPDATE', NOW(), NOW()),
    ('perm-req-delete', 'REQUIREMENT', 'REQUIREMENT_DELETE', 'Delete requirements', 'requirement', 'DELETE', NOW(), NOW()),

    -- REPORT permissions
    ('perm-report-generate', 'REPORT', 'REPORT_GENERATE', 'Generate reports', 'report', 'CREATE', NOW(), NOW()),
    ('perm-report-read', 'REPORT', 'REPORT_READ', 'View reports', 'report', 'READ', NOW(), NOW()),
    ('perm-report-export', 'REPORT', 'REPORT_EXPORT', 'Export reports', 'report', 'EXPORT', NOW(), NOW()),

    -- CHAT permissions
    ('perm-chat-access', 'CHAT', 'CHAT_ACCESS', 'Access AI chat functionality', 'chat', 'ACCESS', NOW(), NOW()),

    -- EDUCATION permissions
    ('perm-education-access', 'EDUCATION', 'EDUCATION_ACCESS', 'Access education modules', 'education', 'ACCESS', NOW(), NOW()),
    ('perm-education-manage', 'EDUCATION', 'EDUCATION_MANAGE', 'Manage education content', 'education', 'MANAGE', NOW(), NOW()),

    -- LINEAGE permissions
    ('perm-lineage-view', 'LINEAGE', 'LINEAGE_VIEW', 'View data lineage', 'lineage', 'READ', NOW(), NOW()),

    -- DELIVERABLE permissions
    ('perm-deliv-create', 'DELIVERABLE', 'DELIVERABLE_CREATE', 'Create deliverables', 'deliverable', 'CREATE', NOW(), NOW()),
    ('perm-deliv-read', 'DELIVERABLE', 'DELIVERABLE_READ', 'View deliverables', 'deliverable', 'READ', NOW(), NOW()),
    ('perm-deliv-approve', 'DELIVERABLE', 'DELIVERABLE_APPROVE', 'Approve deliverables', 'deliverable', 'APPROVE', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 1.2. ROLE PERMISSIONS (auth.role_permissions)
-- ============================================
-- ADMIN: Full access
INSERT INTO auth.role_permissions (id, role, permission_id, granted, created_at, updated_at)
VALUES
    ('rp-admin-001', 'ADMIN', 'perm-proj-create', true, NOW(), NOW()),
    ('rp-admin-002', 'ADMIN', 'perm-proj-read', true, NOW(), NOW()),
    ('rp-admin-003', 'ADMIN', 'perm-proj-update', true, NOW(), NOW()),
    ('rp-admin-004', 'ADMIN', 'perm-proj-delete', true, NOW(), NOW()),
    ('rp-admin-005', 'ADMIN', 'perm-member-add', true, NOW(), NOW()),
    ('rp-admin-006', 'ADMIN', 'perm-member-update', true, NOW(), NOW()),
    ('rp-admin-007', 'ADMIN', 'perm-member-remove', true, NOW(), NOW()),
    ('rp-admin-008', 'ADMIN', 'perm-task-create', true, NOW(), NOW()),
    ('rp-admin-009', 'ADMIN', 'perm-task-read', true, NOW(), NOW()),
    ('rp-admin-010', 'ADMIN', 'perm-task-update', true, NOW(), NOW()),
    ('rp-admin-011', 'ADMIN', 'perm-task-delete', true, NOW(), NOW()),
    ('rp-admin-012', 'ADMIN', 'perm-task-assign', true, NOW(), NOW()),
    ('rp-admin-013', 'ADMIN', 'perm-sprint-create', true, NOW(), NOW()),
    ('rp-admin-014', 'ADMIN', 'perm-sprint-read', true, NOW(), NOW()),
    ('rp-admin-015', 'ADMIN', 'perm-sprint-update', true, NOW(), NOW()),
    ('rp-admin-016', 'ADMIN', 'perm-sprint-start', true, NOW(), NOW()),
    ('rp-admin-017', 'ADMIN', 'perm-sprint-complete', true, NOW(), NOW()),
    ('rp-admin-018', 'ADMIN', 'perm-backlog-manage', true, NOW(), NOW()),
    ('rp-admin-019', 'ADMIN', 'perm-backlog-read', true, NOW(), NOW()),
    ('rp-admin-020', 'ADMIN', 'perm-backlog-prioritize', true, NOW(), NOW()),
    ('rp-admin-021', 'ADMIN', 'perm-rfp-create', true, NOW(), NOW()),
    ('rp-admin-022', 'ADMIN', 'perm-rfp-read', true, NOW(), NOW()),
    ('rp-admin-023', 'ADMIN', 'perm-rfp-update', true, NOW(), NOW()),
    ('rp-admin-024', 'ADMIN', 'perm-rfp-approve', true, NOW(), NOW()),
    ('rp-admin-025', 'ADMIN', 'perm-req-create', true, NOW(), NOW()),
    ('rp-admin-026', 'ADMIN', 'perm-req-read', true, NOW(), NOW()),
    ('rp-admin-027', 'ADMIN', 'perm-req-update', true, NOW(), NOW()),
    ('rp-admin-028', 'ADMIN', 'perm-req-delete', true, NOW(), NOW()),
    ('rp-admin-029', 'ADMIN', 'perm-report-generate', true, NOW(), NOW()),
    ('rp-admin-030', 'ADMIN', 'perm-report-read', true, NOW(), NOW()),
    ('rp-admin-031', 'ADMIN', 'perm-report-export', true, NOW(), NOW()),
    ('rp-admin-032', 'ADMIN', 'perm-chat-access', true, NOW(), NOW()),
    ('rp-admin-033', 'ADMIN', 'perm-education-access', true, NOW(), NOW()),
    ('rp-admin-034', 'ADMIN', 'perm-education-manage', true, NOW(), NOW()),
    ('rp-admin-035', 'ADMIN', 'perm-lineage-view', true, NOW(), NOW()),
    ('rp-admin-036', 'ADMIN', 'perm-deliv-create', true, NOW(), NOW()),
    ('rp-admin-037', 'ADMIN', 'perm-deliv-read', true, NOW(), NOW()),
    ('rp-admin-038', 'ADMIN', 'perm-deliv-approve', true, NOW(), NOW()),

    -- SPONSOR: Strategic oversight, approval authority
    ('rp-sponsor-001', 'SPONSOR', 'perm-proj-read', true, NOW(), NOW()),
    ('rp-sponsor-002', 'SPONSOR', 'perm-proj-update', true, NOW(), NOW()),
    ('rp-sponsor-003', 'SPONSOR', 'perm-member-add', true, NOW(), NOW()),
    ('rp-sponsor-004', 'SPONSOR', 'perm-member-update', true, NOW(), NOW()),
    ('rp-sponsor-005', 'SPONSOR', 'perm-task-read', true, NOW(), NOW()),
    ('rp-sponsor-006', 'SPONSOR', 'perm-sprint-read', true, NOW(), NOW()),
    ('rp-sponsor-007', 'SPONSOR', 'perm-backlog-read', true, NOW(), NOW()),
    ('rp-sponsor-008', 'SPONSOR', 'perm-rfp-read', true, NOW(), NOW()),
    ('rp-sponsor-009', 'SPONSOR', 'perm-rfp-approve', true, NOW(), NOW()),
    ('rp-sponsor-010', 'SPONSOR', 'perm-req-read', true, NOW(), NOW()),
    ('rp-sponsor-011', 'SPONSOR', 'perm-report-read', true, NOW(), NOW()),
    ('rp-sponsor-012', 'SPONSOR', 'perm-report-export', true, NOW(), NOW()),
    ('rp-sponsor-013', 'SPONSOR', 'perm-chat-access', true, NOW(), NOW()),
    ('rp-sponsor-014', 'SPONSOR', 'perm-lineage-view', true, NOW(), NOW()),
    ('rp-sponsor-015', 'SPONSOR', 'perm-deliv-read', true, NOW(), NOW()),
    ('rp-sponsor-016', 'SPONSOR', 'perm-deliv-approve', true, NOW(), NOW()),

    -- PMO_HEAD: Full project management authority
    ('rp-pmo-001', 'PMO_HEAD', 'perm-proj-create', true, NOW(), NOW()),
    ('rp-pmo-002', 'PMO_HEAD', 'perm-proj-read', true, NOW(), NOW()),
    ('rp-pmo-003', 'PMO_HEAD', 'perm-proj-update', true, NOW(), NOW()),
    ('rp-pmo-004', 'PMO_HEAD', 'perm-member-add', true, NOW(), NOW()),
    ('rp-pmo-005', 'PMO_HEAD', 'perm-member-update', true, NOW(), NOW()),
    ('rp-pmo-006', 'PMO_HEAD', 'perm-member-remove', true, NOW(), NOW()),
    ('rp-pmo-007', 'PMO_HEAD', 'perm-task-create', true, NOW(), NOW()),
    ('rp-pmo-008', 'PMO_HEAD', 'perm-task-read', true, NOW(), NOW()),
    ('rp-pmo-009', 'PMO_HEAD', 'perm-task-update', true, NOW(), NOW()),
    ('rp-pmo-010', 'PMO_HEAD', 'perm-task-delete', true, NOW(), NOW()),
    ('rp-pmo-011', 'PMO_HEAD', 'perm-task-assign', true, NOW(), NOW()),
    ('rp-pmo-012', 'PMO_HEAD', 'perm-sprint-create', true, NOW(), NOW()),
    ('rp-pmo-013', 'PMO_HEAD', 'perm-sprint-read', true, NOW(), NOW()),
    ('rp-pmo-014', 'PMO_HEAD', 'perm-sprint-update', true, NOW(), NOW()),
    ('rp-pmo-015', 'PMO_HEAD', 'perm-sprint-start', true, NOW(), NOW()),
    ('rp-pmo-016', 'PMO_HEAD', 'perm-sprint-complete', true, NOW(), NOW()),
    ('rp-pmo-017', 'PMO_HEAD', 'perm-backlog-manage', true, NOW(), NOW()),
    ('rp-pmo-018', 'PMO_HEAD', 'perm-backlog-read', true, NOW(), NOW()),
    ('rp-pmo-019', 'PMO_HEAD', 'perm-backlog-prioritize', true, NOW(), NOW()),
    ('rp-pmo-020', 'PMO_HEAD', 'perm-rfp-create', true, NOW(), NOW()),
    ('rp-pmo-021', 'PMO_HEAD', 'perm-rfp-read', true, NOW(), NOW()),
    ('rp-pmo-022', 'PMO_HEAD', 'perm-rfp-update', true, NOW(), NOW()),
    ('rp-pmo-023', 'PMO_HEAD', 'perm-req-create', true, NOW(), NOW()),
    ('rp-pmo-024', 'PMO_HEAD', 'perm-req-read', true, NOW(), NOW()),
    ('rp-pmo-025', 'PMO_HEAD', 'perm-req-update', true, NOW(), NOW()),
    ('rp-pmo-026', 'PMO_HEAD', 'perm-report-generate', true, NOW(), NOW()),
    ('rp-pmo-027', 'PMO_HEAD', 'perm-report-read', true, NOW(), NOW()),
    ('rp-pmo-028', 'PMO_HEAD', 'perm-report-export', true, NOW(), NOW()),
    ('rp-pmo-029', 'PMO_HEAD', 'perm-chat-access', true, NOW(), NOW()),
    ('rp-pmo-030', 'PMO_HEAD', 'perm-education-access', true, NOW(), NOW()),
    ('rp-pmo-031', 'PMO_HEAD', 'perm-lineage-view', true, NOW(), NOW()),
    ('rp-pmo-032', 'PMO_HEAD', 'perm-deliv-create', true, NOW(), NOW()),
    ('rp-pmo-033', 'PMO_HEAD', 'perm-deliv-read', true, NOW(), NOW()),
    ('rp-pmo-034', 'PMO_HEAD', 'perm-deliv-approve', true, NOW(), NOW()),

    -- PM: Project management within assigned project
    ('rp-pm-001', 'PM', 'perm-proj-read', true, NOW(), NOW()),
    ('rp-pm-002', 'PM', 'perm-proj-update', true, NOW(), NOW()),
    ('rp-pm-003', 'PM', 'perm-member-add', true, NOW(), NOW()),
    ('rp-pm-004', 'PM', 'perm-member-update', true, NOW(), NOW()),
    ('rp-pm-005', 'PM', 'perm-member-remove', true, NOW(), NOW()),
    ('rp-pm-006', 'PM', 'perm-task-create', true, NOW(), NOW()),
    ('rp-pm-007', 'PM', 'perm-task-read', true, NOW(), NOW()),
    ('rp-pm-008', 'PM', 'perm-task-update', true, NOW(), NOW()),
    ('rp-pm-009', 'PM', 'perm-task-delete', true, NOW(), NOW()),
    ('rp-pm-010', 'PM', 'perm-task-assign', true, NOW(), NOW()),
    ('rp-pm-011', 'PM', 'perm-sprint-create', true, NOW(), NOW()),
    ('rp-pm-012', 'PM', 'perm-sprint-read', true, NOW(), NOW()),
    ('rp-pm-013', 'PM', 'perm-sprint-update', true, NOW(), NOW()),
    ('rp-pm-014', 'PM', 'perm-sprint-start', true, NOW(), NOW()),
    ('rp-pm-015', 'PM', 'perm-sprint-complete', true, NOW(), NOW()),
    ('rp-pm-016', 'PM', 'perm-backlog-manage', true, NOW(), NOW()),
    ('rp-pm-017', 'PM', 'perm-backlog-read', true, NOW(), NOW()),
    ('rp-pm-018', 'PM', 'perm-backlog-prioritize', true, NOW(), NOW()),
    ('rp-pm-019', 'PM', 'perm-rfp-read', true, NOW(), NOW()),
    ('rp-pm-020', 'PM', 'perm-req-create', true, NOW(), NOW()),
    ('rp-pm-021', 'PM', 'perm-req-read', true, NOW(), NOW()),
    ('rp-pm-022', 'PM', 'perm-req-update', true, NOW(), NOW()),
    ('rp-pm-023', 'PM', 'perm-report-generate', true, NOW(), NOW()),
    ('rp-pm-024', 'PM', 'perm-report-read', true, NOW(), NOW()),
    ('rp-pm-025', 'PM', 'perm-report-export', true, NOW(), NOW()),
    ('rp-pm-026', 'PM', 'perm-chat-access', true, NOW(), NOW()),
    ('rp-pm-027', 'PM', 'perm-education-access', true, NOW(), NOW()),
    ('rp-pm-028', 'PM', 'perm-lineage-view', true, NOW(), NOW()),
    ('rp-pm-029', 'PM', 'perm-deliv-create', true, NOW(), NOW()),
    ('rp-pm-030', 'PM', 'perm-deliv-read', true, NOW(), NOW()),
    ('rp-pm-031', 'PM', 'perm-deliv-approve', true, NOW(), NOW()),

    -- DEVELOPER: Task execution and development work
    ('rp-dev-001', 'DEVELOPER', 'perm-proj-read', true, NOW(), NOW()),
    ('rp-dev-002', 'DEVELOPER', 'perm-task-create', true, NOW(), NOW()),
    ('rp-dev-003', 'DEVELOPER', 'perm-task-read', true, NOW(), NOW()),
    ('rp-dev-004', 'DEVELOPER', 'perm-task-update', true, NOW(), NOW()),
    ('rp-dev-005', 'DEVELOPER', 'perm-sprint-read', true, NOW(), NOW()),
    ('rp-dev-006', 'DEVELOPER', 'perm-backlog-read', true, NOW(), NOW()),
    ('rp-dev-007', 'DEVELOPER', 'perm-req-read', true, NOW(), NOW()),
    ('rp-dev-008', 'DEVELOPER', 'perm-chat-access', true, NOW(), NOW()),
    ('rp-dev-009', 'DEVELOPER', 'perm-education-access', true, NOW(), NOW()),
    ('rp-dev-010', 'DEVELOPER', 'perm-lineage-view', true, NOW(), NOW()),
    ('rp-dev-011', 'DEVELOPER', 'perm-deliv-create', true, NOW(), NOW()),
    ('rp-dev-012', 'DEVELOPER', 'perm-deliv-read', true, NOW(), NOW()),

    -- QA: Testing and quality assurance
    ('rp-qa-001', 'QA', 'perm-proj-read', true, NOW(), NOW()),
    ('rp-qa-002', 'QA', 'perm-task-create', true, NOW(), NOW()),
    ('rp-qa-003', 'QA', 'perm-task-read', true, NOW(), NOW()),
    ('rp-qa-004', 'QA', 'perm-task-update', true, NOW(), NOW()),
    ('rp-qa-005', 'QA', 'perm-sprint-read', true, NOW(), NOW()),
    ('rp-qa-006', 'QA', 'perm-backlog-read', true, NOW(), NOW()),
    ('rp-qa-007', 'QA', 'perm-req-read', true, NOW(), NOW()),
    ('rp-qa-008', 'QA', 'perm-report-read', true, NOW(), NOW()),
    ('rp-qa-009', 'QA', 'perm-chat-access', true, NOW(), NOW()),
    ('rp-qa-010', 'QA', 'perm-education-access', true, NOW(), NOW()),
    ('rp-qa-011', 'QA', 'perm-deliv-read', true, NOW(), NOW()),

    -- BUSINESS_ANALYST: Requirements and business analysis
    ('rp-ba-001', 'BUSINESS_ANALYST', 'perm-proj-read', true, NOW(), NOW()),
    ('rp-ba-002', 'BUSINESS_ANALYST', 'perm-task-create', true, NOW(), NOW()),
    ('rp-ba-003', 'BUSINESS_ANALYST', 'perm-task-read', true, NOW(), NOW()),
    ('rp-ba-004', 'BUSINESS_ANALYST', 'perm-task-update', true, NOW(), NOW()),
    ('rp-ba-005', 'BUSINESS_ANALYST', 'perm-sprint-read', true, NOW(), NOW()),
    ('rp-ba-006', 'BUSINESS_ANALYST', 'perm-backlog-read', true, NOW(), NOW()),
    ('rp-ba-007', 'BUSINESS_ANALYST', 'perm-backlog-prioritize', true, NOW(), NOW()),
    ('rp-ba-008', 'BUSINESS_ANALYST', 'perm-rfp-read', true, NOW(), NOW()),
    ('rp-ba-009', 'BUSINESS_ANALYST', 'perm-req-create', true, NOW(), NOW()),
    ('rp-ba-010', 'BUSINESS_ANALYST', 'perm-req-read', true, NOW(), NOW()),
    ('rp-ba-011', 'BUSINESS_ANALYST', 'perm-req-update', true, NOW(), NOW()),
    ('rp-ba-012', 'BUSINESS_ANALYST', 'perm-report-read', true, NOW(), NOW()),
    ('rp-ba-013', 'BUSINESS_ANALYST', 'perm-chat-access', true, NOW(), NOW()),
    ('rp-ba-014', 'BUSINESS_ANALYST', 'perm-education-access', true, NOW(), NOW()),
    ('rp-ba-015', 'BUSINESS_ANALYST', 'perm-lineage-view', true, NOW(), NOW()),
    ('rp-ba-016', 'BUSINESS_ANALYST', 'perm-deliv-create', true, NOW(), NOW()),
    ('rp-ba-017', 'BUSINESS_ANALYST', 'perm-deliv-read', true, NOW(), NOW()),

    -- MEMBER: Basic project access
    ('rp-member-001', 'MEMBER', 'perm-proj-read', true, NOW(), NOW()),
    ('rp-member-002', 'MEMBER', 'perm-task-read', true, NOW(), NOW()),
    ('rp-member-003', 'MEMBER', 'perm-task-update', true, NOW(), NOW()),
    ('rp-member-004', 'MEMBER', 'perm-sprint-read', true, NOW(), NOW()),
    ('rp-member-005', 'MEMBER', 'perm-backlog-read', true, NOW(), NOW()),
    ('rp-member-006', 'MEMBER', 'perm-chat-access', true, NOW(), NOW()),
    ('rp-member-007', 'MEMBER', 'perm-education-access', true, NOW(), NOW()),

    -- AUDITOR: Read-only access for audit purposes
    ('rp-auditor-001', 'AUDITOR', 'perm-proj-read', true, NOW(), NOW()),
    ('rp-auditor-002', 'AUDITOR', 'perm-task-read', true, NOW(), NOW()),
    ('rp-auditor-003', 'AUDITOR', 'perm-sprint-read', true, NOW(), NOW()),
    ('rp-auditor-004', 'AUDITOR', 'perm-backlog-read', true, NOW(), NOW()),
    ('rp-auditor-005', 'AUDITOR', 'perm-rfp-read', true, NOW(), NOW()),
    ('rp-auditor-006', 'AUDITOR', 'perm-req-read', true, NOW(), NOW()),
    ('rp-auditor-007', 'AUDITOR', 'perm-report-read', true, NOW(), NOW()),
    ('rp-auditor-008', 'AUDITOR', 'perm-report-export', true, NOW(), NOW()),
    ('rp-auditor-009', 'AUDITOR', 'perm-lineage-view', true, NOW(), NOW()),
    ('rp-auditor-010', 'AUDITOR', 'perm-deliv-read', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. PROJECTS (project.projects)
-- ============================================
INSERT INTO project.projects (id, name, description, status, start_date, end_date, budget, progress, is_default, created_at, updated_at, created_by)
VALUES
    -- Project 1: AI 보험심사 처리 시스템
    ('proj-001', 'AI 보험심사 처리 시스템',
     'AI 기반 보험 청구 처리 시스템 개발. 자동 문서 분석, 사기 탐지, 지능형 라우팅 기능 포함. 청구 처리 시간 60% 단축 및 정확도 40% 향상 목표.',
     'IN_PROGRESS', '2026-01-15', '2026-06-30', 500000000.00, 25, true, NOW(), NOW(), 'user-pm-001'),

    -- Project 2: 모바일 보험 플랫폼
    ('proj-002', '모바일 보험 플랫폼',
     '보험 서비스를 위한 종합 모바일 플랫폼 구축. 보험증권 관리, 청구 제출, 실시간 상태 조회, 고객지원 통합 기능 포함. 목표: 출시 1년 내 10만 활성 사용자 확보.',
     'PLANNING', '2026-02-01', '2026-08-31', 350000000.00, 5, false, NOW(), NOW(), 'user-pm-002')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- ============================================
-- 3. PHASES (project.phases)
-- ============================================
-- Project 1 Main Phases
INSERT INTO project.phases (id, project_id, parent_id, name, order_num, status, gate_status, start_date, end_date, progress, description, track_type, created_at, updated_at)
VALUES
    ('phase-001-01', 'proj-001', NULL, '요구사항 분석', 1, 'COMPLETED', 'APPROVED', '2026-01-15', '2026-01-31', 100, 'AI 보험심사 처리에 대한 모든 요구사항 수집 및 분석', 'COMMON', NOW(), NOW()),
    ('phase-001-02', 'proj-001', NULL, '시스템 설계', 2, 'IN_PROGRESS', 'PENDING', '2026-02-01', '2026-02-28', 60, '시스템 아키텍처 및 데이터 모델 설계', 'COMMON', NOW(), NOW()),
    ('phase-001-03', 'proj-001', NULL, 'AI 모델 개발', 3, 'IN_PROGRESS', 'PENDING', '2025-01-02', '2025-12-31', 85, '문서 처리 및 사기 탐지를 위한 AI 모델 개발 및 훈련', 'AI', NOW(), NOW()),
    ('phase-001-04', 'proj-001', NULL, '백엔드 개발', 4, 'NOT_STARTED', NULL, '2026-03-15', '2026-05-15', 0, '백엔드 서비스 및 API 구현', 'SI', NOW(), NOW()),
    ('phase-001-05', 'proj-001', NULL, '통합 및 테스트', 5, 'NOT_STARTED', NULL, '2026-05-01', '2026-06-15', 0, '시스템 통합 및 종합 테스트', 'COMMON', NOW(), NOW()),
    ('phase-001-06', 'proj-001', NULL, '배포', 6, 'NOT_STARTED', NULL, '2026-06-15', '2026-06-30', 0, '운영 환경 배포 및 사용자 교육', 'COMMON', NOW(), NOW()),

    -- Project 2 Main Phases
    ('phase-002-01', 'proj-002', NULL, '시장 조사', 1, 'IN_PROGRESS', 'PENDING', '2026-02-01', '2026-02-28', 40, '시장 니즈 조사 및 상세 프로젝트 계획 수립', 'COMMON', NOW(), NOW()),
    ('phase-002-02', 'proj-002', NULL, 'UX/UI 디자인', 2, 'NOT_STARTED', NULL, '2026-03-01', '2026-03-31', 0, '모바일 앱 사용자 경험 및 인터페이스 디자인', 'COMMON', NOW(), NOW()),
    ('phase-002-03', 'proj-002', NULL, '모바일 앱 개발', 3, 'NOT_STARTED', NULL, '2026-04-01', '2026-06-15', 0, 'iOS 및 Android 애플리케이션 개발', 'SI', NOW(), NOW()),
    ('phase-002-04', 'proj-002', NULL, '백엔드 API', 4, 'NOT_STARTED', NULL, '2026-04-01', '2026-06-30', 0, '모바일 플랫폼을 위한 백엔드 API 구축', 'SI', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, progress = EXCLUDED.progress, status = EXCLUDED.status;

-- Child Phases under "AI 모델 개발" (phase-001-03)
INSERT INTO project.phases (id, project_id, parent_id, name, order_num, status, gate_status, start_date, end_date, progress, description, track_type, created_at, updated_at)
VALUES
    ('phase-001-03-01', 'proj-001', 'phase-001-03', '1단계: 업무 현황 진단/분석', 1, 'COMPLETED', 'APPROVED', '2025-01-02', '2025-02-15', 100, '지급심사 프로세스 현황 파악 및 AI 적용 타당성 검토', 'AI', NOW(), NOW()),
    ('phase-001-03-02', 'proj-001', 'phase-001-03', '2단계: 데이터 수집/정제', 2, 'COMPLETED', 'APPROVED', '2025-02-16', '2025-04-30', 100, '데이터 수집, 정제, 라벨링 및 피처 엔지니어링', 'AI', NOW(), NOW()),
    ('phase-001-03-03', 'proj-001', 'phase-001-03', '3단계: AI모델 설계/학습', 3, 'IN_PROGRESS', 'PENDING', '2025-05-01', '2025-08-31', 85, 'AI 모델 설계, 학습, 평가 및 하이브리드 로직 구축', 'AI', NOW(), NOW()),
    ('phase-001-03-04', 'proj-001', 'phase-001-03', '4단계: 업무시스템 연동/운영 자동화', 4, 'NOT_STARTED', NULL, '2025-09-01', '2025-10-31', 0, '기존 업무시스템과 AI 통합 및 MLOps 구축', 'AI', NOW(), NOW()),
    ('phase-001-03-05', 'proj-001', 'phase-001-03', '5단계: 효과 검증/운영고도화', 5, 'NOT_STARTED', NULL, '2025-11-01', '2025-11-30', 0, 'PoC 검증, 성능 평가 및 지속적 개선', 'AI', NOW(), NOW()),
    ('phase-001-03-06', 'proj-001', 'phase-001-03', '6단계: 조직/프로세스 변화관리', 6, 'NOT_STARTED', NULL, '2025-12-01', '2025-12-31', 0, '교육, 가이드라인, AI 거버넌스 체계 구축', 'AI', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, progress = EXCLUDED.progress, status = EXCLUDED.status;

-- ============================================
-- 4. KANBAN COLUMNS (task.kanban_columns)
-- ============================================
-- Project 1 Kanban Columns
INSERT INTO task.kanban_columns (id, project_id, name, order_num, wip_limit, color, created_at, updated_at)
VALUES
    ('col-001-01', 'proj-001', '백로그', 1, NULL, '#6B7280', NOW(), NOW()),
    ('col-001-02', 'proj-001', '할 일', 2, 10, '#3B82F6', NOW(), NOW()),
    ('col-001-03', 'proj-001', '진행 중', 3, 5, '#F59E0B', NOW(), NOW()),
    ('col-001-04', 'proj-001', '검토', 4, 3, '#8B5CF6', NOW(), NOW()),
    ('col-001-05', 'proj-001', '완료', 5, NULL, '#10B981', NOW(), NOW()),

    -- Project 2 Kanban Columns
    ('col-002-01', 'proj-002', '백로그', 1, NULL, '#6B7280', NOW(), NOW()),
    ('col-002-02', 'proj-002', '할 일', 2, 8, '#3B82F6', NOW(), NOW()),
    ('col-002-03', 'proj-002', '진행 중', 3, 4, '#F59E0B', NOW(), NOW()),
    ('col-002-04', 'proj-002', '검토', 4, 3, '#8B5CF6', NOW(), NOW()),
    ('col-002-05', 'proj-002', '완료', 5, NULL, '#10B981', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- ============================================
-- 5. TASKS (task.tasks)
-- ============================================
-- Project 1 Tasks
INSERT INTO task.tasks (id, project_id, column_id, phase_id, title, description, assignee_id, priority, status, due_date, order_num, tags, track_type, created_at, updated_at)
VALUES
    -- Completed tasks (in Done column)
    ('task-001-01', 'proj-001', 'col-001-05', 'phase-001-01', 'RFP 요구사항 문서화', 'RFP 문서의 모든 요구사항 분석 및 문서화', 'user-ba-001', 'HIGH', 'DONE', '2026-01-20', 1, 'requirements,documentation', 'COMMON', NOW(), NOW()),
    ('task-001-02', 'proj-001', 'col-001-05', 'phase-001-01', '이해관계자 인터뷰', '핵심 이해관계자 인터뷰를 통한 요구사항 수집', 'user-ba-001', 'HIGH', 'DONE', '2026-01-25', 2, 'requirements,stakeholder', 'COMMON', NOW(), NOW()),
    ('task-001-03', 'proj-001', 'col-001-05', 'phase-001-01', '요구사항 승인', '문서화된 요구사항에 대한 공식 승인 획득', 'user-pm-001', 'CRITICAL', 'DONE', '2026-01-31', 3, 'requirements,approval', 'COMMON', NOW(), NOW()),

    -- In Progress tasks
    ('task-001-04', 'proj-001', 'col-001-03', 'phase-001-02', '시스템 아키텍처 설계', '고수준 시스템 아키텍처 다이어그램 작성', 'user-dev-001', 'CRITICAL', 'IN_PROGRESS', '2026-02-15', 1, 'architecture,design', 'SI', NOW(), NOW()),
    ('task-001-05', 'proj-001', 'col-001-03', 'phase-001-02', '데이터 모델 설계', '데이터베이스 스키마 및 엔티티 관계 설계', 'user-dev-002', 'HIGH', 'IN_PROGRESS', '2026-02-20', 2, 'database,design', 'SI', NOW(), NOW()),

    -- Review tasks
    ('task-001-06', 'proj-001', 'col-001-04', 'phase-001-02', 'API 명세서 초안', '모든 엔드포인트에 대한 OpenAPI 명세서 작성', 'user-dev-001', 'HIGH', 'REVIEW', '2026-02-18', 1, 'api,documentation', 'SI', NOW(), NOW()),

    -- To Do tasks
    ('task-001-07', 'proj-001', 'col-001-02', 'phase-001-02', '보안 아키텍처 검토', '보안 조치 검토 및 문서화', 'user-dev-003', 'HIGH', 'TODO', '2026-02-25', 1, 'security,architecture', 'COMMON', NOW(), NOW()),
    ('task-001-08', 'proj-001', 'col-001-02', 'phase-001-03', 'ML 개발환경 구축', 'AI 모델 훈련을 위한 개발 환경 구성', 'user-dev-002', 'MEDIUM', 'TODO', '2026-03-05', 2, 'ai,setup', 'AI', NOW(), NOW()),

    -- Backlog tasks
    ('task-001-09', 'proj-001', 'col-001-01', 'phase-001-03', '문서 분류 모델 훈련', '문서 유형 분류를 위한 AI 모델 개발 및 훈련', 'user-dev-002', 'HIGH', 'TODO', '2026-03-20', 1, 'ai,ml,training', 'AI', NOW(), NOW()),
    ('task-001-10', 'proj-001', 'col-001-01', 'phase-001-03', '사기 탐지 알고리즘 구현', '과거 데이터를 활용한 사기 탐지 모델 개발', 'user-dev-002', 'CRITICAL', 'TODO', '2026-04-01', 2, 'ai,fraud,ml', 'AI', NOW(), NOW()),
    ('task-001-11', 'proj-001', 'col-001-01', 'phase-001-04', '보험청구 API 구현', '보험청구 관리를 위한 REST API 구축', 'user-dev-001', 'HIGH', 'TODO', '2026-04-15', 3, 'api,backend', 'SI', NOW(), NOW()),
    ('task-001-12', 'proj-001', 'col-001-01', 'phase-001-04', '문서 업로드 서비스 구현', '문서 업로드 및 처리 서비스 구축', 'user-dev-003', 'MEDIUM', 'TODO', '2026-04-20', 4, 'backend,files', 'SI', NOW(), NOW()),

    -- Project 2 Tasks
    -- In Progress
    ('task-002-01', 'proj-002', 'col-002-03', 'phase-002-01', '경쟁사 분석', '경쟁 모바일 보험 앱 분석', 'user-ba-001', 'HIGH', 'IN_PROGRESS', '2026-02-15', 1, 'research,competitor', 'COMMON', NOW(), NOW()),
    ('task-002-02', 'proj-002', 'col-002-03', 'phase-002-01', '사용자 페르소나 개발', '조사 기반 목표 사용자 페르소나 작성', 'user-ba-001', 'MEDIUM', 'IN_PROGRESS', '2026-02-20', 2, 'research,ux', 'COMMON', NOW(), NOW()),

    -- To Do
    ('task-002-03', 'proj-002', 'col-002-02', 'phase-002-01', '기능 우선순위 선정', 'MVP 출시를 위한 기능 우선순위 결정', 'user-pm-002', 'HIGH', 'TODO', '2026-02-25', 1, 'planning,mvp', 'COMMON', NOW(), NOW()),
    ('task-002-04', 'proj-002', 'col-002-02', 'phase-002-02', '와이어프레임 디자인', '주요 앱 화면 와이어프레임 작성', NULL, 'HIGH', 'TODO', '2026-03-10', 2, 'ux,design', 'COMMON', NOW(), NOW()),

    -- Backlog
    ('task-002-05', 'proj-002', 'col-002-01', 'phase-002-02', '비주얼 디자인 시스템', '종합 디자인 시스템 및 스타일 가이드 작성', NULL, 'MEDIUM', 'TODO', '2026-03-20', 1, 'design,ui', 'COMMON', NOW(), NOW()),
    ('task-002-06', 'proj-002', 'col-002-01', 'phase-002-03', 'iOS 앱 초기 설정', 'Swift로 iOS 프로젝트 설정', 'user-dev-001', 'MEDIUM', 'TODO', '2026-04-05', 2, 'ios,mobile', 'SI', NOW(), NOW()),
    ('task-002-07', 'proj-002', 'col-002-01', 'phase-002-03', 'Android 앱 초기 설정', 'Kotlin으로 Android 프로젝트 설정', 'user-dev-003', 'MEDIUM', 'TODO', '2026-04-05', 3, 'android,mobile', 'SI', NOW(), NOW()),
    ('task-002-08', 'proj-002', 'col-002-01', 'phase-002-04', '인증 API 구현', '사용자 인증 엔드포인트 구현', 'user-dev-001', 'CRITICAL', 'TODO', '2026-04-15', 4, 'api,auth,backend', 'SI', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;

-- ============================================
-- 5.1. SPRINTS (task.sprints) - For Lineage Tracking
-- ============================================
INSERT INTO task.sprints (id, project_id, name, goal, status, start_date, end_date, enable_wip_validation, conwip_limit, created_at, updated_at)
VALUES
    -- Project 1 Sprints (5 sprints)
    ('sprint-001-01', 'proj-001', '스프린트 1 - 기획', '요구사항 분석 및 설계 완료', 'COMPLETED', '2026-01-15', '2026-01-28', true, 15, NOW(), NOW()),
    ('sprint-001-02', 'proj-001', '스프린트 2 - 설계', '아키텍처 및 데이터 모델 설계', 'COMPLETED', '2026-01-29', '2026-02-11', true, 15, NOW(), NOW()),
    ('sprint-001-03', 'proj-001', '스프린트 3 - API 설계', 'RESTful API 명세 및 보안 설계', 'ACTIVE', '2026-02-12', '2026-02-25', true, 15, NOW(), NOW()),
    ('sprint-001-04', 'proj-001', '스프린트 4 - AI 모델 기초', 'OCR 데이터 수집 및 기초 모델 개발', 'PLANNED', '2026-03-01', '2026-03-14', true, 15, NOW(), NOW()),
    ('sprint-001-05', 'proj-001', '스프린트 5 - AI 모델 훈련', 'OCR/사기탐지 모델 훈련 및 검증', 'PLANNED', '2026-03-15', '2026-03-28', true, 15, NOW(), NOW()),

    -- Project 2 Sprints (3 sprints)
    ('sprint-002-01', 'proj-002', '스프린트 1 - 시장 조사', '시장 분석 및 사용자 리서치', 'ACTIVE', '2026-02-01', '2026-02-14', true, 12, NOW(), NOW()),
    ('sprint-002-02', 'proj-002', '스프린트 2 - UX 설계', 'UX 리서치 완료 및 와이어프레임', 'PLANNED', '2026-02-15', '2026-02-28', true, 12, NOW(), NOW()),
    ('sprint-002-03', 'proj-002', '스프린트 3 - UI 디자인', 'UI 디자인 및 프로토타입', 'PLANNED', '2026-03-01', '2026-03-14', true, 12, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, goal = EXCLUDED.goal, status = EXCLUDED.status, conwip_limit = EXCLUDED.conwip_limit;

-- ============================================
-- 5.2. USER STORIES (task.user_stories) - For Lineage Tracking
-- ============================================
INSERT INTO task.user_stories (id, project_id, title, description, priority, status, story_points, sprint_id, epic, created_at, updated_at)
VALUES
    -- Project 1 User Stories
    ('story-001-01', 'proj-001', 'OCR 문서 업로드', '보험심사 담당자로서, 스캔한 문서를 업로드하여 시스템이 자동으로 텍스트를 추출할 수 있게 하고 싶습니다', 'CRITICAL', 'COMPLETED', 8, 'sprint-001-01', '문서 처리', NOW(), NOW()),
    ('story-001-02', 'proj-001', '사기 탐지 대시보드', '사기 분석가로서, 사기 위험 점수를 확인하여 조사 우선순위를 정할 수 있게 하고 싶습니다', 'CRITICAL', 'IN_PROGRESS', 13, 'sprint-001-02', '사기 탐지', NOW(), NOW()),
    ('story-001-03', 'proj-001', '보험청구 API 연동', '개발자로서, RESTful API를 통해 외부 시스템이 보험청구 관리 시스템과 연동할 수 있게 하고 싶습니다', 'HIGH', 'SELECTED', 8, 'sprint-001-02', 'API 개발', NOW(), NOW()),
    ('story-001-04', 'proj-001', '데이터 암호화 구현', '보안 담당자로서, 모든 개인정보가 암호화되어 규정을 준수할 수 있게 하고 싶습니다', 'CRITICAL', 'BACKLOG', 5, NULL, '보안', NOW(), NOW()),
    -- Project 2 User Stories
    ('story-002-01', 'proj-002', '사용자 리서치 분석', '제품 오너로서, 사용자 리서치 인사이트를 확보하여 더 나은 UX를 설계하고 싶습니다', 'HIGH', 'IN_PROGRESS', 5, 'sprint-002-01', '리서치', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, epic = EXCLUDED.epic;

-- ============================================
-- 5.3. USER STORY - REQUIREMENT LINKS (For Lineage Edges)
-- ============================================
INSERT INTO task.user_story_requirement_links (user_story_id, requirement_id)
VALUES
    ('story-001-01', 'req-001-01'),  -- OCR Story linked to OCR Requirement
    ('story-001-02', 'req-001-02'),  -- Fraud Story linked to Fraud Requirement
    ('story-001-03', 'req-001-03'),  -- API Story linked to Claims API Requirement
    ('story-001-04', 'req-001-05')   -- Encryption Story linked to Security Requirement
ON CONFLICT DO NOTHING;

-- ============================================
-- 5.4. UPDATE TASKS with user_story_id (For Lineage Edges)
-- ============================================
UPDATE task.tasks SET user_story_id = 'story-001-01' WHERE id IN ('task-001-01', 'task-001-02');
UPDATE task.tasks SET user_story_id = 'story-001-02' WHERE id IN ('task-001-04', 'task-001-05');
UPDATE task.tasks SET user_story_id = 'story-001-03' WHERE id IN ('task-001-06', 'task-001-11');

-- ============================================
-- 5.5. REQUIREMENT - TASK LINKS (For Lineage Edges)
-- ============================================
INSERT INTO project.requirement_task_links (requirement_id, task_id)
VALUES
    ('req-001-01', 'task-001-01'),
    ('req-001-01', 'task-001-02'),
    ('req-001-02', 'task-001-09'),
    ('req-001-02', 'task-001-10'),
    ('req-001-03', 'task-001-11')
ON CONFLICT DO NOTHING;

-- ============================================
-- 6. RFPS (rfp.rfps) - Sample RFP Documents
-- ============================================
INSERT INTO rfp.rfps (id, project_id, title, content, status, processing_status, tenant_id, created_at, updated_at, created_by)
VALUES
    ('rfp-001', 'proj-001', 'AI 보험심사 처리 시스템 RFP',
     'AI 기반 보험 청구 처리 시스템 개발을 위한 제안요청서. 주요 요구사항: 자동 문서 분석, 사기 탐지 기능, 기존 시스템과의 연동, 보험 규정 준수.',
     'APPROVED', 'COMPLETED', 'tenant-001', NOW(), NOW(), 'user-sponsor-001'),
    ('rfp-002', 'proj-002', '모바일 보험 플랫폼 RFP',
     '보험 서비스를 위한 종합 모바일 플랫폼 구축 제안요청서. 필수 포함사항: 보험증권 관리, 청구 제출, 실시간 알림, 보안 인증, 오프라인 기능.',
     'SUBMITTED', 'PENDING', 'tenant-001', NOW(), NOW(), 'user-sponsor-001')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content;

-- ============================================
-- 7. REQUIREMENTS (rfp.requirements)
-- ============================================
-- Project 1 Requirements
INSERT INTO rfp.requirements (id, rfp_id, project_id, requirement_code, title, description, category, priority, status, progress, tenant_id, created_at, updated_at)
VALUES
    ('req-001-01', 'rfp-001', 'proj-001', 'REQ-AI-001', '문서 OCR 처리', '시스템은 스캔된 보험 문서에서 99% 정확도로 텍스트를 추출할 수 있어야 함', 'AI', 'CRITICAL', 'APPROVED', 60, 'tenant-001', NOW(), NOW()),
    ('req-001-02', 'rfp-001', 'proj-001', 'REQ-AI-002', '사기 탐지 알고리즘', '설정 가능한 민감도 임계값을 가진 ML 기반 사기 탐지 구현', 'AI', 'CRITICAL', 'ANALYZED', 30, 'tenant-001', NOW(), NOW()),
    ('req-001-03', 'rfp-001', 'proj-001', 'REQ-SI-001', '보험청구 관리 API', '보험청구 전체 생명주기 관리를 위한 RESTful API', 'FUNCTIONAL', 'HIGH', 'IDENTIFIED', 0, 'tenant-001', NOW(), NOW()),
    ('req-001-04', 'rfp-001', 'proj-001', 'REQ-SI-002', '레거시 시스템 연동', 'ESB를 통한 기존 보험증권 관리 시스템과의 연동', 'INTEGRATION', 'HIGH', 'IDENTIFIED', 0, 'tenant-001', NOW(), NOW()),
    ('req-001-05', 'rfp-001', 'proj-001', 'REQ-SEC-001', '데이터 암호화', '모든 개인정보는 AES-256을 사용하여 저장 및 전송 시 암호화되어야 함', 'SECURITY', 'CRITICAL', 'APPROVED', 0, 'tenant-001', NOW(), NOW()),
    ('req-001-06', 'rfp-001', 'proj-001', 'REQ-NF-001', '성능 요구사항', '시스템은 2초 미만의 응답 시간으로 1000명의 동시 사용자를 처리할 수 있어야 함', 'NON_FUNCTIONAL', 'HIGH', 'ANALYZED', 0, 'tenant-001', NOW(), NOW()),

    -- Project 2 Requirements
    ('req-002-01', 'rfp-002', 'proj-002', 'REQ-MOB-001', '사용자 인증', '모바일 앱을 위한 생체인식 및 비밀번호 기반 인증', 'SECURITY', 'CRITICAL', 'IDENTIFIED', 0, 'tenant-001', NOW(), NOW()),
    ('req-002-02', 'rfp-002', 'proj-002', 'REQ-MOB-002', '보험증권 대시보드', '대시보드에 모든 사용자 보험증권과 주요 정보 표시', 'FUNCTIONAL', 'HIGH', 'IDENTIFIED', 0, 'tenant-001', NOW(), NOW()),
    ('req-002-03', 'rfp-002', 'proj-002', 'REQ-MOB-003', '청구 제출', '사용자가 모바일에서 사진 업로드와 함께 청구를 제출할 수 있도록 허용', 'FUNCTIONAL', 'CRITICAL', 'IDENTIFIED', 0, 'tenant-001', NOW(), NOW()),
    ('req-002-04', 'rfp-002', 'proj-002', 'REQ-MOB-004', '푸시 알림', '청구 상태 업데이트를 위한 실시간 알림', 'FUNCTIONAL', 'MEDIUM', 'IDENTIFIED', 0, 'tenant-001', NOW(), NOW()),
    ('req-002-05', 'rfp-002', 'proj-002', 'REQ-MOB-005', '오프라인 모드', '앱은 오프라인에서 작동하고 연결 시 데이터 동기화 가능해야 함', 'NON_FUNCTIONAL', 'MEDIUM', 'IDENTIFIED', 0, 'tenant-001', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description;

-- ============================================
-- 8. PARTS (project.parts)
-- ============================================
INSERT INTO project.parts (id, project_id, name, description, leader_id, leader_name, status, start_date, end_date, progress, created_at, updated_at)
VALUES
    -- Project 1 Parts (4 parts: AI, SI, Common, QA)
    ('part-001-ai', 'proj-001', 'AI 개발 파트', 'AI/ML 모델 개발 및 OCR, 사기탐지 시스템 구현', 'user-dev-002', '박민수', 'ACTIVE', '2026-01-15', '2026-06-30', 45, NOW(), NOW()),
    ('part-001-si', 'proj-001', 'SI 개발 파트', '백엔드 API 및 레거시 시스템 연동 개발', 'user-dev-001', '김철수', 'ACTIVE', '2026-02-01', '2026-06-30', 67, NOW(), NOW()),
    ('part-001-common', 'proj-001', '공통 파트', '보안, 인프라, 테스트 자동화 및 품질 관리', 'user-dev-003', '한지영', 'ACTIVE', '2026-01-15', '2026-06-30', 35, NOW(), NOW()),
    ('part-001-qa', 'proj-001', 'QA 파트', '테스트 계획, 테스트 케이스 설계 및 품질 보증', 'user-qa-001', '최지훈', 'ACTIVE', '2026-02-15', '2026-06-30', 20, NOW(), NOW()),

    -- Project 2 Parts (2 parts: UX/UI, Mobile)
    ('part-002-ux', 'proj-002', 'UX/UI 파트', '모바일 앱 UX 설계 및 UI 디자인', 'user-ba-001', '이영희', 'ACTIVE', '2026-02-01', '2026-04-30', 25, NOW(), NOW()),
    ('part-002-mobile', 'proj-002', '모바일 개발 파트', 'iOS/Android 네이티브 앱 개발', 'user-dev-001', '김철수', 'ACTIVE', '2026-03-01', '2026-06-30', 0, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, progress = EXCLUDED.progress, leader_name = EXCLUDED.leader_name;

-- ============================================
-- 9. PART MEMBERS (project.part_members)
-- ============================================
INSERT INTO project.part_members (part_id, user_id)
VALUES
    -- AI Part Members (part-001-ai) - 4 members
    ('part-001-ai', 'user-dev-002'),  -- Leader: Park Minsu
    ('part-001-ai', 'user-ba-001'),   -- Member: Lee Younghee
    ('part-001-ai', 'user-dev-004'),  -- Member: Jung Sumin
    ('part-001-ai', 'user-dev-005'),  -- Member: Oh Minseok

    -- SI Part Members (part-001-si) - 3 members
    ('part-001-si', 'user-dev-001'),  -- Leader: Kim Cheolsu
    ('part-001-si', 'user-dev-006'),  -- Member: Kang Minho
    ('part-001-si', 'user-dev-007'),  -- Member: Yoon Seoyeon

    -- Common Part Members (part-001-common) - 3 members
    ('part-001-common', 'user-dev-003'),  -- Leader: Han Jiyoung
    ('part-001-common', 'user-dev-008'),  -- Member: Im Jaehyun
    ('part-001-common', 'user-dev-009'),  -- Member: Song Yuna

    -- QA Part Members (part-001-qa) - 2 members
    ('part-001-qa', 'user-qa-001'),   -- Leader: Choi Jihoon
    ('part-001-qa', 'user-qa-002'),   -- Member: Bae Jiwon

    -- UX Part Members (part-002-ux) - 2 members
    ('part-002-ux', 'user-ba-001'),   -- Leader: Lee Younghee
    ('part-002-ux', 'user-ux-001'),   -- Member: Kim Daeun

    -- Mobile Part Members (part-002-mobile) - 3 members
    ('part-002-mobile', 'user-dev-001'),    -- Leader: Kim Cheolsu
    ('part-002-mobile', 'user-ios-001'),    -- Member: Hong Gildong
    ('part-002-mobile', 'user-android-001') -- Member: Lee Sunsin
ON CONFLICT DO NOTHING;

-- ============================================
-- 10. PROJECT MEMBERS (project.project_members)
-- ============================================
INSERT INTO project.project_members (id, project_id, user_id, role, active, created_at, updated_at)
VALUES
    -- Project 1 Members
    ('pm-001-01', 'proj-001', 'user-sponsor-001', 'SPONSOR', true, NOW(), NOW()),
    ('pm-001-02', 'proj-001', 'user-pm-001', 'PM', true, NOW(), NOW()),
    ('pm-001-03', 'proj-001', 'user-pmo-001', 'PMO_HEAD', true, NOW(), NOW()),
    ('pm-001-04', 'proj-001', 'user-dev-001', 'DEVELOPER', true, NOW(), NOW()),
    ('pm-001-05', 'proj-001', 'user-dev-002', 'DEVELOPER', true, NOW(), NOW()),
    ('pm-001-06', 'proj-001', 'user-dev-003', 'DEVELOPER', true, NOW(), NOW()),
    ('pm-001-07', 'proj-001', 'user-qa-001', 'QA', true, NOW(), NOW()),
    ('pm-001-08', 'proj-001', 'user-ba-001', 'BUSINESS_ANALYST', true, NOW(), NOW()),

    -- Project 2 Members
    ('pm-002-01', 'proj-002', 'user-sponsor-001', 'SPONSOR', true, NOW(), NOW()),
    ('pm-002-02', 'proj-002', 'user-pm-002', 'PM', true, NOW(), NOW()),
    ('pm-002-03', 'proj-002', 'user-dev-001', 'DEVELOPER', true, NOW(), NOW()),
    ('pm-002-04', 'proj-002', 'user-dev-003', 'DEVELOPER', true, NOW(), NOW()),
    ('pm-002-05', 'proj-002', 'user-ba-001', 'BUSINESS_ANALYST', true, NOW(), NOW()),
    ('pm-002-06', 'proj-002', 'user-admin-001', 'AUDITOR', true, NOW(), NOW()),

    -- Frontend Demo Users as Project Members (Project 1)
    ('pm-demo-001', 'proj-001', 'U001', 'SPONSOR', true, NOW(), NOW()),
    ('pm-demo-002', 'proj-001', 'U002', 'PMO_HEAD', true, NOW(), NOW()),
    ('pm-demo-003', 'proj-001', 'U003', 'PM', true, NOW(), NOW()),
    ('pm-demo-004', 'proj-001', 'U004', 'DEVELOPER', true, NOW(), NOW()),
    ('pm-demo-005', 'proj-001', 'U005', 'QA', true, NOW(), NOW()),
    ('pm-demo-006', 'proj-001', 'U006', 'BUSINESS_ANALYST', true, NOW(), NOW()),
    ('pm-demo-007', 'proj-001', 'U007', 'AUDITOR', true, NOW(), NOW()),
    ('pm-demo-008', 'proj-001', 'U008', 'AUDITOR', true, NOW(), NOW()),

    -- Frontend Demo Users as Project Members (Project 2)
    ('pm-demo-009', 'proj-002', 'U002', 'PMO_HEAD', true, NOW(), NOW()),
    ('pm-demo-010', 'proj-002', 'U003', 'PM', true, NOW(), NOW()),
    ('pm-demo-011', 'proj-002', 'U004', 'DEVELOPER', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 11. OUTBOX EVENTS (lineage.outbox_events)
-- ============================================
INSERT INTO lineage.outbox_events (id, event_type, aggregate_type, aggregate_id, project_id, payload, status, created_at)
VALUES
    -- Published events (already synced to Neo4j)
    ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'REQUIREMENT_CREATED', 'Requirement', 'req-001-01', 'proj-001',
     '{"id":"req-001-01","code":"REQ-AI-001","title":"OCR Document Processing","category":"AI","priority":"CRITICAL"}',
     'PUBLISHED', '2026-01-20 10:00:00'),
    ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'REQUIREMENT_CREATED', 'Requirement', 'req-001-02', 'proj-001',
     '{"id":"req-001-02","code":"REQ-AI-002","title":"Fraud Detection Algorithm","category":"AI","priority":"CRITICAL"}',
     'PUBLISHED', '2026-01-20 10:05:00'),
    ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'USER_STORY_CREATED', 'UserStory', 'story-001-01', 'proj-001',
     '{"id":"story-001-01","title":"OCR Document Upload","epic":"Document Processing","storyPoints":8}',
     'PUBLISHED', '2026-01-21 09:00:00'),
    ('d4e5f6a7-b8c9-0123-def0-234567890123', 'STORY_REQUIREMENT_LINKED', 'Relationship', 'story-001-01:req-001-01', 'proj-001',
     '{"storyId":"story-001-01","requirementId":"req-001-01","linkType":"implements"}',
     'PUBLISHED', '2026-01-21 09:30:00'),

    -- Pending events (waiting to be synced)
    ('e5f6a7b8-c9d0-1234-ef01-345678901234', 'TASK_CREATED', 'Task', 'task-001-04', 'proj-001',
     '{"id":"task-001-04","title":"System Architecture Design","status":"IN_PROGRESS","assigneeId":"user-dev-001"}',
     'PENDING', NOW()),
    ('f6a7b8c9-d0e1-2345-f012-456789012345', 'TASK_STATUS_CHANGED', 'Task', 'task-001-01', 'proj-001',
     '{"taskId":"task-001-01","oldStatus":"IN_PROGRESS","newStatus":"DONE"}',
     'PENDING', NOW()),

    -- Project 2 events
    ('a7b8c9d0-e1f2-3456-0123-567890123456', 'REQUIREMENT_CREATED', 'Requirement', 'req-002-01', 'proj-002',
     '{"id":"req-002-01","code":"REQ-MOB-001","title":"User Authentication","category":"SECURITY","priority":"CRITICAL"}',
     'PENDING', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 12. EPICS (project.epics)
-- ============================================
INSERT INTO project.epics (id, project_id, name, description, goal, priority, status, owner_id, created_at, updated_at)
VALUES
    -- Project 1 Epics
    ('epic-001-01', 'proj-001', '문서 처리 자동화', 'AI 기반 보험 문서 자동 분류 및 데이터 추출', '문서 처리 시간 80% 단축', 'CRITICAL', 'IN_PROGRESS', 'user-dev-002', NOW(), NOW()),
    ('epic-001-02', 'proj-001', '사기 탐지 시스템', '머신러닝 기반 보험 사기 탐지 알고리즘 개발', '사기 탐지율 95% 달성', 'CRITICAL', 'BACKLOG', 'user-dev-002', NOW(), NOW()),
    ('epic-001-03', 'proj-001', 'API 플랫폼 구축', 'RESTful API 기반 외부 시스템 연동 플랫폼', '10개 이상 외부 시스템 연동', 'HIGH', 'BACKLOG', 'user-dev-001', NOW(), NOW()),
    ('epic-001-04', 'proj-001', '보안 및 규정 준수', '데이터 암호화 및 보험업 규정 준수 체계', '금융감독원 보안 감사 통과', 'HIGH', 'BACKLOG', 'user-dev-003', NOW(), NOW()),

    -- Project 2 Epics
    ('epic-002-01', 'proj-002', '모바일 UX 혁신', '사용자 중심의 모바일 앱 UX 설계', '앱 평점 4.5 이상 달성', 'HIGH', 'IN_PROGRESS', 'user-ba-001', NOW(), NOW()),
    ('epic-002-02', 'proj-002', '실시간 알림 시스템', '푸시 알림 및 SMS 연동 시스템', '알림 도달률 99% 달성', 'MEDIUM', 'BACKLOG', 'user-dev-003', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- ============================================
-- 13. FEATURES (project.features)
-- ============================================
INSERT INTO project.features (id, epic_id, project_id, name, description, priority, status, created_at, updated_at)
VALUES
    -- Document Processing Features
    ('feat-001-01', 'epic-001-01', 'proj-001', 'OCR 엔진 통합', '문서 스캔 및 텍스트 추출 엔진 구현', 'CRITICAL', 'IN_PROGRESS', NOW(), NOW()),
    ('feat-001-02', 'epic-001-01', 'proj-001', '문서 분류 AI', '문서 유형 자동 분류 모델', 'HIGH', 'BACKLOG', NOW(), NOW()),
    ('feat-001-03', 'epic-001-01', 'proj-001', '데이터 추출 파이프라인', '정형 데이터 추출 및 검증 파이프라인', 'HIGH', 'BACKLOG', NOW(), NOW()),

    -- Fraud Detection Features
    ('feat-001-04', 'epic-001-02', 'proj-001', '사기 패턴 분석', '과거 사기 사례 패턴 학습', 'CRITICAL', 'BACKLOG', NOW(), NOW()),
    ('feat-001-05', 'epic-001-02', 'proj-001', '실시간 스코어링', '청구 건별 사기 위험 점수 산출', 'HIGH', 'BACKLOG', NOW(), NOW()),

    -- API Platform Features
    ('feat-001-06', 'epic-001-03', 'proj-001', 'API Gateway', 'API 게이트웨이 및 인증 시스템', 'HIGH', 'BACKLOG', NOW(), NOW()),
    ('feat-001-07', 'epic-001-03', 'proj-001', '레거시 연동', '기존 보험증권 시스템 ESB 연동', 'HIGH', 'BACKLOG', NOW(), NOW()),

    -- Mobile UX Features
    ('feat-002-01', 'epic-002-01', 'proj-002', '홈 대시보드', '보험증권 요약 및 주요 정보 표시', 'HIGH', 'IN_PROGRESS', NOW(), NOW()),
    ('feat-002-02', 'epic-002-01', 'proj-002', '청구 제출 위저드', '단계별 청구 제출 가이드', 'HIGH', 'BACKLOG', NOW(), NOW()),
    ('feat-002-03', 'epic-002-01', 'proj-002', '생체인증 로그인', '지문/Face ID 기반 로그인', 'CRITICAL', 'BACKLOG', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- ============================================
-- 14. WBS GROUPS (project.wbs_groups)
-- ============================================
INSERT INTO project.wbs_groups (id, project_id, phase_id, name, description, order_num, created_at, updated_at)
VALUES
    -- Project 1, Phase 1: Requirements Analysis
    ('wbs-grp-001-01', 'proj-001', 'phase-001-01', '요구사항 수집', 'RFP 분석 및 이해관계자 요구사항 수집', 1, NOW(), NOW()),
    ('wbs-grp-001-02', 'proj-001', 'phase-001-01', '요구사항 분석', '수집된 요구사항 분석 및 문서화', 2, NOW(), NOW()),

    -- Project 1, Phase 2: System Design
    ('wbs-grp-001-03', 'proj-001', 'phase-001-02', '아키텍처 설계', '시스템 아키텍처 및 기술 스택 설계', 1, NOW(), NOW()),
    ('wbs-grp-001-04', 'proj-001', 'phase-001-02', '데이터 모델링', '데이터베이스 스키마 및 엔티티 설계', 2, NOW(), NOW()),
    ('wbs-grp-001-05', 'proj-001', 'phase-001-02', 'API 설계', 'RESTful API 인터페이스 설계', 3, NOW(), NOW()),

    -- Project 1, Phase 3: AI Development
    ('wbs-grp-001-06', 'proj-001', 'phase-001-03', 'OCR 모델 개발', '문서 인식을 위한 OCR 모델 개발', 1, NOW(), NOW()),
    ('wbs-grp-001-07', 'proj-001', 'phase-001-03', '문서 분류 AI', '문서 유형 분류 AI 모델 개발', 2, NOW(), NOW()),
    ('wbs-grp-001-08', 'proj-001', 'phase-001-03', '사기 탐지 모델', '사기 탐지 ML 모델 개발', 3, NOW(), NOW()),

    -- Project 1, Phase 4: Backend Development
    ('wbs-grp-001-09', 'proj-001', 'phase-001-04', '청구 관리 API', '보험청구 관리 REST API 개발', 1, NOW(), NOW()),
    ('wbs-grp-001-10', 'proj-001', 'phase-001-04', '문서 처리 서비스', '문서 업로드 및 처리 서비스 개발', 2, NOW(), NOW()),
    ('wbs-grp-001-11', 'proj-001', 'phase-001-04', '레거시 연동', '기존 시스템 ESB 연동 개발', 3, NOW(), NOW()),

    -- Project 2 WBS Groups
    ('wbs-grp-002-01', 'proj-002', 'phase-002-01', '시장 조사', '경쟁사 분석 및 시장 니즈 조사', 1, NOW(), NOW()),
    ('wbs-grp-002-02', 'proj-002', 'phase-002-02', 'UI/UX 설계', '모바일 앱 인터페이스 설계', 1, NOW(), NOW()),
    ('wbs-grp-002-03', 'proj-002', 'phase-002-03', '앱 개발', 'iOS/Android 앱 개발', 1, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- ============================================
-- 15. WBS ITEMS (project.wbs_items)
-- ============================================
INSERT INTO project.wbs_items (id, group_id, phase_id, code, name, description, order_num, status, planned_start_date, planned_end_date, actual_start_date, actual_end_date, progress, weight, track_type, created_at, updated_at)
VALUES
    -- Requirements Analysis Items
    ('wbs-item-001', 'wbs-grp-001-01', 'phase-001-01', 'WBS-1.1.1', 'RFP 문서 분석', 'RFP 문서 상세 분석 및 요구사항 도출', 1, 'COMPLETED', '2026-01-15', '2026-01-18', '2026-01-15', '2026-01-17', 100, 1.0, 'COMMON', NOW(), NOW()),
    ('wbs-item-002', 'wbs-grp-001-01', 'phase-001-01', 'WBS-1.1.2', '이해관계자 인터뷰', '핵심 이해관계자 인터뷰 진행', 2, 'COMPLETED', '2026-01-18', '2026-01-25', '2026-01-18', '2026-01-24', 100, 1.5, 'COMMON', NOW(), NOW()),
    ('wbs-item-003', 'wbs-grp-001-02', 'phase-001-01', 'WBS-1.2.1', '요구사항 명세서 작성', '상세 요구사항 명세서(SRS) 작성', 1, 'COMPLETED', '2026-01-25', '2026-01-31', '2026-01-24', '2026-01-30', 100, 2.0, 'COMMON', NOW(), NOW()),

    -- System Design Items
    ('wbs-item-004', 'wbs-grp-001-03', 'phase-001-02', 'WBS-2.1.1', '고수준 아키텍처 설계', '시스템 전체 아키텍처 다이어그램 작성', 1, 'COMPLETED', '2026-02-01', '2026-02-07', '2026-02-01', '2026-02-06', 100, 1.5, 'COMMON', NOW(), NOW()),
    ('wbs-item-005', 'wbs-grp-001-03', 'phase-001-02', 'WBS-2.1.2', '기술 스택 선정', '프레임워크 및 도구 선정', 2, 'COMPLETED', '2026-02-07', '2026-02-10', '2026-02-06', '2026-02-09', 100, 1.0, 'COMMON', NOW(), NOW()),
    ('wbs-item-006', 'wbs-grp-001-04', 'phase-001-02', 'WBS-2.2.1', 'ERD 설계', '데이터베이스 ERD 설계', 1, 'IN_PROGRESS', '2026-02-10', '2026-02-15', '2026-02-10', NULL, 70, 1.5, 'SI', NOW(), NOW()),
    ('wbs-item-007', 'wbs-grp-001-04', 'phase-001-02', 'WBS-2.2.2', 'Neo4j 그래프 모델', '그래프 데이터베이스 모델 설계', 2, 'IN_PROGRESS', '2026-02-12', '2026-02-18', '2026-02-12', NULL, 50, 1.0, 'AI', NOW(), NOW()),
    ('wbs-item-008', 'wbs-grp-001-05', 'phase-001-02', 'WBS-2.3.1', 'API 명세서 작성', 'OpenAPI 3.0 명세서 작성', 1, 'IN_PROGRESS', '2026-02-15', '2026-02-25', '2026-02-15', NULL, 40, 2.0, 'SI', NOW(), NOW()),

    -- AI Development Items
    ('wbs-item-009', 'wbs-grp-001-06', 'phase-001-03', 'WBS-3.1.1', 'OCR 모델 훈련', '문서 인식 OCR 모델 훈련', 1, 'NOT_STARTED', '2026-03-01', '2026-03-15', NULL, NULL, 0, 3.0, 'AI', NOW(), NOW()),
    ('wbs-item-010', 'wbs-grp-001-07', 'phase-001-03', 'WBS-3.2.1', '분류 모델 개발', '문서 유형 분류 모델 개발', 1, 'NOT_STARTED', '2026-03-10', '2026-03-25', NULL, NULL, 0, 2.5, 'AI', NOW(), NOW()),
    ('wbs-item-011', 'wbs-grp-001-08', 'phase-001-03', 'WBS-3.3.1', '사기 탐지 알고리즘', '사기 패턴 탐지 ML 알고리즘', 1, 'NOT_STARTED', '2026-03-20', '2026-04-10', NULL, NULL, 0, 3.0, 'AI', NOW(), NOW()),

    -- Backend Development Items
    ('wbs-item-012', 'wbs-grp-001-09', 'phase-001-04', 'WBS-4.1.1', '청구 CRUD API', '보험청구 기본 CRUD API 구현', 1, 'NOT_STARTED', '2026-03-15', '2026-03-30', NULL, NULL, 0, 2.0, 'SI', NOW(), NOW()),
    ('wbs-item-013', 'wbs-grp-001-10', 'phase-001-04', 'WBS-4.2.1', '파일 업로드 서비스', '문서 파일 업로드/저장 서비스', 1, 'NOT_STARTED', '2026-04-01', '2026-04-15', NULL, NULL, 0, 1.5, 'SI', NOW(), NOW()),

    -- Project 2 WBS Items
    ('wbs-item-014', 'wbs-grp-002-01', 'phase-002-01', 'WBS-P2-1.1', '경쟁사 앱 분석', '주요 경쟁사 모바일 앱 분석', 1, 'IN_PROGRESS', '2026-02-01', '2026-02-15', '2026-02-01', NULL, 60, 1.5, 'COMMON', NOW(), NOW()),
    ('wbs-item-015', 'wbs-grp-002-01', 'phase-002-01', 'WBS-P2-1.2', '사용자 조사', '목표 사용자 그룹 설문 및 인터뷰', 2, 'IN_PROGRESS', '2026-02-10', '2026-02-25', '2026-02-10', NULL, 30, 2.0, 'COMMON', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, progress = EXCLUDED.progress;

-- ============================================
-- 16. WBS TASKS (project.wbs_tasks)
-- ============================================
INSERT INTO project.wbs_tasks (id, item_id, group_id, phase_id, code, name, description, order_num, status, planned_start_date, planned_end_date, actual_start_date, actual_end_date, progress, weight, linked_task_id, created_at, updated_at)
VALUES
    -- Requirements Analysis WBS Tasks
    ('wbs-task-001', 'wbs-item-001', 'wbs-grp-001-01', 'phase-001-01', 'T-1.1.1.1', 'RFP 핵심 요구사항 추출', 'RFP에서 핵심 요구사항 항목 추출', 1, 'COMPLETED', '2026-01-15', '2026-01-16', '2026-01-15', '2026-01-16', 100, 0.5, 'task-001-01', NOW(), NOW()),
    ('wbs-task-002', 'wbs-item-001', 'wbs-grp-001-01', 'phase-001-01', 'T-1.1.1.2', '기능/비기능 요구사항 분류', '요구사항을 기능/비기능으로 분류', 2, 'COMPLETED', '2026-01-16', '2026-01-17', '2026-01-16', '2026-01-17', 100, 0.5, NULL, NOW(), NOW()),
    ('wbs-task-003', 'wbs-item-002', 'wbs-grp-001-01', 'phase-001-01', 'T-1.1.2.1', '이해관계자 목록 작성', '인터뷰 대상 이해관계자 식별', 1, 'COMPLETED', '2026-01-18', '2026-01-19', '2026-01-18', '2026-01-19', 100, 0.3, NULL, NOW(), NOW()),
    ('wbs-task-004', 'wbs-item-002', 'wbs-grp-001-01', 'phase-001-01', 'T-1.1.2.2', '인터뷰 진행', '이해관계자 인터뷰 실시', 2, 'COMPLETED', '2026-01-19', '2026-01-24', '2026-01-19', '2026-01-23', 100, 0.7, 'task-001-02', NOW(), NOW()),

    -- System Design WBS Tasks
    ('wbs-task-005', 'wbs-item-004', 'wbs-grp-001-03', 'phase-001-02', 'T-2.1.1.1', '컴포넌트 다이어그램 작성', '시스템 컴포넌트 다이어그램', 1, 'COMPLETED', '2026-02-01', '2026-02-03', '2026-02-01', '2026-02-03', 100, 0.5, NULL, NOW(), NOW()),
    ('wbs-task-006', 'wbs-item-004', 'wbs-grp-001-03', 'phase-001-02', 'T-2.1.1.2', '배포 아키텍처 설계', 'Docker/K8s 배포 구조 설계', 2, 'COMPLETED', '2026-02-03', '2026-02-06', '2026-02-03', '2026-02-06', 100, 0.5, NULL, NOW(), NOW()),
    ('wbs-task-007', 'wbs-item-006', 'wbs-grp-001-04', 'phase-001-02', 'T-2.2.1.1', 'PostgreSQL ERD 설계', '관계형 DB 스키마 설계', 1, 'IN_PROGRESS', '2026-02-10', '2026-02-13', '2026-02-10', NULL, 80, 0.5, 'task-001-05', NOW(), NOW()),
    ('wbs-task-008', 'wbs-item-006', 'wbs-grp-001-04', 'phase-001-02', 'T-2.2.1.2', '테이블 정규화', '3NF 정규화 및 검증', 2, 'IN_PROGRESS', '2026-02-13', '2026-02-15', '2026-02-13', NULL, 50, 0.5, NULL, NOW(), NOW()),
    ('wbs-task-009', 'wbs-item-007', 'wbs-grp-001-04', 'phase-001-02', 'T-2.2.2.1', 'Neo4j 노드 설계', '그래프 노드 및 레이블 설계', 1, 'IN_PROGRESS', '2026-02-12', '2026-02-15', '2026-02-12', NULL, 60, 0.5, NULL, NOW(), NOW()),
    ('wbs-task-010', 'wbs-item-008', 'wbs-grp-001-05', 'phase-001-02', 'T-2.3.1.1', 'OpenAPI 스키마 정의', 'API 스키마 및 응답 모델 정의', 1, 'IN_PROGRESS', '2026-02-15', '2026-02-20', '2026-02-15', NULL, 40, 1.0, 'task-001-06', NOW(), NOW()),

    -- AI Development WBS Tasks
    ('wbs-task-011', 'wbs-item-009', 'wbs-grp-001-06', 'phase-001-03', 'T-3.1.1.1', '학습 데이터 수집', 'OCR 훈련용 문서 데이터 수집', 1, 'NOT_STARTED', '2026-03-01', '2026-03-05', NULL, NULL, 0, 1.0, NULL, NOW(), NOW()),
    ('wbs-task-012', 'wbs-item-009', 'wbs-grp-001-06', 'phase-001-03', 'T-3.1.1.2', '데이터 전처리', '이미지 정규화 및 라벨링', 2, 'NOT_STARTED', '2026-03-05', '2026-03-10', NULL, NULL, 0, 1.0, NULL, NOW(), NOW()),
    ('wbs-task-013', 'wbs-item-009', 'wbs-grp-001-06', 'phase-001-03', 'T-3.1.1.3', '모델 훈련 및 튜닝', 'OCR 모델 훈련 및 하이퍼파라미터 튜닝', 3, 'NOT_STARTED', '2026-03-10', '2026-03-15', NULL, NULL, 0, 1.0, 'task-001-09', NOW(), NOW()),

    -- Project 2 WBS Tasks
    ('wbs-task-014', 'wbs-item-014', 'wbs-grp-002-01', 'phase-002-01', 'T-P2-1.1.1', '경쟁 앱 기능 매트릭스', '경쟁사 앱 기능 비교 분석표 작성', 1, 'IN_PROGRESS', '2026-02-01', '2026-02-08', '2026-02-01', NULL, 70, 0.7, 'task-002-01', NOW(), NOW()),
    ('wbs-task-015', 'wbs-item-014', 'wbs-grp-002-01', 'phase-002-01', 'T-P2-1.1.2', 'UX 벤치마킹', '경쟁사 앱 UX 패턴 분석', 2, 'IN_PROGRESS', '2026-02-08', '2026-02-15', '2026-02-08', NULL, 40, 0.8, NULL, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, progress = EXCLUDED.progress;

-- ============================================
-- 17. WBS DEPENDENCIES (project.wbs_dependencies)
-- ============================================
INSERT INTO project.wbs_dependencies (id, project_id, source_item_id, target_item_id, dependency_type, lag_days, created_at, updated_at)
VALUES
    -- Requirements → Design dependencies
    ('wbs-dep-001', 'proj-001', 'wbs-item-003', 'wbs-item-004', 'FS', 0, NOW(), NOW()),  -- SRS → Architecture
    ('wbs-dep-002', 'proj-001', 'wbs-item-004', 'wbs-item-006', 'FS', 0, NOW(), NOW()),  -- Architecture → ERD
    ('wbs-dep-003', 'proj-001', 'wbs-item-004', 'wbs-item-007', 'SS', 2, NOW(), NOW()),  -- Architecture → Neo4j (start-to-start +2 days)
    ('wbs-dep-004', 'proj-001', 'wbs-item-006', 'wbs-item-008', 'SS', 3, NOW(), NOW()),  -- ERD → API Spec

    -- Design → Development dependencies
    ('wbs-dep-005', 'proj-001', 'wbs-item-008', 'wbs-item-012', 'FS', 0, NOW(), NOW()),  -- API Spec → Claims API
    ('wbs-dep-006', 'proj-001', 'wbs-item-006', 'wbs-item-009', 'FF', 0, NOW(), NOW()),  -- ERD → OCR Model (finish-to-finish)

    -- AI Development internal dependencies
    ('wbs-dep-007', 'proj-001', 'wbs-item-009', 'wbs-item-010', 'SS', 5, NOW(), NOW()),  -- OCR → Classification
    ('wbs-dep-008', 'proj-001', 'wbs-item-010', 'wbs-item-011', 'SS', 5, NOW(), NOW()),  -- Classification → Fraud Detection

    -- Backend Development dependencies
    ('wbs-dep-009', 'proj-001', 'wbs-item-012', 'wbs-item-013', 'FS', 0, NOW(), NOW()),  -- Claims API → File Upload

    -- Project 2 dependencies
    ('wbs-dep-010', 'proj-002', 'wbs-item-014', 'wbs-item-015', 'SS', 5, NOW(), NOW())   -- Competitor Analysis → User Research
ON CONFLICT (id) DO UPDATE SET dependency_type = EXCLUDED.dependency_type;

-- ============================================
-- 18. CHAT SESSIONS (chat.chat_sessions)
-- ============================================
INSERT INTO chat.chat_sessions (id, user_id, title, active, created_at, updated_at)
VALUES
    -- PM Chat Sessions
    ('chat-sess-001', 'U003', '프로젝트 현황 분석', true, '2026-01-20 09:00:00', '2026-01-20 09:30:00'),
    ('chat-sess-002', 'U003', '스프린트 계획 도움', true, '2026-01-25 14:00:00', '2026-01-25 14:45:00'),
    ('chat-sess-003', 'U003', '리스크 분석 요청', true, '2026-01-28 10:00:00', '2026-01-28 10:20:00'),

    -- Developer Chat Sessions
    ('chat-sess-004', 'U004', 'API 설계 질문', true, '2026-02-01 11:00:00', '2026-02-01 11:30:00'),
    ('chat-sess-005', 'U004', '기술 스택 추천', true, '2026-02-05 15:00:00', '2026-02-05 15:25:00'),

    -- BA Chat Sessions
    ('chat-sess-006', 'U006', '요구사항 분석 도움', true, '2026-01-18 09:00:00', '2026-01-18 09:45:00'),
    ('chat-sess-007', 'U006', 'RFP 문서 요약', true, '2026-01-22 13:00:00', '2026-01-22 13:30:00'),

    -- PMO Chat Sessions
    ('chat-sess-008', 'U002', '주간 보고서 생성', true, '2026-02-07 16:00:00', '2026-02-07 16:30:00'),

    -- Sponsor Chat Sessions
    ('chat-sess-009', 'U001', '프로젝트 개요 브리핑', true, '2026-02-10 10:00:00', '2026-02-10 10:15:00')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

-- ============================================
-- 19. CHAT MESSAGES (chat.chat_messages)
-- ============================================
INSERT INTO chat.chat_messages (id, session_id, role, content, metadata, created_at, updated_at)
VALUES
    -- Session 1: Project Status Analysis
    ('chat-msg-001', 'chat-sess-001', 'user', '현재 AI 보험심사 처리 시스템 프로젝트의 전체 진행 현황을 알려줘', '{"intent": "pms_query", "project_id": "proj-001"}', '2026-01-20 09:00:00', NOW()),
    ('chat-msg-002', 'chat-sess-001', 'assistant', 'AI 보험심사 처리 시스템 프로젝트의 현황을 분석했습니다.\n\n📊 **전체 진행률**: 25%\n\n**Phase별 현황**:\n- ✅ 요구사항 분석: 100% 완료 (승인됨)\n- 🔄 시스템 설계: 60% 진행 중\n- ⏳ AI 모델 개발: 미착수\n- ⏳ 백엔드 개발: 미착수\n- ⏳ 통합 및 테스트: 미착수\n- ⏳ 배포 및 오픈: 미착수\n\n**현재 스프린트 (스프린트 2 - 설계)**:\n- 진행 중 태스크: 2건\n- 검토 중 태스크: 1건\n\n**주요 리스크**: 시스템 설계 단계에서 보안 아키텍처 검토가 지연될 가능성이 있습니다.', '{"confidence": 0.92, "rag_sources": ["phases", "tasks", "sprints"]}', '2026-01-20 09:02:00', NOW()),
    ('chat-msg-003', 'chat-sess-001', 'user', '설계 단계 완료 예상일은 언제야?', '{"intent": "pms_query"}', '2026-01-20 09:05:00', NOW()),
    ('chat-msg-004', 'chat-sess-001', 'assistant', '시스템 설계 단계의 계획된 완료일은 **2026년 2월 28일**입니다.\n\n현재 진행률 60%를 고려하면, 현재 속도로 진행될 경우 예정대로 완료 가능할 것으로 예상됩니다. 다만 다음 사항들을 모니터링해야 합니다:\n\n- **API 명세서 초안** (검토 중): 승인 대기\n- **보안 아키텍처 검토**: 아직 시작 전\n\n조기 완료를 위해 보안 아키텍처 검토를 병렬로 진행하는 것을 권장드립니다.', '{"confidence": 0.88}', '2026-01-20 09:07:00', NOW()),

    -- Session 2: Sprint Planning
    ('chat-msg-005', 'chat-sess-002', 'user', '다음 스프린트에 어떤 태스크를 포함시키면 좋을까?', '{"intent": "pms_query", "project_id": "proj-001"}', '2026-01-25 14:00:00', NOW()),
    ('chat-msg-006', 'chat-sess-002', 'assistant', '다음 스프린트(스프린트 3 - AI 개발) 계획을 위한 추천 태스크입니다:\n\n**우선순위 High 태스크**:\n1. 🔥 ML 개발환경 구축 (MEDIUM)\n2. 🔥 문서 분류 모델 훈련 (HIGH)\n3. 🔥 사기 탐지 알고리즘 구현 (CRITICAL)\n\n**의존성 고려사항**:\n- ML 개발환경 구축이 선행되어야 AI 모델 개발 가능\n- 현재 설계 단계 완료가 필요\n\n**권장 스프린트 구성** (2주, 40 SP 기준):\n- ML 환경 구축: 5 SP\n- 문서 분류 모델 훈련: 13 SP\n- 사기 탐지 기초 구현: 13 SP\n- 버퍼: 9 SP\n\n이전 스프린트 velocity가 평균 37 SP였으므로 이 계획은 실현 가능해 보입니다.', '{"confidence": 0.85, "rag_sources": ["tasks", "sprints", "user_stories"]}', '2026-01-25 14:05:00', NOW()),

    -- Session 4: API Design Questions
    ('chat-msg-007', 'chat-sess-004', 'user', '보험청구 API에서 사용해야 할 인증 방식을 추천해줘', '{"intent": "general"}', '2026-02-01 11:00:00', NOW()),
    ('chat-msg-008', 'chat-sess-004', 'assistant', '보험청구 API의 인증 방식으로 다음을 권장합니다:\n\n**1차 권장: OAuth 2.0 + JWT**\n- 이유: 금융 서비스 업계 표준, 토큰 기반 무상태 인증\n- 장점: 확장성, 마이크로서비스 친화적\n\n**구현 권장사항**:\n```\n- Access Token TTL: 15분\n- Refresh Token TTL: 24시간\n- API Gateway 레벨에서 토큰 검증\n- Rate Limiting: 분당 100 요청\n```\n\n**보안 강화**:\n- HTTPS 필수\n- API Key + JWT 이중 인증\n- IP 화이트리스트 (내부 시스템용)\n\n현재 프로젝트 요구사항(REQ-SEC-001)에 따르면 AES-256 암호화가 필요하므로, JWT Payload 내 민감정보는 암호화해야 합니다.', '{"confidence": 0.90}', '2026-02-01 11:05:00', NOW()),

    -- Session 6: Requirements Analysis
    ('chat-msg-009', 'chat-sess-006', 'user', 'OCR 요구사항에서 정확도 99%가 현실적으로 달성 가능한지 분석해줘', '{"intent": "pms_query"}', '2026-01-18 09:00:00', NOW()),
    ('chat-msg-010', 'chat-sess-006', 'assistant', 'REQ-AI-001 "문서 OCR 처리 99% 정확도" 요구사항을 분석했습니다:\n\n**현실성 평가: 조건부 달성 가능 ⚠️**\n\n**긍정적 요인**:\n- 최신 OCR 엔진(Tesseract 5, PaddleOCR)은 인쇄 문서 대상 95-99% 정확도 달성\n- 보험 문서는 표준화된 양식이 많아 학습 효율 높음\n\n**도전 과제**:\n1. 손글씨 포함 문서: 80-85% 수준\n2. 노후/손상 문서: 정확도 급감\n3. 다국어 혼용 문서: 추가 처리 필요\n\n**권장 접근**:\n- 문서 유형별 차등 목표 설정\n  - 인쇄 문서: 99%\n  - 혼합 문서: 95%\n  - 손글씨: 85% + 수동 검토 프로세스\n\n- Human-in-the-loop 검증 단계 추가를 요구사항에 반영 권장', '{"confidence": 0.87, "rag_sources": ["requirements"]}', '2026-01-18 09:10:00', NOW()),

    -- Session 8: Weekly Report Generation
    ('chat-msg-011', 'chat-sess-008', 'user', '이번 주 주간보고서를 작성해줘', '{"intent": "pms_query", "track": "B"}', '2026-02-07 16:00:00', NOW()),
    ('chat-msg-012', 'chat-sess-008', 'assistant', '# 주간 보고서\n**기간**: 2026년 2월 1일 - 2월 7일 (Week 6)\n**프로젝트**: AI 보험심사 처리 시스템\n\n---\n\n## 1. 이번 주 주요 성과\n\n### 완료 항목\n- ✅ 고수준 아키텍처 설계 완료\n- ✅ 기술 스택 선정 완료 (Spring Boot 3.2, React 18, PostgreSQL 15)\n\n### 진행 중\n- 🔄 ERD 설계 (80%)\n- 🔄 Neo4j 그래프 모델 설계 (50%)\n- 🔄 API 명세서 작성 (40%)\n\n## 2. 핵심 지표\n\n| 지표 | 목표 | 실적 |\n|------|------|------|\n| 스프린트 Velocity | 35 SP | 38 SP |\n| 완료 태스크 | 5개 | 4개 |\n| 코드 리뷰 완료율 | 100% | 100% |\n\n## 3. 이슈 및 리스크\n\n⚠️ **주의 필요**:\n- 보안 아키텍처 검토 착수 지연 (담당자 배정 필요)\n\n## 4. 다음 주 계획\n\n1. ERD 설계 완료 및 검토\n2. API 명세서 초안 완성\n3. 보안 아키텍처 검토 착수\n4. AI 개발 환경 사전 준비', '{"confidence": 0.95, "generation_time_ms": 45000, "track": "B", "evidence_links": ["sprint-001-02", "phase-001-02"]}', '2026-02-07 16:05:00', NOW()),

    -- Session 9: Executive Briefing
    ('chat-msg-013', 'chat-sess-009', 'user', '프로젝트 전체 요약을 경영진 브리핑 형식으로 정리해줘', '{"intent": "pms_query", "track": "B"}', '2026-02-10 10:00:00', NOW()),
    ('chat-msg-014', 'chat-sess-009', 'assistant', '# 경영진 브리핑: AI 보험심사 처리 시스템\n\n## Executive Summary\n\n**프로젝트 상태**: 🟢 정상 진행 (Green)\n**전체 진행률**: 25% (예산 집행률 20%)\n\n---\n\n## 핵심 성과 (YTD)\n\n✅ **1단계 완료**: 요구사항 분석 및 승인 (100%)\n✅ **기술 아키텍처 확정**: Spring Boot + React + PostgreSQL + Neo4j\n✅ **팀 구성 완료**: 3개 파트, 8명 투입\n\n---\n\n## 재무 현황\n\n| 항목 | 계획 | 실적 | 차이 |\n|------|------|------|------|\n| 예산 | ₩500M | ₩100M 집행 | ▽₩400M 잔여 |\n| 인건비 | ₩350M | ₩70M | 정상 |\n| 외주비 | ₩100M | ₩20M | 정상 |\n| 기타 | ₩50M | ₩10M | 정상 |\n\n---\n\n## 주요 위험 요소\n\n| 위험 | 영향도 | 발생확률 | 대응 |\n|------|--------|----------|------|\n| AI 모델 정확도 미달 | 높음 | 중간 | POC 조기 수행 |\n| 레거시 연동 지연 | 중간 | 중간 | 전담인력 배치 |\n\n---\n\n## 향후 일정\n\n- **2월**: 시스템 설계 완료\n- **3-4월**: AI 모델 개발\n- **5월**: 통합 테스트\n- **6월**: 운영 배포\n\n---\n\n## 의사결정 필요 사항\n\n1. **AI 외주 인력 추가 투입**: 사기 탐지 모델 전문가 1명 추가 권장 (₩30M 예산 필요)\n2. **클라우드 인프라 결정**: AWS vs Azure vs On-premise 결정 필요 (2월 말까지)', '{"confidence": 0.93, "generation_time_ms": 52000, "track": "B", "evidence_links": ["proj-001", "phases", "parts"]}', '2026-02-10 10:10:00', NOW())
ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content;

-- ============================================
-- 20. WEEKLY REPORTS (task.weekly_reports)
-- ============================================
INSERT INTO task.weekly_reports (id, project_id, sprint_id, week_number, year, start_date, end_date, generated_by, generated_at, total_tasks, completed_tasks, in_progress_tasks, pending_tasks, blocked_tasks, velocity, planned_story_points, completed_story_points, completion_rate, summary, highlights, blockers, next_week_plans, status, created_at, updated_at)
VALUES
    -- Project 1 Weekly Reports
    ('wr-001-01', 'proj-001', 'sprint-001-01', 3, 2026, '2026-01-15', '2026-01-21', 'U003', '2026-01-22 09:00:00', 5, 3, 2, 0, 0, 32.0, 35, 32, 91.43,
     '프로젝트 착수 첫 주. 요구사항 분석 단계 순조롭게 진행 중.',
     '- RFP 요구사항 문서화 완료\n- 이해관계자 인터뷰 진행 중\n- 팀 온보딩 완료',
     '- 없음',
     '- 요구사항 승인 획득\n- 시스템 설계 단계 착수 준비',
     'PUBLISHED', NOW(), NOW()),

    ('wr-001-02', 'proj-001', 'sprint-001-01', 4, 2026, '2026-01-22', '2026-01-28', 'U003', '2026-01-29 09:00:00', 6, 5, 1, 0, 0, 38.0, 35, 38, 108.57,
     '요구사항 분석 단계 완료. 모든 요구사항 승인됨.',
     '- 요구사항 명세서 완료 및 승인\n- 이해관계자 인터뷰 전체 완료\n- 스프린트 1 성공적 완료',
     '- 없음',
     '- 시스템 설계 단계 착수\n- 아키텍처 설계 시작',
     'PUBLISHED', NOW(), NOW()),

    ('wr-001-03', 'proj-001', 'sprint-001-02', 5, 2026, '2026-01-29', '2026-02-04', 'U003', '2026-02-05 09:00:00', 8, 4, 3, 1, 0, 35.0, 35, 35, 100.00,
     '시스템 설계 단계 시작. 아키텍처 설계 순조롭게 진행.',
     '- 고수준 아키텍처 설계 완료\n- 기술 스택 확정\n- ERD 설계 착수',
     '- 보안 아키텍처 검토 담당자 미배정',
     '- ERD 및 API 설계 진행\n- 보안 담당자 배정',
     'PUBLISHED', NOW(), NOW()),

    ('wr-001-04', 'proj-001', 'sprint-001-02', 6, 2026, '2026-02-05', '2026-02-11', 'U003', '2026-02-12 09:00:00', 7, 2, 4, 1, 0, 42.0, 40, 42, 105.00,
     '설계 단계 중반. ERD 및 API 설계 진행 중.',
     '- ERD 설계 80% 완료\n- Neo4j 그래프 모델 설계 시작\n- API 명세서 초안 검토 중',
     '- API 명세서 검토 지연',
     '- 설계 문서 검토 완료\n- AI 개발 환경 사전 준비',
     'DRAFT', NOW(), NOW()),

    -- Project 2 Weekly Reports
    ('wr-002-01', 'proj-002', 'sprint-002-01', 5, 2026, '2026-01-29', '2026-02-04', 'user-pm-002', '2026-02-05 09:00:00', 4, 0, 2, 2, 0, 0.0, 20, 0, 0.00,
     '모바일 플랫폼 프로젝트 착수. 시장조사 진행 중.',
     '- 경쟁사 분석 착수\n- 사용자 페르소나 개발 시작',
     '- 없음',
     '- 경쟁사 분석 완료\n- 사용자 조사 진행',
     'PUBLISHED', NOW(), NOW()),

    ('wr-002-02', 'proj-002', 'sprint-002-01', 6, 2026, '2026-02-05', '2026-02-11', 'user-pm-002', '2026-02-12 09:00:00', 4, 0, 2, 2, 0, 15.0, 20, 15, 75.00,
     '시장조사 단계 진행 중. 경쟁사 분석 완료 예정.',
     '- 경쟁사 앱 기능 매트릭스 70% 완료\n- UX 벤치마킹 진행 중',
     '- 사용자 조사 참여자 모집 지연',
     '- 경쟁사 분석 완료\n- 사용자 인터뷰 일정 확정',
     'DRAFT', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET summary = EXCLUDED.summary;

-- ============================================
-- 21. ISSUES (project.issues)
-- ============================================
INSERT INTO project.issues (id, project_id, title, description, issue_type, status, priority, assignee, reporter, reviewer, due_date, resolved_at, comments, created_at, updated_at)
VALUES
    -- Project 1 Issues
    ('issue-001-01', 'proj-001', '보안 아키텍처 검토 담당자 미배정', '시스템 설계 단계에서 보안 아키텍처 검토를 위한 전문 담당자가 아직 배정되지 않음', 'RISK', 'OPEN', 'HIGH', NULL, 'user-pm-001', 'user-pmo-001', '2026-02-15', NULL, '외부 보안 컨설턴트 투입 검토 중', NOW(), NOW()),
    ('issue-001-02', 'proj-001', 'API 명세서 검토 지연', 'API 명세서 초안 검토가 일정보다 2일 지연됨', 'ISSUE', 'IN_PROGRESS', 'MEDIUM', 'user-dev-001', 'user-pm-001', 'user-dev-003', '2026-02-20', NULL, '추가 검토자 투입으로 해결 중', NOW(), NOW()),
    ('issue-001-03', 'proj-001', 'Neo4j 라이선스 검토 필요', 'Neo4j Enterprise Edition 라이선스 비용 및 조건 검토 필요', 'QUESTION', 'OPEN', 'LOW', 'user-ba-001', 'user-dev-002', NULL, '2026-02-28', NULL, NULL, NOW(), NOW()),
    ('issue-001-04', 'proj-001', 'RFP 요구사항 변경 요청', '고객사에서 OCR 정확도 요구사항을 99%에서 97%로 완화 요청', 'CHANGE_REQUEST', 'RESOLVED', 'HIGH', 'user-ba-001', 'user-sponsor-001', 'user-pm-001', '2026-01-25', '2026-01-24', '고객 협의 후 97%로 조정 합의', NOW(), NOW()),

    -- Project 2 Issues
    ('issue-002-01', 'proj-002', '사용자 조사 참여자 모집 지연', '모바일 앱 사용자 조사를 위한 참여자 모집이 예상보다 지연됨', 'ISSUE', 'OPEN', 'MEDIUM', 'user-ba-001', 'user-pm-002', NULL, '2026-02-20', NULL, '마케팅팀 협조 요청 중', NOW(), NOW()),
    ('issue-002-02', 'proj-002', 'iOS 개발자 부족', 'Swift 전문 개발자 1명 추가 투입 필요', 'RISK', 'OPEN', 'HIGH', NULL, 'user-pm-002', 'user-pmo-001', '2026-03-15', NULL, '채용 진행 중', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, status = EXCLUDED.status;

-- ============================================
-- 22. DELIVERABLES (project.deliverables)
-- ============================================
INSERT INTO project.deliverables (id, project_id, phase_id, name, description, type, status, file_path, file_name, file_size, uploaded_by, approver, approved_at, created_at, updated_at)
VALUES
    -- Project 1 Deliverables (Phase 1)
    ('deliv-001-01', 'proj-001', 'phase-001-01', '요구사항 명세서(SRS)', 'AI 보험심사 처리 시스템 소프트웨어 요구사항 명세서', 'DOCUMENT', 'APPROVED', '/docs/proj-001/SRS_v1.0.pdf', 'SRS_v1.0.pdf', 2457600, 'user-ba-001', 'user-sponsor-001', '2026-01-30', NOW(), NOW()),
    ('deliv-001-02', 'proj-001', 'phase-001-01', '이해관계자 인터뷰 보고서', '핵심 이해관계자 인터뷰 결과 종합 보고서', 'DOCUMENT', 'APPROVED', '/docs/proj-001/stakeholder_interviews.pdf', 'stakeholder_interviews.pdf', 1536000, 'user-ba-001', 'user-pm-001', '2026-01-28', NOW(), NOW()),
    ('deliv-001-03', 'proj-001', 'phase-001-01', '요구사항 추적 매트릭스', 'RFP 요구사항과 SRS 매핑 문서', 'SPREADSHEET', 'APPROVED', '/docs/proj-001/RTM.xlsx', 'RTM.xlsx', 512000, 'user-ba-001', 'user-pm-001', '2026-01-31', NOW(), NOW()),

    -- Project 1 Deliverables (Phase 2)
    ('deliv-001-04', 'proj-001', 'phase-001-02', '시스템 아키텍처 설계서', '고수준 시스템 아키텍처 설계 문서', 'DOCUMENT', 'APPROVED', '/docs/proj-001/architecture_v1.0.pdf', 'architecture_v1.0.pdf', 3072000, 'user-dev-001', 'user-pmo-001', '2026-02-08', NOW(), NOW()),
    ('deliv-001-05', 'proj-001', 'phase-001-02', '기술 스택 선정 보고서', '프레임워크 및 도구 선정 근거 문서', 'DOCUMENT', 'APPROVED', '/docs/proj-001/tech_stack.pdf', 'tech_stack.pdf', 1024000, 'user-dev-001', 'user-pm-001', '2026-02-10', NOW(), NOW()),
    ('deliv-001-06', 'proj-001', 'phase-001-02', 'ERD 설계 문서', '데이터베이스 ERD 및 스키마 설계', 'DIAGRAM', 'DRAFT', '/docs/proj-001/ERD_draft.pdf', 'ERD_draft.pdf', 2048000, 'user-dev-002', NULL, NULL, NOW(), NOW()),
    ('deliv-001-07', 'proj-001', 'phase-001-02', 'API 명세서 (OpenAPI)', 'RESTful API 명세서 OpenAPI 3.0 형식', 'SPECIFICATION', 'REVIEW', '/docs/proj-001/api_spec_draft.yaml', 'api_spec_draft.yaml', 256000, 'user-dev-001', NULL, NULL, NOW(), NOW()),

    -- Project 2 Deliverables
    ('deliv-002-01', 'proj-002', 'phase-002-01', '경쟁사 분석 보고서', '주요 경쟁 모바일 보험 앱 분석 리포트', 'DOCUMENT', 'DRAFT', '/docs/proj-002/competitor_analysis.pdf', 'competitor_analysis.pdf', 5120000, 'user-ba-001', NULL, NULL, NOW(), NOW()),
    ('deliv-002-02', 'proj-002', 'phase-002-01', '사용자 페르소나', '목표 사용자 그룹 페르소나 정의서', 'DOCUMENT', 'DRAFT', '/docs/proj-002/user_personas.pdf', 'user_personas.pdf', 3584000, 'user-ba-001', NULL, NULL, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status;

-- ============================================
-- 23. KPIs (project.kpis)
-- ============================================
INSERT INTO project.kpis (id, project_id, name, category, target, current, status, created_at, updated_at)
VALUES
    -- Project 1 KPIs
    ('kpi-001-01', 'proj-001', '스프린트 Velocity', 'AGILE', 35.00, 38.00, 'ON_TRACK', NOW(), NOW()),
    ('kpi-001-02', 'proj-001', '코드 커버리지', 'QUALITY', 80.00, 0.00, 'NOT_STARTED', NOW(), NOW()),
    ('kpi-001-03', 'proj-001', '요구사항 충족률', 'SCOPE', 100.00, 45.00, 'ON_TRACK', NOW(), NOW()),
    ('kpi-001-04', 'proj-001', '버그 발생률', 'QUALITY', 5.00, 0.00, 'ON_TRACK', NOW(), NOW()),
    ('kpi-001-05', 'proj-001', '일정 준수율', 'SCHEDULE', 100.00, 95.00, 'ON_TRACK', NOW(), NOW()),
    ('kpi-001-06', 'proj-001', 'AI 모델 정확도', 'TECHNICAL', 97.00, 0.00, 'NOT_STARTED', NOW(), NOW()),

    -- Project 2 KPIs
    ('kpi-002-01', 'proj-002', '스프린트 Velocity', 'AGILE', 30.00, 15.00, 'AT_RISK', NOW(), NOW()),
    ('kpi-002-02', 'proj-002', 'UX 만족도 점수', 'QUALITY', 4.50, 0.00, 'NOT_STARTED', NOW(), NOW()),
    ('kpi-002-03', 'proj-002', '앱 성능 (로딩 시간)', 'TECHNICAL', 2.00, 0.00, 'NOT_STARTED', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET current = EXCLUDED.current, status = EXCLUDED.status;

-- ============================================
-- 24. MEETINGS (project.meetings)
-- ============================================
INSERT INTO project.meetings (id, project_id, title, meeting_type, scheduled_at, organizer, attendees, agenda, minutes, actual_start_at, actual_end_at, created_at, updated_at)
VALUES
    -- Project 1 Meetings
    ('meet-001-01', 'proj-001', '프로젝트 킥오프 미팅', 'KICKOFF', '2026-01-15 09:00:00', 'user-pm-001', 'user-sponsor-001,user-pmo-001,user-dev-001,user-dev-002,user-ba-001,user-qa-001', '1. 프로젝트 개요\n2. 팀 소개\n3. 일정 계획\n4. Q&A', '- 프로젝트 목표 및 범위 공유\n- 6개 페이즈 일정 합의\n- 주간 회의 시간 결정 (매주 월요일 10시)', '2026-01-15 09:05:00', '2026-01-15 10:30:00', NOW(), NOW()),

    ('meet-001-02', 'proj-001', 'Sprint 1 Planning', 'SPRINT_PLANNING', '2026-01-15 14:00:00', 'user-pm-001', 'user-dev-001,user-dev-002,user-ba-001', '1. 백로그 리뷰\n2. 스프린트 목표 설정\n3. 태스크 분배', '- 35 SP 목표 설정\n- 요구사항 분석 태스크 배정\n- RFP 문서화 착수', '2026-01-15 14:00:00', '2026-01-15 15:30:00', NOW(), NOW()),

    ('meet-001-03', 'proj-001', 'Sprint 1 Review', 'SPRINT_REVIEW', '2026-01-31 14:00:00', 'user-pm-001', 'user-sponsor-001,user-pmo-001,user-dev-001,user-ba-001', '1. 스프린트 성과 데모\n2. 요구사항 명세서 검토\n3. 피드백', '- 38 SP 달성 (목표 대비 109%)\n- SRS 문서 승인\n- 설계 단계 착수 승인', '2026-01-31 14:00:00', '2026-01-31 15:00:00', NOW(), NOW()),

    ('meet-001-04', 'proj-001', 'Sprint 1 Retrospective', 'RETROSPECTIVE', '2026-01-31 15:30:00', 'user-pm-001', 'user-dev-001,user-dev-002,user-ba-001,user-qa-001', '1. 잘된 점\n2. 개선할 점\n3. Action Items', '- Good: 팀 협업, 일정 준수\n- Improve: 문서 리뷰 프로세스\n- Action: 리뷰 체크리스트 도입', '2026-01-31 15:30:00', '2026-01-31 16:30:00', NOW(), NOW()),

    ('meet-001-05', 'proj-001', 'Sprint 2 Planning', 'SPRINT_PLANNING', '2026-02-01 10:00:00', 'user-pm-001', 'user-dev-001,user-dev-002,user-dev-003,user-ba-001', '1. 설계 단계 백로그 리뷰\n2. 스프린트 2 목표\n3. 태스크 분배', '- 35 SP 목표\n- 아키텍처 및 DB 설계 중심\n- 보안 검토 담당자 배정 필요', '2026-02-01 10:00:00', '2026-02-01 11:30:00', NOW(), NOW()),

    ('meet-001-06', 'proj-001', '주간 스탠드업 (Week 6)', 'DAILY_STANDUP', '2026-02-10 10:00:00', 'user-pm-001', 'user-dev-001,user-dev-002,user-dev-003', '1. 진행 현황\n2. 블로커\n3. 오늘 계획', '- ERD 설계 마무리 예정\n- API 명세서 검토 필요\n- 보안 검토 일정 확정', '2026-02-10 10:00:00', '2026-02-10 10:15:00', NOW(), NOW()),

    -- Project 2 Meetings
    ('meet-002-01', 'proj-002', '프로젝트 킥오프', 'KICKOFF', '2026-02-01 14:00:00', 'user-pm-002', 'user-sponsor-001,user-dev-001,user-dev-003,user-ba-001', '1. 프로젝트 소개\n2. 시장조사 계획\n3. 일정 협의', '- 모바일 플랫폼 목표 공유\n- 경쟁사 분석 우선 착수\n- 8월 출시 목표 확정', '2026-02-01 14:00:00', '2026-02-01 15:30:00', NOW(), NOW()),

    ('meet-002-02', 'proj-002', 'Sprint 1 Planning', 'SPRINT_PLANNING', '2026-02-01 16:00:00', 'user-pm-002', 'user-dev-001,user-dev-003,user-ba-001', '1. 리서치 백로그\n2. 태스크 분배', '- 20 SP 목표\n- 경쟁사 분석 및 사용자 조사 착수', '2026-02-01 16:00:00', '2026-02-01 17:00:00', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

-- ============================================
-- 25. EDUCATION (education.educations)
-- ============================================
INSERT INTO education.educations (id, title, description, category, level, duration_hours, content, active, created_at, updated_at)
VALUES
    ('edu-001', 'Agile/Scrum 기초', '애자일 방법론과 스크럼 프레임워크 기초 과정', 'METHODOLOGY', 'BEGINNER', 4, '1. 애자일 선언문\n2. 스크럼 역할\n3. 스크럼 이벤트\n4. 스크럼 산출물', true, NOW(), NOW()),
    ('edu-002', 'Jira 실무 활용', 'Jira를 활용한 프로젝트 관리 실무', 'TOOL', 'INTERMEDIATE', 3, '1. Jira 기본 설정\n2. 이슈 관리\n3. 보드 커스터마이징\n4. 리포트 활용', true, NOW(), NOW()),
    ('edu-003', '요구사항 분석 및 명세', '소프트웨어 요구사항 분석 및 SRS 작성법', 'SKILL', 'INTERMEDIATE', 6, '1. 요구사항 수집 기법\n2. 유즈케이스 작성\n3. SRS 문서 구조\n4. 요구사항 검증', true, NOW(), NOW()),
    ('edu-004', 'Spring Boot 심화', 'Spring Boot 3.x 기반 백엔드 개발', 'TECHNICAL', 'ADVANCED', 8, '1. WebFlux 소개\n2. R2DBC 활용\n3. Security 설정\n4. 테스트 전략', true, NOW(), NOW()),
    ('edu-005', 'AI/ML 기초', '인공지능 및 머신러닝 기본 개념', 'TECHNICAL', 'BEGINNER', 6, '1. AI/ML 개요\n2. 지도학습 vs 비지도학습\n3. 모델 훈련 기초\n4. 평가 지표', true, NOW(), NOW()),
    ('edu-006', '보험업 도메인 지식', '보험 심사 프로세스 및 용어 이해', 'DOMAIN', 'BEGINNER', 4, '1. 보험 상품 유형\n2. 청구 처리 프로세스\n3. 심사 기준\n4. 규제 환경', true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

-- ============================================
-- 26. EDUCATION ROADMAPS (education.education_roadmaps)
-- ============================================
INSERT INTO education.education_roadmaps (id, user_id, title, description, target_role, status, created_at, updated_at)
VALUES
    ('roadmap-001', 'U004', '신입 개발자 온보딩', '신입 개발자를 위한 필수 교육 로드맵', 'DEVELOPER', 'ACTIVE', NOW(), NOW()),
    ('roadmap-002', 'U003', 'PM 역량 강화', '프로젝트 매니저 역량 강화 과정', 'PM', 'ACTIVE', NOW(), NOW()),
    ('roadmap-003', 'U006', 'BA 전문성 개발', 'Business Analyst 전문성 개발 과정', 'BUSINESS_ANALYST', 'ACTIVE', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

-- ============================================
-- 27. EDUCATION SESSIONS (education.education_sessions)
-- ============================================
INSERT INTO education.education_sessions (id, roadmap_id, education_id, order_num, status, started_at, completed_at, created_at, updated_at)
VALUES
    -- Developer Roadmap Sessions
    ('edu-sess-001', 'roadmap-001', 'edu-001', 1, 'COMPLETED', '2026-01-16 09:00:00', '2026-01-16 13:00:00', NOW(), NOW()),
    ('edu-sess-002', 'roadmap-001', 'edu-004', 2, 'IN_PROGRESS', '2026-02-01 09:00:00', NULL, NOW(), NOW()),
    ('edu-sess-003', 'roadmap-001', 'edu-006', 3, 'NOT_STARTED', NULL, NULL, NOW(), NOW()),

    -- PM Roadmap Sessions
    ('edu-sess-004', 'roadmap-002', 'edu-001', 1, 'COMPLETED', '2026-01-10 09:00:00', '2026-01-10 13:00:00', NOW(), NOW()),
    ('edu-sess-005', 'roadmap-002', 'edu-002', 2, 'COMPLETED', '2026-01-12 14:00:00', '2026-01-12 17:00:00', NOW(), NOW()),
    ('edu-sess-006', 'roadmap-002', 'edu-006', 3, 'IN_PROGRESS', '2026-02-05 09:00:00', NULL, NOW(), NOW()),

    -- BA Roadmap Sessions
    ('edu-sess-007', 'roadmap-003', 'edu-003', 1, 'COMPLETED', '2026-01-08 09:00:00', '2026-01-08 15:00:00', NOW(), NOW()),
    ('edu-sess-008', 'roadmap-003', 'edu-006', 2, 'IN_PROGRESS', '2026-01-20 09:00:00', NULL, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

-- ============================================
-- 28. EDUCATION HISTORIES (education.education_histories)
-- ============================================
INSERT INTO education.education_histories (id, user_id, education_id, session_id, progress, score, completed, started_at, completed_at, created_at, updated_at)
VALUES
    -- Developer (U004) History
    ('edu-hist-001', 'U004', 'edu-001', 'edu-sess-001', 100, 92.50, true, '2026-01-16 09:00:00', '2026-01-16 13:00:00', NOW(), NOW()),
    ('edu-hist-002', 'U004', 'edu-004', 'edu-sess-002', 45, NULL, false, '2026-02-01 09:00:00', NULL, NOW(), NOW()),

    -- PM (U003) History
    ('edu-hist-003', 'U003', 'edu-001', 'edu-sess-004', 100, 88.00, true, '2026-01-10 09:00:00', '2026-01-10 13:00:00', NOW(), NOW()),
    ('edu-hist-004', 'U003', 'edu-002', 'edu-sess-005', 100, 95.00, true, '2026-01-12 14:00:00', '2026-01-12 17:00:00', NOW(), NOW()),
    ('edu-hist-005', 'U003', 'edu-006', 'edu-sess-006', 60, NULL, false, '2026-02-05 09:00:00', NULL, NOW(), NOW()),

    -- BA (U006) History
    ('edu-hist-006', 'U006', 'edu-003', 'edu-sess-007', 100, 90.00, true, '2026-01-08 09:00:00', '2026-01-08 15:00:00', NOW(), NOW()),
    ('edu-hist-007', 'U006', 'edu-006', 'edu-sess-008', 75, NULL, false, '2026-01-20 09:00:00', NULL, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET progress = EXCLUDED.progress;

-- ============================================
-- 29. BACKLOGS (project.backlogs)
-- ============================================
INSERT INTO project.backlogs (id, project_id, name, description, status, created_at, updated_at)
VALUES
    ('backlog-001', 'proj-001', 'AI 보험심사 프로덕트 백로그', 'AI 보험심사 처리 시스템 전체 백로그', 'ACTIVE', NOW(), NOW()),
    ('backlog-002', 'proj-002', '모바일 플랫폼 프로덕트 백로그', '모바일 보험 플랫폼 전체 백로그', 'ACTIVE', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- ============================================
-- 30. BACKLOG ITEMS (project.backlog_items)
-- ============================================
INSERT INTO project.backlog_items (id, backlog_id, requirement_id, origin_type, epic_id, priority_order, status, story_points, estimated_effort_hours, acceptance_criteria, sprint_id, created_at, updated_at)
VALUES
    -- Project 1 Backlog Items
    ('bl-item-001', 'backlog-001', 'req-001-01', 'RFP', 'epic-001-01', 1, 'IN_SPRINT', 8, 32, '- OCR 정확도 97% 이상\n- 처리 시간 5초 이내', 'sprint-001-02', NOW(), NOW()),
    ('bl-item-002', 'backlog-001', 'req-001-02', 'RFP', 'epic-001-02', 2, 'BACKLOG', 13, 52, '- 사기 탐지율 95% 이상\n- 오탐률 5% 이하', NULL, NOW(), NOW()),
    ('bl-item-003', 'backlog-001', 'req-001-03', 'RFP', 'epic-001-03', 3, 'BACKLOG', 8, 32, '- RESTful API 100% 커버리지\n- 응답 시간 200ms 이내', NULL, NOW(), NOW()),
    ('bl-item-004', 'backlog-001', 'req-001-05', 'RFP', 'epic-001-04', 4, 'BACKLOG', 5, 20, '- AES-256 암호화 적용\n- 보안 감사 통과', NULL, NOW(), NOW()),

    -- Project 2 Backlog Items
    ('bl-item-005', 'backlog-002', 'req-002-01', 'RFP', 'epic-002-01', 1, 'BACKLOG', 8, 32, '- 생체인증 지원\n- 로그인 시간 3초 이내', NULL, NOW(), NOW()),
    ('bl-item-006', 'backlog-002', 'req-002-02', 'RFP', 'epic-002-01', 2, 'BACKLOG', 5, 20, '- 보험증권 목록 표시\n- 실시간 상태 업데이트', NULL, NOW(), NOW()),
    ('bl-item-007', 'backlog-002', 'req-002-03', 'RFP', 'epic-002-01', 3, 'BACKLOG', 13, 52, '- 사진 업로드 지원\n- 제출 확인 알림', NULL, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

-- ============================================
-- 31. UPDATE USER STORIES with Feature Links
-- ============================================
UPDATE task.user_stories SET feature_id = 'feat-001-01', wbs_item_id = 'wbs-item-009' WHERE id = 'story-001-01';
UPDATE task.user_stories SET feature_id = 'feat-001-04', wbs_item_id = 'wbs-item-011' WHERE id = 'story-001-02';
UPDATE task.user_stories SET feature_id = 'feat-001-06', wbs_item_id = 'wbs-item-012' WHERE id = 'story-001-03';
UPDATE task.user_stories SET feature_id = NULL, wbs_item_id = NULL WHERE id = 'story-001-04';
UPDATE task.user_stories SET feature_id = 'feat-002-01', wbs_item_id = 'wbs-item-014' WHERE id = 'story-002-01';

-- ============================================
-- 32. UPDATE TASKS with Part Links
-- ============================================
UPDATE task.tasks SET part_id = 'part-001-01' WHERE id IN ('task-001-08', 'task-001-09', 'task-001-10');
UPDATE task.tasks SET part_id = 'part-001-02' WHERE id IN ('task-001-04', 'task-001-05', 'task-001-06', 'task-001-11', 'task-001-12');
UPDATE task.tasks SET part_id = 'part-001-03' WHERE id = 'task-001-07';
UPDATE task.tasks SET part_id = 'part-002-01' WHERE id IN ('task-002-06', 'task-002-07');
UPDATE task.tasks SET part_id = 'part-002-03' WHERE id = 'task-002-08';

-- ============================================
-- 33. REPORT TEMPLATES (report.report_templates)
-- ============================================
INSERT INTO report.report_templates (id, name, description, template_content, scope, active, created_at, updated_at)
VALUES
    ('tpl-001', '주간 보고서', '주간 프로젝트 진행 현황 보고서 템플릿', '# 주간 보고서\n\n## 기간: {{start_date}} - {{end_date}}\n\n## 1. 이번 주 성과\n{{achievements}}\n\n## 2. 주요 지표\n{{metrics}}\n\n## 3. 이슈 및 리스크\n{{issues}}\n\n## 4. 다음 주 계획\n{{next_plans}}', 'PROJECT', true, NOW(), NOW()),
    ('tpl-002', '스프린트 리뷰 보고서', '스프린트 완료 시 리뷰 보고서 템플릿', '# 스프린트 리뷰 보고서\n\n## 스프린트: {{sprint_name}}\n\n## 1. 완료 항목\n{{completed_items}}\n\n## 2. Velocity\n- 계획: {{planned_sp}}\n- 달성: {{completed_sp}}\n\n## 3. 데모 결과\n{{demo_feedback}}', 'SPRINT', true, NOW(), NOW()),
    ('tpl-003', '경영진 브리핑', '경영진 대상 프로젝트 요약 보고서', '# Executive Summary\n\n## 프로젝트 상태: {{status}}\n\n## 1. 핵심 성과\n{{key_achievements}}\n\n## 2. 재무 현황\n{{financials}}\n\n## 3. 주요 리스크\n{{risks}}\n\n## 4. 의사결정 필요 사항\n{{decisions}}', 'EXECUTIVE', true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- ============================================
-- 34. SPRINTS data consolidated in section 5.1
-- ============================================
-- (All 8 sprints are now defined in a single INSERT statement above)

-- ============================================
-- Summary (Updated):
-- - 18 users (various roles)
-- - 42 permissions (across 11 categories)
-- - 150+ role-permission mappings (8 roles)
-- - 2 projects (AI Claims Processing, Mobile Platform)
-- - 12 phases (6 per project)
-- - 10 kanban columns (5 per project)
-- - 20 tasks
-- - 6 sprints (4 for proj-001, 2 for proj-002)
-- - 5 user stories
-- - 2 RFPs
-- - 11 requirements
-- - 6 parts (3 per project)
-- - 25+ project members
-- - 7 outbox events (lineage tracking)
-- NEW:
-- - 6 epics (4 for proj-001, 2 for proj-002)
-- - 10 features
-- - 14 WBS groups
-- - 15 WBS items
-- - 15 WBS tasks
-- - 10 WBS dependencies
-- - 9 chat sessions
-- - 14 chat messages
-- - 6 weekly reports
-- - 6 issues
-- - 9 deliverables
-- - 9 KPIs
-- - 8 meetings
-- - 6 education courses
-- - 3 education roadmaps
-- - 8 education sessions
-- - 7 education histories
-- - 2 backlogs
-- - 7 backlog items
-- - 3 report templates
-- ============================================
