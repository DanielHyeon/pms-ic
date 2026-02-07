import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { unwrapOrThrow } from '../../utils/toViewState';

// Types
interface Education {
  id: string;
  title: string;
  description?: string;
  educationType: 'IT_BASIC' | 'IT_INTERMEDIATE' | 'IT_ADVANCED' | 'BUSINESS_AI_AWARENESS' | 'BUSINESS_CASE_STUDY' | 'POST_DEPLOYMENT';
  category: 'AGENT_AI' | 'MACHINE_LEARNING' | 'DEEP_LEARNING' | 'PYTHON' | 'BUSINESS_PLANNING' | 'BUSINESS_OPERATION' | 'AGENT_ROLE_EXPLANATION';
  targetRole: 'ALL' | 'PM' | 'DEVELOPER' | 'QA' | 'BUSINESS_ANALYST' | 'DATA_SCIENTIST';
  durationHours?: number;
  prerequisites?: string;
  learningObjectives?: string;
  instructor?: string;
  materials?: string;
  isActive?: boolean;
  createdAt?: string;
}

interface EducationSession {
  id: string;
  educationId: string;
  educationTitle?: string;
  sessionName?: string;
  scheduledAt: string;
  endAt?: string;
  location?: string;
  instructor?: string;
  maxParticipants?: number;
  currentParticipants?: number;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
}

interface EducationRoadmap {
  id: string;
  educationId: string;
  educationTitle?: string;
  targetRole: string;
  level: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED';
  orderNum: number;
  isRequired?: boolean;
  description?: string;
}

// Query keys
export const educationKeys = {
  all: ['educations'] as const,
  lists: () => [...educationKeys.all, 'list'] as const,
  list: () => [...educationKeys.lists()] as const,
  details: () => [...educationKeys.all, 'detail'] as const,
  detail: (id: string) => [...educationKeys.details(), id] as const,
  sessions: (educationId: string) => [...educationKeys.detail(educationId), 'sessions'] as const,
  roadmaps: () => [...educationKeys.all, 'roadmaps'] as const,
};

// ========== Education Hooks ==========

export function useEducations() {
  return useQuery<Education[]>({
    queryKey: educationKeys.list(),
    queryFn: async () => {
      const result = await apiService.getEducationsResult();
      return unwrapOrThrow(result);
    },
  });
}

export function useEducationRoadmaps() {
  return useQuery<EducationRoadmap[]>({
    queryKey: educationKeys.roadmaps(),
    queryFn: async () => {
      const result = await apiService.getEducationRoadmapsResult();
      return unwrapOrThrow(result);
    },
  });
}

export function useEducationSessions(educationId?: string) {
  return useQuery<EducationSession[]>({
    queryKey: educationKeys.sessions(educationId!),
    queryFn: async () => {
      const result = await apiService.getEducationSessionsResult(educationId!);
      return unwrapOrThrow(result);
    },
    enabled: !!educationId,
  });
}

export function useCreateEducation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<Education>) => apiService.createEducation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: educationKeys.lists() });
    },
  });
}

export function useUpdateEducation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Education> }) =>
      apiService.updateEducation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: educationKeys.lists() });
    },
  });
}

export function useDeleteEducation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiService.deleteEducation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: educationKeys.lists() });
    },
  });
}

// ========== Session Hooks ==========

export function useCreateEducationSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      educationId,
      data,
    }: {
      educationId: string;
      data: Partial<EducationSession>;
    }) => apiService.createEducationSession(educationId, data),
    onSuccess: (_, { educationId }) => {
      queryClient.invalidateQueries({ queryKey: educationKeys.sessions(educationId) });
    },
  });
}

export function useUpdateEducationSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      educationId,
      sessionId,
      data,
    }: {
      educationId: string;
      sessionId: string;
      data: Partial<EducationSession>;
    }) => apiService.updateEducationSession(educationId, sessionId, data),
    onSuccess: (_, { educationId }) => {
      queryClient.invalidateQueries({ queryKey: educationKeys.sessions(educationId) });
    },
  });
}

export function useDeleteEducationSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ educationId, sessionId }: { educationId: string; sessionId: string }) =>
      apiService.deleteEducationSession(educationId, sessionId),
    onSuccess: (_, { educationId }) => {
      queryClient.invalidateQueries({ queryKey: educationKeys.sessions(educationId) });
    },
  });
}
