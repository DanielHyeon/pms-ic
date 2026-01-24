import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Star, ArrowUp, ArrowDown, Users, Check, RotateCcw, Pencil, Trash2 } from 'lucide-react';
import { UserRole } from '../App';
import { useStories, useCreateStory, useUpdateStory, useUpdateStoryPriority } from '../../hooks/api/useStories';
import { canEdit as checkCanEdit, canPrioritize as checkCanPrioritize } from '../../utils/rolePermissions';
import {
  UserStory,
  StoryFormData,
  createEmptyStoryForm,
  storyToFormData,
  validateStoryForm,
  getPriorityColor,
} from '../../utils/storyTypes';

export default function BacklogManagement({ userRole }: { userRole: UserRole }) {
  const { data: stories = [], isLoading: isLoadingStories } = useStories();
  const createStoryMutation = useCreateStory();
  const updateStoryMutation = useUpdateStory();
  const updatePriorityMutation = useUpdateStoryPriority();

  const [expandedStory, setExpandedStory] = useState<number | null>(null);
  const [showPlanningPoker, setShowPlanningPoker] = useState(false);
  const [selectedStoryForPoker, setSelectedStoryForPoker] = useState<number | null>(null);
  const [selectedPokerCard, setSelectedPokerCard] = useState<number | null>(null);
  const [isPokerConfirmed, setIsPokerConfirmed] = useState(false);
  const [showAddStoryModal, setShowAddStoryModal] = useState(false);
  const [showEditStoryModal, setShowEditStoryModal] = useState(false);
  const [editingStory, setEditingStory] = useState<UserStory | null>(null);
  // Consolidated form state using extracted types
  const [storyForm, setStoryForm] = useState<StoryFormData>(createEmptyStoryForm());
  const [selectedEpicFilter, setSelectedEpicFilter] = useState<string>('전체');

  // Use centralized role permissions
  const canEdit = checkCanEdit(userRole);
  const canPrioritize = checkCanPrioritize(userRole);

  const handleAddStory = () => {
    if (!validateStoryForm(storyForm)) {
      alert('필수 항목을 모두 입력해주세요.');
      return;
    }

    const storyData = {
      title: storyForm.title,
      description: storyForm.description,
      epic: storyForm.epic,
      acceptanceCriteria: storyForm.acceptanceCriteria.filter((c) => c.trim() !== ''),
    };

    createStoryMutation.mutate(storyData, {
      onSuccess: () => {
        setShowAddStoryModal(false);
        setStoryForm(createEmptyStoryForm());
      },
      onError: (error) => {
        console.error('Failed to create story:', error);
        alert('스토리 추가에 실패했습니다.');
      },
    });
  };

  const epics = Array.from(new Set(stories.map((s) => s.epic)));

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

  const openEditModal = (story: UserStory) => {
    setEditingStory(story);
    setStoryForm(storyToFormData(story));
    setShowEditStoryModal(true);
  };

  const handleEditStory = () => {
    if (!editingStory || !validateStoryForm(storyForm)) {
      alert('필수 항목을 모두 입력해주세요.');
      return;
    }

    updateStoryMutation.mutate(
      {
        id: editingStory.id,
        data: {
          title: storyForm.title,
          description: storyForm.description,
          epic: storyForm.epic,
          acceptanceCriteria: storyForm.acceptanceCriteria.filter((c) => c.trim() !== ''),
        },
      },
      {
        onSuccess: () => {
          setShowEditStoryModal(false);
          setEditingStory(null);
          setStoryForm(createEmptyStoryForm());
        },
        onError: (error) => {
          console.error('Failed to update story:', error);
          alert('스토리 수정에 실패했습니다.');
        },
      }
    );
  };

  const handleDeleteStory = () => {
    if (!editingStory) return;
    if (!confirm('이 스토리를 삭제하시겠습니까?')) return;

    updateStoryMutation.mutate(
      { id: editingStory.id, data: { status: 'CANCELLED' } },
      {
        onSuccess: () => {
          setShowEditStoryModal(false);
          setEditingStory(null);
          setStoryForm(createEmptyStoryForm());
        },
      }
    );
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

      {/* Planning Poker Panel */}
      {showPlanningPoker && (
        <div className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-300 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Users size={20} />
              플래닝 포커 - Story Point 산정
            </h3>
            <button
              onClick={() => {
                setShowPlanningPoker(false);
                setSelectedStoryForPoker(null);
                setSelectedPokerCard(null);
                setIsPokerConfirmed(false);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          {/* Selected Story Info */}
          {selectedStoryForPoker ? (
            (() => {
              const story = stories.find((s) => s.id === selectedStoryForPoker);
              if (!story) return null;
              return (
                <div className="bg-white rounded-lg p-4 mb-4 border border-purple-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-purple-600 font-medium">Story #{story.id}</span>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{story.epic}</span>
                      </div>
                      <h4 className="font-medium text-gray-900">{story.title}</h4>
                      <p className="text-sm text-gray-500 mt-1">{story.description}</p>
                    </div>
                    {story.storyPoints && (
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
                        현재: {story.storyPoints} SP
                      </span>
                    )}
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="bg-white rounded-lg p-4 mb-4 border border-purple-200 text-center text-gray-500">
              아래 백로그에서 스토리를 선택하여 &quot;포커 산정&quot; 버튼을 클릭하세요
            </div>
          )}

          {/* Poker Cards */}
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-3">
              {isPokerConfirmed
                ? '✅ Story Point가 선택되었습니다. 저장 버튼을 눌러 확정하세요.'
                : '카드를 선택하여 공수를 산정하세요 (피보나치 수열)'}
            </p>
            <div className="flex gap-3 flex-wrap">
              {[1, 2, 3, 5, 8, 13, 21].map((point) => (
                <button
                  key={point}
                  onClick={() => {
                    if (!isPokerConfirmed) {
                      setSelectedPokerCard(point);
                    }
                  }}
                  disabled={!selectedStoryForPoker || isPokerConfirmed}
                  className={`w-16 h-24 rounded-lg border-2 transition-all flex flex-col items-center justify-center font-bold text-2xl
                    ${selectedPokerCard === point
                      ? 'bg-purple-600 border-purple-600 text-white shadow-lg scale-110'
                      : 'bg-white border-purple-300 text-purple-600 hover:bg-purple-100 hover:border-purple-500'
                    }
                    ${!selectedStoryForPoker ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    ${isPokerConfirmed && selectedPokerCard !== point ? 'opacity-30' : ''}
                  `}
                >
                  {point}
                  <span className="text-xs font-normal mt-1">SP</span>
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          {selectedStoryForPoker && selectedPokerCard && (
            <div className="flex gap-3">
              {!isPokerConfirmed ? (
                <button
                  onClick={() => setIsPokerConfirmed(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                >
                  <Check size={18} />
                  {selectedPokerCard} SP 선택 확정
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      updateStoryMutation.mutate(
                        { id: selectedStoryForPoker, data: { storyPoints: selectedPokerCard } },
                        {
                          onSuccess: () => {
                            setShowPlanningPoker(false);
                            setSelectedStoryForPoker(null);
                            setSelectedPokerCard(null);
                            setIsPokerConfirmed(false);
                          },
                        }
                      );
                    }}
                    disabled={updateStoryMutation.isPending}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <Check size={18} />
                    {updateStoryMutation.isPending ? '저장 중...' : `${selectedPokerCard} SP 저장`}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedPokerCard(null);
                      setIsPokerConfirmed(false);
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                  >
                    <RotateCcw size={18} />
                    다시 선택
                  </button>
                </>
              )}
            </div>
          )}

          {/* Unestimated Stories Quick List */}
          {!selectedStoryForPoker && (
            <div className="mt-4 pt-4 border-t border-purple-200">
              <p className="text-sm font-medium text-gray-700 mb-2">미산정 스토리:</p>
              <div className="flex flex-wrap gap-2">
                {stories
                  .filter((s) => !s.storyPoints && s.status === 'BACKLOG')
                  .slice(0, 5)
                  .map((story) => (
                    <button
                      key={story.id}
                      onClick={() => {
                        setSelectedStoryForPoker(story.id);
                        setSelectedPokerCard(null);
                        setIsPokerConfirmed(false);
                      }}
                      className="px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-sm text-gray-700 hover:bg-purple-50 hover:border-purple-400 transition-colors"
                    >
                      #{story.id} {story.title.slice(0, 30)}...
                    </button>
                  ))}
                {stories.filter((s) => !s.storyPoints && s.status === 'BACKLOG').length === 0 && (
                  <span className="text-sm text-gray-500">모든 스토리가 산정되었습니다!</span>
                )}
              </div>
            </div>
          )}
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
                  setStoryForm(createEmptyStoryForm());
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
                  value={storyForm.title}
                  onChange={(e) => setStoryForm({ ...storyForm, title: e.target.value })}
                  placeholder="사용자로서 ... 원한다"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  설명 *
                </label>
                <textarea
                  value={storyForm.description}
                  onChange={(e) => setStoryForm({ ...storyForm, description: e.target.value })}
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
                  value={storyForm.epic}
                  onChange={(e) => setStoryForm({ ...storyForm, epic: e.target.value })}
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
                {storyForm.epic === 'NEW' && (
                  <input
                    type="text"
                    placeholder="새 에픽 이름 입력"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-2"
                    onChange={(e) => setStoryForm({ ...storyForm, epic: e.target.value })}
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  완료 조건 (Acceptance Criteria)
                </label>
                {storyForm.acceptanceCriteria.map((criteria, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={criteria}
                      onChange={(e) => {
                        const updated = [...storyForm.acceptanceCriteria];
                        updated[idx] = e.target.value;
                        setStoryForm({ ...storyForm, acceptanceCriteria: updated });
                      }}
                      placeholder={`완료 조건 ${idx + 1}`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {storyForm.acceptanceCriteria.length > 1 && (
                      <button
                        onClick={() => {
                          const updated = storyForm.acceptanceCriteria.filter((_, i) => i !== idx);
                          setStoryForm({ ...storyForm, acceptanceCriteria: updated });
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
                    setStoryForm({
                      ...storyForm,
                      acceptanceCriteria: [...storyForm.acceptanceCriteria, ''],
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
                  setStoryForm(createEmptyStoryForm());
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

      {/* Edit Story Modal */}
      {showEditStoryModal && editingStory && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">스토리 수정</h3>
              <button
                type="button"
                onClick={() => {
                  setShowEditStoryModal(false);
                  setEditingStory(null);
                  setStoryForm(createEmptyStoryForm());
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
                  value={storyForm.title}
                  onChange={(e) => setStoryForm({ ...storyForm, title: e.target.value })}
                  placeholder="사용자로서 ... 원한다"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  설명 *
                </label>
                <textarea
                  value={storyForm.description}
                  onChange={(e) => setStoryForm({ ...storyForm, description: e.target.value })}
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
                  value={storyForm.epic}
                  onChange={(e) => setStoryForm({ ...storyForm, epic: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">에픽 선택</option>
                  {epics.map((epic) => (
                    <option key={epic} value={epic}>
                      {epic}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  완료 조건 (Acceptance Criteria)
                </label>
                {storyForm.acceptanceCriteria.map((criteria, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={criteria}
                      onChange={(e) => {
                        const updated = [...storyForm.acceptanceCriteria];
                        updated[idx] = e.target.value;
                        setStoryForm({ ...storyForm, acceptanceCriteria: updated });
                      }}
                      placeholder={`완료 조건 ${idx + 1}`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {storyForm.acceptanceCriteria.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const updated = storyForm.acceptanceCriteria.filter((_, i) => i !== idx);
                          setStoryForm({ ...storyForm, acceptanceCriteria: updated });
                        }}
                        className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setStoryForm({
                      ...storyForm,
                      acceptanceCriteria: [...storyForm.acceptanceCriteria, ''],
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
                type="button"
                onClick={handleEditStory}
                disabled={updateStoryMutation.isPending}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateStoryMutation.isPending ? '저장 중...' : '저장'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEditStoryModal(false);
                  setEditingStory(null);
                  setStoryForm(createEmptyStoryForm());
                }}
                disabled={updateStoryMutation.isPending}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                취소
              </button>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleDeleteStory}
                disabled={updateStoryMutation.isPending}
                className="w-full px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Trash2 size={16} />
                이 스토리 삭제
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
                      {canEdit && (
                        <button
                          className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-100 flex items-center gap-1"
                          onClick={() => openEditModal(story)}
                        >
                          <Pencil size={14} />
                          수정
                        </button>
                      )}
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