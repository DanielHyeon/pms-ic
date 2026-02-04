import { cn } from '../ui/utils';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';

interface StatValueProps {
  value: number | null | undefined;
  format?: (v: number) => string;
  suffix?: string;
  prefix?: string;
  naReason?: string;
  className?: string;
}

/**
 * Enforces the "null = N/A, 0 = genuine zero" display policy.
 * When value is null/undefined, shows "N/A" with an optional tooltip reason.
 * When value is 0, shows "0" — never conflates missing data with zero.
 */
export function StatValue({
  value,
  format,
  suffix,
  prefix,
  naReason,
  className,
}: StatValueProps) {
  if (value === null || value === undefined) {
    const display = (
      <span className={cn('text-muted-foreground italic', className)}>N/A</span>
    );

    if (naReason) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{display}</TooltipTrigger>
          <TooltipContent>{naReason}</TooltipContent>
        </Tooltip>
      );
    }
    return display;
  }

  const formatted = format ? format(value) : String(value);

  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
