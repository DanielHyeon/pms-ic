/**
 * User story related types and utilities
 * Extracted to reduce data clumps in BacklogManagement.tsx
 *
 * Status flow based on Scrum design document:
 * IDEA -> REFINED -> READY -> IN_SPRINT -> IN_PROGRESS -> REVIEW -> DONE
 */

// New enhanced status type
export type StoryStatus =
  | 'IDEA'
  | 'REFINED'
  | 'READY'
  | 'IN_SPRINT'
  | 'IN_PROGRESS'
  | 'REVIEW'
  | 'DONE'
  | 'CANCELLED';

// Legacy status type for backward compatibility
export type LegacyStoryStatus = 'BACKLOG' | 'SELECTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

/**
 * Maps legacy status values to new status values
 * Used for backward compatibility with existing data
 */
export const mapLegacyStatus = (status: string): StoryStatus => {
  const mapping: Record<string, StoryStatus> = {
    BACKLOG: 'READY',
    SELECTED: 'IN_SPRINT',
    COMPLETED: 'DONE',
  };
  return mapping[status] || (status as StoryStatus);
};

/**
 * Maps new status values back to legacy values (for API compatibility if needed)
 */
export const mapToLegacyStatus = (status: StoryStatus): LegacyStoryStatus => {
  const mapping: Record<string, LegacyStoryStatus> = {
    IDEA: 'BACKLOG',
    REFINED: 'BACKLOG',
    READY: 'BACKLOG',
    IN_SPRINT: 'SELECTED',
    REVIEW: 'IN_PROGRESS',
    DONE: 'COMPLETED',
  };
  return mapping[status] || (status as LegacyStoryStatus);
};

export interface UserStory {
  id: string;
  title: string;
  description: string;
  priority: number;
  storyPoints?: number;
  status: StoryStatus;
  assignee?: string;
  epicId: string | null;
  sprintId?: string;
  partId?: string;
  featureId: string | null;
  wbsItemId: string | null;
  acceptanceCriteria: string[];
}

export interface StoryFormData {
  title: string;
  description: string;
  epicId: string;
  acceptanceCriteria: string[];
}

export const createEmptyStoryForm = (): StoryFormData => ({
  title: '',
  description: '',
  epicId: '',
  acceptanceCriteria: [''],
});

export const storyToFormData = (story: UserStory): StoryFormData => ({
  title: story.title,
  description: story.description,
  epicId: story.epicId || '',
  acceptanceCriteria: story.acceptanceCriteria.length > 0 ? [...story.acceptanceCriteria] : [''],
});

export const validateStoryForm = (form: StoryFormData): boolean => {
  return !!(form.title.trim() && form.description.trim() && form.epicId.trim());
};

export const getPriorityColor = (priority: number): string => {
  if (priority <= 2) return 'text-red-600 bg-red-50';
  if (priority <= 4) return 'text-amber-600 bg-amber-50';
  return 'text-green-600 bg-green-50';
};
