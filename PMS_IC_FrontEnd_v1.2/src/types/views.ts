// Phase 5: Client-side View DTOs
// These represent the data shape consumed by Workbench components.
// Server response -> *ViewDto normalization happens in the extract step.

// ==================== PoBacklogViewDto ====================

export interface BacklogItemView {
  id: string;
  status: string;
  completedStoryCount: number;
  storyCount: number;
  completedStoryPoints: number;
  totalStoryPoints: number;
}

export interface EpicView {
  id: string;
  name: string;
  storyCount: number;
  completedStoryRate?: number;
  progress?: number;
}

export interface UnlinkedStoryView {
  id: string;
  title: string;
  status: string;
}

export interface ViewWarning {
  message: string;
}

export interface PoBacklogSummary {
  totalBacklogItems: number;
  approvedItems: number;
  pendingItems: number;
  requirementCoverage: number;
  epicCount: number;
  storyDecompositionRate: number;
}

export interface PoBacklogViewDto {
  summary: PoBacklogSummary;
  backlogItems: BacklogItemView[];
  epics: EpicView[];
  unlinkedStories: UnlinkedStoryView[];
  warnings: ViewWarning[];
}

// ==================== PmWorkboardViewDto ====================

export interface SprintStoryView {
  id: string;
  title: string;
  status: string;
  storyPoints?: number;
  partName?: string;
}

export interface BacklogStoryView extends SprintStoryView {
  readyForSprint?: boolean;
}

export interface PartWorkload {
  stories: number;
  storyPoints: number;
  members: number;
}

export interface PmWorkboardSummary {
  totalStories: number;
  inSprintStories: number;
  backlogStories: number;
  activeSprintName: string | null;
  sprintVelocity: number;
  partWorkload?: Record<string, PartWorkload>;
}

export interface ActiveSprintView {
  id: string;
  name: string;
  completedPoints: number;
  totalPoints: number;
  stories?: SprintStoryView[];
}

export interface PmWorkboardViewDto {
  summary: PmWorkboardSummary;
  activeSprint: ActiveSprintView | null;
  backlogStories: BacklogStoryView[];
  warnings: ViewWarning[];
  scopedPartIds?: string[];
}

// ==================== PmoPortfolioViewDto ====================

export interface KpiView {
  name: string;
  value: number;
  unit: string;
  status: 'OK' | 'WARNING' | 'DANGER';
  threshold: number;
  description: string;
}

export interface DataQualityScoreView {
  integrityScore?: number;
  readinessScore?: number;
  total?: number;
}

export interface DataQualityReadinessView {
  nullEpicIdStories: number;
  nullPartIdStories: number;
  unlinkedStories: number;
  unlinkedBacklogItems: number;
}

export interface DataQualityIssueView {
  severity: 'CRITICAL' | 'WARNING';
  issue: string;
}

export interface DataQualityView {
  score?: DataQualityScoreView;
  readiness?: DataQualityReadinessView;
  issues?: DataQualityIssueView[];
}

export interface PartComparisonView {
  partId: string;
  partName: string;
  stories: number;
  storyPoints: number;
  completedPoints: number;
  completionRate: number;
  memberCount: number;
}

export interface PmoPortfolioSummary {
  overallProgress: number;
  requirementTraceability: number;
  storyDecompositionRate: number;
  epicCoverage: number;
  dataQualityScore: number;
}

export interface PmoPortfolioViewDto {
  summary: PmoPortfolioSummary;
  kpis: {
    coverage?: KpiView[];
    operational?: KpiView[];
  };
  dataQuality?: DataQualityView;
  partComparison: PartComparisonView[];
  warnings: ViewWarning[];
}
