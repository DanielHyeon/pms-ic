/**
 * WBS Snapshot types for backup/restore functionality
 */

export type SnapshotType = 'PRE_TEMPLATE' | 'MANUAL';
export type SnapshotStatus = 'ACTIVE' | 'RESTORED' | 'DELETED';

export interface WbsSnapshot {
  id: string;
  phaseId: string;
  phaseName?: string;
  projectId: string;
  projectName?: string;
  snapshotName: string;
  description?: string;
  snapshotType: SnapshotType;
  groupCount: number;
  itemCount: number;
  taskCount: number;
  dependencyCount: number;
  status: SnapshotStatus;
  createdAt: string;
  createdBy?: string;
  restoredAt?: string;
  restoredBy?: string;
}

export interface CreateSnapshotRequest {
  phaseId: string;
  snapshotName?: string;
  description?: string;
  snapshotType?: SnapshotType;
}
