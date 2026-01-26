import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService, ImportResult } from '../../services/api';
import { requirementKeys } from './useRequirements';
import { wbsKeys } from './useWbs';

/**
 * Helper function to trigger file download from blob
 */
function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

// ========== Requirements Excel Hooks ==========

/**
 * Hook for downloading requirements Excel template
 */
export function useDownloadRequirementTemplate() {
  return useMutation({
    mutationFn: async (projectId: string) => {
      const blob = await apiService.downloadRequirementTemplate(projectId);
      if (blob) {
        downloadBlob(blob, 'requirements_template.xlsx');
      }
      return blob;
    },
  });
}

/**
 * Hook for exporting requirements to Excel
 */
export function useExportRequirements() {
  return useMutation({
    mutationFn: async ({ projectId, filename }: { projectId: string; filename?: string }) => {
      const blob = await apiService.exportRequirementsToExcel(projectId);
      if (blob) {
        downloadBlob(blob, filename || `requirements_export_${projectId}.xlsx`);
      }
      return blob;
    },
  });
}

/**
 * Hook for importing requirements from Excel
 */
export function useImportRequirements() {
  const queryClient = useQueryClient();

  return useMutation<ImportResult, Error, { projectId: string; file: File }>({
    mutationFn: ({ projectId, file }) => apiService.importRequirementsFromExcel(projectId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requirementKeys.lists() });
    },
  });
}

// ========== WBS Excel Hooks ==========

/**
 * Hook for downloading WBS Excel template
 */
export function useDownloadWbsTemplate() {
  return useMutation({
    mutationFn: async (projectId: string) => {
      const blob = await apiService.downloadWbsTemplate(projectId);
      if (blob) {
        downloadBlob(blob, 'wbs_template.xlsx');
      }
      return blob;
    },
  });
}

/**
 * Hook for exporting WBS to Excel
 */
export function useExportWbs() {
  return useMutation({
    mutationFn: async ({ projectId, filename }: { projectId: string; filename?: string }) => {
      const blob = await apiService.exportWbsToExcel(projectId);
      if (blob) {
        downloadBlob(blob, filename || `wbs_export_${projectId}.xlsx`);
      }
      return blob;
    },
  });
}

/**
 * Hook for exporting WBS by phase to Excel
 */
export function useExportWbsByPhase() {
  return useMutation({
    mutationFn: async ({ phaseId, filename }: { phaseId: string; filename?: string }) => {
      const blob = await apiService.exportWbsByPhaseToExcel(phaseId);
      if (blob) {
        downloadBlob(blob, filename || `wbs_phase_${phaseId}_export.xlsx`);
      }
      return blob;
    },
  });
}

/**
 * Hook for importing WBS from Excel
 */
export function useImportWbs() {
  const queryClient = useQueryClient();

  return useMutation<ImportResult, Error, { projectId: string; file: File }>({
    mutationFn: ({ projectId, file }) => apiService.importWbsFromExcel(projectId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wbsKeys.all });
    },
  });
}
