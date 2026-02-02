import { useState } from 'react';
import { Calendar, Target, Play, CheckCircle, Plus, ChevronDown, ChevronRight, Settings } from 'lucide-react';
import { Sprint, SprintFormData, createEmptySprintForm, validateSprintForm, getSprintStatusColor } from '../../../types/backlog';
import { useSprints, useCreateSprint, useStartSprint, useCompleteSprint } from '../../../hooks/api/useSprints';

interface SprintPanelProps {
  projectId: string;
  activeSprint?: Sprint;
  onSprintSelect: (sprintId: string | null) => void;
  selectedSprintId: string | null;
  canEdit: boolean;
}

export default function SprintPanel({
  projectId,
  activeSprint,
  onSprintSelect,
  selectedSprintId,
  canEdit,
}: SprintPanelProps) {
  const { data: sprints = [] } = useSprints(projectId);
  const createSprintMutation = useCreateSprint();
  const startSprintMutation = useStartSprint();
  const completeSprintMutation = useCompleteSprint();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSprintList, setShowSprintList] = useState(false);
  const [sprintForm, setSprintForm] = useState<SprintFormData>(createEmptySprintForm());

  const handleCreateSprint = () => {
    if (!validateSprintForm(sprintForm)) {
      alert('필수 항목을 모두 입력해주세요.');
      return;
    }

    createSprintMutation.mutate(
      { ...sprintForm, projectId },
      {
        onSuccess: () => {
          setShowCreateModal(false);
          setSprintForm(createEmptySprintForm());
        },
      }
    );
  };

  const handleStartSprint = (sprintId: string) => {
    if (!confirm('이 Sprint를 시작하시겠습니까? 진행 중인 Sprint가 있다면 완료됩니다.')) return;
    startSprintMutation.mutate(sprintId);
  };

  const handleCompleteSprint = (sprintId: string) => {
    if (!confirm('이 Sprint를 완료하시겠습니까?')) return;
    completeSprintMutation.mutate(sprintId);
  };

  // Calculate progress for active sprint
  const calculateProgress = (sprint: Sprint) => {
    if (!sprint.plannedPoints || sprint.plannedPoints === 0) return 0;
    return Math.round(((sprint.velocity || 0) / sprint.plannedPoints) * 100);
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const today = new Date();
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-xl p-5 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Target className="text-indigo-600" size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Sprint 관리</h3>
            <p className="text-xs text-gray-500">백로그 항목을 Sprint에 할당하세요</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSprintList(!showSprintList)}
            className="p-2 text-gray-500 hover:bg-white rounded-lg transition-colors"
          >
            <Settings size={18} />
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1"
            >
              <Plus size={16} />
              새 Sprint
            </button>
          )}
        </div>
      </div>

      {/* Active Sprint Card */}
      {activeSprint ? (
        <div
          className={`bg-white rounded-lg p-4 border-2 cursor-pointer transition-all ${
            selectedSprintId === activeSprint.id
              ? 'border-indigo-500 shadow-md'
              : 'border-indigo-200 hover:border-indigo-300'
          }`}
          onClick={() => onSprintSelect(selectedSprintId === activeSprint.id ? null : activeSprint.id)}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                진행 중
              </span>
              <h4 className="font-semibold text-gray-900">{activeSprint.name}</h4>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar size={14} />
              <span>
                {activeSprint.startDate} ~ {activeSprint.endDate}
              </span>
            </div>
          </div>

          {activeSprint.goal && (
            <p className="text-sm text-gray-600 mb-3">
              <span className="font-medium">목표:</span> {activeSprint.goal}
            </p>
          )}

          <div className="flex items-center justify-between">
            <div className="flex-1 mr-4">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-500">진행률</span>
                <span className="font-medium">
                  {activeSprint.velocity || 0} / {activeSprint.plannedPoints || 0} SP
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all"
                  style={{ width: `${calculateProgress(activeSprint)}%` }}
                />
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-indigo-600">
                D-{Math.max(0, getDaysRemaining(activeSprint.endDate))}
              </p>
              <p className="text-xs text-gray-500">남은 일수</p>
            </div>
          </div>

          {canEdit && (
            <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCompleteSprint(activeSprint.id);
                }}
                className="px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-colors flex items-center gap-1"
              >
                <CheckCircle size={16} />
                Sprint 완료
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg p-6 border border-dashed border-gray-300 text-center">
          <p className="text-gray-500 mb-2">진행 중인 Sprint가 없습니다</p>
          {sprints.filter((s) => s.status === 'PLANNING').length > 0 && canEdit && (
            <button
              type="button"
              onClick={() => setShowSprintList(true)}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              계획된 Sprint 보기
            </button>
          )}
        </div>
      )}

      {/* Sprint List (Expandable) */}
      {showSprintList && (
        <div className="mt-4 pt-4 border-t border-indigo-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700">전체 Sprint 목록</h4>
            <button
              type="button"
              onClick={() => setShowSprintList(false)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              닫기
            </button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {sprints.map((sprint) => (
              <div
                key={sprint.id}
                className={`bg-white p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedSprintId === sprint.id
                    ? 'border-indigo-500'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => onSprintSelect(sprint.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getSprintStatusColor(sprint.status)}`}>
                      {sprint.status === 'PLANNING' && '계획'}
                      {sprint.status === 'ACTIVE' && '진행 중'}
                      {sprint.status === 'COMPLETED' && '완료'}
                      {sprint.status === 'CANCELLED' && '취소됨'}
                    </span>
                    <span className="font-medium text-gray-900">{sprint.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {sprint.status === 'PLANNING' && canEdit && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartSprint(sprint.id);
                        }}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors flex items-center gap-1"
                      >
                        <Play size={12} />
                        시작
                      </button>
                    )}
                    <span className="text-xs text-gray-500">
                      {sprint.plannedPoints || 0} SP
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Sprint Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">새 Sprint 생성</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sprint 이름 *
                </label>
                <input
                  type="text"
                  value={sprintForm.name}
                  onChange={(e) => setSprintForm({ ...sprintForm, name: e.target.value })}
                  placeholder="Sprint 3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sprint 목표
                </label>
                <textarea
                  value={sprintForm.goal}
                  onChange={(e) => setSprintForm({ ...sprintForm, goal: e.target.value })}
                  placeholder="이번 Sprint에서 달성할 목표"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    시작일 *
                  </label>
                  <input
                    type="date"
                    value={sprintForm.startDate}
                    onChange={(e) => setSprintForm({ ...sprintForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    종료일 *
                  </label>
                  <input
                    type="date"
                    value={sprintForm.endDate}
                    onChange={(e) => setSprintForm({ ...sprintForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={handleCreateSprint}
                disabled={createSprintMutation.isPending}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {createSprintMutation.isPending ? '생성 중...' : 'Sprint 생성'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setSprintForm(createEmptySprintForm());
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
