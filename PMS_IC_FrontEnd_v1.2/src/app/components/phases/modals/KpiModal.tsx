import type { KPI, KpiFormData } from '../types';

interface KpiModalProps {
  isEditing: boolean;
  formData: KpiFormData;
  onFormChange: (data: KpiFormData) => void;
  onSave: () => void;
  onClose: () => void;
}

export function KpiModal({
  isEditing,
  formData,
  onFormChange,
  onSave,
  onClose,
}: KpiModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {isEditing ? 'KPI 수정' : 'KPI 추가'}
        </h3>
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm text-gray-700 mb-1">지표명</label>
            <input
              value={formData.name}
              onChange={(event) => onFormChange({ ...formData, name: event.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">목표</label>
            <input
              value={formData.target}
              onChange={(event) => onFormChange({ ...formData, target: event.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">현재</label>
            <input
              value={formData.current}
              onChange={(event) => onFormChange({ ...formData, current: event.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">상태</label>
            <select
              value={formData.status}
              onChange={(event) => onFormChange({ ...formData, status: event.target.value as KPI['status'] })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="onTrack">정상</option>
              <option value="atRisk">위험</option>
              <option value="achieved">달성</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onSave}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            저장
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
