import { describe, it, expect } from 'vitest';
import { toViewState, unwrapOrThrow, getFallbackLog } from '../toViewState';
import { ok, fail } from '../../types/result';
import type { ResultMeta, ApiError } from '../../types/result';

const apiMeta: ResultMeta = {
  source: 'api',
  asOf: '2026-02-07T00:00:00Z',
  endpoint: '/test',
  durationMs: 50,
  usedFallback: false,
};

const fallbackMeta: ResultMeta = {
  ...apiMeta,
  source: 'fallback',
  usedFallback: true,
};

const networkError: ApiError = {
  code: 'NETWORK',
  message: 'Failed to fetch',
  endpoint: '/test',
  timestamp: '2026-02-07T00:00:00Z',
  retryable: true,
};

const http404Error: ApiError = {
  code: 'HTTP_4XX',
  status: 404,
  message: 'Not found',
  endpoint: '/test',
  timestamp: '2026-02-07T00:00:00Z',
  retryable: false,
};

// ==================== toViewState ====================

describe('toViewState', () => {
  it('maps ok result with data to ready status', () => {
    const result = ok({ items: [1, 2, 3] }, apiMeta);
    const vs = toViewState(result);

    expect(vs.status).toBe('ready');
    expect(vs.data).toEqual({ items: [1, 2, 3] });
    expect(vs.error).toBeUndefined();
    expect(vs.meta?.usedFallback).toBe(false);
  });

  it('maps ok result with empty array to empty status', () => {
    const result = ok([] as number[], apiMeta);
    const vs = toViewState(result);

    expect(vs.status).toBe('empty');
    expect(vs.data).toEqual([]);
  });

  it('maps ok result with custom isEmpty to empty status', () => {
    const dto = { backlogItems: [], epics: [], summary: { total: 0 } };
    const result = ok(dto, apiMeta);
    const vs = toViewState(result, {
      isEmpty: (d) => d.backlogItems.length === 0 && d.epics.length === 0,
    });

    expect(vs.status).toBe('empty');
    expect(vs.data).toEqual(dto);
  });

  it('maps ok result with non-empty custom check to ready', () => {
    const dto = { backlogItems: [{ id: '1' }], epics: [], summary: { total: 1 } };
    const result = ok(dto, apiMeta);
    const vs = toViewState(result, {
      isEmpty: (d) => d.backlogItems.length === 0 && d.epics.length === 0,
    });

    expect(vs.status).toBe('ready');
  });

  it('maps fail result with fallbackData to fallback status', () => {
    const result = fail(networkError, fallbackMeta, { cached: true });
    const vs = toViewState(result);

    expect(vs.status).toBe('fallback');
    expect(vs.data).toEqual({ cached: true });
    expect(vs.error).toEqual(networkError);
    expect(vs.warnings.some((w) => w.code === 'USING_FALLBACK')).toBe(true);
  });

  it('maps fail result without fallbackData to error status', () => {
    const result = fail(http404Error, fallbackMeta);
    const vs = toViewState(result);

    expect(vs.status).toBe('error');
    expect(vs.data).toBeNull();
    expect(vs.error).toEqual(http404Error);
  });

  it('preserves warnings from result', () => {
    const result = ok({ x: 1 }, apiMeta, [{ code: 'SLOW_RESPONSE', message: '> 3s' }]);
    const vs = toViewState(result);

    expect(vs.warnings).toHaveLength(1);
    expect(vs.warnings[0].code).toBe('SLOW_RESPONSE');
  });
});

// ==================== unwrapOrThrow ====================

describe('unwrapOrThrow', () => {
  it('returns data on ok result', () => {
    const result = ok({ id: '1' }, apiMeta);
    expect(unwrapOrThrow(result)).toEqual({ id: '1' });
  });

  it('returns fallbackData on fail with fallback', () => {
    const result = fail(networkError, fallbackMeta, { fallback: true });
    expect(unwrapOrThrow(result)).toEqual({ fallback: true });
  });

  it('logs fallback event when returning fallbackData', () => {
    const logBefore = getFallbackLog().length;
    const result = fail(networkError, fallbackMeta, { logged: true });
    unwrapOrThrow(result);

    const logAfter = getFallbackLog();
    expect(logAfter.length).toBe(logBefore + 1);
    const lastEntry = logAfter[logAfter.length - 1];
    expect(lastEntry.endpoint).toBe('/test');
    expect(lastEntry.errorCode).toBe('NETWORK');
  });

  it('throws ApiError on fail without fallback', () => {
    const result = fail(http404Error, fallbackMeta);

    expect(() => unwrapOrThrow(result)).toThrow();
    try {
      unwrapOrThrow(result);
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.code).toBe('HTTP_4XX');
      expect(apiErr.status).toBe(404);
      expect(apiErr.retryable).toBe(false);
    }
  });
});
