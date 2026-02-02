import { getProgressColor } from '../../../types/wbs';

interface WbsProgressBarProps {
  progress: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export default function WbsProgressBar({
  progress,
  size = 'md',
  showLabel = true,
  className = '',
}: WbsProgressBarProps) {
  const normalizedProgress = Math.min(100, Math.max(0, progress));

  const heightClass = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  }[size];

  const textClass = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }[size];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`flex-1 bg-gray-200 rounded-full overflow-hidden ${heightClass}`}>
        <div
          className={`${heightClass} ${getProgressColor(normalizedProgress)} rounded-full transition-all duration-300`}
          style={{ width: `${normalizedProgress}%` }}
        />
      </div>
      {showLabel && (
        <span className={`${textClass} font-medium text-gray-600 min-w-[3rem] text-right`}>
          {normalizedProgress}%
        </span>
      )}
    </div>
  );
}
