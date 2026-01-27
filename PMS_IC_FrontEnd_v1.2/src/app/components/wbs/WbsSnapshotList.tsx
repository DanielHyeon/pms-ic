import { useState } from 'react';
import {
  Archive,
  RotateCcw,
  Trash2,
  Clock,
  AlertCircle,
  Loader2,
  FolderTree,
  ListTree,
  CheckSquare,
  GitBranch,
} from 'lucide-react';
import { WbsSnapshot } from '../../../types/wbsSnapshot';
import {
  useWbsSnapshotsByPhase,
  useRestoreWbsSnapshot,
  useDeleteWbsSnapshot,
} from '../../../hooks/api/useWbsSnapshots';

interface WbsSnapshotListProps {
  phaseId: string;
  onRestoreComplete?: () => void;
}

export default function WbsSnapshotList({ phaseId, onRestoreComplete }: WbsSnapshotListProps) {
  const { data: snapshots, isLoading } = useWbsSnapshotsByPhase(phaseId);
  const restoreMutation = useRestoreWbsSnapshot();
  const deleteMutation = useDeleteWbsSnapshot();
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleRestore = async (snapshotId: string) => {
    try {
      await restoreMutation.mutateAsync(snapshotId);
      setConfirmRestore(null);
      onRestoreComplete?.();
    } catch (error) {
      console.error('Restore failed:', error);
    }
  };

  const handleDelete = async (snapshotId: string) => {
    try {
      await deleteMutation.mutateAsync(snapshotId);
      setConfirmDelete(null);
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSnapshotTypeLabel = (type: string) => {
    return type === 'PRE_TEMPLATE' ? '템플릿 적용 전 백업' : '수동 백업';
  };

  const getSnapshotTypeColor = (type: string) => {
    return type === 'PRE_TEMPLATE'
      ? 'bg-blue-100 text-blue-700'
      : 'bg-purple-100 text-purple-700';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={24} className="text-indigo-600 animate-spin" />
        <span className="ml-2 text-gray-500">스냅샷 목록 로딩 중...</span>
      </div>
    );
  }

  if (!snapshots?.length) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Archive size={40} className="mx-auto mb-3 text-gray-300" />
        <p>저장된 스냅샷이 없습니다.</p>
        <p className="text-sm mt-1">
          템플릿을 적용하면 자동으로 백업이 생성됩니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-gray-900">백업 스냅샷 목록</h4>
        <span className="text-sm text-gray-500">{snapshots.length}개의 스냅샷</span>
      </div>

      {snapshots.map((snapshot: WbsSnapshot) => (
        <div
          key={snapshot.id}
          className="border border-gray-200 rounded-lg p-4 bg-white hover:border-indigo-200 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Archive size={20} className="text-indigo-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{snapshot.snapshotName}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${getSnapshotTypeColor(
                      snapshot.snapshotType
                    )}`}
                  >
                    {getSnapshotTypeLabel(snapshot.snapshotType)}
                  </span>
                </div>

                {snapshot.description && (
                  <p className="text-sm text-gray-500 mt-1">{snapshot.description}</p>
                )}

                <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                  <Clock size={14} />
                  <span>{formatDate(snapshot.createdAt)}</span>
                </div>

                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <FolderTree size={12} />
                    Groups: {snapshot.groupCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <ListTree size={12} />
                    Items: {snapshot.itemCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckSquare size={12} />
                    Tasks: {snapshot.taskCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <GitBranch size={12} />
                    Deps: {snapshot.dependencyCount}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmRestore(snapshot.id)}
                disabled={restoreMutation.isPending}
                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
                title="이 스냅샷으로 복원"
              >
                <RotateCcw size={18} />
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(snapshot.id)}
                disabled={deleteMutation.isPending}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                title="스냅샷 삭제"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>

          {/* Restore Confirmation */}
          {confirmRestore === snapshot.id && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-amber-800 font-medium">
                    이 스냅샷으로 복원하시겠습니까?
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    현재 Phase의 모든 WBS 데이터가 스냅샷 시점으로 교체됩니다.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => handleRestore(snapshot.id)}
                      disabled={restoreMutation.isPending}
                      className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1"
                    >
                      {restoreMutation.isPending ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          복원 중...
                        </>
                      ) : (
                        <>
                          <RotateCcw size={14} />
                          복원 실행
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmRestore(null)}
                      className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
                    >
                      취소
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Delete Confirmation */}
          {confirmDelete === snapshot.id && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle size={18} className="text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-red-800 font-medium">
                    이 스냅샷을 삭제하시겠습니까?
                  </p>
                  <p className="text-xs text-red-700 mt-1">
                    삭제된 스냅샷은 복구할 수 없습니다.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => handleDelete(snapshot.id)}
                      disabled={deleteMutation.isPending}
                      className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
                    >
                      {deleteMutation.isPending ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          삭제 중...
                        </>
                      ) : (
                        <>
                          <Trash2 size={14} />
                          삭제
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(null)}
                      className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
                    >
                      취소
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
