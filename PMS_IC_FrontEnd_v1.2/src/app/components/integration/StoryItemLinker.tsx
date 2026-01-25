import { useState } from 'react';
import {
  Link2,
  LinkIcon,
  Unlink,
  Loader2,
  ChevronDown,
  ChevronRight,
  FileText,
  Plus,
} from 'lucide-react';
import { UserStory, getStoryStatusColor, getStoryStatusLabel, getPriorityColor, getPriorityLabel } from '../../../types/backlog';
import {
  useStoriesByWbsItem,
  useUnlinkedStories,
  useLinkStoryToWbsItem,
  useUnlinkStoryFromWbsItem,
} from '../../../hooks/api/useWbsBacklogIntegration';

interface StoryItemLinkerProps {
  wbsItemId: string;
  itemName: string;
  featureId?: string;
  epicId?: string;
  canEdit?: boolean;
}

export default function StoryItemLinker({
  wbsItemId,
  itemName,
  featureId,
  epicId,
  canEdit = true,
}: StoryItemLinkerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);

  const { data: linkedStories = [], isLoading: loadingLinked } = useStoriesByWbsItem(wbsItemId);
  const { data: unlinkedStories = [], isLoading: loadingUnlinked } = useUnlinkedStories(featureId, epicId);

  const linkMutation = useLinkStoryToWbsItem();
  const unlinkMutation = useUnlinkStoryFromWbsItem();

  const handleLink = async (storyId: string) => {
    await linkMutation.mutateAsync({ storyId, wbsItemId });
    setShowLinkModal(false);
  };

  const handleUnlink = async (storyId: string) => {
    if (window.confirm('이 Story의 WBS Item 연결을 해제하시겠습니까?')) {
      await unlinkMutation.mutateAsync({ storyId, wbsItemId });
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 bg-green-50 cursor-pointer hover:bg-green-100"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <FileText size={18} className="text-green-600" />
          <span className="font-medium text-gray-900">WBS Item-Story 연결</span>
          <span className="text-sm text-gray-500">({linkedStories.length}개 연결됨)</span>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowLinkModal(true);
            }}
            className="flex items-center gap-1 px-2 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
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
          ) : linkedStories.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              연결된 Story가 없습니다.
            </p>
          ) : (
            <div className="space-y-2">
              {linkedStories.map((story) => (
                <div
                  key={story.id}
                  className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-green-300"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <FileText size={16} className="text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{story.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded ${getStoryStatusColor(story.status)}`}>
                          {getStoryStatusLabel(story.status)}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${getPriorityColor(story.priority)}`}>
                          {getPriorityLabel(story.priority)}
                        </span>
                        {story.storyPoints && (
                          <span className="text-xs text-gray-500">
                            {story.storyPoints} pts
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleUnlink(story.id)}
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
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Story를 {itemName}에 연결
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
              ) : unlinkedStories.length === 0 ? (
                <p className="text-center py-8 text-gray-500">
                  연결 가능한 Story가 없습니다.
                </p>
              ) : (
                <div className="space-y-2">
                  {unlinkedStories.map((story) => (
                    <button
                      key={story.id}
                      type="button"
                      onClick={() => handleLink(story.id)}
                      disabled={linkMutation.isPending}
                      className="w-full flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <FileText size={16} className="text-green-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{story.title}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded ${getStoryStatusColor(story.status)}`}>
                              {getStoryStatusLabel(story.status)}
                            </span>
                            {story.storyPoints && (
                              <span className="text-xs text-gray-500">
                                {story.storyPoints} pts
                              </span>
                            )}
                          </div>
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
