import { memo } from 'react';
import { BarChart3, TrendingUp, AlertTriangle } from 'lucide-react';
import type { WidgetProps } from './types';

function PmoDetailPanelInner(_props: WidgetProps) {
  // Placeholder: PMO detail panel API not yet available
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="text-blue-600" size={20} />
        <h3 className="font-semibold text-gray-900">PMO 상세</h3>
      </div>
      <div className="space-y-4">
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="text-blue-600" size={16} />
            <span className="text-sm font-medium text-blue-900">프로젝트 건강도 요약</span>
          </div>
          <p className="text-xs text-blue-700">
            프로젝트를 선택하면 상세 건강도 지표가 표시됩니다.
          </p>
        </div>

        <div className="p-3 bg-amber-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="text-amber-600" size={16} />
            <span className="text-sm font-medium text-amber-900">주의 프로젝트</span>
          </div>
          <p className="text-xs text-amber-700">
            지연 또는 리스크가 있는 프로젝트가 여기에 표시됩니다.
          </p>
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-4 text-center">
        PMO 상세 패널 - API 연동 예정
      </p>
    </div>
  );
}

export const PmoDetailPanel = memo(PmoDetailPanelInner);
