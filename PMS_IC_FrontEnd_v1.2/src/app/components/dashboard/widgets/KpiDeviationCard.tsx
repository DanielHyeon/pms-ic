import { memo } from 'react';
import { TrendingDown } from 'lucide-react';
import { KpiCard } from './KpiCard';
import { usePhaseProgress } from '../../../../hooks/api/useDashboard';
import type { WidgetProps } from './types';

function KpiDeviationCardInner({ projectId }: WidgetProps) {
  const { data: phaseSection } = usePhaseProgress(projectId);
  const phases = phaseSection?.data?.phases ?? [];

  // Calculate average deviation: planned (100%) - actual progress
  const avgDeviation =
    phases.length > 0
      ? Math.round(
          phases.reduce((sum, p) => sum + (100 - p.derivedProgress), 0) / phases.length
        )
      : 0;

  const deviationColor =
    avgDeviation <= 10 ? 'text-green-600' : avgDeviation <= 30 ? 'text-amber-600' : 'text-red-600';
  const deviationLabel =
    avgDeviation <= 10 ? '정상 범위' : avgDeviation <= 30 ? '주의 필요' : '심각한 지연';

  return (
    <KpiCard
      title="평균 편차"
      value={`${avgDeviation}%`}
      subtitle={
        <p className={`text-xs flex items-center gap-1 ${deviationColor}`}>
          <TrendingDown size={14} />
          <span>{deviationLabel}</span>
        </p>
      }
      icon={TrendingDown}
      iconBgColor="bg-indigo-100"
      iconColor="text-indigo-600"
    />
  );
}

export const KpiDeviationCard = memo(KpiDeviationCardInner);
