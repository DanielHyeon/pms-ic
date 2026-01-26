import { useState, useEffect } from 'react';
import {
  Database,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  Loader,
  CheckCircle,
  AlertCircle,
  History,
  HardDrive,
  Server,
  Clock,
  XCircle,
} from 'lucide-react';
import {
  useDbSyncStatus,
  useDbSync,
  useDbSyncHistory,
  useDbBackupStatus,
  useDbBackup,
  useDbBackups,
  useDbRestore,
  useDeleteDbBackup,
  useDbStats,
  type SyncHistoryItem,
  type BackupHistoryItem,
} from '../../hooks/api/useDbAdmin';

interface StatCardProps {
  label: string;
  value: number | string | null | undefined;
  unit?: string;
  type?: 'number' | 'date' | 'size';
}

function StatCard({ label, value, unit, type = 'number' }: StatCardProps) {
  const formatValue = () => {
    if (value === null || value === undefined) return '-';

    if (type === 'date' && typeof value === 'string') {
      return new Date(value).toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    if (type === 'size' && typeof value === 'number') {
      if (value < 1024) return `${value} B`;
      if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
      if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
      return `${(value / 1024 / 1024 / 1024).toFixed(2)} GB`;
    }

    return `${value}${unit ? ` ${unit}` : ''}`;
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className="text-xl font-semibold text-gray-900">{formatValue()}</div>
    </div>
  );
}

interface BackupHistoryItemProps {
  backup: BackupHistoryItem;
  onRestore: () => void;
  onDelete: () => void;
  isRestoring: boolean;
  isDeleting: boolean;
  onConfirmRestore: () => void;
  onConfirmDelete: () => void;
  onCancel: () => void;
}

function BackupHistoryRow({
  backup,
  onRestore,
  onDelete,
  isRestoring,
  isDeleting,
  onConfirmRestore,
  onConfirmDelete,
  onCancel,
}: BackupHistoryItemProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle size={12} />
            완료
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
            <Loader size={12} className="animate-spin" />
            진행중
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <XCircle size={12} />
            실패
          </span>
        );
      default:
        return <span className="text-gray-500">{status}</span>;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getBackupTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      POSTGRES: 'bg-blue-100 text-blue-700',
      NEO4J: 'bg-purple-100 text-purple-700',
      FULL: 'bg-indigo-100 text-indigo-700',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[type] || 'bg-gray-100 text-gray-700'}`}>
        {type}
      </span>
    );
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            {getBackupTypeBadge(backup.backup_type)}
            <span className="font-medium text-gray-900 truncate">{backup.backup_name}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
            <span>{formatDate(backup.started_at)}</span>
            {backup.file_size_bytes > 0 && <span>{formatFileSize(backup.file_size_bytes)}</span>}
            {backup.duration_ms && <span>{(backup.duration_ms / 1000).toFixed(1)}s</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {getStatusBadge(backup.status)}

        {backup.status === 'COMPLETED' && (
          <>
            {isRestoring ? (
              <div className="flex items-center gap-2 bg-yellow-50 px-3 py-1 rounded">
                <span className="text-sm text-yellow-700">복원하시겠습니까?</span>
                <button
                  onClick={onConfirmRestore}
                  className="px-2 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700"
                >
                  확인
                </button>
                <button onClick={onCancel} className="px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400">
                  취소
                </button>
              </div>
            ) : isDeleting ? (
              <div className="flex items-center gap-2 bg-red-50 px-3 py-1 rounded">
                <span className="text-sm text-red-700">삭제하시겠습니까?</span>
                <button
                  onClick={onConfirmDelete}
                  className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                >
                  확인
                </button>
                <button onClick={onCancel} className="px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400">
                  취소
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={onRestore}
                  className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
                  title="복원"
                >
                  <Upload size={16} />
                </button>
                <button
                  onClick={onDelete}
                  className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                  title="삭제"
                >
                  <Trash2 size={16} />
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function DatabaseSettings() {
  const [syncType, setSyncType] = useState<'full' | 'incremental'>('full');
  const [backupType, setBackupType] = useState<'POSTGRES' | 'NEO4J' | 'FULL'>('FULL');
  const [restoreConfirm, setRestoreConfirm] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Hooks
  const { data: syncStatus, refetch: refetchSyncStatus } = useDbSyncStatus();
  const { data: syncHistory } = useDbSyncHistory(5);
  const { data: backupStatus, refetch: refetchBackupStatus } = useDbBackupStatus();
  const { data: backups, refetch: refetchBackups } = useDbBackups(10);
  const { data: stats, refetch: refetchStats } = useDbStats();

  const syncMutation = useDbSync();
  const backupMutation = useDbBackup();
  const restoreMutation = useDbRestore();
  const deleteMutation = useDeleteDbBackup();

  // Polling during operations
  useEffect(() => {
    if (syncStatus?.is_syncing || backupStatus?.is_running) {
      const interval = setInterval(() => {
        refetchSyncStatus();
        refetchBackupStatus();
        refetchBackups();
        refetchStats();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [syncStatus?.is_syncing, backupStatus?.is_running]);

  const handleSync = () => {
    syncMutation.mutate({ syncType });
  };

  const handleBackup = () => {
    backupMutation.mutate({ backupType });
  };

  const handleRestore = (backupId: string) => {
    restoreMutation.mutate({ backupId });
    setRestoreConfirm(null);
  };

  const handleDelete = (backupId: string) => {
    deleteMutation.mutate({ backupId });
    setDeleteConfirm(null);
  };

  return (
    <div className="space-y-6">
      {/* Database Statistics Card */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <HardDrive className="text-blue-600" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">데이터베이스 현황</h2>
                <p className="text-sm text-gray-600">PostgreSQL 및 Neo4j 데이터베이스 상태</p>
              </div>
            </div>
            <button
              onClick={() => refetchStats()}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
              title="새로고침"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="PostgreSQL 테이블" value={stats?.postgres?.tables} unit="개" />
            <StatCard label="PostgreSQL 크기" value={stats?.postgres?.size_bytes} type="size" />
            <StatCard label="Neo4j 노드" value={stats?.neo4j?.nodes} unit="개" />
            <StatCard label="Neo4j 관계" value={stats?.neo4j?.relationships} unit="개" />
          </div>

          {stats?.neo4j?.labels && stats.neo4j.labels.length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500 mb-2">Neo4j 레이블</div>
              <div className="flex flex-wrap gap-2">
                {stats.neo4j.labels.map((label: string) => (
                  <span key={label} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mt-4">
            <StatCard label="마지막 동기화" value={stats?.last_sync_at} type="date" />
            <StatCard label="마지막 백업" value={stats?.last_backup_at} type="date" />
          </div>
        </div>
      </div>

      {/* Neo4j Sync Section */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <RefreshCw className="text-green-600" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Neo4j 동기화</h2>
              <p className="text-sm text-gray-600">PostgreSQL 데이터를 Neo4j 그래프 데이터베이스로 동기화합니다</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            MERGE 패턴을 사용하여 중복 없이 데이터가 업데이트됩니다. 전체 동기화는 모든 데이터를 동기화하고, 증분 동기화는 변경된
            데이터만 동기화합니다.
          </p>

          {/* Sync Type Selection */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="syncType"
                value="full"
                checked={syncType === 'full'}
                onChange={() => setSyncType('full')}
                className="w-4 h-4 text-green-600"
              />
              <span className="text-gray-700">전체 동기화</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="syncType"
                value="incremental"
                checked={syncType === 'incremental'}
                onChange={() => setSyncType('incremental')}
                className="w-4 h-4 text-green-600"
              />
              <span className="text-gray-700">증분 동기화</span>
            </label>
          </div>

          {/* Sync Status */}
          {syncStatus?.is_syncing && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Loader className="animate-spin text-yellow-600" size={16} />
                <span className="font-medium text-yellow-700">동기화 진행 중...</span>
                {syncStatus.current_entity && (
                  <span className="text-yellow-600">{syncStatus.current_entity}</span>
                )}
              </div>
              <div className="w-full bg-yellow-200 rounded-full h-2">
                <div
                  className="bg-yellow-600 h-2 rounded-full transition-all"
                  style={{ width: `${syncStatus.progress || 0}%` }}
                />
              </div>
            </div>
          )}

          {syncStatus?.error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="text-red-600" size={16} />
                <span className="text-red-700">{syncStatus.error}</span>
              </div>
            </div>
          )}

          <button
            onClick={handleSync}
            disabled={syncStatus?.is_syncing || syncMutation.isPending}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {syncMutation.isPending ? (
              <>
                <Loader className="animate-spin" size={16} />
                시작 중...
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                동기화 시작
              </>
            )}
          </button>

          {/* Sync History */}
          {syncHistory && syncHistory.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <History size={16} />
                최근 동기화 기록
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {syncHistory.map((item: SyncHistoryItem) => (
                  <div key={item.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      {item.status === 'COMPLETED' ? (
                        <CheckCircle size={14} className="text-green-600" />
                      ) : item.status === 'FAILED' ? (
                        <XCircle size={14} className="text-red-600" />
                      ) : (
                        <Loader size={14} className="animate-spin text-yellow-600" />
                      )}
                      <span className="text-gray-600">{item.sync_type}</span>
                      <span className="text-gray-500">
                        {item.started_at && new Date(item.started_at).toLocaleString('ko-KR')}
                      </span>
                    </div>
                    <span className="text-gray-600">
                      {item.total_records_synced} 레코드
                      {item.duration_ms && ` (${(item.duration_ms / 1000).toFixed(1)}s)`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Backup Section */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Download className="text-blue-600" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">백업 관리</h2>
              <p className="text-sm text-gray-600">데이터베이스 백업을 생성하고 관리합니다</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Backup Type Selection */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="backupType"
                value="FULL"
                checked={backupType === 'FULL'}
                onChange={() => setBackupType('FULL')}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-gray-700">전체 (PostgreSQL + Neo4j)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="backupType"
                value="POSTGRES"
                checked={backupType === 'POSTGRES'}
                onChange={() => setBackupType('POSTGRES')}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-gray-700">PostgreSQL만</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="backupType"
                value="NEO4J"
                checked={backupType === 'NEO4J'}
                onChange={() => setBackupType('NEO4J')}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-gray-700">Neo4j만</span>
            </label>
          </div>

          {/* Backup Status */}
          {backupStatus?.is_running && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Loader className="animate-spin text-blue-600" size={16} />
                <span className="font-medium text-blue-700">백업 진행 중...</span>
                {backupStatus.backup_name && <span className="text-blue-600">{backupStatus.backup_name}</span>}
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${backupStatus.progress || 0}%` }}
                />
              </div>
            </div>
          )}

          <button
            onClick={handleBackup}
            disabled={backupStatus?.is_running || backupMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {backupMutation.isPending ? (
              <>
                <Loader className="animate-spin" size={16} />
                시작 중...
              </>
            ) : (
              <>
                <Download size={16} />
                백업 생성
              </>
            )}
          </button>
        </div>
      </div>

      {/* Backup History Section */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <History className="text-indigo-600" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">백업 히스토리</h2>
              <p className="text-sm text-gray-600">생성된 백업 목록 및 복원</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {!backups || backups.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Database size={48} className="mx-auto mb-4 text-gray-300" />
              <p>백업 기록이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {backups.map((backup: BackupHistoryItem) => (
                <BackupHistoryRow
                  key={backup.id}
                  backup={backup}
                  onRestore={() => setRestoreConfirm(backup.id)}
                  onDelete={() => setDeleteConfirm(backup.id)}
                  isRestoring={restoreConfirm === backup.id}
                  isDeleting={deleteConfirm === backup.id}
                  onConfirmRestore={() => handleRestore(backup.id)}
                  onConfirmDelete={() => handleDelete(backup.id)}
                  onCancel={() => {
                    setRestoreConfirm(null);
                    setDeleteConfirm(null);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
