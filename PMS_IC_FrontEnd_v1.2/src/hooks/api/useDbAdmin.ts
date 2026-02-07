import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { unwrapOrThrow } from '../../utils/toViewState';

// Types
export interface SyncStatus {
  is_syncing: boolean;
  sync_type: 'full' | 'incremental' | null;
  current_entity: string | null;
  progress: number;
  started_at: string | null;
  error: string | null;
}

export interface SyncHistoryItem {
  id: string;
  sync_type: 'FULL' | 'INCREMENTAL';
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  entities_synced: Record<string, number>;
  total_records_synced: number;
  total_records_failed: number;
  error_message: string | null;
  triggered_by: string;
  duration_ms: number;
  started_at: string | null;
  completed_at: string | null;
}

export interface BackupStatus {
  is_running: boolean;
  backup_type: 'POSTGRES' | 'NEO4J' | 'FULL' | null;
  backup_name: string | null;
  progress: number;
  started_at: string | null;
}

export interface BackupHistoryItem {
  id: string;
  backup_type: 'POSTGRES' | 'NEO4J' | 'FULL';
  backup_name: string;
  file_path: string;
  file_size_bytes: number;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  error_message: string | null;
  created_by: string;
  duration_ms: number;
  started_at: string | null;
  completed_at: string | null;
}

export interface DbStats {
  postgres: {
    tables: number;
    total_rows: number;
    size_bytes: number;
    error?: string;
  };
  neo4j: {
    nodes: number;
    relationships: number;
    labels: string[];
    error?: string;
  };
  last_sync_at: string | null;
  last_backup_at: string | null;
}

// Query keys
export const dbAdminKeys = {
  all: ['dbAdmin'] as const,
  syncStatus: () => [...dbAdminKeys.all, 'syncStatus'] as const,
  syncHistory: (limit?: number) => [...dbAdminKeys.all, 'syncHistory', { limit }] as const,
  backupStatus: () => [...dbAdminKeys.all, 'backupStatus'] as const,
  backups: (limit?: number) => [...dbAdminKeys.all, 'backups', { limit }] as const,
  stats: () => [...dbAdminKeys.all, 'stats'] as const,
};

// ========== Sync Hooks ==========

export function useDbSyncStatus() {
  return useQuery<SyncStatus>({
    queryKey: dbAdminKeys.syncStatus(),
    queryFn: async () => {
      const result = await apiService.getDbSyncStatusResult();
      return unwrapOrThrow(result);
    },
    refetchInterval: (query) => {
      // Auto-refetch every 2 seconds when syncing
      const data = query.state.data as SyncStatus | undefined;
      return data?.is_syncing ? 2000 : false;
    },
  });
}

export function useDbSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ syncType }: { syncType: 'full' | 'incremental' }) =>
      apiService.triggerDbSync(syncType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dbAdminKeys.syncStatus() });
      queryClient.invalidateQueries({ queryKey: dbAdminKeys.syncHistory() });
    },
  });
}

export function useDbSyncHistory(limit: number = 10) {
  return useQuery<SyncHistoryItem[]>({
    queryKey: dbAdminKeys.syncHistory(limit),
    queryFn: async () => {
      const result = await apiService.getDbSyncHistoryResult(limit);
      return unwrapOrThrow(result);
    },
  });
}

// ========== Backup Hooks ==========

export function useDbBackupStatus() {
  return useQuery<BackupStatus>({
    queryKey: dbAdminKeys.backupStatus(),
    queryFn: async () => {
      const result = await apiService.getDbBackupStatusResult();
      return unwrapOrThrow(result);
    },
    refetchInterval: (query) => {
      // Auto-refetch every 2 seconds when backup is running
      const data = query.state.data as BackupStatus | undefined;
      return data?.is_running ? 2000 : false;
    },
  });
}

export function useDbBackup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ backupType }: { backupType: 'POSTGRES' | 'NEO4J' | 'FULL' }) =>
      apiService.createDbBackup(backupType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dbAdminKeys.backupStatus() });
      queryClient.invalidateQueries({ queryKey: dbAdminKeys.backups() });
    },
  });
}

export function useDbBackups(limit: number = 20) {
  return useQuery<BackupHistoryItem[]>({
    queryKey: dbAdminKeys.backups(limit),
    queryFn: async () => {
      const result = await apiService.getDbBackupsResult(limit);
      return unwrapOrThrow(result);
    },
  });
}

export function useDbRestore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ backupId }: { backupId: string }) =>
      apiService.restoreDbBackup(backupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dbAdminKeys.all });
    },
  });
}

export function useDeleteDbBackup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ backupId }: { backupId: string }) =>
      apiService.deleteDbBackup(backupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dbAdminKeys.backups() });
    },
  });
}

// ========== Stats Hook ==========

export function useDbStats() {
  return useQuery<DbStats>({
    queryKey: dbAdminKeys.stats(),
    queryFn: async () => {
      const result = await apiService.getDbStatsResult();
      return unwrapOrThrow(result);
    },
    staleTime: 30000, // 30 seconds - stats don't change frequently
  });
}
