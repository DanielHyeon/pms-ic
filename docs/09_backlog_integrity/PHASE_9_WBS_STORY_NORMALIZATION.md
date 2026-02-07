# Phase 9 실행 계획서: WBS-Story 관계 정규화 (계층 관계 안정화)

> **목표**: Story는 WBS의 **한 노드(`wbsItemId`)만 참조**하고,
> WBS의 계층 구조는 WBS 테이블이 단독으로 책임진다.
> Story는 경로(path)나 부모 정보를 **절대 들고 있지 않는다.**

---

## 0. Phase 9의 성격 정의

### Epic · Feature와의 비교

| 항목 | Epic (Phase 6-7) | Feature (Phase 8) | WBS (Phase 9) |
| --- | --- | --- | --- |
| DB 상태 | `epic`(name) + `epic_id` 공존 | `feature_id`만 존재 | `wbs_item_id`만 존재 |
| API Response | `epic`만 전달, `epicId` 누락 | `featureId` 전달 중 | **`wbsItemId` 누락** |
| Frontend 매핑 | `epic`만 매핑 | `featureId` 매핑 | **`wbsItemId` 미매핑** |
| name/path 중복 | **있음** (epic name) | 없음 | 없음 |
| 성격 | 전환 (name → ID) | 강화 (가드 추가) | **계약 확장 + 이중 경로 정리** |

> **Phase 9는 Phase 6과 Phase 8의 중간**이다:
> - name/path 중복 저장 문제는 **없다** (Phase 8처럼 깨끗)
> - 그러나 API Response에 `wbsItemId`가 누락되어 있다 (Phase 6과 동일 패턴)
> - 추가로 **이중 관계 경로** (직접 FK + 링킹 테이블) 정리가 필요하다

---

## 1. Phase 9 진입 게이트 (필수)

| # | 게이트 조건 | 검증 방법 |
| --- | --- | --- |
| G1 | Phase 8 완료 (Feature-Story 관계 강화 완료) | Phase 8 DoD 체크리스트 |
| G2 | WBS Item 테이블에 `id`, `group_id` 존재 | DB 스키마 확인 |
| G3 | Story에 `wbs_item_id` FK 존재 | `R2dbcUserStory` 엔티티 확인 |
| G4 | WBS 트리를 구성하는 훅(`useWbsItems()`) 존재 | Frontend 코드 확인 |
| G5 | `wbs_item_id` null 허용 정책 확정 | **권장: null 허용** (WBS 미연결 Story 가능) |

---

## 2. 현황 진단

### 2.1 현재 데이터 흐름

| 계층 | WBS를 무엇으로 보는가 | 상태 |
| --- | --- | --- |
| DB `task.user_stories` | `wbs_item_id` (FK) | **정상** — name/path 없음 |
| DB `project.wbs_item_story_links` | `wbs_item_id` + `story_id` (링킹 테이블) | **이중 경로** |
| Backend Entity (`R2dbcUserStory`) | `wbsItemId` 보유 | **정상** |
| **API Response** (`UserStoryResponse`) | **`wbsItemId` 미포함** | **누락** |
| Frontend `useStories` | `wbsItemId` 미매핑 | **누락** |
| Frontend `storyTypes.ts` | WBS 관련 필드 없음 | **누락** |
| Frontend `backlog.ts` | `wbsItemId?: string` 정의됨 | 정상 (타입만 존재) |
| Frontend `useWbs.ts` | 별도 통합 훅으로 관리 | 정상 |

### 2.2 핵심 문제: API Response 누락 (Epic Phase 6과 동일 패턴)

```text
UserStoryResponse.fromEntity():
  // wbsItemId는 매핑하지 않음 — ID 누락!
```

Backend Entity(`R2dbcUserStory`)에 `wbsItemId`가 있지만,
`UserStoryResponse`에 매핑되지 않아 Frontend는 메인 Stories API에서 WBS 관계를 알 수 없다.

> **현재 우회 경로**: `useWbsBacklogIntegration` 훅이 별도 API(`/integration/story-item`)로 WBS 연결을 관리.
> 그러나 메인 Stories 조회 시 `wbsItemId`가 없으므로 **리스트/트리 뷰에서 WBS 배지가 작동하지 않을 수 있다.**

### 2.3 추가 발견: 이중 관계 경로

Story-WBS 관계가 **두 곳**에서 관리되고 있다:

| 경로 | 위치 | 역할 |
| --- | --- | --- |
| 직접 FK | `task.user_stories.wbs_item_id` | Story의 WBS 소속 (단일 진실) |
| 링킹 테이블 | `project.wbs_item_story_links` | 연결 이력/감사 (보조) |

```sql
-- 링킹 테이블 구조
CREATE TABLE IF NOT EXISTS project.wbs_item_story_links (
    wbs_item_id VARCHAR(36) NOT NULL,
    story_id VARCHAR(36) NOT NULL,
    UNIQUE(wbs_item_id, story_id)
);
```

> **잠재 위험**: 두 경로의 데이터가 불일치하면 어느 쪽이 진실인지 모호해진다.
> **원칙**: `user_stories.wbs_item_id`가 단일 진실. 링킹 테이블은 감사/역추적용.

### 2.4 EpicTreeView의 WBS 배지 현황

```typescript
// EpicTreeView.tsx:81-86 — wbsItemId 기반 배지 (backlog.ts 타입 사용)
{story.wbsItemId && (
  <span className="px-1.5 py-0.5 bg-teal-100 text-teal-700 rounded text-xs">
    <Link2 size={10} />
    WBS Item
  </span>
)}
```

이 배지는 `backlog.ts`의 `UserStory.wbsItemId`를 참조한다.
그러나 `useStories` 훅이 `wbsItemId`를 매핑하지 않으므로,
`BacklogManagement`에서 `BacklogStory`로 변환할 때 `wbsItemId`가 누락될 수 있다.

### 2.5 WBS 특수성: 계층 구조

Epic/Feature와 달리 WBS는 **계층 구조**를 가진다:

```text
Phase → WBS Group → WBS Item → (Story 연결)
```

| 엔티티 | 관계 |
| --- | --- |
| `R2dbcWbsGroup` | `phaseId` (Phase 소속), `linkedEpicId` (Epic 연결) |
| `R2dbcWbsItem` | `groupId` (Group 소속), `phaseId` |
| `R2dbcUserStory` | `wbsItemId` (WBS Item 연결) |

> **핵심**: Story는 WBS Item(**말단 노드**)만 참조한다.
> WBS의 상위 구조(Group → Phase)는 WBS 테이블에서 조회.
> **Story에 WBS path/group/phase를 중복 저장하지 않는다.**

---

## 3. 설계 원칙

### 3.1 목표 상태 (불변 규칙)

| 항목 | 규칙 |
| --- | --- |
| 관계 필드 | `wbsItemId` (ID only) |
| 계층 책임 | WBS 테이블/훅 (`useWbsItems()`, `useWbsGroups()`) |
| Story 역할 | **"이 WBS 노드에 속한다"만 표현** |
| 표시 | WBS path/name은 조회 후 렌더링 |
| null 처리 | `wbsItemId === null` → "WBS 미연결" |
| 불일치 처리 | `wbsItemId` 있는데 WBS Item 없음 → "Unknown WBS Item" 경고 |

### 3.2 `wbsItemId` null 허용 정책

WBS 연결은 **선택적**이다 (모든 Story가 WBS에 연결되는 것은 아님):

| 시나리오 | wbsItemId | 의미 |
| --- | --- | --- |
| WBS 연결된 Story | `"wbs-item-001"` | 정상 |
| WBS 미연결 Story | `null` | **허용** — "WBS 미연결" |
| 삭제된 WBS Item 참조 | `"wbs-item-deleted"` | **경고** — "Unknown WBS Item" |

### 3.3 이중 관계 경로 정리 원칙

| 원칙 | 설명 |
| --- | --- |
| 단일 진실 | `user_stories.wbs_item_id`가 유일한 관계 진실 |
| 링킹 테이블 | 감사/역추적 보조 역할 — 불일치 시 직접 FK가 우선 |
| 동기화 | Link/Unlink API가 양쪽을 동시에 갱신 |

---

## 4. 배포 전략

### 4.1 배포 순서

```text
[PR-9.1] Backend: UserStoryResponse에 wbsItemId 추가 (계약 확장)
  ↓
[PR-9.2] Frontend: useStories에서 wbsItemId 매핑 + 타입 정규화
  ↓
[PR-9.3] UI: WBS Tree ↔ Story 매칭 가드 + 불일치 감지
  ↓
[PR-9.4] 회귀 테스트: WBS-Story 일관성 자동 검증
  ↓
[PR-9.5] Cleanup: 이중 경로 정리 (조건부)
```

### 4.2 PR 단위 요약

| PR | 범위 | 성격 | 위험도 |
| --- | --- | --- | --- |
| PR-9.1 | Backend API | `wbsItemId` 전달 (계약 확장) | 낮음 |
| PR-9.2 | Frontend 타입/훅 | `wbsItemId` 매핑 + 정규화 | 낮음 |
| PR-9.3 | UI 컴포넌트 | WBS 매칭 가드 + Unknown 처리 | 낮음 |
| PR-9.4 | 테스트 | 일관성 자동 검증 | 없음 |
| PR-9.5 | 이중 경로 정리 | 링킹 테이블 역할 확정 (조건부) | 중간 |

---

## 5. 단계별 실행 계획

### PR-9.1: Backend — `UserStoryResponse`에 `wbsItemId` 추가

**목적**: WBS 관계 ID를 메인 Stories API에서 노출. Epic Phase 6과 동일 패턴.

**파일**: `PMS_IC_BackEnd_v1.2/.../task/dto/UserStoryResponse.java`

```java
@Builder
public record UserStoryResponse(
    String id,
    String epicId,
    String featureId,
    String wbsItemId,    // ★ 추가
    // ...
) {
    public static UserStoryResponse fromEntity(R2dbcUserStory story) {
        return UserStoryResponse.builder()
            .epicId(story.getEpicId())
            .featureId(story.getFeatureId())
            .wbsItemId(story.getWbsItemId())   // ★ 추가
            .build();
    }
}
```

**관측 가능성 추가**:

```java
// 고아 wbsItemId 감지 (WBS Item이 삭제되었을 가능성)
if (story.getWbsItemId() != null) {
    wbsItemRepository.findById(story.getWbsItemId())
        .switchIfEmpty(Mono.fromRunnable(() -> {
            log.warn("ORPHANED_WBS_ITEM_ID: story={}, wbsItemId={}",
                     story.getId(), story.getWbsItemId());
        }).then(Mono.empty()));
}
```

**링킹 테이블 정합성 검증** (선택):

```java
// user_stories.wbs_item_id와 wbs_item_story_links 불일치 감지
// 배치 검증 쿼리로 일정 주기 실행 권장
```

**DoD (PR-9.1)**:

- [ ] API JSON에 `wbsItemId` 필드 포함
- [ ] 기존 필드 제거 없음 (하위 호환)
- [ ] 고아 `wbsItemId` 관측 가능 (로그)
- [ ] 기존 API 소비자 무중단

---

### PR-9.2: Frontend — 타입/훅 정규화

**목적**: `useStories` 훅이 `wbsItemId`를 반환하도록 매핑. UI에서 WBS 배지가 정상 동작.

#### 9.2-A. 타입 추가

**파일**: `PMS_IC_FrontEnd_v1.2/src/utils/storyTypes.ts`

```typescript
export interface UserStory {
  id: string;
  // ...
  wbsItemId: string | null;  // ★ 추가 — WBS Item 연결 (null이면 "미연결")
}
```

#### 9.2-B. useStories 훅 매핑

**파일**: `PMS_IC_FrontEnd_v1.2/src/hooks/api/useStories.ts`

```typescript
return data.map((story: any) => ({
  // ...
  wbsItemId: story.wbsItemId || null,  // ★ 추가 — 없으면 명시적 null

  // ★ 과도기 관측 (선택)
  ...(story.wbsItemId === undefined && (() => {
    // API가 아직 wbsItemId를 전달하지 않는 경우 감지
    return {};
  })()),
}));
```

#### 9.2-C. BacklogManagement 변환 보강

**파일**: `PMS_IC_FrontEnd_v1.2/src/app/components/BacklogManagement.tsx`

현재 `allBacklogStories` 변환에서 `wbsItemId`가 누락되어 있을 가능성:

```typescript
const allBacklogStories: BacklogStory[] = stories.map((s) => ({
  // ...
  wbsItemId: s.wbsItemId,  // ★ 추가 (EpicTreeView WBS 배지 동작에 필요)
}));
```

**Mock 데이터**에도 `wbsItemId` 추가:

```typescript
const initialStories: UserStory[] = [
  {
    id: 'story-001-01',
    // ...
    wbsItemId: 'wbs-item-001',   // ★ 추가
  },
  {
    id: 'story-001-02',
    // ...
    wbsItemId: null,              // WBS 미연결
  },
];
```

**DoD (PR-9.2)**:

- [ ] `useStories` 반환 객체에 `wbsItemId` 포함
- [ ] `storyTypes.ts`에 `wbsItemId` 필드 존재
- [ ] `BacklogManagement` → `BacklogStory` 변환에 `wbsItemId` 포함
- [ ] Mock/test 데이터에 `wbsItemId` 포함
- [ ] Story에 WBS name/path 직접 저장 없음 (이미 충족)

---

### PR-9.3: UI — WBS Tree ↔ Story 매칭 가드

**목적**: WBS Item 삭제/변경 시 고아 Story를 감지하고 UI에 드러냄.

#### 9.3-A. WBS 조회 맵 + 가드 함수

```typescript
const { data: wbsItems = [] } = useWbsItems(projectId);

const wbsItemById = useMemo(
  () => new Map(wbsItems.map(item => [item.id, item])),
  [wbsItems]
);

const getWbsItemName = (wbsItemId: string | null | undefined): string => {
  if (!wbsItemId) return 'WBS 미연결';

  const item = wbsItemById.get(wbsItemId);
  if (!item) {
    console.warn(`[getWbsItemName] Unknown wbsItemId: ${wbsItemId} — WBS Item이 삭제되었을 수 있음`);
    return `Unknown WBS (${wbsItemId})`;
  }
  return item.name;
};
```

#### 9.3-B. WBS 기반 Story 그룹핑 (WBS 뷰에서 사용)

```typescript
// WBS Tree 노드별 Story 그룹핑
const storiesByWbsItemId = useMemo(() => {
  const map = new Map<string, UserStory[]>();

  stories.forEach(story => {
    const key = story.wbsItemId || '__unlinked__';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(story);
  });

  return map;
}, [stories]);

// 특정 WBS Item에 연결된 Story 조회
const getStoriesForWbsItem = (wbsItemId: string): UserStory[] => {
  return storiesByWbsItemId.get(wbsItemId) || [];
};

// WBS 미연결 Story
const unlinkedStories = storiesByWbsItemId.get('__unlinked__') || [];
```

#### 9.3-C. EpicTreeView WBS 배지 강화

현재 WBS 배지는 `wbsItemId` 유무만 확인한다. 실제 WBS Item 존재 여부는 미검증:

```typescript
// 변경 전 — wbsItemId 존재만 확인
{story.wbsItemId && (
  <span className="bg-teal-100 text-teal-700">WBS Item</span>
)}

// 변경 후 — 실제 WBS Item 존재 확인
{story.wbsItemId && (
  <span className={
    wbsItemById.has(story.wbsItemId)
      ? "bg-teal-100 text-teal-700"
      : "bg-red-100 text-red-700"  // ★ 고아 참조 경고
  }>
    {wbsItemById.has(story.wbsItemId)
      ? getWbsItemName(story.wbsItemId)
      : "Unknown WBS"}
  </span>
)}
```

**DoD (PR-9.3)**:

- [ ] WBS Item 삭제 시 고아 Story가 UI에서 드러남 (숨기지 않음)
- [ ] WBS 미연결 Story가 명시적으로 식별 가능
- [ ] WBS 뷰에서 Story 그룹핑이 `wbsItemId` 기반으로 동작

---

### PR-9.4: 회귀 테스트 — WBS-Story 일관성 자동 검증

**목적**: WBS-Story 관계가 ID 기반으로 유지되는지 자동 검증.

#### 9.4-A. WBS-Story 조인 일관성

```typescript
describe('WBS-Story relationship consistency', () => {
  it('all stories with wbsItemId can be matched to a WBS item', () => {
    const wbsItems = [
      { id: 'wbs-item-001', name: 'OCR 엔진 구현' },
      { id: 'wbs-item-002', name: '사기 탐지 모델 학습' },
    ];
    const linkedStories = mockStories.filter(s => s.wbsItemId);

    const matchedCount = linkedStories.filter(
      s => wbsItems.some(w => w.id === s.wbsItemId)
    ).length;

    expect(matchedCount).toBe(linkedStories.length);
  });

  it('wbsItemId never contains a WBS name or path', () => {
    const wbsNames = ['OCR 엔진 구현', '사기 탐지 모델 학습'];
    const wbsPaths = ['1.1.1', '2.1.1'];

    mockStories.forEach(story => {
      if (story.wbsItemId) {
        expect(wbsNames).not.toContain(story.wbsItemId);
        expect(wbsPaths).not.toContain(story.wbsItemId);
      }
    });
  });

  it('unlinked stories (null wbsItemId) are valid', () => {
    const unlinked = mockStories.filter(s => s.wbsItemId === null);
    // WBS 미연결 Story는 유효
    expect(unlinked.length).toBeGreaterThanOrEqual(0);
  });
});
```

#### 9.4-B. WBS 계층 무결성 (Story는 경로를 들고 있지 않음)

```typescript
it('stories do not store WBS path or group information', () => {
  mockStories.forEach(story => {
    // Story에 wbsPath, wbsGroup, wbsCode 같은 필드가 없어야 함
    expect(story).not.toHaveProperty('wbsPath');
    expect(story).not.toHaveProperty('wbsGroupId');
    expect(story).not.toHaveProperty('wbsCode');
  });
});
```

**DoD (PR-9.4)**:

- [ ] WBS-Story 조인 일관성 테스트 존재
- [ ] `wbsItemId`에 name/path가 들어가는 퇴행 방지
- [ ] Story에 WBS 계층 데이터 중복 저장 방지 테스트
- [ ] CI에서 자동 검증

---

### PR-9.5: Cleanup — 이중 경로 정리 (조건부)

> **실행 조건**: PR-9.1~9.4 완료 후, 이중 경로의 불일치가 문제를 일으키는지 관측 기반 판단

#### 9.5-A. 이중 경로 역할 확정

| 경로 | 역할 확정 | 조치 |
| --- | --- | --- |
| `user_stories.wbs_item_id` | **단일 진실** (Source of Truth) | 유지 |
| `wbs_item_story_links` | **감사/역추적** (보조) | 역할 명확화 또는 제거 |

#### 9.5-B. 선택지

| 선택지 | 설명 | 장점 | 단점 |
| --- | --- | --- | --- |
| A | 링킹 테이블 유지 (감사용) | 연결 이력 추적 가능 | 불일치 가능성 존속 |
| B | 링킹 테이블 제거, 직접 FK만 사용 | 단일 진실 명확 | 이력 추적 불가 |
| C | 링킹 테이블을 뷰로 전환 (FK 기반 자동 생성) | 불일치 불가능 | 뷰 관리 비용 |

> **추천**: **A** (유지하되 역할 명문화) → 불일치 감지 배치 쿼리 추가

#### 9.5-C. 불일치 감지 쿼리

```sql
-- 직접 FK와 링킹 테이블의 불일치 감지
-- Case 1: FK 있는데 링킹 테이블에 없음
SELECT us.id, us.wbs_item_id
FROM task.user_stories us
WHERE us.wbs_item_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM project.wbs_item_story_links wl
    WHERE wl.story_id = us.id AND wl.wbs_item_id = us.wbs_item_id
  );

-- Case 2: 링킹 테이블에 있는데 FK가 다름
SELECT wl.story_id, wl.wbs_item_id as link_wbs, us.wbs_item_id as fk_wbs
FROM project.wbs_item_story_links wl
JOIN task.user_stories us ON us.id = wl.story_id
WHERE us.wbs_item_id IS DISTINCT FROM wl.wbs_item_id;
```

**DoD (PR-9.5)**:

- [ ] `user_stories.wbs_item_id`가 단일 진실로 명문화
- [ ] 링킹 테이블 역할 확정 (감사용 유지 또는 제거)
- [ ] 불일치 감지 메커니즘 존재

---

## 6. 파일별 변경 요약

| PR | 파일 | 변경 내용 | 위험도 |
| --- | --- | --- | --- |
| PR-9.1 | `UserStoryResponse.java` | `wbsItemId` 필드 추가 + fromEntity 매핑 | 낮음 |
| PR-9.1 | Service 계층 | 고아 `wbsItemId` 관측 로그 | 낮음 |
| PR-9.2 | `storyTypes.ts` | `wbsItemId: string / null` 추가 | 낮음 |
| PR-9.2 | `useStories.ts` | `wbsItemId` 매핑 + Mock 데이터 | 낮음 |
| PR-9.2 | `BacklogManagement.tsx` | `BacklogStory` 변환에 `wbsItemId` 포함 | 낮음 |
| PR-9.3 | UI 공통 유틸 | `getWbsItemName()` 가드 함수 | 낮음 |
| PR-9.3 | `EpicTreeView.tsx` | WBS 배지 강화 (고아 참조 경고) | 낮음 |
| PR-9.4 | `useStories.test.tsx` | WBS-Story 일관성 테스트 | 없음 |
| PR-9.5 | DB/Backend | 이중 경로 역할 확정 + 불일치 감지 | 중간 |

---

## 7. Phase 9 최종 DoD (Phase 완료 선언 기준)

| # | 조건 | 검증 방법 |
| --- | --- | --- |
| 1 | WBS-Story 관계는 `wbsItemId`로만 성립 | API 응답에 `wbsItemId` 존재 |
| 2 | Story는 WBS 계층 정보를 중복 저장하지 않음 | `wbsPath`, `wbsCode` 등 없음 확인 |
| 3 | 고아 `wbsItemId` (삭제된 WBS Item) 관측 가능 | Backend 로그 + Frontend 경고 |
| 4 | 이중 경로(FK + 링킹 테이블) 역할이 명문화됨 | 문서/코드 주석 확인 |
| 5 | 트리/리스트/통계 정합 유지 | 브라우저 검증 |

---

## 8. Phase 6-9 최종 통합 관점

Phase 9가 완료되면 **모든 Story 관계가 ID 단일 진실로 통일**된다:

| 관계 | 필드 | Phase | 상태 |
| --- | --- | --- | --- |
| Story → Epic | `epicId` | Phase 6-7 | ID 기반 전환 완료 |
| Story → Feature | `featureId` | Phase 8 | ID 기반 (원래 정상, 가드 추가) |
| Story → WBS | `wbsItemId` | **Phase 9** | **API 확장 + 가드 추가** |
| Story → Sprint | `sprintId` | — | ID 기반 (변경 불필요) |

> **공통 규칙 (모든 관계에 적용)**:
>
> | 원칙 | 설명 |
> | --- | --- |
> | ID는 관계용 | `{entity}Id`에는 FK만 담긴다 |
> | name은 조회용 | 표시 데이터는 해당 엔티티 훅에서 조회 |
> | null은 드러냄 | null이면 "미지정/미연결"로 명시 표시 |
> | 고아는 경고 | ID 있는데 엔티티 없으면 "Unknown" 경고 |

---

## 9. 한 줄 결론

> Story는 WBS의 **"한 노드(`wbsItemId`)에 속한다"**만 표현한다.
> WBS 계층(Group → Item → 경로)은 WBS 테이블이 책임지고, Story는 절대 중복 저장하지 않는다.
>
> Phase 9 완료 시, **Epic · Feature · WBS · Sprint — 모든 Story 관계가
> "ID 단일 진실 + name은 조회"라는 하나의 규칙으로 통일**된다.
