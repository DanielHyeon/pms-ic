import { useState } from 'react';
import {
  AlertTriangle,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  MessageSquare,
} from 'lucide-react';
import type { Issue } from './types';
import {
  getIssueTypeLabel,
  getPriorityLabel,
  getStatusColor,
  getPriorityColor,
  formatDateTime,
  formatDate,
} from './utils';
import {
  useCreateIssue,
  useUpdateIssue,
  useDeleteIssue,
  useUpdateIssueStatus,
} from '../../../hooks/api/useCommon';

interface IssueManagementProps {
  projectId: string | undefined;
  issues: Issue[];
  isLoading: boolean;
  canManage: boolean;
  searchQuery: string;
  filter: string;
}

export default function IssueManagement({
  projectId,
  issues,
  isLoading,
  canManage,
  searchQuery,
  filter,
}: IssueManagementProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);

  const createIssueMutation = useCreateIssue();
  const updateIssueMutation = useUpdateIssue();
  const deleteIssueMutation = useDeleteIssue();
  const updateIssueStatusMutation = useUpdateIssueStatus();

  const filteredIssues = issues.filter(i => {
    if (filter && i.status !== filter) return false;
    if (searchQuery && !i.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleSaveIssue = async (issueData: Partial<Issue>) => {
    if (!projectId) return;

    try {
      if (editingIssue) {
        await updateIssueMutation.mutateAsync({
          projectId,
          issueId: editingIssue.id,
          data: issueData,
        });
      } else {
        await createIssueMutation.mutateAsync({
          projectId,
          data: issueData,
        });
      }
      setShowModal(false);
      setEditingIssue(null);
    } catch (error) {
      console.warn('Failed to save issue:', error);
    }
  };

  const handleDeleteIssue = async (issueId: string) => {
    if (!projectId || !confirm('이 이슈를 삭제하시겠습니까?')) return;

    try {
      await deleteIssueMutation.mutateAsync({
        projectId,
        issueId,
      });
    } catch (error) {
      console.warn('Failed to delete issue:', error);
    }
  };

  const handleIssueStatusChange = async (issueId: string, newStatus: Issue['status']) => {
    if (!projectId) return;

    try {
      await updateIssueStatusMutation.mutateAsync({
        projectId,
        issueId,
        status: newStatus,
      });
    } catch (error) {
      console.warn('Failed to update issue status:', error);
    }
  };

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">데이터를 불러오는 중...</div>;
  }

  if (filteredIssues.length === 0) {
    return (
      <>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-400">
          <AlertTriangle size={48} className="mx-auto mb-4 opacity-50" />
          <p>등록된 이슈가 없습니다.</p>
        </div>
        {showModal && (
          <IssueModal
            issue={editingIssue}
            onSave={handleSaveIssue}
            onClose={() => {
              setShowModal(false);
              setEditingIssue(null);
            }}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {filteredIssues.map((issue) => (
          <div
            key={issue.id}
            className="bg-white rounded-xl shadow-sm border border-gray-200"
          >
            <div
              className="p-4 cursor-pointer"
              onClick={() => setExpandedIssue(expandedIssue === issue.id ? null : issue.id)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(issue.priority)}`}>
                      {getPriorityLabel(issue.priority)}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(issue.status)}`}>
                      {issue.status === 'OPEN' ? '신규' : issue.status === 'IN_PROGRESS' ? '진행중' : issue.status === 'RESOLVED' ? '해결' : issue.status === 'CLOSED' ? '종료' : issue.status}
                    </span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                      {getIssueTypeLabel(issue.issueType)}
                    </span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">{issue.title}</h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    {issue.assignee && <span>담당: {issue.assignee}</span>}
                    {issue.dueDate && <span>마감: {formatDate(issue.dueDate)}</span>}
                    <span>등록: {formatDate(issue.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canManage && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingIssue(issue);
                          setShowModal(true);
                        }}
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded transition-colors"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteIssue(issue.id);
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                  {expandedIssue === issue.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>
            </div>

            {/* Expanded issue details */}
            {expandedIssue === issue.id && (
              <div className="border-t border-gray-200 p-4 bg-gray-50">
                {issue.description && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-1">설명</h4>
                    <p className="text-sm text-gray-600">{issue.description}</p>
                  </div>
                )}

                {issue.resolution && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-1">해결 내용</h4>
                    <p className="text-sm text-gray-600">{issue.resolution}</p>
                  </div>
                )}

                {/* Status change buttons */}
                {canManage && issue.status !== 'CLOSED' && (
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-sm text-gray-500">상태 변경:</span>
                    {issue.status === 'OPEN' && (
                      <button
                        onClick={() => handleIssueStatusChange(issue.id, 'IN_PROGRESS')}
                        className="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                      >
                        진행 시작
                      </button>
                    )}
                    {issue.status === 'IN_PROGRESS' && (
                      <button
                        onClick={() => handleIssueStatusChange(issue.id, 'RESOLVED')}
                        className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                      >
                        해결 완료
                      </button>
                    )}
                    {issue.status === 'RESOLVED' && (
                      <>
                        <button
                          onClick={() => handleIssueStatusChange(issue.id, 'VERIFIED')}
                          className="px-3 py-1 text-xs bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200"
                        >
                          검증 완료
                        </button>
                        <button
                          onClick={() => handleIssueStatusChange(issue.id, 'REOPENED')}
                          className="px-3 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                        >
                          재오픈
                        </button>
                      </>
                    )}
                    {['VERIFIED', 'RESOLVED'].includes(issue.status) && (
                      <button
                        onClick={() => handleIssueStatusChange(issue.id, 'CLOSED')}
                        className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      >
                        종료
                      </button>
                    )}
                  </div>
                )}

                {/* Comments */}
                {issue.comments && issue.comments.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                      <MessageSquare size={14} />
                      댓글 ({issue.comments.length})
                    </h4>
                    <div className="space-y-2">
                      {issue.comments.map((comment, idx) => (
                        <div key={idx} className="bg-white p-3 rounded border border-gray-200">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">{comment.author}</span>
                            <span className="text-xs text-gray-400">{formatDateTime(comment.commentedAt)}</span>
                          </div>
                          <p className="text-sm text-gray-600">{comment.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <IssueModal
          issue={editingIssue}
          onSave={handleSaveIssue}
          onClose={() => {
            setShowModal(false);
            setEditingIssue(null);
          }}
        />
      )}
    </>
  );
}

// Issue Modal Component
function IssueModal({
  issue,
  onSave,
  onClose,
}: {
  issue: Issue | null;
  onSave: (data: Partial<Issue>) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    title: issue?.title || '',
    description: issue?.description || '',
    issueType: issue?.issueType || 'BUG',
    priority: issue?.priority || 'MEDIUM',
    assignee: issue?.assignee || '',
    reporter: issue?.reporter || '',
    reviewer: issue?.reviewer || '',
    dueDate: issue?.dueDate || '',
    resolution: issue?.resolution || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {issue ? '이슈 수정' : '이슈 등록'}
          </h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">제목 *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">유형 *</label>
              <select
                value={formData.issueType}
                onChange={(e) => setFormData(prev => ({ ...prev, issueType: e.target.value as Issue['issueType'] }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="BUG">버그</option>
                <option value="RISK">위험</option>
                <option value="BLOCKER">장애</option>
                <option value="CHANGE_REQUEST">변경 요청</option>
                <option value="QUESTION">문의</option>
                <option value="IMPROVEMENT">개선</option>
                <option value="OTHER">기타</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">우선순위 *</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as Issue['priority'] }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="CRITICAL">긴급</option>
                <option value="HIGH">높음</option>
                <option value="MEDIUM">중간</option>
                <option value="LOW">낮음</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">담당자</label>
              <input
                type="text"
                value={formData.assignee}
                onChange={(e) => setFormData(prev => ({ ...prev, assignee: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">보고자</label>
              <input
                type="text"
                value={formData.reporter}
                onChange={(e) => setFormData(prev => ({ ...prev, reporter: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">검토자</label>
              <input
                type="text"
                value={formData.reviewer}
                onChange={(e) => setFormData(prev => ({ ...prev, reviewer: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">마감일</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              rows={3}
            />
          </div>
          {issue && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">해결 내용</label>
              <textarea
                value={formData.resolution}
                onChange={(e) => setFormData(prev => ({ ...prev, resolution: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                rows={3}
                placeholder="이슈 해결 시 해결 내용을 입력하세요"
              />
            </div>
          )}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              저장
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export { IssueModal };
