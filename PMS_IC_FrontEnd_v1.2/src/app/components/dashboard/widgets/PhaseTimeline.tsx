import { memo } from 'react';
import { usePhaseProgress } from '../../../../hooks/api/useDashboard';
import { SectionStatus } from '../DataSourceBadge';
import { getStatusColor, getStatusLabel, getTrackColor } from '../../../../utils/status';
import type { WidgetProps } from './types';

function PhaseTimelineInner({ projectId }: WidgetProps) {
  const { data: phaseSection } = usePhaseProgress(projectId);
  const phases = phaseSection?.data?.phases ?? [];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">단계별 진행 현황</h3>
        <SectionStatus meta={phaseSection?.meta} />
      </div>
      {phases.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">단계 데이터가 없습니다</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-600">단계명</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">트랙</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">작업</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">진척률</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">상태</th>
              </tr>
            </thead>
            <tbody>
              {phases.map((phase) => {
                const statusColors = getStatusColor(phase.derivedStatus);
                return (
                  <tr key={phase.phaseId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">{phase.phaseName}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getTrackColor(phase.trackType)}`}>
                        {phase.trackType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {phase.completedTasks}/{phase.totalTasks}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              phase.derivedStatus === 'normal'
                                ? 'bg-green-500'
                                : phase.derivedStatus === 'warning'
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                            }`}
                            style={{ width: `${phase.derivedProgress}%` }}
                          />
                        </div>
                        <span className="text-gray-700">{phase.derivedProgress}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusColors.bg} ${statusColors.text}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusColors.dot}`} />
                        {getStatusLabel(phase.derivedStatus)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export const PhaseTimeline = memo(PhaseTimelineInner);
