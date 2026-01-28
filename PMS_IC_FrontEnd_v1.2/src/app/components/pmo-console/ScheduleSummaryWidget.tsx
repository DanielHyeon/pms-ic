import { CalendarDays, ArrowRight, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ScheduleSummaryWidgetProps {
  projectId: string;
}

export default function ScheduleSummaryWidget({ projectId }: ScheduleSummaryWidgetProps) {
  const navigate = useNavigate();

  const handleNavigate = () => {
    navigate('/wbs');
  };

  // Mock data (would be replaced with actual API call)
  const stats = {
    totalItems: 156,
    completed: 98,
    inProgress: 42,
    delayed: 6,
    upcoming: 10,
  };

  const overallProgress = stats.totalItems > 0
    ? Math.round((stats.completed / stats.totalItems) * 100)
    : 0;

  const upcomingMilestones = [
    { name: 'AI 모델 1차 배포', dueDate: '2026-02-05', daysLeft: 8, status: 'ontrack' },
    { name: '통합 테스트 완료', dueDate: '2026-02-15', daysLeft: 18, status: 'ontrack' },
    { name: 'UAT 시작', dueDate: '2026-02-20', daysLeft: 23, status: 'atrisk' },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ontrack':
        return <CheckCircle size={14} className="text-green-500" />;
      case 'atrisk':
        return <AlertTriangle size={14} className="text-amber-500" />;
      case 'delayed':
        return <AlertTriangle size={14} className="text-red-500" />;
      default:
        return <Clock size={14} className="text-gray-400" />;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <CalendarDays size={20} className="text-indigo-600" />
          WBS 일정 현황
        </h3>
        <button
          type="button"
          onClick={handleNavigate}
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          자세히 보기
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Overall Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">전체 진행률</span>
          <span className="font-medium text-gray-900">{overallProgress}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Delay Alert */}
      {stats.delayed > 0 && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle size={16} />
            <span className="text-sm font-medium">
              {stats.delayed}개 작업 지연 중
            </span>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="text-center p-2 bg-green-50 rounded">
          <div className="text-lg font-bold text-green-700">{stats.completed}</div>
          <div className="text-xs text-gray-500">완료</div>
        </div>
        <div className="text-center p-2 bg-blue-50 rounded">
          <div className="text-lg font-bold text-blue-700">{stats.inProgress}</div>
          <div className="text-xs text-gray-500">진행중</div>
        </div>
        <div className="text-center p-2 bg-red-50 rounded">
          <div className="text-lg font-bold text-red-700">{stats.delayed}</div>
          <div className="text-xs text-gray-500">지연</div>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded">
          <div className="text-lg font-bold text-gray-700">{stats.upcoming}</div>
          <div className="text-xs text-gray-500">예정</div>
        </div>
      </div>

      {/* Upcoming Milestones */}
      <div className="border-t border-gray-100 pt-3">
        <p className="text-xs text-gray-500 mb-2">주요 마일스톤</p>
        <div className="space-y-2">
          {upcomingMilestones.map((milestone, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {getStatusIcon(milestone.status)}
                <span className="text-gray-700 truncate">{milestone.name}</span>
              </div>
              <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                D-{milestone.daysLeft}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
