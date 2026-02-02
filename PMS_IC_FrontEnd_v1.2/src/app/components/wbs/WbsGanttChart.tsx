import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ZoomIn,
  ZoomOut,
  Calendar,
  Filter,
  Download,
  ArrowRight,
  AlertTriangle,
  User,
  ChevronsDownUp,
  ChevronsUpDown,
} from 'lucide-react';
import {
  WbsStatus,
  PhaseWithWbs,
  WbsGroupWithItems,
  WbsItemWithTasks,
  WbsTask,
  WbsDependency,
  CriticalPathResponse,
  ItemFloatData,
  getWbsStatusColor,
  isOverdue,
} from '../../../types/wbs';
import { apiService } from '../../../services/api';

interface WbsGanttChartProps {
  phases: PhaseWithWbs[];
  projectId: string;
  isLoading?: boolean;
}

type ZoomLevel = 'day' | 'week' | 'month';

interface GanttItem {
  id: string;
  name: string;
  type: 'phase' | 'group' | 'item' | 'task';
  level: number;
  parentId?: string;
  startDate?: string;
  endDate?: string;
  progress: number;
  status: WbsStatus | string;
  assignee?: string;
  color?: string;
  dependencies?: string[];
  isExpanded?: boolean;
  isLastChild?: boolean;
  hasChildren?: boolean;
}

// Generate date range
function generateDateRange(startDate: Date, endDate: Date, zoom: ZoomLevel): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    dates.push(new Date(current));
    if (zoom === 'day') {
      current.setDate(current.getDate() + 1);
    } else if (zoom === 'week') {
      current.setDate(current.getDate() + 7);
    } else {
      current.setMonth(current.getMonth() + 1);
    }
  }
  return dates;
}

// Format date header
function formatDateHeader(date: Date, zoom: ZoomLevel): string {
  if (zoom === 'day') {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  } else if (zoom === 'week') {
    return `${date.getMonth() + 1}/${date.getDate()}주`;
  } else {
    return `${date.getFullYear()}.${date.getMonth() + 1}`;
  }
}

// Calculate bar position and width
function calculateBarStyle(
  item: GanttItem,
  startDate: Date,
  totalDays: number,
  cellWidth: number
): { left: number; width: number } | null {
  if (!item.startDate || !item.endDate) return null;

  const itemStart = new Date(item.startDate);
  const itemEnd = new Date(item.endDate);

  const startOffset = Math.max(0, (itemStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const duration = Math.max(1, (itemEnd.getTime() - itemStart.getTime()) / (1000 * 60 * 60 * 24) + 1);

  return {
    left: startOffset * cellWidth,
    width: Math.max(duration * cellWidth, 20),
  };
}

// Get bar color based on type and status
function getBarColor(item: GanttItem): string {
  if (item.status === 'COMPLETED') {
    return 'bg-green-500';
  }
  if (item.status === 'ON_HOLD') {
    return 'bg-amber-500';
  }
  if (item.status === 'CANCELLED') {
    return 'bg-gray-400';
  }

  switch (item.type) {
    case 'phase':
      return 'bg-gradient-to-r from-blue-600 to-blue-400';
    case 'group':
      return 'bg-gradient-to-r from-indigo-500 to-indigo-400';
    case 'item':
      return 'bg-gradient-to-r from-purple-500 to-purple-400';
    case 'task':
      return 'bg-gradient-to-r from-cyan-500 to-cyan-400';
    default:
      return 'bg-gray-500';
  }
}

// Dependency lines container component
function DependencyLines({
  items,
  startDate,
  cellWidth,
  rowHeight,
  criticalPath = [],
}: {
  items: GanttItem[];
  startDate: Date;
  cellWidth: number;
  rowHeight: number;
  criticalPath?: string[];
}) {
  // Collect all dependency paths
  const paths: { fromId: string; toId: string; path: string; isCritical: boolean }[] = [];

  items.forEach((toItem) => {
    if (!toItem.dependencies || toItem.dependencies.length === 0) return;

    const toIndex = items.findIndex(i => i.id === toItem.id);
    if (toIndex === -1) return;

    const toBar = calculateBarStyle(toItem, startDate, 0, cellWidth);
    if (!toBar) return;

    toItem.dependencies.forEach((depId) => {
      const fromItem = items.find(i => i.id === depId);
      if (!fromItem) return;

      const fromIndex = items.findIndex(i => i.id === fromItem.id);
      if (fromIndex === -1) return;

      const fromBar = calculateBarStyle(fromItem, startDate, 0, cellWidth);
      if (!fromBar) return;

      // Check if both items are on critical path
      const isCritical = criticalPath.includes(fromItem.id) && criticalPath.includes(toItem.id);

      // Calculate connection points (FS: Finish-to-Start)
      const fromX = fromBar.left + fromBar.width + 2; // End of predecessor + small gap
      const fromY = fromIndex * rowHeight + rowHeight / 2;
      const toX = toBar.left - 2; // Start of successor - small gap
      const toY = toIndex * rowHeight + rowHeight / 2;

      // Calculate control points for smooth curve
      const horizontalGap = Math.abs(toX - fromX);
      const verticalGap = Math.abs(toY - fromY);

      let path: string;

      if (toX > fromX + 20) {
        // Normal case: successor starts after predecessor ends
        const controlOffset = Math.min(horizontalGap / 2, 50);
        path = `M ${fromX} ${fromY} C ${fromX + controlOffset} ${fromY}, ${toX - controlOffset} ${toY}, ${toX} ${toY}`;
      } else {
        // Overlap case: need to route around
        const bendOffset = 15;
        const controlY = fromY < toY
          ? Math.max(fromY, toY) + bendOffset
          : Math.min(fromY, toY) - bendOffset;

        path = `M ${fromX} ${fromY} ` +
               `L ${fromX + bendOffset} ${fromY} ` +
               `Q ${fromX + bendOffset} ${controlY}, ${(fromX + toX) / 2} ${controlY} ` +
               `Q ${toX - bendOffset} ${controlY}, ${toX - bendOffset} ${toY} ` +
               `L ${toX} ${toY}`;
      }

      paths.push({ fromId: fromItem.id, toId: toItem.id, path, isCritical });
    });
  });

  if (paths.length === 0) return null;

  return (
    <svg
      className="absolute top-0 left-0 pointer-events-none z-10"
      style={{
        overflow: 'visible',
        width: '100%',
        height: items.length * rowHeight,
      }}
    >
      <defs>
        <marker
          id="dependency-arrowhead"
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="4"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon points="0 0, 8 4, 0 8" fill="#6B7280" />
        </marker>
        <marker
          id="critical-arrowhead"
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="4"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon points="0 0, 8 4, 0 8" fill="#DC2626" />
        </marker>
      </defs>
      {paths.map(({ fromId, toId, path, isCritical }) => (
        <path
          key={`dep-${fromId}-${toId}`}
          d={path}
          fill="none"
          stroke={isCritical ? "#DC2626" : "#6B7280"}
          strokeWidth={isCritical ? "2.5" : "1.5"}
          strokeDasharray={isCritical ? "0" : "5 3"}
          markerEnd={isCritical ? "url(#critical-arrowhead)" : "url(#dependency-arrowhead)"}
          opacity={isCritical ? "1" : "0.7"}
        />
      ))}
    </svg>
  );
}

// Today line component
function TodayLine({ startDate, cellWidth, height }: { startDate: Date; cellWidth: number; height: number }) {
  const today = new Date();
  const daysDiff = (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);

  if (daysDiff < 0) return null;

  return (
    <div
      className="absolute top-0 w-0.5 bg-red-500 z-20"
      style={{
        left: daysDiff * cellWidth,
        height: height,
      }}
    >
      <div className="absolute -top-1 -left-2 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
        <span className="text-white text-[8px] font-bold">T</span>
      </div>
    </div>
  );
}

// Main component
export default function WbsGanttChart({ phases, projectId, isLoading = false }: WbsGanttChartProps) {
  const [zoom, setZoom] = useState<ZoomLevel>('day');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(phases.map(p => p.id)));
  const [showDependencies, setShowDependencies] = useState(true);
  const [showCriticalPath, setShowCriticalPath] = useState(false);
  const [dependencies, setDependencies] = useState<WbsDependency[]>([]);
  const [criticalPathData, setCriticalPathData] = useState<CriticalPathResponse | null>(null);
  const [isLoadingCriticalPath, setIsLoadingCriticalPath] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const taskListRef = useRef<HTMLDivElement>(null);
  const isScrollSyncing = useRef(false);

  // Sync vertical scroll between left panel and right panel
  const handleTaskListScroll = useCallback(() => {
    if (isScrollSyncing.current) return;
    if (!taskListRef.current || !scrollContainerRef.current) return;

    isScrollSyncing.current = true;
    scrollContainerRef.current.scrollTop = taskListRef.current.scrollTop;
    requestAnimationFrame(() => {
      isScrollSyncing.current = false;
    });
  }, []);

  const handleTimelineScroll = useCallback(() => {
    if (isScrollSyncing.current) return;
    if (!taskListRef.current || !scrollContainerRef.current) return;

    isScrollSyncing.current = true;
    taskListRef.current.scrollTop = scrollContainerRef.current.scrollTop;
    requestAnimationFrame(() => {
      isScrollSyncing.current = false;
    });
  }, []);

  // Load dependencies from API
  useEffect(() => {
    if (!projectId) return;

    apiService.getWbsDependencies(projectId)
      .then((data: WbsDependency[]) => {
        setDependencies(data || []);
      })
      .catch((error: Error) => {
        console.error('Failed to load dependencies:', error);
        setDependencies([]);
      });
  }, [projectId]);

  // Load critical path data when toggle is enabled
  useEffect(() => {
    if (!projectId || !showCriticalPath || criticalPathData) return;

    setIsLoadingCriticalPath(true);
    apiService.getCriticalPath(projectId)
      .then((data: CriticalPathResponse) => {
        setCriticalPathData(data);
      })
      .catch((error: Error) => {
        console.error('Failed to load critical path:', error);
        setCriticalPathData(null);
      })
      .finally(() => {
        setIsLoadingCriticalPath(false);
      });
  }, [projectId, showCriticalPath, criticalPathData]);

  // Helper to check if item is on critical path
  const isOnCriticalPath = (itemId: string): boolean => {
    return showCriticalPath && criticalPathData?.criticalPath?.includes(itemId) || false;
  };

  // Helper to get float data for an item
  const getFloatData = (itemId: string): ItemFloatData | undefined => {
    return showCriticalPath ? criticalPathData?.itemsWithFloat?.[itemId] : undefined;
  };

  // Cell widths based on zoom level
  const cellWidth = zoom === 'day' ? 30 : zoom === 'week' ? 60 : 100;
  const rowHeight = 36;

  // Convert phases to flat gantt items
  const ganttItems = useMemo(() => {
    // Helper function to get predecessors for a given item
    const getPredecessorIds = (itemId: string): string[] => {
      return dependencies
        .filter(dep => dep.successorId === itemId)
        .map(dep => dep.predecessorId);
    };

    const items: GanttItem[] = [];

    phases.forEach((phase, phaseIdx) => {
      const isLastPhase = phaseIdx === phases.length - 1;
      const hasGroups = phase.groups.length > 0;

      // Add phase
      items.push({
        id: phase.id,
        name: phase.name,
        type: 'phase',
        level: 0,
        startDate: phase.startDate,
        endDate: phase.endDate,
        progress: phase.calculatedProgress || phase.progress,
        status: phase.status,
        color: 'blue',
        isExpanded: expandedIds.has(phase.id),
        isLastChild: isLastPhase,
        hasChildren: hasGroups,
      });

      if (expandedIds.has(phase.id)) {
        phase.groups.forEach((group, groupIdx) => {
          const isLastGroup = groupIdx === phase.groups.length - 1;
          const hasItems = group.items.length > 0;

          // Add group
          items.push({
            id: group.id,
            name: group.name,
            type: 'group',
            level: 1,
            parentId: phase.id,
            startDate: group.plannedStartDate,
            endDate: group.plannedEndDate,
            progress: group.calculatedProgress,
            status: group.status,
            dependencies: getPredecessorIds(group.id),
            isExpanded: expandedIds.has(group.id),
            isLastChild: isLastGroup,
            hasChildren: hasItems,
          });

          if (expandedIds.has(group.id)) {
            group.items.forEach((item, itemIdx) => {
              const isLastItem = itemIdx === group.items.length - 1;
              const hasTasks = item.tasks.length > 0;

              // Add item
              items.push({
                id: item.id,
                name: item.name,
                type: 'item',
                level: 2,
                parentId: group.id,
                startDate: item.plannedStartDate,
                endDate: item.plannedEndDate,
                progress: item.calculatedProgress,
                status: item.status,
                assignee: item.assigneeName,
                dependencies: getPredecessorIds(item.id),
                isExpanded: expandedIds.has(item.id),
                isLastChild: isLastItem,
                hasChildren: hasTasks,
              });

              if (expandedIds.has(item.id)) {
                item.tasks.forEach((task, taskIdx) => {
                  const isLastTask = taskIdx === item.tasks.length - 1;

                  // Add task
                  items.push({
                    id: task.id,
                    name: task.name,
                    type: 'task',
                    level: 3,
                    parentId: item.id,
                    startDate: task.plannedStartDate,
                    endDate: task.plannedEndDate,
                    progress: task.progress,
                    status: task.status,
                    assignee: task.assigneeName,
                    dependencies: getPredecessorIds(task.id),
                    isLastChild: isLastTask,
                    hasChildren: false,
                  });
                });
              }
            });
          }
        });
      }
    });

    return items;
  }, [phases, expandedIds, dependencies]);

  // Calculate date range
  const { dateRange, startDate, endDate, totalDays } = useMemo(() => {
    let minDate = new Date();
    let maxDate = new Date();
    let hasValidDates = false;

    ganttItems.forEach(item => {
      if (item.startDate) {
        const start = new Date(item.startDate);
        if (!hasValidDates || start < minDate) minDate = start;
        hasValidDates = true;
      }
      if (item.endDate) {
        const end = new Date(item.endDate);
        if (!hasValidDates || end > maxDate) maxDate = end;
        hasValidDates = true;
      }
    });

    // Add padding
    minDate.setDate(minDate.getDate() - 7);
    maxDate.setDate(maxDate.getDate() + 14);

    const days = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    const range = generateDateRange(minDate, maxDate, zoom);

    return { dateRange: range, startDate: minDate, endDate: maxDate, totalDays: days };
  }, [ganttItems, zoom]);

  // Toggle expansion
  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Expand all items
  const expandAll = () => {
    const allIds = new Set<string>();
    phases.forEach(phase => {
      allIds.add(phase.id);
      phase.groups.forEach(group => {
        allIds.add(group.id);
        group.items.forEach(item => {
          allIds.add(item.id);
        });
      });
    });
    setExpandedIds(allIds);
  };

  // Collapse all items (only keep phases expanded)
  const collapseAll = () => {
    setExpandedIds(new Set(phases.map(p => p.id)));
  };

  // Scroll to today
  const scrollToToday = () => {
    if (!scrollContainerRef.current) return;
    const today = new Date();
    const daysDiff = (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    scrollContainerRef.current.scrollLeft = Math.max(0, daysDiff * cellWidth - 200);
  };

  useEffect(() => {
    scrollToToday();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Calendar size={18} className="text-blue-600" />
            간트 차트
          </h3>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-1">
            <button
              type="button"
              onClick={() => setZoom('day')}
              className={`px-3 py-1 text-sm rounded ${zoom === 'day' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              일
            </button>
            <button
              type="button"
              onClick={() => setZoom('week')}
              className={`px-3 py-1 text-sm rounded ${zoom === 'week' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              주
            </button>
            <button
              type="button"
              onClick={() => setZoom('month')}
              className={`px-3 py-1 text-sm rounded ${zoom === 'month' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              월
            </button>
          </div>

          {/* Expand/Collapse controls */}
          <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-1">
            <button
              type="button"
              onClick={expandAll}
              className="px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded flex items-center gap-1"
              title="모두 펼치기"
            >
              <ChevronsUpDown size={14} />
              펼치기
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded flex items-center gap-1"
              title="모두 접기"
            >
              <ChevronsDownUp size={14} />
              접기
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showDependencies}
              onChange={(e) => setShowDependencies(e.target.checked)}
              className="rounded border-gray-300"
            />
            의존성 표시
          </label>

          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showCriticalPath}
              onChange={(e) => setShowCriticalPath(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className={showCriticalPath ? 'text-red-600 font-medium' : ''}>
              크리티컬 패스
            </span>
            {isLoadingCriticalPath && (
              <div className="animate-spin w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full" />
            )}
          </label>

          {showCriticalPath && criticalPathData && criticalPathData.projectDuration > 0 && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              총 기간: {criticalPathData.projectDuration}일
            </span>
          )}

          <button
            type="button"
            onClick={scrollToToday}
            className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1"
          >
            오늘
          </button>
        </div>
      </div>

      {/* Gantt Content */}
      <div className="flex">
        {/* Left Panel - Task Names */}
        <div className="w-72 flex-shrink-0 border-r border-gray-200 bg-gray-50">
          {/* Header */}
          <div className="h-12 border-b border-gray-200 flex items-center px-4">
            <span className="text-sm font-medium text-gray-700">작업명</span>
          </div>

          {/* Task rows */}
          <div
            ref={taskListRef}
            className="overflow-y-auto"
            style={{ maxHeight: 'calc(100vh - 300px)' }}
            onScroll={handleTaskListScroll}
          >
            {ganttItems.map((item, index) => {
              // Calculate tree line visibility for each level
              const showTreeLines: boolean[] = [];
              for (let lvl = 1; lvl <= item.level; lvl++) {
                // Find if parent at this level has more siblings below
                let hasMoreSiblings = false;
                for (let i = index + 1; i < ganttItems.length; i++) {
                  const nextItem = ganttItems[i];
                  if (nextItem.level < lvl) break;
                  if (nextItem.level === lvl) {
                    hasMoreSiblings = true;
                    break;
                  }
                }
                showTreeLines[lvl] = hasMoreSiblings;
              }

              return (
                <div
                  key={item.id}
                  className={`relative flex items-center border-b border-gray-100 hover:bg-gray-100 cursor-pointer transition-colors ${
                    item.type === 'phase' ? 'bg-blue-50' : ''
                  }`}
                  style={{ height: rowHeight }}
                  onClick={() => item.type !== 'task' && toggleExpand(item.id)}
                >
                  {/* Tree lines */}
                  {item.level > 0 && (
                    <>
                      {/* Vertical lines for each level */}
                      {Array.from({ length: item.level }).map((_, lvl) => (
                        showTreeLines[lvl + 1] && (
                          <div
                            key={`vline-${lvl}`}
                            className="absolute top-0 bottom-0 w-px bg-gray-200"
                            style={{ left: 16 + lvl * 16 + 7 }}
                          />
                        )
                      ))}
                      {/* Horizontal connector line */}
                      <div
                        className="absolute w-2 h-px bg-gray-200"
                        style={{
                          left: 16 + (item.level - 1) * 16 + 7,
                          top: rowHeight / 2,
                        }}
                      />
                      {/* Vertical line to this item */}
                      <div
                        className="absolute w-px bg-gray-200"
                        style={{
                          left: 16 + (item.level - 1) * 16 + 7,
                          top: 0,
                          height: item.isLastChild ? rowHeight / 2 : rowHeight,
                        }}
                      />
                    </>
                  )}

                  {/* Content with padding */}
                  <div
                    className="flex items-center gap-2 flex-1"
                    style={{ paddingLeft: `${16 + item.level * 16}px`, paddingRight: 16 }}
                  >
                    {/* Expand icon */}
                    {item.type !== 'task' ? (
                      <button type="button" className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600">
                        {item.isExpanded ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronRight size={14} />
                        )}
                      </button>
                    ) : (
                      <span className="w-4" />
                    )}

                    {/* Type indicator */}
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        item.type === 'phase' ? 'bg-blue-500' :
                        item.type === 'group' ? 'bg-indigo-500' :
                        item.type === 'item' ? 'bg-purple-500' :
                        'bg-cyan-500'
                      }`}
                    />

                    {/* Name */}
                    <span
                      className={`flex-1 truncate text-sm ${
                        item.type === 'phase' ? 'font-semibold text-gray-900' :
                        item.type === 'group' ? 'font-medium text-gray-800' :
                        'text-gray-700'
                      }`}
                    >
                      {item.name}
                    </span>

                    {/* Assignee */}
                    {item.assignee && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <User size={10} />
                        {item.assignee.slice(0, 3)}
                      </span>
                    )}

                    {/* Overdue indicator */}
                    {item.endDate && isOverdue(item.endDate) && item.status !== 'COMPLETED' && (
                      <AlertTriangle size={12} className="text-red-500" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Panel - Timeline */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto overflow-y-auto"
          style={{ maxHeight: 'calc(100vh - 300px)' }}
          onScroll={handleTimelineScroll}
        >
          {/* Date headers */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200" style={{ height: 48 }}>
            <div className="flex" style={{ width: totalDays * cellWidth }}>
              {dateRange.map((date, idx) => (
                <div
                  key={idx}
                  className="flex-shrink-0 border-r border-gray-100 flex items-center justify-center text-xs text-gray-500"
                  style={{ width: cellWidth }}
                >
                  {formatDateHeader(date, zoom)}
                </div>
              ))}
            </div>
          </div>

          {/* Gantt bars */}
          <div className="relative" style={{ width: totalDays * cellWidth, minHeight: ganttItems.length * rowHeight }}>
            {/* Grid lines */}
            <div className="absolute inset-0">
              {dateRange.map((_, idx) => (
                <div
                  key={idx}
                  className="absolute top-0 bottom-0 border-r border-gray-50"
                  style={{ left: idx * cellWidth }}
                />
              ))}
            </div>

            {/* Today line */}
            <TodayLine
              startDate={startDate}
              cellWidth={cellWidth}
              height={ganttItems.length * rowHeight}
            />

            {/* Dependency lines */}
            {showDependencies && (
              <DependencyLines
                items={ganttItems}
                startDate={startDate}
                cellWidth={cellWidth}
                rowHeight={rowHeight}
                criticalPath={showCriticalPath ? criticalPathData?.criticalPath : []}
              />
            )}

            {/* Task bars */}
            {ganttItems.map((item, index) => {
              const barStyle = calculateBarStyle(item, startDate, totalDays, cellWidth);
              if (!barStyle) return null;

              const isCritical = isOnCriticalPath(item.id);
              const floatData = getFloatData(item.id);

              return (
                <div
                  key={item.id}
                  className="absolute flex items-center group"
                  style={{
                    top: index * rowHeight + 4,
                    left: barStyle.left,
                    width: barStyle.width,
                    height: rowHeight - 8,
                  }}
                >
                  {/* Background bar */}
                  <div
                    className={`absolute inset-0 rounded-md ${
                      isCritical
                        ? 'bg-gradient-to-r from-red-600 to-red-400 ring-2 ring-red-500 ring-offset-1'
                        : getBarColor(item)
                    } opacity-90`}
                  />

                  {/* Progress fill */}
                  {item.progress > 0 && item.progress < 100 && (
                    <div
                      className="absolute inset-y-0 left-0 bg-white/30 rounded-l-md"
                      style={{ width: `${item.progress}%` }}
                    />
                  )}

                  {/* Progress text */}
                  <span className="relative z-10 px-2 text-xs font-medium text-white truncate">
                    {item.progress}%
                  </span>

                  {/* Milestone marker for completed items */}
                  {item.status === 'COMPLETED' && (
                    <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-green-500 rounded-full border-2 border-white" />
                  )}

                  {/* Float indicator (slack time) */}
                  {showCriticalPath && floatData && floatData.totalFloat > 0 && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 h-2 bg-gray-300 opacity-50 rounded"
                      style={{
                        left: barStyle.width + 2,
                        width: Math.min(floatData.totalFloat * cellWidth, 100),
                      }}
                      title={`여유 시간: ${floatData.totalFloat}일`}
                    />
                  )}

                  {/* Tooltip on hover */}
                  {showCriticalPath && floatData && (
                    <div className="absolute left-0 -top-16 bg-gray-900 text-white text-xs p-2 rounded shadow-lg z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                      <div className="font-medium">{item.name}</div>
                      <div>ES: {floatData.earlyStart}일 | EF: {floatData.earlyFinish}일</div>
                      <div>LS: {floatData.lateStart}일 | LF: {floatData.lateFinish}일</div>
                      <div className={floatData.totalFloat === 0 ? 'text-red-400' : ''}>
                        여유: {floatData.totalFloat}일 {floatData.isCritical && '(크리티컬)'}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 p-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span className="text-xs text-gray-600">Phase</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-indigo-500" />
          <span className="text-xs text-gray-600">그룹</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-purple-500" />
          <span className="text-xs text-gray-600">항목</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-cyan-500" />
          <span className="text-xs text-gray-600">작업</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span className="text-xs text-gray-600">완료</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-3 bg-red-500" />
          <span className="text-xs text-gray-600">오늘</span>
        </div>
        {showCriticalPath && (
          <>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500 ring-2 ring-red-300" />
              <span className="text-xs text-red-600 font-medium">크리티컬 패스</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-2 bg-gray-300 rounded opacity-50" />
              <span className="text-xs text-gray-600">여유 시간</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
