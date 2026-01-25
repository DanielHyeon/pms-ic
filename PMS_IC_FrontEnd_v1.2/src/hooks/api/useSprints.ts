import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sprint, SprintFormData, SprintWithItems, UserStory } from '../../types/backlog';

// Initial mock data for development
const initialSprints: Sprint[] = [
  {
    id: 'sprint-1',
    projectId: 'proj-001',
    name: 'Sprint 1',
    goal: 'OCR 기본 기능 구현',
    startDate: '2026-01-06',
    endDate: '2026-01-19',
    status: 'COMPLETED',
    velocity: 21,
    plannedPoints: 24,
    createdAt: '2026-01-06T00:00:00Z',
    updatedAt: '2026-01-19T00:00:00Z',
  },
  {
    id: 'sprint-2',
    projectId: 'proj-001',
    name: 'Sprint 2',
    goal: 'OCR 정확도 개선 및 문서 분류',
    startDate: '2026-01-20',
    endDate: '2026-02-02',
    status: 'ACTIVE',
    velocity: 0,
    plannedPoints: 26,
    createdAt: '2026-01-20T00:00:00Z',
    updatedAt: '2026-01-25T00:00:00Z',
  },
  {
    id: 'sprint-3',
    projectId: 'proj-001',
    name: 'Sprint 3',
    goal: 'AI 판단 엔진 기초 구현',
    startDate: '2026-02-03',
    endDate: '2026-02-16',
    status: 'PLANNING',
    plannedPoints: 0,
    createdAt: '2026-01-25T00:00:00Z',
    updatedAt: '2026-01-25T00:00:00Z',
  },
];

const STORAGE_KEY = 'backlog_sprints';

export const sprintKeys = {
  all: ['sprints'] as const,
  lists: () => [...sprintKeys.all, 'list'] as const,
  list: (filters?: object) => [...sprintKeys.lists(), filters] as const,
  details: () => [...sprintKeys.all, 'detail'] as const,
  detail: (id: string) => [...sprintKeys.details(), id] as const,
  active: (projectId: string) => [...sprintKeys.lists(), { projectId, active: true }] as const,
  withItems: (id: string) => [...sprintKeys.detail(id), 'items'] as const,
};

function loadSprintsFromStorage(): Sprint[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : initialSprints;
  } catch {
    return initialSprints;
  }
}

function saveSprintsToStorage(sprints: Sprint[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sprints));
}

export function useSprints(projectId?: string) {
  return useQuery<Sprint[]>({
    queryKey: sprintKeys.list({ projectId }),
    queryFn: async () => {
      const sprints = loadSprintsFromStorage();
      if (projectId) {
        return sprints.filter((s) => s.projectId === projectId);
      }
      return sprints;
    },
  });
}

export function useSprint(id: string) {
  return useQuery<Sprint | undefined>({
    queryKey: sprintKeys.detail(id),
    queryFn: async () => {
      const sprints = loadSprintsFromStorage();
      return sprints.find((s) => s.id === id);
    },
    enabled: !!id,
  });
}

export function useActiveSprint(projectId: string) {
  return useQuery<Sprint | undefined>({
    queryKey: sprintKeys.active(projectId),
    queryFn: async () => {
      const sprints = loadSprintsFromStorage();
      return sprints.find((s) => s.projectId === projectId && s.status === 'ACTIVE');
    },
    enabled: !!projectId,
  });
}

export function useSprintWithItems(id: string) {
  return useQuery<SprintWithItems | undefined>({
    queryKey: sprintKeys.withItems(id),
    queryFn: async () => {
      const sprints = loadSprintsFromStorage();
      const sprint = sprints.find((s) => s.id === id);
      if (!sprint) return undefined;

      // Load stories for this sprint
      const storiesData = localStorage.getItem('backlog_stories');
      const allStories: UserStory[] = storiesData ? JSON.parse(storiesData) : [];
      const sprintStories = allStories.filter((s) => s.sprintId === id);

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
      const sprints = loadSprintsFromStorage();

      const newSprint: Sprint = {
        id: `sprint-${Date.now()}`,
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

      const updated = [...sprints, newSprint];
      saveSprintsToStorage(updated);
      return newSprint;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sprintKeys.all });
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
      const sprints = loadSprintsFromStorage();
      const idx = sprints.findIndex((s) => s.id === id);
      if (idx === -1) throw new Error('Sprint not found');

      const updated = {
        ...sprints[idx],
        ...data,
        updatedAt: new Date().toISOString(),
      };

      sprints[idx] = updated;
      saveSprintsToStorage(sprints);
      return updated;
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
      const sprints = loadSprintsFromStorage();

      // End any currently active sprint in the same project
      const sprintToStart = sprints.find((s) => s.id === id);
      if (!sprintToStart) throw new Error('Sprint not found');

      const updatedSprints = sprints.map((s) => {
        if (s.projectId === sprintToStart.projectId && s.status === 'ACTIVE') {
          return { ...s, status: 'COMPLETED' as const, updatedAt: new Date().toISOString() };
        }
        if (s.id === id) {
          return { ...s, status: 'ACTIVE' as const, updatedAt: new Date().toISOString() };
        }
        return s;
      });

      saveSprintsToStorage(updatedSprints);
      return updatedSprints.find((s) => s.id === id)!;
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
      const sprints = loadSprintsFromStorage();
      const idx = sprints.findIndex((s) => s.id === id);
      if (idx === -1) throw new Error('Sprint not found');

      // Calculate velocity from completed stories
      const storiesData = localStorage.getItem('backlog_stories');
      const allStories: UserStory[] = storiesData ? JSON.parse(storiesData) : [];
      const sprintStories = allStories.filter((s) => s.sprintId === id);
      const velocity = sprintStories
        .filter((s) => s.status === 'DONE')
        .reduce((sum, s) => sum + (s.storyPoints || 0), 0);

      const updated = {
        ...sprints[idx],
        status: 'COMPLETED' as const,
        velocity,
        updatedAt: new Date().toISOString(),
      };

      sprints[idx] = updated;
      saveSprintsToStorage(sprints);
      return updated;
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
      const sprints = loadSprintsFromStorage();
      const updated = sprints.filter((s) => s.id !== id);
      saveSprintsToStorage(updated);

      // Remove sprint reference from stories
      const storiesData = localStorage.getItem('backlog_stories');
      if (storiesData) {
        const stories: UserStory[] = JSON.parse(storiesData);
        const updatedStories = stories.map((s) =>
          s.sprintId === id ? { ...s, sprintId: undefined, status: 'BACKLOG' as const } : s
        );
        localStorage.setItem('backlog_stories', JSON.stringify(updatedStories));
      }
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
      const storiesData = localStorage.getItem('backlog_stories');
      if (!storiesData) return;

      const stories: UserStory[] = JSON.parse(storiesData);
      const updatedStories = stories.map((s) =>
        s.id === storyId
          ? {
              ...s,
              sprintId: sprintId || undefined,
              status: sprintId ? ('IN_SPRINT' as const) : ('BACKLOG' as const),
            }
          : s
      );

      localStorage.setItem('backlog_stories', JSON.stringify(updatedStories));

      // Update sprint's planned points
      if (sprintId) {
        const sprints = loadSprintsFromStorage();
        const sprintStories = updatedStories.filter((s) => s.sprintId === sprintId);
        const plannedPoints = sprintStories.reduce((sum, s) => sum + (s.storyPoints || 0), 0);

        const updatedSprints = sprints.map((s) =>
          s.id === sprintId ? { ...s, plannedPoints, updatedAt: new Date().toISOString() } : s
        );
        saveSprintsToStorage(updatedSprints);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sprintKeys.all });
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    },
  });
}
