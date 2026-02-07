import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Epic,
  EpicFormData,
  EpicWithChildren,
} from '../../types/backlog';
import { apiService } from '../../services/api';

export const epicKeys = {
  all: ['epics'] as const,
  lists: () => [...epicKeys.all, 'list'] as const,
  list: (filters?: object) => [...epicKeys.lists(), filters] as const,
  details: () => [...epicKeys.all, 'detail'] as const,
  detail: (id: string) => [...epicKeys.details(), id] as const,
  withChildren: (id: string) => [...epicKeys.detail(id), 'children'] as const,
};

export function useEpics(projectId?: string) {
  return useQuery<Epic[]>({
    queryKey: epicKeys.list({ projectId }),
    queryFn: async () => {
      if (!projectId) return [];
      const response = await apiService.getEpicsForProject(projectId);
      return response || [];
    },
    enabled: !!projectId,
  });
}

export function useEpic(id: string) {
  return useQuery<Epic | undefined>({
    queryKey: epicKeys.detail(id),
    queryFn: async () => {
      const response = await apiService.getEpicById(id);
      return response || undefined;
    },
    enabled: !!id,
  });
}

export function useEpicWithChildren(id: string) {
  return useQuery<EpicWithChildren | undefined>({
    queryKey: epicKeys.withChildren(id),
    queryFn: async () => {
      const epic = await apiService.getEpicById(id);
      if (!epic) return undefined;

      return {
        ...epic,
        features: [],
        totalStories: epic.itemCount || 0,
        completedStories: 0,
        totalPoints: epic.totalStoryPoints || 0,
        completedPoints: 0,
      };
    },
    enabled: !!id,
  });
}

export function useCreateEpic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: EpicFormData & { projectId: string }): Promise<Epic> => {
      const { projectId, ...epicData } = data;
      return apiService.createEpic(projectId, epicData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: epicKeys.all });
    },
  });
}

export function useUpdateEpic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Epic>;
    }): Promise<Epic> => {
      return apiService.updateEpic(id, data);
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: epicKeys.all });
      queryClient.invalidateQueries({ queryKey: epicKeys.detail(id) });
    },
  });
}

export function useDeleteEpic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiService.deleteEpic(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: epicKeys.all });
    },
  });
}

export function useReorderEpics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderedIds: string[]): Promise<void> => {
      await Promise.all(
        orderedIds.map((id, idx) =>
          apiService.updateEpic(id, { orderNum: idx + 1 })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: epicKeys.all });
    },
  });
}
