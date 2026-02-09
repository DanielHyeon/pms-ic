import { useState, useMemo, useCallback } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { cn } from '../ui/utils';

// ─── Types ──────────────────────────────────────────────

type HealthGrade = 'A' | 'B' | 'C' | 'D' | 'F';
type ProjectStatus = 'on_track' | 'at_risk' | 'delayed' | 'critical';
type TrendDirection = 'up' | 'down' | 'stable';

export interface ProjectHealth {
  id: string;
  name: string;
  pm: string;
  phase: string;
  overallGrade: HealthGrade;
  schedule: number; // 1-5
  cost: number;
  quality: number;
  risk: number;
  resource: number;
  status: ProjectStatus;
  trend: TrendDirection;
}

type SortKey = keyof Pick<
  ProjectHealth,
  'name' | 'overallGrade' | 'schedule' | 'cost' | 'quality' | 'risk' | 'resource' | 'status' | 'trend'
>;
type SortDir = 'asc' | 'desc';

// ─── Mock fallback data ─────────────────────────────────

const MOCK_PROJECTS: ProjectHealth[] = [
  { id: 'p1', name: '고객 포탈 개편', pm: 'Kim Minjun', phase: 'Development', overallGrade: 'B', schedule: 4, cost: 3, quality: 4, risk: 3, resource: 4, status: 'on_track', trend: 'up' },
  { id: 'p2', name: '보험 청구 시스템', pm: 'Lee Jiyeon', phase: 'Testing', overallGrade: 'C', schedule: 3, cost: 2, quality: 3, risk: 4, resource: 3, status: 'at_risk', trend: 'down' },
  { id: 'p3', name: '데이터 분석 플랫폼', pm: 'Park Sungho', phase: 'Planning', overallGrade: 'A', schedule: 5, cost: 4, quality: 5, risk: 5, resource: 4, status: 'on_track', trend: 'up' },
  { id: 'p4', name: '모바일 앱 v2.0', pm: 'Choi Eunji', phase: 'Development', overallGrade: 'D', schedule: 2, cost: 2, quality: 3, risk: 2, resource: 2, status: 'delayed', trend: 'down' },
  { id: 'p5', name: '보안 인프라 개선', pm: 'Jung Taewoo', phase: 'Implementation', overallGrade: 'B', schedule: 4, cost: 4, quality: 3, risk: 3, resource: 4, status: 'on_track', trend: 'stable' },
  { id: 'p6', name: 'ERP 마이그레이션', pm: 'Han Seoyoung', phase: 'Analysis', overallGrade: 'C', schedule: 3, cost: 3, quality: 4, risk: 2, resource: 3, status: 'at_risk', trend: 'stable' },
  { id: 'p7', name: 'AI 챗봇 도입', pm: 'Kang Jihoon', phase: 'Development', overallGrade: 'A', schedule: 5, cost: 5, quality: 4, risk: 4, resource: 5, status: 'on_track', trend: 'up' },
  { id: 'p8', name: '레거시 시스템 전환', pm: 'Yoon Hana', phase: 'Testing', overallGrade: 'F', schedule: 1, cost: 1, quality: 2, risk: 1, resource: 2, status: 'critical', trend: 'down' },
];

// ─── Color helpers ──────────────────────────────────────

const GRADE_COLORS: Record<HealthGrade, string> = {
  A: 'bg-green-100 text-green-800 border-green-300',
  B: 'bg-blue-100 text-blue-800 border-blue-300',
  C: 'bg-amber-100 text-amber-800 border-amber-300',
  D: 'bg-orange-100 text-orange-800 border-orange-300',
  F: 'bg-red-100 text-red-800 border-red-300',
};

const SCORE_COLORS: Record<number, string> = {
  5: 'text-green-700 bg-green-50',
  4: 'text-blue-700 bg-blue-50',
  3: 'text-amber-700 bg-amber-50',
  2: 'text-orange-700 bg-orange-50',
  1: 'text-red-700 bg-red-50',
};

const STATUS_LABELS: Record<ProjectStatus, { label: string; color: string }> = {
  on_track: { label: '정상', color: 'bg-green-100 text-green-700' },
  at_risk: { label: '주의', color: 'bg-amber-100 text-amber-700' },
  delayed: { label: '지연', color: 'bg-orange-100 text-orange-700' },
  critical: { label: '위험', color: 'bg-red-100 text-red-700' },
};

const GRADE_ORDER: Record<HealthGrade, number> = { A: 5, B: 4, C: 3, D: 2, F: 1 };
const STATUS_ORDER: Record<ProjectStatus, number> = { on_track: 4, at_risk: 3, delayed: 2, critical: 1 };
const TREND_ORDER: Record<TrendDirection, number> = { up: 3, stable: 2, down: 1 };

// ─── Component ──────────────────────────────────────────

interface HealthMatrixTableProps {
  projects?: ProjectHealth[];
  selectedProjectId?: string;
  onSelect: (project: ProjectHealth) => void;
}

export function HealthMatrixTable({ projects, selectedProjectId, onSelect }: HealthMatrixTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('overallGrade');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDir('desc');
      return key;
    });
  }, []);

  const data = (projects && projects.length > 0) ? projects : MOCK_PROJECTS;

  const sortedProjects = useMemo(() => {
    const list = [...data];
    const dir = sortDir === 'asc' ? 1 : -1;

    list.sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      switch (sortKey) {
        case 'name':
          return dir * a.name.localeCompare(b.name, 'ko');
        case 'overallGrade':
          aVal = GRADE_ORDER[a.overallGrade];
          bVal = GRADE_ORDER[b.overallGrade];
          break;
        case 'status':
          aVal = STATUS_ORDER[a.status];
          bVal = STATUS_ORDER[b.status];
          break;
        case 'trend':
          aVal = TREND_ORDER[a.trend];
          bVal = TREND_ORDER[b.trend];
          break;
        default:
          aVal = a[sortKey] as number;
          bVal = b[sortKey] as number;
          break;
      }
      return dir * ((aVal as number) - (bVal as number));
    });

    return list;
  }, [data, sortKey, sortDir]);

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown size={12} className="text-gray-300" />;
    return sortDir === 'asc'
      ? <ArrowUp size={12} className="text-blue-600" />
      : <ArrowDown size={12} className="text-blue-600" />;
  };

  const TrendIcon = ({ direction }: { direction: TrendDirection }) => {
    switch (direction) {
      case 'up':
        return <TrendingUp size={14} className="text-green-600" />;
      case 'down':
        return <TrendingDown size={14} className="text-red-600" />;
      default:
        return <Minus size={14} className="text-gray-400" />;
    }
  };

  const columns: { key: SortKey; label: string; width?: string }[] = [
    { key: 'name', label: '프로젝트명', width: 'w-[200px]' },
    { key: 'overallGrade', label: '종합 등급' },
    { key: 'schedule', label: '일정' },
    { key: 'cost', label: '비용' },
    { key: 'quality', label: '품질' },
    { key: 'risk', label: '리스크' },
    { key: 'resource', label: '자원' },
    { key: 'status', label: '상태' },
    { key: 'trend', label: '추세' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">
          프로젝트 건강 매트릭스
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          프로젝트별 5개 차원 건강 점수 현황
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-3 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none',
                    col.width
                  )}
                  onClick={() => handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    <SortIcon column={col.key} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedProjects.map((project) => {
              const isSelected = project.id === selectedProjectId;
              return (
                <tr
                  key={project.id}
                  onClick={() => onSelect(project)}
                  className={cn(
                    'cursor-pointer transition-colors',
                    isSelected
                      ? 'bg-blue-50 hover:bg-blue-100'
                      : 'hover:bg-gray-50'
                  )}
                >
                  {/* Project Name */}
                  <td className="px-3 py-2.5 font-medium text-gray-900 truncate max-w-[200px]">
                    {project.name}
                  </td>

                  {/* Overall Grade */}
                  <td className="px-3 py-2.5">
                    <span
                      className={cn(
                        'inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-bold border',
                        GRADE_COLORS[project.overallGrade]
                      )}
                    >
                      {project.overallGrade}
                    </span>
                  </td>

                  {/* Dimension scores */}
                  {(['schedule', 'cost', 'quality', 'risk', 'resource'] as const).map((dim) => (
                    <td key={dim} className="px-3 py-2.5">
                      <span
                        className={cn(
                          'inline-flex items-center justify-center w-7 h-7 rounded text-xs font-semibold',
                          SCORE_COLORS[project[dim]] || 'text-gray-500'
                        )}
                      >
                        {project[dim]}
                      </span>
                    </td>
                  ))}

                  {/* Status */}
                  <td className="px-3 py-2.5">
                    <span
                      className={cn(
                        'inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
                        STATUS_LABELS[project.status].color
                      )}
                    >
                      {STATUS_LABELS[project.status].label}
                    </span>
                  </td>

                  {/* Trend */}
                  <td className="px-3 py-2.5">
                    <TrendIcon direction={project.trend} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
