# Phase 5: Result Type Refactoring - API Layer Type Safety

## 1. Context (Why)

### 1.1 현재 문제

`fetchWithFallback<T>(..., mockData: T): Promise<T>`는 `api.ts`(2902줄, 85+ public 메서드)의 핵심 fetch 메서드입니다.

**근본 원인**: Generic `T`가 `mockData` 파라미터로부터 추론됩니다. `mockData`가 `null`인 호출부(23개)에서 TypeScript는 `T = null`(literal type)로 추론하여 반환 타입이 `Promise<null>`이 됩니다.

**결과**:

- Hook에서 `as unknown as T` 워크어라운드 캐스팅이 확산됨
- 모든 에러가 조용히 삼켜짐 — 구조화된 에러 정보가 hook/component까지 전달되지 않음
- 메타데이터(fallback 사용 여부, source, latency) 전파 불가 — 관측성 없음
- Component가 실제 데이터와 fallback 데이터를 구별 불가

### 1.2 Goal State

- `fetchResult<T>()`가 `Result<T>`를 반환 — raw `null` 반환 없음
- 성공/실패를 discriminated union 코드 계약으로 모델링
- Type safety와 관측성(에러, fallback, latency)을 동시에 해결
- Workbench component는 변경 ZERO — hook만 수정

### 1.3 성공을 좌우하는 5대 레버

| # | 레버 | 설명 |
| --- | --- | --- |
| 1 | **`fallbackData`를 config 옵션으로 분리** | `mockData: T`가 필수 파라미터일 때 `null` 전달 시 `T=null`로 굳는 문제를 원천 차단. `fallbackData?: T \| null`가 옵션이므로 TS가 T를 fallback에서 추론할 여지가 없음 |
| 2 | **`extract`를 내장이 아닌 주입으로 설계** | 응답 형식이 혼재된 프로젝트에서 wrapper extraction을 공통에 넣으면 예외 분기가 폭발함. `extract` 주입이 도메인별 응답 형식을 흡수하는 가장 현실적인 방식 |
| 3 | **`ResultMeta`로 관측 가능한 실패 생성** | fallback은 UX를 살리지만 운영에서는 "조용한 실패의 누적". `usedFallback`, `durationMs`, `endpoint`, `source`로 4종의 운영 질문에 답변 가능: (1) 어디가 자주 실패? (2) 언제부터 나빠졌나? (3) 얼마나 느려졌나? (4) fallback이 얼마나 쓰이나? |
| 4 | **Hook에서 `unwrapOrThrow`로 React Query 계약 활용** | `useQuery`는 "던지면 error로 잡는다"는 계약이 있으므로, `unwrapOrThrow`가 그 계약을 그대로 활용하여 Workbench 무수정을 가능하게 함 |
| 5 | **ViewState를 Optional로 유지** | 기존 React Query consumer를 강제하면 변경량이 폭발하므로, Optional 채택이 올바른 결정 |

---

## 2. Final Type Specifications

### 2.1 Result Type

```typescript
type Result<T> =
  | { ok: true;  data: T;        meta: ResultMeta; warnings?: ResultWarning[] }
  | { ok: false; error: ApiError; meta: ResultMeta; warnings?: ResultWarning[]; fallbackData?: T };
```

> **설계 결정 (B1)**: 실패 케이스에서 fallback 데이터는 `data`가 아닌 `fallbackData`로 명명합니다.
> "실패의 주 데이터는 없고, fallback이 있으면 fallbackData로만 제공" — 의미가 선명하고 ViewState 변환도 안전합니다.

### 2.2 ApiError

```typescript
type ApiErrorCode = 'NETWORK' | 'TIMEOUT' | 'ABORTED' | 'HTTP_4XX' | 'HTTP_5XX' | 'PARSE' | 'UNKNOWN';

interface ApiError {
  code: ApiErrorCode;
  status?: number;         // HTTP status (해당 시에만)
  message: string;         // 사람이 읽을 수 있는 메시지
  endpoint: string;        // 실패한 URL path
  timestamp: string;       // ISO 8601 (클라이언트 기준 fetch 완료 시각)
  retryable: boolean;      // TIMEOUT/NETWORK/5XX -> true, 4XX/PARSE/ABORTED -> false
  cause?: unknown;         // 디버깅용 원본 에러 객체
}
```

> **설계 결정 (B4)**: `retryable`은 smart retry UX를 가능하게 합니다. `cause`는 디버깅/로깅용 원본 에러를 보존합니다.

> **보완**: `ABORTED` 코드를 추가하여 `TIMEOUT`과 분리합니다.
> AbortController에 의한 abort는 "타임아웃"과 "사용자 페이지 이동/요청 취소" 두 경우가 있습니다.
> 둘을 같은 `TIMEOUT`으로 묶으면 관측이 오염되므로:
> - timeout abort -> `TIMEOUT` (`retryable: true`)
> - user abort (navigation 등) -> `ABORTED` (`retryable: false`)

### 2.3 ResultMeta

```typescript
interface ResultMeta {
  source: 'api' | 'fallback' | 'cache';
  asOf: string;            // ISO 8601 — 클라이언트 fetch 완료 시각
  endpoint: string;
  durationMs: number;      // 요청 시작~완료 항상 측정 (성공/실패 무관)
  usedFallback: boolean;
}
```

> **보완**: `asOf`는 **클라이언트에서 생성된 "fetch 완료 시각"**으로 고정합니다.
> 서버에서 오는 값이 아닌 `new Date().toISOString()` (fetch 완료 시점).
> 동일 기준으로 latency/실패 추이를 볼 수 있습니다.
> 서버가 "데이터 기준 시각"을 따로 준다면 `DashboardMeta.asOf` 등 별도 필드에서 관리합니다.

> **보완**: `durationMs`는 성공/실패 상관없이 항상 측정합니다.
> `performance.now()` 차이로 계산하여, 실패 케이스에서도 "얼마나 기다렸다가 실패했는지" 관측 가능합니다.

### 2.4 ResultWarning

```typescript
interface ResultWarning {
  code: string;            // 'USING_FALLBACK', 'PARSE_PARTIAL', 'SLOW_RESPONSE' 등
  message?: string;        // 선택적 상세 메시지
}
```

> **보완**: `warnings`를 `string[]`에서 `ResultWarning[]`로 변경합니다.
> 키(`code`) 기반 형식으로 통일하면 CI/대시보드에서 warning 집계가 용이합니다.
> 문자열만 쓰면 통일성이 깨지고 파싱이 어려워집니다.

### 2.5 ViewState (Optional — useViewState hook으로만 사용)

```typescript
type ViewStatus = 'loading' | 'ready' | 'empty' | 'error' | 'fallback';

interface ViewState<T> {
  status: ViewStatus;
  data: T | null;
  warnings: ResultWarning[];
  meta?: ResultMeta;
  error?: ApiError;
}
```

> **설계 결정 (B2)**: `status: 'loading'`은 `useViewState` hook을 통해서만 사용됩니다.
> 표준 `useQuery` 소비자는 React Query의 `isLoading`/`error`/`data`를 그대로 사용합니다.

### 2.6 unwrapOrThrow 규칙

- `ok` -> `data` 반환
- `fail` + `fallbackData` 존재 -> `fallbackData` 반환 (meta.usedFallback = true)
- `fail` + `fallbackData` 없음 -> `ApiError` throw (React Query가 `error`로 잡음)

> **보완**: `fail + fallbackData` 반환 시에도 "실패 사실"이 사라지면 안 됩니다.
> Hook에서 data만 소비하면 "조용한 실패"가 다시 시작되기 때문입니다.
>
> **최소 장치**: `unwrapOrThrow`가 fallback을 반환할 때 관측 로거로 이벤트 1개를 기록합니다.
> ```typescript
> // unwrapOrThrow 내부
> if (!result.ok && result.fallbackData !== undefined) {
>   logFetchFallback({
>     endpoint: result.meta.endpoint,
>     durationMs: result.meta.durationMs,
>     errorCode: result.error.code,
>   });
>   return result.fallbackData;
> }
> ```
> `console.warn`은 노이즈이므로 사용하지 않습니다.
> P4 Data Quality 대시보드의 관측 인프라가 있다면 그쪽으로 연결합니다.
> React Query의 `queryClient.setQueryData`로 meta를 함께 저장하는 방식은 Week 2 이후 옵션으로 둡니다.

---

## 3. fetchResult 구현 규칙 (Implementation Contract)

`fetchResult`가 프로젝트 전반에 퍼질 때 함정을 막는 필수 동작 규칙입니다.

### 규칙 A — 데이터 형태 변환을 하지 않는다

- 네트워크/파싱/타임아웃/메타만 책임
- JSON -> T 변환은 `extract`로 주입 (플랜 그대로)
- `fetchResult` 자체는 "운반 계약"이지 "변환 계약"이 아님

### 규칙 B — 파싱 에러(PARSE)를 HTTP 에러와 분리한다

- 200이지만 body가 예상과 다른 형태일 수 있음 (서버/계약 문제)
- `extract` 실행 중 예외 -> `ApiError.code = 'PARSE'`, `retryable = false`
- `fallbackData`가 있으면 fallback으로 내려주되 `warnings`에 `{ code: 'PARSE_ERROR' }` 기록

```typescript
// fetchResult 내부
try {
  const data: T = config?.extract ? config.extract(json) : json as T;
  return ok(data, meta);
} catch (extractError) {
  const apiError: ApiError = {
    code: 'PARSE', retryable: false,
    message: `Response extraction failed: ${extractError}`,
    endpoint, timestamp, cause: extractError,
  };
  return fail(apiError, meta, config?.fallbackData ?? null,
    [{ code: 'PARSE_ERROR', message: apiError.message }]);
}
```

### 규칙 C — usedFallback/source는 실제로 반환된 데이터 기준으로 설정

| 상황 | source | usedFallback |
| --- | --- | --- |
| API 성공 | `'api'` | `false` |
| API 실패 + fallbackData 반환 | `'fallback'` | `true` |
| (추후) cache hit | `'cache'` | `false` |

### 규칙 D — durationMs는 항상 측정

- 성공/실패 상관없이 `performance.now()` 차이로 계산
- "얼마나 기다렸다가 실패했는지"도 관측 대상

---

## 4. Execution Plan (Week 1-2)

### Week 1: 새 계약 도입 + 우선순위(Phase 3/4) 전환

#### Day 1 — Step 1: Foundation Types

**NEW FILE**: `src/types/result.ts`

정의할 타입들:

- `ApiErrorCode`, `ApiError` (`retryable`, `cause`, `ABORTED` 코드 포함)
- `ResultMeta` (`asOf`는 클라이언트 fetch 완료 시각)
- `ResultWarning` (code + message 구조)
- `Result<T>` (실패 케이스에서 `fallbackData`를 사용하는 discriminated union)
- `ViewState<T>`, `ViewStatus`
- Helper constructor: `ok<T>()`, `fail<T>()`

**Gate**: `npm run type-check` 통과 (기존 코드 영향 없음 — 새 파일만 추가)

---

#### Day 2 — Step 2: Core Engine (fetchResult) + 테스트 스캐폴드

**MODIFY**: `src/services/api.ts` (`fetchStrict` 뒤, ~line 184에 추가)

```typescript
private async fetchResult<T>(
  endpoint: string,
  options?: RequestInit,
  config?: {
    fallbackData?: T | null;
    timeoutMs?: number;
    extract?: (json: unknown) => T;  // 메서드별 응답 추출 로직
  }
): Promise<Result<T>>
```

핵심 설계 결정:

- 기존 `fetchWithFallback`과 병행 존재 (breaking change 없음)
- `fallbackData`는 `null` 기본값 (필수 파라미터가 아님 -> T가 이로부터 추론되지 않음)
- 실패 시 구조화된 `ApiError` (`retryable`/`cause` 포함)
- `ResultMeta`에 타이밍/소스 정보
- abort 원인 구분: `AbortSignal.timeout()` -> `TIMEOUT`, 사용자 취소 -> `ABORTED`
- `extract` 실패 시 `PARSE` 에러로 분류, fallback 가능 시 warning과 함께 fallback 반환

> **설계 결정 (B5)**: ApiResponse `{data, success}` wrapper 추출은 `fetchResult`에 내장하지 않습니다.
> 대신 `config.extract` 옵션으로 메서드별 추출 로직을 주입합니다.
> 기본 동작: raw JSON 반환. unwrapping이 필요한 메서드는 `extract: (r) => r.data`를 전달.

> **설계 결정 (B6)**: 기존 `fetchWithFallback`의 300ms delay는 아직 제거하지 않습니다.
> `fetchResult`는 단순히 delay를 포함하지 않습니다. Step 5 UI 검증 후 UX 회귀가 없는지 확인합니다.

**함께 생성**: `src/utils/__tests__/toViewState.test.ts` 테스트 파일 스캐폴드

> **실행 순서 보완**: Day 2에서 테스트 스캐폴드까지 같이 넣어두면 Day 4~5에서 hook 전환할 때 삐끗할 확률이 줄어듭니다.

**Gate**: 수동 검증 — `fetchResult`를 2개 시나리오로 호출 (성공, 실패+fallback)

---

#### Day 3 — Step 3: ViewState Normalizer

**NEW FILE**: `src/utils/toViewState.ts`

```typescript
interface ToViewStateOptions<T> {
  isEmpty?: (data: T) => boolean;     // 도메인별 empty 판정
  emptyData?: () => T;                // empty 상태 데이터 팩토리
}

function toViewState<T>(result: Result<T>, options?: ToViewStateOptions<T>): ViewState<T>
function unwrapOrThrow<T>(result: Result<T>): T
```

> **설계 결정 (B3)**: Empty 판정은 도메인별로 달라야 합니다.
>
> - 기본값: `data === null || (Array.isArray(data) && data.length === 0)`
> - 오버라이드 예시: `isEmpty: (d) => d.backlogItems.length === 0 && d.epics.length === 0`
> - 이 옵션 없이는 `PoBacklogViewDto` 같은 객체 DTO가 "empty"로 감지되지 않습니다.

**테스트 파일 완성**: `src/utils/__tests__/toViewState.test.ts`

테스트 케이스 (최소 6개):

1. `ok` + data -> `ready`
2. `ok` + empty array -> `empty`
3. `ok` + 커스텀 `isEmpty` 적용 -> `empty`
4. `fail` + `fallbackData` -> `fallback` (USING_FALLBACK warning 포함)
5. `fail` + fallbackData 없음 -> `error`
6. `unwrapOrThrow`: fail + no fallback -> throw ApiError

**Gate**: `npm run test` — toViewState 테스트 통과

---

#### Day 4 — Step 4: View DTO + Result API Method 추가

**NEW FILE**: `src/types/views.ts`

Component destructuring 패턴에서 추론한 Typed DTO:

- `PoBacklogViewDto` — `{ summary, backlogItems, epics, unlinkedStories, warnings }`
- `PmWorkboardViewDto` — `{ summary, activeSprint, backlogStories, warnings, scopedPartIds }`
- `PmoPortfolioViewDto` — `{ summary, kpis, dataQuality, partComparison, warnings }`

> **DTO 설계 주의**: `*ViewDto`는 **클라이언트 View 전용** 타입으로 명확히 구분합니다.
> 서버 응답 구조와 다를 수 있으며, `extract` 단계에서 서버 응답을 `*ViewDto`로 정규화합니다.
> 예: 서버가 주는 warning과 클라이언트가 생성한 warning을 합쳐서 `warnings: string[]`로 통일하는 작업은
> component나 hook에 흩어지면 안 되고, **`extract` 단계에서 정규화하는 것이 가장 깔끔**합니다.

**MODIFY**: `src/services/api.ts` — 4개 Result 메서드 추가 (기존 메서드는 `@deprecated`로 유지)

| New Method | Replaces |
| --- | --- |
| `getPoBacklogViewResult(): Promise<Result<PoBacklogViewDto>>` | `getPoBacklogView` (line 2867) |
| `getPmWorkboardViewResult(): Promise<Result<PmWorkboardViewDto>>` | `getPmWorkboardView` (line 2875) |
| `getPmoPortfolioViewResult(): Promise<Result<PmoPortfolioViewDto>>` | `getPmoPortfolioView` (line 2883) |
| `getDataQualityResult(): Promise<Result<DataQualityResponse>>` | `getDataQuality` (line 2893) |

**Gate**: 기존/신규 메서드 병행 존재. `npm run type-check` 통과.

---

#### Day 5 — Step 5: Hook Migration (우선순위 — as unknown as 제거)

**MODIFY**: `src/hooks/api/useViews.ts`

```typescript
// Before
queryFn: () => apiService.getPoBacklogView(projectId!)

// After
queryFn: async () => {
  const result = await apiService.getPoBacklogViewResult(projectId!);
  return unwrapOrThrow(result);
}
```

`usePmWorkboardView`, `usePmoPortfolioView`도 동일 패턴 적용.

**MODIFY**: `src/hooks/api/useDataQuality.ts`

`as unknown as DataQualityResponse` 제거 -> `unwrapOrThrow(result)`로 대체.

**Workbench component**: 변경 없음. Component는 React Query의 `{ data, isLoading, error }`를 그대로 소비 — hook 마이그레이션은 투명합니다.

**Gate (Week 1 성공 기준)**:

```bash
# 1. 캐스팅 완전 제거 확인
grep 'as unknown as' src/hooks/api/useViews.ts src/hooks/api/useDataQuality.ts  # -> 0 matches

# 2. 타입 체크 통과
npm run type-check  # -> 0 new errors

# 3. 전체 테스트 통과
npm run test        # -> all pass
```

> **Gate 강화 1**: Result 메서드가 `meta.endpoint`를 정확히 포함하는지 단정 테스트 추가
> ```typescript
> // test: getPoBacklogViewResult -> Result.meta.endpoint === `/projects/${id}/views/po-backlog`
> ```

> **Gate 강화 2**: fallback 사용 케이스에서 `usedFallback === true` 보장 테스트 추가
> 이 테스트가 있으면 "나중에 리팩터링하다가 meta를 빼먹는 문제"를 방지합니다.

---

### Week 2: 도메인 전체 마이그레이션 + 기존 nullable 제거 + CI Gate

#### Day 6-8 — Step 6: Dashboard Methods (8개 메서드)

**MODIFY**: `src/services/api.ts` — 8개 메서드 (lines 307-341)

| Method | Type |
| --- | --- |
| `getFullProjectDashboard` | `Result<ProjectDashboardDto>` |
| `getPhaseProgress` | `Result<DashboardSection<PhaseProgressDto>>` |
| `getPartStats` | `Result<DashboardSection<PartStatsDto>>` |
| `getWbsGroupStats` | `Result<DashboardSection<WbsGroupStatsDto>>` |
| `getSprintVelocity` | `Result<DashboardSection<SprintVelocityDto>>` |
| `getBurndown` | `Result<DashboardSection<BurndownDto>>` |
| `getInsights` | `Result<DashboardSection<InsightDto[]>>` |
| `getKanbanBoard` | `Result<KanbanBoardDto>` |

> Note: `Result<DashboardSection<T>>`는 의도적으로 `DashboardSection<T>`를 감쌉니다.
> `ResultMeta` = fetch 수준 메타데이터, `DashboardMeta` = 백엔드 연산 메타데이터.

> **실행 팁**: Dashboard는 결과 타입이 복잡해서(`DashboardSection` + 내부 `DashboardMeta`)
> 예상보다 시간이 걸릴 수 있습니다. 8개 중 2~3개를 먼저 전환하여 패턴을 고정한 뒤
> 나머지 5개를 치는 방식이 더 빠릅니다. 또는 Bulk Migration(Step 8)의 간단한 배치와 병렬 진행도 가능합니다.

**MODIFY**: `src/hooks/api/useDashboard.ts` — `unwrapOrThrow` 패턴으로 전환

**Gate**: Dashboard `as unknown as` 사용 -> 0. `meta.usedFallback`이 최소 1개 케이스에서 동작하는지 확인.

---

#### Day 9 — Step 7: WBS Snapshot + Epic CRUD

**MODIFY**: `src/services/api.ts`

- `getWbsSnapshot`, `restoreWbsSnapshot`, `deleteWbsSnapshot` (lines 2840-2862)
- `getEpicById`, `createEpic`, `updateEpic`, `deleteEpic` (lines 810-834)
- Epic 메서드의 `response?.data` 수동 unwrapping -> `fetchResult`의 `extract` 옵션으로 처리

**MODIFY**: `src/hooks/api/useWbsSnapshots.ts` — `as unknown as WbsSnapshot` 제거
**MODIFY**: `src/hooks/api/useEpics.ts`

**Gate**: `grep 'as unknown as' src/hooks/api/useWbsSnapshots.ts src/hooks/api/useEpics.ts` -> 0

---

#### Day 10-11 — Step 8: Bulk Migration (~65개 나머지 메서드)

도메인별 배치 전환 (api.ts의 `// =====` 섹션 헤더 기준):

| Batch | Methods | Hook File |
| --- | --- | --- |
| 1. Projects | 8 | `useProjects.ts` |
| 2. Parts | 12 | `useDashboard.ts` (part methods) |
| 3. Sprints | 7 | `useSprints.ts` |
| 4. Phases | 15 | `usePhases.ts` |
| 5. Tasks | 7 | `useTasks.ts` |
| 6. Stories | 8 | `useStories.ts` |
| 7. Permissions/Users | 20 | `useRoles.ts` |
| 8. Remaining | ~10 | Various |

**Bulk Migration 안전 운영 규칙**:

> **원칙 1 — 변환 패턴 템플릿 고정**: 모든 메서드 변환은 아래 3줄 패턴으로 통일
> 1. `return this.fetchResult<T>(endpoint, options, { fallbackData, extract })`
> 2. `extract`에서 서버 응답을 T로 normalize
> 3. 구 메서드는 `@deprecated` 유지 or 내부에서 새 메서드를 호출

> **원칙 2 — extract 없는 메서드가 전체의 70%가 되도록 목표**: 응답이 raw JSON 형태라면
> `extract` 없이도 됩니다. `extract`는 wrapper/unwrapping/정규화가 필요한 케이스에만 사용.
> 이 목표가 달성되면 유지보수가 쉬워집니다.

> **원칙 3 — 배치마다 grep 게이트를 촘촘히**:
> ```bash
> # 각 배치 후 실행
> grep '(response as any).data' src/services/api.ts | wc -l  # 감소 확인
> grep -r 'as unknown as' src/hooks/api/ | wc -l              # 0 유지
> npm run type-check && npm run test
> ```

**배치별 Gate**: `npm run type-check && npm run test` + 위 grep 체크

---

#### Day 12 — Step 9: Cleanup + CI Gate

**Cleanup 타이밍 결정**:

> **케이스 A (목표)**: 85개 전환 모두 완료 + CI grep이 0이면 -> `fetchWithFallback` 삭제 OK
>
> **케이스 B (현실적 대비)**: 몇 개가 남아있다면 -> `private` + `@deprecated` + CI 경고로 1주 유예.
> 무리하게 삭제하면 "급한 기능 수정" 때 다시 복구하려고 커밋이 꼬입니다.
> - `fetchWithFallback`은 `private`으로 줄이고
> - 외부에서 호출하면 lint/CI로 잡도록 하고
> - 다음 스프린트에 완전 삭제

**실행 내용**:

1. 모든 `@deprecated` 구 메서드 제거 (`*Result` -> 원래 이름으로 rename)
2. `fetchWithFallback` 메서드 완전 제거 (케이스 A) 또는 `private` 축소 (케이스 B)
3. 300ms delay 제거의 UX 회귀 확인 (B6) — 문제 발견 시 `fetchResult`에 최소 delay 추가
4. CI 체크 스크립트 추가:

```bash
# scripts/check-api-quality.sh
FALLBACK_COUNT=$(grep -c 'fetchWithFallback' src/services/api.ts || true)
CAST_COUNT=$(grep -rc 'as unknown as' src/hooks/api/ || true)
LEGACY_UNWRAP=$(grep -c '(response as any).data' src/services/api.ts || true)
if [ "$FALLBACK_COUNT" -gt 0 ] || [ "$CAST_COUNT" -gt 0 ] || [ "$LEGACY_UNWRAP" -gt 0 ]; then
  echo "FAIL: fetchWithFallback=$FALLBACK_COUNT, unsafe casts=$CAST_COUNT, legacy unwrap=$LEGACY_UNWRAP"
  exit 1
fi
```

**Final Gate**:

```bash
npm run type-check   # 0 errors
npm run test         # all pass
grep 'fetchWithFallback' src/services/api.ts   # 0 matches (케이스 A)
grep -r 'as unknown as' src/hooks/api/         # 0 matches
grep '(response as any).data' src/services/api.ts  # 0 matches
```

---

## 5. Files Summary

| Action | File | Step |
| --- | --- | --- |
| CREATE | `src/types/result.ts` | 1 |
| CREATE | `src/utils/toViewState.ts` | 3 |
| CREATE | `src/utils/__tests__/toViewState.test.ts` | 2-3 |
| CREATE | `src/types/views.ts` | 4 |
| CREATE (opt) | `src/hooks/useViewState.ts` | Post-Week 2 |
| MODIFY | `src/services/api.ts` | 2, 4, 6-8, 9 |
| MODIFY | `src/hooks/api/useViews.ts` | 5 |
| MODIFY | `src/hooks/api/useDataQuality.ts` | 5 |
| MODIFY | `src/hooks/api/useDashboard.ts` | 6 |
| MODIFY | `src/hooks/api/useWbsSnapshots.ts` | 7 |
| MODIFY | `src/hooks/api/useEpics.ts` | 7 |
| MODIFY | `src/hooks/api/useProjects.ts` + 7 more hook files | 8 |
| CREATE | `scripts/check-api-quality.sh` | 9 |

---

## 6. Layer Responsibility Rules (계층별 책임)

| Layer | Responsibility | Allowed |
| --- | --- | --- |
| `apiService` (경계) | HTTP + Result wrapping | `fetchResult()`, `ok()`, `fail()` |
| Hook (조립/정규화) | Result -> React Query data | `unwrapOrThrow()`, optionally `toViewState()` |
| Component (표현) | Status 기반 렌더링만 | `if (!data)` guard, 복구 로직 금지, `as unknown as` 금지 |

### Type Assertion Policy

- **허용**: `fetchResult` 내부에서만 (1곳, 최소 범위) + runtime guard와 함께
- **금지**: Hook 또는 Component에서의 `as unknown as` 캐스팅

### DTO 정의 Policy

- `*ViewDto`는 **클라이언트 View 전용** 타입으로 명확히 구분
- 서버 응답 -> `*ViewDto` 변환은 `extract` 단계에서 정규화
- Component/Hook에서 즉흥 변환 금지

---

## 7. Phase 3/4와의 연결 (관측성 접합)

Phase 5는 단순 리팩터링이 아니라, **실패를 구조적으로 관측 가능한 이벤트로 승격시키는 단계**입니다.

### P4 Data Quality 대시보드와의 접합

- `ResultMeta.usedFallback` / `durationMs` / `endpoint` -> P4 대시보드의 "Recovery Timeline / Health Narrative"와 직결
- `unwrapOrThrow`의 fallback 로깅 -> P4의 관측 인프라로 자연스럽게 연결

### P3 Role-Based View와의 접합

- `ApiError.retryable` / `code` -> "되묻기/복구 질문" UX로 발전 가능
  - 예: `NETWORK`/`TIMEOUT`이면 "네트워크 불안정, 재시도/오프라인 작업 안내"
  - 예: `HTTP_4XX` (403)이면 "권한 부족, 관리자에게 문의" 안내

### CI gate + 로그가 붙으면

단순 타입 안정화가 아니라 **운영 성숙 단계**로 연결됩니다:
- 어디가 자주 실패하나? (`endpoint` 집계)
- 언제부터 나빠졌나? (`asOf` + 로그 상관)
- 얼마나 느려졌나? (`durationMs` 추이)
- fallback이 얼마나 쓰이나? (`usedFallback` 비율)

---

## 8. Expected Outcomes (기대 효과)

| Before | After |
| --- | --- |
| `mockData`로부터 `T = null` 추론 | Generic 파라미터로 `T` 명시 선언 |
| Hook에서 `as unknown as T` 캐스팅 | `unwrapOrThrow(result)` — type-safe |
| 에러 조용히 삼켜짐 | 구조화된 `ApiError` (`retryable`, `cause`, `ABORTED` 포함) |
| Fallback 관측성 없음 | `ResultMeta.usedFallback` + `source` + `durationMs` 추적 |
| Component에서 `isLoading/error/!data` 개별 체크 | 동일 (변경 없음) — 또는 선택적으로 `ViewState.status` |
| 85개 메서드 x 수동 ApiResponse unwrapping | `fetchResult`의 `extract` 옵션으로 통일 처리 |
| timeout과 user abort 구분 불가 | `TIMEOUT` vs `ABORTED` 코드 분리 |
| warning이 문자열 배열 | `ResultWarning { code, message }` 구조화 |

### 체감 효과

- **mockData null로 인한 T=null 추론 문제 완전 종결**
- **Hook에서 "캐스팅으로 억지 통과" 패턴 제거**
- 실패/fallback 발생 시 meta(`usedFallback`, `durationMs`, `endpoint`)가 남아 **"어디가 느리거나 자주 죽는지" 추적 가능**
- Workbench component는 손대지 않고 hook만 바꿔도 구조가 정리됨 (**가장 큰 비용 절감**)
- Phase 3/4(설명책임/관측)와 자연스럽게 접합 가능
- `PARSE` 에러 분리로 서버/계약 문제 즉시 감지
- `ABORTED` 분리로 관측 데이터 오염 방지
