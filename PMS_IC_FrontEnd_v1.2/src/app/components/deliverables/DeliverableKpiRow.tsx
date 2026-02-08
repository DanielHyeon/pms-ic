import { useMemo } from 'react';
import { Card, CardContent } from '../ui/card';
import {
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Lock,
  Send,
  BarChart3,
} from 'lucide-react';
import type { ViewModePreset } from '../../../types/menuOntology';

// ── Types ──────────────────────────────────────────────────

export interface DeliverableKpiRowProps {
  deliverables: any[];
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

function buildKpiCards(deliverables: any[]): Record<string, KpiCardDef> {
  const total = deliverables.length;
  const submitted = deliverables.filter((d) => d.status === 'SUBMITTED').length;
  const inReview = deliverables.filter((d) => d.status === 'IN_REVIEW').length;
  const approved = deliverables.filter((d) => d.status === 'APPROVED').length;
  const locked = deliverables.filter((d) => d.status === 'LOCKED').length;
  const rejected = deliverables.filter((d) => d.status === 'REJECTED').length;

  const now = new Date();
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  const overdueCount = deliverables.filter((d) => {
    if (d.status === 'APPROVED' || d.status === 'LOCKED') return false;
    if (!d.uploadedAt) return false;
    return now.getTime() - new Date(d.uploadedAt).getTime() > THIRTY_DAYS_MS;
  }).length;

  const phaseCompletionRate = total > 0
    ? `${Math.round(((approved + locked) / total) * 100)}%`
    : '0%';

  const myDeliverables = total;

  return {
    total: {
      key: 'total',
      label: '전체 산출물',
      icon: <FileText size={18} />,
      value: total,
      color: 'text-gray-700',
    },
    submitted: {
      key: 'submitted',
      label: '검토 대기',
      icon: <Send size={18} />,
      value: submitted,
      color: 'text-blue-600',
    },
    inReview: {
      key: 'inReview',
      label: '승인 대기',
      icon: <Clock size={18} />,
      value: inReview,
      color: 'text-amber-600',
    },
    approved: {
      key: 'approved',
      label: '승인 완료',
      icon: <CheckCircle size={18} />,
      value: approved,
      color: 'text-green-600',
    },
    locked: {
      key: 'locked',
      label: '확정(잠금)',
      icon: <Lock size={18} />,
      value: locked,
      color: 'text-emerald-800',
    },
    rejected: {
      key: 'rejected',
      label: '반려',
      icon: <AlertCircle size={18} />,
      value: rejected,
      color: 'text-red-600',
    },
    overdue: {
      key: 'overdue',
      label: '기한 초과',
      icon: <AlertCircle size={18} />,
      value: overdueCount,
      color: 'text-orange-600',
    },
    phaseCompletionRate: {
      key: 'phaseCompletionRate',
      label: '단계 완료율',
      icon: <BarChart3 size={18} />,
      value: phaseCompletionRate,
      color: 'text-indigo-600',
    },
    myDeliverables: {
      key: 'myDeliverables',
      label: '내 산출물',
      icon: <FileText size={18} />,
      value: myDeliverables,
      color: 'text-blue-700',
    },
  };
}

// ── Preset-to-KPI mapping ──────────────────────────────────

const PRESET_KPI_KEYS: Record<ViewModePreset, string[]> = {
  EXEC_SUMMARY: ['total', 'approved', 'phaseCompletionRate'],
  PMO_CONTROL: ['total', 'inReview', 'overdue', 'phaseCompletionRate', 'locked'],
  PM_WORK: ['total', 'submitted', 'inReview', 'overdue', 'rejected'],
  DEV_EXECUTION: ['myDeliverables', 'submitted', 'rejected'],
  CUSTOMER_APPROVAL: ['total', 'inReview', 'approved'],
  AUDIT_EVIDENCE: ['total', 'locked', 'phaseCompletionRate'],
};

// ── Component ──────────────────────────────────────────────

export function DeliverableKpiRow({ deliverables, preset }: DeliverableKpiRowProps) {
  const allCards = useMemo(() => buildKpiCards(deliverables), [deliverables]);

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
