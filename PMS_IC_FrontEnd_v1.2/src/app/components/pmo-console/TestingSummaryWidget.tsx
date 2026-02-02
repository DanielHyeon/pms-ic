import { TestTube, ArrowRight, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TestingSummaryWidgetProps {
  projectId: string;
}

export default function TestingSummaryWidget({ projectId }: TestingSummaryWidgetProps) {
  const navigate = useNavigate();

  const handleNavigate = () => {
    navigate('/testing');
  };

  // Mock data (would be replaced with actual API call)
  const stats = {
    total: 156,
    passed: 142,
    failed: 8,
    pending: 6,
  };

  const passRate = stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0;

  const statusItems = [
    { label: '통과', value: stats.passed, icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-50' },
    { label: '실패', value: stats.failed, icon: XCircle, color: 'text-red-500', bgColor: 'bg-red-50' },
    { label: '대기', value: stats.pending, icon: Clock, color: 'text-amber-500', bgColor: 'bg-amber-50' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <TestTube size={20} className="text-green-600" />
          테스트 현황
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

      {/* Pass Rate Gauge */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">테스트 통과율</span>
          <span className={`font-medium ${passRate >= 90 ? 'text-green-600' : passRate >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
            {passRate}%
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              passRate >= 90 ? 'bg-green-500' : passRate >= 70 ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${passRate}%` }}
          />
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-3 gap-3">
        {statusItems.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className={`text-center p-3 rounded-lg ${item.bgColor}`}>
              <Icon size={20} className={`mx-auto mb-1 ${item.color}`} />
              <div className="text-2xl font-bold text-gray-900">{item.value}</div>
              <div className="text-xs text-gray-500">{item.label}</div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm">
        <span className="text-gray-500">전체 테스트 케이스</span>
        <span className="font-medium text-gray-900">{stats.total}건</span>
      </div>
    </div>
  );
}
