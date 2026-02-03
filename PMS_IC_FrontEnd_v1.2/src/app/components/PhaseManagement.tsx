import { useState, useEffect } from 'react';
import { Plus, LayoutTemplate } from 'lucide-react';
import { useStories } from '../../hooks/api/useStories';
import { usePhaseWbs } from '../../hooks/api/useWbs';
import { WbsGroupWithItems, calculateWeightedProgress } from '../../types/wbs';
import { UserRole } from '../App';
import { apiService } from '../../services/api';
import {
  useAllPhases,
  usePhaseDeliverables,
  usePhaseKpis,
  useCreatePhase,
  useUpdatePhase,
  useDeletePhase,
  useUploadDeliverable,
  useApproveDeliverable,
  useCreatePhaseKpi,
  useUpdatePhaseKpi,
  useDeletePhaseKpi,
} from '../../hooks/api/usePhases';
import { getRolePermissions } from '../../utils/rolePermissions';
import {
  mapPhaseFromApi,
  mapDeliverableFromApi,
  mapKpiFromApi,
  mapPhaseStatusToApi,
  mapKpiStatusToApi,
  normalizeResponse,
} from '../../utils/phaseMappers';

import {
  INITIAL_PHASES,
  AI_MODEL_DEVELOPMENT_PHASE_ID,
  PhaseList,
  PhaseDetail,
  ReadOnlyBanner,
  UploadModal,
  KpiModal,
  PhaseModal,
  SettingsModal,
  type Phase,
  type Deliverable,
  type KPI,
  type ApiPhase,
  type PhaseFormData,
  type KpiFormData,
  type PhaseDetailTab,
  type SettingsTabType,
} from './phases';

interface PhaseManagementProps {
  userRole: UserRole;
  projectId?: string;
}

export default function PhaseManagement({ userRole, projectId = 'proj-001' }: PhaseManagementProps) {
  // Core state - selectedPhase defaults to 3단계 (inProgress phase)
  const [selectedPhase, setSelectedPhase] = useState<Phase>(INITIAL_PHASES[2]);
  const [activeTab, setActiveTab] = useState<PhaseDetailTab>('deliverables');
  const [pendingSelectPhaseId, setPendingSelectPhaseId] = useState<string | null>(null);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDeliverable, setSelectedDeliverable] = useState<Deliverable | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isNewDeliverable, setIsNewDeliverable] = useState(false);
  const [newDeliverableName, setNewDeliverableName] = useState('');
  const [newDeliverableDescription, setNewDeliverableDescription] = useState('');
  const [newDeliverableType, setNewDeliverableType] = useState('DOCUMENT');

  // KPI modal state
  const [showKpiModal, setShowKpiModal] = useState(false);
  const [editingKpi, setEditingKpi] = useState<KPI | null>(null);
  const [kpiForm, setKpiForm] = useState<KpiFormData>({
    name: '',
    target: '',
    current: '',
    status: 'onTrack',
  });

  // Phase modal state
  const [showPhaseModal, setShowPhaseModal] = useState(false);
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null);
  const [phaseForm, setPhaseForm] = useState<PhaseFormData>({
    name: '',
    description: '',
    status: 'pending',
    startDate: '',
    endDate: '',
    progress: 0,
  });

  // Settings modal state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTabType>('template');
  const [linkedCategories, setLinkedCategories] = useState<Record<string, string>>({});

  // Story link modal state
  const [showStoryLinkModal, setShowStoryLinkModal] = useState(false);
  const [selectedWbsItemId, setSelectedWbsItemId] = useState<string>('');
  const [selectedWbsItemName, setSelectedWbsItemName] = useState<string>('');

  // TanStack Query hooks
  const { data: allPhasesData } = useAllPhases();
  // Filter phases by projectId and parentId (sub-phases under AI 모델 개발)
  const phasesData = (allPhasesData as any[] | undefined)?.filter(
    (p: any) => p.projectId === projectId && p.parentId === AI_MODEL_DEVELOPMENT_PHASE_ID
  );
  const isValidApiPhaseId = selectedPhase.id && selectedPhase.id.startsWith('phase-');
  const { data: deliverables } = usePhaseDeliverables(isValidApiPhaseId ? selectedPhase.id : '');
  const { data: kpis } = usePhaseKpis(isValidApiPhaseId ? selectedPhase.id : '');

  const createPhaseMutation = useCreatePhase();
  const updatePhaseMutation = useUpdatePhase();
  const deletePhaseMutation = useDeletePhase();
  const uploadDeliverableMutation = useUploadDeliverable();
  const approveDeliverableMutation = useApproveDeliverable();
  const createKpiMutation = useCreatePhaseKpi();
  const updateKpiMutation = useUpdatePhaseKpi();
  const deleteKpiMutation = useDeletePhaseKpi();

  // Fetch WBS groups for current phase
  const { data: phaseWbsData } = usePhaseWbs(isValidApiPhaseId ? selectedPhase.id : '');
  const wbsGroups: WbsGroupWithItems[] = phaseWbsData || [];
  const wbsBasedProgress = wbsGroups.length > 0
    ? calculateWeightedProgress(wbsGroups.map(g => ({ weight: g.weight, progress: g.calculatedProgress })))
    : null;

  // Stories for WBS linking
  const { data: storiesData = [] } = useStories();
  const storiesForLinking = storiesData.map((s: any) => ({
    id: s.id,
    title: s.title,
    epicName: s.epic,
    status: s.status,
    storyPoints: s.storyPoints,
  }));

  // Permissions
  const permissions = getRolePermissions(userRole);
  const { canEdit, canApprove, canUpload, canManageKpi, canManagePhases } = permissions;

  // Sync phases with API data
  useEffect(() => {
    if (phasesData) {
      const phaseData = normalizeResponse<ApiPhase[]>(phasesData, []);
      const phasesArray: ApiPhase[] = Array.isArray(phaseData) ? phaseData : [];
      if (phasesArray.length > 0) {
        if (pendingSelectPhaseId) {
          const newPhase = phasesArray.find((p: ApiPhase) => p.id === pendingSelectPhaseId);
          if (newPhase) {
            const mappedPhase = mapPhaseFromApi(newPhase);
            setSelectedPhase(mappedPhase);
            setPendingSelectPhaseId(null);
            return;
          }
        }
        // Match by ID for the selected phase
        const apiPhase = phasesArray.find((p: ApiPhase) => p.id === selectedPhase.id);
        if (apiPhase) {
          const mappedPhase = mapPhaseFromApi(apiPhase);
          // Only update if API has newer data
          if (mappedPhase.progress !== selectedPhase.progress || mappedPhase.status !== selectedPhase.status) {
            setSelectedPhase({ ...selectedPhase, ...mappedPhase });
          }
        }
      }
    }
  }, [phasesData, pendingSelectPhaseId]);

  // Synced phases (merge API data with methodology phases)
  const syncedPhases = (() => {
    const methodologyPhases = [...INITIAL_PHASES];
    if (!phasesData) return methodologyPhases;

    const phaseData = normalizeResponse<ApiPhase[]>(phasesData, []);
    const phasesArray: ApiPhase[] = Array.isArray(phaseData) ? phaseData : [];
    if (!phasesArray.length) return methodologyPhases;

    return methodologyPhases.map((methodologyPhase) => {
      // Match by ID (phase-001-03-01, phase-001-03-02, etc.)
      const apiPhase = phasesArray.find((p: ApiPhase) => p.id === methodologyPhase.id);
      if (apiPhase) {
        const mappedPhase = mapPhaseFromApi(apiPhase);
        const phaseDeliverables = Array.isArray(apiPhase.deliverables)
          ? apiPhase.deliverables.map(mapDeliverableFromApi)
          : [];
        const phaseKpis = Array.isArray(apiPhase.kpis)
          ? apiPhase.kpis.map(mapKpiFromApi)
          : [];
        return {
          ...methodologyPhase,
          status: mappedPhase.status || methodologyPhase.status,
          progress: mappedPhase.progress ?? methodologyPhase.progress,
          startDate: mappedPhase.startDate || methodologyPhase.startDate,
          endDate: mappedPhase.endDate || methodologyPhase.endDate,
          deliverables: phaseDeliverables.length > 0 ? phaseDeliverables : methodologyPhase.deliverables,
          kpis: phaseKpis.length > 0 ? phaseKpis : methodologyPhase.kpis,
          parentId: methodologyPhase.parentId,
        };
      }
      return methodologyPhase;
    });
  })();

  // Current phase with merged deliverables and KPIs
  // Use API data only if it has actual items, otherwise fall back to mock data
  const currentPhaseWithDetails: Phase = {
    ...selectedPhase,
    deliverables: (Array.isArray(deliverables) && deliverables.length > 0)
      ? deliverables.map(mapDeliverableFromApi)
      : selectedPhase.deliverables,
    kpis: (Array.isArray(kpis) && kpis.length > 0)
      ? kpis.map(mapKpiFromApi)
      : selectedPhase.kpis,
  };

  // Handlers
  const handlePhaseSelect = (phase: Phase) => setSelectedPhase(phase);

  const handleUpload = (deliverableId: string) => {
    const deliverable = selectedPhase.deliverables.find((d) => d.id === deliverableId);
    if (deliverable) {
      setSelectedDeliverable(deliverable);
      setShowUploadModal(true);
      setUploadFile(null);
      setIsNewDeliverable(false);
    }
  };

  const handleConfirmUpload = async () => {
    if (!uploadFile) return;
    if (isNewDeliverable && !newDeliverableName.trim()) return;
    if (!isNewDeliverable && !selectedDeliverable) return;

    try {
      await uploadDeliverableMutation.mutateAsync({
        phaseId: selectedPhase.id,
        deliverableId: selectedDeliverable?.id,
        file: uploadFile,
        name: isNewDeliverable ? newDeliverableName.trim() : undefined,
        description: isNewDeliverable && newDeliverableDescription.trim() ? newDeliverableDescription.trim() : undefined,
        type: isNewDeliverable ? newDeliverableType : undefined,
      });
    } catch (error) {
      console.warn('Deliverable upload failed', error);
    }

    closeUploadModal();
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
    setSelectedDeliverable(null);
    setUploadFile(null);
    setIsNewDeliverable(false);
    setNewDeliverableName('');
    setNewDeliverableDescription('');
    setNewDeliverableType('DOCUMENT');
  };

  const handleApprove = async (deliverableId: string, approved: boolean) => {
    try {
      await approveDeliverableMutation.mutateAsync({
        deliverableId,
        approved,
        phaseId: selectedPhase.id,
      });
    } catch (error) {
      console.warn('Deliverable approval failed', error);
    }
  };

  const handleDownload = async (deliverable: Deliverable) => {
    try {
      const blob = await apiService.downloadDeliverable(deliverable.id);
      if (!blob) {
        alert(`"${deliverable.name}" 다운로드를 시작합니다. (실제 환경에서는 파일이 다운로드됩니다)`);
        return;
      }
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = deliverable.fileName || deliverable.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.warn('Deliverable download failed', error);
    }
  };

  const handleSaveKpi = async () => {
    if (!kpiForm.name.trim()) return;
    const payload = {
      name: kpiForm.name.trim(),
      target: kpiForm.target.trim(),
      current: kpiForm.current.trim(),
      status: mapKpiStatusToApi(kpiForm.status),
    };

    try {
      if (editingKpi) {
        await updateKpiMutation.mutateAsync({ phaseId: selectedPhase.id, kpiId: editingKpi.id, data: payload });
      } else {
        await createKpiMutation.mutateAsync({ phaseId: selectedPhase.id, data: payload });
      }
    } catch (error) {
      console.warn('KPI save failed', error);
    }

    setShowKpiModal(false);
    setEditingKpi(null);
  };

  const handleDeleteKpi = async (kpiId: string) => {
    try {
      await deleteKpiMutation.mutateAsync({ phaseId: selectedPhase.id, kpiId });
    } catch (error) {
      console.warn('KPI delete failed', error);
    }
  };

  const handleSavePhase = async () => {
    if (!phaseForm.name.trim()) return;
    const payload = {
      name: phaseForm.name.trim(),
      description: phaseForm.description.trim(),
      status: mapPhaseStatusToApi(phaseForm.status),
      startDate: phaseForm.startDate || undefined,
      endDate: phaseForm.endDate || undefined,
      progress: phaseForm.progress,
      orderNum: syncedPhases.length + 1,
    };

    try {
      if (editingPhase) {
        await updatePhaseMutation.mutateAsync({ id: editingPhase.id, data: payload });
      } else {
        await createPhaseMutation.mutateAsync({ projectId, data: payload });
      }
    } catch (error) {
      console.warn('Phase save failed', error);
    }

    setShowPhaseModal(false);
    setEditingPhase(null);
    setPhaseForm({ name: '', description: '', status: 'pending', startDate: '', endDate: '', progress: 0 });
  };

  const handleDeletePhase = async () => {
    if (!editingPhase || !confirm('이 단계를 삭제하시겠습니까?')) return;

    try {
      await deletePhaseMutation.mutateAsync(editingPhase.id);
      if (selectedPhase.id === editingPhase.id && syncedPhases.length > 1) {
        const remaining = syncedPhases.filter((p) => p.id !== editingPhase.id);
        setSelectedPhase(remaining[0]);
      }
    } catch (error) {
      console.warn('Phase delete failed', error);
    }

    setShowPhaseModal(false);
    setEditingPhase(null);
  };

  const openPhaseModal = (phase?: Phase) => {
    if (phase) {
      setEditingPhase(phase);
      setPhaseForm({
        name: phase.name,
        description: phase.description,
        status: phase.status,
        startDate: phase.startDate,
        endDate: phase.endDate,
        progress: phase.progress,
      });
    } else {
      setEditingPhase(null);
      setPhaseForm({ name: '', description: '', status: 'pending', startDate: '', endDate: '', progress: 0 });
    }
    setShowPhaseModal(true);
  };

  const handleNewDeliverableUpload = () => {
    setSelectedDeliverable(null);
    setIsNewDeliverable(true);
    setNewDeliverableName('');
    setNewDeliverableDescription('');
    setNewDeliverableType('DOCUMENT');
    setUploadFile(null);
    setShowUploadModal(true);
  };

  const handleAddKpi = () => {
    setEditingKpi(null);
    setKpiForm({ name: '', target: '', current: '', status: 'onTrack' });
    setShowKpiModal(true);
  };

  const handleEditKpi = (kpi: KPI) => {
    setEditingKpi(kpi);
    setKpiForm({ name: kpi.name, target: kpi.target, current: kpi.current, status: kpi.status });
    setShowKpiModal(true);
  };

  const handleLinkStory = (wbsItemId: string) => {
    setSelectedWbsItemId(wbsItemId);
    setSelectedWbsItemName('WBS Item');
    setShowStoryLinkModal(true);
  };

  return (
    <div className="p-6">
      {!canEdit && <ReadOnlyBanner />}

      <Header
        canManagePhases={canManagePhases}
        onOpenSettings={() => setShowSettingsModal(true)}
        onAddPhase={() => openPhaseModal()}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PhaseList
          phases={syncedPhases}
          selectedPhaseId={selectedPhase.id}
          canManagePhases={canManagePhases}
          onPhaseSelect={handlePhaseSelect}
          onEditPhase={openPhaseModal}
        />

        <PhaseDetail
          phase={currentPhaseWithDetails}
          phaseCode={String(syncedPhases.findIndex((p) => p.id === selectedPhase.id) + 1)}
          activeTab={activeTab}
          canEdit={canEdit}
          canApprove={canApprove}
          canUpload={canUpload}
          canManageKpi={canManageKpi}
          showStoryLinkModal={showStoryLinkModal}
          selectedWbsItemId={selectedWbsItemId}
          selectedWbsItemName={selectedWbsItemName}
          storiesForLinking={storiesForLinking}
          onTabChange={setActiveTab}
          onUpload={handleUpload}
          onDownload={handleDownload}
          onApprove={handleApprove}
          onNewDeliverableUpload={handleNewDeliverableUpload}
          onAddKpi={handleAddKpi}
          onEditKpi={handleEditKpi}
          onDeleteKpi={handleDeleteKpi}
          onLinkStory={handleLinkStory}
          onCloseStoryLinkModal={() => setShowStoryLinkModal(false)}
        />
      </div>

      {/* Modals */}
      {showUploadModal && (selectedDeliverable || isNewDeliverable) && (
        <UploadModal
          isNewDeliverable={isNewDeliverable}
          selectedDeliverable={selectedDeliverable}
          uploadFile={uploadFile}
          newDeliverableName={newDeliverableName}
          newDeliverableDescription={newDeliverableDescription}
          newDeliverableType={newDeliverableType}
          onFileChange={setUploadFile}
          onNameChange={setNewDeliverableName}
          onDescriptionChange={setNewDeliverableDescription}
          onTypeChange={setNewDeliverableType}
          onConfirm={handleConfirmUpload}
          onClose={closeUploadModal}
        />
      )}

      {showKpiModal && (
        <KpiModal
          isEditing={!!editingKpi}
          formData={kpiForm}
          onFormChange={setKpiForm}
          onSave={handleSaveKpi}
          onClose={() => {
            setShowKpiModal(false);
            setEditingKpi(null);
          }}
        />
      )}

      {showPhaseModal && (
        <PhaseModal
          isEditing={!!editingPhase}
          formData={phaseForm}
          onFormChange={setPhaseForm}
          onSave={handleSavePhase}
          onDelete={editingPhase ? handleDeletePhase : undefined}
          onClose={() => {
            setShowPhaseModal(false);
            setEditingPhase(null);
          }}
        />
      )}

      {showSettingsModal && (
        <SettingsModal
          selectedPhase={selectedPhase}
          syncedPhases={syncedPhases}
          phasesData={phasesData}
          linkedCategories={linkedCategories}
          settingsTab={settingsTab}
          canEdit={canEdit}
          onSetSettingsTab={setSettingsTab}
          onSetLinkedCategories={setLinkedCategories}
          onApplySuccess={() => {
            setShowSettingsModal(false);
            setActiveTab('wbs');
          }}
          onClose={() => setShowSettingsModal(false)}
        />
      )}
    </div>
  );
}

// Header component
interface HeaderProps {
  canManagePhases: boolean;
  onOpenSettings: () => void;
  onAddPhase: () => void;
}

function Header({ canManagePhases, onOpenSettings, onAddPhase }: HeaderProps) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">단계별 프로젝트 관리</h2>
        <p className="text-sm text-gray-500 mt-1">Waterfall 기반 거시적 프로세스 관리</p>
      </div>
      {canManagePhases && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenSettings}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <LayoutTemplate size={18} />
            템플릿 설정
          </button>
          <button
            type="button"
            onClick={onAddPhase}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
            단계 추가
          </button>
        </div>
      )}
    </div>
  );
}
