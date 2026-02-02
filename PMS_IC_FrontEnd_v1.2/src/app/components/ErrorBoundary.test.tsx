/**
 * ErrorBoundary Component Tests
 *
 * Tests cover:
 * - Rendering children when no error
 * - Error catching and fallback display
 * - Retry functionality
 * - Custom fallback rendering
 * - Accessibility attributes
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

// Component that throws an error
const ThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>Child component rendered</div>;
};

// Component that throws on demand via state
const ControlledThrowingComponent = () => {
  return <div>Controlled component</div>;
};

describe('ErrorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Suppress console.error during tests
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  // ===========================================================================
  // Normal Rendering Tests
  // ===========================================================================
  describe('normal rendering', () => {
    it('renders children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Child component rendered')).toBeInTheDocument();
    });

    it('renders multiple children correctly', () => {
      render(
        <ErrorBoundary>
          <div>First child</div>
          <div>Second child</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('First child')).toBeInTheDocument();
      expect(screen.getByText('Second child')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Error Handling Tests
  // ===========================================================================
  describe('error handling', () => {
    it('displays error UI when child component throws', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText(/An unexpected error occurred/)).toBeInTheDocument();
    });

    it('displays Try Again button when error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
    });

    it('logs error to console.error', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Retry Functionality Tests
  // ===========================================================================
  describe('retry functionality', () => {
    it('renders Try Again button in error state', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
    });

    it('Try Again button is clickable', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      const button = screen.getByRole('button', { name: /Try Again/i });
      // Clicking should not throw
      expect(() => fireEvent.click(button)).not.toThrow();
    });
  });

  // ===========================================================================
  // Custom Fallback Tests
  // ===========================================================================
  describe('custom fallback', () => {
    it('renders custom fallback when provided', () => {
      const customFallback = <div>Custom error message</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error message')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('uses default fallback when custom fallback is not provided', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Accessibility Tests
  // ===========================================================================
  describe('accessibility', () => {
    it('error state has role="alert"', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('error state has aria-live="assertive"', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'assertive');
    });

    it('Try Again button has proper type', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      const button = screen.getByRole('button', { name: /Try Again/i });
      expect(button).toHaveAttribute('type', 'button');
    });

    it('Try Again button is focusable', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      const button = screen.getByRole('button', { name: /Try Again/i });
      expect(button).not.toHaveAttribute('tabindex', '-1');
    });

    it('error message has appropriate heading structure', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('heading', { level: 2, name: 'Something went wrong' })).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Edge Cases Tests
  // ===========================================================================
  describe('edge cases', () => {
    it('handles null children gracefully', () => {
      render(
        <ErrorBoundary>
          {null}
        </ErrorBoundary>
      );

      // Should not throw, no error state
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('handles undefined children gracefully', () => {
      render(
        <ErrorBoundary>
          {undefined}
        </ErrorBoundary>
      );

      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('handles fragment children', () => {
      render(
        <ErrorBoundary>
          <>
            <span>Fragment child 1</span>
            <span>Fragment child 2</span>
          </>
        </ErrorBoundary>
      );

      expect(screen.getByText('Fragment child 1')).toBeInTheDocument();
      expect(screen.getByText('Fragment child 2')).toBeInTheDocument();
    });
  });
});
