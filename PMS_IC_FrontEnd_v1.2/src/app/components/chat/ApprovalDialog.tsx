/**
 * Approval Dialog Component - Phase 1 Decision Authority Gate
 *
 * Displays when an AI response requires user approval (COMMIT actions).
 * Shows action details, impact assessment, and supporting evidence.
 */

import { AlertTriangle, CheckCircle, XCircle, FileText, ExternalLink } from 'lucide-react';

interface Evidence {
  sourceType: string;
  sourceId: string;
  title: string;
  excerpt?: string;
  relevanceScore: number;
  url?: string;
}

interface PendingAction {
  actionType: string;
  targetType: string;
  targetId?: string;
  description: string;
}

interface ApprovalDialogProps {
  open: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: (reason?: string) => void;
  action: {
    type: string;
    description: string;
    impact?: string;
    pendingActions?: PendingAction[];
    evidence?: Evidence[];
    approvalType?: 'user' | 'manager' | 'admin';
  };
  isLoading?: boolean;
}

export function ApprovalDialog({
  open,
  onClose,
  onApprove,
  onReject,
  action,
  isLoading = false,
}: ApprovalDialogProps) {
  if (!open) return null;

  const getApprovalTypeLabel = (type?: string) => {
    switch (type) {
      case 'manager':
        return '관리자 승인 필요';
      case 'admin':
        return '시스템 관리자 승인 필요';
      default:
        return '사용자 승인 필요';
    }
  };

  const getActionTypeLabel = (type: string) => {
    switch (type) {
      case 'create':
        return '생성';
      case 'update':
        return '수정';
      case 'delete':
        return '삭제';
      case 'execute':
        return '실행';
      default:
        return type;
    }
  };

  const getTargetTypeLabel = (type: string) => {
    switch (type) {
      case 'sprint':
        return '스프린트';
      case 'task':
        return '태스크';
      case 'report':
        return '보고서';
      case 'backlog':
        return '백로그';
      case 'deliverable':
        return '산출물';
      default:
        return type;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 rounded-full">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">승인이 필요합니다</h3>
              <p className="text-xs text-gray-500">{getApprovalTypeLabel(action.approvalType)}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Action Description */}
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">요청된 작업</h4>
            <p className="text-sm text-gray-900">{action.description}</p>
          </div>

          {/* Pending Actions */}
          {action.pendingActions && action.pendingActions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">상세 작업 내용</h4>
              <div className="space-y-2">
                {action.pendingActions.map((pendingAction, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg text-sm"
                  >
                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                      {getActionTypeLabel(pendingAction.actionType)}
                    </span>
                    <span className="text-gray-600">
                      {getTargetTypeLabel(pendingAction.targetType)}
                      {pendingAction.targetId && ` #${pendingAction.targetId}`}
                    </span>
                    {pendingAction.description && (
                      <span className="text-gray-500">- {pendingAction.description}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Impact */}
          {action.impact && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-1">예상 영향</h4>
              <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded-lg">{action.impact}</p>
            </div>
          )}

          {/* Evidence */}
          {action.evidence && action.evidence.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">근거 자료</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {action.evidence.map((e, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm">
                    <FileText className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      {e.url ? (
                        <a
                          href={e.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1"
                        >
                          {e.title}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-gray-700">{e.title}</span>
                      )}
                      {e.excerpt && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">"{e.excerpt}"</p>
                      )}
                    </div>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        e.relevanceScore >= 0.8
                          ? 'bg-green-100 text-green-700'
                          : e.relevanceScore >= 0.6
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {Math.round(e.relevanceScore * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={() => onReject()}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <XCircle className="h-4 w-4" />
            거부
          </button>
          <button
            onClick={onApprove}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                처리 중...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                승인
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ApprovalDialog;
