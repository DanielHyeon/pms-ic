# Phase 10: Phase–Epic 관계 정규화 (ID 단일 진실 + 정책 고정)

## 0. Phase 10의 정체성

> Epic은 Phase를 **"이름"이 아니라 "phaseId"로만 참조**하고,
> Phase는 계층/집계의 기준이 되는 '상위 분류 단위'로서 **단일 진실**을 가진다.

Phase 6~9가 "Story가 어디에도 문자열로 매달리지 않게" 만든 단계라면,
Phase 10은 **Epic 자체도 같은 원칙**으로 정규화해서
상위 계층(Phase → Epic → Feature/Story/WBS)의 **"관계 체인"을 완성**합니다.

### 코드베이스 실태 진단 결과

| 계층 | 필드 | 현재 상태 | 갭 |
| --- | --- | --- | --- |
| DB `project.epics` | `phase_id VARCHAR(50)` | ID만 존재 (name 컬럼 없음) | 없음 |
| Backend Entity `R2dbcEpic` | `phaseId` (`@Column("phase_id")`) | ID만 존재 | 없음 |
| Backend DTO `EpicDto` | `phaseId` | API에 노출됨 | 없음 |
| Frontend Type `Epic` | `phaseId?: string` | 타입 정의 존재 | 없음 |
| Frontend Hook `useEpics()` | API → `phaseId` 매핑 | 정상 동작 | 없음 |
| Frontend Hook `usePhases()` | Phase 목록 ID 기반 조회 | 정상 동작 | 없음 |
| UI `EpicTreeView` | "Phase" 뱃지 표시 | Phase 이름 미표시 | UI 개선 여지 |
| Integration API | link/unlink 엔드포인트 | 완비 | 없음 |

**핵심 발견: Phase-Epic 관계는 이미 순수 ID 기반으로 설계되어 있습니다.**

- DB: `phase_id` 컬럼만 존재 (이름 컬럼 없음)
- Backend: Entity(`R2dbcEpic`) + DTO(`EpicDto`) 모두 `phaseId`만 보유
- Frontend: `Epic.phaseId?: string` 타입 정의 + `usePhases()` 훅 사용 가능
- Integration: `linkEpicToPhase()`, `unlinkEpicFromPhase()`, `getEpicsByPhase()` API 완비

따라서 Phase 10은 "마이그레이션"이 아니라 **"검증 + 강화(hardening)"** 입니다.

---

## 1. Phase 10 진입 게이트 (필수)

| 게이트 | 조건 | 판정 기준 |
| --- | --- | --- |
| G-10.1 | Phase 7 완료: Epic/Story 관계에서 name 기반 참조 제거 | Phase 7 DoD 충족 |
| G-10.2 | Epic 데이터에 `phase_id`(FK) 존재 | DB 스키마 확인 (V20260125 마이그레이션) |
| G-10.3 | Frontend에서 Phase 목록을 `usePhases()`로 ID 기반 조회 가능 | `usePhases.ts` 존재 확인 |
| G-10.4 | "Epic은 Phase 미지정 허용?" 정책 확정 | 권장: 허용(`phaseId` null 가능) + UI에서 "미지정 Phase" 그룹 노출 |

**현재 상태**: G-10.2, G-10.3은 이미 충족. G-10.1은 Phase 7 완료 후 자동 충족.
G-10.4는 현재 `phaseId?: string` (optional)이므로 null 허용이 기본 정책.

---

## 2. 현재 흔한 실패 패턴 (진단 체크리스트)

아래 중 하나라도 있으면 Phase 10 대상입니다.

| 패턴 | 현재 코드베이스 | 해당 여부 |
| --- | --- | --- |
| Epic이 `phase: "설계"` 처럼 phase name 문자열을 보유 | DB/Entity/DTO에 phase name 필드 없음 | **해당 없음** |
| EpicTree에서 Phase별 필터가 문자열 비교 | `epic.phaseId`로 비교 | **해당 없음** |
| Phase 이름 변경 시 Epic이 조용히 분류에서 사라짐 | ID 기반이므로 불가 | **해당 없음** |
| API가 `phaseId`를 안 주거나 프론트가 `phaseName`으로 조인 | `EpicDto`에 `phaseId` 노출됨 | **해당 없음** |
| EpicTreeView에서 Phase 이름이 표시되지 않음 | "Phase" 뱃지만 표시 (이름 미표시) | **개선 대상** |
| Phase별 Epic 그룹핑 뷰가 없음 | 개별 뱃지만 존재 | **개선 대상** |

**결론**: name 기반 문제는 없으나, **Phase 이름 표시**와 **Phase별 그룹핑 UI**가 개선 대상.

---

## 3. 목표 상태 (불변 규칙)

| 항목 | 규칙 |
| --- | --- |
| 관계 필드 | `Epic.phaseId` (ID only) |
| 표시 필드 | Phase name은 `usePhases()` 조회로 렌더 |
| UI 매칭 | `epic.phaseId === phase.id` |
| null 처리 | `phaseId === null` → "Phase 미지정" 그룹 |
| 계층 책임 | Phase 구조(순서/상태/기간)는 Phase 엔티티가 단독 책임 |

---

## 4. 전체 배포 전략 요약

```
PR-10.1  Backend 계약 확인 및 관측성 강화
PR-10.2  Frontend 타입/훅 강화 (null 정책 고정)
PR-10.3  UI 순수화 (Phase 기반 렌더링/집계를 ID 기반으로 고정)
PR-10.4  회귀 테스트 (Phase–Epic 합계/정합 테스트)
PR-10.5  Cleanup (조건부, 레거시 정리)
```

**핵심 원칙**: 확인(검증) → 강화(가드) → 테스트(보호) → 고정(계약)

> **Phase 8과의 유사성**: Feature-Story가 이미 ID 기반이었던 것처럼,
> Phase-Epic도 이미 ID 기반입니다. 따라서 "마이그레이션" PR은 없고,
> "강화 + 관측성 + 테스트"가 핵심입니다.

---

## PR-10.1 — Backend: 계약 확인 및 관측성 강화

### 10.1.1 변경 목표

Epic API 응답에 `phaseId`가 이미 포함되어 있음을 **확인**하고,
`phaseId` 누락(orphaned) Epic에 대한 **관측성**을 추가합니다.

### 10.1.2 현재 상태 확인

**Entity** — `R2dbcEpic.java`:

```java
@Nullable
@Column("phase_id")
private String phaseId;
```

**DTO** — `EpicDto.java`:

```java
private String phaseId;

public static EpicDto from(R2dbcEpic entity) {
    dto.setPhaseId(entity.getPhaseId());
    // ...
}
```

**API 엔드포인트** — `ReactiveEpicController.java`:

```java
// Phase별 Epic 조회
GET /api/phases/{phaseId}/epics

// Epic-Phase 연결
POST /api/epics/{epicId}/link-phase
POST /api/epics/{epicId}/unlink-phase
```

**진단**: Backend 계약은 완전합니다. `phaseId`가 Entity → DTO → API 전 계층에서 노출됩니다.

### 10.1.3 추가 작업: 관측성

```java
// ReactiveEpicService.java — Epic 조회 시 phaseId 누락 관측
public Flux<EpicDto> getEpicsByProject(String projectId) {
    return epicRepository.findByProjectId(projectId)
        .doOnNext(epic -> {
            if (epic.getPhaseId() == null) {
                log.info("Epic without phase: epicId={}, projectId={}",
                    epic.getId(), projectId);
                // meterRegistry.counter("missing_phase_id_for_epic").increment();
            }
        })
        .map(EpicDto::from);
}
```

### 10.1.4 DoD (PR-10.1)

- [ ] Epic API JSON에 `phaseId` 포함 **확인** (이미 존재)
- [ ] 기존 필드 제거 없음 (하위 호환)
- [ ] `phaseId` 누락 Epic 관측 가능 (로그/메트릭)
- [ ] Integration 엔드포인트(link/unlink) 동작 확인

---

## PR-10.2 — Frontend: 타입/훅 강화 (null 정책 고정)

### 10.2.1 현재 타입 상태

**`types/backlog.ts`** — Epic 인터페이스:

```typescript
export interface Epic {
  id: string;
  projectId: string;
  phaseId?: string;  // Link to Phase — 이미 ID 기반
  name: string;
  // ...
}
```

**`hooks/api/useEpics.ts`** — Epic 훅:

```typescript
export const useEpics = (projectId: string) => {
  return useQuery<Epic[]>({
    queryKey: ['epics', projectId],
    queryFn: () => apiService.getEpics(projectId),
  });
};
```

**`hooks/api/usePhases.ts`** — Phase 훅:

```typescript
export const usePhases = (projectId: string) => {
  return useQuery<Phase[]>({
    queryKey: ['phases', projectId],
    queryFn: () => apiService.getPhases(projectId),
  });
};
```

**진단**: 타입과 훅 모두 정상. `phaseId`가 올바르게 매핑됩니다.

### 10.2.2 강화 포인트: `string | null` vs `string?`

현재 `phaseId?: string`(optional)은 `undefined`와 `null`을 구분하지 않습니다.

```typescript
// 현재 (optional — undefined일 수 있음)
export interface Epic {
  phaseId?: string;
}

// 강화 옵션 (명시적 null — API가 null을 반환하는 경우)
export interface Epic {
  phaseId: string | null;
}
```

**결정 필요**: Phase 6의 `epicId` 정책과 동일하게 처리할 것을 권장합니다.
- `phaseId: string | null` — Epic은 Phase 미지정이 허용되므로 null이 유효한 값

### 10.2.3 Integration 훅 확인

**`hooks/api/useWbsBacklogIntegration.ts`**:

```typescript
// Phase별 Epic 조회
export const useEpicsByPhase = (phaseId: string) => { ... };

// 미연결 Epic 조회
export const useUnlinkedEpics = (projectId: string) => { ... };

// Epic-Phase 연결/해제
export const useLinkEpicToPhase = () => { ... };
export const useUnlinkEpicFromPhase = () => { ... };
```

**진단**: Integration 훅도 완비. ID 기반 조작이 가능합니다.

### 10.2.4 DoD (PR-10.2)

- [ ] Frontend에서 `Epic.phaseId` 접근 가능 **확인** (이미 존재)
- [ ] `phaseId` null 처리 경로 존재 확인
- [ ] `phaseName` 기반 참조 0건 확인 (코드베이스 검색)
- [ ] mock/test Epic 데이터에 `phaseId` 포함

---

## PR-10.3 — UI 순수화: Phase 기반 분류/집계의 ID 고정

### 10.3.1 목표

Phase별 Epic 표시/필터/집계가 `phaseId` 기준으로만 동작하고,
Phase 이름은 `usePhases()`로 가져와 **렌더만 수행**합니다.

### 10.3.2 현재 UI 상태

**`EpicTreeView.tsx`** (line 258-263):

```tsx
{epic.phaseId && (
  <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">
    <Link2 size={10} />
    Phase           {/* ← Phase 이름이 아닌 "Phase" 텍스트만 표시 */}
  </span>
)}
```

**`EpicFormModal.tsx`** — Phase 선택 드롭다운:

```tsx
const { data: phases = [] } = usePhases(projectId);
// Phase 목록에서 ID로 선택 → epic.phaseId에 저장
```

**`EpicPhaseLinker.tsx`** — Phase-Epic 연결 관리:

```tsx
const { data: linkedEpics = [] } = useEpicsByPhase(phaseId);
const { data: unlinkedEpics = [] } = useUnlinkedEpics(projectId);
```

**진단**: 기본 구조는 ID 기반이나, EpicTreeView에서 Phase **이름**을 표시하지 않는 점이 개선 대상.

### 10.3.3 권장 구현 패턴

**(1) `phaseById` 맵 (Phase 이름 조회용)**

```typescript
const { data: phases = [] } = usePhases(projectId);

const phaseById = useMemo(
  () => new Map(phases.map(p => [p.id, p])),
  [phases]
);
```

**(2) `epicsByPhaseId` 그룹핑 (Phase별 Epic 분류)**

```typescript
const epicsByPhaseId = useMemo(() => {
  const groups = new Map<string, Epic[]>();
  for (const epic of epics) {
    const key = epic.phaseId ?? "__UNASSIGNED__";
    const list = groups.get(key) ?? [];
    list.push(epic);
    groups.set(key, list);
  }
  return groups;
}, [epics]);
```

**(3) 렌더링**

```tsx
{/* Phase별 그룹 */}
{phases.map(phase => {
  const phaseEpics = epicsByPhaseId.get(phase.id) ?? [];
  return (
    <PhaseGroup key={phase.id} phase={phase} epics={phaseEpics} />
  );
})}

{/* Phase 미지정 */}
{epicsByPhaseId.has("__UNASSIGNED__") && (
  <PhaseGroup
    key="unassigned"
    label="Phase 미지정"
    epics={epicsByPhaseId.get("__UNASSIGNED__")!}
  />
)}
```

**(4) EpicTreeView Phase 이름 표시 개선**

```tsx
// 현재: "Phase" 텍스트만 표시
{epic.phaseId && (
  <span className="...">Phase</span>
)}

// 개선: Phase 이름 표시
{epic.phaseId && (
  <span className="...">
    <Link2 size={10} />
    {phaseById.get(epic.phaseId)?.name ?? "Unknown Phase"}
  </span>
)}
```

### 10.3.4 "Unknown Phase" 가드 (중요)

`Epic.phaseId`가 있는데 `phases`에 없는 경우:

```typescript
const getPhaseLabel = (phaseId: string | null): string => {
  if (!phaseId) return "Phase 미지정";
  const phase = phaseById.get(phaseId);
  if (!phase) return `Unknown Phase (${phaseId.slice(0, 8)}...)`;
  return phase.name;
};
```

> **UI에서 숨기지 말고 "Unknown Phase(삭제됨?)"로 노출**합니다.
> 이것이 데이터 정합성 문제를 조기에 드러내는 장치가 됩니다.

### 10.3.5 DoD (PR-10.3)

- [ ] Phase 이름 변경에도 Epic 분류 유지 (ID 기반)
- [ ] Phase별 Epic 합계/통계가 리스트/트리 어디서든 일관
- [ ] "Phase 미지정" 그룹이 명확히 드러남
- [ ] "Unknown Phase" 가드가 삭제된 Phase를 감지

---

## PR-10.4 — 회귀 테스트: Phase–Epic 정합성 자동화

### 10.4.1 필수 테스트 (Frontend)

**(1) 합계 정합**

```typescript
test('sum(phase별 epic 개수) + 미지정 + unknown = 전체 epic 수', () => {
  const epics: Epic[] = [
    { id: 'e1', phaseId: 'p1', /* ... */ },
    { id: 'e2', phaseId: 'p1', /* ... */ },
    { id: 'e3', phaseId: null, /* ... */ },
    { id: 'e4', phaseId: 'deleted-phase', /* ... */ },
  ];
  const phases = [{ id: 'p1', name: 'Phase 1' }];

  const grouped = groupEpicsByPhase(epics);
  const knownCount = phases.reduce(
    (sum, p) => sum + (grouped.get(p.id)?.length ?? 0), 0
  );
  const unassigned = grouped.get("__UNASSIGNED__")?.length ?? 0;
  const unknownCount = epics.length - knownCount - unassigned;

  expect(knownCount + unassigned + unknownCount).toBe(epics.length);
});
```

**(2) 이름 변경 회귀**

```typescript
test('Phase name 변경 후에도 phaseId 기반 그룹핑 유지', () => {
  const epic = { id: 'e1', phaseId: 'p1' };

  // Phase name 변경 전
  const phases_v1 = [{ id: 'p1', name: '설계' }];
  const group_v1 = groupEpicsByPhase([epic]);

  // Phase name 변경 후
  const phases_v2 = [{ id: 'p1', name: '상세설계' }];
  const group_v2 = groupEpicsByPhase([epic]);

  // phaseId 기반이므로 그룹핑 결과 동일
  expect(group_v1.get('p1')).toEqual(group_v2.get('p1'));
});
```

**(3) null phaseId 처리**

```typescript
test('phaseId가 null인 Epic은 "미지정" 그룹에 포함', () => {
  const epics = [
    { id: 'e1', phaseId: null },
    { id: 'e2', phaseId: undefined },
  ];
  const grouped = groupEpicsByPhase(epics);
  expect(grouped.get("__UNASSIGNED__")?.length).toBe(2);
});
```

### 10.4.2 필수 테스트 (Backend)

```java
@Test
void epicResponse_shouldIncludePhaseId() {
    R2dbcEpic entity = new R2dbcEpic();
    entity.setPhaseId("phase-001");
    EpicDto dto = EpicDto.from(entity);
    assertThat(dto.getPhaseId()).isEqualTo("phase-001");
}

@Test
void epicResponse_shouldAllowNullPhaseId() {
    R2dbcEpic entity = new R2dbcEpic();
    entity.setPhaseId(null);
    EpicDto dto = EpicDto.from(entity);
    assertThat(dto.getPhaseId()).isNull();
}
```

### 10.4.3 DoD (PR-10.4)

- [ ] name 기반 조인 퇴행 시 CI에서 즉시 실패
- [ ] Phase–Epic 관련 변경이 들어오면 테스트가 자동으로 보호
- [ ] `phaseId` null 처리 테스트 포함
- [ ] Unknown Phase 감지 테스트 포함

---

## PR-10.5 — Cleanup (조건부): 레거시 제거 및 계약 고정

### 10.5.1 진입 게이트

| 게이트 | 조건 |
| --- | --- |
| `missing_phase_id_for_epic_count` | == 0 (또는 예외 Epic이 식별/정리됨) |
| UI에서 `phaseName` 기반 참조 | 0건 |

### 10.5.2 현재 상태 평가

코드베이스 조사 결과, **Phase name 기반 레거시가 존재하지 않습니다**:

- DB: `phase_id` 컬럼만 존재 (name 컬럼 없음)
- Backend Entity: `phaseId`만 보유
- Backend DTO: `phaseId`만 노출
- Frontend: `phaseId?: string`만 정의

따라서 PR-10.5는 **대부분 불필요**합니다.

### 10.5.3 잠재적 작업 (필요 시)

| 작업 | 조건 | 현재 필요성 |
| --- | --- | --- |
| DTO에서 `phaseName` 제거 | `phaseName` 필드가 있을 때 | **불필요** (없음) |
| Frontend에서 `phaseName` 제거 | `phaseName` 필드가 있을 때 | **불필요** (없음) |
| DB `phase` name 컬럼 제거 | name 컬럼이 있을 때 | **불필요** (없음) |
| `phaseId?: string` → `phaseId: string \| null` 고정 | 타입 명확화 시 | **선택적** |

### 10.5.4 DoD (PR-10.5)

- [ ] Phase–Epic 관계는 `phaseId`로만 성립 **확인**
- [ ] 문자열 기반 Phase 조인 0건 **확인**
- [ ] (해당 시) 레거시 필드 제거 완료

---

## 5. Phase 10 최종 DoD (Phase 완료 선언 조건)

Phase 10은 아래가 **동시에** 만족될 때만 완료입니다:

| 조건 | 검증 방법 |
| --- | --- |
| Epic API에 `phaseId` 존재 | API 응답 검증 (이미 충족) |
| UI에서 Phase별 Epic 분류/집계가 `phaseId`로만 수행 | 코드 리뷰 + 테스트 |
| Phase rename이 있어도 Epic 분류가 깨지지 않음 | 회귀 테스트 통과 |
| `phaseId` 누락/unknown 상황이 숨겨지지 않고 드러남 | Unknown Phase 가드 UI 확인 |
| 회귀 테스트로 name 기반 조인 퇴행이 막힘 | CI 테스트 통과 |
| (조건 충족 시) phase name 레거시 필드 제거 | 코드베이스에 미존재 확인 완료 |

---

## 6. 운영 관점 체크 (추천)

대시보드/통계가 "Phase별 진행률"을 내는 경우가 많습니다.
Phase–Epic 정규화 이후에는:

```
Phase 진행률 = Epic 진행률 집계
Epic 진행률 = Story/Task 집계
```

같은 식으로 **"위→아래로 내려가는 계산"** 이 가능해집니다.

이때도 동일 원칙: **집계는 ID 관계를 따라가고, 이름은 마지막에 렌더링만**

### 집계 체인 예시

```typescript
// Phase 진행률 계산 (ID 체인으로 집계)
const phaseProgress = useMemo(() => {
  return phases.map(phase => {
    const phaseEpics = epics.filter(e => e.phaseId === phase.id);
    const totalPoints = phaseEpics.reduce((sum, epic) => {
      const epicStories = stories.filter(s => s.epicId === epic.id);
      return sum + epicStories.reduce((sp, s) => sp + (s.storyPoints ?? 0), 0);
    }, 0);
    const completedPoints = phaseEpics.reduce((sum, epic) => {
      const doneStories = stories.filter(
        s => s.epicId === epic.id && s.status === 'DONE'
      );
      return sum + doneStories.reduce((sp, s) => sp + (s.storyPoints ?? 0), 0);
    }, 0);
    return {
      phaseId: phase.id,
      phaseName: phase.name,   // 이름은 여기서만 (렌더링용)
      totalPoints,
      completedPoints,
      progress: totalPoints > 0 ? (completedPoints / totalPoints) * 100 : 0,
    };
  });
}, [phases, epics, stories]);
```

---

## 7. Phase 6–10 통합 요약: 전체 관계 체인 완성

| Phase | 관계 | 방향 | 현재 상태 | Phase 작업 |
| --- | --- | --- | --- | --- |
| Phase 6 | Story → Epic | `epicId` | API 갭 존재 | API 확장 필수 |
| Phase 7 | Story.epic (name) | 제거 대상 | 레거시 잔존 | name 필드 제거 |
| Phase 8 | Story → Feature | `featureId` | **이미 정상** | 검증 + 강화 |
| Phase 9 | Story → WBS Item | `wbsItemId` | API 갭 존재 | API 확장 필수 |
| **Phase 10** | **Epic → Phase** | **`phaseId`** | **이미 정상** | **검증 + 강화** |

### 완성된 관계 그래프

```
Phase (계층 상위)
  ├── phaseId ──→ Epic (ID 기반, Phase 10)
  │                ├── epicId ──→ Story (ID 기반, Phase 6+7)
  │                │               ├── featureId ──→ Feature (ID 기반, Phase 8)
  │                │               └── wbsItemId ──→ WBS Item (ID 기반, Phase 9)
  │                └── feature.epicId ──→ Feature (ID 기반)
  └── Phase.children (parent_id 자기참조)
```

> **한 줄 결론**:
> Phase 10은 Phase–Epic 관계를 ID로 고정해서, 상위 분류(Phase)가
> 이름 변경/정렬 변경에도 흔들리지 않게 만드는 단계입니다.
> 이것이 끝나면 전체 계층(Phase → Epic → Feature/Story/WBS)이
> **"문자열이 아닌 관계 그래프"** 로 완성됩니다.
