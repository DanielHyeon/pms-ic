import {
  Eye,
  Sparkles,
  GitBranch,
  MoreVertical,
  Upload,
  GitCompare,
  Shield,
  Download,
  FileText,
  Link2,
} from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { RfpStatusBadge } from './RfpStatusBadge';
import { ImpactChip } from './ImpactChip';
import { ExtractionRunBadge } from './ExtractionRunBadge';
import type { RfpDetail } from '../../../types/rfp';
import type { ViewModePreset } from '../../../types/menuOntology';

interface RfpCardProps {
  rfp: RfpDetail;
  preset: ViewModePreset;
  onView: (rfpId: string) => void;
  onAnalyze?: (rfpId: string) => void;
  onViewRequirements?: (rfpId: string) => void;
  onViewDiff?: (rfpId: string) => void;
  onViewEvidence?: (rfpId: string) => void;
  onViewLineage?: (rfpId: string) => void;
}

export function RfpCard({
  rfp,
  preset,
  onView,
  onAnalyze,
  onViewRequirements,
  onViewDiff,
  onViewEvidence,
  onViewLineage,
}: RfpCardProps) {
  const showActions = preset !== 'EXEC_SUMMARY';
  const showKpi = preset !== 'AUDIT_EVIDENCE';
  const showAnalyzeBtn = preset === 'PM_WORK' && ['UPLOADED', 'NEEDS_REANALYSIS', 'CONFIRMED'].includes(rfp.status);

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onView(rfp.id)}>
      <CardContent className="p-5">
        {/* Header: Title + Status */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm truncate">{rfp.title}</h3>
              {rfp.currentVersion && (
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {rfp.currentVersion.versionLabel}
                </span>
              )}
            </div>
            <RfpStatusBadge status={rfp.status} />
          </div>
          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(rfp.id); }}>
                  <Eye className="h-4 w-4 mr-2" /> 상세 보기
                </DropdownMenuItem>
                {onViewRequirements && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewRequirements(rfp.id); }}>
                    <FileText className="h-4 w-4 mr-2" /> 요구사항 보기
                  </DropdownMenuItem>
                )}
                {onAnalyze && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAnalyze(rfp.id); }}>
                    <Sparkles className="h-4 w-4 mr-2" /> AI 재분석
                  </DropdownMenuItem>
                )}
                {onViewLineage && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewLineage(rfp.id); }}>
                    <GitBranch className="h-4 w-4 mr-2" /> Lineage
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {onViewDiff && rfp.versionCount > 1 && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewDiff(rfp.id); }}>
                    <GitCompare className="h-4 w-4 mr-2" /> Diff 비교
                  </DropdownMenuItem>
                )}
                {onViewEvidence && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewEvidence(rfp.id); }}>
                    <Shield className="h-4 w-4 mr-2" /> Evidence 보기
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                  <Download className="h-4 w-4 mr-2" /> 내보내기
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
          {rfp.currentVersion && (
            <>
              <span>{rfp.currentVersion.uploadedBy.name}</span>
              <span>{new Date(rfp.currentVersion.uploadedAt).toLocaleDateString('ko-KR')}</span>
            </>
          )}
          {rfp.versionCount > 1 && (
            <span className="text-gray-300">v{rfp.versionCount} versions</span>
          )}
        </div>

        {/* KPIs */}
        {showKpi && (
          <div className="space-y-2 mb-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 flex items-center gap-1">
                <FileText className="h-3 w-3" /> Requirements
              </span>
              <span className="font-medium">
                {rfp.kpi.confirmedRequirements}/{rfp.kpi.derivedRequirements}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 flex items-center gap-1">
                <Link2 className="h-3 w-3" /> Epic Link
              </span>
              <span className="font-medium">{Math.round(rfp.kpi.epicLinkRate * 100)}%</span>
            </div>
            <Progress value={rfp.kpi.epicLinkRate * 100} className="h-1.5" />
          </div>
        )}

        {/* Bottom: Impact + Run badge */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <ImpactChip
            level={rfp.kpi.changeImpact.level}
            count={rfp.kpi.changeImpact.impactedEpics}
          />
          <ExtractionRunBadge run={rfp.latestRun} />
        </div>

        {/* Quick action */}
        {showAnalyzeBtn && (
          <div className="mt-3 pt-3 border-t">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={(e) => { e.stopPropagation(); onAnalyze?.(rfp.id); }}
            >
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              {rfp.status === 'NEEDS_REANALYSIS' ? 'AI 재분석' : rfp.status === 'UPLOADED' ? 'AI 분석 시작' : '요구사항 보기'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
