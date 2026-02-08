import { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { UserRole } from '../../stores/authStore';
import { useCapabilities } from '../../hooks/useCapabilities';
import { usePreset } from '../../hooks/usePreset';
import {
  getVisibleZones,
  getNodeIcon,
  MenuZone,
} from '../../config/menuConfig';
import type { MenuOntologyNode, ViewModePreset } from '../../types/menuOntology';

// ─── Props ──────────────────────────────────────────────────────

interface SidebarProps {
  userRole: UserRole;
  currentView?: string;
  onViewChange?: (view: string) => void;
}

// ─── Role Styling ───────────────────────────────────────────────

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

// Preset display labels
const presetLabels: Record<ViewModePreset, string> = {
  EXEC_SUMMARY: 'Executive',
  PMO_CONTROL: 'PMO',
  PM_WORK: 'PM',
  DEV_EXECUTION: 'Dev',
  CUSTOMER_APPROVAL: 'Customer',
  AUDIT_EVIDENCE: 'Audit',
};

// ─── PresetSwitcher ─────────────────────────────────────────────

const PresetSwitcher = memo(function PresetSwitcher({
  currentPreset,
  onSwitch,
  onReset,
  defaultPreset,
}: {
  currentPreset: ViewModePreset;
  onSwitch: (preset: ViewModePreset) => void;
  onReset: () => void;
  defaultPreset: ViewModePreset;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const presets: ViewModePreset[] = [
    'EXEC_SUMMARY',
    'PMO_CONTROL',
    'PM_WORK',
    'DEV_EXECUTION',
    'CUSTOMER_APPROVAL',
    'AUDIT_EVIDENCE',
  ];

  const handleSelect = useCallback(
    (preset: ViewModePreset) => {
      onSwitch(preset);
      setIsOpen(false);
    },
    [onSwitch],
  );

  const handleReset = useCallback(() => {
    onReset();
    setIsOpen(false);
  }, [onReset]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen ? 'true' : 'false'}
        aria-haspopup="menu"
        aria-label="View mode preset selector"
        className="w-full flex items-center justify-between px-3 py-1.5 rounded-md text-xs bg-white/10 hover:bg-white/20 text-white/90 transition-colors"
      >
        <span className="font-medium">
          {presetLabels[currentPreset]}
        </span>
        <ChevronDown
          size={12}
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Select view mode preset"
          className="absolute left-0 right-0 mt-1 bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-xl border border-white/10 py-1 z-50"
        >
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              role="menuitem"
              aria-current={preset === currentPreset ? 'true' : undefined}
              onClick={() => handleSelect(preset)}
              className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                preset === currentPreset
                  ? 'bg-white/20 text-white font-medium'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              {presetLabels[preset]}
              {preset === defaultPreset && (
                <span className="ml-1 text-white/40">(default)</span>
              )}
            </button>
          ))}
          {currentPreset !== defaultPreset && (
            <>
              <div className="my-1 border-t border-white/10" role="separator" />
              <button
                type="button"
                role="menuitem"
                onClick={handleReset}
                className="w-full text-left px-3 py-1.5 text-xs text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              >
                Reset to default
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
});

// ─── Standalone Node Button (Dashboard) ─────────────────────────

const StandaloneNodeButton = memo(function StandaloneNodeButton({
  node,
  isActive,
  onClick,
}: {
  node: MenuOntologyNode;
  isActive: boolean;
  onClick: () => void;
}) {
  const Icon = getNodeIcon(node.nodeId);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      aria-label={node.label}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${
        isActive
          ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm'
          : 'text-white/70 hover:bg-white/10 hover:text-white'
      }`}
      title={node.canonicalQuestions[0]}
    >
      <Icon size={18} aria-hidden="true" />
      <span className="truncate">{node.label}</span>
    </button>
  );
});

// ─── Sub-menu Node Button (with tree line) ──────────────────────

const SubMenuNodeButton = memo(function SubMenuNodeButton({
  node,
  isActive,
  isLast,
  onClick,
}: {
  node: MenuOntologyNode;
  isActive: boolean;
  isLast: boolean;
  onClick: () => void;
}) {
  const Icon = getNodeIcon(node.nodeId);

  return (
    <div className="relative flex items-center">
      {/* Tree line guide */}
      <div className="absolute left-6 top-0 bottom-0 flex items-center" aria-hidden="true">
        {/* Vertical line */}
        <div
          className={`absolute left-0 w-px bg-white/30 ${
            isLast ? 'top-0 h-1/2' : 'top-0 bottom-0'
          }`}
        />
        {/* Horizontal connector */}
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
        aria-label={node.label}
        className={`flex-1 flex items-center gap-2.5 ml-10 pl-3 pr-3 py-2 rounded-lg transition-all text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
          isActive
            ? 'bg-white/20 text-white border-l-2 border-white'
            : 'text-white/70 hover:bg-white/10 hover:text-white'
        }`}
        title={node.canonicalQuestions[0]}
      >
        <Icon size={16} aria-hidden="true" />
        <span className="truncate">{node.label}</span>
      </button>
    </div>
  );
});

// ─── Zone Section (collapsible group) ───────────────────────────

const ZoneSection = memo(function ZoneSection({
  zone,
  expandedZones,
  onToggle,
  onNavigate,
  currentView,
}: {
  zone: MenuZone;
  expandedZones: Set<string>;
  onToggle: (zoneId: string) => void;
  onNavigate: (nodeId: string) => void;
  currentView: string;
}) {
  const isExpanded = expandedZones.has(zone.id);
  const Icon = zone.icon;
  const panelId = `zone-panel-${zone.id}`;

  // Single-node zones render as a standalone item (no expand/collapse)
  if (zone.nodes.length === 1) {
    const node = zone.nodes[0];
    const isActive = currentView === node.nodeId;
    return (
      <StandaloneNodeButton
        node={node}
        isActive={isActive}
        onClick={() => onNavigate(node.nodeId)}
      />
    );
  }

  // Check if any node in the zone is active
  const hasActiveNode = useMemo(
    () => zone.nodes.some((node) => currentView === node.nodeId),
    [zone.nodes, currentView],
  );

  const handleToggle = useCallback(() => {
    onToggle(zone.id);
  }, [onToggle, zone.id]);

  return (
    <div className="mb-1">
      {/* Zone header */}
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={isExpanded ? 'true' : 'false'}
        aria-controls={panelId}
        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 ${
          hasActiveNode
            ? 'bg-white/15 text-white'
            : 'text-white/80 hover:bg-white/10 hover:text-white'
        }`}
      >
        <div className="flex items-center gap-3">
          <Icon size={18} aria-hidden="true" />
          <span className="text-sm font-medium">{zone.label}</span>
        </div>
        {isExpanded ? (
          <ChevronDown size={16} className="text-white/60" aria-hidden="true" />
        ) : (
          <ChevronRight size={16} className="text-white/60" aria-hidden="true" />
        )}
      </button>

      {/* Zone items (collapsible) with tree line */}
      <div
        id={panelId}
        role="region"
        aria-label={`${zone.label} submenu`}
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          isExpanded ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="mt-1 relative">
          {zone.nodes.map((node, index) => {
            const isActive = currentView === node.nodeId;
            const isLast = index === zone.nodes.length - 1;

            return (
              <SubMenuNodeButton
                key={node.nodeId}
                node={node}
                isActive={isActive}
                isLast={isLast}
                onClick={() => onNavigate(node.nodeId)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
});

// ─── Sidebar (main component) ───────────────────────────────────

export default function Sidebar({
  userRole,
  currentView = 'dashboard',
  onViewChange,
}: SidebarProps) {
  // Derive capabilities and preset from role
  const capRoleKey = userRole.toUpperCase();
  const { capabilities } = useCapabilities(capRoleKey);
  const { currentPreset, switchPreset, resetToDefault, defaultPreset } = usePreset(capRoleKey);

  // Compute visible zones based on user capabilities
  const visibleZones = useMemo(
    () => getVisibleZones(capabilities),
    [capabilities],
  );

  // Separate the single-node "overview" zone (dashboard) as standalone
  const overviewZone = useMemo(
    () => visibleZones.find((z) => z.domain === 'overview'),
    [visibleZones],
  );
  const groupedZones = useMemo(
    () => visibleZones.filter((z) => z.domain !== 'overview'),
    [visibleZones],
  );

  // Initialize expanded zones from defaultExpanded settings
  const [expandedZones, setExpandedZones] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    visibleZones.forEach((zone) => {
      if (zone.defaultExpanded) {
        initial.add(zone.id);
      }
    });
    return initial;
  });

  // Auto-expand zone containing active view
  useEffect(() => {
    visibleZones.forEach((zone) => {
      const hasActiveNode = zone.nodes.some((node) => currentView === node.nodeId);
      if (hasActiveNode) {
        setExpandedZones((prev) => {
          if (prev.has(zone.id)) return prev;
          return new Set([...prev, zone.id]);
        });
      }
    });
  }, [currentView, visibleZones]);

  const toggleZone = useCallback((zoneId: string) => {
    setExpandedZones((prev) => {
      const next = new Set(prev);
      if (next.has(zoneId)) {
        next.delete(zoneId);
      } else {
        next.add(zoneId);
      }
      return next;
    });
  }, []);

  const handleNavigate = useCallback(
    (nodeId: string) => {
      if (onViewChange) {
        onViewChange(nodeId);
      }
    },
    [onViewChange],
  );

  return (
    <aside
      className={`w-64 h-full bg-gradient-to-b ${roleColors[userRole]} text-white flex flex-col`}
      aria-label="Main navigation sidebar"
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

      {/* Preset Switcher */}
      <div className="px-4 py-2 border-b border-white/10">
        <PresetSwitcher
          currentPreset={currentPreset}
          onSwitch={switchPreset}
          onReset={resetToDefault}
          defaultPreset={defaultPreset}
        />
      </div>

      {/* Navigation */}
      <nav aria-label="Main navigation" className="flex-1 p-3 space-y-1 overflow-y-auto sidebar-scrollbar">
        {/* Dashboard (standalone from overview zone) */}
        {overviewZone && overviewZone.nodes.map((node) => (
          <StandaloneNodeButton
            key={node.nodeId}
            node={node}
            isActive={currentView === node.nodeId}
            onClick={() => handleNavigate(node.nodeId)}
          />
        ))}

        {/* Divider after standalone items */}
        {overviewZone && groupedZones.length > 0 && (
          <div className="my-2 border-t border-white/10" />
        )}

        {/* Zone groups */}
        {groupedZones.map((zone) => (
          <ZoneSection
            key={zone.id}
            zone={zone}
            expandedZones={expandedZones}
            onToggle={toggleZone}
            onNavigate={handleNavigate}
            currentView={currentView}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/20">
        <div className="text-xs text-white/60">
          <p>Version 2.1</p>
          <p className="mt-0.5">Ontology v2.0</p>
        </div>
      </div>
    </aside>
  );
}
