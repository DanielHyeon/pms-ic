import { FilterSpecBar } from '../common/FilterSpecBar';
import type { FilterKeyDef, FilterValues } from '../common/FilterSpecBar';
import type { ViewModePreset } from '../../../types/menuOntology';

// ── Issue filter key definitions ──────────────────────────

export const ISSUE_FILTER_KEYS: FilterKeyDef[] = [
  {
    key: 'q',
    label: 'Search',
    type: 'search',
    placeholder: 'Search issues...',
  },
  {
    key: 'type',
    label: 'Type',
    type: 'enum',
    placeholder: 'All Types',
    options: [
      { value: 'BUG', label: 'Bug' },
      { value: 'BLOCKER', label: 'Blocker' },
      { value: 'CHANGE_REQUEST', label: 'Change Request' },
      { value: 'QUESTION', label: 'Question' },
      { value: 'IMPROVEMENT', label: 'Improvement' },
    ],
    hiddenInPresets: ['EXEC_SUMMARY', 'CUSTOMER_APPROVAL'],
  },
  {
    key: 'severity',
    label: 'Severity',
    type: 'enum',
    placeholder: 'All Severities',
    options: [
      { value: 'CRITICAL', label: 'Critical' },
      { value: 'HIGH', label: 'High' },
      { value: 'MEDIUM', label: 'Medium' },
      { value: 'LOW', label: 'Low' },
    ],
  },
  {
    key: 'status',
    label: 'Status',
    type: 'enum',
    placeholder: 'All Statuses',
    options: [
      { value: 'OPEN', label: 'Open' },
      { value: 'TRIAGED', label: 'Triaged' },
      { value: 'ASSIGNED', label: 'Assigned' },
      { value: 'IN_PROGRESS', label: 'In Progress' },
      { value: 'RESOLVED', label: 'Resolved' },
      { value: 'CLOSED', label: 'Closed' },
      { value: 'REOPENED', label: 'Reopened' },
    ],
    hiddenInPresets: ['EXEC_SUMMARY'],
  },
  {
    key: 'assigneeId',
    label: 'Assignee',
    type: 'enum',
    placeholder: 'All Assignees',
    options: [], // Dynamic from API
    hiddenInPresets: ['EXEC_SUMMARY', 'CUSTOMER_APPROVAL'],
  },
  {
    key: 'overdue',
    label: 'Overdue',
    type: 'enum',
    placeholder: 'All',
    options: [{ value: 'true', label: 'Overdue Only' }],
    hiddenInPresets: ['EXEC_SUMMARY', 'CUSTOMER_APPROVAL'],
  },
  {
    key: 'escalated',
    label: 'Escalated',
    type: 'enum',
    placeholder: 'All',
    options: [{ value: 'true', label: 'Escalated Only' }],
    hiddenInPresets: ['DEV_EXECUTION', 'CUSTOMER_APPROVAL'],
  },
  {
    key: 'sprintId',
    label: 'Sprint',
    type: 'enum',
    placeholder: 'All Sprints',
    options: [], // Dynamic from API
    hiddenInPresets: ['EXEC_SUMMARY', 'CUSTOMER_APPROVAL'],
  },
];

// ── IssueFilters component ────────────────────────────────

interface IssueFiltersProps {
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  preset: ViewModePreset;
}

export function IssueFilters({ values, onChange, preset }: IssueFiltersProps) {
  return (
    <FilterSpecBar
      keys={ISSUE_FILTER_KEYS}
      values={values}
      onChange={onChange}
      activePreset={preset}
    />
  );
}
