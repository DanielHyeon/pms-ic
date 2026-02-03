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
