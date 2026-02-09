import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';

// ==================== Types ====================

export interface RoleDto {
  id: string;
  name: string;
  code: string;
  description: string;
  scope: string;
  capabilityIds: string[];
}

export interface CapabilityDto {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string;
  isDelegatable: boolean;
  allowRedelegation: boolean;
}

export interface UserRoleDto {
  id: string;
  projectId: string;
  userId: string;
  userName: string;
  roleId: string;
  roleName: string;
  grantedBy: string;
  grantedByName: string;
  grantedAt: string;
  reason?: string;
}

export interface UserCapabilityDto {
  id: string;
  projectId: string;
  userId: string;
  userName: string;
  capabilityId: string;
  capabilityCode: string;
  capabilityName: string;
  grantedBy: string;
  grantedByName: string;
  grantedAt: string;
  reason?: string;
}

export interface DelegationDto {
  id: string;
  projectId: string;
  delegatorId: string;
  delegatorName: string;
  delegateeId: string;
  delegateeName: string;
  capabilityId: string;
  capabilityCode: string;
  capabilityName: string;
  scopeType: string;
  scopePartId?: string;
  scopePartName?: string;
  scopeFunctionDescription?: string;
  durationType: string;
  startAt: string;
  endAt?: string;
  approverId: string;
  approverName: string;
  status: string;
  parentDelegationId?: string;
  reason?: string;
  revokedAt?: string;
  revokedBy?: string;
  revokeReason?: string;
  createdAt: string;
}

export interface DelegationMapNodeDto {
  userId: string;
  userName: string;
  roleName: string;
  delegations: DelegationDto[];
  children: DelegationMapNodeDto[];
}

export interface EffectiveCapabilityDto {
  projectId: string;
  userId: string;
  capabilityId: string;
  capabilityCode: string;
  capabilityName: string;
  sourceType: string; // ROLE, DIRECT, DELEGATION
  sourceId: string;
  priority: number;
}

export interface GovernanceFindingDto {
  id: string;
  runId: string;
  projectId: string;
  findingType: string;
  severity: string;
  userId: string;
  delegationId?: string;
  message: string;
  detailsJson: string;
  createdAt: string;
}

export interface GovernanceCheckRunDto {
  id: string;
  projectId: string;
  checkedAt: string;
  checkedBy: string;
  summaryJson: string;
}

// ==================== Query Keys ====================

export const authorityKeys = {
  all: ['authority'] as const,
  roles: (projectId: string) => [...authorityKeys.all, 'roles', projectId] as const,
  capabilities: (projectId: string, category?: string) => [...authorityKeys.all, 'capabilities', projectId, category] as const,
  userRoles: (projectId: string) => [...authorityKeys.all, 'user-roles', projectId] as const,
  userCapabilities: (projectId: string) => [...authorityKeys.all, 'user-capabilities', projectId] as const,
  delegations: (projectId: string) => [...authorityKeys.all, 'delegations', projectId] as const,
  delegationMap: (projectId: string) => [...authorityKeys.all, 'delegation-map', projectId] as const,
  effectiveCapabilities: (projectId: string, userId: string) => [...authorityKeys.all, 'effective-caps', projectId, userId] as const,
  findings: (projectId: string) => [...authorityKeys.all, 'findings', projectId] as const,
  checkRuns: (projectId: string) => [...authorityKeys.all, 'check-runs', projectId] as const,
};

// ==================== Query Hooks ====================

export function useRolesQuery(projectId: string | undefined) {
  return useQuery({
    queryKey: authorityKeys.roles(projectId || ''),
    queryFn: () => apiService.getRoles(projectId!),
    enabled: !!projectId,
  });
}

export function useCapabilitiesQuery(projectId: string | undefined, category?: string) {
  return useQuery({
    queryKey: authorityKeys.capabilities(projectId || '', category),
    queryFn: () => apiService.getCapabilities(projectId!, category),
    enabled: !!projectId,
  });
}

export function useUserRolesQuery(projectId: string | undefined) {
  return useQuery({
    queryKey: authorityKeys.userRoles(projectId || ''),
    queryFn: () => apiService.getUserRoles(projectId!),
    enabled: !!projectId,
  });
}

export function useUserCapabilitiesQuery(projectId: string | undefined) {
  return useQuery({
    queryKey: authorityKeys.userCapabilities(projectId || ''),
    queryFn: () => apiService.getUserCapabilities(projectId!),
    enabled: !!projectId,
  });
}

export function useDelegationsQuery(projectId: string | undefined) {
  return useQuery({
    queryKey: authorityKeys.delegations(projectId || ''),
    queryFn: () => apiService.getDelegations(projectId!),
    enabled: !!projectId,
  });
}

export function useDelegationMapQuery(projectId: string | undefined) {
  return useQuery({
    queryKey: authorityKeys.delegationMap(projectId || ''),
    queryFn: () => apiService.getDelegationMap(projectId!),
    enabled: !!projectId,
  });
}

export function useEffectiveCapabilitiesQuery(projectId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: authorityKeys.effectiveCapabilities(projectId || '', userId || ''),
    queryFn: () => apiService.getEffectiveCapabilities(projectId!, userId!),
    enabled: !!projectId && !!userId,
  });
}

export function useGovernanceFindingsQuery(projectId: string | undefined) {
  return useQuery({
    queryKey: authorityKeys.findings(projectId || ''),
    queryFn: () => apiService.getGovernanceFindings(projectId!),
    enabled: !!projectId,
  });
}

export function useGovernanceCheckRunsQuery(projectId: string | undefined) {
  return useQuery({
    queryKey: authorityKeys.checkRuns(projectId || ''),
    queryFn: () => apiService.getGovernanceCheckRuns(projectId!),
    enabled: !!projectId,
  });
}

// ==================== Mutation Hooks ====================

export function useGrantUserRole(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { userId: string; roleId: string; reason?: string }) =>
      apiService.grantUserRole(projectId!, data),
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: authorityKeys.userRoles(projectId) });
      }
    },
  });
}

export function useRevokeUserRole(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userRoleId: string) => apiService.revokeUserRole(projectId!, userRoleId),
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: authorityKeys.userRoles(projectId) });
      }
    },
  });
}

export function useGrantUserCapability(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { userId: string; capabilityId: string; reason?: string }) =>
      apiService.grantUserCapability(projectId!, data),
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: authorityKeys.userCapabilities(projectId) });
      }
    },
  });
}

export function useRevokeUserCapability(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userCapId: string) => apiService.revokeUserCapability(projectId!, userCapId),
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: authorityKeys.userCapabilities(projectId) });
      }
    },
  });
}

export function useCreateDelegation(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      delegateeId: string;
      capabilityId: string;
      scopeType: string;
      scopePartId?: string;
      scopeFunctionDescription?: string;
      durationType: string;
      startAt: string;
      endAt?: string;
      approverId: string;
      reason?: string;
      parentDelegationId?: string;
    }) => apiService.createDelegation(projectId!, data),
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: authorityKeys.delegations(projectId) });
        queryClient.invalidateQueries({ queryKey: authorityKeys.delegationMap(projectId) });
      }
    },
  });
}

export function useApproveDelegation(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (delegationId: string) => apiService.approveDelegation(delegationId),
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: authorityKeys.delegations(projectId) });
        queryClient.invalidateQueries({ queryKey: authorityKeys.delegationMap(projectId) });
      }
    },
  });
}

export function useRevokeDelegation(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ delegationId, reason }: { delegationId: string; reason?: string }) =>
      apiService.revokeDelegation(delegationId, reason),
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: authorityKeys.delegations(projectId) });
        queryClient.invalidateQueries({ queryKey: authorityKeys.delegationMap(projectId) });
      }
    },
  });
}

export function useRunGovernanceCheck(projectId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiService.runGovernanceCheck(projectId!),
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: authorityKeys.findings(projectId) });
        queryClient.invalidateQueries({ queryKey: authorityKeys.checkRuns(projectId) });
      }
    },
  });
}
