import { memo, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: ReactNode;
  subtitle?: ReactNode;
  icon: LucideIcon;
  iconBgColor: string;
  iconColor: string;
  locked?: boolean;
}

/**
 * Generic KPI card shell used by all KPI_* widgets.
 * Renders a consistent card layout with icon, value, and subtitle.
 */
function KpiCardInner({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBgColor,
  iconColor,
  locked,
}: KpiCardProps) {
  if (locked) {
    return (
      <div className="bg-gray-100 rounded-xl shadow-sm border border-gray-200 p-6 relative">
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/90 rounded-xl backdrop-blur-sm">
          <div className="text-center">
            <Icon className="text-gray-400 mx-auto mb-2" size={24} />
            <p className="text-xs text-gray-500">접근 권한 없음</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <div className="text-3xl font-semibold text-gray-900 mt-2">{value}</div>
          {subtitle && <div className="mt-1">{subtitle}</div>}
        </div>
        <div className={`w-14 h-14 ${iconBgColor} rounded-full flex items-center justify-center`}>
          <Icon className={iconColor} size={28} />
        </div>
      </div>
    </div>
  );
}

export const KpiCard = memo(KpiCardInner);
