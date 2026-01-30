/**
 * Sidebar Component Tests
 *
 * Tests cover:
 * - Rendering with different user roles
 * - Menu visibility based on role
 * - Navigation functionality
 * - Menu group expand/collapse
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from './Sidebar';
import { UserRole } from '../../stores/authStore';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderSidebar(userRole: UserRole) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Sidebar userRole={userRole} />
    </MemoryRouter>
  );
}

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Basic Rendering Tests
  // ===========================================================================
  describe('rendering', () => {
    it('renders the sidebar with app title', () => {
      renderSidebar('pm');

      expect(screen.getByText('InsureTech AI-PMS')).toBeInTheDocument();
      expect(screen.getByText('Project Management System')).toBeInTheDocument();
    });

    it('renders version info in footer', () => {
      renderSidebar('pm');

      expect(screen.getByText('Version 2.1')).toBeInTheDocument();
      expect(screen.getByText('React 19 + Router v7')).toBeInTheDocument();
    });

    it('renders navigation area', () => {
      renderSidebar('pm');

      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Role Display Tests
  // ===========================================================================
  describe('role display', () => {
    it.each([
      ['sponsor', 'Sponsor'],
      ['pmo_head', 'PMO Head'],
      ['pm', 'Project Manager'],
      ['developer', 'Developer'],
      ['qa', 'QA Engineer'],
      ['business_analyst', 'Business Analyst'],
      ['auditor', 'Auditor'],
      ['admin', 'Administrator'],
    ] as [UserRole, string][])('displays correct role badge for %s', (role, expectedLabel) => {
      renderSidebar(role);

      expect(screen.getByText(expectedLabel)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Menu Filtering by Role Tests
  // ===========================================================================
  describe('menu filtering', () => {
    it('shows Dashboard for all roles', () => {
      const roles: UserRole[] = ['sponsor', 'pmo_head', 'pm', 'developer', 'qa', 'business_analyst', 'auditor', 'admin'];

      roles.forEach((role) => {
        const { unmount } = renderSidebar(role);
        expect(screen.getByText('통합 대시보드')).toBeInTheDocument();
        unmount();
      });
    });

    it('shows user management menu for admin role', async () => {
      const user = userEvent.setup();
      renderSidebar('admin');

      // Expand the settings group first (exact match for group header)
      const settingsGroup = screen.getByRole('button', { name: /^설정$/i });
      await user.click(settingsGroup);

      // Admin can see user management
      expect(screen.getByRole('button', { name: /사용자 관리/i })).toBeInTheDocument();
    });

    it('hides user management for roles without access', async () => {
      const user = userEvent.setup();
      // These roles don't have access to user-management
      const restrictedRoles: UserRole[] = ['sponsor', 'pm', 'developer', 'qa', 'business_analyst', 'auditor'];

      for (const role of restrictedRoles) {
        const { unmount } = renderSidebar(role);

        // Try to expand settings group if it exists (exact match for group header)
        const settingsGroup = screen.queryByRole('button', { name: /^설정$/i });
        if (settingsGroup) {
          await user.click(settingsGroup);
        }

        expect(screen.queryByRole('button', { name: /사용자 관리/i })).not.toBeInTheDocument();
        unmount();
      }
    });
  });

  // ===========================================================================
  // Navigation Tests
  // ===========================================================================
  describe('navigation', () => {
    it('navigates to dashboard when Dashboard menu item is clicked', async () => {
      const user = userEvent.setup();
      renderSidebar('pm');

      const dashboardButton = screen.getByRole('button', { name: /통합 대시보드/i });
      await user.click(dashboardButton);

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  // ===========================================================================
  // Menu Group Expand/Collapse Tests
  // ===========================================================================
  describe('menu groups', () => {
    it('expands menu group when clicked', async () => {
      const user = userEvent.setup();
      renderSidebar('pm');

      // '요구사항 관리' group is available to pm role and not expanded by default
      const requirementsGroup = screen.getByRole('button', { name: /요구사항 관리/i });
      await user.click(requirementsGroup);

      // After clicking, submenu items should be visible
      expect(screen.getByRole('button', { name: /요구사항 정의/i })).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Accessibility Tests
  // ===========================================================================
  describe('accessibility', () => {
    it('has complementary landmark role', () => {
      renderSidebar('pm');

      expect(screen.getByRole('complementary')).toBeInTheDocument();
    });

    it('has navigation landmark role', () => {
      renderSidebar('pm');

      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('all menu buttons have type attribute', () => {
      renderSidebar('pm');

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('type', 'button');
      });
    });

    it('menu items have title attribute for tooltips', () => {
      renderSidebar('pm');

      const dashboardButton = screen.getByRole('button', { name: /통합 대시보드/i });
      expect(dashboardButton).toHaveAttribute('title', '프로젝트 현황 및 KPI 한눈에 보기');
    });
  });
});
