import { Phase, Deliverable, KPI, PhaseStatus } from '../../../utils/phaseMappers';

// Re-export from phaseMappers for convenience
export type { Phase, Deliverable, KPI, PhaseStatus };

// Type for API phase data
export interface ApiPhase {
  id: string;
  name?: string;
  description?: string;
  status?: string;
  progress?: number;
  orderNum?: number;
  startDate?: string;
  endDate?: string;
  deliverables?: Array<{
    id: string;
    name: string;
    status?: string;
    uploadDate?: string;
    approver?: string;
    [key: string]: unknown;
  }>;
  kpis?: Array<{
    id: string;
    name: string;
    target?: string;
    current?: string;
    status?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

// Form types
export interface PhaseFormData {
  name: string;
  description: string;
  status: PhaseStatus;
  startDate: string;
  endDate: string;
  progress: number;
}

export interface KpiFormData {
  name: string;
  target: string;
  current: string;
  status: KPI['status'];
}

// Phase detail tab type
export type PhaseDetailTab = 'deliverables' | 'wbs' | 'integration';

// Settings modal tab type
export type SettingsTabType = 'template' | 'category';
