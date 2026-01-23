import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/api';

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
    queryFn: () => apiService.getProjectWipStatus(projectId!),
    enabled: !!projectId,
  });
}

export function useProjectProgress(projectId?: string) {
  return useQuery({
    queryKey: wipKeys.projectProgress(projectId!),
    queryFn: () => apiService.getProjectProgress(projectId!),
    enabled: !!projectId,
  });
}
