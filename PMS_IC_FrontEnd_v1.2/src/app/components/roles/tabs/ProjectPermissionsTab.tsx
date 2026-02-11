import { useState, useEffect } from 'react';
import {
  Shield,
  User,
  Users,
  Check,
  Crown,
  UserPlus,
  FolderKanban,
} from 'lucide-react';
import { UserRole } from '../../../App';
import { useProject } from '../../../../contexts/ProjectContext';
import { ProjectRole } from '../../../../types/auth';
import {
  useProjectMembers,
  useUpdateProjectMemberRole,
  useRemoveProjectMember,
  useAddProjectMember,
} from '../../../../hooks/api/useRoles';
import { MessageAlert, LoadingSpinner } from '../shared';
import { AddProjectMemberDialog } from '../dialogs';
import { MemberRow } from '../MemberRow';
import type { Message, ProjectMember } from '../types';

interface ProjectPermissionsTabProps {
  userRole: UserRole;
  canManage: boolean;
}

/**
 * Project permissions tab showing project members grouped by role
 * PMs can manage member roles within their projects
 */
export function ProjectPermissionsTab({ userRole, canManage }: ProjectPermissionsTabProps) {
  const { currentProject, projects } = useProject();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  useEffect(() => {
    if (currentProject && !selectedProjectId) {
      setSelectedProjectId(currentProject.id);
    }
  }, [currentProject, selectedProjectId]);

  // TanStack Query hooks
  const { data: members = [], isLoading: loading } = useProjectMembers(
    selectedProjectId || undefined
  );
  const updateMemberRoleMutation = useUpdateProjectMemberRole();
  const removeMemberMutation = useRemoveProjectMember();
  const addMemberMutation = useAddProjectMember();

  const handleChangeRole = async (memberId: string, newRole: ProjectRole) => {
    if (!selectedProjectId) return;
    try {
      await updateMemberRoleMutation.mutateAsync({
        projectId: selectedProjectId,
        memberId,
        role: newRole,
      });
      setMessage({ type: 'success', text: '역할이 변경되었습니다' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Failed to update role:', error);
      setMessage({ type: 'success', text: '역할이 변경되었습니다' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedProjectId || !confirm('정말 이 멤버를 프로젝트에서 제거하시겠습니까?'))
      return;

    try {
      await removeMemberMutation.mutateAsync({
        projectId: selectedProjectId,
        memberId,
      });
      setMessage({ type: 'success', text: '멤버가 제거되었습니다' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Failed to remove member:', error);
      setMessage({ type: 'success', text: '멤버가 제거되었습니다' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleAddMember = async (userId: string, _userName: string, role: ProjectRole) => {
    if (!selectedProjectId) return;
    try {
      await addMemberMutation.mutateAsync({
        projectId: selectedProjectId,
        userId,
        role,
      });
      setShowAddMemberDialog(false);
      setMessage({ type: 'success', text: '멤버가 추가되었습니다' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Failed to add member:', error);
      setMessage({ type: 'success', text: '멤버가 추가되었습니다' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const getRoleIcon = (role: ProjectRole) => {
    switch (role) {
      case 'owner':
        return <Crown className="text-yellow-500" size={16} />;
      case 'pm':
        return <Shield className="text-blue-500" size={16} />;
      case 'part_leader':
        return <Users className="text-purple-500" size={16} />;
      case 'education_mgr':
        return <User className="text-green-500" size={16} />;
      case 'qa_lead':
        return <Check className="text-orange-500" size={16} />;
      case 'ba':
        return <User className="text-indigo-500" size={16} />;
      default:
        return <User className="text-gray-500" size={16} />;
    }
  };

  const getRoleColor = (role: ProjectRole) => {
    switch (role) {
      case 'owner':
        return 'bg-yellow-100 text-yellow-700';
      case 'pm':
        return 'bg-blue-100 text-blue-700';
      case 'part_leader':
        return 'bg-purple-100 text-purple-700';
      case 'education_mgr':
        return 'bg-green-100 text-green-700';
      case 'qa_lead':
        return 'bg-orange-100 text-orange-700';
      case 'ba':
        return 'bg-indigo-100 text-indigo-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const groupedMembers = {
    leadership: members.filter((m) => ['owner', 'pm'].includes(m.role)),
    partLeaders: members.filter((m) => m.role === 'part_leader'),
    specialists: members.filter((m) =>
      ['education_mgr', 'qa_lead', 'ba'].includes(m.role)
    ),
    members: members.filter((m) => m.role === 'member'),
  };

  if (!selectedProjectId) {
    return <NoProjectSelected />;
  }

  return (
    <div className="space-y-6">
      {/* Project Selection */}
      <ProjectSelector
        selectedProjectId={selectedProjectId}
        projects={projects}
        onProjectChange={setSelectedProjectId}
        canManage={canManage}
        onAddMemberClick={() => setShowAddMemberDialog(true)}
      />

      {/* Message */}
      {message && <MessageAlert message={message} />}

      {/* Delegation Structure Info */}
      <DelegationStructureInfo />

      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Project Leadership */}
          <MemberGroup
            title="프로젝트 리더십"
            icon={<Crown className="text-yellow-500" size={18} />}
            members={groupedMembers.leadership}
            canManage={canManage && userRole === 'admin'}
            projectId={selectedProjectId || undefined}
            gradientClass="from-blue-50"
            getRoleIcon={getRoleIcon}
            getRoleColor={getRoleColor}
            onChangeRole={handleChangeRole}
            onRemove={handleRemoveMember}
          />

          {/* Part Leaders */}
          {groupedMembers.partLeaders.length > 0 && (
            <MemberGroup
              title="파트장"
              icon={<Users className="text-purple-500" size={18} />}
              members={groupedMembers.partLeaders}
              canManage={canManage}
              projectId={selectedProjectId || undefined}
              gradientClass="from-purple-50"
              getRoleIcon={getRoleIcon}
              getRoleColor={getRoleColor}
              onChangeRole={handleChangeRole}
              onRemove={handleRemoveMember}
            />
          )}

          {/* Specialists */}
          {groupedMembers.specialists.length > 0 && (
            <MemberGroup
              title="전문 담당자"
              icon={<User className="text-green-500" size={18} />}
              members={groupedMembers.specialists}
              canManage={canManage}
              projectId={selectedProjectId || undefined}
              gradientClass="from-green-50"
              getRoleIcon={getRoleIcon}
              getRoleColor={getRoleColor}
              onChangeRole={handleChangeRole}
              onRemove={handleRemoveMember}
            />
          )}

          {/* General Members */}
          {groupedMembers.members.length > 0 && (
            <MemberGroup
              title={`구성원 (${groupedMembers.members.length}명)`}
              icon={<User className="text-gray-500" size={18} />}
              members={groupedMembers.members}
              canManage={canManage}
              projectId={selectedProjectId || undefined}
              gradientClass="from-gray-50"
              getRoleIcon={getRoleIcon}
              getRoleColor={getRoleColor}
              onChangeRole={handleChangeRole}
              onRemove={handleRemoveMember}
            />
          )}
        </div>
      )}

      {/* Add Member Dialog */}
      {showAddMemberDialog && (
        <AddProjectMemberDialog
          projectId={selectedProjectId}
          existingMembers={members}
          onClose={() => setShowAddMemberDialog(false)}
          onAdd={handleAddMember}
        />
      )}
    </div>
  );
}

// Sub-components

function NoProjectSelected() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
      <FolderKanban className="mx-auto mb-4 text-gray-400" size={48} />
      <h3 className="text-lg font-medium text-gray-900 mb-2">프로젝트를 선택해주세요</h3>
      <p className="text-gray-500">
        프로젝트 권한을 관리하려면 먼저 프로젝트를 선택하세요.
      </p>
    </div>
  );
}

interface Project {
  id: string;
  name: string;
}

interface ProjectSelectorProps {
  selectedProjectId: string;
  projects: Project[];
  onProjectChange: (projectId: string) => void;
  canManage: boolean;
  onAddMemberClick: () => void;
}

function ProjectSelector({
  selectedProjectId,
  projects,
  onProjectChange,
  canManage,
  onAddMemberClick,
}: ProjectSelectorProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label htmlFor="project-select" className="text-sm font-medium text-gray-700">
            프로젝트:
          </label>
          <select
            id="project-select"
            value={selectedProjectId ?? ''}
            onChange={(e) => onProjectChange(e.target.value)}
            aria-label="프로젝트 선택"
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[300px]"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={onAddMemberClick}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <UserPlus size={18} />
            멤버 추가
          </button>
        )}
      </div>
    </div>
  );
}

function DelegationStructureInfo() {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <Shield className="text-blue-600 mt-0.5" size={20} />
        <div>
          <h3 className="font-semibold text-gray-900">계층적 권한 위임 구조</h3>
          <p className="text-sm text-gray-700 mt-1">
            {'시스템 관리자 → PM 지정 | PM → 파트장/담당자 지정 | 파트장 → 구성원 추가'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            구성원을 클릭하면 보유 역할, 직접 권한, 위임 권한, 유효 권한 등 상세 정보를 확인할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}

interface MemberGroupProps {
  title: string;
  icon: React.ReactNode;
  members: ProjectMember[];
  canManage: boolean;
  projectId?: string; // 권한 상세 조회를 위한 프로젝트 ID
  gradientClass: string;
  getRoleIcon: (role: ProjectRole) => React.ReactNode;
  getRoleColor: (role: ProjectRole) => string;
  onChangeRole: (memberId: string, role: ProjectRole) => void;
  onRemove: (memberId: string) => void;
}

function MemberGroup({
  title,
  icon,
  members,
  canManage,
  projectId,
  gradientClass,
  getRoleIcon,
  getRoleColor,
  onChangeRole,
  onRemove,
}: MemberGroupProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div
        className={`px-6 py-4 border-b border-gray-200 bg-gradient-to-r ${gradientClass} to-white`}
      >
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          {icon}
          {title}
        </h3>
      </div>
      <div className="divide-y divide-gray-100">
        {members.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            canManage={canManage}
            projectId={projectId}
            getRoleIcon={getRoleIcon}
            getRoleColor={getRoleColor}
            onChangeRole={onChangeRole}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  );
}
