import { useMemo } from 'react';
import { Clock, AlertTriangle, User } from 'lucide-react';
import { DECISION_STATUS_LABELS } from '../../../constants/statusMaps';
import type { DecisionStatus } from '../../../constants/statusMaps';
import type { DecisionItem } from './types';

// ── Types ──────────────────────────────────────────────────

interface DecisionKanbanViewProps {
  decisions: DecisionItem[];
  onSelect: (decision: DecisionItem) => void;
  selectedDecisionId?: string | null;
}

// ── Status styling ─────────────────────────────────────────

const DECISION_STATUS_COLORS: Record<DecisionStatus, string> = {
  PROPOSED: 'bg-blue-100 text-blue-700',
  UNDER_REVIEW: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  DEFERRED: 'bg-gray-100 text-gray-700',
};

// ── Helpers ────────────────────────────────────────────────

function daysSince(dateStr: string): number {
  const date = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function getUrgencyColor(days: number): string {
  if (days >= 14) return 'text-red-600';
  if (days >= 7) return 'text-amber-600';
  return 'text-gray-500';
}

// ── Decision Card ──────────────────────────────────────────

function DecisionCard({
  decision,
  onSelect,
  isSelected,
}: {
  decision: DecisionItem;
  onSelect: (d: DecisionItem) => void;
  isSelected: boolean;
}) {
  const days = daysSince(decision.proposedDate);
  const urgencyColor = getUrgencyColor(days);

  return (
    <button
      onClick={() => onSelect(decision)}
      className={`w-full text-left p-3 rounded-lg border transition-all ${
        isSelected
          ? 'border-blue-400 bg-blue-50 shadow-sm'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      {/* Header: Code + Days */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-mono text-gray-500">{decision.code}</span>
        <span
          className={`text-xs font-medium flex items-center gap-1 ${urgencyColor}`}
          title={`${days} days since proposal`}
        >
          <Clock size={10} />
          D+{days}
        </span>
      </div>

      {/* Title */}
      <p className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">
        {decision.title}
      </p>

      {/* Footer: Owner + Urgency indicator */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 flex items-center gap-1">
          <User size={10} />
          {decision.owner}
        </span>
        {days >= 14 && (
          <span className="text-xs text-red-600 flex items-center gap-1">
            <AlertTriangle size={10} />
            Urgent
          </span>
        )}
      </div>

      {/* Escalation source indicator */}
      {decision.escalationSourceId && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <span className="text-[10px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
            Escalated from {decision.escalationSourceType || 'issue'}
          </span>
        </div>
      )}
    </button>
  );
}

// ── Kanban Column ──────────────────────────────────────────

function KanbanColumn({
  title,
  decisions,
  count,
  color,
  onSelect,
  selectedId,
  subSections,
}: {
  title: string;
  decisions: DecisionItem[];
  count: number;
  color: string;
  onSelect: (d: DecisionItem) => void;
  selectedId: string | null | undefined;
  subSections?: { title: string; status: DecisionStatus; items: DecisionItem[] }[];
}) {
  return (
    <div className="flex-1 min-w-[280px] bg-gray-50 rounded-xl border border-gray-200 flex flex-col">
      {/* Column header */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-700">{title}</h4>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
            {count}
          </span>
        </div>
      </div>

      {/* Column content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {subSections ? (
          // Render sub-sections (for DECIDED column)
          subSections.map((section) => (
            <div key={section.status}>
              {section.items.length > 0 && (
                <>
                  <div className="flex items-center gap-2 mb-2 mt-1">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        DECISION_STATUS_COLORS[section.status]
                      }`}
                    >
                      {section.title}
                    </span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  {section.items.map((d) => (
                    <DecisionCard
                      key={d.id}
                      decision={d}
                      onSelect={onSelect}
                      isSelected={selectedId === d.id}
                    />
                  ))}
                </>
              )}
            </div>
          ))
        ) : (
          // Regular items
          decisions.map((d) => (
            <DecisionCard
              key={d.id}
              decision={d}
              onSelect={onSelect}
              isSelected={selectedId === d.id}
            />
          ))
        )}

        {count === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-gray-400">
            No decisions
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────

export function DecisionKanbanView({
  decisions,
  onSelect,
  selectedDecisionId,
}: DecisionKanbanViewProps) {
  const columns = useMemo(() => {
    const proposed = decisions.filter((d) => d.status === 'PROPOSED');
    const underReview = decisions.filter((d) => d.status === 'UNDER_REVIEW');
    const approved = decisions.filter((d) => d.status === 'APPROVED');
    const rejected = decisions.filter((d) => d.status === 'REJECTED');
    const deferred = decisions.filter((d) => d.status === 'DEFERRED');
    const decidedCount = approved.length + rejected.length + deferred.length;

    return {
      proposed,
      underReview,
      decided: { approved, rejected, deferred, count: decidedCount },
    };
  }, [decisions]);

  return (
    <div className="flex gap-4 h-full">
      <KanbanColumn
        title="Proposed"
        decisions={columns.proposed}
        count={columns.proposed.length}
        color="bg-blue-100 text-blue-700"
        onSelect={onSelect}
        selectedId={selectedDecisionId}
      />
      <KanbanColumn
        title="Under Review"
        decisions={columns.underReview}
        count={columns.underReview.length}
        color="bg-amber-100 text-amber-700"
        onSelect={onSelect}
        selectedId={selectedDecisionId}
      />
      <KanbanColumn
        title="Decided"
        decisions={[]}
        count={columns.decided.count}
        color="bg-green-100 text-green-700"
        onSelect={onSelect}
        selectedId={selectedDecisionId}
        subSections={[
          {
            title: 'Approved',
            status: 'APPROVED',
            items: columns.decided.approved,
          },
          {
            title: 'Rejected',
            status: 'REJECTED',
            items: columns.decided.rejected,
          },
          {
            title: 'Deferred',
            status: 'DEFERRED',
            items: columns.decided.deferred,
          },
        ]}
      />
    </div>
  );
}
