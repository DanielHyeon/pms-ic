import { useState, useCallback } from 'react';
import {
  X,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Save,
  FolderTree,
  FileText,
  ListTodo,
  Edit2,
  Check,
} from 'lucide-react';
import {
  TemplateSet,
  PhaseTemplate,
  WbsGroupTemplate,
  WbsItemTemplate,
  WbsTaskTemplate,
  TemplateCategory,
  generateTemplateId,
} from '../../../types/templates';

interface TemplateEditorProps {
  template: TemplateSet;
  onSave: (template: TemplateSet) => void;
  onClose: () => void;
  isLoading?: boolean;
}

const CATEGORIES: Array<{ value: TemplateCategory; label: string }> = [
  { value: 'INSURANCE', label: '보험 프로젝트' },
  { value: 'SOFTWARE_DEV', label: '소프트웨어 개발' },
  { value: 'AI_ML', label: 'AI/ML 프로젝트' },
  { value: 'INFRASTRUCTURE', label: '인프라 구축' },
  { value: 'CONSULTING', label: '컨설팅' },
  { value: 'CUSTOM', label: '사용자 정의' },
];

const DEFAULT_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

export default function TemplateEditor({
  template,
  onSave,
  onClose,
  isLoading = false,
}: TemplateEditorProps) {
  const [editedTemplate, setEditedTemplate] = useState<TemplateSet>(() => ({
    ...template,
    phases: template.phases.map(p => ({ ...p })),
  }));
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [tagsInput, setTagsInput] = useState(template.tags?.join(', ') || '');

  // Update basic template info
  const updateTemplateInfo = useCallback((field: keyof TemplateSet, value: any) => {
    setEditedTemplate(prev => ({ ...prev, [field]: value }));
  }, []);

  // Toggle expansion
  const togglePhase = (phaseId: string) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      if (next.has(phaseId)) next.delete(phaseId);
      else next.add(phaseId);
      return next;
    });
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const toggleItem = (itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  // Phase operations
  const addPhase = () => {
    const newPhase: PhaseTemplate = {
      id: generateTemplateId('phase'),
      name: '새 단계',
      description: '',
      relativeOrder: editedTemplate.phases.length + 1,
      defaultDurationDays: 30,
      wbsGroups: [],
      deliverables: [],
      kpis: [],
      color: DEFAULT_COLORS[editedTemplate.phases.length % DEFAULT_COLORS.length],
    };
    setEditedTemplate(prev => ({
      ...prev,
      phases: [...prev.phases, newPhase],
    }));
    setExpandedPhases(prev => new Set([...prev, newPhase.id]));
    setEditingPhaseId(newPhase.id);
  };

  const updatePhase = (phaseId: string, updates: Partial<PhaseTemplate>) => {
    setEditedTemplate(prev => ({
      ...prev,
      phases: prev.phases.map(p => (p.id === phaseId ? { ...p, ...updates } : p)),
    }));
  };

  const deletePhase = (phaseId: string) => {
    if (!window.confirm('이 단계를 삭제하시겠습니까? 하위 WBS도 모두 삭제됩니다.')) return;
    setEditedTemplate(prev => ({
      ...prev,
      phases: prev.phases.filter(p => p.id !== phaseId),
    }));
  };

  // WBS Group operations
  const addWbsGroup = (phaseId: string) => {
    const newGroup: WbsGroupTemplate = {
      id: generateTemplateId('group'),
      name: '새 WBS 그룹',
      description: '',
      relativeOrder: 1,
      defaultWeight: 100,
      items: [],
    };
    setEditedTemplate(prev => ({
      ...prev,
      phases: prev.phases.map(p => {
        if (p.id !== phaseId) return p;
        const groups = [...p.wbsGroups, { ...newGroup, relativeOrder: p.wbsGroups.length + 1 }];
        return { ...p, wbsGroups: groups };
      }),
    }));
    setExpandedGroups(prev => new Set([...prev, newGroup.id]));
    setEditingGroupId(newGroup.id);
  };

  const updateWbsGroup = (phaseId: string, groupId: string, updates: Partial<WbsGroupTemplate>) => {
    setEditedTemplate(prev => ({
      ...prev,
      phases: prev.phases.map(p => {
        if (p.id !== phaseId) return p;
        return {
          ...p,
          wbsGroups: p.wbsGroups.map(g => (g.id === groupId ? { ...g, ...updates } : g)),
        };
      }),
    }));
  };

  const deleteWbsGroup = (phaseId: string, groupId: string) => {
    if (!window.confirm('이 WBS 그룹을 삭제하시겠습니까?')) return;
    setEditedTemplate(prev => ({
      ...prev,
      phases: prev.phases.map(p => {
        if (p.id !== phaseId) return p;
        return { ...p, wbsGroups: p.wbsGroups.filter(g => g.id !== groupId) };
      }),
    }));
  };

  // WBS Item operations
  const addWbsItem = (phaseId: string, groupId: string) => {
    const newItem: WbsItemTemplate = {
      id: generateTemplateId('item'),
      name: '새 WBS 항목',
      description: '',
      relativeOrder: 1,
      defaultWeight: 100,
      tasks: [],
    };
    setEditedTemplate(prev => ({
      ...prev,
      phases: prev.phases.map(p => {
        if (p.id !== phaseId) return p;
        return {
          ...p,
          wbsGroups: p.wbsGroups.map(g => {
            if (g.id !== groupId) return g;
            const items = [...g.items, { ...newItem, relativeOrder: g.items.length + 1 }];
            return { ...g, items };
          }),
        };
      }),
    }));
    setExpandedItems(prev => new Set([...prev, newItem.id]));
    setEditingItemId(newItem.id);
  };

  const updateWbsItem = (
    phaseId: string,
    groupId: string,
    itemId: string,
    updates: Partial<WbsItemTemplate>
  ) => {
    setEditedTemplate(prev => ({
      ...prev,
      phases: prev.phases.map(p => {
        if (p.id !== phaseId) return p;
        return {
          ...p,
          wbsGroups: p.wbsGroups.map(g => {
            if (g.id !== groupId) return g;
            return {
              ...g,
              items: g.items.map(i => (i.id === itemId ? { ...i, ...updates } : i)),
            };
          }),
        };
      }),
    }));
  };

  const deleteWbsItem = (phaseId: string, groupId: string, itemId: string) => {
    if (!window.confirm('이 WBS 항목을 삭제하시겠습니까?')) return;
    setEditedTemplate(prev => ({
      ...prev,
      phases: prev.phases.map(p => {
        if (p.id !== phaseId) return p;
        return {
          ...p,
          wbsGroups: p.wbsGroups.map(g => {
            if (g.id !== groupId) return g;
            return { ...g, items: g.items.filter(i => i.id !== itemId) };
          }),
        };
      }),
    }));
  };

  // WBS Task operations
  const addWbsTask = (phaseId: string, groupId: string, itemId: string) => {
    const newTask: WbsTaskTemplate = {
      id: generateTemplateId('task'),
      name: '새 작업',
      description: '',
      relativeOrder: 1,
      defaultWeight: 100,
    };
    setEditedTemplate(prev => ({
      ...prev,
      phases: prev.phases.map(p => {
        if (p.id !== phaseId) return p;
        return {
          ...p,
          wbsGroups: p.wbsGroups.map(g => {
            if (g.id !== groupId) return g;
            return {
              ...g,
              items: g.items.map(i => {
                if (i.id !== itemId) return i;
                const tasks = [...i.tasks, { ...newTask, relativeOrder: i.tasks.length + 1 }];
                return { ...i, tasks };
              }),
            };
          }),
        };
      }),
    }));
    setEditingTaskId(newTask.id);
  };

  const updateWbsTask = (
    phaseId: string,
    groupId: string,
    itemId: string,
    taskId: string,
    updates: Partial<WbsTaskTemplate>
  ) => {
    setEditedTemplate(prev => ({
      ...prev,
      phases: prev.phases.map(p => {
        if (p.id !== phaseId) return p;
        return {
          ...p,
          wbsGroups: p.wbsGroups.map(g => {
            if (g.id !== groupId) return g;
            return {
              ...g,
              items: g.items.map(i => {
                if (i.id !== itemId) return i;
                return {
                  ...i,
                  tasks: i.tasks.map(t => (t.id === taskId ? { ...t, ...updates } : t)),
                };
              }),
            };
          }),
        };
      }),
    }));
  };

  const deleteWbsTask = (phaseId: string, groupId: string, itemId: string, taskId: string) => {
    setEditedTemplate(prev => ({
      ...prev,
      phases: prev.phases.map(p => {
        if (p.id !== phaseId) return p;
        return {
          ...p,
          wbsGroups: p.wbsGroups.map(g => {
            if (g.id !== groupId) return g;
            return {
              ...g,
              items: g.items.map(i => {
                if (i.id !== itemId) return i;
                return { ...i, tasks: i.tasks.filter(t => t.id !== taskId) };
              }),
            };
          }),
        };
      }),
    }));
  };

  // Handle save
  const handleSave = () => {
    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
    onSave({ ...editedTemplate, tags, updatedAt: new Date().toISOString() });
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-t-xl">
          <div>
            <h2 className="text-xl font-bold">템플릿 편집</h2>
            <p className="text-sm text-white/80">Phase 및 WBS 구조를 편집합니다</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Basic Info */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-gray-900">기본 정보</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  템플릿 이름 *
                </label>
                <input
                  type="text"
                  value={editedTemplate.name}
                  onChange={e => updateTemplateInfo('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">카테고리</label>
                <select
                  value={editedTemplate.category}
                  onChange={e => updateTemplateInfo('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
              <textarea
                value={editedTemplate.description || ''}
                onChange={e => updateTemplateInfo('description', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                태그 (쉼표로 구분)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
                placeholder="예: 보험, AI, 심사"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Phases */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">
                Phase 구조 ({editedTemplate.phases.length}개)
              </h3>
              <button
                type="button"
                onClick={addPhase}
                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
              >
                <Plus size={16} />
                단계 추가
              </button>
            </div>

            <div className="space-y-3">
              {editedTemplate.phases.map((phase, phaseIndex) => (
                <PhaseEditor
                  key={phase.id}
                  phase={phase}
                  index={phaseIndex}
                  isExpanded={expandedPhases.has(phase.id)}
                  onToggle={() => togglePhase(phase.id)}
                  onUpdate={updates => updatePhase(phase.id, updates)}
                  onDelete={() => deletePhase(phase.id)}
                  isEditing={editingPhaseId === phase.id}
                  onStartEdit={() => setEditingPhaseId(phase.id)}
                  onEndEdit={() => setEditingPhaseId(null)}
                  // WBS Group props
                  expandedGroups={expandedGroups}
                  onToggleGroup={toggleGroup}
                  onAddGroup={() => addWbsGroup(phase.id)}
                  onUpdateGroup={(groupId, updates) => updateWbsGroup(phase.id, groupId, updates)}
                  onDeleteGroup={groupId => deleteWbsGroup(phase.id, groupId)}
                  editingGroupId={editingGroupId}
                  onStartEditGroup={setEditingGroupId}
                  onEndEditGroup={() => setEditingGroupId(null)}
                  // WBS Item props
                  expandedItems={expandedItems}
                  onToggleItem={toggleItem}
                  onAddItem={groupId => addWbsItem(phase.id, groupId)}
                  onUpdateItem={(groupId, itemId, updates) =>
                    updateWbsItem(phase.id, groupId, itemId, updates)
                  }
                  onDeleteItem={(groupId, itemId) => deleteWbsItem(phase.id, groupId, itemId)}
                  editingItemId={editingItemId}
                  onStartEditItem={setEditingItemId}
                  onEndEditItem={() => setEditingItemId(null)}
                  // WBS Task props
                  onAddTask={(groupId, itemId) => addWbsTask(phase.id, groupId, itemId)}
                  onUpdateTask={(groupId, itemId, taskId, updates) =>
                    updateWbsTask(phase.id, groupId, itemId, taskId, updates)
                  }
                  onDeleteTask={(groupId, itemId, taskId) =>
                    deleteWbsTask(phase.id, groupId, itemId, taskId)
                  }
                  editingTaskId={editingTaskId}
                  onStartEditTask={setEditingTaskId}
                  onEndEditTask={() => setEditingTaskId(null)}
                />
              ))}

              {editedTemplate.phases.length === 0 && (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                  <p>Phase가 없습니다. "단계 추가" 버튼을 클릭하여 추가하세요.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading || !editedTemplate.name.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            <Save size={18} />
            {isLoading ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Phase Editor Component
interface PhaseEditorProps {
  phase: PhaseTemplate;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (updates: Partial<PhaseTemplate>) => void;
  onDelete: () => void;
  isEditing: boolean;
  onStartEdit: () => void;
  onEndEdit: () => void;
  // WBS Group
  expandedGroups: Set<string>;
  onToggleGroup: (groupId: string) => void;
  onAddGroup: () => void;
  onUpdateGroup: (groupId: string, updates: Partial<WbsGroupTemplate>) => void;
  onDeleteGroup: (groupId: string) => void;
  editingGroupId: string | null;
  onStartEditGroup: (groupId: string) => void;
  onEndEditGroup: () => void;
  // WBS Item
  expandedItems: Set<string>;
  onToggleItem: (itemId: string) => void;
  onAddItem: (groupId: string) => void;
  onUpdateItem: (groupId: string, itemId: string, updates: Partial<WbsItemTemplate>) => void;
  onDeleteItem: (groupId: string, itemId: string) => void;
  editingItemId: string | null;
  onStartEditItem: (itemId: string) => void;
  onEndEditItem: () => void;
  // WBS Task
  onAddTask: (groupId: string, itemId: string) => void;
  onUpdateTask: (
    groupId: string,
    itemId: string,
    taskId: string,
    updates: Partial<WbsTaskTemplate>
  ) => void;
  onDeleteTask: (groupId: string, itemId: string, taskId: string) => void;
  editingTaskId: string | null;
  onStartEditTask: (taskId: string) => void;
  onEndEditTask: () => void;
}

function PhaseEditor({
  phase,
  index,
  isExpanded,
  onToggle,
  onUpdate,
  onDelete,
  isEditing,
  onStartEdit,
  onEndEdit,
  expandedGroups,
  onToggleGroup,
  onAddGroup,
  onUpdateGroup,
  onDeleteGroup,
  editingGroupId,
  onStartEditGroup,
  onEndEditGroup,
  expandedItems,
  onToggleItem,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  editingItemId,
  onStartEditItem,
  onEndEditItem,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  editingTaskId,
  onStartEditTask,
  onEndEditTask,
}: PhaseEditorProps) {
  const [localName, setLocalName] = useState(phase.name);
  const [localDescription, setLocalDescription] = useState(phase.description || '');
  const [localDuration, setLocalDuration] = useState(phase.defaultDurationDays?.toString() || '30');

  const handleSaveEdit = () => {
    onUpdate({
      name: localName,
      description: localDescription,
      defaultDurationDays: parseInt(localDuration, 10) || 30,
    });
    onEndEdit();
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Phase Header */}
      <div
        className="flex items-center gap-3 p-3 bg-white hover:bg-gray-50 cursor-pointer"
        onClick={onToggle}
      >
        <div className="text-gray-400">
          <GripVertical size={16} />
        </div>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
          style={{ backgroundColor: phase.color || '#6366F1' }}
        >
          {index + 1}
        </div>
        {isEditing ? (
          <div className="flex-1 flex items-center gap-2" onClick={e => e.stopPropagation()}>
            <input
              type="text"
              value={localName}
              onChange={e => setLocalName(e.target.value)}
              className="flex-1 px-2 py-1 border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
            <input
              type="number"
              value={localDuration}
              onChange={e => setLocalDuration(e.target.value)}
              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
              placeholder="일수"
            />
            <button
              type="button"
              onClick={handleSaveEdit}
              className="p-1 text-green-600 hover:bg-green-50 rounded"
            >
              <Check size={18} />
            </button>
          </div>
        ) : (
          <div className="flex-1">
            <span className="font-medium text-gray-900">{phase.name}</span>
            {phase.defaultDurationDays && (
              <span className="text-xs text-gray-500 ml-2">({phase.defaultDurationDays}일)</span>
            )}
          </div>
        )}
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <span className="text-xs text-gray-400 mr-2">
            {phase.wbsGroups.length} Groups
          </span>
          {!isEditing && (
            <button
              type="button"
              onClick={onStartEdit}
              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
            >
              <Edit2 size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
          >
            <Trash2 size={14} />
          </button>
        </div>
        {isExpanded ? (
          <ChevronDown size={18} className="text-gray-400" />
        ) : (
          <ChevronRight size={18} className="text-gray-400" />
        )}
      </div>

      {/* Phase Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 bg-gray-50 p-3">
          {/* Description */}
          {isEditing && (
            <div className="mb-3">
              <input
                type="text"
                value={localDescription}
                onChange={e => setLocalDescription(e.target.value)}
                placeholder="단계 설명"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          )}

          {/* WBS Groups */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <FolderTree size={14} />
                WBS Groups
              </span>
              <button
                type="button"
                onClick={onAddGroup}
                className="flex items-center gap-1 px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded"
              >
                <Plus size={14} />
                그룹 추가
              </button>
            </div>

            {phase.wbsGroups.map(group => (
              <WbsGroupEditor
                key={group.id}
                group={group}
                isExpanded={expandedGroups.has(group.id)}
                onToggle={() => onToggleGroup(group.id)}
                onUpdate={updates => onUpdateGroup(group.id, updates)}
                onDelete={() => onDeleteGroup(group.id)}
                isEditing={editingGroupId === group.id}
                onStartEdit={() => onStartEditGroup(group.id)}
                onEndEdit={onEndEditGroup}
                // Items
                expandedItems={expandedItems}
                onToggleItem={onToggleItem}
                onAddItem={() => onAddItem(group.id)}
                onUpdateItem={(itemId, updates) => onUpdateItem(group.id, itemId, updates)}
                onDeleteItem={itemId => onDeleteItem(group.id, itemId)}
                editingItemId={editingItemId}
                onStartEditItem={onStartEditItem}
                onEndEditItem={onEndEditItem}
                // Tasks
                onAddTask={itemId => onAddTask(group.id, itemId)}
                onUpdateTask={(itemId, taskId, updates) =>
                  onUpdateTask(group.id, itemId, taskId, updates)
                }
                onDeleteTask={(itemId, taskId) => onDeleteTask(group.id, itemId, taskId)}
                editingTaskId={editingTaskId}
                onStartEditTask={onStartEditTask}
                onEndEditTask={onEndEditTask}
              />
            ))}

            {phase.wbsGroups.length === 0 && (
              <div className="text-center py-4 text-xs text-gray-400 border border-dashed border-gray-300 rounded">
                WBS 그룹이 없습니다
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// WBS Group Editor
interface WbsGroupEditorProps {
  group: WbsGroupTemplate;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (updates: Partial<WbsGroupTemplate>) => void;
  onDelete: () => void;
  isEditing: boolean;
  onStartEdit: () => void;
  onEndEdit: () => void;
  expandedItems: Set<string>;
  onToggleItem: (itemId: string) => void;
  onAddItem: () => void;
  onUpdateItem: (itemId: string, updates: Partial<WbsItemTemplate>) => void;
  onDeleteItem: (itemId: string) => void;
  editingItemId: string | null;
  onStartEditItem: (itemId: string) => void;
  onEndEditItem: () => void;
  onAddTask: (itemId: string) => void;
  onUpdateTask: (itemId: string, taskId: string, updates: Partial<WbsTaskTemplate>) => void;
  onDeleteTask: (itemId: string, taskId: string) => void;
  editingTaskId: string | null;
  onStartEditTask: (taskId: string) => void;
  onEndEditTask: () => void;
}

function WbsGroupEditor({
  group,
  isExpanded,
  onToggle,
  onUpdate,
  onDelete,
  isEditing,
  onStartEdit,
  onEndEdit,
  expandedItems,
  onToggleItem,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  editingItemId,
  onStartEditItem,
  onEndEditItem,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  editingTaskId,
  onStartEditTask,
  onEndEditTask,
}: WbsGroupEditorProps) {
  const [localName, setLocalName] = useState(group.name);

  const handleSave = () => {
    onUpdate({ name: localName });
    onEndEdit();
  };

  return (
    <div className="ml-4 border-l-2 border-indigo-200 pl-3">
      <div
        className="flex items-center gap-2 py-1.5 hover:bg-white/50 rounded cursor-pointer"
        onClick={onToggle}
      >
        {isExpanded ? (
          <ChevronDown size={14} className="text-gray-400" />
        ) : (
          <ChevronRight size={14} className="text-gray-400" />
        )}
        <FolderTree size={14} className="text-indigo-500" />
        {isEditing ? (
          <div className="flex-1 flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <input
              type="text"
              value={localName}
              onChange={e => setLocalName(e.target.value)}
              className="flex-1 px-2 py-0.5 border border-indigo-300 rounded text-sm"
              autoFocus
            />
            <button onClick={handleSave} className="p-0.5 text-green-600 hover:bg-green-50 rounded">
              <Check size={14} />
            </button>
          </div>
        ) : (
          <span className="flex-1 text-sm text-gray-700">{group.name}</span>
        )}
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <span className="text-xs text-gray-400">{group.items.length}</span>
          {!isEditing && (
            <button
              onClick={onStartEdit}
              className="p-1 text-gray-400 hover:text-indigo-600 rounded"
            >
              <Edit2 size={12} />
            </button>
          )}
          <button onClick={onDelete} className="p-1 text-gray-400 hover:text-red-600 rounded">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-1 space-y-1">
          {group.items.map(item => (
            <WbsItemEditor
              key={item.id}
              item={item}
              isExpanded={expandedItems.has(item.id)}
              onToggle={() => onToggleItem(item.id)}
              onUpdate={updates => onUpdateItem(item.id, updates)}
              onDelete={() => onDeleteItem(item.id)}
              isEditing={editingItemId === item.id}
              onStartEdit={() => onStartEditItem(item.id)}
              onEndEdit={onEndEditItem}
              onAddTask={() => onAddTask(item.id)}
              onUpdateTask={(taskId, updates) => onUpdateTask(item.id, taskId, updates)}
              onDeleteTask={taskId => onDeleteTask(item.id, taskId)}
              editingTaskId={editingTaskId}
              onStartEditTask={onStartEditTask}
              onEndEditTask={onEndEditTask}
            />
          ))}
          <button
            type="button"
            onClick={onAddItem}
            className="flex items-center gap-1 ml-4 px-2 py-1 text-xs text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded"
          >
            <Plus size={12} />
            항목 추가
          </button>
        </div>
      )}
    </div>
  );
}

// WBS Item Editor
interface WbsItemEditorProps {
  item: WbsItemTemplate;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (updates: Partial<WbsItemTemplate>) => void;
  onDelete: () => void;
  isEditing: boolean;
  onStartEdit: () => void;
  onEndEdit: () => void;
  onAddTask: () => void;
  onUpdateTask: (taskId: string, updates: Partial<WbsTaskTemplate>) => void;
  onDeleteTask: (taskId: string) => void;
  editingTaskId: string | null;
  onStartEditTask: (taskId: string) => void;
  onEndEditTask: () => void;
}

function WbsItemEditor({
  item,
  isExpanded,
  onToggle,
  onUpdate,
  onDelete,
  isEditing,
  onStartEdit,
  onEndEdit,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  editingTaskId,
  onStartEditTask,
  onEndEditTask,
}: WbsItemEditorProps) {
  const [localName, setLocalName] = useState(item.name);

  const handleSave = () => {
    onUpdate({ name: localName });
    onEndEdit();
  };

  return (
    <div className="ml-4 border-l border-gray-300 pl-3">
      <div
        className="flex items-center gap-2 py-1 hover:bg-white/50 rounded cursor-pointer"
        onClick={onToggle}
      >
        {isExpanded ? (
          <ChevronDown size={12} className="text-gray-400" />
        ) : (
          <ChevronRight size={12} className="text-gray-400" />
        )}
        <FileText size={12} className="text-emerald-500" />
        {isEditing ? (
          <div className="flex-1 flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <input
              type="text"
              value={localName}
              onChange={e => setLocalName(e.target.value)}
              className="flex-1 px-2 py-0.5 border border-emerald-300 rounded text-xs"
              autoFocus
            />
            <button onClick={handleSave} className="p-0.5 text-green-600 hover:bg-green-50 rounded">
              <Check size={12} />
            </button>
          </div>
        ) : (
          <span className="flex-1 text-xs text-gray-600">{item.name}</span>
        )}
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <span className="text-xs text-gray-400">{item.tasks.length}</span>
          {!isEditing && (
            <button
              onClick={onStartEdit}
              className="p-0.5 text-gray-400 hover:text-emerald-600 rounded"
            >
              <Edit2 size={10} />
            </button>
          )}
          <button onClick={onDelete} className="p-0.5 text-gray-400 hover:text-red-600 rounded">
            <Trash2 size={10} />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-1 ml-4 space-y-1">
          {item.tasks.map(task => (
            <TaskEditor
              key={task.id}
              task={task}
              onUpdate={updates => onUpdateTask(task.id, updates)}
              onDelete={() => onDeleteTask(task.id)}
              isEditing={editingTaskId === task.id}
              onStartEdit={() => onStartEditTask(task.id)}
              onEndEdit={onEndEditTask}
            />
          ))}
          <button
            type="button"
            onClick={onAddTask}
            className="flex items-center gap-1 px-2 py-0.5 text-xs text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded"
          >
            <Plus size={10} />
            작업 추가
          </button>
        </div>
      )}
    </div>
  );
}

// Task Editor
interface TaskEditorProps {
  task: WbsTaskTemplate;
  onUpdate: (updates: Partial<WbsTaskTemplate>) => void;
  onDelete: () => void;
  isEditing: boolean;
  onStartEdit: () => void;
  onEndEdit: () => void;
}

function TaskEditor({ task, onUpdate, onDelete, isEditing, onStartEdit, onEndEdit }: TaskEditorProps) {
  const [localName, setLocalName] = useState(task.name);

  const handleSave = () => {
    onUpdate({ name: localName });
    onEndEdit();
  };

  return (
    <div className="flex items-center gap-2 py-0.5 pl-2 border-l border-gray-200">
      <ListTodo size={10} className="text-amber-500" />
      {isEditing ? (
        <div className="flex-1 flex items-center gap-1">
          <input
            type="text"
            value={localName}
            onChange={e => setLocalName(e.target.value)}
            className="flex-1 px-1 py-0.5 border border-amber-300 rounded text-xs"
            autoFocus
          />
          <button onClick={handleSave} className="p-0.5 text-green-600 hover:bg-green-50 rounded">
            <Check size={10} />
          </button>
        </div>
      ) : (
        <span className="flex-1 text-xs text-gray-500">{task.name}</span>
      )}
      <div className="flex items-center gap-0.5">
        {!isEditing && (
          <button
            onClick={onStartEdit}
            className="p-0.5 text-gray-300 hover:text-amber-600 rounded"
          >
            <Edit2 size={10} />
          </button>
        )}
        <button onClick={onDelete} className="p-0.5 text-gray-300 hover:text-red-600 rounded">
          <Trash2 size={10} />
        </button>
      </div>
    </div>
  );
}
