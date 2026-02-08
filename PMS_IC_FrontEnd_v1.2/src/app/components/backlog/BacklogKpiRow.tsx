import { useMemo } from 'react';
import {
  Layers,
  CheckCircle,
  Target,
  TrendingUp,
  AlertTriangle,
  HelpCircle,
  Users,
  ListTodo,
  Zap,
  BarChart3,
  Clock,
} from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import type { ViewModePreset } from '../../../types/menuOntology';
import type { Epic } from '../../../types/backlog';
import type { UserStory } from '../../../utils/storyTypes';

// ─── KPI card definition ─────────────────────────────────

interface KpiCard {
  label: string;
  value: number | string;
  icon: typeof Layers;
  color: string;
  sub?: string;
}

// ─── Stats computation ───────────────────────────────────

interface BacklogStats {
  epicCount: number;
  featureCount: number;
  storyCount: number;
  taskCount: number;
  totalSp: number;
  completedSp: number;
  overallProgress: number;
  storiesBacklog: number;
  storiesInSprint: number;
  storiesDone: number;
  velocity: number;
  blocked: number;
  unestimated: number;
  readyNoSprint: number;
  unassigned: number;
}

function computeStats(epics: Epic[], stories: UserStory[]): BacklogStats {
  const epicCount = epics.length;
  // Features are not directly passed; use epic.itemCount as proxy
  const featureCount = epics.reduce((sum, e) => sum + (e.itemCount || 0), 0);
  const storyCount = stories.length;
  const taskCount = 0; // Tasks are not available at this level

  const totalSp = stories.reduce((sum, s) => sum + (s.storyPoints || 0), 0);

  const isDone = (status: string) => ['DONE', 'COMPLETED'].includes(status);
  const isBacklog = (status: string) => ['BACKLOG', 'IDEA', 'REFINED', 'READY'].includes(status);
  const isSprint = (status: string) => ['SELECTED', 'IN_SPRINT', 'IN_PROGRESS', 'REVIEW'].includes(status);

  const doneStories = stories.filter((s) => isDone(s.status));
  const completedSp = doneStories.reduce((sum, s) => sum + (s.storyPoints || 0), 0);
  const overallProgress = totalSp > 0 ? Math.round((completedSp / totalSp) * 100) : 0;

  const storiesBacklog = stories.filter((s) => isBacklog(s.status)).length;
  const storiesInSprint = stories.filter((s) => isSprint(s.status)).length;
  const storiesDone = doneStories.length;

  const unestimated = stories.filter((s) => !s.storyPoints && !isDone(s.status)).length;
  const readyNoSprint = stories.filter((s) => s.status === 'READY' && !s.sprintId).length;
  const unassigned = stories.filter((s) => !s.assignee && !isDone(s.status)).length;

  const velocity = 0;
  const blocked = stories.filter((s) => (s.status as string) === 'BLOCKED').length;

  return {
    epicCount,
    featureCount,
    storyCount,
    taskCount,
    totalSp,
    completedSp,
    overallProgress,
    storiesBacklog,
    storiesInSprint,
    storiesDone,
    velocity,
    blocked,
    unestimated,
    readyNoSprint,
    unassigned,
  };
}

// ─── Preset-driven KPI card selection ────────────────────

function getKpiCards(preset: ViewModePreset, stats: BacklogStats): KpiCard[][] {
  switch (preset) {
    case 'EXEC_SUMMARY':
      return [[
        { label: 'Epics', value: stats.epicCount, icon: Layers, color: 'text-blue-600' },
        { label: 'Total SP', value: stats.totalSp, icon: Target, color: 'text-purple-600' },
        { label: 'Completed SP', value: stats.completedSp, icon: CheckCircle, color: 'text-green-600' },
        { label: 'Progress', value: `${stats.overallProgress}%`, icon: TrendingUp, color: 'text-indigo-600' },
      ]];

    case 'PMO_CONTROL':
      return [[
        { label: 'Epics', value: stats.epicCount, icon: Layers, color: 'text-blue-600' },
        {
          label: 'Stories',
          value: stats.storyCount,
          icon: ListTodo,
          color: 'text-gray-700',
          sub: `B:${stats.storiesBacklog} S:${stats.storiesInSprint} D:${stats.storiesDone}`,
        },
        { label: 'Velocity', value: stats.velocity, icon: Zap, color: 'text-orange-600', sub: 'SP/Sprint' },
        { label: 'Blocked', value: stats.blocked, icon: AlertTriangle, color: stats.blocked > 0 ? 'text-red-600' : 'text-gray-400' },
        { label: 'Unestimated', value: stats.unestimated, icon: HelpCircle, color: stats.unestimated > 0 ? 'text-amber-600' : 'text-gray-400' },
      ]];

    case 'PM_WORK':
      return [
        // Row 1: Counts
        [
          { label: 'Epics', value: stats.epicCount, icon: Layers, color: 'text-blue-600' },
          { label: 'Features', value: stats.featureCount, icon: BarChart3, color: 'text-teal-600' },
          { label: 'Stories', value: stats.storyCount, icon: ListTodo, color: 'text-indigo-600' },
          { label: 'Tasks', value: stats.taskCount, icon: CheckCircle, color: 'text-gray-600' },
        ],
        // Row 2: SP & Progress
        [
          { label: 'Total SP', value: stats.totalSp, icon: Target, color: 'text-purple-600' },
          { label: 'Velocity', value: stats.velocity, icon: Zap, color: 'text-orange-600', sub: 'SP/Sprint' },
          { label: 'Blocked', value: stats.blocked, icon: AlertTriangle, color: stats.blocked > 0 ? 'text-red-600' : 'text-gray-400' },
          { label: 'Unestimated', value: stats.unestimated, icon: HelpCircle, color: stats.unestimated > 0 ? 'text-amber-600' : 'text-gray-400' },
        ],
        // Row 3: Attention needed
        [
          { label: 'READY (no sprint)', value: stats.readyNoSprint, icon: Clock, color: stats.readyNoSprint > 0 ? 'text-yellow-600' : 'text-gray-400' },
          { label: 'Unassigned', value: stats.unassigned, icon: Users, color: stats.unassigned > 0 ? 'text-amber-600' : 'text-gray-400' },
        ],
      ];

    case 'DEV_EXECUTION':
      return [[
        { label: 'Stories', value: stats.storyCount, icon: ListTodo, color: 'text-blue-600' },
        { label: 'My Part SP', value: stats.totalSp, icon: Target, color: 'text-purple-600' },
      ]];

    case 'CUSTOMER_APPROVAL':
      return [[
        { label: 'Epics', value: stats.epicCount, icon: Layers, color: 'text-blue-600' },
        { label: 'Total SP', value: stats.totalSp, icon: Target, color: 'text-purple-600' },
        { label: 'Completed SP', value: stats.completedSp, icon: CheckCircle, color: 'text-green-600' },
      ]];

    default:
      return [[
        { label: 'Epics', value: stats.epicCount, icon: Layers, color: 'text-blue-600' },
        { label: 'Total SP', value: stats.totalSp, icon: Target, color: 'text-purple-600' },
      ]];
  }
}

// ─── Component ───────────────────────────────────────────

interface BacklogKpiRowProps {
  epics: Epic[];
  stories: UserStory[];
  preset: ViewModePreset;
}

export function BacklogKpiRow({ epics, stories, preset }: BacklogKpiRowProps) {
  const stats = useMemo(() => computeStats(epics, stories), [epics, stories]);
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
