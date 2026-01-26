import { useState } from 'react';
import {
  FolderTree,
  Calendar,
  ChevronDown,
  LayoutTemplate,
  Link2,
  RefreshCw,
} from 'lucide-react';
import { WbsTreeView, StoryLinkModal } from './wbs';
import { TemplateLibrary, ApplyTemplateModal } from './templates';
import { WbsBacklogIntegration } from './integration';
import { useAllPhases } from '../../hooks/api/usePhases';
import { useTemplateSets, useApplyTemplateToPhase } from '../../hooks/api/useTemplates';
import { useStories } from '../../hooks/api/useStories';
import { getRolePermissions } from '../../utils/rolePermissions';
import { TemplateSet } from '../../types/templates';
import { UserRole } from '../App';

interface WbsManagementProps {
  userRole: UserRole;
  projectId?: string;
}

type TabType = 'wbs' | 'templates' | 'integration';

export default function WbsManagement({ userRole, projectId = 'proj-001' }: WbsManagementProps) {
  const [selectedPhaseId, setSelectedPhaseId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('wbs');
  const [showStoryLinkModal, setShowStoryLinkModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedWbsItemId, setSelectedWbsItemId] = useState<string>('');
  const [selectedWbsItemName, setSelectedWbsItemName] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateSet | null>(null);

  // API hooks
  const { data: phasesData } = useAllPhases();
  const { data: templates = [] } = useTemplateSets();
  const { data: stories = [] } = useStories(projectId);
  const applyTemplateMutation = useApplyTemplateToPhase();

  // Role permissions
  const permissions = getRolePermissions(userRole);
  const canEdit = permissions.canEdit;

  // Phases data
  const phases = phasesData || [];
  const selectedPhase = phases.find(p => p.id === selectedPhaseId);

  // Handle phase selection
  const handlePhaseSelect = (phaseId: string) => {
    setSelectedPhaseId(phaseId);
  };

  // Handle story link
  const handleLinkStory = (wbsItemId: string) => {
    setSelectedWbsItemId(wbsItemId);
    setSelectedWbsItemName('WBS Item'); // TODO: Get actual name
    setShowStoryLinkModal(true);
  };

  // Handle template apply
  const handleApplyTemplate = (template: TemplateSet) => {
    setSelectedTemplate(template);
    setShowTemplateModal(true);
  };

  const handleConfirmApplyTemplate = async () => {
    if (!selectedTemplate || !selectedPhaseId) return;

    try {
      await applyTemplateMutation.mutateAsync({
        templateSetId: selectedTemplate.id,
        phaseId: selectedPhaseId,
        projectId,
      });
      setShowTemplateModal(false);
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Failed to apply template:', error);
    }
  };

  const tabs = [
    { id: 'wbs' as TabType, label: 'WBS 구조', icon: FolderTree },
    { id: 'templates' as TabType, label: '템플릿', icon: LayoutTemplate },
    { id: 'integration' as TabType, label: '백로그 연결', icon: Link2 },
  ];

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">일정 관리 (WBS)</h1>
          <p className="text-gray-500 mt-1">Work Breakdown Structure 기반 일정 관리</p>
        </div>
      </div>

      {/* Phase Selector */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-700">단계 선택:</span>
          </div>
          <div className="relative flex-1 max-w-md">
            <select
              value={selectedPhaseId}
              onChange={(e) => handlePhaseSelect(e.target.value)}
              className="w-full appearance-none px-4 py-2 pr-10 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">단계를 선택하세요</option>
              {phases.map((phase) => (
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

      {/* Main Content */}
      {!selectedPhaseId ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <FolderTree size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            단계를 선택하세요
          </h3>
          <p className="text-gray-500">
            WBS 구조를 확인하고 관리하려면 먼저 단계를 선택해 주세요.
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
                />
              )}

              {activeTab === 'templates' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">템플릿 라이브러리</h3>
                      <p className="text-sm text-gray-500">
                        WBS 템플릿을 현재 단계에 적용할 수 있습니다.
                      </p>
                    </div>
                  </div>
                  <TemplateLibrary
                    templates={templates}
                    onApply={handleApplyTemplate}
                    canApply={canEdit}
                  />
                </div>
              )}

              {activeTab === 'integration' && (
                <WbsBacklogIntegration
                  projectId={projectId}
                  phaseId={selectedPhaseId}
                  canEdit={canEdit}
                />
              )}
            </div>
          </div>
        </>
      )}

      {/* Story Link Modal */}
      {showStoryLinkModal && (
        <StoryLinkModal
          wbsItemId={selectedWbsItemId}
          wbsItemName={selectedWbsItemName}
          stories={stories}
          onClose={() => setShowStoryLinkModal(false)}
        />
      )}

      {/* Template Apply Modal */}
      {showTemplateModal && selectedTemplate && (
        <ApplyTemplateModal
          template={selectedTemplate}
          phaseName={selectedPhase?.name || ''}
          onConfirm={handleConfirmApplyTemplate}
          onCancel={() => {
            setShowTemplateModal(false);
            setSelectedTemplate(null);
          }}
          isApplying={applyTemplateMutation.isPending}
        />
      )}
    </div>
  );
}
