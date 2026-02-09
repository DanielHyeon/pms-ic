import { useState, useMemo, useCallback } from 'react';
import {
  FileText,
  Upload,
  Loader2,
} from 'lucide-react';
import { useProject } from '../../contexts/ProjectContext';
import type { RfpPanelMode, RfpStatus, OriginType } from '../../types/rfp';
import { ORIGIN_POLICY_MAP, RFP_STATUS_UI_MAP } from '../../types/rfp';
import type { ViewModePreset } from '../../types/menuOntology';
import { UserRole } from '../App';
import {
  useRfps,
  useProjectOrigin,
  useSetProjectOrigin,
  useCreateRfp,
  useUploadRfpFile,
  useTriggerAnalysis,
  useExtractionRuns,
  useLatestExtraction,
  useConfirmCandidates,
  useRejectCandidates,
  useUpdateCandidate,
  useRfpImpact,
  useRfpEvidence,
  useRfpDiff,
} from '../../hooks/api/useRfps';
import { usePreset } from '../../hooks/usePreset';
import { PresetSwitcher } from './common/PresetSwitcher';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

// RFP sub-components
import { OriginSelectionScreen } from './rfp/OriginSelectionScreen';
import { OriginSummaryStrip } from './rfp/OriginSummaryStrip';
import { RfpCard } from './rfp/RfpCard';
import { RfpKpiRow } from './rfp/RfpKpiRow';
import { RfpFilters, type RfpFilterValues } from './rfp/RfpFilters';
import { RfpUploadWizard } from './rfp/RfpUploadWizard';
import { RfpRightPanel } from './rfp/RfpRightPanel';
import { ExtractionReviewTable } from './rfp/ExtractionReviewTable';
import { RfpDiffCompare } from './rfp/RfpDiffCompare';
import { RfpEvidenceView } from './rfp/RfpEvidenceView';

interface RfpManagementProps {
  userRole: UserRole;
}

// Preset availability per role (Section 7.1)
function getRfpPresets(role: UserRole): ViewModePreset[] {
  switch (role) {
    case 'pmo_head':
      return ['PMO_CONTROL', 'EXEC_SUMMARY', 'AUDIT_EVIDENCE'];
    case 'pm':
    case 'business_analyst':
      return ['PM_WORK', 'PMO_CONTROL', 'EXEC_SUMMARY'];
    case 'developer':
    case 'qa':
      return ['DEV_EXECUTION', 'PM_WORK'];
    case 'admin':
      return ['PM_WORK', 'PMO_CONTROL', 'EXEC_SUMMARY', 'AUDIT_EVIDENCE', 'DEV_EXECUTION'];
    default:
      return ['PM_WORK'];
  }
}

// Status filter logic: maps UI filter values to backend statuses
function matchesStatusFilter(rfpStatus: RfpStatus, filterValue: string): boolean {
  if (filterValue === 'ALL') return true;
  if (filterValue === 'ANALYZING') {
    return ['PARSING', 'PARSED', 'EXTRACTING'].includes(rfpStatus);
  }
  return rfpStatus === filterValue;
}

export default function RfpManagement({ userRole }: RfpManagementProps) {
  const { currentProject } = useProject();
  const projectId = currentProject?.id;

  // Preset
  const { currentPreset, switchPreset } = usePreset(userRole);

  // Origin
  const { data: origin, isLoading: originLoading } = useProjectOrigin(projectId);
  const setOriginMutation = useSetProjectOrigin();

  // RFP list
  const [filters, setFilters] = useState<RfpFilterValues>({
    search: '',
    status: 'ALL',
    sort: 'updatedAt:desc',
  });
  const { data: rfps = [], isLoading: rfpsLoading, refetch: refetchRfps } = useRfps(projectId);

  // Filtered list
  const filteredRfps = useMemo(() => {
    let list = rfps.filter((rfp) => RFP_STATUS_UI_MAP[rfp.status]?.showInCardList);

    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter((rfp) => rfp.title.toLowerCase().includes(q));
    }

    if (filters.status !== 'ALL') {
      list = list.filter((rfp) => matchesStatusFilter(rfp.status, filters.status));
    }

    const [sortKey, sortDir] = filters.sort.split(':');
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'updatedAt') cmp = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      else if (sortKey === 'impactLevel') {
        const levels: Record<string, number> = { NONE: 0, LOW: 1, MEDIUM: 2, HIGH: 3 };
        cmp = (levels[b.kpi.changeImpact.level] || 0) - (levels[a.kpi.changeImpact.level] || 0);
      }
      else if (sortKey === 'requirementCount') cmp = b.kpi.derivedRequirements - a.kpi.derivedRequirements;
      return sortDir === 'asc' ? -cmp : cmp;
    });

    return list;
  }, [rfps, filters]);

  // Selected RFP & panel
  const [selectedRfpId, setSelectedRfpId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<RfpPanelMode>('overview');
  const selectedRfp = useMemo(() => rfps.find((r) => r.id === selectedRfpId) || null, [rfps, selectedRfpId]);

  // Wizard
  const [wizardOpen, setWizardOpen] = useState(false);
  const createRfpMutation = useCreateRfp();
  const uploadFileMutation = useUploadRfpFile();

  // Review
  const [reviewRfpId, setReviewRfpId] = useState<string | null>(null);
  const { data: latestExtraction } = useLatestExtraction(projectId, reviewRfpId || undefined);
  const confirmMutation = useConfirmCandidates();
  const rejectMutation = useRejectCandidates();
  const updateCandidateMutation = useUpdateCandidate();

  // Analysis
  const triggerAnalysisMutation = useTriggerAnalysis();

  // Right panel data
  const { data: extractionRuns } = useExtractionRuns(projectId, selectedRfpId || undefined);
  const { data: rfpImpact } = useRfpImpact(projectId, selectedRfpId || undefined);
  const { data: rfpEvidence } = useRfpEvidence(projectId, selectedRfpId || undefined);

  // Diff
  const [diffRfpId, setDiffRfpId] = useState<string | null>(null);
  const { data: diffData, isLoading: diffLoading } = useRfpDiff(projectId, diffRfpId || undefined, 'v1.0', 'v2.0');

  // Evidence dialog
  const [evidenceRfpId, setEvidenceRfpId] = useState<string | null>(null);
  const { data: evidenceData, isLoading: evidenceLoading } = useRfpEvidence(projectId, evidenceRfpId || undefined);

  // Permission checks
  const canUpload = ['pmo_head', 'pm', 'business_analyst', 'admin'].includes(userRole);

  // Handlers
  const handleOriginSelected = useCallback(
    (type: OriginType) => {
      if (!projectId) return;
      setOriginMutation.mutate({ projectId, originType: type });
    },
    [projectId, setOriginMutation]
  );

  const handleWizardComplete = useCallback(
    (data: { title: string; publisher: string; rfpType: string; file?: File; content?: string }) => {
      if (!projectId) return;
      if (data.file) {
        uploadFileMutation.mutate(
          { projectId, file: data.file, title: data.title },
          { onSuccess: () => setWizardOpen(false) }
        );
      } else {
        createRfpMutation.mutate(
          { projectId, data: { title: data.title, content: data.content } },
          { onSuccess: () => setWizardOpen(false) }
        );
      }
    },
    [projectId, uploadFileMutation, createRfpMutation]
  );

  const handleAnalyze = useCallback(
    (rfpId: string) => {
      if (!projectId) return;
      triggerAnalysisMutation.mutate({ projectId, rfpId });
    },
    [projectId, triggerAnalysisMutation]
  );

  const handleViewRfp = useCallback((rfpId: string) => {
    setSelectedRfpId(rfpId);
    setPanelMode('overview');
  }, []);

  // No project selected
  if (!currentProject) {
    return (
      <div className="p-6 text-center text-gray-500">
        <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>프로젝트를 먼저 선택해주세요.</p>
      </div>
    );
  }

  // Loading
  if (originLoading) {
    return (
      <div className="p-6 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
        <p className="text-gray-500 mt-2">로딩 중...</p>
      </div>
    );
  }

  // Empty state: no origin defined
  if (!origin) {
    return (
      <OriginSelectionScreen
        onOriginSelected={handleOriginSelected}
        isLoading={setOriginMutation.isPending}
      />
    );
  }

  const originPolicy = ORIGIN_POLICY_MAP[origin.originType] || ORIGIN_POLICY_MAP.EXTERNAL_RFP;

  // Preset visibility rules (Section 7.1)
  const showUploadButton = currentPreset === 'PM_WORK' && canUpload;
  const showKpiRow = currentPreset !== 'AUDIT_EVIDENCE';
  const showFilters = currentPreset !== 'EXEC_SUMMARY';
  const showCardActions = currentPreset !== 'EXEC_SUMMARY' && currentPreset !== 'AUDIT_EVIDENCE';

  return (
    <div className="p-6 flex gap-0">
      {/* Main content */}
      <div className={`space-y-4 ${selectedRfpId ? 'flex-1 min-w-0' : 'w-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">RFP 관리</h1>
            <p className="text-gray-500 mt-1 text-sm">
              프로젝트 제안 요청서(RFP)를 근거로 요구사항을 추출·관리합니다.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <PresetSwitcher
              currentPreset={currentPreset}
              availablePresets={getRfpPresets(userRole)}
              onSwitch={switchPreset}
              compact
            />
            {showUploadButton && (
              <Button onClick={() => setWizardOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                RFP 업로드/등록
              </Button>
            )}
          </div>
        </div>

        {/* Origin Summary Strip */}
        <OriginSummaryStrip
          summary={origin}
          onViewEvidence={() => setEvidenceRfpId(rfps[0]?.id || null)}
          onViewImpact={() => { if (selectedRfp) setPanelMode('impact'); }}
        />

        {/* KPI Row */}
        {showKpiRow && <RfpKpiRow rfps={rfps} origin={origin} preset={currentPreset} />}

        {/* Filters */}
        {showFilters && (
          <RfpFilters
            filters={filters}
            onFilterChange={setFilters}
            onRefresh={() => refetchRfps()}
            isLoading={rfpsLoading}
          />
        )}

        {/* Content */}
        {rfpsLoading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
            <p className="text-gray-500 mt-2">RFP 목록을 불러오는 중...</p>
          </div>
        ) : filteredRfps.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">
                {filters.search || filters.status !== 'ALL'
                  ? '검색 결과가 없습니다.'
                  : '등록된 RFP가 없습니다.'}
              </p>
              {canUpload && !filters.search && filters.status === 'ALL' && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setWizardOpen(true)}
                >
                  첫 번째 RFP 등록하기
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredRfps.map((rfp) => (
              <RfpCard
                key={rfp.id}
                rfp={rfp}
                preset={currentPreset}
                onView={handleViewRfp}
                onAnalyze={showCardActions ? handleAnalyze : undefined}
                onViewRequirements={showCardActions ? () => setReviewRfpId(rfp.id) : undefined}
                onViewDiff={showCardActions && rfp.versionCount > 1 ? () => setDiffRfpId(rfp.id) : undefined}
                onViewEvidence={() => setEvidenceRfpId(rfp.id)}
                onViewLineage={showCardActions ? () => {} : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* Right Panel */}
      {selectedRfpId && selectedRfp && (
        <RfpRightPanel
          rfp={selectedRfp}
          mode={panelMode}
          onModeChange={setPanelMode}
          onClose={() => setSelectedRfpId(null)}
          extractionRuns={extractionRuns || []}
          evidence={rfpEvidence || []}
          impact={rfpImpact as any}
        />
      )}

      {/* Upload Wizard Dialog */}
      <RfpUploadWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onComplete={handleWizardComplete}
        originPolicy={originPolicy}
        isSubmitting={createRfpMutation.isPending || uploadFileMutation.isPending}
      />

      {/* Extraction Review Dialog */}
      <ExtractionReviewTable
        open={!!reviewRfpId}
        onClose={() => setReviewRfpId(null)}
        extraction={latestExtraction || null}
        onConfirm={(ids) => {
          if (projectId && reviewRfpId) {
            confirmMutation.mutate({ projectId, rfpId: reviewRfpId, candidateIds: ids });
          }
        }}
        onReject={(ids) => {
          if (projectId && reviewRfpId) {
            rejectMutation.mutate({ projectId, rfpId: reviewRfpId, candidateIds: ids });
          }
        }}
        onUpdateCandidate={(id, updates) => {
          if (projectId && reviewRfpId) {
            updateCandidateMutation.mutate({ projectId, rfpId: reviewRfpId, candidateId: id, updates });
          }
        }}
        isConfirming={confirmMutation.isPending}
        isRejecting={rejectMutation.isPending}
      />

      {/* Diff Compare Dialog */}
      <RfpDiffCompare
        open={!!diffRfpId}
        onClose={() => setDiffRfpId(null)}
        diff={diffData || null}
        isLoading={diffLoading}
      />

      {/* Evidence View Dialog */}
      <RfpEvidenceView
        open={!!evidenceRfpId}
        onClose={() => setEvidenceRfpId(null)}
        evidence={evidenceData || []}
        isLoading={evidenceLoading}
      />
    </div>
  );
}
