import { Clock, MessageSquare, ArrowUpRight, AlertTriangle, Ban } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────

export interface MyWorkTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  storyTitle?: string;
  storyId?: string;
  sprintName?: string;
  estimatedHours?: number;
  actualHours?: number;
  dueDate?: string;
  daysRemaining?: number;
  isOverdue?: boolean;
  isBlocked?: boolean;
  linkedIssueId?: string;
  linkedIssueTitle?: string;
}

interface MyWorkTaskCardProps {
  task: MyWorkTask;
  onSelect: () => void;
  onStatusChange?: (newStatus: string) => void;
  canEdit: boolean;
}

// ── Helpers ────────────────────────────────────────────────

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 border-red-300',
  HIGH: 'bg-orange-100 text-orange-700 border-orange-300',
  MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  LOW: 'bg-gray-100 text-gray-600 border-gray-300',
};

const STATUS_OPTIONS = [
  { value: 'TODO', label: 'TODO' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'DONE', label: 'Done' },
  { value: 'BLOCKED', label: 'Blocked' },
];

function formatDueDate(dueDate: string, daysRemaining?: number, isOverdue?: boolean): string {
  if (isOverdue && daysRemaining !== undefined) {
    return `${Math.abs(daysRemaining)}d overdue`;
  }
  if (daysRemaining !== undefined && daysRemaining === 0) {
    return 'Due today';
  }
  if (daysRemaining !== undefined && daysRemaining > 0) {
    return `D-${daysRemaining}`;
  }
  return dueDate;
}

// ── Component ──────────────────────────────────────────────

export function MyWorkTaskCard({ task, onSelect, onStatusChange, canEdit }: MyWorkTaskCardProps) {
  const priorityColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.LOW;

  return (
    <div
      className={`group bg-white rounded-lg border-2 p-4 transition-all hover:shadow-md cursor-pointer ${
        task.isOverdue ? 'border-l-red-500 border-l-4' : task.isBlocked ? 'border-l-orange-500 border-l-4' : 'border-gray-200'
      }`}
      onClick={(e) => {
        // Prevent card click when interacting with controls
        if ((e.target as HTMLElement).closest('select, button')) return;
        onSelect();
      }}
    >
      {/* Task ID + Title */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-400">{task.id}</span>
            {task.isOverdue && (
              <AlertTriangle size={14} className="text-red-500 shrink-0" />
            )}
            {task.isBlocked && (
              <Ban size={14} className="text-orange-500 shrink-0" />
            )}
          </div>
          <h4 className="font-medium text-gray-900 text-sm mt-0.5 truncate">{task.title}</h4>
        </div>
      </div>

      {/* Story context */}
      {task.storyTitle && (
        <p className="text-xs text-gray-400 mb-2 truncate">
          Story: {task.storyId} {task.storyTitle}
        </p>
      )}

      {/* Blocked indicator */}
      {task.isBlocked && task.linkedIssueId && (
        <div className="flex items-center gap-1 mb-2 px-2 py-1 bg-orange-50 rounded text-xs text-orange-700">
          <Ban size={12} />
          <span>Blocked by {task.linkedIssueId}: {task.linkedIssueTitle}</span>
        </div>
      )}

      {/* Badges row: Sprint, Priority, Due */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        {task.sprintName && (
          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-xs border border-indigo-200">
            {task.sprintName}
          </span>
        )}
        <span className={`px-2 py-0.5 rounded text-xs border ${priorityColor}`}>
          {task.priority}
        </span>
        {task.dueDate && (
          <span
            className={`px-2 py-0.5 rounded text-xs border ${
              task.isOverdue
                ? 'bg-red-50 text-red-700 border-red-300'
                : 'bg-gray-50 text-gray-600 border-gray-300'
            }`}
          >
            {formatDueDate(task.dueDate, task.daysRemaining, task.isOverdue)}
          </span>
        )}
      </div>

      {/* Status dropdown + Hours */}
      <div className="flex items-center justify-between">
        {/* Status */}
        {canEdit && onStatusChange ? (
          <select
            value={task.status}
            onChange={(e) => {
              e.stopPropagation();
              onStatusChange(e.target.value);
            }}
            className="text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
            {task.status}
          </span>
        )}

        {/* Estimated vs Actual */}
        {(task.estimatedHours !== undefined || task.actualHours !== undefined) && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock size={12} />
            <span>
              {task.actualHours ?? 0}h / {task.estimatedHours ?? 0}h
            </span>
          </div>
        )}
      </div>

      {/* Quick action buttons - visible on hover */}
      <div className="flex items-center gap-1 mt-3 pt-2 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            // TODO: Replace with real API - open time log panel
          }}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
        >
          <Clock size={12} />
          Log Hours
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            // TODO: Replace with real API - open comment panel
          }}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
        >
          <MessageSquare size={12} />
          Comment
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            // TODO: Replace with real API - navigate to kanban
          }}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
        >
          <ArrowUpRight size={12} />
          Kanban
        </button>
      </div>
    </div>
  );
}
