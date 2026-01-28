import { AlertCircle, ArrowRight, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useIssues } from '../../../hooks/api/useCommon';

interface IssuesSummaryWidgetProps {
  projectId: string;
}

export default function IssuesSummaryWidget({ projectId }: IssuesSummaryWidgetProps) {
  const navigate = useNavigate();
  const { data: issues = [], isLoading } = useIssues(projectId);

  const handleNavigate = () => {
    navigate('/issues');
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-32"></div>
          <div className="h-32 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  // Calculate statistics
  const stats = {
    total: issues.length,
    open: issues.filter((i: { status: string }) => i.status === 'OPEN').length,
    inProgress: issues.filter((i: { status: string }) => i.status === 'IN_PROGRESS').length,
    resolved: issues.filter((i: { status: string }) => i.status === 'RESOLVED').length,
    critical: issues.filter((i: { priority: string; status: string }) => i.priority === 'CRITICAL' && i.status !== 'CLOSED').length,
    high: issues.filter((i: { priority: string; status: string }) => i.priority === 'HIGH' && i.status !== 'CLOSED').length,
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <AlertCircle size={20} className="text-red-600" />
          이슈 현황
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

      {/* Critical/High Alert */}
      {(stats.critical > 0 || stats.high > 0) && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle size={16} />
            <span className="text-sm font-medium">
              긴급/높음 이슈 {stats.critical + stats.high}건 미해결
            </span>
          </div>
        </div>
      )}

      {/* Status Breakdown */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-sm text-gray-600">열림</span>
          </div>
          <span className="text-sm font-medium text-gray-900">{stats.open}건</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
            <span className="text-sm text-gray-600">진행중</span>
          </div>
          <span className="text-sm font-medium text-gray-900">{stats.inProgress}건</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">해결됨</span>
          </div>
          <span className="text-sm font-medium text-gray-900">{stats.resolved}건</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
          {stats.total > 0 && (
            <>
              <div
                className="h-full bg-red-500"
                style={{ width: `${(stats.open / stats.total) * 100}%` }}
              />
              <div
                className="h-full bg-amber-500"
                style={{ width: `${(stats.inProgress / stats.total) * 100}%` }}
              />
              <div
                className="h-full bg-green-500"
                style={{ width: `${(stats.resolved / stats.total) * 100}%` }}
              />
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm">
        <span className="text-gray-500">전체 이슈</span>
        <span className="font-medium text-gray-900">{stats.total}건</span>
      </div>
    </div>
  );
}
