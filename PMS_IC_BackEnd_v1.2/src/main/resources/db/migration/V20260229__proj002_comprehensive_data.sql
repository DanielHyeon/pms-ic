-- Comprehensive Mock Data for Project 2 (Mobile Insurance Platform)
-- Version: 20260229
-- Description: Complete data for proj-002 including kanban, sprints, stories, meetings, and issues

-- ============================================
-- 1. KANBAN COLUMNS for Project 2
-- ============================================
INSERT INTO task.kanban_columns (id, project_id, name, order_num, color, wip_limit, created_at, updated_at)
VALUES
    ('col-002-01', 'proj-002', '백로그', 1, '#6B7280', NULL, NOW(), NOW()),
    ('col-002-02', 'proj-002', '할 일', 2, '#3B82F6', 8, NOW(), NOW()),
    ('col-002-03', 'proj-002', '진행 중', 3, '#F59E0B', 5, NOW(), NOW()),
    ('col-002-04', 'proj-002', '검토', 4, '#8B5CF6', 3, NOW(), NOW()),
    ('col-002-05', 'proj-002', '테스트 중', 5, '#EC4899', 3, NOW(), NOW()),
    ('col-002-06', 'proj-002', '완료', 6, '#10B981', NULL, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, order_num = EXCLUDED.order_num;

-- ============================================
-- 2. SPRINTS for Project 2
-- ============================================
INSERT INTO task.sprints (id, project_id, name, goal, start_date, end_date, status, conwip_limit, enable_wip_validation, created_at, updated_at)
VALUES
    ('sprint-002-01', 'proj-002', '스프린트 1 - 시장 조사', '시장 분석 및 사용자 리서치', '2026-02-01', '2026-02-14', 'ACTIVE', 12, true, NOW(), NOW()),
    ('sprint-002-02', 'proj-002', '스프린트 2 - UX 설계', 'UX 리서치 완료 및 와이어프레임', '2026-02-15', '2026-02-28', 'PLANNED', 12, true, NOW(), NOW()),
    ('sprint-002-03', 'proj-002', '스프린트 3 - UI 디자인', 'UI 디자인 및 프로토타입', '2026-03-01', '2026-03-14', 'PLANNED', 12, true, NOW(), NOW()),
    ('sprint-002-04', 'proj-002', '스프린트 4 - 앱 기본 구조', 'iOS/Android 앱 기본 아키텍처 구축', '2026-03-15', '2026-03-28', 'PLANNED', 12, true, NOW(), NOW()),
    ('sprint-002-05', 'proj-002', '스프린트 5 - 핵심 기능', '로그인, 보험증권 조회 기능 개발', '2026-04-01', '2026-04-14', 'PLANNED', 12, true, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status;

-- ============================================
-- 3. USER STORIES for Project 2
-- ============================================
INSERT INTO task.user_stories (id, project_id, sprint_id, title, description, status, priority_order, story_points, epic, priority, created_at, updated_at)
VALUES
    -- Sprint 1 Stories (Market Research)
    ('story-002-01', 'proj-002', 'sprint-002-01', '보험 앱 시장 분석', '경쟁 보험 앱 분석 및 벤치마킹', 'IN_PROGRESS', 1, 5, '사용자 경험 설계', 'HIGH', NOW(), NOW()),
    ('story-002-02', 'proj-002', 'sprint-002-01', '타겟 사용자 인터뷰', '20-40대 보험 가입자 인터뷰 진행', 'IN_PROGRESS', 2, 8, '사용자 경험 설계', 'HIGH', NOW(), NOW()),
    ('story-002-03', 'proj-002', 'sprint-002-01', '사용자 페르소나 정의', '주요 사용자 페르소나 3종 정의', 'TODO', 3, 3, '사용자 경험 설계', 'MEDIUM', NOW(), NOW()),

    -- Sprint 2 Stories (UX Design)
    ('story-002-04', 'proj-002', 'sprint-002-02', '사용자 여정 맵 작성', '주요 사용자 시나리오별 여정 맵', 'BACKLOG', 1, 5, '사용자 경험 설계', 'HIGH', NOW(), NOW()),
    ('story-002-05', 'proj-002', 'sprint-002-02', '와이어프레임 설계', '핵심 화면 와이어프레임 설계', 'BACKLOG', 2, 8, '사용자 경험 설계', 'HIGH', NOW(), NOW()),
    ('story-002-06', 'proj-002', 'sprint-002-02', '사용성 테스트 진행', '와이어프레임 기반 사용성 테스트', 'BACKLOG', 3, 5, '사용자 경험 설계', 'MEDIUM', NOW(), NOW()),

    -- Sprint 3 Stories (UI Design)
    ('story-002-07', 'proj-002', 'sprint-002-03', '디자인 시스템 구축', '컬러, 타이포, 컴포넌트 정의', 'BACKLOG', 1, 8, '사용자 경험 설계', 'HIGH', NOW(), NOW()),
    ('story-002-08', 'proj-002', 'sprint-002-03', '주요 화면 UI 디자인', '홈, 보험증권, 청구 화면 디자인', 'BACKLOG', 2, 13, '사용자 경험 설계', 'HIGH', NOW(), NOW()),

    -- Backlog Stories
    ('story-002-09', 'proj-002', NULL, '생체인증 로그인 구현', 'Face ID / 지문 인식 로그인', 'BACKLOG', 1, 8, '모바일 앱 개발', 'HIGH', NOW(), NOW()),
    ('story-002-10', 'proj-002', NULL, '보험증권 목록 조회', '가입 보험 목록 및 상세 조회', 'BACKLOG', 2, 5, '모바일 앱 개발', 'MEDIUM', NOW(), NOW()),
    ('story-002-11', 'proj-002', NULL, '보험금 청구 신청', '모바일 보험금 청구 프로세스', 'BACKLOG', 3, 13, '모바일 앱 개발', 'HIGH', NOW(), NOW()),
    ('story-002-12', 'proj-002', NULL, '푸시 알림 시스템', '보험 만기, 청구 진행 알림', 'BACKLOG', 4, 5, '모바일 앱 개발', 'MEDIUM', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, status = EXCLUDED.status;

-- ============================================
-- 4. KANBAN TASKS for Project 2
-- ============================================
INSERT INTO task.tasks (id, project_id, column_id, kanban_column_id, phase_id, title, description, assignee_id, priority, status, due_date, order_num, tags, track_type, user_story_id, created_at, updated_at)
VALUES
    -- Backlog Tasks
    ('task-002-01', 'proj-002', 'col-002-01', 'col-002-01', 'phase-002-01', '경쟁사 앱 분석 보고서 작성', '주요 보험사 모바일 앱 기능 비교 분석', 'user-ba-001', 'HIGH', 'BACKLOG', '2026-02-12', 1, 'research,analysis', 'COMMON', 'story-002-01', NOW(), NOW()),
    ('task-002-02', 'proj-002', 'col-002-01', 'col-002-01', 'phase-002-01', '사용자 설문 조사 설계', '타겟 사용자 대상 설문 문항 설계', 'user-ba-001', 'MEDIUM', 'BACKLOG', '2026-02-10', 2, 'research,survey', 'COMMON', 'story-002-02', NOW(), NOW()),

    -- TODO Tasks
    ('task-002-03', 'proj-002', 'col-002-02', 'col-002-02', 'phase-002-01', '인터뷰 일정 조율', '사용자 인터뷰 일정 및 장소 확정', 'user-ba-001', 'HIGH', 'TODO', '2026-02-08', 1, 'interview,planning', 'COMMON', 'story-002-02', NOW(), NOW()),
    ('task-002-04', 'proj-002', 'col-002-02', 'col-002-02', 'phase-002-01', '시장 트렌드 리서치', '모바일 보험 시장 동향 분석', 'user-ba-001', 'MEDIUM', 'TODO', '2026-02-14', 2, 'research,market', 'COMMON', 'story-002-01', NOW(), NOW()),
    ('task-002-05', 'proj-002', 'col-002-02', 'col-002-02', 'phase-002-02', 'UX 벤치마킹', '경쟁 앱 UX 패턴 분석', 'user-dev-001', 'HIGH', 'TODO', '2026-02-18', 3, 'ux,benchmarking', 'COMMON', 'story-002-04', NOW(), NOW()),

    -- In Progress Tasks
    ('task-002-06', 'proj-002', 'col-002-03', 'col-002-03', 'phase-002-01', '사용자 인터뷰 진행', '20-30대 보험 가입자 심층 인터뷰', 'user-ba-001', 'CRITICAL', 'IN_PROGRESS', '2026-02-10', 1, 'interview,user-research', 'COMMON', 'story-002-02', NOW(), NOW()),
    ('task-002-07', 'proj-002', 'col-002-03', 'col-002-03', 'phase-002-01', '앱스토어 리뷰 분석', '경쟁 앱 리뷰 분석 및 인사이트 도출', 'user-ba-001', 'HIGH', 'IN_PROGRESS', '2026-02-09', 2, 'research,review-analysis', 'COMMON', 'story-002-01', NOW(), NOW()),

    -- Review Tasks
    ('task-002-08', 'proj-002', 'col-002-04', 'col-002-04', 'phase-002-01', '시장 조사 보고서 검토', '시장 분석 결과 문서 리뷰', 'user-pm-002', 'HIGH', 'REVIEW', '2026-02-08', 1, 'review,document', 'COMMON', 'story-002-01', NOW(), NOW()),

    -- Testing Tasks
    ('task-002-12', 'proj-002', 'col-002-05', 'col-002-05', 'phase-002-02', '프로토타입 사용성 테스트', 'Figma 프로토타입 사용성 검증', 'user-qa-001', 'HIGH', 'TESTING', '2026-02-20', 1, 'testing,usability', 'COMMON', 'story-002-06', NOW(), NOW()),

    -- Done Tasks
    ('task-002-13', 'proj-002', 'col-002-06', 'col-002-06', 'phase-002-01', '프로젝트 킥오프 미팅', '이해관계자 킥오프 미팅 진행', 'user-pm-002', 'HIGH', 'DONE', '2026-02-01', 1, 'meeting,kickoff', 'COMMON', NULL, NOW(), NOW()),
    ('task-002-14', 'proj-002', 'col-002-06', 'col-002-06', 'phase-002-01', '프로젝트 일정 수립', '마일스톤 및 스프린트 일정 확정', 'user-pm-002', 'HIGH', 'DONE', '2026-02-03', 2, 'planning,schedule', 'COMMON', NULL, NOW(), NOW()),
    ('task-002-15', 'proj-002', 'col-002-06', 'col-002-06', 'phase-002-01', '팀 역할 배정', '프로젝트 팀원 역할 및 책임 정의', 'user-pm-002', 'MEDIUM', 'DONE', '2026-02-02', 3, 'team,organization', 'COMMON', NULL, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, status = EXCLUDED.status, column_id = EXCLUDED.column_id;

-- ============================================
-- 5. MEETINGS for Project 2
-- ============================================
INSERT INTO project.meetings (id, project_id, title, meeting_type, scheduled_at, organizer, attendees, agenda, created_at, updated_at)
VALUES
    ('meet-002-01', 'proj-002', '프로젝트 킥오프', 'KICKOFF', '2026-02-01 10:00:00', 'user-pm-002', 'user-pm-002,user-ba-001,user-dev-001,user-dev-003,user-qa-001', '프로젝트 목표 공유, 팀 역할 배정, 일정 논의', NOW(), NOW()),
    ('meet-002-02', 'proj-002', '스프린트 1 계획', 'SPRINT_PLANNING', '2026-02-01 14:00:00', 'user-pm-002', 'user-pm-002,user-ba-001,user-dev-001', '시장 조사 스프린트 계획 회의', NOW(), NOW()),
    ('meet-002-03', 'proj-002', '일일 스크럼', 'DAILY_SCRUM', '2026-02-06 09:30:00', 'user-pm-002', 'user-pm-002,user-ba-001,user-dev-001', '스프린트 1 데일리 스크럼', NOW(), NOW()),
    ('meet-002-04', 'proj-002', 'UX 리뷰 미팅', 'REVIEW', '2026-02-12 15:00:00', 'user-ba-001', 'user-ba-001,user-pm-002,user-dev-001', '사용자 인터뷰 결과 공유 및 토론', NOW(), NOW()),
    ('meet-002-05', 'proj-002', '스프린트 1 회고', 'RETROSPECTIVE', '2026-02-14 16:00:00', 'user-pm-002', 'user-pm-002,user-ba-001,user-dev-001,user-qa-001', '시장 조사 스프린트 회고', NOW(), NOW()),
    ('meet-002-06', 'proj-002', '스프린트 2 계획', 'SPRINT_PLANNING', '2026-02-15 10:00:00', 'user-pm-002', 'user-pm-002,user-ba-001,user-dev-001', 'UX 설계 스프린트 계획 회의', NOW(), NOW()),
    ('meet-002-07', 'proj-002', '디자인 워크샵', 'WORKSHOP', '2026-02-20 13:00:00', 'user-dev-001', 'user-ba-001,user-dev-001,user-dev-003', 'UI/UX 디자인 워크샵', NOW(), NOW()),
    ('meet-002-08', 'proj-002', '이해관계자 데모', 'DEMO', '2026-02-28 14:00:00', 'user-pm-002', 'user-pm-002,user-sponsor-001,user-pmo-001', '1차 프로토타입 데모 발표', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

-- ============================================
-- 6. ISSUES for Project 2
-- ============================================
INSERT INTO project.issues (id, project_id, title, description, issue_type, priority, status, reporter, assignee, due_date, created_at, updated_at)
VALUES
    ('issue-002-01', 'proj-002', '인터뷰 참가자 모집 지연', '타겟 사용자 모집이 예상보다 어려움', 'RISK', 'HIGH', 'OPEN', 'user-ba-001', 'user-pm-002', '2026-02-10', NOW(), NOW()),
    ('issue-002-02', 'proj-002', 'Figma 라이선스 확보 필요', '팀 전체 Figma 프로 라이선스 필요', 'TASK', 'MEDIUM', 'IN_PROGRESS', 'user-dev-001', 'user-pm-002', '2026-02-08', NOW(), NOW()),
    ('issue-002-03', 'proj-002', '경쟁사 앱 데이터 접근 제한', '일부 경쟁사 앱 분석 데이터 수집 어려움', 'IMPEDIMENT', 'MEDIUM', 'OPEN', 'user-ba-001', 'user-ba-001', '2026-02-12', NOW(), NOW()),
    ('issue-002-04', 'proj-002', 'iOS 개발자 채용 지연', '시니어 iOS 개발자 채용 프로세스 지연', 'RISK', 'CRITICAL', 'OPEN', 'user-pm-002', 'user-pm-002', '2026-03-01', NOW(), NOW()),
    ('issue-002-05', 'proj-002', '보안 정책 검토 필요', '생체인증 관련 보안 가이드라인 확인 필요', 'TASK', 'HIGH', 'OPEN', 'user-dev-003', 'user-dev-003', '2026-02-20', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, status = EXCLUDED.status;

-- ============================================
-- 7. PARTS for Project 2
-- ============================================
INSERT INTO project.parts (id, project_id, name, description, leader_id, status, created_at, updated_at)
VALUES
    ('part-002-01', 'proj-002', 'UX/UI 파트', '사용자 경험 및 인터페이스 디자인', 'user-ba-001', 'ACTIVE', NOW(), NOW()),
    ('part-002-02', 'proj-002', 'iOS 개발 파트', 'iOS 네이티브 앱 개발', 'user-dev-001', 'ACTIVE', NOW(), NOW()),
    ('part-002-03', 'proj-002', 'Android 개발 파트', 'Android 네이티브 앱 개발', 'user-dev-003', 'ACTIVE', NOW(), NOW()),
    ('part-002-04', 'proj-002', 'QA 파트', '품질 보증 및 테스트', 'user-qa-001', 'ACTIVE', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status;
