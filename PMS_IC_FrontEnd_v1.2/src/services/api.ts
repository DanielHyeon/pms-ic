import type { Result, ApiError, ResultMeta, ResultWarning } from '../types/result';
import { ok, fail } from '../types/result';
import type { PoBacklogViewDto, PmWorkboardViewDto, PmoPortfolioViewDto } from '../types/views';
import type { DataQualityResponse } from '../hooks/api/useDataQuality';
import type { WeightedProgressDto } from '../hooks/api/useDashboard';
import type { WbsSnapshot } from '../types/wbsSnapshot';
import type { Epic, EpicFormData, Feature, Sprint } from '../types/backlog';
import type { Project, Requirement, Rfp, WeeklyReport } from '../types/project';
import type {
  LineageGraphDto,
  PageResponse,
  LineageEventDto,
  ImpactAnalysisDto,
} from '../types/lineage';
import type { Part, PartMember, PartDashboard, PartMetrics } from '../types/part';

export interface KpiApiDto {
  id: string;
  phaseId: string;
  name: string;
  target: string;
  current: string;
  status: string;
}

export interface ReportApiDto {
  id: string;
  projectId: string;
  reportType: string;
  reportScope: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  generationMode?: string;
  llmGeneratedSections?: string[];
  llmModel?: string;
  createdBy?: string;
  creatorRole?: string;
}

export interface ReportProgressEvent {
  reportId: string;
  phase: string;
  percentage: number;
  message: string;
}

export type ReportStreamEvent =
  | { type: 'meta'; traceId: string; timestamp: string }
  | { type: 'progress'; reportId: string; phase: string; percentage: number; message: string };

import { DEFAULT_TEMPLATES, getDefaultTemplateById } from '../data/defaultTemplates';
import type { WbsGroup, WbsItem, WbsTask } from '../types/wbs';
import { getMockWbsGroups, getMockWbsItems, getMockWbsTasks } from '../mocks/wbs.mock';
import {
  getMockPhases,
  getMockPhaseById,
  getMockSprints,
  getMockSprintById,
  getMockParts,
  getMockPartById,
  getMockPartMembers,
} from '../mocks/dashboard.mock';
import type {
  DashboardStats,
  DashboardSection,
  ProjectDashboardDto,
  PhaseProgressDto,
  PartStatsDto,
  WbsGroupStatsDto,
  SprintVelocityDto,
  BurndownDto,
  InsightDto,
} from '../types/dashboard';

// Base URL without version prefix - version is added per-endpoint
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8083/api';

// API version prefixes
const V2 = '/v2'; // For v2 endpoints: projects, chat, users, permissions, educations, rfps, requirements, lineage, reports, kanban
// No prefix for: phases, members, sprints, meetings, issues, auth, llm, admin, wbs-snapshots

// Types for Excel import/export
export interface ImportError {
  rowNumber: number;
  column: string;
  value: string;
  message: string;
}

export interface ImportResult {
  totalRows: number;
  successCount: number;
  createCount: number;
  updateCount: number;
  errorCount: number;
  errors: ImportError[];
}

export class ApiService {
  private token: string | null = null;
  private useMockData = false;

  constructor() {
    this.token = localStorage.getItem('auth_token');
    // 헬스 체크를 비동기로 실행하여 앱 시작을 막지 않음
    this.checkBackendAvailability().catch(() => {
      // 헬스 체크 실패는 조용히 처리 (실제 API 호출 시 다시 시도)
    });
  }

  private async checkBackendAvailability() {
    try {
      const healthUrl = API_BASE_URL.replace('/api/v2', '').replace('/api', '') + '/actuator/health';
      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 타임아웃을 5초로 증가
      });
      this.useMockData = !response.ok;
      if (response.ok) {
        console.log('Backend connected successfully');
      } else {
        console.warn('Backend health check failed, will retry on actual API calls');
        this.useMockData = true;
      }
    } catch (error) {
      // 헬스 체크 실패는 정상적인 상황일 수 있음 (백엔드가 아직 시작 중일 수 있음)
      // 실제 API 호출 시 다시 시도하므로 여기서는 조용히 처리
      console.debug('Backend health check not available, will retry on API calls:', error);
      this.useMockData = true;
    }
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  private async fetchWithFallback<T>(
    endpoint: string,
    options: RequestInit = {},
    mockData: T,
    timeoutMs: number = 10000
  ): Promise<T> {
    // Always try real API first, even if health check failed
    try {
      const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
      const headers: HeadersInit = {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      };

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // If successful, mark backend as available
      if (this.useMockData) {
        console.log('Backend is now available');
        this.useMockData = false;
      }

      const json = await response.json();

      // Extract data from ApiResponse wrapper if present
      if (json && typeof json === 'object' && 'data' in json && 'success' in json) {
        return json.data as T;
      }

      return json;
    } catch (error) {
      // 네트워크 에러인 경우에만 경고, 그 외는 조용히 처리
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.warn(`API call failed for ${endpoint}: Backend may not be running. Using mock data.`);
      } else if (error instanceof Error && error.name === 'TimeoutError') {
        console.warn(`API call timeout for ${endpoint}: Backend may be slow. Using mock data.`);
      } else {
        console.debug(`API call failed for ${endpoint}, using mock data:`, error);
      }
      this.useMockData = true;
      await new Promise((resolve) => setTimeout(resolve, 300));
      return mockData;
    }
  }

  // Strict fetch that throws on failure - use for critical operations like DELETE
  private async fetchStrict<T>(
    endpoint: string,
    options: RequestInit = {},
    timeoutMs: number = 10000
  ): Promise<T> {
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers: HeadersInit = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    // If successful, mark backend as available
    if (this.useMockData) {
      console.log('Backend is now available');
      this.useMockData = false;
    }

    const json = await response.json();

    // Extract data from ApiResponse wrapper if present
    if (json && typeof json === 'object' && 'data' in json && 'success' in json) {
      return json.data as T;
    }

    return json;
  }

  // Type-safe fetch returning Result<T> — replaces fetchWithFallback for new code.
  // Rule A: no data shape transformation (extract handles that)
  // Rule B: PARSE errors separated from HTTP errors
  // Rule C: source/usedFallback set based on actually returned data
  // Rule D: durationMs always measured
  private async fetchResult<T>(
    endpoint: string,
    options?: RequestInit,
    config?: {
      fallbackData?: T | null;
      timeoutMs?: number;
      extract?: (json: unknown) => T;
    }
  ): Promise<Result<T>> {
    const startMs = performance.now();
    const timeoutMs = config?.timeoutMs ?? 10000;

    const makeMeta = (source: 'api' | 'fallback'): ResultMeta => ({
      source,
      asOf: new Date().toISOString(),
      endpoint,
      durationMs: Math.round(performance.now() - startMs),
      usedFallback: source === 'fallback',
    });

    const makeError = (
      code: ApiError['code'],
      message: string,
      cause?: unknown,
      status?: number,
    ): ApiError => ({
      code,
      status,
      message,
      endpoint,
      timestamp: new Date().toISOString(),
      retryable: code === 'NETWORK' || code === 'TIMEOUT' || code === 'HTTP_5XX',
      cause,
    });

    try {
      const isFormData = typeof FormData !== 'undefined' && options?.body instanceof FormData;
      const headers: HeadersInit = {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options?.headers,
      };

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        const code = response.status >= 500 ? 'HTTP_5XX' : 'HTTP_4XX';
        const apiError = makeError(code as ApiError['code'], errorText, undefined, response.status);
        if (this.useMockData) this.useMockData = false;
        return fail<T>(apiError, makeMeta('fallback'), config?.fallbackData);
      }

      if (this.useMockData) {
        this.useMockData = false;
      }

      const json = await response.json();

      // Auto-unwrap ApiResponse {data, success} wrapper (matches fetchWithFallback behavior)
      const unwrapped = (json && typeof json === 'object' && 'data' in json && 'success' in json)
        ? json.data
        : json;

      // Apply extract or return unwrapped json
      try {
        const data: T = config?.extract ? config.extract(unwrapped) : unwrapped as T;
        return ok(data, makeMeta('api'));
      } catch (extractError) {
        const apiError = makeError('PARSE', `Response extraction failed: ${extractError}`, extractError);
        const warnings: ResultWarning[] = [{ code: 'PARSE_ERROR', message: apiError.message }];
        return fail<T>(apiError, makeMeta('fallback'), config?.fallbackData, warnings);
      }
    } catch (error) {
      let code: ApiError['code'] = 'UNKNOWN';
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        code = 'NETWORK';
      } else if (error instanceof Error && error.name === 'TimeoutError') {
        code = 'TIMEOUT';
      } else if (error instanceof DOMException && error.name === 'AbortError') {
        code = 'ABORTED';
      }
      const apiError = makeError(code, error instanceof Error ? error.message : String(error), error);
      this.useMockData = true;
      return fail<T>(apiError, makeMeta('fallback'), config?.fallbackData);
    }
  }

  async login(email: string, password: string) {
    // Mock user data for fallback - matches LoginScreen demo users
    const mockUsers: Record<string, { id: string; name: string; role: string; department: string }> = {
      'sponsor@insure.com': { id: 'U001', name: '이사장', role: 'sponsor', department: '경영진' },
      'pmo@insure.com': { id: 'U002', name: 'PMO 총괄', role: 'pmo_head', department: 'PMO' },
      'pm@insure.com': { id: 'U003', name: '김철수', role: 'pm', department: 'IT혁신팀' },
      'dev@insure.com': { id: 'U004', name: '박민수', role: 'developer', department: 'AI개발팀' },
      'qa@insure.com': { id: 'U005', name: '최지훈', role: 'qa', department: '품질보증팀' },
      'ba@insure.com': { id: 'U006', name: '이영희', role: 'business_analyst', department: '보험심사팀' },
      'auditor@insure.com': { id: 'U007', name: '감리인', role: 'auditor', department: '외부감리법인' },
      'admin@insure.com': { id: 'U008', name: '시스템관리자', role: 'admin', department: 'IT운영팀' },
    };

    const mockUser = mockUsers[email.toLowerCase()] || {
      id: '1',
      name: email.split('@')[0],
      role: 'pm',
      department: 'PMO',
    };

    return this.fetchWithFallback(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      },
      {
        token: 'mock-jwt-token',
        user: {
          ...mockUser,
          email,
        },
      }
    );
  }

  // ========== Portfolio Dashboard API (aggregated for user's accessible projects) ==========

  async getPortfolioDashboardStats() {
    return this.fetchWithFallback(`${V2}/dashboard/stats`, {}, {
      isPortfolioView: true,
      projectId: null,
      projectName: null,
      totalProjects: 0,
      activeProjects: 0,
      totalTasks: 0,
      completedTasks: 0,
      inProgressTasks: 0,
      avgProgress: 0,
      projectsByStatus: {},
      tasksByStatus: {},
      totalIssues: 0,
      openIssues: 0,
      highPriorityIssues: 0,
      budgetTotal: 0,
      budgetSpent: 0,
      budgetExecutionRate: 0,
    });
  }

  async getPortfolioActivities() {
    return this.fetchWithFallback(`${V2}/dashboard/activities`, {}, [
      { user: '박민수', action: 'OCR 모델 v2.1 성능 테스트 완료', time: '5분 전', type: 'success' as const, projectId: 'proj-001', projectName: 'AI 보험심사 처리 시스템' },
      { user: '이영희', action: '데이터 비식별화 문서 승인 요청', time: '1시간 전', type: 'info' as const, projectId: 'proj-001', projectName: 'AI 보험심사 처리 시스템' },
      { user: 'AI 어시스턴트', action: '일정 지연 위험 감지 알림 발송', time: '2시간 전', type: 'warning' as const, projectId: 'proj-002', projectName: '모바일 보험 플랫폼' },
    ]);
  }

  // ========== Project-specific Dashboard API ==========

  async getProjectDashboardStats(projectId: string): Promise<DashboardStats> {
    return this.fetchWithFallback<DashboardStats>(`${V2}/projects/${projectId}/dashboard/stats`, {}, {
      isPortfolioView: false,
      projectId,
      projectName: null,
      totalProjects: 1,
      activeProjects: 1,
      totalTasks: 0,
      completedTasks: 0,
      inProgressTasks: 0,
      avgProgress: 0,
      projectsByStatus: {},
      tasksByStatus: {},
      totalIssues: 0,
      openIssues: 0,
      highPriorityIssues: 0,
      budgetTotal: null,
      budgetSpent: null,
      budgetExecutionRate: null,
    });
  }

  async getProjectActivities(projectId: string) {
    return this.fetchWithFallback(`${V2}/projects/${projectId}/dashboard/activities`, {}, [
      { user: '박민수', action: 'OCR 모델 v2.1 성능 테스트 완료', time: '5분 전', type: 'success' as const, projectId, projectName: 'AI 보험심사 처리 시스템' },
      { user: '이영희', action: '데이터 비식별화 문서 승인 요청', time: '1시간 전', type: 'info' as const, projectId, projectName: 'AI 보험심사 처리 시스템' },
    ]);
  }

  async getWeightedProgress(projectId: string) {
    return this.fetchWithFallback(`${V2}/projects/${projectId}/dashboard/weighted-progress`, {}, {
      aiProgress: 0,
      siProgress: 0,
      commonProgress: 0,
      weightedProgress: 0,
      aiWeight: 0.70,
      siWeight: 0.30,
      commonWeight: 0.00,
      aiTotalTasks: 0,
      aiCompletedTasks: 0,
      siTotalTasks: 0,
      siCompletedTasks: 0,
      commonTotalTasks: 0,
      commonCompletedTasks: 0,
      totalTasks: 0,
      completedTasks: 0,
    });
  }

  // ========== Kanban Board API ==========

  async getKanbanBoard(projectId: string) {
    return this.fetchWithFallback<{ projectId: string; columns: { id: string; name: string; orderNum: number; wipLimit: number | null; color: string | null; tasks: { id: string; [key: string]: unknown }[] }[] } | null>(
      `${V2}/projects/${projectId}/kanban`, {}, null
    );
  }

  // ========== Section-based Dashboard API (DashboardSection contract) ==========

  async getFullProjectDashboard(projectId: string) {
    return this.fetchWithFallback<ProjectDashboardDto | null>(`${V2}/projects/${projectId}/dashboard`, {}, null);
  }

  async getPhaseProgress(projectId: string) {
    return this.fetchWithFallback<DashboardSection<PhaseProgressDto> | null>(`${V2}/projects/${projectId}/dashboard/phase-progress`, {}, null);
  }

  async getPartStats(projectId: string) {
    return this.fetchWithFallback<DashboardSection<PartStatsDto> | null>(`${V2}/projects/${projectId}/dashboard/part-stats`, {}, null);
  }

  async getWbsGroupStats(projectId: string) {
    return this.fetchWithFallback<DashboardSection<WbsGroupStatsDto> | null>(`${V2}/projects/${projectId}/dashboard/wbs-group-stats`, {}, null);
  }

  async getSprintVelocity(projectId: string) {
    return this.fetchWithFallback<DashboardSection<SprintVelocityDto> | null>(`${V2}/projects/${projectId}/dashboard/sprint-velocity`, {}, null);
  }

  async getBurndown(projectId: string) {
    return this.fetchWithFallback<DashboardSection<BurndownDto> | null>(`${V2}/projects/${projectId}/dashboard/burndown`, {}, null);
  }

  async getInsights(projectId: string) {
    return this.fetchWithFallback<DashboardSection<InsightDto[]> | null>(`${V2}/projects/${projectId}/dashboard/insights`, {}, null);
  }

  // ========== Legacy Dashboard API (backward compatibility) ==========

  /** @deprecated Use getPortfolioDashboardStats() instead */
  async getDashboardStats() {
    return this.getPortfolioDashboardStats();
  }

  /** @deprecated Use getPortfolioActivities() instead */
  async getActivities() {
    return this.getPortfolioActivities();
  }

  // ========== Project API ==========
  async getProjects() {
    const response = await this.fetchWithFallback(`${V2}/projects`, {}, {
      data: [
        {
          id: 'proj-001',
          name: 'AI 보험심사 처리 시스템',
          code: 'PMS-IC-2026',
          status: 'IN_PROGRESS',
          progress: 25,
          startDate: '2026-01-15',
          endDate: '2026-06-30',
        },
        {
          id: 'proj-002',
          name: '모바일 보험 플랫폼',
          code: 'PMS-MIP-2026',
          status: 'PLANNING',
          progress: 5,
          startDate: '2026-02-01',
          endDate: '2026-08-31',
        },
      ],
    });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async getProject(projectId: string) {
    const response = await this.fetchWithFallback(`${V2}/projects/${projectId}`, {}, {
      data: {
        id: projectId,
        name: projectId === 'proj-001' ? 'AI 보험심사 처리 시스템' : '모바일 보험 플랫폼',
        code: projectId === 'proj-001' ? 'PMS-IC-2026' : 'PMS-MIP-2026',
        description: projectId === 'proj-001'
          ? 'AI 기반 보험 청구 처리 시스템 개발. 자동 문서 분석, 사기 탐지, 지능형 라우팅 기능 포함.'
          : '보험 서비스를 위한 종합 모바일 플랫폼 구축. 보험증권 관리, 청구 제출, 실시간 상태 조회 기능 포함.',
        status: projectId === 'proj-001' ? 'IN_PROGRESS' : 'PLANNING',
        progress: projectId === 'proj-001' ? 25 : 5,
        startDate: projectId === 'proj-001' ? '2026-01-15' : '2026-02-01',
        endDate: projectId === 'proj-001' ? '2026-06-30' : '2026-08-31',
        budget: projectId === 'proj-001' ? 500000000 : 350000000,
        budgetUsed: 0,
      },
    });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async createProject(data: any) {
    const response = await this.fetchWithFallback(`${V2}/projects`, {
      method: 'POST',
      body: JSON.stringify(data),
    }, { data: { ...data, id: Date.now().toString() } });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async updateProject(projectId: string, data: any) {
    const response = await this.fetchWithFallback(`${V2}/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, { data: { ...data, id: projectId } });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async deleteProject(projectId: string) {
    return this.fetchWithFallback(`${V2}/projects/${projectId}`, {
      method: 'DELETE',
    }, { success: true });
  }

  async setDefaultProject(projectId: string) {
    return this.fetchWithFallback(`${V2}/projects/${projectId}/set-default`, {
      method: 'POST',
    }, { success: true, projectId });
  }

  // ========== Part (Sub-Project) API ==========
  async getParts(projectId: string) {
    const response = await this.fetchWithFallback(`/projects/${projectId}/parts`, {}, { data: getMockParts(projectId) });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async getPart(partId: string) {
    const response = await this.fetchWithFallback(`/parts/${partId}`, {}, { data: getMockPartById(partId) || null });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async createPart(projectId: string, data: any) {
    const response = await this.fetchWithFallback(`/projects/${projectId}/parts`, {
      method: 'POST',
      body: JSON.stringify(data),
    }, { data: { ...data, id: `part-${Date.now()}`, projectId } });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async updatePart(partId: string, data: any) {
    const response = await this.fetchWithFallback(`/parts/${partId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, { data: { ...data, id: partId } });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async deletePart(partId: string) {
    return this.fetchWithFallback(`/parts/${partId}`, {
      method: 'DELETE',
    }, { success: true });
  }

  async assignPartLeader(partId: string, userId: string) {
    return this.fetchWithFallback(`/parts/${partId}/leader`, {
      method: 'PUT',
      body: JSON.stringify({ userId }),
    }, { success: true });
  }

  async getPartMembers(partId: string) {
    const response = await this.fetchWithFallback(`/parts/${partId}/members`, {}, { data: getMockPartMembers(partId) });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async addPartMember(partId: string, userId: string) {
    return this.fetchWithFallback(`/parts/${partId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }, { success: true });
  }

  async removePartMember(partId: string, memberId: string) {
    return this.fetchWithFallback(`/parts/${partId}/members/${memberId}`, {
      method: 'DELETE',
    }, { success: true });
  }

  async getPartDashboard(projectId: string, partId: string) {
    return this.fetchWithFallback(`/projects/${projectId}/parts/${partId}/dashboard`, {}, null);
  }

  async getPartMetrics(projectId: string, partId: string) {
    return this.fetchWithFallback(`/projects/${projectId}/parts/${partId}/metrics`, {}, null);
  }

  async getPartFeatures(projectId: string, partId: string) {
    return this.fetchWithFallback(`/projects/${projectId}/parts/${partId}/features`, {}, []);
  }

  async getPartStories(projectId: string, partId: string) {
    return this.fetchWithFallback(`/projects/${projectId}/parts/${partId}/stories`, {}, []);
  }

  // ========== Sprint API ==========
  async getSprints(projectId: string) {
    const response = await this.fetchWithFallback(`/projects/${projectId}/sprints`, {}, { data: getMockSprints(projectId) });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async getSprint(sprintId: string) {
    const response = await this.fetchWithFallback(`/sprints/${sprintId}`, {}, { data: getMockSprintById(sprintId) || null });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async createSprint(projectId: string, data: any) {
    const response = await this.fetchWithFallback(`/projects/${projectId}/sprints`, {
      method: 'POST',
      body: JSON.stringify(data),
    }, { data: { ...data, id: `sprint-${Date.now()}`, projectId } });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async updateSprint(sprintId: string, data: any) {
    const response = await this.fetchWithFallback(`/sprints/${sprintId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, { data: { ...data, id: sprintId } });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async deleteSprint(sprintId: string) {
    return this.fetchWithFallback(`/sprints/${sprintId}`, {
      method: 'DELETE',
    }, { success: true });
  }

  async startSprint(sprintId: string) {
    return this.fetchWithFallback(`/sprints/${sprintId}/start`, {
      method: 'POST',
    }, { success: true });
  }

  async completeSprint(sprintId: string) {
    return this.fetchWithFallback(`/sprints/${sprintId}/complete`, {
      method: 'POST',
    }, { success: true });
  }

  // ========== Project Members API ==========
  async getProjectMembers(projectId: string) {
    const response = await this.fetchWithFallback(`/projects/${projectId}/members`, {}, []);
    if (response && typeof response === 'object' && 'data' in response && Array.isArray((response as any).data)) {
      return (response as any).data;
    }
    return Array.isArray(response) ? response : [];
  }

  async addProjectMember(projectId: string, userId: string, role: string) {
    return this.fetchWithFallback(`/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId, role }),
    }, { success: true });
  }

  async updateProjectMemberRole(projectId: string, memberId: string, role: string) {
    return this.fetchWithFallback(`/projects/${projectId}/members/${memberId}`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }, { success: true });
  }

  async removeProjectMember(projectId: string, memberId: string) {
    return this.fetchWithFallback(`/projects/${projectId}/members/${memberId}`, {
      method: 'DELETE',
    }, { success: true });
  }

  // ========== Phase API ==========
  async getPhases(projectId?: string) {
    const params = projectId ? `?projectId=${projectId}` : '';
    return this.fetchWithFallback(`/phases${params}`, {}, getMockPhases(projectId));
  }

  async getPhase(phaseId: string) {
    return this.fetchWithFallback(`/phases/${phaseId}`, {}, getMockPhaseById(phaseId) || null);
  }

  async createPhase(projectId: string, data: {
    name: string;
    description?: string;
    orderNum: number;
    status?: string;
    gateStatus?: string;
    startDate?: string;
    endDate?: string;
    progress?: number;
    trackType?: string;
  }) {
    return this.fetchWithFallback(`/phases?projectId=${projectId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }, { ...data, id: `phase-${Date.now()}` });
  }

  async updatePhase(phaseId: string, data: {
    name?: string;
    description?: string;
    orderNum?: number;
    status?: string;
    gateStatus?: string;
    startDate?: string;
    endDate?: string;
    progress?: number;
    trackType?: string;
  }) {
    return this.fetchWithFallback(`/phases/${phaseId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, { ...data, id: phaseId });
  }

  async deletePhase(phaseId: string) {
    return this.fetchWithFallback(`/phases/${phaseId}`, {
      method: 'DELETE',
    }, { message: 'Phase deleted' });
  }

  async updateDeliverable(phaseId: string | number, deliverableId: string | number, data: any) {
    return this.fetchWithFallback(`/phases/${phaseId}/deliverables/${deliverableId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, data);
  }

  async getPhaseDeliverables(phaseId: string) {
    return this.fetchWithFallback(`/phases/${phaseId}/deliverables`, {}, []);
  }

  async uploadDeliverable(params: {
    phaseId: string;
    deliverableId?: string;
    file: File;
    name?: string;
    description?: string;
    type?: string;
  }) {
    const formData = new FormData();
    formData.append('file', params.file);
    if (params.name) formData.append('name', params.name);
    if (params.description) formData.append('description', params.description);
    if (params.type) formData.append('type', params.type);

    const endpoint = params.deliverableId
      ? `/phases/${params.phaseId}/deliverables/${params.deliverableId}/upload`
      : `/phases/${params.phaseId}/deliverables`;

    // Use 5 minute timeout for file uploads (large files may take time)
    return this.fetchWithFallback(endpoint, {
      method: 'POST',
      body: formData,
    }, {}, 300000);
  }

  async approveDeliverable(deliverableId: string, approved: boolean) {
    return this.fetchWithFallback(`/deliverables/${deliverableId}/approval`, {
      method: 'POST',
      body: JSON.stringify({ approved }),
    }, {});
  }

  async downloadDeliverable(deliverableId: string) {
    if (this.useMockData) {
      return null;
    }

    const headers: HeadersInit = {
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
    };

    const response = await fetch(`${API_BASE_URL}/deliverables/${deliverableId}/download`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.blob();
  }

  async getPhaseKpis(phaseId: string) {
    return this.fetchWithFallback(`/phases/${phaseId}/kpis`, {}, []);
  }

  async createKpi(phaseId: string, data: any) {
    return this.fetchWithFallback(`/phases/${phaseId}/kpis`, {
      method: 'POST',
      body: JSON.stringify(data),
    }, data);
  }

  async updateKpi(phaseId: string, kpiId: string, data: any) {
    return this.fetchWithFallback(`/phases/${phaseId}/kpis/${kpiId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, data);
  }

  async deleteKpi(phaseId: string, kpiId: string) {
    return this.fetchWithFallback(`/phases/${phaseId}/kpis/${kpiId}`, {
      method: 'DELETE',
    }, { message: 'KPI deleted' });
  }

  // Alias methods for Phase KPIs (used by usePhases.ts)
  async createPhaseKpi(phaseId: string, data: { name: string; target: string; current?: string; status?: string }) {
    return this.createKpi(phaseId, data);
  }

  async updatePhaseKpi(phaseId: string, kpiId: string, data: { name?: string; target?: string; current?: string; status?: string }) {
    return this.updateKpi(phaseId, kpiId, data);
  }

  async deletePhaseKpi(phaseId: string, kpiId: string) {
    return this.deleteKpi(phaseId, kpiId);
  }

  // Kanban Board API - uses v2 endpoint (delegates to primary getKanbanBoard)
  async getKanbanBoardV2(projectId?: string) {
    if (!projectId) return { columns: [] };
    return this.getKanbanBoard(projectId);
  }

  async getTasks(projectId?: string) {
    // Use new kanban endpoint that returns board with tasks organized by columns
    if (!projectId) return [];
    const board = await this.getKanbanBoard(projectId);
    // Flatten all tasks from all columns
    const allTasks = (board?.columns || []).flatMap((col: any) =>
      (col.tasks || []).map((task: any) => ({ ...task, status: this.mapColumnToStatus(col.name) }))
    );
    return allTasks;
  }

  private mapColumnToStatus(columnName: string): string {
    const statusMap: Record<string, string> = {
      '백로그': 'BACKLOG',
      '할 일': 'TODO',
      '진행 중': 'IN_PROGRESS',
      '검토': 'REVIEW',
      '테스트 중': 'TESTING',
      '완료': 'DONE',
    };
    return statusMap[columnName] || 'TODO';
  }

  async getTaskColumns(projectId?: string) {
    if (!projectId) return [];
    const board = await this.getKanbanBoard(projectId);
    return board?.columns || [];
  }

  async createTask(task: any, projectId?: string) {
    if (!projectId) return { ...task, id: Date.now() };
    return this.fetchWithFallback(`${V2}/projects/${projectId}/kanban/tasks`, {
      method: 'POST',
      body: JSON.stringify(task),
    }, { ...task, id: Date.now() });
  }

  async updateTask(taskId: string | number, data: any, projectId?: string) {
    if (!projectId) return data;
    return this.fetchWithFallback(`${V2}/projects/${projectId}/kanban/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, data);
  }

  async moveTask(taskId: string | number, toColumn: string, projectId?: string) {
    if (!projectId) return { taskId, toColumn };
    return this.fetchWithFallback(`${V2}/projects/${projectId}/kanban/tasks/${taskId}/move`, {
      method: 'PATCH',
      body: JSON.stringify({ targetColumnId: toColumn }),
    }, { taskId, toColumn });
  }

  async deleteTask(taskId: string | number, projectId?: string) {
    if (!projectId) return { message: 'Task deleted' };
    return this.fetchWithFallback(`${V2}/projects/${projectId}/kanban/tasks/${taskId}`, {
      method: 'DELETE',
    }, { message: 'Task deleted' });
  }

  async getStories(projectId: string, filters?: { status?: string; epic?: string }) {
    const params = new URLSearchParams(filters as any);
    const response = await this.fetchWithFallback(`/projects/${projectId}/user-stories?${params}`, {}, { data: [] });
    return response?.data || response || [];
  }

  async getEpics(projectId: string) {
    return this.fetchWithFallback(`/stories/epics?projectId=${projectId}`, {}, ['OCR 엔진', 'AI 모델', '인프라', '데이터 관리']);
  }

  async getEpicsForProject(projectId: string) {
    const response = await this.fetchWithFallback(`/projects/${projectId}/epics`, {}, { data: [] });
    return response?.data || response || [];
  }

  async getEpicById(epicId: string) {
    const response = await this.fetchWithFallback(`/epics/${epicId}`, {}, null);
    return response?.data || response;
  }

  async createEpic(projectId: string, data: any) {
    const response = await this.fetchWithFallback(`/projects/${projectId}/epics`, {
      method: 'POST',
      body: JSON.stringify(data),
    }, null);
    return response?.data || response;
  }

  async updateEpic(epicId: string, data: any) {
    const response = await this.fetchWithFallback(`/epics/${epicId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, null);
    return response?.data || response;
  }

  async deleteEpic(epicId: string) {
    return this.fetchWithFallback(`/epics/${epicId}`, {
      method: 'DELETE',
    }, null);
  }

  async createStory(story: any) {
    return this.fetchWithFallback('/stories', {
      method: 'POST',
      body: JSON.stringify(story),
    }, { ...story, id: Date.now() });
  }

  async updateStory(storyId: string | number, data: any) {
    return this.fetchWithFallback(`/stories/${storyId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, data);
  }

  async updateStoryPriority(storyId: string | number, direction: 'up' | 'down') {
    return this.fetchWithFallback(`/stories/${storyId}/priority`, {
      method: 'PUT',
      body: JSON.stringify({ direction }),
    }, []);
  }

  async deleteStory(storyId: string) {
    return this.fetchWithFallback(`/stories/${storyId}`, {
      method: 'DELETE',
    }, { message: 'Story deleted' });
  }

  async getPermissions() {
    return this.fetchWithFallback(`${V2}/permissions`, {}, [
      {
        id: 'view_dashboard',
        category: '대시보드',
        name: '전사 프로젝트 대시보드 조회',
        roles: {
          sponsor: true,
          pmo_head: true,
          pm: true,
          developer: false,
          qa: false,
          business_analyst: false,
          auditor: true,
          admin: false,
        },
      },
      {
        id: 'create_project',
        category: '프로젝트',
        name: '프로젝트 생성',
        roles: {
          sponsor: false,
          pmo_head: true,
          pm: true,
          developer: false,
          qa: false,
          business_analyst: false,
          auditor: false,
          admin: true,
        },
      },
      {
        id: 'delete_project',
        category: '프로젝트',
        name: '프로젝트 삭제',
        roles: {
          sponsor: false,
          pmo_head: true,
          pm: false,
          developer: false,
          qa: false,
          business_analyst: false,
          auditor: false,
          admin: true,
        },
      },
      {
        id: 'manage_wbs',
        category: '일정관리',
        name: 'WBS 작성 및 수정',
        roles: {
          sponsor: false,
          pmo_head: true,
          pm: true,
          developer: false,
          qa: false,
          business_analyst: false,
          auditor: false,
          admin: false,
        },
      },
      {
        id: 'manage_budget',
        category: '예산관리',
        name: '예산 편성 및 수정',
        roles: {
          sponsor: true,
          pmo_head: true,
          pm: false,
          developer: false,
          qa: false,
          business_analyst: false,
          auditor: false,
          admin: false,
        },
      },
      {
        id: 'approve_budget',
        category: '예산관리',
        name: '예산 최종 승인',
        roles: {
          sponsor: true,
          pmo_head: false,
          pm: false,
          developer: false,
          qa: false,
          business_analyst: false,
          auditor: false,
          admin: false,
        },
      },
      {
        id: 'manage_risk',
        category: '리스크/이슈',
        name: '리스크 및 이슈 등록/수정',
        roles: {
          sponsor: false,
          pmo_head: true,
          pm: true,
          developer: true,
          qa: true,
          business_analyst: false,
          auditor: false,
          admin: false,
        },
      },
      {
        id: 'approve_deliverable',
        category: '산출물',
        name: '산출물 승인/반려',
        roles: {
          sponsor: true,
          pmo_head: true,
          pm: true,
          developer: false,
          qa: false,
          business_analyst: false,
          auditor: false,
          admin: false,
        },
      },
      {
        id: 'manage_backlog',
        category: '애자일',
        name: '백로그 관리',
        roles: {
          sponsor: false,
          pmo_head: false,
          pm: true,
          developer: true,
          qa: true,
          business_analyst: true,
          auditor: false,
          admin: false,
        },
      },
      {
        id: 'manage_sprint',
        category: '애자일',
        name: '스프린트 관리',
        roles: {
          sponsor: false,
          pmo_head: false,
          pm: true,
          developer: true,
          qa: true,
          business_analyst: false,
          auditor: false,
          admin: false,
        },
      },
      {
        id: 'use_ai_assistant',
        category: 'AI 기능',
        name: 'AI 어시스턴트 사용',
        roles: {
          sponsor: true,
          pmo_head: true,
          pm: true,
          developer: true,
          qa: true,
          business_analyst: true,
          auditor: false,
          admin: false,
        },
      },
      {
        id: 'view_audit_log',
        category: '보안/감사',
        name: '감사 로그 조회',
        roles: {
          sponsor: false,
          pmo_head: true,
          pm: false,
          developer: false,
          qa: false,
          business_analyst: false,
          auditor: true,
          admin: true,
        },
      },
      {
        id: 'manage_users',
        category: '보안/감사',
        name: '사용자 및 권한 관리',
        roles: {
          sponsor: false,
          pmo_head: false,
          pm: false,
          developer: false,
          qa: false,
          business_analyst: false,
          auditor: false,
          admin: true,
        },
      },
    ]);
  }

  async updateRolePermission(role: string, permissionId: string, granted: boolean) {
    return this.fetchWithFallback(`${V2}/permissions/role`, {
      method: 'PUT',
      body: JSON.stringify({ role, permissionId, granted }),
    }, { message: 'Permission updated' });
  }

  // ========== User Management API (Admin) ==========
  async getUsers() {
    const response = await this.fetchWithFallback(`${V2}/users`, {}, {
      data: [
        {
          id: 'user-001',
          name: '김철수',
          email: 'kim@example.com',
          department: 'IT기획팀',
          systemRole: 'user',
          legacyRole: 'pm',
          status: 'active',
          createdAt: '2024-01-15',
        },
        {
          id: 'user-002',
          name: '이영희',
          email: 'lee@example.com',
          department: '경영지원팀',
          systemRole: 'user',
          legacyRole: 'sponsor',
          status: 'active',
          createdAt: '2024-01-15',
        },
        {
          id: 'user-003',
          name: '박민수',
          email: 'park@example.com',
          department: 'PMO',
          systemRole: 'pmo',
          legacyRole: 'pmo_head',
          status: 'active',
          createdAt: '2024-02-01',
        },
        {
          id: 'user-004',
          name: '최영수',
          email: 'choi@example.com',
          department: '개발팀',
          systemRole: 'user',
          legacyRole: 'developer',
          status: 'active',
          createdAt: '2024-03-01',
        },
        {
          id: 'user-005',
          name: '정수진',
          email: 'jung@example.com',
          department: 'QA팀',
          systemRole: 'user',
          legacyRole: 'qa',
          status: 'active',
          createdAt: '2024-03-15',
        },
        {
          id: 'user-006',
          name: '한미영',
          email: 'han@example.com',
          department: '현업팀',
          systemRole: 'user',
          legacyRole: 'business_analyst',
          status: 'active',
          createdAt: '2024-04-01',
        },
        {
          id: 'user-007',
          name: '오현우',
          email: 'oh@example.com',
          department: '감사팀',
          systemRole: 'user',
          legacyRole: 'auditor',
          status: 'active',
          createdAt: '2024-04-15',
        },
        {
          id: 'user-admin',
          name: '관리자',
          email: 'admin@example.com',
          department: 'IT운영팀',
          systemRole: 'admin',
          legacyRole: 'admin',
          status: 'active',
          createdAt: '2024-01-01',
        },
      ],
    });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async getUser(userId: string) {
    const response = await this.fetchWithFallback(`${V2}/users/${userId}`, {}, {
      data: {
        id: userId,
        name: 'Unknown User',
        email: 'unknown@example.com',
        department: 'Unknown',
        systemRole: 'user',
        status: 'active',
      }
    });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async updateUserSystemRole(userId: string, systemRole: string) {
    const response = await this.fetchWithFallback(`/users/${userId}/system-role`, {
      method: 'PUT',
      body: JSON.stringify({ systemRole }),
    }, { data: { userId, systemRole, success: true } });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async assignPM(userId: string, projectIds: string[]) {
    const response = await this.fetchWithFallback(`/users/${userId}/assign-pm`, {
      method: 'POST',
      body: JSON.stringify({ projectIds }),
    }, { data: { userId, projectIds, role: 'pm', success: true } });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async revokePM(userId: string, projectId: string) {
    const response = await this.fetchWithFallback(`/users/${userId}/revoke-pm`, {
      method: 'POST',
      body: JSON.stringify({ projectId }),
    }, { data: { userId, projectId, success: true } });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async getUserProjectRoles(userId: string) {
    return this.fetchWithFallback(`/users/${userId}/project-roles`, {}, []);
  }

  async createUser(data: any) {
    const response = await this.fetchWithFallback(`${V2}/users`, {
      method: 'POST',
      body: JSON.stringify(data),
    }, { data: { ...data, id: `user-${Date.now()}` } });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async updateUser(userId: string, data: any) {
    const response = await this.fetchWithFallback(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, { data: { ...data, id: userId } });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async deleteUser(userId: string) {
    return this.fetchWithFallback(`/users/${userId}`, {
      method: 'DELETE',
    }, { success: true });
  }

  async updateUserStatus(userId: string, status: 'active' | 'inactive') {
    const response = await this.fetchWithFallback(`/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }, { data: { userId, status, success: true } });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  // ========== Meeting API ==========
  async getMeetings(projectId: string) {
    const response = await this.fetchWithFallback(`/projects/${projectId}/meetings`, {}, { data: [] });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async createMeeting(projectId: string, data: any) {
    const response = await this.fetchWithFallback(`/projects/${projectId}/meetings`, {
      method: 'POST',
      body: JSON.stringify(data),
    }, { data: { ...data, id: Date.now().toString() } });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async updateMeeting(projectId: string, meetingId: string, data: any) {
    const response = await this.fetchWithFallback(`/projects/${projectId}/meetings/${meetingId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, { data: { ...data, id: meetingId } });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async deleteMeeting(projectId: string, meetingId: string) {
    return this.fetchWithFallback(`/projects/${projectId}/meetings/${meetingId}`, {
      method: 'DELETE',
    }, { message: 'Meeting deleted' });
  }

  // ========== Issue API ==========
  async getIssues(projectId: string) {
    const response = await this.fetchWithFallback(`/projects/${projectId}/issues`, {}, { data: [] });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async createIssue(projectId: string, data: any) {
    const response = await this.fetchWithFallback(`/projects/${projectId}/issues`, {
      method: 'POST',
      body: JSON.stringify(data),
    }, { data: { ...data, id: Date.now().toString() } });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async updateIssue(projectId: string, issueId: string, data: any) {
    const response = await this.fetchWithFallback(`/projects/${projectId}/issues/${issueId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, { data: { ...data, id: issueId } });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async updateIssueStatus(projectId: string, issueId: string, status: string) {
    const response = await this.fetchWithFallback(`/projects/${projectId}/issues/${issueId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }, { data: { id: issueId, status } });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async deleteIssue(projectId: string, issueId: string) {
    return this.fetchWithFallback(`/projects/${projectId}/issues/${issueId}`, {
      method: 'DELETE',
    }, { message: 'Issue deleted' });
  }

  // ========== Education API ==========
  async getEducations() {
    const response = await this.fetchWithFallback(`${V2}/educations`, {}, { data: [] });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async getEducation(educationId: string) {
    const response = await this.fetchWithFallback(`${V2}/educations/${educationId}`, {}, { data: null });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async createEducation(data: any) {
    const response = await this.fetchWithFallback(`${V2}/educations`, {
      method: 'POST',
      body: JSON.stringify(data),
    }, { data: { ...data, id: Date.now().toString() } });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async updateEducation(educationId: string, data: any) {
    const response = await this.fetchWithFallback(`${V2}/educations/${educationId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, { data: { ...data, id: educationId } });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async deleteEducation(educationId: string) {
    return this.fetchWithFallback(`${V2}/educations/${educationId}`, {
      method: 'DELETE',
    }, { message: 'Education deleted' });
  }

  // ========== Education Session API ==========
  async getEducationSessions(educationId: string) {
    const response = await this.fetchWithFallback(`${V2}/educations/${educationId}/sessions`, {}, { data: [] });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async createEducationSession(educationId: string, data: any) {
    const response = await this.fetchWithFallback(`${V2}/educations/${educationId}/sessions`, {
      method: 'POST',
      body: JSON.stringify(data),
    }, { data: { ...data, id: Date.now().toString() } });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async updateEducationSession(educationId: string, sessionId: string, data: any) {
    const response = await this.fetchWithFallback(`${V2}/educations/${educationId}/sessions/${sessionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, { data: { ...data, id: sessionId } });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async deleteEducationSession(educationId: string, sessionId: string) {
    return this.fetchWithFallback(`${V2}/educations/${educationId}/sessions/${sessionId}`, {
      method: 'DELETE',
    }, { message: 'Session deleted' });
  }

  // ========== Education Roadmap API ==========
  async getEducationRoadmaps() {
    const response = await this.fetchWithFallback('/educations/roadmaps', {}, { data: [] });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async getEducationRoadmapsByRole(role: string) {
    const response = await this.fetchWithFallback(`/educations/roadmaps/role/${role}`, {}, { data: [] });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async createEducationRoadmap(data: any) {
    const response = await this.fetchWithFallback('/educations/roadmaps', {
      method: 'POST',
      body: JSON.stringify(data),
    }, { data: { ...data, id: Date.now().toString() } });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async updateEducationRoadmap(roadmapId: string, data: any) {
    const response = await this.fetchWithFallback(`/educations/roadmaps/${roadmapId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, { data: { ...data, id: roadmapId } });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async deleteEducationRoadmap(roadmapId: string) {
    return this.fetchWithFallback(`/educations/roadmaps/${roadmapId}`, {
      method: 'DELETE',
    }, { message: 'Roadmap deleted' });
  }

  // ========== Education History API ==========
  async getEducationHistoriesBySession(sessionId: string) {
    const response = await this.fetchWithFallback(`${V2}/education-histories/session/${sessionId}`, {}, { data: [] });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async getEducationHistoriesByParticipant(participantId: string) {
    const response = await this.fetchWithFallback(`${V2}/education-histories/participant/${participantId}`, {}, { data: [] });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async registerEducationParticipant(sessionId: string, data: any) {
    const response = await this.fetchWithFallback(`${V2}/education-histories/session/${sessionId}/register`, {
      method: 'POST',
      body: JSON.stringify(data),
    }, { data: { ...data, id: Date.now().toString() } });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async updateEducationHistory(historyId: string, data: any) {
    const response = await this.fetchWithFallback(`${V2}/education-histories/${historyId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, { data: { ...data, id: historyId } });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async cancelEducationRegistration(historyId: string) {
    return this.fetchWithFallback(`${V2}/education-histories/${historyId}`, {
      method: 'DELETE',
    }, { message: 'Registration cancelled' });
  }

  // ========== Requirement API ==========
  async getRequirements(projectId: string) {
    const mockRequirements = projectId === 'proj-001' ? [
      { id: 'req-001-01', code: 'REQ-AI-001', title: '문서 OCR 처리', description: '시스템은 스캔된 보험 문서에서 99% 정확도로 텍스트를 추출할 수 있어야 함', category: 'AI', priority: 'CRITICAL', status: 'APPROVED', progress: 60, linkedTaskIds: ['task-001-01', 'task-001-02'] },
      { id: 'req-001-02', code: 'REQ-AI-002', title: '사기 탐지 알고리즘', description: '설정 가능한 민감도 임계값을 가진 ML 기반 사기 탐지 구현', category: 'AI', priority: 'CRITICAL', status: 'ANALYZED', progress: 30, linkedTaskIds: ['task-001-09', 'task-001-10'] },
      { id: 'req-001-03', code: 'REQ-SI-001', title: '보험청구 관리 API', description: '보험청구 전체 생명주기 관리를 위한 RESTful API', category: 'FUNCTIONAL', priority: 'HIGH', status: 'IDENTIFIED', progress: 0, linkedTaskIds: ['task-001-11'] },
      { id: 'req-001-04', code: 'REQ-SI-002', title: '레거시 시스템 연동', description: 'ESB를 통한 기존 보험증권 관리 시스템과의 연동', category: 'INTEGRATION', priority: 'HIGH', status: 'IDENTIFIED', progress: 0, linkedTaskIds: [] },
      { id: 'req-001-05', code: 'REQ-SEC-001', title: '데이터 암호화', description: '모든 개인정보는 AES-256을 사용하여 저장 및 전송 시 암호화되어야 함', category: 'SECURITY', priority: 'CRITICAL', status: 'APPROVED', progress: 0, linkedTaskIds: [] },
      { id: 'req-001-06', code: 'REQ-NF-001', title: '성능 요구사항', description: '시스템은 2초 미만의 응답 시간으로 1000명의 동시 사용자를 처리할 수 있어야 함', category: 'NON_FUNCTIONAL', priority: 'HIGH', status: 'ANALYZED', progress: 0, linkedTaskIds: [] },
    ] : [
      { id: 'req-002-01', code: 'REQ-MOB-001', title: '사용자 인증', description: '모바일 앱을 위한 생체인식 및 비밀번호 기반 인증', category: 'SECURITY', priority: 'CRITICAL', status: 'IDENTIFIED', progress: 0, linkedTaskIds: [] },
      { id: 'req-002-02', code: 'REQ-MOB-002', title: '보험증권 대시보드', description: '대시보드에 모든 사용자 보험증권과 주요 정보 표시', category: 'FUNCTIONAL', priority: 'HIGH', status: 'IDENTIFIED', progress: 0, linkedTaskIds: [] },
      { id: 'req-002-03', code: 'REQ-MOB-003', title: '청구 제출', description: '사용자가 모바일에서 사진 업로드와 함께 청구를 제출할 수 있도록 허용', category: 'FUNCTIONAL', priority: 'CRITICAL', status: 'IDENTIFIED', progress: 0, linkedTaskIds: [] },
      { id: 'req-002-04', code: 'REQ-MOB-004', title: '푸시 알림', description: '청구 상태 업데이트를 위한 실시간 알림', category: 'FUNCTIONAL', priority: 'MEDIUM', status: 'IDENTIFIED', progress: 0, linkedTaskIds: [] },
      { id: 'req-002-05', code: 'REQ-MOB-005', title: '오프라인 모드', description: '앱은 오프라인에서 작동하고 연결 시 데이터 동기화 가능해야 함', category: 'NON_FUNCTIONAL', priority: 'MEDIUM', status: 'IDENTIFIED', progress: 0, linkedTaskIds: [] },
    ];
    const response = await this.fetchWithFallback(`${V2}/projects/${projectId}/requirements`, {}, { data: mockRequirements });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async getRequirement(projectId: string, requirementId: string) {
    const response = await this.fetchWithFallback(`${V2}/projects/${projectId}/requirements/${requirementId}`, {}, { data: null });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async createRequirement(projectId: string, data: any) {
    const response = await this.fetchWithFallback(`${V2}/projects/${projectId}/requirements`, {
      method: 'POST',
      body: JSON.stringify(data),
    }, { data: { ...data, id: Date.now().toString(), code: `REQ-${Date.now()}` } });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async updateRequirement(projectId: string, requirementId: string, data: any) {
    const response = await this.fetchWithFallback(`${V2}/projects/${projectId}/requirements/${requirementId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, { data: { ...data, id: requirementId } });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async deleteRequirement(projectId: string, requirementId: string) {
    return this.fetchWithFallback(`${V2}/projects/${projectId}/requirements/${requirementId}`, {
      method: 'DELETE',
    }, { message: 'Requirement deleted' });
  }

  async linkRequirementToTask(projectId: string, requirementId: string, taskId: string) {
    const response = await this.fetchWithFallback(`${V2}/projects/${projectId}/requirements/${requirementId}/link-task`, {
      method: 'POST',
      body: JSON.stringify({ taskId }),
    }, { data: { requirementId, taskId, linked: true } });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async unlinkRequirementFromTask(projectId: string, requirementId: string, taskId: string) {
    return this.fetchWithFallback(`${V2}/projects/${projectId}/requirements/${requirementId}/unlink-task/${taskId}`, {
      method: 'DELETE',
    }, { message: 'Task unlinked' });
  }

  // ========== RFP CRUD API ==========
  async getRfps(projectId: string) {
    const mockRfps = projectId === 'proj-001' ? [
      { id: 'rfp-001', title: 'AI 보험심사 처리 시스템 RFP', content: 'AI 기반 보험 청구 처리 시스템 개발을 위한 제안요청서. 주요 요구사항: 자동 문서 분석, 사기 탐지 기능, 기존 시스템과의 연동, 보험 규정 준수.', status: 'APPROVED', processingStatus: 'COMPLETED', createdAt: '2026-01-10T09:00:00Z', updatedAt: '2026-01-15T14:30:00Z' },
    ] : [
      { id: 'rfp-002', title: '모바일 보험 플랫폼 RFP', content: '보험 서비스를 위한 종합 모바일 플랫폼 구축 제안요청서. 필수 포함사항: 보험증권 관리, 청구 제출, 실시간 알림, 보안 인증, 오프라인 기능.', status: 'SUBMITTED', processingStatus: 'PENDING', createdAt: '2026-01-20T10:00:00Z', updatedAt: '2026-01-20T10:00:00Z' },
    ];
    const response = await this.fetchWithFallback(`${V2}/projects/${projectId}/rfps`, {}, { data: mockRfps });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async getRfp(projectId: string, rfpId: string) {
    const response = await this.fetchWithFallback(`${V2}/projects/${projectId}/rfps/${rfpId}`, {}, { data: null });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async createRfp(projectId: string, data: { title: string; content?: string; status: string; processingStatus: string }) {
    const rfpId = `rfp-${Date.now()}`;
    const response = await this.fetchWithFallback(`${V2}/projects/${projectId}/rfps`, {
      method: 'POST',
      body: JSON.stringify(data),
    }, {
      data: {
        id: rfpId,
        projectId,
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async updateRfp(projectId: string, rfpId: string, data: Partial<{ title: string; content: string; status: string }>) {
    const response = await this.fetchWithFallback(`${V2}/projects/${projectId}/rfps/${rfpId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, { data: { id: rfpId, ...data, updatedAt: new Date().toISOString() } });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async deleteRfp(projectId: string, rfpId: string) {
    return this.fetchWithFallback(`${V2}/projects/${projectId}/rfps/${rfpId}`, {
      method: 'DELETE',
    }, { message: 'RFP deleted' });
  }

  async uploadRfpFile(projectId: string, file: File, title?: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);

    try {
      const headers: HeadersInit = {};
      if (this.token) headers.Authorization = `Bearer ${this.token}`;

      // Use 5 minute timeout for file uploads (large files may take time)
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/rfps/upload`, {
        method: 'POST',
        headers,
        body: formData,
        signal: AbortSignal.timeout(300000),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return data && typeof data === 'object' && 'data' in data ? data.data : data;
    } catch (error) {
      console.warn('RFP upload failed, using mock:', error);
      return {
        id: `rfp-${Date.now()}`,
        projectId,
        title: title || file.name.replace(/\.[^/.]+$/, ''),
        fileName: file.name,
        fileSize: file.size,
        status: 'DRAFT',
        processingStatus: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  }

  async extractRequirements(projectId: string, rfpId: string, content?: string) {
    const response = await this.fetchWithFallback(`${V2}/projects/${projectId}/rfps/${rfpId}/extract`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }, {
      data: {
        rfpId,
        status: 'EXTRACTING',
        message: 'Requirement extraction started',
      }
    });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async getRfpProcessingStatus(projectId: string, rfpId: string) {
    const response = await this.fetchWithFallback(`${V2}/projects/${projectId}/rfps/${rfpId}/status`, {}, {
      data: {
        rfpId,
        status: 'COMPLETED',
        requirementCount: 10,
        processingTime: '2m 30s',
      }
    });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  // ========== RFP Auto-Classification API ==========
  async classifyRfpRequirements(projectId: string, rfpId: string) {
    const response = await this.fetchWithFallback(`${V2}/projects/${projectId}/rfps/${rfpId}/classify`, {
      method: 'POST',
    }, {
      data: {
        aiCount: 3,
        siCount: 3,
        commonCount: 2,
        nonFunctionalCount: 2,
        message: 'Requirements classified successfully'
      }
    });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  // ========== Lineage API ==========
  // Backend uses /api/v2/projects/{projectId}/lineage/* pattern
  async getLineageGraph(projectId: string) {
    const response = await this.fetchWithFallback(`${V2}/projects/${projectId}/lineage/graph`, {}, {
      nodes: [],
      edges: [],
      statistics: {
        requirements: 0,
        stories: 0,
        tasks: 0,
        sprints: 0,
        coverage: 0,
        linkedRequirements: 0,
        unlinkedRequirements: 0,
      },
    });
    return response;
  }

  async getLineageTimeline(
    projectId: string,
    params?: {
      aggregateType?: string;
      since?: string;
      until?: string;
      userId?: string;
      page?: number;
      size?: number;
    }
  ) {
    const queryParams = new URLSearchParams();
    if (params?.aggregateType) queryParams.append('aggregateType', params.aggregateType);
    if (params?.since) queryParams.append('since', params.since);
    if (params?.until) queryParams.append('until', params.until);
    if (params?.userId) queryParams.append('userId', params.userId);
    if (params?.page !== undefined) queryParams.append('page', params.page.toString());
    if (params?.size !== undefined) queryParams.append('size', params.size.toString());

    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';

    const response = await this.fetchWithFallback(`${V2}/projects/${projectId}/lineage/timeline${query}`, {}, {
      content: [],
      totalElements: 0,
      totalPages: 0,
      number: 0,
      size: 20,
    });
    return response;
  }

  async getEntityHistory(aggregateType: string, aggregateId: string) {
    const response = await this.fetchWithFallback(
      `${V2}/lineage/history/${aggregateType}/${aggregateId}`,
      {},
      []
    );
    return response;
  }

  async getLineageUpstream(aggregateType: string, aggregateId: string, depth: number = 3) {
    const response = await this.fetchWithFallback(
      `${V2}/lineage/upstream/${aggregateType}/${aggregateId}?depth=${depth}`,
      {},
      { nodes: [], edges: [], maxDepth: 0, totalNodes: 0 }
    );
    return response;
  }

  async getLineageDownstream(aggregateType: string, aggregateId: string, depth: number = 3) {
    const response = await this.fetchWithFallback(
      `${V2}/lineage/downstream/${aggregateType}/${aggregateId}?depth=${depth}`,
      {},
      { nodes: [], edges: [], maxDepth: 0, totalNodes: 0 }
    );
    return response;
  }

  async getImpactAnalysis(aggregateType: string, aggregateId: string) {
    const response = await this.fetchWithFallback(
      `${V2}/lineage/impact/${aggregateType}/${aggregateId}`,
      {},
      {
        sourceId: aggregateId,
        sourceType: aggregateType,
        sourceTitle: '',
        impactedStories: 0,
        impactedTasks: 0,
        impactedSprints: 0,
        directImpacts: [],
        indirectImpacts: [],
        affectedSprintNames: [],
      }
    );
    return response;
  }

  async getLineageStatistics(projectId: string) {
    const response = await this.fetchWithFallback(`${V2}/projects/${projectId}/lineage/statistics`, {}, {
      requirements: 0,
      stories: 0,
      tasks: 0,
      sprints: 0,
      coverage: 0,
      linkedRequirements: 0,
      unlinkedRequirements: 0,
    });
    return response;
  }

  async sendChatMessage(params: {
    sessionId?: string | null;
    message: string;
    projectId?: string | null;
    userRole?: string;
    userAccessLevel?: number;
  }) {
    // Chat API needs longer timeout for LLM response
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      };

      let response = await fetch(`${API_BASE_URL}${V2}/chat/message`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sessionId: params.sessionId ?? null,
          message: params.message,
          projectId: params.projectId ?? null,
          userRole: params.userRole ?? null,
          userAccessLevel: params.userAccessLevel ?? null,
        }),
        signal: AbortSignal.timeout(120000), // 120 seconds for LLM response
      });

      // If session not found (404), retry without sessionId to create new session
      if (response.status === 404 && params.sessionId) {
        console.warn('Session not found, creating new session...');
        response = await fetch(`${API_BASE_URL}${V2}/chat/message`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            sessionId: null,
            message: params.message,
            projectId: params.projectId ?? null,
            userRole: params.userRole ?? null,
            userAccessLevel: params.userAccessLevel ?? null,
          }),
          signal: AbortSignal.timeout(120000),
        });
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // If successful, mark backend as available
      if (this.useMockData) {
        console.log('Backend is now available');
        this.useMockData = false;
      }

      const data = await response.json();

      // Extract data field if present
      if (data && typeof data === 'object' && 'data' in data) {
        return data.data;
      }

      return data;
    } catch (error) {
      console.warn('Chat API call failed, using mock data:', error);
      return {
        sessionId: params.sessionId ?? 'mock-session',
        reply: '안녕하세요! PMS AI 어시스턴트입니다. 현재 Mock 모드로 동작 중입니다.',
        confidence: 0.95,
        suggestions: [
          '프로젝트 진행률 확인',
          '할당된 태스크 조회',
          '이번 스프린트 목표 확인',
        ],
      };
    }
  }

  // ========== WIP Validation API ==========
  async validateColumnWipLimit(columnId: string, allowSoftLimitExceeding: boolean = false) {
    const response = await this.fetchWithFallback(
      `/wip/validate/column/${columnId}?allowSoftLimitExceeding=${allowSoftLimitExceeding}`,
      {},
      { isValid: true, violationType: null }
    );
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async validateSprintConwip(sprintId: string) {
    const response = await this.fetchWithFallback(
      `/wip/validate/sprint/${sprintId}`,
      {},
      { isValid: true, violationType: null }
    );
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async validatePersonalWipLimit(assigneeId: string, maxWip: number) {
    const response = await this.fetchWithFallback(
      `/wip/validate/personal/${assigneeId}?maxWip=${maxWip}`,
      {},
      { isValid: true, violationType: null }
    );
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async getProjectWipStatus(projectId: string) {
    const response = await this.fetchWithFallback(
      `/wip/status/project/${projectId}`,
      {},
      {
        projectId,
        totalWip: 0,
        columnStatuses: [],
        bottleneckCount: 0,
      }
    );
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async getColumnWipStatus(columnId: string) {
    const response = await this.fetchWithFallback(
      `/wip/status/column/${columnId}`,
      {},
      {
        columnId,
        columnName: 'Column',
        currentWip: 0,
        wipLimitSoft: null,
        wipLimitHard: null,
        isBottleneck: false,
        health: 'GREEN',
      }
    );
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async getSprintWipStatus(sprintId: string) {
    const response = await this.fetchWithFallback(
      `/wip/status/sprint/${sprintId}`,
      {},
      {
        sprintId,
        sprintName: 'Sprint',
        currentWip: 0,
        conwipLimit: null,
        wipValidationEnabled: false,
        health: 'GREEN',
      }
    );
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  // ========== Progress API ==========
  async getProjectProgress(projectId: string) {
    const response = await this.fetchWithFallback(
      `/projects/${projectId}/progress`,
      {},
      []
    );
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async getRequirementProgress(requirementId: string) {
    const response = await this.fetchWithFallback(
      `/requirements/${requirementId}/progress`,
      {},
      { id: requirementId, progressPercentage: 0, progressStage: 'NOT_STARTED' }
    );
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  // ========== Weekly Report API ==========
  async generateProjectWeeklyReport(projectId: string, weekStartDate: string, userId: string) {
    const response = await this.fetchWithFallback(
      `/weekly-reports/project/${projectId}?weekStartDate=${weekStartDate}&userId=${userId}`,
      { method: 'POST' },
      { id: `report-${Date.now()}`, projectId, weekStartDate }
    );
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async generateSprintWeeklyReport(sprintId: string, weekStartDate: string, userId: string) {
    const response = await this.fetchWithFallback(
      `/weekly-reports/sprint/${sprintId}?weekStartDate=${weekStartDate}&userId=${userId}`,
      { method: 'POST' },
      { id: `report-${Date.now()}`, sprintId, weekStartDate }
    );
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async getProjectWeeklyReports(projectId: string) {
    const response = await this.fetchWithFallback(
      `/weekly-reports/project/${projectId}`,
      {},
      { data: [] }
    );
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async getSprintWeeklyReports(sprintId: string) {
    const response = await this.fetchWithFallback(
      `/weekly-reports/sprint/${sprintId}`,
      {},
      { data: [] }
    );
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async getWeeklyReport(reportId: string) {
    const response = await this.fetchWithFallback(
      `/weekly-reports/${reportId}`,
      {},
      { id: reportId }
    );
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async deleteWeeklyReport(reportId: string) {
    return this.fetchWithFallback(
      `/weekly-reports/${reportId}`,
      { method: 'DELETE' },
      { message: 'Report deleted' }
    );
  }

  // Weekly Reports by Project (used by useWeeklyReports.ts)
  async getWeeklyReports(projectId: string) {
    const response = await this.fetchWithFallback(
      `/weekly-reports/project/${projectId}`,
      {},
      { data: [] }
    );
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async createWeeklyReport(projectId: string, data: { periodStart: string; periodEnd: string; content: string; status: string }) {
    const response = await this.fetchWithFallback(
      `/weekly-reports`,
      {
        method: 'POST',
        body: JSON.stringify({ ...data, projectId }),
      },
      { id: `report-${Date.now()}`, ...data, projectId }
    );
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async generateAiReport(projectId: string, startDate: string, endDate: string, context?: string) {
    const response = await this.fetchWithFallback(
      `${V2}/reports/generate`,
      {
        method: 'POST',
        body: JSON.stringify({ projectId, startDate, endDate, context }),
      },
      { content: 'AI generated report content', generatedAt: new Date().toISOString() }
    );
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  // ========== RAG Admin API ==========
  async getRagDocuments() {
    const response = await this.fetchWithFallback(
      '/admin/rag/documents',
      {},
      { documents: [], total: 0 }
    );
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async getRagStats() {
    const response = await this.fetchWithFallback(
      '/admin/rag/stats',
      {},
      { document_count: 0, chunk_count: 0, categories: {}, loading_status: {} }
    );
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async getRagFiles() {
    const response = await this.fetchWithFallback(
      '/admin/rag/files',
      {},
      { files: [], total: 0, ragdata_dir: '' }
    );
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async loadRagDocuments(files?: string[], clearExisting?: boolean) {
    const response = await this.fetchWithFallback(
      '/admin/rag/load',
      {
        method: 'POST',
        body: JSON.stringify({ files, clearExisting }),
      },
      { message: 'Loading started' }
    );
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async getRagLoadingStatus() {
    const response = await this.fetchWithFallback(
      '/admin/rag/load/status',
      {},
      { is_loading: false, progress: 0 }
    );
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async deleteRagDocument(docId: string) {
    const response = await this.fetchWithFallback(
      `/admin/rag/documents/${encodeURIComponent(docId)}`,
      { method: 'DELETE' },
      { message: 'Document deleted' }
    );
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async clearAllRagDocuments() {
    const response = await this.fetchWithFallback(
      '/admin/rag/documents',
      {
        method: 'DELETE',
        body: JSON.stringify({ confirm: true }),
      },
      { message: 'All documents cleared', deleted_count: 0 }
    );
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  // ========== DB Admin API ==========
  async triggerDbSync(syncType: 'full' | 'incremental' = 'full') {
    const response = await this.fetchWithFallback(
      '/admin/db/sync',
      {
        method: 'POST',
        body: JSON.stringify({ syncType }),
      },
      { message: 'Sync started', sync_type: syncType }
    );
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async getDbSyncStatus() {
    const response = await this.fetchWithFallback(
      '/admin/db/sync/status',
      {},
      { is_syncing: false, sync_type: null, current_entity: null, progress: 0, started_at: null, error: null }
    );
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async getDbSyncHistory(limit: number = 10) {
    const response = await this.fetchWithFallback(
      `/admin/db/sync/history?limit=${limit}`,
      {},
      { data: [] }
    );
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async createDbBackup(backupType: 'POSTGRES' | 'NEO4J' | 'FULL' = 'FULL') {
    const response = await this.fetchWithFallback(
      '/admin/db/backup',
      {
        method: 'POST',
        body: JSON.stringify({ backupType }),
      },
      { message: 'Backup started', backup_type: backupType }
    );
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async getDbBackupStatus() {
    const response = await this.fetchWithFallback(
      '/admin/db/backup/status',
      {},
      { is_running: false, backup_type: null, backup_name: null, progress: 0, started_at: null }
    );
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async getDbBackups(limit: number = 20) {
    const response = await this.fetchWithFallback(
      `/admin/db/backups?limit=${limit}`,
      {},
      { data: [] }
    );
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async restoreDbBackup(backupId: string) {
    const response = await this.fetchWithFallback(
      `/admin/db/restore/${backupId}`,
      {
        method: 'POST',
        body: JSON.stringify({ confirm: true }),
      },
      { message: 'Restore started', backup_id: backupId }
    );
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async deleteDbBackup(backupId: string) {
    const response = await this.fetchWithFallback(
      `/admin/db/backups/${backupId}`,
      { method: 'DELETE' },
      { message: 'Backup deleted', backup_id: backupId }
    );
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async getDbStats() {
    const response = await this.fetchWithFallback(
      '/admin/db/stats',
      {},
      {
        postgres: { tables: 0, total_rows: 0, size_bytes: 0 },
        neo4j: { nodes: 0, relationships: 0, labels: [] },
        last_sync_at: null,
        last_backup_at: null,
      }
    );
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  // ========== WBS API ==========
  async getWbsGroups(phaseId: string) {
    const response = await this.fetchWithFallback(`/phases/${phaseId}/wbs-groups`, {}, { data: getMockWbsGroups(phaseId) });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async getWbsGroup(groupId: string) {
    const response = await this.fetchWithFallback(`/wbs/groups/${groupId}`, {}, { data: null });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async createWbsGroup(phaseId: string, data: any) {
    const response = await this.fetchWithFallback(`/phases/${phaseId}/wbs-groups`, {
      method: 'POST',
      body: JSON.stringify(data),
    }, { data: { ...data, id: `wbs-grp-${Date.now()}` } });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async updateWbsGroup(groupId: string, data: any) {
    const response = await this.fetchWithFallback(`/wbs/groups/${groupId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, { data: { ...data, id: groupId } });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async deleteWbsGroup(groupId: string) {
    // Use strict fetch for DELETE to ensure we know if deletion actually succeeded
    return this.fetchStrict(`/wbs/groups/${groupId}`, {
      method: 'DELETE',
    });
  }

  async getWbsItems(groupId: string) {
    const response = await this.fetchWithFallback(`/wbs/groups/${groupId}/items`, {}, { data: getMockWbsItems(groupId) });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async getWbsItem(itemId: string) {
    const response = await this.fetchWithFallback(`/wbs/items/${itemId}`, {}, { data: null });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async createWbsItem(groupId: string, data: any) {
    const response = await this.fetchWithFallback(`/wbs/groups/${groupId}/items`, {
      method: 'POST',
      body: JSON.stringify(data),
    }, { data: { ...data, id: `wbs-item-${Date.now()}` } });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async updateWbsItem(itemId: string, data: any) {
    const response = await this.fetchWithFallback(`/wbs/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, { data: { ...data, id: itemId } });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async deleteWbsItem(itemId: string) {
    return this.fetchWithFallback(`/wbs/items/${itemId}`, {
      method: 'DELETE',
    }, { message: 'WBS Item deleted' });
  }

  async getWbsTasks(itemId: string) {
    const response = await this.fetchWithFallback(`/wbs/items/${itemId}/tasks`, {}, { data: getMockWbsTasks(itemId) });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async getWbsTask(taskId: string) {
    const response = await this.fetchWithFallback(`/wbs/tasks/${taskId}`, {}, { data: null });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async createWbsTask(itemId: string, data: any) {
    const response = await this.fetchWithFallback(`/wbs/items/${itemId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    }, { data: { ...data, id: `wbs-task-${Date.now()}` } });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async updateWbsTask(taskId: string, data: any) {
    const response = await this.fetchWithFallback(`/wbs/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, { data: { ...data, id: taskId } });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async deleteWbsTask(taskId: string) {
    return this.fetchWithFallback(`/wbs/tasks/${taskId}`, {
      method: 'DELETE',
    }, { message: 'WBS Task deleted' });
  }

  // ========== WBS Full Tree (single-request optimization) ==========
  async getWbsFullTree(projectId: string) {
    const response = await this.fetchWithFallback(
      `/projects/${projectId}/wbs/full-tree`, {},
      { data: { groups: [], items: [], tasks: [] } }
    );
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  // ========== WBS Dependency API ==========
  async getWbsDependencies(projectId: string) {
    const response = await this.fetchWithFallback(`/projects/${projectId}/wbs/dependencies`, {}, { data: [] });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async createWbsDependency(projectId: string, data: {
    predecessorType: string;
    predecessorId: string;
    successorType: string;
    successorId: string;
    dependencyType?: string;
    lagDays?: number;
  }) {
    const response = await this.fetchWithFallback(`/projects/${projectId}/wbs/dependencies`, {
      method: 'POST',
      body: JSON.stringify(data),
    }, { data: { ...data, id: `wbs-dep-${Date.now()}`, projectId } });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async deleteWbsDependency(projectId: string, dependencyId: string) {
    return this.fetchWithFallback(`/projects/${projectId}/wbs/dependencies/${dependencyId}`, {
      method: 'DELETE',
    }, { message: 'WBS Dependency deleted' });
  }

  // ========== Critical Path API ==========
  async getCriticalPath(projectId: string) {
    const response = await this.fetchWithFallback(`/projects/${projectId}/wbs/critical-path`, {}, {
      data: {
        criticalPath: [],
        itemsWithFloat: {},
        projectDuration: 0,
        calculatedAt: new Date().toISOString(),
      }
    });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async refreshCriticalPath(projectId: string) {
    const response = await this.fetchWithFallback(`/projects/${projectId}/wbs/critical-path/refresh`, {
      method: 'POST',
    }, {
      data: {
        criticalPath: [],
        itemsWithFloat: {},
        projectDuration: 0,
        calculatedAt: new Date().toISOString(),
      }
    });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  // ========== Feature API ==========
  async getFeatures(epicId: string) {
    const response = await this.fetchWithFallback(`/epics/${epicId}/features`, {}, { data: [] });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async getFeaturesByWbsGroup(wbsGroupId: string) {
    const response = await this.fetchWithFallback(`/wbs/groups/${wbsGroupId}/features`, {}, { data: [] });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async getUnlinkedFeatures(epicId: string) {
    const response = await this.fetchWithFallback(`/epics/${epicId}/features/unlinked`, {}, { data: [] });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async getFeature(featureId: string) {
    const response = await this.fetchWithFallback(`/features/${featureId}`, {}, { data: null });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async createFeature(epicId: string, data: any) {
    const response = await this.fetchWithFallback(`/epics/${epicId}/features`, {
      method: 'POST',
      body: JSON.stringify(data),
    }, { data: { ...data, id: `feature-${Date.now()}` } });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async updateFeature(featureId: string, data: any) {
    const response = await this.fetchWithFallback(`/features/${featureId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, { data: { ...data, id: featureId } });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async deleteFeature(featureId: string) {
    return this.fetchWithFallback(`/features/${featureId}`, {
      method: 'DELETE',
    }, { message: 'Feature deleted' });
  }

  async linkFeatureToWbsGroup(featureId: string, wbsGroupId: string) {
    const response = await this.fetchWithFallback(`/features/${featureId}/link-wbs-group/${wbsGroupId}`, {
      method: 'POST',
    }, { data: { featureId, wbsGroupId } });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async unlinkFeatureFromWbsGroup(featureId: string) {
    const response = await this.fetchWithFallback(`/features/${featureId}/link-wbs-group`, {
      method: 'DELETE',
    }, { data: { featureId } });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  // ========== Template API ==========
  async getTemplateSets(category?: string) {
    const params = category ? `?category=${category}` : '';
    // Use DEFAULT_TEMPLATES as fallback when backend is unavailable
    const fallbackData = category
      ? DEFAULT_TEMPLATES.filter(t => t.category === category)
      : DEFAULT_TEMPLATES;
    const response = await this.fetchWithFallback(`/templates${params}`, {}, { data: fallbackData });
    const result = response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
    // If empty array from backend, return default templates
    if (Array.isArray(result) && result.length === 0) {
      return fallbackData;
    }
    return result;
  }

  async getTemplateSet(templateSetId: string) {
    // Check default templates first for fallback
    const defaultTemplate = getDefaultTemplateById(templateSetId);
    const response = await this.fetchWithFallback(`/templates/${templateSetId}`, {}, { data: defaultTemplate || null });
    const result = response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
    // If null from backend, try default template
    if (!result && defaultTemplate) {
      return defaultTemplate;
    }
    return result;
  }

  async createTemplateSet(data: any) {
    const response = await this.fetchWithFallback('/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }, { data: { ...data, id: `tmpl-${Date.now()}` } });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async deleteTemplateSet(templateSetId: string) {
    return this.fetchWithFallback(`/templates/${templateSetId}`, {
      method: 'DELETE',
    }, { message: 'Template Set deleted' });
  }

  async updateTemplateSet(templateSetId: string, data: any) {
    // Store in localStorage as fallback since backend may not support this yet
    const storageKey = `template_${templateSetId}`;
    const updatedTemplate = {
      ...data,
      id: templateSetId,
      updatedAt: new Date().toISOString(),
    };

    try {
      const response = await this.fetchWithFallback(`/templates/${templateSetId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }, { data: updatedTemplate });

      // Also save to localStorage for persistence
      localStorage.setItem(storageKey, JSON.stringify(updatedTemplate));

      return response && typeof response === 'object' && 'data' in response
        ? (response as any).data
        : updatedTemplate;
    } catch {
      // Fallback: save to localStorage only
      localStorage.setItem(storageKey, JSON.stringify(updatedTemplate));
      return updatedTemplate;
    }
  }

  async applyTemplate(templateSetId: string, projectId: string, startDate?: string) {
    const params = new URLSearchParams({ projectId });
    if (startDate) params.append('startDate', startDate);
    const response = await this.fetchWithFallback(`/templates/${templateSetId}/apply?${params}`, {
      method: 'POST',
    }, { message: 'Template applied successfully' });
    return response;
  }

  // Apply a template to a specific phase (creates WBS structure)
  async applyTemplateToPhase(templateSetId: string, phaseId: string, projectId: string) {
    // Get the template
    const template = await this.getTemplateSet(templateSetId);
    if (!template) {
      throw new Error('Template not found');
    }

    if (!template.phases || template.phases.length === 0) {
      throw new Error('Template has no phases defined');
    }

    // Get the current phase to find its order
    const phases = await this.getPhases(projectId) as any[];
    const currentPhase = phases.find((p) => p.id === phaseId);

    if (!currentPhase) {
      throw new Error('Phase not found');
    }

    // Try to match template phase by:
    // 1. Phase orderNum (0-indexed in template, may be 1-indexed in phase)
    // 2. Fall back to first template phase if no match
    const phaseOrder = (currentPhase.orderNum ?? currentPhase.order ?? 0) as number;
    let phaseTemplate = template.phases.find((p: any) => p.relativeOrder === phaseOrder + 1);

    // If not found by order+1, try exact match
    if (!phaseTemplate) {
      phaseTemplate = template.phases.find((p: any) => p.relativeOrder === phaseOrder);
    }

    // Fall back to first template phase
    if (!phaseTemplate) {
      phaseTemplate = template.phases[0];
    }

    // Create WBS groups, items, and tasks from the template
    const createdGroups: any[] = [];
    const phaseCode = (currentPhase.code || `${phaseOrder + 1}`) as string;

    for (const groupTemplate of phaseTemplate.wbsGroups || []) {
      // Create group
      const group = await this.createWbsGroup(phaseId, {
        code: `${phaseCode}.${groupTemplate.relativeOrder}`,
        name: groupTemplate.name,
        description: groupTemplate.description,
        weight: groupTemplate.defaultWeight || 100,
        status: 'NOT_STARTED',
        progress: 0,
      });

      // Create items for this group
      for (const itemTemplate of groupTemplate.items || []) {
        const item = await this.createWbsItem(group.id, {
          code: `${group.code}.${itemTemplate.relativeOrder}`,
          name: itemTemplate.name,
          description: itemTemplate.description,
          weight: itemTemplate.defaultWeight || 100,
          estimatedHours: itemTemplate.estimatedHours,
          phaseId: phaseId,
          status: 'NOT_STARTED',
          progress: 0,
        });

        // Create tasks for this item
        for (const taskTemplate of itemTemplate.tasks || []) {
          await this.createWbsTask(item.id, {
            code: `${item.code}.${taskTemplate.relativeOrder}`,
            name: taskTemplate.name,
            description: taskTemplate.description || '',
            weight: taskTemplate.defaultWeight || 100,
            estimatedHours: taskTemplate.estimatedHours,
            groupId: group.id,
            phaseId: phaseId,
            status: 'NOT_STARTED',
            progress: 0,
          });
        }
      }

      createdGroups.push(group);
    }

    return {
      success: true,
      message: `템플릿 "${phaseTemplate.name}"이(가) 적용되었습니다. ${createdGroups.length}개 그룹 생성됨.`,
      createdGroups: createdGroups.length,
    };
  }

  // ========== Integration API ==========
  async linkEpicToPhase(epicId: string, phaseId: string) {
    const response = await this.fetchWithFallback(`/integration/epic-phase?epicId=${epicId}&phaseId=${phaseId}`, {
      method: 'POST',
    }, { message: 'Epic linked to Phase successfully' });
    return response;
  }

  async unlinkEpicFromPhase(epicId: string) {
    const response = await this.fetchWithFallback(`/integration/epic-phase/${epicId}`, {
      method: 'DELETE',
    }, { message: 'Epic unlinked from Phase successfully' });
    return response;
  }

  async getEpicsByPhase(phaseId: string) {
    const response = await this.fetchWithFallback(`/integration/phases/${phaseId}/epics`, {}, { data: [] });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async getUnlinkedEpics(projectId: string) {
    const response = await this.fetchWithFallback(`/integration/projects/${projectId}/epics/unlinked`, {}, { data: [] });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async linkFeatureToWbsGroupIntegration(featureId: string, wbsGroupId: string) {
    const response = await this.fetchWithFallback(`/integration/feature-group?featureId=${featureId}&wbsGroupId=${wbsGroupId}`, {
      method: 'POST',
    }, { message: 'Feature linked to WBS Group successfully' });
    return response;
  }

  async unlinkFeatureFromWbsGroupIntegration(featureId: string) {
    const response = await this.fetchWithFallback(`/integration/feature-group/${featureId}`, {
      method: 'DELETE',
    }, { message: 'Feature unlinked from WBS Group successfully' });
    return response;
  }

  async getFeaturesByWbsGroupIntegration(wbsGroupId: string) {
    const response = await this.fetchWithFallback(`/integration/wbs-groups/${wbsGroupId}/features`, {}, { data: [] });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async linkStoryToWbsItem(storyId: string, wbsItemId: string) {
    const response = await this.fetchWithFallback(`/integration/story-item?storyId=${storyId}&wbsItemId=${wbsItemId}`, {
      method: 'POST',
    }, { message: 'Story linked to WBS Item successfully' });
    return response;
  }

  async unlinkStoryFromWbsItem(storyId: string) {
    const response = await this.fetchWithFallback(`/integration/story-item/${storyId}`, {
      method: 'DELETE',
    }, { message: 'Story unlinked from WBS Item successfully' });
    return response;
  }

  async getStoriesByWbsItem(wbsItemId: string) {
    const response = await this.fetchWithFallback(`/integration/wbs-items/${wbsItemId}/stories`, {}, { data: [] });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async getUnlinkedStories(projectId: string) {
    const response = await this.fetchWithFallback(`/integration/projects/${projectId}/stories/unlinked`, {}, { data: [] });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  async getPhaseIntegrationSummary(phaseId: string, projectId: string) {
    const response = await this.fetchWithFallback(`/integration/phases/${phaseId}/summary?projectId=${projectId}`, {}, {
      data: {
        phaseId,
        linkedEpicCount: 0,
        wbsGroupCount: 0,
        linkedFeatureCount: 0,
        linkedStoryCount: 0,
      }
    });
    return response && typeof response === 'object' && 'data' in response ? (response as any).data : response;
  }

  // ========== Requirements Excel Import/Export ==========

  /**
   * Download requirements Excel template
   */
  async downloadRequirementTemplate(projectId: string): Promise<Blob | null> {
        if (this.useMockData) {
      return null;
    }
    const headers: HeadersInit = {
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
    };

    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/requirements/excel/template`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Download template failed:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.blob();
    } catch (error) {
      console.error('Failed to download requirement template:', error);
      throw error;
    }
  }

  /**
   * Export requirements to Excel
   */
  async exportRequirementsToExcel(projectId: string): Promise<Blob | null> {
    const headers: HeadersInit = {
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
    };

    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/requirements/excel/export`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Export requirements failed:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.blob();
    } catch (error) {
      console.error('Failed to export requirements to Excel:', error);
      throw error;
    }
  }

  /**
   * Import requirements from Excel file
   */
  async importRequirementsFromExcel(projectId: string, file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);

    return this.fetchWithFallback(
      `/projects/${projectId}/requirements/excel/import`,
      {
        method: 'POST',
        body: formData,
      },
      {
        totalRows: 0,
        successCount: 0,
        createCount: 0,
        updateCount: 0,
        errorCount: 0,
        errors: [],
      }
    );
  }

  // ========== WBS Excel Import/Export ==========

  /**
   * Download WBS Excel template
   */
  async downloadWbsTemplate(projectId: string): Promise<Blob | null> {
    const headers: HeadersInit = {
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
    };

    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/wbs/excel/template`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Download WBS template failed:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.blob();
    } catch (error) {
      console.error('Failed to download WBS template:', error);
      throw error;
    }
  }

  /**
   * Export WBS to Excel
   */
  async exportWbsToExcel(projectId: string): Promise<Blob | null> {
    const headers: HeadersInit = {
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
    };

    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/wbs/excel/export`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Export WBS failed:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.blob();
    } catch (error) {
      console.error('Failed to export WBS to Excel:', error);
      throw error;
    }
  }

  /**
   * Export WBS by phase to Excel
   */
  async exportWbsByPhaseToExcel(phaseId: string): Promise<Blob | null> {
    const headers: HeadersInit = {
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
    };

    try {
      const response = await fetch(`${API_BASE_URL}/phases/${phaseId}/wbs/excel/export`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Export WBS by phase failed:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.blob();
    } catch (error) {
      console.error('Failed to export WBS by phase to Excel:', error);
      throw error;
    }
  }

  /**
   * Import WBS from Excel file
   */
  async importWbsFromExcel(projectId: string, file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);

    return this.fetchWithFallback(
      `/projects/${projectId}/wbs/excel/import`,
      {
        method: 'POST',
        body: formData,
      },
      {
        totalRows: 0,
        successCount: 0,
        createCount: 0,
        updateCount: 0,
        errorCount: 0,
        errors: [],
      }
    );
  }

  // ========== WBS Snapshot (Backup/Restore) API ==========

  /**
   * Create a WBS snapshot for a phase
   */
  async createWbsSnapshot(request: {
    phaseId: string;
    snapshotName?: string;
    description?: string;
    snapshotType?: 'PRE_TEMPLATE' | 'MANUAL';
  }) {
    return this.fetchWithFallback(
      '/wbs-snapshots',
      {
        method: 'POST',
        body: JSON.stringify(request),
      },
      null
    );
  }

  /**
   * Get all snapshots for a phase
   */
  async getWbsSnapshotsByPhase(phaseId: string) {
    return this.fetchWithFallback(`/wbs-snapshots/phase/${phaseId}`, {}, []);
  }

  /**
   * Get all snapshots for a project
   */
  async getWbsSnapshotsByProject(projectId: string) {
    return this.fetchWithFallback(`/wbs-snapshots/project/${projectId}`, {}, []);
  }

  /**
   * Get a specific snapshot
   */
  async getWbsSnapshot(snapshotId: string) {
    return this.fetchWithFallback(`/wbs-snapshots/${snapshotId}`, {}, null);
  }

  /**
   * Restore WBS data from a snapshot
   */
  async restoreWbsSnapshot(snapshotId: string) {
    return this.fetchWithFallback(
      `/wbs-snapshots/${snapshotId}/restore`,
      { method: 'POST' },
      null
    );
  }

  /**
   * Delete a WBS snapshot (soft delete)
   */
  async deleteWbsSnapshot(snapshotId: string) {
    return this.fetchWithFallback(
      `/wbs-snapshots/${snapshotId}`,
      { method: 'DELETE' },
      null
    );
  }

  // ==================== View APIs (Phase 3) ====================

  async getPoBacklogView(projectId: string) {
    return this.fetchWithFallback(
      `/projects/${projectId}/views/po-backlog`,
      {},
      null
    );
  }

  async getPmWorkboardView(projectId: string) {
    return this.fetchWithFallback(
      `/projects/${projectId}/views/pm-workboard`,
      {},
      null
    );
  }

  async getPmoPortfolioView(projectId: string) {
    return this.fetchWithFallback(
      `/projects/${projectId}/views/pmo-portfolio`,
      {},
      null
    );
  }

  // ==================== Data Quality API (Phase 4) ====================

  async getDataQuality(projectId: string) {
    return this.fetchWithFallback(
      `/projects/${projectId}/data-quality`,
      {},
      null
    );
  }

  // ==================== Result APIs (Phase 5) ====================

  async getPoBacklogViewResult(projectId: string): Promise<Result<PoBacklogViewDto>> {
    return this.fetchResult<PoBacklogViewDto>(
      `/projects/${projectId}/views/po-backlog`,
    );
  }

  async getPmWorkboardViewResult(projectId: string): Promise<Result<PmWorkboardViewDto>> {
    return this.fetchResult<PmWorkboardViewDto>(
      `/projects/${projectId}/views/pm-workboard`,
    );
  }

  async getPmoPortfolioViewResult(projectId: string): Promise<Result<PmoPortfolioViewDto>> {
    return this.fetchResult<PmoPortfolioViewDto>(
      `/projects/${projectId}/views/pmo-portfolio`,
    );
  }

  async getDataQualityResult(projectId: string): Promise<Result<DataQualityResponse>> {
    return this.fetchResult<DataQualityResponse>(
      `/projects/${projectId}/data-quality`,
    );
  }

  // Dashboard Result methods (Phase 5 - Step 6)

  async getFullProjectDashboardResult(projectId: string): Promise<Result<ProjectDashboardDto>> {
    return this.fetchResult<ProjectDashboardDto>(
      `${V2}/projects/${projectId}/dashboard`,
    );
  }

  async getPhaseProgressResult(projectId: string): Promise<Result<DashboardSection<PhaseProgressDto>>> {
    return this.fetchResult<DashboardSection<PhaseProgressDto>>(
      `${V2}/projects/${projectId}/dashboard/phase-progress`,
    );
  }

  async getPartStatsResult(projectId: string): Promise<Result<DashboardSection<PartStatsDto>>> {
    return this.fetchResult<DashboardSection<PartStatsDto>>(
      `${V2}/projects/${projectId}/dashboard/part-stats`,
    );
  }

  async getWbsGroupStatsResult(projectId: string): Promise<Result<DashboardSection<WbsGroupStatsDto>>> {
    return this.fetchResult<DashboardSection<WbsGroupStatsDto>>(
      `${V2}/projects/${projectId}/dashboard/wbs-group-stats`,
    );
  }

  async getSprintVelocityResult(projectId: string): Promise<Result<DashboardSection<SprintVelocityDto>>> {
    return this.fetchResult<DashboardSection<SprintVelocityDto>>(
      `${V2}/projects/${projectId}/dashboard/sprint-velocity`,
    );
  }

  async getBurndownResult(projectId: string): Promise<Result<DashboardSection<BurndownDto>>> {
    return this.fetchResult<DashboardSection<BurndownDto>>(
      `${V2}/projects/${projectId}/dashboard/burndown`,
    );
  }

  async getInsightsResult(projectId: string): Promise<Result<DashboardSection<InsightDto[]>>> {
    return this.fetchResult<DashboardSection<InsightDto[]>>(
      `${V2}/projects/${projectId}/dashboard/insights`,
    );
  }

  // WBS Snapshot Result methods (Phase 5 - Step 7)

  async createWbsSnapshotResult(request: {
    phaseId: string;
    snapshotName?: string;
    description?: string;
    snapshotType?: 'PRE_TEMPLATE' | 'MANUAL';
  }): Promise<Result<WbsSnapshot>> {
    return this.fetchResult<WbsSnapshot>('/wbs-snapshots', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getWbsSnapshotsByPhaseResult(phaseId: string): Promise<Result<WbsSnapshot[]>> {
    return this.fetchResult<WbsSnapshot[]>(`/wbs-snapshots/phase/${phaseId}`);
  }

  async getWbsSnapshotsByProjectResult(projectId: string): Promise<Result<WbsSnapshot[]>> {
    return this.fetchResult<WbsSnapshot[]>(`/wbs-snapshots/project/${projectId}`);
  }

  async getWbsSnapshotResult(snapshotId: string): Promise<Result<WbsSnapshot>> {
    return this.fetchResult<WbsSnapshot>(`/wbs-snapshots/${snapshotId}`);
  }

  async restoreWbsSnapshotResult(snapshotId: string): Promise<Result<void>> {
    return this.fetchResult<void>(`/wbs-snapshots/${snapshotId}/restore`, {
      method: 'POST',
    });
  }

  async deleteWbsSnapshotResult(snapshotId: string): Promise<Result<void>> {
    return this.fetchResult<void>(`/wbs-snapshots/${snapshotId}`, {
      method: 'DELETE',
    });
  }

  // Epic CRUD Result methods (Phase 5 - Step 7)

  async getEpicsForProjectResult(projectId: string): Promise<Result<Epic[]>> {
    return this.fetchResult<Epic[]>(`/projects/${projectId}/epics`);
  }

  async getEpicByIdResult(epicId: string): Promise<Result<Epic>> {
    return this.fetchResult<Epic>(`/epics/${epicId}`);
  }

  async createEpicResult(projectId: string, data: EpicFormData): Promise<Result<Epic>> {
    return this.fetchResult<Epic>(`/projects/${projectId}/epics`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEpicResult(epicId: string, data: Partial<Epic>): Promise<Result<Epic>> {
    return this.fetchResult<Epic>(`/epics/${epicId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteEpicResult(epicId: string): Promise<Result<void>> {
    return this.fetchResult<void>(`/epics/${epicId}`, {
      method: 'DELETE',
    });
  }

  // Project Result methods (Phase 5 - Step 8)

  async getProjectsResult(): Promise<Result<Project[]>> {
    return this.fetchResult<Project[]>(`${V2}/projects`);
  }

  async getProjectResult(projectId: string): Promise<Result<Project>> {
    return this.fetchResult<Project>(`${V2}/projects/${projectId}`);
  }

  // Part Result methods (Phase 5 - Step 8)

  async getPartsResult(projectId: string): Promise<Result<Part[]>> {
    return this.fetchResult<Part[]>(`/projects/${projectId}/parts`);
  }

  async getPartMembersResult(partId: string): Promise<Result<PartMember[]>> {
    return this.fetchResult<PartMember[]>(`/parts/${partId}/members`);
  }

  async getPartDashboardResult(projectId: string, partId: string): Promise<Result<PartDashboard>> {
    return this.fetchResult<PartDashboard>(`/projects/${projectId}/parts/${partId}/dashboard`);
  }

  async getPartMetricsResult(projectId: string, partId: string): Promise<Result<PartMetrics>> {
    return this.fetchResult<PartMetrics>(`/projects/${projectId}/parts/${partId}/metrics`);
  }

  // Sprint Result methods (Phase 5 - Step 8)

  async getSprintsResult(projectId: string): Promise<Result<Sprint[]>> {
    return this.fetchResult<Sprint[]>(`/projects/${projectId}/sprints`);
  }

  async getSprintResult(sprintId: string): Promise<Result<Sprint>> {
    return this.fetchResult<Sprint>(`/sprints/${sprintId}`);
  }

  // Phase Result methods (Phase 5 - Step 8)

  async getPhasesResult(projectId?: string): Promise<Result<any[]>> {
    const params = projectId ? `?projectId=${projectId}` : '';
    return this.fetchResult<any[]>(`/phases${params}`, undefined, {
      fallbackData: getMockPhases(projectId),
    });
  }

  async getPhaseResult(phaseId: string): Promise<Result<any>> {
    return this.fetchResult<any>(`/phases/${phaseId}`, undefined, {
      fallbackData: getMockPhaseById(phaseId) || null,
    });
  }

  async getPhaseDeliverablesResult(phaseId: string): Promise<Result<any[]>> {
    return this.fetchResult<any[]>(`/phases/${phaseId}/deliverables`, undefined, {
      fallbackData: [],
    });
  }

  async getPhaseKpisResult(phaseId: string): Promise<Result<any[]>> {
    return this.fetchResult<any[]>(`/phases/${phaseId}/kpis`, undefined, {
      fallbackData: [],
    });
  }

  // Story Result methods (Phase 5 - Step 8)

  async getStoriesResult(projectId: string, filters?: { status?: string; epic?: string }): Promise<Result<any[]>> {
    const params = new URLSearchParams(filters as any);
    return this.fetchResult<any[]>(`/projects/${projectId}/user-stories?${params}`, undefined, {
      fallbackData: [],
      extract: (json: unknown) => {
        // Handle nested {data: [...]} wrapper from this endpoint
        if (json && typeof json === 'object' && 'data' in json) {
          return (json as any).data ?? [];
        }
        return (json as any[]) ?? [];
      },
    });
  }

  async createStoryResult(story: any): Promise<Result<any>> {
    return this.fetchResult<any>('/stories', {
      method: 'POST',
      body: JSON.stringify(story),
    });
  }

  async updateStoryResult(storyId: string | number, data: any): Promise<Result<any>> {
    return this.fetchResult<any>(`/stories/${storyId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateStoryPriorityResult(storyId: string | number, direction: 'up' | 'down'): Promise<Result<any[]>> {
    return this.fetchResult<any[]>(`/stories/${storyId}/priority`, {
      method: 'PUT',
      body: JSON.stringify({ direction }),
    });
  }

  async deleteStoryResult(storyId: string): Promise<Result<any>> {
    return this.fetchResult<any>(`/stories/${storyId}`, {
      method: 'DELETE',
    });
  }

  // Feature Result methods (Phase 5 - Step 8)

  async getFeaturesResult(epicId: string): Promise<Result<Feature[]>> {
    return this.fetchResult<Feature[]>(`/epics/${epicId}/features`);
  }

  async getFeaturesByWbsGroupResult(wbsGroupId: string): Promise<Result<Feature[]>> {
    return this.fetchResult<Feature[]>(`/wbs/groups/${wbsGroupId}/features`);
  }

  async getFeatureResult(featureId: string): Promise<Result<Feature | null>> {
    return this.fetchResult<Feature | null>(`/features/${featureId}`);
  }

  // WBS Result methods (Phase 5 - Step 8)

  async getWbsGroupsResult(phaseId: string): Promise<Result<WbsGroup[]>> {
    return this.fetchResult<WbsGroup[]>(`/phases/${phaseId}/wbs-groups`, undefined, {
      fallbackData: getMockWbsGroups(phaseId),
    });
  }

  async getWbsGroupResult(groupId: string): Promise<Result<WbsGroup | null>> {
    return this.fetchResult<WbsGroup | null>(`/wbs/groups/${groupId}`, undefined, {
      fallbackData: null,
    });
  }

  async getWbsItemsResult(groupId: string): Promise<Result<WbsItem[]>> {
    return this.fetchResult<WbsItem[]>(`/wbs/groups/${groupId}/items`, undefined, {
      fallbackData: getMockWbsItems(groupId),
    });
  }

  async getWbsTasksResult(itemId: string): Promise<Result<WbsTask[]>> {
    return this.fetchResult<WbsTask[]>(`/wbs/items/${itemId}/tasks`, undefined, {
      fallbackData: getMockWbsTasks(itemId),
    });
  }

  async getWbsFullTreeResult(projectId: string): Promise<Result<{ groups: WbsGroup[]; items: WbsItem[]; tasks: WbsTask[] }>> {
    return this.fetchResult<{ groups: WbsGroup[]; items: WbsItem[]; tasks: WbsTask[] }>(
      `/projects/${projectId}/wbs/full-tree`, undefined, {
        fallbackData: { groups: [], items: [], tasks: [] },
      },
    );
  }

  // Task/Kanban Result methods (Phase 5 - Step 8)

  async getKanbanBoardResult(projectId: string): Promise<Result<{ columns: any[] }>> {
    return this.fetchResult<{ columns: any[] }>(`${V2}/projects/${projectId}/kanban`, undefined, {
      fallbackData: { columns: [] },
    });
  }

  async getTaskColumnsResult(projectId: string): Promise<Result<any[]>> {
    return this.fetchResult<any[]>(`${V2}/projects/${projectId}/kanban`, undefined, {
      fallbackData: [],
      extract: (json: unknown) => {
        const board = json as { columns?: any[] } | null;
        return board?.columns ?? [];
      },
    });
  }

  async getTasksResult(projectId: string): Promise<Result<any[]>> {
    return this.fetchResult<any[]>(`${V2}/projects/${projectId}/kanban`, undefined, {
      fallbackData: [],
      extract: (json: unknown) => {
        const board = json as { columns?: any[] } | null;
        return (board?.columns ?? []).flatMap((col: any) =>
          (col.tasks || []).map((task: any) => ({ ...task, status: this.mapColumnToStatus(col.name) }))
        );
      },
    });
  }

  // Roles/Users Result methods (Phase 5 - Step 8)

  async getUsersResult(): Promise<Result<any[]>> {
    return this.fetchResult<any[]>(`${V2}/users`, undefined, {
      fallbackData: [],
    });
  }

  async getPermissionsResult(): Promise<Result<any[]>> {
    return this.fetchResult<any[]>(`${V2}/permissions`, undefined, {
      fallbackData: [],
    });
  }

  async getProjectMembersResult(projectId: string): Promise<Result<any[]>> {
    return this.fetchResult<any[]>(`/projects/${projectId}/members`, undefined, {
      fallbackData: [],
    });
  }

  // Requirement Result methods (Phase 5 - Step 8)

  async getRequirementsResult(projectId: string): Promise<Result<Requirement[]>> {
    return this.fetchResult<Requirement[]>(`${V2}/projects/${projectId}/requirements`, undefined, {
      fallbackData: [],
    });
  }

  async getRequirementResult(projectId: string, requirementId: string): Promise<Result<Requirement | null>> {
    return this.fetchResult<Requirement | null>(`${V2}/projects/${projectId}/requirements/${requirementId}`, undefined, {
      fallbackData: null,
    });
  }

  // RFP Result methods (Phase 5 - Step 8)

  async getRfpsResult(projectId: string): Promise<Result<Rfp[]>> {
    return this.fetchResult<Rfp[]>(`${V2}/projects/${projectId}/rfps`, undefined, {
      fallbackData: [],
    });
  }

  // Auth Result methods (Phase 5 - Step 8)

  async loginResult(email: string, password: string): Promise<Result<{ token: string; user: { id: string; name: string; email: string; role: string; department: string } }>> {
    return this.fetchResult<{ token: string; user: { id: string; name: string; email: string; role: string; department: string } }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      },
      {
        fallbackData: {
          token: 'mock-jwt-token',
          user: {
            id: '1',
            name: email.split('@')[0],
            email,
            role: 'pm',
            department: 'PMO',
          },
        },
      },
    );
  }

  // Weekly Report Result methods (Phase 5 - Step 8)

  async getWeeklyReportsResult(projectId: string): Promise<Result<WeeklyReport[]>> {
    return this.fetchResult<WeeklyReport[]>(`/weekly-reports/project/${projectId}`, undefined, {
      fallbackData: [],
    });
  }

  // Report v2 API (ReactiveReportController)

  async getProjectReportsResult(projectId: string): Promise<Result<ReportApiDto[]>> {
    return this.fetchResult<ReportApiDto[]>(`${V2}/projects/${projectId}/reports`, undefined, {
      fallbackData: [],
    });
  }

  async getReportByIdResult(projectId: string, reportId: string): Promise<Result<ReportApiDto>> {
    return this.fetchResult<ReportApiDto>(`${V2}/projects/${projectId}/reports/${reportId}`, undefined, {
      fallbackData: null,
    });
  }

  async createProjectReport(projectId: string, data: {
    reportType: string;
    reportScope: string;
    title: string;
    periodStart: string;
    periodEnd: string;
    generationMode?: string;
  }): Promise<ReportApiDto> {
    const response = await this.fetchStrict<{ data: ReportApiDto } | ReportApiDto>(
      `${V2}/projects/${projectId}/reports`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    );
    return response && typeof response === 'object' && 'data' in response
      ? (response as { data: ReportApiDto }).data
      : response as ReportApiDto;
  }

  async publishProjectReport(projectId: string, reportId: string): Promise<void> {
    await this.fetchStrict<void>(
      `${V2}/projects/${projectId}/reports/${reportId}/publish`,
      { method: 'PATCH' },
    );
  }

  async deleteProjectReport(projectId: string, reportId: string): Promise<void> {
    await this.fetchStrict<void>(
      `${V2}/projects/${projectId}/reports/${reportId}`,
      { method: 'DELETE' },
    );
  }

  /**
   * Stream report generation via SSE.
   * Returns an AbortController to cancel the stream.
   */
  streamReportGeneration(
    projectId: string,
    request: {
      reportType: string;
      periodStart: string;
      periodEnd: string;
      scope?: string;
      scopePhaseId?: string;
      scopeTeamId?: string;
      useAiSummary?: boolean;
      customTitle?: string;
      sections?: string[];
    },
    onEvent: (event: ReportStreamEvent) => void,
    onDone: (reportId?: string) => void,
    onError: (error: string) => void,
  ): AbortController {
    const controller = new AbortController();
    const url = `${API_BASE_URL}${V2}/projects/${projectId}/reports/generate/stream`;

    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        ...(this.token ? { 'Authorization': `Bearer ${this.token}` } : {}),
      },
      body: JSON.stringify({ projectId, ...request }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          onError(`HTTP ${response.status}: ${response.statusText}`);
          return;
        }
        const reader = response.body?.getReader();
        if (!reader) {
          onError('No response body');
          return;
        }
        const decoder = new TextDecoder();
        let buffer = '';
        let lastReportId: string | undefined;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          let currentEventType = '';
          for (const line of lines) {
            if (line.startsWith('event:')) {
              currentEventType = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              const dataStr = line.slice(5).trim();
              if (!dataStr) continue;
              try {
                const data = JSON.parse(dataStr);
                if (currentEventType === 'delta' && data.kind === 'JSON' && data.json) {
                  const progress = JSON.parse(data.json) as ReportProgressEvent;
                  lastReportId = progress.reportId;
                  onEvent({ type: 'progress', ...progress });
                } else if (currentEventType === 'meta') {
                  onEvent({ type: 'meta', traceId: data.traceId, timestamp: data.timestamp });
                } else if (currentEventType === 'done') {
                  onDone(lastReportId);
                } else if (currentEventType === 'error') {
                  onError(data.message || 'Stream error');
                }
              } catch {
                // Skip unparseable lines
              }
            }
          }
        }
        // Stream ended naturally
        onDone(lastReportId);
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          onError(err.message || 'Stream failed');
        }
      });

    return controller;
  }

  // WIP Result methods (Phase 5 - Step 8)

  async getProjectWipStatusResult(projectId: string): Promise<Result<any>> {
    return this.fetchResult<any>(`/wip/status/project/${projectId}`, undefined, {
      fallbackData: {
        projectId,
        totalWip: 0,
        columnStatuses: [],
        bottleneckCount: 0,
      },
    });
  }

  async getProjectProgressResult(projectId: string): Promise<Result<any[]>> {
    return this.fetchResult<any[]>(`/projects/${projectId}/progress`, undefined, {
      fallbackData: [],
    });
  }

  // Lineage Result methods (Phase 5 - Step 8)

  async getLineageGraphResult(projectId: string): Promise<Result<LineageGraphDto>> {
    return this.fetchResult<LineageGraphDto>(`${V2}/projects/${projectId}/lineage/graph`, undefined, {
      fallbackData: {
        nodes: [],
        edges: [],
        statistics: {
          requirements: 0,
          stories: 0,
          tasks: 0,
          sprints: 0,
          coverage: 0,
          linkedRequirements: 0,
          unlinkedRequirements: 0,
        },
      } as unknown as LineageGraphDto,
    });
  }

  async getLineageTimelineResult(
    projectId: string,
    params?: {
      aggregateType?: string;
      since?: string;
      until?: string;
      userId?: string;
      page?: number;
      size?: number;
    }
  ): Promise<Result<PageResponse<LineageEventDto>>> {
    const queryParams = new URLSearchParams();
    if (params?.aggregateType) queryParams.append('aggregateType', params.aggregateType);
    if (params?.since) queryParams.append('since', params.since);
    if (params?.until) queryParams.append('until', params.until);
    if (params?.userId) queryParams.append('userId', params.userId);
    if (params?.page !== undefined) queryParams.append('page', params.page.toString());
    if (params?.size !== undefined) queryParams.append('size', params.size.toString());

    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';

    return this.fetchResult<PageResponse<LineageEventDto>>(
      `${V2}/projects/${projectId}/lineage/timeline${query}`,
      undefined,
      {
        fallbackData: {
          content: [],
          totalElements: 0,
          totalPages: 0,
          number: 0,
          size: 20,
        } as unknown as PageResponse<LineageEventDto>,
      },
    );
  }

  async getImpactAnalysisResult(aggregateType: string, aggregateId: string): Promise<Result<ImpactAnalysisDto>> {
    return this.fetchResult<ImpactAnalysisDto>(
      `${V2}/lineage/impact/${aggregateType}/${aggregateId}`,
      undefined,
      {
        fallbackData: {
          sourceId: aggregateId,
          sourceType: aggregateType,
          sourceTitle: '',
          impactedStories: 0,
          impactedTasks: 0,
          impactedSprints: 0,
          directImpacts: [],
          indirectImpacts: [],
          affectedSprintNames: [],
        } as unknown as ImpactAnalysisDto,
      },
    );
  }

  // DB Admin Result methods (Phase 5 - Step 8)

  async getDbSyncStatusResult(): Promise<Result<any>> {
    return this.fetchResult<any>('/admin/db/sync/status', undefined, {
      fallbackData: { is_syncing: false, sync_type: null, current_entity: null, progress: 0, started_at: null, error: null },
    });
  }

  async getDbSyncHistoryResult(limit: number = 10): Promise<Result<any[]>> {
    return this.fetchResult<any[]>(`/admin/db/sync/history?limit=${limit}`, undefined, {
      fallbackData: [],
    });
  }

  async getDbBackupStatusResult(): Promise<Result<any>> {
    return this.fetchResult<any>('/admin/db/backup/status', undefined, {
      fallbackData: { is_running: false, backup_type: null, backup_name: null, progress: 0, started_at: null },
    });
  }

  async getDbBackupsResult(limit: number = 20): Promise<Result<any[]>> {
    return this.fetchResult<any[]>(`/admin/db/backups?limit=${limit}`, undefined, {
      fallbackData: [],
    });
  }

  async getDbStatsResult(): Promise<Result<any>> {
    return this.fetchResult<any>('/admin/db/stats', undefined, {
      fallbackData: {
        postgres: { tables: 0, total_rows: 0, size_bytes: 0 },
        neo4j: { nodes: 0, relationships: 0, labels: [] },
        last_sync_at: null,
        last_backup_at: null,
      },
    });
  }

  // Common (Meetings/Issues) Result methods (Phase 5 - Step 8)

  async getMeetingsResult(projectId: string): Promise<Result<any[]>> {
    return this.fetchResult<any[]>(`/projects/${projectId}/meetings`, undefined, {
      fallbackData: [],
    });
  }

  async getIssuesResult(projectId: string): Promise<Result<any[]>> {
    return this.fetchResult<any[]>(`/projects/${projectId}/issues`, undefined, {
      fallbackData: [],
    });
  }

  // Education Result methods (Phase 5 - Step 8)

  async getEducationsResult(): Promise<Result<any[]>> {
    return this.fetchResult<any[]>(`${V2}/educations`, undefined, {
      fallbackData: [],
    });
  }

  async getEducationRoadmapsResult(): Promise<Result<any[]>> {
    return this.fetchResult<any[]>('/educations/roadmaps', undefined, {
      fallbackData: [],
    });
  }

  async getEducationSessionsResult(educationId: string): Promise<Result<any[]>> {
    return this.fetchResult<any[]>(`${V2}/educations/${educationId}/sessions`, undefined, {
      fallbackData: [],
    });
  }

  // Template Result methods (Phase 5 - Step 8)

  async getTemplateSetsResult(category?: string): Promise<Result<any[]>> {
    const params = category ? `?category=${category}` : '';
    const fallbackData = category
      ? DEFAULT_TEMPLATES.filter(t => t.category === category)
      : DEFAULT_TEMPLATES;
    return this.fetchResult<any[]>(`/templates${params}`, undefined, {
      fallbackData,
    });
  }

  async getTemplateSetResult(templateSetId: string): Promise<Result<any>> {
    const defaultTemplate = getDefaultTemplateById(templateSetId);
    return this.fetchResult<any>(`/templates/${templateSetId}`, undefined, {
      fallbackData: defaultTemplate || null,
    });
  }

  // WBS-Backlog Integration Result methods (Phase 5 - Step 8)

  async getEpicsByPhaseResult(phaseId: string): Promise<Result<any[]>> {
    return this.fetchResult<any[]>(`/integration/phases/${phaseId}/epics`, undefined, {
      fallbackData: [],
    });
  }

  async getUnlinkedEpicsResult(projectId: string): Promise<Result<any[]>> {
    return this.fetchResult<any[]>(`/integration/projects/${projectId}/epics/unlinked`, undefined, {
      fallbackData: [],
    });
  }

  async getFeaturesByWbsGroupIntegrationResult(wbsGroupId: string): Promise<Result<any[]>> {
    return this.fetchResult<any[]>(`/integration/wbs-groups/${wbsGroupId}/features`, undefined, {
      fallbackData: [],
    });
  }

  async getFeatureIntegrationResult(featureId: string): Promise<Result<Feature | null>> {
    return this.fetchResult<Feature | null>(`/features/${featureId}`, undefined, {
      fallbackData: null,
    });
  }

  async getUnlinkedFeaturesResult(epicId: string): Promise<Result<any[]>> {
    return this.fetchResult<any[]>(`/epics/${epicId}/features/unlinked`, undefined, {
      fallbackData: [],
    });
  }

  async getStoriesByWbsItemResult(wbsItemId: string): Promise<Result<any[]>> {
    return this.fetchResult<any[]>(`/integration/wbs-items/${wbsItemId}/stories`, undefined, {
      fallbackData: [],
    });
  }

  async getUnlinkedStoriesResult(projectId: string): Promise<Result<any[]>> {
    return this.fetchResult<any[]>(`/integration/projects/${projectId}/stories/unlinked`, undefined, {
      fallbackData: [],
    });
  }

  async getPhaseIntegrationSummaryResult(phaseId: string, projectId: string): Promise<Result<any>> {
    return this.fetchResult<any>(`/integration/phases/${phaseId}/summary?projectId=${projectId}`, undefined, {
      fallbackData: {
        phaseId,
        linkedEpicCount: 0,
        wbsGroupCount: 0,
        linkedFeatureCount: 0,
        linkedStoryCount: 0,
      },
    });
  }

  // Remaining Dashboard Result methods (Phase 5 - Step 9)

  async getPortfolioDashboardStatsResult(): Promise<Result<DashboardStats>> {
    return this.fetchResult<DashboardStats>(`${V2}/dashboard/stats`);
  }

  async getPortfolioActivitiesResult(): Promise<Result<any[]>> {
    return this.fetchResult<any[]>(`${V2}/dashboard/activities`);
  }

  async getProjectDashboardStatsResult(projectId: string): Promise<Result<DashboardStats>> {
    return this.fetchResult<DashboardStats>(`${V2}/projects/${projectId}/dashboard/stats`);
  }

  async getProjectActivitiesResult(projectId: string): Promise<Result<any[]>> {
    return this.fetchResult<any[]>(`${V2}/projects/${projectId}/dashboard/activities`);
  }

  async getWeightedProgressResult(projectId: string): Promise<Result<WeightedProgressDto>> {
    return this.fetchResult<WeightedProgressDto>(`${V2}/projects/${projectId}/dashboard/weighted-progress`);
  }

  // KPI typed API (ReactiveKpiController)

  async getPhaseKpisTyped(phaseId: string): Promise<Result<KpiApiDto[]>> {
    return this.fetchResult<KpiApiDto[]>(`/phases/${phaseId}/kpis`, undefined, {
      fallbackData: [],
    });
  }

  async getPhaseKpisByStatus(phaseId: string, status: string): Promise<Result<KpiApiDto[]>> {
    return this.fetchResult<KpiApiDto[]>(`/phases/${phaseId}/kpis/status/${status}`, undefined, {
      fallbackData: [],
    });
  }

  async getKpiById(kpiId: string): Promise<Result<KpiApiDto>> {
    return this.fetchResult<KpiApiDto>(`/kpis/${kpiId}`, undefined, {
      fallbackData: null,
    });
  }

  async updateKpiStatus(kpiId: string, status: string): Promise<KpiApiDto> {
    return this.fetchStrict<KpiApiDto>(`/kpis/${kpiId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async updateKpiValue(kpiId: string, current: string): Promise<KpiApiDto> {
    return this.fetchStrict<KpiApiDto>(`/kpis/${kpiId}/value`, {
      method: 'PATCH',
      body: JSON.stringify({ current }),
    });
  }

}

export const apiService = new ApiService();
