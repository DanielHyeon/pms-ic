import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Project, ProjectSummary } from '../types/project';
import {
  useProjects as useProjectsQuery,
  useProject as useProjectQuery,
  useCreateProject as useCreateProjectMutation,
  useUpdateProject as useUpdateProjectMutation,
  projectKeys,
} from '../hooks/api';

interface ProjectContextType {
  // Current selected project
  currentProject: Project | null;

  // Project list (summary for selector)
  projects: ProjectSummary[];

  // Loading state
  isLoading: boolean;

  // Select project
  selectProject: (projectId: string) => Promise<void>;

  // Refresh project list
  refreshProjects: () => Promise<void>;

  // Create project
  createProject: (data: Partial<Project>) => Promise<Project>;

  // Update project
  updateProject: (projectId: string, data: Partial<Project>) => Promise<Project>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

interface ProjectProviderProps {
  children: ReactNode;
}

export function ProjectProvider({ children }: ProjectProviderProps) {
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(() => {
    return localStorage.getItem('currentProjectId');
  });

  // TanStack Query hooks
  const { data: projectList = [], isLoading: projectsLoading, refetch: refetchProjects } = useProjectsQuery();
  const { data: currentProjectData, isLoading: projectLoading } = useProjectQuery(selectedProjectId || '');
  const createProjectMutation = useCreateProjectMutation();
  const updateProjectMutation = useUpdateProjectMutation();

  const isLoading = projectsLoading || projectLoading || createProjectMutation.isPending || updateProjectMutation.isPending;
  const currentProject = currentProjectData || null;
  const projects = projectList as ProjectSummary[];

  // Auto-select project when list loads and no project is selected
  useEffect(() => {
    if (projectList.length > 0 && !selectedProjectId) {
      const savedProjectId = localStorage.getItem('currentProjectId');
      if (savedProjectId) {
        const savedProject = projectList.find((p: ProjectSummary) => p.id === savedProjectId);
        if (savedProject) {
          setSelectedProjectId(savedProjectId);
        } else {
          // Saved project not found, select first
          setSelectedProjectId(projectList[0].id);
          localStorage.setItem('currentProjectId', projectList[0].id);
        }
      } else {
        // No saved project, select first
        setSelectedProjectId(projectList[0].id);
        localStorage.setItem('currentProjectId', projectList[0].id);
      }
    }
  }, [projectList, selectedProjectId]);

  // Select project
  const selectProject = useCallback(async (projectId: string) => {
    setSelectedProjectId(projectId);
    localStorage.setItem('currentProjectId', projectId);
    // Invalidate to refetch the project data
    await queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
  }, [queryClient]);

  // Refresh project list
  const refreshProjects = useCallback(async () => {
    await refetchProjects();
  }, [refetchProjects]);

  // Create project
  const createProject = useCallback(async (data: Partial<Project>): Promise<Project> => {
    return createProjectMutation.mutateAsync(data);
  }, [createProjectMutation]);

  // Update project
  const updateProject = useCallback(async (projectId: string, data: Partial<Project>): Promise<Project> => {
    return updateProjectMutation.mutateAsync({ id: projectId, data });
  }, [updateProjectMutation]);

  const value: ProjectContextType = {
    currentProject,
    projects,
    isLoading,
    selectProject,
    refreshProjects,
    createProject,
    updateProject,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
