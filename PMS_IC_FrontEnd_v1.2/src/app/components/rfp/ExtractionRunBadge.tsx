import { Cpu, CheckCircle, XCircle, Loader2, Clock } from 'lucide-react';
import { Badge } from '../ui/badge';
import type { ExtractionRunSummary } from '../../../types/rfp';
import { cn } from '../ui/utils';

const RUN_STATUS_CONFIG: Record<string, { icon: typeof Cpu; color: string }> = {
  PENDING: { icon: Clock, color: 'bg-gray-100 text-gray-600' },
  RUNNING: { icon: Loader2, color: 'bg-blue-100 text-blue-600' },
  COMPLETED: { icon: CheckCircle, color: 'bg-green-100 text-green-600' },
  FAILED: { icon: XCircle, color: 'bg-red-100 text-red-600' },
};

interface ExtractionRunBadgeProps {
  run?: ExtractionRunSummary;
  className?: string;
}

export function ExtractionRunBadge({ run, className }: ExtractionRunBadgeProps) {
  if (!run) return null;

  const config = RUN_STATUS_CONFIG[run.status] || RUN_STATUS_CONFIG.PENDING;
  const Icon = config.icon;

  const timeStr = run.finishedAt
    ? `${Math.round((new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)}s`
    : '';

  return (
    <Badge className={cn(config.color, 'text-xs', className)}>
      <Icon className={cn('h-3 w-3 mr-1', run.status === 'RUNNING' && 'animate-spin')} />
      <span>{run.modelName}</span>
      {timeStr && <span className="ml-1 opacity-70">{timeStr}</span>}
    </Badge>
  );
}
