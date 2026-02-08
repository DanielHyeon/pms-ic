import { useState, useMemo, useEffect } from 'react';
import {
  FolderTree,
  Calendar,
  ChevronDown,
  Link2,
  GanttChartSquare,
  TreeDeciduous,
  Layers,
} from 'lucide-react';
import {
  WbsTreeView,
  StoryLinkModal,
  WbsOverviewTree,
  WbsGanttChart,
  WbsKpiRow,
  WbsFilters,
  WBS_FILTER_KEYS,
  WbsContextPanel,
} from './wbs';
import type { WbsPanelMode } from './wbs';
import { WbsBacklogIntegration } from './integration';
import { usePhases } from '../../hooks/api/usePhases';
import { useStories } from '../../hooks/api/useStories';
import { useProjectWbs } from '../../hooks/api/useWbs';
import { AI_MODEL_DEVELOPMENT_PHASE_ID, AI_MODEL_DEVELOPMENT_PHASE } from './phases';
import {
  useDownloadWbsTemplate,
  useExportWbs,
  useImportWbs,
} from '../../hooks/api/useExcelImportExport';
import { ExcelImportExportButtons } from './common/ExcelImportExportButtons';
import { getRolePermissions } from '../../utils/rolePermissions';
import { PhaseWithWbs } from '../../types/wbs';
import { UserRole } from '../App';
import { useProject } from '../../contexts/ProjectContext';
import { usePreset } from '../../hooks/usePreset';
import { useFilterSpec } from '../../hooks/useFilterSpec';
import { PresetSwitcher } from './common/PresetSwitcher';

interface WbsManagementProps {
  userRole: UserRole;
}

type TabType = 'wbs' | 'integration';
type ViewMode = 'phase' | 'overview' | 'gantt';

// Phase data type from API
interface ApiPhaseData {
  id: string;
  name: string;
  description?: string;
  status?: string;
  progress?: number;
  startDate?: string;
  endDate?: string;
  code?: string;
  projectId?: string;
  parentId?: string;
  [key: string]: unknown;
}

export default function WbsManagement({ userRole }: WbsManagementProps) {
  // Get current project from context
  const { currentProject } = useProject();
  const projectId = currentProject?.id;
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('wbs');
  const [viewMode, setViewMode] = useState<ViewMode>('phase');
  const [showStoryLinkModal, setShowStoryLinkModal] = useState(false);
  const [selectedWbsItemId, setSelectedWbsItemId] = useState<string>('');
  const [selectedWbsItemName, setSelectedWbsItemName] = useState<string>('');

  // v2.0: Preset management
  const { currentPreset, switchPreset } = usePreset(userRole.toUpperCase());

  // v2.0: FilterSpec-based filtering
  const { filters, setFilters } = useFilterSpec({ keys: WBS_FILTER_KEYS, syncUrl: false });

  // v2.0: Right context panel state
  const [panelMode, setPanelMode] = useState<WbsPanelMode>('none');
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // API hooks - use usePhases with projectId for direct filtering
  const { data: phasesRaw } = usePhases(projectId);
  const phases = (phasesRaw || []) as ApiPhaseData[];
  const { data: stories = [] } = useStories();

  // Excel import/export hooks
  const downloadTemplateMutation = useDownloadWbsTemplate();
  const exportMutation = useExportWbs();
  const importMutation = useImportWbs();

  // Role permissions
  const permissions = getRolePermissions(userRole);
  const canEdit = permissions.canEdit;

  // Display phases for category dropdown - show only main phases (no parentId)
  // This includes: 요구사항 분석, 시스템 설계, AI 모델 개발, 백엔드 개발, 통합 및 테스트, 배포 및 오픈
  const displayPhases = useMemo(() => {
    return phases.filter(p => !p.parentId);
  }, [phases]);

  const selectedPhase = phases.find(p => p.id === selectedPhaseId);

  // Get child phases for the selected phase (for hierarchical display)
  const childPhasesOfSelected = useMemo(() => {
    if (!selectedPhaseId) return [];
    return phases.filter(p => p.parentId === selectedPhaseId);
  }, [phases, selectedPhaseId]);

  // Prepare phases info for project-wide WBS query
  const phasesInfo = useMemo(() => {
    return phases.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description || '',
      status: p.status || 'PENDING',
      progress: p.progress || 0,
      startDate: p.startDate || '',
      endDate: p.endDate || '',
      parentId: (p as any).parentId,
    }));
  }, [phases]);

  // Project-wide WBS data for overview and gantt views
  const { data: projectWbsData, isLoading: wbsLoading, refetch: refetchWbs } = useProjectWbs(
    projectId,
    phasesInfo
  );

  // Convert to PhaseWithWbs type with hierarchical structure
  const phasesWithWbs: PhaseWithWbs[] = useMemo(() => {
    const allPhases = (projectWbsData || []) as PhaseWithWbs[];

    // Separate parent and child phases
    const childPhases = allPhases.filter(p => p.parentId === AI_MODEL_DEVELOPMENT_PHASE_ID);
    const otherPhases = allPhases.filter(p => p.parentId !== AI_MODEL_DEVELOPMENT_PHASE_ID && p.id !== AI_MODEL_DEVELOPMENT_PHASE_ID);

    // If we have child phases under AI_MODEL_DEVELOPMENT_PHASE_ID, create parent phase
    if (childPhases.length > 0) {
      // Calculate parent progress from children
      const childProgress = childPhases.reduce((sum, p) => sum + (p.calculatedProgress || p.progress || 0), 0) / childPhases.length;

      const parentPhase: PhaseWithWbs = {
        id: AI_MODEL_DEVELOPMENT_PHASE_ID,
        name: AI_MODEL_DEVELOPMENT_PHASE.name,
        description: AI_MODEL_DEVELOPMENT_PHASE.description,
        status: childPhases.every(p => p.status === 'COMPLETED')
          ? 'COMPLETED'
          : childPhases.some(p => p.status === 'IN_PROGRESS')
            ? 'IN_PROGRESS'
            : 'PENDING',
        progress: Math.round(childProgress),
        startDate: AI_MODEL_DEVELOPMENT_PHASE.startDate,
        endDate: AI_MODEL_DEVELOPMENT_PHASE.endDate,
        groups: [],
        totalGroups: childPhases.reduce((sum, p) => sum + (p.totalGroups || 0), 0),
        completedGroups: childPhases.reduce((sum, p) => sum + (p.completedGroups || 0), 0),
        calculatedProgress: Math.round(childProgress),
        childPhases: childPhases,
      };

      // Find the correct position for parent phase based on original phases order
      // The parent phase should be at orderNum 3 (after 시스템 설계)
      const parentOrderNum = phases.find(p => p.id === AI_MODEL_DEVELOPMENT_PHASE_ID)?.orderNum ?? 3;

      // Insert parent at correct position based on orderNum
      const result: PhaseWithWbs[] = [];
      let inserted = false;

      for (const phase of otherPhases) {
        const phaseOrderNum = phases.find(p => p.id === phase.id)?.orderNum ?? 999;
        if (!inserted && parentOrderNum < phaseOrderNum) {
          result.push(parentPhase);
          inserted = true;
        }
        result.push(phase);
      }

      if (!inserted) {
        result.push(parentPhase);
      }

      return result;
    }

    return allPhases;
  }, [projectWbsData, phases]);

  // Auto-select the first IN_PROGRESS phase when phases data loads
  useEffect(() => {
    if (phases.length > 0 && !selectedPhaseId) {
      // Find the first IN_PROGRESS phase
      const inProgressPhase = phases.find(p => p.status === 'IN_PROGRESS');
      if (inProgressPhase) {
        setSelectedPhaseId(inProgressPhase.id);
      } else {
        // If no IN_PROGRESS phase, select the first non-completed phase
        const pendingPhase = phases.find(p => p.status !== 'COMPLETED');
        if (pendingPhase) {
          setSelectedPhaseId(pendingPhase.id);
        } else {
          // All phases completed, select the first one
          setSelectedPhaseId(phases[0].id);
        }
      }
    }
  }, [phases, selectedPhaseId]);

  // Handle phase selection
  const handlePhaseSelect = (phaseId: string) => {
    setSelectedPhaseId(phaseId);
  };

  // Handle story link
  const handleLinkStory = (wbsItemId: string) => {
    setSelectedWbsItemId(wbsItemId);
    setSelectedWbsItemName('WBS Item');
    setShowStoryLinkModal(true);
  };

  const tabs = [
    { id: 'wbs' as TabType, label: 'WBS 구조', icon: FolderTree },
    { id: 'integration' as TabType, label: '백로그 연결', icon: Link2 },
  ];

  const viewModes = [
    { id: 'phase' as ViewMode, label: '카테고리별', icon: Layers, description: '카테고리별 WBS 보기' },
    { id: 'overview' as ViewMode, label: '전체 트리', icon: TreeDeciduous, description: '전체 WBS 트리 보기' },
    { id: 'gantt' as ViewMode, label: '간트 차트', icon: GanttChartSquare, description: '타임라인 보기' },
  ];

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">일정 관리 (WBS)</h1>
          <p className="text-gray-500 mt-1">Work Breakdown Structure 기반 일정 관리</p>
        </div>

        <div className="flex items-center gap-4">
          {/* Preset Switcher (v2.0) */}
          <PresetSwitcher
            currentPreset={currentPreset}
            onSwitch={switchPreset}
            compact
          />
          <div className="w-px h-6 bg-gray-300" />

          {/* Excel Import/Export */}
          {canEdit && (
            <ExcelImportExportButtons
              onDownloadTemplate={() => downloadTemplateMutation.mutateAsync(projectId)}
              onExport={() => exportMutation.mutateAsync({ projectId })}
              onImport={(file) => importMutation.mutateAsync({ projectId, file })}
              isDownloadingTemplate={downloadTemplateMutation.isPending}
              isExporting={exportMutation.isPending}
              isImporting={importMutation.isPending}
            />
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {viewModes.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setViewMode(mode.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === mode.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              title={mode.description}
            >
              <mode.icon size={16} />
              {mode.label}
            </button>
          ))}
          </div>
        </div>
      </div>

      {/* KPI Cards (v2.0) */}
      <WbsKpiRow preset={currentPreset} phases={phasesWithWbs} />

      {/* Filter Bar (v2.0) */}
      <WbsFilters values={filters} onChange={setFilters} preset={currentPreset} />

      {/* Category Selector - Only show for 'phase' view mode */}
      {viewMode === 'phase' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-700">카테고리 선택:</span>
            </div>
            <div className="relative flex-1 max-w-md">
              <select
                value={selectedPhaseId}
                onChange={(e) => handlePhaseSelect(e.target.value)}
                title="카테고리 선택"
                aria-label="카테고리 선택"
                className="w-full appearance-none px-4 py-2 pr-10 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">카테고리를 선택하세요</option>
                {displayPhases.map((phase) => (
                  <option key={phase.id} value={phase.id}>
                    {phase.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={18}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
            {selectedPhase && (
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    selectedPhase.status === 'COMPLETED'
                      ? 'bg-green-100 text-green-700'
                      : selectedPhase.status === 'IN_PROGRESS'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {selectedPhase.status === 'COMPLETED'
                    ? '완료'
                    : selectedPhase.status === 'IN_PROGRESS'
                    ? '진행 중'
                    : '대기'}
                </span>
                <span className="text-sm text-gray-500">
                  진행률: {selectedPhase.progress || 0}%
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content + Context Panel (v2.0) */}
      <div className="flex gap-4">
        <div className={panelMode !== 'none' ? 'flex-1 min-w-0' : 'w-full'}>
          {/* Main Content based on view mode */}
          {viewMode === 'overview' && (
            <WbsOverviewTree
              phases={phasesWithWbs}
              isLoading={wbsLoading}
              onRefresh={refetchWbs}
              canEdit={canEdit}
            />
          )}

          {viewMode === 'gantt' && (
            <WbsGanttChart
              phases={phasesWithWbs}
              projectId={projectId}
              isLoading={wbsLoading}
            />
          )}

          {viewMode === 'phase' && (
            <>
              {!selectedPhaseId ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                  <FolderTree size={48} className="mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    카테고리를 선택하세요
                  </h3>
                  <p className="text-gray-500 mb-4">
                    WBS 구조를 확인하고 관리하려면 먼저 카테고리를 선택해 주세요.
                  </p>
                  <p className="text-sm text-gray-400">
                    또는 상단의 &quot;전체 트리&quot; 또는 &quot;간트 차트&quot;를 선택하여 전체 프로젝트 WBS를 확인할 수 있습니다.
                  </p>
                </div>
              ) : (
                <>
                  {/* Tab Navigation */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="border-b border-gray-200">
                      <nav className="flex space-x-0">
                        {tabs.map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                              activeTab === tab.id
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                          >
                            <tab.icon size={16} />
                            {tab.label}
                          </button>
                        ))}
                      </nav>
                    </div>

                    {/* Tab Content */}
                    <div className="p-6">
                      {activeTab === 'wbs' && selectedPhase && (
                        <WbsTreeView
                          phaseId={selectedPhaseId}
                          phaseName={selectedPhase.name}
                          phaseCode={selectedPhase.code || '1'}
                          canEdit={canEdit}
                          onLinkStory={handleLinkStory}
                          childPhases={childPhasesOfSelected}
                        />
                      )}

                      {activeTab === 'integration' && (
                        <WbsBacklogIntegration
                          projectId={projectId}
                          phaseId={selectedPhaseId}
                          phaseName={selectedPhase?.name || ''}
                          canEdit={canEdit}
                        />
                      )}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Context Panel (v2.0) */}
        {panelMode !== 'none' && (
          <WbsContextPanel
            panelMode={panelMode}
            selectedGroup={selectedGroup}
            selectedItem={selectedItem}
            selectedPhase={phasesWithWbs.find(p => p.id === selectedPhaseId) || null}
            preset={currentPreset}
            onClose={() => {
              setPanelMode('none');
              setSelectedGroup(null);
              setSelectedItem(null);
            }}
          />
        )}
      </div>

      {/* Story Link Modal */}
      {showStoryLinkModal && (
        <StoryLinkModal
          wbsItemId={selectedWbsItemId}
          wbsItemName={selectedWbsItemName}
          stories={stories.map(s => ({
            id: String(s.id),
            title: s.title,
            epicName: undefined,
            status: s.status,
            storyPoints: s.storyPoints,
          }))}
          onClose={() => setShowStoryLinkModal(false)}
        />
      )}
    </div>
  );
}
