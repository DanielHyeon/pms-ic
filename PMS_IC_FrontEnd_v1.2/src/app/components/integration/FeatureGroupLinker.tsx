import { useState } from 'react';
import {
  Link2,
  LinkIcon,
  Unlink,
  Loader2,
  ChevronDown,
  ChevronRight,
  Box,
  Plus,
} from 'lucide-react';
import { Feature, getPriorityColor, getPriorityLabel } from '../../../types/backlog';
import { WbsGroup } from '../../../types/wbs';
import {
  useFeaturesByWbsGroup,
  useUnlinkedFeatures,
  useLinkFeatureToWbsGroup,
  useUnlinkFeatureFromWbsGroup,
} from '../../../hooks/api/useWbsBacklogIntegration';

interface FeatureGroupLinkerProps {
  wbsGroupId: string;
  groupName: string;
  epicId?: string;
  canEdit?: boolean;
}

export default function FeatureGroupLinker({
  wbsGroupId,
  groupName,
  epicId,
  canEdit = true,
}: FeatureGroupLinkerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);

  const { data: linkedFeatures = [], isLoading: loadingLinked } = useFeaturesByWbsGroup(wbsGroupId);
  const { data: unlinkedFeatures = [], isLoading: loadingUnlinked } = useUnlinkedFeatures(epicId);

  const linkMutation = useLinkFeatureToWbsGroup();
  const unlinkMutation = useUnlinkFeatureFromWbsGroup();

  const handleLink = async (featureId: string) => {
    await linkMutation.mutateAsync({ featureId, wbsGroupId });
    setShowLinkModal(false);
  };

  const handleUnlink = async (featureId: string) => {
    if (window.confirm('이 Feature의 WBS Group 연결을 해제하시겠습니까?')) {
      await unlinkMutation.mutateAsync({ featureId, wbsGroupId });
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 bg-purple-50 cursor-pointer hover:bg-purple-100"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <Box size={18} className="text-purple-600" />
          <span className="font-medium text-gray-900">WBS Group-Feature 연결</span>
          <span className="text-sm text-gray-500">({linkedFeatures.length}개 연결됨)</span>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowLinkModal(true);
            }}
            className="flex items-center gap-1 px-2 py-1 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
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
          ) : linkedFeatures.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              연결된 Feature가 없습니다.
            </p>
          ) : (
            <div className="space-y-2">
              {linkedFeatures.map((feature) => (
                <div
                  key={feature.id}
                  className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-purple-300"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Box size={16} className="text-purple-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{feature.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded ${getPriorityColor(feature.priority)}`}>
                          {getPriorityLabel(feature.priority)}
                        </span>
                        <span className="text-xs text-gray-500">
                          상태: {feature.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleUnlink(feature.id)}
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
                Feature를 {groupName}에 연결
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
              ) : unlinkedFeatures.length === 0 ? (
                <p className="text-center py-8 text-gray-500">
                  연결 가능한 Feature가 없습니다.
                </p>
              ) : (
                <div className="space-y-2">
                  {unlinkedFeatures.map((feature) => (
                    <button
                      key={feature.id}
                      type="button"
                      onClick={() => handleLink(feature.id)}
                      disabled={linkMutation.isPending}
                      className="w-full flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Box size={16} className="text-purple-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{feature.name}</div>
                          <span className={`text-xs px-2 py-0.5 rounded ${getPriorityColor(feature.priority)}`}>
                            {getPriorityLabel(feature.priority)}
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
