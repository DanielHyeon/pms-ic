// ── Decision types ─────────────────────────────────────────

export type DecisionStatus =
  | 'PROPOSED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'DEFERRED';

export interface DecisionItem {
  id: string;
  code: string;
  title: string;
  description?: string;
  status: DecisionStatus;
  owner: string;
  proposedDate: string;
  resolvedDate?: string;
  options?: string[];
  selectedOption?: string;
  rationale?: string;
  escalationSourceId?: string;
  escalationSourceType?: 'issue' | 'risk';
  phaseId?: string;
}

// ── Risk types ─────────────────────────────────────────────

export type RiskStatus =
  | 'IDENTIFIED'
  | 'ASSESSED'
  | 'MITIGATING'
  | 'RESOLVED'
  | 'ACCEPTED';

export type RiskSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface RiskItem {
  id: string;
  code: string;
  title: string;
  description?: string;
  status: RiskStatus;
  severity: RiskSeverity;
  impact: number;       // 1-5
  probability: number;  // 1-5
  score: number;         // impact * probability
  owner: string;
  identifiedDate: string;
  mitigationPlan?: string;
  linkedIssueIds?: string[];
  phaseId?: string;
}

// ── Unified item type for combined list ────────────────────

export type DecisionRiskItemType = 'decision' | 'risk';

export interface DecisionRiskUnifiedItem {
  id: string;
  code: string;
  title: string;
  type: DecisionRiskItemType;
  status: string;
  owner: string;
  severity?: RiskSeverity;
  score?: number;
  date: string;
}

// ── Panel mode ─────────────────────────────────────────────

export type DecisionRiskPanelMode =
  | 'none'
  | 'decision-detail'
  | 'risk-detail'
  | 'risk-assessment'
  | 'escalation-chain'
  | 'audit-trail'
  | 'approval';

// ── View tab ───────────────────────────────────────────────

export type DecisionRiskViewTab = 'all' | 'kanban' | 'matrix';

// ── Audit trail entry ──────────────────────────────────────

export interface AuditTrailEntry {
  id: string;
  actor: string;
  timestamp: string;
  action: string;
  fromStatus?: string;
  toStatus?: string;
}

// ── Escalation chain node ──────────────────────────────────

export interface EscalationChainNode {
  type: 'issue' | 'risk' | 'decision';
  id: string;
  title: string;
  status: string;
}

// ── Severity helpers ───────────────────────────────────────

export function getSeverityFromScore(score: number): RiskSeverity {
  if (score >= 17) return 'critical';
  if (score >= 10) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}
