import { memo } from 'react';
import { Target, TrendingUp } from 'lucide-react';
import { KpiCard } from './KpiCard';
import { useProjectDashboardStats } from '../../../../hooks/api/useDashboard';
import type { WidgetProps } from './types';

function KpiProgressCardInner({ projectId }: WidgetProps) {
  const { data: stats } = useProjectDashboardStats(projectId);
  const avgProgress = stats?.avgProgress ?? 0;

  const statusText = avgProgress >= 50 ? 'On Track' : avgProgress >= 30 ? '주의 필요' : '지연';
  const statusColor = avgProgress >= 50 ? 'text-green-600' : avgProgress >= 30 ? 'text-amber-600' : 'text-red-600';

  return (
    <KpiCard
      title="전체 진행률"
      value={`${avgProgress}%`}
      subtitle={
        <p className={`text-xs flex items-center gap-1 ${statusColor}`}>
          <TrendingUp size={14} />
          <span>{statusText}</span>
        </p>
      }
      icon={Target}
      iconBgColor="bg-blue-100"
      iconColor="text-blue-600"
    />
  );
}

export const KpiProgressCard = memo(KpiProgressCardInner);
