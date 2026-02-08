import { useState, useCallback } from 'react';
import {
  X,
  Download,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  ArrowRight,
  Package,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Info,
} from 'lucide-react';
import type { AuditEvidencePanelMode, EvidenceItem, EvidenceType, EvidenceStatus } from './types';
import { EVIDENCE_TYPE_CONFIG, EVIDENCE_STATUS_CONFIG } from './types';

// Helper: format file size
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Helper: format date
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Status icon component
function StatusIcon({ status }: { status: EvidenceStatus }) {
  const iconMap: Record<EvidenceStatus, React.ReactNode> = {
    approved: <CheckCircle size={14} className="text-green-600" />,
    pending: <Clock size={14} className="text-orange-600" />,
    rejected: <XCircle size={14} className="text-red-600" />,
    missing: <AlertCircle size={14} className="text-pink-700" />,
  };
  return <>{iconMap[status]}</>;
}

// Evidence type badge
function EvidenceTypeBadge({ type }: { type: EvidenceType }) {
  const config = EVIDENCE_TYPE_CONFIG[type];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
      style={{ color: config.color, backgroundColor: config.bgColor }}
    >
      {config.label}
    </span>
  );
}

// Evidence status badge
function EvidenceStatusBadge({ status }: { status: EvidenceStatus }) {
  const config = EVIDENCE_STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
      style={{ color: config.color, backgroundColor: config.bgColor }}
    >
      <StatusIcon status={status} />
      {config.label}
    </span>
  );
}

// -- Preview Panel --

function PreviewPanel({
  evidence,
  onClose,
}: {
  evidence: EvidenceItem;
  onClose: () => void;
}) {
  return (
    <div className="space-y-5">
      {/* Type + Status */}
      <div className="flex items-center gap-2 flex-wrap">
        <EvidenceTypeBadge type={evidence.type} />
        <EvidenceStatusBadge status={evidence.status} />
      </div>

      {/* Title */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{evidence.title}</h3>
        {evidence.description && (
          <p className="text-sm text-gray-600 mt-1">{evidence.description}</p>
        )}
      </div>

      {/* Phase */}
      <div>
        <p className="text-xs text-gray-500 mb-1">Phase</p>
        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-sm">
          {evidence.phase.name}
        </span>
      </div>

      {/* Source Entity */}
      <div>
        <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
          <Info size={12} />
          Source
        </p>
        <div className="text-sm text-gray-700">
          <span className="font-medium">{evidence.sourceEntity.entityId}</span>
          {' - '}
          {evidence.sourceEntity.entityTitle}
        </div>
        <span className="text-xs text-gray-400">{evidence.sourceEntity.entityType}</span>
      </div>

      {/* File info */}
      {evidence.file && (
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
            <FileText size={12} />
            File
          </p>
          <p className="text-sm text-gray-800 font-medium truncate">{evidence.file.fileName}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
            <span>{formatFileSize(evidence.file.fileSize)}</span>
            <span>{evidence.file.mimeType}</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Uploaded: {formatDate(evidence.file.uploadedAt)}
          </p>
        </div>
      )}

      {/* Approval info */}
      {evidence.approval && (
        <div className="bg-green-50 rounded-lg p-3">
          <p className="text-xs text-green-700 mb-1 flex items-center gap-1">
            <CheckCircle size={12} />
            Approved
          </p>
          <p className="text-sm text-gray-800 font-medium">{evidence.approval.approvedBy.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {formatDate(evidence.approval.approvedAt)}
          </p>
        </div>
      )}

      {/* Trace chain placeholder */}
      <div>
        <p className="text-xs text-gray-500 mb-2">Traceability Chain</p>
        <div className="flex items-center gap-1 text-xs text-gray-400 p-3 border border-dashed border-gray-300 rounded-lg justify-center">
          <span className="px-1.5 py-0.5 bg-gray-100 rounded">Req</span>
          <ArrowRight size={10} />
          <span className="px-1.5 py-0.5 bg-gray-100 rounded">Epic</span>
          <ArrowRight size={10} />
          <span className="px-1.5 py-0.5 bg-gray-100 rounded">Story</span>
          <ArrowRight size={10} />
          <span className="px-1.5 py-0.5 bg-gray-100 rounded">TC</span>
          <ArrowRight size={10} />
          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded font-medium">
            Deliverable
          </span>
        </div>
        <p className="text-[10px] text-gray-400 mt-1 text-center">
          {/* TODO: Replace with real lineage data */}
          Trace data not yet connected
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-gray-200">
        {evidence.file && (
          <button className="flex-1 px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
            <Download size={14} />
            Download
          </button>
        )}
        <button
          onClick={onClose}
          className="px-3 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

// -- Confirm Panel (Cover Sheet) --

interface ConfirmPanelProps {
  selectedCount: number;
  selectedIds: Set<string>;
  evidence: EvidenceItem[];
  exportFormat: 'zip' | 'pdf';
  onExportFormatChange: (format: 'zip' | 'pdf') => void;
  onStartExport: () => void;
  onCancel: () => void;
}

function ConfirmPanel({
  selectedCount,
  selectedIds,
  evidence,
  exportFormat,
  onExportFormatChange,
  onStartExport,
  onCancel,
}: ConfirmPanelProps) {
  const [confirmed, setConfirmed] = useState(false);
  const [auditPeriod, setAuditPeriod] = useState('');
  const [auditorName, setAuditorName] = useState('');
  const [purpose, setPurpose] = useState('');

  const selectedItems = evidence.filter((e) => selectedIds.has(e.id));

  // Counts by status
  const statusCounts = {
    approved: selectedItems.filter((e) => e.status === 'approved').length,
    pending: selectedItems.filter((e) => e.status === 'pending').length,
    rejected: selectedItems.filter((e) => e.status === 'rejected').length,
    missing: selectedItems.filter((e) => e.status === 'missing').length,
  };

  // Type distribution
  const typeDistribution: Record<string, number> = {};
  for (const item of selectedItems) {
    typeDistribution[item.type] = (typeDistribution[item.type] || 0) + 1;
  }

  // Estimated file size
  const estimatedSize = selectedItems.reduce(
    (acc, item) => acc + (item.file?.fileSize || 0),
    0
  );

  // Warnings
  const warnings: string[] = [];
  if (statusCounts.pending > 0) warnings.push(`${statusCounts.pending} pending items included`);
  if (statusCounts.rejected > 0) warnings.push(`${statusCounts.rejected} rejected items included`);
  if (statusCounts.missing > 0) warnings.push(`${statusCounts.missing} missing items included`);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <Package size={16} className="text-indigo-600" />
        Export Cover Sheet
      </h3>

      {/* Project info */}
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs text-gray-500 mb-1">Project</p>
        {/* TODO: Replace with real project info */}
        <p className="text-sm text-gray-800 font-medium">Insurance Claims PMS</p>
        <p className="text-xs text-gray-500 mt-1">
          {selectedCount} items selected
        </p>
      </div>

      {/* Status breakdown */}
      <div>
        <p className="text-xs text-gray-500 mb-2">Items by Status</p>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(statusCounts).map(([status, count]) => {
            if (count === 0) return null;
            const config = EVIDENCE_STATUS_CONFIG[status as EvidenceStatus];
            return (
              <div
                key={status}
                className="flex items-center gap-2 px-2 py-1.5 rounded text-xs"
                style={{ backgroundColor: config.bgColor }}
              >
                <StatusIcon status={status as EvidenceStatus} />
                <span style={{ color: config.color }} className="font-medium">
                  {config.label}: {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Type distribution */}
      <div>
        <p className="text-xs text-gray-500 mb-2">Type Distribution</p>
        <div className="space-y-1">
          {Object.entries(typeDistribution).map(([type, count]) => {
            const config = EVIDENCE_TYPE_CONFIG[type as EvidenceType];
            return (
              <div key={type} className="flex items-center justify-between text-xs">
                <span
                  className="px-1.5 py-0.5 rounded"
                  style={{ color: config?.color, backgroundColor: config?.bgColor }}
                >
                  {config?.label || type}
                </span>
                <span className="text-gray-600">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Estimated size */}
      <div className="flex items-center justify-between text-xs text-gray-600 px-1">
        <span>Estimated Size</span>
        <span className="font-medium">{formatFileSize(estimatedSize)}</span>
      </div>

      {/* Export format */}
      <div>
        <p className="text-xs text-gray-500 mb-2">Export Format</p>
        <div className="flex gap-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="exportFormat"
              checked={exportFormat === 'zip'}
              onChange={() => onExportFormatChange('zip')}
              className="text-blue-600"
            />
            <span className="text-sm text-gray-700">ZIP Archive</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="exportFormat"
              checked={exportFormat === 'pdf'}
              onChange={() => onExportFormatChange('pdf')}
              className="text-blue-600"
            />
            <span className="text-sm text-gray-700">PDF Bundle</span>
          </label>
        </div>
      </div>

      {/* Audit metadata (optional) */}
      <div className="space-y-2">
        <p className="text-xs text-gray-500">Audit Metadata (Optional)</p>
        <input
          type="text"
          placeholder="Audit period (e.g., 2026 Q1)"
          value={auditPeriod}
          onChange={(e) => setAuditPeriod(e.target.value)}
          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          placeholder="Auditor name"
          value={auditorName}
          onChange={(e) => setAuditorName(e.target.value)}
          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          placeholder="Purpose of audit"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-1">
          {warnings.map((warn) => (
            <div
              key={warn}
              className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg"
            >
              <AlertTriangle size={12} />
              {warn}
            </div>
          ))}
        </div>
      )}

      {/* Confirmation checkbox */}
      <label className="flex items-start gap-2 cursor-pointer py-1">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5 rounded border-gray-300"
        />
        <span className="text-xs text-gray-700 leading-relaxed">
          I confirm the above submission scope and acknowledge that this export will be
          generated for audit compliance purposes.
        </span>
      </label>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-gray-200">
        <button
          onClick={onStartExport}
          disabled={!confirmed || selectedCount === 0}
          className="flex-1 px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          <Package size={14} />
          Start Export
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// -- Export Panel --

interface ExportItem {
  id: string;
  title: string;
  status: 'waiting' | 'processing' | 'completed' | 'failed';
}

interface ExportPanelProps {
  selectedIds: Set<string>;
  evidence: EvidenceItem[];
  onClose: () => void;
  onRetry: () => void;
}

function ExportPanel({ selectedIds, evidence, onClose, onRetry }: ExportPanelProps) {
  // TODO: Replace with real export progress from API
  const [exportStatus, setExportStatus] = useState<'processing' | 'completed' | 'failed'>('processing');

  const selectedItems = evidence.filter((e) => selectedIds.has(e.id));

  // Simulate mock export items with statuses
  const mockExportItems: ExportItem[] = selectedItems.map((item, index) => ({
    id: item.id,
    title: item.title,
    status:
      exportStatus === 'completed'
        ? 'completed'
        : exportStatus === 'failed' && index === selectedItems.length - 1
          ? 'failed'
          : index < Math.ceil(selectedItems.length * 0.7)
            ? 'completed'
            : index === Math.ceil(selectedItems.length * 0.7)
              ? 'processing'
              : 'waiting',
  }));

  const completedCount = mockExportItems.filter((i) => i.status === 'completed').length;
  const progress =
    exportStatus === 'completed'
      ? 100
      : exportStatus === 'failed'
        ? Math.round((completedCount / mockExportItems.length) * 100)
        : Math.round((completedCount / mockExportItems.length) * 100);

  // Simulate progress for demo
  const handleSimulateComplete = useCallback(() => {
    setExportStatus('completed');
  }, []);

  const handleSimulateFail = useCallback(() => {
    setExportStatus('failed');
  }, []);

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <Package size={16} className="text-indigo-600" />
        Export Progress
      </h3>

      {/* Overall progress */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">
            {exportStatus === 'completed'
              ? 'Export completed'
              : exportStatus === 'failed'
                ? 'Export failed'
                : 'Processing...'}
          </span>
          <span className="text-xs font-medium text-gray-600">{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${
              exportStatus === 'failed'
                ? 'bg-red-500'
                : exportStatus === 'completed'
                  ? 'bg-green-500'
                  : 'bg-blue-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Item list */}
      <div className="max-h-64 overflow-y-auto space-y-1">
        {mockExportItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2 px-2 py-1.5 rounded text-xs"
          >
            {item.status === 'completed' && (
              <CheckCircle size={12} className="text-green-500 shrink-0" />
            )}
            {item.status === 'processing' && (
              <Loader2 size={12} className="text-blue-500 shrink-0 animate-spin" />
            )}
            {item.status === 'waiting' && (
              <Clock size={12} className="text-gray-300 shrink-0" />
            )}
            {item.status === 'failed' && (
              <XCircle size={12} className="text-red-500 shrink-0" />
            )}
            <span
              className={`truncate ${
                item.status === 'completed'
                  ? 'text-gray-600'
                  : item.status === 'failed'
                    ? 'text-red-600'
                    : item.status === 'processing'
                      ? 'text-blue-700 font-medium'
                      : 'text-gray-400'
              }`}
            >
              {item.title}
            </span>
          </div>
        ))}
      </div>

      {/* Completed state */}
      {exportStatus === 'completed' && (
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <CheckCircle size={24} className="text-green-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-green-800">Export Complete</p>
          <p className="text-xs text-green-600 mt-1">
            {/* TODO: Replace with real file info */}
            audit_evidence_2026-02-09.zip (14.2 MB)
          </p>
          <button className="mt-3 px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 mx-auto">
            <Download size={14} />
            Download Package
          </button>
        </div>
      )}

      {/* Failed state */}
      {exportStatus === 'failed' && (
        <div className="bg-red-50 rounded-lg p-3 text-center">
          <XCircle size={24} className="text-red-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-red-800">Export Failed</p>
          <p className="text-xs text-red-600 mt-1">
            An error occurred while packaging evidence items. Please try again.
          </p>
          <button
            onClick={onRetry}
            className="mt-3 px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 mx-auto"
          >
            <RefreshCw size={14} />
            Retry Export
          </button>
        </div>
      )}

      {/* Demo controls (dev-only, remove in production) */}
      {exportStatus === 'processing' && (
        <div className="flex gap-2 pt-2 border-t border-gray-200">
          <button
            onClick={handleSimulateComplete}
            className="flex-1 px-2 py-1.5 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
          >
            Simulate Complete
          </button>
          <button
            onClick={handleSimulateFail}
            className="flex-1 px-2 py-1.5 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
          >
            Simulate Fail
          </button>
        </div>
      )}

      {/* Close button */}
      <button
        onClick={onClose}
        className="w-full px-3 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
      >
        Close
      </button>
    </div>
  );
}

// -- Main Right Panel --

export interface AuditEvidenceRightPanelProps {
  mode: AuditEvidencePanelMode;
  selectedEvidenceId: string | null;
  selectedIds: Set<string>;
  evidence: EvidenceItem[];
  exportFormat: 'zip' | 'pdf';
  onExportFormatChange: (format: 'zip' | 'pdf') => void;
  onStartExport: () => void;
  onClose: () => void;
  onModeChange: (mode: AuditEvidencePanelMode) => void;
}

export function AuditEvidenceRightPanel({
  mode,
  selectedEvidenceId,
  selectedIds,
  evidence,
  exportFormat,
  onExportFormatChange,
  onStartExport,
  onClose,
  onModeChange,
}: AuditEvidenceRightPanelProps) {
  if (mode === 'list') return null;

  const selectedEvidence = evidence.find((e) => e.id === selectedEvidenceId) || null;

  const renderContent = () => {
    switch (mode) {
      case 'preview':
        if (!selectedEvidence) {
          return (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">
              Select an evidence item to preview
            </div>
          );
        }
        return <PreviewPanel evidence={selectedEvidence} onClose={onClose} />;

      case 'confirm':
        return (
          <ConfirmPanel
            selectedCount={selectedIds.size}
            selectedIds={selectedIds}
            evidence={evidence}
            exportFormat={exportFormat}
            onExportFormatChange={onExportFormatChange}
            onStartExport={onStartExport}
            onCancel={() => onModeChange('list')}
          />
        );

      case 'export':
        return (
          <ExportPanel
            selectedIds={selectedIds}
            evidence={evidence}
            onClose={() => onModeChange('list')}
            onRetry={() => {
              // Reset to confirm mode and allow re-export
              onModeChange('confirm');
            }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-[420px] border border-gray-200 bg-white rounded-xl shadow-sm flex flex-col h-full shrink-0">
      {/* Panel header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-700">
          {mode === 'preview' && 'Evidence Detail'}
          {mode === 'confirm' && 'Export Cover Sheet'}
          {mode === 'export' && 'Export Progress'}
        </h2>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          aria-label="Close panel"
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">{renderContent()}</div>
    </div>
  );
}
