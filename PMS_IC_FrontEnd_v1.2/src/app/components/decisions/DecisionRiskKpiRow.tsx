import { useMemo } from 'react';
import { Card, CardContent } from '../ui/card';
import {
  Scale,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Shield,
  CheckCircle,
  Target,
} from 'lucide-react';
import type { ViewModePreset } from '../../../types/menuOntology';
import type { DecisionItem, RiskItem } from './types';

// ── Types ──────────────────────────────────────────────────

export interface DecisionRiskKpiRowProps {
  decisions: DecisionItem[];
  risks: RiskItem[];
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

function buildKpiCards(
  decisions: DecisionItem[],
  risks: RiskItem[]
): Record<string, KpiCardDef> {
  const totalDecisions = decisions.length;
  const pendingDecisions = decisions.filter(
    (d) => d.status === 'PROPOSED' || d.status === 'UNDER_REVIEW'
  ).length;
  const totalRisks = risks.length;
  const criticalRisks = risks.filter((r) => r.severity === 'critical').length;

  // TODO: Replace mock values with real API data
  const avgDecisionTime = '4.2 days';
  const escalationCount = 3;
  const riskScoreTrend = 'up';

  return {
    totalDecisions: {
      key: 'totalDecisions',
      label: 'Total Decisions',
      icon: <Scale size={18} />,
      value: totalDecisions,
      color: 'text-gray-700',
    },
    pendingDecisions: {
      key: 'pendingDecisions',
      label: 'Pending Decisions',
      icon: <Clock size={18} />,
      value: pendingDecisions,
      color: 'text-amber-600',
    },
    totalRisks: {
      key: 'totalRisks',
      label: 'Total Risks',
      icon: <Shield size={18} />,
      value: totalRisks,
      color: 'text-blue-600',
    },
    criticalRisks: {
      key: 'criticalRisks',
      label: 'Critical Risks',
      icon: <AlertTriangle size={18} />,
      value: criticalRisks,
      color: 'text-red-600',
    },
    avgDecisionTime: {
      key: 'avgDecisionTime',
      label: 'Avg Decision Time',
      icon: <Target size={18} />,
      value: avgDecisionTime,
      color: 'text-indigo-600',
    },
    escalationCount: {
      key: 'escalationCount',
      label: 'Escalation Count',
      icon: <ArrowUpRight size={18} />,
      value: escalationCount,
      color: 'text-purple-600',
    },
    riskScoreTrend: {
      key: 'riskScoreTrend',
      label: 'Risk Score Trend',
      icon: <TrendingUp size={18} />,
      value: riskScoreTrend === 'up' ? 'Increasing' : 'Decreasing',
      color: riskScoreTrend === 'up' ? 'text-red-600' : 'text-green-600',
    },
    approvedDecisions: {
      key: 'approvedDecisions',
      label: 'Approved',
      icon: <CheckCircle size={18} />,
      value: decisions.filter((d) => d.status === 'APPROVED').length,
      color: 'text-green-600',
    },
  };
}

// ── Preset-to-KPI mapping ──────────────────────────────────

const PRESET_KPI_KEYS: Record<ViewModePreset, string[]> = {
  EXEC_SUMMARY: ['totalDecisions', 'pendingDecisions', 'criticalRisks'],
  PMO_CONTROL: [
    'totalDecisions',
    'pendingDecisions',
    'totalRisks',
    'criticalRisks',
    'escalationCount',
  ],
  PM_WORK: [
    'pendingDecisions',
    'criticalRisks',
    'avgDecisionTime',
    'escalationCount',
    'riskScoreTrend',
  ],
  DEV_EXECUTION: ['totalRisks', 'criticalRisks'],
  CUSTOMER_APPROVAL: ['pendingDecisions', 'totalDecisions'],
  AUDIT_EVIDENCE: ['totalDecisions', 'totalRisks', 'escalationCount'],
};

// ── Component ──────────────────────────────────────────────

export function DecisionRiskKpiRow({
  decisions,
  risks,
  preset,
}: DecisionRiskKpiRowProps) {
  const allCards = useMemo(
    () => buildKpiCards(decisions, risks),
    [decisions, risks]
  );

  const visibleCards = useMemo(() => {
    const keys = PRESET_KPI_KEYS[preset] || PRESET_KPI_KEYS.DEV_EXECUTION;
    return keys.map((k) => allCards[k]).filter(Boolean);
  }, [preset, allCards]);

  if (visibleCards.length === 0) return null;

  return (
    <div
      className="grid gap-4"
      style={{
        gridTemplateColumns: `repeat(${Math.min(visibleCards.length, 5)}, minmax(0, 1fr))`,
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
