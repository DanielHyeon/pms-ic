import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { unwrapOrThrow } from '../../utils/toViewState';

export const phaseKeys = {
  all: ['phases'] as const,
  lists: () => [...phaseKeys.all, 'list'] as const,
  list: (projectId?: string) => [...phaseKeys.lists(), { projectId }] as const,
  details: () => [...phaseKeys.all, 'detail'] as const,
  detail: (id: string) => [...phaseKeys.details(), id] as const,
  deliverables: (phaseId: string) => [...phaseKeys.detail(phaseId), 'deliverables'] as const,
  kpis: (phaseId: string) => [...phaseKeys.detail(phaseId), 'kpis'] as const,
};

export function usePhases(projectId?: string) {
  return useQuery({
    queryKey: phaseKeys.list(projectId),
    queryFn: async () => {
      const result = await apiService.getPhasesResult(projectId);
      return unwrapOrThrow(result);
    },
    enabled: !!projectId,
  });
}

export function usePhase(id: string) {
  return useQuery({
    queryKey: phaseKeys.detail(id),
    queryFn: async () => {
      const result = await apiService.getPhaseResult(id);
      return unwrapOrThrow(result);
    },
    enabled: !!id,
  });
}

export function useCreatePhase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: Parameters<typeof apiService.createPhase>[1] }) =>
      apiService.createPhase(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: phaseKeys.lists() });
    },
  });
}

export function useUpdatePhase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof apiService.updatePhase>[1] }) =>
      apiService.updatePhase(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: phaseKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: phaseKeys.lists() });
    },
  });
}

export function useDeletePhase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiService.deletePhase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: phaseKeys.lists() });
    },
  });
}

export function usePhaseDeliverables(phaseId: string) {
  return useQuery({
    queryKey: phaseKeys.deliverables(phaseId),
    queryFn: async () => {
      const result = await apiService.getPhaseDeliverablesResult(phaseId);
      return unwrapOrThrow(result);
    },
    enabled: !!phaseId,
  });
}

export function useUploadDeliverable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: Parameters<typeof apiService.uploadDeliverable>[0]) =>
      apiService.uploadDeliverable(params),
    onSuccess: (_, { phaseId }) => {
      queryClient.invalidateQueries({ queryKey: phaseKeys.deliverables(phaseId) });
    },
  });
}

export function usePhaseKpis(phaseId: string) {
  return useQuery({
    queryKey: phaseKeys.kpis(phaseId),
    queryFn: async () => {
      const result = await apiService.getPhaseKpisResult(phaseId);
      return unwrapOrThrow(result);
    },
    enabled: !!phaseId,
  });
}

export function useAllPhases() {
  return useQuery({
    queryKey: phaseKeys.lists(),
    queryFn: async () => {
      const result = await apiService.getPhasesResult();
      return unwrapOrThrow(result);
    },
  });
}

export function useUpdateDeliverable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      phaseId,
      deliverableId,
      data,
    }: {
      phaseId: string;
      deliverableId: string;
      data: { status?: string; approver?: string };
    }) => apiService.updateDeliverable(phaseId, deliverableId, data),
    onSuccess: (_, { phaseId }) => {
      queryClient.invalidateQueries({ queryKey: phaseKeys.deliverables(phaseId) });
    },
  });
}

export function useCreatePhaseKpi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      phaseId,
      data,
    }: {
      phaseId: string;
      data: { name: string; target: string; current?: string; status?: string };
    }) => apiService.createPhaseKpi(phaseId, data),
    onSuccess: (_, { phaseId }) => {
      queryClient.invalidateQueries({ queryKey: phaseKeys.kpis(phaseId) });
    },
  });
}

export function useUpdatePhaseKpi() {
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
    }) => apiService.updatePhaseKpi(phaseId, kpiId, data),
    onSuccess: (_, { phaseId }) => {
      queryClient.invalidateQueries({ queryKey: phaseKeys.kpis(phaseId) });
    },
  });
}

export function useDeletePhaseKpi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ phaseId, kpiId }: { phaseId: string; kpiId: string }) =>
      apiService.deletePhaseKpi(phaseId, kpiId),
    onSuccess: (_, { phaseId }) => {
      queryClient.invalidateQueries({ queryKey: phaseKeys.kpis(phaseId) });
    },
  });
}

export function useApproveDeliverable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      deliverableId,
      approved,
    }: {
      deliverableId: string;
      approved: boolean;
      phaseId?: string;
    }) => apiService.approveDeliverable(deliverableId, approved),
    onSuccess: (_, { phaseId }) => {
      if (phaseId) {
        queryClient.invalidateQueries({ queryKey: phaseKeys.deliverables(phaseId) });
      }
      queryClient.invalidateQueries({ queryKey: phaseKeys.lists() });
    },
  });
}

// Phase type for internal use
interface PhaseBasic {
  id: string;
  name: string;
  [key: string]: unknown;
}

// Project-level deliverables hook - aggregates deliverables from all phases
export function useProjectDeliverables(projectId?: string) {
  const { data: phases = [] } = usePhases(projectId);
  const typedPhases = phases as PhaseBasic[];

  return useQuery({
    queryKey: [...phaseKeys.all, 'project-deliverables', { projectId }],
    queryFn: async () => {
      if (!typedPhases || typedPhases.length === 0) return [];

      const phaseIds = typedPhases.map((p) => p.id);
      const deliverablePromises = phaseIds.map(async (phaseId: string) => {
        const result = await apiService.getPhaseDeliverablesResult(phaseId);
        return unwrapOrThrow(result);
      });

      const results = await Promise.all(deliverablePromises);

      // Flatten and add phase info to each deliverable
      const allDeliverables: Array<{ phaseId: string; phaseName: string; [key: string]: unknown }> = [];
      results.forEach((deliverables, index) => {
        const phase = typedPhases[index];
        if (Array.isArray(deliverables)) {
          deliverables.forEach((d: Record<string, unknown>) => {
            allDeliverables.push({
              ...d,
              phaseId: phase.id,
              phaseName: phase.name,
            });
          });
        }
      });

      return allDeliverables;
    },
    enabled: !!projectId && typedPhases.length > 0,
  });
}
