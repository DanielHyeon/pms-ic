import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Users,
  Crown,
  Edit2,
  Trash2,
  UserPlus,
  ArrowLeftRight,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Lock,
  Unlock,
  ExternalLink,
} from 'lucide-react';
import { useProject } from '../../contexts/ProjectContext';
import { useCapabilities } from '../../hooks/useCapabilities';
import {
  useOrgParts,
  useOrgPartDetail,
  useLeaderWarning,
  useCreateOrgPart,
  useUpdateOrgPart,
  useCloseOrgPart,
  useReopenOrgPart,
  useChangeOrgPartLeader,
  useAddOrgPartMember,
  useRemoveOrgPartMember,
  useSwitchOrgMemberType,
} from '../../hooks/api/useOrgParts';
import type {
  OrgPartDto,
  OrgPartDetailDto,
  OrgPartMember,
  LeaderWarningDto,
  CreateOrgPartRequest,
} from '../../hooks/api/useOrgParts';
import { useUsers } from '../../hooks/api/useRoles';

// Shadcn UI
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from './ui/dialog';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Separator } from './ui/separator';
import { Skeleton } from './ui/skeleton';
import { ScrollArea } from './ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

// ==================== Constants ====================

const PART_TYPES = [
  { value: 'DEVELOPMENT', label: '개발', color: 'bg-blue-100 text-blue-700' },
  { value: 'QA', label: 'QA', color: 'bg-green-100 text-green-700' },
  { value: 'BUSINESS_ANALYSIS', label: '비즈니스 분석', color: 'bg-amber-100 text-amber-700' },
  { value: 'PMO', label: 'PMO', color: 'bg-purple-100 text-purple-700' },
  { value: 'CUSTOM', label: '사용자 정의', color: 'bg-gray-100 text-gray-700' },
] as const;

function getPartTypeInfo(partType: string) {
  return PART_TYPES.find((t) => t.value === partType) || PART_TYPES[4];
}

function getStatusInfo(status: string) {
  if (status === 'ACTIVE') {
    return { label: '활성', className: 'bg-emerald-100 text-emerald-700' };
  }
  return { label: '종료', className: 'bg-gray-100 text-gray-500' };
}

// ==================== Main Component ====================

interface PartManagementV2Props {
  userRole: string;
}

export default function PartManagementV2({ userRole }: PartManagementV2Props) {
  const navigate = useNavigate();
  const { currentProject } = useProject();
  const { hasCapability } = useCapabilities(userRole.toUpperCase());

  const canManagePart = hasCapability('manage_parts');
  const canManageMembers = hasCapability('manage_part_members') || hasCapability('manage_parts');

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'CLOSED'>('ALL');
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showChangeLeaderDialog, setShowChangeLeaderDialog] = useState(false);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showRemoveMemberConfirm, setShowRemoveMemberConfirm] = useState<{ userId: string; userName: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Queries
  const { data: parts = [], isLoading: partsLoading } = useOrgParts(
    currentProject?.id,
    statusFilter === 'ACTIVE'
  );
  const { data: partDetail, isLoading: detailLoading } = useOrgPartDetail(selectedPartId || undefined);
  const { data: leaderWarning } = useLeaderWarning(selectedPartId || undefined);

  // Mutations
  const createMutation = useCreateOrgPart();
  const updateMutation = useUpdateOrgPart();
  const closeMutation = useCloseOrgPart();
  const reopenMutation = useReopenOrgPart();
  const changeLeaderMutation = useChangeOrgPartLeader();
  const addMemberMutation = useAddOrgPartMember();
  const removeMemberMutation = useRemoveOrgPartMember();
  const switchTypeMutation = useSwitchOrgMemberType();

  // Filtered parts
  const filteredParts = useMemo(() => {
    let result = parts;
    if (statusFilter === 'CLOSED') {
      result = result.filter((p: OrgPartDto) => p.status === 'CLOSED');
    } else if (statusFilter === 'ALL') {
      // No filter - show all
    }
    // statusFilter === 'ACTIVE' is handled by query param
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(
        (p: OrgPartDto) =>
          p.name.toLowerCase().includes(lower) ||
          p.leaderName.toLowerCase().includes(lower)
      );
    }
    return result;
  }, [parts, statusFilter, searchTerm]);

  // Selected part from list
  const selectedPart = useMemo(
    () => parts.find((p: OrgPartDto) => p.id === selectedPartId) || null,
    [parts, selectedPartId]
  );

  // Handlers
  const handleCreatePart = useCallback(
    (data: CreateOrgPartRequest) => {
      if (!currentProject) return;
      createMutation.mutate(
        { projectId: currentProject.id, data },
        {
          onSuccess: () => setShowCreateDialog(false),
          onError: (error: any) => {
            setErrorMessage(error?.message || '파트 생성에 실패했습니다.');
          },
        }
      );
    },
    [currentProject, createMutation]
  );

  const handleUpdatePart = useCallback(
    (data: { name?: string; partType?: string; customTypeName?: string }) => {
      if (!selectedPartId) return;
      updateMutation.mutate(
        { partId: selectedPartId, data },
        {
          onSuccess: () => setShowEditDialog(false),
          onError: (error: any) => {
            setErrorMessage(error?.message || '파트 수정에 실패했습니다.');
          },
        }
      );
    },
    [selectedPartId, updateMutation]
  );

  const handleClosePart = useCallback(() => {
    if (!selectedPartId) return;
    closeMutation.mutate(selectedPartId, {
      onSuccess: () => setShowCloseConfirm(false),
      onError: (error: any) => {
        setShowCloseConfirm(false);
        setErrorMessage(error?.message || '파트 종료에 실패했습니다.');
      },
    });
  }, [selectedPartId, closeMutation]);

  const handleReopenPart = useCallback(() => {
    if (!selectedPartId) return;
    reopenMutation.mutate(selectedPartId, {
      onError: (error: any) => {
        setErrorMessage(error?.message || '파트 재개에 실패했습니다.');
      },
    });
  }, [selectedPartId, reopenMutation]);

  const handleChangeLeader = useCallback(
    (newLeaderUserId: string, reason: string) => {
      if (!selectedPartId) return;
      changeLeaderMutation.mutate(
        { partId: selectedPartId, data: { newLeaderUserId, reason } },
        {
          onSuccess: () => setShowChangeLeaderDialog(false),
          onError: (error: any) => {
            setErrorMessage(error?.message || '파트장 변경에 실패했습니다.');
          },
        }
      );
    },
    [selectedPartId, changeLeaderMutation]
  );

  const handleAddMember = useCallback(
    (userId: string, membershipType: 'PRIMARY' | 'SECONDARY') => {
      if (!selectedPartId) return;
      addMemberMutation.mutate(
        { partId: selectedPartId, data: { userId, membershipType } },
        {
          onSuccess: () => setShowAddMemberDialog(false),
          onError: (error: any) => {
            const msg = error?.message || '';
            // Handle 409 Conflict for PRIMARY membership conflicts
            if (msg.includes('409') || msg.includes('conflict') || msg.includes('PRIMARY')) {
              setErrorMessage(
                '해당 사용자는 이미 다른 파트에 주(PRIMARY) 소속입니다. 부(SECONDARY) 소속으로 추가하거나, 기존 파트에서 소속을 변경한 후 다시 시도하세요.'
              );
            } else {
              setErrorMessage(msg || '구성원 추가에 실패했습니다.');
            }
          },
        }
      );
    },
    [selectedPartId, addMemberMutation]
  );

  const handleRemoveMember = useCallback(
    (userId: string) => {
      if (!selectedPartId) return;
      removeMemberMutation.mutate(
        { partId: selectedPartId, userId },
        {
          onSuccess: () => setShowRemoveMemberConfirm(null),
          onError: (error: any) => {
            setShowRemoveMemberConfirm(null);
            const msg = error?.message || '';
            if (msg.includes('400') || msg.includes('last')) {
              setErrorMessage('마지막 소속은 삭제할 수 없습니다. 최소 한 개의 파트 소속이 필요합니다.');
            } else {
              setErrorMessage(msg || '구성원 제거에 실패했습니다.');
            }
          },
        }
      );
    },
    [selectedPartId, removeMemberMutation]
  );

  const handleSwitchMemberType = useCallback(
    (userId: string) => {
      if (!selectedPartId) return;
      switchTypeMutation.mutate(
        { partId: selectedPartId, userId },
        {
          onError: (error: any) => {
            const msg = error?.message || '';
            if (msg.includes('409') || msg.includes('conflict') || msg.includes('PRIMARY')) {
              setErrorMessage(
                '소속 유형 전환에 실패했습니다. 해당 사용자가 이미 다른 파트에 주(PRIMARY) 소속이 있을 수 있습니다.'
              );
            } else {
              setErrorMessage(msg || '소속 유형 전환에 실패했습니다.');
            }
          },
        }
      );
    },
    [selectedPartId, switchTypeMutation]
  );

  // No project selected
  if (!currentProject) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">프로젝트를 선택해주세요</h3>
            <p className="text-gray-500">파트 관리를 위해서는 먼저 프로젝트를 선택해야 합니다.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 h-full">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">조직 파트 관리</h1>
          <p className="text-gray-600 mt-1">
            {currentProject.name} - 파트(조직 단위) 및 구성원을 관리합니다
          </p>
        </div>
        {canManagePart && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus size={16} />
            새 파트
          </Button>
        )}
      </div>

      {/* Main layout: Left list + Right detail */}
      <div className="flex gap-6 h-[calc(100vh-220px)]">
        {/* Left panel - Part list */}
        <div className="w-[400px] flex-shrink-0 flex flex-col gap-4">
          {/* Search and filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <Input
                placeholder="파트명 또는 파트장 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">전체</SelectItem>
                <SelectItem value="ACTIVE">활성</SelectItem>
                <SelectItem value="CLOSED">종료</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Part list */}
          <ScrollArea className="flex-1">
            {partsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
            ) : filteredParts.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="mx-auto mb-3 text-gray-400" size={40} />
                  <p className="text-gray-500 text-sm">
                    {searchTerm ? '검색 결과가 없습니다' : '등록된 파트가 없습니다'}
                  </p>
                  {!searchTerm && canManagePart && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => setShowCreateDialog(true)}
                    >
                      <Plus size={14} />
                      새 파트 만들기
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredParts.map((part: OrgPartDto) => (
                  <PartListCard
                    key={part.id}
                    part={part}
                    isSelected={selectedPartId === part.id}
                    onSelect={() => setSelectedPartId(part.id)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right panel - Part detail */}
        <div className="flex-1 min-w-0">
          {!selectedPartId ? (
            <Card className="h-full">
              <CardContent className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Users className="mx-auto mb-3 text-gray-300" size={56} />
                  <p className="text-gray-400 text-sm">왼쪽에서 파트를 선택하면 상세 정보가 표시됩니다</p>
                </div>
              </CardContent>
            </Card>
          ) : detailLoading ? (
            <Card className="h-full">
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ) : partDetail ? (
            <PartDetailPanel
              part={partDetail}
              partSummary={selectedPart}
              leaderWarning={leaderWarning || null}
              canManagePart={canManagePart}
              canManageMembers={canManageMembers}
              onEdit={() => setShowEditDialog(true)}
              onClose={() => setShowCloseConfirm(true)}
              onReopen={handleReopenPart}
              onChangeLeader={() => setShowChangeLeaderDialog(true)}
              onAddMember={() => setShowAddMemberDialog(true)}
              onRemoveMember={(userId, userName) => setShowRemoveMemberConfirm({ userId, userName })}
              onSwitchMemberType={handleSwitchMemberType}
              onNavigateToRoles={() => navigate('/roles')}
            />
          ) : (
            <Card className="h-full">
              <CardContent className="flex items-center justify-center h-full">
                <p className="text-gray-400">파트 정보를 불러올 수 없습니다</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ==================== Dialogs ==================== */}

      {/* Create Part Dialog */}
      {showCreateDialog && (
        <CreatePartDialog
          onClose={() => setShowCreateDialog(false)}
          onSubmit={handleCreatePart}
          isPending={createMutation.isPending}
        />
      )}

      {/* Edit Part Dialog */}
      {showEditDialog && selectedPart && (
        <EditPartDialog
          part={selectedPart}
          onClose={() => setShowEditDialog(false)}
          onSubmit={handleUpdatePart}
          isPending={updateMutation.isPending}
        />
      )}

      {/* Change Leader Dialog */}
      {showChangeLeaderDialog && partDetail && (
        <ChangeLeaderDialog
          currentLeaderName={partDetail.leaderName}
          partId={partDetail.id}
          onClose={() => setShowChangeLeaderDialog(false)}
          onSubmit={handleChangeLeader}
          isPending={changeLeaderMutation.isPending}
        />
      )}

      {/* Add Member Dialog */}
      {showAddMemberDialog && partDetail && (
        <AddMemberDialog
          existingMembers={partDetail.members}
          onClose={() => setShowAddMemberDialog(false)}
          onSubmit={handleAddMember}
          isPending={addMemberMutation.isPending}
        />
      )}

      {/* Close Part Confirm */}
      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>파트 종료</AlertDialogTitle>
            <AlertDialogDescription>
              이 파트를 종료하시겠습니까? 종료된 파트는 나중에 다시 활성화할 수 있습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleClosePart}>종료</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Member Confirm */}
      <AlertDialog
        open={!!showRemoveMemberConfirm}
        onOpenChange={(open) => !open && setShowRemoveMemberConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>구성원 제거</AlertDialogTitle>
            <AlertDialogDescription>
              {showRemoveMemberConfirm?.userName}님을 이 파트에서 제거하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => showRemoveMemberConfirm && handleRemoveMember(showRemoveMemberConfirm.userId)}
            >
              제거
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Error Message Dialog */}
      <AlertDialog open={!!errorMessage} onOpenChange={(open) => !open && setErrorMessage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>오류</AlertDialogTitle>
            <AlertDialogDescription>{errorMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setErrorMessage(null)}>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ==================== Part List Card ====================

interface PartListCardProps {
  part: OrgPartDto;
  isSelected: boolean;
  onSelect: () => void;
}

function PartListCard({ part, isSelected, onSelect }: PartListCardProps) {
  const typeInfo = getPartTypeInfo(part.partType);
  const statusInfo = getStatusInfo(part.status);

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-blue-500 shadow-md' : ''
      } ${part.status === 'CLOSED' ? 'opacity-60' : ''}`}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Users className="text-blue-600" size={16} />
            </div>
            <h3 className="font-semibold text-gray-900 truncate">{part.name}</h3>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Badge variant="outline" className={typeInfo.color}>
              {typeInfo.label}
            </Badge>
            <Badge variant="outline" className={statusInfo.className}>
              {statusInfo.label}
            </Badge>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Crown size={14} className="text-yellow-500" />
            <span>{part.leaderName}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users size={14} />
            <span>{part.memberCount}명</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== Part Detail Panel ====================

interface PartDetailPanelProps {
  part: OrgPartDetailDto;
  partSummary: OrgPartDto | null;
  leaderWarning: LeaderWarningDto | null;
  canManagePart: boolean;
  canManageMembers: boolean;
  onEdit: () => void;
  onClose: () => void;
  onReopen: () => void;
  onChangeLeader: () => void;
  onAddMember: () => void;
  onRemoveMember: (userId: string, userName: string) => void;
  onSwitchMemberType: (userId: string) => void;
  onNavigateToRoles: () => void;
}

function PartDetailPanel({
  part,
  partSummary,
  leaderWarning,
  canManagePart,
  canManageMembers,
  onEdit,
  onClose,
  onReopen,
  onChangeLeader,
  onAddMember,
  onRemoveMember,
  onSwitchMemberType,
  onNavigateToRoles,
}: PartDetailPanelProps) {
  const typeInfo = getPartTypeInfo(part.partType);
  const statusInfo = getStatusInfo(part.status);
  const isActive = part.status === 'ACTIVE';

  const leader = part.members.find((m) => m.userId === part.leaderUserId);
  const otherMembers = part.members.filter((m) => m.userId !== part.leaderUserId);

  return (
    <Card className="h-full flex flex-col">
      {/* Header */}
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl">{part.name}</CardTitle>
              <Badge variant="outline" className={typeInfo.color}>
                {part.partType === 'CUSTOM' && part.customTypeName
                  ? part.customTypeName
                  : typeInfo.label}
              </Badge>
              <Badge variant="outline" className={statusInfo.className}>
                {isActive ? (
                  <><CheckCircle size={12} className="mr-1" />{statusInfo.label}</>
                ) : (
                  <><XCircle size={12} className="mr-1" />{statusInfo.label}</>
                )}
              </Badge>
            </div>
            <p className="text-sm text-gray-500">
              구성원 {part.members.length}명
              {partSummary?.createdAt && (
                <> | 생성일: {new Date(partSummary.createdAt).toLocaleDateString('ko-KR')}</>
              )}
            </p>
          </div>
          {canManagePart && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit2 size={14} />
                수정
              </Button>
              {isActive ? (
                <Button variant="outline" size="sm" onClick={onClose}>
                  <Lock size={14} />
                  종료
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={onReopen}>
                  <Unlock size={14} />
                  재개
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <Separator />

      {/* Content */}
      <ScrollArea className="flex-1">
        <CardContent className="pt-4 space-y-6">
          {/* Leader section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">파트장</h3>
              {canManagePart && isActive && (
                <Button variant="ghost" size="sm" onClick={onChangeLeader}>
                  <ArrowLeftRight size={14} />
                  파트장 변경
                </Button>
              )}
            </div>

            {leader && (
              <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="w-10 h-10 rounded-full bg-yellow-200 flex items-center justify-center">
                  <Crown className="text-yellow-600" size={18} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{leader.userName}</span>
                    <Badge variant="outline" className="bg-yellow-100 text-yellow-700">파트장</Badge>
                    {leader.membershipType === 'PRIMARY' ? (
                      <Badge variant="outline" className="bg-blue-100 text-blue-700">주 소속</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-100 text-gray-500">부 소속</Badge>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Leader warning */}
            {leaderWarning?.hasWarning && (
              <div
                className="mt-2 flex items-start gap-2 p-3 bg-orange-50 rounded-lg border border-orange-200 cursor-pointer hover:bg-orange-100 transition-colors"
                onClick={onNavigateToRoles}
              >
                <AlertTriangle size={16} className="text-orange-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-orange-800 font-medium">
                    파트장에게 필요한 권한이 부족합니다
                  </p>
                  <p className="text-xs text-orange-600 mt-1">
                    누락된 권한: {leaderWarning.missingCapabilities.join(', ')}
                  </p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-orange-500">
                    <ExternalLink size={12} />
                    <span>권한 관리로 이동</span>
                  </div>
                </div>
              </div>
            )}

            {/* Co-leaders */}
            {part.coLeaders && part.coLeaders.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-gray-500 mb-2">부 파트장</p>
                <div className="space-y-1">
                  {part.coLeaders.map((co) => (
                    <div key={co.userId} className="flex items-center gap-2 p-2 bg-yellow-50/50 rounded border border-yellow-100">
                      <div className="w-7 h-7 rounded-full bg-yellow-100 flex items-center justify-center text-xs font-medium text-yellow-700">
                        {co.userName[0]}
                      </div>
                      <span className="text-sm text-gray-700">{co.userName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Members section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">
                구성원 ({otherMembers.length}명)
              </h3>
              {canManageMembers && isActive && (
                <Button variant="ghost" size="sm" onClick={onAddMember}>
                  <UserPlus size={14} />
                  구성원 추가
                </Button>
              )}
            </div>

            {otherMembers.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm">
                파트장 외에 등록된 구성원이 없습니다
              </div>
            ) : (
              <div className="space-y-2">
                {otherMembers.map((member) => (
                  <MemberRow
                    key={member.userId}
                    member={member}
                    isActive={isActive}
                    canManageMembers={canManageMembers}
                    isLeader={false}
                    onRemove={() => onRemoveMember(member.userId, member.userName)}
                    onSwitchType={() => onSwitchMemberType(member.userId)}
                  />
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </ScrollArea>
    </Card>
  );
}

// ==================== Member Row ====================

interface MemberRowProps {
  member: OrgPartMember;
  isActive: boolean;
  canManageMembers: boolean;
  isLeader: boolean;
  onRemove: () => void;
  onSwitchType: () => void;
}

function MemberRow({ member, isActive, canManageMembers, isLeader, onRemove, onSwitchType }: MemberRowProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
      <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
        {member.userName[0]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 text-sm truncate">{member.userName}</span>
          {member.membershipType === 'PRIMARY' ? (
            <Badge variant="outline" className="bg-blue-100 text-blue-700">주 소속</Badge>
          ) : (
            <Badge variant="outline" className="bg-gray-100 text-gray-500">부 소속</Badge>
          )}
        </div>
        <p className="text-xs text-gray-400">
          {new Date(member.joinedAt).toLocaleDateString('ko-KR')} 합류
        </p>
      </div>
      {canManageMembers && isActive && !isLeader && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onSwitchType}
            title={member.membershipType === 'PRIMARY' ? '부 소속으로 전환' : '주 소속으로 전환'}
          >
            <ArrowLeftRight size={14} className="text-gray-500" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={onRemove}
            title="구성원 제거"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      )}
    </div>
  );
}

// ==================== Create Part Dialog ====================

interface CreatePartDialogProps {
  onClose: () => void;
  onSubmit: (data: CreateOrgPartRequest) => void;
  isPending: boolean;
}

function CreatePartDialog({ onClose, onSubmit, isPending }: CreatePartDialogProps) {
  const [name, setName] = useState('');
  const [partType, setPartType] = useState('DEVELOPMENT');
  const [customTypeName, setCustomTypeName] = useState('');
  const [leaderUserId, setLeaderUserId] = useState('');
  const [leaderSearch, setLeaderSearch] = useState('');

  const { data: users = [] } = useUsers();

  const filteredUsers = useMemo(() => {
    if (!leaderSearch) return users;
    const lower = leaderSearch.toLowerCase();
    return users.filter(
      (u: any) =>
        u.name.toLowerCase().includes(lower) ||
        u.email.toLowerCase().includes(lower)
    );
  }, [users, leaderSearch]);

  const selectedUser = useMemo(
    () => users.find((u: any) => u.id === leaderUserId),
    [users, leaderUserId]
  );

  const handleSubmit = () => {
    if (!name.trim() || !leaderUserId) return;
    onSubmit({
      name: name.trim(),
      partType,
      customTypeName: partType === 'CUSTOM' ? customTypeName.trim() : undefined,
      leaderUserId,
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>새 파트 생성</DialogTitle>
          <DialogDescription>프로젝트에 새로운 파트(조직 단위)를 생성합니다.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Part name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              파트명 <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="예: AI 개발팀, 백엔드 파트"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Part type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              파트 유형 <span className="text-red-500">*</span>
            </label>
            <Select value={partType} onValueChange={setPartType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PART_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom type name */}
          {partType === 'CUSTOM' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                사용자 정의 유형명
              </label>
              <Input
                placeholder="유형명을 입력하세요"
                value={customTypeName}
                onChange={(e) => setCustomTypeName(e.target.value)}
              />
            </div>
          )}

          {/* Leader selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              파트장 <span className="text-red-500">*</span>
            </label>
            {selectedUser ? (
              <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200 mb-2">
                <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-sm font-medium text-blue-700">
                  {(selectedUser as any).name[0]}
                </div>
                <span className="text-sm font-medium text-gray-900">{(selectedUser as any).name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-6 px-2"
                  onClick={() => setLeaderUserId('')}
                >
                  변경
                </Button>
              </div>
            ) : (
              <>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <Input
                    placeholder="이름 또는 이메일로 검색..."
                    value={leaderSearch}
                    onChange={(e) => setLeaderSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <ScrollArea className="max-h-40">
                  <div className="space-y-1">
                    {filteredUsers.map((user: any) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                        onClick={() => {
                          setLeaderUserId(user.id);
                          setLeaderSearch('');
                        }}
                      >
                        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                          {user.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                      </div>
                    ))}
                    {filteredUsers.length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-4">검색 결과가 없습니다</p>
                    )}
                  </div>
                </ScrollArea>
              </>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || !leaderUserId || isPending}
          >
            {isPending ? '생성 중...' : '생성'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Edit Part Dialog ====================

interface EditPartDialogProps {
  part: OrgPartDto;
  onClose: () => void;
  onSubmit: (data: { name?: string; partType?: string; customTypeName?: string }) => void;
  isPending: boolean;
}

function EditPartDialog({ part, onClose, onSubmit, isPending }: EditPartDialogProps) {
  const [name, setName] = useState(part.name);
  const [partType, setPartType] = useState(part.partType);
  const [customTypeName, setCustomTypeName] = useState(part.customTypeName || '');

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      partType,
      customTypeName: partType === 'CUSTOM' ? customTypeName.trim() : undefined,
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>파트 수정</DialogTitle>
          <DialogDescription>파트 정보를 수정합니다.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              파트명 <span className="text-red-500">*</span>
            </label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              파트 유형
            </label>
            <Select value={partType} onValueChange={setPartType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PART_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {partType === 'CUSTOM' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                사용자 정의 유형명
              </label>
              <Input
                value={customTypeName}
                onChange={(e) => setCustomTypeName(e.target.value)}
                placeholder="유형명을 입력하세요"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || isPending}>
            {isPending ? '수정 중...' : '수정'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Change Leader Dialog ====================

interface ChangeLeaderDialogProps {
  currentLeaderName: string;
  partId: string;
  onClose: () => void;
  onSubmit: (newLeaderUserId: string, reason: string) => void;
  isPending: boolean;
}

function ChangeLeaderDialog({
  currentLeaderName,
  partId,
  onClose,
  onSubmit,
  isPending,
}: ChangeLeaderDialogProps) {
  const [newLeaderUserId, setNewLeaderUserId] = useState('');
  const [reason, setReason] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: users = [] } = useUsers();

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    const lower = searchTerm.toLowerCase();
    return users.filter(
      (u: any) =>
        u.name.toLowerCase().includes(lower) ||
        u.email.toLowerCase().includes(lower)
    );
  }, [users, searchTerm]);

  const selectedUser = useMemo(
    () => users.find((u: any) => u.id === newLeaderUserId),
    [users, newLeaderUserId]
  );

  const handleSubmit = () => {
    if (!newLeaderUserId || !reason.trim()) return;
    onSubmit(newLeaderUserId, reason.trim());
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>파트장 변경</DialogTitle>
          <DialogDescription>
            현재 파트장: <strong>{currentLeaderName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* New leader selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              새 파트장 <span className="text-red-500">*</span>
            </label>
            {selectedUser ? (
              <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200 mb-2">
                <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-sm font-medium text-blue-700">
                  {(selectedUser as any).name[0]}
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {(selectedUser as any).name}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-6 px-2"
                  onClick={() => setNewLeaderUserId('')}
                >
                  변경
                </Button>
              </div>
            ) : (
              <>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <Input
                    placeholder="이름 또는 이메일로 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <ScrollArea className="max-h-40">
                  <div className="space-y-1">
                    {filteredUsers.map((user: any) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                        onClick={() => {
                          setNewLeaderUserId(user.id);
                          setSearchTerm('');
                        }}
                      >
                        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                          {user.name[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                      </div>
                    ))}
                    {filteredUsers.length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-4">검색 결과가 없습니다</p>
                    )}
                  </div>
                </ScrollArea>
              </>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              변경 사유 <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="파트장 변경 사유를 입력하세요"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!newLeaderUserId || !reason.trim() || isPending}
          >
            {isPending ? '변경 중...' : '변경'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Add Member Dialog ====================

interface AddMemberDialogProps {
  existingMembers: OrgPartMember[];
  onClose: () => void;
  onSubmit: (userId: string, membershipType: 'PRIMARY' | 'SECONDARY') => void;
  isPending: boolean;
}

function AddMemberDialog({ existingMembers, onClose, onSubmit, isPending }: AddMemberDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [membershipType, setMembershipType] = useState<'PRIMARY' | 'SECONDARY'>('PRIMARY');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: users = [] } = useUsers();

  const existingUserIds = useMemo(
    () => new Set(existingMembers.map((m) => m.userId)),
    [existingMembers]
  );

  const filteredUsers = useMemo(() => {
    let result = users.filter((u: any) => !existingUserIds.has(u.id));
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(
        (u: any) =>
          u.name.toLowerCase().includes(lower) ||
          u.email.toLowerCase().includes(lower)
      );
    }
    return result;
  }, [users, existingUserIds, searchTerm]);

  const selectedUser = useMemo(
    () => users.find((u: any) => u.id === selectedUserId),
    [users, selectedUserId]
  );

  const handleSubmit = () => {
    if (!selectedUserId) return;
    onSubmit(selectedUserId, membershipType);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>구성원 추가</DialogTitle>
          <DialogDescription>파트에 새 구성원을 추가합니다.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* User selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              사용자 선택 <span className="text-red-500">*</span>
            </label>
            {selectedUser ? (
              <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200 mb-2">
                <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-sm font-medium text-blue-700">
                  {(selectedUser as any).name[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{(selectedUser as any).name}</p>
                  <p className="text-xs text-gray-500">{(selectedUser as any).email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-6 px-2"
                  onClick={() => setSelectedUserId('')}
                >
                  변경
                </Button>
              </div>
            ) : (
              <>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <Input
                    placeholder="이름 또는 이메일로 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <ScrollArea className="max-h-40">
                  <div className="space-y-1">
                    {filteredUsers.map((user: any) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedUserId(user.id);
                          setSearchTerm('');
                        }}
                      >
                        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                          {user.name[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                      </div>
                    ))}
                    {filteredUsers.length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-4">
                        {searchTerm ? '검색 결과가 없습니다' : '추가 가능한 사용자가 없습니다'}
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </>
            )}
          </div>

          {/* Membership type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              소속 유형
            </label>
            <Select value={membershipType} onValueChange={(v) => setMembershipType(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PRIMARY">
                  주 소속 (PRIMARY)
                </SelectItem>
                <SelectItem value="SECONDARY">
                  부 소속 (SECONDARY)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1.5">
              {membershipType === 'PRIMARY'
                ? '주 소속: 이 파트가 해당 사용자의 주요 파트가 됩니다. 한 사용자는 하나의 주 소속만 가질 수 있습니다.'
                : '부 소속: 해당 사용자가 이 파트에 부가적으로 참여합니다.'}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedUserId || isPending}>
            {isPending ? '추가 중...' : '추가'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
