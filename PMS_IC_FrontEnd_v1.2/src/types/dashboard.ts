// Dashboard reliability contract types
// Matches backend DashboardSection<T> response envelope

export type Completeness = 'COMPLETE' | 'PARTIAL' | 'NO_DATA';

export interface DashboardWarning {
  code: string;
  message: string;
}

export interface DashboardMeta {
  asOf: string;
  scope?: string;
  sources?: string[];
  queryIds?: string[];
  completeness: Completeness;
  warnings: DashboardWarning[];
  computeMs: number;
  usedFallback: boolean;
}

export interface DashboardSection<T> {
  data: T | null;
  meta: DashboardMeta;
}

// ========== Dashboard Stats ==========

export interface DashboardStats {
  isPortfolioView: boolean;
  projectId: string | null;
  projectName: string | null;
  totalProjects: number;
  activeProjects: number;
  projectsByStatus: Record<string, number>;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  avgProgress: number;
  tasksByStatus: Record<string, number>;
  totalIssues: number;
  openIssues: number;
  highPriorityIssues: number;
  budgetTotal: number | null;
  budgetSpent: number | null;
  budgetExecutionRate: number | null;
}

// ========== Phase Progress ==========

export type DerivedStatus = 'normal' | 'warning' | 'danger';

export type StatusReasonCode =
  | 'BLOCKED_RATIO_OVER_20_PCT'
  | 'BLOCKED_RATIO_OVER_10_PCT'
  | 'THREE_OR_MORE_BLOCKED_TASKS'
  | 'ONE_OR_MORE_BLOCKED_TASKS'
  | 'OVERDUE_NOT_COMPLETED'
  | 'PROGRESS_BELOW_30_PCT'
  | 'PHASE_COMPLETED'
  | 'VELOCITY_DECLINING'
  | 'COMPLETION_RATE_BELOW_50_PCT'
  | 'NO_TASKS_ASSIGNED';

export interface PhaseMetric {
  phaseId: string;
  phaseName: string;
  trackType: string;
  reportedProgress: number;
  derivedProgress: number;
  derivedStatus: DerivedStatus;
  statusReasons: StatusReasonCode[];
  totalTasks: number;
  completedTasks: number;
  blockedTasks: number;
}

export interface PhaseProgressDto {
  phases: PhaseMetric[];
}

// ========== Part Stats ==========

export interface PartLeaderMetric {
  partId: string;
  partName: string;
  leaderId: string;
  leaderName: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  status: DerivedStatus;
  statusReasons: StatusReasonCode[];
}

export interface PartStatsDto {
  parts: PartLeaderMetric[];
}

// ========== WBS Group Stats ==========

export interface WbsGroupMetric {
  groupId: string;
  groupName: string;
  trackType: string;
  progress: number;
  assigneeId: string | null;
  assigneeName: string | null;
  status: DerivedStatus;
  statusReasons: StatusReasonCode[];
}

export interface WbsGroupStatsDto {
  groups: WbsGroupMetric[];
}

// ========== Sprint Velocity ==========

export interface SprintMetric {
  sprintId: string;
  sprintName: string;
  status: string;
  plannedPoints: number;
  completedPoints: number;
  velocity: number;
  velocitySource: string;
}

export interface SprintVelocityDto {
  sprints: SprintMetric[];
}

// ========== Burndown ==========

export interface BurndownPoint {
  date: string;
  remainingPoints: number;
  idealPoints: number;
}

export interface BurndownDto {
  sprintId: string;
  sprintName: string;
  startDate: string;
  endDate: string;
  totalPoints: number;
  dataPoints: BurndownPoint[];
  isApproximate: boolean;
}

// ========== Insights ==========

export type InsightType = 'RISK' | 'ACHIEVEMENT' | 'RECOMMENDATION';
export type InsightSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

export interface InsightEvidence {
  entityIds: string[];
  metrics: Record<string, unknown>;
}

export interface InsightDto {
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  description: string;
  generatedAt: string;
  dataSource: string;
  evidence: InsightEvidence;
}

// ========== Full Project Dashboard ==========

export interface ProjectDashboardDto {
  stats: DashboardSection<DashboardStats>;
  phaseProgress: DashboardSection<PhaseProgressDto>;
  sprintVelocity: DashboardSection<SprintVelocityDto>;
  burndown: DashboardSection<BurndownDto>;
  partStats: DashboardSection<PartStatsDto>;
  wbsGroupStats: DashboardSection<WbsGroupStatsDto>;
  insights: DashboardSection<InsightDto[]>;
}

// ========== Data Source Badge ==========

export type DataSourceTier = 'NOT_CONNECTED' | 'SAMPLE' | 'CONCEPT';
