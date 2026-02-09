/**
 * Consolidated status, priority, and severity label/color maps.
 * Single source of truth -- do NOT duplicate these in component files.
 */

// ── Decision status ────────────────────────────────────────

export type DecisionStatus =
  | 'PROPOSED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'DEFERRED';

export const DECISION_STATUS_LABELS: Record<DecisionStatus, string> = {
  PROPOSED: '제안됨',
  UNDER_REVIEW: '검토 중',
  APPROVED: '승인됨',
  REJECTED: '반려',
  DEFERRED: '보류',
};

export const DECISION_STATUS_COLORS: Record<DecisionStatus, string> = {
  PROPOSED: 'bg-blue-100 text-blue-800',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  DEFERRED: 'bg-gray-100 text-gray-600',
};

// ── Risk status ────────────────────────────────────────────

export type RiskStatus =
  | 'IDENTIFIED'
  | 'ASSESSED'
  | 'MITIGATING'
  | 'RESOLVED'
  | 'ACCEPTED';

export const RISK_STATUS_LABELS: Record<RiskStatus, string> = {
  IDENTIFIED: '식별됨',
  ASSESSED: '평가됨',
  MITIGATING: '대응 중',
  RESOLVED: '해결됨',
  ACCEPTED: '수용됨',
};

export const RISK_STATUS_COLORS: Record<RiskStatus, string> = {
  IDENTIFIED: 'bg-red-100 text-red-800',
  ASSESSED: 'bg-yellow-100 text-yellow-800',
  MITIGATING: 'bg-blue-100 text-blue-800',
  RESOLVED: 'bg-green-100 text-green-800',
  ACCEPTED: 'bg-gray-100 text-gray-600',
};

// ── Priority (uppercase enum style) ────────────────────────

export type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export const PRIORITY_LABELS: Record<Priority, string> = {
  CRITICAL: '긴급',
  HIGH: '높음',
  MEDIUM: '중간',
  LOW: '낮음',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  CRITICAL: 'bg-red-100 text-red-800 border-red-300',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-300',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  LOW: 'bg-green-100 text-green-800 border-green-300',
};

// ── Severity (for issues, risks) ───────────────────────────

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export const SEVERITY_COLORS: Record<Severity, string> = {
  CRITICAL: 'bg-red-100 text-red-800',
  HIGH: 'bg-orange-100 text-orange-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  LOW: 'bg-blue-100 text-blue-800',
  INFO: 'bg-gray-100 text-gray-600',
};

// Issue severity display labels (lowercase) used by MyWork issue tables
export const ISSUE_SEVERITY_COLORS: Record<string, string> = {
  blocker: 'bg-red-100 text-red-700',
  critical: 'bg-orange-100 text-orange-700',
  major: 'bg-yellow-100 text-yellow-700',
  minor: 'bg-gray-100 text-gray-600',
};

// ── Generic workflow status ────────────────────────────────

export const WORKFLOW_STATUS_COLORS: Record<string, string> = {
  // Common lifecycle statuses
  SCHEDULED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
  POSTPONED: 'bg-orange-100 text-orange-800',
  // Issue statuses
  OPEN: 'bg-red-100 text-red-800',
  RESOLVED: 'bg-green-100 text-green-800',
  VERIFIED: 'bg-emerald-100 text-emerald-800',
  CLOSED: 'bg-gray-100 text-gray-800',
  REOPENED: 'bg-purple-100 text-purple-800',
  DEFERRED: 'bg-slate-100 text-slate-800',
  // Deliverable statuses
  DRAFT: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  IN_REVIEW: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  LOCKED: 'bg-emerald-100 text-emerald-800',
  REJECTED: 'bg-red-100 text-red-700',
  PENDING: 'bg-gray-100 text-gray-600',
  // Sprint statuses
  PLANNING: 'bg-blue-100 text-blue-700',
  ACTIVE: 'bg-green-100 text-green-700',
  // Task statuses
  TODO: 'bg-gray-100 text-gray-700',
  DONE: 'bg-green-100 text-green-700',
  BLOCKED: 'bg-red-100 text-red-700',
};

export const WORKFLOW_STATUS_LABELS: Record<string, string> = {
  SCHEDULED: '예정',
  IN_PROGRESS: '진행 중',
  COMPLETED: '완료',
  CANCELLED: '취소',
  POSTPONED: '연기',
  OPEN: '열림',
  RESOLVED: '해결됨',
  VERIFIED: '검증됨',
  CLOSED: '종료',
  REOPENED: '재오픈',
  DEFERRED: '보류',
  DRAFT: '초안',
  SUBMITTED: '제출됨',
  IN_REVIEW: '검토중',
  APPROVED: '승인됨',
  LOCKED: '확정',
  REJECTED: '반려',
  PENDING: '대기',
  PLANNING: '계획 중',
  ACTIVE: '활성',
  TODO: '할 일',
  DONE: '완료',
  BLOCKED: '차단됨',
};

// ── Lookup helpers ─────────────────────────────────────────

export function getWorkflowStatusColor(status: string): string {
  return WORKFLOW_STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
}

export function getWorkflowStatusLabel(status: string): string {
  return WORKFLOW_STATUS_LABELS[status] || status;
}

export function getPriorityColor(priority: string): string {
  const upper = priority.toUpperCase() as Priority;
  return PRIORITY_COLORS[upper] || 'bg-gray-100 text-gray-800';
}

export function getPriorityLabel(priority: string): string {
  const upper = priority.toUpperCase() as Priority;
  return PRIORITY_LABELS[upper] || priority;
}

export function getSeverityColor(severity: string): string {
  return SEVERITY_COLORS[severity as Severity] || 'bg-gray-100 text-gray-600';
}
