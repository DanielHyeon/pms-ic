import type { FilterKeyDef, FilterValues } from '../common/FilterSpecBar';
import { FilterSpecBar } from '../common/FilterSpecBar';
import type { ViewModePreset } from '../../../types/menuOntology';

// ─── FilterSpec key definitions for PMO Console ─────────

export const PMO_FILTER_KEYS: FilterKeyDef[] = [
  {
    key: 'q',
    label: '검색',
    type: 'search',
    placeholder: '프로젝트 검색...',
  },
  {
    key: 'healthGrade',
    label: '건강 등급',
    type: 'enum',
    placeholder: '등급 선택',
    options: [
      { value: 'A', label: 'A (우수)' },
      { value: 'B', label: 'B (양호)' },
      { value: 'C', label: 'C (보통)' },
      { value: 'D', label: 'D (주의)' },
      { value: 'F', label: 'F (위험)' },
    ],
  },
  {
    key: 'projectStatus',
    label: '프로젝트 상태',
    type: 'enum',
    placeholder: '상태 선택',
    options: [
      { value: 'on_track', label: '정상 진행' },
      { value: 'at_risk', label: '위험 예상' },
      { value: 'delayed', label: '지연' },
      { value: 'critical', label: '위험' },
    ],
  },
  {
    key: 'dimension',
    label: '차원',
    type: 'enum',
    placeholder: '차원 선택',
    options: [
      { value: 'schedule', label: '일정' },
      { value: 'cost', label: '비용' },
      { value: 'quality', label: '품질' },
      { value: 'risk', label: '리스크' },
      { value: 'resource', label: '자원' },
    ],
    hiddenInPresets: ['EXEC_SUMMARY', 'CUSTOMER_APPROVAL'],
  },
  {
    key: 'dateRange',
    label: '날짜 범위',
    type: 'date',
    placeholder: '날짜 선택',
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
