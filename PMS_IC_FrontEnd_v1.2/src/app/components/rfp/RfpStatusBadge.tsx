import { Loader2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import type { RfpStatus } from '../../../types/rfp';
import { RFP_STATUS_UI_MAP } from '../../../types/rfp';
import { cn } from '../ui/utils';

interface RfpStatusBadgeProps {
  status: RfpStatus;
  className?: string;
}

export function RfpStatusBadge({ status, className }: RfpStatusBadgeProps) {
  const mapping = RFP_STATUS_UI_MAP[status];
  if (!mapping.badgeLabel) return null;

  return (
    <Badge className={cn(mapping.badgeColor, mapping.pulse && 'animate-pulse', className)}>
      {mapping.pulse && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
      {mapping.badgeLabel}
    </Badge>
  );
}
