import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/api';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
  activities: () => [...dashboardKeys.all, 'activities'] as const,
};

export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: () => apiService.getDashboardStats(),
  });
}

export function useActivities() {
  return useQuery({
    queryKey: dashboardKeys.activities(),
    queryFn: () => apiService.getActivities(),
  });
}
