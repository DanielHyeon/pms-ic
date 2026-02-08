import { memo } from 'react';
import { useProjectActivities } from '../../../../hooks/api/useDashboard';
import { getActivityColor } from '../../../../utils/status';
import type { WidgetProps } from './types';

function RecentActivitiesWidgetInner({ projectId }: WidgetProps) {
  const { data: activities = [] } = useProjectActivities(projectId);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="font-semibold text-gray-900 mb-4">최근 활동</h3>
      <div className="space-y-3">
        {activities.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">최근 활동이 없습니다</p>
        ) : (
          activities.slice(0, 10).map((activity, idx) => (
            <div
              key={idx}
              className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-0"
            >
              <div className={`w-2 h-2 rounded-full ${getActivityColor(activity.type || 'info')}`} />
              <div className="flex-1">
                <p className="text-sm text-gray-900">
                  <span className="font-medium">{activity.user}</span> {activity.action}
                </p>
              </div>
              <span className="text-xs text-gray-500">{activity.time}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export const RecentActivitiesWidget = memo(RecentActivitiesWidgetInner);
