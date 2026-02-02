import { FileText, Plus, Upload, Download, Check, X, Brain, Loader2, AlertCircle, Clock } from 'lucide-react';
import type { Deliverable } from './types';
import { getPhaseStatusColor, getPhaseStatusLabel, getRagStatusColor, getRagStatusLabel, type RagStatus } from '../../../utils/phaseMappers';

interface DeliverablesListProps {
  deliverables: Deliverable[];
  canUpload: boolean;
  canApprove: boolean;
  onUpload: (deliverableId: string) => void;
  onDownload: (deliverable: Deliverable) => void;
  onApprove: (deliverableId: string, approved: boolean) => void;
  onNewUpload: () => void;
}

export function DeliverablesList({
  deliverables,
  canUpload,
  canApprove,
  onUpload,
  onDownload,
  onApprove,
  onNewUpload,
}: DeliverablesListProps) {
  const getStatusColor = getPhaseStatusColor;
  const getStatusLabel = getPhaseStatusLabel;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-900 flex items-center gap-2">
          <FileText size={18} />
          산출물 관리
        </h4>
        {canUpload && (
          <button
            onClick={onNewUpload}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-blue-200 text-blue-600 rounded hover:bg-blue-50"
          >
            <Plus size={14} />
            새 산출물 업로드
          </button>
        )}
      </div>
      <div className="space-y-2">
        {deliverables.map((deliverable) => (
          <DeliverableRow
            key={deliverable.id}
            deliverable={deliverable}
            canUpload={canUpload}
            canApprove={canApprove}
            getStatusColor={getStatusColor}
            getStatusLabel={getStatusLabel}
            onUpload={() => onUpload(deliverable.id)}
            onDownload={() => onDownload(deliverable)}
            onApprove={(approved) => onApprove(deliverable.id, approved)}
          />
        ))}
      </div>
    </div>
  );
}

// Sub-component

interface DeliverableRowProps {
  deliverable: Deliverable;
  canUpload: boolean;
  canApprove: boolean;
  getStatusColor: (status: string) => string;
  getStatusLabel: (status: string) => string;
  onUpload: () => void;
  onDownload: () => void;
  onApprove: (approved: boolean) => void;
}

function DeliverableRow({
  deliverable,
  canUpload,
  canApprove,
  getStatusColor,
  getStatusLabel,
  onUpload,
  onDownload,
  onApprove,
}: DeliverableRowProps) {
  const canShowUploadButton =
    (deliverable.status === 'pending' ||
      deliverable.status === 'draft' ||
      deliverable.status === 'rejected') &&
    canUpload;

  const canShowDownloadButton = deliverable.uploadDate && !canShowUploadButton;

  // Get RAG status icon component
  const getRagStatusIcon = (status?: RagStatus) => {
    switch (status) {
      case 'READY':
        return <Brain size={14} className="text-green-600" />;
      case 'INDEXING':
        return <Loader2 size={14} className="text-blue-600 animate-spin" />;
      case 'PENDING':
        return <Clock size={14} className="text-blue-500" />;
      case 'FAILED':
        return <AlertCircle size={14} className="text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900">{deliverable.name}</p>
          {/* RAG Status Indicator */}
          {deliverable.ragStatus && (
            <span
              className={`inline-flex items-center gap-1 ${getRagStatusColor(deliverable.ragStatus)}`}
              title={`${getRagStatusLabel(deliverable.ragStatus)}${deliverable.ragLastError ? `: ${deliverable.ragLastError}` : ''}`}
            >
              {getRagStatusIcon(deliverable.ragStatus)}
            </span>
          )}
        </div>
        {deliverable.uploadDate && (
          <p className="text-xs text-gray-500 mt-1">
            업로드: {deliverable.uploadDate}
            {deliverable.approver && ` | 승인자: ${deliverable.approver}`}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(deliverable.status)}`}
        >
          {getStatusLabel(deliverable.status)}
        </span>

        {deliverable.status === 'review' && canApprove && (
          <>
            <button
              onClick={() => onApprove(true)}
              className="p-2 text-green-600 hover:bg-green-100 rounded transition-colors"
              title="승인"
            >
              <Check size={16} />
            </button>
            <button
              onClick={() => onApprove(false)}
              className="p-2 text-red-600 hover:bg-red-100 rounded transition-colors"
              title="반려"
            >
              <X size={16} />
            </button>
          </>
        )}

        {canShowUploadButton && (
          <button
            onClick={onUpload}
            className="p-2 text-blue-600 hover:bg-blue-100 rounded transition-colors"
            title="업로드"
          >
            <Upload size={16} />
          </button>
        )}

        {canShowDownloadButton && (
          <button
            onClick={onDownload}
            className="p-2 text-gray-600 hover:bg-gray-200 rounded transition-colors"
            title="다운로드"
          >
            <Download size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
