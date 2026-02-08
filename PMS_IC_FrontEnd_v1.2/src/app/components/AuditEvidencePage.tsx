import { useState, useMemo, useCallback } from 'react';
import { Lock, Shield, FileText, CheckCircle, Clock, XCircle, AlertCircle, Package } from 'lucide-react';
import { PresetSwitcher } from './common/PresetSwitcher';
import { usePreset } from '../../hooks/usePreset';
import { useFilterSpec } from '../../hooks/useFilterSpec';
import {
  AuditEvidenceKpiRow,
  AuditEvidenceFilters,
  AUDIT_EVIDENCE_FILTER_KEYS,
  ComplianceChecklist,
  AuditEvidenceRightPanel,
  EVIDENCE_TYPE_CONFIG,
  EVIDENCE_STATUS_CONFIG,
} from './audit';
import type { EvidenceItem, AuditEvidencePanelMode, EvidenceType, EvidenceStatus } from './audit';
import type { UserRole } from '../App';
import type { ViewModePreset } from '../../types/menuOntology';

interface AuditEvidencePageProps {
  userRole: UserRole;
}

// Helper: format file size
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Helper: format date for table
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Status icon component for table
function StatusIcon({ status }: { status: EvidenceStatus }) {
  const iconMap: Record<EvidenceStatus, React.ReactNode> = {
    approved: <CheckCircle size={14} className="text-green-600" />,
    pending: <Clock size={14} className="text-orange-600" />,
    rejected: <XCircle size={14} className="text-red-600" />,
    missing: <AlertCircle size={14} className="text-pink-700" />,
  };
  return <>{iconMap[status]}</>;
}

// Mock evidence data as fallback until audit evidence backend is implemented (Phase 5)
const MOCK_EVIDENCE: EvidenceItem[] = [
  { id: 'ev-001', title: 'Requirements Traceability Matrix', type: 'deliverable', status: 'approved', phase: { id: 'ph-1', name: 'Analysis', order: 1 }, sourceEntity: { entityType: 'requirement', entityId: 'REQ-001', entityTitle: 'REQ-001 ~ REQ-045' }, createdAt: '2026-01-28T09:00:00Z', updatedAt: '2026-02-01T10:00:00Z', file: { fileName: 'RTM_v2.1.xlsx', fileSize: 245000, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', uploadedAt: '2026-01-28T09:00:00Z' }, approval: { approvedAt: '2026-02-01T10:00:00Z', approvedBy: { userId: 'u-1', name: 'Kim Minjun' } } },
  { id: 'ev-002', title: 'Sprint 3 Test Report', type: 'test_result', status: 'approved', phase: { id: 'ph-4', name: 'Testing', order: 4 }, sourceEntity: { entityType: 'sprint', entityId: 'SPR-003', entityTitle: 'Sprint 3' }, createdAt: '2026-02-02T14:00:00Z', updatedAt: '2026-02-03T14:30:00Z', file: { fileName: 'Sprint3_TestReport.pdf', fileSize: 180000, mimeType: 'application/pdf', uploadedAt: '2026-02-02T14:00:00Z' }, approval: { approvedAt: '2026-02-03T14:30:00Z', approvedBy: { userId: 'u-2', name: 'Lee Jiyeon' } } },
  { id: 'ev-003', title: 'Phase Gate Review - Design', type: 'approval_log', status: 'approved', phase: { id: 'ph-2', name: 'Design', order: 2 }, sourceEntity: { entityType: 'phase', entityId: 'PH-002', entityTitle: 'Design Phase' }, createdAt: '2026-01-19T09:00:00Z', updatedAt: '2026-01-20T09:00:00Z', file: { fileName: 'DesignGateReview.pdf', fileSize: 320000, mimeType: 'application/pdf', uploadedAt: '2026-01-19T09:00:00Z' }, approval: { approvedAt: '2026-01-20T09:00:00Z', approvedBy: { userId: 'u-3', name: 'Park Sungho' } } },
  { id: 'ev-004', title: 'Security Audit Report', type: 'approval_log', status: 'pending', phase: { id: 'ph-3', name: 'Implementation', order: 3 }, sourceEntity: { entityType: 'issue', entityId: 'SEC-001', entityTitle: 'Security Compliance Audit' }, createdAt: '2026-02-04T16:00:00Z', updatedAt: '2026-02-05T16:00:00Z', file: { fileName: 'SecurityAudit_Q1.pdf', fileSize: 410000, mimeType: 'application/pdf', uploadedAt: '2026-02-04T16:00:00Z' } },
  { id: 'ev-005', title: 'User Acceptance Test Results', type: 'test_result', status: 'pending', phase: { id: 'ph-4', name: 'Testing', order: 4 }, sourceEntity: { entityType: 'test', entityId: 'UAT-001', entityTitle: 'UAT Cycle 1' }, createdAt: '2026-02-05T11:00:00Z', updatedAt: '2026-02-06T11:00:00Z', file: { fileName: 'UAT_Results.xlsx', fileSize: 156000, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', uploadedAt: '2026-02-05T11:00:00Z' } },
  { id: 'ev-006', title: 'Change Request CR-012 Approval', type: 'change_history', status: 'approved', phase: { id: 'ph-3', name: 'Development', order: 3 }, sourceEntity: { entityType: 'change_request', entityId: 'CR-012', entityTitle: 'CR-012 Database Schema Update' }, createdAt: '2026-01-24T13:00:00Z', updatedAt: '2026-01-25T13:00:00Z', file: { fileName: 'CR012_Approval.pdf', fileSize: 95000, mimeType: 'application/pdf', uploadedAt: '2026-01-24T13:00:00Z' }, approval: { approvedAt: '2026-01-25T13:00:00Z', approvedBy: { userId: 'u-4', name: 'Choi Eunji' } } },
  { id: 'ev-007', title: 'Database Migration Evidence', type: 'deliverable', status: 'missing', phase: { id: 'ph-3', name: 'Implementation', order: 3 }, sourceEntity: { entityType: 'task', entityId: 'DB-MIG-001', entityTitle: 'Database Migration Task' }, createdAt: '2026-02-07T08:00:00Z', updatedAt: '2026-02-07T08:00:00Z' },
  { id: 'ev-008', title: 'Sprint 4 Velocity Report', type: 'deliverable', status: 'approved', phase: { id: 'ph-3', name: 'Development', order: 3 }, sourceEntity: { entityType: 'sprint', entityId: 'SPR-004', entityTitle: 'Sprint 4' }, createdAt: '2026-02-03T10:30:00Z', updatedAt: '2026-02-04T10:30:00Z', file: { fileName: 'Sprint4_Velocity.pdf', fileSize: 88000, mimeType: 'application/pdf', uploadedAt: '2026-02-03T10:30:00Z' }, approval: { approvedAt: '2026-02-04T10:30:00Z', approvedBy: { userId: 'u-5', name: 'Jung Taewoo' } } },
  { id: 'ev-009', title: 'Code Review Checklist', type: 'decision_record', status: 'rejected', phase: { id: 'ph-3', name: 'Development', order: 3 }, sourceEntity: { entityType: 'review', entityId: 'DEV-Review-003', entityTitle: 'Code Review Round 3' }, createdAt: '2026-02-01T15:00:00Z', updatedAt: '2026-02-02T15:00:00Z', file: { fileName: 'CodeReview_Checklist.docx', fileSize: 67000, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', uploadedAt: '2026-02-01T15:00:00Z' } },
  { id: 'ev-010', title: 'Risk Assessment Matrix', type: 'decision_record', status: 'approved', phase: { id: 'ph-1', name: 'Analysis', order: 1 }, sourceEntity: { entityType: 'risk', entityId: 'RISK-001', entityTitle: 'RISK-001 ~ RISK-015' }, createdAt: '2026-01-29T09:45:00Z', updatedAt: '2026-01-30T09:45:00Z', file: { fileName: 'RiskMatrix_v1.3.xlsx', fileSize: 198000, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', uploadedAt: '2026-01-29T09:45:00Z' }, approval: { approvedAt: '2026-01-30T09:45:00Z', approvedBy: { userId: 'u-6', name: 'Kang Jihoon' } } },
  { id: 'ev-011', title: 'Performance Test Baseline', type: 'test_result', status: 'missing', phase: { id: 'ph-4', name: 'Testing', order: 4 }, sourceEntity: { entityType: 'test', entityId: 'PERF-001', entityTitle: 'Performance Baseline Test' }, createdAt: '2026-02-08T07:00:00Z', updatedAt: '2026-02-08T07:00:00Z' },
  { id: 'ev-012', title: 'Deployment Checklist Sign-off', type: 'deliverable', status: 'pending', phase: { id: 'ph-5', name: 'Deployment', order: 5 }, sourceEntity: { entityType: 'task', entityId: 'DEPLOY-001', entityTitle: 'Production Deployment' }, createdAt: '2026-02-07T14:00:00Z', updatedAt: '2026-02-07T14:00:00Z', file: { fileName: 'DeployChecklist.pdf', fileSize: 125000, mimeType: 'application/pdf', uploadedAt: '2026-02-07T14:00:00Z' } },
];

// Use mock data as fallback (no backend API for audit evidence yet)
const evidence: EvidenceItem[] = MOCK_EVIDENCE;

export default function AuditEvidencePage({ userRole }: AuditEvidencePageProps) {
  // Locked to AUDIT_EVIDENCE preset
  const { currentPreset, switchPreset } = usePreset(userRole.toUpperCase());
  const lockedPreset: ViewModePreset = 'AUDIT_EVIDENCE';

  const { filters, setFilters } = useFilterSpec({
    keys: AUDIT_EVIDENCE_FILTER_KEYS,
    syncUrl: false,
  });

  // Panel state
  const [panelMode, setPanelMode] = useState<AuditEvidencePanelMode>('list');
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exportFormat, setExportFormat] = useState<'zip' | 'pdf'>('zip');

  // Filter evidence
  const filteredEvidence = useMemo(() => {
    let result = [...evidence];

    // Search filter
    const searchQuery = (filters.q as string) || '';
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(query) ||
          e.sourceEntity.entityId.toLowerCase().includes(query) ||
          e.sourceEntity.entityTitle.toLowerCase().includes(query)
      );
    }

    // Phase filter
    const phaseFilter = filters.phaseId as string | undefined;
    if (phaseFilter) {
      result = result.filter((e) => e.phase.id === phaseFilter);
    }

    // Evidence type filter
    const typeFilter = filters.evidenceType as string | undefined;
    if (typeFilter) {
      result = result.filter((e) => e.type === typeFilter);
    }

    // Status filter
    const statusFilter = filters.status as string | undefined;
    if (statusFilter) {
      result = result.filter((e) => e.status === statusFilter);
    }

    return result;
  }, [filters]);

  // Selection handlers
  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredEvidence.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEvidence.map((e) => e.id)));
    }
  }, [filteredEvidence, selectedIds]);

  const handleSelectItem = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleRowClick = useCallback(
    (id: string) => {
      setSelectedEvidenceId(id);
      setPanelMode('preview');
    },
    []
  );

  const handleClosePanel = useCallback(() => {
    setPanelMode('list');
    setSelectedEvidenceId(null);
  }, []);

  const handleStartExport = useCallback(() => {
    setPanelMode('export');
  }, []);

  const handleExportClick = useCallback(
    (format: 'zip' | 'pdf') => {
      setExportFormat(format);
      if (selectedIds.size === 0) return;
      setPanelMode('confirm');
    },
    [selectedIds]
  );

  // Estimated size of selected items
  const estimatedSize = useMemo(() => {
    return evidence
      .filter((e) => selectedIds.has(e.id))
      .reduce((acc, e) => acc + (e.file?.fileSize || 0), 0);
  }, [selectedIds]);

  const allSelected = filteredEvidence.length > 0 && selectedIds.size === filteredEvidence.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < filteredEvidence.length;

  return (
    <div className="flex-1 p-6 space-y-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Shield size={24} className="text-red-600" />
              Audit Evidence Export
            </h1>
            <p className="text-gray-500 mt-1">
              Automated audit evidence packaging for compliance review
            </p>
          </div>
          <div className="mx-3 h-8 w-px bg-gray-200" />
          {/* Locked preset indicator */}
          <div className="flex items-center gap-2">
            <PresetSwitcher
              currentPreset={lockedPreset}
              availablePresets={['AUDIT_EVIDENCE']}
              onSwitch={() => {}}
              compact
            />
            <Lock size={14} className="text-gray-400" />
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <AuditEvidenceKpiRow
        metrics={{
          submissionReadyCoverage: evidence.length > 0
            ? Math.round((evidence.filter((e) => e.status === 'approved').length / evidence.length) * 100)
            : 0,
          missingEvidenceCount: evidence.filter((e) => e.status === 'missing').length,
          pendingApprovals: evidence.filter((e) => e.status === 'pending').length,
          exportCount: 0,
        }}
      />

      {/* Compliance Checklist */}
      <ComplianceChecklist />

      {/* Filters */}
      <AuditEvidenceFilters values={filters} onChange={setFilters} preset={lockedPreset} />

      {/* Evidence Table + Right Panel */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Table */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected;
                      }}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300"
                      aria-label="Select all"
                    />
                  </th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                    Type
                  </th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                    Phase
                  </th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                    Status
                  </th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-36">
                    File
                  </th>
                  <th className="text-left py-3 px-3 text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEvidence.map((item) => {
                  const typeConfig = EVIDENCE_TYPE_CONFIG[item.type];
                  const statusConfig = EVIDENCE_STATUS_CONFIG[item.status];
                  const isSelected = selectedIds.has(item.id);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50/50' : ''
                      } ${selectedEvidenceId === item.id ? 'bg-indigo-50' : ''}`}
                      onClick={() => handleRowClick(item.id)}
                    >
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectItem(item.id);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-gray-300"
                          aria-label={`Select ${item.title}`}
                        />
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium"
                          style={{ color: typeConfig.color, backgroundColor: typeConfig.bgColor }}
                        >
                          {typeConfig.label}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <FileText size={14} className="text-gray-400 shrink-0" />
                          <span className="text-sm text-gray-800 font-medium truncate max-w-[260px]">
                            {item.title}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-xs text-gray-600">{item.phase.name}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium"
                          style={{ color: statusConfig.color, backgroundColor: statusConfig.bgColor }}
                        >
                          <StatusIcon status={item.status} />
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {item.file ? (
                          <div className="text-xs text-gray-500">
                            <span className="truncate block max-w-[120px]">
                              {item.file.fileName}
                            </span>
                            <span className="text-gray-400">
                              {formatFileSize(item.file.fileSize)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">No file</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-xs text-gray-500">
                          {formatDate(item.updatedAt)}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {filteredEvidence.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-sm text-gray-400">
                      No evidence items match the current filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Panel */}
        {panelMode !== 'list' && (
          <AuditEvidenceRightPanel
            mode={panelMode}
            selectedEvidenceId={selectedEvidenceId}
            selectedIds={selectedIds}
            evidence={evidence}
            exportFormat={exportFormat}
            onExportFormatChange={setExportFormat}
            onStartExport={handleStartExport}
            onClose={handleClosePanel}
            onModeChange={setPanelMode}
          />
        )}
      </div>

      {/* Selection Summary Bar (fixed bottom) */}
      {selectedIds.size > 0 && (
        <div className="sticky bottom-0 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-800">
              {selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''} selected
            </span>
            <span className="text-xs text-gray-500">
              Est. size: {formatFileSize(estimatedSize)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExportClick('zip')}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Package size={14} />
              Export ZIP
            </button>
            <button
              onClick={() => handleExportClick('pdf')}
              className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <FileText size={14} />
              Export PDF
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
