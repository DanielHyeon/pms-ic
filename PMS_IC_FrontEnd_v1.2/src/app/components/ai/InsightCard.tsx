import { useState } from 'react';
import { ChevronDown, ChevronUp, MessageSquare, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { AiInsight, AiRecommendedAction, Severity, InsightType } from '../../../types/aiBriefing';
import { isSeverityAboveThreshold, MINIMUM_SEVERITY_FOR_ACTION } from '../../../types/aiBriefing';

interface InsightCardProps {
  insight: AiInsight;
  actions: AiRecommendedAction[];
  userCapabilities: Set<string>;
  density: 'compact' | 'standard' | 'detailed';
  onAskChat: (insight: AiInsight) => void;
  onActionClick: (actionId: string, insightId: string) => void;
}

const TYPE_CONFIG: Record<InsightType, { color: string; bg: string; label: string }> = {
  DELAY:      { color: 'text-red-700',    bg: 'bg-red-100',    label: '일정 지연' },
  RISK:       { color: 'text-orange-700',  bg: 'bg-orange-100',  label: '리스크' },
  BOTTLENECK: { color: 'text-yellow-700',  bg: 'bg-yellow-100',  label: '병목' },
  POLICY_GAP: { color: 'text-red-700',    bg: 'bg-red-100',    label: '정책 위반' },
  QUALITY:    { color: 'text-orange-700',  bg: 'bg-orange-100',  label: '품질 경고' },
  PROGRESS:   { color: 'text-blue-700',   bg: 'bg-blue-100',   label: '진행률' },
  RESOURCE:   { color: 'text-yellow-700',  bg: 'bg-yellow-100',  label: '리소스' },
  POSITIVE:   { color: 'text-green-700',  bg: 'bg-green-100',  label: '긍정 신호' },
};

const SEVERITY_CONFIG: Record<Severity, { color: string; bg: string }> = {
  CRITICAL: { color: 'text-red-800',    bg: 'bg-red-200' },
  HIGH:     { color: 'text-red-700',    bg: 'bg-red-100' },
  MEDIUM:   { color: 'text-yellow-700', bg: 'bg-yellow-100' },
  LOW:      { color: 'text-blue-700',   bg: 'bg-blue-100' },
  INFO:     { color: 'text-gray-600',   bg: 'bg-gray-100' },
};

export default function InsightCard({
  insight,
  actions,
  userCapabilities,
  density,
  onAskChat,
  onActionClick,
}: InsightCardProps) {
  const [expanded, setExpanded] = useState(density === 'detailed');
  const navigate = useNavigate();
  const typeConfig = TYPE_CONFIG[insight.type];
  const sevConfig = SEVERITY_CONFIG[insight.severity];
  const isLowConfidence = insight.confidence < 0.6;

  const linkedActions = actions.filter(
    (a) =>
      insight.actionRefs.includes(a.actionId) &&
      userCapabilities.has(a.requiredCapability) &&
      isSeverityAboveThreshold(insight.severity, MINIMUM_SEVERITY_FOR_ACTION[a.actionId] || 'INFO'),
  );

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow ${isLowConfidence ? 'opacity-75' : ''}`}>
      <div className="p-4">
        {/* Top row: badges */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${sevConfig.bg} ${sevConfig.color}`}>
              {insight.severity}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeConfig.bg} ${typeConfig.color}`}>
              {typeConfig.label}
            </span>
            {isLowConfidence && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
                참고용
              </span>
            )}
          </div>
          <span className="text-xs text-gray-500">
            신뢰도 {Math.round(insight.confidence * 100)}%
          </span>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-gray-900 mb-1">{insight.title}</h3>

        {/* Description */}
        {density !== 'compact' && (
          <p className="text-sm text-gray-600 mb-3">{insight.description}</p>
        )}

        {/* Expandable evidence */}
        {density !== 'compact' && (
          <>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-2"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              근거 상세
            </button>
            {expanded && (
              <div className="bg-gray-50 rounded p-3 text-xs text-gray-600 space-y-1 mb-3">
                <div><span className="font-medium">데이터 소스:</span> {insight.evidence.dataSource}</div>
                <div><span className="font-medium">메트릭:</span> {insight.evidence.metrics.join(', ')}</div>
                <div><span className="font-medium">관련 엔티티:</span> {insight.evidence.entities.join(', ')}</div>
                <div><span className="font-medium">기준 시점:</span> {new Date(insight.evidence.asOf).toLocaleString('ko-KR')}</div>
              </div>
            )}
          </>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {linkedActions.map((action) => (
            <button
              key={action.actionId}
              onClick={() => {
                onActionClick(action.actionId, insight.id);
                navigate(action.targetRoute);
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-xs font-medium hover:bg-blue-100 transition-colors"
            >
              <ExternalLink size={12} />
              {action.label}
            </button>
          ))}
          <button
            onClick={() => onAskChat(insight)}
            className="flex items-center gap-1 px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-md text-xs font-medium hover:bg-purple-100 transition-colors"
          >
            <MessageSquare size={12} />
            질문하기
          </button>
        </div>
      </div>
    </div>
  );
}
