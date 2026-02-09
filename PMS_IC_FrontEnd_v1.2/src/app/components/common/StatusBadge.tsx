import { getWorkflowStatusColor, getWorkflowStatusLabel } from '../../../constants/statusMaps';

interface StatusBadgeProps {
  status: string;
  /** Override the label derived from WORKFLOW_STATUS_LABELS */
  label?: string;
  /** Override the color class derived from WORKFLOW_STATUS_COLORS */
  className?: string;
}

/**
 * Shared status badge component.
 * Uses the consolidated WORKFLOW_STATUS_COLORS / LABELS from constants/statusMaps.
 * Pass custom `label` or `className` to override defaults for domain-specific statuses.
 */
export default function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const colorClass = className || getWorkflowStatusColor(status);
  const displayLabel = label || getWorkflowStatusLabel(status);

  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
      {displayLabel}
    </span>
  );
}
