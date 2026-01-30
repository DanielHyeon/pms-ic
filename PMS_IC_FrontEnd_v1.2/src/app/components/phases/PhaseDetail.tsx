import { FolderTree, ListChecks, Link2 } from 'lucide-react';
import { WbsTreeView, StoryLinkModal } from '../wbs';
import { WbsBacklogIntegration } from '../integration';
import { DeliverablesList } from './DeliverablesList';
import { KpiList } from './KpiList';
import type { Phase, Deliverable, KPI, PhaseDetailTab, KpiFormData } from './types';
import { getPhaseStatusColor, getPhaseStatusLabel } from '../../../utils/phaseMappers';

interface PhaseDetailProps {
  phase: Phase;
  phaseCode: string;
  activeTab: PhaseDetailTab;
  canEdit: boolean;
  canApprove: boolean;
  canUpload: boolean;
  canManageKpi: boolean;
  // Story link modal state
  showStoryLinkModal: boolean;
  selectedWbsItemId: string;
  selectedWbsItemName: string;
  storiesForLinking: Array<{
    id: string;
    title: string;
    epicName: string;
    status: string;
    storyPoints: number;
  }>;
  // Handlers
  onTabChange: (tab: PhaseDetailTab) => void;
  onUpload: (deliverableId: string) => void;
  onDownload: (deliverable: Deliverable) => void;
  onApprove: (deliverableId: string, approved: boolean) => void;
  onNewDeliverableUpload: () => void;
  onAddKpi: () => void;
  onEditKpi: (kpi: KPI) => void;
  onDeleteKpi: (kpiId: string) => void;
  onLinkStory: (wbsItemId: string) => void;
  onCloseStoryLinkModal: () => void;
}

export function PhaseDetail({
  phase,
  phaseCode,
  activeTab,
  canEdit,
  canApprove,
  canUpload,
  canManageKpi,
  showStoryLinkModal,
  selectedWbsItemId,
  selectedWbsItemName,
  storiesForLinking,
  onTabChange,
  onUpload,
  onDownload,
  onApprove,
  onNewDeliverableUpload,
  onAddKpi,
  onEditKpi,
  onDeleteKpi,
  onLinkStory,
  onCloseStoryLinkModal,
}: PhaseDetailProps) {
  const getStatusColor = getPhaseStatusColor;
  const getStatusLabel = getPhaseStatusLabel;

  return (
    <div className="lg:col-span-2 space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <PhaseHeader phase={phase} getStatusColor={getStatusColor} getStatusLabel={getStatusLabel} />
        <DateRange startDate={phase.startDate} endDate={phase.endDate} />
        <TabNavigation activeTab={activeTab} onTabChange={onTabChange} />

        {/* Tab Content */}
        {activeTab === 'integration' ? (
          <WbsBacklogIntegration
            phaseId={phase.id}
            phaseName={phase.name}
            projectId="proj-001"
            canEdit={canEdit}
          />
        ) : activeTab === 'wbs' ? (
          <WbsTreeView
            phaseId={phase.id}
            phaseName={phase.name}
            phaseCode={phaseCode}
            canEdit={canEdit}
            onLinkStory={onLinkStory}
          />
        ) : (
          <>
            <DeliverablesList
              deliverables={phase.deliverables}
              canUpload={canUpload}
              canApprove={canApprove}
              onUpload={onUpload}
              onDownload={onDownload}
              onApprove={onApprove}
              onNewUpload={onNewDeliverableUpload}
            />
            {(phase.kpis.length > 0 || canManageKpi) && (
              <KpiList
                kpis={phase.kpis}
                canManageKpi={canManageKpi}
                onAdd={onAddKpi}
                onEdit={onEditKpi}
                onDelete={onDeleteKpi}
              />
            )}
          </>
        )}
      </div>

      {phase.status === 'inProgress' && <RiskAlert />}

      {/* Story Link Modal */}
      {showStoryLinkModal && (
        <StoryLinkModal
          wbsItemId={selectedWbsItemId}
          wbsItemName={selectedWbsItemName}
          stories={storiesForLinking}
          onClose={onCloseStoryLinkModal}
        />
      )}
    </div>
  );
}

// Sub-components

interface PhaseHeaderProps {
  phase: Phase;
  getStatusColor: (status: string) => string;
  getStatusLabel: (status: string) => string;
}

function PhaseHeader({ phase, getStatusColor, getStatusLabel }: PhaseHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900">{phase.name}</h3>
        <p className="text-sm text-gray-500 mt-1">{phase.description}</p>
      </div>
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(phase.status)}`}
      >
        {getStatusLabel(phase.status)}
      </span>
    </div>
  );
}

interface DateRangeProps {
  startDate: string;
  endDate: string;
}

function DateRange({ startDate, endDate }: DateRangeProps) {
  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-500">시작일</p>
        <p className="text-sm font-medium text-gray-900 mt-1">{startDate}</p>
      </div>
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-500">종료일</p>
        <p className="text-sm font-medium text-gray-900 mt-1">{endDate}</p>
      </div>
    </div>
  );
}

interface TabNavigationProps {
  activeTab: PhaseDetailTab;
  onTabChange: (tab: PhaseDetailTab) => void;
}

function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="flex border-b border-gray-200 mb-6">
      <button
        type="button"
        onClick={() => onTabChange('deliverables')}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
          activeTab === 'deliverables'
            ? 'text-blue-600 border-b-2 border-blue-600'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <ListChecks size={18} />
        산출물 / KPI
      </button>
      <button
        type="button"
        onClick={() => onTabChange('wbs')}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
          activeTab === 'wbs'
            ? 'text-blue-600 border-b-2 border-blue-600'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <FolderTree size={18} />
        WBS 관리
      </button>
      <button
        type="button"
        onClick={() => onTabChange('integration')}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
          activeTab === 'integration'
            ? 'text-blue-600 border-b-2 border-blue-600'
            : 'text-gray-500 hover:text-gray-700'
        }`}
      >
        <Link2 size={18} />
        통합
      </button>
    </div>
  );
}

function RiskAlert() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <svg className="text-amber-600 mt-0.5 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <p className="font-medium text-amber-900">주의 필요</p>
          <p className="text-sm text-amber-800 mt-1">
            OCR 인식률이 목표치 대비 1.5%p 낮습니다. 추가 데이터 확보 및 모델 튜닝이 필요합니다.
          </p>
        </div>
      </div>
    </div>
  );
}
