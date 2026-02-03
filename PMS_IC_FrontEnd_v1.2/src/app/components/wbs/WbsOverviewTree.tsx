import { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  FolderTree,
  Folder,
  FileText,
  Search,
  Filter,
  Calendar,
  User,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Circle,
  PauseCircle,
  XCircle,
  ArrowRight,
  RefreshCw,
  Expand,
  Shrink,
} from 'lucide-react';
import {
  WbsStatus,
  WbsGroupWithItems,
  WbsItemWithTasks,
  WbsTask,
  PhaseWithWbs,
  getWbsStatusColor,
  getWbsStatusLabel,
  isOverdue,
  getDaysRemaining,
} from '../../../types/wbs';
import WbsProgressBar from './WbsProgressBar';

interface WbsOverviewTreeProps {
  phases: PhaseWithWbs[];
  isLoading?: boolean;
  onRefresh?: () => void;
  canEdit?: boolean;
}

// Filter state type
interface WbsFilters {
  status: WbsStatus | 'ALL';
  assignee: string;
  dateRange: 'all' | 'overdue' | 'thisWeek' | 'thisMonth';
  searchTerm: string;
}

// Status icon component
function StatusIcon({ status }: { status: WbsStatus }) {
  switch (status) {
    case 'COMPLETED':
      return <CheckCircle2 size={14} className="text-green-500" />;
    case 'IN_PROGRESS':
      return <Circle size={14} className="text-blue-500 fill-blue-200" />;
    case 'ON_HOLD':
      return <PauseCircle size={14} className="text-amber-500" />;
    case 'CANCELLED':
      return <XCircle size={14} className="text-red-500" />;
    default:
      return <Circle size={14} className="text-gray-400" />;
  }
}

// Dependency indicator component
function DependencyIndicator({
  dependsOn,
  dependedBy
}: {
  dependsOn?: string[];
  dependedBy?: string[];
}) {
  if (!dependsOn?.length && !dependedBy?.length) return null;

  return (
    <div className="flex items-center gap-1">
      {dependsOn && dependsOn.length > 0 && (
        <span
          className="px-1.5 py-0.5 text-xs rounded bg-orange-100 text-orange-700 flex items-center gap-1"
          title={`선행 작업: ${dependsOn.length}개`}
        >
          <ArrowRight size={10} className="rotate-180" />
          {dependsOn.length}
        </span>
      )}
      {dependedBy && dependedBy.length > 0 && (
        <span
          className="px-1.5 py-0.5 text-xs rounded bg-purple-100 text-purple-700 flex items-center gap-1"
          title={`후행 작업: ${dependedBy.length}개`}
        >
          <ArrowRight size={10} />
          {dependedBy.length}
        </span>
      )}
    </div>
  );
}

// Task row component
function TaskRow({ task, level }: { task: WbsTask; level: number }) {
  const daysRemaining = getDaysRemaining(task.plannedEndDate);
  const overdue = isOverdue(task.plannedEndDate) && task.status !== 'COMPLETED';

  return (
    <div
      className={`flex items-center gap-2 py-1.5 px-2 ml-${level * 4} rounded hover:bg-gray-50 transition-colors text-sm`}
      style={{ marginLeft: `${level * 16}px` }}
    >
      <div className="w-4 h-4 flex items-center justify-center">
        <FileText size={12} className="text-gray-400" />
      </div>
      <span className="text-xs text-gray-400 font-mono w-20">{task.code}</span>
      <StatusIcon status={task.status} />
      <span className={`flex-1 truncate ${task.status === 'COMPLETED' ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
        {task.name}
      </span>

      {task.assigneeName && (
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <User size={10} />
          {task.assigneeName}
        </span>
      )}

      {task.estimatedHours && (
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <Clock size={10} />
          {task.estimatedHours}h
        </span>
      )}

      {task.plannedEndDate && (
        <span className={`flex items-center gap-1 text-xs ${overdue ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
          <Calendar size={10} />
          {daysRemaining !== null
            ? daysRemaining >= 0
              ? `D-${daysRemaining}`
              : `${Math.abs(daysRemaining)}일 초과`
            : task.plannedEndDate}
          {overdue && <AlertTriangle size={10} />}
        </span>
      )}

      <div className="w-16">
        <WbsProgressBar progress={task.progress} size="sm" showLabel={false} />
      </div>
      <span className="text-xs font-medium text-gray-600 w-8">{task.progress}%</span>
    </div>
  );
}

// Item row component
function ItemRow({
  item,
  level,
  isExpanded,
  onToggle,
  filters,
}: {
  item: WbsItemWithTasks;
  level: number;
  isExpanded: boolean;
  onToggle: () => void;
  filters: WbsFilters;
}) {
  const filteredTasks = useMemo(() => {
    return item.tasks.filter(task => {
      // Status filter
      if (filters.status !== 'ALL' && task.status !== filters.status) return false;
      // Assignee filter
      if (filters.assignee && task.assigneeName !== filters.assignee) return false;
      // Date filter
      if (filters.dateRange === 'overdue' && !isOverdue(task.plannedEndDate)) return false;
      // Search filter
      if (filters.searchTerm && !task.name.toLowerCase().includes(filters.searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [item.tasks, filters]);

  const hasVisibleTasks = filteredTasks.length > 0;
  const overdue = isOverdue(item.plannedEndDate) && item.status !== 'COMPLETED';

  return (
    <div style={{ marginLeft: `${level * 16}px` }}>
      <div
        className="flex items-center gap-2 py-2 px-2 rounded hover:bg-gray-50 cursor-pointer transition-colors"
        onClick={onToggle}
      >
        <button type="button" className="w-4 h-4 flex items-center justify-center">
          {item.tasks.length > 0 ? (
            isExpanded ? (
              <ChevronDown size={14} className="text-gray-400" />
            ) : (
              <ChevronRight size={14} className="text-gray-400" />
            )
          ) : (
            <span className="w-2 h-2 rounded-full bg-gray-300" />
          )}
        </button>
        <Folder size={14} className="text-amber-500" />
        <span className="text-xs text-gray-400 font-mono w-20">{item.code}</span>
        <StatusIcon status={item.status} />
        <span className={`font-medium flex-1 truncate ${item.status === 'COMPLETED' ? 'text-gray-500' : 'text-gray-800'}`}>
          {item.name}
        </span>

        {item.assigneeName && (
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <User size={10} />
            {item.assigneeName}
          </span>
        )}

        {item.plannedEndDate && overdue && (
          <span className="flex items-center gap-1 text-xs text-red-500">
            <AlertTriangle size={10} />
            지연
          </span>
        )}

        <span className="text-xs text-gray-500">
          {item.completedTasks}/{item.totalTasks}
        </span>

        <div className="w-20">
          <WbsProgressBar progress={item.calculatedProgress} size="sm" />
        </div>
      </div>

      {isExpanded && hasVisibleTasks && (
        <div className="border-l-2 border-gray-100 ml-2">
          {filteredTasks.map((task) => (
            <TaskRow key={task.id} task={task} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// Group row component
function GroupRow({
  group,
  phaseName,
  level,
  isExpanded,
  expandedItems,
  onToggle,
  onToggleItem,
  filters,
}: {
  group: WbsGroupWithItems;
  phaseName: string;
  level: number;
  isExpanded: boolean;
  expandedItems: Set<string>;
  onToggle: () => void;
  onToggleItem: (itemId: string) => void;
  filters: WbsFilters;
}) {
  const filteredItems = useMemo(() => {
    return group.items.filter(item => {
      // Status filter
      if (filters.status !== 'ALL' && item.status !== filters.status) return false;
      // Assignee filter
      if (filters.assignee && item.assigneeName !== filters.assignee) return false;
      // Date filter
      if (filters.dateRange === 'overdue' && !isOverdue(item.plannedEndDate)) return false;
      // Search filter - check item name or any task name
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const itemMatches = item.name.toLowerCase().includes(searchLower);
        const taskMatches = item.tasks.some(t => t.name.toLowerCase().includes(searchLower));
        if (!itemMatches && !taskMatches) return false;
      }
      return true;
    });
  }, [group.items, filters]);

  const hasVisibleItems = filteredItems.length > 0;
  const overdue = isOverdue(group.plannedEndDate) && group.status !== 'COMPLETED';

  return (
    <div className="mb-2" style={{ marginLeft: `${level * 16}px` }}>
      <div
        className="flex items-center gap-2 py-2 px-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
        onClick={onToggle}
      >
        <button type="button" className="w-5 h-5 flex items-center justify-center">
          {isExpanded ? (
            <ChevronDown size={16} className="text-gray-500" />
          ) : (
            <ChevronRight size={16} className="text-gray-500" />
          )}
        </button>
        <FolderTree size={16} className="text-blue-600" />
        <span className="text-sm text-gray-500 font-mono w-16">{group.code}</span>
        <StatusIcon status={group.status} />
        <span className="font-semibold text-gray-900 flex-1 truncate">{group.name}</span>

        {group.plannedEndDate && overdue && (
          <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
            <AlertTriangle size={12} />
            지연
          </span>
        )}

        <DependencyIndicator dependsOn={group.linkedFeatureIds} />

        <span className="text-xs text-gray-500">
          {group.completedItems}/{group.totalItems} 항목
        </span>

        <div className="w-24">
          <WbsProgressBar progress={group.calculatedProgress} size="md" />
        </div>
      </div>

      {isExpanded && hasVisibleItems && (
        <div className="mt-1 ml-3">
          {filteredItems.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              level={level + 1}
              isExpanded={expandedItems.has(item.id)}
              onToggle={() => onToggleItem(item.id)}
              filters={filters}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Phase row component
function PhaseRow({
  phase,
  isExpanded,
  expandedGroups,
  expandedItems,
  expandedChildPhases,
  onToggle,
  onToggleGroup,
  onToggleItem,
  onToggleChildPhase,
  filters,
  isChild = false,
}: {
  phase: PhaseWithWbs;
  isExpanded: boolean;
  expandedGroups: Set<string>;
  expandedItems: Set<string>;
  expandedChildPhases?: Set<string>;
  onToggle: () => void;
  onToggleGroup: (groupId: string) => void;
  onToggleItem: (itemId: string) => void;
  onToggleChildPhase?: (phaseId: string) => void;
  filters: WbsFilters;
  isChild?: boolean;
}) {
  const filteredGroups = useMemo(() => {
    return phase.groups.filter(group => {
      // Status filter at group level
      if (filters.status !== 'ALL' && group.status !== filters.status) return false;
      // Date filter
      if (filters.dateRange === 'overdue' && !isOverdue(group.plannedEndDate)) return false;
      // Search filter - check group name or any child
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const groupMatches = group.name.toLowerCase().includes(searchLower);
        const childMatches = group.items.some(item =>
          item.name.toLowerCase().includes(searchLower) ||
          item.tasks.some(task => task.name.toLowerCase().includes(searchLower))
        );
        if (!groupMatches && !childMatches) return false;
      }
      return true;
    });
  }, [phase.groups, filters]);

  const hasVisibleGroups = filteredGroups.length > 0;
  const hasChildPhases = phase.childPhases && phase.childPhases.length > 0;
  const phaseColor = phase.status === 'COMPLETED'
    ? 'from-green-500 to-green-600'
    : phase.status === 'IN_PROGRESS'
      ? 'from-blue-500 to-blue-600'
      : 'from-gray-400 to-gray-500';


  return (
    <div className={`bg-white rounded-xl border overflow-hidden mb-4 ${
      isChild ? 'border-gray-200 ml-6' : 'border-gray-200'
    }`}>
      {/* Phase Header */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <button type="button" className="w-6 h-6 flex items-center justify-center">
          {isExpanded ? (
            <ChevronDown size={20} className="text-gray-500" />
          ) : (
            <ChevronRight size={20} className="text-gray-500" />
          )}
        </button>

        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${phaseColor} flex items-center justify-center`}>
          <span className="text-white text-sm font-bold">P</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 truncate">
              {phase.name}
            </h3>
            <span className={`px-2 py-0.5 text-xs rounded-full ${
              phase.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
              phase.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {phase.status === 'COMPLETED' ? '완료' : phase.status === 'IN_PROGRESS' ? '진행중' : '대기'}
            </span>
          </div>
          {phase.description && (
            <p className="text-xs text-gray-500 truncate">{phase.description}</p>
          )}
        </div>

        {/* Phase dates */}
        {phase.startDate && phase.endDate && (
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <Calendar size={12} />
            {phase.startDate} ~ {phase.endDate}
          </div>
        )}

        {/* Phase stats */}
        <div className="text-sm text-right">
          <div className="text-gray-600">
            <span className="font-medium">{phase.completedGroups || 0}</span>
            <span className="text-gray-400">/{phase.totalGroups || 0} 그룹</span>
          </div>
        </div>

        {/* Phase progress */}
        <div className="w-32">
          <WbsProgressBar progress={phase.calculatedProgress || phase.progress} size="md" />
        </div>
      </div>

      {/* Phase Content - Child Phases or Groups */}
      {isExpanded && (
        <div className="border-t border-gray-100">
          {/* Render child phases if present */}
          {hasChildPhases && (
            <div className="p-4 space-y-2">
              {/* Tree connector for child phases */}
              <div className="ml-3">
                {phase.childPhases!.map((childPhase) => (
                  <div key={childPhase.id}>
                    <PhaseRow
                      phase={childPhase}
                      isExpanded={expandedChildPhases?.has(childPhase.id) || false}
                      expandedGroups={expandedGroups}
                      expandedItems={expandedItems}
                      expandedChildPhases={expandedChildPhases}
                      onToggle={() => onToggleChildPhase?.(childPhase.id)}
                      onToggleGroup={onToggleGroup}
                      onToggleItem={onToggleItem}
                      onToggleChildPhase={onToggleChildPhase}
                      filters={filters}
                      isChild={true}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Render groups if no child phases or this is a child phase */}
          {(!hasChildPhases || isChild) && hasVisibleGroups && (
            <div className="p-4 pt-2">
              {filteredGroups.map((group) => (
                <GroupRow
                  key={group.id}
                  group={group}
                  phaseName={phase.name}
                  level={0}
                  isExpanded={expandedGroups.has(group.id)}
                  expandedItems={expandedItems}
                  onToggle={() => onToggleGroup(group.id)}
                  onToggleItem={onToggleItem}
                  filters={filters}
                />
              ))}
            </div>
          )}

          {(!hasChildPhases || isChild) && !hasVisibleGroups && (
            <div className="p-8 text-center text-gray-400">
              {filters.searchTerm || filters.status !== 'ALL' || filters.dateRange !== 'all'
                ? '필터 조건에 맞는 항목이 없습니다'
                : 'WBS 항목이 없습니다'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Main component
export default function WbsOverviewTree({
  phases,
  isLoading = false,
  onRefresh,
  canEdit = false,
}: WbsOverviewTreeProps) {
  // Expansion states
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set(phases.map(p => p.id)));
  const [expandedChildPhases, setExpandedChildPhases] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Filter state
  const [filters, setFilters] = useState<WbsFilters>({
    status: 'ALL',
    assignee: '',
    dateRange: 'all',
    searchTerm: '',
  });

  // Get unique assignees from all tasks
  const allAssignees = useMemo(() => {
    const assignees = new Set<string>();
    phases.forEach(phase => {
      phase.groups.forEach(group => {
        group.items.forEach(item => {
          if (item.assigneeName) assignees.add(item.assigneeName);
          item.tasks.forEach(task => {
            if (task.assigneeName) assignees.add(task.assigneeName);
          });
        });
      });
    });
    return Array.from(assignees).sort();
  }, [phases]);

  // Calculate overall stats
  const overallStats = useMemo(() => {
    let totalGroups = 0;
    let completedGroups = 0;
    let totalItems = 0;
    let completedItems = 0;
    let totalTasks = 0;
    let completedTasks = 0;
    let overdueTasks = 0;

    phases.forEach(phase => {
      phase.groups.forEach(group => {
        totalGroups++;
        if (group.status === 'COMPLETED') completedGroups++;

        group.items.forEach(item => {
          totalItems++;
          if (item.status === 'COMPLETED') completedItems++;

          item.tasks.forEach(task => {
            totalTasks++;
            if (task.status === 'COMPLETED') completedTasks++;
            if (isOverdue(task.plannedEndDate) && task.status !== 'COMPLETED') overdueTasks++;
          });
        });
      });
    });

    const overallProgress = totalTasks > 0
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0;

    return { totalGroups, completedGroups, totalItems, completedItems, totalTasks, completedTasks, overdueTasks, overallProgress };
  }, [phases]);

  // Toggle functions
  const togglePhase = (phaseId: string) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      if (next.has(phaseId)) next.delete(phaseId);
      else next.add(phaseId);
      return next;
    });
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const toggleItem = (itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const toggleChildPhase = (phaseId: string) => {
    setExpandedChildPhases(prev => {
      const next = new Set(prev);
      if (next.has(phaseId)) next.delete(phaseId);
      else next.add(phaseId);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedPhases(new Set(phases.map(p => p.id)));
    const allChildPhases = new Set<string>();
    const allGroups = new Set<string>();
    const allItems = new Set<string>();
    phases.forEach(phase => {
      // Handle child phases
      if (phase.childPhases) {
        phase.childPhases.forEach(child => {
          allChildPhases.add(child.id);
          child.groups.forEach(group => {
            allGroups.add(group.id);
            group.items.forEach(item => allItems.add(item.id));
          });
        });
      }
      // Handle direct groups
      phase.groups.forEach(group => {
        allGroups.add(group.id);
        group.items.forEach(item => allItems.add(item.id));
      });
    });
    setExpandedChildPhases(allChildPhases);
    setExpandedGroups(allGroups);
    setExpandedItems(allItems);
  };

  const collapseAll = () => {
    setExpandedPhases(new Set());
    setExpandedChildPhases(new Set());
    setExpandedGroups(new Set());
    setExpandedItems(new Set());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header & Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FolderTree className="text-blue-600" size={22} />
            전체 WBS 구조
          </h3>
          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
            <span>Phase: {phases.length}</span>
            <span>그룹: {overallStats.completedGroups}/{overallStats.totalGroups}</span>
            <span>항목: {overallStats.completedItems}/{overallStats.totalItems}</span>
            <span>작업: {overallStats.completedTasks}/{overallStats.totalTasks}</span>
            {overallStats.overdueTasks > 0 && (
              <span className="text-red-500 flex items-center gap-1">
                <AlertTriangle size={12} />
                지연: {overallStats.overdueTasks}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-40">
            <WbsProgressBar progress={overallStats.overallProgress} size="lg" />
          </div>
          <span className="text-lg font-bold text-gray-900">{overallStats.overallProgress}%</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="WBS 검색..."
              value={filters.searchTerm}
              onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as WbsStatus | 'ALL' })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">모든 상태</option>
              <option value="NOT_STARTED">시작 전</option>
              <option value="IN_PROGRESS">진행 중</option>
              <option value="COMPLETED">완료</option>
              <option value="ON_HOLD">보류</option>
              <option value="CANCELLED">취소</option>
            </select>
          </div>

          {/* Date filter */}
          <select
            value={filters.dateRange}
            onChange={(e) => setFilters({ ...filters, dateRange: e.target.value as WbsFilters['dateRange'] })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">모든 기간</option>
            <option value="overdue">지연 항목</option>
            <option value="thisWeek">이번 주</option>
            <option value="thisMonth">이번 달</option>
          </select>

          {/* Assignee filter */}
          <select
            value={filters.assignee}
            onChange={(e) => setFilters({ ...filters, assignee: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">모든 담당자</option>
            {allAssignees.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          {/* Expand/Collapse buttons */}
          <div className="flex items-center gap-1 border-l border-gray-300 pl-4">
            <button
              type="button"
              onClick={expandAll}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              title="모두 펼치기"
            >
              <Expand size={16} />
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              title="모두 접기"
            >
              <Shrink size={16} />
            </button>
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                title="새로고침"
              >
                <RefreshCw size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tree View */}
      {phases.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <FolderTree className="mx-auto text-gray-300 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">WBS 데이터가 없습니다</h3>
          <p className="text-gray-500">프로젝트에 Phase를 추가하고 WBS를 구성해 주세요.</p>
        </div>
      ) : (
        <div>
          {phases.map((phase) => (
            <PhaseRow
              key={phase.id}
              phase={phase}
              isExpanded={expandedPhases.has(phase.id)}
              expandedGroups={expandedGroups}
              expandedItems={expandedItems}
              expandedChildPhases={expandedChildPhases}
              onToggle={() => togglePhase(phase.id)}
              onToggleGroup={toggleGroup}
              onToggleItem={toggleItem}
              onToggleChildPhase={toggleChildPhase}
              filters={filters}
            />
          ))}
        </div>
      )}
    </div>
  );
}
