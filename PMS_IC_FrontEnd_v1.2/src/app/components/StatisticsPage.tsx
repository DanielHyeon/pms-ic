import { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  Target,
  Activity,
  PieChart,
  Gauge,
  LayoutGrid,
  Minus,
} from 'lucide-react';
import { UserRole } from '../App';
import { useProject } from '../../contexts/ProjectContext';
import {
  useProjectDashboardStats,
  usePhaseProgress,
  usePartStats,
  useSprintVelocity,
} from '../../hooks/api/useDashboard';
import { SectionStatus } from './dashboard/DataSourceBadge';
import { StatValue } from './dashboard/StatValue';
import { PartComparisonView, WeightedProgressView } from './statistics';
import type { DashboardStats, PhaseMetric, PartLeaderMetric, SprintMetric } from '../../types/dashboard';

interface StatisticsPageProps {
  userRole: UserRole;
  projectId?: string;
}

type StatisticsTab = 'overview' | 'parts' | 'weighted';

const TABS: { id: StatisticsTab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: '개요', icon: LayoutGrid },
  { id: 'parts', label: 'Part별 진척', icon: Users },
  { id: 'weighted', label: '통합 진척율', icon: Gauge },
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DONE: { label: '완료', color: 'bg-green-500' },
  IN_PROGRESS: { label: '진행중', color: 'bg-blue-500' },
  TODO: { label: '할 일', color: 'bg-gray-400' },
  BACKLOG: { label: '백로그', color: 'bg-gray-300' },
  REVIEW: { label: '검토', color: 'bg-purple-500' },
  TESTING: { label: '테스트', color: 'bg-amber-500' },
  BLOCKED: { label: '차단', color: 'bg-red-500' },
};

export default function StatisticsPage({ userRole }: StatisticsPageProps) {
  const { currentProject } = useProject();
  const projectId = currentProject?.id || null;

  const [activeTab, setActiveTab] = useState<StatisticsTab>('overview');

  // Real API hooks
  const { data: dashboardStats, isLoading: isLoadingStats } = useProjectDashboardStats(projectId);
  const { data: phaseSection } = usePhaseProgress(projectId);
  const { data: partSection } = usePartStats(projectId);
  const { data: velocitySection } = useSprintVelocity(projectId);

  const stats: Partial<DashboardStats> = dashboardStats || {};
  const phases: PhaseMetric[] = phaseSection?.data?.phases ?? [];
  const parts: PartLeaderMetric[] = partSection?.data?.parts ?? [];
  const sprints: SprintMetric[] = velocitySection?.data?.sprints ?? [];

  // Derived metrics
  const totalTasks = stats.totalTasks ?? 0;
  const completedTasks = stats.completedTasks ?? 0;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Sprint velocity trend (compare last 2 completed sprints)
  const velocityTrend = useMemo(() => {
    const completed = sprints.filter((s) => s.status === 'COMPLETED' || s.completedPoints > 0);
    if (completed.length < 2) {
      return { current: completed[0]?.completedPoints ?? 0, previous: null, trend: 'flat' as const };
    }
    const current = completed[completed.length - 1].completedPoints;
    const previous = completed[completed.length - 2].completedPoints;
    return {
      current,
      previous,
      trend: current > previous ? ('up' as const) : current < previous ? ('down' as const) : ('flat' as const),
    };
  }, [sprints]);

  // Task status distribution
  const tasksByStatus = useMemo(() => {
    const raw = stats.tasksByStatus ?? {};
    return Object.entries(raw)
      .map(([status, count]) => ({
        status,
        label: STATUS_LABELS[status]?.label ?? status,
        count,
        color: STATUS_LABELS[status]?.color ?? 'bg-gray-400',
      }))
      .sort((a, b) => b.count - a.count);
  }, [stats.tasksByStatus]);

  const getTrendIcon = (trend: 'up' | 'down' | 'flat') => {
    if (trend === 'up') return <TrendingUp size={16} className="text-green-600" />;
    if (trend === 'down') return <TrendingDown size={16} className="text-red-600" />;
    return <Minus size={16} className="text-gray-400" />;
  };

  if (!projectId) {
    return (
      <div className="flex-1 p-6">
        <div className="text-center py-20">
          <BarChart3 className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">프로젝트를 선택하세요</h3>
          <p className="text-gray-500">통계를 확인할 프로젝트를 먼저 선택해주세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">통계 대시보드</h1>
          <p className="text-gray-500 mt-1">
            {currentProject?.name ? `${currentProject.name} - ` : ''}프로젝트 현황 분석 및 성과 지표
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'parts' && <PartComparisonView projectId={projectId} />}

      {activeTab === 'weighted' && <WeightedProgressView projectId={projectId} />}

      {activeTab === 'overview' && (
        <>
          {isLoadingStats ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">통계 데이터를 불러오는 중...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Target size={20} className="text-blue-600" />
                      <span className="text-sm text-gray-500">완료율</span>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{completionRate}%</div>
                  <p className="text-xs text-gray-500 mt-1">{completedTasks}/{totalTasks} 작업 완료</p>
                  <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Activity size={20} className="text-green-600" />
                      <span className="text-sm text-gray-500">스프린트 속도</span>
                    </div>
                    {velocityTrend.previous !== null && (
                      <div className="flex items-center gap-1">
                        {getTrendIcon(velocityTrend.trend)}
                        <span className={`text-xs ${velocityTrend.trend === 'up' ? 'text-green-600' : velocityTrend.trend === 'down' ? 'text-red-600' : 'text-gray-400'}`}>
                          {Math.abs(velocityTrend.current - velocityTrend.previous)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{velocityTrend.current}</div>
                  <p className="text-xs text-gray-500 mt-1">
                    {velocityTrend.previous !== null
                      ? `이전: ${velocityTrend.previous} 포인트`
                      : '포인트/스프린트'}
                  </p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Clock size={20} className="text-amber-600" />
                      <span className="text-sm text-gray-500">평균 리드타임</span>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900">
                    <StatValue
                      value={null}
                      naReason="Lead time tracking not yet implemented"
                      className="text-3xl font-bold"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">일</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Users size={20} className="text-purple-600" />
                      <span className="text-sm text-gray-500">활성 이슈</span>
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-gray-900">{stats.openIssues ?? 0}</div>
                  <p className="text-xs text-amber-600 mt-1">
                    {stats.highPriorityIssues ?? 0} High Priority
                  </p>
                </div>
              </div>

              {/* Phase Progress */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <BarChart3 size={20} className="text-blue-600" />
                    단계별 진행 현황
                  </h3>
                  <SectionStatus meta={phaseSection?.meta} />
                </div>
                {phases.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">단계 데이터가 없습니다</p>
                ) : (
                  <div className="space-y-4">
                    {phases.map((phase: PhaseMetric) => {
                      const isCompleted = phase.derivedProgress >= 100;
                      const isActive = phase.derivedProgress > 0 && phase.derivedProgress < 100;
                      return (
                        <div key={phase.phaseId} className="flex items-center gap-4">
                          <div className="w-48 text-sm text-gray-700 truncate">{phase.phaseName}</div>
                          <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isCompleted
                                  ? 'bg-green-500'
                                  : isActive
                                  ? 'bg-blue-500'
                                  : 'bg-gray-300'
                              }`}
                              style={{ width: `${phase.derivedProgress}%` }}
                            />
                          </div>
                          <div className="w-16 text-right">
                            <span
                              className={`text-sm font-medium ${
                                isCompleted
                                  ? 'text-green-600'
                                  : isActive
                                  ? 'text-blue-600'
                                  : 'text-gray-400'
                              }`}
                            >
                              {phase.derivedProgress}%
                            </span>
                          </div>
                          <div className="w-20">
                            <span
                              className={`text-xs px-2 py-1 rounded ${
                                isCompleted
                                  ? 'bg-green-100 text-green-700'
                                  : isActive
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {isCompleted ? '완료' : isActive ? '진행중' : '대기'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Two Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Part Leader Performance */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Users size={20} className="text-purple-600" />
                      파트별 성과
                    </h3>
                    <SectionStatus meta={partSection?.meta} />
                  </div>
                  {parts.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">파트 데이터가 없습니다</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">파트</th>
                            <th className="text-center py-2 text-xs font-medium text-gray-500 uppercase">완료</th>
                            <th className="text-center py-2 text-xs font-medium text-gray-500 uppercase">진행중</th>
                            <th className="text-center py-2 text-xs font-medium text-gray-500 uppercase">차단</th>
                            <th className="text-center py-2 text-xs font-medium text-gray-500 uppercase">진척률</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {parts.map((part: PartLeaderMetric) => {
                            const rate = part.totalTasks > 0
                              ? Math.round((part.completedTasks / part.totalTasks) * 100)
                              : 0;
                            return (
                              <tr key={part.partId}>
                                <td className="py-3">
                                  <div className="text-sm font-medium text-gray-900">{part.partName}</div>
                                  <div className="text-xs text-gray-500">{part.leaderName}</div>
                                </td>
                                <td className="py-3 text-center text-sm text-green-600 font-medium">{part.completedTasks}</td>
                                <td className="py-3 text-center text-sm text-blue-600">{part.inProgressTasks}</td>
                                <td className="py-3 text-center">
                                  {part.blockedTasks > 0 ? (
                                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                                      {part.blockedTasks}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 text-sm">0</span>
                                  )}
                                </td>
                                <td className="py-3 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-blue-500 rounded-full"
                                        style={{ width: `${rate}%` }}
                                      />
                                    </div>
                                    <span className="text-sm text-gray-600">{rate}%</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Task Status Distribution */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <PieChart size={20} className="text-amber-600" />
                    작업 상태 분포
                  </h3>
                  {tasksByStatus.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">작업 데이터가 없습니다</p>
                  ) : (
                    <div className="flex items-center gap-8">
                      <div className="flex-1 space-y-3">
                        {tasksByStatus.map((item) => {
                          const maxCount = Math.max(...tasksByStatus.map((i) => i.count));
                          return (
                            <div key={item.status} className="flex items-center gap-3">
                              <div className="w-20 text-sm text-gray-700">{item.label}</div>
                              <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
                                <div
                                  className={`h-full ${item.color}`}
                                  style={{ width: `${maxCount > 0 ? (item.count / maxCount) * 100 : 0}%` }}
                                />
                              </div>
                              <div className="w-8 text-right text-sm font-medium text-gray-900">{item.count}</div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="text-center">
                        <div className="text-4xl font-bold text-gray-900">{totalTasks}</div>
                        <div className="text-sm text-gray-500">전체 작업</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Sprint Velocity Trend */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <TrendingUp size={20} className="text-green-600" />
                    스프린트 속도 추이
                  </h3>
                  <SectionStatus meta={velocitySection?.meta} />
                </div>
                {sprints.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">스프린트 데이터가 없습니다</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {sprints.map((sprint: SprintMetric, idx: number) => {
                      const prev = idx > 0 ? sprints[idx - 1] : null;
                      const trend = prev
                        ? sprint.completedPoints > prev.completedPoints
                          ? 'up'
                          : sprint.completedPoints < prev.completedPoints
                          ? 'down'
                          : 'flat'
                        : 'flat';
                      return (
                        <div key={sprint.sprintId} className="text-center p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <span className="text-xs text-gray-500 truncate">{sprint.sprintName}</span>
                            {prev && getTrendIcon(trend as 'up' | 'down' | 'flat')}
                          </div>
                          <div className="text-2xl font-bold text-gray-900">{sprint.completedPoints}</div>
                          <div className="text-xs text-gray-500">계획: {sprint.plannedPoints}</div>
                          <span className={`text-xs px-2 py-0.5 rounded mt-1 inline-block ${
                            sprint.status === 'COMPLETED'
                              ? 'bg-green-100 text-green-700'
                              : sprint.status === 'ACTIVE'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            {sprint.status === 'COMPLETED' ? '완료' : sprint.status === 'ACTIVE' ? '활성' : sprint.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
