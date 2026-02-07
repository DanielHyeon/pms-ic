// Phase 5: Result -> ViewState normalizer + unwrapOrThrow for React Query integration

import type { Result, ViewState, ResultWarning, ApiError } from '../types/result';

// Fallback observation logger — replaces console.warn with structured event
const fallbackLog: Array<{ endpoint: string; durationMs: number; errorCode: string; at: string }> = [];

function logFetchFallback(entry: { endpoint: string; durationMs: number; errorCode: string }) {
  fallbackLog.push({ ...entry, at: new Date().toISOString() });
  // Keep last 100 entries to avoid memory leak
  if (fallbackLog.length > 100) fallbackLog.shift();
}

/** Read-only access to fallback log for P4 observability integration */
export function getFallbackLog() {
  return [...fallbackLog];
}

// ==================== toViewState ====================

export interface ToViewStateOptions<T> {
  isEmpty?: (data: T) => boolean;
  emptyData?: () => T;
}

/**
 * Converts Result<T> to ViewState<T> for component consumption.
 * Default empty check: null or empty array.
 * Override with isEmpty for domain-specific logic.
 */
export function toViewState<T>(result: Result<T>, options?: ToViewStateOptions<T>): ViewState<T> {
  const warnings: ResultWarning[] = [...(result.warnings ?? [])];

  if (result.ok) {
    const data = result.data;
    const isEmptyDefault = data === null
      || data === undefined
      || (Array.isArray(data) && data.length === 0);
    const isEmpty = options?.isEmpty ? options.isEmpty(data) : isEmptyDefault;

    return {
      status: isEmpty ? 'empty' : 'ready',
      data,
      warnings,
      meta: result.meta,
    };
  }

  // Failure with fallback data
  if (result.fallbackData !== undefined) {
    warnings.push({ code: 'USING_FALLBACK', message: `Live data unavailable (${result.error.code})` });
    return {
      status: 'fallback',
      data: result.fallbackData,
      warnings,
      meta: result.meta,
      error: result.error,
    };
  }

  // Failure without fallback
  return {
    status: 'error',
    data: null,
    warnings,
    meta: result.meta,
    error: result.error,
  };
}

// ==================== unwrapOrThrow ====================

/**
 * For React Query queryFn: extracts data from Result.
 * - ok -> data
 * - fail + fallbackData -> fallbackData (logs fallback event)
 * - fail + no fallbackData -> throws ApiError (React Query catches as error)
 */
export function unwrapOrThrow<T>(result: Result<T>): T {
  if (result.ok) {
    return result.data;
  }

  if (result.fallbackData !== undefined) {
    logFetchFallback({
      endpoint: result.meta.endpoint,
      durationMs: result.meta.durationMs,
      errorCode: result.error.code,
    });
    return result.fallbackData;
  }

  throw result.error;
}
