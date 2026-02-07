import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { useProjectAuth, CAPABILITIES } from './useProjectAuth';
import { unwrapOrThrow } from '../../utils/toViewState';

export interface DataQualityMetric {
  id: string;
  name: string;
  value: number;
  target: number;
  unit: string;
  status: 'OK' | 'WARNING' | 'DANGER';
  numerator: number;
  denominator: number;
}

export interface CategoryScore {
  score: number;
  weight: number;
  metrics: DataQualityMetric[];
}

export interface DataIssue {
  severity: string;
  category: string;
  metric: string;
  description: string;
  affectedEntities: string[];
  suggestedAction: string;
}

export interface HistoryEntry {
  date: string;
  score: number;
  integrity: number;
  readiness: number;
  traceability: number;
}

export interface DataQualityResponse {
  projectId: string;
  timestamp: string;
  overallScore: number;
  grade: string;
  categories: {
    integrity: CategoryScore;
    readiness: CategoryScore;
    traceability: CategoryScore;
  };
  issues: DataIssue[];
  history: HistoryEntry[];
}

export const dataQualityKeys = {
  all: ['data-quality'] as const,
  project: (projectId: string) => [...dataQualityKeys.all, projectId] as const,
};

export function useDataQuality(projectId?: string) {
  const { hasCapability } = useProjectAuth();
  return useQuery<DataQualityResponse>({
    queryKey: dataQualityKeys.project(projectId || ''),
    queryFn: async () => {
      const result = await apiService.getDataQualityResult(projectId!);
      return unwrapOrThrow(result);
    },
    enabled: !!projectId && hasCapability(CAPABILITIES.VIEW_DATA_QUALITY),
  });
}
