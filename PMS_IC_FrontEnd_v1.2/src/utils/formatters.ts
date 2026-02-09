/**
 * Date and number formatting utilities
 */

export interface DateFormatOptions {
  includeTime?: boolean;
  includeSeconds?: boolean;
  format?: 'short' | 'medium' | 'long';
}

/**
 * Format date string to Korean locale format
 */
export const formatDate = (
  dateStr?: string | null,
  options: DateFormatOptions = {}
): string => {
  if (!dateStr) return '-';

  const { includeTime = true, includeSeconds = false, format = 'medium' } = options;

  const formatOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };

  if (includeTime) {
    formatOptions.hour = '2-digit';
    formatOptions.minute = '2-digit';
    if (includeSeconds) {
      formatOptions.second = '2-digit';
    }
  }

  if (format === 'short') {
    formatOptions.year = '2-digit';
  } else if (format === 'long') {
    formatOptions.month = 'long';
    formatOptions.weekday = 'short';
  }

  return new Date(dateStr).toLocaleDateString('ko-KR', formatOptions);
};

/**
 * Format date to relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (dateStr?: string | null): string => {
  if (!dateStr) return '-';

  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return '방금 전';
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;

  return formatDate(dateStr, { includeTime: false });
};

/**
 * Format number with locale-specific thousands separator
 */
export const formatNumber = (num?: number | null): string => {
  if (num === undefined || num === null) return '-';
  return num.toLocaleString('ko-KR');
};

/**
 * Format percentage
 */
export const formatPercent = (value?: number | null, decimals = 0): string => {
  if (value === undefined || value === null) return '-';
  return `${value.toFixed(decimals)}%`;
};

/**
 * Check if a date is within the last N days
 */
export const isWithinDays = (dateStr?: string | null, days = 7): boolean => {
  if (!dateStr) return false;

  const date = new Date(dateStr);
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(now.getDate() - days);

  return date >= cutoff;
};

/**
 * Check if a date is today
 */
export const isToday = (dateStr?: string | null): boolean => {
  if (!dateStr) return false;

  const date = new Date(dateStr).toDateString();
  const today = new Date().toDateString();

  return date === today;
};

/**
 * Check if a date is this week
 */
export const isThisWeek = (dateStr?: string | null): boolean => {
  if (!dateStr) return false;

  const date = new Date(dateStr);
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  return date >= weekStart && date < weekEnd;
};

/**
 * Compute days remaining until a target date.
 * Returns negative values for past dates.
 */
export const computeDaysRemaining = (dateStr?: string | null): number => {
  if (!dateStr) return 0;
  const target = new Date(dateStr);
  const now = new Date();
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

/**
 * Format date string to date-only Korean locale format (no time).
 * Shorthand for formatDate(dateStr, { includeTime: false }).
 */
export const formatDateOnly = (dateStr?: string | null): string => {
  return formatDate(dateStr, { includeTime: false });
};
