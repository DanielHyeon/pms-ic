// Lineage visualization and timeline types

export type LineageNodeType = 'RFP' | 'REQUIREMENT' | 'USER_STORY' | 'TASK' | 'SPRINT';

export type LineageRelationship =
  | 'DERIVES'
  | 'BREAKS_DOWN_TO'
  | 'IMPLEMENTED_BY'
  | 'BELONGS_TO_SPRINT';

export type LineageEventType =
  | 'REQUIREMENT_CREATED'
  | 'REQUIREMENT_UPDATED'
  | 'REQUIREMENT_DELETED'
  | 'REQUIREMENT_STATUS_CHANGED'
  | 'STORY_CREATED'
  | 'STORY_UPDATED'
  | 'STORY_DELETED'
  | 'STORY_SPRINT_ASSIGNED'
  | 'TASK_CREATED'
  | 'TASK_UPDATED'
  | 'TASK_DELETED'
  | 'TASK_STATUS_CHANGED'
  | 'REQUIREMENT_STORY_LINKED'
  | 'REQUIREMENT_STORY_UNLINKED'
  | 'STORY_TASK_LINKED'
  | 'STORY_TASK_UNLINKED'
  | 'REQUIREMENT_TASK_LINKED'
  | 'REQUIREMENT_TASK_UNLINKED'
  | 'SPRINT_CREATED'
  | 'SPRINT_STARTED'
  | 'SPRINT_COMPLETED';

export type ImpactLevel = 'DIRECT' | 'INDIRECT' | 'TRANSITIVE';

export interface LineageNodeDto {
  id: string;
  type: LineageNodeType;
  code?: string;
  title: string;
  status?: string;
  metadata: Record<string, unknown>;
}

export interface LineageEdgeDto {
  id: string;
  source: string;
  target: string;
  relationship: LineageRelationship;
  createdAt?: string;
  createdBy?: string;
}

export interface LineageStatisticsDto {
  requirements: number;
  stories: number;
  tasks: number;
  sprints: number;
  coverage: number;
  linkedRequirements: number;
  unlinkedRequirements: number;
}

export interface LineageGraphDto {
  nodes: LineageNodeDto[];
  edges: LineageEdgeDto[];
  statistics: LineageStatisticsDto;
}

export interface LineageEventDto {
  id: string;
  eventType: LineageEventType;
  aggregateType: string;
  aggregateId: string;
  entityCode?: string;
  entityTitle?: string;
  actorId: string;
  actorName: string;
  timestamp: string;
  changes: Record<string, unknown>;
  description: string;
}

export interface ImpactedEntityDto {
  id: string;
  type: string;
  code?: string;
  title: string;
  status: string;
  impactLevel: ImpactLevel;
  depth: number;
}

export interface ImpactAnalysisDto {
  sourceId: string;
  sourceType: string;
  sourceTitle: string;
  impactedStories: number;
  impactedTasks: number;
  impactedSprints: number;
  directImpacts: ImpactedEntityDto[];
  indirectImpacts: ImpactedEntityDto[];
  affectedSprintNames: string[];
}

export interface LineageTreeDto {
  root?: LineageNodeDto;
  nodes: LineageNodeDto[];
  edges: LineageEdgeDto[];
  maxDepth: number;
  totalNodes: number;
}

// UI-specific types for React Flow
export interface LineageGraphNode extends LineageNodeDto {
  position: { x: number; y: number };
  data: {
    label: string;
    nodeType: LineageNodeType;
    status?: string;
    code?: string;
    metadata: Record<string, unknown>;
  };
}

// Timeline filter options
export interface TimelineFilters {
  projectId: string;
  aggregateType?: string;
  since?: string;
  until?: string;
  userId?: string;
}

// API response wrapper
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

// Node type display configuration
export const NODE_TYPE_CONFIG: Record<LineageNodeType, {
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}> = {
  RFP: {
    label: 'RFP',
    color: '#d97706',
    bgColor: '#fef3c7',
    icon: 'FileInput',
  },
  REQUIREMENT: {
    label: '요구사항',
    color: '#2563eb',
    bgColor: '#dbeafe',
    icon: 'FileText',
  },
  USER_STORY: {
    label: '유저스토리',
    color: '#7c3aed',
    bgColor: '#ede9fe',
    icon: 'BookOpen',
  },
  TASK: {
    label: '태스크',
    color: '#059669',
    bgColor: '#d1fae5',
    icon: 'CheckSquare',
  },
  SPRINT: {
    label: '스프린트',
    color: '#dc2626',
    bgColor: '#fee2e2',
    icon: 'Zap',
  },
};

// Event type display configuration
export const EVENT_TYPE_CONFIG: Record<LineageEventType, {
  label: string;
  icon: string;
  color: string;
}> = {
  REQUIREMENT_CREATED: { label: '요구사항 생성', icon: 'Plus', color: '#22c55e' },
  REQUIREMENT_UPDATED: { label: '요구사항 수정', icon: 'Edit', color: '#3b82f6' },
  REQUIREMENT_DELETED: { label: '요구사항 삭제', icon: 'Trash', color: '#ef4444' },
  REQUIREMENT_STATUS_CHANGED: { label: '요구사항 상태 변경', icon: 'RefreshCw', color: '#f59e0b' },
  STORY_CREATED: { label: '스토리 생성', icon: 'Plus', color: '#22c55e' },
  STORY_UPDATED: { label: '스토리 수정', icon: 'Edit', color: '#3b82f6' },
  STORY_DELETED: { label: '스토리 삭제', icon: 'Trash', color: '#ef4444' },
  STORY_SPRINT_ASSIGNED: { label: '스프린트 배정', icon: 'Calendar', color: '#8b5cf6' },
  TASK_CREATED: { label: '태스크 생성', icon: 'Plus', color: '#22c55e' },
  TASK_UPDATED: { label: '태스크 수정', icon: 'Edit', color: '#3b82f6' },
  TASK_DELETED: { label: '태스크 삭제', icon: 'Trash', color: '#ef4444' },
  TASK_STATUS_CHANGED: { label: '태스크 상태 변경', icon: 'RefreshCw', color: '#f59e0b' },
  REQUIREMENT_STORY_LINKED: { label: '요구사항-스토리 연결', icon: 'Link', color: '#06b6d4' },
  REQUIREMENT_STORY_UNLINKED: { label: '요구사항-스토리 연결 해제', icon: 'Unlink', color: '#94a3b8' },
  STORY_TASK_LINKED: { label: '스토리-태스크 연결', icon: 'Link', color: '#06b6d4' },
  STORY_TASK_UNLINKED: { label: '스토리-태스크 연결 해제', icon: 'Unlink', color: '#94a3b8' },
  REQUIREMENT_TASK_LINKED: { label: '요구사항-태스크 연결', icon: 'Link', color: '#06b6d4' },
  REQUIREMENT_TASK_UNLINKED: { label: '요구사항-태스크 연결 해제', icon: 'Unlink', color: '#94a3b8' },
  SPRINT_CREATED: { label: '스프린트 생성', icon: 'Plus', color: '#22c55e' },
  SPRINT_STARTED: { label: '스프린트 시작', icon: 'Play', color: '#10b981' },
  SPRINT_COMPLETED: { label: '스프린트 완료', icon: 'CheckCircle', color: '#22c55e' },
};
