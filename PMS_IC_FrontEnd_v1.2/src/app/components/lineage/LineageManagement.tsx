import { useState } from 'react';
import {
  GitBranch,
  Clock,
  Target,
  Filter,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { useProject } from '../../../contexts/ProjectContext';
import { useLineageGraph, useLineageTimeline } from '../../../hooks/api';
import { usePreset } from '../../../hooks/usePreset';
import { useFilterSpec } from '../../../hooks/useFilterSpec';
import { PresetSwitcher } from '../common/PresetSwitcher';
import type { UserRole } from '../../App';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import type { LineageNodeDto } from '../../../types/lineage';
import { NODE_TYPE_CONFIG } from '../../../types/lineage';
import LineageGraph from './LineageGraph';
import LineageTimeline from './LineageTimeline';
import ImpactAnalysis from './ImpactAnalysis';
import { LineageKpiRow } from './LineageKpiRow';
import { LineageFilters, LINEAGE_FILTER_KEYS } from './LineageFilters';
import { LineageRightPanel, type LineagePanelMode } from './LineageRightPanel';

interface LineageManagementProps {
  userRole: UserRole;
}

export default function LineageManagement({ userRole }: LineageManagementProps) {
  const { currentProject } = useProject();
  const [activeTab, setActiveTab] = useState<'graph' | 'timeline' | 'impact'>('graph');
  const [timelineFilters, setTimelineFilters] = useState({
    aggregateType: '',
    page: 0,
    size: 20,
  });
  const [selectedNode, setSelectedNode] = useState<LineageNodeDto | null>(null);

  // v2.0: Preset management
  const { currentPreset, switchPreset } = usePreset(userRole.toUpperCase());

  // v2.0: FilterSpec-based filtering
  const { filters, setFilters } = useFilterSpec({ keys: LINEAGE_FILTER_KEYS, syncUrl: false });

  // v2.0: Right panel state
  const [panelMode, setPanelMode] = useState<LineagePanelMode>('none');
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);

  // TanStack Query hooks
  const {
    data: graphData,
    isLoading: graphLoading,
    refetch: refetchGraph,
  } = useLineageGraph(activeTab === 'graph' ? currentProject?.id : undefined);

  const {
    data: timelineData,
    isLoading: timelineLoading,
    refetch: refetchTimeline,
  } = useLineageTimeline(
    activeTab === 'timeline' ? currentProject?.id : undefined,
    timelineFilters
  );

  const loading = activeTab === 'graph' ? graphLoading : activeTab === 'timeline' ? timelineLoading : false;
  const statistics = graphData?.statistics || null;

  const handleRefresh = () => {
    if (activeTab === 'graph') {
      refetchGraph();
    } else if (activeTab === 'timeline') {
      refetchTimeline();
    }
  };

  const handleFilterChange = (type: string) => {
    setTimelineFilters((prev) => ({
      ...prev,
      aggregateType: type === 'all' ? '' : type,
      page: 0,
    }));
  };

  const handleNodeClick = (node: LineageNodeDto) => {
    setSelectedNode(node);
    setSelectedEntityId(node.id);
    setPanelMode('entity_detail');
  };

  const handlePanelClose = () => {
    setPanelMode('none');
    setSelectedEntityId(null);
  };

  const showPanel = panelMode !== 'none';

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <GitBranch className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-gray-900">프로젝트가 선택되지 않았습니다</h2>
          <p className="text-gray-500 mt-1">리니지 데이터를 보려면 프로젝트를 선택하세요</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <GitBranch className="h-6 w-6 text-blue-600" />
            Lineage & History
          </h1>
          <p className="text-gray-500 mt-1">
            요구사항, 스토리, 태스크 간의 관계, 변경 사항 및 영향도를 추적합니다
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Preset Switcher (v2.0) */}
          <PresetSwitcher
            currentPreset={currentPreset}
            onSwitch={switchPreset}
            compact
          />
          <div className="w-px h-6 bg-gray-300" />
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            새로고침
          </Button>
        </div>
      </div>

      {/* KPI Row (v2.0 - replaces old StatCards) */}
      <LineageKpiRow statistics={statistics} preset={currentPreset} />

      {/* Filter Bar (v2.0) */}
      <LineageFilters values={filters} onChange={setFilters} preset={currentPreset} />

      {/* Main content area: tabs + right panel */}
      <div className="flex gap-4">
        {/* Left: Tab content area */}
        <div className={showPanel ? 'flex-1 min-w-0' : 'w-full'}>
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="graph" className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  리니지 그래프
                </TabsTrigger>
                <TabsTrigger value="timeline" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  활동 타임라인
                </TabsTrigger>
                <TabsTrigger value="impact" className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  영향도 분석
                </TabsTrigger>
              </TabsList>

              {activeTab === 'timeline' && (
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <Select
                    value={timelineFilters.aggregateType || 'all'}
                    onValueChange={handleFilterChange}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="유형 필터" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      <SelectItem value="REQUIREMENT">요구사항</SelectItem>
                      <SelectItem value="USER_STORY">유저스토리</SelectItem>
                      <SelectItem value="TASK">태스크</SelectItem>
                      <SelectItem value="SPRINT">스프린트</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <TabsContent value="graph" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  {loading ? (
                    <div className="flex items-center justify-center h-[600px]">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    </div>
                  ) : graphData ? (
                    <LineageGraph
                      data={graphData}
                      onNodeClick={handleNodeClick}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-[600px] text-gray-500">
                      리니지 데이터가 없습니다
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="timeline" className="mt-4">
              <Card>
                <CardContent className="p-4">
                  {loading ? (
                    <div className="flex items-center justify-center h-[400px]">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    </div>
                  ) : timelineData ? (
                    <LineageTimeline
                      data={timelineData}
                      onPageChange={(page) =>
                        setTimelineFilters((prev) => ({ ...prev, page }))
                      }
                    />
                  ) : (
                    <div className="flex items-center justify-center h-[400px] text-gray-500">
                      활동 데이터가 없습니다
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="impact" className="mt-4">
              <ImpactAnalysis
                projectId={currentProject.id}
                selectedNode={selectedNode}
                onNodeSelect={(node) => {
                  setSelectedNode(node);
                  setSelectedEntityId(node.id);
                  setPanelMode('entity_detail');
                }}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Panel (v2.0) */}
        {showPanel && (
          <LineageRightPanel
            mode={panelMode}
            node={selectedNode}
            preset={currentPreset}
            onClose={handlePanelClose}
            onModeChange={setPanelMode}
          />
        )}
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center justify-center gap-6 flex-wrap">
            {Object.entries(NODE_TYPE_CONFIG).map(([type, config]) => (
              <div key={type} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: config.bgColor, borderColor: config.color, borderWidth: 2 }}
                />
                <span className="text-sm text-gray-600">{config.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
