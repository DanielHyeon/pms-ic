import { memo } from 'react';
import { FileText, CheckCircle2, XCircle } from 'lucide-react';
import type { WidgetProps } from './types';

function ApprovalDetailPanelInner(_props: WidgetProps) {
  // Placeholder: Approval detail API not yet available
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="text-indigo-600" size={20} />
        <h3 className="font-semibold text-gray-900">승인 상세</h3>
      </div>

      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <FileText className="text-gray-400" size={28} />
        </div>
        <p className="text-sm text-gray-500 mb-2">승인 항목을 선택하세요</p>
        <p className="text-xs text-gray-400">
          좌측 목록에서 항목을 클릭하면 상세 정보가 표시됩니다
        </p>
      </div>

      <div className="mt-4 border-t border-gray-100 pt-4">
        <p className="text-xs font-medium text-gray-500 mb-2">빠른 액션</p>
        <div className="flex gap-2">
          <button
            disabled
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-50 text-green-700 rounded-lg text-xs font-medium opacity-50 cursor-not-allowed"
          >
            <CheckCircle2 size={14} />
            승인
          </button>
          <button
            disabled
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-50 text-red-700 rounded-lg text-xs font-medium opacity-50 cursor-not-allowed"
          >
            <XCircle size={14} />
            반려
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-4 text-center">
        승인 상세 패널 - API 연동 예정
      </p>
    </div>
  );
}

export const ApprovalDetailPanel = memo(ApprovalDetailPanelInner);
