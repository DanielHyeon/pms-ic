import { useState } from 'react';
import {
  X,
  Scale,
  Shield,
  AlertTriangle,
  ArrowUpRight,
  Clock,
  CheckCircle,
  XCircle,
  Pause,
  User,
  FileText,
  Link,
  Grid3X3,
  History,
  ThumbsUp,
  ArrowDown,
} from 'lucide-react';
import type { ViewModePreset } from '../../../types/menuOntology';
import type {
  DecisionItem,
  RiskItem,
  DecisionRiskPanelMode,
  DecisionStatus,
  RiskSeverity,
  AuditTrailEntry,
  EscalationChainNode,
} from './types';
import { getSeverityFromScore } from './types';

// ── Props ──────────────────────────────────────────────────

export interface DecisionRiskRightPanelProps {
  mode: DecisionRiskPanelMode;
  decision?: DecisionItem;
  risk?: RiskItem;
  preset: ViewModePreset;
  onClose: () => void;
  onModeChange: (mode: DecisionRiskPanelMode) => void;
  canEdit: boolean;
}

// ── Status styling ─────────────────────────────────────────

const DECISION_STATUS_BADGE: Record<DecisionStatus, string> = {
  PROPOSED: 'bg-blue-100 text-blue-700',
  UNDER_REVIEW: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  DEFERRED: 'bg-gray-100 text-gray-700',
};

const DECISION_STATUS_LABELS: Record<DecisionStatus, string> = {
  PROPOSED: 'Proposed',
  UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  DEFERRED: 'Deferred',
};

const RISK_STATUS_BADGE: Record<string, string> = {
  IDENTIFIED: 'bg-blue-100 text-blue-700',
  ASSESSED: 'bg-amber-100 text-amber-700',
  MITIGATING: 'bg-orange-100 text-orange-700',
  RESOLVED: 'bg-green-100 text-green-700',
  ACCEPTED: 'bg-gray-100 text-gray-700',
};

const RISK_STATUS_LABELS: Record<string, string> = {
  IDENTIFIED: 'Identified',
  ASSESSED: 'Assessed',
  MITIGATING: 'Mitigating',
  RESOLVED: 'Resolved',
  ACCEPTED: 'Accepted',
};

const SEVERITY_BADGE: Record<RiskSeverity, string> = {
  critical: 'bg-red-100 text-red-700 border-red-300',
  high: 'bg-orange-100 text-orange-700 border-orange-300',
  medium: 'bg-amber-100 text-amber-700 border-amber-300',
  low: 'bg-green-100 text-green-700 border-green-300',
};

// ── Sub-panels ─────────────────────────────────────────────

function DecisionDetailPanel({
  decision,
  canEdit,
}: {
  decision: DecisionItem;
  canEdit: boolean;
}) {
  return (
    <div className="space-y-5">
      {/* Title and badges */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{decision.title}</h3>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="text-xs font-mono text-gray-500">{decision.code}</span>
          <span
            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
              DECISION_STATUS_BADGE[decision.status]
            }`}
          >
            {DECISION_STATUS_LABELS[decision.status]}
          </span>
        </div>
      </div>

      {/* Owner and dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            <User size={12} />
            Owner
          </p>
          <p className="text-sm text-gray-700">{decision.owner}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            <Clock size={12} />
            Proposed
          </p>
          <p className="text-sm text-gray-700">
            {new Date(decision.proposedDate).toLocaleDateString()}
          </p>
        </div>
      </div>

      {decision.resolvedDate && (
        <div>
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            <CheckCircle size={12} />
            Resolved
          </p>
          <p className="text-sm text-gray-700">
            {new Date(decision.resolvedDate).toLocaleDateString()}
          </p>
        </div>
      )}

      {/* Description */}
      {decision.description && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Description</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {decision.description}
          </p>
        </div>
      )}

      {/* Options considered */}
      {decision.options && decision.options.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2">Options Considered</p>
          <ul className="space-y-1.5">
            {decision.options.map((opt, idx) => (
              <li
                key={idx}
                className={`text-sm px-3 py-2 rounded-lg ${
                  opt === decision.selectedOption
                    ? 'bg-green-50 text-green-800 border border-green-200 font-medium'
                    : 'bg-gray-50 text-gray-700'
                }`}
              >
                {opt === decision.selectedOption && (
                  <span className="text-[10px] text-green-600 block mb-0.5">
                    Selected
                  </span>
                )}
                {opt}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Rationale */}
      {decision.rationale && (
        <div>
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            <FileText size={12} />
            Rationale
          </p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap bg-blue-50 rounded-lg p-3">
            {decision.rationale}
          </p>
        </div>
      )}

      {/* Escalation source */}
      {decision.escalationSourceId && (
        <div>
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            <ArrowUpRight size={12} />
            Escalation Source
          </p>
          <div className="bg-purple-50 rounded-lg p-3 text-sm text-purple-700">
            Escalated from {decision.escalationSourceType || 'issue'}:{' '}
            <span className="font-mono">{decision.escalationSourceId}</span>
          </div>
        </div>
      )}

      {/* Quick actions */}
      {canEdit && decision.status !== 'APPROVED' && decision.status !== 'REJECTED' && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
          <button className="px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors">
            Approve
          </button>
          <button className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors">
            Reject
          </button>
          <button className="px-3 py-1.5 text-xs font-medium bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
            Defer
          </button>
        </div>
      )}
    </div>
  );
}

function RiskDetailPanel({
  risk,
  canEdit,
}: {
  risk: RiskItem;
  canEdit: boolean;
}) {
  return (
    <div className="space-y-5">
      {/* Title and badges */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{risk.title}</h3>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className="text-xs font-mono text-gray-500">{risk.code}</span>
          <span
            className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${
              SEVERITY_BADGE[risk.severity]
            }`}
          >
            {risk.severity.charAt(0).toUpperCase() + risk.severity.slice(1)}
          </span>
          <span
            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
              RISK_STATUS_BADGE[risk.status]
            }`}
          >
            {RISK_STATUS_LABELS[risk.status]}
          </span>
        </div>
      </div>

      {/* Impact x Probability score display */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Impact</p>
            <p className="text-2xl font-bold text-gray-800">{risk.impact}</p>
          </div>
          <span className="text-lg text-gray-400 font-light">x</span>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Probability</p>
            <p className="text-2xl font-bold text-gray-800">{risk.probability}</p>
          </div>
          <span className="text-lg text-gray-400 font-light">=</span>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Score</p>
            <p
              className={`text-2xl font-bold ${
                risk.severity === 'critical'
                  ? 'text-red-600'
                  : risk.severity === 'high'
                  ? 'text-orange-600'
                  : risk.severity === 'medium'
                  ? 'text-amber-600'
                  : 'text-green-600'
              }`}
            >
              {risk.score}
            </p>
          </div>
        </div>
      </div>

      {/* Owner and date */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            <User size={12} />
            Owner
          </p>
          <p className="text-sm text-gray-700">{risk.owner}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            <Clock size={12} />
            Identified
          </p>
          <p className="text-sm text-gray-700">
            {new Date(risk.identifiedDate).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Description */}
      {risk.description && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Description</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {risk.description}
          </p>
        </div>
      )}

      {/* Mitigation plan */}
      {risk.mitigationPlan && (
        <div>
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            <Shield size={12} />
            Mitigation Plan
          </p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap bg-orange-50 rounded-lg p-3">
            {risk.mitigationPlan}
          </p>
        </div>
      )}

      {/* Linked issues */}
      {risk.linkedIssueIds && risk.linkedIssueIds.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
            <Link size={12} />
            Linked Issues
          </p>
          <div className="flex flex-wrap gap-1.5">
            {risk.linkedIssueIds.map((issueId) => (
              <span
                key={issueId}
                className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded"
              >
                {issueId}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      {canEdit && risk.status !== 'RESOLVED' && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
          <button className="px-3 py-1.5 text-xs font-medium bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors">
            Update Assessment
          </button>
          <button className="px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors">
            Mark Resolved
          </button>
          <button className="px-3 py-1.5 text-xs font-medium bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors">
            Escalate to Decision
          </button>
        </div>
      )}
    </div>
  );
}

function RiskAssessmentPanel({ risk }: { risk: RiskItem }) {
  const [selectedImpact, setSelectedImpact] = useState(risk.impact);
  const [selectedProbability, setSelectedProbability] = useState(risk.probability);

  const newScore = selectedImpact * selectedProbability;
  const newSeverity = getSeverityFromScore(newScore);

  const impactRows = [5, 4, 3, 2, 1];
  const probabilityCols = [1, 2, 3, 4, 5];

  const handleSave = () => {
    // TODO: Wire to real API
    console.log('Assessment updated:', {
      riskId: risk.id,
      impact: selectedImpact,
      probability: selectedProbability,
      score: newScore,
      severity: newSeverity,
    });
  };

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <Grid3X3 size={16} className="text-orange-600" />
        Risk Assessment
      </h3>

      {/* Source risk */}
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs text-gray-500 mb-1">Assessing Risk</p>
        <p className="text-sm text-gray-800 font-medium">{risk.title}</p>
      </div>

      {/* Mini 5x5 grid for assessment */}
      <div className="space-y-1">
        <p className="text-xs text-gray-500 mb-2">
          Click a cell to set Impact x Probability
        </p>
        <div className="flex">
          <div className="w-6 flex flex-col items-center justify-center mr-1">
            <span
              className="text-[9px] text-gray-400"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              Impact
            </span>
          </div>
          <div className="flex-1">
            {impactRows.map((impact) => (
              <div key={impact} className="flex">
                <div className="w-5 flex items-center justify-center shrink-0">
                  <span className="text-[9px] text-gray-400">{impact}</span>
                </div>
                {probabilityCols.map((prob) => {
                  const cellScore = impact * prob;
                  const cellSev = getSeverityFromScore(cellScore);
                  const isSelected =
                    impact === selectedImpact && prob === selectedProbability;
                  const isOriginal =
                    impact === risk.impact && prob === risk.probability;

                  const cellColors: Record<RiskSeverity, string> = {
                    critical: 'bg-red-100',
                    high: 'bg-orange-100',
                    medium: 'bg-amber-100',
                    low: 'bg-green-100',
                  };

                  return (
                    <button
                      key={`${impact}-${prob}`}
                      onClick={() => {
                        setSelectedImpact(impact);
                        setSelectedProbability(prob);
                      }}
                      className={`flex-1 h-8 m-0.5 rounded text-[9px] font-medium transition-all ${
                        isSelected
                          ? 'ring-2 ring-blue-500 bg-blue-100 text-blue-800'
                          : isOriginal
                          ? 'ring-1 ring-gray-400 ' + cellColors[cellSev]
                          : cellColors[cellSev] + ' hover:opacity-70'
                      }`}
                      title={`Impact: ${impact}, Probability: ${prob}, Score: ${cellScore}`}
                    >
                      {cellScore}
                    </button>
                  );
                })}
              </div>
            ))}
            <div className="flex mt-0.5">
              <div className="w-5" />
              {probabilityCols.map((prob) => (
                <div key={prob} className="flex-1 text-center text-[9px] text-gray-400">
                  {prob}
                </div>
              ))}
            </div>
            <div className="text-center mt-0.5">
              <span className="text-[9px] text-gray-400">Probability</span>
            </div>
          </div>
        </div>
      </div>

      {/* Assessment result */}
      <div className="bg-gray-50 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">New Score</span>
          <span className="text-lg font-bold text-gray-800">{newScore}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Severity</span>
          <span
            className={`px-2 py-0.5 rounded text-xs font-medium border ${
              SEVERITY_BADGE[newSeverity]
            }`}
          >
            {newSeverity.charAt(0).toUpperCase() + newSeverity.slice(1)}
          </span>
        </div>
        {(selectedImpact !== risk.impact ||
          selectedProbability !== risk.probability) && (
          <p className="text-[10px] text-amber-600">
            Changed from {risk.impact}x{risk.probability}={risk.score} to{' '}
            {selectedImpact}x{selectedProbability}={newScore}
          </p>
        )}
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={
          selectedImpact === risk.impact &&
          selectedProbability === risk.probability
        }
        className="w-full px-4 py-2 text-sm font-medium bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Update Assessment
      </button>
    </div>
  );
}

function EscalationChainPanel({
  decision,
  risk,
}: {
  decision?: DecisionItem;
  risk?: RiskItem;
}) {
  // TODO: Replace with real API data
  const mockChain: EscalationChainNode[] = [];

  // Build chain based on available data
  if (decision?.escalationSourceId) {
    mockChain.push({
      type: 'issue',
      id: decision.escalationSourceId,
      title: 'Related issue requiring decision',
      status: 'IN_PROGRESS',
    });
  }

  if (risk) {
    mockChain.push({
      type: 'risk',
      id: risk.id,
      title: risk.title,
      status: risk.status,
    });
  }

  if (decision) {
    mockChain.push({
      type: 'decision',
      id: decision.id,
      title: decision.title,
      status: decision.status,
    });
  }

  // If no chain data at all, show mock
  if (mockChain.length === 0) {
    mockChain.push(
      { type: 'issue', id: 'ISS-042', title: 'Performance degradation in production', status: 'OPEN' },
      { type: 'risk', id: 'RSK-015', title: 'System scalability risk', status: 'ASSESSED' },
      { type: 'decision', id: 'DEC-008', title: 'Infrastructure upgrade decision', status: 'PROPOSED' }
    );
  }

  const nodeColors: Record<string, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
    issue: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      icon: <AlertTriangle size={14} className="text-red-600" />,
    },
    risk: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-700',
      icon: <Shield size={14} className="text-orange-600" />,
    },
    decision: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      icon: <Scale size={14} className="text-blue-600" />,
    },
  };

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <ArrowUpRight size={16} className="text-purple-600" />
        Escalation Chain
      </h3>

      <p className="text-xs text-gray-500">
        Traces the escalation path from issue through risk to decision.
      </p>

      {/* Vertical chain visualization */}
      <div className="space-y-0">
        {mockChain.map((node, idx) => {
          const colors = nodeColors[node.type];
          return (
            <div key={node.id}>
              {/* Node */}
              <div
                className={`${colors.bg} border ${colors.border} rounded-lg p-3`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {colors.icon}
                  <span className={`text-xs font-medium uppercase ${colors.text}`}>
                    {node.type}
                  </span>
                  <span className="text-xs font-mono text-gray-500 ml-auto">
                    {node.id}
                  </span>
                </div>
                <p className="text-sm text-gray-800">{node.title}</p>
                <span className="text-[10px] text-gray-500 mt-1 block">
                  Status: {node.status}
                </span>
              </div>

              {/* Arrow connector */}
              {idx < mockChain.length - 1 && (
                <div className="flex justify-center py-1">
                  <ArrowDown size={16} className="text-gray-300" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AuditTrailPanel({
  decision,
  risk,
}: {
  decision?: DecisionItem;
  risk?: RiskItem;
}) {
  // TODO: Replace with real API data
  const mockTrail: AuditTrailEntry[] = decision
    ? [
        {
          id: '1',
          actor: decision.owner,
          timestamp: decision.proposedDate,
          action: 'Decision proposed',
          toStatus: 'PROPOSED',
        },
        {
          id: '2',
          actor: 'PMO Lead',
          timestamp: '2026-01-20T10:00:00',
          action: 'Moved to review',
          fromStatus: 'PROPOSED',
          toStatus: 'UNDER_REVIEW',
        },
        ...(decision.resolvedDate
          ? [
              {
                id: '3',
                actor: 'Sponsor',
                timestamp: decision.resolvedDate,
                action: `Decision ${decision.status.toLowerCase()}`,
                fromStatus: 'UNDER_REVIEW',
                toStatus: decision.status,
              },
            ]
          : []),
      ]
    : risk
    ? [
        {
          id: '1',
          actor: risk.owner,
          timestamp: risk.identifiedDate,
          action: 'Risk identified',
          toStatus: 'IDENTIFIED',
        },
        {
          id: '2',
          actor: risk.owner,
          timestamp: '2026-01-18T14:00:00',
          action: `Risk assessed (Score: ${risk.score})`,
          fromStatus: 'IDENTIFIED',
          toStatus: 'ASSESSED',
        },
      ]
    : [];

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <History size={16} className="text-indigo-600" />
        Audit Trail
      </h3>

      {mockTrail.length === 0 ? (
        <div className="flex items-center justify-center h-20 text-sm text-gray-400">
          No audit trail available
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-3 top-2 bottom-2 w-px bg-gray-200" />

          {/* Timeline entries */}
          <div className="space-y-4">
            {mockTrail.map((entry) => (
              <div key={entry.id} className="relative pl-8">
                {/* Timeline dot */}
                <div className="absolute left-1.5 top-1.5 w-3 h-3 rounded-full bg-indigo-400 border-2 border-white shadow-sm" />

                {/* Entry content */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700">
                      {entry.actor}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{entry.action}</p>
                  {entry.fromStatus && entry.toStatus && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">
                        {entry.fromStatus}
                      </span>
                      <span className="text-gray-400 text-[10px]">-&gt;</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                        {entry.toStatus}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ApprovalPanel({ decision }: { decision: DecisionItem }) {
  const [action, setAction] = useState<'approve' | 'reject' | 'defer'>('approve');
  const [rationale, setRationale] = useState('');
  const [comment, setComment] = useState('');

  const handleSubmit = () => {
    // TODO: Wire to real API
    console.log('Approval submitted:', {
      decisionId: decision.id,
      action,
      rationale,
      comment,
    });
  };

  const actionConfig = {
    approve: {
      label: 'Approve',
      icon: <CheckCircle size={14} />,
      buttonClass: 'bg-green-600 hover:bg-green-700',
      activeClass: 'border-green-400 bg-green-50 text-green-700',
    },
    reject: {
      label: 'Reject',
      icon: <XCircle size={14} />,
      buttonClass: 'bg-red-600 hover:bg-red-700',
      activeClass: 'border-red-400 bg-red-50 text-red-700',
    },
    defer: {
      label: 'Defer',
      icon: <Pause size={14} />,
      buttonClass: 'bg-gray-600 hover:bg-gray-700',
      activeClass: 'border-gray-400 bg-gray-50 text-gray-700',
    },
  };

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <ThumbsUp size={16} className="text-green-600" />
        Decision Approval
      </h3>

      {/* Decision reference */}
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs text-gray-500 mb-1">Decision</p>
        <p className="text-sm text-gray-800 font-medium">{decision.title}</p>
        <p className="text-xs text-gray-500 mt-1">
          Status:{' '}
          <span
            className={`px-1.5 py-0.5 rounded ${
              DECISION_STATUS_BADGE[decision.status]
            }`}
          >
            {DECISION_STATUS_LABELS[decision.status]}
          </span>
        </p>
      </div>

      {/* Action selection */}
      <div>
        <label className="text-xs text-gray-600 block mb-1.5">Action</label>
        <div className="flex gap-2">
          {(Object.keys(actionConfig) as Array<'approve' | 'reject' | 'defer'>).map(
            (act) => {
              const config = actionConfig[act];
              return (
                <button
                  key={act}
                  onClick={() => setAction(act)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-all ${
                    action === act
                      ? config.activeClass + ' font-medium'
                      : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {config.icon}
                  {config.label}
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* Rationale */}
      <div>
        <label className="text-xs text-gray-600 block mb-1.5">
          Rationale <span className="text-red-500">*</span>
        </label>
        <textarea
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          rows={3}
          placeholder="Provide the rationale for this action..."
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Comment */}
      <div>
        <label className="text-xs text-gray-600 block mb-1.5">
          Additional Comment
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          placeholder="Optional comment..."
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!rationale.trim()}
        className={`w-full px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${actionConfig[action].buttonClass}`}
      >
        {actionConfig[action].label} Decision
      </button>
    </div>
  );
}

// ── Main Panel Component ───────────────────────────────────

export function DecisionRiskRightPanel({
  mode,
  decision,
  risk,
  preset: _preset,
  onClose,
  onModeChange,
  canEdit,
}: DecisionRiskRightPanelProps) {
  if (mode === 'none') return null;

  // Determine available tabs based on whether we have a decision or risk
  const tabs: { mode: DecisionRiskPanelMode; label: string; icon: React.ReactNode }[] = [];

  if (decision) {
    tabs.push(
      { mode: 'decision-detail', label: 'Detail', icon: <Scale size={14} /> },
      { mode: 'approval', label: 'Approval', icon: <ThumbsUp size={14} /> }
    );
  }

  if (risk) {
    tabs.push(
      { mode: 'risk-detail', label: 'Detail', icon: <Shield size={14} /> },
      { mode: 'risk-assessment', label: 'Assess', icon: <Grid3X3 size={14} /> }
    );
  }

  // Common tabs always available
  tabs.push(
    { mode: 'escalation-chain', label: 'Escalation', icon: <ArrowUpRight size={14} /> },
    { mode: 'audit-trail', label: 'Audit', icon: <History size={14} /> }
  );

  const renderContent = () => {
    if (!decision && !risk) {
      return (
        <div className="flex items-center justify-center h-32 text-sm text-gray-400">
          No item selected
        </div>
      );
    }

    switch (mode) {
      case 'decision-detail':
        return decision ? (
          <DecisionDetailPanel decision={decision} canEdit={canEdit} />
        ) : (
          <div className="text-sm text-gray-400 text-center py-8">
            No decision selected
          </div>
        );
      case 'risk-detail':
        return risk ? (
          <RiskDetailPanel risk={risk} canEdit={canEdit} />
        ) : (
          <div className="text-sm text-gray-400 text-center py-8">
            No risk selected
          </div>
        );
      case 'risk-assessment':
        return risk ? (
          <RiskAssessmentPanel risk={risk} />
        ) : (
          <div className="text-sm text-gray-400 text-center py-8">
            No risk selected
          </div>
        );
      case 'escalation-chain':
        return <EscalationChainPanel decision={decision} risk={risk} />;
      case 'audit-trail':
        return <AuditTrailPanel decision={decision} risk={risk} />;
      case 'approval':
        return decision ? (
          <ApprovalPanel decision={decision} />
        ) : (
          <div className="text-sm text-gray-400 text-center py-8">
            No decision selected
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-[400px] border border-gray-200 bg-white rounded-xl shadow-sm flex flex-col h-full shrink-0">
      {/* Panel header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-700">
          {decision ? 'Decision Details' : risk ? 'Risk Details' : 'Details'}
        </h2>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          aria-label="Close panel"
        >
          <X size={16} />
        </button>
      </div>

      {/* Tab navigation */}
      <div className="flex border-b border-gray-200 px-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.mode}
            onClick={() => onModeChange(tab.mode)}
            className={`flex items-center gap-1 px-2.5 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              mode === tab.mode
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">{renderContent()}</div>
    </div>
  );
}
