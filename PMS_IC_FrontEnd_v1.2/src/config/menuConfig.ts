// Menu configuration — ontology-based, capability-driven menu system.
// Organises 30 MenuOntologyNodes into 11 zones and provides helpers
// for filtering by capability, intent search, and backward-compat
// role-based access checks.

import {
  LayoutDashboard,
  ClipboardList,
  ListTodo,
  CalendarDays,
  GitBranch,
  Kanban,
  Timer,
  UserCheck,
  AlertCircle,
  TestTube,
  Package,
  Scale,
  History,
  BarChart3,
  PieChart,
  Gauge,
  Activity,
  Shield,
  MessageSquare,
  Megaphone,
  Bot,
  GraduationCap,
  Settings,
  UserCog,
  Briefcase,
  FileSearch,
  Users,
  ShieldCheck,
  UserPlus,
  Crown,
  ChevronDown,
  ChevronRight,
  LucideIcon,
} from 'lucide-react';

import type {
  MenuOntologyNode,
  MenuDomain,
  Capability,
  IntentTag,
} from '../types/menuOntology';

import {
  dashboardNode,
  rfpNode,
  requirementsNode,
  backlogNode,
  wbsNode,
  phasesNode,
  kanbanNode,
  sprintsNode,
  myWorkNode,
  issuesNode,
  testsNode,
  deliverablesNode,
  decisionsNode,
  lineageNode,
  reportsNode,
  statisticsNode,
  pmoNode,
  healthMatrixNode,
  auditEvidenceNode,
  meetingsNode,
  announcementsNode,
  aiAssistantNode,
  educationNode,
  projectsNode,
  partsNode,
  rolesNode,
  userManagementNode,
  adminProjectNode,
  adminSystemNode,
  projectManagementNode,
  rolePermissionNode,
  allOntologyNodes,
  ontologyNodeMap,
} from './menuOntologyNodes';

// Re-export for convenience
export { allOntologyNodes, ontologyNodeMap };

// ─── Icon Mapping ───────────────────────────────────────────────

/** Maps nodeId to its Lucide icon component */
export const nodeIconMap: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  rfp: FileSearch,
  requirements: ClipboardList,
  backlog: ListTodo,
  wbs: CalendarDays,
  phases: GitBranch,
  kanban: Kanban,
  sprints: Timer,
  'my-work': UserCheck,
  issues: AlertCircle,
  tests: TestTube,
  deliverables: Package,
  decisions: Scale,
  lineage: History,
  reports: BarChart3,
  statistics: PieChart,
  pmo: Gauge,
  'health-matrix': Activity,
  'audit-evidence': Shield,
  meetings: MessageSquare,
  announcements: Megaphone,
  'ai-assistant': Bot,
  education: GraduationCap,
  projects: Briefcase,
  parts: Users,
  roles: ShieldCheck,
  'user-management': UserPlus,
  'project-management': Crown,
  'role-permission': ShieldCheck,
  'admin-project': Settings,
  'admin-system': UserCog,
};

/** Zone-level icon mapping (uses the primary node icon) */
const zoneIconMap: Record<string, LucideIcon> = {
  overview: LayoutDashboard,
  plan: ClipboardList,
  execution: Kanban,
  control: AlertCircle,
  trace: History,
  reports: BarChart3,
  governance: Gauge,
  audit: Shield,
  collaboration: MessageSquare,
  tools: Bot,
  admin: Settings,
};

// ─── MenuZone Interface ─────────────────────────────────────────

export interface MenuZone {
  id: string;
  label: string;
  icon: LucideIcon;
  domain: MenuDomain;
  nodes: MenuOntologyNode[];
  defaultExpanded?: boolean;
}

// ─── Legacy Types (backward compat) ─────────────────────────────

export interface MenuItem {
  id: string;
  path: string;
  label: string;
  icon: LucideIcon;
  description?: string;
}

export interface MenuGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  zone: string;
  items: MenuItem[];
  defaultExpanded?: boolean;
}

export interface MenuConfig {
  standalone: MenuItem[];
  groups: MenuGroup[];
}

// ─── 11 Menu Zones ──────────────────────────────────────────────

export const menuZones: MenuZone[] = [
  {
    id: 'zone-overview',
    label: '개요',
    icon: LayoutDashboard,
    domain: 'overview',
    nodes: [dashboardNode],
    defaultExpanded: true,
  },
  {
    id: 'zone-plan',
    label: '계획 및 구조',
    icon: ClipboardList,
    domain: 'plan',
    nodes: [rfpNode, requirementsNode, backlogNode, wbsNode, phasesNode],
    defaultExpanded: false,
  },
  {
    id: 'zone-execution',
    label: '실행 관리',
    icon: Kanban,
    domain: 'execution',
    nodes: [kanbanNode, sprintsNode, myWorkNode],
    defaultExpanded: true,
  },
  {
    id: 'zone-control',
    label: '통제 관리',
    icon: AlertCircle,
    domain: 'control',
    nodes: [issuesNode, testsNode, deliverablesNode, decisionsNode],
    defaultExpanded: false,
  },
  {
    id: 'zone-trace',
    label: '추적성',
    icon: History,
    domain: 'trace',
    nodes: [lineageNode],
    defaultExpanded: false,
  },
  {
    id: 'zone-reports',
    label: '리포트',
    icon: BarChart3,
    domain: 'reports',
    nodes: [reportsNode, statisticsNode],
    defaultExpanded: false,
  },
  {
    id: 'zone-governance',
    label: 'PMO / 거버넌스',
    icon: Gauge,
    domain: 'governance',
    nodes: [pmoNode, healthMatrixNode, projectManagementNode, rolePermissionNode],
    defaultExpanded: false,
  },
  {
    id: 'zone-audit',
    label: '감사',
    icon: Shield,
    domain: 'audit',
    nodes: [auditEvidenceNode],
    defaultExpanded: false,
  },
  {
    id: 'zone-collaboration',
    label: '협업',
    icon: MessageSquare,
    domain: 'collaboration',
    nodes: [meetingsNode, announcementsNode],
    defaultExpanded: false,
  },
  {
    id: 'zone-tools',
    label: '도구',
    icon: Bot,
    domain: 'tools',
    nodes: [aiAssistantNode, educationNode],
    defaultExpanded: false,
  },
  {
    id: 'zone-admin',
    label: '관리',
    icon: Settings,
    domain: 'admin',
    nodes: [projectsNode, partsNode, rolesNode, userManagementNode, adminProjectNode, adminSystemNode],
    defaultExpanded: false,
  },
];

// ─── Capability-Based Helpers ───────────────────────────────────

/**
 * Checks whether a user with the given capabilities can access a node.
 * Access requires at least one of the node's requiredCaps.
 */
export function canAccessNode(
  node: MenuOntologyNode,
  capabilities: Set<Capability> | Capability[],
): boolean {
  const capSet = capabilities instanceof Set ? capabilities : new Set(capabilities);
  if (node.requiredCaps.length === 0) return true;
  return node.requiredCaps.some((cap) => capSet.has(cap));
}

/**
 * Returns zones with only the nodes accessible to the given capabilities.
 * Empty zones are removed entirely.
 */
export function getVisibleZones(capabilities: Set<Capability> | Capability[]): MenuZone[] {
  const capSet = capabilities instanceof Set ? capabilities : new Set(capabilities);

  return menuZones
    .map((zone) => ({
      ...zone,
      nodes: zone.nodes.filter((node) => canAccessNode(node, capSet)),
    }))
    .filter((zone) => zone.nodes.length > 0);
}

/**
 * Finds a single ontology node by its nodeId.
 */
export function findNodeById(nodeId: string): MenuOntologyNode | undefined {
  return ontologyNodeMap.get(nodeId);
}

/**
 * Finds all ontology nodes that include the given intent tag.
 * Sorted by priority (ascending — lower number = higher priority).
 */
export function findNodesByIntent(intent: IntentTag): MenuOntologyNode[] {
  return allOntologyNodes
    .filter((node) => node.intents.includes(intent))
    .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
}

/**
 * Returns the LucideIcon component for a given nodeId.
 */
export function getNodeIcon(nodeId: string): LucideIcon {
  return nodeIconMap[nodeId] || LayoutDashboard;
}

// ─── Backward-Compat: Legacy Menu Config ────────────────────────

// Role-to-menuId access mapping (preserved from original menuConfig)
import { UserRole } from '../stores/authStore';

const menuAccessByRole: Record<UserRole, string[]> = {
  sponsor: [
    'dashboard', 'rfp', 'requirements', 'lineage', 'phases',
    'reports', 'statistics', 'pmo', 'education', 'settings',
    'backlog', 'wbs', 'kanban', 'issues', 'tests',
    'deliverables', 'decisions', 'meetings', 'announcements',
    'project-management',
  ],
  pmo_head: [
    'dashboard', 'rfp', 'requirements', 'backlog', 'wbs', 'phases',
    'kanban', 'sprints', 'issues', 'tests', 'deliverables',
    'decisions', 'lineage', 'reports', 'statistics', 'pmo',
    'health-matrix', 'audit-evidence', 'meetings', 'announcements',
    'ai-assistant', 'education', 'projects', 'parts', 'roles',
    'user-management', 'admin-project', 'admin-system',
    'project-management',
    'role-permission',
  ],
  pm: [
    'dashboard', 'rfp', 'requirements', 'backlog', 'wbs', 'phases',
    'kanban', 'sprints', 'my-work', 'issues', 'tests',
    'deliverables', 'decisions', 'lineage', 'reports', 'statistics',
    'pmo', 'health-matrix', 'meetings', 'announcements',
    'ai-assistant', 'education', 'projects', 'parts', 'roles',
    'admin-project', 'project-management',
    'role-permission',
  ],
  developer: [
    'dashboard', 'requirements', 'backlog', 'wbs', 'phases',
    'kanban', 'sprints', 'my-work', 'issues', 'tests',
    'deliverables', 'decisions', 'lineage', 'reports',
    'meetings', 'announcements', 'ai-assistant', 'education',
  ],
  qa: [
    'dashboard', 'requirements', 'backlog', 'kanban', 'sprints',
    'issues', 'tests', 'deliverables', 'lineage', 'reports',
    'meetings', 'announcements', 'ai-assistant', 'education',
  ],
  business_analyst: [
    'dashboard', 'rfp', 'requirements', 'backlog', 'phases', 'issues',
    'lineage', 'reports', 'statistics', 'meetings', 'announcements',
    'ai-assistant', 'education',
  ],
  auditor: [
    'dashboard', 'requirements', 'phases', 'deliverables',
    'lineage', 'reports', 'statistics', 'pmo', 'audit-evidence',
    'announcements',
  ],
  admin: [
    'dashboard', 'rfp', 'requirements', 'backlog', 'wbs', 'phases',
    'kanban', 'sprints', 'my-work', 'issues', 'tests',
    'deliverables', 'decisions', 'lineage', 'reports', 'statistics',
    'pmo', 'health-matrix', 'audit-evidence', 'meetings',
    'announcements', 'ai-assistant', 'education', 'projects',
    'parts', 'roles', 'user-management',
    'admin-project', 'admin-system', 'project-management',
    'role-permission',
  ],
};

/**
 * Backward-compatible menu access check.
 * Maps old role strings to menu IDs internally.
 */
export function canAccessMenu(role: UserRole | string | undefined, menuId: string): boolean {
  if (!role) return false;
  const normalised = role.toLowerCase() as UserRole;
  return menuAccessByRole[normalised]?.includes(menuId) ?? false;
}

/**
 * Legacy helper: returns a MenuConfig (standalone + groups) filtered by role.
 * Used by existing Sidebar code paths that have not yet migrated to zone-based rendering.
 */
export function getFilteredMenuConfig(role: UserRole): MenuConfig {
  const accessibleMenuIds = menuAccessByRole[role] || [];

  const standalone: MenuItem[] = menuZones
    .flatMap((z) => z.nodes)
    .filter((n) => n.nodeId === 'dashboard' && accessibleMenuIds.includes(n.nodeId))
    .map((n) => ({
      id: n.nodeId,
      path: n.route,
      label: n.label,
      icon: nodeIconMap[n.nodeId] || LayoutDashboard,
      description: n.canonicalQuestions[0],
    }));

  const groups: MenuGroup[] = menuZones
    .filter((z) => z.domain !== 'overview')
    .map((zone) => ({
      id: zone.id,
      label: zone.label,
      icon: zone.icon,
      zone: zone.domain.toUpperCase(),
      defaultExpanded: zone.defaultExpanded,
      items: zone.nodes
        .filter((n) => accessibleMenuIds.includes(n.nodeId))
        .map((n) => ({
          id: n.nodeId,
          path: n.route,
          label: n.label,
          icon: nodeIconMap[n.nodeId] || LayoutDashboard,
          description: n.canonicalQuestions[0],
        })),
    }))
    .filter((g) => g.items.length > 0);

  return { standalone, groups };
}

// Legacy menuConfig object for code that imports `menuConfig.groups`
export const menuConfig: MenuConfig = getFilteredMenuConfig('admin');

// Re-export chevron icons for external use
export { ChevronDown, ChevronRight };

// Re-export menuAccessByRole for authStore backward compat
export { menuAccessByRole };
