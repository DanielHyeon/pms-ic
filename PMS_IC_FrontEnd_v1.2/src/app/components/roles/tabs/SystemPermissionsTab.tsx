import { useState } from 'react';
import { Shield, User, Lock, Check, X } from 'lucide-react';
import { UserRole } from '../../../App';
import { usePermissions, useUpdateRolePermission } from '../../../../hooks/api/useRoles';
import { MessageAlert, LoadingSpinner } from '../shared';
import { ROLES } from '../constants';
import type { Message, Permission } from '../types';

interface SystemPermissionsTabProps {
  userRole: UserRole;
}

/**
 * System permissions tab showing role cards and permission matrix
 * Admin users can toggle permissions for each role
 */
export function SystemPermissionsTab({ userRole }: SystemPermissionsTabProps) {
  const [selectedRole, setSelectedRole] = useState<string>(userRole);
  const [message, setMessage] = useState<Message | null>(null);
  const canManageRoles = userRole === 'admin';

  // TanStack Query hooks
  const { data: permissions = [], isLoading: loading } = usePermissions();
  const updatePermissionMutation = useUpdateRolePermission();

  const saving = updatePermissionMutation.isPending;

  const handlePermissionToggle = async (permissionId: string, currentValue: boolean) => {
    if (!canManageRoles) {
      setMessage({
        type: 'error',
        text: '권한이 없습니다. 시스템 관리자만 권한을 수정할 수 있습니다.',
      });
      return;
    }

    try {
      await updatePermissionMutation.mutateAsync({
        role: selectedRole,
        permissionId,
        value: !currentValue,
      });

      setMessage({ type: 'success', text: '권한이 업데이트되었습니다' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Failed to update permission:', error);
      setMessage({ type: 'error', text: '권한 업데이트에 실패했습니다' });
    }
  };

  const categories = Array.from(new Set(permissions.map((p) => p.category)));

  if (loading) {
    return <LoadingSpinner message="권한 데이터를 불러오는 중..." />;
  }

  return (
    <div>
      {/* Message Alert */}
      {message && (
        <div className="mb-6">
          <MessageAlert message={message} />
        </div>
      )}

      {/* Admin Notice */}
      {canManageRoles && <AdminPermissionNotice />}

      {/* Security Notice */}
      <SecurityModelNotice />

      {/* Role Cards */}
      <RoleCardGrid selectedRole={selectedRole} onSelectRole={setSelectedRole} />

      {/* Permission Matrix */}
      <PermissionMatrix
        permissions={permissions}
        categories={categories}
        selectedRole={selectedRole}
        canManageRoles={canManageRoles}
        saving={saving}
        onPermissionToggle={handlePermissionToggle}
      />

      {/* SoD Principles */}
      <SoDPrinciples />
    </div>
  );
}

// Sub-components

function AdminPermissionNotice() {
  return (
    <div className="mb-6 bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <Shield className="text-amber-600 mt-0.5" size={24} />
        <div>
          <h3 className="font-semibold text-gray-900">시스템 관리자 권한</h3>
          <p className="text-sm text-gray-700 mt-1">
            권한 매트릭스에서 각 권한을 클릭하여 역할별 접근 권한을 허용하거나 거부할 수
            있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}

function SecurityModelNotice() {
  return (
    <div className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <Shield className="text-blue-600 mt-0.5" size={24} />
        <div>
          <h3 className="font-semibold text-gray-900">제로 트러스트 보안 모델 적용</h3>
          <p className="text-sm text-gray-700 mt-1">
            모든 사용자와 서비스는 명시적으로 허용된 권한만 가지며, 모든 접근 요청은 MFA
            인증 및 감사 로그에 기록됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}

interface RoleCardGridProps {
  selectedRole: string;
  onSelectRole: (role: string) => void;
}

function RoleCardGrid({ selectedRole, onSelectRole }: RoleCardGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {ROLES.map((role) => (
        <button
          type="button"
          key={role.id}
          onClick={() => onSelectRole(role.id)}
          className={`text-left p-4 rounded-xl border-2 transition-all ${
            selectedRole === role.id
              ? 'border-blue-500 bg-blue-50 shadow-md'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <div className="flex items-start justify-between mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white">
              <User size={20} />
            </div>
            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
              {role.userCount}명
            </span>
          </div>
          <h3 className="font-semibold text-gray-900">{role.name}</h3>
          <p className="text-xs text-gray-500 mt-1">{role.nameEn}</p>
          <p className="text-xs text-gray-600 mt-2 line-clamp-2">{role.description}</p>
        </button>
      ))}
    </div>
  );
}

interface PermissionMatrixProps {
  permissions: Permission[];
  categories: string[];
  selectedRole: string;
  canManageRoles: boolean;
  saving: boolean;
  onPermissionToggle: (permissionId: string, currentValue: boolean) => void;
}

function PermissionMatrix({
  permissions,
  categories,
  selectedRole,
  canManageRoles,
  saving,
  onPermissionToggle,
}: PermissionMatrixProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center gap-3">
          <Lock className="text-blue-600" size={24} />
          <div>
            <h3 className="font-semibold text-gray-900">권한 매트릭스</h3>
            <p className="text-sm text-gray-500">
              선택된 역할:{' '}
              <span className="font-medium text-blue-600">
                {ROLES.find((r) => r.id === selectedRole)?.name}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                카테고리
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                권한
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                접근 권한
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {categories.map((category) => {
              const categoryPerms = permissions.filter((p) => p.category === category);
              return categoryPerms.map((permission, idx) => (
                <PermissionRow
                  key={permission.id}
                  permission={permission}
                  category={category}
                  showCategory={idx === 0}
                  categoryRowSpan={categoryPerms.length}
                  selectedRole={selectedRole}
                  canManageRoles={canManageRoles}
                  saving={saving}
                  onToggle={onPermissionToggle}
                />
              ));
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface PermissionRowProps {
  permission: Permission;
  category: string;
  showCategory: boolean;
  categoryRowSpan: number;
  selectedRole: string;
  canManageRoles: boolean;
  saving: boolean;
  onToggle: (permissionId: string, currentValue: boolean) => void;
}

function PermissionRow({
  permission,
  category,
  showCategory,
  categoryRowSpan,
  selectedRole,
  canManageRoles,
  saving,
  onToggle,
}: PermissionRowProps) {
  const hasPermission = permission.roles[selectedRole as keyof typeof permission.roles];

  return (
    <tr className={hasPermission ? 'bg-green-50' : ''}>
      {showCategory && (
        <td
          rowSpan={categoryRowSpan}
          className="px-6 py-4 align-top font-medium text-gray-900 bg-gray-50"
        >
          {category}
        </td>
      )}
      <td className="px-6 py-4 text-sm text-gray-700">{permission.name}</td>
      <td className="px-6 py-4 text-center">
        {canManageRoles ? (
          <button
            type="button"
            onClick={() => onToggle(permission.id, hasPermission)}
            disabled={saving}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full transition-all ${
              hasPermission
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-red-100 text-red-700 hover:bg-red-200'
            } ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {hasPermission ? (
              <>
                <Check size={16} />
                <span className="text-xs font-medium">허용</span>
              </>
            ) : (
              <>
                <X size={16} />
                <span className="text-xs font-medium">거부</span>
              </>
            )}
          </button>
        ) : (
          <div
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full ${
              hasPermission
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {hasPermission ? (
              <>
                <Check size={16} />
                <span className="text-xs font-medium">허용</span>
              </>
            ) : (
              <>
                <X size={16} />
                <span className="text-xs font-medium">거부</span>
              </>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

function SoDPrinciples() {
  return (
    <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-6">
      <h3 className="font-semibold text-gray-900 mb-3">직무 분리(SoD) 원칙</h3>
      <div className="space-y-2 text-sm text-gray-700">
        <div className="flex items-start gap-2">
          <span className="text-amber-600 mt-0.5">!</span>
          <p>
            <span className="font-medium">개발과 운영의 분리:</span> 개발팀은 프로덕션
            환경에 직접 배포할 수 없으며, CI/CD 파이프라인을 통한 자동화된 배포만
            가능합니다.
          </p>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-amber-600 mt-0.5">!</span>
          <p>
            <span className="font-medium">개발과 테스트의 분리:</span> 개발팀은 단위
            테스트를 수행하지만, 통합/시스템 테스트는 독립된 QA팀이 수행합니다.
          </p>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-amber-600 mt-0.5">!</span>
          <p>
            <span className="font-medium">시스템 관리와 감사의 분리:</span> 시스템
            관리자는 감사 로그를 수정하거나 삭제할 수 없으며, 조회는 PMO 총괄과 외부
            감리만 가능합니다.
          </p>
        </div>
      </div>
    </div>
  );
}
