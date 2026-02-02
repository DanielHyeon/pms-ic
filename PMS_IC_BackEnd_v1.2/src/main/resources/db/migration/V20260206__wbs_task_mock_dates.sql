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
