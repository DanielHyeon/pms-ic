import { LucideIcon } from 'lucide-react';

export interface StatisticsCardProps {
  icon: LucideIcon;
  iconColor?: string;
  label: string;
  value: number | string;
  valueColor?: string;
  trend?: {
    value: number | string;
    direction: 'up' | 'down';
    isPositive?: boolean;
  };
}

/**
 * Reusable statistics card component for dashboard pages
 */
export default function StatisticsCard({
  icon: Icon,
  iconColor = 'text-gray-600',
  label,
  value,
  valueColor = 'text-gray-900',
  trend,
}: StatisticsCardProps) {
  const getTrendColor = () => {
    if (!trend) return '';
    const isGood = trend.isPositive !== undefined
      ? (trend.direction === 'up') === trend.isPositive
      : trend.direction === 'up';
    return isGood ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={20} className={iconColor} />
          <span className="text-sm text-gray-500">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {trend && (
            <span className={`text-xs px-1.5 py-0.5 rounded ${getTrendColor()}`}>
              {trend.direction === 'up' ? '↑' : '↓'} {trend.value}
            </span>
          )}
          <span className={`text-2xl font-bold ${valueColor}`}>{value}</span>
        </div>
      </div>
    </div>
  );
}

export interface StatisticsCardGridProps {
  children: React.ReactNode;
  columns?: 3 | 4 | 5;
}

/**
 * Grid wrapper for statistics cards
 */
export function StatisticsCardGrid({ children, columns = 4 }: StatisticsCardGridProps) {
  const gridCols = {
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-4`}>
      {children}
    </div>
  );
}
