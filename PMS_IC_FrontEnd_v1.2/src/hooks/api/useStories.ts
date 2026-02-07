import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { unwrapOrThrow } from '../../utils/toViewState';
import { UserStory, StoryStatus } from '../../utils/storyTypes';

export type { UserStory };

// Mock data matching actual database records (task.user_stories)
const initialStories: UserStory[] = [
  {
    id: 'story-001-01',
    title: 'OCR 문서 업로드',
    description: '보험심사 담당자로서, 스캔한 문서를 업로드하여 시스템이 자동으로 텍스트를 추출할 수 있게 하고 싶습니다',
    priority: 1,
    storyPoints: 8,
    status: 'COMPLETED',
    sprintId: 'sprint-001-01',
    epic: '문서 처리',
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
    sprintId: 'sprint-001-03',
    epic: '사기 탐지',
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
    status: 'SELECTED',
    sprintId: 'sprint-001-03',
    epic: 'API 플랫폼',
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
    status: 'BACKLOG',
    epic: '보안',
    acceptanceCriteria: [
      'AES-256 암호화 적용',
      '전송 중 및 저장 시 암호화',
      '암호화 키 관리 체계 구축',
    ],
  },
  {
    id: 'story-001-05',
    title: 'AI 모델 훈련 환경 구축',
    description: 'AI 엔지니어로서, GPU 클러스터에서 모델을 훈련할 수 있는 환경이 필요합니다',
    priority: 5,
    storyPoints: 8,
    status: 'READY',
    epic: 'AI 인프라',
    acceptanceCriteria: [
      'GPU 클러스터 설정 완료',
      '훈련 파이프라인 자동화',
      '모델 버전 관리 시스템',
    ],
  },
  {
    id: 'story-001-06',
    title: 'OCR 정확도 검증',
    description: 'QA 담당자로서, OCR 정확도가 99% 이상인지 검증할 수 있어야 합니다',
    priority: 6,
    storyPoints: 5,
    status: 'READY',
    epic: '품질 관리',
    acceptanceCriteria: [
      '정확도 측정 자동화 테스트',
      '테스트 데이터셋 구축',
      '정확도 리포트 자동 생성',
    ],
  },
  {
    id: 'story-001-07',
    title: '레거시 시스템 연동 어댑터',
    description: '개발자로서, 기존 보험증권 시스템과 데이터를 주고받을 수 있어야 합니다',
    priority: 7,
    storyPoints: 13,
    status: 'READY',
    epic: '시스템 연동',
    acceptanceCriteria: [
      '레거시 API 어댑터 구현',
      '데이터 변환 로직 구현',
      '에러 처리 및 재시도 로직',
    ],
  },
  {
    id: 'story-001-08',
    title: '배포 자동화 파이프라인',
    description: 'DevOps 엔지니어로서, CI/CD 파이프라인을 통해 자동 배포할 수 있어야 합니다',
    priority: 8,
    storyPoints: 8,
    status: 'READY',
    epic: 'DevOps',
    acceptanceCriteria: [
      'GitHub Actions CI/CD 파이프라인',
      '자동 테스트 및 빌드',
      '스테이징/프로덕션 배포 자동화',
    ],
  },
];

export const storyKeys = {
  all: ['stories'] as const,
  lists: () => [...storyKeys.all, 'list'] as const,
  list: (projectId?: string, filters?: object) => [...storyKeys.lists(), { projectId, ...filters }] as const,
  details: () => [...storyKeys.all, 'detail'] as const,
  detail: (id: number | string) => [...storyKeys.details(), id] as const,
};

export function useStories(projectId?: string) {
  return useQuery<UserStory[]>({
    queryKey: storyKeys.list(projectId),
    queryFn: async () => {
      // Only return mock data when no project is selected (for demo/preview)
      if (!projectId) {
        return initialStories;
      }
      // Check localStorage first for this project
      const storageKey = `backlog_stories_${projectId}`;
      const savedStories = localStorage.getItem(storageKey);
      if (savedStories) {
        const parsed = JSON.parse(savedStories);
        if (parsed && parsed.length > 0) {
          return parsed;
        }
      }
      // Call the correct API endpoint via Result pattern
      const result = await apiService.getStoriesResult(projectId);
      const data = unwrapOrThrow(result);
      // Return actual data (even if empty) when projectId is provided
      if (data && Array.isArray(data)) {
        // Transform API response to match frontend UserStory type
        return data.map((story: any) => ({
          id: story.id,
          title: story.title,
          description: story.description,
          priority: story.priorityOrder || story.priority,
          storyPoints: story.storyPoints,
          status: story.status,
          assignee: story.assigneeId,
          epic: story.epic,
          featureId: story.featureId,
          sprintId: story.sprintId,
          acceptanceCriteria: story.acceptanceCriteriaList || [],
        }));
      }
      return []; // Return empty array if no data for this project
    },
    enabled: true,
  });
}

export function useCreateStory(projectId?: string) {
  const queryClient = useQueryClient();
  const storageKey = projectId ? `backlog_stories_${projectId}` : 'backlog_stories';

  return useMutation({
    mutationFn: async (data: {
      title: string;
      description: string;
      epic: string;
      acceptanceCriteria: string[];
    }) => {
      const result = await apiService.createStoryResult(data);
      return unwrapOrThrow(result);
    },
    onSuccess: (newStory) => {
      queryClient.setQueryData<UserStory[]>(storyKeys.list(projectId), (old = []) => {
        const updated = [...old, newStory];
        localStorage.setItem(storageKey, JSON.stringify(updated));
        return updated;
      });
    },
  });
}

export function useUpdateStory(projectId?: string) {
  const queryClient = useQueryClient();
  const storageKey = projectId ? `backlog_stories_${projectId}` : 'backlog_stories';

  return useMutation({
    mutationFn: async ({ id, data }: { id: number | string; data: Partial<UserStory> }) => {
      const result = await apiService.updateStoryResult(id, data);
      return unwrapOrThrow(result);
    },
    onSuccess: (_, { id, data }) => {
      queryClient.setQueryData<UserStory[]>(storyKeys.list(projectId), (old = []) => {
        const updated = old.map((s) => (s.id === id ? { ...s, ...data } : s));
        localStorage.setItem(storageKey, JSON.stringify(updated));
        return updated;
      });
    },
  });
}

export function useUpdateStoryPriority(projectId?: string) {
  const queryClient = useQueryClient();
  const storageKey = projectId ? `backlog_stories_${projectId}` : 'backlog_stories';

  return useMutation({
    mutationFn: async ({ id, direction }: { id: number | string; direction: 'up' | 'down' }) => {
      const result = await apiService.updateStoryPriorityResult(id, direction);
      return unwrapOrThrow(result);
    },
    onSuccess: (updatedStories, { id, direction }) => {
      if (updatedStories && updatedStories.length > 0) {
        queryClient.setQueryData<UserStory[]>(storyKeys.list(projectId), updatedStories);
        localStorage.setItem(storageKey, JSON.stringify(updatedStories));
      } else {
        // Fallback to local update
        queryClient.setQueryData<UserStory[]>(storyKeys.list(projectId), (old = []) => {
          const idx = old.findIndex((s) => s.id === id);
          if (idx === -1) return old;

          const newStories = [...old];
          if (direction === 'up' && idx > 0) {
            const temp = newStories[idx].priority;
            newStories[idx].priority = newStories[idx - 1].priority;
            newStories[idx - 1].priority = temp;
            [newStories[idx], newStories[idx - 1]] = [newStories[idx - 1], newStories[idx]];
          } else if (direction === 'down' && idx < newStories.length - 1) {
            const temp = newStories[idx].priority;
            newStories[idx].priority = newStories[idx + 1].priority;
            newStories[idx + 1].priority = temp;
            [newStories[idx], newStories[idx + 1]] = [newStories[idx + 1], newStories[idx]];
          }
          localStorage.setItem(storageKey, JSON.stringify(newStories));
          return newStories;
        });
      }
    },
  });
}

export function useDeleteStory(projectId?: string) {
  const queryClient = useQueryClient();
  const storageKey = projectId ? `backlog_stories_${projectId}` : 'backlog_stories';

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await apiService.deleteStoryResult(id);
      return unwrapOrThrow(result);
    },
    onSuccess: (_, id) => {
      queryClient.setQueryData<UserStory[]>(storyKeys.list(projectId), (old = []) => {
        const updated = old.filter((s) => String(s.id) !== id);
        localStorage.setItem(storageKey, JSON.stringify(updated));
        return updated;
      });
    },
  });
}
