import { memo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { KpiCard } from './KpiCard';
import { useProjectDashboardStats } from '../../../../hooks/api/useDashboard';
import type { WidgetProps } from './types';

function KpiIssueCardInner({ projectId }: WidgetProps) {
  const { data: stats } = useProjectDashboardStats(projectId);
  const openIssues = stats?.openIssues ?? 0;
  const highPriorityIssues = stats?.highPriorityIssues ?? 0;

  return (
    <KpiCard
      title="활성 이슈"
      value={openIssues}
      subtitle={
        <p className="text-xs text-amber-600 flex items-center gap-1">
          <AlertTriangle size={14} />
          <span>{highPriorityIssues} High Priority</span>
        </p>
      }
      icon={AlertTriangle}
      iconBgColor="bg-amber-100"
      iconColor="text-amber-600"
    />
  );
}

export const KpiIssueCard = memo(KpiIssueCardInner);
