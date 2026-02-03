// WBS Mock Data - Based on DB migration V20260223__methodology_phase_wbs_data.sql
// This provides fallback data when backend is unavailable

import { WbsGroup, WbsItem, WbsTask } from '../types/wbs';

// ============================================
// WBS Groups by Phase ID
// ============================================
export const mockWbsGroups: Record<string, WbsGroup[]> = {
  // Phase 1: 업무 현황 진단/분석 (phase-001-03-01) - COMPLETED
  'phase-001-03-01': [
    {
      id: 'wg-m01-01',
      projectId: 'proj-001',
      phaseId: 'phase-001-03-01',
      code: '1.1',
      name: '현황 분석',
      description: 'AS-IS 업무 프로세스 분석',
      status: 'COMPLETED',
      progress: 100,
      plannedStartDate: '2025-01-02',
      plannedEndDate: '2025-01-20',
      weight: 40,
      orderNum: 1,
    },
    {
      id: 'wg-m01-02',
      projectId: 'proj-001',
      phaseId: 'phase-001-03-01',
      code: '1.2',
      name: 'AI 적용성 검토',
      description: 'AI 적용 타당성 및 범위 검토',
      status: 'COMPLETED',
      progress: 100,
      plannedStartDate: '2025-01-15',
      plannedEndDate: '2025-02-05',
      weight: 35,
      orderNum: 2,
    },
    {
      id: 'wg-m01-03',
      projectId: 'proj-001',
      phaseId: 'phase-001-03-01',
      code: '1.3',
      name: '프로젝트 기획',
      description: '프로젝트 헌장 및 KPI 정의',
      status: 'COMPLETED',
      progress: 100,
      plannedStartDate: '2025-02-01',
      plannedEndDate: '2025-02-15',
      weight: 25,
      orderNum: 3,
    },
  ],

  // Phase 2: 데이터 수집/정제 (phase-001-03-02) - COMPLETED
  'phase-001-03-02': [
    {
      id: 'wg-m02-01',
      projectId: 'proj-001',
      phaseId: 'phase-001-03-02',
      code: '2.1',
      name: '데이터 수집',
      description: '학습 데이터 수집 및 인벤토리',
      status: 'COMPLETED',
      progress: 100,
      plannedStartDate: '2025-02-16',
      plannedEndDate: '2025-03-15',
      weight: 35,
      orderNum: 1,
    },
    {
      id: 'wg-m02-02',
      projectId: 'proj-001',
      phaseId: 'phase-001-03-02',
      code: '2.2',
      name: '데이터 정제',
      description: '데이터 클렌징 및 비식별화',
      status: 'COMPLETED',
      progress: 100,
      plannedStartDate: '2025-03-10',
      plannedEndDate: '2025-04-10',
      weight: 35,
      orderNum: 2,
    },
    {
      id: 'wg-m02-03',
      projectId: 'proj-001',
      phaseId: 'phase-001-03-02',
      code: '2.3',
      name: '피처 엔지니어링',
      description: '피처 추출 및 라벨링',
      status: 'COMPLETED',
      progress: 100,
      plannedStartDate: '2025-04-01',
      plannedEndDate: '2025-04-30',
      weight: 30,
      orderNum: 3,
    },
  ],

  // Phase 3: AI모델 설계/학습 (phase-001-03-03) - IN_PROGRESS
  'phase-001-03-03': [
    {
      id: 'wg-m03-01',
      projectId: 'proj-001',
      phaseId: 'phase-001-03-03',
      code: '3.1',
      name: 'OCR 모델 개발',
      description: 'OCR 모델 설계 및 학습',
      status: 'IN_PROGRESS',
      progress: 90,
      plannedStartDate: '2025-05-01',
      plannedEndDate: '2025-06-30',
      weight: 35,
      orderNum: 1,
    },
    {
      id: 'wg-m03-02',
      projectId: 'proj-001',
      phaseId: 'phase-001-03-03',
      code: '3.2',
      name: '분류 모델 개발',
      description: '보험 청구 분류 모델 개발',
      status: 'IN_PROGRESS',
      progress: 85,
      plannedStartDate: '2025-06-01',
      plannedEndDate: '2025-07-31',
      weight: 35,
      orderNum: 2,
    },
    {
      id: 'wg-m03-03',
      projectId: 'proj-001',
      phaseId: 'phase-001-03-03',
      code: '3.3',
      name: '하이브리드 로직',
      description: '규칙 기반 + AI 하이브리드 구축',
      status: 'IN_PROGRESS',
      progress: 70,
      plannedStartDate: '2025-07-15',
      plannedEndDate: '2025-08-31',
      weight: 30,
      orderNum: 3,
    },
  ],

  // Phase 4: 업무시스템 연동/운영 자동화 (phase-001-03-04) - NOT_STARTED
  'phase-001-03-04': [
    {
      id: 'wg-m04-01',
      projectId: 'proj-001',
      phaseId: 'phase-001-03-04',
      code: '4.1',
      name: 'API 개발',
      description: 'AI 서비스 API 개발',
      status: 'NOT_STARTED',
      progress: 0,
      plannedStartDate: '2025-09-01',
      plannedEndDate: '2025-09-20',
      weight: 35,
      orderNum: 1,
    },
    {
      id: 'wg-m04-02',
      projectId: 'proj-001',
      phaseId: 'phase-001-03-04',
      code: '4.2',
      name: '시스템 통합',
      description: '레거시 시스템 연동',
      status: 'NOT_STARTED',
      progress: 0,
      plannedStartDate: '2025-09-15',
      plannedEndDate: '2025-10-15',
      weight: 35,
      orderNum: 2,
    },
    {
      id: 'wg-m04-03',
      projectId: 'proj-001',
      phaseId: 'phase-001-03-04',
      code: '4.3',
      name: 'MLOps 구축',
      description: 'MLOps 파이프라인 구축',
      status: 'NOT_STARTED',
      progress: 0,
      plannedStartDate: '2025-10-10',
      plannedEndDate: '2025-10-31',
      weight: 30,
      orderNum: 3,
    },
  ],

  // Phase 5: 효과 검증/운영고도화 (phase-001-03-05) - NOT_STARTED
  'phase-001-03-05': [
    {
      id: 'wg-m05-01',
      projectId: 'proj-001',
      phaseId: 'phase-001-03-05',
      code: '5.1',
      name: 'PoC 검증',
      description: 'Pilot 운영 및 PoC 검증',
      status: 'NOT_STARTED',
      progress: 0,
      plannedStartDate: '2025-11-01',
      plannedEndDate: '2025-11-15',
      weight: 40,
      orderNum: 1,
    },
    {
      id: 'wg-m05-02',
      projectId: 'proj-001',
      phaseId: 'phase-001-03-05',
      code: '5.2',
      name: '성능 평가',
      description: 'AS-IS vs TO-BE 비교 분석',
      status: 'NOT_STARTED',
      progress: 0,
      plannedStartDate: '2025-11-10',
      plannedEndDate: '2025-11-25',
      weight: 35,
      orderNum: 2,
    },
    {
      id: 'wg-m05-03',
      projectId: 'proj-001',
      phaseId: 'phase-001-03-05',
      code: '5.3',
      name: '피드백 반영',
      description: '현업 피드백 수집 및 반영',
      status: 'NOT_STARTED',
      progress: 0,
      plannedStartDate: '2025-11-20',
      plannedEndDate: '2025-11-30',
      weight: 25,
      orderNum: 3,
    },
  ],

  // Phase 6: 조직/프로세스 변화관리 (phase-001-03-06) - NOT_STARTED
  'phase-001-03-06': [
    {
      id: 'wg-m06-01',
      projectId: 'proj-001',
      phaseId: 'phase-001-03-06',
      code: '6.1',
      name: '교육 프로그램',
      description: '사용자 교육 프로그램 운영',
      status: 'NOT_STARTED',
      progress: 0,
      plannedStartDate: '2025-12-01',
      plannedEndDate: '2025-12-15',
      weight: 35,
      orderNum: 1,
    },
    {
      id: 'wg-m06-02',
      projectId: 'proj-001',
      phaseId: 'phase-001-03-06',
      code: '6.2',
      name: '가이드라인',
      description: '운영 가이드 및 매뉴얼 작성',
      status: 'NOT_STARTED',
      progress: 0,
      plannedStartDate: '2025-12-10',
      plannedEndDate: '2025-12-25',
      weight: 35,
      orderNum: 2,
    },
    {
      id: 'wg-m06-03',
      projectId: 'proj-001',
      phaseId: 'phase-001-03-06',
      code: '6.3',
      name: 'AI 거버넌스',
      description: 'AI 거버넌스 체계 구축',
      status: 'NOT_STARTED',
      progress: 0,
      plannedStartDate: '2025-12-20',
      plannedEndDate: '2025-12-31',
      weight: 30,
      orderNum: 3,
    },
  ],
};

// ============================================
// WBS Items by Group ID
// ============================================
export const mockWbsItems: Record<string, WbsItem[]> = {
  // Phase 1, Group 1.1: 현황 분석
  'wg-m01-01': [
    {
      id: 'wi-m01-01-01',
      groupId: 'wg-m01-01',
      phaseId: 'phase-001-03-01',
      code: '1.1.1',
      name: '업무 프로세스 맵핑',
      description: '지급심사 업무 프로세스 맵핑',
      status: 'COMPLETED',
      progress: 100,
      plannedStartDate: '2025-01-02',
      plannedEndDate: '2025-01-10',
      weight: 50,
      orderNum: 1,
      estimatedHours: 24,
    },
    {
      id: 'wi-m01-01-02',
      groupId: 'wg-m01-01',
      phaseId: 'phase-001-03-01',
      code: '1.1.2',
      name: '이해관계자 인터뷰',
      description: '현업 담당자 인터뷰 진행',
      status: 'COMPLETED',
      progress: 100,
      plannedStartDate: '2025-01-08',
      plannedEndDate: '2025-01-20',
      weight: 50,
      orderNum: 2,
      estimatedHours: 20,
    },
  ],

  // Phase 1, Group 1.2: AI 적용성 검토
  'wg-m01-02': [
    {
      id: 'wi-m01-02-01',
      groupId: 'wg-m01-02',
      phaseId: 'phase-001-03-01',
      code: '1.2.1',
      name: 'AI 기술 조사',
      description: 'OCR/NLP 기술 현황 조사',
      status: 'COMPLETED',
      progress: 100,
      plannedStartDate: '2025-01-15',
      plannedEndDate: '2025-01-25',
      weight: 50,
      orderNum: 1,
      estimatedHours: 16,
    },
    {
      id: 'wi-m01-02-02',
      groupId: 'wg-m01-02',
      phaseId: 'phase-001-03-01',
      code: '1.2.2',
      name: 'ROI 분석',
      description: '투자 대비 효과 분석',
      status: 'COMPLETED',
      progress: 100,
      plannedStartDate: '2025-01-22',
      plannedEndDate: '2025-02-05',
      weight: 50,
      orderNum: 2,
      estimatedHours: 16,
    },
  ],

  // Phase 1, Group 1.3: 프로젝트 기획
  'wg-m01-03': [
    {
      id: 'wi-m01-03-01',
      groupId: 'wg-m01-03',
      phaseId: 'phase-001-03-01',
      code: '1.3.1',
      name: 'KPI 정의',
      description: '성과 지표 정의',
      status: 'COMPLETED',
      progress: 100,
      plannedStartDate: '2025-02-01',
      plannedEndDate: '2025-02-08',
      weight: 50,
      orderNum: 1,
      estimatedHours: 12,
    },
    {
      id: 'wi-m01-03-02',
      groupId: 'wg-m01-03',
      phaseId: 'phase-001-03-01',
      code: '1.3.2',
      name: '프로젝트 헌장',
      description: '프로젝트 헌장 작성 및 승인',
      status: 'COMPLETED',
      progress: 100,
      plannedStartDate: '2025-02-05',
      plannedEndDate: '2025-02-15',
      weight: 50,
      orderNum: 2,
      estimatedHours: 16,
    },
  ],

  // Phase 2, Group 2.1: 데이터 수집
  'wg-m02-01': [
    {
      id: 'wi-m02-01-01',
      groupId: 'wg-m02-01',
      phaseId: 'phase-001-03-02',
      code: '2.1.1',
      name: '데이터 소스 식별',
      description: '학습 데이터 소스 식별',
      status: 'COMPLETED',
      progress: 100,
      plannedStartDate: '2025-02-16',
      plannedEndDate: '2025-02-28',
      weight: 40,
      orderNum: 1,
      estimatedHours: 16,
    },
    {
      id: 'wi-m02-01-02',
      groupId: 'wg-m02-01',
      phaseId: 'phase-001-03-02',
      code: '2.1.2',
      name: '데이터 수집',
      description: '보험 청구 데이터 수집',
      status: 'COMPLETED',
      progress: 100,
      plannedStartDate: '2025-02-25',
      plannedEndDate: '2025-03-15',
      weight: 60,
      orderNum: 2,
      estimatedHours: 32,
    },
  ],

  // Phase 2, Group 2.2: 데이터 정제
  'wg-m02-02': [
    {
      id: 'wi-m02-02-01',
      groupId: 'wg-m02-02',
      phaseId: 'phase-001-03-02',
      code: '2.2.1',
      name: '데이터 클렌징',
      description: '이상치 및 결측치 처리',
      status: 'COMPLETED',
      progress: 100,
      plannedStartDate: '2025-03-10',
      plannedEndDate: '2025-03-25',
      weight: 50,
      orderNum: 1,
      estimatedHours: 24,
    },
    {
      id: 'wi-m02-02-02',
      groupId: 'wg-m02-02',
      phaseId: 'phase-001-03-02',
      code: '2.2.2',
      name: '개인정보 비식별화',
      description: '민감정보 마스킹 처리',
      status: 'COMPLETED',
      progress: 100,
      plannedStartDate: '2025-03-20',
      plannedEndDate: '2025-04-10',
      weight: 50,
      orderNum: 2,
      estimatedHours: 20,
    },
  ],

  // Phase 2, Group 2.3: 피처 엔지니어링
  'wg-m02-03': [
    {
      id: 'wi-m02-03-01',
      groupId: 'wg-m02-03',
      phaseId: 'phase-001-03-02',
      code: '2.3.1',
      name: '피처 추출',
      description: '모델 학습용 피처 추출',
      status: 'COMPLETED',
      progress: 100,
      plannedStartDate: '2025-04-01',
      plannedEndDate: '2025-04-15',
      weight: 50,
      orderNum: 1,
      estimatedHours: 24,
    },
    {
      id: 'wi-m02-03-02',
      groupId: 'wg-m02-03',
      phaseId: 'phase-001-03-02',
      code: '2.3.2',
      name: '데이터 라벨링',
      description: '학습 데이터 라벨링',
      status: 'COMPLETED',
      progress: 100,
      plannedStartDate: '2025-04-10',
      plannedEndDate: '2025-04-30',
      weight: 50,
      orderNum: 2,
      estimatedHours: 40,
    },
  ],

  // Phase 3, Group 3.1: OCR 모델 개발
  'wg-m03-01': [
    {
      id: 'wi-m03-01-01',
      groupId: 'wg-m03-01',
      phaseId: 'phase-001-03-03',
      code: '3.1.1',
      name: 'OCR 모델 설계',
      description: '모델 아키텍처 설계',
      status: 'COMPLETED',
      progress: 100,
      plannedStartDate: '2025-05-01',
      plannedEndDate: '2025-05-15',
      weight: 30,
      orderNum: 1,
      estimatedHours: 24,
    },
    {
      id: 'wi-m03-01-02',
      groupId: 'wg-m03-01',
      phaseId: 'phase-001-03-03',
      code: '3.1.2',
      name: 'OCR 모델 학습',
      description: '모델 학습 및 튜닝',
      status: 'IN_PROGRESS',
      progress: 90,
      plannedStartDate: '2025-05-10',
      plannedEndDate: '2025-06-15',
      weight: 40,
      orderNum: 2,
      estimatedHours: 60,
    },
    {
      id: 'wi-m03-01-03',
      groupId: 'wg-m03-01',
      phaseId: 'phase-001-03-03',
      code: '3.1.3',
      name: 'OCR 성능 평가',
      description: '인식률 평가 및 개선',
      status: 'IN_PROGRESS',
      progress: 80,
      plannedStartDate: '2025-06-01',
      plannedEndDate: '2025-06-30',
      weight: 30,
      orderNum: 3,
      estimatedHours: 32,
    },
  ],

  // Phase 3, Group 3.2: 분류 모델 개발
  'wg-m03-02': [
    {
      id: 'wi-m03-02-01',
      groupId: 'wg-m03-02',
      phaseId: 'phase-001-03-03',
      code: '3.2.1',
      name: '분류 모델 설계',
      description: '청구 유형 분류 모델 설계',
      status: 'COMPLETED',
      progress: 100,
      plannedStartDate: '2025-06-01',
      plannedEndDate: '2025-06-15',
      weight: 30,
      orderNum: 1,
      estimatedHours: 20,
    },
    {
      id: 'wi-m03-02-02',
      groupId: 'wg-m03-02',
      phaseId: 'phase-001-03-03',
      code: '3.2.2',
      name: '분류 모델 학습',
      description: '모델 학습 및 최적화',
      status: 'IN_PROGRESS',
      progress: 85,
      plannedStartDate: '2025-06-10',
      plannedEndDate: '2025-07-15',
      weight: 40,
      orderNum: 2,
      estimatedHours: 48,
    },
    {
      id: 'wi-m03-02-03',
      groupId: 'wg-m03-02',
      phaseId: 'phase-001-03-03',
      code: '3.2.3',
      name: '분류 성능 평가',
      description: '정확도/재현율 평가',
      status: 'IN_PROGRESS',
      progress: 70,
      plannedStartDate: '2025-07-01',
      plannedEndDate: '2025-07-31',
      weight: 30,
      orderNum: 3,
      estimatedHours: 24,
    },
  ],

  // Phase 3, Group 3.3: 하이브리드 로직
  'wg-m03-03': [
    {
      id: 'wi-m03-03-01',
      groupId: 'wg-m03-03',
      phaseId: 'phase-001-03-03',
      code: '3.3.1',
      name: '규칙 엔진 설계',
      description: '비즈니스 규칙 엔진 설계',
      status: 'IN_PROGRESS',
      progress: 80,
      plannedStartDate: '2025-07-15',
      plannedEndDate: '2025-08-01',
      weight: 35,
      orderNum: 1,
      estimatedHours: 24,
    },
    {
      id: 'wi-m03-03-02',
      groupId: 'wg-m03-03',
      phaseId: 'phase-001-03-03',
      code: '3.3.2',
      name: 'AI-규칙 통합',
      description: 'AI와 규칙 기반 로직 통합',
      status: 'IN_PROGRESS',
      progress: 60,
      plannedStartDate: '2025-07-25',
      plannedEndDate: '2025-08-20',
      weight: 40,
      orderNum: 2,
      estimatedHours: 32,
    },
    {
      id: 'wi-m03-03-03',
      groupId: 'wg-m03-03',
      phaseId: 'phase-001-03-03',
      code: '3.3.3',
      name: '통합 테스트',
      description: '하이브리드 시스템 테스트',
      status: 'NOT_STARTED',
      progress: 0,
      plannedStartDate: '2025-08-15',
      plannedEndDate: '2025-08-31',
      weight: 25,
      orderNum: 3,
      estimatedHours: 20,
    },
  ],

  // Phase 4-6 Groups (simplified - NOT_STARTED)
  'wg-m04-01': [
    { id: 'wi-m04-01-01', groupId: 'wg-m04-01', phaseId: 'phase-001-03-04', code: '4.1.1', name: 'API 설계', description: 'REST API 명세 설계', status: 'NOT_STARTED', progress: 0, plannedStartDate: '2025-09-01', plannedEndDate: '2025-09-08', weight: 30, orderNum: 1, estimatedHours: 16 },
    { id: 'wi-m04-01-02', groupId: 'wg-m04-01', phaseId: 'phase-001-03-04', code: '4.1.2', name: 'API 구현', description: 'AI 서비스 API 구현', status: 'NOT_STARTED', progress: 0, plannedStartDate: '2025-09-05', plannedEndDate: '2025-09-20', weight: 70, orderNum: 2, estimatedHours: 40 },
  ],
  'wg-m04-02': [
    { id: 'wi-m04-02-01', groupId: 'wg-m04-02', phaseId: 'phase-001-03-04', code: '4.2.1', name: '연동 설계', description: '레거시 시스템 연동 설계', status: 'NOT_STARTED', progress: 0, plannedStartDate: '2025-09-15', plannedEndDate: '2025-09-25', weight: 35, orderNum: 1, estimatedHours: 20 },
    { id: 'wi-m04-02-02', groupId: 'wg-m04-02', phaseId: 'phase-001-03-04', code: '4.2.2', name: '연동 개발', description: '인터페이스 개발 및 테스트', status: 'NOT_STARTED', progress: 0, plannedStartDate: '2025-09-20', plannedEndDate: '2025-10-15', weight: 65, orderNum: 2, estimatedHours: 48 },
  ],
  'wg-m04-03': [
    { id: 'wi-m04-03-01', groupId: 'wg-m04-03', phaseId: 'phase-001-03-04', code: '4.3.1', name: 'CI/CD 파이프라인', description: '모델 배포 파이프라인 구축', status: 'NOT_STARTED', progress: 0, plannedStartDate: '2025-10-10', plannedEndDate: '2025-10-20', weight: 50, orderNum: 1, estimatedHours: 24 },
    { id: 'wi-m04-03-02', groupId: 'wg-m04-03', phaseId: 'phase-001-03-04', code: '4.3.2', name: '모니터링 시스템', description: '모델 성능 모니터링 구축', status: 'NOT_STARTED', progress: 0, plannedStartDate: '2025-10-18', plannedEndDate: '2025-10-31', weight: 50, orderNum: 2, estimatedHours: 24 },
  ],
  'wg-m05-01': [
    { id: 'wi-m05-01-01', groupId: 'wg-m05-01', phaseId: 'phase-001-03-05', code: '5.1.1', name: 'Pilot 운영', description: 'Pilot 환경 운영', status: 'NOT_STARTED', progress: 0, plannedStartDate: '2025-11-01', plannedEndDate: '2025-11-10', weight: 60, orderNum: 1, estimatedHours: 32 },
    { id: 'wi-m05-01-02', groupId: 'wg-m05-01', phaseId: 'phase-001-03-05', code: '5.1.2', name: '결과 분석', description: 'Pilot 결과 분석', status: 'NOT_STARTED', progress: 0, plannedStartDate: '2025-11-08', plannedEndDate: '2025-11-15', weight: 40, orderNum: 2, estimatedHours: 16 },
  ],
  'wg-m05-02': [
    { id: 'wi-m05-02-01', groupId: 'wg-m05-02', phaseId: 'phase-001-03-05', code: '5.2.1', name: 'KPI 측정', description: '성과 지표 측정', status: 'NOT_STARTED', progress: 0, plannedStartDate: '2025-11-10', plannedEndDate: '2025-11-18', weight: 50, orderNum: 1, estimatedHours: 16 },
    { id: 'wi-m05-02-02', groupId: 'wg-m05-02', phaseId: 'phase-001-03-05', code: '5.2.2', name: '비교 분석', description: 'AS-IS vs TO-BE 비교', status: 'NOT_STARTED', progress: 0, plannedStartDate: '2025-11-15', plannedEndDate: '2025-11-25', weight: 50, orderNum: 2, estimatedHours: 20 },
  ],
  'wg-m05-03': [
    { id: 'wi-m05-03-01', groupId: 'wg-m05-03', phaseId: 'phase-001-03-05', code: '5.3.1', name: '피드백 수집', description: '현업 피드백 수집', status: 'NOT_STARTED', progress: 0, plannedStartDate: '2025-11-20', plannedEndDate: '2025-11-25', weight: 50, orderNum: 1, estimatedHours: 12 },
    { id: 'wi-m05-03-02', groupId: 'wg-m05-03', phaseId: 'phase-001-03-05', code: '5.3.2', name: '개선 적용', description: '피드백 기반 개선', status: 'NOT_STARTED', progress: 0, plannedStartDate: '2025-11-23', plannedEndDate: '2025-11-30', weight: 50, orderNum: 2, estimatedHours: 16 },
  ],
  'wg-m06-01': [
    { id: 'wi-m06-01-01', groupId: 'wg-m06-01', phaseId: 'phase-001-03-06', code: '6.1.1', name: '교육 자료 개발', description: '교육 콘텐츠 개발', status: 'NOT_STARTED', progress: 0, plannedStartDate: '2025-12-01', plannedEndDate: '2025-12-08', weight: 50, orderNum: 1, estimatedHours: 20 },
    { id: 'wi-m06-01-02', groupId: 'wg-m06-01', phaseId: 'phase-001-03-06', code: '6.1.2', name: '교육 실시', description: '사용자 교육 진행', status: 'NOT_STARTED', progress: 0, plannedStartDate: '2025-12-05', plannedEndDate: '2025-12-15', weight: 50, orderNum: 2, estimatedHours: 24 },
  ],
  'wg-m06-02': [
    { id: 'wi-m06-02-01', groupId: 'wg-m06-02', phaseId: 'phase-001-03-06', code: '6.2.1', name: '운영 매뉴얼', description: '운영 매뉴얼 작성', status: 'NOT_STARTED', progress: 0, plannedStartDate: '2025-12-10', plannedEndDate: '2025-12-18', weight: 50, orderNum: 1, estimatedHours: 20 },
    { id: 'wi-m06-02-02', groupId: 'wg-m06-02', phaseId: 'phase-001-03-06', code: '6.2.2', name: '사용자 가이드', description: '사용자 가이드 작성', status: 'NOT_STARTED', progress: 0, plannedStartDate: '2025-12-15', plannedEndDate: '2025-12-25', weight: 50, orderNum: 2, estimatedHours: 16 },
  ],
  'wg-m06-03': [
    { id: 'wi-m06-03-01', groupId: 'wg-m06-03', phaseId: 'phase-001-03-06', code: '6.3.1', name: '거버넌스 정책', description: 'AI 거버넌스 정책 수립', status: 'NOT_STARTED', progress: 0, plannedStartDate: '2025-12-20', plannedEndDate: '2025-12-27', weight: 50, orderNum: 1, estimatedHours: 16 },
    { id: 'wi-m06-03-02', groupId: 'wg-m06-03', phaseId: 'phase-001-03-06', code: '6.3.2', name: '모니터링 체계', description: '지속적 모니터링 체계 구축', status: 'NOT_STARTED', progress: 0, plannedStartDate: '2025-12-25', plannedEndDate: '2025-12-31', weight: 50, orderNum: 2, estimatedHours: 16 },
  ],
};

// ============================================
// WBS Tasks by Item ID (Phase 3 only - IN_PROGRESS)
// ============================================
export const mockWbsTasks: Record<string, WbsTask[]> = {
  // Item 3.1.1: OCR 모델 설계
  'wi-m03-01-01': [
    { id: 'wt-m03-01-01-01', itemId: 'wi-m03-01-01', groupId: 'wg-m03-01', phaseId: 'phase-001-03-03', code: '3.1.1.1', name: '요구사항 분석', description: 'OCR 요구사항 분석', status: 'COMPLETED', progress: 100, weight: 30, orderNum: 1 },
    { id: 'wt-m03-01-01-02', itemId: 'wi-m03-01-01', groupId: 'wg-m03-01', phaseId: 'phase-001-03-03', code: '3.1.1.2', name: '아키텍처 설계', description: '모델 아키텍처 설계', status: 'COMPLETED', progress: 100, weight: 40, orderNum: 2 },
    { id: 'wt-m03-01-01-03', itemId: 'wi-m03-01-01', groupId: 'wg-m03-01', phaseId: 'phase-001-03-03', code: '3.1.1.3', name: '설계 검토', description: '설계 문서 검토', status: 'COMPLETED', progress: 100, weight: 30, orderNum: 3 },
  ],

  // Item 3.1.2: OCR 모델 학습
  'wi-m03-01-02': [
    { id: 'wt-m03-01-02-01', itemId: 'wi-m03-01-02', groupId: 'wg-m03-01', phaseId: 'phase-001-03-03', code: '3.1.2.1', name: '학습 환경 구축', description: 'GPU 서버 환경 구축', status: 'COMPLETED', progress: 100, weight: 20, orderNum: 1 },
    { id: 'wt-m03-01-02-02', itemId: 'wi-m03-01-02', groupId: 'wg-m03-01', phaseId: 'phase-001-03-03', code: '3.1.2.2', name: '모델 학습', description: '초기 모델 학습', status: 'IN_PROGRESS', progress: 90, weight: 50, orderNum: 2 },
    { id: 'wt-m03-01-02-03', itemId: 'wi-m03-01-02', groupId: 'wg-m03-01', phaseId: 'phase-001-03-03', code: '3.1.2.3', name: '하이퍼파라미터 튜닝', description: '최적 파라미터 탐색', status: 'IN_PROGRESS', progress: 80, weight: 30, orderNum: 3 },
  ],

  // Item 3.1.3: OCR 성능 평가
  'wi-m03-01-03': [
    { id: 'wt-m03-01-03-01', itemId: 'wi-m03-01-03', groupId: 'wg-m03-01', phaseId: 'phase-001-03-03', code: '3.1.3.1', name: '테스트 데이터 준비', description: '평가용 데이터셋 준비', status: 'COMPLETED', progress: 100, weight: 30, orderNum: 1 },
    { id: 'wt-m03-01-03-02', itemId: 'wi-m03-01-03', groupId: 'wg-m03-01', phaseId: 'phase-001-03-03', code: '3.1.3.2', name: '성능 측정', description: '인식률 측정', status: 'IN_PROGRESS', progress: 75, weight: 40, orderNum: 2 },
    { id: 'wt-m03-01-03-03', itemId: 'wi-m03-01-03', groupId: 'wg-m03-01', phaseId: 'phase-001-03-03', code: '3.1.3.3', name: '개선 방안 도출', description: '성능 개선 방안', status: 'NOT_STARTED', progress: 0, weight: 30, orderNum: 3 },
  ],

  // Item 3.2.1: 분류 모델 설계
  'wi-m03-02-01': [
    { id: 'wt-m03-02-01-01', itemId: 'wi-m03-02-01', groupId: 'wg-m03-02', phaseId: 'phase-001-03-03', code: '3.2.1.1', name: '분류 체계 정의', description: '청구 유형 분류 체계', status: 'COMPLETED', progress: 100, weight: 40, orderNum: 1 },
    { id: 'wt-m03-02-01-02', itemId: 'wi-m03-02-01', groupId: 'wg-m03-02', phaseId: 'phase-001-03-03', code: '3.2.1.2', name: '모델 아키텍처 설계', description: 'Transformer 기반 설계', status: 'COMPLETED', progress: 100, weight: 60, orderNum: 2 },
  ],

  // Item 3.2.2: 분류 모델 학습
  'wi-m03-02-02': [
    { id: 'wt-m03-02-02-01', itemId: 'wi-m03-02-02', groupId: 'wg-m03-02', phaseId: 'phase-001-03-03', code: '3.2.2.1', name: '데이터 전처리', description: '학습 데이터 전처리', status: 'COMPLETED', progress: 100, weight: 25, orderNum: 1 },
    { id: 'wt-m03-02-02-02', itemId: 'wi-m03-02-02', groupId: 'wg-m03-02', phaseId: 'phase-001-03-03', code: '3.2.2.2', name: '모델 학습', description: '분류 모델 학습', status: 'IN_PROGRESS', progress: 85, weight: 50, orderNum: 2 },
    { id: 'wt-m03-02-02-03', itemId: 'wi-m03-02-02', groupId: 'wg-m03-02', phaseId: 'phase-001-03-03', code: '3.2.2.3', name: '최적화', description: '모델 경량화 및 최적화', status: 'IN_PROGRESS', progress: 60, weight: 25, orderNum: 3 },
  ],

  // Item 3.2.3: 분류 성능 평가
  'wi-m03-02-03': [
    { id: 'wt-m03-02-03-01', itemId: 'wi-m03-02-03', groupId: 'wg-m03-02', phaseId: 'phase-001-03-03', code: '3.2.3.1', name: '정확도 평가', description: 'Accuracy/F1 score 평가', status: 'IN_PROGRESS', progress: 80, weight: 40, orderNum: 1 },
    { id: 'wt-m03-02-03-02', itemId: 'wi-m03-02-03', groupId: 'wg-m03-02', phaseId: 'phase-001-03-03', code: '3.2.3.2', name: '오분류 분석', description: '오분류 케이스 분석', status: 'IN_PROGRESS', progress: 60, weight: 35, orderNum: 2 },
    { id: 'wt-m03-02-03-03', itemId: 'wi-m03-02-03', groupId: 'wg-m03-02', phaseId: 'phase-001-03-03', code: '3.2.3.3', name: '성능 리포트', description: '평가 결과 문서화', status: 'NOT_STARTED', progress: 0, weight: 25, orderNum: 3 },
  ],

  // Item 3.3.1: 규칙 엔진 설계
  'wi-m03-03-01': [
    { id: 'wt-m03-03-01-01', itemId: 'wi-m03-03-01', groupId: 'wg-m03-03', phaseId: 'phase-001-03-03', code: '3.3.1.1', name: '비즈니스 규칙 정의', description: '심사 규칙 정의', status: 'IN_PROGRESS', progress: 90, weight: 50, orderNum: 1 },
    { id: 'wt-m03-03-01-02', itemId: 'wi-m03-03-01', groupId: 'wg-m03-03', phaseId: 'phase-001-03-03', code: '3.3.1.2', name: '규칙 엔진 구현', description: 'Drools 기반 구현', status: 'IN_PROGRESS', progress: 70, weight: 50, orderNum: 2 },
  ],

  // Item 3.3.2: AI-규칙 통합
  'wi-m03-03-02': [
    { id: 'wt-m03-03-02-01', itemId: 'wi-m03-03-02', groupId: 'wg-m03-03', phaseId: 'phase-001-03-03', code: '3.3.2.1', name: '통합 아키텍처', description: '하이브리드 아키텍처 설계', status: 'IN_PROGRESS', progress: 80, weight: 35, orderNum: 1 },
    { id: 'wt-m03-03-02-02', itemId: 'wi-m03-03-02', groupId: 'wg-m03-03', phaseId: 'phase-001-03-03', code: '3.3.2.2', name: '의사결정 로직', description: 'AI vs 규칙 선택 로직', status: 'IN_PROGRESS', progress: 50, weight: 40, orderNum: 2 },
    { id: 'wt-m03-03-02-03', itemId: 'wi-m03-03-02', groupId: 'wg-m03-03', phaseId: 'phase-001-03-03', code: '3.3.2.3', name: '결과 병합', description: '결과 통합 및 검증', status: 'NOT_STARTED', progress: 0, weight: 25, orderNum: 3 },
  ],

  // Item 3.3.3: 통합 테스트
  'wi-m03-03-03': [
    { id: 'wt-m03-03-03-01', itemId: 'wi-m03-03-03', groupId: 'wg-m03-03', phaseId: 'phase-001-03-03', code: '3.3.3.1', name: '테스트 케이스 작성', description: '통합 테스트 시나리오', status: 'NOT_STARTED', progress: 0, weight: 30, orderNum: 1 },
    { id: 'wt-m03-03-03-02', itemId: 'wi-m03-03-03', groupId: 'wg-m03-03', phaseId: 'phase-001-03-03', code: '3.3.3.2', name: '테스트 수행', description: '통합 테스트 실행', status: 'NOT_STARTED', progress: 0, weight: 40, orderNum: 2 },
    { id: 'wt-m03-03-03-03', itemId: 'wi-m03-03-03', groupId: 'wg-m03-03', phaseId: 'phase-001-03-03', code: '3.3.3.3', name: '결함 수정', description: '발견된 결함 수정', status: 'NOT_STARTED', progress: 0, weight: 30, orderNum: 3 },
  ],
};

// Helper function to get mock WBS groups by phase ID
export function getMockWbsGroups(phaseId: string): WbsGroup[] {
  return mockWbsGroups[phaseId] || [];
}

// Helper function to get mock WBS items by group ID
export function getMockWbsItems(groupId: string): WbsItem[] {
  return mockWbsItems[groupId] || [];
}

// Helper function to get mock WBS tasks by item ID
export function getMockWbsTasks(itemId: string): WbsTask[] {
  return mockWbsTasks[itemId] || [];
}
