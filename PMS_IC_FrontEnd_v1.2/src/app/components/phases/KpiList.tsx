import { AlertCircle, Plus, Pencil, Trash2 } from 'lucide-react';
import type { KPI } from './types';
import { getPhaseStatusColor, getPhaseStatusLabel } from '../../../utils/phaseMappers';

interface KpiListProps {
  kpis: KPI[];
  canManageKpi: boolean;
  onAdd: () => void;
  onEdit: (kpi: KPI) => void;
  onDelete: (kpiId: string) => void;
}

export function KpiList({
  kpis,
  canManageKpi,
  onAdd,
  onEdit,
  onDelete,
}: KpiListProps) {
  const getStatusColor = getPhaseStatusColor;
  const getStatusLabel = getPhaseStatusLabel;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-900 flex items-center gap-2">
          <AlertCircle size={18} />
          핵심 성과 지표 (KPI)
        </h4>
        {canManageKpi && (
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-blue-200 text-blue-600 rounded hover:bg-blue-50"
          >
            <Plus size={14} />
            KPI 추가
          </button>
        )}
      </div>
      <div className="space-y-2">
        {kpis.map((kpi) => (
          <KpiRow
            key={kpi.id}
            kpi={kpi}
            canManageKpi={canManageKpi}
            getStatusColor={getStatusColor}
            getStatusLabel={getStatusLabel}
            onEdit={() => onEdit(kpi)}
            onDelete={() => onDelete(kpi.id)}
          />
        ))}
      </div>
    </div>
  );
}

// Sub-component

interface KpiRowProps {
  kpi: KPI;
  canManageKpi: boolean;
  getStatusColor: (status: string) => string;
  getStatusLabel: (status: string) => string;
  onEdit: () => void;
  onDelete: () => void;
}

function KpiRow({
  kpi,
  canManageKpi,
  getStatusColor,
  getStatusLabel,
  onEdit,
  onDelete,
}: KpiRowProps) {
  const handleDelete = () => {
    if (confirm('해당 KPI를 삭제하시겠습니까?')) {
      onDelete();
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{kpi.name}</p>
        <p className="text-xs text-gray-500 mt-1">
          목표: {kpi.target} | 현재: {kpi.current}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(kpi.status)}`}
        >
          {getStatusLabel(kpi.status)}
        </span>
        {canManageKpi && (
          <>
            <button
              onClick={onEdit}
              className="p-2 text-gray-600 hover:bg-gray-200 rounded transition-colors"
              title="수정"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={handleDelete}
              className="p-2 text-red-600 hover:bg-red-100 rounded transition-colors"
              title="삭제"
            >
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
