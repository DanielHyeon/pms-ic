import { useState } from 'react';
import {
  FileText,
  Calendar,
  Activity,
  Shield,
  AlertTriangle,
  Info,
  Download,
  RefreshCw,
  Filter,
  Search,
} from 'lucide-react';
import { UserRole } from '../App';
import { formatDate, isToday } from '../../utils/formatters';
import {
  AUDIT_CATEGORY_BADGES,
  AUDIT_CATEGORY_LABELS,
  AUDIT_ACTION_LABELS,
  SEVERITY_BADGES,
  getBadgeClasses,
} from '../../utils/badges';
import { ICON_SIZES } from '../../constants/ui';
import StatisticsCard, { StatisticsCardGrid } from './common/StatisticsCard';
import FilterBar, { SearchInput, FilterSelect } from './common/FilterBar';

interface AuditLogsPageProps {
  userRole: UserRole;
  projectId?: string;
}

type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'ACCESS' | 'PERMISSION_CHANGE';
type AuditSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
type AuditCategory = 'AUTH' | 'DATA' | 'SYSTEM' | 'USER' | 'PROJECT' | 'SECURITY';

interface AuditLog {
  id: string;
  action: AuditAction;
  category: AuditCategory;
  severity: AuditSeverity;
  description: string;
  userId: string;
  userName: string;
  userRole: string;
  ipAddress: string;
  userAgent?: string;
  entityType?: string;
  entityId?: string;
  oldValue?: string;
  newValue?: string;
  createdAt: string;
}

// Mock audit log data
const mockAuditLogs: AuditLog[] = [
  {
    id: '1',
    action: 'LOGIN',
    category: 'AUTH',
    severity: 'INFO',
    description: '사용자 로그인 성공',
    userId: 'user-1',
    userName: '박총괄',
    userRole: 'PMO_HEAD',
    ipAddress: '192.168.1.100',
    userAgent: 'Chrome/120.0',
    createdAt: '2026-01-26T10:30:00',
  },
  {
    id: '2',
    action: 'UPDATE',
    category: 'PROJECT',
    severity: 'INFO',
    description: '프로젝트 정보 수정: 보험금지급심사 시스템',
    userId: 'user-2',
    userName: '이매니저',
    userRole: 'PM',
    ipAddress: '192.168.1.101',
    entityType: 'Project',
    entityId: 'proj-001',
    oldValue: '{"status": "IN_PROGRESS"}',
    newValue: '{"status": "REVIEW"}',
    createdAt: '2026-01-26T10:15:00',
  },
  {
    id: '3',
    action: 'PERMISSION_CHANGE',
    category: 'SECURITY',
    severity: 'WARNING',
    description: '사용자 권한 변경: 최개발 (DEVELOPER → QA)',
    userId: 'user-1',
    userName: '박총괄',
    userRole: 'PMO_HEAD',
    ipAddress: '192.168.1.100',
    entityType: 'User',
    entityId: 'user-4',
    oldValue: 'DEVELOPER',
    newValue: 'QA',
    createdAt: '2026-01-26T09:45:00',
  },
  {
    id: '4',
    action: 'DELETE',
    category: 'DATA',
    severity: 'WARNING',
    description: '태스크 삭제: API 연동 테스트',
    userId: 'user-3',
    userName: '최개발',
    userRole: 'DEVELOPER',
    ipAddress: '192.168.1.102',
    entityType: 'Task',
    entityId: 'task-15',
    createdAt: '2026-01-26T09:30:00',
  },
  {
    id: '5',
    action: 'EXPORT',
    category: 'DATA',
    severity: 'INFO',
    description: '보고서 내보내기: 주간 진행 보고서',
    userId: 'user-2',
    userName: '이매니저',
    userRole: 'PM',
    ipAddress: '192.168.1.101',
    entityType: 'Report',
    entityId: 'report-3',
    createdAt: '2026-01-26T09:00:00',
  },
  {
    id: '6',
    action: 'LOGIN',
    category: 'AUTH',
    severity: 'CRITICAL',
    description: '로그인 실패 (5회 시도 초과) - 계정 잠금',
    userId: 'user-unknown',
    userName: 'unknown@insure.com',
    userRole: 'UNKNOWN',
    ipAddress: '203.0.113.45',
    createdAt: '2026-01-26T08:30:00',
  },
  {
    id: '7',
    action: 'CREATE',
    category: 'PROJECT',
    severity: 'INFO',
    description: '새 스프린트 생성: Sprint 5',
    userId: 'user-2',
    userName: '이매니저',
    userRole: 'PM',
    ipAddress: '192.168.1.101',
    entityType: 'Sprint',
    entityId: 'sprint-5',
    createdAt: '2026-01-25T17:00:00',
  },
  {
    id: '8',
    action: 'ACCESS',
    category: 'SECURITY',
    severity: 'WARNING',
    description: '권한 없는 페이지 접근 시도: /admin/settings',
    userId: 'user-5',
    userName: '정테스트',
    userRole: 'QA',
    ipAddress: '192.168.1.103',
    createdAt: '2026-01-25T16:30:00',
  },
  {
    id: '9',
    action: 'UPDATE',
    category: 'SYSTEM',
    severity: 'INFO',
    description: '시스템 설정 변경: 백업 주기 (일간 → 시간별)',
    userId: 'user-1',
    userName: '박총괄',
    userRole: 'PMO_HEAD',
    ipAddress: '192.168.1.100',
    createdAt: '2026-01-25T15:00:00',
  },
  {
    id: '10',
    action: 'LOGOUT',
    category: 'AUTH',
    severity: 'INFO',
    description: '사용자 로그아웃',
    userId: 'user-3',
    userName: '최개발',
    userRole: 'DEVELOPER',
    ipAddress: '192.168.1.102',
    createdAt: '2026-01-25T18:00:00',
  },
];

export default function AuditLogsPage({ userRole, projectId = 'proj-001' }: AuditLogsPageProps) {
  const [logs] = useState<AuditLog[]>(mockAuditLogs);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterSeverity, setFilterSeverity] = useState<string>('');

  // Role-based access - only admin, pmo_head, and auditor can view audit logs
  // Note: userRole uses lowercase from authStore
  const canViewLogs = userRole === 'admin' || userRole === 'pmo_head' || userRole === 'auditor';
  const canExport = userRole === 'admin' || userRole === 'auditor';

  if (!canViewLogs) {
    return (
      <div className="flex-1 p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Shield size={48} className="mx-auto mb-4 text-gray-300" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">접근 권한이 없습니다</h2>
          <p className="text-gray-500">감사 로그는 관리자 또는 감사자만 조회할 수 있습니다.</p>
        </div>
      </div>
    );
  }

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    if (filterAction && log.action !== filterAction) return false;
    if (filterCategory && log.category !== filterCategory) return false;
    if (filterSeverity && log.severity !== filterSeverity) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !log.description.toLowerCase().includes(query) &&
        !log.userName.toLowerCase().includes(query) &&
        !log.ipAddress.includes(query)
      ) {
        return false;
      }
    }
    return true;
  });

  // Calculate statistics
  const stats = {
    total: logs.length,
    today: logs.filter((l) => isToday(l.createdAt)).length,
    warnings: logs.filter((l) => l.severity === 'WARNING').length,
    critical: logs.filter((l) => l.severity === 'CRITICAL').length,
  };

  const getActionLabel = (action: AuditAction) => AUDIT_ACTION_LABELS[action] || action;

  const getCategoryLabel = (category: AuditCategory) => AUDIT_CATEGORY_LABELS[category] || category;

  const getCategoryBadge = (category: AuditCategory) => getBadgeClasses(AUDIT_CATEGORY_BADGES, category);

  const getSeverityIcon = (severity: AuditSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return <AlertTriangle size={16} className="text-red-500" />;
      case 'WARNING':
        return <AlertTriangle size={16} className="text-amber-500" />;
      case 'INFO':
        return <Info size={16} className="text-blue-500" />;
    }
  };

  const getSeverityBadge = (severity: AuditSeverity) => getBadgeClasses(SEVERITY_BADGES, severity);

  const formatDateTime = (dateStr: string) => formatDate(dateStr, { includeSeconds: true });

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">감사 로그</h1>
          <p className="text-gray-500 mt-1">시스템 활동 및 변경 이력 조회</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-3 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <RefreshCw size={16} />
            새로고침
          </button>
          {canExport && (
            <button
              type="button"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Download size={18} />
              내보내기
            </button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={20} className="text-gray-600" />
              <span className="text-sm text-gray-500">전체 로그</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">{stats.total}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity size={20} className="text-blue-600" />
              <span className="text-sm text-gray-500">오늘</span>
            </div>
            <span className="text-2xl font-bold text-blue-600">{stats.today}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={20} className="text-amber-600" />
              <span className="text-sm text-gray-500">경고</span>
            </div>
            <span className="text-2xl font-bold text-amber-600">{stats.warnings}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield size={20} className="text-red-600" />
              <span className="text-sm text-gray-500">심각</span>
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
              placeholder="설명, 사용자, IP 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Action Filter */}
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="작업 필터"
              aria-label="작업 필터"
            >
              <option value="">전체 작업</option>
              <option value="CREATE">생성</option>
              <option value="UPDATE">수정</option>
              <option value="DELETE">삭제</option>
              <option value="LOGIN">로그인</option>
              <option value="LOGOUT">로그아웃</option>
              <option value="EXPORT">내보내기</option>
              <option value="ACCESS">접근</option>
              <option value="PERMISSION_CHANGE">권한변경</option>
            </select>
          </div>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="분류 필터"
            aria-label="분류 필터"
          >
            <option value="">전체 분류</option>
            <option value="AUTH">인증</option>
            <option value="DATA">데이터</option>
            <option value="SYSTEM">시스템</option>
            <option value="USER">사용자</option>
            <option value="PROJECT">프로젝트</option>
            <option value="SECURITY">보안</option>
          </select>

          {/* Severity Filter */}
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            title="수준 필터"
            aria-label="수준 필터"
          >
            <option value="">전체 수준</option>
            <option value="INFO">정보</option>
            <option value="WARNING">경고</option>
            <option value="CRITICAL">심각</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                시간
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                수준
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                분류
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                작업
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                설명
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                사용자
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                IP
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  <FileText size={32} className="mx-auto mb-2 opacity-50" />
                  <p>표시할 로그가 없습니다.</p>
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600 flex items-center gap-1">
                      <Calendar size={12} />
                      {formatDateTime(log.createdAt)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getSeverityBadge(log.severity)}`}>
                      {getSeverityIcon(log.severity)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getCategoryBadge(log.category)}`}>
                      {getCategoryLabel(log.category)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-900 font-medium">
                      {getActionLabel(log.action)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">{log.description}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-medium">
                        {log.userName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{log.userName}</p>
                        <p className="text-xs text-gray-500">{log.userRole}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600 font-mono">{log.ipAddress}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
