import { memo } from 'react';
import { FileSignature, Clock, CheckCircle2 } from 'lucide-react';
import type { WidgetProps } from './types';

function ApprovalListWidgetInner(_props: WidgetProps) {
  // Placeholder: Approval list API not yet available
  const sampleApprovals = [
    { id: 1, title: '설계 문서 승인', type: 'deliverable', status: 'pending', submittedAt: '2026-02-06' },
    { id: 2, title: '테스트 계획 검토', type: 'document', status: 'pending', submittedAt: '2026-02-05' },
    { id: 3, title: '요구사항 확인', type: 'requirement', status: 'approved', submittedAt: '2026-02-03' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileSignature className="text-indigo-600" size={20} />
          <h3 className="font-semibold text-gray-900">승인 대기 목록</h3>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
          Coming Soon
        </span>
      </div>
      <div className="space-y-2">
        {sampleApprovals.map((approval) => (
          <div
            key={approval.id}
            className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer"
          >
            {approval.status === 'pending' ? (
              <Clock className="text-amber-500 flex-shrink-0" size={16} />
            ) : (
              <CheckCircle2 className="text-green-500 flex-shrink-0" size={16} />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{approval.title}</p>
              <p className="text-xs text-gray-500">제출일: {approval.submittedAt}</p>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                approval.status === 'pending'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-green-100 text-green-700'
              }`}
            >
              {approval.status === 'pending' ? '대기중' : '승인됨'}
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-4 text-center">
        샘플 데이터 - 승인 API 연동 후 실제 데이터로 교체 예정
      </p>
    </div>
  );
}

export const ApprovalListWidget = memo(ApprovalListWidgetInner);
