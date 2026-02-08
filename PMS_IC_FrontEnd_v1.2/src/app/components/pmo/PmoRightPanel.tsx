import { useMemo } from 'react';
import {
  X,
  LayoutDashboard,
  Radar,
  Users,
  Milestone,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { cn } from '../ui/utils';
import type { ProjectHealth } from './HealthMatrixTable';

// ─── Panel mode types ───────────────────────────────────

export type PmoPanelMode =
  | 'none'
  | 'project-summary'
  | 'health-detail'
  | 'resource'
  | 'milestone';

// ─── Tab definition ─────────────────────────────────────

const PANEL_TABS: { mode: PmoPanelMode; label: string; icon: typeof LayoutDashboard }[] = [
  { mode: 'project-summary', label: '\uC694\uC57D', icon: LayoutDashboard },
  { mode: 'health-detail', label: '\uAC74\uAC15', icon: Radar },
  { mode: 'resource', label: '\uC790\uC6D0', icon: Users },
  { mode: 'milestone', label: '\uB9C8\uC77C\uC2A4\uD1A4', icon: Milestone },
];

// ─── Grade badge color ──────────────────────────────────

const GRADE_BADGE_COLORS: Record<string, string> = {
  A: 'bg-green-500 text-white',
  B: 'bg-blue-500 text-white',
  C: 'bg-amber-500 text-white',
  D: 'bg-orange-500 text-white',
  F: 'bg-red-500 text-white',
};

// ─── Mock data for resource and milestone panels ────────
// TODO: Replace with real API

interface TeamResource {
  team: string;
  allocated: number;
  available: number;
  utilization: number;
}

const MOCK_TEAMS: TeamResource[] = [
  { team: '\uD504\uB860\uD2B8\uC5D4\uB4DC', allocated: 6, available: 8, utilization: 75 },
  { team: '\uBC31\uC5D4\uB4DC', allocated: 5, available: 6, utilization: 83 },
  { team: 'QA', allocated: 3, available: 4, utilization: 75 },
  { team: '\uB514\uC790\uC778', allocated: 2, available: 3, utilization: 67 },
];

interface MilestoneItem {
  id: string;
  title: string;
  project: string;
  date: string;
  status: 'completed' | 'upcoming' | 'overdue' | 'in_progress' | 'planned';
}

const MOCK_MILESTONES: MilestoneItem[] = [
  { id: 'ms-1', title: 'UI \uB514\uC790\uC778 \uC644\uB8CC', project: '\uACE0\uAC1D \uD3EC\uD138 \uAC1C\uD3B8', date: '2026-02-15', status: 'upcoming' },
  { id: 'ms-2', title: 'API \uC5F0\uB3D9 \uD14C\uC2A4\uD2B8', project: '\uBCF4\uD5D8 \uCCAD\uAD6C \uC2DC\uC2A4\uD15C', date: '2026-02-20', status: 'upcoming' },
  { id: 'ms-3', title: '\uC131\uB2A5 \uD14C\uC2A4\uD2B8 \uC644\uB8CC', project: '\uB370\uC774\uD130 \uBD84\uC11D \uD50C\uB7AB\uD3FC', date: '2026-02-25', status: 'planned' },
  { id: 'ms-4', title: '\uBCA0\uD0C0 \uBC30\uD3EC', project: '\uBAA8\uBC14\uC77C \uC571 v2.0', date: '2026-03-01', status: 'planned' },
  { id: 'ms-5', title: '\uBCF4\uC548 \uAC10\uC0AC \uC644\uB8CC', project: '\uBCF4\uC548 \uC778\uD504\uB77C \uAC1C\uC120', date: '2026-01-30', status: 'completed' },
];

// ─── Score dimension labels ─────────────────────────────

const DIMENSION_LABELS: Record<string, string> = {
  schedule: '\uC77C\uC815',
  cost: '\uBE44\uC6A9',
  quality: '\uD488\uC9C8',
  risk: '\uB9AC\uC2A4\uD06C',
  resource: '\uC790\uC6D0',
};

const DIMENSIONS = ['schedule', 'cost', 'quality', 'risk', 'resource'] as const;

// ─── Component ──────────────────────────────────────────

interface PmoRightPanelProps {
  mode: PmoPanelMode;
  onModeChange: (mode: PmoPanelMode) => void;
  onClose: () => void;
  selectedProject?: ProjectHealth | null;
}

export function PmoRightPanel({
  mode,
  onModeChange,
  onClose,
  selectedProject,
}: PmoRightPanelProps) {
  if (mode === 'none') return null;

  return (
    <aside className="w-[380px] flex-shrink-0 bg-white border-l border-gray-200 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 truncate">
          {selectedProject?.name || '\uD504\uB85C\uC81D\uD2B8 \uC0C1\uC138'}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close panel"
        >
          <X size={16} />
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="px-2 py-1.5 border-b border-gray-100 flex gap-1">
        {PANEL_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = mode === tab.mode;
          return (
            <button
              key={tab.mode}
              type="button"
              onClick={() => onModeChange(tab.mode)}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-md transition-all flex-1 justify-center',
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              )}
            >
              <Icon size={13} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {mode === 'project-summary' && (
          <ProjectSummaryContent project={selectedProject} />
        )}
        {mode === 'health-detail' && (
          <HealthDetailContent project={selectedProject} />
        )}
        {mode === 'resource' && <ResourceContent />}
        {mode === 'milestone' && <MilestoneContent />}
      </div>
    </aside>
  );
}

// ─── Project Summary Panel ──────────────────────────────

function ProjectSummaryContent({ project }: { project?: ProjectHealth | null }) {
  if (!project) {
    return (
      <div className="text-center text-gray-400 py-8">
        <LayoutDashboard size={32} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">\uD504\uB85C\uC81D\uD2B8\uB97C \uC120\uD0DD\uD574\uC8FC\uC138\uC694</p>
      </div>
    );
  }

  const TrendIcon = project.trend === 'up'
    ? TrendingUp
    : project.trend === 'down'
      ? TrendingDown
      : Minus;

  const trendColor = project.trend === 'up'
    ? 'text-green-600'
    : project.trend === 'down'
      ? 'text-red-600'
      : 'text-gray-400';

  return (
    <>
      {/* Grade badge + trend */}
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold',
            GRADE_BADGE_COLORS[project.overallGrade]
          )}
        >
          {project.overallGrade}
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">{project.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <TrendIcon size={14} className={trendColor} />
            <span className="text-xs text-gray-500">
              {project.trend === 'up' ? '\uAC1C\uC120 \uCD94\uC138' : project.trend === 'down' ? '\uD558\uB77D \uCD94\uC138' : '\uC720\uC9C0'}
            </span>
          </div>
        </div>
      </div>

      {/* Project meta */}
      <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-500">PM</span>
          <span className="font-medium text-gray-900">{project.pm}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">\uB2E8\uACC4</span>
          <span className="font-medium text-gray-900">{project.phase}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">\uC0C1\uD0DC</span>
          <StatusBadge status={project.status} />
        </div>
      </div>

      {/* Dimension score bars */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
          \uCC28\uC6D0\uBCC4 \uC810\uC218
        </h4>
        {DIMENSIONS.map((dim) => {
          const score = project[dim];
          const pct = (score / 5) * 100;
          const barColor = score >= 4 ? 'bg-green-500' : score >= 3 ? 'bg-amber-500' : 'bg-red-500';
          return (
            <div key={dim} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">{DIMENSION_LABELS[dim]}</span>
                <span className="font-medium text-gray-900">{score}/5</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', barColor)}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick action links */}
      <div className="pt-2 border-t border-gray-100 space-y-1.5">
        <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
          \uBE60\uB978 \uC791\uC5C5
        </h4>
        {[
          { label: '\uD504\uB85C\uC81D\uD2B8 \uB300\uC2DC\uBCF4\uB4DC', href: '#' },
          { label: '\uC774\uC288 \uBAA9\uB85D', href: '#' },
          { label: '\uC0B0\uCD9C\uBB3C \uD604\uD669', href: '#' },
        ].map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1.5 rounded transition-colors"
          >
            <ExternalLink size={12} />
            {link.label}
          </a>
        ))}
      </div>
    </>
  );
}

// ─── Health Detail Panel (Radar-like visualization) ─────

function HealthDetailContent({ project }: { project?: ProjectHealth | null }) {
  if (!project) {
    return (
      <div className="text-center text-gray-400 py-8">
        <Radar size={32} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm">\uD504\uB85C\uC81D\uD2B8\uB97C \uC120\uD0DD\uD574\uC8FC\uC138\uC694</p>
      </div>
    );
  }

  const scores = DIMENSIONS.map((dim) => ({
    dim,
    label: DIMENSION_LABELS[dim],
    score: project[dim],
  }));

  const avgScore = useMemo(
    () => scores.reduce((sum, s) => sum + s.score, 0) / scores.length,
    [scores]
  );

  // SVG radar chart
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 85;
  const levels = 5;

  const angleStep = (2 * Math.PI) / scores.length;
  const startAngle = -Math.PI / 2; // top

  const getPoint = (index: number, value: number) => {
    const angle = startAngle + index * angleStep;
    const r = (value / 5) * maxR;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  const polygonPoints = scores
    .map((s, i) => {
      const pt = getPoint(i, s.score);
      return `${pt.x},${pt.y}`;
    })
    .join(' ');

  return (
    <>
      {/* Overall grade header */}
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold',
            GRADE_BADGE_COLORS[project.overallGrade]
          )}
        >
          {project.overallGrade}
        </span>
        <div>
          <p className="text-sm font-medium text-gray-900">\uC885\uD569 \uAC74\uAC15 \uC810\uC218</p>
          <p className="text-xs text-gray-500">\uD3C9\uADE0 {avgScore.toFixed(1)} / 5.0</p>
        </div>
      </div>

      {/* Radar chart (SVG) */}
      <div className="flex justify-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Grid levels */}
          {Array.from({ length: levels }, (_, i) => {
            const r = ((i + 1) / levels) * maxR;
            const pts = scores
              .map((_, j) => {
                const angle = startAngle + j * angleStep;
                return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
              })
              .join(' ');
            return (
              <polygon
                key={i}
                points={pts}
                fill="none"
                stroke="#e5e7eb"
                strokeWidth={i === levels - 1 ? 1.5 : 0.5}
              />
            );
          })}

          {/* Axis lines */}
          {scores.map((_, i) => {
            const pt = getPoint(i, 5);
            return (
              <line
                key={i}
                x1={cx}
                y1={cy}
                x2={pt.x}
                y2={pt.y}
                stroke="#d1d5db"
                strokeWidth={0.5}
              />
            );
          })}

          {/* Data polygon */}
          <polygon
            points={polygonPoints}
            fill="rgba(59, 130, 246, 0.15)"
            stroke="#3b82f6"
            strokeWidth={2}
          />

          {/* Data points */}
          {scores.map((s, i) => {
            const pt = getPoint(i, s.score);
            return (
              <circle
                key={i}
                cx={pt.x}
                cy={pt.y}
                r={3.5}
                fill="#3b82f6"
                stroke="white"
                strokeWidth={1.5}
              />
            );
          })}

          {/* Labels */}
          {scores.map((s, i) => {
            const labelPt = getPoint(i, 6.2);
            return (
              <text
                key={i}
                x={labelPt.x}
                y={labelPt.y}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-gray-600 text-[10px] font-medium"
              >
                {s.label}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Score details table */}
      <div className="space-y-1.5">
        {scores.map((s) => {
          const color = s.score >= 4 ? 'text-green-700' : s.score >= 3 ? 'text-amber-700' : 'text-red-700';
          return (
            <div key={s.dim} className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50">
              <span className="text-xs text-gray-600">{s.label}</span>
              <span className={cn('text-sm font-bold', color)}>{s.score}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Resource Panel ─────────────────────────────────────

function ResourceContent() {
  const totalAllocated = MOCK_TEAMS.reduce((s, t) => s + t.allocated, 0);
  const totalAvailable = MOCK_TEAMS.reduce((s, t) => s + t.available, 0);
  const overallUtilization = Math.round((totalAllocated / totalAvailable) * 100);

  return (
    <>
      {/* Overall utilization */}
      <div className="bg-gray-50 rounded-lg p-3 text-center">
        <p className="text-xs text-gray-500 mb-1">\uC804\uCCB4 \uC790\uC6D0 \uD65C\uC6A9\uB960</p>
        <p className="text-3xl font-bold text-gray-900">{overallUtilization}%</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {totalAllocated}\uBA85 / {totalAvailable}\uBA85 \uBC30\uC815
        </p>
      </div>

      {/* Team breakdown bars */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
          \uD300\uBCC4 \uC790\uC6D0 \uBC30\uBD84
        </h4>
        {MOCK_TEAMS.map((team) => {
          const pct = team.utilization;
          const barColor =
            pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-amber-500' : 'bg-green-500';
          return (
            <div key={team.team} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-700 font-medium">{team.team}</span>
                <span className="text-gray-500">
                  {team.allocated}/{team.available}\uBA85 ({pct}%)
                </span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', barColor)}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-gray-400 pt-2 border-t border-gray-100">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          &lt;75%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          75-90%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          &gt;90%
        </span>
      </div>
    </>
  );
}

// ─── Milestone Panel ────────────────────────────────────

function MilestoneContent() {
  const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
    completed: { icon: CheckCircle2, color: 'text-green-500', label: '\uC644\uB8CC' },
    upcoming: { icon: Clock, color: 'text-blue-500', label: '\uC608\uC815' },
    in_progress: { icon: Clock, color: 'text-amber-500', label: '\uC9C4\uD589\uC911' },
    overdue: { icon: AlertCircle, color: 'text-red-500', label: '\uC9C0\uC5F0' },
    planned: { icon: Calendar, color: 'text-gray-400', label: '\uACC4\uD68D' },
  };

  return (
    <>
      <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
        \uC608\uC815 \uB9C8\uC77C\uC2A4\uD1A4
      </h4>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gray-200" />

        <div className="space-y-4">
          {MOCK_MILESTONES.map((ms) => {
            const config = statusConfig[ms.status] || statusConfig.planned;
            const Icon = config.icon;
            return (
              <div key={ms.id} className="flex gap-3 relative">
                {/* Timeline dot */}
                <div className="flex-shrink-0 w-[30px] flex justify-center z-10">
                  <Icon size={16} className={config.color} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {ms.title}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{ms.project}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-gray-400">
                      {ms.date}
                    </span>
                    <span
                      className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded',
                        ms.status === 'completed'
                          ? 'bg-green-50 text-green-600'
                          : ms.status === 'overdue'
                            ? 'bg-red-50 text-red-600'
                            : 'bg-gray-50 text-gray-500'
                      )}
                    >
                      {config.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ─── Shared helpers ─────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string }> = {
    on_track: { label: '\uC815\uC0C1', color: 'bg-green-100 text-green-700' },
    at_risk: { label: '\uC8FC\uC758', color: 'bg-amber-100 text-amber-700' },
    delayed: { label: '\uC9C0\uC5F0', color: 'bg-orange-100 text-orange-700' },
    critical: { label: '\uC704\uD5D8', color: 'bg-red-100 text-red-700' },
  };

  const c = config[status] || config.on_track;
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium', c.color)}>
      {c.label}
    </span>
  );
}
