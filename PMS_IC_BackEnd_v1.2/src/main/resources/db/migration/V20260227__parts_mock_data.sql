-- Parts Mock Data Migration
-- Version: 20260227
-- Description: Insert mock data for Parts (sub-projects) and Part Members

-- ============================================
-- Parts for Project 1 (AI Insurance Claims System)
-- ============================================
INSERT INTO project.parts (id, name, description, project_id, leader_id, leader_name, status, start_date, end_date, progress, created_at, updated_at, created_by)
VALUES
    ('part-001-ai', 'AI 개발 파트', 'AI/ML 모델 개발 및 OCR, 사기탐지 시스템 구현', 'proj-001', 'user-dev-002', '박민수', 'ACTIVE', '2026-01-15', '2026-06-30', 45, NOW(), NOW(), 'user-pm-001'),
    ('part-001-si', 'SI 개발 파트', '백엔드 API 및 레거시 시스템 연동 개발', 'proj-001', 'user-dev-001', '김철수', 'ACTIVE', '2026-02-01', '2026-06-30', 67, NOW(), NOW(), 'user-pm-001'),
    ('part-001-common', '공통 파트', '보안, 인프라, 테스트 자동화 및 품질 관리', 'proj-001', 'user-dev-003', '한지영', 'ACTIVE', '2026-01-15', '2026-06-30', 35, NOW(), NOW(), 'user-pm-001'),
    ('part-001-qa', 'QA 파트', '테스트 계획, 테스트 케이스 설계 및 품질 보증', 'proj-001', 'user-qa-001', '최지훈', 'ACTIVE', '2026-02-15', '2026-06-30', 20, NOW(), NOW(), 'user-pm-001')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    leader_id = EXCLUDED.leader_id,
    leader_name = EXCLUDED.leader_name,
    progress = EXCLUDED.progress,
    updated_at = NOW();

-- ============================================
-- Parts for Project 2 (Mobile Insurance Platform)
-- ============================================
INSERT INTO project.parts (id, name, description, project_id, leader_id, leader_name, status, start_date, end_date, progress, created_at, updated_at, created_by)
VALUES
    ('part-002-ux', 'UX/UI 파트', '모바일 앱 UX 설계 및 UI 디자인', 'proj-002', 'user-ba-001', '이영희', 'ACTIVE', '2026-02-01', '2026-04-30', 25, NOW(), NOW(), 'user-pm-002'),
    ('part-002-mobile', '모바일 개발 파트', 'iOS/Android 네이티브 앱 개발', 'proj-002', 'user-dev-001', '김철수', 'ACTIVE', '2026-03-01', '2026-06-30', 0, NOW(), NOW(), 'user-pm-002')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    leader_id = EXCLUDED.leader_id,
    leader_name = EXCLUDED.leader_name,
    progress = EXCLUDED.progress,
    updated_at = NOW();

-- ============================================
-- Part Members for Project 1
-- ============================================

-- AI Part Members (part-001-ai) - 4 members
INSERT INTO project.part_members (part_id, user_id)
VALUES
    ('part-001-ai', 'user-dev-002'),  -- Leader: Park Minsu
    ('part-001-ai', 'user-ba-001'),   -- Member: Lee Younghee
    ('part-001-ai', 'user-dev-004'),  -- Member: Jung Sumin
    ('part-001-ai', 'user-dev-005')   -- Member: Oh Minseok
ON CONFLICT (part_id, user_id) DO NOTHING;

-- SI Part Members (part-001-si) - 3 members
INSERT INTO project.part_members (part_id, user_id)
VALUES
    ('part-001-si', 'user-dev-001'),  -- Leader: Kim Cheolsu
    ('part-001-si', 'user-dev-006'),  -- Member: Kang Minho
    ('part-001-si', 'user-dev-007')   -- Member: Yoon Seoyeon
ON CONFLICT (part_id, user_id) DO NOTHING;

-- Common Part Members (part-001-common) - 3 members
INSERT INTO project.part_members (part_id, user_id)
VALUES
    ('part-001-common', 'user-dev-003'),  -- Leader: Han Jiyoung
    ('part-001-common', 'user-dev-008'),  -- Member: Im Jaehyun
    ('part-001-common', 'user-dev-009')   -- Member: Song Yuna
ON CONFLICT (part_id, user_id) DO NOTHING;

-- QA Part Members (part-001-qa) - 2 members
INSERT INTO project.part_members (part_id, user_id)
VALUES
    ('part-001-qa', 'user-qa-001'),   -- Leader: Choi Jihoon
    ('part-001-qa', 'user-qa-002')    -- Member: Bae Jiwon
ON CONFLICT (part_id, user_id) DO NOTHING;

-- ============================================
-- Part Members for Project 2
-- ============================================

-- UX Part Members (part-002-ux) - 2 members
INSERT INTO project.part_members (part_id, user_id)
VALUES
    ('part-002-ux', 'user-ba-001'),   -- Leader: Lee Younghee
    ('part-002-ux', 'user-ux-001')    -- Member: Kim Daeun
ON CONFLICT (part_id, user_id) DO NOTHING;

-- Mobile Part Members (part-002-mobile) - 3 members
INSERT INTO project.part_members (part_id, user_id)
VALUES
    ('part-002-mobile', 'user-dev-001'),    -- Leader: Kim Cheolsu
    ('part-002-mobile', 'user-ios-001'),    -- Member: Hong Gildong
    ('part-002-mobile', 'user-android-001') -- Member: Lee Sunsin
ON CONFLICT (part_id, user_id) DO NOTHING;

-- ============================================
-- Summary of Parts Mock Data
-- ============================================
-- Project 1 (AI Insurance Claims):
--   - AI 개발 파트 (45% progress, 4 members)
--   - SI 개발 파트 (67% progress, 3 members)
--   - 공통 파트 (35% progress, 3 members)
--   - QA 파트 (20% progress, 2 members)
--
-- Project 2 (Mobile Platform):
--   - UX/UI 파트 (25% progress, 2 members)
--   - 모바일 개발 파트 (0% progress, 3 members)
--
-- Total: 6 Parts, 17 Part Members
-- ============================================
