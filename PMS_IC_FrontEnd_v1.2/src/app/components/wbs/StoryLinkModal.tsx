import { useState } from 'react';
import { X, Search, Link2, Check } from 'lucide-react';
import { useStoryWbsLinks, useLinkStoryToWbs, useUnlinkStoryFromWbs } from '../../../hooks/api/useWbs';

// Link type for story-WBS connections
interface StoryWbsLink {
  storyId: string;
  wbsItemId: string;
  linkedAt?: string;
}

interface StoryLinkModalProps {
  wbsItemId: string;
  wbsItemName: string;
  stories: Array<{
    id: string;
    title: string;
    epicName?: string;
    status: string;
    storyPoints?: number;
  }>;
  onClose: () => void;
}

export default function StoryLinkModal({
  wbsItemId,
  wbsItemName,
  stories,
  onClose,
}: StoryLinkModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: linksData } = useStoryWbsLinks();
  const links = (linksData || []) as StoryWbsLink[];
  const linkMutation = useLinkStoryToWbs();
  const unlinkMutation = useUnlinkStoryFromWbs();

  // Find linked stories for this WBS item
  const linkedStoryIds = links.filter((l) => l.wbsItemId === wbsItemId).map((l) => l.storyId);

  const filteredStories = stories.filter(
    (story) =>
      story.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (story.epicName && story.epicName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleToggleLink = (storyId: string) => {
    if (linkedStoryIds.includes(storyId)) {
      unlinkMutation.mutate({ storyId, wbsItemId });
    } else {
      linkMutation.mutate({ storyId, wbsItemId });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Story 연결</h3>
            <p className="text-sm text-gray-500">WBS Item: {wbsItemName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Story 검색..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Story List */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {filteredStories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? '검색 결과가 없습니다' : '연결할 수 있는 Story가 없습니다'}
            </div>
          ) : (
            filteredStories.map((story) => {
              const isLinked = linkedStoryIds.includes(story.id);
              return (
                <button
                  key={story.id}
                  type="button"
                  onClick={() => handleToggleLink(story.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all text-left ${
                    isLinked
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 truncate">{story.title}</span>
                      {story.storyPoints && (
                        <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                          {story.storyPoints} SP
                        </span>
                      )}
                    </div>
                    {story.epicName && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">Epic: {story.epicName}</p>
                    )}
                  </div>
                  <div className="ml-2 flex-shrink-0">
                    {isLinked ? (
                      <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                        <Check size={14} className="text-white" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 border-2 border-gray-300 rounded-full flex items-center justify-center">
                        <Link2 size={12} className="text-gray-400" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-500">{linkedStoryIds.length}개 Story 연결됨</p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
