import { useState } from 'react';
import {
  X,
  Link2,
  Target,
  Layers,
  FileText,
  ChevronDown,
  ChevronRight,
  Flag,
  Box,
} from 'lucide-react';
import { usePhases } from '../../../hooks/api/usePhases';
import { useWbsGroups, useWbsItems } from '../../../hooks/api/useWbs';
import { useEpics } from '../../../hooks/api/useEpics';
import { useFeatures } from '../../../hooks/api/useFeatures';
import EpicPhaseLinker from '../integration/EpicPhaseLinker';
import FeatureGroupLinker from '../integration/FeatureGroupLinker';
import StoryItemLinker from '../integration/StoryItemLinker';

interface WbsConnectionPanelProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  canEdit?: boolean;
}

type TabType = 'epic-phase' | 'feature-group' | 'story-item';

export default function WbsConnectionPanel({
  projectId,
  isOpen,
  onClose,
  canEdit = true,
}: WbsConnectionPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('epic-phase');
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const { data: phases = [] } = usePhases(projectId);
  const { data: wbsGroups = [] } = useWbsGroups(selectedPhaseId || undefined);
  const { data: wbsItems = [] } = useWbsItems(selectedGroupId || undefined);
  const { data: epics = [] } = useEpics(projectId);
  const { data: features = [] } = useFeatures();

  // Calculate connection statistics
  const linkedEpicsCount = epics.filter((e) => e.phaseId).length;
  const linkedFeaturesCount = features.filter((f) => f.wbsGroupId).length;

  if (!isOpen) return null;

  const tabs = [
    {
      id: 'epic-phase' as TabType,
      label: 'Epic ↔ Phase',
      icon: Target,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      id: 'feature-group' as TabType,
      label: 'Feature ↔ WBS Group',
      icon: Layers,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      id: 'story-item' as TabType,
      label: 'Story ↔ WBS Item',
      icon: FileText,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
  ];

  return (
    <div className="fixed inset-y-0 right-0 w-[480px] bg-white shadow-xl z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Link2 className="text-indigo-600" size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">WBS 연결 관리</h3>
            <p className="text-xs text-gray-500">백로그 항목을 WBS 구조와 연결합니다</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-3 p-4 border-b border-gray-100">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-lg font-semibold text-blue-600">
            {linkedEpicsCount}/{epics.length}
          </div>
          <div className="text-xs text-gray-600">Epic 연결됨</div>
        </div>
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <div className="text-lg font-semibold text-purple-600">
            {linkedFeaturesCount}/{features.length}
          </div>
          <div className="text-xs text-gray-600">Feature 연결됨</div>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-lg font-semibold text-green-600">{phases.length}</div>
          <div className="text-xs text-gray-600">전체 Phase</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? `${tab.color} border-current ${tab.bgColor}`
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon size={16} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'epic-phase' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Phase를 선택하여 Epic을 연결하세요. 연결된 Epic은 해당 Phase의 일정과 연동됩니다.
            </p>
            {phases.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Flag className="mx-auto mb-2" size={32} />
                <p>등록된 Phase가 없습니다.</p>
              </div>
            ) : (
              phases.map((phase) => (
                <EpicPhaseLinker
                  key={phase.id}
                  phaseId={phase.id}
                  phaseName={phase.name}
                  projectId={projectId}
                  canEdit={canEdit}
                />
              ))
            )}
          </div>
        )}

        {activeTab === 'feature-group' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              WBS Group을 선택하여 Feature를 연결하세요. 먼저 Phase를 선택한 후 해당 Phase의 WBS
              Group을 관리할 수 있습니다.
            </p>

            {/* Phase Selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Phase 선택</label>
              <select
                value={selectedPhaseId || ''}
                onChange={(e) => {
                  setSelectedPhaseId(e.target.value || null);
                  setSelectedGroupId(null);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Phase를 선택하세요</option>
                {phases.map((phase) => (
                  <option key={phase.id} value={phase.id}>
                    {phase.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedPhaseId && (
              <>
                {wbsGroups.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Box className="mx-auto mb-2" size={32} />
                    <p>이 Phase에 WBS Group이 없습니다.</p>
                  </div>
                ) : (
                  wbsGroups.map((group) => (
                    <FeatureGroupLinker
                      key={group.id}
                      wbsGroupId={group.id}
                      groupName={group.name}
                      canEdit={canEdit}
                    />
                  ))
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'story-item' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              WBS Item을 선택하여 Story를 연결하세요. 먼저 Phase와 WBS Group을 선택한 후 해당 Group의
              WBS Item을 관리할 수 있습니다.
            </p>

            {/* Phase Selector */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phase</label>
                <select
                  value={selectedPhaseId || ''}
                  onChange={(e) => {
                    setSelectedPhaseId(e.target.value || null);
                    setSelectedGroupId(null);
                    setSelectedItemId(null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                >
                  <option value="">선택</option>
                  {phases.map((phase) => (
                    <option key={phase.id} value={phase.id}>
                      {phase.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">WBS Group</label>
                <select
                  value={selectedGroupId || ''}
                  onChange={(e) => {
                    setSelectedGroupId(e.target.value || null);
                    setSelectedItemId(null);
                  }}
                  disabled={!selectedPhaseId}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">선택</option>
                  {wbsGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedGroupId && (
              <>
                {wbsItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="mx-auto mb-2" size={32} />
                    <p>이 Group에 WBS Item이 없습니다.</p>
                  </div>
                ) : (
                  wbsItems.map((item) => (
                    <StoryItemLinker
                      key={item.id}
                      wbsItemId={item.id}
                      itemName={item.name}
                      canEdit={canEdit}
                    />
                  ))
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <button
          type="button"
          onClick={onClose}
          className="w-full px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
