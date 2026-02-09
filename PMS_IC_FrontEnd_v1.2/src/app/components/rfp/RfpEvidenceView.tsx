import {
  Shield,
  FileText,
  Cpu,
  Clock,
  GitBranch,
  CheckCircle,
  AlertTriangle,
  Download,
  ExternalLink,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import type { Evidence } from '../../../types/rfp';
import { cn } from '../ui/utils';

interface RfpEvidenceViewProps {
  open: boolean;
  onClose: () => void;
  evidence: Evidence[];
  isLoading?: boolean;
}

const INTEGRITY_CONFIG: Record<string, { color: string; icon: typeof CheckCircle }> = {
  VERIFIED: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
  MODIFIED: { color: 'bg-yellow-100 text-yellow-700', icon: AlertTriangle },
  MISSING: { color: 'bg-red-100 text-red-700', icon: AlertTriangle },
};

export function RfpEvidenceView({ open, onClose, evidence, isLoading }: RfpEvidenceViewProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            Evidence View (Audit Mode)
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between py-2 border-b">
          <span className="text-sm text-gray-500">{evidence.length} requirements with evidence</span>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Export (CSV/PDF)
          </Button>
        </div>

        <div className="flex-1 overflow-auto space-y-4 py-3">
          {isLoading ? (
            <div className="text-center py-12 text-gray-400 text-sm">Evidence 데이터를 불러오는 중...</div>
          ) : evidence.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              <Shield className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              Evidence 데이터가 없습니다.
            </div>
          ) : (
            evidence.map((ev) => (
              <EvidenceCard key={ev.requirementId} evidence={ev} />
            ))
          )}
        </div>

        <div className="pt-3 border-t">
          <Button variant="outline" onClick={onClose}>닫기</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EvidenceCard({ evidence: ev }: { evidence: Evidence }) {
  const integrityConfig = INTEGRITY_CONFIG[ev.sourceEvidence.integrityStatus] || INTEGRITY_CONFIG.MISSING;
  const IntegrityIcon = integrityConfig.icon;

  return (
    <Card className="border">
      <CardContent className="p-4 space-y-4">
        {/* Requirement header */}
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-sm">{ev.requirementTitle}</h4>
            <Badge className="bg-gray-100 text-gray-600 text-xs mt-1">{ev.requirementStatus}</Badge>
          </div>
          <Badge className={cn(integrityConfig.color)}>
            <IntegrityIcon className="h-3 w-3 mr-1" />
            {ev.sourceEvidence.integrityStatus}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Source Evidence */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
              <FileText className="h-3.5 w-3.5" /> Source Evidence
            </div>
            <div className="text-xs space-y-1">
              <div className="text-gray-500">
                {ev.sourceEvidence.rfpTitle} ({ev.sourceEvidence.rfpVersionLabel})
              </div>
              <div className="text-gray-500">
                Section {ev.sourceEvidence.section} / {ev.sourceEvidence.paragraphId}
              </div>
              <div className="bg-gray-50 rounded p-2 italic text-gray-600 border-l-2 border-blue-300">
                "{ev.sourceEvidence.snippet}"
              </div>
              <div className="font-mono text-gray-400 text-[10px] truncate">
                Checksum: {ev.sourceEvidence.fileChecksum}
              </div>
            </div>
          </div>

          {/* AI Evidence */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
              <Cpu className="h-3.5 w-3.5" /> AI Evidence
            </div>
            <div className="text-xs space-y-1">
              <div className="text-gray-500">
                Model: {ev.aiEvidence.modelName} {ev.aiEvidence.modelVersion}
              </div>
              <div className="text-gray-500">
                Prompt: {ev.aiEvidence.promptVersion} | Schema: {ev.aiEvidence.schemaVersion}
              </div>
              <div className="text-gray-500">
                Params: temp={ev.aiEvidence.generationParams.temperature}, top_p={ev.aiEvidence.generationParams.top_p}
              </div>
              <div className="text-gray-500">
                Confidence: <strong>{(ev.aiEvidence.confidence * 100).toFixed(0)}%</strong>
              </div>
              {ev.aiEvidence.wasEdited && (
                <Badge className="bg-orange-100 text-orange-700 text-xs">Edited by human</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Change Evidence */}
        {ev.changeEvidence.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
              <Clock className="h-3.5 w-3.5" /> Change History
            </div>
            <div className="space-y-1">
              {ev.changeEvidence.map((ch) => (
                <div key={ch.id} className="flex items-center gap-2 text-xs text-gray-500">
                  <Badge className="bg-gray-100 text-gray-600 text-[10px]">{ch.changeType}</Badge>
                  <span>{ch.reason}</span>
                  <span className="text-gray-400">
                    {ch.changedBy.name} — {new Date(ch.changedAt).toLocaleString('ko-KR')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Impact Evidence */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
            <GitBranch className="h-3.5 w-3.5" /> Trace Chain
          </div>
          <div className="flex gap-3 text-xs text-gray-500">
            {ev.impactEvidence.impactedEpics.length > 0 && (
              <span>Epic: {ev.impactEvidence.impactedEpics.map((e) => e.title).join(', ')}</span>
            )}
            {ev.impactEvidence.impactedWbs.length > 0 && (
              <span>WBS: {ev.impactEvidence.impactedWbs.map((w) => w.title).join(', ')}</span>
            )}
            {ev.impactEvidence.impactedTests.length > 0 && (
              <span>Test: {ev.impactEvidence.impactedTests.map((t) => t.title).join(', ')}</span>
            )}
            {ev.impactEvidence.impactedSprints.length > 0 && (
              <span>Sprint: {ev.impactEvidence.impactedSprints.map((s) => s.name).join(', ')}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
