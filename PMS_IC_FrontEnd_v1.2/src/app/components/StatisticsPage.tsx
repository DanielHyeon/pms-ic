import { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  Users,
  Target,
  Activity,
  Calendar,
  PieChart,
} from 'lucide-react';
import { getRolePermissions } from '../../utils/rolePermissions';
import { UserRole } from '../App';

interface StatisticsPageProps {
  userRole: UserRole;
  projectId?: string;
}

type TimeRange = 'week' | 'month' | 'quarter' | 'year';

export default function StatisticsPage({ userRole, projectId = 'proj-001' }: StatisticsPageProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');

  // Mock statistics data
  const projectStats = {
    totalTasks: 248,
    completedTasks: 186,
    completionRate: 75,
    sprintVelocity: 42,
    averageLeadTime: 4.2,
    teamUtilization: 87,
  };

  const trendData = {
    velocity: { current: 42, previous: 38, trend: 'up' as const },
    leadTime: { current: 4.2, previous: 4.8, trend: 'down' as const },
    qualityRate: { current: 94, previous: 91, trend: 'up' as const },
    burndownRate: { current: 85, previous: 78, trend: 'up' as const },
  };

  const phaseProgress = [
    { name: '1단계: 업무 진단', progress: 100, status: 'completed' },
    { name: '2단계: 데이터 수집', progress: 100, status: 'completed' },
    { name: '3단계: AI 모델링', progress: 85, status: 'in_progress' },
    { name: '4단계: 시스템 통합', progress: 0, status: 'pending' },
    { name: '5단계: 성능 검증', progress: 0, status: 'pending' },
    { name: '6단계: 변화 관리', progress: 0, status: 'pending' },
  ];

  const teamPerformance = [
    { name: '개발팀', tasksCompleted: 82, velocity: 24, utilization: 92 },
    { name: 'QA팀', tasksCompleted: 45, velocity: 12, utilization: 88 },
    { name: 'AI팀', tasksCompleted: 38, velocity: 8, utilization: 95 },
    { name: '분석팀', tasksCompleted: 21, velocity: 6, utilization: 78 },
  ];

  const issuesByType = [
    { type: '버그', count: 12, color: 'bg-red-500' },
    { type: '개선', count: 8, color: 'bg-blue-500' },
    { type: '변경요청', count: 5, color: 'bg-amber-500' },
    { type: '위험', count: 3, color: 'bg-purple-500' },
  ];

  const getTrendIcon = (trend: 'up' | 'down') => {
    return trend === 'up' ? (
      <TrendingUp size={16} className="text-green-600" />
    ) : (
      <TrendingDown size={16} className="text-red-600" />
    );
  };

  const getTrendColor = (trend: 'up' | 'down', isPositive: boolean) => {
    if (isPositive) {
      return trend === 'up' ? 'text-green-600' : 'text-red-600';
    }
    return trend === 'down' ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">통계 대시보드</h1>
          <p className="text-gray-500 mt-1">프로젝트 현황 분석 및 성과 지표</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-gray-400" />
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="week">최근 1주</option>
            <option value="month">최근 1개월</option>
            <option value="quarter">최근 분기</option>
            <option value="year">최근 1년</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target size={20} className="text-blue-600" />
              <span className="text-sm text-gray-500">완료율</span>
            </div>
            <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
              +5%
            </span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{projectStats.completionRate}%</div>
          <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${projectStats.completionRate}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Activity size={20} className="text-green-600" />
              <span className="text-sm text-gray-500">스프린트 속도</span>
            </div>
            <div className="flex items-center gap-1">
              {getTrendIcon(trendData.velocity.trend)}
              <span className={`text-xs ${getTrendColor(trendData.velocity.trend, true)}`}>
                {Math.abs(trendData.velocity.current - trendData.velocity.previous)}
              </span>
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{projectStats.sprintVelocity}</div>
          <p className="text-xs text-gray-500 mt-1">포인트/스프린트</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock size={20} className="text-amber-600" />
              <span className="text-sm text-gray-500">평균 리드타임</span>
            </div>
            <div className="flex items-center gap-1">
              {getTrendIcon(trendData.leadTime.trend)}
              <span className={`text-xs ${getTrendColor(trendData.leadTime.trend, false)}`}>
                {Math.abs(trendData.leadTime.current - trendData.leadTime.previous).toFixed(1)}
              </span>
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{projectStats.averageLeadTime}</div>
          <p className="text-xs text-gray-500 mt-1">일</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users size={20} className="text-purple-600" />
              <span className="text-sm text-gray-500">팀 가동률</span>
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{projectStats.teamUtilization}%</div>
          <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full"
              style={{ width: `${projectStats.teamUtilization}%` }}
            />
          </div>
        </div>
      </div>

      {/* Phase Progress */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 size={20} className="text-blue-600" />
          단계별 진행 현황
        </h3>
        <div className="space-y-4">
          {phaseProgress.map((phase) => (
            <div key={phase.name} className="flex items-center gap-4">
              <div className="w-48 text-sm text-gray-700 truncate">{phase.name}</div>
              <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    phase.status === 'completed'
                      ? 'bg-green-500'
                      : phase.status === 'in_progress'
                      ? 'bg-blue-500'
                      : 'bg-gray-300'
                  }`}
                  style={{ width: `${phase.progress}%` }}
                />
              </div>
              <div className="w-16 text-right">
                <span
                  className={`text-sm font-medium ${
                    phase.status === 'completed'
                      ? 'text-green-600'
                      : phase.status === 'in_progress'
                      ? 'text-blue-600'
                      : 'text-gray-400'
                  }`}
                >
                  {phase.progress}%
                </span>
              </div>
              <div className="w-20">
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    phase.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : phase.status === 'in_progress'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {phase.status === 'completed' ? '완료' : phase.status === 'in_progress' ? '진행중' : '대기'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-2 gap-6">
        {/* Team Performance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users size={20} className="text-purple-600" />
            팀별 성과
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">팀</th>
                  <th className="text-center py-2 text-xs font-medium text-gray-500 uppercase">완료 작업</th>
                  <th className="text-center py-2 text-xs font-medium text-gray-500 uppercase">속도</th>
                  <th className="text-center py-2 text-xs font-medium text-gray-500 uppercase">가동률</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {teamPerformance.map((team) => (
                  <tr key={team.name}>
                    <td className="py-3 text-sm font-medium text-gray-900">{team.name}</td>
                    <td className="py-3 text-center text-sm text-gray-600">{team.tasksCompleted}</td>
                    <td className="py-3 text-center text-sm text-gray-600">{team.velocity}</td>
                    <td className="py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full"
                            style={{ width: `${team.utilization}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">{team.utilization}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Issues Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <PieChart size={20} className="text-amber-600" />
            이슈 유형 분포
          </h3>
          <div className="flex items-center gap-8">
            {/* Simple bar representation */}
            <div className="flex-1 space-y-3">
              {issuesByType.map((issue) => (
                <div key={issue.type} className="flex items-center gap-3">
                  <div className="w-20 text-sm text-gray-700">{issue.type}</div>
                  <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
                    <div
                      className={`h-full ${issue.color}`}
                      style={{
                        width: `${(issue.count / Math.max(...issuesByType.map((i) => i.count))) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="w-8 text-right text-sm font-medium text-gray-900">{issue.count}</div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900">
                {issuesByType.reduce((sum, i) => sum + i.count, 0)}
              </div>
              <div className="text-sm text-gray-500">전체 이슈</div>
            </div>
          </div>
        </div>
      </div>

      {/* Trend Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp size={20} className="text-green-600" />
          주요 지표 추이
        </h3>
        <div className="grid grid-cols-4 gap-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-sm text-gray-500">속도</span>
              {getTrendIcon(trendData.velocity.trend)}
            </div>
            <div className="text-2xl font-bold text-gray-900">{trendData.velocity.current}</div>
            <div className="text-xs text-gray-500">이전: {trendData.velocity.previous}</div>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-sm text-gray-500">리드타임</span>
              {getTrendIcon(trendData.leadTime.trend)}
            </div>
            <div className="text-2xl font-bold text-gray-900">{trendData.leadTime.current}일</div>
            <div className="text-xs text-gray-500">이전: {trendData.leadTime.previous}일</div>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-sm text-gray-500">품질률</span>
              {getTrendIcon(trendData.qualityRate.trend)}
            </div>
            <div className="text-2xl font-bold text-gray-900">{trendData.qualityRate.current}%</div>
            <div className="text-xs text-gray-500">이전: {trendData.qualityRate.previous}%</div>
          </div>

          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-sm text-gray-500">번다운 진척률</span>
              {getTrendIcon(trendData.burndownRate.trend)}
            </div>
            <div className="text-2xl font-bold text-gray-900">{trendData.burndownRate.current}%</div>
            <div className="text-xs text-gray-500">이전: {trendData.burndownRate.previous}%</div>
          </div>
        </div>
      </div>
    </div>
  );
}
