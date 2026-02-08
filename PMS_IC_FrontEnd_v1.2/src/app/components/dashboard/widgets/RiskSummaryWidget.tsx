import { memo } from 'react';
import { ShieldAlert, AlertTriangle, Info } from 'lucide-react';
import type { WidgetProps } from './types';

function RiskSummaryWidgetInner(_props: WidgetProps) {
  // Placeholder: Risk summary API not yet available
  const sampleRisks = [
    { id: 1, title: '일정 지연 리스크', severity: 'high', status: '모니터링 중' },
    { id: 2, title: '리소스 부족', severity: 'medium', status: '대응 계획 수립' },
    { id: 3, title: '외부 의존성', severity: 'low', status: '식별됨' },
  ];

  const severityConfig: Record<string, { color: string; bgColor: string; icon: typeof AlertTriangle }> = {
    high: { color: 'text-red-700', bgColor: 'bg-red-50', icon: AlertTriangle },
    medium: { color: 'text-amber-700', bgColor: 'bg-amber-50', icon: ShieldAlert },
    low: { color: 'text-blue-700', bgColor: 'bg-blue-50', icon: Info },
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">리스크 요약</h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
          Coming Soon
        </span>
      </div>
      <div className="space-y-3">
        {sampleRisks.map((risk) => {
          const config = severityConfig[risk.severity] || severityConfig.low;
          const Icon = config.icon;
          return (
            <div key={risk.id} className={`${config.bgColor} rounded-lg p-3 border border-transparent`}>
              <div className="flex items-start gap-2">
                <Icon className={`${config.color} mt-0.5`} size={16} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{risk.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{risk.status}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-gray-400 mt-4 text-center">
        샘플 데이터 - 리스크 관리 API 연동 후 실제 데이터로 교체 예정
      </p>
    </div>
  );
}

export const RiskSummaryWidget = memo(RiskSummaryWidgetInner);
