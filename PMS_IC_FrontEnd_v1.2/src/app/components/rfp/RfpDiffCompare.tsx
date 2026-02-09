import { Plus, Minus, Edit, AlertTriangle, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import type { RfpDiff, DiffItem } from '../../../types/rfp';
import { cn } from '../ui/utils';

const DIFF_TYPE_CONFIG: Record<DiffItem['type'], { icon: typeof Plus; color: string; label: string; bg: string }> = {
  NEW: { icon: Plus, color: 'text-green-600', label: 'New', bg: 'bg-green-50 border-green-200' },
  REMOVED: { icon: Minus, color: 'text-red-600', label: 'Removed', bg: 'bg-red-50 border-red-200' },
  MODIFIED: { icon: Edit, color: 'text-orange-600', label: 'Modified', bg: 'bg-orange-50 border-orange-200' },
};

interface RfpDiffCompareProps {
  open: boolean;
  onClose: () => void;
  diff: RfpDiff | null;
  isLoading?: boolean;
}

export function RfpDiffCompare({ open, onClose, diff, isLoading }: RfpDiffCompareProps) {
  const newCount = diff?.items.filter((i) => i.type === 'NEW').length || 0;
  const removedCount = diff?.items.filter((i) => i.type === 'REMOVED').length || 0;
  const modifiedCount = diff?.items.filter((i) => i.type === 'MODIFIED').length || 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[800px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            RFP Diff Compare
            {diff && (
              <span className="text-sm text-gray-400 font-normal ml-2">
                {diff.fromVersion} → {diff.toVersion}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {!diff || isLoading ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            {isLoading ? '비교 데이터를 불러오는 중...' : '비교 데이터가 없습니다.'}
          </div>
        ) : (
          <>
            {/* Summary stats */}
            <div className="flex gap-3 py-2">
              <Badge className="bg-green-100 text-green-700">
                <Plus className="h-3 w-3 mr-1" /> New: {newCount}
              </Badge>
              <Badge className="bg-red-100 text-red-700">
                <Minus className="h-3 w-3 mr-1" /> Removed: {removedCount}
              </Badge>
              <Badge className="bg-orange-100 text-orange-700">
                <Edit className="h-3 w-3 mr-1" /> Modified: {modifiedCount}
              </Badge>
            </div>

            {/* Impact summary */}
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-xs text-yellow-700">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span className="font-medium">Impact Summary</span>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-2 text-xs text-yellow-600">
                  <span>Epic: {diff.impactSummary.affectedEpics}</span>
                  <span>WBS: {diff.impactSummary.affectedWbs}</span>
                  <span>Sprint: {diff.impactSummary.affectedSprints}</span>
                  <span>Test: {diff.impactSummary.affectedTests}</span>
                </div>
              </CardContent>
            </Card>

            {/* Diff items */}
            <div className="flex-1 overflow-auto space-y-2 py-2">
              {diff.items.map((item, idx) => {
                const config = DIFF_TYPE_CONFIG[item.type];
                const Icon = config.icon;
                return (
                  <Card key={idx} className={cn('border', config.bg)}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <Icon className={cn('h-4 w-4 mt-0.5 flex-shrink-0', config.color)} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-white text-gray-600 text-xs border">{config.label}</Badge>
                            <span className="text-xs font-mono text-gray-500">{item.requirementKey}</span>
                          </div>
                          <p className="text-sm text-gray-700">{item.text}</p>
                          {item.previousText && (
                            <p className="text-sm text-gray-400 line-through mt-1">{item.previousText}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Action */}
            <div className="pt-3 border-t flex justify-between">
              <Button variant="outline" onClick={onClose}>닫기</Button>
              <Button variant="outline">
                <ExternalLink className="h-4 w-4 mr-2" />
                변경 승인 요청
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
