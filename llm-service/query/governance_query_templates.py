"""
SQL Query Templates for Governance (역할/권한/위임) Intent Handlers.

Design Principles:
1. Always filter by project_id (scope enforcement)
2. Use LEFT JOIN for optional enrichment (user name, capability name)
3. Use parameterized queries (%(param)s for psycopg2)
4. Return enough data for degradation decisions

Reference: docs/10_menu/화면설계/22_역할권한관리_화면설계.md
"""

from __future__ import annotations

# =============================================================================
# 역할 목록 + 멤버 수 조회
# =============================================================================

ROLE_LIST_QUERY = """
SELECT
    r.id AS role_id,
    r.name AS role_name,
    r.description,
    r.is_system,
    COUNT(DISTINCT ur.user_id) AS member_count,
    STRING_AGG(DISTINCT u.name, ', ' ORDER BY u.name) AS member_names
FROM governance.roles r
LEFT JOIN governance.user_roles ur
    ON ur.role_id = r.id AND ur.project_id = %(project_id)s
LEFT JOIN auth.users u
    ON u.id = ur.user_id
WHERE r.project_id IS NULL OR r.project_id = %(project_id)s
GROUP BY r.id, r.name, r.description, r.is_system
ORDER BY r.is_system DESC, r.name
"""

# =============================================================================
# 사용자별 유효 권한 조회
# =============================================================================

CAPABILITY_CHECK_BY_USER = """
SELECT
    ec.user_id,
    u.name AS user_name,
    ec.capability_id,
    c.code AS capability_code,
    c.name AS capability_name,
    c.category,
    ec.source_type
FROM governance.v_effective_caps ec
JOIN governance.capabilities c ON c.id = ec.capability_id
JOIN auth.users u ON u.id = ec.user_id
WHERE ec.project_id = %(project_id)s
  AND ec.user_id = %(user_id)s
ORDER BY c.category, c.code
"""

# =============================================================================
# 특정 권한 보유자 조회
# =============================================================================

CAPABILITY_CHECK_BY_CAP = """
SELECT
    ec.user_id,
    u.name AS user_name,
    ec.source_type,
    ec.source_id
FROM governance.v_effective_caps ec
JOIN auth.users u ON u.id = ec.user_id
WHERE ec.project_id = %(project_id)s
  AND ec.capability_id = %(capability_id)s
ORDER BY u.name
"""

# =============================================================================
# 전체 유효 권한 현황 (사용자별 그룹)
# =============================================================================

CAPABILITY_CHECK_ALL = """
SELECT
    ec.user_id,
    u.name AS user_name,
    COUNT(DISTINCT ec.capability_id) AS cap_count,
    STRING_AGG(DISTINCT c.code, ', ' ORDER BY c.code) AS capability_codes
FROM governance.v_effective_caps ec
JOIN governance.capabilities c ON c.id = ec.capability_id
JOIN auth.users u ON u.id = ec.user_id
WHERE ec.project_id = %(project_id)s
GROUP BY ec.user_id, u.name
ORDER BY cap_count DESC
"""

# =============================================================================
# 활성 위임 목록
# =============================================================================

DELEGATION_LIST_QUERY = """
SELECT
    d.id AS delegation_id,
    d.delegator_id,
    u1.name AS delegator_name,
    d.delegatee_id,
    u2.name AS delegatee_name,
    c.code AS capability_code,
    c.name AS capability_name,
    d.scope_type,
    d.duration_type,
    d.start_at,
    d.end_at,
    d.status,
    d.approved_at,
    u3.name AS approver_name
FROM governance.delegations d
JOIN auth.users u1 ON u1.id = d.delegator_id
JOIN auth.users u2 ON u2.id = d.delegatee_id
JOIN governance.capabilities c ON c.id = d.capability_id
LEFT JOIN auth.users u3 ON u3.id = d.approver_id
WHERE d.project_id = %(project_id)s
  AND d.status IN ('ACTIVE', 'PENDING')
ORDER BY d.created_at DESC
"""

# =============================================================================
# 위임 통계 (활성/대기/폐기 건수)
# =============================================================================

DELEGATION_STATS_QUERY = """
SELECT
    d.status,
    COUNT(*) AS count,
    COUNT(CASE WHEN d.duration_type = 'TEMPORARY'
               AND d.end_at BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
          THEN 1 END) AS expiring_soon_count
FROM governance.delegations d
WHERE d.project_id = %(project_id)s
GROUP BY d.status
"""

# =============================================================================
# 위임 맵 (재귀 CTE 위임 트리)
# =============================================================================

DELEGATION_MAP_QUERY = """
WITH RECURSIVE delegation_tree AS (
    -- 루트: 직접 권한 보유자가 위임한 것 (parent_delegation_id IS NULL)
    SELECT
        d.id, d.delegator_id, d.delegatee_id, d.capability_id,
        d.status, d.scope_type, 1 AS depth,
        d.delegator_id AS root_delegator_id
    FROM governance.delegations d
    WHERE d.project_id = %(project_id)s
      AND d.status = 'ACTIVE'
      AND d.parent_delegation_id IS NULL

    UNION ALL

    -- 재위임 체인
    SELECT
        d.id, d.delegator_id, d.delegatee_id, d.capability_id,
        d.status, d.scope_type, dt.depth + 1,
        dt.root_delegator_id
    FROM governance.delegations d
    JOIN delegation_tree dt ON d.parent_delegation_id = dt.id
    WHERE d.status = 'ACTIVE'
      AND dt.depth < 5
)
SELECT
    dt.root_delegator_id,
    u1.name AS root_delegator_name,
    dt.delegator_id,
    u2.name AS delegator_name,
    dt.delegatee_id,
    u3.name AS delegatee_name,
    c.code AS capability_code,
    dt.depth
FROM delegation_tree dt
JOIN auth.users u1 ON u1.id = dt.root_delegator_id
JOIN auth.users u2 ON u2.id = dt.delegator_id
JOIN auth.users u3 ON u3.id = dt.delegatee_id
JOIN governance.capabilities c ON c.id = dt.capability_id
ORDER BY dt.root_delegator_id, dt.depth, c.code
"""

# =============================================================================
# 거버넌스 검증 결과 조회 (최근 검증)
# =============================================================================

GOVERNANCE_FINDINGS_QUERY = """
SELECT
    gf.id AS finding_id,
    gf.finding_type,
    gf.severity,
    gf.user_id,
    u.name AS user_name,
    gf.delegation_id,
    gf.message,
    gf.details_json,
    gf.created_at,
    gcr.checked_by,
    u2.name AS checked_by_name
FROM governance.governance_findings gf
JOIN governance.governance_check_runs gcr ON gcr.id = gf.run_id
LEFT JOIN auth.users u ON u.id = gf.user_id
LEFT JOIN auth.users u2 ON u2.id = gcr.checked_by
WHERE gf.project_id = %(project_id)s
  AND gcr.id = (
    SELECT id FROM governance.governance_check_runs
    WHERE project_id = %(project_id)s
    ORDER BY checked_at DESC
    LIMIT 1
  )
ORDER BY
    CASE gf.severity
        WHEN 'HIGH' THEN 1
        WHEN 'MEDIUM' THEN 2
        WHEN 'LOW' THEN 3
        WHEN 'INFO' THEN 4
        ELSE 5
    END,
    gf.finding_type
"""

# =============================================================================
# 실시간 SoD 위반 검사
# =============================================================================

SOD_VIOLATION_CHECK_QUERY = """
SELECT
    sr.id AS rule_id,
    sr.description AS rule_description,
    sr.severity,
    sr.is_blocking,
    ca.code AS cap_a_code,
    ca.name AS cap_a_name,
    cb.code AS cap_b_code,
    cb.name AS cap_b_name,
    a.user_id,
    u.name AS user_name
FROM governance.sod_rules sr
JOIN governance.capabilities ca ON ca.id = sr.capability_a_id
JOIN governance.capabilities cb ON cb.id = sr.capability_b_id
JOIN governance.v_effective_caps a
    ON a.project_id = %(project_id)s AND a.capability_id = sr.capability_a_id
JOIN governance.v_effective_caps b
    ON b.project_id = a.project_id AND b.user_id = a.user_id AND b.capability_id = sr.capability_b_id
LEFT JOIN auth.users u ON u.id = a.user_id
ORDER BY sr.severity, u.name
"""
