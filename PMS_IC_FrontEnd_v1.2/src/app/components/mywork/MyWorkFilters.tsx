import { FilterSpecBar } from '../common/FilterSpecBar';
import type { FilterKeyDef, FilterValues } from '../common/FilterSpecBar';

// ── My Work filter key definitions ──────────────────────────

export const MYWORK_FILTER_KEYS: FilterKeyDef[] = [
  {
    key: 'q',
    label: 'Search',
    type: 'search',
    placeholder: 'Search tasks...',
  },
  {
    key: 'status',
    label: 'Status',
    type: 'enum',
    placeholder: 'All Statuses',
    options: [
      { value: 'TODO', label: 'TODO' },
      { value: 'IN_PROGRESS', label: 'In Progress' },
      { value: 'IN_REVIEW', label: 'In Review' },
      { value: 'DONE', label: 'Done' },
      { value: 'BLOCKED', label: 'Blocked' },
    ],
  },
  {
    key: 'priority',
    label: 'Priority',
    type: 'enum',
    placeholder: 'All Priorities',
    options: [
      { value: 'CRITICAL', label: 'Critical' },
      { value: 'HIGH', label: 'High' },
      { value: 'MEDIUM', label: 'Medium' },
      { value: 'LOW', label: 'Low' },
    ],
  },
  {
    key: 'dueDate',
    label: 'Due',
    type: 'enum',
    placeholder: 'All Dates',
    options: [
      { value: 'today', label: 'Today' },
      { value: 'this_week', label: 'This Week' },
      { value: 'overdue', label: 'Overdue' },
      { value: 'no_date', label: 'No Date' },
    ],
  },
  {
    key: 'sprintId',
    label: 'Sprint',
    type: 'enum',
    placeholder: 'All Sprints',
    options: [], // TODO: Replace with real API - populate dynamically from sprints
  },
];

// ── MyWorkFilters component ─────────────────────────────────

interface MyWorkFiltersProps {
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  preset: string;
}

export function MyWorkFilters({ values, onChange, preset }: MyWorkFiltersProps) {
  return (
    <FilterSpecBar
      keys={MYWORK_FILTER_KEYS}
      values={values}
      onChange={onChange}
      activePreset={preset}
    />
  );
}
