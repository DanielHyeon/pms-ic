import { Shield, FileText, Link2, AlertTriangle, Eye } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import type { OriginSummary, ChangeImpactLevel } from '../../../types/rfp';
import { cn } from '../ui/utils';

const IMPACT_COLORS: Record<ChangeImpactLevel, string> = {
  NONE: 'text-gray-400',
  LOW: 'text-green-600',
  MEDIUM: 'text-yellow-600',
  HIGH: 'text-red-600',
};

const IMPACT_BG: Record<ChangeImpactLevel, string> = {
  NONE: 'bg-gray-50',
  LOW: 'bg-green-50',
  MEDIUM: 'bg-yellow-50',
  HIGH: 'bg-red-50',
};

interface OriginSummaryStripProps {
  summary: OriginSummary;
  onViewEvidence?: () => void;
  onViewImpact?: () => void;
}

export function OriginSummaryStrip({ summary, onViewEvidence, onViewImpact }: OriginSummaryStripProps) {
  const { kpi, originTypeLabel, policy } = summary;
  // kpi가 아직 로드되지 않은 경우 방어 처리
  const impact = kpi?.lastChangeImpact ?? { level: 'NONE' as ChangeImpactLevel, impactedEpics: 0, impactedTasks: 0 };

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Origin type */}
          <div className="flex items-center gap-2 min-w-[180px]">
            <Shield className="h-4 w-4 text-blue-600" />
            <div>
              <Badge className="bg-blue-100 text-blue-700 text-xs">{originTypeLabel}</Badge>
              <div className="text-xs text-gray-400 mt-0.5">
                {policy.lineageEnforcement === 'STRICT' ? 'Strict Lineage' : 'Relaxed Lineage'}
              </div>
            </div>
          </div>

          {/* KPI cards */}
          <div className="flex items-center gap-6">
            <KpiItem icon={FileText} label="Active RFP" value={kpi?.activeRfpCount ?? 0} />
            <KpiItem
              icon={FileText}
              label="Requirements"
              value={`${kpi?.confirmedRequirements ?? 0}/${kpi?.totalRequirements ?? 0}`}
            />
            <KpiItem
              icon={Link2}
              label="Epic Link"
              value={`${Math.round((kpi?.epicLinkRate ?? 0) * 100)}%`}
              highlight={(kpi?.epicLinkRate ?? 0) < 0.7}
            />
          </div>

          {/* Change impact */}
          <div className="flex items-center gap-3">
            {impact.level !== 'NONE' && (
              <button
                onClick={onViewImpact}
                className={cn('flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium', IMPACT_BG[impact.level], IMPACT_COLORS[impact.level])}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Impact: {impact.level}
                <span className="opacity-70">
                  ({impact.impactedEpics}E / {impact.impactedTasks}T)
                </span>
              </button>
            )}
            <Button variant="ghost" size="sm" onClick={onViewEvidence} className="text-xs">
              <Eye className="h-3.5 w-3.5 mr-1" />
              Evidence
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function KpiItem({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: typeof FileText;
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div className="text-center">
      <div className={cn('text-lg font-semibold', highlight ? 'text-red-600' : 'text-gray-900')}>
        {value}
      </div>
      <div className="text-xs text-gray-400 flex items-center gap-1 justify-center">
        <Icon className="h-3 w-3" />
        {label}
      </div>
    </div>
  );
}
