import { Gauge, Cpu, Server, Boxes, CheckCircle, Clock, Info } from 'lucide-react';
import { useWeightedProgress } from '../../../hooks/api/useDashboard';

interface WeightedProgressViewProps {
  projectId: string;
}

export default function WeightedProgressView({ projectId }: WeightedProgressViewProps) {
  const { data: progress, isLoading, error } = useWeightedProgress(projectId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-48"></div>
            <div className="h-48 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !progress) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center py-12">
          <Gauge className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">데이터를 불러올 수 없습니다</h3>
          <p className="text-gray-500">잠시 후 다시 시도해주세요.</p>
        </div>
      </div>
    );
  }

  const trackItems = [
    {
      name: 'AI Track',
      icon: Cpu,
      color: 'blue',
      progress: progress.aiProgress,
      weight: progress.aiWeight * 100,
      total: progress.aiTotalTasks,
      completed: progress.aiCompletedTasks,
    },
    {
      name: 'SI Track',
      icon: Server,
      color: 'green',
      progress: progress.siProgress,
      weight: progress.siWeight * 100,
      total: progress.siTotalTasks,
      completed: progress.siCompletedTasks,
    },
    {
      name: 'Common',
      icon: Boxes,
      color: 'amber',
      progress: progress.commonProgress,
      weight: progress.commonWeight * 100,
      total: progress.commonTotalTasks,
      completed: progress.commonCompletedTasks,
    },
  ];

  const getColorClasses = (color: string) => ({
    bg: `bg-${color}-500`,
    bgLight: `bg-${color}-100`,
    text: `text-${color}-600`,
    textDark: `text-${color}-700`,
  });

  return (
    <div className="space-y-6">
      {/* Overall Weighted Progress */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Gauge size={20} className="text-purple-600" />
            가중치 기반 통합 진척율
          </h3>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Info size={14} />
            <span>AI {(progress.aiWeight * 100).toFixed(0)}% + SI {(progress.siWeight * 100).toFixed(0)}% + Common {(progress.commonWeight * 100).toFixed(0)}%</span>
          </div>
        </div>

        {/* Main Gauge */}
        <div className="flex items-center justify-center py-8">
          <div className="relative w-48 h-48">
            {/* Background circle */}
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="88"
                className="stroke-gray-200"
                strokeWidth="12"
                fill="none"
              />
              <circle
                cx="96"
                cy="96"
                r="88"
                className="stroke-purple-500"
                strokeWidth="12"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 88}`}
                strokeDashoffset={`${2 * Math.PI * 88 * (1 - progress.weightedProgress / 100)}`}
                style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
              />
            </svg>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-gray-900">
                {progress.weightedProgress.toFixed(1)}%
              </span>
              <span className="text-sm text-gray-500">통합 진척율</span>
            </div>
          </div>
        </div>

        {/* Task Summary */}
        <div className="flex justify-center gap-8 mt-4">
          <div className="flex items-center gap-2">
            <CheckCircle size={16} className="text-green-500" />
            <span className="text-sm text-gray-600">
              완료: <span className="font-semibold">{progress.completedTasks}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-amber-500" />
            <span className="text-sm text-gray-600">
              진행중: <span className="font-semibold">{progress.totalTasks - progress.completedTasks}</span>
            </span>
          </div>
          <div className="text-sm text-gray-500">
            전체: {progress.totalTasks} 태스크
          </div>
        </div>
      </div>

      {/* Track-by-Track Progress */}
      <div className="grid grid-cols-3 gap-4">
        {trackItems.map((track) => {
          const Icon = track.icon;
          return (
            <div
              key={track.name}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className={`p-2 rounded-lg ${
                  track.color === 'blue' ? 'bg-blue-100' :
                  track.color === 'green' ? 'bg-green-100' : 'bg-amber-100'
                }`}>
                  <Icon size={20} className={
                    track.color === 'blue' ? 'text-blue-600' :
                    track.color === 'green' ? 'text-green-600' : 'text-amber-600'
                  } />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">{track.name}</h4>
                  <span className="text-xs text-gray-500">가중치: {track.weight.toFixed(0)}%</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">진척율</span>
                  <span className="font-semibold text-gray-900">{track.progress.toFixed(1)}%</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      track.color === 'blue' ? 'bg-blue-500' :
                      track.color === 'green' ? 'bg-green-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${track.progress}%` }}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">
                  {track.completed}/{track.total} 태스크
                </span>
                {track.weight > 0 && (
                  <span className={
                    track.color === 'blue' ? 'text-blue-600' :
                    track.color === 'green' ? 'text-green-600' : 'text-amber-600'
                  }>
                    기여도: {(track.progress * track.weight / 100).toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Weight Configuration Info */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
        <div className="flex items-start gap-3">
          <Info size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-1">가중치 기반 진척율 계산 방식</h4>
            <p className="text-sm text-blue-700">
              통합 진척율 = (AI 진척율 × {(progress.aiWeight * 100).toFixed(0)}%) +
              (SI 진척율 × {(progress.siWeight * 100).toFixed(0)}%) +
              (Common 진척율 × {(progress.commonWeight * 100).toFixed(0)}%)
            </p>
            <p className="text-xs text-blue-600 mt-2">
              가중치 설정은 프로젝트 설정에서 PM 권한으로 변경할 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
