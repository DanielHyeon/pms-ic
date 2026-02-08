// Menu Ontology Nodes — 25 domain nodes organized across 11 zones.
// Each node carries intent, entity, keyword, metric, deep-link, and
// preset policy metadata for AI-driven navigation.

import type { MenuOntologyNode } from '../types/menuOntology';

// ─── Zone 1: Overview ───────────────────────────────────────────

export const dashboardNode: MenuOntologyNode = {
  nodeId: 'dashboard',
  label: '통합 대시보드',
  route: '/dashboard',
  icon: 'LayoutDashboard',
  domain: 'overview',
  requiredCaps: ['view_dashboard'],
  intents: ['ask_overall_status', 'ask_progress', 'ask_bottleneck', 'ask_health_score'],
  canonicalQuestions: [
    '프로젝트 전체 현황이 어떻게 되나요?',
    '현재 진행률은 얼마인가요?',
    '주요 병목 구간이 어디인가요?',
    '오늘 해야 할 일이 뭐가 있나요?',
    'KPI 요약을 보여주세요.',
  ],
  entities: ['project', 'phase', 'task'],
  keywords: [
    '대시보드', 'dashboard', '현황', '진행률', 'progress',
    'KPI', '요약', 'summary', 'overview', '전체현황',
  ],
  metrics: ['overall_progress', 'schedule_deviation', 'risk_count', 'open_issues'],
  defaultPreset: 'PM_WORK',
  presetPolicies: [
    {
      preset: 'EXEC_SUMMARY',
      ui: {
        density: 'compact',
        defaultRightPanel: 'closed',
        highlightMetrics: ['overall_progress', 'risk_count'],
        hiddenColumns: ['assignee', 'updated_at'],
      },
      suggestedActions: [
        { key: 'export_report', label: '리포트 내보내기', capability: 'export_reports' },
      ],
    },
    {
      preset: 'PM_WORK',
      ui: {
        density: 'standard',
        defaultRightPanel: 'open',
        highlightMetrics: ['schedule_deviation', 'open_issues'],
      },
      suggestedActions: [
        { key: 'create_issue', label: '이슈 생성', capability: 'manage_issues' },
        { key: 'view_bottleneck', label: '병목 분석', capability: 'view_dashboard' },
      ],
    },
    {
      preset: 'DEV_EXECUTION',
      ui: {
        density: 'detailed',
        defaultRightPanel: 'closed',
        highlightMetrics: ['open_issues'],
      },
    },
  ],
  deepLinks: [
    {
      pattern: '/dashboard?projectId={projectId}',
      description: 'Project-specific dashboard',
      requiredParams: ['projectId'],
    },
  ],
  priority: 1,
  scopeHints: ['projectId'],
};

// ─── Zone 2: Plan & Structure ───────────────────────────────────

export const requirementsNode: MenuOntologyNode = {
  nodeId: 'requirements',
  label: '요구사항 관리',
  route: '/requirements',
  icon: 'ClipboardList',
  domain: 'plan',
  requiredCaps: ['view_requirements'],
  intents: ['ask_requirement_status', 'ask_trace_impact'],
  canonicalQuestions: [
    '요구사항 현황을 보여주세요.',
    '미완료 요구사항이 몇 개인가요?',
    '이 요구사항의 추적 관계를 보여주세요.',
    '요구사항 변경 이력을 확인하고 싶어요.',
    'RFP 대비 요구사항 커버리지는?',
  ],
  entities: ['requirement', 'project'],
  keywords: [
    '요구사항', 'requirement', 'RFP', '추적', '커버리지',
    'traceability', '분석', '정의', '변경이력', '요구',
  ],
  metrics: ['requirement_coverage', 'change_request_count'],
  defaultPreset: 'PM_WORK',
  presetPolicies: [
    {
      preset: 'PM_WORK',
      ui: {
        density: 'standard',
        defaultRightPanel: 'open',
        highlightMetrics: ['requirement_coverage'],
      },
      suggestedActions: [
        { key: 'manage_req', label: '요구사항 편집', capability: 'manage_requirements' },
      ],
    },
    {
      preset: 'EXEC_SUMMARY',
      ui: {
        density: 'compact',
        defaultRightPanel: 'closed',
        hiddenColumns: ['description', 'updated_at'],
        highlightMetrics: ['requirement_coverage'],
      },
    },
    {
      preset: 'AUDIT_EVIDENCE',
      ui: {
        density: 'detailed',
        defaultRightPanel: 'open',
      },
    },
  ],
  deepLinks: [
    {
      pattern: '/requirements?projectId={projectId}&status={status}',
      description: 'Filtered requirement list',
      requiredParams: ['projectId'],
    },
  ],
  priority: 5,
  scopeHints: ['projectId'],
};

export const backlogNode: MenuOntologyNode = {
  nodeId: 'backlog',
  label: '백로그 관리',
  route: '/backlog',
  icon: 'ListTodo',
  domain: 'plan',
  requiredCaps: ['view_backlog'],
  intents: ['ask_progress', 'do_assign_task', 'do_move_task'],
  canonicalQuestions: [
    '백로그 현황을 보여주세요.',
    '우선순위가 높은 스토리가 뭐가 있나요?',
    '미배정된 태스크 목록을 보여주세요.',
    '이번 스프린트에 넣을 항목을 정리하고 싶어요.',
  ],
  entities: ['epic', 'feature', 'story', 'task'],
  keywords: [
    '백로그', 'backlog', '스토리', 'story', '에픽', 'epic',
    '우선순위', 'priority', '미배정', '태스크', 'task',
  ],
  metrics: ['backlog_count', 'unassigned_ratio'],
  defaultPreset: 'PM_WORK',
  presetPolicies: [
    {
      preset: 'PM_WORK',
      ui: {
        density: 'standard',
        defaultRightPanel: 'open',
        highlightMetrics: ['backlog_count'],
      },
      suggestedActions: [
        { key: 'create_story', label: '스토리 생성', capability: 'manage_backlog' },
        { key: 'assign_task', label: '태스크 배정', capability: 'manage_backlog' },
      ],
    },
    {
      preset: 'DEV_EXECUTION',
      ui: {
        density: 'detailed',
        defaultRightPanel: 'closed',
        defaultFilters: { assignee: 'me' },
      },
    },
    {
      preset: 'EXEC_SUMMARY',
      ui: {
        density: 'compact',
        defaultRightPanel: 'closed',
        hiddenColumns: ['description', 'assignee'],
      },
    },
  ],
  deepLinks: [
    {
      pattern: '/backlog?projectId={projectId}&epicId={epicId}',
      description: 'Backlog filtered by epic',
      requiredParams: ['projectId'],
    },
  ],
  priority: 6,
  scopeHints: ['projectId', 'epicId'],
};

export const wbsNode: MenuOntologyNode = {
  nodeId: 'wbs',
  label: '일정 관리 (WBS)',
  route: '/wbs',
  icon: 'CalendarDays',
  domain: 'plan',
  requiredCaps: ['view_wbs'],
  intents: ['ask_wbs_status', 'ask_progress', 'ask_bottleneck'],
  canonicalQuestions: [
    'WBS 일정 현황을 보여주세요.',
    '지연되고 있는 태스크가 있나요?',
    '간트 차트를 보고 싶어요.',
    '이번 달 마감 일정이 뭐가 있나요?',
  ],
  entities: ['wbs_item', 'task', 'phase'],
  keywords: [
    'WBS', '일정', 'schedule', '간트', 'gantt', '마감',
    'deadline', '지연', 'delay', '관리', '타임라인',
  ],
  metrics: ['schedule_performance_index', 'delayed_task_count'],
  defaultPreset: 'PM_WORK',
  presetPolicies: [
    {
      preset: 'PM_WORK',
      ui: {
        density: 'standard',
        defaultRightPanel: 'open',
        highlightMetrics: ['schedule_performance_index', 'delayed_task_count'],
      },
      suggestedActions: [
        { key: 'manage_wbs', label: 'WBS 편집', capability: 'manage_wbs' },
      ],
    },
    {
      preset: 'EXEC_SUMMARY',
      ui: {
        density: 'compact',
        defaultRightPanel: 'closed',
        hiddenColumns: ['assignee', 'description'],
      },
    },
    {
      preset: 'PMO_CONTROL',
      ui: {
        density: 'standard',
        defaultRightPanel: 'open',
        highlightMetrics: ['schedule_performance_index'],
      },
    },
  ],
  deepLinks: [
    {
      pattern: '/wbs?projectId={projectId}&phaseId={phaseId}',
      description: 'WBS filtered by phase',
      requiredParams: ['projectId'],
    },
  ],
  priority: 7,
  scopeHints: ['projectId', 'phaseId'],
};

export const phasesNode: MenuOntologyNode = {
  nodeId: 'phases',
  label: '단계별 관리',
  route: '/phases',
  icon: 'GitBranch',
  domain: 'plan',
  requiredCaps: ['view_phases'],
  intents: ['ask_phase_status', 'do_update_phase'],
  canonicalQuestions: [
    '현재 어떤 단계에 있나요?',
    '다음 단계로 넘어가려면 뭐가 남았나요?',
    '각 단계별 진행률을 보여주세요.',
    '분석 단계 산출물 현황은?',
  ],
  entities: ['phase', 'project', 'deliverable'],
  keywords: [
    '단계', 'phase', '분석', '설계', '구현', '테스트',
    '이행', 'stage', '진행', '게이트', 'gate',
  ],
  metrics: ['phase_completion', 'gate_readiness'],
  defaultPreset: 'PM_WORK',
  presetPolicies: [
    {
      preset: 'PM_WORK',
      ui: {
        density: 'standard',
        defaultRightPanel: 'open',
        highlightMetrics: ['phase_completion'],
      },
      suggestedActions: [
        { key: 'update_phase', label: '단계 업데이트', capability: 'manage_phases' },
      ],
    },
    {
      preset: 'EXEC_SUMMARY',
      ui: {
        density: 'compact',
        defaultRightPanel: 'closed',
        highlightMetrics: ['gate_readiness'],
      },
    },
    {
      preset: 'CUSTOMER_APPROVAL',
      ui: {
        density: 'compact',
        defaultRightPanel: 'closed',
        highlightMetrics: ['phase_completion', 'gate_readiness'],
      },
    },
  ],
  deepLinks: [
    {
      pattern: '/phases?projectId={projectId}&phaseId={phaseId}',
      description: 'Specific phase view',
      requiredParams: ['projectId'],
    },
  ],
  priority: 8,
  scopeHints: ['projectId', 'phaseId'],
};

// ─── Zone 3: Execution ─────────────────────────────────────────

export const kanbanNode: MenuOntologyNode = {
  nodeId: 'kanban',
  label: '칸반 보드',
  route: '/kanban',
  icon: 'Kanban',
  domain: 'execution',
  requiredCaps: ['view_kanban'],
  intents: ['ask_progress', 'do_move_task', 'do_assign_task', 'ask_my_work'],
  canonicalQuestions: [
    '칸반 보드를 보여주세요.',
    '진행 중인 태스크가 뭐가 있나요?',
    '이 태스크를 완료로 옮겨주세요.',
    'WIP 제한을 초과한 컬럼이 있나요?',
  ],
  entities: ['task', 'story', 'sprint'],
  keywords: [
    '칸반', 'kanban', '보드', 'board', '태스크', 'task',
    '진행중', 'in-progress', '완료', 'done', '이동', 'drag',
  ],
  metrics: ['wip_count', 'cycle_time', 'throughput'],
  defaultPreset: 'DEV_EXECUTION',
  presetPolicies: [
    {
      preset: 'DEV_EXECUTION',
      ui: {
        density: 'standard',
        defaultRightPanel: 'closed',
        highlightMetrics: ['wip_count', 'cycle_time'],
      },
      suggestedActions: [
        { key: 'move_task', label: '태스크 이동', capability: 'manage_kanban' },
      ],
    },
    {
      preset: 'PM_WORK',
      ui: {
        density: 'standard',
        defaultRightPanel: 'open',
        highlightMetrics: ['throughput', 'cycle_time'],
      },
      suggestedActions: [
        { key: 'assign_task', label: '태스크 배정', capability: 'manage_kanban' },
      ],
    },
    {
      preset: 'EXEC_SUMMARY',
      ui: {
        density: 'compact',
        defaultRightPanel: 'closed',
        hiddenColumns: ['description'],
      },
    },
  ],
  deepLinks: [
    {
      pattern: '/kanban?projectId={projectId}&sprintId={sprintId}&status={status}',
      description: 'Kanban filtered by sprint and status',
      requiredParams: ['projectId'],
    },
    {
      pattern: '/kanban?assignee={userId}',
      description: 'Kanban filtered by assignee',
      requiredParams: ['userId'],
    },
  ],
  priority: 3,
  scopeHints: ['projectId', 'sprintId'],
};

export const sprintsNode: MenuOntologyNode = {
  nodeId: 'sprints',
  label: '스프린트 관리',
  route: '/sprints',
  icon: 'Timer',
  domain: 'execution',
  requiredCaps: ['view_sprints'],
  intents: ['ask_sprint_velocity', 'do_create_sprint', 'ask_progress'],
  canonicalQuestions: [
    '현재 스프린트 진행 현황은?',
    '스프린트 속도(velocity)가 어떻게 되나요?',
    '다음 스프린트를 생성하고 싶어요.',
    '번다운 차트를 보여주세요.',
  ],
  entities: ['sprint', 'story', 'task'],
  keywords: [
    '스프린트', 'sprint', '속도', 'velocity', '번다운',
    'burndown', '이터레이션', 'iteration', '계획', 'planning',
  ],
  metrics: ['sprint_velocity', 'burndown_rate', 'sprint_completion'],
  defaultPreset: 'PM_WORK',
  presetPolicies: [
    {
      preset: 'PM_WORK',
      ui: {
        density: 'standard',
        defaultRightPanel: 'open',
        highlightMetrics: ['sprint_velocity', 'sprint_completion'],
      },
      suggestedActions: [
        { key: 'create_sprint', label: '스프린트 생성', capability: 'manage_sprints' },
      ],
    },
    {
      preset: 'DEV_EXECUTION',
      ui: {
        density: 'detailed',
        defaultRightPanel: 'closed',
        highlightMetrics: ['burndown_rate'],
      },
    },
    {
      preset: 'PMO_CONTROL',
      ui: {
        density: 'compact',
        defaultRightPanel: 'closed',
        highlightMetrics: ['sprint_velocity'],
      },
    },
  ],
  priority: 10,
  scopeHints: ['projectId', 'sprintId'],
};

export const myWorkNode: MenuOntologyNode = {
  nodeId: 'my-work',
  label: '내 할 일',
  route: '/my-work',
  icon: 'UserCheck',
  domain: 'execution',
  requiredCaps: ['view_my_work'],
  intents: ['ask_my_work', 'do_move_task'],
  canonicalQuestions: [
    '내가 해야 할 일이 뭐가 있나요?',
    '오늘 마감인 태스크는?',
    '나한테 배정된 이슈를 보여주세요.',
    '내 진행 중인 작업 목록을 보여주세요.',
  ],
  entities: ['task', 'issue', 'story'],
  keywords: [
    '내 할일', 'my work', '배정', 'assigned', '나의',
    '오늘', 'today', '마감', 'due', '진행중',
  ],
  metrics: ['my_task_count', 'my_overdue_count'],
  defaultPreset: 'DEV_EXECUTION',
  presetPolicies: [
    {
      preset: 'DEV_EXECUTION',
      ui: {
        density: 'standard',
        defaultRightPanel: 'closed',
        defaultFilters: { assignee: 'me' },
        highlightMetrics: ['my_overdue_count'],
      },
      suggestedActions: [
        { key: 'move_task', label: '상태 변경', capability: 'view_my_work' },
      ],
    },
    {
      preset: 'PM_WORK',
      ui: {
        density: 'standard',
        defaultRightPanel: 'open',
        highlightMetrics: ['my_task_count', 'my_overdue_count'],
      },
    },
  ],
  priority: 2,
  scopeHints: ['projectId'],
};

// ─── Zone 4: Control ────────────────────────────────────────────

export const issuesNode: MenuOntologyNode = {
  nodeId: 'issues',
  label: '이슈 관리',
  route: '/issues',
  icon: 'AlertCircle',
  domain: 'control',
  requiredCaps: ['view_issues'],
  intents: ['do_create_issue', 'ask_bottleneck', 'do_escalate_risk'],
  canonicalQuestions: [
    '현재 열린 이슈가 몇 개인가요?',
    '심각도가 높은 이슈를 보여주세요.',
    '이슈를 하나 생성하고 싶어요.',
    '이번 주에 해결된 이슈는 몇 개인가요?',
    '위험 이슈를 에스컬레이션하고 싶어요.',
  ],
  entities: ['issue', 'risk', 'task'],
  keywords: [
    '이슈', 'issue', '버그', 'bug', '결함', 'defect',
    '심각도', 'severity', '에스컬레이션', 'escalation', '리스크', 'risk',
  ],
  metrics: ['open_issues', 'critical_issue_count', 'resolution_rate'],
  defaultPreset: 'PM_WORK',
  presetPolicies: [
    {
      preset: 'PM_WORK',
      ui: {
        density: 'standard',
        defaultRightPanel: 'open',
        highlightMetrics: ['open_issues', 'critical_issue_count'],
      },
      suggestedActions: [
        { key: 'create_issue', label: '이슈 생성', capability: 'manage_issues' },
        { key: 'escalate', label: '에스컬레이션', capability: 'manage_issues' },
      ],
    },
    {
      preset: 'DEV_EXECUTION',
      ui: {
        density: 'detailed',
        defaultRightPanel: 'closed',
        defaultFilters: { assignee: 'me' },
      },
    },
    {
      preset: 'EXEC_SUMMARY',
      ui: {
        density: 'compact',
        defaultRightPanel: 'closed',
        hiddenColumns: ['description', 'reporter'],
        highlightMetrics: ['critical_issue_count'],
      },
    },
  ],
  deepLinks: [
    {
      pattern: '/issues?projectId={projectId}&severity={severity}',
      description: 'Issues filtered by severity',
      requiredParams: ['projectId'],
    },
  ],
  priority: 4,
  scopeHints: ['projectId'],
};

export const testsNode: MenuOntologyNode = {
  nodeId: 'tests',
  label: '테스트 관리',
  route: '/testing',
  icon: 'TestTube',
  domain: 'control',
  requiredCaps: ['view_tests'],
  intents: ['ask_test_coverage', 'ask_progress'],
  canonicalQuestions: [
    '테스트 진행률이 어떻게 되나요?',
    '테스트 커버리지를 보여주세요.',
    '실패한 테스트 케이스가 있나요?',
    '이번 단계의 테스트 현황은?',
  ],
  entities: ['test_case', 'requirement', 'phase'],
  keywords: [
    '테스트', 'test', '커버리지', 'coverage', '케이스',
    'case', 'QA', '품질', 'quality', '검증',
  ],
  metrics: ['test_coverage', 'test_pass_rate', 'failed_test_count'],
  defaultPreset: 'DEV_EXECUTION',
  presetPolicies: [
    {
      preset: 'DEV_EXECUTION',
      ui: {
        density: 'detailed',
        defaultRightPanel: 'open',
        highlightMetrics: ['test_coverage', 'test_pass_rate'],
      },
      suggestedActions: [
        { key: 'manage_test', label: '테스트 케이스 관리', capability: 'manage_tests' },
      ],
    },
    {
      preset: 'PM_WORK',
      ui: {
        density: 'standard',
        defaultRightPanel: 'closed',
        highlightMetrics: ['test_coverage'],
      },
    },
    {
      preset: 'AUDIT_EVIDENCE',
      ui: {
        density: 'detailed',
        defaultRightPanel: 'open',
        highlightMetrics: ['test_coverage', 'test_pass_rate'],
      },
    },
  ],
  priority: 12,
  scopeHints: ['projectId', 'phaseId'],
};

export const deliverablesNode: MenuOntologyNode = {
  nodeId: 'deliverables',
  label: '산출물 관리',
  route: '/deliverables',
  icon: 'Package',
  domain: 'control',
  requiredCaps: ['view_deliverables'],
  intents: ['ask_deliverable_status', 'do_approve_deliverable', 'do_upload_deliverable'],
  canonicalQuestions: [
    '이번 단계 산출물 현황은?',
    '승인 대기 중인 산출물이 있나요?',
    '산출물을 업로드하고 싶어요.',
    '산출물 승인 프로세스를 보여주세요.',
  ],
  entities: ['deliverable', 'phase', 'project'],
  keywords: [
    '산출물', 'deliverable', '승인', 'approval', '업로드',
    'upload', '문서', 'document', '제출', 'submit',
  ],
  metrics: ['deliverable_completion', 'pending_approval_count'],
  defaultPreset: 'PM_WORK',
  presetPolicies: [
    {
      preset: 'PM_WORK',
      ui: {
        density: 'standard',
        defaultRightPanel: 'open',
        highlightMetrics: ['deliverable_completion', 'pending_approval_count'],
      },
      suggestedActions: [
        { key: 'approve', label: '산출물 승인', capability: 'approve_deliverable' },
        { key: 'upload', label: '산출물 업로드', capability: 'manage_deliverables' },
      ],
    },
    {
      preset: 'CUSTOMER_APPROVAL',
      ui: {
        density: 'standard',
        defaultRightPanel: 'open',
        defaultFilters: { status: 'pending_approval' },
        highlightMetrics: ['pending_approval_count'],
      },
      suggestedActions: [
        { key: 'approve', label: '산출물 승인', capability: 'approve_deliverable' },
      ],
    },
    {
      preset: 'AUDIT_EVIDENCE',
      ui: {
        density: 'detailed',
        defaultRightPanel: 'open',
      },
    },
  ],
  deepLinks: [
    {
      pattern: '/deliverables?projectId={projectId}&phaseId={phaseId}&status={status}',
      description: 'Deliverables filtered by phase and status',
      requiredParams: ['projectId'],
    },
  ],
  priority: 11,
  scopeHints: ['projectId', 'phaseId'],
};

export const decisionsNode: MenuOntologyNode = {
  nodeId: 'decisions',
  label: '의사결정 & 리스크',
  route: '/decisions',
  icon: 'Scale',
  domain: 'control',
  requiredCaps: ['view_decisions'],
  intents: ['ask_decision_pending', 'ask_risk', 'do_escalate_risk'],
  canonicalQuestions: [
    '보류 중인 의사결정 사항이 있나요?',
    '리스크 현황을 보여주세요.',
    '이 리스크를 에스컬레이션하고 싶어요.',
    '최근 결정된 사항 목록을 보여주세요.',
    '주요 리스크의 대응 계획은?',
  ],
  entities: ['decision', 'risk', 'project'],
  keywords: [
    '의사결정', 'decision', '리스크', 'risk', '에스컬레이션',
    'escalation', '보류', 'pending', '대응', 'mitigation',
  ],
  metrics: ['pending_decision_count', 'high_risk_count'],
  defaultPreset: 'PM_WORK',
  presetPolicies: [
    {
      preset: 'PM_WORK',
      ui: {
        density: 'standard',
        defaultRightPanel: 'open',
        highlightMetrics: ['pending_decision_count', 'high_risk_count'],
      },
      suggestedActions: [
        { key: 'escalate', label: '리스크 에스컬레이션', capability: 'manage_decisions' },
      ],
    },
    {
      preset: 'EXEC_SUMMARY',
      ui: {
        density: 'compact',
        defaultRightPanel: 'closed',
        highlightMetrics: ['high_risk_count'],
      },
    },
    {
      preset: 'PMO_CONTROL',
      ui: {
        density: 'standard',
        defaultRightPanel: 'open',
        highlightMetrics: ['pending_decision_count', 'high_risk_count'],
      },
    },
  ],
  priority: 9,
  scopeHints: ['projectId'],
};

// ─── Zone 5: Traceability ───────────────────────────────────────

export const lineageNode: MenuOntologyNode = {
  nodeId: 'lineage',
  label: 'Lineage & History',
  route: '/lineage',
  icon: 'History',
  domain: 'trace',
  requiredCaps: ['view_lineage'],
  intents: ['ask_trace_impact', 'ask_requirement_status'],
  canonicalQuestions: [
    '이 요구사항의 추적 관계를 보여주세요.',
    '변경 이력(lineage)을 확인하고 싶어요.',
    '영향 분석 결과를 보여주세요.',
    '요구사항-설계-테스트 추적 매트릭스는?',
  ],
  entities: ['requirement', 'task', 'test_case', 'deliverable'],
  keywords: [
    'lineage', '추적', 'trace', '이력', 'history',
    '영향분석', 'impact', '관계', 'relation', '매트릭스',
  ],
  metrics: ['trace_coverage', 'orphan_count'],
  defaultPreset: 'PM_WORK',
  presetPolicies: [
    {
      preset: 'PM_WORK',
      ui: {
        density: 'standard',
        defaultRightPanel: 'open',
        highlightMetrics: ['trace_coverage'],
      },
    },
    {
      preset: 'AUDIT_EVIDENCE',
      ui: {
        density: 'detailed',
        defaultRightPanel: 'open',
        highlightMetrics: ['trace_coverage', 'orphan_count'],
      },
    },
    {
      preset: 'EXEC_SUMMARY',
      ui: {
        density: 'compact',
        defaultRightPanel: 'closed',
      },
    },
  ],
  deepLinks: [
    {
      pattern: '/lineage?projectId={projectId}&entityType={entityType}&entityId={entityId}',
      description: 'Lineage for a specific entity',
      requiredParams: ['projectId', 'entityType', 'entityId'],
    },
  ],
  priority: 13,
  scopeHints: ['projectId'],
};

// ─── Zone 6: Reports ────────────────────────────────────────────

export const reportsNode: MenuOntologyNode = {
  nodeId: 'reports',
  label: '프로젝트 리포트',
  route: '/reports',
  icon: 'BarChart3',
  domain: 'reports',
  requiredCaps: ['view_reports'],
  intents: ['ask_report_export', 'do_export_report', 'ask_overall_status'],
  canonicalQuestions: [
    '프로젝트 리포트를 생성해 주세요.',
    '주간 보고서를 내보내고 싶어요.',
    '월간 현황 리포트를 보여주세요.',
    'PMO 보고용 리포트는?',
  ],
  entities: ['project', 'phase'],
  keywords: [
    '리포트', 'report', '보고서', '주간', 'weekly',
    '월간', 'monthly', '내보내기', 'export', '생성',
  ],
  metrics: ['report_count', 'last_report_date'],
  defaultPreset: 'PM_WORK',
  presetPolicies: [
    {
      preset: 'PM_WORK',
      ui: {
        density: 'standard',
        defaultRightPanel: 'closed',
      },
      suggestedActions: [
        { key: 'export_report', label: '리포트 내보내기', capability: 'export_reports' },
      ],
    },
    {
      preset: 'EXEC_SUMMARY',
      ui: {
        density: 'compact',
        defaultRightPanel: 'closed',
      },
    },
    {
      preset: 'PMO_CONTROL',
      ui: {
        density: 'standard',
        defaultRightPanel: 'open',
      },
      suggestedActions: [
        { key: 'export_report', label: '리포트 내보내기', capability: 'export_reports' },
      ],
    },
  ],
  priority: 14,
  scopeHints: ['projectId'],
};

export const statisticsNode: MenuOntologyNode = {
  nodeId: 'statistics',
  label: '통계 대시보드',
  route: '/statistics',
  icon: 'PieChart',
  domain: 'reports',
  requiredCaps: ['view_stats'],
  intents: ['ask_overall_status', 'ask_progress', 'ask_sprint_velocity'],
  canonicalQuestions: [
    '프로젝트 통계를 보여주세요.',
    '이번 달 생산성 지표는?',
    '이슈 해결 트렌드를 보여주세요.',
    '팀별 성과 비교를 보고 싶어요.',
  ],
  entities: ['project', 'sprint', 'task'],
  keywords: [
    '통계', 'statistics', '지표', 'metrics', '트렌드',
    'trend', '생산성', 'productivity', '성과', 'performance',
  ],
  metrics: ['productivity_index', 'trend_data'],
  defaultPreset: 'PMO_CONTROL',
  presetPolicies: [
    {
      preset: 'PMO_CONTROL',
      ui: {
        density: 'standard',
        defaultRightPanel: 'open',
        highlightMetrics: ['productivity_index'],
      },
    },
    {
      preset: 'PM_WORK',
      ui: {
        density: 'standard',
        defaultRightPanel: 'closed',
      },
    },
    {
      preset: 'EXEC_SUMMARY',
      ui: {
        density: 'compact',
        defaultRightPanel: 'closed',
        highlightMetrics: ['productivity_index'],
      },
    },
  ],
  priority: 15,
  scopeHints: ['projectId'],
};

// ─── Zone 7: PMO / Governance ───────────────────────────────────

export const pmoNode: MenuOntologyNode = {
  nodeId: 'pmo',
  label: 'PMO 대시보드',
  route: '/pmo-console',
  icon: 'Gauge',
  domain: 'governance',
  requiredCaps: ['view_pmo'],
  intents: ['ask_overall_status', 'ask_health_score', 'ask_bottleneck'],
  canonicalQuestions: [
    'PMO 대시보드를 보여주세요.',
    '프로젝트 전체 건강도는?',
    '포트폴리오 현황을 보여주세요.',
    'PMO 관점에서 주요 이슈는?',
  ],
  entities: ['project', 'phase', 'risk'],
  keywords: [
    'PMO', '대시보드', '건강도', 'health', '포트폴리오',
    'portfolio', '거버넌스', 'governance', '감독', 'oversight',
  ],
  metrics: ['project_health_score', 'portfolio_status'],
  defaultPreset: 'PMO_CONTROL',
  presetPolicies: [
    {
      preset: 'PMO_CONTROL',
      ui: {
        density: 'standard',
        defaultRightPanel: 'open',
        highlightMetrics: ['project_health_score', 'portfolio_status'],
      },
    },
    {
      preset: 'EXEC_SUMMARY',
      ui: {
        density: 'compact',
        defaultRightPanel: 'closed',
        highlightMetrics: ['project_health_score'],
      },
    },
    {
      preset: 'PM_WORK',
      ui: {
        density: 'standard',
        defaultRightPanel: 'closed',
      },
    },
  ],
  priority: 16,
  scopeHints: ['projectId'],
};

export const healthMatrixNode: MenuOntologyNode = {
  nodeId: 'health-matrix',
  label: '건강도 매트릭스',
  route: '/health-matrix',
  icon: 'Activity',
  domain: 'governance',
  requiredCaps: ['view_pmo'],
  intents: ['ask_health_score', 'ask_bottleneck', 'ask_risk'],
  canonicalQuestions: [
    '프로젝트 건강도 매트릭스를 보여주세요.',
    '각 프로젝트의 건강 점수는?',
    '가장 위험한 프로젝트는 어디인가요?',
  ],
  entities: ['project', 'risk', 'phase'],
  keywords: [
    '건강도', 'health', '매트릭스', 'matrix', '점수',
    'score', '위험도', 'risk-score', '상태', 'status',
  ],
  metrics: ['health_matrix_score', 'red_flag_count'],
  defaultPreset: 'PMO_CONTROL',
  presetPolicies: [
    {
      preset: 'PMO_CONTROL',
      ui: {
        density: 'standard',
        defaultRightPanel: 'open',
        highlightMetrics: ['health_matrix_score', 'red_flag_count'],
      },
    },
    {
      preset: 'EXEC_SUMMARY',
      ui: {
        density: 'compact',
        defaultRightPanel: 'closed',
        highlightMetrics: ['health_matrix_score'],
      },
    },
    {
      preset: 'PM_WORK',
      ui: {
        density: 'compact',
        defaultRightPanel: 'closed',
      },
    },
  ],
  priority: 17,
  scopeHints: ['projectId'],
};

// ─── Zone 8: Audit ──────────────────────────────────────────────

export const auditEvidenceNode: MenuOntologyNode = {
  nodeId: 'audit-evidence',
  label: '감사 증적 내보내기',
  route: '/audit-evidence',
  icon: 'Shield',
  domain: 'audit',
  requiredCaps: ['export_audit_evidence'],
  intents: ['ask_audit_readiness', 'do_export_evidence'],
  canonicalQuestions: [
    '감사 증적을 내보내고 싶어요.',
    '감사 준비 상태는 어떤가요?',
    '특정 단계의 감사 증적을 추출해 주세요.',
    '감사 로그를 확인하고 싶어요.',
  ],
  entities: ['project', 'phase', 'deliverable', 'test_case'],
  keywords: [
    '감사', 'audit', '증적', 'evidence', '내보내기',
    'export', '로그', 'log', '준비', 'readiness',
  ],
  metrics: ['audit_readiness_score', 'evidence_completeness'],
  defaultPreset: 'AUDIT_EVIDENCE',
  presetPolicies: [
    {
      preset: 'AUDIT_EVIDENCE',
      ui: {
        density: 'detailed',
        defaultRightPanel: 'open',
        highlightMetrics: ['audit_readiness_score', 'evidence_completeness'],
      },
      suggestedActions: [
        { key: 'export_evidence', label: '증적 내보내기', capability: 'export_audit_evidence' },
      ],
    },
    {
      preset: 'PMO_CONTROL',
      ui: {
        density: 'standard',
        defaultRightPanel: 'closed',
        highlightMetrics: ['audit_readiness_score'],
      },
    },
    {
      preset: 'PM_WORK',
      ui: {
        density: 'compact',
        defaultRightPanel: 'closed',
      },
    },
  ],
  deepLinks: [
    {
      pattern: '/audit-evidence?projectId={projectId}&phaseId={phaseId}',
      description: 'Audit evidence for a specific phase',
      requiredParams: ['projectId'],
    },
  ],
  priority: 18,
  scopeHints: ['projectId', 'phaseId'],
};

// ─── Zone 9: Collaboration ─────────────────────────────────────

export const meetingsNode: MenuOntologyNode = {
  nodeId: 'meetings',
  label: '회의 관리',
  route: '/meetings',
  icon: 'MessageSquare',
  domain: 'collaboration',
  requiredCaps: ['view_meetings'],
  intents: ['do_create_meeting', 'ask_progress'],
  canonicalQuestions: [
    '다가오는 회의 일정을 보여주세요.',
    '회의를 하나 잡고 싶어요.',
    '지난 회의록을 보여주세요.',
    '이번 주 회의 일정은?',
  ],
  entities: ['meeting', 'project', 'user'],
  keywords: [
    '회의', 'meeting', '일정', 'schedule', '회의록',
    'minutes', '참석', 'attendee', '예약', 'booking',
  ],
  defaultPreset: 'PM_WORK',
  presetPolicies: [
    {
      preset: 'PM_WORK',
      ui: {
        density: 'standard',
        defaultRightPanel: 'closed',
      },
      suggestedActions: [
        { key: 'create_meeting', label: '회의 생성', capability: 'view_meetings' },
      ],
    },
    {
      preset: 'DEV_EXECUTION',
      ui: {
        density: 'compact',
        defaultRightPanel: 'closed',
      },
    },
  ],
  priority: 19,
  scopeHints: ['projectId'],
};

export const announcementsNode: MenuOntologyNode = {
  nodeId: 'announcements',
  label: '공지사항',
  route: '/announcements',
  icon: 'Megaphone',
  domain: 'collaboration',
  requiredCaps: ['view_notices'],
  intents: ['ask_overall_status'],
  canonicalQuestions: [
    '최근 공지사항을 보여주세요.',
    '새로운 공지가 있나요?',
    '프로젝트 공지사항을 확인하고 싶어요.',
  ],
  entities: ['project'],
  keywords: [
    '공지', 'announcement', '알림', 'notice', '공지사항',
    '소식', 'news', '게시판', 'board',
  ],
  defaultPreset: 'PM_WORK',
  presetPolicies: [
    {
      preset: 'PM_WORK',
      ui: {
        density: 'standard',
        defaultRightPanel: 'closed',
      },
    },
    {
      preset: 'DEV_EXECUTION',
      ui: {
        density: 'compact',
        defaultRightPanel: 'closed',
      },
    },
  ],
  priority: 20,
  scopeHints: ['projectId'],
};

// ─── Zone 10: Tools ─────────────────────────────────────────────

export const aiAssistantNode: MenuOntologyNode = {
  nodeId: 'ai-assistant',
  label: 'AI 어시스턴트',
  route: '/ai-assistant',
  icon: 'Bot',
  domain: 'tools',
  requiredCaps: ['view_ai_assistant'],
  intents: [
    'ask_overall_status',
    'ask_progress',
    'ask_bottleneck',
    'ask_risk',
    'ask_my_work',
  ],
  canonicalQuestions: [
    'AI 어시스턴트를 열어주세요.',
    'AI에게 질문하고 싶어요.',
    '프로젝트에 대해 물어보고 싶어요.',
  ],
  entities: ['project', 'task', 'issue'],
  keywords: [
    'AI', '어시스턴트', 'assistant', '챗봇', 'chatbot',
    '질문', 'question', '도움', 'help', '분석',
  ],
  defaultPreset: 'PM_WORK',
  presetPolicies: [
    {
      preset: 'PM_WORK',
      ui: {
        density: 'standard',
        defaultRightPanel: 'open',
      },
    },
    {
      preset: 'DEV_EXECUTION',
      ui: {
        density: 'standard',
        defaultRightPanel: 'open',
      },
    },
  ],
  priority: 21,
  scopeHints: ['projectId'],
};

export const educationNode: MenuOntologyNode = {
  nodeId: 'education',
  label: '교육 관리',
  route: '/education',
  icon: 'GraduationCap',
  domain: 'tools',
  requiredCaps: ['view_education'],
  intents: ['ask_progress'],
  canonicalQuestions: [
    '교육 로드맵을 보여주세요.',
    '수강해야 할 교육이 있나요?',
    '팀원 교육 이수 현황은?',
  ],
  entities: ['user', 'project'],
  keywords: [
    '교육', 'education', '학습', 'learning', '로드맵',
    'roadmap', '이수', 'completion', '과정', 'course',
  ],
  defaultPreset: 'PM_WORK',
  presetPolicies: [
    {
      preset: 'PM_WORK',
      ui: {
        density: 'standard',
        defaultRightPanel: 'closed',
      },
    },
    {
      preset: 'DEV_EXECUTION',
      ui: {
        density: 'compact',
        defaultRightPanel: 'closed',
      },
    },
  ],
  priority: 22,
  scopeHints: ['projectId'],
};

// ─── Zone 11: Admin ─────────────────────────────────────────────

export const adminProjectNode: MenuOntologyNode = {
  nodeId: 'admin-project',
  label: '프로젝트 설정',
  route: '/admin-project',
  icon: 'Settings',
  domain: 'admin',
  requiredCaps: ['admin_project'],
  intents: ['ask_overall_status'],
  canonicalQuestions: [
    '프로젝트 설정을 변경하고 싶어요.',
    '팀원 권한을 관리하고 싶어요.',
    '프로젝트 기본 정보를 수정하고 싶어요.',
    '파트 구성을 변경하고 싶어요.',
  ],
  entities: ['project', 'user'],
  keywords: [
    '프로젝트 설정', 'project settings', '권한', 'permission',
    '팀원', 'member', '파트', 'part', '구성', 'configuration',
  ],
  defaultPreset: 'PM_WORK',
  presetPolicies: [
    {
      preset: 'PM_WORK',
      ui: {
        density: 'standard',
        defaultRightPanel: 'closed',
      },
    },
    {
      preset: 'PMO_CONTROL',
      ui: {
        density: 'standard',
        defaultRightPanel: 'closed',
      },
    },
  ],
  priority: 23,
  scopeHints: ['projectId'],
};

export const adminSystemNode: MenuOntologyNode = {
  nodeId: 'admin-system',
  label: '시스템 관리',
  route: '/admin-system',
  icon: 'UserCog',
  domain: 'admin',
  requiredCaps: ['admin_system'],
  intents: ['ask_overall_status'],
  canonicalQuestions: [
    '시스템 설정을 변경하고 싶어요.',
    '사용자 계정을 관리하고 싶어요.',
    '시스템 감사 로그를 보고 싶어요.',
    '전체 사용자 목록을 보여주세요.',
  ],
  entities: ['user'],
  keywords: [
    '시스템', 'system', '관리', 'admin', '설정',
    'settings', '사용자', 'user', '계정', 'account',
  ],
  defaultPreset: 'PMO_CONTROL',
  presetPolicies: [
    {
      preset: 'PMO_CONTROL',
      ui: {
        density: 'standard',
        defaultRightPanel: 'closed',
      },
    },
    {
      preset: 'PM_WORK',
      ui: {
        density: 'compact',
        defaultRightPanel: 'closed',
      },
    },
  ],
  priority: 24,
  scopeHints: [],
};

// ─── Aggregated export ──────────────────────────────────────────

/** All 25 menu ontology nodes in a flat array */
export const allOntologyNodes: MenuOntologyNode[] = [
  // Zone 1: Overview
  dashboardNode,
  // Zone 2: Plan & Structure
  requirementsNode,
  backlogNode,
  wbsNode,
  phasesNode,
  // Zone 3: Execution
  kanbanNode,
  sprintsNode,
  myWorkNode,
  // Zone 4: Control
  issuesNode,
  testsNode,
  deliverablesNode,
  decisionsNode,
  // Zone 5: Traceability
  lineageNode,
  // Zone 6: Reports
  reportsNode,
  statisticsNode,
  // Zone 7: PMO / Governance
  pmoNode,
  healthMatrixNode,
  // Zone 8: Audit
  auditEvidenceNode,
  // Zone 9: Collaboration
  meetingsNode,
  announcementsNode,
  // Zone 10: Tools
  aiAssistantNode,
  educationNode,
  // Zone 11: Admin
  adminProjectNode,
  adminSystemNode,
];

/** Lookup map: nodeId -> MenuOntologyNode */
export const ontologyNodeMap: ReadonlyMap<string, MenuOntologyNode> = new Map(
  allOntologyNodes.map((n) => [n.nodeId, n]),
);
