import { useState, useMemo, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Calendar,
  Filter,
  Download,
  ArrowRight,
  AlertTriangle,
  User,
} from 'lucide-react';
import {
  WbsStatus,
  PhaseWithWbs,
  WbsGroupWithItems,
  WbsItemWithTasks,
  WbsTask,
  getWbsStatusColor,
  isOverdue,
} from '../../../types/wbs';

interface WbsGanttChartProps {
  phases: PhaseWithWbs[];
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

// Dependency line component
function DependencyLine({
  fromItem,
  toItem,
  items,
  startDate,
  cellWidth,
  rowHeight,
}: {
  fromItem: GanttItem;
  toItem: GanttItem;
  items: GanttItem[];
  startDate: Date;
  cellWidth: number;
  rowHeight: number;
}) {
  const fromIndex = items.findIndex(i => i.id === fromItem.id);
  const toIndex = items.findIndex(i => i.id === toItem.id);

  if (fromIndex === -1 || toIndex === -1) return null;

  const fromBar = calculateBarStyle(fromItem, startDate, 0, cellWidth);
  const toBar = calculateBarStyle(toItem, startDate, 0, cellWidth);

  if (!fromBar || !toBar) return null;

  const fromX = fromBar.left + fromBar.width;
  const fromY = fromIndex * rowHeight + rowHeight / 2;
  const toX = toBar.left;
  const toY = toIndex * rowHeight + rowHeight / 2;

  // Create path with curved corners
  const midX = (fromX + toX) / 2;
  const path = `M ${fromX} ${fromY}
                C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;

  return (
    <svg
      className="absolute top-0 left-0 pointer-events-none"
      style={{ overflow: 'visible' }}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 6 3, 0 6" fill="#9CA3AF" />
        </marker>
      </defs>
      <path
        d={path}
        fill="none"
        stroke="#9CA3AF"
        strokeWidth="1.5"
        strokeDasharray="4 2"
        markerEnd="url(#arrowhead)"
      />
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
export default function WbsGanttChart({ phases, isLoading = false }: WbsGanttChartProps) {
  const [zoom, setZoom] = useState<ZoomLevel>('day');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(phases.map(p => p.id)));
  const [showDependencies, setShowDependencies] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Cell widths based on zoom level
  const cellWidth = zoom === 'day' ? 30 : zoom === 'week' ? 60 : 100;
  const rowHeight = 36;

  // Convert phases to flat gantt items
  const ganttItems = useMemo(() => {
    const items: GanttItem[] = [];

    phases.forEach((phase) => {
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
      });

      if (expandedIds.has(phase.id)) {
        phase.groups.forEach((group) => {
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
            dependencies: group.linkedFeatureIds,
            isExpanded: expandedIds.has(group.id),
          });

          if (expandedIds.has(group.id)) {
            group.items.forEach((item) => {
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
                isExpanded: expandedIds.has(item.id),
              });

              if (expandedIds.has(item.id)) {
                item.tasks.forEach((task) => {
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
                  });
                });
              }
            });
          }
        });
      }
    });

    return items;
  }, [phases, expandedIds]);

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
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
            {ganttItems.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-2 px-4 border-b border-gray-100 hover:bg-gray-100 cursor-pointer transition-colors ${
                  item.type === 'phase' ? 'bg-blue-50' : ''
                }`}
                style={{
                  height: rowHeight,
                  paddingLeft: `${16 + item.level * 16}px`,
                }}
                onClick={() => item.type !== 'task' && toggleExpand(item.id)}
              >
                {/* Expand icon */}
                {item.type !== 'task' && (
                  <span className="w-4 h-4 flex items-center justify-center text-gray-400">
                    {item.isExpanded ? '▼' : '▶'}
                  </span>
                )}

                {/* Type indicator */}
                <span
                  className={`w-2 h-2 rounded-full ${
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
            ))}
          </div>
        </div>

        {/* Right Panel - Timeline */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-x-auto overflow-y-auto"
          style={{ maxHeight: 'calc(100vh - 300px)' }}
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
            {showDependencies && ganttItems.map((item) =>
              item.dependencies?.map((depId) => {
                const depItem = ganttItems.find(i => i.id === depId);
                if (!depItem) return null;
                return (
                  <DependencyLine
                    key={`${item.id}-${depId}`}
                    fromItem={depItem}
                    toItem={item}
                    items={ganttItems}
                    startDate={startDate}
                    cellWidth={cellWidth}
                    rowHeight={rowHeight}
                  />
                );
              })
            )}

            {/* Task bars */}
            {ganttItems.map((item, index) => {
              const barStyle = calculateBarStyle(item, startDate, totalDays, cellWidth);
              if (!barStyle) return null;

              return (
                <div
                  key={item.id}
                  className="absolute flex items-center"
                  style={{
                    top: index * rowHeight + 4,
                    left: barStyle.left,
                    width: barStyle.width,
                    height: rowHeight - 8,
                  }}
                >
                  {/* Background bar */}
                  <div
                    className={`absolute inset-0 rounded-md ${getBarColor(item)} opacity-90`}
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
      </div>
    </div>
  );
}
