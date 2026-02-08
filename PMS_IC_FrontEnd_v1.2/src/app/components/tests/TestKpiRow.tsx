import { useMemo } from 'react';
import { Card, CardContent } from '../ui/card';
import {
  TestTube,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Shield,
  BarChart3,
  TrendingUp,
} from 'lucide-react';
import type { ViewModePreset } from '../../../types/menuOntology';

// ── Types ──────────────────────────────────────────────────

export interface TestKpiStats {
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  notRun: number;
  passRate: number;
  coverageRate: number;
  executionRate: number;
  regressionPassRate: number;
}

export interface TestKpiRowProps {
  stats: TestKpiStats;
  preset: ViewModePreset;
}

interface KpiCardDef {
  key: string;
  label: string;
  icon: React.ReactNode;
  value: string | number;
  color: string;
}

// ── KPI computation ────────────────────────────────────────

function buildKpiCards(stats: TestKpiStats): Record<string, KpiCardDef> {
  return {
    total: {
      key: 'total',
      label: 'Total Tests',
      icon: <TestTube size={18} />,
      value: stats.total,
      color: 'text-gray-700',
    },
    passRate: {
      key: 'passRate',
      label: 'Pass Rate',
      icon: <CheckCircle size={18} />,
      value: `${stats.passRate}%`,
      color: 'text-emerald-600',
    },
    failCount: {
      key: 'failCount',
      label: 'Failed',
      icon: <XCircle size={18} />,
      value: stats.failed,
      color: 'text-red-600',
    },
    blockedCount: {
      key: 'blockedCount',
      label: 'Blocked',
      icon: <AlertTriangle size={18} />,
      value: stats.blocked,
      color: 'text-purple-600',
    },
    coverageRate: {
      key: 'coverageRate',
      label: 'Coverage',
      icon: <Shield size={18} />,
      value: `${stats.coverageRate}%`,
      color: 'text-blue-600',
    },
    executionRate: {
      key: 'executionRate',
      label: 'Execution Rate',
      icon: <BarChart3 size={18} />,
      value: `${stats.executionRate}%`,
      color: 'text-indigo-600',
    },
    regressionPassRate: {
      key: 'regressionPassRate',
      label: 'Regression Pass',
      icon: <TrendingUp size={18} />,
      value: `${stats.regressionPassRate}%`,
      color: 'text-teal-600',
    },
  };
}

// ── Preset-to-KPI mapping ──────────────────────────────────

const PRESET_KPI_KEYS: Record<ViewModePreset, string[]> = {
  PM_WORK: ['total', 'passRate', 'failCount', 'blockedCount', 'coverageRate', 'executionRate'],
  PMO_CONTROL: ['passRate', 'failCount', 'coverageRate', 'executionRate', 'regressionPassRate'],
  DEV_EXECUTION: ['total', 'passRate', 'failCount'],
  EXEC_SUMMARY: ['total', 'passRate', 'coverageRate'],
  CUSTOMER_APPROVAL: ['total', 'passRate', 'coverageRate'],
  AUDIT_EVIDENCE: ['total', 'passRate'],
};

// ── Component ──────────────────────────────────────────────

export function TestKpiRow({ stats, preset }: TestKpiRowProps) {
  const allCards = useMemo(() => buildKpiCards(stats), [stats]);

  const visibleCards = useMemo(() => {
    const keys = PRESET_KPI_KEYS[preset] || PRESET_KPI_KEYS.DEV_EXECUTION;
    return keys.map((k) => allCards[k]).filter(Boolean);
  }, [preset, allCards]);

  if (visibleCards.length === 0) return null;

  return (
    <div
      className="grid gap-4"
      style={{
        gridTemplateColumns: `repeat(${Math.min(visibleCards.length, 6)}, minmax(0, 1fr))`,
      }}
    >
      {visibleCards.map((card) => (
        <Card key={card.key} className="border border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className={card.color}>{card.icon}</span>
              <p className="text-sm text-gray-500">{card.label}</p>
            </div>
            <p className={`text-2xl font-semibold mt-1 ${card.color}`}>
              {card.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
