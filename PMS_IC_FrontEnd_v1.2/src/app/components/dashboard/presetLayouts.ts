import type { ViewModePreset } from '../../../types/menuOntology';

// ========== Widget Keys ==========

export type WidgetKey =
  | 'KPI_HEALTH'
  | 'KPI_PROGRESS'
  | 'KPI_RISK'
  | 'KPI_BUDGET'
  | 'KPI_ISSUE'
  | 'KPI_SPRINT'
  | 'KPI_PENDING'
  | 'KPI_DEVIATION'
  | 'KPI_PROJECT_COUNT'
  | 'KPI_MY_TASKS'
  | 'KPI_WEEKLY_DONE'
  | 'PHASE_TIMELINE'
  | 'PHASE_HEALTH'
  | 'PHASE_DEVIATION_CHART'
  | 'RISK_SUMMARY'
  | 'DECISION_SUMMARY'
  | 'SPRINT_BURNDOWN_MINI'
  | 'ACTION_ITEMS_PANEL'
  | 'AI_INSIGHT'
  | 'PORTFOLIO_TABLE'
  | 'PMO_DETAIL_PANEL'
  | 'MY_WORK_PREVIEW'
  | 'MY_ISSUES'
  | 'APPROVAL_LIST'
  | 'APPROVAL_DETAIL'
  | 'TRACK_PROGRESS'
  | 'PART_LEADERS'
  | 'SPRINT_VELOCITY'
  | 'RECENT_ACTIVITIES';

// ========== Layout Configuration ==========

export interface DashboardPresetLayout {
  preset: ViewModePreset;
  slots: {
    kpiRow: WidgetKey[];
    main: WidgetKey[];
    rightPanel?: WidgetKey[];
  };
  ui: {
    density: 'compact' | 'standard' | 'detailed';
    defaultRightPanel: 'open' | 'closed';
  };
}

// ========== Preset Layouts ==========

export const presetLayouts: Record<string, DashboardPresetLayout> = {
  EXEC_SUMMARY: {
    preset: 'EXEC_SUMMARY',
    slots: {
      kpiRow: ['KPI_HEALTH', 'KPI_PROGRESS', 'KPI_RISK', 'KPI_BUDGET'],
      main: ['PHASE_TIMELINE', 'DECISION_SUMMARY', 'AI_INSIGHT'],
    },
    ui: { density: 'compact', defaultRightPanel: 'closed' },
  },
  PMO_CONTROL: {
    preset: 'PMO_CONTROL',
    slots: {
      kpiRow: ['KPI_PROJECT_COUNT', 'KPI_HEALTH', 'KPI_PENDING', 'KPI_DEVIATION'],
      main: ['PORTFOLIO_TABLE', 'PHASE_DEVIATION_CHART'],
      rightPanel: ['PMO_DETAIL_PANEL'],
    },
    ui: { density: 'standard', defaultRightPanel: 'open' },
  },
  PM_WORK: {
    preset: 'PM_WORK',
    slots: {
      kpiRow: ['KPI_PROGRESS', 'KPI_BUDGET', 'KPI_ISSUE', 'KPI_SPRINT'],
      main: [
        'TRACK_PROGRESS',
        'PHASE_HEALTH',
        'PART_LEADERS',
        'PHASE_DEVIATION_CHART',
        'SPRINT_VELOCITY',
        'SPRINT_BURNDOWN_MINI',
        'AI_INSIGHT',
        'RECENT_ACTIVITIES',
      ],
      rightPanel: ['ACTION_ITEMS_PANEL'],
    },
    ui: { density: 'detailed', defaultRightPanel: 'open' },
  },
  DEV_EXECUTION: {
    preset: 'DEV_EXECUTION',
    slots: {
      kpiRow: ['KPI_MY_TASKS', 'KPI_SPRINT', 'KPI_WEEKLY_DONE'],
      main: ['MY_WORK_PREVIEW', 'MY_ISSUES', 'AI_INSIGHT'],
    },
    ui: { density: 'standard', defaultRightPanel: 'closed' },
  },
  CUSTOMER_APPROVAL: {
    preset: 'CUSTOMER_APPROVAL',
    slots: {
      kpiRow: ['KPI_PROGRESS', 'KPI_PENDING', 'KPI_WEEKLY_DONE'],
      main: ['APPROVAL_LIST', 'PHASE_TIMELINE'],
      rightPanel: ['APPROVAL_DETAIL'],
    },
    ui: { density: 'compact', defaultRightPanel: 'open' },
  },
  AUDIT_EVIDENCE: {
    preset: 'AUDIT_EVIDENCE',
    slots: {
      kpiRow: ['KPI_PROGRESS', 'KPI_ISSUE', 'KPI_SPRINT'],
      main: ['PHASE_TIMELINE', 'RECENT_ACTIVITIES'],
    },
    ui: { density: 'compact', defaultRightPanel: 'closed' },
  },
};
