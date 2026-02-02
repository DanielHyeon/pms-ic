/**
 * useProjects Hook Tests
 *
 * Tests cover:
 * - Query key factory patterns
 * - useProjects query behavior
 * - useProject single query with enabled flag
 * - Mutation hooks (create, update, delete)
 * - Cache invalidation on mutations
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import {
  projectKeys,
  useProjects,
  useProject,
  useProjectsWithDetails,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useSetDefaultProject,
} from './useProjects';
import { apiService } from '../../services/api';

// Mock the API service
vi.mock('../../services/api', () => ({
  apiService: {
    getProjects: vi.fn(),
    getProject: vi.fn(),
    createProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
    setDefaultProject: vi.fn(),
  },
}));

const mockProjects = [
  {
    id: '1',
    name: 'Project Alpha',
    code: 'PA-001',
    status: 'IN_PROGRESS',
    progress: 50,
  },
  {
    id: '2',
    name: 'Project Beta',
    code: 'PB-001',
    status: 'PLANNING',
    progress: 0,
  },
];

const mockProjectDetail = {
  id: '1',
  name: 'Project Alpha',
  code: 'PA-001',
  description: 'Test project',
  status: 'IN_PROGRESS',
  startDate: '2025-01-01',
  endDate: '2025-12-31',
  budget: 1000000,
  progress: 50,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-15T00:00:00Z',
};

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

describe('projectKeys', () => {
  describe('query key factory', () => {
    it('generates correct base key', () => {
      expect(projectKeys.all).toEqual(['projects']);
    });

    it('generates correct lists key', () => {
      expect(projectKeys.lists()).toEqual(['projects', 'list']);
    });

    it('generates correct list key with filters', () => {
      const filters = { status: 'IN_PROGRESS' };
      expect(projectKeys.list(filters)).toEqual(['projects', 'list', filters]);
    });

    it('generates correct details key', () => {
      expect(projectKeys.details()).toEqual(['projects', 'detail']);
    });

    it('generates correct detail key with id', () => {
      expect(projectKeys.detail('123')).toEqual(['projects', 'detail', '123']);
    });

    it('generates correct fullList key', () => {
      expect(projectKeys.fullList()).toEqual(['projects', 'full-list']);
    });
  });
});

describe('useProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches projects successfully', async () => {
    vi.mocked(apiService.getProjects).mockResolvedValue(mockProjects);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useProjects(), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockProjects);
    expect(apiService.getProjects).toHaveBeenCalledTimes(1);
  });

  it('handles fetch error', async () => {
    const error = new Error('Network error');
    vi.mocked(apiService.getProjects).mockRejectedValue(error);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useProjects(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });

  it('uses correct query key', async () => {
    vi.mocked(apiService.getProjects).mockResolvedValue(mockProjects);

    const { wrapper, queryClient } = createWrapper();
    renderHook(() => useProjects(), { wrapper });

    await waitFor(() => {
      expect(queryClient.getQueryData(projectKeys.lists())).toEqual(mockProjects);
    });
  });
});

describe('useProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches single project successfully', async () => {
    vi.mocked(apiService.getProject).mockResolvedValue(mockProjectDetail);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useProject('1'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockProjectDetail);
    expect(apiService.getProject).toHaveBeenCalledWith('1');
  });

  it('does not fetch when id is empty', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useProject(''), { wrapper });

    // Should not be loading because query is disabled
    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe('idle');
    expect(apiService.getProject).not.toHaveBeenCalled();
  });

  it('uses correct query key', async () => {
    vi.mocked(apiService.getProject).mockResolvedValue(mockProjectDetail);

    const { wrapper, queryClient } = createWrapper();
    renderHook(() => useProject('1'), { wrapper });

    await waitFor(() => {
      expect(queryClient.getQueryData(projectKeys.detail('1'))).toEqual(mockProjectDetail);
    });
  });
});

describe('useProjectsWithDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches all projects with full details', async () => {
    vi.mocked(apiService.getProjects).mockResolvedValue(mockProjects);
    vi.mocked(apiService.getProject).mockImplementation((id) =>
      Promise.resolve({ ...mockProjectDetail, id })
    );

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useProjectsWithDetails(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(2);
    expect(apiService.getProjects).toHaveBeenCalledTimes(1);
    expect(apiService.getProject).toHaveBeenCalledTimes(2);
  });

  it('falls back to mock data on error', async () => {
    vi.mocked(apiService.getProjects).mockRejectedValue(new Error('API Error'));

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useProjectsWithDetails(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should return mock data on failure
    expect(result.current.data).toBeDefined();
    expect(Array.isArray(result.current.data)).toBe(true);
  });
});

describe('useCreateProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates project successfully', async () => {
    const newProject = { name: 'New Project', code: 'NP-001' };
    const createdProject = { id: '3', ...newProject, status: 'PLANNING', progress: 0 };

    vi.mocked(apiService.createProject).mockResolvedValue(createdProject);

    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateProject(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(newProject);
    });

    expect(apiService.createProject).toHaveBeenCalledWith(newProject);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: projectKeys.lists() });
  });

  it('handles create error', async () => {
    const error = new Error('Create failed');
    vi.mocked(apiService.createProject).mockRejectedValue(error);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateProject(), { wrapper });

    await expect(
      act(async () => {
        await result.current.mutateAsync({ name: 'Test' });
      })
    ).rejects.toThrow('Create failed');
  });
});

describe('useUpdateProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates project successfully', async () => {
    const updateData = { name: 'Updated Project' };
    const updatedProject = { ...mockProjectDetail, ...updateData };

    vi.mocked(apiService.updateProject).mockResolvedValue(updatedProject);

    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateProject(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: '1', data: updateData });
    });

    expect(apiService.updateProject).toHaveBeenCalledWith('1', updateData);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: projectKeys.detail('1') });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: projectKeys.lists() });
  });
});

describe('useDeleteProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes project successfully', async () => {
    vi.mocked(apiService.deleteProject).mockResolvedValue(undefined);

    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeleteProject(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync('1');
    });

    expect(apiService.deleteProject).toHaveBeenCalledWith('1');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: projectKeys.lists() });
  });
});

describe('useSetDefaultProject', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets default project successfully', async () => {
    vi.mocked(apiService.setDefaultProject).mockResolvedValue(undefined);

    const { wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useSetDefaultProject(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync('1');
    });

    expect(apiService.setDefaultProject).toHaveBeenCalledWith('1');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: projectKeys.lists() });
  });
});

describe('cache behavior', () => {
  it('stores data in query cache after fetch', async () => {
    vi.mocked(apiService.getProjects).mockResolvedValue(mockProjects);

    const { wrapper, queryClient } = createWrapper();

    const { result } = renderHook(() => useProjects(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verify data is in the cache
    const cachedData = queryClient.getQueryData(projectKeys.lists());
    expect(cachedData).toEqual(mockProjects);
  });
});
