import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';
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
  return useQuery({
    queryKey: snapshotKeys.byPhase(phaseId),
    queryFn: async (): Promise<WbsSnapshot[]> => {
      const result = await apiService.getWbsSnapshotsByPhase(phaseId);
      return result || [];
    },
    enabled: !!phaseId,
  });
}

/**
 * Hook to get all snapshots for a project
 */
export function useWbsSnapshotsByProject(projectId: string) {
  return useQuery({
    queryKey: snapshotKeys.byProject(projectId),
    queryFn: async (): Promise<WbsSnapshot[]> => {
      const result = await apiService.getWbsSnapshotsByProject(projectId);
      return result || [];
    },
    enabled: !!projectId,
  });
}

/**
 * Hook to get a specific snapshot
 */
export function useWbsSnapshot(snapshotId: string) {
  return useQuery({
    queryKey: snapshotKeys.detail(snapshotId),
    queryFn: async (): Promise<WbsSnapshot | null> => {
      return apiService.getWbsSnapshot(snapshotId);
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
      const result = await apiService.createWbsSnapshot(request);
      if (!result) {
        throw new Error('Failed to create snapshot');
      }
      return result as unknown as WbsSnapshot;
    },
    onSuccess: (data, variables) => {
      // Invalidate snapshots for the phase
      queryClient.invalidateQueries({ queryKey: snapshotKeys.byPhase(variables.phaseId) });
      // Also invalidate project-level snapshots if we have projectId
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
      await apiService.restoreWbsSnapshot(snapshotId);
    },
    onSuccess: () => {
      // Invalidate all snapshot queries
      queryClient.invalidateQueries({ queryKey: snapshotKeys.all });
      // Invalidate WBS data as it has been restored
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
      await apiService.deleteWbsSnapshot(snapshotId);
    },
    onSuccess: () => {
      // Invalidate all snapshot queries
      queryClient.invalidateQueries({ queryKey: snapshotKeys.all });
    },
    onError: (error) => {
      console.error('Failed to delete WBS snapshot:', error);
    },
  });
}
