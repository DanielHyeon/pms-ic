import { TrendingUp, AlertTriangle, Info } from 'lucide-react';
import type { HealthStatus, Completeness } from '../../../types/aiBriefing';

interface AiBriefingPanelProps {
  headline: string;
  signals: string[];
  healthStatus: HealthStatus;
  confidence: number;
  body: string;
  completeness: Completeness;
  missingSignals?: string[];
}

const HEALTH_CONFIG: Record<HealthStatus, { bg: string; border: string; icon: string; label: string }> = {
  GREEN:  { bg: 'bg-green-50', border: 'border-green-200', icon: 'text-green-500', label: '정상' },
  YELLOW: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'text-yellow-500', label: '주의' },
  RED:    { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-500', label: '위험' },
};

const SIGNAL_COLORS: Record<string, string> = {
  SCHEDULE_DELAY: 'bg-red-100 text-red-700',
  TEST_GAP: 'bg-orange-100 text-orange-700',
  RESOURCE_BOTTLENECK: 'bg-yellow-100 text-yellow-700',
  QUALITY_DROP: 'bg-orange-100 text-orange-700',
  POSITIVE_TREND: 'bg-green-100 text-green-700',
};

export default function AiBriefingPanel({
  headline,
  signals,
  healthStatus,
  confidence,
  body,
  completeness,
}: AiBriefingPanelProps) {
  const health = HEALTH_CONFIG[healthStatus];

  return (
    <div className={`rounded-lg border-2 ${health.border} ${health.bg} p-5`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          {healthStatus === 'GREEN' ? (
            <TrendingUp size={20} className={health.icon} />
          ) : healthStatus === 'RED' ? (
            <AlertTriangle size={20} className={health.icon} />
          ) : (
            <Info size={20} className={health.icon} />
          )}
          <h2 className="text-lg font-bold text-gray-900">{headline}</h2>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Health badge */}
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${health.border} border bg-white ${health.icon}`}>
            {health.label}
          </span>
          {/* Confidence */}
          <span className="text-sm text-gray-500">
            신뢰도 <span className="font-semibold text-gray-700">{Math.round(confidence * 100)}%</span>
          </span>
        </div>
      </div>

      {/* Signal tags */}
      {signals.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {signals.map((signal) => (
            <span
              key={signal}
              className={`px-2 py-0.5 rounded text-xs font-medium ${SIGNAL_COLORS[signal] || 'bg-gray-100 text-gray-600'}`}
            >
              {signal.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}

      {/* Completeness warning */}
      {completeness === 'PARTIAL' && (
        <div className="mb-3 px-3 py-2 bg-yellow-100/60 border border-yellow-300 rounded text-sm text-yellow-800 flex items-center gap-2">
          <AlertTriangle size={14} />
          일부 데이터 누락으로 분석이 불완전합니다.
        </div>
      )}

      {/* Body */}
      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{body}</p>
    </div>
  );
}
