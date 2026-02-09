// RFP domain types — v2.2 design spec (12-status state machine + Origin model)

// ─── Enums & Literal Types ────────────────────────────────────

export type RfpStatus =
  | 'EMPTY'
  | 'ORIGIN_DEFINED'
  | 'UPLOADED'
  | 'PARSING'
  | 'PARSED'
  | 'EXTRACTING'
  | 'EXTRACTED'
  | 'REVIEWING'
  | 'CONFIRMED'
  | 'NEEDS_REANALYSIS'
  | 'ON_HOLD'
  | 'FAILED';

export type OriginType =
  | 'EXTERNAL_RFP'
  | 'INTERNAL_INITIATIVE'
  | 'MODERNIZATION'
  | 'MIXED';

export type ChangeImpactLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
export type EvidenceLevel = 'FULL' | 'PARTIAL';
export type LineageEnforcement = 'STRICT' | 'RELAXED';
export type CandidateReviewStatus = 'PROPOSED' | 'ACCEPTED' | 'MODIFIED' | 'REJECTED';
export type CandidateCategory = 'FUNCTIONAL' | 'NON_FUNCTIONAL' | 'CONSTRAINT';
export type RfpPanelMode = 'overview' | 'extraction_runs' | 'derived_requirements' | 'impact' | 'evidence';

// ─── Origin Policy (Section 5.2) ──────────────────────────────

export interface OriginPolicy {
  originType: OriginType;
  requireSourceRfpId: boolean;
  evidenceLevel: EvidenceLevel;
  changeApprovalRequired: boolean;
  autoAnalysisEnabled: boolean;
  lineageEnforcement: LineageEnforcement;
}

export const ORIGIN_POLICY_MAP: Record<OriginType, OriginPolicy> = {
  EXTERNAL_RFP: {
    originType: 'EXTERNAL_RFP',
    requireSourceRfpId: true,
    evidenceLevel: 'FULL',
    changeApprovalRequired: true,
    autoAnalysisEnabled: true,
    lineageEnforcement: 'STRICT',
  },
  INTERNAL_INITIATIVE: {
    originType: 'INTERNAL_INITIATIVE',
    requireSourceRfpId: false,
    evidenceLevel: 'PARTIAL',
    changeApprovalRequired: false,
    autoAnalysisEnabled: false,
    lineageEnforcement: 'RELAXED',
  },
  MODERNIZATION: {
    originType: 'MODERNIZATION',
    requireSourceRfpId: true,
    evidenceLevel: 'FULL',
    changeApprovalRequired: true,
    autoAnalysisEnabled: true,
    lineageEnforcement: 'STRICT',
  },
  MIXED: {
    originType: 'MIXED',
    requireSourceRfpId: false,
    evidenceLevel: 'FULL',
    changeApprovalRequired: true,
    autoAnalysisEnabled: true,
    lineageEnforcement: 'STRICT',
  },
};

// ─── Origin Summary (Section 8.6) ─────────────────────────────

export interface OriginSummary {
  originType: OriginType;
  originTypeLabel: string;
  policy: OriginPolicy;
  kpi: {
    activeRfpCount: number;
    totalRequirements: number;
    confirmedRequirements: number;
    epicLinkRate: number;
    lastChangeImpact: {
      level: ChangeImpactLevel;
      impactedEpics: number;
      impactedTasks: number;
    };
  };
  asOf: string;
}

// ─── RFP Detail (Section 8.7) ─────────────────────────────────

export interface RfpVersion {
  id: string;
  versionLabel: string;
  fileName: string;
  fileSize: number;
  checksum: string;
  uploadedBy: { id: string; name: string };
  uploadedAt: string;
}

export interface ExtractionRunSummary {
  id: string;
  modelName: string;
  modelVersion: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  startedAt: string;
  finishedAt?: string;
  stats?: {
    totalCandidates: number;
    ambiguityCount: number;
    avgConfidence: number;
  };
}

export interface RfpDetail {
  id: string;
  projectId: string;
  title: string;
  originType: OriginType;
  status: RfpStatus;
  statusLabel: string;
  previousStatus?: RfpStatus;
  failureReason?: string;
  content?: string;
  currentVersion?: RfpVersion;
  versionCount: number;
  kpi: {
    derivedRequirements: number;
    confirmedRequirements: number;
    epicLinkRate: number;
    changeImpact: {
      level: ChangeImpactLevel;
      impactedEpics: number;
      impactedTasks: number;
    };
  };
  latestRun?: ExtractionRunSummary;
  createdBy: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

// ─── Extraction Run (Section 8.8) ─────────────────────────────

export interface ExtractionRun {
  id: string;
  rfpVersionId: string;
  modelName: string;
  modelVersion: string;
  promptVersion: string;
  schemaVersion: string;
  generationParams: { temperature: number; top_p: number };
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  isActive: boolean;
  startedAt: string;
  finishedAt?: string;
  stats?: {
    totalCount: number;
    ambiguityCount: number;
    avgConfidence: number;
    categoryBreakdown: {
      FUNCTIONAL: number;
      NON_FUNCTIONAL: number;
      CONSTRAINT: number;
    };
  };
}

export interface RequirementCandidate {
  id: string;
  reqKey: string;
  text: string;
  category: CandidateCategory;
  priorityHint: 'MUST' | 'SHOULD' | 'COULD' | 'UNKNOWN';
  confidence: number;
  sourceParagraphId?: string;
  sourceQuote?: string;
  isAmbiguous: boolean;
  ambiguityQuestions: string[];
  duplicateRefs: string[];
  status: CandidateReviewStatus;
  editedText?: string;
  reviewedBy?: { id: string; name: string };
  reviewedAt?: string;
}

export interface ExtractionResult {
  run: ExtractionRun;
  candidates: RequirementCandidate[];
  summary: {
    proposed: number;
    accepted: number;
    rejected: number;
    edited: number;
    lowConfidenceTop5: string[];
    ambiguousTop5: string[];
  };
}

// ─── Evidence (Section 8.9) ───────────────────────────────────

export interface SourceEvidence {
  rfpTitle: string;
  rfpVersionLabel: string;
  section: string;
  paragraphId: string;
  snippet: string;
  fileUri: string;
  fileChecksum: string;
  integrityStatus: 'VERIFIED' | 'MODIFIED' | 'MISSING';
}

export interface AiEvidence {
  extractionRunId: string;
  modelName: string;
  modelVersion: string;
  promptVersion: string;
  schemaVersion: string;
  generationParams: { temperature: number; top_p: number };
  confidence: number;
  originalCandidateText: string;
  wasEdited: boolean;
  editedText?: string;
}

export interface ChangeEvent {
  id: string;
  changeType: 'CREATE' | 'EDIT' | 'DELETE' | 'MERGE' | 'SPLIT';
  reason: string;
  changedBy: { id: string; name: string };
  changedAt: string;
  beforeSnapshot?: Record<string, unknown>;
  afterSnapshot?: Record<string, unknown>;
}

export interface ImpactEvidence {
  impactedEpics: { id: string; title: string }[];
  impactedWbs: { id: string; title: string }[];
  impactedTests: { id: string; title: string }[];
  impactedSprints: { id: string; name: string }[];
}

export interface Evidence {
  requirementId: string;
  requirementTitle: string;
  requirementStatus: string;
  sourceEvidence: SourceEvidence;
  aiEvidence: AiEvidence;
  changeEvidence: ChangeEvent[];
  impactEvidence: ImpactEvidence;
}

// ─── Diff (Section 6.8) ──────────────────────────────────────

export interface DiffItem {
  type: 'NEW' | 'REMOVED' | 'MODIFIED';
  requirementKey: string;
  text: string;
  previousText?: string;
}

export interface RfpDiff {
  fromVersion: string;
  toVersion: string;
  items: DiffItem[];
  impactSummary: {
    affectedEpics: number;
    affectedWbs: number;
    affectedSprints: number;
    affectedTests: number;
  };
}

// ─── Status → UI Mapping (Section 4.5) ───────────────────────

export interface StatusUiMapping {
  badgeLabel: string;
  badgeColor: string;
  filterLabel: string;
  showInCardList: boolean;
  pulse?: boolean;
}

export const RFP_STATUS_UI_MAP: Record<RfpStatus, StatusUiMapping> = {
  EMPTY: { badgeLabel: '', badgeColor: '', filterLabel: '', showInCardList: false },
  ORIGIN_DEFINED: { badgeLabel: '', badgeColor: '', filterLabel: '', showInCardList: false },
  UPLOADED: { badgeLabel: '업로드됨', badgeColor: 'bg-gray-100 text-gray-700', filterLabel: '업로드됨', showInCardList: true },
  PARSING: { badgeLabel: '분석중', badgeColor: 'bg-blue-100 text-blue-700', filterLabel: '분석중', showInCardList: true, pulse: true },
  PARSED: { badgeLabel: '분석중', badgeColor: 'bg-blue-100 text-blue-700', filterLabel: '분석중', showInCardList: true },
  EXTRACTING: { badgeLabel: '분석중', badgeColor: 'bg-blue-100 text-blue-700', filterLabel: '분석중', showInCardList: true, pulse: true },
  EXTRACTED: { badgeLabel: '검토대기', badgeColor: 'bg-yellow-100 text-yellow-700', filterLabel: '검토대기', showInCardList: true },
  REVIEWING: { badgeLabel: '검토중', badgeColor: 'bg-orange-100 text-orange-700', filterLabel: '검토중', showInCardList: true },
  CONFIRMED: { badgeLabel: '분석완료', badgeColor: 'bg-green-100 text-green-700', filterLabel: '분석완료', showInCardList: true },
  NEEDS_REANALYSIS: { badgeLabel: '재분석필요', badgeColor: 'bg-red-100 text-red-700', filterLabel: '재분석필요', showInCardList: true },
  ON_HOLD: { badgeLabel: '보류', badgeColor: 'bg-gray-100 text-gray-600', filterLabel: '보류', showInCardList: true },
  FAILED: { badgeLabel: '실패', badgeColor: 'bg-red-100 text-red-700', filterLabel: '실패', showInCardList: true },
};

// Filter labels for the status dropdown (unique labels only, excluding empty statuses)
export const RFP_FILTER_STATUS_OPTIONS = [
  { value: 'ALL', label: '전체' },
  { value: 'UPLOADED', label: '업로드됨' },
  { value: 'ANALYZING', label: '분석중' },       // groups PARSING+PARSED+EXTRACTING
  { value: 'EXTRACTED', label: '검토대기' },
  { value: 'REVIEWING', label: '검토중' },
  { value: 'CONFIRMED', label: '분석완료' },
  { value: 'NEEDS_REANALYSIS', label: '재분석필요' },
  { value: 'ON_HOLD', label: '보류' },
  { value: 'FAILED', label: '실패' },
] as const;

export type RfpFilterStatus = typeof RFP_FILTER_STATUS_OPTIONS[number]['value'];

export const RFP_SORT_OPTIONS = [
  { value: 'updatedAt:desc', label: '최신순' },
  { value: 'impactLevel:desc', label: '영향큰순' },
  { value: 'requirementCount:desc', label: '요구사항많은순' },
] as const;

// ─── Origin Type Labels ───────────────────────────────────────

export const ORIGIN_TYPE_LABELS: Record<OriginType, { title: string; description: string }> = {
  EXTERNAL_RFP: {
    title: '외부 고객 RFP 기반',
    description: '고객 제안 요청서(PDF, Word 등)를 업로드하고 AI가 요구사항/범위/제약 조건을 자동 추출합니다.',
  },
  INTERNAL_INITIATIVE: {
    title: '내부 기획 프로젝트',
    description: 'RFP 없이 내부 요구사항부터 시작합니다. AI가 표준 RFP 초안을 생성할 수 있습니다.',
  },
  MODERNIZATION: {
    title: '기존 시스템 고도화',
    description: '기존 문서 또는 요구사항을 불러오고 변경 영향 분석을 자동 활성화합니다.',
  },
  MIXED: {
    title: '혼합 (외부 RFP + 내부 요구사항)',
    description: '외부 RFP 업로드와 내부 보충 요구사항을 병행할 수 있습니다.',
  },
};
