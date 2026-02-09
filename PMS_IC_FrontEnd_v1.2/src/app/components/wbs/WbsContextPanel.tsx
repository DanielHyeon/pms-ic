import {
  X,
  Calendar,
  Users,
  TrendingDown,
  TrendingUp,
  CheckCircle,
  Clock,
  Link2,
  BarChart3,
  Layers,
  ListTodo,
  Lightbulb,
  Target,
  Activity,
} from 'lucide-react';
import { Badge } from '../ui/badge';
import type { WbsGroupWithItems, WbsItemWithTasks, PhaseWithWbs } from '../../../types/wbs';
import { getWbsStatusColor, getWbsStatusLabel, calculateWeightedProgress } from '../../../types/wbs';
import type { ViewModePreset } from '../../../types/menuOntology';
import StatusBadge from '../common/StatusBadge';

// ─── Types ──────────────────────────────────────────────

export type WbsPanelMode = 'none' | 'context' | 'detail' | 'analysis';

// ─── Progress bar helper ────────────────────────────────

function ProgressBar({
  planned,
  actual,
  label,
}: {
  planned?: number;
  actual: number;
  label?: string;
}) {
  return (
    <div>
      {label && (
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>{label}</span>
          <span className="font-medium">{actual}%</span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2 relative">
        {planned !== undefined && planned > 0 && (
          <div
            className="absolute bg-gray-300 h-2 rounded-full"
            style={{ width: `${Math.min(planned, 100)}%` }}
          />
        )}
        <div
          className="relative bg-blue-600 h-2 rounded-full transition-all"
          style={{ width: `${Math.min(actual, 100)}%` }}
        />
      </div>
      {planned !== undefined && (
        <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
          <span>Planned: {planned}%</span>
          <span>
            Deviation: {actual - planned > 0 ? '+' : ''}{actual - planned}%
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Group Context View ─────────────────────────────────

function GroupContext({ group, phase }: { group: WbsGroupWithItems; phase?: PhaseWithWbs | null }) {
  const itemCount = group.items?.length || 0;
  const completedItems = group.items?.filter((i) => i.status === 'COMPLETED').length || 0;
  const taskCount = group.items?.reduce((sum, i) => sum + (i.tasks?.length || 0), 0) || 0;
  const completedTasks = group.items?.reduce(
    (sum, i) => sum + (i.tasks?.filter((t) => t.status === 'COMPLETED').length || 0),
    0,
  ) || 0;

  const progress = group.calculatedProgress || group.progress || 0;

  // TODO: Replace with real EVM data
  const sv = -1.5;
  const cv = 0.8;

  const suggestedActions = [
    { label: '+ Item', description: 'Add a new WBS Item' },
    { label: 'View in Gantt', description: 'Open Gantt chart for this group' },
    { label: 'Backlog Link', description: 'Link to backlog epic' },
  ];

  return (
    <div className="p-4 space-y-5">
      {/* Group name and badges */}
      <div>
        <div className="text-[10px] text-gray-400 font-mono mb-1">{group.code}</div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2">{group.name}</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={group.status} className={getWbsStatusColor(group.status as any)} label={getWbsStatusLabel(group.status as any)} />
          {group.linkedEpicId && (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700 flex items-center gap-1">
              <Link2 className="h-3 w-3" />
              Epic Linked
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <ProgressBar actual={progress} label="Progress" />

      {/* Date range */}
      {(group.plannedStartDate || group.plannedEndDate) && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Calendar className="h-3.5 w-3.5" />
          <span>
            {group.plannedStartDate
              ? new Date(group.plannedStartDate).toLocaleDateString()
              : '?'}{' '}
            ~{' '}
            {group.plannedEndDate
              ? new Date(group.plannedEndDate).toLocaleDateString()
              : '?'}
          </span>
        </div>
      )}

      {/* Item/Task counts */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <ListTodo className="h-3.5 w-3.5 text-gray-500" />
          <span className="text-xs font-medium text-gray-700">Summary</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <div className="text-sm font-bold text-gray-900">{itemCount}</div>
            <div className="text-[10px] text-gray-500">Items</div>
          </div>
          <div className="bg-green-50 rounded-lg p-2 text-center">
            <div className="text-sm font-bold text-green-600">{completedItems}</div>
            <div className="text-[10px] text-gray-500">Completed</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-2 text-center">
            <div className="text-sm font-bold text-blue-600">{taskCount}</div>
            <div className="text-[10px] text-gray-500">Tasks</div>
          </div>
          <div className="bg-green-50 rounded-lg p-2 text-center">
            <div className="text-sm font-bold text-green-600">{completedTasks}</div>
            <div className="text-[10px] text-gray-500">Tasks Done</div>
          </div>
        </div>
      </div>

      {/* SV / CV indicators */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <BarChart3 className="h-3.5 w-3.5 text-gray-500" />
          <span className="text-xs font-medium text-gray-700">EVM Indicators</span>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Schedule Variance (SV)</span>
            <span className={`font-medium ${sv >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {sv > 0 ? '+' : ''}{sv}d
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Cost Variance (CV)</span>
            <span className={`font-medium ${cv >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {cv > 0 ? '+' : ''}{cv}%
            </span>
          </div>
          <div className="text-[10px] text-gray-400">TODO: Replace with real EVM data</div>
        </div>
      </div>

      {/* Suggested actions */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-xs font-medium text-gray-700">Quick Actions</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {suggestedActions.map((action) => (
            <button
              key={action.label}
              className="px-2.5 py-1 text-[11px] bg-blue-50 text-blue-700 rounded-md border border-blue-200 hover:bg-blue-100 transition-colors"
              title={action.description}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Item Detail View ───────────────────────────────────

function ItemDetail({ item }: { item: WbsItemWithTasks }) {
  const progress = item.calculatedProgress || item.progress || 0;
  const taskCount = item.tasks?.length || 0;
  const completedTasks = item.tasks?.filter((t) => t.status === 'COMPLETED').length || 0;

  // TODO: Replace with real EVM data
  const sv = -0.5;

  const suggestedActions = [
    { label: 'Update Progress', description: 'Update item progress' },
    { label: 'Add Task', description: 'Add a new task under this item' },
    { label: 'View History', description: 'View change history' },
  ];

  return (
    <div className="p-4 space-y-5">
      {/* Item header */}
      <div>
        <div className="text-[10px] text-gray-400 font-mono mb-1">{item.code}</div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2">{item.name}</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={item.status} className={getWbsStatusColor(item.status as any)} label={getWbsStatusLabel(item.status as any)} />
          {item.weight > 0 && (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
              Weight: {item.weight}%
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {item.description && (
        <div>
          <span className="text-xs font-medium text-gray-700 block mb-1">Description</span>
          <p className="text-xs text-gray-600 leading-relaxed">{item.description}</p>
        </div>
      )}

      {/* Assignee */}
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <Users className="h-3.5 w-3.5 text-gray-500" />
          <span className="text-xs font-medium text-gray-700">Assignee</span>
        </div>
        <p className="text-xs text-gray-600">
          {item.assigneeName || 'Unassigned'}
        </p>
      </div>

      {/* Schedule */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Calendar className="h-3.5 w-3.5 text-gray-500" />
          <span className="text-xs font-medium text-gray-700">Schedule</span>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Planned</span>
            <span className="font-medium text-gray-900">
              {item.plannedStartDate
                ? new Date(item.plannedStartDate).toLocaleDateString()
                : '?'}{' '}
              ~{' '}
              {item.plannedEndDate
                ? new Date(item.plannedEndDate).toLocaleDateString()
                : '?'}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Actual</span>
            <span className="font-medium text-gray-900">
              {item.actualStartDate
                ? new Date(item.actualStartDate).toLocaleDateString()
                : '-'}{' '}
              ~{' '}
              {item.actualEndDate
                ? new Date(item.actualEndDate).toLocaleDateString()
                : '-'}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">SV</span>
            <span className={`font-medium ${sv >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {sv > 0 ? '+' : ''}{sv}d
            </span>
          </div>
          <div className="text-[10px] text-gray-400">TODO: Replace with real EVM data</div>
        </div>
      </div>

      {/* Progress */}
      <ProgressBar actual={progress} label="Progress" />

      {/* Hours */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Clock className="h-3.5 w-3.5 text-gray-500" />
          <span className="text-xs font-medium text-gray-700">Hours</span>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Estimated</span>
            <span className="font-medium text-gray-900">{item.estimatedHours ?? '-'}h</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Actual</span>
            <span className="font-medium text-gray-900">{item.actualHours ?? '-'}h</span>
          </div>
          {item.estimatedHours != null && item.actualHours != null && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">CV</span>
              <span
                className={`font-medium ${
                  item.actualHours <= item.estimatedHours ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {item.actualHours <= item.estimatedHours ? '' : '+'}
                {item.actualHours - item.estimatedHours}h
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Child tasks list */}
      {taskCount > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <CheckCircle className="h-3.5 w-3.5 text-gray-500" />
            <span className="text-xs font-medium text-gray-700">
              Tasks ({completedTasks}/{taskCount})
            </span>
          </div>
          <div className="space-y-1">
            {item.tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between text-[11px] bg-gray-50 rounded px-2 py-1.5"
              >
                <span className="text-gray-700 truncate flex-1">{task.name}</span>
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-gray-400">{task.progress}%</span>
                  <StatusBadge status={task.status} className={getWbsStatusColor(task.status as any)} label={getWbsStatusLabel(task.status as any)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Linked stories (mock) */}
      <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
        <span className="flex items-center gap-1.5">
          <Link2 className="h-3 w-3" />
          Linked Stories
        </span>
        <Badge variant="secondary" className="text-[10px]">
          {item.linkedStoryIds?.length || 0}
        </Badge>
      </div>

      {/* Suggested actions */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-xs font-medium text-gray-700">Quick Actions</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {suggestedActions.map((action) => (
            <button
              key={action.label}
              className="px-2.5 py-1 text-[11px] bg-blue-50 text-blue-700 rounded-md border border-blue-200 hover:bg-blue-100 transition-colors"
              title={action.description}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Phase Context View ─────────────────────────────────

function PhaseContext({ phase }: { phase: PhaseWithWbs }) {
  const progress = phase.calculatedProgress || phase.progress || 0;
  const groupCount = phase.groups?.length || 0;
  const completedGroups = phase.groups?.filter((g) => g.status === 'COMPLETED').length || 0;

  return (
    <div className="p-4 space-y-5">
      {/* Phase name and badges */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2">{phase.name}</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={phase.status} className={getWbsStatusColor(phase.status as any)} label={getWbsStatusLabel(phase.status as any)} />
        </div>
      </div>

      {/* Progress */}
      <ProgressBar actual={progress} label="Progress" />

      {/* Date range */}
      {(phase.startDate || phase.endDate) && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Calendar className="h-3.5 w-3.5" />
          <span>
            {phase.startDate ? new Date(phase.startDate).toLocaleDateString() : '?'}
            {' ~ '}
            {phase.endDate ? new Date(phase.endDate).toLocaleDateString() : '?'}
          </span>
        </div>
      )}

      {/* Summary */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Target className="h-3.5 w-3.5 text-gray-500" />
          <span className="text-xs font-medium text-gray-700">Summary</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <div className="text-sm font-bold text-gray-900">{groupCount}</div>
            <div className="text-[10px] text-gray-500">Groups</div>
          </div>
          <div className="bg-green-50 rounded-lg p-2 text-center">
            <div className="text-sm font-bold text-green-600">{completedGroups}</div>
            <div className="text-[10px] text-gray-500">Completed</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-2 text-center">
            <div className="text-sm font-bold text-blue-600">{phase.totalGroups || 0}</div>
            <div className="text-[10px] text-gray-500">Total Groups</div>
          </div>
          <div className="bg-green-50 rounded-lg p-2 text-center">
            <div className="text-sm font-bold text-green-600">{phase.completedGroups || 0}</div>
            <div className="text-[10px] text-gray-500">Done Groups</div>
          </div>
        </div>
      </div>

      {/* Child phases */}
      {phase.childPhases && phase.childPhases.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Layers className="h-3.5 w-3.5 text-gray-500" />
            <span className="text-xs font-medium text-gray-700">Child Phases</span>
          </div>
          <div className="space-y-1">
            {phase.childPhases.map((child) => (
              <div
                key={child.id}
                className="flex items-center justify-between text-[11px] bg-gray-50 rounded px-2 py-1.5"
              >
                <span className="text-gray-700 truncate flex-1">{child.name}</span>
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-gray-400">
                    {child.calculatedProgress || child.progress || 0}%
                  </span>
                  <StatusBadge status={child.status} className={getWbsStatusColor(child.status as any)} label={getWbsStatusLabel(child.status as any)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      {phase.description && (
        <div>
          <span className="text-xs font-medium text-gray-700 block mb-1">Description</span>
          <p className="text-xs text-gray-600 leading-relaxed">{phase.description}</p>
        </div>
      )}
    </div>
  );
}

// ─── Analysis placeholder ───────────────────────────────

function AnalysisPlaceholder() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-gray-400" />
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          Analysis
        </span>
      </div>
      <div className="space-y-3">
        {['Deviation Analysis', 'Backlog Link Map', 'Gantt Detail'].map((tab) => (
          <div
            key={tab}
            className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center"
          >
            <p className="text-xs text-gray-500">{tab}</p>
            <p className="text-[10px] text-gray-400 mt-1">Coming soon</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Context Panel ──────────────────────────────────

interface WbsContextPanelProps {
  panelMode: WbsPanelMode;
  selectedGroup?: WbsGroupWithItems | null;
  selectedItem?: WbsItemWithTasks | null;
  selectedPhase?: PhaseWithWbs | null;
  preset: ViewModePreset;
  onClose: () => void;
}

export function WbsContextPanel({
  panelMode,
  selectedGroup,
  selectedItem,
  selectedPhase,
  preset,
  onClose,
}: WbsContextPanelProps) {
  const panelTitle =
    panelMode === 'detail'
      ? 'Item Detail'
      : panelMode === 'analysis'
        ? 'Analysis'
        : selectedGroup
          ? 'Group Detail'
          : 'Phase Detail';

  const panelIcon =
    panelMode === 'detail' ? (
      <ListTodo className="h-3.5 w-3.5" />
    ) : panelMode === 'analysis' ? (
      <Activity className="h-3.5 w-3.5" />
    ) : selectedGroup ? (
      <Layers className="h-3.5 w-3.5" />
    ) : (
      <Target className="h-3.5 w-3.5" />
    );

  return (
    <div className="w-[320px] flex-shrink-0 border-l border-gray-200 bg-white overflow-y-auto rounded-r-xl">
      {/* Panel header with close button */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
          {panelIcon}
          {panelTitle}
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Panel content */}
      {panelMode === 'detail' && selectedItem ? (
        <ItemDetail item={selectedItem} />
      ) : panelMode === 'analysis' ? (
        <AnalysisPlaceholder />
      ) : panelMode === 'context' && selectedGroup ? (
        <GroupContext group={selectedGroup} phase={selectedPhase} />
      ) : panelMode === 'context' && selectedPhase ? (
        <PhaseContext phase={selectedPhase} />
      ) : null}
    </div>
  );
}
