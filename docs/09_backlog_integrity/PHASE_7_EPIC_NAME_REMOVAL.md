# Phase 7 실행 계획서: Epic name(`epic`) 필드 제거 및 관계 계약 고정

> **목표**: Story가 Epic name을 직접 들고 다니는 구조를 제거하고,
> **Epic-Story 관계를 `epicId` 단일 FK로 완전 고정**한다.
> Epic name은 "조회해서 표시하는 데이터"로만 존재한다.

---

## 0. Phase 7 진입 게이트 (필수)

Phase 7은 **Phase 6이 "실제로 안정화된 상태"**에서만 진입한다.
날짜가 아닌 **상태**로 게이트를 건다.

| # | 게이트 조건 | 검증 방법 |
| --- | --- | --- |
| G1 | Backend `missing_epic_id_count == 0` (또는 극히 예외만 존재하며 식별 가능) | 서버 로그 `MISSING_EPIC_ID` 카운트 확인 |
| G2 | Frontend `epicId` 폴백 사용률 0에 가까움 | `console.warn` 발생 0건 확인 |
| G3 | EpicTreeView / 리스트 / 통계에서 스토리 합계가 동일하게 유지 | 브라우저 검증 |
| G4 | `useEpics()`에서 `epicId` 기반으로 Epic name을 가져오는 경로가 존재 | 코드 확인 |
| G5 | Phase 6 DoD 6개 조건 모두 충족 | Phase 6 문서 체크리스트 확인 |

> **핵심 원칙**: `epic` name은 "스토리에서 들고 다니는 데이터"가 아니라
> **"epicId로 조회해서 표시하는 데이터"**가 되어야 한다.

---

## 1. Phase 7의 성격 정의

Phase 7은 **"필드 제거"**다. 파급력이 크다.

Phase 6이 "ID를 추가하고 병행 운영"이었다면,
Phase 7은 **"레거시를 끊고 단일 경로로 고정"**하는 Phase다.

| 항목 | Phase 6 | Phase 7 |
| --- | --- | --- |
| 성격 | 계약 확장 (필드 추가) | 계약 축소 (필드 제거) |
| 위험 | 낮음 (하위 호환) | **높음** (파괴적 변경) |
| 롤백 | Frontend 폴백이 커버 | 롤백 시 필드 복구 필요 |
| 실행 조건 | 즉시 가능 | **상태 게이트 통과 후** |

따라서 **3단계로 분리 배포**한다:

1. 먼저 "사용을 금지"하고 (`@Deprecated`)
2. 다음에 "대체 경로를 완성"하고
3. 마지막에 "삭제"한다

> **왜 이렇게 하냐면**: "필드 삭제"를 먼저 하면, 화면 어딘가에서 조용히 깨지는데 원인 찾기 어렵다.
> **먼저 "사용을 금지"하고, 다음에 "삭제"**해야 안전하다.

---

## 2. 배포 전략

### 2.1 배포 순서

```text
[PR-7.1] Backend Deprecation
  → epic 유지하되 @Deprecated + 경고 + 문서화
  ↓
[PR-7.2] Frontend Migration
  → epic 표시를 epicId 기반 조회로 전환
  ↓
[PR-7.3] Contract Removal
  → epic 필드 제거 (Backend + Frontend)
  ↓
[PR-7.4] DB Cleanup (선택)
  → 레거시 컬럼 제거 또는 읽기 전용화
```

### 2.2 PR 단위 요약

| PR | 범위 | 성격 | 롤백 영향 |
| --- | --- | --- | --- |
| PR-7.1 | Backend DTO | `epic` Deprecated 마킹 + 사용률 관측 | 없음 (필드 유지) |
| PR-7.2 | Frontend UI | `story.epic` → `epicById.get(story.epicId)` 전환 | PR-7.1 필요 |
| PR-7.3 | Backend + Frontend | `epic` 필드 완전 제거 | 롤백 시 필드 복구 필요 |
| PR-7.4 | DB | 레거시 컬럼 정리 (선택) | 마이그레이션 롤백 필요 |

---

## 3. 단계별 실행 계획

### PR-7.1: Backend — `epic`(name) Deprecation + 가드

**목적**: `epic`이 더 이상 계약의 일부가 아니라는 신호를 시스템에 박기.
내부/외부 소비자가 아직 있다면 "마이그레이션 안내" 제공.

**파일**: `PMS_IC_BackEnd_v1.2/.../task/dto/UserStoryResponse.java`

```java
@Builder
public record UserStoryResponse(
    String id,
    @Deprecated  // ★ Phase 7: epicId 사용 권장
    String epic,        // name (표시용, deprecated)
    String epicId,      // ID (관계용, 단일 진실)
    // ...
) {
    public static UserStoryResponse fromEntity(R2dbcUserStory story) {
        // ★ epic(name) 사용률 관측
        if (story.getEpic() != null) {
            log.info("EPIC_NAME_STILL_RETURNED: story={}, epicName={}",
                     story.getId(), story.getEpic());
            // Metric: epic_name_usage_count.increment()
        }

        return UserStoryResponse.builder()
            .epic(story.getEpic())       // deprecated, 하위 호환용 유지
            .epicId(story.getEpicId())   // 단일 진실
            .build();
    }
}
```

**추가 작업**:

- OpenAPI/Swagger 문서에 `epic` 필드 `deprecated: true` 표시
- (선택) 스테이징/QA 환경에서 응답 `warnings` 필드에 `"EPIC_NAME_DEPRECATED"` 추가

**DoD (PR-7.1)**:

- [ ] `epic`(name) 필드가 `@Deprecated`로 표시됨
- [ ] `epicId`가 유일한 관계 필드임이 문서/코드에 명확히 선언됨
- [ ] `epic` name 반환률 관측 가능 (로그/메트릭)
- [ ] API 응답 구조 변경 없음 (하위 호환 유지)

---

### PR-7.2: Frontend — `epic` 표시를 `epicId` 기반으로 전환

**목적**: Story에서 `epic` name을 더 이상 믿지 않게 만들기.
Epic title 표시는 `epicId` → `epic.name` 조회로만 수행.

#### 7.2-A. Epic 조회 맵 구축

```typescript
// BacklogManagement.tsx 또는 공통 유틸
const { data: epics = [] } = useEpics(projectId);

// epicId → Epic 객체 맵
const epicById = useMemo(
  () => new Map(epics.map(e => [e.id, e])),
  [epics]
);
```

#### 7.2-B. 전환 규칙

UI에서 epic name이 필요한 곳은 **반드시 `epicId`로 `epicById` 맵을 조회**:

```typescript
// 변경 전 (story.epic 직접 사용)
<span>{story.epic}</span>

// 변경 후 (epicId 기반 조회)
const epic = story.epicId ? epicById.get(story.epicId) : undefined;
const epicName = epic?.name ?? 'Epic 미지정';
<span>{epicName}</span>
```

#### 7.2-C. 데이터 불일치 가드 (중요)

`epicId`가 있는데 `epicById`에 없으면 (데이터 불일치) **조용히 넘어가지 않는다**:

```typescript
const getEpicName = (epicId: string | null): string => {
  if (!epicId) return 'Epic 미지정';

  const epic = epicById.get(epicId);
  if (!epic) {
    console.warn(`[getEpicName] Unknown epicId: ${epicId} — Epic이 삭제되었을 수 있음`);
    return `Unknown Epic (${epicId})`;
  }
  return epic.name;
};
```

> **왜 "Unknown Epic"을 드러내냐면**: 조용히 넘어가면 데이터 정합성 문제를 숨기게 된다.
> 문제를 숨기지 않고 드러내야 Phase 6과 같은 "이름이 ID 자리에" 류의 버그를 재발 방지할 수 있다.

#### 7.2-D. 영향 받는 파일 목록

| 파일 | `story.epic` 사용 위치 | 전환 방식 |
| --- | --- | --- |
| `BacklogManagement.tsx` | Epic별 그룹핑, 드롭다운 | `epicById.get()` 조회 |
| `EpicTreeView.tsx` | Epic name 표시 | 이미 `epic.name` 사용 (변경 불필요) |
| `useStories.ts` | Mock 데이터 | `epic` 유지하되 `epicId`가 진실 |
| `storyTypes.ts` | `epic: string` 타입 | Phase 7.3에서 제거 |

**DoD (PR-7.2)**:

- [ ] `epic` name 표시가 `story.epic`을 전혀 사용하지 않음
- [ ] `epicId`가 null이면 "Epic 미지정"으로 처리 (명확)
- [ ] `epicId`가 있는데 Epic 조회 실패하면 "Unknown Epic"으로 경고성 표시
- [ ] 기존 화면 동작/수치 정합 유지
- [ ] `useEpics()`에서 Epic name을 조회하는 패턴이 확립됨

---

### PR-7.3: Contract Removal — `epic` 필드 완전 제거

**목적**: 계약에서 `epic`(name)을 제거하여 **재발 불가능 상태**로 고정.

#### 7.3-A. Backend 변경

**파일**: `UserStoryResponse.java`

```java
// 변경 후 — epic 필드 제거
@Builder
public record UserStoryResponse(
    String id,
    // String epic,     // ★ 제거됨
    String epicId,      // 유일한 관계 필드
    // ...
) {
    public static UserStoryResponse fromEntity(R2dbcUserStory story) {
        return UserStoryResponse.builder()
            // .epic(story.getEpic())    // ★ 제거
            .epicId(story.getEpicId())
            .build();
    }
}
```

#### 7.3-B. Frontend 변경

**타입 제거** (`storyTypes.ts`):

```typescript
// 변경 후 — epic 필드 제거
export interface UserStory {
  id: string;
  title: string;
  description: string;
  epicId: string;          // ★ null 불허 (필수)
  // epic: string;         // ★ 제거됨
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

**useStories 훅 매핑** (`useStories.ts`):

```typescript
return data.map((story: any) => ({
  // ...
  epicId: story.epicId,     // 필수 (null이면 정규화 실패)
  // epic 매핑 제거
}));
```

**모든 `story.epic` 참조 제거**:

```bash
# 제거 대상 검색
grep -rn "story\.epic\b" --include="*.ts" --include="*.tsx" | grep -v "epicId"
grep -rn "\.epic\b" --include="*.ts" --include="*.tsx" | grep -v "epicId" | grep -v "useEpics"
```

#### 7.3-C. StoryFormData 전환

```typescript
// 변경 전
export interface StoryFormData {
  title: string;
  description: string;
  epic: string;              // ❌ name 기반
  acceptanceCriteria: string[];
}

// 변경 후
export interface StoryFormData {
  title: string;
  description: string;
  epicId: string;            // ★ ID 기반
  acceptanceCriteria: string[];
}
```

**DoD (PR-7.3)**:

- [ ] API JSON에서 `epic` 필드가 사라짐
- [ ] Frontend 코드에서 `story.epic` 참조 0건
- [ ] `StoryFormData.epic` → `StoryFormData.epicId`로 전환
- [ ] 타입/테스트/빌드 통과
- [ ] EpicTreeView / 리스트 / 통계 수치 정합 유지

---

### PR-7.4: DB Cleanup — 레거시 컬럼 정리 (선택)

**목적**: "레거시 컬럼이 남아있으면 언젠가 다시 쓰게 되는 문제" 방지.

#### 7.4-A. 선택지 비교

| 선택지 | 설명 | 장점 | 단점 |
| --- | --- | --- | --- |
| A | 컬럼 유지, 쓰기 금지 (읽기 전용) | 안전, 레거시 리포트 호환 | 컬럼 존재로 재사용 유혹 |
| B | 컬럼 완전 제거 | 깨끗함, 재발 불가 | 리스크 큼, 롤백 어려움 |
| C | 뷰로 유지 (레거시 리포트만 지원) | 균형 | 뷰 관리 비용 |

> **추천**: **A → B 순서** (읽기 전용 유지 → 사용 흔적 0 확인 → 삭제)

#### 7.4-B. 읽기 전용화 SQL (Option A)

```sql
-- epic 컬럼에 대한 쓰기 방지 트리거 (PostgreSQL)
CREATE OR REPLACE FUNCTION prevent_epic_name_write()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.epic IS DISTINCT FROM OLD.epic THEN
    RAISE WARNING 'DEPRECATED: task.user_stories.epic column is read-only. Use epic_id instead.';
    NEW.epic := OLD.epic;  -- 변경을 원래 값으로 되돌림
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_epic_name_write
BEFORE UPDATE ON task.user_stories
FOR EACH ROW
EXECUTE FUNCTION prevent_epic_name_write();
```

#### 7.4-C. 완전 제거 SQL (Option B, 최종 단계)

```sql
-- 사전 확인: epic 컬럼 참조하는 쿼리/뷰가 없는지 확인
-- 완전 제거
ALTER TABLE task.user_stories DROP COLUMN IF EXISTS epic;
```

**DoD (PR-7.4)**:

- [ ] `epic`(name) 컬럼이 애플리케이션 경로에서 더 이상 사용되지 않음 (검색/조인 포함)
- [ ] (Option A) 쓰기 방지 트리거 적용
- [ ] (Option B) 컬럼 완전 제거 후 마이그레이션 성공

---

## 4. 파일별 변경 요약

| PR | 파일 | 변경 내용 | 위험도 |
| --- | --- | --- | --- |
| PR-7.1 | `UserStoryResponse.java` | `@Deprecated` + 사용률 관측 | 낮음 |
| PR-7.2 | `BacklogManagement.tsx` | `epicById.get()` 기반 표시 전환 | 중간 |
| PR-7.2 | 공통 유틸 또는 훅 | `getEpicName()` 헬퍼 + Unknown Epic 가드 | 낮음 |
| PR-7.3 | `UserStoryResponse.java` | `epic` 필드 제거 | **높음** |
| PR-7.3 | `storyTypes.ts` | `epic: string` 제거, `epicId` 필수화 | **높음** |
| PR-7.3 | `useStories.ts` | `epic` 매핑 제거 | 중간 |
| PR-7.3 | `StoryFormData` 관련 | `epic` → `epicId` 전환 | 중간 |
| PR-7.4 | DB Migration SQL | 레거시 컬럼 읽기 전용화 / 제거 | **높음** |

---

## 5. Phase 7 최종 DoD (Phase 완료 선언 기준)

> Phase 7은 **아래 5개가 동시에 만족될 때만 "완료"**다.

| # | 조건 | 검증 방법 |
| --- | --- | --- |
| 1 | Story ↔ Epic 관계는 `epicId`로만 성립 | API 응답에 `epic` 필드 없음 |
| 2 | API/FE 어디에도 `epic`(name)이 "관계"로 쓰이지 않음 | `grep story.epic` 결과 0건 |
| 3 | `story.epic` 참조 0건 | Frontend 코드 검색 |
| 4 | Epic name은 `useEpics()` 조회로만 렌더링 | 코드 리뷰 확인 |
| 5 | 데이터 불일치(Unknown Epic)가 발생하면 드러나고 추적 가능 | Unknown Epic 경고 확인 |

---

## 6. 핵심 설계 결정 (사전 고정 권장)

Phase 7 실행 전에 아래 2가지를 미리 결정하면 PR 작업이 매끄럽다.

### 결정 D1: Story 관계 필드는 optional인가, required인가?

| 관계 | 추천 | 이유 |
| --- | --- | --- |
| `epicId` | **required** (`string`) | 모든 Story는 Epic 하위에 존재 |
| `featureId` | optional (`string / null`) | Feature 없이 Epic 직속 Story 가능 |
| `wbsItemId` | optional (`string / null`) | WBS 연결은 선택 사항 |

> **정책**: `null`을 허용하되, UI에서 숨기지 않고 드러내는 방식이 가장 안전하다.

### 결정 D2: 레거시 `epic` name 컬럼(DB)을 완전 삭제할까, 읽기 전용으로 유지할까?

| 선택 | 장점 | 단점 |
| --- | --- | --- |
| 완전 삭제 | 가장 깨끗, 재발 불가 | 리스크 큼 |
| 읽기 전용 유지 | 레거시 리포트/운영 편의 | 재사용 유혹 |

> **추천**: 읽기 전용 유지 → 사용 흔적 0 확인 → 삭제

---

## 7. 관계 정규화 반복 템플릿 (Phase X)

Phase 6-7에서 수립한 패턴을 Feature/WBS 관계에도 동일하게 적용한다.

### 7.1 템플릿 구조

```text
Phase X: {RELATION} 관계 일관성 정규화

1) 현재 상태 진단
   - DB에 {relation_id}(FK)와 {relation}(name) 공존 여부
   - API Response에서 어느 필드가 전달되는지
   - Frontend에서 어느 값으로 조인하는지

2) 목표 규칙 (불변)
   - ID는 관계용
   - name은 표시용
   - UI 매칭은 ID로만

3) 배포 순서 (표준)
   PR-X.1: Backend 계약 확장 ({relationId} 추가)
   PR-X.2: Frontend 타입/훅 정규화
   PR-X.3: UI 순수화 (렌더러화)
   PR-X.4: 회귀 테스트
   PR-X.5: Cleanup (상태 기반)
```

### 7.2 적용 대상 관계

| 관계 | 현재 상태 | 적용 필요 여부 |
| --- | --- | --- |
| Story → Epic | Phase 6-7에서 정규화 | 완료 |
| Story → Feature | `featureId` 이미 ID 기반 | 검증만 필요 |
| Story → Sprint | `sprintId` 이미 ID 기반 | 유지 |
| Story → WBS Item | `wbsItemId` 이미 ID 기반 | 유지 |
| Feature → Epic | `epicId` ID 기반 | 유지 |
| Epic → Phase | `phaseId` ID 기반 | 유지 |

### 7.3 관계별 특수 고려사항

**Feature-Story**:

- Feature는 "없어도 되는 선택적 관계"일 수 있음
- `featureId: string | null` 설계 권장
- UI에서는 "Feature 미지정" 그룹을 별도로 두면 데이터 누락이 드러남

**WBS-Story**:

- WBS는 "계층 구조"가 있어 관계가 단일 FK보다 복잡해질 수 있음
- Story는 `wbsItemId`만 들고, 트리는 WBS 테이블에서 계층을 만든 뒤 `wbsItemId`로 매칭
- "WBS 경로(path)"를 Story에 중복 저장하지 말 것 (표현 데이터는 조회로 렌더링)

---

## 8. 한 줄 결론

> Phase 7은 "epic 필드를 지우는 작업"이 아니라
> **"Story가 관계 데이터를 직접 들고 다니는 패턴 자체를 끊는 작업"**이다.
>
> 이 패턴이 확립되면, Feature/WBS/Sprint 관계에서도
> **"name은 조회, ID는 관계"**라는 단일 규칙이 시스템 전체에 적용된다.
