import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Epic,
  EpicFormData,
  EpicWithChildren,
  Feature,
  UserStory,
} from '../../types/backlog';

// Initial mock data for development
const initialEpics: Epic[] = [
  {
    id: 'epic-1',
    projectId: 'proj-001',
    phaseId: 'phase-2',
    name: 'AI 기반 자동 심사 시스템 구축',
    description: '보험금 청구 자동 심사를 위한 AI 엔진 개발',
    status: 'IN_PROGRESS',
    priority: 'CRITICAL',
    startDate: '2026-01-15',
    targetDate: '2026-04-30',
    progress: 35,
    order: 1,
    color: '#3B82F6',
    createdAt: '2026-01-15T00:00:00Z',
    updatedAt: '2026-01-25T00:00:00Z',
  },
  {
    id: 'epic-2',
    projectId: 'proj-001',
    phaseId: 'phase-2',
    name: 'OCR 문서 인식 엔진',
    description: '진단서, 영수증 등 의료 문서 자동 인식',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    startDate: '2026-01-20',
    targetDate: '2026-03-15',
    progress: 50,
    order: 2,
    color: '#10B981',
    createdAt: '2026-01-20T00:00:00Z',
    updatedAt: '2026-01-25T00:00:00Z',
  },
  {
    id: 'epic-3',
    projectId: 'proj-001',
    phaseId: 'phase-3',
    name: '데이터 파이프라인 구축',
    description: '학습 데이터 수집, 정제, 라벨링 자동화',
    status: 'OPEN',
    priority: 'MEDIUM',
    startDate: '2026-02-01',
    targetDate: '2026-03-31',
    progress: 10,
    order: 3,
    color: '#F59E0B',
    createdAt: '2026-01-25T00:00:00Z',
    updatedAt: '2026-01-25T00:00:00Z',
  },
];

const STORAGE_KEY = 'backlog_epics';

export const epicKeys = {
  all: ['epics'] as const,
  lists: () => [...epicKeys.all, 'list'] as const,
  list: (filters?: object) => [...epicKeys.lists(), filters] as const,
  details: () => [...epicKeys.all, 'detail'] as const,
  detail: (id: string) => [...epicKeys.details(), id] as const,
  withChildren: (id: string) => [...epicKeys.detail(id), 'children'] as const,
};

function loadEpicsFromStorage(): Epic[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : initialEpics;
  } catch {
    return initialEpics;
  }
}

function saveEpicsToStorage(epics: Epic[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(epics));
}

export function useEpics(projectId?: string) {
  return useQuery<Epic[]>({
    queryKey: epicKeys.list({ projectId }),
    queryFn: async () => {
      const epics = loadEpicsFromStorage();
      if (projectId) {
        return epics.filter((e) => e.projectId === projectId);
      }
      return epics;
    },
  });
}

export function useEpic(id: string) {
  return useQuery<Epic | undefined>({
    queryKey: epicKeys.detail(id),
    queryFn: async () => {
      const epics = loadEpicsFromStorage();
      return epics.find((e) => e.id === id);
    },
    enabled: !!id,
  });
}

export function useEpicWithChildren(id: string) {
  return useQuery<EpicWithChildren | undefined>({
    queryKey: epicKeys.withChildren(id),
    queryFn: async () => {
      const epics = loadEpicsFromStorage();
      const epic = epics.find((e) => e.id === id);
      if (!epic) return undefined;

      // Load features for this epic
      const featuresData = localStorage.getItem('backlog_features');
      const features: Feature[] = featuresData ? JSON.parse(featuresData) : [];
      const epicFeatures = features.filter((f) => f.epicId === id);

      // Load stories for features
      const storiesData = localStorage.getItem('backlog_stories');
      const stories: UserStory[] = storiesData ? JSON.parse(storiesData) : [];

      return {
        ...epic,
        features: epicFeatures.map((feature) => {
          const featureStories = stories.filter((s) => s.featureId === feature.id);
          return {
            ...feature,
            stories: featureStories.map((story) => ({
              ...story,
              tasks: [], // Tasks would be loaded separately
              totalTasks: 0,
              completedTasks: 0,
            })),
            totalStories: featureStories.length,
            completedStories: featureStories.filter((s) => s.status === 'DONE').length,
          };
        }),
        totalStories: stories.filter((s) => s.epicId === id).length,
        completedStories: stories.filter((s) => s.epicId === id && s.status === 'DONE').length,
        totalPoints: stories
          .filter((s) => s.epicId === id)
          .reduce((sum, s) => sum + (s.storyPoints || 0), 0),
        completedPoints: stories
          .filter((s) => s.epicId === id && s.status === 'DONE')
          .reduce((sum, s) => sum + (s.storyPoints || 0), 0),
      };
    },
    enabled: !!id,
  });
}

export function useCreateEpic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: EpicFormData & { projectId: string }): Promise<Epic> => {
      const epics = loadEpicsFromStorage();
      const newEpic: Epic = {
        id: `epic-${Date.now()}`,
        projectId: data.projectId,
        phaseId: data.phaseId,
        name: data.name,
        description: data.description,
        status: 'OPEN',
        priority: data.priority,
        startDate: data.startDate,
        targetDate: data.targetDate,
        progress: 0,
        order: epics.length + 1,
        color: data.color,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updated = [...epics, newEpic];
      saveEpicsToStorage(updated);
      return newEpic;
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
      const epics = loadEpicsFromStorage();
      const idx = epics.findIndex((e) => e.id === id);
      if (idx === -1) throw new Error('Epic not found');

      const updated = {
        ...epics[idx],
        ...data,
        updatedAt: new Date().toISOString(),
      };

      epics[idx] = updated;
      saveEpicsToStorage(epics);
      return updated;
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
      const epics = loadEpicsFromStorage();
      const updated = epics.filter((e) => e.id !== id);
      saveEpicsToStorage(updated);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: epicKeys.all });
    },
  });
}

export function useReorderEpics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderedIds: string[]): Promise<Epic[]> => {
      const epics = loadEpicsFromStorage();
      const reordered = orderedIds.map((id, idx) => {
        const epic = epics.find((e) => e.id === id);
        if (!epic) throw new Error(`Epic ${id} not found`);
        return { ...epic, order: idx + 1, updatedAt: new Date().toISOString() };
      });

      saveEpicsToStorage(reordered);
      return reordered;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: epicKeys.all });
    },
  });
}
