# API 바인딩

> **버전**: 2.0 | **상태**: Final | **최종 수정일**: 2026-02-02

<!-- affects: frontend, api -->

---

## 이 문서가 답하는 질문

- 프론트엔드는 백엔드와 어떻게 통신하는가?
- API 오류는 어떻게 처리되는가?
- API 호출에서 인증은 어떻게 관리되는가?

---

## 1. API 서비스 아키텍처

```
┌─────────────────────────────────────────────────┐
│                  Components                      │
│                      │                           │
│                      ▼                           │
│          hooks/api/useXxx.ts                     │
│          (TanStack Query 훅)                     │
│                      │                           │
│                      ▼                           │
│           services/api.ts                        │
│           (ApiService 클래스)                    │
│                      │                           │
│                      ▼                           │
│              fetch() API                         │
└─────────────────────────────────────────────────┘
                      │
                      ▼
           Backend (localhost:8083)
```

---

## 2. API 서비스 클래스

### 설정

```typescript
// services/api.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8083/api';

// API 버전 접두사
const V2 = '/v2';  // v2 엔드포인트용

export class ApiService {
  private token: string | null = null;
  private useMockData = false;

  constructor() {
    this.token = localStorage.getItem('auth_token');
    this.checkBackendAvailability();
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }
}
```

### 요청 메서드

```typescript
private async fetchWithFallback<T>(
  endpoint: string,
  options: RequestInit = {},
  mockData: T,
  timeoutMs: number = 10000
): Promise<T> {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.warn('API call failed, using mock data:', error);
    return mockData;
  }
}
```

---

## 3. API 엔드포인트 메서드

### GET 요청

```typescript
async getProjects(): Promise<Project[]> {
  return this.fetchWithFallback(
    `${V2}/projects`,
    { method: 'GET' },
    mockProjects
  );
}

async getProject(id: string): Promise<Project> {
  return this.fetchWithFallback(
    `${V2}/projects/${id}`,
    { method: 'GET' },
    mockProject
  );
}
```

### POST 요청

```typescript
async createProject(data: Partial<Project>): Promise<Project> {
  return this.fetchWithFallback(
    `${V2}/projects`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
    { ...data, id: 'mock-id' } as Project
  );
}
```

### PUT/PATCH 요청

```typescript
async updateProject(id: string, data: Partial<Project>): Promise<Project> {
  return this.fetchWithFallback(
    `${V2}/projects/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify(data),
    },
    { ...data, id } as Project
  );
}
```

### DELETE 요청

```typescript
async deleteProject(id: string): Promise<void> {
  return this.fetchWithFallback(
    `${V2}/projects/${id}`,
    { method: 'DELETE' },
    undefined
  );
}
```

---

## 4. TanStack Query 훅

### 훅 구조 패턴

```typescript
// hooks/api/useProjects.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';

// Query keys 팩토리
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  detail: (id: string) => [...projectKeys.all, 'detail', id] as const,
};

// Query 훅
export function useProjects() {
  return useQuery({
    queryKey: projectKeys.lists(),
    queryFn: () => apiService.getProjects(),
  });
}

// Mutation 훅
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => apiService.createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}
```

---

## 5. 사용 가능한 API 훅

| 훅 | 작업 |
|----|------|
| `useProjects` | 프로젝트 목록, 조회, 생성, 수정, 삭제 |
| `usePhases` | 단계 CRUD, 게이트 승인 |
| `useTasks` | 태스크 CRUD, 상태 업데이트 |
| `useSprints` | 스프린트 CRUD, 스토리 관리 |
| `useChat` | 채팅 세션, 메시지, AI 응답 |
| `useAuth` | 로그인, 로그아웃, 토큰 관리 |
| `useRfps` | RFP 문서 관리 |
| `useRequirements` | 요구사항 추적 |
| `useDeliverables` | 산출물 관리 |
| `useLineage` | 데이터 계보 쿼리 |

---

## 6. 오류 처리

### API 오류 응답

```typescript
interface ApiError {
  success: false;
  data: null;
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}
```

### 컴포넌트에서 오류 처리

```typescript
function ProjectList() {
  const { data, isLoading, isError, error } = useProjects();

  if (isLoading) return <Skeleton />;
  if (isError) return <ErrorMessage error={error} />;

  return <List items={data} />;
}
```

### 전역 오류 처리

```typescript
// Mutation 훅에서
useMutation({
  mutationFn: (data) => apiService.createProject(data),
  onError: (error) => {
    toast.error(`프로젝트 생성 실패: ${error.message}`);
  },
  onSuccess: () => {
    toast.success('프로젝트가 성공적으로 생성되었습니다');
  },
});
```

---

## 7. 인증 흐름

### 로그인

```typescript
async function handleLogin(email: string, password: string) {
  const response = await apiService.login(email, password);

  // 토큰 저장
  apiService.setToken(response.accessToken);

  // auth 스토어 업데이트
  useAuthStore.getState().login(response.user, response.accessToken);
}
```

### 인증된 요청

```typescript
// ApiService가 자동으로 토큰 추가
const headers = {
  'Content-Type': 'application/json',
  ...(this.token && { Authorization: `Bearer ${this.token}` }),
};
```

### 로그아웃

```typescript
function handleLogout() {
  apiService.clearToken();
  useAuthStore.getState().logout();
}
```

---

## 8. Mock 데이터 폴백

백엔드가 사용 불가능할 때 mock 데이터로 폴백하는 API 서비스:

```typescript
private async fetchWithFallback<T>(
  endpoint: string,
  options: RequestInit,
  mockData: T
): Promise<T> {
  try {
    // 실제 API 시도
    const response = await fetch(...);
    return await response.json();
  } catch (error) {
    // mock 데이터로 폴백
    console.warn('Using mock data');
    return mockData;
  }
}
```

---

## 9. API 버전 관리

| 버전 | 엔드포인트 | 설명 |
|------|------------|------|
| `/api/v2` | projects, chat, users, permissions, lineage, reports | 현재 v2 엔드포인트 |
| `/api` | phases, members, sprints, auth | 레거시 엔드포인트 |

---

## 10. 모범 사례

### 해야 할 것 (DO)

- 모든 API 호출에 TanStack Query 훅 사용
- 로딩과 오류 상태 처리
- Mutation 후 관련 쿼리 무효화
- API 응답에 TypeScript 타입 사용
- 적절한 타임아웃 값 설정

### 하지 말아야 할 것 (DON'T)

- 컴포넌트에서 `fetch()` 직접 호출
- 로컬 상태에 API 데이터 저장
- 오류 응답 무시
- API URL 하드코딩
- 인증 헤더 생략

---

*최종 수정일: 2026-02-02*
