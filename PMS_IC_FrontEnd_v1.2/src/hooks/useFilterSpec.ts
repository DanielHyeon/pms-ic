import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { FilterKeyDef, FilterValues } from '../app/components/common/FilterSpecBar';
import { serializeFilters, deserializeFilters } from '../app/components/common/FilterSpecBar';

interface UseFilterSpecOptions {
  /** Filter key definitions from the ontology */
  keys: FilterKeyDef[];
  /** Default filter values (from PresetPolicy.ui.defaultFilters) */
  defaults?: Record<string, string>;
  /** Whether to sync with URL search params */
  syncUrl?: boolean;
}

interface UseFilterSpecReturn {
  /** Current filter values */
  filters: FilterValues;
  /** Update filter values (merges with existing) */
  setFilters: (values: FilterValues) => void;
  /** Update a single filter key */
  setFilter: (key: string, value: string | boolean | undefined) => void;
  /** Clear all filters (optionally preserving search query) */
  clearFilters: () => void;
  /** Number of active non-search filters */
  activeCount: number;
  /** Whether any filter is active */
  hasActiveFilters: boolean;
}

/**
 * Hook to manage FilterSpec-based filter state with optional URL sync.
 * Integrates with the ontology system: each screen passes its FilterKeyDef[]
 * and optionally PresetPolicy defaults.
 */
export function useFilterSpec({
  keys,
  defaults = {},
  syncUrl = true,
}: UseFilterSpecOptions): UseFilterSpecReturn {
  const [searchParams, setSearchParams] = syncUrl
    ? useSearchParams()
    : [new URLSearchParams(), () => {}];

  // Initialize from URL params or defaults
  const [filters, setFiltersState] = useState<FilterValues>(() => {
    if (syncUrl) {
      const fromUrl = deserializeFilters(searchParams as URLSearchParams, keys);
      if (Object.keys(fromUrl).length > 0) return fromUrl;
    }
    // Apply defaults
    const initial: FilterValues = {};
    for (const [k, v] of Object.entries(defaults)) {
      initial[k] = v;
    }
    return initial;
  });

  // Sync filters → URL
  useEffect(() => {
    if (!syncUrl) return;
    const params = serializeFilters(filters, keys);
    (setSearchParams as ReturnType<typeof useSearchParams>[1])(params, { replace: true });
  }, [filters, keys, syncUrl, setSearchParams]);

  const setFilters = useCallback((values: FilterValues) => {
    setFiltersState(values);
  }, []);

  const setFilter = useCallback(
    (key: string, value: string | boolean | undefined) => {
      setFiltersState((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const clearFilters = useCallback(() => {
    const cleared: FilterValues = {};
    // Re-apply defaults
    for (const [k, v] of Object.entries(defaults)) {
      cleared[k] = v;
    }
    setFiltersState(cleared);
  }, [defaults]);

  const activeCount = useMemo(
    () =>
      keys.filter((k) => {
        if (k.type === 'search') return false;
        const v = filters[k.key];
        return v !== undefined && v !== '' && v !== false;
      }).length,
    [keys, filters]
  );

  return {
    filters,
    setFilters,
    setFilter,
    clearFilters,
    activeCount,
    hasActiveFilters: activeCount > 0,
  };
}
