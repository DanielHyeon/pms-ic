import { useState, useMemo } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Clock, AlertTriangle, Flame, Lock, Plus, Loader2 } from 'lucide-react';
import { UserRole } from '../App';
import TaskFormModal from './TaskFormModal';
import { useKanbanBoard, Task, Column as ColumnType } from '../../hooks/useKanbanBoard';
import { useKanbanTasks, organizeTasksIntoColumns, useCreateTask, useUpdateTask, useDeleteTask } from '../../hooks/api/useTasks';
import { getPriorityColor } from '../../utils/status';
import { useProject } from '../../contexts/ProjectContext';
import { usePreset } from '../../hooks/usePreset';
import { useFilterSpec } from '../../hooks/useFilterSpec';
import { PresetSwitcher } from './common/PresetSwitcher';
import { KanbanKpiRow, KanbanFilters, KANBAN_FILTER_KEYS } from './kanban';

interface TaskCardProps {
  task: Task;
  moveTask: (taskId: number, toColumn: string) => void;
  canDrag: boolean;
  onEdit: (task: Task) => void;
}

const TaskCard = ({ task, canDrag, onEdit }: Omit<TaskCardProps, 'moveTask'>) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'task',
    item: { id: task.id },
    canDrag: canDrag,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={canDrag ? (drag as unknown as React.Ref<HTMLDivElement>) : undefined}
      onClick={() => canDrag && onEdit(task)}
      className={`bg-white rounded-lg border-2 p-4 transition-all hover:shadow-md ${
        task.isFirefighting ? 'border-red-400 bg-red-50' : 'border-gray-200'
      } ${isDragging ? 'opacity-50' : ''} ${canDrag ? 'cursor-pointer' : 'cursor-default'}`}
    >
      {task.isFirefighting && (
        <div className="flex items-center gap-2 mb-2 text-red-600">
          <Flame size={16} />
          <span className="text-xs font-semibold">긴급 처리</span>
        </div>
      )}

      <h4 className="font-medium text-gray-900 text-sm mb-3">{task.title}</h4>

      <div className="flex flex-wrap gap-1 mb-3">
        {task.labels.map((label, idx) => (
          <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
            {label}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-xs">
            {task.assignee[0]}
          </div>
          <span>{task.assignee}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-2 py-0.5 rounded border ${getPriorityColor(task.priority)}`}>
            {task.storyPoints}SP
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
        <Clock size={12} />
        <span>{task.dueDate}</span>
      </div>
    </div>
  );
};

interface ColumnProps {
  column: ColumnType;
  moveTask: (taskId: number, toColumn: string) => void;
  canDrag: boolean;
  onEditTask: (task: Task) => void;
}

const KanbanColumn = ({ column, moveTask, canDrag, onEditTask }: ColumnProps) => {
  const [{ isOver }, drop] = useDrop({
    accept: 'task',
    drop: (item: { id: number }) => {
      moveTask(item.id, column.id);
    },
    canDrop: () => canDrag,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  return (
    <div
      ref={drop as unknown as React.Ref<HTMLDivElement>}
      className={`bg-gray-50 rounded-xl p-4 min-h-[600px] transition-colors ${
        isOver && canDrag ? 'bg-blue-50 ring-2 ring-blue-400' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">{column.title}</h3>
        <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded-full text-xs font-medium">
          {column.tasks.length}
        </span>
      </div>
      <div className="space-y-3">
        {column.tasks.map((task) => (
          <TaskCard key={task.id} task={task} canDrag={canDrag} onEdit={onEditTask} />
        ))}
      </div>
    </div>
  );
};

const initialColumns: ColumnType[] = [
  {
    id: 'backlog',
    title: '제품 백로그',
    tasks: [
      {
        id: 1,
        title: '진단서 이미지 전처리 알고리즘 개선',
        assignee: '박민수',
        priority: 'medium',
        storyPoints: 5,
        dueDate: '2025-08-20',
        labels: ['AI모델링', '데이터처리'],
      },
      {
        id: 2,
        title: '약관 해석 NLP 모델 베이스라인 구축',
        assignee: '김지은',
        priority: 'high',
        storyPoints: 8,
        dueDate: '2025-08-25',
        labels: ['AI모델링', 'NLP'],
      },
    ],
  },
  {
    id: 'sprint',
    title: '이번 스프린트',
    tasks: [
      {
        id: 3,
        title: 'OCR 모델 v2.1 학습 데이터 증강',
        assignee: '이영희',
        priority: 'high',
        storyPoints: 8,
        dueDate: '2025-08-18',
        labels: ['AI모델링', 'OCR'],
      },
      {
        id: 4,
        title: '영수증 항목 분류 모델 정확도 개선',
        assignee: '최지훈',
        priority: 'medium',
        storyPoints: 5,
        dueDate: '2025-08-19',
        labels: ['AI모델링', '분류'],
      },
    ],
  },
  {
    id: 'inProgress',
    title: '진행 중',
    tasks: [
      {
        id: 5,
        title: '특정 병원 진단서 양식 데이터 수집',
        assignee: '박민수',
        priority: 'high',
        storyPoints: 3,
        dueDate: '2025-08-17',
        labels: ['데이터수집'],
        isFirefighting: true,
      },
      {
        id: 6,
        title: '하이퍼파라미터 튜닝 실험 (Learning Rate)',
        assignee: '김지은',
        priority: 'medium',
        storyPoints: 5,
        dueDate: '2025-08-18',
        labels: ['AI모델링', '실험'],
      },
    ],
  },
  {
    id: 'review',
    title: '코드 리뷰',
    tasks: [
      {
        id: 7,
        title: '데이터 파이프라인 리팩토링',
        assignee: '이영희',
        priority: 'low',
        storyPoints: 3,
        dueDate: '2025-08-17',
        labels: ['인프라', '최적화'],
      },
    ],
  },
  {
    id: 'testing',
    title: '테스트 중',
    tasks: [
      {
        id: 8,
        title: 'OCR v2.0 통합 테스트',
        assignee: '최지훈',
        priority: 'high',
        storyPoints: 5,
        dueDate: '2025-08-16',
        labels: ['QA', 'OCR'],
      },
    ],
  },
  {
    id: 'done',
    title: '완료',
    tasks: [
      {
        id: 9,
        title: '모델 성능 지표 대시보드 구축',
        assignee: '박민수',
        priority: 'medium',
        storyPoints: 5,
        dueDate: '2025-08-15',
        labels: ['인프라', '모니터링'],
      },
      {
        id: 10,
        title: '데이터 비식별화 자동화 스크립트',
        assignee: '김지은',
        priority: 'high',
        storyPoints: 8,
        dueDate: '2025-08-14',
        labels: ['데이터처리', '보안'],
      },
    ],
  },
];

export default function KanbanBoard({ userRole }: { userRole: UserRole }) {
  const canEdit = ['pm', 'developer', 'qa'].includes(userRole);
  const isReadOnly = ['auditor', 'sponsor'].includes(userRole);

  // Get current project from context
  const { currentProject } = useProject();

  // Fetch tasks from API filtered by current project
  const { data: apiTasks = [], isLoading } = useKanbanTasks(currentProject?.id);
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();

  // Use local hook as fallback when API returns no data
  const { columns: localColumns, stats: localStats, moveTask, addTask, updateTask, deleteTask } = useKanbanBoard(initialColumns, canEdit);

  // Organize API tasks into columns
  // When project is selected, always use API data (even if empty)
  // Only fallback to localColumns when no project is selected
  const columns = useMemo(() => {
    if (currentProject?.id) {
      // Project selected - use API data (organize tasks by status)
      const mappedColumns = organizeTasksIntoColumns(apiTasks);
      return mappedColumns.map((col) => ({
        ...col,
        tasks: col.tasks.map((t) => ({
          id: parseInt(t.id.replace(/\D/g, '')) || Date.now(), // Convert string ID to number
          title: t.title,
          assignee: t.assignee,
          priority: t.priority,
          storyPoints: t.storyPoints,
          dueDate: t.dueDate,
          isFirefighting: t.isFirefighting,
          labels: t.labels,
        })),
      }));
    }
    // No project selected - use local mock data for demo
    return localColumns;
  }, [apiTasks, localColumns, currentProject?.id]);

  // Calculate stats from columns
  const stats = useMemo(() => {
    const totalTasks = columns.reduce((sum, col) => sum + col.tasks.length, 0);
    const completedTasks = columns.find((col) => col.id === 'done')?.tasks.length || 0;
    const inProgressTasks = columns.find((col) => col.id === 'inProgress')?.tasks.length || 0;
    const firefightingTasks = columns.reduce(
      (sum, col) => sum + col.tasks.filter((t) => t.isFirefighting).length,
      0
    );
    return { totalTasks, completedTasks, inProgressTasks, firefightingTasks };
  }, [columns]);

  // v2.0: Preset and FilterSpec integration
  const { currentPreset, switchPreset } = usePreset(userRole.toUpperCase());
  const { filters, setFilters } = useFilterSpec({ keys: KANBAN_FILTER_KEYS, syncUrl: false });

  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const handleAddTask = async (task: Task) => {
    try {
      await createTaskMutation.mutateAsync({
        data: {
          title: task.title,
          assigneeId: task.assignee,
          priority: task.priority.toUpperCase(),
          dueDate: task.dueDate,
          tags: task.labels,
          status: 'TODO',
        },
        projectId: currentProject?.id,
      });
    } catch {
      // Fallback to local state
      addTask(task);
    }
    setShowAddTaskModal(false);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowEditTaskModal(true);
  };

  const handleUpdateTask = async (task: Task) => {
    try {
      await updateTaskMutation.mutateAsync({
        id: String(task.id),
        data: {
          title: task.title,
          assigneeId: task.assignee,
          priority: task.priority.toUpperCase(),
          dueDate: task.dueDate,
          tags: task.labels,
        },
        projectId: currentProject?.id,
      });
    } catch {
      // Fallback to local state
      updateTask(task);
    }
    setShowEditTaskModal(false);
    setEditingTask(null);
  };

  const handleDeleteTask = async () => {
    if (!editingTask || !confirm('이 작업을 삭제하시겠습니까?')) return;
    try {
      await deleteTaskMutation.mutateAsync({
        id: String(editingTask.id),
        projectId: currentProject?.id,
      });
    } catch {
      // Fallback to local state
      deleteTask(editingTask.id);
    }
    setShowEditTaskModal(false);
    setEditingTask(null);
  };

  return (
    <div className="p-6">
      {isLoading && (
        <div className="mb-6 flex items-center justify-center gap-2 text-blue-600">
          <Loader2 className="animate-spin" size={20} />
          <span>작업 목록을 불러오는 중...</span>
        </div>
      )}
      {isReadOnly && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
          <Lock className="text-amber-600" size={20} />
          <div>
            <p className="text-sm font-medium text-amber-900">읽기 전용 모드</p>
            <p className="text-xs text-amber-700">작업을 조회할 수 있지만 수정할 수 없습니다.</p>
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">스크럼 보드</h2>
            <p className="text-sm text-gray-500 mt-1">Sprint 5 - AI 모델링 단계 (2025.08.05 ~ 2025.08.18)</p>
          </div>
          <PresetSwitcher currentPreset={currentPreset} onSwitch={switchPreset} compact />
          {canEdit && (
            <button
              onClick={() => setShowAddTaskModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus size={18} />
              새 작업 추가
            </button>
          )}
        </div>

        {/* KPI Row - preset-driven metrics */}
        <KanbanKpiRow preset={currentPreset} stats={stats} />

        {/* FilterSpec-based filtering */}
        <div className="mt-4">
          <KanbanFilters values={filters} onChange={setFilters} preset={currentPreset} />
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-6 gap-4 overflow-x-auto">
        {columns.map((column) => (
          <KanbanColumn key={column.id} column={column} moveTask={moveTask} canDrag={canEdit} onEditTask={handleEditTask} />
        ))}
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          💡 <span className="font-medium">사용 방법:</span>{' '}
          {canEdit
            ? '작업 카드를 드래그하여 다른 컬럼으로 이동할 수 있습니다. 긴급 처리가 필요한 작업은 빨간색으로 표시됩니다.'
            : '현재 역할은 조회만 가능합니다.'}
        </p>
      </div>

      {/* Add Task Modal */}
      <TaskFormModal
        isOpen={showAddTaskModal}
        onClose={() => setShowAddTaskModal(false)}
        onSubmit={handleAddTask}
        isEditMode={false}
      />

      {/* Edit Task Modal */}
      <TaskFormModal
        isOpen={showEditTaskModal}
        onClose={() => {
          setShowEditTaskModal(false);
          setEditingTask(null);
        }}
        task={editingTask}
        onSubmit={handleUpdateTask}
        onDelete={handleDeleteTask}
        isEditMode={true}
      />
    </div>
  );
}