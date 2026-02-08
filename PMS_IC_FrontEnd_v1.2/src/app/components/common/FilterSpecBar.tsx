import { useCallback, useMemo } from 'react';
import { Search, Filter, X, ChevronDown } from 'lucide-react';
import { cn } from '../ui/utils';

// ─── FilterSpec key definition ──────────────────────────

export type FilterKeyType = 'enum' | 'string' | 'boolean' | 'date' | 'search';

export interface FilterKeyDef {
  /** The key name matching the FilterSpec interface field */
  key: string;
  /** Display label */
  label: string;
  /** Data type determines which control is rendered */
  type: FilterKeyType;
  /** For 'enum' type: available options */
  options?: { value: string; label: string }[];
  /** Placeholder text */
  placeholder?: string;
  /** Presets where this filter is hidden */
  hiddenInPresets?: string[];
}

export type FilterValues = Record<string, string | boolean | undefined>;

// ─── URL serialization helpers ──────────────────────────

export function serializeFilters(
  filters: FilterValues,
  keys: FilterKeyDef[]
): URLSearchParams {
  const params = new URLSearchParams();
  for (const def of keys) {
    const val = filters[def.key];
    if (val === undefined || val === '' || val === false) continue;
    if (typeof val === 'boolean') {
      params.set(def.key, 'true');
    } else {
      params.set(def.key, val);
    }
  }
  return params;
}

export function deserializeFilters(
  params: URLSearchParams,
  keys: FilterKeyDef[]
): FilterValues {
  const result: FilterValues = {};
  for (const def of keys) {
    const raw = params.get(def.key);
    if (raw === null) continue;
    if (def.type === 'boolean') {
      result[def.key] = raw === 'true';
    } else {
      result[def.key] = raw;
    }
  }
  return result;
}

// ─── FilterSpecBar component ────────────────────────────

interface FilterSpecBarProps {
  /** Filter key definitions from the ontology node */
  keys: FilterKeyDef[];
  /** Current filter values */
  values: FilterValues;
  /** Called when any filter value changes */
  onChange: (values: FilterValues) => void;
  /** Currently active preset (used to hide/show certain filters) */
  activePreset?: string;
  /** Compact rendering mode */
  compact?: boolean;
}

export function FilterSpecBar({
  keys,
  values,
  onChange,
  activePreset,
  compact = false,
}: FilterSpecBarProps) {
  const visibleKeys = useMemo(() => {
    if (!activePreset) return keys;
    return keys.filter(
      (k) => !k.hiddenInPresets?.includes(activePreset)
    );
  }, [keys, activePreset]);

  const searchKey = useMemo(
    () => visibleKeys.find((k) => k.type === 'search'),
    [visibleKeys]
  );
  const filterKeys = useMemo(
    () => visibleKeys.filter((k) => k.type !== 'search'),
    [visibleKeys]
  );

  const activeFilterCount = useMemo(
    () =>
      filterKeys.filter((k) => {
        const v = values[k.key];
        return v !== undefined && v !== '' && v !== false;
      }).length,
    [filterKeys, values]
  );

  const handleChange = useCallback(
    (key: string, value: string | boolean | undefined) => {
      onChange({ ...values, [key]: value });
    },
    [values, onChange]
  );

  const handleClearAll = useCallback(() => {
    const cleared: FilterValues = {};
    // Preserve search query when clearing filters
    if (searchKey && values[searchKey.key]) {
      cleared[searchKey.key] = values[searchKey.key];
    }
    onChange(cleared);
  }, [searchKey, values, onChange]);

  return (
    <div className={cn(
      'bg-white rounded-xl shadow-sm border border-gray-200',
      compact ? 'p-2' : 'p-4'
    )}>
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search input (always first if present) */}
        {searchKey && (
          <div className={cn('relative flex-1', compact ? 'min-w-[180px]' : 'min-w-[240px] max-w-sm')}>
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={searchKey.placeholder || 'Search...'}
              value={(values[searchKey.key] as string) || ''}
              onChange={(e) => handleChange(searchKey.key, e.target.value)}
              className={cn(
                'w-full pl-9 pr-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
                compact ? 'py-1.5 text-xs' : 'py-2 text-sm'
              )}
            />
          </div>
        )}

        {/* Filter indicator */}
        {filterKeys.length > 0 && (
          <div className="flex items-center gap-1 text-gray-500">
            <Filter size={14} />
            {activeFilterCount > 0 && (
              <span className="text-xs bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5 font-medium">
                {activeFilterCount}
              </span>
            )}
          </div>
        )}

        {/* Filter controls */}
        {filterKeys.map((def) => (
          <FilterControl
            key={def.key}
            def={def}
            value={values[def.key]}
            onChange={(v) => handleChange(def.key, v)}
            compact={compact}
          />
        ))}

        {/* Clear all button */}
        {activeFilterCount > 0 && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Clear all filters"
          >
            <X size={12} />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Individual filter control ──────────────────────────

interface FilterControlProps {
  def: FilterKeyDef;
  value: string | boolean | undefined;
  onChange: (value: string | boolean | undefined) => void;
  compact: boolean;
}

function FilterControl({ def, value, onChange, compact }: FilterControlProps) {
  switch (def.type) {
    case 'enum':
      return (
        <div className="relative">
          <select
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value || undefined)}
            className={cn(
              'appearance-none border border-gray-300 rounded-lg bg-white pr-7 focus:outline-none focus:ring-2 focus:ring-blue-500',
              compact ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm',
              value ? 'border-blue-400 bg-blue-50' : ''
            )}
          >
            <option value="">{def.placeholder || def.label}</option>
            {def.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={12}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
        </div>
      );

    case 'boolean':
      return (
        <button
          onClick={() => onChange(value ? undefined : true)}
          className={cn(
            'border rounded-lg transition-all',
            compact ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm',
            value
              ? 'border-blue-400 bg-blue-50 text-blue-700 font-medium'
              : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
          )}
        >
          {def.label}
        </button>
      );

    case 'date':
      return (
        <input
          type="date"
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value || undefined)}
          className={cn(
            'border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500',
            compact ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm',
            value ? 'border-blue-400 bg-blue-50' : ''
          )}
          title={def.label}
        />
      );

    case 'string':
      return (
        <input
          type="text"
          placeholder={def.placeholder || def.label}
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value || undefined)}
          className={cn(
            'border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500',
            compact ? 'px-2 py-1 text-xs w-28' : 'px-3 py-2 text-sm w-36'
          )}
        />
      );

    default:
      return null;
  }
}
