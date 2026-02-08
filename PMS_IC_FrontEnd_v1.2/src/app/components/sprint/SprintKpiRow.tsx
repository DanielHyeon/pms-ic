import { useMemo } from 'react';
import { Card, CardContent } from '../ui/card';
import {
  Activity,
  TrendingUp,
  Target,
  BarChart3,
  Timer,
  CheckCircle,
  Zap,
  Calendar,
} from 'lucide-react';
import type { ViewModePreset } from '../../../types/menuOntology';
import type { Sprint } from '../../../types/backlog';

// ── Types ──────────────────────────────────────────────────

export interface SprintKpiRowProps {
  sprints: Sprint[];
  activeSprint?: Sprint;
  preset: ViewModePreset;
}

interface KpiCardDef {
  key: string;
  label: string;
  icon: React.ReactNode;
  value: string | number;
  color: string;
}

// ── KPI computation ────────────────────────────────────────

function computeSprintProgress(activeSprint?: Sprint): number {
  if (!activeSprint || !activeSprint.plannedPoints) return 0;
  return Math.round(((activeSprint.velocity || 0) / activeSprint.plannedPoints) * 100);
}

function computeVelocity(sprints: Sprint[]): number {
  const completed = sprints.filter((s) => s.status === 'COMPLETED' && s.velocity);
  if (completed.length === 0) return 0;
  return Math.round(completed.reduce((sum, s) => sum + (s.velocity || 0), 0) / completed.length);
}

function computeBurndownRemaining(activeSprint?: Sprint): string {
  if (!activeSprint) return '0 SP';
  const remaining = (activeSprint.plannedPoints || 0) - (activeSprint.velocity || 0);
  return `${Math.max(0, remaining)} SP`;
}

function computeStoryCompletionRate(sprints: Sprint[]): string {
  const completed = sprints.filter((s) => s.status === 'COMPLETED').length;
  const total = sprints.filter((s) => s.status !== 'CANCELLED').length;
  if (total === 0) return '0%';
  return `${Math.round((completed / total) * 100)}%`;
}

function computeCommittedVsCompleted(sprints: Sprint[]): string {
  const completed = sprints.filter((s) => s.status === 'COMPLETED');
  if (completed.length === 0) return '0 / 0';
  const totalPlanned = completed.reduce((sum, s) => sum + (s.plannedPoints || 0), 0);
  const totalDone = completed.reduce((sum, s) => sum + (s.velocity || 0), 0);
  return `${totalDone} / ${totalPlanned}`;
}

function buildKpiCards(
  sprints: Sprint[],
  activeSprint?: Sprint
): Record<string, KpiCardDef> {
  const totalActive = sprints.filter((s) => s.status === 'ACTIVE').length;
  const progress = computeSprintProgress(activeSprint);
  const velocity = computeVelocity(sprints);
  const burndownRemaining = computeBurndownRemaining(activeSprint);
  const storyCompletion = computeStoryCompletionRate(sprints);
  const committedVsCompleted = computeCommittedVsCompleted(sprints);

  // TODO: Replace with real API for goal completion tracking
  const goalCompletion = activeSprint ? `${progress}%` : 'N/A';

  const countByStatus = `${sprints.filter((s) => s.status === 'ACTIVE').length}A / ${sprints.filter((s) => s.status === 'PLANNING').length}P / ${sprints.filter((s) => s.status === 'COMPLETED').length}C`;

  return {
    currentSprintProgress: {
      key: 'currentSprintProgress',
      label: 'Sprint Progress',
      icon: <Activity size={18} />,
      value: `${progress}%`,
      color: 'text-blue-600',
    },
    velocity: {
      key: 'velocity',
      label: 'Avg Velocity',
      icon: <Zap size={18} />,
      value: `${velocity} SP`,
      color: 'text-green-600',
    },
    burndownRemaining: {
      key: 'burndownRemaining',
      label: 'Burndown Remaining',
      icon: <TrendingUp size={18} />,
      value: burndownRemaining,
      color: 'text-indigo-600',
    },
    sprintGoalCompletion: {
      key: 'sprintGoalCompletion',
      label: 'Goal Completion',
      icon: <Target size={18} />,
      value: goalCompletion,
      color: 'text-purple-600',
    },
    storyCompletionRate: {
      key: 'storyCompletionRate',
      label: 'Completion Rate',
      icon: <CheckCircle size={18} />,
      value: storyCompletion,
      color: 'text-teal-600',
    },
    spCommittedVsCompleted: {
      key: 'spCommittedVsCompleted',
      label: 'Committed vs Done',
      icon: <BarChart3 size={18} />,
      value: committedVsCompleted,
      color: 'text-orange-600',
    },
    totalActiveSprints: {
      key: 'totalActiveSprints',
      label: 'Active Sprints',
      icon: <Timer size={18} />,
      value: totalActive,
      color: 'text-red-600',
    },
    sprintCountByStatus: {
      key: 'sprintCountByStatus',
      label: 'Sprint Status',
      icon: <Calendar size={18} />,
      value: countByStatus,
      color: 'text-gray-600',
    },
  };
}

// ── Preset-to-KPI mapping ──────────────────────────────────

const PRESET_KPI_KEYS: Record<ViewModePreset, string[]> = {
  PM_WORK: [
    'currentSprintProgress',
    'velocity',
    'burndownRemaining',
    'sprintGoalCompletion',
    'storyCompletionRate',
    'spCommittedVsCompleted',
    'totalActiveSprints',
    'sprintCountByStatus',
  ],
  PMO_CONTROL: [
    'currentSprintProgress',
    'velocity',
    'spCommittedVsCompleted',
    'storyCompletionRate',
  ],
  DEV_EXECUTION: ['currentSprintProgress', 'burndownRemaining', 'storyCompletionRate'],
  EXEC_SUMMARY: ['currentSprintProgress', 'velocity', 'sprintGoalCompletion'],
  CUSTOMER_APPROVAL: ['currentSprintProgress', 'sprintGoalCompletion'],
  AUDIT_EVIDENCE: ['currentSprintProgress', 'velocity'],
};

// ── Component ──────────────────────────────────────────────

export function SprintKpiRow({ sprints, activeSprint, preset }: SprintKpiRowProps) {
  const allCards = useMemo(
    () => buildKpiCards(sprints, activeSprint),
    [sprints, activeSprint]
  );

  const visibleCards = useMemo(() => {
    const keys = PRESET_KPI_KEYS[preset] || PRESET_KPI_KEYS.DEV_EXECUTION;
    return keys.map((k) => allCards[k]).filter(Boolean);
  }, [preset, allCards]);

  if (visibleCards.length === 0) return null;

  return (
    <div
      className="grid gap-4"
      style={{
        gridTemplateColumns: `repeat(${Math.min(visibleCards.length, 4)}, minmax(0, 1fr))`,
      }}
    >
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
