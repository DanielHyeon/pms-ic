/**
 * ToastContainer Component Tests
 *
 * Tests cover:
 * - Toast rendering for different types
 * - Toast dismiss functionality
 * - Accessibility attributes
 * - Toast service integration
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ToastContainer from './ToastContainer';
import { toastService } from '../../services/toast';

describe('ToastContainer', () => {
  // ===========================================================================
  // Basic Rendering Tests
  // ===========================================================================
  describe('basic rendering', () => {
    it('renders empty container when no toasts', () => {
      render(<ToastContainer />);

      const container = screen.getByRole('status');
      expect(container).toBeInTheDocument();
      expect(container.children).toHaveLength(0);
    });

    it('renders toast when toastService emits', async () => {
      render(<ToastContainer />);

      act(() => {
        toastService.success('Operation completed');
      });

      await waitFor(() => {
        expect(screen.getByText('Operation completed')).toBeInTheDocument();
      });
    });

    it('renders multiple toasts', async () => {
      render(<ToastContainer />);

      act(() => {
        toastService.success('First toast');
        toastService.error('Second toast');
      });

      await waitFor(() => {
        expect(screen.getByText('First toast')).toBeInTheDocument();
        expect(screen.getByText('Second toast')).toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // Toast Type Tests
  // ===========================================================================
  describe('toast types', () => {
    it('renders success toast correctly', async () => {
      render(<ToastContainer />);

      act(() => {
        toastService.success('Success message');
      });

      await waitFor(() => {
        expect(screen.getByText('Success message')).toBeInTheDocument();
      });
    });

    it('renders error toast correctly', async () => {
      render(<ToastContainer />);

      act(() => {
        toastService.error('Error message');
      });

      await waitFor(() => {
        expect(screen.getByText('Error message')).toBeInTheDocument();
      });
    });

    it('renders warning toast correctly', async () => {
      render(<ToastContainer />);

      act(() => {
        toastService.warning('Warning message');
      });

      await waitFor(() => {
        expect(screen.getByText('Warning message')).toBeInTheDocument();
      });
    });

    it('renders info toast correctly', async () => {
      render(<ToastContainer />);

      act(() => {
        toastService.info('Info message');
      });

      await waitFor(() => {
        expect(screen.getByText('Info message')).toBeInTheDocument();
      });
    });

    it('renders toast with title', async () => {
      render(<ToastContainer />);

      act(() => {
        toastService.success('Success message', 'Success Title');
      });

      await waitFor(() => {
        expect(screen.getByText('Success Title')).toBeInTheDocument();
        expect(screen.getByText('Success message')).toBeInTheDocument();
      });
    });

    it('error toast has default Error title', async () => {
      render(<ToastContainer />);

      act(() => {
        toastService.error('Something went wrong');
      });

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // Dismiss Functionality Tests
  // ===========================================================================
  describe('dismiss functionality', () => {
    it('removes toast when close button is clicked', async () => {
      render(<ToastContainer />);

      act(() => {
        toastService.success('Dismissable toast');
      });

      await waitFor(() => {
        expect(screen.getByText('Dismissable toast')).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: /Close notification/i });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Dismissable toast')).not.toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // Accessibility Tests
  // ===========================================================================
  describe('accessibility', () => {
    it('container has role="status"', () => {
      render(<ToastContainer />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('container has aria-live="polite"', () => {
      render(<ToastContainer />);

      const container = screen.getByRole('status');
      expect(container).toHaveAttribute('aria-live', 'polite');
    });

    it('container has aria-atomic="false"', () => {
      render(<ToastContainer />);

      const container = screen.getByRole('status');
      expect(container).toHaveAttribute('aria-atomic', 'false');
    });

    it('close button has proper aria-label', async () => {
      render(<ToastContainer />);

      act(() => {
        toastService.info('Test toast');
      });

      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /Close notification/i });
        expect(closeButton).toBeInTheDocument();
      });
    });

    it('close button has type="button"', async () => {
      render(<ToastContainer />);

      act(() => {
        toastService.info('Test toast');
      });

      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /Close notification/i });
        expect(closeButton).toHaveAttribute('type', 'button');
      });
    });

    it('icons have aria-hidden="true"', async () => {
      render(<ToastContainer />);

      act(() => {
        toastService.success('Test toast');
      });

      await waitFor(() => {
        const container = screen.getByRole('status');
        const svgs = container.querySelectorAll('svg');
        svgs.forEach((svg) => {
          expect(svg).toHaveAttribute('aria-hidden', 'true');
        });
      });
    });
  });

  // ===========================================================================
  // Toast Styling Tests
  // ===========================================================================
  describe('toast styling', () => {
    it('applies correct styles for success toast', async () => {
      render(<ToastContainer />);

      act(() => {
        toastService.success('Success toast');
      });

      await waitFor(() => {
        const toastElement = screen.getByText('Success toast').closest('.rounded-lg');
        expect(toastElement).toHaveClass('bg-emerald-50');
        expect(toastElement).toHaveClass('border-emerald-200');
      });
    });

    it('applies correct styles for error toast', async () => {
      render(<ToastContainer />);

      act(() => {
        toastService.error('Error toast');
      });

      await waitFor(() => {
        const toastElement = screen.getByText('Error toast').closest('.rounded-lg');
        expect(toastElement).toHaveClass('bg-red-50');
        expect(toastElement).toHaveClass('border-red-200');
      });
    });

    it('applies correct styles for warning toast', async () => {
      render(<ToastContainer />);

      act(() => {
        toastService.warning('Warning toast');
      });

      await waitFor(() => {
        const toastElement = screen.getByText('Warning toast').closest('.rounded-lg');
        expect(toastElement).toHaveClass('bg-amber-50');
        expect(toastElement).toHaveClass('border-amber-200');
      });
    });

    it('applies correct styles for info toast', async () => {
      render(<ToastContainer />);

      act(() => {
        toastService.info('Info toast');
      });

      await waitFor(() => {
        const toastElement = screen.getByText('Info toast').closest('.rounded-lg');
        expect(toastElement).toHaveClass('bg-blue-50');
        expect(toastElement).toHaveClass('border-blue-200');
      });
    });
  });
});
