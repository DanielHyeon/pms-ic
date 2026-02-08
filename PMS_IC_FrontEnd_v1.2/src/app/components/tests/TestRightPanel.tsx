import { useState } from 'react';
import {
  X,
  TestTube,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Shield,
  Play,
  Link2,
  Bug,
  BarChart3,
} from 'lucide-react';
import type { ViewModePreset } from '../../../types/menuOntology';

// ── Types ──────────────────────────────────────────────────

export type TestPanelMode =
  | 'none'
  | 'tc-detail'
  | 'execution'
  | 'coverage'
  | 'defect-link';

export interface TestRightPanelProps {
  mode: TestPanelMode;
  testCase?: any;
  preset: ViewModePreset;
  onClose: () => void;
  onModeChange: (mode: TestPanelMode) => void;
  canEdit: boolean;
}

// ── Styling helpers ────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  PASSED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  RUNNING: 'bg-blue-100 text-blue-700',
  PENDING: 'bg-gray-100 text-gray-700',
  SKIPPED: 'bg-amber-100 text-amber-700',
  BLOCKED: 'bg-purple-100 text-purple-700',
};

const TYPE_BADGE: Record<string, string> = {
  UNIT: 'bg-slate-100 text-slate-700',
  INTEGRATION: 'bg-indigo-100 text-indigo-700',
  E2E: 'bg-cyan-100 text-cyan-700',
  PERFORMANCE: 'bg-orange-100 text-orange-700',
  SECURITY: 'bg-rose-100 text-rose-700',
  UAT: 'bg-teal-100 text-teal-700',
};

const PRIORITY_BADGE: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 border-red-300',
  HIGH: 'bg-orange-100 text-orange-700 border-orange-300',
  MEDIUM: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  LOW: 'bg-gray-100 text-gray-600 border-gray-300',
};

// ── Mock execution history ─────────────────────────────────

const MOCK_EXECUTION_HISTORY = [
  {
    runId: 'RUN-004',
    outcome: 'PASSED',
    executedBy: 'QA Lead',
    executedAt: '2026-01-25T10:30:00',
    duration: 45,
    environment: 'Staging',
  },
  {
    runId: 'RUN-003',
    outcome: 'FAILED',
    executedBy: 'QA Engineer',
    executedAt: '2026-01-23T14:15:00',
    duration: 38,
    environment: 'Dev',
  },
  {
    runId: 'RUN-002',
    outcome: 'PASSED',
    executedBy: 'QA Lead',
    executedAt: '2026-01-20T09:00:00',
    duration: 42,
    environment: 'Staging',
  },
  {
    runId: 'RUN-001',
    outcome: 'BLOCKED',
    executedBy: 'QA Engineer',
    executedAt: '2026-01-18T16:45:00',
    duration: 0,
    environment: 'Dev',
  },
];

// ── Sub-panels ─────────────────────────────────────────────

function TcDetailPanel({ testCase, canEdit }: { testCase: any; canEdit: boolean }) {
  return (
    <div className="space-y-5">
      {/* Title and badges */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{testCase.title}</h3>
        <p className="text-xs text-gray-500 font-mono mt-1">{testCase.code}</p>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span
            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
              TYPE_BADGE[testCase.type] || 'bg-gray-100 text-gray-700'
            }`}
          >
            {testCase.type}
          </span>
          <span
            className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${
              PRIORITY_BADGE[testCase.priority] || PRIORITY_BADGE.LOW
            }`}
          >
            {testCase.priority}
          </span>
          <span
            className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
              STATUS_BADGE[testCase.status] || STATUS_BADGE.PENDING
            }`}
          >
            {testCase.status}
          </span>
        </div>
      </div>

      {/* Description */}
      {testCase.description && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Description</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {testCase.description}
          </p>
        </div>
      )}

      {/* People */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-500 mb-1">Assignee</p>
          <p className="text-sm text-gray-700">{testCase.assignee || 'Unassigned'}</p>
        </div>
        {testCase.executedBy && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Last Executed By</p>
            <p className="text-sm text-gray-700">{testCase.executedBy}</p>
          </div>
        )}
      </div>

      {/* Linked entities */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            <Link2 size={12} />
            Requirement
          </p>
          <p className="text-sm text-gray-700">
            {testCase.linkedRequirementId || 'Not linked'}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            <Link2 size={12} />
            Story
          </p>
          <p className="text-sm text-gray-700">
            {testCase.linkedStoryId || 'Not linked'}
          </p>
        </div>
      </div>

      {/* Expected / Actual results */}
      {testCase.expectedResult && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Expected Result</p>
          <p className="text-sm text-gray-700 bg-green-50 rounded-lg p-3">
            {testCase.expectedResult}
          </p>
        </div>
      )}
      {testCase.actualResult && (
        <div>
          <p className="text-xs text-gray-500 mb-1">Actual Result</p>
          <p className="text-sm text-gray-700 bg-blue-50 rounded-lg p-3">
            {testCase.actualResult}
          </p>
        </div>
      )}

      {/* Execution history timeline */}
      <div>
        <p className="text-xs font-medium text-gray-700 flex items-center gap-1 mb-2">
          <Clock size={12} />
          Execution History
        </p>
        <div className="space-y-2">
          {MOCK_EXECUTION_HISTORY.map((run) => (
            <div
              key={run.runId}
              className="flex items-center gap-3 text-sm bg-gray-50 rounded-lg px-3 py-2"
            >
              <span className="text-xs text-gray-500 font-mono w-16">{run.runId}</span>
              <span
                className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
                  STATUS_BADGE[run.outcome] || STATUS_BADGE.PENDING
                }`}
              >
                {run.outcome}
              </span>
              <span className="text-xs text-gray-500 ml-auto">
                {new Date(run.executedAt).toLocaleDateString()}
              </span>
              {run.duration > 0 && (
                <span className="text-xs text-gray-400">{run.duration}s</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      {canEdit && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
          <button className="px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors">
            Run Test
          </button>
          <button className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
            Edit
          </button>
          <button className="px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors">
            Link Defect
          </button>
        </div>
      )}
    </div>
  );
}

function ExecutionPanel({ testCase }: { testCase: any }) {
  const [outcome, setOutcome] = useState<string>('');
  const [actualResult, setActualResult] = useState('');
  const [notes, setNotes] = useState('');
  const [environment, setEnvironment] = useState('Staging');

  const outcomeOptions = [
    { value: 'PASSED', label: 'Passed', color: 'border-green-400 bg-green-50 text-green-700' },
    { value: 'FAILED', label: 'Failed', color: 'border-red-400 bg-red-50 text-red-700' },
    { value: 'BLOCKED', label: 'Blocked', color: 'border-purple-400 bg-purple-50 text-purple-700' },
    { value: 'SKIPPED', label: 'Skipped', color: 'border-amber-400 bg-amber-50 text-amber-700' },
  ];

  const handleSubmit = () => {
    // TODO: Wire to real test execution API
    console.log('Test execution submitted:', {
      testCaseId: testCase?.id,
      outcome,
      actualResult,
      notes,
      environment,
    });
  };

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <Play size={16} className="text-green-600" />
        Record Test Result
      </h3>

      {/* Source test case */}
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs text-gray-500 mb-1">Test Case</p>
        <p className="text-sm text-gray-800 font-medium">
          {testCase?.code} - {testCase?.title || 'No test case selected'}
        </p>
      </div>

      {/* Outcome selector */}
      <div>
        <label className="text-xs text-gray-600 block mb-1.5">Outcome</label>
        <div className="grid grid-cols-2 gap-2">
          {outcomeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setOutcome(opt.value)}
              className={`px-3 py-2 text-sm rounded-lg border transition-all font-medium ${
                outcome === opt.value
                  ? opt.color
                  : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Actual result */}
      <div>
        <label className="text-xs text-gray-600 block mb-1.5">Actual Result</label>
        <textarea
          value={actualResult}
          onChange={(e) => setActualResult(e.target.value)}
          rows={3}
          placeholder="Describe the actual result observed..."
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
        />
      </div>

      {/* Environment */}
      <div>
        <label className="text-xs text-gray-600 block mb-1.5">Environment</label>
        <select
          value={environment}
          onChange={(e) => setEnvironment(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="Dev">Dev</option>
          <option value="Staging">Staging</option>
          <option value="Production">Production</option>
          <option value="QA">QA</option>
        </select>
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs text-gray-600 block mb-1.5">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Additional notes..."
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
        />
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!outcome}
        className="w-full px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Submit Result
      </button>
    </div>
  );
}

function CoveragePanel({ testCase }: { testCase: any }) {
  // Mock coverage data
  const coverageData = {
    linkedRequirements: testCase?.linkedRequirementId ? 1 : 0,
    linkedStories: testCase?.linkedStoryId ? 1 : 0,
    coveragePercentage: 78,
    unlinkedRequirements: [
      { id: 'REQ-005', title: 'Data export functionality' },
      { id: 'REQ-008', title: 'Notification system integration' },
      { id: 'REQ-012', title: 'Audit trail logging' },
    ],
  };

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <Shield size={16} className="text-blue-600" />
        Coverage Analysis
      </h3>

      {/* Coverage summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-blue-700">
            {coverageData.linkedRequirements}
          </p>
          <p className="text-xs text-blue-600">Linked Reqs</p>
        </div>
        <div className="bg-indigo-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-indigo-700">
            {coverageData.linkedStories}
          </p>
          <p className="text-xs text-indigo-600">Linked Stories</p>
        </div>
        <div className="bg-emerald-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-emerald-700">
            {coverageData.coveragePercentage}%
          </p>
          <p className="text-xs text-emerald-600">Coverage</p>
        </div>
      </div>

      {/* Coverage bar */}
      <div>
        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
          <span>Requirement Coverage</span>
          <span>{coverageData.coveragePercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all"
            style={{ width: `${coverageData.coveragePercentage}%` }}
          />
        </div>
      </div>

      {/* Gap list (unlinked requirements) */}
      <div>
        <p className="text-xs font-medium text-amber-700 flex items-center gap-1 mb-2">
          <AlertTriangle size={12} />
          Coverage Gaps ({coverageData.unlinkedRequirements.length})
        </p>
        <ul className="space-y-1.5">
          {coverageData.unlinkedRequirements.map((req) => (
            <li
              key={req.id}
              className="text-sm text-gray-700 bg-amber-50 rounded px-3 py-2 flex items-center gap-2"
            >
              <span className="text-xs text-amber-600 font-mono">{req.id}</span>
              <span>{req.title}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function DefectLinkPanel({ testCase }: { testCase: any }) {
  const [issueSearch, setIssueSearch] = useState('');
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
  const [description, setDescription] = useState('');

  // Mock issue search results
  const mockIssues = [
    { id: 'ISS-101', title: 'API response format inconsistency', severity: 'HIGH' },
    { id: 'ISS-102', title: 'Login timeout not handled', severity: 'MEDIUM' },
    { id: 'ISS-103', title: 'Performance degradation under load', severity: 'CRITICAL' },
  ];

  const filteredIssues = issueSearch
    ? mockIssues.filter(
        (i) =>
          i.id.toLowerCase().includes(issueSearch.toLowerCase()) ||
          i.title.toLowerCase().includes(issueSearch.toLowerCase())
      )
    : mockIssues;

  const handleSubmit = () => {
    // TODO: Wire to real defect link API
    console.log('Defect link submitted:', {
      testCaseId: testCase?.id,
      issueId: selectedIssue,
      description,
    });
  };

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <Bug size={16} className="text-red-600" />
        Link Defect
      </h3>

      {/* Source test case */}
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs text-gray-500 mb-1">Test Case</p>
        <p className="text-sm text-gray-800 font-medium">
          {testCase?.code} - {testCase?.title || 'No test case selected'}
        </p>
      </div>

      {/* Issue search */}
      <div>
        <label className="text-xs text-gray-600 block mb-1.5">Search Issue</label>
        <input
          type="text"
          value={issueSearch}
          onChange={(e) => setIssueSearch(e.target.value)}
          placeholder="Search by ID or title..."
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
        />
      </div>

      {/* Issue list */}
      <div>
        <label className="text-xs text-gray-600 block mb-1.5">Select Issue</label>
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {filteredIssues.map((issue) => (
            <button
              key={issue.id}
              onClick={() => setSelectedIssue(issue.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
                selectedIssue === issue.id
                  ? 'border-red-400 bg-red-50'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-gray-500">{issue.id}</span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                    issue.severity === 'CRITICAL'
                      ? 'bg-red-100 text-red-700'
                      : issue.severity === 'HIGH'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {issue.severity}
                </span>
              </div>
              <p
                className={`text-sm mt-1 ${
                  selectedIssue === issue.id ? 'text-red-700' : 'text-gray-700'
                }`}
              >
                {issue.title}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="text-xs text-gray-600 block mb-1.5">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Describe how this test case relates to the defect..."
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
        />
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!selectedIssue}
        className="w-full px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Link Defect
      </button>
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────

export function TestRightPanel({
  mode,
  testCase,
  preset: _preset,
  onClose,
  onModeChange,
  canEdit,
}: TestRightPanelProps) {
  if (mode === 'none') return null;

  const tabs: { mode: TestPanelMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'tc-detail', label: 'Detail', icon: <TestTube size={14} /> },
    { mode: 'execution', label: 'Execute', icon: <Play size={14} /> },
    { mode: 'coverage', label: 'Coverage', icon: <BarChart3 size={14} /> },
    { mode: 'defect-link', label: 'Defect', icon: <Bug size={14} /> },
  ];

  const renderContent = () => {
    if (!testCase) {
      return (
        <div className="flex items-center justify-center h-32 text-sm text-gray-400">
          No test case selected
        </div>
      );
    }

    switch (mode) {
      case 'tc-detail':
        return <TcDetailPanel testCase={testCase} canEdit={canEdit} />;
      case 'execution':
        return <ExecutionPanel testCase={testCase} />;
      case 'coverage':
        return <CoveragePanel testCase={testCase} />;
      case 'defect-link':
        return <DefectLinkPanel testCase={testCase} />;
      default:
        return null;
    }
  };

  return (
    <div className="w-[380px] border border-gray-200 bg-white rounded-xl shadow-sm flex flex-col h-full shrink-0">
      {/* Panel header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-700">Test Case Details</h2>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          aria-label="Close panel"
        >
          <X size={16} />
        </button>
      </div>

      {/* Tab navigation */}
      <div className="flex border-b border-gray-200 px-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.mode}
            onClick={() => onModeChange(tab.mode)}
            className={`flex items-center gap-1 px-2.5 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              mode === tab.mode
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">{renderContent()}</div>
    </div>
  );
}
