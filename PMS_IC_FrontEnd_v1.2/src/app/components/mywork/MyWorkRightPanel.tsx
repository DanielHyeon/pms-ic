import { useState } from 'react';
import {
  X,
  Clock,
  FileText,
  MessageSquare,
  ArrowUpRight,
  ChevronDown,
  CheckCircle,
  AlertTriangle,
  Ban,
} from 'lucide-react';
import { getPriorityColor } from '../../../constants/statusMaps';
import type { MyWorkTask } from './MyWorkTaskCard';

// ── Types ──────────────────────────────────────────────────

export type MyWorkPanelMode = 'none' | 'task-detail' | 'issue-detail' | 'time-log';

interface MyWorkRightPanelProps {
  mode: MyWorkPanelMode;
  taskData?: MyWorkTask;
  onClose: () => void;
  canEdit: boolean;
}

// ── Status / Priority helpers ──────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  TODO: 'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  IN_REVIEW: 'bg-purple-100 text-purple-700',
  DONE: 'bg-green-100 text-green-700',
  BLOCKED: 'bg-red-100 text-red-700',
};

// ── Sub-panels ─────────────────────────────────────────────

function TaskDetailPanel({ task, canEdit: _canEdit }: { task: MyWorkTask; canEdit: boolean }) {
  // TODO: Replace with real API - mock time log entries
  const mockTimeLogs = [
    { date: '2026-02-07', hours: 2.0, note: 'Initial implementation' },
    { date: '2026-02-08', hours: 1.5, note: 'Code review feedback' },
  ];

  // TODO: Replace with real API - mock comments
  const mockComments = [
    { author: 'Alice Kim', date: '2026-02-07 14:30', text: 'Updated the API contract per discussion.' },
    { author: 'Bob Park', date: '2026-02-08 09:15', text: 'LGTM - ready for review.' },
  ];

  return (
    <div className="space-y-5">
      {/* Task header */}
      <div>
        <span className="text-xs font-mono text-gray-400">{task.id}</span>
        <h3 className="text-lg font-semibold text-gray-900 mt-1">{task.title}</h3>
      </div>

      {/* Status + Priority */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-500 mb-1">Status</p>
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[task.status] || 'bg-gray-100 text-gray-700'}`}>
            {task.status}
          </span>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Priority</p>
          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
            {task.priority}
          </span>
        </div>
      </div>

      {/* Sprint + Due date */}
      <div className="grid grid-cols-2 gap-3">
        {task.sprintName && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Sprint</p>
            <p className="text-sm text-gray-700">{task.sprintName}</p>
          </div>
        )}
        {task.dueDate && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Due Date</p>
            <p className={`text-sm ${task.isOverdue ? 'text-red-600 font-medium' : 'text-gray-700'}`}>
              {task.dueDate}
              {task.isOverdue && task.daysRemaining !== undefined && (
                <span className="text-xs ml-1">({Math.abs(task.daysRemaining)}d overdue)</span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Hours */}
      <div>
        <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
          <Clock size={12} />
          Hours (Actual / Estimated)
        </p>
        <p className="text-sm text-gray-700">
          {task.actualHours ?? 0}h / {task.estimatedHours ?? 0}h
        </p>
        {task.estimatedHours && task.estimatedHours > 0 && (
          <div className="mt-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${Math.min(100, ((task.actualHours ?? 0) / task.estimatedHours) * 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Story context */}
      {task.storyTitle && (
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            <FileText size={12} />
            Story Context
          </p>
          <p className="text-sm text-gray-700 font-medium">{task.storyId} - {task.storyTitle}</p>
        </div>
      )}

      {/* Blocked indicator */}
      {task.isBlocked && task.linkedIssueId && (
        <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 rounded-lg text-sm text-orange-700">
          <Ban size={14} />
          <span>Blocked by {task.linkedIssueId}: {task.linkedIssueTitle}</span>
        </div>
      )}

      {/* Overdue indicator */}
      {task.isOverdue && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg text-sm text-red-700">
          <AlertTriangle size={14} />
          <span>This task is overdue by {Math.abs(task.daysRemaining ?? 0)} days</span>
        </div>
      )}

      {/* Time log summary table */}
      <div>
        <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
          <Clock size={12} />
          Time Log
        </p>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-1 text-gray-500 font-medium">Date</th>
              <th className="text-right py-1 text-gray-500 font-medium">Hours</th>
              <th className="text-left py-1 pl-3 text-gray-500 font-medium">Note</th>
            </tr>
          </thead>
          <tbody>
            {mockTimeLogs.map((log, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-1.5 text-gray-700">{log.date}</td>
                <td className="py-1.5 text-right text-gray-700">{log.hours}h</td>
                <td className="py-1.5 pl-3 text-gray-500">{log.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Comments */}
      <div>
        <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
          <MessageSquare size={12} />
          Comments
        </p>
        <div className="space-y-2">
          {mockComments.map((comment, i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-700">{comment.author}</span>
                <span className="text-xs text-gray-400">{comment.date}</span>
              </div>
              <p className="text-xs text-gray-600">{comment.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
        <button className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 rounded transition-colors">
          <Clock size={12} />
          Log Hours
        </button>
        <button className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-50 text-gray-600 hover:bg-gray-100 rounded transition-colors">
          <ArrowUpRight size={12} />
          View in Kanban
        </button>
      </div>
    </div>
  );
}

function IssueDetailPanel() {
  // TODO: Replace with real API - implement issue detail view
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <AlertTriangle size={16} className="text-orange-600" />
        Issue Detail
      </h3>
      <div className="flex items-center justify-center h-32 text-sm text-gray-400 border border-dashed border-gray-300 rounded-lg">
        Select an issue to view details
      </div>
    </div>
  );
}

function TimeLogPanel() {
  const [date, setDate] = useState('');
  const [hours, setHours] = useState('');
  const [note, setNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Replace with real API - submit time log
    setDate('');
    setHours('');
    setNote('');
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <Clock size={16} className="text-blue-600" />
        Log Time
      </h3>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Hours</label>
          <input
            type="number"
            step="0.5"
            min="0"
            max="24"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="e.g. 2.5"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Note</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What did you work on?"
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <button
          type="submit"
          className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <CheckCircle size={14} />
          Submit Time Log
        </button>
      </form>
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────

export function MyWorkRightPanel({ mode, taskData, onClose, canEdit }: MyWorkRightPanelProps) {
  if (mode === 'none') return null;

  const renderContent = () => {
    switch (mode) {
      case 'task-detail':
        return taskData ? (
          <TaskDetailPanel task={taskData} canEdit={canEdit} />
        ) : (
          <div className="flex items-center justify-center h-32 text-sm text-gray-400">
            No task selected
          </div>
        );
      case 'issue-detail':
        return <IssueDetailPanel />;
      case 'time-log':
        return <TimeLogPanel />;
      default:
        return null;
    }
  };

  return (
    <div className="w-[380px] border-l border-gray-200 bg-white flex flex-col h-full shrink-0">
      {/* Panel header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-700">
          {mode === 'task-detail' && 'Task Detail'}
          {mode === 'issue-detail' && 'Issue Detail'}
          {mode === 'time-log' && 'Log Time'}
        </h2>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          aria-label="Close panel"
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">{renderContent()}</div>
    </div>
  );
}
