import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';

// ==================== Types ====================

export interface OrgPartDto {
  id: string;
  projectId: string;
  name: string;
  partType: string;
  customTypeName?: string | null;
  status: 'ACTIVE' | 'CLOSED';
  leaderUserId: string;
  leaderName: string;
  coLeaders: { userId: string; userName: string }[];
  memberCount: number;
  createdAt: string;
}

export interface OrgPartMember {
  userId: string;
  userName: string;
  membershipType: 'PRIMARY' | 'SECONDARY';
  joinedAt: string;
}

export interface OrgPartDetailDto {
  id: string;
  projectId: string;
  name: string;
  partType: string;
  customTypeName?: string | null;
  status: 'ACTIVE' | 'CLOSED';
  leaderUserId: string;
  leaderName: string;
  coLeaders: { userId: string; userName: string }[];
  members: OrgPartMember[];
}

export interface LeaderWarningDto {
  partId: string;
  leaderUserId: string;
  leaderName: string;
  missingCapabilities: string[];
  hasWarning: boolean;
  message?: string;
}

export interface CreateOrgPartRequest {
  name: string;
  partType: string;
  customTypeName?: string;
  leaderUserId: string;
}

export interface AddMemberRequest {
  userId: string;
  membershipType: 'PRIMARY' | 'SECONDARY';
}

export interface UserPartSummaryDto {
  userId: string;
  memberships: {
    partId: string;
    partName: string;
    membershipType: 'PRIMARY' | 'SECONDARY';
  }[];
}

// ==================== Query Keys ====================

export const orgPartKeys = {
  all: ['orgParts'] as const,
  lists: (projectId: string) => [...orgPartKeys.all, 'list', projectId] as const,
  detail: (partId: string) => [...orgPartKeys.all, 'detail', partId] as const,
  leaderWarning: (partId: string) => [...orgPartKeys.all, 'leader-warning', partId] as const,
  userSummary: (projectId: string, userId: string) => [...orgPartKeys.all, 'user-summary', projectId, userId] as const,
};

// ==================== Query Hooks ====================

export function useOrgParts(projectId: string | undefined, activeOnly = false) {
  return useQuery<OrgPartDto[]>({
    queryKey: orgPartKeys.lists(projectId || ''),
    queryFn: () => apiService.getOrgParts(projectId!, activeOnly),
    enabled: !!projectId,
  });
}

export function useOrgPartDetail(partId: string | undefined) {
  return useQuery<OrgPartDetailDto>({
    queryKey: orgPartKeys.detail(partId || ''),
    queryFn: () => apiService.getOrgPartDetail(partId!),
    enabled: !!partId,
  });
}

export function useLeaderWarning(partId: string | undefined) {
  return useQuery<LeaderWarningDto>({
    queryKey: orgPartKeys.leaderWarning(partId || ''),
    queryFn: () => apiService.getLeaderWarning(partId!),
    enabled: !!partId,
  });
}

export function useUserPartSummary(projectId: string | undefined, userId: string | undefined) {
  return useQuery<UserPartSummaryDto>({
    queryKey: orgPartKeys.userSummary(projectId || '', userId || ''),
    queryFn: () => apiService.getUserPartSummary(projectId!, userId!),
    enabled: !!projectId && !!userId,
  });
}

// ==================== Mutation Hooks ====================

export function useCreateOrgPart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: CreateOrgPartRequest }) =>
      apiService.createOrgPart(projectId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: orgPartKeys.lists(projectId) });
    },
  });
}

export function useUpdateOrgPart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ partId, data }: { partId: string; data: { name?: string; partType?: string; customTypeName?: string } }) =>
      apiService.updateOrgPart(partId, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: orgPartKeys.all });
    },
  });
}

export function useCloseOrgPart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (partId: string) => apiService.closeOrgPart(partId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgPartKeys.all });
    },
  });
}

export function useReopenOrgPart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (partId: string) => apiService.reopenOrgPart(partId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgPartKeys.all });
    },
  });
}

export function useChangeOrgPartLeader() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ partId, data }: { partId: string; data: { newLeaderUserId: string; reason: string } }) =>
      apiService.changeOrgPartLeader(partId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orgPartKeys.all });
    },
  });
}

export function useAddOrgPartMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ partId, data }: { partId: string; data: AddMemberRequest }) =>
      apiService.addOrgPartMember(partId, data),
    onSuccess: (_, { partId }) => {
      queryClient.invalidateQueries({ queryKey: orgPartKeys.detail(partId) });
      queryClient.invalidateQueries({ queryKey: orgPartKeys.all });
    },
  });
}

export function useRemoveOrgPartMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ partId, userId }: { partId: string; userId: string }) =>
      apiService.removeOrgPartMember(partId, userId),
    onSuccess: (_, { partId }) => {
      queryClient.invalidateQueries({ queryKey: orgPartKeys.detail(partId) });
      queryClient.invalidateQueries({ queryKey: orgPartKeys.all });
    },
  });
}

export function useSwitchOrgMemberType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ partId, userId }: { partId: string; userId: string }) =>
      apiService.switchOrgMemberType(partId, userId),
    onSuccess: (_, { partId }) => {
      queryClient.invalidateQueries({ queryKey: orgPartKeys.detail(partId) });
    },
  });
}
