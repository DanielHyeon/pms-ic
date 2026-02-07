import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { unwrapOrThrow } from '../../utils/toViewState';
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
  MethodologyPhase,
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
    queryFn: async () => {
      const result = await apiService.getTemplateSetsResult(category);
      return unwrapOrThrow(result);
    },
  });
}

export function useTemplateSet(id: string) {
  return useQuery({
    queryKey: templateKeys.set(id),
    queryFn: async () => {
      const result = await apiService.getTemplateSetResult(id);
      return unwrapOrThrow(result);
    },
    enabled: !!id,
  });
}

export function useTemplatePreview(id: string) {
  return useQuery({
    queryKey: templateKeys.preview(id),
    queryFn: async (): Promise<TemplatePreview | null> => {
      const result = await apiService.getTemplateSetResult(id);
      const template = unwrapOrThrow(result);
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
      const createdPhaseIds: string[] = [];
      const createdWbsGroupIds: string[] = [];
      const createdWbsItemIds: string[] = [];
      const createdWbsTaskIds: string[] = [];
      const errors: string[] = [];

      // If template object is provided, create phases and WBS directly
      if (options.template) {
        const template = options.template;
        const selectedPhaseTemplates = options.selectedPhaseIds
          ? template.phases.filter(p => options.selectedPhaseIds!.includes(p.id))
          : template.phases;

        // If targetPhaseId is provided, add WBS to existing phase instead of creating new phases
        if (options.targetPhaseId) {
          console.log(`[Template Apply] Adding WBS to existing phase: ${options.targetPhaseId}`);

          // If replaceExisting is true, delete all existing WBS groups first
          if (options.replaceExisting) {
            console.log('[Template Apply] Deleting existing WBS groups...');
            let deletionFailed = false;
            try {
              const existingGroups = await apiService.getWbsGroups(options.targetPhaseId);
              const groupsArray = Array.isArray(existingGroups) ? existingGroups : [];
              console.log(`[Template Apply] Found ${groupsArray.length} existing WBS groups to delete`);

              if (groupsArray.length > 0) {
                for (const group of groupsArray) {
                  if (group?.id) {
                    try {
                      await apiService.deleteWbsGroup(group.id);
                      console.log(`[Template Apply] Deleted WBS Group: ${group.name || group.id}`);
                    } catch (deleteGroupError) {
                      console.error(`[Template Apply] Failed to delete WBS Group ${group.id}:`, deleteGroupError);
                      deletionFailed = true;
                    }
                  }
                }

                // Verify deletion
                const remainingGroups = await apiService.getWbsGroups(options.targetPhaseId);
                const remainingArray = Array.isArray(remainingGroups) ? remainingGroups : [];
                if (remainingArray.length > 0) {
                  console.error(`[Template Apply] Deletion verification failed: ${remainingArray.length} groups still exist`);
                  deletionFailed = true;
                }
              }
              console.log(`[Template Apply] Deleted ${groupsArray.length} existing WBS groups`);
            } catch (deleteError) {
              console.error('[Template Apply] Failed to delete existing WBS:', deleteError);
              deletionFailed = true;
            }

            if (deletionFailed) {
              errors.push('Failed to delete existing WBS. Cannot proceed with replacement.');
              return {
                success: false,
                createdPhaseIds: [],
                createdWbsGroupIds,
                createdWbsItemIds,
                createdWbsTaskIds,
                createdDeliverableIds: [],
                createdKpiIds: [],
                errors,
              };
            }
          }

          // CORRECT MAPPING:
          // PhaseTemplate -> WBS Group
          // WbsGroupTemplate -> WBS Item
          // WbsItemTemplate -> WBS Task

          let groupOrder = 1;
          for (const phaseTemplate of selectedPhaseTemplates) {
            try {
              console.log(`[Template Apply] Creating WBS Group "${phaseTemplate.name}" (Phase Template) under phase ${options.targetPhaseId}`);

              // PhaseTemplate -> WBS Group
              const group = await apiService.createWbsGroup(options.targetPhaseId, {
                code: `${groupOrder}`,
                name: phaseTemplate.name,
                description: phaseTemplate.description,
                weight: phaseTemplate.defaultWeight || 100,
                status: 'NOT_STARTED',
                progress: 0,
              });

              if (group?.id) {
                createdWbsGroupIds.push(group.id);

                // WbsGroupTemplate -> WBS Item
                let itemOrder = 1;
                for (const wbsGroupTemplate of phaseTemplate.wbsGroups || []) {
                  try {
                    const item = await apiService.createWbsItem(group.id, {
                      code: `${group.code}.${itemOrder}`,
                      name: wbsGroupTemplate.name,
                      description: wbsGroupTemplate.description,
                      weight: wbsGroupTemplate.defaultWeight || 100,
                      estimatedHours: wbsGroupTemplate.estimatedHours,
                      phaseId: options.targetPhaseId,
                      status: 'NOT_STARTED',
                      progress: 0,
                    });

                    if (item?.id) {
                      createdWbsItemIds.push(item.id);

                      // WbsItemTemplate -> WBS Task
                      let taskOrder = 1;
                      for (const wbsItemTemplate of wbsGroupTemplate.items || []) {
                        try {
                          const taskDescription = wbsItemTemplate.description || '';
                          const task = await apiService.createWbsTask(item.id, {
                            code: `${item.code}.${taskOrder}`,
                            name: wbsItemTemplate.name,
                            description: taskDescription,
                            weight: wbsItemTemplate.defaultWeight || 100,
                            estimatedHours: wbsItemTemplate.estimatedHours,
                            groupId: group.id,
                            phaseId: options.targetPhaseId,
                            status: 'NOT_STARTED',
                            progress: 0,
                          });

                          if (task?.id) {
                            createdWbsTaskIds.push(task.id);
                          }
                          taskOrder++;
                        } catch (taskError) {
                          errors.push(`Task creation failed: ${wbsItemTemplate.name}`);
                        }
                      }
                    }
                    itemOrder++;
                  } catch (itemError) {
                    errors.push(`Item creation failed: ${wbsGroupTemplate.name}`);
                  }
                }
              }
              groupOrder++;
            } catch (groupError) {
              errors.push(`Group creation failed: ${phaseTemplate.name}`);
            }
          }

          console.log('[Template Apply] Summary (to existing phase):', {
            targetPhaseId: options.targetPhaseId,
            groups: createdWbsGroupIds.length,
            items: createdWbsItemIds.length,
            tasks: createdWbsTaskIds.length,
            errors: errors.length,
          });

          return {
            success: errors.length === 0,
            createdPhaseIds: [],
            createdWbsGroupIds,
            createdWbsItemIds,
            createdWbsTaskIds,
            createdDeliverableIds: [],
            createdKpiIds: [],
            errors,
          };
        }

        // Apply to all methodology phases - match template phases to methodology phases by order
        if (options.applyToAllMethodologyPhases && options.methodologyPhases && options.methodologyPhases.length > 0) {
          console.log('[Template Apply] Applying to all methodology phases');

          const methodologyPhases = options.methodologyPhases;

          // Match each template phase to corresponding methodology phase by order
          for (let phaseIndex = 0; phaseIndex < selectedPhaseTemplates.length; phaseIndex++) {
            const phaseTemplate = selectedPhaseTemplates[phaseIndex];
            const methodologyPhase = methodologyPhases[phaseIndex];

            if (!methodologyPhase) {
              console.warn(`[Template Apply] No methodology phase found for template phase ${phaseIndex + 1}`);
              continue;
            }

            console.log(`[Template Apply] Applying phase "${phaseTemplate.name}" -> "${methodologyPhase.name}" (${methodologyPhase.id})`);

            // If replaceExisting is true, delete existing WBS for this phase
            if (options.replaceExisting) {
              console.log(`[Template Apply] Deleting existing WBS for phase ${methodologyPhase.id}...`);
              let deletionFailed = false;
              try {
                const existingGroups = await apiService.getWbsGroups(methodologyPhase.id);
                const groupsArray = Array.isArray(existingGroups) ? existingGroups : [];
                console.log(`[Template Apply] Found ${groupsArray.length} existing WBS groups to delete for phase ${methodologyPhase.id}`);

                if (groupsArray.length > 0) {
                  // Delete all groups sequentially
                  for (const group of groupsArray) {
                    if (group?.id) {
                      try {
                        await apiService.deleteWbsGroup(group.id);
                        console.log(`[Template Apply] Deleted WBS Group: ${group.name || group.id}`);
                      } catch (deleteGroupError) {
                        console.error(`[Template Apply] Failed to delete WBS Group ${group.id}:`, deleteGroupError);
                        deletionFailed = true;
                      }
                    }
                  }

                  // Verify deletion by checking if groups still exist
                  const remainingGroups = await apiService.getWbsGroups(methodologyPhase.id);
                  const remainingArray = Array.isArray(remainingGroups) ? remainingGroups : [];
                  if (remainingArray.length > 0) {
                    console.error(`[Template Apply] Deletion verification failed: ${remainingArray.length} groups still exist for phase ${methodologyPhase.id}`);
                    deletionFailed = true;
                  }
                }
              } catch (deleteError) {
                console.error(`[Template Apply] Failed to delete existing WBS for phase ${methodologyPhase.id}:`, deleteError);
                deletionFailed = true;
              }

              if (deletionFailed) {
                errors.push(`Failed to delete existing WBS for ${methodologyPhase.name}. Skipping WBS creation for this phase.`);
                console.error(`[Template Apply] Skipping WBS creation for phase ${methodologyPhase.id} due to deletion failure`);
                continue; // Skip to next phase
              }
            }

            // CORRECT MAPPING (for methodology phases):
            // PhaseTemplate -> WBS Group
            // WbsGroupTemplate -> WBS Item
            // WbsItemTemplate -> WBS Task

            // Create a single WBS Group from the PhaseTemplate
            try {
              console.log(`[Template Apply] Creating WBS Group "${phaseTemplate.name}" (Phase Template) under phase ${methodologyPhase.id}`);

              // PhaseTemplate -> WBS Group
              const group = await apiService.createWbsGroup(methodologyPhase.id, {
                code: `1`,
                name: phaseTemplate.name,
                description: phaseTemplate.description,
                weight: phaseTemplate.defaultWeight || 100,
                status: 'NOT_STARTED',
                progress: 0,
              });

              if (group?.id) {
                createdWbsGroupIds.push(group.id);

                // WbsGroupTemplate -> WBS Item
                let itemOrder = 1;
                for (const wbsGroupTemplate of phaseTemplate.wbsGroups || []) {
                  try {
                    const item = await apiService.createWbsItem(group.id, {
                      code: `${group.code}.${itemOrder}`,
                      name: wbsGroupTemplate.name,
                      description: wbsGroupTemplate.description,
                      weight: wbsGroupTemplate.defaultWeight || 100,
                      estimatedHours: wbsGroupTemplate.estimatedHours,
                      phaseId: methodologyPhase.id,
                      status: 'NOT_STARTED',
                      progress: 0,
                    });

                    if (item?.id) {
                      createdWbsItemIds.push(item.id);

                      // WbsItemTemplate -> WBS Task
                      let taskOrder = 1;
                      for (const wbsItemTemplate of wbsGroupTemplate.items || []) {
                        try {
                          const taskDescription = wbsItemTemplate.description || '';
                          const task = await apiService.createWbsTask(item.id, {
                            code: `${item.code}.${taskOrder}`,
                            name: wbsItemTemplate.name,
                            description: taskDescription,
                            weight: wbsItemTemplate.defaultWeight || 100,
                            estimatedHours: wbsItemTemplate.estimatedHours,
                            groupId: group.id,
                            phaseId: methodologyPhase.id,
                            status: 'NOT_STARTED',
                            progress: 0,
                          });

                          if (task?.id) {
                            createdWbsTaskIds.push(task.id);
                          }
                          taskOrder++;
                        } catch (taskError) {
                          errors.push(`Task creation failed: ${wbsItemTemplate.name}`);
                        }
                      }
                    }
                    itemOrder++;
                  } catch (itemError) {
                    errors.push(`Item creation failed: ${wbsGroupTemplate.name}`);
                  }
                }
              }
            } catch (groupError) {
              errors.push(`Group creation failed: ${phaseTemplate.name}`);
            }
          }

          console.log('[Template Apply] Summary (to all methodology phases):', {
            phasesProcessed: Math.min(selectedPhaseTemplates.length, methodologyPhases.length),
            groups: createdWbsGroupIds.length,
            items: createdWbsItemIds.length,
            tasks: createdWbsTaskIds.length,
            errors: errors.length,
          });

          return {
            success: errors.length === 0,
            createdPhaseIds: methodologyPhases.map(p => p.id),
            createdWbsGroupIds,
            createdWbsItemIds,
            createdWbsTaskIds,
            createdDeliverableIds: [],
            createdKpiIds: [],
            errors,
          };
        }

        // Create new phases and WBS (original behavior)
        let currentStartDate = new Date(options.startDate);

        for (const phaseTemplate of selectedPhaseTemplates) {
          try {
            // Calculate phase dates
            const durationDays = phaseTemplate.defaultDurationDays || 30;
            const phaseEndDate = new Date(currentStartDate);
            phaseEndDate.setDate(phaseEndDate.getDate() + durationDays);

            // Create phase
            const phase = await apiService.createPhase(options.projectId, {
              name: phaseTemplate.name,
              description: phaseTemplate.description || '',
              orderNum: phaseTemplate.relativeOrder,
              startDate: currentStartDate.toISOString().split('T')[0],
              endDate: phaseEndDate.toISOString().split('T')[0],
              status: 'NOT_STARTED',
            });

            console.log(`[Template Apply] Created phase "${phaseTemplate.name}" with ID:`, phase?.id);

            if (phase?.id) {
              createdPhaseIds.push(phase.id);

              // Create WBS if enabled
              if (options.includeWbs !== false) {
                const phaseCode = phaseTemplate.relativeOrder.toString();

                for (const groupTemplate of phaseTemplate.wbsGroups || []) {
                  try {
                    console.log(`[Template Apply] Creating WBS Group "${groupTemplate.name}" under phase ${phase.id}`);
                    // Create WBS Group
                    const group = await apiService.createWbsGroup(phase.id, {
                      code: `${phaseCode}.${groupTemplate.relativeOrder}`,
                      name: groupTemplate.name,
                      description: groupTemplate.description,
                      weight: groupTemplate.defaultWeight || 100,
                      status: 'NOT_STARTED',
                      progress: 0,
                    });

                    if (group?.id) {
                      createdWbsGroupIds.push(group.id);

                      // Create WBS Items
                      for (const itemTemplate of groupTemplate.items || []) {
                        try {
                          const item = await apiService.createWbsItem(group.id, {
                            code: `${group.code}.${itemTemplate.relativeOrder}`,
                            name: itemTemplate.name,
                            description: itemTemplate.description,
                            weight: itemTemplate.defaultWeight || 100,
                            estimatedHours: itemTemplate.estimatedHours,
                            phaseId: phase.id,
                            status: 'NOT_STARTED',
                            progress: 0,
                          });

                          if (item?.id) {
                            createdWbsItemIds.push(item.id);

                            // Create WBS Tasks
                            for (const taskTemplate of itemTemplate.tasks || []) {
                              try {
                                const task = await apiService.createWbsTask(item.id, {
                                  code: `${item.code}.${taskTemplate.relativeOrder}`,
                                  name: taskTemplate.name,
                                  description: taskTemplate.description || '',
                                  weight: taskTemplate.defaultWeight || 100,
                                  estimatedHours: taskTemplate.estimatedHours,
                                  groupId: group.id,
                                  phaseId: phase.id,
                                  status: 'NOT_STARTED',
                                  progress: 0,
                                });

                                if (task?.id) {
                                  createdWbsTaskIds.push(task.id);
                                }
                              } catch (taskError) {
                                errors.push(`Task creation failed: ${taskTemplate.name}`);
                              }
                            }
                          }
                        } catch (itemError) {
                          errors.push(`Item creation failed: ${itemTemplate.name}`);
                        }
                      }
                    }
                  } catch (groupError) {
                    errors.push(`Group creation failed: ${groupTemplate.name}`);
                  }
                }
              }
            }

            // Move to next phase start date
            if (options.adjustDates !== false) {
              currentStartDate = new Date(phaseEndDate);
              currentStartDate.setDate(currentStartDate.getDate() + 1);
            }
          } catch (phaseError) {
            errors.push(`Phase creation failed: ${phaseTemplate.name}`);
          }
        }

        console.log('[Template Apply] Summary:', {
          phases: createdPhaseIds.length,
          groups: createdWbsGroupIds.length,
          items: createdWbsItemIds.length,
          tasks: createdWbsTaskIds.length,
          errors: errors.length,
          phaseIds: createdPhaseIds,
        });

        return {
          success: errors.length === 0,
          createdPhaseIds,
          createdWbsGroupIds,
          createdWbsItemIds,
          createdWbsTaskIds,
          createdDeliverableIds: [],
          createdKpiIds: [],
          errors,
        };
      }

      // Fallback to backend API if no template object provided
      try {
        await apiService.applyTemplate(
          options.templateSetId,
          options.projectId,
          options.startDate
        );
      } catch (error) {
        console.error('Backend template apply failed:', error);
      }

      return {
        success: true,
        createdPhaseIds,
        createdWbsGroupIds,
        createdWbsItemIds,
        createdWbsTaskIds,
        createdDeliverableIds: [],
        createdKpiIds: [],
        errors,
      };
    },
    onSuccess: async () => {
      // Reset and refetch WBS queries to ensure fresh data is loaded
      await queryClient.resetQueries({ queryKey: ['wbs'] });
      await queryClient.resetQueries({ queryKey: ['phases'] });
      // Force immediate refetch for any active queries
      await queryClient.refetchQueries({ queryKey: ['wbs'], type: 'active' });
      await queryClient.refetchQueries({ queryKey: ['phases'], type: 'active' });
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
    onSuccess: async (result, variables) => {
      // Reset and refetch WBS queries to ensure fresh data is loaded
      await queryClient.resetQueries({ queryKey: ['wbs'] });
      await queryClient.resetQueries({ queryKey: ['phases'] });
      // Force immediate refetch for any active queries
      await queryClient.refetchQueries({ queryKey: ['wbs'], type: 'active' });
      await queryClient.refetchQueries({ queryKey: ['phases'], type: 'active' });
      console.log('Template applied successfully:', result);
    },
    onError: (error) => {
      console.error('Template application failed:', error);
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
