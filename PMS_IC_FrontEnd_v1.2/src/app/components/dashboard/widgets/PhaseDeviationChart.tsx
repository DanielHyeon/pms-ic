import { memo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { usePhaseProgress } from '../../../../hooks/api/useDashboard';
import { SectionStatus } from '../DataSourceBadge';
import type { WidgetProps } from './types';

function PhaseDeviationChartInner({ projectId, density }: WidgetProps) {
  const { data: phaseSection } = usePhaseProgress(projectId);
  const phases = phaseSection?.data?.phases ?? [];

  const chartData = phases.map((p) => ({
    phase: p.phaseName,
    planned: 100,
    actual: p.derivedProgress,
  }));

  const chartHeight = density === 'compact' ? 220 : density === 'detailed' ? 350 : 300;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">단계별 진행 현황 (Waterfall View)</h3>
        <SectionStatus meta={phaseSection?.meta} />
      </div>
      {chartData.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-12">차트 데이터가 없습니다</p>
      ) : (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="phase" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="planned" fill="#93c5fd" name="계획" />
            <Bar dataKey="actual" fill="#3b82f6" name="실적" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export const PhaseDeviationChart = memo(PhaseDeviationChartInner);
