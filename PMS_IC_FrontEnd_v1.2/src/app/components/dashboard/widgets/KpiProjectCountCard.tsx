import { memo } from 'react';
import { FolderKanban, Clock } from 'lucide-react';
import { KpiCard } from './KpiCard';
import { useProjectsWithDetails } from '../../../../hooks/api/useProjects';
import type { WidgetProps } from './types';

function KpiProjectCountCardInner(_props: WidgetProps) {
  const { data: projects = [] } = useProjectsWithDetails();
  const totalProjects = projects.length;
  const inProgress = projects.filter((p) => p.status === 'IN_PROGRESS').length;

  return (
    <KpiCard
      title="전체 프로젝트"
      value={totalProjects}
      subtitle={
        <p className="text-xs text-blue-600 flex items-center gap-1">
          <Clock size={14} />
          <span>{inProgress} 진행 중</span>
        </p>
      }
      icon={FolderKanban}
      iconBgColor="bg-blue-100"
      iconColor="text-blue-600"
    />
  );
}

export const KpiProjectCountCard = memo(KpiProjectCountCardInner);
