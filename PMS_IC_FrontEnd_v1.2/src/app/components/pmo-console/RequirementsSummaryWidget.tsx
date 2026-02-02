import { FileText, ArrowRight, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRequirements } from '../../../hooks/api/useRequirements';

interface RequirementsSummaryWidgetProps {
  projectId: string;
}

export default function RequirementsSummaryWidget({ projectId }: RequirementsSummaryWidgetProps) {
  const navigate = useNavigate();
  const { data: requirements = [], isLoading } = useRequirements(projectId);

  const handleNavigate = () => {
    navigate('/requirements');
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
    total: requirements.length,
    identified: requirements.filter((r: { status: string }) => r.status === 'IDENTIFIED').length,
    analyzed: requirements.filter((r: { status: string }) => r.status === 'ANALYZED').length,
    approved: requirements.filter((r: { status: string }) => r.status === 'APPROVED').length,
    rejected: requirements.filter((r: { status: string }) => r.status === 'REJECTED').length,
  };

  const statusItems = [
    { label: '식별됨', value: stats.identified, icon: Clock, color: 'text-gray-500' },
    { label: '분석중', value: stats.analyzed, icon: AlertTriangle, color: 'text-amber-500' },
    { label: '승인됨', value: stats.approved, icon: CheckCircle, color: 'text-green-500' },
  ];

  const approvalRate = stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <FileText size={20} className="text-blue-600" />
          요구사항 현황
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

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">승인율</span>
          <span className="font-medium text-gray-900">{approvalRate}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all"
            style={{ width: `${approvalRate}%` }}
          />
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-3 gap-4">
        {statusItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="text-center p-3 bg-gray-50 rounded-lg">
              <Icon size={20} className={`mx-auto mb-1 ${item.color}`} />
              <div className="text-2xl font-bold text-gray-900">{item.value}</div>
              <div className="text-xs text-gray-500">{item.label}</div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm">
        <span className="text-gray-500">전체 요구사항</span>
        <span className="font-medium text-gray-900">{stats.total}건</span>
      </div>
    </div>
  );
}
