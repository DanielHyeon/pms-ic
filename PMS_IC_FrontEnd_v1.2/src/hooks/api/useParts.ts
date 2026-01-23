import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { Part, PartMember, CreatePartDto } from '../../types/part';

export const partKeys = {
  all: ['parts'] as const,
  lists: () => [...partKeys.all, 'list'] as const,
  list: (projectId?: string) => [...partKeys.lists(), { projectId }] as const,
  details: () => [...partKeys.all, 'detail'] as const,
  detail: (id: string) => [...partKeys.details(), id] as const,
  members: (partId: string) => [...partKeys.detail(partId), 'members'] as const,
};

// Mock data for fallback
const mockParts: Part[] = [
  {
    id: 'part-1',
    projectId: '',
    name: 'UI/UX 파트',
    description: '사용자 인터페이스 및 사용자 경험 설계',
    leaderId: 'user-003',
    leaderName: '박민수',
    status: 'ACTIVE',
    startDate: '2025-01-02',
    endDate: '2025-06-30',
    progress: 45,
    memberCount: 4,
    createdAt: '2025-01-02T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z',
  },
  {
    id: 'part-2',
    projectId: '',
    name: '백엔드 파트',
    description: '서버 및 API 개발',
    leaderId: 'user-004',
    leaderName: '최영수',
    status: 'ACTIVE',
    startDate: '2025-01-02',
    endDate: '2025-09-30',
    progress: 62,
    memberCount: 6,
    createdAt: '2025-01-02T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z',
  },
  {
    id: 'part-3',
    projectId: '',
    name: 'AI/ML 파트',
    description: 'AI 모델 개발 및 학습',
    leaderId: 'user-005',
    leaderName: '정수진',
    status: 'ACTIVE',
    startDate: '2025-01-02',
    endDate: '2025-12-31',
    progress: 35,
    memberCount: 5,
    createdAt: '2025-01-02T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z',
  },
];

const mockPartMembers: Record<string, PartMember[]> = {
  'part-1': [
    { id: 'm1', partId: 'part-1', userId: 'user-003', userName: '박민수', userEmail: 'minsu@example.com', role: 'leader', joinedAt: '2025-01-02' },
    { id: 'm2', partId: 'part-1', userId: 'user-011', userName: '김지은', userEmail: 'jieun@example.com', role: 'member', joinedAt: '2025-01-02' },
    { id: 'm3', partId: 'part-1', userId: 'user-012', userName: '이준호', userEmail: 'junho@example.com', role: 'member', joinedAt: '2025-01-05' },
  ],
  'part-2': [
    { id: 'm4', partId: 'part-2', userId: 'user-004', userName: '최영수', userEmail: 'youngsu@example.com', role: 'leader', joinedAt: '2025-01-02' },
    { id: 'm5', partId: 'part-2', userId: 'user-013', userName: '한상철', userEmail: 'sangchul@example.com', role: 'member', joinedAt: '2025-01-02' },
  ],
  'part-3': [
    { id: 'm6', partId: 'part-3', userId: 'user-005', userName: '정수진', userEmail: 'sujin@example.com', role: 'leader', joinedAt: '2025-01-02' },
  ],
};

export function useParts(projectId?: string) {
  return useQuery<Part[]>({
    queryKey: partKeys.list(projectId),
    queryFn: async () => {
      try {
        const data = await apiService.getParts(projectId!);
        return data;
      } catch {
        return mockParts.map(p => ({ ...p, projectId: projectId! }));
      }
    },
    enabled: !!projectId,
  });
}

export function usePartMembers(partId: string) {
  return useQuery<PartMember[]>({
    queryKey: partKeys.members(partId),
    queryFn: async () => {
      try {
        return await apiService.getPartMembers(partId);
      } catch {
        return mockPartMembers[partId] || [];
      }
    },
    enabled: !!partId,
  });
}

export function useCreatePart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: CreatePartDto }) =>
      apiService.createPart(projectId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: partKeys.list(projectId) });
    },
  });
}

export function useUpdatePart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ partId, data }: { partId: string; data: Partial<Part> }) =>
      apiService.updatePart(partId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: partKeys.lists() });
    },
  });
}

export function useDeletePart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (partId: string) => apiService.deletePart(partId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: partKeys.lists() });
    },
  });
}

export function useAddPartMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ partId, userId }: { partId: string; userId: string }) =>
      apiService.addPartMember(partId, userId),
    onSuccess: (_, { partId }) => {
      queryClient.invalidateQueries({ queryKey: partKeys.members(partId) });
      queryClient.invalidateQueries({ queryKey: partKeys.lists() });
    },
  });
}

export function useRemovePartMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ partId, memberId }: { partId: string; memberId: string }) =>
      apiService.removePartMember(partId, memberId),
    onSuccess: (_, { partId }) => {
      queryClient.invalidateQueries({ queryKey: partKeys.members(partId) });
      queryClient.invalidateQueries({ queryKey: partKeys.lists() });
    },
  });
}
