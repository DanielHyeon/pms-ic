import { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, LucideIcon } from 'lucide-react';
import { UserRole } from '../../stores/authStore';
import {
  menuConfig,
  getFilteredMenuConfig,
  MenuItem,
  MenuGroup,
} from '../../config/menuConfig';

interface LegacyMenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface SidebarProps {
  userRole: UserRole;
  // Legacy props for backwards compatibility with App.tsx state-based navigation
  menuItems?: LegacyMenuItem[];
  currentView?: string;
  onViewChange?: React.Dispatch<React.SetStateAction<string>> | ((view: string) => void);
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

// Menu item component for standalone items - memoized to prevent unnecessary re-renders
const MenuItemButton = memo(function MenuItemButton({
  item,
  isActive,
  onClick,
}: {
  item: MenuItem;
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
        isActive
          ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm'
          : 'text-white/70 hover:bg-white/10 hover:text-white'
      }`}
      title={item.description}
    >
      <Icon size={18} aria-hidden="true" />
      <span className="truncate">{item.label}</span>
    </button>
  );
});

// Sub-menu item component with tree line indicator - memoized
const SubMenuItemButton = memo(function SubMenuItemButton({
  item,
  isActive,
  isLast,
  onClick,
}: {
  item: MenuItem;
  isActive: boolean;
  isLast: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;

  return (
    <div className="relative flex items-center">
      {/* Tree line guide */}
      <div className="absolute left-6 top-0 bottom-0 flex items-center" aria-hidden="true">
        {/* Vertical line - full height for non-last items, half for last */}
        <div
          className={`absolute left-0 w-px bg-white/30 ${
            isLast ? 'top-0 h-1/2' : 'top-0 bottom-0'
          }`}
        />
        {/* Horizontal connector line */}
        <div className="absolute left-0 w-3 h-px bg-white/30" />
        {/* Active indicator dot */}
        {isActive && (
          <div className="absolute left-[-3px] w-[7px] h-[7px] rounded-full bg-white shadow-sm shadow-white/50" />
        )}
      </div>
      <button
        type="button"
        onClick={onClick}
        aria-current={isActive ? 'page' : undefined}
        className={`flex-1 flex items-center gap-2.5 ml-10 pl-3 pr-3 py-2 rounded-lg transition-all text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
          isActive
            ? 'bg-white/20 text-white border-l-2 border-white'
            : 'text-white/70 hover:bg-white/10 hover:text-white'
        }`}
        title={item.description}
      >
        <Icon size={16} aria-hidden="true" />
        <span className="truncate">{item.label}</span>
      </button>
    </div>
  );
});

// Collapsible menu group component - memoized
const MenuGroupSection = memo(function MenuGroupSection({
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
  const panelId = `menu-panel-${group.id}`;

  // Check if any item in the group is active
  const hasActiveItem = useMemo(
    () =>
      group.items.some((item) => {
        if (item.path === '/') return currentPath === '/';
        return currentPath.startsWith(item.path);
      }),
    [group.items, currentPath]
  );

  const handleToggle = useCallback(() => {
    onToggle(group.id);
  }, [onToggle, group.id]);

  return (
    <div className="mb-1">
      {/* Group header */}
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={isExpanded ? 'true' : 'false'}
        aria-controls={panelId}
        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
          hasActiveItem
            ? 'bg-white/15 text-white'
            : 'text-white/80 hover:bg-white/10 hover:text-white'
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon size={18} aria-hidden="true" />
          <span className="text-sm font-medium">{group.label}</span>
        </div>
        {isExpanded ? (
          <ChevronDown size={16} className="text-white/60" aria-hidden="true" />
        ) : (
          <ChevronRight size={16} className="text-white/60" aria-hidden="true" />
        )}
      </button>

      {/* Group items (collapsible) with tree line */}
      <div
        id={panelId}
        role="region"
        aria-label={`${group.label} submenu`}
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="mt-1 relative">
          {group.items.map((item, index) => {
            const isActive =
              item.path === '/'
                ? currentPath === '/'
                : currentPath.startsWith(item.path);
            const isLast = index === group.items.length - 1;

            return (
              <SubMenuItemButton
                key={item.id}
                item={item}
                isActive={isActive}
                isLast={isLast}
                onClick={() => onNavigate(item.path)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default function Sidebar({ userRole, menuItems, currentView, onViewChange }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine if using legacy prop-based navigation
  const useLegacyNav = !!(menuItems && onViewChange);

  // Get filtered menu config based on user role - memoized
  const filteredMenu = useMemo(() => getFilteredMenuConfig(userRole), [userRole]);

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
  }, [location.pathname, filteredMenu.groups]);

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  const handleNavigate = useCallback(
    (path: string) => {
      if (useLegacyNav && onViewChange) {
        // Extract view name from path for legacy navigation
        const viewName = path === '/' ? 'dashboard' : path.replace('/', '');
        onViewChange(viewName);
      } else {
        navigate(path);
      }
    },
    [useLegacyNav, onViewChange, navigate]
  );

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
      <nav aria-label="Main navigation" className="flex-1 p-3 space-y-1 overflow-y-auto sidebar-scrollbar">
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
