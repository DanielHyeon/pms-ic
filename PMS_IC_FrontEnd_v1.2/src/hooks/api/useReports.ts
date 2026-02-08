import { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService, ReportApiDto } from '../../services/api';
import type { ReportStreamEvent } from '../../services/api';
import { unwrapOrThrow } from '../../utils/toViewState';

export const reportKeys = {
  all: ['reports'] as const,
  lists: () => [...reportKeys.all, 'list'] as const,
  list: (projectId?: string) => [...reportKeys.lists(), { projectId }] as const,
  details: () => [...reportKeys.all, 'detail'] as const,
  detail: (projectId: string, reportId: string) => [...reportKeys.details(), projectId, reportId] as const,
};

export function useReports(projectId?: string) {
  return useQuery<ReportApiDto[]>({
    queryKey: reportKeys.list(projectId),
    queryFn: async () => {
      const result = await apiService.getProjectReportsResult(projectId!);
      return unwrapOrThrow(result);
    },
    enabled: !!projectId,
  });
}

export function useCreateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: {
      projectId: string;
      data: {
        reportType: string;
        reportScope: string;
        title: string;
        periodStart: string;
        periodEnd: string;
        generationMode?: string;
      };
    }) => apiService.createProjectReport(projectId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: reportKeys.list(projectId) });
    },
  });
}

export function usePublishReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, reportId }: { projectId: string; reportId: string }) =>
      apiService.publishProjectReport(projectId, reportId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: reportKeys.list(projectId) });
    },
  });
}

export function useDeleteReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, reportId }: { projectId: string; reportId: string }) =>
      apiService.deleteProjectReport(projectId, reportId),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: reportKeys.list(projectId) });
    },
  });
}

// SSE streaming hook for real-time report generation progress

export interface ReportGenerationState {
  isGenerating: boolean;
  reportId?: string;
  phase: string;
  percentage: number;
  message: string;
  error?: string;
}

export function useReportGeneration(projectId?: string) {
  const [state, setState] = useState<ReportGenerationState>({
    isGenerating: false,
    phase: '',
    percentage: 0,
    message: '',
  });
  const controllerRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();

  const generate = useCallback(
    (request: {
      reportType: string;
      periodStart: string;
      periodEnd: string;
      scope?: string;
      useAiSummary?: boolean;
      customTitle?: string;
      sections?: string[];
    }) => {
      if (!projectId) return;

      // Cancel any existing stream
      controllerRef.current?.abort();

      setState({
        isGenerating: true,
        phase: 'INITIALIZING',
        percentage: 0,
        message: 'Starting report generation...',
      });

      const controller = apiService.streamReportGeneration(
        projectId,
        request,
        (event: ReportStreamEvent) => {
          if (event.type === 'progress') {
            setState((prev) => ({
              ...prev,
              reportId: event.reportId,
              phase: event.phase,
              percentage: event.percentage,
              message: event.message,
            }));
          }
        },
        (reportId?: string) => {
          setState((prev) => ({
            ...prev,
            isGenerating: false,
            reportId,
            phase: 'COMPLETED',
            percentage: 100,
            message: 'Report generation complete',
          }));
          // Invalidate reports list to show the new report
          queryClient.invalidateQueries({ queryKey: reportKeys.list(projectId) });
        },
        (error: string) => {
          setState((prev) => ({
            ...prev,
            isGenerating: false,
            phase: 'FAILED',
            error,
            message: error,
          }));
        },
      );
      controllerRef.current = controller;
    },
    [projectId, queryClient],
  );

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setState({
      isGenerating: false,
      phase: '',
      percentage: 0,
      message: 'Generation cancelled',
    });
  }, []);

  const reset = useCallback(() => {
    setState({
      isGenerating: false,
      phase: '',
      percentage: 0,
      message: '',
    });
  }, []);

  return { ...state, generate, cancel, reset };
}
