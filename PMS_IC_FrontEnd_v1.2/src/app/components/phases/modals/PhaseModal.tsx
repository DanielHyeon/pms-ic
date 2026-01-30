import { Trash2 } from 'lucide-react';
import type { Phase, PhaseFormData } from '../types';

interface PhaseModalProps {
  isEditing: boolean;
  formData: PhaseFormData;
  onFormChange: (data: PhaseFormData) => void;
  onSave: () => void;
  onDelete?: () => void;
  onClose: () => void;
}

export function PhaseModal({
  isEditing,
  formData,
  onFormChange,
  onSave,
  onDelete,
  onClose,
}: PhaseModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {isEditing ? '단계 수정' : '새 단계 추가'}
        </h3>
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm text-gray-700 mb-1">단계명 *</label>
            <input
              value={formData.name}
              onChange={(e) => onFormChange({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="단계명을 입력하세요"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">설명</label>
            <textarea
              value={formData.description}
              onChange={(e) => onFormChange({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              rows={3}
              placeholder="단계 설명을 입력하세요"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">시작일</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => onFormChange({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">종료일</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => onFormChange({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">상태</label>
              <select
                value={formData.status}
                onChange={(e) => onFormChange({ ...formData, status: e.target.value as Phase['status'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="pending">대기</option>
                <option value="inProgress">진행중</option>
                <option value="completed">완료</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">진행률 (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.progress}
                onChange={(e) => onFormChange({ ...formData, progress: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onSave}
            disabled={!formData.name.trim()}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isEditing ? '수정' : '추가'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
        </div>
        {isEditing && onDelete && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onDelete}
              className="w-full px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 size={16} />
              이 단계 삭제
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
