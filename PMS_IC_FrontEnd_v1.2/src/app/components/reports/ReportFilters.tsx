import { FilterSpecBar } from '../common/FilterSpecBar';
import type { FilterKeyDef, FilterValues } from '../common/FilterSpecBar';
import type { ViewModePreset } from '../../../types/menuOntology';

// -- Report filter key definitions ------------------------------------------

export const REPORT_FILTER_KEYS: FilterKeyDef[] = [
  {
    key: 'q',
    label: 'Search',
    type: 'search',
    placeholder: 'Search reports...',
  },
  {
    key: 'reportType',
    label: 'Report Type',
    type: 'enum',
    placeholder: 'All Types',
    options: [
      { value: 'project_status', label: 'Project Status Report' },
      { value: 'sprint_burndown', label: 'Sprint Burndown' },
      { value: 'velocity_trend', label: 'Velocity Trend' },
      { value: 'evm_spi_cpi', label: 'EVM (SPI/CPI) Report' },
      { value: 'quality_dashboard', label: 'Quality Dashboard' },
      { value: 'resource_utilization', label: 'Resource Utilization' },
      { value: 'risk_heatmap', label: 'Risk Heatmap' },
      { value: 'phase_gate_status', label: 'Phase Gate Status' },
      { value: 'requirement_traceability', label: 'Requirement Traceability Matrix' },
    ],
  },
  {
    key: 'phaseId',
    label: 'Phase',
    type: 'enum',
    placeholder: 'All Phases',
    options: [], // TODO: Replace with real API - dynamic from project phases
    hiddenInPresets: ['EXEC_SUMMARY'],
  },
  {
    key: 'format',
    label: 'Format',
    type: 'enum',
    placeholder: 'All Formats',
    options: [
      { value: 'pdf', label: 'PDF' },
      { value: 'excel', label: 'Excel' },
      { value: 'pptx', label: 'PowerPoint' },
    ],
    hiddenInPresets: ['EXEC_SUMMARY', 'DEV_EXECUTION'],
  },
  {
    key: 'scheduled',
    label: 'Scheduled Only',
    type: 'boolean',
    hiddenInPresets: ['EXEC_SUMMARY', 'DEV_EXECUTION'],
  },
  {
    key: 'dateRange',
    label: 'Date Range',
    type: 'date',
    placeholder: 'Select date',
  },
];

// -- ReportFilters component ------------------------------------------------

interface ReportFiltersProps {
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  preset: ViewModePreset;
}

export function ReportFilters({ values, onChange, preset }: ReportFiltersProps) {
  return (
    <FilterSpecBar
      keys={REPORT_FILTER_KEYS}
      values={values}
      onChange={onChange}
      activePreset={preset}
    />
  );
}
