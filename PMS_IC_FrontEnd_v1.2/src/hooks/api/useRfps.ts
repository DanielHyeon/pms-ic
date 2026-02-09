import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import type {
  RfpDetail,
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

// ─── RFP List Hooks ────────────────────────────────────────────

export function useRfps(
  projectId?: string,
  filters?: { search?: string; status?: string; sort?: string; page?: number; size?: number }
) {
  return useQuery<RfpDetail[]>({
    queryKey: rfpKeys.list(projectId, filters),
    queryFn: () => apiService.getRfpsV2(projectId!, filters),
    enabled: !!projectId,
  });
}

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
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: rfpKeys.list(projectId) });
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
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: rfpKeys.list(projectId) });
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
