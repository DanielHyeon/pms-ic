import { useState } from 'react';
import { Plus } from 'lucide-react';
import IssueManagement from './common/IssueManagement';
import { useIssues, useCreateIssue } from '../../hooks/api/useCommon';
import { getRolePermissions } from '../../utils/rolePermissions';
import { UserRole } from '../App';
import { useProject } from '../../contexts/ProjectContext';
import { usePreset } from '../../hooks/usePreset';
import { useFilterSpec } from '../../hooks/useFilterSpec';
import { PresetSwitcher } from './common/PresetSwitcher';
import { IssueKpiRow, IssueFilters, ISSUE_FILTER_KEYS, IssueRightPanel } from './issues';
import type { IssuePanelMode } from './issues';

interface IssuesPageProps {
  userRole: UserRole;
}

export default function IssuesPage({ userRole }: IssuesPageProps) {
  // Get current project from context
  const { currentProject } = useProject();
  const projectId = currentProject?.id;
  const [showCreateModal, setShowCreateModal] = useState(false);

  // API hooks
  const { data: issues = [], isLoading } = useIssues(projectId);
  const createIssueMutation = useCreateIssue();

  // Role permissions
  const permissions = getRolePermissions(userRole);
  const canManage = permissions.canEdit;

  // Preset and filter systems
  const { currentPreset, switchPreset } = usePreset(userRole.toUpperCase());
  const { filters, setFilters } = useFilterSpec({ keys: ISSUE_FILTER_KEYS, syncUrl: false });
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<IssuePanelMode>('none');

  return (
    <div className="flex-1 p-6 space-y-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Issue Management</h1>
            <p className="text-gray-500 mt-1">Track and manage project issues</p>
          </div>
          <div className="mx-3 h-8 w-px bg-gray-200" />
          <PresetSwitcher currentPreset={currentPreset} onSwitch={switchPreset} compact />
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={18} />
            New Issue
          </button>
        )}
      </div>

      {/* KPI Row */}
      <IssueKpiRow issues={issues} preset={currentPreset} />

      {/* Filters */}
      <IssueFilters values={filters} onChange={setFilters} preset={currentPreset} />

      {/* Issue List + Right Panel */}
      <div className="flex gap-4 flex-1 min-h-0">
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-6 overflow-auto">
          <IssueManagement
            projectId={projectId}
            issues={issues}
            isLoading={isLoading}
            canManage={canManage}
            searchQuery={(filters.q as string) || ''}
            filter={(filters.status as string) || ''}
          />
        </div>
        {panelMode !== 'none' && (
          <IssueRightPanel
            mode={panelMode}
            issue={issues.find((i) => i.id === selectedIssueId)}
            preset={currentPreset}
            onClose={() => {
              setPanelMode('none');
              setSelectedIssueId(null);
            }}
            onModeChange={setPanelMode}
            canEdit={canManage}
          />
        )}
      </div>
    </div>
  );
}
