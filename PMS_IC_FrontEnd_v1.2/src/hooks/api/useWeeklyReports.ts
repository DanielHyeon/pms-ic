import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { unwrapOrThrow } from '../../utils/toViewState';
import { WeeklyReport } from '../../types/project';

export const weeklyReportKeys = {
  all: ['weeklyReports'] as const,
  lists: () => [...weeklyReportKeys.all, 'list'] as const,
  list: (projectId?: string) => [...weeklyReportKeys.lists(), { projectId }] as const,
  details: () => [...weeklyReportKeys.all, 'detail'] as const,
  detail: (id: string) => [...weeklyReportKeys.details(), id] as const,
};

export function useWeeklyReports(projectId?: string) {
  return useQuery<WeeklyReport[]>({
    queryKey: weeklyReportKeys.list(projectId),
    queryFn: async () => {
      const result = await apiService.getWeeklyReportsResult(projectId!);
      return unwrapOrThrow(result);
    },
    enabled: !!projectId,
  });
}

export function useCreateWeeklyReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      data,
    }: {
      projectId: string;
      data: { periodStart: string; periodEnd: string; content: string; status: string };
    }) => apiService.createWeeklyReport(projectId, data),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: weeklyReportKeys.list(projectId) });
    },
  });
}

export function useGenerateAiReport() {
  return useMutation({
    mutationFn: ({
      projectId,
      startDate,
      endDate,
      context,
    }: {
      projectId: string;
      startDate: string;
      endDate: string;
      context?: string;
    }) => apiService.generateAiReport(projectId, startDate, endDate, context),
  });
}
