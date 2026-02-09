import { AlertTriangle } from 'lucide-react';
import { Badge } from '../ui/badge';
import type { ChangeImpactLevel } from '../../../types/rfp';
import { cn } from '../ui/utils';

const IMPACT_CONFIG: Record<ChangeImpactLevel, { label: string; color: string; show: boolean }> = {
  NONE: { label: '영향 없음', color: 'bg-gray-50 text-gray-500', show: false },
  LOW: { label: '낮음', color: 'bg-green-100 text-green-700', show: true },
  MEDIUM: { label: '중간', color: 'bg-yellow-100 text-yellow-700', show: true },
  HIGH: { label: '높음', color: 'bg-red-100 text-red-700', show: true },
};

interface ImpactChipProps {
  level: ChangeImpactLevel;
  count?: number;
  className?: string;
}

export function ImpactChip({ level, count, className }: ImpactChipProps) {
  const config = IMPACT_CONFIG[level];
  if (!config.show) return null;

  return (
    <Badge className={cn(config.color, className)}>
      <AlertTriangle className="h-3 w-3 mr-1" />
      {config.label}
      {count !== undefined && count > 0 && <span className="ml-1">({count})</span>}
    </Badge>
  );
}
