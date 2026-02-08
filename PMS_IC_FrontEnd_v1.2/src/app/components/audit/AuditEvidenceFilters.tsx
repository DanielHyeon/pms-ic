import { FilterSpecBar } from '../common/FilterSpecBar';
import type { FilterKeyDef, FilterValues } from '../common/FilterSpecBar';
import type { ViewModePreset } from '../../../types/menuOntology';

// Audit Evidence filter key definitions

export const AUDIT_EVIDENCE_FILTER_KEYS: FilterKeyDef[] = [
  {
    key: 'q',
    label: 'Search',
    type: 'search',
    placeholder: 'Search evidence...',
  },
  {
    key: 'phaseId',
    label: 'Phase',
    type: 'enum',
    placeholder: 'All Phases',
    options: [
      { value: 'PH-1', label: 'PH-1 Requirements' },
      { value: 'PH-2', label: 'PH-2 Design' },
      { value: 'PH-3', label: 'PH-3 Development' },
      { value: 'PH-4', label: 'PH-4 Testing' },
      { value: 'PH-5', label: 'PH-5 Deployment' },
    ],
  },
  {
    key: 'evidenceType',
    label: 'Evidence Type',
    type: 'enum',
    placeholder: 'All Types',
    options: [
      { value: 'deliverable', label: 'Deliverable' },
      { value: 'test_result', label: 'Test Result' },
      { value: 'decision_record', label: 'Decision Record' },
      { value: 'change_history', label: 'Change History' },
      { value: 'approval_log', label: 'Approval Log' },
      { value: 'meeting_minutes', label: 'Meeting Minutes' },
    ],
  },
  {
    key: 'status',
    label: 'Status',
    type: 'enum',
    placeholder: 'All Statuses',
    options: [
      { value: 'approved', label: 'Approved' },
      { value: 'pending', label: 'Pending' },
      { value: 'rejected', label: 'Rejected' },
      { value: 'missing', label: 'Missing' },
    ],
  },
  {
    key: 'dateRange',
    label: 'Date Range',
    type: 'date',
    placeholder: 'All Dates',
  },
];

// AuditEvidenceFilters component

interface AuditEvidenceFiltersProps {
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  preset: ViewModePreset;
}

export function AuditEvidenceFilters({ values, onChange, preset }: AuditEvidenceFiltersProps) {
  return (
    <FilterSpecBar
      keys={AUDIT_EVIDENCE_FILTER_KEYS}
      values={values}
      onChange={onChange}
      activePreset={preset}
    />
  );
}
