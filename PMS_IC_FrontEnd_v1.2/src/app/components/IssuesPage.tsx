import { useState } from 'react';
import {
  AlertTriangle,
  Plus,
  Filter,
  Search,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import IssueManagement from './common/IssueManagement';
import { useIssues, useCreateIssue } from '../../hooks/api/useCommon';
import { getRolePermissions } from '../../utils/rolePermissions';
import { UserRole } from '../App';

interface IssuesPageProps {
  userRole: UserRole;
  projectId?: string;
}

export default function IssuesPage({ userRole, projectId = 'proj-001' }: IssuesPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // API hooks
  const { data: issues = [], isLoading } = useIssues(projectId);
  const createIssueMutation = useCreateIssue();

  // Role permissions
  const permissions = getRolePermissions(userRole);
  const canManage = permissions.canEdit;

  // Calculate statistics
  const stats = {
    total: issues.length,
    open: issues.filter((i) => i.status === 'OPEN').length,
    inProgress: issues.filter((i) => i.status === 'IN_PROGRESS').length,
    resolved: issues.filter((i) => ['RESOLVED', 'VERIFIED', 'CLOSED'].includes(i.status)).length,
    critical: issues.filter((i) => i.priority === 'CRITICAL' && !['RESOLVED', 'VERIFIED', 'CLOSED'].includes(i.status)).length,
  };

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">이슈 관리</h1>
          <p className="text-gray-500 mt-1">프로젝트 이슈 추적 및 관리</p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={18} />
            이슈 등록
          </button>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={20} className="text-gray-600" />
              <span className="text-sm text-gray-500">전체</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">{stats.total}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={20} className="text-blue-600" />
              <span className="text-sm text-gray-500">신규</span>
            </div>
            <span className="text-2xl font-bold text-blue-600">{stats.open}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={20} className="text-amber-600" />
              <span className="text-sm text-gray-500">진행중</span>
            </div>
            <span className="text-2xl font-bold text-amber-600">{stats.inProgress}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle size={20} className="text-green-600" />
              <span className="text-sm text-gray-500">해결</span>
            </div>
            <span className="text-2xl font-bold text-green-600">{stats.resolved}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={20} className="text-red-600" />
              <span className="text-sm text-gray-500">긴급</span>
            </div>
            <span className="text-2xl font-bold text-red-600">{stats.critical}</span>
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
              placeholder="이슈 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">전체 상태</option>
              <option value="OPEN">신규</option>
              <option value="IN_PROGRESS">진행중</option>
              <option value="RESOLVED">해결</option>
              <option value="VERIFIED">검증완료</option>
              <option value="CLOSED">종료</option>
            </select>
          </div>
        </div>
      </div>

      {/* Issue List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <IssueManagement
          projectId={projectId}
          issues={issues}
          isLoading={isLoading}
          canManage={canManage}
          searchQuery={searchQuery}
          filter={filterStatus}
        />
      </div>
    </div>
  );
}
