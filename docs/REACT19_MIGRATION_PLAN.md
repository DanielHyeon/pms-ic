# React 19.2 Migration & Complexity Reduction Plan

## Overview

| Item | Value |
|------|-------|
| Current Version | React 18.3.1 |
| Target Version | React 19.2.x |
| UI Components | 46 files |
| Feature Components | 13 views |
| forwardRef Usage | 2 files |
| Loading State Patterns | 95 occurrences |
| Estimated Duration | 4 Phases |

---

## Phase 1: Foundation Upgrade (No Breaking Changes)

### 1.1 Dependency Updates

```bash
# Step 1: Create migration branch
git checkout -b feature/react-19-migration

# Step 2: Update React core
npm install react@19.2 react-dom@19.2

# Step 3: Update TypeScript types
npm install -D @types/react@^19 @types/react-dom@^19

# Step 4: Update Radix UI (React 19 compatible)
npm update @radix-ui/react-accordion @radix-ui/react-alert-dialog \
  @radix-ui/react-avatar @radix-ui/react-checkbox @radix-ui/react-dialog \
  @radix-ui/react-dropdown-menu @radix-ui/react-label @radix-ui/react-popover \
  @radix-ui/react-progress @radix-ui/react-radio-group @radix-ui/react-scroll-area \
  @radix-ui/react-select @radix-ui/react-separator @radix-ui/react-slider \
  @radix-ui/react-slot @radix-ui/react-switch @radix-ui/react-tabs \
  @radix-ui/react-toggle @radix-ui/react-toggle-group @radix-ui/react-tooltip

# Step 5: Update recharts with override
npm install recharts@latest
```

### 1.2 Package.json Modifications

```json
{
  "dependencies": {
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
  },
  "overrides": {
    "react-is": "^19.2.0"
  }
}
```

### 1.3 Verification Checklist

- [ ] `npm run build` succeeds
- [ ] `npm run dev` starts without errors
- [ ] All 13 views render correctly
- [ ] No console warnings about deprecated APIs
- [ ] Radix UI components function properly

---

## Phase 2: Router Modernization

### 2.1 Install React Router v7

```bash
npm install react-router@7 react-router-dom@7
```

### 2.2 Create Router Configuration

**New File: `src/router/index.tsx`**

```tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Layout from '../app/components/Layout';
import ProtectedRoute from './ProtectedRoute';

// Lazy load all views for code splitting
const Dashboard = lazy(() => import('../app/components/Dashboard'));
const ProjectManagement = lazy(() => import('../app/components/ProjectManagement'));
const PartManagement = lazy(() => import('../app/components/PartManagement'));
const RfpManagement = lazy(() => import('../app/components/RfpManagement'));
const RequirementManagement = lazy(() => import('../app/components/RequirementManagement'));
const LineageManagement = lazy(() => import('../app/components/lineage'));
const PhaseManagement = lazy(() => import('../app/components/PhaseManagement'));
const KanbanBoard = lazy(() => import('../app/components/KanbanBoard'));
const BacklogManagement = lazy(() => import('../app/components/BacklogManagement'));
const RoleManagement = lazy(() => import('../app/components/RoleManagement'));
const CommonManagement = lazy(() => import('../app/components/CommonManagement'));
const EducationManagement = lazy(() => import('../app/components/EducationManagement'));
const Settings = lazy(() => import('../app/components/Settings'));
const LoginScreen = lazy(() => import('../app/components/LoginScreen'));

const Loading = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
  </div>
);

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Suspense fallback={<Loading />}><LoginScreen /></Suspense>,
  },
  {
    path: '/',
    element: <ProtectedRoute><Layout /></ProtectedRoute>,
    children: [
      { index: true, element: <Suspense fallback={<Loading />}><Dashboard /></Suspense> },
      { path: 'projects', element: <Suspense fallback={<Loading />}><ProjectManagement /></Suspense> },
      { path: 'parts', element: <Suspense fallback={<Loading />}><PartManagement /></Suspense> },
      { path: 'rfp', element: <Suspense fallback={<Loading />}><RfpManagement /></Suspense> },
      { path: 'requirements', element: <Suspense fallback={<Loading />}><RequirementManagement /></Suspense> },
      { path: 'lineage', element: <Suspense fallback={<Loading />}><LineageManagement /></Suspense> },
      { path: 'phases', element: <Suspense fallback={<Loading />}><PhaseManagement /></Suspense> },
      { path: 'kanban', element: <Suspense fallback={<Loading />}><KanbanBoard /></Suspense> },
      { path: 'backlog', element: <Suspense fallback={<Loading />}><BacklogManagement /></Suspense> },
      { path: 'roles', element: <Suspense fallback={<Loading />}><RoleManagement /></Suspense> },
      { path: 'common', element: <Suspense fallback={<Loading />}><CommonManagement /></Suspense> },
      { path: 'education', element: <Suspense fallback={<Loading />}><EducationManagement /></Suspense> },
      { path: 'settings', element: <Suspense fallback={<Loading />}><Settings /></Suspense> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
```

### 2.3 Create Protected Route Component

**New File: `src/router/ProtectedRoute.tsx`**

```tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: string[];
}

export default function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const { isAuthenticated, legacyRole } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRoles && legacyRole && !requiredRoles.includes(legacyRole)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
```

### 2.4 Create Layout Component

**New File: `src/app/components/Layout.tsx`**

```tsx
import { Outlet } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import Sidebar from './Sidebar';
import Header from './Header';
import AIAssistant from './AIAssistant';
import ToastContainer from './ToastContainer';
import { ProjectProvider } from '../../contexts/ProjectContext';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function Layout() {
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const { user, legacyRole } = useAuth();

  const canUseAI = legacyRole &&
    ['sponsor', 'pmo_head', 'pm', 'developer', 'qa', 'business_analyst'].includes(legacyRole);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-screen bg-gray-50">
        <Sidebar userRole={legacyRole || 'pm'} />

        <ProjectProvider>
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header
              currentUser={user}
              onAIToggle={() => setAiPanelOpen(!aiPanelOpen)}
              onLogout={() => {/* handled by AuthContext */}}
              canUseAI={canUseAI}
            />

            <main className="flex-1 overflow-auto">
              <Outlet />
            </main>
          </div>

          {aiPanelOpen && canUseAI && (
            <AIAssistant onClose={() => setAiPanelOpen(false)} userRole={legacyRole || 'pm'} />
          )}
        </ProjectProvider>
        <ToastContainer />
      </div>
    </DndProvider>
  );
}
```

### 2.5 Update Sidebar Navigation

**File: `src/app/components/Sidebar.tsx`**

```tsx
// Change from:
onClick={() => onViewChange(item.id)}

// To:
import { useNavigate, useLocation } from 'react-router-dom';

const navigate = useNavigate();
const location = useLocation();

// In menu item click handler:
onClick={() => navigate(`/${item.id === 'dashboard' ? '' : item.id}`)}

// For active state:
const isActive = location.pathname === `/${item.id}` ||
  (item.id === 'dashboard' && location.pathname === '/');
```

### 2.6 Update main.tsx

**File: `src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './contexts/AuthContext';
import { AppRouter } from './router';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  </StrictMode>
);
```

### 2.7 Files to Delete/Archive

- `src/app/App.tsx` (replaced by Layout + Router)

### 2.8 Verification Checklist

- [ ] All routes accessible via URL
- [ ] Browser back/forward navigation works
- [ ] Role-based route protection works
- [ ] Code splitting reduces initial bundle
- [ ] Deep linking works (e.g., `/kanban`)

---

## Phase 3: State Management with TanStack Query

### 3.1 Install Dependencies

```bash
npm install @tanstack/react-query @tanstack/react-query-devtools zustand
```

### 3.2 Setup Query Client

**New File: `src/lib/queryClient.ts`**

```tsx
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
```

### 3.3 Create API Hooks

**New File: `src/hooks/api/useProjects.ts`**

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';

export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (filters: object) => [...projectKeys.lists(), filters] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
};

export function useProjects() {
  return useQuery({
    queryKey: projectKeys.lists(),
    queryFn: () => apiService.getProjects(),
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => apiService.getProject(id),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProjectInput) => apiService.createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectInput }) =>
      apiService.updateProject(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiService.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}
```

### 3.4 Create Additional API Hooks

**Files to create:**

| File | Purpose |
|------|---------|
| `src/hooks/api/usePhases.ts` | Phase CRUD operations |
| `src/hooks/api/useTasks.ts` | Kanban task operations |
| `src/hooks/api/useRfp.ts` | RFP management |
| `src/hooks/api/useRequirements.ts` | Requirements tracking |
| `src/hooks/api/useLineage.ts` | Lineage graph data |
| `src/hooks/api/useParts.ts` | Part management |
| `src/hooks/api/useRoles.ts` | Role management |
| `src/hooks/api/useChat.ts` | AI chat operations |

### 3.5 Create Global UI Store with Zustand

**New File: `src/stores/uiStore.ts`**

```tsx
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // AI Panel
  aiPanelOpen: boolean;
  setAiPanelOpen: (open: boolean) => void;

  // Theme (future)
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      aiPanelOpen: false,
      setAiPanelOpen: (open) => set({ aiPanelOpen: open }),

      theme: 'light',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
      }),
    }
  )
);
```

### 3.6 Update main.tsx with QueryProvider

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider } from './contexts/AuthContext';
import { AppRouter } from './router';
import { queryClient } from './lib/queryClient';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </StrictMode>
);
```

### 3.7 Refactor Component Example

**Before (ProjectManagement.tsx):**
```tsx
const [projects, setProjects] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  const fetchProjects = async () => {
    setLoading(true);
    try {
      const data = await apiService.getProjects();
      setProjects(data);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  };
  fetchProjects();
}, []);
```

**After:**
```tsx
import { useProjects, useCreateProject, useDeleteProject } from '../../hooks/api/useProjects';

const { data: projects, isLoading, error } = useProjects();
const createProject = useCreateProject();
const deleteProject = useDeleteProject();

// Create
const handleCreate = async (data) => {
  await createProject.mutateAsync(data);
  // No need to manually refetch - TanStack Query handles it
};

// Delete
const handleDelete = async (id) => {
  await deleteProject.mutateAsync(id);
};
```

### 3.8 Verification Checklist

- [ ] All API calls use TanStack Query hooks
- [ ] Data is cached and shared across components
- [ ] Loading/error states handled consistently
- [ ] DevTools show correct cache state
- [ ] Optimistic updates work for mutations

---

## Phase 4: React 19 Features Integration

### 4.1 Replace forwardRef with ref prop

**File: `src/app/components/ui/button.tsx`**

```tsx
// Before (React 18)
import { forwardRef } from 'react';

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return <button ref={ref} className={cn(...)} {...props} />;
  }
);
Button.displayName = 'Button';

// After (React 19)
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: React.Ref<HTMLButtonElement>;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

function Button({ className, variant, size, ref, ...props }: ButtonProps) {
  return <button ref={ref} className={cn(...)} {...props} />;
}
```

**File: `src/app/components/ui/dialog.tsx`**

Apply same pattern to Dialog components.

### 4.2 Implement useActionState for Forms

**File: `src/app/components/LoginScreen.tsx`**

```tsx
import { useActionState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginScreen() {
  const navigate = useNavigate();
  const { setLegacyUser } = useAuth();

  const [state, loginAction, isPending] = useActionState(
    async (prevState: LoginState | null, formData: FormData) => {
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;

      try {
        const response = await apiService.login(email, password);
        setLegacyUser({
          id: response.user.id,
          name: response.user.name,
          role: response.user.role,
          email: response.user.email,
          department: response.user.department,
        });
        navigate('/');
        return { success: true, error: null };
      } catch (error) {
        return { success: false, error: 'Login failed' };
      }
    },
    null
  );

  return (
    <form action={loginAction}>
      <input name="email" type="email" required disabled={isPending} />
      <input name="password" type="password" required disabled={isPending} />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Logging in...' : 'Login'}
      </button>
      {state?.error && <p className="text-red-500">{state.error}</p>}
    </form>
  );
}
```

### 4.3 Implement useOptimistic for Kanban

**File: `src/app/components/KanbanBoard.tsx`**

```tsx
import { useOptimistic, startTransition } from 'react';
import { useTasks, useMoveTask } from '../../hooks/api/useTasks';

export default function KanbanBoard({ userRole }: { userRole: string }) {
  const { data: tasks = [] } = useTasks();
  const moveTask = useMoveTask();

  const [optimisticTasks, addOptimisticTask] = useOptimistic(
    tasks,
    (currentTasks, { taskId, toColumn }: { taskId: number; toColumn: string }) => {
      return currentTasks.map(task =>
        task.id === taskId ? { ...task, status: toColumn } : task
      );
    }
  );

  const handleMoveTask = async (taskId: number, toColumn: string) => {
    startTransition(() => {
      addOptimisticTask({ taskId, toColumn });
    });

    try {
      await moveTask.mutateAsync({ taskId, toColumn });
    } catch (error) {
      // Optimistic update automatically reverts on error
      console.error('Failed to move task:', error);
    }
  };

  // Use optimisticTasks for rendering
  const columns = groupTasksByColumn(optimisticTasks);

  return (/* render columns */);
}
```

### 4.4 Implement use() Hook for Context

**File: `src/hooks/usePermission.ts`**

```tsx
import { use } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export function usePermissionCheck(permission: string): boolean {
  // use() can be called conditionally in React 19
  const auth = use(AuthContext);

  if (!auth) {
    throw new Error('usePermissionCheck must be used within AuthProvider');
  }

  return checkPermission(auth.userPermissions, permission);
}
```

### 4.5 Add Error Boundary with React 19 Improvements

**New File: `src/components/ErrorBoundary.tsx`**

```tsx
import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center h-screen">
          <h2 className="text-xl font-semibold text-red-600">Something went wrong</h2>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### 4.6 Files Changed Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/app/components/ui/button.tsx` | Modify | Remove forwardRef |
| `src/app/components/ui/dialog.tsx` | Modify | Remove forwardRef |
| `src/app/components/LoginScreen.tsx` | Modify | useActionState |
| `src/app/components/KanbanBoard.tsx` | Modify | useOptimistic |
| `src/hooks/usePermission.ts` | Modify | use() hook |
| `src/components/ErrorBoundary.tsx` | New | Error handling |

### 4.7 Verification Checklist

- [ ] forwardRef removed from all components
- [ ] Login form uses useActionState
- [ ] Kanban drag-drop shows optimistic updates
- [ ] Error boundaries catch component errors
- [ ] No React 18 deprecated API warnings

---

## Phase 5: Replace react-dnd with @dnd-kit (Optional)

### 5.1 Why Replace?

- `react-dnd` has uncertain React 19 support
- `@dnd-kit` is more modern and actively maintained
- Better accessibility support
- Smaller bundle size

### 5.2 Install

```bash
npm uninstall react-dnd react-dnd-html5-backend
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### 5.3 Migration Guide

**New File: `src/app/components/KanbanBoard.dndkit.tsx`**

```tsx
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableTaskCard({ task }: { task: Task }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} />
    </div>
  );
}

export default function KanbanBoard() {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      // Handle task move
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragEnd={handleDragEnd}
    >
      {columns.map(column => (
        <SortableContext
          key={column.id}
          items={column.tasks.map(t => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {column.tasks.map(task => (
            <SortableTaskCard key={task.id} task={task} />
          ))}
        </SortableContext>
      ))}
    </DndContext>
  );
}
```

---

## Testing Strategy

### Unit Tests

```bash
npm install -D vitest @testing-library/react @testing-library/user-event jsdom
```

**File: `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
});
```

### Test Examples

**File: `src/hooks/api/useProjects.test.ts`**

```tsx
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProjects } from './useProjects';

const wrapper = ({ children }) => (
  <QueryClientProvider client={new QueryClient()}>
    {children}
  </QueryClientProvider>
);

describe('useProjects', () => {
  it('fetches projects successfully', async () => {
    const { result } = renderHook(() => useProjects(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});
```

---

## Rollback Plan

### If Phase 1 Fails
```bash
git checkout main
npm install react@18.3.1 react-dom@18.3.1
```

### If Phase 2 Fails
```bash
git revert HEAD~N  # N = number of router commits
# Keep React 19, remove router changes
```

### If Phase 3 Fails
```bash
# Remove TanStack Query, keep router
npm uninstall @tanstack/react-query
# Restore original useState/useEffect patterns
```

---

## Final Checklist

### Pre-Migration
- [ ] All tests passing
- [ ] Backup current state
- [ ] Team notified

### Phase 1 Complete
- [ ] React 19.2 installed
- [ ] All dependencies compatible
- [ ] Build succeeds

### Phase 2 Complete
- [ ] React Router v7 working
- [ ] All routes accessible
- [ ] Code splitting active

### Phase 3 Complete
- [ ] TanStack Query integrated
- [ ] API caching works
- [ ] DevTools functional

### Phase 4 Complete
- [ ] React 19 hooks in use
- [ ] forwardRef removed
- [ ] Error boundaries added

### Post-Migration
- [ ] Performance benchmarked
- [ ] Bundle size compared
- [ ] Documentation updated

---

## Estimated Impact

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Initial Bundle | ~800KB | ~500KB | -37% |
| Loading States | 95 manual | 0 manual | -100% |
| forwardRef Usage | 7 files | 0 files | -100% |
| Route Changes | Manual | URL-based | Improved UX |
| API Caching | None | Automatic | Reduced requests |
| Error Handling | Scattered | Centralized | Improved DX |
