# Phase 1: "텍스트 기반 관계"를 "ID 기반 계약"으로 전환

> **우선순위**: HIGH
> **소요 기간**: 1~2일
> **목표**: Epic/Part/WBS 기준 집계가 가능한 관계형 계약(Contract) 만들기
> **선행 조건**: Phase 0 완료 (JOIN 0건 문제 해결, FK 응급 처치)
> **후속 의존**: Phase 2 (백로그 모델 확정), Phase 3 (역할별 View)

---

## 왜 Phase 1이 핵심인가

Phase 0이 "JOIN 0건"을 없애는 응급 수술이었다면, Phase 1은 **"텍스트 기반 관계"를 "ID 기반 계약"으로 바꿔서** 집계/거버넌스/권한 View가 신뢰 가능한 구조가 되도록 만드는 핵심 공정이다.

Epic/Part/WBS는 화면 축(PO/PMO/PM) 그 자체이기 때문에, TEXT로 두면 언젠가 반드시 틀어진다:

- **입력 실수**: "문서 처리" vs "문서처리" vs "문서 처리 자동화"
- **공백/줄임말**: 번역 차이, 약어 사용
- **집계 불일치**: 같은 Epic을 가리키는데 텍스트가 달라 GROUP BY가 쪼개짐

**ID 기반 계약**으로 바꾸면 이 모든 문제가 구조적으로 사라진다.

---

## 1-1. user_stories.epic TEXT → epic_id FK 전환 (HIGH)

### 현상

`task.user_stories.epic`이 VARCHAR(100) 자유 텍스트 필드라서
실제 `project.epics` 엔티티 이름과 **매칭되지 않음**.

| Story ID | epic 컬럼 값 | 실제 Epic 엔티티 이름 | Epic ID |
|---|---|---|---|
| story-001-01 | `문서 처리` | `문서 처리 자동화` | epic-001-01 |
| story-001-02 | `사기 탐지` | `사기 탐지 시스템` | epic-001-02 |
| story-001-03 | `API 개발` | `API 플랫폼 구축` | epic-001-03 |
| story-001-04 | `보안` | `보안 및 규정 준수` | epic-001-04 |
| story-002-01 | `리서치` | **매칭 Epic 없음** | ??? |

### 근본 원인

- `epic` 컬럼이 FK가 아닌 자유 텍스트 → 입력 시점에 이미 불일치
- proj-002의 `리서치`는 어떤 Epic과도 매칭 불가 (proj-002 Epics: 모바일 UX 혁신, 실시간 알림 시스템)

### 영향 범위

- **PO 화면**: Epic별 스토리 집계가 텍스트 매칭 의존 → 불일치
- **PMO 화면**: Epic 기반 KPI (스토리 포인트 합계, 완료율)가 거짓
- **프론트 EpicTreeView**: story를 epic으로 그룹핑할 때 누락 발생

### 조치 계획

#### Step 1: epic_id 컬럼 추가 + FK (ON DELETE RESTRICT 권장)

```sql
-- 스키마 변경
ALTER TABLE task.user_stories
ADD COLUMN IF NOT EXISTS epic_id VARCHAR(36);

-- 인덱스 (FK 성능)
CREATE INDEX IF NOT EXISTS idx_user_stories_epic_id
    ON task.user_stories(epic_id);

-- FK: ON DELETE RESTRICT (삭제 방지 - 아래 설계 결정 참조)
ALTER TABLE task.user_stories
ADD CONSTRAINT fk_user_stories_epic_id
    FOREIGN KEY (epic_id) REFERENCES project.epics(id)
    ON DELETE RESTRICT
    NOT VALID;
```

> **설계 결정: ON DELETE SET NULL vs RESTRICT**
>
> `SET NULL`이면 Epic 삭제 시 스토리의 epic_id가 조용히 NULL로 변하고,
> KPI가 눈에 띄지 않게 깨진다.
>
> Epic은 보통 삭제되면 안 되고 **소프트 삭제(ARCHIVED)**가 맞다.
> 따라서 **ON DELETE RESTRICT**로 걸어서 실제 DELETE를 차단하고,
> 운영에서는 status를 `ARCHIVED`로 변경하는 방식을 사용한다.
>
> 향후 `project.epics`에 소프트 삭제 컬럼 추가를 권장:
> ```sql
> ALTER TABLE project.epics
> ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP,
> ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
> ```

#### Step 2: 기존 데이터 매핑 (seed 한정, ID 기반)

```sql
BEGIN;

-- ========================================
-- 사전 검증: 매핑할 스토리/Epic 존재 확인
-- ========================================
DO $$
DECLARE
    story_cnt INTEGER;
    epic_cnt INTEGER;
BEGIN
    SELECT COUNT(*) INTO story_cnt
    FROM task.user_stories
    WHERE id IN ('story-001-01','story-001-02','story-001-03','story-001-04','story-002-01');

    SELECT COUNT(*) INTO epic_cnt
    FROM project.epics
    WHERE id IN ('epic-001-01','epic-001-02','epic-001-03','epic-001-04');

    IF story_cnt < 5 THEN
        RAISE EXCEPTION '[Phase1-1] Expected 5 stories, found %', story_cnt;
    END IF;
    IF epic_cnt < 4 THEN
        RAISE EXCEPTION '[Phase1-1] Expected 4 epics, found %', epic_cnt;
    END IF;
END $$;

-- ========================================
-- 매핑: project_id + story ID 기반 (seed 한정)
-- ========================================
UPDATE task.user_stories SET epic_id = 'epic-001-01'
WHERE project_id = 'proj-001' AND id = 'story-001-01';

UPDATE task.user_stories SET epic_id = 'epic-001-02'
WHERE project_id = 'proj-001' AND id = 'story-001-02';

UPDATE task.user_stories SET epic_id = 'epic-001-03'
WHERE project_id = 'proj-001' AND id = 'story-001-03';

UPDATE task.user_stories SET epic_id = 'epic-001-04'
WHERE project_id = 'proj-001' AND id = 'story-001-04';

-- ========================================
-- story-002-01 '리서치': 미분류(NULL)로 유지
-- ========================================
-- 이유:
--   1. Phase 1은 "계약(Contract)"을 세우는 단계이고,
--      "분류 정책"은 추후에 바뀔 수 있는 룰이다.
--   2. 리서치가 어느 Epic인지 확정되지 않은 상태에서
--      자동 배정하면 PMO KPI가 조용히 왜곡될 수 있다.
--   3. NULL = "미분류" 신호 → 거버넌스 지표로 활용 가능.
--
-- Phase 2 또는 운영 룰 확정 단계에서:
--   - 자동 분류 정책 도입 시 '자동배정(규칙 기반)' 라벨 필수
--   - 또는 PO/PM이 직접 분류하도록 UI에서 유도
-- (epic_id는 INSERT 시 NULL이 기본값이므로 별도 UPDATE 불필요)

-- ========================================
-- 사후 검증
-- ========================================
DO $$
DECLARE
    mapped_cnt INTEGER;
BEGIN
    SELECT COUNT(*) INTO mapped_cnt
    FROM task.user_stories
    WHERE epic_id IS NOT NULL;

    -- proj-001의 4건이 매핑되어야 함
    IF mapped_cnt < 4 THEN
        RAISE EXCEPTION '[Phase1-1] Expected >= 4 mapped stories, found %', mapped_cnt;
    END IF;
END $$;

COMMIT;
```

#### Step 3: epic 텍스트 컬럼을 정확한 이름으로 동기화

```sql
-- epic_id가 있는 스토리: epic TEXT를 Epic 엔티티 이름으로 갱신
-- (표시용 유지 - 향후 View/API에서 JOIN으로 대체 예정)
UPDATE task.user_stories us
SET epic = e.name
FROM project.epics e
WHERE us.epic_id = e.id
  AND us.epic_id IS NOT NULL;
```

#### Step 4: data.sql 시드 파일 수정

```sql
-- 기존 INSERT에 epic_id 추가, epic TEXT를 정확한 이름으로 변경
INSERT INTO task.user_stories
    (id, project_id, title, description, priority, status,
     story_points, sprint_id, epic, epic_id, ...)
VALUES
    ('story-001-01', 'proj-001', 'OCR 문서 업로드', ...,
     '문서 처리 자동화', 'epic-001-01', ...),
    ('story-001-02', 'proj-001', '사기 탐지 대시보드', ...,
     '사기 탐지 시스템', 'epic-001-02', ...),
    ('story-001-03', 'proj-001', '보험청구 API 연동', ...,
     'API 플랫폼 구축', 'epic-001-03', ...),
    ('story-001-04', 'proj-001', '데이터 암호화 구현', ...,
     '보안 및 규정 준수', 'epic-001-04', ...),
    ('story-002-01', 'proj-002', '사용자 리서치 분석', ...,
     '리서치', NULL, ...)  -- 미분류: epic_id = NULL
ON CONFLICT (id) DO UPDATE SET
    epic = EXCLUDED.epic,
    epic_id = EXCLUDED.epic_id;
```

#### Step 5: schema.sql 업데이트

`task.user_stories` 테이블 정의에 `epic_id` 컬럼 추가.

### 운영 확장 대비: Epic 별칭(Alias) 매핑 테이블 (권장)

지금은 seed 데이터 5건이라 수동 ID 매핑이 충분하지만,
운영에서 스토리가 수백/수천 개로 늘면 매핑을 수동으로 유지할 수 없다.

**운영 단계에서 도입할 별칭 테이블**:

```sql
-- 텍스트 별칭 → epic_id 정규화 테이블
CREATE TABLE IF NOT EXISTS task.story_epic_aliases (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id VARCHAR(36) NOT NULL REFERENCES project.projects(id),
    alias_text VARCHAR(255) NOT NULL,        -- "문서 처리", "문서처리", "Doc Processing"
    epic_id VARCHAR(36) NOT NULL REFERENCES project.epics(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, alias_text)
);

-- 활용: 신규 스토리 입력 시 alias_text로 epic_id 자동 매칭
-- 미매칭 시 → 미분류(NULL)로 두고 데이터 품질 이슈로 표면화
```

> 이 테이블은 Phase 1 필수 산출물은 아니다.
> 다만 Phase 3(View API)나 운영 안정화 단계에서 도입하면
> "문서 처리"/"문서처리"/"Doc Processing" 같은 변형을 모두 하나의 Epic으로 정규화할 수 있다.

### "미분류" 처리에 대한 역할별 관점

> PMO/PO/PM 역할 분리에서 "미분류"는 오히려 유용한 신호다.
> 단, 미분류가 **왜 미분류인지**를 화면에서 보여줘야 한다.

- **PO**: "이 스토리는 아직 Epic에 배정되지 않았습니다" → 분류 액션 유도
- **PMO**: "미분류 스토리 비율" → 거버넌스 지표로 활용
- **PM**: 미분류 스토리는 스프린트 투입 전 분류 필수로 체크

### 검증 쿼리

```sql
-- [V1] epic_id 커버리지 (proj-001: 100%, proj-002: 미분류 1건 허용)
SELECT
    project_id,
    COUNT(*) AS total_stories,
    COUNT(epic_id) AS with_epic_id,
    COUNT(*) - COUNT(epic_id) AS without_epic_id,
    ROUND(100.0 * COUNT(epic_id) / COUNT(*), 1) AS coverage_pct
FROM task.user_stories
GROUP BY project_id;

-- [V2] epic_id JOIN 결과 전체 확인
SELECT us.id, us.project_id, us.title,
       us.epic AS epic_text, e.name AS epic_name, us.epic_id
FROM task.user_stories us
LEFT JOIN project.epics e ON us.epic_id = e.id;

-- [V3] epic TEXT vs epic_id 이름 불일치 검출 (0건이어야 함)
-- → 1-3 mismatch VIEW에서 CI 강제
SELECT us.id, us.epic AS text_epic, e.name AS id_epic
FROM task.user_stories us
JOIN project.epics e ON us.epic_id = e.id
WHERE us.epic IS DISTINCT FROM e.name;
```

### 완료 조건

- [ ] `task.user_stories`에 `epic_id` 컬럼 추가 (FK: ON DELETE RESTRICT)
- [ ] proj-001 4건의 스토리 `epic_id` 매핑 완료
- [ ] story-002-01은 **의도적 미분류(NULL)**로 유지
- [ ] `epic` TEXT 컬럼이 Epic 엔티티 이름과 동기화됨
- [ ] `schema.sql` 및 `data.sql` 반영
- [ ] FK VALIDATE 완료
- [ ] Flyway 마이그레이션 생성

---

## 1-2. User Story part_id 전부 NULL 해결 (MEDIUM)

### 현상

`task.user_stories`의 `part_id`가 모든 행에서 NULL.
INSERT 시 `part_id`를 포함하지 않았고, 이후 UPDATE도 `feature_id`와 `wbs_item_id`만 설정.

결과: **Part별 스토리 필터링/집계가 구조적으로 불가**.

### 영향 범위

- **PM 화면**: "내 파트 스토리"가 항상 0건
- **PMO 화면**: "파트별 스토리 포인트 분포"가 빈 차트
- **백로그 관리**: Part 필터 선택 시 스토리가 모두 사라짐

### 설계 결정: "파생값" 계약

| 방법 | 접근 | 장점 | 단점 |
|---|---|---|---|
| **A (채택)** | `feature.part_id`에서 파생 + 저장 | 자연스러운 계층; 쿼리 단순 | feature.part_id 변경 시 동기화 필요 |
| B | 저장 안 함, 조회 시 JOIN으로 계산 | 절대 불일치 없음 | 쿼리 복잡도 증가 |
| C | 스토리가 직접 part_id 독립 관리 | 유연함 | feature.part_id와 불일치 가능성 높음 |

**결정: 방법 A** - Story의 part_id는 Feature의 part_id에서 파생하여 저장한다.

> **핵심 계약**: "story.part_id의 원천(Source of Truth)은 feature.part_id다."
>
> 이 계약을 유지하기 위한 안전장치:
> 1. **seed에서**: story.part_id를 직접 넣지 않고, 마이그레이션 스크립트가 feature에서 파생하여 채움
> 2. **운영에서**: 1-3 mismatch VIEW + CI로 불일치를 감지
> 3. **향후**: feature.part_id 변경 트리거 또는 애플리케이션 레벨 동기화 도입 검토

Feature가 없는 스토리는 **NULL 허용** (미분류 신호).

### 조치 스크립트

```sql
BEGIN;

-- ========================================
-- 사전 검증: feature-story 관계 및 feature.part_id 확인
-- ========================================
DO $$
DECLARE
    stories_with_feature INTEGER;
    features_with_part INTEGER;
BEGIN
    -- feature_id가 있는 스토리 수
    SELECT COUNT(*) INTO stories_with_feature
    FROM task.user_stories WHERE feature_id IS NOT NULL;

    -- part_id가 있는 feature 수 (story가 참조하는 것 중)
    SELECT COUNT(DISTINCT f.id) INTO features_with_part
    FROM task.user_stories us
    JOIN project.features f ON us.feature_id = f.id
    WHERE f.part_id IS NOT NULL;

    RAISE NOTICE '[Phase1-2] Stories with feature: %, Features with part: %',
        stories_with_feature, features_with_part;
END $$;

-- ========================================
-- 파생: feature.part_id → story.part_id
-- ========================================
UPDATE task.user_stories us
SET part_id = f.part_id,
    updated_at = NOW()
FROM project.features f
WHERE us.feature_id = f.id
  AND f.part_id IS NOT NULL
  AND us.part_id IS NULL;

-- ========================================
-- 사후 검증
-- ========================================
DO $$
DECLARE
    feature_but_no_part INTEGER;
BEGIN
    -- feature가 있는데 part_id가 NULL인 스토리 (0이어야 함)
    SELECT COUNT(*) INTO feature_but_no_part
    FROM task.user_stories us
    JOIN project.features f ON us.feature_id = f.id
    WHERE f.part_id IS NOT NULL
      AND us.part_id IS NULL;

    IF feature_but_no_part > 0 THEN
        RAISE EXCEPTION '[Phase1-2] % stories have feature with part but story.part_id is NULL',
            feature_but_no_part;
    END IF;
END $$;

COMMIT;
```

### data.sql 시드 파일 수정 전략

> **원칙**: seed에서 story.part_id를 직접 명시하지 않는다.
> 대신, feature.part_id가 기준이고, 마이그레이션 스크립트가 채운다.

기존 UPDATE 구문 (data.sql 1074~1078 라인)은 `feature_id`와 `wbs_item_id`만 설정:

```sql
-- 현재 상태 (feature_id, wbs_item_id만 설정)
UPDATE task.user_stories SET feature_id = 'feat-001-01', wbs_item_id = 'wbs-item-009'
WHERE id = 'story-001-01';
```

두 가지 접근 가능:

**접근 A (권장)**: seed에서는 feature_id만 세팅하고, part_id는 마이그레이션이 파생

- 장점: "한 소스만 진실" 원칙 유지, 중복 소스 제거
- 이 경우 data.sql은 변경 불필요 (현재 상태가 맞음)
- 마이그레이션 스크립트가 feature.part_id에서 자동으로 채움

**접근 B (명시적)**: seed에서도 part_id를 명시하되, feature.part_id와 반드시 일치

```sql
-- feature.part_id와 일치하는 값만 명시 (참고용)
-- feat-001-01 → part-001-ai, feat-001-04 → part-001-ai
-- feat-001-06 → part-001-si, feat-002-01 → part-002-ux
UPDATE task.user_stories
SET feature_id = 'feat-001-01', wbs_item_id = 'wbs-item-009', part_id = 'part-001-ai'
WHERE id = 'story-001-01';

UPDATE task.user_stories
SET feature_id = 'feat-001-04', wbs_item_id = 'wbs-item-011', part_id = 'part-001-ai'
WHERE id = 'story-001-02';

UPDATE task.user_stories
SET feature_id = 'feat-001-06', wbs_item_id = 'wbs-item-012', part_id = 'part-001-si'
WHERE id = 'story-001-03';

UPDATE task.user_stories
SET feature_id = NULL, wbs_item_id = NULL, part_id = NULL
WHERE id = 'story-001-04';  -- 보안: feature 미배정 → part도 NULL

UPDATE task.user_stories
SET feature_id = 'feat-002-01', wbs_item_id = 'wbs-item-014', part_id = 'part-002-ux'
WHERE id = 'story-002-01';
```

> **결정**: 접근 A를 권장한다. seed에서 part_id를 명시하면 feature.part_id가 바뀔 때
> 두 곳을 수정해야 하고, 불일치 위험이 생긴다.
> 단, CI에서 마이그레이션 후 mismatch view가 0건인지 검증하면 어느 접근이든 안전하다.

### 예상 매핑 결과

| Story | Feature | Feature의 Part | → Story Part |
|---|---|---|---|
| story-001-01 | feat-001-01 | part-001-ai | part-001-ai |
| story-001-02 | feat-001-04 | part-001-ai | part-001-ai |
| story-001-03 | feat-001-06 | part-001-si | part-001-si |
| story-001-04 | NULL | - | NULL (미분류) |
| story-002-01 | feat-002-01 | part-002-ux | part-002-ux |

### 검증 쿼리

```sql
-- [V1] part_id 커버리지 (feature가 있는 스토리는 100%가 목표)
SELECT
    COUNT(*) AS total,
    COUNT(part_id) AS with_part,
    COUNT(*) - COUNT(part_id) AS without_part,
    COUNT(CASE WHEN feature_id IS NOT NULL AND part_id IS NULL THEN 1 END) AS feature_but_no_part
FROM task.user_stories;

-- [V2] Part별 스토리 집계 (0건 초과 확인)
SELECT p.name AS part_name, COUNT(us.id) AS story_count,
       SUM(us.story_points) AS total_sp
FROM task.user_stories us
JOIN project.parts p ON us.part_id = p.id
GROUP BY p.name;
```

### 완료 조건

- [ ] Feature가 있는 스토리의 part_id가 **모두 채워짐** (4건)
- [ ] Feature가 없는 스토리(story-001-04)는 **의도적 NULL**
- [ ] `feature_but_no_part` 검증 결과 **0건**
- [ ] Part별 스토리 집계 쿼리 정상 동작
- [ ] Flyway 마이그레이션 생성

---

## 1-3. 참조 무결성 검증 VIEW + 불일치(Mismatch) 감지 (CRITICAL 예방)

### 배경

Phase 0에서 응급 FK를 걸었지만, Phase 1에서 추가된 관계(epic_id, part_id 파생)는
아직 FK 없이 **검증 VIEW**로 감시하는 것이 안정적이다.

검증 VIEW의 역할:
1. **Orphan 감지**: 존재하지 않는 ID를 참조하는 레코드
2. **Mismatch 감지**: ID는 존재하지만 파생 규칙과 불일치하는 레코드

> **Phase 1의 본질적 리스크는 orphan만이 아니라 "불일치(mismatch)"도 크다.**
>
> 예시:
> - story.epic_id는 존재하지만 epic TEXT가 다른 값 → **표시 혼란**
> - story.part_id는 존재하지만 feature.part_id와 다름 → **집계 왜곡**
>
> 이 불일치가 "조용히 KPI가 틀어지는" 유형이고, FK로는 잡을 수 없다.

### Orphan 감지 VIEW (기존)

```sql
-- [VIEW 1] 잘못된 part 참조를 가진 레코드 (0건이어야 함)
CREATE OR REPLACE VIEW task.v_orphan_part_ref AS
SELECT t.id, t.title, t.part_id, 'task.tasks' AS source_table
FROM task.tasks t
WHERE t.part_id IS NOT NULL
  AND t.part_id NOT IN (SELECT id FROM project.parts)
UNION ALL
SELECT us.id, us.title, us.part_id, 'task.user_stories' AS source_table
FROM task.user_stories us
WHERE us.part_id IS NOT NULL
  AND us.part_id NOT IN (SELECT id FROM project.parts);

-- [VIEW 2] 잘못된 epic 참조를 가진 스토리 (0건이어야 함)
CREATE OR REPLACE VIEW task.v_orphan_epic_ref AS
SELECT us.id, us.title, us.epic_id, us.epic AS epic_text
FROM task.user_stories us
WHERE us.epic_id IS NOT NULL
  AND us.epic_id NOT IN (SELECT id FROM project.epics);

-- [VIEW 3] 잘못된 requirement 참조를 가진 백로그 아이템 (0건이어야 함)
CREATE OR REPLACE VIEW project.v_orphan_requirement_ref AS
SELECT bi.id, bi.requirement_id, bi.status
FROM project.backlog_items bi
WHERE bi.requirement_id IS NOT NULL
  AND bi.requirement_id NOT IN (SELECT id FROM project.requirements);
```

### Mismatch 감지 VIEW (신규 - 핵심 추가)

```sql
-- [VIEW 4] feature.part_id vs story.part_id 불일치 (0건이어야 함)
-- story.part_id는 feature.part_id에서 파생한 값이므로, 불일치 = 동기화 깨짐
CREATE OR REPLACE VIEW task.v_mismatch_story_feature_part AS
SELECT
    us.id AS story_id,
    us.title AS story_title,
    us.feature_id,
    us.part_id AS story_part,
    f.part_id AS feature_part
FROM task.user_stories us
JOIN project.features f ON us.feature_id = f.id
WHERE us.part_id IS DISTINCT FROM f.part_id;

-- [VIEW 5] epic_id는 있는데 epic TEXT가 다른 경우 (0건이어야 함)
-- epic TEXT는 표시용이지만, epic_id와 불일치하면 화면에서 혼란을 야기
CREATE OR REPLACE VIEW task.v_mismatch_story_epic_text AS
SELECT
    us.id AS story_id,
    us.title AS story_title,
    us.epic_id,
    us.epic AS epic_text,
    e.name AS epic_name
FROM task.user_stories us
JOIN project.epics e ON us.epic_id = e.id
WHERE us.epic IS DISTINCT FROM e.name;
```

### CI 검증 스크립트: `verify_phase1_all.sql`

```sql
-- CI에서 실행: 모든 VIEW가 0건이 아니면 빌드 실패
-- Orphan + Mismatch 모두 포함
DO $$
DECLARE
    orphan_parts     INTEGER;
    orphan_epics     INTEGER;
    orphan_reqs      INTEGER;
    mismatch_parts   INTEGER;
    mismatch_epics   INTEGER;
BEGIN
    -- Orphan 검사
    SELECT COUNT(*) INTO orphan_parts  FROM task.v_orphan_part_ref;
    SELECT COUNT(*) INTO orphan_epics  FROM task.v_orphan_epic_ref;
    SELECT COUNT(*) INTO orphan_reqs   FROM project.v_orphan_requirement_ref;

    -- Mismatch 검사
    SELECT COUNT(*) INTO mismatch_parts FROM task.v_mismatch_story_feature_part;
    SELECT COUNT(*) INTO mismatch_epics FROM task.v_mismatch_story_epic_text;

    -- Orphan: HARD FAIL
    IF orphan_parts > 0 OR orphan_epics > 0 OR orphan_reqs > 0 THEN
        RAISE EXCEPTION
            '[Phase1 CI] Orphan detected: parts=%, epics=%, reqs=%',
            orphan_parts, orphan_epics, orphan_reqs;
    END IF;

    -- Mismatch: HARD FAIL
    IF mismatch_parts > 0 OR mismatch_epics > 0 THEN
        RAISE EXCEPTION
            '[Phase1 CI] Mismatch detected: story-feature part=%, story-epic text=%',
            mismatch_parts, mismatch_epics;
    END IF;

    RAISE NOTICE '[Phase1 CI] All integrity checks passed.';
END $$;
```

### 완료 조건

- [ ] Orphan VIEW 3개 생성 (part, epic, requirement)
- [ ] Mismatch VIEW 2개 생성 (story-feature part, story-epic text)
- [ ] CI 검증 스크립트 작성 (`verify_phase1_all.sql`)
- [ ] 모든 VIEW 결과 **0건** 확인

---

## Flyway 산출물 구성

### 파일 분리 원칙

> **스키마 변경 / 데이터 마이그레이션 / 검증 VIEW를 분리한다.**
>
> 이유: 운영에서 "데이터만 다시 돌리고 싶다"거나 "스키마는 이미 반영됐는데
> 매핑만 재실행" 같은 상황이 자주 생기기 때문.
> 분리되어 있으면 재실행/롤백/핫픽스가 편해진다.

### 산출물

| # | 파일 | 책임 | 유형 |
|---|---|---|---|
| 1 | `V20260209_01__add_epic_id_column.sql` | epic_id 컬럼 추가 + 인덱스 + FK (NOT VALID) | 스키마 |
| 2 | `V20260209_02__map_epic_id_data.sql` | epic_id 데이터 매핑 (사전/사후 검증 포함) | 데이터 |
| 3 | `V20260209_03__populate_story_part_id.sql` | story.part_id를 feature에서 파생 (사전/사후 검증 포함) | 데이터 |
| 4 | `V20260209_04__create_integrity_views.sql` | Orphan VIEW 3개 + Mismatch VIEW 2개 | 검증 |
| 5 | `V20260209_05__validate_phase1_fk.sql` | FK VALIDATE (NOT VALID → VALID 전환) | 스키마 |
| 6 | `verify_phase1_all.sql` | CI 검증 DO 블록 (Flyway 외부) | CI |
| 7 | `data.sql` 수정 | epic_id 추가, epic TEXT 정확화 | seed |
| 8 | `schema.sql` 수정 | user_stories 테이블에 epic_id 컬럼 추가 | seed |

### 실행 순서

```
V20260209_01 (스키마: epic_id 컬럼 + FK NOT VALID)
    ↓
V20260209_02 (데이터: epic_id 매핑)
    ↓
V20260209_03 (데이터: part_id 파생)
    ↓
V20260209_04 (검증: Orphan + Mismatch VIEW 생성)
    ↓
V20260209_05 (스키마: FK VALIDATE)
    ↓
verify_phase1_all.sql (CI: 전체 정합성 검증)
```

---

## 롤백 계획

### epic_id 컬럼 롤백

```sql
-- 긴급 롤백: epic_id 컬럼 제거
ALTER TABLE task.user_stories DROP CONSTRAINT IF EXISTS fk_user_stories_epic_id;
ALTER TABLE task.user_stories DROP COLUMN IF EXISTS epic_id;

-- data.sql에서 epic_id 관련 변경 revert
-- epic TEXT 컬럼은 원래 값으로 복원 (git revert)
```

### part_id 롤백

```sql
-- part_id를 NULL로 복원 (마이그레이션 전 상태)
UPDATE task.user_stories SET part_id = NULL;
```

### VIEW 롤백

```sql
DROP VIEW IF EXISTS task.v_orphan_part_ref;
DROP VIEW IF EXISTS task.v_orphan_epic_ref;
DROP VIEW IF EXISTS project.v_orphan_requirement_ref;
DROP VIEW IF EXISTS task.v_mismatch_story_feature_part;
DROP VIEW IF EXISTS task.v_mismatch_story_epic_text;
```

---

## 다음 Phase 의존 관계

Phase 1 완료 후:

- **Phase 2**: backlog_items와 user_stories 역할 분담에서 epic_id를 기준으로 JOIN 가능
- **Phase 2**: 상태 체계 표준화 시 epic_id 기반 집계가 정확하게 동작
- **Phase 3**: 역할별 View API에서 Part/Epic 기반 집계가 신뢰 가능
- **Phase 4**: FK 제약조건 확장 (Phase 1에서 이미 epic_id FK를 걸었으므로, Phase 4에서는 추가 FK만)

### Phase 1 vs Phase 4 FK 책임 분담

| FK | Phase 1 | Phase 4 |
|---|---|---|
| `user_stories.epic_id → epics.id` | **여기서 추가** (ON DELETE RESTRICT) | VALIDATE 재확인 |
| `user_stories.feature_id → features.id` | - | Phase 4에서 추가 |
| `user_stories.part_id → parts.id` | mismatch VIEW로 감시 | Phase 4에서 FK 추가 |
| `features.part_id → parts.id` | - | Phase 4에서 추가 |
