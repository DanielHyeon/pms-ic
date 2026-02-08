import { FilterSpecBar } from '../common/FilterSpecBar';
import type { FilterKeyDef, FilterValues } from '../common/FilterSpecBar';
import type { ViewModePreset } from '../../../types/menuOntology';

// ─── Kanban filter key definitions ──────────────────────────

export const KANBAN_FILTER_KEYS: FilterKeyDef[] = [
  {
    key: 'q',
    label: 'Search',
    type: 'search',
    placeholder: 'Search tasks...',
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
    hiddenInPresets: ['EXEC_SUMMARY', 'CUSTOMER_APPROVAL'],
  },
  {
    key: 'assigneeId',
    label: 'Assignee',
    type: 'enum',
    placeholder: 'All Assignees',
    // TODO: Populate dynamically from project members API
    options: [],
    hiddenInPresets: ['EXEC_SUMMARY', 'CUSTOMER_APPROVAL'],
  },
  {
    key: 'taskStatus',
    label: 'Status',
    type: 'enum',
    placeholder: 'All Status',
    options: [
      { value: 'TODO', label: 'TODO' },
      { value: 'IN_PROGRESS', label: 'In Progress' },
      { value: 'IN_REVIEW', label: 'In Review' },
      { value: 'DONE', label: 'Done' },
      { value: 'BLOCKED', label: 'Blocked' },
    ],
    hiddenInPresets: ['CUSTOMER_APPROVAL'],
  },
];

// ─── KanbanFilters component ────────────────────────────────

interface KanbanFiltersProps {
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  preset: ViewModePreset;
}

export function KanbanFilters({ values, onChange, preset }: KanbanFiltersProps) {
  return (
    <FilterSpecBar
      keys={KANBAN_FILTER_KEYS}
      values={values}
      onChange={onChange}
      activePreset={preset}
    />
  );
}
