# P6: WBS 엔티티 진행률 조회 구현 계획

> **상태**: 설계 완료 (3차 리뷰 반영), 구현 대기
> **작성일**: 2026-02-06 | **2차 리뷰 반영**: 2026-02-07 | **3차 리뷰 반영**: 2026-02-07
> **선행 작업**: P0~P5 완료 (인텐트 라우팅, 데이터 조회, 품질 개선, 칸반 분류 등)
> **핵심 문제**: "OCR 성능 평가 진행율은" → 프로젝트 전체 KPI 반환 (WBS 데이터 미연결)

---

## 목차

1. [문제 진단](#1-문제-진단)
2. [설계 원칙](#2-설계-원칙)
3. [Phase 1: WBS 검색 쿼리 + 핸들러/렌더러](#3-phase-1-wbs-검색-쿼리--핸들러렌더러)
4. [Phase 2: 엔티티 진행률 인텐트 + 라우팅](#4-phase-2-엔티티-진행률-인텐트--라우팅)
5. [Phase 3: PMS_SCHEMA에 WBS 추가 (동적 확장)](#5-phase-3-pms_schema에-wbs-추가-동적-확장)
6. [데이터 계약 (Data Contract)](#6-데이터-계약-data-contract)
7. [엔티티 리졸버 (Entity Resolver)](#7-엔티티-리졸버-entity-resolver)
8. [회귀 테스트](#8-회귀-테스트)
9. [수정 대상 파일](#9-수정-대상-파일)
10. [WBS 스키마 레퍼런스](#10-wbs-스키마-레퍼런스)
11. [리뷰 반영 사항 요약](#11-리뷰-반영-사항-요약)

---

## 1. 문제 진단

### 1.1 현상

```
사용자: "ocr 성능 평가 진행율은"
AI 응답: 프로젝트 전체 현황 (32% 진행률, 스토리 0/8 완료)
기대 응답: WBS 항목 "OCR 성능 평가"의 개별 진행률
```

### 1.2 근본 원인 (2가지)

| 구분 | 문제 | 영향 |
| --- | --- | --- |
| **분류 오류** | "진행율" → `STATUS_METRIC` (프로젝트 전체 KPI) 로 분류 | 특정 엔티티 질의가 프로젝트 수준으로 격상 |
| **데이터 미연결** | llm-service에 WBS 쿼리가 전혀 없음 | DB에 데이터가 있어도 AI가 접근 불가 |

### 1.3 현재 STATUS_METRIC이 조회하는 테이블

```
task.user_stories  → story_counts_by_status, completion_rate
task.sprints       → active_sprint
project.projects   → project_summary
project.issues     → risk_summary, issue_summary
```

**WBS 테이블 (`project.wbs_groups`, `project.wbs_items`, `project.wbs_tasks`)은 미포함.**

---

## 2. 설계 원칙

### 2.1 STATUS_METRIC vs entity_progress 분리

현재 `STATUS_METRIC`은 "프로젝트 전체 KPI"에 해당하며, "특정 대상의 진행률"은 성격이 완전히 다르다.

| 인텐트 | 성격 | 예시 |
| --- | --- | --- |
| `status_metric` | 포트폴리오/프로젝트 전반 KPI | "프로젝트 진행율은", "완료율 보여줘" |
| `entity_progress` (신규) | 특정 엔티티의 진행률 | "OCR 성능 평가 진행율은", "요구사항 분석 몇 퍼센트야" |

분리 이유:
- 라우팅이 깔끔해진다 (전체 KPI vs 개별 항목 조회)
- 렌더링/메시지 계약이 명확해진다
- 오답이 줄고 설명 책임(provenance)이 투명해진다

### 2.2 정적 경로 우선, 동적 확장은 후순위

```
구현 순서:
Phase 1: 정적 SQL 템플릿 + 핸들러/렌더러 (즉시 체감)
Phase 2: entity_progress 인텐트 + 엔티티 리졸버 (라우팅 안정화)
Phase 3: PMS_SCHEMA에 WBS 추가 (동적 쿼리 확장)
```

### 2.3 progress 값의 신뢰도 투명화

WBS의 `progress` 컬럼 특성:
- **그룹 progress**: 하위 아이템의 가중 평균 집계값
- **아이템 progress**: 수동 입력 또는 하위 태스크 집계
- **태스크 progress**: `linked_task_id`가 있으면 연동 가능, 없으면 수동 입력
- **NULL 빈번**: progress가 설정되지 않은 데이터가 다수

따라서 응답에 반드시 **completeness(완성도)** 와 **calculation(산출 방식)** 을 포함해야 한다.

### 2.4 NULL 보존 원칙 (COALESCE 남발 금지)

> **[리뷰 반영]** DB에서 `COALESCE(progress, 0)` 으로 반환하면 "원래 NULL이었다"는 사실이 소실되어,
> 핸들러/렌더러가 "가짜 0%"를 확정값으로 취급할 위험이 있다.

원칙:
- **DB 쿼리**: progress는 NULL 그대로 반환. `progress_is_null` 플래그 별도 포함.
- **집계 쿼리**: NULL을 0으로 치환하여 합산하지 않음. `FILTER (WHERE progress IS NOT NULL)` 사용.
- **렌더링 단계에서만**: "표시용 0%"를 선택적으로 사용하되, 반드시 "⚠️ 미설정" 경고를 동반.

```
DB 결과:    progress = NULL, progress_is_null = true
응답 계약:  calculation = "status_based" + confidence = "low"
렌더링:     "진행률: — (미설정, 상태 기반 추정 50%)" ⚠️
```

이렇게 해야 "미입력"을 "미진행(0%)"으로 오해시키지 않는다.

---

## 3. Phase 1: WBS 검색 쿼리 + 핸들러/렌더러

> **목표**: "OCR 성능 평가 진행률" 같은 쿼리에 즉시 WBS 데이터를 반환

### 3.1 SQL 쿼리 템플릿 (`query_templates.py`)

#### 3.1.1 WBS 이름 검색 쿼리 (2단계: 정확 매칭 → 부분 매칭)

> **[리뷰 반영]**
> - `priority` 숫자 컬럼으로 검색 우선순위 명시 (문자열 정렬 의존 제거)
> - `wbs_tasks` UNION 포함 (문서/코드 정합성)
> - `COALESCE(progress, 0)` 제거 → NULL 보존 + `progress_is_null` 별도 반환
> - 정확 매칭 1차 → 부분 매칭 2차 분리 (ILIKE escape 처리 포함)

**Step 1: 정확 매칭 (name = term)**

```sql
-- WBS_ENTITY_EXACT_SEARCH_QUERY
-- 이름 정확 매칭 우선 검색
SELECT
    1 AS priority,
    'wbs_item' AS entity_type,
    wi.id, wi.code, wi.name, wi.status,
    wi.progress,                          -- NULL 보존 (COALESCE 미사용)
    wi.planned_start_date, wi.planned_end_date,
    wi.actual_start_date, wi.actual_end_date,
    wi.estimated_hours, wi.actual_hours,
    wg.name AS parent_group_name,
    p.name AS phase_name,
    (wi.progress IS NULL) AS progress_is_null
FROM project.wbs_items wi
JOIN project.wbs_groups wg ON wi.group_id = wg.id
JOIN project.phases p ON wg.phase_id = p.id
WHERE p.project_id = %(project_id)s
  AND LOWER(wi.name) = LOWER(%(term)s)

UNION ALL

SELECT
    2 AS priority,
    'wbs_group' AS entity_type,
    wg.id, wg.code, wg.name, wg.status,
    wg.progress,
    wg.planned_start_date, wg.planned_end_date,
    wg.actual_start_date, wg.actual_end_date,
    NULL AS estimated_hours, NULL AS actual_hours,
    NULL AS parent_group_name,
    p.name AS phase_name,
    (wg.progress IS NULL) AS progress_is_null
FROM project.wbs_groups wg
JOIN project.phases p ON wg.phase_id = p.id
WHERE p.project_id = %(project_id)s
  AND LOWER(wg.name) = LOWER(%(term)s)

UNION ALL

SELECT
    3 AS priority,
    'wbs_task' AS entity_type,
    wt.id, wt.code, wt.name, wt.status,
    wt.progress,
    wt.planned_start_date, wt.planned_end_date,
    wt.actual_start_date, wt.actual_end_date,
    wt.estimated_hours, wt.actual_hours,
    wi.name AS parent_group_name,  -- parent item name
    p.name AS phase_name,
    (wt.progress IS NULL) AS progress_is_null
FROM project.wbs_tasks wt
JOIN project.wbs_items wi ON wt.item_id = wi.id
JOIN project.wbs_groups wg ON wt.group_id = wg.id
JOIN project.phases p ON wg.phase_id = p.id
WHERE p.project_id = %(project_id)s
  AND LOWER(wt.name) = LOWER(%(term)s)

ORDER BY priority, name
LIMIT %(limit)s;
```

**Step 2: 부분 매칭 (ILIKE, escape 처리)**

정확 매칭 0건일 때만 실행. 패턴 생성 시 `%`, `_`를 이스케이프 처리.

```sql
-- WBS_ENTITY_FUZZY_SEARCH_QUERY
-- Step 1이 0건일 때만 실행하는 부분 매칭 (ILIKE + escape)
-- 쿼리 구조는 EXACT와 동일하되 WHERE 절만 다름:
  AND wi.name ILIKE %(pattern)s ESCAPE '\'
-- pattern 생성: f"%{term.replace('%','\\%').replace('_','\\_')}%"
```

핸들러에서의 호출 흐름:
```python
def _search_wbs_entity(term: str, project_id: str) -> list:
    """2-step search: exact first, then fuzzy"""
    # Step 1: exact match
    results = execute_query(WBS_ENTITY_EXACT_SEARCH_QUERY, {
        "project_id": project_id,
        "term": term,
        "limit": 10,
    })
    if results:
        return results

    # Step 2: fuzzy match (ILIKE with escape)
    escaped = term.replace("%", "\\%").replace("_", "\\_")
    pattern = f"%{escaped}%"
    return execute_query(WBS_ENTITY_FUZZY_SEARCH_QUERY, {
        "project_id": project_id,
        "pattern": pattern,
        "limit": 10,
    })
```

#### 3.1.2 WBS 하위 항목 집계 쿼리 (NULL 제외 기반)

> **[리뷰 반영]** `COALESCE(progress, 0) * weight` → NULL 포함 시 실제보다 낮게 계산되는 왜곡 방지.
> NULL 제외 기반으로 집계하고, null_ratio를 별도로 confidence에 반영.

```sql
-- WBS_ITEM_CHILDREN_QUERY
-- WBS 아이템의 하위 태스크 요약 (NULL 제외 기반 집계)
SELECT
    wt.status,
    COUNT(*) AS task_count,
    -- NULL 제외 기반 가중 평균 (핵심: 미입력을 0%로 간주하지 않음)
    SUM(wt.progress * wt.weight)
        FILTER (WHERE wt.progress IS NOT NULL) AS weighted_progress_nonnull,
    SUM(wt.weight)
        FILTER (WHERE wt.progress IS NOT NULL) AS total_weight_nonnull,
    -- NULL 통계 (confidence 산출용)
    COUNT(*) FILTER (WHERE wt.progress IS NULL) AS null_progress_count,
    COUNT(*) AS total_count,
    -- 공수 정보
    SUM(COALESCE(wt.estimated_hours, 0)) AS total_estimated_hours,
    SUM(COALESCE(wt.actual_hours, 0)) AS total_actual_hours
FROM project.wbs_tasks wt
WHERE wt.item_id = %(item_id)s
GROUP BY wt.status
ORDER BY wt.status;
```

핸들러의 progress 계산 로직:
```python
def _calc_weighted_progress(rows: list) -> dict:
    """
    Calculate weighted progress from child rows (NULL-safe).

    Returns:
        {
            "progress": float | None,
            "calculation": str,
            "null_count": int,
            "null_ratio": float,
            "confidence": str,
        }
    """
    total_wp = sum(r["weighted_progress_nonnull"] or 0 for r in rows)
    total_w = sum(r["total_weight_nonnull"] or 0 for r in rows)
    null_count = sum(r["null_progress_count"] or 0 for r in rows)
    total_count = sum(r["total_count"] or 0 for r in rows)

    null_ratio = null_count / total_count if total_count > 0 else 1.0

    if total_w == 0:
        # 모든 하위 항목의 progress가 NULL → status 기반 추정으로 전환
        return {
            "progress": None,
            "calculation": "status_based",
            "null_count": null_count,
            "null_ratio": null_ratio,
            "confidence": "low",
        }

    progress = round(total_wp / total_w, 1)
    return {
        "progress": progress,
        "calculation": "child_weighted_avg",
        "null_count": null_count,
        "null_ratio": null_ratio,
        "confidence": _calc_confidence(null_ratio),
    }


def _calc_confidence(null_ratio: float) -> str:
    if null_ratio == 0:
        return "high"    # 모든 하위 항목에 progress 설정
    elif null_ratio < 0.3:
        return "medium"  # 70% 이상 설정
    else:
        return "low"     # 30% 이상 미설정
```

#### 3.1.3 WBS 그룹 요약 쿼리 (NULL 제외 기반)

```sql
-- WBS_GROUP_SUMMARY_QUERY
-- WBS 그룹의 하위 아이템 요약 (NULL 제외 기반)
SELECT
    wi.status,
    COUNT(*) AS item_count,
    SUM(wi.progress * wi.weight)
        FILTER (WHERE wi.progress IS NOT NULL) AS weighted_progress_nonnull,
    SUM(wi.weight)
        FILTER (WHERE wi.progress IS NOT NULL) AS total_weight_nonnull,
    COUNT(*) FILTER (WHERE wi.progress IS NULL) AS null_progress_count,
    COUNT(*) AS total_count
FROM project.wbs_items wi
WHERE wi.group_id = %(group_id)s
GROUP BY wi.status
ORDER BY wi.status;
```

#### 3.1.4 WBS 전체 현황 쿼리 (프로젝트 레벨)

```sql
-- WBS_PROJECT_OVERVIEW_QUERY
-- 프로젝트의 WBS 그룹별 진행 현황
SELECT
    wg.id AS group_id,
    wg.code,
    wg.name,
    wg.status,
    wg.progress,                          -- NULL 보존
    (wg.progress IS NULL) AS progress_is_null,
    wg.planned_start_date,
    wg.planned_end_date,
    p.name AS phase_name,
    COUNT(wi.id) AS item_count,
    SUM(CASE WHEN wi.status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed_items,
    SUM(CASE WHEN wi.status = 'IN_PROGRESS' THEN 1 ELSE 0 END) AS in_progress_items
FROM project.wbs_groups wg
JOIN project.phases p ON wg.phase_id = p.id
LEFT JOIN project.wbs_items wi ON wi.group_id = wg.id
WHERE p.project_id = %(project_id)s
GROUP BY wg.id, wg.code, wg.name, wg.status, wg.progress,
         wg.planned_start_date, wg.planned_end_date, p.name
ORDER BY p.name, wg.order_num;
```

### 3.2 핸들러 (`intent_handlers.py`)

```python
def handle_entity_progress(ctx: HandlerContext) -> ResponseContract:
    """
    Handle entity-specific progress queries.

    Flow:
    1. Extract entity name from message (regex capture based)
    2. 2-step search: exact match → fuzzy match (ILIKE with escape)
    3. If single match → fetch children aggregate → return detailed progress
    4. If multiple matches → apply tie-breaker → return best or disambiguation
    5. If no WBS match → fallback to user_stories title search
    """
```

핸들러 동작 흐름:

```
message에서 엔티티 이름 추출 (정규식 캡처 기반)
  ↓
WBS 이름 검색 (2-step: 정확 매칭 → ILIKE)
  ↓
┌──────────────────────────────────────────┐
│ 결과 0건 → fallback                      │ → user_stories title 검색
│ 결과 1건 → 하위 집계 + 상세 응답          │ → NULL 제외 기반 progress 계산
│ 결과 2~5건 → tie-breaker 적용            │ → 자동선택 or 목록 + 안내
│ 결과 6건+ → "더 구체적으로 입력해 주세요" │
└──────────────────────────────────────────┘
```

### 3.3 렌더러 (`response_renderer.py`)

```python
def render_entity_progress(contract: ResponseContract) -> str:
    """
    Render entity progress with completeness info.

    Example output (progress 있을 때):
    ────────────────────────────────────────
    📊 **WBS 항목 진행률** (기준: 2026-02-06 14:30 KST)
    📍 Project: proj-001

    **OCR 성능 평가** (WBS Item: 1.2.3)
    - 상태: 진행 중
    - 진행률: 45%  [████░░░░░░] 45%
    - 페이즈: AI 모듈 개발
    - 상위 그룹: 데이터 처리 파이프라인
    - 기간: 2026-01-20 ~ 2026-02-15 (남은 9일)
    - 공수: 실적 32h / 예상 60h

    **하위 태스크 현황** (5개)
      ✅ 완료: 2개
      🔄 진행 중: 2개
      📝 미시작: 1개

    ⚠️ progress 미설정 태스크 1건 (가중 평균에서 제외)

    💡 **산출 근거**:
      - 방식: 하위 태스크 가중 평균 (NULL 제외)
      - 완전성: 80% (1/5 태스크 progress 미설정)
      - 신뢰도: medium
    ────────────────────────────────────────

    Example output (progress 전부 NULL일 때):
    ────────────────────────────────────────
    📊 **WBS 항목 진행률** (기준: 2026-02-06 14:30 KST)

    **OCR 성능 평가** (WBS Item: 1.2.3)
    - 상태: 진행 중
    - 진행률: — (미설정, 상태 기반 추정 약 50%)

    ⚠️ 하위 태스크 5개 모두 progress 미설정
    💡 **산출 근거**: 상태 기반 추정 (신뢰도: low)
    ────────────────────────────────────────
    """
```

### 3.4 Degradation Tips (`degradation_tips.py`)

```python
"entity_progress": DegradationPlan(
    reason=DegradationReason.EMPTY_DATA,
    message="해당 이름의 WBS 항목을 찾을 수 없습니다.",
    tips=[
        "WBS 항목 이름을 정확하게 입력해 주세요",
        "WBS 구조가 아직 생성되지 않았을 수 있습니다",
        "유사한 이름의 항목이 있는지 확인해 보세요",
    ],
    next_actions=[
        "WBS 관리 화면에서 항목 확인",
        "'WBS 현황 보여줘'로 전체 구조 조회",
    ],
    related_menu="WBS 관리",
),
```

---

## 4. Phase 2: 엔티티 진행률 인텐트 + 라우팅

> **목표**: "X 진행률" 패턴을 `STATUS_METRIC`에서 분리하여 정확히 라우팅

### 4.1 새 인텐트: `ENTITY_PROGRESS`

```python
# answer_type_classifier.py - AnswerType enum에 추가
ENTITY_PROGRESS = "entity_progress"  # Specific entity progress query
```

### 4.2 분류 전략: "진행률 질의 + 대상 존재" 감지

단순히 키워드를 추가하는 것이 아니라, **2단계 감지**를 사용한다:

```
Step 1: 진행률 신호 감지
  "진행률", "진행율", "진척률", "완료율", "몇 퍼센트", "어디까지"

Step 2: 대상 후보 추출 (정규식 캡처 기반)
  쿼리에서 정규식으로 "진행률 키워드 앞" 부분을 캡처
  예: "ocr 성능 평가 진행율은" → 캡처 그룹 = "ocr 성능 평가"
  후처리: 조사 제거 (은/는/이/가/을/를/의)

Step 3: 대상 후보 유효성 검증
  - 스코프 단어만 남으면 무효 → status_metric
  - 2글자 이하이면 무효 → status_metric
  - 기존 전용 인텐트 키워드 포함 시 무효 → 해당 인텐트로 위임

Step 4: 라우팅 결정
  대상이 유효하면 → entity_progress
  대상이 없거나 무효 → status_metric (프로젝트 전체)
```

구체적인 분류 규칙:

| 쿼리 | 대상 추출 | 유효성 | 라우팅 |
| --- | --- | --- | --- |
| "ocr 성능 평가 진행율은" | "ocr 성능 평가" | 유효 (3단어) | `entity_progress` |
| "프로젝트 진행율은" | "프로젝트" | 무효 (스코프 단어) | `status_metric` |
| "이번 스프린트 진행률" | "이번 스프린트" | 무효 (스프린트 키워드) | `sprint_progress` |
| "요구사항 분석 몇 퍼센트야" | "요구사항 분석" | 유효 | `entity_progress` |
| "데이터 처리 파이프라인 어디까지 됐어" | "데이터 처리 파이프라인" | 유효 | `entity_progress` |
| "진행률 보여줘" | (없음) | 무효 (후보 없음) | `status_metric` |
| "프로젝트 OCR 성능 평가 진행률" | "프로젝트 OCR 성능 평가" → "OCR 성능 평가" | 유효 (스코프 단어 제거 후) | `entity_progress` |
| "UI 진행률" | "UI" | 무효 (2글자 이하) | `status_metric` |
| "Sprint 1 진행률" | "Sprint 1" | 무효 (스프린트 패턴) | `sprint_progress` |
| "이번 iteration 진행률" | "이번 iteration" → "iteration" | 무효 (스프린트 동의어) | `sprint_progress` |
| "이번 주 진행률" | "이번 주" → (제거) | 무효 (시간 부사만 남음) | `status_metric` |
| "금주 OCR 평가 진행률" | "금주 OCR 평가" → "OCR 평가" | 유효 (시간 부사 제거 후 3글자) | `entity_progress` |

### 4.3 POST-CLASSIFICATION에 추가 (priority loop 이후)

> **[리뷰 반영]** 기존 설계에서 PRE-CLASSIFICATION(priority loop 이전)에 배치했으나,
> 스프린트/백로그/칸반 전용 규칙이 먼저 적용되어야 안전하다.
> `entity_progress`는 **POST-CLASSIFICATION**(priority loop 이후, legacy 패턴 매칭 이전)에 배치한다.

실행 순서:
```
1. PRE-CLASSIFICATION: 부정어 감지 (negation → backlog)
2. PRIORITY LOOP: P1 전용 인텐트 (sprint, backlog, tasks_by_status, ...)
3. ★ POST-CLASSIFICATION: entity_progress 감지 (여기)
4. LEGACY PATTERN MATCHING: status_metric, howto, mixed, ...
5. FALLBACK: unknown → RAG
```

이 순서의 장점:
- "스프린트 진행률" → P1에서 `sprint_progress`로 먼저 잡힘 → entity_progress로 빠지지 않음
- "백로그 진행률" → P1에서 `backlog_list`로 먼저 잡힘
- "OCR 성능 평가 진행률" → P1에서 안 잡힘 → POST에서 entity_progress로 잡힘

```python
# POST-CLASSIFICATION: Entity progress detection
# Priority loop에서 매칭 안 된 "X 진행률" 패턴 감지
# 스프린트/백로그 전용 인텐트가 먼저 적용된 뒤 실행됨

_entity_progress_patterns = [
    r"(.+?)\s*(진행률|진행율|진척률|완료율|몇\s*%|몇\s*퍼센트)",
    r"(.+?)\s*(어디까지|얼마나)\s*(진행|완료|됐|했)",
]

# [3차 리뷰 반영: 2.1] 범위 단어 + 시간 부사 분리
# 시간 부사는 스프린트/기간 KPI로 갈 가능성이 있으므로 별도 처리
_scope_words = {"프로젝트", "전체", "overall", "project", "현재", "지금"}
_time_adverbs = {"이번", "이번주", "이번 주", "오늘", "금주", "이달", "이번달"}

# [3차 리뷰 반영: 2.2] 스프린트 동의어 (P1에서 놓친 경우 방어)
# "Sprint 1", "이번 iteration" 등 영어/숫자 혼합 표현 방어
_sprint_synonyms = {"스프린트", "sprint", "iteration", "이터레이션"}
_sprint_pattern = re.compile(r"sprint\s*\d+", re.IGNORECASE)

_josa_pattern = re.compile(r"[은는이가을를의에서도]$")

for pattern in _entity_progress_patterns:
    m = re.search(pattern, query_lower)
    if m:
        raw_candidate = m.group(1).strip()

        # [3차 리뷰 반영: 2.1] (.+?)는 매우 넓으므로 다단계 필터링 필수
        # Step A: 후보에서 스코프 단어 + 시간 부사 제거
        candidate_tokens = raw_candidate.split()
        cleaned = [t for t in candidate_tokens
                   if t not in _scope_words and t not in _time_adverbs]
        entity_candidate = " ".join(cleaned).strip()

        # 조사 제거
        entity_candidate = _josa_pattern.sub("", entity_candidate)

        # Step B: 유효성 검증 — 길이
        if len(entity_candidate) <= 2:
            continue  # 너무 짧으면 무효 ("UI", "QA" 등)

        # [3차 리뷰 반영: 2.2] Step C: 스프린트 동의어가 남아있으면 위임
        # "Sprint 1 진행률" → P1에서 놓쳤더라도 entity_progress로 잡지 않음
        candidate_lower = entity_candidate.lower()
        if any(syn in candidate_lower for syn in _sprint_synonyms):
            continue  # sprint_progress 또는 status_metric으로 위임
        if _sprint_pattern.search(candidate_lower):
            continue  # "Sprint 1" 같은 영어/숫자 혼합 방어

        # Step D: 시간 부사만 제거하고 스코프 단어도 없으면 → 무효
        # "이번 주 진행률" → cleaned=[], entity_candidate="" → 위에서 이미 걸림
        # "이번 스프린트 진행률" → cleaned=["스프린트"] → Step C에서 걸림

        reasoning = f"Entity progress query: target='{entity_candidate}'"
        if was_corrected:
            reasoning += f" (typo corrected: '{original_query}')"
        return AnswerTypeResult(
            answer_type=AnswerType.ENTITY_PROGRESS,
            confidence=0.85,
            matched_patterns=["entity_progress"],
            reasoning=reasoning,
        )
```

> **[3차 리뷰 반영: 2.1] `(.+?)` 과매칭 방어 전략 요약**:
> `(.+?)`는 의도적으로 넓은 범위를 잡되, 이후 **다단계 필터**로 무효 후보를 제거한다.
> - 스코프 단어 제거 (`_scope_words`)
> - 시간 부사 제거 (`_time_adverbs`)
> - 스프린트 동의어 위임 (`_sprint_synonyms` + `_sprint_pattern`)
> - 잔여 길이 검증 (2글자 이하 무효)
> - 조사 제거 후 최종 판단
>
> "마지막 명사구 추출" 방식보다 "넓게 잡고 다단계 필터"가 한국어 조사/띄어쓰기 변이에 더 견고하다.

### 4.4 핸들러 등록

```python
# intent_handlers.py - INTENT_HANDLERS에 추가
INTENT_HANDLERS = {
    ...
    "entity_progress": handle_entity_progress,
}
```

### 4.5 Classifier 등록

```python
# answer_type_classifier.py - has_dedicated_handler에 추가
def has_dedicated_handler(self, answer_type: AnswerType) -> bool:
    return answer_type in {
        ...
        AnswerType.ENTITY_PROGRESS,
    }
```

---

## 5. Phase 3: PMS_SCHEMA에 WBS 추가 (동적 확장)

> **목표**: Text-to-SQL이 WBS 관련 자유 질의를 처리할 수 있게 확장

### 5.1 PMS_SCHEMA 추가 (`text_to_sql.py`)

```sql
### project.phases (프로젝트 페이즈)
- id: VARCHAR (PK)
- project_id: VARCHAR (FK to project.projects)
- name: VARCHAR (phase name)
- status: VARCHAR
- progress: INTEGER (0-100)
- track_type: VARCHAR (AI, SI, COMMON)

### project.wbs_groups (WBS 그룹 - 2단계)
- id: VARCHAR (PK)
- phase_id: VARCHAR (FK to project.phases)
- code: VARCHAR (WBS code like "1.1")
- name: VARCHAR (group name)
- status: VARCHAR (NOT_STARTED, IN_PROGRESS, COMPLETED, ON_HOLD, CANCELLED)
- progress: INTEGER (0-100, nullable)
- weight: INTEGER (default 100, for progress calculation)
- planned_start_date, planned_end_date: DATE
- actual_start_date, actual_end_date: DATE
- linked_epic_id: VARCHAR (FK to project.epics)

### project.wbs_items (WBS 항목 - 3단계)
- id: VARCHAR (PK)
- group_id: VARCHAR (FK to project.wbs_groups)
- phase_id: VARCHAR (FK to project.phases)
- code: VARCHAR (WBS code like "1.1.1")
- name: VARCHAR (item name)
- status: VARCHAR (same as wbs_groups)
- progress: INTEGER (0-100, nullable)
- weight: INTEGER
- estimated_hours, actual_hours: INTEGER
- assignee_id: VARCHAR (FK to auth.users)
- planned_start_date, planned_end_date: DATE

### project.wbs_tasks (WBS 태스크 - 4단계)
- id: VARCHAR (PK)
- item_id: VARCHAR (FK to project.wbs_items)
- group_id, phase_id: VARCHAR (FK)
- code, name: VARCHAR
- status: VARCHAR, progress: INTEGER (nullable)
- estimated_hours, actual_hours: INTEGER
- linked_task_id: VARCHAR (FK to task.tasks)
- planned_start_date, planned_end_date: DATE

### project.wbs_item_story_links (WBS-Story 연결)
- wbs_item_id: VARCHAR (FK to project.wbs_items)
- story_id: VARCHAR (FK to task.user_stories)

### WBS Hierarchy:
Phase → WbsGroup → WbsItem → WbsTask
- project_id is on phases table, join through phases to filter by project
- linked_epic_id connects WBS to backlog (Epic → Feature → UserStory)
- linked_task_id connects WBS tasks to kanban tasks
```

### 5.2 schema_manager.py 업데이트

```python
PROJECT_SCOPED_TABLES에 추가:
- "project.wbs_groups"
- "project.wbs_items"
- "project.wbs_tasks"
- "project.wbs_item_story_links"
- "project.phases"

KEYWORD_TABLE_MAP에 추가:
- "wbs": ["project.wbs_groups", "project.wbs_items", "project.wbs_tasks"]
- "그룹": ["project.wbs_groups"]
- "페이즈": ["project.phases"]
- "공수": ["project.wbs_items", "project.wbs_tasks"]
- "가중": ["project.wbs_groups", "project.wbs_items"]
```

### 5.3 query_validator의 project_id 스코프 강제 규칙 보완

> **[리뷰 반영]** WBS 테이블에는 `project_id`가 직접 없다. `project.phases`를 통해 간접 조인한다.
> 기존 validator가 "top-level WHERE에 project_id가 반드시 있어야 한다" 규칙을 가지고 있으면,
> WBS 동적 SQL이 validation에서 떨어질 수 있다.

보완 방안:
```python
# query_validator.py (또는 동등 모듈)에 추가

# 간접 스코프 허용 조인 경로
# 이 테이블들은 project.phases를 통해 project_id 스코프가 강제된다
INDIRECT_SCOPE_TABLES = {
    "project.wbs_groups": "project.phases",   # wbs_groups.phase_id → phases.project_id
    "project.wbs_items": "project.phases",    # via wbs_groups
    "project.wbs_tasks": "project.phases",    # via wbs_groups
    "project.wbs_item_story_links": "project.wbs_items",  # via wbs_items → phases
}

# 검증 시: WBS 테이블이 포함된 쿼리에서
# project.phases가 JOIN에 포함되고 phases.project_id 조건이 있으면 통과
```

이 Phase가 완료되면 다음과 같은 자유 질의가 가능해진다:
- "WBS 중 지연된 항목"
- "예상 공수 대비 실제 공수 현황"
- "NOT_STARTED 상태인 WBS 그룹"
- "각 페이즈별 WBS 진행률"

---

## 6. 데이터 계약 (Data Contract)

### 6.1 ResponseContract.data 구조 (`entity_progress`)

```python
{
    # 기본 정보
    "entity": {
        "type": "wbs_item",       # "wbs_group" | "wbs_item" | "wbs_task" | "user_story"
        "id": "item-001",
        "code": "1.2.3",
        "name": "OCR 성능 평가",
        "status": "IN_PROGRESS",
        "progress": 45,           # NULL이면 None (COALESCE 미사용)
        "progress_is_null": False,
    },

    # 계층 정보
    "hierarchy": {
        "phase": "AI 모듈 개발",
        "group": "데이터 처리 파이프라인",
        "item": "OCR 성능 평가",         # self (또는 None)
    },

    # 일정 정보
    "schedule": {
        "planned_start": "2026-01-20",
        "planned_end": "2026-02-15",
        "actual_start": "2026-01-22",
        "actual_end": None,
        "days_remaining": 9,
        "is_overdue": False,
    },

    # 공수 정보
    "effort": {
        "estimated_hours": 60,
        "actual_hours": 32,
        "effort_rate": 53.3,             # actual / estimated * 100
    },

    # 하위 항목 요약 (NULL 제외 기반 집계)
    "children": {
        "total": 5,
        "by_status": {
            "COMPLETED": 2,
            "IN_PROGRESS": 2,
            "NOT_STARTED": 1,
        },
        "completion_rate": 40.0,         # status 기반 (COMPLETED / total)
    },

    # 신뢰도 메타데이터 (핵심 보완 포인트)
    "completeness": {
        "as_of": "2026-02-06T14:30:00+09:00",
        "scope": "wbs_item",
        "calculation": "child_weighted_avg",  # "direct" | "child_weighted_avg" | "linked_task" | "status_based"
        "null_progress_count": 1,             # progress가 NULL인 하위 항목 수
        "null_progress_ratio": 0.20,          # 20%
        "confidence": "medium",               # "high" (0%) | "medium" (<30%) | "low" (>=30%)
    },

    # 출처 추적 (디버깅/감사용)
    "provenance": {
        "source": {
            "primary": "project.wbs_items",
            "joins": ["project.wbs_groups", "project.phases"],
        },
        "query_mode": "exact",            # "exact" | "ilike" | "fallback_story"
    },

    # 다중 매칭 시
    "disambiguation": None,  # 또는 [{"name": "...", "type": "...", "progress": N}, ...]
}
```

### 6.2 completeness.calculation 값 정의

| 값 | 설명 | 집계 방식 | 신뢰도 |
| --- | --- | --- | --- |
| `direct` | 엔티티의 `progress` 컬럼 직접 사용 | 없음 (컬럼값 그대로) | 입력 의존 (low~high) |
| `child_weighted_avg` | 하위 항목 progress * weight 가중 평균 | NULL 제외 기반 집계 | null_ratio에 따라 |
| `linked_task` | `linked_task_id`를 통해 task.tasks 상태에서 파생 | 연결 태스크 status 기반 | 연결 상태 의존 |
| `status_based` | progress가 전부 NULL → status 기반 추정 | COMPLETED=100, IN_PROGRESS=50, NOT_STARTED=0 | **항상 low** |

### 6.3 confidence 산출 기준

```python
def _calc_confidence(null_ratio: float) -> str:
    if null_ratio == 0:
        return "high"    # 모든 하위 항목에 progress 설정
    elif null_ratio < 0.3:
        return "medium"  # 70% 이상 설정
    else:
        return "low"     # 30% 이상 미설정
```

### 6.4 provenance 필드 (출처 추적)

> **[리뷰 반영]** 운영/감사/디버깅에서 "왜 이 결과가 선택됐는지"가 명확해야 한다.
> 사용자에게 항상 노출할 필요는 없지만, 로그와 debug_info에 포함한다.

| 필드 | 설명 | 예시 |
| --- | --- | --- |
| `provenance.source.primary` | 주 데이터 소스 테이블 | `"project.wbs_items"` |
| `provenance.source.joins` | 조인 테이블 경로 | `["project.wbs_groups", "project.phases"]` |
| `provenance.query_mode` | 검색 방식 | `"exact"`, `"ilike"`, `"fallback_story"` |

---

## 7. 엔티티 리졸버 (Entity Resolver)

### 7.1 목적

"OCR 성능 평가"가 WBS item인지, user story title인지, sprint name인지 모호할 수 있다.
최소한의 리졸버로 정확한 엔티티를 찾는다.

### 7.2 검색 우선순위

```
1. project.wbs_items  (name)   — priority 1
2. project.wbs_groups (name)   — priority 2
3. project.wbs_tasks  (name)   — priority 3
4. task.user_stories  (title)  — priority 4
5. task.sprints       (name)   — priority 5
```

WBS가 최우선인 이유:
- "진행률" 질의의 대상은 대부분 WBS 항목 (작업 분해 구조)
- user_stories는 보통 "스토리", "백로그"로 별도 질의
- sprint는 이미 `sprint_progress` 인텐트로 라우팅됨

### 7.3 리졸버 함수

```python
def resolve_entity(
    search_term: str,
    project_id: str,
) -> dict:
    """
    Resolve entity name to specific database record.

    2-step search: exact match first, then ILIKE fuzzy.
    Applies tie-breaker for cross-entity-type competition.

    Returns:
        {
            "match_count": N,
            "matches": [...],
            "best_match": {...} or None,
            "source_table": "wbs_items" | "wbs_groups" | "wbs_tasks" | "user_stories" | None,
            "query_mode": "exact" | "ilike" | "fallback_story",
        }
    """
```

### 7.4 검색어 추출 로직 (정규식 캡처 기반)

> **[리뷰 반영]** split 기반 토큰 제거 → 정규식 캡처 기반으로 변경.
> "진행률은" 같은 붙임 표현, "몇퍼센트야" 같은 비분리 표현에도 대응.
>
> **[3차 리뷰 반영: 2.1, 2.2, 2.3]** 추가 개선:
> - 시간 부사 분리 처리 (`_time_adverbs`)
> - 스프린트 동의어 위임 (`_sprint_synonyms`, `_sprint_pattern`)
> - 띄어쓰기 없는 입력("OCR성능평가") 한계 문서화

```python
# 분류 단계에서 잡은 정규식 그룹을 그대로 후보로 사용
_entity_progress_patterns = [
    re.compile(r"(.+?)\s*(진행률|진행율|진척률|완료율|몇\s*%|몇\s*퍼센트)"),
    re.compile(r"(.+?)\s*(어디까지|얼마나)\s*(진행|완료|됐|했)"),
]

# [3차 리뷰 반영: 2.1] 범위 단어 + 시간 부사 분리
_scope_words = {"프로젝트", "전체", "overall", "project", "현재", "지금", "우리"}
_time_adverbs = {"이번", "이번주", "이번 주", "오늘", "금주", "이달", "이번달"}

# [3차 리뷰 반영: 2.2] 스프린트 동의어 방어
_sprint_synonyms = {"스프린트", "sprint", "iteration", "이터레이션"}
_sprint_pattern = re.compile(r"sprint\s*\d+", re.IGNORECASE)

_josa_pattern = re.compile(r"[은는이가을를의에서도]$")


def extract_entity_name(query: str) -> str | None:
    """
    Extract entity name from progress query using regex capture.

    "ocr 성능 평가 진행율은" → "ocr 성능 평가"
    "프로젝트 OCR 성능 평가 진행률" → "OCR 성능 평가"
    "진행률 보여줘" → None (no entity)
    "Sprint 1 진행률" → None (sprint synonym delegation)
    "금주 OCR 평가 진행률" → "OCR 평가" (time adverb stripped)
    """
    query_lower = query.lower().strip()

    for pattern in _entity_progress_patterns:
        m = pattern.search(query_lower)
        if m:
            raw = m.group(1).strip()

            # Step 1: 스코프 단어 + 시간 부사 제거
            tokens = raw.split()
            cleaned = [t for t in tokens
                       if t not in _scope_words and t not in _time_adverbs]
            candidate = " ".join(cleaned).strip()

            # Step 2: 조사 제거
            candidate = _josa_pattern.sub("", candidate)

            # Step 3: 유효성 — 길이
            if len(candidate) <= 2:
                return None

            # Step 4: 스프린트 동의어가 남아있으면 None (위임)
            candidate_lower = candidate.lower()
            if any(syn in candidate_lower for syn in _sprint_synonyms):
                return None
            if _sprint_pattern.search(candidate_lower):
                return None

            return candidate

    return None
```

> **[3차 리뷰 반영: 2.3] 띄어쓰기 없는 입력 한계**:
> "OCR성능평가"처럼 띄어쓰기 없이 붙여 쓴 입력은 정규식 캡처 자체는 정상 동작하지만,
> DB 검색(ILIKE) 단계에서 "OCR성능평가" vs "OCR 성능 평가" 불일치로 0건이 될 수 있다.
> 현재 대응:
> - ILIKE `%OCR성능평가%` → 공백 포함 데이터에서 매칭 실패
> - 향후 검색 단계에서 공백 정규화(strip all spaces for comparison)를 추가하면 해결 가능
> - 또는 L2 오타 사전에 "OCR성능평가" → "OCR 성능 평가" 매핑 추가로 대응

### 7.5 다중 매칭 처리 + Tie-Breaker

> **[리뷰 반영]** "WBS item 1건 + user_story 1건(동명이인)" 같은
> 엔티티 타입 간 경쟁이 운영에서 가장 자주 발생한다.

| 매칭 수 | 동작 |
| --- | --- |
| 0건 | degradation tip + "WBS 항목을 찾을 수 없습니다" |
| 1건 | 바로 상세 응답 |
| 2~5건 | tie-breaker 적용 → 자동선택 가능하면 선택, 불가능하면 목록 |
| 6건+ | "검색 결과가 너무 많습니다. 더 구체적으로 입력해 주세요" |

#### Tie-Breaker 규칙 (자동 선택 조건)

> **[3차 리뷰 반영: 3]** 운영에서 가장 자주 발생하는 경쟁은 "WBS item 1건 + user_story 1건(동명이인)"
> 같은 **엔티티 타입 간 경쟁**이다. Rule 4에 phase/group 컨텍스트 + 활성 스프린트 연결 + 최근 업데이트
> 기반 점수화를 추가하여 "불필요한 되묻기"를 최소화한다.

```python
def _select_best_match(matches: list) -> dict | None:
    """
    Apply tie-breaker rules for multi-match resolution.

    Rules (in priority order):
    1. 정확 매칭(=)이 부분 매칭(ILIKE)보다 우선
    2. priority 숫자가 낮은 엔티티 타입 우선 (item > group > task > story)
    3. 활성 상태(IN_PROGRESS) 엔티티가 완료(COMPLETED)/미시작보다 우선
    4. 컨텍스트 점수화: phase/group 컨텍스트 + 활성 스프린트 연결 + 최근 업데이트

    Returns:
        best_match dict if auto-selection is confident, None if disambiguation needed
    """
    if not matches:
        return None

    # Rule 1: 정확 매칭 필터
    exact = [m for m in matches if m.get("match_mode") == "exact"]
    if len(exact) == 1:
        return exact[0]
    if exact:
        matches = exact  # 정확 매칭 그룹 내에서 계속 경쟁

    # Rule 2: priority 기준 최상위
    min_priority = min(m["priority"] for m in matches)
    top_priority = [m for m in matches if m["priority"] == min_priority]
    if len(top_priority) == 1:
        return top_priority[0]

    # Rule 3: 활성 상태 우선
    active = [m for m in top_priority if m.get("status") == "IN_PROGRESS"]
    if len(active) == 1:
        return active[0]

    # Rule 4: [3차 리뷰 반영] 컨텍스트 점수화
    # 여전히 동점이면 복합 점수로 최종 선택 시도
    candidates = active if active else top_priority
    if len(candidates) > 1:
        scored = [(_context_score(m), m) for m in candidates]
        scored.sort(key=lambda x: x[0], reverse=True)
        # 최고 점수가 2위보다 2점 이상 높으면 자동 선택
        if scored[0][0] - scored[1][0] >= 2:
            return scored[0][1]

    # 자동 선택 불가 → disambiguation 필요
    return None


def _context_score(match: dict) -> int:
    """
    Calculate context-based relevance score for tie-breaking.

    Score components:
    - WBS item with phase/group hierarchy info: +3
    - Connected to active sprint: +2
    - Recently updated (within 7 days): +2
    - Has children (non-leaf): +1
    - user_story with status DONE: -1 (likely stale)
    """
    score = 0

    # WBS item with hierarchy context is more likely the intended target
    if match.get("entity_type") == "wbs_item" and match.get("phase_name"):
        score += 3

    # Active sprint connection indicates current relevance
    if match.get("active_sprint_connected"):
        score += 2

    # Recent activity suggests current relevance
    if match.get("updated_at"):
        from datetime import datetime, timedelta, timezone
        try:
            updated = match["updated_at"]
            if isinstance(updated, str):
                updated = datetime.fromisoformat(updated)
            if updated > datetime.now(timezone.utc) - timedelta(days=7):
                score += 2
        except (ValueError, TypeError):
            pass

    # Non-leaf nodes are usually what users ask about for progress
    if match.get("has_children"):
        score += 1

    # Completed user_stories are likely stale
    if match.get("entity_type") == "user_story" and match.get("status") == "DONE":
        score -= 1

    return score
```

Tie-breaker 운영 예시:

```
"OCR 성능 평가" 검색 → 2건 매칭:
  1. wbs_item (priority=1, IN_PROGRESS, phase="AI 모듈 개발", updated 2일 전)
     → context_score = 3 (hierarchy) + 2 (recent) = 5
  2. user_story (priority=4, DONE, updated 30일 전)
     → context_score = 0 + (-1) (stale) = -1
  → 차이 6점 ≥ 2 → wbs_item 자동 선택 ✅
```

---

## 8. 회귀 테스트

### 8.1 분류/라우팅 테스트

```python
class TestEntityProgressClassification:
    """entity_progress routing tests"""

    @pytest.fixture
    def classifier(self):
        return AnswerTypeClassifier()

    def test_specific_entity_progress(self, classifier):
        """Specific entity name + progress keyword → entity_progress"""
        cases = [
            "ocr 성능 평가 진행율은",
            "요구사항 분석 진행률 알려줘",
            "데이터 처리 파이프라인 어디까지 됐어",
            "UI 설계 검토 몇 퍼센트야",
        ]
        for msg in cases:
            result = classifier.classify(msg)
            assert result.answer_type == AnswerType.ENTITY_PROGRESS, \
                f"Expected ENTITY_PROGRESS for '{msg}', got {result.answer_type}"

    def test_project_progress_stays_metric(self, classifier):
        """Project-level progress → status_metric (NOT entity_progress)"""
        cases = [
            "프로젝트 진행율은",
            "전체 진행률 보여줘",
            "진행률 알려줘",
        ]
        for msg in cases:
            result = classifier.classify(msg)
            assert result.answer_type != AnswerType.ENTITY_PROGRESS, \
                f"'{msg}' should NOT be ENTITY_PROGRESS, got {result.answer_type}"

    def test_sprint_progress_not_entity(self, classifier):
        """Sprint progress → sprint_progress (NOT entity_progress)"""
        result = classifier.classify("이번 스프린트 진행률")
        assert result.answer_type == AnswerType.SPRINT_PROGRESS

    def test_short_name_stays_metric(self, classifier):
        """Too-short entity name (<=2 chars) → NOT entity_progress"""
        cases = [
            "UI 진행률",     # "UI" = 2글자, 무효
            "QA 진행률",     # "QA" = 2글자, 무효
        ]
        for msg in cases:
            result = classifier.classify(msg)
            assert result.answer_type != AnswerType.ENTITY_PROGRESS, \
                f"'{msg}' should NOT be ENTITY_PROGRESS (name too short)"

    def test_scope_word_stripped(self, classifier):
        """Scope words in candidate should be stripped"""
        result = classifier.classify("프로젝트 OCR 성능 평가 진행률")
        assert result.answer_type == AnswerType.ENTITY_PROGRESS
        # "프로젝트" stripped, remaining "OCR 성능 평가" is valid
```

### 8.2 WBS 조회 테스트

```python
class TestWBSEntitySearch:
    """WBS entity resolver and handler tests"""

    def test_exact_match_single(self):
        """Single exact match returns detailed progress"""
        # Mock: 1 WBS item matching "OCR 성능 평가" (exact)
        # Assert: entity.type == "wbs_item", provenance.query_mode == "exact"

    def test_multiple_matches_disambiguation(self):
        """Multiple matches return list with disambiguation"""
        # Mock: 3 items matching "OCR" (ILIKE) → list response
        # Assert: disambiguation is not None, len >= 2

    def test_no_match_fallback_to_stories(self):
        """No WBS match → fallback to user_stories search"""
        # Assert: provenance.query_mode == "fallback_story"

    def test_progress_null_completeness_warning(self):
        """progress NULL items → completeness warning in response"""
        # Assert: completeness.confidence = "low" or "medium"
        # Assert: calculation != "child_weighted_avg" if all NULL

    def test_project_id_scope_enforced(self):
        """Only returns items from current project"""
        # Assert: no cross-project leakage (phases.project_id filter)

    def test_ilike_escape_special_chars(self):
        """Search term with % or _ should not cause wild matching"""
        # Mock: search_term = "100%_완료" → should escape % and _
```

### 8.3 렌더링 테스트

```python
class TestEntityProgressRenderer:
    """Entity progress response rendering tests"""

    def test_header_distinct(self):
        """entity_progress header is distinct from status_metric"""
        # Assert: "📊 **WBS 항목 진행률**" NOT "📊 **프로젝트 현황**"

    def test_completeness_info_shown(self):
        """Completeness metadata is rendered"""
        # Assert: "산출 근거" section present

    def test_disambiguation_list(self):
        """Multiple matches render as selectable list"""

    def test_null_progress_shows_dash_not_zero(self):
        """NULL progress renders as '—' with warning, NOT '0%'"""
        # Assert: "—" or "미설정" in output
        # Assert: "0%" NOT in output when progress_is_null is True
```

### 8.4 숫자 정합성 테스트 (NULL 왜곡 방지)

> **[리뷰 반영]** 운영 사고를 가장 많이 막는 핵심 테스트 2종

```python
class TestProgressCalculationIntegrity:
    """Progress calculation should not distort NULL values"""

    def test_all_null_progress_uses_status_based(self):
        """
        When all 5 children have progress=NULL:
        - MUST NOT calculate as 0%
        - MUST use calculation='status_based'
        - MUST set confidence='low'
        - progress should be None or status-estimated value
        """
        rows = [
            {"weighted_progress_nonnull": None, "total_weight_nonnull": None,
             "null_progress_count": 5, "total_count": 5, "status": "IN_PROGRESS"},
        ]
        result = _calc_weighted_progress(rows)
        assert result["calculation"] == "status_based"
        assert result["confidence"] == "low"
        assert result["progress"] is None  # NOT 0

    def test_partial_null_excludes_from_average(self):
        """
        3/5 children have progress, 2 are NULL:
        - Average should be calculated from 3 non-NULL only
        - null_ratio = 0.4, confidence = 'low'
        - Weighted average should NOT include 0 for NULL items
        """
        # 3 items: progress=80*100 + 60*100 + 40*100 = 18000, weight=300
        # Expected: 18000/300 = 60.0 (NOT 18000/500 = 36.0)
        rows = [
            {"weighted_progress_nonnull": 18000, "total_weight_nonnull": 300,
             "null_progress_count": 2, "total_count": 5, "status": "IN_PROGRESS"},
        ]
        result = _calc_weighted_progress(rows)
        assert result["progress"] == 60.0
        assert result["null_ratio"] == 0.4
        assert result["confidence"] == "low"

    def test_priority_guarantee_item_over_group(self):
        """
        Same name exists in both wbs_items and wbs_groups:
        - wbs_item (priority=1) should be selected over wbs_group (priority=2)
        """
        matches = [
            {"name": "데이터 처리", "priority": 1, "entity_type": "wbs_item",
             "status": "IN_PROGRESS", "match_mode": "exact"},
            {"name": "데이터 처리", "priority": 2, "entity_type": "wbs_group",
             "status": "IN_PROGRESS", "match_mode": "exact"},
        ]
        best = _select_best_match(matches)
        assert best is not None
        assert best["entity_type"] == "wbs_item"
        assert best["priority"] == 1
```

---

## 9. 수정 대상 파일

### Phase 1 (즉시 체감)

| 파일 | 변경 | 설명 |
| --- | --- | --- |
| `query/query_templates.py` | 추가 | WBS 검색 SQL (exact+fuzzy), 집계 SQL 2개, 전체현황 SQL 1개 |
| `workflows/intent_handlers.py` | 추가 | `handle_entity_progress()` + `_calc_weighted_progress()` |
| `contracts/response_renderer.py` | 추가 | `render_entity_progress()` (NULL 표시, completeness 포함) |
| `contracts/degradation_tips.py` | 추가 | `entity_progress` 엔트리 |
| `tests/test_p0_intent_routing.py` | 추가 | `TestEntityProgressRenderer`, `TestProgressCalculationIntegrity` |

### Phase 2 (라우팅 안정화)

| 파일 | 변경 | 설명 |
| --- | --- | --- |
| `classifiers/answer_type_classifier.py` | 수정 | `ENTITY_PROGRESS` enum + POST-CLASSIFICATION 감지 |
| `workflows/intent_handlers.py` | 수정 | INTENT_HANDLERS에 `entity_progress` 등록 |
| `utils/entity_resolver.py` | 신규 | 2-step 검색 + tie-breaker + 정규식 캡처 추출 |
| `tests/test_p0_intent_routing.py` | 추가 | `TestEntityProgressClassification` |
| `tests/test_entity_resolver.py` | 신규 | 리졸버 단위 테스트 (escape, scope 등) |

### Phase 3 (동적 확장)

| 파일 | 변경 | 설명 |
| --- | --- | --- |
| `query/text_to_sql.py` | 수정 | PMS_SCHEMA에 WBS 테이블 + phases 추가 |
| `query/schema_manager.py` | 수정 | PROJECT_SCOPED_TABLES, KEYWORD_TABLE_MAP 확장 |
| `query/query_validator.py` | 수정 | INDIRECT_SCOPE_TABLES 허용 조인 경로 추가 |

---

## 10. WBS 스키마 레퍼런스

### 10.1 계층 구조

```
project.projects
  └─ project.phases (project_id)
       └─ project.wbs_groups (phase_id)
            ├─ project.wbs_items (group_id, phase_id)
            │    ├─ project.wbs_tasks (item_id, group_id, phase_id)
            │    └─ project.wbs_item_story_links → task.user_stories
            └─ project.features (wbs_group_id) → project.epics
```

### 10.2 project_id 접근 경로

WBS 테이블에는 `project_id`가 직접 없다. `project.phases`를 통해 조인:

```sql
-- WBS item → project_id
FROM project.wbs_items wi
JOIN project.wbs_groups wg ON wi.group_id = wg.id
JOIN project.phases p ON wg.phase_id = p.id
WHERE p.project_id = %(project_id)s
```

### 10.3 status 값

| 테이블 | status 값 |
| --- | --- |
| wbs_groups | NOT_STARTED, IN_PROGRESS, COMPLETED, ON_HOLD, CANCELLED |
| wbs_items | NOT_STARTED, IN_PROGRESS, COMPLETED, ON_HOLD, CANCELLED |
| wbs_tasks | NOT_STARTED, IN_PROGRESS, COMPLETED, ON_HOLD, CANCELLED |

### 10.4 progress 계산 방식

```
progress 값 범위: 0~100 (INTEGER, nullable)
weight 기본값: 100

그룹 progress = Σ(item.progress × item.weight) / Σ(item.weight)  -- NULL 제외
아이템 progress = Σ(task.progress × task.weight) / Σ(task.weight)  -- NULL 제외
태스크 progress = 직접 입력 또는 linked_task 상태 기반

⚠️ NULL 처리 원칙:
- 집계 시 NULL인 항목은 분모/분자 모두에서 제외
- 전부 NULL이면 calculation = "status_based"로 전환
- 렌더링에서만 "표시용 추정치"를 사용하되 반드시 경고 동반
```

### 10.5 Migration 파일

| 버전 | 파일 | 내용 |
| --- | --- | --- |
| V20260125 | `wbs_and_feature_tables.sql` | wbs_groups, wbs_items, wbs_tasks, features, wbs_item_story_links |
| V20260204 | `wbs_dependencies.sql` | wbs_dependencies (predecessor/successor) |
| V20260205 | `wbs_task_dates.sql` | wbs_tasks에 date 컬럼 추가 |
| V20260208 | `wbs_snapshots.sql` | wbs_snapshots (백업/복원) |

---

## 11. 리뷰 반영 사항 요약

### 11.1 2차 리뷰 반영 피드백 Top 5

| # | 영역 | 문제 | 반영 위치 |
| --- | --- | --- | --- |
| 1 | **SQL: priority 컬럼** | `entity_type` 문자열 정렬은 콜레이션 의존적 | 3.1.1: 숫자 `priority` 컬럼 명시 + `wbs_tasks` UNION 추가 |
| 2 | **SQL: COALESCE 남발 금지** | `COALESCE(progress, 0)` → "가짜 0%" 위험 | 2.4: NULL 보존 원칙 신설, 3.1.1~3.1.4: 전체 쿼리 수정 |
| 3 | **SQL: NULL 제외 집계** | `SUM(COALESCE(x, 0) * w)` → 미입력을 0%로 왜곡 | 3.1.2~3.1.3: `FILTER (WHERE progress IS NOT NULL)` 적용 |
| 4 | **라우팅: POST-CLASSIFICATION** | PRE에서 실행 시 스프린트 전용 규칙보다 먼저 잡힘 | 4.3: priority loop 이후로 이동, 실행 순서 다이어그램 추가 |
| 5 | **검색어 추출: 정규식 캡처** | split 기반 → 붙임/조사/비분리 표현에 취약 | 7.4: 정규식 캡처 + 조사 제거 + 유효성 검증 |

### 11.2 2차 리뷰 추가 반영 사항

| # | 영역 | 반영 내용 | 위치 |
| --- | --- | --- | --- |
| 6 | **검색: 2-step** | 정확 매칭 1차 → ILIKE 2차 분리 | 3.1.1 |
| 7 | **검색: ILIKE escape** | `%`, `_` 특수문자 이스케이프 처리 | 3.1.1 Step 2 |
| 8 | **Resolver: Tie-Breaker** | 엔티티 타입 간 경쟁 시 자동선택 규칙 4단계 | 7.5 |
| 9 | **Contract: provenance** | `source` (테이블/조인 경로) + `query_mode` 추가 | 6.1, 6.4 |
| 10 | **Phase 3: validator 충돌** | WBS 간접 스코프 조인 경로 허용 규칙 | 5.3 |
| 11 | **테스트: NULL 왜곡 방지** | 전체 NULL → status_based 전환 검증 | 8.4 |
| 12 | **테스트: 우선순위 보장** | 동명 item/group 경쟁 시 item 선택 검증 | 8.4 |
| 13 | **테스트: escape 검증** | `%`, `_` 포함 검색어 안전성 검증 | 8.2 |
| 14 | **유효성: 2글자 필터** | "UI 진행률" 같은 짧은 후보 무효 처리 | 4.2 Step 3, 8.1 |
| 15 | **렌더링: NULL 표시** | NULL → "—(미설정)" + 경고, "0%"가 아님 | 3.3, 8.3 |

### 11.3 3차 리뷰 반영 사항 (PDF: "WBS 데이터 연동 검토")

| # | 영역 | 리뷰 지적 | 반영 내용 | 위치 |
| --- | --- | --- | --- | --- |
| 16 | **(.+?) 과매칭 방어** | `(.+?)`가 매우 넓어서 "프로젝트 OCR 성능 평가" 같은 과캡처 발생 | 다단계 필터 전략 문서화: scope 제거 → 시간 부사 제거 → sprint 위임 → 길이 검증 | 4.3 |
| 17 | **시간 부사 분리 처리** | "이번/이번주/오늘" 같은 시간 부사가 scope word에 누락 | `_time_adverbs` 별도 세트 추가, 스프린트/기간 KPI 위임 가능성 반영 | 4.3, 7.4 |
| 18 | **스프린트 동의어 방어** | "Sprint 1" 영어/숫자 혼합, "iteration" 동의어가 entity_progress로 뚫림 | `_sprint_synonyms` + `_sprint_pattern` (regex) 추가 | 4.3, 7.4 |
| 19 | **Tie-Breaker 컨텍스트 점수화** | "WBS item 1건 + user_story 1건" 타입 간 경쟁에서 자동선택 규칙이 부족 | Rule 4에 `_context_score()` 함수 추가: phase/group 컨텍스트, 활성 스프린트, 최근 업데이트, 완료 user_story 감점 | 7.5 |
| 20 | **띄어쓰기 없는 입력 한계** | "OCR성능평가" 같은 spaceless 입력 시 ILIKE 검색 불일치 | 한계 문서화 + 대응 방안 제시 (공백 정규화 또는 L2 사전 매핑) | 7.4 |
| 21 | **라우팅 테이블 확장** | Sprint N, iteration, 시간 부사 케이스가 누락 | 4개 라우팅 케이스 추가 (Sprint 1, iteration, 이번 주, 금주+엔티티) | 4.2 |
