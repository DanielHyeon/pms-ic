import { RefreshCw, ChevronDown, Clock, User, Folder, Shield } from 'lucide-react';
import type { Completeness, BriefingScope } from '../../../types/aiBriefing';

interface AiContextHeaderProps {
  projectName: string;
  role: string;
  asOf: string;
  scope: BriefingScope;
  completeness: Completeness;
  missingSignals?: string[];
  onRefresh: () => void;
  onScopeChange: (scope: BriefingScope) => void;
  isRefreshing: boolean;
}

const SCOPE_LABELS: Record<BriefingScope, string> = {
  current_sprint: '현재 스프린트',
  last_7_days: '최근 7일',
  last_14_days: '최근 14일',
  current_phase: '현재 단계',
};

const COMPLETENESS_CONFIG: Record<Completeness, { color: string; bg: string; label: string }> = {
  FULL:    { color: 'text-green-700', bg: 'bg-green-100', label: 'FULL' },
  PARTIAL: { color: 'text-yellow-700', bg: 'bg-yellow-100', label: 'PARTIAL' },
  UNKNOWN: { color: 'text-gray-500', bg: 'bg-gray-100', label: 'UNKNOWN' },
};

export default function AiContextHeader({
  projectName,
  role,
  asOf,
  scope,
  completeness,
  missingSignals,
  onRefresh,
  onScopeChange,
  isRefreshing,
}: AiContextHeaderProps) {
  const cpl = COMPLETENESS_CONFIG[completeness];
  const formattedTime = new Date(asOf).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Left: Context info */}
        <div className="flex items-center gap-4 flex-wrap text-sm">
          <div className="flex items-center gap-1.5 text-gray-700">
            <Folder size={14} className="text-blue-500" />
            <span className="font-medium">{projectName}</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-600">
            <User size={14} className="text-purple-500" />
            <span>{role}</span>
          </div>
          <div className="flex items-center gap-1.5 text-gray-600">
            <Clock size={14} className="text-gray-400" />
            <span>{formattedTime}</span>
          </div>
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cpl.bg} ${cpl.color}`}>
            <Shield size={12} />
            {cpl.label}
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2">
          {/* Scope selector */}
          <div className="relative">
            <select
              value={scope}
              onChange={(e) => onScopeChange(e.target.value as BriefingScope)}
              className="appearance-none bg-gray-50 border border-gray-200 rounded-md pl-3 pr-8 py-1.5 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {Object.entries(SCOPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Refresh button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-sm hover:bg-blue-100 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            브리핑 갱신
          </button>
        </div>
      </div>

      {/* Completeness warning */}
      {completeness === 'PARTIAL' && missingSignals && missingSignals.length > 0 && (
        <div className="mt-3 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
          <span className="font-medium">데이터 불완전:</span>{' '}
          {missingSignals.join(', ')} 데이터가 누락되어 분석이 불완전할 수 있습니다.
        </div>
      )}
    </div>
  );
}
