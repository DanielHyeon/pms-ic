import {
  LayoutDashboard,
  Briefcase,
  Network,
  Users,
  FileText,
  ClipboardList,
  GitGraph,
  GitBranch,
  CalendarDays,
  ListTodo,
  Kanban,
  TestTube,
  AlertCircle,
  Package,
  MessageSquare,
  Megaphone,
  Bot,
  GraduationCap,
  History,
  BarChart3,
  PieChart,
  Settings,
  UserCog,
  Shield,
  LucideIcon,
  ChevronDown,
  ChevronRight,
  Gauge,
} from 'lucide-react';
import { UserRole } from '../stores/authStore';

// Menu item types
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

// Complete menu configuration following the 9-zone structure
export const menuConfig: MenuConfig = {
  // Standalone items (not grouped)
  standalone: [
    {
      id: 'dashboard',
      path: '/',
      label: '통합 대시보드',
      icon: LayoutDashboard,
      description: '프로젝트 현황 및 KPI 한눈에 보기',
    },
  ],

  // Grouped menu items
  groups: [
    // Zone 2: Project Setup
    {
      id: 'project-setup',
      label: '프로젝트 설정',
      icon: Briefcase,
      zone: 'SETUP',
      defaultExpanded: false,
      items: [
        {
          id: 'projects',
          path: '/projects',
          label: '프로젝트 목록',
          icon: Briefcase,
        },
        {
          id: 'parts',
          path: '/parts',
          label: '파트/조직 설정',
          icon: Network,
        },
        {
          id: 'roles',
          path: '/roles',
          label: '팀원 및 권한',
          icon: Users,
        },
      ],
    },

    // Zone 3: Requirements Management
    {
      id: 'requirements-mgmt',
      label: '요구사항 관리',
      icon: ClipboardList,
      zone: 'PLANNING',
      defaultExpanded: false,
      items: [
        {
          id: 'rfp',
          path: '/rfp',
          label: 'RFP 관리',
          icon: FileText,
        },
        {
          id: 'requirements',
          path: '/requirements',
          label: '요구사항 정의',
          icon: ClipboardList,
        },
        {
          id: 'traceability',
          path: '/traceability',
          label: '추적 매트릭스',
          icon: GitGraph,
        },
      ],
    },

    // Zone 4: Execution Management
    {
      id: 'execution-mgmt',
      label: '실행 관리',
      icon: GitBranch,
      zone: 'EXECUTION',
      defaultExpanded: true,
      items: [
        {
          id: 'phases',
          path: '/phases',
          label: '단계별 관리',
          icon: GitBranch,
        },
        {
          id: 'wbs',
          path: '/wbs',
          label: '일정 관리 (WBS)',
          icon: CalendarDays,
        },
        {
          id: 'backlog',
          path: '/backlog',
          label: '백로그 관리',
          icon: ListTodo,
        },
        {
          id: 'kanban',
          path: '/kanban',
          label: '칸반 보드',
          icon: Kanban,
        },
      ],
    },

    // Zone 5: Quality Management
    {
      id: 'quality-mgmt',
      label: '품질 관리',
      icon: TestTube,
      zone: 'VERIFICATION',
      defaultExpanded: false,
      items: [
        {
          id: 'testing',
          path: '/testing',
          label: '테스트 관리',
          icon: TestTube,
        },
        {
          id: 'issues',
          path: '/issues',
          label: '이슈 관리',
          icon: AlertCircle,
        },
        {
          id: 'deliverables',
          path: '/deliverables',
          label: '산출물 관리',
          icon: Package,
        },
      ],
    },

    // Zone 6: Collaboration
    {
      id: 'collaboration',
      label: '협업',
      icon: MessageSquare,
      zone: 'COMMUNICATION',
      defaultExpanded: false,
      items: [
        {
          id: 'meetings',
          path: '/meetings',
          label: '회의 관리',
          icon: MessageSquare,
        },
        {
          id: 'announcements',
          path: '/announcements',
          label: '공지사항',
          icon: Megaphone,
        },
        {
          id: 'ai-assistant',
          path: '/ai-assistant',
          label: 'AI 어시스턴트',
          icon: Bot,
        },
      ],
    },

    // Zone 7: Education Management
    {
      id: 'education-mgmt',
      label: '교육 관리',
      icon: GraduationCap,
      zone: 'CAPABILITY',
      defaultExpanded: false,
      items: [
        {
          id: 'education',
          path: '/education',
          label: '교육 로드맵',
          icon: GraduationCap,
        },
      ],
    },

    // Zone 8: Analytics & Reports
    {
      id: 'analytics',
      label: '분석 및 리포트',
      icon: BarChart3,
      zone: 'INSIGHT',
      defaultExpanded: false,
      items: [
        {
          id: 'pmo-console',
          path: '/pmo-console',
          label: 'PMO 대시보드',
          icon: Gauge,
        },
        {
          id: 'lineage',
          path: '/lineage',
          label: 'Lineage & History',
          icon: History,
        },
        {
          id: 'reports',
          path: '/reports',
          label: '프로젝트 리포트',
          icon: BarChart3,
        },
        {
          id: 'statistics',
          path: '/statistics',
          label: '통계 대시보드',
          icon: PieChart,
        },
      ],
    },

    // Zone 9: Settings
    {
      id: 'admin-settings',
      label: '설정',
      icon: Settings,
      zone: 'ADMIN',
      defaultExpanded: false,
      items: [
        {
          id: 'user-management',
          path: '/user-management',
          label: '사용자 관리',
          icon: UserCog,
        },
        {
          id: 'system-settings',
          path: '/system-settings',
          label: '시스템 설정',
          icon: Settings,
        },
        {
          id: 'audit-logs',
          path: '/audit-logs',
          label: '감사 로그',
          icon: Shield,
        },
        {
          id: 'settings',
          path: '/settings',
          label: '개인 설정',
          icon: Settings,
        },
      ],
    },
  ],
};

// Role-based menu access configuration (updated for new structure)
export const menuAccessByRole: Record<UserRole, string[]> = {
  sponsor: [
    'dashboard',
    'rfp',
    'requirements',
    'traceability',
    'lineage',
    'phases',
    'reports',
    'statistics',
    'pmo-console',
    'roles',
    'education',
    'settings',
  ],
  pmo_head: [
    'dashboard',
    'projects',
    'parts',
    'roles',
    'rfp',
    'requirements',
    'traceability',
    'phases',
    'wbs',
    'backlog',
    'kanban',
    'testing',
    'issues',
    'deliverables',
    'meetings',
    'announcements',
    'ai-assistant',
    'education',
    'pmo-console',
    'lineage',
    'reports',
    'statistics',
    'user-management',
    'system-settings',
    'audit-logs',
    'settings',
  ],
  pm: [
    'dashboard',
    'parts',
    'rfp',
    'requirements',
    'traceability',
    'phases',
    'wbs',
    'backlog',
    'kanban',
    'testing',
    'issues',
    'deliverables',
    'meetings',
    'announcements',
    'ai-assistant',
    'education',
    'pmo-console',
    'lineage',
    'reports',
    'statistics',
    'settings',
  ],
  developer: [
    'dashboard',
    'requirements',
    'backlog',
    'kanban',
    'testing',
    'issues',
    'ai-assistant',
    'education',
    'lineage',
    'reports',
    'settings',
  ],
  qa: [
    'dashboard',
    'requirements',
    'backlog',
    'kanban',
    'testing',
    'issues',
    'deliverables',
    'ai-assistant',
    'education',
    'lineage',
    'reports',
    'settings',
  ],
  business_analyst: [
    'dashboard',
    'rfp',
    'requirements',
    'traceability',
    'phases',
    'backlog',
    'meetings',
    'ai-assistant',
    'education',
    'lineage',
    'reports',
    'statistics',
    'settings',
  ],
  auditor: [
    'dashboard',
    'requirements',
    'traceability',
    'phases',
    'deliverables',
    'lineage',
    'reports',
    'statistics',
    'audit-logs',
    'settings',
  ],
  admin: [
    'dashboard',
    'projects',
    'parts',
    'roles',
    'rfp',
    'requirements',
    'traceability',
    'phases',
    'wbs',
    'backlog',
    'kanban',
    'testing',
    'issues',
    'deliverables',
    'meetings',
    'announcements',
    'ai-assistant',
    'education',
    'pmo-console',
    'lineage',
    'reports',
    'statistics',
    'user-management',
    'system-settings',
    'audit-logs',
    'settings',
  ],
};

// Helper function to check menu access
export function canAccessMenu(role: UserRole | undefined, menuId: string): boolean {
  if (!role) return false;
  return menuAccessByRole[role]?.includes(menuId) ?? false;
}

// Helper function to filter menu groups by role
export function getFilteredMenuConfig(role: UserRole): MenuConfig {
  const accessibleMenuIds = menuAccessByRole[role] || [];

  return {
    standalone: menuConfig.standalone.filter((item) => accessibleMenuIds.includes(item.id)),
    groups: menuConfig.groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => accessibleMenuIds.includes(item.id)),
      }))
      .filter((group) => group.items.length > 0),
  };
}

// Export icons for external use
export { ChevronDown, ChevronRight };
