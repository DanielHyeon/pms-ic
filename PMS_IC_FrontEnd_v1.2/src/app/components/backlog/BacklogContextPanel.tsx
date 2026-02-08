import {
  X,
  Layers,
  CheckCircle,
  AlertTriangle,
  Target,
  ListTodo,
  User,
  Calendar,
  Lightbulb,
} from 'lucide-react';
import { Badge } from '../ui/badge';
import type { Epic } from '../../../types/backlog';
import type { UserStory } from '../../../utils/storyTypes';

// ─── Status / Priority badge helpers ─────────────────────

const epicStatusColor: Record<string, string> = {
  BACKLOG: 'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const priorityColor: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700',
  HIGH: 'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-blue-100 text-blue-700',
  LOW: 'bg-gray-100 text-gray-700',
};

const storyStatusColor: Record<string, string> = {
  IDEA: 'bg-gray-100 text-gray-600',
  REFINED: 'bg-sky-100 text-sky-700',
  READY: 'bg-blue-100 text-blue-700',
  IN_SPRINT: 'bg-indigo-100 text-indigo-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  REVIEW: 'bg-purple-100 text-purple-700',
  DONE: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

function getPriorityLabel(p: number): string {
  if (p <= 1) return 'CRITICAL';
  if (p === 2) return 'HIGH';
  if (p === 3) return 'MEDIUM';
  return 'LOW';
}

// ─── Epic Context View ───────────────────────────────────

function EpicContext({ epic }: { epic: Epic }) {
  const totalPoints = epic.totalStoryPoints || 0;
  const progress = epic.progress || 0;
  const completedPoints = totalPoints > 0 ? Math.round((progress / 100) * totalPoints) : 0;
  const remainingPoints = totalPoints - completedPoints;

  // TODO: Replace with real story-level stats from API
  const storySummary = {
    total: epic.itemCount || 0,
    inSprint: 0,
    done: 0,
    blocked: 0,
  };

  // TODO: Replace with real API data
  const recommendations = [
    'Review unestimated stories before next sprint planning',
    'Consider splitting large stories (> 13 SP)',
    'Update acceptance criteria for READY stories',
  ];

  return (
    <div className="p-4 space-y-5">
      {/* Epic name and badges */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2">{epic.name}</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${epicStatusColor[epic.status] || 'bg-gray-100 text-gray-700'}`}>
            {epic.status}
          </span>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColor[epic.priority] || 'bg-gray-100 text-gray-700'}`}>
            {epic.priority}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>Progress</span>
          <span className="font-medium">{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
          <span>{completedPoints} / {totalPoints} SP</span>
          <span>{remainingPoints} remaining</span>
        </div>
      </div>

      {/* Story summary */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <ListTodo className="h-3.5 w-3.5 text-gray-500" />
          <span className="text-xs font-medium text-gray-700">Story Summary</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <div className="text-sm font-bold text-gray-900">{storySummary.total}</div>
            <div className="text-[10px] text-gray-500">Total</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-2 text-center">
            <div className="text-sm font-bold text-blue-600">{storySummary.inSprint}</div>
            <div className="text-[10px] text-gray-500">In Sprint</div>
          </div>
          <div className="bg-green-50 rounded-lg p-2 text-center">
            <div className="text-sm font-bold text-green-600">{storySummary.done}</div>
            <div className="text-[10px] text-gray-500">Done</div>
          </div>
          <div className="bg-red-50 rounded-lg p-2 text-center">
            <div className="text-sm font-bold text-red-600">{storySummary.blocked}</div>
            <div className="text-[10px] text-gray-500">Blocked</div>
          </div>
        </div>
      </div>

      {/* SP summary */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Target className="h-3.5 w-3.5 text-gray-500" />
          <span className="text-xs font-medium text-gray-700">Story Points</span>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Total</span>
            <span className="font-medium text-gray-900">{totalPoints} SP</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Completed</span>
            <span className="font-medium text-green-600">{completedPoints} SP</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Remaining</span>
            <span className="font-medium text-amber-600">{remainingPoints} SP</span>
          </div>
        </div>
      </div>

      {/* Target date */}
      {epic.targetDate && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Calendar className="h-3.5 w-3.5" />
          <span>Target: {new Date(epic.targetDate).toLocaleDateString()}</span>
        </div>
      )}

      {/* Recommended Actions */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-xs font-medium text-gray-700">Recommended Actions</span>
        </div>
        <ul className="space-y-1.5">
          {recommendations.map((rec, idx) => (
            <li
              key={idx}
              className="text-[11px] text-gray-600 bg-amber-50 rounded px-2 py-1.5 leading-tight"
            >
              {rec}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Story Context View ──────────────────────────────────

function StoryContext({ story }: { story: UserStory }) {
  const priorityLabel = getPriorityLabel(story.priority);

  return (
    <div className="p-4 space-y-5">
      {/* Story title and badges */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2">{story.title}</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${storyStatusColor[story.status] || 'bg-gray-100 text-gray-700'}`}>
            {story.status}
          </span>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColor[priorityLabel] || 'bg-gray-100 text-gray-700'}`}>
            {priorityLabel}
          </span>
          {story.storyPoints != null && (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
              {story.storyPoints} SP
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {story.description && (
        <div>
          <span className="text-xs font-medium text-gray-700 block mb-1">Description</span>
          <p className="text-xs text-gray-600 leading-relaxed">{story.description}</p>
        </div>
      )}

      {/* Sprint info */}
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <Calendar className="h-3.5 w-3.5 text-gray-500" />
          <span className="text-xs font-medium text-gray-700">Sprint</span>
        </div>
        <p className="text-xs text-gray-600">
          {story.sprintId ? `Sprint #${story.sprintId}` : 'Not assigned to any sprint'}
        </p>
      </div>

      {/* Assignee */}
      <div>
        <div className="flex items-center gap-1.5 mb-1">
          <User className="h-3.5 w-3.5 text-gray-500" />
          <span className="text-xs font-medium text-gray-700">Assignee</span>
        </div>
        <p className="text-xs text-gray-600">
          {story.assignee || 'Unassigned'}
        </p>
      </div>

      {/* Acceptance criteria */}
      {story.acceptanceCriteria && story.acceptanceCriteria.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <CheckCircle className="h-3.5 w-3.5 text-gray-500" />
            <span className="text-xs font-medium text-gray-700">
              Acceptance Criteria ({story.acceptanceCriteria.filter((c) => c.trim()).length})
            </span>
          </div>
          <ul className="space-y-1">
            {story.acceptanceCriteria
              .filter((c) => c.trim())
              .map((criteria, idx) => (
                <li
                  key={idx}
                  className="text-[11px] text-gray-600 bg-gray-50 rounded px-2 py-1.5 leading-tight flex items-start gap-1.5"
                >
                  <span className="text-green-500 mt-0.5 flex-shrink-0">&#10003;</span>
                  <span>{criteria}</span>
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* Related task count placeholder */}
      <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
        <span>Related Tasks</span>
        <Badge variant="secondary" className="text-[10px]">
          0
        </Badge>
      </div>
    </div>
  );
}

// ─── Main Context Panel ──────────────────────────────────

interface BacklogContextPanelProps {
  selectedEpic?: Epic;
  selectedStory?: UserStory | null;
  onClose: () => void;
}

export function BacklogContextPanel({
  selectedEpic,
  selectedStory,
  onClose,
}: BacklogContextPanelProps) {
  const isStoryView = !!selectedStory;
  const panelTitle = isStoryView ? 'Story Detail' : 'Epic Detail';

  return (
    <div className="w-[320px] flex-shrink-0 border-l border-gray-200 bg-white overflow-y-auto">
      {/* Panel header with close button */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
          {isStoryView ? (
            <ListTodo className="h-3.5 w-3.5" />
          ) : (
            <Layers className="h-3.5 w-3.5" />
          )}
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
      {isStoryView && selectedStory ? (
        <StoryContext story={selectedStory} />
      ) : selectedEpic ? (
        <EpicContext epic={selectedEpic} />
      ) : null}
    </div>
  );
}
