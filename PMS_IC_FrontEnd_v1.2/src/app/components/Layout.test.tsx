/**
 * Layout Component Tests
 *
 * Tests cover:
 * - Basic rendering with authenticated user
 * - Sidebar visibility based on viewport
 * - Mobile navigation drawer toggle
 * - AI panel toggle
 * - Logout functionality
 * - Role-based permissions
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './Layout';

// Mock stores and contexts
const mockUser = {
  id: 'U001',
  name: 'Test User',
  role: 'pm' as const,
  email: 'test@example.com',
  department: 'IT',
};

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../stores/authStore', () => ({
  useAuthStore: () => ({
    user: mockUser,
    logout: vi.fn(),
  }),
  canUseAI: (role: string | undefined) => role !== 'auditor',
}));

vi.mock('../../contexts/ProjectContext', () => ({
  ProjectProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useProject: () => ({
    currentProject: { id: 'P001', name: 'Test Project', code: 'TP-001', status: 'IN_PROGRESS', progress: 50 },
    projects: [],
    isLoading: false,
    selectProject: vi.fn(),
    refreshProjects: vi.fn(),
    createProject: vi.fn(),
    updateProject: vi.fn(),
  }),
}));

// Mock child components to simplify testing
vi.mock('./Sidebar', () => ({
  default: ({ userRole }: { userRole: string }) => (
    <aside data-testid="sidebar-mock">Sidebar: {userRole}</aside>
  ),
}));

vi.mock('./Header', () => ({
  default: ({
    onAIToggle,
    onLogout,
    canUseAI,
    onMobileMenuToggle,
    isMobile,
    currentUser,
  }: {
    onAIToggle: () => void;
    onLogout: () => void;
    canUseAI: boolean;
    onMobileMenuToggle?: () => void;
    isMobile?: boolean;
    currentUser: { name: string };
  }) => (
    <header data-testid="header-mock">
      <span>User: {currentUser.name}</span>
      <span>canUseAI: {canUseAI.toString()}</span>
      <span>isMobile: {(isMobile ?? false).toString()}</span>
      <button type="button" onClick={onAIToggle} data-testid="ai-toggle">
        Toggle AI
      </button>
      <button type="button" onClick={onLogout} data-testid="logout-btn">
        Logout
      </button>
      {onMobileMenuToggle && (
        <button type="button" onClick={onMobileMenuToggle} data-testid="mobile-menu-toggle">
          Mobile Menu
        </button>
      )}
    </header>
  ),
}));

vi.mock('./AIAssistant', () => ({
  default: ({ onClose, userRole }: { onClose: () => void; userRole: string }) => (
    <div data-testid="ai-assistant-mock">
      AI Assistant: {userRole}
      <button type="button" onClick={onClose} data-testid="close-ai">
        Close
      </button>
    </div>
  ),
}));

vi.mock('./MobileNavDrawer', () => ({
  default: ({
    isOpen,
    onClose,
    userRole,
  }: {
    isOpen: boolean;
    onClose: () => void;
    userRole: string;
  }) =>
    isOpen ? (
      <div data-testid="mobile-drawer-mock">
        Mobile Drawer: {userRole}
        <button type="button" onClick={onClose} data-testid="close-drawer">
          Close Drawer
        </button>
      </div>
    ) : null,
}));

vi.mock('./ToastContainer', () => ({
  default: () => <div data-testid="toast-container-mock" />,
}));

vi.mock('./ErrorBoundary', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="error-boundary-mock">{children}</div>
  ),
}));

vi.mock('./ui/use-mobile', () => ({
  useIsMobile: () => false,
}));

function renderLayout() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<div data-testid="outlet-content">Dashboard Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Basic Rendering Tests
  // ===========================================================================
  describe('basic rendering', () => {
    it('renders sidebar', () => {
      renderLayout();

      expect(screen.getByTestId('sidebar-mock')).toBeInTheDocument();
    });

    it('renders header', () => {
      renderLayout();

      expect(screen.getByTestId('header-mock')).toBeInTheDocument();
    });

    it('renders outlet content', () => {
      renderLayout();

      expect(screen.getByTestId('outlet-content')).toBeInTheDocument();
    });

    it('renders toast container', () => {
      renderLayout();

      expect(screen.getByTestId('toast-container-mock')).toBeInTheDocument();
    });

    it('renders error boundary around outlet', () => {
      renderLayout();

      expect(screen.getByTestId('error-boundary-mock')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // User Information Tests
  // ===========================================================================
  describe('user information', () => {
    it('passes current user to header', () => {
      renderLayout();

      expect(screen.getByText('User: Test User')).toBeInTheDocument();
    });

    it('passes user role to sidebar', () => {
      renderLayout();

      expect(screen.getByText('Sidebar: pm')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // AI Panel Tests
  // ===========================================================================
  describe('AI panel', () => {
    it('does not render AI assistant initially', () => {
      renderLayout();

      expect(screen.queryByTestId('ai-assistant-mock')).not.toBeInTheDocument();
    });

    it('renders AI assistant when toggle is clicked', async () => {
      const user = userEvent.setup();
      renderLayout();

      await user.click(screen.getByTestId('ai-toggle'));

      expect(screen.getByTestId('ai-assistant-mock')).toBeInTheDocument();
    });

    it('closes AI assistant when close button is clicked', async () => {
      const user = userEvent.setup();
      renderLayout();

      await user.click(screen.getByTestId('ai-toggle'));
      expect(screen.getByTestId('ai-assistant-mock')).toBeInTheDocument();

      await user.click(screen.getByTestId('close-ai'));
      expect(screen.queryByTestId('ai-assistant-mock')).not.toBeInTheDocument();
    });

    it('passes canUseAI to header', () => {
      renderLayout();

      expect(screen.getByText('canUseAI: true')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Logout Tests
  // ===========================================================================
  describe('logout', () => {
    it('navigates to login on logout', async () => {
      const user = userEvent.setup();
      renderLayout();

      await user.click(screen.getByTestId('logout-btn'));

      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  // ===========================================================================
  // Mobile Navigation Tests
  // ===========================================================================
  describe('mobile navigation', () => {
    it('does not render mobile drawer initially', () => {
      renderLayout();

      expect(screen.queryByTestId('mobile-drawer-mock')).not.toBeInTheDocument();
    });

    it('renders mobile drawer when mobile menu toggle is clicked', async () => {
      const user = userEvent.setup();
      renderLayout();

      await user.click(screen.getByTestId('mobile-menu-toggle'));

      expect(screen.getByTestId('mobile-drawer-mock')).toBeInTheDocument();
    });

    it('closes mobile drawer when close button is clicked', async () => {
      const user = userEvent.setup();
      renderLayout();

      await user.click(screen.getByTestId('mobile-menu-toggle'));
      expect(screen.getByTestId('mobile-drawer-mock')).toBeInTheDocument();

      await user.click(screen.getByTestId('close-drawer'));
      expect(screen.queryByTestId('mobile-drawer-mock')).not.toBeInTheDocument();
    });

    it('passes isMobile to header', () => {
      renderLayout();

      expect(screen.getByText('isMobile: false')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Layout Structure Tests
  // ===========================================================================
  describe('layout structure', () => {
    it('uses flex layout', () => {
      renderLayout();

      const container = document.querySelector('.flex.h-screen');
      expect(container).toBeInTheDocument();
    });

    it('has proper main content area', () => {
      renderLayout();

      const main = document.querySelector('main');
      expect(main).toBeInTheDocument();
      expect(main).toHaveClass('flex-1');
      expect(main).toHaveClass('overflow-auto');
    });
  });
});
