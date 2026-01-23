import { useState } from 'react';
import {
  GitBranch,
  Clock,
  Target,
  BarChart3,
  Filter,
  RefreshCw,
  Loader2,
  FileText,
  BookOpen,
  CheckSquare,
  Zap,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { useProject } from '../../../contexts/ProjectContext';
import { useLineageGraph, useLineageTimeline } from '../../../hooks/api';
import { UserRole } from '../../App';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  LineageGraphDto,
  LineageStatisticsDto,
  LineageEventDto,
  LineageNodeDto,
  PageResponse,
  NODE_TYPE_CONFIG,
} from '../../../types/lineage';
import LineageGraph from './LineageGraph';
import LineageTimeline from './LineageTimeline';
import ImpactAnalysis from './ImpactAnalysis';

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
    <div className="p-6 space-y-6">
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
        <Button variant="outline" onClick={handleRefresh} disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          새로고침
        </Button>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <StatCard
            label="요구사항"
            value={statistics.requirements}
            icon={FileText}
            color="blue"
          />
          <StatCard
            label="유저스토리"
            value={statistics.stories}
            icon={BookOpen}
            color="purple"
          />
          <StatCard
            label="태스크"
            value={statistics.tasks}
            icon={CheckSquare}
            color="green"
          />
          <StatCard
            label="스프린트"
            value={statistics.sprints}
            icon={Zap}
            color="red"
          />
          <StatCard
            label="연결됨"
            value={statistics.linkedRequirements}
            icon={ArrowRight}
            color="cyan"
          />
          <StatCard
            label="미연결"
            value={statistics.unlinkedRequirements}
            icon={Target}
            color="amber"
          />
          <StatCard
            label="커버리지"
            value={`${statistics.coverage}%`}
            icon={TrendingUp}
            color="emerald"
          />
        </div>
      )}

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
                  onNodeClick={(node) => {
                    setSelectedNode(node);
                    setActiveTab('impact');
                  }}
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
            onNodeSelect={(node) => setSelectedNode(node)}
          />
        </TabsContent>
      </Tabs>

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

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: 'blue' | 'purple' | 'green' | 'red' | 'cyan' | 'amber' | 'emerald';
}

function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    cyan: 'bg-cyan-50 text-cyan-600',
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
