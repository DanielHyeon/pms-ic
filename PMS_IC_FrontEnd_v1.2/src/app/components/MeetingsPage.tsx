import { useState } from 'react';
import {
  Calendar,
  Plus,
  Filter,
  Search,
  Clock,
  CheckCircle,
  AlertCircle,
  CalendarDays,
} from 'lucide-react';
import MeetingManagement from './common/MeetingManagement';
import { useMeetings, useCreateMeeting } from '../../hooks/api/useCommon';
import { getRolePermissions } from '../../utils/rolePermissions';
import { UserRole } from '../App';

interface MeetingsPageProps {
  userRole: UserRole;
  projectId?: string;
}

export default function MeetingsPage({ userRole, projectId = 'proj-001' }: MeetingsPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // API hooks
  const { data: meetings = [], isLoading } = useMeetings(projectId);
  const createMeetingMutation = useCreateMeeting();

  // Role permissions
  const permissions = getRolePermissions(userRole);
  const canManage = permissions.canEdit;

  // Calculate statistics
  const stats = {
    total: meetings.length,
    scheduled: meetings.filter((m) => m.status === 'SCHEDULED').length,
    inProgress: meetings.filter((m) => m.status === 'IN_PROGRESS').length,
    completed: meetings.filter((m) => m.status === 'COMPLETED').length,
    thisWeek: meetings.filter((m) => {
      const meetingDate = new Date(m.scheduledAt);
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      return meetingDate >= weekStart && meetingDate < weekEnd;
    }).length,
  };

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">회의 관리</h1>
          <p className="text-gray-500 mt-1">회의 일정 및 회의록 관리</p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={18} />
            회의 등록
          </button>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={20} className="text-gray-600" />
              <span className="text-sm text-gray-500">전체</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">{stats.total}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays size={20} className="text-blue-600" />
              <span className="text-sm text-gray-500">이번 주</span>
            </div>
            <span className="text-2xl font-bold text-blue-600">{stats.thisWeek}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={20} className="text-purple-600" />
              <span className="text-sm text-gray-500">예정</span>
            </div>
            <span className="text-2xl font-bold text-purple-600">{stats.scheduled}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={20} className="text-amber-600" />
              <span className="text-sm text-gray-500">진행중</span>
            </div>
            <span className="text-2xl font-bold text-amber-600">{stats.inProgress}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle size={20} className="text-green-600" />
              <span className="text-sm text-gray-500">완료</span>
            </div>
            <span className="text-2xl font-bold text-green-600">{stats.completed}</span>
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
              placeholder="회의 검색..."
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
              <option value="SCHEDULED">예정</option>
              <option value="IN_PROGRESS">진행중</option>
              <option value="COMPLETED">완료</option>
              <option value="CANCELLED">취소</option>
            </select>
          </div>
        </div>
      </div>

      {/* Meeting List */}
      <MeetingManagement
        projectId={projectId}
        meetings={meetings}
        isLoading={isLoading}
        canManage={canManage}
        searchQuery={searchQuery}
        filter={filterStatus}
      />
    </div>
  );
}
