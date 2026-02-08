import { useMemo } from 'react';
import { Lock } from 'lucide-react';
import { isReadOnly as checkReadOnly } from '../../../utils/rolePermissions';
import { useProject } from '../../../contexts/ProjectContext';
import { useProjectDashboardStats, useWeightedProgress } from '../../../hooks/api/useDashboard';
import { PresetSwitcher } from '../common/PresetSwitcher';
import { renderWidget } from './widgetRegistry';
import type { DashboardPresetLayout } from './presetLayouts';
import type { WidgetProps } from './widgets/types';
import type { UserRole } from '../../App';
import type { ViewModePreset } from '../../../types/menuOntology';

interface DashboardShellProps {
  layout: DashboardPresetLayout;
  projectId: string | null;
  userRole: string;
  readOnly?: boolean;
  onViewChange?: (view: string) => void;
  currentPreset: ViewModePreset;
  onSwitchPreset: (preset: ViewModePreset) => void;
}

/**
 * DashboardShell assembles widgets based on the current preset layout.
 * It renders:
 *   - Header (project name + preset switcher)
 *   - Read-only banner (if applicable)
 *   - KPI Row
 *   - Main content area (2-column if rightPanel exists)
 */
export function DashboardShell({
  layout,
  projectId,
  userRole,
  readOnly: readOnlyProp,
  onViewChange,
  currentPreset,
  onSwitchPreset,
}: DashboardShellProps) {
  const { currentProject } = useProject();
  const isReadOnly = readOnlyProp ?? checkReadOnly(userRole as UserRole);

  // Pre-fetch the two main loading queries so we can show a loading spinner
  const { isLoading: isLoadingStats } = useProjectDashboardStats(projectId);
  const { isLoading: isLoadingProgress } = useWeightedProgress(projectId);

  const widgetProps: WidgetProps = useMemo(
    () => ({
      projectId,
      userRole,
      density: layout.ui.density,
      onNavigate: onViewChange,
    }),
    [projectId, userRole, layout.ui.density, onViewChange],
  );

  const { kpiRow, main, rightPanel } = layout.slots;
  const hasRightPanel = rightPanel && rightPanel.length > 0;

  // Show loading state for project-specific views
  if (projectId && (isLoadingStats || isLoadingProgress)) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">대시보드 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {currentProject ? currentProject.name : '포트폴리오 대시보드'}
          </h1>
          {currentProject && (
            <p className="text-gray-600 mt-1">프로젝트 현황을 한눈에 확인하세요</p>
          )}
          {!currentProject && (
            <p className="text-gray-600 mt-1">전체 프로젝트 현황을 한눈에 확인하세요</p>
          )}
        </div>
        <PresetSwitcher
          currentPreset={currentPreset}
          onSwitch={onSwitchPreset}
          compact
        />
      </div>

      {/* Read-only banner */}
      {isReadOnly && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
          <Lock className="text-amber-600" size={20} />
          <div>
            <p className="text-sm font-medium text-amber-900">읽기 전용 모드</p>
            <p className="text-xs text-amber-700">현재 역할은 조회 권한만 가지고 있습니다.</p>
          </div>
        </div>
      )}

      {/* KPI Row */}
      {kpiRow.length > 0 && (
        <div
          className={`grid grid-cols-1 gap-6 ${
            kpiRow.length <= 3
              ? 'md:grid-cols-3'
              : 'md:grid-cols-2 lg:grid-cols-4'
          }`}
        >
          {kpiRow.map((key) => (
            <div key={key}>{renderWidget(key, widgetProps)}</div>
          ))}
        </div>
      )}

      {/* Main + Right Panel */}
      {hasRightPanel ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content: takes 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            {main.map((key) => (
              <div key={key}>{renderWidget(key, widgetProps)}</div>
            ))}
          </div>

          {/* Right panel: takes 1/3 width */}
          <div className="space-y-6">
            {rightPanel.map((key) => (
              <div key={key}>{renderWidget(key, widgetProps)}</div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {main.map((key) => (
            <div key={key}>{renderWidget(key, widgetProps)}</div>
          ))}
        </div>
      )}
    </div>
  );
}
