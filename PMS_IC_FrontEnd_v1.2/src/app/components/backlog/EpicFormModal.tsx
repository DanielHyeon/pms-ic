import { useState, useEffect } from 'react';
import { X, Target, Calendar, Palette } from 'lucide-react';
import {
  Epic,
  EpicFormData,
  Priority,
  createEmptyEpicForm,
  validateEpicForm,
  getPriorityColor,
  getPriorityLabel,
} from '../../../types/backlog';
import { usePhases } from '../../../hooks/api/usePhases';

interface Phase {
  id: string;
  name: string;
  status: string;
}

interface EpicFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  epic?: Epic | null;
  onSubmit: (data: EpicFormData & { projectId: string }) => void;
  projectId: string;
  isEditMode?: boolean;
  isLoading?: boolean;
}

const PRIORITY_OPTIONS: Priority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const COLOR_OPTIONS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
];

export default function EpicFormModal({
  isOpen,
  onClose,
  epic,
  onSubmit,
  projectId,
  isEditMode = false,
  isLoading = false,
}: EpicFormModalProps) {
  const { data: phases = [] } = usePhases(projectId);
  const [formData, setFormData] = useState<EpicFormData>(createEmptyEpicForm());
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (epic && isEditMode) {
      setFormData({
        name: epic.name,
        description: epic.description || '',
        phaseId: epic.phaseId,
        priority: epic.priority,
        targetDate: epic.targetDate,
        color: epic.color || '#3B82F6',
      });
    } else {
      setFormData(createEmptyEpicForm());
    }
    setErrors({});
  }, [epic, isEditMode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Epic 이름은 필수입니다.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      ...formData,
      projectId,
    });
  };

  const handleClose = () => {
    setFormData(createEmptyEpicForm());
    setErrors({});
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Target className="text-blue-600" size={20} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              {isEditMode ? 'Epic 수정' : '새 Epic 추가'}
            </h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-5 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Epic 이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="예: AI 기반 자동 심사 시스템"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              설명
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Epic에 대한 간단한 설명을 입력하세요"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Phase Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              연결된 Phase
            </label>
            <select
              value={formData.phaseId || ''}
              onChange={(e) => setFormData({ ...formData, phaseId: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Phase 선택 (선택사항)</option>
              {phases.map((phase: Phase) => (
                <option key={phase.id} value={phase.id}>
                  {phase.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Phase를 연결하면 WBS 구조와 매핑됩니다
            </p>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              우선순위
            </label>
            <div className="flex gap-2">
              {PRIORITY_OPTIONS.map((priority) => (
                <button
                  key={priority}
                  type="button"
                  onClick={() => setFormData({ ...formData, priority })}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    formData.priority === priority
                      ? getPriorityColor(priority)
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {getPriorityLabel(priority)}
                </button>
              ))}
            </div>
          </div>

          {/* Target Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar size={14} className="inline mr-1" />
              목표 완료일
            </label>
            <input
              type="date"
              title="목표 완료일"
              value={formData.targetDate || ''}
              onChange={(e) => setFormData({ ...formData, targetDate: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Palette size={14} className="inline mr-1" />
              색상
            </label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-8 h-8 rounded-full transition-all ${
                    formData.color === color
                      ? 'ring-2 ring-offset-2 ring-blue-500 scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isLoading ? '저장 중...' : isEditMode ? '수정' : 'Epic 추가'}
          </button>
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors font-medium"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
