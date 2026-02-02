# 프론트엔드 문서

> **버전**: 2.0 | **상태**: Final | **최종 수정일**: 2026-02-02

<!-- affects: frontend -->

---

## 이 문서가 답하는 질문

- 프론트엔드는 어떻게 구성되어 있는가?
- 상태 관리는 어떻게 동작하는가?
- API 호출은 어떻게 이루어지는가?
- 라우팅과 인증은 어떻게 처리되는가?

---

## 이 섹션의 문서

| 문서 | 목적 |
|------|------|
| [state_management.md](./state_management.md) | Zustand 스토어와 React Query |
| [api_binding.md](./api_binding.md) | API 통합 패턴 |
| [component_structure.md](./component_structure.md) | 컴포넌트 구성 |

---

## 1. 기술 스택

| 컴포넌트 | 기술 | 목적 |
|----------|------|------|
| Framework | React 18 | UI 프레임워크 |
| Language | TypeScript | 타입 안전성 |
| Build Tool | Vite 5 | 빠른 개발 환경 |
| State | Zustand | 클라이언트 상태 관리 |
| Server State | TanStack Query | API 캐싱 및 동기화 |
| UI Components | shadcn/ui | 컴포넌트 라이브러리 |
| Styling | Tailwind CSS | 유틸리티 기반 CSS |
| Routing | React Router | 클라이언트 라우팅 |

---

## 2. 디렉토리 구조

```
src/
├── app/
│   └── components/      # 기능 컴포넌트
│       ├── ui/          # shadcn/ui 컴포넌트
│       ├── chat/        # AI 채팅 컴포넌트
│       ├── phases/      # 단계 관리
│       ├── wbs/         # WBS 컴포넌트
│       ├── backlog/     # 백로그/스프린트
│       ├── lineage/     # 데이터 계보
│       ├── common/      # 공유 컴포넌트
│       └── ...
├── contexts/            # React 컨텍스트
├── hooks/
│   └── api/             # TanStack Query 훅
├── services/            # API 서비스 계층
├── stores/              # Zustand 스토어
├── types/               # TypeScript 타입
├── utils/               # 유틸리티 함수
├── constants/           # 상수 및 설정
├── router/              # 라우트 정의
└── main.tsx             # 앱 진입점
```

---

## 3. 상태 관리 개요

### Zustand (클라이언트 상태)

```typescript
// stores/authStore.ts
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      token: null,
      login: (userInfo, token) => set({ user: userInfo, isAuthenticated: true, token }),
      logout: () => set({ user: null, isAuthenticated: false, token: null }),
    }),
    { name: 'auth-storage' }
  )
);
```

### TanStack Query (서버 상태)

```typescript
// hooks/api/useProjects.ts
export function useProjects() {
  return useQuery({
    queryKey: projectKeys.lists(),
    queryFn: () => apiService.getProjects(),
  });
}
```

---

## 4. 주요 설계 패턴

### API 서비스 계층

모든 API 호출은 `services/api.ts`를 통해 이루어집니다:

```typescript
const apiService = new ApiService();
apiService.getProjects();
apiService.createProject(data);
```

### 커스텀 훅 패턴

각 도메인별 전용 훅이 있습니다:

| 훅 파일 | 도메인 |
|---------|--------|
| `useProjects.ts` | 프로젝트 CRUD |
| `usePhases.ts` | 단계 관리 |
| `useTasks.ts` | 태스크/칸반 |
| `useSprints.ts` | 스프린트 관리 |
| `useChat.ts` | AI 채팅 |
| `useAuth.ts` | 인증 |

### 컨텍스트 프로바이더

| 컨텍스트 | 목적 |
|----------|------|
| `AuthContext` | 인증 상태 |
| `ProjectContext` | 현재 프로젝트 선택 |

---

## 5. 컴포넌트 카테고리

### UI 컴포넌트 (`app/components/ui/`)

shadcn/ui 기반 컴포넌트:
- Button, Input, Select, Dialog
- Card, Table, Tabs
- Sidebar, Navigation

### 기능 컴포넌트

| 컴포넌트 | 목적 |
|----------|------|
| `Dashboard.tsx` | 메인 대시보드 |
| `AIAssistant.tsx` | AI 채팅 인터페이스 |
| `ProjectManagement.tsx` | 프로젝트 CRUD |
| `WbsOverviewTree.tsx` | WBS 트리 뷰 |
| `WbsGanttChart.tsx` | 간트 차트 |
| `SprintPanel.tsx` | 스프린트 보드 |
| `LineageGraph.tsx` | 데이터 계보 시각화 |

---

## 6. 라우팅

보호된 라우트는 인증이 필요합니다:

```typescript
// router/ProtectedRoute.tsx
export function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  return children;
}
```

---

## 7. 역할 기반 접근

### 권한 검사

```typescript
// utils/rolePermissions.ts
export const canEdit = (role: UserRole): boolean => !READ_ONLY_ROLES.includes(role);
export const canApprove = (role: UserRole): boolean => APPROVE_ROLES.includes(role);
export const canManagePhases = (role: UserRole): boolean => PHASE_MANAGE_ROLES.includes(role);
```

### 메뉴 접근 제어

```typescript
// config/menuConfig.ts
export const menuAccessByRole = {
  dashboard: ['sponsor', 'pmo_head', 'pm', 'developer', 'qa', 'business_analyst'],
  admin: ['admin'],
  // ...
};
```

---

## 8. API 설정

```typescript
// services/api.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8083/api';

// API 버전 접두사
const V2 = '/v2';  // v2 엔드포인트용
```

---

## 9. 빌드 설정

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8083'
    }
  }
});
```

---

## 10. 구현 현황

| 항목 | 개수 |
|------|------|
| TSX 파일 | 165개 |
| 컴포넌트 | 60+ |
| TanStack Query 훅 | 10+ |
| Zustand 스토어 | 2개 |

---

## 11. 금지 패턴

- 직접 DOM 조작 (React 상태 사용)
- 인라인 스타일 (Tailwind 클래스 사용)
- any 타입 (적절한 TypeScript 타입 사용)
- `services/api.ts` 외부에서 API 호출
- localStorage에 민감한 데이터 저장 (토큰 제외)
- 비동기 작업에서 에러 바운더리 생략

---

## 12. 관련 문서

| 문서 | 설명 |
|------|------|
| [../02_api/](../02_api/) | API 엔드포인트 참조 |
| [../07_security/](../07_security/) | 보안 요구사항 |

---

*최종 수정일: 2026-02-02*
