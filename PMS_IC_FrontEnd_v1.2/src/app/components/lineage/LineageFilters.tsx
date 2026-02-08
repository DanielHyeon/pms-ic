import { useMemo } from 'react';
import { FilterSpecBar, type FilterKeyDef, type FilterValues } from '../common/FilterSpecBar';
import type { ViewModePreset } from '../../../types/menuOntology';

/**
 * FilterKeyDef definitions for the Lineage & History screen (Screen 13).
 * 8 filter keys matching the FilterSpec design:
 * - q (search), entityType, direction, depth, edgeType, nodeType, orphans, breakpoints
 */
const LINEAGE_FILTER_KEYS: FilterKeyDef[] = [
  {
    key: 'q',
    label: 'Search',
    type: 'search',
    placeholder: 'Search nodes by name or ID...',
  },
  {
    key: 'entityType',
    label: 'Entity Type',
    type: 'enum',
    placeholder: 'All Entity Types',
    options: [
      { value: 'Requirement', label: 'Requirement' },
      { value: 'Epic', label: 'Epic' },
      { value: 'Feature', label: 'Feature' },
      { value: 'Story', label: 'Story' },
      { value: 'Task', label: 'Task' },
      { value: 'TestCase', label: 'TestCase' },
      { value: 'Deliverable', label: 'Deliverable' },
      { value: 'Issue', label: 'Issue' },
      { value: 'Decision', label: 'Decision' },
      { value: 'Risk', label: 'Risk' },
    ],
  },
  {
    key: 'direction',
    label: 'Direction',
    type: 'enum',
    placeholder: 'All Directions',
    options: [
      { value: 'upstream', label: 'Upstream' },
      { value: 'downstream', label: 'Downstream' },
      { value: 'both', label: 'Both' },
    ],
  },
  {
    key: 'depth',
    label: 'Depth',
    type: 'enum',
    placeholder: 'All Depths',
    options: [
      { value: '1', label: '1' },
      { value: '2', label: '2' },
      { value: '3', label: '3' },
      { value: '5', label: '5' },
      { value: '7', label: '7' },
      { value: '10', label: '10' },
    ],
  },
  {
    key: 'edgeType',
    label: 'Edge Type',
    type: 'enum',
    placeholder: 'All Edge Types',
    options: [
      { value: 'TRACES_TO', label: 'Traces To' },
      { value: 'DERIVED_FROM', label: 'Derived From' },
      { value: 'BLOCKS', label: 'Blocks' },
      { value: 'DEPENDS_ON', label: 'Depends On' },
      { value: 'TESTS', label: 'Tests' },
      { value: 'PRODUCES', label: 'Produces' },
      { value: 'ESCALATED_TO', label: 'Escalated To' },
    ],
    hiddenInPresets: ['EXEC_SUMMARY', 'CUSTOMER_APPROVAL'],
  },
  {
    key: 'nodeType',
    label: 'Node Type',
    type: 'enum',
    placeholder: 'All Node Types',
    options: [
      { value: 'Requirement', label: 'Requirement' },
      { value: 'Epic', label: 'Epic' },
      { value: 'Feature', label: 'Feature' },
      { value: 'Story', label: 'Story' },
      { value: 'Task', label: 'Task' },
      { value: 'TestCase', label: 'TestCase' },
      { value: 'Deliverable', label: 'Deliverable' },
      { value: 'Issue', label: 'Issue' },
      { value: 'Decision', label: 'Decision' },
      { value: 'Risk', label: 'Risk' },
    ],
    hiddenInPresets: ['EXEC_SUMMARY', 'CUSTOMER_APPROVAL'],
  },
  {
    key: 'orphans',
    label: 'Orphan Nodes Only',
    type: 'boolean',
    hiddenInPresets: ['EXEC_SUMMARY', 'CUSTOMER_APPROVAL', 'DEV_EXECUTION'],
  },
  {
    key: 'breakpoints',
    label: 'Breakpoint Nodes Only',
    type: 'boolean',
    hiddenInPresets: ['EXEC_SUMMARY', 'CUSTOMER_APPROVAL', 'DEV_EXECUTION'],
  },
];

// ─── Component ───────────────────────────────────────────

interface LineageFiltersProps {
  values: FilterValues;
  onChange: (values: FilterValues) => void;
  preset: ViewModePreset;
  compact?: boolean;
}

export function LineageFilters({
  values,
  onChange,
  preset,
  compact = false,
}: LineageFiltersProps) {
  const keys = useMemo(() => LINEAGE_FILTER_KEYS, []);

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
export { LINEAGE_FILTER_KEYS };
