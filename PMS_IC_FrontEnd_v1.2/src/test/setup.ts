/**
 * Vitest setup file
 * Configures testing environment with jest-dom matchers
 */
import '@testing-library/jest-dom'

// Extend Vitest's expect with jest-dom matchers
declare module 'vitest' {
  interface Assertion<T> {
    toBeInTheDocument(): T
    toBeVisible(): T
    toBeDisabled(): T
    toBeEnabled(): T
    toHaveClass(className: string): T
    toHaveTextContent(text: string | RegExp): T
    toHaveValue(value: string | number | string[]): T
    toHaveAttribute(attr: string, value?: string): T
  }
}
