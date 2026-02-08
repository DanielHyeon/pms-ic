// Audit Evidence shared types
// Screen 16: Audit Evidence Export

export type EvidenceType =
  | 'deliverable'
  | 'test_result'
  | 'decision_record'
  | 'change_history'
  | 'approval_log'
  | 'meeting_minutes';

export type EvidenceStatus = 'approved' | 'pending' | 'rejected' | 'missing';

export type AuditEvidencePanelMode = 'list' | 'preview' | 'confirm' | 'export';

export interface EvidenceItem {
  id: string;
  type: EvidenceType;
  title: string;
  description?: string;
  phase: { id: string; name: string; order: number };
  status: EvidenceStatus;
  sourceEntity: {
    entityType: string;
    entityId: string;
    entityTitle: string;
  };
  file?: {
    fileName: string;
    fileSize: number;
    mimeType: string;
    uploadedAt: string;
  };
  approval?: {
    approvedAt: string;
    approvedBy: { userId: string; name: string };
  };
  createdAt: string;
  updatedAt: string;
}

export interface PhaseCompliance {
  phaseId: string;
  phaseName: string;
  phaseOrder: number;
  status: 'complete' | 'partial' | 'not_started';
  coverage: number;
  required: number;
  approved: number;
  pending: number;
  missing: number;
  breakdown: {
    type: EvidenceType;
    typeName: string;
    required: number;
    approved: number;
    pending: number;
    missing: number;
  }[];
}

// Evidence type display config
export const EVIDENCE_TYPE_CONFIG: Record<
  EvidenceType,
  { label: string; color: string; bgColor: string }
> = {
  deliverable: { label: 'Deliverable', color: '#1976d2', bgColor: '#e3f2fd' },
  test_result: { label: 'Test Result', color: '#388e3c', bgColor: '#e8f5e9' },
  decision_record: { label: 'Decision', color: '#f57c00', bgColor: '#fff3e0' },
  change_history: { label: 'Change History', color: '#7b1fa2', bgColor: '#f3e5f5' },
  approval_log: { label: 'Approval Log', color: '#0097a7', bgColor: '#e0f7fa' },
  meeting_minutes: { label: 'Meeting Minutes', color: '#5d4037', bgColor: '#efebe9' },
};

export const EVIDENCE_STATUS_CONFIG: Record<
  EvidenceStatus,
  { label: string; color: string; bgColor: string; icon: string }
> = {
  approved: { label: 'Approved', color: '#2e7d32', bgColor: '#e8f5e9', icon: 'CheckCircle' },
  pending: { label: 'Pending', color: '#f57c00', bgColor: '#fff3e0', icon: 'Clock' },
  rejected: { label: 'Rejected', color: '#c62828', bgColor: '#ffebee', icon: 'XCircle' },
  missing: { label: 'Missing', color: '#ad1457', bgColor: '#fce4ec', icon: 'AlertCircle' },
};
