# 15. PMO 거버넌스 화면설계

> 작성일: 2026-02-08
> 버전: v2.1
> 라우트: `/pmo` (PMO 대시보드), `/pmo/health` (Health Matrix)
> 필요 Capability: `view_pmo` (허브 조회), `view_pmo_health` (Health Matrix 조회)
> 기본 Preset: 역할에 따라 자동 결정
> 노드 역할: **Hub** (`pmo` — 포트폴리오 허브) + **Detail** (`pmo-health` — 건강도 상세)

---

## 1. 화면 개요

### 1.1 목적

PMO 거버넌스는 **"프로젝트 밖에서 프로젝트들을 본다"**에 대한 답을 제공한다.
개별 프로젝트 대시보드(`/dashboard`)가 단일 프로젝트의 내부 현황을 보여주는 반면,
PMO 거버넌스는 **다중 프로젝트를 포트폴리오 관점**에서 비교/통제/진단한다.

두 개의 라우트로 구성된다:

| 라우트 | 역할 | 핵심 질문 |
|--------|------|---------|
| `/pmo` | 포트폴리오 허브 | "관리 중인 프로젝트들의 전체 상황은?" |
| `/pmo/health` | Health Matrix 상세 | "각 프로젝트의 건강도를 어떤 차원에서 어떻게 평가할 것인가?" |

> **v2.0 변경**: Health Matrix를 `/pmo` 내 탭이 아닌 **독립 라우트(`/pmo/health`)**로 분리.
> PMO 대시보드는 포트폴리오 수준 요약에 집중하고, Health Matrix는 다차원 점수 모델과
> 추세 분석에 집중한다. 두 노드 간 drill-down 네비게이션으로 연결한다.

### 1.2 설계 원칙

| 원칙 | 설명 |
|------|------|
| **포트폴리오 단위** | 개별 프로젝트가 아닌 전체 프로젝트 목록을 1차 뷰로 제공 |
| **Health Score 중심** | 모든 프로젝트를 A~F 등급으로 정량화하여 즉시 비교 가능 |
| **다차원 건강도** | Schedule/Cost/Quality/Risk/Resource 5개 차원을 독립 측정 |
| **추세(Trend) 시각화** | 점수의 시간 흐름을 추적하여 개선/악화를 조기 감지 |
| **임계값 알림** | RED/YELLOW/GREEN 3단계 알림으로 즉시 조치 대상 식별 |
| **Drill-down 네비게이션** | 프로젝트 클릭 → 해당 프로젝트 대시보드로 context 전환 |
| **FilterSpec = 온톨로지** | 필터 키가 AI/URL/백엔드 공통 스키마로 통합 |
| **Hub+Detail 분리** | `pmo`는 요약 허브(Hub 페널티 적용), `pmo-health`는 상세(Detail 보너스 적용) |
| **Capability 분리** | `view_pmo`(허브) + `view_pmo_health`(Health Matrix)로 2중 분리, 프리셋 숨김만으로 라우트 접근 제어 금지 (v2.1) |
| **라우트 가드** | ProtectedRoute에서 `requiredCaps` AND `allowedPresets` 교차 검증, URL 직접 접근도 서버 enforcement (v2.1) |
| **중요 차원 기반 등급 캡** | 결측 차원 "개수"가 아닌 "중요도"(schedule/cost 핵심)로 등급 상한 결정 (v2.1) |
| **Action 3분기** | AI 액션을 `navigate:internal` / `navigate:drilldown` / `action:export` 3유형으로 세분화 (v2.1) |
| **API 메타 강화** | 응답에 `asOfStrategy` / `appliedFilter` / `appliedSort` / `calcVersion` 메타 포함 (v2.1) |
| **projectId 타입 단순화** | FilterSpec 내부 `projectId`는 항상 `string[]` (0개/1개 포함), UI만 단일 표현 (v2.1) |
| **Invalid Filter 경고** | enum silent drop 시 `INVALID_FILTER_DROPPED` 경고 → 상단 배지 노출 (v2.1) |
| **스냅샷 불변성** | Health History는 snapshot 테이블 기반(immutable), `calcVersion`으로 산정 로직 변경 추적 (v2.1) |

### 1.3 핵심 질문 → 위젯 매핑

| 사용자 질문 | 위젯 | 라우트 |
|-----------|------|--------|
| "관리 중인 프로젝트가 몇 개야?" | Portfolio KPI Cards | `/pmo` |
| "전체 평균 건강 점수는?" | Portfolio KPI Cards | `/pmo` |
| "위험(RED) 프로젝트가 있어?" | Critical Projects Alert | `/pmo` |
| "정상 진행 중인 프로젝트는?" | Project Health Table | `/pmo` |
| "지연 프로젝트 목록 보여줘" | Project Health Table (filtered) | `/pmo` |
| "프로젝트별 자원 배분 현황은?" | Cross-Project Resource Chart | `/pmo` |
| "이번 달 마일스톤은?" | Milestone Calendar | `/pmo` |
| "A 프로젝트 건강도 상세 알려줘" | Health Dimension Radar | `/pmo/health` |
| "SPI가 가장 낮은 프로젝트는?" | Health Dimension Ranking | `/pmo/health` |
| "지난 3개월 건강도 추이는?" | Health Trend Chart | `/pmo/health` |
| "비용 초과 프로젝트 있어?" | CPI Dimension Detail | `/pmo/health` |
| "품질 지표가 악화되는 프로젝트?" | Quality Trend Alert | `/pmo/health` |

---

## 2. MenuOntology 노드

### 2.1 타입 확정 (v2.0 변경사항)

01_대시보드 / 02_요구사항 v2.0 패턴을 동일하게 적용한다.

| 항목 | v1.0 | v2.0 (확정) | 변경 사유 |
|------|------|------------|----------|
| `entities` | 소문자 `"project"` | PascalCase `"Project"` | EntityType enum 정규화 |
| `intents` | 3개 | 14개로 확장 | 필터/액션/건강도 질문 커버리지 확보 |
| `nodeRole` | 없음 | `"hub"` (pmo) + `"detail"` (pmo-health) | AI 스코어링 페널티/보너스 기준 |
| `suggestedActions.capability` | 단일 | `requiredCaps?: Capability[]` + `targetNodeId?: string` | 복수 권한 + nodeId 기반 이동 |
| `deepLinks.pattern` | `{projectId}` 형태 | `:projectId` 형태 | 라우트 템플릿 표준 통일 |
| `scopeHints` | 추상 단일 | `scope: { keys, params }` 2계층 분리 | 스코프 해석 안정성 |
| `ui.highlightMetrics` | 단일 배열 | `ui.highlight.metricKeys` + `ui.highlight.widgetKeys` | 데이터 키 vs UI 위젯 키 분리 |
| `filterSpec` | 없음 | 온톨로지 내장 FilterSpec | AI/URL/백엔드 통합 필터 키 |
| Health Matrix | 탭 내장 | 독립 라우트 `/pmo/health` | 복잡도 분리 |

### 2.2 FilterSpec 정의

FilterSpec은 **이 화면이 지원하는 필터 스키마**를 온톨로지 내부에 선언한다.
AI가 딥링크를 생성할 때, URL 파라미터 문자열이 아니라 **FilterSpec 키 기반 필터 객체**를 반환한다.

```typescript
/** PMO 대시보드 필터 스키마 — 온톨로지 내장 */
export interface PmoFilterSpec {
  /** 프로젝트 ID (multi-select, v2.1: always array — 0/1개도 배열) */
  projectId?: string[];
  /** Health 등급 필터 */
  healthGrade?: "A" | "B" | "C" | "D" | "F";
  /** 날짜 범위 (ISO 8601) */
  dateRange?: {
    start: string;
    end: string;
  };
  /** 건강도 차원 필터 (Health Matrix 전용) */
  dimension?: "schedule" | "cost" | "quality" | "risk" | "resource";
  /** 프로젝트 상태 */
  projectStatus?: "on_track" | "at_risk" | "delayed" | "critical";
  /** 자유 검색어 */
  q?: string;
}

/** Health Matrix 필터 스키마 — pmo-health 전용 */
export interface HealthMatrixFilterSpec extends PmoFilterSpec {
  /** 추세 기간 */
  trendPeriod?: "1m" | "3m" | "6m" | "1y";
  /** 임계값 알림 필터 */
  alertLevel?: "RED" | "YELLOW" | "GREEN";
  /** 정렬 기준 */
  sortBy?: "overall" | "schedule" | "cost" | "quality" | "risk" | "resource";
  /** 정렬 방향 */
  sortDir?: "asc" | "desc";
}
```

### 2.3 PMO Dashboard 노드 (확정본)

```typescript
const pmoNode: MenuOntologyNodeV2 = {
  nodeId: "pmo",
  label: "PMO 대시보드",
  route: "/pmo",
  icon: "AccountTreeRounded",
  domain: "governance",
  nodeRole: "hub",               // Hub node — summary/status questions get bonus

  requiredCaps: ["view_pmo"],

  intents: [
    // Ask
    "ask_portfolio_status",         // "전체 포트폴리오 현황 알려줘"
    "ask_overall_status",           // "관리 중인 프로젝트 상태는?"
    "ask_health_score",             // "평균 건강 점수는?"
    "ask_critical_projects",        // "위험 프로젝트 있어?"
    "ask_delayed_projects",         // "지연 프로젝트 알려줘"
    "ask_resource_allocation",      // "자원 배분 현황은?"
    "ask_milestone_calendar",       // "이번 달 마일스톤은?"
    // Do
    "do_export_portfolio_report",   // "포트폴리오 리포트 Export"
    "do_navigate_project",          // "A 프로젝트로 이동"
  ],
  canonicalQuestions: [
    "관리 중인 프로젝트가 몇 개야?",
    "전체 평균 건강 점수는?",
    "위험(RED) 프로젝트가 있어?",
    "정상 진행 중인 프로젝트는?",
    "지연 프로젝트 목록 보여줘",
    "프로젝트별 자원 배분 현황은?",
    "이번 달 마일스톤 일정은?",
    "포트폴리오 리포트 내보내줘",
    "A 프로젝트 대시보드로 이동해줘",
  ],
  entities: ["Project", "Phase", "Risk", "Sprint", "User"],
  keywords: [
    "PMO", "포트폴리오", "거버넌스", "통제", "프로젝트 목록", "건강",
    "portfolio", "governance", "pmo", "health", "multi-project",
    "자원배분", "마일스톤", "포트폴리오 현황",
  ],
  metrics: [
    "portfolio_count",
    "avg_health_score",
    "critical_projects",
    "on_track_projects",
    "delayed_projects",
    "at_risk_projects",
    "total_resource_utilization",
    "upcoming_milestones",
    "portfolio_budget_burn",
  ],

  filterSpec: {
    keys: ["projectId", "healthGrade", "dateRange", "projectStatus", "q"],
    defaults: {},
  },

  defaultPreset: "PMO_CONTROL",
  presetPolicies: [
    {
      preset: "PMO_CONTROL",
      ui: {
        density: "standard",
        defaultRightPanel: "open",
        highlight: {
          metricKeys: [
            "portfolio_count", "avg_health_score",
            "critical_projects", "delayed_projects",
          ],
          widgetKeys: [
            "KPI_PORTFOLIO_COUNT", "KPI_AVG_HEALTH",
            "KPI_CRITICAL", "KPI_ON_TRACK",
            "PROJECT_HEALTH_TABLE", "RESOURCE_ALLOCATION_CHART",
            "MILESTONE_CALENDAR",
          ],
        },
      },
      suggestedActions: [
        {
          key: "view_health_matrix",
          label: "Health Matrix",
          requiredCaps: ["view_pmo_health"],  // v2.1: separated capability
          targetNodeId: "pmo-health",
        },
        {
          key: "export_portfolio",
          label: "포트폴리오 리포트 Export",
          requiredCaps: ["export_pmo_reports"],  // v2.1: PMO-specific export cap
          targetNodeId: "reports",
        },
        {
          key: "go_reports",
          label: "리포트",
          requiredCaps: ["view_reports"],
          targetNodeId: "reports",
        },
      ],
    },
    {
      preset: "EXEC_SUMMARY",
      ui: {
        density: "compact",
        defaultRightPanel: "closed",
        highlight: {
          metricKeys: ["portfolio_count", "avg_health_score", "critical_projects"],
          widgetKeys: [
            "KPI_PORTFOLIO_COUNT", "KPI_AVG_HEALTH", "KPI_CRITICAL",
            "PROJECT_HEALTH_TABLE_COMPACT",
          ],
        },
        hiddenColumns: ["resource_utilization", "budget_burn", "last_updated"],
      },
      suggestedActions: [
        {
          key: "view_report",
          label: "리포트 보기",
          requiredCaps: ["view_reports"],
          targetNodeId: "reports",
        },
      ],
    },
    {
      preset: "CUSTOMER_APPROVAL",
      ui: {
        density: "compact",
        defaultRightPanel: "closed",
        highlight: {
          metricKeys: ["portfolio_count", "avg_health_score", "on_track_projects"],
          widgetKeys: ["KPI_PORTFOLIO_COUNT", "KPI_AVG_HEALTH", "PROJECT_HEALTH_TABLE_COMPACT"],
        },
        hiddenColumns: [
          "resource_utilization", "budget_burn", "risk_count",
          "spi", "cpi", "last_updated",
        ],
      },
    },
    {
      preset: "AUDIT_EVIDENCE",
      ui: {
        density: "compact",
        defaultRightPanel: "closed",
        highlight: {
          metricKeys: ["portfolio_count", "avg_health_score"],
          widgetKeys: ["KPI_PORTFOLIO_COUNT", "KPI_AVG_HEALTH", "HEALTH_HISTORY_TABLE"],
        },
      },
      suggestedActions: [
        {
          key: "export_evidence",
          label: "증빙 Export",
          requiredCaps: ["export_audit_evidence"],
          targetNodeId: "audit-evidence",
        },
      ],
    },
    // PM_WORK: Not visible (PM sees own project dashboard)
    // DEV_EXECUTION: Not visible
  ],

  deepLinks: [
    {
      pattern: "/pmo?healthGrade=:healthGrade",
      description: "Health 등급별 필터",
      requiredParams: ["healthGrade"],
    },
    {
      pattern: "/pmo?projectStatus=:projectStatus",
      description: "프로젝트 상태별 필터",
      requiredParams: ["projectStatus"],
    },
    {
      pattern: "/pmo?projectId=:projectId",
      description: "특정 프로젝트 포커스",
      requiredParams: ["projectId"],
    },
    {
      pattern: "/pmo?dateStart=:dateStart&dateEnd=:dateEnd",
      description: "날짜 범위 필터 (v2.1)",
      requiredParams: ["dateStart", "dateEnd"],
    },
  ],

  virtualNodes: [
    {
      virtualId: "pmo.critical",
      label: "위험 프로젝트",
      routeTemplate: "/pmo?projectStatus=critical",
      requiredParams: [],
      intents: ["ask_critical_projects"],
      description: "RED/Critical 상태 프로젝트 목록 직접 진입",
    },
    {
      virtualId: "pmo.delayed",
      label: "지연 프로젝트",
      routeTemplate: "/pmo?projectStatus=delayed",
      requiredParams: [],
      intents: ["ask_delayed_projects"],
      description: "지연 프로젝트 목록 직접 진입",
    },
    {
      virtualId: "pmo.on-track",
      label: "정상 프로젝트",
      routeTemplate: "/pmo?projectStatus=on_track",
      requiredParams: [],
      intents: ["ask_overall_status"],
      description: "정상 진행(on_track) 프로젝트 목록",
    },
  ],

  scope: {
    keys: ["portfolio"],
    params: [],                 // portfolio-level: no specific scope param
  },

  priority: 7,
};
```

### 2.4 Health Matrix 노드 (확정본)

```typescript
const pmoHealthNode: MenuOntologyNodeV2 = {
  nodeId: "pmo-health",
  label: "Health Matrix",
  route: "/pmo/health",
  icon: "MonitorHeartRounded",
  domain: "governance",
  nodeRole: "detail",            // Detail node — dimension/trend questions get bonus

  requiredCaps: ["view_pmo", "view_pmo_health"],  // v2.1: separated capability

  intents: [
    // Ask
    "ask_health_score",              // "프로젝트별 건강 점수 알려줘"
    "ask_health_dimension",          // "SPI가 가장 낮은 프로젝트는?"
    "ask_health_trend",              // "건강도 추이 알려줘"
    "ask_schedule_performance",      // "일정 성과 지수(SPI) 현황은?"
    "ask_cost_performance",          // "비용 성과 지수(CPI) 현황은?"
    "ask_quality_index",             // "품질 지표 현황은?"
    "ask_risk_index",                // "리스크 지수 현황은?"
    "ask_resource_index",            // "자원 활용률 현황은?"
    "ask_health_alert",              // "RED 알림 프로젝트 있어?"
    // Do
    "do_export_health_report",       // "건강도 리포트 Export"
  ],
  canonicalQuestions: [
    "프로젝트별 건강 점수 상세 알려줘",
    "SPI가 가장 낮은 프로젝트는?",
    "지난 3개월 건강도 추이 보여줘",
    "비용 초과 프로젝트 있어?",
    "품질 지표가 악화되는 프로젝트는?",
    "리스크 지수가 높은 프로젝트 목록",
    "자원 활용률이 부족한 프로젝트는?",
    "RED 알림이 뜬 프로젝트 보여줘",
    "건강도 리포트 내보내줘",
    "일정/비용/품질 차원별 비교 보여줘",
  ],
  entities: ["Project", "Phase", "Risk", "Sprint"],
  keywords: [
    "건강도", "헬스", "매트릭스", "SPI", "CPI", "품질", "리스크 지수",
    "자원 활용", "추이", "트렌드", "임계값", "알림",
    "health", "matrix", "score", "dimension", "trend",
    "schedule performance", "cost performance", "quality index",
    "risk index", "resource index", "threshold", "alert",
  ],
  metrics: [
    "overall_health_score",
    "schedule_performance_index",
    "cost_performance_index",
    "quality_index",
    "risk_index",
    "resource_index",
    "health_trend_direction",
    "red_alert_count",
    "yellow_alert_count",
    "green_count",
  ],

  filterSpec: {
    keys: [
      "projectId", "healthGrade", "dateRange", "dimension",
      "trendPeriod", "alertLevel", "sortBy", "sortDir", "q",
    ],
    defaults: {
      trendPeriod: "3m",
      sortBy: "overall",
      sortDir: "desc",
    },
  },

  defaultPreset: "PMO_CONTROL",
  presetPolicies: [
    {
      preset: "PMO_CONTROL",
      ui: {
        density: "detailed",
        defaultRightPanel: "open",
        highlight: {
          metricKeys: [
            "overall_health_score", "red_alert_count",
            "schedule_performance_index", "cost_performance_index",
          ],
          widgetKeys: [
            "HEALTH_MATRIX_TABLE", "HEALTH_RADAR_CHART",
            "HEALTH_TREND_CHART", "DIMENSION_RANKING",
          ],
        },
      },
      suggestedActions: [
        {
          key: "back_to_pmo",
          label: "PMO 대시보드",
          requiredCaps: ["view_pmo"],
          targetNodeId: "pmo",
        },
        {
          key: "export_health",
          label: "Health 리포트 Export",
          requiredCaps: ["export_pmo_reports"],  // v2.1: PMO-specific export cap
          targetNodeId: "reports",
        },
        {
          key: "navigate_project",
          label: "프로젝트 대시보드 이동",
          requiredCaps: ["view_dashboard"],
          targetNodeId: "dashboard",
        },
      ],
    },
    {
      preset: "EXEC_SUMMARY",
      ui: {
        density: "compact",
        defaultRightPanel: "closed",
        highlight: {
          metricKeys: ["overall_health_score", "red_alert_count"],
          widgetKeys: ["HEALTH_MATRIX_TABLE_COMPACT", "HEALTH_TREND_SPARKLINE"],
        },
        hiddenColumns: ["resource_index", "quality_detail", "risk_detail"],
      },
    },
    {
      preset: "AUDIT_EVIDENCE",
      ui: {
        density: "compact",
        defaultRightPanel: "closed",
        highlight: {
          metricKeys: ["overall_health_score"],
          widgetKeys: ["HEALTH_HISTORY_TABLE", "HEALTH_TREND_CHART"],
        },
      },
      suggestedActions: [
        {
          key: "export_evidence",
          label: "증빙 Export",
          requiredCaps: ["export_audit_evidence"],
          targetNodeId: "audit-evidence",
        },
      ],
    },
  ],

  deepLinks: [
    {
      pattern: "/pmo/health?dimension=:dimension",
      description: "차원별 Health Matrix 필터",
      requiredParams: ["dimension"],
    },
    {
      pattern: "/pmo/health?alertLevel=:alertLevel",
      description: "알림 레벨별 필터",
      requiredParams: ["alertLevel"],
    },
    {
      pattern: "/pmo/health?projectId=:projectId",
      description: "특정 프로젝트 Health 상세",
      requiredParams: ["projectId"],
    },
    {
      pattern: "/pmo/health?trendPeriod=:trendPeriod",
      description: "추세 기간 설정",
      requiredParams: ["trendPeriod"],
    },
    {
      pattern: "/pmo/health?sortBy=:sortBy&sortDir=:sortDir",
      description: "차원별 정렬",
      requiredParams: ["sortBy", "sortDir"],
    },
  ],

  virtualNodes: [
    {
      virtualId: "pmo-health.red-alerts",
      label: "RED 알림 프로젝트",
      routeTemplate: "/pmo/health?alertLevel=RED",
      requiredParams: [],
      intents: ["ask_health_alert", "ask_critical_projects"],
      description: "RED 임계값 초과 프로젝트 목록 직접 진입",
    },
    {
      virtualId: "pmo-health.schedule",
      label: "일정 성과 뷰",
      routeTemplate: "/pmo/health?dimension=schedule&sortBy=schedule&sortDir=asc",
      requiredParams: [],
      intents: ["ask_schedule_performance"],
      description: "SPI 기준 정렬된 프로젝트 건강도 뷰",
    },
    {
      virtualId: "pmo-health.cost",
      label: "비용 성과 뷰",
      routeTemplate: "/pmo/health?dimension=cost&sortBy=cost&sortDir=asc",
      requiredParams: [],
      intents: ["ask_cost_performance"],
      description: "CPI 기준 정렬된 프로젝트 건강도 뷰",
    },
    {
      virtualId: "pmo-health.quality",
      label: "품질 지표 뷰",
      routeTemplate: "/pmo/health?dimension=quality&sortBy=quality&sortDir=asc",
      requiredParams: [],
      intents: ["ask_quality_index"],
      description: "품질 지수 기준 정렬된 프로젝트 건강도 뷰",
    },
    {
      virtualId: "pmo-health.trend",
      label: "건강도 추이",
      routeTemplate: "/pmo/health?trendPeriod=3m",
      requiredParams: [],
      intents: ["ask_health_trend"],
      description: "3개월 건강도 추이 차트 직접 진입",
    },
  ],

  scope: {
    keys: ["portfolio"],
    params: [],
  },

  priority: 8,
};
```

### 2.5 FilterSpec URL 직렬화 규칙

> AI/프론트/백엔드가 동일한 직렬화 규칙을 공유해야 딥링크/북마크/히스토리가 깨지지 않는다.

**직렬화 방향**: `PmoFilterSpec -> URL query string -> PmoFilterSpec` (왕복 보장)

```typescript
/** FilterSpec -> URL 직렬화 */
function serializePmoFilter(filter: PmoFilterSpec): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filter)) {
    if (value === undefined || value === null) continue;
    // v2.1: projectId is always string[] (even 0/1 elements)
    if (key === "projectId" && Array.isArray(value)) {
      if (value.length > 0) params.set(key, value.join(","));
      continue;
    }
    // dateRange: object -> ISO string pair
    if (key === "dateRange" && typeof value === "object") {
      params.set("dateStart", value.start);
      params.set("dateEnd", value.end);
      continue;
    }
    params.set(key, String(value));
  }
  return params;
}

/** URL -> FilterSpec 역직렬화 (v2.1: always-array projectId + droppedFilters) */
interface DeserializeResult {
  filter: PmoFilterSpec;
  droppedFilters: { key: string; value: string; reason: string }[];  // v2.1
}

function deserializePmoFilter(params: URLSearchParams): DeserializeResult {
  const filter: PmoFilterSpec = {};
  const droppedFilters: { key: string; value: string; reason: string }[] = [];

  const enumKeys = {
    healthGrade: ["A", "B", "C", "D", "F"],
    projectStatus: ["on_track", "at_risk", "delayed", "critical"],
    dimension: ["schedule", "cost", "quality", "risk", "resource"],
    trendPeriod: ["1m", "3m", "6m", "1y"],
    alertLevel: ["RED", "YELLOW", "GREEN"],
    sortBy: ["overall", "schedule", "cost", "quality", "risk", "resource"],
    sortDir: ["asc", "desc"],
  } as const;

  const knownKeys = new Set([
    "projectId", "dateStart", "dateEnd", "q",
    ...Object.keys(enumKeys),
  ]);

  for (const [key, value] of params.entries()) {
    // v2.1: projectId always returns string[] (even single)
    if (key === "projectId") {
      filter.projectId = value.split(",").filter(Boolean);
      continue;
    }
    // dateRange reconstruction
    if (key === "dateStart" || key === "dateEnd") {
      if (!filter.dateRange) filter.dateRange = { start: "", end: "" };
      if (key === "dateStart") filter.dateRange.start = value;
      if (key === "dateEnd") filter.dateRange.end = value;
      continue;
    }
    // enum validation
    if (key in enumKeys) {
      if ((enumKeys as any)[key].includes(value)) {
        (filter as any)[key] = value;
      } else {
        // v2.1: track dropped invalid enum values
        droppedFilters.push({
          key, value,
          reason: `INVALID_ENUM: allowed=${(enumKeys as any)[key].join(",")}`,
        });
      }
      continue;
    }
    // string keys
    if (key === "q") {
      filter.q = value;
      continue;
    }
    // v2.1: unknown keys -> drop + track
    if (!knownKeys.has(key)) {
      droppedFilters.push({ key, value, reason: "UNKNOWN_KEY" });
    }
  }
  return { filter, droppedFilters };
}
```

**직렬화 규칙 요약**:

| 규칙 | 예시 | 설명 |
|------|------|------|
| projectId multi-select | `?projectId=PRJ-001,PRJ-002` | comma-separated, 내부는 항상 `string[]` (v2.1) |
| dateRange split | `?dateStart=2026-01-01&dateEnd=2026-02-08` | 별도 키로 분리 |
| enum 화이트리스트 | `?healthGrade=A` | 유효하지 않은 값은 drop + `droppedFilters`에 기록 (v2.1) |
| 기본값 생략 | `sortBy=overall` -> 키 생략 | URL 간결화 |
| 미지 키 추적 | `?futureKey=x` -> drop + `UNKNOWN_KEY` 기록 | 하위 호환성 보장 + 디버그 추적 (v2.1) |
| 경고 배지 | `droppedFilters.length > 0` | 상단에 "일부 필터가 무시됨" 배지 노출 (v2.1) |

> **v2.1 URL Canonical 규칙**:
> - URL에는 `dateRange`를 쓰지 않고 반드시 `dateStart`/`dateEnd`를 쓴다
> - FilterSpec 내부 표현은 `dateRange: { start, end }`로만 유지한다
> - `projectId`는 내부적으로 항상 `string[]`이고, URL 직렬화 시 comma-separated
> - 단일 프로젝트 선택도 `?projectId=PRJ-001` (배열 길이 1)

---

## 3. 화면 구조

### 3.1 Right Panel panelMode 정의

Right Panel은 항상 동일한 영역이지만, **panelMode**에 따라 표시 내용이 달라진다.

```typescript
/** PMO Dashboard Right Panel Mode */
export type PmoPanelMode =
  | "none"              // Right Panel 숨김 (EXEC_SUMMARY, CUSTOMER_APPROVAL)
  | "summary-overview"  // v2.1: 행 미선택 시 기본 요약 (Top Alerts + 등급하락 + Pending)
  | "project-detail"    // 선택한 프로젝트 상세 정보
  | "health-breakdown"  // 선택한 프로젝트 Health Score 분해
  | "milestone"         // 마일스톤 상세
  | "resource";         // 자원 배분 상세

/** Health Matrix Right Panel Mode */
export type HealthPanelMode =
  | "none"              // Right Panel 숨김
  | "dimension-overview" // v2.1: 행 미선택 시 차원별 worst TOP 3 + 최근 알림 요약
  | "dimension-detail"  // 선택한 프로젝트의 차원별 상세
  | "trend-detail"      // 선택한 프로젝트의 추세 상세
  | "alert-detail";     // 선택한 알림 상세
```

**panelMode 결정 규칙 (PMO Dashboard)**:

| 컨텍스트 | Preset | 기본 panelMode |
|---------|--------|---------------|
| 목록 + 행 미선택 | PMO_CONTROL | `"summary-overview"` (v2.1: Top 3 Alerts + 최근 등급 하락 + Pending approvals 요약) |
| 목록 + 프로젝트 행 선택 | PMO_CONTROL | `"project-detail"` |
| 목록 + Health Badge 클릭 | PMO_CONTROL | `"health-breakdown"` |
| 마일스톤 항목 클릭 | PMO_CONTROL | `"milestone"` |
| 자원 차트 항목 클릭 | PMO_CONTROL | `"resource"` |
| ANY | EXEC_SUMMARY | `"none"` (Right Panel 숨김) |
| ANY | CUSTOMER_APPROVAL | `"none"` (Right Panel 숨김) |

**panelMode 결정 규칙 (Health Matrix)**:

| 컨텍스트 | Preset | 기본 panelMode |
|---------|--------|---------------|
| 매트릭스 + 행 미선택 | PMO_CONTROL | `"dimension-overview"` (v2.1: 차원별 worst 프로젝트 TOP 3 + 최근 알림 요약) |
| 매트릭스 + 프로젝트 행 선택 | PMO_CONTROL | `"dimension-detail"` |
| 추세 차트 + 데이터포인트 클릭 | PMO_CONTROL | `"trend-detail"` |
| 알림 Badge 클릭 | PMO_CONTROL | `"alert-detail"` |
| ANY | EXEC_SUMMARY | `"none"` |

### 3.2 PMO 대시보드 (`/pmo`) — PMO_CONTROL Preset

```
┌──────────────────────────────────────────────────────────────┐
│  Page Header                                                  │
│  PMO 대시보드  [ 전체 포트폴리오 ]                              │
│  [ 필터 ▼ ]  [ 검색 ]          [ Export ] [ Preset: PMO ▼ ]  │
│  asOf: 2026-02-08 09:00                       [Refresh]      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Projects │  │ Avg.     │  │ Critical │  │ On Track │    │
│  │  Count   │  │ Health   │  │ Projects │  │ Projects │    │
│  │    5     │  │  B (76)  │  │   1 RED  │  │  3 GREEN │    │
│  │          │  │  🟡      │  │   🔴     │  │  🟢      │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                                                              │
│  ┌────────────────────────────────────────┬──────────────────┤
│  │  Project Health Table                  │ Project Detail   │
│  │                                        │                  │
│  │  Project   | Grade | Prog | SPI  | CPI │ [AI 보험심사]    │
│  │  ──────────────────────────────────── │                  │
│  │  AI보험심사 | 🟡 B  | 72%  | 0.92| 0.88│ Grade: B (76)   │
│  │  차세대Core | 🟢 A  | 85%  | 1.05| 1.02│                  │
│  │  디지털채널 | 🔴 D  | 45%  | 0.65| 0.58│ Schedule: 72     │
│  │  데이터분석 | 🟢 A  | 90%  | 1.10| 1.08│ Cost:     68     │
│  │  모바일앱   | 🟡 B  | 68%  | 0.85| 0.90│ Quality:  82     │
│  │                                        │ Risk:     70     │
│  │  ▸ 행 클릭 -> Right Panel 갱신         │ Resource: 80     │
│  │  ▸ 더블클릭 -> 프로젝트 대시보드 이동    │                  │
│  ├────────────────────────────────────────│ ──────────────── │
│  │  Cross-Project Resource Allocation     │ Pending Actions  │
│  │                                        │                  │
│  │  AI보험심사  ████████░░ 80%           │ - 결정-004 승인  │
│  │  차세대Core  ███████░░░ 70%           │ - 산출물-007 검토│
│  │  디지털채널  ██████████ 95% ⚠ Over   │ - 이슈-042 확인  │
│  │  데이터분석  ██████░░░░ 60%           │                  │
│  │  모바일앱    ████████░░ 78%           │ [▶ Health Matrix]│
│  │                                        │ [▶ 프로젝트 이동]│
│  ├────────────────────────────────────────┤                  │
│  │  Milestone Calendar                    │                  │
│  │                                        │                  │
│  │  Feb 2026                              │                  │
│  │  ──────────────────────────────        │                  │
│  │  10 ● AI보험심사 - Step2 완료 예정     │                  │
│  │  14 ● 차세대Core - 통합테스트 시작     │                  │
│  │  20 ● 디지털채널 - 설계 검토 회의      │                  │
│  │  28 ● 모바일앱 - Sprint-8 종료         │                  │
│  │                                        │                  │
│  └────────────────────────────────────────┴──────────────────┘
│                                                              │
│  ┌──────────────────────────────────────┐                    │
│  │  AI Insight                          │                    │
│  │                                      │                    │
│  │  ⚠ '디지털채널' 프로젝트 건강도 D 등급│                    │
│  │    SPI 0.65 / CPI 0.58 지속 하락     │                    │
│  │                                      │                    │
│  │  근거:                               │                    │
│  │  - Schedule: 35% 편차 (3주 지연)     │                    │
│  │  - Cost: 42% 초과 집행               │                    │
│  │                                      │                    │
│  │  1차: [▶ Health Matrix에서 상세 확인] │                    │
│  │  2차: [▶ 프로젝트 대시보드 이동]      │                    │
│  └──────────────────────────────────────┘                    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 3.3 Health Matrix (`/pmo/health`) — PMO_CONTROL Preset

```
┌──────────────────────────────────────────────────────────────┐
│  Page Header                                                  │
│  Health Matrix  [ 전체 포트폴리오 ]                            │
│  [ 필터 ▼ ] [ 기간: 3개월 ▼ ] [ 차원: 전체 ▼ ]               │
│  [ Export ] [ Preset: PMO ▼ ]                  [Refresh]     │
│  asOf: 2026-02-08 09:00                                      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Avg.     │  │  RED     │  │ YELLOW   │  │  GREEN   │    │
│  │ Health   │  │ Alerts   │  │ Alerts   │  │ Count    │    │
│  │  B (76)  │  │    1     │  │    2     │  │    2     │    │
│  │  🟡      │  │  🔴      │  │  🟡      │  │  🟢      │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                                                              │
│  ┌────────────────────────────────────────┬──────────────────┤
│  │  Health Matrix Table                   │ Dimension Detail │
│  │                                        │                  │
│  │  Project  |Overall|Sched|Cost |Qual|Rsk|Res│ [AI 보험심사]│
│  │  ─────────────────────────────────────│                  │
│  │  AI보험심사| B  76 | 72  | 68  | 82 | 70| 80│             │
│  │           | 🟡    | 🟡  | 🟡  | 🟢 | 🟡| 🟢│ Radar Chart │
│  │           |  ↘    | →   | ↘   | →  | ↗ | → │             │
│  │  차세대   | A  88 | 90  | 85  | 92 | 82| 90│   Sched ●   │
│  │           | 🟢    | 🟢  | 🟢  | 🟢 | 🟢| 🟢│  /    \     │
│  │           |  →    | →   | ↗   | →  | → | → │ Res●  ●Cost│
│  │  디지털채널| D  42 | 35  | 30  | 55 | 40| 50│  \    /     │
│  │           | 🔴    | 🔴  | 🔴  | 🟡 | 🔴| 🟡│   Risk●    │
│  │           |  ↘    | ↘   | ↘   | ↘  | → | ↘ │  ●Quality  │
│  │  데이터   | A  92 | 95  | 90  | 88 | 92| 95│             │
│  │           | 🟢    | 🟢  | 🟢  | 🟢 | 🟢| 🟢│ ─────────  │
│  │  모바일앱 | B  73 | 70  | 75  | 78 | 65| 78│ Trend (3M)  │
│  │           | 🟡    | 🟡  | 🟡  | 🟡 | 🟡| 🟡│ 82→76→72 ↘│
│  │           |  ↘    | ↘   | →   | →  | ↘ | → │             │
│  │                                        │ [Threshold]     │
│  │  ▸ 행 클릭 -> Radar + Trend 갱신      │ RED:  < 50      │
│  │  ▸ 차원 헤더 클릭 -> 정렬              │ YEL:  50-74     │
│  │  ▸ 셀 클릭 -> 차원 상세               │ GRN:  >= 75     │
│  │                                        │                  │
│  ├────────────────────────────────────────│ ─────────────── │
│  │  Health Trend Chart                    │ Alert History    │
│  │                                        │                  │
│  │  100┤                                  │ 2026-02-01      │
│  │     │ ╭──차세대                        │ 디지털채널 -> RED│
│  │  80 ┤─╯─────────데이터                 │ CPI: 0.58       │
│  │     │  ╲                              │                  │
│  │  60 ┤   ╲AI보험─── ──모바일            │ 2026-01-15      │
│  │     │    ╲                             │ AI보험심사 ->YEL│
│  │  40 ┤     ╲──디지털───                 │ SPI: 0.72       │
│  │     │                                  │                  │
│  │  20 ┤                                  │ 2025-12-20      │
│  │     ├─────────────────                 │ 모바일앱 -> YEL │
│  │     Dec    Jan    Feb                  │ Risk: 65        │
│  │                                        │                  │
│  └────────────────────────────────────────┴──────────────────┘
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 3.4 EXEC_SUMMARY (Sponsor) 와이어프레임

> **목표**: "30초 안에 포트폴리오 전체 상황을 파악한다"

```
┌──────────────────────────────────────────────────────────────┐
│  Page Header                                                  │
│  PMO 대시보드  [ 전체 포트폴리오 ]  [ Preset: EXEC ▼ ]       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │ Projects │  │ Avg.     │  │ Critical │                   │
│  │    5     │  │ Health B │  │  1 RED   │                   │
│  └──────────┘  └──────────┘  └──────────┘                   │
│                                                              │
│  ┌────────────────────────────────────────────────────┐      │
│  │  Project Health Summary (Compact Table)             │      │
│  │                                                    │      │
│  │  Project        | Grade | Progress | Status        │      │
│  │  ────────────────────────────────────────          │      │
│  │  AI보험심사      | 🟡 B  |  72%    | On Track     │      │
│  │  차세대Core      | 🟢 A  |  85%    | On Track     │      │
│  │  디지털채널      | 🔴 D  |  45%    | Critical     │      │
│  │  데이터분석      | 🟢 A  |  90%    | On Track     │      │
│  │  모바일앱        | 🟡 B  |  68%    | At Risk      │      │
│  │                                                    │      │
│  │  ▸ 행 클릭 -> 프로젝트 대시보드 이동               │      │
│  └────────────────────────────────────────────────────┘      │
│                                                              │
│  ┌──────────────────────────────────────┐                    │
│  │ [ 리포트 보기 ]  (Primary CTA)       │                    │
│  └──────────────────────────────────────┘                    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 3.5 AUDIT_EVIDENCE (Auditor) 와이어프레임

> **목표**: "포트폴리오 건강도 이력을 감사 증빙으로 확인/Export 한다"

```
┌──────────────────────────────────────────────────────────────┐
│  Page Header                                                  │
│  PMO 대시보드  [ 전체 포트폴리오 ]  [ Preset: AUDIT ▼ ]      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐  ┌──────────┐                                  │
│  │ Projects │  │ Avg.     │                                  │
│  │    5     │  │ Health B │                                  │
│  └──────────┘  └──────────┘                                  │
│                                                              │
│  ┌────────────────────────────────────────────────────┐      │
│  │  Health History Table                               │      │
│  │                                                    │      │
│  │  Date       | Project    | Grade | Change | Note   │      │
│  │  ─────────────────────────────────────────────     │      │
│  │  2026-02-01 | 디지털채널  | D     | C->D   | CPI↘  │      │
│  │  2026-01-15 | AI보험심사  | B     | A->B   | SPI↘  │      │
│  │  2025-12-20 | 모바일앱    | B     | A->B   | Risk↘ │      │
│  │  2025-12-01 | ALL        | A     | -      | Init   │      │
│  │                                                    │      │
│  └────────────────────────────────────────────────────┘      │
│                                                              │
│  ┌──────────────────────────────────────┐                    │
│  │ [ 증빙 Export ]  (Primary CTA)       │                    │
│  └──────────────────────────────────────┘                    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. Preset별 차이

### 4.1 PMO Dashboard (`/pmo`) Preset 비교

| 항목 | PMO_CONTROL | EXEC_SUMMARY | CUSTOMER_APPROVAL | AUDIT_EVIDENCE |
|------|------------|--------------|-------------------|---------------|
| **밀도** | standard | compact | compact | compact |
| **Right Panel** | open | closed | closed | closed |
| **KPI Cards** | 4개 (Count/Health/Critical/OnTrack) | 3개 (Count/Health/Critical) | 3개 (Count/Health/OnTrack) | 2개 (Count/Health) |
| **Project Table** | Full (Grade/Prog/SPI/CPI/Risk/Resource) | Compact (Grade/Prog/Status) | Compact (Grade/Prog/Status) | History (Date/Grade/Change) |
| **Resource Chart** | Visible | Hidden | Hidden | Hidden |
| **Milestone Calendar** | Visible | Hidden | Hidden | Hidden |
| **AI Insight** | Visible | Hidden | Hidden | Hidden |
| **Primary CTA** | Health Matrix / Export | Report | - | Evidence Export |
| **행 클릭 동작** | Right Panel 갱신 | Project Dashboard 이동 | Project Dashboard 이동 | - |
| **숨김 컬럼** | - | resource, budget, updated | resource, budget, risk, spi, cpi, updated | - |

### 4.2 Health Matrix (`/pmo/health`) Preset 비교

| 항목 | PMO_CONTROL | EXEC_SUMMARY | AUDIT_EVIDENCE |
|------|------------|--------------|---------------|
| **밀도** | detailed | compact | compact |
| **Right Panel** | open (Radar+Trend) | closed | closed |
| **Matrix Table** | Full (5 dimensions + trend arrows) | Compact (Overall + top/bottom) | History Table |
| **Radar Chart** | Visible | Hidden | Hidden |
| **Trend Chart** | Visible (full line chart) | Sparkline only | Visible (export target) |
| **Dimension Ranking** | Visible | Hidden | Hidden |
| **Alert History** | Right Panel | Hidden | Visible |
| **Primary CTA** | PMO Dashboard / Export | Report | Evidence Export |

### 4.3 Preset 미노출 화면

| Preset | PMO Dashboard | Health Matrix | 사유 |
|--------|--------------|---------------|------|
| PM_WORK | Not visible | Not visible | PM은 자기 프로젝트 대시보드(`/dashboard`)를 사용 |
| DEV_EXECUTION | Not visible | Not visible | DEV는 실행 화면(`/kanban`, `/my-work`)에 집중 |

---

## 5. Health Matrix 상세 (점수 모델)

### 5.1 5차원 Health Scoring Model

```
┌─────────────────────────────────────────────────────────────┐
│                   Overall Health Score                        │
│                                                             │
│          Overall = Weighted Average of 5 Dimensions          │
│                                                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────┐│
│  │Schedule │ │  Cost   │ │ Quality │ │  Risk   │ │Resour.││
│  │  (SPI)  │ │  (CPI)  │ │  (QI)   │ │  (RI)   │ │ (ReI) ││
│  │ w=0.25  │ │ w=0.20  │ │ w=0.20  │ │ w=0.20  │ │w=0.15 ││
│  │         │ │         │ │         │ │         │ │       ││
│  │ 0-100   │ │ 0-100   │ │ 0-100   │ │ 0-100   │ │ 0-100 ││
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └───────┘│
│                                                             │
│  Overall Health = SPI*0.25 + CPI*0.20 + QI*0.20             │
│                + RI*0.20  + ReI*0.15                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 차원별 점수 계산

```typescript
/** 5 Health Dimensions */
export interface HealthDimensions {
  schedule: HealthDimensionScore;    // Schedule Performance Index
  cost: HealthDimensionScore;        // Cost Performance Index
  quality: HealthDimensionScore;     // Quality Index
  risk: HealthDimensionScore;        // Risk Index
  resource: HealthDimensionScore;    // Resource Index
}

export interface HealthDimensionScore {
  /** 0-100 normalized score */
  score: number;
  /** A/B/C/D/F grade */
  grade: "A" | "B" | "C" | "D" | "F";
  /** Alert level */
  alertLevel: "GREEN" | "YELLOW" | "RED";
  /** Trend direction */
  trend: "improving" | "stable" | "declining";
  /** Raw metric value (before normalization) */
  rawValue: number;
  /** Unit of raw value */
  rawUnit: string;
  /** v2.1: metric basis — what unit the project uses for this dimension */
  metricBasis: MetricBasis;
  /** Data completeness */
  completeness: "ok" | "partial" | "missing";
  /** v2.1: dimension-level confidence (QI is frequently partial) */
  dimensionConfidence: "full" | "partial" | "missing";
  /** Last updated */
  refreshedAt: string;
}

/** v2.1: metric basis metadata for cross-project comparability */
export type MetricBasis =
  | { type: "story_points" }
  | { type: "hours" }
  | { type: "wbs_weight" }
  | { type: "deliverables" }
  | { type: "currency"; unit: string }   // CPI only
  | { type: "composite" };                // RI/ReI
```

#### 5.2.1 Schedule Performance Index (SPI)

```
Input:
  planned_work = sum of planned work (story points or hours) up to current date
  earned_work  = sum of completed work (story points or hours) up to current date

SPI_raw = earned_work / max(planned_work, 1)

Score normalization:
  IF SPI_raw >= 1.0:  score = min(100, 50 + SPI_raw * 50)
  IF SPI_raw >= 0.8:  score = 50 + (SPI_raw - 0.8) * 250     // 0.8->50, 1.0->100
  IF SPI_raw >= 0.6:  score = 25 + (SPI_raw - 0.6) * 125     // 0.6->25, 0.8->50
  IF SPI_raw >= 0.4:  score = (SPI_raw - 0.4) * 125           // 0.4->0,  0.6->25
  IF SPI_raw <  0.4:  score = 0

Raw Unit: ratio (e.g., 0.92)
```

#### 5.2.2 Cost Performance Index (CPI)

```
Input:
  budgeted_cost = planned budget for completed work
  actual_cost   = actual expenditure for completed work

CPI_raw = budgeted_cost / max(actual_cost, 1)

Score normalization:
  Same as SPI normalization (CPI_raw maps to 0-100 with same thresholds)

Raw Unit: ratio (e.g., 0.88)
```

#### 5.2.3 Quality Index (QI)

```
Input:
  test_pass_rate   = passed_tests / max(total_tests, 1) * 100
  defect_density   = open_defects / max(total_story_points, 1)
  review_rate      = reviewed_deliverables / max(total_deliverables, 1) * 100

QI_raw = (test_pass_rate * 0.40) + ((1 - min(defect_density, 1)) * 100 * 0.35)
       + (review_rate * 0.25)

Score = QI_raw (already 0-100 range)

Raw Unit: percentage (e.g., 82.5)
```

#### 5.2.4 Risk Index (RI)

```
Input:
  critical_risks  = count of CRITICAL severity open risks
  high_risks      = count of HIGH severity open risks
  medium_risks    = count of MEDIUM severity open risks
  total_risks     = critical + high + medium + low
  mitigation_rate = risks_with_mitigation / max(total_risks, 1) * 100

RI_risk_score = max(0, 100 - (critical_risks * 25 + high_risks * 10 + medium_risks * 3))
RI_raw = RI_risk_score * 0.60 + mitigation_rate * 0.40

Score = RI_raw (0-100)

Raw Unit: composite score (e.g., 70.0)
```

#### 5.2.5 Resource Index (ReI)

```
Input:
  utilization_rate = actual_hours / max(available_hours, 1) * 100
  availability     = available_resources / max(required_resources, 1) * 100

// Utilization penalty: both under and over-utilization reduce score
utilization_score = max(0, 100 - abs(utilization_rate - 80) * 2)
                    // optimal = 80%, penalty increases linearly

availability_score = min(availability, 100)

ReI_raw = utilization_score * 0.50 + availability_score * 0.50

Score = ReI_raw (0-100)

Raw Unit: percentage (e.g., 80.0)
```

### 5.3 등급 및 임계값

| Grade | Score Range | Alert Level | Color | Meaning |
|-------|-----------|-------------|-------|---------|
| A | 90 - 100 | GREEN | `#4CAF50` | Excellent - On Track |
| B | 75 - 89 | GREEN | `#8BC34A` | Good - Minor Attention |
| C | 60 - 74 | YELLOW | `#FFC107` | Warning - Needs Action |
| D | 40 - 59 | RED | `#FF5722` | Critical - Immediate Action |
| F | 0 - 39 | RED | `#F44336` | Failing - Escalation Required |

### 5.4 Trend (추세) 계산

```typescript
export type TrendDirection = "improving" | "stable" | "declining";

function computeTrend(
  currentScore: number,
  previousScore: number,  // previous period's score
  threshold: number = 5   // minimum delta to count as change
): TrendDirection {
  const delta = currentScore - previousScore;
  if (delta > threshold) return "improving";
  if (delta < -threshold) return "declining";
  return "stable";
}

// Trend arrow mapping
const TREND_ARROWS: Record<TrendDirection, string> = {
  improving: "↗",
  stable:    "→",
  declining: "↘",
};
```

### 5.5 Overall Health Score 계산

```typescript
interface HealthWeightConfig {
  schedule: number;   // 0.25
  cost: number;       // 0.20
  quality: number;    // 0.20
  risk: number;       // 0.20
  resource: number;   // 0.15
}

const DEFAULT_WEIGHTS: HealthWeightConfig = {
  schedule: 0.25,
  cost: 0.20,
  quality: 0.20,
  risk: 0.20,
  resource: 0.15,
};

interface OverallHealthResult {
  score: number | null;
  grade: "A" | "B" | "C" | "D" | "F" | null;
  alertLevel: "GREEN" | "YELLOW" | "RED" | null;
  trend: TrendDirection;
  dimensions: HealthDimensions;
  missingDimensions: string[];
  confidence: "full" | "partial" | "insufficient";
  gradeCapReason?: string;
}

function computeOverallHealth(
  dimensions: HealthDimensions,
  weights: HealthWeightConfig = DEFAULT_WEIGHTS
): OverallHealthResult {
  const entries = Object.entries(dimensions) as [string, HealthDimensionScore][];
  const available = entries.filter(([_, d]) => d.completeness !== "missing");
  const missing = entries.filter(([_, d]) => d.completeness === "missing").map(([k]) => k);

  // All missing -> null
  if (available.length === 0) {
    return {
      score: null, grade: null, alertLevel: null,
      trend: "stable", dimensions, missingDimensions: missing,
      confidence: "insufficient",
    };
  }

  // Renormalize weights for available dimensions
  const totalAvailableWeight = available.reduce(
    (sum, [key]) => sum + (weights as any)[key], 0
  );
  const renormalizedWeights: Record<string, number> = {};
  for (const [key] of available) {
    renormalizedWeights[key] = (weights as any)[key] / totalAvailableWeight;
  }

  // Weighted average
  let score = 0;
  for (const [key, dim] of available) {
    score += dim.score * renormalizedWeights[key];
  }
  score = Math.round(score * 100) / 100;

  // Grade
  let grade = scoreToGrade(score);
  let gradeCapReason: string | undefined;

  // v2.1: Grade cap based on dimension IMPORTANCE, not just count
  // Core dimensions (schedule, cost) are critical for PMO decision-making
  const CORE_DIMENSIONS = ["schedule", "cost"];
  const missingCore = missing.filter(d => CORE_DIMENSIONS.includes(d));

  if (missingCore.length >= 2) {
    // Both schedule AND cost missing -> grade null (insufficient for PMO)
    grade = null;
    gradeCapReason = `Core dimensions (${missingCore.join(", ")}) missing - grade not assessable`;
  } else if (missingCore.length === 1) {
    // One core dimension missing -> cap at C
    if (grade === "A" || grade === "B") {
      grade = "C";
      gradeCapReason = `Core dimension (${missingCore[0]}) missing - grade capped at C`;
    }
  } else if (missing.length >= 2) {
    // 2+ non-core dimensions missing -> cap at B (original rule)
    if (grade === "A") {
      grade = "B";
      gradeCapReason = `${missing.length} non-core dimensions missing - grade capped at B`;
    }
  }

  const alertLevel = gradeToAlertLevel(grade);
  const confidence: "full" | "partial" | "insufficient" =
    missing.length === 0 ? "full" :
    missing.length <= 2 ? "partial" : "insufficient";

  return {
    score, grade, alertLevel,
    trend: computeOverallTrend(dimensions),
    dimensions, missingDimensions: missing,
    confidence, gradeCapReason,
  };
}

function scoreToGrade(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

function gradeToAlertLevel(grade: string): "GREEN" | "YELLOW" | "RED" {
  if (grade === "A" || grade === "B") return "GREEN";
  if (grade === "C") return "YELLOW";
  return "RED";
}

function computeOverallTrend(dimensions: HealthDimensions): TrendDirection {
  const trends = Object.values(dimensions)
    .filter(d => d.completeness !== "missing")
    .map(d => d.trend);
  const improving = trends.filter(t => t === "improving").length;
  const declining = trends.filter(t => t === "declining").length;
  if (improving > declining + 1) return "improving";
  if (declining > improving + 1) return "declining";
  return "stable";
}
```

### 5.6 결측(Missing) 데이터 처리 규칙

| 상황 | 처리 | 결과 |
|------|------|------|
| 모든 차원 정상 | 정상 계산 | 정상 점수, confidence=full |
| 비핵심 1개 결측 | 나머지 weight renormalize | 점수 유효, confidence=partial |
| 비핵심 2개+ 결측 | renormalize + **등급 상한 B** | confidence=partial, "데이터 부족" 배지 표시 |
| **핵심(schedule 또는 cost) 1개 결측** | renormalize + **등급 상한 C** (v2.1) | confidence=partial, "핵심 차원 부족" 경고 배지 |
| **핵심(schedule+cost) 둘 다 결측** | score 계산은 하되 **grade=null** (v2.1) | "등급 산정 불가(데이터 부족)" 명시 표시 |
| 전체 결측 | score=null | "N/A" 표시, confidence=insufficient |

> **v2.1 핵심 차원 정의**: `schedule`과 `cost`는 PMO 의사결정의 핵심 입력이므로, 이 차원이 결측이면
> 다른 차원이 모두 양호해도 등급을 보수적으로 제한한다. 이는 "좋은 점수를 보여주되 근거가 불충분한" 상황을 방지한다.

### 5.7 스냅샷 불변성 (v2.1)

Health Trend의 신뢰도는 **과거 스냅샷의 불변성**에 달려 있다.

```typescript
/** v2.1: Health snapshot for immutable trend history */
interface HealthSnapshot {
  /** Unique snapshot ID */
  snapshotId: string;
  /** Snapshot timestamp (immutable) */
  snapshotAt: string;
  /** Calculation logic version (e.g., "2.1.0") */
  calcVersion: string;
  /** Project health at snapshot time */
  projectId: string;
  overall: OverallHealthResult;
  dimensions: HealthDimensions;
}
```

**스냅샷 규칙**:

| 규칙 | 설명 |
|------|------|
| **Immutable** | 한번 생성된 스냅샷은 수정/삭제 불가 |
| **calcVersion** | 산정 로직이 변경되면 새 버전으로 기록. 과거 스냅샷은 당시 로직으로 산정된 값 유지 |
| **주기** | 매일 자정(KST) 자동 스냅샷 + 등급 변경 시 즉시 스냅샷 |
| **보존** | 최소 2년 보존 (감사 요구사항) |
| **UI 노출** | Trend Chart 툴팁에 `calcVersion` 표시, 버전 변경 지점에 마커 |
| **소급 재계산** | 허용하지 않음. 로직 변경 시 "변경 이후" 스냅샷만 새 로직 적용 |

---

## 6. 데이터 구조 / API

### 6.1 Portfolio Summary API

```
GET /api/pmo/portfolio
```

```typescript
interface PortfolioSummary {
  projects: ProjectHealthSummary[];
  aggregated: PortfolioAggregation;
  asOf: string;                       // portfolio-level asOf (= min of all project asOfs)
  /** v2.1: how portfolio-level asOf was determined */
  asOfStrategy: "min" | "max" | "snapshot";
  /** v2.1: per-project asOf map for staleness detection */
  projectAsOfMap: Record<string, string>;
  completeness: {
    projects: CompletenessStatus;
    health: CompletenessStatus;
    resources: CompletenessStatus;
  };
  warnings: DataWarning[];
}

interface ProjectHealthSummary {
  id: string;
  name: string;
  client: string;
  status: "on_track" | "at_risk" | "delayed" | "critical";
  progress: number;            // 0-100
  healthScore: OverallHealthResult;
  spiRaw: number;              // raw SPI ratio
  cpiRaw: number;              // raw CPI ratio
  riskCount: {
    critical: number;
    high: number;
    total: number;
  };
  resourceUtilization: number; // 0-100
  budgetBurnRate: number;      // 0-100
  pendingApprovals: number;
  nextMilestone?: {
    name: string;
    date: string;
    daysRemaining: number;
  };
  lastUpdated: string;
  /** v2.1: project-level asOf for staleness badge (warn if >24h old) */
  projectAsOf: string;
  /** v2.1: metric basis for SPI/CPI comparability across portfolio */
  metricBasis: {
    schedule: "story_points" | "hours" | "wbs_weight" | "deliverables";
    cost: "currency";
  };
}

interface PortfolioAggregation {
  totalProjects: number;
  avgHealthScore: number;
  avgHealthGrade: string;
  criticalProjects: number;
  atRiskProjects: number;
  onTrackProjects: number;
  delayedProjects: number;
  totalPendingApprovals: number;
  portfolioBudgetBurn: number;
  totalResources: number;
  avgResourceUtilization: number;
}

interface DataWarning {
  code: string;
  message: string;
  severity: "info" | "warning" | "error";
  projectId?: string;
}
```

### 6.2 Health Matrix API

```
GET /api/pmo/health?trendPeriod=3m&sortBy=overall&sortDir=desc
```

```typescript
interface HealthMatrixResponse {
  projects: ProjectHealthDetail[];
  aggregated: HealthAggregation;
  trendPeriod: "1m" | "3m" | "6m" | "1y";
  asOf: string;
  /** v2.1: actually applied filter (after defaults/drops) */
  appliedFilter: Partial<HealthMatrixFilterSpec>;
  /** v2.1: actually applied sort (may differ from request if invalid) */
  appliedSort: { sortBy: string; sortDir: "asc" | "desc" };
  /** v2.1: filters that were dropped/defaulted */
  droppedFilters?: { key: string; value: string; reason: string }[];
  /** v2.1: snapshot version for audit trail */
  calcVersion: string;
}

interface ProjectHealthDetail {
  id: string;
  name: string;
  overall: OverallHealthResult;
  dimensions: HealthDimensions;
  trend: {
    period: string;
    dataPoints: HealthTrendPoint[];
  };
  alerts: HealthAlert[];
}

interface HealthTrendPoint {
  date: string;
  overall: number;
  schedule: number;
  cost: number;
  quality: number;
  risk: number;
  resource: number;
}

interface HealthAlert {
  id: string;
  date: string;
  dimension: string;
  previousGrade: string;
  newGrade: string;
  previousScore: number;
  newScore: number;
  description: string;
  severity: "info" | "warning" | "critical";
}

interface HealthAggregation {
  avgOverall: number;
  redAlerts: number;
  yellowAlerts: number;
  greenCount: number;
  worstDimension: string;
  bestDimension: string;
}
```

### 6.3 Cross-Project Resource API

```
GET /api/pmo/resources
```

```typescript
interface CrossProjectResources {
  projects: ProjectResourceSummary[];
  total: {
    totalResources: number;
    totalAvailable: number;
    avgUtilization: number;
    overAllocated: number;     // projects with > 90% utilization
    underAllocated: number;    // projects with < 50% utilization
  };
  asOf: string;
}

interface ProjectResourceSummary {
  projectId: string;
  projectName: string;
  totalMembers: number;
  utilization: number;          // 0-100
  available: number;            // available capacity percentage
  overAllocatedRoles: string[]; // roles with > 100% allocation
}
```

### 6.4 Milestone Calendar API

```
GET /api/pmo/milestones?dateStart=2026-02-01&dateEnd=2026-02-28
```

```typescript
interface MilestoneCalendar {
  milestones: ProjectMilestone[];
  dateRange: { start: string; end: string };
}

interface ProjectMilestone {
  id: string;
  projectId: string;
  projectName: string;
  name: string;
  date: string;
  status: "upcoming" | "today" | "overdue" | "completed";
  daysRemaining: number;
  relatedPhaseId?: string;
  relatedSprintId?: string;
}
```

### 6.5 Health History API (Audit)

```
GET /api/pmo/health/history?dateStart=2025-12-01&dateEnd=2026-02-08
```

```typescript
interface HealthHistory {
  entries: HealthHistoryEntry[];
  dateRange: { start: string; end: string };
  /** v2.1: calculation logic version used for each entry */
  calcVersions: { version: string; validFrom: string; description: string }[];
}

interface HealthHistoryEntry {
  id: string;
  date: string;
  projectId: string;
  projectName: string;
  previousGrade: string | null;
  newGrade: string;
  previousScore: number | null;
  newScore: number;
  changeType: "initial" | "upgrade" | "downgrade" | "stable";
  /** v2.1: snapshot-based immutable record */
  snapshotId: string;
  /** v2.1: calculation logic version at snapshot time */
  calcVersion: string;
  note: string;
  dimensions: {
    schedule: number;
    cost: number;
    quality: number;
    risk: number;
    resource: number;
  };
}
```

### 6.6 Single Project Health Detail API

```
GET /api/pmo/health/:projectId
```

```typescript
interface SingleProjectHealth {
  project: {
    id: string;
    name: string;
    client: string;
  };
  overall: OverallHealthResult;
  dimensions: HealthDimensions;
  dimensionDetails: {
    schedule: ScheduleDetail;
    cost: CostDetail;
    quality: QualityDetail;
    risk: RiskDetail;
    resource: ResourceDetail;
  };
  trend: {
    period: string;
    dataPoints: HealthTrendPoint[];
  };
  alerts: HealthAlert[];
  asOf: string;
}

interface ScheduleDetail {
  plannedWork: number;
  earnedWork: number;
  spiRaw: number;
  delayedPhases: { id: string; name: string; deviationDays: number }[];
}

interface CostDetail {
  budgetedCost: number;
  actualCost: number;
  cpiRaw: number;
  overBudgetCategories: { category: string; overAmount: number }[];
}

interface QualityDetail {
  testPassRate: number;
  defectDensity: number;
  reviewRate: number;
  openDefects: number;
  totalTests: number;
}

interface RiskDetail {
  criticalRisks: number;
  highRisks: number;
  mediumRisks: number;
  totalRisks: number;
  mitigationRate: number;
  topRisks: { id: string; title: string; severity: string }[];
}

interface ResourceDetail {
  totalMembers: number;
  utilizationRate: number;
  availabilityRate: number;
  overAllocatedRoles: string[];
  underAllocatedRoles: string[];
}
```

---

## 7. 컴포넌트 분해

### 7.1 폴더 구조

```
features/
  pmo/
    pages/
      PmoDashboardPage.tsx          <- Portfolio Hub (DashboardShell-like assembly)
      HealthMatrixPage.tsx           <- Health Matrix Detail page
    layout/
      PmoShell.tsx                   <- Common layout (KPI + Main + RightPanel)
      PmoKpiSlot.tsx                 <- KPI Row slot renderer
      PmoMainSlot.tsx                <- Main area slot renderer
      PmoRightPanelSlot.tsx          <- Right Panel slot renderer
    components/
      // KPI Cards
      PortfolioKpiCards.tsx           <- Portfolio KPI Card Row
      PortfolioKpiCard.tsx            <- Single KPI Card (generic)
      HealthGradeBadge.tsx            <- Health Grade badge (A~F, colored)
      AlertLevelIndicator.tsx         <- RED/YELLOW/GREEN indicator

      // PMO Dashboard Widgets
      ProjectHealthTable.tsx          <- Portfolio project list with health scores
      ProjectHealthTableCompact.tsx   <- Compact version for EXEC/CUSTOMER
      CrossProjectResourceChart.tsx   <- Resource allocation bar chart
      MilestoneCalendar.tsx           <- Monthly milestone calendar
      PmoAiInsightWidget.tsx          <- AI Insight for portfolio (3-tier)

      // PMO Right Panel
      ProjectDetailPanel.tsx          <- Selected project detail
      HealthBreakdownPanel.tsx        <- Selected project health breakdown
      MilestoneDetailPanel.tsx        <- Milestone detail view
      ResourceDetailPanel.tsx         <- Resource detail view
      PendingActionsPanel.tsx         <- Pending approvals/actions list

      // Health Matrix Widgets
      HealthMatrixTable.tsx           <- Full matrix (5 dimensions + trends)
      HealthMatrixTableCompact.tsx    <- Compact matrix (overall + status)
      HealthRadarChart.tsx            <- Radar/Spider chart for selected project
      HealthTrendChart.tsx            <- Multi-line trend chart
      HealthTrendSparkline.tsx        <- Compact sparkline for EXEC preset
      DimensionRankingTable.tsx       <- Ranking by selected dimension
      AlertHistoryPanel.tsx           <- Alert timeline in Right Panel

      // Health History (Audit)
      HealthHistoryTable.tsx          <- Health change history table

      // Shared
      TrendArrow.tsx                  <- Trend direction indicator (up/stable/down)
      DataIncompleteBadge.tsx         <- "Data insufficient" badge
      DrilldownButton.tsx             <- Navigate to project dashboard

    config/
      pmoPresetLayouts.ts             <- PMO DashboardPresetLayout definitions
      healthPresetLayouts.ts          <- Health Matrix PresetLayout definitions
      pmoWidgetRegistry.ts            <- WidgetKey -> React Component mapping
      healthWeights.ts                <- Default health dimension weights
      widgetKeyConstants.ts           <- v2.1: as const WidgetKey single source of truth
      pmoCapabilityConfig.ts          <- v2.1: capability definitions + route guard config
    api/
      pmoApi.ts                       <- Portfolio/Health API calls
    hooks/
      usePortfolioSummary.ts          <- TanStack Query for portfolio data
      useHealthMatrix.ts              <- TanStack Query for health matrix data
      useHealthDetail.ts              <- TanStack Query for single project health
      useCrossProjectResources.ts     <- TanStack Query for resource data
      useMilestoneCalendar.ts         <- TanStack Query for milestones
      useHealthHistory.ts             <- TanStack Query for health history (audit)
      usePmoPanelMode.ts              <- Panel mode state management
      usePmoRouteGuard.ts             <- v2.1: capability + preset route guard
      useDroppedFilterBadge.ts        <- v2.1: invalid filter tracking + badge state
    types/
      health.ts                       <- Health scoring types
      portfolio.ts                    <- Portfolio API types
```

### 7.2 WidgetKey 정의

> **v2.1**: `as const` 단일 소스 패턴으로 변경. 레지스트리/레이아웃이 이 객체를 import해서 사용하므로
> 오타/불일치가 **컴파일 타임**에 잡힌다.

```typescript
// config/widgetKeyConstants.ts — SINGLE SOURCE OF TRUTH (v2.1)

/** PMO Dashboard Widget Keys */
export const PMO_WIDGET_KEYS = {
  // KPI Cards
  KPI_PORTFOLIO_COUNT: "KPI_PORTFOLIO_COUNT",
  KPI_AVG_HEALTH: "KPI_AVG_HEALTH",
  KPI_CRITICAL: "KPI_CRITICAL",
  KPI_ON_TRACK: "KPI_ON_TRACK",
  KPI_DELAYED: "KPI_DELAYED",
  KPI_BUDGET_BURN: "KPI_BUDGET_BURN",
  // PMO Main Widgets
  PROJECT_HEALTH_TABLE: "PROJECT_HEALTH_TABLE",
  PROJECT_HEALTH_TABLE_COMPACT: "PROJECT_HEALTH_TABLE_COMPACT",
  CROSS_RESOURCE_CHART: "CROSS_RESOURCE_CHART",
  MILESTONE_CALENDAR: "MILESTONE_CALENDAR",
  PMO_AI_INSIGHT: "PMO_AI_INSIGHT",
  // PMO Right Panel
  SUMMARY_OVERVIEW_PANEL: "SUMMARY_OVERVIEW_PANEL",   // v2.1: default panel
  PROJECT_DETAIL_PANEL: "PROJECT_DETAIL_PANEL",
  HEALTH_BREAKDOWN_PANEL: "HEALTH_BREAKDOWN_PANEL",
  MILESTONE_DETAIL_PANEL: "MILESTONE_DETAIL_PANEL",
  RESOURCE_DETAIL_PANEL: "RESOURCE_DETAIL_PANEL",
  PENDING_ACTIONS_PANEL: "PENDING_ACTIONS_PANEL",
} as const;

export type PmoWidgetKey = typeof PMO_WIDGET_KEYS[keyof typeof PMO_WIDGET_KEYS];

/** Health Matrix Widget Keys */
export const HEALTH_WIDGET_KEYS = {
  // KPI Cards
  KPI_AVG_HEALTH: "KPI_AVG_HEALTH",
  KPI_RED_ALERTS: "KPI_RED_ALERTS",
  KPI_YELLOW_ALERTS: "KPI_YELLOW_ALERTS",
  KPI_GREEN_COUNT: "KPI_GREEN_COUNT",
  // Health Main Widgets
  HEALTH_MATRIX_TABLE: "HEALTH_MATRIX_TABLE",
  HEALTH_MATRIX_TABLE_COMPACT: "HEALTH_MATRIX_TABLE_COMPACT",
  HEALTH_RADAR_CHART: "HEALTH_RADAR_CHART",
  HEALTH_TREND_CHART: "HEALTH_TREND_CHART",
  HEALTH_TREND_SPARKLINE: "HEALTH_TREND_SPARKLINE",
  DIMENSION_RANKING: "DIMENSION_RANKING",
  HEALTH_HISTORY_TABLE: "HEALTH_HISTORY_TABLE",
  // Health Right Panel
  DIMENSION_OVERVIEW_PANEL: "DIMENSION_OVERVIEW_PANEL",  // v2.1: default panel
  DIMENSION_DETAIL_PANEL: "DIMENSION_DETAIL_PANEL",
  TREND_DETAIL_PANEL: "TREND_DETAIL_PANEL",
  ALERT_DETAIL_PANEL: "ALERT_DETAIL_PANEL",
  ALERT_HISTORY_PANEL: "ALERT_HISTORY_PANEL",
} as const;

export type HealthWidgetKey = typeof HEALTH_WIDGET_KEYS[keyof typeof HEALTH_WIDGET_KEYS];
```

#### 7.2.1 KPI Card Context Prop (v2.1)

KPI_AVG_HEALTH가 PMO/Health 양쪽에 존재하지만 의미(필터/기간)가 다를 수 있으므로,
카드에 `context`를 주입하여 동작/툴팁을 분리한다.

```typescript
/** v2.1: KPI Card context — determines tooltip/click behavior */
interface KpiCardProps {
  metricKey: string;
  context: "portfolio" | "healthMatrix";
  /** v2.1: click action injected from config (not hardcoded) */
  onClickAction?: {
    type: "filter" | "navigate";
    target?: string;           // nodeId or filterKey
    params?: Record<string, string>;
  };
}
```

### 7.3 Preset Layout 정의

```typescript
const pmoPresetLayouts: Record<string, PmoDashboardPresetLayout> = {
  PMO_CONTROL: {
    preset: "PMO_CONTROL",
    slots: {
      kpiRow: ["KPI_PORTFOLIO_COUNT", "KPI_AVG_HEALTH", "KPI_CRITICAL", "KPI_ON_TRACK"],
      main: ["PROJECT_HEALTH_TABLE", "CROSS_RESOURCE_CHART", "MILESTONE_CALENDAR", "PMO_AI_INSIGHT"],
      rightPanel: ["PROJECT_DETAIL_PANEL", "PENDING_ACTIONS_PANEL"],
    },
    ui: { density: "standard", defaultRightPanel: "open" },
  },
  EXEC_SUMMARY: {
    preset: "EXEC_SUMMARY",
    slots: {
      kpiRow: ["KPI_PORTFOLIO_COUNT", "KPI_AVG_HEALTH", "KPI_CRITICAL"],
      main: ["PROJECT_HEALTH_TABLE_COMPACT"],
    },
    ui: { density: "compact", defaultRightPanel: "closed" },
  },
  CUSTOMER_APPROVAL: {
    preset: "CUSTOMER_APPROVAL",
    slots: {
      kpiRow: ["KPI_PORTFOLIO_COUNT", "KPI_AVG_HEALTH", "KPI_ON_TRACK"],
      main: ["PROJECT_HEALTH_TABLE_COMPACT"],
    },
    ui: { density: "compact", defaultRightPanel: "closed" },
  },
  AUDIT_EVIDENCE: {
    preset: "AUDIT_EVIDENCE",
    slots: {
      kpiRow: ["KPI_PORTFOLIO_COUNT", "KPI_AVG_HEALTH"],
      main: ["HEALTH_HISTORY_TABLE"],
    },
    ui: { density: "compact", defaultRightPanel: "closed" },
  },
};

const healthPresetLayouts: Record<string, HealthPresetLayout> = {
  PMO_CONTROL: {
    preset: "PMO_CONTROL",
    slots: {
      kpiRow: ["KPI_AVG_HEALTH", "KPI_RED_ALERTS", "KPI_YELLOW_ALERTS", "KPI_GREEN_COUNT"],
      main: ["HEALTH_MATRIX_TABLE", "HEALTH_TREND_CHART"],
      rightPanel: ["DIMENSION_DETAIL_PANEL", "ALERT_HISTORY_PANEL"],
    },
    ui: { density: "detailed", defaultRightPanel: "open" },
  },
  EXEC_SUMMARY: {
    preset: "EXEC_SUMMARY",
    slots: {
      kpiRow: ["KPI_AVG_HEALTH", "KPI_RED_ALERTS", "KPI_GREEN_COUNT"],
      main: ["HEALTH_MATRIX_TABLE_COMPACT", "HEALTH_TREND_SPARKLINE"],
    },
    ui: { density: "compact", defaultRightPanel: "closed" },
  },
  AUDIT_EVIDENCE: {
    preset: "AUDIT_EVIDENCE",
    slots: {
      kpiRow: ["KPI_AVG_HEALTH"],
      main: ["HEALTH_HISTORY_TABLE", "HEALTH_TREND_CHART"],
    },
    ui: { density: "compact", defaultRightPanel: "closed" },
  },
};
```

### 7.4 Widget Registry

```typescript
// config/pmoWidgetRegistry.ts
import { lazy } from "react";

const pmoWidgetRegistry: Record<PmoWidgetKey, React.LazyExoticComponent<any>> = {
  KPI_PORTFOLIO_COUNT: lazy(() => import("../components/PortfolioKpiCard")),
  KPI_AVG_HEALTH: lazy(() => import("../components/PortfolioKpiCard")),
  KPI_CRITICAL: lazy(() => import("../components/PortfolioKpiCard")),
  KPI_ON_TRACK: lazy(() => import("../components/PortfolioKpiCard")),
  KPI_DELAYED: lazy(() => import("../components/PortfolioKpiCard")),
  KPI_BUDGET_BURN: lazy(() => import("../components/PortfolioKpiCard")),
  PROJECT_HEALTH_TABLE: lazy(() => import("../components/ProjectHealthTable")),
  PROJECT_HEALTH_TABLE_COMPACT: lazy(() => import("../components/ProjectHealthTableCompact")),
  CROSS_RESOURCE_CHART: lazy(() => import("../components/CrossProjectResourceChart")),
  MILESTONE_CALENDAR: lazy(() => import("../components/MilestoneCalendar")),
  PMO_AI_INSIGHT: lazy(() => import("../components/PmoAiInsightWidget")),
  PROJECT_DETAIL_PANEL: lazy(() => import("../components/ProjectDetailPanel")),
  HEALTH_BREAKDOWN_PANEL: lazy(() => import("../components/HealthBreakdownPanel")),
  MILESTONE_DETAIL_PANEL: lazy(() => import("../components/MilestoneDetailPanel")),
  RESOURCE_DETAIL_PANEL: lazy(() => import("../components/ResourceDetailPanel")),
  PENDING_ACTIONS_PANEL: lazy(() => import("../components/PendingActionsPanel")),
};

const healthWidgetRegistry: Record<HealthWidgetKey, React.LazyExoticComponent<any>> = {
  KPI_AVG_HEALTH: lazy(() => import("../components/PortfolioKpiCard")),
  KPI_RED_ALERTS: lazy(() => import("../components/PortfolioKpiCard")),
  KPI_YELLOW_ALERTS: lazy(() => import("../components/PortfolioKpiCard")),
  KPI_GREEN_COUNT: lazy(() => import("../components/PortfolioKpiCard")),
  HEALTH_MATRIX_TABLE: lazy(() => import("../components/HealthMatrixTable")),
  HEALTH_MATRIX_TABLE_COMPACT: lazy(() => import("../components/HealthMatrixTableCompact")),
  HEALTH_RADAR_CHART: lazy(() => import("../components/HealthRadarChart")),
  HEALTH_TREND_CHART: lazy(() => import("../components/HealthTrendChart")),
  HEALTH_TREND_SPARKLINE: lazy(() => import("../components/HealthTrendSparkline")),
  DIMENSION_RANKING: lazy(() => import("../components/DimensionRankingTable")),
  HEALTH_HISTORY_TABLE: lazy(() => import("../components/HealthHistoryTable")),
  DIMENSION_DETAIL_PANEL: lazy(() => import("../components/DimensionDetailPanel")),
  TREND_DETAIL_PANEL: lazy(() => import("../components/TrendDetailPanel")),
  ALERT_DETAIL_PANEL: lazy(() => import("../components/AlertDetailPanel")),
  ALERT_HISTORY_PANEL: lazy(() => import("../components/AlertHistoryPanel")),
};
```

### 7.5 Page Rendering

```typescript
// pages/PmoDashboardPage.tsx
function PmoDashboardPage() {
  const { viewMode, effectivePreset } = useAccessContext();
  const { isTemporarySwitch, readOnlyOverride } = usePresetSwitch();

  const layout = pmoPresetLayouts[effectivePreset];
  if (!layout) return <Navigate to="/unauthorized" />;

  return (
    <PmoShell
      layout={layout}
      readOnly={readOnlyOverride}
      isTemporarySwitch={isTemporarySwitch}
    >
      <PmoKpiSlot widgets={layout.slots.kpiRow} />
      <PmoMainSlot widgets={layout.slots.main} />
      {layout.slots.rightPanel && (
        <PmoRightPanelSlot
          widgets={layout.slots.rightPanel}
          defaultOpen={layout.ui.defaultRightPanel === "open"}
        />
      )}
    </PmoShell>
  );
}

// pages/HealthMatrixPage.tsx
function HealthMatrixPage() {
  const { viewMode, effectivePreset } = useAccessContext();
  const { isTemporarySwitch, readOnlyOverride } = usePresetSwitch();

  const layout = healthPresetLayouts[effectivePreset];
  if (!layout) return <Navigate to="/unauthorized" />;

  return (
    <PmoShell
      layout={layout}
      readOnly={readOnlyOverride}
      isTemporarySwitch={isTemporarySwitch}
      pageTitle="Health Matrix"
    >
      <PmoKpiSlot widgets={layout.slots.kpiRow} />
      <PmoMainSlot widgets={layout.slots.main} />
      {layout.slots.rightPanel && (
        <PmoRightPanelSlot
          widgets={layout.slots.rightPanel}
          defaultOpen={layout.ui.defaultRightPanel === "open"}
        />
      )}
    </PmoShell>
  );
}
```

---

## 8. AI Navigation 연동

### 8.1 AI Insight Widget: PMO 포트폴리오 진단

```typescript
interface PmoAiInsight {
  asOf: string;
  summary: string;               // "디지털채널 프로젝트 건강도 D 등급, SPI/CPI 지속 하락"
  severity: "info" | "warning" | "critical";

  drivers: {
    type: "metric" | "entity" | "event";
    label: string;               // "Schedule Performance"
    value?: string;              // "SPI 0.65 (35% delay)"
    projectId?: string;          // affected project
    link?: {
      targetNodeId: string;      // "pmo-health"
      label: string;             // "Health Matrix에서 상세 확인"
    };
  }[];

  /**
   * v2.1: nextActions는 반드시 3종 세트로 제공 (PMO 회의에서 바로 사용 가능)
   * 1) Health Matrix 특정 dimension 필터 딥링크
   * 2) 해당 프로젝트 dashboard drill-down
   * 3) 관련 이슈/리스크/결정 연결
   */
  nextActions: PmoAiNextAction[];
}

/** v2.1: AI Insight next action — 3-set pattern */
interface PmoAiNextAction {
  label: string;
  /** v2.1: action type for routing logic */
  actionType: "navigate:internal" | "navigate:drilldown" | "navigate:entity";
  targetNodeId: string;
  deepLinkParams?: Record<string, string>;
  suggestedPreset?: ViewModePreset;
  requiredCaps?: Capability[];
  reason: string;
}

// Example 3-set for "디지털채널 SPI/CPI 하락":
// [
//   { actionType: "navigate:internal", targetNodeId: "pmo-health",
//     deepLinkParams: { projectId: "PRJ-003", dimension: "schedule" },
//     label: "Health Matrix에서 일정 차원 상세 확인" },
//   { actionType: "navigate:drilldown", targetNodeId: "dashboard",
//     deepLinkParams: { projectId: "PRJ-003" },
//     label: "디지털채널 프로젝트 대시보드 이동" },
//   { actionType: "navigate:entity", targetNodeId: "issues",
//     deepLinkParams: { projectId: "PRJ-003", status: "open" },
//     label: "관련 미해결 이슈 확인" },
// ]
```

### 8.2 AI Navigation 규칙: Hub vs Detail 분기 + Action 3분기 (v2.1)

> PMO 거버넌스에서 2개 노드(hub + detail)가 공존하므로, AI 스코어링 시 질문 성격에 따라 분기한다.
> **v2.1**: "행동(Action)" 질문을 3갈래로 세분화하여 "이동"이 내부 탐색인지 drill-down인지 구분한다.

```
Intent -> Node Scoring (00_총괄 기반):

IF question is summary/status ("포트폴리오 현황", "프로젝트 몇 개"):
    pmo (hub) gets +15 bonus       -- Hub 보너스
    pmo-health (detail) gets 0

IF question is specific/analytical ("SPI 가장 낮은", "건강도 추이", "차원별 비교"):
    pmo (hub) gets -20 penalty     -- Hub 페널티
    pmo-health (detail) gets +10   -- Detail 보너스

-- v2.1: Action을 3유형으로 분리 --

IF action is navigate:internal ("Health Matrix 보여줘", "PMO 대시보드로"):
    pmo (hub) gets -5 penalty      -- 내부 이동은 허브 페널티 경감 (v2.1)
    target internal node gets +10

IF action is navigate:drilldown ("A 프로젝트 대시보드", "프로젝트 상세"):
    pmo (hub) gets -20 penalty     -- drill-down은 허브 탈출
    dashboard gets +10

IF action is action:export ("Export", "리포트 내보내"):
    pmo (hub) gets -20 penalty
    reports gets +10
    -- v2.1: Export 대상(포트폴리오 vs 헬스 vs 감사증빙)을 질문에서 추출 --
    IF "건강도" or "Health" in query: reports gets +5 bonus
    IF "감사" or "증빙" in query: audit-evidence gets +15
```

**예시**:

| 질문 | 유형 (v2.1) | pmo (hub) | pmo-health (detail) | 최종 추천 |
|------|-----------|----------|---------------------|----------|
| "포트폴리오 현황 알려줘" | summary | 80 + 15 = **95** | 60 = 60 | `/pmo` |
| "SPI가 가장 낮은 프로젝트는?" | analytical | 65 - 20 = **45** | 85 + 10 = **95** | `/pmo/health?sortBy=schedule&sortDir=asc` |
| "건강도 추이 보여줘" | analytical | 60 - 20 = **40** | 90 + 10 = **100** | `/pmo/health?trendPeriod=3m` |
| "위험 프로젝트 있어?" | summary | 75 + 15 = **90** | 70 = 70 | `/pmo?projectStatus=critical` |
| "비용 초과 프로젝트 상세" | analytical | 55 - 20 = **35** | 88 + 10 = **98** | `/pmo/health?dimension=cost` |
| "Health Matrix 보여줘" | navigate:internal | 80 - 5 = **75** | 85 + 10 = **95** | `/pmo/health` (v2.1) |
| "A 프로젝트 대시보드 이동" | navigate:drilldown | 70 - 20 = **50** | 40 = 40, dashboard: **90** | `/dashboard?projectId=PRJ-001` |
| "포트폴리오 리포트 Export" | action:export | 70 - 20 = **50** | 40 = 40, reports: **85** | `/reports` |
| "감사 증빙 내보내줘" | action:export | 60 - 20 = **40** | 40 = 40, audit: **85+15=100** | `/audit-evidence` (v2.1) |

### 8.3 Drill-down Navigation Contract

PMO 화면에서 개별 프로젝트로 drill-down 할 때의 네비게이션 규칙:

```typescript
// PMO -> Project Dashboard drill-down
interface PmoDrilldownNavigation {
  action: "project-switch";
  targetProjectId: string;
  targetRoute: "/dashboard";
  targetPreset: ViewModePreset;     // PMO user -> PMO_CONTROL preset on dashboard
  returnRoute: "/pmo";              // Back button returns to PMO
}

// AI Navigation response for drill-down
const drilldownResponse: AiNavigationResponse = {
  answer: "AI 보험심사 프로젝트 대시보드로 이동합니다.",
  navigation: {
    primary: {
      targetNodeId: "dashboard",
      deepLinkParams: { projectId: "PRJ-001" },
    },
    secondary: {
      targetNodeId: "pmo",
      deepLinkParams: {},
    },
  },
  viewMode: {
    suggested: "PMO_CONTROL",
    reason: "PMO 사용자의 프로젝트 대시보드 진입 - PMO 렌즈 유지",
  },
  scopeHints: { projectId: "PRJ-001" },
};
```

### 8.4 PMO AI 질문 -> Navigation 매핑표

| 질문 | AI 추천 nodeId | deepLinkParams | Preset | 비고 |
|------|---------------|---------------|--------|------|
| "포트폴리오 현황은?" | `pmo` | - | PMO_CONTROL | Hub 보너스 |
| "위험 프로젝트 보여줘" | `pmo.critical` | `{ projectStatus: "critical" }` | PMO_CONTROL | virtualNode |
| "SPI 최하위 프로젝트?" | `pmo-health.schedule` | `{ dimension: "schedule", sortDir: "asc" }` | PMO_CONTROL | virtualNode |
| "건강도 추이 알려줘" | `pmo-health.trend` | `{ trendPeriod: "3m" }` | PMO_CONTROL | virtualNode |
| "RED 알림 프로젝트는?" | `pmo-health.red-alerts` | `{ alertLevel: "RED" }` | PMO_CONTROL | virtualNode |
| "A 프로젝트 상세" | `dashboard` | `{ projectId: "PRJ-001" }` | PMO_CONTROL | drill-down |
| "자원 배분 현황은?" | `pmo` | - | PMO_CONTROL | Hub (Resource Chart) |
| "이번 달 마일스톤?" | `pmo` | - | PMO_CONTROL | Hub (Calendar) |
| "건강도 리포트 내보내" | `reports` | - | PMO_CONTROL | Export action |

---

## 9. 인터랙션 상세

### 9.1 Project Health Table 인터랙션

```
Project Health Table:
  행 클릭 (single click)
    -> Right Panel 갱신 (project-detail panelMode)
    -> 선택 프로젝트 하이라이트 (row highlight)
    -> Health Badge 클릭 시 panelMode = "health-breakdown"

  행 더블클릭
    -> 프로젝트 대시보드 이동 (drill-down)
    -> context switch: projectId 변경, returnRoute="/pmo" 저장
    -> Preset 유지 (PMO_CONTROL)

  행 호버
    -> tooltip: project summary (progress, health, next milestone)

  정렬
    -> 컬럼 헤더 클릭: Grade / Progress / SPI / CPI 기준 정렬
    -> v2.1 기본 정렬 (worst-first 원칙):
       1차: projectStatus 기준 (critical → delayed → at_risk → on_track)
       2차: overall score ASC (같은 상태 내에서 낮은 점수 우선)
       3차: lastUpdated ASC (오래된 데이터 우선 — 갱신 필요 프로젝트 상위 노출)
```

### 9.2 Health Matrix Table 인터랙션

```
Health Matrix Table:
  행 클릭
    -> Right Panel: Radar Chart + Dimension Detail 갱신
    -> Trend Chart: 해당 프로젝트 라인 하이라이트

  차원 셀 클릭 (e.g., Schedule 72 cell)
    -> Right Panel: 해당 차원 상세 (ScheduleDetail)
    -> 드릴다운 데이터 표시 (지연 단계 목록 등)

  차원 헤더 클릭
    -> 해당 차원 기준 정렬 (toggle asc/desc)
    -> URL 갱신: ?sortBy=schedule&sortDir=asc

  Trend Arrow 클릭
    -> Trend Detail Panel 열림
    -> 해당 프로젝트의 시계열 데이터 표시

  Alert Badge (RED/YELLOW) 클릭
    -> Alert Detail Panel 열림
    -> 해당 알림의 상세 + 이전 등급 + 원인 표시
```

### 9.3 KPI Card 클릭

```
KPI Card 클릭 (PMO Dashboard):
  Portfolio Count
    -> 필터 초기화 (전체 프로젝트 표시)
  Avg Health
    -> nodeId: "pmo-health" (Health Matrix 이동)
  Critical Projects
    -> 필터: projectStatus=critical
  On Track
    -> 필터: projectStatus=on_track

KPI Card 클릭 (Health Matrix):
  RED Alerts
    -> 필터: alertLevel=RED
  YELLOW Alerts
    -> 필터: alertLevel=YELLOW
  GREEN Count
    -> 필터: alertLevel=GREEN
```

### 9.4 Cross-Project Resource Chart 인터랙션

```
Resource Bar 클릭
  -> Right Panel: resource panelMode
  -> 해당 프로젝트 자원 상세 (role별 utilization)

Over-allocation Warning (> 90%)
  -> 빨간색 바 표시
  -> 클릭 시 over-allocated role 목록 표시

Under-allocation Warning (< 50%)
  -> 회색 바 표시
  -> 클릭 시 available capacity 표시
```

### 9.5 Milestone Calendar 인터랙션

```
Milestone 항목 클릭
  -> Right Panel: milestone panelMode
  -> 마일스톤 상세 (프로젝트, 관련 Phase/Sprint, 남은 일수)

Overdue Milestone
  -> 빨간색 하이라이트
  -> 클릭 시 지연 원인 + 관련 이슈 표시

달력 네비게이션
  -> 좌/우 화살표로 월 이동
  -> "오늘" 버튼으로 현재 월 복귀
```

### 9.6 데이터 새로고침

| 항목 | 주기 |
|------|------|
| KPI Cards | 5분 자동 갱신 (TanStack Query `refetchInterval`) |
| Project Health Table | 페이지 진입 시 + 수동 새로고침 |
| Health Matrix | 페이지 진입 시 + 수동 새로고침 |
| Health Trend Chart | trendPeriod 변경 시 + 수동 새로고침 |
| Resource Chart | 페이지 진입 시 + 수동 새로고침 |
| Milestone Calendar | 월 변경 시 + 수동 새로고침 |
| AI Insight | 페이지 진입 시 1회 (cache 10분) |
| 전체 | 수동 새로고침 버튼 (Page Header) |

---

## 10. 반응형 대응

### 10.1 브레이크포인트별 레이아웃 (PMO Dashboard)

| 너비 | KPI Row | Main Content | Right Panel |
|------|---------|-------------|-------------|
| >=1440px | 4열 가로 배치 | 70% (Table + Resource + Calendar) | 30% (visible) |
| 1280px | 4열 가로 배치 | 100% | Drawer (toggle) |
| <=1024px | 2x2 그리드 | 100% (Table only, Resource below) | Drawer (overlay) |
| <=768px | 1열 세로 스택 | 100% (Table compact) | Full Modal |

### 10.2 브레이크포인트별 레이아웃 (Health Matrix)

| 너비 | KPI Row | Main Content | Right Panel |
|------|---------|-------------|-------------|
| >=1440px | 4열 가로 배치 | 70% (Matrix + Trend) | 30% (Radar + Alert) |
| 1280px | 4열 가로 배치 | 100% | Drawer (toggle) |
| <=1024px | 2x2 그리드 | 100% (Matrix only) | Drawer (overlay) |
| <=768px | 1열 세로 스택 | 100% (Overall + Grade only) | Full Modal |

### 10.3 위젯 축소 규칙

- **<=1280px**: Resource Chart -> Compact bar only (labels hidden)
- **<=1280px**: Health Matrix Table -> Hide Resource column
- **<=1024px**: Milestone Calendar -> Hidden (accessible via dedicated filter)
- **<=1024px**: Health Trend Chart -> Sparkline mode
- **<=768px**: Health Matrix -> Overall + Grade only (dimension collapse to accordion)
- **<=768px**: AI Insight -> Collapsible (expand button)

---

## 11. 깨지기 쉬운 곳 체크리스트

### 11.1 Health Score 계산 정합성

| 위험 | 증상 | 방어 |
|------|------|------|
| **차원 weight 합 != 1.0** | Overall score 왜곡 | 단위 테스트에서 weight 합 검증, renormalize 시 재검증 |
| **결측 차원 0점 처리** | 실제 양호한 프로젝트가 F 등급 | missing -> renormalize (0점 아님), confidence 표시 |
| **SPI/CPI raw 0 division** | NaN/Infinity 전파 | `max(denominator, 1)` 방어, null coalescing |
| **등급 경계값 혼동** | 89.5 -> A vs B 불일치 | `Math.round` 후 판정, 소수점 2자리 기준 명시 |
| **v2.1: 핵심 차원 캡 룰 누락** | schedule/cost missing인데 A 등급 부여 | 핵심 차원 기반 캡 룰 (§5.5) + 단위 테스트 필수 |
| **v2.1: metricBasis 혼재** | story_points vs hours 프로젝트 비교 | metricBasis 불일치 시 "비교불가" 배지 + 그룹 분리 |

### 11.2 다중 프로젝트 데이터 동기화

| 위험 | 증상 | 방어 |
|------|------|------|
| **프로젝트별 asOf 불일치** | A 프로젝트는 오늘, B 프로젝트는 어제 데이터 | `asOf` per project 표시, 전체 asOf는 min(all) |
| **느린 프로젝트 API** | 1개 프로젝트 timeout으로 전체 hang | Promise.allSettled + partial rendering |
| **프로젝트 수 증가** | 50개+ 프로젝트에서 테이블 성능 저하 | 가상 스크롤 (react-virtuoso), 페이지네이션 |

### 11.3 Drill-down Context Switch

| 위험 | 증상 | 방어 |
|------|------|------|
| **projectId context 누락** | drill-down 후 대시보드가 빈 데이터 | drill-down 시 projectId를 URL + context 동시 설정 |
| **returnRoute 유실** | Back 버튼이 /pmo 대신 /dashboard로 | sessionStorage에 returnRoute 저장 |
| **Preset 불일치** | PMO -> Dashboard 이동 시 DEV_EXECUTION 적용 | drill-down 시 suggestedPreset 명시 전달 |

### 11.4 Health Trend 데이터

| 위험 | 증상 | 방어 |
|------|------|------|
| **데이터포인트 부족** | 1개월 미만 프로젝트에서 추세 표시 불가 | 최소 2개 데이터포인트 필요, 부족 시 "데이터 부족" 표시 |
| **과거 데이터 변경** | 소급 수정으로 과거 추세가 달라짐 | snapshot 기반 trend (immutable), 수정 시 별도 기록 |
| **trendPeriod 변경** | 6개월 -> 1개월 전환 시 빈 차트 | API에서 available range 반환, UI에서 range 제한 |

### 11.5 동시 접근

| 위험 | 증상 | 방어 |
|------|------|------|
| **PMO 2명이 동시 조회** | 데이터 정합성 이슈는 없음 (읽기 전용) | N/A - PMO 화면은 기본 읽기 전용 |
| **Health Score 갱신 중 조회** | 일부 차원만 갱신된 중간 상태 | 백엔드에서 atomic snapshot 보장, version flag 사용 |

### 11.6 v2.1 추가: Capability/라우트 가드 (v2.1)

| 위험 | 증상 | 방어 |
|------|------|------|
| **view_pmo만으로 /pmo/health 접근** | Sponsor가 URL 직접 입력으로 Health Matrix 진입 | `view_pmo_health` 분리 + ProtectedRoute + 서버 enforcement |
| **프리셋 숨김만 믿음** | URL 조작으로 PMO_CONTROL 뷰 획득 | 프리셋 + capability 교차 검증 (§12.5) |
| **Export 권한 불일치** | 버튼 숨겨도 API 직접 호출 가능 | 서버에서 `export_pmo_reports` 검증 |

### 11.7 v2.1 추가: FilterSpec/URL 왕복 (v2.1)

| 위험 | 증상 | 방어 |
|------|------|------|
| **projectId string/array 혼동** | 멀티셀렉트 폼에서 타입 분기 버그 | 항상 `string[]` (§2.2) |
| **AI 생성 딥링크 잘못된 enum** | 필터가 적용 안 되는데 사용자는 모름 | `droppedFilters` 배지 (§2.5) |
| **dateRange canonical 키 충돌** | `dateRange` vs `dateStart/dateEnd` 혼재 | URL은 항상 `dateStart/dateEnd`, 내부는 `dateRange` |

### 11.8 v2.1 추가: 스냅샷/Trend 신뢰도 (v2.1)

| 위험 | 증상 | 방어 |
|------|------|------|
| **산정 로직 변경 후 과거 추세 왜곡** | "지난달 왜 B였는데 지금 C냐" | immutable snapshot + calcVersion (§5.7) |
| **스냅샷 미생성** | 등급 변경 시 history가 비어있음 | 등급 변경 이벤트 + 일일 자동 스냅샷 |
| **QI 데이터 빈약** | QI가 항상 partial → confidence 저하 | dimensionConfidence 히트맵 UI 노출 |

---

## 12. Capability 매핑

### 12.1 Capability 정의 (v2.1 확장)

| Capability | 설명 | 부여 대상 |
|-----------|------|---------|
| `view_pmo` | PMO 대시보드(`/pmo`) 조회 | PMO, Sponsor, Customer PM (limited), Auditor |
| `view_pmo_health` | Health Matrix(`/pmo/health`) 조회 (v2.1) | PMO, System Admin |
| `export_pmo_reports` | PMO 포트폴리오/Health 리포트 Export (v2.1) | PMO, System Admin |
| `export_audit_evidence` | 감사 증빙 Export | Auditor, System Admin |
| `view_audit_evidence` | 감사 증빙 조회 | Auditor, System Admin |

### 12.2 역할별 Capability 매핑 (v2.1 확장)

| 역할 | `view_pmo` | `view_pmo_health` | `export_pmo_reports` | PMO Dashboard | Health Matrix | 비고 |
|------|----------|------------------|--------------------|--------------|--------------|----- |
| Sponsor | O | - | - | O (EXEC_SUMMARY) | **X (v2.1)** | Portfolio 요약만 |
| PMO | O | O | O | O (PMO_CONTROL) | O (PMO_CONTROL) | Full access |
| PM | - | - | - | - | - | 자기 프로젝트 Dashboard 사용 |
| DevReader | - | - | - | - | - | - |
| DEV | - | - | - | - | - | - |
| Customer PM | O | - | - | O (CUSTOMER_APPROVAL) | **X (v2.1)** | Portfolio 요약만 |
| Auditor | O | - | - | O (AUDIT_EVIDENCE) | **X (v2.1)** | Health history만 |
| System Admin | O | O | O | O (운영 목적) | O (운영 목적) | - |

> **v2.1 변경**: Sponsor/CustomerPM/Auditor가 URL 직접 입력으로 `/pmo/health`에 접근할 수 없도록
> `view_pmo_health` capability를 분리. 프리셋 숨김만으로는 라우트 접근을 막을 수 없음.

### 12.3 Menu Visibility Matrix (00_총괄 확인)

| 메뉴 | Sponsor | PMO | PM | DevReader | DEV | Customer PM | Auditor |
|------|---------|-----|----|-----------|-----|-------------|---------|
| PMO 대시보드 | O(요약) | O | - | - | - | O(요약) | O |
| Health Matrix | - | O | - | - | - | - | - |

### 12.4 Action Guard (v2.1 확장)

```typescript
// PMO Dashboard - all actions require view_pmo at minimum
// Most interactions are read-only; no write capabilities needed

// v2.1: Export requires PMO-specific export capability
<Can required={["export_pmo_reports"]}>
  <ExportButton onClick={handleExportPortfolio} />
</Can>

// v2.1: Health Matrix navigation requires view_pmo_health
<Can required={["view_pmo_health"]}>
  <Button onClick={() => navigate("/pmo/health")}>Health Matrix</Button>
</Can>

// Drill-down requires view_dashboard on target project
<Can required={["view_dashboard"]}>
  <DrilldownButton projectId={selectedProject.id} />
</Can>

// v2.1: Health export requires view_pmo_health + export_pmo_reports
<Can required={["view_pmo_health", "export_pmo_reports"]}>
  <ExportButton onClick={handleExportHealth} />
</Can>

// Audit evidence export
<Can required={["export_audit_evidence"]}>
  <ExportButton onClick={handleExportEvidence} />
</Can>
```

### 12.5 Route Guard Policy (v2.1)

> 프리셋 숨김 ≠ 접근 제어. URL 직접 접근도 차단해야 한다.

```typescript
// config/pmoCapabilityConfig.ts (v2.1)

/** Route Guard: capability AND allowedPresets 교차 검증 */
interface PmoRouteGuardConfig {
  route: string;
  requiredCaps: Capability[];
  allowedPresets: ViewModePreset[];
  fallbackRoute: string;
  serverEnforcement: boolean;  // true = API도 동일 권한 검증
}

const PMO_ROUTE_GUARDS: PmoRouteGuardConfig[] = [
  {
    route: "/pmo",
    requiredCaps: ["view_pmo"],
    allowedPresets: ["PMO_CONTROL", "EXEC_SUMMARY", "CUSTOMER_APPROVAL", "AUDIT_EVIDENCE"],
    fallbackRoute: "/unauthorized",
    serverEnforcement: true,
  },
  {
    route: "/pmo/health",
    requiredCaps: ["view_pmo", "view_pmo_health"],  // both required
    allowedPresets: ["PMO_CONTROL", "EXEC_SUMMARY", "AUDIT_EVIDENCE"],
    fallbackRoute: "/pmo",   // redirect to hub, not /unauthorized
    serverEnforcement: true,
  },
];

// Usage in ProtectedRoute (v2.1)
function usePmoRouteGuard(route: string): {
  allowed: boolean;
  redirectTo?: string;
  reason?: string;
} {
  const { effectivePreset } = useAccessContext();
  const { hasCapabilities } = useCapabilities();

  const guard = PMO_ROUTE_GUARDS.find(g => g.route === route);
  if (!guard) return { allowed: true };

  const hasCaps = hasCapabilities(guard.requiredCaps);
  const hasPreset = guard.allowedPresets.includes(effectivePreset);

  if (!hasCaps) return {
    allowed: false,
    redirectTo: guard.fallbackRoute,
    reason: `Missing capabilities: ${guard.requiredCaps.join(", ")}`,
  };
  if (!hasPreset) return {
    allowed: false,
    redirectTo: guard.fallbackRoute,
    reason: `Preset ${effectivePreset} not allowed for ${route}`,
  };

  return { allowed: true };
}
```

**서버 Enforcement 규칙** (v2.1):

| API Endpoint | 필수 Capability | 서버 거부 시 |
|-------------|----------------|-------------|
| `GET /api/pmo/portfolio` | `view_pmo` | 403 Forbidden |
| `GET /api/pmo/health` | `view_pmo` + `view_pmo_health` | 403 Forbidden |
| `GET /api/pmo/health/:projectId` | `view_pmo` + `view_pmo_health` | 403 Forbidden |
| `GET /api/pmo/resources` | `view_pmo` | 403 Forbidden |
| `GET /api/pmo/milestones` | `view_pmo` | 403 Forbidden |
| `GET /api/pmo/health/history` | `view_pmo` | 403 Forbidden |
| `POST /api/pmo/export/*` | `export_pmo_reports` | 403 Forbidden |

---

## 13. DoD (본 화면 완료 기준)

### 13.1 PMO Dashboard (`/pmo`)

- [ ] `/pmo` 라우트에서 PmoShell + 위젯 조립 방식으로 4개 Preset 렌더링 (PMO_CONTROL, EXEC_SUMMARY, CUSTOMER_APPROVAL, AUDIT_EVIDENCE)
- [ ] Portfolio KPI Cards: Count / Avg Health / Critical / On Track 4종
- [ ] Project Health Table: 프로젝트별 Grade / Progress / SPI / CPI 표시
- [ ] Project Health Table Compact: EXEC/CUSTOMER용 축약 테이블
- [ ] Cross-Project Resource Allocation Chart: 프로젝트별 자원 활용률 바 차트
- [ ] Milestone Calendar: 월별 마일스톤 표시
- [ ] Right Panel: project-detail / health-breakdown / milestone / resource 4종 panelMode
- [ ] AI Insight Widget: 포트폴리오 진단 + 근거 + 다음행동 3단 구조
- [ ] Health History Table: AUDIT Preset용 등급 변경 이력 테이블
- [ ] 행 클릭 -> Right Panel 갱신, 더블클릭 -> 프로젝트 대시보드 drill-down
- [ ] KPI Card 클릭 -> 필터 적용 or Health Matrix 이동
- [ ] PM_WORK / DEV_EXECUTION Preset 미노출 (메뉴 숨김)
- [ ] 5분 자동 갱신 + 수동 새로고침
- [ ] 반응형 레이아웃 (>=1440 / 1280 / <=1024 / <=768)

### 13.2 Health Matrix (`/pmo/health`)

- [ ] `/pmo/health` 라우트에서 3개 Preset 렌더링 (PMO_CONTROL, EXEC_SUMMARY, AUDIT_EVIDENCE)
- [ ] Health Matrix Table: 5차원 점수 + 등급 + 트렌드 화살표 표시
- [ ] 5차원 Health Scoring Model 구현 (Schedule/Cost/Quality/Risk/Resource)
- [ ] Overall Health = 가중 평균 (0.25/0.20/0.20/0.20/0.15)
- [ ] 등급 판정 (A/B/C/D/F) + 임계값 알림 (RED/YELLOW/GREEN)
- [ ] 결측 데이터 처리: renormalize + grade cap + confidence level
- [ ] Health Radar Chart: 선택 프로젝트의 5차원 레이더 차트
- [ ] Health Trend Chart: 시계열 다중 라인 차트 (1m/3m/6m/1y)
- [ ] Dimension Ranking: 차원별 프로젝트 순위
- [ ] Alert History: 등급 변경 알림 타임라인
- [ ] 차원 헤더 클릭 -> 정렬, 차원 셀 클릭 -> 상세 드릴다운
- [ ] Trend Arrow 클릭 -> Trend Detail Panel
- [ ] Alert Badge 클릭 -> Alert Detail Panel
- [ ] Health Matrix Compact: EXEC용 Overall + 상/하위 프로젝트만
- [ ] Health Trend Sparkline: EXEC용 축약 추세선

### 13.3 공통

- [ ] **AI Navigation 연동**: Hub(pmo) vs Detail(pmo-health) 스코어링 분기 동작
- [ ] **nodeId 기반 네비게이션**: AI가 route 아닌 nodeId 반환 -> UI resolve
- [ ] **Drill-down Navigation**: PMO -> 프로젝트 대시보드 context switch + returnRoute 보존
- [ ] **FilterSpec URL 직렬화**: AI/프론트/백엔드 왕복 보장
- [ ] **Completeness/Warnings Badge**: 데이터 부족 시 KPI에 배지 표시
- [ ] **Preset 임시 전환**: 드롭다운으로 전환, 상향 시 ReadOnly 강제
- [ ] **WCAG AA 접근성**: 색상 대비 4.5:1, aria-label, 키보드 순회
- [ ] **Promise.allSettled**: 다중 프로젝트 API 부분 실패 시 partial rendering
- [ ] **가상 스크롤**: 프로젝트 50개+ 대응 (react-virtuoso)

### 13.4 v2.1 — 계약 테스트 (Contract)

- [ ] **FilterSpec 왕복 (property-based)**: 랜덤 필터 생성 → serialize → deserialize → 동일성 검증
- [ ] **projectId 항상 배열**: deserialize 결과가 항상 `string[]` (단일 ID도)
- [ ] **droppedFilters 추적**: invalid enum / unknown key가 `droppedFilters`에 기록되는지
- [ ] **appliedFilter/appliedSort 메타**: 서버 응답에 실제 적용된 필터/정렬이 명시되는지

### 13.5 v2.1 — 점수 모델 단위 테스트

- [ ] **SPI/CPI 경계값 연속성**: 0.4/0.6/0.8/1.0 경계에서 점수가 단조증가(monotonic)하는지
- [ ] **핵심 차원 결측 캡 룰**: schedule missing → 최대 C, schedule+cost missing → grade=null
- [ ] **비핵심 2개+ 결측**: 최대 B, confidence=partial
- [ ] **weight renormalize**: 결측 후 재정규화한 weight 합이 정확히 1.0
- [ ] **metricBasis 불일치**: basis 다른 프로젝트 간 비교 시 "비교불가" 배지 노출

### 13.6 v2.1 — 권한/라우트 가드 테스트

- [ ] **Sponsor /pmo/health 직접 접근**: 403 또는 /pmo 리다이렉트
- [ ] **Auditor Health Matrix 접근 차단**: view_pmo_health 미보유 → fallback
- [ ] **Export 버튼 노출/서버 권한 일치**: UI 숨김 + API 403 동시 검증
- [ ] **프리셋 상향 + URL 조작**: CUSTOMER_APPROVAL → PMO_CONTROL URL 변조 시 ReadOnly 강제
- [ ] **서버 enforcement**: API가 capability 미보유 시 403 반환

### 13.7 v2.1 — 부분 실패/데이터 신뢰도 테스트

- [ ] **프로젝트 1개 API 실패**: portfolio KPI 계산이 나머지 프로젝트로 정상 동작
- [ ] **asOf/completeness/warnings 배지**: 프로젝트별 asOf 24시간 초과 시 경고 배지
- [ ] **스냅샷 불변성**: history 조회 시 과거 스냅샷이 현재 계산과 무관하게 유지
- [ ] **calcVersion 변경 추적**: 산정 로직 버전 변경 시 Trend Chart에 마커 표시

---

## 부록 A. Health Score Factor 참조 테이블

| Factor | Weight | Input Source | Calculation | Score Range |
|--------|--------|-------------|-------------|-------------|
| Schedule (SPI) | 0.25 | Phase plan/actual, Sprint burndown | earned_work / planned_work | 0-100 |
| Cost (CPI) | 0.20 | Budget planned/actual | budgeted_cost / actual_cost | 0-100 |
| Quality (QI) | 0.20 | Test results, Defects, Reviews | pass_rate*0.4 + (1-defect_density)*0.35 + review_rate*0.25 | 0-100 |
| Risk (RI) | 0.20 | Risk register, Mitigation status | risk_score*0.6 + mitigation_rate*0.4 | 0-100 |
| Resource (ReI) | 0.15 | Resource allocation, Availability | utilization_score*0.5 + availability*0.5 | 0-100 |

## 부록 B. API Endpoint Summary

| Method | Endpoint | Description | Preset |
|--------|----------|-------------|--------|
| GET | `/api/pmo/portfolio` | Portfolio summary with all projects | ALL |
| GET | `/api/pmo/health` | Health Matrix with 5 dimensions | PMO_CONTROL |
| GET | `/api/pmo/health/:projectId` | Single project health detail | PMO_CONTROL |
| GET | `/api/pmo/resources` | Cross-project resource allocation | PMO_CONTROL |
| GET | `/api/pmo/milestones` | Milestone calendar | PMO_CONTROL |
| GET | `/api/pmo/health/history` | Health change history | AUDIT_EVIDENCE |

## 부록 C. Grade-Color-Icon Mapping

```typescript
const GRADE_CONFIG: Record<string, {
  color: string;
  bgColor: string;
  icon: string;
  label: string;
}> = {
  A: { color: "#4CAF50", bgColor: "#E8F5E9", icon: "CheckCircle", label: "Excellent" },
  B: { color: "#8BC34A", bgColor: "#F1F8E9", icon: "ThumbUp",     label: "Good" },
  C: { color: "#FFC107", bgColor: "#FFF8E1", icon: "Warning",     label: "Warning" },
  D: { color: "#FF5722", bgColor: "#FBE9E7", icon: "Error",       label: "Critical" },
  F: { color: "#F44336", bgColor: "#FFEBEE", icon: "Cancel",      label: "Failing" },
};

const ALERT_LEVEL_CONFIG: Record<string, {
  color: string;
  bgColor: string;
  label: string;
}> = {
  GREEN:  { color: "#4CAF50", bgColor: "#E8F5E9", label: "Normal" },
  YELLOW: { color: "#FFC107", bgColor: "#FFF8E1", label: "Attention" },
  RED:    { color: "#F44336", bgColor: "#FFEBEE", label: "Critical" },
};
```

---

## 부록 D. v2.1 변경 이력 (Changelog)

> **v2.0 → v2.1** | 작성일: 2026-02-08 | 교차 리뷰 기반 품질 보강

### D.1 Capability / 권한 분리

| # | 변경 | 상세 |
|---|------|------|
| 1 | `view_pmo_health` 캡 신설 | `/pmo/health` 전용 접근 제어 — `view_pmo`만으로는 Health Matrix 진입 불가 (§2.4, §12.1) |
| 2 | `export_pmo_reports` 캡 신설 | PMO 허브 + Health Matrix 내보내기 통합 권한 (§2.3, §2.4, §12.1) |
| 3 | `view_audit_evidence` / `export_audit_evidence` 추가 | 감사 증적 열람/내보내기 분리 (§12.1) |
| 4 | 역할 매트릭스 확장 | 5-cap × 7-role 매트릭스로 확대 (§12.2) |
| 5 | Route Guard Policy 신설 | `ProtectedRoute` + `requiredCaps` AND `allowedPresets` 교차 검증 + 서버 강제 (§12.5) |

### D.2 FilterSpec / URL 직렬화

| # | 변경 | 상세 |
|---|------|------|
| 6 | `projectId` 타입 단순화 | `string \| string[]` → 항상 `string[]` (빈 배열 = 전체) (§2.2) |
| 7 | `DeserializeResult` 도입 | `{ filter, droppedFilters }` — 유효하지 않은 enum 값 silent drop + 추적 (§2.5) |
| 8 | `INVALID_FILTER_DROPPED` 경고 배지 | 상단 배지로 사용자에게 drop 사실 노출 (§2.5) |
| 9 | dateRange deepLink 패턴 추가 | `dateRange=YYYY-MM-DD~YYYY-MM-DD` 정규 형식 (§2.3) |
| 10 | URL canonical 규칙 | 미적용 파라미터 제거, 정렬 순서 보장 (§2.5) |

### D.3 Health Score 모델

| # | 변경 | 상세 |
|---|------|------|
| 11 | `metricBasis` 필드 추가 | `HealthDimensionScore`에 `story_points \| hours \| wbs_weight \| deliverables \| currency \| composite` 메타 (§5.2) |
| 12 | `dimensionConfidence` 필드 추가 | `full \| partial \| missing` — QI 완전성 표시 (§5.2) |
| 13 | 중요도 기반 등급 캡 | schedule/cost = CORE: 둘 다 결측 → null, 하나 결측 → C 상한, 비핵심 2+ 결측 → B 상한 (§5.5) |
| 14 | core dimension 결측 규칙 확장 | §5.6 규칙 테이블 4행 → 6행 (core/non-core 분리) |
| 15 | §5.7 스냅샷 불변성 신설 | `HealthSnapshot` 인터페이스 — `snapshotId`, `calcVersion` 추적, 소급 재계산 금지 |

### D.4 API 메타 / 원자성

| # | 변경 | 상세 |
|---|------|------|
| 16 | `PortfolioSummary` 메타 강화 | `asOfStrategy`, `projectAsOfMap` 추가 (§6.1) |
| 17 | `ProjectHealthSummary` 메타 추가 | `projectAsOf`, `metricBasis` (§6.1) |
| 18 | `HealthMatrixResponse` 메타 강화 | `appliedFilter`, `appliedSort`, `droppedFilters`, `calcVersion` (§6.2) |
| 19 | `HealthHistoryEntry` 스냅샷 연결 | `snapshotId`, `calcVersion` 추가 (§6.5) |
| 20 | `HealthHistory` `calcVersions` 배열 | 조회 기간 내 사용된 calcVersion 목록 (§6.5) |

### D.5 컴포넌트 / 위젯

| # | 변경 | 상세 |
|---|------|------|
| 21 | `as const` WidgetKey 패턴 | `PMO_WIDGET_KEYS`, `HEALTH_WIDGET_KEYS` → `as const` 단일 소스 + 파생 타입 (§7.2) |
| 22 | `KpiCardProps` context 분리 | `tooltipContent`, `onDetailClick` 분리 → 클릭/호버 목적 명확화 (§7.2) |
| 23 | 신규 파일 4건 | `widgetKeyConstants.ts`, `pmoCapabilityConfig.ts`, `usePmoRouteGuard.ts`, `useDroppedFilterBadge.ts` (§7.1) |

### D.6 UX / AI Insight

| # | 변경 | 상세 |
|---|------|------|
| 24 | Worst-first 기본 정렬 | 1차 projectStatus(critical→on_track) → 2차 score ASC → 3차 lastUpdated ASC (§9.1) |
| 25 | 기본 Right Panel 콘텐츠 | PMO: `summary-overview` (Top 3 Alert + 등급하락 + Pending), Health: `dimension-overview` (§3.1) |
| 26 | AI Insight 3-set nextActions | 각 인사이트당 (1) Health Matrix 차원 링크, (2) 프로젝트 대시보드 drill-down, (3) 관련 이슈/리스크 (§8.1) |
| 27 | Action 3분기 | `navigate:internal` (−5), `navigate:drilldown` (−20/+10), `action:export` (−20/+10) (§8.2) |

### D.7 DoD / Fragile Checklist 보강

| # | 변경 | 상세 |
|---|------|------|
| 28 | §11.6 Capability/Route Guard 체크리스트 | 캡 없는 사용자 차단, UI hiding + 서버 일치 검증 등 3항목 |
| 29 | §11.7 FilterSpec/URL 체크리스트 | 잘못된 enum → droppedFilters, 빈 배열 = 전체 등 3항목 |
| 30 | §11.8 Snapshot/Trend 체크리스트 | calcVersion 변경 시 표기, 빈 날짜 보간 등 3항목 |
| 31 | §13.4 계약 테스트 | API schema 변경 감지, 직렬화↔역직렬화 왕복, droppedFilters 포함 4항목 |
| 32 | §13.5 Score Model 테스트 | core 결측 → null, importance cap, metricBasis 일관성 등 5항목 |
| 33 | §13.6 권한/라우트 테스트 | 캡 없는 403, 프리셋 불일치 차단 등 4항목 |
| 34 | §13.7 데이터 신뢰성 테스트 | Partial failure graceful, snapshot 불변 등 4항목 |

---

> **총 34건 변경** — 8개 교차 리뷰 영역(Capability·FilterSpec·ScoreModel·API Meta·Component·UX·DoD·Checklist) 전면 반영
