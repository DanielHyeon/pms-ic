import { useMemo } from 'react';
import {
  BookOpen,
  FileText,
  TestTube,
  Package,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { TraceStatusBadge } from './TraceStatusBadge';
import { TraceCoverageBar } from './TraceCoverageBar';
import type { Requirement } from '../../../types/project';
import type { RequirementTrace, TraceStatusValue } from '../../../types/requirement';

// TODO: Replace with real API - mock trace data generator
function generateMockTrace(requirement: Requirement): RequirementTrace {
  const hasLinks = requirement.linkedTaskIds && requirement.linkedTaskIds.length > 0;

  // Derive trace status from available data
  const traceStatus: TraceStatusValue =
    ((requirement as unknown as Record<string, unknown>).traceStatus as TraceStatusValue) ||
    (hasLinks ? 'linked' : 'unlinked');

  const traceCoverage =
    ((requirement as unknown as Record<string, unknown>).traceCoverage as number) ||
    (hasLinks ? Math.min(100, requirement.linkedTaskIds.length * 25) : 0);

  if (traceStatus === 'unlinked') {
    return {
      requirementId: requirement.id,
      epics: [],
      stories: [],
      testCases: [],
      deliverables: [],
      traceStatus: 'unlinked',
      traceCoverage: 0,
    };
  }

  if (traceStatus === 'breakpoint') {
    return {
      requirementId: requirement.id,
      epics: [
        { id: 'ep-1', title: `Epic for ${requirement.code}`, status: 'IN_PROGRESS', storyCount: 2 },
      ],
      stories: [
        { id: 'st-1', title: `User story - ${requirement.title.slice(0, 30)}`, status: 'TODO', epicId: 'ep-1' },
        { id: 'st-2', title: `API integration for ${requirement.code}`, status: 'IN_PROGRESS', epicId: 'ep-1' },
      ],
      testCases: [],
      deliverables: [],
      traceStatus: 'breakpoint',
      traceCoverage,
      breakpoints: [
        {
          from: 'st-2',
          expectedNext: 'test_case',
          description: 'No test cases linked to story st-2',
        },
      ],
    };
  }

  // linked
  return {
    requirementId: requirement.id,
    epics: [
      { id: 'ep-1', title: `Epic for ${requirement.code}`, status: 'DONE', storyCount: 2 },
    ],
    stories: [
      { id: 'st-1', title: `User story - ${requirement.title.slice(0, 30)}`, status: 'DONE', epicId: 'ep-1' },
      { id: 'st-2', title: `API integration for ${requirement.code}`, status: 'DONE', epicId: 'ep-1' },
    ],
    testCases: [
      { id: 'tc-1', name: `TC: ${requirement.title.slice(0, 25)} - positive`, result: 'pass' },
      { id: 'tc-2', name: `TC: ${requirement.title.slice(0, 25)} - negative`, result: 'pass' },
    ],
    deliverables: [
      { id: 'del-1', name: `Deliverable for ${requirement.code}`, status: 'SUBMITTED' },
    ],
    traceStatus: 'linked',
    traceCoverage,
  };
}

interface TraceQuickPreviewProps {
  requirement: Requirement;
  onViewDetail?: () => void;
}

interface TraceSectionProps {
  icon: typeof BookOpen;
  label: string;
  count: number;
  items: { id: string; title: string; status?: string; result?: string }[];
}

function TraceSection({ icon: Icon, label, count, items }: TraceSectionProps) {
  if (count === 0) {
    return (
      <div className="flex items-center gap-2 text-gray-400 text-sm py-1">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
        <span className="ml-auto text-xs">0</span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-gray-700 text-sm font-medium">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
        <Badge variant="outline" className="ml-auto text-xs px-1.5 py-0">
          {count}
        </Badge>
      </div>
      <div className="ml-6 space-y-1">
        {items.slice(0, 3).map((item) => (
          <div key={item.id} className="flex items-center gap-2 text-xs text-gray-600">
            <span className="truncate flex-1">{item.title}</span>
            {item.status && (
              <span className="text-[10px] text-gray-400 uppercase">{item.status}</span>
            )}
            {item.result && (
              <Badge
                variant="outline"
                className={
                  item.result === 'pass'
                    ? 'bg-green-50 text-green-600 text-[10px] px-1 py-0'
                    : item.result === 'fail'
                      ? 'bg-red-50 text-red-600 text-[10px] px-1 py-0'
                      : 'bg-gray-50 text-gray-500 text-[10px] px-1 py-0'
                }
              >
                {item.result}
              </Badge>
            )}
          </div>
        ))}
        {items.length > 3 && (
          <span className="text-[10px] text-gray-400">+{items.length - 3} more</span>
        )}
      </div>
    </div>
  );
}

export function TraceQuickPreview({ requirement, onViewDetail }: TraceQuickPreviewProps) {
  // TODO: Replace with real API call
  const trace = useMemo(() => generateMockTrace(requirement), [requirement]);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div>
        <p className="text-xs text-gray-400 font-mono">{requirement.code}</p>
        <h3 className="text-sm font-semibold text-gray-900 mt-0.5 line-clamp-2">
          {requirement.title}
        </h3>
      </div>

      {/* Trace Status + Coverage */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Trace Status</span>
          <TraceStatusBadge status={trace.traceStatus} />
        </div>
        <div>
          <span className="text-xs text-gray-500">Coverage</span>
          <TraceCoverageBar coverage={trace.traceCoverage} className="mt-1" />
        </div>
      </div>

      {/* Breakpoints warning */}
      {trace.breakpoints && trace.breakpoints.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 space-y-1">
          <div className="flex items-center gap-1 text-amber-700 text-xs font-medium">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Breakpoints ({trace.breakpoints.length})</span>
          </div>
          {trace.breakpoints.map((bp, i) => (
            <p key={i} className="text-[11px] text-amber-600 ml-5">
              {bp.description}
            </p>
          ))}
        </div>
      )}

      {/* Trace chain sections */}
      <div className="border-t border-gray-100 pt-3 space-y-3">
        <TraceSection
          icon={BookOpen}
          label="Epics"
          count={trace.epics.length}
          items={trace.epics.map((e) => ({ id: e.id, title: e.title, status: e.status }))}
        />
        <TraceSection
          icon={FileText}
          label="Stories"
          count={trace.stories.length}
          items={trace.stories.map((s) => ({ id: s.id, title: s.title, status: s.status }))}
        />
        <TraceSection
          icon={TestTube}
          label="Test Cases"
          count={trace.testCases.length}
          items={trace.testCases.map((tc) => ({ id: tc.id, title: tc.name, result: tc.result }))}
        />
        <TraceSection
          icon={Package}
          label="Deliverables"
          count={trace.deliverables.length}
          items={trace.deliverables.map((d) => ({ id: d.id, title: d.name, status: d.status }))}
        />
      </div>

      {/* View Detail link */}
      {onViewDetail && (
        <button
          type="button"
          onClick={onViewDetail}
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium mt-2 transition-colors"
        >
          View Detail
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
