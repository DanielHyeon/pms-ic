import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { unwrapOrThrow } from '../../utils/toViewState';

export const wipKeys = {
  all: ['wip'] as const,
  status: () => [...wipKeys.all, 'status'] as const,
  projectStatus: (projectId: string) => [...wipKeys.status(), { projectId }] as const,
  progress: () => [...wipKeys.all, 'progress'] as const,
  projectProgress: (projectId: string) => [...wipKeys.progress(), { projectId }] as const,
};

export function useProjectWipStatus(projectId?: string) {
  return useQuery({
    queryKey: wipKeys.projectStatus(projectId!),
    queryFn: async () => {
      const result = await apiService.getProjectWipStatusResult(projectId!);
      return unwrapOrThrow(result);
    },
    enabled: !!projectId,
  });
}

export function useProjectProgress(projectId?: string) {
  return useQuery({
    queryKey: wipKeys.projectProgress(projectId!),
    queryFn: async () => {
      const result = await apiService.getProjectProgressResult(projectId!);
      return unwrapOrThrow(result);
    },
    enabled: !!projectId,
  });
}
