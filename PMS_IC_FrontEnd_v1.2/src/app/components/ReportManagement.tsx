import { useState } from 'react';
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

type ReportType = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'PROJECT';
type ReportStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
type ReportScope = 'PROJECT' | 'PHASE' | 'TEAM' | 'INDIVIDUAL';

interface Report {
  id: string;
  title: string;
  reportType: ReportType;
  reportScope: ReportScope;
  status: ReportStatus;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  publishedAt?: string;
  llmGenerated: boolean;
}

// Role-based scope options
const scopesByRole: Record<string, ReportScope[]> = {
  sponsor: ['PROJECT', 'PHASE', 'TEAM', 'INDIVIDUAL'],
  pmo_head: ['PROJECT', 'PHASE', 'TEAM', 'INDIVIDUAL'],
  pm: ['PROJECT', 'PHASE', 'TEAM', 'INDIVIDUAL'],
  team_lead: ['TEAM', 'INDIVIDUAL'],
  developer: ['INDIVIDUAL'],
  qa: ['INDIVIDUAL'],
  business_analyst: ['PROJECT', 'PHASE', 'TEAM', 'INDIVIDUAL'],
  admin: ['PROJECT', 'PHASE', 'TEAM', 'INDIVIDUAL'],
};

const reportTypeLabels: Record<ReportType, string> = {
  WEEKLY: '주간 보고서',
  MONTHLY: '월간 보고서',
  QUARTERLY: '분기 보고서',
  PROJECT: '프로젝트 보고서',
};

const statusConfig: Record<ReportStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  DRAFT: { label: '초안', color: 'bg-gray-100 text-gray-700', icon: FileText },
  PUBLISHED: { label: '발행됨', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  ARCHIVED: { label: '보관됨', color: 'bg-blue-100 text-blue-700', icon: Clock },
};

const scopeLabels: Record<ReportScope, string> = {
  PROJECT: '프로젝트',
  PHASE: '단계',
  TEAM: '팀',
  INDIVIDUAL: '개인',
};

// Mock data
const mockReports: Report[] = [
  {
    id: '1',
    title: '주간 업무 보고서 (1월 3주차)',
    reportType: 'WEEKLY',
    reportScope: 'INDIVIDUAL',
    status: 'PUBLISHED',
    periodStart: '2026-01-20',
    periodEnd: '2026-01-24',
    createdAt: '2026-01-24T09:00:00',
    publishedAt: '2026-01-24T10:30:00',
    llmGenerated: true,
  },
  {
    id: '2',
    title: '주간 업무 보고서 (1월 2주차)',
    reportType: 'WEEKLY',
    reportScope: 'INDIVIDUAL',
    status: 'DRAFT',
    periodStart: '2026-01-13',
    periodEnd: '2026-01-17',
    createdAt: '2026-01-17T09:00:00',
    llmGenerated: false,
  },
];

export default function ReportManagement({ userRole }: ReportManagementProps) {
  const { currentProject } = useProject();
  const [activeTab, setActiveTab] = useState('reports');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<ReportType | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'ALL'>('ALL');
  const [reports, setReports] = useState<Report[]>(mockReports);
  const [isLoading, setIsLoading] = useState(false);

  // Generate report dialog
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    reportType: 'WEEKLY' as ReportType,
    scope: 'INDIVIDUAL' as ReportScope,
    periodStart: '',
    periodEnd: '',
    useAiSummary: true,
    sections: ['my_summary', 'completed_tasks', 'in_progress', 'next_week_plan'],
  });
  const [isGenerating, setIsGenerating] = useState(false);

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

  // Get available scopes for current user
  const availableScopes = scopesByRole[userRole] || ['INDIVIDUAL'];

  // Filter reports
  const filteredReports = reports.filter((report) => {
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'ALL' || report.reportType === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || report.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Handle report generation
  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      // TODO: Call actual API
      await new Promise((r) => setTimeout(r, 2000)); // Simulate API call

      const newReport: Report = {
        id: String(Date.now()),
        title: `${reportTypeLabels[generateForm.reportType]} (${generateForm.periodStart} ~ ${generateForm.periodEnd})`,
        reportType: generateForm.reportType,
        reportScope: generateForm.scope,
        status: 'DRAFT',
        periodStart: generateForm.periodStart,
        periodEnd: generateForm.periodEnd,
        createdAt: new Date().toISOString(),
        llmGenerated: generateForm.useAiSummary,
      };

      setReports([newReport, ...reports]);
      setIsGenerateDialogOpen(false);
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setIsGenerating(false);
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">프로젝트 리포트</h1>
          <p className="text-gray-500 mt-1">
            AI 기반 보고서 생성 및 프로젝트 데이터 분석
          </p>
        </div>
        {canGenerateReports && (
          <Button onClick={() => setIsGenerateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            보고서 생성
          </Button>
        )}
      </div>

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
        <TabsContent value="reports" className="space-y-4">
          {/* Filters */}
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
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as ReportType | 'ALL')}>
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
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ReportStatus | 'ALL')}>
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
                <Button variant="outline" onClick={() => setIsLoading(true)} disabled={isLoading}>
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
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
                const status = statusConfig[report.status];
                const StatusIcon = status.icon;

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
                              {report.llmGenerated && (
                                <span title="AI 생성">
                                  <Sparkles className="h-4 w-4 text-purple-500" />
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                              <span>{reportTypeLabels[report.reportType]}</span>
                              <ChevronRight className="h-3 w-3" />
                              <span>{scopeLabels[report.reportScope]}</span>
                              <ChevronRight className="h-3 w-3" />
                              <span>{new Date(report.createdAt).toLocaleDateString('ko-KR')}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={status.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
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
                              {report.status === 'DRAFT' && (
                                <DropdownMenuItem>
                                  <Send className="h-4 w-4 mr-2" />
                                  발행하기
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem>
                                <Download className="h-4 w-4 mr-2" />
                                다운로드
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600">
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
                onValueChange={(v) => setGenerateForm({ ...generateForm, reportType: v as ReportType })}
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
                onValueChange={(v) => setGenerateForm({ ...generateForm, scope: v as ReportScope })}
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGenerateDialogOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleGenerateReport}
              disabled={isGenerating || !generateForm.periodStart || !generateForm.periodEnd}
            >
              {isGenerating ? (
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
  );
}
