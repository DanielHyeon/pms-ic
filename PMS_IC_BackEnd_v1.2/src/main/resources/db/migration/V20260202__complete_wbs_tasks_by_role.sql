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
