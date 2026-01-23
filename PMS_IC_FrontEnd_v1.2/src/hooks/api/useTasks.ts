import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';

export const taskKeys = {
  all: ['tasks'] as const,
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
    mutationFn: (data: Parameters<typeof apiService.createTask>[0]) =>
      apiService.createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof apiService.updateTask>[1] }) =>
      apiService.updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiService.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}

export function useMoveTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, targetColumn }: { taskId: string; targetColumn: string }) =>
      apiService.moveTask(taskId, targetColumn),
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

// Hook to fetch all tasks and organize into kanban columns
export function useKanbanTasks() {
  return useQuery({
    queryKey: [...taskKeys.all, 'kanban'],
    queryFn: async () => {
      const response = await apiService.getTasks();
      const tasks = response?.data || response || [];

      if (!Array.isArray(tasks)) return [];

      // Map API tasks to KanbanTask format
      return tasks.map((task: any): KanbanTask => ({
        id: task.id,
        title: task.title,
        assignee: task.assigneeId || 'Unassigned',
        assigneeId: task.assigneeId,
        priority: mapPriority(task.priority),
        storyPoints: task.storyPoints || 3,
        dueDate: task.dueDate || '',
        isFirefighting: task.priority === 'CRITICAL',
        labels: task.tags || [],
        status: task.status || 'TODO',
      }));
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
    { id: 'review', title: '검토', statuses: ['REVIEW'] },
    { id: 'done', title: '완료', statuses: ['DONE'] },
  ];

  return columnDefinitions.map((col) => ({
    id: col.id,
    title: col.title,
    tasks: tasks.filter((task) => col.statuses.includes(task.status)),
  }));
}
