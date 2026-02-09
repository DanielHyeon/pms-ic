import { X, FileText, Cpu, ClipboardList, AlertTriangle, Shield } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { RfpStatusBadge } from './RfpStatusBadge';
import { ImpactChip } from './ImpactChip';
import { ExtractionRunBadge } from './ExtractionRunBadge';
import type { RfpDetail, RfpPanelMode, ExtractionRun, Evidence } from '../../../types/rfp';

interface RfpRightPanelProps {
  rfp: RfpDetail;
  mode: RfpPanelMode;
  onModeChange: (mode: RfpPanelMode) => void;
  onClose: () => void;
  extractionRuns?: ExtractionRun[];
  evidence?: Evidence[];
  impact?: { changeEvents: { id: string; changeType: string; reason: string; changedBy: { name: string }; changedAt: string }[]; impactSnapshot: { affectedEpics: number; affectedWbs: number; affectedSprints: number; affectedTests: number } };
}

const TAB_CONFIG: { value: RfpPanelMode; label: string; icon: typeof FileText }[] = [
  { value: 'overview', label: '개요', icon: FileText },
  { value: 'extraction_runs', label: '분석 이력', icon: Cpu },
  { value: 'derived_requirements', label: '요구사항', icon: ClipboardList },
  { value: 'impact', label: '변경 영향', icon: AlertTriangle },
  { value: 'evidence', label: 'Evidence', icon: Shield },
];

export function RfpRightPanel({
  rfp,
  mode,
  onModeChange,
  onClose,
  extractionRuns = [],
  evidence = [],
  impact,
}: RfpRightPanelProps) {
  return (
    <div className="w-96 border-l border-gray-200 bg-white flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-semibold text-sm truncate flex-1">{rfp.title}</h3>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0 ml-2">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={mode} onValueChange={(v) => onModeChange(v as RfpPanelMode)} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="px-2 pt-2 flex-shrink-0 justify-start gap-0 bg-transparent border-b rounded-none h-auto">
          {TAB_CONFIG.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="text-xs px-2 py-1.5 data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none"
              >
                <Icon className="h-3 w-3 mr-1" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Overview */}
          <TabsContent value="overview" className="mt-0 space-y-4">
            <div className="flex items-center gap-2">
              <RfpStatusBadge status={rfp.status} />
              {rfp.currentVersion && (
                <Badge className="bg-gray-100 text-gray-600 text-xs">{rfp.currentVersion.versionLabel}</Badge>
              )}
            </div>

            <div className="space-y-3 text-sm">
              <InfoRow label="Origin" value={rfp.originType?.replace(/_/g, ' ') || '-'} />
              {rfp.currentVersion && (
                <>
                  <InfoRow label="File" value={rfp.currentVersion.fileName} />
                  <InfoRow label="Size" value={`${(rfp.currentVersion.fileSize / 1024 / 1024).toFixed(1)} MB`} />
                  <InfoRow label="Checksum" value={rfp.currentVersion.checksum} mono />
                </>
              )}
              <InfoRow label="Created" value={new Date(rfp.createdAt).toLocaleString('ko-KR')} />
              <InfoRow label="Updated" value={new Date(rfp.updatedAt).toLocaleString('ko-KR')} />
            </div>

            <div className="pt-3 border-t space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Requirements</span>
                <span className="font-medium">{rfp.kpi.confirmedRequirements}/{rfp.kpi.derivedRequirements}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Epic Link Rate</span>
                <span className="font-medium">{Math.round(rfp.kpi.epicLinkRate * 100)}%</span>
              </div>
              <ImpactChip level={rfp.kpi.changeImpact.level} count={rfp.kpi.changeImpact.impactedEpics} />
            </div>

            {rfp.latestRun && (
              <div className="pt-3 border-t">
                <div className="text-xs text-gray-500 mb-1">Latest Run</div>
                <ExtractionRunBadge run={rfp.latestRun} />
              </div>
            )}

            {rfp.failureReason && (
              <Card className="bg-red-50 border-red-200">
                <CardContent className="p-3 text-sm text-red-700">
                  <strong>Failure:</strong> {rfp.failureReason}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Extraction Runs */}
          <TabsContent value="extraction_runs" className="mt-0 space-y-3">
            {extractionRuns.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-400">
                <Cpu className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                분석 이력이 없습니다.
              </div>
            ) : (
              extractionRuns.map((run) => (
                <Card key={run.id}>
                  <CardContent className="p-3 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="font-medium">{run.modelName} {run.modelVersion}</span>
                      <Badge className={run.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>
                        {run.status}
                      </Badge>
                    </div>
                    <div className="text-gray-400">Prompt: {run.promptVersion} | Schema: {run.schemaVersion}</div>
                    <div className="text-gray-400">{new Date(run.startedAt).toLocaleString('ko-KR')}</div>
                    {run.stats && (
                      <div className="flex gap-3 text-gray-500 pt-1">
                        <span>Total: {run.stats.totalCount}</span>
                        <span>Ambig: {run.stats.ambiguityCount}</span>
                        <span>Conf: {(run.stats.avgConfidence * 100).toFixed(0)}%</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Derived Requirements */}
          <TabsContent value="derived_requirements" className="mt-0">
            <div className="text-center py-8 text-sm text-gray-400">
              <ClipboardList className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>Requirements: {rfp.kpi.derivedRequirements}</p>
              <p>Confirmed: {rfp.kpi.confirmedRequirements}</p>
              <Button variant="outline" size="sm" className="mt-3 text-xs">
                요구사항 화면에서 보기
              </Button>
            </div>
          </TabsContent>

          {/* Impact */}
          <TabsContent value="impact" className="mt-0 space-y-3">
            {!impact ? (
              <div className="text-center py-8 text-sm text-gray-400">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                변경 이력이 없습니다.
              </div>
            ) : (
              <>
                <Card>
                  <CardContent className="p-3">
                    <h4 className="text-xs font-medium mb-2">Impact Snapshot</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <span className="text-gray-500">Epics: <strong>{impact.impactSnapshot.affectedEpics}</strong></span>
                      <span className="text-gray-500">WBS: <strong>{impact.impactSnapshot.affectedWbs}</strong></span>
                      <span className="text-gray-500">Sprints: <strong>{impact.impactSnapshot.affectedSprints}</strong></span>
                      <span className="text-gray-500">Tests: <strong>{impact.impactSnapshot.affectedTests}</strong></span>
                    </div>
                  </CardContent>
                </Card>
                {impact.changeEvents.map((evt) => (
                  <Card key={evt.id}>
                    <CardContent className="p-3 text-xs">
                      <div className="flex justify-between mb-1">
                        <Badge className="bg-gray-100 text-gray-600 text-xs">{evt.changeType}</Badge>
                        <span className="text-gray-400">{new Date(evt.changedAt).toLocaleString('ko-KR')}</span>
                      </div>
                      <p className="text-gray-600">{evt.reason}</p>
                      <p className="text-gray-400 mt-1">by {evt.changedBy.name}</p>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </TabsContent>

          {/* Evidence */}
          <TabsContent value="evidence" className="mt-0 space-y-3">
            {evidence.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-400">
                <Shield className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                Evidence 데이터가 없습니다.
              </div>
            ) : (
              evidence.map((ev) => (
                <Card key={ev.requirementId}>
                  <CardContent className="p-3 text-xs space-y-2">
                    <div className="font-medium text-sm">{ev.requirementTitle}</div>
                    <div className="text-gray-400">Status: {ev.requirementStatus}</div>
                    <div className="border-t pt-2">
                      <div className="font-medium text-gray-600 mb-1">Source</div>
                      <div className="text-gray-500">
                        {ev.sourceEvidence.rfpTitle} ({ev.sourceEvidence.rfpVersionLabel}) - Section {ev.sourceEvidence.section}
                      </div>
                      <div className="bg-gray-50 p-2 rounded text-gray-600 mt-1 italic">
                        "{ev.sourceEvidence.snippet}"
                      </div>
                      <Badge className={ev.sourceEvidence.integrityStatus === 'VERIFIED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                        {ev.sourceEvidence.integrityStatus}
                      </Badge>
                    </div>
                    <div className="border-t pt-2">
                      <div className="font-medium text-gray-600 mb-1">AI</div>
                      <div className="text-gray-500">
                        {ev.aiEvidence.modelName} {ev.aiEvidence.modelVersion} | Prompt {ev.aiEvidence.promptVersion}
                      </div>
                      <div className="text-gray-500">Confidence: {(ev.aiEvidence.confidence * 100).toFixed(0)}%</div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={`font-medium text-right max-w-[200px] truncate ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </span>
    </div>
  );
}
