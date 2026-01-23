import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { Rfp } from '../../types/project';

export const rfpKeys = {
  all: ['rfps'] as const,
  lists: () => [...rfpKeys.all, 'list'] as const,
  list: (projectId?: string) => [...rfpKeys.lists(), { projectId }] as const,
  details: () => [...rfpKeys.all, 'detail'] as const,
  detail: (id: string) => [...rfpKeys.details(), id] as const,
};

export function useRfps(projectId?: string) {
  return useQuery<Rfp[]>({
    queryKey: rfpKeys.list(projectId),
    queryFn: () => apiService.getRfps(projectId!),
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
        content: string;
        status: string;
        processingStatus: string;
      };
    }) => apiService.createRfp(projectId, data),
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

export function useExtractRequirements() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      rfpId,
      content,
    }: {
      projectId: string;
      rfpId: string;
      content?: string;
    }) => apiService.extractRequirements(projectId, rfpId, content),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: rfpKeys.list(projectId) });
    },
  });
}
