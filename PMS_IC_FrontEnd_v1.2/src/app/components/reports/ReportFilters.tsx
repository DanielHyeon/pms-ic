import { FilterSpecBar } from '../common/FilterSpecBar';
import type { FilterKeyDef, FilterValues } from '../common/FilterSpecBar';
import type { ViewModePreset } from '../../../types/menuOntology';

// -- Report filter key definitions ------------------------------------------

export const REPORT_FILTER_KEYS: FilterKeyDef[] = [
  {
    key: 'q',
    label: '검색',
    type: 'search',
    placeholder: '보고서 검색...',
  },
  {
    key: 'reportType',
    label: '보고서 유형',
    type: 'enum',
    placeholder: '전체 유형',
    options: [
      { value: 'project_status', label: '프로젝트 현황 보고서' },
      { value: 'sprint_burndown', label: 'Sprint Burndown' },
      { value: 'velocity_trend', label: 'Velocity Trend' },
      { value: 'evm_spi_cpi', label: 'EVM (SPI/CPI) 보고서' },
      { value: 'quality_dashboard', label: '품질 대시보드' },
      { value: 'resource_utilization', label: '리소스 활용도' },
      { value: 'risk_heatmap', label: '리스크 히트맵' },
      { value: 'phase_gate_status', label: '단계 게이트 현황' },
      { value: 'requirement_traceability', label: '요구사항 추적 매트릭스' },
    ],
  },
  {
    key: 'phaseId',
    label: '단계',
    type: 'enum',
    placeholder: '전체 단계',
    options: [], // TODO: Replace with real API - dynamic from project phases
    hiddenInPresets: ['EXEC_SUMMARY'],
  },
  {
    key: 'format',
    label: '형식',
    type: 'enum',
    placeholder: '전체 형식',
    options: [
      { value: 'pdf', label: 'PDF' },
      { value: 'excel', label: 'Excel' },
      { value: 'pptx', label: 'PowerPoint' },
    ],
    hiddenInPresets: ['EXEC_SUMMARY', 'DEV_EXECUTION'],
  },
  {
    key: 'scheduled',
    label: '예약 항목만',
    type: 'boolean',
    hiddenInPresets: ['EXEC_SUMMARY', 'DEV_EXECUTION'],
  },
  {
    key: 'dateRange',
    label: '기간',
    type: 'date',
    placeholder: '날짜 선택',
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
