import { useState } from 'react';
import { X, Calendar, CheckSquare, Square, AlertCircle, Loader2, Check, Archive, Layers, ChevronDown } from 'lucide-react';
import {
  TemplateSet,
  PhaseTemplate,
  ApplyTemplateOptions,
  calculateTemplateStats,
  MethodologyPhase,
} from '../../../types/templates';
import { useApplyTemplate } from '../../../hooks/api/useTemplates';
import { useCreateWbsSnapshot } from '../../../hooks/api/useWbsSnapshots';
import { usePhases, useAllPhases } from '../../../hooks/api/usePhases';

interface ApplyTemplateModalProps {
  template: TemplateSet;
  projectId: string;
  phaseId?: string;  // Optional: for backup before applying to specific phase
  targetPhaseId?: string;  // If provided, add WBS to this existing phase
  targetPhaseName?: string;
  methodologyPhases?: MethodologyPhase[];  // All methodology phases for bulk application
  onClose: () => void;
  onSuccess?: (phaseIds: string[]) => void;
}

export default function ApplyTemplateModal({
  template,
  projectId,
  phaseId,
  targetPhaseId,
  targetPhaseName,
  methodologyPhases,
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
  const [createBackup, setCreateBackup] = useState(true);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [isApplied, setIsApplied] = useState(false);
  const [backupCreated, setBackupCreated] = useState(false);
  const [linkedCategoryId, setLinkedCategoryId] = useState<string>('');
  // Apply mode: 'single' = current phase only, 'all' = all methodology phases
  // Default to 'single' when targetPhaseId is provided (user wants to apply to specific phase)
  const [applyMode, setApplyMode] = useState<'single' | 'all'>('single');

  const applyMutation = useApplyTemplate();
  const createSnapshotMutation = useCreateWbsSnapshot();
  const { data: existingPhases = [] } = usePhases(projectId);
  // WBS categories (phases from WbsManagement) - filter by projectId
  const { data: allCategories = [] } = useAllPhases();
  const wbsCategories = (allCategories as any[]).filter(p => p.projectId === projectId);
  const stats = calculateTemplateStats(template);

  // Check if there are existing phases with WBS data to backup
  const hasExistingPhases = existingPhases.length > 0;

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
    // Create backup before applying template
    if (createBackup) {
      try {
        if (targetPhaseId) {
          // Backup only the target phase
          await createSnapshotMutation.mutateAsync({
            phaseId: targetPhaseId,
            snapshotName: `템플릿 적용 전 백업 (${template.name})`,
            description: `템플릿 "${template.name}" 적용 전 자동 생성된 백업 - Phase: ${targetPhaseName || targetPhaseId}`,
            snapshotType: 'PRE_TEMPLATE',
          });
          setBackupCreated(true);
          console.log(`WBS backup created for phase ${targetPhaseId} before template application`);
        } else if (hasExistingPhases) {
          // Backup all existing phases
          const backupPromises = existingPhases.map((phase: { id: string; name: string }) =>
            createSnapshotMutation.mutateAsync({
              phaseId: phase.id,
              snapshotName: `템플릿 적용 전 백업 (${template.name})`,
              description: `템플릿 "${template.name}" 적용 전 자동 생성된 백업 - Phase: ${phase.name}`,
              snapshotType: 'PRE_TEMPLATE',
            })
          );
          await Promise.all(backupPromises);
          setBackupCreated(true);
          console.log(`WBS backup created for ${existingPhases.length} phase(s) before template application`);
        }
      } catch (error) {
        console.error('Failed to create backup:', error);
        // Continue with template application even if backup fails
      }
    }

    const options: ApplyTemplateOptions = {
      projectId,
      templateSetId: template.id,
      template, // Pass full template for direct WBS creation
      targetPhaseId: applyMode === 'single' ? targetPhaseId : undefined, // Only use for single phase mode
      replaceExisting, // If true, delete existing WBS before applying
      startDate,
      selectedPhaseIds: selectedPhaseIds.length === template.phases.length ? undefined : selectedPhaseIds,
      adjustDates,
      includeWbs,
      includeDeliverables,
      includeKpis,
      linkedCategoryId: linkedCategoryId || undefined, // Link to WBS category
      // Multi-phase application options
      applyToAllMethodologyPhases: applyMode === 'all' && methodologyPhases && methodologyPhases.length > 0,
      methodologyPhases: applyMode === 'all' ? methodologyPhases : undefined,
    };

    try {
      const result = await applyMutation.mutateAsync(options);
      if (result.success) {
        setIsApplied(true);
        if (onSuccess) {
          // If targetPhaseId was provided, return it; otherwise return created phase IDs
          onSuccess(targetPhaseId ? [targetPhaseId] : result.createdPhaseIds);
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
            {applyMode === 'all' && methodologyPhases
              ? replaceExisting
                ? `${Math.min(template.phases.length, methodologyPhases.length)}개 방법론 단계의 WBS가 템플릿으로 교체되었습니다.`
                : `${Math.min(template.phases.length, methodologyPhases.length)}개 방법론 단계에 WBS 구조가 추가되었습니다.`
              : targetPhaseId
              ? replaceExisting
                ? `"${targetPhaseName || targetPhaseId}" Phase의 WBS가 템플릿으로 교체되었습니다.`
                : `"${targetPhaseName || targetPhaseId}" Phase에 WBS 구조가 추가되었습니다.`
              : `${selectedPhases.length}개의 Phase와 WBS 구조가 생성되었습니다.`}
          </p>
          {backupCreated && (
            <p className="text-sm text-blue-600 mb-4 flex items-center justify-center gap-1">
              <Archive size={14} />
              {targetPhaseId
                ? '기존 WBS 백업이 생성되었습니다. 필요시 복원할 수 있습니다.'
                : `${existingPhases.length}개 Phase의 백업이 생성되었습니다. 필요시 복원할 수 있습니다.`}
            </p>
          )}
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
            <h3 className="text-lg font-semibold text-gray-900">
              {targetPhaseId ? 'WBS 템플릿 적용' : '템플릿 적용'}
            </h3>
            <p className="text-sm text-gray-500">
              {targetPhaseId
                ? `"${targetPhaseName || targetPhaseId}" Phase에 ${template.name} 적용`
                : template.name}
            </p>
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
          {/* Target Phase Info (when adding to existing phase) */}
          {targetPhaseId && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <h4 className="font-medium text-indigo-900 mb-2">적용 대상</h4>

              {/* Apply Mode Selection - show when methodologyPhases available */}
              {methodologyPhases && methodologyPhases.length > 0 && (
                <div className="mb-4 p-3 bg-white rounded-lg border border-indigo-200">
                  <p className="text-sm font-medium text-indigo-900 mb-2">적용 범위 선택</p>
                  <div className="space-y-2">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="applyScope"
                        checked={applyMode === 'all'}
                        onChange={() => setApplyMode('all')}
                        className="w-4 h-4 mt-0.5 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-indigo-800">전체 방법론 단계에 적용 (권장)</span>
                        <p className="text-xs text-indigo-600 mt-0.5">
                          템플릿의 각 단계가 해당 방법론 단계에 매핑됩니다 ({Math.min(template.phases.length, methodologyPhases.length)}개 단계)
                        </p>
                      </div>
                    </label>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="applyScope"
                        checked={applyMode === 'single'}
                        onChange={() => setApplyMode('single')}
                        className="w-4 h-4 mt-0.5 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-indigo-800">현재 단계에만 적용</span>
                        <p className="text-xs text-indigo-600 mt-0.5">
                          "{targetPhaseName || targetPhaseId}" 단계에만 WBS를 추가합니다
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {applyMode === 'single' && (
                <p className="text-sm text-indigo-800 mb-3">
                  <strong>"{targetPhaseName || targetPhaseId}"</strong> Phase에 선택된 템플릿의 WBS 구조를 적용합니다.
                </p>
              )}

              {applyMode === 'all' && methodologyPhases && (
                <div className="mb-3">
                  <p className="text-sm text-indigo-800 mb-2">
                    템플릿의 각 단계가 해당 방법론 단계에 WBS를 생성합니다:
                  </p>
                  <div className="max-h-40 overflow-y-auto space-y-1 text-xs">
                    {template.phases.map((templatePhase, index) => {
                      const methodologyPhase = methodologyPhases[index];
                      return (
                        <div key={templatePhase.id} className="flex items-center gap-2 text-indigo-700">
                          <span className="w-4 h-4 rounded-full bg-indigo-200 flex items-center justify-center text-[10px] font-bold">
                            {index + 1}
                          </span>
                          <span className="truncate">{templatePhase.name}</span>
                          <span className="text-indigo-400">→</span>
                          <span className={`truncate ${methodologyPhase ? 'text-indigo-800' : 'text-red-500'}`}>
                            {methodologyPhase?.name || '(없음)'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="replaceMode"
                    checked={!replaceExisting}
                    onChange={() => setReplaceExisting(false)}
                    className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-indigo-800">기존 WBS에 추가 (머지)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="replaceMode"
                    checked={replaceExisting}
                    onChange={() => setReplaceExisting(true)}
                    className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-indigo-800">기존 WBS 삭제 후 교체</span>
                </label>
              </div>
            </div>
          )}

          {/* Date Settings - only show when creating new phases */}
          {!targetPhaseId && (
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
          )}

          {/* Phase Selection - only show when creating new phases */}
          {!targetPhaseId && (
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
          )}

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

          {/* WBS Category Link */}
          {targetPhaseId && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Layers size={20} className="text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-amber-900 mb-2">WBS 카테고리 연결 (선택)</h4>
                  <p className="text-xs text-amber-700 mb-3">
                    일정 관리 페이지의 WBS 카테고리와 연결합니다. 나중에 설정 화면에서도 연결할 수 있습니다.
                  </p>
                  <div className="relative">
                    <select
                      value={linkedCategoryId}
                      onChange={(e) => setLinkedCategoryId(e.target.value)}
                      className="w-full appearance-none px-3 py-2 pr-10 border border-amber-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                    >
                      <option value="">연결하지 않음</option>
                      {(wbsCategories as Array<{ id: string; name: string }>).map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Backup Option */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Archive size={20} className="text-blue-600 mt-0.5" />
              <div className="flex-1">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={createBackup}
                    onChange={(e) => setCreateBackup(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-blue-900">
                    템플릿 적용 전 백업 생성 (권장)
                  </span>
                </label>
                <p className="text-xs text-blue-700 mt-1 ml-6">
                  {targetPhaseId
                    ? `"${targetPhaseName || targetPhaseId}" Phase의 현재 WBS 데이터를 백업합니다.`
                    : hasExistingPhases
                      ? `현재 ${existingPhases.length}개 Phase의 WBS 데이터를 백업하여 필요시 복원할 수 있습니다.`
                      : '기존 WBS 데이터가 있으면 백업하여 필요시 복원할 수 있습니다.'}
                </p>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <h4 className="font-medium text-indigo-900 mb-2">적용 요약</h4>
            <ul className="text-sm text-indigo-800 space-y-1">
              {applyMode === 'all' && methodologyPhases ? (
                <>
                  <li>
                    - 적용 범위: <strong>전체 방법론 단계 ({Math.min(template.phases.length, methodologyPhases.length)}개)</strong>
                  </li>
                  <li>
                    - 적용 방식: <strong>{replaceExisting ? '기존 WBS 교체' : '기존 WBS에 추가'}</strong>
                  </li>
                  {includeWbs && (
                    <>
                      <li>
                        - 총 추가될 WBS Group:{' '}
                        <strong>
                          {selectedPhases.reduce((sum, p) => sum + p.wbsGroups.length, 0)}
                        </strong>
                        개
                      </li>
                      <li>
                        - 총 추가될 WBS Item:{' '}
                        <strong>
                          {selectedPhases.reduce(
                            (sum, p) =>
                              sum + p.wbsGroups.reduce((s, g) => s + g.items.length, 0),
                            0
                          )}
                        </strong>
                        개
                      </li>
                      <li>
                        - 총 추가될 WBS Task:{' '}
                        <strong>
                          {selectedPhases.reduce(
                            (sum, p) =>
                              sum + p.wbsGroups.reduce(
                                (s, g) => s + g.items.reduce((t, i) => t + i.tasks.length, 0),
                                0
                              ),
                            0
                          )}
                        </strong>
                        개
                      </li>
                    </>
                  )}
                </>
              ) : targetPhaseId ? (
                <>
                  <li>
                    - 대상 Phase: <strong>{targetPhaseName || targetPhaseId}</strong>
                  </li>
                  {linkedCategoryId && (
                    <li>
                      - 연결 카테고리:{' '}
                      <strong>
                        {(wbsCategories as Array<{ id: string; name: string }>).find(c => c.id === linkedCategoryId)?.name || linkedCategoryId}
                      </strong>
                    </li>
                  )}
                  {includeWbs && (
                    <>
                      <li>
                        - 추가될 카테고리:{' '}
                        <strong>
                          {selectedPhases.reduce((sum, p) => sum + p.wbsGroups.length, 0)}
                        </strong>
                        개
                      </li>
                      <li>
                        - 추가될 WBS Item:{' '}
                        <strong>
                          {selectedPhases.reduce(
                            (sum, p) =>
                              sum + p.wbsGroups.reduce((s, g) => s + g.items.length, 0),
                            0
                          )}
                        </strong>
                        개
                      </li>
                      <li>
                        - 추가될 WBS Task:{' '}
                        <strong>
                          {selectedPhases.reduce(
                            (sum, p) =>
                              sum + p.wbsGroups.reduce(
                                (s, g) => s + g.items.reduce((t, i) => t + i.tasks.length, 0),
                                0
                              ),
                            0
                          )}
                        </strong>
                        개
                      </li>
                    </>
                  )}
                </>
              ) : (
                <>
                  <li>
                    - 선택된 Phase: <strong>{selectedPhaseIds.length}</strong>개
                  </li>
                  {includeWbs && (
                    <>
                      <li>
                        - 생성될 카테고리:{' '}
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
                </>
              )}
            </ul>
          </div>

          {/* Warning - only show when creating new phases */}
          {!targetPhaseId && selectedPhaseIds.length === 0 && (
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
            disabled={(!targetPhaseId && selectedPhaseIds.length === 0) || applyMutation.isPending || createSnapshotMutation.isPending}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {createSnapshotMutation.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                백업 생성 중...
              </>
            ) : applyMutation.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {targetPhaseId ? 'WBS 추가 중...' : '적용 중...'}
              </>
            ) : (
              targetPhaseId ? 'WBS 추가' : '템플릿 적용'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
