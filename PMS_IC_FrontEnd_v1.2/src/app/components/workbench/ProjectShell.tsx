import React, { useState, useMemo } from 'react';
import { useProjectAuth, CAPABILITIES, Capability } from '../../../hooks/api/useProjectAuth';
import { useProject } from '../../../contexts/ProjectContext';
import { PoBacklogWorkbench } from './PoBacklogWorkbench';
import { PmWorkboardWorkbench } from './PmWorkboardWorkbench';
import { PmoPortfolioWorkbench } from './PmoPortfolioWorkbench';

interface TabDef {
  key: string;
  label: string;
  required: Capability[];
  component: React.FC<{ projectId: string }>;
}

const TAB_DEFINITIONS: TabDef[] = [
  { key: 'po-backlog', label: 'PO Backlog', required: [CAPABILITIES.VIEW_BACKLOG], component: PoBacklogWorkbench },
  { key: 'pm-workboard', label: 'PM Workboard', required: [CAPABILITIES.VIEW_STORY], component: PmWorkboardWorkbench },
  { key: 'pmo-portfolio', label: 'PMO Portfolio', required: [CAPABILITIES.VIEW_KPI], component: PmoPortfolioWorkbench },
];

export function ProjectShell() {
  const { currentProject } = useProject();
  const { capabilities, role } = useProjectAuth();
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const visibleTabs = useMemo(
    () => TAB_DEFINITIONS.filter(tab => tab.required.every(cap => capabilities.includes(cap))),
    [capabilities]
  );

  // Auto-select first tab
  const currentTab = activeTab && visibleTabs.some(t => t.key === activeTab)
    ? activeTab
    : visibleTabs[0]?.key || null;

  if (!currentProject) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
        Select a project to view the workbench.
      </div>
    );
  }

  if (visibleTabs.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
        No workbench views available for your role ({role || 'unknown'}).
      </div>
    );
  }

  const ActiveComponent = visibleTabs.find(t => t.key === currentTab)?.component;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: '0', borderBottom: '2px solid #e5e7eb',
        padding: '0 1rem', background: '#fff',
      }}>
        {visibleTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '0.75rem 1.25rem',
              border: 'none',
              borderBottom: currentTab === tab.key ? '2px solid #3b82f6' : '2px solid transparent',
              background: 'transparent',
              cursor: 'pointer',
              fontWeight: currentTab === tab.key ? 600 : 400,
              color: currentTab === tab.key ? '#1d4ed8' : '#6b7280',
              fontSize: '0.875rem',
              marginBottom: '-2px',
              transition: 'color 0.15s, border-color 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active workbench */}
      <div style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
        {ActiveComponent && <ActiveComponent projectId={currentProject.id} />}
      </div>
    </div>
  );
}
