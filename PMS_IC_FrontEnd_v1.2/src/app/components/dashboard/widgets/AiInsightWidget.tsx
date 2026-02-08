import { memo } from 'react';
import { AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';
import { useInsights } from '../../../../hooks/api/useDashboard';
import { SectionStatus } from '../DataSourceBadge';
import type { InsightDto } from '../../../../types/dashboard';
import type { WidgetProps } from './types';

const INSIGHT_ICON: Record<string, { icon: typeof AlertTriangle; color: string; border: string }> = {
  RISK: { icon: AlertTriangle, color: 'text-amber-500', border: 'border-amber-200' },
  ACHIEVEMENT: { icon: CheckCircle2, color: 'text-green-500', border: 'border-green-200' },
  RECOMMENDATION: { icon: TrendingUp, color: 'text-blue-500', border: 'border-blue-200' },
};

function InsightCard({ insight }: { insight: InsightDto }) {
  const config = INSIGHT_ICON[insight.type] || INSIGHT_ICON.RECOMMENDATION;
  const Icon = config.icon;
  return (
    <div className={`bg-white rounded-lg p-4 border ${config.border}`}>
      <div className="flex items-start gap-2">
        <Icon className={`${config.color} mt-0.5`} size={18} />
        <div>
          <p className="text-sm font-medium text-gray-900">{insight.title}</p>
          <p className="text-xs text-gray-600 mt-1">{insight.description}</p>
        </div>
      </div>
    </div>
  );
}

function AiInsightWidgetInner({ projectId }: WidgetProps) {
  const { data: insightSection } = useInsights(projectId);
  const insights: InsightDto[] = insightSection?.data ?? [];

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl shadow-sm border border-purple-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">AI 인사이트</h3>
        <SectionStatus meta={insightSection?.meta} />
      </div>
      <div className="space-y-4">
        {insights.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">인사이트가 없습니다</p>
        ) : (
          insights.map((insight, idx) => <InsightCard key={idx} insight={insight} />)
        )}
      </div>
    </div>
  );
}

export const AiInsightWidget = memo(AiInsightWidgetInner);
