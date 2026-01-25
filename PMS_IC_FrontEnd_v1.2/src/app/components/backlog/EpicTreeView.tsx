import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  Target,
  Layers,
  FileText,
  GripVertical,
} from 'lucide-react';
import {
  Epic,
  Feature,
  UserStory,
  getPriorityColor,
  getPriorityLabel,
  getStoryStatusColor,
  getStoryStatusLabel,
} from '../../../types/backlog';
import { useEpics } from '../../../hooks/api/useEpics';
import { useFeatures } from '../../../hooks/api/useFeatures';

interface EpicTreeViewProps {
  projectId: string;
  stories: UserStory[];
  onStorySelect: (story: UserStory) => void;
  onAddStory: (epicId: string, featureId?: string) => void;
  onAddEpic: () => void;
  onAddFeature: (epicId: string) => void;
  onMoveToSprint: (storyId: string) => void;
  selectedSprintId: string | null;
  canEdit: boolean;
}

interface EpicItemProps {
  epic: Epic;
  features: Feature[];
  stories: UserStory[];
  isExpanded: boolean;
  onToggle: () => void;
  onStorySelect: (story: UserStory) => void;
  onAddStory: (epicId: string, featureId?: string) => void;
  onAddFeature: (epicId: string) => void;
  onMoveToSprint: (storyId: string) => void;
  canEdit: boolean;
}

interface FeatureItemProps {
  feature: Feature;
  stories: UserStory[];
  isExpanded: boolean;
  onToggle: () => void;
  onStorySelect: (story: UserStory) => void;
  onAddStory: (featureId: string) => void;
  onMoveToSprint: (storyId: string) => void;
  canEdit: boolean;
}

interface StoryItemProps {
  story: UserStory;
  onSelect: () => void;
  onMoveToSprint: () => void;
  canEdit: boolean;
}

function StoryItem({ story, onSelect, onMoveToSprint, canEdit }: StoryItemProps) {
  return (
    <div className="group flex items-center gap-2 py-2 px-3 ml-8 rounded-lg hover:bg-gray-50 transition-colors">
      <FileText size={14} className="text-gray-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 truncate">{story.title}</span>
          <span className={`px-1.5 py-0.5 text-xs rounded ${getPriorityColor(story.priority)}`}>
            {getPriorityLabel(story.priority)}
          </span>
          <span className={`px-1.5 py-0.5 text-xs rounded ${getStoryStatusColor(story.status)}`}>
            {getStoryStatusLabel(story.status)}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {story.storyPoints && (
          <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
            {story.storyPoints} SP
          </span>
        )}
        {canEdit && story.status === 'BACKLOG' && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoveToSprint();
            }}
            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            Sprint 추가
          </button>
        )}
        <button
          type="button"
          onClick={onSelect}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
        >
          <Pencil size={14} />
        </button>
      </div>
    </div>
  );
}

function FeatureItem({
  feature,
  stories,
  isExpanded,
  onToggle,
  onStorySelect,
  onAddStory,
  onMoveToSprint,
  canEdit,
}: FeatureItemProps) {
  const featureStories = stories.filter((s) => s.featureId === feature.id);
  const completedStories = featureStories.filter((s) => s.status === 'DONE').length;

  return (
    <div className="ml-4">
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
        <Layers size={16} className="text-amber-500" />
        <span className="font-medium text-gray-800 flex-1">{feature.name}</span>
        <span className="text-xs text-gray-500">
          {completedStories}/{featureStories.length} 완료
        </span>
        {canEdit && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddStory(feature.id);
            }}
            className="p-1 text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
            title="스토리 추가"
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="border-l-2 border-gray-100 ml-3">
          {featureStories.length === 0 ? (
            <div className="py-2 px-3 ml-4 text-sm text-gray-400">스토리 없음</div>
          ) : (
            featureStories.map((story) => (
              <StoryItem
                key={story.id}
                story={story}
                onSelect={() => onStorySelect(story)}
                onMoveToSprint={() => onMoveToSprint(story.id)}
                canEdit={canEdit}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function EpicItem({
  epic,
  features,
  stories,
  isExpanded,
  onToggle,
  onStorySelect,
  onAddStory,
  onAddFeature,
  onMoveToSprint,
  canEdit,
}: EpicItemProps) {
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());

  const epicFeatures = features.filter((f) => f.epicId === epic.id);
  const epicStories = stories.filter((s) => s.epicId === epic.id);
  const directStories = epicStories.filter((s) => !s.featureId); // Stories without feature
  const totalPoints = epicStories.reduce((sum, s) => sum + (s.storyPoints || 0), 0);
  const completedPoints = epicStories
    .filter((s) => s.status === 'DONE')
    .reduce((sum, s) => sum + (s.storyPoints || 0), 0);

  const toggleFeature = (featureId: string) => {
    setExpandedFeatures((prev) => {
      const next = new Set(prev);
      if (next.has(featureId)) {
        next.delete(featureId);
      } else {
        next.add(featureId);
      }
      return next;
    });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Epic Header */}
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
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: epic.color || '#3B82F6' }}
        />
        <Target size={18} className="text-blue-600" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-gray-900 truncate">{epic.name}</h4>
            <span className={`px-1.5 py-0.5 text-xs rounded ${getPriorityColor(epic.priority)}`}>
              {getPriorityLabel(epic.priority)}
            </span>
          </div>
          {epic.description && (
            <p className="text-xs text-gray-500 truncate">{epic.description}</p>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="text-right">
            <span className="font-medium text-purple-600">{completedPoints}</span>
            <span className="text-gray-400">/{totalPoints} SP</span>
          </div>
          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full"
              style={{ width: `${totalPoints > 0 ? (completedPoints / totalPoints) * 100 : 0}%` }}
            />
          </div>
        </div>
        {canEdit && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddFeature(epic.id);
              }}
              className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
              title="Feature 추가"
            >
              <Layers size={16} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddStory(epic.id);
              }}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="스토리 추가"
            >
              <Plus size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Epic Content */}
      {isExpanded && (
        <div className="p-2 border-t border-gray-100">
          {/* Features */}
          {epicFeatures.map((feature) => (
            <FeatureItem
              key={feature.id}
              feature={feature}
              stories={epicStories}
              isExpanded={expandedFeatures.has(feature.id)}
              onToggle={() => toggleFeature(feature.id)}
              onStorySelect={onStorySelect}
              onAddStory={(featureId) => onAddStory(epic.id, featureId)}
              onMoveToSprint={onMoveToSprint}
              canEdit={canEdit}
            />
          ))}

          {/* Direct stories (without feature) */}
          {directStories.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <div className="text-xs text-gray-500 px-2 mb-1">Feature 미지정 스토리</div>
              {directStories.map((story) => (
                <StoryItem
                  key={story.id}
                  story={story}
                  onSelect={() => onStorySelect(story)}
                  onMoveToSprint={() => onMoveToSprint(story.id)}
                  canEdit={canEdit}
                />
              ))}
            </div>
          )}

          {epicFeatures.length === 0 && directStories.length === 0 && (
            <div className="py-4 text-center text-gray-400 text-sm">
              Feature 또는 스토리를 추가하세요
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function EpicTreeView({
  projectId,
  stories,
  onStorySelect,
  onAddStory,
  onAddEpic,
  onAddFeature,
  onMoveToSprint,
  selectedSprintId,
  canEdit,
}: EpicTreeViewProps) {
  const { data: epics = [] } = useEpics(projectId);
  const { data: features = [] } = useFeatures();
  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(() => {
    // Default expand first epic
    return new Set(epics.length > 0 ? [epics[0].id] : []);
  });

  const toggleEpic = (epicId: string) => {
    setExpandedEpics((prev) => {
      const next = new Set(prev);
      if (next.has(epicId)) {
        next.delete(epicId);
      } else {
        next.add(epicId);
      }
      return next;
    });
  };

  // Stories in backlog (not in any sprint)
  const backlogStories = stories.filter((s) => s.status === 'BACKLOG' && !s.sprintId);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Target className="text-blue-600" size={20} />
            제품 백로그
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Epic → Feature → User Story 계층 구조
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={onAddEpic}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
          >
            <Plus size={16} />
            Epic 추가
          </button>
        )}
      </div>

      {/* Epic Tree */}
      <div className="space-y-2">
        {epics.length === 0 ? (
          <div className="bg-white rounded-lg border border-dashed border-gray-300 p-8 text-center">
            <Target className="mx-auto text-gray-300 mb-2" size={32} />
            <p className="text-gray-500 mb-2">아직 Epic이 없습니다</p>
            {canEdit && (
              <button
                type="button"
                onClick={onAddEpic}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                첫 번째 Epic 추가하기
              </button>
            )}
          </div>
        ) : (
          epics.map((epic) => (
            <EpicItem
              key={epic.id}
              epic={epic}
              features={features}
              stories={backlogStories}
              isExpanded={expandedEpics.has(epic.id)}
              onToggle={() => toggleEpic(epic.id)}
              onStorySelect={onStorySelect}
              onAddStory={onAddStory}
              onAddFeature={onAddFeature}
              onMoveToSprint={onMoveToSprint}
              canEdit={canEdit}
            />
          ))
        )}
      </div>
    </div>
  );
}
