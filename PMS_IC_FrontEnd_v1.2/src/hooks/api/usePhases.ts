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
