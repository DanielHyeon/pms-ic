import { useState } from 'react';
import {
  LayoutTemplate,
  Plus,
  Search,
  Filter,
  Upload,
  Download,
  RefreshCw,
  X,
  Loader2,
} from 'lucide-react';
import {
  TemplateSet,
  TemplateCategory,
  MethodologyPhase,
  getCategoryLabel,
  getCategoryColor,
} from '../../../types/templates';
import {
  useTemplateSets,
  useCreateTemplateSet,
  useDeleteTemplateSet,
  useDuplicateTemplateSet,
  useExportTemplate,
  useImportTemplate,
  useUpdateTemplateSet,
} from '../../../hooks/api/useTemplates';
import TemplateSetCard from './TemplateSetCard';
import ApplyTemplateModal from './ApplyTemplateModal';
import TemplateEditor from './TemplateEditor';

interface TemplateLibraryProps {
  projectId?: string;
  targetPhaseId?: string;  // If provided, add WBS to this phase instead of creating new phases
  targetPhaseName?: string;
  methodologyPhases?: MethodologyPhase[];  // All methodology phases for bulk application
  canEdit?: boolean;
  onApplySuccess?: (phaseIds: string[]) => void;
}

const CATEGORIES: Array<{ value: TemplateCategory | 'ALL'; label: string }> = [
  { value: 'ALL', label: '전체' },
  { value: 'INSURANCE', label: '보험 프로젝트' },
  { value: 'SOFTWARE_DEV', label: '소프트웨어 개발' },
  { value: 'AI_ML', label: 'AI/ML 프로젝트' },
  { value: 'INFRASTRUCTURE', label: '인프라 구축' },
  { value: 'CONSULTING', label: '컨설팅' },
  { value: 'CUSTOM', label: '사용자 정의' },
];

export default function TemplateLibrary({
  projectId,
  targetPhaseId,
  targetPhaseName,
  methodologyPhases,
  canEdit = true,
  onApplySuccess,
}: TemplateLibraryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'ALL'>('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [templateToApply, setTemplateToApply] = useState<TemplateSet | null>(null);
  const [templateToEdit, setTemplateToEdit] = useState<TemplateSet | null>(null);
  const [importJson, setImportJson] = useState('');

  const { data: templates = [], isLoading, refetch } = useTemplateSets(
    selectedCategory === 'ALL' ? undefined : selectedCategory
  );

  const createMutation = useCreateTemplateSet();
  const deleteMutation = useDeleteTemplateSet();
  const duplicateMutation = useDuplicateTemplateSet();
  const exportMutation = useExportTemplate();
  const importMutation = useImportTemplate();
  const updateMutation = useUpdateTemplateSet();

  // Filter templates by search term
  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.tags?.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleDelete = async (id: string) => {
    if (window.confirm('이 템플릿을 삭제하시겠습니까?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleDuplicate = async (id: string) => {
    await duplicateMutation.mutateAsync(id);
  };

  const handleExport = async (id: string) => {
    const json = await exportMutation.mutateAsync(id);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `template-${id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!importJson.trim()) return;
    try {
      await importMutation.mutateAsync(importJson);
      setShowImportModal(false);
      setImportJson('');
    } catch (error) {
      alert('템플릿 가져오기에 실패했습니다. JSON 형식을 확인해주세요.');
    }
  };

  const handleApply = (template: TemplateSet) => {
    setTemplateToApply(template);
  };

  const handleEdit = (template: TemplateSet) => {
    setTemplateToEdit(template);
  };

  const handleSaveEdit = async (updatedTemplate: TemplateSet) => {
    await updateMutation.mutateAsync({ id: updatedTemplate.id, data: updatedTemplate });
    setTemplateToEdit(null);
    refetch();
  };

  const handleApplySuccess = (phaseIds: string[]) => {
    setTemplateToApply(null);
    if (onApplySuccess) {
      onApplySuccess(phaseIds);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
              <LayoutTemplate size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">템플릿 라이브러리</h2>
              <p className="text-sm text-gray-500">
                Phase 및 WBS 템플릿을 관리하고 프로젝트에 적용합니다
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refetch()}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              title="새로고침"
            >
              <RefreshCw size={18} />
            </button>
            {canEdit && (
              <>
                <button
                  type="button"
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center gap-2 px-3 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  <Upload size={16} />
                  가져오기
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  <Plus size={16} />
                  새 템플릿
                </button>
              </>
            )}
          </div>
        </div>

        {/* Search and Filter */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="템플릿 검색..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as TemplateCategory | 'ALL')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="text-indigo-600 animate-spin" />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {searchTerm ? (
              <>
                <p>&quot;{searchTerm}&quot;에 대한 검색 결과가 없습니다.</p>
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="mt-2 text-indigo-600 hover:text-indigo-800"
                >
                  검색 초기화
                </button>
              </>
            ) : (
              <p>사용 가능한 템플릿이 없습니다.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredTemplates.map((template) => (
              <TemplateSetCard
                key={template.id}
                template={template}
                onEdit={canEdit ? handleEdit : undefined}
                onDuplicate={canEdit ? handleDuplicate : undefined}
                onDelete={canEdit ? handleDelete : undefined}
                onExport={handleExport}
                onApply={projectId ? handleApply : undefined}
                canEdit={canEdit}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateTemplateModal
          onClose={() => setShowCreateModal(false)}
          onCreate={async (data) => {
            await createMutation.mutateAsync(data);
            setShowCreateModal(false);
          }}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">템플릿 가져오기</h3>
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportJson('');
                }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              내보낸 템플릿 JSON 파일의 내용을 붙여넣으세요.
            </p>

            <textarea
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              placeholder='{"id": "...", "name": "...", ...}'
              className="w-full h-48 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <div className="flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportJson('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={!importJson.trim() || importMutation.isPending}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {importMutation.isPending ? '가져오는 중...' : '가져오기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Apply Template Modal */}
      {templateToApply && projectId && (
        <ApplyTemplateModal
          template={templateToApply}
          projectId={projectId}
          targetPhaseId={targetPhaseId}
          targetPhaseName={targetPhaseName}
          methodologyPhases={methodologyPhases}
          onClose={() => setTemplateToApply(null)}
          onSuccess={handleApplySuccess}
        />
      )}

      {/* Template Editor Modal */}
      {templateToEdit && (
        <TemplateEditor
          template={templateToEdit}
          onSave={handleSaveEdit}
          onClose={() => setTemplateToEdit(null)}
          isLoading={updateMutation.isPending}
        />
      )}
    </div>
  );
}

// Create Template Modal Component
function CreateTemplateModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: { name: string; description: string; category: TemplateCategory; tags: string[] }) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TemplateCategory>('CUSTOM');
  const [tagsInput, setTagsInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      await onCreate({
        name,
        description,
        category,
        tags: tagsInput
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">새 템플릿 만들기</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              템플릿 이름 *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 보험 프로젝트 표준 템플릿"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              설명
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="템플릿에 대한 설명을 입력하세요"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              카테고리
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TemplateCategory)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {CATEGORIES.filter((c) => c.value !== 'ALL').map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              태그 (쉼표로 구분)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="예: 보험, 심사, 청구"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!name.trim() || isSubmitting}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSubmitting ? '생성 중...' : '템플릿 생성'}
          </button>
        </div>
      </div>
    </div>
  );
}
