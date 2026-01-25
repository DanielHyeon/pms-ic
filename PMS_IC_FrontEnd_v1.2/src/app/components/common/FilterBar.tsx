import { Search, Filter } from 'lucide-react';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  placeholder: string;
  showIcon?: boolean;
}

/**
 * Individual filter select component
 */
export function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
  showIcon = false,
}: FilterSelectProps) {
  return (
    <div className="flex items-center gap-2">
      {showIcon && <Filter size={16} className="text-gray-400" />}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxWidth?: string;
}

/**
 * Search input with icon
 */
export function SearchInput({
  value,
  onChange,
  placeholder = '검색...',
  maxWidth = 'max-w-sm',
}: SearchInputProps) {
  return (
    <div className={`relative flex-1 ${maxWidth}`}>
      <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

export interface FilterBarProps {
  children: React.ReactNode;
}

/**
 * Container for search and filter controls
 */
export default function FilterBar({ children }: FilterBarProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-center gap-4">
        {children}
      </div>
    </div>
  );
}

/**
 * Helper to create filter logic for common patterns
 */
export function createFilterFn<T>(
  searchFields: (keyof T)[],
  filterConfigs: { field: keyof T; value: string }[],
  searchQuery: string
) {
  return (item: T): boolean => {
    // Check filter conditions
    for (const config of filterConfigs) {
      if (config.value && item[config.field] !== config.value) {
        return false;
      }
    }

    // Check search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = searchFields.some((field) => {
        const value = item[field];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(query);
        }
        return false;
      });
      if (!matchesSearch) {
        return false;
      }
    }

    return true;
  };
}
