import { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Filter,
  Search,
  Upload,
  Download,
  CheckCircle,
  Clock,
  AlertCircle,
  FolderOpen,
  Eye,
} from 'lucide-react';
import DeliverableManagement from './common/DeliverableManagement';
import { useAllPhases, usePhaseDeliverables } from '../../hooks/api/usePhases';
import { getRolePermissions } from '../../utils/rolePermissions';
import { UserRole } from '../App';

interface DeliverablesPageProps {
  userRole: UserRole;
  projectId?: string;
}

interface AggregatedDeliverable {
  id: string;
  name: string;
  description?: string;
  type?: string;
  status: 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';
  version?: string;
  uploadedAt?: string;
  approvedBy?: string;
  phaseId: string;
  phaseName: string;
}

export default function DeliverablesPage({ userRole, projectId = 'proj-001' }: DeliverablesPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterPhase, setFilterPhase] = useState<string>('');

  // API hooks
  const { data: phases = [], isLoading: isPhasesLoading } = useAllPhases();

  // Role permissions
  const permissions = getRolePermissions(userRole);
  const canEdit = permissions.canEdit;

  // Aggregate deliverables from all phases
  const aggregatedDeliverables = useMemo(() => {
    const deliverables: AggregatedDeliverable[] = [];

    phases.forEach((phase) => {
      if (phase.deliverables && Array.isArray(phase.deliverables)) {
        phase.deliverables.forEach((d: { id: string; name: string; description?: string; type?: string; status?: string; version?: string; uploadedAt?: string; approvedBy?: string }) => {
          deliverables.push({
            id: d.id,
            name: d.name,
            description: d.description,
            type: d.type,
            status: (d.status as AggregatedDeliverable['status']) || 'PENDING',
            version: d.version,
            uploadedAt: d.uploadedAt,
            approvedBy: d.approvedBy,
            phaseId: phase.id,
            phaseName: phase.name,
          });
        });
      }
    });

    return deliverables;
  }, [phases]);

  // Filter deliverables
  const filteredDeliverables = useMemo(() => {
    let filtered = aggregatedDeliverables;

    if (filterStatus) {
      filtered = filtered.filter((d) => d.status === filterStatus);
    }

    if (filterPhase) {
      filtered = filtered.filter((d) => d.phaseId === filterPhase);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.name.toLowerCase().includes(query) ||
          d.phaseName.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [aggregatedDeliverables, filterStatus, filterPhase, searchQuery]);

  // Calculate statistics
  const stats = {
    total: aggregatedDeliverables.length,
    pending: aggregatedDeliverables.filter((d) => d.status === 'PENDING').length,
    inReview: aggregatedDeliverables.filter((d) => d.status === 'IN_REVIEW').length,
    approved: aggregatedDeliverables.filter((d) => d.status === 'APPROVED').length,
    rejected: aggregatedDeliverables.filter((d) => d.status === 'REJECTED').length,
  };

  // Map to DeliverableManagement format
  const deliverableForList = filteredDeliverables.map((d) => ({
    id: d.id,
    name: d.name,
    description: d.description,
    type: d.type,
    status: d.status,
    version: d.version,
    uploadedAt: d.uploadedAt,
    approvedBy: d.approvedBy,
    phaseName: d.phaseName,
  }));

  if (isPhasesLoading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          <span className="text-sm text-gray-500">산출물 로딩 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">산출물 관리</h1>
          <p className="text-gray-500 mt-1">프로젝트 산출물 현황 및 승인 관리</p>
        </div>
        {canEdit && (
          <button
            type="button"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Upload size={18} />
            산출물 업로드
          </button>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={20} className="text-gray-600" />
              <span className="text-sm text-gray-500">전체</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">{stats.total}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={20} className="text-gray-500" />
              <span className="text-sm text-gray-500">대기</span>
            </div>
            <span className="text-2xl font-bold text-gray-600">{stats.pending}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye size={20} className="text-blue-600" />
              <span className="text-sm text-gray-500">검토중</span>
            </div>
            <span className="text-2xl font-bold text-blue-600">{stats.inReview}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle size={20} className="text-green-600" />
              <span className="text-sm text-gray-500">승인</span>
            </div>
            <span className="text-2xl font-bold text-green-600">{stats.approved}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={20} className="text-red-600" />
              <span className="text-sm text-gray-500">반려</span>
            </div>
            <span className="text-2xl font-bold text-red-600">{stats.rejected}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="산출물 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Phase Filter */}
          <div className="flex items-center gap-2">
            <FolderOpen size={16} className="text-gray-400" />
            <select
              value={filterPhase}
              onChange={(e) => setFilterPhase(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">전체 단계</option>
              {phases.map((phase) => (
                <option key={phase.id} value={phase.id}>
                  {phase.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">전체 상태</option>
              <option value="PENDING">대기</option>
              <option value="IN_REVIEW">검토중</option>
              <option value="APPROVED">승인</option>
              <option value="REJECTED">반려</option>
            </select>
          </div>
        </div>
      </div>

      {/* Deliverable List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <DeliverableManagement
          deliverables={deliverableForList}
          isLoading={false}
          canEdit={canEdit}
        />
      </div>
    </div>
  );
}
