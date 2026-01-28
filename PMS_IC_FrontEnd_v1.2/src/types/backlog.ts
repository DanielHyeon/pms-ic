/**
 * Backlog Hierarchy Types (4-Level Structure)
 * Epic → Feature → User Story → Task
 *
 * Based on the implementation plan:
 * - Epic: 대규모 목표 (Product Owner / PM 관리)
 * - Feature: 기능 단위 (Part Leader / Tech Lead 관리)
 * - User Story: 사용자 관점 요구사항 (Scrum Master / PM 관리, Sprint 할당 단위)
 * - Task: 개발 작업 (Developer 관리, Kanban 카드 단위)
 */

// Common types
export type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type ItemStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED' | 'CANCELLED';

// Epic (Level 1)
export interface Epic {
  id: string;
  projectId: string;
  phaseId?: string; // Link to Phase
  wbsTaskId?: string; // Link to WBS
  name: string;
  description?: string;
  status: ItemStatus;
  priority: Priority;
  startDate?: string;
  targetDate?: string;
  progress: number; // 0-100
  order: number;
  color?: string; // For visual grouping
  createdAt: string;
  updatedAt: string;
}

export interface EpicFormData {
  name: string;
  description: string;
  phaseId?: string;
  priority: Priority;
  startDate?: string;
  targetDate?: string;
  color?: string;
}

// Feature (Level 2)
export interface Feature {
  id: string;
  epicId: string;
  partId?: string; // Part (Work Area) assignment for Part-based ownership
  partName?: string; // Part name for display
  wbsGroupId?: string; // Link to WBS Group
  name: string;
  description?: string;
  status: ItemStatus;
  priority: Priority;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureFormData {
  name: string;
  description: string;
  epicId: string;
  partId?: string; // Part assignment
  wbsGroupId?: string;
  priority: Priority;
}

// User Story (Level 3) - Enhanced version
// Status flow based on Scrum design document:
// IDEA -> REFINED -> READY -> IN_SPRINT -> IN_PROGRESS -> REVIEW -> DONE
export type StoryStatus =
  | 'IDEA'        // Initial concept, not yet refined
  | 'REFINED'     // Refined with acceptance criteria defined
  | 'READY'       // Ready for sprint planning
  | 'IN_SPRINT'   // Committed to sprint (Sprint Backlog)
  | 'IN_PROGRESS' // Active development
  | 'REVIEW'      // Code review / QA
  | 'DONE'        // Completed
  | 'CANCELLED';  // Removed from backlog

export interface UserStory {
  id: string;
  featureId?: string; // Optional for backward compatibility
  epicId: string; // Direct reference to epic
  partId?: string; // Part (Work Area) assignment - denormalized from Feature for query performance
  wbsItemId?: string; // Link to WBS Item
  sprintId?: string;
  title: string;
  description: string;
  asA?: string; // As a [user type]
  iWant?: string; // I want [goal]
  soThat?: string; // So that [benefit]
  acceptanceCriteria: string[];
  status: StoryStatus;
  priority: Priority;
  storyPoints?: number;
  assigneeId?: string;
  assigneeName?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserStoryFormData {
  title: string;
  description: string;
  featureId?: string;
  epicId: string;
  wbsItemId?: string;
  asA?: string;
  iWant?: string;
  soThat?: string;
  acceptanceCriteria: string[];
  priority: Priority;
  storyPoints?: number;
}

// Task (Level 4) - Kanban card level
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED';

export interface Task {
  id: string;
  userStoryId: string;
  partId?: string; // Part assignment - derived from user_story.part_id or set directly
  sprintId?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assigneeId?: string;
  assigneeName?: string;
  estimatedHours?: number;
  actualHours?: number;
  kanbanOrder: number;
  dueDate?: string;
  labels?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskFormData {
  title: string;
  description: string;
  userStoryId: string;
  estimatedHours?: number;
  dueDate?: string;
  labels?: string[];
}

// Sprint
export type SprintStatus = 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  goal?: string;
  startDate: string;
  endDate: string;
  status: SprintStatus;
  velocity?: number; // Story points completed
  plannedPoints?: number; // Total planned story points
  createdAt: string;
  updatedAt: string;
}

export interface SprintFormData {
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
}

// Aggregated views for UI
export interface EpicWithChildren extends Epic {
  features: FeatureWithChildren[];
  totalStories: number;
  completedStories: number;
  totalPoints: number;
  completedPoints: number;
}

export interface FeatureWithChildren extends Feature {
  stories: UserStoryWithTasks[];
  totalStories: number;
  completedStories: number;
}

export interface UserStoryWithTasks extends UserStory {
  tasks: Task[];
  totalTasks: number;
  completedTasks: number;
}

export interface SprintWithItems extends Sprint {
  stories: UserStoryWithTasks[];
  totalPoints: number;
  completedPoints: number;
  burndownData?: { date: string; remaining: number }[];
}

// Backlog summary statistics
export interface BacklogStats {
  totalEpics: number;
  totalFeatures: number;
  totalStories: number;
  totalTasks: number;
  storiesInBacklog: number;
  storiesInSprint: number;
  storiesDone: number;
  totalPoints: number;
  completedPoints: number;
  velocity?: number; // Average points per sprint
}

// Helper functions
export const createEmptyEpicForm = (): EpicFormData => ({
  name: '',
  description: '',
  priority: 'MEDIUM',
  color: '#3B82F6', // Default blue
});

export const createEmptyFeatureForm = (epicId?: string): FeatureFormData => ({
  name: '',
  description: '',
  epicId: epicId || '',
  priority: 'MEDIUM',
});

export const createEmptyStoryForm = (epicId?: string, featureId?: string): UserStoryFormData => ({
  title: '',
  description: '',
  featureId,
  epicId: epicId || '',
  acceptanceCriteria: [''],
  priority: 'MEDIUM',
});

export const createEmptyTaskForm = (userStoryId?: string): TaskFormData => ({
  title: '',
  description: '',
  userStoryId: userStoryId || '',
});

export const createEmptySprintForm = (): SprintFormData => ({
  name: '',
  goal: '',
  startDate: new Date().toISOString().split('T')[0],
  endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 weeks default
});

// Priority utilities
export const priorityOrder: Record<Priority, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

export const getPriorityColor = (priority: Priority): string => {
  const colors: Record<Priority, string> = {
    CRITICAL: 'text-red-700 bg-red-100',
    HIGH: 'text-orange-700 bg-orange-100',
    MEDIUM: 'text-blue-700 bg-blue-100',
    LOW: 'text-gray-700 bg-gray-100',
  };
  return colors[priority];
};

export const getPriorityLabel = (priority: Priority): string => {
  const labels: Record<Priority, string> = {
    CRITICAL: '긴급',
    HIGH: '높음',
    MEDIUM: '보통',
    LOW: '낮음',
  };
  return labels[priority];
};

// Status utilities
export const getStoryStatusColor = (status: StoryStatus): string => {
  const colors: Record<StoryStatus, string> = {
    IDEA: 'text-gray-600 bg-gray-50',
    REFINED: 'text-sky-700 bg-sky-100',
    READY: 'text-blue-700 bg-blue-100',
    IN_SPRINT: 'text-indigo-700 bg-indigo-100',
    IN_PROGRESS: 'text-yellow-700 bg-yellow-100',
    REVIEW: 'text-purple-700 bg-purple-100',
    DONE: 'text-green-700 bg-green-100',
    CANCELLED: 'text-red-700 bg-red-100',
  };
  return colors[status];
};

export const getStoryStatusLabel = (status: StoryStatus): string => {
  const labels: Record<StoryStatus, string> = {
    IDEA: '아이디어',
    REFINED: '정제됨',
    READY: '준비됨',
    IN_SPRINT: 'Sprint 진행',
    IN_PROGRESS: '진행 중',
    REVIEW: '검토 중',
    DONE: '완료',
    CANCELLED: '취소됨',
  };
  return labels[status];
};

// Status order for sorting and progression
export const storyStatusOrder: Record<StoryStatus, number> = {
  IDEA: 0,
  REFINED: 1,
  READY: 2,
  IN_SPRINT: 3,
  IN_PROGRESS: 4,
  REVIEW: 5,
  DONE: 6,
  CANCELLED: 7,
};

// Get valid next statuses for a given status
export const getNextStoryStatuses = (status: StoryStatus): StoryStatus[] => {
  const transitions: Record<StoryStatus, StoryStatus[]> = {
    IDEA: ['REFINED', 'CANCELLED'],
    REFINED: ['READY', 'IDEA', 'CANCELLED'],
    READY: ['IN_SPRINT', 'REFINED', 'CANCELLED'],
    IN_SPRINT: ['IN_PROGRESS', 'READY', 'CANCELLED'],
    IN_PROGRESS: ['REVIEW', 'IN_SPRINT', 'CANCELLED'],
    REVIEW: ['DONE', 'IN_PROGRESS', 'CANCELLED'],
    DONE: ['REVIEW'], // Can reopen for fixes
    CANCELLED: ['IDEA'], // Can be revived
  };
  return transitions[status];
};

export const getTaskStatusColor = (status: TaskStatus): string => {
  const colors: Record<TaskStatus, string> = {
    TODO: 'text-gray-700 bg-gray-100',
    IN_PROGRESS: 'text-blue-700 bg-blue-100',
    IN_REVIEW: 'text-purple-700 bg-purple-100',
    DONE: 'text-green-700 bg-green-100',
    BLOCKED: 'text-red-700 bg-red-100',
  };
  return colors[status];
};

export const getSprintStatusColor = (status: SprintStatus): string => {
  const colors: Record<SprintStatus, string> = {
    PLANNING: 'text-gray-700 bg-gray-100',
    ACTIVE: 'text-blue-700 bg-blue-100',
    COMPLETED: 'text-green-700 bg-green-100',
    CANCELLED: 'text-red-700 bg-red-100',
  };
  return colors[status];
};

// Validation helpers
export const validateEpicForm = (form: EpicFormData): boolean => {
  return !!form.name.trim();
};

export const validateFeatureForm = (form: FeatureFormData): boolean => {
  return !!(form.name.trim() && form.epicId);
};

export const validateStoryForm = (form: UserStoryFormData): boolean => {
  return !!(form.title.trim() && form.epicId);
};

export const validateTaskForm = (form: TaskFormData): boolean => {
  return !!(form.title.trim() && form.userStoryId);
};

export const validateSprintForm = (form: SprintFormData): boolean => {
  return !!(form.name.trim() && form.startDate && form.endDate);
};
