import { useMemo } from 'react';
import {
  GitBranch,
  Link2,
  Unlink,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import type { ViewModePreset } from '../../../types/menuOntology';
import type { LineageStatisticsDto } from '../../../types/lineage';

// ─── KPI card definition ─────────────────────────────────

interface KpiCard {
  label: string;
  value: number | string;
  icon: typeof GitBranch;
  color: string;
  warn?: boolean;
}

// ─── Stats interface (extended with lineage-specific metrics) ─

interface LineageKpiStats {
  totalNodes: number;
  totalEdges: number;
  orphanCount: number;
  breakpointCount: number;
  maxChainDepth: number;
}

/**
 * Derives lineage KPI stats from API statistics.
 * Returns all zeros when statistics are unavailable.
 */
function deriveStats(statistics?: LineageStatisticsDto | null): LineageKpiStats {
  if (!statistics) {
    return { totalNodes: 0, totalEdges: 0, orphanCount: 0, breakpointCount: 0, maxChainDepth: 0 };
  }

  return {
    totalNodes:
      statistics.requirements +
      statistics.stories +
      statistics.tasks +
      statistics.sprints,
    totalEdges: statistics.linkedRequirements,
    orphanCount: statistics.unlinkedRequirements,
    breakpointCount: 0,
    maxChainDepth: 0,
  };
}

// ─── Preset-driven KPI card selection ────────────────────

function getKpiCards(preset: ViewModePreset, stats: LineageKpiStats): KpiCard[] {
  switch (preset) {
    case 'EXEC_SUMMARY':
      return [
        { label: 'Total Nodes', value: stats.totalNodes, icon: GitBranch, color: 'text-blue-600' },
        { label: 'Orphan Count', value: stats.orphanCount, icon: Unlink, color: 'text-amber-600', warn: stats.orphanCount > 0 },
      ];

    case 'PMO_CONTROL':
      return [
        { label: 'Orphan Count', value: stats.orphanCount, icon: Unlink, color: 'text-amber-600', warn: stats.orphanCount > 0 },
        { label: 'Breakpoint Count', value: stats.breakpointCount, icon: AlertTriangle, color: 'text-amber-600', warn: stats.breakpointCount > 0 },
        { label: 'Total Edges', value: stats.totalEdges, icon: Link2, color: 'text-indigo-600' },
      ];

    case 'PM_WORK':
      return [
        { label: 'Total Nodes', value: stats.totalNodes, icon: GitBranch, color: 'text-blue-600' },
        { label: 'Breakpoint Count', value: stats.breakpointCount, icon: AlertTriangle, color: 'text-amber-600', warn: stats.breakpointCount > 0 },
        { label: 'Orphan Count', value: stats.orphanCount, icon: Unlink, color: 'text-amber-600', warn: stats.orphanCount > 0 },
      ];

    case 'DEV_EXECUTION':
      return [
        { label: 'Total Nodes', value: stats.totalNodes, icon: GitBranch, color: 'text-blue-600' },
        { label: 'Total Edges', value: stats.totalEdges, icon: Link2, color: 'text-indigo-600' },
      ];

    case 'CUSTOMER_APPROVAL':
      return [
        { label: 'Total Nodes', value: stats.totalNodes, icon: GitBranch, color: 'text-blue-600' },
      ];

    case 'AUDIT_EVIDENCE':
      return [
        { label: 'Total Nodes', value: stats.totalNodes, icon: GitBranch, color: 'text-blue-600' },
        { label: 'Total Edges', value: stats.totalEdges, icon: Link2, color: 'text-indigo-600' },
        { label: 'Orphan Count', value: stats.orphanCount, icon: Unlink, color: 'text-amber-600', warn: stats.orphanCount > 0 },
        { label: 'Breakpoint Count', value: stats.breakpointCount, icon: AlertTriangle, color: 'text-amber-600', warn: stats.breakpointCount > 0 },
        { label: 'Max Chain Depth', value: stats.maxChainDepth, icon: Layers, color: 'text-purple-600' },
      ];

    default:
      return [
        { label: 'Total Nodes', value: stats.totalNodes, icon: GitBranch, color: 'text-blue-600' },
        { label: 'Total Edges', value: stats.totalEdges, icon: Link2, color: 'text-indigo-600' },
      ];
  }
}

// ─── Component ───────────────────────────────────────────

interface LineageKpiRowProps {
  statistics?: LineageStatisticsDto | null;
  preset: ViewModePreset;
}

export function LineageKpiRow({ statistics, preset }: LineageKpiRowProps) {
  const stats = useMemo(() => deriveStats(statistics), [statistics]);
  const cards = useMemo(() => getKpiCards(preset, stats), [preset, stats]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label} className="shadow-sm">
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`h-4 w-4 ${card.color}`} />
                <span className="text-xs text-gray-500 truncate">{card.label}</span>
              </div>
              <div className={`text-2xl font-bold ${card.warn ? 'text-amber-600' : card.color}`}>
                {card.value}
              </div>
              {card.warn && (
                <div className="text-[10px] text-amber-500 mt-0.5">Attention needed</div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
