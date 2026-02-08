import { memo } from 'react';
import { DollarSign } from 'lucide-react';
import { KpiCard } from './KpiCard';
import { StatValue } from '../StatValue';
import { useProjectDashboardStats } from '../../../../hooks/api/useDashboard';
import { canViewBudget } from '../../../../utils/rolePermissions';
import type { UserRole } from '../../../App';
import type { WidgetProps } from './types';

function KpiBudgetCardInner({ projectId, userRole }: WidgetProps) {
  const { data: stats } = useProjectDashboardStats(projectId);
  const canView = canViewBudget(userRole as UserRole);

  if (!canView) {
    return (
      <KpiCard
        title="예산 집행률"
        value="--"
        icon={DollarSign}
        iconBgColor="bg-green-100"
        iconColor="text-green-600"
        locked
      />
    );
  }

  return (
    <KpiCard
      title="예산 집행률"
      value={
        <StatValue
          value={stats?.budgetExecutionRate}
          suffix="%"
          naReason="Budget spent tracking not yet implemented"
          className="text-3xl font-semibold text-gray-900"
        />
      }
      subtitle={
        <p className="text-xs text-gray-600">
          <StatValue
            value={stats?.budgetSpent != null ? Number(stats.budgetSpent) : null}
            format={(v) => `\u20A9${(v / 100000000).toFixed(0)}억`}
            naReason="Budget spent tracking not yet implemented"
          />
          {stats?.budgetTotal != null && (
            <> / \u20A9{(Number(stats.budgetTotal) / 100000000).toFixed(0)}억</>
          )}
        </p>
      }
      icon={DollarSign}
      iconBgColor="bg-green-100"
      iconColor="text-green-600"
    />
  );
}

export const KpiBudgetCard = memo(KpiBudgetCardInner);
