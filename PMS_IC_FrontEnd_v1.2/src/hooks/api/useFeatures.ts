import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { Feature, FeatureFormData, FeatureWithChildren } from '../../types/backlog';

export const featureKeys = {
  all: ['features'] as const,
  lists: () => [...featureKeys.all, 'list'] as const,
  list: (filters?: object) => [...featureKeys.lists(), filters] as const,
  byEpic: (epicId: string) => [...featureKeys.lists(), { epicId }] as const,
  byWbsGroup: (wbsGroupId: string) => [...featureKeys.lists(), { wbsGroupId }] as const,
  details: () => [...featureKeys.all, 'detail'] as const,
  detail: (id: string) => [...featureKeys.details(), id] as const,
};

export function useFeatures(epicId?: string) {
  return useQuery<Feature[]>({
    queryKey: epicId ? featureKeys.byEpic(epicId) : featureKeys.lists(),
    queryFn: async () => {
      if (epicId) {
        return apiService.getFeatures(epicId);
      }
      // If no epicId, return empty array as features are always under an epic
      return [];
    },
    enabled: !!epicId,
  });
}

export function useFeaturesByWbsGroup(wbsGroupId: string) {
  return useQuery<Feature[]>({
    queryKey: featureKeys.byWbsGroup(wbsGroupId),
    queryFn: () => apiService.getFeaturesByWbsGroup(wbsGroupId),
    enabled: !!wbsGroupId,
  });
}

export function useFeature(id: string) {
  return useQuery<Feature | null>({
    queryKey: featureKeys.detail(id),
    queryFn: () => apiService.getFeature(id),
    enabled: !!id,
  });
}

export function useFeatureWithChildren(id: string) {
  return useQuery<FeatureWithChildren | null>({
    queryKey: [...featureKeys.detail(id), 'children'],
    queryFn: async (): Promise<FeatureWithChildren | null> => {
      const feature = await apiService.getFeature(id);
      if (!feature) return null;

      // Stories for this feature would be fetched via stories API
      // For now, return feature with empty stories
      return {
        ...feature,
        stories: [],
        totalStories: 0,
        completedStories: 0,
      };
    },
    enabled: !!id,
  });
}

export function useCreateFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: FeatureFormData): Promise<Feature> => {
      return apiService.createFeature(data.epicId, {
        name: data.name,
        description: data.description,
        priority: data.priority,
      });
    },
    onSuccess: (newFeature) => {
      queryClient.invalidateQueries({ queryKey: featureKeys.all });
      queryClient.invalidateQueries({ queryKey: featureKeys.byEpic(newFeature.epicId) });
    },
  });
}

export function useUpdateFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Feature>;
    }): Promise<Feature> => {
      return apiService.updateFeature(id, data);
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: featureKeys.all });
      queryClient.invalidateQueries({ queryKey: featureKeys.byEpic(updated.epicId) });
      queryClient.invalidateQueries({ queryKey: featureKeys.detail(updated.id) });
    },
  });
}

export function useDeleteFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, epicId }: { id: string; epicId: string }): Promise<string> => {
      await apiService.deleteFeature(id);
      return epicId;
    },
    onSuccess: (epicId) => {
      queryClient.invalidateQueries({ queryKey: featureKeys.all });
      if (epicId) {
        queryClient.invalidateQueries({ queryKey: featureKeys.byEpic(epicId) });
      }
    },
  });
}

export function useLinkFeatureToWbsGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      featureId,
      wbsGroupId,
    }: {
      featureId: string;
      wbsGroupId: string;
    }): Promise<Feature> => {
      return apiService.linkFeatureToWbsGroup(featureId, wbsGroupId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: featureKeys.all });
      queryClient.invalidateQueries({ queryKey: ['wbs'] });
    },
  });
}

export function useUnlinkFeatureFromWbsGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (featureId: string): Promise<Feature> => {
      return apiService.unlinkFeatureFromWbsGroup(featureId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: featureKeys.all });
      queryClient.invalidateQueries({ queryKey: ['wbs'] });
    },
  });
}

export function useReorderFeatures() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      epicId,
      orderedIds,
    }: {
      epicId: string;
      orderedIds: string[];
    }): Promise<Feature[]> => {
      // Update order for each feature
      const updates = orderedIds.map((id, idx) =>
        apiService.updateFeature(id, { order: idx + 1 })
      );
      return Promise.all(updates);
    },
    onSuccess: (_, { epicId }) => {
      queryClient.invalidateQueries({ queryKey: featureKeys.all });
      queryClient.invalidateQueries({ queryKey: featureKeys.byEpic(epicId) });
    },
  });
}
