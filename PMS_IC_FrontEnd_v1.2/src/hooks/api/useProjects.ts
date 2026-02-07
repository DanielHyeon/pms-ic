import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { Project } from '../../types/project';
import { unwrapOrThrow } from '../../utils/toViewState';

// Query keys factory
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (filters?: object) => [...projectKeys.lists(), filters] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
  fullList: () => [...projectKeys.all, 'full-list'] as const,
};

// Get all projects (basic list)
export function useProjects() {
  return useQuery<Project[]>({
    queryKey: projectKeys.lists(),
    queryFn: async () => {
      const result = await apiService.getProjectsResult();
      return unwrapOrThrow(result);
    },
  });
}

// Get all projects with full details
export function useProjectsWithDetails() {
  return useQuery<Project[]>({
    queryKey: projectKeys.fullList(),
    queryFn: async () => {
      const listResult = await apiService.getProjectsResult();
      const projectList = unwrapOrThrow(listResult);
      return Promise.all(
        projectList.map(async (p: { id: string }) => {
          const detailResult = await apiService.getProjectResult(p.id);
          return unwrapOrThrow(detailResult);
        })
      );
    },
  });
}

// Get single project
export function useProject(id: string) {
  return useQuery<Project>({
    queryKey: projectKeys.detail(id),
    queryFn: async () => {
      const result = await apiService.getProjectResult(id);
      return unwrapOrThrow(result);
    },
    enabled: !!id,
  });
}

// Create project
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof apiService.createProject>[0]) =>
      apiService.createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

// Update project
export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof apiService.updateProject>[1] }) =>
      apiService.updateProject(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

// Delete project
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiService.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

// Set default project
export function useSetDefaultProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiService.setDefaultProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}
