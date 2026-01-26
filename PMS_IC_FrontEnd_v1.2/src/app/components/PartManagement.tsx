import { useState } from 'react';
import { Plus, Search, Users, Edit2, Trash2, ChevronDown, ChevronUp, UserPlus, Crown, CheckCircle, Pause, AlertCircle, GraduationCap, ClipboardCheck, BarChart3, Settings, Shield } from 'lucide-react';
import { Part, PartMember, PartStatus, PART_STATUS_INFO, CreatePartDto } from '../../types/part';
import { useProject } from '../../contexts/ProjectContext';
import { useParts, usePartMembers, useCreatePart, useUpdatePart, useDeletePart, useAddPartMember, useRemovePartMember } from '../../hooks/api/useParts';
import { UserRole } from '../App';

// Part leader permission types
type PartLeaderPermission = 'common:view' | 'common:edit' | 'phase:view' | 'phase:edit' | 'kanban:view' | 'kanban:edit' | 'backlog:view' | 'backlog:edit';

const PART_LEADER_PERMISSIONS: { id: PartLeaderPermission; name: string; category: string }[] = [
  { id: 'common:view', name: '공통관리 조회', category: '공통관리' },
  { id: 'common:edit', name: '공통관리 편집', category: '공통관리' },
  { id: 'phase:view', name: '단계 조회', category: '단계관리' },
  { id: 'phase:edit', name: '단계 편집', category: '단계관리' },
  { id: 'kanban:view', name: '칸반보드 조회', category: '칸반보드' },
  { id: 'kanban:edit', name: '칸반보드 편집', category: '칸반보드' },
  { id: 'backlog:view', name: '백로그 조회', category: '백로그' },
  { id: 'backlog:edit', name: '백로그 편집', category: '백로그' },
];

const DEFAULT_PART_LEADER_PERMISSIONS: PartLeaderPermission[] = [
  'common:view', 'phase:view', 'kanban:view', 'kanban:edit', 'backlog:view', 'backlog:edit'
];

interface PartManagementProps {
  userRole: UserRole;
}

export default function PartManagement({ userRole }: PartManagementProps) {
  const { currentProject } = useProject();
  const { data: parts = [], isLoading } = useParts(currentProject?.id);
  const createPartMutation = useCreatePart();
  const updatePartMutation = useUpdatePart();
  const deletePartMutation = useDeletePart();
  const addMemberMutation = useAddPartMember();
  const removeMemberMutation = useRemovePartMember();

  const [expandedParts, setExpandedParts] = useState<Set<string>>(new Set());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [editingRoleType, setEditingRoleType] = useState<'educationManager' | 'qaLead' | 'ba' | null>(null);

  // Project roles state (would be fetched from API in production)
  const [projectRoles, setProjectRoles] = useState({
    educationManager: { id: 'user-006', name: '한미영' } as { id: string; name: string } | null,
    qaLead: { id: 'user-007', name: '오정환' } as { id: string; name: string } | null,
    ba: { id: 'user-008', name: '김현우' } as { id: string; name: string } | null,
  });

  // Permission checks
  const canManage = ['admin', 'pm', 'pmo_head'].includes(userRole);
  const canCreatePart = ['admin', 'pm'].includes(userRole);

  // No project selected
  if (!currentProject) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <AlertCircle className="mx-auto mb-4 text-gray-400" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">프로젝트를 선택해주세요</h3>
          <p className="text-gray-500">파트 관리를 위해서는 먼저 프로젝트를 선택해야 합니다.</p>
          <p className="text-gray-500 mt-1">프로젝트 관리 메뉴에서 작업할 프로젝트를 선택하세요.</p>
        </div>
      </div>
    );
  }

  // Toggle part expansion
  const togglePartExpand = (partId: string) => {
    const newExpanded = new Set(expandedParts);
    if (newExpanded.has(partId)) {
      newExpanded.delete(partId);
    } else {
      newExpanded.add(partId);
    }
    setExpandedParts(newExpanded);
  };

  // Create part
  const handleCreatePart = (data: CreatePartDto) => {
    createPartMutation.mutate(
      { projectId: currentProject.id, data },
      {
        onSuccess: () => setShowCreateDialog(false),
        onError: (error) => console.error('Failed to create part:', error),
      }
    );
  };

  // Edit part
  const handleEditPart = (data: Partial<Part>) => {
    if (!editingPart) return;
    updatePartMutation.mutate(
      { partId: editingPart.id, data },
      {
        onSuccess: () => {
          setShowEditDialog(false);
          setEditingPart(null);
        },
        onError: (error) => console.error('Failed to update part:', error),
      }
    );
  };

  // Delete part
  const handleDeletePart = (partId: string) => {
    if (!confirm('정말 이 파트를 삭제하시겠습니까? 파트 내 모든 구성원이 제거됩니다.')) return;
    deletePartMutation.mutate(partId, {
      onError: (error) => console.error('Failed to delete part:', error),
    });
  };

  // Add member
  const handleAddMember = (partId: string, userId: string, _userName: string) => {
    addMemberMutation.mutate(
      { partId, userId },
      {
        onSuccess: () => {
          setShowAddMemberDialog(false);
          setSelectedPartId(null);
        },
        onError: (error) => console.error('Failed to add member:', error),
      }
    );
  };

  // Remove member
  const handleRemoveMember = (partId: string, memberId: string) => {
    if (!confirm('정말 이 구성원을 파트에서 제거하시겠습니까?')) return;
    removeMemberMutation.mutate(
      { partId, memberId },
      {
        onError: (error) => console.error('Failed to remove member:', error),
      }
    );
  };

  // Handle project role change
  const handleEditRole = (roleType: 'educationManager' | 'qaLead' | 'ba') => {
    setEditingRoleType(roleType);
    setShowRoleDialog(true);
  };

  const handleRoleChange = (userId: string, userName: string) => {
    if (!editingRoleType) return;
    setProjectRoles((prev) => ({
      ...prev,
      [editingRoleType]: { id: userId, name: userName },
    }));
    setShowRoleDialog(false);
    setEditingRoleType(null);
  };

  const handleClearRole = () => {
    if (!editingRoleType) return;
    setProjectRoles((prev) => ({
      ...prev,
      [editingRoleType]: null,
    }));
    setShowRoleDialog(false);
    setEditingRoleType(null);
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">파트 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">파트 관리</h1>
          <p className="text-gray-600 mt-1">
            {currentProject.name} - 파트(서브 프로젝트) 및 구성원을 관리합니다
          </p>
        </div>
        {canCreatePart && (
          <button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            새 파트
          </button>
        )}
      </div>

      {/* 프로젝트 담당자 섹션 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">프로젝트 담당자</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-purple-200 flex items-center justify-center">
              <GraduationCap className="text-purple-600" size={20} />
            </div>
            <div>
              <div className="text-xs text-purple-600 font-medium">교육 담당자</div>
              <div className="text-sm text-gray-900">{projectRoles.educationManager?.name || '미지정'}</div>
            </div>
            {canManage && (
              <button
                onClick={() => handleEditRole('educationManager')}
                className="ml-auto p-1.5 text-purple-500 hover:bg-purple-100 rounded"
                title="교육 담당자 변경"
              >
                <Edit2 size={14} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center">
              <ClipboardCheck className="text-green-600" size={20} />
            </div>
            <div>
              <div className="text-xs text-green-600 font-medium">QA 담당</div>
              <div className="text-sm text-gray-900">{projectRoles.qaLead?.name || '미지정'}</div>
            </div>
            {canManage && (
              <button
                onClick={() => handleEditRole('qaLead')}
                className="ml-auto p-1.5 text-green-500 hover:bg-green-100 rounded"
                title="QA 담당 변경"
              >
                <Edit2 size={14} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-orange-200 flex items-center justify-center">
              <BarChart3 className="text-orange-600" size={20} />
            </div>
            <div>
              <div className="text-xs text-orange-600 font-medium">BA 담당</div>
              <div className="text-sm text-gray-900">{projectRoles.ba?.name || '미지정'}</div>
            </div>
            {canManage && (
              <button
                onClick={() => handleEditRole('ba')}
                className="ml-auto p-1.5 text-orange-500 hover:bg-orange-100 rounded"
                title="BA 담당 변경"
              >
                <Edit2 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 파트 목록 */}
      <div className="space-y-4">
        {parts.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Users className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">등록된 파트가 없습니다</h3>
            <p className="text-gray-500 mb-4">새 파트를 생성하여 팀을 구성하세요.</p>
            {canCreatePart && (
              <button
                onClick={() => setShowCreateDialog(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={20} />
                새 파트 만들기
              </button>
            )}
          </div>
        ) : (
          parts.map((part) => (
            <PartCard
              key={part.id}
              part={part}
              isExpanded={expandedParts.has(part.id)}
              canManage={canManage}
              userRole={userRole}
              onToggleExpand={() => togglePartExpand(part.id)}
              onEdit={() => {
                setEditingPart(part);
                setShowEditDialog(true);
              }}
              onDelete={() => handleDeletePart(part.id)}
              onRemoveMember={handleRemoveMember}
              onAddMember={() => {
                setSelectedPartId(part.id);
                setShowAddMemberDialog(true);
              }}
            />
          ))
        )}
      </div>

      {/* 파트 생성 다이얼로그 */}
      {showCreateDialog && (
        <PartDialog
          title="새 파트 생성"
          projectId={currentProject.id}
          onClose={() => setShowCreateDialog(false)}
          onSubmit={handleCreatePart}
        />
      )}

      {/* 파트 수정 다이얼로그 */}
      {showEditDialog && editingPart && (
        <PartDialog
          title="파트 수정"
          projectId={currentProject.id}
          part={editingPart}
          onClose={() => {
            setShowEditDialog(false);
            setEditingPart(null);
          }}
          onSubmit={handleEditPart}
        />
      )}

      {/* 구성원 추가 다이얼로그 */}
      {showAddMemberDialog && selectedPartId && (
        <AddMemberDialogWithQuery
          partId={selectedPartId}
          onClose={() => {
            setShowAddMemberDialog(false);
            setSelectedPartId(null);
          }}
          onAdd={handleAddMember}
        />
      )}

      {/* 프로젝트 담당자 변경 다이얼로그 */}
      {showRoleDialog && editingRoleType && (
        <ProjectRoleDialog
          roleType={editingRoleType}
          currentUser={projectRoles[editingRoleType]}
          onClose={() => {
            setShowRoleDialog(false);
            setEditingRoleType(null);
          }}
          onSelect={handleRoleChange}
          onClear={handleClearRole}
        />
      )}
    </div>
  );
}

// Part card component with members hook
interface PartCardProps {
  part: Part;
  isExpanded: boolean;
  canManage: boolean;
  userRole: UserRole;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRemoveMember: (partId: string, memberId: string) => void;
  onAddMember: () => void;
}

function PartCard({ part, isExpanded, canManage, userRole, onToggleExpand, onEdit, onDelete, onRemoveMember, onAddMember }: PartCardProps) {
  const { data: members = [] } = usePartMembers(part.id);
  const statusInfo = PART_STATUS_INFO[part.status];
  const leader = members.find((m) => m.role === 'leader');
  const regularMembers = members.filter((m) => m.role === 'member');

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Part header */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="text-blue-600" size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">{part.name}</h3>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
              </div>
              <div className="text-sm text-gray-500">
                파트장: {part.leaderName || '미지정'} | 구성원: {part.memberCount || members.length}명
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-gray-500">진행률</div>
              <div className="flex items-center gap-2">
                <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: `${part.progress}%` }} />
                </div>
                <span className="text-sm font-medium text-gray-900">{part.progress}%</span>
              </div>
            </div>
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              {canManage && (
                <>
                  <button onClick={onEdit} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded" title="편집">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={onDelete} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded" title="삭제">
                    <Trash2 size={16} />
                  </button>
                </>
              )}
              <button className="p-1.5 text-gray-500 hover:text-gray-700">
                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Part details (members list) */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="space-y-3">
            {leader && (
              <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="w-10 h-10 rounded-full bg-yellow-200 flex items-center justify-center">
                  <Crown className="text-yellow-600" size={18} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{leader.userName}</span>
                    <span className="text-xs px-2 py-0.5 bg-yellow-200 text-yellow-700 rounded-full">파트장</span>
                  </div>
                  <div className="text-sm text-gray-500">{leader.userEmail}</div>
                </div>
              </div>
            )}
            {regularMembers.map((member) => (
              <div key={member.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                  {member.userName[0]}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{member.userName}</div>
                  <div className="text-sm text-gray-500">{member.userEmail}</div>
                </div>
                {canManage && (
                  <button onClick={() => onRemoveMember(part.id, member.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="제거">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            {(canManage || userRole === 'developer') && (
              <button onClick={onAddMember} className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
                <UserPlus size={18} />
                구성원 추가
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Add member dialog wrapper with query
function AddMemberDialogWithQuery({ partId, onClose, onAdd }: { partId: string; onClose: () => void; onAdd: (partId: string, userId: string, userName: string) => void }) {
  const { data: existingMembers = [] } = usePartMembers(partId);
  return <AddMemberDialog partId={partId} existingMembers={existingMembers} onClose={onClose} onAdd={onAdd} />;
}

// 파트 생성/수정 다이얼로그
interface PartDialogProps {
  title: string;
  projectId: string;
  part?: Part;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

function PartDialog({ title, projectId, part, onClose, onSubmit }: PartDialogProps) {
  const [formData, setFormData] = useState({
    name: part?.name || '',
    description: part?.description || '',
    leaderId: part?.leaderId || '',
    status: part?.status || 'ACTIVE',
    startDate: part?.startDate || '',
    endDate: part?.endDate || '',
  });

  const [leaderPermissions, setLeaderPermissions] = useState<PartLeaderPermission[]>(
    (part as any)?.leaderPermissions || DEFAULT_PART_LEADER_PERMISSIONS
  );
  const [showPermissions, setShowPermissions] = useState(false);

  // Mock 사용자 목록 (실제로는 API 호출)
  const availableUsers = [
    { id: 'user-003', name: '박민수' },
    { id: 'user-004', name: '최영수' },
    { id: 'user-005', name: '정수진' },
    { id: 'user-009', name: '김태희' },
    { id: 'user-010', name: '이상현' },
  ];

  const handlePermissionToggle = (permId: PartLeaderPermission) => {
    setLeaderPermissions(prev =>
      prev.includes(permId)
        ? prev.filter(p => p !== permId)
        : [...prev, permId]
    );
  };

  // Group permissions by category
  const groupedPermissions = PART_LEADER_PERMISSIONS.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, typeof PART_LEADER_PERMISSIONS>);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      projectId,
      ...formData,
      leaderPermissions,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 my-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              파트명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="예: UI/UX 파트, 백엔드 파트"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              설명
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="파트 설명을 입력하세요"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              파트장 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.leaderId}
              onChange={(e) => setFormData({ ...formData, leaderId: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">파트장 선택...</option>
              {availableUsers.map((user) => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </div>

          {/* Part Leader Permissions Section */}
          <div className="border border-purple-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowPermissions(!showPermissions)}
              className="w-full px-4 py-3 bg-purple-50 flex items-center justify-between hover:bg-purple-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Shield className="text-purple-600" size={18} />
                <span className="font-medium text-purple-900">파트장 권한 설정</span>
                <span className="text-xs text-purple-600 bg-purple-200 px-2 py-0.5 rounded-full">
                  {leaderPermissions.length}개 선택
                </span>
              </div>
              {showPermissions ? (
                <ChevronUp className="text-purple-600" size={18} />
              ) : (
                <ChevronDown className="text-purple-600" size={18} />
              )}
            </button>

            {showPermissions && (
              <div className="p-4 bg-white border-t border-purple-200">
                <p className="text-xs text-gray-500 mb-3">
                  파트장에게 부여할 권한을 선택하세요. 선택하지 않은 권한은 파트장이 접근할 수 없습니다.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(groupedPermissions).map(([category, perms]) => (
                    <div key={category} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="text-xs font-semibold text-gray-700 mb-2">{category}</div>
                      <div className="space-y-1.5">
                        {perms.map(perm => (
                          <label key={perm.id} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={leaderPermissions.includes(perm.id)}
                              onChange={() => handlePermissionToggle(perm.id)}
                              className="w-3.5 h-3.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            />
                            <span className="text-xs text-gray-700">{perm.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                시작일
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                종료일
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {part && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                상태
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as PartStatus })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(PART_STATUS_INFO).map(([status, info]) => (
                  <option key={status} value={status}>{info.label}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {part ? '수정' : '생성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 구성원 추가 다이얼로그
interface AddMemberDialogProps {
  partId: string;
  existingMembers: PartMember[];
  onClose: () => void;
  onAdd: (partId: string, userId: string, userName: string) => void;
}

function AddMemberDialog({ partId, existingMembers, onClose, onAdd }: AddMemberDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Mock 사용자 목록 (이미 구성원인 사람 제외)
  const existingUserIds = new Set(existingMembers.map((m) => m.userId));
  const availableUsers = [
    { id: 'user-011', name: '김지은', email: 'jieun@example.com' },
    { id: 'user-012', name: '이준호', email: 'junho@example.com' },
    { id: 'user-013', name: '한상철', email: 'sangchul@example.com' },
    { id: 'user-014', name: '박서연', email: 'seoyeon@example.com' },
    { id: 'user-015', name: '최민준', email: 'minjun@example.com' },
  ].filter((u) => !existingUserIds.has(u.id));

  const filteredUsers = availableUsers.filter(
    (u) => u.name.includes(searchTerm) || u.email.includes(searchTerm)
  );

  const handleAdd = () => {
    const user = availableUsers.find((u) => u.id === selectedUserId);
    if (user) {
      onAdd(partId, user.id, user.name);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">구성원 추가</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="이름 또는 이메일로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="max-h-60 overflow-y-auto space-y-2">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                추가 가능한 사용자가 없습니다
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedUserId === user.id
                      ? 'bg-blue-50 border border-blue-200'
                      : 'bg-gray-50 border border-transparent hover:bg-gray-100'
                  }`}
                  onClick={() => setSelectedUserId(user.id)}
                >
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                    {user.name[0]}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                  {selectedUserId === user.id && (
                    <CheckCircle className="text-blue-600" size={20} />
                  )}
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!selectedUserId}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              추가
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Project role dialog component
const ROLE_TYPE_INFO = {
  educationManager: {
    label: '교육 담당자',
    description: '프로젝트 내 교육 및 역량 개발을 담당합니다.',
    color: 'purple',
  },
  qaLead: {
    label: 'QA 담당',
    description: '품질 관리 및 테스트 전략을 담당합니다.',
    color: 'green',
  },
  ba: {
    label: 'BA 담당',
    description: '비즈니스 분석 및 요구사항 정의를 담당합니다.',
    color: 'orange',
  },
};

interface ProjectRoleDialogProps {
  roleType: 'educationManager' | 'qaLead' | 'ba';
  currentUser: { id: string; name: string } | null;
  onClose: () => void;
  onSelect: (userId: string, userName: string) => void;
  onClear: () => void;
}

function ProjectRoleDialog({ roleType, currentUser, onClose, onSelect, onClear }: ProjectRoleDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState(currentUser?.id || '');
  const [searchTerm, setSearchTerm] = useState('');
  const roleInfo = ROLE_TYPE_INFO[roleType];

  // Mock available users for project roles
  const availableUsers = [
    { id: 'user-001', name: '김철수', email: 'chulsu@insure.com', department: 'PMO' },
    { id: 'user-002', name: '이영희', email: 'younghee@insure.com', department: '개발팀' },
    { id: 'user-003', name: '박민수', email: 'minsu@insure.com', department: '개발팀' },
    { id: 'user-004', name: '최영수', email: 'youngsu@insure.com', department: 'QA팀' },
    { id: 'user-005', name: '정수진', email: 'sujin@insure.com', department: '기획팀' },
    { id: 'user-006', name: '한미영', email: 'miyoung@insure.com', department: '교육팀' },
    { id: 'user-007', name: '오정환', email: 'junghwan@insure.com', department: 'QA팀' },
    { id: 'user-008', name: '김현우', email: 'hyunwoo@insure.com', department: '기획팀' },
    { id: 'user-009', name: '김태희', email: 'taehee@insure.com', department: '개발팀' },
    { id: 'user-010', name: '이상현', email: 'sanghyun@insure.com', department: '운영팀' },
  ];

  const filteredUsers = availableUsers.filter(
    (u) =>
      u.name.includes(searchTerm) ||
      u.email.includes(searchTerm) ||
      u.department.includes(searchTerm)
  );

  const handleConfirm = () => {
    const user = availableUsers.find((u) => u.id === selectedUserId);
    if (user) {
      onSelect(user.id, user.name);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className={`px-6 py-4 border-b border-gray-200 bg-${roleInfo.color}-50`}>
          <h2 className="text-lg font-semibold text-gray-900">{roleInfo.label} 변경</h2>
          <p className="text-sm text-gray-500 mt-1">{roleInfo.description}</p>
        </div>
        <div className="p-6 space-y-4">
          {/* Current assignment */}
          {currentUser && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <div className="text-xs text-gray-500">현재 담당자</div>
                <div className="font-medium text-gray-900">{currentUser.name}</div>
              </div>
              <button
                type="button"
                onClick={onClear}
                className="text-sm text-red-600 hover:text-red-700 hover:underline"
              >
                담당 해제
              </button>
            </div>
          )}

          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="이름, 이메일 또는 부서로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* User list */}
          <div className="max-h-60 overflow-y-auto space-y-2">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">검색 결과가 없습니다</div>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedUserId === user.id
                      ? 'bg-blue-50 border border-blue-200'
                      : 'bg-gray-50 border border-transparent hover:bg-gray-100'
                  }`}
                  onClick={() => setSelectedUserId(user.id)}
                >
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                    {user.name[0]}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{user.name}</div>
                    <div className="text-xs text-gray-500">
                      {user.email} · {user.department}
                    </div>
                  </div>
                  {selectedUserId === user.id && <CheckCircle className="text-blue-600" size={20} />}
                </div>
              ))
            )}
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedUserId}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              변경
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
