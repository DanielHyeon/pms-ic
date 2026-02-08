import { useState, useMemo, useEffect } from 'react';
import {
  FileBarChart,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Trash2,
  RefreshCw,
  Loader2,
  Plus,
  Sparkles,
  Calendar,
  Download,
  Settings,
  Send,
  Database,
  Play,
  ChevronRight,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { useProject } from '../../contexts/ProjectContext';
import { UserRole } from '../../stores/authStore';
import { useReports, useCreateReport, usePublishReport, useDeleteReport, useReportGeneration } from '../../hooks/api/useReports';
import type { ReportApiDto } from '../../services/api';
import { usePreset } from '../../hooks/usePreset';
import { useFilterSpec } from '../../hooks/useFilterSpec';
import { PresetSwitcher } from './common/PresetSwitcher';
import {
  ReportKpiRow,
  ReportFilters,
  REPORT_FILTER_KEYS,
  ReportRightPanel,
  ReportCatalogCard,
  REPORT_CATALOG,
} from './reports';
import type { ReportPanelMode, ReportCatalogType } from './reports';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from './ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from './ui/tabs';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';

interface ReportManagementProps {
  userRole: UserRole;
}

// Role-based scope options
const scopesByRole: Record<string, string[]> = {
  sponsor: ['PROJECT', 'PHASE', 'TEAM', 'INDIVIDUAL'],
  pmo_head: ['PROJECT', 'PHASE', 'TEAM', 'INDIVIDUAL'],
  pm: ['PROJECT', 'PHASE', 'TEAM', 'INDIVIDUAL'],
  team_lead: ['TEAM', 'INDIVIDUAL'],
  developer: ['INDIVIDUAL'],
  qa: ['INDIVIDUAL'],
  business_analyst: ['PROJECT', 'PHASE', 'TEAM', 'INDIVIDUAL'],
  admin: ['PROJECT', 'PHASE', 'TEAM', 'INDIVIDUAL'],
};

const reportTypeLabels: Record<string, string> = {
  WEEKLY: '주간 보고서',
  MONTHLY: '월간 보고서',
  QUARTERLY: '분기 보고서',
  PROJECT: '프로젝트 보고서',
};

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  DRAFT: { label: '초안', color: 'bg-gray-100 text-gray-700', icon: FileText },
  PUBLISHED: { label: '발행됨', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  ARCHIVED: { label: '보관됨', color: 'bg-blue-100 text-blue-700', icon: Clock },
};

const scopeLabels: Record<string, string> = {
  PROJECT: '프로젝트',
  PHASE: '단계',
  TEAM: '팀',
  INDIVIDUAL: '개인',
};

// ── Mock fallback data ──────────────────────────────────

const MOCK_REPORTS: ReportApiDto[] = [
  { id: 'rpt-001', projectId: '', title: 'Sprint 4 주간 보고서', reportType: 'WEEKLY', reportScope: 'PROJECT', status: 'PUBLISHED', periodStart: '2026-01-27', periodEnd: '2026-02-02', createdAt: '2026-02-03T09:00:00Z', updatedAt: '2026-02-03T14:00:00Z', publishedAt: '2026-02-03T14:00:00Z', generationMode: 'AI_GENERATED', llmGeneratedSections: ['summary', 'progress', 'risks'] },
  { id: 'rpt-002', projectId: '', title: 'Sprint 5 주간 보고서', reportType: 'WEEKLY', reportScope: 'PROJECT', status: 'DRAFT', periodStart: '2026-02-03', periodEnd: '2026-02-09', createdAt: '2026-02-08T10:00:00Z', updatedAt: '2026-02-08T10:00:00Z', generationMode: 'AI_GENERATED', llmGeneratedSections: ['summary', 'progress'] },
  { id: 'rpt-003', projectId: '', title: '1월 월간 보고서', reportType: 'MONTHLY', reportScope: 'PROJECT', status: 'PUBLISHED', periodStart: '2026-01-01', periodEnd: '2026-01-31', createdAt: '2026-02-01T11:00:00Z', updatedAt: '2026-02-02T09:00:00Z', publishedAt: '2026-02-02T09:00:00Z', generationMode: 'MANUAL' },
  { id: 'rpt-004', projectId: '', title: 'QA 팀 주간 보고서', reportType: 'WEEKLY', reportScope: 'TEAM', status: 'DRAFT', periodStart: '2026-02-03', periodEnd: '2026-02-09', createdAt: '2026-02-07T16:00:00Z', updatedAt: '2026-02-07T16:00:00Z', generationMode: 'AI_GENERATED', llmGeneratedSections: ['summary', 'quality'] },
  { id: 'rpt-005', projectId: '', title: '2025 Q4 분기 보고서', reportType: 'QUARTERLY', reportScope: 'PROJECT', status: 'ARCHIVED', periodStart: '2025-10-01', periodEnd: '2025-12-31', createdAt: '2026-01-05T09:00:00Z', updatedAt: '2026-01-06T10:00:00Z', publishedAt: '2026-01-06T10:00:00Z', generationMode: 'MANUAL' },
];

export default function ReportManagement({ userRole }: ReportManagementProps) {
  const { currentProject } = useProject();

  // Preset and filter hooks
  const { currentPreset, switchPreset } = usePreset(userRole.toUpperCase());
  const { filters: specFilters, setFilters: setSpecFilters } = useFilterSpec({
    keys: REPORT_FILTER_KEYS,
    syncUrl: false,
  });

  // Real API hooks (fallback to mock data when API returns empty)
  const { data: apiReports = [], isLoading: isLoadingReports } = useReports(currentProject?.id);
  const reports = apiReports.length > 0 ? apiReports : MOCK_REPORTS;
  const createReportMutation = useCreateReport();
  const publishReportMutation = usePublishReport();
  const deleteReportMutation = useDeleteReport();
  const reportGeneration = useReportGeneration(currentProject?.id);

  const [activeTab, setActiveTab] = useState('reports');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Report catalog selection and right panel
  const [selectedReportType, setSelectedReportType] = useState<ReportCatalogType | null>(null);
  const [panelMode, setPanelMode] = useState<ReportPanelMode>('none');

  // Generate report dialog
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    reportType: 'WEEKLY' as string,
    scope: 'INDIVIDUAL' as string,
    periodStart: '',
    periodEnd: '',
    useAiSummary: true,
    sections: ['my_summary', 'completed_tasks', 'in_progress', 'next_week_plan'],
  });

  // Text-to-SQL state
  const [sqlQuery, setSqlQuery] = useState('');
  const [sqlResult, setSqlResult] = useState<any>(null);
  const [sqlExplanation, setSqlExplanation] = useState('');
  const [isQueryRunning, setIsQueryRunning] = useState(false);

  // Settings state
  const [settingsForm, setSettingsForm] = useState({
    weeklyEnabled: false,
    weeklyDay: '1',
    weeklyTime: '09:00',
    monthlyEnabled: false,
    monthlyDay: '1',
    monthlyTime: '09:00',
    notifyOnComplete: true,
    autoPublish: false,
  });

  // Auto-close dialog when generation completes
  useEffect(() => {
    if (reportGeneration.phase === 'COMPLETED' && !reportGeneration.isGenerating) {
      const timer = setTimeout(() => {
        setIsGenerateDialogOpen(false);
        reportGeneration.reset();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [reportGeneration.phase, reportGeneration.isGenerating]);

  // Get available scopes for current user
  const availableScopes = scopesByRole[userRole] || ['INDIVIDUAL'];

  // Filter reports (existing report list)
  const filteredReports = reports.filter((report) => {
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'ALL' || report.reportType === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || report.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Filter catalog cards based on FilterSpec
  const filteredCatalog = useMemo(() => {
    let result = [...REPORT_CATALOG];

    const q = (specFilters.q as string)?.toLowerCase();
    if (q) {
      result = result.filter(
        (r) =>
          r.label.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q)
      );
    }

    const reportType = specFilters.reportType as string;
    if (reportType) {
      result = result.filter((r) => r.id === reportType);
    }

    return result;
  }, [specFilters]);

  // Handle report generation
  const handleGenerateReport = async () => {
    if (!currentProject?.id) return;

    if (generateForm.useAiSummary) {
      // Use SSE streaming for AI-generated reports
      reportGeneration.generate({
        reportType: generateForm.reportType,
        periodStart: generateForm.periodStart,
        periodEnd: generateForm.periodEnd,
        scope: generateForm.scope,
        useAiSummary: true,
        customTitle: `${reportTypeLabels[generateForm.reportType] || generateForm.reportType} (${generateForm.periodStart} ~ ${generateForm.periodEnd})`,
        sections: generateForm.sections,
      });
      // Don't close dialog - show progress instead
      return;
    }

    // Non-AI: use existing create mutation
    try {
      await createReportMutation.mutateAsync({
        projectId: currentProject.id,
        data: {
          reportType: generateForm.reportType,
          reportScope: generateForm.scope,
          title: `${reportTypeLabels[generateForm.reportType] || generateForm.reportType} (${generateForm.periodStart} ~ ${generateForm.periodEnd})`,
          periodStart: generateForm.periodStart,
          periodEnd: generateForm.periodEnd,
          generationMode: 'MANUAL',
        },
      });
      setIsGenerateDialogOpen(false);
    } catch (error) {
      console.error('Failed to generate report:', error);
    }
  };

  // Handle Text-to-SQL query
  const handleRunQuery = async () => {
    if (!sqlQuery.trim()) return;

    setIsQueryRunning(true);
    setSqlResult(null);
    setSqlExplanation('');

    try {
      // TODO: Call actual API
      await new Promise((r) => setTimeout(r, 1500));

      // Mock response
      setSqlExplanation('이 쿼리는 현재 프로젝트의 완료된 태스크 수를 상태별로 조회합니다.');
      setSqlResult({
        columns: ['status', 'count'],
        rows: [
          { status: 'DONE', count: 24 },
          { status: 'IN_PROGRESS', count: 12 },
          { status: 'TODO', count: 8 },
        ],
      });
    } catch (error) {
      console.error('Query failed:', error);
    } finally {
      setIsQueryRunning(false);
    }
  };

  // Catalog card action handlers
  const handleSelectCatalogCard = (report: ReportCatalogType) => {
    if (selectedReportType?.id === report.id) {
      setSelectedReportType(null);
      setPanelMode('none');
    } else {
      setSelectedReportType(report);
      setPanelMode('preview');
    }
  };

  const handleCatalogGenerate = (_report: ReportCatalogType) => {
    setIsGenerateDialogOpen(true);
  };

  const handleCatalogExport = (report: ReportCatalogType) => {
    setSelectedReportType(report);
    setPanelMode('export');
  };

  const handleCatalogSchedule = (report: ReportCatalogType) => {
    setSelectedReportType(report);
    setPanelMode('schedule');
  };

  // Can user access certain features
  const canGenerateReports = ['sponsor', 'pmo_head', 'pm', 'team_lead', 'developer', 'qa', 'business_analyst', 'admin'].includes(userRole);
  const canUseTextToSql = ['sponsor', 'pmo_head', 'pm', 'admin'].includes(userRole);
  const canConfigureSchedule = ['pmo_head', 'pm', 'admin'].includes(userRole);

  if (!currentProject) {
    return (
      <div className="p-6 text-center text-gray-500">
        <FileBarChart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>프로젝트를 먼저 선택해주세요.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Main content area */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">프로젝트 리포트</h1>
            <p className="text-gray-500 mt-1">
              AI 기반 보고서 생성 및 프로젝트 데이터 분석
            </p>
          </div>
          <div className="flex items-center gap-4">
            <PresetSwitcher
              currentPreset={currentPreset}
              onSwitch={switchPreset}
              compact
            />
            {canGenerateReports && (
              <Button onClick={() => setIsGenerateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                보고서 생성
              </Button>
            )}
          </div>
        </div>

        {/* KPI Row */}
        <ReportKpiRow preset={currentPreset} reportCount={reports.length} />

        {/* FilterSpec Bar */}
        <ReportFilters
          values={specFilters}
          onChange={setSpecFilters}
          preset={currentPreset}
        />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="reports">
              <FileBarChart className="h-4 w-4 mr-2" />
              보고서 목록
            </TabsTrigger>
            {canUseTextToSql && (
              <TabsTrigger value="query">
                <Database className="h-4 w-4 mr-2" />
                데이터 조회
              </TabsTrigger>
            )}
            {canConfigureSchedule && (
              <TabsTrigger value="settings">
                <Settings className="h-4 w-4 mr-2" />
                자동 생성 설정
              </TabsTrigger>
            )}
          </TabsList>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            {/* Report Catalog Grid (9 report types) */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Report Catalog</h2>
              {filteredCatalog.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <FileBarChart className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500">No report types match the current filters.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {filteredCatalog.map((catalogItem) => (
                    <ReportCatalogCard
                      key={catalogItem.id}
                      report={catalogItem}
                      isSelected={selectedReportType?.id === catalogItem.id}
                      onSelect={handleSelectCatalogCard}
                      onGenerate={handleCatalogGenerate}
                      onExport={handleCatalogExport}
                      onSchedule={handleCatalogSchedule}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Existing inline filters for legacy report list */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="보고서 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v)}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="보고서 유형" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">전체 유형</SelectItem>
                      {Object.entries(reportTypeLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="상태" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">전체</SelectItem>
                      {Object.entries(statusConfig).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" disabled={isLoadingReports}>
                    <RefreshCw className={`h-4 w-4 ${isLoadingReports ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Report List */}
            {filteredReports.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileBarChart className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">
                    {searchTerm ? '검색 결과가 없습니다.' : '생성된 보고서가 없습니다.'}
                  </p>
                  {canGenerateReports && (
                    <Button className="mt-4" onClick={() => setIsGenerateDialogOpen(true)}>
                      첫 보고서 생성하기
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredReports.map((report) => {
                  const statusCfg = statusConfig[report.status] || statusConfig.DRAFT;
                  const StatusIcon = statusCfg.icon;
                  const isLlmGenerated = report.generationMode === 'AI_GENERATED'
                    || (report.llmGeneratedSections && report.llmGeneratedSections.length > 0);

                  return (
                    <Card key={report.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-blue-50 rounded-lg">
                              <FileBarChart className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{report.title}</span>
                                {isLlmGenerated && (
                                  <span title="AI 생성">
                                    <Sparkles className="h-4 w-4 text-purple-500" />
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                                <span>{reportTypeLabels[report.reportType] || report.reportType}</span>
                                <ChevronRight className="h-3 w-3" />
                                <span>{scopeLabels[report.reportScope] || report.reportScope}</span>
                                <ChevronRight className="h-3 w-3" />
                                <span>{new Date(report.createdAt).toLocaleDateString('ko-KR')}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className={statusCfg.color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusCfg.label}
                            </Badge>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              보기
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Eye className="h-4 w-4 mr-2" />
                                  상세 보기
                                </DropdownMenuItem>
                                {report.status === 'DRAFT' && currentProject?.id && (
                                  <DropdownMenuItem
                                    onClick={() => publishReportMutation.mutate({
                                      projectId: currentProject.id,
                                      reportId: report.id,
                                    })}
                                    disabled={publishReportMutation.isPending}
                                  >
                                    <Send className="h-4 w-4 mr-2" />
                                    발행하기
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem>
                                  <Download className="h-4 w-4 mr-2" />
                                  다운로드
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => {
                                    if (currentProject?.id) {
                                      deleteReportMutation.mutate({
                                        projectId: currentProject.id,
                                        reportId: report.id,
                                      });
                                    }
                                  }}
                                  disabled={deleteReportMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  삭제
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Text-to-SQL Tab */}
          {canUseTextToSql && (
            <TabsContent value="query" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    자연어 데이터 조회
                  </CardTitle>
                  <CardDescription>
                    자연어로 질문하면 AI가 SQL로 변환하여 프로젝트 데이터를 조회합니다.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="query">질문 입력</Label>
                    <Textarea
                      id="query"
                      placeholder="예: 이번 주에 완료된 태스크는 몇 개인가요?"
                      value={sqlQuery}
                      onChange={(e) => setSqlQuery(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <Button onClick={handleRunQuery} disabled={isQueryRunning || !sqlQuery.trim()}>
                    {isQueryRunning ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        조회 중...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        조회하기
                      </>
                    )}
                  </Button>

                  {sqlExplanation && (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <strong>AI 설명:</strong> {sqlExplanation}
                      </p>
                    </div>
                  )}

                  {sqlResult && (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-50">
                            {sqlResult.columns.map((col: string) => (
                              <th key={col} className="border p-2 text-left font-medium">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {sqlResult.rows.map((row: any, i: number) => (
                            <tr key={i} className="hover:bg-gray-50">
                              {sqlResult.columns.map((col: string) => (
                                <td key={col} className="border p-2">
                                  {row[col]}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>예시 질문</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      '이번 주에 완료된 태스크는 몇 개인가요?',
                      '진행 중인 태스크를 담당자별로 보여주세요',
                      '스토리 포인트 합계는 얼마인가요?',
                      '지연된 태스크 목록을 보여주세요',
                    ].map((q) => (
                      <Button
                        key={q}
                        variant="outline"
                        className="justify-start text-left h-auto py-2"
                        onClick={() => setSqlQuery(q)}
                      >
                        {q}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Settings Tab */}
          {canConfigureSchedule && (
            <TabsContent value="settings" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>자동 보고서 생성 설정</CardTitle>
                  <CardDescription>
                    정해진 시간에 자동으로 보고서를 생성합니다.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Weekly */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium">주간 보고서</p>
                        <p className="text-sm text-gray-500">
                          매주 {['일', '월', '화', '수', '목', '금', '토'][parseInt(settingsForm.weeklyDay)]}요일{' '}
                          {settingsForm.weeklyTime}에 자동 생성
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Select
                        value={settingsForm.weeklyDay}
                        onValueChange={(v) => setSettingsForm({ ...settingsForm, weeklyDay: v })}
                        disabled={!settingsForm.weeklyEnabled}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
                            <SelectItem key={i} value={String(i)}>{day}요일</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="time"
                        value={settingsForm.weeklyTime}
                        onChange={(e) => setSettingsForm({ ...settingsForm, weeklyTime: e.target.value })}
                        className="w-28"
                        disabled={!settingsForm.weeklyEnabled}
                      />
                      <Switch
                        checked={settingsForm.weeklyEnabled}
                        onCheckedChange={(v) => setSettingsForm({ ...settingsForm, weeklyEnabled: v })}
                      />
                    </div>
                  </div>

                  {/* Monthly */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Calendar className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">월간 보고서</p>
                        <p className="text-sm text-gray-500">
                          매월 {settingsForm.monthlyDay}일 {settingsForm.monthlyTime}에 자동 생성
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Select
                        value={settingsForm.monthlyDay}
                        onValueChange={(v) => setSettingsForm({ ...settingsForm, monthlyDay: v })}
                        disabled={!settingsForm.monthlyEnabled}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 28 }, (_, i) => (
                            <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}일</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="time"
                        value={settingsForm.monthlyTime}
                        onChange={(e) => setSettingsForm({ ...settingsForm, monthlyTime: e.target.value })}
                        className="w-28"
                        disabled={!settingsForm.monthlyEnabled}
                      />
                      <Switch
                        checked={settingsForm.monthlyEnabled}
                        onCheckedChange={(v) => setSettingsForm({ ...settingsForm, monthlyEnabled: v })}
                      />
                    </div>
                  </div>

                  {/* Options */}
                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">완료 알림</p>
                        <p className="text-sm text-gray-500">보고서 생성 완료 시 알림 받기</p>
                      </div>
                      <Switch
                        checked={settingsForm.notifyOnComplete}
                        onCheckedChange={(v) => setSettingsForm({ ...settingsForm, notifyOnComplete: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">자동 발행</p>
                        <p className="text-sm text-gray-500">생성된 보고서를 자동으로 발행</p>
                      </div>
                      <Switch
                        checked={settingsForm.autoPublish}
                        onCheckedChange={(v) => setSettingsForm({ ...settingsForm, autoPublish: v })}
                      />
                    </div>
                  </div>

                  <Button className="w-full">설정 저장</Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* Generate Report Dialog */}
        <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                새 보고서 생성
              </DialogTitle>
              <DialogDescription>
                보고서 유형과 기간을 선택하세요. AI가 프로젝트 데이터를 분석하여 보고서를 생성합니다.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>보고서 유형</Label>
                <Select
                  value={generateForm.reportType}
                  onValueChange={(v) => setGenerateForm({ ...generateForm, reportType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(reportTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>보고 범위</Label>
                <Select
                  value={generateForm.scope}
                  onValueChange={(v) => setGenerateForm({ ...generateForm, scope: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableScopes.map((scope) => (
                      <SelectItem key={scope} value={scope}>{scopeLabels[scope]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>시작일</Label>
                  <Input
                    type="date"
                    value={generateForm.periodStart}
                    onChange={(e) => setGenerateForm({ ...generateForm, periodStart: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>종료일</Label>
                  <Input
                    type="date"
                    value={generateForm.periodEnd}
                    onChange={(e) => setGenerateForm({ ...generateForm, periodEnd: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">AI 요약 사용</p>
                  <p className="text-sm text-gray-500">AI가 데이터를 분석하여 요약 생성</p>
                </div>
                <Switch
                  checked={generateForm.useAiSummary}
                  onCheckedChange={(v) => setGenerateForm({ ...generateForm, useAiSummary: v })}
                />
              </div>
            </div>

            {reportGeneration.isGenerating && (
              <div className="space-y-2 py-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{reportGeneration.message}</span>
                  <span className="text-blue-600 font-medium">{reportGeneration.percentage}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${reportGeneration.percentage}%` }}
                  />
                </div>
              </div>
            )}

            {reportGeneration.error && !reportGeneration.isGenerating && (
              <div className="py-2 px-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                {reportGeneration.error}
              </div>
            )}

            <DialogFooter>
              {reportGeneration.isGenerating ? (
                <Button variant="outline" onClick={() => reportGeneration.cancel()}>
                  취소
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setIsGenerateDialogOpen(false)}>
                  취소
                </Button>
              )}
              <Button
                onClick={handleGenerateReport}
                disabled={createReportMutation.isPending || reportGeneration.isGenerating || !generateForm.periodStart || !generateForm.periodEnd}
              >
                {createReportMutation.isPending || reportGeneration.isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    보고서 생성
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Right panel */}
      {panelMode !== 'none' && (
        <ReportRightPanel
          mode={panelMode}
          selectedReport={selectedReportType}
          preset={currentPreset}
          onClose={() => setPanelMode('none')}
          onModeChange={setPanelMode}
        />
      )}
    </div>
  );
}
