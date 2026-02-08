import { useState, useMemo } from 'react';
import {
  Plus,
  Calendar,
  Target,
  Play,
  CheckCircle,
  Loader2,
  ChevronRight,
  TrendingUp,
  BarChart3,
  MessageSquare,
  ListChecks,
} from 'lucide-react';
import type { UserRole } from '../App';
import type { Sprint, SprintFormData } from '../../types/backlog';
import {
  getSprintStatusColor,
  createEmptySprintForm,
  validateSprintForm,
} from '../../types/backlog';
import { useProject } from '../../contexts/ProjectContext';
import { usePreset } from '../../hooks/usePreset';
import { useFilterSpec } from '../../hooks/useFilterSpec';
import {
  useSprints,
  useCreateSprint,
  useStartSprint,
  useCompleteSprint,
} from '../../hooks/api/useSprints';
import { useBurndown, useSprintVelocity } from '../../hooks/api/useDashboard';
import { canEdit as checkCanEdit } from '../../utils/rolePermissions';
import { PresetSwitcher } from './common/PresetSwitcher';
import {
  SprintKpiRow,
  SprintFilters,
  SPRINT_FILTER_KEYS,
  SprintBurndownChart,
  SprintVelocityChart,
  SprintRightPanel,
} from './sprint';
import type { SprintPanelMode } from './sprint';

// ── Types ──────────────────────────────────────────────────

interface SprintManagementProps {
  userRole: string;
}

type DetailTab = 'burndown' | 'stories' | 'velocity' | 'retrospective';

// ── Status sort order ──────────────────────────────────────

const STATUS_SORT_ORDER: Record<string, number> = {
  ACTIVE: 0,
  PLANNING: 1,
  COMPLETED: 2,
  CANCELLED: 3,
};

// ── Helpers ────────────────────────────────────────────────

function computeProgress(sprint: Sprint): number {
  if (!sprint.plannedPoints || sprint.plannedPoints === 0) return 0;
  return Math.round(((sprint.velocity || 0) / sprint.plannedPoints) * 100);
}

function getDaysRemaining(endDate: string): number {
  const end = new Date(endDate);
  const today = new Date();
  return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    PLANNING: 'Planning',
    ACTIVE: 'Active',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  };
  return map[status] || status;
}

// ── Component ──────────────────────────────────────────────

export default function SprintManagement({ userRole }: SprintManagementProps) {
  // Hooks
  const { currentProject } = useProject();
  const projectId = currentProject?.id;
  const { currentPreset, switchPreset } = usePreset(userRole.toUpperCase());
  const { filters, setFilters } = useFilterSpec({
    keys: SPRINT_FILTER_KEYS,
    syncUrl: false,
  });

  const { data: sprints = [], isLoading } = useSprints(projectId);
  const { data: burndownSection } = useBurndown(projectId ?? null);
  const { data: velocitySection } = useSprintVelocity(projectId ?? null);
  const createSprintMutation = useCreateSprint();
  const startSprintMutation = useStartSprint();
  const completeSprintMutation = useCompleteSprint();

  // State
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>('burndown');
  const [panelMode, setPanelMode] = useState<SprintPanelMode>('none');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sprintForm, setSprintForm] = useState<SprintFormData>(createEmptySprintForm());

  const canEditSprint = checkCanEdit(userRole as UserRole);

  // Map burndown API data to chart format
  const burndownData = useMemo(() => {
    const points = burndownSection?.data?.dataPoints;
    if (!points || points.length === 0) return undefined;
    return points.map((p) => ({ date: p.date, remaining: p.remainingPoints }));
  }, [burndownSection]);

  // Derived data
  const activeSprint = useMemo(
    () => sprints.find((s) => s.status === 'ACTIVE'),
    [sprints]
  );

  const filteredSprints = useMemo(() => {
    let result = [...sprints];

    // Search filter
    const q = (filters.q as string)?.toLowerCase();
    if (q) {
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.goal || '').toLowerCase().includes(q)
      );
    }

    // Status filter
    const status = filters.status as string;
    if (status) {
      result = result.filter((s) => s.status === status);
    }

    // Sort: ACTIVE first, then PLANNING, COMPLETED, CANCELLED
    result.sort(
      (a, b) =>
        (STATUS_SORT_ORDER[a.status] ?? 99) - (STATUS_SORT_ORDER[b.status] ?? 99)
    );

    return result;
  }, [sprints, filters]);

  const selectedSprint = useMemo(
    () => sprints.find((s) => s.id === selectedSprintId),
    [sprints, selectedSprintId]
  );

  const completedSprints = useMemo(() => {
    const filtered = sprints.filter((s) => s.status === 'COMPLETED');
    // Enrich with velocity API data when available for more accurate metrics
    const velocityMetrics = velocitySection?.data?.sprints;
    if (!velocityMetrics || velocityMetrics.length === 0) return filtered;
    return filtered.map((s) => {
      const metric = velocityMetrics.find((m) => m.sprintId === s.id);
      if (!metric) return s;
      return {
        ...s,
        plannedPoints: metric.plannedPoints ?? s.plannedPoints,
        velocity: metric.velocity ?? s.velocity,
      };
    });
  }, [sprints, velocitySection]);

  // Handlers
  const handleCreateSprint = () => {
    if (!validateSprintForm(sprintForm) || !projectId) return;

    createSprintMutation.mutate(
      { ...sprintForm, projectId },
      {
        onSuccess: () => {
          setShowCreateModal(false);
          setSprintForm(createEmptySprintForm());
        },
      }
    );
  };

  const handleStartSprint = (sprintId: string) => {
    startSprintMutation.mutate(sprintId);
  };

  const handleCompleteSprint = (sprintId: string) => {
    completeSprintMutation.mutate(sprintId);
  };

  const handleSelectSprint = (sprint: Sprint) => {
    if (selectedSprintId === sprint.id) {
      setSelectedSprintId(null);
      setPanelMode('none');
    } else {
      setSelectedSprintId(sprint.id);
      setPanelMode('sprint-summary');
    }
  };

  // Tab content definitions
  const detailTabs: { key: DetailTab; label: string; icon: React.ReactNode }[] = [
    { key: 'burndown', label: 'Burndown', icon: <TrendingUp size={14} /> },
    { key: 'stories', label: 'Stories', icon: <ListChecks size={14} /> },
    { key: 'velocity', label: 'Velocity', icon: <BarChart3 size={14} /> },
    { key: 'retrospective', label: 'Retrospective', icon: <MessageSquare size={14} /> },
  ];

  // Loading state
  if (!projectId) {
    return (
      <div className="p-6 flex items-center justify-center h-64 text-gray-400">
        Select a project to view sprints
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Main content area */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sprint Management</h1>
            <p className="text-sm text-gray-500 mt-1">
              Plan, track, and review sprints for {currentProject?.name || 'the project'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <PresetSwitcher
              currentPreset={currentPreset}
              onSwitch={switchPreset}
              compact
            />
            {canEditSprint && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus size={16} />
                New Sprint
              </button>
            )}
          </div>
        </div>

        {/* KPI Row */}
        <SprintKpiRow
          sprints={sprints}
          activeSprint={activeSprint}
          preset={currentPreset}
        />

        {/* Filters */}
        <SprintFilters
          values={filters}
          onChange={setFilters}
          preset={currentPreset}
        />

        {/* Sprint list */}
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-gray-400">
            <Loader2 size={20} className="animate-spin mr-2" />
            Loading sprints...
          </div>
        ) : filteredSprints.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Target size={40} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-1">No sprints found</h3>
            <p className="text-sm text-gray-400">
              {sprints.length === 0
                ? 'Create your first sprint to get started'
                : 'No sprints match the current filters'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSprints.map((sprint) => {
              const progress = computeProgress(sprint);
              const daysLeft = getDaysRemaining(sprint.endDate);
              const isSelected = selectedSprintId === sprint.id;

              return (
                <div
                  key={sprint.id}
                  onClick={() => handleSelectSprint(sprint)}
                  className={`bg-white rounded-xl border-2 p-4 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-indigo-500 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <ChevronRight
                        size={16}
                        className={`text-gray-400 transition-transform ${
                          isSelected ? 'rotate-90' : ''
                        }`}
                      />
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${getSprintStatusColor(
                          sprint.status
                        )}`}
                      >
                        {getStatusLabel(sprint.status)}
                      </span>
                      <h3 className="font-semibold text-gray-900">{sprint.name}</h3>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Actions */}
                      {canEditSprint && sprint.status === 'PLANNING' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartSprint(sprint.id);
                          }}
                          disabled={startSprintMutation.isPending}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
                        >
                          <Play size={12} />
                          Start
                        </button>
                      )}
                      {canEditSprint && sprint.status === 'ACTIVE' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCompleteSprint(sprint.id);
                          }}
                          disabled={completeSprintMutation.isPending}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
                        >
                          <CheckCircle size={12} />
                          Complete
                        </button>
                      )}

                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar size={12} />
                        <span>
                          {sprint.startDate} ~ {sprint.endDate}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Goal excerpt */}
                  {sprint.goal && (
                    <p className="text-sm text-gray-500 mt-2 ml-7 line-clamp-1">
                      {sprint.goal}
                    </p>
                  )}

                  {/* Progress bar and SP stats */}
                  <div className="flex items-center gap-4 mt-3 ml-7">
                    <div className="flex-1">
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {sprint.velocity || 0} / {sprint.plannedPoints || 0} SP ({progress}%)
                    </span>
                    {sprint.status === 'ACTIVE' && (
                      <span className="text-xs font-medium text-indigo-600 whitespace-nowrap">
                        {daysLeft > 0
                          ? `D-${daysLeft}`
                          : daysLeft === 0
                            ? 'Due today'
                            : `${Math.abs(daysLeft)}d overdue`}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Selected sprint detail tabs */}
        {selectedSprint && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Tab bar */}
            <div className="flex border-b border-gray-200 px-4">
              {detailTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="p-6">
              {activeTab === 'burndown' && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">
                    Burndown: {selectedSprint.name}
                  </h3>
                  <SprintBurndownChart sprint={selectedSprint} burndownData={burndownData} />
                </div>
              )}

              {activeTab === 'stories' && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">
                    Stories in {selectedSprint.name}
                  </h3>
                  {/* TODO: Replace with real story data from API */}
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 text-gray-500 font-medium">Title</th>
                        <th className="text-left py-2 px-3 text-gray-500 font-medium">Status</th>
                        <th className="text-right py-2 px-3 text-gray-500 font-medium">SP</th>
                        <th className="text-left py-2 px-3 text-gray-500 font-medium">Assignee</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-400">
                          No stories assigned to this sprint yet.
                          <br />
                          <span className="text-xs">
                            Assign stories from the Backlog screen.
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'velocity' && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">
                    Velocity Trend
                  </h3>
                  <SprintVelocityChart sprints={completedSprints} />
                </div>
              )}

              {activeTab === 'retrospective' && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">
                    Retrospective: {selectedSprint.name}
                  </h3>
                  {selectedSprint.status === 'COMPLETED' ? (
                    <div className="grid grid-cols-3 gap-4">
                      {/* What went well */}
                      <div className="bg-green-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-green-700 mb-3">What went well</h4>
                        {/* TODO: Replace with real retrospective data from API */}
                        <p className="text-sm text-gray-500 italic">
                          No retrospective data recorded yet.
                        </p>
                      </div>
                      {/* Could improve */}
                      <div className="bg-amber-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-amber-700 mb-3">Could improve</h4>
                        <p className="text-sm text-gray-500 italic">
                          No retrospective data recorded yet.
                        </p>
                      </div>
                      {/* Action items */}
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-blue-700 mb-3">Action items</h4>
                        <p className="text-sm text-gray-500 italic">
                          No retrospective data recorded yet.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <MessageSquare size={32} className="mx-auto mb-2 opacity-40" />
                      <p className="text-sm">
                        Retrospective is available after the sprint is completed.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right panel */}
      {panelMode !== 'none' && (
        <SprintRightPanel
          mode={panelMode}
          sprint={selectedSprint}
          sprints={sprints}
          preset={currentPreset}
          onClose={() => setPanelMode('none')}
          onModeChange={setPanelMode}
        />
      )}

      {/* Create Sprint Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Sprint</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sprint Name *
                </label>
                <input
                  type="text"
                  value={sprintForm.name}
                  onChange={(e) =>
                    setSprintForm({ ...sprintForm, name: e.target.value })
                  }
                  placeholder="Sprint 3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sprint Goal
                </label>
                <textarea
                  value={sprintForm.goal}
                  onChange={(e) =>
                    setSprintForm({ ...sprintForm, goal: e.target.value })
                  }
                  placeholder="Describe the sprint goal"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={sprintForm.startDate}
                    onChange={(e) =>
                      setSprintForm({ ...sprintForm, startDate: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={sprintForm.endDate}
                    onChange={(e) =>
                      setSprintForm({ ...sprintForm, endDate: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={handleCreateSprint}
                disabled={createSprintMutation.isPending}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {createSprintMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Creating...
                  </span>
                ) : (
                  'Create Sprint'
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setSprintForm(createEmptySprintForm());
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
