import { useState, useMemo } from 'react';
import { Bell, AlertTriangle, Loader2 } from 'lucide-react';
import { usePreset } from '../../hooks/usePreset';
import { useFilterSpec } from '../../hooks/useFilterSpec';
import { useProject } from '../../contexts/ProjectContext';
import { useAuthStore } from '../../stores/authStore';
import { useKanbanTasks } from '../../hooks/api/useTasks';
import { useIssues } from '../../hooks/api/useCommon';
import { useStories } from '../../hooks/api/useStories';
import { useActiveSprint } from '../../hooks/api/useSprints';
import { canEdit as checkCanEdit } from '../../utils/rolePermissions';
import { ISSUE_SEVERITY_COLORS } from '../../constants/statusMaps';
import { computeDaysRemaining } from '../../utils/formatters';
import type { UserRole } from '../App';
import {
  MyWorkKpiRow,
  MyWorkFilters,
  MYWORK_FILTER_KEYS,
  MyWorkTaskCard,
  MyWorkRightPanel,
} from './mywork';
import type { MyWorkPanelMode, MyWorkTask, MyWorkKpiStats } from './mywork';

// ── Types ──────────────────────────────────────────────────

interface MyWorkPageProps {
  userRole: string;
}

type MyWorkTab = 'today' | 'sprint' | 'overdue' | 'all' | 'issues';

interface MappedIssue {
  id: string;
  title: string;
  severity: string;
  status: string;
  relation: string;
}

// ── Helpers ────────────────────────────────────────────────

const TAB_CONFIG: { key: MyWorkTab; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'sprint', label: 'Sprint' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'all', label: 'All' },
  { key: 'issues', label: 'Issues' },
];

function computeKpiStats(tasks: MyWorkTask[], activeSprintName?: string): MyWorkKpiStats {
  return {
    myTasksTotal: tasks.length,
    myTasksInProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
    myBlockedCount: tasks.filter((t) => t.isBlocked).length,
    myOverdueCount: tasks.filter((t) => t.isOverdue).length,
    myCompletedToday: tasks.filter((t) => t.status === 'DONE').length,
    mySprintRemainingSp: activeSprintName
      ? tasks
          .filter((t) => t.sprintName === activeSprintName && t.status !== 'DONE')
          .reduce((sum, t) => sum + (t.estimatedHours ?? 0), 0)
      : 0,
  };
}

/** Map priority string from kanban API to the uppercase format used in MyWorkTask */
function normalizePriority(priority: string | undefined): string {
  if (!priority) return 'MEDIUM';
  const upper = priority.toUpperCase();
  if (upper === 'HIGH' || upper === 'CRITICAL') return upper;
  if (upper === 'MEDIUM') return 'MEDIUM';
  if (upper === 'LOW') return 'LOW';
  return 'MEDIUM';
}

/** Map issue type to a display severity label */
function mapIssueSeverity(issueType: string): string {
  const severityMap: Record<string, string> = {
    BLOCKER: 'blocker',
    BUG: 'major',
    RISK: 'critical',
    CHANGE_REQUEST: 'major',
    QUESTION: 'minor',
    IMPROVEMENT: 'minor',
    OTHER: 'minor',
  };
  return severityMap[issueType] || 'minor';
}

/** Wrap shared computeDaysRemaining to return undefined when no date is provided */
function computeDaysRemainingOrUndefined(dueDate?: string): number | undefined {
  if (!dueDate) return undefined;
  return computeDaysRemaining(dueDate);
}

function applyFilters(tasks: MyWorkTask[], filters: Record<string, string | boolean | undefined>): MyWorkTask[] {
  let result = [...tasks];

  const q = (filters.q as string)?.toLowerCase();
  if (q) {
    result = result.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        (t.storyTitle || '').toLowerCase().includes(q)
    );
  }

  const status = filters.status as string;
  if (status) {
    result = result.filter((t) => t.status === status);
  }

  const priority = filters.priority as string;
  if (priority) {
    result = result.filter((t) => t.priority === priority);
  }

  const dueDate = filters.dueDate as string;
  if (dueDate === 'overdue') {
    result = result.filter((t) => t.isOverdue);
  } else if (dueDate === 'today') {
    result = result.filter((t) => t.daysRemaining === 0);
  } else if (dueDate === 'this_week') {
    result = result.filter((t) => t.daysRemaining !== undefined && t.daysRemaining >= 0 && t.daysRemaining <= 7);
  } else if (dueDate === 'no_date') {
    result = result.filter((t) => !t.dueDate);
  }

  const sprintId = filters.sprintId as string;
  if (sprintId) {
    result = result.filter((t) => t.sprintName === sprintId);
  }

  return result;
}

// ── Mock fallback data ─────────────────────────────────────

const MOCK_TASKS: MyWorkTask[] = [
  { id: 'T-101', title: 'API endpoint implementation', status: 'IN_PROGRESS', priority: 'HIGH', sprintName: 'Sprint 5', estimatedHours: 8, dueDate: '2026-02-10', daysRemaining: 1, isOverdue: false, isBlocked: false },
  { id: 'T-102', title: 'Unit test coverage for auth module', status: 'TODO', priority: 'MEDIUM', sprintName: 'Sprint 5', estimatedHours: 5, dueDate: '2026-02-12', daysRemaining: 3, isOverdue: false, isBlocked: false },
  { id: 'T-103', title: 'Fix login redirect bug', status: 'IN_REVIEW', priority: 'CRITICAL', sprintName: 'Sprint 5', estimatedHours: 3, dueDate: '2026-02-09', daysRemaining: 0, isOverdue: false, isBlocked: false },
  { id: 'T-104', title: 'Database migration script', status: 'BLOCKED', priority: 'HIGH', sprintName: 'Sprint 5', estimatedHours: 4, dueDate: '2026-02-08', daysRemaining: -1, isOverdue: true, isBlocked: true, linkedIssueId: 'ISS-045', linkedIssueTitle: 'DB connection timeout' },
  { id: 'T-105', title: 'Dashboard chart component', status: 'IN_PROGRESS', priority: 'MEDIUM', sprintName: 'Sprint 5', estimatedHours: 6, dueDate: '2026-02-14', daysRemaining: 5, isOverdue: false, isBlocked: false },
  { id: 'T-106', title: 'Code review for PR #42', status: 'TODO', priority: 'LOW', sprintName: 'Sprint 5', estimatedHours: 2, isOverdue: false, isBlocked: false },
  { id: 'T-107', title: 'Performance optimization', status: 'DONE', priority: 'MEDIUM', sprintName: 'Sprint 5', estimatedHours: 4, dueDate: '2026-02-07', daysRemaining: -2, isOverdue: false, isBlocked: false },
  { id: 'T-108', title: 'Write API documentation', status: 'TODO', priority: 'LOW', sprintName: 'Sprint 5', estimatedHours: 3, dueDate: '2026-02-15', daysRemaining: 6, isOverdue: false, isBlocked: false },
];

const MOCK_ISSUES: MappedIssue[] = [
  { id: 'ISS-045', title: 'DB connection timeout under load', severity: 'critical', status: 'OPEN', relation: 'assignee' },
  { id: 'ISS-048', title: 'Mobile layout breaks on small screens', severity: 'major', status: 'OPEN', relation: 'assignee' },
  { id: 'ISS-051', title: 'CSV export encoding issue', severity: 'minor', status: 'OPEN', relation: 'reporter' },
  { id: 'ISS-039', title: 'Login fails with SSO provider', severity: 'blocker', status: 'IN_PROGRESS', relation: 'assignee' },
  { id: 'ISS-042', title: 'Notification emails not sent', severity: 'major', status: 'RESOLVED', relation: 'reporter' },
];

// ── Component ──────────────────────────────────────────────

export default function MyWorkPage({ userRole }: MyWorkPageProps) {
  // Hooks - following the same pattern as SprintManagement / KanbanBoard
  const { currentProject } = useProject();
  const currentUser = useAuthStore((s) => s.user);
  const projectId = currentProject?.id;

  const { currentPreset } = usePreset(userRole.toUpperCase());
  const { filters, setFilters } = useFilterSpec({
    keys: MYWORK_FILTER_KEYS,
    syncUrl: false,
  });

  const editAllowed = checkCanEdit(userRole as UserRole);

  // ── API data fetching ────────────────────────────────────
  const { data: kanbanTasks = [], isLoading: tasksLoading } = useKanbanTasks(projectId);
  const { data: issues = [], isLoading: issuesLoading } = useIssues(projectId);
  const { data: stories = [] } = useStories(projectId);
  const { data: activeSprint } = useActiveSprint(projectId ?? '');

  const activeSprintName = activeSprint?.name;

  // ── Map kanban tasks to MyWorkTask[] ─────────────────────
  const allTasks: MyWorkTask[] = useMemo(() => {
    if (!currentUser) return [];

    // Build a lookup for story titles by story ID
    const storyMap = new Map<string, string>();
    for (const story of stories) {
      storyMap.set(story.id, story.title);
    }

    // Filter tasks assigned to the current user
    const myKanbanTasks = kanbanTasks.filter(
      (t) => t.assigneeId === currentUser.id || t.assignee === currentUser.name
    );

    return myKanbanTasks.map((task): MyWorkTask => {
      const days = computeDaysRemainingOrUndefined(task.dueDate || undefined);
      const taskDueDate = task.dueDate || undefined;
      const isOverdue = days !== undefined && days < 0 && task.status !== 'DONE';
      const isBlocked = task.status === 'BLOCKED';

      return {
        id: task.id,
        title: task.title,
        status: task.status,
        priority: normalizePriority(task.priority),
        sprintName: activeSprintName,
        estimatedHours: task.storyPoints,
        dueDate: taskDueDate,
        daysRemaining: days,
        isOverdue,
        isBlocked,
      };
    });
  }, [kanbanTasks, currentUser, stories, activeSprintName]);

  // ── Map issues to MappedIssue[] ──────────────────────────
  const myIssues: MappedIssue[] = useMemo(() => {
    if (!currentUser || !issues) return [];

    return issues
      .filter((issue) => issue.assignee === currentUser.id || issue.reporter === currentUser.id)
      .map((issue): MappedIssue => ({
        id: issue.id,
        title: issue.title,
        severity: mapIssueSeverity(issue.issueType),
        status: issue.status,
        relation: issue.assignee === currentUser.id ? 'assignee' : 'reporter',
      }));
  }, [issues, currentUser]);

  // Fallback to mock data when API returns empty
  const effectiveTasks = allTasks.length > 0 ? allTasks : MOCK_TASKS;
  const effectiveIssues = myIssues.length > 0 ? myIssues : MOCK_ISSUES;

  // State
  const [activeTab, setActiveTab] = useState<MyWorkTab>('today');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<MyWorkPanelMode>('none');

  // Loading state
  const isLoading = tasksLoading || issuesLoading;

  // Derived data
  const filteredTasks = useMemo(() => applyFilters(effectiveTasks, filters), [effectiveTasks, filters]);

  const kpiStats = useMemo(
    () => computeKpiStats(effectiveTasks, activeSprintName),
    [effectiveTasks, activeSprintName]
  );

  const selectedTask = useMemo(
    () => effectiveTasks.find((t) => t.id === selectedTaskId),
    [effectiveTasks, selectedTaskId]
  );

  // Tab-specific task lists
  const todayTasks = useMemo(
    () => filteredTasks.filter(
      (t) => t.status !== 'DONE' && (
        t.daysRemaining === 0 ||
        t.daysRemaining === 1 ||
        t.isBlocked ||
        t.status === 'IN_PROGRESS' ||
        t.status === 'IN_REVIEW'
      )
    ),
    [filteredTasks]
  );

  const sprintTasks = useMemo(
    () => activeSprintName
      ? filteredTasks.filter((t) => t.sprintName === activeSprintName)
      : filteredTasks,
    [filteredTasks, activeSprintName]
  );

  const overdueTasks = useMemo(
    () => filteredTasks.filter((t) => t.isOverdue),
    [filteredTasks]
  );

  // Handlers
  const handleSelectTask = (taskId: string) => {
    setSelectedTaskId(taskId);
    setPanelMode('task-detail');
  };

  const handleStatusChange = (_taskId: string, _newStatus: string) => {
    // TODO: Integrate with useMoveTask mutation for real status updates
  };

  const handleClosePanel = () => {
    setPanelMode('none');
    setSelectedTaskId(null);
  };

  const notificationCount = kpiStats.myOverdueCount + kpiStats.myBlockedCount;

  // ── Render helpers ─────────────────────────────────────────

  const renderTaskList = (tasks: MyWorkTask[], emptyMessage: string) => {
    if (tasks.length === 0) {
      return (
        <div className="flex items-center justify-center h-32 text-sm text-gray-400 border border-dashed border-gray-300 rounded-lg">
          {emptyMessage}
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {tasks.map((task) => (
          <MyWorkTaskCard
            key={task.id}
            task={task}
            onSelect={() => handleSelectTask(task.id)}
            onStatusChange={(newStatus) => handleStatusChange(task.id, newStatus)}
            canEdit={editAllowed}
          />
        ))}
      </div>
    );
  };

  const renderSprintGrouped = () => {
    const statusGroups: Record<string, MyWorkTask[]> = {
      TODO: [],
      IN_PROGRESS: [],
      IN_REVIEW: [],
      DONE: [],
      BLOCKED: [],
    };
    sprintTasks.forEach((t) => {
      if (statusGroups[t.status]) {
        statusGroups[t.status].push(t);
      } else {
        statusGroups.TODO.push(t);
      }
    });

    const statusLabels: Record<string, string> = {
      TODO: 'TODO',
      IN_PROGRESS: 'In Progress',
      IN_REVIEW: 'In Review',
      DONE: 'Done',
      BLOCKED: 'Blocked',
    };

    const statusColors: Record<string, string> = {
      TODO: 'bg-gray-200',
      IN_PROGRESS: 'bg-blue-500',
      IN_REVIEW: 'bg-purple-500',
      DONE: 'bg-green-500',
      BLOCKED: 'bg-red-500',
    };

    return (
      <div className="space-y-6">
        {Object.entries(statusGroups).map(([status, tasks]) => {
          if (tasks.length === 0) return null;
          return (
            <div key={status}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`w-2.5 h-2.5 rounded-full ${statusColors[status]}`} />
                <h3 className="text-sm font-semibold text-gray-700">
                  {statusLabels[status]}
                </h3>
                <span className="text-xs text-gray-400">({tasks.length})</span>
              </div>
              <div className="space-y-3">
                {tasks.map((task) => (
                  <MyWorkTaskCard
                    key={task.id}
                    task={task}
                    onSelect={() => handleSelectTask(task.id)}
                    onStatusChange={(newStatus) => handleStatusChange(task.id, newStatus)}
                    canEdit={editAllowed}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderIssuesTable = () => {
    const assignedIssues = effectiveIssues.filter((i) => i.relation === 'assignee');
    const reportedIssues = effectiveIssues.filter((i) => i.relation === 'reporter');

    const renderIssueRows = (issueList: MappedIssue[]) => (
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">ID</th>
            <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Title</th>
            <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Severity</th>
            <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Status</th>
          </tr>
        </thead>
        <tbody>
          {issueList.map((issue) => (
            <tr key={issue.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
              <td className="py-2 px-3 font-mono text-xs text-gray-500">{issue.id}</td>
              <td className="py-2 px-3 text-gray-700">{issue.title}</td>
              <td className="py-2 px-3">
                <span className={`px-2 py-0.5 rounded text-xs ${ISSUE_SEVERITY_COLORS[issue.severity] || 'bg-gray-100 text-gray-600'}`}>
                  {issue.severity}
                </span>
              </td>
              <td className="py-2 px-3">
                <span className={`px-2 py-0.5 rounded text-xs ${
                  issue.status === 'OPEN' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                }`}>
                  {issue.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );

    return (
      <div className="space-y-6">
        {/* Assigned to me */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <AlertTriangle size={14} className="text-orange-500" />
            Assigned to Me ({assignedIssues.length})
          </h3>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {renderIssueRows(assignedIssues)}
          </div>
        </div>

        {/* Reported by me */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Reported by Me ({reportedIssues.length})
          </h3>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {renderIssueRows(reportedIssues)}
          </div>
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'today':
        return (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Today's Focus ({todayTasks.length})
            </h3>
            {renderTaskList(todayTasks, 'No tasks require attention today')}
          </div>
        );
      case 'sprint':
        return (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Current Sprint{activeSprintName ? ` - ${activeSprintName}` : ''} ({sprintTasks.length})
            </h3>
            {sprintTasks.length === 0
              ? renderTaskList([], 'No sprint tasks found')
              : renderSprintGrouped()
            }
          </div>
        );
      case 'overdue':
        return (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <AlertTriangle size={14} className="text-red-500" />
              Overdue Tasks ({overdueTasks.length})
            </h3>
            {renderTaskList(overdueTasks, 'No overdue tasks')}
          </div>
        );
      case 'all':
        return (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              All Tasks ({filteredTasks.length})
            </h3>
            {renderTaskList(filteredTasks, 'No tasks found')}
          </div>
        );
      case 'issues':
        return renderIssuesTable();
      default:
        return null;
    }
  };

  // ── Main render ────────────────────────────────────────────

  // No project selected
  if (!projectId) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">My Work</h1>
        <p className="text-sm">Select a project to view your tasks and issues.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Main content area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">My Work</h1>
            <div className="relative">
              <Bell size={20} className="text-gray-500" />
              {notificationCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {notificationCount}
                </span>
              )}
            </div>
          </div>

          {/* KPI Row */}
          <MyWorkKpiRow stats={kpiStats} />

          {/* Filter Bar */}
          <MyWorkFilters
            values={filters}
            onChange={setFilters}
            preset={currentPreset}
          />

          {/* Tab Bar */}
          <div className="flex border-b border-gray-200">
            {TAB_CONFIG.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tab.key === 'overdue' && overdueTasks.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-bold">
                    {overdueTasks.length}
                  </span>
                )}
                {tab.key === 'issues' && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[10px] font-bold">
                    {effectiveIssues.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="pb-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-32 text-sm text-gray-400 gap-2">
                <Loader2 size={16} className="animate-spin" />
                Loading...
              </div>
            ) : (
              renderTabContent()
            )}
          </div>
        </div>

        {/* Right: Detail panel */}
        <MyWorkRightPanel
          mode={panelMode}
          taskData={selectedTask}
          onClose={handleClosePanel}
          canEdit={editAllowed}
        />
      </div>
    </div>
  );
}
