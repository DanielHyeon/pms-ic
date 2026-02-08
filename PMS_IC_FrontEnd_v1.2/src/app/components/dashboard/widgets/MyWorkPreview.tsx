import { memo } from 'react';
import { ListChecks, ArrowRight } from 'lucide-react';
import type { WidgetProps } from './types';

function MyWorkPreviewInner({ onNavigate }: WidgetProps) {
  // Placeholder: Personal task API not yet available
  const sampleTasks = [
    { id: 1, title: 'API 엔드포인트 구현', status: 'IN_PROGRESS', priority: 'high' },
    { id: 2, title: '단위 테스트 작성', status: 'TODO', priority: 'medium' },
    { id: 3, title: '코드 리뷰 반영', status: 'IN_PROGRESS', priority: 'high' },
    { id: 4, title: '문서 업데이트', status: 'TODO', priority: 'low' },
  ];

  const statusColors: Record<string, string> = {
    IN_PROGRESS: 'bg-blue-100 text-blue-700',
    TODO: 'bg-gray-100 text-gray-600',
    DONE: 'bg-green-100 text-green-700',
  };

  const statusLabels: Record<string, string> = {
    IN_PROGRESS: '진행중',
    TODO: '할일',
    DONE: '완료',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ListChecks className="text-cyan-600" size={20} />
          <h3 className="font-semibold text-gray-900">내 작업</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
            Coming Soon
          </span>
          {onNavigate && (
            <button
              onClick={() => onNavigate('my-work')}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              전체 보기 <ArrowRight size={12} />
            </button>
          )}
        </div>
      </div>
      <div className="space-y-2">
        {sampleTasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center gap-3 p-3 rounded-lg border border-gray-100"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 truncate">{task.title}</p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[task.status] || ''}`}>
              {statusLabels[task.status] || task.status}
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-4 text-center">
        샘플 데이터 - 개인 작업 API 연동 후 실제 데이터로 교체 예정
      </p>
    </div>
  );
}

export const MyWorkPreview = memo(MyWorkPreviewInner);
