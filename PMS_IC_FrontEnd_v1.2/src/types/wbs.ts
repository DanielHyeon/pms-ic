/**
 * WBS (Work Breakdown Structure) Types
 *
 * WBS Hierarchy: Phase → WBS Group → WBS Item → WBS Task
 *
 * Integration points:
 * - Epic can link to WBS Group (wbsGroupId)
 * - User Story can link to WBS Item (wbsItemId)
 * - Task can link to WBS Task (wbsTaskId)
 */

// WBS Status
export type WbsStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED';

// WBS Group (Level 1 under Phase - similar to Epic level)
export interface WbsGroup {
  id: string;
  phaseId: string;
  name: string;
  description?: string;
  code: string; // e.g., "1.1", "1.2"
  status: WbsStatus;
  progress: number; // 0-100, auto-calculated from children
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  weight: number; // Percentage weight for progress calculation (0-100)
  order: number;
  linkedEpicId?: string; // Link to Epic
  linkedFeatureIds?: string[]; // Links to Features
  createdAt: string;
  updatedAt: string;
}

// WBS Item (Level 2 - Work Package level)
export interface WbsItem {
  id: string;
  groupId: string;
  phaseId: string; // Denormalized for easier queries
  name: string;
  description?: string;
  code: string; // e.g., "1.1.1", "1.1.2"
  status: WbsStatus;
  progress: number; // 0-100, auto-calculated from tasks
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  weight: number; // Percentage weight within group
  order: number;
  assigneeId?: string;
  assigneeName?: string;
  estimatedHours?: number;
  actualHours?: number;
  linkedStoryIds?: string[]; // Links to User Stories
  createdAt: string;
  updatedAt: string;
}

// WBS Task (Level 3 - Activity level)
export interface WbsTask {
  id: string;
  itemId: string;
  groupId: string; // Denormalized
  phaseId: string; // Denormalized
  name: string;
  description?: string;
  code: string; // e.g., "1.1.1.1"
  status: WbsStatus;
  progress: number; // 0-100, manually set
  plannedStartDate?: string;
  plannedEndDate?: string;
  actualStartDate?: string;
  actualEndDate?: string;
  weight: number;
  order: number;
  assigneeId?: string;
  assigneeName?: string;
  estimatedHours?: number;
  actualHours?: number;
  linkedTaskId?: string; // Link to Backlog Task
  createdAt: string;
  updatedAt: string;
}

// WBS Dependency (Predecessor/Successor relationship)
export type WbsItemType = 'GROUP' | 'ITEM' | 'TASK';
export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF'; // Finish-to-Start, Start-to-Start, etc.

export interface WbsDependency {
  id: string;
  predecessorType: WbsItemType;
  predecessorId: string;
  successorType: WbsItemType;
  successorId: string;
  dependencyType: DependencyType;
  lagDays: number;
  projectId: string;
}

export interface CreateWbsDependencyRequest {
  predecessorType: WbsItemType;
  predecessorId: string;
  successorType: WbsItemType;
  successorId: string;
  dependencyType?: DependencyType;
  lagDays?: number;
}

// Form data types
export interface WbsGroupFormData {
  name: string;
  description: string;
  phaseId: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  weight: number;
}

export interface WbsItemFormData {
  name: string;
  description: string;
  groupId: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  weight: number;
  estimatedHours?: number;
  assigneeId?: string;
}

export interface WbsTaskFormData {
  name: string;
  description: string;
  itemId: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  weight: number;
  estimatedHours?: number;
  assigneeId?: string;
}

// Aggregated views for UI
export interface WbsTaskView extends WbsTask {
  // Additional calculated fields if needed
}

export interface WbsItemWithTasks extends WbsItem {
  tasks: WbsTaskView[];
  totalTasks: number;
  completedTasks: number;
  calculatedProgress: number;
}

export interface WbsGroupWithItems extends WbsGroup {
  items: WbsItemWithTasks[];
  totalItems: number;
  completedItems: number;
  totalTasks: number;
  completedTasks: number;
  calculatedProgress: number;
}

export interface PhaseWithWbs {
  id: string;
  name: string;
  description?: string;
  status: string;
  progress: number;
  startDate?: string;
  endDate?: string;
  parentId?: string;
  groups: WbsGroupWithItems[];
  totalGroups: number;
  completedGroups: number;
  calculatedProgress: number;
  childPhases?: PhaseWithWbs[];
}

// Progress calculation utilities
export interface ProgressData {
  weight: number;
  progress: number;
}

// Epic-Phase Link
export interface EpicPhaseLink {
  epicId: string;
  phaseId: string;
  linkedAt: string;
  linkedBy?: string;
}

// Feature-WbsGroup Link
export interface FeatureWbsGroupLink {
  featureId: string;
  wbsGroupId: string;
  linkedAt: string;
  linkedBy?: string;
}

// Story-WBS Link
export interface StoryWbsLink {
  storyId: string;
  wbsItemId: string;
  linkedAt: string;
  linkedBy?: string;
}

// Task-WBS Link
export interface TaskWbsLink {
  taskId: string;
  wbsTaskId: string;
  linkedAt: string;
  linkedBy?: string;
}

// Helper functions
export const createEmptyWbsGroupForm = (phaseId?: string): WbsGroupFormData => ({
  name: '',
  description: '',
  phaseId: phaseId || '',
  weight: 100,
});

export const createEmptyWbsItemForm = (groupId?: string): WbsItemFormData => ({
  name: '',
  description: '',
  groupId: groupId || '',
  weight: 100,
});

export const createEmptyWbsTaskForm = (itemId?: string): WbsTaskFormData => ({
  name: '',
  description: '',
  itemId: itemId || '',
  weight: 100,
});

// Status utilities
export const getWbsStatusColor = (status: WbsStatus): string => {
  const colors: Record<WbsStatus, string> = {
    NOT_STARTED: 'text-gray-700 bg-gray-100',
    IN_PROGRESS: 'text-blue-700 bg-blue-100',
    COMPLETED: 'text-green-700 bg-green-100',
    ON_HOLD: 'text-amber-700 bg-amber-100',
    CANCELLED: 'text-red-700 bg-red-100',
  };
  return colors[status];
};

export const getWbsStatusLabel = (status: WbsStatus): string => {
  const labels: Record<WbsStatus, string> = {
    NOT_STARTED: '시작 전',
    IN_PROGRESS: '진행 중',
    COMPLETED: '완료',
    ON_HOLD: '보류',
    CANCELLED: '취소',
  };
  return labels[status];
};

// Progress calculation
export const calculateWeightedProgress = (items: ProgressData[]): number => {
  if (items.length === 0) return 0;

  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight === 0) return 0;

  const weightedSum = items.reduce((sum, item) => sum + item.progress * item.weight, 0);
  return Math.round(weightedSum / totalWeight);
};

// Get progress bar color based on percentage
export const getProgressColor = (progress: number): string => {
  if (progress >= 100) return 'bg-green-500';
  if (progress >= 70) return 'bg-blue-500';
  if (progress >= 30) return 'bg-amber-500';
  return 'bg-gray-400';
};

// Generate WBS code
export const generateWbsCode = (parentCode: string, order: number): string => {
  return `${parentCode}.${order}`;
};

// Validation helpers
export const validateWbsGroupForm = (form: WbsGroupFormData): boolean => {
  return !!(form.name.trim() && form.phaseId);
};

export const validateWbsItemForm = (form: WbsItemFormData): boolean => {
  return !!(form.name.trim() && form.groupId);
};

export const validateWbsTaskForm = (form: WbsTaskFormData): boolean => {
  return !!(form.name.trim() && form.itemId);
};

// Date utilities
export const isOverdue = (endDate?: string): boolean => {
  if (!endDate) return false;
  return new Date(endDate) < new Date();
};

export const getDaysRemaining = (endDate?: string): number | null => {
  if (!endDate) return null;
  const end = new Date(endDate);
  const today = new Date();
  return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

// ========== Critical Path Types ==========
export interface ItemFloatData {
  name: string;
  duration: number;
  earlyStart: number;
  earlyFinish: number;
  lateStart: number;
  lateFinish: number;
  totalFloat: number;
  freeFloat: number;
  isCritical: boolean;
}

export interface CriticalPathResponse {
  criticalPath: string[];
  itemsWithFloat: Record<string, ItemFloatData>;
  projectDuration: number;
  calculatedAt: string;
}
