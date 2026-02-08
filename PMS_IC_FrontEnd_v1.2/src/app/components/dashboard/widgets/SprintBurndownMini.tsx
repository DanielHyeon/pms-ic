import { memo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertTriangle } from 'lucide-react';
import { useBurndown } from '../../../../hooks/api/useDashboard';
import { SectionStatus } from '../DataSourceBadge';
import type { WidgetProps } from './types';

function SprintBurndownMiniInner({ projectId, density }: WidgetProps) {
  const { data: burndownSection } = useBurndown(projectId);
  const burndown = burndownSection?.data;

  const chartData = (burndown?.dataPoints ?? []).map((p) => ({
    day: p.date,
    ideal: p.idealPoints,
    remaining: p.remainingPoints,
  }));

  const chartHeight = density === 'compact' ? 220 : density === 'detailed' ? 350 : 300;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">소멸 차트 (Current Sprint Burndown)</h3>
        <div className="flex items-center gap-2">
          {burndown && <span className="text-sm text-gray-500">{burndown.sprintName}</span>}
          <SectionStatus meta={burndownSection?.meta} />
        </div>
      </div>
      {chartData.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-12">활성 스프린트가 없습니다</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis label={{ value: 'Story Points', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="ideal"
                stroke="#d1d5db"
                strokeWidth={2}
                name="이상적 소멸"
                strokeDasharray="5 5"
              />
              <Line
                type="monotone"
                dataKey="remaining"
                stroke="#3b82f6"
                strokeWidth={2}
                name="실제 남은 작업"
              />
            </LineChart>
          </ResponsiveContainer>
          {burndown?.isApproximate && (
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-900">
                <AlertTriangle className="inline-block mr-2" size={16} />
                Approximate data: using task updated_at as proxy for status changes.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export const SprintBurndownMini = memo(SprintBurndownMiniInner);
