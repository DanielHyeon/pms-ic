import { memo } from 'react';
import { ShieldAlert } from 'lucide-react';
import { KpiCard } from './KpiCard';
import { useProjectDashboardStats } from '../../../../hooks/api/useDashboard';
import type { WidgetProps } from './types';

function KpiRiskCardInner({ projectId }: WidgetProps) {
  const { data: stats } = useProjectDashboardStats(projectId);
  const highPriority = stats?.highPriorityIssues ?? 0;

  const riskLevel = highPriority >= 5 ? '높음' : highPriority >= 2 ? '보통' : '낮음';
  const riskColor =
    highPriority >= 5 ? 'text-red-600' : highPriority >= 2 ? 'text-amber-600' : 'text-green-600';

  return (
    <KpiCard
      title="리스크 수준"
      value={highPriority}
      subtitle={
        <p className={`text-xs flex items-center gap-1 ${riskColor}`}>
          <ShieldAlert size={14} />
          <span>{riskLevel}</span>
        </p>
      }
      icon={ShieldAlert}
      iconBgColor="bg-red-100"
      iconColor="text-red-600"
    />
  );
}

export const KpiRiskCard = memo(KpiRiskCardInner);
