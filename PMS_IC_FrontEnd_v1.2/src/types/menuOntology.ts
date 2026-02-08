// MenuOntology type system for AI-driven menu navigation
// Foundation F2 of v2.0 upgrade — transforms menuConfig from a route array
// into a domain ontology where each node carries intent, entity, keyword,
// metric, deep-link, and preset policy metadata.

// ─── Base Types ─────────────────────────────────────────────

export type MenuDomain =
  | 'overview'
  | 'plan'
  | 'execution'
  | 'control'
  | 'trace'
  | 'reports'
  | 'governance'
  | 'audit'
  | 'collaboration'
  | 'tools'
  | 'admin';

export type ViewModePreset =
  | 'EXEC_SUMMARY'
  | 'PMO_CONTROL'
  | 'PM_WORK'
  | 'DEV_EXECUTION'
  | 'CUSTOMER_APPROVAL'
  | 'AUDIT_EVIDENCE';

export type Capability =
  | 'view_dashboard'
  | 'view_backlog'
  | 'manage_backlog'
  | 'view_kanban'
  | 'manage_kanban'
  | 'view_issues'
  | 'manage_issues'
  | 'view_tests'
  | 'manage_tests'
  | 'view_deliverables'
  | 'manage_deliverables'
  | 'approve_deliverable'
  | 'view_decisions'
  | 'manage_decisions'
  | 'view_lineage'
  | 'view_reports'
  | 'export_reports'
  | 'view_pmo'
  | 'view_phases'
  | 'manage_phases'
  | 'view_requirements'
  | 'manage_requirements'
  | 'view_wbs'
  | 'manage_wbs'
  | 'view_sprints'
  | 'manage_sprints'
  | 'view_my_work'
  | 'export_audit_evidence'
  | 'view_meetings'
  | 'view_notices'
  | 'view_ai_assistant'
  | 'view_education'
  | 'view_stats'
  | 'admin_project'
  | 'admin_system';

export type EntityType =
  | 'project'
  | 'phase'
  | 'epic'
  | 'feature'
  | 'story'
  | 'task'
  | 'issue'
  | 'risk'
  | 'decision'
  | 'deliverable'
  | 'test_case'
  | 'sprint'
  | 'requirement'
  | 'wbs_item'
  | 'meeting'
  | 'user';

export type IntentTag =
  // Ask family (query / question)
  | 'ask_overall_status'
  | 'ask_progress'
  | 'ask_bottleneck'
  | 'ask_risk'
  | 'ask_decision_pending'
  | 'ask_my_work'
  | 'ask_trace_impact'
  | 'ask_report_export'
  | 'ask_phase_status'
  | 'ask_sprint_velocity'
  | 'ask_test_coverage'
  | 'ask_deliverable_status'
  | 'ask_requirement_status'
  | 'ask_wbs_status'
  | 'ask_health_score'
  | 'ask_audit_readiness'
  // Do family (execute / mutate)
  | 'do_create_issue'
  | 'do_approve_deliverable'
  | 'do_export_evidence'
  | 'do_move_task'
  | 'do_create_sprint'
  | 'do_assign_task'
  | 'do_escalate_risk'
  | 'do_update_phase'
  | 'do_upload_deliverable'
  | 'do_create_meeting'
  | 'do_export_report';

export type ScopeKey =
  | 'projectId'
  | 'phaseId'
  | 'partId'
  | 'sprintId'
  | 'epicId';

// ─── DeepLink Template ──────────────────────────────────────

export interface DeepLinkTemplate {
  /** URL pattern with placeholders, e.g. "/kanban?status={status}&assignee={userId}" */
  pattern: string;
  /** Human-readable description of the deep link */
  description: string;
  /** Parameter names that must be provided to resolve the pattern */
  requiredParams: string[];
}

// ─── Preset Policy ──────────────────────────────────────────

export interface PresetPolicy {
  /** Which preset this policy applies to */
  preset: ViewModePreset;
  /** UI rendering configuration for this preset */
  ui: {
    density: 'compact' | 'standard' | 'detailed';
    defaultRightPanel: 'closed' | 'open';
    defaultFilters?: Record<string, string>;
    hiddenColumns?: string[];
    highlightMetrics?: string[];
  };
  /** Actions surfaced to the user under this preset */
  suggestedActions?: {
    key: string;
    label: string;
    capability?: Capability;
  }[];
}

// ─── MenuOntologyNode (core type) ───────────────────────────

export interface MenuOntologyNode {
  // --- Identity ---
  /** Unique node identifier, e.g. "kanban", "audit-evidence" */
  nodeId: string;
  /** Localised display label */
  label: string;
  /** React Router path */
  route: string;
  /** Icon name (Lucide or MUI) */
  icon: string;
  /** Domain this node belongs to */
  domain: MenuDomain;

  // --- Authorisation ---
  /** Capabilities required for the menu item to be visible */
  requiredCaps: Capability[];

  // --- AI linkage: Intent / Entity / Keyword / Metric ---
  /** Intent tags this node can satisfy */
  intents: IntentTag[];
  /** Representative questions for AI matching / embedding */
  canonicalQuestions: string[];
  /** Entity types handled by this node */
  entities: EntityType[];
  /** Korean / English keywords for fuzzy matching */
  keywords: string[];
  /** Related KPI / metric names */
  metrics?: string[];

  // --- Preset policies ---
  /** Default preset applied when entering this node */
  defaultPreset: ViewModePreset;
  /** Per-preset UI rendering policies */
  presetPolicies: PresetPolicy[];

  // --- DeepLink ---
  /** Parameterised deep-link URL templates */
  deepLinks?: DeepLinkTemplate[];

  // --- Scoring helpers ---
  /** Tie-breaking priority (lower = higher priority) */
  priority?: number;
  /** Scope parameters the AI should include when navigating here */
  scopeHints?: ScopeKey[];
}
