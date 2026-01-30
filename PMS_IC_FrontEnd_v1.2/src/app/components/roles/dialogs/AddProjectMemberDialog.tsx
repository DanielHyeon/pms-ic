import { useState } from 'react';
import { Check } from 'lucide-react';
import { ProjectRole } from '../../../../types/auth';
import type { ProjectMember } from '../types';

// Mock available users for adding to project
const AVAILABLE_USERS = [
  { id: 'user-010', name: '강민지', email: 'kang@example.com' },
  { id: 'user-011', name: '윤서영', email: 'yoon@example.com' },
  { id: 'user-012', name: '장현준', email: 'jang@example.com' },
  { id: 'user-013', name: '송지훈', email: 'song@example.com' },
  { id: 'user-014', name: '임수민', email: 'lim@example.com' },
];

export interface AddProjectMemberDialogProps {
  projectId: string;
  existingMembers: ProjectMember[];
  onClose: () => void;
  onAdd: (userId: string, userName: string, role: ProjectRole) => void;
}

/**
 * Dialog for adding a new member to a project with role selection
 */
export function AddProjectMemberDialog({
  projectId,
  existingMembers,
  onClose,
  onAdd,
}: AddProjectMemberDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<ProjectRole>('member');
  const [searchTerm, setSearchTerm] = useState('');

  const existingUserIds = new Set(existingMembers.map((m) => m.userId));
  const availableUsers = AVAILABLE_USERS.filter((u) => !existingUserIds.has(u.id));

  const filteredUsers = availableUsers.filter(
    (u) => u.name.includes(searchTerm) || u.email.includes(searchTerm)
  );

  const handleAdd = () => {
    const user = availableUsers.find((u) => u.id === selectedUserId);
    if (user) {
      onAdd(user.id, user.name, selectedRole);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">프로젝트 멤버 추가</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              사용자 검색
            </label>
            <input
              type="text"
              placeholder="이름 또는 이메일로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
            {filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                추가 가능한 사용자가 없습니다
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                    selectedUserId === user.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedUserId(user.id)}
                >
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
                    {user.name[0]}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                  </div>
                  {selectedUserId === user.id && (
                    <Check className="text-blue-600" size={16} />
                  )}
                </div>
              ))
            )}
          </div>

          <div>
            <label
              htmlFor="member-role-select"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              역할
            </label>
            <select
              id="member-role-select"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as ProjectRole)}
              aria-label="멤버 역할 선택"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="member">구성원</option>
              <option value="part_leader">파트장</option>
              <option value="education_mgr">교육 담당자</option>
              <option value="qa_lead">QA 리드</option>
              <option value="ba">비즈니스 분석가</option>
            </select>
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
