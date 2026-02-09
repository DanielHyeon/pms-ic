import { useMemo } from 'react';
import { Card, CardContent } from '../ui/card';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  BarChart3,
  Calendar,
  FileText,
  Clock,
  Download,
  Users,
  Bug,
  Target,
} from 'lucide-react';
import type { ViewModePreset } from '../../../types/menuOntology';

// -- Types ------------------------------------------------------------------

export interface ReportKpiRowProps {
  preset: ViewModePreset;
  reportCount?: number;
}

interface KpiCardDef {
  key: string;
  label: string;
  icon: React.ReactNode;
  value: string | number;
  color: string;
}

// -- KPI computation --------------------------------------------------------

function buildKpiCards(reportCount?: number): Record<string, KpiCardDef> {
  return {
    spiIndex: {
      key: 'spiIndex',
      label: 'SPI Index',
      icon: <TrendingUp size={18} />,
      value: 'N/A',
      color: 'text-blue-600',
    },
    cpiIndex: {
      key: 'cpiIndex',
      label: 'CPI Index',
      icon: <TrendingDown size={18} />,
      value: 'N/A',
      color: 'text-green-600',
    },
    riskExposure: {
      key: 'riskExposure',
      label: '리스크 노출도',
      icon: <AlertTriangle size={18} />,
      value: 'N/A',
      color: 'text-amber-600',
    },
    defectDensity: {
      key: 'defectDensity',
      label: '결함 밀도',
      icon: <Bug size={18} />,
      value: 'N/A',
      color: 'text-red-600',
    },
    resourceUtilization: {
      key: 'resourceUtilization',
      label: '리소스 활용도',
      icon: <Users size={18} />,
      value: 'N/A',
      color: 'text-purple-600',
    },
    totalReportTypes: {
      key: 'totalReportTypes',
      label: '전체 보고서 유형',
      icon: <FileText size={18} />,
      value: 9,
      color: 'text-indigo-600',
    },
    scheduledReports: {
      key: 'scheduledReports',
      label: '예약된 보고서',
      icon: <Calendar size={18} />,
      value: 0,
      color: 'text-teal-600',
    },
    recentGenerated: {
      key: 'recentGenerated',
      label: '최근 생성',
      icon: <Clock size={18} />,
      value: reportCount ?? 0,
      color: 'text-orange-600',
    },
    exportPending: {
      key: 'exportPending',
      label: '내보내기 대기',
      icon: <Download size={18} />,
      value: 0,
      color: 'text-gray-600',
    },
    velocityTrend: {
      key: 'velocityTrend',
      label: 'Velocity Trend',
      icon: <BarChart3 size={18} />,
      value: 'N/A',
      color: 'text-green-600',
    },
    burndownDeviation: {
      key: 'burndownDeviation',
      label: 'Burndown 편차',
      icon: <TrendingUp size={18} />,
      value: 'N/A',
      color: 'text-red-600',
    },
    totalReports: {
      key: 'totalReports',
      label: '전체 보고서',
      icon: <FileText size={18} />,
      value: reportCount ?? 0,
      color: 'text-blue-600',
    },
    phaseGateStatus: {
      key: 'phaseGateStatus',
      label: '단계 게이트 현황',
      icon: <Target size={18} />,
      value: 'N/A',
      color: 'text-green-600',
    },
  };
}

// -- Preset-to-KPI mapping --------------------------------------------------

const PRESET_KPI_KEYS: Record<ViewModePreset, string[]> = {
  EXEC_SUMMARY: ['spiIndex', 'cpiIndex', 'riskExposure'],
  PMO_CONTROL: ['spiIndex', 'cpiIndex', 'defectDensity', 'resourceUtilization'],
  PM_WORK: ['totalReportTypes', 'scheduledReports', 'recentGenerated', 'exportPending'],
  DEV_EXECUTION: ['velocityTrend', 'burndownDeviation'],
  CUSTOMER_APPROVAL: ['totalReports', 'phaseGateStatus'],
  AUDIT_EVIDENCE: ['spiIndex', 'cpiIndex'],
};

// -- Component --------------------------------------------------------------

export function ReportKpiRow({ preset, reportCount }: ReportKpiRowProps) {
  const allCards = useMemo(() => buildKpiCards(reportCount), [reportCount]);

  const visibleCards = useMemo(() => {
    const keys = PRESET_KPI_KEYS[preset] || PRESET_KPI_KEYS.PM_WORK;
    return keys.map((k) => allCards[k]).filter(Boolean);
  }, [preset, allCards]);

  if (visibleCards.length === 0) return null;

  return (
    <div
      className="grid gap-4"
      style={{
        gridTemplateColumns: `repeat(${Math.min(visibleCards.length, 4)}, minmax(0, 1fr))`,
      }}
    >
      {visibleCards.map((card) => (
        <Card key={card.key} className="border border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className={card.color}>{card.icon}</span>
              <p className="text-sm text-gray-500">{card.label}</p>
            </div>
            <p className={`text-2xl font-semibold mt-1 ${card.color}`}>
              {card.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
