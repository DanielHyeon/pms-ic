# AIMAX AI-PMS — 단계별관리(Phase Management) React 라우트/컴포넌트 설계 v1.0
작성일: 2026-02-08  
범위: `단계별관리` 메인 화면 + Drill-down Drawer + Admin(단계 설정) + 상태(Empty/Loading/Error/NoPermission)  
근거 화면(기존): 단계별 현황/설정 화면 구조(프로젝트, 기간, AI/SI 구분, 단계별 Task/파트 매핑)【turn2file0†L1-L46】

---

## 0) 설계 원칙

1. **한 라우트, 여러 ViewMode(Preset)**: 화면을 늘리지 않고 권한/역할로 가시성을 제어
2. **Track은 필터가 아니라 Layer**: ALL/AI/SI/INFRA는 같은 Phase 리스트 위에서 수치/원인만 달라짐
3. **Drill-down은 라우팅 + Drawer 병행**: 공유 가능한 URL을 유지하면서 Drawer UX 제공
4. **서버 계약 우선**: 프론트는 `asOf`, `scope`, `completeness`, `warnings`를 표준으로 표시(신뢰성 UX)

---

## 1) 라우트 설계(React Router)

### 1.1 경로
- `/projects/:projectId/phases`  
  - 단계별관리 메인(Overview)
- `/projects/:projectId/phases/:phaseId`  
  - 동일 화면 + Drawer 오픈(딥링크)
- `/projects/:projectId/phases/settings`  
  - 단계별 설정(Admin)

### 1.2 쿼리 파라미터
- `track=all|ai|si|infra` (default: all)
- `preset=exec|pmo|pm|dev|customer` (기본은 로그인 사용자 기준)
- `subPart=<id>` (옵션: 특정 Sub-Part focus)
- `from=<date>&to=<date>` (옵션: 기간 스코프)

---

## 2) 화면 컴포넌트 분해

### 2.1 페이지(Top-level)
- `PhaseManagementPage`
  - `PhaseTopBar`
  - `HealthSummaryStrip`
  - `PhaseTable`
  - `DependencyMiniGraph`
  - `PhaseDrilldownDrawer` (route param phaseId 있을 때)

- `PhaseSettingsPage` (Admin only)

### 2.2 공용 UI 컴포넌트
- `TrackToggle`
- `StatusBadge`
- `DataBadge` (asOf, source)
- `KpiCard`
- `RightDrawer`
- `ExpandableTable`
- `InlineIssueCreate`

---

## 3) 상태 모델(TypeScript)

```ts
export type Track = "all" | "ai" | "si" | "infra";
export type Preset = "exec" | "pmo" | "pm" | "dev" | "customer";

export type Status = "NORMAL" | "WARNING" | "CRITICAL" | "PAUSED";

export interface PhaseRow {
  phaseId: string;
  phaseName: string;
  order: number;
  planPct: number;     // 0..100
  actualPct: number;   // 0..100
  deltaPct: number;    // actual - plan
  status: Status;
  primaryCause?: {
    type: "TASK_DELAY" | "ISSUE" | "DELIVERABLE" | "TEST_FAIL" | "SCOPE_CHANGE" | "OTHER";
    label: string;
    count?: number;
  };
  trackBreakdown?: Record<Track, { planPct: number; actualPct: number; deltaPct: number; status: Status }>;
  highlights?: { delayedTasks: number; openIssues: number };
}

export interface PhaseOverviewResult {
  asOf: string; // ISO
  projectId: string;
  projectName: string;
  dateRange: { start: string; end: string };
  weights?: { ai: number; si: number; infra: number }; // e.g. ai 0.7 si 0.3
  phases: PhaseRow[];
  dependency?: { fromPhaseId: string; toPhaseId: string; lagDays?: number; track?: Track }[];
  warnings?: string[];
}

export interface DrilldownResult {
  asOf: string;
  phaseId: string;
  track: Track;
  status: Status;
  causes: Array<{ title: string; evidence: string; links?: Array<{ type: "task" | "issue"; id: string }> }>;
  delayedTasks: Array<{ id: string; title: string; assignee: string; dueDate?: string; status: string }>;
  issues: Array<{ id: string; title: string; owner: string; dueDate?: string; state: string }>;
  actions: Array<{ at: string; by: string; text: string }>;
}
```

---

## 4) 데이터 패칭 전략(React Query)

### 4.1 쿼리 키
- `["phaseOverview", projectId, track]`
- `["phaseDrilldown", projectId, phaseId, track]`
- `["phaseSettings", projectId]`

### 4.2 페칭 규칙
- Overview는 `track` 전환 시 재요청
- Drawer는 **phaseId 있을 때만** 요청
- Drawer에서 조치(이슈 생성/기한 변경) 시:
  - 드릴다운 쿼리 invalidate
  - 오버뷰 쿼리 invalidate(해당 phase만 낙관적 업데이트 가능)

---

## 5) ViewMode(Preset) 적용 방식

### 5.1 계산 방식
- 서버가 사용자 role/capability를 주거나, 프론트에서 `useCapability()`로 판단
- Preset은 UI 노출/편집 가능 여부를 결정

```ts
export interface PhaseViewPolicy {
  canExport: boolean;
  canEditSettings: boolean;
  canCreateIssue: boolean;
  showActionLog: boolean;
  maskInternalCauseDetails: boolean; // customer preset
  defaultDrawerTab: "causes" | "tasks" | "issues" | "actions";
}
```

### 5.2 프레임/컴포넌트에서의 적용
- `PhaseTopBar`: Export 버튼 노출 여부
- `PhaseTable`: 컬럼 축약/확장
- `Drawer Tabs`: action log 탭 노출 여부
- `CauseCard`: 내부 사유 마스킹(customer)

---

## 6) 컴포넌트별 상세 동작

### 6.1 `HealthSummaryStrip`
- phases에서 status를 기반으로 Chip 렌더
- CRITICAL 우선 정렬 옵션(Exec preset)
- Chip 클릭 시:
  - URL을 `/projects/:projectId/phases/:phaseId?track=...` 로 push
  - Drawer open

### 6.2 `PhaseTable`
- Expandable row
- Action 버튼:
  - Drawer open(딥링크)
  - default tab: preset 기반

### 6.3 `DependencyMiniGraph`
- 간단한 리스트/미니 그래프 형태(초기)
- edge 클릭 시:
  - table 필터(영향받는 phase 하이라이트)
  - drawer causes에 “영향 항목” 섹션 추가

### 6.4 `PhaseDrilldownDrawer`
- Drawer open은 route param 존재로 결정
- close:
  - `/projects/:projectId/phases?track=...`로 replace
- Issue 생성(Inline):
  - mutation 성공 시 드릴다운 invalidate
  - action log에 기록 표시

---

## 7) Admin: `PhaseSettingsPage` 구현 포인트

기존 문서의 “단계별 설정”은 단계명/시작·종료일/관련 파트/관련 Task 매핑 테이블 형태【turn2file0†L20-L43】.  
개선 구현은 “Template(정의)”와 “Instance(운영)”를 분리한다.

### 7.1 화면 탭
- 탭1: `Templates`
- 탭2: `Project Settings`

### 7.2 검증
- 날짜 역전 금지
- 단계 순서 중복 금지
- Hybrid일 때 트랙 2개 이상 포함

---

## 8) 파일/폴더 구조(Feature-first)

```
src/
  features/
    phases/
      routes/
        PhaseManagementPage.tsx
        PhaseSettingsPage.tsx
      components/
        PhaseTopBar.tsx
        HealthSummaryStrip.tsx
        PhaseTable.tsx
        DependencyMiniGraph.tsx
        PhaseDrilldownDrawer.tsx
        drawer/
          CauseTab.tsx
          TasksTab.tsx
          IssuesTab.tsx
          ActionsTab.tsx
      api/
        phasesApi.ts
      hooks/
        usePhaseOverview.ts
        usePhaseDrilldown.ts
        usePhaseViewPolicy.ts
      types/
        phaseTypes.ts
  shared/
    ui/
      StatusBadge.tsx
      TrackToggle.tsx
      RightDrawer.tsx
      DataBadge.tsx
```

---

## 9) 테스트 전략(프론트)

### 9.1 단위(Unit) — Vitest
- `deltaPct` 계산/상태 매핑
- preset 정책: customer에서 마스킹 여부
- 쿼리 파라미터 파싱(track/preset)

### 9.2 컴포넌트(Integration) — React Testing Library
- Track 토글 시 재요청/스켈레톤 노출
- Chip 클릭 → URL 변경 + Drawer open
- Drawer close → URL 복귀
- Issue 생성 성공 → 리스트 갱신

### 9.3 E2E — Playwright
- `/phases` 접속 시 정상 렌더
- CRITICAL 단계 하이라이트 확인
- `/phases/:phaseId` 딥링크 동작 확인
- customer preset에서 내부 원인 마스킹 확인
- settings 권한 없는 사용자 접근 시 403/NoPermission 상태

---

## 10) 수용 기준(Acceptance Criteria)

1. `/projects/:id/phases`에서 ALL/AI/SI/INFRA 전환이 가능하고, 동일 단계 목록이 유지된다.
2. `/projects/:id/phases/:phaseId`로 직접 접근하면 Drawer가 열린 상태로 시작한다.
3. Preset에 따라 버튼/탭/원인 마스킹이 일관되게 적용된다.
4. Admin만 `/settings`에서 편집 가능하며, 일반 사용자는 접근 시 NoPermission 상태를 본다.
5. Loading/Empty/Error 상태가 각각 사용자 친화적으로 표현된다.

