/**
 * Evidence Panel Component - Phase 1 Evidence System
 *
 * Displays evidence/sources linked to AI responses.
 * Shows relevance scores, source types, and excerpts.
 */

import {
  FileText,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Bug,
  Calendar,
  ListTodo,
  Folder,
  Users,
} from 'lucide-react';
import { useState } from 'react';

interface Evidence {
  sourceType: string;
  sourceId: string;
  title: string;
  excerpt?: string;
  relevanceScore: number;
  url?: string;
}

interface EvidencePanelProps {
  evidence: Evidence[];
  confidence: number;
  hasSufficientEvidence: boolean;
  compact?: boolean;
}

export function EvidencePanel({
  evidence,
  confidence,
  hasSufficientEvidence,
  compact = false,
}: EvidencePanelProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);

  const getSourceIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'document':
        return <FileText className="h-4 w-4" />;
      case 'issue':
        return <Bug className="h-4 w-4" />;
      case 'task':
        return <ListTodo className="h-4 w-4" />;
      case 'meeting':
        return <Calendar className="h-4 w-4" />;
      case 'sprint':
        return <Folder className="h-4 w-4" />;
      case 'user_story':
        return <Users className="h-4 w-4" />;
      default:
        return <ExternalLink className="h-4 w-4" />;
    }
  };

  const getSourceTypeLabel = (type: string) => {
    switch (type.toLowerCase()) {
      case 'document':
        return '문서';
      case 'issue':
        return '이슈';
      case 'task':
        return '태스크';
      case 'meeting':
        return '회의';
      case 'sprint':
        return '스프린트';
      case 'user_story':
        return '스토리';
      case 'decision':
        return '의사결정';
      default:
        return type;
    }
  };

  const getRelevanceBadge = (score: number) => {
    if (score >= 0.8) {
      return (
        <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">
          높음
        </span>
      );
    }
    if (score >= 0.6) {
      return (
        <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded">
          중간
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
        낮음
      </span>
    );
  };

  const getConfidenceColor = () => {
    if (confidence >= 0.8) return 'text-green-500';
    if (confidence >= 0.6) return 'text-yellow-500';
    return 'text-amber-500';
  };

  const getConfidenceLabel = () => {
    if (confidence >= 0.8) return '높음';
    if (confidence >= 0.6) return '보통';
    return '낮음';
  };

  if (compact && !isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <FileText className="h-3 w-3" />
          <span>근거 {evidence.length}개</span>
          <span className={`${getConfidenceColor()}`}>
            신뢰도 {Math.round(confidence * 100)}%
          </span>
        </div>
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </button>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-3 mt-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500">근거 자료</span>
        <div className="flex items-center gap-2">
          {hasSufficientEvidence ? (
            <CheckCircle className={`h-3 w-3 ${getConfidenceColor()}`} />
          ) : (
            <AlertCircle className="h-3 w-3 text-amber-500" />
          )}
          <span className="text-xs text-gray-500">
            신뢰도 {Math.round(confidence * 100)}% ({getConfidenceLabel()})
          </span>
          {compact && (
            <button
              onClick={() => setIsExpanded(false)}
              className="p-0.5 hover:bg-gray-200 rounded"
            >
              <ChevronUp className="h-3 w-3 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Evidence List */}
      <div className="space-y-2">
        {evidence.length > 0 ? (
          evidence.map((item, index) => (
            <div key={index} className="flex items-start gap-2 text-sm">
              <span className="text-gray-400 mt-0.5 flex-shrink-0">
                {getSourceIcon(item.sourceType)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                    {getSourceTypeLabel(item.sourceType)}
                  </span>
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline truncate flex items-center gap-1"
                    >
                      {item.title}
                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    </a>
                  ) : (
                    <span className="text-gray-700 truncate">{item.title}</span>
                  )}
                  {getRelevanceBadge(item.relevanceScore)}
                </div>
                {item.excerpt && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                    "{item.excerpt}"
                  </p>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs text-amber-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            근거 자료가 없습니다. 이 응답은 검증이 필요합니다.
          </p>
        )}
      </div>

      {/* Footer note */}
      {!hasSufficientEvidence && evidence.length > 0 && (
        <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          근거가 충분하지 않습니다. 추가 확인을 권장합니다.
        </p>
      )}
    </div>
  );
}

export default EvidencePanel;
