import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';

export const taskKeys = {
  all: ['tasks'] as const,
  kanban: (projectId?: string) => [...taskKeys.all, 'kanban', { projectId }] as const,
  columns: (projectId?: string) => [...taskKeys.all, 'columns', { projectId }] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
};

export function useTaskColumns(projectId?: string) {
  return useQuery({
    queryKey: taskKeys.columns(projectId),
    queryFn: () => apiService.getTaskColumns(projectId),
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ data, projectId }: { data: Record<string, unknown>; projectId?: string }) =>
      apiService.createTask(data, projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data, projectId }: { id: string; data: Record<string, unknown>; projectId?: string }) =>
      apiService.updateTask(id, data, projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, projectId }: { id: string; projectId?: string }) =>
      apiService.deleteTask(id, projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}

export function useMoveTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, targetColumn, projectId }: { taskId: string; targetColumn: string; projectId?: string }) =>
      apiService.moveTask(taskId, targetColumn, projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}

// Task interface for kanban board
export interface KanbanTask {
  id: string;
  title: string;
  assignee: string;
  assigneeId?: string;
  priority: 'high' | 'medium' | 'low';
  storyPoints: number;
  dueDate: string;
  isFirefighting?: boolean;
  labels: string[];
  status: string;
}

export interface KanbanColumn {
  id: string;
  title: string;
  tasks: KanbanTask[];
}

// Hook to fetch tasks for a specific project and organize into kanban columns
export function useKanbanTasks(projectId?: string) {
  return useQuery({
    queryKey: taskKeys.kanban(projectId),
    queryFn: async () => {
      const response = await apiService.getTasks(projectId) as unknown;
      // Handle both wrapped { data: [...] } and direct array responses
      const tasks = (response && typeof response === 'object' && 'data' in response
        ? (response as { data: unknown[] }).data
        : response) || [];

      if (!Array.isArray(tasks)) return [];

      // Map API tasks to KanbanTask format
      return tasks.map((task: Record<string, unknown>): KanbanTask => {
        // Handle tags - can be string (comma-separated) or array
        let labels: string[] = [];
        if (typeof task.tags === 'string') {
          labels = task.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
        } else if (Array.isArray(task.tags)) {
          labels = task.tags as string[];
        }

        return {
          id: String(task.id),
          title: String(task.title || ''),
          assignee: String(task.assigneeId || 'Unassigned'),
          assigneeId: task.assigneeId as string | undefined,
          priority: mapPriority(task.priority as string | undefined),
          storyPoints: (task.storyPoints as number) || 3,
          dueDate: String(task.dueDate || ''),
          isFirefighting: task.priority === 'CRITICAL',
          labels,
          status: String(task.status || 'TODO'),
        };
      });
    },
  });
}

// Helper to map API priority to UI priority
function mapPriority(priority?: string): 'high' | 'medium' | 'low' {
  switch (priority?.toUpperCase()) {
    case 'CRITICAL':
    case 'HIGH':
      return 'high';
    case 'MEDIUM':
      return 'medium';
    default:
      return 'low';
  }
}

// Helper to organize tasks into columns by status
export function organizeTasksIntoColumns(tasks: KanbanTask[]): KanbanColumn[] {
  const columnDefinitions = [
    { id: 'backlog', title: '제품 백로그', statuses: ['BACKLOG'] },
    { id: 'sprint', title: '이번 스프린트', statuses: ['TODO'] },
    { id: 'inProgress', title: '진행 중', statuses: ['IN_PROGRESS'] },
    { id: 'review', title: '코드 리뷰', statuses: ['REVIEW'] },
    { id: 'testing', title: '테스트 중', statuses: ['TESTING'] },
    { id: 'done', title: '완료', statuses: ['DONE'] },
  ];

  return columnDefinitions.map((col) => ({
    id: col.id,
    title: col.title,
    tasks: tasks.filter((task) => col.statuses.includes(task.status)),
  }));
}
