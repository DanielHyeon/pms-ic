import { useMemo } from 'react';
import {
  FileText,
  CheckCircle,
  AlertTriangle,
  Clock,
  Link2,
  Shield,
  XCircle,
} from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import type { RfpDetail, OriginSummary } from '../../../types/rfp';
import type { ViewModePreset } from '../../../types/menuOntology';

interface KpiCard {
  label: string;
  value: number | string;
  icon: typeof FileText;
  color: string;
}

function computeKpis(rfps: RfpDetail[], origin?: OriginSummary | null) {
  const total = rfps.length;
  const confirmed = rfps.filter((r) => r.status === 'CONFIRMED').length;
  const analyzing = rfps.filter((r) => ['PARSING', 'PARSED', 'EXTRACTING'].includes(r.status)).length;
  const reviewing = rfps.filter((r) => ['EXTRACTED', 'REVIEWING'].includes(r.status)).length;
  const needsReanalysis = rfps.filter((r) => r.status === 'NEEDS_REANALYSIS').length;
  const failed = rfps.filter((r) => r.status === 'FAILED').length;
  const totalReqs = rfps.reduce((sum, r) => sum + r.kpi.derivedRequirements, 0);
  const confirmedReqs = rfps.reduce((sum, r) => sum + r.kpi.confirmedRequirements, 0);
  const avgEpicRate = total > 0
    ? Math.round(rfps.reduce((sum, r) => sum + r.kpi.epicLinkRate, 0) / total * 100)
    : 0;

  return { total, confirmed, analyzing, reviewing, needsReanalysis, failed, totalReqs, confirmedReqs, avgEpicRate };
}

function getKpiCards(preset: ViewModePreset, stats: ReturnType<typeof computeKpis>): KpiCard[] {
  switch (preset) {
    case 'EXEC_SUMMARY':
      return [
        { label: 'Total RFP', value: stats.total, icon: FileText, color: 'text-blue-600' },
        { label: 'Requirements', value: `${stats.confirmedReqs}/${stats.totalReqs}`, icon: CheckCircle, color: 'text-green-600' },
        { label: 'Epic Link', value: `${stats.avgEpicRate}%`, icon: Link2, color: 'text-purple-600' },
      ];
    case 'PMO_CONTROL':
      return [
        { label: 'Total RFP', value: stats.total, icon: FileText, color: 'text-blue-600' },
        { label: 'Confirmed', value: stats.confirmed, icon: CheckCircle, color: 'text-green-600' },
        { label: 'Reanalysis', value: stats.needsReanalysis, icon: AlertTriangle, color: 'text-red-600' },
        { label: 'Epic Link', value: `${stats.avgEpicRate}%`, icon: Link2, color: 'text-purple-600' },
      ];
    case 'AUDIT_EVIDENCE':
      return [
        { label: 'Total RFP', value: stats.total, icon: FileText, color: 'text-blue-600' },
        { label: 'Confirmed', value: stats.confirmed, icon: Shield, color: 'text-green-600' },
        { label: 'Requirements', value: stats.totalReqs, icon: CheckCircle, color: 'text-purple-600' },
      ];
    case 'DEV_EXECUTION':
      return [
        { label: 'Requirements', value: stats.totalReqs, icon: FileText, color: 'text-blue-600' },
        { label: 'Epic Link', value: `${stats.avgEpicRate}%`, icon: Link2, color: 'text-purple-600' },
      ];
    case 'PM_WORK':
    default:
      return [
        { label: 'Total RFP', value: stats.total, icon: FileText, color: 'text-blue-600' },
        { label: 'Analyzing', value: stats.analyzing, icon: Clock, color: 'text-blue-500' },
        { label: 'Reviewing', value: stats.reviewing, icon: Clock, color: 'text-orange-500' },
        { label: 'Confirmed', value: stats.confirmed, icon: CheckCircle, color: 'text-green-600' },
        { label: 'Reanalysis', value: stats.needsReanalysis, icon: AlertTriangle, color: 'text-red-600' },
        { label: 'Failed', value: stats.failed, icon: XCircle, color: 'text-red-500' },
      ];
  }
}

interface RfpKpiRowProps {
  rfps: RfpDetail[];
  origin?: OriginSummary | null;
  preset: ViewModePreset;
}

export function RfpKpiRow({ rfps, origin, preset }: RfpKpiRowProps) {
  const stats = useMemo(() => computeKpis(rfps, origin), [rfps, origin]);
  const cards = useMemo(() => getKpiCards(preset, stats), [preset, stats]);

  if (cards.length === 0) return null;

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(cards.length, 6)}, 1fr)` }}>
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label}>
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold text-gray-900">{card.value}</div>
              <div className="text-xs text-gray-500 flex items-center gap-1 justify-center mt-1">
                <Icon className={`h-3 w-3 ${card.color}`} />
                {card.label}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
