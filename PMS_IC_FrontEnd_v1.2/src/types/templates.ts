/**
 * Phase & WBS Template Types
 *
 * Templates allow reusable Phase and WBS structures to be defined
 * and applied to projects for quick setup.
 *
 * Template Hierarchy:
 * - PhaseTemplate: Defines a standard phase with its WBS structure
 * - WbsGroupTemplate: WBS Group template within a phase
 * - WbsItemTemplate: WBS Item template within a group
 * - WbsTaskTemplate: WBS Task template within an item
 *
 * TemplateSet: A collection of phase templates (e.g., "Insurance PM Methodology")
 */

import { WbsStatus } from './wbs';

// Template status
export type TemplateStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED';

// Template category for filtering
export type TemplateCategory =
  | 'INSURANCE'
  | 'SOFTWARE_DEV'
  | 'INFRASTRUCTURE'
  | 'AI_ML'
  | 'CONSULTING'
  | 'CUSTOM';

// WBS Task Template (Level 3)
export interface WbsTaskTemplate {
  id: string;
  name: string;
  description?: string;
  relativeOrder: number;
  defaultWeight: number;
  estimatedHours?: number;
  deliverableType?: string; // e.g., 'DOCUMENT', 'CODE', 'TEST_RESULT'
}

// WBS Item Template (Level 2 - Work Package)
export interface WbsItemTemplate {
  id: string;
  name: string;
  description?: string;
  relativeOrder: number;
  defaultWeight: number;
  estimatedHours?: number;
  tasks: WbsTaskTemplate[];
}

// WBS Group Template (Level 1)
export interface WbsGroupTemplate {
  id: string;
  name: string;
  description?: string;
  relativeOrder: number;
  defaultWeight: number;
  items: WbsItemTemplate[];
}

// Deliverable Template
export interface DeliverableTemplate {
  id: string;
  name: string;
  description?: string;
  type: 'DOCUMENT' | 'CODE' | 'DATA' | 'REPORT' | 'OTHER';
  isRequired: boolean;
  relativeOrder: number;
}

// KPI Template
export interface KpiTemplate {
  id: string;
  name: string;
  description?: string;
  targetFormula?: string; // e.g., ">=95%", "<=5"
  unit?: string;
  relativeOrder: number;
}

// Phase Template
export interface PhaseTemplate {
  id: string;
  name: string;
  description?: string;
  relativeOrder: number; // Order within template set
  defaultDurationDays?: number;
  wbsGroups: WbsGroupTemplate[];
  deliverables: DeliverableTemplate[];
  kpis: KpiTemplate[];
  color?: string;
  icon?: string;
}

// Template Set (Collection of Phase Templates)
export interface TemplateSet {
  id: string;
  name: string;
  description?: string;
  category: TemplateCategory;
  status: TemplateStatus;
  version: string;
  isDefault: boolean;
  phases: PhaseTemplate[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

// Form data for creating/editing templates
export interface TemplateSetFormData {
  name: string;
  description: string;
  category: TemplateCategory;
  tags: string[];
}

export interface PhaseTemplateFormData {
  name: string;
  description: string;
  defaultDurationDays?: number;
  color?: string;
}

export interface WbsGroupTemplateFormData {
  name: string;
  description: string;
  defaultWeight: number;
}

export interface WbsItemTemplateFormData {
  name: string;
  description: string;
  defaultWeight: number;
  estimatedHours?: number;
}

export interface WbsTaskTemplateFormData {
  name: string;
  description: string;
  defaultWeight: number;
  estimatedHours?: number;
}

// Template Application Options
export interface ApplyTemplateOptions {
  projectId: string;
  templateSetId: string;
  startDate: string;
  selectedPhaseIds?: string[]; // If empty, apply all phases
  adjustDates?: boolean; // Auto-calculate dates based on duration
  includeWbs?: boolean;
  includeDeliverables?: boolean;
  includeKpis?: boolean;
}

// Result of applying a template
export interface ApplyTemplateResult {
  success: boolean;
  createdPhaseIds: string[];
  createdWbsGroupIds: string[];
  createdWbsItemIds: string[];
  createdWbsTaskIds: string[];
  createdDeliverableIds: string[];
  createdKpiIds: string[];
  errors?: string[];
}

// Template Preview (for UI before applying)
export interface TemplatePreview {
  templateSet: TemplateSet;
  estimatedTotalDays: number;
  totalPhases: number;
  totalWbsGroups: number;
  totalWbsItems: number;
  totalWbsTasks: number;
  totalDeliverables: number;
  totalKpis: number;
}

// Helper functions
export const createEmptyTemplateSetForm = (): TemplateSetFormData => ({
  name: '',
  description: '',
  category: 'CUSTOM',
  tags: [],
});

export const createEmptyPhaseTemplateForm = (): PhaseTemplateFormData => ({
  name: '',
  description: '',
  defaultDurationDays: 30,
  color: '#3B82F6',
});

export const createEmptyWbsGroupTemplateForm = (): WbsGroupTemplateFormData => ({
  name: '',
  description: '',
  defaultWeight: 100,
});

export const createEmptyWbsItemTemplateForm = (): WbsItemTemplateFormData => ({
  name: '',
  description: '',
  defaultWeight: 100,
});

export const createEmptyWbsTaskTemplateForm = (): WbsTaskTemplateFormData => ({
  name: '',
  description: '',
  defaultWeight: 100,
});

// Category labels
export const getCategoryLabel = (category: TemplateCategory): string => {
  const labels: Record<TemplateCategory, string> = {
    INSURANCE: '보험 프로젝트',
    SOFTWARE_DEV: '소프트웨어 개발',
    INFRASTRUCTURE: '인프라 구축',
    AI_ML: 'AI/ML 프로젝트',
    CONSULTING: '컨설팅',
    CUSTOM: '사용자 정의',
  };
  return labels[category];
};

export const getCategoryColor = (category: TemplateCategory): string => {
  const colors: Record<TemplateCategory, string> = {
    INSURANCE: 'bg-blue-100 text-blue-800',
    SOFTWARE_DEV: 'bg-purple-100 text-purple-800',
    INFRASTRUCTURE: 'bg-gray-100 text-gray-800',
    AI_ML: 'bg-emerald-100 text-emerald-800',
    CONSULTING: 'bg-amber-100 text-amber-800',
    CUSTOM: 'bg-slate-100 text-slate-800',
  };
  return colors[category];
};

// Status labels
export const getTemplateStatusLabel = (status: TemplateStatus): string => {
  const labels: Record<TemplateStatus, string> = {
    ACTIVE: '활성',
    DRAFT: '초안',
    ARCHIVED: '보관됨',
  };
  return labels[status];
};

export const getTemplateStatusColor = (status: TemplateStatus): string => {
  const colors: Record<TemplateStatus, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    DRAFT: 'bg-yellow-100 text-yellow-800',
    ARCHIVED: 'bg-gray-100 text-gray-500',
  };
  return colors[status];
};

// Calculate template statistics
export const calculateTemplateStats = (templateSet: TemplateSet): TemplatePreview => {
  let totalWbsGroups = 0;
  let totalWbsItems = 0;
  let totalWbsTasks = 0;
  let totalDeliverables = 0;
  let totalKpis = 0;
  let estimatedTotalDays = 0;

  templateSet.phases.forEach((phase) => {
    estimatedTotalDays += phase.defaultDurationDays || 0;
    totalDeliverables += phase.deliverables.length;
    totalKpis += phase.kpis.length;

    phase.wbsGroups.forEach((group) => {
      totalWbsGroups++;
      group.items.forEach((item) => {
        totalWbsItems++;
        totalWbsTasks += item.tasks.length;
      });
    });
  });

  return {
    templateSet,
    estimatedTotalDays,
    totalPhases: templateSet.phases.length,
    totalWbsGroups,
    totalWbsItems,
    totalWbsTasks,
    totalDeliverables,
    totalKpis,
  };
};

// Validate template set
export const validateTemplateSet = (template: Partial<TemplateSet>): string[] => {
  const errors: string[] = [];

  if (!template.name?.trim()) {
    errors.push('템플릿 이름은 필수입니다.');
  }

  if (!template.phases || template.phases.length === 0) {
    errors.push('최소 1개 이상의 Phase가 필요합니다.');
  }

  return errors;
};

// Generate unique ID for templates
export const generateTemplateId = (prefix: string = 'tmpl'): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
