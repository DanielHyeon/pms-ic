import { memo } from 'react';
import { Bug, ArrowRight } from 'lucide-react';
import type { WidgetProps } from './types';

function MyIssuesWidgetInner({ onNavigate }: WidgetProps) {
  // Placeholder: Personal issues API not yet available
  const sampleIssues = [
    { id: 1, title: 'API 응답 타임아웃', severity: 'high', assignedAt: '2026-02-05' },
    { id: 2, title: '차트 렌더링 오류', severity: 'medium', assignedAt: '2026-02-06' },
    { id: 3, title: '메모리 누수 조사', severity: 'low', assignedAt: '2026-02-07' },
  ];

  const severityColors: Record<string, string> = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-blue-100 text-blue-700',
  };

  const severityLabels: Record<string, string> = {
    high: '높음',
    medium: '보통',
    low: '낮음',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bug className="text-red-500" size={20} />
          <h3 className="font-semibold text-gray-900">내 이슈</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
            Coming Soon
          </span>
          {onNavigate && (
            <button
              onClick={() => onNavigate('issues')}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              전체 보기 <ArrowRight size={12} />
            </button>
          )}
        </div>
      </div>
      <div className="space-y-2">
        {sampleIssues.map((issue) => (
          <div
            key={issue.id}
            className="flex items-center gap-3 p-3 rounded-lg border border-gray-100"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 truncate">{issue.title}</p>
              <p className="text-xs text-gray-500">배정일: {issue.assignedAt}</p>
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${severityColors[issue.severity] || ''}`}
            >
              {severityLabels[issue.severity] || issue.severity}
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-4 text-center">
        샘플 데이터 - 이슈 API 연동 후 실제 데이터로 교체 예정
      </p>
    </div>
  );
}

export const MyIssuesWidget = memo(MyIssuesWidgetInner);
