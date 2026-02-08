/**
 * v2.0 Requirement types extending the base Requirement from project.ts.
 * Adds Trace Chain, ChangeRequest workflow, and preset-driven stats.
 */

// ─── Value Types ────────────────────────────────────────────

export type TraceStatusValue = 'linked' | 'unlinked' | 'breakpoint';
export type AcceptanceValue = 'Y' | 'X' | 'pending';
export type ChangeTypeValue = 'new' | 'modified' | 'maintained';
export type RequirementPanelMode = 'none' | 'preview' | 'trace' | 'approval' | 'detail';

// ─── RequirementV2 ──────────────────────────────────────────

export interface RequirementV2 {
  id: string;
  code: string;
  rfpId?: string;
  projectId: string;
  title: string;
  description?: string;

  // v2.0 classification
  category: string;    // FUNCTIONAL, NON_FUNCTIONAL, etc.
  aiSiType: string;    // AI, SI, COMMON, NON_FUNCTIONAL
  priority: string;
  status: string;

  // RFP title hierarchy (may be null for non-RFP requirements)
  rfpTitleMajor?: string;
  rfpTitleMedium?: string;
  rfpTitleMinor?: string;

  // Acceptance
  acceptanceCriteria?: string;
  sourceText?: string;

  // Trace
  traceStatus: TraceStatusValue;
  traceCoverage: number;
  linkedTaskIds: string[];

  // Effort
  estimatedEffort?: number;
  actualEffort?: number;

  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Trace Chain ────────────────────────────────────────────

export interface TraceChainNode {
  id: string;
  title: string;
  status: string;
  type: 'epic' | 'story' | 'task' | 'test_case' | 'deliverable';
  children?: TraceChainNode[];
  result?: string; // for test cases: pass/fail/pending
}

export interface RequirementTrace {
  requirementId: string;
  epics: { id: string; title: string; status: string; storyCount: number }[];
  stories: { id: string; title: string; status: string; epicId: string }[];
  testCases: { id: string; name: string; result: string }[];
  deliverables: { id: string; name: string; status: string }[];
  traceStatus: TraceStatusValue;
  traceCoverage: number;
  breakpoints?: { from: string; expectedNext: string; description: string }[];
}

// ─── Change Request ─────────────────────────────────────────

export interface RequirementChangeRequest {
  id: string;
  projectId: string;
  requirementId: string;
  title: string;
  description: string;
  changeType: string;   // MODIFICATION, ADDITION, DELETION
  priority: string;
  status: string;       // DRAFT, PENDING, UNDER_REVIEW, APPROVED, REJECTED, APPLIED
  impactAnalysis?: string;
  requestedBy: string;
  requestedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
}

// ─── Stats ──────────────────────────────────────────────────

export interface RequirementStats {
  total: number;
  functional: number;
  nonFunctional: number;
  acceptanceY: number;
  acceptanceX: number;
  acceptancePending: number;
  traceCoverage: number;
  unlinkedCount: number;
  breakpointCount: number;
  changeRequestPending: number;
}
