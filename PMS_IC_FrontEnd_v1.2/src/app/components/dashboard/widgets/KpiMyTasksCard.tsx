import { memo } from 'react';
import { ListTodo } from 'lucide-react';
import { KpiCard } from './KpiCard';
import type { WidgetProps } from './types';

function KpiMyTasksCardInner(_props: WidgetProps) {
  // My tasks - placeholder until personal task API is available
  return (
    <KpiCard
      title="내 작업"
      value={<span className="text-gray-400">--</span>}
      subtitle={<p className="text-xs text-gray-400">개인 작업 API 연동 예정</p>}
      icon={ListTodo}
      iconBgColor="bg-cyan-100"
      iconColor="text-cyan-600"
    />
  );
}

export const KpiMyTasksCard = memo(KpiMyTasksCardInner);
