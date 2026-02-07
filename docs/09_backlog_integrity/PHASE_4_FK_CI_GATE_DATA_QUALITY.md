# Phase 4: FK 제약조건 + CI 게이트 + 데이터 품질 대시보드

> **우선순위**: MEDIUM (운영 성숙 단계)
> **소요 기간**: 2~5일
> **목표**: 다시는 이런 데이터 정합성 문제가 발생하지 않게 "즉시 실패" 3중 안전망 구축
> **선행 조건**: Phase 0~2 (데이터 정합성 복구 완료), Phase 3 (View API 구축)
> **후속 의존**: 없음 (최종 운영 안정화 단계)

---

## 핵심 목표: "즉시 실패" 3중 안전망

Phase 4의 핵심은 **"잘못된 데이터가 들어오면 즉시 실패"**하는 구조를 3중으로 만드는 것이다.

| 계층 | 역할 | 실패 시점 |
|---|---|---|
| **DB FK** | 잘못된 참조는 INSERT/UPDATE 단계에서 실패 | 트랜잭션 시점 (ms) |
| **CI Gate** | seed/migration이 깨지면 PR 단계에서 실패 | PR 머지 전 (분) |
| **런타임 DataQuality** | 운영 중 "NULL 급증/링크율 하락"을 경고로 노출 | PMO가 볼 때 (시간~일) |

> 1계층만으로는 부족하다. FK는 "참조 깨짐"만 막고, NULL 급증은 못 막는다.
> CI Gate는 seed 시점만 검사하고, 런타임 데이터 변질은 못 잡는다.
> 3중으로 합쳐야 "다시는 깨지지 않는" 구조가 된다.

---

## 4-1. FK 제약조건 점진 도입

### 4-1-1. 왜 점진적인가

- 기존 데이터 정리가 **완료된 후에만** FK를 걸 수 있음
- FK를 한꺼번에 걸면 seed/테스트/마이그레이션이 깨질 수 있음
- Phase 0~2에서 데이터 정합성을 먼저 확보한 후, Phase 4에서 **제약조건으로 고정**

### 4-1-2. FK 도입 대상

| FK 컬럼 | 참조 대상 | 정리 Phase | ON DELETE | 위험도 |
|---|---|---|---|---|
| `task.tasks.part_id` | `project.parts.id` | Phase 0 | SET NULL | CRITICAL |
| `project.backlog_items.requirement_id` | `project.requirements.id` | Phase 0 | SET NULL | CRITICAL |
| `task.user_stories.epic_id` | `project.epics.id` | Phase 1 | **RESTRICT** | HIGH |
| `task.user_stories.part_id` | `project.parts.id` | Phase 1 | SET NULL | MEDIUM |
| `task.user_stories.backlog_item_id` | `project.backlog_items.id` | Phase 2 | SET NULL | MEDIUM |

### 4-1-3. ON DELETE 정책: "SET NULL vs RESTRICT" 결정 근거

#### 당장 SET NULL을 유지하는 FK (4개)

| FK | ON DELETE | 근거 |
|---|---|---|
| `tasks.part_id` | SET NULL | 파트 삭제/재편 시 태스크는 미배정으로 전환. 태스크가 사라지면 안 됨 |
| `user_stories.part_id` | SET NULL | 파트 삭제 시 스토리는 미배정으로. Part는 재편 가능성 있음 |
| `backlog_items.requirement_id` | SET NULL | 요구사항 삭제 시 아이템은 연결 해제. 요구사항 변경은 잦을 수 있음 |
| `user_stories.backlog_item_id` | SET NULL | 백로그 아이템 삭제 시 스토리는 연결 해제 |

#### RESTRICT로 보호하는 FK (1개)

| FK | ON DELETE | 근거 |
|---|---|---|
| `user_stories.epic_id` | **RESTRICT** | Phase 1에서 결정한 정책. Epic 삭제 시 KPI/추적성이 **즉시 파괴**됨. Epic은 `archived_at`/`is_active`로 소프트 삭제해야 함 |

> **왜 Epic만 RESTRICT인가**: Epic은 PO View/PMO KPI의 **집계 축**이다.
> Epic이 SET NULL로 사라지면 "NULL 폭탄"이 KPI를 오염시킨다.
> Part/Requirement는 재편/삭제가 운영 프로세스에서 현실적으로 일어나지만,
> Epic은 "프로젝트 수명 동안 유지"되어야 하는 스코프 단위다.

#### 향후 전환 로드맵 (soft delete 도입 시)

> **현재**: SET NULL (운영 중단 방지, Phase 4 성숙도에 적합)
> **목표**: DELETE 금지 + soft delete (`is_active=false` 또는 `archived_at`)
>
> 운영 안정 후 (Phase 4 완료 2~4주 뒤) 다음을 검토:
> 1. Part/Requirement에 `is_active` 컬럼 추가
> 2. 삭제 대신 `is_active = false` 전환
> 3. FK를 SET NULL → RESTRICT로 강화
> 4. 쿼리에 `WHERE is_active = true` 조건 추가
>
> 이 전환은 Phase 4 범위 밖이지만, **DataQuality에서 "NULL 급증"을 DANGER로 탐지**해서
> soft delete 전환의 필요성을 데이터로 입증할 수 있다.

### 4-1-4. FK 인덱스 사전 확인

FK는 자식 테이블의 참조 컬럼에 인덱스가 없으면 부모 테이블 DELETE/UPDATE 시 성능이 나빠진다.

```sql
-- FK 도입 전 인덱스 확인 (schema.sql에서 이미 생성된 것 확인)
-- task.tasks.part_id     → idx_tasks_part_id (이미 존재)
-- user_stories.epic_id   → Phase 1에서 추가 예정 (v_orphan_epic_ref가 사용)
-- user_stories.part_id   → idx_user_stories_part_id (이미 존재)
-- user_stories.feature_id → idx_user_stories_feature_id (이미 존재)
-- backlog_items.requirement_id → 없으면 추가 필요

-- 누락 인덱스 보완
CREATE INDEX IF NOT EXISTS idx_user_stories_epic_id
    ON task.user_stories(epic_id);

CREATE INDEX IF NOT EXISTS idx_backlog_items_requirement_id
    ON project.backlog_items(requirement_id);

CREATE INDEX IF NOT EXISTS idx_user_stories_backlog_item_id
    ON task.user_stories(backlog_item_id);
```

### 4-1-5. 도입 순서 (3단계)

#### 단계 1: Phase 1/2 검증 VIEW 기반 사전 확인

```sql
-- Phase 1에서 만든 orphan/mismatch VIEW 결과 확인
-- 모든 VIEW가 0건이 확인된 후에만 단계 2로 진행

DO $$
DECLARE
    v_orphan_parts    INTEGER;
    v_orphan_epics    INTEGER;
    v_orphan_reqs     INTEGER;
    v_mismatch_parts  INTEGER;
    v_mismatch_epics  INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_orphan_parts   FROM task.v_orphan_part_ref;
    SELECT COUNT(*) INTO v_orphan_epics   FROM task.v_orphan_epic_ref;
    SELECT COUNT(*) INTO v_orphan_reqs    FROM project.v_orphan_requirement_ref;
    SELECT COUNT(*) INTO v_mismatch_parts FROM task.v_mismatch_story_feature_part;
    SELECT COUNT(*) INTO v_mismatch_epics FROM task.v_mismatch_story_epic_text;

    IF v_orphan_parts + v_orphan_epics + v_orphan_reqs
       + v_mismatch_parts + v_mismatch_epics > 0 THEN
        RAISE EXCEPTION
            'FK 도입 사전 검증 실패: orphan_parts=%, orphan_epics=%, orphan_reqs=%, '
            'mismatch_parts=%, mismatch_epics=%',
            v_orphan_parts, v_orphan_epics, v_orphan_reqs,
            v_mismatch_parts, v_mismatch_epics;
    END IF;

    RAISE NOTICE 'FK 도입 사전 검증 통과: 모든 orphan/mismatch 0건';
END $$;
```

#### 단계 2: NOT VALID로 FK 추가 (새 데이터부터 강제)

```sql
BEGIN;

-- 누락 인덱스 보완 (FK 성능 보장)
CREATE INDEX IF NOT EXISTS idx_user_stories_epic_id
    ON task.user_stories(epic_id);
CREATE INDEX IF NOT EXISTS idx_backlog_items_requirement_id
    ON project.backlog_items(requirement_id);
CREATE INDEX IF NOT EXISTS idx_user_stories_backlog_item_id
    ON task.user_stories(backlog_item_id);

-- FK 1: task.tasks.part_id → project.parts.id
ALTER TABLE task.tasks
ADD CONSTRAINT fk_tasks_part_id
    FOREIGN KEY (part_id) REFERENCES project.parts(id)
    ON DELETE SET NULL
    NOT VALID;

-- FK 2: task.user_stories.epic_id → project.epics.id
-- RESTRICT: Epic 삭제는 허용하지 않음 (soft delete로 전환해야 함)
ALTER TABLE task.user_stories
ADD CONSTRAINT fk_user_stories_epic_id
    FOREIGN KEY (epic_id) REFERENCES project.epics(id)
    ON DELETE RESTRICT
    NOT VALID;

-- FK 3: task.user_stories.part_id → project.parts.id
ALTER TABLE task.user_stories
ADD CONSTRAINT fk_user_stories_part_id
    FOREIGN KEY (part_id) REFERENCES project.parts(id)
    ON DELETE SET NULL
    NOT VALID;

-- FK 4: project.backlog_items.requirement_id → project.requirements.id
ALTER TABLE project.backlog_items
ADD CONSTRAINT fk_backlog_items_requirement_id
    FOREIGN KEY (requirement_id) REFERENCES project.requirements(id)
    ON DELETE SET NULL
    NOT VALID;

-- FK 5: task.user_stories.backlog_item_id → project.backlog_items.id
ALTER TABLE task.user_stories
ADD CONSTRAINT fk_user_stories_backlog_item_id
    FOREIGN KEY (backlog_item_id) REFERENCES project.backlog_items(id)
    ON DELETE SET NULL
    NOT VALID;

COMMIT;
```

**`NOT VALID`의 의미**:
- 기존 데이터에 대한 검증을 생략 (ACCESS EXCLUSIVE 락 시간 최소화)
- **새로 INSERT/UPDATE되는 데이터**에는 FK가 즉시 강제됨
- 나중에 `VALIDATE CONSTRAINT`로 기존 데이터도 검증 가능

#### 단계 3: VALIDATE로 기존 데이터까지 검증

> **주의**: `VALIDATE CONSTRAINT`는 테이블 전체 스캔이 필요하다.
> 대형 테이블에서는 비용이 클 수 있으므로, **트래픽 적은 시간에 FK별로 개별 실행**한다.

```sql
-- 운영 안정 확인 후, FK별 개별 실행 (순차)
-- 한 번에 하나씩, 각 실행 후 에러 확인

-- 1단계 (CRITICAL FK 먼저)
ALTER TABLE task.tasks VALIDATE CONSTRAINT fk_tasks_part_id;
ALTER TABLE project.backlog_items VALIDATE CONSTRAINT fk_backlog_items_requirement_id;

-- 2단계 (HIGH FK)
ALTER TABLE task.user_stories VALIDATE CONSTRAINT fk_user_stories_epic_id;
ALTER TABLE task.user_stories VALIDATE CONSTRAINT fk_user_stories_part_id;

-- 3단계 (MEDIUM FK)
ALTER TABLE task.user_stories VALIDATE CONSTRAINT fk_user_stories_backlog_item_id;
```

### 4-1-6. 완료 조건

- [ ] Phase 1/2 검증 VIEW 전부 0건 확인 (사전 조건)
- [ ] 누락 인덱스 3개 생성 완료
- [ ] 5개 FK 제약조건 모두 `NOT VALID`로 추가 완료
- [ ] seed 데이터 로딩 시 FK 위반 없음 확인
- [ ] `VALIDATE CONSTRAINT` 순차 실행 후 전체 성공 확인
- [ ] 새 데이터 INSERT 시 잘못된 참조가 즉시 에러 나는지 확인
- [ ] Epic DELETE 시도 시 RESTRICT로 차단되는지 확인

---

## 4-2. CI 데이터 품질 게이트

### 4-2-1. 목표

> seed/fixture 로딩 후 검증 쿼리를 실행해서,
> invalid reference가 **0건이 아니면 빌드를 실패**시킨다.
> Phase 1의 orphan/mismatch VIEW + Phase 2의 Option A 유일성 규칙까지 한 곳에서 검사한다.

### 4-2-2. 검증 쿼리 세트 (Phase 1~3 계약 통합)

```sql
-- ci_data_quality_check.sql
-- CI에서 실행: 모든 HARD 검증이 통과해야 빌드 성공

DO $$
DECLARE
    -- Phase 1 orphan (참조 무결성)
    v_orphan_parts       INTEGER;
    v_orphan_epics       INTEGER;
    v_orphan_reqs        INTEGER;

    -- Phase 1 mismatch (계약 위반)
    v_mismatch_parts     INTEGER;
    v_mismatch_epics     INTEGER;

    -- Phase 1 계약: feature → part 파생 규칙
    v_feature_no_part    INTEGER;

    -- Phase 2 Option A 유일성 규칙
    v_dup_backlog_req    INTEGER;
    v_dup_story_req      INTEGER;
    v_invalid_backlog_ref INTEGER;

    -- Soft Warning 지표
    v_null_epic_rate     NUMERIC;
    v_null_part_rate     NUMERIC;
BEGIN
    -- ============================================================
    -- HARD FAIL 그룹 1: 참조 무결성 (Phase 0~1 VIEWs)
    -- ============================================================
    SELECT COUNT(*) INTO v_orphan_parts  FROM task.v_orphan_part_ref;
    SELECT COUNT(*) INTO v_orphan_epics  FROM task.v_orphan_epic_ref;
    SELECT COUNT(*) INTO v_orphan_reqs   FROM project.v_orphan_requirement_ref;

    IF v_orphan_parts + v_orphan_epics + v_orphan_reqs > 0 THEN
        RAISE EXCEPTION
            'HARD FAIL [참조 무결성]: orphan_parts=%, orphan_epics=%, orphan_reqs=%',
            v_orphan_parts, v_orphan_epics, v_orphan_reqs;
    END IF;

    -- ============================================================
    -- HARD FAIL 그룹 2: 계약 위반 (Phase 1 mismatch)
    -- ============================================================
    SELECT COUNT(*) INTO v_mismatch_parts FROM task.v_mismatch_story_feature_part;
    SELECT COUNT(*) INTO v_mismatch_epics FROM task.v_mismatch_story_epic_text;

    IF v_mismatch_parts + v_mismatch_epics > 0 THEN
        RAISE EXCEPTION
            'HARD FAIL [계약 위반]: mismatch_parts=%, mismatch_epics=%',
            v_mismatch_parts, v_mismatch_epics;
    END IF;

    -- ============================================================
    -- HARD FAIL 그룹 3: feature-part 파생 규칙 (Phase 1 계약)
    -- feature_id가 있는데 part_id가 NULL인 스토리
    -- ============================================================
    SELECT COUNT(*) INTO v_feature_no_part
    FROM task.user_stories
    WHERE feature_id IS NOT NULL AND part_id IS NULL;

    IF v_feature_no_part > 0 THEN
        RAISE EXCEPTION
            'HARD FAIL [파생 규칙]: % stories with feature_id but no part_id',
            v_feature_no_part;
    END IF;

    -- ============================================================
    -- HARD FAIL 그룹 4: Option A 유일성 규칙 (Phase 2 계약)
    -- ============================================================

    -- 4a. backlog_items: (backlog_id, requirement_id) 중복
    SELECT COUNT(*) INTO v_dup_backlog_req
    FROM (
        SELECT backlog_id, requirement_id, COUNT(*) AS cnt
        FROM project.backlog_items
        WHERE requirement_id IS NOT NULL
        GROUP BY backlog_id, requirement_id
        HAVING COUNT(*) > 1
    ) dupes;

    -- 4b. user_story_requirement_links: story당 2개 이상 requirement
    SELECT COUNT(*) INTO v_dup_story_req
    FROM (
        SELECT user_story_id, COUNT(*) AS cnt
        FROM task.user_story_requirement_links
        GROUP BY user_story_id
        HAVING COUNT(*) > 1
    ) dupes;

    -- 4c. user_stories.backlog_item_id가 있으면 backlog_items에 존재해야 함
    SELECT COUNT(*) INTO v_invalid_backlog_ref
    FROM task.user_stories us
    LEFT JOIN project.backlog_items bi ON us.backlog_item_id = bi.id
    WHERE us.backlog_item_id IS NOT NULL AND bi.id IS NULL;

    IF v_dup_backlog_req + v_dup_story_req + v_invalid_backlog_ref > 0 THEN
        RAISE EXCEPTION
            'HARD FAIL [Option A 위반]: dup_backlog_req=%, dup_story_req=%, invalid_backlog_ref=%',
            v_dup_backlog_req, v_dup_story_req, v_invalid_backlog_ref;
    END IF;

    -- ============================================================
    -- SOFT WARNING: NULL 비율 (빌드는 통과, 경고 출력)
    -- ============================================================
    SELECT ROUND(100.0 * COUNT(CASE WHEN epic_id IS NULL THEN 1 END)
           / NULLIF(COUNT(*), 0), 1)
    INTO v_null_epic_rate
    FROM task.user_stories;

    SELECT ROUND(100.0 * COUNT(CASE WHEN part_id IS NULL THEN 1 END)
           / NULLIF(COUNT(*), 0), 1)
    INTO v_null_part_rate
    FROM task.user_stories;

    IF v_null_epic_rate > 20 THEN
        RAISE WARNING 'SOFT WARNING: epic_id NULL rate = %% (threshold: 20%%)',
            v_null_epic_rate;
    END IF;

    IF v_null_part_rate > 30 THEN
        RAISE WARNING 'SOFT WARNING: part_id NULL rate = %% (threshold: 30%%)',
            v_null_part_rate;
    END IF;

    -- ============================================================
    -- 최종 결과
    -- ============================================================
    RAISE NOTICE 'DATA QUALITY GATE PASSED: '
        'orphan(p=%,e=%,r=%) mismatch(p=%,e=%) feature_no_part=% '
        'optionA(dup_bl=%,dup_sr=%,inv_bl=%) epic_null=%%% part_null=%%%',
        v_orphan_parts, v_orphan_epics, v_orphan_reqs,
        v_mismatch_parts, v_mismatch_epics,
        v_feature_no_part,
        v_dup_backlog_req, v_dup_story_req, v_invalid_backlog_ref,
        v_null_epic_rate, v_null_part_rate;
END $$;
```

### 4-2-3. 검증 기준 (Hard Fail vs Soft Warning)

| # | 검증 항목 | 기준 | 실패 유형 | Phase 출처 |
|---|---|---|---|---|
| 1 | 잘못된 part 참조 (orphan) | 0건 | **HARD FAIL** | Phase 0~1 |
| 2 | 잘못된 epic 참조 (orphan) | 0건 | **HARD FAIL** | Phase 1 |
| 3 | 잘못된 requirement 참조 (orphan) | 0건 | **HARD FAIL** | Phase 0 |
| 4 | story-feature part 불일치 (mismatch) | 0건 | **HARD FAIL** | Phase 1 |
| 5 | story-epic 텍스트 불일치 (mismatch) | 0건 | **HARD FAIL** | Phase 1 |
| 6 | feature 있는데 part 없는 스토리 | 0건 | **HARD FAIL** | Phase 1 계약 |
| 7 | backlog_items requirement 중복 | 0건 | **HARD FAIL** | Phase 2 Option A |
| 8 | story당 requirement 2건 이상 | 0건 | **HARD FAIL** | Phase 2 Option A |
| 9 | 잘못된 backlog_item_id 참조 | 0건 | **HARD FAIL** | Phase 2 |
| 10 | epic_id NULL 비율 | > 20% | SOFT WARNING | - |
| 11 | part_id NULL 비율 | > 30% | SOFT WARNING | - |

### 4-2-4. Soft Warning 임계치 단계적 강화 계획

> 운영 초기에 임계치를 너무 빡빡하게 잡으면 개발이 멈추고,
> 너무 약하면 게이트의 의미가 없다.
> **단계적 강화**로 "점점 조여가는" 전략을 쓴다.

| 시점 | epic_id NULL 임계치 | part_id NULL 임계치 | 실패 유형 |
|---|---|---|---|
| **도입 직후 (1주차)** | > 30% | > 40% | SOFT WARNING |
| **안정화 (2~3주차)** | > 20% | > 30% | SOFT WARNING |
| **운영 프로젝트 (4주차~)** | > 15% | > 20% | 특정 프로젝트만 HARD FAIL |
| **성숙 (장기)** | > 10% | > 10% | 전체 HARD FAIL |

> 이 강화 계획은 `ci_data_quality_check.sql` 상단의 `threshold` 변수로 제어한다.
> PMO가 프로젝트별 성숙도를 판단해서 임계치를 조정하는 것이 바람직하다.

### 4-2-5. CI 파이프라인 통합

```yaml
# .github/workflows/data-quality.yml
name: Data Quality Gate

on:
  push:
    paths:
      - 'PMS_IC_BackEnd_v1.2/src/main/resources/data.sql'
      - 'PMS_IC_BackEnd_v1.2/src/main/resources/schema.sql'
      - 'PMS_IC_BackEnd_v1.2/src/main/resources/db/migration/**'

jobs:
  data-quality:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: pms_ic_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4

      - name: Load schema
        run: |
          psql -h localhost -U test -d pms_ic_test \
            -f PMS_IC_BackEnd_v1.2/src/main/resources/schema.sql

      - name: Run Flyway migrations
        run: |
          for f in PMS_IC_BackEnd_v1.2/src/main/resources/db/migration/V*.sql; do
            psql -h localhost -U test -d pms_ic_test -f "$f"
          done

      - name: Load seed data
        run: |
          psql -h localhost -U test -d pms_ic_test \
            -f PMS_IC_BackEnd_v1.2/src/main/resources/data.sql

      - name: Run data quality checks
        run: |
          psql -h localhost -U test -d pms_ic_test \
            -f scripts/ci_data_quality_check.sql
```

### 4-2-6. 완료 조건

- [ ] `ci_data_quality_check.sql` 스크립트 작성 (HARD 9개 + SOFT 2개)
- [ ] CI 파이프라인에 데이터 품질 게이트 추가
- [ ] data.sql, schema.sql, migration 변경 시 자동 실행 설정
- [ ] HARD FAIL 발생 시 빌드 실패 확인
- [ ] SOFT WARNING은 로그에만 기록되고 빌드는 통과하는지 확인
- [ ] Phase 3 `ScopeAssertionsTest.java`도 CI 파이프라인에 포함

---

## 4-3. PMO용 "데이터 품질 대시보드"

### 4-3-1. 목표

> PMO가 운영할 시스템이면, 데이터 품질 지표가 곧 거버넌스다.
> Phase 3의 PMO Portfolio View에서 `dataQuality` 필드(Integrity/Readiness 2층)로 시작한 것을
> **전용 대시보드로 확장**한다.

### 4-3-2. Phase 3 dataQuality와의 관계

Phase 3의 PMO Portfolio View에 이미 `dataQuality`가 포함되어 있다:
- `integrity`: 참조 무결성 (invalid_ref, mismatch)
- `readiness`: 운영 준비 (null_epic, null_part, unlinked)
- `score`: `integrityScore × 0.6 + readinessScore × 0.4`

Phase 4의 대시보드는 이것을 **심화**한다:

| Phase 3 (PMO View 내장) | Phase 4 (전용 대시보드) |
|---|---|
| Integrity/Readiness 2층 점수 | **3층 (참조 무결성 + 관계 완성도 + 스코프 추적)** + 등급 |
| 현재 스냅샷만 | **시계열 추이 (history)** |
| 건수 기반 | 건수 + **비율 기반 지표** 병행 |
| warnings 목록 | **조치 필요 항목 + 제안 액션** |

### 4-3-3. 데이터 품질 지표 정의

지표를 **"입력 완성도"와 "참조 무결성"으로 명확히 분리**한다.

#### 참조 무결성 지표 (Integrity) — 목표: 전부 100%

| # | 지표 | 정의 | SQL 분모/분자 |
|---|---|---|---|
| 1 | Part JOIN 성공률 | part_id가 채워진 tasks 중, parts에 실제 존재하는 비율 | 분모: `part_id IS NOT NULL` 건수, 분자: `JOIN parts ON ... IS NOT NULL` 건수 |
| 2 | Requirement JOIN 성공률 | requirement_id가 채워진 backlog_items 중, requirements에 실제 존재하는 비율 | 분모: `requirement_id IS NOT NULL` 건수, 분자: `JOIN requirements ON ... IS NOT NULL` 건수 |
| 3 | Feature-Part 정합성 | feature_id가 있는 스토리 중, story.part_id == feature.part_id인 비율 | 분모: `feature_id IS NOT NULL` 건수, 분자: `story.part_id = feature.part_id` 건수 |
| 4 | Epic-Story 이름 일치율 | epic_id가 있는 스토리 중, story.epic TEXT == epics.name인 비율 | 분모: `epic_id IS NOT NULL` 건수, 분자: `story.epic = epics.name` 건수 |

#### 관계 완성도 지표 (Readiness) — 목표: > 80~90%

| # | 지표 | 정의 | 목표 |
|---|---|---|---|
| 5 | Epic ID 커버리지 | user_stories에서 epic_id NOT NULL 비율 | > 80% |
| 6 | Part ID 커버리지 | user_stories에서 part_id NOT NULL 비율 | > 90% |
| 7 | Backlog Item 연결률 | user_stories에서 backlog_item_id NOT NULL 비율 | > 70% |

#### 스코프 추적 지표 (Traceability) — 목표: > 70~80%

| # | 지표 | 정의 | 목표 |
|---|---|---|---|
| 8 | 요구사항 입력 완성도 | backlog_items에서 requirement_id NOT NULL 비율 | > 80% |
| 9 | 요구사항 참조 유효성 | requirement_id가 채워진 backlog_items 중, requirements에 실제 존재하는 비율 | 100% |
| 10 | 스토리 분해율 | backlog_items 중 1개 이상 story가 연결된 비율 | > 70% |

> **"입력 완성도" vs "참조 유효성" 분리가 중요한 이유**:
> - 요구사항 입력 완성도 80% = "20%는 아직 requirement_id를 안 넣었다" (프로세스 미완)
> - 요구사항 참조 유효성 100% = "넣은 건 전부 유효하다" (시스템 건강)
> PMO는 둘을 **다른 긴급도**로 봐야 한다.

### 4-3-4. API 엔드포인트

```
GET /api/projects/{projectId}/data-quality
```

> **권한**: `VIEW_DATA_QUALITY` capability 필요 (Phase 3에서 PMO에만 부여)

**응답 구조**:

```json
{
  "projectId": "proj-001",
  "timestamp": "2026-02-07T10:00:00Z",
  "overallScore": 72,
  "grade": "C",
  "categories": {
    "integrity": {
      "score": 100,
      "weight": 0.4,
      "metrics": [
        {
          "id": "part_join_rate",
          "name": "Part JOIN 성공률",
          "value": 100,
          "target": 100,
          "unit": "%",
          "status": "OK",
          "numerator": 3,
          "denominator": 3
        },
        {
          "id": "requirement_join_rate",
          "name": "Requirement JOIN 성공률",
          "value": 100,
          "target": 100,
          "unit": "%",
          "status": "OK",
          "numerator": 5,
          "denominator": 5
        },
        {
          "id": "feature_part_match_rate",
          "name": "Feature-Part 정합성",
          "value": 100,
          "target": 100,
          "unit": "%",
          "status": "OK",
          "numerator": 4,
          "denominator": 4
        },
        {
          "id": "epic_text_match_rate",
          "name": "Epic-Story 이름 일치율",
          "value": 100,
          "target": 100,
          "unit": "%",
          "status": "OK",
          "numerator": 4,
          "denominator": 4
        }
      ]
    },
    "readiness": {
      "score": 73,
      "weight": 0.35,
      "metrics": [
        {
          "id": "epic_id_coverage",
          "name": "Epic ID 커버리지",
          "value": 80,
          "target": 80,
          "unit": "%",
          "status": "OK",
          "numerator": 4,
          "denominator": 5
        },
        {
          "id": "part_id_coverage",
          "name": "Part ID 커버리지",
          "value": 60,
          "target": 90,
          "unit": "%",
          "status": "DANGER",
          "numerator": 3,
          "denominator": 5
        },
        {
          "id": "backlog_link_rate",
          "name": "Backlog Item 연결률",
          "value": 80,
          "target": 70,
          "unit": "%",
          "status": "OK",
          "numerator": 4,
          "denominator": 5
        }
      ]
    },
    "traceability": {
      "score": 55,
      "weight": 0.25,
      "metrics": [
        {
          "id": "requirement_input_completeness",
          "name": "요구사항 입력 완성도",
          "value": 71.4,
          "target": 80,
          "unit": "%",
          "status": "WARNING",
          "numerator": 5,
          "denominator": 7
        },
        {
          "id": "requirement_ref_validity",
          "name": "요구사항 참조 유효성",
          "value": 100,
          "target": 100,
          "unit": "%",
          "status": "OK",
          "numerator": 5,
          "denominator": 5
        },
        {
          "id": "story_decomposition_rate",
          "name": "스토리 분해율",
          "value": 57.1,
          "target": 70,
          "unit": "%",
          "status": "DANGER",
          "numerator": 4,
          "denominator": 7
        }
      ]
    }
  },
  "issues": [
    {
      "severity": "DANGER",
      "category": "readiness",
      "metric": "part_id_coverage",
      "description": "스토리 5건 중 2건이 Part 미배정",
      "affectedEntities": ["story-001-04", "story-002-01"],
      "suggestedAction": "PM이 해당 스토리에 Part를 배정해야 합니다"
    },
    {
      "severity": "DANGER",
      "category": "traceability",
      "metric": "story_decomposition_rate",
      "description": "백로그 아이템 7건 중 3건이 스토리로 분해되지 않음",
      "affectedEntities": ["bl-item-004", "bl-item-005", "bl-item-007"],
      "suggestedAction": "PO가 해당 백로그 아이템을 스토리로 분해해야 합니다"
    }
  ],
  "history": [
    { "date": "2026-02-01", "score": 45, "integrity": 80, "readiness": 30, "traceability": 20 },
    { "date": "2026-02-03", "score": 60, "integrity": 100, "readiness": 50, "traceability": 35 },
    { "date": "2026-02-07", "score": 72, "integrity": 100, "readiness": 73, "traceability": 55 }
  ]
}
```

### 4-3-5. 등급 체계

| 등급 | 점수 | 의미 | CI 게이트 연계 |
|---|---|---|---|
| **A** | 90~100 | 거버넌스 우수 - 모든 참조 정합, 높은 커버리지 | - |
| **B** | 75~89 | 양호 - 일부 개선 필요 | - |
| **C** | 60~74 | 주의 - 데이터 품질 개선 필요 | - |
| **D** | 40~59 | 위험 - 집계/보고 신뢰도 낮음 | readinessScore < 50 → CI WARNING |
| **F** | 0~39 | 심각 - 참조 무결성 위반, 즉시 조치 필요 | integrityScore < 80 → CI HARD FAIL |

### 4-3-6. 점수 계산 공식

```
참조 무결성 점수 (Integrity)
= (Part JOIN 성공률 + Requirement JOIN 성공률 + Feature-Part 정합성 + Epic-Story 일치율) / 4

관계 완성도 점수 (Readiness)
= (Epic ID 커버리지 + Part ID 커버리지 + Backlog Item 연결률) / 3

스코프 추적 점수 (Traceability)
= (요구사항 입력 완성도 + 요구사항 참조 유효성 + 스토리 분해율) / 3

전체 점수 = (Integrity × 0.4) + (Readiness × 0.35) + (Traceability × 0.25)
```

> **Phase 3의 scoring과의 관계**:
> Phase 3 PMO View = `integrityScore × 0.6 + readinessScore × 0.4` (간이 2층)
> Phase 4 DataQuality = `integrity × 0.4 + readiness × 0.35 + traceability × 0.25` (정밀 3층)
> Phase 4가 더 세분화된 정밀 점수를 제공한다.

### 4-3-7. 백엔드 SQL 쿼리 (수정된 정확한 정의)

```sql
-- 데이터 품질 지표 집계 쿼리
-- 프로젝트 스코프: WHERE project_id = :projectId

WITH integrity_metrics AS (
    -- 1. Part JOIN 성공률 (task.tasks)
    -- 정의: part_id가 채워진 tasks 중 parts에 실제 존재하는 비율
    SELECT 'part_join_rate' AS metric_id,
        COUNT(CASE WHEN p.id IS NOT NULL THEN 1 END) AS numerator,
        COUNT(*) AS denominator
    FROM task.tasks t
    LEFT JOIN project.parts p ON t.part_id = p.id
    WHERE t.part_id IS NOT NULL
      AND t.project_id = :projectId

    UNION ALL

    -- 2. Requirement JOIN 성공률 (backlog_items)
    -- 정의: requirement_id가 채워진 backlog_items 중 requirements에 실제 존재하는 비율
    SELECT 'requirement_join_rate',
        COUNT(CASE WHEN r.id IS NOT NULL THEN 1 END),
        COUNT(*)
    FROM project.backlog_items bi
    LEFT JOIN project.requirements r ON bi.requirement_id = r.id
    JOIN project.backlogs b ON bi.backlog_id = b.id
    WHERE bi.requirement_id IS NOT NULL
      AND b.project_id = :projectId

    UNION ALL

    -- 3. Feature-Part 정합성
    -- 정의: feature_id가 있는 스토리 중 story.part_id == feature.part_id인 비율
    SELECT 'feature_part_match_rate',
        COUNT(CASE WHEN us.part_id = f.part_id THEN 1 END),
        COUNT(*)
    FROM task.user_stories us
    JOIN project.features f ON us.feature_id = f.id
    WHERE us.feature_id IS NOT NULL
      AND us.project_id = :projectId

    UNION ALL

    -- 4. Epic-Story 이름 일치율
    -- 정의: epic_id가 있는 스토리 중 story.epic TEXT == epics.name인 비율
    SELECT 'epic_text_match_rate',
        COUNT(CASE WHEN us.epic = e.name THEN 1 END),
        COUNT(*)
    FROM task.user_stories us
    JOIN project.epics e ON us.epic_id = e.id
    WHERE us.epic_id IS NOT NULL
      AND us.project_id = :projectId
),

readiness_metrics AS (
    -- 5. Epic ID 커버리지
    SELECT 'epic_id_coverage' AS metric_id,
        COUNT(epic_id) AS numerator,
        COUNT(*) AS denominator
    FROM task.user_stories
    WHERE project_id = :projectId

    UNION ALL

    -- 6. Part ID 커버리지
    SELECT 'part_id_coverage',
        COUNT(part_id),
        COUNT(*)
    FROM task.user_stories
    WHERE project_id = :projectId

    UNION ALL

    -- 7. Backlog Item 연결률
    SELECT 'backlog_link_rate',
        COUNT(backlog_item_id),
        COUNT(*)
    FROM task.user_stories
    WHERE project_id = :projectId
),

traceability_metrics AS (
    -- 8. 요구사항 입력 완성도 (requirement_id NOT NULL 비율)
    SELECT 'requirement_input_completeness' AS metric_id,
        COUNT(bi.requirement_id) AS numerator,
        COUNT(*) AS denominator
    FROM project.backlog_items bi
    JOIN project.backlogs b ON bi.backlog_id = b.id
    WHERE b.project_id = :projectId

    UNION ALL

    -- 9. 요구사항 참조 유효성 (채워진 것 중 실제 존재하는 비율)
    SELECT 'requirement_ref_validity',
        COUNT(CASE WHEN r.id IS NOT NULL THEN 1 END),
        COUNT(*)
    FROM project.backlog_items bi
    LEFT JOIN project.requirements r ON bi.requirement_id = r.id
    JOIN project.backlogs b ON bi.backlog_id = b.id
    WHERE bi.requirement_id IS NOT NULL
      AND b.project_id = :projectId

    UNION ALL

    -- 10. 스토리 분해율 (1개 이상 story가 연결된 backlog_items 비율)
    SELECT 'story_decomposition_rate',
        COUNT(DISTINCT us.backlog_item_id),
        COUNT(DISTINCT bi.id)
    FROM project.backlog_items bi
    JOIN project.backlogs b ON bi.backlog_id = b.id
    LEFT JOIN task.user_stories us ON us.backlog_item_id = bi.id
    WHERE b.project_id = :projectId
)

SELECT metric_id,
       numerator,
       denominator,
       CASE WHEN denominator > 0
            THEN ROUND(100.0 * numerator / denominator, 1)
            ELSE 100.0 END AS value
FROM (
    SELECT * FROM integrity_metrics
    UNION ALL
    SELECT * FROM readiness_metrics
    UNION ALL
    SELECT * FROM traceability_metrics
) all_metrics;
```

### 4-3-8. 이력 저장: "조회 시 스냅샷" 전략

> 비동기 배치/스케줄러를 처음부터 도입하면 운영 복잡도가 커진다.
> **`/data-quality` API 호출 시 현재 스냅샷을 자동 저장**하는 전략으로 시작한다.

```sql
-- 스냅샷 테이블 (Phase 4에서 생성)
CREATE TABLE IF NOT EXISTS audit.data_quality_snapshots (
    id                VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id        VARCHAR(36) NOT NULL,
    snapshot_date     DATE NOT NULL DEFAULT CURRENT_DATE,
    overall_score     NUMERIC(5,1) NOT NULL,
    grade             VARCHAR(1) NOT NULL,
    integrity_score   NUMERIC(5,1) NOT NULL,
    readiness_score   NUMERIC(5,1) NOT NULL,
    traceability_score NUMERIC(5,1) NOT NULL,
    metrics_json      JSONB NOT NULL,  -- 전체 지표 스냅샷
    created_at        TIMESTAMP DEFAULT NOW(),
    UNIQUE(project_id, snapshot_date)  -- 프로젝트당 하루 1건
);

CREATE INDEX IF NOT EXISTS idx_dq_snapshots_project_date
    ON audit.data_quality_snapshots(project_id, snapshot_date);
```

```java
// DataQualityService.java — 조회 시 스냅샷 UPSERT
public Mono<DataQualityResponse> getDataQuality(String projectId) {
    return calculateMetrics(projectId)
        .flatMap(response -> {
            // 오늘 날짜의 스냅샷이 없거나 오래됐으면 UPSERT
            return snapshotRepository
                .upsertTodaySnapshot(projectId, response)
                .thenReturn(response);
        })
        .flatMap(response -> {
            // history 데이터 조회 (최근 30일)
            return snapshotRepository
                .findByProjectIdAndDateRange(projectId, 30)
                .collectList()
                .map(history -> response.withHistory(history));
        });
}
```

> **장점**: PMO가 대시보드를 볼 때 자동으로 히스토리가 쌓인다.
> **이후 전환**: 안정되면 크론/스케줄러로 전환해서 매일 자동 스냅샷 가능.

### 4-3-9. PMO 대시보드 UI 구성

```
┌──────────────────────────────────────────────────────────┐
│  데이터 품질 대시보드                  등급: [C] 72점      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐     │
│  │ 참조 무결성    │ │ 관계 완성도    │ │ 스코프 추적   │     │
│  │ (Integrity)  │ │ (Readiness)  │ │ (Trace)      │     │
│  │  ● 100%      │ │  ▲ 73%       │ │  ▲ 55%      │     │
│  │  가중치 40%   │ │  가중치 35%   │ │  가중치 25%  │     │
│  └──────────────┘ └──────────────┘ └──────────────┘     │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │ 지표 상세                                         │    │
│  │                                                   │    │
│  │ [참조 무결성]                                      │    │
│  │ ● Part JOIN 성공률        100% (3/3)   목표:100%  │    │
│  │ ● Requirement JOIN 성공률 100% (5/5)   목표:100%  │    │
│  │ ● Feature-Part 정합성     100% (4/4)   목표:100%  │    │
│  │ ● Epic-Story 이름 일치율  100% (4/4)   목표:100%  │    │
│  │                                                   │    │
│  │ [관계 완성도]                                      │    │
│  │ ● Epic ID 커버리지         80% (4/5)   목표: 80%  │    │
│  │ ▲ Part ID 커버리지         60% (3/5)   목표: 90%  │    │
│  │ ● Backlog 연결률           80% (4/5)   목표: 70%  │    │
│  │                                                   │    │
│  │ [스코프 추적]                                      │    │
│  │ ▲ 요구사항 입력 완성도     71.4% (5/7) 목표: 80%  │    │
│  │ ● 요구사항 참조 유효성     100% (5/5)  목표:100%  │    │
│  │ ▲ 스토리 분해율            57.1% (4/7) 목표: 70%  │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │ 점수 추이                                         │    │
│  │ 45 ──── 60 ──── 72 ──── (목표: 80)               │    │
│  │ integrity:  80 → 100 → 100                        │    │
│  │ readiness:  30 → 50  → 73                         │    │
│  │ traceability: 20 → 35 → 55                        │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │ 조치 필요 항목                                     │    │
│  │ [DANGER] story-001-04, story-002-01: Part 미배정   │    │
│  │   → PM이 해당 스토리에 Part를 배정해야 합니다       │    │
│  │ [DANGER] bl-item-004~007: 스토리 미분해            │    │
│  │   → PO가 해당 백로그 아이템을 스토리로 분해해야     │    │
│  └──────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

### 4-3-10. 완료 조건

- [ ] 데이터 품질 API 엔드포인트 구현 (`@PreAuthorize` VIEW_DATA_QUALITY)
- [ ] 10개 지표 모두 SQL 쿼리로 집계 가능 (분자/분모 명확)
- [ ] 3층 점수 계산 로직 구현 (Integrity/Readiness/Traceability)
- [ ] 등급 산정 로직 구현 (A~F)
- [ ] `audit.data_quality_snapshots` 테이블 생성 + UPSERT 로직
- [ ] 이력 데이터 시계열 추이 조회 (최근 30일)
- [ ] PMO Workbench 대시보드 컴포넌트에 통합
- [ ] 조치 필요 항목에 역할별 제안 액션 포함 (PM→Part 배정, PO→스토리 분해)
- [ ] Phase 3 `DATA_QUALITY_RULES.md`와 임계치 일관성 확인

---

## 4-4. Phase 3 → Phase 4 연계 정리

### Phase 3에서 이미 만든 것 → Phase 4에서 활용

| Phase 3 산출물 | Phase 4 활용 |
|---|---|
| `DATA_QUALITY_RULES.md` | CI 게이트 임계치/경고 타입의 **기준 문서** |
| `VIEW_CONTRACTS.md` | DataQuality API가 참조하는 KPI 정의의 상위 계약 |
| PMO View `dataQuality.score` | Phase 4 `overallScore`의 간이 버전 (Phase 3은 2층, Phase 4는 3층) |
| `ScopeAssertionsTest.java` | CI 파이프라인에 함께 포함 |

### Phase 1~2에서 만든 것 → Phase 4에서 활용

| Phase 1~2 산출물 | Phase 4 활용 |
|---|---|
| `v_orphan_*` VIEW 3개 | CI 게이트 HARD FAIL 그룹 1 |
| `v_mismatch_*` VIEW 2개 | CI 게이트 HARD FAIL 그룹 2 |
| `uq_backlog_items_backlog_requirement` | CI 게이트 HARD FAIL 그룹 4 (Option A) |
| `uq_story_requirement_one` | CI 게이트 HARD FAIL 그룹 4 (Option A) |
| `audit.status_transition_events` | PMO 이벤트 기반 KPI (Phase 3에서 활용, Phase 4 대시보드에 연계) |

---

## 산출물 체크리스트

| # | 파일 | 용도 | 연계 |
|---|---|---|---|
| 1 | `V20260215_01__add_fk_indexes.sql` | FK 대상 컬럼 인덱스 보완 (3개) | 4-1 |
| 2 | `V20260215_02__add_foreign_keys_not_valid.sql` | FK 제약조건 5개 추가 (NOT VALID) | 4-1 |
| 3 | `V20260216__validate_foreign_keys.sql` | FK 검증 (VALIDATE, 순차 실행) | 4-1 |
| 4 | `V20260217__create_data_quality_snapshots.sql` | `audit.data_quality_snapshots` 테이블 | 4-3 |
| 5 | `scripts/ci_data_quality_check.sql` | CI 데이터 품질 게이트 (HARD 9 + SOFT 2) | 4-2 |
| 6 | `.github/workflows/data-quality.yml` | CI 파이프라인 설정 | 4-2 |
| 7 | `DataQualityController.java` 생성 | 데이터 품질 API + PreAuthorize | 4-3 |
| 8 | `DataQualityService.java` 생성 | 10개 지표 집계 + 점수 계산 + 스냅샷 | 4-3 |
| 9 | `DataQualityMetric.java` DTO | 지표/카테고리/이력 응답 모델 | 4-3 |
| 10 | `DataQualityDashboard.tsx` 생성 | PMO 대시보드 컴포넌트 (3층 점수 + 추이) | 4-3 |
| 11 | `useDataQuality.ts` 생성 | 데이터 품질 React Query Hook | 4-3 |

---

## 롤백 계획

| 롤백 대상 | 방법 | 위험도 |
|---|---|---|
| FK 제약조건 | `ALTER TABLE ... DROP CONSTRAINT ...` | 낮음 (FK 제거 후 기존 동작 복원) |
| 인덱스 추가 | `DROP INDEX IF EXISTS ...` | 낮음 |
| CI 게이트 | `.github/workflows/data-quality.yml` 삭제 또는 비활성화 | 낮음 |
| 스냅샷 테이블 | `DROP TABLE audit.data_quality_snapshots` | 낮음 (이력 데이터 손실만) |
| DataQuality API | 엔드포인트 제거 | 낮음 (PMO View의 간이 dataQuality는 Phase 3에 남아있음) |

> Phase 4는 **기존 기능을 변경하지 않고 제약조건/게이트/대시보드를 추가**하는 방식이므로,
> 롤백 위험은 전체 Phase 중 가장 낮다.

---

## 구현 순서

| 단계 | 작업 | 소요 | 비고 |
|---|---|---|---|
| **1** | CI 게이트 스크립트 작성 + CI 파이프라인 설정 | 0.5일 | FK 전에 CI 먼저 (seed 검증 확보) |
| **2** | FK 인덱스 보완 + NOT VALID FK 5개 추가 | 0.5일 | Flyway 마이그레이션 |
| **3** | VALIDATE CONSTRAINT 순차 실행 | 0.5일 | 트래픽 적은 시간에 |
| **4** | DataQuality API + 스냅샷 테이블 + 점수 로직 | 1~2일 | 10개 지표 SQL + 3층 점수 |
| **5** | PMO 대시보드 UI 컴포넌트 | 0.5~1일 | Phase 3 PmoPortfolioWorkbench에 통합 |

> **왜 CI 먼저인가**: FK를 걸기 전에 CI에서 seed가 깨끗한지 확인해야 한다.
> CI가 통과한 뒤 FK를 걸면 "FK 추가했는데 seed가 안 돌아가는" 사고를 막을 수 있다.

---

## 전체 Phase 요약: 왜 이 순서인가

```
Phase 0: "조인 0건" 제거          → 화면이 데이터를 보여줄 수 있게
Phase 1: ID 기반 관계 구축         → 집계/필터가 가능하게
Phase 2: 표준 모델 + API 계약 고정  → 역할별 화면의 데이터 기반 확보
Phase 3: 역할별 View API + UI     → PO/PM/PMO가 각자의 질문에 답하는 화면
Phase 4: FK + CI + 데이터 품질     → 다시는 깨지지 않게 (3중 안전망)

데이터 정합성 복구(Phase 0~1) = 역할 분리의 토대
```

### "즉시 실패" 3중 안전망 완성

```
[개발자 INSERT] → DB FK 즉시 차단 (ms)
[PR 머지]      → CI Gate 즉시 실패 (분)
[운영 중]      → PMO DataQuality 경고 (시간~일)

어느 시점에서든 "잘못된 데이터"가 들어오면 즉시 탐지된다.
```
