import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService, KpiApiDto } from '../../services/api';
import { unwrapOrThrow } from '../../utils/toViewState';

// Re-export the DTO for consumers that import from the hook
export type { KpiApiDto };

export interface KpiDto {
  id: string;
  phaseId: string;
  name: string;
  target: string;
  current: string;
  status: string;
}

export const kpiKeys = {
  all: ['kpis'] as const,
  lists: () => [...kpiKeys.all, 'list'] as const,
  listByPhase: (phaseId?: string) => [...kpiKeys.lists(), { phaseId }] as const,
  listByStatus: (phaseId?: string, status?: string) =>
    [...kpiKeys.lists(), { phaseId, status }] as const,
  details: () => [...kpiKeys.all, 'detail'] as const,
  detail: (kpiId: string) => [...kpiKeys.details(), kpiId] as const,
};

/** Fetch all KPIs for a phase (typed) */
export function usePhaseKpisTyped(phaseId?: string) {
  return useQuery<KpiDto[]>({
    queryKey: kpiKeys.listByPhase(phaseId),
    queryFn: async () => {
      const result = await apiService.getPhaseKpisTyped(phaseId!);
      return unwrapOrThrow(result);
    },
    enabled: !!phaseId,
  });
}

/** Fetch KPIs for a phase filtered by status */
export function usePhaseKpisByStatus(phaseId?: string, status?: string) {
  return useQuery<KpiDto[]>({
    queryKey: kpiKeys.listByStatus(phaseId, status),
    queryFn: async () => {
      const result = await apiService.getPhaseKpisByStatus(phaseId!, status!);
      return unwrapOrThrow(result);
    },
    enabled: !!phaseId && !!status,
  });
}

/** Fetch a single KPI by ID */
export function useKpi(kpiId?: string) {
  return useQuery<KpiDto>({
    queryKey: kpiKeys.detail(kpiId!),
    queryFn: async () => {
      const result = await apiService.getKpiById(kpiId!);
      return unwrapOrThrow(result);
    },
    enabled: !!kpiId,
  });
}

/** Create a new KPI for a phase */
export function useCreateKpi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      phaseId,
      data,
    }: {
      phaseId: string;
      data: { name: string; target: string; current?: string; status?: string };
    }) => apiService.createKpi(phaseId, data),
    onSuccess: (_, { phaseId }) => {
      queryClient.invalidateQueries({ queryKey: kpiKeys.listByPhase(phaseId) });
      queryClient.invalidateQueries({ queryKey: kpiKeys.listByStatus(phaseId) });
    },
  });
}

/** Full update of a KPI (PUT) */
export function useUpdateKpi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      phaseId,
      kpiId,
      data,
    }: {
      phaseId: string;
      kpiId: string;
      data: { name?: string; target?: string; current?: string; status?: string };
    }) => apiService.updateKpi(phaseId, kpiId, data),
    onSuccess: (_, { phaseId, kpiId }) => {
      queryClient.invalidateQueries({ queryKey: kpiKeys.detail(kpiId) });
      queryClient.invalidateQueries({ queryKey: kpiKeys.listByPhase(phaseId) });
      queryClient.invalidateQueries({ queryKey: kpiKeys.listByStatus(phaseId) });
    },
  });
}

/** Patch KPI status only */
export function useUpdateKpiStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      kpiId,
      status,
    }: {
      kpiId: string;
      phaseId: string;
      status: string;
    }) => apiService.updateKpiStatus(kpiId, status),
    onSuccess: (_, { kpiId, phaseId }) => {
      queryClient.invalidateQueries({ queryKey: kpiKeys.detail(kpiId) });
      queryClient.invalidateQueries({ queryKey: kpiKeys.listByPhase(phaseId) });
      queryClient.invalidateQueries({ queryKey: kpiKeys.listByStatus(phaseId) });
    },
  });
}

/** Patch KPI value (current) only */
export function useUpdateKpiValue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      kpiId,
      current,
    }: {
      kpiId: string;
      phaseId: string;
      current: string;
    }) => apiService.updateKpiValue(kpiId, current),
    onSuccess: (_, { kpiId, phaseId }) => {
      queryClient.invalidateQueries({ queryKey: kpiKeys.detail(kpiId) });
      queryClient.invalidateQueries({ queryKey: kpiKeys.listByPhase(phaseId) });
      queryClient.invalidateQueries({ queryKey: kpiKeys.listByStatus(phaseId) });
    },
  });
}

/** Delete a KPI */
export function useDeleteKpi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ phaseId, kpiId }: { phaseId: string; kpiId: string }) =>
      apiService.deleteKpi(phaseId, kpiId),
    onSuccess: (_, { phaseId, kpiId }) => {
      queryClient.removeQueries({ queryKey: kpiKeys.detail(kpiId) });
      queryClient.invalidateQueries({ queryKey: kpiKeys.listByPhase(phaseId) });
      queryClient.invalidateQueries({ queryKey: kpiKeys.listByStatus(phaseId) });
    },
  });
}
