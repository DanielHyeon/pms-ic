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
