import { CheckCircle, Minus, AlertTriangle } from 'lucide-react';
import { Badge } from '../ui/badge';
import type { TraceStatusValue } from '../../../types/requirement';
import { cn } from '../ui/utils';

const traceStatusConfig: Record<
  TraceStatusValue,
  { label: string; className: string; icon: typeof CheckCircle }
> = {
  linked: {
    label: 'Linked',
    className: 'bg-green-100 text-green-700 border-green-200',
    icon: CheckCircle,
  },
  unlinked: {
    label: 'Unlinked',
    className: 'bg-gray-100 text-gray-600 border-gray-200',
    icon: Minus,
  },
  breakpoint: {
    label: 'Breakpoint',
    className: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: AlertTriangle,
  },
};

interface TraceStatusBadgeProps {
  status: TraceStatusValue;
  compact?: boolean;
  className?: string;
}

export function TraceStatusBadge({ status, compact = false, className }: TraceStatusBadgeProps) {
  const config = traceStatusConfig[status];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(config.className, className)}
    >
      <Icon className={cn('mr-1', compact ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
      {!compact && <span className="text-xs">{config.label}</span>}
    </Badge>
  );
}
