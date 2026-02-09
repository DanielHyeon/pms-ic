import { Search, Filter, RefreshCw, ArrowUpDown } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { RFP_FILTER_STATUS_OPTIONS, RFP_SORT_OPTIONS } from '../../../types/rfp';
import type { RfpFilterStatus } from '../../../types/rfp';

export interface RfpFilterValues {
  search: string;
  status: RfpFilterStatus;
  sort: string;
}

interface RfpFiltersProps {
  filters: RfpFilterValues;
  onFilterChange: (filters: RfpFilterValues) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function RfpFilters({ filters, onFilterChange, onRefresh, isLoading }: RfpFiltersProps) {
  const updateFilter = <K extends keyof RfpFilterValues>(key: K, value: RfpFilterValues[K]) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex gap-3 items-center">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="RFP 검색..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Status filter */}
          <Select
            value={filters.status}
            onValueChange={(v) => updateFilter('status', v as RfpFilterStatus)}
          >
            <SelectTrigger className="w-36">
              <Filter className="h-4 w-4 mr-1.5" />
              <SelectValue placeholder="상태" />
            </SelectTrigger>
            <SelectContent>
              {RFP_FILTER_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select
            value={filters.sort}
            onValueChange={(v) => updateFilter('sort', v)}
          >
            <SelectTrigger className="w-40">
              <ArrowUpDown className="h-4 w-4 mr-1.5" />
              <SelectValue placeholder="정렬" />
            </SelectTrigger>
            <SelectContent>
              {RFP_SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Refresh */}
          <Button variant="outline" size="icon" onClick={onRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
