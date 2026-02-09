// AI Briefing types for the AI Decision Console (/ai-assistant)
// Based on design doc: 23_AI어시스턴트_화면설계.md v1.1

export type BriefingScope = 'current_sprint' | 'last_7_days' | 'last_14_days' | 'current_phase';
export type Completeness = 'FULL' | 'PARTIAL' | 'UNKNOWN';
export type HealthStatus = 'GREEN' | 'YELLOW' | 'RED';
export type InsightType = 'DELAY' | 'RISK' | 'BOTTLENECK' | 'POLICY_GAP' | 'QUALITY' | 'PROGRESS' | 'RESOURCE' | 'POSITIVE';
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type GenerationMethod = 'RULE_BASED' | 'MODEL_BASED' | 'HYBRID';
export type ActionResult = 'CLICKED' | 'COMPLETED' | 'CANCELLED' | 'FAILED';
export type TraceEventType =
  | 'BRIEFING_GENERATED'
  | 'INSIGHT_VIEWED'
  | 'ACTION_CLICKED'
  | 'ACTION_COMPLETED'
  | 'ACTION_CANCELLED'
  | 'CHAT_CONTEXT_INJECTED';

export interface AiBriefingResponse {
  context: {
    projectId: string;
    role: string;
    asOf: string;
    scope: BriefingScope;
    completeness: Completeness;
    missingSignals?: string[];
  };
  summary: {
    headline: string;
    signals: string[];
    healthStatus: HealthStatus;
    confidence: number;
    body: string;
  };
  insights: AiInsight[];
  recommendedActions: AiRecommendedAction[];
  explainability: AiExplainability;
}

export interface AiInsight {
  id: string;
  type: InsightType;
  severity: Severity;
  title: string;
  description: string;
  confidence: number;
  evidence: {
    asOf: string;
    metrics: string[];
    entities: string[];
    dataSource: string;
    query?: string;
  };
  actionRefs: string[];
}

export interface AiRecommendedAction {
  actionId: string;
  label: string;
  description: string;
  requiredCapability: string;
  targetRoute: string;
  priority: number;
  sourceInsightIds: string[];
}

export interface AiExplainability {
  dataCollectedAt: string;
  completeness: Completeness;
  missingSignals: string[];
  dataSources: {
    source: string;
    tables?: string[];
    recordCount?: number;
    lastSyncAt?: string;
  }[];
  generationMethod: GenerationMethod;
  warnings: string[];
  changeHistoryLinks: {
    label: string;
    route: string;
  }[];
}

export interface DecisionTraceEvent {
  projectId: string;
  eventType: TraceEventType;
  briefingId: string;
  insightId?: string;
  insightType?: InsightType;
  severity?: Severity;
  confidence?: number;
  actionId?: string;
  actionResult?: ActionResult;
  generationMethod?: GenerationMethod;
  completeness?: Completeness;
}

export interface AiChatContextInjection {
  mode: 'CONTEXTUAL';
  injectedContext: {
    insightId: string;
    insightType: string;
    insightTitle: string;
    projectId: string;
    asOf: string;
    evidenceRef: string[];
    summary: string;
  };
}

// Preset types
export type PresetKey = 'EXEC_SUMMARY' | 'PMO_CONTROL' | 'PM_WORK' | 'DEV_EXECUTION';

export function resolvePresetByRole(role: string): PresetKey {
  switch (role.toLowerCase()) {
    case 'sponsor':       return 'EXEC_SUMMARY';
    case 'pmo_head':      return 'PMO_CONTROL';
    case 'pm':            return 'PM_WORK';
    case 'developer':
    case 'qa':            return 'DEV_EXECUTION';
    default:              return 'PM_WORK';
  }
}

export interface PresetConfig {
  density: 'compact' | 'standard' | 'detailed';
  maxCards: number | null; // null = show all
}

export const PRESET_CONFIGS: Record<PresetKey, PresetConfig> = {
  EXEC_SUMMARY:  { density: 'compact',  maxCards: 3 },
  PMO_CONTROL:   { density: 'standard', maxCards: 7 },
  PM_WORK:       { density: 'detailed', maxCards: null },
  DEV_EXECUTION: { density: 'standard', maxCards: null },
};

// Severity threshold for action buttons
export const MINIMUM_SEVERITY_FOR_ACTION: Record<string, Severity> = {
  'create-issue': 'LOW',
  'create-risk': 'MEDIUM',
  'escalate-pmo': 'HIGH',
  'reassign-task': 'MEDIUM',
  'create-meeting-agenda': 'MEDIUM',
  'run-governance': 'HIGH',
  'create-deliverable': 'LOW',
  'update-progress': 'INFO',
};

const SEVERITY_ORDER: Record<Severity, number> = {
  INFO: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

export function isSeverityAboveThreshold(severity: Severity, threshold: Severity): boolean {
  return SEVERITY_ORDER[severity] >= SEVERITY_ORDER[threshold];
}
