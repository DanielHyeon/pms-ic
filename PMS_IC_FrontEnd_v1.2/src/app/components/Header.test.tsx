/**
 * Header Component Tests
 *
 * Tests cover:
 * - Rendering with different user roles
 * - AI assistant button visibility
 * - User menu interactions
 * - Logout functionality
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import Header from './Header';
import { UserInfo, UserRole } from '../../stores/authStore';

// Mock the ProjectContext
vi.mock('../../contexts/ProjectContext', () => ({
  useProject: () => ({
    currentProject: { id: 'P001', name: 'Test Project', code: 'TP-001', status: 'IN_PROGRESS', progress: 50 },
    projects: [
      { id: 'P001', name: 'Test Project', code: 'TP-001', status: 'IN_PROGRESS', progress: 50 },
      { id: 'P002', name: 'Second Project', code: 'SP-001', status: 'PLANNING', progress: 10 },
    ],
    isLoading: false,
    selectProject: vi.fn(),
    refreshProjects: vi.fn(),
    createProject: vi.fn(),
    updateProject: vi.fn(),
  }),
}));

const createMockUser = (overrides: Partial<UserInfo> = {}): UserInfo => ({
  id: 'U001',
  name: 'Test User',
  role: 'pm',
  email: 'test@insure.com',
  department: 'IT Team',
  ...overrides,
});

function renderHeader(props: {
  currentUser: UserInfo;
  onAIToggle: () => void;
  onLogout: () => void;
  canUseAI: boolean;
}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Header {...props} />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Header', () => {
  const defaultProps = {
    currentUser: createMockUser(),
    onAIToggle: vi.fn(),
    onLogout: vi.fn(),
    canUseAI: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Basic Rendering Tests
  // ===========================================================================
  describe('rendering', () => {
    it('renders the header with project info', () => {
      renderHeader(defaultProps);

      expect(screen.getByText('Test Project')).toBeInTheDocument();
      expect(screen.getByText('Project Code: TP-001')).toBeInTheDocument();
    });

    it('renders the user name and role', () => {
      renderHeader(defaultProps);

      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('프로젝트 관리자')).toBeInTheDocument();
    });

    it('renders AI assistant button when canUseAI is true', () => {
      renderHeader({ ...defaultProps, canUseAI: true });

      expect(screen.getByRole('button', { name: /AI Assistant/i })).toBeInTheDocument();
    });

    it('does not render AI assistant button when canUseAI is false', () => {
      renderHeader({ ...defaultProps, canUseAI: false });

      expect(screen.queryByRole('button', { name: /AI Assistant/i })).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // User Role Tests
  // ===========================================================================
  describe('user roles', () => {
    it.each([
      ['sponsor', '프로젝트 스폰서'],
      ['pmo_head', 'PMO 총괄'],
      ['pm', '프로젝트 관리자'],
      ['developer', '개발팀'],
      ['qa', 'QA팀'],
      ['business_analyst', '현업 분석가'],
      ['auditor', '외부 감리'],
      ['admin', '시스템 관리자'],
    ] as const)('displays correct role name for %s role', (role, expectedLabel) => {
      const user = createMockUser({ role });
      renderHeader({ ...defaultProps, currentUser: user });

      expect(screen.getByText(expectedLabel)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Project Selector Tests
  // ===========================================================================
  describe('project selector', () => {
    it('opens project menu when clicked', async () => {
      const user = userEvent.setup();
      renderHeader(defaultProps);

      const projectButton = screen.getByRole('button', { name: /Test Project/i });
      await user.click(projectButton);

      expect(screen.getByText('빠른 프로젝트 전환')).toBeInTheDocument();
    });

    it('closes project menu when clicked again', async () => {
      const user = userEvent.setup();
      renderHeader(defaultProps);

      const projectButton = screen.getByRole('button', { name: /Test Project/i });
      await user.click(projectButton);
      expect(screen.getByText('빠른 프로젝트 전환')).toBeInTheDocument();

      await user.click(projectButton);
      expect(screen.queryByText('빠른 프로젝트 전환')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // User Menu Tests
  // ===========================================================================
  describe('user menu', () => {
    it('opens user menu when user button is clicked', async () => {
      const user = userEvent.setup();
      renderHeader(defaultProps);

      const userButtons = screen.getAllByRole('button');
      const userButton = userButtons.find((btn) => btn.textContent?.includes('Test User'));
      await user.click(userButton!);

      expect(screen.getByText('test@insure.com')).toBeInTheDocument();
      expect(screen.getByText('IT Team')).toBeInTheDocument();
    });

    it('shows logout button in user menu', async () => {
      const user = userEvent.setup();
      renderHeader(defaultProps);

      const userButtons = screen.getAllByRole('button');
      const userButton = userButtons.find((btn) => btn.textContent?.includes('Test User'));
      await user.click(userButton!);

      expect(screen.getByRole('menuitem', { name: /로그아웃/i })).toBeInTheDocument();
    });

    it('calls onLogout when logout button is clicked', async () => {
      const user = userEvent.setup();
      const onLogout = vi.fn();
      renderHeader({ ...defaultProps, onLogout });

      const userButtons = screen.getAllByRole('button');
      const userButton = userButtons.find((btn) => btn.textContent?.includes('Test User'));
      await user.click(userButton!);

      const logoutButton = screen.getByRole('menuitem', { name: /로그아웃/i });
      await user.click(logoutButton);

      expect(onLogout).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // AI Assistant Button Tests
  // ===========================================================================
  describe('AI assistant button', () => {
    it('calls onAIToggle when AI button is clicked', async () => {
      const user = userEvent.setup();
      const onAIToggle = vi.fn();
      renderHeader({ ...defaultProps, onAIToggle, canUseAI: true });

      const aiButton = screen.getByRole('button', { name: /AI Assistant/i });
      await user.click(aiButton);

      expect(onAIToggle).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // Accessibility Tests
  // ===========================================================================
  describe('accessibility', () => {
    it('all buttons are focusable', () => {
      renderHeader(defaultProps);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).not.toHaveAttribute('tabindex', '-1');
      });
    });

    it('header has semantic structure', () => {
      renderHeader(defaultProps);

      expect(screen.getByRole('banner')).toBeInTheDocument();
    });
  });
});
