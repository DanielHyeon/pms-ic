import { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle, AlertCircle, MinusCircle } from 'lucide-react';
import type { PhaseCompliance, EvidenceType } from './types';
import { EVIDENCE_TYPE_CONFIG } from './types';

// Compliance data provided via props (no backend yet)

const STATUS_BADGE_STYLES: Record<PhaseCompliance['status'], { label: string; className: string; icon: React.ReactNode }> = {
  complete: {
    label: 'Complete',
    className: 'bg-green-100 text-green-700 border-green-200',
    icon: <CheckCircle size={12} />,
  },
  partial: {
    label: 'Partial',
    className: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: <AlertCircle size={12} />,
  },
  not_started: {
    label: 'Not Started',
    className: 'bg-gray-100 text-gray-500 border-gray-200',
    icon: <MinusCircle size={12} />,
  },
};

function getProgressBarColor(coverage: number): string {
  if (coverage >= 100) return 'bg-green-500';
  if (coverage >= 75) return 'bg-green-400';
  if (coverage >= 50) return 'bg-amber-400';
  if (coverage >= 25) return 'bg-orange-400';
  return 'bg-red-400';
}

interface ComplianceChecklistProps {
  compliance?: PhaseCompliance[];
  collapsed?: boolean;
}

export function ComplianceChecklist({ compliance = [], collapsed: initialCollapsed = false }: ComplianceChecklistProps) {
  const [sectionCollapsed, setSectionCollapsed] = useState(initialCollapsed);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());

  const togglePhase = (phaseId: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) {
        next.delete(phaseId);
      } else {
        next.add(phaseId);
      }
      return next;
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Section header */}
      <button
        type="button"
        onClick={() => setSectionCollapsed(!sectionCollapsed)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {sectionCollapsed ? (
            <ChevronRight size={16} className="text-gray-400" />
          ) : (
            <ChevronDown size={16} className="text-gray-400" />
          )}
          <h3 className="text-sm font-semibold text-gray-800">Compliance Checklist</h3>
          <span className="text-xs text-gray-400">({compliance.length} phases)</span>
        </div>
        <div className="flex items-center gap-2">
          {compliance.map((phase) => {
            const badge = STATUS_BADGE_STYLES[phase.status];
            return (
              <span
                key={phase.phaseId}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded border ${badge.className}`}
                title={`${phase.phaseName}: ${badge.label}`}
              >
                {badge.icon}
              </span>
            );
          })}
        </div>
      </button>

      {/* Phase list */}
      {!sectionCollapsed && (
        <div className="border-t border-gray-200 divide-y divide-gray-100">
          {compliance.map((phase) => {
            const isExpanded = expandedPhases.has(phase.phaseId);
            const badge = STATUS_BADGE_STYLES[phase.status];

            return (
              <div key={phase.phaseId}>
                {/* Phase row */}
                <button
                  type="button"
                  onClick={() => togglePhase(phase.phaseId)}
                  className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown size={14} className="text-gray-400 shrink-0" />
                  ) : (
                    <ChevronRight size={14} className="text-gray-400 shrink-0" />
                  )}

                  {/* Phase order */}
                  <span className="text-xs font-mono text-gray-400 w-5 shrink-0">
                    {phase.phaseOrder}
                  </span>

                  {/* Phase name */}
                  <span className="text-sm font-medium text-gray-800 flex-1 text-left">
                    {phase.phaseName}
                  </span>

                  {/* Progress bar */}
                  <div className="w-24 shrink-0">
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${getProgressBarColor(phase.coverage)}`}
                        style={{ width: `${phase.coverage}%` }}
                      />
                    </div>
                  </div>

                  {/* Coverage % */}
                  <span className="text-xs font-medium text-gray-600 w-10 text-right shrink-0">
                    {phase.coverage}%
                  </span>

                  {/* Counts */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs text-green-600" title="Approved">
                      {phase.approved}
                    </span>
                    <span className="text-gray-300">/</span>
                    <span className="text-xs text-gray-600" title="Required">
                      {phase.required}
                    </span>
                  </div>

                  {/* Status badge */}
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded border shrink-0 ${badge.className}`}
                  >
                    {badge.icon}
                    {badge.label}
                  </span>
                </button>

                {/* Breakdown */}
                {isExpanded && (
                  <div className="bg-gray-50/70 border-t border-gray-100">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-400">
                          <th className="text-left font-normal py-2 pl-14 pr-3">Type</th>
                          <th className="text-center font-normal py-2 px-2 w-16">Required</th>
                          <th className="text-center font-normal py-2 px-2 w-16">Approved</th>
                          <th className="text-center font-normal py-2 px-2 w-16">Pending</th>
                          <th className="text-center font-normal py-2 px-2 pr-5 w-16">Missing</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {phase.breakdown.map((row) => {
                          const typeConfig = EVIDENCE_TYPE_CONFIG[row.type as EvidenceType];
                          return (
                            <tr key={row.type} className="hover:bg-gray-100/50">
                              <td className="py-2 pl-14 pr-3">
                                <span
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium"
                                  style={{
                                    color: typeConfig?.color || '#666',
                                    backgroundColor: typeConfig?.bgColor || '#f5f5f5',
                                  }}
                                >
                                  {row.typeName}
                                </span>
                              </td>
                              <td className="text-center py-2 px-2 text-gray-600">{row.required}</td>
                              <td className="text-center py-2 px-2 text-green-600 font-medium">
                                {row.approved}
                              </td>
                              <td className="text-center py-2 px-2 text-amber-600">
                                {row.pending > 0 ? row.pending : '-'}
                              </td>
                              <td className="text-center py-2 px-2 pr-5">
                                {row.missing > 0 ? (
                                  <span className="text-red-600 font-medium">{row.missing}</span>
                                ) : (
                                  <span className="text-gray-300">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
