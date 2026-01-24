// Common Management Utility Functions

import type { Meeting, Issue } from './types';

export const getMeetingTypeLabel = (type: Meeting['meetingType']) => {
  const labels: Record<Meeting['meetingType'], string> = {
    KICKOFF: '착수 보고',
    WEEKLY: '주간 보고',
    MONTHLY: '월간 보고',
    MILESTONE: '마일스톤',
    CLOSING: '종료 보고',
    TECHNICAL: '기술 회의',
    STAKEHOLDER: '이해관계자',
    OTHER: '기타',
  };
  return labels[type] || type;
};

export const getIssueTypeLabel = (type: Issue['issueType']) => {
  const labels: Record<Issue['issueType'], string> = {
    BUG: '버그',
    RISK: '위험',
    BLOCKER: '장애',
    CHANGE_REQUEST: '변경 요청',
    QUESTION: '문의',
    IMPROVEMENT: '개선',
    OTHER: '기타',
  };
  return labels[type] || type;
};

export const getPriorityLabel = (priority: Issue['priority']) => {
  const labels: Record<Issue['priority'], string> = {
    CRITICAL: '긴급',
    HIGH: '높음',
    MEDIUM: '중간',
    LOW: '낮음',
  };
  return labels[priority] || priority;
};

export const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    // Meeting statuses
    SCHEDULED: 'bg-blue-100 text-blue-800',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-gray-100 text-gray-800',
    POSTPONED: 'bg-orange-100 text-orange-800',
    // Issue statuses
    OPEN: 'bg-red-100 text-red-800',
    RESOLVED: 'bg-green-100 text-green-800',
    VERIFIED: 'bg-emerald-100 text-emerald-800',
    CLOSED: 'bg-gray-100 text-gray-800',
    REOPENED: 'bg-purple-100 text-purple-800',
    DEFERRED: 'bg-slate-100 text-slate-800',
    // Deliverable statuses
    PENDING: 'bg-gray-100 text-gray-800',
    IN_REVIEW: 'bg-blue-100 text-blue-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

export const getPriorityColor = (priority: Issue['priority']) => {
  const colors: Record<Issue['priority'], string> = {
    CRITICAL: 'bg-red-100 text-red-800 border-red-300',
    HIGH: 'bg-orange-100 text-orange-800 border-orange-300',
    MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    LOW: 'bg-green-100 text-green-800 border-green-300',
  };
  return colors[priority] || 'bg-gray-100 text-gray-800';
};

export const formatDateTime = (dateString?: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatDate = (dateString?: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR');
};

// Initial mock data for fallback
export const initialMeetings: Meeting[] = [
  {
    id: '1',
    title: '프로젝트 킥오프 미팅',
    description: 'AI 자동심사 시스템 프로젝트 착수 회의',
    meetingType: 'KICKOFF',
    scheduledAt: '2025-01-15T10:00:00',
    location: '본사 대회의실',
    organizer: 'PMO 총괄',
    attendees: ['프로젝트 스폰서', 'PMO 총괄', 'PM', '개발팀장', 'QA팀장'],
    status: 'COMPLETED',
    minutes: '프로젝트 목표 및 일정 확정, 역할 분담 완료',
  },
  {
    id: '2',
    title: '주간 진행 점검 회의',
    description: '8월 3주차 진행 현황 점검',
    meetingType: 'WEEKLY',
    scheduledAt: '2025-08-18T14:00:00',
    location: '온라인 (Zoom)',
    organizer: 'PM',
    attendees: ['PM', '개발팀', 'QA팀'],
    status: 'SCHEDULED',
  },
  {
    id: '3',
    title: 'AI 모델 성능 리뷰',
    description: 'OCR 모델 v2.0 성능 평가 및 개선 방안 논의',
    meetingType: 'TECHNICAL',
    scheduledAt: '2025-08-20T15:00:00',
    location: '개발팀 회의실',
    organizer: 'AI팀장',
    attendees: ['AI팀장', 'ML 엔지니어', '데이터 사이언티스트'],
    status: 'SCHEDULED',
  },
];

export const initialIssues: Issue[] = [
  {
    id: '1',
    title: 'OCR 인식률 목표치 미달',
    description: '현재 OCR 인식률 93.5%로 목표치 95% 대비 1.5%p 부족',
    issueType: 'RISK',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    assignee: 'AI팀장',
    reporter: 'PM',
    createdAt: '2025-08-10',
    resolution: '추가 학습 데이터 확보 및 모델 튜닝 진행 중',
    comments: [],
  },
  {
    id: '2',
    title: '레거시 시스템 연동 지연',
    description: '기존 보험금 지급 시스템과의 API 연동 일정 지연 예상',
    issueType: 'BLOCKER',
    priority: 'CRITICAL',
    status: 'OPEN',
    assignee: 'SI팀장',
    reporter: 'PM',
    createdAt: '2025-08-15',
    comments: [],
  },
  {
    id: '3',
    title: '개인정보 비식별화 검증 필요',
    description: '학습 데이터 비식별화 처리 결과에 대한 정보보호팀 검증 요청',
    issueType: 'CHANGE_REQUEST',
    priority: 'MEDIUM',
    status: 'RESOLVED',
    assignee: '정보보호팀장',
    reporter: 'PM',
    createdAt: '2025-07-20',
    resolution: '비식별화 검증 완료, 승인됨',
    resolvedAt: '2025-08-01',
    comments: [],
  },
];

export const initialDeliverables = [
  {
    id: '1',
    name: 'AS-IS 프로세스 분석 보고서',
    description: '현행 보험금 청구 심사 프로세스 분석',
    type: 'DOCUMENT' as const,
    status: 'APPROVED' as const,
    version: '1.0',
    uploadedAt: '2025-02-10',
    approvedBy: 'PMO 총괄',
  },
  {
    id: '2',
    name: 'AI 모델 설계서',
    description: 'OCR 및 분류 모델 아키텍처 설계 문서',
    type: 'DOCUMENT' as const,
    status: 'IN_REVIEW' as const,
    version: '0.9',
    uploadedAt: '2025-08-12',
  },
  {
    id: '3',
    name: 'API 명세서 초안',
    description: '시스템 연동을 위한 REST API 명세',
    type: 'DOCUMENT' as const,
    status: 'PENDING' as const,
    version: '0.1',
    uploadedAt: '2025-08-14',
  },
];
