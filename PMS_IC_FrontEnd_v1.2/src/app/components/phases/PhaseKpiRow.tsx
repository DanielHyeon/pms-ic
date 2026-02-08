import { useMemo } from 'react';
import {
  Layers,
  CheckCircle,
  Target,
  TrendingUp,
  AlertTriangle,
  Activity,
  Clock,
  Heart,
} from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import type { ViewModePreset } from '../../../types/menuOntology';
import type { Phase } from './types';

// ─── KPI card definition ─────────────────────────────────

interface KpiCard {
  label: string;
  value: number | string;
  icon: typeof Layers;
  color: string;
  sub?: string;
}

// ─── Stats computation ───────────────────────────────────

interface PhaseStats {
  totalPhases: number;
  activePhases: number;
  completedPhases: number;
  completionRate: number;
  avgDeviation: number;
  criticalDeviations: number;
  overduePhases: number;
  healthScore: number;
}

function computeStats(phases: Phase[]): PhaseStats {
  const totalPhases = phases.length;
  const activePhases = phases.filter((p) => p.status === 'inProgress').length;
  const completedPhases = phases.filter((p) => p.status === 'completed').length;
  const completionRate =
    totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0;

  const today = new Date();
  const avgDeviation = (() => {
    const activeWithDates = phases.filter(
      (p) => p.status === 'inProgress' && p.startDate && p.endDate
    );
    if (activeWithDates.length === 0) return 0;
    const totalDev = activeWithDates.reduce((sum, p) => {
      const start = new Date(p.startDate).getTime();
      const end = new Date(p.endDate).getTime();
      const totalDuration = end - start;
      if (totalDuration <= 0) return sum;
      const elapsed = today.getTime() - start;
      const expectedProgress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
      return sum + ((p.progress ?? 0) - expectedProgress);
    }, 0);
    const avg = totalDev / activeWithDates.length;
    return Number.isFinite(avg) ? Math.round(avg * 10) / 10 : 0;
  })();

  const criticalDeviations = phases.filter(
    (p) => p.status === 'inProgress' && p.progress < 30
  ).length;

  const overduePhases = phases.filter(
    (p) =>
      p.status !== 'completed' &&
      p.endDate &&
      new Date(p.endDate) < today
  ).length;

  const healthScore = Math.max(0, Math.min(100,
    100 - (criticalDeviations * 15) - (overduePhases * 10)
  ));

  return {
    totalPhases,
    activePhases,
    completedPhases,
    completionRate,
    avgDeviation,
    criticalDeviations,
    overduePhases,
    healthScore,
  };
}

// ─── Preset-driven KPI card selection ────────────────────

function getKpiCards(preset: ViewModePreset, stats: PhaseStats): KpiCard[][] {
  switch (preset) {
    case 'EXEC_SUMMARY':
      return [[
        {
          label: 'Completion Rate',
          value: `${stats.completionRate}%`,
          icon: Target,
          color: 'text-green-600',
        },
        {
          label: 'Critical Deviations',
          value: stats.criticalDeviations,
          icon: AlertTriangle,
          color: stats.criticalDeviations > 0 ? 'text-red-600' : 'text-gray-400',
        },
        {
          label: 'Health Score',
          value: `${stats.healthScore}/100`,
          icon: Heart,
          color: stats.healthScore >= 70 ? 'text-green-600' : 'text-red-600',

        },
      ]];

    case 'PMO_CONTROL':
      return [[
        {
          label: 'Total Phases',
          value: stats.totalPhases,
          icon: Layers,
          color: 'text-blue-600',
        },
        {
          label: 'Active Phases',
          value: stats.activePhases,
          icon: Activity,
          color: 'text-indigo-600',
        },
        {
          label: 'Avg Deviation',
          value: `${stats.avgDeviation > 0 ? '+' : ''}${stats.avgDeviation}%`,
          icon: TrendingUp,
          color: stats.avgDeviation >= 0 ? 'text-green-600' : 'text-red-600',

        },
        {
          label: 'Critical Deviations',
          value: stats.criticalDeviations,
          icon: AlertTriangle,
          color: stats.criticalDeviations > 0 ? 'text-red-600' : 'text-gray-400',
        },
        {
          label: 'Overdue Phases',
          value: stats.overduePhases,
          icon: Clock,
          color: stats.overduePhases > 0 ? 'text-red-600' : 'text-gray-400',
        },
        {
          label: 'Health Score',
          value: `${stats.healthScore}/100`,
          icon: Heart,
          color: stats.healthScore >= 70 ? 'text-green-600' : 'text-red-600',

        },
      ]];

    case 'PM_WORK':
      return [[
        {
          label: 'Active Phases',
          value: stats.activePhases,
          icon: Activity,
          color: 'text-indigo-600',
        },
        {
          label: 'Avg Deviation',
          value: `${stats.avgDeviation > 0 ? '+' : ''}${stats.avgDeviation}%`,
          icon: TrendingUp,
          color: stats.avgDeviation >= 0 ? 'text-green-600' : 'text-red-600',

        },
        {
          label: 'Critical Deviations',
          value: stats.criticalDeviations,
          icon: AlertTriangle,
          color: stats.criticalDeviations > 0 ? 'text-red-600' : 'text-gray-400',
        },
        {
          label: 'Overdue Phases',
          value: stats.overduePhases,
          icon: Clock,
          color: stats.overduePhases > 0 ? 'text-red-600' : 'text-gray-400',
        },
        {
          label: 'Health Score',
          value: `${stats.healthScore}/100`,
          icon: Heart,
          color: stats.healthScore >= 70 ? 'text-green-600' : 'text-red-600',

        },
      ]];

    case 'DEV_EXECUTION':
      return [[
        {
          label: 'Active Phases',
          value: stats.activePhases,
          icon: Activity,
          color: 'text-indigo-600',
        },
        {
          label: 'Completion Rate',
          value: `${stats.completionRate}%`,
          icon: CheckCircle,
          color: 'text-green-600',
        },
      ]];

    case 'CUSTOMER_APPROVAL':
      return [[
        {
          label: 'Total Phases',
          value: stats.totalPhases,
          icon: Layers,
          color: 'text-blue-600',
        },
        {
          label: 'Completion Rate',
          value: `${stats.completionRate}%`,
          icon: Target,
          color: 'text-green-600',
        },
        {
          label: 'Active Phases',
          value: stats.activePhases,
          icon: Activity,
          color: 'text-indigo-600',
        },
      ]];

    default:
      return [[
        {
          label: 'Total Phases',
          value: stats.totalPhases,
          icon: Layers,
          color: 'text-blue-600',
        },
        {
          label: 'Completion Rate',
          value: `${stats.completionRate}%`,
          icon: Target,
          color: 'text-green-600',
        },
      ]];
  }
}

// ─── Component ───────────────────────────────────────────

interface PhaseKpiRowProps {
  preset: ViewModePreset;
  phases: Phase[];
}

export function PhaseKpiRow({ preset, phases }: PhaseKpiRowProps) {
  const stats = useMemo(() => computeStats(phases), [phases]);
  const cardRows = useMemo(() => getKpiCards(preset, stats), [preset, stats]);

  return (
    <div className="space-y-2">
      {cardRows.map((row, rowIdx) => (
        <div key={rowIdx} className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {row.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.label} className="shadow-sm">
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`h-4 w-4 ${card.color}`} />
                    <span className="text-xs text-gray-500 truncate">{card.label}</span>
                  </div>
                  <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
                  {card.sub && <div className="text-[10px] text-gray-400">{card.sub}</div>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ))}
    </div>
  );
}
