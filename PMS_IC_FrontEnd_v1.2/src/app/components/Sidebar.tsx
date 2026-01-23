import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  GitBranch,
  Kanban,
  ListTodo,
  Users,
  Settings as SettingsIcon,
  GraduationCap,
  FolderOpen,
  Briefcase,
  Network,
  FileText,
  ClipboardList,
  History,
  LucideIcon,
} from 'lucide-react';
import { UserRole, menuAccessByRole } from '../../stores/authStore';

interface MenuItem {
  id: string;
  path: string;
  label: string;
  icon: LucideIcon;
}

interface SidebarProps {
  userRole: UserRole;
}

const allMenuItems: MenuItem[] = [
  { id: 'dashboard', path: '/', label: '통합 대시보드', icon: LayoutDashboard },
  { id: 'projects', path: '/projects', label: '프로젝트 관리', icon: Briefcase },
  { id: 'parts', path: '/parts', label: '파트 관리', icon: Network },
  { id: 'rfp', path: '/rfp', label: 'RFP 관리', icon: FileText },
  { id: 'requirements', path: '/requirements', label: '요구사항 관리', icon: ClipboardList },
  { id: 'lineage', path: '/lineage', label: 'Lineage & History', icon: History },
  { id: 'phases', path: '/phases', label: '단계별 관리', icon: GitBranch },
  { id: 'kanban', path: '/kanban', label: '칸반 보드', icon: Kanban },
  { id: 'backlog', path: '/backlog', label: '백로그 관리', icon: ListTodo },
  { id: 'roles', path: '/roles', label: '권한 관리', icon: Users },
  { id: 'common', path: '/common', label: '공통 관리', icon: FolderOpen },
  { id: 'education', path: '/education', label: '교육 관리', icon: GraduationCap },
  { id: 'settings', path: '/settings', label: '설정', icon: SettingsIcon },
];

const roleColors: Record<UserRole, string> = {
  sponsor: 'from-purple-500 to-purple-700',
  pmo_head: 'from-indigo-500 to-indigo-700',
  pm: 'from-blue-500 to-blue-700',
  developer: 'from-green-500 to-green-700',
  qa: 'from-teal-500 to-teal-700',
  business_analyst: 'from-amber-500 to-amber-700',
  auditor: 'from-gray-500 to-gray-700',
  admin: 'from-red-500 to-red-700',
};

export default function Sidebar({ userRole }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Filter menu items based on user role
  const accessibleMenuIds = menuAccessByRole[userRole] || [];
  const menuItems = allMenuItems.filter((item) => accessibleMenuIds.includes(item.id));

  const isActive = (item: MenuItem) => {
    if (item.path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(item.path);
  };

  return (
    <aside className={`w-64 bg-gradient-to-b ${roleColors[userRole]} text-white flex flex-col`}>
      <div className="p-6 border-b border-white/20">
        <h1 className="font-semibold text-xl">InsureTech AI-PMS</h1>
        <p className="text-xs text-white/70 mt-1">Project Management System</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                active
                  ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/20">
        <div className="text-xs text-white/70">
          <p>Version 2.0</p>
          <p className="mt-1">React 19 + Router v7</p>
        </div>
      </div>
    </aside>
  );
}
