import type { FilterKeyDef, FilterValues } from '../common/FilterSpecBar';
import { FilterSpecBar } from '../common/FilterSpecBar';
import type { ViewModePreset } from '../../../types/menuOntology';

// ─── FilterSpec key definitions for PMO Console ─────────

export const PMO_FILTER_KEYS: FilterKeyDef[] = [
  {
    key: 'q',
    label: '\uAC80\uC0C9',
    type: 'search',
    placeholder: '\uD504\uB85C\uC81D\uD2B8 \uAC80\uC0C9...',
  },
  {
    key: 'healthGrade',
    label: '\uAC74\uAC15 \uB4F1\uAE09',
    type: 'enum',
    placeholder: '\uB4F1\uAE09 \uC120\uD0DD',
    options: [
      { value: 'A', label: 'A (\uC6B0\uC218)' },
      { value: 'B', label: 'B (\uC591\uD638)' },
      { value: 'C', label: 'C (\uBCF4\uD1B5)' },
      { value: 'D', label: 'D (\uC8FC\uC758)' },
      { value: 'F', label: 'F (\uC704\uD5D8)' },
    ],
  },
  {
    key: 'projectStatus',
    label: '\uD504\uB85C\uC81D\uD2B8 \uC0C1\uD0DC',
    type: 'enum',
    placeholder: '\uC0C1\uD0DC \uC120\uD0DD',
    options: [
      { value: 'on_track', label: '\uC815\uC0C1 \uC9C4\uD589' },
      { value: 'at_risk', label: '\uC704\uD5D8 \uC608\uC0C1' },
      { value: 'delayed', label: '\uC9C0\uC5F0' },
      { value: 'critical', label: '\uC704\uD5D8' },
    ],
  },
  {
    key: 'dimension',
    label: '\uCC28\uC6D0',
    type: 'enum',
    placeholder: '\uCC28\uC6D0 \uC120\uD0DD',
    options: [
      { value: 'schedule', label: '\uC77C\uC815' },
      { value: 'cost', label: '\uBE44\uC6A9' },
      { value: 'quality', label: '\uD488\uC9C8' },
      { value: 'risk', label: '\uB9AC\uC2A4\uD06C' },
      { value: 'resource', label: '\uC790\uC6D0' },
    ],
    hiddenInPresets: ['EXEC_SUMMARY', 'CUSTOMER_APPROVAL'],
  },
  {
    key: 'dateRange',
    label: '\uB0A0\uC9DC \uBC94\uC704',
    type: 'date',
    placeholder: '\uB0A0\uC9DC \uC120\uD0DD',
    hiddenInPresets: ['EXEC_SUMMARY', 'CUSTOMER_APPROVAL'],
  },
];

// ─── Component ──────────────────────────────────────────

interface PmoFiltersProps {
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  activePreset: ViewModePreset;
}

export function PmoFilters({ values, onChange, activePreset }: PmoFiltersProps) {
  return (
    <FilterSpecBar
      keys={PMO_FILTER_KEYS}
      values={values}
      onChange={onChange}
      activePreset={activePreset}
    />
  );
}
