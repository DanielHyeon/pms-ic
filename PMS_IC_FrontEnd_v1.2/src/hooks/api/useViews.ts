import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { useProjectAuth, CAPABILITIES } from './useProjectAuth';
import { unwrapOrThrow } from '../../utils/toViewState';
import type { PoBacklogViewDto, PmWorkboardViewDto, PmoPortfolioViewDto } from '../../types/views';

export const viewKeys = {
  all: ['views'] as const,
  poBacklog: (projectId: string) => [...viewKeys.all, 'po-backlog', projectId] as const,
  pmWorkboard: (projectId: string) => [...viewKeys.all, 'pm-workboard', projectId] as const,
  pmoPortfolio: (projectId: string) => [...viewKeys.all, 'pmo-portfolio', projectId] as const,
};

export function usePoBacklogView(projectId?: string) {
  const { hasCapability } = useProjectAuth();
  return useQuery<PoBacklogViewDto>({
    queryKey: viewKeys.poBacklog(projectId || ''),
    queryFn: async () => {
      const result = await apiService.getPoBacklogViewResult(projectId!);
      return unwrapOrThrow(result);
    },
    enabled: !!projectId && hasCapability(CAPABILITIES.VIEW_BACKLOG),
  });
}

export function usePmWorkboardView(projectId?: string) {
  const { hasCapability } = useProjectAuth();
  return useQuery<PmWorkboardViewDto>({
    queryKey: viewKeys.pmWorkboard(projectId || ''),
    queryFn: async () => {
      const result = await apiService.getPmWorkboardViewResult(projectId!);
      return unwrapOrThrow(result);
    },
    enabled: !!projectId && hasCapability(CAPABILITIES.VIEW_STORY),
  });
}

export function usePmoPortfolioView(projectId?: string) {
  const { hasCapability } = useProjectAuth();
  return useQuery<PmoPortfolioViewDto>({
    queryKey: viewKeys.pmoPortfolio(projectId || ''),
    queryFn: async () => {
      const result = await apiService.getPmoPortfolioViewResult(projectId!);
      return unwrapOrThrow(result);
    },
    enabled: !!projectId && hasCapability(CAPABILITIES.VIEW_KPI),
  });
}
