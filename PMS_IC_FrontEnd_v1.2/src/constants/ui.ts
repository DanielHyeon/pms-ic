/**
 * UI Constants for consistent sizing and styling across the application
 */

/**
 * Standard icon sizes used throughout the application
 */
export const ICON_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
} as const;

export type IconSize = typeof ICON_SIZES[keyof typeof ICON_SIZES];

/**
 * Common spacing values
 */
export const SPACING = {
  xs: 'p-1',
  sm: 'p-2',
  md: 'p-4',
  lg: 'p-6',
  xl: 'p-8',
} as const;

/**
 * Card styling presets
 */
export const CARD_STYLES = {
  default: 'bg-white rounded-xl shadow-sm border border-gray-200',
  elevated: 'bg-white rounded-xl shadow-md border border-gray-200',
  flat: 'bg-white rounded-lg border border-gray-200',
} as const;

/**
 * Button styling presets
 */
export const BUTTON_STYLES = {
  primary: 'px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700',
  secondary: 'px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200',
  outline: 'px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50',
  danger: 'px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700',
  ghost: 'px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg',
} as const;

/**
 * Input styling presets
 */
export const INPUT_STYLES = {
  default: 'px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500',
  error: 'px-3 py-2 border border-red-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500',
} as const;

/**
 * Table styling presets
 */
export const TABLE_STYLES = {
  header: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase',
  headerCenter: 'px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase',
  cell: 'px-4 py-3',
  cellCenter: 'px-4 py-3 text-center',
} as const;

/**
 * Animation classes
 */
export const ANIMATIONS = {
  spin: 'animate-spin',
  pulse: 'animate-pulse',
  bounce: 'animate-bounce',
  fadeIn: 'animate-fade-in',
} as const;

/**
 * Z-index layers
 */
export const Z_INDEX = {
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  modal: 40,
  popover: 50,
  tooltip: 60,
} as const;
