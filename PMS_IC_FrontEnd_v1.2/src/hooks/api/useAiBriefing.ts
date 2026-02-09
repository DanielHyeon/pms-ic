import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import type { AiBriefingResponse, BriefingScope, DecisionTraceEvent } from '../../types/aiBriefing';

export const aiBriefingKeys = {
  all: ['ai-briefing'] as const,
  briefing: (projectId: string, role: string, scope?: string) =>
    [...aiBriefingKeys.all, projectId, role, scope ?? 'default'] as const,
};

export function useAiBriefing(
  projectId: string | undefined,
  role: string,
  scope?: BriefingScope,
) {
  return useQuery<AiBriefingResponse>({
    queryKey: aiBriefingKeys.briefing(projectId || '', role, scope),
    queryFn: () => apiService.getAiBriefing(projectId!, role, scope),
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useRefreshBriefing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, role, scope }: {
      projectId: string; role: string; scope?: BriefingScope;
    }) => apiService.refreshAiBriefing(projectId, role, scope),
    onSuccess: (_, { projectId, role, scope }) => {
      queryClient.invalidateQueries({
        queryKey: aiBriefingKeys.briefing(projectId, role, scope),
      });
    },
  });
}

export function useLogDecisionTrace() {
  return useMutation({
    mutationFn: (event: DecisionTraceEvent) =>
      apiService.logDecisionTrace(event.projectId, event as unknown as Record<string, unknown>),
  });
}
