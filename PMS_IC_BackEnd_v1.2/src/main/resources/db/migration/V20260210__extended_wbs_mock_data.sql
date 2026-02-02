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
