import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sprint, SprintFormData, SprintWithItems, UserStory } from '../../types/backlog';
import { apiService } from '../../services/api';

export const sprintKeys = {
  all: ['sprints'] as const,
  lists: () => [...sprintKeys.all, 'list'] as const,
  list: (projectId?: string) => [...sprintKeys.lists(), { projectId }] as const,
  details: () => [...sprintKeys.all, 'detail'] as const,
  detail: (id: string) => [...sprintKeys.details(), id] as const,
  active: (projectId: string) => [...sprintKeys.lists(), { projectId, active: true }] as const,
  withItems: (id: string) => [...sprintKeys.detail(id), 'items'] as const,
};

export function useSprints(projectId?: string) {
  return useQuery<Sprint[]>({
    queryKey: sprintKeys.list(projectId),
    queryFn: async () => {
      if (!projectId) {
        return []; // No project selected, return empty
      }
      try {
        const data = await apiService.getSprints(projectId);
        if (Array.isArray(data)) {
          return data.map((s: any): Sprint => ({
            id: s.id,
            projectId: s.projectId,
            name: s.name,
            goal: s.goal,
            startDate: s.startDate,
            endDate: s.endDate,
            status: s.status === 'PLANNED' ? 'PLANNING' : s.status,
            velocity: s.velocity || 0,
            plannedPoints: s.plannedPoints || s.conwipLimit || 0,
            createdAt: s.createdAt || `${s.startDate}T00:00:00Z`,
            updatedAt: s.updatedAt || `${s.startDate}T00:00:00Z`,
          }));
        }
        return [];
      } catch {
        return []; // Return empty array on error
      }
    },
    enabled: !!projectId,
  });
}

export function useSprint(id: string) {
  return useQuery<Sprint | undefined>({
    queryKey: sprintKeys.detail(id),
    queryFn: async () => {
      try {
        const data = await apiService.getSprint(id);
        if (data) {
          return {
            id: data.id,
            projectId: data.projectId,
            name: data.name,
            goal: data.goal,
            startDate: data.startDate,
            endDate: data.endDate,
            status: data.status === 'PLANNED' ? 'PLANNING' : data.status,
            velocity: data.velocity || 0,
            plannedPoints: data.plannedPoints || data.conwipLimit || 0,
            createdAt: data.createdAt || `${data.startDate}T00:00:00Z`,
            updatedAt: data.updatedAt || `${data.startDate}T00:00:00Z`,
          } as Sprint;
        }
        return undefined;
      } catch {
        return undefined;
      }
    },
    enabled: !!id,
  });
}

export function useActiveSprint(projectId: string) {
  return useQuery<Sprint | undefined>({
    queryKey: sprintKeys.active(projectId),
    queryFn: async () => {
      try {
        const data = await apiService.getSprints(projectId);
        if (Array.isArray(data)) {
          const activeSprint = data.find((s: any) => s.status === 'ACTIVE');
          if (activeSprint) {
            return {
              id: activeSprint.id,
              projectId: activeSprint.projectId,
              name: activeSprint.name,
              goal: activeSprint.goal,
              startDate: activeSprint.startDate,
              endDate: activeSprint.endDate,
              status: 'ACTIVE',
              velocity: activeSprint.velocity || 0,
              plannedPoints: activeSprint.plannedPoints || activeSprint.conwipLimit || 0,
              createdAt: activeSprint.createdAt || `${activeSprint.startDate}T00:00:00Z`,
              updatedAt: activeSprint.updatedAt || `${activeSprint.startDate}T00:00:00Z`,
            } as Sprint;
          }
        }
        return undefined;
      } catch {
        return undefined;
      }
    },
    enabled: !!projectId,
  });
}

export function useSprintWithItems(id: string) {
  return useQuery<SprintWithItems | undefined>({
    queryKey: sprintKeys.withItems(id),
    queryFn: async () => {
      try {
        const data = await apiService.getSprint(id);
        if (!data) return undefined;

        const sprint: Sprint = {
          id: data.id,
          projectId: data.projectId,
          name: data.name,
          goal: data.goal,
          startDate: data.startDate,
          endDate: data.endDate,
          status: data.status === 'PLANNED' ? 'PLANNING' : data.status,
          velocity: data.velocity || 0,
          plannedPoints: data.plannedPoints || data.conwipLimit || 0,
          createdAt: data.createdAt || `${data.startDate}T00:00:00Z`,
          updatedAt: data.updatedAt || `${data.startDate}T00:00:00Z`,
        };

        // TODO: Fetch stories for this sprint from API when endpoint is available
        const sprintStories: UserStory[] = [];
        const totalPoints = sprintStories.reduce((sum, s) => sum + (s.storyPoints || 0), 0);
        const completedPoints = sprintStories
          .filter((s) => s.status === 'DONE')
          .reduce((sum, s) => sum + (s.storyPoints || 0), 0);

        return {
          ...sprint,
          stories: sprintStories.map((story) => ({
            ...story,
            tasks: [],
            totalTasks: 0,
            completedTasks: 0,
          })),
          totalPoints,
          completedPoints,
          burndownData: generateBurndownData(sprint, totalPoints, completedPoints),
        };
      } catch {
        return undefined;
      }
    },
    enabled: !!id,
  });
}

function generateBurndownData(
  sprint: Sprint,
  totalPoints: number,
  completedPoints: number
): { date: string; remaining: number }[] {
  const start = new Date(sprint.startDate);
  const end = new Date(sprint.endDate);
  const today = new Date();
  const data: { date: string; remaining: number }[] = [];

  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const daysPassed = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  // Ideal burndown
  for (let i = 0; i <= totalDays; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);

    if (date <= today) {
      // Simulated actual progress
      const idealRemaining = totalPoints - (totalPoints / totalDays) * i;
      const actualRemaining =
        i <= daysPassed
          ? totalPoints - completedPoints * (i / daysPassed)
          : totalPoints - completedPoints;

      data.push({
        date: date.toISOString().split('T')[0],
        remaining: Math.max(0, Math.round(actualRemaining)),
      });
    }
  }

  return data;
}

export function useCreateSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SprintFormData & { projectId: string }): Promise<Sprint> => {
      const result = await apiService.createSprint(data.projectId, {
        name: data.name,
        goal: data.goal,
        startDate: data.startDate,
        endDate: data.endDate,
        status: 'PLANNING',
      });

      return {
        id: result.id || `sprint-${Date.now()}`,
        projectId: data.projectId,
        name: data.name,
        goal: data.goal,
        startDate: data.startDate,
        endDate: data.endDate,
        status: 'PLANNING',
        plannedPoints: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: sprintKeys.list(variables.projectId) });
    },
  });
}

export function useUpdateSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Sprint>;
    }): Promise<Sprint> => {
      await apiService.updateSprint(id, {
        ...data,
        updatedAt: new Date().toISOString(),
      });

      return {
        id,
        ...data,
        updatedAt: new Date().toISOString(),
      } as Sprint;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: sprintKeys.all });
      queryClient.invalidateQueries({ queryKey: sprintKeys.detail(id) });
    },
  });
}

export function useStartSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<Sprint> => {
      await apiService.startSprint(id);
      const data = await apiService.getSprint(id);

      return {
        id: data?.id || id,
        projectId: data?.projectId || '',
        name: data?.name || '',
        goal: data?.goal || '',
        startDate: data?.startDate || '',
        endDate: data?.endDate || '',
        status: 'ACTIVE',
        velocity: data?.velocity || 0,
        plannedPoints: data?.plannedPoints || 0,
        createdAt: data?.createdAt || '',
        updatedAt: new Date().toISOString(),
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sprintKeys.all });
    },
  });
}

export function useCompleteSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<Sprint> => {
      await apiService.completeSprint(id);
      const data = await apiService.getSprint(id);

      return {
        id: data?.id || id,
        projectId: data?.projectId || '',
        name: data?.name || '',
        goal: data?.goal || '',
        startDate: data?.startDate || '',
        endDate: data?.endDate || '',
        status: 'COMPLETED',
        velocity: data?.velocity || 0,
        plannedPoints: data?.plannedPoints || 0,
        createdAt: data?.createdAt || '',
        updatedAt: new Date().toISOString(),
      };
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: sprintKeys.all });
      queryClient.invalidateQueries({ queryKey: sprintKeys.detail(id) });
    },
  });
}

export function useDeleteSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await apiService.deleteSprint(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sprintKeys.all });
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    },
  });
}

export function useAssignToSprint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      storyId,
      sprintId,
    }: {
      storyId: string;
      sprintId: string | null;
    }): Promise<void> => {
      // TODO: Implement via API when endpoint is available
      // For now, this is a no-op as we don't have a backend endpoint
      console.warn('useAssignToSprint: Backend endpoint not implemented yet');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sprintKeys.all });
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    },
  });
}
