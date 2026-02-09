import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';

// Query keys factory
export const accountabilityKeys = {
  all: ['accountability'] as const,
  detail: (projectId: string) => [...accountabilityKeys.all, 'detail', projectId] as const,
  changelog: (projectId: string) => [...accountabilityKeys.all, 'changelog', projectId] as const,
  connections: (projectId: string) => [...accountabilityKeys.all, 'connections', projectId] as const,
};

// Get accountability info for a project
export function useAccountability(projectId: string) {
  return useQuery({
    queryKey: accountabilityKeys.detail(projectId),
    queryFn: () => apiService.getAccountability(projectId),
    enabled: !!projectId,
  });
}

// Get accountability changelog for a project
export function useAccountabilityChangelog(projectId: string) {
  return useQuery({
    queryKey: accountabilityKeys.changelog(projectId),
    queryFn: () => apiService.getAccountabilityChangelog(projectId),
    enabled: !!projectId,
  });
}

// Get accountability connections summary for a project
export function useAccountabilityConnections(projectId: string) {
  return useQuery({
    queryKey: accountabilityKeys.connections(projectId),
    queryFn: () => apiService.getAccountabilityConnections(projectId),
    enabled: !!projectId,
  });
}

// Update accountability (PM change, Co-PM change, Sponsor change)
export function useUpdateAccountability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: { changeType: string; newUserId: string; changeReason: string } }) =>
      apiService.updateAccountability(projectId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: accountabilityKeys.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: accountabilityKeys.changelog(projectId) });
    },
  });
}
