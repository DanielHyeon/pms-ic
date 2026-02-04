import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, AlertTriangle, CheckCircle2, Clock, Target, DollarSign, Lock, Cpu, Cog, Layers, User, FolderKanban, ChevronRight, Star } from 'lucide-react';
import { UserRole } from '../App';
import { getStatusColor, getStatusLabel, getTrackColor, getActivityColor } from '../../utils/status';
import { useProject } from '../../contexts/ProjectContext';
import { useProjectsWithDetails } from '../../hooks/api/useProjects';
import {
  usePortfolioActivities,
  useProjectActivities,
  useProjectDashboardStats,
  useWeightedProgress,
  usePhaseProgress,
  usePartStats,
  useSprintVelocity,
  useBurndown,
  useInsights,
} from '../../hooks/api/useDashboard';
import { StatValue } from './dashboard/StatValue';
import { SectionStatus, DataSourceBadge } from './dashboard/DataSourceBadge';
import type { DashboardStats, DerivedStatus, InsightDto, PhaseMetric, PartLeaderMetric, SprintMetric, BurndownPoint } from '../../types/dashboard';
import type { WeightedProgressDto } from '../../hooks/api/useDashboard';

// ========== Portfolio View (unchanged - already DB-backed) ==========

function PortfolioView({ userRole, onSelectProject }: { userRole: UserRole; onSelectProject: (projectId: string) => void }) {
  const { data: projects = [], isLoading } = useProjectsWithDetails();
  const { data: activities = [] } = usePortfolioActivities();

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS': return { label: '진행 중', color: 'text-blue-700', bgColor: 'bg-blue-100' };
      case 'COMPLETED': return { label: '완료', color: 'text-green-700', bgColor: 'bg-green-100' };
      case 'PLANNING': return { label: '계획', color: 'text-gray-700', bgColor: 'bg-gray-100' };
      case 'ON_HOLD': return { label: '보류', color: 'text-yellow-700', bgColor: 'bg-yellow-100' };
      default: return { label: status, color: 'text-gray-700', bgColor: 'bg-gray-100' };
    }
  };

  const totalProjects = projects.length;
  const inProgressProjects = projects.filter(p => p.status === 'IN_PROGRESS').length;
  const completedProjects = projects.filter(p => p.status === 'COMPLETED').length;
  const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">포트폴리오 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">포트폴리오 대시보드</h1>
        <p className="text-gray-600 mt-1">전체 프로젝트 현황을 한눈에 확인하세요</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">전체 프로젝트</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">{totalProjects}</p>
              <p className="text-xs text-gray-600 mt-1">등록된 프로젝트</p>
            </div>
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
              <FolderKanban className="text-blue-600" size={28} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">진행 중</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">{inProgressProjects}</p>
              <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                <Clock size={14} />
                <span>활성 프로젝트</span>
              </p>
            </div>
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
              <TrendingUp className="text-green-600" size={28} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">완료</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">{completedProjects}</p>
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <CheckCircle2 size={14} />
                <span>성공적 완료</span>
              </p>
            </div>
            <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="text-purple-600" size={28} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">총 예산</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">
                {(totalBudget / 100000000).toFixed(0)}억
              </p>
              <p className="text-xs text-gray-600 mt-1">투자 규모</p>
            </div>
            <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center">
              <DollarSign className="text-amber-600" size={28} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">프로젝트별 현황</h3>
          <p className="text-sm text-gray-500 mt-1">클릭하여 프로젝트를 선택하세요</p>
        </div>
        <div className="divide-y divide-gray-100">
          {projects.map((project) => {
            const statusInfo = getStatusInfo(project.status);
            return (
              <div
                key={project.id}
                onClick={() => onSelectProject(project.id)}
                className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <FolderKanban className="text-blue-600" size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900 truncate">{project.name}</h4>
                    {project.isDefault && (
                      <Star className="text-yellow-500 fill-yellow-500" size={14} />
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-500">{project.code}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusInfo.bgColor} ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                    <span className="text-xs text-gray-500">PM: {project.managerName}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            project.progress >= 100 ? 'bg-green-500' :
                            project.progress >= 50 ? 'bg-blue-500' : 'bg-yellow-500'
                          }`}
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-10 text-right">{project.progress}%</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {project.startDate} ~ {project.endDate}
                    </p>
                  </div>
                  <ChevronRight className="text-gray-400" size={20} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">프로젝트별 진행률</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={projects.map(p => ({ name: p.name.substring(0, 10) + '...', progress: p.progress }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={11} />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="progress" fill="#3b82f6" name="진행률 (%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">상태별 분포</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-2">
                <Clock className="text-gray-600" size={20} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{projects.filter(p => p.status === 'PLANNING').length}</p>
              <p className="text-sm text-gray-500">계획</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="text-blue-600" size={20} />
              </div>
              <p className="text-2xl font-bold text-blue-700">{inProgressProjects}</p>
              <p className="text-sm text-blue-600">진행 중</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 text-center">
              <div className="w-12 h-12 rounded-full bg-yellow-200 flex items-center justify-center mx-auto mb-2">
                <AlertTriangle className="text-yellow-600" size={20} />
              </div>
              <p className="text-2xl font-bold text-yellow-700">{projects.filter(p => p.status === 'ON_HOLD').length}</p>
              <p className="text-sm text-yellow-600">보류</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <div className="w-12 h-12 rounded-full bg-green-200 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="text-green-600" size={20} />
              </div>
              <p className="text-2xl font-bold text-green-700">{completedProjects}</p>
              <p className="text-sm text-green-600">완료</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">포트폴리오 최근 활동</h3>
        <div className="space-y-3">
          {activities.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">최근 활동이 없습니다</p>
          ) : (
            activities.slice(0, 10).map((activity, idx) => (
              <div key={idx} className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-0">
                <div className={`w-2 h-2 rounded-full ${getActivityColor(activity.type || 'info')}`}></div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{activity.user}</span> {activity.action}
                  </p>
                  {activity.projectName && (
                    <p className="text-xs text-gray-500">{activity.projectName}</p>
                  )}
                </div>
                <span className="text-xs text-gray-500">{activity.time}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ========== Insight rendering helper ==========

const INSIGHT_ICON: Record<string, { icon: typeof AlertTriangle; color: string; border: string }> = {
  RISK: { icon: AlertTriangle, color: 'text-amber-500', border: 'border-amber-200' },
  ACHIEVEMENT: { icon: CheckCircle2, color: 'text-green-500', border: 'border-green-200' },
  RECOMMENDATION: { icon: TrendingUp, color: 'text-blue-500', border: 'border-blue-200' },
};

function InsightCard({ insight }: { insight: InsightDto }) {
  const config = INSIGHT_ICON[insight.type] || INSIGHT_ICON.RECOMMENDATION;
  const Icon = config.icon;
  return (
    <div className={`bg-white rounded-lg p-4 border ${config.border}`}>
      <div className="flex items-start gap-2">
        <Icon className={`${config.color} mt-0.5`} size={18} />
        <div>
          <p className="text-sm font-medium text-gray-900">{insight.title}</p>
          <p className="text-xs text-gray-600 mt-1">{insight.description}</p>
        </div>
      </div>
    </div>
  );
}

// ========== Project Dashboard View ==========

export default function Dashboard({ userRole }: { userRole: UserRole }) {
  const { currentProject, selectProject } = useProject();

  const showPortfolioView = ['pmo_head', 'admin'].includes(userRole) && !currentProject;

  const projectId = currentProject?.id || null;

  // Core stats (existing)
  const { data: projectActivities = [] } = useProjectActivities(projectId);
  const { data: dashboardStats, isLoading: isLoadingStats } = useProjectDashboardStats(projectId);
  const { data: weightedProgress, isLoading: isLoadingProgress } = useWeightedProgress(projectId);

  // New section hooks (DashboardSection contract)
  const { data: phaseSection } = usePhaseProgress(projectId);
  const { data: partSection } = usePartStats(projectId);
  const { data: velocitySection } = useSprintVelocity(projectId);
  const { data: burndownSection } = useBurndown(projectId);
  const { data: insightSection } = useInsights(projectId);

  if (showPortfolioView) {
    return <PortfolioView userRole={userRole} onSelectProject={selectProject} />;
  }

  const canViewBudget = ['sponsor', 'pmo_head', 'pm'].includes(userRole);
  const isReadOnly = ['auditor', 'business_analyst'].includes(userRole);

  const stats: Partial<DashboardStats> = dashboardStats || {};
  const progress: Partial<WeightedProgressDto> = weightedProgress || {};

  const avgProgress = stats.avgProgress ?? 0;
  const totalTasks = stats.totalTasks ?? 0;
  const completedTasks = stats.completedTasks ?? 0;
  const openIssues = stats.openIssues ?? 0;
  const highPriorityIssues = stats.highPriorityIssues ?? 0;

  // Track progress data from real API
  const trackProgressData = {
    ai: {
      progress: Math.round(progress.aiProgress ?? 0),
      status: (progress.aiProgress ?? 0) >= 50 ? 'normal' : (progress.aiProgress ?? 0) >= 30 ? 'warning' : 'danger',
      tasks: progress.aiTotalTasks ?? 0,
      completed: progress.aiCompletedTasks ?? 0,
    },
    si: {
      progress: Math.round(progress.siProgress ?? 0),
      status: (progress.siProgress ?? 0) >= 50 ? 'normal' : (progress.siProgress ?? 0) >= 30 ? 'warning' : 'danger',
      tasks: progress.siTotalTasks ?? 0,
      completed: progress.siCompletedTasks ?? 0,
    },
    common: {
      progress: Math.round(progress.commonProgress ?? 0),
      status: (progress.commonProgress ?? 0) >= 50 ? 'normal' : (progress.commonProgress ?? 0) >= 30 ? 'warning' : 'danger',
      tasks: progress.commonTotalTasks ?? 0,
      completed: progress.commonCompletedTasks ?? 0,
    },
  };

  // Phase progress → chart data
  const phaseChartData = (phaseSection?.data?.phases ?? []).map((p: PhaseMetric) => ({
    phase: p.phaseName,
    planned: 100,
    actual: p.derivedProgress,
  }));

  // Sprint velocity → chart data
  const velocityChartData = (velocitySection?.data?.sprints ?? []).map((s: SprintMetric) => ({
    sprint: s.sprintName,
    planned: s.plannedPoints,
    velocity: s.completedPoints,
  }));

  // Burndown → chart data
  const burndown = burndownSection?.data;
  const burndownChartData = (burndown?.dataPoints ?? []).map((p: BurndownPoint) => ({
    day: p.date,
    ideal: p.idealPoints,
    remaining: p.remainingPoints,
  }));

  // Insights data
  const insights: InsightDto[] = insightSection?.data ?? [];

  // Part stats data
  const parts: PartLeaderMetric[] = partSection?.data?.parts ?? [];

  // Phase table data
  const phases: PhaseMetric[] = phaseSection?.data?.phases ?? [];

  if (isLoadingStats || isLoadingProgress) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">대시보드 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Role Banner */}
      {isReadOnly && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
          <Lock className="text-amber-600" size={20} />
          <div>
            <p className="text-sm font-medium text-amber-900">읽기 전용 모드</p>
            <p className="text-xs text-amber-700">현재 역할은 조회 권한만 가지고 있습니다.</p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">전체 진행률</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">{avgProgress}%</p>
              <p className={`text-xs mt-1 flex items-center gap-1 ${avgProgress >= 50 ? 'text-green-600' : avgProgress >= 30 ? 'text-amber-600' : 'text-red-600'}`}>
                <TrendingUp size={14} />
                <span>{avgProgress >= 50 ? 'On Track' : avgProgress >= 30 ? '주의 필요' : '지연'}</span>
              </p>
            </div>
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
              <Target className="text-blue-600" size={28} />
            </div>
          </div>
        </div>

        {canViewBudget ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">예산 집행률</p>
                <p className="text-3xl font-semibold text-gray-900 mt-2">
                  <StatValue
                    value={stats.budgetExecutionRate}
                    suffix="%"
                    naReason="Budget spent tracking not yet implemented"
                    className="text-3xl font-semibold text-gray-900"
                  />
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  <StatValue
                    value={stats.budgetSpent != null ? Number(stats.budgetSpent) : null}
                    format={(v) => `₩${(v / 100000000).toFixed(0)}억`}
                    naReason="Budget spent tracking not yet implemented"
                  />
                  {stats.budgetTotal != null && <> / ₩{(Number(stats.budgetTotal) / 100000000).toFixed(0)}억</>}
                </p>
              </div>
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="text-green-600" size={28} />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-100 rounded-xl shadow-sm border border-gray-200 p-6 relative">
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100/90 rounded-xl backdrop-blur-sm">
              <div className="text-center">
                <Lock className="text-gray-400 mx-auto mb-2" size={24} />
                <p className="text-xs text-gray-500">접근 권한 없음</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">활성 이슈</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">{openIssues}</p>
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <AlertTriangle size={14} />
                <span>{highPriorityIssues} High Priority</span>
              </p>
            </div>
            <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="text-amber-600" size={28} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">완료 작업</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">{completedTasks}</p>
              <p className="text-xs text-gray-600 mt-1">총 {totalTasks}개 중</p>
            </div>
            <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="text-purple-600" size={28} />
            </div>
          </div>
        </div>
      </div>

      {/* AI/SI/Common Track Progress */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`bg-white rounded-xl shadow-sm border p-6 ${getStatusColor(trackProgressData.ai.status).border}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Cpu className="text-blue-600" size={20} />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">AI 트랙</h4>
              <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(trackProgressData.ai.status).bg} ${getStatusColor(trackProgressData.ai.status).text}`}>
                {getStatusLabel(trackProgressData.ai.status)}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">진척률</span>
              <span className="font-semibold">{trackProgressData.ai.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="bg-blue-500 h-3 rounded-full transition-all" style={{ width: `${trackProgressData.ai.progress}%` }}></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">완료: {trackProgressData.ai.completed}/{trackProgressData.ai.tasks} 작업</p>
          </div>
        </div>

        <div className={`bg-white rounded-xl shadow-sm border p-6 ${getStatusColor(trackProgressData.si.status).border}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Cog className="text-green-600" size={20} />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">SI 트랙</h4>
              <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(trackProgressData.si.status).bg} ${getStatusColor(trackProgressData.si.status).text}`}>
                {getStatusLabel(trackProgressData.si.status)}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">진척률</span>
              <span className="font-semibold">{trackProgressData.si.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="bg-green-500 h-3 rounded-full transition-all" style={{ width: `${trackProgressData.si.progress}%` }}></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">완료: {trackProgressData.si.completed}/{trackProgressData.si.tasks} 작업</p>
          </div>
        </div>

        <div className={`bg-white rounded-xl shadow-sm border p-6 ${getStatusColor(trackProgressData.common.status).border}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Layers className="text-purple-600" size={20} />
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">공통 트랙</h4>
              <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(trackProgressData.common.status).bg} ${getStatusColor(trackProgressData.common.status).text}`}>
                {getStatusLabel(trackProgressData.common.status)}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">진척률</span>
              <span className="font-semibold">{trackProgressData.common.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="bg-purple-500 h-3 rounded-full transition-all" style={{ width: `${trackProgressData.common.progress}%` }}></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">완료: {trackProgressData.common.completed}/{trackProgressData.common.tasks} 작업</p>
          </div>
        </div>
      </div>

      {/* Phase Progress Table (DB-backed, replaces mock subProjectData) */}
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
                {phases.map((phase) => (
                  <tr key={phase.phaseId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">{phase.phaseName}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getTrackColor(phase.trackType)}`}>{phase.trackType}</span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{phase.completedTasks}/{phase.totalTasks}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div className={`h-2 rounded-full ${
                            phase.derivedStatus === 'normal' ? 'bg-green-500' :
                            phase.derivedStatus === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                          }`} style={{ width: `${phase.derivedProgress}%` }}></div>
                        </div>
                        <span className="text-gray-700">{phase.derivedProgress}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(phase.derivedStatus).bg} ${getStatusColor(phase.derivedStatus).text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${getStatusColor(phase.derivedStatus).dot}`}></span>
                        {getStatusLabel(phase.derivedStatus)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Part Leader Stats (DB-backed, replaces mock partLeaderData) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">파트 리더별 현황</h3>
          <SectionStatus meta={partSection?.meta} />
        </div>
        {parts.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">파트 데이터가 없습니다</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {parts.map((part) => (
              <div key={part.partId} className={`border rounded-lg p-4 ${getStatusColor(part.status).border}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <User className="text-gray-600" size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{part.leaderName}</p>
                    <p className="text-xs text-gray-500">{part.partName}</p>
                  </div>
                  <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(part.status).bg} ${getStatusColor(part.status).text}`}>
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
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Phase Progress Chart (DB-backed) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">단계별 진행 현황 (Waterfall View)</h3>
            <SectionStatus meta={phaseSection?.meta} />
          </div>
          {phaseChartData.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-12">차트 데이터가 없습니다</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={phaseChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="phase" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="planned" fill="#93c5fd" name="계획" />
                <Bar dataKey="actual" fill="#3b82f6" name="실적" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Sprint Velocity Chart (DB-backed) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">스프린트 속도 (Sprint Velocity)</h3>
            <SectionStatus meta={velocitySection?.meta} />
          </div>
          {velocityChartData.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-12">스프린트 데이터가 없습니다</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={velocityChartData}>
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Burndown Chart (DB-backed) */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">소멸 차트 (Current Sprint Burndown)</h3>
            <div className="flex items-center gap-2">
              {burndown && <span className="text-sm text-gray-500">{burndown.sprintName}</span>}
              <SectionStatus meta={burndownSection?.meta} />
            </div>
          </div>
          {burndownChartData.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-12">활성 스프린트가 없습니다</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={burndownChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis label={{ value: 'Story Points', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="ideal" stroke="#d1d5db" strokeWidth={2} name="이상적 소멸" strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="remaining" stroke="#3b82f6" strokeWidth={2} name="실제 남은 작업" />
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

        {/* AI Insights (DB-backed, replaces hardcoded Korean text) */}
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl shadow-sm border border-purple-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">AI 인사이트</h3>
            <SectionStatus meta={insightSection?.meta} />
          </div>
          <div className="space-y-4">
            {insights.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">인사이트가 없습니다</p>
            ) : (
              insights.map((insight: InsightDto, idx: number) => (
                <InsightCard key={idx} insight={insight} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">최근 활동</h3>
        <div className="space-y-3">
          {projectActivities.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">최근 활동이 없습니다</p>
          ) : (
            projectActivities.slice(0, 10).map((activity, idx) => (
              <div key={idx} className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-0">
                <div className={`w-2 h-2 rounded-full ${getActivityColor(activity.type || 'info')}`}></div>
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
    </div>
  );
}
