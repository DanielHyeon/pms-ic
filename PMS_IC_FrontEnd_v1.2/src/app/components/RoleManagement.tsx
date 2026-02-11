import { useState, useEffect } from 'react';
import { Building2, FolderKanban, UserCog } from 'lucide-react';
import { UserRole } from '../App';
import {
  UserManagementTab,
  SystemPermissionsTab,
  ProjectPermissionsTab,
} from './roles';
import type { TabType } from './roles';

/**
 * RoleManagement - Main coordinator component for role and permission management
 *
 * This component provides three tabs:
 * 1. User Management (Admin only) - Manage system roles and PM assignments
 * 2. System Permissions (Admin only) - View/edit permission matrix
 * 3. Project Permissions - Manage project member roles
 *
 * Implements RBAC-based access control with Separation of Duties (SoD) principles
 */
export default function RoleManagement({ userRole }: { userRole: UserRole }) {
  const [activeTab, setActiveTab] = useState<TabType>('users');
  // 사용자 관리 / 시스템 권한 탭: admin 전용
  const isAdmin = userRole === 'admin';
  // 프로젝트 권한 관리: admin, pmo_head, pm
  const canManageProjectRoles = ['admin', 'pmo_head', 'pm'].includes(userRole);

  // admin이 아니면 프로젝트 탭만 표시
  useEffect(() => {
    if (!isAdmin) {
      setActiveTab('project');
    }
  }, [isAdmin]);

  return (
    <div className="p-6">
      <Header />
      <TabNavigation
        activeTab={activeTab}
        isAdmin={isAdmin}
        onTabChange={setActiveTab}
      />
      <TabContent
        activeTab={activeTab}
        isAdmin={isAdmin}
        userRole={userRole}
        canManageProjectRoles={canManageProjectRoles}
      />
    </div>
  );
}

// Header component
function Header() {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-semibold text-gray-900">역할 및 권한 관리</h2>
      <p className="text-sm text-gray-500 mt-1">
        RBAC 기반 접근 제어 및 직무 분리(SoD) 원칙 적용
      </p>
    </div>
  );
}

// Tab navigation component
interface TabNavigationProps {
  activeTab: TabType;
  isAdmin: boolean;
  onTabChange: (tab: TabType) => void;
}

function TabNavigation({ activeTab, isAdmin, onTabChange }: TabNavigationProps) {
  const getTabClass = (tab: TabType) =>
    `flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
      activeTab === tab
        ? 'border-blue-500 text-blue-600'
        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
    }`;

  return (
    <div className="mb-6 border-b border-gray-200">
      <nav className="-mb-px flex gap-6">
        {isAdmin && (
          <>
            <button
              type="button"
              onClick={() => onTabChange('users')}
              className={getTabClass('users')}
            >
              <UserCog size={18} />
              사용자 관리
            </button>
            <button
              type="button"
              onClick={() => onTabChange('system')}
              className={getTabClass('system')}
            >
              <Building2 size={18} />
              시스템 권한
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => onTabChange('project')}
          className={getTabClass('project')}
        >
          <FolderKanban size={18} />
          프로젝트 권한
        </button>
      </nav>
    </div>
  );
}

// Tab content renderer
interface TabContentProps {
  activeTab: TabType;
  isAdmin: boolean;
  userRole: UserRole;
  canManageProjectRoles: boolean;
}

function TabContent({ activeTab, isAdmin, userRole, canManageProjectRoles }: TabContentProps) {
  if (activeTab === 'users' && isAdmin) {
    return <UserManagementTab userRole={userRole} />;
  }

  if (activeTab === 'system' && isAdmin) {
    return <SystemPermissionsTab userRole={userRole} />;
  }

  return <ProjectPermissionsTab userRole={userRole} canManage={canManageProjectRoles} />;
}
