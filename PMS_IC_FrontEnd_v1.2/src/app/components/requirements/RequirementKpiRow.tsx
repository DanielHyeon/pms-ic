import { useMemo } from 'react';
import {
  ClipboardList,
  CheckCircle,
  XCircle,
  Clock,
  Link2,
  AlertTriangle,
  FileText,
  BarChart3,
} from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import type { ViewModePreset } from '../../../types/menuOntology';
import type { RequirementStats } from '../../../types/requirement';
import type { Requirement } from '../../../types/project';

interface KpiCard {
  label: string;
  value: number | string;
  icon: typeof ClipboardList;
  color: string;
}

/**
 * Compute stats from the raw requirements list.
 * Fields like traceStatus and acceptance are derived from existing data
 * with fallbacks for API fields that may not yet be populated.
 */
function computeStats(requirements: Requirement[]): RequirementStats {
  const total = requirements.length;
  const functional = requirements.filter((r) =>
    r.category === 'FUNCTIONAL' || r.category === 'AI' || r.category === 'SI' || r.category === 'COMMON'
  ).length;
  const nonFunctional = requirements.filter((r) => r.category === 'NON_FUNCTIONAL').length;

  // Acceptance values derived from acceptanceCriteria presence
  const acceptanceY = requirements.filter((r) => r.acceptanceCriteria && r.acceptanceCriteria.trim().length > 0).length;
  const acceptanceX = 0; // TODO: Replace with real acceptance field from API
  const acceptancePending = total - acceptanceY - acceptanceX;

  // Trace fields - use traceStatus if available, otherwise derive from linkedTaskIds
  const linked = requirements.filter(
    (r) => (r as unknown as Record<string, unknown>).traceStatus === 'linked' || (r.linkedTaskIds && r.linkedTaskIds.length > 0)
  ).length;
  const unlinkedCount = requirements.filter(
    (r) => (r as unknown as Record<string, unknown>).traceStatus === 'unlinked' || (!r.linkedTaskIds || r.linkedTaskIds.length === 0)
  ).length;
  const breakpointCount = requirements.filter(
    (r) => (r as unknown as Record<string, unknown>).traceStatus === 'breakpoint'
  ).length;

  const traceCoverage = total > 0 ? Math.round((linked / total) * 100) : 0;

  return {
    total,
    functional,
    nonFunctional,
    acceptanceY,
    acceptanceX,
    acceptancePending,
    traceCoverage,
    unlinkedCount,
    breakpointCount,
    changeRequestPending: 0, // TODO: Replace with real API data
  };
}

/**
 * Returns the KPI cards to display based on the current preset.
 */
function getKpiCards(preset: ViewModePreset, stats: RequirementStats): KpiCard[] {
  switch (preset) {
    case 'EXEC_SUMMARY':
      return [
        { label: 'Total', value: stats.total, icon: ClipboardList, color: 'text-blue-600' },
        {
          label: 'Acceptance Rate',
          value: stats.total > 0 ? `${Math.round((stats.acceptanceY / stats.total) * 100)}%` : '0%',
          icon: CheckCircle,
          color: 'text-green-600',
        },
      ];

    case 'PMO_CONTROL':
      return [
        { label: 'Total', value: stats.total, icon: ClipboardList, color: 'text-blue-600' },
        {
          label: 'Acceptance Rate',
          value: stats.total > 0 ? `${Math.round((stats.acceptanceY / stats.total) * 100)}%` : '0%',
          icon: CheckCircle,
          color: 'text-green-600',
        },
        { label: 'Trace Coverage', value: `${stats.traceCoverage}%`, icon: BarChart3, color: 'text-purple-600' },
        { label: 'Change Requests', value: stats.changeRequestPending, icon: FileText, color: 'text-orange-600' },
      ];

    case 'PM_WORK':
      return [
        { label: 'Total', value: stats.total, icon: ClipboardList, color: 'text-blue-600' },
        { label: 'Unlinked', value: stats.unlinkedCount, icon: Link2, color: 'text-gray-600' },
        { label: 'Trace Coverage', value: `${stats.traceCoverage}%`, icon: BarChart3, color: 'text-purple-600' },
        { label: 'Breakpoints', value: stats.breakpointCount, icon: AlertTriangle, color: 'text-amber-600' },
        { label: 'Pending Changes', value: stats.changeRequestPending, icon: Clock, color: 'text-orange-600' },
      ];

    case 'DEV_EXECUTION':
      return [
        { label: 'Total', value: stats.total, icon: ClipboardList, color: 'text-blue-600' },
        { label: 'Functional', value: stats.functional, icon: CheckCircle, color: 'text-green-600' },
        { label: 'Non-Functional', value: stats.nonFunctional, icon: XCircle, color: 'text-orange-600' },
      ];

    case 'CUSTOMER_APPROVAL':
      return [
        { label: 'Total', value: stats.total, icon: ClipboardList, color: 'text-blue-600' },
        { label: 'Accepted', value: stats.acceptanceY, icon: CheckCircle, color: 'text-green-600' },
        { label: 'Pending', value: stats.acceptancePending, icon: Clock, color: 'text-yellow-600' },
        { label: 'Pending Changes', value: stats.changeRequestPending, icon: FileText, color: 'text-orange-600' },
      ];

    case 'AUDIT_EVIDENCE':
      return [
        { label: 'Total', value: stats.total, icon: ClipboardList, color: 'text-blue-600' },
        { label: 'Trace Coverage', value: `${stats.traceCoverage}%`, icon: BarChart3, color: 'text-purple-600' },
        { label: 'Breakpoints', value: stats.breakpointCount, icon: AlertTriangle, color: 'text-amber-600' },
      ];

    default:
      return [
        { label: 'Total', value: stats.total, icon: ClipboardList, color: 'text-blue-600' },
      ];
  }
}

interface RequirementKpiRowProps {
  requirements: Requirement[];
  preset: ViewModePreset;
}

export function RequirementKpiRow({ requirements, preset }: RequirementKpiRowProps) {
  const stats = useMemo(() => computeStats(requirements), [requirements]);
  const cards = useMemo(() => getKpiCards(preset, stats), [preset, stats]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label} className="shadow-sm">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-4 w-4 ${card.color}`} />
                <span className="text-xs text-gray-500 truncate">{card.label}</span>
              </div>
              <div className={`text-xl font-bold ${card.color}`}>{card.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
