import { Users, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useParts } from '../../../hooks/api/useParts';
import { usePartMetrics } from '../../../hooks/api/useParts';

interface PartComparisonViewProps {
  projectId: string;
}

interface PartMetricRowProps {
  partId: string;
  partName: string;
  partLeader?: string;
  projectId: string;
}

function PartMetricRow({ partId, partName, partLeader, projectId }: PartMetricRowProps) {
  const navigate = useNavigate();
  const { data: metrics, isLoading } = usePartMetrics(partId);

  const handleClick = () => {
    navigate(`/parts/${partId}/dashboard`);
  };

  if (isLoading) {
    return (
      <tr className="animate-pulse">
        <td className="py-3 text-sm font-medium text-gray-900">{partName}</td>
        <td className="py-3 text-sm text-gray-500">{partLeader || '-'}</td>
        <td colSpan={4} className="py-3">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
        </td>
      </tr>
    );
  }

  const completionRate = metrics?.featureCompletionRate ?? 0;
  const totalStoryPoints = metrics?.totalStoryPoints ?? 0;
  const completedStoryPoints = metrics?.completedStoryPoints ?? 0;
  const openIssues = metrics?.openIssues ?? 0;

  return (
    <tr
      className="hover:bg-gray-50 cursor-pointer transition-colors"
      onClick={handleClick}
    >
      <td className="py-3 text-sm font-medium text-gray-900">{partName}</td>
      <td className="py-3 text-sm text-gray-500">{partLeader || '-'}</td>
      <td className="py-3">
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <span className="text-sm text-gray-600">{completionRate.toFixed(0)}%</span>
        </div>
      </td>
      <td className="py-3 text-center text-sm text-gray-600">
        {completedStoryPoints}/{totalStoryPoints}
      </td>
      <td className="py-3 text-center">
        {openIssues > 0 ? (
          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
            {openIssues}
          </span>
        ) : (
          <span className="text-gray-400 text-sm">0</span>
        )}
      </td>
      <td className="py-3 text-right">
        <ArrowRight size={16} className="text-gray-400" />
      </td>
    </tr>
  );
}

export default function PartComparisonView({ projectId }: PartComparisonViewProps) {
  const { data: parts = [], isLoading } = useParts(projectId);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-48"></div>
          <div className="h-64 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (parts.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center py-12">
          <Users className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Part가 없습니다</h3>
          <p className="text-gray-500">
            프로젝트에 Part를 등록하면 Part별 진척 비교를 확인할 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Part Progress Comparison Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users size={20} className="text-indigo-600" />
          Part별 진척률 비교
        </h3>
        <div className="space-y-4">
          {parts.map((part) => (
            <PartProgressBar
              key={part.id}
              partId={part.id}
              partName={part.name}
            />
          ))}
        </div>
      </div>

      {/* Part Details Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Part 상세 현황</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Part</th>
                <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">PL</th>
                <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">완료율</th>
                <th className="text-center py-2 text-xs font-medium text-gray-500 uppercase">Story Points</th>
                <th className="text-center py-2 text-xs font-medium text-gray-500 uppercase">이슈</th>
                <th className="text-right py-2 text-xs font-medium text-gray-500 uppercase"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {parts.map((part) => (
                <PartMetricRow
                  key={part.id}
                  partId={part.id}
                  partName={part.name}
                  partLeader={part.leaderName}
                  projectId={projectId}
                />
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-4">
          행을 클릭하면 Part Dashboard로 이동합니다
        </p>
      </div>
    </div>
  );
}

// Sub-component for progress bar
function PartProgressBar({ partId, partName }: { partId: string; partName: string }) {
  const { data: metrics } = usePartMetrics(partId);
  const completionRate = metrics?.featureCompletionRate ?? 0;

  return (
    <div className="flex items-center gap-4">
      <div className="w-32 text-sm text-gray-700 truncate">{partName}</div>
      <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-indigo-500 rounded-full transition-all"
          style={{ width: `${completionRate}%` }}
        />
      </div>
      <div className="w-12 text-right text-sm font-medium text-gray-900">
        {completionRate.toFixed(0)}%
      </div>
    </div>
  );
}
