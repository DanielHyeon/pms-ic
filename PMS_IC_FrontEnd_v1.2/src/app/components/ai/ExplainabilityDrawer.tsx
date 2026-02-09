import { useState } from 'react';
import { ChevronDown, ChevronUp, Database, AlertTriangle, ExternalLink, Cpu } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { AiExplainability } from '../../../types/aiBriefing';

interface ExplainabilityDrawerProps {
  data: AiExplainability;
}

const METHOD_LABELS: Record<string, { label: string; color: string }> = {
  RULE_BASED:  { label: 'Rule-based', color: 'bg-blue-100 text-blue-700' },
  MODEL_BASED: { label: 'Model-based', color: 'bg-purple-100 text-purple-700' },
  HYBRID:      { label: 'Hybrid', color: 'bg-indigo-100 text-indigo-700' },
};

export default function ExplainabilityDrawer({ data }: ExplainabilityDrawerProps) {
  const [open, setOpen] = useState(false);
  const method = METHOD_LABELS[data.generationMethod] || METHOD_LABELS.RULE_BASED;

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Toggle bar */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Cpu size={16} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-700">AI 판단 근거 (Explainability)</span>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${method.color}`}>
            {method.label}
          </span>
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>

      {/* Expandable content */}
      {open && (
        <div className="border-t border-gray-200 p-4 space-y-4">
          {/* Data collection time */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">기준 시점</h4>
            <p className="text-sm text-gray-700">
              {new Date(data.dataCollectedAt).toLocaleString('ko-KR')}
            </p>
          </div>

          {/* Completeness */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">데이터 완결성</h4>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                data.completeness === 'FULL' ? 'bg-green-100 text-green-700' :
                data.completeness === 'PARTIAL' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-500'
              }`}>
                {data.completeness}
              </span>
              {data.missingSignals.length > 0 && (
                <span className="text-xs text-yellow-600">
                  누락: {data.missingSignals.join(', ')}
                </span>
              )}
            </div>
          </div>

          {/* Data sources */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">사용 데이터 소스</h4>
            <div className="space-y-2">
              {data.dataSources.map((ds, i) => (
                <div key={i} className="flex items-center gap-3 text-sm bg-gray-50 rounded p-2">
                  <Database size={14} className="text-gray-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="font-medium text-gray-700">{ds.source}</span>
                    {ds.tables && (
                      <span className="text-gray-500 ml-1">({ds.tables.join(', ')})</span>
                    )}
                    {ds.recordCount !== undefined && (
                      <span className="text-gray-400 ml-2">{ds.recordCount} records</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Warnings */}
          {data.warnings.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">경고</h4>
              <div className="space-y-1">
                {data.warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-yellow-700 bg-yellow-50 rounded p-2">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    {w}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Change history links */}
          {data.changeHistoryLinks.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">변경 이력</h4>
              <div className="space-y-1">
                {data.changeHistoryLinks.map((link, i) => (
                  <Link
                    key={i}
                    to={link.route}
                    className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    <ExternalLink size={12} />
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
