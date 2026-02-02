import { useState, useEffect } from 'react';
import { X, Layers, Link2, Users } from 'lucide-react';
import {
  Feature,
  FeatureFormData,
  Priority,
  createEmptyFeatureForm,
  getPriorityColor,
  getPriorityLabel,
} from '../../../types/backlog';
import { useWbsGroups } from '../../../hooks/api/useWbs';
import { useEpic } from '../../../hooks/api/useEpics';
import { useParts } from '../../../hooks/api/useParts';

interface WbsGroup {
  id: string;
  name: string;
  code: string;
  status: string;
}

interface FeatureFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: Feature | null;
  onSubmit: (data: FeatureFormData) => void;
  epicId: string;
  isEditMode?: boolean;
  isLoading?: boolean;
}

const PRIORITY_OPTIONS: Priority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export default function FeatureFormModal({
  isOpen,
  onClose,
  feature,
  onSubmit,
  epicId,
  isEditMode = false,
  isLoading = false,
}: FeatureFormModalProps) {
  // Get the Epic to find its phaseId for loading WBS Groups
  const { data: epic } = useEpic(epicId);
  const { data: wbsGroups = [] } = useWbsGroups(epic?.phaseId);
  // Get Parts for the project to allow Part assignment
  const { data: parts = [] } = useParts(epic?.projectId);

  const [formData, setFormData] = useState<FeatureFormData>(createEmptyFeatureForm(epicId));
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (feature && isEditMode) {
      setFormData({
        name: feature.name,
        description: feature.description || '',
        epicId: feature.epicId,
        partId: feature.partId,
        wbsGroupId: feature.wbsGroupId,
        priority: feature.priority,
      });
    } else {
      setFormData(createEmptyFeatureForm(epicId));
    }
    setErrors({});
  }, [feature, isEditMode, isOpen, epicId]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Feature 이름은 필수입니다.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(formData);
  };

  const handleClose = () => {
    setFormData(createEmptyFeatureForm(epicId));
    setErrors({});
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Layers className="text-amber-600" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {isEditMode ? 'Feature 수정' : '새 Feature 추가'}
              </h3>
              {epic && (
                <p className="text-xs text-gray-500">Epic: {epic.name}</p>
              )}
            </div>
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
              Feature 이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="예: 사용자 인증 기능"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 ${
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
              placeholder="Feature에 대한 간단한 설명을 입력하세요"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Part Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Users size={14} className="inline mr-1" />
              담당 Part
            </label>
            {parts.length > 0 ? (
              <>
                <select
                  value={formData.partId || ''}
                  onChange={(e) => setFormData({ ...formData, partId: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                >
                  <option value="">Part 선택 (선택사항)</option>
                  {parts.map((part) => (
                    <option key={part.id} value={part.id}>
                      {part.name} {part.leaderName ? `(PL: ${part.leaderName})` : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Part를 지정하면 해당 Part Leader가 Feature를 관리합니다
                </p>
              </>
            ) : (
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500">
                프로젝트에 등록된 Part가 없습니다.
                <br />
                Part 관리 메뉴에서 Part를 먼저 생성해주세요.
              </div>
            )}
          </div>

          {/* WBS Group Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Link2 size={14} className="inline mr-1" />
              연결된 WBS Group
            </label>
            {epic?.phaseId ? (
              <>
                <select
                  value={formData.wbsGroupId || ''}
                  onChange={(e) => setFormData({ ...formData, wbsGroupId: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                >
                  <option value="">WBS Group 선택 (선택사항)</option>
                  {wbsGroups.map((group: WbsGroup) => (
                    <option key={group.id} value={group.id}>
                      [{group.code}] {group.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  WBS Group을 연결하면 작업 구조와 매핑됩니다
                </p>
              </>
            ) : (
              <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500">
                Epic이 Phase에 연결되어 있지 않아 WBS Group을 선택할 수 없습니다.
                <br />
                먼저 Epic을 Phase에 연결해주세요.
              </div>
            )}
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
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isLoading ? '저장 중...' : isEditMode ? '수정' : 'Feature 추가'}
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
