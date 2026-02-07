import { useMemo } from 'react';
import { useProject } from '../../contexts/ProjectContext';
import { usePermission } from '../usePermission';

/**
 * Capability constants matching backend Capability.java
 */
export const CAPABILITIES = {
  VIEW_BACKLOG: 'VIEW_BACKLOG',
  EDIT_BACKLOG_ITEM: 'EDIT_BACKLOG_ITEM',
  APPROVE_BACKLOG_ITEM: 'APPROVE_BACKLOG_ITEM',
  VIEW_STORY: 'VIEW_STORY',
  EDIT_STORY: 'EDIT_STORY',
  MANAGE_SPRINT: 'MANAGE_SPRINT',
  ASSIGN_TASK: 'ASSIGN_TASK',
  VIEW_PART_WORKLOAD: 'VIEW_PART_WORKLOAD',
  VIEW_KPI: 'VIEW_KPI',
  VIEW_AUDIT_LOG: 'VIEW_AUDIT_LOG',
  EXPORT_REPORT: 'EXPORT_REPORT',
  VIEW_DATA_QUALITY: 'VIEW_DATA_QUALITY',
} as const;

export type Capability = typeof CAPABILITIES[keyof typeof CAPABILITIES];

/**
 * Role-to-capability mapping (mirrors backend Capability.getDefaultCapabilities)
 */
const ROLE_CAPABILITIES: Record<string, Capability[]> = {
  sponsor: [
    CAPABILITIES.VIEW_BACKLOG, CAPABILITIES.EDIT_BACKLOG_ITEM, CAPABILITIES.APPROVE_BACKLOG_ITEM,
    CAPABILITIES.VIEW_STORY, CAPABILITIES.VIEW_PART_WORKLOAD, CAPABILITIES.VIEW_KPI, CAPABILITIES.EXPORT_REPORT,
  ],
  po: [
    CAPABILITIES.VIEW_BACKLOG, CAPABILITIES.EDIT_BACKLOG_ITEM, CAPABILITIES.APPROVE_BACKLOG_ITEM,
    CAPABILITIES.VIEW_STORY, CAPABILITIES.VIEW_PART_WORKLOAD, CAPABILITIES.VIEW_KPI, CAPABILITIES.EXPORT_REPORT,
  ],
  pm: [
    CAPABILITIES.VIEW_BACKLOG, CAPABILITIES.VIEW_STORY, CAPABILITIES.EDIT_STORY,
    CAPABILITIES.MANAGE_SPRINT, CAPABILITIES.ASSIGN_TASK, CAPABILITIES.VIEW_PART_WORKLOAD,
  ],
  pmo_head: [
    CAPABILITIES.VIEW_BACKLOG, CAPABILITIES.VIEW_STORY, CAPABILITIES.VIEW_PART_WORKLOAD,
    CAPABILITIES.VIEW_KPI, CAPABILITIES.VIEW_AUDIT_LOG, CAPABILITIES.EXPORT_REPORT, CAPABILITIES.VIEW_DATA_QUALITY,
  ],
  developer: [CAPABILITIES.VIEW_BACKLOG, CAPABILITIES.VIEW_STORY, CAPABILITIES.VIEW_PART_WORKLOAD],
  qa: [CAPABILITIES.VIEW_BACKLOG, CAPABILITIES.VIEW_STORY, CAPABILITIES.VIEW_PART_WORKLOAD],
  business_analyst: [CAPABILITIES.VIEW_BACKLOG, CAPABILITIES.VIEW_STORY, CAPABILITIES.VIEW_PART_WORKLOAD],
  member: [CAPABILITIES.VIEW_BACKLOG, CAPABILITIES.VIEW_STORY],
};

interface UseProjectAuthReturn {
  projectId: string | null;
  role: string | null;
  capabilities: Capability[];
  hasCapability: (cap: Capability) => boolean;
  hasAnyCapability: (...caps: Capability[]) => boolean;
  hasAllCapabilities: (...caps: Capability[]) => boolean;
}

/**
 * Hook providing project-scoped capability-based auth.
 * Uses the existing permission system and maps roles to capabilities.
 */
export function useProjectAuth(): UseProjectAuthReturn {
  const { currentProject } = useProject();
  const { currentProjectRole, isAdmin } = usePermission();

  const projectId = currentProject?.id || null;

  const capabilities = useMemo<Capability[]>(() => {
    if (isAdmin) {
      return Object.values(CAPABILITIES);
    }
    if (!currentProjectRole) return [];
    return ROLE_CAPABILITIES[currentProjectRole] || [];
  }, [currentProjectRole, isAdmin]);

  const hasCapability = useMemo(
    () => (cap: Capability) => capabilities.includes(cap),
    [capabilities]
  );

  const hasAnyCapability = useMemo(
    () => (...caps: Capability[]) => caps.some(c => capabilities.includes(c)),
    [capabilities]
  );

  const hasAllCapabilities = useMemo(
    () => (...caps: Capability[]) => caps.every(c => capabilities.includes(c)),
    [capabilities]
  );

  return {
    projectId,
    role: currentProjectRole,
    capabilities,
    hasCapability,
    hasAnyCapability,
    hasAllCapabilities,
  };
}
