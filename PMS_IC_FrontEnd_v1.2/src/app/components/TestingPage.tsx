import { useState, useMemo } from 'react';
import {
  TestTube,
  Plus,
  Play,
} from 'lucide-react';
import { getRolePermissions } from '../../utils/rolePermissions';
import { UserRole } from '../App';
import { usePreset } from '../../hooks/usePreset';
import { useFilterSpec } from '../../hooks/useFilterSpec';
import { PresetSwitcher } from './common/PresetSwitcher';
import { TestKpiRow, TestFilters, TEST_FILTER_KEYS, TestRightPanel } from './tests';
import type { TestPanelMode } from './tests';

interface TestingPageProps {
  userRole: UserRole;
  projectId?: string;
}

type TestStatus = 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED' | 'SKIPPED' | 'BLOCKED';
type TestType = 'UNIT' | 'INTEGRATION' | 'E2E' | 'PERFORMANCE' | 'SECURITY' | 'UAT';
type TestPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

interface TestCase {
  id: string;
  code: string;
  title: string;
  description?: string;
  type: TestType;
  priority: TestPriority;
  status: TestStatus;
  assignee?: string;
  linkedRequirementId?: string;
  linkedStoryId?: string;
  steps?: string[];
  expectedResult?: string;
  actualResult?: string;
  executedAt?: string;
  executedBy?: string;
  duration?: number;
}

// Mock test data
const mockTestCases: TestCase[] = [
  {
    id: '1',
    code: 'TC-001',
    title: 'OCR 문서 인식 정확도 검증',
    description: '보험금 청구서류의 OCR 인식률이 95% 이상인지 확인',
    type: 'INTEGRATION',
    priority: 'CRITICAL',
    status: 'PASSED',
    assignee: 'QA팀장',
    linkedRequirementId: 'REQ-001',
    expectedResult: '인식률 95% 이상',
    actualResult: '인식률 96.5%',
    executedAt: '2026-01-25T10:30:00',
    executedBy: 'QA팀장',
    duration: 45,
  },
  {
    id: '2',
    code: 'TC-002',
    title: '자동 심사 결과 일관성 테스트',
    description: '동일 건에 대해 반복 심사 시 동일 결과 도출 여부 확인',
    type: 'INTEGRATION',
    priority: 'HIGH',
    status: 'RUNNING',
    assignee: 'QA팀원',
    linkedRequirementId: 'REQ-003',
    expectedResult: '100% 동일 결과',
  },
  {
    id: '3',
    code: 'TC-003',
    title: '대용량 처리 성능 테스트',
    description: '1000건 동시 처리 시 응답시간 측정',
    type: 'PERFORMANCE',
    priority: 'HIGH',
    status: 'PENDING',
    assignee: 'QA팀원',
    expectedResult: '평균 응답시간 3초 이내',
  },
  {
    id: '4',
    code: 'TC-004',
    title: '사용자 권한 접근 제어 테스트',
    description: '역할별 메뉴 접근 권한이 정상 작동하는지 확인',
    type: 'SECURITY',
    priority: 'CRITICAL',
    status: 'PASSED',
    assignee: 'QA팀장',
    executedAt: '2026-01-24T14:00:00',
    executedBy: 'QA팀장',
    duration: 30,
  },
  {
    id: '5',
    code: 'TC-005',
    title: '현업 사용자 인수 테스트',
    description: '실제 심사 시나리오 기반 사용자 검증',
    type: 'UAT',
    priority: 'HIGH',
    status: 'PENDING',
    assignee: '현업담당자',
  },
  {
    id: '6',
    code: 'TC-006',
    title: 'API 응답 형식 검증',
    description: '모든 API 응답이 표준 형식을 준수하는지 확인',
    type: 'UNIT',
    priority: 'MEDIUM',
    status: 'FAILED',
    assignee: 'QA팀원',
    expectedResult: '표준 응답 형식 준수',
    actualResult: '일부 API에서 필드 누락 발견',
    executedAt: '2026-01-25T16:00:00',
    executedBy: 'QA팀원',
    duration: 15,
  },
];

export default function TestingPage({ userRole, projectId = 'proj-001' }: TestingPageProps) {
  const [testCases] = useState<TestCase[]>(mockTestCases);

  // Role permissions
  const permissions = getRolePermissions(userRole);
  const canManage = permissions.canEdit;

  // Preset and filter systems
  const { currentPreset, switchPreset } = usePreset(userRole.toUpperCase());
  const { filters, setFilters } = useFilterSpec({ keys: TEST_FILTER_KEYS, syncUrl: false });
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<TestPanelMode>('none');

  // Filter test cases using FilterSpec values
  const filteredTestCases = useMemo(() => {
    let filtered = testCases;

    const searchQuery = (filters.q as string) || '';
    const filterStatus = (filters.lastOutcome as string) || '';
    const filterPriority = (filters.priority as string) || '';

    if (filterStatus) {
      filtered = filtered.filter((tc) => tc.status === filterStatus);
    }

    if (filterPriority) {
      filtered = filtered.filter((tc) => tc.priority === filterPriority);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (tc) =>
          tc.code.toLowerCase().includes(query) ||
          tc.title.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [testCases, filters]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = testCases.length;
    const passed = testCases.filter((tc) => tc.status === 'PASSED').length;
    const failed = testCases.filter((tc) => tc.status === 'FAILED').length;
    const blocked = testCases.filter((tc) => tc.status === 'BLOCKED').length;
    const notRun = testCases.filter((tc) => tc.status === 'PENDING').length;
    const executedCount = testCases.filter((tc) =>
      ['PASSED', 'FAILED'].includes(tc.status)
    ).length;
    const passRate =
      executedCount > 0 ? Math.round((passed / executedCount) * 100) : 0;

    return {
      total,
      passed,
      failed,
      blocked,
      notRun,
      passRate,
      coverageRate: 78,       // mock
      executionRate: 67,      // mock
      regressionPassRate: 92, // mock
    };
  }, [testCases]);

  // Get status badge styles
  const getStatusBadge = (status: TestStatus) => {
    switch (status) {
      case 'PASSED':
        return 'bg-green-100 text-green-700';
      case 'FAILED':
        return 'bg-red-100 text-red-700';
      case 'RUNNING':
        return 'bg-blue-100 text-blue-700';
      case 'PENDING':
        return 'bg-gray-100 text-gray-700';
      case 'SKIPPED':
        return 'bg-amber-100 text-amber-700';
      case 'BLOCKED':
        return 'bg-purple-100 text-purple-700';
    }
  };

  const getStatusLabel = (status: TestStatus) => {
    switch (status) {
      case 'PASSED':
        return '성공';
      case 'FAILED':
        return '실패';
      case 'RUNNING':
        return '실행 중';
      case 'PENDING':
        return '대기';
      case 'SKIPPED':
        return '건너뜀';
      case 'BLOCKED':
        return '차단됨';
    }
  };

  const getTypeBadge = (type: TestType) => {
    switch (type) {
      case 'UNIT':
        return 'bg-slate-100 text-slate-700';
      case 'INTEGRATION':
        return 'bg-indigo-100 text-indigo-700';
      case 'E2E':
        return 'bg-cyan-100 text-cyan-700';
      case 'PERFORMANCE':
        return 'bg-orange-100 text-orange-700';
      case 'SECURITY':
        return 'bg-rose-100 text-rose-700';
      case 'UAT':
        return 'bg-teal-100 text-teal-700';
    }
  };

  const getTypeLabel = (type: TestType) => {
    switch (type) {
      case 'UNIT':
        return '단위';
      case 'INTEGRATION':
        return '통합';
      case 'E2E':
        return 'E2E';
      case 'PERFORMANCE':
        return '성능';
      case 'SECURITY':
        return '보안';
      case 'UAT':
        return 'UAT';
    }
  };

  const getPriorityBadge = (priority: TestPriority) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-700 border border-red-300';
      case 'HIGH':
        return 'bg-orange-100 text-orange-700';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-700';
      case 'LOW':
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">테스트 관리</h1>
            <p className="text-gray-500 mt-1">테스트 케이스 및 실행 결과 관리</p>
          </div>
          <div className="mx-3 h-8 w-px bg-gray-200" />
          <PresetSwitcher currentPreset={currentPreset} onSwitch={switchPreset} compact />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Play size={18} />
            테스트 실행
          </button>
          {canManage && (
            <button
              type="button"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus size={18} />
              테스트 케이스 추가
            </button>
          )}
        </div>
      </div>

      {/* KPI Row */}
      <TestKpiRow stats={stats} preset={currentPreset} />

      {/* Filters */}
      <TestFilters values={filters} onChange={setFilters} preset={currentPreset} />

      {/* Test Case Table + Right Panel */}
      <div className="flex gap-4 flex-1 min-h-0">
        <div className="flex-1 overflow-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    테스트 ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    제목
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    유형
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    우선순위
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    상태
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    담당자
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    실행 시간
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTestCases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                      <TestTube size={32} className="mx-auto mb-2 opacity-50" />
                      <p>표시할 테스트 케이스가 없습니다.</p>
                    </td>
                  </tr>
                ) : (
                  filteredTestCases.map((tc) => (
                    <tr
                      key={tc.id}
                      className={`hover:bg-gray-50 cursor-pointer ${
                        selectedTestId === tc.id ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => {
                        setSelectedTestId(tc.id);
                        setPanelMode('tc-detail');
                      }}
                    >
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono text-gray-600">{tc.code}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{tc.title}</p>
                        {tc.description && (
                          <p className="text-xs text-gray-500 truncate max-w-md">{tc.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeBadge(tc.type)}`}>
                          {getTypeLabel(tc.type)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityBadge(tc.priority)}`}>
                          {tc.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(tc.status)}`}>
                          {getStatusLabel(tc.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{tc.assignee || '-'}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {tc.duration ? (
                          <span className="text-sm text-gray-600">{tc.duration}초</span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        {panelMode !== 'none' && (
          <TestRightPanel
            mode={panelMode}
            testCase={testCases.find((tc) => tc.id === selectedTestId)}
            preset={currentPreset}
            onClose={() => {
              setPanelMode('none');
              setSelectedTestId(null);
            }}
            onModeChange={setPanelMode}
            canEdit={canManage}
          />
        )}
      </div>
    </div>
  );
}
