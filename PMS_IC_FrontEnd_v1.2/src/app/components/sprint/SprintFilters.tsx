import { FilterSpecBar } from '../common/FilterSpecBar';
import type { FilterKeyDef, FilterValues } from '../common/FilterSpecBar';
import type { ViewModePreset } from '../../../types/menuOntology';

// ── Sprint filter key definitions ──────────────────────────

export const SPRINT_FILTER_KEYS: FilterKeyDef[] = [
  {
    key: 'q',
    label: 'Search',
    type: 'search',
    placeholder: 'Search sprint name or goal...',
  },
  {
    key: 'status',
    label: 'Status',
    type: 'enum',
    placeholder: 'All Statuses',
    options: [
      { value: 'PLANNING', label: 'Planning' },
      { value: 'ACTIVE', label: 'Active' },
      { value: 'COMPLETED', label: 'Completed' },
      { value: 'CANCELLED', label: 'Cancelled' },
    ],
    hiddenInPresets: ['EXEC_SUMMARY', 'CUSTOMER_APPROVAL'],
  },
  {
    key: 'partId',
    label: 'Part',
    type: 'enum',
    placeholder: 'All Parts',
    options: [], // Dynamic from API
    hiddenInPresets: ['EXEC_SUMMARY', 'CUSTOMER_APPROVAL'],
  },
  {
    key: 'dateRange',
    label: 'Date Range',
    type: 'string',
    placeholder: 'All dates',
    hiddenInPresets: ['EXEC_SUMMARY', 'CUSTOMER_APPROVAL', 'DEV_EXECUTION'],
  },
];

// ── SprintFilters component ────────────────────────────────

interface SprintFiltersProps {
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  preset: ViewModePreset;
}

export function SprintFilters({ values, onChange, preset }: SprintFiltersProps) {
  return (
    <FilterSpecBar
      keys={SPRINT_FILTER_KEYS}
      values={values}
      onChange={onChange}
      activePreset={preset}
    />
  );
}
