import { useState, useCallback } from 'react';
import {
  Gauge,
  RefreshCw,
  Lock,
} from 'lucide-react';
import type { UserRole } from '../App';
import { canManagePmoConsole, isReadOnly as checkReadOnly, canViewPortfolio } from '../../utils/rolePermissions';
import {
  RequirementsSummaryWidget,
  TestingSummaryWidget,
  IssuesSummaryWidget,
  DeliverablesSummaryWidget,
  MeetingsSummaryWidget,
  ScheduleSummaryWidget,
} from './pmo-console';
import { useRequirements } from '../../hooks/api/useRequirements';
import { useIssues } from '../../hooks/api/useCommon';
import { usePortfolioDashboardStats } from '../../hooks/api/useDashboard';
import { usePreset } from '../../hooks/usePreset';
import { useFilterSpec } from '../../hooks/useFilterSpec';
import { PresetSwitcher } from './common/PresetSwitcher';
import type { FilterValues } from './common/FilterSpecBar';
import type { ViewModePreset } from '../../types/menuOntology';
import {
  PmoKpiRow,
  PmoFilters,
  PMO_FILTER_KEYS,
  HealthMatrixTable,
  PmoRightPanel,
} from './pmo';
import type { ProjectHealth, PmoPanelMode } from './pmo';

// ─── PMO-accessible presets per spec ────────────────────

const PMO_PRESETS: ViewModePreset[] = [
  'PMO_CONTROL',
  'EXEC_SUMMARY',
  'CUSTOMER_APPROVAL',
  'AUDIT_EVIDENCE',
];

// ─── Props ──────────────────────────────────────────────

interface PmoConsolePageProps {
  userRole: UserRole;
  projectId?: string;
}

// ─── Component ──────────────────────────────────────────

export default function PmoConsolePage({ userRole, projectId = 'proj-001' }: PmoConsolePageProps) {
  const canManage = canManagePmoConsole(userRole);
  const readOnly = checkReadOnly(userRole) || userRole === 'sponsor';
  const _canViewPortfolio = canViewPortfolio(userRole);

  // Preset management
  const { currentPreset, switchPreset } = usePreset(userRole);

  // Filter management
  const { filters, setFilters } = useFilterSpec({
    keys: PMO_FILTER_KEYS,
    syncUrl: true,
  });

  // Right panel state
  const [panelMode, setPanelMode] = useState<PmoPanelMode>('none');
  const [selectedProject, setSelectedProject] = useState<ProjectHealth | null>(null);

  const handleProjectSelect = useCallback((project: ProjectHealth) => {
    setSelectedProject(project);
    setPanelMode('project-summary');
  }, []);

  const handlePanelClose = useCallback(() => {
    setPanelMode('none');
  }, []);

  const handleFilterChange = useCallback((values: FilterValues) => {
    setFilters(values);
  }, [setFilters]);

  // Fetch portfolio stats for KPI row
  const { data: portfolioStats } = usePortfolioDashboardStats();

  // Fetch summary data for widget cards (existing API hooks)
  const { data: requirements = [] } = useRequirements(projectId);
  const { data: issues = [] } = useIssues(projectId);

  // Calculate summary metrics (preserved from original)
  const requirementStats = {
    total: requirements.length,
    approved: requirements.filter((r: { status: string }) => r.status === 'APPROVED').length,
  };

  const issueStats = {
    total: issues.length,
    open: issues.filter((i: { status: string }) => i.status === 'OPEN').length,
    critical: issues.filter((i: { priority: string; status: string }) => i.priority === 'CRITICAL' && i.status !== 'CLOSED').length,
  };

  // Suppress unused variable warnings (kept for future widget usage)
  void requirementStats;
  void issueStats;
  void canManage;
  void _canViewPortfolio;

  return (
    <div className="flex h-full">
      {/* Main content area */}
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Read-only Banner */}
        {readOnly && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
            <Lock className="text-amber-600" size={20} />
            <div>
              <p className="text-sm font-medium text-amber-900">View-only mode</p>
              <p className="text-xs text-amber-700">
                {userRole === 'sponsor'
                  ? 'Sponsor view — health, risk, and trend overview only.'
                  : 'This dashboard is read-only for your role.'}
              </p>
            </div>
          </div>
        )}

        {/* Header with Preset Switcher */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Gauge className="text-purple-600" />
              PMO 대시보드
            </h1>
            <p className="text-gray-500 mt-1">프로젝트 공통관리 현황 종합</p>
          </div>
          <div className="flex items-center gap-3">
            <PresetSwitcher
              currentPreset={currentPreset}
              availablePresets={PMO_PRESETS}
              onSwitch={switchPreset}
              compact
            />
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={16} />
              새로고침
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <PmoFilters
          values={filters}
          onChange={handleFilterChange}
          activePreset={currentPreset}
        />

        {/* Preset-driven KPI Row */}
        <PmoKpiRow preset={currentPreset} portfolioStats={portfolioStats} />

        {/* Health Matrix Table */}
        <HealthMatrixTable
          projects={undefined}
          selectedProjectId={selectedProject?.id}
          onSelect={handleProjectSelect}
        />

        {/* Widget Grid - Row 1 (preserved from original) */}
        <div className="grid grid-cols-2 gap-6">
          <RequirementsSummaryWidget projectId={projectId} />
          <TestingSummaryWidget projectId={projectId} />
        </div>

        {/* Widget Grid - Row 2 */}
        <div className="grid grid-cols-2 gap-6">
          <IssuesSummaryWidget projectId={projectId} />
          <DeliverablesSummaryWidget projectId={projectId} />
        </div>

        {/* Widget Grid - Row 3 */}
        <div className="grid grid-cols-2 gap-6">
          <MeetingsSummaryWidget projectId={projectId} />
          <ScheduleSummaryWidget projectId={projectId} />
        </div>
      </div>

      {/* Right Panel */}
      <PmoRightPanel
        mode={panelMode}
        onModeChange={setPanelMode}
        onClose={handlePanelClose}
        selectedProject={selectedProject}
      />
    </div>
  );
}
