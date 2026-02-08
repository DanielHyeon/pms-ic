import { memo } from 'react';
import { Clock } from 'lucide-react';
import { KpiCard } from './KpiCard';
import type { WidgetProps } from './types';

function KpiPendingCardInner(_props: WidgetProps) {
  // Pending approvals count - placeholder until approval API is available
  return (
    <KpiCard
      title="승인 대기"
      value={<span className="text-gray-400">--</span>}
      subtitle={<p className="text-xs text-gray-400">승인 API 연동 예정</p>}
      icon={Clock}
      iconBgColor="bg-orange-100"
      iconColor="text-orange-600"
    />
  );
}

export const KpiPendingCard = memo(KpiPendingCardInner);
