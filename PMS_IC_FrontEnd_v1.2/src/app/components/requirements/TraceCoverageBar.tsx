import { cn } from '../ui/utils';

interface TraceCoverageBarProps {
  coverage: number; // 0-100
  showLabel?: boolean;
  className?: string;
}

function getCoverageColor(coverage: number): string {
  if (coverage >= 80) return 'bg-green-500';
  if (coverage >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
}

function getCoverageTextColor(coverage: number): string {
  if (coverage >= 80) return 'text-green-700';
  if (coverage >= 50) return 'text-yellow-700';
  return 'text-red-700';
}

export function TraceCoverageBar({
  coverage,
  showLabel = true,
  className,
}: TraceCoverageBarProps) {
  const clampedCoverage = Math.min(100, Math.max(0, coverage));

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden min-w-[60px]">
        <div
          className={cn('h-full rounded-full transition-all duration-300', getCoverageColor(clampedCoverage))}
          style={{ width: `${clampedCoverage}%` }}
        />
      </div>
      {showLabel && (
        <span className={cn('text-xs font-medium whitespace-nowrap', getCoverageTextColor(clampedCoverage))}>
          {clampedCoverage}%
        </span>
      )}
    </div>
  );
}
