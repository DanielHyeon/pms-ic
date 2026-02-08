import { useState } from 'react';
import {
  X,
  AlertTriangle,
  Bug,
  Shield,
  Clock,
  ArrowUpRight,
  MessageSquare,
  Target,
  CheckCircle,
  AlertCircle,
  Users,
  TrendingUp,
} from 'lucide-react';
import type { ViewModePreset } from '../../../types/menuOntology';

// ── Types ──────────────────────────────────────────────────

export type IssuePanelMode =
  | 'none'
  | 'issue-detail'
  | 'context'
  | 'escalation'
  | 'resolution'
  | 'comments';

export interface IssueRightPanelProps {
  mode: IssuePanelMode;
  issue?: any;
  preset: ViewModePreset;
  onClose: () => void;
  onModeChange: (mode: IssuePanelMode) => void;
  canEdit: boolean;
}

// ── Styling helpers ────────────────────────────────────────

const TYPE_BADGE: Record<string, string> = {
  BUG: 'bg-red-100 text-red-700',
  BLOCKER: 'bg-purple-100 text-purple-700',
  CHANGE_REQUEST: 'bg-blue-100 text-blue-700',
  QUESTION: 'bg-teal-100 text-teal-700',
  IMPROVEMENT: 'bg-green-100 text-green-700',
  RISK: 'bg-orange-100 text-orange-700',
  OTHER: 'bg-gray-100 text-gray-700',
};

const SEVERITY_BADGE: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 border-red-300',
  HIGH: 'bg-orange-100 text-orange-700 border-orange-300',
  MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  LOW: 'bg-gray-100 text-gray-600 border-gray-300',
};

const STATUS_BADGE: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  TRIAGED: 'bg-indigo-100 text-indigo-700',
  ASSIGNED: 'bg-cyan-100 text-cyan-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-600',
  REOPENED: 'bg-red-100 text-red-700',
  VERIFIED: 'bg-emerald-100 text-emerald-700',
  DEFERRED: 'bg-slate-100 text-slate-600',
};

// ── Sub-panels ─────────────────────────────────────────────

function IssueDetailPanel({ issue, canEdit }: { issue: any; canEdit: boolean }) {
  return (
    <div className="space-y-5">
      {/* Title and badges */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{issue.title}</h3>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span
            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
              TYPE_BADGE[issue.issueType] || TYPE_BADGE.OTHER
            }`}
          >
            {issue.issueType?.replace('_', ' ') || 'Unknown'}
          </span>
          <span
            className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${
              SEVERITY_BADGE[issue.priority] || SEVERITY_BADGE.LOW
            }`}
          >
            {issue.priority || 'Unknown'}
          </span>
          <span
            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
              STATUS_BADGE[issue.status] || STATUS_BADGE.OPEN
            }`}
          >
            {issue.status?.replace('_', ' ') || 'Unknown'}
          </span>
        </div>
      </div>

      {/* Description */}
      {issue.description && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Description</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {issue.description}
          </p>
        </div>
      )}

      {/* People */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            <Users size={12} />
            Assignee
          </p>
          <p className="text-sm text-gray-700">{issue.assignee || 'Unassigned'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Reporter</p>
          <p className="text-sm text-gray-700">{issue.reporter || 'Unknown'}</p>
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            <Clock size={12} />
            Created
          </p>
          <p className="text-sm text-gray-700">
            {issue.createdAt ? new Date(issue.createdAt).toLocaleDateString() : 'N/A'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Due Date</p>
          <p className="text-sm text-gray-700">
            {issue.dueDate ? new Date(issue.dueDate).toLocaleDateString() : 'Not set'}
          </p>
        </div>
      </div>

      {/* Resolution */}
      {issue.resolvedAt && (
        <div>
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            <CheckCircle size={12} />
            Resolved
          </p>
          <p className="text-sm text-gray-700">
            {new Date(issue.resolvedAt).toLocaleDateString()}
          </p>
          {issue.resolution && (
            <p className="text-sm text-gray-600 mt-1">{issue.resolution}</p>
          )}
        </div>
      )}

      {/* Related entities placeholder */}
      <div>
        <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
          <TrendingUp size={12} />
          Related Entities
        </p>
        <div className="flex items-center justify-center h-16 text-sm text-gray-400 border border-dashed border-gray-300 rounded-lg">
          {/* TODO: Wire to real linked tasks/stories */}
          No linked entities
        </div>
      </div>

      {/* Quick actions */}
      {canEdit && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
          <button className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
            Assign
          </button>
          <button className="px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors">
            Resolve
          </button>
          <button className="px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors">
            Escalate
          </button>
        </div>
      )}
    </div>
  );
}

function ContextPanel({ issue }: { issue: any }) {
  // TODO: Replace with real API data for impact chain
  const mockImpact = {
    blockedTasks: [
      { id: 'T-101', title: 'API endpoint implementation', status: 'BLOCKED' },
      { id: 'T-102', title: 'Integration test setup', status: 'BLOCKED' },
    ],
    impactedStories: [
      { id: 'US-31', title: 'User login flow', points: 5 },
    ],
    impactedEpics: [
      { id: 'E-5', title: 'Authentication Module' },
    ],
  };

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <TrendingUp size={16} className="text-blue-600" />
        Impact Chain
      </h3>

      {/* Issue source */}
      <div className="bg-red-50 rounded-lg p-3">
        <p className="text-xs text-red-600 font-medium mb-1">Issue</p>
        <p className="text-sm text-gray-800 font-medium">{issue?.title || 'No issue selected'}</p>
      </div>

      {/* Arrow */}
      <div className="flex justify-center">
        <AlertTriangle size={16} className="text-amber-500" />
      </div>

      {/* Blocked tasks */}
      <div>
        <p className="text-xs font-medium text-orange-700 flex items-center gap-1 mb-2">
          <AlertCircle size={12} />
          Blocked Tasks ({mockImpact.blockedTasks.length})
        </p>
        <ul className="space-y-1.5">
          {mockImpact.blockedTasks.map((task) => (
            <li
              key={task.id}
              className="text-sm text-gray-700 bg-orange-50 rounded px-3 py-2 flex items-center gap-2"
            >
              <span className="text-xs text-orange-600 font-mono">{task.id}</span>
              <span>{task.title}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Impacted stories */}
      <div>
        <p className="text-xs font-medium text-blue-700 flex items-center gap-1 mb-2">
          <Target size={12} />
          Impacted Stories ({mockImpact.impactedStories.length})
        </p>
        <ul className="space-y-1.5">
          {mockImpact.impactedStories.map((story) => (
            <li
              key={story.id}
              className="text-sm text-gray-700 bg-blue-50 rounded px-3 py-2 flex items-center gap-2"
            >
              <span className="text-xs text-blue-600 font-mono">{story.id}</span>
              <span>{story.title}</span>
              <span className="ml-auto text-xs text-gray-400">{story.points} SP</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Impacted epics */}
      <div>
        <p className="text-xs font-medium text-purple-700 flex items-center gap-1 mb-2">
          <Shield size={12} />
          Impacted Epics ({mockImpact.impactedEpics.length})
        </p>
        <ul className="space-y-1.5">
          {mockImpact.impactedEpics.map((epic) => (
            <li
              key={epic.id}
              className="text-sm text-gray-700 bg-purple-50 rounded px-3 py-2 flex items-center gap-2"
            >
              <span className="text-xs text-purple-600 font-mono">{epic.id}</span>
              <span>{epic.title}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function EscalationPanel({ issue }: { issue: any }) {
  const [target, setTarget] = useState<'RISK' | 'DECISION'>('RISK');
  const [description, setDescription] = useState('');
  const [severityAssessment, setSeverityAssessment] = useState<string>('HIGH');

  const handleSubmit = () => {
    // TODO: Wire to real escalation API
    console.log('Escalation submitted:', {
      issueId: issue?.id,
      target,
      description,
      severityAssessment,
    });
  };

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <ArrowUpRight size={16} className="text-red-600" />
        Escalation
      </h3>

      {/* Source issue */}
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs text-gray-500 mb-1">Escalating Issue</p>
        <p className="text-sm text-gray-800 font-medium">
          {issue?.title || 'No issue selected'}
        </p>
      </div>

      {/* Target type */}
      <div>
        <label className="text-xs text-gray-600 block mb-1.5">Escalate To</label>
        <div className="flex gap-2">
          {(['RISK', 'DECISION'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setTarget(opt)}
              className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-all ${
                target === opt
                  ? 'border-red-400 bg-red-50 text-red-700 font-medium'
                  : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {opt === 'RISK' ? 'Risk' : 'Decision'}
            </button>
          ))}
        </div>
      </div>

      {/* Severity assessment */}
      <div>
        <label className="text-xs text-gray-600 block mb-1.5">
          Severity Assessment
        </label>
        <select
          value={severityAssessment}
          onChange={(e) => setSeverityAssessment(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      {/* Description */}
      <div>
        <label className="text-xs text-gray-600 block mb-1.5">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Describe the escalation reason and impact..."
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
        />
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!description.trim()}
        className="w-full px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Submit Escalation
      </button>
    </div>
  );
}

function ResolutionPanel({ issue }: { issue: any }) {
  const [resolutionType, setResolutionType] = useState<string>('FIX');
  const [notes, setNotes] = useState('');

  const resolutionOptions = [
    { value: 'FIX', label: 'Fix', description: 'Issue has been fixed' },
    { value: 'WONT_FIX', label: "Won't Fix", description: 'Decided not to fix' },
    { value: 'DUPLICATE', label: 'Duplicate', description: 'Duplicate of another issue' },
    { value: 'DEFERRED', label: 'Deferred', description: 'Postponed to a later date' },
  ];

  const handleSubmit = () => {
    // TODO: Wire to real resolution API
    console.log('Resolution submitted:', {
      issueId: issue?.id,
      resolutionType,
      notes,
    });
  };

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <CheckCircle size={16} className="text-green-600" />
        Resolution
      </h3>

      {/* Source issue */}
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs text-gray-500 mb-1">Resolving Issue</p>
        <p className="text-sm text-gray-800 font-medium">
          {issue?.title || 'No issue selected'}
        </p>
      </div>

      {/* Resolution type */}
      <div>
        <label className="text-xs text-gray-600 block mb-1.5">
          Resolution Type
        </label>
        <div className="space-y-2">
          {resolutionOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setResolutionType(opt.value)}
              className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
                resolutionType === opt.value
                  ? 'border-green-400 bg-green-50'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <p
                className={`text-sm font-medium ${
                  resolutionType === opt.value ? 'text-green-700' : 'text-gray-700'
                }`}
              >
                {opt.label}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs text-gray-600 block mb-1.5">
          Resolution Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Describe the resolution..."
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
        />
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!notes.trim()}
        className="w-full px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Submit Resolution
      </button>
    </div>
  );
}

function CommentsPanel({ issue }: { issue: any }) {
  const [newComment, setNewComment] = useState('');

  // Use real comments from the issue if available, otherwise mock
  const comments =
    issue?.comments && issue.comments.length > 0
      ? issue.comments
      : [
          {
            author: 'John Kim',
            content: 'Investigating the root cause. Looks like a race condition in the API handler.',
            commentedAt: '2026-02-07T10:30:00Z',
          },
          {
            author: 'Sarah Park',
            content: 'Reproduced in staging environment. Confirmed with dev tools network trace.',
            commentedAt: '2026-02-08T14:15:00Z',
          },
        ];

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    // TODO: Wire to real comment API
    console.log('Comment submitted:', {
      issueId: issue?.id,
      content: newComment,
    });
    setNewComment('');
  };

  return (
    <div className="space-y-4 flex flex-col h-full">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <MessageSquare size={16} className="text-teal-600" />
        Comments ({comments.length})
      </h3>

      {/* Comment list */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {comments.map((comment: any, index: number) => (
          <div key={index} className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-gray-700">
                {comment.author}
              </p>
              <p className="text-xs text-gray-400">
                {comment.commentedAt
                  ? new Date(comment.commentedAt).toLocaleDateString()
                  : ''}
              </p>
            </div>
            <p className="text-sm text-gray-600">{comment.content}</p>
          </div>
        ))}
      </div>

      {/* New comment input */}
      <div className="border-t border-gray-200 pt-3">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
          placeholder="Add a comment..."
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
        />
        <button
          onClick={handleSubmit}
          disabled={!newComment.trim()}
          className="mt-2 w-full px-4 py-2 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Post Comment
        </button>
      </div>
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────

export function IssueRightPanel({
  mode,
  issue,
  preset: _preset,
  onClose,
  onModeChange,
  canEdit,
}: IssueRightPanelProps) {
  if (mode === 'none') return null;

  const tabs: { mode: IssuePanelMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'issue-detail', label: 'Detail', icon: <Bug size={14} /> },
    { mode: 'context', label: 'Context', icon: <TrendingUp size={14} /> },
    { mode: 'escalation', label: 'Escalate', icon: <ArrowUpRight size={14} /> },
    { mode: 'resolution', label: 'Resolve', icon: <CheckCircle size={14} /> },
    { mode: 'comments', label: 'Comments', icon: <MessageSquare size={14} /> },
  ];

  const renderContent = () => {
    if (!issue) {
      return (
        <div className="flex items-center justify-center h-32 text-sm text-gray-400">
          No issue selected
        </div>
      );
    }

    switch (mode) {
      case 'issue-detail':
        return <IssueDetailPanel issue={issue} canEdit={canEdit} />;
      case 'context':
        return <ContextPanel issue={issue} />;
      case 'escalation':
        return <EscalationPanel issue={issue} />;
      case 'resolution':
        return <ResolutionPanel issue={issue} />;
      case 'comments':
        return <CommentsPanel issue={issue} />;
      default:
        return null;
    }
  };

  return (
    <div className="w-[380px] border border-gray-200 bg-white rounded-xl shadow-sm flex flex-col h-full shrink-0">
      {/* Panel header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-700">Issue Details</h2>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          aria-label="Close panel"
        >
          <X size={16} />
        </button>
      </div>

      {/* Tab navigation */}
      <div className="flex border-b border-gray-200 px-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.mode}
            onClick={() => onModeChange(tab.mode)}
            className={`flex items-center gap-1 px-2.5 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
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
