import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import {
  TemplateSet,
  TemplateSetFormData,
  PhaseTemplate,
  PhaseTemplateFormData,
  TemplateCategory,
  ApplyTemplateOptions,
  ApplyTemplateResult,
  calculateTemplateStats,
  TemplatePreview,
} from '../../types/templates';

// Query keys
export const templateKeys = {
  all: ['templates'] as const,
  sets: () => [...templateKeys.all, 'sets'] as const,
  setsByCategory: (category: TemplateCategory) => [...templateKeys.sets(), { category }] as const,
  set: (id: string) => [...templateKeys.sets(), id] as const,
  preview: (id: string) => [...templateKeys.all, 'preview', id] as const,
};

// ============ Template Set Queries ============

export function useTemplateSets(category?: TemplateCategory) {
  return useQuery({
    queryKey: category ? templateKeys.setsByCategory(category) : templateKeys.sets(),
    queryFn: () => apiService.getTemplateSets(category),
  });
}

export function useTemplateSet(id: string) {
  return useQuery({
    queryKey: templateKeys.set(id),
    queryFn: () => apiService.getTemplateSet(id),
    enabled: !!id,
  });
}

export function useTemplatePreview(id: string) {
  return useQuery({
    queryKey: templateKeys.preview(id),
    queryFn: async (): Promise<TemplatePreview | null> => {
      const template = await apiService.getTemplateSet(id);
      if (!template) return null;
      return calculateTemplateStats(template);
    },
    enabled: !!id,
  });
}

// ============ Template Set Mutations ============

export function useCreateTemplateSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TemplateSetFormData) => {
      return apiService.createTemplateSet({
        name: data.name,
        description: data.description,
        category: data.category,
        tags: data.tags,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.sets() });
    },
  });
}

export function useUpdateTemplateSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TemplateSet> }) => {
      return apiService.updateTemplateSet(id, data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.set(data.id) });
      queryClient.invalidateQueries({ queryKey: templateKeys.sets() });
    },
  });
}

export function useDeleteTemplateSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiService.deleteTemplateSet(id);
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.sets() });
    },
  });
}

export function useDuplicateTemplateSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Get the source template
      const source = await apiService.getTemplateSet(id);
      if (!source) throw new Error('Template not found');

      // Create a new template with duplicated content
      return apiService.createTemplateSet({
        name: `${source.name} (복사본)`,
        description: source.description,
        category: source.category,
        tags: source.tags,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.sets() });
    },
  });
}

// ============ Phase Template Mutations ============
// Note: These may need backend endpoints to be added for full functionality

export function useAddPhaseTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateSetId,
      data,
    }: {
      templateSetId: string;
      data: PhaseTemplateFormData;
    }) => {
      // This would need a dedicated backend endpoint
      throw new Error('Phase template addition not yet implemented in backend');
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.set(variables.templateSetId) });
      queryClient.invalidateQueries({ queryKey: templateKeys.sets() });
    },
  });
}

export function useUpdatePhaseTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateSetId,
      phaseId,
      data,
    }: {
      templateSetId: string;
      phaseId: string;
      data: Partial<PhaseTemplate>;
    }) => {
      // This would need a dedicated backend endpoint
      throw new Error('Phase template update not yet implemented in backend');
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.set(variables.templateSetId) });
    },
  });
}

export function useDeletePhaseTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ templateSetId, phaseId }: { templateSetId: string; phaseId: string }) => {
      // This would need a dedicated backend endpoint
      throw new Error('Phase template deletion not yet implemented in backend');
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.set(variables.templateSetId) });
    },
  });
}

// ============ Apply Template ============

export function useApplyTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (options: ApplyTemplateOptions): Promise<ApplyTemplateResult> => {
      await apiService.applyTemplate(
        options.templateSetId,
        options.projectId,
        options.startDate
      );

      // Return a success result
      return {
        success: true,
        createdPhaseIds: [],
        createdWbsGroupIds: [],
        createdWbsItemIds: [],
        createdWbsTaskIds: [],
        createdDeliverableIds: [],
        createdKpiIds: [],
        errors: [],
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wbs'] });
      queryClient.invalidateQueries({ queryKey: ['phases'] });
    },
  });
}

// Apply template to a specific phase (creates WBS structure)
export function useApplyTemplateToPhase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateSetId,
      phaseId,
      projectId,
    }: {
      templateSetId: string;
      phaseId: string;
      projectId: string;
    }) => {
      return apiService.applyTemplateToPhase(templateSetId, phaseId, projectId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['wbs'] });
      queryClient.invalidateQueries({ queryKey: ['wbs', 'groups', { phaseId: variables.phaseId }] });
      queryClient.invalidateQueries({ queryKey: ['wbs', 'phase', variables.phaseId] });
    },
  });
}

// ============ Export Template ============

export function useExportTemplate() {
  return useMutation({
    mutationFn: async (templateId: string): Promise<string> => {
      const template = await apiService.getTemplateSet(templateId);
      if (!template) throw new Error('Template not found');
      return JSON.stringify(template, null, 2);
    },
  });
}

// ============ Import Template ============

export function useImportTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jsonString: string): Promise<TemplateSet> => {
      const imported = JSON.parse(jsonString) as TemplateSet;

      // Create a new template based on imported data
      return apiService.createTemplateSet({
        name: `${imported.name} (가져옴)`,
        description: imported.description,
        category: imported.category,
        tags: imported.tags,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.sets() });
    },
  });
}
