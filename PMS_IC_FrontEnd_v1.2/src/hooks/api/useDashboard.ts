import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/api';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  // Portfolio view (aggregated across user's accessible projects)
  portfolioStats: () => [...dashboardKeys.all, 'portfolio', 'stats'] as const,
  portfolioActivities: () => [...dashboardKeys.all, 'portfolio', 'activities'] as const,
  // Project-specific view
  projectStats: (projectId: string) => [...dashboardKeys.all, 'project', projectId, 'stats'] as const,
  projectActivities: (projectId: string) => [...dashboardKeys.all, 'project', projectId, 'activities'] as const,
  // Weighted progress (track-based)
  weightedProgress: (projectId: string) => [...dashboardKeys.all, 'project', projectId, 'weighted-progress'] as const,
  // Legacy keys (for backward compatibility)
  stats: () => dashboardKeys.portfolioStats(),
  activities: () => dashboardKeys.portfolioActivities(),
};

// ========== Portfolio Hooks ==========

export function usePortfolioDashboardStats() {
  return useQuery({
    queryKey: dashboardKeys.portfolioStats(),
    queryFn: () => apiService.getPortfolioDashboardStats(),
  });
}

export function usePortfolioActivities() {
  return useQuery({
    queryKey: dashboardKeys.portfolioActivities(),
    queryFn: () => apiService.getPortfolioActivities(),
  });
}

// ========== Project-Specific Hooks ==========

export function useProjectDashboardStats(projectId: string | null) {
  return useQuery({
    queryKey: dashboardKeys.projectStats(projectId!),
    queryFn: () => apiService.getProjectDashboardStats(projectId!),
    enabled: !!projectId,
  });
}

export function useProjectActivities(projectId: string | null) {
  return useQuery({
    queryKey: dashboardKeys.projectActivities(projectId!),
    queryFn: () => apiService.getProjectActivities(projectId!),
    enabled: !!projectId,
  });
}

// ========== Smart Hooks (auto-select based on view mode) ==========

/**
 * Smart hook that returns portfolio or project stats based on view mode.
 * @param projectId - Project ID for project-specific view (null for portfolio)
 * @param isPortfolioView - true for portfolio view, false for project view
 */
export function useDashboardStats(projectId: string | null, isPortfolioView: boolean) {
  const portfolioQuery = usePortfolioDashboardStats();
  const projectQuery = useProjectDashboardStats(projectId);

  return isPortfolioView ? portfolioQuery : projectQuery;
}

/**
 * Smart hook that returns portfolio or project activities based on view mode.
 * @param projectId - Project ID for project-specific view (null for portfolio)
 * @param isPortfolioView - true for portfolio view, false for project view
 */
export function useActivities(projectId: string | null, isPortfolioView: boolean) {
  const portfolioQuery = usePortfolioActivities();
  const projectQuery = useProjectActivities(projectId);

  return isPortfolioView ? portfolioQuery : projectQuery;
}

// ========== Weighted Progress Hooks ==========

export interface WeightedProgressDto {
  aiProgress: number;
  siProgress: number;
  commonProgress: number;
  weightedProgress: number;
  aiWeight: number;
  siWeight: number;
  commonWeight: number;
  aiTotalTasks: number;
  aiCompletedTasks: number;
  siTotalTasks: number;
  siCompletedTasks: number;
  commonTotalTasks: number;
  commonCompletedTasks: number;
  totalTasks: number;
  completedTasks: number;
}

/**
 * Hook for fetching weighted progress based on AI/SI/Common track weights.
 * @param projectId - Project ID to fetch weighted progress for
 */
export function useWeightedProgress(projectId: string | null) {
  return useQuery<WeightedProgressDto>({
    queryKey: dashboardKeys.weightedProgress(projectId!),
    queryFn: () => apiService.getWeightedProgress(projectId!),
    enabled: !!projectId,
  });
}
