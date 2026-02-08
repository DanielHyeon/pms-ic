import { memo } from 'react';
import { User } from 'lucide-react';
import { usePartStats } from '../../../../hooks/api/useDashboard';
import { SectionStatus } from '../DataSourceBadge';
import { getStatusColor, getStatusLabel } from '../../../../utils/status';
import type { WidgetProps } from './types';

function PartLeadersWidgetInner({ projectId }: WidgetProps) {
  const { data: partSection } = usePartStats(projectId);
  const parts = partSection?.data?.parts ?? [];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">파트 리더별 현황</h3>
        <SectionStatus meta={partSection?.meta} />
      </div>
      {parts.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">파트 데이터가 없습니다</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {parts.map((part) => {
            const statusColors = getStatusColor(part.status);
            return (
              <div key={part.partId} className={`border rounded-lg p-4 ${statusColors.border}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <User className="text-gray-600" size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{part.leaderName}</p>
                    <p className="text-xs text-gray-500">{part.partName}</p>
                  </div>
                  <span
                    className={`ml-auto px-2 py-0.5 rounded-full text-xs font-medium ${statusColors.bg} ${statusColors.text}`}
                  >
                    {getStatusLabel(part.status)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-green-50 rounded p-2">
                    <p className="text-lg font-semibold text-green-700">{part.completedTasks}</p>
                    <p className="text-xs text-green-600">완료</p>
                  </div>
                  <div className="bg-blue-50 rounded p-2">
                    <p className="text-lg font-semibold text-blue-700">{part.inProgressTasks}</p>
                    <p className="text-xs text-blue-600">진행중</p>
                  </div>
                  <div className="bg-red-50 rounded p-2">
                    <p className="text-lg font-semibold text-red-700">{part.blockedTasks}</p>
                    <p className="text-xs text-red-600">블로커</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const PartLeadersWidget = memo(PartLeadersWidgetInner);
