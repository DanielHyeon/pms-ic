import { useState, useMemo } from 'react';
import { Upload } from 'lucide-react';
import DeliverableManagement from './common/DeliverableManagement';
import { usePhases, useProjectDeliverables } from '../../hooks/api/usePhases';
import { getRolePermissions } from '../../utils/rolePermissions';
import { useProject } from '../../contexts/ProjectContext';
import { usePreset } from '../../hooks/usePreset';
import { useFilterSpec } from '../../hooks/useFilterSpec';
import { PresetSwitcher } from './common/PresetSwitcher';
import {
  DeliverableKpiRow,
  DeliverableFilters,
  DELIVERABLE_FILTER_KEYS,
  DeliverableRightPanel,
} from './deliverables';
import type { DeliverablePanelMode } from './deliverables';
import type { UserRole } from '../App';

interface DeliverablesPageProps {
  userRole: UserRole;
}

interface AggregatedDeliverable {
  id: string;
  name: string;
  description?: string;
  type?: string;
  status: 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';
  version?: string;
  uploadedAt?: string;
  approvedBy?: string;
  phaseId: string;
  phaseName: string;
}

interface PhaseWithDeliverables {
  id: string;
  name: string;
  deliverables?: Array<{
    id: string;
    name: string;
    description?: string;
    type?: string;
    status?: string;
    version?: string;
    uploadedAt?: string;
    approvedBy?: string;
  }>;
  [key: string]: unknown;
}

export default function DeliverablesPage({ userRole }: DeliverablesPageProps) {
  // Get current project from context
  const { currentProject } = useProject();
  const projectId = currentProject?.id;

  // API hooks - use project-specific phases and deliverables
  const { data: phasesData = [], isLoading: isPhasesLoading } = usePhases(projectId);
  const { data: deliverables = [], isLoading: isDeliverablesLoading } = useProjectDeliverables(projectId);
  const _phases = phasesData as PhaseWithDeliverables[];

  // Role permissions
  const { canEdit } = getRolePermissions(userRole);

  // Preset and filter systems
  const { currentPreset, switchPreset } = usePreset(userRole.toUpperCase());
  const { filters, setFilters } = useFilterSpec({ keys: DELIVERABLE_FILTER_KEYS, syncUrl: false });

  // Right panel state
  const [selectedDeliverableId, setSelectedDeliverableId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<DeliverablePanelMode>('none');

  // Map deliverables to the expected format
  const aggregatedDeliverables = useMemo(() => {
    if (!deliverables || !Array.isArray(deliverables)) return [];

    return deliverables.map((d: any): AggregatedDeliverable => ({
      id: d.id,
      name: d.name,
      description: d.description,
      type: d.type,
      status: (d.status as AggregatedDeliverable['status']) || 'PENDING',
      version: d.version,
      uploadedAt: d.uploadedAt || d.createdAt,
      approvedBy: d.approvedBy || d.approver,
      phaseId: d.phaseId,
      phaseName: d.phaseName,
    }));
  }, [deliverables]);

  // Filter deliverables using FilterSpec values
  const filteredDeliverables = useMemo(() => {
    let filtered = aggregatedDeliverables;

    const statusFilter = filters.status as string | undefined;
    if (statusFilter) {
      filtered = filtered.filter((d) => d.status === statusFilter);
    }

    const phaseFilter = filters.phaseId as string | undefined;
    if (phaseFilter) {
      filtered = filtered.filter((d) => d.phaseId === phaseFilter);
    }

    const searchQuery = (filters.q as string) || '';
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.name.toLowerCase().includes(query) ||
          d.phaseName.toLowerCase().includes(query) ||
          (d.description && d.description.toLowerCase().includes(query))
      );
    }

    const categoryFilter = filters.category as string | undefined;
    if (categoryFilter) {
      filtered = filtered.filter((d) => d.type === categoryFilter);
    }

    return filtered;
  }, [aggregatedDeliverables, filters]);

  // Map to DeliverableManagement format
  const deliverableForList = filteredDeliverables.map((d) => ({
    id: d.id,
    name: d.name,
    description: d.description,
    type: (d.type || 'OTHER') as 'DOCUMENT' | 'CODE' | 'REPORT' | 'PRESENTATION' | 'OTHER',
    status: d.status,
    version: d.version,
    uploadedAt: d.uploadedAt,
    approvedBy: d.approvedBy,
    phaseName: d.phaseName,
  }));

  // Selected deliverable for right panel
  const selectedDeliverable = useMemo(
    () => aggregatedDeliverables.find((d) => d.id === selectedDeliverableId),
    [aggregatedDeliverables, selectedDeliverableId]
  );

  // Handle row selection for right panel
  const handleRowSelect = (id: string) => {
    setSelectedDeliverableId(id);
    if (panelMode === 'none') {
      // Determine default panel mode based on current preset
      const presetDefaults: Record<string, DeliverablePanelMode> = {
        EXEC_SUMMARY: 'none',
        DEV_EXECUTION: 'preview',
        PM_WORK: 'approval',
        PMO_CONTROL: 'approval',
        CUSTOMER_APPROVAL: 'approval',
        AUDIT_EVIDENCE: 'detail',
      };
      const defaultMode = presetDefaults[currentPreset] || 'preview';
      setPanelMode(defaultMode);
    }
  };

  // Handle upload button click
  const handleUploadClick = () => {
    setPanelMode('upload');
    setSelectedDeliverableId(null);
  };

  if (isPhasesLoading || isDeliverablesLoading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          <span className="text-sm text-gray-500">산출물 로딩 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">산출물 관리</h1>
            <p className="text-gray-500 mt-1">프로젝트 산출물 현황 및 승인 관리</p>
          </div>
          <div className="mx-3 h-8 w-px bg-gray-200" />
          <PresetSwitcher currentPreset={currentPreset} onSwitch={switchPreset} compact />
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={handleUploadClick}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Upload size={18} />
            산출물 업로드
          </button>
        )}
      </div>

      {/* KPI Row */}
      <DeliverableKpiRow deliverables={aggregatedDeliverables} preset={currentPreset} />

      {/* Filters */}
      <DeliverableFilters values={filters} onChange={setFilters} preset={currentPreset} />

      {/* Deliverable List + Right Panel */}
      <div className="flex gap-4 flex-1 min-h-0">
        <div
          className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-6 overflow-auto cursor-pointer"
          onClick={(e) => {
            // Delegate click to row items
            const target = e.target as HTMLElement;
            const row = target.closest('[data-deliverable-id]');
            if (row) {
              const id = (row as HTMLElement).dataset.deliverableId;
              if (id) handleRowSelect(id);
            }
          }}
        >
          <DeliverableManagement
            deliverables={deliverableForList}
            isLoading={false}
            canEdit={canEdit}
          />
        </div>
        {panelMode !== 'none' && (
          <DeliverableRightPanel
            mode={panelMode}
            deliverable={selectedDeliverable}
            preset={currentPreset}
            onClose={() => {
              setPanelMode('none');
              setSelectedDeliverableId(null);
            }}
            onModeChange={setPanelMode}
            canEdit={canEdit}
          />
        )}
      </div>
    </div>
  );
}
