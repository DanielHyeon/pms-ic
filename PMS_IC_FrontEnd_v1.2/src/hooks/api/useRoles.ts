import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { unwrapOrThrow } from '../../utils/toViewState';
import { ProjectRole, SystemRole } from '../../types/auth';

// Types
interface SystemUser {
  id: string;
  name: string;
  email: string;
  department: string;
  systemRole: SystemRole;
  legacyRole: string;
  status: 'active' | 'inactive';
  createdAt: string;
  projectRoles?: { projectId: string; projectName: string; role: ProjectRole }[];
}

interface Permission {
  id: string;
  category: string;
  name: string;
  roles: {
    sponsor: boolean;
    pmo_head: boolean;
    pm: boolean;
    developer: boolean;
    qa: boolean;
    business_analyst: boolean;
    auditor: boolean;
    admin: boolean;
  };
}

interface ProjectMember {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: ProjectRole;
  partName?: string;
  assignedAt: string;
}

// Query keys
export const roleKeys = {
  all: ['roles'] as const,
  users: () => [...roleKeys.all, 'users'] as const,
  usersList: () => [...roleKeys.users(), 'list'] as const,
  permissions: () => [...roleKeys.all, 'permissions'] as const,
  permissionsList: () => [...roleKeys.permissions(), 'list'] as const,
  projectMembers: () => [...roleKeys.all, 'projectMembers'] as const,
  projectMembersList: (projectId: string) => [...roleKeys.projectMembers(), 'list', { projectId }] as const,
};

// Mock data for project members fallback
const mockProjectMembers: ProjectMember[] = [
  { id: 'm1', userId: 'user-001', userName: '김철수', userEmail: 'kim@example.com', role: 'pm', assignedAt: '2025-01-02' },
  { id: 'm2', userId: 'user-002', userName: '이영희', userEmail: 'lee@example.com', role: 'owner', assignedAt: '2025-01-02' },
  { id: 'm3', userId: 'user-003', userName: '박민수', userEmail: 'park@example.com', role: 'part_leader', partName: 'UI/UX 파트', assignedAt: '2025-01-05' },
  { id: 'm4', userId: 'user-004', userName: '최영수', userEmail: 'choi@example.com', role: 'part_leader', partName: '백엔드 파트', assignedAt: '2025-01-05' },
  { id: 'm5', userId: 'user-005', userName: '정수진', userEmail: 'jung@example.com', role: 'education_mgr', assignedAt: '2025-01-10' },
  { id: 'm6', userId: 'user-006', userName: '한미영', userEmail: 'han@example.com', role: 'qa_lead', assignedAt: '2025-01-10' },
  { id: 'm7', userId: 'user-007', userName: '오현우', userEmail: 'oh@example.com', role: 'ba', assignedAt: '2025-01-10' },
  { id: 'm8', userId: 'user-008', userName: '김지은', userEmail: 'kim2@example.com', role: 'member', partName: 'UI/UX 파트', assignedAt: '2025-01-15' },
  { id: 'm9', userId: 'user-009', userName: '이준호', userEmail: 'lee2@example.com', role: 'member', partName: '백엔드 파트', assignedAt: '2025-01-15' },
];

// ========== User Hooks ==========

export function useUsers() {
  return useQuery<SystemUser[]>({
    queryKey: roleKeys.usersList(),
    queryFn: async () => {
      const result = await apiService.getUsersResult();
      const data = unwrapOrThrow(result) as SystemUser[];
      // Add mock project roles
      return data.map(user => ({
        ...user,
        projectRoles: user.legacyRole === 'pm' ? [
          { projectId: '1', projectName: 'AI 기반 손해보험 지급심사', role: 'pm' as ProjectRole }
        ] : []
      }));
    },
  });
}

export function useUpdateUserSystemRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: SystemRole }) =>
      apiService.updateUserSystemRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.usersList() });
    },
  });
}

export function useAssignPM() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, projectIds }: { userId: string; projectIds: string[] }) =>
      apiService.assignPM(userId, projectIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.usersList() });
    },
  });
}

export function useRevokePM() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, projectId }: { userId: string; projectId: string }) =>
      apiService.revokePM(userId, projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.usersList() });
    },
  });
}

// ========== Permission Hooks ==========

export function usePermissions() {
  return useQuery<Permission[]>({
    queryKey: roleKeys.permissionsList(),
    queryFn: async () => {
      const result = await apiService.getPermissionsResult();
      const data = unwrapOrThrow(result);
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useUpdateRolePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      role,
      permissionId,
      value,
    }: {
      role: string;
      permissionId: string;
      value: boolean;
    }) => apiService.updateRolePermission(role, permissionId, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.permissionsList() });
    },
  });
}

// ========== Project Member Hooks ==========

export function useProjectMembers(projectId?: string) {
  return useQuery<ProjectMember[]>({
    queryKey: roleKeys.projectMembersList(projectId!),
    queryFn: async () => {
      const result = await apiService.getProjectMembersResult(projectId!);
      return unwrapOrThrow(result) as ProjectMember[];
    },
    enabled: !!projectId,
  });
}

export function useUpdateProjectMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      memberId,
      role,
    }: {
      projectId: string;
      memberId: string;
      role: ProjectRole;
    }) => apiService.updateProjectMemberRole(projectId, memberId, role),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: roleKeys.projectMembersList(projectId) });
    },
    onError: (_, { projectId }) => {
      // Optimistically update on error too (for mock fallback behavior)
      queryClient.invalidateQueries({ queryKey: roleKeys.projectMembersList(projectId) });
    },
  });
}

export function useRemoveProjectMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, memberId }: { projectId: string; memberId: string }) =>
      apiService.removeProjectMember(projectId, memberId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: roleKeys.projectMembersList(projectId) });
    },
    onError: (_, { projectId }) => {
      // Optimistically update on error too (for mock fallback behavior)
      queryClient.invalidateQueries({ queryKey: roleKeys.projectMembersList(projectId) });
    },
  });
}

export function useAddProjectMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      userId,
      role,
    }: {
      projectId: string;
      userId: string;
      role: ProjectRole;
    }) => apiService.addProjectMember(projectId, userId, role),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: roleKeys.projectMembersList(projectId) });
    },
  });
}
