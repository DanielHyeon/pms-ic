import { useMemo } from 'react';
import { Card, CardContent } from '../ui/card';
import {
  AlertTriangle,
  Bug,
  Shield,
  Clock,
  ArrowUpRight,
  Target,
  Zap,
} from 'lucide-react';
import type { ViewModePreset } from '../../../types/menuOntology';

// ── Types ──────────────────────────────────────────────────

export interface IssueKpiRowProps {
  issues: any[];
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

function buildKpiCards(issues: any[]): Record<string, KpiCardDef> {
  const totalIssues = issues.length;
  const openCount = issues.filter((i) => i.status === 'OPEN').length;
  const criticalCount = issues.filter(
    (i) =>
      i.priority === 'CRITICAL' &&
      !['RESOLVED', 'VERIFIED', 'CLOSED'].includes(i.status)
  ).length;

  const now = new Date();
  const overdueCount = issues.filter((i) => {
    if (!i.dueDate) return false;
    if (['RESOLVED', 'VERIFIED', 'CLOSED'].includes(i.status)) return false;
    return new Date(i.dueDate) < now;
  }).length;

  const escalatedCount = issues.filter(
    (i) => i.severity === 'CRITICAL' || i.escalated
  ).length;

  const resolvedIssues = issues.filter(
    (i) => i.createdAt && i.resolvedAt && ['RESOLVED', 'CLOSED'].includes(i.status)
  );
  let avgResolutionTime: string;
  if (resolvedIssues.length > 0) {
    const totalDays = resolvedIssues.reduce((sum, i) => {
      const created = new Date(i.createdAt).getTime();
      const resolved = new Date(i.resolvedAt).getTime();
      const days = (resolved - created) / (1000 * 60 * 60 * 24);
      return sum + (Number.isFinite(days) && days >= 0 ? days : 0);
    }, 0);
    const avg = totalDays / resolvedIssues.length;
    avgResolutionTime = `${avg.toFixed(1)} days`;
  } else {
    avgResolutionTime = 'N/A';
  }

  const blockedTaskCount = issues.filter(
    (i) => i.status === 'BLOCKED'
  ).length;

  return {
    totalIssues: {
      key: 'totalIssues',
      label: 'Total Issues',
      icon: <Bug size={18} />,
      value: totalIssues,
      color: 'text-gray-700',
    },
    openCount: {
      key: 'openCount',
      label: 'Open',
      icon: <AlertTriangle size={18} />,
      value: openCount,
      color: 'text-blue-600',
    },
    criticalCount: {
      key: 'criticalCount',
      label: 'Critical',
      icon: <Shield size={18} />,
      value: criticalCount,
      color: 'text-red-600',
    },
    overdueCount: {
      key: 'overdueCount',
      label: 'Overdue',
      icon: <Clock size={18} />,
      value: overdueCount,
      color: 'text-amber-600',
    },
    blockedTaskCount: {
      key: 'blockedTaskCount',
      label: 'Blocked Tasks',
      icon: <Zap size={18} />,
      value: blockedTaskCount,
      color: 'text-orange-600',
    },
    avgResolutionTime: {
      key: 'avgResolutionTime',
      label: 'Avg Resolution',
      icon: <Target size={18} />,
      value: avgResolutionTime,
      color: 'text-indigo-600',
    },
    escalatedCount: {
      key: 'escalatedCount',
      label: 'Escalated',
      icon: <ArrowUpRight size={18} />,
      value: escalatedCount,
      color: 'text-purple-600',
    },
  };
}

// ── Preset-to-KPI mapping ──────────────────────────────────

const PRESET_KPI_KEYS: Record<ViewModePreset, string[]> = {
  PM_WORK: [
    'totalIssues',
    'openCount',
    'criticalCount',
    'overdueCount',
    'blockedTaskCount',
    'avgResolutionTime',
    'escalatedCount',
  ],
  PMO_CONTROL: [
    'totalIssues',
    'openCount',
    'criticalCount',
    'avgResolutionTime',
    'escalatedCount',
  ],
  DEV_EXECUTION: ['totalIssues', 'openCount'],
  EXEC_SUMMARY: ['totalIssues', 'criticalCount', 'escalatedCount'],
  CUSTOMER_APPROVAL: ['totalIssues', 'criticalCount', 'openCount'],
  AUDIT_EVIDENCE: ['totalIssues', 'escalatedCount'],
};

// ── Component ──────────────────────────────────────────────

export function IssueKpiRow({ issues, preset }: IssueKpiRowProps) {
  const allCards = useMemo(() => buildKpiCards(issues), [issues]);

  const visibleCards = useMemo(() => {
    const keys = PRESET_KPI_KEYS[preset] || PRESET_KPI_KEYS.DEV_EXECUTION;
    return keys.map((k) => allCards[k]).filter(Boolean);
  }, [preset, allCards]);

  if (visibleCards.length === 0) return null;

  return (
    <div
      className="grid gap-4"
      style={{
        gridTemplateColumns: `repeat(${Math.min(visibleCards.length, 4)}, minmax(0, 1fr))`,
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
