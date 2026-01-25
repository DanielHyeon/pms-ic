import { useState } from 'react';
import {
  LayoutTemplate,
  Copy,
  Trash2,
  Download,
  Eye,
  ChevronDown,
  ChevronRight,
  FolderTree,
  FileText,
  Target,
  CheckCircle,
  Star,
} from 'lucide-react';
import {
  TemplateSet,
  getCategoryLabel,
  getCategoryColor,
  getTemplateStatusLabel,
  getTemplateStatusColor,
  calculateTemplateStats,
} from '../../../types/templates';

interface TemplateSetCardProps {
  template: TemplateSet;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
  onExport?: (id: string) => void;
  onApply?: (template: TemplateSet) => void;
  canEdit?: boolean;
}

export default function TemplateSetCard({
  template,
  onDuplicate,
  onDelete,
  onExport,
  onApply,
  canEdit = true,
}: TemplateSetCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const stats = calculateTemplateStats(template);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <LayoutTemplate size={20} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">{template.name}</h3>
                {template.isDefault && (
                  <Star size={14} className="text-amber-500 fill-amber-500" />
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(template.category)}`}>
                  {getCategoryLabel(template.category)}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${getTemplateStatusColor(template.status)}`}>
                  {getTemplateStatusLabel(template.status)}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {onApply && (
              <button
                type="button"
                onClick={() => onApply(template)}
                className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
              >
                적용
              </button>
            )}
            {onExport && (
              <button
                type="button"
                onClick={() => onExport(template.id)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="내보내기"
              >
                <Download size={16} />
              </button>
            )}
            {onDuplicate && canEdit && (
              <button
                type="button"
                onClick={() => onDuplicate(template.id)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="복제"
              >
                <Copy size={16} />
              </button>
            )}
            {onDelete && canEdit && !template.isDefault && (
              <button
                type="button"
                onClick={() => onDelete(template.id)}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="삭제"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>

        {template.description && (
          <p className="text-sm text-gray-600 mb-3">{template.description}</p>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <p className="text-lg font-bold text-gray-900">{stats.totalPhases}</p>
            <p className="text-xs text-gray-500">Phase</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <p className="text-lg font-bold text-gray-900">{stats.totalWbsGroups}</p>
            <p className="text-xs text-gray-500">WBS Group</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <p className="text-lg font-bold text-gray-900">{stats.totalWbsItems}</p>
            <p className="text-xs text-gray-500">WBS Item</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <p className="text-lg font-bold text-gray-900">{stats.estimatedTotalDays}</p>
            <p className="text-xs text-gray-500">일</p>
          </div>
        </div>

        {/* Tags */}
        {template.tags && template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {template.tags.map((tag, idx) => (
              <span key={idx} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Expand/Collapse */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
        >
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          Phase 구조 보기
        </button>
      </div>

      {/* Expanded Phase List */}
      {isExpanded && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <div className="space-y-3">
            {template.phases.map((phase, index) => (
              <div key={phase.id} className="bg-white rounded-lg p-3 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: phase.color || '#6366F1' }}
                  >
                    {index + 1}
                  </div>
                  <span className="font-medium text-gray-900">{phase.name}</span>
                  {phase.defaultDurationDays && (
                    <span className="text-xs text-gray-500">({phase.defaultDurationDays}일)</span>
                  )}
                </div>

                {phase.description && (
                  <p className="text-xs text-gray-500 mb-2 ml-8">{phase.description}</p>
                )}

                <div className="ml-8 flex flex-wrap gap-3 text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <FolderTree size={12} />
                    <span>WBS Group: {phase.wbsGroups.length}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FileText size={12} />
                    <span>산출물: {phase.deliverables.length}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Target size={12} />
                    <span>KPI: {phase.kpis.length}</span>
                  </div>
                </div>

                {/* WBS Groups Preview */}
                {phase.wbsGroups.length > 0 && (
                  <div className="ml-8 mt-2 pl-3 border-l-2 border-gray-200 space-y-1">
                    {phase.wbsGroups.slice(0, 3).map((group) => (
                      <div key={group.id} className="text-xs text-gray-600">
                        <CheckCircle size={10} className="inline mr-1 text-gray-400" />
                        {group.name}
                        <span className="text-gray-400 ml-1">
                          ({group.items.length} items)
                        </span>
                      </div>
                    ))}
                    {phase.wbsGroups.length > 3 && (
                      <div className="text-xs text-gray-400">
                        ... +{phase.wbsGroups.length - 3}개 더
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>v{template.version}</span>
          <span>업데이트: {new Date(template.updatedAt).toLocaleDateString('ko-KR')}</span>
        </div>
      </div>
    </div>
  );
}
