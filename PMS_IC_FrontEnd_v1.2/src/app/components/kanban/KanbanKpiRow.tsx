import { useMemo } from 'react';
import { Card, CardContent } from '../ui/card';
import { Activity, Clock, TrendingUp, AlertTriangle, Timer, BarChart3 } from 'lucide-react';
import type { ViewModePreset } from '../../../types/menuOntology';

// ─── Types ──────────────────────────────────────────────────

interface KanbanStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  firefightingTasks: number;
}

export interface KanbanKpiRowProps {
  preset: ViewModePreset;
  stats: KanbanStats;
}

interface KpiCardDef {
  key: string;
  label: string;
  icon: React.ReactNode;
  value: string | number;
  color: string;
}

// ─── Preset-to-KPI mapping ─────────────────────────────────
//
// PM_WORK:            wipCount, cycleTime, throughput, blockedCount (row 1)
//                     + leadTime, avgCycleTime (row 2) -- 6 total
// PMO_CONTROL:        wipCount, throughput, blockedCount, avgLeadTime (4 cards)
// DEV_EXECUTION:      wipCount (my), cycleTime (my) (2 cards)
// EXEC_SUMMARY:       throughput, blockedCount (2 cards)
// CUSTOMER_APPROVAL:  throughput only (1 card)
// AUDIT_EVIDENCE:     throughput, blockedCount (2 cards, same as EXEC)

function buildKpiCards(stats: KanbanStats): Record<string, KpiCardDef> {
  // wipCount = inProgressTasks (from stats)
  const wipCount = stats.inProgressTasks;

  const cycleTime = 'N/A';
  const throughput = `${stats.completedTasks} /week`;
  const blockedCount = stats.firefightingTasks;
  const leadTime = 'N/A';
  const avgCycleTime = 'N/A';

  return {
    wipCount: {
      key: 'wipCount',
      label: 'WIP Count',
      icon: <Activity size={18} />,
      value: wipCount,
      color: 'text-blue-600',
    },
    cycleTime: {
      key: 'cycleTime',
      label: 'Cycle Time',
      icon: <Clock size={18} />,
      value: cycleTime,
      color: 'text-indigo-600',
    },
    throughput: {
      key: 'throughput',
      label: 'Throughput',
      icon: <TrendingUp size={18} />,
      value: throughput,
      color: 'text-green-600',
    },
    blockedCount: {
      key: 'blockedCount',
      label: 'Blocked',
      icon: <AlertTriangle size={18} />,
      value: blockedCount,
      color: 'text-red-600',
    },
    leadTime: {
      key: 'leadTime',
      label: 'Lead Time',
      icon: <Timer size={18} />,
      value: leadTime,
      color: 'text-purple-600',
    },
    avgCycleTime: {
      key: 'avgCycleTime',
      label: 'Avg Cycle Time',
      icon: <BarChart3 size={18} />,
      value: avgCycleTime,
      color: 'text-teal-600',
    },
  };
}

const PRESET_KPI_KEYS: Record<ViewModePreset, string[]> = {
  PM_WORK: ['wipCount', 'cycleTime', 'throughput', 'blockedCount', 'leadTime', 'avgCycleTime'],
  PMO_CONTROL: ['wipCount', 'throughput', 'blockedCount', 'leadTime'],
  DEV_EXECUTION: ['wipCount', 'cycleTime'],
  EXEC_SUMMARY: ['throughput', 'blockedCount'],
  CUSTOMER_APPROVAL: ['throughput'],
  AUDIT_EVIDENCE: ['throughput', 'blockedCount'],
};

// ─── Component ──────────────────────────────────────────────

export function KanbanKpiRow({ preset, stats }: KanbanKpiRowProps) {
  const allCards = useMemo(() => buildKpiCards(stats), [stats]);

  const visibleCards = useMemo(() => {
    const keys = PRESET_KPI_KEYS[preset] || PRESET_KPI_KEYS.DEV_EXECUTION;
    return keys.map((k) => allCards[k]).filter(Boolean);
  }, [preset, allCards]);

  if (visibleCards.length === 0) return null;

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.min(visibleCards.length, 4)}, minmax(0, 1fr))` }}>
      {visibleCards.map((card) => (
        <Card key={card.key} className="border border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className={card.color}>{card.icon}</span>
              <p className="text-sm text-gray-500">{card.label}</p>
            </div>
            <p className={`text-2xl font-semibold mt-1 ${card.color}`}>
              {card.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
