/**
 * User story related types and utilities
 * Extracted to reduce data clumps in BacklogManagement.tsx
 */

export type StoryStatus = 'BACKLOG' | 'SELECTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface UserStory {
  id: number;
  title: string;
  description: string;
  priority: number;
  storyPoints?: number;
  status: StoryStatus;
  assignee?: string;
  epic: string;
  acceptanceCriteria: string[];
}

export interface StoryFormData {
  title: string;
  description: string;
  epic: string;
  acceptanceCriteria: string[];
}

export const createEmptyStoryForm = (): StoryFormData => ({
  title: '',
  description: '',
  epic: '',
  acceptanceCriteria: [''],
});

export const storyToFormData = (story: UserStory): StoryFormData => ({
  title: story.title,
  description: story.description,
  epic: story.epic,
  acceptanceCriteria: story.acceptanceCriteria.length > 0 ? [...story.acceptanceCriteria] : [''],
});

export const validateStoryForm = (form: StoryFormData): boolean => {
  return !!(form.title.trim() && form.description.trim() && form.epic.trim());
};

export const getPriorityColor = (priority: number): string => {
  if (priority <= 2) return 'text-red-600 bg-red-50';
  if (priority <= 4) return 'text-amber-600 bg-amber-50';
  return 'text-green-600 bg-green-50';
};
