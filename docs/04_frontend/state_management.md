# 상태 관리

> **버전**: 2.0 | **상태**: Final | **최종 수정일**: 2026-02-02

<!-- affects: frontend -->

---

## 이 문서가 답하는 질문

- 클라이언트 상태는 어떻게 관리되는가?
- 서버 상태는 어떻게 관리되는가?
- Zustand와 React Query는 언제 사용하는가?

---

## 1. 상태 관리 전략

| 상태 유형 | 도구 | 예시 |
|-----------|------|------|
| 클라이언트 상태 | Zustand | 인증, UI 설정 |
| 서버 상태 | TanStack Query | API 데이터, 캐시 |
| 로컬 컴포넌트 상태 | useState | 폼 입력, 토글 |
| 컴포넌트 간 공유 | Context | 현재 프로젝트 |

---

## 2. Zustand 스토어

### Auth 스토어

```typescript
// stores/authStore.ts
interface AuthState {
  user: UserInfo | null;
  isAuthenticated: boolean;
  token: string | null;
  login: (userInfo: UserInfo, token?: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      token: null,
      login: (userInfo, token) => set({
        user: userInfo,
        isAuthenticated: true,
        token: token || 'mock-token',
      }),
      logout: () => {
        set({ user: null, isAuthenticated: false, token: null });
        localStorage.removeItem('currentProjectId');
      },
    }),
    { name: 'auth-storage' }
  )
);
```

### UI 스토어

```typescript
// stores/uiStore.ts
interface UIState {
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark';
  toggleSidebar: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  theme: 'light',
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setTheme: (theme) => set({ theme }),
}));
```

---

## 3. TanStack Query (React Query)

### Query Keys 패턴

```typescript
// hooks/api/useProjects.ts
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (filters?: object) => [...projectKeys.lists(), filters] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
};
```

### Queries (읽기 작업)

```typescript
// 모든 프로젝트 조회
export function useProjects() {
  return useQuery({
    queryKey: projectKeys.lists(),
    queryFn: () => apiService.getProjects(),
  });
}

// 단일 프로젝트 조회
export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => apiService.getProject(id),
    enabled: !!id,  // id가 있을 때만 페치
  });
}
```

### Mutations (쓰기 작업)

```typescript
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => apiService.createProject(data),
    onSuccess: () => {
      // 캐시 무효화하여 목록 다시 페치
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => apiService.updateProject(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}
```

---

## 4. 컨텍스트 프로바이더

### Project 컨텍스트

```typescript
// contexts/ProjectContext.tsx
interface ProjectContextType {
  currentProject: Project | null;
  projects: ProjectSummary[];
  isLoading: boolean;
  selectProject: (projectId: string) => Promise<void>;
  refreshProjects: () => Promise<void>;
}

export function ProjectProvider({ children }) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    () => localStorage.getItem('currentProjectId')
  );

  const { data: projectList = [] } = useProjectsQuery();
  const { data: currentProject } = useProjectQuery(selectedProjectId || '');

  const selectProject = useCallback(async (projectId: string) => {
    setSelectedProjectId(projectId);
    localStorage.setItem('currentProjectId', projectId);
  }, []);

  return (
    <ProjectContext.Provider value={{ currentProject, projects, selectProject }}>
      {children}
    </ProjectContext.Provider>
  );
}

// 사용법
export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) throw new Error('useProject must be used within ProjectProvider');
  return context;
}
```

---

## 5. 언제 무엇을 사용하는가

| 시나리오 | 솔루션 |
|----------|--------|
| 사용자 로그인 상태 | Zustand (authStore) |
| 서버에서 가져온 API 데이터 | TanStack Query |
| 현재 선택된 프로젝트 | Context + localStorage |
| 폼 입력 값 | useState |
| 모달 열기/닫기 | useState |
| 전역 UI 설정 | Zustand (uiStore) |
| 캐시된 목록 데이터 | TanStack Query |

---

## 6. Query Client 설정

```typescript
// lib/queryClient.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,  // 5분
      gcTime: 10 * 60 * 1000,    // 10분 (가비지 컬렉션)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

---

## 7. 데이터 흐름 다이어그램

```
┌─────────────────────────────────────────────────────────┐
│                     Component                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │  useState   │  │  useStore   │  │  useQuery   │     │
│  │  (local)    │  │  (Zustand)  │  │  (TanStack) │     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│         │                │                │              │
└─────────│────────────────│────────────────│──────────────┘
          │                │                │
          ▼                ▼                ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │  React   │    │  Zustand │    │  Query   │
    │  State   │    │  Store   │    │  Cache   │
    └──────────┘    └──────────┘    └──────────┘
                         │                │
                         ▼                ▼
                   localStorage      API Service
```

---

## 8. 모범 사례

### 해야 할 것 (DO)

- Query keys를 일관되게 사용
- Mutation 후 관련 쿼리 무효화
- 조건부 페칭에 `enabled` 옵션 사용
- Zustand persist 미들웨어로 중요 상태 영속화
- 타입 안전성을 위해 TypeScript 사용

### 하지 말아야 할 것 (DON'T)

- Zustand 스토어에 서버 상태 혼합
- 로컬 상태에 API 데이터 중복 저장
- 로딩/에러 상태 처리 누락
- 서버 상태가 아닌 것에 React Query 사용
- 파생 상태 저장 (렌더링 시 계산)

---

*최종 수정일: 2026-02-02*
