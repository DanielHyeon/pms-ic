// Dashboard Mock Data

// ============================================
// Phase Mock Data (from V20260222__phase_hierarchy.sql)
// ============================================
export interface MockPhase {
  id: string;
  projectId: string;
  parentId: string | null;
  name: string;
  orderNum: number;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED';
  gateStatus: 'APPROVED' | 'PENDING' | null;
  startDate: string;
  endDate: string;
  progress: number;
  description: string;
  trackType: string;
}

export const mockPhases: MockPhase[] = [
  // Main Phases for proj-001
  {
    id: 'phase-001-01',
    projectId: 'proj-001',
    parentId: null,
    name: '요구사항 분석',
    orderNum: 1,
    status: 'COMPLETED',
    gateStatus: 'APPROVED',
    startDate: '2026-01-15',
    endDate: '2026-01-31',
    progress: 100,
    description: 'Requirements analysis and stakeholder interviews',
    trackType: 'COMMON',
  },
  {
    id: 'phase-001-02',
    projectId: 'proj-001',
    parentId: null,
    name: '시스템 설계',
    orderNum: 2,
    status: 'IN_PROGRESS',
    gateStatus: 'PENDING',
    startDate: '2026-02-01',
    endDate: '2026-02-28',
    progress: 60,
    description: 'System architecture and detailed design',
    trackType: 'COMMON',
  },
  {
    id: 'phase-001-03',
    projectId: 'proj-001',
    parentId: null,
    name: 'AI 모델 개발',
    orderNum: 3,
    status: 'IN_PROGRESS',
    gateStatus: 'PENDING',
    startDate: '2025-01-02',
    endDate: '2025-12-31',
    progress: 85,
    description: 'AI/ML model development for insurance claims',
    trackType: 'AI',
  },
  {
    id: 'phase-001-04',
    projectId: 'proj-001',
    parentId: null,
    name: '백엔드 개발',
    orderNum: 4,
    status: 'NOT_STARTED',
    gateStatus: null,
    startDate: '2026-03-15',
    endDate: '2026-05-15',
    progress: 0,
    description: 'Backend API and system integration',
    trackType: 'SI',
  },
  {
    id: 'phase-001-05',
    projectId: 'proj-001',
    parentId: null,
    name: '통합 및 테스트',
    orderNum: 5,
    status: 'NOT_STARTED',
    gateStatus: null,
    startDate: '2026-05-01',
    endDate: '2026-06-15',
    progress: 0,
    description: 'Integration testing and quality assurance',
    trackType: 'COMMON',
  },
  {
    id: 'phase-001-06',
    projectId: 'proj-001',
    parentId: null,
    name: '배포',
    orderNum: 6,
    status: 'NOT_STARTED',
    gateStatus: null,
    startDate: '2026-06-15',
    endDate: '2026-06-30',
    progress: 0,
    description: 'Production deployment and handover',
    trackType: 'COMMON',
  },
  // Child phases under "AI 모델 개발" (phase-001-03)
  {
    id: 'phase-001-03-01',
    projectId: 'proj-001',
    parentId: 'phase-001-03',
    name: '1단계: 업무 현황 진단/분석',
    orderNum: 1,
    status: 'COMPLETED',
    gateStatus: 'APPROVED',
    startDate: '2025-01-02',
    endDate: '2025-02-15',
    progress: 100,
    description: '지급심사 프로세스 현황 파악 및 AI 적용 타당성 검토',
    trackType: 'AI',
  },
  {
    id: 'phase-001-03-02',
    projectId: 'proj-001',
    parentId: 'phase-001-03',
    name: '2단계: 데이터 수집/정제',
    orderNum: 2,
    status: 'COMPLETED',
    gateStatus: 'APPROVED',
    startDate: '2025-02-16',
    endDate: '2025-04-30',
    progress: 100,
    description: '데이터 수집, 정제, 라벨링 및 피처 엔지니어링',
    trackType: 'AI',
  },
  {
    id: 'phase-001-03-03',
    projectId: 'proj-001',
    parentId: 'phase-001-03',
    name: '3단계: AI모델 설계/학습',
    orderNum: 3,
    status: 'IN_PROGRESS',
    gateStatus: 'PENDING',
    startDate: '2025-05-01',
    endDate: '2025-08-31',
    progress: 85,
    description: 'AI 모델 설계, 학습, 평가 및 하이브리드 로직 구축',
    trackType: 'AI',
  },
  {
    id: 'phase-001-03-04',
    projectId: 'proj-001',
    parentId: 'phase-001-03',
    name: '4단계: 업무시스템 연동/운영 자동화',
    orderNum: 4,
    status: 'NOT_STARTED',
    gateStatus: null,
    startDate: '2025-09-01',
    endDate: '2025-10-31',
    progress: 0,
    description: '기존 업무시스템과 AI 통합 및 MLOps 구축',
    trackType: 'AI',
  },
  {
    id: 'phase-001-03-05',
    projectId: 'proj-001',
    parentId: 'phase-001-03',
    name: '5단계: 효과 검증/운영고도화',
    orderNum: 5,
    status: 'NOT_STARTED',
    gateStatus: null,
    startDate: '2025-11-01',
    endDate: '2025-11-30',
    progress: 0,
    description: 'PoC 검증, 성능 평가 및 지속적 개선',
    trackType: 'AI',
  },
  {
    id: 'phase-001-03-06',
    projectId: 'proj-001',
    parentId: 'phase-001-03',
    name: '6단계: 조직/프로세스 변화관리',
    orderNum: 6,
    status: 'NOT_STARTED',
    gateStatus: null,
    startDate: '2025-12-01',
    endDate: '2025-12-31',
    progress: 0,
    description: '교육, 가이드라인, AI 거버넌스 체계 구축',
    trackType: 'AI',
  },
  // Project 2 Phases
  {
    id: 'phase-002-01',
    projectId: 'proj-002',
    parentId: null,
    name: '시장 조사',
    orderNum: 1,
    status: 'IN_PROGRESS',
    gateStatus: 'PENDING',
    startDate: '2026-02-01',
    endDate: '2026-02-28',
    progress: 40,
    description: 'Market research and user interviews',
    trackType: 'COMMON',
  },
  {
    id: 'phase-002-02',
    projectId: 'proj-002',
    parentId: null,
    name: 'UX/UI 디자인',
    orderNum: 2,
    status: 'NOT_STARTED',
    gateStatus: null,
    startDate: '2026-03-01',
    endDate: '2026-03-31',
    progress: 0,
    description: 'User experience and interface design',
    trackType: 'COMMON',
  },
  {
    id: 'phase-002-03',
    projectId: 'proj-002',
    parentId: null,
    name: '모바일 앱 개발',
    orderNum: 3,
    status: 'NOT_STARTED',
    gateStatus: null,
    startDate: '2026-04-01',
    endDate: '2026-06-15',
    progress: 0,
    description: 'iOS and Android native app development',
    trackType: 'SI',
  },
  {
    id: 'phase-002-04',
    projectId: 'proj-002',
    parentId: null,
    name: '백엔드 API',
    orderNum: 4,
    status: 'NOT_STARTED',
    gateStatus: null,
    startDate: '2026-04-01',
    endDate: '2026-06-30',
    progress: 0,
    description: 'Mobile-specific backend API development',
    trackType: 'SI',
  },
];

// Helper function to get phases by project ID
export function getMockPhases(projectId?: string): MockPhase[] {
  if (!projectId) return mockPhases;
  return mockPhases.filter((p) => p.projectId === projectId);
}

// Helper function to get child phases by parent ID
export function getMockChildPhases(parentId: string): MockPhase[] {
  return mockPhases.filter((p) => p.parentId === parentId);
}

// Helper function to get phase by ID
export function getMockPhaseById(phaseId: string): MockPhase | undefined {
  return mockPhases.find((p) => p.id === phaseId);
}

// ============================================
// Sprint Mock Data (from V20260131__comprehensive_mock_data.sql)
// ============================================
export interface MockSprint {
  id: string;
  projectId: string;
  name: string;
  goal: string;
  status: 'ACTIVE' | 'COMPLETED' | 'PLANNED';
  startDate: string;
  endDate: string;
  enableWipValidation: boolean;
  conwipLimit: number;
}

export const mockSprints: MockSprint[] = [
  // Project 1 Sprints
  {
    id: 'sprint-001-01',
    projectId: 'proj-001',
    name: '스프린트 1 - 기획',
    goal: '요구사항 분석 및 설계 완료',
    status: 'COMPLETED',
    startDate: '2026-01-15',
    endDate: '2026-01-28',
    enableWipValidation: true,
    conwipLimit: 15,
  },
  {
    id: 'sprint-001-02',
    projectId: 'proj-001',
    name: '스프린트 2 - 설계',
    goal: '아키텍처 및 데이터 모델 설계',
    status: 'COMPLETED',
    startDate: '2026-01-29',
    endDate: '2026-02-11',
    enableWipValidation: true,
    conwipLimit: 15,
  },
  {
    id: 'sprint-001-03',
    projectId: 'proj-001',
    name: '스프린트 3 - API 설계',
    goal: 'RESTful API 명세 및 보안 설계',
    status: 'ACTIVE',
    startDate: '2026-02-12',
    endDate: '2026-02-25',
    enableWipValidation: true,
    conwipLimit: 15,
  },
  {
    id: 'sprint-001-04',
    projectId: 'proj-001',
    name: '스프린트 4 - AI 모델 기초',
    goal: 'OCR 데이터 수집 및 기초 모델 개발',
    status: 'PLANNED',
    startDate: '2026-03-01',
    endDate: '2026-03-14',
    enableWipValidation: true,
    conwipLimit: 15,
  },
  {
    id: 'sprint-001-05',
    projectId: 'proj-001',
    name: '스프린트 5 - AI 모델 훈련',
    goal: 'OCR/사기탐지 모델 훈련 및 검증',
    status: 'PLANNED',
    startDate: '2026-03-15',
    endDate: '2026-03-28',
    enableWipValidation: true,
    conwipLimit: 15,
  },
  // Project 2 Sprints
  {
    id: 'sprint-002-01',
    projectId: 'proj-002',
    name: '스프린트 1 - 시장 조사',
    goal: '시장 분석 및 사용자 리서치',
    status: 'ACTIVE',
    startDate: '2026-02-01',
    endDate: '2026-02-14',
    enableWipValidation: true,
    conwipLimit: 12,
  },
  {
    id: 'sprint-002-02',
    projectId: 'proj-002',
    name: '스프린트 2 - UX 설계',
    goal: 'UX 리서치 완료 및 와이어프레임',
    status: 'PLANNED',
    startDate: '2026-02-15',
    endDate: '2026-02-28',
    enableWipValidation: true,
    conwipLimit: 12,
  },
  {
    id: 'sprint-002-03',
    projectId: 'proj-002',
    name: '스프린트 3 - UI 디자인',
    goal: 'UI 디자인 및 프로토타입',
    status: 'PLANNED',
    startDate: '2026-03-01',
    endDate: '2026-03-14',
    enableWipValidation: true,
    conwipLimit: 12,
  },
];

// Helper function to get sprints by project ID
export function getMockSprints(projectId?: string): MockSprint[] {
  if (!projectId) return mockSprints;
  return mockSprints.filter((s) => s.projectId === projectId);
}

// Helper function to get sprint by ID
export function getMockSprintById(sprintId: string): MockSprint | undefined {
  return mockSprints.find((s) => s.id === sprintId);
}

// ============================================
// Part Mock Data
// ============================================
export interface MockPart {
  id: string;
  projectId: string;
  name: string;
  description: string;
  leaderId: string;
  leaderName: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ON_HOLD';
  startDate: string;
  endDate: string;
  progress: number;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MockPartMember {
  id: string;
  partId: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: 'leader' | 'member';
  joinedAt: string;
}

export const mockParts: MockPart[] = [
  // Project 1 Parts
  {
    id: 'part-001-ai',
    projectId: 'proj-001',
    name: 'AI 개발 파트',
    description: 'AI/ML 모델 개발 및 OCR, 사기탐지 시스템 구현',
    leaderId: 'user-dev-002',
    leaderName: '박민수',
    status: 'ACTIVE',
    startDate: '2026-01-15',
    endDate: '2026-06-30',
    progress: 45,
    memberCount: 4,
    createdAt: '2026-01-15T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
  },
  {
    id: 'part-001-si',
    projectId: 'proj-001',
    name: 'SI 개발 파트',
    description: '백엔드 API 및 레거시 시스템 연동 개발',
    leaderId: 'user-dev-001',
    leaderName: '김철수',
    status: 'ACTIVE',
    startDate: '2026-02-01',
    endDate: '2026-06-30',
    progress: 67,
    memberCount: 3,
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
  },
  {
    id: 'part-001-common',
    projectId: 'proj-001',
    name: '공통 파트',
    description: '보안, 인프라, 테스트 자동화 및 품질 관리',
    leaderId: 'user-dev-003',
    leaderName: '한지영',
    status: 'ACTIVE',
    startDate: '2026-01-15',
    endDate: '2026-06-30',
    progress: 35,
    memberCount: 3,
    createdAt: '2026-01-15T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
  },
  {
    id: 'part-001-qa',
    projectId: 'proj-001',
    name: 'QA 파트',
    description: '테스트 계획, 테스트 케이스 설계 및 품질 보증',
    leaderId: 'user-qa-001',
    leaderName: '최지훈',
    status: 'ACTIVE',
    startDate: '2026-02-15',
    endDate: '2026-06-30',
    progress: 20,
    memberCount: 2,
    createdAt: '2026-02-15T00:00:00Z',
    updatedAt: '2026-02-15T00:00:00Z',
  },
  // Project 2 Parts
  {
    id: 'part-002-ux',
    projectId: 'proj-002',
    name: 'UX/UI 파트',
    description: '모바일 앱 UX 설계 및 UI 디자인',
    leaderId: 'user-ba-001',
    leaderName: '이영희',
    status: 'ACTIVE',
    startDate: '2026-02-01',
    endDate: '2026-04-30',
    progress: 25,
    memberCount: 2,
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
  },
  {
    id: 'part-002-mobile',
    projectId: 'proj-002',
    name: '모바일 개발 파트',
    description: 'iOS/Android 네이티브 앱 개발',
    leaderId: 'user-dev-001',
    leaderName: '김철수',
    status: 'ACTIVE',
    startDate: '2026-03-01',
    endDate: '2026-06-30',
    progress: 0,
    memberCount: 3,
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
  },
];

export const mockPartMembers: MockPartMember[] = [
  // AI Part Members (part-001-ai)
  { id: 'pm-001', partId: 'part-001-ai', userId: 'user-dev-002', userName: '박민수', userEmail: 'dev@insure.com', role: 'leader', joinedAt: '2026-01-15T00:00:00Z' },
  { id: 'pm-002', partId: 'part-001-ai', userId: 'user-ba-001', userName: '이영희', userEmail: 'ba@insure.com', role: 'member', joinedAt: '2026-01-15T00:00:00Z' },
  { id: 'pm-003', partId: 'part-001-ai', userId: 'user-dev-004', userName: '정수민', userEmail: 'dev2@insure.com', role: 'member', joinedAt: '2026-01-20T00:00:00Z' },
  { id: 'pm-004', partId: 'part-001-ai', userId: 'user-dev-005', userName: '오민석', userEmail: 'dev3@insure.com', role: 'member', joinedAt: '2026-01-20T00:00:00Z' },

  // SI Part Members (part-001-si)
  { id: 'pm-005', partId: 'part-001-si', userId: 'user-dev-001', userName: '김철수', userEmail: 'dev1@insure.com', role: 'leader', joinedAt: '2026-02-01T00:00:00Z' },
  { id: 'pm-006', partId: 'part-001-si', userId: 'user-dev-006', userName: '강민호', userEmail: 'dev4@insure.com', role: 'member', joinedAt: '2026-02-01T00:00:00Z' },
  { id: 'pm-007', partId: 'part-001-si', userId: 'user-dev-007', userName: '윤서연', userEmail: 'dev5@insure.com', role: 'member', joinedAt: '2026-02-05T00:00:00Z' },

  // Common Part Members (part-001-common)
  { id: 'pm-008', partId: 'part-001-common', userId: 'user-dev-003', userName: '한지영', userEmail: 'dev6@insure.com', role: 'leader', joinedAt: '2026-01-15T00:00:00Z' },
  { id: 'pm-009', partId: 'part-001-common', userId: 'user-dev-008', userName: '임재현', userEmail: 'dev7@insure.com', role: 'member', joinedAt: '2026-01-15T00:00:00Z' },
  { id: 'pm-010', partId: 'part-001-common', userId: 'user-dev-009', userName: '송유나', userEmail: 'dev8@insure.com', role: 'member', joinedAt: '2026-01-20T00:00:00Z' },

  // QA Part Members (part-001-qa)
  { id: 'pm-011', partId: 'part-001-qa', userId: 'user-qa-001', userName: '최지훈', userEmail: 'qa@insure.com', role: 'leader', joinedAt: '2026-02-15T00:00:00Z' },
  { id: 'pm-012', partId: 'part-001-qa', userId: 'user-qa-002', userName: '배지원', userEmail: 'qa2@insure.com', role: 'member', joinedAt: '2026-02-15T00:00:00Z' },

  // UX Part Members (part-002-ux)
  { id: 'pm-013', partId: 'part-002-ux', userId: 'user-ba-001', userName: '이영희', userEmail: 'ba@insure.com', role: 'leader', joinedAt: '2026-02-01T00:00:00Z' },
  { id: 'pm-014', partId: 'part-002-ux', userId: 'user-ux-001', userName: '김다은', userEmail: 'ux@insure.com', role: 'member', joinedAt: '2026-02-01T00:00:00Z' },

  // Mobile Part Members (part-002-mobile)
  { id: 'pm-015', partId: 'part-002-mobile', userId: 'user-dev-001', userName: '김철수', userEmail: 'dev1@insure.com', role: 'leader', joinedAt: '2026-03-01T00:00:00Z' },
  { id: 'pm-016', partId: 'part-002-mobile', userId: 'user-ios-001', userName: '홍길동', userEmail: 'ios@insure.com', role: 'member', joinedAt: '2026-03-01T00:00:00Z' },
  { id: 'pm-017', partId: 'part-002-mobile', userId: 'user-android-001', userName: '이순신', userEmail: 'android@insure.com', role: 'member', joinedAt: '2026-03-01T00:00:00Z' },
];

// Helper function to get parts by project ID
export function getMockParts(projectId: string): MockPart[] {
  return mockParts.filter((p) => p.projectId === projectId);
}

// Helper function to get part by ID
export function getMockPartById(partId: string): MockPart | undefined {
  return mockParts.find((p) => p.id === partId);
}

// Helper function to get part members by part ID
export function getMockPartMembers(partId: string): MockPartMember[] {
  return mockPartMembers.filter((m) => m.partId === partId);
}

// ============================================
// Dashboard Chart Data
// ============================================
export const trackProgressData = {
  ai: { progress: 58, status: 'normal', tasks: 45, completed: 26 },
  si: { progress: 72, status: 'normal', tasks: 38, completed: 27 },
  common: { progress: 45, status: 'warning', tasks: 22, completed: 10 },
};

export const subProjectData = [
  { name: 'OCR 모델 개발', track: 'AI', progress: 65, status: 'normal', leader: '박민수' },
  { name: '문서 분류 AI', track: 'AI', progress: 48, status: 'warning', leader: '이영희' },
  { name: '청구 심사 자동화', track: 'AI', progress: 72, status: 'normal', leader: '최지훈' },
  { name: '레거시 시스템 연동', track: 'SI', progress: 80, status: 'normal', leader: '김철수' },
  { name: '데이터 마이그레이션', track: 'SI', progress: 55, status: 'warning', leader: '정수민' },
  { name: '보안 인증 모듈', track: '공통', progress: 35, status: 'danger', leader: '한지영' },
  { name: '통합 테스트 환경', track: '공통', progress: 60, status: 'normal', leader: '오민석' },
];

export const partLeaderData = [
  { name: '박민수', role: 'AI 파트 리더', tasks: 15, completed: 10, inProgress: 4, blocked: 1, status: 'normal' },
  { name: '김철수', role: 'SI 파트 리더', tasks: 12, completed: 9, inProgress: 3, blocked: 0, status: 'normal' },
  { name: '한지영', role: '공통 파트 리더', tasks: 8, completed: 3, inProgress: 3, blocked: 2, status: 'danger' },
  { name: '이영희', role: 'AI 개발자', tasks: 10, completed: 5, inProgress: 4, blocked: 1, status: 'warning' },
  { name: '정수민', role: 'SI 개발자', tasks: 11, completed: 6, inProgress: 5, blocked: 0, status: 'normal' },
];

export const phaseData = [
  { phase: '1단계', planned: 100, actual: 100, status: 'completed' },
  { phase: '2단계', planned: 100, actual: 100, status: 'completed' },
  { phase: '3단계', planned: 100, actual: 85, status: 'inProgress' },
  { phase: '4단계', planned: 100, actual: 0, status: 'pending' },
  { phase: '5단계', planned: 100, actual: 0, status: 'pending' },
  { phase: '6단계', planned: 100, actual: 0, status: 'pending' },
];

export const sprintVelocity = [
  { sprint: 'Sprint 1', velocity: 32, planned: 35 },
  { sprint: 'Sprint 2', velocity: 38, planned: 35 },
  { sprint: 'Sprint 3', velocity: 35, planned: 35 },
  { sprint: 'Sprint 4', velocity: 42, planned: 40 },
  { sprint: 'Sprint 5', velocity: 40, planned: 40 },
];

export const burndownData = [
  { day: 'Day 1', remaining: 120, ideal: 120 },
  { day: 'Day 2', remaining: 110, ideal: 105 },
  { day: 'Day 3', remaining: 95, ideal: 90 },
  { day: 'Day 4', remaining: 85, ideal: 75 },
  { day: 'Day 5', remaining: 70, ideal: 60 },
  { day: 'Day 6', remaining: 55, ideal: 45 },
  { day: 'Day 7', remaining: 42, ideal: 30 },
  { day: 'Day 8', remaining: 28, ideal: 15 },
  { day: 'Day 9', remaining: 15, ideal: 0 },
  { day: 'Day 10', remaining: 8, ideal: 0 },
];
