import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useEffect } from 'react';
import { apiService } from '../../services/api';
import { toastService } from '../../services/toast';
import type {
  RfpDetail,
  RfpStatus,
  OriginSummary,
  OriginType,
  ExtractionRun,
  ExtractionResult,
  Evidence,
  RfpDiff,
} from '../../types/rfp';

// ─── Query Keys ────────────────────────────────────────────────

export const rfpKeys = {
  all: ['rfps'] as const,
  lists: () => [...rfpKeys.all, 'list'] as const,
  list: (projectId?: string, filters?: Record<string, unknown>) =>
    [...rfpKeys.lists(), { projectId, ...filters }] as const,
  details: () => [...rfpKeys.all, 'detail'] as const,
  detail: (id: string) => [...rfpKeys.details(), id] as const,
  origin: (projectId?: string) => ['origin', { projectId }] as const,
  originSummary: (projectId?: string) => ['origin', 'summary', { projectId }] as const,
  extractions: (projectId?: string, rfpId?: string) =>
    [...rfpKeys.all, 'extractions', { projectId, rfpId }] as const,
  latestExtraction: (projectId?: string, rfpId?: string) =>
    [...rfpKeys.all, 'extraction', 'latest', { projectId, rfpId }] as const,
  impact: (projectId?: string, rfpId?: string) =>
    [...rfpKeys.all, 'impact', { projectId, rfpId }] as const,
  evidence: (projectId?: string, rfpId?: string) =>
    [...rfpKeys.all, 'evidence', { projectId, rfpId }] as const,
  diff: (projectId?: string, rfpId?: string, from?: string, to?: string) =>
    [...rfpKeys.all, 'diff', { projectId, rfpId, from, to }] as const,
};

// ─── 상태 판별 헬퍼 ─────────────────────────────────────────────

/** 아직 처리 중인 상태 (폴링이 필요한 상태) */
const PROCESSING_STATUSES: Set<string> = new Set([
  'UPLOADED', 'PARSING', 'PARSED', 'EXTRACTING',
]);

export function isProcessingStatus(status: RfpStatus): boolean {
  return PROCESSING_STATUSES.has(status);
}

// ─── Origin Hooks ──────────────────────────────────────────────

export function useProjectOrigin(projectId?: string) {
  return useQuery<OriginSummary | null>({
    queryKey: rfpKeys.origin(projectId),
    queryFn: () => apiService.getProjectOrigin(projectId!),
    enabled: !!projectId,
  });
}

export function useOriginSummary(projectId?: string) {
  return useQuery<OriginSummary>({
    queryKey: rfpKeys.originSummary(projectId),
    queryFn: () => apiService.getOriginSummary(projectId!),
    enabled: !!projectId,
  });
}

export function useSetProjectOrigin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, originType }: { projectId: string; originType: OriginType }) =>
      apiService.setProjectOrigin(projectId, originType),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: rfpKeys.origin(projectId) });
      queryClient.invalidateQueries({ queryKey: rfpKeys.originSummary(projectId) });
    },
  });
}

// ─── RFP List Hook (스마트 폴링 내장) ──────────────────────────

export function useRfps(
  projectId?: string,
  filters?: { search?: string; status?: string; sort?: string; page?: number; size?: number }
) {
  return useQuery<RfpDetail[]>({
    queryKey: rfpKeys.list(projectId, filters),
    queryFn: () => apiService.getRfpsV2(projectId!, filters),
    enabled: !!projectId,
    // [폴링 최적화] processing 상태 카드가 있을 때만 5초 폴링, 종결 상태만이면 중단
    refetchInterval: (query) => {
      const list = query.state.data ?? [];
      const hasProcessing = list.some(r => isProcessingStatus(r.status));
      return hasProcessing ? 5000 : false;
    },
  });
}

// ─── 상태 전이 감지 → 토스트 1회만 발생 ────────────────────────

/**
 * RFP 목록의 상태 변화를 감지하여 토스트 알림을 1회만 띄운다.
 * - processing → EXTRACTED: "분석 완료!" 토스트
 * - processing → FAILED: "분석 실패" 토스트 (사유 포함)
 * - 이미 띄운 전이는 다시 띄우지 않음
 */
export function useRfpStatusTransitionToasts(rfps: RfpDetail[] | undefined) {
  // { rfpId → lastKnownStatus } 캐시
  const lastStatusMap = useRef<Record<string, string>>({});

  useEffect(() => {
    if (!rfps) return;

    for (const rfp of rfps) {
      const prev = lastStatusMap.current[rfp.id];
      const curr = rfp.status;

      // 첫 로드 시에는 토스트 없이 상태만 기록
      if (prev === undefined) {
        lastStatusMap.current[rfp.id] = curr;
        continue;
      }

      // 상태가 바뀐 경우에만 처리
      if (prev !== curr) {
        // processing → EXTRACTED/CONFIRMED: 분석 완료
        if (PROCESSING_STATUSES.has(prev) && (curr === 'EXTRACTED' || curr === 'CONFIRMED')) {
          const reqCount = rfp.kpi?.derivedRequirements ?? 0;
          toastService.success(
            reqCount > 0
              ? `요구사항 ${reqCount}건이 추출되었습니다.`
              : '문서 분석이 완료되었습니다.',
            `${rfp.title} 분석 완료`
          );
        }

        // processing → FAILED: 분석 실패
        if (PROCESSING_STATUSES.has(prev) && curr === 'FAILED') {
          const reason = rfp.failureReason ?? '알 수 없는 오류';
          toastService.error(reason, `${rfp.title} 분석 실패`);
          if (rfp.failureReasonDev) {
            console.error(`[RFP 분석 실패 상세] rfp=${rfp.id}:`, rfp.failureReasonDev);
          }
        }

        // 상태 업데이트 기록
        lastStatusMap.current[rfp.id] = curr;
      }
    }
  }, [rfps]);
}

// ─── Create / Upload Mutations (토스트 포함) ──────────────────

export function useCreateRfp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      data,
    }: {
      projectId: string;
      data: {
        title: string;
        content?: string;
        status?: string;
        processingStatus?: string;
      };
    }) => apiService.createRfp(projectId, { title: data.title, content: data.content || '', status: data.status || 'UPLOADED', processingStatus: data.processingStatus || 'PENDING' }),
    onSuccess: (_, { projectId, data }) => {
      queryClient.invalidateQueries({ queryKey: rfpKeys.list(projectId) });
      // [토스트 A] 등록 성공 + 분석 진행 알림
      toastService.success(
        '문서 분석이 백그라운드에서 진행됩니다.',
        `${data.title} 등록 완료`
      );
    },
    onError: (err) => {
      toastService.error(
        err instanceof Error ? err.message : 'RFP 등록에 실패했습니다.',
        'RFP 등록 실패'
      );
    },
  });
}

export function useUploadRfpFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      file,
      title,
    }: {
      projectId: string;
      file: File;
      title: string;
    }) => apiService.uploadRfpFile(projectId, file, title),
    onSuccess: (_, { projectId, title }) => {
      queryClient.invalidateQueries({ queryKey: rfpKeys.list(projectId) });
      // [토스트 A] 업로드 성공 + 분석 진행 알림
      toastService.success(
        '파일이 업로드되었으며 분석이 백그라운드에서 진행됩니다.',
        `${title} 업로드 완료`
      );
    },
    onError: (err) => {
      toastService.error(
        err instanceof Error ? err.message : '파일 업로드에 실패했습니다.',
        '업로드 실패'
      );
    },
  });
}

// ─── Retry Hook ───────────────────────────────────────────────

export function useRetryRfpParse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, rfpId }: { projectId: string; rfpId: string }) =>
      apiService.retryRfpParse(projectId, rfpId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: rfpKeys.list(projectId) });
      toastService.info('분석을 다시 시도합니다.', '재시도 시작');
    },
    onError: (err) => {
      toastService.error(
        err instanceof Error ? err.message : '재시도에 실패했습니다.',
        '재시도 실패'
      );
    },
  });
}

// ─── Analysis Hooks ────────────────────────────────────────────

export function useTriggerAnalysis() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, rfpId }: { projectId: string; rfpId: string }) =>
      apiService.triggerRfpAnalysis(projectId, rfpId),
    onSuccess: (_, { projectId, rfpId }) => {
      queryClient.invalidateQueries({ queryKey: rfpKeys.list(projectId) });
      queryClient.invalidateQueries({ queryKey: rfpKeys.extractions(projectId, rfpId) });
    },
  });
}

export function useExtractionRuns(projectId?: string, rfpId?: string) {
  return useQuery<ExtractionRun[]>({
    queryKey: rfpKeys.extractions(projectId, rfpId),
    queryFn: () => apiService.getExtractionRuns(projectId!, rfpId!),
    enabled: !!projectId && !!rfpId,
  });
}

export function useLatestExtraction(projectId?: string, rfpId?: string) {
  return useQuery<ExtractionResult>({
    queryKey: rfpKeys.latestExtraction(projectId, rfpId),
    queryFn: () => apiService.getLatestExtraction(projectId!, rfpId!),
    enabled: !!projectId && !!rfpId,
  });
}

// ─── Candidate Review Hooks ────────────────────────────────────

export function useConfirmCandidates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, rfpId, candidateIds }: { projectId: string; rfpId: string; candidateIds: string[] }) =>
      apiService.confirmCandidates(projectId, rfpId, candidateIds),
    onSuccess: (_, { projectId, rfpId }) => {
      queryClient.invalidateQueries({ queryKey: rfpKeys.latestExtraction(projectId, rfpId) });
      queryClient.invalidateQueries({ queryKey: rfpKeys.list(projectId) });
    },
  });
}

export function useRejectCandidates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, rfpId, candidateIds }: { projectId: string; rfpId: string; candidateIds: string[] }) =>
      apiService.rejectCandidates(projectId, rfpId, candidateIds),
    onSuccess: (_, { projectId, rfpId }) => {
      queryClient.invalidateQueries({ queryKey: rfpKeys.latestExtraction(projectId, rfpId) });
    },
  });
}

export function useUpdateCandidate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, rfpId, candidateId, updates }: { projectId: string; rfpId: string; candidateId: string; updates: Record<string, unknown> }) =>
      apiService.updateCandidate(projectId, rfpId, candidateId, updates),
    onSuccess: (_, { projectId, rfpId }) => {
      queryClient.invalidateQueries({ queryKey: rfpKeys.latestExtraction(projectId, rfpId) });
    },
  });
}

// ─── Impact & Evidence Hooks ───────────────────────────────────

export function useRfpImpact(projectId?: string, rfpId?: string) {
  return useQuery({
    queryKey: rfpKeys.impact(projectId, rfpId),
    queryFn: () => apiService.getRfpImpact(projectId!, rfpId!),
    enabled: !!projectId && !!rfpId,
  });
}

export function useRfpEvidence(projectId?: string, rfpId?: string) {
  return useQuery<Evidence[]>({
    queryKey: rfpKeys.evidence(projectId, rfpId),
    queryFn: () => apiService.getRfpEvidence(projectId!, rfpId!),
    enabled: !!projectId && !!rfpId,
  });
}

export function useRfpDiff(projectId?: string, rfpId?: string, fromVersion?: string, toVersion?: string) {
  return useQuery<RfpDiff>({
    queryKey: rfpKeys.diff(projectId, rfpId, fromVersion, toVersion),
    queryFn: () => apiService.getRfpDiff(projectId!, rfpId!, fromVersion!, toVersion!),
    enabled: !!projectId && !!rfpId && !!fromVersion && !!toVersion,
  });
}

// ─── Legacy re-export (backward compat) ────────────────────────

export function useExtractRequirements() {
  return useTriggerAnalysis();
}
