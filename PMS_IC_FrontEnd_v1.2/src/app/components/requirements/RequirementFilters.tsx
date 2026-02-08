import { useMemo } from 'react';
import { FilterSpecBar, type FilterKeyDef, type FilterValues } from '../common/FilterSpecBar';
import type { ViewModePreset } from '../../../types/menuOntology';

/**
 * FilterKeyDef definitions for the Requirements screen.
 * Each key maps to a field on Requirement used for client-side filtering.
 */
const REQUIREMENT_FILTER_KEYS: FilterKeyDef[] = [
  {
    key: 'q',
    label: 'Search',
    type: 'search',
    placeholder: 'Search by code, title, or description...',
  },
  {
    key: 'category',
    label: 'Category',
    type: 'enum',
    placeholder: 'All Categories',
    options: [
      { value: 'FUNCTIONAL', label: 'Functional' },
      { value: 'NON_FUNCTIONAL', label: 'Non-functional' },
    ],
    hiddenInPresets: ['EXEC_SUMMARY'],
  },
  {
    key: 'aiSi',
    label: 'AI/SI',
    type: 'enum',
    placeholder: 'All Types',
    options: [
      { value: 'AI', label: 'AI' },
      { value: 'SI', label: 'SI' },
      { value: 'COMMON', label: 'COMMON' },
      { value: 'NON_FUNCTIONAL', label: 'NON_FUNCTIONAL' },
    ],
    hiddenInPresets: ['EXEC_SUMMARY', 'CUSTOMER_APPROVAL'],
  },
  {
    key: 'acceptance',
    label: 'Acceptance',
    type: 'enum',
    placeholder: 'All Acceptance',
    options: [
      { value: 'Y', label: '\uC218\uC6A9(Y)' },
      { value: 'X', label: '\uBBF8\uC218\uC6A9(X)' },
      { value: 'pending', label: '\uBBF8\uC815' },
    ],
    hiddenInPresets: ['DEV_EXECUTION'],
  },
  {
    key: 'traceStatus',
    label: 'Trace Status',
    type: 'enum',
    placeholder: 'All Trace',
    options: [
      { value: 'linked', label: '\uC5F0\uACB0\uB428' },
      { value: 'unlinked', label: '\uBBF8\uC5F0\uACB0' },
      { value: 'breakpoint', label: '\uB2E8\uC808' },
    ],
    hiddenInPresets: ['EXEC_SUMMARY', 'CUSTOMER_APPROVAL'],
  },
  {
    key: 'changeType',
    label: 'Change Type',
    type: 'enum',
    placeholder: 'All Changes',
    options: [
      { value: 'new', label: '\uC2E0\uADDC' },
      { value: 'modified', label: '\uC218\uC815' },
      { value: 'maintained', label: '\uC720\uC9C0' },
    ],
    hiddenInPresets: ['EXEC_SUMMARY', 'DEV_EXECUTION'],
  },
];

interface RequirementFiltersProps {
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  preset: ViewModePreset;
  compact?: boolean;
}

export function RequirementFilters({
  values,
  onChange,
  preset,
  compact = false,
}: RequirementFiltersProps) {
  const keys = useMemo(() => REQUIREMENT_FILTER_KEYS, []);

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
export { REQUIREMENT_FILTER_KEYS };
