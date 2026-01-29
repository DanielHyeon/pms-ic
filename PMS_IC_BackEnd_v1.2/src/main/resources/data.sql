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
-- Project 1 Phases
INSERT INTO project.phases (id, project_id, name, order_num, status, gate_status, start_date, end_date, progress, description, track_type, created_at, updated_at)
VALUES
    ('phase-001-01', 'proj-001', '요구사항 분석', 1, 'COMPLETED', 'APPROVED', '2026-01-15', '2026-01-31', 100, 'AI 보험심사 처리에 대한 모든 요구사항 수집 및 분석', 'COMMON', NOW(), NOW()),
    ('phase-001-02', 'proj-001', '시스템 설계', 2, 'IN_PROGRESS', 'PENDING', '2026-02-01', '2026-02-28', 60, '시스템 아키텍처 및 데이터 모델 설계', 'COMMON', NOW(), NOW()),
    ('phase-001-03', 'proj-001', 'AI 모델 개발', 3, 'NOT_STARTED', NULL, '2026-03-01', '2026-04-15', 0, '문서 처리 및 사기 탐지를 위한 AI 모델 개발 및 훈련', 'AI', NOW(), NOW()),
    ('phase-001-04', 'proj-001', '백엔드 개발', 4, 'NOT_STARTED', NULL, '2026-03-15', '2026-05-15', 0, '백엔드 서비스 및 API 구현', 'SI', NOW(), NOW()),
    ('phase-001-05', 'proj-001', '통합 및 테스트', 5, 'NOT_STARTED', NULL, '2026-05-01', '2026-06-15', 0, '시스템 통합 및 종합 테스트', 'COMMON', NOW(), NOW()),
    ('phase-001-06', 'proj-001', '배포 및 오픈', 6, 'NOT_STARTED', NULL, '2026-06-15', '2026-06-30', 0, '운영 환경 배포 및 사용자 교육', 'COMMON', NOW(), NOW()),

    -- Project 2 Phases
    ('phase-002-01', 'proj-002', '시장조사 및 기획', 1, 'IN_PROGRESS', 'PENDING', '2026-02-01', '2026-02-28', 30, '시장 니즈 조사 및 상세 프로젝트 계획 수립', 'COMMON', NOW(), NOW()),
    ('phase-002-02', 'proj-002', 'UX/UI 디자인', 2, 'NOT_STARTED', NULL, '2026-03-01', '2026-03-31', 0, '모바일 앱 사용자 경험 및 인터페이스 디자인', 'COMMON', NOW(), NOW()),
    ('phase-002-03', 'proj-002', '모바일 앱 개발', 3, 'NOT_STARTED', NULL, '2026-04-01', '2026-06-30', 0, 'iOS 및 Android 애플리케이션 개발', 'SI', NOW(), NOW()),
    ('phase-002-04', 'proj-002', '백엔드 API 개발', 4, 'NOT_STARTED', NULL, '2026-04-01', '2026-06-15', 0, '모바일 플랫폼을 위한 백엔드 API 구축', 'SI', NOW(), NOW()),
    ('phase-002-05', 'proj-002', '테스트 및 QA', 5, 'NOT_STARTED', NULL, '2026-06-15', '2026-08-15', 0, '품질 보증 및 사용자 수용 테스트', 'COMMON', NOW(), NOW()),
    ('phase-002-06', 'proj-002', '출시 및 마케팅', 6, 'NOT_STARTED', NULL, '2026-08-15', '2026-08-31', 0, '앱스토어 등록 및 마케팅 캠페인', 'COMMON', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

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
INSERT INTO task.sprints (id, project_id, name, goal, status, start_date, end_date, enable_wip_validation, created_at, updated_at)
VALUES
    ('sprint-001-01', 'proj-001', '스프린트 1 - 기반 구축', '프로젝트 기반 구축 및 요구사항 분석 완료', 'COMPLETED', '2026-01-15', '2026-01-31', true, NOW(), NOW()),
    ('sprint-001-02', 'proj-001', '스프린트 2 - 설계', '시스템 설계 및 아키텍처 완료', 'ACTIVE', '2026-02-01', '2026-02-14', true, NOW(), NOW()),
    ('sprint-001-03', 'proj-001', '스프린트 3 - AI 개발', '핵심 AI 모델 개발', 'PLANNED', '2026-02-15', '2026-02-28', true, NOW(), NOW()),
    ('sprint-002-01', 'proj-002', '스프린트 1 - 리서치', '시장조사 및 기획', 'ACTIVE', '2026-02-01', '2026-02-14', true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, goal = EXCLUDED.goal;

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
    -- Project 1 Parts
    ('part-001-01', 'proj-001', 'AI 개발', '보험청구 처리를 위한 AI/ML 모델 개발팀', 'user-dev-002', '최은지', 'ACTIVE', '2026-01-15', '2026-06-30', 30, NOW(), NOW()),
    ('part-001-02', 'proj-001', '백엔드 개발', '백엔드 API 및 서비스 개발', 'user-dev-001', '박성호', 'ACTIVE', '2026-01-15', '2026-06-30', 25, NOW(), NOW()),
    ('part-001-03', 'proj-001', 'QA 및 테스트', '품질 보증 및 테스트팀', 'user-qa-001', '한수진', 'ACTIVE', '2026-01-15', '2026-06-30', 20, NOW(), NOW()),

    -- Project 2 Parts
    ('part-002-01', 'proj-002', '모바일 개발', 'iOS 및 Android 앱 개발', 'user-dev-001', '박성호', 'ACTIVE', '2026-02-01', '2026-08-31', 10, NOW(), NOW()),
    ('part-002-02', 'proj-002', 'UX/UI 디자인', '사용자 경험 및 인터페이스 디자인', NULL, NULL, 'ACTIVE', '2026-02-01', '2026-08-31', 5, NOW(), NOW()),
    ('part-002-03', 'proj-002', '백엔드 API', '모바일 백엔드 API 개발', 'user-dev-003', '정원재', 'ACTIVE', '2026-02-01', '2026-08-31', 0, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- ============================================
-- 9. PART MEMBERS (project.part_members)
-- ============================================
INSERT INTO project.part_members (part_id, user_id)
VALUES
    -- AI Development Part members
    ('part-001-01', 'user-dev-002'),
    ('part-001-01', 'user-ba-001'),

    -- Backend Development Part members
    ('part-001-02', 'user-dev-001'),
    ('part-001-02', 'user-dev-003'),

    -- QA Part members
    ('part-001-03', 'user-qa-001'),

    -- Mobile Development Part members
    ('part-002-01', 'user-dev-001'),
    ('part-002-01', 'user-dev-003'),

    -- UX/UI Design Part members (no leader yet)
    ('part-002-02', 'user-ba-001'),

    -- Backend API Part members
    ('part-002-03', 'user-dev-003')
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
-- Summary:
-- - 18 users (various roles)
-- - 42 permissions (across 11 categories)
-- - 150+ role-permission mappings (8 roles)
-- - 2 projects (AI Claims Processing, Mobile Platform)
-- - 12 phases (6 per project)
-- - 10 kanban columns (5 per project)
-- - 20 tasks
-- - 4 sprints
-- - 5 user stories
-- - 2 RFPs
-- - 11 requirements
-- - 6 parts (3 per project)
-- - 25 project members
-- - 7 outbox events (lineage tracking)
-- ============================================
