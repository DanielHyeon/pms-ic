# State Management

> **Version**: 1.0 | **Status**: Final | **Last Updated**: 2026-01-31

<!-- affects: frontend -->

---

## Questions This Document Answers

- How is client state managed?
- How is server state managed?
- When to use Zustand vs React Query?

---

## 1. State Management Strategy

| State Type | Tool | Example |
|------------|------|---------|
| Client state | Zustand | Auth, UI preferences |
| Server state | TanStack Query | API data, cache |
| Local component state | useState | Form inputs, toggles |
| Cross-component | Context | Current project |

---

## 2. Zustand Stores

### Auth Store

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

### UI Store

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

### Query Keys Pattern

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

### Queries (Read Operations)

```typescript
// Get all projects
export function useProjects() {
  return useQuery({
    queryKey: projectKeys.lists(),
    queryFn: () => apiService.getProjects(),
  });
}

// Get single project
export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => apiService.getProject(id),
    enabled: !!id,  // Only fetch if id exists
  });
}
```

### Mutations (Write Operations)

```typescript
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => apiService.createProject(data),
    onSuccess: () => {
      // Invalidate cache to refetch list
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

## 4. Context Providers

### Project Context

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

// Usage
export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) throw new Error('useProject must be used within ProjectProvider');
  return context;
}
```

---

## 5. When to Use What

| Scenario | Solution |
|----------|----------|
| User login state | Zustand (authStore) |
| API data from server | TanStack Query |
| Current selected project | Context + localStorage |
| Form input values | useState |
| Modal open/close | useState |
| Global UI settings | Zustand (uiStore) |
| Cached list data | TanStack Query |

---

## 6. Query Client Configuration

```typescript
// lib/queryClient.ts
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,  // 5 minutes
      gcTime: 10 * 60 * 1000,    // 10 minutes (garbage collection)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

---

## 7. Data Flow Diagram

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

## 8. Best Practices

### DO

- Use query keys consistently
- Invalidate related queries on mutations
- Use `enabled` option for conditional fetching
- Persist critical state with Zustand persist middleware
- Use TypeScript for type safety

### DON'T

- Mix server state in Zustand stores
- Duplicate API data in local state
- Forget to handle loading/error states
- Use React Query for non-server state
- Store derived state (compute on render)

---

*Last Updated: 2026-01-31*
