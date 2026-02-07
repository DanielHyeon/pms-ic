import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { unwrapOrThrow } from '../../utils/toViewState';
import { UserStory, StoryStatus, mapLegacyStatus } from '../../utils/storyTypes';

export type { UserStory };

// Mock data matching actual database records (task.user_stories)
// Synced with DB on 2026-02-07
const initialStories: UserStory[] = [
  {
    id: 'story-001-01',
    title: 'OCR 문서 업로드',
    description: '보험심사 담당자로서, 스캔한 문서를 업로드하여 시스템이 자동으로 텍스트를 추출할 수 있게 하고 싶습니다',
    priority: 1,
    storyPoints: 8,
    status: 'DONE',
    sprintId: 'sprint-001-01',
    partId: 'part-001-ai',
    epicId: 'epic-001-01',
    featureId: null,
    wbsItemId: null,
    acceptanceCriteria: [
      '다양한 이미지 포맷(JPG, PNG, PDF) 지원',
      '업로드 후 자동 텍스트 추출',
      '추출 결과 미리보기 제공',
    ],
  },
  {
    id: 'story-001-02',
    title: '사기 탐지 대시보드',
    description: '사기 분석가로서, 사기 위험 점수를 확인하여 조사 우선순위를 정할 수 있게 하고 싶습니다',
    priority: 2,
    storyPoints: 13,
    status: 'IN_PROGRESS',
    sprintId: 'sprint-001-02',
    partId: 'part-001-ai',
    epicId: 'epic-001-02',
    featureId: null,
    wbsItemId: null,
    acceptanceCriteria: [
      '실시간 사기 위험 점수 표시',
      '위험 등급별 필터링',
      '조사 우선순위 자동 추천',
    ],
  },
  {
    id: 'story-001-03',
    title: '보험청구 API 연동',
    description: '개발자로서, RESTful API를 통해 외부 시스템이 보험청구 관리 시스템과 연동할 수 있게 하고 싶습니다',
    priority: 3,
    storyPoints: 8,
    status: 'IN_SPRINT',
    sprintId: 'sprint-001-02',
    partId: 'part-001-si',
    epicId: 'epic-001-03',
    featureId: null,
    wbsItemId: null,
    acceptanceCriteria: [
      'RESTful API 명세 문서 제공',
      'OAuth2 인증 지원',
      'API 요청/응답 로깅',
    ],
  },
  {
    id: 'story-001-04',
    title: '데이터 암호화 구현',
    description: '보안 담당자로서, 모든 개인정보가 암호화되어 규정을 준수할 수 있게 하고 싶습니다',
    priority: 4,
    storyPoints: 5,
    status: 'READY',
    epicId: 'epic-001-04',
    featureId: null,
    wbsItemId: null,
    acceptanceCriteria: [
      'AES-256 암호화 적용',
      '전송 중 및 저장 시 암호화',
      '암호화 키 관리 체계 구축',
    ],
  },
];

export const storyKeys = {
  all: ['stories'] as const,
  lists: () => [...storyKeys.all, 'list'] as const,
  list: (projectId?: string, filters?: object) => [...storyKeys.lists(), { projectId, ...filters }] as const,
  details: () => [...storyKeys.all, 'detail'] as const,
  detail: (id: string) => [...storyKeys.details(), id] as const,
};

export function useStories(projectId?: string) {
  return useQuery<UserStory[]>({
    queryKey: storyKeys.list(projectId),
    queryFn: async () => {
      // Only return mock data when no project is selected (for demo/preview)
      if (!projectId) {
        return initialStories;
      }
      // Always fetch from API when projectId is provided
      const result = await apiService.getStoriesResult(projectId);
      const data = unwrapOrThrow(result);
      if (data && Array.isArray(data)) {
        return data.map((story: any) => ({
          id: story.id,
          title: story.title,
          description: story.description,
          priority: story.priorityOrder || story.priority,
          storyPoints: story.storyPoints,
          status: mapLegacyStatus(story.status),
          assignee: story.assigneeId,
          epicId: story.epicId || null,
          featureId: story.featureId || null,
          wbsItemId: story.wbsItemId || null,
          sprintId: story.sprintId,
          partId: story.partId,
          acceptanceCriteria: story.acceptanceCriteriaList || [],
        }));
      }
      return [];
    },
    enabled: true,
  });
}

export function useCreateStory(projectId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      description: string;
      epicId: string;
      acceptanceCriteria: string[];
    }) => {
      const result = await apiService.createStoryResult(data);
      return unwrapOrThrow(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storyKeys.list(projectId) });
    },
  });
}

export function useUpdateStory(projectId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<UserStory> }) => {
      const result = await apiService.updateStoryResult(id, data);
      return unwrapOrThrow(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storyKeys.list(projectId) });
    },
  });
}

export function useUpdateStoryPriority(projectId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: 'up' | 'down' }) => {
      const result = await apiService.updateStoryPriorityResult(id, direction);
      return unwrapOrThrow(result);
    },
    onSuccess: (updatedStories) => {
      if (updatedStories && updatedStories.length > 0) {
        queryClient.setQueryData<UserStory[]>(storyKeys.list(projectId), updatedStories);
      } else {
        queryClient.invalidateQueries({ queryKey: storyKeys.list(projectId) });
      }
    },
  });
}

export function useDeleteStory(projectId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await apiService.deleteStoryResult(id);
      return unwrapOrThrow(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storyKeys.list(projectId) });
    },
  });
}
