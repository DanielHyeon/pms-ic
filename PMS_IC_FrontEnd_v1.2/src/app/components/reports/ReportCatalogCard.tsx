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
          <span>{report.lastGenerated || '아직 생성되지 않음'}</span>
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
              생성
            </button>
          )}
          {report.capabilities.export && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExport(report);
              }}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors"
              title="내보내기"
            >
              <Download size={11} />
              내보내기
            </button>
          )}
          {report.capabilities.schedule && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSchedule(report);
              }}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 rounded-md hover:bg-amber-100 transition-colors"
              title="예약"
            >
              <Calendar size={11} />
              예약
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
    label: '프로젝트 현황 보고서',
    description: '범위, 일정, 예산, 리스크 요약을 포함한 전체 프로젝트 상태',
    lastGenerated: '2026-01-28',
    quickMetric: { label: '상태', value: '양호' },
    capabilities: { generate: true, export: true, schedule: true },
  },
  {
    id: 'sprint_burndown',
    label: 'Sprint Burndown',
    description: '활성 Sprint의 잔여 작업량 대비 이상적 추세',
    lastGenerated: '2026-01-27',
    quickMetric: { label: '잔여', value: '12 SP' },
    capabilities: { generate: true, export: true, schedule: true },
  },
  {
    id: 'velocity_trend',
    label: 'Velocity Trend',
    description: '최근 N개 Sprint의 Sprint당 완료 스토리 포인트',
    lastGenerated: '2026-01-24',
    quickMetric: { label: '추세', value: '개선 중' },
    capabilities: { generate: true, export: true, schedule: true },
  },
  {
    id: 'evm_spi_cpi',
    label: 'EVM (SPI/CPI) 보고서',
    description: '일정 및 원가 성과 지수를 포함한 획득가치 분석',
    lastGenerated: '2026-01-20',
    quickMetric: { label: 'SPI/CPI', value: '0.92 / 0.87' },
    capabilities: { generate: true, export: true, schedule: true },
  },
  {
    id: 'quality_dashboard',
    label: '품질 대시보드',
    description: '결함 밀도, 테스트 커버리지 및 코드 품질 지표',
    lastGenerated: null,
    quickMetric: { label: '결함 밀도', value: '2.1/KLOC' },
    capabilities: { generate: true, export: true, schedule: false },
  },
  {
    id: 'resource_utilization',
    label: '리소스 활용도',
    description: '팀 배정, 업무량 분배 및 활용률',
    lastGenerated: '2026-01-25',
    quickMetric: { label: '활용률', value: '78%' },
    capabilities: { generate: true, export: true, schedule: true },
  },
  {
    id: 'risk_heatmap',
    label: '리스크 히트맵',
    description: '활성 리스크의 발생 확률 대비 영향도 매트릭스',
    lastGenerated: null,
    quickMetric: { label: '활성 리스크', value: '7' },
    capabilities: { generate: true, export: true, schedule: false },
  },
  {
    id: 'phase_gate_status',
    label: '단계 게이트 현황',
    description: '단계 완료 기준 및 게이트 리뷰 준비 현황',
    lastGenerated: '2026-01-22',
    quickMetric: { label: '상태', value: '정상' },
    capabilities: { generate: true, export: true, schedule: true },
  },
  {
    id: 'requirement_traceability',
    label: '요구사항 추적 매트릭스',
    description: '요구사항-설계-구현-테스트 케이스 매핑',
    lastGenerated: null,
    quickMetric: { label: '커버리지', value: '85%' },
    capabilities: { generate: true, export: true, schedule: false },
  },
];
