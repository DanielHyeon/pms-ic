import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { unwrapOrThrow } from '../../utils/toViewState';
import { WbsSnapshot, CreateSnapshotRequest } from '../../types/wbsSnapshot';

/**
 * Query keys for WBS snapshots
 */
export const snapshotKeys = {
  all: ['wbs-snapshots'] as const,
  byPhase: (phaseId: string) => [...snapshotKeys.all, 'phase', phaseId] as const,
  byProject: (projectId: string) => [...snapshotKeys.all, 'project', projectId] as const,
  detail: (snapshotId: string) => [...snapshotKeys.all, 'detail', snapshotId] as const,
};

/**
 * Hook to get all snapshots for a phase
 */
export function useWbsSnapshotsByPhase(phaseId: string) {
  return useQuery<WbsSnapshot[]>({
    queryKey: snapshotKeys.byPhase(phaseId),
    queryFn: async () => {
      const result = await apiService.getWbsSnapshotsByPhaseResult(phaseId);
      return unwrapOrThrow(result);
    },
    enabled: !!phaseId,
  });
}

/**
 * Hook to get all snapshots for a project
 */
export function useWbsSnapshotsByProject(projectId: string) {
  return useQuery<WbsSnapshot[]>({
    queryKey: snapshotKeys.byProject(projectId),
    queryFn: async () => {
      const result = await apiService.getWbsSnapshotsByProjectResult(projectId);
      return unwrapOrThrow(result);
    },
    enabled: !!projectId,
  });
}

/**
 * Hook to get a specific snapshot
 */
export function useWbsSnapshot(snapshotId: string) {
  return useQuery<WbsSnapshot>({
    queryKey: snapshotKeys.detail(snapshotId),
    queryFn: async () => {
      const result = await apiService.getWbsSnapshotResult(snapshotId);
      return unwrapOrThrow(result);
    },
    enabled: !!snapshotId,
  });
}

/**
 * Hook to create a WBS snapshot
 */
export function useCreateWbsSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateSnapshotRequest): Promise<WbsSnapshot> => {
      const result = await apiService.createWbsSnapshotResult(request);
      return unwrapOrThrow(result);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: snapshotKeys.byPhase(variables.phaseId) });
      if (data?.projectId) {
        queryClient.invalidateQueries({ queryKey: snapshotKeys.byProject(data.projectId) });
      }
    },
    onError: (error) => {
      console.error('Failed to create WBS snapshot:', error);
    },
  });
}

/**
 * Hook to restore a WBS snapshot
 */
export function useRestoreWbsSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (snapshotId: string): Promise<void> => {
      const result = await apiService.restoreWbsSnapshotResult(snapshotId);
      unwrapOrThrow(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: snapshotKeys.all });
      queryClient.invalidateQueries({ queryKey: ['wbs'] });
      queryClient.invalidateQueries({ queryKey: ['phases'] });
    },
    onError: (error) => {
      console.error('Failed to restore WBS snapshot:', error);
    },
  });
}

/**
 * Hook to delete a WBS snapshot
 */
export function useDeleteWbsSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (snapshotId: string): Promise<void> => {
      const result = await apiService.deleteWbsSnapshotResult(snapshotId);
      unwrapOrThrow(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: snapshotKeys.all });
    },
    onError: (error) => {
      console.error('Failed to delete WBS snapshot:', error);
    },
  });
}
