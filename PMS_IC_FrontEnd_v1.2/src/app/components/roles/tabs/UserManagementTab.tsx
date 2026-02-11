import { useMemo, useState } from 'react';
import {
  Shield,
  Users,
  Search,
  ChevronDown,
  ChevronRight,
  Briefcase,
  Building2,
  FolderKanban,
  Trash2,
} from 'lucide-react';
import { useProject } from '../../../../contexts/ProjectContext';
import { SystemRole, ProjectRole, SYSTEM_ROLE_LABELS, PROJECT_ROLE_LABELS } from '../../../../types/auth';
import {
  useUsers,
  useUpdateUserSystemRole,
  useAssignPM,
  useRevokePM,
  useProjectMembers,
} from '../../../../hooks/api/useRoles';
import { MessageAlert, LoadingSpinner } from '../shared';
import { AssignPMDialog } from '../dialogs';
import type { SystemUser, Message } from '../types';
import type { UserRole } from '../../../App';

interface UserManagementTabProps {
  userRole: UserRole;
}

/**
 * 사용자 관리 탭
 * - admin: 전체 사용자 표시 + 시스템 역할 변경 가능
 * - pmo_head / pm: 현재 프로젝트의 구성원만 표시 (시스템 역할 변경 불가)
 */
export function UserManagementTab({ userRole }: UserManagementTabProps) {
  const { projects, currentProject } = useProject();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [message, setMessage] = useState<Message | null>(null);
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [showAssignPMDialog, setShowAssignPMDialog] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const isAdmin = userRole === 'admin';

  // TanStack Query hooks
  const { data: users = [], isLoading: loading } = useUsers();
  const { data: projectMembers = [] } = useProjectMembers(currentProject?.id);
  const updateSystemRoleMutation = useUpdateUserSystemRole();
  const assignPMMutation = useAssignPM();
  const revokePMMutation = useRevokePM();

  // PMO/PM은 현재 프로젝트 구성원만 표시
  const projectMemberIds = useMemo(() => {
    if (isAdmin) return null; // admin은 필터링 안 함
    return new Set(projectMembers.map((m) => m.userId));
  }, [isAdmin, projectMembers]);

  // 사용자 필터링: 검색 + 역할 + (PMO/PM일 때) 프로젝트 구성원 필터
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // PMO/PM: 현재 프로젝트 구성원만
      if (projectMemberIds && !projectMemberIds.has(user.id)) return false;

      const matchesSearch =
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.department.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'all' || user.systemRole === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, projectMemberIds, searchTerm, roleFilter]);

  // 시스템 역할 변경 (admin 전용)
  const handleChangeSystemRole = async (userId: string, newRole: SystemRole) => {
    try {
      await updateSystemRoleMutation.mutateAsync({ userId, role: newRole });
      setMessage({
        type: 'success',
        text: `시스템 역할이 ${SYSTEM_ROLE_LABELS[newRole]}(으)로 변경되었습니다`,
      });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Failed to update system role:', error);
      setMessage({ type: 'error', text: '역할 변경에 실패했습니다' });
    }
  };

  // PM 지정
  const handleAssignPM = async (userId: string, projectIds: string[]) => {
    try {
      await assignPMMutation.mutateAsync({ userId, projectIds });
      setMessage({ type: 'success', text: 'PM 역할이 지정되었습니다' });
      setShowAssignPMDialog(false);
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Failed to assign PM:', error);
      setMessage({ type: 'error', text: 'PM 지정에 실패했습니다' });
    }
  };

  // PM 해제
  const handleRevokePM = async (userId: string, projectId: string) => {
    if (!confirm('이 사용자의 PM 역할을 해제하시겠습니까?')) return;

    try {
      await revokePMMutation.mutateAsync({ userId, projectId });
      setMessage({ type: 'success', text: 'PM 역할이 해제되었습니다' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Failed to revoke PM:', error);
      setMessage({ type: 'error', text: 'PM 해제에 실패했습니다' });
    }
  };

  const getSystemRoleBadge = (role: SystemRole) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-700';
      case 'pmo':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return <LoadingSpinner message="사용자 목록을 불러오는 중..." />;
  }

  return (
    <div className="space-y-6">
      {/* 역할별 안내 */}
      <RoleNotice isAdmin={isAdmin} projectName={currentProject?.name} />

      {/* Message */}
      {message && <MessageAlert message={message} />}

      {/* Search and Filter */}
      <SearchFilter
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
      />

      {/* User List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="text-blue-600" size={24} />
              <div>
                <h3 className="font-semibold text-gray-900">
                  {isAdmin ? '전체 사용자' : `${currentProject?.name ?? '프로젝트'} 구성원`}
                </h3>
                <p className="text-sm text-gray-500">{filteredUsers.length}명</p>
              </div>
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {filteredUsers.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              {searchTerm || roleFilter !== 'all'
                ? '검색 조건에 맞는 사용자가 없습니다'
                : '표시할 사용자가 없습니다'}
            </div>
          ) : (
            filteredUsers.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                isAdmin={isAdmin}
                isExpanded={expandedUserId === user.id}
                onToggleExpand={() =>
                  setExpandedUserId(expandedUserId === user.id ? null : user.id)
                }
                onChangeSystemRole={handleChangeSystemRole}
                onAssignPMClick={() => {
                  setSelectedUser(user);
                  setShowAssignPMDialog(true);
                }}
                onRevokePM={handleRevokePM}
                getSystemRoleBadge={getSystemRoleBadge}
              />
            ))
          )}
        </div>
      </div>

      {/* Role Statistics */}
      <RoleStatistics users={filteredUsers} isAdmin={isAdmin} />

      {/* Assign PM Dialog */}
      {showAssignPMDialog && selectedUser && (
        <AssignPMDialog
          user={selectedUser}
          projects={projects}
          existingProjectIds={(selectedUser.projectRoles || []).map((r) => r.projectId)}
          onClose={() => {
            setShowAssignPMDialog(false);
            setSelectedUser(null);
          }}
          onAssign={handleAssignPM}
        />
      )}
    </div>
  );
}

// ================ Sub-components ================

/** 역할에 따른 안내 메시지 */
function RoleNotice({ isAdmin, projectName }: { isAdmin: boolean; projectName?: string }) {
  if (isAdmin) {
    return (
      <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Shield className="text-red-600 mt-0.5" size={24} />
          <div>
            <h3 className="font-semibold text-gray-900">시스템 관리자 전용</h3>
            <p className="text-sm text-gray-700 mt-1">
              이 화면에서 사용자의 시스템 역할(Admin, PMO, 일반)을 변경하고, PM 역할을
              지정할 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <Users className="text-blue-600 mt-0.5" size={24} />
        <div>
          <h3 className="font-semibold text-gray-900">내 프로젝트 구성원 관리</h3>
          <p className="text-sm text-gray-700 mt-1">
            {projectName
              ? `"${projectName}" 프로젝트의 구성원만 표시됩니다. PM 역할 지정이 가능합니다.`
              : '현재 프로젝트의 구성원만 표시됩니다.'}
          </p>
        </div>
      </div>
    </div>
  );
}

interface SearchFilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  roleFilter: string;
  onRoleFilterChange: (value: string) => void;
}

function SearchFilter({
  searchTerm,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
}: SearchFilterProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder="이름, 이메일, 부서로 검색..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => onRoleFilterChange(e.target.value)}
          aria-label="역할 필터"
          className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">전체 역할</option>
          <option value="admin">시스템 관리자</option>
          <option value="pmo">PMO</option>
          <option value="user">일반 사용자</option>
        </select>
      </div>
    </div>
  );
}

interface UserRowProps {
  user: SystemUser;
  isAdmin: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onChangeSystemRole: (userId: string, role: SystemRole) => void;
  onAssignPMClick: () => void;
  onRevokePM: (userId: string, projectId: string) => void;
  getSystemRoleBadge: (role: SystemRole) => string;
}

function UserRow({
  user,
  isAdmin,
  isExpanded,
  onToggleExpand,
  onChangeSystemRole,
  onAssignPMClick,
  onRevokePM,
  getSystemRoleBadge,
}: UserRowProps) {
  return (
    <div className="hover:bg-gray-50">
      <div
        className="flex items-center gap-4 px-6 py-4 cursor-pointer"
        onClick={onToggleExpand}
      >
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
          {user.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{user.name}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${getSystemRoleBadge(user.systemRole)}`}
            >
              {SYSTEM_ROLE_LABELS[user.systemRole]}
            </span>
            {user.projectRoles && user.projectRoles.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                PM ({user.projectRoles.length})
              </span>
            )}
          </div>
          <div className="text-sm text-gray-500">
            {user.email} · {user.department}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* 시스템 역할 변경: admin만 가능 */}
          {isAdmin && (
            <select
              value={user.systemRole ?? 'user'}
              onChange={(e) => {
                e.stopPropagation();
                onChangeSystemRole(user.id, e.target.value as SystemRole);
              }}
              onClick={(e) => e.stopPropagation()}
              aria-label={`${user.name} 시스템 역할 변경`}
              className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="admin">시스템 관리자</option>
              <option value="pmo">PMO</option>
              <option value="user">일반 사용자</option>
            </select>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAssignPMClick();
            }}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
            title="PM 지정"
          >
            <Briefcase size={14} />
            PM 지정
          </button>
          {isExpanded ? (
            <ChevronDown size={20} className="text-gray-400" />
          ) : (
            <ChevronRight size={20} className="text-gray-400" />
          )}
        </div>
      </div>

      {/* Expanded Project Roles */}
      {isExpanded && (
        <ExpandedProjectRoles
          user={user}
          isAdmin={isAdmin}
          onRevokePM={onRevokePM}
        />
      )}
    </div>
  );
}

interface ExpandedProjectRolesProps {
  user: SystemUser;
  isAdmin: boolean;
  onRevokePM: (userId: string, projectId: string) => void;
}

function ExpandedProjectRoles({ user, isAdmin, onRevokePM }: ExpandedProjectRolesProps) {
  return (
    <div className="px-6 pb-4 bg-gray-50">
      <div className="ml-14 border-l-2 border-gray-200 pl-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">프로젝트별 역할</h4>
        {user.projectRoles && user.projectRoles.length > 0 ? (
          <div className="space-y-2">
            {user.projectRoles.map((pr) => (
              <div
                key={pr.projectId}
                className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-200"
              >
                <div className="flex items-center gap-2">
                  <FolderKanban size={14} className="text-gray-400" />
                  <span className="text-sm text-gray-900">{pr.projectName}</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                    {PROJECT_ROLE_LABELS[pr.role]}
                  </span>
                </div>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => onRevokePM(user.id, pr.projectId)}
                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                    title="PM 해제"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">할당된 프로젝트 역할이 없습니다</p>
        )}
      </div>
    </div>
  );
}

interface RoleStatisticsProps {
  users: SystemUser[];
  isAdmin: boolean;
}

function RoleStatistics({ users, isAdmin }: RoleStatisticsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
            <Shield className="text-red-600" size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {users.filter((u) => u.systemRole === 'admin').length}
            </div>
            <div className="text-sm text-gray-500">시스템 관리자</div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <Building2 className="text-purple-600" size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {users.filter((u) => u.systemRole === 'pmo').length}
            </div>
            <div className="text-sm text-gray-500">PMO</div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <Briefcase className="text-blue-600" size={20} />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {users.filter((u) => u.projectRoles && u.projectRoles.some((r) => r.role === 'pm')).length}
            </div>
            <div className="text-sm text-gray-500">
              {isAdmin ? 'PM (프로젝트 관리자)' : 'PM (현재 프로젝트)'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
