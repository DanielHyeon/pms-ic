import { useState } from 'react';
import {
  X,
  Eye,
  Calendar,
  Download,
  BarChart3,
  FileText,
  Clock,
  Bell,
  Loader2,
  FileSpreadsheet,
  Presentation,
  Sparkles,
} from 'lucide-react';
import type { ViewModePreset } from '../../../types/menuOntology';
import type { ReportCatalogType } from './ReportCatalogCard';

// -- Types ------------------------------------------------------------------

export type ReportPanelMode = 'none' | 'preview' | 'schedule' | 'export';

export interface ReportRightPanelProps {
  mode: ReportPanelMode;
  selectedReport?: ReportCatalogType | null;
  preset: ViewModePreset;
  onClose: () => void;
  onModeChange: (mode: ReportPanelMode) => void;
}

// -- Sub-panels -------------------------------------------------------------

function PreviewPanel({ report }: { report: ReportCatalogType }) {
  return (
    <div className="space-y-5">
      {/* Report type header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{report.label}</h3>
        <p className="text-sm text-gray-500 mt-1">{report.description}</p>
      </div>

      {/* Last generated */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Clock size={14} />
        <span>마지막 생성: {report.lastGenerated || '없음'}</span>
      </div>

      {/* Chart placeholder */}
      <div className="h-48 bg-gray-100 rounded-lg border border-dashed border-gray-300 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <BarChart3 size={32} className="mx-auto mb-2" />
          <p className="text-sm">차트 미리보기</p>
          <p className="text-xs mt-1">요청 시 생성</p>
        </div>
      </div>

      {/* Filter controls */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">필터</p>
        <div>
          <label className="block text-sm text-gray-600 mb-1">단계</label>
          <select className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">전체 단계</option>
            {/* TODO: Replace with real API - dynamic phase list */}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Sprint</label>
          <select className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">전체 Sprint</option>
            {/* TODO: Replace with real API - dynamic sprint list */}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">기간</label>
          <input
            type="date"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Export format buttons */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">빠른 내보내기</p>
        <div className="flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium border border-gray-300 rounded-lg bg-white hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-colors">
            <FileText size={14} />
            PDF
          </button>
          <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium border border-gray-300 rounded-lg bg-white hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition-colors">
            <FileSpreadsheet size={14} />
            Excel
          </button>
          <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium border border-gray-300 rounded-lg bg-white hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700 transition-colors">
            <Presentation size={14} />
            PPT
          </button>
        </div>
      </div>
    </div>
  );
}

function SchedulePanel({ report }: { report: ReportCatalogType }) {
  const [frequency, setFrequency] = useState('weekly');
  const [dayOfWeek, setDayOfWeek] = useState('1');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [time, setTime] = useState('09:00');
  const [autoPublish, setAutoPublish] = useState(false);
  const [notifyOnComplete, setNotifyOnComplete] = useState(true);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Calendar size={16} className="text-blue-600" />
          예약: {report.label}
        </h3>
      </div>

      {/* Frequency selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">반복 주기</label>
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="daily">매일</option>
          <option value="weekly">매주</option>
          <option value="monthly">매월</option>
        </select>
      </div>

      {/* Day of week selector (for weekly) */}
      {frequency === 'weekly' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">요일</label>
          <select
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'].map(
              (day, i) => (
                <option key={i} value={String(i)}>
                  {day}
                </option>
              )
            )}
          </select>
        </div>
      )}

      {/* Day of month selector (for monthly) */}
      {frequency === 'monthly' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">일자</label>
          <select
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Array.from({ length: 28 }, (_, i) => (
              <option key={i + 1} value={String(i + 1)}>
                {i + 1}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Time picker */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">시간</label>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Toggles */}
      <div className="space-y-3 border-t pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">자동 발행</p>
            <p className="text-xs text-gray-500">생성 시 자동으로 발행</p>
          </div>
          <button
            onClick={() => setAutoPublish(!autoPublish)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              autoPublish ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                autoPublish ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">알림</p>
            <p className="text-xs text-gray-500">완료 시 알림 받기</p>
          </div>
          <button
            onClick={() => setNotifyOnComplete(!notifyOnComplete)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              notifyOnComplete ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                notifyOnComplete ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Save button */}
      <button
        className="w-full px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
        onClick={() => {
          // TODO: Replace with real API - save schedule configuration
          console.log('Save schedule', { frequency, dayOfWeek, dayOfMonth, time, autoPublish, notifyOnComplete });
        }}
      >
        <Bell size={14} />
        예약 저장
      </button>
    </div>
  );
}

function ExportPanel({ report }: { report: ReportCatalogType }) {
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel' | 'pptx'>('pdf');
  const [scope, setScope] = useState<'current_project' | 'all_data'>('current_project');
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');
  const [includeAiSummary, setIncludeAiSummary] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);

    // TODO: Replace with real API - export report
    const steps = [20, 45, 70, 90, 100];
    for (const step of steps) {
      await new Promise((r) => setTimeout(r, 400));
      setExportProgress(step);
    }

    setIsExporting(false);
    setExportProgress(0);
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Download size={16} className="text-green-600" />
          내보내기: {report.label}
        </h3>
      </div>

      {/* Format radio buttons */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">형식</label>
        <div className="space-y-2">
          {[
            { value: 'pdf' as const, label: 'PDF 문서', icon: <FileText size={16} />, color: 'text-red-600' },
            { value: 'excel' as const, label: 'Excel 스프레드시트', icon: <FileSpreadsheet size={16} />, color: 'text-green-600' },
            { value: 'pptx' as const, label: 'PowerPoint 프레젠테이션', icon: <Presentation size={16} />, color: 'text-orange-600' },
          ].map((fmt) => (
            <button
              key={fmt.value}
              onClick={() => setExportFormat(fmt.value)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                exportFormat === fmt.value
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <span className={fmt.color}>{fmt.icon}</span>
              <span className="text-sm font-medium text-gray-700">{fmt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Scope selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">범위</label>
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value as 'current_project' | 'all_data')}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="current_project">현재 프로젝트</option>
          <option value="all_data">전체 데이터</option>
        </select>
      </div>

      {/* Date range */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-sm text-gray-600 mb-1">시작일</label>
          <input
            type="date"
            value={dateRangeStart}
            onChange={(e) => setDateRangeStart(e.target.value)}
            className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">종료일</label>
          <input
            type="date"
            value={dateRangeEnd}
            onChange={(e) => setDateRangeEnd(e.target.value)}
            className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Include AI summary toggle */}
      <div className="flex items-center justify-between border-t pt-4">
        <div>
          <p className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
            <Sparkles size={14} className="text-purple-500" />
            AI 요약 포함
          </p>
          <p className="text-xs text-gray-500">AI 생성 분석 포함</p>
        </div>
        <button
          onClick={() => setIncludeAiSummary(!includeAiSummary)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            includeAiSummary ? 'bg-purple-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
              includeAiSummary ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {/* Generate button with progress */}
      <button
        onClick={handleExport}
        disabled={isExporting}
        className="w-full px-4 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {isExporting ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            내보내는 중... {exportProgress}%
          </>
        ) : (
          <>
            <Download size={14} />
            내보내기 생성
          </>
        )}
      </button>

      {/* Progress bar */}
      {isExporting && (
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-300"
            style={{ width: `${exportProgress}%` }}
          />
        </div>
      )}
    </div>
  );
}

// -- Main panel -------------------------------------------------------------

export function ReportRightPanel({
  mode,
  selectedReport,
  preset: _preset,
  onClose,
  onModeChange,
}: ReportRightPanelProps) {
  if (mode === 'none') return null;

  const tabs: { mode: ReportPanelMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'preview', label: '미리보기', icon: <Eye size={14} /> },
    { mode: 'schedule', label: '예약', icon: <Calendar size={14} /> },
    { mode: 'export', label: '내보내기', icon: <Download size={14} /> },
  ];

  const renderContent = () => {
    if (!selectedReport) {
      return (
        <div className="flex items-center justify-center h-32 text-sm text-gray-400">
          보고서 유형을 선택하면 상세 정보를 볼 수 있습니다
        </div>
      );
    }

    switch (mode) {
      case 'preview':
        return <PreviewPanel report={selectedReport} />;
      case 'schedule':
        return <SchedulePanel report={selectedReport} />;
      case 'export':
        return <ExportPanel report={selectedReport} />;
      default:
        return null;
    }
  };

  return (
    <div className="w-[380px] border-l border-gray-200 bg-white flex flex-col h-full shrink-0">
      {/* Panel header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-700">보고서 상세</h2>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          aria-label="Close panel"
        >
          <X size={16} />
        </button>
      </div>

      {/* Tab navigation */}
      <div className="flex border-b border-gray-200 px-2">
        {tabs.map((tab) => (
          <button
            key={tab.mode}
            onClick={() => onModeChange(tab.mode)}
            className={`flex items-center gap-1 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
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
