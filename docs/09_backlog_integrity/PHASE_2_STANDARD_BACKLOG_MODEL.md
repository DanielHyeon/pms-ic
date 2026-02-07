# Phase 2: "표준 백로그 모델" 확정 + API 계약 고정

> **우선순위**: HIGH
> **소요 기간**: 2~4일
> **목표**: 프론트가 어떤 테이블을 진짜 백로그로 쓸지 통일하고, API 계약을 확정
> **선행 조건**: Phase 0 (데이터 응급 처치), Phase 1 (ID 기반 관계 전환)
> **후속 의존**: Phase 3 (역할별 View API / Workbench UI)

---

## 핵심 계약 (이 단계에서 "못 박는" 규칙)

### 계약 A: 공식 백로그 계층

```
project.backlog_items = 스코프 단위 (What/Why)
   └── PO/PMO 관점: 요구사항 기반, 승인/거버넌스, 비즈니스 가치 추적
   └── 하나의 backlog_item이 N개의 user_story로 분해됨

task.user_stories = 실행 단위 (How/When)
   └── PM 관점: 스프린트/상태/작업 관리, 스토리 포인트, 칸반
   └── 하나의 story가 하나의 backlog_item에 소속
```

**옵션 A 규칙 (확정)**:

1. `project.backlog_items.requirement_id`는 **project_id 범위에서 유일**
2. `task.user_story_requirement_links`는 **스토리당 정확히 1개의 requirement만 허용**
3. 따라서 `task.user_stories.backlog_item_id`는 **항상 1개 (또는 미분류 NULL)**

> 이 규칙은 PMO KPI를 단순하게 만들고,
> "추적률(link rate)"을 계약으로 고정한다.

### 계약 B: 전이 이벤트 (Transition Event)

상태 KPI(리드타임/체류시간/병목)는 **"현재 상태값"만으로는 계산 불가**.
따라서 **오늘부터 모든 상태 변경은 이벤트로 누적**한다.

이벤트는 스토리/백로그아이템/에픽/스프린트 전부를 담을 수 있는
**단일 이벤트 테이블**이 가장 운영 친화적이다.

---

## 2-1. Story ↔ BacklogItem 연결 (옵션 A 확정)

### 현재 상태

| 테이블 | DB 데이터 | 프론트엔드 사용 | 역할 |
|---|---|---|---|
| `project.backlog_items` | 7건 존재 | **미사용** (프론트가 무시) | 요구사항 기반 스코프 항목 |
| `task.user_stories` | 5건 존재 | **실제 사용** (백로그 화면의 데이터 소스) | 스프린트/실행 단위 |

### 문제

- 프론트가 `backlog_items`를 완전히 무시하고 `user_stories`만 사용
- 둘 사이에 **연결 키가 없음** → 요구사항-스토리 추적 불가
- 역할별 관점에서 둘 다 필요한데, 서로 독립적으로 존재

### 2-1-0) 사전 탐지 (충돌이 있으면 여기서 멈춤)

아래 두 개가 **0건**이어야 옵션 A가 안전하다.

```sql
-- (1) requirement_id가 backlog_items에서 project별 중복인지
-- 0건이어야 함: 옵션 A는 project 범위에서 requirement 1:1을 전제
SELECT bi.backlog_id, bi.requirement_id, COUNT(*) AS cnt
FROM project.backlog_items bi
WHERE bi.requirement_id IS NOT NULL
GROUP BY bi.backlog_id, bi.requirement_id
HAVING COUNT(*) > 1;

-- (2) story가 여러 requirement에 연결되어 있는지
-- 0건이어야 함: 옵션 A는 story당 requirement 1개를 전제
SELECT user_story_id, COUNT(DISTINCT requirement_id) AS cnt
FROM task.user_story_requirement_links
GROUP BY user_story_id
HAVING COUNT(DISTINCT requirement_id) > 1;
```

> **(2)가 0이 아니라면**: 옵션 A를 바꾸지 말고, **"대표 requirement 1개만 허용"으로
> 링크 테이블을 정리(삭제/정정)**해야 한다. 이건 설계 문제가 아니라 데이터 품질 문제로 처리.

### 2-1-1) 컬럼 추가 + 인덱스

```sql
ALTER TABLE task.user_stories
ADD COLUMN IF NOT EXISTS backlog_item_id VARCHAR(36);

CREATE INDEX IF NOT EXISTS idx_user_stories_backlog_item_id
    ON task.user_stories(backlog_item_id);
```

### 2-1-2) requirement를 매개로 자동 매핑

```sql
BEGIN;

-- ========================================
-- 사전 검증: 옵션 A 전제조건 확인
-- ========================================
DO $$
DECLARE
    dup_req_cnt INTEGER;
    multi_link_cnt INTEGER;
BEGIN
    -- backlog_items에서 requirement 중복
    SELECT COUNT(*) INTO dup_req_cnt
    FROM (
        SELECT bi.backlog_id, bi.requirement_id
        FROM project.backlog_items bi
        WHERE bi.requirement_id IS NOT NULL
        GROUP BY bi.backlog_id, bi.requirement_id
        HAVING COUNT(*) > 1
    ) sub;

    -- story당 다중 requirement 링크
    SELECT COUNT(*) INTO multi_link_cnt
    FROM (
        SELECT user_story_id
        FROM task.user_story_requirement_links
        GROUP BY user_story_id
        HAVING COUNT(DISTINCT requirement_id) > 1
    ) sub;

    IF dup_req_cnt > 0 THEN
        RAISE EXCEPTION '[Phase2-1] backlog_items has % duplicate requirement_id(s) per project. Fix data first.', dup_req_cnt;
    END IF;
    IF multi_link_cnt > 0 THEN
        RAISE EXCEPTION '[Phase2-1] % stories have multiple requirement links. Fix data first.', multi_link_cnt;
    END IF;

    RAISE NOTICE '[Phase2-1] Option A preconditions met. Proceeding with mapping.';
END $$;

-- ========================================
-- requirement를 매개로 story ↔ backlog_item 연결
-- ========================================
UPDATE task.user_stories us
SET backlog_item_id = bi.id,
    updated_at = NOW()
FROM task.user_story_requirement_links usrl
JOIN project.backlog_items bi
    ON bi.requirement_id = usrl.requirement_id
WHERE us.id = usrl.user_story_id
  AND us.backlog_item_id IS NULL;

-- ========================================
-- 사후 검증
-- ========================================
DO $$
DECLARE
    linked_cnt INTEGER;
    total_cnt INTEGER;
BEGIN
    SELECT COUNT(*), COUNT(backlog_item_id)
    INTO total_cnt, linked_cnt
    FROM task.user_stories;

    RAISE NOTICE '[Phase2-1] Mapping complete: %/% stories linked to backlog_items',
        linked_cnt, total_cnt;

    -- requirement link가 있는 story는 반드시 backlog_item_id가 채워져야 함
    IF linked_cnt < 4 THEN
        RAISE EXCEPTION '[Phase2-1] Expected >= 4 linked stories, found %', linked_cnt;
    END IF;
END $$;

COMMIT;
```

### 매핑 결과 예상

| Story | Requirement Link | Backlog Item |
|---|---|---|
| story-001-01 | req-001-01 | bl-item-001 |
| story-001-02 | req-001-02 | bl-item-002 |
| story-001-03 | req-001-03 | bl-item-003 |
| story-001-04 | req-001-05 | bl-item-004 |
| story-002-01 | (링크 없음) | NULL (미분류) |

### 2-1-3) "1:1 계약"을 DB 수준에서 강제

옵션 A를 선택했으니, **지금이 "계약을 DB로 못 박는" 타이밍**이다.

```sql
-- (a) backlog_items: requirement_id는 backlog(=project) 범위에서 유일
-- backlog_id는 project당 1개이므로, (backlog_id, requirement_id) 유니크로 충분
CREATE UNIQUE INDEX IF NOT EXISTS uq_backlog_items_backlog_requirement
    ON project.backlog_items(backlog_id, requirement_id)
    WHERE requirement_id IS NOT NULL;

-- (b) story당 requirement 1개만 허용
-- user_story_requirement_links의 PK가 (user_story_id, requirement_id)이지만,
-- story당 1개만 허용하려면 user_story_id 자체를 유니크로
CREATE UNIQUE INDEX IF NOT EXISTS uq_story_requirement_one
    ON task.user_story_requirement_links(user_story_id);
```

> 이 두 유니크 인덱스가 들어가면, 앞으로 **"옵션 A를 깨는 데이터"는 원천적으로 차단**된다.

### 역할별 활용

이 연결이 완성되면:

- **PO**: `backlog_items` 중심 화면 + story rollup (몇 개 스토리로 분해됐는지, 완료율)
- **PM**: `user_stories` 중심 화면 + backlog_item trace (이 스토리가 어떤 요구사항에서 왔는지)
- **PMO**: backlog_items와 user_stories의 **"준수/추적률"**을 KPI로
  - "요구사항 대비 스토리 분해율"
  - "백로그 아이템 중 스프린트 투입률"
  - "스토리 완료율 대비 백로그 진척률"

### 검증 쿼리

```sql
-- [V1] backlog_item_id 연결률
SELECT
    COUNT(*) AS total_stories,
    COUNT(backlog_item_id) AS linked,
    COUNT(*) - COUNT(backlog_item_id) AS unlinked,
    ROUND(100.0 * COUNT(backlog_item_id) / NULLIF(COUNT(*), 0), 1) AS link_rate_pct
FROM task.user_stories;

-- [V2] 전체 체인: story → backlog_item → requirement
SELECT
    us.id AS story_id, us.title AS story_title, us.status AS story_status,
    bi.id AS backlog_item_id, bi.status AS backlog_status,
    r.id AS requirement_id, r.title AS requirement_title
FROM task.user_stories us
JOIN project.backlog_items bi ON us.backlog_item_id = bi.id
JOIN project.requirements r ON bi.requirement_id = r.id;

-- [V3] orphan 검출: backlog_item_id가 있지만 실제 backlog_items에 없는 경우
SELECT us.id, us.backlog_item_id
FROM task.user_stories us
WHERE us.backlog_item_id IS NOT NULL
  AND us.backlog_item_id NOT IN (SELECT id FROM project.backlog_items);
```

### 완료 조건

- [ ] 사전 탐지 쿼리 2개 모두 **0건** 확인
- [ ] `backlog_item_id` 컬럼 추가 + 매핑 완료 (4건 연결)
- [ ] 유니크 인덱스 2개 생성 (옵션 A 계약 DB 강제)
- [ ] 검증 쿼리 V1~V3 정상

---

## 2-2. Epic 데이터 소스를 DB로 통일 (프론트 localStorage 제거)

### 현재 상태

| 항목 | 상태 |
|---|---|
| `useEpics.ts` | **localStorage 전용** (API 호출 없음) |
| `ReactiveEpicController.java` | **백엔드에 존재** (사용 가능한 API) |
| Mock Epic IDs | `epic-1`, `epic-2`, `epic-3` (DB와 전혀 다름) |
| DB Epic IDs | `epic-001-01` ~ `epic-001-04`, `epic-002-01` ~ `epic-002-02` |

### 왜 이게 역할 분리에서 결정적인가

- Epic은 **PO 화면의 중심 엔티티**
- localStorage Epic이면 **권한/스코프/감사로그가 불가능**
- PMO는 감사/표준 준수가 필요한데, 로컬 데이터면 **거버넌스 0점**

### 조치 계획

#### 2-2-1) DB: order_num 추가 + 인덱스

```sql
ALTER TABLE project.epics
ADD COLUMN IF NOT EXISTS order_num INTEGER DEFAULT 0;

-- 프론트에서 프로젝트별 정렬에 사용
CREATE INDEX IF NOT EXISTS idx_epics_project_order
    ON project.epics(project_id, order_num, updated_at);
```

#### 2-2-2) 백엔드 Epic API 엔드포인트 확인

기존 `ReactiveEpicController.java`의 엔드포인트:

```
GET    /api/projects/{projectId}/epics        -- 목록
GET    /api/epics/{id}                        -- 상세
POST   /api/projects/{projectId}/epics        -- 생성
PUT    /api/epics/{id}                        -- 수정
DELETE /api/epics/{id}                        -- 삭제 (Phase 1에서 RESTRICT이므로 소프트 삭제 권장)
```

#### 2-2-3) useEpics.ts를 API 기반으로 전환

```typescript
// 변경 전: localStorage
export function useEpics(projectId?: string) {
  return useQuery<Epic[]>({
    queryFn: async () => {
      const epics = loadEpicsFromStorage();  // localStorage
      return epics.filter(e => e.projectId === projectId);
    },
  });
}

// 변경 후: API 기반
export function useEpics(projectId?: string) {
  return useQuery<Epic[]>({
    queryKey: epicKeys.list({ projectId }),
    queryFn: async () => {
      if (!projectId) return [];
      const response = await apiService.getEpicsForProject(projectId);
      return response?.data || response || [];
    },
    enabled: !!projectId,
  });
}
```

#### 2-2-4) apiService에 Epic 전용 메서드 추가/확인

```typescript
// api.ts에 추가
async getEpicsForProject(projectId: string) {
  return this.fetchWithFallback(
    `/projects/${projectId}/epics`, {}, { data: [] }
  );
}
```

#### 2-2-5) localStorage mock 완전 제거

> **원칙**: dev fixture는 `__DEV__` 가드가 아니라 **별도 스토리북/fixture 경로로만 유지**.
> 프로덕션 번들에 mock 데이터가 섞이지 않게 한다.

- `initialEpics` 배열 삭제
- `STORAGE_KEY` 관련 로직 제거
- `saveEpicsToStorage()`, `loadEpicsFromStorage()` 함수 제거
- dev fixture가 필요하면 `__fixtures__/epics.ts` 또는 스토리북으로 이동

#### 2-2-6) DTO 정합성: "없는 필드는 프론트에서 제거"가 원칙

| 프론트 필드 | 백엔드 DTO/DB 컬럼 | 조치 |
|---|---|---|
| `id` | `id` | OK |
| `projectId` | `project_id` | OK |
| `phaseId` | `phase_id` | OK |
| `wbsTaskId` | (없음) | **프론트에서 제거** (DB에 불필요) |
| `name` | `name` | OK |
| `description` | `description` | OK |
| `status` | `status` | 2-3에서 값 체계 통일 |
| `priority` | `priority` | OK (둘 다 enum) |
| `startDate` | (없음) | **프론트에서 제거 또는 파생** (DB에 start_date 없음) |
| `targetDate` | `target_completion_date` | OK |
| `progress` | `progress` | OK |
| `order` | `order_num` (신규) | **`order` → `order_num`으로 통일** |
| `color` | `color` | OK |

### 완료 조건

- [ ] `useEpics.ts`가 API 호출 기반으로 전환
- [ ] localStorage 관련 코드 **전체 제거** (프로덕션 번들에서 완전히 격리)
- [ ] `apiService`에 Epic CRUD 메서드 완비
- [ ] 프론트 Epic 타입에서 `wbsTaskId`, `startDate` 제거 또는 파생 처리
- [ ] `order` → `order_num` 통일
- [ ] Epic status 값 체계 통일 (2-3에서 처리)

---

## 2-3. 상태 체계 표준화 + 전이 이벤트 즉시 기록 (핵심)

### 현재 상태 체계 혼란

| 엔티티 | DB 상태값 | 프론트 상태값 |
|---|---|---|
| Sprint | `PLANNED`, `ACTIVE`, `COMPLETED` | `PLANNING`, `ACTIVE`, `COMPLETED`, `CANCELLED` |
| User Story | `COMPLETED`, `IN_PROGRESS`, `SELECTED`, `BACKLOG`, `READY` | `IDEA`, `REFINED`, `READY`, `IN_SPRINT`, `IN_PROGRESS`, `REVIEW`, `DONE`, `CANCELLED` |
| Backlog Item | `BACKLOG`, `IN_SPRINT`, `SELECTED`, `COMPLETED` | (미사용) |
| Epic | `DRAFT`, `ACTIVE`, `COMPLETED`, `CANCELLED` (migration) / `IN_PROGRESS`, `BACKLOG` (data.sql) | `OPEN`, `IN_PROGRESS`, `DONE`, `BLOCKED`, `CANCELLED` |

### 왜 PMO에서 이게 HIGH인가

PMO KPI 예시:
- "백로그 → 스프린트 전환 리드타임"
- "IN_SPRINT 체류시간"
- "REVIEW 단계 병목 비율"

이런 지표는 **상태 전이(transition)**를 기준으로 계산하는데,
상태 체계가 통일되지 않으면 **지표가 거짓말**이 된다.

### 2-3-1) 상태 표준: "DB 값이 진실", UI는 표현

> "도메인별 상태"는 분리해도 된다 (BacklogItemStatus vs StoryStatus vs SprintStatus).
> 대신 **전이 이벤트(transition event)**를 표준화한다.

**Sprint 상태** (3개):

```
PLANNED → ACTIVE → COMPLETED
                 → CANCELLED (예외)
```

**User Story 상태** (7개, 프론트 기준 채택):

```
IDEA → REFINED → READY → IN_SPRINT → IN_PROGRESS → REVIEW → DONE
                                                           → CANCELLED (어디서든)
```

**Backlog Item 상태** (4개):

```
BACKLOG → REFINED → IN_SPRINT → COMPLETED
                              → CANCELLED (예외)
```

**Epic 상태** (4개):

```
BACKLOG → IN_PROGRESS → COMPLETED
                      → CANCELLED (예외)
```

### 2-3-2) 전이 이벤트 테이블 (즉시 도입)

> 한 테이블로 모든 엔티티를 커버하는 구조.
> Phase 3에서 "PMO KPI View" 만들 때 한 곳에서 리드타임/체류시간 계산 가능.

```sql
-- audit 스키마 생성 (기존에 없으므로)
CREATE SCHEMA IF NOT EXISTS audit;

CREATE TABLE IF NOT EXISTS audit.status_transition_events (
    id               VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id        VARCHAR(36),
    project_id       VARCHAR(36),
    entity_type      VARCHAR(32) NOT NULL,   -- 'STORY','BACKLOG_ITEM','EPIC','SPRINT'
    entity_id        VARCHAR(36) NOT NULL,
    from_status      VARCHAR(32),            -- NULL이면 최초 상태
    to_status        VARCHAR(32) NOT NULL,
    changed_by       VARCHAR(36),
    change_source    VARCHAR(32) NOT NULL,   -- 'API','MIGRATION','SYSTEM'
    changed_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    metadata         JSONB                   -- 추가 컨텍스트 (reason, request_id 등)
);

-- 엔티티별 이력 조회 (리드타임/체류시간 계산용)
CREATE INDEX IF NOT EXISTS idx_transition_entity_time
    ON audit.status_transition_events(entity_type, entity_id, changed_at);

-- 프로젝트별 타임라인 조회 (PMO 대시보드용)
CREATE INDEX IF NOT EXISTS idx_transition_project_time
    ON audit.status_transition_events(project_id, changed_at);
```

**왜 이 구조가 좋은가**:

- 엔티티별로 테이블을 쪼개지 않아도 됨
- Phase 3에서 "PMO KPI View" 만들 때 한 곳에서 리드타임/체류시간 계산 가능
- `change_source`로 "마이그레이션이 만든 이벤트"와 "실제 운영 이벤트"를 구분 가능

### 2-3-3) 상태 정규화 + 이벤트 동시 적재

> **핵심 원칙**: 단순 UPDATE만 하면 과거 상태가 사라진다.
> 바꾸는 순간 **이벤트를 먼저 적재**하고, 그 다음 상태를 변경한다.

#### User Story 상태 정규화

```sql
BEGIN;

-- Step 1: 바뀔 대상만 이벤트로 적재 (상태 변경 이력 보존)
INSERT INTO audit.status_transition_events
    (id, project_id, entity_type, entity_id, from_status, to_status,
     changed_by, change_source, metadata)
SELECT
    gen_random_uuid()::text,
    us.project_id,
    'STORY',
    us.id,
    us.status,
    CASE
        WHEN us.status = 'COMPLETED' THEN 'DONE'
        WHEN us.status = 'SELECTED'  THEN 'IN_SPRINT'
        ELSE us.status
    END,
    NULL,
    'MIGRATION',
    jsonb_build_object('reason', 'phase2_normalize_status_values')
FROM task.user_stories us
WHERE us.status IN ('COMPLETED', 'SELECTED');

-- Step 2: 실제 상태값 정규화
UPDATE task.user_stories SET status = 'DONE'      WHERE status = 'COMPLETED';
UPDATE task.user_stories SET status = 'IN_SPRINT'  WHERE status = 'SELECTED';

COMMIT;
```

#### Epic 상태 정규화

```sql
BEGIN;

-- Step 1: 이벤트 적재
INSERT INTO audit.status_transition_events
    (id, project_id, entity_type, entity_id, from_status, to_status,
     changed_by, change_source, metadata)
SELECT
    gen_random_uuid()::text,
    e.project_id,
    'EPIC',
    e.id,
    e.status,
    CASE
        WHEN e.status = 'ACTIVE' THEN 'IN_PROGRESS'
        WHEN e.status = 'DRAFT'  THEN 'BACKLOG'
        ELSE e.status
    END,
    NULL,
    'MIGRATION',
    jsonb_build_object('reason', 'phase2_normalize_status_values')
FROM project.epics e
WHERE e.status IN ('ACTIVE', 'DRAFT');

-- Step 2: 실제 상태값 정규화
UPDATE project.epics SET status = 'IN_PROGRESS' WHERE status = 'ACTIVE';
UPDATE project.epics SET status = 'BACKLOG'     WHERE status = 'DRAFT';

COMMIT;
```

#### Backlog Item 상태 정규화

```sql
BEGIN;

-- Step 1: 이벤트 적재
INSERT INTO audit.status_transition_events
    (id, project_id, entity_type, entity_id, from_status, to_status,
     changed_by, change_source, metadata)
SELECT
    gen_random_uuid()::text,
    (SELECT b.project_id FROM project.backlogs b WHERE b.id = bi.backlog_id),
    'BACKLOG_ITEM',
    bi.id,
    bi.status,
    CASE
        WHEN bi.status = 'SELECTED' THEN 'IN_SPRINT'
        ELSE bi.status
    END,
    NULL,
    'MIGRATION',
    jsonb_build_object('reason', 'phase2_normalize_status_values')
FROM project.backlog_items bi
WHERE bi.status IN ('SELECTED');

-- Step 2: 실제 상태값 정규화
UPDATE project.backlog_items SET status = 'IN_SPRINT' WHERE status = 'SELECTED';

COMMIT;
```

> **Sprint**: `PLANNED` → DB에서 유지. 프론트에서 `PLANNING`으로 표시하는 건 UI 레이어의 책임.
> DB 값을 바꿀 필요 없음 (의미가 같고, DB에서 PLANNED가 이미 표준).

### 2-3-4) 앞으로의 상태 변경: 이벤트를 어디서 남길까?

| 방식 | 장점 | 단점 |
|---|---|---|
| **서비스 레이어 (권장)** | 누가/어떤 API로 바꿨는지 정확히 기록, changed_by/request_id 가능 | 개발 비용 |
| DB 트리거 | 누락 없음, 빨리 시작 가능 | 애플리케이션 컨텍스트(사용자/권한) 붙이기 어려움, 디버깅 힘듦 |

**결정**:
- **Phase 2**: 마이그레이션에서 이벤트 적재 + 백엔드 **핵심 상태 변경 API에만** 이벤트 로깅 우선 적용
- **Phase 3~4**: 범위를 전체 상태 변경 API로 확대

> 트리거는 "빠르게 시작"에 좋지만, 장기적으로 서비스 레이어가 맞다.
> 트리거에서는 `changed_by` (현재 사용자)를 알 수 없기 때문.

### 프론트엔드: 매핑 로직 제거

상태가 DB에서 통일되면, `BacklogManagement.tsx`의 레거시 매핑 함수를 제거:

```typescript
// 이 매핑 함수들이 불필요해짐:
// const mapStatus = (status: string) => { ... }
// const isBacklogStatus = (status: string) => ['BACKLOG', 'IDEA', ...].includes(status);
```

### 완료 조건

- [ ] User Story 상태를 표준 7개로 통일 (DB)
- [ ] Epic 상태를 표준 4개로 통일 (DB)
- [ ] Backlog Item 상태 정규화 (`SELECTED` → `IN_SPRINT`)
- [ ] `audit.status_transition_events` 테이블 생성
- [ ] 모든 상태 정규화에 이벤트 적재 포함
- [ ] 프론트 매핑 로직 제거 또는 단순화
- [ ] `data.sql` 시드 데이터에 표준 상태값 사용
- [ ] 상태 체계 문서 작성 (`STATUS_STANDARD.md`)

---

## 2-4. Phase 2 무결성 감시 (조용히 깨짐 방지)

Phase 1의 view 철학을 Phase 2에도 이어서,
아래를 **CI 실패 조건**으로 넣으면 재발이 거의 사라진다.

### 검증 VIEW

```sql
-- [VIEW 1] story.backlog_item_id가 존재하지만 backlog_items에 없는 경우
CREATE OR REPLACE VIEW task.v_orphan_backlog_item_ref AS
SELECT us.id AS story_id, us.backlog_item_id
FROM task.user_stories us
WHERE us.backlog_item_id IS NOT NULL
  AND us.backlog_item_id NOT IN (SELECT id FROM project.backlog_items);

-- [VIEW 2] story_requirement_links가 story당 1개가 아닌 경우
CREATE OR REPLACE VIEW task.v_multi_requirement_stories AS
SELECT user_story_id, COUNT(DISTINCT requirement_id) AS req_count
FROM task.user_story_requirement_links
GROUP BY user_story_id
HAVING COUNT(DISTINCT requirement_id) > 1;

-- [VIEW 3] backlog_items에서 같은 backlog 내 requirement 중복
CREATE OR REPLACE VIEW project.v_dup_backlog_requirement AS
SELECT backlog_id, requirement_id, COUNT(*) AS cnt
FROM project.backlog_items
WHERE requirement_id IS NOT NULL
GROUP BY backlog_id, requirement_id
HAVING COUNT(*) > 1;
```

### CI 검증 스크립트: `verify_phase2_all.sql`

```sql
DO $$
DECLARE
    orphan_bi      INTEGER;
    multi_req      INTEGER;
    dup_req        INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphan_bi   FROM task.v_orphan_backlog_item_ref;
    SELECT COUNT(*) INTO multi_req   FROM task.v_multi_requirement_stories;
    SELECT COUNT(*) INTO dup_req     FROM project.v_dup_backlog_requirement;

    -- HARD FAIL
    IF orphan_bi > 0 THEN
        RAISE EXCEPTION '[Phase2 CI] % stories reference non-existent backlog_items', orphan_bi;
    END IF;
    IF multi_req > 0 THEN
        RAISE EXCEPTION '[Phase2 CI] % stories have multiple requirement links (Option A violation)', multi_req;
    END IF;
    IF dup_req > 0 THEN
        RAISE EXCEPTION '[Phase2 CI] % backlog_items have duplicate requirement_id per backlog', dup_req;
    END IF;

    RAISE NOTICE '[Phase2 CI] All integrity checks passed.';
END $$;
```

### 완료 조건

- [ ] 검증 VIEW 3개 생성
- [ ] CI 검증 스크립트 작성 (`verify_phase2_all.sql`)
- [ ] 모든 VIEW 결과 **0건** 확인

---

## Flyway 산출물 구성

### 파일 분리 원칙

> **스키마 변경 / 데이터 마이그레이션 / 이벤트 인프라 / 검증을 분리한다.**
>
> 이유: 운영에서 "이벤트 테이블만 먼저 만들고 싶다"거나
> "상태 정규화만 재실행" 같은 상황에 대비.

### 산출물

| # | 파일 | 책임 | 유형 |
|---|---|---|---|
| 1 | `V20260210_01__add_backlog_item_id_to_stories.sql` | backlog_item_id 컬럼 + 인덱스 + 매핑 + 유니크 인덱스 (옵션 A 계약) | 스키마+데이터 |
| 2 | `V20260210_02__add_epic_order_num.sql` | order_num 컬럼 + 인덱스 | 스키마 |
| 3 | `V20260210_03__create_transition_event_table.sql` | audit 스키마 + 이벤트 테이블 + 인덱스 | 스키마 |
| 4 | `V20260210_04__normalize_status_values_and_seed_events.sql` | 상태값 정규화 + 정규화 이벤트 적재 (Story/Epic/BacklogItem) | 데이터 |
| 5 | `V20260210_05__create_phase2_integrity_views.sql` | 무결성 VIEW 3개 + CI DO 블록 | 검증 |
| 6 | `verify_phase2_all.sql` | CI 검증 DO 블록 (Flyway 외부) | CI |

### 프론트엔드 산출물

| # | 파일 | 용도 |
|---|---|---|
| 1 | `useEpics.ts` 수정 | localStorage 제거 → API 기반 전환 |
| 2 | `api.ts` 수정 | Epic CRUD 메서드 추가/확인 |
| 3 | Epic 타입 수정 | `order` → `order_num`, `wbsTaskId`/`startDate` 제거 |

### 문서 산출물

| # | 파일 | 용도 |
|---|---|---|
| 1 | `STATUS_STANDARD.md` | 상태 체계 표준 + 전이 이벤트 계약 (필드/의미/change_source 정의) |

### 실행 순서

```
V20260210_01 (backlog_item_id + 옵션 A 계약)
    ↓
V20260210_02 (Epic order_num)
    ↓
V20260210_03 (audit.status_transition_events 테이블)
    ↓
V20260210_04 (상태 정규화 + 이벤트 적재)
    ↓
V20260210_05 (무결성 VIEW + CI)
    ↓
verify_phase2_all.sql (CI: 전체 정합성 검증)
```

---

## 롤백 계획

### backlog_item_id 롤백

```sql
-- 유니크 인덱스 제거
DROP INDEX IF EXISTS task.uq_story_requirement_one;
DROP INDEX IF EXISTS project.uq_backlog_items_backlog_requirement;

-- 컬럼 제거
ALTER TABLE task.user_stories DROP COLUMN IF EXISTS backlog_item_id;
```

### order_num 롤백

```sql
ALTER TABLE project.epics DROP COLUMN IF EXISTS order_num;
```

### 상태 정규화 롤백

```sql
-- 이벤트 테이블에서 MIGRATION 이벤트를 참조하여 원래 상태로 복원
UPDATE task.user_stories us
SET status = ev.from_status
FROM audit.status_transition_events ev
WHERE ev.entity_type = 'STORY'
  AND ev.entity_id = us.id
  AND ev.change_source = 'MIGRATION'
  AND ev.metadata->>'reason' = 'phase2_normalize_status_values';

UPDATE project.epics e
SET status = ev.from_status
FROM audit.status_transition_events ev
WHERE ev.entity_type = 'EPIC'
  AND ev.entity_id = e.id
  AND ev.change_source = 'MIGRATION'
  AND ev.metadata->>'reason' = 'phase2_normalize_status_values';

UPDATE project.backlog_items bi
SET status = ev.from_status
FROM audit.status_transition_events ev
WHERE ev.entity_type = 'BACKLOG_ITEM'
  AND ev.entity_id = bi.id
  AND ev.change_source = 'MIGRATION'
  AND ev.metadata->>'reason' = 'phase2_normalize_status_values';
```

> **롤백 장점**: 이벤트 테이블에 `from_status`가 있으므로,
> 정규화 전 원래 상태를 정확히 복원할 수 있다.

### VIEW 롤백

```sql
DROP VIEW IF EXISTS task.v_orphan_backlog_item_ref;
DROP VIEW IF EXISTS task.v_multi_requirement_stories;
DROP VIEW IF EXISTS project.v_dup_backlog_requirement;
```

### 이벤트 테이블 롤백

```sql
-- 주의: 운영 이벤트가 쌓인 후에는 DROP하면 안 됨
-- Phase 2 직후 롤백이 필요한 경우에만
DROP TABLE IF EXISTS audit.status_transition_events;
DROP SCHEMA IF EXISTS audit;
```

---

## 다음 Phase 의존 관계

Phase 2 완료 후:

- **Phase 3**: 역할별 View API가 정확한 상태/연결/이벤트 기반으로 집계 가능
  - PMO KPI View: `audit.status_transition_events`에서 리드타임/체류시간 바로 계산
  - PO View: `backlog_items` → `user_stories` 체인이 완성되어 rollup 가능
- **Phase 4**: FK 제약조건 도입 시 `backlog_item_id` FK도 포함
  - 옵션 A 유니크 인덱스가 이미 데이터를 보호하므로 FK 추가가 안전

### Phase 2 vs Phase 4 책임 분담

| 제약 | Phase 2 | Phase 4 |
|---|---|---|
| `backlog_item_id` orphan 방지 | VIEW + CI로 감시 | FK 추가 |
| `requirement_id` 유일성 | **유니크 인덱스 (여기서 강제)** | - |
| `story_requirement_links` 1:1 | **유니크 인덱스 (여기서 강제)** | - |
| `backlog_item_id → backlog_items.id` FK | - | Phase 4에서 추가 |
