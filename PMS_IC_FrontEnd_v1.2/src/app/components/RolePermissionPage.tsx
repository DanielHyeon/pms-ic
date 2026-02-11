import { useState, useMemo } from 'react';
import {
  Shield,
  ShieldCheck,
  Users,
  GitBranch,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  ChevronRight,
  Plus,
  Trash2,
  Eye,
  RefreshCw,
  Ban,
  Info,
  ArrowRight,
  CornerDownRight,
  Timer,
  Zap,
  FileText,
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
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Skeleton } from './ui/skeleton';
import ProjectNotSelectedMessage from './ProjectNotSelectedMessage';
import { useProject } from '../../contexts/ProjectContext';
import { useCapabilities } from '../../hooks/useCapabilities';
import { useUsers } from '../../hooks/api/useRoles';
import {
  useRolesQuery,
  useCapabilitiesQuery,
  useUserRolesQuery,
  useUserCapabilitiesQuery,
  useDelegationsQuery,
  useDelegationMapQuery,
  useEffectiveCapabilitiesQuery,
  useUserAuthorityQuery,
  useGovernanceFindingsQuery,
  useGovernanceCheckRunsQuery,
  useGrantUserRole,
  useRevokeUserRole,
  useGrantUserCapability,
  useRevokeUserCapability,
  useCreateDelegation,
  useApproveDelegation,
  useRevokeDelegation,
  useRunGovernanceCheck,
  type RoleDto,
  type CapabilityDto,
  type UserRoleDto,
  type UserCapabilityDto,
  type DelegationDto,
  type DelegationMapNodeDto,
  type EffectiveCapabilityDto,
  type GovernanceFindingDto,
  type GovernanceCheckRunDto,
  type SodWarningDto,
  type RecommendedActionDto,
  type UserAuthorityDto,
  type EffectiveCapabilityInfoDto,
  type DelegatedCapabilityInfo,
} from '../../hooks/api/useAuthority';

interface Props {
  userRole: string;
}

type TabId = 'delegation-map' | 'role-capability' | 'governance';

// ==================== 유틸리티 함수 ====================

/** 위임 만료까지 남은 일수 계산 (-1이면 만료 안됨) */
function getDaysUntilExpiry(endAt?: string): number {
  if (!endAt) return -1;
  const end = new Date(endAt);
  const now = new Date();
  const diff = end.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/** detailsJson 안전하게 파싱 */
function parseDetailsJson(json: string): Record<string, any> {
  try { return JSON.parse(json || '{}'); } catch { return {}; }
}

// ==================== Status/Severity Badge Helpers ====================

function DelegationStatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
    ACTIVE: { variant: 'default', label: '활성' },
    PENDING: { variant: 'secondary', label: '대기' },
    EXPIRED: { variant: 'outline', label: '만료' },
    REVOKED: { variant: 'destructive', label: '철회' },
  };
  const c = config[status] || { variant: 'outline' as const, label: status };
  return <Badge variant={c.variant}>{c.label}</Badge>;
}

function SeverityBadge({ severity }: { severity: string }) {
  const config: Record<string, { className: string; label: string }> = {
    HIGH: { className: 'bg-red-100 text-red-800 border-red-200', label: 'HIGH' },
    MEDIUM: { className: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'MEDIUM' },
    LOW: { className: 'bg-blue-100 text-blue-800 border-blue-200', label: 'LOW' },
    INFO: { className: 'bg-gray-100 text-gray-600 border-gray-200', label: 'INFO' },
  };
  const c = config[severity] || { className: 'bg-gray-100 text-gray-600 border-gray-200', label: severity };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${c.className}`}>{c.label}</span>;
}

function SourceBadge({ sourceType }: { sourceType: string }) {
  const config: Record<string, { className: string; label: string }> = {
    DELEGATION: { className: 'bg-purple-100 text-purple-800', label: '위임' },
    DIRECT: { className: 'bg-blue-100 text-blue-800', label: '직접' },
    ROLE: { className: 'bg-green-100 text-green-800', label: '역할' },
  };
  const c = config[sourceType] || { className: 'bg-gray-100 text-gray-600', label: sourceType };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${c.className}`}>{c.label}</span>;
}

/** 우선순위 배지 (권장 조치용) */
function PriorityBadge({ priority }: { priority: string }) {
  const config: Record<string, { className: string }> = {
    HIGH: { className: 'bg-red-100 text-red-800 border-red-200' },
    MEDIUM: { className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    LOW: { className: 'bg-green-100 text-green-800 border-green-200' },
  };
  const c = config[priority] || { className: 'bg-gray-100 text-gray-600 border-gray-200' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${c.className}`}>{priority}</span>;
}

// ==================== Tab 1: Delegation Map ====================

function DelegationMapTab({
  projectId,
  delegationMap,
  isLoading,
  selectedUserId,
  setSelectedUserId,
  findings,
  canManage,
}: {
  projectId: string;
  delegationMap: DelegationMapNodeDto[];
  isLoading: boolean;
  selectedUserId: string | null;
  setSelectedUserId: (id: string | null) => void;
  findings: GovernanceFindingDto[];
  canManage: boolean;
}) {
  // User 360 통합 조회 (소속 + 역할 + 직접권한 + 위임권한 + 유효권한)
  const userAuthority = useUserAuthorityQuery(projectId, selectedUserId || undefined);
  // 기존 effectiveCaps도 유지 (User 360 미지원 시 fallback)
  const effectiveCaps = useEffectiveCapabilitiesQuery(projectId, selectedUserId || undefined);
  const delegations = useDelegationsQuery(projectId);

  // SoD 위반이 있는 사용자 ID 집합
  const sodViolationUserIds = useMemo(() => {
    const ids = new Set<string>();
    findings.forEach(f => {
      if (f.findingType === 'SOD_VIOLATION' && f.userId) ids.add(f.userId);
    });
    return ids;
  }, [findings]);

  // 만료 임박 위임 수 (7일 이내)
  const expiringCount = useMemo(() => {
    let count = 0;
    function countInNode(node: DelegationMapNodeDto) {
      node.delegations?.forEach(d => {
        if (d.status === 'ACTIVE' && d.endAt) {
          const days = getDaysUntilExpiry(d.endAt);
          if (days >= 0 && days <= 7) count++;
        }
      });
      node.children?.forEach(countInNode);
    }
    delegationMap.forEach(countInNode);
    return count;
  }, [delegationMap]);

  // 선택된 사용자 관련 위임 목록 (User 360 or fallback)
  const selectedUserDelegations = useMemo(() => {
    if (!selectedUserId || !delegations.data) return [];
    return (delegations.data as DelegationDto[]).filter(
      d => d.delegatorId === selectedUserId || d.delegateeId === selectedUserId
    );
  }, [selectedUserId, delegations.data]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    );
  }

  if (!delegationMap || delegationMap.length === 0) {
    return (
      <div className="text-center text-gray-500 py-12">
        <GitBranch className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p>위임 맵 데이터가 없습니다.</p>
        <p className="text-sm mt-1">역할/권한 탭에서 위임을 생성하면 맵이 표시됩니다.</p>
      </div>
    );
  }

  // 노드 깊이별 배경색 (그라데이션)
  const depthColors = ['bg-blue-500', 'bg-blue-400', 'bg-blue-300', 'bg-indigo-300', 'bg-indigo-200'];

  function renderNode(node: DelegationMapNodeDto, depth: number) {
    const isSelected = selectedUserId === node.userId;
    const hasSodWarning = sodViolationUserIds.has(node.userId);

    // 만료 임박 위임 찾기
    const expiringDelegation = node.delegations?.find(d => {
      if (d.status !== 'ACTIVE' || !d.endAt) return false;
      const days = getDaysUntilExpiry(d.endAt);
      return days >= 0 && days <= 7;
    });
    const expiryDays = expiringDelegation ? getDaysUntilExpiry(expiringDelegation.endAt!) : -1;

    // 재위임 여부
    const hasRedelegation = node.delegations?.some(d => d.parentDelegationId);

    return (
      <div key={node.userId + '-' + depth} className="ml-0">
        <div
          className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-50 transition-colors ${
            isSelected ? 'bg-blue-50 border border-blue-200' : ''
          } ${hasSodWarning ? 'ring-2 ring-red-400' : ''}`}
          style={{ paddingLeft: `${depth * 24 + 8}px` }}
          onClick={() => setSelectedUserId(isSelected ? null : node.userId)}
        >
          {depth > 0 && <ChevronRight className="h-3 w-3 text-gray-400" />}
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white ${
            depthColors[Math.min(depth, depthColors.length - 1)]
          }`}>
            {(node.userName || '?').charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{node.userName || node.userId}</div>
            <div className="text-xs text-gray-500">{node.roleName || ''}</div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* 만료 임박 배지 */}
            {expiryDays >= 0 && expiryDays <= 7 && (
              <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                <Timer className="h-3 w-3 mr-0.5" />
                D-{expiryDays}
              </Badge>
            )}
            {/* 재위임 표시 */}
            {hasRedelegation && (
              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                <CornerDownRight className="h-3 w-3 mr-0.5" />
                재위임
              </Badge>
            )}
            {/* SoD 경고 */}
            {hasSodWarning && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="h-3 w-3 mr-0.5" />
                SoD
              </Badge>
            )}
            {node.delegations?.length > 0 && (
              <Badge variant="outline" className="text-xs">
                위임 {node.delegations.length}건
              </Badge>
            )}
          </div>
        </div>
        {node.children?.map(child => renderNode(child, depth + 1))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 경고 요약 패널 */}
      {(sodViolationUserIds.size > 0 || expiringCount > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sodViolationUserIds.size > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="py-3 px-4 flex items-center gap-3">
                <Ban className="h-5 w-5 text-red-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-800">SoD 위반</p>
                  <p className="text-xs text-red-600">{sodViolationUserIds.size}명의 사용자에게 직무 분리 위반이 감지되었습니다.</p>
                </div>
              </CardContent>
            </Card>
          )}
          {expiringCount > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="py-3 px-4 flex items-center gap-3">
                <Clock className="h-5 w-5 text-orange-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-orange-800">만료 임박</p>
                  <p className="text-xs text-orange-600">{expiringCount}건의 위임이 7일 이내에 만료됩니다.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 위임 맵 트리 */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                위임 맵
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-0.5">
                {delegationMap.map(node => renderNode(node, 0))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 사이드 패널: 사용자 상세 (User 360) */}
        <div className="lg:col-span-1">
          {selectedUserId ? (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  {userAuthority.data?.userName || '사용자 상세'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(userAuthority.isLoading || effectiveCaps.isLoading) ? (
                  <div className="space-y-2">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-8 w-full" />)}
                  </div>
                ) : userAuthority.data ? (
                  <UserAuthoritySidePanel
                    authority={userAuthority.data as UserAuthorityDto}
                    selectedUserId={selectedUserId}
                    selectedUserDelegations={selectedUserDelegations}
                  />
                ) : (
                  /* User 360 API 미지원 시 기존 fallback */
                  <UserAuthorityFallbackPanel
                    effectiveCaps={effectiveCaps.data as EffectiveCapabilityDto[] | undefined}
                    selectedUserDelegations={selectedUserDelegations}
                    selectedUserId={selectedUserId}
                  />
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-gray-500 text-sm">
                <Eye className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                맵에서 사용자를 클릭하면 상세 정보를 확인할 수 있습니다.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== User Authority Side Panel (User 360) ====================

/** User 360 통합 사이드 패널 — 소속, 역할(preset포함), 직접권한, 위임권한, 유효권한 표시 */
function UserAuthoritySidePanel({
  authority,
  selectedUserId,
  selectedUserDelegations,
}: {
  authority: UserAuthorityDto;
  selectedUserId: string;
  selectedUserDelegations: DelegationDto[];
}) {
  return (
    <>
      {/* 소속 파트 */}
      {authority.partMemberships && authority.partMemberships.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
            <Shield className="h-3.5 w-3.5" /> 소속
          </h4>
          <div className="space-y-1">
            {authority.partMemberships.map((pm, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                <span className="font-medium">{pm.partName}</span>
                <Badge variant="outline" className="text-[10px]">
                  {pm.membershipType === 'PRIMARY' ? '주 소속' : pm.membershipType}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 보유 역할 (preset 권한 포함) */}
      <div>
        <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
          <Users className="h-3.5 w-3.5" /> 보유 역할
        </h4>
        {authority.roles.length === 0 ? (
          <p className="text-xs text-gray-500">배정된 역할이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {authority.roles.map((role, idx) => (
              <div key={idx} className="p-2 bg-gray-50 rounded text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{role.roleName}</span>
                  <Badge variant="secondary" className="text-[10px]">{role.roleCode}</Badge>
                </div>
                {role.grantedByName && (
                  <p className="text-gray-400">부여: {role.grantedByName}</p>
                )}
                {role.presetCapabilities && role.presetCapabilities.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 mt-1">
                    {role.presetCapabilities.map((cap, ci) => (
                      <span key={ci} className="inline-flex items-center px-1.5 py-0.5 rounded bg-green-50 text-green-700 text-[10px]">
                        {cap}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 직접 부여 권한 */}
      {authority.directCapabilities && authority.directCapabilities.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
            <Zap className="h-3.5 w-3.5" /> 직접 부여 권한
          </h4>
          <div className="space-y-1.5">
            {authority.directCapabilities.map((cap, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-blue-50 rounded text-xs">
                <div>
                  <span className="font-medium">{cap.capabilityName}</span>
                  <span className="text-gray-400 ml-1">({cap.capabilityCode})</span>
                </div>
                <SourceBadge sourceType="DIRECT" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 위임받은 권한 */}
      {authority.delegatedCapabilities && authority.delegatedCapabilities.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
            <CornerDownRight className="h-3.5 w-3.5" /> 위임받은 권한
          </h4>
          <div className="space-y-1.5">
            {authority.delegatedCapabilities.map((dc, idx) => (
              <div key={idx} className="p-2 bg-purple-50 rounded text-xs space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{dc.capabilityName}</span>
                  <SourceBadge sourceType="DELEGATION" />
                </div>
                <p className="text-gray-500">
                  위임자: {dc.delegator} | 승인자: {dc.approver}
                </p>
                <div className="flex items-center gap-1 flex-wrap">
                  {dc.scope && (
                    <Badge variant="outline" className="text-[10px]">
                      {dc.scope.type === 'PROJECT' ? '프로젝트' :
                       dc.scope.type === 'PART' ? dc.scope.partName || '파트' :
                       dc.scope.type === 'FUNCTION' ? '기능: ' + (dc.scope.functionDescription || '') :
                       dc.scope.type}
                    </Badge>
                  )}
                  {dc.daysRemaining != null && dc.daysRemaining >= 0 && dc.daysRemaining <= 7 && (
                    <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700 border-orange-200">
                      <Timer className="h-2.5 w-2.5 mr-0.5" />D-{dc.daysRemaining}
                    </Badge>
                  )}
                  {dc.parentDelegationId && (
                    <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-600 border-purple-200">
                      재위임
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 유효 권한 (우선순위 적용) */}
      <div>
        <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5" /> 유효 권한 ({authority.effectiveCapabilities?.length || 0})
        </h4>
        {(!authority.effectiveCapabilities || authority.effectiveCapabilities.length === 0) ? (
          <p className="text-xs text-gray-500">유효 권한이 없습니다.</p>
        ) : (
          <div className="space-y-1.5">
            {authority.effectiveCapabilities.map((cap, idx) => (
              <div key={idx} className="p-2 bg-gray-50 rounded text-xs space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{cap.name}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-gray-400">P{cap.priority}</span>
                    <SourceBadge sourceType={
                      cap.source === 'ROLE_PRESET' ? 'ROLE' :
                      cap.source === 'DELEGATION' ? 'DELEGATION' :
                      cap.source === 'DIRECT' ? 'DIRECT' : cap.source
                    } />
                  </div>
                </div>
                {/* 출처 상세 */}
                <p className="text-gray-400">
                  {cap.source === 'ROLE_PRESET' && cap.roleName && `역할: ${cap.roleName}`}
                  {cap.source === 'DELEGATION' && cap.delegatorName && `위임자: ${cap.delegatorName}`}
                  {cap.source === 'DIRECT' && '직접 부여'}
                </p>
                {/* 중복 출처 */}
                {cap.duplicateSources && cap.duplicateSources.length > 0 && (
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    + 중복: {cap.duplicateSources.map(ds =>
                      ds.source === 'ROLE_PRESET' ? `역할(${ds.roleName})` :
                      ds.source === 'DELEGATION' ? `위임(${ds.delegatorName})` :
                      '직접'
                    ).join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 관련 위임 (위임자/수임자로서의 전체 목록) */}
      {selectedUserDelegations.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
            <ArrowRight className="h-3.5 w-3.5" /> 관련 위임
          </h4>
          <div className="space-y-1.5">
            {selectedUserDelegations.slice(0, 5).map(d => (
              <div key={d.id} className="p-2 bg-gray-50 rounded text-xs space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{d.capabilityName || d.capabilityCode}</span>
                  <DelegationStatusBadge status={d.status} />
                </div>
                <p className="text-gray-500">
                  {d.delegatorId === selectedUserId
                    ? `→ ${d.delegateeName || d.delegateeId}`
                    : `← ${d.delegatorName || d.delegatorId}`}
                </p>
                {d.parentDelegationId && (
                  <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-600 border-purple-200">
                    재위임
                  </Badge>
                )}
              </div>
            ))}
            {selectedUserDelegations.length > 5 && (
              <p className="text-xs text-gray-400 text-center">외 {selectedUserDelegations.length - 5}건</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/** User 360 API 미지원 시 fallback 패널 (기존 effectiveCaps 기반) */
function UserAuthorityFallbackPanel({
  effectiveCaps,
  selectedUserDelegations,
  selectedUserId,
}: {
  effectiveCaps: EffectiveCapabilityDto[] | undefined;
  selectedUserDelegations: DelegationDto[];
  selectedUserId: string;
}) {
  return (
    <>
      {/* 유효 권한 */}
      <div>
        <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5" /> 유효 권한
        </h4>
        {(!effectiveCaps || effectiveCaps.length === 0) ? (
          <p className="text-xs text-gray-500">유효 권한이 없습니다.</p>
        ) : (
          <div className="space-y-1.5">
            {effectiveCaps.map((cap, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                <span className="font-medium">{cap.capabilityName || cap.capabilityCode}</span>
                <SourceBadge sourceType={cap.sourceType} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 관련 위임 */}
      {selectedUserDelegations.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
            <ArrowRight className="h-3.5 w-3.5" /> 관련 위임
          </h4>
          <div className="space-y-1.5">
            {selectedUserDelegations.slice(0, 5).map(d => (
              <div key={d.id} className="p-2 bg-gray-50 rounded text-xs space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{d.capabilityName || d.capabilityCode}</span>
                  <DelegationStatusBadge status={d.status} />
                </div>
                <p className="text-gray-500">
                  {d.delegatorId === selectedUserId
                    ? `→ ${d.delegateeName || d.delegateeId}`
                    : `← ${d.delegatorName || d.delegatorId}`}
                </p>
              </div>
            ))}
            {selectedUserDelegations.length > 5 && (
              <p className="text-xs text-gray-400 text-center">외 {selectedUserDelegations.length - 5}건</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ==================== Tab 2: Role/Capability ====================

function RoleCapabilityTab({
  projectId,
  canManage,
}: {
  projectId: string;
  canManage: boolean;
}) {
  const [showGrantRole, setShowGrantRole] = useState(false);
  const [showGrantCap, setShowGrantCap] = useState(false);
  const [showCreateDelegation, setShowCreateDelegation] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState<{ delegationId: string; hasChildren: boolean } | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [sodResultDialog, setSodResultDialog] = useState<{ type: 'blocked' | 'warning'; warnings: SodWarningDto[] } | null>(null);

  const [grantRoleForm, setGrantRoleForm] = useState({ userId: '', roleId: '', reason: '' });
  const [grantCapForm, setGrantCapForm] = useState({ userId: '', capabilityId: '', reason: '' });
  const [delegationForm, setDelegationForm] = useState({
    delegateeId: '',
    capabilityId: '',
    scopeType: 'PROJECT',
    scopeFunctionDescription: '',
    durationType: 'PERMANENT',
    startAt: new Date().toISOString().slice(0, 10),
    endAt: '',
    approverId: '',
    reason: '',
    parentDelegationId: '',
    isRedelegation: false,
  });

  const roles = useRolesQuery(projectId);
  const capabilities = useCapabilitiesQuery(projectId);
  const userRoles = useUserRolesQuery(projectId);
  const userCaps = useUserCapabilitiesQuery(projectId);
  const delegations = useDelegationsQuery(projectId);
  const { data: users } = useUsers();

  const grantRole = useGrantUserRole(projectId);
  const revokeRole = useRevokeUserRole(projectId);
  const grantCap = useGrantUserCapability(projectId);
  const revokeCap = useRevokeUserCapability(projectId);
  const createDelegation = useCreateDelegation(projectId);
  const approveDelegation = useApproveDelegation(projectId);
  const revokeDelegation = useRevokeDelegation(projectId);

  const userList = useMemo(() => {
    if (!users) return [];
    return Array.isArray(users) ? users : [];
  }, [users]);

  // 선택된 역할의 Preset Capability 미리보기
  const presetCapabilities = useMemo(() => {
    if (!grantRoleForm.roleId || !roles.data || !capabilities.data) return [];
    const role = (roles.data as RoleDto[]).find(r => r.id === grantRoleForm.roleId);
    if (!role?.capabilityIds?.length) return [];
    const capMap = new Map((capabilities.data as CapabilityDto[]).map(c => [c.id, c]));
    return role.capabilityIds.map(id => capMap.get(id)).filter(Boolean) as CapabilityDto[];
  }, [grantRoleForm.roleId, roles.data, capabilities.data]);

  // 재위임 가능한 기존 위임 목록 (활성 상태)
  const activeDelegations = useMemo(() => {
    if (!delegations.data) return [];
    return (delegations.data as DelegationDto[]).filter(d => d.status === 'ACTIVE');
  }, [delegations.data]);

  // FUNCTION 스코프 최대 90일 제한 날짜 계산
  const maxEndDate = useMemo(() => {
    if (delegationForm.scopeType !== 'FUNCTION') return '';
    const start = new Date(delegationForm.startAt || new Date());
    start.setDate(start.getDate() + 90);
    return start.toISOString().slice(0, 10);
  }, [delegationForm.scopeType, delegationForm.startAt]);

  const handleGrantRole = async () => {
    if (!grantRoleForm.userId || !grantRoleForm.roleId) return;
    try {
      const result: any = await grantRole.mutateAsync(grantRoleForm);
      // SoD 경고 확인
      if (result?.sodWarnings?.length > 0) {
        setSodResultDialog({ type: 'warning', warnings: result.sodWarnings });
      }
      setShowGrantRole(false);
      setGrantRoleForm({ userId: '', roleId: '', reason: '' });
    } catch (e: any) {
      // 409 Conflict = SoD 차단
      if (e?.status === 409 || e?.response?.status === 409) {
        const warnings = e?.response?.data?.sodWarnings || e?.sodWarnings || [];
        setSodResultDialog({ type: 'blocked', warnings });
      } else {
        alert(e?.message || '역할 부여에 실패했습니다');
      }
    }
  };

  const handleGrantCap = async () => {
    if (!grantCapForm.userId || !grantCapForm.capabilityId) return;
    try {
      await grantCap.mutateAsync(grantCapForm);
      setShowGrantCap(false);
      setGrantCapForm({ userId: '', capabilityId: '', reason: '' });
    } catch (e: any) {
      alert(e?.message || '권한 부여에 실패했습니다');
    }
  };

  const handleCreateDelegation = async () => {
    if (!delegationForm.delegateeId || !delegationForm.capabilityId || !delegationForm.approverId) return;
    try {
      await createDelegation.mutateAsync({
        delegateeId: delegationForm.delegateeId,
        capabilityId: delegationForm.capabilityId,
        scopeType: delegationForm.scopeType,
        scopeFunctionDescription: delegationForm.scopeType === 'FUNCTION' ? delegationForm.scopeFunctionDescription : undefined,
        durationType: delegationForm.durationType,
        startAt: delegationForm.startAt,
        endAt: delegationForm.durationType === 'TEMPORARY' ? delegationForm.endAt : undefined,
        approverId: delegationForm.approverId,
        reason: delegationForm.reason || undefined,
        parentDelegationId: delegationForm.isRedelegation ? delegationForm.parentDelegationId || undefined : undefined,
      });
      setShowCreateDelegation(false);
      setDelegationForm({
        delegateeId: '', capabilityId: '', scopeType: 'PROJECT',
        scopeFunctionDescription: '',
        durationType: 'PERMANENT', startAt: new Date().toISOString().slice(0, 10),
        endAt: '', approverId: '', reason: '', parentDelegationId: '', isRedelegation: false,
      });
    } catch (e: any) {
      alert(e?.message || '위임 생성에 실패했습니다');
    }
  };

  const handleRevokeDelegation = async () => {
    if (!showRevokeDialog) return;
    try {
      await revokeDelegation.mutateAsync({ delegationId: showRevokeDialog.delegationId, reason: revokeReason || undefined });
      setShowRevokeDialog(null);
      setRevokeReason('');
    } catch (e: any) {
      alert(e?.message || '위임 철회에 실패했습니다');
    }
  };

  const isLoading = roles.isLoading || userRoles.isLoading || delegations.isLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full" />)}
      </div>
    );
  }

  // 위임에 하위 재위임이 있는지 확인
  function hasChildDelegations(delegationId: string): boolean {
    if (!delegations.data) return false;
    return (delegations.data as DelegationDto[]).some(d => d.parentDelegationId === delegationId);
  }

  return (
    <div className="space-y-4">
      {/* 사용자 역할 섹션 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              사용자 역할
            </CardTitle>
            {canManage && (
              <Button size="sm" variant="outline" onClick={() => setShowGrantRole(true)}>
                <Plus className="h-3 w-3 mr-1" /> 역할 부여
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {(!userRoles.data || (userRoles.data as UserRoleDto[]).length === 0) ? (
            <p className="text-sm text-gray-500 text-center py-4">아직 역할 배정이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 font-medium">사용자</th>
                    <th className="pb-2 font-medium">역할</th>
                    <th className="pb-2 font-medium">권한 설정자</th>
                    <th className="pb-2 font-medium">날짜</th>
                    <th className="pb-2 font-medium">SoD</th>
                    {canManage && <th className="pb-2 font-medium w-16"></th>}
                  </tr>
                </thead>
                <tbody>
                  {(userRoles.data as UserRoleDto[]).map(ur => (
                    <tr key={ur.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2">{ur.userName || ur.userId}</td>
                      <td className="py-2"><Badge variant="secondary">{ur.roleName || ur.roleId}</Badge></td>
                      <td className="py-2 text-gray-500">{ur.grantedByName || ur.grantedBy}</td>
                      <td className="py-2 text-gray-500">{ur.grantedAt ? new Date(ur.grantedAt).toLocaleDateString() : ''}</td>
                      <td className="py-2">
                        {ur.sodWarnings && ur.sodWarnings.length > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-0.5" />
                            {ur.sodWarnings.length}
                          </Badge>
                        )}
                      </td>
                      {canManage && (
                        <td className="py-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                            onClick={() => {
                              if (confirm('이 역할 배정을 철회하시겠습니까?')) {
                                revokeRole.mutate(ur.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 직접 권한 부여 섹션 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              직접 권한 부여
            </CardTitle>
            {canManage && (
              <Button size="sm" variant="outline" onClick={() => setShowGrantCap(true)}>
                <Plus className="h-3 w-3 mr-1" /> 권한 부여
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {(!userCaps.data || (userCaps.data as UserCapabilityDto[]).length === 0) ? (
            <p className="text-sm text-gray-500 text-center py-4">직접 부여된 권한이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 font-medium">사용자</th>
                    <th className="pb-2 font-medium">권한</th>
                    <th className="pb-2 font-medium">권한 설정자</th>
                    <th className="pb-2 font-medium">날짜</th>
                    {canManage && <th className="pb-2 font-medium w-16"></th>}
                  </tr>
                </thead>
                <tbody>
                  {(userCaps.data as UserCapabilityDto[]).map(uc => (
                    <tr key={uc.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2">{uc.userName || uc.userId}</td>
                      <td className="py-2">
                        <Badge variant="outline">{uc.capabilityName || uc.capabilityCode}</Badge>
                      </td>
                      <td className="py-2 text-gray-500">{uc.grantedByName || uc.grantedBy}</td>
                      <td className="py-2 text-gray-500">{uc.grantedAt ? new Date(uc.grantedAt).toLocaleDateString() : ''}</td>
                      {canManage && (
                        <td className="py-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                            onClick={() => {
                              if (confirm('이 권한을 철회하시겠습니까?')) {
                                revokeCap.mutate(uc.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 위임 섹션 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowRight className="h-4 w-4" />
              위임
            </CardTitle>
            {canManage && (
              <Button size="sm" variant="outline" onClick={() => setShowCreateDelegation(true)}>
                <Plus className="h-3 w-3 mr-1" /> 위임 생성
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {(!delegations.data || (delegations.data as DelegationDto[]).length === 0) ? (
            <p className="text-sm text-gray-500 text-center py-4">위임 내역이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 font-medium">위임자</th>
                    <th className="pb-2 font-medium">수임자</th>
                    <th className="pb-2 font-medium">권한</th>
                    <th className="pb-2 font-medium">범위</th>
                    <th className="pb-2 font-medium">기간</th>
                    <th className="pb-2 font-medium">상태</th>
                    {canManage && <th className="pb-2 font-medium w-24"></th>}
                  </tr>
                </thead>
                <tbody>
                  {(delegations.data as DelegationDto[]).map(d => (
                    <tr key={d.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2">{d.delegatorName || d.delegatorId}</td>
                      <td className="py-2">{d.delegateeName || d.delegateeId}</td>
                      <td className="py-2">
                        <div className="flex items-center gap-1">
                          <Badge variant="outline">{d.capabilityName || d.capabilityCode}</Badge>
                          {/* 재위임 배지 */}
                          {d.parentDelegationId && (
                            <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">
                              <CornerDownRight className="h-2.5 w-2.5 mr-0.5" />
                              재위임
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-2 text-gray-500 text-xs">
                        {d.scopeType}{d.scopePartName ? ` (${d.scopePartName})` : ''}
                        {d.scopeType === 'FUNCTION' && d.scopeFunctionDescription && (
                          <p className="text-[10px] text-gray-400 truncate max-w-[120px]" title={d.scopeFunctionDescription}>
                            {d.scopeFunctionDescription}
                          </p>
                        )}
                      </td>
                      <td className="py-2 text-gray-500 text-xs">
                        {d.durationType === 'PERMANENT' ? '영구' : `${d.startAt?.slice(0, 10)} ~ ${d.endAt?.slice(0, 10) || ''}`}
                        {/* 만료 임박 표시 */}
                        {d.status === 'ACTIVE' && d.endAt && (() => {
                          const days = getDaysUntilExpiry(d.endAt);
                          if (days >= 0 && days <= 7) {
                            return (
                              <Badge variant="outline" className="ml-1 text-[10px] bg-orange-50 text-orange-700 border-orange-200">
                                D-{days}
                              </Badge>
                            );
                          }
                          return null;
                        })()}
                      </td>
                      <td className="py-2"><DelegationStatusBadge status={d.status} /></td>
                      {canManage && (
                        <td className="py-2 flex gap-1">
                          {d.status === 'PENDING' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-green-600 hover:text-green-800"
                              onClick={() => approveDelegation.mutate(d.id)}
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {(d.status === 'ACTIVE' || d.status === 'PENDING') && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-red-500 hover:text-red-700"
                              onClick={() => setShowRevokeDialog({
                                delegationId: d.id,
                                hasChildren: hasChildDelegations(d.id),
                              })}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 역할 부여 다이얼로그 - Preset 미리보기 + SoD 검증 */}
      <Dialog open={showGrantRole} onOpenChange={setShowGrantRole}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>역할 부여</DialogTitle>
            <DialogDescription>이 프로젝트의 사용자에게 역할을 배정합니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium">사용자</label>
              <Select value={grantRoleForm.userId} onValueChange={v => setGrantRoleForm(f => ({ ...f, userId: v }))}>
                <SelectTrigger><SelectValue placeholder="사용자 선택..." /></SelectTrigger>
                <SelectContent>
                  {userList.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.name || u.email || u.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">역할</label>
              <Select value={grantRoleForm.roleId} onValueChange={v => setGrantRoleForm(f => ({ ...f, roleId: v }))}>
                <SelectTrigger><SelectValue placeholder="역할 선택..." /></SelectTrigger>
                <SelectContent>
                  {(roles.data as RoleDto[] || []).map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name} ({r.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Preset Capability 미리보기 */}
            {presetCapabilities.length > 0 && (
              <div className="border rounded-lg p-3 bg-blue-50/50">
                <h4 className="text-xs font-medium text-blue-700 mb-2 flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  포함 Capability ({presetCapabilities.length}개)
                </h4>
                <div className="flex flex-wrap gap-1">
                  {presetCapabilities.map(cap => (
                    <Badge key={cap.id} variant="outline" className="text-[10px] bg-white">
                      {cap.name} ({cap.code})
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">사유 (선택사항)</label>
              <Input
                value={grantRoleForm.reason}
                onChange={e => setGrantRoleForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="부여 사유..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGrantRole(false)}>취소</Button>
            <Button onClick={handleGrantRole} disabled={grantRole.isPending}>
              {grantRole.isPending ? '부여 중...' : '역할 부여'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SoD 결과 다이얼로그 (차단 / 경고) */}
      <Dialog open={!!sodResultDialog} onOpenChange={() => setSodResultDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {sodResultDialog?.type === 'blocked' ? (
                <>
                  <Ban className="h-5 w-5 text-red-600" />
                  <span className="text-red-600">SoD 차단</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <span className="text-yellow-600">SoD 경고</span>
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {sodResultDialog?.type === 'blocked'
                ? '직무 분리(SoD) 규칙에 의해 이 역할 부여가 차단되었습니다.'
                : '역할이 부여되었으나 직무 분리(SoD) 경고가 있습니다.'}
            </DialogDescription>
          </DialogHeader>
          <div className={`space-y-2 p-3 rounded-lg ${
            sodResultDialog?.type === 'blocked' ? 'bg-red-50' : 'bg-yellow-50'
          }`}>
            {sodResultDialog?.warnings.map((w, idx) => (
              <div key={idx} className="text-sm">
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={w.severity} />
                  <span className="font-medium">{w.capabilityACode} / {w.capabilityBCode}</span>
                  {w.blocking && <Badge variant="destructive" className="text-[10px]">차단</Badge>}
                </div>
                <p className="text-xs text-gray-600 mt-1">{w.description}</p>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setSodResultDialog(null)}>확인</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 권한 부여 다이얼로그 */}
      <Dialog open={showGrantCap} onOpenChange={setShowGrantCap}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>권한 부여</DialogTitle>
            <DialogDescription>사용자에게 직접 권한을 부여합니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium">사용자</label>
              <Select value={grantCapForm.userId} onValueChange={v => setGrantCapForm(f => ({ ...f, userId: v }))}>
                <SelectTrigger><SelectValue placeholder="사용자 선택..." /></SelectTrigger>
                <SelectContent>
                  {userList.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.name || u.email || u.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">권한</label>
              <Select value={grantCapForm.capabilityId} onValueChange={v => setGrantCapForm(f => ({ ...f, capabilityId: v }))}>
                <SelectTrigger><SelectValue placeholder="권한 선택..." /></SelectTrigger>
                <SelectContent>
                  {(capabilities.data as CapabilityDto[] || []).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">사유 (선택사항)</label>
              <Input
                value={grantCapForm.reason}
                onChange={e => setGrantCapForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="부여 사유..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGrantCap(false)}>취소</Button>
            <Button onClick={handleGrantCap} disabled={grantCap.isPending}>
              {grantCap.isPending ? '부여 중...' : '권한 부여'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 위임 생성 다이얼로그 - 재위임 + FUNCTION 스코프 */}
      <Dialog open={showCreateDelegation} onOpenChange={setShowCreateDelegation}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>위임 생성</DialogTitle>
            <DialogDescription>다른 사용자에게 권한을 위임합니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
            {/* 재위임 체크박스 */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isRedelegation"
                checked={delegationForm.isRedelegation}
                onChange={e => setDelegationForm(f => ({ ...f, isRedelegation: e.target.checked, parentDelegationId: '' }))}
                className="rounded border-gray-300"
              />
              <label htmlFor="isRedelegation" className="text-sm font-medium flex items-center gap-1">
                <CornerDownRight className="h-3.5 w-3.5 text-purple-600" />
                재위임
              </label>
            </div>

            {/* 재위임: 원본 위임 선택 */}
            {delegationForm.isRedelegation && (
              <div>
                <label className="text-sm font-medium">원본 위임</label>
                <Select value={delegationForm.parentDelegationId} onValueChange={v => setDelegationForm(f => ({ ...f, parentDelegationId: v }))}>
                  <SelectTrigger><SelectValue placeholder="원본 위임 선택..." /></SelectTrigger>
                  <SelectContent>
                    {activeDelegations.map(d => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.capabilityName || d.capabilityCode} ({d.delegatorName} → {d.delegateeName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">수임자</label>
              <Select value={delegationForm.delegateeId} onValueChange={v => setDelegationForm(f => ({ ...f, delegateeId: v }))}>
                <SelectTrigger><SelectValue placeholder="사용자 선택..." /></SelectTrigger>
                <SelectContent>
                  {userList.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.name || u.email || u.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">권한</label>
              <Select value={delegationForm.capabilityId} onValueChange={v => setDelegationForm(f => ({ ...f, capabilityId: v }))}>
                <SelectTrigger><SelectValue placeholder="권한 선택..." /></SelectTrigger>
                <SelectContent>
                  {(capabilities.data as CapabilityDto[] || []).filter(c => c.isDelegatable).map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">범위</label>
              <Select
                value={delegationForm.scopeType}
                onValueChange={v => {
                  // FUNCTION 선택 시 기간을 TEMPORARY로 강제
                  if (v === 'FUNCTION') {
                    setDelegationForm(f => ({ ...f, scopeType: v, durationType: 'TEMPORARY' }));
                  } else {
                    setDelegationForm(f => ({ ...f, scopeType: v }));
                  }
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROJECT">프로젝트</SelectItem>
                  <SelectItem value="PART">파트</SelectItem>
                  <SelectItem value="FUNCTION">기능</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* FUNCTION 스코프: 기능 설명 + 제약 안내 */}
            {delegationForm.scopeType === 'FUNCTION' && (
              <>
                <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                  <p className="font-medium">FUNCTION 스코프 제약:</p>
                  <p>- 기간은 반드시 임시(TEMPORARY)여야 합니다.</p>
                  <p>- 최대 90일까지 위임 가능합니다.</p>
                </div>
                <div>
                  <label className="text-sm font-medium">기능 설명</label>
                  <Textarea
                    value={delegationForm.scopeFunctionDescription}
                    onChange={e => setDelegationForm(f => ({ ...f, scopeFunctionDescription: e.target.value }))}
                    placeholder="위임할 기능의 범위를 설명하세요..."
                    rows={2}
                  />
                </div>
              </>
            )}

            <div>
              <label className="text-sm font-medium">기간</label>
              <Select
                value={delegationForm.durationType}
                onValueChange={v => setDelegationForm(f => ({ ...f, durationType: v }))}
                disabled={delegationForm.scopeType === 'FUNCTION'}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERMANENT">영구</SelectItem>
                  <SelectItem value="TEMPORARY">임시</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {delegationForm.durationType === 'TEMPORARY' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">시작일</label>
                  <Input
                    type="date"
                    value={delegationForm.startAt}
                    onChange={e => setDelegationForm(f => ({ ...f, startAt: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">종료일</label>
                  <Input
                    type="date"
                    value={delegationForm.endAt}
                    onChange={e => setDelegationForm(f => ({ ...f, endAt: e.target.value }))}
                    max={delegationForm.scopeType === 'FUNCTION' ? maxEndDate : undefined}
                  />
                  {delegationForm.scopeType === 'FUNCTION' && maxEndDate && (
                    <p className="text-[10px] text-amber-600 mt-0.5">최대: {maxEndDate}</p>
                  )}
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium">승인자</label>
              <Select value={delegationForm.approverId} onValueChange={v => setDelegationForm(f => ({ ...f, approverId: v }))}>
                <SelectTrigger><SelectValue placeholder="승인자 선택..." /></SelectTrigger>
                <SelectContent>
                  {userList.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>{u.name || u.email || u.id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">사유 (선택사항)</label>
              <Textarea
                value={delegationForm.reason}
                onChange={e => setDelegationForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="위임 사유..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDelegation(false)}>취소</Button>
            <Button onClick={handleCreateDelegation} disabled={createDelegation.isPending}>
              {createDelegation.isPending ? '생성 중...' : '위임 생성'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 위임 철회 다이얼로그 */}
      <Dialog open={!!showRevokeDialog} onOpenChange={() => { setShowRevokeDialog(null); setRevokeReason(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              위임 철회
            </DialogTitle>
            <DialogDescription>이 위임을 철회합니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {showRevokeDialog?.hasChildren && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                <p className="font-medium flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  하위 재위임 경고
                </p>
                <p className="text-xs mt-1">이 위임에 연결된 하위 재위임도 함께 철회됩니다.</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium">철회 사유 (선택사항)</label>
              <Textarea
                value={revokeReason}
                onChange={e => setRevokeReason(e.target.value)}
                placeholder="철회 사유를 입력하세요..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowRevokeDialog(null); setRevokeReason(''); }}>취소</Button>
            <Button variant="destructive" onClick={handleRevokeDelegation} disabled={revokeDelegation.isPending}>
              {revokeDelegation.isPending ? '철회 중...' : '위임 철회'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== Tab 3: Governance ====================

function GovernanceTab({ projectId, canAudit }: { projectId: string; canAudit: boolean }) {
  const findings = useGovernanceFindingsQuery(projectId);
  const checkRuns = useGovernanceCheckRunsQuery(projectId);
  const runCheck = useRunGovernanceCheck(projectId);

  const findingsData = (findings.data || []) as GovernanceFindingDto[];
  const checkRunsData = (checkRuns.data || []) as GovernanceCheckRunDto[];

  const latestRun = checkRunsData.length > 0 ? checkRunsData[0] : null;

  // SoD 차단 vs 경고 분리
  const { blockedFindings, warningFindings, otherFindings, allRecommendedActions } = useMemo(() => {
    const blocked: GovernanceFindingDto[] = [];
    const warning: GovernanceFindingDto[] = [];
    const other: GovernanceFindingDto[] = [];
    const actions: RecommendedActionDto[] = [];

    findingsData.forEach(f => {
      // 권장 조치 수집
      if (f.recommendedActions?.length) {
        actions.push(...f.recommendedActions);
      }

      if (f.findingType === 'SOD_VIOLATION') {
        const details = parseDetailsJson(f.detailsJson);
        if (details.is_blocking) {
          blocked.push(f);
        } else {
          warning.push(f);
        }
      } else {
        other.push(f);
      }
    });

    return { blockedFindings: blocked, warningFindings: warning, otherFindings: other, allRecommendedActions: actions };
  }, [findingsData]);

  // 기타 findings를 타입별로 그룹핑
  const groupedOtherFindings = useMemo(() => {
    const groups: Record<string, GovernanceFindingDto[]> = {};
    otherFindings.forEach(f => {
      const key = f.findingType || 'OTHER';
      if (!groups[key]) groups[key] = [];
      groups[key].push(f);
    });
    return groups;
  }, [otherFindings]);

  const findingTypeConfig: Record<string, { icon: typeof AlertTriangle; label: string; color: string }> = {
    SOD_VIOLATION: { icon: Ban, label: 'SoD 위반', color: 'text-red-600' },
    SELF_APPROVAL: { icon: AlertTriangle, label: '자기 승인', color: 'text-orange-600' },
    EXPIRING_SOON: { icon: Clock, label: '만료 예정 위임', color: 'text-yellow-600' },
    EXPIRING_DELEGATION: { icon: Clock, label: '만료 예정 위임', color: 'text-yellow-600' },
    EXPIRED: { icon: XCircle, label: '만료된 위임', color: 'text-gray-600' },
    EXPIRED_DELEGATION: { icon: XCircle, label: '만료된 위임', color: 'text-gray-600' },
    DUPLICATE_CAP: { icon: Info, label: '중복 권한', color: 'text-blue-600' },
    DUPLICATE_CAPABILITY: { icon: Info, label: '중복 권한', color: 'text-blue-600' },
    POLICY_VIOLATION: { icon: Shield, label: '정책 위반', color: 'text-purple-600' },
  };

  /** Finding 상세 정보를 detailsJson에서 추출 */
  function renderFindingDetail(finding: GovernanceFindingDto) {
    const details = parseDetailsJson(finding.detailsJson);

    return (
      <div className="bg-gray-50 rounded p-3 text-sm space-y-1">
        <div className="flex items-center justify-between">
          <span>{finding.message}</span>
          <SeverityBadge severity={finding.severity} />
        </div>
        {/* 사용자 이름 표시 */}
        {finding.userId && (
          <p className="text-xs text-gray-500">
            사용자: {finding.userName || finding.userId}
          </p>
        )}
        {/* 타입별 추가 상세 */}
        {finding.findingType === 'SOD_VIOLATION' && details.capability_a_code && (
          <p className="text-xs text-red-600">
            충돌 권한: {details.capability_a_code} ↔ {details.capability_b_code}
          </p>
        )}
        {finding.findingType === 'DUPLICATE_CAPABILITY' && details.duplicate_count && (
          <p className="text-xs text-blue-600">
            중복 경로 수: {details.duplicate_count}
          </p>
        )}
        {finding.findingType === 'SELF_APPROVAL' && details.delegation_id && (
          <p className="text-xs text-orange-600">
            관련 위임 ID: {details.delegation_id}
          </p>
        )}
      </div>
    );
  }

  /** actionType에 따른 아이콘 */
  function getActionIcon(actionType: string) {
    switch (actionType) {
      case 'REVOKE_DELEGATION': return <XCircle className="h-3.5 w-3.5 text-red-500" />;
      case 'REVOKE_ROLE': return <Trash2 className="h-3.5 w-3.5 text-red-500" />;
      case 'REVIEW': return <Eye className="h-3.5 w-3.5 text-blue-500" />;
      case 'REASSIGN': return <ArrowRight className="h-3.5 w-3.5 text-purple-500" />;
      default: return <Zap className="h-3.5 w-3.5 text-gray-500" />;
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                거버넌스 감사
              </CardTitle>
              {latestRun && (
                <p className="text-xs text-gray-500 mt-1">
                  마지막 검사: {new Date(latestRun.checkedAt).toLocaleString('ko-KR')}
                </p>
              )}
            </div>
            {canAudit && (
              <Button
                size="sm"
                onClick={() => runCheck.mutate()}
                disabled={runCheck.isPending}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${runCheck.isPending ? 'animate-spin' : ''}`} />
                {runCheck.isPending ? '실행 중...' : '검사 실행'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {findings.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : findingsData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-300" />
              <p className="font-medium text-green-600">이상 없음</p>
              <p className="text-sm mt-1">거버넌스 위반 사항이 없습니다.</p>
              {!latestRun && <p className="text-xs mt-2">거버넌스 검사를 실행하여 이슈를 스캔하세요.</p>}
            </div>
          ) : (
            <div className="space-y-4">
              {/* SoD 차단 (빨간 카드) */}
              {blockedFindings.length > 0 && (
                <div className="border-2 border-red-300 bg-red-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Ban className="h-5 w-5 text-red-600" />
                    <span className="font-semibold text-red-700">
                      SoD 차단 ({blockedFindings.length}건)
                    </span>
                  </div>
                  <p className="text-xs text-red-600 mb-3">이 위임/역할 부여가 차단되었습니다.</p>
                  <div className="space-y-2">
                    {blockedFindings.map(f => renderFindingDetail(f))}
                  </div>
                </div>
              )}

              {/* SoD 경고 (노란 카드) */}
              {warningFindings.length > 0 && (
                <div className="border-2 border-yellow-300 bg-yellow-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <span className="font-semibold text-yellow-700">
                      SoD 경고 ({warningFindings.length}건)
                    </span>
                  </div>
                  <div className="space-y-2">
                    {warningFindings.map(f => renderFindingDetail(f))}
                  </div>
                </div>
              )}

              {/* 기타 finding 타입별 그룹 */}
              {Object.entries(groupedOtherFindings).map(([type, items]) => {
                const config = findingTypeConfig[type] || { icon: AlertTriangle, label: type, color: 'text-gray-600' };
                const Icon = config.icon;
                return (
                  <div key={type} className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`h-4 w-4 ${config.color}`} />
                      <span className={`font-medium text-sm ${config.color}`}>
                        {config.label} ({items.length})
                      </span>
                    </div>
                    <div className="space-y-2">
                      {items.map(finding => renderFindingDetail(finding))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 권장 조치 패널 */}
      {allRecommendedActions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4" />
              권장 조치 ({allRecommendedActions.length}건)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {allRecommendedActions.map((action, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-shrink-0 mt-0.5">{getActionIcon(action.actionType)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <PriorityBadge priority={action.priority} />
                      <span className="text-xs text-gray-500 font-mono">{action.actionType}</span>
                    </div>
                    <p className="text-sm">{action.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 검사 실행 이력 */}
      {checkRunsData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              검사 실행 이력
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {checkRunsData.map(run => {
                let summary: any = {};
                try { summary = JSON.parse(run.summaryJson || '{}'); } catch { /* empty */ }
                return (
                  <div key={run.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                    <div>
                      <span className="font-medium">{new Date(run.checkedAt).toLocaleString('ko-KR')}</span>
                      <span className="text-gray-500 ml-2">{run.checkedBy}</span>
                    </div>
                    <div className="flex gap-2 text-xs">
                      {summary.totalFindings !== undefined && (
                        <Badge variant={summary.totalFindings > 0 ? 'destructive' : 'secondary'}>
                          {summary.totalFindings}건
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ==================== Main Page Component ====================

export default function RolePermissionPage({ userRole }: Props) {
  const { currentProject } = useProject();
  const projectId = currentProject?.id;
  const { hasCapability } = useCapabilities(userRole?.toUpperCase() || '');

  const [activeTab, setActiveTab] = useState<TabId>('delegation-map');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const canManage = hasCapability('manage_roles');
  // audit_governance 또는 manage_roles 둘 다 감사 실행 가능
  const canAudit = hasCapability('manage_roles') || hasCapability('audit_governance');
  const canView = hasCapability('view_roles') || canManage || canAudit;

  // effectiveCapabilities 포함하여 위임 맵 조회
  const delegationMap = useDelegationMapQuery(projectId, true);
  const governanceFindings = useGovernanceFindingsQuery(projectId);

  if (!projectId) {
    return <ProjectNotSelectedMessage />;
  }

  // Preset 기반 탭 가시성
  const tabs = [
    { id: 'delegation-map' as TabId, label: '위임 맵', icon: GitBranch, visible: true },
    { id: 'role-capability' as TabId, label: '역할 / 권한', icon: ShieldCheck, visible: canView },
    { id: 'governance' as TabId, label: '거버넌스 감사', icon: Shield, visible: canView },
  ];

  const visibleTabs = tabs.filter(t => t.visible);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5" />
          역할 및 권한 관리
        </h1>
      </div>

      {/* Tab Navigation */}
      <div className="border-b">
        <nav className="flex gap-0" aria-label="Tabs">
          {visibleTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'delegation-map' && (
        <DelegationMapTab
          projectId={projectId}
          delegationMap={(delegationMap.data || []) as DelegationMapNodeDto[]}
          isLoading={delegationMap.isLoading}
          selectedUserId={selectedUserId}
          setSelectedUserId={setSelectedUserId}
          findings={(governanceFindings.data || []) as GovernanceFindingDto[]}
          canManage={canManage}
        />
      )}
      {activeTab === 'role-capability' && canView && (
        <RoleCapabilityTab
          projectId={projectId}
          canManage={canManage}
        />
      )}
      {activeTab === 'governance' && canView && (
        <GovernanceTab
          projectId={projectId}
          canAudit={canAudit}
        />
      )}
    </div>
  );
}
