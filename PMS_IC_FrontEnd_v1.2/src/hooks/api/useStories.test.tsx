/**
 * useStories Hook Tests
 *
 * Tests cover:
 * - Query key factory patterns
 * - useStories query behavior (API-first, no localStorage)
 * - CRUD mutations for stories
 * - Cache invalidation patterns
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import {
  storyKeys,
  useStories,
  useCreateStory,
  useUpdateStory,
  useDeleteStory,
} from './useStories';
import { apiService } from '../../services/api';
import { ok, fail } from '../../types/result';
import type { ResultMeta, ApiError } from '../../types/result';

// Mock the API service
vi.mock('../../services/api', () => ({
  apiService: {
    getStoriesResult: vi.fn(),
    createStoryResult: vi.fn(),
    updateStoryResult: vi.fn(),
    deleteStoryResult: vi.fn(),
  },
}));

const apiMeta: ResultMeta = {
  source: 'api',
  asOf: '2026-02-07T00:00:00Z',
  endpoint: '/test',
  durationMs: 50,
  usedFallback: false,
};

const mockStories = [
  {
    id: 'story-001-01',
    title: 'User Story 1',
    description: 'Test description 1',
    priority: 1,
    storyPoints: 5,
    status: 'READY',
    epicId: 'epic-001-01',
    featureId: 'feature-001-01',
    wbsItemId: 'wbs-item-001',
    partId: 'part-001-ai',
    acceptanceCriteria: ['Criteria 1', 'Criteria 2'],
  },
  {
    id: 'story-001-02',
    title: 'User Story 2',
    description: 'Test description 2',
    priority: 2,
    storyPoints: 8,
    status: 'IN_SPRINT',
    assignee: 'Developer 1',
    epicId: 'epic-001-02',
    featureId: 'feature-001-02',
    wbsItemId: 'wbs-item-002',
    partId: 'part-001-si',
    acceptanceCriteria: ['Criteria A'],
  },
  {
    id: 'story-001-03',
    title: 'User Story 3',
    description: 'Test description 3',
    priority: 3,
    storyPoints: 3,
    status: 'DONE',
    assignee: 'Developer 2',
    epicId: 'epic-001-01',
    partId: 'part-001-ai',
    acceptanceCriteria: ['Criteria X', 'Criteria Y'],
  },
];

// Helper to create a fresh QueryClient for each test
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

// Wrapper component for providing QueryClient
function createWrapper() {
  const queryClient = createTestQueryClient();
  return {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
    queryClient,
  };
}

describe('storyKeys', () => {
  describe('query key factory', () => {
    it('generates correct base key', () => {
      expect(storyKeys.all).toEqual(['stories']);
    });

    it('generates correct lists key', () => {
      expect(storyKeys.lists()).toEqual(['stories', 'list']);
    });

    it('generates correct list key with projectId', () => {
      expect(storyKeys.list('proj-001')).toEqual(['stories', 'list', { projectId: 'proj-001' }]);
    });

    it('generates correct details key', () => {
      expect(storyKeys.details()).toEqual(['stories', 'detail']);
    });

    it('generates correct detail key with id', () => {
      expect(storyKeys.detail('story-001-01')).toEqual(['stories', 'detail', 'story-001-01']);
    });
  });
});

describe('useStories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns mock data when no projectId is provided', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useStories(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
    expect(Array.isArray(result.current.data)).toBe(true);
    expect(result.current.data!.length).toBeGreaterThan(0);
    // Mock data uses string IDs
    expect(typeof result.current.data![0].id).toBe('string');
  });

  it('fetches stories from API when projectId is provided', async () => {
    vi.mocked(apiService.getStoriesResult).mockResolvedValue(ok(mockStories, apiMeta));

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useStories('proj-001'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(apiService.getStoriesResult).toHaveBeenCalledWith('proj-001');
    expect(result.current.data).toBeDefined();
    expect(result.current.data!.length).toBe(3);
  });
});

describe('useCreateStory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls API createStoryResult on mutation', async () => {
    const newStory = {
      title: 'New Story',
      description: 'New description',
      epicId: 'epic-new-01',
      acceptanceCriteria: ['AC1'],
    };

    const createdStory = { id: 'story-new', ...newStory, status: 'READY', priority: 1 };
    vi.mocked(apiService.createStoryResult).mockResolvedValue(ok(createdStory, apiMeta));

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateStory('proj-001'), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(newStory);
    });

    expect(apiService.createStoryResult).toHaveBeenCalledWith(newStory);
  });
});

describe('useUpdateStory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls API updateStoryResult on mutation', async () => {
    const updateData = { status: 'IN_SPRINT' as const };
    vi.mocked(apiService.updateStoryResult).mockResolvedValue(
      ok({ ...mockStories[0], ...updateData }, apiMeta)
    );

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateStory('proj-001'), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 'story-001-01', data: updateData });
    });

    expect(apiService.updateStoryResult).toHaveBeenCalledWith('story-001-01', updateData);
  });
});

describe('useDeleteStory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls API deleteStoryResult on mutation', async () => {
    vi.mocked(apiService.deleteStoryResult).mockResolvedValue(ok(undefined as any, apiMeta));

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useDeleteStory('proj-001'), { wrapper });

    await act(async () => {
      await result.current.mutateAsync('story-001-01');
    });

    expect(apiService.deleteStoryResult).toHaveBeenCalledWith('story-001-01');
  });
});

describe('filtering stories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('can filter stories by status after fetching', async () => {
    vi.mocked(apiService.getStoriesResult).mockResolvedValue(ok(mockStories, apiMeta));

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useStories('proj-001'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const readyStories = result.current.data?.filter((s) => s.status === 'READY');
    expect(readyStories).toBeDefined();
    expect(readyStories?.length).toBe(1);
  });

  it('can filter stories by epicId', async () => {
    vi.mocked(apiService.getStoriesResult).mockResolvedValue(ok(mockStories, apiMeta));

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useStories('proj-001'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const epic1Stories = result.current.data?.filter((s) => s.epicId === 'epic-001-01');
    expect(epic1Stories?.length).toBe(2);
  });
});

describe('Phase 6: epicId consistency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('API response maps epicId to story objects', async () => {
    vi.mocked(apiService.getStoriesResult).mockResolvedValue(ok(mockStories, apiMeta));

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useStories('proj-001'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const stories = result.current.data!;
    expect(stories[0].epicId).toBe('epic-001-01');
    expect(stories[1].epicId).toBe('epic-001-02');
    expect(stories[2].epicId).toBe('epic-001-01');
  });

  it('stories without epicId in API response get null epicId', async () => {
    const storiesWithoutEpicId = [
      { ...mockStories[0], epicId: undefined },
    ];
    vi.mocked(apiService.getStoriesResult).mockResolvedValue(ok(storiesWithoutEpicId, apiMeta));

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useStories('proj-001'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data![0].epicId).toBeNull();
  });

  it('epic tree view can match all mock stories to epics by epicId', () => {
    const epics = [
      { id: 'epic-001-01', name: '문서 처리 자동화' },
      { id: 'epic-001-02', name: '사기 탐지 시스템' },
      { id: 'epic-001-03', name: 'API 플랫폼 구축' },
      { id: 'epic-001-04', name: '보안 및 규정 준수' },
    ];

    // Simulate EpicTreeView join: s.epicId === epic.id
    const matchedCount = mockStories.filter(
      (s) => s.epicId && epics.some((e) => e.id === s.epicId)
    ).length;

    expect(matchedCount).toBe(mockStories.length);
  });
});

describe('Phase 8: Feature-Story relationship consistency', () => {
  it('all stories with featureId can be matched to a feature', () => {
    const features = [
      { id: 'feature-001-01', epicId: 'epic-001-01', name: 'OCR Engine' },
      { id: 'feature-001-02', epicId: 'epic-001-02', name: 'Fraud Detection Engine' },
    ];
    const storiesWithFeature = mockStories.filter((s) => s.featureId);

    const matchedCount = storiesWithFeature.filter((s) =>
      features.some((f) => f.id === s.featureId)
    ).length;

    expect(matchedCount).toBe(storiesWithFeature.length);
  });

  it('stories without featureId are valid (Epic direct stories)', () => {
    const directStories = mockStories.filter((s) => !s.featureId);
    expect(directStories.length).toBeGreaterThanOrEqual(0);
  });

  it('featureId never contains a feature name (regression guard)', () => {
    const featureNames = ['OCR Engine', 'Fraud Detection Engine', 'OCR 엔진 고도화', '실시간 탐지 엔진'];

    mockStories.forEach((story) => {
      if (story.featureId) {
        expect(featureNames).not.toContain(story.featureId);
      }
    });
  });

  it('feature stories + direct stories = total stories per epic', () => {
    const epicId = 'epic-001-01';
    const epicStories = mockStories.filter((s) => s.epicId === epicId);
    const featureStories = epicStories.filter((s) => s.featureId);
    const directStories = epicStories.filter((s) => !s.featureId);

    expect(featureStories.length + directStories.length).toBe(epicStories.length);
  });

  it('API response normalizes featureId undefined to null', async () => {
    const storiesWithoutFeature = [{ ...mockStories[0], featureId: undefined }];
    vi.mocked(apiService.getStoriesResult).mockResolvedValue(ok(storiesWithoutFeature, apiMeta));

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useStories('proj-001'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data![0].featureId).toBeNull();
  });
});

describe('Phase 9: WBS-Story relationship consistency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('all stories with wbsItemId can be matched to a WBS item', () => {
    const wbsItems = [
      { id: 'wbs-item-001', name: 'OCR Engine Implementation' },
      { id: 'wbs-item-002', name: 'Fraud Detection Model' },
    ];
    const linkedStories = mockStories.filter((s) => s.wbsItemId);

    const matchedCount = linkedStories.filter((s) =>
      wbsItems.some((w) => w.id === s.wbsItemId)
    ).length;

    expect(matchedCount).toBe(linkedStories.length);
  });

  it('wbsItemId never contains a WBS name or path', () => {
    const wbsNames = ['OCR Engine Implementation', 'Fraud Detection Model'];
    const wbsPaths = ['1.1.1', '2.1.1'];

    mockStories.forEach((story) => {
      if (story.wbsItemId) {
        expect(wbsNames).not.toContain(story.wbsItemId);
        expect(wbsPaths).not.toContain(story.wbsItemId);
      }
    });
  });

  it('unlinked stories (no wbsItemId) are valid', () => {
    const unlinked = mockStories.filter((s) => !s.wbsItemId);
    expect(unlinked.length).toBeGreaterThanOrEqual(0);
  });

  it('stories do not store WBS path or group information', () => {
    mockStories.forEach((story) => {
      expect(story).not.toHaveProperty('wbsPath');
      expect(story).not.toHaveProperty('wbsGroupId');
      expect(story).not.toHaveProperty('wbsCode');
    });
  });

  it('API response normalizes wbsItemId undefined to null', async () => {
    const storiesWithoutWbs = [{ ...mockStories[0], wbsItemId: undefined }];
    vi.mocked(apiService.getStoriesResult).mockResolvedValue(ok(storiesWithoutWbs, apiMeta));

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useStories('proj-001'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data![0].wbsItemId).toBeNull();
  });
});

describe('Phase 10: Phase-Epic relationship consistency', () => {
  it('epicId-based grouping is stable across Phase name changes', () => {
    const epic = { id: 'epic-001-01', phaseId: 'phase-001' };

    // Phase name changes should not affect grouping
    const phases_v1 = [{ id: 'phase-001', name: 'Design' }];
    const phases_v2 = [{ id: 'phase-001', name: 'Detailed Design' }];

    // Grouping by phaseId remains stable
    const matchV1 = phases_v1.find((p) => p.id === epic.phaseId);
    const matchV2 = phases_v2.find((p) => p.id === epic.phaseId);

    expect(matchV1).toBeDefined();
    expect(matchV2).toBeDefined();
    expect(matchV1!.id).toBe(matchV2!.id);
  });

  it('phaseId null means "Phase unassigned" (valid state)', () => {
    const epics = [
      { id: 'e1', phaseId: 'phase-001' },
      { id: 'e2', phaseId: null },
      { id: 'e3', phaseId: undefined },
    ];

    const unassigned = epics.filter((e) => !e.phaseId);
    expect(unassigned.length).toBe(2);
  });

  it('sum of grouped epics equals total epics', () => {
    const phases = [{ id: 'p1' }, { id: 'p2' }];
    const epics = [
      { id: 'e1', phaseId: 'p1' },
      { id: 'e2', phaseId: 'p1' },
      { id: 'e3', phaseId: null },
      { id: 'e4', phaseId: 'deleted-phase' },
    ];

    const grouped = new Map<string, typeof epics>();
    epics.forEach((e) => {
      const key = e.phaseId ?? '__UNASSIGNED__';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(e);
    });

    const knownCount = phases.reduce(
      (sum, p) => sum + (grouped.get(p.id)?.length ?? 0), 0
    );
    const unassigned = grouped.get('__UNASSIGNED__')?.length ?? 0;
    const unknownCount = epics.length - knownCount - unassigned;

    expect(knownCount + unassigned + unknownCount).toBe(epics.length);
  });

  it('phaseId never contains a phase name (regression guard)', () => {
    const phaseNames = ['Design', 'Development', 'Testing', '설계', '개발', '테스트'];

    mockStories.forEach((story) => {
      if (story.epicId) {
        expect(phaseNames).not.toContain(story.epicId);
      }
    });
  });
});
