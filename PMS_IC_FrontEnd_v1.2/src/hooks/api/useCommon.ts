import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { unwrapOrThrow } from '../../utils/toViewState';

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

// ========== Meeting Hooks ==========

export function useMeetings(projectId?: string) {
  return useQuery<Meeting[]>({
    queryKey: commonKeys.meetingsList(projectId!),
    queryFn: async () => {
      const result = await apiService.getMeetingsResult(projectId!);
      return unwrapOrThrow(result);
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
      const result = await apiService.getIssuesResult(projectId!);
      return unwrapOrThrow(result);
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
