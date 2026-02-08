/**
 * Common props passed to every dashboard widget from the DashboardShell.
 */
export interface WidgetProps {
  projectId: string | null;
  userRole: string;
  density: 'compact' | 'standard' | 'detailed';
  onNavigate?: (view: string) => void;
}
