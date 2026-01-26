import { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  Shield,
  Mail,
  Calendar,
  UserCheck,
  UserX,
  Key,
  Edit,
  Trash2,
} from 'lucide-react';
import { UserRole } from '../App';
import { formatDate } from '../../utils/formatters';
import {
  USER_ROLE_BADGES,
  USER_ROLE_LABELS,
  USER_STATUS_BADGES,
  USER_STATUS_LABELS,
  getBadgeClasses,
} from '../../utils/badges';
import { ICON_SIZES } from '../../constants/ui';
import StatisticsCard, { StatisticsCardGrid } from './common/StatisticsCard';

interface UserManagementPageProps {
  userRole: UserRole;
  projectId?: string;
}

type UserStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'LOCKED';

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  department?: string;
  lastLoginAt?: string;
  createdAt: string;
}

// Mock user data
const mockUsers: User[] = [
  {
    id: '1',
    email: 'sponsor@insure.com',
    name: '김사장',
    role: 'SPONSOR',
    status: 'ACTIVE',
    department: '경영진',
    lastLoginAt: '2026-01-26T09:00:00',
    createdAt: '2025-01-01',
  },
  {
    id: '2',
    email: 'pmo@insure.com',
    name: '박총괄',
    role: 'PMO_HEAD',
    status: 'ACTIVE',
    department: 'PMO',
    lastLoginAt: '2026-01-26T10:30:00',
    createdAt: '2025-01-01',
  },
  {
    id: '3',
    email: 'pm@insure.com',
    name: '이매니저',
    role: 'PM',
    status: 'ACTIVE',
    department: '프로젝트팀',
    lastLoginAt: '2026-01-26T11:00:00',
    createdAt: '2025-01-15',
  },
  {
    id: '4',
    email: 'dev@insure.com',
    name: '최개발',
    role: 'DEVELOPER',
    status: 'ACTIVE',
    department: '개발팀',
    lastLoginAt: '2026-01-25T18:00:00',
    createdAt: '2025-02-01',
  },
  {
    id: '5',
    email: 'qa@insure.com',
    name: '정테스트',
    role: 'QA',
    status: 'ACTIVE',
    department: 'QA팀',
    lastLoginAt: '2026-01-26T08:30:00',
    createdAt: '2025-02-01',
  },
  {
    id: '6',
    email: 'ba@insure.com',
    name: '한분석',
    role: 'BUSINESS_ANALYST',
    status: 'INACTIVE',
    department: '기획팀',
    lastLoginAt: '2026-01-20T14:00:00',
    createdAt: '2025-03-01',
  },
  {
    id: '7',
    email: 'new@insure.com',
    name: '신입사',
    role: 'DEVELOPER',
    status: 'PENDING',
    department: '개발팀',
    createdAt: '2026-01-25',
  },
];

export default function UserManagementPage({ userRole, projectId = 'proj-001' }: UserManagementPageProps) {
  const [users] = useState<User[]>(mockUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Role-based access - only admin and pmo_head can manage users
  // Note: userRole uses lowercase (admin, pmo_head) from authStore
  const canManage = userRole === 'admin' || userRole === 'pmo_head';

  // Filter users
  const filteredUsers = users.filter((user) => {
    if (filterRole && user.role !== filterRole) return false;
    if (filterStatus && user.status !== filterStatus) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !user.name.toLowerCase().includes(query) &&
        !user.email.toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    return true;
  });

  // Calculate statistics
  const stats = {
    total: users.length,
    active: users.filter((u) => u.status === 'ACTIVE').length,
    inactive: users.filter((u) => u.status === 'INACTIVE').length,
    pending: users.filter((u) => u.status === 'PENDING').length,
  };

  // Get role display name
  const getRoleLabel = (role: UserRole) => USER_ROLE_LABELS[role] || role;

  const getRoleBadge = (role: UserRole) => getBadgeClasses(USER_ROLE_BADGES, role);

  const getStatusBadge = (status: UserStatus) => getBadgeClasses(USER_STATUS_BADGES, status);

  const getStatusLabel = (status: UserStatus) => USER_STATUS_LABELS[status] || status;


  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">사용자 관리</h1>
          <p className="text-gray-500 mt-1">사용자 계정 및 권한 관리</p>
        </div>
        {canManage && (
          <button
            type="button"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={18} />
            사용자 추가
          </button>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={20} className="text-gray-600" />
              <span className="text-sm text-gray-500">전체 사용자</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">{stats.total}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck size={20} className="text-green-600" />
              <span className="text-sm text-gray-500">활성</span>
            </div>
            <span className="text-2xl font-bold text-green-600">{stats.active}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserX size={20} className="text-gray-500" />
              <span className="text-sm text-gray-500">비활성</span>
            </div>
            <span className="text-2xl font-bold text-gray-600">{stats.inactive}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key size={20} className="text-amber-600" />
              <span className="text-sm text-gray-500">승인 대기</span>
            </div>
            <span className="text-2xl font-bold text-amber-600">{stats.pending}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="이름 또는 이메일 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-gray-400" />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="역할 필터"
              aria-label="역할 필터"
            >
              <option value="">전체 역할</option>
              <option value="SPONSOR">스폰서</option>
              <option value="PMO_HEAD">PMO 총괄</option>
              <option value="PM">PM</option>
              <option value="DEVELOPER">개발자</option>
              <option value="QA">QA</option>
              <option value="BUSINESS_ANALYST">비즈니스 분석가</option>
              <option value="ADMIN">관리자</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="상태 필터"
              aria-label="상태 필터"
            >
              <option value="">전체 상태</option>
              <option value="ACTIVE">활성</option>
              <option value="INACTIVE">비활성</option>
              <option value="PENDING">대기</option>
              <option value="LOCKED">잠김</option>
            </select>
          </div>
        </div>
      </div>

      {/* User Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                사용자
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                역할
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                부서
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                상태
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                마지막 로그인
              </th>
              {canManage && (
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  작업
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={canManage ? 6 : 5} className="px-4 py-12 text-center text-gray-400">
                  <Users size={32} className="mx-auto mb-2 opacity-50" />
                  <p>표시할 사용자가 없습니다.</p>
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <Mail size={12} />
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadge(user.role)}`}>
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">{user.department || '-'}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(user.status)}`}>
                      {getStatusLabel(user.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600 flex items-center gap-1">
                      <Calendar size={12} />
                      {formatDate(user.lastLoginAt)}
                    </span>
                  </td>
                  {canManage && (
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="수정"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          type="button"
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="삭제"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
