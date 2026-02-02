/**
 * MobileNavDrawer Component Tests
 *
 * Tests cover:
 * - Conditional rendering based on isOpen
 * - Close functionality (button click, backdrop click, escape key)
 * - Body scroll lock when open
 * - Accessibility attributes
 * - Sidebar rendering
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MobileNavDrawer from './MobileNavDrawer';
import { UserRole } from '../../stores/authStore';

// Mock the Sidebar component
vi.mock('./Sidebar', () => ({
  default: ({ userRole }: { userRole: UserRole }) => (
    <div data-testid="sidebar-mock">Sidebar for {userRole}</div>
  ),
}));

function renderMobileNavDrawer(props: {
  isOpen: boolean;
  onClose: () => void;
  userRole?: UserRole;
}) {
  return render(
    <MemoryRouter>
      <MobileNavDrawer
        isOpen={props.isOpen}
        onClose={props.onClose}
        userRole={props.userRole || 'pm'}
      />
    </MemoryRouter>
  );
}

describe('MobileNavDrawer', () => {
  const defaultProps = {
    isOpen: false,
    onClose: vi.fn(),
    userRole: 'pm' as UserRole,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset body overflow style
    document.body.style.overflow = '';
  });

  afterEach(() => {
    // Clean up body styles
    document.body.style.overflow = '';
  });

  // ===========================================================================
  // Conditional Rendering Tests
  // ===========================================================================
  describe('conditional rendering', () => {
    it('renders nothing when isOpen is false', () => {
      renderMobileNavDrawer({ ...defaultProps, isOpen: false });

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders drawer when isOpen is true', () => {
      renderMobileNavDrawer({ ...defaultProps, isOpen: true });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('renders Sidebar component when open', () => {
      renderMobileNavDrawer({ ...defaultProps, isOpen: true });

      expect(screen.getByTestId('sidebar-mock')).toBeInTheDocument();
    });

    it('passes userRole to Sidebar', () => {
      renderMobileNavDrawer({ ...defaultProps, isOpen: true, userRole: 'admin' });

      expect(screen.getByText('Sidebar for admin')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Close Functionality Tests
  // ===========================================================================
  describe('close functionality', () => {
    it('calls onClose when close button is clicked', () => {
      const onClose = vi.fn();
      renderMobileNavDrawer({ isOpen: true, onClose });

      const closeButton = screen.getByRole('button', { name: /Close navigation/i });
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop is clicked', () => {
      const onClose = vi.fn();
      renderMobileNavDrawer({ isOpen: true, onClose });

      // The backdrop has aria-hidden="true"
      const backdrop = document.querySelector('.bg-black\\/50');
      expect(backdrop).toBeInTheDocument();
      fireEvent.click(backdrop!);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Escape key is pressed', () => {
      const onClose = vi.fn();
      renderMobileNavDrawer({ isOpen: true, onClose });

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose on Escape when drawer is closed', () => {
      const onClose = vi.fn();
      renderMobileNavDrawer({ isOpen: false, onClose });

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Body Scroll Lock Tests
  // ===========================================================================
  describe('body scroll lock', () => {
    it('sets body overflow to hidden when opened', () => {
      renderMobileNavDrawer({ ...defaultProps, isOpen: true });

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('resets body overflow when closed', () => {
      const { rerender } = renderMobileNavDrawer({ ...defaultProps, isOpen: true });
      expect(document.body.style.overflow).toBe('hidden');

      rerender(
        <MemoryRouter>
          <MobileNavDrawer isOpen={false} onClose={vi.fn()} userRole="pm" />
        </MemoryRouter>
      );

      expect(document.body.style.overflow).toBe('');
    });

    it('cleans up body overflow on unmount', () => {
      const { unmount } = renderMobileNavDrawer({ ...defaultProps, isOpen: true });
      expect(document.body.style.overflow).toBe('hidden');

      unmount();

      expect(document.body.style.overflow).toBe('');
    });
  });

  // ===========================================================================
  // Accessibility Tests
  // ===========================================================================
  describe('accessibility', () => {
    it('drawer has role="dialog"', () => {
      renderMobileNavDrawer({ ...defaultProps, isOpen: true });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('drawer has aria-modal="true"', () => {
      renderMobileNavDrawer({ ...defaultProps, isOpen: true });

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('drawer has aria-label', () => {
      renderMobileNavDrawer({ ...defaultProps, isOpen: true });

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-label', 'Navigation menu');
    });

    it('close button has aria-label', () => {
      renderMobileNavDrawer({ ...defaultProps, isOpen: true });

      const closeButton = screen.getByRole('button', { name: /Close navigation/i });
      expect(closeButton).toHaveAttribute('aria-label', 'Close navigation');
    });

    it('close button has type="button"', () => {
      renderMobileNavDrawer({ ...defaultProps, isOpen: true });

      const closeButton = screen.getByRole('button', { name: /Close navigation/i });
      expect(closeButton).toHaveAttribute('type', 'button');
    });

    it('backdrop has aria-hidden="true"', () => {
      renderMobileNavDrawer({ ...defaultProps, isOpen: true });

      const backdrop = document.querySelector('.bg-black\\/50');
      expect(backdrop).toHaveAttribute('aria-hidden', 'true');
    });
  });

  // ===========================================================================
  // User Role Tests
  // ===========================================================================
  describe('user roles', () => {
    const roles: UserRole[] = [
      'sponsor',
      'pmo_head',
      'pm',
      'developer',
      'qa',
      'business_analyst',
      'auditor',
      'admin',
    ];

    it.each(roles)('renders correctly for %s role', (role) => {
      renderMobileNavDrawer({ isOpen: true, onClose: vi.fn(), userRole: role });

      expect(screen.getByText(`Sidebar for ${role}`)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Responsive Behavior Tests
  // ===========================================================================
  describe('responsive behavior', () => {
    it('has md:hidden class on container', () => {
      renderMobileNavDrawer({ ...defaultProps, isOpen: true });

      const container = document.querySelector('.md\\:hidden');
      expect(container).toBeInTheDocument();
    });

    it('drawer has proper width class', () => {
      renderMobileNavDrawer({ ...defaultProps, isOpen: true });

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('w-64');
    });
  });
});
