// Project hooks
export * from './useProjects';

// Phase hooks
export * from './usePhases';

// KPI hooks (typed, ReactiveKpiController)
export * from './useKpis';

// Task/Kanban hooks
export * from './useTasks';

// Requirement hooks
export * from './useRequirements';

// Dashboard hooks
export * from './useDashboard';

// Story/Backlog hooks
export * from './useStories';

// Epic hooks (4-Level Backlog Hierarchy)
export * from './useEpics';

// Feature hooks (4-Level Backlog Hierarchy)
export * from './useFeatures';

// Sprint hooks
export * from './useSprints';

// RFP hooks
export * from './useRfps';

// Part hooks
export * from './useParts';

// Common hooks (meetings, issues)
export * from './useCommon';

// Education hooks
export * from './useEducations';

// Role hooks (users, permissions, project members)
export * from './useRoles';

// Weekly Report hooks
export * from './useWeeklyReports';

// Report v2 hooks (ReactiveReportController)
export * from './useReports';

// WIP hooks
export * from './useWip';

// Lineage hooks
export * from './useLineage';

// Chat hooks
export * from './useChat';

// Auth hooks
export * from './useAuth';

// WBS hooks (Phase-based WBS management)
export * from './useWbs';

// Template hooks (Phase & WBS templates)
export * from './useTemplates';

// WBS-Backlog Integration hooks (Phase-Epic, WbsGroup-Feature, WbsItem-Story)
// Explicitly export to avoid name conflicts with useFeatures
export {
  integrationKeys,
  useEpicsByPhase,
  useUnlinkedEpics,
  useLinkEpicToPhase,
  useUnlinkEpicFromPhase,
  useFeaturesByWbsGroup as useFeaturesByWbsGroupIntegration,
  useWbsGroupsByFeature,
  useUnlinkedFeatures,
  useLinkFeatureToWbsGroup as useLinkFeatureToWbsGroupIntegration,
  useUnlinkFeatureFromWbsGroup as useUnlinkFeatureFromWbsGroupIntegration,
  useStoriesByWbsItem,
  useWbsItemsByStory,
  useUnlinkedStories,
  useUnlinkedStoriesByProject,
  useLinkStoryToWbsItem,
  useUnlinkStoryFromWbsItem,
  usePhaseIntegration,
  useAllIntegrationLinks,
} from './useWbsBacklogIntegration';
export type {
  PhaseEpicSummary,
  GroupFeatureSummary,
  ItemStorySummary,
  PhaseIntegrationSummary,
} from './useWbsBacklogIntegration';

// DB Admin hooks (Sync, Backup, Restore)
export * from './useDbAdmin';

// Excel Import/Export hooks (Requirements, WBS)
export * from './useExcelImportExport';

// Data Quality hooks
export * from './useDataQuality';

// WBS Snapshots hooks
export * from './useWbsSnapshots';

// View hooks (PMO portfolio, custom views)
export * from './useViews';

// Project Authorization hooks
export * from './useProjectAuth';
