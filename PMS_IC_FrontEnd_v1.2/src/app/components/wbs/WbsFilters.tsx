import { useMemo } from 'react';
import { FilterSpecBar, type FilterKeyDef, type FilterValues } from '../common/FilterSpecBar';
import type { ViewModePreset } from '../../../types/menuOntology';

/**
 * FilterKeyDef definitions for the WBS Management screen.
 * Each key maps to a field on WbsGroup/WbsItem/WbsTask used for client-side filtering.
 */
const WBS_FILTER_KEYS: FilterKeyDef[] = [
  {
    key: 'q',
    label: 'Search',
    type: 'search',
    placeholder: 'Search by code, name...',
  },
  {
    key: 'phaseId',
    label: 'Phase',
    type: 'enum',
    placeholder: 'All Phases',
    // NOTE: phaseId options should be dynamic from phases data.
    // The FilterSpecBar still renders the dropdown even with empty options.
    options: [],
    hiddenInPresets: [],
  },
  {
    key: 'status',
    label: 'Status',
    type: 'enum',
    placeholder: 'All Status',
    options: [
      { value: 'NOT_STARTED', label: 'Not Started' },
      { value: 'IN_PROGRESS', label: 'In Progress' },
      { value: 'COMPLETED', label: 'Completed' },
      { value: 'ON_HOLD', label: 'On Hold' },
      { value: 'CANCELLED', label: 'Cancelled' },
    ],
    hiddenInPresets: ['EXEC_SUMMARY', 'CUSTOMER_APPROVAL'],
  },
  {
    key: 'trackType',
    label: 'Track',
    type: 'enum',
    placeholder: 'All Tracks',
    options: [
      { value: 'AI', label: 'AI' },
      { value: 'SI', label: 'SI' },
      { value: 'COMMON', label: 'Common' },
    ],
    hiddenInPresets: ['DEV_EXECUTION'],
  },
  {
    key: 'assigneeId',
    label: 'Assignee',
    type: 'enum',
    placeholder: 'All Assignees',
    // NOTE: options should be dynamically populated from project members
    options: [],
    hiddenInPresets: ['EXEC_SUMMARY', 'CUSTOMER_APPROVAL'],
  },
  {
    key: 'flags',
    label: 'Flags',
    type: 'enum',
    placeholder: 'All Flags',
    options: [
      { value: 'OVERDUE', label: 'Overdue' },
      { value: 'DELAYED', label: 'Delayed' },
      { value: 'CRITICAL', label: 'Critical Path' },
    ],
    hiddenInPresets: ['EXEC_SUMMARY', 'CUSTOMER_APPROVAL'],
  },
];

// ─── Component ───────────────────────────────────────────

interface WbsFiltersProps {
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  preset: ViewModePreset;
  compact?: boolean;
}

export function WbsFilters({
  values,
  onChange,
  preset,
  compact = false,
}: WbsFiltersProps) {
  const keys = useMemo(() => WBS_FILTER_KEYS, []);

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
export { WBS_FILTER_KEYS };
