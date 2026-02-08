import { memo } from 'react';
import { Cpu, Cog, Layers } from 'lucide-react';
import { useWeightedProgress } from '../../../../hooks/api/useDashboard';
import { getStatusColor, getStatusLabel } from '../../../../utils/status';
import type { WidgetProps } from './types';

interface TrackData {
  label: string;
  progress: number;
  status: string;
  tasks: number;
  completed: number;
  icon: typeof Cpu;
  iconBgColor: string;
  iconColor: string;
  barColor: string;
}

function TrackProgressWidgetInner({ projectId }: WidgetProps) {
  const { data: progress } = useWeightedProgress(projectId);

  const deriveStatus = (pct: number): string =>
    pct >= 50 ? 'normal' : pct >= 30 ? 'warning' : 'danger';

  const tracks: TrackData[] = [
    {
      label: 'AI 트랙',
      progress: Math.round(progress?.aiProgress ?? 0),
      status: deriveStatus(progress?.aiProgress ?? 0),
      tasks: progress?.aiTotalTasks ?? 0,
      completed: progress?.aiCompletedTasks ?? 0,
      icon: Cpu,
      iconBgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
      barColor: 'bg-blue-500',
    },
    {
      label: 'SI 트랙',
      progress: Math.round(progress?.siProgress ?? 0),
      status: deriveStatus(progress?.siProgress ?? 0),
      tasks: progress?.siTotalTasks ?? 0,
      completed: progress?.siCompletedTasks ?? 0,
      icon: Cog,
      iconBgColor: 'bg-green-100',
      iconColor: 'text-green-600',
      barColor: 'bg-green-500',
    },
    {
      label: '공통 트랙',
      progress: Math.round(progress?.commonProgress ?? 0),
      status: deriveStatus(progress?.commonProgress ?? 0),
      tasks: progress?.commonTotalTasks ?? 0,
      completed: progress?.commonCompletedTasks ?? 0,
      icon: Layers,
      iconBgColor: 'bg-purple-100',
      iconColor: 'text-purple-600',
      barColor: 'bg-purple-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {tracks.map((track) => {
        const Icon = track.icon;
        const colors = getStatusColor(track.status);
        return (
          <div
            key={track.label}
            className={`bg-white rounded-xl shadow-sm border p-6 ${colors.border}`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 ${track.iconBgColor} rounded-lg flex items-center justify-center`}>
                <Icon className={track.iconColor} size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">{track.label}</h4>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${colors.bg} ${colors.text}`}
                >
                  {getStatusLabel(track.status)}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">진척률</span>
                <span className="font-semibold">{track.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`${track.barColor} h-3 rounded-full transition-all`}
                  style={{ width: `${track.progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                완료: {track.completed}/{track.tasks} 작업
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export const TrackProgressWidget = memo(TrackProgressWidgetInner);
