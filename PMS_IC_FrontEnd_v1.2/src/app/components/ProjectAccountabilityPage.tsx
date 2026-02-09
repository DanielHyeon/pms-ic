import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Crown,
  Users,
  Shield,
  Clock,
  ArrowRight,
  Link2,
  Edit2,
  UserPlus,
  History,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Textarea } from './ui/textarea';
import { Skeleton } from './ui/skeleton';
import ProjectNotSelectedMessage from './ProjectNotSelectedMessage';
import { useProject } from '../../contexts/ProjectContext';
import { useCapabilities } from '../../hooks/useCapabilities';
import {
  useAccountability,
  useAccountabilityChangelog,
  useAccountabilityConnections,
  useUpdateAccountability,
} from '../../hooks/api/useAccountability';
import { useUsers } from '../../hooks/api/useRoles';

// ========== Types ==========

type ChangeType = 'PM_CHANGE' | 'CO_PM_CHANGE' | 'SPONSOR_CHANGE';

interface ChangeLogEntry {
  id: string;
  changeType: ChangeType;
  previousUserId: string | null;
  previousUserName: string | null;
  newUserId: string;
  newUserName: string;
  changeReason: string;
  changedBy: string;
  changedByName: string;
  changedAt: string;
}

// ========== Constants ==========

const CHANGE_TYPE_LABELS: Record<ChangeType, string> = {
  PM_CHANGE: 'PM 변경',
  CO_PM_CHANGE: 'Co-PM 변경',
  SPONSOR_CHANGE: '스폰서 변경',
};

const CHANGE_TYPE_COLORS: Record<ChangeType, string> = {
  PM_CHANGE: 'bg-blue-100 text-blue-800',
  CO_PM_CHANGE: 'bg-purple-100 text-purple-800',
  SPONSOR_CHANGE: 'bg-amber-100 text-amber-800',
};

const INITIAL_CHANGELOG_COUNT = 5;

// ========== Component ==========

interface ProjectAccountabilityPageProps {
  userRole: string;
}

export default function ProjectAccountabilityPage({ userRole }: ProjectAccountabilityPageProps) {
  const navigate = useNavigate();
  const { currentProject } = useProject();
  const { hasCapability } = useCapabilities(userRole.toUpperCase());
  const canEdit = hasCapability('edit_project_accountability');

  const projectId = currentProject?.id || '';

  // Queries
  const { data: accountability, isLoading: accountabilityLoading } = useAccountability(projectId);
  const { data: changelog, isLoading: changelogLoading } = useAccountabilityChangelog(projectId);
  const { data: connections, isLoading: connectionsLoading } = useAccountabilityConnections(projectId);
  const { data: users, isLoading: usersLoading } = useUsers();
  const updateMutation = useUpdateAccountability();

  // State
  const [changeDialogOpen, setChangeDialogOpen] = useState(false);
  const [changeType, setChangeType] = useState<ChangeType>('PM_CHANGE');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [showAllChangelog, setShowAllChangelog] = useState(false);

  // Derived
  const userList = useMemo(() => {
    if (!users || !Array.isArray(users)) return [];
    return users.filter((u: any) => u.status === 'active');
  }, [users]);

  const visibleChangelog = useMemo(() => {
    if (!changelog || !Array.isArray(changelog)) return [];
    if (showAllChangelog) return changelog;
    return changelog.slice(0, INITIAL_CHANGELOG_COUNT);
  }, [changelog, showAllChangelog]);

  // No project selected
  if (!currentProject) {
    return (
      <div className="p-6">
        <PageHeader />
        <ProjectNotSelectedMessage
          onNavigateToProjects={() => navigate('/projects')}
        />
      </div>
    );
  }

  // Handlers
  function openChangeDialog(type: ChangeType) {
    setChangeType(type);
    setSelectedUserId('');
    setChangeReason('');
    setChangeDialogOpen(true);
  }

  async function handleSubmitChange() {
    if (!selectedUserId || !changeReason.trim()) return;

    try {
      await updateMutation.mutateAsync({
        projectId,
        data: {
          changeType,
          newUserId: selectedUserId,
          changeReason: changeReason.trim(),
        },
      });
      setChangeDialogOpen(false);
    } catch {
      // Error handling is managed by TanStack Query
    }
  }

  function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '-';
    try {
      return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  }

  function formatShortDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '-';
    try {
      return new Intl.DateTimeFormat('ko-KR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader />

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Project Info + Accountability */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Project Basic Info */}
          <ProjectInfoSection
            project={currentProject}
            isLoading={accountabilityLoading}
            formatDate={formatDate}
          />

          {/* Section 2: Accountability Cards */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Shield className="h-5 w-5 text-blue-600" />
                Authority Anchor
              </CardTitle>
            </CardHeader>
            <CardContent>
              {accountabilityLoading ? (
                <AccountabilitySkeleton />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* PM Card */}
                  <AccountabilityCard
                    icon={<Crown className="h-5 w-5 text-amber-500" />}
                    title="PM"
                    label="Project Manager"
                    userName={accountability?.pmUserName}
                    userId={accountability?.pmUserId}
                    canEdit={canEdit}
                    onEdit={() => openChangeDialog('PM_CHANGE')}
                  />

                  {/* Co-PM Card */}
                  <AccountabilityCard
                    icon={<UserPlus className="h-5 w-5 text-purple-500" />}
                    title="Co-PM"
                    label="Co-Project Manager"
                    userName={accountability?.coPmUserName}
                    userId={accountability?.coPmUserId}
                    isEmpty={!accountability?.coPmUserId}
                    canEdit={canEdit}
                    onEdit={() => openChangeDialog('CO_PM_CHANGE')}
                  />

                  {/* Sponsor Card */}
                  <AccountabilityCard
                    icon={<Shield className="h-5 w-5 text-emerald-500" />}
                    title="Sponsor"
                    label="Project Sponsor"
                    userName={accountability?.sponsorUserName}
                    userId={accountability?.sponsorUserId}
                    isEmpty={!accountability?.sponsorUserId}
                    canEdit={canEdit}
                    onEdit={() => openChangeDialog('SPONSOR_CHANGE')}
                  />
                </div>
              )}

              {/* Last updated */}
              {accountability?.updatedAt && (
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-400">
                  <Clock className="h-3 w-3" />
                  <span>
                    {formatDate(accountability.updatedAt)} 업데이트
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Change History + Connections */}
        <div className="space-y-6">
          {/* Section 3: Change History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <History className="h-5 w-5 text-gray-600" />
                변경 이력
              </CardTitle>
            </CardHeader>
            <CardContent>
              {changelogLoading ? (
                <ChangelogSkeleton />
              ) : !changelog || changelog.length === 0 ? (
                <EmptyChangelog />
              ) : (
                <>
                  <div className="space-y-4">
                    {visibleChangelog.map((entry: ChangeLogEntry, index: number) => (
                      <ChangelogItem
                        key={entry.id || index}
                        entry={entry}
                        formatDate={formatShortDate}
                        isLast={index === visibleChangelog.length - 1}
                      />
                    ))}
                  </div>

                  {changelog.length > INITIAL_CHANGELOG_COUNT && (
                    <div className="mt-4 pt-3 border-t border-gray-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-sm text-blue-600 hover:text-blue-700"
                        onClick={() => setShowAllChangelog(!showAllChangelog)}
                      >
                        {showAllChangelog
                          ? '최근 5건만 보기'
                          : `전체 보기 (${changelog.length}건)`}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Section 4: Connection Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Link2 className="h-5 w-5 text-gray-600" />
                연결 현황
              </CardTitle>
            </CardHeader>
            <CardContent>
              {connectionsLoading ? (
                <ConnectionsSkeleton />
              ) : (
                <div className="space-y-3">
                  <ConnectionItem
                    label="파트"
                    value={connections?.partCount ?? 0}
                    unit="개"
                    onClick={() => navigate('/parts')}
                  />
                  <ConnectionItem
                    label="전체 인원"
                    value={connections?.totalUserCount ?? 0}
                    unit="명"
                  />
                  <ConnectionItem
                    label="활성 위임"
                    value={connections?.activeDelegationCount ?? 0}
                    unit="건"
                    onClick={() => navigate('/roles')}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Change Dialog */}
      <Dialog open={changeDialogOpen} onOpenChange={setChangeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5" />
              {CHANGE_TYPE_LABELS[changeType]}
            </DialogTitle>
            <DialogDescription>
              {changeType === 'PM_CHANGE' && 'PM(Project Manager)을 변경합니다. 변경 사유를 반드시 기입해주세요.'}
              {changeType === 'CO_PM_CHANGE' && 'Co-PM(Co-Project Manager)을 변경합니다.'}
              {changeType === 'SPONSOR_CHANGE' && 'Sponsor(프로젝트 스폰서)를 변경합니다.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* User Select */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                새 담당자 선택
              </label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="담당자를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {usersLoading ? (
                    <SelectItem value="_loading" disabled>
                      로딩 중...
                    </SelectItem>
                  ) : userList.length === 0 ? (
                    <SelectItem value="_empty" disabled>
                      사용 가능한 사용자가 없습니다
                    </SelectItem>
                  ) : (
                    userList.map((user: any) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Change Reason */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                변경 사유 <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                placeholder="변경 사유를 입력하세요..."
                rows={3}
              />
            </div>

            {/* Warning */}
            {changeType === 'PM_CHANGE' && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700">
                  PM 변경은 프로젝트 전체 권한 구조에 영향을 미칩니다.
                  변경 후 기존 PM의 관리 권한이 해제됩니다.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setChangeDialogOpen(false)}
              disabled={updateMutation.isPending}
            >
              취소
            </Button>
            <Button
              onClick={handleSubmitChange}
              disabled={!selectedUserId || !changeReason.trim() || updateMutation.isPending}
            >
              {updateMutation.isPending ? '변경 중...' : '변경 적용'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ========== Sub-Components ==========

function PageHeader() {
  return (
    <div className="mb-2">
      <h2 className="text-2xl font-semibold text-gray-900">
        프로젝트 관리
      </h2>
      <p className="text-sm text-gray-500 mt-1">
        PM, Co-PM, Sponsor 등 프로젝트 책임자 정보와 변경 이력을 관리합니다.
      </p>
    </div>
  );
}

// ---- Project Info Section ----

function ProjectInfoSection({
  project,
  isLoading,
  formatDate,
}: {
  project: any;
  isLoading: boolean;
  formatDate: (d: string | null | undefined) => string;
}) {
  const statusBadge = getStatusBadge(project.status);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Crown className="h-5 w-5 text-amber-500" />
          프로젝트 기본 정보
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoRow label="프로젝트명" value={project.name} />
            <InfoRow label="상태">
              <Badge className={statusBadge.className}>
                {statusBadge.label}
              </Badge>
            </InfoRow>
            <InfoRow
              label="기간"
              value={`${project.startDate || '-'} ~ ${project.endDate || '-'}`}
            />
            <InfoRow
              label="진행률"
              value={`${project.progress ?? 0}%`}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InfoRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
        {label}
      </span>
      {children || (
        <span className="text-sm font-medium text-gray-900">{value || '-'}</span>
      )}
    </div>
  );
}

function getStatusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    PLANNING: { label: '계획 중', className: 'bg-gray-100 text-gray-700 border-gray-200' },
    IN_PROGRESS: { label: '진행 중', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    ON_HOLD: { label: '보류', className: 'bg-amber-100 text-amber-700 border-amber-200' },
    COMPLETED: { label: '완료', className: 'bg-green-100 text-green-700 border-green-200' },
    CANCELLED: { label: '취소됨', className: 'bg-red-100 text-red-700 border-red-200' },
  };
  return map[status] || { label: status || '-', className: 'bg-gray-100 text-gray-700 border-gray-200' };
}

// ---- Accountability Card ----

function AccountabilityCard({
  icon,
  title,
  label,
  userName,
  userId,
  isEmpty = false,
  canEdit,
  onEdit,
}: {
  icon: React.ReactNode;
  title: string;
  label: string;
  userName?: string | null;
  userId?: string | null;
  isEmpty?: boolean;
  canEdit: boolean;
  onEdit: () => void;
}) {
  return (
    <div className="relative group p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-semibold text-gray-900">{title}</span>
        </div>
        {canEdit && (
          <button
            onClick={onEdit}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-200"
            title={`${title} 변경`}
          >
            <Edit2 className="h-3.5 w-3.5 text-gray-500" />
          </button>
        )}
      </div>

      <p className="text-xs text-gray-400 mb-1">{label}</p>

      {isEmpty ? (
        <div className="flex items-center gap-1.5 text-gray-400">
          <UserPlus className="h-4 w-4" />
          <span className="text-sm">미지정</span>
        </div>
      ) : (
        <div>
          <p className="text-base font-medium text-gray-900">
            {userName || '-'}
          </p>
          {userId && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">{userId}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Changelog Item ----

function ChangelogItem({
  entry,
  formatDate,
  isLast,
}: {
  entry: ChangeLogEntry;
  formatDate: (d: string | null | undefined) => string;
  isLast: boolean;
}) {
  const changeTypeLabel = CHANGE_TYPE_LABELS[entry.changeType] || entry.changeType;
  const changeTypeColor = CHANGE_TYPE_COLORS[entry.changeType] || 'bg-gray-100 text-gray-800';

  return (
    <div className="relative flex gap-3">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-[11px] top-6 bottom-0 w-px bg-gray-200" />
      )}

      {/* Timeline dot */}
      <div className="relative z-10 mt-1 h-[22px] w-[22px] shrink-0 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center">
        <div className="h-2 w-2 rounded-full bg-gray-400" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-1">
        <div className="flex items-center gap-2 mb-1">
          <Badge className={`text-[10px] px-1.5 py-0 ${changeTypeColor} border-0`}>
            {changeTypeLabel}
          </Badge>
          <span className="text-[11px] text-gray-400">
            {formatDate(entry.changedAt)}
          </span>
        </div>

        <p className="text-sm text-gray-700">
          {entry.previousUserName ? (
            <>
              <span className="text-gray-400">{entry.previousUserName}</span>
              <ArrowRight className="inline h-3 w-3 mx-1 text-gray-400" />
              <span className="font-medium">{entry.newUserName}</span>
            </>
          ) : (
            <span className="font-medium">{entry.newUserName} 지정</span>
          )}
        </p>

        {entry.changeReason && (
          <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
            {entry.changeReason}
          </p>
        )}

        {entry.changedByName && (
          <p className="text-[11px] text-gray-300 mt-0.5">
            by {entry.changedByName}
          </p>
        )}
      </div>
    </div>
  );
}

function EmptyChangelog() {
  return (
    <div className="text-center py-8 text-gray-400">
      <History className="h-8 w-8 mx-auto mb-2 opacity-40" />
      <p className="text-sm">변경 이력이 없습니다</p>
    </div>
  );
}

// ---- Connection Item ----

function ConnectionItem({
  label,
  value,
  unit,
  onClick,
}: {
  label: string;
  value: number;
  unit: string;
  onClick?: () => void;
}) {
  const content = (
    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-200 hover:border-gray-300 transition-colors">
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-lg font-semibold text-gray-900">
          {value}
          <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>
        </p>
      </div>
      {onClick && (
        <ArrowRight className="h-4 w-4 text-gray-400" />
      )}
    </div>
  );

  if (onClick) {
    return (
      <button className="w-full text-left" onClick={onClick}>
        {content}
      </button>
    );
  }

  return content;
}

// ---- Skeleton Loaders ----

function AccountabilitySkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <Skeleton className="h-5 w-16 mb-3" />
          <Skeleton className="h-3 w-24 mb-2" />
          <Skeleton className="h-5 w-20" />
        </div>
      ))}
    </div>
  );
}

function ChangelogSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-5 w-5 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ConnectionsSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-16 w-full rounded-lg" />
      ))}
    </div>
  );
}
