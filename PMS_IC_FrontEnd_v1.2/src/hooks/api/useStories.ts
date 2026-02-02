import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { UserStory, StoryStatus } from '../../utils/storyTypes';

export type { UserStory };

const initialStories: UserStory[] = [
  {
    id: 1,
    title: '사용자로서 영수증 이미지를 업로드하면 자동으로 항목이 추출되기를 원한다',
    description: '영수증 OCR 기능 구현',
    priority: 1,
    storyPoints: 8,
    status: 'IN_SPRINT',
    assignee: '이영희',
    epic: 'OCR 엔진',
    acceptanceCriteria: [
      '영수증 이미지 업로드 시 95% 이상 정확도로 텍스트 추출',
      '병원명, 진료일, 금액 등 핵심 항목 자동 인식',
      '인식 결과를 사용자가 수정할 수 있는 UI 제공',
    ],
  },
  {
    id: 2,
    title: '심사자로서 AI의 판단 근거를 명확히 확인하여 신뢰성을 검증하고 싶다',
    description: 'AI 설명 가능성(XAI) 기능 구현',
    priority: 2,
    storyPoints: 13,
    status: 'READY',
    epic: 'AI 모델',
    acceptanceCriteria: [
      'AI 판단의 주요 근거(약관 조항, 유사 판례 등) 제공',
      '신뢰도 점수 표시 (0-100%)',
      '판단 근거를 시각적으로 하이라이트',
    ],
  },
  {
    id: 3,
    title: '관리자로서 모델의 성능 지표를 실시간으로 모니터링하고 싶다',
    description: '모델 성능 대시보드 구축',
    priority: 3,
    storyPoints: 5,
    status: 'DONE',
    assignee: '박민수',
    epic: '인프라',
    acceptanceCriteria: [
      '정확도, 재현율, F1-Score 등 핵심 지표 시각화',
      '일별/주별 성능 추이 그래프',
      '이상 징후 감지 시 알림 기능',
    ],
  },
  {
    id: 4,
    title: '개발자로서 학습 데이터를 쉽게 라벨링하고 관리하고 싶다',
    description: '데이터 라벨링 도구 개발',
    priority: 4,
    storyPoints: 8,
    status: 'READY',
    epic: '데이터 관리',
    acceptanceCriteria: [
      '이미지 및 텍스트 데이터 라벨링 UI',
      '라벨링 품질 검증 기능',
      '팀 간 라벨링 작업 분배 및 진행률 추적',
    ],
  },
  {
    id: 5,
    title: '사용자로서 진단서를 업로드하면 자동으로 질병명과 진료 내용이 분류되기를 원한다',
    description: '진단서 자동 분류 기능',
    priority: 5,
    storyPoints: 13,
    status: 'READY',
    epic: 'OCR 엔진',
    acceptanceCriteria: [
      '진단서 이미지에서 질병명 자동 추출',
      '진료 내용을 보험 약관 항목으로 자동 매핑',
      '98% 이상의 분류 정확도',
    ],
  },
  {
    id: 6,
    title: '심사자로서 과거 유사 케이스를 빠르게 검색하여 참고하고 싶다',
    description: '유사 케이스 검색 엔진',
    priority: 6,
    storyPoints: 8,
    status: 'READY',
    epic: 'AI 모델',
    acceptanceCriteria: [
      '의미 기반 검색(Semantic Search) 기능',
      '검색 결과에 유사도 점수 표시',
      '검색 결과를 심사 화면에 바로 참조',
    ],
  },
];

export const storyKeys = {
  all: ['stories'] as const,
  lists: () => [...storyKeys.all, 'list'] as const,
  list: (filters?: object) => [...storyKeys.lists(), filters] as const,
  details: () => [...storyKeys.all, 'detail'] as const,
  detail: (id: number) => [...storyKeys.details(), id] as const,
};

export function useStories() {
  return useQuery<UserStory[]>({
    queryKey: storyKeys.lists(),
    queryFn: async () => {
      try {
        // Check localStorage first
        const savedStories = localStorage.getItem('backlog_stories');
        if (savedStories) {
          return JSON.parse(savedStories);
        }
        const data = await apiService.getStories();
        if (data && data.length > 0) {
          return data;
        }
        return initialStories;
      } catch {
        return initialStories;
      }
    },
  });
}

export function useCreateStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      title: string;
      description: string;
      epic: string;
      acceptanceCriteria: string[];
    }) => apiService.createStory(data),
    onSuccess: (newStory) => {
      queryClient.setQueryData<UserStory[]>(storyKeys.lists(), (old = []) => {
        const updated = [...old, newStory];
        localStorage.setItem('backlog_stories', JSON.stringify(updated));
        return updated;
      });
    },
  });
}

export function useUpdateStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<UserStory> }) =>
      apiService.updateStory(id, data),
    onSuccess: (_, { id, data }) => {
      queryClient.setQueryData<UserStory[]>(storyKeys.lists(), (old = []) => {
        const updated = old.map((s) => (s.id === id ? { ...s, ...data } : s));
        localStorage.setItem('backlog_stories', JSON.stringify(updated));
        return updated;
      });
    },
  });
}

export function useUpdateStoryPriority() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, direction }: { id: number; direction: 'up' | 'down' }) =>
      apiService.updateStoryPriority(id, direction),
    onSuccess: (updatedStories, { id, direction }) => {
      if (updatedStories && updatedStories.length > 0) {
        queryClient.setQueryData<UserStory[]>(storyKeys.lists(), updatedStories);
        localStorage.setItem('backlog_stories', JSON.stringify(updatedStories));
      } else {
        // Fallback to local update
        queryClient.setQueryData<UserStory[]>(storyKeys.lists(), (old = []) => {
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
          localStorage.setItem('backlog_stories', JSON.stringify(newStories));
          return newStories;
        });
      }
    },
  });
}

export function useDeleteStory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiService.deleteStory(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<UserStory[]>(storyKeys.lists(), (old = []) => {
        const updated = old.filter((s) => String(s.id) !== id);
        localStorage.setItem('backlog_stories', JSON.stringify(updated));
        return updated;
      });
    },
  });
}
