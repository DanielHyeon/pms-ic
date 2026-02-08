import { memo } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { KpiCard } from './KpiCard';
import { useProjectDashboardStats } from '../../../../hooks/api/useDashboard';
import type { WidgetProps } from './types';

function KpiSprintCardInner({ projectId }: WidgetProps) {
  const { data: stats } = useProjectDashboardStats(projectId);
  const completedTasks = stats?.completedTasks ?? 0;
  const totalTasks = stats?.totalTasks ?? 0;

  return (
    <KpiCard
      title="완료 작업"
      value={completedTasks}
      subtitle={<p className="text-xs text-gray-600">총 {totalTasks}개 중</p>}
      icon={CheckCircle2}
      iconBgColor="bg-purple-100"
      iconColor="text-purple-600"
    />
  );
}

export const KpiSprintCard = memo(KpiSprintCardInner);
