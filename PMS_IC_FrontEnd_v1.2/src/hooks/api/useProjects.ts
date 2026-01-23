import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { Project } from '../../types/project';

// Query keys factory
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (filters?: object) => [...projectKeys.lists(), filters] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
  fullList: () => [...projectKeys.all, 'full-list'] as const,
};

// Mock data for fallback
const mockProjects: Project[] = [
  {
    id: '1',
    name: 'AI 기반 손해보험 지급심사 자동화',
    code: 'INS-AI-2025-001',
    description: 'AI/ML 기술을 활용한 보험금 청구 자동 심사 시스템 구축',
    status: 'IN_PROGRESS',
    startDate: '2025-01-02',
    endDate: '2025-12-31',
    budget: 5000000000,
    progress: 62,
    managerId: 'user-001',
    managerName: '김철수',
    isDefault: true,
    createdAt: '2025-01-02T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z',
  },
  {
    id: '2',
    name: '차세대 고객관리 시스템',
    code: 'CRM-2025-001',
    description: '통합 고객 관리 시스템 고도화',
    status: 'PLANNING',
    startDate: '2025-03-01',
    endDate: '2025-09-30',
    budget: 2000000000,
    progress: 0,
    managerId: 'user-002',
    managerName: '이영희',
    isDefault: false,
    createdAt: '2025-01-10T00:00:00Z',
    updatedAt: '2025-01-10T00:00:00Z',
  },
  {
    id: '3',
    name: '데이터 품질 고도화',
    code: 'DQ-2024-001',
    description: '전사 데이터 품질 관리 체계 구축',
    status: 'COMPLETED',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    budget: 1500000000,
    progress: 100,
    managerId: 'user-001',
    managerName: '김철수',
    isDefault: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-12-31T00:00:00Z',
  },
];

// Get all projects (basic list)
export function useProjects() {
  return useQuery({
    queryKey: projectKeys.lists(),
    queryFn: () => apiService.getProjects(),
  });
}

// Get all projects with full details
export function useProjectsWithDetails() {
  return useQuery<Project[]>({
    queryKey: projectKeys.fullList(),
    queryFn: async () => {
      try {
        const projectList = await apiService.getProjects();
        const fullProjects = await Promise.all(
          projectList.map((p: { id: string }) => apiService.getProject(p.id))
        );
        return fullProjects;
      } catch {
        return mockProjects;
      }
    },
  });
}

// Get single project
export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => apiService.getProject(id),
    enabled: !!id,
  });
}

// Create project
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof apiService.createProject>[0]) =>
      apiService.createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

// Update project
export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof apiService.updateProject>[1] }) =>
      apiService.updateProject(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

// Delete project
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiService.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

// Set default project
export function useSetDefaultProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiService.setDefaultProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}
