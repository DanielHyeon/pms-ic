import { useState } from 'react';
import { FileText, Calendar, AlertTriangle, Plus, Search } from 'lucide-react';
import { UserRole } from '../App';
import { useProject } from '../../contexts/ProjectContext';
import { useMeetings, useIssues } from '../../hooks/api/useCommon';
import { useProjectDeliverables } from '../../hooks/api/usePhases';

// Import sub-components
import DeliverableManagement from './common/DeliverableManagement';
import MeetingManagement from './common/MeetingManagement';
import IssueManagement from './common/IssueManagement';
import { TabType, Deliverable, initialDeliverables } from './common';

export default function CommonManagement({ userRole }: { userRole: UserRole }) {
  const { currentProject } = useProject();
  const [activeTab, setActiveTab] = useState<TabType>('deliverables');
  const [searchQuery, setSearchQuery] = useState('');
  const [meetingFilter, setMeetingFilter] = useState<string>('');
  const [issueFilter, setIssueFilter] = useState<string>('');

  // TanStack Query hooks
  const { data: meetings = [], isLoading: meetingsLoading } = useMeetings(currentProject?.id);
  const { data: issues = [], isLoading: issuesLoading } = useIssues(currentProject?.id);
  const { data: apiDeliverables = [], isLoading: deliverablesLoading } = useProjectDeliverables(currentProject?.id);

  // Map API deliverables to component format, fallback to initial data if empty
  const deliverables: Deliverable[] = apiDeliverables.length > 0
    ? apiDeliverables.map((d: any) => ({
        id: d.id,
        name: d.name,
        description: d.description,
        type: d.type || 'DOCUMENT',
        status: d.status || 'PENDING',
        version: d.version,
        uploadedAt: d.uploadedAt,
        fileName: d.fileName,
        uploadedBy: d.uploadedBy,
        approver: d.approver,
        approvedBy: d.approver,
        approvedAt: d.approvedAt,
        phaseId: d.phaseId,
        phaseName: d.phaseName,
      }))
    : initialDeliverables;

  // Permission flags
  const canEdit = !['auditor', 'business_analyst'].includes(userRole);
  const canManageIssues = ['pm', 'pmo_head', 'developer', 'qa'].includes(userRole);
  const canManageMeetings = ['pm', 'pmo_head'].includes(userRole);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">공통 관리</h2>
        <p className="text-sm text-gray-500 mt-1">산출물, 회의, 이슈를 통합 관리합니다</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('deliverables')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'deliverables'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText size={18} />
          산출물
        </button>
        <button
          onClick={() => setActiveTab('meetings')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'meetings'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Calendar size={18} />
          회의
          {meetings.filter(m => m.status === 'SCHEDULED').length > 0 && (
            <span className="ml-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-600 rounded-full">
              {meetings.filter(m => m.status === 'SCHEDULED').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('issues')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'issues'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <AlertTriangle size={18} />
          이슈
          {issues.filter(i => !['CLOSED', 'RESOLVED', 'VERIFIED'].includes(i.status)).length > 0 && (
            <span className="ml-1 px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">
              {issues.filter(i => !['CLOSED', 'RESOLVED', 'VERIFIED'].includes(i.status)).length}
            </span>
          )}
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {activeTab === 'meetings' && (
          <select
            value={meetingFilter}
            onChange={(e) => setMeetingFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">전체 상태</option>
            <option value="SCHEDULED">예정</option>
            <option value="IN_PROGRESS">진행중</option>
            <option value="COMPLETED">완료</option>
            <option value="CANCELLED">취소</option>
          </select>
        )}

        {activeTab === 'issues' && (
          <select
            value={issueFilter}
            onChange={(e) => setIssueFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">전체 상태</option>
            <option value="OPEN">신규</option>
            <option value="IN_PROGRESS">진행중</option>
            <option value="RESOLVED">해결</option>
            <option value="CLOSED">종료</option>
          </select>
        )}

        {activeTab === 'meetings' && canManageMeetings && (
          <button
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
            회의 등록
          </button>
        )}

        {activeTab === 'issues' && canManageIssues && (
          <button
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
            이슈 등록
          </button>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === 'deliverables' && (
        <DeliverableManagement
          deliverables={deliverables}
          isLoading={deliverablesLoading}
          canEdit={canEdit}
        />
      )}

      {activeTab === 'meetings' && (
        <MeetingManagement
          projectId={currentProject?.id}
          meetings={meetings}
          isLoading={meetingsLoading}
          canManage={canManageMeetings}
          searchQuery={searchQuery}
          filter={meetingFilter}
        />
      )}

      {activeTab === 'issues' && (
        <IssueManagement
          projectId={currentProject?.id}
          issues={issues}
          isLoading={issuesLoading}
          canManage={canManageIssues}
          searchQuery={searchQuery}
          filter={issueFilter}
        />
      )}
    </div>
  );
}
