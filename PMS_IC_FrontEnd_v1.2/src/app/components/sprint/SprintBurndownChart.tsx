import { useMemo } from 'react';
import type { Sprint } from '../../../types/backlog';

// ── Types ──────────────────────────────────────────────────

export interface SprintBurndownChartProps {
  sprint: Sprint;
  /** If available from API */
  burndownData?: { date: string; remaining: number }[];
  compact?: boolean; // Mini mode for EXEC_SUMMARY
}

// ── Helper ─────────────────────────────────────────────────

function generateIdealLine(
  totalDays: number,
  totalPoints: number
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i <= totalDays; i++) {
    points.push({
      x: i,
      y: totalPoints - (totalPoints / totalDays) * i,
    });
  }
  return points;
}

function parseBurndownToPoints(
  data: { date: string; remaining: number }[],
  startDate: Date,
  totalDays: number
): { x: number; y: number }[] {
  return data.map((d) => {
    const date = new Date(d.date);
    const dayIndex = Math.round(
      (date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return {
      x: Math.max(0, Math.min(dayIndex, totalDays)),
      y: d.remaining,
    };
  });
}

// ── Component ──────────────────────────────────────────────

export function SprintBurndownChart({
  sprint,
  burndownData,
  compact = false,
}: SprintBurndownChartProps) {
  const chartData = useMemo(() => {
    const start = new Date(sprint.startDate);
    const end = new Date(sprint.endDate);
    const totalDays = Math.max(
      1,
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    );
    const totalPoints = sprint.plannedPoints || 0;

    const idealLine = generateIdealLine(totalDays, totalPoints);

    let actualLine: { x: number; y: number }[] = [];
    if (burndownData && burndownData.length > 0) {
      actualLine = parseBurndownToPoints(burndownData, start, totalDays);
    } else {
      // Generate mock actual line based on sprint velocity
      // TODO: Replace with real API burndown data
      const completedPoints = sprint.velocity || 0;
      const today = new Date();
      const daysPassed = Math.max(
        0,
        Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      );
      const effectiveDays = Math.min(daysPassed, totalDays);

      for (let i = 0; i <= effectiveDays; i++) {
        // Simulate slightly uneven progress
        const progress = effectiveDays > 0 ? i / effectiveDays : 0;
        const wobble = Math.sin(i * 0.8) * (totalPoints * 0.05);
        const remaining =
          totalPoints - completedPoints * progress + wobble;
        actualLine.push({
          x: i,
          y: Math.max(0, Math.round(remaining)),
        });
      }
    }

    return { idealLine, actualLine, totalDays, totalPoints };
  }, [sprint, burndownData]);

  const { idealLine, actualLine, totalDays, totalPoints } = chartData;

  // SVG dimensions
  const width = compact ? 280 : 560;
  const height = compact ? 160 : 280;
  const padding = { top: 20, right: 30, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Scale functions
  const maxY = Math.max(totalPoints, 1);
  const scaleX = (val: number) =>
    padding.left + (val / Math.max(totalDays, 1)) * chartWidth;
  const scaleY = (val: number) =>
    padding.top + chartHeight - (val / maxY) * chartHeight;

  // Build SVG path strings
  const buildPath = (points: { x: number; y: number }[]): string => {
    if (points.length === 0) return '';
    return points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.x)} ${scaleY(p.y)}`)
      .join(' ');
  };

  const idealPath = buildPath(idealLine);
  const actualPath = buildPath(actualLine);

  // Y-axis labels
  const yTicks = compact ? 3 : 5;
  const yLabels = Array.from({ length: yTicks + 1 }, (_, i) =>
    Math.round((maxY / yTicks) * (yTicks - i))
  );

  // X-axis labels
  const xLabelInterval = compact
    ? Math.max(1, Math.ceil(totalDays / 4))
    : Math.max(1, Math.ceil(totalDays / 8));

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        role="img"
        aria-label={`Burndown chart for ${sprint.name}`}
      >
        {/* Grid lines */}
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

        {/* X-axis labels */}
        {Array.from({ length: totalDays + 1 }, (_, i) => i)
          .filter((i) => i % xLabelInterval === 0 || i === totalDays)
          .map((day) => (
            <text
              key={`x-${day}`}
              x={scaleX(day)}
              y={height - padding.bottom + 16}
              textAnchor="middle"
              className="fill-gray-400"
              fontSize={compact ? 9 : 11}
            >
              D{day + 1}
            </text>
          ))}

        {/* Ideal line (dashed gray) */}
        {idealPath && (
          <path
            d={idealPath}
            fill="none"
            stroke="#9ca3af"
            strokeWidth={1.5}
            strokeDasharray="6 4"
          />
        )}

        {/* Actual line (solid blue) */}
        {actualPath && (
          <path
            d={actualPath}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Data point dots on actual line */}
        {actualLine.map((p, i) => (
          <circle
            key={`dot-${i}`}
            cx={scaleX(p.x)}
            cy={scaleY(p.y)}
            r={compact ? 2 : 3}
            fill="#3b82f6"
          />
        ))}

        {/* Start / end SP labels */}
        {!compact && totalPoints > 0 && (
          <>
            <text
              x={scaleX(0) - 6}
              y={scaleY(totalPoints) - 6}
              textAnchor="end"
              className="fill-gray-500 font-medium"
              fontSize={10}
            >
              {totalPoints} SP
            </text>
            <text
              x={scaleX(totalDays) + 6}
              y={scaleY(0) + 4}
              textAnchor="start"
              className="fill-gray-400"
              fontSize={10}
            >
              0 SP
            </text>
          </>
        )}

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
      </svg>

      {/* Legend */}
      <div className={`flex items-center gap-4 mt-2 ${compact ? 'justify-center' : 'ml-12'}`}>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-0.5 bg-gray-400" style={{ borderTop: '1.5px dashed #9ca3af' }} />
          <span className="text-xs text-gray-500">Ideal</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-0.5 bg-blue-500 rounded" />
          <span className="text-xs text-gray-500">Actual</span>
        </div>
      </div>
    </div>
  );
}
