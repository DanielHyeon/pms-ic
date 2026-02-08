import { useMemo } from 'react';
import { FilterSpecBar, type FilterKeyDef, type FilterValues } from '../common/FilterSpecBar';
import type { ViewModePreset } from '../../../types/menuOntology';

/**
 * FilterKeyDef definitions for the Backlog Management screen.
 * Each key maps to a field on Epic/UserStory used for client-side filtering.
 */
const BACKLOG_FILTER_KEYS: FilterKeyDef[] = [
  {
    key: 'q',
    label: 'Search',
    type: 'search',
    placeholder: 'Search by epic name, story title...',
  },
  {
    key: 'epicStatus',
    label: 'Epic Status',
    type: 'enum',
    placeholder: 'All Epic Status',
    options: [
      { value: 'BACKLOG', label: 'Backlog' },
      { value: 'IN_PROGRESS', label: 'In Progress' },
      { value: 'COMPLETED', label: 'Completed' },
      { value: 'CANCELLED', label: 'Cancelled' },
    ],
  },
  {
    key: 'priority',
    label: 'Priority',
    type: 'enum',
    placeholder: 'All Priority',
    options: [
      { value: 'CRITICAL', label: 'Critical' },
      { value: 'HIGH', label: 'High' },
      { value: 'MEDIUM', label: 'Medium' },
      { value: 'LOW', label: 'Low' },
    ],
  },
  {
    key: 'storyStatus',
    label: 'Story Status',
    type: 'enum',
    placeholder: 'All Story Status',
    options: [
      { value: 'IDEA', label: 'Idea' },
      { value: 'REFINED', label: 'Refined' },
      { value: 'READY', label: 'Ready' },
      { value: 'IN_SPRINT', label: 'In Sprint' },
      { value: 'IN_PROGRESS', label: 'In Progress' },
      { value: 'REVIEW', label: 'Review' },
      { value: 'DONE', label: 'Done' },
      { value: 'CANCELLED', label: 'Cancelled' },
    ],
    hiddenInPresets: ['EXEC_SUMMARY', 'CUSTOMER_APPROVAL'],
  },
  {
    key: 'taskStatus',
    label: 'Task Status',
    type: 'enum',
    placeholder: 'All Task Status',
    options: [
      { value: 'TODO', label: 'To Do' },
      { value: 'IN_PROGRESS', label: 'In Progress' },
      { value: 'IN_REVIEW', label: 'In Review' },
      { value: 'DONE', label: 'Done' },
      { value: 'BLOCKED', label: 'Blocked' },
    ],
    hiddenInPresets: ['EXEC_SUMMARY', 'CUSTOMER_APPROVAL'],
  },
  {
    key: 'unassigned',
    label: 'Unassigned',
    type: 'boolean',
    hiddenInPresets: ['EXEC_SUMMARY', 'CUSTOMER_APPROVAL'],
  },
  {
    key: 'unestimated',
    label: 'Unestimated',
    type: 'boolean',
    hiddenInPresets: ['EXEC_SUMMARY', 'CUSTOMER_APPROVAL'],
  },
];

// ─── Component ───────────────────────────────────────────

interface BacklogFiltersProps {
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  preset: ViewModePreset;
  compact?: boolean;
}

export function BacklogFilters({
  values,
  onChange,
  preset,
  compact = false,
}: BacklogFiltersProps) {
  const keys = useMemo(() => BACKLOG_FILTER_KEYS, []);

  return (
    <FilterSpecBar
      keys={keys}
      values={values}
      onChange={onChange}
      activePreset={preset}
      compact={compact}
    />
  );
}

/**
 * Re-export the filter keys for external use (e.g., by useFilterSpec).
 */
export { BACKLOG_FILTER_KEYS };
