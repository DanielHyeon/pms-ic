import { useState } from 'react';
import {
  Link2,
  FolderTree,
  Layers,
  Box,
  FileText,
  Loader2,
  ChevronDown,
  ChevronRight,
  Target,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import { usePhaseIntegration } from '../../../hooks/api/useWbsBacklogIntegration';
import { getWbsStatusLabel, getWbsStatusColor } from '../../../types/wbs';
import EpicPhaseLinker from './EpicPhaseLinker';
import FeatureGroupLinker from './FeatureGroupLinker';
import StoryItemLinker from './StoryItemLinker';

interface WbsBacklogIntegrationProps {
  phaseId: string;
  phaseName: string;
  projectId: string;
  canEdit?: boolean;
}

export default function WbsBacklogIntegration({
  phaseId,
  phaseName,
  projectId,
  canEdit = true,
}: WbsBacklogIntegrationProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const { data: integration, isLoading, refetch } = usePhaseIntegration(phaseId, projectId);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const toggleItem = (itemId: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={32} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!integration) {
    return (
      <div className="text-center py-12 text-gray-500">
        통합 정보를 불러올 수 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Link2 size={22} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">WBS-Backlog 통합</h2>
            <p className="text-sm text-gray-500">
              Phase, WBS와 Backlog 항목 간 연결을 관리합니다
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          title="새로고침"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target size={18} className="text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Epic</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{integration.epics.linked.length}</p>
          <p className="text-xs text-blue-600">연결됨 / {integration.epics.total} 전체</p>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Box size={18} className="text-purple-600" />
            <span className="text-sm font-medium text-purple-900">Feature</span>
          </div>
          <p className="text-2xl font-bold text-purple-700">{integration.stats.linkedFeatures}</p>
          <p className="text-xs text-purple-600">연결됨 / {integration.stats.totalFeatures} 전체</p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText size={18} className="text-green-600" />
            <span className="text-sm font-medium text-green-900">Story</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{integration.stats.linkedStories}</p>
          <p className="text-xs text-green-600">연결됨 / {integration.stats.totalStories} 전체</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <FolderTree size={18} className="text-amber-600" />
            <span className="text-sm font-medium text-amber-900">WBS Group</span>
          </div>
          <p className="text-2xl font-bold text-amber-700">{integration.wbsGroups.total}</p>
          <p className="text-xs text-amber-600">이 Phase에 속함</p>
        </div>
      </div>

      {/* Phase-Epic Link Section */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <EpicPhaseLinker
          phaseId={phaseId}
          phaseName={phaseName}
          projectId={projectId}
          canEdit={canEdit}
        />
      </div>

      {/* WBS Groups with Features and Items */}
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Layers size={20} className="text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-900">WBS 구조 및 Backlog 연결</h3>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            WBS Group → Feature, WBS Item → Story 연결을 관리합니다
          </p>
        </div>

        <div className="divide-y divide-gray-100">
          {integration.wbsGroups.groups.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              이 Phase에 WBS Group이 없습니다.
            </div>
          ) : (
            integration.wbsGroups.groups.map(({ group, features, items }) => (
              <div key={group.id} className="p-4">
                {/* WBS Group */}
                <div
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleGroup(group.id)}
                >
                  <div className="flex items-center gap-3">
                    {expandedGroups.has(group.id) ? (
                      <ChevronDown size={18} />
                    ) : (
                      <ChevronRight size={18} />
                    )}
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <FolderTree size={16} className="text-indigo-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {group.code} - {group.name}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded ${getWbsStatusColor(group.status)}`}>
                          {getWbsStatusLabel(group.status)}
                        </span>
                        <span className="text-xs text-gray-500">
                          진행률: {group.progress}%
                        </span>
                        <span className="text-xs text-gray-500">
                          Feature: {features.length}개
                        </span>
                        <span className="text-xs text-gray-500">
                          Item: {items.length}개
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Group Content */}
                {expandedGroups.has(group.id) && (
                  <div className="mt-4 ml-8 space-y-4">
                    {/* Feature Linker */}
                    <FeatureGroupLinker
                      wbsGroupId={group.id}
                      groupName={group.name}
                      epicId={group.linkedEpicId}
                      canEdit={canEdit}
                    />

                    {/* WBS Items */}
                    {items.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-700 ml-2">WBS Items</h4>
                        {items.map(({ item, stories }) => (
                          <div key={item.id} className="border border-gray-200 rounded-lg">
                            <div
                              className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
                              onClick={() => toggleItem(item.id)}
                            >
                              <div className="flex items-center gap-3">
                                {expandedItems.has(item.id) ? (
                                  <ChevronDown size={16} />
                                ) : (
                                  <ChevronRight size={16} />
                                )}
                                <div className="w-6 h-6 bg-amber-100 rounded flex items-center justify-center">
                                  <Box size={12} className="text-amber-600" />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {item.code} - {item.name}
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${getWbsStatusColor(item.status)}`}>
                                      {getWbsStatusLabel(item.status)}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      Story: {stories.length}개
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {expandedItems.has(item.id) && (
                              <div className="p-3 pt-0 ml-8">
                                <StoryItemLinker
                                  wbsItemId={item.id}
                                  itemName={item.name}
                                  canEdit={canEdit}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Integration Chart Summary */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 size={18} className="text-indigo-600" />
          <h3 className="font-semibold text-indigo-900">연결 현황 요약</h3>
        </div>
        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-indigo-800">Feature 연결률</span>
              <span className="text-indigo-700 font-medium">
                {integration.stats.totalFeatures > 0
                  ? Math.round((integration.stats.linkedFeatures / integration.stats.totalFeatures) * 100)
                  : 0}%
              </span>
            </div>
            <div className="h-2 bg-indigo-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all"
                style={{
                  width: `${
                    integration.stats.totalFeatures > 0
                      ? (integration.stats.linkedFeatures / integration.stats.totalFeatures) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-purple-800">Story 연결률</span>
              <span className="text-purple-700 font-medium">
                {integration.stats.totalStories > 0
                  ? Math.round((integration.stats.linkedStories / integration.stats.totalStories) * 100)
                  : 0}%
              </span>
            </div>
            <div className="h-2 bg-purple-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-600 rounded-full transition-all"
                style={{
                  width: `${
                    integration.stats.totalStories > 0
                      ? (integration.stats.linkedStories / integration.stats.totalStories) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
