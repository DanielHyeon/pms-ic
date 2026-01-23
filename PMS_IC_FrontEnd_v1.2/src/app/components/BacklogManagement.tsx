import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Star, ArrowUp, ArrowDown, Users } from 'lucide-react';
import { UserRole } from '../App';
import { useStories, useCreateStory, useUpdateStory, useUpdateStoryPriority } from '../../hooks/api/useStories';

interface UserStory {
  id: number;
  title: string;
  description: string;
  priority: number;
  storyPoints?: number;
  status: 'BACKLOG' | 'SELECTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  assignee?: string;
  epic: string;
  acceptanceCriteria: string[];
}

export default function BacklogManagement({ userRole }: { userRole: UserRole }) {
  const { data: stories = [], isLoading: isLoadingStories } = useStories();
  const createStoryMutation = useCreateStory();
  const updateStoryMutation = useUpdateStory();
  const updatePriorityMutation = useUpdateStoryPriority();

  const [expandedStory, setExpandedStory] = useState<number | null>(null);
  const [showPlanningPoker, setShowPlanningPoker] = useState(false);
  const [selectedStoryForPoker, setSelectedStoryForPoker] = useState<number | null>(null);
  const [showAddStoryModal, setShowAddStoryModal] = useState(false);
  const [newStory, setNewStory] = useState({
    title: '',
    description: '',
    epic: '',
    acceptanceCriteria: [''],
  });
  const [selectedEpicFilter, setSelectedEpicFilter] = useState<string>('전체');

  const canEdit = ['pm', 'developer', 'qa', 'pmo_head'].includes(userRole);
  const canPrioritize = ['pm', 'pmo_head'].includes(userRole);

  const handleAddStory = () => {
    if (!newStory.title || !newStory.description || !newStory.epic) {
      alert('필수 항목을 모두 입력해주세요.');
      return;
    }

    const storyData = {
      title: newStory.title,
      description: newStory.description,
      epic: newStory.epic,
      acceptanceCriteria: newStory.acceptanceCriteria.filter((c) => c.trim() !== ''),
    };

    createStoryMutation.mutate(storyData, {
      onSuccess: () => {
        setShowAddStoryModal(false);
        setNewStory({ title: '', description: '', epic: '', acceptanceCriteria: [''] });
      },
      onError: (error) => {
        console.error('Failed to create story:', error);
        alert('스토리 추가에 실패했습니다.');
      },
    });
  };

  const epics = Array.from(new Set(stories.map((s) => s.epic)));

  const getPriorityColor = (priority: number) => {
    if (priority <= 2) return 'text-red-600 bg-red-50';
    if (priority <= 4) return 'text-amber-600 bg-amber-50';
    return 'text-green-600 bg-green-50';
  };

  const movePriority = (id: number, direction: 'up' | 'down') => {
    if (!canPrioritize) return;
    updatePriorityMutation.mutate({ id, direction });
  };

  const moveToSprint = (storyId: number) => {
    if (!canEdit) return;
    updateStoryMutation.mutate({ id: storyId, data: { status: 'SELECTED' } });
  };

  const removeFromSprint = (storyId: number) => {
    if (!canEdit) return;
    updateStoryMutation.mutate({ id: storyId, data: { status: 'BACKLOG' } });
  };

  // Filter stories by epic
  const filteredStories = selectedEpicFilter === '전체'
    ? stories
    : stories.filter((s) => s.epic === selectedEpicFilter);

  const backlogStories = filteredStories.filter((s) => s.status === 'BACKLOG').sort((a, b) => a.priority - b.priority);
  const sprintStories = filteredStories.filter((s) => s.status === 'SELECTED');
  const doneStories = filteredStories.filter((s) => s.status === 'COMPLETED');

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">백로그 관리</h2>
            <p className="text-sm text-gray-500 mt-1">우선순위 기반 사용자 스토리 관리</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowPlanningPoker(!showPlanningPoker)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <Users size={18} />
              <span>플래닝 포커</span>
            </button>
            {canEdit && (
              <button
                onClick={() => setShowAddStoryModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus size={18} />
                <span>새 스토리 추가</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">제품 백로그</p>
          <p className="text-2xl font-semibold text-gray-900 mt-1">{backlogStories.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">이번 스프린트</p>
          <p className="text-2xl font-semibold text-blue-600 mt-1">{sprintStories.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">완료</p>
          <p className="text-2xl font-semibold text-green-600 mt-1">{doneStories.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">총 Story Points</p>
          <p className="text-2xl font-semibold text-purple-600 mt-1">
            {stories.reduce((sum, s) => sum + (s.storyPoints || 0), 0)}
          </p>
        </div>
      </div>

      {/* Planning Poker Modal */}
      {showPlanningPoker && (
        <div className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Users size={20} />
              플래닝 포커 세션
            </h3>
            <button
              onClick={() => setShowPlanningPoker(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            팀원들이 각자 공수를 비공개로 산정한 후 동시에 공개하여 합의를 도출합니다.
          </p>
          <div className="flex gap-2 flex-wrap">
            {[1, 2, 3, 5, 8, 13, 21].map((point) => (
              <button
                key={point}
                className="w-16 h-20 bg-white rounded-lg border-2 border-purple-300 hover:bg-purple-100 hover:border-purple-500 transition-all flex items-center justify-center font-bold text-2xl text-purple-600"
              >
                {point}
              </button>
            ))}
          </div>
          <div className="mt-4 text-sm text-gray-600">
            현재 세션: Story #2 - AI 설명 가능 기능
          </div>
        </div>
      )}

      {/* Add Story Modal */}
      {showAddStoryModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">새 스토리 추가</h3>
              <button
                onClick={() => {
                  setShowAddStoryModal(false);
                  setNewStory({ title: '', description: '', epic: '', acceptanceCriteria: [''] });
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  스토리 제목 *
                </label>
                <input
                  type="text"
                  value={newStory.title}
                  onChange={(e) => setNewStory({ ...newStory, title: e.target.value })}
                  placeholder="사용자로서 ... 원한다"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  설명 *
                </label>
                <textarea
                  value={newStory.description}
                  onChange={(e) => setNewStory({ ...newStory, description: e.target.value })}
                  placeholder="스토리에 대한 간단한 설명"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  에픽 *
                </label>
                <select
                  value={newStory.epic}
                  onChange={(e) => setNewStory({ ...newStory, epic: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">에픽 선택</option>
                  {epics.map((epic) => (
                    <option key={epic} value={epic}>
                      {epic}
                    </option>
                  ))}
                  <option value="NEW">+ 새 에픽 추가</option>
                </select>
                {newStory.epic === 'NEW' && (
                  <input
                    type="text"
                    placeholder="새 에픽 이름 입력"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-2"
                    onChange={(e) => setNewStory({ ...newStory, epic: e.target.value })}
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  완료 조건 (Acceptance Criteria)
                </label>
                {newStory.acceptanceCriteria.map((criteria, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={criteria}
                      onChange={(e) => {
                        const updated = [...newStory.acceptanceCriteria];
                        updated[idx] = e.target.value;
                        setNewStory({ ...newStory, acceptanceCriteria: updated });
                      }}
                      placeholder={`완료 조건 ${idx + 1}`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {newStory.acceptanceCriteria.length > 1 && (
                      <button
                        onClick={() => {
                          const updated = newStory.acceptanceCriteria.filter((_, i) => i !== idx);
                          setNewStory({ ...newStory, acceptanceCriteria: updated });
                        }}
                        className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() =>
                    setNewStory({
                      ...newStory,
                      acceptanceCriteria: [...newStory.acceptanceCriteria, ''],
                    })
                  }
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Plus size={16} />
                  완료 조건 추가
                </button>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddStory}
                disabled={createStoryMutation.isPending}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createStoryMutation.isPending ? '추가 중...' : '스토리 추가'}
              </button>
              <button
                onClick={() => {
                  setShowAddStoryModal(false);
                  setNewStory({ title: '', description: '', epic: '', acceptanceCriteria: [''] });
                }}
                disabled={createStoryMutation.isPending}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Epic Filter */}
      <div className="mb-6">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedEpicFilter('전체')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              selectedEpicFilter === '전체'
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            전체
          </button>
          {epics.map((epic) => (
            <button
              key={epic}
              onClick={() => setSelectedEpicFilter(epic)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                selectedEpicFilter === epic
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {epic}
            </button>
          ))}
        </div>
      </div>

      {/* Product Backlog */}
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Star className="text-amber-500" />
            제품 백로그 (우선순위순)
          </h3>
          <div className="space-y-2">
            {backlogStories.map((story, idx) => (
              <div key={story.id} className="border border-gray-200 rounded-lg">
                <div
                  className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setExpandedStory(expandedStory === story.id ? null : story.id)}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          movePriority(story.id, 'up');
                        }}
                        disabled={idx === 0 || !canPrioritize}
                        className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          movePriority(story.id, 'down');
                        }}
                        disabled={idx === backlogStories.length - 1 || !canPrioritize}
                        className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                    <div className={`px-2 py-1 rounded font-medium text-sm ${getPriorityColor(story.priority)}`}>
                      P{story.priority}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{story.title}</h4>
                          <p className="text-sm text-gray-500 mt-1">{story.description}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm font-medium">
                            {story.storyPoints || '?'} SP
                          </span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                            {story.epic}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      {expandedStory === story.id ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </div>
                  </div>
                </div>

                {expandedStory === story.id && (
                  <div className="px-4 pb-4 border-t border-gray-200 bg-gray-50">
                    <div className="mt-4">
                      <h5 className="font-medium text-gray-900 mb-2">완료 조건 (Acceptance Criteria):</h5>
                      <ul className="space-y-1">
                        {story.acceptanceCriteria.map((criteria, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="text-green-600 mt-0.5">✓</span>
                            <span>{criteria}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        onClick={() => moveToSprint(story.id)}
                      >
                        스프린트에 추가
                      </button>
                      <button
                        className="px-3 py-1.5 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
                        onClick={() => {
                          setSelectedStoryForPoker(story.id);
                          setShowPlanningPoker(true);
                        }}
                      >
                        포커 산정
                      </button>
                      <button className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-100">
                        수정
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sprint Backlog */}
        <div className="bg-blue-50 rounded-xl border-2 border-blue-300 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">이번 스프린트 백로그</h3>
          <div className="space-y-2">
            {sprintStories.map((story) => (
              <div key={story.id} className="bg-white p-4 rounded-lg border border-blue-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{story.title}</h4>
                    <p className="text-sm text-gray-500 mt-1">{story.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {story.assignee && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">
                        {story.assignee}
                      </span>
                    )}
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm font-medium">
                      {story.storyPoints} SP
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}