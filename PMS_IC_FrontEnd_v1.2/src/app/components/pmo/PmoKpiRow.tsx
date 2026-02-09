import { useMemo } from 'react';
import {
  Briefcase,
  HeartPulse,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import type { ViewModePreset } from '../../../types/menuOntology';
import type { LucideIcon } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────

interface KpiCardDef {
  key: string;
  label: string;
  value: number | string;
  subLabel?: string;
  icon: LucideIcon;
  color: string;
  iconColor: string;
}

const ALL_KPI_CARDS: Record<string, KpiCardDef> = {
  portfolioCount: {
    key: 'portfolioCount',
    label: '포트폴리오 프로젝트',
    value: 8,
    subLabel: '활성 프로젝트',
    icon: Briefcase,
    color: 'bg-blue-50 border-blue-200',
    iconColor: 'bg-blue-100 text-blue-600',
  },
  avgHealthScore: {
    key: 'avgHealthScore',
    label: '평균 건강 점수',
    value: '3.6 / 5.0',
    subLabel: '72%',
    icon: HeartPulse,
    color: 'bg-green-50 border-green-200',
    iconColor: 'bg-green-100 text-green-600',
  },
  criticalProjects: {
    key: 'criticalProjects',
    label: '위험 프로젝트',
    value: 1,
    subLabel: '즉시 조치 필요',
    icon: AlertTriangle,
    color: 'bg-red-50 border-red-200',
    iconColor: 'bg-red-100 text-red-600',
  },
  onTrackProjects: {
    key: 'onTrackProjects',
    label: '정상 진행 프로젝트',
    value: 5,
    subLabel: '계획 대비 정상',
    icon: CheckCircle2,
    color: 'bg-emerald-50 border-emerald-200',
    iconColor: 'bg-emerald-100 text-emerald-600',
  },
  delayedProjects: {
    key: 'delayedProjects',
    label: '지연 프로젝트',
    value: 2,
    subLabel: '일정 지연 발생',
    icon: Clock,
    color: 'bg-amber-50 border-amber-200',
    iconColor: 'bg-amber-100 text-amber-600',
  },
  atRiskProjects: {
    key: 'atRiskProjects',
    label: '위험 예상 프로젝트',
    value: 1,
    subLabel: '모니터링 필요',
    icon: ShieldAlert,
    color: 'bg-orange-50 border-orange-200',
    iconColor: 'bg-orange-100 text-orange-600',
  },
};

/**
 * KPI card keys per preset.
 * PM_WORK and DEV_EXECUTION are excluded (no PMO access per spec).
 */
const PRESET_KPI_KEYS: Partial<Record<ViewModePreset, string[]>> = {
  PMO_CONTROL: ['portfolioCount', 'avgHealthScore', 'criticalProjects', 'onTrackProjects'],
  EXEC_SUMMARY: ['portfolioCount', 'avgHealthScore', 'criticalProjects'],
  CUSTOMER_APPROVAL: ['portfolioCount', 'avgHealthScore', 'onTrackProjects'],
  AUDIT_EVIDENCE: ['portfolioCount', 'avgHealthScore'],
};

// ─── Component ──────────────────────────────────────────

export interface PortfolioStats {
  totalProjects: number;
  activeProjects: number;
  avgProgress: number;
  projectsByStatus: Record<string, number>;
  totalIssues: number;
  highPriorityIssues: number;
}

interface PmoKpiRowProps {
  preset: ViewModePreset;
  portfolioStats?: PortfolioStats;
}

// Mock fallback stats when backend is unavailable
const MOCK_PORTFOLIO_STATS: PortfolioStats = {
  totalProjects: 8,
  activeProjects: 6,
  avgProgress: 68,
  projectsByStatus: { ACTIVE: 5, DELAYED: 1, AT_RISK: 1, COMPLETED: 1 },
  totalIssues: 23,
  highPriorityIssues: 3,
};

export function PmoKpiRow({ preset, portfolioStats }: PmoKpiRowProps) {
  const cards = useMemo(() => {
    const stats = portfolioStats ?? MOCK_PORTFOLIO_STATS;
    const computedCards: Record<string, KpiCardDef> = {
      portfolioCount: {
        ...ALL_KPI_CARDS.portfolioCount,
        value: stats.activeProjects,
      },
      avgHealthScore: {
        ...ALL_KPI_CARDS.avgHealthScore,
        value: `${(stats.avgProgress / 20).toFixed(1)} / 5.0`,
        subLabel: `${stats.avgProgress}%`,
      },
      criticalProjects: {
        ...ALL_KPI_CARDS.criticalProjects,
        value: stats.highPriorityIssues,
      },
      onTrackProjects: {
        ...ALL_KPI_CARDS.onTrackProjects,
        value: stats.projectsByStatus?.['ACTIVE'] ?? 0,
      },
      delayedProjects: {
        ...ALL_KPI_CARDS.delayedProjects,
        value: stats.projectsByStatus?.['DELAYED'] ?? 0,
      },
      atRiskProjects: {
        ...ALL_KPI_CARDS.atRiskProjects,
        value: stats.projectsByStatus?.['AT_RISK'] ?? 0,
      },
    };

    const keys = PRESET_KPI_KEYS[preset] ?? PRESET_KPI_KEYS.PMO_CONTROL!;
    return keys.map((k) => computedCards[k]).filter(Boolean);
  }, [preset, portfolioStats]);

  const gridCols: Record<number, string> = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  };

  return (
    <div className={`grid ${gridCols[cards.length] || 'grid-cols-4'} gap-4`}>
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.key}
            className={`rounded-xl border p-4 ${card.color} transition-shadow hover:shadow-md`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${card.iconColor}`}>
                <Icon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-500 truncate">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                {card.subLabel && (
                  <p className="text-xs text-gray-400 truncate">{card.subLabel}</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
