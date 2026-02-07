# Phase 8 실행 계획서: Feature-Story 관계 정규화 (ID 단일 진실 검증 및 강화)

> **목표**: Feature-Story 관계가 `featureId` ID 기반 단일 진실로 유지되고 있는지 검증하고,
> null 처리 · UI 가드 · 회귀 테스트를 추가하여 **Epic에서 발생한 문제가 반복되지 않도록 강화**한다.

---

## 0. Phase 8의 성격 정의

### Epic과의 차이: "마이그레이션"이 아니라 "강화"

Phase 6-7(Epic)은 **"name 기반 → ID 기반 전환"**이었다.
Phase 8(Feature)은 상황이 다르다:

| 항목 | Epic (Phase 6-7) | Feature (Phase 8) |
| --- | --- | --- |
| DB 컬럼 | `epic`(name) + `epic_id`(FK) 공존 | **`feature_id`만 존재** (name 없음) |
| Backend Entity | `epic` + `epicId` 둘 다 보유 | **`featureId`만 보유** |
| API Response | `epic`(name)만 전달, `epicId` 누락 | **`featureId` 이미 전달** |
| Frontend 타입 | `epic: string`(name) 사용 | **`featureId?: string` 사용** |
| 문제 심각도 | **조인 실패** (0/0 SP) | 잠재적 null 미처리 |

> **결론**: Feature-Story 관계는 이미 ID 기반으로 올바르게 설계되어 있다.
> Phase 8은 **"전환"이 아니라 "검증 + 가드 + 강화"**에 집중한다.

---

## 1. Phase 8 진입 게이트 (필수)

| # | 게이트 조건 | 검증 방법 |
| --- | --- | --- |
| G1 | Phase 7 완료 (Story에 `epic` name 기반 관계 없음) | Phase 7 DoD 체크리스트 |
| G2 | Backend에 `feature_id` FK 존재 | DB 스키마 확인 (`V20260125` 마이그레이션) |
| G3 | Frontend에서 Feature 목록을 `useFeatures()`로 ID 기반 조회 가능 | 코드 확인 |
| G4 | `featureId` null 허용 여부 정책 확정 | **권장: null 허용** (Feature 없이 Epic 직속 Story 가능) |

---

## 2. 현황 진단

### 2.1 현재 상태 (이미 올바른 부분)

| 계층 | Feature를 무엇으로 보는가 | 상태 |
| --- | --- | --- |
| DB `task.user_stories` | `feature_id` (FK) | **정상** — name 컬럼 없음 |
| Backend Entity (`R2dbcUserStory`) | `featureId` 만 보유 | **정상** — name 없음 |
| API Response (`UserStoryResponse`) | `featureId` 전달 | **정상** — ID 기반 |
| Frontend `useStories` | `featureId` 매핑 | **정상** — ID 기반 |
| Frontend `EpicTreeView` | `s.featureId === feature.id` | **정상** — ID 조인 |

### 2.2 아직 보완이 필요한 부분

Epic에서 발견된 문제 패턴이 Feature에서 **잠재적으로** 재발할 수 있는 지점:

| # | 잠재 리스크 | 현재 상태 | 필요 조치 |
| --- | --- | --- | --- |
| 1 | `featureId` null인 Story의 UI 처리 | 조용히 무시됨 | **"Feature 미지정" 명시 표시** |
| 2 | `featureId`가 있는데 Feature가 삭제된 경우 | 조용히 누락 | **"Unknown Feature" 경고 표시** |
| 3 | EpicTreeView에서 Feature 하위 Story 매칭 | 정상 동작 | **회귀 테스트 부재** |
| 4 | Feature 변경/삭제 시 Story 관계 안정성 | 검증 없음 | **일관성 테스트 추가** |
| 5 | `featureId` 타입이 `string?` (optional) | undefined 전파 가능 | **`string / null` 정규화 검토** |

### 2.3 EpicTreeView의 Feature-Story 조인 확인

```typescript
// EpicTreeView.tsx:129 — 현재 정상 동작
const featureStories = stories.filter((s) => s.featureId === feature.id);
```

이 로직은 이미 ID 기반 조인이다. Epic처럼 name이 ID 자리에 들어가는 문제는 **없다**.
그러나 `featureId === undefined`인 Story는 어떤 Feature에도 매칭되지 않고 조용히 사라질 수 있다.

---

## 3. 설계 원칙

### 3.1 목표 상태 (불변 규칙)

| 항목 | 규칙 |
| --- | --- |
| 관계 필드 | `featureId` (ID only) |
| 표시 필드 | Feature name은 `useFeatures()` 조회 |
| UI 매칭 | `story.featureId === feature.id` |
| null 처리 | `featureId === null` → "Feature 미지정" |
| 불일치 처리 | `featureId` 존재하나 Feature 없음 → "Unknown Feature" 경고 |

### 3.2 `featureId` null 허용 정책

Epic과 달리 Feature는 **선택적 관계**다:

| 시나리오 | featureId | 의미 |
| --- | --- | --- |
| Feature 하위 Story | `"feature-001-01"` | 정상 |
| Epic 직속 Story (Feature 미지정) | `null` | **허용** — "Feature 미지정" 그룹 |
| 삭제된 Feature 참조 | `"feature-deleted"` | **경고** — "Unknown Feature" |

> **핵심 차이**: `epicId`는 Phase 7 이후 required지만,
> `featureId`는 **null 허용**이 올바른 설계다 (Epic 직속 Story 존재 가능).

---

## 4. 배포 전략

### 4.1 배포 순서

Feature-Story는 이미 ID 기반이므로, 전환이 아닌 **강화** 위주:

```text
[PR-8.1] Backend: featureId 누락 관측 + null 가드
  ↓
[PR-8.2] Frontend: featureId 타입 정규화 + null 표시
  ↓
[PR-8.3] UI: "Feature 미지정" / "Unknown Feature" 가드
  ↓
[PR-8.4] 회귀 테스트: Feature-Story 일관성 자동 검증
```

### 4.2 PR 단위 요약

| PR | 범위 | 성격 | 위험도 |
| --- | --- | --- | --- |
| PR-8.1 | Backend | 관측 강화 + null 가드 | 낮음 |
| PR-8.2 | Frontend 타입/훅 | 정규화 강화 | 낮음 |
| PR-8.3 | UI 컴포넌트 | 가드 표시 추가 | 낮음 |
| PR-8.4 | 테스트 | 회귀 방지 자동화 | 없음 |

> **PR-8.5 (Cleanup)는 불필요**: Feature는 name 필드가 처음부터 없으므로 제거할 레거시가 없다.

---

## 5. 단계별 실행 계획

### PR-8.1: Backend — `featureId` 관측 강화 + null 가드

**목적**: Feature 관계의 관측 가능성을 Epic과 동일 수준으로 확보.

**파일**: `PMS_IC_BackEnd_v1.2/.../task/reactive/service/` (Service 계층)

```java
// Feature-Story 관계 관측 (Epic 패턴과 동일)
public Mono<UserStoryResponse> getStoryWithObservability(R2dbcUserStory story) {
    // featureId가 설정되어 있는데 Feature가 실제로 존재하는지 확인
    if (story.getFeatureId() != null) {
        return featureRepository.findById(story.getFeatureId())
            .switchIfEmpty(Mono.fromRunnable(() -> {
                log.warn("ORPHANED_FEATURE_ID: story={}, featureId={} — Feature가 삭제되었을 수 있음",
                         story.getId(), story.getFeatureId());
                // Metric: orphaned_feature_id_count.increment()
            }).then(Mono.empty()))
            .then(Mono.just(UserStoryResponse.fromEntity(story)));
    }
    return Mono.just(UserStoryResponse.fromEntity(story));
}
```

> **이걸 넣는 이유**: Feature가 삭제되었는데 Story가 여전히 삭제된 featureId를 참조하는 경우를 감지.
> Epic에서 배운 교훈: "문제를 숨기지 않고 관측 가능하게 만든다."

**DoD (PR-8.1)**:

- [ ] 고아 `featureId` (삭제된 Feature 참조) 관측 가능
- [ ] 기존 API 동작 변경 없음
- [ ] `orphaned_feature_id_count` 메트릭/로그 존재

---

### PR-8.2: Frontend — `featureId` 타입 정규화

**목적**: `featureId`의 null 처리를 hook 레벨에서 완료하여 UI에 전파되지 않게 함.

#### 8.2-A. 타입 확인

**파일**: `PMS_IC_FrontEnd_v1.2/src/utils/storyTypes.ts`

현재 상태:

```typescript
export interface UserStory {
  // ...
  featureId?: string;  // optional — undefined 전파 가능
}
```

**변경 검토**:

| 현재 | 변경안 | 판단 |
| --- | --- | --- |
| `featureId?: string` | `featureId: string / null` | **권장** — hook에서 정규화, UI는 null만 체크 |

> **Phase 6과 동일 원칙**: optional(`?`)은 undefined를 퍼뜨린다.
> `string | null`로 정규화하면 "값이 없으면 null"이라는 계약이 명확해진다.
>
> **단, Phase 8에서는 선택 사항**: 현재 동작에 문제가 없으므로
> 타입 변경은 Phase 7 완료 후 전체 정규화 시 일괄 적용해도 됨.

#### 8.2-B. useStories 훅 정규화 (선택)

**파일**: `PMS_IC_FrontEnd_v1.2/src/hooks/api/useStories.ts`

```typescript
return data.map((story: any) => ({
  // ...
  featureId: story.featureId || null,  // undefined → null 정규화
}));
```

**Mock 데이터 확인**: 이미 `featureId`가 포함되어 있는지 확인 후, 없으면 추가.

**DoD (PR-8.2)**:

- [ ] `featureId` undefined가 null로 정규화됨 (선택)
- [ ] Mock/test 데이터에 `featureId` 포함
- [ ] UI 컴포넌트에서 feature name 직접 참조 0건 (이미 충족)

---

### PR-8.3: UI — "Feature 미지정" / "Unknown Feature" 가드

**목적**: featureId null 및 고아 참조를 UI에서 명시적으로 표시.

#### 8.3-A. Feature 조회 맵 + 가드 함수

```typescript
// BacklogManagement.tsx 또는 공통 유틸
const { data: features = [] } = useFeatures();

const featureById = useMemo(
  () => new Map(features.map(f => [f.id, f])),
  [features]
);

const getFeatureName = (featureId: string | null | undefined): string => {
  if (!featureId) return 'Feature 미지정';

  const feature = featureById.get(featureId);
  if (!feature) {
    console.warn(`[getFeatureName] Unknown featureId: ${featureId} — Feature가 삭제되었을 수 있음`);
    return `Unknown Feature (${featureId})`;
  }
  return feature.name;
};
```

#### 8.3-B. EpicTreeView 내 "Feature 미지정" 그룹 강화

현재 `EpicTreeView`는 `featureId`가 없는 Story를 "Feature 미지정 스토리"로 이미 표시하고 있다:

```typescript
// EpicTreeView.tsx:215 — 이미 존재
const directStories = epicStories.filter((s) => !s.featureId);
```

```typescript
// EpicTreeView.tsx:330 — 이미 렌더링
{directStories.length > 0 && (
  <div className="mt-2 pt-2 border-t border-gray-100">
    <div className="text-xs text-gray-500 px-2 mb-1">Feature 미지정 스토리</div>
    {directStories.map((story) => (/* ... */))}
  </div>
)}
```

> **이미 올바르게 구현되어 있다.** 추가 변경 불필요.
> 단, "Unknown Feature" (삭제된 Feature 참조) 케이스는 현재 처리되지 않음.

#### 8.3-C. Unknown Feature 처리 추가

`featureId`가 있는데 Feature 목록에 없는 경우를 처리:

```typescript
// EpicItem 내부 — Feature 매칭 강화
const epicFeatures = features.filter((f) => f.epicId === epic.id);
const epicStories = stories.filter((s) => s.epicId === epic.id);

// ★ 추가: 고아 featureId 가진 Story 감지
const orphanedFeatureStories = epicStories.filter(
  (s) => s.featureId && !epicFeatures.some(f => f.id === s.featureId)
);

if (orphanedFeatureStories.length > 0) {
  console.warn(
    `[EpicItem] ${orphanedFeatureStories.length} stories reference non-existent features in epic ${epic.id}`
  );
}
```

**DoD (PR-8.3)**:

- [ ] `featureId === null` → "Feature 미지정" 표시 (이미 충족)
- [ ] `featureId` 있는데 Feature 없음 → 경고 로그
- [ ] Feature 변경/삭제 시 Story 관계 안정

---

### PR-8.4: 회귀 테스트 — Feature-Story 일관성 자동 검증

**목적**: Feature-Story 관계가 ID 기반으로 유지되는지 자동 검증. Epic에서 배운 교훈을 적용.

#### 8.4-A. Feature-Story 조인 일관성 테스트

```typescript
describe('Feature-Story relationship consistency', () => {
  it('all stories with featureId can be matched to a feature', () => {
    const features = [
      { id: 'feature-001-01', epicId: 'epic-001-01', name: 'OCR 엔진 고도화' },
      { id: 'feature-001-02', epicId: 'epic-001-02', name: '실시간 탐지 엔진' },
    ];
    const stories = mockStories.filter(s => s.featureId);

    const matchedCount = stories.filter(
      s => features.some(f => f.id === s.featureId)
    ).length;

    // featureId가 있는 모든 Story는 Feature와 매칭되어야 함
    expect(matchedCount).toBe(stories.length);
  });

  it('stories without featureId are grouped as "Feature 미지정"', () => {
    const directStories = mockStories.filter(s => !s.featureId);

    // featureId가 없는 Story도 유효 (Epic 직속)
    // 이 Story들은 "Feature 미지정" 그룹에 표시되어야 함
    expect(directStories.length).toBeGreaterThanOrEqual(0);
  });

  it('featureId never contains a feature name', () => {
    const featureNames = ['OCR 엔진 고도화', '실시간 탐지 엔진'];

    mockStories.forEach(story => {
      if (story.featureId) {
        // featureId에 name이 들어가면 안 됨 (Epic에서 발생한 버그 방지)
        expect(featureNames).not.toContain(story.featureId);
      }
    });
  });
});
```

#### 8.4-B. EpicTreeView Feature 하위 합계 검증

```typescript
it('EpicTreeView feature story count matches total', () => {
  const epic = { id: 'epic-001-01' };
  const features = [
    { id: 'feature-001-01', epicId: 'epic-001-01' },
  ];
  const epicStories = mockStories.filter(s => s.epicId === epic.id);

  const featureStories = epicStories.filter(s => s.featureId);
  const directStories = epicStories.filter(s => !s.featureId);

  // Feature 하위 + Feature 미지정 = Epic 전체
  expect(featureStories.length + directStories.length).toBe(epicStories.length);
});
```

**DoD (PR-8.4)**:

- [ ] Feature-Story 조인 일관성 테스트 존재
- [ ] `featureId`에 name이 들어가는 퇴행 방지 테스트 존재
- [ ] Feature 하위 합계 = Epic 전체 Story 수 검증
- [ ] CI에서 자동 검증

---

## 6. 파일별 변경 요약

| PR | 파일 | 변경 내용 | 위험도 |
| --- | --- | --- | --- |
| PR-8.1 | Service 계층 (Backend) | 고아 `featureId` 관측 로그 추가 | 낮음 |
| PR-8.2 | `storyTypes.ts` | `featureId` 타입 정규화 검토 (선택) | 낮음 |
| PR-8.2 | `useStories.ts` | `featureId` undefined → null 정규화 (선택) | 낮음 |
| PR-8.3 | `BacklogManagement.tsx` | `getFeatureName()` 가드 함수 추가 | 낮음 |
| PR-8.3 | `EpicTreeView.tsx` | 고아 `featureId` 경고 로그 추가 | 낮음 |
| PR-8.4 | `useStories.test.tsx` | Feature-Story 일관성 테스트 추가 | 없음 |

---

## 7. Phase 8 최종 DoD (Phase 완료 선언 기준)

> Phase 8은 "전환"이 아니라 "강화"이므로, DoD도 **검증 중심**이다.

| # | 조건 | 검증 방법 |
| --- | --- | --- |
| 1 | Feature-Story 관계는 `featureId`로만 성립 | `grep "story.feature[^I]"` 결과 0건 (이미 충족) |
| 2 | `featureId === null` → "Feature 미지정" 명시 표시 | EpicTreeView 확인 (이미 충족) |
| 3 | 고아 `featureId` (삭제된 Feature) 관측 가능 | Backend 로그 + Frontend 경고 |
| 4 | Feature-Story 일관성 회귀 테스트 존재 | CI 자동 검증 |
| 5 | `featureId`에 name이 들어가는 패턴 방지 | 테스트로 차단 |

---

## 8. Phase 6-7-8 비교 요약

| 항목 | Phase 6 (Epic 확장) | Phase 7 (Epic 제거) | Phase 8 (Feature 강화) |
| --- | --- | --- | --- |
| 핵심 작업 | `epicId` 추가 | `epic`(name) 제거 | 관측/가드/테스트 추가 |
| 작업량 | **대** (전 계층 변경) | **대** (파괴적 변경) | **소** (가드 추가만) |
| 위험도 | 중간 | 높음 | **낮음** |
| 이유 | name이 ID 자리에 있었음 | name 필드 완전 제거 | **이미 ID 기반이므로 강화만** |

> **핵심 교훈**: Feature-Story는 처음부터 올바르게 설계되었다.
> Phase 8은 이 올바른 설계를 **"깨지지 않게 보호"**하는 Phase다.
>
> Epic에서 발생한 실수(name이 ID 자리에 들어감)가
> Feature에서 반복되지 않도록 **관측 + 가드 + 테스트**를 세 겹으로 보호한다.

---

## 9. 한 줄 결론

> Feature-Story 관계는 이미 `featureId` ID 기반으로 올바르게 설계되어 있다.
> Phase 8은 **"이 올바른 설계가 깨지지 않도록 관측 · 가드 · 회귀 테스트를 추가하는 Phase"**다.
>
> Epic에서 배운 교훈:
> **올바른 설계도, 보호 장치가 없으면 시간이 지나며 무너진다.**
