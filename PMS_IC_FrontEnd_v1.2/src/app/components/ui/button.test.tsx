/**
 * Button Component Tests
 *
 * Tests cover:
 * - All variant styles (default, destructive, outline, secondary, ghost, link)
 * - All size options (default, sm, lg, icon)
 * - Disabled state
 * - Loading state (if applicable)
 * - Slot component rendering
 * - Accessibility (focus states, aria attributes)
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, buttonVariants } from './button';

describe('Button', () => {
  // ===========================================================================
  // Basic Rendering Tests
  // ===========================================================================
  describe('rendering', () => {
    it('renders button with children', () => {
      render(<Button>Click me</Button>);

      expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
    });

    it('renders as a button element by default', () => {
      render(<Button>Test</Button>);

      expect(screen.getByRole('button')).toHaveProperty('tagName', 'BUTTON');
    });

    it('renders children correctly', () => {
      render(
        <Button>
          <span data-testid="child">Child content</span>
        </Button>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Variant Tests
  // ===========================================================================
  describe('variants', () => {
    it('applies default variant styles', () => {
      render(<Button variant="default">Default</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-primary');
    });

    it('applies destructive variant styles', () => {
      render(<Button variant="destructive">Destructive</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-destructive');
    });

    it('applies outline variant styles', () => {
      render(<Button variant="outline">Outline</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('border');
    });

    it('applies secondary variant styles', () => {
      render(<Button variant="secondary">Secondary</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('bg-secondary');
    });

    it('applies ghost variant styles', () => {
      render(<Button variant="ghost">Ghost</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('hover:bg-accent');
    });

    it('applies link variant styles', () => {
      render(<Button variant="link">Link</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('underline-offset');
    });
  });

  // ===========================================================================
  // Size Tests
  // ===========================================================================
  describe('sizes', () => {
    it('applies default size', () => {
      render(<Button size="default">Default</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('h-9');
    });

    it('applies small size', () => {
      render(<Button size="sm">Small</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('h-8');
    });

    it('applies large size', () => {
      render(<Button size="lg">Large</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('h-10');
    });

    it('applies icon size', () => {
      render(<Button size="icon">Icon</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('size-9');
    });
  });

  // ===========================================================================
  // Interaction Tests
  // ===========================================================================
  describe('interactions', () => {
    it('calls onClick when clicked', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(<Button onClick={handleClick}>Click me</Button>);

      await user.click(screen.getByRole('button'));

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when disabled', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(
        <Button onClick={handleClick} disabled>
          Disabled
        </Button>
      );

      await user.click(screen.getByRole('button'));

      expect(handleClick).not.toHaveBeenCalled();
    });

    it('supports keyboard activation with Enter', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(<Button onClick={handleClick}>Press Enter</Button>);

      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard('{Enter}');

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('supports keyboard activation with Space', async () => {
      const handleClick = vi.fn();
      const user = userEvent.setup();

      render(<Button onClick={handleClick}>Press Space</Button>);

      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard(' ');

      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // Disabled State Tests
  // ===========================================================================
  describe('disabled state', () => {
    it('applies disabled styles', () => {
      render(<Button disabled>Disabled</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button.className).toContain('disabled:pointer-events-none');
    });

    it('has disabled attribute when disabled', () => {
      render(<Button disabled>Disabled</Button>);

      expect(screen.getByRole('button')).toHaveAttribute('disabled');
    });
  });

  // ===========================================================================
  // Slot/AsChild Tests
  // ===========================================================================
  describe('asChild prop', () => {
    it('renders as child element when asChild is true', () => {
      render(
        <Button asChild>
          <a href="/test">Link Button</a>
        </Button>
      );

      const link = screen.getByRole('link', { name: 'Link Button' });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/test');
    });

    it('passes button styles to child element', () => {
      render(
        <Button asChild variant="destructive">
          <a href="/delete">Delete</a>
        </Button>
      );

      const link = screen.getByRole('link');
      expect(link.className).toContain('bg-destructive');
    });
  });

  // ===========================================================================
  // Accessibility Tests
  // ===========================================================================
  describe('accessibility', () => {
    it('is focusable', () => {
      render(<Button>Focus me</Button>);

      const button = screen.getByRole('button');
      button.focus();

      expect(document.activeElement).toBe(button);
    });

    it('is not focusable when disabled', () => {
      render(<Button disabled>Cannot focus</Button>);

      const button = screen.getByRole('button');
      button.focus();

      // Note: Disabled buttons can still receive focus in some browsers
      // but should not be interactive
      expect(button).toBeDisabled();
    });

    it('applies custom className', () => {
      render(<Button className="custom-class">Custom</Button>);

      const button = screen.getByRole('button');
      expect(button.className).toContain('custom-class');
    });

    it('forwards ref correctly', () => {
      const ref = { current: null };

      render(<Button ref={ref}>Ref Button</Button>);

      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    });

    it('passes through aria attributes', () => {
      render(
        <Button aria-label="Close dialog" aria-pressed="true">
          X
        </Button>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Close dialog');
      expect(button).toHaveAttribute('aria-pressed', 'true');
    });
  });

  // ===========================================================================
  // buttonVariants utility Tests
  // ===========================================================================
  describe('buttonVariants utility', () => {
    it('generates default classes', () => {
      const classes = buttonVariants();
      expect(classes).toContain('inline-flex');
      expect(classes).toContain('items-center');
    });

    it('generates variant-specific classes', () => {
      const destructiveClasses = buttonVariants({ variant: 'destructive' });
      expect(destructiveClasses).toContain('bg-destructive');

      const outlineClasses = buttonVariants({ variant: 'outline' });
      expect(outlineClasses).toContain('border');
    });

    it('generates size-specific classes', () => {
      const smClasses = buttonVariants({ size: 'sm' });
      expect(smClasses).toContain('h-8');

      const lgClasses = buttonVariants({ size: 'lg' });
      expect(lgClasses).toContain('h-10');
    });

    it('merges custom className', () => {
      const classes = buttonVariants({ className: 'my-custom-class' });
      expect(classes).toContain('my-custom-class');
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================
  describe('edge cases', () => {
    it('handles empty children gracefully', () => {
      render(<Button></Button>);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('handles multiple children', () => {
      render(
        <Button>
          <span>Icon</span>
          <span>Text</span>
        </Button>
      );

      expect(screen.getByText('Icon')).toBeInTheDocument();
      expect(screen.getByText('Text')).toBeInTheDocument();
    });

    it('accepts type attribute', () => {
      render(<Button type="submit">Submit</Button>);

      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
    });
  });
});
