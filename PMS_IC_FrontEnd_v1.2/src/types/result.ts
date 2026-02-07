// Phase 5: Result Type Refactoring - Foundation Types
// Replaces nullable fetchWithFallback<T> pattern with discriminated union

// ==================== ApiError ====================

export type ApiErrorCode =
  | 'NETWORK'   // fetch failed (no connectivity)
  | 'TIMEOUT'   // AbortSignal.timeout fired
  | 'ABORTED'   // user navigation / manual abort
  | 'HTTP_4XX'  // client error (400-499)
  | 'HTTP_5XX'  // server error (500-599)
  | 'PARSE'     // response extraction failed
  | 'UNKNOWN';  // catch-all

export interface ApiError {
  code: ApiErrorCode;
  status?: number;
  message: string;
  endpoint: string;
  timestamp: string;
  retryable: boolean;
  cause?: unknown;
}

// ==================== ResultMeta ====================

export interface ResultMeta {
  source: 'api' | 'fallback' | 'cache';
  asOf: string;
  endpoint: string;
  durationMs: number;
  usedFallback: boolean;
}

// ==================== ResultWarning ====================

export interface ResultWarning {
  code: string;
  message?: string;
}

// ==================== Result<T> ====================

export type Result<T> =
  | { ok: true;  data: T;        meta: ResultMeta; warnings?: ResultWarning[] }
  | { ok: false; error: ApiError; meta: ResultMeta; warnings?: ResultWarning[]; fallbackData?: T };

// ==================== ViewState<T> ====================

export type ViewStatus = 'loading' | 'ready' | 'empty' | 'error' | 'fallback';

export interface ViewState<T> {
  status: ViewStatus;
  data: T | null;
  warnings: ResultWarning[];
  meta?: ResultMeta;
  error?: ApiError;
}

// ==================== Helper Constructors ====================

export function ok<T>(data: T, meta: ResultMeta, warnings?: ResultWarning[]): Result<T> {
  return { ok: true, data, meta, warnings };
}

export function fail<T>(
  error: ApiError,
  meta: ResultMeta,
  fallbackData?: T | null,
  warnings?: ResultWarning[],
): Result<T> {
  const result: Result<T> = { ok: false, error, meta, warnings };
  if (fallbackData !== undefined && fallbackData !== null) {
    (result as Extract<Result<T>, { ok: false }>).fallbackData = fallbackData;
  }
  return result;
}
