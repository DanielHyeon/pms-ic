import { useState, useMemo } from 'react';
import {
  Plus,
  List,
  Columns3,
  Grid3X3,
  Scale,
  Shield,
  AlertTriangle,
} from 'lucide-react';
import { getRolePermissions } from '../../utils/rolePermissions';
import type { UserRole } from '../App';
import { usePreset } from '../../hooks/usePreset';
import { useFilterSpec } from '../../hooks/useFilterSpec';
import { PresetSwitcher } from './common/PresetSwitcher';
import {
  DECISION_STATUS_LABELS,
  RISK_STATUS_LABELS,
} from '../../constants/statusMaps';
import type { DecisionStatus, RiskStatus } from '../../constants/statusMaps';
import {
  DecisionRiskKpiRow,
  DecisionRiskFilters,
  DECISION_RISK_FILTER_KEYS,
  RiskMatrixView,
  DecisionKanbanView,
  DecisionRiskRightPanel,
} from './decisions';
import type {
  DecisionItem,
  RiskItem,
  DecisionRiskPanelMode,
  DecisionRiskViewTab,
  RiskSeverity,
} from './decisions';

// ── Props ──────────────────────────────────────────────────

interface DecisionRiskPageProps {
  userRole: UserRole;
}

// ── Mock data ──────────────────────────────────────────────
// TODO: Replace with real API

const mockDecisions: DecisionItem[] = [
  {
    id: 'dec-1',
    code: 'DEC-001',
    title: 'OCR 엔진 교체 여부 결정',
    description:
      'Currently using Tesseract OCR. Evaluate whether to switch to a commercial OCR engine for higher accuracy on insurance claim documents.',
    status: 'PROPOSED',
    owner: 'PM Lead',
    proposedDate: '2026-01-15T09:00:00',
    options: [
      'Maintain Tesseract with fine-tuning',
      'Switch to ABBYY FineReader',
      'Adopt Google Document AI',
    ],
    escalationSourceId: 'ISS-042',
    escalationSourceType: 'issue',
    phaseId: 'phase-2',
  },
  {
    id: 'dec-2',
    code: 'DEC-002',
    title: '자동 심사 임계값 조정',
    description:
      'The auto-review threshold is currently set at 85% confidence. Proposal to adjust the threshold based on recent accuracy data.',
    status: 'UNDER_REVIEW',
    owner: 'Tech Lead',
    proposedDate: '2026-01-20T14:00:00',
    options: ['Keep at 85%', 'Raise to 90%', 'Lower to 80%'],
    phaseId: 'phase-2',
  },
  {
    id: 'dec-3',
    code: 'DEC-003',
    title: '마이크로서비스 전환 범위 결정',
    description:
      'Determine the scope of microservice migration for Phase 3. Full migration vs partial migration of critical services only.',
    status: 'APPROVED',
    owner: 'Architect',
    proposedDate: '2026-01-05T10:00:00',
    resolvedDate: '2026-01-28T16:00:00',
    options: ['Full migration', 'Critical services only', 'Hybrid approach'],
    selectedOption: 'Critical services only',
    rationale:
      'Full migration would require 3 additional months. Critical services approach delivers 80% of the benefit with 40% of the effort.',
    phaseId: 'phase-3',
  },
  {
    id: 'dec-4',
    code: 'DEC-004',
    title: '테스트 자동화 도구 선정',
    description: 'Select the test automation framework for the project.',
    status: 'REJECTED',
    owner: 'QA Lead',
    proposedDate: '2026-01-10T11:00:00',
    resolvedDate: '2026-01-22T09:00:00',
    options: ['Selenium', 'Playwright', 'Cypress'],
    rationale: 'Rejected in favor of reconsidering after Phase 2 delivery.',
  },
  {
    id: 'dec-5',
    code: 'DEC-005',
    title: 'API 게이트웨이 선택',
    description: 'Choose between Kong and AWS API Gateway for the production API layer.',
    status: 'DEFERRED',
    owner: 'DevOps Lead',
    proposedDate: '2026-01-08T13:00:00',
    options: ['Kong Gateway', 'AWS API Gateway', 'Custom Nginx'],
    rationale: 'Deferred until infrastructure requirements are finalized in Phase 3.',
  },
  {
    id: 'dec-6',
    code: 'DEC-006',
    title: '보안 감사 일정 결정',
    description: 'Determine the timing of the external security audit.',
    status: 'PROPOSED',
    owner: 'Security Officer',
    proposedDate: '2026-02-01T10:00:00',
    options: ['Before Phase 2 release', 'After Phase 2 release', 'Concurrent with UAT'],
    escalationSourceId: 'RSK-003',
    escalationSourceType: 'risk',
    phaseId: 'phase-2',
  },
];

const mockRisks: RiskItem[] = [
  {
    id: 'risk-1',
    code: 'RSK-001',
    title: 'OCR 인식률 목표 미달 위험',
    description:
      'The OCR recognition rate may fall below the 95% target for handwritten claim documents.',
    status: 'MITIGATING',
    severity: 'critical',
    impact: 5,
    probability: 4,
    score: 20,
    owner: 'Tech Lead',
    identifiedDate: '2026-01-10T09:00:00',
    mitigationPlan:
      'Implement data augmentation for training data. Consider commercial OCR fallback for low-confidence results.',
    linkedIssueIds: ['ISS-042', 'ISS-045'],
    phaseId: 'phase-2',
  },
  {
    id: 'risk-2',
    code: 'RSK-002',
    title: '성능 병목 발생 가능성',
    description: 'Concurrent processing may exceed expected response time under heavy load.',
    status: 'ASSESSED',
    severity: 'high',
    impact: 4,
    probability: 3,
    score: 12,
    owner: 'DevOps Lead',
    identifiedDate: '2026-01-12T14:00:00',
    mitigationPlan: 'Implement auto-scaling and load balancing. Set up performance monitoring alerts.',
    linkedIssueIds: ['ISS-048'],
    phaseId: 'phase-2',
  },
  {
    id: 'risk-3',
    code: 'RSK-003',
    title: '보안 취약점 미발견 위험',
    description: 'Security vulnerabilities may not be detected before production deployment.',
    status: 'IDENTIFIED',
    severity: 'high',
    impact: 5,
    probability: 2,
    score: 10,
    owner: 'Security Officer',
    identifiedDate: '2026-01-15T10:00:00',
    phaseId: 'phase-2',
  },
  {
    id: 'risk-4',
    code: 'RSK-004',
    title: '핵심 인력 이탈 위험',
    description: 'Key team members may leave during critical Phase 2 development period.',
    status: 'ACCEPTED',
    severity: 'medium',
    impact: 3,
    probability: 2,
    score: 6,
    owner: 'PM Lead',
    identifiedDate: '2026-01-08T11:00:00',
    mitigationPlan: 'Cross-training program and documentation of critical knowledge.',
  },
  {
    id: 'risk-5',
    code: 'RSK-005',
    title: '외부 API 의존성 장애',
    description: 'Third-party insurance verification API may experience outages or breaking changes.',
    status: 'MITIGATING',
    severity: 'medium',
    impact: 3,
    probability: 3,
    score: 9,
    owner: 'Backend Lead',
    identifiedDate: '2026-01-20T09:00:00',
    mitigationPlan: 'Implement circuit breaker pattern and fallback mechanisms.',
    linkedIssueIds: ['ISS-052'],
    phaseId: 'phase-3',
  },
  {
    id: 'risk-6',
    code: 'RSK-006',
    title: '규제 요건 변경 위험',
    description: 'Insurance regulatory requirements may change during the project lifecycle.',
    status: 'RESOLVED',
    severity: 'low',
    impact: 2,
    probability: 1,
    score: 2,
    owner: 'BA Lead',
    identifiedDate: '2026-01-05T15:00:00',
    mitigationPlan: 'Regular regulatory monitoring. Flexible architecture to accommodate changes.',
  },
];

// ── Status styling helpers ─────────────────────────────────

const DECISION_STATUS_BADGE: Record<DecisionStatus, string> = {
  PROPOSED: 'bg-blue-100 text-blue-700',
  UNDER_REVIEW: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  DEFERRED: 'bg-gray-100 text-gray-700',
};

const RISK_STATUS_BADGE: Record<RiskStatus, string> = {
  IDENTIFIED: 'bg-blue-100 text-blue-700',
  ASSESSED: 'bg-amber-100 text-amber-700',
  MITIGATING: 'bg-orange-100 text-orange-700',
  RESOLVED: 'bg-green-100 text-green-700',
  ACCEPTED: 'bg-gray-100 text-gray-700',
};

const SEVERITY_BADGE: Record<RiskSeverity, string> = {
  critical: 'bg-red-100 text-red-700 border-red-300',
  high: 'bg-orange-100 text-orange-700 border-orange-300',
  medium: 'bg-amber-100 text-amber-700 border-amber-300',
  low: 'bg-green-100 text-green-700 border-green-300',
};

// ── Main Page Component ────────────────────────────────────

export default function DecisionRiskPage({ userRole }: DecisionRiskPageProps) {
  // State
  const [decisions] = useState<DecisionItem[]>(mockDecisions);
  const [risks] = useState<RiskItem[]>(mockRisks);
  const [viewTab, setViewTab] = useState<DecisionRiskViewTab>('all');
  const [selectedDecisionId, setSelectedDecisionId] = useState<string | null>(null);
  const [selectedRiskId, setSelectedRiskId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<DecisionRiskPanelMode>('none');

  // Role permissions
  const permissions = getRolePermissions(userRole);
  const canManage = permissions.canEdit;

  // Preset and filter systems
  const { currentPreset, switchPreset } = usePreset(userRole.toUpperCase());
  const { filters, setFilters } = useFilterSpec({
    keys: DECISION_RISK_FILTER_KEYS,
    syncUrl: false,
  });

  // Selected items for panel
  const selectedDecision = decisions.find((d) => d.id === selectedDecisionId);
  const selectedRisk = risks.find((r) => r.id === selectedRiskId);

  // Filter items using FilterSpec values
  const filteredDecisions = useMemo(() => {
    let filtered = decisions;
    const searchQuery = (filters.q as string) || '';
    const typeFilter = (filters.type as string) || '';
    const decisionStatusFilter = (filters.decisionStatus as string) || '';
    const ownerFilter = (filters.ownerId as string) || '';

    // If type filter is set to 'risk', hide all decisions
    if (typeFilter === 'risk') return [];

    if (decisionStatusFilter) {
      filtered = filtered.filter((d) => d.status === decisionStatusFilter);
    }

    if (ownerFilter) {
      filtered = filtered.filter((d) => d.owner === ownerFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.code.toLowerCase().includes(query) ||
          d.title.toLowerCase().includes(query) ||
          d.owner.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [decisions, filters]);

  const filteredRisks = useMemo(() => {
    let filtered = risks;
    const searchQuery = (filters.q as string) || '';
    const typeFilter = (filters.type as string) || '';
    const riskStatusFilter = (filters.riskStatus as string) || '';
    const severityFilter = (filters.severity as string) || '';
    const ownerFilter = (filters.ownerId as string) || '';

    // If type filter is set to 'decision', hide all risks
    if (typeFilter === 'decision') return [];

    if (riskStatusFilter) {
      filtered = filtered.filter((r) => r.status === riskStatusFilter);
    }

    if (severityFilter) {
      filtered = filtered.filter((r) => r.severity === severityFilter);
    }

    if (ownerFilter) {
      filtered = filtered.filter((r) => r.owner === ownerFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.code.toLowerCase().includes(query) ||
          r.title.toLowerCase().includes(query) ||
          r.owner.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [risks, filters]);

  // Handlers
  const handleSelectDecision = (decision: DecisionItem) => {
    setSelectedDecisionId(decision.id);
    setSelectedRiskId(null);
    setPanelMode('decision-detail');
  };

  const handleSelectRisk = (risk: RiskItem) => {
    setSelectedRiskId(risk.id);
    setSelectedDecisionId(null);
    setPanelMode('risk-detail');
  };

  const handleClosePanel = () => {
    setPanelMode('none');
    setSelectedDecisionId(null);
    setSelectedRiskId(null);
  };

  // Tab config
  const viewTabs: { key: DecisionRiskViewTab; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'All List', icon: <List size={14} /> },
    { key: 'kanban', label: 'Decision Kanban', icon: <Columns3 size={14} /> },
    { key: 'matrix', label: 'Risk Matrix', icon: <Grid3X3 size={14} /> },
  ];

  return (
    <div className="flex-1 p-6 space-y-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Decision / Risk Board
            </h1>
            <p className="text-gray-500 mt-1">
              Decision log and risk register management
            </p>
          </div>
          <div className="mx-3 h-8 w-px bg-gray-200" />
          <PresetSwitcher
            currentPreset={currentPreset}
            onSwitch={switchPreset}
            compact
          />
        </div>
        {canManage && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus size={18} />
              Decision
            </button>
            <button
              type="button"
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
            >
              <Plus size={18} />
              Risk
            </button>
          </div>
        )}
      </div>

      {/* KPI Row */}
      <DecisionRiskKpiRow
        decisions={decisions}
        risks={risks}
        preset={currentPreset}
      />

      {/* Filters */}
      <DecisionRiskFilters
        values={filters}
        onChange={setFilters}
        preset={currentPreset}
      />

      {/* View Tab Switcher */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {viewTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setViewTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-all ${
              viewTab === tab.key
                ? 'bg-white shadow-sm font-medium text-gray-900'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main content + Right Panel */}
      <div className="flex gap-4 flex-1 min-h-0">
        <div className="flex-1 overflow-auto">
          {viewTab === 'all' && (
            <AllListView
              decisions={filteredDecisions}
              risks={filteredRisks}
              selectedDecisionId={selectedDecisionId}
              selectedRiskId={selectedRiskId}
              onSelectDecision={handleSelectDecision}
              onSelectRisk={handleSelectRisk}
            />
          )}
          {viewTab === 'kanban' && (
            <DecisionKanbanView
              decisions={filteredDecisions}
              onSelect={handleSelectDecision}
              selectedDecisionId={selectedDecisionId}
            />
          )}
          {viewTab === 'matrix' && (
            <RiskMatrixView
              risks={filteredRisks}
              onSelect={handleSelectRisk}
              selectedRiskId={selectedRiskId}
            />
          )}
        </div>

        {panelMode !== 'none' && (
          <DecisionRiskRightPanel
            mode={panelMode}
            decision={selectedDecision}
            risk={selectedRisk}
            preset={currentPreset}
            onClose={handleClosePanel}
            onModeChange={setPanelMode}
            canEdit={canManage}
          />
        )}
      </div>
    </div>
  );
}

// ── All List (Integrated Table) ────────────────────────────

function AllListView({
  decisions,
  risks,
  selectedDecisionId,
  selectedRiskId,
  onSelectDecision,
  onSelectRisk,
}: {
  decisions: DecisionItem[];
  risks: RiskItem[];
  selectedDecisionId: string | null;
  selectedRiskId: string | null;
  onSelectDecision: (d: DecisionItem) => void;
  onSelectRisk: (r: RiskItem) => void;
}) {
  // Merge into a unified list sorted by date (newest first)
  const unifiedItems = useMemo(() => {
    const decisionItems = decisions.map((d) => ({
      ...d,
      itemType: 'decision' as const,
      sortDate: d.proposedDate,
    }));
    const riskItems = risks.map((r) => ({
      ...r,
      itemType: 'risk' as const,
      sortDate: r.identifiedDate,
    }));
    return [...decisionItems, ...riskItems].sort(
      (a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime()
    );
  }, [decisions, risks]);

  if (unifiedItems.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <Scale size={32} className="mx-auto mb-2 text-gray-300" />
        <p className="text-gray-400">No decisions or risks to display.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              ID
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
              Type
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Title
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
              Status
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
              Severity
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Owner
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {unifiedItems.map((item) => {
            const isDecision = item.itemType === 'decision';
            const isSelected = isDecision
              ? selectedDecisionId === item.id
              : selectedRiskId === item.id;

            return (
              <tr
                key={item.id}
                className={`hover:bg-gray-50 cursor-pointer ${
                  isSelected ? 'bg-blue-50' : ''
                }`}
                onClick={() => {
                  if (isDecision) {
                    onSelectDecision(item as DecisionItem);
                  } else {
                    onSelectRisk(item as RiskItem);
                  }
                }}
              >
                {/* ID */}
                <td className="px-4 py-3">
                  <span className="text-sm font-mono text-gray-600">
                    {item.code}
                  </span>
                </td>

                {/* Type badge */}
                <td className="px-4 py-3 text-center">
                  {isDecision ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                      <Scale size={10} />
                      Decision
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-orange-50 text-orange-700">
                      <Shield size={10} />
                      Risk
                    </span>
                  )}
                </td>

                {/* Title */}
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900 truncate max-w-md">
                    {item.title}
                  </p>
                </td>

                {/* Status */}
                <td className="px-4 py-3 text-center">
                  {isDecision ? (
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        DECISION_STATUS_BADGE[
                          (item as DecisionItem).status
                        ]
                      }`}
                    >
                      {DECISION_STATUS_LABELS[(item as DecisionItem).status]}
                    </span>
                  ) : (
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        RISK_STATUS_BADGE[(item as RiskItem).status]
                      }`}
                    >
                      {RISK_STATUS_LABELS[(item as RiskItem).status]}
                    </span>
                  )}
                </td>

                {/* Severity (for risks only) */}
                <td className="px-4 py-3 text-center">
                  {!isDecision && (item as RiskItem).severity ? (
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium border ${
                        SEVERITY_BADGE[(item as RiskItem).severity]
                      }`}
                    >
                      {(item as RiskItem).severity.charAt(0).toUpperCase() +
                        (item as RiskItem).severity.slice(1)}
                      {' '}
                      ({(item as RiskItem).score})
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300">-</span>
                  )}
                </td>

                {/* Owner */}
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-600">{item.owner}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
