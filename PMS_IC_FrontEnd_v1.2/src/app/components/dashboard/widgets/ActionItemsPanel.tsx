import { memo } from 'react';
import { ClipboardList, Circle, CheckCircle2 } from 'lucide-react';
import type { WidgetProps } from './types';

function ActionItemsPanelInner(_props: WidgetProps) {
  // Placeholder: Action items API not yet available
  const sampleItems = [
    { id: 1, title: '주간 보고서 검토', completed: false, dueDate: '2026-02-10' },
    { id: 2, title: '리소스 재배치 검토', completed: false, dueDate: '2026-02-12' },
    { id: 3, title: '스프린트 회고 준비', completed: true, dueDate: '2026-02-08' },
    { id: 4, title: '이해관계자 미팅 일정', completed: false, dueDate: '2026-02-15' },
    { id: 5, title: '품질 게이트 점검', completed: true, dueDate: '2026-02-07' },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full">
      <div className="flex items-center gap-2 mb-4">
        <ClipboardList className="text-indigo-600" size={20} />
        <h3 className="font-semibold text-gray-900">액션 아이템</h3>
      </div>
      <div className="space-y-2">
        {sampleItems.map((item) => (
          <div
            key={item.id}
            className={`flex items-start gap-2 p-2 rounded-lg ${
              item.completed ? 'opacity-60' : ''
            }`}
          >
            {item.completed ? (
              <CheckCircle2 className="text-green-500 flex-shrink-0 mt-0.5" size={16} />
            ) : (
              <Circle className="text-gray-300 flex-shrink-0 mt-0.5" size={16} />
            )}
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm ${
                  item.completed ? 'text-gray-400 line-through' : 'text-gray-900'
                }`}
              >
                {item.title}
              </p>
              <p className="text-xs text-gray-400">{item.dueDate}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-4 text-center">
        샘플 데이터 - 액션 아이템 API 연동 예정
      </p>
    </div>
  );
}

export const ActionItemsPanel = memo(ActionItemsPanelInner);
