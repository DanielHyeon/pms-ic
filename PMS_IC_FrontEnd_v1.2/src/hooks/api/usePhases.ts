import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';

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
    queryFn: () => apiService.getPhases(projectId),
    enabled: !!projectId,
  });
}

export function usePhase(id: string) {
  return useQuery({
    queryKey: phaseKeys.detail(id),
    queryFn: () => apiService.getPhase(id),
    enabled: !!id,
  });
}

export function useCreatePhase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof apiService.createPhase>[0]) =>
      apiService.createPhase(data),
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
    queryFn: () => apiService.getPhaseDeliverables(phaseId),
    enabled: !!phaseId,
  });
}

export function useUploadDeliverable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ phaseId, formData }: { phaseId: string; formData: FormData }) =>
      apiService.uploadDeliverable(phaseId, formData),
    onSuccess: (_, { phaseId }) => {
      queryClient.invalidateQueries({ queryKey: phaseKeys.deliverables(phaseId) });
    },
  });
}

export function usePhaseKpis(phaseId: string) {
  return useQuery({
    queryKey: phaseKeys.kpis(phaseId),
    queryFn: () => apiService.getPhaseKpis(phaseId),
    enabled: !!phaseId,
  });
}

export function useAllPhases() {
  return useQuery({
    queryKey: phaseKeys.lists(),
    queryFn: () => apiService.getPhases(),
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
