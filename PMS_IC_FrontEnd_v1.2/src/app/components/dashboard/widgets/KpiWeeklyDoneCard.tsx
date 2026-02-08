import { memo } from 'react';
import { CalendarCheck } from 'lucide-react';
import { KpiCard } from './KpiCard';
import type { WidgetProps } from './types';

function KpiWeeklyDoneCardInner(_props: WidgetProps) {
  // Weekly completion rate - placeholder until weekly stats API is available
  return (
    <KpiCard
      title="금주 완료율"
      value={<span className="text-gray-400">--</span>}
      subtitle={<p className="text-xs text-gray-400">주간 통계 API 연동 예정</p>}
      icon={CalendarCheck}
      iconBgColor="bg-teal-100"
      iconColor="text-teal-600"
    />
  );
}

export const KpiWeeklyDoneCard = memo(KpiWeeklyDoneCardInner);
