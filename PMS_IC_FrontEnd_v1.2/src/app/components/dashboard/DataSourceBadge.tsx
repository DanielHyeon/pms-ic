import type { DataSourceTier, Completeness, DashboardMeta } from '../../../types/dashboard';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';
import { cn } from '../ui/utils';

interface DataSourceBadgeProps {
  tier: DataSourceTier;
  className?: string;
}

const TIER_CONFIG: Record<DataSourceTier, { label: string; description: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  NOT_CONNECTED: {
    label: 'Not Connected',
    description: 'This section has no data source connected yet.',
    variant: 'destructive',
  },
  SAMPLE: {
    label: 'Sample Data',
    description: 'Displaying sample data for demonstration purposes.',
    variant: 'outline',
  },
  CONCEPT: {
    label: 'Concept',
    description: 'Feature under development. Display is conceptual only.',
    variant: 'secondary',
  },
};

export function DataSourceBadge({ tier, className }: DataSourceBadgeProps) {
  const config = TIER_CONFIG[tier];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant={config.variant} className={cn('text-[10px] px-1.5 py-0', className)}>
          {config.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{config.description}</TooltipContent>
    </Tooltip>
  );
}

interface SectionStatusProps {
  meta: DashboardMeta | undefined;
  className?: string;
}

const COMPLETENESS_STYLE: Record<Completeness, string> = {
  COMPLETE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  PARTIAL: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  NO_DATA: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export function SectionStatus({ meta, className }: SectionStatusProps) {
  if (!meta) return null;

  const hasWarnings = meta.warnings && meta.warnings.length > 0;
  const tooltipText = hasWarnings
    ? meta.warnings.map((w) => w.message).join('; ')
    : `Data as of ${new Date(meta.asOf).toLocaleString()} (${meta.computeMs}ms)`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium',
            COMPLETENESS_STYLE[meta.completeness],
            className,
          )}
        >
          {meta.completeness === 'COMPLETE' ? 'Live' : meta.completeness === 'PARTIAL' ? 'Partial' : 'No Data'}
        </span>
      </TooltipTrigger>
      <TooltipContent>{tooltipText}</TooltipContent>
    </Tooltip>
  );
}
