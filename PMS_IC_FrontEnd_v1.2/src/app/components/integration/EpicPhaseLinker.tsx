import { useState } from 'react';
import {
  Link2,
  LinkIcon,
  Unlink,
  Loader2,
  ChevronDown,
  ChevronRight,
  Flag,
  Plus,
} from 'lucide-react';
import { Epic, getPriorityColor, getPriorityLabel } from '../../../types/backlog';
import {
  useEpicsByPhase,
  useUnlinkedEpics,
  useLinkEpicToPhase,
  useUnlinkEpicFromPhase,
} from '../../../hooks/api/useWbsBacklogIntegration';

interface EpicPhaseLinkerProps {
  phaseId: string;
  phaseName: string;
  projectId: string;
  canEdit?: boolean;
}

export default function EpicPhaseLinker({
  phaseId,
  phaseName,
  projectId,
  canEdit = true,
}: EpicPhaseLinkerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);

  const { data: linkedEpics = [], isLoading: loadingLinked } = useEpicsByPhase(phaseId);
  const { data: unlinkedEpics = [], isLoading: loadingUnlinked } = useUnlinkedEpics(projectId);

  const linkMutation = useLinkEpicToPhase();
  const unlinkMutation = useUnlinkEpicFromPhase();

  const handleLink = async (epicId: string) => {
    await linkMutation.mutateAsync({ epicId, phaseId });
    setShowLinkModal(false);
  };

  const handleUnlink = async (epicId: string) => {
    if (window.confirm('이 Epic의 Phase 연결을 해제하시겠습니까?')) {
      await unlinkMutation.mutateAsync({ epicId, phaseId });
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <Link2 size={18} className="text-blue-600" />
          <span className="font-medium text-gray-900">Phase-Epic 연결</span>
          <span className="text-sm text-gray-500">({linkedEpics.length}개 연결됨)</span>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowLinkModal(true);
            }}
            className="flex items-center gap-1 px-2 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={14} />
            연결
          </button>
        )}
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 space-y-3">
          {loadingLinked ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 size={20} className="animate-spin text-gray-400" />
            </div>
          ) : linkedEpics.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              연결된 Epic이 없습니다.
            </p>
          ) : (
            <div className="space-y-2">
              {linkedEpics.map((epic) => (
                <div
                  key={epic.id}
                  className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: epic.color || '#3B82F6' }}
                    />
                    <div>
                      <div className="font-medium text-gray-900">{epic.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded ${getPriorityColor(epic.priority)}`}>
                          {getPriorityLabel(epic.priority)}
                        </span>
                        <span className="text-xs text-gray-500">
                          진행률: {epic.progress}%
                        </span>
                      </div>
                    </div>
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleUnlink(epic.id)}
                      disabled={unlinkMutation.isPending}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="연결 해제"
                    >
                      <Unlink size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Epic을 {phaseName}에 연결
              </h3>
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingUnlinked ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={24} className="animate-spin text-gray-400" />
                </div>
              ) : unlinkedEpics.length === 0 ? (
                <p className="text-center py-8 text-gray-500">
                  연결 가능한 Epic이 없습니다.
                </p>
              ) : (
                <div className="space-y-2">
                  {unlinkedEpics.map((epic) => (
                    <button
                      key={epic.id}
                      type="button"
                      onClick={() => handleLink(epic.id)}
                      disabled={linkMutation.isPending}
                      className="w-full flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: epic.color || '#3B82F6' }}
                        />
                        <div>
                          <div className="font-medium text-gray-900">{epic.name}</div>
                          <span className={`text-xs px-2 py-0.5 rounded ${getPriorityColor(epic.priority)}`}>
                            {getPriorityLabel(epic.priority)}
                          </span>
                        </div>
                      </div>
                      <LinkIcon size={16} className="text-gray-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="w-full px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
