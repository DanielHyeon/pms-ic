import { FilterSpecBar } from '../common/FilterSpecBar';
import type { FilterKeyDef, FilterValues } from '../common/FilterSpecBar';
import type { ViewModePreset } from '../../../types/menuOntology';

// ── Test filter key definitions ──────────────────────────

export const TEST_FILTER_KEYS: FilterKeyDef[] = [
  {
    key: 'q',
    label: 'Search',
    type: 'search',
    placeholder: 'Search test cases...',
  },
  {
    key: 'definitionStatus',
    label: 'Definition',
    type: 'enum',
    placeholder: 'All',
    options: [
      { value: 'DRAFT', label: 'Draft' },
      { value: 'READY', label: 'Ready' },
      { value: 'DEPRECATED', label: 'Deprecated' },
    ],
    hiddenInPresets: ['EXEC_SUMMARY', 'CUSTOMER_APPROVAL'],
  },
  {
    key: 'lastOutcome',
    label: 'Result',
    type: 'enum',
    placeholder: 'All Results',
    options: [
      { value: 'PASSED', label: 'Passed' },
      { value: 'FAILED', label: 'Failed' },
      { value: 'BLOCKED', label: 'Blocked' },
      { value: 'SKIPPED', label: 'Skipped' },
      { value: 'NOT_RUN', label: 'Not Run' },
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
    hiddenInPresets: ['EXEC_SUMMARY', 'CUSTOMER_APPROVAL'],
  },
  {
    key: 'suiteId',
    label: 'Suite',
    type: 'enum',
    placeholder: 'All Suites',
    options: [], // Dynamic from API
    hiddenInPresets: ['EXEC_SUMMARY', 'CUSTOMER_APPROVAL'],
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
    key: 'requirementId',
    label: 'Requirement',
    type: 'enum',
    placeholder: 'All',
    options: [], // Dynamic from API
    hiddenInPresets: ['EXEC_SUMMARY', 'CUSTOMER_APPROVAL', 'DEV_EXECUTION'],
  },
];

// ── TestFilters component ────────────────────────────────

interface TestFiltersProps {
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  preset: ViewModePreset;
}

export function TestFilters({ values, onChange, preset }: TestFiltersProps) {
  return (
    <FilterSpecBar
      keys={TEST_FILTER_KEYS}
      values={values}
      onChange={onChange}
      activePreset={preset}
    />
  );
}
