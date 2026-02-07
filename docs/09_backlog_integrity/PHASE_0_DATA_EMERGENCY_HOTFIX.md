# Phase 0: 데이터 응급 처치 - "JOIN 0건" 제거

> **우선순위**: CRITICAL
> **소요 기간**: 0.5~1일
> **목표**: UI/집계에서 참조 오류로 0건이 되는 원인을 즉시 제거하고, FK로 재발을 구조적으로 차단
> **선행 조건**: 없음 (최우선 실행)
> **후속 의존**: Phase 1~4 전체가 이 Phase에 의존

---

## 0-1. task.tasks.part_id 잘못된 참조 수정 (CRITICAL)

### 현상

`task.tasks.part_id`가 `project.parts`에 **존재하지 않는 ID**를 참조.
FK 제약조건이 없어 DB 에러는 발생하지 않지만, Part 기반 JOIN이 **항상 0건**.

| 현재 값 (잘못됨) | 올바른 값 (project.parts 실제 ID) | 프로젝트 |
|---|---|---|
| `part-001-01` | `part-001-ai` (AI 개발 파트) | proj-001 |
| `part-001-02` | `part-001-si` (SI 개발 파트) | proj-001 |
| `part-001-03` | `part-001-common` (공통 파트) | proj-001 |
| `part-002-01` | `part-002-ux` (UX/UI 파트) | proj-002 |
| `part-002-03` | `part-002-mobile` (모바일 개발 파트) | proj-002 |

**위치**: `data.sql:1083-1087`

```sql
-- 현재 (깨진 상태): 존재하지 않는 ID 참조
UPDATE task.tasks SET part_id = 'part-001-01' WHERE id IN ('task-001-08', 'task-001-09', 'task-001-10');
UPDATE task.tasks SET part_id = 'part-001-02' WHERE id IN ('task-001-04', 'task-001-05', 'task-001-06', 'task-001-11', 'task-001-12');
UPDATE task.tasks SET part_id = 'part-001-03' WHERE id = 'task-001-07';
UPDATE task.tasks SET part_id = 'part-002-01' WHERE id IN ('task-002-06', 'task-002-07');
UPDATE task.tasks SET part_id = 'part-002-03' WHERE id = 'task-002-08';
```

### 영향 범위

- **PM 화면**: "파트별 태스크 목록"이 0건
- **PMO 화면**: "파트별 KPI 집계"가 빈 값
- **대시보드**: Part 기반 위젯 전체 작동 불가

### 프리체크: 영향 범위 사전 확인 (마이그레이션 실행 전 필수)

> 마이그레이션에서 제일 무서운 건 "0 rows updated"나 "예상보다 너무 많이 updated"이다.
> 실행 전에 아래 프리체크로 **예상 업데이트 수**를 먼저 확인한다.

```sql
-- 프리체크 1: 잘못된 part_id가 몇 건인지 프로젝트별 확인
SELECT part_id, project_id, COUNT(*) AS affected_rows
FROM task.tasks
WHERE part_id IN ('part-001-01', 'part-001-02', 'part-001-03', 'part-002-01', 'part-002-03')
GROUP BY part_id, project_id
ORDER BY project_id, part_id;

-- 기대 결과:
-- part-001-01 | proj-001 | 3  (task-001-08, 09, 10)
-- part-001-02 | proj-001 | 5  (task-001-04, 05, 06, 11, 12)
-- part-001-03 | proj-001 | 1  (task-001-07)
-- part-002-01 | proj-002 | 2  (task-002-06, 07)
-- part-002-03 | proj-002 | 1  (task-002-08)
-- 합계: 12건

-- 프리체크 2: 교정 대상 task ID 명시적 확인
SELECT id, project_id, part_id, title
FROM task.tasks
WHERE part_id IN ('part-001-01', 'part-001-02', 'part-001-03', 'part-002-01', 'part-002-03')
ORDER BY project_id, id;
```

### 수정 스크립트: `V20260208_01__fix_task_part_id_references.sql`

> **안전 원칙**: WHERE 조건에 **프로젝트 스코프** + **명시적 task ID**를 모두 사용한다.
> 값 기반(part_id)만으로 업데이트하면, 운영 데이터가 커졌을 때 동일 패턴의 다른 프로젝트/테넌트 데이터에 원치 않는 교정이 일어날 수 있다.

```sql
-- Phase 0-1: task.tasks.part_id 잘못된 참조를 실제 project.parts ID로 수정
-- 안전: 프로젝트 스코프 + 명시적 task ID로 범위 제한

BEGIN;

-- ── 영향 범위 로깅 ──
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM task.tasks
    WHERE part_id IN ('part-001-01','part-001-02','part-001-03','part-002-01','part-002-03');

    IF v_count = 0 THEN
        RAISE NOTICE 'Phase 0-1: 교정 대상 0건 — 이미 수정 완료되었거나 데이터가 없음';
    ELSIF v_count > 15 THEN
        RAISE EXCEPTION 'Phase 0-1: 예상 교정 대상 12건인데 %건 발견 — 수동 확인 필요', v_count;
    ELSE
        RAISE NOTICE 'Phase 0-1: %건 교정 시작', v_count;
    END IF;
END $$;

-- ── Project 1: AI 파트 ──
UPDATE task.tasks
SET part_id = 'part-001-ai', updated_at = NOW()
WHERE project_id = 'proj-001'
  AND part_id = 'part-001-01'
  AND id IN ('task-001-08', 'task-001-09', 'task-001-10');

-- ── Project 1: SI 파트 ──
UPDATE task.tasks
SET part_id = 'part-001-si', updated_at = NOW()
WHERE project_id = 'proj-001'
  AND part_id = 'part-001-02'
  AND id IN ('task-001-04', 'task-001-05', 'task-001-06', 'task-001-11', 'task-001-12');

-- ── Project 1: 공통 파트 ──
UPDATE task.tasks
SET part_id = 'part-001-common', updated_at = NOW()
WHERE project_id = 'proj-001'
  AND part_id = 'part-001-03'
  AND id = 'task-001-07';

-- ── Project 2: UX 파트 ──
UPDATE task.tasks
SET part_id = 'part-002-ux', updated_at = NOW()
WHERE project_id = 'proj-002'
  AND part_id = 'part-002-01'
  AND id IN ('task-002-06', 'task-002-07');

-- ── Project 2: 모바일 파트 ──
UPDATE task.tasks
SET part_id = 'part-002-mobile', updated_at = NOW()
WHERE project_id = 'proj-002'
  AND part_id = 'part-002-03'
  AND id = 'task-002-08';

-- ── 사후 검증: 고아 참조가 남아 있으면 롤백 ──
DO $$
DECLARE
    v_orphans INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_orphans
    FROM task.tasks t
    WHERE t.part_id IS NOT NULL
      AND t.part_id NOT IN (SELECT id FROM project.parts);

    IF v_orphans > 0 THEN
        RAISE EXCEPTION 'Phase 0-1 사후검증 실패: 고아 part_id %건 잔존 — ROLLBACK', v_orphans;
    END IF;

    RAISE NOTICE 'Phase 0-1 완료: 고아 참조 0건 확인';
END $$;

COMMIT;
```

### data.sql 시드 파일도 동시 수정

1083~1087 라인을 아래로 교체:

```sql
-- 32. UPDATE TASKS with Part Links (올바른 ID 사용)
UPDATE task.tasks SET part_id = 'part-001-ai'
WHERE id IN ('task-001-08', 'task-001-09', 'task-001-10');

UPDATE task.tasks SET part_id = 'part-001-si'
WHERE id IN ('task-001-04', 'task-001-05', 'task-001-06', 'task-001-11', 'task-001-12');

UPDATE task.tasks SET part_id = 'part-001-common'
WHERE id = 'task-001-07';

UPDATE task.tasks SET part_id = 'part-002-ux'
WHERE id IN ('task-002-06', 'task-002-07');

UPDATE task.tasks SET part_id = 'part-002-mobile'
WHERE id = 'task-002-08';
```

### 검증 쿼리: `verify_part_join.sql`

```sql
-- ① 고아 참조 0건 확인 (HARD FAIL)
SELECT t.id, t.title, t.part_id, t.project_id
FROM task.tasks t
WHERE t.part_id IS NOT NULL
  AND t.part_id NOT IN (SELECT id FROM project.parts);
-- 기대: 0건

-- ② Part JOIN이 프로젝트별로 기대 범위를 만족하는지 (분포 확인)
SELECT p.project_id, p.name AS part_name, COUNT(t.id) AS task_count
FROM project.parts p
LEFT JOIN task.tasks t ON t.part_id = p.id
GROUP BY p.project_id, p.name
ORDER BY p.project_id, task_count DESC;
-- 기대: proj-001 파트 3개에 각각 1건 이상, proj-002 파트 2개에 각각 1건 이상
-- "특정 프로젝트만 여전히 0건"을 바로 잡아냄

-- ③ 전체 JOIN 성공 건수 (0건 초과 필수)
SELECT COUNT(*) AS total_joined_tasks
FROM task.tasks t
JOIN project.parts p ON t.part_id = p.id;
-- 기대: 12건
```

### 완료 조건

- [ ] 프리체크로 교정 대상 **12건** 확인
- [ ] 고아 참조 쿼리 결과 **0건**
- [ ] Part JOIN이 **프로젝트별로** 1건 이상 반환
- [ ] `data.sql` 시드 파일 수정 완료
- [ ] Flyway 마이그레이션 파일 생성

---

## 0-2. project.requirements 테이블 공백 문제 복구 (CRITICAL)

### 현상

`project.backlog_items.requirement_id`가 `req-001-01` ~ `req-001-05` 등을 참조.
해당 ID들은 **`rfp.requirements`에만 존재**하고, `project.requirements`는 **INSERT 자체가 없어 빈 테이블**.
결과: 백로그 아이템 <-> 요구사항 JOIN이 불가.

### 설계 결정

| 옵션 | 접근 방식 | 장점 | 단점 |
|---|---|---|---|
| **A (권장)** | `rfp.requirements`에서 `project.requirements`로 복사 | 프로젝트별 버전/승인 관리 가능; PMO 추적성 확보 | 동기화 전략 필요 |
| B | `backlog_items` FK를 `rfp.requirements` 직접 참조로 변경 | 빠른 수정 | 프로젝트별 요구사항 커스터마이징/승인 흐름 차단 |

**결정: 옵션 A** - `project.requirements`는 "프로젝트 범위 요구사항 스냅샷"으로 운영.
- PO: RFP 대비 스코프 추적
- PMO: 요구사항 변경 이력 / 승인 감사
- PM: 스토리 -> 요구사항 추적성

### ID 전략: 별도 PK + source_requirement_id (핵심 설계)

> **`rfp.requirements.id`를 그대로 `project.requirements.id`로 복사하는 것은 위험하다.**

같은 PK를 공유하면 아래 조건이 **하나라도 흔들릴 때** 확장성이 깨진다:
1. 동일 requirement가 **여러 프로젝트에 재사용**될 때 (RFP 템플릿 재사용)
2. 프로젝트별로 요구사항을 **커스터마이징/버전 관리**할 때
3. `project.requirements`를 **"분기 가능한 사본"**으로 운영할 때

**따라서 별도 PK(`preq-` prefix)를 사용하고, 원본을 `source_requirement_id`로 추적한다.**

```
rfp.requirements (원본)        project.requirements (프로젝트 스냅샷)
┌──────────────────┐          ┌──────────────────────────────────┐
│ id: req-001-01   │ ◄─────── │ id: preq-001-01                  │
│ title: 문서 OCR  │          │ source_requirement_id: req-001-01 │
│ project_id: ...  │          │ title: 문서 OCR (수정 가능)        │
└──────────────────┘          │ project_id: proj-001              │
                              └──────────────────────────────────┘
```

**장점**:
- 프로젝트별로 같은 원본 요구사항을 가져와도 PK 충돌 없음
- 스냅샷/버전 관리 용이 (원본과 독립적으로 변경 가능)
- PMO 감사: "이 프로젝트 요구사항이 원본 RFP에서 어떻게 변경되었는지" 추적 가능

**유니크 제약**: `(project_id, source_requirement_id)` — 한 프로젝트 내에서 같은 원본을 중복 복사 방지

### 스냅샷 철학 결정

> `project.requirements`를 **"동기화 테이블"**로 볼지 **"분기 가능한 사본"**으로 볼지를
> Phase 0에서 명확히 고정해야 한다.

| 철학 | ON CONFLICT 전략 | seed 재실행 시 동작 | 적합한 경우 |
|---|---|---|---|
| **동기화** | `DO UPDATE SET title, description, ...` | 원본과 항상 일치 | 요구사항이 RFP에서만 변경 |
| **분기 가능한 사본** (권장) | `DO NOTHING` | 한번 복사 후 독립 운영 | 프로젝트별 커스터마이징 필요 |

**결정: "분기 가능한 사본"** - 최초 복사 후 프로젝트 레벨에서 독립 편집 가능.
- `ON CONFLICT (id) DO NOTHING` 사용 (이미 존재하면 덮어쓰지 않음)
- PO/PMO가 프로젝트 수준에서 요구사항을 수정/승인할 수 있는 기반

### 스키마 변경: `source_requirement_id` 추가

```sql
-- project.requirements에 원본 추적 컬럼 추가
ALTER TABLE project.requirements
ADD COLUMN IF NOT EXISTS source_requirement_id VARCHAR(36);

-- 유니크 제약: 한 프로젝트 내 같은 원본 중복 방지
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_req_source_unique
    ON project.requirements(project_id, source_requirement_id)
    WHERE source_requirement_id IS NOT NULL;

-- 인덱스: source_requirement_id로 역추적
CREATE INDEX IF NOT EXISTS idx_project_req_source_id
    ON project.requirements(source_requirement_id);
```

### 수정 스크립트: `V20260208_02__seed_project_requirements.sql`

```sql
-- Phase 0-2: rfp.requirements에서 project.requirements로 프로젝트 범위 요구사항 복사
-- 별도 PK(preq-) + source_requirement_id로 원본 추적

BEGIN;

-- ── 스키마 변경: source_requirement_id 추가 ──
ALTER TABLE project.requirements
ADD COLUMN IF NOT EXISTS source_requirement_id VARCHAR(36);

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_req_source_unique
    ON project.requirements(project_id, source_requirement_id)
    WHERE source_requirement_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_project_req_source_id
    ON project.requirements(source_requirement_id);

-- ── 프리체크: rfp.requirements에서 복사 대상 카운트 ──
DO $$
DECLARE
    v_rfp_count INTEGER;
    v_existing_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_rfp_count
    FROM rfp.requirements r
    WHERE r.project_id IS NOT NULL;

    SELECT COUNT(*) INTO v_existing_count
    FROM project.requirements;

    RAISE NOTICE 'Phase 0-2: rfp.requirements 복사 대상 %건, project.requirements 기존 %건',
        v_rfp_count, v_existing_count;
END $$;

-- ── 데이터 복사: 별도 PK + source 추적 ──
INSERT INTO project.requirements (
    id, rfp_id, project_id, source_requirement_id,
    requirement_code, title, description,
    category, priority, status, progress_percentage,
    tenant_id, created_by, created_at, updated_at
)
SELECT
    'preq-' || SUBSTRING(r.id FROM 5),  -- req-001-01 → preq-001-01
    r.rfp_id,
    r.project_id,
    r.id,  -- source_requirement_id = 원본 rfp.requirements.id
    COALESCE(r.requirement_code, r.code),
    r.title,
    r.description,
    r.category,
    r.priority,
    CASE
        WHEN r.status = 'APPROVED' THEN 'APPROVED'
        WHEN r.status = 'ANALYZED' THEN 'ANALYZED'
        ELSE 'IDENTIFIED'
    END,
    COALESCE(r.progress, 0),
    rfps.tenant_id,
    r.created_by,
    r.created_at,
    r.updated_at
FROM rfp.requirements r
JOIN rfp.rfps rfps ON r.rfp_id = rfps.id
WHERE r.project_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;  -- 분기 가능한 사본: 이미 존재하면 덮어쓰지 않음

-- ── backlog_items.requirement_id 업데이트: rfp ID → project 스냅샷 ID ──
UPDATE project.backlog_items bi
SET requirement_id = pr.id,
    updated_at = NOW()
FROM project.requirements pr
WHERE pr.source_requirement_id = bi.requirement_id
  AND bi.requirement_id NOT LIKE 'preq-%';  -- 이미 변환된 건 제외

-- ── 사후 검증 ──
DO $$
DECLARE
    v_total_bi INTEGER;
    v_linked_bi INTEGER;
    v_orphans INTEGER;
BEGIN
    -- backlog_items 연결 확인
    SELECT COUNT(*) INTO v_total_bi FROM project.backlog_items;
    SELECT COUNT(*) INTO v_linked_bi
    FROM project.backlog_items bi
    JOIN project.requirements r ON bi.requirement_id = r.id;

    -- 고아 참조 확인
    SELECT COUNT(*) INTO v_orphans
    FROM project.backlog_items bi
    WHERE bi.requirement_id IS NOT NULL
      AND bi.requirement_id NOT IN (SELECT id FROM project.requirements);

    IF v_orphans > 0 THEN
        RAISE EXCEPTION 'Phase 0-2 사후검증 실패: 고아 requirement_id %건 잔존 — ROLLBACK', v_orphans;
    END IF;

    RAISE NOTICE 'Phase 0-2 완료: backlog_items %건 중 %건 연결, 고아 0건',
        v_total_bi, v_linked_bi;
END $$;

COMMIT;
```

### data.sql에도 `project.requirements` 섹션 추가

> **seed는 고정 timestamp 사용** — NOW()를 쓰면 매번 시드 시간이 달라져
> 테스트 스냅샷 비교가 어려워진다. seed는 고정값, migration은 NOW()가 원칙.

```sql
-- 프로젝트 범위 요구사항 (rfp.requirements에서 스냅샷 복사)
-- ID: preq- prefix, source_requirement_id로 원본 추적
INSERT INTO project.requirements (
    id, rfp_id, project_id, source_requirement_id,
    requirement_code, title, description,
    category, priority, status, progress_percentage,
    tenant_id, created_by, created_at, updated_at
)
VALUES
    ('preq-001-01', 'rfp-001', 'proj-001', 'req-001-01', 'REQ-AI-001',
     '문서 OCR 처리', '스캔된 보험 문서에서 99% 정확도로 텍스트 추출',
     'AI', 'CRITICAL', 'APPROVED', 60,
     'tenant-001', 'system', '2026-02-01 00:00:00+09', '2026-02-01 00:00:00+09'),

    ('preq-001-02', 'rfp-001', 'proj-001', 'req-001-02', 'REQ-AI-002',
     '사기 탐지 알고리즘', '설정 가능한 민감도 임계값의 ML 기반 사기 탐지',
     'AI', 'CRITICAL', 'ANALYZED', 30,
     'tenant-001', 'system', '2026-02-01 00:00:00+09', '2026-02-01 00:00:00+09'),

    ('preq-001-03', 'rfp-001', 'proj-001', 'req-001-03', 'REQ-SI-001',
     '보험청구 관리 API', '보험청구 전체 생명주기 관리를 위한 RESTful API',
     'FUNCTIONAL', 'HIGH', 'IDENTIFIED', 0,
     'tenant-001', 'system', '2026-02-01 00:00:00+09', '2026-02-01 00:00:00+09'),

    ('preq-001-04', 'rfp-001', 'proj-001', 'req-001-04', 'REQ-SI-002',
     '레거시 시스템 연동', 'ESB를 통한 기존 보험증권 관리 시스템과의 연동',
     'INTEGRATION', 'HIGH', 'IDENTIFIED', 0,
     'tenant-001', 'system', '2026-02-01 00:00:00+09', '2026-02-01 00:00:00+09'),

    ('preq-001-05', 'rfp-001', 'proj-001', 'req-001-05', 'REQ-SEC-001',
     '데이터 암호화', '모든 개인정보 AES-256 암호화 (저장/전송)',
     'SECURITY', 'CRITICAL', 'APPROVED', 0,
     'tenant-001', 'system', '2026-02-01 00:00:00+09', '2026-02-01 00:00:00+09'),

    ('preq-001-06', 'rfp-001', 'proj-001', 'req-001-06', 'REQ-NF-001',
     '성능 요구사항', '1000명 동시 사용자, 2초 미만 응답 시간',
     'NON_FUNCTIONAL', 'HIGH', 'ANALYZED', 0,
     'tenant-001', 'system', '2026-02-01 00:00:00+09', '2026-02-01 00:00:00+09'),

    ('preq-002-01', 'rfp-002', 'proj-002', 'req-002-01', 'REQ-MOB-001',
     '사용자 인증', '모바일 앱 생체인식 및 비밀번호 기반 인증',
     'SECURITY', 'CRITICAL', 'IDENTIFIED', 0,
     'tenant-001', 'system', '2026-02-01 00:00:00+09', '2026-02-01 00:00:00+09'),

    ('preq-002-02', 'rfp-002', 'proj-002', 'req-002-02', 'REQ-MOB-002',
     '보험증권 대시보드', '모든 사용자 보험증권과 주요 정보 표시',
     'FUNCTIONAL', 'HIGH', 'IDENTIFIED', 0,
     'tenant-001', 'system', '2026-02-01 00:00:00+09', '2026-02-01 00:00:00+09'),

    ('preq-002-03', 'rfp-002', 'proj-002', 'req-002-03', 'REQ-MOB-003',
     '청구 제출', '모바일에서 사진 업로드와 함께 청구 제출',
     'FUNCTIONAL', 'CRITICAL', 'IDENTIFIED', 0,
     'tenant-001', 'system', '2026-02-01 00:00:00+09', '2026-02-01 00:00:00+09'),

    ('preq-002-04', 'rfp-002', 'proj-002', 'req-002-04', 'REQ-MOB-004',
     '푸시 알림', '청구 상태 업데이트 실시간 알림',
     'FUNCTIONAL', 'MEDIUM', 'IDENTIFIED', 0,
     'tenant-001', 'system', '2026-02-01 00:00:00+09', '2026-02-01 00:00:00+09'),

    ('preq-002-05', 'rfp-002', 'proj-002', 'req-002-05', 'REQ-MOB-005',
     '오프라인 모드', '오프라인 작동 및 연결 시 데이터 동기화',
     'NON_FUNCTIONAL', 'MEDIUM', 'IDENTIFIED', 0,
     'tenant-001', 'system', '2026-02-01 00:00:00+09', '2026-02-01 00:00:00+09')
ON CONFLICT (id) DO NOTHING;  -- 분기 가능한 사본: 덮어쓰지 않음

-- backlog_items도 preq- ID를 참조하도록 수정
UPDATE project.backlog_items SET requirement_id = 'preq-001-01' WHERE id = 'bl-item-001';
UPDATE project.backlog_items SET requirement_id = 'preq-001-02' WHERE id = 'bl-item-002';
UPDATE project.backlog_items SET requirement_id = 'preq-001-03' WHERE id = 'bl-item-003';
UPDATE project.backlog_items SET requirement_id = 'preq-001-05' WHERE id = 'bl-item-004';
UPDATE project.backlog_items SET requirement_id = 'preq-002-01' WHERE id = 'bl-item-005';
UPDATE project.backlog_items SET requirement_id = 'preq-002-02' WHERE id = 'bl-item-006';
UPDATE project.backlog_items SET requirement_id = 'preq-002-03' WHERE id = 'bl-item-007';
```

### 검증 쿼리: `verify_backlog_requirement_join.sql`

```sql
-- ① 고아 참조 0건 확인 (HARD FAIL)
SELECT bi.id, bi.requirement_id
FROM project.backlog_items bi
WHERE bi.requirement_id IS NOT NULL
  AND bi.requirement_id NOT IN (SELECT id FROM project.requirements);
-- 기대: 0건

-- ② JOIN 성공 확인 (상세)
SELECT bi.id, bi.status AS backlog_status,
       r.title AS requirement_title, r.priority, r.status AS req_status,
       r.source_requirement_id AS rfp_origin
FROM project.backlog_items bi
JOIN project.requirements r ON bi.requirement_id = r.id;
-- 기대: 7건 (backlog_items 수)

-- ③ 연결률 + NULL 비율 확인
SELECT
    COUNT(*) AS total_backlog_items,
    COUNT(*) FILTER (WHERE requirement_id IS NOT NULL) AS has_req_id,
    COUNT(*) FILTER (WHERE requirement_id IS NULL) AS null_req_id,
    ROUND(100.0 * COUNT(*) FILTER (WHERE requirement_id IS NULL)
          / NULLIF(COUNT(*), 0), 1) AS null_pct
FROM project.backlog_items;
-- 기대: null_req_id = 0, null_pct = 0.0

-- ④ 프로젝트별 JOIN 분포 확인 ("특정 프로젝트만 0건" 감지)
SELECT r.project_id, COUNT(bi.id) AS linked_items
FROM project.requirements r
LEFT JOIN project.backlog_items bi ON bi.requirement_id = r.id
GROUP BY r.project_id
ORDER BY r.project_id;
-- 기대: proj-001에 4건, proj-002에 3건

-- ⑤ source 추적: 원본 rfp.requirements와의 매핑 확인
SELECT
    pr.id AS project_req_id,
    pr.source_requirement_id AS rfp_req_id,
    pr.title AS project_title,
    rr.title AS rfp_title,
    CASE WHEN pr.title = rr.title THEN 'SYNCED' ELSE 'DIVERGED' END AS sync_status
FROM project.requirements pr
LEFT JOIN rfp.requirements rr ON pr.source_requirement_id = rr.id;
-- 기대: 최초 복사 후에는 전부 SYNCED
```

### 완료 조건

- [ ] `project.requirements`에 `source_requirement_id` 컬럼 추가
- [ ] `project.requirements`에 **11건** 존재 (proj-001: 6건, proj-002: 5건)
- [ ] `backlog_items.requirement_id`가 `preq-` prefix ID를 참조
- [ ] 고아 참조 쿼리 결과 **0건**
- [ ] 백로그-요구사항 JOIN이 **7건** 반환
- [ ] 프로젝트별 JOIN 분포가 기대값 일치
- [ ] `data.sql`에 `project.requirements` INSERT + `backlog_items` UPDATE 반영
- [ ] Flyway 마이그레이션 파일 생성

---

## 0-3. Phase 0 종료 시점 FK 제약조건 추가 (재발 방지)

### 왜 Phase 0 끝에서 FK를 추가하는가

> 지금 장애가 생긴 이유가 **"FK가 없어서"**인데,
> 데이터만 고치고 끝내면 언젠가 **또 들어온다.**
>
> Phase 4에서 전체 FK를 정리하더라도,
> **Phase 0에서 이미 정리된 2개 참조**에 대해서는 즉시 FK를 걸어야
> "수정 → 다시 깨짐" 사이클을 구조적으로 차단할 수 있다.

### 적용 순서: 정정 → 검증 → FK (이 순서가 안정적)

```
V20260208_01__fix_task_part_id_references.sql     ← 데이터 정정
V20260208_02__seed_project_requirements.sql        ← 데이터 시딩
V20260208_03__add_phase0_fk_constraints.sql        ← FK 추가 (이 파일)
```

### 수정 스크립트: `V20260208_03__add_phase0_fk_constraints.sql`

```sql
-- Phase 0-3: 정정된 참조에 FK 제약조건 추가
-- 순서: NOT VALID로 먼저 추가 (기존 데이터 스캔 없이 빠르게) → VALIDATE로 검증

BEGIN;

-- ── 사전 확인: 고아가 남아 있으면 FK 추가 불가 ──
DO $$
DECLARE
    v_orphan_parts INTEGER;
    v_orphan_reqs INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_orphan_parts
    FROM task.tasks t
    WHERE t.part_id IS NOT NULL
      AND t.part_id NOT IN (SELECT id FROM project.parts);

    SELECT COUNT(*) INTO v_orphan_reqs
    FROM project.backlog_items bi
    WHERE bi.requirement_id IS NOT NULL
      AND bi.requirement_id NOT IN (SELECT id FROM project.requirements);

    IF v_orphan_parts > 0 THEN
        RAISE EXCEPTION 'FK 추가 불가: task.tasks에 고아 part_id %건 잔존', v_orphan_parts;
    END IF;

    IF v_orphan_reqs > 0 THEN
        RAISE EXCEPTION 'FK 추가 불가: backlog_items에 고아 requirement_id %건 잔존', v_orphan_reqs;
    END IF;

    RAISE NOTICE 'Phase 0-3: 고아 참조 0건 확인, FK 추가 진행';
END $$;

-- ── FK 1: task.tasks.part_id → project.parts.id ──
-- nullable 허용 (part 미배정 태스크 존재), 삭제 시 SET NULL
ALTER TABLE task.tasks
ADD CONSTRAINT fk_tasks_part_id
    FOREIGN KEY (part_id) REFERENCES project.parts(id)
    ON DELETE SET NULL
    NOT VALID;

-- ── FK 2: backlog_items.requirement_id → project.requirements.id ──
-- nullable 허용, 삭제 시 SET NULL
ALTER TABLE project.backlog_items
ADD CONSTRAINT fk_backlog_items_requirement_id
    FOREIGN KEY (requirement_id) REFERENCES project.requirements(id)
    ON DELETE SET NULL
    NOT VALID;

COMMIT;

-- ── VALIDATE: 기존 데이터도 검증 (별도 트랜잭션) ──
ALTER TABLE task.tasks VALIDATE CONSTRAINT fk_tasks_part_id;
ALTER TABLE project.backlog_items VALIDATE CONSTRAINT fk_backlog_items_requirement_id;
```

### ON DELETE 정책

| FK | ON DELETE | 이유 |
|---|---|---|
| `tasks.part_id` | `SET NULL` | 파트 삭제 시 태스크는 "미배정"으로 (데이터 손실 방지) |
| `backlog_items.requirement_id` | `SET NULL` | 요구사항 삭제 시 아이템은 "미연결"로 |

### 검증

```sql
-- FK가 동작하는지 확인: 존재하지 않는 part_id 입력 시 에러
-- 아래 쿼리는 실패해야 정상
INSERT INTO task.tasks (id, project_id, title, part_id)
VALUES ('test-fk', 'proj-001', 'FK 테스트', 'nonexistent-part-id');
-- 기대: ERROR: insert or update on table "tasks" violates foreign key constraint

-- 정상 입력은 통과
INSERT INTO task.tasks (id, project_id, title, part_id)
VALUES ('test-fk', 'proj-001', 'FK 테스트', 'part-001-ai');
-- 기대: 성공
DELETE FROM task.tasks WHERE id = 'test-fk';  -- 테스트 데이터 정리
```

### 완료 조건

- [ ] `fk_tasks_part_id` 제약조건 추가 및 VALIDATE 성공
- [ ] `fk_backlog_items_requirement_id` 제약조건 추가 및 VALIDATE 성공
- [ ] 잘못된 part_id INSERT 시 즉시 에러 발생 확인
- [ ] 잘못된 requirement_id INSERT 시 즉시 에러 발생 확인
- [ ] seed(data.sql) 로딩 시 FK 위반 없음 확인

---

## 마이그레이션 통합 검증: CI 게이트 (선택, 강력 권장)

> Phase 0는 **"조용히 실패하면 안 되는 단계"**이다.
> PL/pgSQL DO 블록으로 고아가 있으면 EXCEPTION을 던져 배포 파이프라인을 멈추게 할 수 있다.

### `verify_phase0_all.sql` (CI에서 실행)

```sql
-- Phase 0 통합 검증: 하나라도 실패하면 배포 중단
DO $$
DECLARE
    v_orphan_parts INTEGER;
    v_orphan_reqs INTEGER;
    v_part_join_count INTEGER;
    v_req_join_count INTEGER;
    v_project_req_count INTEGER;
BEGIN
    -- 1. task.tasks 고아 part_id
    SELECT COUNT(*) INTO v_orphan_parts
    FROM task.tasks t
    WHERE t.part_id IS NOT NULL
      AND t.part_id NOT IN (SELECT id FROM project.parts);

    -- 2. backlog_items 고아 requirement_id
    SELECT COUNT(*) INTO v_orphan_reqs
    FROM project.backlog_items bi
    WHERE bi.requirement_id IS NOT NULL
      AND bi.requirement_id NOT IN (SELECT id FROM project.requirements);

    -- 3. Part JOIN이 실제로 동작하는지
    SELECT COUNT(*) INTO v_part_join_count
    FROM task.tasks t
    JOIN project.parts p ON t.part_id = p.id;

    -- 4. Requirement JOIN이 실제로 동작하는지
    SELECT COUNT(*) INTO v_req_join_count
    FROM project.backlog_items bi
    JOIN project.requirements r ON bi.requirement_id = r.id;

    -- 5. project.requirements 데이터 존재 확인
    SELECT COUNT(*) INTO v_project_req_count
    FROM project.requirements;

    -- ── HARD FAIL 조건 ──
    IF v_orphan_parts > 0 THEN
        RAISE EXCEPTION 'PHASE 0 GATE FAILED: 고아 part_id %건', v_orphan_parts;
    END IF;

    IF v_orphan_reqs > 0 THEN
        RAISE EXCEPTION 'PHASE 0 GATE FAILED: 고아 requirement_id %건', v_orphan_reqs;
    END IF;

    IF v_part_join_count = 0 THEN
        RAISE EXCEPTION 'PHASE 0 GATE FAILED: Part JOIN 결과 0건';
    END IF;

    IF v_req_join_count = 0 THEN
        RAISE EXCEPTION 'PHASE 0 GATE FAILED: Requirement JOIN 결과 0건';
    END IF;

    IF v_project_req_count = 0 THEN
        RAISE EXCEPTION 'PHASE 0 GATE FAILED: project.requirements 빈 테이블';
    END IF;

    RAISE NOTICE 'PHASE 0 GATE PASSED: orphan_parts=%, orphan_reqs=%, part_joins=%, req_joins=%, project_reqs=%',
        v_orphan_parts, v_orphan_reqs, v_part_join_count, v_req_join_count, v_project_req_count;
END $$;
```

---

## 산출물 체크리스트

| # | 파일 | 용도 | 실행 순서 |
|---|---|---|---|
| 1 | `V20260208_01__fix_task_part_id_references.sql` | Flyway: task part_id 수정 (프리체크 + 사후검증 포함) | 1st |
| 2 | `V20260208_02__seed_project_requirements.sql` | Flyway: 스키마 변경 + project.requirements 데이터 채우기 + backlog_items 참조 갱신 | 2nd |
| 3 | `V20260208_03__add_phase0_fk_constraints.sql` | Flyway: FK 제약조건 추가 (재발 방지) | 3rd |
| 4 | `data.sql` 수정 | part_id 매핑 수정 + project.requirements 섹션 추가 + backlog_items 참조 갱신 | - |
| 5 | `verify_part_join.sql` | 검증: part 고아 참조 0건 + 프로젝트별 분포 | - |
| 6 | `verify_backlog_requirement_join.sql` | 검증: requirement 고아 참조 0건 + 연결률 + source 추적 | - |
| 7 | `verify_phase0_all.sql` | CI 통합 검증: 실패 시 배포 중단 | CI |

## 롤백 계획

```sql
-- 0-1 롤백: 불필요 (잘못된 데이터를 올바른 데이터로 교체한 것)
-- 단, FK를 롤백해야 할 경우:
ALTER TABLE task.tasks DROP CONSTRAINT IF EXISTS fk_tasks_part_id;

-- 0-2 롤백: project.requirements 데이터 + backlog_items 참조 원복
ALTER TABLE project.backlog_items DROP CONSTRAINT IF EXISTS fk_backlog_items_requirement_id;
-- backlog_items.requirement_id를 원본 rfp ID로 되돌림
UPDATE project.backlog_items bi
SET requirement_id = pr.source_requirement_id
FROM project.requirements pr
WHERE bi.requirement_id = pr.id
  AND pr.source_requirement_id IS NOT NULL;
-- project.requirements 데이터 삭제
DELETE FROM project.requirements WHERE id LIKE 'preq-%';
-- source_requirement_id 컬럼 제거
ALTER TABLE project.requirements DROP COLUMN IF EXISTS source_requirement_id;
```

## 다음 Phase 의존 관계

Phase 0 완료는 아래의 **필수 선행 조건**:

- **Phase 1**: 텍스트->ID 마이그레이션이 JOIN 가능한 데이터에 의존
- **Phase 2**: 백로그 모델 결정이 요구사항 연결 동작을 전제. `backlog_items.requirement_id`가 `preq-` prefix를 사용하므로, Phase 2의 `backlog_item_id → story` 연결도 이 체계를 따름
- **Phase 3**: 역할별 View가 Part/요구사항 JOIN으로 집계
- **Phase 4**: FK 추가 기반이 Phase 0에서 이미 2개 완료. 나머지 FK (epic_id, user_stories.part_id 등)만 Phase 4에서 추가

### Phase 0에서 추가한 FK vs Phase 4에서 추가할 FK

| FK | Phase 0 (이 문서) | Phase 4 |
|---|---|---|
| `task.tasks.part_id` → `project.parts.id` | **완료** | - |
| `backlog_items.requirement_id` → `project.requirements.id` | **완료** | - |
| `user_stories.epic_id` → `project.epics.id` | - | 추가 예정 |
| `user_stories.part_id` → `project.parts.id` | - | 추가 예정 |
| `user_stories.backlog_item_id` → `project.backlog_items.id` | - | 추가 예정 |
