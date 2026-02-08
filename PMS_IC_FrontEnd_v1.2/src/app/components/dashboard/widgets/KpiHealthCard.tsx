import { memo } from 'react';
import { Activity } from 'lucide-react';
import { KpiCard } from './KpiCard';
import { useProjectDashboardStats } from '../../../../hooks/api/useDashboard';
import type { WidgetProps } from './types';

function KpiHealthCardInner({ projectId }: WidgetProps) {
  const { data: stats } = useProjectDashboardStats(projectId);
  const avgProgress = stats?.avgProgress ?? 0;

  // Health score derivation: progress-based with issue penalty
  const openIssues = stats?.openIssues ?? 0;
  const issuePenalty = Math.min(openIssues * 2, 20);
  const healthScore = Math.max(0, Math.min(100, avgProgress - issuePenalty));

  const grade =
    healthScore >= 80 ? 'A' : healthScore >= 60 ? 'B' : healthScore >= 40 ? 'C' : 'D';
  const gradeColor =
    healthScore >= 80
      ? 'text-green-600'
      : healthScore >= 60
        ? 'text-blue-600'
        : healthScore >= 40
          ? 'text-amber-600'
          : 'text-red-600';

  return (
    <KpiCard
      title="프로젝트 건강도"
      value={
        <span>
          {healthScore}
          <span className={`text-lg ml-2 ${gradeColor}`}>({grade})</span>
        </span>
      }
      subtitle={
        <p className={`text-xs ${gradeColor}`}>
          {healthScore >= 80 ? '양호' : healthScore >= 60 ? '보통' : healthScore >= 40 ? '주의' : '위험'}
        </p>
      }
      icon={Activity}
      iconBgColor="bg-emerald-100"
      iconColor="text-emerald-600"
    />
  );
}

export const KpiHealthCard = memo(KpiHealthCardInner);
