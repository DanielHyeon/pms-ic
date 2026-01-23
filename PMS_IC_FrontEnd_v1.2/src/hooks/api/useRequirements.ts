import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';

export const requirementKeys = {
  all: ['requirements'] as const,
  lists: () => [...requirementKeys.all, 'list'] as const,
  list: (projectId?: string) => [...requirementKeys.lists(), { projectId }] as const,
  details: () => [...requirementKeys.all, 'detail'] as const,
  detail: (id: string) => [...requirementKeys.details(), id] as const,
};

export function useRequirements(projectId?: string) {
  return useQuery({
    queryKey: requirementKeys.list(projectId),
    queryFn: () => apiService.getRequirements(projectId),
  });
}

export function useRequirement(id: string) {
  return useQuery({
    queryKey: requirementKeys.detail(id),
    queryFn: () => apiService.getRequirement(id),
    enabled: !!id,
  });
}

export function useCreateRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof apiService.createRequirement>[0]) =>
      apiService.createRequirement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requirementKeys.lists() });
    },
  });
}

export function useUpdateRequirement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof apiService.updateRequirement>[1] }) =>
      apiService.updateRequirement(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: requirementKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: requirementKeys.lists() });
    },
  });
}
