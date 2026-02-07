import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { useProjectAuth, CAPABILITIES } from './useProjectAuth';

export const viewKeys = {
  all: ['views'] as const,
  poBacklog: (projectId: string) => [...viewKeys.all, 'po-backlog', projectId] as const,
  pmWorkboard: (projectId: string) => [...viewKeys.all, 'pm-workboard', projectId] as const,
  pmoPortfolio: (projectId: string) => [...viewKeys.all, 'pmo-portfolio', projectId] as const,
};

export function usePoBacklogView(projectId?: string) {
  const { hasCapability } = useProjectAuth();
  return useQuery({
    queryKey: viewKeys.poBacklog(projectId || ''),
    queryFn: () => apiService.getPoBacklogView(projectId!),
    enabled: !!projectId && hasCapability(CAPABILITIES.VIEW_BACKLOG),
  });
}

export function usePmWorkboardView(projectId?: string) {
  const { hasCapability } = useProjectAuth();
  return useQuery({
    queryKey: viewKeys.pmWorkboard(projectId || ''),
    queryFn: () => apiService.getPmWorkboardView(projectId!),
    enabled: !!projectId && hasCapability(CAPABILITIES.VIEW_STORY),
  });
}

export function usePmoPortfolioView(projectId?: string) {
  const { hasCapability } = useProjectAuth();
  return useQuery({
    queryKey: viewKeys.pmoPortfolio(projectId || ''),
    queryFn: () => apiService.getPmoPortfolioView(projectId!),
    enabled: !!projectId && hasCapability(CAPABILITIES.VIEW_KPI),
  });
}
