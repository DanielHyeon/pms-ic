import { memo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  FolderKanban,
  ChevronRight,
  Star,
} from 'lucide-react';
import { useProjectsWithDetails } from '../../../../hooks/api/useProjects';
import { usePortfolioActivities } from '../../../../hooks/api/useDashboard';
import { useProject } from '../../../../contexts/ProjectContext';
import { getActivityColor } from '../../../../utils/status';
import type { WidgetProps } from './types';

const getStatusInfo = (status: string) => {
  switch (status) {
    case 'IN_PROGRESS':
      return { label: '진행 중', color: 'text-blue-700', bgColor: 'bg-blue-100' };
    case 'COMPLETED':
      return { label: '완료', color: 'text-green-700', bgColor: 'bg-green-100' };
    case 'PLANNING':
      return { label: '계획', color: 'text-gray-700', bgColor: 'bg-gray-100' };
    case 'ON_HOLD':
      return { label: '보류', color: 'text-yellow-700', bgColor: 'bg-yellow-100' };
    default:
      return { label: status, color: 'text-gray-700', bgColor: 'bg-gray-100' };
  }
};

function PortfolioTableInner(_props: WidgetProps) {
  const { data: projects = [], isLoading } = useProjectsWithDetails();
  const { data: activities = [] } = usePortfolioActivities();
  const { selectProject } = useProject();

  const totalProjects = projects.length;
  const inProgressProjects = projects.filter((p) => p.status === 'IN_PROGRESS').length;
  const completedProjects = projects.filter((p) => p.status === 'COMPLETED').length;
  const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">포트폴리오 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary KPI row */}
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

      {/* Project list table */}
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
                onClick={() => selectProject(project.id)}
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
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${statusInfo.bgColor} ${statusInfo.color}`}
                    >
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
                            project.progress >= 100
                              ? 'bg-green-500'
                              : project.progress >= 50
                                ? 'bg-blue-500'
                                : 'bg-yellow-500'
                          }`}
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-10 text-right">
                        {project.progress}%
                      </span>
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

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">프로젝트별 진행률</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={projects.map((p) => ({
                name: p.name.substring(0, 10) + '...',
                progress: p.progress,
              }))}
            >
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
              <p className="text-2xl font-bold text-gray-900">
                {projects.filter((p) => p.status === 'PLANNING').length}
              </p>
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
              <p className="text-2xl font-bold text-yellow-700">
                {projects.filter((p) => p.status === 'ON_HOLD').length}
              </p>
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

      {/* Portfolio activities */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">포트폴리오 최근 활동</h3>
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

export const PortfolioTable = memo(PortfolioTableInner);
