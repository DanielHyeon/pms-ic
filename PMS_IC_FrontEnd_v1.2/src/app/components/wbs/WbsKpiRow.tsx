import { useMemo } from 'react';
import {
  CalendarDays,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Activity,
  CheckCircle,
  Pause,
  Target,
  Layers,
  ListTodo,
  BarChart3,
  Clock,
} from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import type { ViewModePreset } from '../../../types/menuOntology';
import type { PhaseWithWbs, WbsGroupWithItems, WbsItemWithTasks } from '../../../types/wbs';
import { calculateWeightedProgress } from '../../../types/wbs';

// ─── KPI card definition ─────────────────────────────────

interface KpiCard {
  label: string;
  value: number | string;
  icon: typeof Layers;
  color: string;
  sub?: string;
}

// ─── Stats computation ───────────────────────────────────

interface WbsStats {
  totalPhases: number;
  totalGroups: number;
  totalItems: number;
  totalTasks: number;
  completedGroups: number;
  completedItems: number;
  completedTasks: number;
  overallProgress: number;
  overdueCount: number;
  onHoldCount: number;
  scheduleVariance: number;
  costVariance: number;
  criticalPathCount: number;
  completionRate: number;
}

function computeStats(phases: PhaseWithWbs[]): WbsStats {
  let totalGroups = 0;
  let totalItems = 0;
  let totalTasks = 0;
  let completedGroups = 0;
  let completedItems = 0;
  let completedTasks = 0;
  let overdueCount = 0;
  let onHoldCount = 0;

  const today = new Date();

  const processPhases = (phaseList: PhaseWithWbs[]) => {
    for (const phase of phaseList) {
      // Process child phases recursively
      if (phase.childPhases && phase.childPhases.length > 0) {
        processPhases(phase.childPhases);
      }

      for (const group of phase.groups || []) {
        totalGroups++;
        if (group.status === 'COMPLETED') completedGroups++;

        for (const item of group.items || []) {
          totalItems++;
          if (item.status === 'COMPLETED') completedItems++;
          if (item.status === 'ON_HOLD') onHoldCount++;

          // Check overdue: IN_PROGRESS items past planned end date
          if (
            item.status === 'IN_PROGRESS' &&
            item.plannedEndDate &&
            new Date(item.plannedEndDate) < today
          ) {
            overdueCount++;
          }

          for (const task of item.tasks || []) {
            totalTasks++;
            if (task.status === 'COMPLETED') completedTasks++;
            if (task.status === 'ON_HOLD') onHoldCount++;

            if (
              task.status === 'IN_PROGRESS' &&
              task.plannedEndDate &&
              new Date(task.plannedEndDate) < today
            ) {
              overdueCount++;
            }
          }
        }
      }
    }
  };

  processPhases(phases);

  // Calculate overall progress using weighted progress from phases
  const progressData = phases
    .filter((p) => !p.parentId) // Only top-level phases
    .map((p) => ({
      weight: 1,
      progress: p.calculatedProgress || p.progress || 0,
    }));
  const overallProgress = calculateWeightedProgress(progressData);

  // Completion rate based on items
  const completionRate =
    totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return {
    totalPhases: phases.length,
    totalGroups,
    totalItems,
    totalTasks,
    completedGroups,
    completedItems,
    completedTasks,
    overallProgress,
    overdueCount,
    onHoldCount,
    scheduleVariance: (() => {
      const inProgressItems: { plannedEnd: Date; progress: number; plannedStart: Date }[] = [];
      const collectItems = (phaseList: PhaseWithWbs[]) => {
        for (const phase of phaseList) {
          if (phase.childPhases?.length) collectItems(phase.childPhases);
          for (const group of phase.groups || []) {
            for (const item of group.items || []) {
              if (
                item.status === 'IN_PROGRESS' &&
                item.plannedEndDate &&
                item.plannedStartDate
              ) {
                inProgressItems.push({
                  plannedEnd: new Date(item.plannedEndDate),
                  plannedStart: new Date(item.plannedStartDate),
                  progress: item.progress ?? 0,
                });
              }
            }
          }
        }
      };
      collectItems(phases);
      if (inProgressItems.length === 0) return 0;
      const totalVariance = inProgressItems.reduce((sum, it) => {
        const totalDuration = (it.plannedEnd.getTime() - it.plannedStart.getTime()) / (1000 * 60 * 60 * 24);
        if (totalDuration <= 0) return sum;
        const elapsed = (today.getTime() - it.plannedStart.getTime()) / (1000 * 60 * 60 * 24);
        const expectedProgress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
        return sum + (it.progress - expectedProgress);
      }, 0);
      const avg = totalVariance / inProgressItems.length;
      return Number.isFinite(avg) ? Math.round(avg * 10) / 10 : 0;
    })(),
    costVariance: 0,
    criticalPathCount: 0,
    completionRate,
  };
}

// ─── Preset-driven KPI card selection ────────────────────

function getKpiCards(preset: ViewModePreset, stats: WbsStats): KpiCard[][] {
  switch (preset) {
    case 'EXEC_SUMMARY':
      return [[
        {
          label: 'Overall Progress',
          value: `${stats.overallProgress}%`,
          icon: TrendingUp,
          color: 'text-blue-600',
        },
        {
          label: 'Schedule Variance',
          value: `${stats.scheduleVariance > 0 ? '+' : ''}${stats.scheduleVariance}d`,
          icon: stats.scheduleVariance >= 0 ? TrendingUp : TrendingDown,
          color: stats.scheduleVariance >= 0 ? 'text-green-600' : 'text-red-600',

        },
        {
          label: 'Overdue Items',
          value: stats.overdueCount,
          icon: AlertTriangle,
          color: stats.overdueCount > 0 ? 'text-red-600' : 'text-gray-400',
        },
      ]];

    case 'PMO_CONTROL':
      return [
        [
          {
            label: 'Overall Progress',
            value: `${stats.overallProgress}%`,
            icon: TrendingUp,
            color: 'text-blue-600',
          },
          {
            label: 'SV',
            value: `${stats.scheduleVariance > 0 ? '+' : ''}${stats.scheduleVariance}d`,
            icon: stats.scheduleVariance >= 0 ? TrendingUp : TrendingDown,
            color: stats.scheduleVariance >= 0 ? 'text-green-600' : 'text-red-600',
  
          },
          {
            label: 'CV',
            value: `${stats.costVariance > 0 ? '+' : ''}${stats.costVariance}%`,
            icon: stats.costVariance >= 0 ? TrendingUp : TrendingDown,
            color: stats.costVariance >= 0 ? 'text-green-600' : 'text-red-600',
  
          },
          {
            label: 'Overdue',
            value: stats.overdueCount,
            icon: AlertTriangle,
            color: stats.overdueCount > 0 ? 'text-red-600' : 'text-gray-400',
          },
          {
            label: 'On Hold',
            value: stats.onHoldCount,
            icon: Pause,
            color: stats.onHoldCount > 0 ? 'text-amber-600' : 'text-gray-400',
          },
          {
            label: 'Critical Path',
            value: stats.criticalPathCount,
            icon: Activity,
            color: 'text-red-600',
  
          },
        ],
      ];

    case 'PM_WORK':
      return [
        // Row 1: Counts
        [
          { label: 'Groups', value: stats.totalGroups, icon: Layers, color: 'text-blue-600' },
          { label: 'Items', value: stats.totalItems, icon: ListTodo, color: 'text-indigo-600' },
          { label: 'Tasks', value: stats.totalTasks, icon: CheckCircle, color: 'text-gray-600' },
          {
            label: 'Progress',
            value: `${stats.overallProgress}%`,
            icon: TrendingUp,
            color: 'text-blue-600',
          },
        ],
        // Row 2: EVM & Attention
        [
          {
            label: 'SV',
            value: `${stats.scheduleVariance > 0 ? '+' : ''}${stats.scheduleVariance}d`,
            icon: CalendarDays,
            color: stats.scheduleVariance >= 0 ? 'text-green-600' : 'text-red-600',
  
          },
          {
            label: 'CV',
            value: `${stats.costVariance > 0 ? '+' : ''}${stats.costVariance}%`,
            icon: BarChart3,
            color: stats.costVariance >= 0 ? 'text-green-600' : 'text-red-600',
  
          },
          {
            label: 'Overdue',
            value: stats.overdueCount,
            icon: AlertTriangle,
            color: stats.overdueCount > 0 ? 'text-red-600' : 'text-gray-400',
          },
          {
            label: 'Critical Path',
            value: stats.criticalPathCount,
            icon: Activity,
            color: 'text-red-600',
  
          },
          {
            label: 'On Hold',
            value: stats.onHoldCount,
            icon: Pause,
            color: stats.onHoldCount > 0 ? 'text-amber-600' : 'text-gray-400',
          },
          {
            label: 'Completion Rate',
            value: `${stats.completionRate}%`,
            icon: Target,
            color: 'text-green-600',
          },
        ],
      ];

    case 'DEV_EXECUTION':
      return [[
        {
          label: 'My Items',
          value: stats.totalItems,
          icon: ListTodo,
          color: 'text-blue-600',

        },
        {
          label: 'My Progress',
          value: `${stats.overallProgress}%`,
          icon: TrendingUp,
          color: 'text-indigo-600',

        },
        {
          label: 'My Overdue',
          value: stats.overdueCount,
          icon: AlertTriangle,
          color: stats.overdueCount > 0 ? 'text-red-600' : 'text-gray-400',

        },
      ]];

    case 'CUSTOMER_APPROVAL':
      return [[
        {
          label: 'Overall Progress',
          value: `${stats.overallProgress}%`,
          icon: TrendingUp,
          color: 'text-blue-600',
        },
        {
          label: 'SV',
          value: `${stats.scheduleVariance > 0 ? '+' : ''}${stats.scheduleVariance}d`,
          icon: stats.scheduleVariance >= 0 ? TrendingUp : TrendingDown,
          color: stats.scheduleVariance >= 0 ? 'text-green-600' : 'text-red-600',

        },
      ]];

    default:
      return [[
        {
          label: 'Groups',
          value: stats.totalGroups,
          icon: Layers,
          color: 'text-blue-600',
        },
        {
          label: 'Progress',
          value: `${stats.overallProgress}%`,
          icon: TrendingUp,
          color: 'text-indigo-600',
        },
      ]];
  }
}

// ─── Component ───────────────────────────────────────────

interface WbsKpiRowProps {
  preset: ViewModePreset;
  phases: PhaseWithWbs[];
}

export function WbsKpiRow({ preset, phases }: WbsKpiRowProps) {
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
