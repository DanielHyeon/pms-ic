# 09. 백로그 데이터 정합성 복구 + 역할 기반 설계

> **최종 목표**: PO/PM/PMO 역할별 화면 분리를 위한 데이터 정합성 확보 및 View API 구축
> **전체 소요 기간**: 8.5~18일 (Phase 0~4 순차 진행)
> **시작 조건**: 현재 DB 상태의 데이터 정합성 문제 확인 완료
> **운영 철학**: "즉시 실패" 3중 안전망 — DB FK(ms) + CI Gate(분) + Runtime DataQuality(시간~일)

---

## 배경

백로그 관리 페이지의 프론트엔드-DB 간 데이터 정합성 분석 결과, 다음과 같은 문제가 확인됨:

| 심각도 | 문제 | 영향 |
|---|---|---|
| **CRITICAL** | `task.tasks.part_id`가 존재하지 않는 ID 참조 | Part 기반 JOIN 전체 0건 |
| **CRITICAL** | `project.requirements` 테이블 데이터 없음 | 백로그-요구사항 JOIN 불가 |
| **HIGH** | `user_stories.epic` 텍스트가 Epic 엔티티명과 불일치 | Epic 기반 집계 실패 |
| **MEDIUM** | `user_stories.part_id` 전부 NULL | Part별 스토리 필터 불가 |
| **HIGH** | `useEpics.ts`가 localStorage 전용 | 백엔드 Epic 데이터와 완전 단절 |
| **HIGH** | `backlog_items`와 `user_stories` 간 연결 키 없음 | 스코프-실행 추적 불가 |

이 상태에서 역할별 화면(PO/PM/PMO)을 만들면:
- **PMO**: 빈 KPI를 보게 됨
- **PO**: Epic-Story가 안 맞음
- **PM**: 파트별 업무가 0건이 됨

**따라서 데이터 정합성 복구가 역할 분리의 토대다.**

---

## Phase 구조

```
Phase 0: "조인 0건" 제거          → 화면이 데이터를 보여줄 수 있게
Phase 1: ID 기반 관계 구축         → 집계/필터가 가능하게
Phase 2: 표준 모델 + API 계약 고정  → 역할별 화면의 데이터 기반 확보
Phase 3: 역할별 View API + UI     → PO/PM/PMO가 각자의 질문에 답하는 화면
Phase 4: FK + CI + 데이터 품질     → 다시는 깨지지 않게 (3중 안전망)
```

---

## Phase 문서 인덱스

| Phase | 문서 | 우선순위 | 소요 기간 | 핵심 내용 |
|---|---|---|---|---|
| **0** | [PHASE_0_DATA_EMERGENCY_HOTFIX.md](PHASE_0_DATA_EMERGENCY_HOTFIX.md) | CRITICAL | 0.5~1일 | part_id 잘못된 참조 수정, requirements 테이블 채우기 (preq- prefix + source 추적), FK 즉시 추가 (재발 방지), CI 통합 검증 |
| **1** | [PHASE_1_TEXT_TO_ID_MIGRATION.md](PHASE_1_TEXT_TO_ID_MIGRATION.md) | HIGH | 1~2일 | epic_id FK 추가 (ON DELETE RESTRICT), story.part_id를 feature에서 파생, Orphan VIEW 3개 + Mismatch VIEW 2개, CI 검증 |
| **2** | [PHASE_2_STANDARD_BACKLOG_MODEL.md](PHASE_2_STANDARD_BACKLOG_MODEL.md) | HIGH | 2~4일 | backlog_items-stories 연결 (옵션 A 계약 확정), Epic API 전환 (localStorage 제거), 상태 체계 표준화 + audit.status_transition_events, Option A 유니크 인덱스 |
| **3** | [PHASE_3_ROLE_BASED_VIEW_API.md](PHASE_3_ROLE_BASED_VIEW_API.md) | HIGH | 3~6일 | JWT 클레임 확장 (capabilities/scope), 2계층 강제 (Controller capability + Service scope), ViewService 3계층 아키텍처, PO/PM/PMO View API + Workbench UI, 이벤트 기반 KPI, dataQuality Integrity/Readiness 2층 점수 |
| **4** | [PHASE_4_FK_CI_GATE_DATA_QUALITY.md](PHASE_4_FK_CI_GATE_DATA_QUALITY.md) | MEDIUM | 2~5일 | FK 제약조건 5개 (NOT VALID → VALIDATE 순차), CI 데이터 품질 게이트 (HARD 9 + SOFT 2), 데이터 품질 대시보드 3층 점수 (Integrity/Readiness/Traceability), 조회 시 스냅샷 이력 |

---

## 의존 관계

```
Phase 0 (응급 처치: JOIN 0건 제거 + FK 2개)
    ↓
Phase 1 (ID 기반 관계: epic_id FK + part_id 파생 + 검증 VIEW 5개)
    ↓
Phase 2 (표준 모델: 옵션 A 계약 + 상태 표준 + 전이 이벤트)
    ↓
Phase 3 (역할별 View API: capability/scope 강제 + ViewService + Workbench)
    ↓
Phase 4 (3중 안전망: FK 5개 + CI Gate 11개 + DataQuality 대시보드)
```

- **Phase 0**은 **무조건 선행** (나머지 모든 Phase가 의존)
- **Phase 1**은 Phase 0의 JOIN 0건 해소에 의존 (ID 기반 관계를 걸려면 JOIN이 먼저 동작해야)
- **Phase 2**는 Phase 1 완료 후 (epic_id 기반 집계가 정확해야 상태 표준화 가능)
- **Phase 3**은 Phase 2 완료 후 (API 계약이 고정되어야 View Model 설계 가능, `audit.status_transition_events`로 이벤트 기반 KPI 계산)
- **Phase 4**는 Phase 0~3 전체 완료 후 (데이터 + 계약 + API 모두 정리된 상태에서 FK 추가)

---

## 핵심 설계 결정 요약

### 공통 원칙

| 원칙 | 내용 | 적용 Phase |
|---|---|---|
| **서버 강제 = 단일 진실** | 프론트 Gate는 UX, 서버가 항상 capability + scope 강제 | Phase 3~4 |
| **ID 기반 계약** | 텍스트 관계 → FK 기반 관계. ID가 없으면 집계/필터/권한이 안 됨 | Phase 0~1 |
| **분기 가능한 사본** | `project.requirements`는 `rfp.requirements`의 독립 사본 (preq- prefix) | Phase 0 |
| **파생값 계약** | story.part_id의 원천은 feature.part_id (mismatch VIEW로 감시) | Phase 1 |
| **옵션 A 계약** | backlog_item당 requirement 1개, story당 requirement 1개 (유니크 인덱스) | Phase 2 |
| **전이 이벤트** | 상태 변경은 반드시 `audit.status_transition_events`에 기록 (리드타임/병목 측정용) | Phase 2~3 |
| **2계층 권한 강제** | Controller `@PreAuthorize(capability)` + Service `assertPartScope/assertStoryScope` | Phase 3 |
| **즉시 실패 3중 안전망** | DB FK(ms) + CI Gate(분) + Runtime DataQuality(시간~일) | Phase 4 |

### FK ON DELETE 정책

| FK | ON DELETE | 근거 | Phase |
|---|---|---|---|
| `tasks.part_id → parts` | SET NULL | 파트 삭제/재편 시 태스크는 미배정으로 | Phase 0 |
| `backlog_items.requirement_id → requirements` | SET NULL | 요구사항 삭제 시 아이템은 연결 해제 | Phase 0 |
| `user_stories.epic_id → epics` | **RESTRICT** | Epic 삭제 시 KPI 파괴 방지. soft delete(archived_at) 사용 | Phase 1 |
| `user_stories.part_id → parts` | SET NULL | 파트 재편 시 스토리는 미배정으로 | Phase 4 |
| `user_stories.backlog_item_id → backlog_items` | SET NULL | 백로그 아이템 삭제 시 스토리 연결 해제 | Phase 4 |

---

## 역할별 관점 요약

| 역할 | 관점 | 핵심 화면 (Phase 3) | 핵심 데이터 | capability 예시 |
|---|---|---|---|---|
| **PO** | What/Why (스코프) | Epic Tree + Backlog Items + Story Rollup | backlog_items, epics, requirements | VIEW_BACKLOG, EDIT_BACKLOG_ITEM, APPROVE_BACKLOG_ITEM |
| **PM** | How/When (실행) | Sprint Board + Story Cards + Part Workload | user_stories, sprints, tasks, parts | VIEW_STORY, EDIT_STORY, MANAGE_SPRINT, ASSIGN_TASK |
| **PMO** | Governance/KPI | KPI Dashboard + Data Quality + Audit Log | 전체 집계 + 이벤트 기반 KPI + 데이터 품질 지표 | VIEW_KPI, VIEW_AUDIT_LOG, VIEW_DATA_QUALITY, EXPORT_REPORT |

### PMO KPI 체계

| 유형 | KPI 예시 | 데이터 소스 |
|---|---|---|
| **커버리지** | 요구사항 추적률, 스토리 분해율, Epic 커버리지, Part 배정률 | 집계 쿼리 (현재값) |
| **운영** | Story 리드타임, REVIEW 체류시간 비율, 스프린트 완료율 | `audit.status_transition_events` (이벤트 기반) |
| **데이터 품질** | Integrity(참조 무결성) + Readiness(관계 완성도) + Traceability(스코프 추적) | Phase 1~2 VIEW + Phase 4 집계 SQL |

---

## 산출물 전체 목록

### Phase 0: 응급 처치 (산출물 7건)

| # | 파일 | 용도 | 실행 순서 |
|---|---|---|---|
| 1 | `V20260208_01__fix_task_part_id_references.sql` | Flyway: task part_id 수정 (프리체크 + 사후검증 포함) | 1st |
| 2 | `V20260208_02__seed_project_requirements.sql` | Flyway: 스키마 변경(source_requirement_id) + project.requirements 채우기 + backlog_items 참조 갱신 | 2nd |
| 3 | `V20260208_03__add_phase0_fk_constraints.sql` | Flyway: FK 제약조건 2개 추가 (NOT VALID → VALIDATE) | 3rd |
| 4 | `data.sql` 수정 | part_id 매핑 수정 + project.requirements 섹션 추가 + backlog_items 참조 갱신 | - |
| 5 | `verify_part_join.sql` | 검증: part 고아 참조 0건 + 프로젝트별 분포 | - |
| 6 | `verify_backlog_requirement_join.sql` | 검증: requirement 고아 참조 0건 + 연결률 + source 추적 | - |
| 7 | `verify_phase0_all.sql` | CI 통합 검증: 실패 시 배포 중단 | CI |

### Phase 1: ID 기반 관계 구축 (산출물 8건)

| # | 파일 | 용도 | 유형 |
|---|---|---|---|
| 1 | `V20260209_01__add_epic_id_column.sql` | epic_id 컬럼 + 인덱스 + FK (NOT VALID, ON DELETE RESTRICT) | 스키마 |
| 2 | `V20260209_02__map_epic_id_data.sql` | epic_id 데이터 매핑 (사전/사후 검증 포함) | 데이터 |
| 3 | `V20260209_03__populate_story_part_id.sql` | story.part_id를 feature에서 파생 (사전/사후 검증 포함) | 데이터 |
| 4 | `V20260209_04__create_integrity_views.sql` | Orphan VIEW 3개 + Mismatch VIEW 2개 | 검증 |
| 5 | `V20260209_05__validate_phase1_fk.sql` | FK VALIDATE (NOT VALID → VALID 전환) | 스키마 |
| 6 | `verify_phase1_all.sql` | CI 검증 DO 블록 (Flyway 외부) | CI |
| 7 | `data.sql` 수정 | epic_id 추가, epic TEXT 정확화 | seed |
| 8 | `schema.sql` 수정 | user_stories 테이블에 epic_id 컬럼 추가 | seed |

### Phase 2: 표준 모델 + API 계약 (산출물 10건)

**Flyway (6건)**:

| # | 파일 | 용도 | 유형 |
|---|---|---|---|
| 1 | `V20260210_01__add_backlog_item_id_to_stories.sql` | backlog_item_id 컬럼 + 매핑 + 유니크 인덱스 (옵션 A 계약) | 스키마+데이터 |
| 2 | `V20260210_02__add_epic_order_num.sql` | order_num 컬럼 + 인덱스 | 스키마 |
| 3 | `V20260210_03__create_transition_event_table.sql` | audit 스키마 + status_transition_events 테이블 | 스키마 |
| 4 | `V20260210_04__normalize_status_values_and_seed_events.sql` | 상태값 정규화 + 전이 이벤트 적재 (Story/Epic/BacklogItem) | 데이터 |
| 5 | `V20260210_05__create_phase2_integrity_views.sql` | 무결성 VIEW 3개 (orphan backlog_item_ref, multi requirement, dup requirement) | 검증 |
| 6 | `verify_phase2_all.sql` | CI 검증 DO 블록 | CI |

**프론트엔드 (3건)**:

| # | 파일 | 용도 |
|---|---|---|
| 1 | `useEpics.ts` 수정 | localStorage 제거 → API 기반 전환 |
| 2 | `api.ts` 수정 | Epic CRUD 메서드 추가/확인 |
| 3 | Epic 타입 수정 | `order` → `order_num`, `wbsTaskId`/`startDate` 제거 |

**문서 (1건)**:

| # | 파일 | 용도 |
|---|---|---|
| 1 | `STATUS_STANDARD.md` | 상태 체계 표준 + 전이 이벤트 계약 (필드/의미/change_source 정의) |

### Phase 3: 역할별 View API + UI (산출물 20건)

| # | 파일/컴포넌트 | 용도 | 구현 단계 |
|---|---|---|---|
| 1 | `JwtTokenProvider.java` 수정 | 토큰에 projectRoles 클레임 추가 (capabilities, allowedPartIds) | 단계 1 |
| 2 | `ProjectScopeResolver.java` 생성 | 토큰 → Map<projectId, ProjectScope> 변환 | 단계 1 |
| 3 | `ReactiveProjectSecurityService.java` 확장 | hasCapability, assertPartScope, assertStoryScope, assertTaskScope 추가 | 단계 2 |
| 4 | `ViewApiController.java` 생성 | 역할별 View API 엔드포인트 3개 (PO/PM/PMO) | 단계 3 |
| 5 | `ViewService.java` 생성 | View Model 3계층 조립 (ScopedQuery → Aggregator → Presenter) | 단계 4 |
| 6 | `PoBacklogView.java` DTO | PO View 응답 모델 | 단계 3 |
| 7 | `PmWorkboardView.java` DTO | PM View 응답 모델 | 단계 3 |
| 8 | `PmoPortfolioView.java` DTO | PMO View 응답 모델 | 단계 3 |
| 9 | `KpiCalculator.java` 생성 | KPI 계산 (coverage 5개 + operational 3개, 이벤트 기반) | 단계 4 |
| 10 | `DataQualityCalculator.java` 생성 | Integrity/Readiness 2층 점수 산출 | 단계 4 |
| 11 | `CapabilityGate.tsx` 생성 | 프론트 권한 분기 컴포넌트 (UX 전용, 보안은 서버) | 단계 5 |
| 12 | `useProjectAuth.ts` 생성 | 토큰에서 capabilities/scope 추출 훅 | 단계 5 |
| 13 | `ProjectShell.tsx` 생성 | 공통 Shell (capability intersection 기반 탭 노출) | 단계 5 |
| 14 | `PoBacklogWorkbench.tsx` 생성 | PO 전용 Workbench (Epic Tree + Backlog Items) | 단계 5 |
| 15 | `PmWorkboardWorkbench.tsx` 생성 | PM 전용 Workbench (Sprint Board + Story Cards) | 단계 5 |
| 16 | `PmoPortfolioWorkbench.tsx` 생성 | PMO 전용 Workbench (KPI + Integrity/Readiness 분리) | 단계 5 |
| 17 | `useViews.ts` 생성 | View API React Query Hook (enabled 조건 포함) | 단계 5 |
| 18 | `ScopeAssertionsTest.java` 생성 | 스코프/권한 통합 테스트 (5개 시나리오) | 단계 6 |
| 19 | `VIEW_CONTRACTS.md` 생성 | View API 필드/KPI/스코프 계약 명세 | 단계 4 |
| 20 | `DATA_QUALITY_RULES.md` 생성 | Warning 타입/임계치/CI 연계 규칙 정의 | 단계 4 |

### Phase 4: FK + CI Gate + 데이터 품질 (산출물 11건)

| # | 파일 | 용도 | 연계 |
|---|---|---|---|
| 1 | `V20260215_01__add_fk_indexes.sql` | FK 대상 컬럼 인덱스 보완 (3개: epic_id, requirement_id, backlog_item_id) | 4-1 |
| 2 | `V20260215_02__add_foreign_keys_not_valid.sql` | FK 제약조건 5개 추가 (NOT VALID) | 4-1 |
| 3 | `V20260216__validate_foreign_keys.sql` | FK 검증 (VALIDATE, FK별 순차 실행) | 4-1 |
| 4 | `V20260217__create_data_quality_snapshots.sql` | `audit.data_quality_snapshots` 테이블 (프로젝트당 하루 1건) | 4-3 |
| 5 | `scripts/ci_data_quality_check.sql` | CI 데이터 품질 게이트 (HARD 9개 + SOFT 2개) | 4-2 |
| 6 | `.github/workflows/data-quality.yml` | CI 파이프라인 설정 (data.sql/schema.sql/migration 변경 시 트리거) | 4-2 |
| 7 | `DataQualityController.java` 생성 | 데이터 품질 API + @PreAuthorize(VIEW_DATA_QUALITY) | 4-3 |
| 8 | `DataQualityService.java` 생성 | 10개 지표 집계 + 3층 점수 계산 + 조회 시 스냅샷 UPSERT | 4-3 |
| 9 | `DataQualityMetric.java` DTO | 지표/카테고리/등급/이력 응답 모델 | 4-3 |
| 10 | `DataQualityDashboard.tsx` 생성 | PMO 대시보드 컴포넌트 (3층 점수 + 추이 차트 + 조치 필요 항목) | 4-3 |
| 11 | `useDataQuality.ts` 생성 | 데이터 품질 React Query Hook | 4-3 |

---

## 검증 VIEW 전체 목록 (Phase 1~2에서 생성, Phase 4 CI에서 활용)

| VIEW | 스키마 | 감지 대상 | 생성 Phase | CI 기준 |
|---|---|---|---|---|
| `v_orphan_part_ref` | task | part_id가 parts에 없는 레코드 (tasks + user_stories) | Phase 1 | HARD FAIL |
| `v_orphan_epic_ref` | task | epic_id가 epics에 없는 스토리 | Phase 1 | HARD FAIL |
| `v_orphan_requirement_ref` | project | requirement_id가 requirements에 없는 backlog_items | Phase 1 | HARD FAIL |
| `v_mismatch_story_feature_part` | task | story.part_id ≠ feature.part_id (파생 규칙 위반) | Phase 1 | HARD FAIL |
| `v_mismatch_story_epic_text` | task | story.epic TEXT ≠ epics.name (표시 불일치) | Phase 1 | HARD FAIL |
| `v_orphan_backlog_item_ref` | task | backlog_item_id가 backlog_items에 없는 스토리 | Phase 2 | HARD FAIL |
| `v_multi_requirement_stories` | task | story당 requirement 2건 이상 (옵션 A 위반) | Phase 2 | HARD FAIL |
| `v_dup_backlog_requirement` | project | backlog 내 requirement 중복 (옵션 A 위반) | Phase 2 | HARD FAIL |

---

## 데이터 품질 점수 체계

### Phase 3 (PMO View 내장, 간이 2층)

```
integrityScore  × 0.6 + readinessScore × 0.4
```

### Phase 4 (전용 대시보드, 정밀 3층)

```
Integrity (참조 무결성) × 0.4   — Part JOIN, Requirement JOIN, Feature-Part 정합, Epic-Story 일치
Readiness (관계 완성도) × 0.35  — Epic 커버리지, Part 커버리지, Backlog 연결률
Traceability (스코프 추적) × 0.25 — 요구사항 입력 완성도, 참조 유효성, 스토리 분해율
```

| 등급 | 점수 | 의미 |
|---|---|---|
| **A** | 90~100 | 거버넌스 우수 |
| **B** | 75~89 | 양호 |
| **C** | 60~74 | 주의 |
| **D** | 40~59 | 위험 (CI WARNING) |
| **F** | 0~39 | 심각 (CI HARD FAIL) |

---

## Phase별 FK 책임 분담

| FK | Phase 0 | Phase 1 | Phase 4 |
|---|---|---|---|
| `tasks.part_id → parts` | **FK 추가** (SET NULL) | - | VALIDATE 재확인 |
| `backlog_items.requirement_id → requirements` | **FK 추가** (SET NULL) | - | VALIDATE 재확인 |
| `user_stories.epic_id → epics` | - | **FK 추가** (RESTRICT) | VALIDATE 재확인 |
| `user_stories.part_id → parts` | - | VIEW로 감시 | **FK 추가** (SET NULL) |
| `user_stories.backlog_item_id → backlog_items` | - | - | **FK 추가** (SET NULL) |

---

## Phase별 CI 검증 스크립트

| Phase | 파일 | 검증 항목 |
|---|---|---|
| Phase 0 | `verify_phase0_all.sql` | 고아 part_id/requirement_id 0건, Part/Requirement JOIN > 0건 |
| Phase 1 | `verify_phase1_all.sql` | Orphan 3개 + Mismatch 2개 = 0건 |
| Phase 2 | `verify_phase2_all.sql` | Orphan backlog_item_ref + Multi requirement + Dup requirement = 0건 |
| Phase 4 | `ci_data_quality_check.sql` | Phase 0~2 전체 통합 (HARD 9개 + SOFT 2개) |

---

## 전체 아키텍처 연계도

```
[data.sql / migration]
    ↓
[Phase 0~2: 데이터 정합성]
    • part_id 수정, requirements 복사 (preq-), FK 2개
    • epic_id FK, part_id 파생, 검증 VIEW 5개
    • backlog_item_id 연결, 상태 표준화, 전이 이벤트
    ↓
[Phase 3: 역할별 화면]
    • JWT: sub + projectRoles[{capabilities, allowedPartIds}]
    • Controller: @PreAuthorize(hasCapability)
    • Service: assertPartScope / assertStoryScope
    • ViewService: ScopedQuery → Aggregator → Presenter
    • View API: /views/po-backlog, /views/pm-workboard, /views/pmo-portfolio
    • UI: ProjectShell → CapabilityGate → Workbench (PO/PM/PMO)
    ↓
[Phase 4: 3중 안전망]
    • DB FK: 5개 제약조건 (INSERT/UPDATE 즉시 차단)
    • CI Gate: HARD FAIL 9개 + SOFT WARNING 2개 (PR 머지 전 차단)
    • DataQuality: 10개 지표 × 3층 점수 (PMO 런타임 감시)
```

---

## 총 산출물 요약

| Phase | Flyway | 검증/CI | 백엔드 | 프론트엔드 | 문서 | 합계 |
|---|---|---|---|---|---|---|
| **0** | 3 | 3 | - | - | - | **7** (+ data.sql 수정) |
| **1** | 5 | 1 | - | - | - | **8** (+ data.sql/schema.sql 수정) |
| **2** | 5 | 1 | - | 3 | 1 | **10** |
| **3** | - | - | 10 | 7 | 2 | **20** (+ 기존 파일 수정) |
| **4** | 4 | 2 | 3 | 2 | - | **11** |
| **합계** | 17 | 7 | 13 | 12 | 3 | **56** |
