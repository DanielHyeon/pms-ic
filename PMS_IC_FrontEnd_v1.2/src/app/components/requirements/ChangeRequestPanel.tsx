import { useMemo } from 'react';
import { FileText, User, Calendar, AlertCircle } from 'lucide-react';
import { Badge } from '../ui/badge';
import type { Requirement } from '../../../types/project';
import type { RequirementChangeRequest } from '../../../types/requirement';

// ─── Status display config ──────────────────────────────────

const changeRequestStatusConfig: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-600' },
  PENDING: { label: 'Pending', className: 'bg-yellow-100 text-yellow-700' },
  UNDER_REVIEW: { label: 'Under Review', className: 'bg-blue-100 text-blue-700' },
  APPROVED: { label: 'Approved', className: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-700' },
  APPLIED: { label: 'Applied', className: 'bg-purple-100 text-purple-700' },
};

const changeTypeConfig: Record<string, { label: string; className: string }> = {
  MODIFICATION: { label: 'Modification', className: 'bg-blue-50 text-blue-600' },
  ADDITION: { label: 'Addition', className: 'bg-green-50 text-green-600' },
  DELETION: { label: 'Deletion', className: 'bg-red-50 text-red-600' },
};

// TODO: Replace with real API call
function generateMockChangeRequests(requirement: Requirement): RequirementChangeRequest[] {
  // Generate 0-2 mock change requests based on requirement status
  const statusSeed = requirement.status;

  if (statusSeed === 'IDENTIFIED' || statusSeed === 'DEFERRED') {
    return [];
  }

  const requests: RequirementChangeRequest[] = [
    {
      id: `cr-${requirement.id}-1`,
      projectId: requirement.projectId,
      requirementId: requirement.id,
      title: `Scope refinement for ${requirement.code}`,
      description: 'Acceptance criteria need adjustment based on stakeholder feedback.',
      changeType: 'MODIFICATION',
      priority: 'HIGH',
      status: statusSeed === 'APPROVED' ? 'APPROVED' : 'PENDING',
      requestedBy: 'Kim PM',
      requestedAt: '2025-12-15T09:00:00Z',
      reviewedBy: statusSeed === 'APPROVED' ? 'Lee PMO' : undefined,
      reviewedAt: statusSeed === 'APPROVED' ? '2025-12-16T14:00:00Z' : undefined,
    },
  ];

  if (statusSeed === 'IMPLEMENTED' || statusSeed === 'VERIFIED') {
    requests.push({
      id: `cr-${requirement.id}-2`,
      projectId: requirement.projectId,
      requirementId: requirement.id,
      title: `Additional test scenario for ${requirement.code}`,
      description: 'New edge case discovered during testing phase.',
      changeType: 'ADDITION',
      priority: 'MEDIUM',
      status: 'UNDER_REVIEW',
      requestedBy: 'Park QA',
      requestedAt: '2026-01-10T11:00:00Z',
    });
  }

  return requests;
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

interface ChangeRequestPanelProps {
  requirement: Requirement;
}

export function ChangeRequestPanel({ requirement }: ChangeRequestPanelProps) {
  // TODO: Replace with real API call
  const changeRequests = useMemo(() => generateMockChangeRequests(requirement), [requirement]);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div>
        <p className="text-xs text-gray-400 font-mono">{requirement.code}</p>
        <h3 className="text-sm font-semibold text-gray-900 mt-0.5 line-clamp-2">
          Change Requests
        </h3>
      </div>

      {/* Change request list */}
      {changeRequests.length === 0 ? (
        <div className="text-center py-8">
          <AlertCircle className="h-8 w-8 mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">No change requests</p>
        </div>
      ) : (
        <div className="space-y-3">
          {changeRequests.map((cr) => {
            const statusDisplay = changeRequestStatusConfig[cr.status] || {
              label: cr.status,
              className: 'bg-gray-100 text-gray-600',
            };
            const typeDisplay = changeTypeConfig[cr.changeType] || {
              label: cr.changeType,
              className: 'bg-gray-50 text-gray-500',
            };

            return (
              <div
                key={cr.id}
                className="border border-gray-200 rounded-lg p-3 space-y-2 hover:border-gray-300 transition-colors"
              >
                {/* Title + Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <FileText className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-800 truncate">
                      {cr.title}
                    </span>
                  </div>
                  <Badge className={statusDisplay.className}>
                    {statusDisplay.label}
                  </Badge>
                </div>

                {/* Type + Priority */}
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={typeDisplay.className}>
                    {typeDisplay.label}
                  </Badge>
                  <span className="text-[10px] text-gray-400 uppercase">{cr.priority}</span>
                </div>

                {/* Requester + Date */}
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {cr.requestedBy}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(cr.requestedAt)}
                  </span>
                </div>

                {/* Reviewer info */}
                {cr.reviewedBy && (
                  <div className="text-xs text-gray-400 border-t border-gray-100 pt-1.5">
                    Reviewed by {cr.reviewedBy} on {formatDate(cr.reviewedAt!)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
