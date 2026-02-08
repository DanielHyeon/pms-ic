# 04. WBS(일정 관리) 화면설계

> 작성일: 2026-02-08
> 버전: v1.1
> 라우트: `/wbs`
> 필요 Capability: `view_wbs` (조회), `manage_wbs` (생성/편집/삭제), `update_wbs_progress` (진행률 갱신), `manage_wbs_snapshot` (스냅샷 생성/복원), `export_wbs` (WBS Export)
> 기본 Preset: 역할에 따라 자동 결정
> 노드 역할: **Detail** (상세 노드 -- 필터/조회/편집 전용)

---

## 1. 화면 개요

### 1.1 목적

WBS(Work Breakdown Structure)는 **"전체 프로젝트 일정이 계획 대비 얼마나 진행됐고, 어디가 지연되고 있는가?"**에 대한 답을 제공한다.
기존 엑셀/MS Project 기반 일정표를 **4계층 트리 구조(Phase -> WbsGroup -> WbsItem -> WbsTask)**로 전환하여,
Phase(단계)별 작업분해구조와 일정을 실시간으로 추적/관리한다.

> **핵심 분리 원칙**: 백로그(Epic/Story)는 **"우리가 뭘 만들 것인가"**(실행 단위),
> WBS는 **"언제까지 뭘 완성해야 하는가"**(일정/공정 관점).
> 두 객체는 `linkedEpicId`(WbsGroup->Epic), `linkedStoryIds`(WbsItem->Story),
> `linkedTaskId`(WbsTask->Task) 기반 연결로 매핑되며, WBS 화면에서는 일정/진행률 관점에 집중한다.

### 1.2 설계 원칙

| 원칙 | 설명 |
|------|------|
| **4계층 트리** | Phase -> WbsGroup -> WbsItem -> WbsTask 계층 구조로 전체 공정 범위를 시각화 |
| **계획 vs 실적 이중 추적** | 모든 노드에 planned/actual 날짜 쌍을 관리하여 편차(SV) 산출 가능 |
| **가중 진행률** | `weight` 기반 가중평균으로 상위 노드 진행률을 자동 계산 |
| **3-View 전환** | 트리(Tree), 간트(Gantt), 테이블(Table) 3가지 뷰를 동일 데이터로 제공 |
| **AI/SI 트랙 구분** | Phase의 `trackType`(AI/SI/COMMON)으로 공정을 구분하여 트랙별 진행률 제공 |
| **FilterSpec = 온톨로지** | 필터 키가 AI/URL/백엔드 공통 스키마로 통합 |
| **Part 기반 스코프** | DEV_EXECUTION은 자신의 Part(파트) 관련 항목만 표시, **서버에서 강제** |
| **스냅샷 기반 이력** | WBS 변경 전 스냅샷을 생성하여 기준선(Baseline) 대비 편차 분석 가능 |
| **Critical Path 지원** | 의존관계(FS/SS/FF/SF) 기반 주경로 자동 산출 |
| **Capability 세분화** | 진행률 갱신은 WBS 생성/편집과 분리하여 DEV에게 독립 부여 가능 |

### 1.3 행동 무게중심 -- 관련 화면 간 역할 분담

> WBS는 **일정/공정 관리의 홈**이다. 백로그/칸반이 실행 관점이라면 WBS는 계획 관점이다.

| 화면 | 역할 | 핵심 행동 |
|------|------|---------|
| **WBS** (본 화면) | **일정/공정 관리 홈** | WBS 트리 관리, 간트 차트, 계획 vs 실적 추적, SV/CV 모니터링 |
| **Phase 관리** | **단계 구조 홈** | Phase 생성/편집, Gate 심사, 마일스톤 관리 |
| **백로그** | **실행 계획 홈** | Epic/Story 생성, Sprint 할당, Story Point 추정 |
| **칸반** | **실행 홈** | Task 상태 변경, 완료 처리 |

**Preset별 AI 라우팅 정책 (ask_schedule_delay 예시)**:

| Preset | "일정 지연 보여줘" -> AI 라우팅 | 이유 |
|--------|-------------------------------|------|
| PM_WORK | -> `targetNodeId: "wbs"` | PM은 전체 WBS에서 지연 관리 |
| PMO_CONTROL | -> `targetNodeId: "wbs"` | PMO는 편차 분석 관점 |
| DEV_EXECUTION | -> `targetNodeId: "wbs"` | DEV는 내 파트 지연 확인 |
| EXEC_SUMMARY | -> `targetNodeId: "wbs"` | Sponsor는 Phase 단위 지연만 요약 |

```typescript
/** Preset별 do intent 라우팅 정책 */
export const WBS_DO_INTENT_ROUTING: Record<ViewModePreset, Record<string, string>> = {
  PM_WORK: {
    do_update_progress:    "wbs",       // PM은 WBS에서 직접 갱신
    do_create_wbs_group:   "wbs",
    do_create_wbs_item:    "wbs",
    do_link_backlog:       "wbs",       // WBS-백로그 연결
    do_create_snapshot:    "wbs",
    do_export_wbs:         "wbs",
  },
  PMO_CONTROL: {
    do_update_progress:    "wbs",
    do_create_wbs_group:   "wbs",
    do_create_wbs_item:    "wbs",
    do_link_backlog:       "wbs",
    do_create_snapshot:    "wbs",
    do_export_wbs:         "wbs",
  },
  DEV_EXECUTION: {
    do_update_progress:    "wbs",       // DEV는 Task 진행률만 갱신
    do_create_wbs_group:   "wbs",
    do_create_wbs_item:    "wbs",
    do_link_backlog:       "backlog",   // 연결은 백로그에서
    do_create_snapshot:    "wbs",
    do_export_wbs:         "wbs",
  },
  EXEC_SUMMARY: {
    do_update_progress:    "wbs",
    do_create_wbs_group:   "wbs",
    do_create_wbs_item:    "wbs",
    do_link_backlog:       "wbs",
    do_create_snapshot:    "wbs",
    do_export_wbs:         "wbs",
  },
  CUSTOMER_APPROVAL: {
    do_update_progress:    "wbs",
    do_create_wbs_group:   "wbs",
    do_create_wbs_item:    "wbs",
    do_link_backlog:       "wbs",
    do_create_snapshot:    "wbs",
    do_export_wbs:         "wbs",
  },
};
```

> **핵심**: WBS 화면은 일정/공정 제어의 Single Source of Truth다.
> Preset에 따라 보이는 깊이와 편집 권한이 달라진다.

### 1.4 핵심 질문 -> 위젯 매핑

| 사용자 질문 | 화면 영역 | 설명 |
|-----------|---------|------|
| "전체 진행률이 몇 %야?" | 상단 KPI | 전체 WBS 가중 진행률 |
| "지연된 항목이 있어?" | KPI + 필터 | overdue_count + status=DELAYED 필터 |
| "Phase 2 WBS 보여줘" | 필터 + 트리 | phaseId 필터 -> 해당 Phase 트리 |
| "AI 트랙 진행률은?" | KPI + 필터 | trackType=AI 필터 -> AI 트랙 진행률 |
| "주경로(Critical Path)는?" | 간트 뷰 | Critical Path 하이라이트 |
| "계획 대비 실적 편차는?" | KPI + 테이블 | SV(Schedule Variance) 표시 |
| "WBS-1.2.3 상세 보여줘" | 상세 패널 | 특정 WBS 노드 상세 |
| "내 파트 WBS 보여줘" | 필터 | assigneeId=현재사용자 필터 |
| "이번 달 마감 항목은?" | 필터 | dateRange 필터 -> 마감일 범위 |
| "완료율 낮은 순으로 정렬" | 트리 정렬 | progress 기준 오름차순 |
| "스냅샷 만들어줘" | 툴바 CTA | 스냅샷 생성 |
| "간트 차트로 보여줘" | 뷰 전환 | viewType=GANTT |

---

## 2. MenuOntology 노드

### 2.1 타입 확정

| 항목 | 확정 | 설명 |
|------|------|------|
| `entities` | PascalCase | Phase, WbsGroup, WbsItem, WbsTask |
| `intents` | **16개** | Ask 10 + Do 6 |
| Capability | **5개** | view/manage/progress/snapshot/export |
| `filterSpec` | **12키** | phaseId, partId, wbsGroupId, status, assigneeId, progressMin, progressMax, dateRangeStart, dateRangeEnd, trackType, q, flags |
| `virtualNodes` | **5개** | overdue, critical-path, delayed, my-part, phase-summary |
| `metrics` | **10개** | 건수, 진행률, SV, CV, overdue 등 |

### 2.2 FilterSpec 정의

FilterSpec은 **이 화면이 지원하는 필터 스키마**를 온톨로지 내부에 선언한다.
AI가 딥링크를 생성할 때, URL 파라미터 문자열이 아니라 **FilterSpec 키 기반 필터 객체**를 반환한다.

```typescript
/** WBS 필터 스키마 -- 온톨로지 내장 */
export interface WbsFilterSpec {
  /** Phase 범위 */
  phaseId?: string;
  /** Part(파트) 범위 -- 담당자 기반 간접 필터 */
  partId?: string;
  /** WBS Group 범위 */
  wbsGroupId?: string;
  /** WBS 상태 (업무 상태 -- 의도적 멈춤/취소 등 lifecycle 상태만) */
  status?: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "ON_HOLD" | "CANCELLED";
  /** 담당자 필터 */
  assigneeId?: string;
  /** 진행률 범위 -- 최소 (0~100) */
  progressMin?: number;
  /** 진행률 범위 -- 최대 (0~100) */
  progressMax?: number;
  /** 일정 범위 -- 시작 */
  dateRangeStart?: string;   // ISO date: "2026-03-01"
  /** 일정 범위 -- 종료 */
  dateRangeEnd?: string;     // ISO date: "2026-06-30"
  /** AI/SI 트랙 구분 */
  trackType?: "AI" | "SI" | "COMMON";
  /** 자유 검색어 */
  q?: string;

  // --- v1.1: derived flags (server-evaluated) ---
  /**
   * Derived condition flags -- status와 분리된 "파생 조건"
   *
   * status는 "업무 상태"(lifecycle)만 표현하고,
   * 지연/기한초과/주경로는 날짜/SV/DAG 기반 "파생 조건"으로 분리한다.
   *
   * - OVERDUE:  plannedEndDate < today AND status NOT IN (COMPLETED, CANCELLED)
   * - DELAYED:  SV < 0 (계획진행률 > 실적진행률 + threshold)
   * - CRITICAL: Critical Path 상의 항목 (totalFloat === 0)
   *
   * 서버가 평가하므로 timezone/공휴일 등 일관성 보장.
   * 복수 지정 시 OR 결합 (하나라도 해당하면 매칭).
   */
  flags?: ("OVERDUE" | "DELAYED" | "CRITICAL")[];
}
```

> **status vs flags 분리 원칙**:
>
> - `status`는 **업무 상태**(lifecycle) -- NOT_STARTED/IN_PROGRESS/COMPLETED/ON_HOLD/CANCELLED
> - `flags`는 **파생 조건**(derived) -- 서버가 날짜/SV/DAG 기반으로 평가
> - 지연(DELAYED)은 "의도적 멈춤(ON_HOLD)"과 다르다 -- ON_HOLD는 리소스/의사결정 대기, DELAYED는 계획 대비 늦음
> - 기한초과(OVERDUE)는 `plannedEndDate < today`이므로 status로 표현 불가

> **queryMode 판정 규칙**: `phaseId`/`wbsGroupId`/`status`/`trackType`만 있으면 **TREE 모드**.
> `assigneeId`/`partId`/`progressMin`/`progressMax`/`dateRangeStart`/`dateRangeEnd`/`q`/`flags` 중
> 하나라도 있으면 **SEARCH 모드**로 전환된다.

### 2.3 FilterSpec URL 직렬화 규칙

**직렬화 방향**: `WbsFilterSpec -> URL query string -> WbsFilterSpec` (왕복 보장)

```typescript
/** FilterSpec -> URL 직렬화 */
function serializeWbsFilter(filter: WbsFilterSpec): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filter)) {
    if (value === undefined || value === null) continue;
    // v1.1: flags is an array -- serialize as comma-separated
    if (key === "flags" && Array.isArray(value)) {
      if (value.length > 0) params.set(key, value.join(","));
      continue;
    }
    params.set(key, String(value));
  }
  return params;
}

/** URL -> FilterSpec 역직렬화 */
function deserializeWbsFilter(params: URLSearchParams): WbsFilterSpec {
  const filter: WbsFilterSpec = {};
  const enumKeys = {
    status: ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "ON_HOLD", "CANCELLED"],
    trackType: ["AI", "SI", "COMMON"],
  } as const;
  const numberKeys = ["progressMin", "progressMax"] as const;
  // v1.1: flags whitelist
  const validFlags = ["OVERDUE", "DELAYED", "CRITICAL"] as const;

  for (const [key, value] of params.entries()) {
    // v1.1: flags -- comma-separated array, each value whitelist-validated
    if (key === "flags") {
      const parsed = value.split(",").filter(f => validFlags.includes(f as any));
      if (parsed.length > 0) filter.flags = parsed as any;
      continue;
    }
    // enum validation -- invalid value -> skip (silent drop)
    if (key in enumKeys) {
      if ((enumKeys as any)[key].includes(value)) {
        (filter as any)[key] = value;
      }
      continue;
    }
    // number keys
    if (numberKeys.includes(key as any)) {
      const num = parseInt(value, 10);
      if (!isNaN(num) && num >= 0 && num <= 100) {
        (filter as any)[key] = num;
      }
      continue;
    }
    // string keys (phaseId, partId, wbsGroupId, assigneeId, dateRangeStart, dateRangeEnd, q)
    if (["phaseId", "partId", "wbsGroupId", "assigneeId", "dateRangeStart", "dateRangeEnd", "q"].includes(key)) {
      (filter as any)[key] = value;
    }
    // unknown keys -> silent drop (forward compatibility)
  }
  return filter;
}
```

**직렬화 규칙 요약**:

| 규칙 | 예시 | 설명 |
|------|------|------|
| enum은 화이트리스트 검증 | `?status=IN_PROGRESS` | 유효하지 않은 값은 silent drop |
| number는 범위 검증 | `?progressMin=0&progressMax=50` | 0~100 범위 외 silent drop |
| **flags는 CSV 직렬화** | `?flags=OVERDUE,DELAYED` | 쉼표 구분, 개별 화이트리스트 검증 |
| 복수 필터는 `&`로 연결 | `?phaseId=p1&status=IN_PROGRESS` | 표준 query string |
| 미지 키는 무시 | `?futureKey=x` -> 무시 | 하위 호환성 보장 |

### 2.4 WBS 노드 (확정본 v1.1)

```typescript
const wbsNode: MenuOntologyNodeV2 = {
  nodeId: "wbs",
  label: "일정 관리 (WBS)",
  route: "/wbs",
  icon: "CalendarDays",
  domain: "plan",
  nodeRole: "detail",              // detail node -- action/filter queries get +10 boost

  requiredCaps: ["view_wbs"],

  // --- intents: 16 ---
  intents: [
    // Ask -- queries
    "ask_wbs_status",               // "WBS 현황 알려줘"
    "ask_wbs_progress",             // "전체 진행률 알려줘"
    "ask_phase_progress",           // "Phase 2 진행률은?"
    "ask_schedule_delay",           // "지연된 항목 있어?"
    "ask_schedule_variance",        // "계획 대비 실적 편차는?"
    "ask_critical_path",            // "주경로(Critical Path)는?"
    "ask_track_progress",           // "AI 트랙 진행률은?"
    "ask_overdue_items",            // "기한 초과 항목은?"
    "ask_wbs_detail",               // "WBS-1.2.3 상세 보여줘"
    "ask_my_wbs",                   // "내 파트 WBS 보여줘"
    // Do -- actions
    "do_create_wbs_group",          // "WBS 그룹 생성해줘"
    "do_create_wbs_item",           // "WBS 항목 추가해줘"
    "do_update_progress",           // "진행률 업데이트해줘"
    "do_link_backlog",              // "백로그 연결해줘"
    "do_create_snapshot",           // "스냅샷 만들어줘"
    "do_export_wbs",                // "WBS Export 해줘"
  ],
  canonicalQuestions: [
    "WBS 현황 보여줘",
    "전체 진행률이 몇 %야?",
    "지연된 항목이 있어?",
    "Phase 2 WBS 보여줘",
    "AI 트랙 진행률은?",
    "주경로(Critical Path) 알려줘",
    "계획 대비 실적 편차는?",
    "WBS-1.2.3 상세 보여줘",
    "내 파트 WBS 보여줘",
    "이번 달 마감 항목은?",
    "스냅샷 만들어줘",
    "간트 차트로 보여줘",
  ],
  entities: ["Phase", "WbsGroup", "WbsItem", "WbsTask", "WbsDependency"],
  keywords: [
    "WBS", "일정", "공정", "진행률", "간트", "Gantt",
    "작업분해구조", "마일스톤", "주경로", "critical path",
    "지연", "overdue", "편차", "variance", "스냅샷", "snapshot",
    "계획", "실적", "planned", "actual", "baseline",
    "AI 트랙", "SI 트랙", "weight", "가중치",
  ],
  metrics: [
    "total_wbs_groups",              // WBS Group 총 수
    "total_wbs_items",               // WBS Item 총 수
    "total_wbs_tasks",               // WBS Task 총 수
    "overall_progress",              // 전체 가중 진행률
    "completion_rate",               // 완료율 (COMPLETED 비율)
    "schedule_variance",             // SV(Schedule Variance)
    "cost_variance",                 // CV(Cost Variance) -- estimated vs actual hours
    "overdue_count",                 // 기한 초과 항목 수
    "critical_path_items_count",     // 주경로 항목 수
    "on_hold_count",                 // 보류(ON_HOLD) 항목 수
  ],

  // --- FilterSpec (v1.1: flags 추가) ---
  filterSpec: {
    keys: [
      "phaseId", "partId", "wbsGroupId", "status", "assigneeId",
      "progressMin", "progressMax", "dateRangeStart", "dateRangeEnd",
      "trackType", "q", "flags",
    ],
    defaults: {},  // Preset별로 오버라이드 가능
  },

  defaultPreset: "PM_WORK",
  presetPolicies: [
    {
      preset: "EXEC_SUMMARY",
      ui: {
        density: "compact",
        defaultRightPanel: "closed",
        defaultViewType: "TREE",
        highlight: {
          metricKeys: ["overall_progress", "schedule_variance", "overdue_count"],
          widgetKeys: ["KPI_PROGRESS", "KPI_SV", "KPI_OVERDUE", "PHASE_SUMMARY"],
        },
        hiddenColumns: ["assigneeId", "estimatedHours", "actualHours", "weight"],
        maxTreeDepth: 1,  // Phase level only
      },
    },
    {
      preset: "PMO_CONTROL",
      ui: {
        density: "standard",
        defaultRightPanel: "open",
        defaultViewType: "GANTT",
        highlight: {
          metricKeys: [
            "overall_progress", "schedule_variance", "cost_variance",
            "overdue_count", "on_hold_count",
          ],
          widgetKeys: [
            "KPI_PROGRESS", "KPI_SV", "KPI_CV",
            "KPI_OVERDUE", "DEVIATION_TABLE", "GANTT_CHART",
          ],
        },
        maxTreeDepth: 3,  // Phase + Group + Item
      },
      suggestedActions: [
        {
          key: "export_wbs",
          label: "WBS Export",
          requiredCaps: ["export_wbs"],
          targetNodeId: "wbs",
        },
        {
          key: "create_snapshot",
          label: "Baseline Snapshot",
          requiredCaps: ["manage_wbs_snapshot"],
          targetNodeId: "wbs",
        },
        {
          key: "view_report",
          label: "진행률 리포트",
          requiredCaps: ["view_reports"],
          targetNodeId: "reports",
        },
      ],
    },
    {
      preset: "PM_WORK",
      ui: {
        density: "detailed",
        defaultRightPanel: "open",
        defaultViewType: "TREE",
        highlight: {
          metricKeys: [
            "total_wbs_items", "overall_progress", "schedule_variance",
            "overdue_count", "critical_path_items_count", "on_hold_count",
          ],
          widgetKeys: [
            "KPI_ITEMS", "KPI_PROGRESS", "KPI_SV",
            "KPI_OVERDUE", "KPI_CRITICAL", "WBS_TREE",
            "GANTT_CHART", "CONTEXT_PANEL",
          ],
        },
        maxTreeDepth: 4,  // Full tree
      },
      suggestedActions: [
        {
          key: "create_wbs_group",
          label: "WBS Group 생성",
          requiredCaps: ["manage_wbs"],
          targetNodeId: "wbs",
        },
        {
          key: "create_wbs_item",
          label: "WBS Item 생성",
          requiredCaps: ["manage_wbs"],
          targetNodeId: "wbs",
        },
        {
          key: "create_snapshot",
          label: "Baseline Snapshot",
          requiredCaps: ["manage_wbs_snapshot"],
          targetNodeId: "wbs",
        },
        {
          key: "go_backlog",
          label: "백로그 연동",
          requiredCaps: ["view_backlog"],
          targetNodeId: "backlog",
        },
        {
          key: "go_phases",
          label: "Phase 관리",
          requiredCaps: ["view_phases"],
          targetNodeId: "phases",
        },
      ],
    },
    {
      preset: "DEV_EXECUTION",
      ui: {
        density: "standard",
        defaultRightPanel: "closed",
        defaultViewType: "TABLE",
        defaultFilters: { assigneeId: "{{currentUserId}}" },
        highlight: {
          metricKeys: ["total_wbs_items", "overall_progress", "overdue_count"],
          widgetKeys: ["KPI_ITEMS", "KPI_PROGRESS", "WBS_TABLE"],
        },
        maxTreeDepth: 4,  // Full tree (read-only except progress)
      },
      suggestedActions: [
        {
          key: "update_progress",
          label: "진행률 갱신",
          requiredCaps: ["update_wbs_progress"],
          targetNodeId: "wbs",
        },
        {
          key: "go_kanban",
          label: "칸반 보드",
          requiredCaps: ["view_kanban"],
          targetNodeId: "kanban",
        },
      ],
    },
    {
      preset: "CUSTOMER_APPROVAL",
      ui: {
        density: "compact",
        defaultRightPanel: "closed",
        defaultViewType: "TREE",
        highlight: {
          metricKeys: ["overall_progress", "schedule_variance"],
          widgetKeys: ["KPI_PROGRESS", "KPI_SV", "PHASE_SUMMARY"],
        },
        hiddenColumns: ["assigneeId", "estimatedHours", "actualHours", "weight", "partId"],
        maxTreeDepth: 1,  // Phase level only
      },
    },
  ],

  // --- DeepLink: routeTemplate (:param) ---
  deepLinks: [
    {
      pattern: "/wbs?phaseId=:phaseId",
      description: "Phase별 WBS 필터",
      requiredParams: ["phaseId"],
    },
    {
      pattern: "/wbs?status=:status",
      description: "상태별 WBS 필터",
      requiredParams: ["status"],
    },
    {
      pattern: "/wbs?assigneeId=:assigneeId",
      description: "담당자별 WBS 필터",
      requiredParams: ["assigneeId"],
    },
    {
      pattern: "/wbs?trackType=:trackType",
      description: "AI/SI 트랙별 필터",
      requiredParams: ["trackType"],
    },
    {
      pattern: "/wbs?progressMin=0&progressMax=:progressMax",
      description: "진행률 범위 필터",
      requiredParams: ["progressMax"],
    },
    {
      pattern: "/wbs?dateRangeStart=:start&dateRangeEnd=:end",
      description: "일정 범위 필터",
      requiredParams: ["start", "end"],
    },
  ],

  // --- virtualNode (v1.1: flags 기반 파생 조건으로 전환) ---
  virtualNodes: [
    {
      virtualId: "wbs.overdue",
      label: "기한 초과",
      routeTemplate: "/wbs?flags=OVERDUE",
      requiredParams: [],
      intents: ["ask_overdue_items"],
      description: "기한 초과(plannedEndDate < today AND status != COMPLETED/CANCELLED) -- 서버가 날짜 기반 평가",
    },
    {
      virtualId: "wbs.critical-path",
      label: "주경로(Critical Path)",
      routeTemplate: "/wbs?flags=CRITICAL&viewType=GANTT",
      requiredParams: [],
      intents: ["ask_critical_path"],
      description: "주경로 상의 WBS 항목(totalFloat === 0) -- 간트에서 하이라이트",
    },
    {
      virtualId: "wbs.delayed",
      label: "지연 항목",
      routeTemplate: "/wbs?flags=DELAYED",
      requiredParams: [],
      intents: ["ask_schedule_delay"],
      description: "SV < 0 (계획진행률 > 실적진행률)인 WBS 항목 -- 병목 제거 진입점. ON_HOLD(의도적 멈춤)과 구분됨",
    },
    {
      virtualId: "wbs.my-part",
      label: "내 파트 WBS",
      routeTemplate: "/wbs?assigneeId={{currentUserId}}",
      requiredParams: [],
      intents: ["ask_my_wbs"],
      description: "현재 사용자에게 할당된 WBS 항목 직접 진입",
    },
    {
      virtualId: "wbs.phase-summary",
      label: "Phase 요약",
      routeTemplate: "/wbs?viewType=TREE&depth=1",
      requiredParams: [],
      intents: ["ask_phase_progress"],
      description: "Phase 레벨 진행률 요약 -- 경영진 보고 진입점",
    },
  ],

  // --- scope (v1.1: security + exploration axes) ---
  scope: {
    /** Security scope -- server enforced */
    securityKeys: ["project", "assignee"],   // DEV: assigneeId forced, DevReader: partId forced
    /** Exploration scope -- user selectable */
    explorationKeys: ["phase", "trackType"],
    params: ["projectId", "phaseId", "assigneeId", "partId"],
  },

  priority: 2,
};
```

---

## 3. 화면 구조

### 3.1 Right Panel panelMode 정의

Right Panel은 항상 동일한 영역이지만, **panelMode**에 따라 표시 내용이 달라진다.

```typescript
/**
 * Right Panel mode -- v1.1: 4 base modes + analysis sub-tabs
 *
 * v1.0에서는 gantt-detail/deviation/backlog-link가 별도 panelMode였으나,
 * Backlog 화면의 panelMode(none/context/detail/trace)와 일관성을 맞추기 위해
 * 4개 기본 모드로 통합하고, 분석 기능은 "analysis" 모드의 하위 탭으로 흡수한다.
 *
 * 장점:
 * - 공통 레이아웃/상태 머신을 Backlog/WBS/Phase 등 전 화면에서 재사용
 * - panelMode 증가에 따른 상태 폭발 방지
 * - 분석 탭 추가 시 panelMode를 늘리지 않고 탭만 추가
 */
export type WbsPanelMode =
  | "none"              // Right Panel hidden (EXEC_SUMMARY, CUSTOMER_APPROVAL)
  | "context"           // WbsGroup/Item context info (row select in list)
  | "detail"            // WbsItem/WbsTask detail info (item view, gantt bar click 포함)
  | "analysis";         // Analysis tabs (deviation, backlog-link, gantt-detail 등)

/** analysis 모드의 하위 탭 -- panelMode="analysis"일 때만 유효 */
export type WbsAnalysisTab =
  | "deviation"         // Plan vs Actual deviation analysis (PMO_CONTROL)
  | "backlog-link"      // Backlog link status (Epic/Story connection)
  | "gantt-detail";     // Gantt bar click extended analysis (dependencies, float)
```

**panelMode 결정 규칙**:

| 컨텍스트 | Preset | 기본 panelMode | analysisTab |
| --------- | -------- | --------------- | ------------- |
| 목록 + 행 미선택 | ALL | `"none"` | -- |
| 목록 + Group 행 선택 | EXEC_SUMMARY / CUSTOMER_APPROVAL | `"none"` (Right Panel 숨김) | -- |
| 목록 + Group 행 선택 | PM_WORK / PMO_CONTROL | `"context"` | -- |
| 목록 + Group 행 선택 | DEV_EXECUTION | `"context"` (읽기 전용) | -- |
| 목록 + Item 행 선택 | PM_WORK | `"detail"` | -- |
| 간트 + 바 클릭 | PM_WORK / PMO_CONTROL | `"detail"` | -- |
| 편차 분석 탭 클릭 | PMO_CONTROL | `"analysis"` | `"deviation"` |
| 백로그 연결 탭 클릭 | PM_WORK | `"analysis"` | `"backlog-link"` |
| 간트 바 분석 탭 클릭 | PM_WORK / PMO_CONTROL | `"analysis"` | `"gantt-detail"` |

> **Backlog 화면 대비 일관성**: Backlog의 `BacklogPanelMode(none/context/detail/trace)`와
> WBS의 `WbsPanelMode(none/context/detail/analysis)`가 동일한 4-base 패턴을 공유한다.
> 공통 `<RightPanelLayout>` 컴포넌트를 재사용할 수 있다.

### 3.2 뷰 타입 정의

```typescript
/** WBS view type -- 3 views */
export type WbsViewType = "TREE" | "GANTT" | "TABLE";
```

| 뷰 타입 | 설명 | 주 사용 Preset |
|---------|------|-------------|
| `TREE` | 4계층 트리 구조 (접기/펼치기) | PM_WORK, EXEC_SUMMARY, CUSTOMER_APPROVAL |
| `GANTT` | 간트 차트 (타임라인 기반) | PMO_CONTROL, PM_WORK |
| `TABLE` | 플랫 테이블 (정렬/필터 최적화) | DEV_EXECUTION |

### 3.3 WBS 목록 -- Tree View (`/wbs`)

```
+--------------------------------------------------------------+
|  Page Header                                                  |
|  일정 관리 (WBS)  [ AI 보험금지급심사 구축 ]                    |
|  [Tree|Gantt|Table]  [ 필터 v ]  [ 검색 ]    [ + Group 생성 ] |
+--------------------------------------------------------------+
|                                                              |
|  +----------+  +----------+  +----------+  +----------+      |
|  | WBS      |  | 전체     |  | Schedule |  | 기한     |      |
|  | Items    |  | 진행률   |  | Variance |  | 초과     |      |
|  | 48건     |  |  67%     |  | -3.2일   |  |  5건     |      |
|  +----------+  +----------+  +----------+  +----------+      |
|                                                              |
|  +----------+  +----------+  +----------+  +----------+      |
|  | Cost     |  | Critical |  | ON_HOLD  |  | 완료율   |      |
|  | Variance |  | Path     |  | 항목     |  |          |      |
|  | +12h     |  |  8건     |  |  2건     |  |  42%     |      |
|  +----------+  +----------+  +----------+  +----------+      |
|                                                              |
|  +- 필터 바 -----------------------------------------+        |
|  | Phase: [전체v]  상태: [전체v]  담당: [전체v]       |        |
|  | 진행률: [0%]~[100%]  기간: [시작]~[종료]          |        |
|  | 트랙: [전체v]  검색: [           ]                |        |
|  +---------------------------------------------------+        |
|                                                              |
|  +- WBS Tree --------------------------------+- Panel ------+|
|  |                                           | panelMode:    ||
|  | v Phase 1: 분석/설계 [AI/SI/COMMON]       | "context"     ||
|  |   |  NOT_STARTED | 0% | 2026-03~06       |               ||
|  |   |                                       | -- Group --   ||
|  |   +- v WG-01 요구사항 분석                | 이름: 요구    ||
|  |   |   |  IN_PROGRESS | 45% | 03-01~04-15 | 사항 분석     ||
|  |   |   |  계획: 45일 | 실적: 52일 | SV:-7 |               ||
|  |   |   |                                   | Phase: 분석   ||
|  |   |   +- WI-01 현행 시스템 분석           | /설계         ||
|  |   |   |   IN_PROGRESS | 80% | 김oo       |               ||
|  |   |   |   계획: 03-01~03-20              | -- 진행률 --  ||
|  |   |   |   실적: 03-01~03-25 (5일 지연)   | 계획: 45%     ||
|  |   |   |   Est: 120h | Act: 135h          | 실적: 38%     ||
|  |   |   |                                   | 편차: -7%     ||
|  |   |   +- WT-01 AS-IS 프로세스 매핑        | ######o  38%  ||
|  |   |   |   COMPLETED | 100% | 이oo        |               ||
|  |   |   |                                   | -- 일정 --   ||
|  |   |   +- WT-02 데이터 모델 분석           | Start: 03-01  ||
|  |   |       IN_PROGRESS | 60% | 박oo       | End: 04-15    ||
|  |   |                                       | Actual: 03-05 ||
|  |   +- > WG-02 아키텍처 설계 (접힘)         | ~진행 중      ||
|  |   |   |  NOT_STARTED | 0% | 04-01~05-15  |               ||
|  |   |                                       | -- 항목 --   ||
|  | v Phase 2: 개발 [AI]                      | Item: 3건     ||
|  |   |  IN_PROGRESS | 52% | 2026-06~09      | Task: 8건     ||
|  |   |                                       | 완료: 3건     ||
|  |   +- v WG-03 AI 모델 개발                 |               ||
|  |   |   |  IN_PROGRESS | 65% | 06-01~08-15 | -- 추천 --   ||
|  |   |   |  계획: 75일 | 실적: 60일 | SV:+15 | [+ Item 추가] ||
|  |   |   |                                   | [간트에서 보기]||
|  |   |   +- WI-02 학습데이터 준비            | [백로그 연결] ||
|  |   |   |   COMPLETED | 100% | 정oo        |               ||
|  |   |   |                                   |               ||
|  |   |   +- WI-03 모델 학습/튜닝             |               ||
|  |   |       IN_PROGRESS | 40% | 최oo       |               ||
|  |   |       계획: 07-01~08-15              |               ||
|  |   |       실적: 07-05~진행 중             |               ||
|  |   |                                       |               ||
|  |   +- > WG-04 SI 시스템 개발 (접힘)        |               ||
|  |       |  IN_PROGRESS | 40% | 06-15~09-30 |               ||
|  |                                           |               ||
|  | > Phase 3: 테스트 (접힘)                  |               ||
|  |   |  NOT_STARTED | 0% | 2026-09~11       |               ||
|  |                                           |               ||
|  +-------------------------------------------+--------------+|
|                                                              |
+--------------------------------------------------------------+
```

### 3.4 WBS 목록 -- Gantt View (`/wbs?viewType=GANTT`)

```
+--------------------------------------------------------------+
|  Page Header                                                  |
|  일정 관리 (WBS)  [ AI 보험금지급심사 구축 ]                    |
|  [Tree|*Gantt*|Table]  [ 필터 v ]    [ Critical Path 표시 ]   |
+--------------------------------------------------------------+
|                                                              |
|  +- KPI Row (상동) ----------------------------------------+ |
|                                                              |
|  +- Gantt Chart -------------------------------------------+|
|  |  WBS 항목          | 진행 | 3월  4월  5월  6월  7월  8월 ||
|  |--------------------+------+------------------------------|
|  | v Phase 1: 분석    |  45% |  [=======........]           ||
|  |   WG-01 요구분석   |  45% |  [===....]                   ||
|  |     WI-01 현행분석  |  80% |  [====]x                     ||
|  |       WT-01 AS-IS   | 100% |  [##]                        ||
|  |       WT-02 데이터  |  60% |   [==..]                     ||
|  |     WI-02 TO-BE     |  10% |      [=........]             ||
|  |   WG-02 설계        |   0% |         [............]       ||
|  |                     |      |                              ||
|  | v Phase 2: 개발     |  52% |              [==========....]||
|  |   WG-03 AI모델      |  65% |              [========..]    ||
|  |     WI-03 학습      | 100% |              [####]          ||
|  |     WI-04 튜닝      |  40% |                  [===....]   ||
|  |   WG-04 SI개발      |  40% |               [======.......]||
|  |                     |      |                              ||
|  | > Phase 3: 테스트   |   0% |                       [......]|
|  |                     |      |                              ||
|  |--------------------+------+------------------------------|
|  |  범례:  [##] 완료  [==] 진행  [..] 미진행  x 지연        ||
|  |         *** Critical Path (주경로)                        ||
|  +----------------------------------------------------------+|
|                                                              |
+--------------------------------------------------------------+

범례:
  [##]  = 완료 구간 (actualStartDate ~ actualEndDate, COMPLETED)
  [==]  = 진행 중 구간 (actualStartDate ~ today)
  [..]  = 미진행 잔여 구간 (today ~ plannedEndDate)
  x     = 지연 표시 (actualEndDate > plannedEndDate)
  ***   = Critical Path 하이라이트
```

### 3.5 WBS 목록 -- Table View (`/wbs?viewType=TABLE`)

```
+--------------------------------------------------------------+
|  Page Header                                                  |
|  일정 관리 (WBS)  [ AI 보험금지급심사 구축 ]                    |
|  [Tree|Gantt|*Table*]  [ 필터 v ]  [ 검색 ]                  |
+--------------------------------------------------------------+
|                                                              |
|  +- KPI Row (상동) ----------------------------------------+ |
|                                                              |
|  +- WBS Table -----------------------------------------+    |
|  | Code    | 이름           | 상태    | 계획% | 실적% |    |
|  |         |                |         |       |       |    |
|  | Phase   | 담당  | 계획시작  | 계획종료  | 실적시작  |    |
|  |         |       |          |          |          |    |
|  | Est(h)  | Act(h) | SV(일)  |                      |    |
|  |---------+--------+---------+-------+-------+-----|    |
|  | 1.1     | 요구사항 분석   | IP     |   45% |  38% |    |
|  |         | Phase1  | 김oo  | 03-01  | 04-15 | 03-05|    |
|  |         | 120h   | 135h  |  -7일  |              |    |
|  |---------+--------+---------+-------+-------+-----|    |
|  | 1.1.1   | 현행시스템분석  | IP     |   80% |  75% |    |
|  |         | Phase1  | 이oo  | 03-01  | 03-20 | 03-01|    |
|  |         |  80h   |  92h  |  -5일  |              |    |
|  |---------+--------+---------+-------+-------+-----|    |
|  | 1.1.1.1 | AS-IS 매핑     | COMP   |  100% | 100% |    |
|  |         | Phase1  | 박oo  | 03-01  | 03-10 | 03-01|    |
|  |         |  40h   |  38h  |   0일  |              |    |
|  |---------+--------+---------+-------+-------+-----|    |
|  | ...     | ...            | ...    | ...   | ...  |    |
|  +-----------------------------------------------------+    |
|                                                              |
+--------------------------------------------------------------+

※ Table View: 플랫 리스트로 정렬/필터/검색 최적화
※ 상태 약어: NS=NOT_STARTED, IP=IN_PROGRESS, COMP=COMPLETED, OH=ON_HOLD, CX=CANCELLED
```

### 3.6 WBS Item 상세 (Right Panel detail mode)

```
+- panelMode: "detail" -------------------------+
|                                                |
|  WBS Item: WI-03 모델 학습/튜닝               |
|  Code: 1.2.1.2                                |
|                                                |
|  -- 기본 정보 -------------------------------- |
|  상태: IN_PROGRESS                             |
|  Phase: Phase 2 (개발)                         |
|  Group: WG-03 (AI 모델 개발)                   |
|  담당: 최oo                                    |
|  가중치: 40%                                   |
|                                                |
|  -- 일정 ------------------------------------ |
|  계획 시작: 2026-07-01                         |
|  계획 종료: 2026-08-15                         |
|  실적 시작: 2026-07-05                         |
|  실적 종료: 진행 중                            |
|  SV: -4일 (실적시작 4일 지연)                  |
|                                                |
|  -- 진행률 ---------------------------------- |
|  계획 진행률: 55%  (기간 기준)                  |
|  실적 진행률: 40%                              |
|  편차: -15%                                    |
|  ##########o.................. 40%             |
|                                                |
|  -- 공수 ------------------------------------ |
|  추정 공수: 160h                               |
|  실적 공수: 128h                               |
|  잔여: 32h                                     |
|  CV: -20% (실적 > 계획 비율 기준)              |
|                                                |
|  -- 하위 Task -------------------------------- |
|  WT-05 데이터 전처리    COMPLETED  100%  20h   |
|  WT-06 1차 학습         COMPLETED  100%  40h   |
|  WT-07 하이퍼파라미터   IP          60%  48h   |
|  WT-08 2차 학습/평가    NOT_STARTED   0%  20h   |
|                                                |
|  -- 백로그 연결 ------------------------------ |
|  연결된 Story: S-04 학습 데이터 전처리         |
|    상태: DONE | Sprint-3                       |
|  연결된 Story: S-05 자동 재학습                |
|    상태: IDEA | 미할당                         |
|  [백로그에서 보기 ->]                          |
|                                                |
|  -- 추천 액션 -------------------------------- |
|  ! WT-07 진행률 60% -- 기한 8/15까지 22일      |
|  -> [진행률 갱신]                              |
|  ! S-05 아직 IDEA 상태, WI-03 완료 전 필요     |
|  -> [Story 확인]    targetNodeId: "backlog"    |
|                                                |
|  [ 편집 ]  [ Task 추가 ]  [ 변경이력 ]         |
|                                                |
+------------------------------------------------+
```

---

## 4. Preset별 차이

### 4.1 EXEC_SUMMARY (Sponsor)

| 영역 | 표시 내용 |
|------|---------|
| KPI Row | 전체 진행률, SV(Schedule Variance), 기한초과 건수만 표시 |
| 뷰 | Tree View -- Phase 레벨만 (WbsGroup/Item/Task 접힘, 확장 불가) |
| Phase 행 | Phase명 + 전체 진행률 바 + 계획 vs 실적 % + AI/SI 트랙 표시 |
| Right Panel | panelMode: `"none"` (숨김) |
| CTA | 없음 (읽기 전용) |
| 간트 | 표시 안 함 |

**EXEC_SUMMARY 최소 표시 구조**:

```
Phase 1: 분석/설계     ######o............... 38%   계획: 45%  편차: -7%  [AI/SI]
Phase 2: 개발          ##########o........... 52%   계획: 60%  편차: -8%  [AI]
Phase 3: 테스트        ........................ 0%   계획:  0%  편차:  0%  [SI]
```

### 4.2 PMO_CONTROL (PMO)

| 영역 | 표시 내용 |
|------|---------|
| KPI Row | 전체 진행률, SV, CV, 기한초과, ON_HOLD 건수, Critical Path 항목 수 |
| 뷰 | Gantt View (기본) -- Phase + Group + Item 레벨 (Task 접힘, 확장 가능) |
| Deviation Panel | 계획 vs 실적 편차 분석 테이블 (panelMode: `"deviation"`) |
| Right Panel | panelMode: `"context"` + 편차 분석 |
| CTA | `WBS Export`, `Baseline Snapshot`, `진행률 리포트` |

**PMO_CONTROL 편차 분석 테이블**:

| Phase/Group | 계획% | 실적% | SV(일) | CV(h) | 상태 |
|------------|-------|-------|--------|-------|------|
| Phase 1 분석 | 45% | 38% | -7 | +15h | 지연 |
| WG-01 요구분석 | 45% | 38% | -7 | +15h | 지연 |
| WG-02 설계 | 0% | 0% | 0 | 0 | 예정 |
| Phase 2 개발 | 60% | 52% | -8 | -20h | 지연 |
| WG-03 AI모델 | 75% | 65% | +15 | 0 | 양호 |
| WG-04 SI개발 | 50% | 40% | -10 | -20h | 지연 |

### 4.3 PM_WORK (PM)

| 영역 | 표시 내용 |
|------|---------|
| KPI Row | 전체 건수, 진행률, SV, CV, 기한초과, Critical Path, ON_HOLD |
| 뷰 | Tree View (기본) -- **전체 4계층** (Phase -> Group -> Item -> Task) 확장 가능 |
| Right Panel | panelMode: `"context"` / `"detail"` / `"backlog-link"` + 추천 액션 |
| CTA | `WBS Group 생성`, `WBS Item 생성`, `Baseline Snapshot`, `백로그 연동`, `Phase 관리` |
| Gantt | 상단 [Gantt] 탭으로 전환 가능 |

**PM_WORK 트리 인라인 CTA**:

| 컨텍스트 | CTA | Capability |
|---------|-----|-----------|
| Phase 행 | `[+ Group 추가]` | `manage_wbs` |
| WbsGroup 행 | `[+ Item 추가]` | `manage_wbs` |
| WbsItem 행 | `[+ Task 추가]` | `manage_wbs` |
| WbsItem 행 | `[진행률 갱신]` | `update_wbs_progress` |
| WbsTask 행 | `[진행률 갱신]` | `update_wbs_progress` |
| WbsGroup 행 | `[백로그 연결]` | `manage_wbs` |

### 4.4 DEV_EXECUTION (DEV / DevReader)

| 영역 | 표시 내용 |
|------|---------|
| KPI Row | 내 담당 Item 수, 진행률, 기한초과 건수 |
| 뷰 | Table View (기본) -- 내 할당 WbsItem/WbsTask 플랫 리스트 |
| Right Panel | panelMode: `"context"` (읽기 전용, 진행률 갱신만 가능) |
| CTA | `진행률 갱신` (cap: `update_wbs_progress`), `칸반 보드` |
| 기본 필터 | `assigneeId: "{{currentUserId}}"` (**서버 강제**) |

**DEV_EXECUTION 진행률 갱신 플로우**:

```
WBS Table에서 내 할당 WbsTask 선택
  -> Right Panel에 Task 상세 표시
  -> [진행률 갱신] 버튼 클릭
  -> 슬라이더/수치 입력으로 progress 값 변경
  -> PATCH /api/wbs/tasks/:taskId { progress: newValue }
  -> 서버: 상위 WbsItem/WbsGroup/Phase 가중 진행률 자동 재계산
  -> 화면 새로고침
```

### 4.5 CUSTOMER_APPROVAL (Customer PM)

| 영역 | 표시 내용 |
|------|---------|
| KPI Row | 전체 진행률, SV(편차) 요약만 |
| 뷰 | Tree View -- Phase 레벨만 + 진행률 바 (Group/Item/Task 숨김) |
| Right Panel | panelMode: `"none"` (숨김) |
| CTA | 없음 (읽기 전용, 요약 목적) |

---

## 5. 데이터 구조 / API

### 5.1 기존 타입 참조

WBS의 핵심 타입은 `PMS_IC_FrontEnd_v1.2/src/types/wbs.ts`에 이미 정의되어 있다.
본 설계에서는 해당 타입을 그대로 사용하며, 추가되는 API 응답 타입만 별도 정의한다.

| 타입 | 출처 | 용도 |
|------|------|------|
| `WbsGroup`, `WbsGroupFormData` | wbs.ts | WbsGroup CRUD |
| `WbsItem`, `WbsItemFormData` | wbs.ts | WbsItem CRUD |
| `WbsTask`, `WbsTaskFormData` | wbs.ts | WbsTask CRUD |
| `WbsGroupWithItems` | wbs.ts | 트리 렌더링 (Group + Items + Tasks) |
| `WbsItemWithTasks` | wbs.ts | Item + Tasks 렌더링 |
| `PhaseWithWbs` | wbs.ts | Phase별 WBS 트리 |
| `WbsDependency` | wbs.ts | 의존관계 (FS/SS/FF/SF) |
| `CriticalPathResponse` | wbs.ts | Critical Path 산출 결과 |
| `WbsStatus` | wbs.ts | 5값 상태 enum |
| `calculateWeightedProgress` | wbs.ts | 가중 진행률 계산 함수 |

### 5.2 4계층 트리 구조 및 상태 흐름

```
Level 0: Phase (프로젝트 단계)
  |  Status: NOT_STARTED -> IN_PROGRESS -> COMPLETED / ON_HOLD
  |  TrackType: AI / SI / COMMON
  |  Owner: PM / PMO
  |  DB: project.phases (R2dbcPhase)
  |
  +- Level 1: WbsGroup (작업 그룹)
  |    |  Status: NOT_STARTED -> IN_PROGRESS -> COMPLETED / ON_HOLD / CANCELLED
  |    |  FK: phase_id -> phases.id
  |    |  Link: linkedEpicId -> Epic.id (optional)
  |    |  DB: project.wbs_groups (R2dbcWbsGroup)
  |    |
  |    +- Level 2: WbsItem (작업 패키지)
  |    |    |  Status: NOT_STARTED -> IN_PROGRESS -> COMPLETED / ON_HOLD / CANCELLED
  |    |    |  FK: group_id -> wbs_groups.id, phase_id -> phases.id
  |    |    |  Link: linkedStoryIds -> UserStory.id (optional, via join table)
  |    |    |  DB: project.wbs_items (R2dbcWbsItem)
  |    |    |
  |    |    +- Level 3: WbsTask (세부 활동)
  |    |         Status: NOT_STARTED -> IN_PROGRESS -> COMPLETED / ON_HOLD / CANCELLED
  |    |         FK: item_id -> wbs_items.id, group_id -> wbs_groups.id, phase_id -> phases.id
  |    |         Link: linkedTaskId -> Task.id (optional)
  |    |         DB: project.wbs_tasks (R2dbcWbsTask)
```

### 5.3 상태 전이 규칙

```
NOT_STARTED --> IN_PROGRESS --> COMPLETED
                    |               ^
                    v               |
                ON_HOLD --------+
                    |
                    v
                CANCELLED

Status transition triggers (server-side):
  NOT_STARTED -> IN_PROGRESS:
    - WbsTask: progress > 0 or actualStartDate set
    - WbsItem: at least one child WbsTask is IN_PROGRESS
    - WbsGroup: at least one child WbsItem is IN_PROGRESS
    - Phase: at least one child WbsGroup is IN_PROGRESS

  IN_PROGRESS -> COMPLETED:
    - WbsTask: progress = 100 AND actualEndDate set
    - WbsItem: all child WbsTasks are COMPLETED (server validates)
    - WbsGroup: all child WbsItems are COMPLETED (server validates)

  -> ON_HOLD: manual (cap: manage_wbs), propagates hold to children
  -> CANCELLED: manual (cap: manage_wbs), PM only
```

### 5.4 진행률 자동 계산

```typescript
/**
 * Weighted progress calculation -- matches wbs.ts::calculateWeightedProgress
 *
 * Each node has a `weight` (0~100, default 100).
 * Parent progress = sum(child.progress * child.weight) / sum(child.weight)
 */
interface ProgressCalculation {
  /** WbsItem progress = weighted average of child WbsTasks */
  itemProgress: (item: WbsItemWithTasks) => number;
  /** WbsGroup progress = weighted average of child WbsItems */
  groupProgress: (group: WbsGroupWithItems) => number;
  /** Phase progress = weighted average of child WbsGroups */
  phaseProgress: (phase: PhaseWithWbs) => number;
}

/**
 * v1.1: Progress edge case rules
 *
 * 1) Childless node (e.g., WbsItem with 0 tasks):
 *    - progress is "manual input" mode -- PATCH /progress allowed directly
 *    - Server does NOT auto-calculate from children (no children to aggregate)
 *    - UI shows "(manual)" badge next to progress bar
 *
 * 2) sum(weight) === 0 (all children have weight=0):
 *    - Parent progress = 0 (NOT division by zero)
 *    - Server returns warning: "ALL_CHILDREN_ZERO_WEIGHT"
 *    - UI shows "weight configuration required" badge
 *
 * 3) Server-computed vs Frontend-displayed values:
 *    - SV, CV, plannedProgress, isOverdue, isDelayed, isCritical
 *      are ALWAYS server-computed and included in API responses
 *    - Frontend displays these values as-is (read-only)
 *    - Frontend MAY show "approximate" badge for stale cached values (> 5min)
 *    - This prevents timezone/holiday/rounding discrepancies between server and client
 */
type ProgressEdgeCaseWarning =
  | "CHILDLESS_MANUAL_PROGRESS"   // node has no children, progress is manual
  | "ALL_CHILDREN_ZERO_WEIGHT"    // sum(weight) = 0, parent progress forced to 0
  | "PARTIAL_CHILDREN_COMPLETED"; // some children completed but parent not auto-complete (manual ON_HOLD)

/**
 * Schedule Variance (SV) calculation
 * SV = (progress_actual - progress_planned_by_date) * total_planned_days
 * Negative SV = behind schedule
 */
function calculateScheduleVariance(
  plannedStart: Date,
  plannedEnd: Date,
  actualProgress: number,
  today: Date = new Date()
): number {
  const totalDays = diffDays(plannedStart, plannedEnd);
  const elapsedDays = diffDays(plannedStart, today);
  const plannedProgress = Math.min(100, (elapsedDays / totalDays) * 100);
  return Math.round((actualProgress - plannedProgress) * totalDays / 100);
}

/**
 * Cost Variance (CV) calculation
 * CV = estimatedHours - actualHours (at current progress rate)
 * Negative CV = over budget
 */
function calculateCostVariance(
  estimatedHours: number,
  actualHours: number,
  progress: number
): number {
  if (progress === 0) return 0;
  const estimatedAtProgress = estimatedHours * (progress / 100);
  return Math.round(estimatedAtProgress - actualHours);
}
```

### 5.5 WBS API 경로 분리 (v1.1)

> **v1.1 변경**: v1.0에서는 `/wbs/full-tree` 하나로 TREE/SEARCH를 모두 처리했으나,
> 의미 충돌(전체 덤프 vs 필터링 조회), 캐시 키 복잡화, queryMode별 응답 계약 혼선을 방지하기 위해
> **3개 경로로 분리**한다.

| 경로 | 용도 | queryMode | 캐시 |
| ---- | ---- | --------- | ---- |
| `GET /api/projects/{projectId}/wbs/tree` | TREE 모드 전용 (계층 완결 트리) | TREE | ETag / 2min |
| `GET /api/projects/{projectId}/wbs/search` | SEARCH 모드 전용 (매칭 결과 중심) | SEARCH | 없음 (필터 의존) |
| `GET /api/projects/{projectId}/wbs/dump` | 초기 로딩 최적화 (정규화 리스트) | -- | ETag / 5min |

#### 5.5.1 Tree API (TREE 모드)

```
GET /api/projects/{projectId}/wbs/tree
    ?phaseId={phaseId}
    &wbsGroupId={wbsGroupId}
    &status={NOT_STARTED|IN_PROGRESS|COMPLETED|ON_HOLD|CANCELLED}
    &trackType={AI|SI|COMMON}
```

> TREE 모드 전용 -- 계층 완결 트리 응답. **서버 계산 필드(progress, plannedProgress, svDays, cvHours, isOverdue, isDelayed, isCritical)를 각 entity에 포함**하여 프론트는 표시만 한다.

```typescript
interface WbsTreeResponse {
  /** Phase-based WBS tree -- complete hierarchy */
  phases: PhaseWithWbs[];

  /** WBS stats */
  stats: WbsStatsResponse;

  queryMode: "TREE";

  // --- scope echo ---
  scope: WbsScopeEcho;

  // --- reliability 3-tuple (standardized) ---
  asOf: string;
  completeness: {
    overall: number;    // 0~1
    breakdown?: {
      phases: number;
      groups: number;
      items: number;
      tasks: number;
    };
  };
  warnings: { code: string; message: string; severity: "info" | "warn" | "critical" }[];
}
```

#### 5.5.2 Search API (SEARCH 모드)

```
GET /api/projects/{projectId}/wbs/search
    ?phaseId={phaseId}
    &partId={partId}
    &wbsGroupId={wbsGroupId}
    &status={NOT_STARTED|IN_PROGRESS|COMPLETED|ON_HOLD|CANCELLED}
    &assigneeId={assigneeId}
    &progressMin={0~100}
    &progressMax={0~100}
    &dateRangeStart={ISO date}
    &dateRangeEnd={ISO date}
    &trackType={AI|SI|COMMON}
    &flags={OVERDUE,DELAYED,CRITICAL}
    &q={searchText}
```

> **참고**: 쿼리 파라미터는 section 2.2 FilterSpec 키와 **1:1 매핑**된다. `flags`는 CSV 형식.

```typescript
interface WbsSearchResponse {
  /** Phase-based WBS tree -- may be partial (matched paths only) */
  phases: PhaseWithWbs[];

  /** WBS stats (filtered scope) */
  stats: WbsStatsResponse;

  queryMode: "SEARCH";

  /** SEARCH mode: matched node IDs */
  matchedNodes: {
    groupIds: string[];
    itemIds: string[];
    taskIds: string[];
    totalMatched: number;
    totalAll: number;
  };
  /** SEARCH mode: auto-expand path IDs (ancestor chain of matched nodes) */
  expandedPathIds: string[];
  /** SEARCH mode: non-matched nodes rendering policy */
  nonMatchedPolicy: "dim" | "hide";

  // --- scope echo ---
  scope: WbsScopeEcho;

  // --- reliability 3-tuple (standardized) ---
  asOf: string;
  completeness: {
    overall: number;
    breakdown?: {
      phases: number;
      groups: number;
      items: number;
      tasks: number;
    };
  };
  warnings: { code: string; message: string; severity: "info" | "warn" | "critical" }[];
}
```

#### 5.5.3 Dump API (초기 로딩 최적화)

```
GET /api/projects/{projectId}/wbs/dump
    ?phaseId={phaseId}
```

> **성능 최적화**: 필터 없이(또는 phaseId만) 전체 WBS를 정규화 리스트로 가져온다.
> 프론트엔드에서 FK 참조(phaseId, groupId, itemId)로 트리를 클라이언트 사이드 조립한다.
> **각 entity에 서버 계산 필드(progress, plannedProgress, svDays, cvHours, isOverdue, isDelayed, isCritical)를 포함**한다.

```typescript
interface WbsDumpResponse {
  groups: WbsGroupDto[];
  items: WbsItemDto[];
  tasks: WbsTaskDto[];
  /** Server-computed derived flags per entity */
  derivedFlags: Record<string, {
    isOverdue: boolean;
    isDelayed: boolean;
    isCritical: boolean;
    svDays: number;
    cvHours: number;
    plannedProgress: number;
  }>;
}
```

### 5.6 queryMode 판정

```typescript
/** queryMode determination -- v1.1: flags added to search triggers */
export type WbsQueryMode = "TREE" | "SEARCH";

function determineWbsQueryMode(filter: WbsFilterSpec): WbsQueryMode {
  const searchKeys: (keyof WbsFilterSpec)[] = [
    "assigneeId", "partId", "progressMin", "progressMax",
    "dateRangeStart", "dateRangeEnd", "q", "flags",
  ];
  const hasSearchFilter = searchKeys.some(k => filter[k] !== undefined);
  return hasSearchFilter ? "SEARCH" : "TREE";
}

/**
 * v1.1: SEARCH + Gantt 정책
 *
 * SEARCH 모드에서 Gantt 전환 시, 자동으로 TREE 모드로 복원하고
 * "검색 결과는 Table/Tree 뷰에서 확인하세요" 안내를 표시한다.
 *
 * 이유: Gantt는 구조적으로 "트리 완결"을 요구하며,
 * 부분 매칭 결과만으로 의존관계 선/Critical Path를 정확히 렌더링하기 어렵다.
 * 점선 처리 등 고급 UX는 v2.0에서 검토한다.
 */
function handleSearchGanttConflict(queryMode: WbsQueryMode, viewType: WbsViewType): {
  resolvedQueryMode: WbsQueryMode;
  resolvedViewType: WbsViewType;
  showBanner: boolean;
} {
  if (queryMode === "SEARCH" && viewType === "GANTT") {
    return { resolvedQueryMode: "TREE", resolvedViewType: "GANTT", showBanner: true };
  }
  return { resolvedQueryMode: queryMode, resolvedViewType: viewType, showBanner: false };
}
```

### 5.7 WBS Stats API

```text
GET /api/projects/{projectId}/wbs/stats
    ?phaseId={phaseId}
    &trackType={AI|SI|COMMON}
```

```typescript
interface WbsStatsResponse {
  /** WBS Group count */
  totalGroups: number;
  /** WBS Item count */
  totalItems: number;
  /** WBS Task count */
  totalTasks: number;
  /** Overall weighted progress */
  overallProgress: number;
  /** Completion rate (COMPLETED / total * 100) */
  completionRate: number;
  /** Schedule Variance in days (negative = behind) */
  scheduleVariance: number;
  /** Cost Variance in hours (negative = over budget) */
  costVariance: number;
  /** Overdue items count (plannedEndDate < today AND status != COMPLETED) */
  overdueCount: number;
  /** Critical path items count */
  criticalPathItemsCount: number;
  /** ON_HOLD items count */
  onHoldCount: number;

  // Phase-level breakdown
  byPhase: {
    phaseId: string;
    phaseName: string;
    trackType: "AI" | "SI" | "COMMON";
    groupCount: number;
    itemCount: number;
    taskCount: number;
    progress: number;
    plannedProgress: number;
    scheduleVariance: number;
    overdueCount: number;
  }[];

  // Track-level summary
  byTrack: {
    trackType: "AI" | "SI" | "COMMON";
    itemCount: number;
    progress: number;
    scheduleVariance: number;
  }[];

  // scope echo
  scope: WbsScopeEcho;

  // reliability 3-tuple (v1.1: standardized format)
  asOf: string;
  completeness: {
    overall: number;    // 0~1
    breakdown?: {
      phases: number;
      groups: number;
      items: number;
      tasks: number;
    };
  };
  warnings: { code: string; message: string; severity: "info" | "warn" | "critical" }[];
}
```

> **v1.1: 신뢰도 3-tuple 표준화**: Backlog/WBS/Phase 등 전 화면에서 동일한 구조를 사용한다.
> `completeness`는 `overall` + 선택적 `breakdown`, `warnings`는 `{code, message, severity}` 객체 배열.
> 이를 통해 "데이터 완전도 배너", "주의/경고 뱃지", "관측 대시보드" 등 공통 컴포넌트 재사용이 가능하다.

### 5.8 WBS CRUD API

```
// ========== WBS Group ==========
GET    /api/phases/{phaseId}/wbs-groups            // Phase별 Group 목록 (cap: view_wbs)
GET    /api/projects/{projectId}/wbs-groups        // Project 전체 Group (cap: view_wbs)
GET    /api/wbs/groups/{groupId}                   // Group 상세 (cap: view_wbs)
POST   /api/phases/{phaseId}/wbs-groups            // Group 생성 (cap: manage_wbs)
PUT    /api/wbs/groups/{groupId}                   // Group 수정 (cap: manage_wbs)
DELETE /api/wbs/groups/{groupId}                   // Group 삭제 (cap: manage_wbs)

// ========== WBS Item ==========
GET    /api/wbs/groups/{groupId}/items             // Group별 Item 목록 (cap: view_wbs)
GET    /api/phases/{phaseId}/wbs-items             // Phase별 Item 목록 (cap: view_wbs)
GET    /api/projects/{projectId}/wbs-items         // Project 전체 Item (cap: view_wbs)
GET    /api/wbs/items/{itemId}                     // Item 상세 (cap: view_wbs)
POST   /api/wbs/groups/{groupId}/items             // Item 생성 (cap: manage_wbs)
PUT    /api/wbs/items/{itemId}                     // Item 수정 (cap: manage_wbs)
DELETE /api/wbs/items/{itemId}                     // Item 삭제 (cap: manage_wbs)

// ========== WBS Task ==========
GET    /api/wbs/items/{itemId}/tasks               // Item별 Task 목록 (cap: view_wbs)
GET    /api/wbs/groups/{groupId}/tasks             // Group별 Task 목록 (cap: view_wbs)
GET    /api/phases/{phaseId}/wbs-tasks             // Phase별 Task 목록 (cap: view_wbs)
GET    /api/projects/{projectId}/wbs-tasks         // Project 전체 Task (cap: view_wbs)
GET    /api/wbs/tasks/{taskId}                     // Task 상세 (cap: view_wbs)
POST   /api/wbs/items/{itemId}/tasks               // Task 생성 (cap: manage_wbs)
PUT    /api/wbs/tasks/{taskId}                     // Task 수정 (cap: manage_wbs)
DELETE /api/wbs/tasks/{taskId}                     // Task 삭제 (cap: manage_wbs)
```

### 5.9 진행률 갱신 API -- 서버 트랜잭션

```
PATCH /api/wbs/tasks/{taskId}/progress
PATCH /api/wbs/items/{itemId}/progress
```

```typescript
interface UpdateProgressRequest {
  progress: number;          // 0~100
  actualStartDate?: string;  // ISO date -- auto-set if first progress > 0
  actualEndDate?: string;    // ISO date -- required when progress = 100
}

interface UpdateProgressResponse {
  /** Updated entity */
  entity: WbsTaskDto | WbsItemDto;

  /** Parent chain recalculation results */
  parentUpdates: {
    entityType: "ITEM" | "GROUP" | "PHASE";
    entityId: string;
    previousProgress: number;
    newProgress: number;
  }[];

  /** Auto status transitions triggered */
  statusTransitions: {
    entityType: "TASK" | "ITEM" | "GROUP" | "PHASE";
    entityId: string;
    previousStatus: WbsStatus;
    newStatus: WbsStatus;
    reason: string;    // "progress reached 100%" or "first child started"
  }[];
}
```

**진행률 갱신 에러 계약**:

```typescript
type ProgressUpdateErrorCode =
  | "INVALID_PROGRESS"          // progress < 0 or > 100
  | "MISSING_ACTUAL_END_DATE"   // progress=100 but actualEndDate not set
  | "ENTITY_CANCELLED"          // entity is CANCELLED, cannot update
  | "ENTITY_ON_HOLD"            // entity is ON_HOLD, must resume first
  | "PART_ACCESS_DENIED"        // user not assigned to this item's Part
  | "CONCURRENT_MODIFICATION";  // optimistic lock conflict
```

| 에러 코드 | HTTP | 원인 | 프론트 대응 |
|-----------|------|------|-----------|
| `INVALID_PROGRESS` | 400 | 유효하지 않은 진행률 값 | "0~100 사이의 값을 입력하세요" |
| `MISSING_ACTUAL_END_DATE` | 400 | 100% 완료인데 실적종료일 미입력 | "실적 종료일을 입력하세요" 안내 |
| `ENTITY_CANCELLED` | 409 | 취소된 항목 | "취소된 항목은 수정할 수 없습니다" |
| `ENTITY_ON_HOLD` | 409 | 보류 상태 | "보류 해제 후 진행률을 갱신하세요" |
| `PART_ACCESS_DENIED` | 403 | 파트 권한 없음 | "접근 권한이 없습니다" |
| `CONCURRENT_MODIFICATION` | 409 | 동시 수정 | 새로고침 후 재시도 안내 |

### 5.10 Critical Path API

```
GET /api/projects/{projectId}/wbs/critical-path
```

```typescript
interface CriticalPathResponse {
  /** Ordered list of critical path node IDs */
  criticalPath: string[];
  /** Per-node float data */
  itemsWithFloat: Record<string, ItemFloatData>;
  /** Project total duration in days */
  projectDuration: number;
  calculatedAt: string;
}

interface ItemFloatData {
  name: string;
  duration: number;          // days
  earlyStart: number;       // day offset
  earlyFinish: number;
  lateStart: number;
  lateFinish: number;
  totalFloat: number;       // days of flexibility
  freeFloat: number;
  isCritical: boolean;      // totalFloat === 0
}
```

### 5.11 Snapshot API

```
POST   /api/wbs/snapshots                          // Snapshot 생성 (cap: manage_wbs_snapshot)
GET    /api/wbs/snapshots?phaseId={phaseId}        // Phase별 Snapshot 목록
GET    /api/wbs/snapshots?projectId={projectId}    // Project별 Snapshot 목록
GET    /api/wbs/snapshots/{snapshotId}             // Snapshot 상세
POST   /api/wbs/snapshots/{snapshotId}/restore     // Snapshot 복원 (cap: manage_wbs_snapshot)
DELETE /api/wbs/snapshots/{snapshotId}             // Snapshot 삭제 (cap: manage_wbs_snapshot)
```

```typescript
interface CreateSnapshotRequest {
  phaseId: string;
  snapshotName?: string;       // default: "Snapshot_yyyyMMdd_HHmmss"
  description?: string;
  snapshotType?: "PRE_TEMPLATE" | "BASELINE" | "MILESTONE" | "MANUAL";
}

interface WbsSnapshotDto {
  id: string;
  phaseId: string;
  projectId: string;
  phaseName: string;
  projectName: string;
  snapshotName: string;
  description?: string;
  snapshotType: string;
  groupCount: number;
  itemCount: number;
  taskCount: number;
  dependencyCount: number;
  status: "ACTIVE" | "RESTORED" | "DELETED";
  createdAt: string;
  createdBy: string;
}
```

### 5.12 WBS Scope Echo

```typescript
/**
 * All WBS API responses include scope echo
 * v1.1: Part 필드 추가 + scopeReason 세분화
 */
interface WbsScopeEcho {
  projectId: string;
  /** Phase filter applied (empty = all) */
  appliedPhaseIds: string[];
  /** Phase names (for UI) */
  appliedPhaseNames: string[];
  /** Assignee filter applied */
  appliedAssigneeIds: string[];

  // v1.1: Part scope fields
  /** Part filter applied (empty = all) */
  appliedPartIds: string[];
  /** Part names (for UI) */
  appliedPartNames: string[];

  /**
   * Scope restriction reason -- v1.1: refined
   *
   * - full_access: no scope restriction (PM, PMO, ADMIN)
   * - role_restricted_assignee: DEV -- assigneeId forced to currentUserId
   * - role_restricted_part: DevReader -- partId forced to user's Part
   * - explicit_filter: user explicitly set assigneeId/partId filter
   */
  scopeReason:
    | "full_access"
    | "role_restricted_assignee"
    | "role_restricted_part"
    | "explicit_filter";
}
```

> **v1.1 변경**: `role_restricted`를 `role_restricted_assignee`(DEV)와 `role_restricted_part`(DevReader)로 세분화.
> UI에서 scopeReason별로 다른 배너를 표시한다:
>
> - `role_restricted_assignee`: "내 담당 항목만 표시됩니다"
> - `role_restricted_part`: "내 파트({partName}) 범위만 표시됩니다"
> - `explicit_filter`: 필터 해제 링크 표시

> **보안 스코프 축 정의** (v1.1):
>
> | 계층 | 축 | 강제 여부 | 설명 |
> | ---- | ---- | --------- | ---- |
> | **보안 스코프** | `projectId` + (`assigneeId` \| `partId`) | 서버 강제 | DEV=assigneeId, DevReader=partId |
> | **탐색 스코프** | `phaseId`, `trackType`, `status` 등 | 사용자 선택 | 필터 바에서 UI 제어 |

### 5.13 WBS Dependency API

```
GET    /api/projects/{projectId}/wbs/dependencies  // Project 전체 의존관계 (cap: view_wbs)
POST   /api/projects/{projectId}/wbs/dependencies  // 의존관계 생성 (cap: manage_wbs)
DELETE /api/wbs/dependencies/{dependencyId}        // 의존관계 삭제 (cap: manage_wbs)
```

```typescript
interface CreateDependencyRequest {
  predecessorType: "GROUP" | "ITEM" | "TASK";
  predecessorId: string;
  successorType: "GROUP" | "ITEM" | "TASK";
  successorId: string;
  dependencyType?: "FS" | "SS" | "FF" | "SF";  // default: FS
  lagDays?: number;                              // default: 0
}
```

### 5.14 WBS-Story Link API (v1.1)

> **v1.1 추가**: `WbsItem.linkedStoryIds`를 배열 필드가 아닌 **1급 연결 테이블**로 승격.
> 이를 통해 FK 정합성, 검색 성능, 이력 추적, 스냅샷 복원 시 연결 정보 보존이 가능해진다.

**DB 스키마**:

```sql
-- project.wbs_item_story_links
CREATE TABLE project.wbs_item_story_links (
  id            VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  wbs_item_id   VARCHAR(36) NOT NULL REFERENCES project.wbs_items(id) ON DELETE CASCADE,
  story_id      VARCHAR(36) NOT NULL REFERENCES task.user_stories(id) ON DELETE CASCADE,
  link_type     VARCHAR(20) NOT NULL DEFAULT 'RELATED',  -- RELATED | PRIMARY
  is_primary    BOOLEAN NOT NULL DEFAULT false,
  created_by    VARCHAR(36) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(wbs_item_id, story_id)
);
```

**API**:

```text
GET    /api/wbs/items/{itemId}/links                // Item의 연결된 Story 목록 (cap: view_wbs)
POST   /api/wbs/items/{itemId}/links                // Story 연결 추가 (cap: manage_wbs)
DELETE /api/wbs/items/{itemId}/links/{storyId}      // Story 연결 해제 (cap: manage_wbs)
```

```typescript
interface CreateWbsStoryLinkRequest {
  storyId: string;
  linkType?: "RELATED" | "PRIMARY";   // default: RELATED
  isPrimary?: boolean;                 // default: false
}

interface WbsStoryLinkDto {
  id: string;
  wbsItemId: string;
  storyId: string;
  storyTitle: string;
  storyStatus: string;
  sprintName?: string;
  linkType: "RELATED" | "PRIMARY";
  isPrimary: boolean;
  createdBy: string;
  createdAt: string;
}
```

> **WbsGroup.linkedEpicId**와 **WbsTask.linkedTaskId**는 단일 FK이므로 기존 방식 유지.
> WbsItem-Story만 N:M 관계이므로 연결 테이블로 승격한다.

---

## 6. 컴포넌트 분해

### 6.1 폴더 구조

```
features/
  wbs/
    pages/
      WbsPage.tsx                      <- WBS main (ViewType switch, Preset routing)

    components/
      // View switching
      WbsViewSwitch.tsx                <- Tree|Gantt|Table toggle button group

      // Tree view
      WbsTree.tsx                      <- Main tree container (Phase -> Group -> Item -> Task)
      PhaseTreeRow.tsx                 <- Phase row (expand/collapse, trackType badge)
      WbsGroupRow.tsx                  <- Group row (progress bar, SV indicator)
      WbsItemRow.tsx                   <- Item row (assignee, dates, progress)
      WbsTaskRow.tsx                   <- Task row (progress, linked task badge)
      SearchMatchHighlight.tsx         <- SEARCH mode match highlight

      // Gantt view
      GanttChart.tsx                   <- Gantt chart container
      GanttTimeline.tsx                <- Timeline header (month/week scale)
      GanttBar.tsx                     <- Individual bar (planned + actual overlay)
      GanttCriticalPath.tsx            <- Critical path highlight overlay
      GanttDependencyArrow.tsx         <- FS/SS/FF/SF dependency arrows
      GanttTooltip.tsx                 <- Bar hover tooltip (dates, progress, SV)

      // Table view
      WbsTable.tsx                     <- Flat table (sortable columns)
      WbsTableRow.tsx                  <- Table row (code, name, status, dates, progress)

      // Toolbar & Filter
      WbsToolbar.tsx                   <- Top toolbar (view switch, create CTA, search)
      WbsFilters.tsx                   <- Filter bar (FilterSpec based)
      WbsKpiRow.tsx                    <- Top KPI cards
      QueryModeBanner.tsx              <- "N matched / total M" banner

      // Right Panel
      WbsContextPanel.tsx              <- panelMode: "context" (Group/Item summary)
      WbsDetailPanel.tsx               <- panelMode: "detail" (Item detail)
      GanttDetailPanel.tsx             <- panelMode: "gantt-detail" (Gantt bar click)
      DeviationPanel.tsx               <- panelMode: "deviation" (plan vs actual table)
      BacklogLinkPanel.tsx             <- panelMode: "backlog-link" (linked backlog items)
      WbsRightPanel.tsx                <- panelMode switch renderer
      ScopeRestrictionBanner.tsx       <- Part scope restriction notice

      // Progress
      ProgressBar.tsx                  <- Progress bar (planned vs actual dual bar)
      ProgressUpdateDialog.tsx         <- Progress update slider/input dialog
      ScheduleVarianceBadge.tsx        <- SV indicator badge (+/- days)
      CostVarianceBadge.tsx            <- CV indicator badge (+/- hours)

      // Status
      WbsStatusBadge.tsx               <- WBS status badge (5 values)
      TrackTypeBadge.tsx               <- AI/SI/COMMON track badge
      OverdueBadge.tsx                 <- Overdue warning badge

      // Modal & Dialog
      WbsGroupCreateModal.tsx          <- Group create/edit modal
      WbsItemCreateModal.tsx           <- Item create/edit modal
      WbsTaskCreateModal.tsx           <- Task create/edit modal
      SnapshotCreateDialog.tsx         <- Snapshot create dialog
      SnapshotListDialog.tsx           <- Snapshot list + restore dialog
      DependencyCreateDialog.tsx       <- Dependency create dialog

    api/
      wbsApi.ts                        <- WBS API calls (existing)
      wbsStatsApi.ts                   <- WBS Stats API calls
      wbsCriticalPathApi.ts            <- Critical Path API calls

    hooks/
      useWbsList.ts                    <- WBS list TanStack Query (queryMode included)
      useWbsStats.ts                   <- Stats Query
      useWbsDetail.ts                  <- Item detail Query
      useWbsGroupsByPhase.ts           <- Phase Groups lazy-load Query
      useWbsItemsByGroup.ts            <- Group Items lazy-load Query
      useWbsTasksByItem.ts             <- Item Tasks lazy-load Query
      useWbsCriticalPath.ts            <- Critical Path Query
      useWbsSnapshots.ts               <- Snapshot list/create/restore (existing)
      useWbsPanelMode.ts               <- Right Panel mode state
      useWbsTreeExpansion.ts           <- Tree expand/collapse state
      useWbsQueryMode.ts               <- queryMode determination + SEARCH state
      useWbsViewType.ts                <- Tree/Gantt/Table view type state
      useProgressUpdate.ts             <- Progress update mutation
```

### 6.2 WbsPage.tsx ViewMode/ViewType 분기

```typescript
function WbsPage() {
  const { viewMode } = useAccessContext();
  const { panelMode, setPanelMode } = useWbsPanelMode(viewMode);
  const { viewType, setViewType } = useWbsViewType(viewMode);
  const { expandedNodes, toggleNode, setExpandedNodes } = useWbsTreeExpansion();
  const { queryMode, matchedNodes } = useWbsQueryMode();
  const maxDepth = getMaxDepthForPreset(viewMode);

  // SEARCH mode: auto-expand matched paths
  useEffect(() => {
    if (queryMode === "SEARCH" && data?.expandedPathIds) {
      setExpandedNodes(new Set(data.expandedPathIds));
    }
  }, [queryMode, data?.expandedPathIds]);

  // panelMode-based Right Panel component (v1.1: 4 base modes)
  const { analysisTab, setAnalysisTab } = useWbsAnalysisTab();
  const rightPanelContent = useMemo(() => {
    switch (panelMode) {
      case "none":      return undefined;
      case "context":   return <WbsContextPanel />;
      case "detail":    return <WbsDetailPanel />;
      case "analysis":  return <WbsAnalysisPanel activeTab={analysisTab} onTabChange={setAnalysisTab} />;
      default:          return undefined;
    }
  }, [panelMode, analysisTab]);

  // View type content
  const viewContent = useMemo(() => {
    switch (viewType) {
      case "TREE":
        return (
          <WbsTree
            viewMode={viewMode}
            queryMode={queryMode}
            matchedNodes={matchedNodes}
            expandedNodes={expandedNodes}
            onToggle={toggleNode}
            maxDepth={maxDepth}
            onGroupSelect={(group) => {
              if (["PM_WORK", "PMO_CONTROL", "DEV_EXECUTION"].includes(viewMode)) {
                setPanelMode("context");
              }
            }}
            onItemSelect={(item) => {
              if (viewMode === "PM_WORK") setPanelMode("detail");
            }}
          />
        );
      case "GANTT":
        return (
          <GanttChart
            viewMode={viewMode}
            maxDepth={maxDepth}
            onBarClick={(entity) => setPanelMode("gantt-detail")}
          />
        );
      case "TABLE":
        return (
          <WbsTable
            viewMode={viewMode}
            queryMode={queryMode}
            matchedNodes={matchedNodes}
            onRowClick={(entity) => {
              if (["PM_WORK", "PMO_CONTROL"].includes(viewMode)) {
                setPanelMode("detail");
              }
            }}
          />
        );
    }
  }, [viewType, viewMode, queryMode, matchedNodes, expandedNodes, maxDepth]);

  return (
    <PageLayout
      header={<WbsToolbar viewMode={viewMode} viewType={viewType} onViewTypeChange={setViewType} />}
      rightPanel={rightPanelContent}
      rightPanelDefault={PRESET_POLICIES[viewMode].ui.defaultRightPanel}
    >
      {/* Scope restriction banner */}
      {data?.scope.scopeReason === "role_restricted" && (
        <ScopeRestrictionBanner />
      )}

      <WbsKpiRow viewMode={viewMode} />
      <WbsFilters
        viewMode={viewMode}
        filterSpec={wbsNode.filterSpec}
      />

      {/* SEARCH mode banner */}
      {queryMode === "SEARCH" && matchedNodes && (
        <QueryModeBanner
          matched={matchedNodes.totalMatched}
          total={matchedNodes.totalAll}
        />
      )}

      {viewContent}
    </PageLayout>
  );
}
```

### 6.3 WbsTree.tsx -- 트리 렌더링 전략

```typescript
interface WbsTreeProps {
  viewMode: ViewModePreset;
  queryMode: WbsQueryMode;
  matchedNodes?: WbsMatchedNodes;
  expandedNodes: Set<string>;
  onToggle: (nodeId: string) => void;
  maxDepth: number;
  onGroupSelect: (group: WbsGroup) => void;
  onItemSelect: (item: WbsItem) => void;
}

/**
 * Tree rendering strategy:
 * 1. TREE mode: filter is server API, tree is pure rendering, expand triggers lazy-load
 * 2. SEARCH mode: matched results included, auto-expand, non-matched dimmed
 * 3. Preset controls max visible depth
 */
function WbsTree(props: WbsTreeProps) {
  const isMatched = (nodeId: string) =>
    props.queryMode === "TREE"
    || props.matchedNodes?.groupIds.includes(nodeId)
    || props.matchedNodes?.itemIds.includes(nodeId)
    || props.matchedNodes?.taskIds.includes(nodeId);
  // ... rendering logic with dimming for non-matched
}

function getMaxDepthForPreset(viewMode: ViewModePreset): number {
  switch (viewMode) {
    case "EXEC_SUMMARY":
    case "CUSTOMER_APPROVAL":
      return 1;  // Phase only
    case "PMO_CONTROL":
      return 3;  // Phase + Group + Item
    case "DEV_EXECUTION":
    case "PM_WORK":
    default:
      return 4;  // Full tree (Phase + Group + Item + Task)
  }
}
```

### 6.4 GanttChart.tsx -- 간트 렌더링 전략

```typescript
interface GanttChartProps {
  viewMode: ViewModePreset;
  maxDepth: number;
  showCriticalPath?: boolean;
  onBarClick: (entity: WbsGroup | WbsItem | WbsTask) => void;
}

/**
 * Gantt rendering strategy:
 * 1. Timeline scale: auto-adjust (day/week/month) based on project duration
 * 2. Bars: dual-layer (planned = background, actual = foreground overlay)
 * 3. Critical path: highlight with bold red border when enabled
 * 4. Dependencies: FS/SS/FF/SF arrows between bars
 * 5. Today line: vertical red dashed line
 */
function GanttChart(props: GanttChartProps) {
  const { data: criticalPath } = useWbsCriticalPath(projectId);
  const { data: dependencies } = useWbsDependencies(projectId);

  // Timeline scale determination
  const timelineScale = useMemo(() => {
    const totalDays = diffDays(projectStart, projectEnd);
    if (totalDays <= 60) return "day";
    if (totalDays <= 180) return "week";
    return "month";
  }, [projectStart, projectEnd]);

  // Bar rendering with dual-layer
  const renderBar = (entity: WbsGroup | WbsItem | WbsTask) => (
    <GanttBar
      plannedStart={entity.plannedStartDate}
      plannedEnd={entity.plannedEndDate}
      actualStart={entity.actualStartDate}
      actualEnd={entity.actualEndDate}
      progress={entity.progress}
      isCritical={criticalPath?.criticalPath.includes(entity.id)}
      onClick={() => props.onBarClick(entity)}
    />
  );

  return (/* ... */);
}
```

---

## 7. AI Navigation 연동

### 7.1 virtualNode 우선 반환 정책

> AI는 가능한 경우 raw filter 대신 **virtualId를 우선 반환**한다.
> virtualId 기반 딥링크는 파라미터 오류 가능성이 낮고,
> 사용자에게 "의미있는 업무 개념"으로 안내된다.

```typescript
/**
 * AI virtualNode matching priority -- v1.1: flags 기반
 *
 * v1.0에서는 status=IN_PROGRESS/ON_HOLD로 overdue/delayed를 근사했으나,
 * v1.1에서는 flags(서버 평가 파생 조건)를 사용하여 정확한 매칭을 보장한다.
 */
const WBS_VIRTUAL_NODE_PRIORITY: { virtualId: string; matchFilter: Partial<WbsFilterSpec> }[] = [
  { virtualId: "wbs.overdue",       matchFilter: { flags: ["OVERDUE"] } },
  { virtualId: "wbs.delayed",       matchFilter: { flags: ["DELAYED"] } },
  { virtualId: "wbs.critical-path", matchFilter: { flags: ["CRITICAL"] } },
  { virtualId: "wbs.my-part",       matchFilter: { assigneeId: "{{currentUserId}}" } },
  { virtualId: "wbs.phase-summary", matchFilter: {} },                         // depth=1 hint
];

function resolveWbsNavigation(filter: WbsFilterSpec): AiWbsNavigation {
  // 1. virtualNode match attempt (priority)
  for (const vn of WBS_VIRTUAL_NODE_PRIORITY) {
    if (isSubsetMatch(vn.matchFilter, filter)) {
      return { targetNodeId: "wbs", virtualId: vn.virtualId, filter, reason: "..." };
    }
  }
  // 2. match failure -> raw filter return
  return { targetNodeId: "wbs", filter, reason: "..." };
}
```

### 7.2 AI 질문 -> 화면 이동 (FilterSpec + virtualId)

```typescript
/** AI navigation recommendation */
interface AiWbsNavigation {
  targetNodeId: "wbs";
  /** virtualNode preferred */
  virtualId?: string;
  /** FilterSpec-based filter object */
  filter: WbsFilterSpec;
  /** Specific entity direct navigation */
  entityId?: string;            // "WG-01" or "WI-03"
  /** Preferred view type */
  viewType?: WbsViewType;      // "GANTT" for critical path questions
  reason: string;
}
```

| 질문 | AI 반환 | virtualId? | viewType? | 설명 |
|------|--------|-----------|----------|------|
| "지연된 항목 보여줘" | `{ flags: ["DELAYED"] }` | `wbs.delayed` | TREE | flags 기반 서버 평가 |
| "기한 초과 항목은?" | `{ flags: ["OVERDUE"] }` | `wbs.overdue` | TREE | flags 기반 서버 평가 |
| "내 WBS 보여줘" | `{ assigneeId: "..." }` | `wbs.my-part` | TABLE | virtualId 우선 |
| "주경로 보여줘" | `{ flags: ["CRITICAL"] }` | `wbs.critical-path` | GANTT | Gantt로 전환 |
| "Phase 2 진행률" | `{ phaseId: "p2" }` | -- | TREE | raw filter |
| "AI 트랙 진행률" | `{ trackType: "AI" }` | -- | TREE | raw filter |
| "WI-03 상세" | `entityId: "WI-03"` | -- | TREE | 직접 이동 |
| "3월 마감 항목" | `{ dateRangeEnd: "2026-03-31" }` | -- | TABLE | raw filter |
| "간트 차트 보여줘" | `{}` | -- | GANTT | 뷰 전환 |
| "보류 항목 보여줘" | `{ status: "ON_HOLD" }` | -- | TREE | status 기반 (ON_HOLD는 lifecycle 상태) |

### 7.3 Context Panel AI 추천

```
-- 추천 액션 ----------------------------
! WI-03 모델 학습/튜닝 진행률 40%, 기한 8/15까지 22일
  -> [진행률 갱신]              cap: update_wbs_progress

! WG-01 요구사항 분석 SV: -7일 (7일 지연)
  -> [간트에서 확인]            viewType: GANTT + phaseId filter

! WI-02 TO-BE 설계 아직 NOT_STARTED, Phase 1 마감 5/30
  -> [담당자 확인]              targetNodeId: wbs, entityId: "WI-02"

i Phase 2 AI 모델 개발 진행률 65%, 계획 75%
  -> [백로그 연동 확인]         targetNodeId: backlog, filter: { phaseId: "p2" }

i 스냅샷이 14일 전 -- Baseline 갱신 권장
  -> [스냅샷 생성]              cap: manage_wbs_snapshot
```

---

## 8. 인터랙션 상세

### 8.1 트리 접기/펼치기

```
Phase 행 > click -> Group level expand (TREE: lazy-load / SEARCH: already loaded)
Group 행 > click -> Item level expand (TREE: lazy-load / SEARCH: already loaded)
Item 행 > click  -> Task level expand (TREE: lazy-load / SEARCH: already loaded)

* Preset controls max expansion depth (section 6.3 getMaxDepthForPreset)
* SEARCH mode: expandedPathIds based auto-expand, non-matched dimmed
```

### 8.2 Group/Item 행 클릭

```
Single click -> panelMode changes based on Right Panel content
  EXEC_SUMMARY / CUSTOMER_APPROVAL: no change
  PM_WORK / PMO_CONTROL / DEV_EXECUTION: Context Panel display

Double click (PM_WORK) -> Detail Panel display for selected Item
```

### 8.3 간트 바 클릭

```
Single click (PM_WORK / PMO_CONTROL):
  -> panelMode="gantt-detail" -> Gantt Detail Panel
  -> Displays: planned vs actual dates, progress, SV, CV, dependencies

Drag (PM_WORK, cap: manage_wbs):
  -> Planned end date adjustment
  -> PUT /api/wbs/items/:itemId { plannedEndDate: newDate }
  -> Server validates dependency constraints
```

### 8.4 인라인 CTA

```
PM_WORK Preset:
  [+ Group 추가] -> WbsGroupCreateModal (cap: manage_wbs)
  [+ Item 추가]  -> WbsItemCreateModal (cap: manage_wbs)
  [+ Task 추가]  -> WbsTaskCreateModal (cap: manage_wbs)
  [진행률 갱신]   -> ProgressUpdateDialog (cap: update_wbs_progress)
    -> Slider 0~100%
    -> actualStartDate auto-set on first progress > 0
    -> actualEndDate required when progress = 100
    -> Server: parent chain recalculation + status auto-transition

DEV_EXECUTION Preset:
  [진행률 갱신] -> ProgressUpdateDialog (cap: update_wbs_progress)
  * Group/Item/Task 생성 CTA는 표시되지 않음 (cap: manage_wbs 미부여)

PMO_CONTROL Preset:
  [편차 분석]  -> panelMode="deviation" -> DeviationPanel
  [스냅샷 생성] -> SnapshotCreateDialog (cap: manage_wbs_snapshot)
  [WBS Export] -> Export API call (cap: export_wbs)
```

### 8.5 KPI 카드 클릭 -> 필터 활성화

```typescript
/**
 * KPI card click -> filter activation mapping
 * v1.1: flags 기반으로 OVERDUE/DELAYED/CRITICAL 전환, ON_HOLD는 status로 유지
 */
const WBS_KPI_CARD_FILTER_MAP: Record<string, {
  filter: Partial<WbsFilterSpec>;
  virtualId?: string;
  queryMode: WbsQueryMode;
  viewType?: WbsViewType;
}> = {
  // Row 1: count cards -> TREE mode (no filter, full display)
  KPI_ITEMS:    { filter: {}, queryMode: "TREE" },
  KPI_PROGRESS: { filter: {}, queryMode: "TREE" },

  // Row 1: SV card -> deviation focus
  KPI_SV:       { filter: { flags: ["DELAYED"] }, virtualId: "wbs.delayed", queryMode: "SEARCH", viewType: "TABLE" },
  KPI_OVERDUE:  { filter: { flags: ["OVERDUE"] }, virtualId: "wbs.overdue", queryMode: "SEARCH" },

  // Row 2: operational cards
  KPI_CV:        { filter: {}, queryMode: "TREE", viewType: "TABLE" },
  KPI_CRITICAL:  { filter: { flags: ["CRITICAL"] }, virtualId: "wbs.critical-path", queryMode: "SEARCH", viewType: "GANTT" },
  KPI_ON_HOLD:   { filter: { status: "ON_HOLD" }, queryMode: "SEARCH" },  // ON_HOLD는 lifecycle status
  KPI_COMPLETION: { filter: { status: "COMPLETED" }, queryMode: "SEARCH" },
};
```

**인터랙션 흐름**:

```
1. KPI 카드 클릭
2. WBS_KPI_CARD_FILTER_MAP에서 filter 객체 조회
3. 현재 필터 바 상태에 merge (기존 필터 초기화 -> 새 필터 적용)
4. queryMode 전환 (TREE->SEARCH 시 매칭 배너 표시)
5. viewType 전환 (지정 시)
6. URL 업데이트 (section 2.3 serializeWbsFilter)
7. 동일 카드 재클릭 시 필터 해제 (toggle)
```

### 8.6 뷰 전환

```text
[Tree|Gantt|Table] 토글 버튼:
  -> viewType state 변경
  -> URL 파라미터 ?viewType=GANTT 등으로 업데이트
  -> 같은 필터 유지, 렌더링만 전환
  -> Gantt 전환 시 dependencies + critical path 데이터 추가 로드

v1.1: SEARCH + Gantt 충돌 정책:
  -> SEARCH 모드에서 Gantt 전환 시:
     1) queryMode를 자동으로 TREE로 복원
     2) "검색 결과는 Table/Tree 뷰에서 확인하세요" 안내 배너 표시
     3) 필터 바의 flags/assigneeId 등 SEARCH 필터는 유지하되 비활성 표시
     4) Tree/Table로 돌아오면 SEARCH 모드 + 기존 필터 자동 복원
  -> 이유: Gantt는 "트리 완결"을 요구하며, 부분 매칭 결과만으로
     의존관계 선/Critical Path를 정확히 렌더링하기 어려움
  -> 점선 처리 등 고급 UX는 v2.0에서 검토
```

### 8.7 데이터 새로고침

| 항목 | API 경로 | 주기 |
| ------ | --------- | ------ |
| WBS 트리 (TREE 모드) | `/wbs/tree` | 페이지 진입 시 + 필터 변경 시 (ETag / 2min) |
| WBS 검색 (SEARCH 모드) | `/wbs/search` | 필터 변경 시 (캐시 없음) |
| WBS 덤프 (초기 로딩) | `/wbs/dump` | 페이지 최초 진입 시 (ETag / 5min) |
| Group/Item/Task (lazy-load) | CRUD API | TREE: 트리 노드 확장 시 / SEARCH: 필터 변경 시 |
| 통계 | `/wbs/stats` | 페이지 진입 시 (캐시 5min) |
| Critical Path | `/wbs/critical-path` | Gantt 뷰 진입 시 (캐시 10min) |
| Dependencies | `/wbs/dependencies` | Gantt 뷰 진입 시 (캐시 10min) |
| Snapshot 목록 | `/wbs/snapshots` | 스냅샷 다이얼로그 열 때 |
| WBS-Story Links | `/wbs/items/:id/links` | Detail Panel 열 때 |

### 8.8 동시 편집 충돌 대응

```text
Optimistic Locking:
  +- All PUT/PATCH requests include If-Match: {version} header
  +- Server compares with current version
  +- Mismatch -> 409 Conflict + current data returned
  +- Frontend shows "another user modified this item" + merge option

Scope:
  +- WbsGroup/WbsItem/WbsTask PUT -> optimistic lock applied
  +- Progress update (PATCH) -> CONCURRENT_MODIFICATION error
  +- Server-side parent chain recalculation -> eventual consistency
```

---

## 9. 반응형 대응

| 너비 | 트리/테이블 | 간트 | Right Panel | 필터 |
|------|-----------|------|------------|------|
| >=1440px | 전체 4계층 + 일정/공수 인라인 표시 | 전체 간트 (월 단위) | Right Panel (30%) | 인라인 |
| 1280px | 전체 4계층 (일정 축약) | 간트 (주 단위 스크롤) | Drawer (toggle) | 인라인 |
| <=1024px | Phase + Group + Item (Task 숨김) | 간트 (주 단위 스크롤, 축약) | Drawer (overlay) | 접이식 |
| <=768px | Phase + Group (Item 통합 표시) | 간트 비활성 (Table로 전환) | Full Modal | 접이식 |

---

## 10. 깨지기 쉬운 5곳 체크리스트

| # | 위험 지점 | 해결책 | 검증 방법 |
|---|---------|--------|---------|
| 1 | **가중 진행률 재계산 정합성 + edge cases** | 진행률 갱신 시 서버가 parent chain 전체를 단일 트랜잭션으로 재계산. v1.1: **자식 없는 노드는 수동 진행률 허용**, **sum(weight)=0이면 progress=0 고정 + warning 반환**. SV/CV/plannedProgress는 **서버만 계산**(프론트는 표시만) | Task 진행률 변경 -> 상위 Item/Group/Phase 진행률이 가중평균으로 정확히 재계산되는지 확인. **weight=0인 노드가 있을 때 division by zero 없는지 확인**. **자식 0개 Item에 수동 progress PATCH -> 정상 동작 확인**. 서버 SV와 프론트 표시 SV가 동일한지 확인 |
| 2 | **간트 바 렌더링과 planned/actual 불일치** | planned/actual 날짜가 null인 경우 간트 바를 렌더링하지 않되, 트리에서는 표시. NOT_STARTED 항목은 planned 구간만 점선으로 표시 | plannedStartDate=null인 Item이 간트에서 깨지지 않는지 확인. actualEndDate만 있고 actualStartDate가 null인 케이스 확인 |
| 3 | **flags(OVERDUE/DELAYED/CRITICAL) 서버 평가 정합성** | v1.1: flags는 서버가 날짜/SV/DAG 기반으로 평가. **OVERDUE**: plannedEndDate < today AND status NOT IN (COMPLETED, CANCELLED). **DELAYED**: SV < 0. **CRITICAL**: totalFloat === 0. 서버와 프론트의 timezone이 동일해야 함 | flags=OVERDUE 필터 시 반환 항목이 실제 plannedEndDate < today인지 전수 확인. flags=DELAYED 시 SV < 0 확인. flags=CRITICAL 시 Critical Path API의 criticalPath 배열과 일치하는지 확인 |
| 4 | **Critical Path 계산 시 순환 의존성** | 의존관계 생성 시 서버가 DAG(Directed Acyclic Graph) 검증. 순환 감지 시 400 반환. 프론트는 "순환 의존성이 감지되었습니다" 안내 | A->B->C->A 순환 의존관계 생성 시도 -> 서버 400 반환 확인. 의존관계 삭제 후 Critical Path 재계산 확인 |
| 5 | **SEARCH 모드 + 간트 뷰 충돌** | v1.1: SEARCH 모드에서 Gantt 전환 시 **자동으로 TREE 모드로 복원** + "검색 결과는 Table/Tree 뷰에서 확인하세요" 안내 배너 표시. Tree/Table 복귀 시 기존 SEARCH 필터 자동 복원 | SEARCH 필터 활성 상태에서 Gantt 전환 -> TREE 모드 복원 + 배너 표시 확인. Tree로 돌아오면 SEARCH 필터 복원 확인 |
| 6 | **API 경로 분리(tree/search/dump) 시 캐시 키 충돌** | v1.1: 3개 경로 분리로 의미 충돌은 해소. 단, `/wbs/tree`와 `/wbs/dump`는 **phaseId 필터 유무에 따라 캐시 키가 달라야** 함. TanStack Query의 queryKey에 경로+필터 전체를 포함 | 동일 phaseId로 tree/dump 연속 호출 시 캐시 히트 확인. phaseId 변경 시 캐시 무효화 확인. dump 응답의 derivedFlags가 tree 응답의 entity 필드와 일치하는지 확인 |
| 7 | **ScopeEcho 보안 경계와 FilterSpec의 미묘한 불일치** | v1.1: DEV는 assigneeId 강제, DevReader는 partId 강제. ScopeEcho에 appliedPartIds/appliedPartNames 추가. scopeReason을 role_restricted_assignee/role_restricted_part로 세분화 | DEV가 phaseId를 변경해도 assigneeId 강제가 유지되는지 확인. DevReader가 다른 Part의 데이터를 볼 수 없는지 확인. scopeReason이 정확히 반환되는지 확인 |

---

## 11. Capability 매핑 총괄

| Capability | 행위 | 대표 역할 |
|-----------|------|---------|
| `view_wbs` | WBS 조회, 트리/간트/테이블 탐색 | ALL (역할별 범위 제한) |
| `manage_wbs` | WbsGroup/WbsItem/WbsTask 생성/편집/삭제, 의존관계 관리 | PM |
| `update_wbs_progress` | **진행률 갱신** (manage_wbs와 분리) | PM, DEV, DevReader |
| `manage_wbs_snapshot` | 스냅샷 생성/복원/삭제 | PM, PMO |
| `export_wbs` | WBS Export (Excel/PDF) | PMO |

> **DEV에게 진행률만 열기**: `update_wbs_progress`만 부여하면
> WBS 구조는 PM이 잠그고 **진행률만 개발자가 갱신**할 수 있다.
> 이는 일정 관리의 "계획은 PM, 실적은 DEV" 원칙을 구현한다.

---

## 12. DoD (본 화면 완료 기준)

- [ ] `/wbs` 목록에서 Preset별 트리 깊이 분기 동작
- [ ] 3-View 전환 (Tree/Gantt/Table) 동작 + URL 파라미터 반영
- [ ] FilterSpec 기반 다차원 필터 (phaseId/partId/wbsGroupId/status/assigneeId/progressMin/progressMax/dateRangeStart/dateRangeEnd/trackType/q/**flags**) 동작
- [ ] **v1.1 flags 파생 조건**: OVERDUE/DELAYED/CRITICAL flags 서버 평가 + 필터 바 + URL 직렬화(CSV)
- [ ] **queryMode TREE/SEARCH 분기**: SEARCH 시 matchedNodes + expandedPathIds 기반 자동 확장 + 매칭 배너
- [ ] KPI Row: WBS 건수, 전체 진행률, SV, CV, 기한초과, Critical Path, ON_HOLD, 완료율 표시
- [ ] **KPI 카드 클릭 -> 필터 활성화**: WBS_KPI_CARD_FILTER_MAP 기반 toggle + queryMode/viewType 전환
- [ ] 4계층 트리: Phase -> WbsGroup -> WbsItem -> WbsTask 확장/접기 동작
- [ ] WbsGroup/WbsItem/WbsTask lazy-load 동작 (TREE 모드)
- [ ] panelMode 기반 Right Panel 분기 (none/context/detail/analysis) + analysisTab(deviation/backlog-link/gantt-detail)
- [ ] **계획 vs 실적 이중 표시**: plannedStartDate/plannedEndDate vs actualStartDate/actualEndDate
- [ ] **가중 진행률 자동 계산**: weight 기반 calculateWeightedProgress parent chain 재계산
- [ ] **SV(Schedule Variance) 계산**: 계획진행률 vs 실적진행률 편차 (일 단위)
- [ ] **CV(Cost Variance) 계산**: estimatedHours vs actualHours 편차
- [ ] **간트 차트**: GanttBar(dual-layer planned/actual), GanttTimeline(day/week/month scale), GanttDependencyArrow(FS/SS/FF/SF)
- [ ] **Critical Path 표시**: 주경로 하이라이트 + Critical Path Items 목록
- [ ] **의존관계 관리**: 생성/삭제 + 순환 의존성 서버 검증
- [ ] **진행률 갱신 서버 트랜잭션**: Task/Item progress 변경 -> parent chain 재계산 + 상태 자동 전이 원자성
- [ ] **진행률 갱신 에러 계약**: 6종 에러 코드별 HTTP 상태 + 프론트 대응
- [ ] WbsGroup 생성/편집/삭제 (cap: `manage_wbs`)
- [ ] WbsItem 생성/편집/삭제 (cap: `manage_wbs`)
- [ ] WbsTask 생성/편집/삭제 (cap: `manage_wbs`)
- [ ] **진행률 갱신** (cap: `update_wbs_progress`) -- manage_wbs와 분리
- [ ] PM_WORK 인라인 CTA (+Group, +Item, +Task, 진행률 갱신)
- [ ] **DEV_EXECUTION: 진행률 갱신만 표시** (cap: `update_wbs_progress`)
- [ ] Table View: 플랫 리스트 + 컬럼 정렬 + 필터 최적화
- [ ] **PMO_CONTROL 편차 분석**: DeviationPanel (Phase/Group별 계획 vs 실적 테이블)
- [ ] **백로그 연결**: BacklogLinkPanel (linkedEpicId, linkedTaskId) + **WBS-Story Link API (1급 연결 테이블)**
- [ ] **스냅샷 관리**: 생성/목록/상세/복원/삭제 (cap: `manage_wbs_snapshot`)
- [ ] **WBS Export**: Excel/PDF 내보내기 (cap: `export_wbs`)
- [ ] **AI/SI 트랙 구분**: Phase.trackType 기반 트랙별 진행률 KPI
- [ ] Scope 서버 강제: DEV=assigneeId, DevReader=partId 범위 제한 + scope echo 응답 (appliedPartIds/Names 포함)
- [ ] ScopeRestrictionBanner: role_restricted_assignee/role_restricted_part별 다른 안내 메시지
- [ ] EXEC_SUMMARY: Phase 레벨 진행률 요약 읽기 전용
- [ ] CUSTOMER_APPROVAL: Phase 레벨 요약 읽기 전용
- [ ] **virtualNode 우선 반환**: overdue/critical-path/delayed/my-part/phase-summary 5개 virtualId AI 우선
- [ ] **Preset별 do intent 라우팅** (WBS_DO_INTENT_ROUTING)
- [ ] AI 추천 액션: FilterSpec + virtualId 딥링크 + 지연/기한초과/ON_HOLD 알림
- [ ] **동시 편집 충돌**: 낙관적 잠금(If-Match + version) + 409 병합 안내
- [ ] **FilterSpec URL 직렬화**: serialize/deserialize 왕복 보장, enum 화이트리스트 검증, number 범위 검증, **flags CSV 직렬화**, 미지 키 silent drop
- [ ] 반응형 레이아웃 (>=1440 / 1280 / <=1024 / <=768)
- [ ] 간트 뷰 반응형: <=768px에서 Table로 폴백
- [ ] **v1.1 API 경로 분리**: `/wbs/tree`(TREE) + `/wbs/search`(SEARCH) + `/wbs/dump`(초기 로딩) 3개 경로
- [ ] **v1.1 SEARCH+Gantt 충돌 정책**: SEARCH 모드에서 Gantt 전환 시 자동 TREE 복원 + 안내 배너
- [ ] **v1.1 진행률 edge cases**: 자식 없는 노드 수동 progress + weight=0 처리 + 서버 전용 SV/CV 계산
- [ ] **v1.1 신뢰도 3-tuple 표준화**: completeness={overall, breakdown?} + warnings={code, message, severity}[]
- [ ] **v1.1 WBS-Story Link 테이블**: wbs_item_story_links CRUD API + Detail Panel 연동

---

## 부록 A. 기존 화면 vs 개선 화면 비교

| 항목 | 기존 (엑셀/MS Project) | 개선 (본 설계) |
|------|---------------------|-------------|
| **저장 형식** | 엑셀 파일 / 로컬 mpp | DB 엔티티 (R2DBC, FK 기반 4계층) |
| **구조** | 플랫 행 + 들여쓰기 | **4계층 트리** (Phase -> Group -> Item -> Task) |
| **진행률** | 수동 입력 | **가중 자동 계산** (weight 기반) + 서버 트랜잭션 |
| **계획 vs 실적** | 별도 시트/컬럼 | **이중 날짜 필드** (planned/actual) + SV/CV 자동 산출 |
| **간트 차트** | MS Project 전용 | **웹 간트** (dual-layer bar + critical path + dependencies) |
| **주경로** | MS Project 전용 | **서버 기반 Critical Path** (DAG + float 계산) |
| **트랙 구분** | 색상 레이블 | **Phase.trackType** (AI/SI/COMMON) + 트랙별 KPI |
| **스냅샷/이력** | 날짜별 파일 저장 | **DB Snapshot** (생성/복원/비교) |
| **백로그 연결** | 수동 메모 | **ID 기반 Link** (linkedEpicId, linkedStoryIds, linkedTaskId) |
| **권한** | 파일 접근 권한 | **5개 Capability** (진행률 갱신 분리) |
| **AI 연동** | 없음 | **virtualNode 딥링크** + Preset별 AI 라우팅 |
| **편차 분석** | 수동 계산 | **자동 SV/CV** + PMO 편차 분석 패널 |

---

## 부록 B. DB 엔티티 매핑

| 화면 엔티티 | DB 테이블 | R2DBC Entity | 스키마 |
|-----------|---------|-------------|--------|
| Phase | `project.phases` | `R2dbcPhase` | project |
| WbsGroup | `project.wbs_groups` | `R2dbcWbsGroup` | project |
| WbsItem | `project.wbs_items` | `R2dbcWbsItem` | project |
| WbsTask | `project.wbs_tasks` | `R2dbcWbsTask` | project |
| WbsDependency | `project.wbs_dependencies` | `R2dbcWbsDependency` | project |
| WbsSnapshot | `project.wbs_snapshots` | `R2dbcWbsSnapshot` | project |
| WbsGroupSnapshot | `project.wbs_groups_snapshot` | `R2dbcWbsGroupSnapshot` | project |
| WbsItemSnapshot | `project.wbs_items_snapshot` | `R2dbcWbsItemSnapshot` | project |
| WbsTaskSnapshot | `project.wbs_tasks_snapshot` | `R2dbcWbsTaskSnapshot` | project |
| WbsItemStoryLink | `project.wbs_item_story_links` | `R2dbcWbsItemStoryLink` | project |

**핵심 필드 매핑**:

| 화면 필드 | DB 컬럼 | 타입 | 설명 |
|---------|--------|------|------|
| code | `code` | VARCHAR | WBS 코드 (e.g., "1.2.3.1") |
| progress | `progress` | INTEGER | 0~100 진행률 |
| weight | `weight` | INTEGER | 가중치 (default: 100) |
| orderNum | `order_num` | INTEGER | 정렬 순서 |
| plannedStartDate | `planned_start_date` | DATE | 계획 시작일 |
| plannedEndDate | `planned_end_date` | DATE | 계획 종료일 |
| actualStartDate | `actual_start_date` | DATE | 실적 시작일 |
| actualEndDate | `actual_end_date` | DATE | 실적 종료일 |
| estimatedHours | `estimated_hours` | INTEGER | 추정 공수 (시간) |
| actualHours | `actual_hours` | INTEGER | 실적 공수 (시간) |
| assigneeId | `assignee_id` | VARCHAR | 담당자 FK |
| linkedEpicId | `linked_epic_id` | VARCHAR | WbsGroup->Epic 연결 |
| linkedTaskId | `linked_task_id` | VARCHAR | WbsTask->Task 연결 |
| trackType | `track_type` | VARCHAR | Phase.trackType (AI/SI/COMMON) |

---

## 부록 C. 변경이력

| 버전 | 날짜 | 변경 내용 |
|------|------|---------|
| v1.0 | 2026-02-08 | 초안 작성 -- 4계층 트리 구조(Phase->WbsGroup->WbsItem->WbsTask), 3-View(Tree/Gantt/Table), FilterSpec(11키), Preset별 분기(EXEC_SUMMARY/PMO_CONTROL/PM_WORK/DEV_EXECUTION/CUSTOMER_APPROVAL), 계획 vs 실적 이중 추적, 가중 진행률(weight 기반 calculateWeightedProgress), SV/CV 자동 산출, Critical Path(DAG + float), AI/SI 트랙 구분(Phase.trackType), 스냅샷(생성/복원), 백로그 연결(linkedEpicId/linkedStoryIds/linkedTaskId), Capability 5개(view/manage/progress/snapshot/export), virtualNode 5개, AI Navigation(virtualNode 우선 + Preset별 do intent routing), 컴포넌트 분해(37개), API 명세(CRUD + full-tree + stats + critical-path + snapshot + dependency + progress update), 진행률 갱신 에러 계약(6종), KPI 카드 클릭 -> 필터 활성화, 동시 편집 충돌(낙관적 잠금), FilterSpec URL 직렬화(왕복 보장), 반응형(4단계), 깨지기 쉬운 5곳 체크리스트 |
| v1.1 | 2026-02-08 | 백로그 설계 대비 일관성 리뷰 반영 -- **(1) flags 파생 조건 분리**: FilterSpec에 `flags?: ("OVERDUE"\|"DELAYED"\|"CRITICAL")[]` 추가, status(lifecycle)와 derived condition 분리, virtualNode를 flags 기반으로 전환(wbs.overdue/delayed/critical-path), URL CSV 직렬화 **(2) API 경로 3분리**: `/wbs/tree`(TREE 모드) + `/wbs/search`(SEARCH 모드) + `/wbs/dump`(초기 로딩) **(3) panelMode 4-base 통합**: none/context/detail/analysis + analysisTab(deviation/backlog-link/gantt-detail), Backlog 화면과 동일 패턴 **(4) 진행률 edge cases 정의**: 자식 없는 노드 수동 progress 허용, sum(weight)=0 시 progress=0 고정 + warning, SV/CV/plannedProgress 서버 전용 계산 **(5) ScopeEcho 강화**: appliedPartIds/Names 추가, scopeReason 세분화(role_restricted_assignee/role_restricted_part), 보안 스코프(project+assignee/part)와 탐색 스코프(phase/trackType) 2단 분리 **(6) WBS-Story Link 테이블**: wbs_item_story_links 1급 연결 테이블 승격(N:M), CRUD API 추가 **(7) 신뢰도 3-tuple 표준화**: completeness={overall, breakdown?} + warnings={code, message, severity}[], Backlog와 동일 구조 **(8) SEARCH+Gantt 정책 확정**: SEARCH에서 Gantt 전환 시 자동 TREE 복원 + 안내 배너 **(9) 깨지기 쉬운 곳 5->7곳**: flags 평가 정합성, API 캐시 키 분리, ScopeEcho 보안 경계 추가 |
