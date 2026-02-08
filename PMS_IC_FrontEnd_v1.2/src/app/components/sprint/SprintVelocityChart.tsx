import { useMemo } from 'react';
import type { Sprint } from '../../../types/backlog';

// ── Types ──────────────────────────────────────────────────

export interface SprintVelocityChartProps {
  sprints: Sprint[]; // Completed sprints for velocity
  compact?: boolean;
}

// ── Component ──────────────────────────────────────────────

export function SprintVelocityChart({
  sprints,
  compact = false,
}: SprintVelocityChartProps) {
  const chartData = useMemo(() => {
    // Filter to completed sprints with data, sorted by end date
    const completed = sprints
      .filter((s) => s.status === 'COMPLETED')
      .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());

    if (completed.length === 0) return null;

    const items = completed.map((s) => ({
      name: s.name,
      committed: s.plannedPoints || 0,
      completed: s.velocity || 0,
    }));

    // Compute rolling average
    const rollingAvg: number[] = [];
    for (let i = 0; i < items.length; i++) {
      const windowStart = Math.max(0, i - 2); // 3-sprint rolling window
      const window = items.slice(windowStart, i + 1);
      const avg =
        window.reduce((sum, it) => sum + it.completed, 0) / window.length;
      rollingAvg.push(Math.round(avg * 10) / 10);
    }

    const maxValue = Math.max(
      ...items.map((it) => Math.max(it.committed, it.completed)),
      1
    );

    return { items, rollingAvg, maxValue };
  }, [sprints]);

  if (!chartData || chartData.items.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-gray-400">
        No completed sprints for velocity data
      </div>
    );
  }

  const { items, rollingAvg, maxValue } = chartData;

  // SVG dimensions
  const width = compact ? 280 : 560;
  const height = compact ? 160 : 280;
  const padding = { top: 20, right: 30, bottom: 50, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Bar layout
  const groupWidth = chartWidth / items.length;
  const barWidth = Math.min(groupWidth * 0.3, compact ? 16 : 28);
  const barGap = compact ? 2 : 4;

  // Scale
  const scaleY = (val: number) =>
    padding.top + chartHeight - (val / maxValue) * chartHeight;

  // Y-axis ticks
  const yTicks = compact ? 3 : 5;
  const yLabels = Array.from({ length: yTicks + 1 }, (_, i) =>
    Math.round((maxValue / yTicks) * (yTicks - i))
  );

  // Rolling average line points
  const avgLinePath = rollingAvg
    .map((val, i) => {
      const cx = padding.left + groupWidth * i + groupWidth / 2;
      const cy = scaleY(val);
      return `${i === 0 ? 'M' : 'L'} ${cx} ${cy}`;
    })
    .join(' ');

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        role="img"
        aria-label="Sprint velocity chart"
      >
        {/* Y-axis grid */}
        {yLabels.map((val, i) => {
          const y = scaleY(val);
          return (
            <g key={`y-${i}`}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth={1}
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-gray-400"
                fontSize={compact ? 9 : 11}
              >
                {val}
              </text>
            </g>
          );
        })}

        {/* Bars per sprint */}
        {items.map((item, i) => {
          const cx = padding.left + groupWidth * i + groupWidth / 2;
          const committedH =
            (item.committed / maxValue) * chartHeight;
          const completedH =
            (item.completed / maxValue) * chartHeight;
          const baseY = padding.top + chartHeight;

          return (
            <g key={`bar-${i}`}>
              {/* Committed bar (light blue) */}
              <rect
                x={cx - barWidth - barGap / 2}
                y={baseY - committedH}
                width={barWidth}
                height={committedH}
                rx={2}
                fill="#93c5fd"
              />

              {/* Completed bar (dark blue) */}
              <rect
                x={cx + barGap / 2}
                y={baseY - completedH}
                width={barWidth}
                height={completedH}
                rx={2}
                fill="#2563eb"
              />

              {/* Sprint name label */}
              <text
                x={cx}
                y={height - padding.bottom + 14}
                textAnchor="middle"
                className="fill-gray-500"
                fontSize={compact ? 8 : 10}
              >
                {compact && item.name.length > 8
                  ? item.name.substring(0, 8) + '...'
                  : item.name}
              </text>

              {/* Value labels on bars (non-compact only) */}
              {!compact && item.committed > 0 && (
                <text
                  x={cx - barWidth / 2 - barGap / 2}
                  y={baseY - committedH - 4}
                  textAnchor="middle"
                  className="fill-blue-400"
                  fontSize={9}
                >
                  {item.committed}
                </text>
              )}
              {!compact && item.completed > 0 && (
                <text
                  x={cx + barWidth / 2 + barGap / 2}
                  y={baseY - completedH - 4}
                  textAnchor="middle"
                  className="fill-blue-700"
                  fontSize={9}
                >
                  {item.completed}
                </text>
              )}
            </g>
          );
        })}

        {/* Rolling average line (dashed red) */}
        {avgLinePath && (
          <path
            d={avgLinePath}
            fill="none"
            stroke="#ef4444"
            strokeWidth={1.5}
            strokeDasharray="5 3"
            strokeLinejoin="round"
          />
        )}

        {/* Average line dots */}
        {rollingAvg.map((val, i) => {
          const cx = padding.left + groupWidth * i + groupWidth / 2;
          return (
            <circle
              key={`avg-dot-${i}`}
              cx={cx}
              cy={scaleY(val)}
              r={compact ? 2 : 3}
              fill="#ef4444"
            />
          );
        })}

        {/* Axes */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          stroke="#d1d5db"
          strokeWidth={1}
        />
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke="#d1d5db"
          strokeWidth={1}
        />

        {/* Y-axis title */}
        {!compact && (
          <text
            x={12}
            y={padding.top + chartHeight / 2}
            textAnchor="middle"
            transform={`rotate(-90, 12, ${padding.top + chartHeight / 2})`}
            className="fill-gray-400"
            fontSize={10}
          >
            Story Points
          </text>
        )}
      </svg>

      {/* Legend */}
      <div className={`flex items-center gap-4 mt-2 ${compact ? 'justify-center' : 'ml-12'}`}>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-blue-300 rounded-sm" />
          <span className="text-xs text-gray-500">Committed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-blue-600 rounded-sm" />
          <span className="text-xs text-gray-500">Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-6 h-0.5"
            style={{ borderTop: '1.5px dashed #ef4444' }}
          />
          <span className="text-xs text-gray-500">Rolling Avg</span>
        </div>
      </div>
    </div>
  );
}
