import { useState } from 'react';
import { FolderKanban } from 'lucide-react';
import type { SystemUser } from '../types';

interface Project {
  id: string;
  name: string;
  code?: string;
}

export interface AssignPMDialogProps {
  user: SystemUser;
  projects: Project[];
  existingProjectIds: string[];
  onClose: () => void;
  onAssign: (userId: string, projectIds: string[]) => void;
}

/**
 * Dialog for assigning PM role to a user for selected projects
 */
export function AssignPMDialog({
  user,
  projects,
  existingProjectIds,
  onClose,
  onAssign,
}: AssignPMDialogProps) {
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);

  const availableProjects = projects.filter((p) => !existingProjectIds.includes(p.id));

  const handleToggleProject = (projectId: string) => {
    setSelectedProjectIds((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">PM 역할 지정</h2>
          <p className="text-sm text-gray-500 mt-1">
            {user.name}님에게 PM 역할을 지정합니다
          </p>
        </div>
        <div className="p-6 space-y-4">
          {availableProjects.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FolderKanban className="mx-auto mb-2 text-gray-300" size={48} />
              <p>지정 가능한 프로젝트가 없습니다</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                PM으로 지정할 프로젝트를 선택하세요:
              </p>
              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                {availableProjects.map((project) => (
                  <div
                    key={project.id}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                      selectedProjectIds.includes(project.id)
                        ? 'bg-blue-50'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleToggleProject(project.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedProjectIds.includes(project.id)}
                      onChange={() => handleToggleProject(project.id)}
                      aria-label={`${project.name} 선택`}
                      className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {project.name}
                      </div>
                      <div className="text-xs text-gray-500">{project.code}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => onAssign(user.id, selectedProjectIds)}
              disabled={selectedProjectIds.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              PM 지정
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
