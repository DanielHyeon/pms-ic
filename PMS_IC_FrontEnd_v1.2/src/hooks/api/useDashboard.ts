import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import type {
  ProjectDashboardDto,
  DashboardSection,
  PhaseProgressDto,
  PartStatsDto,
  WbsGroupStatsDto,
  SprintVelocityDto,
  BurndownDto,
  InsightDto,
} from '../../types/dashboard';

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
  // Section-based endpoints (DashboardSection contract)
  fullDashboard: (projectId: string) => [...dashboardKeys.all, 'project', projectId, 'full'] as const,
  phaseProgress: (projectId: string) => [...dashboardKeys.all, 'project', projectId, 'phase-progress'] as const,
  partStats: (projectId: string) => [...dashboardKeys.all, 'project', projectId, 'part-stats'] as const,
  wbsGroupStats: (projectId: string) => [...dashboardKeys.all, 'project', projectId, 'wbs-group-stats'] as const,
  sprintVelocity: (projectId: string) => [...dashboardKeys.all, 'project', projectId, 'sprint-velocity'] as const,
  burndown: (projectId: string) => [...dashboardKeys.all, 'project', projectId, 'burndown'] as const,
  insights: (projectId: string) => [...dashboardKeys.all, 'project', projectId, 'insights'] as const,
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

// ========== Section-based Hooks (DashboardSection contract) ==========

export function useFullProjectDashboard(projectId: string | null) {
  return useQuery<ProjectDashboardDto | null>({
    queryKey: dashboardKeys.fullDashboard(projectId!),
    queryFn: () => apiService.getFullProjectDashboard(projectId!),
    enabled: !!projectId,
  });
}

export function usePhaseProgress(projectId: string | null) {
  return useQuery<DashboardSection<PhaseProgressDto> | null>({
    queryKey: dashboardKeys.phaseProgress(projectId!),
    queryFn: () => apiService.getPhaseProgress(projectId!),
    enabled: !!projectId,
  });
}

export function usePartStats(projectId: string | null) {
  return useQuery<DashboardSection<PartStatsDto> | null>({
    queryKey: dashboardKeys.partStats(projectId!),
    queryFn: () => apiService.getPartStats(projectId!),
    enabled: !!projectId,
  });
}

export function useWbsGroupStats(projectId: string | null) {
  return useQuery<DashboardSection<WbsGroupStatsDto> | null>({
    queryKey: dashboardKeys.wbsGroupStats(projectId!),
    queryFn: () => apiService.getWbsGroupStats(projectId!),
    enabled: !!projectId,
  });
}

export function useSprintVelocity(projectId: string | null) {
  return useQuery<DashboardSection<SprintVelocityDto> | null>({
    queryKey: dashboardKeys.sprintVelocity(projectId!),
    queryFn: () => apiService.getSprintVelocity(projectId!),
    enabled: !!projectId,
  });
}

export function useBurndown(projectId: string | null) {
  return useQuery<DashboardSection<BurndownDto> | null>({
    queryKey: dashboardKeys.burndown(projectId!),
    queryFn: () => apiService.getBurndown(projectId!),
    enabled: !!projectId,
  });
}

export function useInsights(projectId: string | null) {
  return useQuery<DashboardSection<InsightDto[]> | null>({
    queryKey: dashboardKeys.insights(projectId!),
    queryFn: () => apiService.getInsights(projectId!),
    enabled: !!projectId,
  });
}
