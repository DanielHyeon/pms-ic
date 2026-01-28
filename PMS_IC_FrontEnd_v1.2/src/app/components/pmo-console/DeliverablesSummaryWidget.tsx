import { FileCheck, ArrowRight, CheckCircle, Clock, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DeliverablesSummaryWidgetProps {
  projectId: string;
}

export default function DeliverablesSummaryWidget({ projectId }: DeliverablesSummaryWidgetProps) {
  const navigate = useNavigate();

  const handleNavigate = () => {
    navigate('/deliverables');
  };

  // Mock data (would be replaced with actual API call)
  const stats = {
    total: 24,
    approved: 18,
    pending: 4,
    draft: 2,
  };

  const approvalRate = stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0;

  const recentDeliverables = [
    { name: 'API 설계서 v2.1', status: 'approved', date: '2026-01-27' },
    { name: '테스트 계획서', status: 'pending', date: '2026-01-26' },
    { name: 'DB 스키마 문서', status: 'approved', date: '2026-01-25' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">승인</span>;
      case 'pending':
        return <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded">검토중</span>;
      case 'draft':
        return <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">초안</span>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <FileCheck size={20} className="text-purple-600" />
          산출물 현황
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

      {/* Approval Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">승인율</span>
          <span className="font-medium text-gray-900">{approvalRate}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-500 rounded-full transition-all"
            style={{ width: `${approvalRate}%` }}
          />
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-2 bg-green-50 rounded-lg">
          <CheckCircle size={16} className="mx-auto mb-1 text-green-500" />
          <div className="text-lg font-bold text-gray-900">{stats.approved}</div>
          <div className="text-xs text-gray-500">승인</div>
        </div>
        <div className="text-center p-2 bg-amber-50 rounded-lg">
          <Clock size={16} className="mx-auto mb-1 text-amber-500" />
          <div className="text-lg font-bold text-gray-900">{stats.pending}</div>
          <div className="text-xs text-gray-500">검토중</div>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <Upload size={16} className="mx-auto mb-1 text-gray-500" />
          <div className="text-lg font-bold text-gray-900">{stats.draft}</div>
          <div className="text-xs text-gray-500">초안</div>
        </div>
      </div>

      {/* Recent Deliverables */}
      <div className="border-t border-gray-100 pt-3">
        <p className="text-xs text-gray-500 mb-2">최근 산출물</p>
        <div className="space-y-2">
          {recentDeliverables.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm">
              <span className="text-gray-700 truncate flex-1">{item.name}</span>
              {getStatusBadge(item.status)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
