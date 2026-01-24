import { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  Upload,
  Download,
  AlertCircle,
  Lock,
  Check,
  X,
  Plus,
  Pencil,
  Trash2,
  Settings,
} from 'lucide-react';
import { UserRole } from '../App';
import { apiService } from '../../services/api';
import {
  useAllPhases,
  usePhaseDeliverables,
  usePhaseKpis,
  useCreatePhase,
  useUpdatePhase,
  useDeletePhase,
  useUploadDeliverable,
  useApproveDeliverable,
  useCreatePhaseKpi,
  useUpdatePhaseKpi,
  useDeletePhaseKpi,
} from '../../hooks/api/usePhases';

interface Phase {
  id: string;
  name: string;
  description: string;
  status: 'completed' | 'inProgress' | 'pending';
  progress: number;
  startDate: string;
  endDate: string;
  deliverables: Deliverable[];
  kpis: KPI[];
}

interface Deliverable {
  id: string;
  name: string;
  status: 'approved' | 'review' | 'draft' | 'pending' | 'rejected';
  uploadDate?: string;
  approver?: string;
  fileName?: string;
  fileSize?: number;
}

interface KPI {
  id: string;
  name: string;
  target: string;
  current: string;
  status: 'achieved' | 'onTrack' | 'atRisk';
}

const initialPhases: Phase[] = [
  {
    id: '1',
    name: '1단계: 업무 진단 및 목표 설정',
    description: '업무 분석 및 목표 설정',
    status: 'completed',
    progress: 100,
    startDate: '2025-01-02',
    endDate: '2025-02-15',
    deliverables: [
      { id: '1', name: 'AS-IS 프로세스 분석 보고서', status: 'approved', uploadDate: '2025-02-10', approver: 'PMO 총괄' },
      { id: '2', name: 'KPI 정의서', status: 'approved', uploadDate: '2025-02-14', approver: 'PMO 총괄' },
      { id: '3', name: '프로젝트 헌장', status: 'approved', uploadDate: '2025-02-15', approver: '프로젝트 스폰서' },
    ],
    kpis: [
      { id: '1', name: '자동 심사 지급률', target: '70%', current: '-', status: 'onTrack' },
      { id: '2', name: '심사 처리 시간 단축', target: '50%', current: '-', status: 'onTrack' },
    ],
  },
  {
    id: '2',
    name: '2단계: 데이터 수집 및 준비',
    description: '데이터 수집 및 준비',
    status: 'completed',
    progress: 100,
    startDate: '2025-02-16',
    endDate: '2025-04-30',
    deliverables: [
      { id: '4', name: '데이터셋 인벤토리', status: 'approved', uploadDate: '2025-03-15', approver: 'PM' },
      { id: '5', name: '개인정보 비식별화 결과 보고서', status: 'approved', uploadDate: '2025-04-20', approver: '정보보호팀장' },
      { id: '6', name: '학습 데이터 품질 검증 보고서', status: 'approved', uploadDate: '2025-04-28', approver: 'PM' },
    ],
    kpis: [
      { id: '3', name: '학습 데이터 확보량', target: '100,000건', current: '105,000건', status: 'achieved' },
      { id: '4', name: '데이터 품질 점수', target: '95점', current: '97점', status: 'achieved' },
    ],
  },
  {
    id: '3',
    name: '3단계: AI 모델링 및 학습',
    description: 'AI 모델링 및 학습',
    status: 'inProgress',
    progress: 85,
    startDate: '2025-05-01',
    endDate: '2025-08-31',
    deliverables: [
      { id: '7', name: 'OCR 모델 v2.0 개발 보고서', status: 'review', uploadDate: '2025-07-15' },
      { id: '8', name: '분류 모델 성능 평가서', status: 'review', uploadDate: '2025-08-10' },
      { id: '9', name: '모델 학습 파이프라인 문서', status: 'draft' },
      { id: '10', name: '하이퍼파라미터 최적화 보고서', status: 'pending' },
    ],
    kpis: [
      { id: '5', name: 'OCR 인식률', target: '95%', current: '93.5%', status: 'atRisk' },
      { id: '6', name: '분류 모델 정확도', target: '98%', current: '97.8%', status: 'onTrack' },
      { id: '7', name: '모델 학습 시간', target: '<12시간', current: '10.5시간', status: 'achieved' },
    ],
  },
  {
    id: '4',
    name: '4단계: 시스템 통합 및 연동',
    description: '시스템 통합 및 연동',
    status: 'pending',
    progress: 0,
    startDate: '2025-09-01',
    endDate: '2025-10-31',
    deliverables: [
      { id: '11', name: 'API 명세서', status: 'pending' },
      { id: '12', name: '통합 테스트 시나리오', status: 'pending' },
      { id: '13', name: '레거시 시스템 연동 보고서', status: 'pending' },
    ],
    kpis: [],
  },
  {
    id: '5',
    name: '5단계: 성능 검증 및 PoC',
    description: '성능 검증 및 PoC',
    status: 'pending',
    progress: 0,
    startDate: '2025-11-01',
    endDate: '2025-11-30',
    deliverables: [
      { id: '14', name: 'PoC 결과 보고서', status: 'pending' },
      { id: '15', name: 'AS-IS vs TO-BE 비교 분석', status: 'pending' },
      { id: '16', name: '현업 검증 피드백 종합', status: 'pending' },
    ],
    kpis: [],
  },
  {
    id: '6',
    name: '6단계: 변화 관리 및 확산',
    description: '변화 관리 및 확산',
    status: 'pending',
    progress: 0,
    startDate: '2025-12-01',
    endDate: '2025-12-31',
    deliverables: [
      { id: '17', name: '사용자 매뉴얼', status: 'pending' },
      { id: '18', name: '교육 일정 및 이수 현황', status: 'pending' },
      { id: '19', name: '운영 가이드', status: 'pending' },
    ],
    kpis: [],
  },
];

export default function PhaseManagement({ userRole }: { userRole: UserRole }) {
  const [phases, setPhases] = useState<Phase[]>(initialPhases);
  const [selectedPhase, setSelectedPhase] = useState<Phase>(initialPhases[2]); // 현재 진행 중인 3단계
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedDeliverable, setSelectedDeliverable] = useState<Deliverable | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isNewDeliverable, setIsNewDeliverable] = useState(false);
  const [newDeliverableName, setNewDeliverableName] = useState('');
  const [newDeliverableDescription, setNewDeliverableDescription] = useState('');
  const [newDeliverableType, setNewDeliverableType] = useState('DOCUMENT');
  const [showKpiModal, setShowKpiModal] = useState(false);
  const [editingKpi, setEditingKpi] = useState<KPI | null>(null);
  const [kpiForm, setKpiForm] = useState({ name: '', target: '', current: '', status: 'onTrack' as KPI['status'] });
  const [showPhaseModal, setShowPhaseModal] = useState(false);
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null);
  const [phaseForm, setPhaseForm] = useState({
    name: '',
    description: '',
    status: 'pending' as Phase['status'],
    startDate: '',
    endDate: '',
    progress: 0,
  });

  // TanStack Query hooks
  const { data: phasesData } = useAllPhases();

  // Check if selectedPhase has a valid API ID (not hardcoded '1', '2', '3', etc.)
  const isValidApiPhaseId = selectedPhase.id && !/^[1-6]$/.test(selectedPhase.id);

  const { data: deliverables } = usePhaseDeliverables(isValidApiPhaseId ? selectedPhase.id : '');
  const { data: kpis } = usePhaseKpis(isValidApiPhaseId ? selectedPhase.id : '');

  const createPhaseMutation = useCreatePhase();
  const updatePhaseMutation = useUpdatePhase();
  const deletePhaseMutation = useDeletePhase();
  const uploadDeliverableMutation = useUploadDeliverable();
  const approveDeliverableMutation = useApproveDeliverable();
  const createKpiMutation = useCreatePhaseKpi();
  const updateKpiMutation = useUpdatePhaseKpi();
  const deleteKpiMutation = useDeletePhaseKpi();

  const canEdit = !['auditor', 'business_analyst'].includes(userRole);
  const canApprove = ['sponsor', 'pmo_head', 'pm'].includes(userRole);
  const canUpload = ['pm', 'developer', 'qa', 'pmo_head'].includes(userRole);
  const canManageKpi = ['pm', 'pmo_head'].includes(userRole);
  const canManagePhases = ['sponsor', 'pmo_head', 'pm'].includes(userRole);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'approved':
      case 'achieved':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'inProgress':
      case 'review':
      case 'onTrack':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'draft':
      case 'atRisk':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'rejected':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      completed: '완료',
      inProgress: '진행중',
      pending: '대기',
      approved: '승인',
      review: '검토중',
      draft: '작성중',
      rejected: '반려',
      achieved: '달성',
      onTrack: '정상',
      atRisk: '위험',
    };
    return labels[status] || status;
  };

  const normalizeResponse = <T,>(response: any, fallback: T): T => {
    const data = response?.data ?? response;
    if (data === undefined || data === null) {
      return fallback;
    }
    return data;
  };

  const formatDate = (value?: string) => {
    if (!value) return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;
    return date.toISOString().split('T')[0];
  };

  const mapPhaseStatus = (status?: string): Phase['status'] => {
    switch (status) {
      case 'COMPLETED':
        return 'completed';
      case 'IN_PROGRESS':
        return 'inProgress';
      default:
        return 'pending';
    }
  };

  const mapDeliverableStatus = (status?: string): Deliverable['status'] => {
    switch (status) {
      case 'APPROVED':
        return 'approved';
      case 'IN_REVIEW':
        return 'review';
      case 'REJECTED':
        return 'rejected';
      case 'PENDING':
        return 'pending';
      default:
        return 'draft';
    }
  };

  const mapKpiStatus = (status?: string): KPI['status'] => {
    switch (status) {
      case 'ACHIEVED':
        return 'achieved';
      case 'AT_RISK':
        return 'atRisk';
      default:
        return 'onTrack';
    }
  };

  const mapKpiStatusToApi = (status: KPI['status']) => {
    switch (status) {
      case 'achieved':
        return 'ACHIEVED';
      case 'atRisk':
        return 'AT_RISK';
      default:
        return 'ON_TRACK';
    }
  };

  const mapDeliverableFromApi = (deliverable: any): Deliverable => ({
    id: String(deliverable.id),
    name: deliverable.name,
    status: mapDeliverableStatus(deliverable.status),
    uploadDate: formatDate(deliverable.uploadedAt),
    approver: deliverable.approver,
    fileName: deliverable.fileName,
    fileSize: deliverable.fileSize,
  });

  const mapKpiFromApi = (kpi: any): KPI => ({
    id: String(kpi.id),
    name: kpi.name,
    target: kpi.target,
    current: kpi.current ?? '-',
    status: mapKpiStatus(kpi.status),
  });

  const mapPhaseFromApi = (phase: any): Phase => ({
    id: String(phase.id),
    name: phase.name,
    description: phase.description || '',
    status: mapPhaseStatus(phase.status),
    progress: phase.progress ?? 0,
    startDate: phase.startDate || '',
    endDate: phase.endDate || '',
    deliverables: [],
    kpis: [],
  });

  // Update selectedPhase when API data loads to use actual phase IDs
  useEffect(() => {
    if (phasesData) {
      const phaseData = normalizeResponse(phasesData, []);
      const phasesArray = Array.isArray(phaseData) ? phaseData : [];
      if (phasesArray.length > 0) {
        // Find the phase that corresponds to the selected phase (by orderNum or index)
        const currentIndex = phases.findIndex((p) => p.id === selectedPhase.id);
        const apiPhase = phasesArray[currentIndex >= 0 ? currentIndex : 0];
        if (apiPhase && apiPhase.id !== selectedPhase.id) {
          const mappedPhase = ['completed', 'inProgress', 'pending'].includes(apiPhase.status)
            ? apiPhase
            : mapPhaseFromApi(apiPhase);
          setSelectedPhase(mappedPhase);
        }
      }
    }
  }, [phasesData]);

  // Sync phases from query data
  const syncedPhases = (() => {
    if (!phasesData) return phases;
    const phaseData = normalizeResponse(phasesData, initialPhases);
    const phasesArray = Array.isArray(phaseData) ? phaseData : [];

    if (!phasesArray.length) return phases;

    return phasesArray.map((phase: any) => {
      const isUiPhase = ['completed', 'inProgress', 'pending'].includes(phase.status);
      const basePhase = isUiPhase ? phase : mapPhaseFromApi(phase);
      const phaseDeliverables = isUiPhase
        ? phase.deliverables || []
        : Array.isArray(phase.deliverables)
        ? phase.deliverables.map(mapDeliverableFromApi)
        : [];
      const phaseKpis = isUiPhase
        ? phase.kpis || []
        : Array.isArray(phase.kpis)
        ? phase.kpis.map(mapKpiFromApi)
        : [];

      return {
        ...basePhase,
        deliverables: phaseDeliverables,
        kpis: phaseKpis,
      };
    });
  })();

  // Merge deliverables and KPIs from dedicated queries
  const currentPhaseWithDetails: Phase = {
    ...selectedPhase,
    deliverables: deliverables
      ? (Array.isArray(deliverables) ? deliverables.map(mapDeliverableFromApi) : selectedPhase.deliverables)
      : selectedPhase.deliverables,
    kpis: kpis
      ? (Array.isArray(kpis) ? kpis.map(mapKpiFromApi) : selectedPhase.kpis)
      : selectedPhase.kpis,
  };

  const handlePhaseSelect = (phase: Phase) => {
    setSelectedPhase(phase);
  };

  const handleUpload = (deliverableId: string) => {
    const deliverable = selectedPhase.deliverables.find((d) => d.id === deliverableId);
    if (deliverable) {
      setSelectedDeliverable(deliverable);
      setShowUploadModal(true);
      setUploadFile(null);
      setIsNewDeliverable(false);
    }
  };

  const handleConfirmUpload = async () => {
    if (!uploadFile) return;
    if (isNewDeliverable && !newDeliverableName.trim()) return;
    if (!isNewDeliverable && !selectedDeliverable) return;

    const formData = new FormData();
    formData.append('file', uploadFile);
    if (isNewDeliverable) {
      formData.append('name', newDeliverableName.trim());
      if (newDeliverableDescription.trim()) {
        formData.append('description', newDeliverableDescription.trim());
      }
      formData.append('type', newDeliverableType);
    } else if (selectedDeliverable) {
      formData.append('deliverableId', selectedDeliverable.id);
      formData.append('name', selectedDeliverable.name);
    }

    try {
      await uploadDeliverableMutation.mutateAsync({
        phaseId: selectedPhase.id,
        formData,
      });
    } catch (error) {
      console.warn('Deliverable upload failed', error);
    }

    setShowUploadModal(false);
    setSelectedDeliverable(null);
    setUploadFile(null);
    setIsNewDeliverable(false);
    setNewDeliverableName('');
    setNewDeliverableDescription('');
    setNewDeliverableType('DOCUMENT');
  };

  const handleApprove = async (deliverableId: string, approved: boolean) => {
    try {
      await approveDeliverableMutation.mutateAsync({
        deliverableId,
        approved,
        phaseId: selectedPhase.id,
      });
    } catch (error) {
      console.warn('Deliverable approval failed', error);
    }
  };

  const handleDownload = async (deliverable: Deliverable) => {
    try {
      const blob = await apiService.downloadDeliverable(deliverable.id);
      if (!blob) {
        alert(`"${deliverable.name}" 다운로드를 시작합니다. (실제 환경에서는 파일이 다운로드됩니다)`);
        return;
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = deliverable.fileName || deliverable.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.warn('Deliverable download failed', error);
    }
  };

  const handleSaveKpi = async () => {
    if (!kpiForm.name.trim()) return;

    const payload = {
      name: kpiForm.name.trim(),
      target: kpiForm.target.trim(),
      current: kpiForm.current.trim(),
      status: mapKpiStatusToApi(kpiForm.status),
    };

    try {
      if (editingKpi) {
        await updateKpiMutation.mutateAsync({
          phaseId: selectedPhase.id,
          kpiId: editingKpi.id,
          data: payload,
        });
      } else {
        await createKpiMutation.mutateAsync({
          phaseId: selectedPhase.id,
          data: payload,
        });
      }
    } catch (error) {
      console.warn('KPI save failed', error);
    }

    setShowKpiModal(false);
    setEditingKpi(null);
  };

  const mapPhaseStatusToApi = (status: Phase['status']): string => {
    switch (status) {
      case 'completed':
        return 'COMPLETED';
      case 'inProgress':
        return 'IN_PROGRESS';
      default:
        return 'NOT_STARTED';
    }
  };

  const handleSavePhase = async () => {
    if (!phaseForm.name.trim()) return;

    const payload = {
      name: phaseForm.name.trim(),
      description: phaseForm.description.trim(),
      status: mapPhaseStatusToApi(phaseForm.status),
      startDate: phaseForm.startDate || undefined,
      endDate: phaseForm.endDate || undefined,
      progress: phaseForm.progress,
      orderNum: editingPhase ? undefined : syncedPhases.length + 1,
    };

    try {
      if (editingPhase) {
        await updatePhaseMutation.mutateAsync({
          id: editingPhase.id,
          data: payload,
        });
      } else {
        const projectId = 'proj-001';
        await createPhaseMutation.mutateAsync({
          projectId,
          ...payload,
        });
      }
    } catch (error) {
      console.warn('Phase save failed', error);
    }

    setShowPhaseModal(false);
    setEditingPhase(null);
    setPhaseForm({
      name: '',
      description: '',
      status: 'pending',
      startDate: '',
      endDate: '',
      progress: 0,
    });
  };

  const handleDeletePhase = async (phaseId: string) => {
    if (!confirm('이 단계를 삭제하시겠습니까?')) return;

    try {
      await deletePhaseMutation.mutateAsync(phaseId);
      if (selectedPhase.id === phaseId && syncedPhases.length > 1) {
        const remaining = syncedPhases.filter((p) => p.id !== phaseId);
        setSelectedPhase(remaining[0]);
      }
    } catch (error) {
      console.warn('Phase delete failed', error);
    }
  };

  const openPhaseModal = (phase?: Phase) => {
    if (phase) {
      setEditingPhase(phase);
      setPhaseForm({
        name: phase.name,
        description: phase.description,
        status: phase.status,
        startDate: phase.startDate,
        endDate: phase.endDate,
        progress: phase.progress,
      });
    } else {
      setEditingPhase(null);
      setPhaseForm({
        name: '',
        description: '',
        status: 'pending',
        startDate: '',
        endDate: '',
        progress: 0,
      });
    }
    setShowPhaseModal(true);
  };

  return (
    <div className="p-6">
      {!canEdit && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
          <Lock className="text-amber-600" size={20} />
          <div>
            <p className="text-sm font-medium text-amber-900">읽기 전용 모드</p>
            <p className="text-xs text-amber-700">현재 역할은 조회 권한만 가지고 있습니다.</p>
          </div>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">단계별 프로젝트 관리</h2>
          <p className="text-sm text-gray-500 mt-1">Waterfall 기반 거시적 프로세스 관리</p>
        </div>
        {canManagePhases && (
          <button
            onClick={() => openPhaseModal()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={18} />
            단계 추가
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Phase List */}
        <div className="space-y-3">
          {syncedPhases.map((phase) => (
            <div
              key={phase.id}
              className={`relative w-full text-left p-4 rounded-xl border-2 transition-all ${
                selectedPhase.id === phase.id
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              {canManagePhases && (
                <button
                  type="button"
                  onClick={() => openPhaseModal(phase)}
                  className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors z-10"
                  title="단계 설정"
                >
                  <Settings size={16} />
                </button>
              )}
              <button
                type="button"
                onClick={() => handlePhaseSelect(phase)}
                className="w-full text-left"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {phase.status === 'completed' && <CheckCircle2 className="text-green-600" size={24} />}
                    {phase.status === 'inProgress' && <Clock className="text-blue-600" size={24} />}
                    {phase.status === 'pending' && <Circle className="text-gray-400" size={24} />}
                  </div>
                  <div className="flex-1 min-w-0 pr-8">
                    <h3 className="font-medium text-gray-900 text-sm">{phase.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">{phase.description}</p>
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>진행률</span>
                        <span className="font-medium">{phase.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            phase.status === 'completed'
                              ? 'bg-green-500'
                              : phase.status === 'inProgress'
                              ? 'bg-blue-500'
                              : 'bg-gray-400'
                          }`}
                          style={{ width: `${phase.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            </div>
          ))}
        </div>

        {/* Phase Detail */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{currentPhaseWithDetails.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{currentPhaseWithDetails.description}</p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                  currentPhaseWithDetails.status
                )}`}
              >
                {getStatusLabel(currentPhaseWithDetails.status)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">시작일</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{currentPhaseWithDetails.startDate}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">종료일</p>
                <p className="text-sm font-medium text-gray-900 mt-1">{currentPhaseWithDetails.endDate}</p>
              </div>
            </div>

            {/* Deliverables */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900 flex items-center gap-2">
                  <FileText size={18} />
                  산출물 관리
                </h4>
                {canUpload && (
                  <button
                    onClick={() => {
                      setSelectedDeliverable(null);
                      setIsNewDeliverable(true);
                      setNewDeliverableName('');
                      setNewDeliverableDescription('');
                      setNewDeliverableType('DOCUMENT');
                      setUploadFile(null);
                      setShowUploadModal(true);
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-blue-200 text-blue-600 rounded hover:bg-blue-50"
                  >
                    <Plus size={14} />
                    새 산출물 업로드
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {currentPhaseWithDetails.deliverables.map((deliverable) => (
                  <div
                    key={deliverable.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{deliverable.name}</p>
                      {deliverable.uploadDate && (
                        <p className="text-xs text-gray-500 mt-1">
                          업로드: {deliverable.uploadDate}
                          {deliverable.approver && ` | 승인자: ${deliverable.approver}`}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(
                          deliverable.status
                        )}`}
                      >
                        {getStatusLabel(deliverable.status)}
                      </span>

                      {deliverable.status === 'review' && canApprove && (
                        <>
                          <button
                            onClick={() => handleApprove(deliverable.id, true)}
                            className="p-2 text-green-600 hover:bg-green-100 rounded transition-colors"
                            title="승인"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => handleApprove(deliverable.id, false)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded transition-colors"
                            title="반려"
                          >
                            <X size={16} />
                          </button>
                        </>
                      )}

                      {(deliverable.status === 'pending' ||
                        deliverable.status === 'draft' ||
                        deliverable.status === 'rejected') &&
                      canUpload ? (
                        <button
                          onClick={() => handleUpload(deliverable.id)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                          title="업로드"
                        >
                          <Upload size={16} />
                        </button>
                      ) : (
                        deliverable.uploadDate && (
                          <button
                            onClick={() => handleDownload(deliverable)}
                            className="p-2 text-gray-600 hover:bg-gray-200 rounded transition-colors"
                            title="다운로드"
                          >
                            <Download size={16} />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* KPIs */}
            {(currentPhaseWithDetails.kpis.length > 0 || canManageKpi) && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900 flex items-center gap-2">
                    <AlertCircle size={18} />
                    핵심 성과 지표 (KPI)
                  </h4>
                  {canManageKpi && (
                    <button
                      onClick={() => {
                        setEditingKpi(null);
                        setKpiForm({ name: '', target: '', current: '', status: 'onTrack' });
                        setShowKpiModal(true);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-blue-200 text-blue-600 rounded hover:bg-blue-50"
                    >
                      <Plus size={14} />
                      KPI 추가
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {currentPhaseWithDetails.kpis.map((kpi) => (
                    <div
                      key={kpi.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
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
                              onClick={() => {
                                setEditingKpi(kpi);
                                setKpiForm({
                                  name: kpi.name,
                                  target: kpi.target,
                                  current: kpi.current,
                                  status: kpi.status,
                                });
                                setShowKpiModal(true);
                              }}
                              className="p-2 text-gray-600 hover:bg-gray-200 rounded transition-colors"
                              title="수정"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={async () => {
                                if (!confirm('해당 KPI를 삭제하시겠습니까?')) return;
                                try {
                                  await deleteKpiMutation.mutateAsync({
                                    phaseId: selectedPhase.id,
                                    kpiId: kpi.id,
                                  });
                                } catch (error) {
                                  console.warn('KPI delete failed', error);
                                }
                              }}
                              className="p-2 text-red-600 hover:bg-red-100 rounded transition-colors"
                              title="삭제"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {currentPhaseWithDetails.status === 'inProgress' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-amber-600 mt-0.5" size={20} />
                <div>
                  <p className="font-medium text-amber-900">주의 필요</p>
                  <p className="text-sm text-amber-800 mt-1">
                    OCR 인식률이 목표치 대비 1.5%p 낮습니다. 추가 데이터 확보 및 모델 튜닝이 필요합니다.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (selectedDeliverable || isNewDeliverable) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {isNewDeliverable ? '새 산출물 업로드' : '산출물 업로드'}
            </h3>
            <div className="mb-4">
              {isNewDeliverable ? (
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">문서명</label>
                    <input
                      value={newDeliverableName}
                      onChange={(event) => setNewDeliverableName(event.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">설명</label>
                    <input
                      value={newDeliverableDescription}
                      onChange={(event) => setNewDeliverableDescription(event.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">유형</label>
                    <select
                      value={newDeliverableType}
                      onChange={(event) => setNewDeliverableType(event.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="DOCUMENT">문서</option>
                      <option value="REPORT">보고서</option>
                      <option value="PRESENTATION">발표자료</option>
                      <option value="CODE">코드</option>
                      <option value="OTHER">기타</option>
                    </select>
                  </div>
                </div>
              ) : (
                selectedDeliverable && (
                  <p className="text-sm text-gray-700 mb-2">
                    <span className="font-medium">문서명:</span> {selectedDeliverable.name}
                  </p>
                )
              )}
              <label className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer block">
                <input
                  type="file"
                  className="hidden"
                  onChange={(event) => setUploadFile(event.target.files ? event.target.files[0] : null)}
                />
                <Upload className="mx-auto text-gray-400 mb-2" size={32} />
                <p className="text-sm text-gray-600">
                  {uploadFile ? uploadFile.name : '파일을 선택하거나 드래그하세요'}
                </p>
                <p className="text-xs text-gray-400 mt-1">PDF, DOCX, XLSX (최대 10MB)</p>
              </label>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmUpload}
                disabled={!uploadFile || (isNewDeliverable && !newDeliverableName.trim())}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                업로드
              </button>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedDeliverable(null);
                  setUploadFile(null);
                  setIsNewDeliverable(false);
                  setNewDeliverableName('');
                  setNewDeliverableDescription('');
                  setNewDeliverableType('DOCUMENT');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {showKpiModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingKpi ? 'KPI 수정' : 'KPI 추가'}
            </h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm text-gray-700 mb-1">지표명</label>
                <input
                  value={kpiForm.name}
                  onChange={(event) => setKpiForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">목표</label>
                <input
                  value={kpiForm.target}
                  onChange={(event) => setKpiForm((prev) => ({ ...prev, target: event.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">현재</label>
                <input
                  value={kpiForm.current}
                  onChange={(event) => setKpiForm((prev) => ({ ...prev, current: event.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">상태</label>
                <select
                  value={kpiForm.status}
                  onChange={(event) => setKpiForm((prev) => ({ ...prev, status: event.target.value as KPI['status'] }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="onTrack">정상</option>
                  <option value="atRisk">위험</option>
                  <option value="achieved">달성</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSaveKpi}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                저장
              </button>
              <button
                onClick={() => {
                  setShowKpiModal(false);
                  setEditingKpi(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {showPhaseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingPhase ? '단계 수정' : '새 단계 추가'}
            </h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm text-gray-700 mb-1">단계명 *</label>
                <input
                  value={phaseForm.name}
                  onChange={(e) => setPhaseForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="단계명을 입력하세요"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">설명</label>
                <textarea
                  value={phaseForm.description}
                  onChange={(e) => setPhaseForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  rows={3}
                  placeholder="단계 설명을 입력하세요"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">시작일</label>
                  <input
                    type="date"
                    value={phaseForm.startDate}
                    onChange={(e) => setPhaseForm((prev) => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">종료일</label>
                  <input
                    type="date"
                    value={phaseForm.endDate}
                    onChange={(e) => setPhaseForm((prev) => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">상태</label>
                  <select
                    value={phaseForm.status}
                    onChange={(e) => setPhaseForm((prev) => ({ ...prev, status: e.target.value as Phase['status'] }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="pending">대기</option>
                    <option value="inProgress">진행중</option>
                    <option value="completed">완료</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">진행률 (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={phaseForm.progress}
                    onChange={(e) => setPhaseForm((prev) => ({ ...prev, progress: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSavePhase}
                disabled={!phaseForm.name.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {editingPhase ? '수정' : '추가'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPhaseModal(false);
                  setEditingPhase(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
            </div>
            {editingPhase && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    if (editingPhase) {
                      handleDeletePhase(editingPhase.id);
                      setShowPhaseModal(false);
                      setEditingPhase(null);
                    }
                  }}
                  className="w-full px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} />
                  이 단계 삭제
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
