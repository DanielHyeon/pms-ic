import { ExternalLink, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { AiRecommendedAction } from '../../../types/aiBriefing';

interface RecommendedActionPanelProps {
  actions: AiRecommendedAction[];
  userCapabilities: Set<string>;
  onActionClick: (actionId: string) => void;
}

export default function RecommendedActionPanel({
  actions,
  userCapabilities,
  onActionClick,
}: RecommendedActionPanelProps) {
  const navigate = useNavigate();
  const sorted = [...actions].sort((a, b) => a.priority - b.priority);

  if (sorted.length === 0) return null;

  return (
    <div>
      <h2 className="text-base font-semibold text-gray-900 mb-3">추천 행동</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sorted.map((action) => {
          const hasPermission = userCapabilities.has(action.requiredCapability);
          return (
            <button
              key={action.actionId}
              onClick={() => {
                if (!hasPermission) return;
                onActionClick(action.actionId);
                navigate(action.targetRoute);
              }}
              disabled={!hasPermission}
              className={`flex flex-col items-start p-4 rounded-lg border text-left transition-all ${
                hasPermission
                  ? 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md cursor-pointer'
                  : 'bg-gray-50 border-gray-100 cursor-not-allowed opacity-60'
              }`}
              title={hasPermission ? action.description : '권한이 필요합니다'}
            >
              <div className="flex items-center gap-2 mb-2">
                {hasPermission ? (
                  <ExternalLink size={14} className="text-blue-500" />
                ) : (
                  <Lock size={14} className="text-gray-400" />
                )}
                <span className="text-sm font-medium text-gray-900">{action.label}</span>
              </div>
              <p className="text-xs text-gray-500 line-clamp-2">{action.description}</p>
              <div className="mt-2 flex items-center gap-1">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600">
                  우선순위 {action.priority}
                </span>
                {!hasPermission && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500">
                    권한 필요
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
