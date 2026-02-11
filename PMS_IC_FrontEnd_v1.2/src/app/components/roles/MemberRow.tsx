import { useState } from 'react';
import {
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Shield,
  Users,
  Zap,
  CornerDownRight,
  ShieldCheck,
  Timer,
  Loader2,
} from 'lucide-react';
import { ProjectRole, PROJECT_ROLE_LABELS } from '../../../types/auth';
import {
  useUserAuthorityQuery,
  type UserAuthorityDto,
} from '../../../hooks/api/useAuthority';
import type { ProjectMember } from './types';

export interface MemberRowProps {
  member: ProjectMember;
  canManage: boolean;
  projectId?: string; // 프로젝트 ID — 있으면 권한 상세 패널 활성화
  getRoleIcon: (role: ProjectRole) => React.ReactNode;
  getRoleColor: (role: ProjectRole) => string;
  onChangeRole: (memberId: string, role: ProjectRole) => void;
  onRemove: (memberId: string) => void;
}

/**
 * 프로젝트 멤버 행 — 클릭 시 계층적 권한 구조 (User 360) 펼침
 */
export function MemberRow({
  member,
  canManage,
  projectId,
  getRoleIcon,
  getRoleColor,
  onChangeRole,
  onRemove,
}: MemberRowProps) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      {/* 멤버 기본 행 */}
      <div
        className={`flex items-center gap-4 px-6 py-4 hover:bg-gray-50 ${
          projectId ? 'cursor-pointer' : ''
        } ${expanded ? 'bg-blue-50/50' : ''}`}
        onClick={() => {
          // projectId가 있으면 클릭으로 확장 토글
          if (projectId && !editing) setExpanded((v) => !v);
        }}
      >
        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
          {member.userName[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900">{member.userName}</div>
          <div className="text-sm text-gray-500">{member.userEmail}</div>
        </div>
        <div className="flex items-center gap-2">
          {member.partName && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {member.partName}
            </span>
          )}
          {editing ? (
            <select
              value={member.role}
              onChange={(e) => {
                onChangeRole(member.id, e.target.value as ProjectRole);
                setEditing(false);
              }}
              onBlur={() => setEditing(false)}
              onClick={(e) => e.stopPropagation()}
              autoFocus
              aria-label={`${member.userName} 역할 변경`}
              className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="owner">프로젝트 소유자</option>
              <option value="pm">프로젝트 관리자</option>
              <option value="part_leader">파트장</option>
              <option value="education_mgr">교육 담당자</option>
              <option value="qa_lead">QA 리드</option>
              <option value="ba">비즈니스 분석가</option>
              <option value="member">구성원</option>
            </select>
          ) : (
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}
            >
              {getRoleIcon(member.role)}
              {PROJECT_ROLE_LABELS[member.role]}
            </span>
          )}
        </div>
        {/* 확장/축소 아이콘 */}
        {projectId && (
          <div className="text-gray-400">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        )}
        {canManage && (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
              title="역할 변경"
            >
              <Edit2 size={14} />
            </button>
            <button
              type="button"
              onClick={() => onRemove(member.id)}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
              title="제거"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {/* 계층적 권한 구조 패널 (확장 시) */}
      {expanded && projectId && (
        <MemberAuthorityPanel projectId={projectId} userId={member.userId} />
      )}
    </div>
  );
}

// ==================== 출처 배지 ====================

function SourceBadge({ sourceType }: { sourceType: string }) {
  const config: Record<string, { className: string; label: string }> = {
    DELEGATION: { className: 'bg-purple-100 text-purple-800', label: '위임' },
    DIRECT: { className: 'bg-blue-100 text-blue-800', label: '직접' },
    ROLE: { className: 'bg-green-100 text-green-800', label: '역할' },
    ROLE_PRESET: { className: 'bg-green-100 text-green-800', label: '역할' },
  };
  const c = config[sourceType] || { className: 'bg-gray-100 text-gray-600', label: sourceType };
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${c.className}`}>
      {c.label}
    </span>
  );
}

// ==================== 권한 상세 패널 ====================

/** 멤버의 계층적 권한 구조를 표시하는 확장 패널 */
function MemberAuthorityPanel({
  projectId,
  userId,
}: {
  projectId: string;
  userId: string;
}) {
  const { data: authority, isLoading, isError } = useUserAuthorityQuery(projectId, userId);

  if (isLoading) {
    return (
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="animate-spin" size={14} />
          권한 정보 로딩 중...
        </div>
      </div>
    );
  }

  if (isError || !authority) {
    return (
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
        <p className="text-xs text-gray-400">권한 정보를 불러올 수 없습니다.</p>
      </div>
    );
  }

  const auth = authority as UserAuthorityDto;
  const hasRoles = auth.roles && auth.roles.length > 0;
  const hasDirect = auth.directCapabilities && auth.directCapabilities.length > 0;
  const hasDelegated = auth.delegatedCapabilities && auth.delegatedCapabilities.length > 0;
  const hasEffective = auth.effectiveCapabilities && auth.effectiveCapabilities.length > 0;
  const hasParts = auth.partMemberships && auth.partMemberships.length > 0;

  // 데이터가 전혀 없으면
  if (!hasRoles && !hasDirect && !hasDelegated && !hasEffective) {
    return (
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
        <p className="text-xs text-gray-400">배정된 역할이나 권한이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="px-6 py-4 bg-gradient-to-b from-gray-50 to-white border-t border-gray-100 space-y-3">
      {/* 소속 파트 */}
      {hasParts && (
        <AuthoritySection
          icon={<Shield size={14} className="text-gray-600" />}
          title="소속"
        >
          <div className="flex flex-wrap gap-1.5">
            {auth.partMemberships.map((pm, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 text-xs text-gray-700"
              >
                {pm.partName}
                {pm.membershipType === 'PRIMARY' && (
                  <span className="text-[9px] text-blue-600 font-medium">주</span>
                )}
              </span>
            ))}
          </div>
        </AuthoritySection>
      )}

      {/* 보유 역할 (preset 권한 포함) */}
      {hasRoles && (
        <AuthoritySection
          icon={<Users size={14} className="text-blue-600" />}
          title={`보유 역할 (${auth.roles.length})`}
        >
          <div className="space-y-2">
            {auth.roles.map((role, idx) => (
              <div key={idx} className="p-2 bg-white rounded border border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-900">{role.roleName}</span>
                  <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                    {role.roleCode}
                  </span>
                </div>
                {role.grantedByName && (
                  <p className="text-[10px] text-gray-400 mt-0.5">부여: {role.grantedByName}</p>
                )}
                {/* Preset Capability 표시 */}
                {role.presetCapabilities && role.presetCapabilities.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 mt-1.5">
                    {role.presetCapabilities.map((cap, ci) => (
                      <span
                        key={ci}
                        className="inline-flex items-center px-1.5 py-0.5 rounded bg-green-50 text-green-700 text-[10px]"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </AuthoritySection>
      )}

      {/* 직접 부여 권한 */}
      {hasDirect && (
        <AuthoritySection
          icon={<Zap size={14} className="text-amber-600" />}
          title={`직접 부여 권한 (${auth.directCapabilities.length})`}
        >
          <div className="flex flex-wrap gap-1.5">
            {auth.directCapabilities.map((cap, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-xs text-blue-700"
              >
                {cap.capabilityName}
                <SourceBadge sourceType="DIRECT" />
              </span>
            ))}
          </div>
        </AuthoritySection>
      )}

      {/* 위임받은 권한 */}
      {hasDelegated && (
        <AuthoritySection
          icon={<CornerDownRight size={14} className="text-purple-600" />}
          title={`위임받은 권한 (${auth.delegatedCapabilities.length})`}
        >
          <div className="space-y-1.5">
            {auth.delegatedCapabilities.map((dc, idx) => (
              <div
                key={idx}
                className="p-2 bg-purple-50/60 rounded border border-purple-100 text-xs space-y-0.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{dc.capabilityName}</span>
                  <SourceBadge sourceType="DELEGATION" />
                </div>
                <p className="text-gray-500">
                  위임자: {dc.delegator} | 승인자: {dc.approver}
                </p>
                <div className="flex items-center gap-1 flex-wrap">
                  {dc.scope && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-white text-[10px] text-gray-600 border border-gray-200">
                      {dc.scope.type === 'PROJECT'
                        ? '프로젝트'
                        : dc.scope.type === 'PART'
                          ? dc.scope.partName || '파트'
                          : dc.scope.type === 'FUNCTION'
                            ? '기능: ' + (dc.scope.functionDescription || '')
                            : dc.scope.type}
                    </span>
                  )}
                  {dc.daysRemaining != null && dc.daysRemaining >= 0 && dc.daysRemaining <= 7 && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-orange-50 text-[10px] text-orange-700 border border-orange-200">
                      <Timer size={10} />
                      D-{dc.daysRemaining}
                    </span>
                  )}
                  {dc.parentDelegationId && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-purple-100 text-[10px] text-purple-700 border border-purple-200">
                      재위임
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </AuthoritySection>
      )}

      {/* 유효 권한 (우선순위 적용) */}
      {hasEffective && (
        <AuthoritySection
          icon={<ShieldCheck size={14} className="text-green-600" />}
          title={`유효 권한 (${auth.effectiveCapabilities.length})`}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {auth.effectiveCapabilities.map((cap, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-1.5 bg-white rounded border border-gray-100 text-xs"
              >
                <span className="font-medium text-gray-800 truncate mr-2">{cap.name}</span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-[9px] text-gray-400">P{cap.priority}</span>
                  <SourceBadge
                    sourceType={
                      cap.source === 'ROLE_PRESET'
                        ? 'ROLE'
                        : cap.source === 'DELEGATION'
                          ? 'DELEGATION'
                          : 'DIRECT'
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </AuthoritySection>
      )}
    </div>
  );
}

// ==================== 섹션 래퍼 ====================

/** 권한 섹션 래퍼 컴포넌트 */
function AuthoritySection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <span className="text-xs font-medium text-gray-700">{title}</span>
      </div>
      {children}
    </div>
  );
}
