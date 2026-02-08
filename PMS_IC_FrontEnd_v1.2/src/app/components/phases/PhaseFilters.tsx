import { useMemo } from 'react';
import { FilterSpecBar, type FilterKeyDef, type FilterValues } from '../common/FilterSpecBar';
import type { ViewModePreset } from '../../../types/menuOntology';

/**
 * FilterKeyDef definitions for the Phase Management screen.
 * Each key maps to a field on Phase used for client-side filtering.
 */
const PHASE_FILTER_KEYS: FilterKeyDef[] = [
  {
    key: 'q',
    label: 'Search',
    type: 'search',
    placeholder: 'Search phases...',
  },
  {
    key: 'status',
    label: 'Status',
    type: 'enum',
    placeholder: 'All Status',
    options: [
      { value: 'PLANNED', label: 'Planned' },
      { value: 'ACTIVE', label: 'Active' },
      { value: 'COMPLETED', label: 'Completed' },
      { value: 'CLOSED', label: 'Closed' },
    ],
    hiddenInPresets: [],
  },
  {
    key: 'phaseType',
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
    key: 'healthStatus',
    label: 'Health',
    type: 'enum',
    placeholder: 'All Health',
    options: [
      { value: 'NORMAL', label: 'Normal' },
      { value: 'WARNING', label: 'Warning' },
      { value: 'CRITICAL', label: 'Critical' },
      { value: 'PAUSED', label: 'Paused' },
    ],
    hiddenInPresets: ['EXEC_SUMMARY', 'CUSTOMER_APPROVAL', 'DEV_EXECUTION'],
  },
];

// ─── Component ───────────────────────────────────────────

interface PhaseFiltersProps {
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  preset: ViewModePreset;
  compact?: boolean;
}

export function PhaseFilters({
  values,
  onChange,
  preset,
  compact = false,
}: PhaseFiltersProps) {
  const keys = useMemo(() => PHASE_FILTER_KEYS, []);

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
export { PHASE_FILTER_KEYS };
