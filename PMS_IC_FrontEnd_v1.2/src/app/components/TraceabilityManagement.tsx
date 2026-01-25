import { useState, useMemo } from 'react';
import {
  Table,
  FileText,
  BookOpen,
  CheckSquare,
  AlertTriangle,
  Link2,
  Link2Off,
  ChevronDown,
  Filter,
  Download,
  Search,
  BarChart3,
  AlertCircle,
} from 'lucide-react';
import { useLineageGraph } from '../../hooks/api/useLineage';
import { useRequirements } from '../../hooks/api/useRequirements';
import { useStories } from '../../hooks/api/useStories';
import { useKanbanTasks } from '../../hooks/api/useTasks';
import { getRolePermissions } from '../../utils/rolePermissions';
import { UserRole } from '../App';
import { NODE_TYPE_CONFIG, LineageNodeDto, LineageEdgeDto } from '../../types/lineage';

interface TraceabilityManagementProps {
  userRole: UserRole;
  projectId?: string;
}

interface TraceabilityRow {
  requirementId: string;
  requirementCode: string;
  requirementTitle: string;
  requirementStatus: string;
  linkedStories: Array<{
    id: string;
    code?: string;
    title: string;
    status?: string;
  }>;
  linkedTasks: Array<{
    id: string;
    code?: string;
    title: string;
    status?: string;
  }>;
  coverage: 'full' | 'partial' | 'none';
}

type FilterType = 'all' | 'covered' | 'partial' | 'uncovered';

export default function TraceabilityManagement({
  userRole,
  projectId = 'proj-001',
}: TraceabilityManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // API hooks
  const { data: lineageData, isLoading: isLineageLoading } = useLineageGraph(projectId);
  const { data: requirements = [] } = useRequirements(projectId);
  const { data: stories = [] } = useStories(projectId);
  const { data: tasks = [] } = useKanbanTasks(projectId);

  // Role permissions
  const permissions = getRolePermissions(userRole);
  const canEdit = permissions.canEdit;

  // Build traceability matrix from lineage data
  const traceabilityMatrix = useMemo(() => {
    if (!lineageData) return [];

    const { nodes, edges } = lineageData;

    // Map nodes by ID
    const nodeMap = new Map<string, LineageNodeDto>();
    nodes.forEach((node) => nodeMap.set(node.id, node));

    // Get all requirements
    const requirementNodes = nodes.filter((n) => n.type === 'REQUIREMENT');

    // Build traceability rows
    const rows: TraceabilityRow[] = requirementNodes.map((req) => {
      // Find linked stories (DERIVES relationship)
      const storyEdges = edges.filter(
        (e) => e.source === req.id && e.relationship === 'DERIVES'
      );
      const linkedStories = storyEdges
        .map((e) => nodeMap.get(e.target))
        .filter((n): n is LineageNodeDto => n !== undefined && n.type === 'USER_STORY')
        .map((n) => ({
          id: n.id,
          code: n.code,
          title: n.title,
          status: n.status,
        }));

      // Find linked tasks (through stories or directly)
      const linkedTasks: Array<{ id: string; code?: string; title: string; status?: string }> = [];

      // Tasks from stories
      linkedStories.forEach((story) => {
        const taskEdges = edges.filter(
          (e) => e.source === story.id && e.relationship === 'BREAKS_DOWN_TO'
        );
        taskEdges.forEach((e) => {
          const taskNode = nodeMap.get(e.target);
          if (taskNode && taskNode.type === 'TASK') {
            linkedTasks.push({
              id: taskNode.id,
              code: taskNode.code,
              title: taskNode.title,
              status: taskNode.status,
            });
          }
        });
      });

      // Direct task links
      const directTaskEdges = edges.filter(
        (e) => e.source === req.id && e.relationship === 'IMPLEMENTED_BY'
      );
      directTaskEdges.forEach((e) => {
        const taskNode = nodeMap.get(e.target);
        if (taskNode && taskNode.type === 'TASK') {
          if (!linkedTasks.find((t) => t.id === taskNode.id)) {
            linkedTasks.push({
              id: taskNode.id,
              code: taskNode.code,
              title: taskNode.title,
              status: taskNode.status,
            });
          }
        }
      });

      // Determine coverage
      let coverage: 'full' | 'partial' | 'none';
      if (linkedStories.length > 0 && linkedTasks.length > 0) {
        coverage = 'full';
      } else if (linkedStories.length > 0 || linkedTasks.length > 0) {
        coverage = 'partial';
      } else {
        coverage = 'none';
      }

      return {
        requirementId: req.id,
        requirementCode: req.code || req.id,
        requirementTitle: req.title,
        requirementStatus: req.status || 'OPEN',
        linkedStories,
        linkedTasks,
        coverage,
      };
    });

    return rows;
  }, [lineageData]);

  // Calculate statistics
  const statistics = useMemo(() => {
    const total = traceabilityMatrix.length;
    const fullyCovered = traceabilityMatrix.filter((r) => r.coverage === 'full').length;
    const partiallyCovered = traceabilityMatrix.filter((r) => r.coverage === 'partial').length;
    const uncovered = traceabilityMatrix.filter((r) => r.coverage === 'none').length;
    const totalStories = new Set(traceabilityMatrix.flatMap((r) => r.linkedStories.map((s) => s.id))).size;
    const totalTasks = new Set(traceabilityMatrix.flatMap((r) => r.linkedTasks.map((t) => t.id))).size;

    return {
      total,
      fullyCovered,
      partiallyCovered,
      uncovered,
      coverageRate: total > 0 ? Math.round(((fullyCovered + partiallyCovered) / total) * 100) : 0,
      totalStories,
      totalTasks,
    };
  }, [traceabilityMatrix]);

  // Filter rows
  const filteredRows = useMemo(() => {
    let filtered = traceabilityMatrix;

    // Filter by coverage type
    if (filterType === 'covered') {
      filtered = filtered.filter((r) => r.coverage === 'full');
    } else if (filterType === 'partial') {
      filtered = filtered.filter((r) => r.coverage === 'partial');
    } else if (filterType === 'uncovered') {
      filtered = filtered.filter((r) => r.coverage === 'none');
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.requirementCode.toLowerCase().includes(query) ||
          r.requirementTitle.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [traceabilityMatrix, filterType, searchQuery]);

  // Toggle row expansion
  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Get coverage badge style
  const getCoverageBadge = (coverage: 'full' | 'partial' | 'none') => {
    switch (coverage) {
      case 'full':
        return 'bg-green-100 text-green-700';
      case 'partial':
        return 'bg-amber-100 text-amber-700';
      case 'none':
        return 'bg-red-100 text-red-700';
    }
  };

  const getCoverageLabel = (coverage: 'full' | 'partial' | 'none') => {
    switch (coverage) {
      case 'full':
        return '완전 추적';
      case 'partial':
        return '부분 추적';
      case 'none':
        return '미추적';
    }
  };

  if (isLineageLoading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          <span className="text-sm text-gray-500">추적 데이터 로딩 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">추적 매트릭스</h1>
          <p className="text-gray-500 mt-1">요구사항-설계-테스트 추적 관리</p>
        </div>
        <button
          type="button"
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
        >
          <Download size={16} />
          Excel 내보내기
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={20} className="text-blue-600" />
              <span className="text-sm text-gray-500">전체 요구사항</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">{statistics.total}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 size={20} className="text-green-600" />
              <span className="text-sm text-gray-500">추적률</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">{statistics.coverageRate}%</span>
          </div>
          <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full"
              style={{ width: `${statistics.coverageRate}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen size={20} className="text-purple-600" />
              <span className="text-sm text-gray-500">연결된 스토리</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">{statistics.totalStories}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={20} className="text-amber-600" />
              <span className="text-sm text-gray-500">미추적 요구사항</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">{statistics.uncovered}</span>
          </div>
        </div>
      </div>

      {/* Coverage Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm text-gray-600">완전 추적: {statistics.fullyCovered}건</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-sm text-gray-600">부분 추적: {statistics.partiallyCovered}건</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-sm text-gray-600">미추적: {statistics.uncovered}건</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="요구사항 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as FilterType)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">전체 보기</option>
              <option value="covered">완전 추적만</option>
              <option value="partial">부분 추적만</option>
              <option value="uncovered">미추적만</option>
            </select>
          </div>
        </div>
      </div>

      {/* Traceability Matrix Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  요구사항
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  스토리
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  태스크
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  추적 상태
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
                    <p>표시할 요구사항이 없습니다.</p>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <>
                    <tr
                      key={row.requirementId}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleRow(row.requirementId)}
                    >
                      <td className="px-4 py-3">
                        <ChevronDown
                          size={16}
                          className={`text-gray-400 transition-transform ${
                            expandedRows.has(row.requirementId) ? 'rotate-180' : ''
                          }`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <span className="text-xs text-gray-500 font-mono">{row.requirementCode}</span>
                          <p className="font-medium text-gray-900">{row.requirementTitle}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            row.requirementStatus === 'APPROVED'
                              ? 'bg-green-100 text-green-700'
                              : row.requirementStatus === 'IN_REVIEW'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {row.requirementStatus === 'APPROVED'
                            ? '승인됨'
                            : row.requirementStatus === 'IN_REVIEW'
                            ? '검토중'
                            : '대기'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {row.linkedStories.length > 0 ? (
                            <>
                              <Link2 size={14} className="text-purple-600" />
                              <span className="text-sm font-medium text-purple-600">
                                {row.linkedStories.length}
                              </span>
                            </>
                          ) : (
                            <>
                              <Link2Off size={14} className="text-gray-400" />
                              <span className="text-sm text-gray-400">0</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {row.linkedTasks.length > 0 ? (
                            <>
                              <Link2 size={14} className="text-green-600" />
                              <span className="text-sm font-medium text-green-600">
                                {row.linkedTasks.length}
                              </span>
                            </>
                          ) : (
                            <>
                              <Link2Off size={14} className="text-gray-400" />
                              <span className="text-sm text-gray-400">0</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getCoverageBadge(row.coverage)}`}>
                          {getCoverageLabel(row.coverage)}
                        </span>
                      </td>
                    </tr>

                    {/* Expanded Row Details */}
                    {expandedRows.has(row.requirementId) && (
                      <tr key={`${row.requirementId}-details`}>
                        <td colSpan={6} className="px-4 py-4 bg-gray-50">
                          <div className="grid grid-cols-2 gap-6">
                            {/* Linked Stories */}
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                <BookOpen size={14} className="text-purple-600" />
                                연결된 스토리 ({row.linkedStories.length})
                              </h4>
                              {row.linkedStories.length === 0 ? (
                                <p className="text-sm text-gray-400">연결된 스토리 없음</p>
                              ) : (
                                <ul className="space-y-1">
                                  {row.linkedStories.map((story) => (
                                    <li
                                      key={story.id}
                                      className="flex items-center gap-2 text-sm text-gray-600 p-2 bg-white rounded border border-gray-200"
                                    >
                                      <span className="text-xs text-gray-400 font-mono">
                                        {story.code || story.id.slice(0, 8)}
                                      </span>
                                      <span className="truncate">{story.title}</span>
                                      {story.status && (
                                        <span className="px-1.5 py-0.5 text-xs rounded bg-purple-100 text-purple-700">
                                          {story.status}
                                        </span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>

                            {/* Linked Tasks */}
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                <CheckSquare size={14} className="text-green-600" />
                                연결된 태스크 ({row.linkedTasks.length})
                              </h4>
                              {row.linkedTasks.length === 0 ? (
                                <p className="text-sm text-gray-400">연결된 태스크 없음</p>
                              ) : (
                                <ul className="space-y-1">
                                  {row.linkedTasks.map((task) => (
                                    <li
                                      key={task.id}
                                      className="flex items-center gap-2 text-sm text-gray-600 p-2 bg-white rounded border border-gray-200"
                                    >
                                      <span className="text-xs text-gray-400 font-mono">
                                        {task.code || task.id.slice(0, 8)}
                                      </span>
                                      <span className="truncate">{task.title}</span>
                                      {task.status && (
                                        <span className="px-1.5 py-0.5 text-xs rounded bg-green-100 text-green-700">
                                          {task.status}
                                        </span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
