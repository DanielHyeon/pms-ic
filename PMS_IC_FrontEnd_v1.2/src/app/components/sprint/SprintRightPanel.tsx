import { useState } from 'react';
import {
  X,
  Calendar,
  Target,
  Activity,
  BarChart3,
  TrendingUp,
  CheckCircle,
  MessageSquare,
  ThumbsUp,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import type { ViewModePreset } from '../../../types/menuOntology';
import type { Sprint } from '../../../types/backlog';
import { SprintBurndownChart } from './SprintBurndownChart';
import { SprintVelocityChart } from './SprintVelocityChart';

// ── Types ──────────────────────────────────────────────────

export type SprintPanelMode =
  | 'none'
  | 'sprint-summary'
  | 'story-detail'
  | 'burndown'
  | 'velocity'
  | 'planning'
  | 'retrospective';

export interface SprintRightPanelProps {
  mode: SprintPanelMode;
  sprint?: Sprint;
  sprints?: Sprint[]; // All sprints for velocity chart
  preset: ViewModePreset;
  onClose: () => void;
  onModeChange: (mode: SprintPanelMode) => void;
}

// ── Helper ─────────────────────────────────────────────────

function getDaysRemaining(endDate: string): number {
  const end = new Date(endDate);
  const today = new Date();
  return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function computeProgress(sprint: Sprint): number {
  if (!sprint.plannedPoints || sprint.plannedPoints === 0) return 0;
  return Math.round(((sprint.velocity || 0) / sprint.plannedPoints) * 100);
}

// ── Sub-panels ─────────────────────────────────────────────

function SprintSummaryPanel({ sprint }: { sprint: Sprint }) {
  const progress = computeProgress(sprint);
  const daysLeft = getDaysRemaining(sprint.endDate);

  return (
    <div className="space-y-5">
      {/* Sprint name and status */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{sprint.name}</h3>
        <span
          className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
            sprint.status === 'ACTIVE'
              ? 'bg-blue-100 text-blue-700'
              : sprint.status === 'PLANNING'
                ? 'bg-yellow-100 text-yellow-700'
                : sprint.status === 'COMPLETED'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700'
          }`}
        >
          {sprint.status}
        </span>
      </div>

      {/* Goal */}
      {sprint.goal && (
        <div>
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            <Target size={12} />
            Sprint Goal
          </p>
          <p className="text-sm text-gray-700">{sprint.goal}</p>
        </div>
      )}

      {/* Dates */}
      <div>
        <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
          <Calendar size={12} />
          Duration
        </p>
        <p className="text-sm text-gray-700">
          {sprint.startDate} ~ {sprint.endDate}
        </p>
        {sprint.status === 'ACTIVE' && (
          <p className="text-sm font-medium text-indigo-600 mt-1">
            {daysLeft > 0 ? `D-${daysLeft}` : daysLeft === 0 ? 'Due today' : `${Math.abs(daysLeft)} days overdue`}
          </p>
        )}
      </div>

      {/* Progress */}
      <div>
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-500">Progress</span>
          <span className="font-medium text-gray-700">
            {sprint.velocity || 0} / {sprint.plannedPoints || 0} SP
          </span>
        </div>
        <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1 text-right">{progress}%</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-blue-600">{sprint.velocity || 0}</p>
          <p className="text-xs text-gray-500">Points Done</p>
        </div>
        <div className="bg-indigo-50 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-indigo-600">
            {(sprint.plannedPoints || 0) - (sprint.velocity || 0)}
          </p>
          <p className="text-xs text-gray-500">Remaining</p>
        </div>
      </div>
    </div>
  );
}

function BurndownPanel({ sprint }: { sprint: Sprint }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <TrendingUp size={16} className="text-blue-600" />
        Burndown Chart
      </h3>
      <SprintBurndownChart sprint={sprint} compact />

      {/* Stats sidebar */}
      <div className="space-y-2 border-t pt-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Total SP</span>
          <span className="font-medium">{sprint.plannedPoints || 0}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Completed</span>
          <span className="font-medium text-green-600">{sprint.velocity || 0}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Remaining</span>
          <span className="font-medium text-red-600">
            {Math.max(0, (sprint.plannedPoints || 0) - (sprint.velocity || 0))}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Days Left</span>
          <span className="font-medium">{Math.max(0, getDaysRemaining(sprint.endDate))}</span>
        </div>
      </div>
    </div>
  );
}

function VelocityPanel({ sprints }: { sprints: Sprint[] }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <BarChart3 size={16} className="text-green-600" />
        Velocity Trend
      </h3>
      <SprintVelocityChart sprints={sprints} compact />

      {/* Summary */}
      <div className="space-y-2 border-t pt-3">
        {(() => {
          const completed = sprints.filter((s) => s.status === 'COMPLETED');
          const avgVelocity =
            completed.length > 0
              ? Math.round(
                  completed.reduce((sum, s) => sum + (s.velocity || 0), 0) /
                    completed.length
                )
              : 0;
          return (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Sprints completed</span>
                <span className="font-medium">{completed.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Avg velocity</span>
                <span className="font-medium text-green-600">{avgVelocity} SP</span>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}

function StoryDetailPanel() {
  // TODO: Wire to actual story data when API is available
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <CheckCircle size={16} className="text-purple-600" />
        Story Detail
      </h3>
      <div className="flex items-center justify-center h-32 text-sm text-gray-400 border border-dashed border-gray-300 rounded-lg">
        Select a story to view details
      </div>
    </div>
  );
}

function PlanningPanel({ sprint }: { sprint: Sprint }) {
  // TODO: Implement sprint planning workflow
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <Zap size={16} className="text-yellow-600" />
        Sprint Planning
      </h3>
      <div className="bg-yellow-50 rounded-lg p-4 text-sm text-yellow-700">
        <p className="font-medium mb-1">Planning Mode</p>
        <p>
          Drag stories from the backlog into {sprint.name} to plan the sprint scope.
        </p>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Capacity</span>
          <span className="font-medium">{sprint.plannedPoints || 0} SP</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Status</span>
          <span className="font-medium">{sprint.status}</span>
        </div>
      </div>
    </div>
  );
}

function RetrospectivePanel({ sprint }: { sprint: Sprint }) {
  // TODO: Replace with real retrospective data from API
  const [wentWell] = useState<string[]>([
    'Team collaboration was strong',
    'All critical stories completed on time',
  ]);
  const [couldImprove] = useState<string[]>([
    'Code review turnaround time',
    'Story estimation accuracy',
  ]);
  const [actionItems] = useState<string[]>([
    'Introduce pair review sessions',
    'Use planning poker for estimation',
  ]);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <MessageSquare size={16} className="text-teal-600" />
        Retrospective: {sprint.name}
      </h3>

      {/* Went well */}
      <div>
        <p className="text-xs font-medium text-green-700 flex items-center gap-1 mb-2">
          <ThumbsUp size={12} />
          What went well
        </p>
        <ul className="space-y-1">
          {wentWell.map((item, i) => (
            <li
              key={i}
              className="text-sm text-gray-700 bg-green-50 rounded px-3 py-2"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Could improve */}
      <div>
        <p className="text-xs font-medium text-amber-700 flex items-center gap-1 mb-2">
          <AlertTriangle size={12} />
          Could improve
        </p>
        <ul className="space-y-1">
          {couldImprove.map((item, i) => (
            <li
              key={i}
              className="text-sm text-gray-700 bg-amber-50 rounded px-3 py-2"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Action items */}
      <div>
        <p className="text-xs font-medium text-blue-700 flex items-center gap-1 mb-2">
          <Activity size={12} />
          Action items
        </p>
        <ul className="space-y-1">
          {actionItems.map((item, i) => (
            <li
              key={i}
              className="text-sm text-gray-700 bg-blue-50 rounded px-3 py-2 flex items-start gap-2"
            >
              <CheckCircle size={14} className="text-blue-400 mt-0.5 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────

export function SprintRightPanel({
  mode,
  sprint,
  sprints = [],
  preset: _preset,
  onClose,
  onModeChange,
}: SprintRightPanelProps) {
  if (mode === 'none') return null;

  // Navigation tabs in the panel header
  const tabs: { mode: SprintPanelMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'sprint-summary', label: 'Summary', icon: <Target size={14} /> },
    { mode: 'burndown', label: 'Burndown', icon: <TrendingUp size={14} /> },
    { mode: 'velocity', label: 'Velocity', icon: <BarChart3 size={14} /> },
    { mode: 'retrospective', label: 'Retro', icon: <MessageSquare size={14} /> },
  ];

  const renderContent = () => {
    if (!sprint && mode !== 'velocity') {
      return (
        <div className="flex items-center justify-center h-32 text-sm text-gray-400">
          No sprint selected
        </div>
      );
    }

    switch (mode) {
      case 'sprint-summary':
        return <SprintSummaryPanel sprint={sprint!} />;
      case 'burndown':
        return <BurndownPanel sprint={sprint!} />;
      case 'velocity':
        return <VelocityPanel sprints={sprints} />;
      case 'story-detail':
        return <StoryDetailPanel />;
      case 'planning':
        return <PlanningPanel sprint={sprint!} />;
      case 'retrospective':
        return <RetrospectivePanel sprint={sprint!} />;
      default:
        return null;
    }
  };

  return (
    <div className="w-80 border-l border-gray-200 bg-white flex flex-col h-full shrink-0">
      {/* Panel header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-700">Sprint Details</h2>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          aria-label="Close panel"
        >
          <X size={16} />
        </button>
      </div>

      {/* Tab navigation */}
      <div className="flex border-b border-gray-200 px-2">
        {tabs.map((tab) => (
          <button
            key={tab.mode}
            onClick={() => onModeChange(tab.mode)}
            className={`flex items-center gap-1 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              mode === tab.mode
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">{renderContent()}</div>
    </div>
  );
}
