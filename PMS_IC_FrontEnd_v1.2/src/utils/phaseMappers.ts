/**
 * Phase-related status mappers and utilities
 * Extracted from PhaseManagement.tsx to reduce code duplication
 */

// Type definitions
export type PhaseStatus = 'completed' | 'inProgress' | 'pending';
export type DeliverableStatus = 'approved' | 'review' | 'draft' | 'pending' | 'rejected';
export type KpiStatus = 'achieved' | 'onTrack' | 'atRisk';

export interface Phase {
  id: string;
  name: string;
  description: string;
  status: PhaseStatus;
  progress: number;
  startDate: string;
  endDate: string;
  deliverables: Deliverable[];
  kpis: KPI[];
  parentId?: string;
}

export type RagStatus = 'PENDING' | 'INDEXING' | 'READY' | 'FAILED';

export interface Deliverable {
  id: string;
  name: string;
  status: DeliverableStatus;
  uploadDate?: string;
  approver?: string;
  fileName?: string;
  fileSize?: number;
  // RAG indexing status fields
  ragStatus?: RagStatus;
  ragLastError?: string;
  ragUpdatedAt?: string;
  ragVersion?: number;
  ragDocId?: string;
}

export interface KPI {
  id: string;
  name: string;
  target: string;
  current: string;
  status: KpiStatus;
}

// API to UI status mappers
export const mapPhaseStatus = (status?: string): PhaseStatus => {
  switch (status) {
    case 'COMPLETED':
      return 'completed';
    case 'IN_PROGRESS':
      return 'inProgress';
    default:
      return 'pending';
  }
};

export const mapDeliverableStatus = (status?: string): DeliverableStatus => {
  switch (status) {
    case 'APPROVED':
      return 'approved';
    case 'IN_REVIEW':
      return 'review';
    case 'REJECTED':
      return 'rejected';
    case 'PENDING':
      return 'pending';
    default:
      return 'draft';
  }
};

export const mapKpiStatus = (status?: string): KpiStatus => {
  switch (status) {
    case 'ACHIEVED':
      return 'achieved';
    case 'AT_RISK':
      return 'atRisk';
    default:
      return 'onTrack';
  }
};

// UI to API status mappers
export const mapPhaseStatusToApi = (status: PhaseStatus): string => {
  switch (status) {
    case 'completed':
      return 'COMPLETED';
    case 'inProgress':
      return 'IN_PROGRESS';
    default:
      return 'NOT_STARTED';
  }
};

export const mapKpiStatusToApi = (status: KpiStatus): string => {
  switch (status) {
    case 'achieved':
      return 'ACHIEVED';
    case 'atRisk':
      return 'AT_RISK';
    default:
      return 'ON_TRACK';
  }
};

// Entity mappers from API response
export const mapDeliverableFromApi = (deliverable: any): Deliverable => ({
  id: String(deliverable.id),
  name: deliverable.name,
  status: mapDeliverableStatus(deliverable.status),
  uploadDate: formatDate(deliverable.uploadedAt),
  approver: deliverable.approver,
  fileName: deliverable.fileName,
  fileSize: deliverable.fileSize,
  // RAG indexing status
  ragStatus: deliverable.ragStatus as RagStatus | undefined,
  ragLastError: deliverable.ragLastError,
  ragUpdatedAt: deliverable.ragUpdatedAt,
  ragVersion: deliverable.ragVersion,
  ragDocId: deliverable.ragDocId,
});

export const mapKpiFromApi = (kpi: any): KPI => ({
  id: String(kpi.id),
  name: kpi.name,
  target: kpi.target,
  current: kpi.current ?? '-',
  status: mapKpiStatus(kpi.status),
});

export const mapPhaseFromApi = (phase: any): Phase => ({
  id: String(phase.id),
  name: phase.name,
  description: phase.description || '',
  status: mapPhaseStatus(phase.status),
  progress: phase.progress ?? 0,
  startDate: phase.startDate || '',
  endDate: phase.endDate || '',
  deliverables: [],
  kpis: [],
  parentId: phase.parentId || undefined,
});

// Utility functions
export const formatDate = (value?: string): string | undefined => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().split('T')[0];
};

export const normalizeResponse = <T,>(response: any, fallback: T): T => {
  const data = response?.data ?? response;
  if (data === undefined || data === null) {
    return fallback;
  }
  return data;
};

// Status color and label utilities for phase-related statuses
export const getPhaseStatusColor = (status: string): string => {
  switch (status) {
    case 'completed':
    case 'approved':
    case 'achieved':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'inProgress':
    case 'review':
    case 'onTrack':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'draft':
    case 'atRisk':
      return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'rejected':
      return 'text-red-600 bg-red-50 border-red-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

export const getPhaseStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    completed: '완료',
    inProgress: '진행중',
    pending: '대기',
    approved: '승인',
    review: '검토중',
    draft: '작성중',
    rejected: '반려',
    achieved: '달성',
    onTrack: '정상',
    atRisk: '위험',
  };
  return labels[status] || status;
};

// RAG status utilities
export const getRagStatusColor = (status?: RagStatus): string => {
  switch (status) {
    case 'READY':
      return 'text-green-600';
    case 'INDEXING':
    case 'PENDING':
      return 'text-blue-600';
    case 'FAILED':
      return 'text-red-600';
    default:
      return 'text-gray-400';
  }
};

export const getRagStatusLabel = (status?: RagStatus): string => {
  const labels: Record<string, string> = {
    READY: 'AI 검색 가능',
    INDEXING: '인덱싱 중',
    PENDING: '대기 중',
    FAILED: '인덱싱 실패',
  };
  return status ? labels[status] || status : '';
};
