import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { unwrapOrThrow } from '../../utils/toViewState';
import { Requirement } from '../../types/project';

export const requirementKeys = {
  all: ['requirements'] as const,
  lists: () => [...requirementKeys.all, 'list'] as const,
  list: (projectId?: string) => [...requirementKeys.lists(), { projectId }] as const,
  details: () => [...requirementKeys.all, 'detail'] as const,
  detail: (id: string) => [...requirementKeys.details(), id] as const,
};

export function useRequirements(projectId?: string) {
  return useQuery<Requirement[]>({
    queryKey: requirementKeys.list(projectId),
    queryFn: async () => {
      const result = await apiService.getRequirementsResult(projectId!);
      return unwrapOrThrow(result);
    },
    enabled: !!projectId,
  });
}

export function useRequirement(projectId: string, requirementId: string) {
  return useQuery({
    queryKey: requirementKeys.detail(requirementId),
    queryFn: async () => {
      const result = await apiService.getRequirementResult(projectId, requirementId);
      return unwrapOrThrow(result);
    },
    enabled: !!projectId && !!requirementId,
  });
}

export function useCreateRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: Record<string, unknown> }) =>
      apiService.createRequirement(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requirementKeys.lists() });
    },
  });
}

export function useUpdateRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, requirementId, data }: { projectId: string; requirementId: string; data: Record<string, unknown> }) =>
      apiService.updateRequirement(projectId, requirementId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requirementKeys.lists() });
    },
  });
}

export function useLinkRequirementToTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, requirementId, taskId }: { projectId: string; requirementId: string; taskId: string }) =>
      apiService.linkRequirementToTask(projectId, requirementId, taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requirementKeys.lists() });
    },
  });
}
