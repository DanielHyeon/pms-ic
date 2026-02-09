import type { AiInsight, AiRecommendedAction, PresetConfig } from '../../../types/aiBriefing';
import InsightCard from './InsightCard';

interface InsightCardListProps {
  insights: AiInsight[];
  actions: AiRecommendedAction[];
  userCapabilities: Set<string>;
  presetConfig: PresetConfig;
  onAskChat: (insight: AiInsight) => void;
  onActionClick: (actionId: string, insightId: string) => void;
}

export default function InsightCardList({
  insights,
  actions,
  userCapabilities,
  presetConfig,
  onAskChat,
  onActionClick,
}: InsightCardListProps) {
  const displayInsights = presetConfig.maxCards
    ? insights.slice(0, presetConfig.maxCards)
    : insights;

  if (displayInsights.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-8 text-center">
        <p className="text-gray-500 text-sm">현재 감지된 인사이트가 없습니다.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-900">
          인사이트 ({insights.length})
        </h2>
        {presetConfig.maxCards && insights.length > presetConfig.maxCards && (
          <span className="text-xs text-gray-500">
            {presetConfig.maxCards}개 표시 중 (전체 {insights.length}개)
          </span>
        )}
      </div>
      <div className="space-y-3">
        {displayInsights.map((insight) => (
          <InsightCard
            key={insight.id}
            insight={insight}
            actions={actions}
            userCapabilities={userCapabilities}
            density={presetConfig.density}
            onAskChat={onAskChat}
            onActionClick={onActionClick}
          />
        ))}
      </div>
    </div>
  );
}
