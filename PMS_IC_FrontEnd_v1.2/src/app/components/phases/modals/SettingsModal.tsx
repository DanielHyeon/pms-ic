import { X, LayoutTemplate, Layers, ChevronDown } from 'lucide-react';
import { TemplateLibrary } from '../../templates';
import type { Phase, SettingsTabType } from '../types';
import { normalizeResponse } from '../../../../utils/phaseMappers';

interface SettingsModalProps {
  selectedPhase: Phase;
  syncedPhases: Phase[];
  phasesData: unknown;
  linkedCategories: Record<string, string>;
  settingsTab: SettingsTabType;
  canEdit: boolean;
  onSetSettingsTab: (tab: SettingsTabType) => void;
  onSetLinkedCategories: (categories: Record<string, string>) => void;
  onApplySuccess: () => void;
  onClose: () => void;
}

export function SettingsModal({
  selectedPhase,
  syncedPhases,
  phasesData,
  linkedCategories,
  settingsTab,
  canEdit,
  onSetSettingsTab,
  onSetLinkedCategories,
  onApplySuccess,
  onClose,
}: SettingsModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <ModalHeader onClose={onClose} />
        <TabNavigation activeTab={settingsTab} onTabChange={onSetSettingsTab} />
        <div className="flex-1 overflow-y-auto p-6">
          {settingsTab === 'template' ? (
            <TemplateLibrary
              projectId="proj-001"
              targetPhaseId={selectedPhase.id}
              targetPhaseName={selectedPhase.name}
              methodologyPhases={syncedPhases.map((phase, index) => ({
                id: phase.id,
                name: phase.name,
                orderNum: index + 1,
              }))}
              canEdit={canEdit}
              onApplySuccess={onApplySuccess}
            />
          ) : (
            <CategoryLinkingSection
              syncedPhases={syncedPhases}
              phasesData={phasesData}
              linkedCategories={linkedCategories}
              onSetLinkedCategories={onSetLinkedCategories}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Sub-components

interface ModalHeaderProps {
  onClose: () => void;
}

function ModalHeader({ onClose }: ModalHeaderProps) {
  return (
    <div className="flex items-center justify-between p-6 border-b border-gray-200">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">설정</h3>
        <p className="text-sm text-gray-500 mt-1">단계별 프로젝트 관리 설정</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        title="닫기"
        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <X size={20} />
      </button>
    </div>
  );
}

interface TabNavigationProps {
  activeTab: SettingsTabType;
  onTabChange: (tab: SettingsTabType) => void;
}

function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="border-b border-gray-200 px-6">
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => onTabChange('template')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'template'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          <LayoutTemplate size={18} />
          템플릿 관리
        </button>
        <button
          type="button"
          onClick={() => onTabChange('category')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'category'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          <Layers size={18} />
          WBS 카테고리 연결
        </button>
      </div>
    </div>
  );
}

interface CategoryLinkingSectionProps {
  syncedPhases: Phase[];
  phasesData: unknown;
  linkedCategories: Record<string, string>;
  onSetLinkedCategories: (categories: Record<string, string>) => void;
}

function CategoryLinkingSection({
  syncedPhases,
  phasesData,
  linkedCategories,
  onSetLinkedCategories,
}: CategoryLinkingSectionProps) {
  const hasLinkedCategories = Object.keys(linkedCategories).filter(k => linkedCategories[k]).length > 0;

  return (
    <div className="space-y-6">
      <CategoryLinkingInfo />
      <div className="space-y-3">
        {syncedPhases.map((phase, index) => {
          const wbsCategories = normalizeResponse(phasesData, []) as Array<{ id: string; name: string }>;
          return (
            <PhaseRow
              key={phase.id}
              phase={phase}
              index={index}
              wbsCategories={wbsCategories}
              linkedCategoryId={linkedCategories[phase.id] || ''}
              onCategoryChange={(categoryId) => {
                onSetLinkedCategories({
                  ...linkedCategories,
                  [phase.id]: categoryId,
                });
              }}
            />
          );
        })}
      </div>
      {hasLinkedCategories && (
        <LinkedCategoriesSummary
          syncedPhases={syncedPhases}
          phasesData={phasesData}
          linkedCategories={linkedCategories}
        />
      )}
    </div>
  );
}

function CategoryLinkingInfo() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <Layers size={20} className="text-amber-600 mt-0.5" />
        <div>
          <h4 className="font-medium text-amber-900">WBS 카테고리 연결</h4>
          <p className="text-sm text-amber-700 mt-1">
            각 방법론 단계를 일정 관리 페이지의 WBS 카테고리와 연결합니다.
            연결된 카테고리의 WBS 구조가 해당 단계에 표시됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}

interface PhaseRowProps {
  phase: Phase;
  index: number;
  wbsCategories: Array<{ id: string; name: string }>;
  linkedCategoryId: string;
  onCategoryChange: (categoryId: string) => void;
}

function PhaseRow({ phase, index, wbsCategories, linkedCategoryId, onCategoryChange }: PhaseRowProps) {
  return (
    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 truncate">{phase.name}</div>
        <div className="text-xs text-gray-500">{phase.description}</div>
      </div>
      <div className="relative w-64">
        <select
          value={linkedCategoryId}
          onChange={(e) => onCategoryChange(e.target.value)}
          title={`${phase.name} 카테고리 연결`}
          className="w-full appearance-none px-3 py-2 pr-10 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        >
          <option value="">연결하지 않음</option>
          {wbsCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
      </div>
    </div>
  );
}

interface LinkedCategoriesSummaryProps {
  syncedPhases: Phase[];
  phasesData: unknown;
  linkedCategories: Record<string, string>;
}

function LinkedCategoriesSummary({ syncedPhases, phasesData, linkedCategories }: LinkedCategoriesSummaryProps) {
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <h4 className="font-medium text-green-900 mb-2">연결 현황</h4>
      <ul className="text-sm text-green-800 space-y-1">
        {syncedPhases.filter(p => linkedCategories[p.id]).map(phase => {
          const wbsCategories = normalizeResponse(phasesData, []) as Array<{ id: string; name: string }>;
          const category = wbsCategories.find(c => c.id === linkedCategories[phase.id]);
          return (
            <li key={phase.id}>
              {'\u2022'} {phase.name} {'\u2192'} <strong>{category?.name || '알 수 없음'}</strong>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
