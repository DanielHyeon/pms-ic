/**
 * Test utilities for rendering components with necessary providers
 */
import { ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { UserInfo, UserRole } from '../stores/authStore';
import { ProjectSummary, Project } from '../types/project';

// ============================================================================
// Mock Data Factories
// ============================================================================

export const createMockUser = (overrides: Partial<UserInfo> = {}): UserInfo => ({
  id: 'U001',
  name: 'Test User',
  role: 'pm',
  email: 'test@insure.com',
  department: 'IT Team',
  ...overrides,
});

export const createMockProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'P001',
  name: 'Test Project',
  code: 'TP-001',
  description: 'Test project description',
  status: 'IN_PROGRESS',
  progress: 50,
  startDate: '2025-01-01',
  endDate: '2025-12-31',
  budget: 1000000,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-15T00:00:00Z',
  ...overrides,
});

export const createMockProjectSummary = (overrides: Partial<ProjectSummary> = {}): ProjectSummary => ({
  id: 'P001',
  name: 'Test Project',
  code: 'TP-001',
  status: 'IN_PROGRESS',
  progress: 50,
  ...overrides,
});

// ============================================================================
// Mock Contexts
// ============================================================================

interface MockProjectContextValue {
  currentProject: Project | null;
  projects: ProjectSummary[];
  isLoading: boolean;
  selectProject: (projectId: string) => Promise<void>;
  refreshProjects: () => Promise<void>;
  createProject: (data: Partial<Project>) => Promise<Project>;
  updateProject: (projectId: string, data: Partial<Project>) => Promise<Project>;
}

const defaultProjectContextValue: MockProjectContextValue = {
  currentProject: createMockProject(),
  projects: [createMockProjectSummary()],
  isLoading: false,
  selectProject: vi.fn().mockResolvedValue(undefined),
  refreshProjects: vi.fn().mockResolvedValue(undefined),
  createProject: vi.fn().mockResolvedValue(createMockProject()),
  updateProject: vi.fn().mockResolvedValue(createMockProject()),
};

// Mock the useProject hook
vi.mock('../contexts/ProjectContext', () => ({
  useProject: () => defaultProjectContextValue,
  ProjectProvider: ({ children }: { children: ReactNode }) => children,
}));

// ============================================================================
// Query Client Factory
// ============================================================================

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

// ============================================================================
// Test Wrapper Components
// ============================================================================

interface AllProvidersProps {
  children: ReactNode;
  queryClient?: QueryClient;
  initialEntries?: string[];
}

export function AllProviders({
  children,
  queryClient = createTestQueryClient(),
  initialEntries = ['/'],
}: AllProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// ============================================================================
// Custom Render Function
// ============================================================================

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  initialEntries?: string[];
}

export function renderWithProviders(
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
) {
  const { queryClient = createTestQueryClient(), initialEntries = ['/'], ...renderOptions } = options;

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AllProviders queryClient={queryClient} initialEntries={initialEntries}>
        {children}
      </AllProviders>
    );
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}

// ============================================================================
// Role Test Utilities
// ============================================================================

export const allRoles: UserRole[] = [
  'sponsor',
  'pmo_head',
  'pm',
  'developer',
  'qa',
  'business_analyst',
  'auditor',
  'admin',
];

export const rolesWithAIAccess: UserRole[] = [
  'sponsor',
  'pmo_head',
  'pm',
  'developer',
  'qa',
  'business_analyst',
  'admin',
];

export const rolesWithoutAIAccess: UserRole[] = ['auditor'];

// ============================================================================
// Accessibility Test Utilities
// ============================================================================

export function expectToBeAccessible(element: HTMLElement) {
  // Check for basic accessibility attributes
  const interactiveElements = element.querySelectorAll('button, a, input, select, textarea');

  interactiveElements.forEach((el) => {
    // Interactive elements should either have text content or aria-label
    const hasAccessibleName =
      el.textContent?.trim() ||
      el.getAttribute('aria-label') ||
      el.getAttribute('aria-labelledby') ||
      el.getAttribute('title');

    expect(hasAccessibleName).toBeTruthy();
  });
}

// ============================================================================
// Wait Utilities
// ============================================================================

export const waitForLoadingToFinish = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

// ============================================================================
// Event Simulation Utilities
// ============================================================================

export function simulateKeyPress(element: HTMLElement, key: string) {
  element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  element.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }));
}

export function simulateEscape(element: HTMLElement) {
  simulateKeyPress(element, 'Escape');
}

export function simulateEnter(element: HTMLElement) {
  simulateKeyPress(element, 'Enter');
}
