import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Epic,
  EpicFormData,
  EpicWithChildren,
} from '../../types/backlog';
import { apiService } from '../../services/api';
import { unwrapOrThrow } from '../../utils/toViewState';

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
      const result = await apiService.getEpicsForProjectResult(projectId);
      return unwrapOrThrow(result);
    },
    enabled: !!projectId,
  });
}

export function useEpic(id: string) {
  return useQuery<Epic>({
    queryKey: epicKeys.detail(id),
    queryFn: async () => {
      const result = await apiService.getEpicByIdResult(id);
      return unwrapOrThrow(result);
    },
    enabled: !!id,
  });
}

export function useEpicWithChildren(id: string) {
  return useQuery<EpicWithChildren>({
    queryKey: epicKeys.withChildren(id),
    queryFn: async () => {
      const result = await apiService.getEpicByIdResult(id);
      const epic = unwrapOrThrow(result);

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
      const result = await apiService.createEpicResult(projectId, epicData);
      return unwrapOrThrow(result);
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
      const result = await apiService.updateEpicResult(id, data);
      return unwrapOrThrow(result);
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
      const result = await apiService.deleteEpicResult(id);
      unwrapOrThrow(result);
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
          apiService.updateEpicResult(id, { orderNum: idx + 1 })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: epicKeys.all });
    },
  });
}
