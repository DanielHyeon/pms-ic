import { FilterSpecBar } from '../common/FilterSpecBar';
import type { FilterKeyDef, FilterValues } from '../common/FilterSpecBar';
import type { ViewModePreset } from '../../../types/menuOntology';

// ── Decision/Risk filter key definitions ──────────────────

export const DECISION_RISK_FILTER_KEYS: FilterKeyDef[] = [
  {
    key: 'q',
    label: 'Search',
    type: 'search',
    placeholder: 'Search decisions & risks...',
  },
  {
    key: 'type',
    label: 'Type',
    type: 'enum',
    placeholder: 'All Types',
    options: [
      { value: 'decision', label: 'Decision' },
      { value: 'risk', label: 'Risk' },
    ],
  },
  {
    key: 'decisionStatus',
    label: 'Decision Status',
    type: 'enum',
    placeholder: 'All Decision Statuses',
    options: [
      { value: 'PROPOSED', label: 'Proposed' },
      { value: 'UNDER_REVIEW', label: 'Under Review' },
      { value: 'APPROVED', label: 'Approved' },
      { value: 'REJECTED', label: 'Rejected' },
      { value: 'DEFERRED', label: 'Deferred' },
    ],
  },
  {
    key: 'riskStatus',
    label: 'Risk Status',
    type: 'enum',
    placeholder: 'All Risk Statuses',
    options: [
      { value: 'IDENTIFIED', label: 'Identified' },
      { value: 'ASSESSED', label: 'Assessed' },
      { value: 'MITIGATING', label: 'Mitigating' },
      { value: 'RESOLVED', label: 'Resolved' },
      { value: 'ACCEPTED', label: 'Accepted' },
    ],
  },
  {
    key: 'severity',
    label: 'Severity',
    type: 'enum',
    placeholder: 'All Severities',
    options: [
      { value: 'critical', label: 'Critical' },
      { value: 'high', label: 'High' },
      { value: 'medium', label: 'Medium' },
      { value: 'low', label: 'Low' },
    ],
    hiddenInPresets: ['EXEC_SUMMARY', 'CUSTOMER_APPROVAL'],
  },
  {
    key: 'ownerId',
    label: 'Owner',
    type: 'enum',
    placeholder: 'All Owners',
    options: [], // Dynamic from API
    hiddenInPresets: ['EXEC_SUMMARY', 'CUSTOMER_APPROVAL'],
  },
  {
    key: 'phaseId',
    label: 'Phase',
    type: 'enum',
    placeholder: 'All Phases',
    options: [], // Dynamic from API
    hiddenInPresets: ['EXEC_SUMMARY', 'CUSTOMER_APPROVAL'],
  },
  {
    key: 'hasEscalation',
    label: 'Has Escalation',
    type: 'boolean',
    placeholder: 'All',
    hiddenInPresets: ['EXEC_SUMMARY', 'CUSTOMER_APPROVAL', 'DEV_EXECUTION'],
  },
];

// ── DecisionRiskFilters component ─────────────────────────

interface DecisionRiskFiltersProps {
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  preset: ViewModePreset;
}

export function DecisionRiskFilters({
  values,
  onChange,
  preset,
}: DecisionRiskFiltersProps) {
  return (
    <FilterSpecBar
      keys={DECISION_RISK_FILTER_KEYS}
      values={values}
      onChange={onChange}
      activePreset={preset}
    />
  );
}
