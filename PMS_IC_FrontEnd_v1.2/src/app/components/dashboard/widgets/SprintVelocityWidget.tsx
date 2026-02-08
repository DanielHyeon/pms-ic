import { memo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useSprintVelocity } from '../../../../hooks/api/useDashboard';
import { SectionStatus } from '../DataSourceBadge';
import type { WidgetProps } from './types';

function SprintVelocityWidgetInner({ projectId, density }: WidgetProps) {
  const { data: velocitySection } = useSprintVelocity(projectId);
  const sprints = velocitySection?.data?.sprints ?? [];

  const chartData = sprints.map((s) => ({
    sprint: s.sprintName,
    planned: s.plannedPoints,
    velocity: s.completedPoints,
  }));

  const chartHeight = density === 'compact' ? 220 : density === 'detailed' ? 350 : 300;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">스프린트 속도 (Sprint Velocity)</h3>
        <SectionStatus meta={velocitySection?.meta} />
      </div>
      {chartData.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-12">스프린트 데이터가 없습니다</p>
      ) : (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="sprint" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="planned" fill="#d1d5db" name="계획 Story Points" />
            <Bar dataKey="velocity" fill="#8b5cf6" name="실제 Velocity" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export const SprintVelocityWidget = memo(SprintVelocityWidgetInner);
