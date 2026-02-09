-- ============================================================
-- V20260212_1: Effective Capability Views
-- Priority: DELEGATION(1) > DIRECT(2) > ROLE(3)
-- These views compute effective capabilities without storing them.
-- Reference: docs/10_menu/화면설계/20_22_DB설계_권한거버넌스.md §4
-- ============================================================

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
-- Uses DISTINCT ON to select highest priority source per (project, user, capability)
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
