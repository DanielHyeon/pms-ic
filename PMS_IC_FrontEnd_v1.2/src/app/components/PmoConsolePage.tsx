import {
  Gauge,
  FileText,
  TestTube,
  FileCheck,
  Calendar,
  AlertCircle,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { UserRole } from '../App';
import { canManagePmoConsole, isReadOnly as checkReadOnly, canViewPortfolio } from '../../utils/rolePermissions';
import {
  RequirementsSummaryWidget,
  TestingSummaryWidget,
  IssuesSummaryWidget,
  DeliverablesSummaryWidget,
  MeetingsSummaryWidget,
  ScheduleSummaryWidget,
} from './pmo-console';
import { useRequirements } from '../../hooks/api/useRequirements';
import { useIssues } from '../../hooks/api/useCommon';

interface PmoConsolePageProps {
  userRole: UserRole;
  projectId?: string;
}

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: number | string;
  subLabel?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color: 'blue' | 'green' | 'amber' | 'purple' | 'red';
}

function StatCard({ icon: Icon, label, value, subLabel, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    amber: 'bg-amber-100 text-amber-600',
    purple: 'bg-purple-100 text-purple-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-lg ${colorClasses[color]}`}>
          <Icon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-500 truncate">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subLabel && (
            <p className="text-xs text-gray-400 truncate">{subLabel}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PmoConsolePage({ userRole, projectId = 'proj-001' }: PmoConsolePageProps) {
  const canManage = canManagePmoConsole(userRole);
  const readOnly = checkReadOnly(userRole) || userRole === 'sponsor';

  // Fetch summary data for KPI cards
  const { data: requirements = [] } = useRequirements(projectId);
  const { data: issues = [] } = useIssues(projectId);

  // Calculate summary metrics
  const requirementStats = {
    total: requirements.length,
    approved: requirements.filter((r: { status: string }) => r.status === 'APPROVED').length,
  };

  const issueStats = {
    total: issues.length,
    open: issues.filter((i: { status: string }) => i.status === 'OPEN').length,
    critical: issues.filter((i: { priority: string; status: string }) => i.priority === 'CRITICAL' && i.status !== 'CLOSED').length,
  };

  // Mock data for other domains (would be replaced with actual API calls)
  const testStats = { total: 156, passed: 142 };
  const deliverableStats = { total: 24, approved: 18 };
  const meetingStats = { upcoming: 3 };

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Read-only Banner */}
      {readOnly && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
          <Lock className="text-amber-600" size={20} />
          <div>
            <p className="text-sm font-medium text-amber-900">View-only mode</p>
            <p className="text-xs text-amber-700">
              {userRole === 'sponsor'
                ? 'Sponsor view — health, risk, and trend overview only.'
                : 'This dashboard is read-only for your role.'}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Gauge className="text-purple-600" />
            PMO 대시보드
          </h1>
          <p className="text-gray-500 mt-1">프로젝트 공통관리 현황 종합</p>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw size={16} />
          새로고침
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-4">
        <StatCard
          icon={FileText}
          label="요구사항"
          value={requirementStats.total}
          subLabel={`승인: ${requirementStats.approved}`}
          color="blue"
        />
        <StatCard
          icon={TestTube}
          label="테스트"
          value={testStats.total}
          subLabel={`통과: ${testStats.passed}`}
          color="green"
        />
        <StatCard
          icon={FileCheck}
          label="산출물"
          value={deliverableStats.total}
          subLabel={`승인: ${deliverableStats.approved}`}
          color="purple"
        />
        <StatCard
          icon={Calendar}
          label="예정 회의"
          value={meetingStats.upcoming}
          subLabel="이번 주"
          color="amber"
        />
        <StatCard
          icon={AlertCircle}
          label="미결 이슈"
          value={issueStats.open}
          subLabel={issueStats.critical > 0 ? `긴급: ${issueStats.critical}` : '긴급 없음'}
          color={issueStats.critical > 0 ? 'red' : 'amber'}
        />
      </div>

      {/* Widget Grid - Row 1 */}
      <div className="grid grid-cols-2 gap-6">
        <RequirementsSummaryWidget projectId={projectId} />
        <TestingSummaryWidget projectId={projectId} />
      </div>

      {/* Widget Grid - Row 2 */}
      <div className="grid grid-cols-2 gap-6">
        <IssuesSummaryWidget projectId={projectId} />
        <DeliverablesSummaryWidget projectId={projectId} />
      </div>

      {/* Widget Grid - Row 3 */}
      <div className="grid grid-cols-2 gap-6">
        <MeetingsSummaryWidget projectId={projectId} />
        <ScheduleSummaryWidget projectId={projectId} />
      </div>
    </div>
  );
}
