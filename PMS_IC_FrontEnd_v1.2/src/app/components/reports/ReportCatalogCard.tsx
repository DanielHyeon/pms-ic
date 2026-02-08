import {
  FileBarChart,
  TrendingUp,
  Zap,
  LineChart,
  Shield,
  Users,
  AlertTriangle,
  CheckSquare,
  GitBranch,
  Calendar,
  Download,
  Play,
} from 'lucide-react';
import { Card, CardContent } from '../ui/card';

// -- Types ------------------------------------------------------------------

export interface ReportCatalogType {
  id: string;
  label: string;
  description: string;
  lastGenerated: string | null;
  quickMetric?: { label: string; value: string };
  capabilities: {
    generate: boolean;
    export: boolean;
    schedule: boolean;
  };
}

interface ReportCatalogCardProps {
  report: ReportCatalogType;
  isSelected: boolean;
  onSelect: (report: ReportCatalogType) => void;
  onGenerate: (report: ReportCatalogType) => void;
  onExport: (report: ReportCatalogType) => void;
  onSchedule: (report: ReportCatalogType) => void;
}

// -- Icon mapping -----------------------------------------------------------

const REPORT_ICONS: Record<string, React.ReactNode> = {
  project_status: <FileBarChart size={20} />,
  sprint_burndown: <TrendingUp size={20} />,
  velocity_trend: <Zap size={20} />,
  evm_spi_cpi: <LineChart size={20} />,
  quality_dashboard: <Shield size={20} />,
  resource_utilization: <Users size={20} />,
  risk_heatmap: <AlertTriangle size={20} />,
  phase_gate_status: <CheckSquare size={20} />,
  requirement_traceability: <GitBranch size={20} />,
};

const REPORT_ICON_COLORS: Record<string, string> = {
  project_status: 'text-blue-600 bg-blue-50',
  sprint_burndown: 'text-indigo-600 bg-indigo-50',
  velocity_trend: 'text-green-600 bg-green-50',
  evm_spi_cpi: 'text-purple-600 bg-purple-50',
  quality_dashboard: 'text-teal-600 bg-teal-50',
  resource_utilization: 'text-orange-600 bg-orange-50',
  risk_heatmap: 'text-red-600 bg-red-50',
  phase_gate_status: 'text-amber-600 bg-amber-50',
  requirement_traceability: 'text-cyan-600 bg-cyan-50',
};

// -- Component --------------------------------------------------------------

export function ReportCatalogCard({
  report,
  isSelected,
  onSelect,
  onGenerate,
  onExport,
  onSchedule,
}: ReportCatalogCardProps) {
  const icon = REPORT_ICONS[report.id] || <FileBarChart size={20} />;
  const iconColor = REPORT_ICON_COLORS[report.id] || 'text-gray-600 bg-gray-50';

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected
          ? 'border-2 border-indigo-500 shadow-md ring-1 ring-indigo-200'
          : 'border border-gray-200 hover:border-gray-300'
      }`}
      onClick={() => onSelect(report)}
    >
      <CardContent className="p-4">
        {/* Header: icon + name */}
        <div className="flex items-start gap-3 mb-3">
          <div className={`p-2 rounded-lg shrink-0 ${iconColor}`}>
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-gray-900 truncate">
              {report.label}
            </h4>
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
              {report.description}
            </p>
          </div>
        </div>

        {/* Last generated */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
          <Calendar size={11} />
          <span>{report.lastGenerated || 'Not generated yet'}</span>
        </div>

        {/* Quick metric */}
        {report.quickMetric && (
          <div className="bg-gray-50 rounded-md px-3 py-2 mb-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{report.quickMetric.label}</span>
              <span className="text-sm font-semibold text-gray-700">{report.quickMetric.value}</span>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-1.5">
          {report.capabilities.generate && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onGenerate(report);
              }}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
              title="Generate"
            >
              <Play size={11} />
              Generate
            </button>
          )}
          {report.capabilities.export && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExport(report);
              }}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors"
              title="Export"
            >
              <Download size={11} />
              Export
            </button>
          )}
          {report.capabilities.schedule && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSchedule(report);
              }}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 rounded-md hover:bg-amber-100 transition-colors"
              title="Schedule"
            >
              <Calendar size={11} />
              Schedule
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// -- Report catalog data (mock) ---------------------------------------------

// TODO: Replace with real API - fetch report catalog from backend
export const REPORT_CATALOG: ReportCatalogType[] = [
  {
    id: 'project_status',
    label: 'Project Status Report',
    description: 'Overall project health including scope, schedule, budget, and risk summary.',
    lastGenerated: '2026-01-28',
    quickMetric: { label: 'Health', value: 'Good' },
    capabilities: { generate: true, export: true, schedule: true },
  },
  {
    id: 'sprint_burndown',
    label: 'Sprint Burndown',
    description: 'Remaining work vs. ideal trend for the active sprint.',
    lastGenerated: '2026-01-27',
    quickMetric: { label: 'Remaining', value: '12 SP' },
    capabilities: { generate: true, export: true, schedule: true },
  },
  {
    id: 'velocity_trend',
    label: 'Velocity Trend',
    description: 'Story points completed per sprint over the last N sprints.',
    lastGenerated: '2026-01-24',
    quickMetric: { label: 'Trend', value: 'Improving' },
    capabilities: { generate: true, export: true, schedule: true },
  },
  {
    id: 'evm_spi_cpi',
    label: 'EVM (SPI/CPI) Report',
    description: 'Earned value analysis with Schedule and Cost Performance Indices.',
    lastGenerated: '2026-01-20',
    quickMetric: { label: 'SPI/CPI', value: '0.92 / 0.87' },
    capabilities: { generate: true, export: true, schedule: true },
  },
  {
    id: 'quality_dashboard',
    label: 'Quality Dashboard',
    description: 'Defect density, test coverage, and code quality metrics.',
    lastGenerated: null,
    quickMetric: { label: 'Defect Density', value: '2.1/KLOC' },
    capabilities: { generate: true, export: true, schedule: false },
  },
  {
    id: 'resource_utilization',
    label: 'Resource Utilization',
    description: 'Team allocation, workload distribution, and utilization rates.',
    lastGenerated: '2026-01-25',
    quickMetric: { label: 'Utilization', value: '78%' },
    capabilities: { generate: true, export: true, schedule: true },
  },
  {
    id: 'risk_heatmap',
    label: 'Risk Heatmap',
    description: 'Risk matrix showing probability vs impact for active risks.',
    lastGenerated: null,
    quickMetric: { label: 'Active Risks', value: '7' },
    capabilities: { generate: true, export: true, schedule: false },
  },
  {
    id: 'phase_gate_status',
    label: 'Phase Gate Status',
    description: 'Phase completion criteria and gate review readiness.',
    lastGenerated: '2026-01-22',
    quickMetric: { label: 'Status', value: 'On Track' },
    capabilities: { generate: true, export: true, schedule: true },
  },
  {
    id: 'requirement_traceability',
    label: 'Requirement Traceability Matrix',
    description: 'Requirements to design, implementation, and test case mapping.',
    lastGenerated: null,
    quickMetric: { label: 'Coverage', value: '85%' },
    capabilities: { generate: true, export: true, schedule: false },
  },
];
