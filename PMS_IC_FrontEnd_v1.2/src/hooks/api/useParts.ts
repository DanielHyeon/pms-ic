import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { Part, PartMember, CreatePartDto, PartDashboard, PartMetrics } from '../../types/part';
import { unwrapOrThrow } from '../../utils/toViewState';

export const partKeys = {
  all: ['parts'] as const,
  lists: () => [...partKeys.all, 'list'] as const,
  list: (projectId?: string) => [...partKeys.lists(), { projectId }] as const,
  details: () => [...partKeys.all, 'detail'] as const,
  detail: (id: string) => [...partKeys.details(), id] as const,
  members: (partId: string) => [...partKeys.detail(partId), 'members'] as const,
  dashboard: (projectId: string, partId: string) => [...partKeys.detail(partId), 'dashboard', { projectId }] as const,
  metrics: (projectId: string, partId: string) => [...partKeys.detail(partId), 'metrics', { projectId }] as const,
};

export function useParts(projectId?: string) {
  return useQuery<Part[]>({
    queryKey: partKeys.list(projectId),
    queryFn: async () => {
      const result = await apiService.getPartsResult(projectId!);
      return unwrapOrThrow(result);
    },
    enabled: !!projectId,
  });
}

export function usePartMembers(partId: string) {
  return useQuery<PartMember[]>({
    queryKey: partKeys.members(partId),
    queryFn: async () => {
      const result = await apiService.getPartMembersResult(partId);
      return unwrapOrThrow(result);
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

export function usePartDashboard(projectId: string, partId: string) {
  return useQuery<PartDashboard>({
    queryKey: partKeys.dashboard(projectId, partId),
    queryFn: async () => {
      const result = await apiService.getPartDashboardResult(projectId, partId);
      return unwrapOrThrow(result);
    },
    enabled: !!projectId && !!partId,
  });
}

export function usePartMetrics(projectId: string, partId: string) {
  return useQuery<PartMetrics>({
    queryKey: partKeys.metrics(projectId, partId),
    queryFn: async () => {
      const result = await apiService.getPartMetricsResult(projectId, partId);
      return unwrapOrThrow(result);
    },
    enabled: !!projectId && !!partId,
  });
}
