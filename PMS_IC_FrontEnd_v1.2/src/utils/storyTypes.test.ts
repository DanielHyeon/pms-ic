/**
 * Tests for storyTypes utility functions
 */
import { describe, it, expect } from 'vitest'
import {
  mapLegacyStatus,
  mapToLegacyStatus,
  validateStoryForm,
  createEmptyStoryForm,
  storyToFormData,
  getPriorityColor,
  type StoryStatus,
  type StoryFormData,
  type UserStory,
} from './storyTypes'

describe('mapLegacyStatus', () => {
  describe('legacy status mappings', () => {
    it('should map BACKLOG to READY', () => {
      expect(mapLegacyStatus('BACKLOG')).toBe('READY')
    })

    it('should map SELECTED to IN_SPRINT', () => {
      expect(mapLegacyStatus('SELECTED')).toBe('IN_SPRINT')
    })

    it('should map COMPLETED to DONE', () => {
      expect(mapLegacyStatus('COMPLETED')).toBe('DONE')
    })
  })

  describe('passthrough for new statuses', () => {
    it('should return IN_PROGRESS unchanged', () => {
      expect(mapLegacyStatus('IN_PROGRESS')).toBe('IN_PROGRESS')
    })

    it('should return CANCELLED unchanged', () => {
      expect(mapLegacyStatus('CANCELLED')).toBe('CANCELLED')
    })

    it('should return IDEA unchanged', () => {
      expect(mapLegacyStatus('IDEA')).toBe('IDEA')
    })

    it('should return REFINED unchanged', () => {
      expect(mapLegacyStatus('REFINED')).toBe('REFINED')
    })

    it('should return REVIEW unchanged', () => {
      expect(mapLegacyStatus('REVIEW')).toBe('REVIEW')
    })

    it('should return DONE unchanged', () => {
      expect(mapLegacyStatus('DONE')).toBe('DONE')
    })
  })

  describe('edge cases', () => {
    it('should handle unknown status by returning it as-is', () => {
      expect(mapLegacyStatus('UNKNOWN_STATUS')).toBe('UNKNOWN_STATUS')
    })

    it('should handle empty string', () => {
      expect(mapLegacyStatus('')).toBe('')
    })
  })
})

describe('mapToLegacyStatus', () => {
  describe('new to legacy status mappings', () => {
    it('should map IDEA to BACKLOG', () => {
      expect(mapToLegacyStatus('IDEA')).toBe('BACKLOG')
    })

    it('should map REFINED to BACKLOG', () => {
      expect(mapToLegacyStatus('REFINED')).toBe('BACKLOG')
    })

    it('should map READY to BACKLOG', () => {
      expect(mapToLegacyStatus('READY')).toBe('BACKLOG')
    })

    it('should map IN_SPRINT to SELECTED', () => {
      expect(mapToLegacyStatus('IN_SPRINT')).toBe('SELECTED')
    })

    it('should map REVIEW to IN_PROGRESS', () => {
      expect(mapToLegacyStatus('REVIEW')).toBe('IN_PROGRESS')
    })

    it('should map DONE to COMPLETED', () => {
      expect(mapToLegacyStatus('DONE')).toBe('COMPLETED')
    })
  })

  describe('passthrough for compatible statuses', () => {
    it('should return IN_PROGRESS unchanged', () => {
      expect(mapToLegacyStatus('IN_PROGRESS')).toBe('IN_PROGRESS')
    })

    it('should return CANCELLED unchanged', () => {
      expect(mapToLegacyStatus('CANCELLED')).toBe('CANCELLED')
    })
  })
})

describe('validateStoryForm', () => {
  describe('valid forms', () => {
    it('should return true for form with all required fields', () => {
      const form: StoryFormData = {
        title: 'User authentication',
        description: 'Implement login functionality',
        epicId: 'epic-auth-01',
        acceptanceCriteria: ['User can login'],
      }
      expect(validateStoryForm(form)).toBe(true)
    })

    it('should return true even with empty acceptanceCriteria', () => {
      const form: StoryFormData = {
        title: 'Test Story',
        description: 'Test Description',
        epicId: 'epic-test-01',
        acceptanceCriteria: [],
      }
      expect(validateStoryForm(form)).toBe(true)
    })
  })

  describe('invalid forms - missing required fields', () => {
    it('should return false when title is empty', () => {
      const form: StoryFormData = {
        title: '',
        description: 'Valid description',
        epicId: 'epic-valid-01',
        acceptanceCriteria: [],
      }
      expect(validateStoryForm(form)).toBe(false)
    })

    it('should return false when description is empty', () => {
      const form: StoryFormData = {
        title: 'Valid title',
        description: '',
        epicId: 'epic-valid-01',
        acceptanceCriteria: [],
      }
      expect(validateStoryForm(form)).toBe(false)
    })

    it('should return false when epic is empty', () => {
      const form: StoryFormData = {
        title: 'Valid title',
        description: 'Valid description',
        epicId: '',
        acceptanceCriteria: [],
      }
      expect(validateStoryForm(form)).toBe(false)
    })
  })

  describe('whitespace handling', () => {
    it('should return false when title is whitespace only', () => {
      const form: StoryFormData = {
        title: '   ',
        description: 'Valid description',
        epicId: 'epic-valid-01',
        acceptanceCriteria: [],
      }
      expect(validateStoryForm(form)).toBe(false)
    })

    it('should return false when description is whitespace only', () => {
      const form: StoryFormData = {
        title: 'Valid title',
        description: '   ',
        epicId: 'epic-valid-01',
        acceptanceCriteria: [],
      }
      expect(validateStoryForm(form)).toBe(false)
    })

    it('should return false when epic is whitespace only', () => {
      const form: StoryFormData = {
        title: 'Valid title',
        description: 'Valid description',
        epicId: '\t\n',
        acceptanceCriteria: [],
      }
      expect(validateStoryForm(form)).toBe(false)
    })
  })
})

describe('createEmptyStoryForm', () => {
  it('should return a form with empty strings and single empty acceptance criteria', () => {
    const form = createEmptyStoryForm()
    expect(form).toEqual({
      title: '',
      description: '',
      epicId: '',
      acceptanceCriteria: [''],
    })
  })

  it('should return a new object each time', () => {
    const form1 = createEmptyStoryForm()
    const form2 = createEmptyStoryForm()
    expect(form1).not.toBe(form2)
    expect(form1.acceptanceCriteria).not.toBe(form2.acceptanceCriteria)
  })
})

describe('storyToFormData', () => {
  it('should convert a UserStory to StoryFormData', () => {
    const story: UserStory = {
      id: 'story-test-01',
      title: 'Test Story',
      description: 'Test Description',
      priority: 1,
      storyPoints: 5,
      status: 'IDEA',
      assignee: 'john.doe',
      epicId: 'epic-test-01',
      featureId: null,
      wbsItemId: null,
      acceptanceCriteria: ['Criteria 1', 'Criteria 2'],
    }

    const formData = storyToFormData(story)
    expect(formData).toEqual({
      title: 'Test Story',
      description: 'Test Description',
      epicId: 'epic-test-01',
      acceptanceCriteria: ['Criteria 1', 'Criteria 2'],
    })
  })

  it('should return single empty string when story has empty acceptanceCriteria', () => {
    const story: UserStory = {
      id: 'story-test-02',
      title: 'Test Story',
      description: 'Test Description',
      priority: 1,
      status: 'IDEA',
      epicId: 'epic-test-02',
      featureId: null,
      wbsItemId: null,
      acceptanceCriteria: [],
    }

    const formData = storyToFormData(story)
    expect(formData.acceptanceCriteria).toEqual([''])
  })

  it('should create a copy of acceptanceCriteria array', () => {
    const story: UserStory = {
      id: 'story-test-03',
      title: 'Test Story',
      description: 'Test Description',
      priority: 1,
      status: 'IDEA',
      epicId: null,
      featureId: null,
      wbsItemId: null,
      acceptanceCriteria: ['Original'],
    }

    const formData = storyToFormData(story)
    formData.acceptanceCriteria.push('Modified')
    expect(story.acceptanceCriteria).toEqual(['Original'])
  })
})

describe('getPriorityColor', () => {
  describe('high priority (1-2)', () => {
    it('should return red colors for priority 1', () => {
      expect(getPriorityColor(1)).toBe('text-red-600 bg-red-50')
    })

    it('should return red colors for priority 2', () => {
      expect(getPriorityColor(2)).toBe('text-red-600 bg-red-50')
    })
  })

  describe('medium priority (3-4)', () => {
    it('should return amber colors for priority 3', () => {
      expect(getPriorityColor(3)).toBe('text-amber-600 bg-amber-50')
    })

    it('should return amber colors for priority 4', () => {
      expect(getPriorityColor(4)).toBe('text-amber-600 bg-amber-50')
    })
  })

  describe('low priority (5+)', () => {
    it('should return green colors for priority 5', () => {
      expect(getPriorityColor(5)).toBe('text-green-600 bg-green-50')
    })

    it('should return green colors for priority 10', () => {
      expect(getPriorityColor(10)).toBe('text-green-600 bg-green-50')
    })
  })

  describe('boundary values', () => {
    it('should return red for priority 0 (edge case)', () => {
      expect(getPriorityColor(0)).toBe('text-red-600 bg-red-50')
    })

    it('should return red for negative priority (edge case)', () => {
      expect(getPriorityColor(-1)).toBe('text-red-600 bg-red-50')
    })
  })
})
