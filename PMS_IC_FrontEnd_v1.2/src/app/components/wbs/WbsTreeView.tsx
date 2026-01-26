import { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  FolderTree,
  Folder,
  FileText,
  Link2,
  Calendar,
  Clock,
  User,
} from 'lucide-react';
import {
  WbsGroup,
  WbsItem,
  WbsTask,
  WbsGroupWithItems,
  WbsItemWithTasks,
  WbsStatus,
  getWbsStatusColor,
  getWbsStatusLabel,
  isOverdue,
  getDaysRemaining,
} from '../../../types/wbs';
import {
  usePhaseWbs,
  useCreateWbsGroup,
  useUpdateWbsGroup,
  useDeleteWbsGroup,
  useCreateWbsItem,
  useUpdateWbsItem,
  useDeleteWbsItem,
  useCreateWbsTask,
  useUpdateWbsTask,
  useDeleteWbsTask,
  useRecalculateProgress,
} from '../../../hooks/api/useWbs';
import WbsProgressBar from './WbsProgressBar';

interface WbsTreeViewProps {
  phaseId: string;
  phaseName: string;
  phaseCode?: string;
  canEdit: boolean;
  onLinkStory?: (wbsItemId: string) => void;
  onLinkTask?: (wbsTaskId: string) => void;
}

interface WbsTaskItemProps {
  task: WbsTask;
  canEdit: boolean;
  onEdit: (task: WbsTask) => void;
  onDelete: (taskId: string) => void;
  onUpdateProgress: (taskId: string, progress: number) => void;
  onLinkTask?: (wbsTaskId: string) => void;
}

interface WbsItemRowProps {
  item: WbsItemWithTasks;
  canEdit: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: (item: WbsItem) => void;
  onDelete: (itemId: string) => void;
  onAddTask: (itemId: string) => void;
  onEditTask: (task: WbsTask) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateTaskProgress: (taskId: string, progress: number) => void;
  onLinkStory?: (wbsItemId: string) => void;
  onLinkTask?: (wbsTaskId: string) => void;
}

interface WbsGroupRowProps {
  group: WbsGroupWithItems;
  canEdit: boolean;
  isExpanded: boolean;
  expandedItems: Set<string>;
  onToggle: () => void;
  onToggleItem: (itemId: string) => void;
  onEdit: (group: WbsGroup) => void;
  onDelete: (groupId: string) => void;
  onAddItem: (groupId: string) => void;
  onEditItem: (item: WbsItem) => void;
  onDeleteItem: (itemId: string) => void;
  onAddTask: (itemId: string) => void;
  onEditTask: (task: WbsTask) => void;
  onDeleteTask: (taskId: string) => void;
  onUpdateTaskProgress: (taskId: string, progress: number) => void;
  onLinkStory?: (wbsItemId: string) => void;
  onLinkTask?: (wbsTaskId: string) => void;
}

// Task Item Component
function WbsTaskItem({
  task,
  canEdit,
  onEdit,
  onDelete,
  onUpdateProgress,
  onLinkTask,
}: WbsTaskItemProps) {
  const [showProgressSlider, setShowProgressSlider] = useState(false);
  const daysRemaining = getDaysRemaining(task.plannedEndDate);
  const overdue = isOverdue(task.plannedEndDate) && task.status !== 'COMPLETED';

  return (
    <div className="group flex items-center gap-2 py-2 px-3 ml-12 rounded-lg hover:bg-gray-50 transition-colors border-l-2 border-gray-100">
      <FileText size={14} className="text-gray-400 flex-shrink-0" />
      <span className="text-xs text-gray-400 font-mono w-16">{task.code}</span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-800 truncate">{task.name}</span>
          <span className={`px-1.5 py-0.5 text-xs rounded ${getWbsStatusColor(task.status)}`}>
            {getWbsStatusLabel(task.status)}
          </span>
          {task.linkedTaskId && (
            <span className="px-1.5 py-0.5 text-xs rounded bg-purple-100 text-purple-700">
              Task 연결됨
            </span>
          )}
        </div>

        {/* Task details */}
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
          {task.assigneeName && (
            <span className="flex items-center gap-1">
              <User size={10} />
              {task.assigneeName}
            </span>
          )}
          {task.estimatedHours && (
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {task.estimatedHours}h
            </span>
          )}
          {task.plannedEndDate && (
            <span className={`flex items-center gap-1 ${overdue ? 'text-red-500' : ''}`}>
              <Calendar size={10} />
              {daysRemaining !== null
                ? daysRemaining >= 0
                  ? `D-${daysRemaining}`
                  : `${Math.abs(daysRemaining)}일 초과`
                : task.plannedEndDate}
            </span>
          )}
        </div>
      </div>

      {/* Progress control */}
      <div className="flex items-center gap-2">
        {showProgressSlider ? (
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="100"
              step="10"
              value={task.progress}
              onChange={(e) => onUpdateProgress(task.id, parseInt(e.target.value))}
              className="w-20 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-xs font-medium w-8">{task.progress}%</span>
            <button
              type="button"
              onClick={() => setShowProgressSlider(false)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              확인
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => canEdit && setShowProgressSlider(true)}
            className="w-16"
            disabled={!canEdit}
          >
            <WbsProgressBar progress={task.progress} size="sm" showLabel={false} />
          </button>
        )}
        <span className="text-xs font-medium text-gray-600 w-8">{task.progress}%</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onLinkTask && (
          <button
            type="button"
            onClick={() => onLinkTask(task.id)}
            className="p-1 text-gray-400 hover:text-purple-600 rounded"
            title="Task 연결"
          >
            <Link2 size={14} />
          </button>
        )}
        {canEdit && (
          <>
            <button
              type="button"
              onClick={() => onEdit(task)}
              className="p-1 text-gray-400 hover:text-blue-600 rounded"
              title="수정"
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              onClick={() => onDelete(task.id)}
              className="p-1 text-gray-400 hover:text-red-600 rounded"
              title="삭제"
            >
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Item Row Component
function WbsItemRow({
  item,
  canEdit,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onUpdateTaskProgress,
  onLinkStory,
  onLinkTask,
}: WbsItemRowProps) {
  return (
    <div className="ml-6">
      {/* Item header */}
      <div
        className="flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-gray-50 cursor-pointer group"
        onClick={onToggle}
      >
        <button type="button" className="p-0.5">
          {isExpanded ? (
            <ChevronDown size={16} className="text-gray-400" />
          ) : (
            <ChevronRight size={16} className="text-gray-400" />
          )}
        </button>
        <Folder size={16} className="text-amber-500" />
        <span className="text-xs text-gray-400 font-mono w-16">{item.code}</span>

        <span className="font-medium text-gray-800 flex-1">{item.name}</span>

        <span className={`px-1.5 py-0.5 text-xs rounded ${getWbsStatusColor(item.status)}`}>
          {getWbsStatusLabel(item.status)}
        </span>

        {item.linkedStoryIds && item.linkedStoryIds.length > 0 && (
          <span className="px-1.5 py-0.5 text-xs rounded bg-indigo-100 text-indigo-700">
            Story {item.linkedStoryIds.length}개
          </span>
        )}

        <div className="w-24">
          <WbsProgressBar progress={item.calculatedProgress} size="sm" />
        </div>

        <span className="text-xs text-gray-500">
          {item.completedTasks}/{item.totalTasks} 완료
        </span>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onLinkStory && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onLinkStory(item.id);
              }}
              className="p-1 text-gray-400 hover:text-indigo-600 rounded"
              title="Story 연결"
            >
              <Link2 size={14} />
            </button>
          )}
          {canEdit && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddTask(item.id);
                }}
                className="p-1 text-gray-400 hover:text-green-600 rounded"
                title="Task 추가"
              >
                <Plus size={14} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(item);
                }}
                className="p-1 text-gray-400 hover:text-blue-600 rounded"
                title="수정"
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item.id);
                }}
                className="p-1 text-gray-400 hover:text-red-600 rounded"
                title="삭제"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tasks */}
      {isExpanded && (
        <div className="border-l-2 border-gray-100 ml-4">
          {item.tasks.length === 0 ? (
            <div className="py-2 px-3 ml-8 text-sm text-gray-400">WBS Task 없음</div>
          ) : (
            item.tasks.map((task) => (
              <WbsTaskItem
                key={task.id}
                task={task}
                canEdit={canEdit}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
                onUpdateProgress={onUpdateTaskProgress}
                onLinkTask={onLinkTask}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Group Row Component
function WbsGroupRow({
  group,
  canEdit,
  isExpanded,
  expandedItems,
  onToggle,
  onToggleItem,
  onEdit,
  onDelete,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onUpdateTaskProgress,
  onLinkStory,
  onLinkTask,
}: WbsGroupRowProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Group Header */}
      <div
        className="flex items-center gap-3 p-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={onToggle}
      >
        <button type="button" className="p-0.5">
          {isExpanded ? (
            <ChevronDown size={18} className="text-gray-500" />
          ) : (
            <ChevronRight size={18} className="text-gray-500" />
          )}
        </button>
        <FolderTree size={18} className="text-blue-600" />
        <span className="text-sm text-gray-500 font-mono">{group.code}</span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-gray-900 truncate">{group.name}</h4>
            <span className={`px-1.5 py-0.5 text-xs rounded ${getWbsStatusColor(group.status)}`}>
              {getWbsStatusLabel(group.status)}
            </span>
          </div>
          {group.description && (
            <p className="text-xs text-gray-500 truncate">{group.description}</p>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="w-32">
            <WbsProgressBar progress={group.calculatedProgress} size="md" />
          </div>
          <div className="text-sm text-right">
            <div className="text-gray-600">
              <span className="font-medium">{group.completedItems}</span>
              <span className="text-gray-400">/{group.totalItems} 항목</span>
            </div>
            <div className="text-xs text-gray-400">
              {group.completedTasks}/{group.totalTasks} 작업
            </div>
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddItem(group.id);
              }}
              className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
              title="Item 추가"
            >
              <Plus size={16} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(group);
              }}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="수정"
            >
              <Pencil size={16} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(group.id);
              }}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="삭제"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Group Content */}
      {isExpanded && (
        <div className="p-2 border-t border-gray-100">
          {group.items.length === 0 ? (
            <div className="py-4 text-center text-gray-400 text-sm">
              WBS Item을 추가하세요
            </div>
          ) : (
            group.items.map((item) => (
              <WbsItemRow
                key={item.id}
                item={item}
                canEdit={canEdit}
                isExpanded={expandedItems.has(item.id)}
                onToggle={() => onToggleItem(item.id)}
                onEdit={onEditItem}
                onDelete={onDeleteItem}
                onAddTask={onAddTask}
                onEditTask={onEditTask}
                onDeleteTask={onDeleteTask}
                onUpdateTaskProgress={onUpdateTaskProgress}
                onLinkStory={onLinkStory}
                onLinkTask={onLinkTask}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Main WBS Tree View Component
export default function WbsTreeView({
  phaseId,
  phaseName,
  phaseCode = '1',
  canEdit,
  onLinkStory,
  onLinkTask,
}: WbsTreeViewProps) {
  const { data: groups = [], isLoading } = usePhaseWbs(phaseId);
  const createGroupMutation = useCreateWbsGroup();
  const updateGroupMutation = useUpdateWbsGroup();
  const deleteGroupMutation = useDeleteWbsGroup();
  const createItemMutation = useCreateWbsItem();
  const updateItemMutation = useUpdateWbsItem();
  const deleteItemMutation = useDeleteWbsItem();
  const createTaskMutation = useCreateWbsTask();
  const updateTaskMutation = useUpdateWbsTask();
  const deleteTaskMutation = useDeleteWbsTask();
  const recalculateProgressMutation = useRecalculateProgress();

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Modal states
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<WbsGroup | null>(null);
  const [editingItem, setEditingItem] = useState<WbsItem | null>(null);
  const [editingTask, setEditingTask] = useState<WbsTask | null>(null);
  const [parentGroupId, setParentGroupId] = useState<string>('');
  const [parentItemId, setParentItemId] = useState<string>('');

  // Form states
  const [groupForm, setGroupForm] = useState({
    name: '',
    description: '',
    weight: 100,
    plannedStartDate: '',
    plannedEndDate: '',
  });

  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    weight: 100,
    estimatedHours: 0,
    plannedStartDate: '',
    plannedEndDate: '',
  });

  const [taskForm, setTaskForm] = useState({
    name: '',
    description: '',
    weight: 100,
    estimatedHours: 0,
    plannedStartDate: '',
    plannedEndDate: '',
  });

  // Auto-expand all groups and items when data loads
  useEffect(() => {
    if (groups && groups.length > 0) {
      // Expand all groups
      const allGroupIds = new Set(groups.map((g) => g.id));
      setExpandedGroups(allGroupIds);

      // Expand all items
      const allItemIds = new Set<string>();
      groups.forEach((group) => {
        group.items.forEach((item) => {
          allItemIds.add(item.id);
        });
      });
      setExpandedItems(allItemIds);
    }
  }, [groups]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const toggleItem = (itemId: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  // Calculate total progress
  const totalProgress =
    groups.length > 0
      ? Math.round(
          groups.reduce((sum, g) => sum + g.calculatedProgress * g.weight, 0) /
            groups.reduce((sum, g) => sum + g.weight, 0)
        )
      : 0;

  // Group handlers
  const handleAddGroup = () => {
    setEditingGroup(null);
    setGroupForm({ name: '', description: '', weight: 100, plannedStartDate: '', plannedEndDate: '' });
    setShowGroupModal(true);
  };

  const handleEditGroup = (group: WbsGroup) => {
    setEditingGroup(group);
    setGroupForm({
      name: group.name,
      description: group.description || '',
      weight: group.weight,
      plannedStartDate: group.plannedStartDate || '',
      plannedEndDate: group.plannedEndDate || '',
    });
    setShowGroupModal(true);
  };

  const handleSaveGroup = () => {
    if (!groupForm.name.trim()) {
      alert('그룹 이름을 입력해주세요.');
      return;
    }

    if (editingGroup) {
      updateGroupMutation.mutate({
        id: editingGroup.id,
        data: {
          name: groupForm.name,
          description: groupForm.description,
          weight: groupForm.weight,
          plannedStartDate: groupForm.plannedStartDate || undefined,
          plannedEndDate: groupForm.plannedEndDate || undefined,
        },
      });
    } else {
      createGroupMutation.mutate({
        name: groupForm.name,
        description: groupForm.description,
        phaseId,
        phaseCode,
        weight: groupForm.weight,
        plannedStartDate: groupForm.plannedStartDate || undefined,
        plannedEndDate: groupForm.plannedEndDate || undefined,
      });
    }
    setShowGroupModal(false);
  };

  const handleDeleteGroup = (groupId: string) => {
    if (!confirm('이 그룹과 하위 항목이 모두 삭제됩니다. 계속하시겠습니까?')) return;
    deleteGroupMutation.mutate(groupId);
  };

  // Item handlers
  const handleAddItem = (groupId: string) => {
    setParentGroupId(groupId);
    setEditingItem(null);
    setItemForm({ name: '', description: '', weight: 100, estimatedHours: 0, plannedStartDate: '', plannedEndDate: '' });
    setShowItemModal(true);
  };

  const handleEditItem = (item: WbsItem) => {
    setParentGroupId(item.groupId);
    setEditingItem(item);
    setItemForm({
      name: item.name,
      description: item.description || '',
      weight: item.weight,
      estimatedHours: item.estimatedHours || 0,
      plannedStartDate: item.plannedStartDate || '',
      plannedEndDate: item.plannedEndDate || '',
    });
    setShowItemModal(true);
  };

  const handleSaveItem = () => {
    if (!itemForm.name.trim()) {
      alert('항목 이름을 입력해주세요.');
      return;
    }

    const group = groups.find((g) => g.id === parentGroupId);

    if (editingItem) {
      updateItemMutation.mutate({
        id: editingItem.id,
        data: {
          name: itemForm.name,
          description: itemForm.description,
          weight: itemForm.weight,
          estimatedHours: itemForm.estimatedHours || undefined,
          plannedStartDate: itemForm.plannedStartDate || undefined,
          plannedEndDate: itemForm.plannedEndDate || undefined,
        },
      });
    } else {
      createItemMutation.mutate({
        name: itemForm.name,
        description: itemForm.description,
        groupId: parentGroupId,
        phaseId,
        groupCode: group?.code,
        weight: itemForm.weight,
        estimatedHours: itemForm.estimatedHours || undefined,
        plannedStartDate: itemForm.plannedStartDate || undefined,
        plannedEndDate: itemForm.plannedEndDate || undefined,
      });
    }
    setShowItemModal(false);
  };

  const handleDeleteItem = (itemId: string) => {
    if (!confirm('이 항목과 하위 작업이 모두 삭제됩니다. 계속하시겠습니까?')) return;
    deleteItemMutation.mutate(itemId);
  };

  // Task handlers
  const handleAddTask = (itemId: string) => {
    setParentItemId(itemId);
    setEditingTask(null);
    setTaskForm({ name: '', description: '', weight: 100, estimatedHours: 0, plannedStartDate: '', plannedEndDate: '' });
    setShowTaskModal(true);
  };

  const handleEditTask = (task: WbsTask) => {
    setParentItemId(task.itemId);
    setEditingTask(task);
    setTaskForm({
      name: task.name,
      description: task.description || '',
      weight: task.weight,
      estimatedHours: task.estimatedHours || 0,
      plannedStartDate: task.plannedStartDate || '',
      plannedEndDate: task.plannedEndDate || '',
    });
    setShowTaskModal(true);
  };

  const handleSaveTask = () => {
    if (!taskForm.name.trim()) {
      alert('작업 이름을 입력해주세요.');
      return;
    }

    // Find parent item and group
    let parentItem: WbsItemWithTasks | undefined;
    let parentGroup: WbsGroupWithItems | undefined;
    for (const g of groups) {
      const item = g.items.find((i) => i.id === parentItemId);
      if (item) {
        parentItem = item;
        parentGroup = g;
        break;
      }
    }

    if (editingTask) {
      updateTaskMutation.mutate({
        id: editingTask.id,
        data: {
          name: taskForm.name,
          description: taskForm.description,
          weight: taskForm.weight,
          estimatedHours: taskForm.estimatedHours || undefined,
          plannedStartDate: taskForm.plannedStartDate || undefined,
          plannedEndDate: taskForm.plannedEndDate || undefined,
        },
      });
    } else {
      createTaskMutation.mutate({
        name: taskForm.name,
        description: taskForm.description,
        itemId: parentItemId,
        groupId: parentGroup?.id || '',
        phaseId,
        itemCode: parentItem?.code,
        weight: taskForm.weight,
        estimatedHours: taskForm.estimatedHours || undefined,
        plannedStartDate: taskForm.plannedStartDate || undefined,
        plannedEndDate: taskForm.plannedEndDate || undefined,
      });
    }
    setShowTaskModal(false);
  };

  const handleDeleteTask = (taskId: string) => {
    if (!confirm('이 작업을 삭제하시겠습니까?')) return;
    deleteTaskMutation.mutate(taskId);
  };

  const handleUpdateTaskProgress = (taskId: string, progress: number) => {
    updateTaskMutation.mutate({
      id: taskId,
      data: {
        progress,
        status: progress === 100 ? 'COMPLETED' : progress > 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
      },
    });

    // Recalculate parent progress
    setTimeout(() => {
      recalculateProgressMutation.mutate(phaseId);
    }, 100);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <FolderTree className="text-blue-600" size={20} />
            {phaseName} - WBS
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Work Breakdown Structure (총 진행률: {totalProgress}%)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-32">
            <WbsProgressBar progress={totalProgress} size="md" />
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={handleAddGroup}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
            >
              <Plus size={16} />
              WBS 그룹 추가
            </button>
          )}
        </div>
      </div>

      {/* WBS Tree */}
      <div className="space-y-2">
        {groups.length === 0 ? (
          <div className="bg-white rounded-lg border border-dashed border-gray-300 p-8 text-center">
            <FolderTree className="mx-auto text-gray-300 mb-2" size={32} />
            <p className="text-gray-500 mb-2">WBS 항목이 없습니다</p>
            {canEdit && (
              <button
                type="button"
                onClick={handleAddGroup}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                첫 번째 WBS 그룹 추가하기
              </button>
            )}
          </div>
        ) : (
          groups.map((group) => (
            <WbsGroupRow
              key={group.id}
              group={group}
              canEdit={canEdit}
              isExpanded={expandedGroups.has(group.id)}
              expandedItems={expandedItems}
              onToggle={() => toggleGroup(group.id)}
              onToggleItem={toggleItem}
              onEdit={handleEditGroup}
              onDelete={handleDeleteGroup}
              onAddItem={handleAddItem}
              onEditItem={handleEditItem}
              onDeleteItem={handleDeleteItem}
              onAddTask={handleAddTask}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              onUpdateTaskProgress={handleUpdateTaskProgress}
              onLinkStory={onLinkStory}
              onLinkTask={onLinkTask}
            />
          ))
        )}
      </div>

      {/* Group Modal */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingGroup ? 'WBS 그룹 수정' : 'WBS 그룹 추가'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">그룹 이름 *</label>
                <input
                  type="text"
                  value={groupForm.name}
                  onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                  placeholder="예: 요구사항 분석"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                <textarea
                  value={groupForm.description}
                  onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                  placeholder="그룹에 대한 설명"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
                  <input
                    type="date"
                    value={groupForm.plannedStartDate}
                    onChange={(e) => setGroupForm({ ...groupForm, plannedStartDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">종료일</label>
                  <input
                    type="date"
                    value={groupForm.plannedEndDate}
                    onChange={(e) => setGroupForm({ ...groupForm, plannedEndDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  가중치 ({groupForm.weight}%)
                </label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={groupForm.weight}
                  onChange={(e) => setGroupForm({ ...groupForm, weight: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={handleSaveGroup}
                disabled={createGroupMutation.isPending || updateGroupMutation.isPending}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {createGroupMutation.isPending || updateGroupMutation.isPending ? '저장 중...' : '저장'}
              </button>
              <button
                type="button"
                onClick={() => setShowGroupModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingItem ? 'WBS 항목 수정' : 'WBS 항목 추가'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">항목 이름 *</label>
                <input
                  type="text"
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  placeholder="예: 요구사항 수집"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                <textarea
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  placeholder="항목에 대한 설명"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
                  <input
                    type="date"
                    value={itemForm.plannedStartDate}
                    onChange={(e) => setItemForm({ ...itemForm, plannedStartDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">종료일</label>
                  <input
                    type="date"
                    value={itemForm.plannedEndDate}
                    onChange={(e) => setItemForm({ ...itemForm, plannedEndDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">예상 공수 (시간)</label>
                <input
                  type="number"
                  min="0"
                  value={itemForm.estimatedHours}
                  onChange={(e) => setItemForm({ ...itemForm, estimatedHours: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  가중치 ({itemForm.weight}%)
                </label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={itemForm.weight}
                  onChange={(e) => setItemForm({ ...itemForm, weight: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={handleSaveItem}
                disabled={createItemMutation.isPending || updateItemMutation.isPending}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {createItemMutation.isPending || updateItemMutation.isPending ? '저장 중...' : '저장'}
              </button>
              <button
                type="button"
                onClick={() => setShowItemModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingTask ? 'WBS 작업 수정' : 'WBS 작업 추가'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">작업 이름 *</label>
                <input
                  type="text"
                  value={taskForm.name}
                  onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
                  placeholder="예: 인터뷰 진행"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                <textarea
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  placeholder="작업에 대한 설명"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
                  <input
                    type="date"
                    value={taskForm.plannedStartDate}
                    onChange={(e) => setTaskForm({ ...taskForm, plannedStartDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">종료일</label>
                  <input
                    type="date"
                    value={taskForm.plannedEndDate}
                    onChange={(e) => setTaskForm({ ...taskForm, plannedEndDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">예상 공수 (시간)</label>
                <input
                  type="number"
                  min="0"
                  value={taskForm.estimatedHours}
                  onChange={(e) => setTaskForm({ ...taskForm, estimatedHours: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  가중치 ({taskForm.weight}%)
                </label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={taskForm.weight}
                  onChange={(e) => setTaskForm({ ...taskForm, weight: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={handleSaveTask}
                disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {createTaskMutation.isPending || updateTaskMutation.isPending ? '저장 중...' : '저장'}
              </button>
              <button
                type="button"
                onClick={() => setShowTaskModal(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
