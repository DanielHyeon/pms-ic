/**
 * useStories Hook Tests
 *
 * Tests cover:
 * - Query key factory patterns
 * - useStories query behavior with localStorage persistence
 * - CRUD mutations for stories
 * - Cache invalidation patterns
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

// Mock the API service
vi.mock('../../services/api', () => ({
  apiService: {
    getStories: vi.fn(),
    getStory: vi.fn(),
    createStory: vi.fn(),
    updateStory: vi.fn(),
    deleteStory: vi.fn(),
  },
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

const mockStories = [
  {
    id: 1,
    title: 'User Story 1',
    description: 'Test description 1',
    priority: 1,
    storyPoints: 5,
    status: 'READY',
    epic: 'Epic 1',
    acceptanceCriteria: ['Criteria 1', 'Criteria 2'],
  },
  {
    id: 2,
    title: 'User Story 2',
    description: 'Test description 2',
    priority: 2,
    storyPoints: 8,
    status: 'IN_SPRINT',
    assignee: 'Developer 1',
    epic: 'Epic 2',
    acceptanceCriteria: ['Criteria A'],
  },
  {
    id: 3,
    title: 'User Story 3',
    description: 'Test description 3',
    priority: 3,
    storyPoints: 3,
    status: 'DONE',
    assignee: 'Developer 2',
    epic: 'Epic 1',
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

    it('generates correct list key with filters', () => {
      const filters = { status: 'READY', epic: 'Epic 1' };
      expect(storyKeys.list(filters)).toEqual(['stories', 'list', filters]);
    });

    it('generates correct details key', () => {
      expect(storyKeys.details()).toEqual(['stories', 'detail']);
    });

    it('generates correct detail key with id', () => {
      expect(storyKeys.detail(123)).toEqual(['stories', 'detail', 123]);
    });
  });
});

describe('useStories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  it('fetches stories successfully from API', async () => {
    vi.mocked(apiService.getStories).mockResolvedValue(mockStories);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useStories(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
    expect(Array.isArray(result.current.data)).toBe(true);
  });

  it('uses localStorage cached stories if available', async () => {
    const cachedStories = JSON.stringify(mockStories);
    localStorageMock.getItem.mockReturnValue(cachedStories);
    vi.mocked(apiService.getStories).mockResolvedValue([]);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useStories(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should use localStorage data
    expect(result.current.data).toEqual(mockStories);
  });

  it('returns initial stories when no localStorage and API fails', async () => {
    localStorageMock.getItem.mockReturnValue(null);
    vi.mocked(apiService.getStories).mockRejectedValue(new Error('API Error'));

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useStories(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should use initial stories from hook
    expect(result.current.data).toBeDefined();
    expect(Array.isArray(result.current.data)).toBe(true);
    expect(result.current.data!.length).toBeGreaterThan(0);
  });
});

describe('useCreateStory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('calls API createStory on mutation', async () => {
    const newStory = {
      title: 'New Story',
      description: 'New description',
      epic: 'New Epic',
      acceptanceCriteria: ['AC1'],
    };

    const createdStory = { id: 100, ...newStory, status: 'READY', priority: 1 };
    vi.mocked(apiService.createStory).mockResolvedValue(createdStory);

    const { wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(storyKeys.lists(), mockStories);

    const { result } = renderHook(() => useCreateStory(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(newStory);
    });

    expect(apiService.createStory).toHaveBeenCalledWith(newStory);
  });

  it('returns created story on successful creation', async () => {
    const newStory = {
      title: 'New Story',
      description: 'New description',
      epic: 'New Epic',
      acceptanceCriteria: ['AC1'],
    };

    const createdStory = { id: 100, ...newStory, status: 'READY', priority: 1 };
    vi.mocked(apiService.createStory).mockResolvedValue(createdStory);

    const { wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(storyKeys.lists(), mockStories);

    const { result } = renderHook(() => useCreateStory(), { wrapper });

    let response;
    await act(async () => {
      response = await result.current.mutateAsync(newStory);
    });

    expect(response).toEqual(createdStory);
  });
});

describe('useUpdateStory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('calls API updateStory on mutation', async () => {
    const updateData = { status: 'IN_SPRINT' };
    vi.mocked(apiService.updateStory).mockResolvedValue({ ...mockStories[0], ...updateData });

    const { wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(storyKeys.lists(), mockStories);

    const { result } = renderHook(() => useUpdateStory(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 1, data: updateData });
    });

    expect(apiService.updateStory).toHaveBeenCalledWith(1, updateData);
  });

  it('returns updated story on successful update', async () => {
    const updateData = { status: 'DONE' };
    const updatedStory = { ...mockStories[0], ...updateData };
    vi.mocked(apiService.updateStory).mockResolvedValue(updatedStory);

    const { wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(storyKeys.lists(), mockStories);

    const { result } = renderHook(() => useUpdateStory(), { wrapper });

    let response;
    await act(async () => {
      response = await result.current.mutateAsync({ id: 1, data: updateData });
    });

    expect(response).toEqual(updatedStory);
  });
});

describe('useDeleteStory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('calls API deleteStory on mutation', async () => {
    vi.mocked(apiService.deleteStory).mockResolvedValue(undefined);

    const { wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(storyKeys.lists(), mockStories);

    const { result } = renderHook(() => useDeleteStory(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync('1');
    });

    expect(apiService.deleteStory).toHaveBeenCalledWith('1');
  });

  it('resolves successfully on deletion', async () => {
    vi.mocked(apiService.deleteStory).mockResolvedValue(undefined);

    const { wrapper, queryClient } = createWrapper();
    queryClient.setQueryData(storyKeys.lists(), mockStories);

    const { result } = renderHook(() => useDeleteStory(), { wrapper });

    // The mutation should complete without throwing
    await act(async () => {
      await expect(result.current.mutateAsync('1')).resolves.not.toThrow();
    });
  });
});

describe('filtering stories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('can filter stories by status after fetching', async () => {
    localStorageMock.getItem.mockReturnValue(JSON.stringify(mockStories));

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useStories(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const readyStories = result.current.data?.filter((s) => s.status === 'READY');
    expect(readyStories).toBeDefined();
    expect(readyStories?.length).toBe(1);
  });

  it('can filter stories by epic', async () => {
    localStorageMock.getItem.mockReturnValue(JSON.stringify(mockStories));

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useStories(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const epic1Stories = result.current.data?.filter((s) => s.epic === 'Epic 1');
    expect(epic1Stories?.length).toBe(2);
  });
});

describe('cache behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('reuses cached data for same query', async () => {
    localStorageMock.getItem.mockReturnValue(JSON.stringify(mockStories));

    const { wrapper } = createWrapper();

    // First render
    const { result: result1 } = renderHook(() => useStories(), { wrapper });
    await waitFor(() => expect(result1.current.isSuccess).toBe(true));

    // Second render with same query
    const { result: result2 } = renderHook(() => useStories(), { wrapper });

    // Should use cached data
    expect(result2.current.data).toEqual(result1.current.data);
  });
});
