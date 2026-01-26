import { useState } from 'react';
import {
  Megaphone,
  Plus,
  Pin,
  Eye,
  Calendar,
  User,
  Bell,
  AlertCircle,
  Info,
  CheckCircle,
  Edit,
  Trash2,
  Search,
  Filter,
} from 'lucide-react';
import { UserRole } from '../App';
import { formatDate, isWithinDays } from '../../utils/formatters';
import { ANNOUNCEMENT_CATEGORY_BADGES, getBadgeClasses, PRIORITY_BADGES } from '../../utils/badges';
import { ICON_SIZES } from '../../constants/ui';
import StatisticsCard, { StatisticsCardGrid } from './common/StatisticsCard';
import FilterBar, { SearchInput, FilterSelect } from './common/FilterBar';

interface AnnouncementsPageProps {
  userRole: UserRole;
  projectId?: string;
}

type AnnouncementPriority = 'HIGH' | 'MEDIUM' | 'LOW';
type AnnouncementStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
type AnnouncementCategory = 'NOTICE' | 'UPDATE' | 'MAINTENANCE' | 'EVENT' | 'POLICY';

interface Announcement {
  id: string;
  title: string;
  content: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  isPinned: boolean;
  authorId: string;
  authorName: string;
  viewCount: number;
  publishedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

// Mock announcement data
const mockAnnouncements: Announcement[] = [
  {
    id: '1',
    title: '시스템 정기 점검 안내',
    content: '2026년 1월 28일 오전 2시부터 6시까지 시스템 정기 점검이 예정되어 있습니다.',
    category: 'MAINTENANCE',
    priority: 'HIGH',
    status: 'PUBLISHED',
    isPinned: true,
    authorId: 'user-1',
    authorName: '박총괄',
    viewCount: 156,
    publishedAt: '2026-01-25T10:00:00',
    expiresAt: '2026-01-28T06:00:00',
    createdAt: '2026-01-25T09:30:00',
  },
  {
    id: '2',
    title: '새로운 기능 업데이트: AI 어시스턴트',
    content: 'AI 어시스턴트 기능이 추가되었습니다. 프로젝트 관리에 AI의 도움을 받아보세요.',
    category: 'UPDATE',
    priority: 'MEDIUM',
    status: 'PUBLISHED',
    isPinned: true,
    authorId: 'user-2',
    authorName: '이매니저',
    viewCount: 89,
    publishedAt: '2026-01-24T14:00:00',
    createdAt: '2026-01-24T13:30:00',
  },
  {
    id: '3',
    title: '프로젝트 보안 정책 변경 안내',
    content: '보안 강화를 위해 2월 1일부터 새로운 비밀번호 정책이 적용됩니다.',
    category: 'POLICY',
    priority: 'HIGH',
    status: 'PUBLISHED',
    isPinned: false,
    authorId: 'user-1',
    authorName: '박총괄',
    viewCount: 234,
    publishedAt: '2026-01-23T09:00:00',
    createdAt: '2026-01-22T16:00:00',
  },
  {
    id: '4',
    title: '1월 월간 회의 일정',
    content: '1월 월간 회의가 1월 30일 오후 3시에 진행됩니다. 참석 부탁드립니다.',
    category: 'EVENT',
    priority: 'MEDIUM',
    status: 'PUBLISHED',
    isPinned: false,
    authorId: 'user-3',
    authorName: '김사장',
    viewCount: 67,
    publishedAt: '2026-01-20T11:00:00',
    expiresAt: '2026-01-30T18:00:00',
    createdAt: '2026-01-20T10:30:00',
  },
  {
    id: '5',
    title: '신규 입사자 OJT 안내',
    content: '신규 입사자 분들을 위한 OJT가 2월 첫째 주에 진행될 예정입니다.',
    category: 'NOTICE',
    priority: 'LOW',
    status: 'PUBLISHED',
    isPinned: false,
    authorId: 'user-2',
    authorName: '이매니저',
    viewCount: 45,
    publishedAt: '2026-01-18T10:00:00',
    createdAt: '2026-01-18T09:00:00',
  },
  {
    id: '6',
    title: '휴가 신청 마감 안내',
    content: '2월 휴가 신청은 1월 25일까지 완료해 주시기 바랍니다.',
    category: 'NOTICE',
    priority: 'MEDIUM',
    status: 'ARCHIVED',
    isPinned: false,
    authorId: 'user-2',
    authorName: '이매니저',
    viewCount: 178,
    publishedAt: '2026-01-10T09:00:00',
    expiresAt: '2026-01-25T18:00:00',
    createdAt: '2026-01-10T08:30:00',
  },
];

export default function AnnouncementsPage({ userRole, projectId = 'proj-001' }: AnnouncementsPageProps) {
  const [announcements] = useState<Announcement[]>(mockAnnouncements);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Role-based access
  // Note: userRole uses lowercase from authStore
  const canManage = userRole === 'admin' || userRole === 'pmo_head' || userRole === 'pm';

  // Filter announcements
  const filteredAnnouncements = announcements.filter((item) => {
    if (filterCategory && item.category !== filterCategory) return false;
    if (filterStatus && item.status !== filterStatus) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !item.title.toLowerCase().includes(query) &&
        !item.content.toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    return true;
  });

  // Sort: pinned first, then by date
  const sortedAnnouncements = [...filteredAnnouncements].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.publishedAt || b.createdAt).getTime() -
           new Date(a.publishedAt || a.createdAt).getTime();
  });

  // Calculate statistics
  const stats = {
    total: announcements.length,
    published: announcements.filter((a) => a.status === 'PUBLISHED').length,
    pinned: announcements.filter((a) => a.isPinned).length,
    thisWeek: announcements.filter((a) => isWithinDays(a.publishedAt || a.createdAt, 7)).length,
  };

  const getCategoryBadge = (category: AnnouncementCategory) => {
    return ANNOUNCEMENT_CATEGORY_BADGES[category] || { bg: 'bg-gray-100', text: 'text-gray-700', label: category };
  };

  const getPriorityIcon = (priority: AnnouncementPriority) => {
    switch (priority) {
      case 'HIGH':
        return <AlertCircle size={16} className="text-red-500" />;
      case 'MEDIUM':
        return <Info size={16} className="text-amber-500" />;
      case 'LOW':
        return <CheckCircle size={16} className="text-green-500" />;
    }
  };


  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">공지사항</h1>
          <p className="text-gray-500 mt-1">프로젝트 공지 및 안내사항 관리</p>
        </div>
        {canManage && (
          <button
            type="button"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={18} />
            공지 등록
          </button>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Megaphone size={20} className="text-gray-600" />
              <span className="text-sm text-gray-500">전체 공지</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">{stats.total}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={20} className="text-blue-600" />
              <span className="text-sm text-gray-500">게시중</span>
            </div>
            <span className="text-2xl font-bold text-blue-600">{stats.published}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pin size={20} className="text-amber-600" />
              <span className="text-sm text-gray-500">고정됨</span>
            </div>
            <span className="text-2xl font-bold text-amber-600">{stats.pinned}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={20} className="text-green-600" />
              <span className="text-sm text-gray-500">이번 주</span>
            </div>
            <span className="text-2xl font-bold text-green-600">{stats.thisWeek}</span>
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
              placeholder="공지 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="분류 필터"
              aria-label="분류 필터"
            >
              <option value="">전체 분류</option>
              <option value="NOTICE">공지</option>
              <option value="UPDATE">업데이트</option>
              <option value="MAINTENANCE">점검</option>
              <option value="EVENT">이벤트</option>
              <option value="POLICY">정책</option>
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="상태 필터"
            aria-label="상태 필터"
          >
            <option value="">전체 상태</option>
            <option value="PUBLISHED">게시중</option>
            <option value="DRAFT">임시저장</option>
            <option value="ARCHIVED">보관됨</option>
          </select>
        </div>
      </div>

      {/* Announcements List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {sortedAnnouncements.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Megaphone size={32} className="mx-auto mb-2 opacity-50" />
            <p>표시할 공지사항이 없습니다.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {sortedAnnouncements.map((announcement) => {
              const categoryBadge = getCategoryBadge(announcement.category);
              return (
                <div
                  key={announcement.id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer ${
                    announcement.isPinned ? 'bg-amber-50/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Priority & Pin */}
                    <div className="flex flex-col items-center gap-1 pt-1">
                      {getPriorityIcon(announcement.priority)}
                      {announcement.isPinned && (
                        <Pin size={14} className="text-amber-500 fill-amber-500" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${categoryBadge.bg} ${categoryBadge.text}`}>
                          {categoryBadge.label}
                        </span>
                        {announcement.status === 'ARCHIVED' && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
                            보관됨
                          </span>
                        )}
                        {announcement.status === 'DRAFT' && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
                            임시저장
                          </span>
                        )}
                      </div>
                      <h3 className="font-medium text-gray-900 mb-1">{announcement.title}</h3>
                      <p className="text-sm text-gray-600 line-clamp-2">{announcement.content}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <User size={12} />
                          {announcement.authorName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {formatDate(announcement.publishedAt || announcement.createdAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye size={12} />
                          {announcement.viewCount}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    {canManage && (
                      <div className="flex items-center gap-1">
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
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
