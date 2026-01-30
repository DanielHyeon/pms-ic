import { useState } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { ProjectRole, PROJECT_ROLE_LABELS } from '../../../types/auth';
import type { ProjectMember } from './types';

export interface MemberRowProps {
  member: ProjectMember;
  canManage: boolean;
  getRoleIcon: (role: ProjectRole) => React.ReactNode;
  getRoleColor: (role: ProjectRole) => string;
  onChangeRole: (memberId: string, role: ProjectRole) => void;
  onRemove: (memberId: string) => void;
}

/**
 * A single row displaying a project member with role badge and management actions
 */
export function MemberRow({
  member,
  canManage,
  getRoleIcon,
  getRoleColor,
  onChangeRole,
  onRemove,
}: MemberRowProps) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50">
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
      {canManage && (
        <div className="flex items-center gap-1">
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
  );
}
