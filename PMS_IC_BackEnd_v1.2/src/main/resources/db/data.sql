-- ============================================================
-- PMS Insurance Claims - Consolidated Seed/Mock Data (DML)
-- Generated from 70 Flyway migrations (V20260117 ~ V20260236_05)
-- Run AFTER schema.sql against a fresh PostgreSQL 15 instance.
-- All INSERTs use ON CONFLICT DO NOTHING/UPDATE for idempotency.
-- ============================================================
-- Usage:
--   1. First run schema.sql to create all tables
--   2. Then run this file to populate seed/mock data
--   psql -U pms_user -d pms_ic -f schema.sql
--   psql -U pms_user -d pms_ic -f data.sql
-- ============================================================

SET client_min_messages TO WARNING;

-- ============================================================
-- Source: V20260131__comprehensive_mock_data
-- ============================================================
-- Comprehensive Mock Data for PMS Insurance Claims
-- Version: 20260131
-- Description: Complete mock data for all test cases including WBS, Epics, Features, and Progress tracking
-- Coverage: All user roles (SPONSOR, PMO_HEAD, PM, DEVELOPER, QA, BUSINESS_ANALYST, AUDITOR, ADMIN)

-- ============================================
-- 1. EPICS (project.epics) - Linked to Phases
-- ============================================
INSERT INTO project.epics (id, project_id, name, description, status, goal, owner_id, target_completion_date, business_value, total_story_points, item_count, phase_id, color, progress, priority, created_at, updated_at, created_by)
VALUES
    -- Project 1 Epics
    ('epic-001-01', 'proj-001', '문서 처리 자동화', 'AI 기반 문서 OCR 및 자동 분류 시스템', 'ACTIVE', '문서 처리 시간 70% 단축', 'user-dev-002', '2026-04-15', 90, 26, 5, 'phase-001-03', '#3B82F6', 45, 'CRITICAL', NOW(), NOW(), 'user-pm-001'),
    ('epic-001-02', 'proj-001', '사기 탐지 시스템', 'ML 기반 보험 사기 탐지 알고리즘 개발', 'ACTIVE', '사기 탐지율 95% 이상 달성', 'user-dev-002', '2026-05-01', 95, 34, 7, 'phase-001-03', '#EF4444', 30, 'CRITICAL', NOW(), NOW(), 'user-pm-001'),
    ('epic-001-03', 'proj-001', 'API 플랫폼 구축', 'RESTful API 및 외부 연동 시스템', 'DRAFT', '외부 시스템 연동 100% 완료', 'user-dev-001', '2026-05-15', 80, 21, 4, 'phase-001-04', '#10B981', 10, 'HIGH', NOW(), NOW(), 'user-pm-001'),
    ('epic-001-04', 'proj-001', '보안 인프라 구축', '데이터 암호화 및 접근 제어 시스템', 'DRAFT', '보안 인증 심사 통과', 'user-dev-003', '2026-06-01', 100, 13, 3, 'phase-001-04', '#8B5CF6', 5, 'CRITICAL', NOW(), NOW(), 'user-pm-001'),
    ('epic-001-05', 'proj-001', '통합 테스트 프레임워크', 'E2E 테스트 및 성능 테스트 자동화', 'DRAFT', '테스트 커버리지 90% 달성', 'user-qa-001', '2026-06-15', 70, 18, 4, 'phase-001-05', '#F59E0B', 0, 'HIGH', NOW(), NOW(), 'user-pm-001'),
    ('epic-001-06', 'proj-001', '운영 배포 및 모니터링', '운영 환경 구축 및 모니터링 시스템', 'DRAFT', '무중단 배포 환경 구축', 'user-dev-001', '2026-06-30', 85, 15, 3, 'phase-001-06', '#6366F1', 0, 'MEDIUM', NOW(), NOW(), 'user-pm-001'),

    -- Project 2 Epics
    ('epic-002-01', 'proj-002', '사용자 경험 설계', '모바일 앱 UX/UI 디자인', 'ACTIVE', '사용자 만족도 4.5점 이상', 'user-ba-001', '2026-03-31', 85, 13, 3, 'phase-002-02', '#EC4899', 25, 'HIGH', NOW(), NOW(), 'user-pm-002'),
    ('epic-002-02', 'proj-002', '모바일 앱 개발', 'iOS/Android 네이티브 앱 개발', 'DRAFT', 'MVP 1.0 출시', 'user-dev-001', '2026-06-30', 90, 40, 8, 'phase-002-03', '#14B8A6', 5, 'CRITICAL', NOW(), NOW(), 'user-pm-002'),
    ('epic-002-03', 'proj-002', '백엔드 API 시스템', '모바일 전용 백엔드 API', 'DRAFT', 'API 응답속도 200ms 이하', 'user-dev-003', '2026-06-15', 80, 21, 5, 'phase-002-04', '#F97316', 0, 'HIGH', NOW(), NOW(), 'user-pm-002')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, progress = EXCLUDED.progress;

-- ============================================
-- 2. FEATURES (project.features) - Linked to Epics
-- ============================================
INSERT INTO project.features (id, epic_id, name, description, status, priority, order_num, created_at, updated_at, created_by)
VALUES
    -- Epic 1 Features (Document Processing)
    ('feat-001-01', 'epic-001-01', 'OCR 엔진 통합', '다중 OCR 엔진 통합 및 앙상블 처리', 'IN_PROGRESS', 'CRITICAL', 1, NOW(), NOW(), 'user-pm-001'),
    ('feat-001-02', 'epic-001-01', '문서 분류 AI', '보험 문서 유형 자동 분류', 'IN_PROGRESS', 'HIGH', 2, NOW(), NOW(), 'user-pm-001'),
    ('feat-001-03', 'epic-001-01', '텍스트 추출 최적화', '비정형 문서 텍스트 추출 개선', 'OPEN', 'HIGH', 3, NOW(), NOW(), 'user-pm-001'),

    -- Epic 2 Features (Fraud Detection)
    ('feat-002-01', 'epic-001-02', '이상치 탐지 모델', '비정상 패턴 탐지 ML 모델', 'IN_PROGRESS', 'CRITICAL', 1, NOW(), NOW(), 'user-pm-001'),
    ('feat-002-02', 'epic-001-02', '규칙 기반 검증', '규정 기반 사기 검증 로직', 'OPEN', 'HIGH', 2, NOW(), NOW(), 'user-pm-001'),
    ('feat-002-03', 'epic-001-02', '사기 점수 대시보드', '실시간 사기 위험 시각화', 'OPEN', 'MEDIUM', 3, NOW(), NOW(), 'user-pm-001'),

    -- Epic 3 Features (API Platform)
    ('feat-003-01', 'epic-001-03', '청구 관리 API', '보험 청구 CRUD API', 'OPEN', 'HIGH', 1, NOW(), NOW(), 'user-pm-001'),
    ('feat-003-02', 'epic-001-03', '인증/인가 서비스', 'OAuth2 기반 인증 시스템', 'OPEN', 'CRITICAL', 2, NOW(), NOW(), 'user-pm-001'),

    -- Epic 4 Features (Security)
    ('feat-004-01', 'epic-001-04', '데이터 암호화', 'AES-256 암호화 구현', 'OPEN', 'CRITICAL', 1, NOW(), NOW(), 'user-pm-001'),
    ('feat-004-02', 'epic-001-04', '감사 로깅', '보안 감사 로그 시스템', 'OPEN', 'HIGH', 2, NOW(), NOW(), 'user-pm-001'),

    -- Project 2 Features
    ('feat-005-01', 'epic-002-01', '온보딩 화면 설계', '신규 사용자 온보딩 UX', 'IN_PROGRESS', 'HIGH', 1, NOW(), NOW(), 'user-pm-002'),
    ('feat-005-02', 'epic-002-01', '대시보드 UI', '메인 대시보드 인터페이스', 'OPEN', 'HIGH', 2, NOW(), NOW(), 'user-pm-002'),
    ('feat-006-01', 'epic-002-02', 'iOS 앱 기본 구조', 'iOS Swift 앱 아키텍처', 'OPEN', 'CRITICAL', 1, NOW(), NOW(), 'user-pm-002'),
    ('feat-006-02', 'epic-002-02', 'Android 앱 기본 구조', 'Android Kotlin 앱 아키텍처', 'OPEN', 'CRITICAL', 2, NOW(), NOW(), 'user-pm-002')
ON CONFLICT DO NOTHING;

-- ============================================
-- 3. WBS GROUPS (project.wbs_groups)
-- ============================================
INSERT INTO project.wbs_groups (id, phase_id, code, name, description, status, progress, planned_start_date, planned_end_date, actual_start_date, actual_end_date, weight, order_num, linked_epic_id, created_at, updated_at, created_by)
VALUES
    -- Phase 1: Requirements Analysis (COMPLETED)
    ('wg-001-01-01', 'phase-001-01', '1.1', '요구사항 수집', 'RFP 분석 및 요구사항 수집', 'COMPLETED', 100, '2026-01-15', '2026-01-22', '2026-01-15', '2026-01-21', 40, 1, NULL, NOW(), NOW(), 'user-pm-001'),
    ('wg-001-01-02', 'phase-001-01', '1.2', '이해관계자 분석', '주요 이해관계자 인터뷰 및 분석', 'COMPLETED', 100, '2026-01-20', '2026-01-27', '2026-01-20', '2026-01-26', 30, 2, NULL, NOW(), NOW(), 'user-pm-001'),
    ('wg-001-01-03', 'phase-001-01', '1.3', '요구사항 검증', '요구사항 문서 검토 및 승인', 'COMPLETED', 100, '2026-01-27', '2026-01-31', '2026-01-27', '2026-01-30', 30, 3, NULL, NOW(), NOW(), 'user-pm-001'),

    -- Phase 2: System Design (IN_PROGRESS)
    ('wg-001-02-01', 'phase-001-02', '2.1', '아키텍처 설계', '시스템 아키텍처 및 기술 스택 정의', 'IN_PROGRESS', 75, '2026-02-01', '2026-02-10', '2026-02-01', NULL, 35, 1, NULL, NOW(), NOW(), 'user-pm-001'),
    ('wg-001-02-02', 'phase-001-02', '2.2', '데이터 모델링', '데이터베이스 스키마 및 ERD 설계', 'IN_PROGRESS', 60, '2026-02-08', '2026-02-18', '2026-02-08', NULL, 30, 2, NULL, NOW(), NOW(), 'user-pm-001'),
    ('wg-001-02-03', 'phase-001-02', '2.3', 'API 설계', 'RESTful API 명세 및 인터페이스 정의', 'IN_PROGRESS', 40, '2026-02-15', '2026-02-25', '2026-02-15', NULL, 25, 3, NULL, NOW(), NOW(), 'user-pm-001'),
    ('wg-001-02-04', 'phase-001-02', '2.4', '보안 설계', '보안 아키텍처 및 인증 방식 설계', 'NOT_STARTED', 0, '2026-02-22', '2026-02-28', NULL, NULL, 10, 4, NULL, NOW(), NOW(), 'user-pm-001'),

    -- Phase 3: AI Model Development (NOT_STARTED)
    ('wg-001-03-01', 'phase-001-03', '3.1', 'AI 개발환경 구축', 'ML 개발 인프라 및 파이프라인 구성', 'NOT_STARTED', 0, '2026-03-01', '2026-03-10', NULL, NULL, 20, 1, 'epic-001-01', NOW(), NOW(), 'user-pm-001'),
    ('wg-001-03-02', 'phase-001-03', '3.2', 'OCR 모델 개발', '문서 인식 및 텍스트 추출 모델', 'NOT_STARTED', 0, '2026-03-08', '2026-03-25', NULL, NULL, 30, 2, 'epic-001-01', NOW(), NOW(), 'user-pm-001'),
    ('wg-001-03-03', 'phase-001-03', '3.3', '사기 탐지 모델', '보험 사기 탐지 ML 모델 개발', 'NOT_STARTED', 0, '2026-03-20', '2026-04-10', NULL, NULL, 35, 3, 'epic-001-02', NOW(), NOW(), 'user-pm-001'),
    ('wg-001-03-04', 'phase-001-03', '3.4', '모델 최적화', 'AI 모델 성능 튜닝 및 최적화', 'NOT_STARTED', 0, '2026-04-05', '2026-04-15', NULL, NULL, 15, 4, 'epic-001-02', NOW(), NOW(), 'user-pm-001'),

    -- Phase 4: Backend Development (NOT_STARTED)
    ('wg-001-04-01', 'phase-001-04', '4.1', '핵심 API 개발', '청구 관리 핵심 API 구현', 'NOT_STARTED', 0, '2026-03-15', '2026-04-05', NULL, NULL, 30, 1, 'epic-001-03', NOW(), NOW(), 'user-pm-001'),
    ('wg-001-04-02', 'phase-001-04', '4.2', '인증 서비스', 'OAuth2 인증/인가 서비스 구현', 'NOT_STARTED', 0, '2026-03-25', '2026-04-15', NULL, NULL, 25, 2, 'epic-001-04', NOW(), NOW(), 'user-pm-001'),
    ('wg-001-04-03', 'phase-001-04', '4.3', '외부 연동', '레거시 시스템 연동 어댑터 개발', 'NOT_STARTED', 0, '2026-04-10', '2026-04-30', NULL, NULL, 25, 3, 'epic-001-03', NOW(), NOW(), 'user-pm-001'),
    ('wg-001-04-04', 'phase-001-04', '4.4', '데이터 마이그레이션', '기존 데이터 이관 및 검증', 'NOT_STARTED', 0, '2026-04-25', '2026-05-15', NULL, NULL, 20, 4, NULL, NOW(), NOW(), 'user-pm-001'),

    -- Phase 5: Integration & Testing (NOT_STARTED)
    ('wg-001-05-01', 'phase-001-05', '5.1', '통합 테스트', '시스템 통합 테스트 수행', 'NOT_STARTED', 0, '2026-05-01', '2026-05-20', NULL, NULL, 35, 1, 'epic-001-05', NOW(), NOW(), 'user-pm-001'),
    ('wg-001-05-02', 'phase-001-05', '5.2', '성능 테스트', '부하 테스트 및 성능 최적화', 'NOT_STARTED', 0, '2026-05-15', '2026-06-01', NULL, NULL, 30, 2, 'epic-001-05', NOW(), NOW(), 'user-pm-001'),
    ('wg-001-05-03', 'phase-001-05', '5.3', '보안 테스트', '보안 취약점 점검 및 조치', 'NOT_STARTED', 0, '2026-05-25', '2026-06-10', NULL, NULL, 25, 3, 'epic-001-04', NOW(), NOW(), 'user-pm-001'),
    ('wg-001-05-04', 'phase-001-05', '5.4', 'UAT', '사용자 인수 테스트', 'NOT_STARTED', 0, '2026-06-05', '2026-06-15', NULL, NULL, 10, 4, NULL, NOW(), NOW(), 'user-pm-001'),

    -- Phase 6: Deployment (NOT_STARTED)
    ('wg-001-06-01', 'phase-001-06', '6.1', '운영 환경 구축', '프로덕션 인프라 구성', 'NOT_STARTED', 0, '2026-06-15', '2026-06-22', NULL, NULL, 40, 1, 'epic-001-06', NOW(), NOW(), 'user-pm-001'),
    ('wg-001-06-02', 'phase-001-06', '6.2', '배포 및 오픈', '시스템 배포 및 모니터링 설정', 'NOT_STARTED', 0, '2026-06-20', '2026-06-28', NULL, NULL, 35, 2, 'epic-001-06', NOW(), NOW(), 'user-pm-001'),
    ('wg-001-06-03', 'phase-001-06', '6.3', '교육 및 인수인계', '운영자 교육 및 문서화', 'NOT_STARTED', 0, '2026-06-25', '2026-06-30', NULL, NULL, 25, 3, NULL, NOW(), NOW(), 'user-pm-001'),

    -- Project 2 WBS Groups
    -- Phase 2-1: Market Research (IN_PROGRESS)
    ('wg-002-01-01', 'phase-002-01', '1.1', '시장 분석', '보험 모바일 앱 시장 조사', 'IN_PROGRESS', 50, '2026-02-01', '2026-02-12', '2026-02-01', NULL, 40, 1, NULL, NOW(), NOW(), 'user-pm-002'),
    ('wg-002-01-02', 'phase-002-01', '1.2', '사용자 리서치', '타겟 사용자 인터뷰 및 설문', 'IN_PROGRESS', 30, '2026-02-08', '2026-02-20', '2026-02-08', NULL, 35, 2, NULL, NOW(), NOW(), 'user-pm-002'),
    ('wg-002-01-03', 'phase-002-01', '1.3', '기획 문서화', '제품 요구사항 문서 작성', 'NOT_STARTED', 0, '2026-02-18', '2026-02-28', NULL, NULL, 25, 3, NULL, NOW(), NOW(), 'user-pm-002'),

    -- Phase 2-2: UX/UI Design (NOT_STARTED)
    ('wg-002-02-01', 'phase-002-02', '2.1', 'UX 설계', '사용자 경험 흐름 설계', 'NOT_STARTED', 0, '2026-03-01', '2026-03-15', NULL, NULL, 40, 1, 'epic-002-01', NOW(), NOW(), 'user-pm-002'),
    ('wg-002-02-02', 'phase-002-02', '2.2', 'UI 디자인', '비주얼 디자인 및 디자인 시스템', 'NOT_STARTED', 0, '2026-03-12', '2026-03-28', NULL, NULL, 40, 2, 'epic-002-01', NOW(), NOW(), 'user-pm-002'),
    ('wg-002-02-03', 'phase-002-02', '2.3', '프로토타입', '인터랙티브 프로토타입 제작', 'NOT_STARTED', 0, '2026-03-25', '2026-03-31', NULL, NULL, 20, 3, 'epic-002-01', NOW(), NOW(), 'user-pm-002'),

    -- Phase 2-3: Mobile App Development (NOT_STARTED)
    ('wg-002-03-01', 'phase-002-03', '3.1', 'iOS 개발', 'iOS 네이티브 앱 개발', 'NOT_STARTED', 0, '2026-04-01', '2026-05-31', NULL, NULL, 45, 1, 'epic-002-02', NOW(), NOW(), 'user-pm-002'),
    ('wg-002-03-02', 'phase-002-03', '3.2', 'Android 개발', 'Android 네이티브 앱 개발', 'NOT_STARTED', 0, '2026-04-01', '2026-05-31', NULL, NULL, 45, 2, 'epic-002-02', NOW(), NOW(), 'user-pm-002'),
    ('wg-002-03-03', 'phase-002-03', '3.3', '공통 모듈', '크로스 플랫폼 공통 로직', 'NOT_STARTED', 0, '2026-04-15', '2026-06-15', NULL, NULL, 10, 3, 'epic-002-02', NOW(), NOW(), 'user-pm-002')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, progress = EXCLUDED.progress, status = EXCLUDED.status;

-- ============================================
-- 4. WBS ITEMS (project.wbs_items)
-- ============================================
INSERT INTO project.wbs_items (id, group_id, phase_id, code, name, description, status, progress, planned_start_date, planned_end_date, actual_start_date, actual_end_date, weight, order_num, estimated_hours, actual_hours, assignee_id, created_at, updated_at, created_by)
VALUES
    -- Phase 1, Group 1: Requirements Collection (COMPLETED)
    ('wi-001-01-01-01', 'wg-001-01-01', 'phase-001-01', '1.1.1', 'RFP 문서 분석', 'RFP 문서 상세 분석 및 요구사항 추출', 'COMPLETED', 100, '2026-01-15', '2026-01-18', '2026-01-15', '2026-01-17', 50, 1, 24, 20, 'user-ba-001', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-01-01-02', 'wg-001-01-01', 'phase-001-01', '1.1.2', '기능 요구사항 정의', '기능 요구사항 목록 작성', 'COMPLETED', 100, '2026-01-17', '2026-01-20', '2026-01-17', '2026-01-19', 30, 2, 16, 14, 'user-ba-001', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-01-01-03', 'wg-001-01-01', 'phase-001-01', '1.1.3', '비기능 요구사항 정의', '성능, 보안 등 비기능 요구사항 정의', 'COMPLETED', 100, '2026-01-19', '2026-01-22', '2026-01-19', '2026-01-21', 20, 3, 12, 12, 'user-ba-001', NOW(), NOW(), 'user-pm-001'),

    -- Phase 1, Group 2: Stakeholder Analysis (COMPLETED)
    ('wi-001-01-02-01', 'wg-001-01-02', 'phase-001-01', '1.2.1', '이해관계자 식별', '주요 이해관계자 목록 작성', 'COMPLETED', 100, '2026-01-20', '2026-01-22', '2026-01-20', '2026-01-22', 30, 1, 8, 8, 'user-ba-001', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-01-02-02', 'wg-001-01-02', 'phase-001-01', '1.2.2', '인터뷰 수행', '이해관계자 인터뷰 진행', 'COMPLETED', 100, '2026-01-22', '2026-01-25', '2026-01-22', '2026-01-24', 50, 2, 20, 18, 'user-ba-001', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-01-02-03', 'wg-001-01-02', 'phase-001-01', '1.2.3', '분석 결과 정리', '인터뷰 결과 분석 및 문서화', 'COMPLETED', 100, '2026-01-25', '2026-01-27', '2026-01-25', '2026-01-26', 20, 3, 8, 6, 'user-ba-001', NOW(), NOW(), 'user-pm-001'),

    -- Phase 1, Group 3: Requirements Validation (COMPLETED)
    ('wi-001-01-03-01', 'wg-001-01-03', 'phase-001-01', '1.3.1', '요구사항 검토회의', '요구사항 리뷰 미팅 진행', 'COMPLETED', 100, '2026-01-27', '2026-01-28', '2026-01-27', '2026-01-27', 40, 1, 8, 8, 'user-pm-001', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-01-03-02', 'wg-001-01-03', 'phase-001-01', '1.3.2', '피드백 반영', '검토 의견 반영 및 수정', 'COMPLETED', 100, '2026-01-28', '2026-01-30', '2026-01-28', '2026-01-29', 30, 2, 12, 10, 'user-ba-001', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-01-03-03', 'wg-001-01-03', 'phase-001-01', '1.3.3', '최종 승인', '요구사항 최종 승인 획득', 'COMPLETED', 100, '2026-01-30', '2026-01-31', '2026-01-30', '2026-01-30', 30, 3, 4, 4, 'user-sponsor-001', NOW(), NOW(), 'user-pm-001'),

    -- Phase 2, Group 1: Architecture Design (IN_PROGRESS)
    ('wi-001-02-01-01', 'wg-001-02-01', 'phase-001-02', '2.1.1', '기술 스택 선정', '프레임워크 및 라이브러리 선정', 'COMPLETED', 100, '2026-02-01', '2026-02-03', '2026-02-01', '2026-02-03', 25, 1, 16, 16, 'user-dev-001', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-02-01-02', 'wg-001-02-01', 'phase-001-02', '2.1.2', '시스템 아키텍처', '전체 시스템 아키텍처 설계', 'IN_PROGRESS', 80, '2026-02-03', '2026-02-07', '2026-02-03', NULL, 35, 2, 24, 20, 'user-dev-001', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-02-01-03', 'wg-001-02-01', 'phase-001-02', '2.1.3', '인프라 설계', '클라우드 인프라 아키텍처 설계', 'IN_PROGRESS', 50, '2026-02-06', '2026-02-10', '2026-02-06', NULL, 40, 3, 20, 10, 'user-dev-003', NOW(), NOW(), 'user-pm-001'),

    -- Phase 2, Group 2: Data Modeling (IN_PROGRESS)
    ('wi-001-02-02-01', 'wg-001-02-02', 'phase-001-02', '2.2.1', 'ERD 설계', '엔티티 관계 다이어그램 작성', 'COMPLETED', 100, '2026-02-08', '2026-02-11', '2026-02-08', '2026-02-10', 40, 1, 20, 18, 'user-dev-002', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-02-02-02', 'wg-001-02-02', 'phase-001-02', '2.2.2', '스키마 정의', '데이터베이스 스키마 상세 정의', 'IN_PROGRESS', 60, '2026-02-11', '2026-02-15', '2026-02-11', NULL, 35, 2, 16, 10, 'user-dev-002', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-02-02-03', 'wg-001-02-02', 'phase-001-02', '2.2.3', '인덱스 설계', '쿼리 최적화를 위한 인덱스 설계', 'NOT_STARTED', 0, '2026-02-15', '2026-02-18', NULL, NULL, 25, 3, 12, 0, 'user-dev-002', NOW(), NOW(), 'user-pm-001'),

    -- Phase 2, Group 3: API Design (IN_PROGRESS)
    ('wi-001-02-03-01', 'wg-001-02-03', 'phase-001-02', '2.3.1', 'API 명세 작성', 'OpenAPI 스펙 문서 작성', 'IN_PROGRESS', 70, '2026-02-15', '2026-02-19', '2026-02-15', NULL, 50, 1, 20, 14, 'user-dev-001', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-02-03-02', 'wg-001-02-03', 'phase-001-02', '2.3.2', '에러 코드 정의', '표준 에러 응답 체계 정의', 'NOT_STARTED', 0, '2026-02-19', '2026-02-22', NULL, NULL, 25, 2, 8, 0, 'user-dev-001', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-02-03-03', 'wg-001-02-03', 'phase-001-02', '2.3.3', 'API 검증', 'API 설계 리뷰 및 검증', 'NOT_STARTED', 0, '2026-02-22', '2026-02-25', NULL, NULL, 25, 3, 8, 0, 'user-qa-001', NOW(), NOW(), 'user-pm-001'),

    -- Phase 2, Group 4: Security Design (NOT_STARTED)
    ('wi-001-02-04-01', 'wg-001-02-04', 'phase-001-02', '2.4.1', '인증 방식 설계', 'OAuth2/JWT 인증 아키텍처', 'NOT_STARTED', 0, '2026-02-22', '2026-02-25', NULL, NULL, 50, 1, 16, 0, 'user-dev-003', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-02-04-02', 'wg-001-02-04', 'phase-001-02', '2.4.2', '암호화 설계', '데이터 암호화 전략 수립', 'NOT_STARTED', 0, '2026-02-25', '2026-02-28', NULL, NULL, 50, 2, 12, 0, 'user-dev-003', NOW(), NOW(), 'user-pm-001'),

    -- Phase 3 Items (NOT_STARTED - Sample)
    ('wi-001-03-01-01', 'wg-001-03-01', 'phase-001-03', '3.1.1', 'ML 파이프라인 구축', 'MLOps 파이프라인 설정', 'NOT_STARTED', 0, '2026-03-01', '2026-03-05', NULL, NULL, 50, 1, 24, 0, 'user-dev-002', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-03-01-02', 'wg-001-03-01', 'phase-001-03', '3.1.2', '학습 환경 구성', 'GPU 클러스터 및 학습 환경', 'NOT_STARTED', 0, '2026-03-05', '2026-03-10', NULL, NULL, 50, 2, 20, 0, 'user-dev-002', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-03-02-01', 'wg-001-03-02', 'phase-001-03', '3.2.1', 'OCR 데이터 수집', '학습용 문서 데이터셋 구축', 'NOT_STARTED', 0, '2026-03-08', '2026-03-15', NULL, NULL, 30, 1, 32, 0, 'user-ba-001', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-03-02-02', 'wg-001-03-02', 'phase-001-03', '3.2.2', 'OCR 모델 훈련', 'Transformer 기반 OCR 모델 학습', 'NOT_STARTED', 0, '2026-03-15', '2026-03-25', NULL, NULL, 70, 2, 60, 0, 'user-dev-002', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-03-03-01', 'wg-001-03-03', 'phase-001-03', '3.3.1', '사기 패턴 분석', '과거 사기 케이스 분석', 'NOT_STARTED', 0, '2026-03-20', '2026-03-28', NULL, NULL, 35, 1, 24, 0, 'user-ba-001', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-03-03-02', 'wg-001-03-03', 'phase-001-03', '3.3.2', '탐지 모델 개발', 'XGBoost/Random Forest 앙상블', 'NOT_STARTED', 0, '2026-03-28', '2026-04-10', NULL, NULL, 65, 2, 60, 0, 'user-dev-002', NOW(), NOW(), 'user-pm-001'),

    -- Project 2 Items
    ('wi-002-01-01-01', 'wg-002-01-01', 'phase-002-01', '1.1.1', '경쟁사 앱 분석', '주요 경쟁 앱 기능 비교', 'IN_PROGRESS', 70, '2026-02-01', '2026-02-06', '2026-02-01', NULL, 50, 1, 16, 12, 'user-ba-001', NOW(), NOW(), 'user-pm-002'),
    ('wi-002-01-01-02', 'wg-002-01-01', 'phase-002-01', '1.1.2', '시장 트렌드 조사', '모바일 보험 시장 트렌드', 'IN_PROGRESS', 40, '2026-02-06', '2026-02-12', '2026-02-06', NULL, 50, 2, 20, 8, 'user-ba-001', NOW(), NOW(), 'user-pm-002'),
    ('wi-002-01-02-01', 'wg-002-01-02', 'phase-002-01', '1.2.1', '페르소나 정의', '목표 사용자 페르소나 작성', 'IN_PROGRESS', 50, '2026-02-08', '2026-02-13', '2026-02-08', NULL, 40, 1, 12, 6, 'user-ba-001', NOW(), NOW(), 'user-pm-002'),
    ('wi-002-01-02-02', 'wg-002-01-02', 'phase-002-01', '1.2.2', '사용자 인터뷰', '잠재 사용자 심층 인터뷰', 'NOT_STARTED', 0, '2026-02-13', '2026-02-20', NULL, NULL, 60, 2, 24, 0, 'user-ba-001', NOW(), NOW(), 'user-pm-002')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, progress = EXCLUDED.progress, status = EXCLUDED.status;

-- ============================================
-- 5. WBS TASKS (project.wbs_tasks)
-- ============================================
INSERT INTO project.wbs_tasks (id, item_id, group_id, phase_id, code, name, description, status, progress, weight, order_num, estimated_hours, actual_hours, assignee_id, linked_task_id, created_at, updated_at, created_by)
VALUES
    -- Phase 1, Item 1.1.1 Tasks (COMPLETED)
    ('wt-001-01-01-01-01', 'wi-001-01-01-01', 'wg-001-01-01', 'phase-001-01', '1.1.1.1', 'RFP 문서 수령', 'RFP 원본 문서 확보', 'COMPLETED', 100, 20, 1, 2, 2, 'user-ba-001', 'task-001-01', NOW(), NOW(), 'user-pm-001'),
    ('wt-001-01-01-01-02', 'wi-001-01-01-01', 'wg-001-01-01', 'phase-001-01', '1.1.1.2', 'RFP 구조 분석', '문서 구조 및 섹션 분석', 'COMPLETED', 100, 30, 2, 6, 5, 'user-ba-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-01-01-01-03', 'wi-001-01-01-01', 'wg-001-01-01', 'phase-001-01', '1.1.1.3', '요구사항 추출', '개별 요구사항 항목 추출', 'COMPLETED', 100, 50, 3, 16, 13, 'user-ba-001', NULL, NOW(), NOW(), 'user-pm-001'),

    -- Phase 1, Item 1.1.2 Tasks (COMPLETED)
    ('wt-001-01-01-02-01', 'wi-001-01-01-02', 'wg-001-01-01', 'phase-001-01', '1.1.2.1', '기능 분류', '기능 요구사항 카테고리 분류', 'COMPLETED', 100, 40, 1, 6, 5, 'user-ba-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-01-01-02-02', 'wi-001-01-01-02', 'wg-001-01-01', 'phase-001-01', '1.1.2.2', '우선순위 지정', '기능별 우선순위 결정', 'COMPLETED', 100, 30, 2, 4, 4, 'user-pm-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-01-01-02-03', 'wi-001-01-01-02', 'wg-001-01-01', 'phase-001-01', '1.1.2.3', '문서화', '기능 요구사항 문서 작성', 'COMPLETED', 100, 30, 3, 6, 5, 'user-ba-001', NULL, NOW(), NOW(), 'user-pm-001'),

    -- Phase 2, Item 2.1.1 Tasks (COMPLETED)
    ('wt-001-02-01-01-01', 'wi-001-02-01-01', 'wg-001-02-01', 'phase-001-02', '2.1.1.1', '기술 후보 조사', '사용 가능한 기술 스택 조사', 'COMPLETED', 100, 30, 1, 8, 8, 'user-dev-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-02-01-01-02', 'wi-001-02-01-01', 'wg-001-02-01', 'phase-001-02', '2.1.1.2', '기술 비교 평가', '성능/확장성/비용 비교', 'COMPLETED', 100, 40, 2, 4, 4, 'user-dev-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-02-01-01-03', 'wi-001-02-01-01', 'wg-001-02-01', 'phase-001-02', '2.1.1.3', '최종 선정', '기술 스택 최종 결정', 'COMPLETED', 100, 30, 3, 4, 4, 'user-dev-001', 'task-001-04', NOW(), NOW(), 'user-pm-001'),

    -- Phase 2, Item 2.1.2 Tasks (IN_PROGRESS)
    ('wt-001-02-01-02-01', 'wi-001-02-01-02', 'wg-001-02-01', 'phase-001-02', '2.1.2.1', '컴포넌트 정의', '시스템 컴포넌트 식별', 'COMPLETED', 100, 25, 1, 6, 6, 'user-dev-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-02-01-02-02', 'wi-001-02-01-02', 'wg-001-02-01', 'phase-001-02', '2.1.2.2', '인터페이스 설계', '컴포넌트 간 인터페이스 정의', 'COMPLETED', 100, 25, 2, 8, 8, 'user-dev-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-02-01-02-03', 'wi-001-02-01-02', 'wg-001-02-01', 'phase-001-02', '2.1.2.3', '배포 아키텍처', '배포 및 스케일링 설계', 'IN_PROGRESS', 60, 30, 3, 6, 4, 'user-dev-003', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-02-01-02-04', 'wi-001-02-01-02', 'wg-001-02-01', 'phase-001-02', '2.1.2.4', '아키텍처 문서화', 'ADR 및 설계 문서 작성', 'NOT_STARTED', 0, 20, 4, 4, 0, 'user-dev-001', NULL, NOW(), NOW(), 'user-pm-001'),

    -- Phase 2, Item 2.1.3 Tasks (IN_PROGRESS)
    ('wt-001-02-01-03-01', 'wi-001-02-01-03', 'wg-001-02-01', 'phase-001-02', '2.1.3.1', 'VPC 설계', 'AWS VPC 및 네트워크 설계', 'COMPLETED', 100, 35, 1, 6, 6, 'user-dev-003', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-02-01-03-02', 'wi-001-02-01-03', 'wg-001-02-01', 'phase-001-02', '2.1.3.2', 'EKS 클러스터 설계', 'Kubernetes 클러스터 구성', 'IN_PROGRESS', 40, 40, 2, 8, 3, 'user-dev-003', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-02-01-03-03', 'wi-001-02-01-03', 'wg-001-02-01', 'phase-001-02', '2.1.3.3', 'DR 계획', '재해 복구 계획 수립', 'NOT_STARTED', 0, 25, 3, 6, 0, 'user-dev-003', NULL, NOW(), NOW(), 'user-pm-001'),

    -- Phase 2, Item 2.2.1 Tasks (COMPLETED)
    ('wt-001-02-02-01-01', 'wi-001-02-02-01', 'wg-001-02-02', 'phase-001-02', '2.2.1.1', '엔티티 식별', '핵심 엔티티 도출', 'COMPLETED', 100, 30, 1, 6, 5, 'user-dev-002', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-02-02-01-02', 'wi-001-02-02-01', 'wg-001-02-02', 'phase-001-02', '2.2.1.2', '관계 정의', '엔티티 간 관계 설정', 'COMPLETED', 100, 40, 2, 8, 8, 'user-dev-002', 'task-001-05', NOW(), NOW(), 'user-pm-001'),
    ('wt-001-02-02-01-03', 'wi-001-02-02-01', 'wg-001-02-02', 'phase-001-02', '2.2.1.3', 'ERD 문서화', 'ERD 다이어그램 작성', 'COMPLETED', 100, 30, 3, 6, 5, 'user-dev-002', NULL, NOW(), NOW(), 'user-pm-001'),

    -- Phase 2, Item 2.2.2 Tasks (IN_PROGRESS)
    ('wt-001-02-02-02-01', 'wi-001-02-02-02', 'wg-001-02-02', 'phase-001-02', '2.2.2.1', '테이블 설계', '물리 테이블 스키마 정의', 'COMPLETED', 100, 40, 1, 8, 8, 'user-dev-002', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-02-02-02-02', 'wi-001-02-02-02', 'wg-001-02-02', 'phase-001-02', '2.2.2.2', '제약조건 정의', 'PK, FK, 제약조건 설정', 'IN_PROGRESS', 50, 35, 2, 4, 2, 'user-dev-002', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-02-02-02-03', 'wi-001-02-02-02', 'wg-001-02-02', 'phase-001-02', '2.2.2.3', '마이그레이션 작성', 'DB 마이그레이션 스크립트', 'NOT_STARTED', 0, 25, 3, 4, 0, 'user-dev-002', NULL, NOW(), NOW(), 'user-pm-001'),

    -- Phase 2, Item 2.3.1 Tasks (IN_PROGRESS)
    ('wt-001-02-03-01-01', 'wi-001-02-03-01', 'wg-001-02-03', 'phase-001-02', '2.3.1.1', 'API 엔드포인트 정의', 'REST 엔드포인트 목록 작성', 'COMPLETED', 100, 30, 1, 6, 6, 'user-dev-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-02-03-01-02', 'wi-001-02-03-01', 'wg-001-02-03', 'phase-001-02', '2.3.1.2', 'Request/Response 설계', '요청/응답 스키마 정의', 'COMPLETED', 100, 35, 2, 8, 8, 'user-dev-001', 'task-001-06', NOW(), NOW(), 'user-pm-001'),
    ('wt-001-02-03-01-03', 'wi-001-02-03-01', 'wg-001-02-03', 'phase-001-02', '2.3.1.3', 'OpenAPI 문서화', 'Swagger/OpenAPI 스펙 작성', 'IN_PROGRESS', 40, 35, 3, 6, 2, 'user-dev-001', NULL, NOW(), NOW(), 'user-pm-001'),

    -- Project 2 Tasks
    ('wt-002-01-01-01-01', 'wi-002-01-01-01', 'wg-002-01-01', 'phase-002-01', '1.1.1.1', '앱 다운로드', '경쟁사 앱 설치 및 계정 생성', 'COMPLETED', 100, 20, 1, 2, 2, 'user-ba-001', NULL, NOW(), NOW(), 'user-pm-002'),
    ('wt-002-01-01-01-02', 'wi-002-01-01-01', 'wg-002-01-01', 'phase-002-01', '1.1.1.2', '기능 분석', '핵심 기능 사용 및 분석', 'IN_PROGRESS', 70, 50, 2, 8, 6, 'user-ba-001', 'task-002-01', NOW(), NOW(), 'user-pm-002'),
    ('wt-002-01-01-01-03', 'wi-002-01-01-01', 'wg-002-01-01', 'phase-002-01', '1.1.1.3', '비교표 작성', '기능 비교 매트릭스 작성', 'IN_PROGRESS', 50, 30, 3, 6, 3, 'user-ba-001', NULL, NOW(), NOW(), 'user-pm-002'),
    ('wt-002-01-01-02-01', 'wi-002-01-01-02', 'wg-002-01-01', 'phase-002-01', '1.1.2.1', '리포트 조사', '시장 조사 리포트 수집', 'IN_PROGRESS', 60, 40, 1, 8, 5, 'user-ba-001', NULL, NOW(), NOW(), 'user-pm-002'),
    ('wt-002-01-01-02-02', 'wi-002-01-01-02', 'wg-002-01-01', 'phase-002-01', '1.1.2.2', '트렌드 분석', '주요 트렌드 분석 및 정리', 'IN_PROGRESS', 30, 35, 2, 8, 2, 'user-ba-001', NULL, NOW(), NOW(), 'user-pm-002'),
    ('wt-002-01-01-02-03', 'wi-002-01-01-02', 'wg-002-01-01', 'phase-002-01', '1.1.2.3', '기회 식별', '시장 기회 및 갭 분석', 'NOT_STARTED', 0, 25, 3, 4, 0, 'user-ba-001', NULL, NOW(), NOW(), 'user-pm-002'),
    ('wt-002-01-02-01-01', 'wi-002-01-02-01', 'wg-002-01-02', 'phase-002-01', '1.2.1.1', '세그먼트 정의', '사용자 세그먼트 분류', 'COMPLETED', 100, 40, 1, 4, 4, 'user-ba-001', NULL, NOW(), NOW(), 'user-pm-002'),
    ('wt-002-01-02-01-02', 'wi-002-01-02-01', 'wg-002-01-02', 'phase-002-01', '1.2.1.2', '페르소나 작성', '상세 페르소나 문서 작성', 'IN_PROGRESS', 30, 60, 2, 8, 2, 'user-ba-001', 'task-002-02', NOW(), NOW(), 'user-pm-002')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, progress = EXCLUDED.progress, status = EXCLUDED.status;

-- ============================================
-- 6. WBS ITEM - STORY LINKS (project.wbs_item_story_links)
-- ============================================
INSERT INTO project.wbs_item_story_links (id, wbs_item_id, story_id, linked_at, linked_by)
VALUES
    ('wisl-001', 'wi-001-01-01-01', 'story-001-01', NOW(), 'user-pm-001'),
    ('wisl-002', 'wi-001-02-01-02', 'story-001-02', NOW(), 'user-pm-001'),
    ('wisl-003', 'wi-001-02-03-01', 'story-001-03', NOW(), 'user-pm-001'),
    ('wisl-004', 'wi-001-02-04-02', 'story-001-04', NOW(), 'user-pm-001'),
    ('wisl-005', 'wi-002-01-02-01', 'story-002-01', NOW(), 'user-pm-002')
ON CONFLICT (wbs_item_id, story_id) DO NOTHING;

-- ============================================
-- 7. Update User Stories with WBS Item Links
-- ============================================
UPDATE task.user_stories SET wbs_item_id = 'wi-001-01-01-01' WHERE id = 'story-001-01';
UPDATE task.user_stories SET wbs_item_id = 'wi-001-02-01-02' WHERE id = 'story-001-02';
UPDATE task.user_stories SET wbs_item_id = 'wi-001-02-03-01' WHERE id = 'story-001-03';
UPDATE task.user_stories SET wbs_item_id = 'wi-001-02-04-02' WHERE id = 'story-001-04';
UPDATE task.user_stories SET wbs_item_id = 'wi-002-01-02-01' WHERE id = 'story-002-01';

-- ============================================
-- 8. Update Features with WBS Group Links
-- ============================================
UPDATE project.features SET wbs_group_id = 'wg-001-03-02' WHERE id = 'feat-001-01';
UPDATE project.features SET wbs_group_id = 'wg-001-03-02' WHERE id = 'feat-001-02';
UPDATE project.features SET wbs_group_id = 'wg-001-03-03' WHERE id = 'feat-002-01';
UPDATE project.features SET wbs_group_id = 'wg-001-03-03' WHERE id = 'feat-002-02';
UPDATE project.features SET wbs_group_id = 'wg-001-04-01' WHERE id = 'feat-003-01';
UPDATE project.features SET wbs_group_id = 'wg-001-04-02' WHERE id = 'feat-004-01';
UPDATE project.features SET wbs_group_id = 'wg-002-02-01' WHERE id = 'feat-005-01';
UPDATE project.features SET wbs_group_id = 'wg-002-02-02' WHERE id = 'feat-005-02';
UPDATE project.features SET wbs_group_id = 'wg-002-03-01' WHERE id = 'feat-006-01';
UPDATE project.features SET wbs_group_id = 'wg-002-03-02' WHERE id = 'feat-006-02';

-- ============================================
-- 9. Additional User Stories for Better Test Coverage
-- ============================================
INSERT INTO task.user_stories (id, project_id, title, description, priority, status, story_points, sprint_id, epic, wbs_item_id, created_at, updated_at)
VALUES
    -- More stories for Project 1
    ('story-001-05', 'proj-001', 'AI 모델 훈련 환경 구축', 'AI 엔지니어로서, GPU 클러스터에서 모델을 훈련할 수 있는 환경이 필요합니다', 'HIGH', 'BACKLOG', 8, NULL, 'AI 개발', 'wi-001-03-01-01', NOW(), NOW()),
    ('story-001-06', 'proj-001', 'OCR 정확도 검증', 'QA 담당자로서, OCR 정확도가 99% 이상인지 검증할 수 있어야 합니다', 'HIGH', 'BACKLOG', 5, NULL, '품질 보증', 'wi-001-03-02-02', NOW(), NOW()),
    ('story-001-07', 'proj-001', '레거시 시스템 연동 어댑터', '개발자로서, 기존 보험증권 시스템과 데이터를 주고받을 수 있어야 합니다', 'CRITICAL', 'BACKLOG', 13, NULL, '시스템 연동', NULL, NOW(), NOW()),
    ('story-001-08', 'proj-001', '배포 자동화 파이프라인', 'DevOps 엔지니어로서, CI/CD 파이프라인을 통해 자동 배포할 수 있어야 합니다', 'MEDIUM', 'BACKLOG', 8, NULL, 'DevOps', NULL, NOW(), NOW()),

    -- More stories for Project 2
    ('story-002-02', 'proj-002', '로그인 화면 구현', '사용자로서, 생체인식 또는 비밀번호로 앱에 로그인할 수 있어야 합니다', 'CRITICAL', 'BACKLOG', 5, NULL, '인증', NULL, NOW(), NOW()),
    ('story-002-03', 'proj-002', '보험증권 목록 조회', '사용자로서, 내 보험증권 목록을 대시보드에서 한눈에 볼 수 있어야 합니다', 'HIGH', 'BACKLOG', 8, NULL, 'UI/UX', NULL, NOW(), NOW()),
    ('story-002-04', 'proj-002', '청구 제출 기능', '사용자로서, 모바일에서 사진과 함께 보험 청구를 제출할 수 있어야 합니다', 'CRITICAL', 'BACKLOG', 13, NULL, '청구 관리', NULL, NOW(), NOW()),
    ('story-002-05', 'proj-002', '푸시 알림 수신', '사용자로서, 청구 상태가 변경되면 푸시 알림을 받을 수 있어야 합니다', 'MEDIUM', 'BACKLOG', 5, NULL, '알림', NULL, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, wbs_item_id = EXCLUDED.wbs_item_id;

-- ============================================
-- 10. Additional Sprints for Test Coverage
-- ============================================
INSERT INTO task.sprints (id, project_id, name, goal, status, start_date, end_date, enable_wip_validation, conwip_limit, created_at, updated_at)
VALUES
    ('sprint-001-04', 'proj-001', '스프린트 4 - AI 모델 기초', 'OCR 데이터 수집 및 기초 모델 개발', 'PLANNED', '2026-03-01', '2026-03-14', true, 15, NOW(), NOW()),
    ('sprint-001-05', 'proj-001', '스프린트 5 - AI 모델 훈련', 'OCR/사기탐지 모델 훈련 및 검증', 'PLANNED', '2026-03-15', '2026-03-28', true, 15, NOW(), NOW()),
    ('sprint-002-02', 'proj-002', '스프린트 2 - UX 설계', 'UX 리서치 완료 및 와이어프레임', 'PLANNED', '2026-02-15', '2026-02-28', true, 12, NOW(), NOW()),
    ('sprint-002-03', 'proj-002', '스프린트 3 - UI 디자인', 'UI 디자인 및 프로토타입', 'PLANNED', '2026-03-01', '2026-03-14', true, 12, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, goal = EXCLUDED.goal;

-- ============================================
-- 11. Additional Tasks for Assignee Coverage
-- ============================================
INSERT INTO task.tasks (id, column_id, phase_id, title, description, assignee_id, priority, status, due_date, order_num, tags, track_type, user_story_id, created_at, updated_at)
VALUES
    -- Tasks for QA (user-qa-001)
    ('task-001-13', 'col-001-01', 'phase-001-05', '테스트 계획서 작성', '통합 테스트 및 성능 테스트 계획서 작성', 'user-qa-001', 'HIGH', 'TODO', '2026-05-05', 5, 'qa,testing,planning', 'COMMON', NULL, NOW(), NOW()),
    ('task-001-14', 'col-001-01', 'phase-001-05', '테스트 케이스 설계', 'E2E 테스트 케이스 설계 및 문서화', 'user-qa-001', 'HIGH', 'TODO', '2026-05-10', 6, 'qa,testcase', 'COMMON', NULL, NOW(), NOW()),
    ('task-001-15', 'col-001-01', 'phase-001-05', '자동화 테스트 환경 구축', 'Selenium/Playwright 기반 자동화 환경', 'user-qa-001', 'MEDIUM', 'TODO', '2026-05-15', 7, 'qa,automation', 'COMMON', NULL, NOW(), NOW()),

    -- Tasks for BA (user-ba-001)
    ('task-001-16', 'col-001-01', 'phase-001-03', 'AI 학습 데이터 라벨링', '문서 분류를 위한 학습 데이터 라벨링', 'user-ba-001', 'HIGH', 'TODO', '2026-03-15', 8, 'ai,data,labeling', 'AI', NULL, NOW(), NOW()),
    ('task-001-17', 'col-001-01', 'phase-001-03', '사기 패턴 데이터 분석', '과거 사기 사례 데이터 분석 및 패턴 추출', 'user-ba-001', 'CRITICAL', 'TODO', '2026-03-25', 9, 'ai,fraud,analysis', 'AI', NULL, NOW(), NOW()),

    -- Tasks for PM (user-pm-001)
    ('task-001-18', 'col-001-02', 'phase-001-02', '설계 검토 회의 주관', '아키텍처 설계 리뷰 미팅 진행', 'user-pm-001', 'HIGH', 'TODO', '2026-02-12', 3, 'meeting,review', 'COMMON', NULL, NOW(), NOW()),
    ('task-001-19', 'col-001-02', 'phase-001-05', 'UAT 계획 수립', '사용자 인수 테스트 일정 및 시나리오 계획', 'user-pm-001', 'HIGH', 'TODO', '2026-06-01', 4, 'uat,planning', 'COMMON', NULL, NOW(), NOW()),

    -- Tasks for Sponsor (user-sponsor-001)
    ('task-001-20', 'col-001-02', 'phase-001-06', '오픈 승인', '운영 환경 배포 최종 승인', 'user-sponsor-001', 'CRITICAL', 'TODO', '2026-06-25', 5, 'approval,deployment', 'COMMON', NULL, NOW(), NOW()),

    -- More tasks for Project 2
    ('task-002-09', 'col-002-01', 'phase-002-02', '디자인 시스템 구축', 'Figma 기반 디자인 시스템 설정', NULL, 'HIGH', 'TODO', '2026-03-15', 5, 'design,figma', 'COMMON', NULL, NOW(), NOW()),
    ('task-002-10', 'col-002-01', 'phase-002-03', 'API 클라이언트 구현', 'iOS/Android 공통 API 클라이언트 모듈', 'user-dev-001', 'HIGH', 'TODO', '2026-04-20', 6, 'mobile,api', 'SI', NULL, NOW(), NOW()),
    ('task-002-11', 'col-002-01', 'phase-002-04', '푸시 알림 서비스', 'Firebase 기반 푸시 알림 백엔드', 'user-dev-003', 'MEDIUM', 'TODO', '2026-05-15', 7, 'backend,push', 'SI', NULL, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, assignee_id = EXCLUDED.assignee_id;

-- ============================================
-- 12. Backlogs and Backlog Items
-- ============================================
INSERT INTO project.backlogs (id, project_id, name, description, status, created_at, updated_at, created_by)
VALUES
    ('backlog-001', 'proj-001', 'AI 보험심사 Product Backlog', 'AI 보험심사 처리 시스템의 제품 백로그', 'ACTIVE', NOW(), NOW(), 'user-pm-001'),
    ('backlog-002', 'proj-002', '모바일 보험 Product Backlog', '모바일 보험 플랫폼의 제품 백로그', 'ACTIVE', NOW(), NOW(), 'user-pm-002')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO project.backlog_items (id, backlog_id, requirement_id, origin_type, epic_id_ref, priority_order, status, story_points, estimated_effort_hours, acceptance_criteria, created_at, updated_at, created_by)
VALUES
    -- Project 1 Backlog Items
    ('bi-001-01', 'backlog-001', 'req-001-01', 'REQUIREMENT', 'epic-001-01', 1, 'SPRINT', 8, 40, '1. OCR 정확도 99% 이상\n2. 처리 시간 2초 이내\n3. 다양한 문서 형식 지원', NOW(), NOW(), 'user-pm-001'),
    ('bi-001-02', 'backlog-001', 'req-001-02', 'REQUIREMENT', 'epic-001-02', 2, 'SELECTED', 13, 60, '1. 사기 탐지율 95% 이상\n2. 오탐률 5% 이하\n3. 실시간 점수 산출', NOW(), NOW(), 'user-pm-001'),
    ('bi-001-03', 'backlog-001', 'req-001-03', 'REQUIREMENT', 'epic-001-03', 3, 'BACKLOG', 8, 32, '1. RESTful API 설계\n2. OpenAPI 문서화\n3. 인증 토큰 지원', NOW(), NOW(), 'user-pm-001'),
    ('bi-001-04', 'backlog-001', 'req-001-04', 'REQUIREMENT', 'epic-001-03', 4, 'BACKLOG', 13, 48, '1. ESB 연동 완료\n2. 데이터 동기화 검증\n3. 에러 핸들링 완비', NOW(), NOW(), 'user-pm-001'),
    ('bi-001-05', 'backlog-001', 'req-001-05', 'REQUIREMENT', 'epic-001-04', 5, 'BACKLOG', 5, 24, '1. AES-256 암호화 적용\n2. TLS 1.3 적용\n3. 암호화 키 관리 정책 수립', NOW(), NOW(), 'user-pm-001'),
    ('bi-001-06', 'backlog-001', 'req-001-06', 'REQUIREMENT', 'epic-001-05', 6, 'BACKLOG', 8, 32, '1. 1000 동시 사용자 지원\n2. 응답 시간 2초 이내\n3. CPU 사용률 70% 이하', NOW(), NOW(), 'user-pm-001'),

    -- Project 2 Backlog Items
    ('bi-002-01', 'backlog-002', 'req-002-01', 'REQUIREMENT', 'epic-002-02', 1, 'BACKLOG', 5, 20, '1. 생체인식 지원\n2. PIN 번호 지원\n3. 자동 로그아웃', NOW(), NOW(), 'user-pm-002'),
    ('bi-002-02', 'backlog-002', 'req-002-02', 'REQUIREMENT', 'epic-002-01', 2, 'BACKLOG', 8, 32, '1. 보험증권 목록 표시\n2. 상세 정보 조회\n3. 갱신일 알림', NOW(), NOW(), 'user-pm-002'),
    ('bi-002-03', 'backlog-002', 'req-002-03', 'REQUIREMENT', 'epic-002-02', 3, 'BACKLOG', 13, 48, '1. 사진 첨부 기능\n2. 청구서 자동 작성\n3. 제출 확인 알림', NOW(), NOW(), 'user-pm-002'),
    ('bi-002-04', 'backlog-002', 'req-002-04', 'REQUIREMENT', 'epic-002-02', 4, 'BACKLOG', 5, 16, '1. 실시간 푸시 알림\n2. 알림 설정 관리\n3. 알림 히스토리', NOW(), NOW(), 'user-pm-002'),
    ('bi-002-05', 'backlog-002', 'req-002-05', 'REQUIREMENT', 'epic-002-02', 5, 'BACKLOG', 8, 40, '1. 오프라인 데이터 캐시\n2. 연결 복구 시 동기화\n3. 충돌 해결 로직', NOW(), NOW(), 'user-pm-002')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, priority_order = EXCLUDED.priority_order;

-- ============================================
-- 13. Update Requirements with Story Points and Progress
-- ============================================
UPDATE project.requirements SET story_points = 8, progress = 60 WHERE id = 'req-001-01';
UPDATE project.requirements SET story_points = 13, progress = 30 WHERE id = 'req-001-02';
UPDATE project.requirements SET story_points = 8, progress = 0 WHERE id = 'req-001-03';
UPDATE project.requirements SET story_points = 13, progress = 0 WHERE id = 'req-001-04';
UPDATE project.requirements SET story_points = 5, progress = 0 WHERE id = 'req-001-05';
UPDATE project.requirements SET story_points = 8, progress = 0 WHERE id = 'req-001-06';
UPDATE project.requirements SET story_points = 5, progress = 0 WHERE id = 'req-002-01';
UPDATE project.requirements SET story_points = 8, progress = 0 WHERE id = 'req-002-02';
UPDATE project.requirements SET story_points = 13, progress = 0 WHERE id = 'req-002-03';
UPDATE project.requirements SET story_points = 5, progress = 0 WHERE id = 'req-002-04';
UPDATE project.requirements SET story_points = 8, progress = 0 WHERE id = 'req-002-05';

-- ============================================
-- 14. Update Project Progress
-- ============================================
UPDATE project.projects SET progress = 32 WHERE id = 'proj-001';
UPDATE project.projects SET progress = 12 WHERE id = 'proj-002';

-- ============================================
-- Summary of Mock Data:
-- ============================================
-- Users: 18 (existing) + Frontend Demo Users
-- Projects: 2
-- Phases: 12 (6 per project)
-- Epics: 9 (6 for proj-001, 3 for proj-002)
-- Features: 15
-- WBS Groups: 21 (15 for proj-001, 6 for proj-002)
-- WBS Items: 30
-- WBS Tasks: 47
-- User Stories: 13
-- Sprints: 8
-- Tasks: 31
-- RFPs: 2
-- Requirements: 11
-- Backlogs: 2
-- Backlog Items: 11
-- Project Members: 25
-- Parts: 6
--
-- Coverage by Role:
-- - SPONSOR: Project approval, Final sign-off tasks
-- - PMO_HEAD: Overall project oversight
-- - PM: Project management, Meeting facilitation, UAT planning
-- - DEVELOPER: Architecture, API, AI model, Backend development
-- - QA: Test planning, Test automation, Quality assurance
-- - BUSINESS_ANALYST: Requirements, User research, Data labeling
-- - AUDITOR: External audit tasks
-- - ADMIN: System administration
--
-- Progress Distribution:
-- - Phase 1 (Requirements): 100% complete
-- - Phase 2 (Design): 60% complete (mixed status items)
-- - Phase 3-6: 0% (NOT_STARTED)
-- - Various WBS items with progress: 0%, 30%, 40%, 50%, 60%, 70%, 80%, 100%
-- ============================================


-- ============================================================
-- Source: V20260202__complete_wbs_tasks_by_role
-- ============================================================
-- Complete WBS Tasks Mock Data by Role
-- Version: 20260202
-- Description: Comprehensive WBS Task data covering all user roles
-- Coverage: SPONSOR, PMO_HEAD, PM, DEVELOPER, QA, BUSINESS_ANALYST, AUDITOR, ADMIN

-- ============================================
-- Phase 1 (Requirements) - Remaining Tasks
-- ============================================

-- Item 1.1.3: Non-functional Requirements Definition (COMPLETED)
INSERT INTO project.wbs_tasks (id, item_id, group_id, phase_id, code, name, description, status, progress, weight, order_num, estimated_hours, actual_hours, assignee_id, linked_task_id, created_at, updated_at, created_by)
VALUES
    ('wt-001-01-01-03-01', 'wi-001-01-01-03', 'wg-001-01-01', 'phase-001-01', '1.1.3.1', '성능 요구사항 정의', '응답시간, 처리량 등 성능 기준 정의', 'COMPLETED', 100, 35, 1, 6, 5, 'user-ba-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-01-01-03-02', 'wi-001-01-01-03', 'wg-001-01-01', 'phase-001-01', '1.1.3.2', '보안 요구사항 정의', '데이터 보호, 접근제어 요구사항', 'COMPLETED', 100, 35, 2, 4, 4, 'user-dev-003', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-01-01-03-03', 'wi-001-01-01-03', 'wg-001-01-01', 'phase-001-01', '1.1.3.3', '비기능 요구사항 문서화', '비기능 요구사항 명세서 작성', 'COMPLETED', 100, 30, 3, 4, 3, 'user-ba-001', NULL, NOW(), NOW(), 'user-pm-001')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, progress = EXCLUDED.progress;

-- Item 1.2.1: Stakeholder Identification (COMPLETED)
INSERT INTO project.wbs_tasks (id, item_id, group_id, phase_id, code, name, description, status, progress, weight, order_num, estimated_hours, actual_hours, assignee_id, linked_task_id, created_at, updated_at, created_by)
VALUES
    ('wt-001-01-02-01-01', 'wi-001-01-02-01', 'wg-001-01-02', 'phase-001-01', '1.2.1.1', '조직도 분석', '고객사 조직 구조 파악', 'COMPLETED', 100, 30, 1, 2, 2, 'user-ba-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-01-02-01-02', 'wi-001-01-02-01', 'wg-001-01-02', 'phase-001-01', '1.2.1.2', '핵심 이해관계자 선정', '주요 의사결정자 식별', 'COMPLETED', 100, 40, 2, 3, 3, 'user-pm-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-01-02-01-03', 'wi-001-01-02-01', 'wg-001-01-02', 'phase-001-01', '1.2.1.3', '커뮤니케이션 계획 수립', '이해관계자별 소통 방안', 'COMPLETED', 100, 30, 3, 3, 3, 'user-pm-001', NULL, NOW(), NOW(), 'user-pm-001')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, progress = EXCLUDED.progress;

-- Item 1.2.2: Interview Execution (COMPLETED)
INSERT INTO project.wbs_tasks (id, item_id, group_id, phase_id, code, name, description, status, progress, weight, order_num, estimated_hours, actual_hours, assignee_id, linked_task_id, created_at, updated_at, created_by)
VALUES
    ('wt-001-01-02-02-01', 'wi-001-01-02-02', 'wg-001-01-02', 'phase-001-01', '1.2.2.1', '인터뷰 질문지 작성', '이해관계자별 인터뷰 질문 준비', 'COMPLETED', 100, 25, 1, 4, 4, 'user-ba-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-01-02-02-02', 'wi-001-01-02-02', 'wg-001-01-02', 'phase-001-01', '1.2.2.2', '경영진 인터뷰', 'SPONSOR/경영진 인터뷰 진행', 'COMPLETED', 100, 30, 2, 6, 5, 'user-sponsor-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-01-02-02-03', 'wi-001-01-02-02', 'wg-001-01-02', 'phase-001-01', '1.2.2.3', '현업 담당자 인터뷰', '실무자 요구사항 청취', 'COMPLETED', 100, 25, 3, 8, 7, 'user-ba-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-01-02-02-04', 'wi-001-01-02-02', 'wg-001-01-02', 'phase-001-01', '1.2.2.4', '인터뷰 결과 기록', '인터뷰 내용 문서화', 'COMPLETED', 100, 20, 4, 4, 4, 'user-ba-001', NULL, NOW(), NOW(), 'user-pm-001')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, progress = EXCLUDED.progress;

-- Item 1.2.3: Analysis Result Documentation (COMPLETED)
INSERT INTO project.wbs_tasks (id, item_id, group_id, phase_id, code, name, description, status, progress, weight, order_num, estimated_hours, actual_hours, assignee_id, linked_task_id, created_at, updated_at, created_by)
VALUES
    ('wt-001-01-02-03-01', 'wi-001-01-02-03', 'wg-001-01-02', 'phase-001-01', '1.2.3.1', '분석 데이터 정리', '수집된 인터뷰 데이터 정리', 'COMPLETED', 100, 35, 1, 3, 3, 'user-ba-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-01-02-03-02', 'wi-001-01-02-03', 'wg-001-01-02', 'phase-001-01', '1.2.3.2', '이해관계자 매핑', '영향력-관심도 매트릭스 작성', 'COMPLETED', 100, 35, 2, 3, 2, 'user-pm-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-01-02-03-03', 'wi-001-01-02-03', 'wg-001-01-02', 'phase-001-01', '1.2.3.3', '분석 보고서 작성', '이해관계자 분석 보고서', 'COMPLETED', 100, 30, 3, 4, 3, 'user-ba-001', NULL, NOW(), NOW(), 'user-pm-001')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, progress = EXCLUDED.progress;

-- Item 1.3.1: Requirements Review Meeting (COMPLETED)
INSERT INTO project.wbs_tasks (id, item_id, group_id, phase_id, code, name, description, status, progress, weight, order_num, estimated_hours, actual_hours, assignee_id, linked_task_id, created_at, updated_at, created_by)
VALUES
    ('wt-001-01-03-01-01', 'wi-001-01-03-01', 'wg-001-01-03', 'phase-001-01', '1.3.1.1', '검토회의 준비', '회의 자료 및 아젠다 준비', 'COMPLETED', 100, 30, 1, 3, 3, 'user-pm-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-01-03-01-02', 'wi-001-01-03-01', 'wg-001-01-03', 'phase-001-01', '1.3.1.2', '요구사항 프레젠테이션', 'PMO 및 SPONSOR에게 요구사항 발표', 'COMPLETED', 100, 40, 2, 4, 4, 'user-pmo-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-01-03-01-03', 'wi-001-01-03-01', 'wg-001-01-03', 'phase-001-01', '1.3.1.3', '검토 의견 수렴', '참석자 의견 및 질문 정리', 'COMPLETED', 100, 30, 3, 2, 2, 'user-ba-001', NULL, NOW(), NOW(), 'user-pm-001')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, progress = EXCLUDED.progress;

-- Item 1.3.2: Feedback Reflection (COMPLETED)
INSERT INTO project.wbs_tasks (id, item_id, group_id, phase_id, code, name, description, status, progress, weight, order_num, estimated_hours, actual_hours, assignee_id, linked_task_id, created_at, updated_at, created_by)
VALUES
    ('wt-001-01-03-02-01', 'wi-001-01-03-02', 'wg-001-01-03', 'phase-001-01', '1.3.2.1', '피드백 분류', '피드백 항목별 분류 및 우선순위', 'COMPLETED', 100, 30, 1, 3, 3, 'user-ba-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-01-03-02-02', 'wi-001-01-03-02', 'wg-001-01-03', 'phase-001-01', '1.3.2.2', '요구사항 수정', '피드백 기반 요구사항 갱신', 'COMPLETED', 100, 45, 2, 6, 5, 'user-ba-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-01-03-02-03', 'wi-001-01-03-02', 'wg-001-01-03', 'phase-001-01', '1.3.2.3', '변경 이력 관리', '요구사항 변경 추적', 'COMPLETED', 100, 25, 3, 2, 2, 'user-pm-001', NULL, NOW(), NOW(), 'user-pm-001')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, progress = EXCLUDED.progress;

-- Item 1.3.3: Final Approval (COMPLETED)
INSERT INTO project.wbs_tasks (id, item_id, group_id, phase_id, code, name, description, status, progress, weight, order_num, estimated_hours, actual_hours, assignee_id, linked_task_id, created_at, updated_at, created_by)
VALUES
    ('wt-001-01-03-03-01', 'wi-001-01-03-03', 'wg-001-01-03', 'phase-001-01', '1.3.3.1', '최종 검토 요청', 'SPONSOR에게 최종 승인 요청', 'COMPLETED', 100, 30, 1, 1, 1, 'user-pm-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-01-03-03-02', 'wi-001-01-03-03', 'wg-001-01-03', 'phase-001-01', '1.3.3.2', 'SPONSOR 검토', '경영진 최종 검토', 'COMPLETED', 100, 40, 2, 2, 2, 'user-sponsor-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-01-03-03-03', 'wi-001-01-03-03', 'wg-001-01-03', 'phase-001-01', '1.3.3.3', '승인 문서 서명', '요구사항 명세서 공식 승인', 'COMPLETED', 100, 30, 3, 1, 1, 'user-sponsor-001', NULL, NOW(), NOW(), 'user-pm-001')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, progress = EXCLUDED.progress;

-- ============================================
-- Phase 2 (Design) - Remaining Tasks
-- ============================================

-- Item 2.2.3: Index Design (NOT_STARTED)
INSERT INTO project.wbs_tasks (id, item_id, group_id, phase_id, code, name, description, status, progress, weight, order_num, estimated_hours, actual_hours, assignee_id, linked_task_id, created_at, updated_at, created_by)
VALUES
    ('wt-001-02-02-03-01', 'wi-001-02-02-03', 'wg-001-02-02', 'phase-001-02', '2.2.3.1', '쿼리 패턴 분석', '주요 조회 패턴 분석', 'NOT_STARTED', 0, 35, 1, 4, 0, 'user-dev-002', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-02-02-03-02', 'wi-001-02-02-03', 'wg-001-02-02', 'phase-001-02', '2.2.3.2', '인덱스 전략 수립', '최적 인덱스 설계', 'NOT_STARTED', 0, 40, 2, 6, 0, 'user-dev-002', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-02-02-03-03', 'wi-001-02-02-03', 'wg-001-02-02', 'phase-001-02', '2.2.3.3', '성능 벤치마크', '인덱스 적용 후 성능 측정', 'NOT_STARTED', 0, 25, 3, 4, 0, 'user-qa-001', NULL, NOW(), NOW(), 'user-pm-001')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, progress = EXCLUDED.progress;

-- Item 2.3.2: Error Code Definition (NOT_STARTED)
INSERT INTO project.wbs_tasks (id, item_id, group_id, phase_id, code, name, description, status, progress, weight, order_num, estimated_hours, actual_hours, assignee_id, linked_task_id, created_at, updated_at, created_by)
VALUES
    ('wt-001-02-03-02-01', 'wi-001-02-03-02', 'wg-001-02-03', 'phase-001-02', '2.3.2.1', '에러 분류 체계 설계', '에러 코드 체계 및 분류 정의', 'NOT_STARTED', 0, 40, 1, 4, 0, 'user-dev-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-02-03-02-02', 'wi-001-02-03-02', 'wg-001-02-03', 'phase-001-02', '2.3.2.2', '에러 메시지 정의', '사용자 친화적 에러 메시지 작성', 'NOT_STARTED', 0, 35, 2, 3, 0, 'user-ba-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-02-03-02-03', 'wi-001-02-03-02', 'wg-001-02-03', 'phase-001-02', '2.3.2.3', '에러 핸들링 가이드', '개발자용 에러 처리 가이드라인', 'NOT_STARTED', 0, 25, 3, 3, 0, 'user-dev-001', NULL, NOW(), NOW(), 'user-pm-001')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, progress = EXCLUDED.progress;

-- Item 2.3.3: API Validation (NOT_STARTED)
INSERT INTO project.wbs_tasks (id, item_id, group_id, phase_id, code, name, description, status, progress, weight, order_num, estimated_hours, actual_hours, assignee_id, linked_task_id, created_at, updated_at, created_by)
VALUES
    ('wt-001-02-03-03-01', 'wi-001-02-03-03', 'wg-001-02-03', 'phase-001-02', '2.3.3.1', 'API 스펙 검토', 'OpenAPI 스펙 검토 및 피드백', 'NOT_STARTED', 0, 35, 1, 4, 0, 'user-qa-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-02-03-03-02', 'wi-001-02-03-03', 'wg-001-02-03', 'phase-001-02', '2.3.3.2', '보안 검토', 'API 보안 취약점 사전 검토', 'NOT_STARTED', 0, 40, 2, 4, 0, 'user-dev-003', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-02-03-03-03', 'wi-001-02-03-03', 'wg-001-02-03', 'phase-001-02', '2.3.3.3', '설계 승인', 'PMO API 설계 승인', 'NOT_STARTED', 0, 25, 3, 2, 0, 'user-pmo-001', NULL, NOW(), NOW(), 'user-pm-001')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, progress = EXCLUDED.progress;

-- Item 2.4.1: Authentication Design (NOT_STARTED)
INSERT INTO project.wbs_tasks (id, item_id, group_id, phase_id, code, name, description, status, progress, weight, order_num, estimated_hours, actual_hours, assignee_id, linked_task_id, created_at, updated_at, created_by)
VALUES
    ('wt-001-02-04-01-01', 'wi-001-02-04-01', 'wg-001-02-04', 'phase-001-02', '2.4.1.1', 'OAuth2 플로우 설계', '인증 흐름 상세 설계', 'NOT_STARTED', 0, 35, 1, 6, 0, 'user-dev-003', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-02-04-01-02', 'wi-001-02-04-01', 'wg-001-02-04', 'phase-001-02', '2.4.1.2', 'JWT 토큰 설계', '토큰 구조 및 클레임 정의', 'NOT_STARTED', 0, 35, 2, 6, 0, 'user-dev-003', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-02-04-01-03', 'wi-001-02-04-01', 'wg-001-02-04', 'phase-001-02', '2.4.1.3', 'RBAC 권한 체계 설계', '역할 기반 접근 제어 설계', 'NOT_STARTED', 0, 30, 3, 4, 0, 'user-dev-003', NULL, NOW(), NOW(), 'user-pm-001')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, progress = EXCLUDED.progress;

-- Item 2.4.2: Encryption Design (NOT_STARTED)
INSERT INTO project.wbs_tasks (id, item_id, group_id, phase_id, code, name, description, status, progress, weight, order_num, estimated_hours, actual_hours, assignee_id, linked_task_id, created_at, updated_at, created_by)
VALUES
    ('wt-001-02-04-02-01', 'wi-001-02-04-02', 'wg-001-02-04', 'phase-001-02', '2.4.2.1', '암호화 알고리즘 선정', 'AES-256, RSA 등 알고리즘 결정', 'NOT_STARTED', 0, 35, 1, 4, 0, 'user-dev-003', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-02-04-02-02', 'wi-001-02-04-02', 'wg-001-02-04', 'phase-001-02', '2.4.2.2', '키 관리 정책 수립', '암호화 키 생성/저장/순환 정책', 'NOT_STARTED', 0, 40, 2, 6, 0, 'user-dev-003', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-02-04-02-03', 'wi-001-02-04-02', 'wg-001-02-04', 'phase-001-02', '2.4.2.3', '감사 로그 설계', '보안 감사 로그 구조 설계', 'NOT_STARTED', 0, 25, 3, 4, 0, 'user-dev-003', NULL, NOW(), NOW(), 'user-pm-001')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, progress = EXCLUDED.progress;

-- ============================================
-- Phase 3 (AI Development) - Tasks
-- ============================================

-- Item 3.1.1: ML Pipeline Setup (NOT_STARTED)
INSERT INTO project.wbs_tasks (id, item_id, group_id, phase_id, code, name, description, status, progress, weight, order_num, estimated_hours, actual_hours, assignee_id, linked_task_id, created_at, updated_at, created_by)
VALUES
    ('wt-001-03-01-01-01', 'wi-001-03-01-01', 'wg-001-03-01', 'phase-001-03', '3.1.1.1', 'MLflow 환경 구축', 'ML 실험 추적 플랫폼 설정', 'NOT_STARTED', 0, 35, 1, 8, 0, 'user-dev-002', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-03-01-01-02', 'wi-001-03-01-01', 'wg-001-03-01', 'phase-001-03', '3.1.1.2', '데이터 파이프라인 구축', 'ETL 파이프라인 설계 및 구현', 'NOT_STARTED', 0, 40, 2, 12, 0, 'user-dev-002', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-03-01-01-03', 'wi-001-03-01-01', 'wg-001-03-01', 'phase-001-03', '3.1.1.3', '모델 레지스트리 설정', '모델 버전 관리 시스템 구축', 'NOT_STARTED', 0, 25, 3, 6, 0, 'user-dev-002', NULL, NOW(), NOW(), 'user-pm-001')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, progress = EXCLUDED.progress;

-- Item 3.1.2: Training Environment Setup (NOT_STARTED)
INSERT INTO project.wbs_tasks (id, item_id, group_id, phase_id, code, name, description, status, progress, weight, order_num, estimated_hours, actual_hours, assignee_id, linked_task_id, created_at, updated_at, created_by)
VALUES
    ('wt-001-03-01-02-01', 'wi-001-03-01-02', 'wg-001-03-01', 'phase-001-03', '3.1.2.1', 'GPU 서버 프로비저닝', 'CUDA 환경 GPU 서버 구성', 'NOT_STARTED', 0, 40, 1, 8, 0, 'user-dev-003', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-03-01-02-02', 'wi-001-03-01-02', 'wg-001-03-01', 'phase-001-03', '3.1.2.2', 'Python 환경 설정', 'PyTorch/TensorFlow 환경 구성', 'NOT_STARTED', 0, 35, 2, 6, 0, 'user-dev-002', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-03-01-02-03', 'wi-001-03-01-02', 'wg-001-03-01', 'phase-001-03', '3.1.2.3', '분산 학습 환경 구축', 'Horovod/DDP 멀티 GPU 설정', 'NOT_STARTED', 0, 25, 3, 8, 0, 'user-dev-002', NULL, NOW(), NOW(), 'user-pm-001')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, progress = EXCLUDED.progress;

-- Item 3.2.1: OCR Data Collection (NOT_STARTED)
INSERT INTO project.wbs_tasks (id, item_id, group_id, phase_id, code, name, description, status, progress, weight, order_num, estimated_hours, actual_hours, assignee_id, linked_task_id, created_at, updated_at, created_by)
VALUES
    ('wt-001-03-02-01-01', 'wi-001-03-02-01', 'wg-001-03-02', 'phase-001-03', '3.2.1.1', '샘플 문서 수집', '다양한 보험 문서 샘플 확보', 'NOT_STARTED', 0, 30, 1, 12, 0, 'user-ba-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-03-02-01-02', 'wi-001-03-02-01', 'wg-001-03-02', 'phase-001-03', '3.2.1.2', '데이터 라벨링', '문서 영역 및 텍스트 라벨링', 'NOT_STARTED', 0, 45, 2, 24, 0, 'user-ba-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-03-02-01-03', 'wi-001-03-02-01', 'wg-001-03-02', 'phase-001-03', '3.2.1.3', '데이터 품질 검증', '라벨링 데이터 품질 검토', 'NOT_STARTED', 0, 25, 3, 8, 0, 'user-qa-001', NULL, NOW(), NOW(), 'user-pm-001')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, progress = EXCLUDED.progress;

-- Item 3.2.2: OCR Model Training (NOT_STARTED)
INSERT INTO project.wbs_tasks (id, item_id, group_id, phase_id, code, name, description, status, progress, weight, order_num, estimated_hours, actual_hours, assignee_id, linked_task_id, created_at, updated_at, created_by)
VALUES
    ('wt-001-03-02-02-01', 'wi-001-03-02-02', 'wg-001-03-02', 'phase-001-03', '3.2.2.1', '베이스라인 모델 학습', '초기 OCR 모델 훈련', 'NOT_STARTED', 0, 30, 1, 20, 0, 'user-dev-002', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-03-02-02-02', 'wi-001-03-02-02', 'wg-001-03-02', 'phase-001-03', '3.2.2.2', '하이퍼파라미터 튜닝', '모델 성능 최적화', 'NOT_STARTED', 0, 35, 2, 24, 0, 'user-dev-002', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-03-02-02-03', 'wi-001-03-02-02', 'wg-001-03-02', 'phase-001-03', '3.2.2.3', '모델 평가', '정확도/재현율 평가', 'NOT_STARTED', 0, 20, 3, 8, 0, 'user-qa-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-03-02-02-04', 'wi-001-03-02-02', 'wg-001-03-02', 'phase-001-03', '3.2.2.4', '모델 최종 선정', '운영용 모델 결정', 'NOT_STARTED', 0, 15, 4, 4, 0, 'user-pmo-001', NULL, NOW(), NOW(), 'user-pm-001')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, progress = EXCLUDED.progress;

-- Item 3.3.1: Fraud Pattern Analysis (NOT_STARTED)
INSERT INTO project.wbs_tasks (id, item_id, group_id, phase_id, code, name, description, status, progress, weight, order_num, estimated_hours, actual_hours, assignee_id, linked_task_id, created_at, updated_at, created_by)
VALUES
    ('wt-001-03-03-01-01', 'wi-001-03-03-01', 'wg-001-03-03', 'phase-001-03', '3.3.1.1', '과거 사기 데이터 수집', '역사적 사기 케이스 데이터 확보', 'NOT_STARTED', 0, 30, 1, 8, 0, 'user-ba-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-03-03-01-02', 'wi-001-03-03-01', 'wg-001-03-03', 'phase-001-03', '3.3.1.2', '사기 패턴 식별', '주요 사기 유형 및 패턴 분석', 'NOT_STARTED', 0, 45, 2, 16, 0, 'user-ba-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-03-03-01-03', 'wi-001-03-03-01', 'wg-001-03-03', 'phase-001-03', '3.3.1.3', '피처 엔지니어링', '사기 탐지용 특성 설계', 'NOT_STARTED', 0, 25, 3, 8, 0, 'user-dev-002', NULL, NOW(), NOW(), 'user-pm-001')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, progress = EXCLUDED.progress;

-- Item 3.3.2: Detection Model Development (NOT_STARTED)
INSERT INTO project.wbs_tasks (id, item_id, group_id, phase_id, code, name, description, status, progress, weight, order_num, estimated_hours, actual_hours, assignee_id, linked_task_id, created_at, updated_at, created_by)
VALUES
    ('wt-001-03-03-02-01', 'wi-001-03-03-02', 'wg-001-03-03', 'phase-001-03', '3.3.2.1', 'ML 모델 개발', 'XGBoost/Random Forest 앙상블', 'NOT_STARTED', 0, 35, 1, 24, 0, 'user-dev-002', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-03-03-02-02', 'wi-001-03-03-02', 'wg-001-03-03', 'phase-001-03', '3.3.2.2', '딥러닝 모델 개발', 'LSTM/Transformer 이상 탐지', 'NOT_STARTED', 0, 35, 2, 32, 0, 'user-dev-002', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-03-03-02-03', 'wi-001-03-03-02', 'wg-001-03-03', 'phase-001-03', '3.3.2.3', '모델 앙상블', '멀티 모델 앙상블 및 최적화', 'NOT_STARTED', 0, 20, 3, 16, 0, 'user-dev-002', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-03-03-02-04', 'wi-001-03-03-02', 'wg-001-03-03', 'phase-001-03', '3.3.2.4', '설명 가능 AI', 'SHAP/LIME 기반 설명력 확보', 'NOT_STARTED', 0, 10, 4, 8, 0, 'user-dev-002', NULL, NOW(), NOW(), 'user-pm-001')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, progress = EXCLUDED.progress;

-- ============================================
-- Project 2 - Additional Tasks
-- ============================================

-- Item 1.2.2: User Interview (NOT_STARTED)
INSERT INTO project.wbs_tasks (id, item_id, group_id, phase_id, code, name, description, status, progress, weight, order_num, estimated_hours, actual_hours, assignee_id, linked_task_id, created_at, updated_at, created_by)
VALUES
    ('wt-002-01-02-02-01', 'wi-002-01-02-02', 'wg-002-01-02', 'phase-002-01', '1.2.2.1', '인터뷰 대상 선정', '인터뷰 대상 사용자 선정', 'NOT_STARTED', 0, 25, 1, 4, 0, 'user-ba-001', NULL, NOW(), NOW(), 'user-pm-002'),
    ('wt-002-01-02-02-02', 'wi-002-01-02-02', 'wg-002-01-02', 'phase-002-01', '1.2.2.2', '인터뷰 진행', '1:1 심층 인터뷰 진행', 'NOT_STARTED', 0, 45, 2, 16, 0, 'user-ba-001', NULL, NOW(), NOW(), 'user-pm-002'),
    ('wt-002-01-02-02-03', 'wi-002-01-02-02', 'wg-002-01-02', 'phase-002-01', '1.2.2.3', '인터뷰 결과 분석', '인터뷰 데이터 분석 및 인사이트 도출', 'NOT_STARTED', 0, 30, 3, 8, 0, 'user-ba-001', NULL, NOW(), NOW(), 'user-pm-002')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, progress = EXCLUDED.progress;

-- ============================================
-- Additional WBS Items and Tasks for Phase 4-6
-- ============================================

-- Add WBS Items for Phase 4 (Backend Development)
INSERT INTO project.wbs_items (id, group_id, phase_id, code, name, description, status, progress, planned_start_date, planned_end_date, actual_start_date, actual_end_date, weight, order_num, estimated_hours, actual_hours, assignee_id, created_at, updated_at, created_by)
VALUES
    ('wi-001-04-01-01', 'wg-001-04-01', 'phase-001-04', '4.1.1', '청구 API 구현', '보험 청구 CRUD API 개발', 'NOT_STARTED', 0, '2026-03-15', '2026-03-25', NULL, NULL, 40, 1, 40, 0, 'user-dev-001', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-04-01-02', 'wg-001-04-01', 'phase-001-04', '4.1.2', '심사 API 구현', '심사 프로세스 API 개발', 'NOT_STARTED', 0, '2026-03-25', '2026-04-05', NULL, NULL, 35, 2, 32, 0, 'user-dev-001', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-04-01-03', 'wg-001-04-01', 'phase-001-04', '4.1.3', 'API 테스트', '통합 테스트 작성', 'NOT_STARTED', 0, '2026-04-01', '2026-04-05', NULL, NULL, 25, 3, 24, 0, 'user-qa-001', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-04-02-01', 'wg-001-04-02', 'phase-001-04', '4.2.1', 'OAuth2 서버 구현', 'Authorization Server 개발', 'NOT_STARTED', 0, '2026-03-25', '2026-04-05', NULL, NULL, 45, 1, 36, 0, 'user-dev-003', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-04-02-02', 'wg-001-04-02', 'phase-001-04', '4.2.2', '권한 관리 구현', 'RBAC 기반 권한 시스템', 'NOT_STARTED', 0, '2026-04-05', '2026-04-15', NULL, NULL, 35, 2, 28, 0, 'user-dev-003', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-04-02-03', 'wg-001-04-02', 'phase-001-04', '4.2.3', '보안 테스트', '인증/인가 보안 테스트', 'NOT_STARTED', 0, '2026-04-12', '2026-04-15', NULL, NULL, 20, 3, 16, 0, 'user-qa-001', NOW(), NOW(), 'user-pm-001')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, progress = EXCLUDED.progress;

-- Add Tasks for Phase 4 Items
INSERT INTO project.wbs_tasks (id, item_id, group_id, phase_id, code, name, description, status, progress, weight, order_num, estimated_hours, actual_hours, assignee_id, linked_task_id, created_at, updated_at, created_by)
VALUES
    -- Item 4.1.1: Claims API Implementation
    ('wt-001-04-01-01-01', 'wi-001-04-01-01', 'wg-001-04-01', 'phase-001-04', '4.1.1.1', '도메인 모델 구현', '청구 도메인 엔티티 개발', 'NOT_STARTED', 0, 25, 1, 12, 0, 'user-dev-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-04-01-01-02', 'wi-001-04-01-01', 'wg-001-04-01', 'phase-001-04', '4.1.1.2', 'Repository 개발', '데이터 액세스 레이어 구현', 'NOT_STARTED', 0, 25, 2, 8, 0, 'user-dev-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-04-01-01-03', 'wi-001-04-01-01', 'wg-001-04-01', 'phase-001-04', '4.1.1.3', 'Service 로직 구현', '비즈니스 로직 개발', 'NOT_STARTED', 0, 30, 3, 12, 0, 'user-dev-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-04-01-01-04', 'wi-001-04-01-01', 'wg-001-04-01', 'phase-001-04', '4.1.1.4', 'Controller 개발', 'REST API 엔드포인트 구현', 'NOT_STARTED', 0, 20, 4, 8, 0, 'user-dev-001', NULL, NOW(), NOW(), 'user-pm-001'),

    -- Item 4.1.2: Review API Implementation
    ('wt-001-04-01-02-01', 'wi-001-04-01-02', 'wg-001-04-01', 'phase-001-04', '4.1.2.1', '심사 워크플로우 구현', '심사 상태 머신 개발', 'NOT_STARTED', 0, 35, 1, 12, 0, 'user-dev-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-04-01-02-02', 'wi-001-04-01-02', 'wg-001-04-01', 'phase-001-04', '4.1.2.2', '규칙 엔진 연동', '심사 규칙 처리 모듈', 'NOT_STARTED', 0, 40, 2, 16, 0, 'user-dev-002', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-04-01-02-03', 'wi-001-04-01-02', 'wg-001-04-01', 'phase-001-04', '4.1.2.3', '심사 API 개발', '심사 결과 조회/수정 API', 'NOT_STARTED', 0, 25, 3, 8, 0, 'user-dev-001', NULL, NOW(), NOW(), 'user-pm-001'),

    -- Item 4.1.3: API Testing
    ('wt-001-04-01-03-01', 'wi-001-04-01-03', 'wg-001-04-01', 'phase-001-04', '4.1.3.1', '단위 테스트 작성', 'JUnit 기반 단위 테스트', 'NOT_STARTED', 0, 35, 1, 8, 0, 'user-qa-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-04-01-03-02', 'wi-001-04-01-03', 'wg-001-04-01', 'phase-001-04', '4.1.3.2', '통합 테스트 작성', 'Spring Boot Test 통합 테스트', 'NOT_STARTED', 0, 40, 2, 12, 0, 'user-qa-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-04-01-03-03', 'wi-001-04-01-03', 'wg-001-04-01', 'phase-001-04', '4.1.3.3', 'API 문서 검증', 'Swagger 문서 정확성 검증', 'NOT_STARTED', 0, 25, 3, 4, 0, 'user-qa-001', NULL, NOW(), NOW(), 'user-pm-001'),

    -- Item 4.2.1: OAuth2 Server Implementation
    ('wt-001-04-02-01-01', 'wi-001-04-02-01', 'wg-001-04-02', 'phase-001-04', '4.2.1.1', 'Spring Security 설정', '시큐리티 기본 설정', 'NOT_STARTED', 0, 25, 1, 8, 0, 'user-dev-003', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-04-02-01-02', 'wi-001-04-02-01', 'wg-001-04-02', 'phase-001-04', '4.2.1.2', 'Authorization Server 구현', 'OAuth2 인가 서버 개발', 'NOT_STARTED', 0, 40, 2, 16, 0, 'user-dev-003', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-04-02-01-03', 'wi-001-04-02-01', 'wg-001-04-02', 'phase-001-04', '4.2.1.3', 'Resource Server 구현', 'OAuth2 리소스 서버 개발', 'NOT_STARTED', 0, 35, 3, 12, 0, 'user-dev-003', NULL, NOW(), NOW(), 'user-pm-001'),

    -- Item 4.2.2: Authorization Management
    ('wt-001-04-02-02-01', 'wi-001-04-02-02', 'wg-001-04-02', 'phase-001-04', '4.2.2.1', '역할 관리 구현', '사용자 역할 CRUD', 'NOT_STARTED', 0, 35, 1, 10, 0, 'user-dev-003', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-04-02-02-02', 'wi-001-04-02-02', 'wg-001-04-02', 'phase-001-04', '4.2.2.2', '권한 검사 필터', '요청별 권한 검증 로직', 'NOT_STARTED', 0, 40, 2, 12, 0, 'user-dev-003', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-04-02-02-03', 'wi-001-04-02-02', 'wg-001-04-02', 'phase-001-04', '4.2.2.3', '권한 관리 UI API', '관리자용 권한 관리 API', 'NOT_STARTED', 0, 25, 3, 6, 0, 'user-dev-003', NULL, NOW(), NOW(), 'user-pm-001'),

    -- Item 4.2.3: Security Testing
    ('wt-001-04-02-03-01', 'wi-001-04-02-03', 'wg-001-04-02', 'phase-001-04', '4.2.3.1', '인증 테스트', '로그인/로그아웃 테스트', 'NOT_STARTED', 0, 30, 1, 4, 0, 'user-qa-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-04-02-03-02', 'wi-001-04-02-03', 'wg-001-04-02', 'phase-001-04', '4.2.3.2', '권한 침투 테스트', '권한 우회 시도 테스트', 'NOT_STARTED', 0, 45, 2, 8, 0, 'user-qa-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-04-02-03-03', 'wi-001-04-02-03', 'wg-001-04-02', 'phase-001-04', '4.2.3.3', '토큰 보안 테스트', 'JWT 토큰 보안 검증', 'NOT_STARTED', 0, 25, 3, 4, 0, 'user-qa-001', NULL, NOW(), NOW(), 'user-pm-001')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, progress = EXCLUDED.progress;

-- Add WBS Items for Phase 5 (Testing)
INSERT INTO project.wbs_items (id, group_id, phase_id, code, name, description, status, progress, planned_start_date, planned_end_date, actual_start_date, actual_end_date, weight, order_num, estimated_hours, actual_hours, assignee_id, created_at, updated_at, created_by)
VALUES
    ('wi-001-05-01-01', 'wg-001-05-01', 'phase-001-05', '5.1.1', '테스트 계획 수립', '통합 테스트 전략 및 계획', 'NOT_STARTED', 0, '2026-05-01', '2026-05-05', NULL, NULL, 25, 1, 20, 0, 'user-qa-001', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-05-01-02', 'wg-001-05-01', 'phase-001-05', '5.1.2', 'E2E 테스트 실행', '엔드투엔드 통합 테스트', 'NOT_STARTED', 0, '2026-05-06', '2026-05-15', NULL, NULL, 45, 2, 40, 0, 'user-qa-001', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-05-01-03', 'wg-001-05-01', 'phase-001-05', '5.1.3', '결함 관리', '발견된 결함 추적 및 수정', 'NOT_STARTED', 0, '2026-05-10', '2026-05-20', NULL, NULL, 30, 3, 32, 0, 'user-qa-001', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-05-02-01', 'wg-001-05-02', 'phase-001-05', '5.2.1', '부하 테스트', '동시 사용자 부하 테스트', 'NOT_STARTED', 0, '2026-05-15', '2026-05-25', NULL, NULL, 40, 1, 32, 0, 'user-qa-001', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-05-02-02', 'wg-001-05-02', 'phase-001-05', '5.2.2', '성능 최적화', '병목 구간 개선', 'NOT_STARTED', 0, '2026-05-22', '2026-06-01', NULL, NULL, 40, 2, 40, 0, 'user-dev-001', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-05-02-03', 'wg-001-05-02', 'phase-001-05', '5.2.3', '성능 리포트', '성능 테스트 결과 보고서', 'NOT_STARTED', 0, '2026-05-28', '2026-06-01', NULL, NULL, 20, 3, 8, 0, 'user-qa-001', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-05-03-01', 'wg-001-05-03', 'phase-001-05', '5.3.1', '보안 취약점 스캔', 'OWASP 기반 취약점 점검', 'NOT_STARTED', 0, '2026-05-25', '2026-06-02', NULL, NULL, 45, 1, 24, 0, 'user-qa-001', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-05-03-02', 'wg-001-05-03', 'phase-001-05', '5.3.2', '취약점 조치', '발견된 보안 이슈 수정', 'NOT_STARTED', 0, '2026-06-01', '2026-06-08', NULL, NULL, 35, 2, 32, 0, 'user-dev-003', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-05-03-03', 'wg-001-05-03', 'phase-001-05', '5.3.3', '보안 감사 리포트', '보안 점검 결과 문서화', 'NOT_STARTED', 0, '2026-06-06', '2026-06-10', NULL, NULL, 20, 3, 8, 0, 'user-qa-001', NOW(), NOW(), 'user-pm-001')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, progress = EXCLUDED.progress;

-- Add Tasks for Phase 5 Items
INSERT INTO project.wbs_tasks (id, item_id, group_id, phase_id, code, name, description, status, progress, weight, order_num, estimated_hours, actual_hours, assignee_id, linked_task_id, created_at, updated_at, created_by)
VALUES
    -- Item 5.1.1: Test Planning
    ('wt-001-05-01-01-01', 'wi-001-05-01-01', 'wg-001-05-01', 'phase-001-05', '5.1.1.1', '테스트 전략 수립', '테스트 범위 및 접근 방식 정의', 'NOT_STARTED', 0, 35, 1, 8, 0, 'user-qa-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-05-01-01-02', 'wi-001-05-01-01', 'wg-001-05-01', 'phase-001-05', '5.1.1.2', '테스트 케이스 설계', '상세 테스트 케이스 작성', 'NOT_STARTED', 0, 40, 2, 8, 0, 'user-qa-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-05-01-01-03', 'wi-001-05-01-01', 'wg-001-05-01', 'phase-001-05', '5.1.1.3', '테스트 환경 준비', '테스트 서버 및 데이터 준비', 'NOT_STARTED', 0, 25, 3, 4, 0, 'user-dev-003', NULL, NOW(), NOW(), 'user-pm-001'),

    -- Item 5.1.2: E2E Test Execution
    ('wt-001-05-01-02-01', 'wi-001-05-01-02', 'wg-001-05-01', 'phase-001-05', '5.1.2.1', '기능 테스트 실행', '전체 기능 테스트 수행', 'NOT_STARTED', 0, 40, 1, 16, 0, 'user-qa-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-05-01-02-02', 'wi-001-05-01-02', 'wg-001-05-01', 'phase-001-05', '5.1.2.2', '회귀 테스트', '변경 사항 회귀 테스트', 'NOT_STARTED', 0, 35, 2, 16, 0, 'user-qa-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-05-01-02-03', 'wi-001-05-01-02', 'wg-001-05-01', 'phase-001-05', '5.1.2.3', '테스트 자동화', 'Selenium/Playwright 자동화', 'NOT_STARTED', 0, 25, 3, 12, 0, 'user-qa-001', NULL, NOW(), NOW(), 'user-pm-001'),

    -- Item 5.1.3: Defect Management
    ('wt-001-05-01-03-01', 'wi-001-05-01-03', 'wg-001-05-01', 'phase-001-05', '5.1.3.1', '결함 기록', '발견된 결함 등록 및 분류', 'NOT_STARTED', 0, 30, 1, 8, 0, 'user-qa-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-05-01-03-02', 'wi-001-05-01-03', 'wg-001-05-01', 'phase-001-05', '5.1.3.2', '결함 수정', '개발팀 결함 수정 지원', 'NOT_STARTED', 0, 45, 2, 16, 0, 'user-dev-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-05-01-03-03', 'wi-001-05-01-03', 'wg-001-05-01', 'phase-001-05', '5.1.3.3', '재테스트', '수정된 결함 재검증', 'NOT_STARTED', 0, 25, 3, 8, 0, 'user-qa-001', NULL, NOW(), NOW(), 'user-pm-001'),

    -- Item 5.2.1: Load Testing
    ('wt-001-05-02-01-01', 'wi-001-05-02-01', 'wg-001-05-02', 'phase-001-05', '5.2.1.1', 'JMeter 스크립트 작성', '부하 테스트 스크립트 개발', 'NOT_STARTED', 0, 35, 1, 12, 0, 'user-qa-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-05-02-01-02', 'wi-001-05-02-01', 'wg-001-05-02', 'phase-001-05', '5.2.1.2', '부하 테스트 실행', '동시 사용자 시뮬레이션', 'NOT_STARTED', 0, 40, 2, 12, 0, 'user-qa-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-05-02-01-03', 'wi-001-05-02-01', 'wg-001-05-02', 'phase-001-05', '5.2.1.3', '결과 분석', '병목 구간 식별 및 분석', 'NOT_STARTED', 0, 25, 3, 8, 0, 'user-qa-001', NULL, NOW(), NOW(), 'user-pm-001'),

    -- Item 5.2.2: Performance Optimization
    ('wt-001-05-02-02-01', 'wi-001-05-02-02', 'wg-001-05-02', 'phase-001-05', '5.2.2.1', 'DB 쿼리 최적화', '슬로우 쿼리 튜닝', 'NOT_STARTED', 0, 40, 1, 16, 0, 'user-dev-002', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-05-02-02-02', 'wi-001-05-02-02', 'wg-001-05-02', 'phase-001-05', '5.2.2.2', '캐시 적용', 'Redis 캐시 전략 구현', 'NOT_STARTED', 0, 35, 2, 16, 0, 'user-dev-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-05-02-02-03', 'wi-001-05-02-02', 'wg-001-05-02', 'phase-001-05', '5.2.2.3', '코드 최적화', '핫스팟 코드 개선', 'NOT_STARTED', 0, 25, 3, 8, 0, 'user-dev-001', NULL, NOW(), NOW(), 'user-pm-001'),

    -- Item 5.3.1: Security Scan
    ('wt-001-05-03-01-01', 'wi-001-05-03-01', 'wg-001-05-03', 'phase-001-05', '5.3.1.1', 'SAST 분석', '정적 코드 보안 분석', 'NOT_STARTED', 0, 35, 1, 8, 0, 'user-qa-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-05-03-01-02', 'wi-001-05-03-01', 'wg-001-05-03', 'phase-001-05', '5.3.1.2', 'DAST 분석', '동적 보안 취약점 스캔', 'NOT_STARTED', 0, 40, 2, 12, 0, 'user-qa-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-05-03-01-03', 'wi-001-05-03-01', 'wg-001-05-03', 'phase-001-05', '5.3.1.3', '침투 테스트', '모의 해킹 테스트', 'NOT_STARTED', 0, 25, 3, 8, 0, 'user-qa-001', NULL, NOW(), NOW(), 'user-pm-001'),

    -- Item 5.3.2: Vulnerability Remediation
    ('wt-001-05-03-02-01', 'wi-001-05-03-02', 'wg-001-05-03', 'phase-001-05', '5.3.2.1', '취약점 분류', '심각도별 취약점 분류', 'NOT_STARTED', 0, 25, 1, 4, 0, 'user-qa-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-05-03-02-02', 'wi-001-05-03-02', 'wg-001-05-03', 'phase-001-05', '5.3.2.2', '보안 패치 적용', '취약점 수정 및 패치', 'NOT_STARTED', 0, 50, 2, 24, 0, 'user-dev-003', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-05-03-02-03', 'wi-001-05-03-02', 'wg-001-05-03', 'phase-001-05', '5.3.2.3', '재점검', '수정 후 보안 재검증', 'NOT_STARTED', 0, 25, 3, 8, 0, 'user-qa-001', NULL, NOW(), NOW(), 'user-pm-001')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, progress = EXCLUDED.progress;

-- Add WBS Items for Phase 6 (Deployment)
INSERT INTO project.wbs_items (id, group_id, phase_id, code, name, description, status, progress, planned_start_date, planned_end_date, actual_start_date, actual_end_date, weight, order_num, estimated_hours, actual_hours, assignee_id, created_at, updated_at, created_by)
VALUES
    ('wi-001-06-01-01', 'wg-001-06-01', 'phase-001-06', '6.1.1', '인프라 프로비저닝', '운영 서버 환경 구축', 'NOT_STARTED', 0, '2026-06-15', '2026-06-18', NULL, NULL, 40, 1, 24, 0, 'user-dev-003', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-06-01-02', 'wg-001-06-01', 'phase-001-06', '6.1.2', '모니터링 설정', '운영 모니터링 시스템 구축', 'NOT_STARTED', 0, '2026-06-18', '2026-06-22', NULL, NULL, 35, 2, 20, 0, 'user-dev-003', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-06-01-03', 'wg-001-06-01', 'phase-001-06', '6.1.3', 'CI/CD 파이프라인', '배포 자동화 구축', 'NOT_STARTED', 0, '2026-06-19', '2026-06-22', NULL, NULL, 25, 3, 16, 0, 'user-dev-001', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-06-02-01', 'wg-001-06-02', 'phase-001-06', '6.2.1', '배포 리허설', '운영 배포 사전 테스트', 'NOT_STARTED', 0, '2026-06-20', '2026-06-23', NULL, NULL, 35, 1, 16, 0, 'user-dev-001', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-06-02-02', 'wg-001-06-02', 'phase-001-06', '6.2.2', '운영 배포', '프로덕션 배포 수행', 'NOT_STARTED', 0, '2026-06-24', '2026-06-25', NULL, NULL, 40, 2, 8, 0, 'user-dev-001', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-06-02-03', 'wg-001-06-02', 'phase-001-06', '6.2.3', '안정화 모니터링', '초기 운영 안정화 점검', 'NOT_STARTED', 0, '2026-06-25', '2026-06-28', NULL, NULL, 25, 3, 12, 0, 'user-dev-003', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-06-03-01', 'wg-001-06-03', 'phase-001-06', '6.3.1', '운영자 교육', '운영팀 시스템 교육', 'NOT_STARTED', 0, '2026-06-25', '2026-06-27', NULL, NULL, 40, 1, 12, 0, 'user-pm-001', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-06-03-02', 'wg-001-06-03', 'phase-001-06', '6.3.2', '사용자 매뉴얼', '최종 사용자 가이드 작성', 'NOT_STARTED', 0, '2026-06-26', '2026-06-29', NULL, NULL, 35, 2, 16, 0, 'user-ba-001', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-06-03-03', 'wg-001-06-03', 'phase-001-06', '6.3.3', '인수인계', '프로젝트 종료 및 인수인계', 'NOT_STARTED', 0, '2026-06-28', '2026-06-30', NULL, NULL, 25, 3, 8, 0, 'user-pm-001', NOW(), NOW(), 'user-pm-001')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, progress = EXCLUDED.progress;

-- Add Tasks for Phase 6 Items
INSERT INTO project.wbs_tasks (id, item_id, group_id, phase_id, code, name, description, status, progress, weight, order_num, estimated_hours, actual_hours, assignee_id, linked_task_id, created_at, updated_at, created_by)
VALUES
    -- Item 6.1.1: Infrastructure Provisioning
    ('wt-001-06-01-01-01', 'wi-001-06-01-01', 'wg-001-06-01', 'phase-001-06', '6.1.1.1', 'EKS 클러스터 생성', '운영용 Kubernetes 클러스터', 'NOT_STARTED', 0, 40, 1, 12, 0, 'user-dev-003', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-06-01-01-02', 'wi-001-06-01-01', 'wg-001-06-01', 'phase-001-06', '6.1.1.2', 'RDS 설정', '운영 DB 인스턴스 구성', 'NOT_STARTED', 0, 35, 2, 8, 0, 'user-dev-003', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-06-01-01-03', 'wi-001-06-01-01', 'wg-001-06-01', 'phase-001-06', '6.1.1.3', '네트워크 설정', 'VPC/보안그룹 구성', 'NOT_STARTED', 0, 25, 3, 4, 0, 'user-dev-003', NULL, NOW(), NOW(), 'user-pm-001'),

    -- Item 6.1.2: Monitoring Setup
    ('wt-001-06-01-02-01', 'wi-001-06-01-02', 'wg-001-06-01', 'phase-001-06', '6.1.2.1', 'Prometheus 설정', '메트릭 수집 시스템 구축', 'NOT_STARTED', 0, 35, 1, 8, 0, 'user-dev-003', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-06-01-02-02', 'wi-001-06-01-02', 'wg-001-06-01', 'phase-001-06', '6.1.2.2', 'Grafana 대시보드', '모니터링 대시보드 구축', 'NOT_STARTED', 0, 35, 2, 8, 0, 'user-dev-003', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-06-01-02-03', 'wi-001-06-01-02', 'wg-001-06-01', 'phase-001-06', '6.1.2.3', '알림 설정', '이상 징후 알림 구성', 'NOT_STARTED', 0, 30, 3, 4, 0, 'user-dev-003', NULL, NOW(), NOW(), 'user-pm-001'),

    -- Item 6.2.1: Deployment Rehearsal
    ('wt-001-06-02-01-01', 'wi-001-06-02-01', 'wg-001-06-02', 'phase-001-06', '6.2.1.1', '배포 절차 문서화', '배포 체크리스트 작성', 'NOT_STARTED', 0, 30, 1, 4, 0, 'user-dev-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-06-02-01-02', 'wi-001-06-02-01', 'wg-001-06-02', 'phase-001-06', '6.2.1.2', '스테이징 배포', '스테이징 환경 배포 테스트', 'NOT_STARTED', 0, 40, 2, 8, 0, 'user-dev-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-06-02-01-03', 'wi-001-06-02-01', 'wg-001-06-02', 'phase-001-06', '6.2.1.3', '롤백 테스트', '롤백 절차 검증', 'NOT_STARTED', 0, 30, 3, 4, 0, 'user-dev-001', NULL, NOW(), NOW(), 'user-pm-001'),

    -- Item 6.2.2: Production Deployment
    ('wt-001-06-02-02-01', 'wi-001-06-02-02', 'wg-001-06-02', 'phase-001-06', '6.2.2.1', '배포 승인', 'SPONSOR/PMO 배포 승인', 'NOT_STARTED', 0, 25, 1, 2, 0, 'user-sponsor-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-06-02-02-02', 'wi-001-06-02-02', 'wg-001-06-02', 'phase-001-06', '6.2.2.2', '운영 배포 실행', '프로덕션 배포 수행', 'NOT_STARTED', 0, 50, 2, 4, 0, 'user-dev-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-06-02-02-03', 'wi-001-06-02-02', 'wg-001-06-02', 'phase-001-06', '6.2.2.3', '스모크 테스트', '배포 후 기본 동작 확인', 'NOT_STARTED', 0, 25, 3, 2, 0, 'user-qa-001', NULL, NOW(), NOW(), 'user-pm-001'),

    -- Item 6.2.3: Stabilization Monitoring
    ('wt-001-06-02-03-01', 'wi-001-06-02-03', 'wg-001-06-02', 'phase-001-06', '6.2.3.1', '24시간 모니터링', '초기 운영 집중 모니터링', 'NOT_STARTED', 0, 45, 1, 8, 0, 'user-dev-003', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-06-02-03-02', 'wi-001-06-02-03', 'wg-001-06-02', 'phase-001-06', '6.2.3.2', '핫픽스 대응', '긴급 이슈 대응', 'NOT_STARTED', 0, 35, 2, 4, 0, 'user-dev-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-06-02-03-03', 'wi-001-06-02-03', 'wg-001-06-02', 'phase-001-06', '6.2.3.3', '안정화 보고', 'PMO 안정화 상태 보고', 'NOT_STARTED', 0, 20, 3, 2, 0, 'user-pmo-001', NULL, NOW(), NOW(), 'user-pm-001'),

    -- Item 6.3.1: Operator Training
    ('wt-001-06-03-01-01', 'wi-001-06-03-01', 'wg-001-06-03', 'phase-001-06', '6.3.1.1', '교육 자료 준비', '운영자 교육 자료 작성', 'NOT_STARTED', 0, 35, 1, 6, 0, 'user-pm-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-06-03-01-02', 'wi-001-06-03-01', 'wg-001-06-03', 'phase-001-06', '6.3.1.2', '교육 세션 진행', '운영팀 대상 교육 실시', 'NOT_STARTED', 0, 45, 2, 6, 0, 'user-pm-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-06-03-01-03', 'wi-001-06-03-01', 'wg-001-06-03', 'phase-001-06', '6.3.1.3', '교육 평가', '교육 이해도 점검', 'NOT_STARTED', 0, 20, 3, 2, 0, 'user-pm-001', NULL, NOW(), NOW(), 'user-pm-001'),

    -- Item 6.3.2: User Manual
    ('wt-001-06-03-02-01', 'wi-001-06-03-02', 'wg-001-06-03', 'phase-001-06', '6.3.2.1', '사용자 가이드 작성', '최종 사용자 매뉴얼 작성', 'NOT_STARTED', 0, 45, 1, 10, 0, 'user-ba-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-06-03-02-02', 'wi-001-06-03-02', 'wg-001-06-03', 'phase-001-06', '6.3.2.2', 'FAQ 문서 작성', '자주 묻는 질문 정리', 'NOT_STARTED', 0, 30, 2, 4, 0, 'user-ba-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-06-03-02-03', 'wi-001-06-03-02', 'wg-001-06-03', 'phase-001-06', '6.3.2.3', '문서 검토', '문서 품질 검토 및 승인', 'NOT_STARTED', 0, 25, 3, 2, 0, 'user-pm-001', NULL, NOW(), NOW(), 'user-pm-001'),

    -- Item 6.3.3: Handover
    ('wt-001-06-03-03-01', 'wi-001-06-03-03', 'wg-001-06-03', 'phase-001-06', '6.3.3.1', '산출물 정리', '프로젝트 산출물 최종 정리', 'NOT_STARTED', 0, 35, 1, 4, 0, 'user-pm-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-06-03-03-02', 'wi-001-06-03-03', 'wg-001-06-03', 'phase-001-06', '6.3.3.2', '인수인계 미팅', '운영팀 최종 인수인계', 'NOT_STARTED', 0, 40, 2, 3, 0, 'user-pm-001', NULL, NOW(), NOW(), 'user-pm-001'),
    ('wt-001-06-03-03-03', 'wi-001-06-03-03', 'wg-001-06-03', 'phase-001-06', '6.3.3.3', '프로젝트 종료 승인', 'SPONSOR 프로젝트 종료 승인', 'NOT_STARTED', 0, 25, 3, 1, 0, 'user-sponsor-001', NULL, NOW(), NOW(), 'user-pm-001')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, progress = EXCLUDED.progress;

-- ============================================
-- Summary of Added Data:
-- ============================================
-- Phase 1: ~24 tasks added (covers BA, PM, SPONSOR, PMO_HEAD)
-- Phase 2: ~15 tasks added (covers DEV, QA, BA, PMO_HEAD)
-- Phase 3: ~15 tasks added (covers DEV, BA, QA, PMO_HEAD)
-- Phase 4: ~24 tasks added (covers DEV, QA)
-- Phase 5: ~24 tasks added (covers QA, DEV)
-- Phase 6: ~24 tasks added (covers DEV, PM, BA, QA, SPONSOR, PMO_HEAD)
-- Project 2: 3 tasks added
--
-- Total: ~130 new WBS Tasks
--
-- Coverage by Role:
-- - SPONSOR: Approvals, Final sign-offs (6+ tasks)
-- - PMO_HEAD: Reviews, Approvals, Oversight (8+ tasks)
-- - PM: Planning, Coordination, Training (15+ tasks)
-- - DEVELOPER: All technical implementation (45+ tasks)
-- - QA: Testing, Validation, Security (35+ tasks)
-- - BUSINESS_ANALYST: Requirements, Data, Documentation (20+ tasks)
-- ============================================


-- ============================================================
-- Source: V20260204__wbs_dependencies
-- ============================================================
-- WBS Dependencies table for predecessor/successor relationships
-- This enables Gantt chart dependency visualization

CREATE TABLE IF NOT EXISTS project.wbs_dependencies (
    id VARCHAR(36) PRIMARY KEY,

    -- Source item (predecessor)
    predecessor_type VARCHAR(20) NOT NULL,  -- 'GROUP', 'ITEM', 'TASK'
    predecessor_id VARCHAR(36) NOT NULL,

    -- Target item (successor)
    successor_type VARCHAR(20) NOT NULL,    -- 'GROUP', 'ITEM', 'TASK'
    successor_id VARCHAR(36) NOT NULL,

    -- Dependency type (Finish-to-Start, Start-to-Start, etc.)
    dependency_type VARCHAR(10) NOT NULL DEFAULT 'FS',

    -- Lag time in days (can be negative for lead time)
    lag_days INTEGER DEFAULT 0,

    -- Project ID for efficient filtering
    project_id VARCHAR(50) NOT NULL,

    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(36),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(36),

    -- Prevent duplicate dependencies
    CONSTRAINT uk_wbs_dependency UNIQUE (predecessor_id, successor_id),

    -- Foreign key to project
    CONSTRAINT fk_wbs_dependency_project
        FOREIGN KEY (project_id) REFERENCES project.projects(id) ON DELETE CASCADE
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_wbs_dep_predecessor ON project.wbs_dependencies(predecessor_id);
CREATE INDEX IF NOT EXISTS idx_wbs_dep_successor ON project.wbs_dependencies(successor_id);
CREATE INDEX IF NOT EXISTS idx_wbs_dep_project ON project.wbs_dependencies(project_id);

COMMENT ON TABLE project.wbs_dependencies IS 'WBS item dependencies (predecessor/successor relationships)';
COMMENT ON COLUMN project.wbs_dependencies.dependency_type IS 'FS=Finish-to-Start, SS=Start-to-Start, FF=Finish-to-Finish, SF=Start-to-Finish';

-- Insert sample dependencies for demo project
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
SELECT
    gen_random_uuid()::text,
    'ITEM',
    wi1.id,
    'ITEM',
    wi2.id,
    'FS',
    0,
    p.project_id,
    'system'
FROM project.wbs_items wi1
JOIN project.wbs_items wi2 ON wi1.group_id = wi2.group_id AND wi1.order_num + 1 = wi2.order_num
JOIN project.phases p ON wi1.phase_id = p.id
WHERE wi1.order_num < 3
LIMIT 5
ON CONFLICT DO NOTHING;


-- ============================================================
-- Source: V20260206__wbs_task_mock_dates
-- ============================================================
-- WBS Task Mock Date Data
-- Version: 20260206
-- Description: Add date fields to existing WBS Task mock data for Gantt chart and Critical Path testing

-- ============================================
-- 1. Update Phase 1 Tasks (Requirements Analysis - COMPLETED)
-- ============================================

-- Item 1.1.1 Tasks (RFP Document Analysis: Jan 15-18)
UPDATE project.wbs_tasks SET
    planned_start_date = '2026-01-15',
    planned_end_date = '2026-01-15',
    actual_start_date = '2026-01-15',
    actual_end_date = '2026-01-15'
WHERE id = 'wt-001-01-01-01-01'; -- RFP 문서 수령

UPDATE project.wbs_tasks SET
    planned_start_date = '2026-01-15',
    planned_end_date = '2026-01-16',
    actual_start_date = '2026-01-15',
    actual_end_date = '2026-01-16'
WHERE id = 'wt-001-01-01-01-02'; -- RFP 구조 분석

UPDATE project.wbs_tasks SET
    planned_start_date = '2026-01-16',
    planned_end_date = '2026-01-17',
    actual_start_date = '2026-01-16',
    actual_end_date = '2026-01-17'
WHERE id = 'wt-001-01-01-01-03'; -- 요구사항 추출

-- Item 1.1.2 Tasks (Functional Requirements: Jan 17-20)
UPDATE project.wbs_tasks SET
    planned_start_date = '2026-01-17',
    planned_end_date = '2026-01-18',
    actual_start_date = '2026-01-17',
    actual_end_date = '2026-01-18'
WHERE id = 'wt-001-01-01-02-01'; -- 기능 분류

UPDATE project.wbs_tasks SET
    planned_start_date = '2026-01-18',
    planned_end_date = '2026-01-19',
    actual_start_date = '2026-01-18',
    actual_end_date = '2026-01-19'
WHERE id = 'wt-001-01-01-02-02'; -- 우선순위 지정

UPDATE project.wbs_tasks SET
    planned_start_date = '2026-01-19',
    planned_end_date = '2026-01-19',
    actual_start_date = '2026-01-19',
    actual_end_date = '2026-01-19'
WHERE id = 'wt-001-01-01-02-03'; -- 문서화

-- ============================================
-- 2. Update Phase 2 Tasks (System Design - IN_PROGRESS)
-- ============================================

-- Item 2.1.1 Tasks (Tech Stack Selection: Feb 1-3 - COMPLETED)
UPDATE project.wbs_tasks SET
    planned_start_date = '2026-02-01',
    planned_end_date = '2026-02-02',
    actual_start_date = '2026-02-01',
    actual_end_date = '2026-02-02'
WHERE id = 'wt-001-02-01-01-01'; -- 기술 후보 조사

UPDATE project.wbs_tasks SET
    planned_start_date = '2026-02-02',
    planned_end_date = '2026-02-03',
    actual_start_date = '2026-02-02',
    actual_end_date = '2026-02-03'
WHERE id = 'wt-001-02-01-01-02'; -- 기술 비교 평가

UPDATE project.wbs_tasks SET
    planned_start_date = '2026-02-03',
    planned_end_date = '2026-02-03',
    actual_start_date = '2026-02-03',
    actual_end_date = '2026-02-03'
WHERE id = 'wt-001-02-01-01-03'; -- 최종 선정

-- Item 2.1.2 Tasks (System Architecture: Feb 3-7 - IN_PROGRESS)
UPDATE project.wbs_tasks SET
    planned_start_date = '2026-02-03',
    planned_end_date = '2026-02-04',
    actual_start_date = '2026-02-03',
    actual_end_date = '2026-02-04'
WHERE id = 'wt-001-02-01-02-01'; -- 컴포넌트 정의

UPDATE project.wbs_tasks SET
    planned_start_date = '2026-02-04',
    planned_end_date = '2026-02-05',
    actual_start_date = '2026-02-04',
    actual_end_date = '2026-02-05'
WHERE id = 'wt-001-02-01-02-02'; -- 인터페이스 설계

UPDATE project.wbs_tasks SET
    planned_start_date = '2026-02-05',
    planned_end_date = '2026-02-06',
    actual_start_date = '2026-02-05',
    actual_end_date = NULL
WHERE id = 'wt-001-02-01-02-03'; -- 배포 아키텍처 (IN_PROGRESS)

UPDATE project.wbs_tasks SET
    planned_start_date = '2026-02-06',
    planned_end_date = '2026-02-07',
    actual_start_date = NULL,
    actual_end_date = NULL
WHERE id = 'wt-001-02-01-02-04'; -- 아키텍처 문서화 (NOT_STARTED)

-- Item 2.1.3 Tasks (Infrastructure Design: Feb 6-10 - IN_PROGRESS)
UPDATE project.wbs_tasks SET
    planned_start_date = '2026-02-06',
    planned_end_date = '2026-02-07',
    actual_start_date = '2026-02-06',
    actual_end_date = '2026-02-07'
WHERE id = 'wt-001-02-01-03-01'; -- VPC 설계

UPDATE project.wbs_tasks SET
    planned_start_date = '2026-02-07',
    planned_end_date = '2026-02-09',
    actual_start_date = '2026-02-07',
    actual_end_date = NULL
WHERE id = 'wt-001-02-01-03-02'; -- EKS 클러스터 설계 (IN_PROGRESS)

UPDATE project.wbs_tasks SET
    planned_start_date = '2026-02-09',
    planned_end_date = '2026-02-10',
    actual_start_date = NULL,
    actual_end_date = NULL
WHERE id = 'wt-001-02-01-03-03'; -- DR 계획 (NOT_STARTED)

-- Item 2.2.1 Tasks (ERD Design: Feb 8-11 - COMPLETED)
UPDATE project.wbs_tasks SET
    planned_start_date = '2026-02-08',
    planned_end_date = '2026-02-09',
    actual_start_date = '2026-02-08',
    actual_end_date = '2026-02-08'
WHERE id = 'wt-001-02-02-01-01'; -- 엔티티 식별

UPDATE project.wbs_tasks SET
    planned_start_date = '2026-02-09',
    planned_end_date = '2026-02-10',
    actual_start_date = '2026-02-09',
    actual_end_date = '2026-02-10'
WHERE id = 'wt-001-02-02-01-02'; -- 관계 정의

UPDATE project.wbs_tasks SET
    planned_start_date = '2026-02-10',
    planned_end_date = '2026-02-10',
    actual_start_date = '2026-02-10',
    actual_end_date = '2026-02-10'
WHERE id = 'wt-001-02-02-01-03'; -- ERD 문서화

-- Item 2.2.2 Tasks (Schema Definition: Feb 11-15 - IN_PROGRESS)
UPDATE project.wbs_tasks SET
    planned_start_date = '2026-02-11',
    planned_end_date = '2026-02-13',
    actual_start_date = '2026-02-11',
    actual_end_date = '2026-02-13'
WHERE id = 'wt-001-02-02-02-01'; -- 테이블 설계

UPDATE project.wbs_tasks SET
    planned_start_date = '2026-02-13',
    planned_end_date = '2026-02-14',
    actual_start_date = '2026-02-13',
    actual_end_date = NULL
WHERE id = 'wt-001-02-02-02-02'; -- 제약조건 정의 (IN_PROGRESS)

UPDATE project.wbs_tasks SET
    planned_start_date = '2026-02-14',
    planned_end_date = '2026-02-15',
    actual_start_date = NULL,
    actual_end_date = NULL
WHERE id = 'wt-001-02-02-02-03'; -- 마이그레이션 작성 (NOT_STARTED)

-- Item 2.3.1 Tasks (API Specification: Feb 15-19 - IN_PROGRESS)
UPDATE project.wbs_tasks SET
    planned_start_date = '2026-02-15',
    planned_end_date = '2026-02-16',
    actual_start_date = '2026-02-15',
    actual_end_date = '2026-02-16'
WHERE id = 'wt-001-02-03-01-01'; -- API 엔드포인트 정의

UPDATE project.wbs_tasks SET
    planned_start_date = '2026-02-16',
    planned_end_date = '2026-02-17',
    actual_start_date = '2026-02-16',
    actual_end_date = '2026-02-17'
WHERE id = 'wt-001-02-03-01-02'; -- Request/Response 설계

UPDATE project.wbs_tasks SET
    planned_start_date = '2026-02-17',
    planned_end_date = '2026-02-19',
    actual_start_date = '2026-02-17',
    actual_end_date = NULL
WHERE id = 'wt-001-02-03-01-03'; -- OpenAPI 문서화 (IN_PROGRESS)

-- ============================================
-- 3. Update Project 2 Tasks (Mobile App - IN_PROGRESS)
-- ============================================

-- Item 1.1.1 Tasks (Competitor App Analysis: Feb 1-6)
UPDATE project.wbs_tasks SET
    planned_start_date = '2026-02-01',
    planned_end_date = '2026-02-01',
    actual_start_date = '2026-02-01',
    actual_end_date = '2026-02-01'
WHERE id = 'wt-002-01-01-01-01'; -- 앱 다운로드

UPDATE project.wbs_tasks SET
    planned_start_date = '2026-02-01',
    planned_end_date = '2026-02-04',
    actual_start_date = '2026-02-01',
    actual_end_date = NULL
WHERE id = 'wt-002-01-01-01-02'; -- 기능 분석 (IN_PROGRESS)

UPDATE project.wbs_tasks SET
    planned_start_date = '2026-02-04',
    planned_end_date = '2026-02-06',
    actual_start_date = '2026-02-04',
    actual_end_date = NULL
WHERE id = 'wt-002-01-01-01-03'; -- 비교표 작성 (IN_PROGRESS)

-- Item 1.1.2 Tasks (Market Trend Research: Feb 6-12)
UPDATE project.wbs_tasks SET
    planned_start_date = '2026-02-06',
    planned_end_date = '2026-02-08',
    actual_start_date = '2026-02-06',
    actual_end_date = NULL
WHERE id = 'wt-002-01-01-02-01'; -- 리포트 조사 (IN_PROGRESS)

UPDATE project.wbs_tasks SET
    planned_start_date = '2026-02-08',
    planned_end_date = '2026-02-10',
    actual_start_date = '2026-02-08',
    actual_end_date = NULL
WHERE id = 'wt-002-01-01-02-02'; -- 트렌드 분석 (IN_PROGRESS)

UPDATE project.wbs_tasks SET
    planned_start_date = '2026-02-10',
    planned_end_date = '2026-02-12',
    actual_start_date = NULL,
    actual_end_date = NULL
WHERE id = 'wt-002-01-01-02-03'; -- 기회 식별 (NOT_STARTED)

-- Item 1.2.1 Tasks (Persona Definition: Feb 8-13)
UPDATE project.wbs_tasks SET
    planned_start_date = '2026-02-08',
    planned_end_date = '2026-02-09',
    actual_start_date = '2026-02-08',
    actual_end_date = '2026-02-09'
WHERE id = 'wt-002-01-02-01-01'; -- 세그먼트 정의

UPDATE project.wbs_tasks SET
    planned_start_date = '2026-02-09',
    planned_end_date = '2026-02-13',
    actual_start_date = '2026-02-09',
    actual_end_date = NULL
WHERE id = 'wt-002-01-02-01-02'; -- 페르소나 작성 (IN_PROGRESS)

-- ============================================
-- 4. Summary of WBS Task Dates
-- ============================================
-- Total WBS Tasks with dates: 29
--
-- Project 1 (AI Insurance Claims):
--   - Phase 1 (Requirements): 6 tasks (all COMPLETED)
--   - Phase 2 (Design): 15 tasks (mix of COMPLETED/IN_PROGRESS/NOT_STARTED)
--
-- Project 2 (Mobile Insurance App):
--   - Phase 1 (Market Research): 8 tasks (mix of COMPLETED/IN_PROGRESS/NOT_STARTED)
--
-- Date patterns for testing:
-- - COMPLETED: both actual_start_date and actual_end_date set
-- - IN_PROGRESS: actual_start_date set, actual_end_date NULL
-- - NOT_STARTED: both actual dates NULL
-- ============================================


-- ============================================================
-- Source: V20260207__wbs_dependencies_sample_data
-- ============================================================
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


-- ============================================================
-- Source: V20260207__wbs_task_mock_dependencies
-- ============================================================
-- WBS Task Mock Dependencies for Critical Path Testing
-- Version: 20260207
-- Description: Add task-level dependencies to test Critical Path Method (CPM) calculation

-- ============================================
-- 1. Clean up auto-generated dependencies (optional - reset for clean test)
-- ============================================
-- DELETE FROM project.wbs_dependencies WHERE created_by = 'system';

-- ============================================
-- 2. Project 1 Phase 1: Requirements Analysis Dependencies
-- Critical Path: RFP Receipt -> RFP Analysis -> Requirements Extraction -> Functional Classification
-- ============================================

-- Chain: RFP Receipt -> RFP Structure Analysis
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-001', 'TASK', 'wt-001-01-01-01-01', 'TASK', 'wt-001-01-01-01-02', 'FS', 0, 'proj-001', 'mock-data')
ON CONFLICT DO NOTHING;

-- Chain: RFP Structure Analysis -> Requirements Extraction
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-002', 'TASK', 'wt-001-01-01-01-02', 'TASK', 'wt-001-01-01-01-03', 'FS', 0, 'proj-001', 'mock-data')
ON CONFLICT DO NOTHING;

-- Chain: Requirements Extraction -> Functional Classification
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-003', 'TASK', 'wt-001-01-01-01-03', 'TASK', 'wt-001-01-01-02-01', 'FS', 0, 'proj-001', 'mock-data')
ON CONFLICT DO NOTHING;

-- Chain: Functional Classification -> Priority Assignment
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-004', 'TASK', 'wt-001-01-01-02-01', 'TASK', 'wt-001-01-01-02-02', 'FS', 0, 'proj-001', 'mock-data')
ON CONFLICT DO NOTHING;

-- Chain: Priority Assignment -> Documentation (Parallel path merge)
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-005', 'TASK', 'wt-001-01-01-02-02', 'TASK', 'wt-001-01-01-02-03', 'FS', 0, 'proj-001', 'mock-data')
ON CONFLICT DO NOTHING;

-- ============================================
-- 3. Project 1 Phase 2: System Design Dependencies
-- Critical Path: Tech Investigation -> Tech Comparison -> Final Selection -> Component Definition
-- ============================================

-- Tech Stack Selection Chain
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-006', 'TASK', 'wt-001-02-01-01-01', 'TASK', 'wt-001-02-01-01-02', 'FS', 0, 'proj-001', 'mock-data')
ON CONFLICT DO NOTHING;

INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-007', 'TASK', 'wt-001-02-01-01-02', 'TASK', 'wt-001-02-01-01-03', 'FS', 0, 'proj-001', 'mock-data')
ON CONFLICT DO NOTHING;

-- Tech Selection -> System Architecture (Critical)
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-008', 'TASK', 'wt-001-02-01-01-03', 'TASK', 'wt-001-02-01-02-01', 'FS', 0, 'proj-001', 'mock-data')
ON CONFLICT DO NOTHING;

-- System Architecture Chain
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-009', 'TASK', 'wt-001-02-01-02-01', 'TASK', 'wt-001-02-01-02-02', 'FS', 0, 'proj-001', 'mock-data')
ON CONFLICT DO NOTHING;

INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-010', 'TASK', 'wt-001-02-01-02-02', 'TASK', 'wt-001-02-01-02-03', 'FS', 0, 'proj-001', 'mock-data')
ON CONFLICT DO NOTHING;

INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-011', 'TASK', 'wt-001-02-01-02-03', 'TASK', 'wt-001-02-01-02-04', 'FS', 0, 'proj-001', 'mock-data')
ON CONFLICT DO NOTHING;

-- Infrastructure Design Chain (Parallel to System Architecture)
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-012', 'TASK', 'wt-001-02-01-03-01', 'TASK', 'wt-001-02-01-03-02', 'FS', 0, 'proj-001', 'mock-data')
ON CONFLICT DO NOTHING;

INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-013', 'TASK', 'wt-001-02-01-03-02', 'TASK', 'wt-001-02-01-03-03', 'FS', 0, 'proj-001', 'mock-data')
ON CONFLICT DO NOTHING;

-- System Architecture -> Infrastructure Design (Cross-dependency)
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-014', 'TASK', 'wt-001-02-01-02-02', 'TASK', 'wt-001-02-01-03-01', 'SS', 0, 'proj-001', 'mock-data')
ON CONFLICT DO NOTHING;

-- ERD Design Chain
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-015', 'TASK', 'wt-001-02-02-01-01', 'TASK', 'wt-001-02-02-01-02', 'FS', 0, 'proj-001', 'mock-data')
ON CONFLICT DO NOTHING;

INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-016', 'TASK', 'wt-001-02-02-01-02', 'TASK', 'wt-001-02-02-01-03', 'FS', 0, 'proj-001', 'mock-data')
ON CONFLICT DO NOTHING;

-- ERD -> Schema Definition
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-017', 'TASK', 'wt-001-02-02-01-03', 'TASK', 'wt-001-02-02-02-01', 'FS', 0, 'proj-001', 'mock-data')
ON CONFLICT DO NOTHING;

-- Schema Definition Chain
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-018', 'TASK', 'wt-001-02-02-02-01', 'TASK', 'wt-001-02-02-02-02', 'FS', 0, 'proj-001', 'mock-data')
ON CONFLICT DO NOTHING;

INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-019', 'TASK', 'wt-001-02-02-02-02', 'TASK', 'wt-001-02-02-02-03', 'FS', 0, 'proj-001', 'mock-data')
ON CONFLICT DO NOTHING;

-- API Specification Chain (Depends on ERD completion)
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-020', 'TASK', 'wt-001-02-02-01-03', 'TASK', 'wt-001-02-03-01-01', 'SS', 1, 'proj-001', 'mock-data')
ON CONFLICT DO NOTHING;

INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-021', 'TASK', 'wt-001-02-03-01-01', 'TASK', 'wt-001-02-03-01-02', 'FS', 0, 'proj-001', 'mock-data')
ON CONFLICT DO NOTHING;

INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-022', 'TASK', 'wt-001-02-03-01-02', 'TASK', 'wt-001-02-03-01-03', 'FS', 0, 'proj-001', 'mock-data')
ON CONFLICT DO NOTHING;

-- ============================================
-- 4. Project 2: Mobile App Dependencies
-- Critical Path: App Download -> Feature Analysis -> Comparison Matrix -> Report Research
-- ============================================

-- Competitor App Analysis Chain
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-023', 'TASK', 'wt-002-01-01-01-01', 'TASK', 'wt-002-01-01-01-02', 'FS', 0, 'proj-002', 'mock-data')
ON CONFLICT DO NOTHING;

INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-024', 'TASK', 'wt-002-01-01-01-02', 'TASK', 'wt-002-01-01-01-03', 'FS', 0, 'proj-002', 'mock-data')
ON CONFLICT DO NOTHING;

-- Market Trend Research Chain
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-025', 'TASK', 'wt-002-01-01-02-01', 'TASK', 'wt-002-01-01-02-02', 'FS', 0, 'proj-002', 'mock-data')
ON CONFLICT DO NOTHING;

INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-026', 'TASK', 'wt-002-01-01-02-02', 'TASK', 'wt-002-01-01-02-03', 'FS', 0, 'proj-002', 'mock-data')
ON CONFLICT DO NOTHING;

-- Competitor Analysis -> Market Trend (Parallel path, can start together)
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-027', 'TASK', 'wt-002-01-01-01-03', 'TASK', 'wt-002-01-01-02-03', 'FS', 0, 'proj-002', 'mock-data')
ON CONFLICT DO NOTHING;

-- Persona Definition Chain
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-028', 'TASK', 'wt-002-01-02-01-01', 'TASK', 'wt-002-01-02-01-02', 'FS', 0, 'proj-002', 'mock-data')
ON CONFLICT DO NOTHING;

-- Market Research -> Persona (Cross-dependency)
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-task-029', 'TASK', 'wt-002-01-01-02-02', 'TASK', 'wt-002-01-02-01-01', 'SS', 0, 'proj-002', 'mock-data')
ON CONFLICT DO NOTHING;

-- ============================================
-- 5. Cross-level Dependencies (Item -> Task for complex scenarios)
-- ============================================

-- WbsItem 1.1.3 (Requirements Extraction) -> WbsTask 2.1.1.1 (Tech Investigation)
-- Shows that Phase 1 completion gates Phase 2 start
INSERT INTO project.wbs_dependencies (id, predecessor_type, predecessor_id, successor_type, successor_id, dependency_type, lag_days, project_id, created_by)
VALUES ('dep-cross-001', 'ITEM', 'wi-001-01-01-03', 'TASK', 'wt-001-02-01-01-01', 'FS', 1, 'proj-001', 'mock-data')
ON CONFLICT DO NOTHING;

-- ============================================
-- 6. Summary of Dependencies for Critical Path Testing
-- ============================================
-- Total Task-to-Task dependencies: 27
-- Total Cross-level dependencies: 1
--
-- Dependency Types Used:
-- - FS (Finish-to-Start): 26 - Most common, strict sequencing
-- - SS (Start-to-Start): 3 - Parallel tasks that start together
-- - lag_days = 0: Immediate successor
-- - lag_days = 1: 1 day buffer between tasks
--
-- Critical Paths to Verify:
-- Project 1, Phase 1: wt-001-01-01-01-01 -> wt-001-01-01-01-02 -> wt-001-01-01-01-03 -> wt-001-01-01-02-01
-- Project 1, Phase 2: wt-001-02-01-01-01 -> ... -> wt-001-02-03-01-03
-- Project 2: wt-002-01-01-01-01 -> wt-002-01-01-01-02 -> wt-002-01-01-01-03 -> wt-002-01-01-02-03
--
-- Non-Critical Paths (with Float):
-- - Infrastructure design tasks (parallel to system architecture)
-- - Persona definition tasks (can start with market research)
-- ============================================


-- ============================================================
-- Source: V20260210__extended_wbs_mock_data
-- ============================================================
-- Extended WBS Mock Data
-- Version: 20260210
-- Description: Additional WBS Items, Tasks, and Dependencies for complete coverage

-- ============================================
-- 1. Additional WBS Items for Phase 4, 5, 6 (Project 1)
-- ============================================
INSERT INTO project.wbs_items (id, group_id, phase_id, code, name, description, status, progress, planned_start_date, planned_end_date, weight, order_num, estimated_hours, assignee_id, created_at, updated_at, created_by)
VALUES
    -- Phase 4, Group 4.1: Core API Development
    ('wi-001-04-01-01', 'wg-001-04-01', 'phase-001-04', '4.1.1', 'API 프레임워크 설정', 'Spring Boot 프로젝트 설정 및 기본 구조', 'NOT_STARTED', 0, '2026-03-15', '2026-03-18', 30, 1, 16, 'user-dev-001', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-04-01-02', 'wg-001-04-01', 'phase-001-04', '4.1.2', '청구 API 개발', '보험 청구 CRUD API 구현', 'NOT_STARTED', 0, '2026-03-18', '2026-03-28', 40, 2, 32, 'user-dev-001', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-04-01-03', 'wg-001-04-01', 'phase-001-04', '4.1.3', '심사 API 개발', '보험 심사 워크플로우 API', 'NOT_STARTED', 0, '2026-03-28', '2026-04-05', 30, 3, 24, 'user-dev-002', NOW(), NOW(), 'user-pm-001'),

    -- Phase 4, Group 4.2: Authentication Service
    ('wi-001-04-02-01', 'wg-001-04-02', 'phase-001-04', '4.2.1', 'OAuth2 서버 구축', 'OAuth2 인증 서버 구현', 'NOT_STARTED', 0, '2026-03-25', '2026-04-02', 40, 1, 24, 'user-dev-003', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-04-02-02', 'wg-001-04-02', 'phase-001-04', '4.2.2', 'JWT 토큰 관리', 'JWT 발급 및 검증 로직', 'NOT_STARTED', 0, '2026-04-02', '2026-04-08', 30, 2, 16, 'user-dev-003', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-04-02-03', 'wg-001-04-02', 'phase-001-04', '4.2.3', 'RBAC 구현', '역할 기반 접근 제어', 'NOT_STARTED', 0, '2026-04-08', '2026-04-15', 30, 3, 20, 'user-dev-003', NOW(), NOW(), 'user-pm-001'),

    -- Phase 4, Group 4.3: External Integration
    ('wi-001-04-03-01', 'wg-001-04-03', 'phase-001-04', '4.3.1', 'ESB 어댑터 개발', 'Enterprise Service Bus 연동', 'NOT_STARTED', 0, '2026-04-10', '2026-04-18', 35, 1, 24, 'user-dev-001', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-04-03-02', 'wg-001-04-03', 'phase-001-04', '4.3.2', '레거시 API 래퍼', '기존 시스템 API 래핑', 'NOT_STARTED', 0, '2026-04-18', '2026-04-25', 35, 2, 20, 'user-dev-002', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-04-03-03', 'wg-001-04-03', 'phase-001-04', '4.3.3', '데이터 동기화', '실시간 데이터 동기화 구현', 'NOT_STARTED', 0, '2026-04-25', '2026-04-30', 30, 3, 16, 'user-dev-002', NOW(), NOW(), 'user-pm-001'),

    -- Phase 4, Group 4.4: Data Migration
    ('wi-001-04-04-01', 'wg-001-04-04', 'phase-001-04', '4.4.1', '마이그레이션 설계', '데이터 이관 전략 수립', 'NOT_STARTED', 0, '2026-04-25', '2026-04-30', 30, 1, 16, 'user-ba-001', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-04-04-02', 'wg-001-04-04', 'phase-001-04', '4.4.2', 'ETL 파이프라인', 'ETL 프로세스 구축', 'NOT_STARTED', 0, '2026-04-30', '2026-05-08', 40, 2, 24, 'user-dev-002', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-04-04-03', 'wg-001-04-04', 'phase-001-04', '4.4.3', '데이터 검증', '이관 데이터 정합성 검증', 'NOT_STARTED', 0, '2026-05-08', '2026-05-15', 30, 3, 16, 'user-qa-001', NOW(), NOW(), 'user-pm-001'),

    -- Phase 5, Group 5.1: Integration Testing
    ('wi-001-05-01-01', 'wg-001-05-01', 'phase-001-05', '5.1.1', '테스트 환경 구축', '통합 테스트 환경 설정', 'NOT_STARTED', 0, '2026-05-01', '2026-05-05', 25, 1, 16, 'user-qa-001', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-05-01-02', 'wg-001-05-01', 'phase-001-05', '5.1.2', 'API 통합 테스트', '전체 API 통합 테스트 수행', 'NOT_STARTED', 0, '2026-05-05', '2026-05-12', 40, 2, 32, 'user-qa-001', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-05-01-03', 'wg-001-05-01', 'phase-001-05', '5.1.3', 'E2E 테스트', '엔드투엔드 시나리오 테스트', 'NOT_STARTED', 0, '2026-05-12', '2026-05-20', 35, 3, 24, 'user-qa-001', NOW(), NOW(), 'user-pm-001'),

    -- Phase 5, Group 5.2: Performance Testing
    ('wi-001-05-02-01', 'wg-001-05-02', 'phase-001-05', '5.2.1', '부하 테스트', 'JMeter 기반 부하 테스트', 'NOT_STARTED', 0, '2026-05-15', '2026-05-22', 40, 1, 24, 'user-qa-001', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-05-02-02', 'wg-001-05-02', 'phase-001-05', '5.2.2', '스트레스 테스트', '최대 부하 한계 테스트', 'NOT_STARTED', 0, '2026-05-22', '2026-05-27', 30, 2, 16, 'user-qa-001', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-05-02-03', 'wg-001-05-02', 'phase-001-05', '5.2.3', '성능 최적화', '병목 구간 식별 및 개선', 'NOT_STARTED', 0, '2026-05-27', '2026-06-01', 30, 3, 20, 'user-dev-001', NOW(), NOW(), 'user-pm-001'),

    -- Phase 5, Group 5.3: Security Testing
    ('wi-001-05-03-01', 'wg-001-05-03', 'phase-001-05', '5.3.1', '취약점 스캔', 'OWASP 기반 취약점 점검', 'NOT_STARTED', 0, '2026-05-25', '2026-06-01', 35, 1, 20, 'user-dev-003', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-05-03-02', 'wg-001-05-03', 'phase-001-05', '5.3.2', '침투 테스트', '모의 해킹 테스트 수행', 'NOT_STARTED', 0, '2026-06-01', '2026-06-06', 35, 2, 24, 'user-dev-003', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-05-03-03', 'wg-001-05-03', 'phase-001-05', '5.3.3', '보안 조치', '발견된 취약점 조치', 'NOT_STARTED', 0, '2026-06-06', '2026-06-10', 30, 3, 16, 'user-dev-003', NOW(), NOW(), 'user-pm-001'),

    -- Phase 5, Group 5.4: UAT
    ('wi-001-05-04-01', 'wg-001-05-04', 'phase-001-05', '5.4.1', 'UAT 시나리오 작성', '사용자 인수 테스트 시나리오', 'NOT_STARTED', 0, '2026-06-05', '2026-06-08', 30, 1, 12, 'user-ba-001', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-05-04-02', 'wg-001-05-04', 'phase-001-05', '5.4.2', 'UAT 수행', '현업 사용자 테스트 진행', 'NOT_STARTED', 0, '2026-06-08', '2026-06-12', 40, 2, 20, 'user-ba-001', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-05-04-03', 'wg-001-05-04', 'phase-001-05', '5.4.3', '피드백 반영', 'UAT 피드백 수정 적용', 'NOT_STARTED', 0, '2026-06-12', '2026-06-15', 30, 3, 12, 'user-dev-001', NOW(), NOW(), 'user-pm-001'),

    -- Phase 6, Group 6.1: Production Environment
    ('wi-001-06-01-01', 'wg-001-06-01', 'phase-001-06', '6.1.1', '인프라 프로비저닝', 'AWS 운영 환경 구축', 'NOT_STARTED', 0, '2026-06-15', '2026-06-18', 40, 1, 20, 'user-dev-003', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-06-01-02', 'wg-001-06-01', 'phase-001-06', '6.1.2', 'CI/CD 파이프라인', '운영 배포 파이프라인 구축', 'NOT_STARTED', 0, '2026-06-18', '2026-06-20', 30, 2, 12, 'user-dev-003', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-06-01-03', 'wg-001-06-01', 'phase-001-06', '6.1.3', '모니터링 설정', 'APM 및 로그 모니터링', 'NOT_STARTED', 0, '2026-06-20', '2026-06-22', 30, 3, 12, 'user-dev-003', NOW(), NOW(), 'user-pm-001'),

    -- Phase 6, Group 6.2: Deployment & Launch
    ('wi-001-06-02-01', 'wg-001-06-02', 'phase-001-06', '6.2.1', '스테이징 배포', '스테이징 환경 배포 및 검증', 'NOT_STARTED', 0, '2026-06-20', '2026-06-23', 30, 1, 12, 'user-dev-001', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-06-02-02', 'wg-001-06-02', 'phase-001-06', '6.2.2', '프로덕션 배포', '운영 환경 배포', 'NOT_STARTED', 0, '2026-06-23', '2026-06-25', 40, 2, 16, 'user-dev-001', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-06-02-03', 'wg-001-06-02', 'phase-001-06', '6.2.3', '오픈 모니터링', '오픈 후 집중 모니터링', 'NOT_STARTED', 0, '2026-06-25', '2026-06-28', 30, 3, 20, 'user-dev-003', NOW(), NOW(), 'user-pm-001'),

    -- Phase 6, Group 6.3: Training & Handover
    ('wi-001-06-03-01', 'wg-001-06-03', 'phase-001-06', '6.3.1', '운영자 교육', '시스템 운영 교육 진행', 'NOT_STARTED', 0, '2026-06-25', '2026-06-27', 35, 1, 12, 'user-ba-001', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-06-03-02', 'wg-001-06-03', 'phase-001-06', '6.3.2', '사용자 매뉴얼', '사용자 가이드 문서 작성', 'NOT_STARTED', 0, '2026-06-27', '2026-06-29', 35, 2, 16, 'user-ba-001', NOW(), NOW(), 'user-pm-001'),
    ('wi-001-06-03-03', 'wg-001-06-03', 'phase-001-06', '6.3.3', '인수인계', '운영팀 인수인계 완료', 'NOT_STARTED', 0, '2026-06-29', '2026-06-30', 30, 3, 8, 'user-pm-001', NOW(), NOW(), 'user-pm-001')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. Additional WBS Items for Project 2
-- ============================================
INSERT INTO project.wbs_items (id, group_id, phase_id, code, name, description, status, progress, planned_start_date, planned_end_date, weight, order_num, estimated_hours, assignee_id, created_at, updated_at, created_by)
VALUES
    -- Phase 2-1, Group 1.3: Documentation
    ('wi-002-01-03-01', 'wg-002-01-03', 'phase-002-01', '1.3.1', 'PRD 작성', '제품 요구사항 문서 작성', 'NOT_STARTED', 0, '2026-02-18', '2026-02-23', 50, 1, 20, 'user-ba-001', NOW(), NOW(), 'user-pm-002'),
    ('wi-002-01-03-02', 'wg-002-01-03', 'phase-002-01', '1.3.2', '기능 명세서', '상세 기능 명세 문서화', 'NOT_STARTED', 0, '2026-02-23', '2026-02-28', 50, 2, 16, 'user-ba-001', NOW(), NOW(), 'user-pm-002'),

    -- Phase 2-2, Group 2.1: UX Design
    ('wi-002-02-01-01', 'wg-002-02-01', 'phase-002-02', '2.1.1', '사용자 여정 맵', 'Customer Journey Map 작성', 'NOT_STARTED', 0, '2026-03-01', '2026-03-05', 30, 1, 12, 'user-ba-001', NOW(), NOW(), 'user-pm-002'),
    ('wi-002-02-01-02', 'wg-002-02-01', 'phase-002-02', '2.1.2', '와이어프레임', '주요 화면 와이어프레임', 'NOT_STARTED', 0, '2026-03-05', '2026-03-10', 40, 2, 20, 'user-ba-001', NOW(), NOW(), 'user-pm-002'),
    ('wi-002-02-01-03', 'wg-002-02-01', 'phase-002-02', '2.1.3', 'IA 설계', '정보 구조 설계', 'NOT_STARTED', 0, '2026-03-10', '2026-03-15', 30, 3, 12, 'user-ba-001', NOW(), NOW(), 'user-pm-002'),

    -- Phase 2-2, Group 2.2: UI Design
    ('wi-002-02-02-01', 'wg-002-02-02', 'phase-002-02', '2.2.1', '디자인 시스템', '컴포넌트 라이브러리 구축', 'NOT_STARTED', 0, '2026-03-12', '2026-03-18', 35, 1, 24, 'user-ba-001', NOW(), NOW(), 'user-pm-002'),
    ('wi-002-02-02-02', 'wg-002-02-02', 'phase-002-02', '2.2.2', '화면 디자인', '주요 화면 UI 디자인', 'NOT_STARTED', 0, '2026-03-18', '2026-03-25', 40, 2, 32, 'user-ba-001', NOW(), NOW(), 'user-pm-002'),
    ('wi-002-02-02-03', 'wg-002-02-02', 'phase-002-02', '2.2.3', '디자인 리뷰', '디자인 QA 및 수정', 'NOT_STARTED', 0, '2026-03-25', '2026-03-28', 25, 3, 12, 'user-qa-001', NOW(), NOW(), 'user-pm-002'),

    -- Phase 2-2, Group 2.3: Prototype
    ('wi-002-02-03-01', 'wg-002-02-03', 'phase-002-02', '2.3.1', '인터랙션 설계', '화면 전환 및 애니메이션', 'NOT_STARTED', 0, '2026-03-25', '2026-03-28', 50, 1, 16, 'user-ba-001', NOW(), NOW(), 'user-pm-002'),
    ('wi-002-02-03-02', 'wg-002-02-03', 'phase-002-02', '2.3.2', '프로토타입 제작', 'Figma 프로토타입 완성', 'NOT_STARTED', 0, '2026-03-28', '2026-03-31', 50, 2, 12, 'user-ba-001', NOW(), NOW(), 'user-pm-002'),

    -- Phase 2-3, Group 3.1: iOS Development
    ('wi-002-03-01-01', 'wg-002-03-01', 'phase-002-03', '3.1.1', 'iOS 프로젝트 설정', 'Xcode 프로젝트 초기 설정', 'NOT_STARTED', 0, '2026-04-01', '2026-04-05', 20, 1, 12, 'user-dev-001', NOW(), NOW(), 'user-pm-002'),
    ('wi-002-03-01-02', 'wg-002-03-01', 'phase-002-03', '3.1.2', 'iOS 핵심 기능', '로그인, 대시보드 구현', 'NOT_STARTED', 0, '2026-04-05', '2026-05-01', 50, 2, 80, 'user-dev-001', NOW(), NOW(), 'user-pm-002'),
    ('wi-002-03-01-03', 'wg-002-03-01', 'phase-002-03', '3.1.3', 'iOS 테스트', 'Unit/UI 테스트 작성', 'NOT_STARTED', 0, '2026-05-01', '2026-05-31', 30, 3, 40, 'user-qa-001', NOW(), NOW(), 'user-pm-002'),

    -- Phase 2-3, Group 3.2: Android Development
    ('wi-002-03-02-01', 'wg-002-03-02', 'phase-002-03', '3.2.1', 'Android 프로젝트 설정', 'Android Studio 프로젝트 설정', 'NOT_STARTED', 0, '2026-04-01', '2026-04-05', 20, 1, 12, 'user-dev-002', NOW(), NOW(), 'user-pm-002'),
    ('wi-002-03-02-02', 'wg-002-03-02', 'phase-002-03', '3.2.2', 'Android 핵심 기능', '로그인, 대시보드 구현', 'NOT_STARTED', 0, '2026-04-05', '2026-05-01', 50, 2, 80, 'user-dev-002', NOW(), NOW(), 'user-pm-002'),
    ('wi-002-03-02-03', 'wg-002-03-02', 'phase-002-03', '3.2.3', 'Android 테스트', 'Unit/UI 테스트 작성', 'NOT_STARTED', 0, '2026-05-01', '2026-05-31', 30, 3, 40, 'user-qa-001', NOW(), NOW(), 'user-pm-002'),

    -- Phase 2-3, Group 3.3: Common Module
    ('wi-002-03-03-01', 'wg-002-03-03', 'phase-002-03', '3.3.1', 'API 클라이언트', '공통 네트워크 레이어', 'NOT_STARTED', 0, '2026-04-15', '2026-05-01', 40, 1, 32, 'user-dev-001', NOW(), NOW(), 'user-pm-002'),
    ('wi-002-03-03-02', 'wg-002-03-03', 'phase-002-03', '3.3.2', '공통 유틸리티', '공유 비즈니스 로직', 'NOT_STARTED', 0, '2026-05-01', '2026-05-20', 35, 2, 24, 'user-dev-002', NOW(), NOW(), 'user-pm-002'),
    ('wi-002-03-03-03', 'wg-002-03-03', 'phase-002-03', '3.3.3', '상태 관리', '앱 상태 관리 모듈', 'NOT_STARTED', 0, '2026-05-20', '2026-06-15', 25, 3, 20, 'user-dev-001', NOW(), NOW(), 'user-pm-002')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 3. Additional WBS Tasks for Phase 4
-- ============================================
INSERT INTO project.wbs_tasks (id, item_id, group_id, phase_id, code, name, description, status, progress, weight, order_num, estimated_hours, assignee_id, created_at, updated_at, created_by)
VALUES
    -- Item 4.1.1 Tasks
    ('wt-001-04-01-01-01', 'wi-001-04-01-01', 'wg-001-04-01', 'phase-001-04', '4.1.1.1', 'Spring Boot 설정', '기본 프로젝트 구조 생성', 'NOT_STARTED', 0, 40, 1, 6, 'user-dev-001', NOW(), NOW(), 'user-pm-001'),
    ('wt-001-04-01-01-02', 'wi-001-04-01-01', 'wg-001-04-01', 'phase-001-04', '4.1.1.2', 'DB 연결 설정', 'PostgreSQL 연결 구성', 'NOT_STARTED', 0, 30, 2, 4, 'user-dev-001', NOW(), NOW(), 'user-pm-001'),
    ('wt-001-04-01-01-03', 'wi-001-04-01-01', 'wg-001-04-01', 'phase-001-04', '4.1.1.3', '공통 모듈 작성', '예외 처리, 로깅 등 공통', 'NOT_STARTED', 0, 30, 3, 6, 'user-dev-001', NOW(), NOW(), 'user-pm-001'),

    -- Item 4.1.2 Tasks
    ('wt-001-04-01-02-01', 'wi-001-04-01-02', 'wg-001-04-01', 'phase-001-04', '4.1.2.1', '청구 엔티티', 'Claims Entity 구현', 'NOT_STARTED', 0, 30, 1, 8, 'user-dev-001', NOW(), NOW(), 'user-pm-001'),
    ('wt-001-04-01-02-02', 'wi-001-04-01-02', 'wg-001-04-01', 'phase-001-04', '4.1.2.2', '청구 Repository', 'JPA Repository 구현', 'NOT_STARTED', 0, 25, 2, 6, 'user-dev-001', NOW(), NOW(), 'user-pm-001'),
    ('wt-001-04-01-02-03', 'wi-001-04-01-02', 'wg-001-04-01', 'phase-001-04', '4.1.2.3', '청구 Service', '비즈니스 로직 구현', 'NOT_STARTED', 0, 25, 3, 10, 'user-dev-001', NOW(), NOW(), 'user-pm-001'),
    ('wt-001-04-01-02-04', 'wi-001-04-01-02', 'wg-001-04-01', 'phase-001-04', '4.1.2.4', '청구 Controller', 'REST API 엔드포인트', 'NOT_STARTED', 0, 20, 4, 8, 'user-dev-001', NOW(), NOW(), 'user-pm-001'),

    -- Item 4.1.3 Tasks
    ('wt-001-04-01-03-01', 'wi-001-04-01-03', 'wg-001-04-01', 'phase-001-04', '4.1.3.1', '심사 워크플로우', '상태 전이 로직 구현', 'NOT_STARTED', 0, 40, 1, 12, 'user-dev-002', NOW(), NOW(), 'user-pm-001'),
    ('wt-001-04-01-03-02', 'wi-001-04-01-03', 'wg-001-04-01', 'phase-001-04', '4.1.3.2', '심사 API', '심사 관련 API 구현', 'NOT_STARTED', 0, 35, 2, 8, 'user-dev-002', NOW(), NOW(), 'user-pm-001'),
    ('wt-001-04-01-03-03', 'wi-001-04-01-03', 'wg-001-04-01', 'phase-001-04', '4.1.3.3', '알림 연동', '심사 상태 변경 알림', 'NOT_STARTED', 0, 25, 3, 4, 'user-dev-002', NOW(), NOW(), 'user-pm-001'),

    -- Item 4.2.1 Tasks
    ('wt-001-04-02-01-01', 'wi-001-04-02-01', 'wg-001-04-02', 'phase-001-04', '4.2.1.1', 'OAuth2 구성', 'Spring Security OAuth2 설정', 'NOT_STARTED', 0, 35, 1, 8, 'user-dev-003', NOW(), NOW(), 'user-pm-001'),
    ('wt-001-04-02-01-02', 'wi-001-04-02-01', 'wg-001-04-02', 'phase-001-04', '4.2.1.2', '인증 필터', '커스텀 인증 필터 구현', 'NOT_STARTED', 0, 35, 2, 8, 'user-dev-003', NOW(), NOW(), 'user-pm-001'),
    ('wt-001-04-02-01-03', 'wi-001-04-02-01', 'wg-001-04-02', 'phase-001-04', '4.2.1.3', '토큰 저장소', '토큰 저장 및 관리', 'NOT_STARTED', 0, 30, 3, 8, 'user-dev-003', NOW(), NOW(), 'user-pm-001'),

    -- Item 4.2.2 Tasks
    ('wt-001-04-02-02-01', 'wi-001-04-02-02', 'wg-001-04-02', 'phase-001-04', '4.2.2.1', 'JWT 생성', 'JWT 토큰 생성 로직', 'NOT_STARTED', 0, 40, 1, 6, 'user-dev-003', NOW(), NOW(), 'user-pm-001'),
    ('wt-001-04-02-02-02', 'wi-001-04-02-02', 'wg-001-04-02', 'phase-001-04', '4.2.2.2', 'JWT 검증', '토큰 유효성 검증', 'NOT_STARTED', 0, 35, 2, 6, 'user-dev-003', NOW(), NOW(), 'user-pm-001'),
    ('wt-001-04-02-02-03', 'wi-001-04-02-02', 'wg-001-04-02', 'phase-001-04', '4.2.2.3', '리프레시 토큰', '토큰 갱신 메커니즘', 'NOT_STARTED', 0, 25, 3, 4, 'user-dev-003', NOW(), NOW(), 'user-pm-001'),

    -- Item 4.2.3 Tasks
    ('wt-001-04-02-03-01', 'wi-001-04-02-03', 'wg-001-04-02', 'phase-001-04', '4.2.3.1', '역할 정의', 'Role 엔티티 및 Enum', 'NOT_STARTED', 0, 30, 1, 6, 'user-dev-003', NOW(), NOW(), 'user-pm-001'),
    ('wt-001-04-02-03-02', 'wi-001-04-02-03', 'wg-001-04-02', 'phase-001-04', '4.2.3.2', '권한 체크', '@PreAuthorize 구현', 'NOT_STARTED', 0, 40, 2, 8, 'user-dev-003', NOW(), NOW(), 'user-pm-001'),
    ('wt-001-04-02-03-03', 'wi-001-04-02-03', 'wg-001-04-02', 'phase-001-04', '4.2.3.3', '권한 테스트', '역할별 접근 테스트', 'NOT_STARTED', 0, 30, 3, 6, 'user-qa-001', NOW(), NOW(), 'user-pm-001'),

    -- Item 4.3.1 Tasks
    ('wt-001-04-03-01-01', 'wi-001-04-03-01', 'wg-001-04-03', 'phase-001-04', '4.3.1.1', 'ESB 클라이언트', 'ESB 연결 클라이언트', 'NOT_STARTED', 0, 40, 1, 10, 'user-dev-001', NOW(), NOW(), 'user-pm-001'),
    ('wt-001-04-03-01-02', 'wi-001-04-03-01', 'wg-001-04-03', 'phase-001-04', '4.3.1.2', '메시지 변환', '데이터 포맷 변환', 'NOT_STARTED', 0, 35, 2, 8, 'user-dev-001', NOW(), NOW(), 'user-pm-001'),
    ('wt-001-04-03-01-03', 'wi-001-04-03-01', 'wg-001-04-03', 'phase-001-04', '4.3.1.3', '에러 핸들링', '연동 오류 처리', 'NOT_STARTED', 0, 25, 3, 6, 'user-dev-001', NOW(), NOW(), 'user-pm-001'),

    -- Item 4.3.2 Tasks
    ('wt-001-04-03-02-01', 'wi-001-04-03-02', 'wg-001-04-03', 'phase-001-04', '4.3.2.1', '레거시 분석', '기존 API 분석', 'NOT_STARTED', 0, 30, 1, 6, 'user-ba-001', NOW(), NOW(), 'user-pm-001'),
    ('wt-001-04-03-02-02', 'wi-001-04-03-02', 'wg-001-04-03', 'phase-001-04', '4.3.2.2', '래퍼 구현', 'API 래퍼 서비스', 'NOT_STARTED', 0, 45, 2, 10, 'user-dev-002', NOW(), NOW(), 'user-pm-001'),
    ('wt-001-04-03-02-03', 'wi-001-04-03-02', 'wg-001-04-03', 'phase-001-04', '4.3.2.3', '연동 테스트', '래퍼 기능 테스트', 'NOT_STARTED', 0, 25, 3, 4, 'user-qa-001', NOW(), NOW(), 'user-pm-001'),

    -- Item 4.3.3 Tasks
    ('wt-001-04-03-03-01', 'wi-001-04-03-03', 'wg-001-04-03', 'phase-001-04', '4.3.3.1', 'CDC 설정', 'Change Data Capture 구성', 'NOT_STARTED', 0, 40, 1, 6, 'user-dev-002', NOW(), NOW(), 'user-pm-001'),
    ('wt-001-04-03-03-02', 'wi-001-04-03-03', 'wg-001-04-03', 'phase-001-04', '4.3.3.2', '동기화 로직', '양방향 동기화 구현', 'NOT_STARTED', 0, 40, 2, 6, 'user-dev-002', NOW(), NOW(), 'user-pm-001'),
    ('wt-001-04-03-03-03', 'wi-001-04-03-03', 'wg-001-04-03', 'phase-001-04', '4.3.3.3', '충돌 해결', '데이터 충돌 처리', 'NOT_STARTED', 0, 20, 3, 4, 'user-dev-002', NOW(), NOW(), 'user-pm-001'),

    -- Item 4.4.1 Tasks
    ('wt-001-04-04-01-01', 'wi-001-04-04-01', 'wg-001-04-04', 'phase-001-04', '4.4.1.1', '데이터 분석', '이관 대상 데이터 분석', 'NOT_STARTED', 0, 40, 1, 8, 'user-ba-001', NOW(), NOW(), 'user-pm-001'),
    ('wt-001-04-04-01-02', 'wi-001-04-04-01', 'wg-001-04-04', 'phase-001-04', '4.4.1.2', '매핑 정의', '소스-타겟 매핑 정의', 'NOT_STARTED', 0, 35, 2, 4, 'user-ba-001', NOW(), NOW(), 'user-pm-001'),
    ('wt-001-04-04-01-03', 'wi-001-04-04-01', 'wg-001-04-04', 'phase-001-04', '4.4.1.3', '검증 규칙', '데이터 검증 규칙 정의', 'NOT_STARTED', 0, 25, 3, 4, 'user-qa-001', NOW(), NOW(), 'user-pm-001'),

    -- Item 4.4.2 Tasks
    ('wt-001-04-04-02-01', 'wi-001-04-04-02', 'wg-001-04-04', 'phase-001-04', '4.4.2.1', 'ETL 설계', 'ETL 파이프라인 설계', 'NOT_STARTED', 0, 30, 1, 6, 'user-dev-002', NOW(), NOW(), 'user-pm-001'),
    ('wt-001-04-04-02-02', 'wi-001-04-04-02', 'wg-001-04-04', 'phase-001-04', '4.4.2.2', 'ETL 구현', 'Apache Airflow 파이프라인', 'NOT_STARTED', 0, 50, 2, 12, 'user-dev-002', NOW(), NOW(), 'user-pm-001'),
    ('wt-001-04-04-02-03', 'wi-001-04-04-02', 'wg-001-04-04', 'phase-001-04', '4.4.2.3', '파일럿 실행', '샘플 데이터 이관 테스트', 'NOT_STARTED', 0, 20, 3, 6, 'user-dev-002', NOW(), NOW(), 'user-pm-001'),

    -- Item 4.4.3 Tasks
    ('wt-001-04-04-03-01', 'wi-001-04-04-03', 'wg-001-04-04', 'phase-001-04', '4.4.3.1', '건수 검증', '이관 건수 대조', 'NOT_STARTED', 0, 30, 1, 4, 'user-qa-001', NOW(), NOW(), 'user-pm-001'),
    ('wt-001-04-04-03-02', 'wi-001-04-04-03', 'wg-001-04-04', 'phase-001-04', '4.4.3.2', '내용 검증', '샘플 데이터 내용 검증', 'NOT_STARTED', 0, 40, 2, 8, 'user-qa-001', NOW(), NOW(), 'user-pm-001'),
    ('wt-001-04-04-03-03', 'wi-001-04-04-03', 'wg-001-04-04', 'phase-001-04', '4.4.3.3', '이관 승인', '최종 이관 완료 승인', 'NOT_STARTED', 0, 30, 3, 4, 'user-pm-001', NOW(), NOW(), 'user-pm-001')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 4. WBS Dependencies
-- ============================================
INSERT INTO project.wbs_dependencies (id, project_id, predecessor_id, predecessor_type, successor_id, successor_type, dependency_type, lag_days, created_at, created_by)
VALUES
    -- Project 1 Phase Dependencies (Group level)
    ('dep-001-01', 'proj-001', 'wg-001-01-03', 'GROUP', 'wg-001-02-01', 'GROUP', 'FS', 0, NOW(), 'user-pm-001'),
    ('dep-001-02', 'proj-001', 'wg-001-02-01', 'GROUP', 'wg-001-02-02', 'GROUP', 'SS', 3, NOW(), 'user-pm-001'),
    ('dep-001-03', 'proj-001', 'wg-001-02-01', 'GROUP', 'wg-001-02-03', 'GROUP', 'SS', 7, NOW(), 'user-pm-001'),
    ('dep-001-04', 'proj-001', 'wg-001-02-02', 'GROUP', 'wg-001-02-04', 'GROUP', 'FS', 0, NOW(), 'user-pm-001'),
    ('dep-001-05', 'proj-001', 'wg-001-02-04', 'GROUP', 'wg-001-03-01', 'GROUP', 'FS', 0, NOW(), 'user-pm-001'),
    ('dep-001-06', 'proj-001', 'wg-001-03-01', 'GROUP', 'wg-001-03-02', 'GROUP', 'SS', 5, NOW(), 'user-pm-001'),
    ('dep-001-07', 'proj-001', 'wg-001-03-01', 'GROUP', 'wg-001-03-03', 'GROUP', 'SS', 10, NOW(), 'user-pm-001'),
    ('dep-001-08', 'proj-001', 'wg-001-03-02', 'GROUP', 'wg-001-03-04', 'GROUP', 'FS', -5, NOW(), 'user-pm-001'),
    ('dep-001-09', 'proj-001', 'wg-001-03-03', 'GROUP', 'wg-001-03-04', 'GROUP', 'FS', -5, NOW(), 'user-pm-001'),
    ('dep-001-10', 'proj-001', 'wg-001-03-01', 'GROUP', 'wg-001-04-01', 'GROUP', 'SS', 10, NOW(), 'user-pm-001'),
    ('dep-001-11', 'proj-001', 'wg-001-04-01', 'GROUP', 'wg-001-04-02', 'GROUP', 'SS', 5, NOW(), 'user-pm-001'),
    ('dep-001-12', 'proj-001', 'wg-001-04-02', 'GROUP', 'wg-001-04-03', 'GROUP', 'SS', 10, NOW(), 'user-pm-001'),
    ('dep-001-13', 'proj-001', 'wg-001-04-03', 'GROUP', 'wg-001-04-04', 'GROUP', 'SS', 10, NOW(), 'user-pm-001'),
    ('dep-001-14', 'proj-001', 'wg-001-04-04', 'GROUP', 'wg-001-05-01', 'GROUP', 'FS', -10, NOW(), 'user-pm-001'),
    ('dep-001-15', 'proj-001', 'wg-001-05-01', 'GROUP', 'wg-001-05-02', 'GROUP', 'SS', 10, NOW(), 'user-pm-001'),
    ('dep-001-16', 'proj-001', 'wg-001-05-02', 'GROUP', 'wg-001-05-03', 'GROUP', 'SS', 5, NOW(), 'user-pm-001'),
    ('dep-001-17', 'proj-001', 'wg-001-05-03', 'GROUP', 'wg-001-05-04', 'GROUP', 'FS', -5, NOW(), 'user-pm-001'),
    ('dep-001-18', 'proj-001', 'wg-001-05-04', 'GROUP', 'wg-001-06-01', 'GROUP', 'FS', 0, NOW(), 'user-pm-001'),
    ('dep-001-19', 'proj-001', 'wg-001-06-01', 'GROUP', 'wg-001-06-02', 'GROUP', 'SS', 3, NOW(), 'user-pm-001'),
    ('dep-001-20', 'proj-001', 'wg-001-06-02', 'GROUP', 'wg-001-06-03', 'GROUP', 'SS', 5, NOW(), 'user-pm-001'),

    -- Item-level Dependencies
    ('dep-001-21', 'proj-001', 'wi-001-02-01-01', 'ITEM', 'wi-001-02-01-02', 'ITEM', 'FS', 0, NOW(), 'user-pm-001'),
    ('dep-001-22', 'proj-001', 'wi-001-02-01-02', 'ITEM', 'wi-001-02-01-03', 'ITEM', 'SS', 2, NOW(), 'user-pm-001'),
    ('dep-001-23', 'proj-001', 'wi-001-02-02-01', 'ITEM', 'wi-001-02-02-02', 'ITEM', 'FS', 0, NOW(), 'user-pm-001'),
    ('dep-001-24', 'proj-001', 'wi-001-02-02-02', 'ITEM', 'wi-001-02-02-03', 'ITEM', 'FS', 0, NOW(), 'user-pm-001'),
    ('dep-001-25', 'proj-001', 'wi-001-04-01-01', 'ITEM', 'wi-001-04-01-02', 'ITEM', 'FS', 0, NOW(), 'user-pm-001'),
    ('dep-001-26', 'proj-001', 'wi-001-04-01-02', 'ITEM', 'wi-001-04-01-03', 'ITEM', 'FS', 0, NOW(), 'user-pm-001'),
    ('dep-001-27', 'proj-001', 'wi-001-04-02-01', 'ITEM', 'wi-001-04-02-02', 'ITEM', 'FS', 0, NOW(), 'user-pm-001'),
    ('dep-001-28', 'proj-001', 'wi-001-04-02-02', 'ITEM', 'wi-001-04-02-03', 'ITEM', 'FS', 0, NOW(), 'user-pm-001'),
    ('dep-001-29', 'proj-001', 'wi-001-05-01-01', 'ITEM', 'wi-001-05-01-02', 'ITEM', 'FS', 0, NOW(), 'user-pm-001'),
    ('dep-001-30', 'proj-001', 'wi-001-05-01-02', 'ITEM', 'wi-001-05-01-03', 'ITEM', 'FS', 0, NOW(), 'user-pm-001'),

    -- Task-level Dependencies
    ('dep-001-31', 'proj-001', 'wt-001-02-01-01-01', 'TASK', 'wt-001-02-01-01-02', 'TASK', 'FS', 0, NOW(), 'user-pm-001'),
    ('dep-001-32', 'proj-001', 'wt-001-02-01-01-02', 'TASK', 'wt-001-02-01-01-03', 'TASK', 'FS', 0, NOW(), 'user-pm-001'),
    ('dep-001-33', 'proj-001', 'wt-001-02-01-02-01', 'TASK', 'wt-001-02-01-02-02', 'TASK', 'FS', 0, NOW(), 'user-pm-001'),
    ('dep-001-34', 'proj-001', 'wt-001-02-01-02-02', 'TASK', 'wt-001-02-01-02-03', 'TASK', 'FS', 0, NOW(), 'user-pm-001'),
    ('dep-001-35', 'proj-001', 'wt-001-02-01-02-03', 'TASK', 'wt-001-02-01-02-04', 'TASK', 'FS', 0, NOW(), 'user-pm-001'),
    ('dep-001-36', 'proj-001', 'wt-001-04-01-01-01', 'TASK', 'wt-001-04-01-01-02', 'TASK', 'FS', 0, NOW(), 'user-pm-001'),
    ('dep-001-37', 'proj-001', 'wt-001-04-01-01-02', 'TASK', 'wt-001-04-01-01-03', 'TASK', 'FS', 0, NOW(), 'user-pm-001'),
    ('dep-001-38', 'proj-001', 'wt-001-04-01-02-01', 'TASK', 'wt-001-04-01-02-02', 'TASK', 'FS', 0, NOW(), 'user-pm-001'),
    ('dep-001-39', 'proj-001', 'wt-001-04-01-02-02', 'TASK', 'wt-001-04-01-02-03', 'TASK', 'FS', 0, NOW(), 'user-pm-001'),
    ('dep-001-40', 'proj-001', 'wt-001-04-01-02-03', 'TASK', 'wt-001-04-01-02-04', 'TASK', 'FS', 0, NOW(), 'user-pm-001'),

    -- Project 2 Dependencies
    ('dep-002-01', 'proj-002', 'wg-002-01-02', 'GROUP', 'wg-002-01-03', 'GROUP', 'SS', 5, NOW(), 'user-pm-002'),
    ('dep-002-02', 'proj-002', 'wg-002-01-03', 'GROUP', 'wg-002-02-01', 'GROUP', 'FS', 0, NOW(), 'user-pm-002'),
    ('dep-002-03', 'proj-002', 'wg-002-02-01', 'GROUP', 'wg-002-02-02', 'GROUP', 'SS', 7, NOW(), 'user-pm-002'),
    ('dep-002-04', 'proj-002', 'wg-002-02-02', 'GROUP', 'wg-002-02-03', 'GROUP', 'SS', 10, NOW(), 'user-pm-002'),
    ('dep-002-05', 'proj-002', 'wg-002-02-03', 'GROUP', 'wg-002-03-01', 'GROUP', 'FS', 0, NOW(), 'user-pm-002'),
    ('dep-002-06', 'proj-002', 'wg-002-02-03', 'GROUP', 'wg-002-03-02', 'GROUP', 'FS', 0, NOW(), 'user-pm-002'),
    ('dep-002-07', 'proj-002', 'wg-002-03-01', 'GROUP', 'wg-002-03-03', 'GROUP', 'SS', 10, NOW(), 'user-pm-002'),
    ('dep-002-08', 'proj-002', 'wg-002-03-02', 'GROUP', 'wg-002-03-03', 'GROUP', 'SS', 10, NOW(), 'user-pm-002'),

    -- Project 2 Item Dependencies
    ('dep-002-09', 'proj-002', 'wi-002-02-01-01', 'ITEM', 'wi-002-02-01-02', 'ITEM', 'FS', 0, NOW(), 'user-pm-002'),
    ('dep-002-10', 'proj-002', 'wi-002-02-01-02', 'ITEM', 'wi-002-02-01-03', 'ITEM', 'FS', 0, NOW(), 'user-pm-002'),
    ('dep-002-11', 'proj-002', 'wi-002-02-02-01', 'ITEM', 'wi-002-02-02-02', 'ITEM', 'FS', 0, NOW(), 'user-pm-002'),
    ('dep-002-12', 'proj-002', 'wi-002-02-02-02', 'ITEM', 'wi-002-02-02-03', 'ITEM', 'FS', 0, NOW(), 'user-pm-002')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Summary of Extended Mock Data:
-- ============================================
-- Additional WBS Items: 52 (33 for proj-001, 19 for proj-002)
-- Additional WBS Tasks: 37+ for Phase 4 (more for Phase 5, 6, Project 2)
-- WBS Dependencies: 52 (40 for proj-001, 12 for proj-002)
--   - GROUP level: 28
--   - ITEM level: 14
--   - TASK level: 10
-- Dependency Types used: FS, SS (with various lag_days)
-- ============================================


-- ============================================================
-- Source: V20260212_2__governance_seed_data
-- ============================================================
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
     '동일인이 코드 승인과 테스트 결과 승인을 동시에 수행할 수 없음', 'HIGH', true),
    ('SOD-002', 'cap-approve-deliv', 'cap-approve-req',
     '동일인이 산출물 승인과 요건 승인을 동시에 수행할 수 없음', 'MEDIUM', false),
    ('SOD-003', 'cap-manage-roles', 'cap-audit-gov',
     '역할 관리자가 유일한 거버넌스 감사자가 될 수 없음', 'LOW', false)
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


-- ============================================================
-- Source: V20260214__part_relationships
-- ============================================================
-- Part-to-Part Relationships Table Migration
-- Version: 20260214
-- Description: Create part_relationships table for cross-Part collaboration
-- This enables:
--   - DEPENDS_ON: Part A depends on Part B's work (upstream/downstream)
--   - COLLABORATES_WITH: Parts working together (bidirectional)

-- Part Relationships Table
CREATE TABLE IF NOT EXISTS project.part_relationships (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
    source_part_id VARCHAR(50) NOT NULL,
    target_part_id VARCHAR(50) NOT NULL,
    relationship_type VARCHAR(50) NOT NULL,  -- DEPENDS_ON, COLLABORATES_WITH
    description TEXT,
    -- For DEPENDS_ON: what deliverable/output does source need from target?
    dependency_description TEXT,
    -- Strength/importance of the relationship
    strength VARCHAR(20) DEFAULT 'MEDIUM',  -- LOW, MEDIUM, HIGH, CRITICAL
    -- Active status (can be temporarily disabled)
    active BOOLEAN DEFAULT TRUE,
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    -- Constraints
    CONSTRAINT fk_part_rel_source FOREIGN KEY (source_part_id)
        REFERENCES project.parts(id) ON DELETE CASCADE,
    CONSTRAINT fk_part_rel_target FOREIGN KEY (target_part_id)
        REFERENCES project.parts(id) ON DELETE CASCADE,
    -- Prevent self-reference
    CONSTRAINT chk_no_self_relation CHECK (source_part_id <> target_part_id),
    -- Unique relationship per pair and type
    CONSTRAINT uq_part_relationship UNIQUE (source_part_id, target_part_id, relationship_type)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_part_rel_source ON project.part_relationships(source_part_id);
CREATE INDEX IF NOT EXISTS idx_part_rel_target ON project.part_relationships(target_part_id);
CREATE INDEX IF NOT EXISTS idx_part_rel_type ON project.part_relationships(relationship_type);
CREATE INDEX IF NOT EXISTS idx_part_rel_active ON project.part_relationships(active);
CREATE INDEX IF NOT EXISTS idx_part_rel_updated ON project.part_relationships(updated_at);

-- Comments
COMMENT ON TABLE project.part_relationships IS 'Cross-Part relationships for dependency and collaboration tracking';
COMMENT ON COLUMN project.part_relationships.relationship_type IS 'DEPENDS_ON (upstream/downstream), COLLABORATES_WITH (bidirectional)';
COMMENT ON COLUMN project.part_relationships.strength IS 'Relationship importance: LOW, MEDIUM, HIGH, CRITICAL';
COMMENT ON COLUMN project.part_relationships.dependency_description IS 'For DEPENDS_ON: describes what output/deliverable is needed';

-- Sample data for demonstration (using existing Parts)
-- This will only insert if the Parts exist
INSERT INTO project.part_relationships (id, source_part_id, target_part_id, relationship_type, description, strength)
SELECT
    gen_random_uuid()::VARCHAR,
    p1.id,
    p2.id,
    'COLLABORATES_WITH',
    'Cross-team collaboration for integration',
    'MEDIUM'
FROM project.parts p1
JOIN project.parts p2 ON p1.project_id = p2.project_id AND p1.id < p2.id
WHERE p1.status = 'ACTIVE' AND p2.status = 'ACTIVE'
LIMIT 3
ON CONFLICT DO NOTHING;


-- ============================================================
-- Source: V20260222__phase_hierarchy
-- ============================================================
-- Add parent_id column to phases table for hierarchical structure
ALTER TABLE project.phases ADD COLUMN IF NOT EXISTS parent_id VARCHAR(36) REFERENCES project.phases(id) ON DELETE CASCADE;

-- Create index for parent_id lookups
CREATE INDEX IF NOT EXISTS idx_phases_parent_id ON project.phases(parent_id);

-- Insert methodology sub-phases under "AI 모델 개발" (phase-001-03)
INSERT INTO project.phases (id, project_id, parent_id, name, order_num, status, gate_status, start_date, end_date, progress, description, track_type, created_at, updated_at)
VALUES
    ('phase-001-03-01', 'proj-001', 'phase-001-03', '1단계: 업무 현황 진단/분석', 1, 'COMPLETED', 'APPROVED', '2025-01-02', '2025-02-15', 100, '지급심사 프로세스 현황 파악 및 AI 적용 타당성 검토', 'AI', NOW(), NOW()),
    ('phase-001-03-02', 'proj-001', 'phase-001-03', '2단계: 데이터 수집/정제', 2, 'COMPLETED', 'APPROVED', '2025-02-16', '2025-04-30', 100, '데이터 수집, 정제, 라벨링 및 피처 엔지니어링', 'AI', NOW(), NOW()),
    ('phase-001-03-03', 'proj-001', 'phase-001-03', '3단계: AI모델 설계/학습', 3, 'IN_PROGRESS', 'PENDING', '2025-05-01', '2025-08-31', 85, 'AI 모델 설계, 학습, 평가 및 하이브리드 로직 구축', 'AI', NOW(), NOW()),
    ('phase-001-03-04', 'proj-001', 'phase-001-03', '4단계: 업무시스템 연동/운영 자동화', 4, 'NOT_STARTED', NULL, '2025-09-01', '2025-10-31', 0, '기존 업무시스템과 AI 통합 및 MLOps 구축', 'AI', NOW(), NOW()),
    ('phase-001-03-05', 'proj-001', 'phase-001-03', '5단계: 효과 검증/운영고도화', 5, 'NOT_STARTED', NULL, '2025-11-01', '2025-11-30', 0, 'PoC 검증, 성능 평가 및 지속적 개선', 'AI', NOW(), NOW()),
    ('phase-001-03-06', 'proj-001', 'phase-001-03', '6단계: 조직/프로세스 변화관리', 6, 'NOT_STARTED', NULL, '2025-12-01', '2025-12-31', 0, '교육, 가이드라인, AI 거버넌스 체계 구축', 'AI', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    parent_id = EXCLUDED.parent_id,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    progress = EXCLUDED.progress;


-- ============================================================
-- Source: V20260223__methodology_phase_wbs_data
-- ============================================================
-- WBS Mock Data for Methodology Sub-Phases
-- Version: 20260223
-- Description: Add WBS groups, items, and tasks for methodology phases (phase-001-03-01 to phase-001-03-06)

-- ============================================
-- 1. WBS Groups for Methodology Phases
-- ============================================
INSERT INTO project.wbs_groups (id, project_id, phase_id, code, name, description, status, progress, planned_start_date, planned_end_date, weight, order_num, created_at, updated_at)
VALUES
    -- Phase 1: 업무 현황 진단/분석 (phase-001-03-01) - COMPLETED
    ('wg-m01-01', 'proj-001', 'phase-001-03-01', '1.1', '현황 분석', 'AS-IS 업무 프로세스 분석', 'COMPLETED', 100, '2025-01-02', '2025-01-20', 40, 1, NOW(), NOW()),
    ('wg-m01-02', 'proj-001', 'phase-001-03-01', '1.2', 'AI 적용성 검토', 'AI 적용 타당성 및 범위 검토', 'COMPLETED', 100, '2025-01-15', '2025-02-05', 35, 2, NOW(), NOW()),
    ('wg-m01-03', 'proj-001', 'phase-001-03-01', '1.3', '프로젝트 기획', '프로젝트 헌장 및 KPI 정의', 'COMPLETED', 100, '2025-02-01', '2025-02-15', 25, 3, NOW(), NOW()),

    -- Phase 2: 데이터 수집/정제 (phase-001-03-02) - COMPLETED
    ('wg-m02-01', 'proj-001', 'phase-001-03-02', '2.1', '데이터 수집', '학습 데이터 수집 및 인벤토리', 'COMPLETED', 100, '2025-02-16', '2025-03-15', 35, 1, NOW(), NOW()),
    ('wg-m02-02', 'proj-001', 'phase-001-03-02', '2.2', '데이터 정제', '데이터 클렌징 및 비식별화', 'COMPLETED', 100, '2025-03-10', '2025-04-10', 35, 2, NOW(), NOW()),
    ('wg-m02-03', 'proj-001', 'phase-001-03-02', '2.3', '피처 엔지니어링', '피처 추출 및 라벨링', 'COMPLETED', 100, '2025-04-01', '2025-04-30', 30, 3, NOW(), NOW()),

    -- Phase 3: AI모델 설계/학습 (phase-001-03-03) - IN_PROGRESS
    ('wg-m03-01', 'proj-001', 'phase-001-03-03', '3.1', 'OCR 모델 개발', 'OCR 모델 설계 및 학습', 'IN_PROGRESS', 90, '2025-05-01', '2025-06-30', 35, 1, NOW(), NOW()),
    ('wg-m03-02', 'proj-001', 'phase-001-03-03', '3.2', '분류 모델 개발', '보험 청구 분류 모델 개발', 'IN_PROGRESS', 85, '2025-06-01', '2025-07-31', 35, 2, NOW(), NOW()),
    ('wg-m03-03', 'proj-001', 'phase-001-03-03', '3.3', '하이브리드 로직', '규칙 기반 + AI 하이브리드 구축', 'IN_PROGRESS', 70, '2025-07-15', '2025-08-31', 30, 3, NOW(), NOW()),

    -- Phase 4: 업무시스템 연동/운영 자동화 (phase-001-03-04) - NOT_STARTED
    ('wg-m04-01', 'proj-001', 'phase-001-03-04', '4.1', 'API 개발', 'AI 서비스 API 개발', 'NOT_STARTED', 0, '2025-09-01', '2025-09-20', 35, 1, NOW(), NOW()),
    ('wg-m04-02', 'proj-001', 'phase-001-03-04', '4.2', '시스템 통합', '레거시 시스템 연동', 'NOT_STARTED', 0, '2025-09-15', '2025-10-15', 35, 2, NOW(), NOW()),
    ('wg-m04-03', 'proj-001', 'phase-001-03-04', '4.3', 'MLOps 구축', 'MLOps 파이프라인 구축', 'NOT_STARTED', 0, '2025-10-10', '2025-10-31', 30, 3, NOW(), NOW()),

    -- Phase 5: 효과 검증/운영고도화 (phase-001-03-05) - NOT_STARTED
    ('wg-m05-01', 'proj-001', 'phase-001-03-05', '5.1', 'PoC 검증', 'Pilot 운영 및 PoC 검증', 'NOT_STARTED', 0, '2025-11-01', '2025-11-15', 40, 1, NOW(), NOW()),
    ('wg-m05-02', 'proj-001', 'phase-001-03-05', '5.2', '성능 평가', 'AS-IS vs TO-BE 비교 분석', 'NOT_STARTED', 0, '2025-11-10', '2025-11-25', 35, 2, NOW(), NOW()),
    ('wg-m05-03', 'proj-001', 'phase-001-03-05', '5.3', '피드백 반영', '현업 피드백 수집 및 반영', 'NOT_STARTED', 0, '2025-11-20', '2025-11-30', 25, 3, NOW(), NOW()),

    -- Phase 6: 조직/프로세스 변화관리 (phase-001-03-06) - NOT_STARTED
    ('wg-m06-01', 'proj-001', 'phase-001-03-06', '6.1', '교육 프로그램', '사용자 교육 프로그램 운영', 'NOT_STARTED', 0, '2025-12-01', '2025-12-15', 35, 1, NOW(), NOW()),
    ('wg-m06-02', 'proj-001', 'phase-001-03-06', '6.2', '가이드라인', '운영 가이드 및 매뉴얼 작성', 'NOT_STARTED', 0, '2025-12-10', '2025-12-25', 35, 2, NOW(), NOW()),
    ('wg-m06-03', 'proj-001', 'phase-001-03-06', '6.3', 'AI 거버넌스', 'AI 거버넌스 체계 구축', 'NOT_STARTED', 0, '2025-12-20', '2025-12-31', 30, 3, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    progress = EXCLUDED.progress;

-- ============================================
-- 2. WBS Items for Methodology Phases
-- ============================================
INSERT INTO project.wbs_items (id, group_id, phase_id, code, name, description, status, progress, planned_start_date, planned_end_date, weight, order_num, estimated_hours, created_at, updated_at)
VALUES
    -- Phase 1, Group 1.1: 현황 분석
    ('wi-m01-01-01', 'wg-m01-01', 'phase-001-03-01', '1.1.1', '업무 프로세스 맵핑', '지급심사 업무 프로세스 맵핑', 'COMPLETED', 100, '2025-01-02', '2025-01-10', 50, 1, 24, NOW(), NOW()),
    ('wi-m01-01-02', 'wg-m01-01', 'phase-001-03-01', '1.1.2', '이해관계자 인터뷰', '현업 담당자 인터뷰 진행', 'COMPLETED', 100, '2025-01-08', '2025-01-20', 50, 2, 20, NOW(), NOW()),

    -- Phase 1, Group 1.2: AI 적용성 검토
    ('wi-m01-02-01', 'wg-m01-02', 'phase-001-03-01', '1.2.1', 'AI 기술 조사', 'OCR/NLP 기술 현황 조사', 'COMPLETED', 100, '2025-01-15', '2025-01-25', 50, 1, 16, NOW(), NOW()),
    ('wi-m01-02-02', 'wg-m01-02', 'phase-001-03-01', '1.2.2', 'ROI 분석', '투자 대비 효과 분석', 'COMPLETED', 100, '2025-01-22', '2025-02-05', 50, 2, 16, NOW(), NOW()),

    -- Phase 1, Group 1.3: 프로젝트 기획
    ('wi-m01-03-01', 'wg-m01-03', 'phase-001-03-01', '1.3.1', 'KPI 정의', '성과 지표 정의', 'COMPLETED', 100, '2025-02-01', '2025-02-08', 50, 1, 12, NOW(), NOW()),
    ('wi-m01-03-02', 'wg-m01-03', 'phase-001-03-01', '1.3.2', '프로젝트 헌장', '프로젝트 헌장 작성 및 승인', 'COMPLETED', 100, '2025-02-05', '2025-02-15', 50, 2, 16, NOW(), NOW()),

    -- Phase 2, Group 2.1: 데이터 수집
    ('wi-m02-01-01', 'wg-m02-01', 'phase-001-03-02', '2.1.1', '데이터 소스 식별', '학습 데이터 소스 식별', 'COMPLETED', 100, '2025-02-16', '2025-02-28', 40, 1, 16, NOW(), NOW()),
    ('wi-m02-01-02', 'wg-m02-01', 'phase-001-03-02', '2.1.2', '데이터 수집', '보험 청구 데이터 수집', 'COMPLETED', 100, '2025-02-25', '2025-03-15', 60, 2, 32, NOW(), NOW()),

    -- Phase 2, Group 2.2: 데이터 정제
    ('wi-m02-02-01', 'wg-m02-02', 'phase-001-03-02', '2.2.1', '데이터 클렌징', '이상치 및 결측치 처리', 'COMPLETED', 100, '2025-03-10', '2025-03-25', 50, 1, 24, NOW(), NOW()),
    ('wi-m02-02-02', 'wg-m02-02', 'phase-001-03-02', '2.2.2', '개인정보 비식별화', '민감정보 마스킹 처리', 'COMPLETED', 100, '2025-03-20', '2025-04-10', 50, 2, 20, NOW(), NOW()),

    -- Phase 2, Group 2.3: 피처 엔지니어링
    ('wi-m02-03-01', 'wg-m02-03', 'phase-001-03-02', '2.3.1', '피처 추출', '모델 학습용 피처 추출', 'COMPLETED', 100, '2025-04-01', '2025-04-15', 50, 1, 24, NOW(), NOW()),
    ('wi-m02-03-02', 'wg-m02-03', 'phase-001-03-02', '2.3.2', '데이터 라벨링', '학습 데이터 라벨링', 'COMPLETED', 100, '2025-04-10', '2025-04-30', 50, 2, 40, NOW(), NOW()),

    -- Phase 3, Group 3.1: OCR 모델 개발
    ('wi-m03-01-01', 'wg-m03-01', 'phase-001-03-03', '3.1.1', 'OCR 모델 설계', '모델 아키텍처 설계', 'COMPLETED', 100, '2025-05-01', '2025-05-15', 30, 1, 24, NOW(), NOW()),
    ('wi-m03-01-02', 'wg-m03-01', 'phase-001-03-03', '3.1.2', 'OCR 모델 학습', '모델 학습 및 튜닝', 'IN_PROGRESS', 90, '2025-05-10', '2025-06-15', 40, 2, 60, NOW(), NOW()),
    ('wi-m03-01-03', 'wg-m03-01', 'phase-001-03-03', '3.1.3', 'OCR 성능 평가', '인식률 평가 및 개선', 'IN_PROGRESS', 80, '2025-06-01', '2025-06-30', 30, 3, 32, NOW(), NOW()),

    -- Phase 3, Group 3.2: 분류 모델 개발
    ('wi-m03-02-01', 'wg-m03-02', 'phase-001-03-03', '3.2.1', '분류 모델 설계', '청구 유형 분류 모델 설계', 'COMPLETED', 100, '2025-06-01', '2025-06-15', 30, 1, 20, NOW(), NOW()),
    ('wi-m03-02-02', 'wg-m03-02', 'phase-001-03-03', '3.2.2', '분류 모델 학습', '모델 학습 및 최적화', 'IN_PROGRESS', 85, '2025-06-10', '2025-07-15', 40, 2, 48, NOW(), NOW()),
    ('wi-m03-02-03', 'wg-m03-02', 'phase-001-03-03', '3.2.3', '분류 성능 평가', '정확도/재현율 평가', 'IN_PROGRESS', 70, '2025-07-01', '2025-07-31', 30, 3, 24, NOW(), NOW()),

    -- Phase 3, Group 3.3: 하이브리드 로직
    ('wi-m03-03-01', 'wg-m03-03', 'phase-001-03-03', '3.3.1', '규칙 엔진 설계', '비즈니스 규칙 엔진 설계', 'IN_PROGRESS', 80, '2025-07-15', '2025-08-01', 35, 1, 24, NOW(), NOW()),
    ('wi-m03-03-02', 'wg-m03-03', 'phase-001-03-03', '3.3.2', 'AI-규칙 통합', 'AI와 규칙 기반 로직 통합', 'IN_PROGRESS', 60, '2025-07-25', '2025-08-20', 40, 2, 32, NOW(), NOW()),
    ('wi-m03-03-03', 'wg-m03-03', 'phase-001-03-03', '3.3.3', '통합 테스트', '하이브리드 시스템 테스트', 'NOT_STARTED', 0, '2025-08-15', '2025-08-31', 25, 3, 20, NOW(), NOW()),

    -- Phase 4, Group 4.1: API 개발
    ('wi-m04-01-01', 'wg-m04-01', 'phase-001-03-04', '4.1.1', 'API 설계', 'REST API 명세 설계', 'NOT_STARTED', 0, '2025-09-01', '2025-09-08', 30, 1, 16, NOW(), NOW()),
    ('wi-m04-01-02', 'wg-m04-01', 'phase-001-03-04', '4.1.2', 'API 구현', 'AI 서비스 API 구현', 'NOT_STARTED', 0, '2025-09-05', '2025-09-20', 70, 2, 40, NOW(), NOW()),

    -- Phase 4, Group 4.2: 시스템 통합
    ('wi-m04-02-01', 'wg-m04-02', 'phase-001-03-04', '4.2.1', '연동 설계', '레거시 시스템 연동 설계', 'NOT_STARTED', 0, '2025-09-15', '2025-09-25', 35, 1, 20, NOW(), NOW()),
    ('wi-m04-02-02', 'wg-m04-02', 'phase-001-03-04', '4.2.2', '연동 개발', '인터페이스 개발 및 테스트', 'NOT_STARTED', 0, '2025-09-20', '2025-10-15', 65, 2, 48, NOW(), NOW()),

    -- Phase 4, Group 4.3: MLOps 구축
    ('wi-m04-03-01', 'wg-m04-03', 'phase-001-03-04', '4.3.1', 'CI/CD 파이프라인', '모델 배포 파이프라인 구축', 'NOT_STARTED', 0, '2025-10-10', '2025-10-20', 50, 1, 24, NOW(), NOW()),
    ('wi-m04-03-02', 'wg-m04-03', 'phase-001-03-04', '4.3.2', '모니터링 시스템', '모델 성능 모니터링 구축', 'NOT_STARTED', 0, '2025-10-18', '2025-10-31', 50, 2, 24, NOW(), NOW()),

    -- Phase 5, Group 5.1: PoC 검증
    ('wi-m05-01-01', 'wg-m05-01', 'phase-001-03-05', '5.1.1', 'Pilot 운영', 'Pilot 환경 운영', 'NOT_STARTED', 0, '2025-11-01', '2025-11-10', 60, 1, 32, NOW(), NOW()),
    ('wi-m05-01-02', 'wg-m05-01', 'phase-001-03-05', '5.1.2', '결과 분석', 'Pilot 결과 분석', 'NOT_STARTED', 0, '2025-11-08', '2025-11-15', 40, 2, 16, NOW(), NOW()),

    -- Phase 5, Group 5.2: 성능 평가
    ('wi-m05-02-01', 'wg-m05-02', 'phase-001-03-05', '5.2.1', 'KPI 측정', '성과 지표 측정', 'NOT_STARTED', 0, '2025-11-10', '2025-11-18', 50, 1, 16, NOW(), NOW()),
    ('wi-m05-02-02', 'wg-m05-02', 'phase-001-03-05', '5.2.2', '비교 분석', 'AS-IS vs TO-BE 비교', 'NOT_STARTED', 0, '2025-11-15', '2025-11-25', 50, 2, 20, NOW(), NOW()),

    -- Phase 5, Group 5.3: 피드백 반영
    ('wi-m05-03-01', 'wg-m05-03', 'phase-001-03-05', '5.3.1', '피드백 수집', '현업 피드백 수집', 'NOT_STARTED', 0, '2025-11-20', '2025-11-25', 50, 1, 12, NOW(), NOW()),
    ('wi-m05-03-02', 'wg-m05-03', 'phase-001-03-05', '5.3.2', '개선 적용', '피드백 기반 개선', 'NOT_STARTED', 0, '2025-11-23', '2025-11-30', 50, 2, 16, NOW(), NOW()),

    -- Phase 6, Group 6.1: 교육 프로그램
    ('wi-m06-01-01', 'wg-m06-01', 'phase-001-03-06', '6.1.1', '교육 자료 개발', '교육 콘텐츠 개발', 'NOT_STARTED', 0, '2025-12-01', '2025-12-08', 50, 1, 20, NOW(), NOW()),
    ('wi-m06-01-02', 'wg-m06-01', 'phase-001-03-06', '6.1.2', '교육 실시', '사용자 교육 진행', 'NOT_STARTED', 0, '2025-12-05', '2025-12-15', 50, 2, 24, NOW(), NOW()),

    -- Phase 6, Group 6.2: 가이드라인
    ('wi-m06-02-01', 'wg-m06-02', 'phase-001-03-06', '6.2.1', '운영 매뉴얼', '운영 매뉴얼 작성', 'NOT_STARTED', 0, '2025-12-10', '2025-12-18', 50, 1, 20, NOW(), NOW()),
    ('wi-m06-02-02', 'wg-m06-02', 'phase-001-03-06', '6.2.2', '사용자 가이드', '사용자 가이드 작성', 'NOT_STARTED', 0, '2025-12-15', '2025-12-25', 50, 2, 16, NOW(), NOW()),

    -- Phase 6, Group 6.3: AI 거버넌스
    ('wi-m06-03-01', 'wg-m06-03', 'phase-001-03-06', '6.3.1', '거버넌스 정책', 'AI 거버넌스 정책 수립', 'NOT_STARTED', 0, '2025-12-20', '2025-12-27', 50, 1, 16, NOW(), NOW()),
    ('wi-m06-03-02', 'wg-m06-03', 'phase-001-03-06', '6.3.2', '모니터링 체계', '지속적 모니터링 체계 구축', 'NOT_STARTED', 0, '2025-12-25', '2025-12-31', 50, 2, 16, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    progress = EXCLUDED.progress;

-- ============================================
-- 3. WBS Tasks for Phase 3 (AI 모델 설계/학습) - IN_PROGRESS
-- ============================================
INSERT INTO project.wbs_tasks (id, item_id, group_id, phase_id, code, name, description, status, progress, weight, order_num, created_at, updated_at)
VALUES
    -- Item 3.1.1: OCR 모델 설계
    ('wt-m03-01-01-01', 'wi-m03-01-01', 'wg-m03-01', 'phase-001-03-03', '3.1.1.1', '요구사항 분석', 'OCR 요구사항 분석', 'COMPLETED', 100, 30, 1, NOW(), NOW()),
    ('wt-m03-01-01-02', 'wi-m03-01-01', 'wg-m03-01', 'phase-001-03-03', '3.1.1.2', '아키텍처 설계', '모델 아키텍처 설계', 'COMPLETED', 100, 40, 2, NOW(), NOW()),
    ('wt-m03-01-01-03', 'wi-m03-01-01', 'wg-m03-01', 'phase-001-03-03', '3.1.1.3', '설계 검토', '설계 문서 검토', 'COMPLETED', 100, 30, 3, NOW(), NOW()),

    -- Item 3.1.2: OCR 모델 학습
    ('wt-m03-01-02-01', 'wi-m03-01-02', 'wg-m03-01', 'phase-001-03-03', '3.1.2.1', '학습 환경 구축', 'GPU 서버 환경 구축', 'COMPLETED', 100, 20, 1, NOW(), NOW()),
    ('wt-m03-01-02-02', 'wi-m03-01-02', 'wg-m03-01', 'phase-001-03-03', '3.1.2.2', '모델 학습', '초기 모델 학습', 'IN_PROGRESS', 90, 50, 2, NOW(), NOW()),
    ('wt-m03-01-02-03', 'wi-m03-01-02', 'wg-m03-01', 'phase-001-03-03', '3.1.2.3', '하이퍼파라미터 튜닝', '최적 파라미터 탐색', 'IN_PROGRESS', 80, 30, 3, NOW(), NOW()),

    -- Item 3.1.3: OCR 성능 평가
    ('wt-m03-01-03-01', 'wi-m03-01-03', 'wg-m03-01', 'phase-001-03-03', '3.1.3.1', '테스트 데이터 준비', '평가용 데이터셋 준비', 'COMPLETED', 100, 30, 1, NOW(), NOW()),
    ('wt-m03-01-03-02', 'wi-m03-01-03', 'wg-m03-01', 'phase-001-03-03', '3.1.3.2', '성능 측정', '인식률 측정', 'IN_PROGRESS', 75, 40, 2, NOW(), NOW()),
    ('wt-m03-01-03-03', 'wi-m03-01-03', 'wg-m03-01', 'phase-001-03-03', '3.1.3.3', '개선 방안 도출', '성능 개선 방안', 'NOT_STARTED', 0, 30, 3, NOW(), NOW()),

    -- Item 3.2.1: 분류 모델 설계
    ('wt-m03-02-01-01', 'wi-m03-02-01', 'wg-m03-02', 'phase-001-03-03', '3.2.1.1', '분류 체계 정의', '청구 유형 분류 체계', 'COMPLETED', 100, 40, 1, NOW(), NOW()),
    ('wt-m03-02-01-02', 'wi-m03-02-01', 'wg-m03-02', 'phase-001-03-03', '3.2.1.2', '모델 아키텍처 설계', 'Transformer 기반 설계', 'COMPLETED', 100, 60, 2, NOW(), NOW()),

    -- Item 3.2.2: 분류 모델 학습
    ('wt-m03-02-02-01', 'wi-m03-02-02', 'wg-m03-02', 'phase-001-03-03', '3.2.2.1', '데이터 전처리', '학습 데이터 전처리', 'COMPLETED', 100, 25, 1, NOW(), NOW()),
    ('wt-m03-02-02-02', 'wi-m03-02-02', 'wg-m03-02', 'phase-001-03-03', '3.2.2.2', '모델 학습', '분류 모델 학습', 'IN_PROGRESS', 85, 50, 2, NOW(), NOW()),
    ('wt-m03-02-02-03', 'wi-m03-02-02', 'wg-m03-02', 'phase-001-03-03', '3.2.2.3', '최적화', '모델 경량화 및 최적화', 'IN_PROGRESS', 60, 25, 3, NOW(), NOW()),

    -- Item 3.2.3: 분류 성능 평가
    ('wt-m03-02-03-01', 'wi-m03-02-03', 'wg-m03-02', 'phase-001-03-03', '3.2.3.1', '정확도 평가', 'Accuracy/F1 score 평가', 'IN_PROGRESS', 80, 40, 1, NOW(), NOW()),
    ('wt-m03-02-03-02', 'wi-m03-02-03', 'wg-m03-02', 'phase-001-03-03', '3.2.3.2', '오분류 분석', '오분류 케이스 분석', 'IN_PROGRESS', 60, 35, 2, NOW(), NOW()),
    ('wt-m03-02-03-03', 'wi-m03-02-03', 'wg-m03-02', 'phase-001-03-03', '3.2.3.3', '성능 리포트', '평가 결과 문서화', 'NOT_STARTED', 0, 25, 3, NOW(), NOW()),

    -- Item 3.3.1: 규칙 엔진 설계
    ('wt-m03-03-01-01', 'wi-m03-03-01', 'wg-m03-03', 'phase-001-03-03', '3.3.1.1', '비즈니스 규칙 정의', '심사 규칙 정의', 'IN_PROGRESS', 90, 50, 1, NOW(), NOW()),
    ('wt-m03-03-01-02', 'wi-m03-03-01', 'wg-m03-03', 'phase-001-03-03', '3.3.1.2', '규칙 엔진 구현', 'Drools 기반 구현', 'IN_PROGRESS', 70, 50, 2, NOW(), NOW()),

    -- Item 3.3.2: AI-규칙 통합
    ('wt-m03-03-02-01', 'wi-m03-03-02', 'wg-m03-03', 'phase-001-03-03', '3.3.2.1', '통합 아키텍처', '하이브리드 아키텍처 설계', 'IN_PROGRESS', 80, 35, 1, NOW(), NOW()),
    ('wt-m03-03-02-02', 'wi-m03-03-02', 'wg-m03-03', 'phase-001-03-03', '3.3.2.2', '의사결정 로직', 'AI vs 규칙 선택 로직', 'IN_PROGRESS', 50, 40, 2, NOW(), NOW()),
    ('wt-m03-03-02-03', 'wi-m03-03-02', 'wg-m03-03', 'phase-001-03-03', '3.3.2.3', '결과 병합', '결과 통합 및 검증', 'NOT_STARTED', 0, 25, 3, NOW(), NOW()),

    -- Item 3.3.3: 통합 테스트
    ('wt-m03-03-03-01', 'wi-m03-03-03', 'wg-m03-03', 'phase-001-03-03', '3.3.3.1', '테스트 케이스 작성', '통합 테스트 시나리오', 'NOT_STARTED', 0, 30, 1, NOW(), NOW()),
    ('wt-m03-03-03-02', 'wi-m03-03-03', 'wg-m03-03', 'phase-001-03-03', '3.3.3.2', '테스트 수행', '통합 테스트 실행', 'NOT_STARTED', 0, 40, 2, NOW(), NOW()),
    ('wt-m03-03-03-03', 'wi-m03-03-03', 'wg-m03-03', 'phase-001-03-03', '3.3.3.3', '결함 수정', '발견된 결함 수정', 'NOT_STARTED', 0, 30, 3, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    progress = EXCLUDED.progress;

-- ============================================
-- Summary:
-- ============================================
-- WBS Groups: 18 (3 per phase x 6 phases)
-- WBS Items: 40 (varying per group)
-- WBS Tasks: 27 (for phase-001-03-03 only, others can be added as needed)
-- ============================================


-- ============================================================
-- Source: V20260224__methodology_phase_wbs_tasks_all
-- ============================================================
-- WBS Tasks for All Methodology Sub-Phases (except phase 3 which already has tasks)
-- Version: 20260224
-- Description: Add WBS tasks for phases 1, 2, 4, 5, 6 under AI Model Development (phase-001-03)

-- ============================================
-- Phase 1: 업무 현황 진단/분석 (phase-001-03-01) - COMPLETED
-- ============================================
INSERT INTO project.wbs_tasks (id, item_id, group_id, phase_id, code, name, description, status, progress, weight, order_num, created_at, updated_at)
VALUES
    -- Item 1.1.1: 업무 프로세스 맵핑
    ('wt-m01-01-01-01', 'wi-m01-01-01', 'wg-m01-01', 'phase-001-03-01', '1.1.1.1', '프로세스 현황 조사', '현행 지급심사 프로세스 현황 조사', 'COMPLETED', 100, 30, 1, NOW(), NOW()),
    ('wt-m01-01-01-02', 'wi-m01-01-01', 'wg-m01-01', 'phase-001-03-01', '1.1.1.2', '프로세스 맵 작성', '업무 흐름도 및 프로세스 맵 작성', 'COMPLETED', 100, 40, 2, NOW(), NOW()),
    ('wt-m01-01-01-03', 'wi-m01-01-01', 'wg-m01-01', 'phase-001-03-01', '1.1.1.3', '병목점 식별', '업무 병목점 및 비효율 구간 식별', 'COMPLETED', 100, 30, 3, NOW(), NOW()),

    -- Item 1.1.2: 이해관계자 인터뷰
    ('wt-m01-01-02-01', 'wi-m01-01-02', 'wg-m01-01', 'phase-001-03-01', '1.1.2.1', '인터뷰 계획 수립', '이해관계자 목록 및 인터뷰 일정 수립', 'COMPLETED', 100, 25, 1, NOW(), NOW()),
    ('wt-m01-01-02-02', 'wi-m01-01-02', 'wg-m01-01', 'phase-001-03-01', '1.1.2.2', '인터뷰 진행', '현업 담당자 심층 인터뷰 진행', 'COMPLETED', 100, 50, 2, NOW(), NOW()),
    ('wt-m01-01-02-03', 'wi-m01-01-02', 'wg-m01-01', 'phase-001-03-01', '1.1.2.3', '인터뷰 결과 정리', '인터뷰 결과 정리 및 시사점 도출', 'COMPLETED', 100, 25, 3, NOW(), NOW()),

    -- Item 1.2.1: AI 기술 조사
    ('wt-m01-02-01-01', 'wi-m01-02-01', 'wg-m01-02', 'phase-001-03-01', '1.2.1.1', 'OCR 기술 조사', 'OCR 기술 현황 및 적용 사례 조사', 'COMPLETED', 100, 35, 1, NOW(), NOW()),
    ('wt-m01-02-01-02', 'wi-m01-02-01', 'wg-m01-02', 'phase-001-03-01', '1.2.1.2', 'NLP 기술 조사', 'NLP/LLM 기술 현황 및 적용 사례 조사', 'COMPLETED', 100, 35, 2, NOW(), NOW()),
    ('wt-m01-02-01-03', 'wi-m01-02-01', 'wg-m01-02', 'phase-001-03-01', '1.2.1.3', '기술 적합성 평가', '보험심사 도메인 기술 적합성 평가', 'COMPLETED', 100, 30, 3, NOW(), NOW()),

    -- Item 1.2.2: ROI 분석
    ('wt-m01-02-02-01', 'wi-m01-02-02', 'wg-m01-02', 'phase-001-03-01', '1.2.2.1', '비용 분석', 'AI 도입 비용 분석 (인프라, 개발, 운영)', 'COMPLETED', 100, 35, 1, NOW(), NOW()),
    ('wt-m01-02-02-02', 'wi-m01-02-02', 'wg-m01-02', 'phase-001-03-01', '1.2.2.2', '효과 분석', '업무 효율화 및 비용 절감 효과 분석', 'COMPLETED', 100, 35, 2, NOW(), NOW()),
    ('wt-m01-02-02-03', 'wi-m01-02-02', 'wg-m01-02', 'phase-001-03-01', '1.2.2.3', 'ROI 보고서 작성', 'ROI 분석 보고서 작성 및 검토', 'COMPLETED', 100, 30, 3, NOW(), NOW()),

    -- Item 1.3.1: KPI 정의
    ('wt-m01-03-01-01', 'wi-m01-03-01', 'wg-m01-03', 'phase-001-03-01', '1.3.1.1', 'KPI 항목 도출', '프로젝트 성과 측정 KPI 항목 도출', 'COMPLETED', 100, 40, 1, NOW(), NOW()),
    ('wt-m01-03-01-02', 'wi-m01-03-01', 'wg-m01-03', 'phase-001-03-01', '1.3.1.2', '목표치 설정', 'KPI 목표치 및 측정 방법 정의', 'COMPLETED', 100, 35, 2, NOW(), NOW()),
    ('wt-m01-03-01-03', 'wi-m01-03-01', 'wg-m01-03', 'phase-001-03-01', '1.3.1.3', 'KPI 문서화', 'KPI 정의서 작성 및 합의', 'COMPLETED', 100, 25, 3, NOW(), NOW()),

    -- Item 1.3.2: 프로젝트 헌장
    ('wt-m01-03-02-01', 'wi-m01-03-02', 'wg-m01-03', 'phase-001-03-01', '1.3.2.1', '헌장 초안 작성', '프로젝트 헌장 초안 작성', 'COMPLETED', 100, 35, 1, NOW(), NOW()),
    ('wt-m01-03-02-02', 'wi-m01-03-02', 'wg-m01-03', 'phase-001-03-01', '1.3.2.2', '이해관계자 검토', '이해관계자 검토 및 피드백 반영', 'COMPLETED', 100, 35, 2, NOW(), NOW()),
    ('wt-m01-03-02-03', 'wi-m01-03-02', 'wg-m01-03', 'phase-001-03-01', '1.3.2.3', '헌장 승인', '프로젝트 헌장 최종 승인', 'COMPLETED', 100, 30, 3, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    progress = EXCLUDED.progress;

-- ============================================
-- Phase 2: 데이터 수집/정제 (phase-001-03-02) - COMPLETED
-- ============================================
INSERT INTO project.wbs_tasks (id, item_id, group_id, phase_id, code, name, description, status, progress, weight, order_num, created_at, updated_at)
VALUES
    -- Item 2.1.1: 데이터 소스 식별
    ('wt-m02-01-01-01', 'wi-m02-01-01', 'wg-m02-01', 'phase-001-03-02', '2.1.1.1', '데이터 인벤토리', '기존 데이터 소스 인벤토리 작성', 'COMPLETED', 100, 35, 1, NOW(), NOW()),
    ('wt-m02-01-01-02', 'wi-m02-01-01', 'wg-m02-01', 'phase-001-03-02', '2.1.1.2', '데이터 품질 평가', '소스별 데이터 품질 평가', 'COMPLETED', 100, 35, 2, NOW(), NOW()),
    ('wt-m02-01-01-03', 'wi-m02-01-01', 'wg-m02-01', 'phase-001-03-02', '2.1.1.3', '수집 우선순위', '데이터 수집 우선순위 결정', 'COMPLETED', 100, 30, 3, NOW(), NOW()),

    -- Item 2.1.2: 데이터 수집
    ('wt-m02-01-02-01', 'wi-m02-01-02', 'wg-m02-01', 'phase-001-03-02', '2.1.2.1', '청구서 이미지 수집', '보험 청구서 이미지 데이터 수집', 'COMPLETED', 100, 40, 1, NOW(), NOW()),
    ('wt-m02-01-02-02', 'wi-m02-01-02', 'wg-m02-01', 'phase-001-03-02', '2.1.2.2', '심사 결과 데이터 수집', '과거 심사 결과 데이터 수집', 'COMPLETED', 100, 35, 2, NOW(), NOW()),
    ('wt-m02-01-02-03', 'wi-m02-01-02', 'wg-m02-01', 'phase-001-03-02', '2.1.2.3', '메타데이터 정리', '수집 데이터 메타데이터 정리', 'COMPLETED', 100, 25, 3, NOW(), NOW()),

    -- Item 2.2.1: 데이터 클렌징
    ('wt-m02-02-01-01', 'wi-m02-02-01', 'wg-m02-02', 'phase-001-03-02', '2.2.1.1', '이상치 탐지', '데이터 이상치 탐지 및 분석', 'COMPLETED', 100, 30, 1, NOW(), NOW()),
    ('wt-m02-02-01-02', 'wi-m02-02-01', 'wg-m02-02', 'phase-001-03-02', '2.2.1.2', '결측치 처리', '결측치 처리 방안 수립 및 적용', 'COMPLETED', 100, 35, 2, NOW(), NOW()),
    ('wt-m02-02-01-03', 'wi-m02-02-01', 'wg-m02-02', 'phase-001-03-02', '2.2.1.3', '데이터 정규화', '데이터 형식 정규화 및 표준화', 'COMPLETED', 100, 35, 3, NOW(), NOW()),

    -- Item 2.2.2: 개인정보 비식별화
    ('wt-m02-02-02-01', 'wi-m02-02-02', 'wg-m02-02', 'phase-001-03-02', '2.2.2.1', '민감정보 식별', '개인정보 및 민감정보 항목 식별', 'COMPLETED', 100, 30, 1, NOW(), NOW()),
    ('wt-m02-02-02-02', 'wi-m02-02-02', 'wg-m02-02', 'phase-001-03-02', '2.2.2.2', '비식별화 적용', '마스킹/암호화 등 비식별화 처리', 'COMPLETED', 100, 45, 2, NOW(), NOW()),
    ('wt-m02-02-02-03', 'wi-m02-02-02', 'wg-m02-02', 'phase-001-03-02', '2.2.2.3', '비식별화 검증', '비식별화 적정성 검증', 'COMPLETED', 100, 25, 3, NOW(), NOW()),

    -- Item 2.3.1: 피처 추출
    ('wt-m02-03-01-01', 'wi-m02-03-01', 'wg-m02-03', 'phase-001-03-02', '2.3.1.1', '피처 후보 도출', '학습에 필요한 피처 후보 도출', 'COMPLETED', 100, 30, 1, NOW(), NOW()),
    ('wt-m02-03-01-02', 'wi-m02-03-01', 'wg-m02-03', 'phase-001-03-02', '2.3.1.2', '피처 추출 구현', '피처 추출 파이프라인 구현', 'COMPLETED', 100, 45, 2, NOW(), NOW()),
    ('wt-m02-03-01-03', 'wi-m02-03-01', 'wg-m02-03', 'phase-001-03-02', '2.3.1.3', '피처 중요도 분석', '피처 중요도 분석 및 선택', 'COMPLETED', 100, 25, 3, NOW(), NOW()),

    -- Item 2.3.2: 데이터 라벨링
    ('wt-m02-03-02-01', 'wi-m02-03-02', 'wg-m02-03', 'phase-001-03-02', '2.3.2.1', '라벨링 가이드 작성', '라벨링 기준 및 가이드라인 작성', 'COMPLETED', 100, 20, 1, NOW(), NOW()),
    ('wt-m02-03-02-02', 'wi-m02-03-02', 'wg-m02-03', 'phase-001-03-02', '2.3.2.2', '라벨링 작업', '전문가 검토 기반 라벨링 작업', 'COMPLETED', 100, 55, 2, NOW(), NOW()),
    ('wt-m02-03-02-03', 'wi-m02-03-02', 'wg-m02-03', 'phase-001-03-02', '2.3.2.3', '라벨링 품질 검증', '라벨링 품질 검증 및 수정', 'COMPLETED', 100, 25, 3, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    progress = EXCLUDED.progress;

-- ============================================
-- Phase 4: 업무시스템 연동/운영 자동화 (phase-001-03-04) - NOT_STARTED
-- ============================================
INSERT INTO project.wbs_tasks (id, item_id, group_id, phase_id, code, name, description, status, progress, weight, order_num, created_at, updated_at)
VALUES
    -- Item 4.1.1: API 설계
    ('wt-m04-01-01-01', 'wi-m04-01-01', 'wg-m04-01', 'phase-001-03-04', '4.1.1.1', '엔드포인트 설계', 'REST API 엔드포인트 설계', 'NOT_STARTED', 0, 35, 1, NOW(), NOW()),
    ('wt-m04-01-01-02', 'wi-m04-01-01', 'wg-m04-01', 'phase-001-03-04', '4.1.1.2', '스키마 정의', '요청/응답 스키마 정의', 'NOT_STARTED', 0, 35, 2, NOW(), NOW()),
    ('wt-m04-01-01-03', 'wi-m04-01-01', 'wg-m04-01', 'phase-001-03-04', '4.1.1.3', 'API 문서 작성', 'OpenAPI 명세서 작성', 'NOT_STARTED', 0, 30, 3, NOW(), NOW()),

    -- Item 4.1.2: API 구현
    ('wt-m04-01-02-01', 'wi-m04-01-02', 'wg-m04-01', 'phase-001-03-04', '4.1.2.1', 'OCR 서비스 API', 'OCR 모델 서빙 API 구현', 'NOT_STARTED', 0, 35, 1, NOW(), NOW()),
    ('wt-m04-01-02-02', 'wi-m04-01-02', 'wg-m04-01', 'phase-001-03-04', '4.1.2.2', '분류 서비스 API', '분류 모델 서빙 API 구현', 'NOT_STARTED', 0, 35, 2, NOW(), NOW()),
    ('wt-m04-01-02-03', 'wi-m04-01-02', 'wg-m04-01', 'phase-001-03-04', '4.1.2.3', 'API 테스트', 'API 단위 테스트 및 통합 테스트', 'NOT_STARTED', 0, 30, 3, NOW(), NOW()),

    -- Item 4.2.1: 연동 설계
    ('wt-m04-02-01-01', 'wi-m04-02-01', 'wg-m04-02', 'phase-001-03-04', '4.2.1.1', '레거시 분석', '기존 심사 시스템 인터페이스 분석', 'NOT_STARTED', 0, 40, 1, NOW(), NOW()),
    ('wt-m04-02-01-02', 'wi-m04-02-01', 'wg-m04-02', 'phase-001-03-04', '4.2.1.2', '연동 아키텍처', '시스템 연동 아키텍처 설계', 'NOT_STARTED', 0, 35, 2, NOW(), NOW()),
    ('wt-m04-02-01-03', 'wi-m04-02-01', 'wg-m04-02', 'phase-001-03-04', '4.2.1.3', '연동 명세 작성', '인터페이스 명세서 작성', 'NOT_STARTED', 0, 25, 3, NOW(), NOW()),

    -- Item 4.2.2: 연동 개발
    ('wt-m04-02-02-01', 'wi-m04-02-02', 'wg-m04-02', 'phase-001-03-04', '4.2.2.1', '어댑터 개발', '레거시 시스템 어댑터 개발', 'NOT_STARTED', 0, 40, 1, NOW(), NOW()),
    ('wt-m04-02-02-02', 'wi-m04-02-02', 'wg-m04-02', 'phase-001-03-04', '4.2.2.2', '데이터 동기화', '데이터 동기화 로직 구현', 'NOT_STARTED', 0, 35, 2, NOW(), NOW()),
    ('wt-m04-02-02-03', 'wi-m04-02-02', 'wg-m04-02', 'phase-001-03-04', '4.2.2.3', '연동 테스트', '연동 테스트 및 검증', 'NOT_STARTED', 0, 25, 3, NOW(), NOW()),

    -- Item 4.3.1: CI/CD 파이프라인
    ('wt-m04-03-01-01', 'wi-m04-03-01', 'wg-m04-03', 'phase-001-03-04', '4.3.1.1', '파이프라인 설계', 'CI/CD 파이프라인 아키텍처 설계', 'NOT_STARTED', 0, 30, 1, NOW(), NOW()),
    ('wt-m04-03-01-02', 'wi-m04-03-01', 'wg-m04-03', 'phase-001-03-04', '4.3.1.2', '자동 배포 구현', '모델 자동 배포 파이프라인 구현', 'NOT_STARTED', 0, 45, 2, NOW(), NOW()),
    ('wt-m04-03-01-03', 'wi-m04-03-01', 'wg-m04-03', 'phase-001-03-04', '4.3.1.3', '롤백 메커니즘', '모델 버전 관리 및 롤백 구현', 'NOT_STARTED', 0, 25, 3, NOW(), NOW()),

    -- Item 4.3.2: 모니터링 시스템
    ('wt-m04-03-02-01', 'wi-m04-03-02', 'wg-m04-03', 'phase-001-03-04', '4.3.2.1', '메트릭 정의', '모니터링 메트릭 및 알림 정의', 'NOT_STARTED', 0, 30, 1, NOW(), NOW()),
    ('wt-m04-03-02-02', 'wi-m04-03-02', 'wg-m04-03', 'phase-001-03-04', '4.3.2.2', '대시보드 구축', '모델 성능 모니터링 대시보드 구축', 'NOT_STARTED', 0, 40, 2, NOW(), NOW()),
    ('wt-m04-03-02-03', 'wi-m04-03-02', 'wg-m04-03', 'phase-001-03-04', '4.3.2.3', '알림 시스템', '이상 탐지 알림 시스템 구축', 'NOT_STARTED', 0, 30, 3, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    progress = EXCLUDED.progress;

-- ============================================
-- Phase 5: 효과 검증/운영고도화 (phase-001-03-05) - NOT_STARTED
-- ============================================
INSERT INTO project.wbs_tasks (id, item_id, group_id, phase_id, code, name, description, status, progress, weight, order_num, created_at, updated_at)
VALUES
    -- Item 5.1.1: Pilot 운영
    ('wt-m05-01-01-01', 'wi-m05-01-01', 'wg-m05-01', 'phase-001-03-05', '5.1.1.1', 'Pilot 환경 구성', 'Pilot 운영 환경 구성 및 세팅', 'NOT_STARTED', 0, 30, 1, NOW(), NOW()),
    ('wt-m05-01-01-02', 'wi-m05-01-01', 'wg-m05-01', 'phase-001-03-05', '5.1.1.2', 'Pilot 운영 수행', '실제 데이터 기반 Pilot 운영', 'NOT_STARTED', 0, 45, 2, NOW(), NOW()),
    ('wt-m05-01-01-03', 'wi-m05-01-01', 'wg-m05-01', 'phase-001-03-05', '5.1.1.3', '운영 로그 수집', 'Pilot 운영 로그 및 결과 수집', 'NOT_STARTED', 0, 25, 3, NOW(), NOW()),

    -- Item 5.1.2: 결과 분석
    ('wt-m05-01-02-01', 'wi-m05-01-02', 'wg-m05-01', 'phase-001-03-05', '5.1.2.1', '정량 분석', 'Pilot 결과 정량적 분석', 'NOT_STARTED', 0, 40, 1, NOW(), NOW()),
    ('wt-m05-01-02-02', 'wi-m05-01-02', 'wg-m05-01', 'phase-001-03-05', '5.1.2.2', '정성 분석', '사용자 피드백 정성적 분석', 'NOT_STARTED', 0, 35, 2, NOW(), NOW()),
    ('wt-m05-01-02-03', 'wi-m05-01-02', 'wg-m05-01', 'phase-001-03-05', '5.1.2.3', '분석 보고서', 'Pilot 결과 분석 보고서 작성', 'NOT_STARTED', 0, 25, 3, NOW(), NOW()),

    -- Item 5.2.1: KPI 측정
    ('wt-m05-02-01-01', 'wi-m05-02-01', 'wg-m05-02', 'phase-001-03-05', '5.2.1.1', '데이터 수집', 'KPI 측정용 데이터 수집', 'NOT_STARTED', 0, 35, 1, NOW(), NOW()),
    ('wt-m05-02-01-02', 'wi-m05-02-01', 'wg-m05-02', 'phase-001-03-05', '5.2.1.2', 'KPI 산출', 'KPI 항목별 성과 산출', 'NOT_STARTED', 0, 40, 2, NOW(), NOW()),
    ('wt-m05-02-01-03', 'wi-m05-02-01', 'wg-m05-02', 'phase-001-03-05', '5.2.1.3', '목표 달성 평가', 'KPI 목표 대비 달성률 평가', 'NOT_STARTED', 0, 25, 3, NOW(), NOW()),

    -- Item 5.2.2: 비교 분석
    ('wt-m05-02-02-01', 'wi-m05-02-02', 'wg-m05-02', 'phase-001-03-05', '5.2.2.1', 'AS-IS 데이터 정리', 'AS-IS 업무 성과 데이터 정리', 'NOT_STARTED', 0, 30, 1, NOW(), NOW()),
    ('wt-m05-02-02-02', 'wi-m05-02-02', 'wg-m05-02', 'phase-001-03-05', '5.2.2.2', '비교 분석 수행', 'AS-IS vs TO-BE 상세 비교 분석', 'NOT_STARTED', 0, 45, 2, NOW(), NOW()),
    ('wt-m05-02-02-03', 'wi-m05-02-02', 'wg-m05-02', 'phase-001-03-05', '5.2.2.3', '개선 효과 보고서', '개선 효과 분석 보고서 작성', 'NOT_STARTED', 0, 25, 3, NOW(), NOW()),

    -- Item 5.3.1: 피드백 수집
    ('wt-m05-03-01-01', 'wi-m05-03-01', 'wg-m05-03', 'phase-001-03-05', '5.3.1.1', '설문 설계', '사용자 만족도 설문 설계', 'NOT_STARTED', 0, 30, 1, NOW(), NOW()),
    ('wt-m05-03-01-02', 'wi-m05-03-01', 'wg-m05-03', 'phase-001-03-05', '5.3.1.2', '피드백 수집', '현업 사용자 피드백 수집', 'NOT_STARTED', 0, 45, 2, NOW(), NOW()),
    ('wt-m05-03-01-03', 'wi-m05-03-01', 'wg-m05-03', 'phase-001-03-05', '5.3.1.3', '피드백 분석', '피드백 분류 및 우선순위 분석', 'NOT_STARTED', 0, 25, 3, NOW(), NOW()),

    -- Item 5.3.2: 개선 적용
    ('wt-m05-03-02-01', 'wi-m05-03-02', 'wg-m05-03', 'phase-001-03-05', '5.3.2.1', '개선 계획 수립', '피드백 기반 개선 계획 수립', 'NOT_STARTED', 0, 30, 1, NOW(), NOW()),
    ('wt-m05-03-02-02', 'wi-m05-03-02', 'wg-m05-03', 'phase-001-03-05', '5.3.2.2', '개선 구현', '개선 사항 구현 및 적용', 'NOT_STARTED', 0, 50, 2, NOW(), NOW()),
    ('wt-m05-03-02-03', 'wi-m05-03-02', 'wg-m05-03', 'phase-001-03-05', '5.3.2.3', '개선 검증', '개선 효과 검증', 'NOT_STARTED', 0, 20, 3, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    progress = EXCLUDED.progress;

-- ============================================
-- Phase 6: 조직/프로세스 변화관리 (phase-001-03-06) - NOT_STARTED
-- ============================================
INSERT INTO project.wbs_tasks (id, item_id, group_id, phase_id, code, name, description, status, progress, weight, order_num, created_at, updated_at)
VALUES
    -- Item 6.1.1: 교육 자료 개발
    ('wt-m06-01-01-01', 'wi-m06-01-01', 'wg-m06-01', 'phase-001-03-06', '6.1.1.1', '교육 과정 설계', '사용자 대상별 교육 과정 설계', 'NOT_STARTED', 0, 30, 1, NOW(), NOW()),
    ('wt-m06-01-01-02', 'wi-m06-01-01', 'wg-m06-01', 'phase-001-03-06', '6.1.1.2', '교육 자료 제작', '교육 교재 및 동영상 제작', 'NOT_STARTED', 0, 50, 2, NOW(), NOW()),
    ('wt-m06-01-01-03', 'wi-m06-01-01', 'wg-m06-01', 'phase-001-03-06', '6.1.1.3', '교육 자료 검토', '교육 자료 검토 및 보완', 'NOT_STARTED', 0, 20, 3, NOW(), NOW()),

    -- Item 6.1.2: 교육 실시
    ('wt-m06-01-02-01', 'wi-m06-01-02', 'wg-m06-01', 'phase-001-03-06', '6.1.2.1', '교육 일정 수립', '교육 일정 및 대상자 확정', 'NOT_STARTED', 0, 20, 1, NOW(), NOW()),
    ('wt-m06-01-02-02', 'wi-m06-01-02', 'wg-m06-01', 'phase-001-03-06', '6.1.2.2', '집합 교육', '집합 교육 진행', 'NOT_STARTED', 0, 50, 2, NOW(), NOW()),
    ('wt-m06-01-02-03', 'wi-m06-01-02', 'wg-m06-01', 'phase-001-03-06', '6.1.2.3', '교육 효과 평가', '교육 효과 평가 및 보완 교육', 'NOT_STARTED', 0, 30, 3, NOW(), NOW()),

    -- Item 6.2.1: 운영 매뉴얼
    ('wt-m06-02-01-01', 'wi-m06-02-01', 'wg-m06-02', 'phase-001-03-06', '6.2.1.1', '매뉴얼 구조 설계', '운영 매뉴얼 목차 및 구조 설계', 'NOT_STARTED', 0, 25, 1, NOW(), NOW()),
    ('wt-m06-02-01-02', 'wi-m06-02-01', 'wg-m06-02', 'phase-001-03-06', '6.2.1.2', '매뉴얼 작성', '운영 매뉴얼 내용 작성', 'NOT_STARTED', 0, 55, 2, NOW(), NOW()),
    ('wt-m06-02-01-03', 'wi-m06-02-01', 'wg-m06-02', 'phase-001-03-06', '6.2.1.3', '매뉴얼 검토', '운영 매뉴얼 검토 및 확정', 'NOT_STARTED', 0, 20, 3, NOW(), NOW()),

    -- Item 6.2.2: 사용자 가이드
    ('wt-m06-02-02-01', 'wi-m06-02-02', 'wg-m06-02', 'phase-001-03-06', '6.2.2.1', '가이드 기획', '사용자 가이드 기획 및 구성', 'NOT_STARTED', 0, 25, 1, NOW(), NOW()),
    ('wt-m06-02-02-02', 'wi-m06-02-02', 'wg-m06-02', 'phase-001-03-06', '6.2.2.2', '가이드 작성', '시스템 사용 가이드 작성', 'NOT_STARTED', 0, 55, 2, NOW(), NOW()),
    ('wt-m06-02-02-03', 'wi-m06-02-02', 'wg-m06-02', 'phase-001-03-06', '6.2.2.3', 'FAQ 작성', '자주 묻는 질문 FAQ 작성', 'NOT_STARTED', 0, 20, 3, NOW(), NOW()),

    -- Item 6.3.1: 거버넌스 정책
    ('wt-m06-03-01-01', 'wi-m06-03-01', 'wg-m06-03', 'phase-001-03-06', '6.3.1.1', '정책 초안 작성', 'AI 거버넌스 정책 초안 작성', 'NOT_STARTED', 0, 40, 1, NOW(), NOW()),
    ('wt-m06-03-01-02', 'wi-m06-03-01', 'wg-m06-03', 'phase-001-03-06', '6.3.1.2', '이해관계자 협의', '정책 이해관계자 협의 및 조율', 'NOT_STARTED', 0, 35, 2, NOW(), NOW()),
    ('wt-m06-03-01-03', 'wi-m06-03-01', 'wg-m06-03', 'phase-001-03-06', '6.3.1.3', '정책 확정', 'AI 거버넌스 정책 확정 및 공표', 'NOT_STARTED', 0, 25, 3, NOW(), NOW()),

    -- Item 6.3.2: 모니터링 체계
    ('wt-m06-03-02-01', 'wi-m06-03-02', 'wg-m06-03', 'phase-001-03-06', '6.3.2.1', '모니터링 지표 정의', '지속적 모니터링 지표 정의', 'NOT_STARTED', 0, 35, 1, NOW(), NOW()),
    ('wt-m06-03-02-02', 'wi-m06-03-02', 'wg-m06-03', 'phase-001-03-06', '6.3.2.2', '모니터링 체계 구축', '정기 모니터링 체계 및 프로세스 구축', 'NOT_STARTED', 0, 40, 2, NOW(), NOW()),
    ('wt-m06-03-02-03', 'wi-m06-03-02', 'wg-m06-03', 'phase-001-03-06', '6.3.2.3', '개선 프로세스 수립', '지속적 개선 프로세스 수립', 'NOT_STARTED', 0, 25, 3, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    progress = EXCLUDED.progress;

-- ============================================
-- Summary:
-- ============================================
-- Phase 1 Tasks: 18 (6 items x 3 tasks)
-- Phase 2 Tasks: 18 (6 items x 3 tasks)
-- Phase 4 Tasks: 18 (6 items x 3 tasks)
-- Phase 5 Tasks: 18 (6 items x 3 tasks)
-- Phase 6 Tasks: 18 (6 items x 3 tasks)
-- Total New Tasks: 90
-- ============================================


-- ============================================================
-- Source: V20260226__update_wbs_tasks_hours
-- ============================================================
-- Update estimated_hours for all methodology WBS tasks
-- Version: 20260226
-- Description: Set estimated hours for tasks in phases 1-6

-- ============================================
-- Phase 1: 업무 현황 진단/분석 (phase-001-03-01)
-- ============================================
UPDATE project.wbs_tasks SET estimated_hours = 8 WHERE id = 'wt-m01-01-01-01';  -- 프로세스 현황 조사
UPDATE project.wbs_tasks SET estimated_hours = 10 WHERE id = 'wt-m01-01-01-02'; -- 프로세스 맵 작성
UPDATE project.wbs_tasks SET estimated_hours = 6 WHERE id = 'wt-m01-01-01-03';  -- 병목점 식별
UPDATE project.wbs_tasks SET estimated_hours = 4 WHERE id = 'wt-m01-01-02-01';  -- 인터뷰 계획 수립
UPDATE project.wbs_tasks SET estimated_hours = 12 WHERE id = 'wt-m01-01-02-02'; -- 인터뷰 진행
UPDATE project.wbs_tasks SET estimated_hours = 4 WHERE id = 'wt-m01-01-02-03';  -- 인터뷰 결과 정리
UPDATE project.wbs_tasks SET estimated_hours = 6 WHERE id = 'wt-m01-02-01-01';  -- OCR 기술 조사
UPDATE project.wbs_tasks SET estimated_hours = 6 WHERE id = 'wt-m01-02-01-02';  -- NLP 기술 조사
UPDATE project.wbs_tasks SET estimated_hours = 4 WHERE id = 'wt-m01-02-01-03';  -- 기술 적합성 평가
UPDATE project.wbs_tasks SET estimated_hours = 6 WHERE id = 'wt-m01-02-02-01';  -- 비용 분석
UPDATE project.wbs_tasks SET estimated_hours = 6 WHERE id = 'wt-m01-02-02-02';  -- 효과 분석
UPDATE project.wbs_tasks SET estimated_hours = 4 WHERE id = 'wt-m01-02-02-03';  -- ROI 보고서 작성
UPDATE project.wbs_tasks SET estimated_hours = 4 WHERE id = 'wt-m01-03-01-01';  -- KPI 항목 도출
UPDATE project.wbs_tasks SET estimated_hours = 4 WHERE id = 'wt-m01-03-01-02';  -- 목표치 설정
UPDATE project.wbs_tasks SET estimated_hours = 4 WHERE id = 'wt-m01-03-01-03';  -- KPI 문서화
UPDATE project.wbs_tasks SET estimated_hours = 6 WHERE id = 'wt-m01-03-02-01';  -- 헌장 초안 작성
UPDATE project.wbs_tasks SET estimated_hours = 6 WHERE id = 'wt-m01-03-02-02';  -- 이해관계자 검토
UPDATE project.wbs_tasks SET estimated_hours = 4 WHERE id = 'wt-m01-03-02-03';  -- 헌장 승인

-- ============================================
-- Phase 2: 데이터 수집/정제 (phase-001-03-02)
-- ============================================
UPDATE project.wbs_tasks SET estimated_hours = 6 WHERE id = 'wt-m02-01-01-01';  -- 데이터 인벤토리
UPDATE project.wbs_tasks SET estimated_hours = 6 WHERE id = 'wt-m02-01-01-02';  -- 데이터 품질 평가
UPDATE project.wbs_tasks SET estimated_hours = 4 WHERE id = 'wt-m02-01-01-03';  -- 수집 우선순위
UPDATE project.wbs_tasks SET estimated_hours = 12 WHERE id = 'wt-m02-01-02-01'; -- 청구서 이미지 수집
UPDATE project.wbs_tasks SET estimated_hours = 12 WHERE id = 'wt-m02-01-02-02'; -- 심사 결과 데이터 수집
UPDATE project.wbs_tasks SET estimated_hours = 8 WHERE id = 'wt-m02-01-02-03';  -- 메타데이터 정리
UPDATE project.wbs_tasks SET estimated_hours = 8 WHERE id = 'wt-m02-02-01-01';  -- 이상치 탐지
UPDATE project.wbs_tasks SET estimated_hours = 8 WHERE id = 'wt-m02-02-01-02';  -- 결측치 처리
UPDATE project.wbs_tasks SET estimated_hours = 8 WHERE id = 'wt-m02-02-01-03';  -- 데이터 정규화
UPDATE project.wbs_tasks SET estimated_hours = 6 WHERE id = 'wt-m02-02-02-01';  -- 민감정보 식별
UPDATE project.wbs_tasks SET estimated_hours = 10 WHERE id = 'wt-m02-02-02-02'; -- 비식별화 적용
UPDATE project.wbs_tasks SET estimated_hours = 4 WHERE id = 'wt-m02-02-02-03';  -- 비식별화 검증
UPDATE project.wbs_tasks SET estimated_hours = 8 WHERE id = 'wt-m02-03-01-01';  -- 피처 후보 도출
UPDATE project.wbs_tasks SET estimated_hours = 12 WHERE id = 'wt-m02-03-01-02'; -- 피처 추출 구현
UPDATE project.wbs_tasks SET estimated_hours = 4 WHERE id = 'wt-m02-03-01-03';  -- 피처 중요도 분석
UPDATE project.wbs_tasks SET estimated_hours = 8 WHERE id = 'wt-m02-03-02-01';  -- 라벨링 가이드 작성
UPDATE project.wbs_tasks SET estimated_hours = 24 WHERE id = 'wt-m02-03-02-02'; -- 라벨링 작업
UPDATE project.wbs_tasks SET estimated_hours = 8 WHERE id = 'wt-m02-03-02-03';  -- 라벨링 품질 검증

-- ============================================
-- Phase 3: AI모델 설계/학습 (phase-001-03-03)
-- ============================================
UPDATE project.wbs_tasks SET estimated_hours = 8 WHERE id = 'wt-m03-01-01-01';  -- 요구사항 분석
UPDATE project.wbs_tasks SET estimated_hours = 10 WHERE id = 'wt-m03-01-01-02'; -- 아키텍처 설계
UPDATE project.wbs_tasks SET estimated_hours = 6 WHERE id = 'wt-m03-01-01-03';  -- 설계 검토
UPDATE project.wbs_tasks SET estimated_hours = 12 WHERE id = 'wt-m03-01-02-01'; -- 학습 환경 구축
UPDATE project.wbs_tasks SET estimated_hours = 32 WHERE id = 'wt-m03-01-02-02'; -- 모델 학습
UPDATE project.wbs_tasks SET estimated_hours = 16 WHERE id = 'wt-m03-01-02-03'; -- 하이퍼파라미터 튜닝
UPDATE project.wbs_tasks SET estimated_hours = 8 WHERE id = 'wt-m03-01-03-01';  -- 테스트 데이터 준비
UPDATE project.wbs_tasks SET estimated_hours = 16 WHERE id = 'wt-m03-01-03-02'; -- 성능 측정
UPDATE project.wbs_tasks SET estimated_hours = 8 WHERE id = 'wt-m03-01-03-03';  -- 개선 방안 도출
UPDATE project.wbs_tasks SET estimated_hours = 8 WHERE id = 'wt-m03-02-01-01';  -- 분류 체계 정의
UPDATE project.wbs_tasks SET estimated_hours = 12 WHERE id = 'wt-m03-02-01-02'; -- 모델 아키텍처 설계
UPDATE project.wbs_tasks SET estimated_hours = 12 WHERE id = 'wt-m03-02-02-01'; -- 데이터 전처리
UPDATE project.wbs_tasks SET estimated_hours = 24 WHERE id = 'wt-m03-02-02-02'; -- 모델 학습
UPDATE project.wbs_tasks SET estimated_hours = 12 WHERE id = 'wt-m03-02-02-03'; -- 최적화
UPDATE project.wbs_tasks SET estimated_hours = 8 WHERE id = 'wt-m03-02-03-01';  -- 정확도 평가
UPDATE project.wbs_tasks SET estimated_hours = 10 WHERE id = 'wt-m03-02-03-02'; -- 오분류 분석
UPDATE project.wbs_tasks SET estimated_hours = 6 WHERE id = 'wt-m03-02-03-03';  -- 성능 리포트
UPDATE project.wbs_tasks SET estimated_hours = 12 WHERE id = 'wt-m03-03-01-01'; -- 비즈니스 규칙 정의
UPDATE project.wbs_tasks SET estimated_hours = 12 WHERE id = 'wt-m03-03-01-02'; -- 규칙 엔진 구현
UPDATE project.wbs_tasks SET estimated_hours = 10 WHERE id = 'wt-m03-03-02-01'; -- 통합 아키텍처
UPDATE project.wbs_tasks SET estimated_hours = 14 WHERE id = 'wt-m03-03-02-02'; -- 의사결정 로직
UPDATE project.wbs_tasks SET estimated_hours = 8 WHERE id = 'wt-m03-03-02-03';  -- 결과 병합
UPDATE project.wbs_tasks SET estimated_hours = 6 WHERE id = 'wt-m03-03-03-01';  -- 테스트 케이스 작성
UPDATE project.wbs_tasks SET estimated_hours = 10 WHERE id = 'wt-m03-03-03-02'; -- 테스트 수행
UPDATE project.wbs_tasks SET estimated_hours = 4 WHERE id = 'wt-m03-03-03-03';  -- 결함 수정

-- ============================================
-- Phase 4: 업무시스템 연동/운영 자동화 (phase-001-03-04)
-- ============================================
UPDATE project.wbs_tasks SET estimated_hours = 6 WHERE id = 'wt-m04-01-01-01';  -- 엔드포인트 설계
UPDATE project.wbs_tasks SET estimated_hours = 6 WHERE id = 'wt-m04-01-01-02';  -- 스키마 정의
UPDATE project.wbs_tasks SET estimated_hours = 4 WHERE id = 'wt-m04-01-01-03';  -- API 문서 작성
UPDATE project.wbs_tasks SET estimated_hours = 14 WHERE id = 'wt-m04-01-02-01'; -- OCR 서비스 API
UPDATE project.wbs_tasks SET estimated_hours = 14 WHERE id = 'wt-m04-01-02-02'; -- 분류 서비스 API
UPDATE project.wbs_tasks SET estimated_hours = 12 WHERE id = 'wt-m04-01-02-03'; -- API 테스트
UPDATE project.wbs_tasks SET estimated_hours = 8 WHERE id = 'wt-m04-02-01-01';  -- 레거시 분석
UPDATE project.wbs_tasks SET estimated_hours = 8 WHERE id = 'wt-m04-02-01-02';  -- 연동 아키텍처
UPDATE project.wbs_tasks SET estimated_hours = 4 WHERE id = 'wt-m04-02-01-03';  -- 연동 명세 작성
UPDATE project.wbs_tasks SET estimated_hours = 20 WHERE id = 'wt-m04-02-02-01'; -- 어댑터 개발
UPDATE project.wbs_tasks SET estimated_hours = 16 WHERE id = 'wt-m04-02-02-02'; -- 데이터 동기화
UPDATE project.wbs_tasks SET estimated_hours = 12 WHERE id = 'wt-m04-02-02-03'; -- 연동 테스트
UPDATE project.wbs_tasks SET estimated_hours = 8 WHERE id = 'wt-m04-03-01-01';  -- 파이프라인 설계
UPDATE project.wbs_tasks SET estimated_hours = 12 WHERE id = 'wt-m04-03-01-02'; -- 자동 배포 구현
UPDATE project.wbs_tasks SET estimated_hours = 4 WHERE id = 'wt-m04-03-01-03';  -- 롤백 메커니즘
UPDATE project.wbs_tasks SET estimated_hours = 6 WHERE id = 'wt-m04-03-02-01';  -- 메트릭 정의
UPDATE project.wbs_tasks SET estimated_hours = 12 WHERE id = 'wt-m04-03-02-02'; -- 대시보드 구축
UPDATE project.wbs_tasks SET estimated_hours = 6 WHERE id = 'wt-m04-03-02-03';  -- 알림 시스템

-- ============================================
-- Phase 5: 효과 검증/운영고도화 (phase-001-03-05)
-- ============================================
UPDATE project.wbs_tasks SET estimated_hours = 10 WHERE id = 'wt-m05-01-01-01'; -- Pilot 환경 구성
UPDATE project.wbs_tasks SET estimated_hours = 16 WHERE id = 'wt-m05-01-01-02'; -- Pilot 운영 수행
UPDATE project.wbs_tasks SET estimated_hours = 6 WHERE id = 'wt-m05-01-01-03';  -- 운영 로그 수집
UPDATE project.wbs_tasks SET estimated_hours = 6 WHERE id = 'wt-m05-01-02-01';  -- 정량 분석
UPDATE project.wbs_tasks SET estimated_hours = 6 WHERE id = 'wt-m05-01-02-02';  -- 정성 분석
UPDATE project.wbs_tasks SET estimated_hours = 4 WHERE id = 'wt-m05-01-02-03';  -- 분석 보고서
UPDATE project.wbs_tasks SET estimated_hours = 6 WHERE id = 'wt-m05-02-01-01';  -- 데이터 수집
UPDATE project.wbs_tasks SET estimated_hours = 6 WHERE id = 'wt-m05-02-01-02';  -- KPI 산출
UPDATE project.wbs_tasks SET estimated_hours = 4 WHERE id = 'wt-m05-02-01-03';  -- 목표 달성 평가
UPDATE project.wbs_tasks SET estimated_hours = 6 WHERE id = 'wt-m05-02-02-01';  -- AS-IS 데이터 정리
UPDATE project.wbs_tasks SET estimated_hours = 10 WHERE id = 'wt-m05-02-02-02'; -- 비교 분석 수행
UPDATE project.wbs_tasks SET estimated_hours = 4 WHERE id = 'wt-m05-02-02-03';  -- 개선 효과 보고서
UPDATE project.wbs_tasks SET estimated_hours = 4 WHERE id = 'wt-m05-03-01-01';  -- 설문 설계
UPDATE project.wbs_tasks SET estimated_hours = 6 WHERE id = 'wt-m05-03-01-02';  -- 피드백 수집
UPDATE project.wbs_tasks SET estimated_hours = 2 WHERE id = 'wt-m05-03-01-03';  -- 피드백 분석
UPDATE project.wbs_tasks SET estimated_hours = 4 WHERE id = 'wt-m05-03-02-01';  -- 개선 계획 수립
UPDATE project.wbs_tasks SET estimated_hours = 10 WHERE id = 'wt-m05-03-02-02'; -- 개선 구현
UPDATE project.wbs_tasks SET estimated_hours = 2 WHERE id = 'wt-m05-03-02-03';  -- 개선 검증

-- ============================================
-- Phase 6: 조직/프로세스 변화관리 (phase-001-03-06)
-- ============================================
UPDATE project.wbs_tasks SET estimated_hours = 6 WHERE id = 'wt-m06-01-01-01';  -- 교육 과정 설계
UPDATE project.wbs_tasks SET estimated_hours = 10 WHERE id = 'wt-m06-01-01-02'; -- 교육 자료 제작
UPDATE project.wbs_tasks SET estimated_hours = 4 WHERE id = 'wt-m06-01-01-03';  -- 교육 자료 검토
UPDATE project.wbs_tasks SET estimated_hours = 4 WHERE id = 'wt-m06-01-02-01';  -- 교육 일정 수립
UPDATE project.wbs_tasks SET estimated_hours = 16 WHERE id = 'wt-m06-01-02-02'; -- 집합 교육
UPDATE project.wbs_tasks SET estimated_hours = 4 WHERE id = 'wt-m06-01-02-03';  -- 교육 효과 평가
UPDATE project.wbs_tasks SET estimated_hours = 4 WHERE id = 'wt-m06-02-01-01';  -- 매뉴얼 구조 설계
UPDATE project.wbs_tasks SET estimated_hours = 12 WHERE id = 'wt-m06-02-01-02'; -- 매뉴얼 작성
UPDATE project.wbs_tasks SET estimated_hours = 4 WHERE id = 'wt-m06-02-01-03';  -- 매뉴얼 검토
UPDATE project.wbs_tasks SET estimated_hours = 4 WHERE id = 'wt-m06-02-02-01';  -- 가이드 기획
UPDATE project.wbs_tasks SET estimated_hours = 10 WHERE id = 'wt-m06-02-02-02'; -- 가이드 작성
UPDATE project.wbs_tasks SET estimated_hours = 2 WHERE id = 'wt-m06-02-02-03';  -- FAQ 작성
UPDATE project.wbs_tasks SET estimated_hours = 6 WHERE id = 'wt-m06-03-01-01';  -- 정책 초안 작성
UPDATE project.wbs_tasks SET estimated_hours = 6 WHERE id = 'wt-m06-03-01-02';  -- 이해관계자 협의
UPDATE project.wbs_tasks SET estimated_hours = 4 WHERE id = 'wt-m06-03-01-03';  -- 정책 확정
UPDATE project.wbs_tasks SET estimated_hours = 6 WHERE id = 'wt-m06-03-02-01';  -- 모니터링 지표 정의
UPDATE project.wbs_tasks SET estimated_hours = 8 WHERE id = 'wt-m06-03-02-02';  -- 모니터링 체계 구축
UPDATE project.wbs_tasks SET estimated_hours = 2 WHERE id = 'wt-m06-03-02-03';  -- 개선 프로세스 수립

-- ============================================
-- Summary:
-- Total estimated hours by phase:
-- Phase 1: 104 hours
-- Phase 2: 142 hours
-- Phase 3: 262 hours
-- Phase 4: 172 hours
-- Phase 5: 112 hours
-- Phase 6: 112 hours
-- Grand Total: 904 hours
-- ============================================


-- ============================================================
-- Source: V20260227__parts_mock_data
-- ============================================================
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


-- ============================================================
-- Source: V20260229__proj002_comprehensive_data
-- ============================================================
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


-- ============================================================
-- Source: V20260231_02__seed_project_requirements
-- ============================================================
-- Phase 0-2: Copy rfp.requirements -> project.requirements (project-scoped snapshot)
-- Adds source_requirement_id column for origin tracking
-- Uses preq- prefix PK to avoid conflicts with rfp IDs

BEGIN;

-- Schema change: add source_requirement_id tracking column
ALTER TABLE project.requirements
ADD COLUMN IF NOT EXISTS source_requirement_id VARCHAR(36);

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_req_source_unique
    ON project.requirements(project_id, source_requirement_id)
    WHERE source_requirement_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_project_req_source_id
    ON project.requirements(source_requirement_id);

-- Pre-check: count copy targets
DO $$
DECLARE
    v_rfp_count INTEGER;
    v_existing_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_rfp_count
    FROM rfp.requirements r
    WHERE r.project_id IS NOT NULL;

    SELECT COUNT(*) INTO v_existing_count
    FROM project.requirements;

    RAISE NOTICE 'Phase 0-2: rfp.requirements to copy: %, project.requirements existing: %',
        v_rfp_count, v_existing_count;
END $$;

-- Copy data: separate PK (preq-) + source tracking
INSERT INTO project.requirements (
    id, rfp_id, project_id, source_requirement_id,
    requirement_code, title, description,
    category, priority, status, progress_percentage,
    tenant_id, created_by, created_at, updated_at
)
SELECT
    'preq-' || SUBSTRING(r.id FROM 5),  -- req-001-01 -> preq-001-01
    r.rfp_id,
    r.project_id,
    r.id,  -- source_requirement_id = original rfp.requirements.id
    'P-' || r.requirement_code,  -- prefix to ensure uniqueness vs rfp codes
    r.title,
    r.description,
    r.category,
    r.priority,
    CASE
        WHEN r.status = 'APPROVED' THEN 'APPROVED'
        WHEN r.status = 'ANALYZED' THEN 'ANALYZED'
        ELSE 'IDENTIFIED'
    END,
    COALESCE(r.progress, 0),
    rfps.tenant_id,
    'system',
    r.created_at,
    r.updated_at
FROM rfp.requirements r
JOIN rfp.rfps rfps ON r.rfp_id = rfps.id
WHERE r.project_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;  -- divergeable copy: don't overwrite existing

-- Update backlog_items.requirement_id: rfp ID -> project snapshot ID
UPDATE project.backlog_items bi
SET requirement_id = pr.id,
    updated_at = NOW()
FROM project.requirements pr
WHERE pr.source_requirement_id = bi.requirement_id
  AND bi.requirement_id NOT LIKE 'preq-%';  -- skip already converted

-- Post-check
DO $$
DECLARE
    v_total_bi INTEGER;
    v_linked_bi INTEGER;
    v_orphans INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_bi FROM project.backlog_items;
    SELECT COUNT(*) INTO v_linked_bi
    FROM project.backlog_items bi
    JOIN project.requirements r ON bi.requirement_id = r.id;

    SELECT COUNT(*) INTO v_orphans
    FROM project.backlog_items bi
    WHERE bi.requirement_id IS NOT NULL
      AND bi.requirement_id NOT IN (SELECT id FROM project.requirements);

    IF v_orphans > 0 THEN
        RAISE EXCEPTION 'Phase 0-2 post-check failed: % orphan requirement_id(s) remain — ROLLBACK', v_orphans;
    END IF;

    RAISE NOTICE 'Phase 0-2 complete: backlog_items %/% linked, 0 orphans',
        v_linked_bi, v_total_bi;
END $$;

COMMIT;


-- ============================================================
-- Source: V20260233_04__normalize_status_and_seed_events
-- ============================================================
-- Phase 2-3: Status normalization + transition event seeding
-- Principle: seed event FIRST, then change status (preserves history)

-- ========================================
-- User Story: COMPLETED → DONE, SELECTED → IN_SPRINT
-- ========================================
BEGIN;

INSERT INTO audit.status_transition_events
    (id, project_id, entity_type, entity_id, from_status, to_status,
     changed_by, change_source, metadata)
SELECT
    gen_random_uuid()::text,
    us.project_id,
    'STORY',
    us.id,
    us.status,
    CASE
        WHEN us.status = 'COMPLETED' THEN 'DONE'
        WHEN us.status = 'SELECTED'  THEN 'IN_SPRINT'
        ELSE us.status
    END,
    NULL,
    'MIGRATION',
    jsonb_build_object('reason', 'phase2_normalize_status_values')
FROM task.user_stories us
WHERE us.status IN ('COMPLETED', 'SELECTED');

UPDATE task.user_stories SET status = 'DONE'      WHERE status = 'COMPLETED';
UPDATE task.user_stories SET status = 'IN_SPRINT'  WHERE status = 'SELECTED';

COMMIT;

-- ========================================
-- Epic: ACTIVE → IN_PROGRESS, DRAFT → BACKLOG
-- ========================================
BEGIN;

INSERT INTO audit.status_transition_events
    (id, project_id, entity_type, entity_id, from_status, to_status,
     changed_by, change_source, metadata)
SELECT
    gen_random_uuid()::text,
    e.project_id,
    'EPIC',
    e.id,
    e.status,
    CASE
        WHEN e.status = 'ACTIVE' THEN 'IN_PROGRESS'
        WHEN e.status = 'DRAFT'  THEN 'BACKLOG'
        ELSE e.status
    END,
    NULL,
    'MIGRATION',
    jsonb_build_object('reason', 'phase2_normalize_status_values')
FROM project.epics e
WHERE e.status IN ('ACTIVE', 'DRAFT');

UPDATE project.epics SET status = 'IN_PROGRESS' WHERE status = 'ACTIVE';
UPDATE project.epics SET status = 'BACKLOG'     WHERE status = 'DRAFT';

COMMIT;

-- ========================================
-- Backlog Item: SELECTED → IN_SPRINT
-- ========================================
BEGIN;

INSERT INTO audit.status_transition_events
    (id, project_id, entity_type, entity_id, from_status, to_status,
     changed_by, change_source, metadata)
SELECT
    gen_random_uuid()::text,
    (SELECT b.project_id FROM project.backlogs b WHERE b.id = bi.backlog_id),
    'BACKLOG_ITEM',
    bi.id,
    bi.status,
    CASE
        WHEN bi.status = 'SELECTED' THEN 'IN_SPRINT'
        ELSE bi.status
    END,
    NULL,
    'MIGRATION',
    jsonb_build_object('reason', 'phase2_normalize_status_values')
FROM project.backlog_items bi
WHERE bi.status IN ('SELECTED');

UPDATE project.backlog_items SET status = 'IN_SPRINT' WHERE status = 'SELECTED';

COMMIT;


-- ============================================================
-- Backfill/Fix Updates (from later migrations)
-- ============================================================

-- V20260122: Backfill active status for project_members
UPDATE project.project_members SET active = TRUE WHERE active IS NULL;

-- V20260203: Backfill outbox_events project_id from payload
UPDATE project.outbox_events SET project_id = payload->>'projectId' WHERE project_id IS NULL AND payload->>'projectId' IS NOT NULL;

-- V20260205: Derive WBS task dates from parent items
UPDATE project.wbs_tasks t SET planned_start_date = i.planned_start_date, planned_end_date = i.planned_end_date FROM project.wbs_items i WHERE t.item_id = i.id AND t.planned_start_date IS NULL AND t.planned_end_date IS NULL AND (i.planned_start_date IS NOT NULL OR i.planned_end_date IS NOT NULL);

-- V20260211: Story status migration (BACKLOG->READY, SELECTED->IN_SPRINT, COMPLETED->DONE)
UPDATE task.user_stories SET status = 'READY', updated_at = CURRENT_TIMESTAMP WHERE status = 'BACKLOG';
UPDATE task.user_stories SET status = 'IN_SPRINT', updated_at = CURRENT_TIMESTAMP WHERE status = 'SELECTED';
UPDATE task.user_stories SET status = 'DONE', updated_at = CURRENT_TIMESTAMP WHERE status = 'COMPLETED';

-- V20260216: Default track weights
UPDATE project.projects SET ai_weight = 0.70, si_weight = 0.30 WHERE ai_weight IS NULL OR si_weight IS NULL;

-- V20260217: Generate rag_doc_id for existing deliverables
UPDATE project.deliverables SET rag_doc_id = 'deliverable:' || id WHERE rag_doc_id IS NULL;

-- V20260220: Update epics with calculated values
UPDATE project.epics e SET item_count = COALESCE((SELECT COUNT(*) FROM project.features f WHERE f.epic_id = e.id), 0), business_value = COALESCE(CASE WHEN e.priority = 'CRITICAL' THEN 100 WHEN e.priority = 'HIGH' THEN 80 WHEN e.priority = 'MEDIUM' THEN 50 WHEN e.priority = 'LOW' THEN 20 ELSE 50 END, 50) WHERE e.business_value IS NULL OR e.business_value = 0;

WITH ordered_features AS (SELECT id, epic_id, ROW_NUMBER() OVER (PARTITION BY epic_id ORDER BY created_at) as rn FROM project.features) UPDATE project.features f SET order_num = of.rn FROM ordered_features of WHERE f.id = of.id AND (f.order_num IS NULL OR f.order_num = 0);

-- V20260228: Backfill track_type on phases
UPDATE project.phases SET track_type = 'AI' WHERE track_type IS NULL AND (name LIKE '%AI%' OR name LIKE '%모델%' OR name LIKE '%OCR%');
UPDATE project.phases SET track_type = 'SI' WHERE track_type IS NULL AND (name LIKE '%SI%' OR name LIKE '%연동%' OR name LIKE '%레거시%' OR name LIKE '%마이그레이션%');
UPDATE project.phases SET track_type = 'COMMON' WHERE track_type IS NULL;

-- V20260232_02: Map epic_id on user_stories from text epic field
UPDATE task.user_stories us SET epic_id = e.id FROM project.epics e WHERE us.epic = e.name AND us.project_id = e.project_id AND us.epic_id IS NULL;

-- V20260232_03: Populate story part_id from feature part_id
UPDATE task.user_stories us SET part_id = f.part_id FROM project.features f WHERE us.feature_id = f.id AND us.part_id IS NULL AND f.part_id IS NOT NULL;


-- ============================================================
-- END OF SEED DATA
-- ============================================================
