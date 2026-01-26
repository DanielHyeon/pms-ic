import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, LucideIcon } from 'lucide-react';
import { UserRole } from '../../stores/authStore';
import {
  menuConfig,
  getFilteredMenuConfig,
  MenuItem,
  MenuGroup,
  MenuConfig,
} from '../../config/menuConfig';

interface SidebarProps {
  userRole: UserRole;
}

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

const roleLabels: Record<UserRole, string> = {
  sponsor: 'Sponsor',
  pmo_head: 'PMO Head',
  pm: 'Project Manager',
  developer: 'Developer',
  qa: 'QA Engineer',
  business_analyst: 'Business Analyst',
  auditor: 'Auditor',
  admin: 'Administrator',
};

// Menu item component
function MenuItemButton({
  item,
  isActive,
  onClick,
  indent = false,
}: {
  item: MenuItem;
  isActive: boolean;
  onClick: () => void;
  indent?: boolean;
}) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm ${
        indent ? 'pl-10' : ''
      } ${
        isActive
          ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm'
          : 'text-white/70 hover:bg-white/10 hover:text-white'
      }`}
      title={item.description}
    >
      <Icon size={18} />
      <span className="truncate">{item.label}</span>
    </button>
  );
}

// Collapsible menu group component
function MenuGroupSection({
  group,
  expandedGroups,
  onToggle,
  onNavigate,
  currentPath,
}: {
  group: MenuGroup;
  expandedGroups: Set<string>;
  onToggle: (groupId: string) => void;
  onNavigate: (path: string) => void;
  currentPath: string;
}) {
  const isExpanded = expandedGroups.has(group.id);
  const Icon = group.icon;

  // Check if any item in the group is active
  const hasActiveItem = group.items.some((item) => {
    if (item.path === '/') return currentPath === '/';
    return currentPath.startsWith(item.path);
  });

  return (
    <div className="mb-1">
      {/* Group header */}
      <button
        type="button"
        onClick={() => onToggle(group.id)}
        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-all ${
          hasActiveItem
            ? 'bg-white/15 text-white'
            : 'text-white/80 hover:bg-white/10 hover:text-white'
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon size={18} />
          <span className="text-sm font-medium">{group.label}</span>
        </div>
        {isExpanded ? (
          <ChevronDown size={16} className="text-white/60" />
        ) : (
          <ChevronRight size={16} className="text-white/60" />
        )}
      </button>

      {/* Group items (collapsible) */}
      <div
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="mt-1 space-y-0.5">
          {group.items.map((item) => {
            const isActive =
              item.path === '/'
                ? currentPath === '/'
                : currentPath.startsWith(item.path);

            return (
              <MenuItemButton
                key={item.id}
                item={item}
                isActive={isActive}
                onClick={() => onNavigate(item.path)}
                indent
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({ userRole }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Get filtered menu config based on user role
  const filteredMenu = getFilteredMenuConfig(userRole);

  // Initialize expanded groups from defaultExpanded settings
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    menuConfig.groups.forEach((group) => {
      if (group.defaultExpanded) {
        initial.add(group.id);
      }
    });
    return initial;
  });

  // Auto-expand group containing current path
  useEffect(() => {
    filteredMenu.groups.forEach((group) => {
      const hasActiveItem = group.items.some((item) => {
        if (item.path === '/') return location.pathname === '/';
        return location.pathname.startsWith(item.path);
      });
      if (hasActiveItem) {
        setExpandedGroups((prev) => new Set([...prev, group.id]));
      }
    });
  }, [location.pathname]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <aside
      className={`w-64 bg-gradient-to-b ${roleColors[userRole]} text-white flex flex-col`}
    >
      {/* Header */}
      <div className="p-5 border-b border-white/20">
        <h1 className="font-semibold text-lg">InsureTech AI-PMS</h1>
        <p className="text-xs text-white/70 mt-1">Project Management System</p>
      </div>

      {/* User role badge */}
      <div className="px-4 py-2 border-b border-white/10">
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white/20 text-white">
          {roleLabels[userRole]}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto sidebar-scrollbar">
        {/* Standalone items (Dashboard) */}
        {filteredMenu.standalone.map((item) => {
          const isActive =
            item.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.path);

          return (
            <MenuItemButton
              key={item.id}
              item={item}
              isActive={isActive}
              onClick={() => handleNavigate(item.path)}
            />
          );
        })}

        {/* Divider after standalone items */}
        {filteredMenu.standalone.length > 0 && filteredMenu.groups.length > 0 && (
          <div className="my-2 border-t border-white/10" />
        )}

        {/* Menu groups */}
        {filteredMenu.groups.map((group) => (
          <MenuGroupSection
            key={group.id}
            group={group}
            expandedGroups={expandedGroups}
            onToggle={toggleGroup}
            onNavigate={handleNavigate}
            currentPath={location.pathname}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/20">
        <div className="text-xs text-white/60">
          <p>Version 2.1</p>
          <p className="mt-0.5">React 19 + Router v7</p>
        </div>
      </div>
    </aside>
  );
}
