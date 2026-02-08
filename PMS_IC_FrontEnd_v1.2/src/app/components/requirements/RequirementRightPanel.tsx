import { X } from 'lucide-react';
import { TraceQuickPreview } from './TraceQuickPreview';
import { ChangeRequestPanel } from './ChangeRequestPanel';
import type { Requirement } from '../../../types/project';
import type { RequirementPanelMode } from '../../../types/requirement';

interface RequirementRightPanelProps {
  panelMode: RequirementPanelMode;
  requirement: Requirement | null;
  onClose: () => void;
  onViewDetail?: () => void;
}

export function RequirementRightPanel({
  panelMode,
  requirement,
  onClose,
  onViewDetail,
}: RequirementRightPanelProps) {
  if (panelMode === 'none' || !requirement) {
    return null;
  }

  return (
    <div className="w-[320px] flex-shrink-0 border-l border-gray-200 bg-white overflow-y-auto">
      {/* Panel header with close button */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          {panelMode === 'preview' && 'Trace Preview'}
          {panelMode === 'trace' && 'Trace Chain'}
          {panelMode === 'approval' && 'Change Requests'}
          {panelMode === 'detail' && 'Detail'}
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Panel content based on mode */}
      {panelMode === 'preview' && (
        <TraceQuickPreview
          requirement={requirement}
          onViewDetail={onViewDetail}
        />
      )}
      {panelMode === 'trace' && (
        <TraceQuickPreview
          requirement={requirement}
          onViewDetail={onViewDetail}
        />
      )}
      {panelMode === 'approval' && (
        <ChangeRequestPanel requirement={requirement} />
      )}
    </div>
  );
}
