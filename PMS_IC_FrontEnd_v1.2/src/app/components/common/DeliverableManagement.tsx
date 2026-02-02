import { FileText, Clock, Pencil, Trash2 } from 'lucide-react';
import type { Deliverable } from './types';

interface DeliverableManagementProps {
  deliverables: Deliverable[];
  isLoading: boolean;
  canEdit: boolean;
}

export default function DeliverableManagement({
  deliverables,
  isLoading,
  canEdit,
}: DeliverableManagementProps) {
  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">데이터를 불러오는 중...</div>;
  }

  if (deliverables.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-400">
        <FileText size={48} className="mx-auto mb-4 opacity-50" />
        <p>등록된 산출물이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-medium text-gray-900">전체 산출물 목록</h3>
          <span className="text-sm text-gray-500">{deliverables.length}개</span>
        </div>
        <div className="divide-y divide-gray-200">
          {deliverables.map((deliverable) => (
            <div
              key={deliverable.id}
              className="p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <FileText size={18} className="text-gray-400" />
                    <h4 className="font-medium text-gray-900">{deliverable.name}</h4>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        deliverable.status === 'APPROVED'
                          ? 'bg-green-100 text-green-700'
                          : deliverable.status === 'IN_REVIEW'
                          ? 'bg-blue-100 text-blue-700'
                          : deliverable.status === 'REJECTED'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {deliverable.status === 'APPROVED'
                        ? '승인됨'
                        : deliverable.status === 'IN_REVIEW'
                        ? '검토중'
                        : deliverable.status === 'REJECTED'
                        ? '반려됨'
                        : '대기'}
                    </span>
                    {deliverable.version && (
                      <span className="text-xs text-gray-500">v{deliverable.version}</span>
                    )}
                  </div>
                  {deliverable.description && (
                    <p className="text-sm text-gray-500 ml-7 mb-1">{deliverable.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-400 ml-7">
                    {deliverable.phaseName && (
                      <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">
                        {deliverable.phaseName}
                      </span>
                    )}
                    {deliverable.uploadedAt && (
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        업로드: {deliverable.uploadedAt}
                      </span>
                    )}
                    {deliverable.approvedBy && (
                      <span>승인자: {deliverable.approvedBy}</span>
                    )}
                    {deliverable.type && (
                      <span className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">
                        {deliverable.type}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canEdit && deliverable.status !== 'APPROVED' && (
                    <button
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="수정"
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                  {canEdit && (
                    <button
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="삭제"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
