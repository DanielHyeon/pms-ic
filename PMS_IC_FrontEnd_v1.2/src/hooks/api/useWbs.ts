import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import {
  WbsGroup,
  WbsItem,
  WbsTask,
  WbsGroupFormData,
  WbsItemFormData,
  WbsTaskFormData,
  WbsGroupWithItems,
  WbsItemWithTasks,
  calculateWeightedProgress,
} from '../../types/wbs';

// Query keys
export const wbsKeys = {
  all: ['wbs'] as const,
  groups: () => [...wbsKeys.all, 'groups'] as const,
  groupsByPhase: (phaseId: string) => [...wbsKeys.groups(), { phaseId }] as const,
  group: (id: string) => [...wbsKeys.groups(), id] as const,
  items: () => [...wbsKeys.all, 'items'] as const,
  itemsByGroup: (groupId: string) => [...wbsKeys.items(), { groupId }] as const,
  item: (id: string) => [...wbsKeys.items(), id] as const,
  tasks: () => [...wbsKeys.all, 'tasks'] as const,
  tasksByItem: (itemId: string) => [...wbsKeys.tasks(), { itemId }] as const,
  task: (id: string) => [...wbsKeys.tasks(), id] as const,
  phaseWbs: (phaseId: string) => [...wbsKeys.all, 'phase', phaseId] as const,
  projectWbs: (projectId: string) => [...wbsKeys.all, 'project', projectId] as const,
  storyLinks: () => [...wbsKeys.all, 'storyLinks'] as const,
  taskLinks: () => [...wbsKeys.all, 'taskLinks'] as const,
};

// ============ WBS Groups ============

export function useWbsGroups(phaseId?: string) {
  return useQuery({
    queryKey: wbsKeys.groupsByPhase(phaseId || ''),
    queryFn: () => apiService.getWbsGroups(phaseId!),
    enabled: !!phaseId,
  });
}

export function useWbsGroup(id: string) {
  return useQuery({
    queryKey: wbsKeys.group(id),
    queryFn: () => apiService.getWbsGroup(id),
    enabled: !!id,
  });
}

export function useCreateWbsGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: WbsGroupFormData & { phaseCode?: string }) => {
      return apiService.createWbsGroup(data.phaseId, {
        name: data.name,
        description: data.description,
        code: data.phaseCode ? `${data.phaseCode}.1` : '1.1',
        plannedStartDate: data.plannedStartDate,
        plannedEndDate: data.plannedEndDate,
        weight: data.weight || 100,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: wbsKeys.groupsByPhase(variables.phaseId) });
      queryClient.invalidateQueries({ queryKey: wbsKeys.all });
    },
  });
}

export function useUpdateWbsGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<WbsGroup> }) => {
      return apiService.updateWbsGroup(id, data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: wbsKeys.group(data.id) });
      queryClient.invalidateQueries({ queryKey: wbsKeys.groupsByPhase(data.phaseId) });
      queryClient.invalidateQueries({ queryKey: wbsKeys.all });
    },
  });
}

export function useDeleteWbsGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, phaseId }: { id: string; phaseId: string }) => {
      await apiService.deleteWbsGroup(id);
      return { id, phaseId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: wbsKeys.groupsByPhase(data.phaseId) });
      queryClient.invalidateQueries({ queryKey: wbsKeys.all });
    },
  });
}

// ============ WBS Items ============

export function useWbsItems(groupId?: string) {
  return useQuery({
    queryKey: wbsKeys.itemsByGroup(groupId || ''),
    queryFn: () => apiService.getWbsItems(groupId!),
    enabled: !!groupId,
  });
}

export function useWbsItemsByPhase(phaseId?: string) {
  const { data: groups = [] } = useWbsGroups(phaseId);

  return useQuery({
    queryKey: [...wbsKeys.items(), 'byPhase', phaseId],
    queryFn: async () => {
      if (!groups || groups.length === 0) return [];
      const itemPromises = groups.map((g: WbsGroup) => apiService.getWbsItems(g.id));
      const results = await Promise.all(itemPromises);
      return results.flat();
    },
    enabled: !!phaseId && groups.length > 0,
  });
}

export function useCreateWbsItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: WbsItemFormData & { phaseId: string; groupCode?: string }) => {
      return apiService.createWbsItem(data.groupId, {
        name: data.name,
        description: data.description,
        code: data.groupCode ? `${data.groupCode}.1` : '1.1.1',
        phaseId: data.phaseId,
        plannedStartDate: data.plannedStartDate,
        plannedEndDate: data.plannedEndDate,
        weight: data.weight || 100,
        assigneeId: data.assigneeId,
        estimatedHours: data.estimatedHours,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: wbsKeys.itemsByGroup(variables.groupId) });
      queryClient.invalidateQueries({ queryKey: wbsKeys.all });
    },
  });
}

export function useUpdateWbsItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<WbsItem> }) => {
      return apiService.updateWbsItem(id, data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: wbsKeys.item(data.id) });
      queryClient.invalidateQueries({ queryKey: wbsKeys.itemsByGroup(data.groupId) });
      queryClient.invalidateQueries({ queryKey: wbsKeys.all });
    },
  });
}

export function useDeleteWbsItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, groupId }: { id: string; groupId: string }) => {
      await apiService.deleteWbsItem(id);
      return { id, groupId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: wbsKeys.itemsByGroup(data.groupId) });
      queryClient.invalidateQueries({ queryKey: wbsKeys.all });
    },
  });
}

// ============ WBS Tasks ============

export function useWbsTasks(itemId?: string) {
  return useQuery({
    queryKey: wbsKeys.tasksByItem(itemId || ''),
    queryFn: () => apiService.getWbsTasks(itemId!),
    enabled: !!itemId,
  });
}

export function useCreateWbsTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      data: WbsTaskFormData & { groupId: string; phaseId: string; itemCode?: string }
    ) => {
      return apiService.createWbsTask(data.itemId, {
        name: data.name,
        description: data.description,
        code: data.itemCode ? `${data.itemCode}.1` : '1.1.1.1',
        groupId: data.groupId,
        phaseId: data.phaseId,
        plannedStartDate: data.plannedStartDate,
        plannedEndDate: data.plannedEndDate,
        weight: data.weight || 100,
        assigneeId: data.assigneeId,
        estimatedHours: data.estimatedHours,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: wbsKeys.tasksByItem(variables.itemId) });
      queryClient.invalidateQueries({ queryKey: wbsKeys.all });
    },
  });
}

export function useUpdateWbsTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<WbsTask> }) => {
      return apiService.updateWbsTask(id, data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: wbsKeys.task(data.id) });
      queryClient.invalidateQueries({ queryKey: wbsKeys.tasksByItem(data.itemId) });
      queryClient.invalidateQueries({ queryKey: wbsKeys.all });
    },
  });
}

export function useDeleteWbsTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, itemId }: { id: string; itemId: string }) => {
      await apiService.deleteWbsTask(id);
      return { id, itemId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: wbsKeys.tasksByItem(data.itemId) });
      queryClient.invalidateQueries({ queryKey: wbsKeys.all });
    },
  });
}

// ============ Aggregated Views ============

export function usePhaseWbs(phaseId: string) {
  const { data: groups = [] } = useWbsGroups(phaseId);

  return useQuery({
    queryKey: wbsKeys.phaseWbs(phaseId),
    queryFn: async (): Promise<WbsGroupWithItems[]> => {
      if (!groups || groups.length === 0) return [];

      const result: WbsGroupWithItems[] = [];

      for (const group of groups) {
        const items = await apiService.getWbsItems(group.id);
        const itemsWithTasks: WbsItemWithTasks[] = [];

        for (const item of items || []) {
          const tasks = await apiService.getWbsTasks(item.id);
          const completedTasks = (tasks || []).filter((t: WbsTask) => t.status === 'COMPLETED').length;

          const calculatedProgress =
            tasks && tasks.length > 0
              ? calculateWeightedProgress(tasks.map((t: WbsTask) => ({ weight: t.weight, progress: t.progress })))
              : item.progress || 0;

          itemsWithTasks.push({
            ...item,
            tasks: tasks || [],
            totalTasks: (tasks || []).length,
            completedTasks,
            calculatedProgress,
          });
        }

        const totalTasks = itemsWithTasks.reduce((sum, i) => sum + i.totalTasks, 0);
        const completedTasks = itemsWithTasks.reduce((sum, i) => sum + i.completedTasks, 0);
        const completedItems = itemsWithTasks.filter((i) => i.status === 'COMPLETED').length;

        const calculatedProgress =
          itemsWithTasks.length > 0
            ? calculateWeightedProgress(
                itemsWithTasks.map((i) => ({ weight: i.weight, progress: i.calculatedProgress }))
              )
            : group.progress || 0;

        result.push({
          ...group,
          items: itemsWithTasks,
          totalItems: itemsWithTasks.length,
          completedItems,
          totalTasks,
          completedTasks,
          calculatedProgress,
        });
      }

      return result;
    },
    enabled: !!phaseId && groups.length >= 0,
  });
}

// ============ Story-WBS Links (via Integration API) ============

export function useStoryWbsLinks() {
  return useQuery({
    queryKey: wbsKeys.storyLinks(),
    queryFn: async () => {
      // This would need a dedicated endpoint to get all links
      // For now, return empty array as links are managed via Integration API
      return [];
    },
  });
}

export function useLinkStoryToWbs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ storyId, wbsItemId }: { storyId: string; wbsItemId: string }) => {
      await apiService.linkStoryToWbsItem(storyId, wbsItemId);
      return { storyId, wbsItemId, linkedAt: new Date().toISOString() };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wbsKeys.storyLinks() });
      queryClient.invalidateQueries({ queryKey: wbsKeys.items() });
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    },
  });
}

export function useUnlinkStoryFromWbs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ storyId, wbsItemId }: { storyId: string; wbsItemId: string }) => {
      await apiService.unlinkStoryFromWbsItem(storyId);
      return { storyId, wbsItemId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wbsKeys.storyLinks() });
      queryClient.invalidateQueries({ queryKey: wbsKeys.items() });
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    },
  });
}

// ============ Task-WBS Links ============

export function useTaskWbsLinks() {
  return useQuery({
    queryKey: wbsKeys.taskLinks(),
    queryFn: async () => {
      // Task links are managed via linkedTaskId field in WbsTask
      return [];
    },
  });
}

export function useLinkTaskToWbs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, wbsTaskId }: { taskId: string; wbsTaskId: string }) => {
      // Update WBS Task with linkedTaskId
      await apiService.updateWbsTask(wbsTaskId, { linkedTaskId: taskId });
      return { taskId, wbsTaskId, linkedAt: new Date().toISOString() };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wbsKeys.taskLinks() });
      queryClient.invalidateQueries({ queryKey: wbsKeys.tasks() });
    },
  });
}

export function useUnlinkTaskFromWbs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, wbsTaskId }: { taskId: string; wbsTaskId: string }) => {
      // Update WBS Task to remove linkedTaskId
      await apiService.updateWbsTask(wbsTaskId, { linkedTaskId: null });
      return { taskId, wbsTaskId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wbsKeys.taskLinks() });
      queryClient.invalidateQueries({ queryKey: wbsKeys.tasks() });
    },
  });
}

// ============ Project-wide WBS (All Phases) ============

interface PhaseInfo {
  id: string;
  name: string;
  description?: string;
  status: string;
  progress: number;
  startDate?: string;
  endDate?: string;
}

export function useProjectWbs(projectId: string, phases: PhaseInfo[]) {
  return useQuery({
    queryKey: wbsKeys.projectWbs(projectId),
    queryFn: async () => {
      if (!phases || phases.length === 0) return [];

      const result = [];

      for (const phase of phases) {
        // Get groups for this phase
        const groups = await apiService.getWbsGroups(phase.id);
        const groupsWithItems: WbsGroupWithItems[] = [];

        for (const group of groups || []) {
          const items = await apiService.getWbsItems(group.id);
          const itemsWithTasks: WbsItemWithTasks[] = [];

          for (const item of items || []) {
            const tasks = await apiService.getWbsTasks(item.id);
            const completedTasks = (tasks || []).filter((t: WbsTask) => t.status === 'COMPLETED').length;

            const calculatedProgress =
              tasks && tasks.length > 0
                ? calculateWeightedProgress(tasks.map((t: WbsTask) => ({ weight: t.weight, progress: t.progress })))
                : item.progress || 0;

            itemsWithTasks.push({
              ...item,
              tasks: tasks || [],
              totalTasks: (tasks || []).length,
              completedTasks,
              calculatedProgress,
            });
          }

          const totalTasks = itemsWithTasks.reduce((sum, i) => sum + i.totalTasks, 0);
          const completedTasks = itemsWithTasks.reduce((sum, i) => sum + i.completedTasks, 0);
          const completedItems = itemsWithTasks.filter((i) => i.status === 'COMPLETED').length;

          const calculatedProgress =
            itemsWithTasks.length > 0
              ? calculateWeightedProgress(
                  itemsWithTasks.map((i) => ({ weight: i.weight, progress: i.calculatedProgress }))
                )
              : group.progress || 0;

          groupsWithItems.push({
            ...group,
            items: itemsWithTasks,
            totalItems: itemsWithTasks.length,
            completedItems,
            totalTasks,
            completedTasks,
            calculatedProgress,
          });
        }

        const totalGroups = groupsWithItems.length;
        const completedGroups = groupsWithItems.filter((g) => g.status === 'COMPLETED').length;

        const calculatedProgress =
          groupsWithItems.length > 0
            ? calculateWeightedProgress(
                groupsWithItems.map((g) => ({ weight: g.weight, progress: g.calculatedProgress }))
              )
            : phase.progress || 0;

        result.push({
          id: phase.id,
          name: phase.name,
          description: phase.description,
          status: phase.status,
          progress: phase.progress,
          startDate: phase.startDate,
          endDate: phase.endDate,
          groups: groupsWithItems,
          totalGroups,
          completedGroups,
          calculatedProgress,
        });
      }

      return result;
    },
    enabled: !!projectId && phases.length > 0,
  });
}

// ============ Progress Recalculation ============

export function useRecalculateProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (phaseId: string) => {
      // Progress is calculated on the server side via WbsService
      // This mutation just triggers a refetch
      return { phaseId, progress: 0 };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: wbsKeys.phaseWbs(data.phaseId) });
      queryClient.invalidateQueries({ queryKey: wbsKeys.all });
    },
  });
}
