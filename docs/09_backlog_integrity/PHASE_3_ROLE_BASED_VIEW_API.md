# Phase 3: 역할 기반 View API / Workbench UI 분리

> **우선순위**: HIGH
> **소요 기간**: 3~6일
> **목표**: PMO/PM/PO가 같은 프로젝트를 보더라도 다른 질문에 답하는 화면 제공
> **선행 조건**: Phase 2 (표준 백로그 모델 확정 + API 계약 고정)
> **후속 의존**: Phase 4 (FK 제약조건 + CI 게이트)

---

## 핵심 원칙 4가지

Phase 3은 Phase 0~2에서 만든 "데이터 계약"을 **역할·권한·스코프·UI에 실제로 강제**하는 단계다.
설계의 승패는 아래 4축으로 갈린다.

### 원칙 1: 서버 강제 = 단일 진실

> 프론트 `CapabilityGate`는 **UX일 뿐**, "권한"이 아니라 "표시"다.
> **서버가 항상 capability + scope를 강제**해야 한다.

### 원칙 2: View API는 "조립된 결과"를 준다

> 프론트가 여러 API를 호출해서 조합하는 순간, 역할별 화면이 금방 깨지고 재사용 불가가 된다.
> **View API는 역할별 질문에 직접 답할 수 있어야** 한다.

### 원칙 3: 스코프는 "조회 + 변경" 모두에 적용

> 조회에서 part scope를 적용해도, **변경 API에서 빠지면 사고**가 난다.
> `EDIT_STORY` 같은 액션은 스코프 검증이 **더 중요**하다.

### 원칙 4: PMO 화면은 "깨짐을 숨기지 않고 드러내는" 곳

> `dataQuality` / `warnings`는 기능이 아니라 **거버넌스 장치**다.
> KPI는 "예쁜 숫자"가 아니라 **"진실을 측정"**해야 한다.

---

## 3-1. Capability + Scope 서버 강제

### 3-1-1. 현재 상태

| 항목 | 상태 | 근거 |
|---|---|---|
| JWT 토큰 | subject(email)만 포함 | `JwtTokenProvider.generateToken()` — capability/scope 미포함 |
| Project RBAC | `ReactiveProjectSecurityService` 존재 | `hasRole(projectId, role)` → `project_members` 테이블 조회 |
| 권한 테이블 | `project_role_permissions` 존재 | 프로젝트별 역할-권한 매핑 (granted boolean) |
| Part-User 매핑 | `part_members(part_id, user_id)` 존재 | Part별 멤버 조회 가능 |
| 프론트 권한 체크 | **부재** | 모든 사용자에게 같은 화면 |
| Part 기반 스코프 | **없음** | PM이 다른 파트 데이터 수정 가능 |

### 3-1-2. 왜 이게 역할 분리의 전제인가

- **PO**: 프로젝트 전체를 보지만, 스프린트/작업 상세를 편집하지 않음
- **PM**: 자기 **파트** 범위 내에서만 스토리/작업 편집
- **PMO**: 전체 프로젝트/파트 **읽기 전용** + KPI/감사

> 편집/승인/내보내기 같은 액션이 역할에 따라 **서버에서 강제**되어야 한다.
> 프론트에서만 버튼을 숨기는 건 보안이 아니라 **UI 트릭**일 뿐이다.

### 3-1-3. 권장 아키텍처: "토큰은 정보 전달, 강제는 서비스 계층"

#### 왜 전역 필터(ScopeFilter)가 아니라 서비스 계층인가

문서 초안에 `ScopeFilter`를 전역 미들웨어처럼 두는 아이디어가 있었으나,
WebFlux/Reactive에서 전역 필터로 모든 요청을 해석해 강제하려면 다음 문제가 발생한다:

1. **엔드포인트별 capability 매핑 불가**: 요청마다 "이 엔드포인트가 어떤 capability를 요구하는지"를 필터가 알기 어렵다
2. **PathVariable/Body 파싱 복잡도**: partId/storyId를 꺼내 scope 검증하려면 라우팅/바인딩 전 단계에서 복잡도 급상승
3. **도메인 의존**: 결국 필터는 "공통 헤더 검사" 수준에서만 안전하고, 실제 도메인 스코프는 서비스 레이어가 더 정확

#### 권장 2계층 강제 패턴

```
Controller 레벨: @PreAuthorize(hasCapability(projectId, CAP))
   → "이 프로젝트에서 이 Capability가 있는가?" 확인
   → 프로젝트 단위 capability 체크

Service 레벨: assertPartScope(projectId, storyId)
   → "이 객체가 내 Part 범위 안인가?" 확인
   → 객체 단위 scope 체크 (storyId → story.part_id → allowedPartIds)
```

> **프로젝트 단위 capability**는 `@PreAuthorize`,
> **객체 단위 scope**는 서비스에서 리졸브해서 강제 — 이게 가장 안전하다.

### 3-1-4. 토큰 클레임 구조

현재 `JwtTokenProvider`는 subject(email)만 저장한다. Phase 3에서 다음 클레임을 추가한다:

```json
{
  "sub": "pm1@insuretech.com",
  "iat": 1738800000,
  "exp": 1738886400,
  "projectRoles": [
    {
      "projectId": "proj-001",
      "role": "PM",
      "capabilities": [
        "VIEW_BACKLOG", "EDIT_STORY", "MANAGE_SPRINT",
        "ASSIGN_TASK", "VIEW_PART_WORKLOAD"
      ],
      "allowedPartIds": ["part-001-ai"]
    }
  ]
}
```

#### 서버 리졸브 규칙

토큰에서 `projectRoles` 배열을 꺼낸 뒤, **반드시 projectId를 키로 해당 프로젝트의 capabilities + scope만** 꺼내야 한다.

```java
// ProjectScopeResolver.java — 토큰 → 프로젝트별 권한 리졸브
Map<String, ProjectScope> resolveScopes(Claims claims) {
    // claims.projectRoles → Map<projectId, ProjectScope> 변환
    // ProjectScope = { capabilities[], allowedPartIds[] }
}

// 검사 시: 반드시 요청의 projectId에 매칭되는 scope만 사용
ProjectScope scope = resolveScopes(claims).get(requestProjectId);
if (scope == null) throw new AccessDeniedException("프로젝트 접근 불가");
```

> **흔한 실수**: 프로젝트 A의 capability가 있는데, 프로젝트 B 요청에도 통과하는 버그.
> 서버는 항상 `projectId`를 키로 "해당 프로젝트의 capabilities + scope"만 꺼내야 한다.

#### capability 생성 소스

```
project_members.role (PM, PO, PMO_HEAD, ...)
   → project_role_permissions (role → permission_id → capability 매핑)
      → JWT claims.projectRoles[].capabilities

part_members (part_id, user_id)
   → JWT claims.projectRoles[].allowedPartIds
```

### 3-1-5. Capability 정의 (역할별)

| Capability | PO | PM | PMO | 설명 |
|---|---|---|---|---|
| `VIEW_BACKLOG` | O | O | O | 백로그 목록 읽기 |
| `EDIT_BACKLOG_ITEM` | O | X | X | 백로그 아이템 수정 (스코프) |
| `APPROVE_BACKLOG_ITEM` | O | X | X | 백로그 아이템 승인 |
| `VIEW_STORY` | O | O | O | 스토리 목록 읽기 |
| `EDIT_STORY` | X | O | X | 스토리 수정/생성 |
| `MANAGE_SPRINT` | X | O | X | 스프린트 생성/시작/종료 |
| `ASSIGN_TASK` | X | O | X | 작업 할당/재배치 |
| `VIEW_PART_WORKLOAD` | O | O | O | 파트별 작업량 조회 |
| `VIEW_KPI` | O | X | O | KPI/지표 대시보드 |
| `VIEW_AUDIT_LOG` | X | X | O | 감사 로그 접근 |
| `EXPORT_REPORT` | O | X | O | 리포트 내보내기 |
| `VIEW_DATA_QUALITY` | X | X | O | 데이터 품질 대시보드 |

### 3-1-6. Scope 필터링 원칙

```
모든 API 응답 = 도메인 데이터 × scope 필터 × capability 체크
```

| 역할 | 조회 스코프 | 변경 스코프 |
|---|---|---|
| **PO** | `allowedProjectIds` (프로젝트 전체) | 백로그 아이템만 편집/승인 |
| **PM** | `allowedProjectIds` + `allowedPartIds` (파트 범위) | 자기 파트의 스토리/작업만 편집 |
| **PMO** | `allowedProjectIds` (프로젝트 전체, 읽기 전용) | 변경 불가 |

### 3-1-7. PM 파트 제한 강제 방식 (조회/수정 각각)

이것이 **Phase 3의 보안 핵심**이다.

#### 조회 (View API)

```sql
WHERE story.part_id IN (:allowedPartIds)
```

#### 수정 (스토리 수정/스프린트 투입/태스크 할당)

> 요청에 partId가 없어도 **storyId로 DB에서 story.part_id를 조회해서 검사**해야 한다.
> 그렇지 않으면 "body에 partId를 안 넣고 우회"가 가능하다.

```java
// ReactiveProjectSecurityService 확장
public Mono<Void> assertStoryScope(String projectId, String storyId) {
    return storyRepository.findById(storyId)
        .switchIfEmpty(Mono.error(new NotFoundException("Story not found")))
        .flatMap(story -> {
            // story.part_id가 현재 사용자의 allowedPartIds에 포함되는지 검증
            return getAllowedPartIds(projectId)
                .flatMap(allowedParts -> {
                    if (story.getPartId() == null || !allowedParts.contains(story.getPartId())) {
                        return Mono.error(new AccessDeniedException(
                            "Story " + storyId + " is outside your part scope"));
                    }
                    return Mono.empty();
                });
        });
}
```

### 3-1-8. ReactiveProjectSecurityService 확장 메서드 시그니처

현재 서비스에 다음 메서드를 추가한다:

```java
// --- capability 기반 체크 (Controller @PreAuthorize에서 사용) ---

// 프로젝트에서 특정 capability가 있는지 확인
public Mono<Boolean> hasCapability(String projectId, String capability);

// 프로젝트에서 여러 capability 중 하나라도 있는지 확인
public Mono<Boolean> hasAnyCapability(String projectId, String... capabilities);

// --- scope 기반 체크 (Service 내부에서 사용) ---

// 현재 사용자의 allowedPartIds 조회 (part_members 기반)
public Mono<Set<String>> getAllowedPartIds(String projectId);

// Part 스코프 범위 내인지 검증 (Part ID 직접)
public Mono<Void> assertPartScope(String projectId, String partId);

// Story 스코프 범위 내인지 검증 (storyId → story.part_id 리졸브)
public Mono<Void> assertStoryScope(String projectId, String storyId);

// Task 스코프 범위 내인지 검증 (taskId → task.part_id 리졸브)
public Mono<Void> assertTaskScope(String projectId, String taskId);
```

> **capability 체크**: `project_members.role` → `project_role_permissions` JOIN으로 해당 역할이 해당 capability를 가지는지 확인
> **scope 체크**: `part_members` 테이블에서 사용자의 파트 목록 조회 → 대상 객체의 part_id와 비교

### 3-1-9. 프론트 CapabilityGate 컴포넌트

> **중요**: CapabilityGate는 UX 편의일 뿐, 보안은 서버가 담당한다.
> 프론트는 "버튼을 숨기는" 역할이고, 서버는 "403을 반환하는" 역할이다.

```typescript
// CapabilityGate.tsx
interface CapabilityGateProps {
  required: string[];  // 필요한 capability 목록
  mode?: 'all' | 'any'; // 기본 'all' (모든 capability 필요)
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function CapabilityGate({
  required, mode = 'all', children, fallback = null
}: CapabilityGateProps) {
  const { capabilities } = useProjectAuth();
  const check = mode === 'all'
    ? required.every(cap => capabilities.includes(cap))
    : required.some(cap => capabilities.includes(cap));
  return check ? <>{children}</> : <>{fallback}</>;
}
```

### 3-1-10. 완료 조건

- [ ] `JwtTokenProvider` 확장: `projectRoles` 클레임 포함 (capabilities, allowedPartIds)
- [ ] `ProjectScopeResolver` 생성: 토큰 → `Map<projectId, ProjectScope>` 변환
- [ ] `ReactiveProjectSecurityService` 확장: `hasCapability()`, `getAllowedPartIds()`, `assertStoryScope()`, `assertTaskScope()`
- [ ] 프론트 `CapabilityGate` 컴포넌트 구현
- [ ] PM의 Part 범위 제한이 **조회 + 수정 모두** 서버에서 강제되는지 검증
- [ ] 권한 없는 API 호출 시 403 반환 확인
- [ ] `ScopeAssertionsTest.java` 통합 테스트 통과 (3-5 참조)

---

## 3-2. Backlog View Model API 도입

### 3-2-1. 설계 원칙

> 하나의 도메인을 역할별로 "다르게 조합해서 내려주는" API를 만든다.
> 프론트가 여러 API를 호출해서 조합하는 것이 아니라,
> **서버가 역할에 맞는 View Model을 한 번에 내려준다.**

### 3-2-2. ViewService 내부 3계층 아키텍처

View API가 "서버 조립"을 제대로 하려면 ViewService 내부를 **3계층으로 분리**해야 유지보수가 가능하다.

```
┌─────────────────────────────────────┐
│  ViewApiController                  │  ← @PreAuthorize (capability 체크)
├─────────────────────────────────────┤
│  PresenterLayer                     │  ← 역할별 DTO 조립 + warnings/dataQuality 부착
│    PoBacklogPresenter               │
│    PmWorkboardPresenter             │
│    PmoPortfolioPresenter            │
├─────────────────────────────────────┤
│  AggregatorLayer                    │  ← KPI/rollup 계산 (테스트 독립 가능)
│    KpiCalculator                    │
│    StoryRollupCalculator            │
│    DataQualityCalculator            │
├─────────────────────────────────────┤
│  ScopedQueryLayer                   │  ← scope 필터 적용된 원천 데이터 조회
│    ScopedStoryQuery                 │
│    ScopedBacklogQuery               │
│    ScopedEpicQuery                  │
└─────────────────────────────────────┘
```

#### 왜 3계층인가

| 계층 | 책임 | 변경 이유 |
|---|---|---|
| **ScopedQueryLayer** | `allowedProjectIds`/`allowedPartIds` 기준으로 원천 데이터 안전 조회 | 스키마 변경, 인덱스 변경 |
| **AggregatorLayer** | KPI/rollup 계산 (포인트 합, 완료율, 분해율, 커버리지, 리드타임 등) | KPI 정의 변경, 계산식 변경 |
| **PresenterLayer** | 역할별 DTO 형태로 조립 + warnings/dataQuality 부착 | DTO 필드 추가/삭제, 화면 요구사항 변경 |

> Phase 4에서 FK/CI 게이트가 들어와도 **ScopedQueryLayer만** 흔들리고,
> Aggregator와 Presenter는 거의 안 바뀐다.

### 3-2-3. 역할별 View API 정의

#### PO Backlog View

```
GET /api/projects/{projectId}/views/po-backlog
```

**PO가 답할 수 있는 질문**:
- "요구사항 대비 스토리 분해가 얼마나 됐나?"
- "승인 대기 중인 백로그 아이템은 몇 건인가?"
- "Epic별 진행률은 어떤가?"

**응답 구조**:

```json
{
  "projectId": "proj-001",
  "role": "PO",
  "summary": {
    "totalBacklogItems": 7,
    "approvedItems": 3,
    "pendingItems": 4,
    "requirementCoverage": 85.7,
    "epicCount": 4,
    "storyDecompositionRate": 71.4
  },
  "backlogItems": [
    {
      "id": "bl-item-001",
      "requirementTitle": "OCR 문서 자동 추출",
      "requirementPriority": "CRITICAL",
      "status": "BACKLOG",
      "epicName": "문서 처리 자동화",
      "stories": [
        {
          "id": "story-001-01",
          "title": "OCR 문서 업로드",
          "status": "DONE",
          "storyPoints": 8,
          "sprintName": "Sprint 1"
        }
      ],
      "storyCount": 1,
      "completedStoryCount": 1,
      "totalStoryPoints": 8,
      "completedStoryPoints": 8
    }
  ],
  "epics": [
    {
      "id": "epic-001-01",
      "name": "문서 처리 자동화",
      "progress": 20,
      "backlogItemCount": 2,
      "storyCount": 1,
      "completedStoryRate": 100
    }
  ],
  "unlinkedStories": [],
  "warnings": []
}
```

**KPI 계산식**:

| KPI | 계산식 | 단위 |
|---|---|---|
| `requirementCoverage` | `(requirement_id IS NOT NULL인 backlog_items 수 / 전체 backlog_items 수) × 100` | % |
| `storyDecompositionRate` | `(1개 이상 story가 연결된 backlog_items 수 / 전체 backlog_items 수) × 100` | % |
| `completedStoryRate` (Epic별) | `(status='DONE' stories 수 / 해당 Epic의 전체 stories 수) × 100` | % |

#### PM Workboard View

```
GET /api/projects/{projectId}/views/pm-workboard
```

**PM이 답할 수 있는 질문**:
- "이번 스프린트 진행률은?"
- "내 파트에 할당된 스토리는 몇 개?"
- "스프린트에 투입할 수 있는 백로그 스토리는?"
- "작업 부하가 특정 파트에 치우쳐 있지 않나?"

**응답 구조**:

```json
{
  "projectId": "proj-001",
  "role": "PM",
  "scopedPartIds": ["part-001-ai"],
  "summary": {
    "totalStories": 5,
    "inSprintStories": 3,
    "backlogStories": 2,
    "activeSprintName": "Sprint 3",
    "sprintVelocity": 21,
    "partWorkload": {
      "part-001-ai": { "stories": 3, "storyPoints": 29, "members": 2 },
      "part-001-si": { "stories": 1, "storyPoints": 8, "members": 1 }
    }
  },
  "activeSprint": {
    "id": "sprint-001-03",
    "name": "Sprint 3",
    "status": "ACTIVE",
    "startDate": "2026-02-01",
    "endDate": "2026-02-14",
    "stories": [
      {
        "id": "story-001-02",
        "title": "사기 탐지 대시보드",
        "status": "IN_PROGRESS",
        "storyPoints": 13,
        "assignee": "user-dev-002",
        "partName": "AI 개발 파트",
        "epicName": "사기 탐지 시스템",
        "backlogItemTitle": "사기 탐지 알고리즘"
      }
    ],
    "totalPoints": 21,
    "completedPoints": 0,
    "burndownData": []
  },
  "backlogStories": [
    {
      "id": "story-001-04",
      "title": "데이터 암호화 구현",
      "status": "BACKLOG",
      "storyPoints": 5,
      "epicName": "보안 및 규정 준수",
      "partName": null,
      "readyForSprint": false,
      "blockingReason": "Part 미배정"
    }
  ],
  "warnings": [
    { "type": "UNASSIGNED_PART", "storyId": "story-001-04", "message": "Part 미배정 스토리" }
  ]
}
```

> **PM Workboard의 scope 보안**: `scopedPartIds`가 DTO에 그대로 노출된다.
> 이는 디버깅/감사 목적이며, 서비스 레이어에서 이 scope로 쿼리를 제한한다.

#### PMO Portfolio View

```
GET /api/projects/{projectId}/views/pmo-portfolio
```

**PMO가 답할 수 있는 질문**:
- "요구사항 대비 실행 추적이 가능한가?"
- "파트별 작업량/성과 비교는?"
- "데이터 정합성은 거버넌스 기준을 충족하는가?"
- "전체 프로젝트 진척률은?"
- "어디서 병목이 발생하고 있나?" ← Phase 2 이벤트 기반 KPI

**응답 구조**:

```json
{
  "projectId": "proj-001",
  "role": "PMO",
  "summary": {
    "overallProgress": 20,
    "requirementTraceability": 71.4,
    "storyDecompositionRate": 57.1,
    "epicCoverage": 66.7,
    "dataQualityScore": 45
  },
  "kpis": {
    "coverage": [
      {
        "name": "요구사항 추적률",
        "value": 71.4,
        "unit": "%",
        "threshold": 80,
        "status": "WARNING",
        "formula": "backlog_items WITH requirement_id / total backlog_items",
        "description": "백로그 아이템 중 요구사항과 연결된 비율"
      },
      {
        "name": "스토리 분해율",
        "value": 57.1,
        "unit": "%",
        "threshold": 70,
        "status": "DANGER",
        "formula": "backlog_items WITH ≥1 story / total backlog_items",
        "description": "백로그 아이템 중 하나 이상의 스토리로 분해된 비율"
      },
      {
        "name": "Epic 커버리지",
        "value": 66.7,
        "unit": "%",
        "threshold": 80,
        "status": "WARNING",
        "formula": "stories WITH epic_id / total stories",
        "description": "스토리 중 Epic에 배정된 비율"
      },
      {
        "name": "Part 배정률",
        "value": 80,
        "unit": "%",
        "threshold": 90,
        "status": "WARNING",
        "formula": "stories WITH part_id / total stories",
        "description": "스토리 중 Part가 배정된 비율"
      },
      {
        "name": "스프린트 투입률",
        "value": 60,
        "unit": "%",
        "threshold": 50,
        "status": "OK",
        "formula": "stories WITH sprint_id / total stories",
        "description": "스토리 중 스프린트에 투입된 비율"
      }
    ],
    "operational": [
      {
        "name": "Story 상태 전이 리드타임",
        "value": 3.5,
        "unit": "일",
        "threshold": 5,
        "status": "OK",
        "formula": "median(DONE.transitioned_at - READY.transitioned_at), 최근 14일",
        "description": "READY→DONE 전이 소요시간 중앙값"
      },
      {
        "name": "REVIEW 체류시간 비율",
        "value": 42,
        "unit": "%",
        "threshold": 30,
        "status": "WARNING",
        "formula": "avg(DONE.transitioned_at - REVIEW.transitioned_at) / avg(total_lead_time), P90",
        "description": "전체 리드타임 중 REVIEW 단계 체류 비율 (병목 신호)"
      },
      {
        "name": "스프린트 투입 후 완료율",
        "value": 65,
        "unit": "%",
        "threshold": 70,
        "status": "WARNING",
        "formula": "stories reaching DONE / stories entering IN_SPRINT, 현 스프린트",
        "description": "스프린트 진입 후 DONE 도달 비율 (스프린트 건강도)"
      }
    ]
  },
  "dataQuality": {
    "integrity": {
      "invalidPartReferences": 0,
      "invalidEpicReferences": 0,
      "invalidRequirementReferences": 0,
      "mismatchStoryFeaturePart": 0,
      "mismatchStoryEpicText": 0
    },
    "readiness": {
      "nullEpicIdStories": 1,
      "nullPartIdStories": 1,
      "unlinkedStories": 0,
      "unlinkedBacklogItems": 2
    },
    "score": {
      "total": 45,
      "integrityScore": 100,
      "readinessScore": 35
    },
    "issues": [
      { "severity": "WARNING", "entity": "story-001-04", "issue": "Epic/Part 미배정", "category": "readiness" }
    ]
  },
  "partComparison": [
    {
      "partId": "part-001-ai",
      "partName": "AI 개발 파트",
      "stories": 3,
      "storyPoints": 29,
      "completedPoints": 8,
      "completionRate": 27.6,
      "memberCount": 2,
      "avgLeadTimeDays": 3.2
    },
    {
      "partId": "part-001-si",
      "partName": "SI 개발 파트",
      "stories": 1,
      "storyPoints": 8,
      "completedPoints": 0,
      "completionRate": 0,
      "memberCount": 1,
      "avgLeadTimeDays": null
    }
  ],
  "warnings": [
    { "type": "LOW_DATA_QUALITY", "score": 45, "message": "데이터 품질 점수 기준 미달" },
    { "type": "LOW_REQUIREMENT_TRACE", "value": 71.4, "message": "요구사항 추적률 80% 미만" },
    { "type": "HIGH_REVIEW_DWELL", "value": 42, "message": "REVIEW 체류시간 비율 30% 초과 (병목)" }
  ]
}
```

### 3-2-4. PMO dataQuality: "무결성" + "운영준비"를 분리해서 점수화

PMO `dataQuality`에 orphan/null/invalid를 넣는 것은 맞지만, 두 가지를 **다른 톤**으로 봐야 한다.

| 계층 | 의미 | 항목 | 페널티 |
|---|---|---|---|
| **Integrity (무결성)** | 버그/데이터 깨짐 | invalid_ref, mismatch | **크다** (건당 -10점) |
| **Readiness (운영준비)** | 프로세스 미완성 (미분류) | null_epic, null_part, unlinked | **중간** (건당 -3~5점) |

> 무결성은 "시스템이 깨진 것"이고, 운영준비는 "프로세스가 아직 덜 된 것"이다.
> PMO는 둘을 **다른 긴급도**로 봐야 한다.

#### 점수 산정 공식

```
integrityScore = max(0, 100 - (invalid_ref 건수 × 10) - (mismatch 건수 × 10))
readinessScore = max(0, 100 - (null_epic 건수 × 5) - (null_part 건수 × 5)
                              - (unlinked_story 건수 × 5) - (unlinked_backlog 건수 × 3))
totalScore = (integrityScore × 0.6) + (readinessScore × 0.4)
```

> 이 점수를 Phase 4의 CI 게이트 기준으로 연결할 수 있다.
> 예: `integrityScore < 80` → CI HARD FAIL, `readinessScore < 50` → CI WARNING

### 3-2-5. PMO 이벤트 기반 KPI (Phase 2 audit.status_transition_events 활용)

Phase 2에서 `audit.status_transition_events` 테이블을 도입했으므로,
Phase 3의 PMO View에서 **바로 활용해야 "시작부터 PMO가 살아있다"**가 된다.

| KPI | 계산 소스 | 의미 |
|---|---|---|
| **Story 상태 전이 리드타임** | `median(DONE.transitioned_at - READY.transitioned_at)`, 최근 14일 | 실행 속도 지표 |
| **REVIEW 체류시간 비율** | `avg(DONE - REVIEW) / avg(total_lead_time)`, P90 | 병목 감지 |
| **스프린트 투입 후 완료율** | `IN_SPRINT 진입 이벤트 → DONE 도달 비율` | 스프린트 건강도 |

이 3개가 있으면 PMO View는 **"단순 현재값"이 아니라 "운영 지표"**가 된다.

#### 리드타임 계산 SQL 예시

```sql
-- Story READY→DONE 리드타임 (최근 14일)
WITH done_events AS (
    SELECT entity_id, transitioned_at AS done_at
    FROM audit.status_transition_events
    WHERE entity_type = 'STORY' AND to_status = 'DONE'
      AND transitioned_at >= NOW() - INTERVAL '14 days'
),
ready_events AS (
    SELECT entity_id, MAX(transitioned_at) AS ready_at
    FROM audit.status_transition_events
    WHERE entity_type = 'STORY' AND to_status = 'READY'
    GROUP BY entity_id
)
SELECT
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY
        EXTRACT(EPOCH FROM (d.done_at - r.ready_at)) / 86400.0
    ) AS median_lead_time_days
FROM done_events d
JOIN ready_events r ON d.entity_id = r.entity_id
WHERE r.ready_at < d.done_at;
```

### 3-2-6. View API 보안: PreAuthorize + 서비스 레벨 검증 결합

> **주의**: `@PreAuthorize(hasCapability(projectId, 'VIEW_STORY'))`만 걸면,
> PM이 **전체 프로젝트 스토리를 보는 사고**가 날 수 있다.

PM Workboard는 반드시:
1. **권한**: `VIEW_STORY` (Controller)
2. **스코프**: `allowedPartIds` 적용 (Service)

이 둘이 **결합**되어야 한다.

```java
// ViewApiController.java
@RestController
@RequestMapping("/api/projects/{projectId}/views")
@RequiredArgsConstructor
public class ViewApiController {

    private final ViewService viewService;

    @GetMapping("/po-backlog")
    @PreAuthorize("@reactiveProjectSecurity.hasCapability(#projectId, 'VIEW_BACKLOG')")
    public Mono<PoBacklogView> getPoBacklogView(
            @PathVariable String projectId,
            @AuthenticationPrincipal UserPrincipal user) {
        // PO: 프로젝트 전체 스코프
        return viewService.buildPoBacklogView(projectId, user);
    }

    @GetMapping("/pm-workboard")
    @PreAuthorize("@reactiveProjectSecurity.hasCapability(#projectId, 'VIEW_STORY')")
    public Mono<PmWorkboardView> getPmWorkboardView(
            @PathVariable String projectId,
            @AuthenticationPrincipal UserPrincipal user) {
        // PM: ViewService 내부에서 allowedPartIds로 스코프 강제
        return viewService.buildPmWorkboardView(projectId, user);
    }

    @GetMapping("/pmo-portfolio")
    @PreAuthorize("@reactiveProjectSecurity.hasCapability(#projectId, 'VIEW_KPI')")
    public Mono<PmoPortfolioView> getPmoPortfolioView(
            @PathVariable String projectId,
            @AuthenticationPrincipal UserPrincipal user) {
        // PMO: 프로젝트 전체 읽기 전용
        return viewService.buildPmoPortfolioView(projectId, user);
    }
}
```

```java
// ViewService.java — PM Workboard 조립 예시
public Mono<PmWorkboardView> buildPmWorkboardView(String projectId, UserPrincipal user) {
    return securityService.getAllowedPartIds(projectId)
        .flatMap(allowedPartIds -> {
            // 1) ScopedQueryLayer: allowedPartIds 적용
            Mono<List<Story>> stories = scopedStoryQuery.findByProjectAndParts(
                projectId, allowedPartIds);
            Mono<Sprint> activeSprint = scopedSprintQuery.findActive(
                projectId, allowedPartIds);

            // 2) AggregatorLayer: rollup 계산
            return Mono.zip(stories, activeSprint)
                .flatMap(tuple -> {
                    var rollup = storyRollupCalculator.calculate(tuple.getT1());
                    var workload = partWorkloadCalculator.calculate(
                        tuple.getT1(), allowedPartIds);

                    // 3) PresenterLayer: DTO 조립 + warnings
                    return pmWorkboardPresenter.build(
                        projectId, allowedPartIds, tuple.getT1(),
                        tuple.getT2(), rollup, workload);
                });
        });
}
```

### 3-2-7. 완료 조건

- [ ] PO Backlog View API 구현 및 테스트
- [ ] PM Workboard View API 구현 및 테스트 (**allowedPartIds 스코프 강제 포함**)
- [ ] PMO Portfolio View API 구현 및 테스트
- [ ] ViewService 내부 3계층 분리 (ScopedQuery / Aggregator / Presenter)
- [ ] PMO View에 이벤트 기반 KPI 3개 포함 (리드타임, REVIEW 체류, 스프린트 완료율)
- [ ] PMO dataQuality에 Integrity/Readiness 2층 분리 및 점수화
- [ ] View API 응답에 warnings 필드로 데이터 문제 노출
- [ ] 각 KPI의 계산식이 `VIEW_CONTRACTS.md`에 문서화

---

## 3-3. UI "공통 Shell + Workbench" 패턴

### 3-3-1. 설계 원칙

> 같은 프로젝트 안에서 PO/PM/PMO **탭이 다르게 구성**된다.
> 편집/승인/내보내기 같은 액션은 `CapabilityGate`로 분기한다.
> 실제 보안은 항상 **UI Gate + 서버 403 (둘 다)**.

### 3-3-2. UI 구조

```
┌─────────────────────────────────────────────────────┐
│  ProjectShell (프로젝트 선택, 사용자 정보, 네비게이션)  │
├─────────────────────────────────────────────────────┤
│  [PO Backlog] | [PM Workboard] | [PMO Portfolio]    │  ← capability 교집합으로 탭 노출
│  (사용자 capabilities와 탭 요구 capabilities의 교집합) │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Workbench 영역 (선택된 탭에 따라 다른 컴포넌트)        │
│                                                     │
│  PO: Epic Tree → Backlog Items → Story Rollup       │
│  PM: Sprint Board → Story Cards → Task Assign       │
│  PMO: KPI Dashboard → Part Comparison → Audit Log   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 3-3-3. 탭 노출 로직: capability intersection

탭 노출은 **사용자 capabilities**와 **탭 요구 capabilities**의 교집합으로 결정한다.

```typescript
// TAB_DEFINITIONS — 각 탭이 요구하는 capabilities
const TAB_DEFINITIONS = [
  { key: 'po-backlog', label: 'PO Backlog', required: ['VIEW_BACKLOG'] },
  { key: 'pm-workboard', label: 'PM Workboard', required: ['VIEW_STORY'] },
  { key: 'pmo-portfolio', label: 'PMO Portfolio', required: ['VIEW_KPI'] },
] as const;

// ProjectShell.tsx에서 탭 노출
function ProjectShell() {
  const { capabilities } = useProjectAuth();
  const visibleTabs = TAB_DEFINITIONS.filter(tab =>
    tab.required.every(cap => capabilities.includes(cap))
  );
  // ...
}
```

> **중요**: 실제 데이터 호출 훅(`useViews`)은 `enabled` 조건을 **반드시** 걸어야 한다.
> 권한 없는 사용자가 API를 때리지 않게.

### 3-3-4. 프론트엔드 라우팅

```typescript
// routes.tsx
<Route path="/projects/:projectId" element={<ProjectShell />}>
  <Route path="po-backlog" element={
    <CapabilityGate required={['VIEW_BACKLOG']}>
      <PoBacklogWorkbench />
    </CapabilityGate>
  } />
  <Route path="pm-workboard" element={
    <CapabilityGate required={['VIEW_STORY']}>
      <PmWorkboardWorkbench />
    </CapabilityGate>
  } />
  <Route path="pmo-portfolio" element={
    <CapabilityGate required={['VIEW_KPI']}>
      <PmoPortfolioWorkbench />
    </CapabilityGate>
  } />
</Route>
```

### 3-3-5. Workbench 컴포넌트 구성

#### PO Backlog Workbench

```typescript
export function PoBacklogWorkbench() {
  const { projectId } = useParams();
  const { capabilities } = useProjectAuth();
  const { data } = usePoBacklogView(projectId);

  return (
    <div>
      <BacklogSummaryCards summary={data?.summary} />
      <EpicTreePanel epics={data?.epics} />
      <BacklogItemTable
        items={data?.backlogItems}
        actions={
          <>
            <CapabilityGate required={['EDIT_BACKLOG_ITEM']}>
              <EditBacklogButton />
            </CapabilityGate>
            <CapabilityGate required={['APPROVE_BACKLOG_ITEM']}>
              <ApproveButton />
            </CapabilityGate>
          </>
        }
      />
      {data?.unlinkedStories?.length > 0 && (
        <WarningPanel title="미분류 스토리" items={data.unlinkedStories} />
      )}
    </div>
  );
}
```

#### PM Workboard Workbench

```typescript
export function PmWorkboardWorkbench() {
  const { projectId } = useParams();
  const { data } = usePmWorkboardView(projectId);

  return (
    <div>
      <SprintSummaryCards summary={data?.summary} />
      <SprintBoard
        sprint={data?.activeSprint}
        actions={
          <CapabilityGate required={['MANAGE_SPRINT']}>
            <StartSprintButton />
            <CompleteSprintButton />
          </CapabilityGate>
        }
      />
      <BacklogStoryList
        stories={data?.backlogStories}
        actions={
          <CapabilityGate required={['ASSIGN_TASK']}>
            <AssignToSprintButton />
          </CapabilityGate>
        }
      />
      <PartWorkloadChart workload={data?.summary?.partWorkload} />
    </div>
  );
}
```

#### PMO Portfolio Workbench

```typescript
export function PmoPortfolioWorkbench() {
  const { projectId } = useParams();
  const { data } = usePmoPortfolioView(projectId);

  return (
    <div>
      {/* Coverage KPIs + Operational KPIs */}
      <KpiDashboard
        coverage={data?.kpis?.coverage}
        operational={data?.kpis?.operational}
      />

      {/* DataQuality: Integrity + Readiness 분리 표시 */}
      <DataQualityPanel
        integrity={data?.dataQuality?.integrity}
        readiness={data?.dataQuality?.readiness}
        score={data?.dataQuality?.score}
      />

      <PartComparisonTable parts={data?.partComparison} />

      {data?.warnings?.length > 0 && (
        <WarningBanner warnings={data.warnings} />
      )}

      <CapabilityGate required={['VIEW_AUDIT_LOG']}>
        <AuditLogPanel projectId={projectId} />
      </CapabilityGate>
      <CapabilityGate required={['EXPORT_REPORT']}>
        <ExportReportButton projectId={projectId} />
      </CapabilityGate>
    </div>
  );
}
```

### 3-3-6. React Query Hook 패턴

```typescript
// hooks/api/useViews.ts
export function usePoBacklogView(projectId?: string) {
  const { capabilities } = useProjectAuth();
  return useQuery({
    queryKey: ['views', 'po-backlog', projectId],
    queryFn: () => apiService.getPoBacklogView(projectId!),
    // capability + projectId 둘 다 있어야 호출
    enabled: !!projectId && capabilities.includes('VIEW_BACKLOG'),
  });
}

export function usePmWorkboardView(projectId?: string) {
  const { capabilities } = useProjectAuth();
  return useQuery({
    queryKey: ['views', 'pm-workboard', projectId],
    queryFn: () => apiService.getPmWorkboardView(projectId!),
    enabled: !!projectId && capabilities.includes('VIEW_STORY'),
  });
}

export function usePmoPortfolioView(projectId?: string) {
  const { capabilities } = useProjectAuth();
  return useQuery({
    queryKey: ['views', 'pmo-portfolio', projectId],
    queryFn: () => apiService.getPmoPortfolioView(projectId!),
    enabled: !!projectId && capabilities.includes('VIEW_KPI'),
  });
}
```

### 3-3-7. 완료 조건

- [ ] `ProjectShell` 공통 레이아웃 구현 (capability intersection 기반 탭 노출)
- [ ] `PoBacklogWorkbench` 구현 (backlog_items 중심)
- [ ] `PmWorkboardWorkbench` 구현 (stories/sprint 중심)
- [ ] `PmoPortfolioWorkbench` 구현 (KPI + Integrity/Readiness 분리)
- [ ] `CapabilityGate`로 액션 버튼 분기 + 편집 버튼은 **UI Gate + 서버 403** 둘 다 검증
- [ ] React Query hooks에 `enabled` 조건으로 capability 체크 포함
- [ ] 각 Workbench가 해당 View API만 호출하는지 확인

---

## 3-4. 구현 순서 (가장 안전한 6단계)

> Phase 3에서 흔한 실패: **편집부터 하다가 권한/스코프가 꼬여서 일정이 터지는 것**.
> 아래 순서대로 "읽기 화면 먼저 살아나고, 그 다음 편집 보안이 붙는" 전략을 따른다.

| 단계 | 작업 | 소요 | 산출물 |
|---|---|---|---|
| **1** | JWT 클레임 확장 + Principal에 project별 scope/capability 리졸브 유틸 | 0.5일 | `JwtTokenProvider` 수정, `ProjectScopeResolver` 생성 |
| **2** | `ReactiveProjectSecurityService` 확장: `hasCapability()`, `assertPartScope()`, `assertStoryScope()` | 0.5일 | 메서드 추가 + 단위 테스트 |
| **3** | ViewApiController 3개 엔드포인트 + DTO 스켈레톤 | 0.5일 | Controller + DTO 클래스 (빈 데이터) |
| **4** | ViewService 조립: ScopedQuery → Aggregator → Presenter (읽기 화면 완성) | 1~2일 | 3개 View API 동작 확인 |
| **5** | 프론트 ProjectShell + 탭 + Workbench 3개 (읽기 우선) | 1~2일 | 화면 동작 확인 |
| **6** | 편집 액션 API에 scope 강제 추가 + CapabilityGate 연결 | 0.5~1일 | 수정/승인/할당 API에 scope 검증 |

> **왜 이 순서인가**: 1~4가 완료되면 "읽기 전용 화면"이 살아난다.
> 5에서 프론트가 붙고, 6에서 "편집 보안"이 마지막에 붙는다.
> 편집을 마지막으로 미루면 scope 꼬임의 위험이 줄어든다.

---

## 3-5. 추가 산출물 (Phase 4 연계를 위한 최소 보완)

Phase 4가 훨씬 쉬워지도록, Phase 3에서 다음 3개를 **반드시** 만든다.

### 3-5-1. ScopeAssertionsTest.java (통합 테스트)

```java
@SpringBootTest
@AutoConfigureWebTestClient
class ScopeAssertionsTest {

    @Test
    void pm_cannot_edit_story_outside_own_part() {
        // PM (part-001-ai) → story in part-001-si → 403
    }

    @Test
    void pmo_cannot_call_edit_apis() {
        // PMO → PUT /stories/{id} → 403
        // PMO → POST /sprints → 403
    }

    @Test
    void po_cannot_manage_sprints() {
        // PO → POST /sprints/{id}/start → 403
    }

    @Test
    void pm_sees_only_own_part_stories_in_workboard() {
        // PM (part-001-ai) → GET /views/pm-workboard
        // → 응답에 part-001-si 스토리 없음 확인
    }

    @Test
    void project_a_capability_does_not_apply_to_project_b() {
        // PM (proj-001, VIEW_STORY) → GET /proj-002/views/pm-workboard → 403
    }
}
```

### 3-5-2. VIEW_CONTRACTS.md

각 View API가 포함하는 필드/KPI 정의/스코프 규칙을 문서화한다.

```markdown
# View API 계약 명세

## PO Backlog View
- endpoint: GET /api/projects/{projectId}/views/po-backlog
- capability: VIEW_BACKLOG
- scope: 프로젝트 전체
- KPIs: requirementCoverage, storyDecompositionRate
- KPI 계산식: (위 3-2-3 참조)

## PM Workboard View
- endpoint: GET /api/projects/{projectId}/views/pm-workboard
- capability: VIEW_STORY
- scope: allowedPartIds 제한 (서비스 레이어에서 강제)
- KPIs: sprintVelocity, partWorkload
- 보안 주의: scopedPartIds가 DTO에 노출됨 (디버깅/감사용)

## PMO Portfolio View
- endpoint: GET /api/projects/{projectId}/views/pmo-portfolio
- capability: VIEW_KPI
- scope: 프로젝트 전체 (읽기 전용)
- KPIs: coverage(5개) + operational(3개, 이벤트 기반)
- dataQuality: integrity(무결성) + readiness(운영준비) 2층
- 점수 산정: integrityScore × 0.6 + readinessScore × 0.4
```

### 3-5-3. DATA_QUALITY_RULES.md

warning 타입 목록 + 의미 + 임계치를 문서화한다.

```markdown
# 데이터 품질 규칙 정의

## Warning 타입

| Type | Severity | 의미 | 임계치 | 카테고리 |
|---|---|---|---|---|
| LOW_DATA_QUALITY | DANGER | 종합 품질 점수 미달 | totalScore < 50 | score |
| LOW_REQUIREMENT_TRACE | WARNING | 요구사항 추적률 부족 | < 80% | coverage |
| LOW_STORY_DECOMPOSITION | WARNING | 스토리 분해율 부족 | < 70% | coverage |
| LOW_EPIC_COVERAGE | WARNING | Epic 미배정 스토리 과다 | < 80% | coverage |
| LOW_PART_ASSIGNMENT | WARNING | Part 미배정 스토리 과다 | < 90% | readiness |
| HIGH_REVIEW_DWELL | WARNING | REVIEW 체류시간 과다 (병목) | > 30% | operational |
| LOW_SPRINT_COMPLETION | WARNING | 스프린트 완료율 부족 | < 70% | operational |
| UNASSIGNED_PART | INFO | 개별 스토리 Part 미배정 | - | readiness |
| INVALID_REFERENCE | CRITICAL | 존재하지 않는 ID 참조 | > 0건 | integrity |
| MISMATCH_DETECTED | CRITICAL | 데이터 불일치 감지 | > 0건 | integrity |

## CI 게이트 연계 (Phase 4)
- integrityScore < 80 → HARD FAIL
- readinessScore < 50 → WARNING
- totalScore < 30 → HARD FAIL
```

---

## 산출물 체크리스트

| # | 파일/컴포넌트 | 용도 | 구현 단계 |
|---|---|---|---|
| 1 | `JwtTokenProvider.java` 수정 | 토큰에 projectRoles 클레임 추가 | 단계 1 |
| 2 | `ProjectScopeResolver.java` 생성 | 토큰 → Map<projectId, ProjectScope> 변환 | 단계 1 |
| 3 | `ReactiveProjectSecurityService.java` 확장 | hasCapability, assertPartScope, assertStoryScope 추가 | 단계 2 |
| 4 | `ViewApiController.java` 생성 | 역할별 View API 엔드포인트 | 단계 3 |
| 5 | `ViewService.java` 생성 | View Model 3계층 조립 서비스 | 단계 4 |
| 6 | `PoBacklogView.java` DTO | PO View 응답 모델 | 단계 3 |
| 7 | `PmWorkboardView.java` DTO | PM View 응답 모델 | 단계 3 |
| 8 | `PmoPortfolioView.java` DTO | PMO View 응답 모델 | 단계 3 |
| 9 | `KpiCalculator.java` 생성 | KPI 계산 (coverage + operational) | 단계 4 |
| 10 | `DataQualityCalculator.java` 생성 | Integrity/Readiness 2층 점수 산출 | 단계 4 |
| 11 | `CapabilityGate.tsx` 생성 | 프론트 권한 분기 컴포넌트 | 단계 5 |
| 12 | `useProjectAuth.ts` 생성 | 토큰에서 capabilities/scope 추출 훅 | 단계 5 |
| 13 | `ProjectShell.tsx` 생성 | 공통 Shell (capability intersection 탭 노출) | 단계 5 |
| 14 | `PoBacklogWorkbench.tsx` 생성 | PO 전용 Workbench | 단계 5 |
| 15 | `PmWorkboardWorkbench.tsx` 생성 | PM 전용 Workbench | 단계 5 |
| 16 | `PmoPortfolioWorkbench.tsx` 생성 | PMO 전용 Workbench (Integrity/Readiness 분리) | 단계 5 |
| 17 | `useViews.ts` 생성 | View API React Query Hook (enabled 조건 포함) | 단계 5 |
| 18 | `ScopeAssertionsTest.java` 생성 | 스코프/권한 통합 테스트 (5개 시나리오) | 단계 6 |
| 19 | `VIEW_CONTRACTS.md` 생성 | View API 필드/KPI/스코프 계약 명세 | 단계 4 |
| 20 | `DATA_QUALITY_RULES.md` 생성 | Warning 타입/임계치/CI 연계 규칙 정의 | 단계 4 |

---

## 롤백 계획

Phase 3은 **기존 API를 변경하지 않고** 새 엔드포인트(View API)를 추가하는 방식이므로,
롤백은 비교적 안전하다.

| 롤백 대상 | 방법 |
|---|---|
| JWT 클레임 확장 | 기존 토큰 구조로 복원 (subject-only). 새 클레임은 하위호환 |
| `ReactiveProjectSecurityService` 확장 | 새 메서드 제거. 기존 `hasRole()` 체인은 그대로 유지 |
| View API 엔드포인트 | `/api/projects/{projectId}/views/*` 경로 전체 제거 |
| 프론트 Workbench | 라우팅에서 해당 경로 제거. 기존 화면은 그대로 |

> **주의**: JWT 클레임 변경 시, 기존 토큰과의 하위호환을 유지해야 한다.
> 새 클레임(`projectRoles`)이 없는 토큰은 "기존 role 기반 체크"로 폴백하도록 구현한다.

---

## Phase 3 vs Phase 4 책임 분리

| 항목 | Phase 3 | Phase 4 |
|---|---|---|
| **권한 강제** | capability + scope (서비스 레이어) | - |
| **View API** | 3개 (PO/PM/PMO) 신규 생성 | - |
| **KPI 계산** | coverage 5개 + operational 3개 (이벤트 기반) | KPI 대시보드 확장 |
| **dataQuality** | Integrity/Readiness 2층 + 점수화 | CI 게이트로 점수 연동 |
| **FK 제약조건** | 없음 (Phase 2까지의 데이터 계약에 의존) | 실제 FK 추가 |
| **통합 테스트** | ScopeAssertionsTest (5개 시나리오) | CI 자동화 + 데이터 품질 게이트 |
| **문서** | VIEW_CONTRACTS.md, DATA_QUALITY_RULES.md | CI 게이트 스크립트 + PMO 대시보드 확장 |

---

## 다음 Phase 의존 관계

Phase 3 완료 후:

- **Phase 4**: View API가 참조하는 데이터에 FK 제약조건 도입으로 안정성 강화
- PMO Portfolio View의 `dataQuality.score`가 Phase 4의 **CI 게이트 기준**으로 연결
- `DATA_QUALITY_RULES.md`의 임계치가 Phase 4의 `ci_data_quality_check.sql`로 변환
- `ScopeAssertionsTest`가 Phase 4의 CI 파이프라인에 포함
