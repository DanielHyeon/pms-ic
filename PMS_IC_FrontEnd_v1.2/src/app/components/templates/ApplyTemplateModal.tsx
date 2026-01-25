import { useState } from 'react';
import { X, Calendar, CheckSquare, Square, AlertCircle, Loader2, Check } from 'lucide-react';
import {
  TemplateSet,
  PhaseTemplate,
  ApplyTemplateOptions,
  calculateTemplateStats,
} from '../../../types/templates';
import { useApplyTemplate } from '../../../hooks/api/useTemplates';

interface ApplyTemplateModalProps {
  template: TemplateSet;
  projectId: string;
  onClose: () => void;
  onSuccess?: (phaseIds: string[]) => void;
}

export default function ApplyTemplateModal({
  template,
  projectId,
  onClose,
  onSuccess,
}: ApplyTemplateModalProps) {
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedPhaseIds, setSelectedPhaseIds] = useState<string[]>(
    template.phases.map((p) => p.id)
  );
  const [adjustDates, setAdjustDates] = useState(true);
  const [includeWbs, setIncludeWbs] = useState(true);
  const [includeDeliverables, setIncludeDeliverables] = useState(true);
  const [includeKpis, setIncludeKpis] = useState(true);
  const [isApplied, setIsApplied] = useState(false);

  const applyMutation = useApplyTemplate();
  const stats = calculateTemplateStats(template);

  // Calculate estimated end date
  const selectedPhases = template.phases.filter((p) => selectedPhaseIds.includes(p.id));
  const totalDays = selectedPhases.reduce((sum, p) => sum + (p.defaultDurationDays || 0), 0);
  const estimatedEndDate = new Date(
    new Date(startDate).getTime() + totalDays * 24 * 60 * 60 * 1000
  );

  const togglePhase = (phaseId: string) => {
    setSelectedPhaseIds((prev) =>
      prev.includes(phaseId) ? prev.filter((id) => id !== phaseId) : [...prev, phaseId]
    );
  };

  const selectAllPhases = () => {
    setSelectedPhaseIds(template.phases.map((p) => p.id));
  };

  const deselectAllPhases = () => {
    setSelectedPhaseIds([]);
  };

  const handleApply = async () => {
    const options: ApplyTemplateOptions = {
      projectId,
      templateSetId: template.id,
      startDate,
      selectedPhaseIds: selectedPhaseIds.length === template.phases.length ? undefined : selectedPhaseIds,
      adjustDates,
      includeWbs,
      includeDeliverables,
      includeKpis,
    };

    try {
      const result = await applyMutation.mutateAsync(options);
      if (result.success) {
        setIsApplied(true);
        if (onSuccess) {
          onSuccess(result.createdPhaseIds);
        }
      }
    } catch (error) {
      console.error('Failed to apply template:', error);
    }
  };

  // Success view
  if (isApplied) {
    return (
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">템플릿 적용 완료</h3>
          <p className="text-gray-600 mb-4">
            {selectedPhases.length}개의 Phase와 WBS 구조가 생성되었습니다.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            확인
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">템플릿 적용</h3>
            <p className="text-sm text-gray-500">{template.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Date Settings */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Calendar size={18} />
              일정 설정
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">시작일</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">예상 종료일</label>
                <input
                  type="date"
                  value={estimatedEndDate.toISOString().split('T')[0]}
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-600"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 mt-3">
              <input
                type="checkbox"
                checked={adjustDates}
                onChange={(e) => setAdjustDates(e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">Phase별 일정 자동 계산</span>
            </label>
          </div>

          {/* Phase Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">적용할 Phase 선택</h4>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAllPhases}
                  className="text-xs text-indigo-600 hover:text-indigo-800"
                >
                  전체 선택
                </button>
                <span className="text-gray-300">|</span>
                <button
                  type="button"
                  onClick={deselectAllPhases}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  전체 해제
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {template.phases.map((phase, index) => {
                const isSelected = selectedPhaseIds.includes(phase.id);
                return (
                  <button
                    key={phase.id}
                    type="button"
                    onClick={() => togglePhase(phase.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                        style={{ backgroundColor: phase.color || '#6366F1' }}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{phase.name}</div>
                        <div className="text-xs text-gray-500">
                          {phase.defaultDurationDays || 0}일 | WBS: {phase.wbsGroups.length} |
                          산출물: {phase.deliverables.length}
                        </div>
                      </div>
                    </div>
                    {isSelected ? (
                      <CheckSquare size={20} className="text-indigo-600" />
                    ) : (
                      <Square size={20} className="text-gray-300" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Include Options */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">포함 항목</h4>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeWbs}
                  onChange={(e) => setIncludeWbs(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">
                  WBS 구조 (Group, Item, Task)
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeDeliverables}
                  onChange={(e) => setIncludeDeliverables(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">산출물 템플릿</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeKpis}
                  onChange={(e) => setIncludeKpis(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">KPI 템플릿</span>
              </label>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <h4 className="font-medium text-indigo-900 mb-2">적용 요약</h4>
            <ul className="text-sm text-indigo-800 space-y-1">
              <li>
                - 선택된 Phase: <strong>{selectedPhaseIds.length}</strong>개
              </li>
              {includeWbs && (
                <>
                  <li>
                    - 생성될 WBS Group:{' '}
                    <strong>
                      {selectedPhases.reduce((sum, p) => sum + p.wbsGroups.length, 0)}
                    </strong>
                    개
                  </li>
                  <li>
                    - 생성될 WBS Item:{' '}
                    <strong>
                      {selectedPhases.reduce(
                        (sum, p) =>
                          sum + p.wbsGroups.reduce((s, g) => s + g.items.length, 0),
                        0
                      )}
                    </strong>
                    개
                  </li>
                </>
              )}
              <li>
                - 예상 기간: <strong>{totalDays}</strong>일
              </li>
            </ul>
          </div>

          {/* Warning */}
          {selectedPhaseIds.length === 0 && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle size={18} className="text-amber-600 mt-0.5" />
              <p className="text-sm text-amber-800">
                최소 1개 이상의 Phase를 선택해주세요.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={selectedPhaseIds.length === 0 || applyMutation.isPending}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {applyMutation.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                적용 중...
              </>
            ) : (
              '템플릿 적용'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
