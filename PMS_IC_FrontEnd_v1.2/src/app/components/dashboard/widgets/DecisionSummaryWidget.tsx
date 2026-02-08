import { memo } from 'react';
import { FileCheck, Clock, AlertCircle } from 'lucide-react';
import type { WidgetProps } from './types';

function DecisionSummaryWidgetInner(_props: WidgetProps) {
  // Placeholder: Decision summary API not yet available
  const sampleDecisions = [
    { id: 1, title: '기술 스택 선정', status: 'pending', dueDate: '2026-02-15', priority: 'high' },
    { id: 2, title: '테스트 전략 확정', status: 'pending', dueDate: '2026-02-20', priority: 'medium' },
    { id: 3, title: '배포 일정 승인', status: 'resolved', dueDate: '2026-02-10', priority: 'high' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">주요 의사결정</h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
          Coming Soon
        </span>
      </div>
      <div className="space-y-3">
        {sampleDecisions.map((decision) => (
          <div
            key={decision.id}
            className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50"
          >
            {decision.status === 'pending' ? (
              <Clock className="text-amber-500 flex-shrink-0" size={18} />
            ) : (
              <FileCheck className="text-green-500 flex-shrink-0" size={18} />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{decision.title}</p>
              <p className="text-xs text-gray-500">마감: {decision.dueDate}</p>
            </div>
            {decision.priority === 'high' && (
              <AlertCircle className="text-red-400 flex-shrink-0" size={14} />
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-4 text-center">
        샘플 데이터 - 의사결정 API 연동 후 실제 데이터로 교체 예정
      </p>
    </div>
  );
}

export const DecisionSummaryWidget = memo(DecisionSummaryWidgetInner);
