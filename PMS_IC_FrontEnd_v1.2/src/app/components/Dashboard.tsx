import { UserRole } from '../App';
import { canViewPortfolio } from '../../utils/rolePermissions';
import { useProject } from '../../contexts/ProjectContext';
import { usePreset } from '../../hooks/usePreset';
import { presetLayouts } from './dashboard/presetLayouts';
import { DashboardShell } from './dashboard/DashboardShell';

/**
 * Dashboard entry point.
 *
 * This is a thin wrapper that resolves the effective preset layout
 * based on the user's role and current project selection, then
 * delegates all rendering to DashboardShell.
 */
export default function Dashboard({ userRole }: { userRole: UserRole }) {
  const { currentProject } = useProject();
  const { currentPreset, switchPreset } = usePreset(userRole.toUpperCase());

  const showPortfolioView = canViewPortfolio(userRole) && !currentProject;

  // For PMO roles without a selected project, force PMO_CONTROL layout
  const effectivePreset = showPortfolioView ? 'PMO_CONTROL' : currentPreset;
  const layout = presetLayouts[effectivePreset] || presetLayouts.PM_WORK;

  return (
    <DashboardShell
      layout={layout}
      projectId={currentProject?.id || null}
      userRole={userRole}
      currentPreset={effectivePreset}
      onSwitchPreset={switchPreset}
    />
  );
}
