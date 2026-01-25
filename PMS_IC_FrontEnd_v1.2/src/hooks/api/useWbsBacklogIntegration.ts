/**
 * WBS-Backlog Integration Hooks
 *
 * Provides linking functionality between:
 * - Phase ↔ Epic
 * - WBS Group ↔ Feature
 * - WBS Item ↔ User Story
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { Epic, Feature, UserStory } from '../../types/backlog';
import { WbsGroup, WbsItem } from '../../types/wbs';

// Query keys
export const integrationKeys = {
  all: ['wbs-backlog-integration'] as const,
  epicPhaseLinks: () => [...integrationKeys.all, 'epic-phase'] as const,
  epicsByPhase: (phaseId: string) => [...integrationKeys.all, 'epics-by-phase', phaseId] as const,
  featureGroupLinks: () => [...integrationKeys.all, 'feature-group'] as const,
  featuresByGroup: (groupId: string) => [...integrationKeys.all, 'features-by-group', groupId] as const,
  storyItemLinks: () => [...integrationKeys.all, 'story-item'] as const,
  storiesByItem: (itemId: string) => [...integrationKeys.all, 'stories-by-item', itemId] as const,
  groupsByFeature: (featureId: string) => [...integrationKeys.all, 'groups-by-feature', featureId] as const,
  itemsByStory: (storyId: string) => [...integrationKeys.all, 'items-by-story', storyId] as const,
  phaseIntegration: (phaseId: string) => [...integrationKeys.all, 'phase-integration', phaseId] as const,
};

// ============ Phase-Epic Integration ============

export interface PhaseEpicSummary {
  phaseId: string;
  linkedEpics: Epic[];
  unlinkedEpics: Epic[];
}

export function useEpicsByPhase(phaseId: string) {
  return useQuery({
    queryKey: integrationKeys.epicsByPhase(phaseId),
    queryFn: () => apiService.getEpicsByPhase(phaseId),
    enabled: !!phaseId,
  });
}

export function useUnlinkedEpics(projectId: string) {
  return useQuery({
    queryKey: [...integrationKeys.all, 'unlinked-epics', projectId],
    queryFn: () => apiService.getUnlinkedEpics(projectId),
    enabled: !!projectId,
  });
}

export function useLinkEpicToPhase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ epicId, phaseId }: { epicId: string; phaseId: string }) => {
      await apiService.linkEpicToPhase(epicId, phaseId);
      return { epicId, phaseId };
    },
    onSuccess: (_, { phaseId }) => {
      queryClient.invalidateQueries({ queryKey: integrationKeys.epicsByPhase(phaseId) });
      queryClient.invalidateQueries({ queryKey: integrationKeys.all });
      queryClient.invalidateQueries({ queryKey: ['epics'] });
    },
  });
}

export function useUnlinkEpicFromPhase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ epicId, phaseId }: { epicId: string; phaseId: string }) => {
      await apiService.unlinkEpicFromPhase(epicId);
      return { epicId, phaseId };
    },
    onSuccess: (_, { phaseId }) => {
      queryClient.invalidateQueries({ queryKey: integrationKeys.epicsByPhase(phaseId) });
      queryClient.invalidateQueries({ queryKey: integrationKeys.all });
      queryClient.invalidateQueries({ queryKey: ['epics'] });
    },
  });
}

// ============ WBS Group-Feature Integration ============

export interface GroupFeatureSummary {
  groupId: string;
  linkedFeatures: Feature[];
  unlinkedFeatures: Feature[];
}

export function useFeaturesByWbsGroup(groupId: string) {
  return useQuery({
    queryKey: integrationKeys.featuresByGroup(groupId),
    queryFn: () => apiService.getFeaturesByWbsGroupIntegration(groupId),
    enabled: !!groupId,
  });
}

export function useWbsGroupsByFeature(featureId: string) {
  return useQuery({
    queryKey: integrationKeys.groupsByFeature(featureId),
    queryFn: async (): Promise<WbsGroup[]> => {
      // Get feature details to find linked group
      const feature = await apiService.getFeature(featureId);
      if (!feature?.wbsGroupId) return [];

      const group = await apiService.getWbsGroup(feature.wbsGroupId);
      return group ? [group] : [];
    },
    enabled: !!featureId,
  });
}

export function useUnlinkedFeatures(epicId?: string) {
  return useQuery({
    queryKey: [...integrationKeys.all, 'unlinked-features', epicId],
    queryFn: () => epicId ? apiService.getUnlinkedFeatures(epicId) : Promise.resolve([]),
    enabled: !!epicId,
  });
}

export function useLinkFeatureToWbsGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ featureId, wbsGroupId }: { featureId: string; wbsGroupId: string }) => {
      await apiService.linkFeatureToWbsGroupIntegration(featureId, wbsGroupId);
      return { featureId, wbsGroupId };
    },
    onSuccess: (_, { wbsGroupId, featureId }) => {
      queryClient.invalidateQueries({ queryKey: integrationKeys.featuresByGroup(wbsGroupId) });
      queryClient.invalidateQueries({ queryKey: integrationKeys.groupsByFeature(featureId) });
      queryClient.invalidateQueries({ queryKey: integrationKeys.all });
      queryClient.invalidateQueries({ queryKey: ['features'] });
      queryClient.invalidateQueries({ queryKey: ['wbs'] });
    },
  });
}

export function useUnlinkFeatureFromWbsGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ featureId, wbsGroupId }: { featureId: string; wbsGroupId: string }) => {
      await apiService.unlinkFeatureFromWbsGroupIntegration(featureId);
      return { featureId, wbsGroupId };
    },
    onSuccess: (_, { wbsGroupId, featureId }) => {
      queryClient.invalidateQueries({ queryKey: integrationKeys.featuresByGroup(wbsGroupId) });
      queryClient.invalidateQueries({ queryKey: integrationKeys.groupsByFeature(featureId) });
      queryClient.invalidateQueries({ queryKey: integrationKeys.all });
      queryClient.invalidateQueries({ queryKey: ['features'] });
      queryClient.invalidateQueries({ queryKey: ['wbs'] });
    },
  });
}

// ============ WBS Item-Story Integration ============

export interface ItemStorySummary {
  itemId: string;
  linkedStories: UserStory[];
  unlinkedStories: UserStory[];
}

export function useStoriesByWbsItem(itemId: string) {
  return useQuery({
    queryKey: integrationKeys.storiesByItem(itemId),
    queryFn: () => apiService.getStoriesByWbsItem(itemId),
    enabled: !!itemId,
  });
}

export function useWbsItemsByStory(storyId: string) {
  return useQuery({
    queryKey: integrationKeys.itemsByStory(storyId),
    queryFn: async (): Promise<WbsItem[]> => {
      // This would need to get the story's wbsItemId and then fetch the item
      // For now, return empty as the relationship is on the story side
      return [];
    },
    enabled: !!storyId,
  });
}

export function useUnlinkedStories(featureId?: string, epicId?: string) {
  return useQuery({
    queryKey: [...integrationKeys.all, 'unlinked-stories', featureId, epicId],
    queryFn: async (): Promise<UserStory[]> => {
      // This needs a project ID context
      // For now, return empty array
      return [];
    },
  });
}

export function useUnlinkedStoriesByProject(projectId: string) {
  return useQuery({
    queryKey: [...integrationKeys.all, 'unlinked-stories-project', projectId],
    queryFn: () => apiService.getUnlinkedStories(projectId),
    enabled: !!projectId,
  });
}

export function useLinkStoryToWbsItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ storyId, wbsItemId }: { storyId: string; wbsItemId: string }) => {
      await apiService.linkStoryToWbsItem(storyId, wbsItemId);
      return { storyId, wbsItemId };
    },
    onSuccess: (_, { wbsItemId, storyId }) => {
      queryClient.invalidateQueries({ queryKey: integrationKeys.storiesByItem(wbsItemId) });
      queryClient.invalidateQueries({ queryKey: integrationKeys.itemsByStory(storyId) });
      queryClient.invalidateQueries({ queryKey: integrationKeys.all });
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      queryClient.invalidateQueries({ queryKey: ['wbs'] });
    },
  });
}

export function useUnlinkStoryFromWbsItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ storyId, wbsItemId }: { storyId: string; wbsItemId: string }) => {
      await apiService.unlinkStoryFromWbsItem(storyId);
      return { storyId, wbsItemId };
    },
    onSuccess: (_, { wbsItemId, storyId }) => {
      queryClient.invalidateQueries({ queryKey: integrationKeys.storiesByItem(wbsItemId) });
      queryClient.invalidateQueries({ queryKey: integrationKeys.itemsByStory(storyId) });
      queryClient.invalidateQueries({ queryKey: integrationKeys.all });
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      queryClient.invalidateQueries({ queryKey: ['wbs'] });
    },
  });
}

// ============ Aggregated Phase Integration View ============

export interface PhaseIntegrationSummary {
  phaseId: string;
  epics: {
    total: number;
    linked: Epic[];
    unlinked: Epic[];
  };
  wbsGroups: {
    total: number;
    groups: Array<{
      group: WbsGroup;
      features: Feature[];
      items: Array<{
        item: WbsItem;
        stories: UserStory[];
      }>;
    }>;
  };
  stats: {
    totalFeatures: number;
    linkedFeatures: number;
    totalStories: number;
    linkedStories: number;
  };
}

export function usePhaseIntegration(phaseId: string, projectId?: string) {
  return useQuery({
    queryKey: integrationKeys.phaseIntegration(phaseId),
    queryFn: async (): Promise<PhaseIntegrationSummary> => {
      // Get phase integration summary from API
      const summary = projectId
        ? await apiService.getPhaseIntegrationSummary(phaseId, projectId)
        : null;

      // Get epics for this phase
      const linkedEpics = await apiService.getEpicsByPhase(phaseId);
      const unlinkedEpics = projectId
        ? await apiService.getUnlinkedEpics(projectId)
        : [];

      // Get WBS groups for this phase
      const phaseGroups = await apiService.getWbsGroups(phaseId);

      // Build group details with features and items
      const groupDetails = await Promise.all(
        (phaseGroups || []).map(async (group: WbsGroup) => {
          const groupFeatures = await apiService.getFeaturesByWbsGroupIntegration(group.id);
          const groupItems = await apiService.getWbsItems(group.id);

          const itemDetails = await Promise.all(
            (groupItems || []).map(async (item: WbsItem) => {
              const itemStories = await apiService.getStoriesByWbsItem(item.id);
              return { item, stories: itemStories || [] };
            })
          );

          return {
            group,
            features: groupFeatures || [],
            items: itemDetails,
          };
        })
      );

      // Calculate stats
      const totalFeatures = groupDetails.reduce((sum, g) => sum + g.features.length, 0);
      const linkedFeatures = totalFeatures; // All features in groups are linked
      const totalStories = groupDetails.reduce(
        (sum, g) => sum + g.items.reduce((itemSum, i) => itemSum + i.stories.length, 0),
        0
      );
      const linkedStories = totalStories; // All stories returned from WbsItem are linked

      return {
        phaseId,
        epics: {
          total: (linkedEpics?.length || 0) + (unlinkedEpics?.length || 0),
          linked: linkedEpics || [],
          unlinked: unlinkedEpics || [],
        },
        wbsGroups: {
          total: phaseGroups?.length || 0,
          groups: groupDetails,
        },
        stats: {
          totalFeatures,
          linkedFeatures,
          totalStories,
          linkedStories,
        },
      };
    },
    enabled: !!phaseId,
  });
}

// ============ Utility Hooks ============

export function useAllIntegrationLinks() {
  return useQuery({
    queryKey: [...integrationKeys.all, 'all-links'],
    queryFn: async () => {
      // This would need dedicated endpoints to get all links
      // For now, return empty stats
      return {
        epicPhaseLinks: [],
        featureGroupLinks: [],
        storyItemLinks: [],
        stats: {
          totalEpicPhaseLinks: 0,
          totalFeatureGroupLinks: 0,
          totalStoryItemLinks: 0,
        },
      };
    },
  });
}
