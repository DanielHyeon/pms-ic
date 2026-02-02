import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';

// Types
interface Meeting {
  id: string;
  title: string;
  description?: string;
  meetingType: 'KICKOFF' | 'WEEKLY' | 'MONTHLY' | 'MILESTONE' | 'CLOSING' | 'TECHNICAL' | 'STAKEHOLDER' | 'OTHER';
  scheduledAt: string;
  location?: string;
  organizer?: string;
  attendees: string[];
  minutes?: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'POSTPONED';
  actualStartAt?: string;
  actualEndAt?: string;
}

interface Issue {
  id: string;
  title: string;
  description?: string;
  issueType: 'BUG' | 'RISK' | 'BLOCKER' | 'CHANGE_REQUEST' | 'QUESTION' | 'IMPROVEMENT' | 'OTHER';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'VERIFIED' | 'CLOSED' | 'REOPENED' | 'DEFERRED';
  assignee?: string;
  reporter?: string;
  reviewer?: string;
  dueDate?: string;
  resolvedAt?: string;
  resolution?: string;
  comments: { author: string; content: string; commentedAt: string }[];
  createdAt: string;
}

// Query keys
export const commonKeys = {
  all: ['common'] as const,
  meetings: () => [...commonKeys.all, 'meetings'] as const,
  meetingsList: (projectId: string) => [...commonKeys.meetings(), 'list', { projectId }] as const,
  meetingDetail: (projectId: string, meetingId: string) => [...commonKeys.meetings(), 'detail', { projectId, meetingId }] as const,
  issues: () => [...commonKeys.all, 'issues'] as const,
  issuesList: (projectId: string) => [...commonKeys.issues(), 'list', { projectId }] as const,
  issueDetail: (projectId: string, issueId: string) => [...commonKeys.issues(), 'detail', { projectId, issueId }] as const,
};

// Initial mock data for fallback
const initialMeetings: Meeting[] = [
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

const initialIssues: Issue[] = [
  {
    id: '1',
    title: 'OCR 인식률 목표치 미달',
    description: '현재 OCR 인식률 93.5%로 목표치 95% 대비 1.5%p 부족',
    issueType: 'RISK',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    assignee: 'AI팀장',
    reporter: 'PM',
    resolution: '추가 학습 데이터 확보 및 모델 튜닝 진행 중',
    comments: [],
    createdAt: '2025-08-10',
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
    comments: [],
    createdAt: '2025-08-15',
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
    resolution: '비식별화 검증 완료, 승인됨',
    resolvedAt: '2025-08-01',
    comments: [],
    createdAt: '2025-07-20',
  },
];

// ========== Meeting Hooks ==========

export function useMeetings(projectId?: string) {
  return useQuery<Meeting[]>({
    queryKey: commonKeys.meetingsList(projectId!),
    queryFn: async () => {
      try {
        const data = await apiService.getMeetings(projectId!);
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
        return initialMeetings;
      } catch {
        return initialMeetings;
      }
    },
    enabled: !!projectId,
  });
}

export function useCreateMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: Partial<Meeting> }) =>
      apiService.createMeeting(projectId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: commonKeys.meetingsList(projectId) });
    },
  });
}

export function useUpdateMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      meetingId,
      data,
    }: {
      projectId: string;
      meetingId: string;
      data: Partial<Meeting>;
    }) => apiService.updateMeeting(projectId, meetingId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: commonKeys.meetingsList(projectId) });
    },
  });
}

export function useDeleteMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, meetingId }: { projectId: string; meetingId: string }) =>
      apiService.deleteMeeting(projectId, meetingId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: commonKeys.meetingsList(projectId) });
    },
  });
}

// ========== Issue Hooks ==========

export function useIssues(projectId?: string) {
  return useQuery<Issue[]>({
    queryKey: commonKeys.issuesList(projectId!),
    queryFn: async () => {
      try {
        const data = await apiService.getIssues(projectId!);
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
        return initialIssues;
      } catch {
        return initialIssues;
      }
    },
    enabled: !!projectId,
  });
}

export function useCreateIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: Partial<Issue> }) =>
      apiService.createIssue(projectId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: commonKeys.issuesList(projectId) });
    },
  });
}

export function useUpdateIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      issueId,
      data,
    }: {
      projectId: string;
      issueId: string;
      data: Partial<Issue>;
    }) => apiService.updateIssue(projectId, issueId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: commonKeys.issuesList(projectId) });
    },
  });
}

export function useDeleteIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, issueId }: { projectId: string; issueId: string }) =>
      apiService.deleteIssue(projectId, issueId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: commonKeys.issuesList(projectId) });
    },
  });
}

export function useUpdateIssueStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      issueId,
      status,
    }: {
      projectId: string;
      issueId: string;
      status: Issue['status'];
    }) => apiService.updateIssueStatus(projectId, issueId, status),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: commonKeys.issuesList(projectId) });
    },
  });
}
