import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { unwrapOrThrow } from '../../utils/toViewState';
import {
  LineageGraphDto,
  PageResponse,
  LineageEventDto,
  ImpactAnalysisDto,
} from '../../types/lineage';

export const lineageKeys = {
  all: ['lineage'] as const,
  graphs: () => [...lineageKeys.all, 'graph'] as const,
  graph: (projectId: string) => [...lineageKeys.graphs(), { projectId }] as const,
  timelines: () => [...lineageKeys.all, 'timeline'] as const,
  timeline: (projectId: string, filters: object) =>
    [...lineageKeys.timelines(), { projectId, filters }] as const,
  impacts: () => [...lineageKeys.all, 'impact'] as const,
  impact: (type: string, id: string) => [...lineageKeys.impacts(), { type, id }] as const,
};

export function useLineageGraph(projectId?: string) {
  return useQuery<LineageGraphDto>({
    queryKey: lineageKeys.graph(projectId!),
    queryFn: async () => {
      const result = await apiService.getLineageGraphResult(projectId!);
      return unwrapOrThrow(result);
    },
    enabled: !!projectId,
  });
}

export function useLineageTimeline(
  projectId?: string,
  filters: { aggregateType?: string; page?: number; size?: number } = {}
) {
  return useQuery<PageResponse<LineageEventDto>>({
    queryKey: lineageKeys.timeline(projectId!, filters),
    queryFn: async () => {
      const result = await apiService.getLineageTimelineResult(projectId!, filters);
      return unwrapOrThrow(result);
    },
    enabled: !!projectId,
  });
}

export function useImpactAnalysis(type?: string, id?: string) {
  return useQuery<ImpactAnalysisDto>({
    queryKey: lineageKeys.impact(type!, id!),
    queryFn: async () => {
      const result = await apiService.getImpactAnalysisResult(type!, id!);
      return unwrapOrThrow(result);
    },
    enabled: !!type && !!id,
  });
}
