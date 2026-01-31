# Frontend Documentation

> **Version**: 1.0 | **Status**: Final | **Last Updated**: 2026-01-31

<!-- affects: frontend -->

---

## Questions This Document Answers

- How is the frontend structured?
- How does state management work?
- How are API calls made?
- How is routing and authentication handled?

---

## Documents in This Section

| Document | Purpose |
|----------|---------|
| [state_management.md](./state_management.md) | Zustand stores and React Query |
| [api_binding.md](./api_binding.md) | API integration patterns |
| [component_structure.md](./component_structure.md) | Component organization |

---

## 1. Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Framework | React 18 | UI framework |
| Language | TypeScript | Type safety |
| Build Tool | Vite | Fast development |
| State | Zustand | Client state management |
| Server State | TanStack Query | API caching & sync |
| UI Components | shadcn/ui | Component library |
| Styling | Tailwind CSS | Utility-first CSS |
| Routing | React Router | Client-side routing |

---

## 2. Directory Structure

```
src/
├── app/
│   └── components/      # Feature components
│       ├── ui/          # shadcn/ui components
│       ├── chat/        # AI chat components
│       ├── phases/      # Phase management
│       ├── wbs/         # WBS components
│       ├── backlog/     # Backlog/sprint
│       ├── lineage/     # Data lineage
│       ├── common/      # Shared components
│       └── ...
├── contexts/            # React contexts
├── hooks/
│   └── api/             # TanStack Query hooks
├── services/            # API service layer
├── stores/              # Zustand stores
├── types/               # TypeScript types
├── utils/               # Utility functions
├── constants/           # Constants & config
├── router/              # Route definitions
└── main.tsx             # App entry point
```

---

## 3. State Management Overview

### Zustand (Client State)

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

### TanStack Query (Server State)

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

## 4. Key Design Patterns

### API Service Layer

All API calls go through `services/api.ts`:

```typescript
const apiService = new ApiService();
apiService.getProjects();
apiService.createProject(data);
```

### Custom Hooks Pattern

Each domain has dedicated hooks:

| Hook File | Domain |
|-----------|--------|
| `useProjects.ts` | Project CRUD |
| `usePhases.ts` | Phase management |
| `useTasks.ts` | Task/Kanban |
| `useSprints.ts` | Sprint management |
| `useChat.ts` | AI chat |
| `useAuth.ts` | Authentication |

### Context Providers

| Context | Purpose |
|---------|---------|
| `AuthContext` | Authentication state |
| `ProjectContext` | Current project selection |

---

## 5. Component Categories

### UI Components (`app/components/ui/`)

Base components from shadcn/ui:
- Button, Input, Select, Dialog
- Card, Table, Tabs
- Sidebar, Navigation

### Feature Components

| Component | Purpose |
|-----------|---------|
| `Dashboard.tsx` | Main dashboard |
| `AIAssistant.tsx` | AI chat interface |
| `ProjectManagement.tsx` | Project CRUD |
| `WbsOverviewTree.tsx` | WBS tree view |
| `WbsGanttChart.tsx` | Gantt chart |
| `SprintPanel.tsx` | Sprint board |
| `LineageGraph.tsx` | Data lineage visualization |

---

## 6. Routing

Protected routes require authentication:

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

## 7. Role-Based Access

### Permission Checks

```typescript
// utils/rolePermissions.ts
export const canEdit = (role: UserRole): boolean => !READ_ONLY_ROLES.includes(role);
export const canApprove = (role: UserRole): boolean => APPROVE_ROLES.includes(role);
export const canManagePhases = (role: UserRole): boolean => PHASE_MANAGE_ROLES.includes(role);
```

### Menu Access Control

```typescript
// config/menuConfig.ts
export const menuAccessByRole = {
  dashboard: ['sponsor', 'pmo_head', 'pm', 'developer', 'qa', 'business_analyst'],
  admin: ['admin'],
  // ...
};
```

---

## 8. API Configuration

```typescript
// services/api.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8083/api';

// API version prefixes
const V2 = '/v2';  // For v2 endpoints
```

---

## 9. Build Configuration

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

## 10. Prohibited Patterns

- Direct DOM manipulation (use React state)
- Inline styles (use Tailwind classes)
- Any type (use proper TypeScript types)
- API calls outside `services/api.ts`
- Storing sensitive data in localStorage (except tokens)
- Skipping error boundaries on async operations

---

## 11. Related Documents

| Document | Description |
|----------|-------------|
| [../02_api/](../02_api/) | API endpoint reference |
| [../07_security/](../07_security/) | Security requirements |

---

*Last Updated: 2026-01-31*
