-- WBS Dependencies Sample Data for Critical Path Testing
-- Version: 20260207
-- Description: Create meaningful dependencies for Gantt chart and Critical Path analysis

-- ============================================
-- 1. Sequential dependencies within groups (same group: Item1 -> Item2 -> Item3)
-- ============================================

-- Group: 요구사항 수집 (wg-001-01-01)
-- RFP 문서 분석 -> 기능 요구사항 정의 -> 비기능 요구사항 정의
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by, created_at)
VALUES
    (gen_random_uuid()::text, 'ITEM', 'wi-001-01-01-01', 'ITEM', 'wi-001-01-01-02', 'FS', 0, 'proj-001', 'system', NOW()),
    (gen_random_uuid()::text, 'ITEM', 'wi-001-01-01-02', 'ITEM', 'wi-001-01-01-03', 'FS', 0, 'proj-001', 'system', NOW())
ON CONFLICT DO NOTHING;

-- Group: 아키텍처 설계 (wg-001-02-01)
-- 기술 스택 선정 -> 시스템 아키텍처 -> 인프라 설계
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by, created_at)
VALUES
    (gen_random_uuid()::text, 'ITEM', 'wi-001-02-01-01', 'ITEM', 'wi-001-02-01-02', 'FS', 0, 'proj-001', 'system', NOW()),
    (gen_random_uuid()::text, 'ITEM', 'wi-001-02-01-02', 'ITEM', 'wi-001-02-01-03', 'FS', 0, 'proj-001', 'system', NOW())
ON CONFLICT DO NOTHING;

-- Group: 핵심 API 개발 (wg-001-04-01)
-- 청구 API 구현 -> 심사 API 구현 -> API 테스트
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by, created_at)
VALUES
    (gen_random_uuid()::text, 'ITEM', 'wi-001-04-01-01', 'ITEM', 'wi-001-04-01-02', 'FS', 0, 'proj-001', 'system', NOW()),
    (gen_random_uuid()::text, 'ITEM', 'wi-001-04-01-02', 'ITEM', 'wi-001-04-01-03', 'FS', 0, 'proj-001', 'system', NOW())
ON CONFLICT DO NOTHING;

-- Group: AI 개발환경 구축 (wg-001-03-01)
-- ML 파이프라인 구축 -> 학습 환경 구성
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by, created_at)
VALUES
    (gen_random_uuid()::text, 'ITEM', 'wi-001-03-01-01', 'ITEM', 'wi-001-03-01-02', 'FS', 0, 'proj-001', 'system', NOW())
ON CONFLICT DO NOTHING;

-- Group: 통합 테스트 (wg-001-05-01)
-- 테스트 계획 수립 -> E2E 테스트 실행 -> 결함 관리
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by, created_at)
VALUES
    (gen_random_uuid()::text, 'ITEM', 'wi-001-05-01-01', 'ITEM', 'wi-001-05-01-02', 'FS', 0, 'proj-001', 'system', NOW()),
    (gen_random_uuid()::text, 'ITEM', 'wi-001-05-01-02', 'ITEM', 'wi-001-05-01-03', 'FS', 0, 'proj-001', 'system', NOW())
ON CONFLICT DO NOTHING;

-- Group: 운영 환경 구축 (wg-001-06-01)
-- 인프라 프로비저닝 -> 모니터링 설정 -> CI/CD 파이프라인
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by, created_at)
VALUES
    (gen_random_uuid()::text, 'ITEM', 'wi-001-06-01-01', 'ITEM', 'wi-001-06-01-02', 'FS', 0, 'proj-001', 'system', NOW()),
    (gen_random_uuid()::text, 'ITEM', 'wi-001-06-01-02', 'ITEM', 'wi-001-06-01-03', 'FS', 0, 'proj-001', 'system', NOW())
ON CONFLICT DO NOTHING;

-- ============================================
-- 2. Cross-group dependencies (Phase transitions)
-- ============================================

-- Phase 1 -> Phase 2: 요구사항 분석 완료 후 시스템 설계 시작
-- 비기능 요구사항 정의 -> 기술 스택 선정
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by, created_at)
VALUES
    (gen_random_uuid()::text, 'ITEM', 'wi-001-01-01-03', 'ITEM', 'wi-001-02-01-01', 'FS', 0, 'proj-001', 'system', NOW())
ON CONFLICT DO NOTHING;

-- Phase 2 -> Phase 3: 시스템 설계 완료 후 AI 모델 개발 시작
-- 인프라 설계 -> ML 파이프라인 구축
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by, created_at)
VALUES
    (gen_random_uuid()::text, 'ITEM', 'wi-001-02-01-03', 'ITEM', 'wi-001-03-01-01', 'FS', 0, 'proj-001', 'system', NOW())
ON CONFLICT DO NOTHING;

-- Phase 2 -> Phase 4: 아키텍처 설계 완료 후 백엔드 개발 시작
-- 시스템 아키텍처 -> 청구 API 구현
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by, created_at)
VALUES
    (gen_random_uuid()::text, 'ITEM', 'wi-001-02-01-02', 'ITEM', 'wi-001-04-01-01', 'FS', 0, 'proj-001', 'system', NOW())
ON CONFLICT DO NOTHING;

-- Phase 4 -> Phase 5: 백엔드 개발 완료 후 통합 테스트 시작
-- API 테스트 -> 테스트 계획 수립
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by, created_at)
VALUES
    (gen_random_uuid()::text, 'ITEM', 'wi-001-04-01-03', 'ITEM', 'wi-001-05-01-01', 'FS', 0, 'proj-001', 'system', NOW())
ON CONFLICT DO NOTHING;

-- Phase 5 -> Phase 6: 통합 테스트 완료 후 운영 환경 구축 시작
-- 결함 관리 -> 인프라 프로비저닝
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by, created_at)
VALUES
    (gen_random_uuid()::text, 'ITEM', 'wi-001-05-01-03', 'ITEM', 'wi-001-06-01-01', 'FS', 0, 'proj-001', 'system', NOW())
ON CONFLICT DO NOTHING;

-- ============================================
-- 3. Group-level dependencies for Gantt chart visualization
-- ============================================

-- 요구사항 수집 -> 아키텍처 설계
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by, created_at)
VALUES
    (gen_random_uuid()::text, 'GROUP', 'wg-001-01-01', 'GROUP', 'wg-001-02-01', 'FS', 0, 'proj-001', 'system', NOW())
ON CONFLICT DO NOTHING;

-- 아키텍처 설계 -> AI 개발환경 구축
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by, created_at)
VALUES
    (gen_random_uuid()::text, 'GROUP', 'wg-001-02-01', 'GROUP', 'wg-001-03-01', 'FS', 0, 'proj-001', 'system', NOW())
ON CONFLICT DO NOTHING;

-- 아키텍처 설계 -> 핵심 API 개발
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by, created_at)
VALUES
    (gen_random_uuid()::text, 'GROUP', 'wg-001-02-01', 'GROUP', 'wg-001-04-01', 'FS', 0, 'proj-001', 'system', NOW())
ON CONFLICT DO NOTHING;

-- 핵심 API 개발 -> 통합 테스트
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by, created_at)
VALUES
    (gen_random_uuid()::text, 'GROUP', 'wg-001-04-01', 'GROUP', 'wg-001-05-01', 'FS', 0, 'proj-001', 'system', NOW())
ON CONFLICT DO NOTHING;

-- 통합 테스트 -> 운영 환경 구축
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by, created_at)
VALUES
    (gen_random_uuid()::text, 'GROUP', 'wg-001-05-01', 'GROUP', 'wg-001-06-01', 'FS', 0, 'proj-001', 'system', NOW())
ON CONFLICT DO NOTHING;

-- ============================================
-- Summary of dependencies created:
-- - Item-level sequential dependencies: 12
-- - Cross-phase dependencies: 5
-- - Group-level dependencies: 5
-- Total: ~22 dependencies
--
-- Critical Path should follow:
-- 요구사항 수집 -> 아키텍처 설계 -> 백엔드 개발 -> 통합 테스트 -> 운영 환경 구축
-- ============================================
