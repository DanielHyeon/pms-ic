# API Binding

> **Version**: 1.0 | **Status**: Final | **Last Updated**: 2026-01-31

<!-- affects: frontend, api -->

---

## Questions This Document Answers

- How does the frontend communicate with the backend?
- How are API errors handled?
- How is authentication managed in API calls?

---

## 1. API Service Architecture

```
┌─────────────────────────────────────────────────┐
│                  Components                      │
│                      │                           │
│                      ▼                           │
│          hooks/api/useXxx.ts                     │
│          (TanStack Query hooks)                  │
│                      │                           │
│                      ▼                           │
│           services/api.ts                        │
│           (ApiService class)                     │
│                      │                           │
│                      ▼                           │
│              fetch() API                         │
└─────────────────────────────────────────────────┘
                      │
                      ▼
           Backend (localhost:8083)
```

---

## 2. API Service Class

### Configuration

```typescript
// services/api.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8083/api';

// API version prefixes
const V2 = '/v2';  // For v2 endpoints

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

### Request Method

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

## 3. API Endpoint Methods

### GET Requests

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

### POST Requests

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

### PUT/PATCH Requests

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

### DELETE Requests

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

## 4. TanStack Query Hooks

### Hook Structure Pattern

```typescript
// hooks/api/useProjects.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';

// Query keys factory
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  detail: (id: string) => [...projectKeys.all, 'detail', id] as const,
};

// Query hook
export function useProjects() {
  return useQuery({
    queryKey: projectKeys.lists(),
    queryFn: () => apiService.getProjects(),
  });
}

// Mutation hook
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

## 5. Available API Hooks

| Hook | Operations |
|------|------------|
| `useProjects` | List, get, create, update, delete projects |
| `usePhases` | Phase CRUD, gate approval |
| `useTasks` | Task CRUD, status updates |
| `useSprints` | Sprint CRUD, story management |
| `useChat` | Chat sessions, messages, AI responses |
| `useAuth` | Login, logout, token management |
| `useRfps` | RFP document management |
| `useRequirements` | Requirement tracking |
| `useDeliverables` | Deliverable management |
| `useLineage` | Data lineage queries |

---

## 6. Error Handling

### API Error Response

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

### Error Handling in Components

```typescript
function ProjectList() {
  const { data, isLoading, isError, error } = useProjects();

  if (isLoading) return <Skeleton />;
  if (isError) return <ErrorMessage error={error} />;

  return <List items={data} />;
}
```

### Global Error Handling

```typescript
// In mutation hooks
useMutation({
  mutationFn: (data) => apiService.createProject(data),
  onError: (error) => {
    toast.error(`Failed to create project: ${error.message}`);
  },
  onSuccess: () => {
    toast.success('Project created successfully');
  },
});
```

---

## 7. Authentication Flow

### Login

```typescript
async function handleLogin(email: string, password: string) {
  const response = await apiService.login(email, password);

  // Store token
  apiService.setToken(response.accessToken);

  // Update auth store
  useAuthStore.getState().login(response.user, response.accessToken);
}
```

### Authenticated Requests

```typescript
// Token automatically added by ApiService
const headers = {
  'Content-Type': 'application/json',
  ...(this.token && { Authorization: `Bearer ${this.token}` }),
};
```

### Logout

```typescript
function handleLogout() {
  apiService.clearToken();
  useAuthStore.getState().logout();
}
```

---

## 8. Mock Data Fallback

The API service includes fallback to mock data when backend is unavailable:

```typescript
private async fetchWithFallback<T>(
  endpoint: string,
  options: RequestInit,
  mockData: T
): Promise<T> {
  try {
    // Try real API
    const response = await fetch(...);
    return await response.json();
  } catch (error) {
    // Fall back to mock data
    console.warn('Using mock data');
    return mockData;
  }
}
```

---

## 9. API Versioning

| Version | Endpoints | Description |
|---------|-----------|-------------|
| `/api/v2` | projects, chat, users, permissions, lineage, reports | Current v2 endpoints |
| `/api` | phases, members, sprints, auth | Legacy endpoints |

---

## 10. Best Practices

### DO

- Use TanStack Query hooks for all API calls
- Handle loading and error states
- Invalidate related queries after mutations
- Use TypeScript types for API responses
- Set appropriate timeout values

### DON'T

- Call `fetch()` directly in components
- Store API data in local state
- Ignore error responses
- Hardcode API URLs
- Skip authentication headers

---

*Last Updated: 2026-01-31*
