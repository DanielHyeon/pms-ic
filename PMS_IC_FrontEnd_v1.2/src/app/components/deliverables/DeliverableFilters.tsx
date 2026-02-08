import { FilterSpecBar } from '../common/FilterSpecBar';
import type { FilterKeyDef, FilterValues } from '../common/FilterSpecBar';
import type { ViewModePreset } from '../../../types/menuOntology';

// ── Deliverable filter key definitions ──────────────────────

export const DELIVERABLE_FILTER_KEYS: FilterKeyDef[] = [
  {
    key: 'q',
    label: 'Search',
    type: 'search',
    placeholder: '산출물 검색...',
  },
  {
    key: 'phaseId',
    label: '단계',
    type: 'enum',
    placeholder: '전체 단계',
    options: [], // Dynamic from API
    hiddenInPresets: ['EXEC_SUMMARY', 'CUSTOMER_APPROVAL'],
  },
  {
    key: 'partId',
    label: '파트',
    type: 'enum',
    placeholder: '전체 파트',
    options: [], // Dynamic from API
    hiddenInPresets: ['EXEC_SUMMARY', 'CUSTOMER_APPROVAL'],
  },
  {
    key: 'category',
    label: '분류',
    type: 'enum',
    placeholder: '전체 분류',
    options: [
      { value: 'DESIGN_DOC', label: '설계 문서' },
      { value: 'TEST_RESULT', label: '테스트 결과' },
      { value: 'MANUAL', label: '매뉴얼' },
      { value: 'MEETING_MINUTES', label: '회의록' },
      { value: 'PLAN', label: '계획서' },
      { value: 'REPORT', label: '보고서' },
      { value: 'SOURCE_CODE', label: '소스 코드' },
      { value: 'SPECIFICATION', label: '사양서' },
      { value: 'CERTIFICATE', label: '인증서' },
      { value: 'OTHER', label: '기타' },
    ],
    hiddenInPresets: ['EXEC_SUMMARY', 'CUSTOMER_APPROVAL'],
  },
  {
    key: 'status',
    label: '상태',
    type: 'enum',
    placeholder: '전체 상태',
    options: [
      { value: 'DRAFT', label: '초안' },
      { value: 'SUBMITTED', label: '제출됨' },
      { value: 'IN_REVIEW', label: '검토중' },
      { value: 'APPROVED', label: '승인됨' },
      { value: 'LOCKED', label: '확정' },
      { value: 'REJECTED', label: '반려' },
    ],
  },
  {
    key: 'visibility',
    label: '공개 범위',
    type: 'enum',
    placeholder: '전체',
    options: [
      { value: 'internal', label: '내부용' },
      { value: 'customer', label: '고객 공개' },
    ],
    hiddenInPresets: ['EXEC_SUMMARY', 'DEV_EXECUTION'],
  },
  {
    key: 'overdue',
    label: '기한 초과',
    type: 'boolean',
    hiddenInPresets: ['EXEC_SUMMARY', 'CUSTOMER_APPROVAL'],
  },
  {
    key: 'traceLinked',
    label: '추적 연결',
    type: 'boolean',
    hiddenInPresets: ['EXEC_SUMMARY', 'CUSTOMER_APPROVAL', 'DEV_EXECUTION'],
  },
];

// ── DeliverableFilters component ────────────────────────────

interface DeliverableFiltersProps {
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  preset: ViewModePreset;
}

export function DeliverableFilters({ values, onChange, preset }: DeliverableFiltersProps) {
  return (
    <FilterSpecBar
      keys={DELIVERABLE_FILTER_KEYS}
      values={values}
      onChange={onChange}
      activePreset={preset}
    />
  );
}
