# Phase 6 실행 계획서: Epic-Story 관계 일관성 정규화

> **목표**: Epic-Story 관계를 **ID 기반 단일 진실(Single Source of Truth)**로 고정하고,
> UI 계층별 해석 불일치를 구조적으로 제거한다.

---

## 0. Phase 6의 성격 정의

Phase 6은 **"기능 추가"가 아니라 "관계 의미를 고정하는 데이터 계약 수정"**이다.

데이터의 '정체성(ID)'와 '표현(name)'이 섞여서 UI 계층마다 서로 다른 기준으로 해석되고 있다.
이를 해소하기 위해 세 가지 조건이 필수다:

| 조건 | 설명 |
| --- | --- |
| **점진 배포** | Backend 먼저, Frontend 후속 — 한 쪽만 롤백 가능 |
| **하위 호환 유지** | `epic`(name) 유지, `epicId`(ID) 추가 — 기존 소비자 무중단 |
| **관측 가능성 확보** | 폴백 제거 시점을 감이 아닌 메트릭으로 결정 |

---

## 1. 현황 진단

### 1.1 두 세계의 공존

| 계층 | Epic을 무엇으로 보는가 | 예시 |
| --- | --- | --- |
| DB `task.user_stories` | `epic_id` (FK) | `epic-001-01` |
| DB `task.user_stories` | `epic` (name, 레거시) | `"문서 처리 자동화"` |
| Backend Entity (`R2dbcUserStory`) | 둘 다 보유 | `epicId` + `epic` |
| **API Response** (`UserStoryResponse`) | **name만 전달** | `epic: "문서 처리 자동화"` |
| Frontend `useStories` | `epic: string` (name) | `"문서 처리 자동화"` |
| Frontend `EpicTreeView` | `epic.id` 기준 조인 | `epic-001-01` |

### 1.2 문제의 근본 원인

```text
UserStoryResponse.fromEntity():
  .epic(story.getEpic())     // name만 전달
  // epicId는 매핑하지 않음    // ID 누락!
```

API가 `epicId`를 전달하지 않으므로 프론트엔드는 epic name만 알 수 있다.
`BacklogManagement`에서 `epicId: s.epic`으로 매핑하면서 **name이 ID 자리에 들어가는 개념적 거짓말**이 발생한다.

### 1.3 영향 범위

| 뷰 | 동작 | 이유 |
| --- | --- | --- |
| 목록 보기 | 정상 | 문자열 비교 없이 status로만 분류 |
| 계층 보기 | **Epic 하위 0/0 SP** | `s.epicId === epic.id` 비교 실패 (name vs ID) |
| 스프린트 패널 | 정상 | status 기반 필터링만 사용 |
| 통계 카드 | 정상 | 전체 배열 길이/합산만 사용 |

### 1.4 추가 발견: EpicTreeView의 이중 필터링

```typescript
// EpicTreeView.tsx:385 - 도메인 규칙을 뷰에서 재정의
const backlogStories = stories.filter(
  s => (s.status === 'IDEA' || s.status === 'REFINED' || s.status === 'READY') && !s.sprintId
);
```

`BacklogManagement`가 이미 필터링한 데이터를 넘겨도, `EpicTreeView`가 자체적으로 다시 필터링하여
IN_PROGRESS, IN_SPRINT, DONE 상태의 스토리가 계층 뷰에서 사라진다.

### 1.5 리스크 분석

| 리스크 | 설명 | 결과 |
| --- | --- | --- |
| **과도기 폴백 영구화** | `epicId ?? epic` 폴백이 제거되지 않고 고착 | name이 ID 자리에 들어가는 구조가 "합법적으로" 영속화 |
| **레거시 데이터 방치** | DB에 `epic_id`가 NULL이고 `epic`(name)만 있는 레코드 존속 | 매 릴리즈마다 같은 계열의 버그 재발 가능 |

---

## 2. 설계 원칙

### 2.1 일관성의 정의

> 일관성 = "값을 맞추는 것"이 아니라
> **"의미(ID vs name)를 분리하고, 그 규칙을 단 하나로 고정하는 것"**

세 가지 불변 규칙:

| 규칙 | 설명 |
| --- | --- |
| **ID는 오직 관계용** | `epicId`에는 반드시 `epic.id`만 담긴다 |
| **name은 오직 표시용** | `epicName`은 렌더링에만 사용 |
| **UI는 ID로 조인** | 필터/매칭은 ID, 화면 표시는 name |

### 2.2 완성을 위한 세 가지 축

단순히 "API 필드 추가"가 아니라 **"관계의 단일 진실을 강제하는 체계"**를 만들어야 한다.

| 축 | 원칙 | 위반 시 결과 |
| --- | --- | --- |
| **데이터 축** | 레거시 필드(`epic` name) 존재는 허용하되, **관계**는 반드시 `epic_id`로만 성립 | DB/백엔드에서 "epic name 기반 조인"이 발생하면 다시 무너짐 |
| **계약 축** | API 응답에 `epicId`를 넣는 것은 시작. **`epicId` 누락 시 경고/가드**가 있어야 재발 방지 | 프론트 폴백이 "문제 숨김"이 됨 |
| **UX 축** | 리스트/트리가 서로 다른 필터 규칙을 갖지 않도록 **필터링 책임을 한 곳에 집중** | 같은 스토리를 다른 뷰에서 다르게 해석 |

### 2.3 선택지 비교

| 선택지 | 접근 방식 | 평가 |
| --- | --- | --- |
| A | `EpicTreeView`를 name 기준으로 변경 | 이름 변경 시 관계 붕괴, 중복 이름 불가, 안티패턴 |
| B | `epicId`에 ID 또는 name을 상황별 사용 | 타입 시스템 무력화, 현재 문제의 원인 그 자체 |
| **C** | **모델 분리 + ID를 단일 진실로** | 아키텍처적 정답, 장기 안정성 확보 |

**선택지 C를 채택한다.**

---

## 3. 배포 전략

### 3.1 배포 원칙

| 항목 | 원칙 |
| --- | --- |
| 배포 순서 | **Backend → Frontend → Cleanup** |
| 하위 호환 | `epic`(name) 유지, `epicId`(ID) 추가 |
| 폴백 | 허용하되 관측 가능해야 함 |
| 제거 시점 | **데이터 상태 기반**으로 결정 (시간 X) |
| 롤백 | Frontend 폴백 유지 상태에서 Backend만 롤백 가능 |

### 3.2 전체 흐름도

```text
[DB] epic_id 채우기 (NULL 해소)            ← Step 0 (사전 작업)
  ↓
[Backend Entity] R2dbcUserStory.epicId
  ↓
[API Response] UserStoryResponse.epicId    ← PR-6.1 (계약 확장)
  ↓
[Frontend Hook] useStories → epicId        ← PR-6.2 (정규화 계층)
  ↓
[BacklogManagement] 뷰 모델 분리           ← PR-6.3 (필터 책임 집중)
  ↓
[EpicTreeView] s.epicId === epic.id        ← 이미 정답 (변경 불필요)
  ↓
[검증 테스트] 일관성 자동 검증              ← PR-6.4 (재발 방지)
  ↓
[Cleanup] 폴백 제거 + 레거시 정리           ← PR-6.5 (조건부)
```

### 3.3 PR 단위 요약

| PR | 범위 | 성격 | 롤백 영향 |
| --- | --- | --- | --- |
| Step 0 | DB Migration SQL | 레거시 데이터 정리 (1회성) | 없음 (추가 데이터만) |
| PR-6.1 | Backend API | `epicId` 전달 (계약 확장) | Frontend 폴백이 커버 |
| PR-6.2 | Frontend 타입/훅 | `epicId` 수용 + 정규화 | 기존 `epic` 필드 유지 |
| PR-6.3 | UI 로직 | EpicTreeView 정합성 복구 | PR-6.2 필요 |
| PR-6.4 | 검증 테스트 | 일관성 검증 자동화 | 없음 (테스트만) |
| PR-6.5 | Cleanup (후속) | 폴백 제거 + 레거시 정리 | 메트릭 0 확인 후 실행 |

---

## 4. 단계별 실행 계획

### Step 0: DB 레거시 데이터 정리 (사전 작업, 1회성)

> API에 `epicId`를 추가해도, DB에 `epic_id`가 NULL인 레코드가 많으면
> 프론트엔드 폴백이 영원히 필요하다. **데이터부터 정리해야 폴백을 짧게 가져갈 수 있다.**

**사전 검증** (실행 전 반드시 확인):

```sql
-- 1) 매칭 대상 확인 (dry-run)
SELECT us.id, us.epic, e.id as matched_epic_id, e.name
FROM task.user_stories us
JOIN project.epics e ON us.epic = e.name AND e.project_id = us.project_id
WHERE us.epic_id IS NULL AND us.epic IS NOT NULL;

-- 2) epic name 유니크 검증 (프로젝트 내 중복 이름 확인)
SELECT project_id, name, COUNT(*) as cnt
FROM project.epics
GROUP BY project_id, name
HAVING COUNT(*) > 1;
-- 결과가 있으면 중복 epic name 존재 → 수동 해소 필요
```

**실행 SQL** (1회성):

```sql
-- epic_id가 NULL이고 epic(name)이 있는 스토리를 epic 테이블과 매칭
UPDATE task.user_stories us
SET epic_id = e.id
FROM project.epics e
WHERE us.epic_id IS NULL
  AND us.epic IS NOT NULL
  AND us.epic = e.name
  AND e.project_id = us.project_id;
```

**매칭 불가 레코드 처리**:

- epic name이 프로젝트 내에서 유니크하지 않으면 → 수동 해소
- epic 테이블에 없는 name이면 → `epic_id` NULL 유지, 프론트에서 "Epic 미지정" 표시

---

### PR-6.1: Backend — API 계약 확장

**목적**: Epic 관계의 ID를 최초로 외부에 노출. 기존 API 소비자에 영향 없이 계약 확장.

**파일**: `PMS_IC_BackEnd_v1.2/.../task/dto/UserStoryResponse.java`

```java
@Builder
public record UserStoryResponse(
    String id,
    String epic,        // name (표시용, 하위 호환)
    String epicId,      // ★ ID (관계용)
    // ...
) {
    public static UserStoryResponse fromEntity(R2dbcUserStory story) {
        return UserStoryResponse.builder()
            .epic(story.getEpic())
            .epicId(story.getEpicId())   // ★ 핵심
            .build();
    }
}
```

**관측 가능성 추가** (epicId 누락 추적):

```java
// ReactiveUserStoryController 또는 Service 계층
if (story.getEpicId() == null && story.getEpic() != null) {
    log.warn("MISSING_EPIC_ID: story={}, epicName={}, projectId={}",
             story.getId(), story.getEpic(), story.getProjectId());
    // Metric: missing_epic_id_count.increment()
}
```

> **이걸 넣는 이유**: 폴백이 남아있는 기간에도 "언제 폴백이 0이 되는지"를 데이터로 확인 가능.
> 폴백 제거 시점을 감이 아닌 메트릭으로 결정할 수 있다.

**테스트**:

- `UserStoryResponseTest` — `epicId` 필드가 JSON 응답에 포함되는지 확인
- `epicId`가 null일 때 경고 로그 발생 확인

```java
@Test
void fromEntity_includesEpicId() {
    R2dbcUserStory entity = R2dbcUserStory.builder()
        .id("story-001-01")
        .epic("문서 처리 자동화")
        .epicId("epic-001-01")
        .build();

    UserStoryResponse response = UserStoryResponse.fromEntity(entity);

    assertThat(response.epicId()).isEqualTo("epic-001-01");
    assertThat(response.epic()).isEqualTo("문서 처리 자동화");
}
```

**DoD (PR-6.1)**:

- [ ] API JSON에 `epicId` 필드 포함
- [ ] 기존 필드(`epic`) 제거 없음
- [ ] `epicId` 누락 레코드 관측 가능 (로그/메트릭)
- [ ] 기존 API 소비자 무중단

---

### PR-6.2: Frontend — 타입 + 데이터 정규화

**목적**: 프론트엔드가 ID 기반 관계를 인식하도록 구조 변경. UI 컴포넌트는 "정규화된 데이터"만 받게 함.

#### 6.2-A. 타입 정의

**파일**: `PMS_IC_FrontEnd_v1.2/src/utils/storyTypes.ts`

```typescript
export interface UserStory {
  id: string;
  epic: string;          // epic name (표시용, 하위 호환)
  epicId: string | null;  // ★ epic ID (관계용) - null이면 "미지정"
  // ...
}
```

**`string | null` vs `string?` 선택 이유**:

| 타입 | 의미 | 결과 |
| --- | --- | --- |
| `epicId?: string` | "있을 수도 없을 수도" | optional이 퍼지면 모든 소비자에서 폴백/예외처리 반복 |
| `epicId: string / null` | "반드시 존재하되, 값이 없으면 null" | hook에서 정규화 완료, UI는 null만 체크 |

> **원칙**: `useStories()` hook 내부에서 정규화를 완료하고,
> UI 컴포넌트에는 항상 같은 형태(`string | null`)로 전달한다.
> UI는 `null`이면 "Epic 미지정"으로 분리 표시.

**주의**: `epic` 필드를 제거하지 않는다. 기존 코드 호환성 유지.

#### 6.2-B. useStories 훅 — 정규화 계층 역할

**파일**: `PMS_IC_FrontEnd_v1.2/src/hooks/api/useStories.ts`

```typescript
// useStories가 "정규화 계층" 역할
return data.map((story: any) => ({
  // ...
  epic: story.epic || '',           // name (표시용)
  epicId: story.epicId || null,     // ★ ID (관계용) - 없으면 명시적 null

  // ★ 과도기 관측: epicId 누락 감지
  ...(story.epic && !story.epicId && (() => {
    console.warn(`[useStories] Missing epicId for story ${story.id}, epic="${story.epic}"`);
    return {};
  })()),
}));
```

> **정규화 책임의 위치**: `epic name → epicId` 매핑은 UI 컴포넌트에서 하지 않는다.
> 정규화 실패는 hook에서 끝내야 함. UI는 `epicId === null`을 "미지정 Epic"으로만 취급.

**Mock 데이터**도 `epicId` 추가:

```typescript
const initialStories: UserStory[] = [
  {
    id: 'story-001-01',
    epic: '문서 처리 자동화',
    epicId: 'epic-001-01',      // ★ 추가
    // ...
  },
  {
    id: 'story-001-02',
    epic: '사기 탐지 시스템',
    epicId: 'epic-001-02',      // ★ 추가
    // ...
  },
  {
    id: 'story-001-03',
    epic: 'API 플랫폼 구축',
    epicId: 'epic-001-03',      // ★ 추가
    // ...
  },
  {
    id: 'story-001-04',
    epic: '보안 및 규정 준수',
    epicId: 'epic-001-04',      // ★ 추가
    // ...
  },
];
```

**DoD (PR-6.2)**:

- [ ] `UserStory`에 `epicId: string | null` 필드 존재
- [ ] `useStories` 반환 객체에 `epicId` 포함 (API + Mock 모두)
- [ ] UI 컴포넌트에서 `epic name → id` 변환 코드 없음
- [ ] `epicId` 누락 시 `console.warn` 발생 (과도기 관측)

---

### PR-6.3: UI — EpicTreeView 정합성 복구

**목적**: EpicTreeView를 순수 렌더러로 복원. 계층/목록 뷰 간 데이터 불일치 제거.

#### 6.3-A. BacklogManagement — epicId 매핑 수정 + 뷰 모델 분리

**파일**: `PMS_IC_FrontEnd_v1.2/src/app/components/BacklogManagement.tsx`

**epicId 매핑 수정**:

```typescript
// 변경 전 (line 272)
epicId: s.epic,      // ❌ name이 ID 자리에

// 변경 후
epicId: s.epicId || '',  // ★ ID 사용 (null이면 빈 문자열 → "Epic 미지정" 그룹)
```

> **`s.epicId || s.epic` 폴백을 쓰지 않는다.**
> 폴백을 허용하면 "언제 제거해야 하는지" 판단이 불가능해진다.
> 대신 `epicId`가 null이면 "Epic 미지정"으로 분류하여 문제를 **숨기지 않고 드러낸다.**

**뷰별 데이터 이름 명시화** (필터링 책임 한 곳에 집중):

```typescript
// 변경 전 - 모호한 이름
const backlogStories = selectedPartFilter ? ... : allBacklogStories;

// 변경 후 - 의도가 명확한 뷰 모델
const storiesForEpicTree = filterByPart(
  allBacklogStories.filter(s => s.status !== 'DONE' && s.status !== 'CANCELLED')
);
const storiesForListBacklog = filterByPart(
  stories.filter(s => isBacklogStatus(s.status))
).sort((a, b) => a.priority - b.priority);
const storiesForSprintPanel = filterByPart(
  stories.filter(s => isSprintStatus(s.status))
);
const storiesForDoneSection = filterByPart(
  stories.filter(s => isDoneStatus(s.status))
);
```

> **원칙**: 뷰 모델에 "의도 이름"을 붙이면,
> 나중에 "DONE도 트리에 보여줘야 하나?" 같은 정책 변경이 EpicTreeView 수정 없이 끝난다.

#### 6.3-B. EpicTreeView — status 재필터링 제거

**파일**: `PMS_IC_FrontEnd_v1.2/src/app/components/backlog/EpicTreeView.tsx`

```typescript
// 변경 전 (line 385) - 도메인 규칙을 뷰에서 재정의
const backlogStories = stories.filter(
  (s) => (s.status === 'IDEA' || s.status === 'REFINED' || s.status === 'READY') && !s.sprintId
);

// 변경 후 - 부모가 넘긴 데이터를 신뢰
// stories prop을 그대로 사용 (재필터링 삭제)
```

**원칙**: 도메인 필터링은 `BacklogManagement`에서 한 번만 수행.
`EpicTreeView`는 순수 렌더러로서, 받은 데이터를 그대로 조인하여 표시한다.

```typescript
// BacklogManagement 측 변경
// 변경 전 (line 943)
<EpicTreeView stories={backlogStories} />

// 변경 후
<EpicTreeView stories={storiesForEpicTree} />
```

#### 6.3-C. 목록 보기에 "완료" 섹션 렌더링 추가

현재 `doneStories`는 카운트(완료: 1)와 총 SP에만 사용되고, 개별 항목은 렌더링되지 않는다.

```typescript
// 목록 보기 하단에 완료 섹션 추가
{storiesForDoneSection.length > 0 && (
  <div className="mt-6 opacity-75">
    <h3 className="text-gray-500 font-semibold mb-3 flex items-center gap-2">
      <CheckCircle size={18} />
      완료된 스토리 ({storiesForDoneSection.length})
    </h3>
    {storiesForDoneSection.map((story) => (
      // 완료 스토리 렌더링 (회색/접기 처리)
    ))}
  </div>
)}
```

**UX 규칙 (DONE 스토리 처리 정책)**:

| 뷰 | DONE 스토리 처리 | 이유 |
| --- | --- | --- |
| 계층 보기 (트리) | **포함** (회색/접기) | Epic의 전체 진행률을 보여주기 위해 |
| 목록 보기 (리스트) | **별도 섹션**으로 분리 | 운영 중인 백로그와 구분하기 위해 |

> **핵심**: 두 뷰 모두 같은 원천(`stories`)에서 파생되되,
> 표시 정책은 뷰 모델(`storiesForEpicTree`, `storiesForDoneSection`)에서 한 번만 정의.

**DoD (PR-6.3)**:

- [ ] EpicTreeView 내부에 status 필터링 없음
- [ ] `epicId: s.epicId` 사용 (`s.epic` 아님)
- [ ] Epic 하위 스토리 SP/개수 정상 표시 (0/0 SP 해소)
- [ ] 목록 보기 ↔ 계층 보기 스토리 수 정합
- [ ] DONE 스토리 목록 보기에서 별도 섹션 렌더링

---

### PR-6.4: 검증 — 일관성 자동 테스트

**목적**: Phase 6 재발 방지 장치. "누군가 다시 name으로 조인"하면 즉시 실패.

**프론트엔드 일관성 테스트** (`useStories.test.tsx`):

```typescript
it('epic tree view can match all stories to epics by epicId', () => {
  // Given: 4 epics + 4 stories with epicId set
  const epics = [
    { id: 'epic-001-01', name: '문서 처리 자동화' },
    { id: 'epic-001-02', name: '사기 탐지 시스템' },
    { id: 'epic-001-03', name: 'API 플랫폼 구축' },
    { id: 'epic-001-04', name: '보안 및 규정 준수' },
  ];
  const stories = mockStories; // epicId가 설정된 스토리

  // When: EpicTreeView의 조인 로직 시뮬레이션
  const matchedCount = stories.filter(
    s => s.epicId && epics.some(e => e.id === s.epicId)
  ).length;

  // Then: 모든 스토리가 매칭되어야 함
  expect(matchedCount).toBe(stories.length);
});
```

> **이 테스트가 보호하는 것**: 누군가 다시 `epicId`에 name을 넣거나,
> `EpicTreeView`에 필터를 추가하면 즉시 깨진다.

**타입 안전성 검증**:

```bash
# TypeScript 컴파일 에러 0개 (기존 에러 제외)
npx tsc --noEmit 2>&1 | grep -c "error"

# 전체 테스트 통과
npx vitest run
```

**DoD (PR-6.4)**:

- [ ] 테스트 실패 시 Phase 6 퇴행 즉시 감지
- [ ] Mock 데이터에 `epicId` 포함
- [ ] CI에서 자동 검증

---

### PR-6.5: Cleanup — 폴백 제거 + 레거시 정리 (조건부)

> **실행 조건**: `missing_epic_id_count == 0`이 일정 기간 유지될 것

**작업 내용**:

1. Frontend `console.warn` 과도기 관측 코드 제거
2. `epicId || ''` 폴백 → `epicId` 필수화
3. Backend `UserStoryResponse`에서 `epic` 필드 `@Deprecated` 마킹
4. `epic`(name) 필드를 참조하는 코드 → `useEpics()`에서 이름 조회 방식으로 전환

**최종 목표 타입** (Phase 7 이후):

```typescript
export interface UserStory {
  id: string;
  title: string;
  description: string;
  epicId: string;          // ID만 (관계용)
  // epic 필드 제거       // name은 useEpics()에서 조회
  featureId?: string;
  sprintId?: string;
  partId?: string;
  status: StoryStatus;
  priority: number;
  storyPoints?: number;
  assignee?: string;
  acceptanceCriteria: string[];
}
```

**DoD (PR-6.5)**:

- [ ] `epicId` 필수화 (null 불허)
- [ ] name 기반 조인 코드 0개
- [ ] 타입 시스템이 관계 오류 차단

---

## 5. 파일별 변경 요약

| PR | 파일 | 변경 내용 | 위험도 |
| --- | --- | --- | --- |
| Step 0 | DB Migration SQL | `epic_id` NULL 레코드 채우기 (1회성) | 중간 |
| PR-6.1 | `UserStoryResponse.java` | `epicId` 필드 추가 + fromEntity 매핑 + 누락 로깅 | 낮음 |
| PR-6.2 | `storyTypes.ts` | `UserStory`에 `epicId: string / null` 추가 | 낮음 |
| PR-6.2 | `useStories.ts` | API 매핑 + Mock 데이터에 `epicId` 추가 + 과도기 관측 | 낮음 |
| PR-6.3 | `BacklogManagement.tsx` | `epicId: s.epicId` 사용 + 뷰 모델 이름 분리 + 완료 섹션 추가 | 중간 |
| PR-6.3 | `EpicTreeView.tsx` | status 재필터링 제거 (순수 렌더러로 전환) | 중간 |
| PR-6.4 | `useStories.test.tsx` | Mock 데이터에 `epicId` 추가 + 일관성 테스트 | 낮음 |

---

## 6. Phase 6 최종 DoD (Phase 완료 선언 기준)

> Phase 6이 끝났다고 말할 수 있는 조건을 "코드 변경"이 아니라 **"상태"**로 정의한다.
>
> Phase 6은 **아래 6개가 동시에 만족될 때만 "완료"**다.

| # | 조건 | 검증 방법 |
| --- | --- | --- |
| 1 | API 응답에 `epicId`가 포함된다 | `curl /projects/{id}/user-stories` 응답에 `epicId` 존재 |
| 2 | 프론트 트리 조인이 실제로 매칭된다 | 계층 보기에서 0/0 SP가 사라짐 |
| 3 | EpicTreeView 내부에 status 기반 재필터링이 없다 | 코드 리뷰 확인 |
| 4 | **missing epicId가 0이다** (또는 추적 가능하다) | 서버 로그 `MISSING_EPIC_ID` 카운트 = 0 |
| 5 | **name 기반 ID 폴백이 존재하지 않는다** | 코드 검색: `epicId` 폴백 패턴 결과 0건 |
| 6 | 폴백 제거 시점이 **데이터 기반**으로 정의됨 | missing count = 0 확인 후 PR-6.5 실행 |

> **조건 4, 5가 핵심이다.**
> "코드를 고쳤다"가 아니라 "데이터가 정규화되었다"를 확인해야 완성이다.
>
> 폴백 제거 시점은 기한이 아닌 메트릭으로 결정한다:
> **"missing epicId count = 0 확인 후 폴백 제거"**

---

## 7. 향후 확장 (Phase 7+)

이 정규화가 완료되면 동일한 패턴을 적용할 수 있는 영역:

| 관계 | 현재 상태 | 목표 |
| --- | --- | --- |
| Story → Feature | `featureId` 이미 ID 기반 | 유지 |
| Feature → Epic | `epicId` ID 기반 | 유지 |
| Story → Sprint | `sprintId` ID 기반 | 유지 |
| Story → WBS Item | `wbsItemId` ID 기반 | 유지 |
| **Story → Epic** | **`epic` name 기반** | **`epicId` ID 기반으로 전환 (이 Phase)** |
| Epic → Phase | `phaseId` ID 기반 | 유지 |

Story → Epic만 정리하면 **모든 엔티티 관계가 ID 기반으로 통일**된다.

### 7.1 Phase 7 전제 조건

- Phase 6 DoD 조건 6개 모두 충족
- `epic` name 필드를 참조하는 코드가 모두 `useEpics()`에서 이름을 조회하는 방식으로 전환 완료
- Backend `UserStoryResponse`에서 `epic` 필드를 `@Deprecated` 마킹

---

## 8. 한 줄 결론

> Phase 6은 "epicId를 추가하는 작업"이 아니라
> **"Epic-Story 관계의 의미를 시스템 전체에서 고정하는 작업"**이다.
>
> **EpicTreeView의 `s.epicId === epic.id` 비교는 "버그"가 아니라 "올바른 설계"였다.**
> 버그는 그 위(API/Hook)에서 ID 대신 name을 흘려보낸 데이터 계층에 있었다.
>
> 이 문서 순서대로 진행하면, 이후 Feature/WBS/Phase 관계 정규화도
> 동일한 패턴으로 안전하게 반복할 수 있다.
