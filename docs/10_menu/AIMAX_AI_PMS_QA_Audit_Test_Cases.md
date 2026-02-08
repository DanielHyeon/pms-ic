# AIMAX AI-PMS QA/감사 시나리오 테스트 케이스 (Role × Screen × Action)

본 문서는 AIMAX AI-PMS의 권한/화면/데이터 일관성을 검증하기 위한 **E2E
테스트 시나리오**와 **감사(증빙) 관점 테스트 케이스**를 정의한다.

목표: - Role이 늘어나도 화면/버튼/데이터 범위가 흔들리지 않음을 증명 -
Kanban drag, 고객 승인, 감사 Export 같은 핵심 위험 지점을 재발 불가
수준으로 고정 - 배포 전/후 회귀 테스트를 자동화 가능한 형태로 제공

------------------------------------------------------------------------

## 1. 테스트 전제

### 1.1 공통 용어

-   Screen: 라우트(페이지) 단위 기능
-   Action: 사용자 상호작용(버튼/드래그/승인/Export)
-   Capability: 화면/행동 권한
-   Scope: 데이터 범위(ORG/PROJECT/PART/SELF)

### 1.2 테스트 데이터 세팅(고정 Fixture 권장)

프로젝트 `P-001`에 다음 데이터를 준비한다.

-   Epics: 3개 (`E-1`, `E-2`, `E-3`)
-   Stories: 12개 (각 Epic에 4개)
    -   상태 분포: READY 3, IN_PROGRESS 3, REVIEW 2, TEST 2, DONE 2
-   Sprints: 1개(`S-1`, ACTIVE)
-   Issues: 6개
    -   2개는 `READY_FOR_APPROVAL`
-   Deliverables: 4개
    -   2개는 `PENDING_APPROVAL`
-   Requirement: 5개(RFP 분류 포함), Story와 Trace Link 1:N 연결
-   Lineage 링크: Requirement→Epic→Story→Issue→Deliverable 관계 생성

> 중요: Epic/Story 조인은 반드시 ID 기반(`epicId`)이며 name 기반 조인을
> 금지한다.

### 1.3 테스트 계정(최소 8개)

-   Sponsor (orgRole=SPONSOR)
-   PMO (orgRole=PMO)
-   PM (projectRole=PM)
-   DevReader (projectRole=DEV_READER, scope=PART_WIDE, partId=part-A)
-   DEV-Developer (projectRole=DEV, discipline=DEVELOPER,
    scope=PART_WIDE, part-A)
-   DEV-QA (projectRole=DEV, discipline=QA, scope=PART_WIDE, part-A)
-   CustomerPM (projectRole=CUSTOMER_PM)
-   ExternalAuditor (orgRole=EXTERNAL_AUDITOR)
-   SystemOperator (orgRole=SYSTEM_OPERATOR)

------------------------------------------------------------------------

## 2. Smoke Test (배포 전 필수 10개)

### ST-01 메뉴 노출: 권한 없는 메뉴는 "숨김"

-   Given: DEV로 로그인
-   When: SideNav 렌더
-   Then: PMO 메뉴(/pmo), Admin 메뉴(/admin/\*), Audit(/audit/evidence)
    미노출
-   And: Kanban/MyWork/Issues는 노출

### ST-02 라우트 가드: 직접 URL 접근 차단

-   Given: DEV로 로그인
-   When: `/admin/system` 직접 접근
-   Then: `/dashboard` 또는 `/unauthorized`로 리다이렉트

### ST-03 Backlog ID 정합성

-   Given: PM로 로그인
-   When: `/backlog`에서 Epic 확장
-   Then: Epic 하위 스토리 SP/카운트가 0/0이 아니어야 함
-   And: 목록 보기/계층 보기/통계 카드 총합이 동일

### ST-04 Kanban Drag 차단(읽기 전용)

-   Given: Sponsor로 로그인
-   When: `/kanban`에서 카드 드래그 시도
-   Then: 드래그가 시작되지 않아야 함
-   And: 서버 상태 변경 요청이 발생하지 않아야 함
-   And: "읽기 전용" 배너 표시

### ST-05 Kanban Drag 허용(DEV)

-   Given: DEV로 로그인
-   When: 카드 `IN_PROGRESS` → `REVIEW`로 이동
-   Then: UI가 즉시 반영되고, 서버 업데이트 호출이 1회 발생
-   And: 새로고침 후 상태 유지

### ST-06 Issue 승인 UI(CustomerPM)

-   Given: CustomerPM 로그인
-   When: `/issues/:issueId` (READY_FOR_APPROVAL) 진입
-   Then: Approve/Reject만 노출, Resolve/Assign/Triage 버튼 미노출

### ST-07 Issue Resolve UI(PM)

-   Given: PM 로그인
-   When: 동일 이슈 진입
-   Then: Assign/Triage/Resolve 노출
-   And: Approve/Reject는 정책에 따라 숨김 또는 보조 버튼

### ST-08 Audit Evidence Export 전용 화면

-   Given: ExternalAuditor 로그인
-   When: `/audit/evidence` 진입
-   Then: Export CTA만 primary로 존재
-   And: 이슈 생성/수정/업로드 기능이 없어야 함

### ST-09 Deliverable 승인 흐름

-   Given: CustomerPM 로그인
-   When: `/deliverables/:id` (PENDING_APPROVAL)
-   Then: Approve/Reject 노출
-   And: 업로드/수정 버튼 미노출

### ST-10 Lineage 탐색 + Evidence 연계

-   Given: PMO 로그인
-   When: `/lineage/REQUIREMENT/:id` 진입 후 Export evidence 진입
-   Then: Evidence Pack 화면으로 이동 가능한 링크/버튼 존재

------------------------------------------------------------------------

## 3. Role × Screen × Action 회귀 테스트 매트릭스

### 3.1 Kanban (핵심 위험: 무단 상태 변경)

  Role           view_kanban   manage_kanban   Drag 가능   서버 업데이트
  ------------ ------------- --------------- ----------- ---------------
  Sponsor                 ✅              ❌          ❌              ❌
  PMO                     ✅        ❌(기본)          ❌              ❌
  PM                      ✅        ❌(기본)          ❌              ❌
  DevReader               ✅              ✅          ✅              ✅
  DEV                     ✅              ✅          ✅              ✅
  CustomerPM        ✅(옵션)              ❌          ❌              ❌
  Auditor           ✅(옵션)              ❌          ❌              ❌

**테스트 케이스** - KAN-01: 권한 없는 계정에서 DragStart 미발생 -
KAN-02: onDragEnd early return 확인(네트워크 로그) - KAN-03: 컬럼 이동
후 DB 반영 확인(재조회) - KAN-04: PART_WIDE scope에서 타 파트 카드가
드래그/업데이트되지 않음

### 3.2 Issue (핵심 위험: 승인/해결 권한 혼선)

권장 Capability 분해: - issue_create, issue_comment, issue_assign,
issue_triage, issue_resolve, issue_approve, issue_reject, issue_export

**테스트 케이스** - ISS-01: DEV는 create/comment 가능,
triage/resolve/approve/reject 불가 - ISS-02: CustomerPM은
approve/reject만 가능(READY_FOR_APPROVAL에서만) - ISS-03: PM/PMO는
triage/resolve 가능 - ISS-04: Auditor는 issue_export만 가능(화면 내 수정
CTA 없음)

### 3.3 Deliverables (핵심 위험: 승인 로그 누락)

**테스트 케이스** - DEL-01: 업로드 후 상태가 REVIEW로 전환 - DEL-02: PMO
1차 승인 시 승인자/시간 기록 - DEL-03: CustomerPM 최종 승인 시 Locked
처리 - DEL-04: 승인 로그는 Evidence Pack에 포함됨

------------------------------------------------------------------------

## 4. 감사(Evidence Pack) 전용 테스트

### 4.1 Evidence Pack 구성 검증

-   AUD-01: 기간 필터 적용 시 결과 목록이 해당 기간 변경분만 포함
-   AUD-02: Include History 옵션 ON 시 변경 이력 섹션 존재
-   AUD-03: Include Graph 옵션 ON 시 그래프 스냅샷(이미지 또는 JSON)
    포함
-   AUD-04: Include Files 옵션 ON 시 산출물 첨부가 포함되며 접근 제어
    준수

### 4.2 증빙 무결성(선택 권장)

-   AUD-05: Evidence Pack 생성 시 해시(sha256) 생성 및 패키지
    메타데이터에 기록
-   AUD-06: 동일 조건 재생성 시 동일 해시 또는 명확한 차이(변경분)에
    대한 설명 로그

### 4.3 권한 경계 테스트

-   AUD-07: Auditor는 Export 외 어떤 mutate API도 호출되지 않음
-   AUD-08: Export는 허용되지만, Admin/PMO 전용 리포트(민감정보 포함)는
    제외됨

------------------------------------------------------------------------

## 5. End-to-End 시나리오 (현업 흐름)

### E2E-01 RFP → Story → Kanban → Issue → Deliverable → Approval → Evidence

1)  PM이 Requirement 생성/등록(또는 Import)
2)  PM이 Requirement를 Epic/Story에 링크
3)  DEV가 Kanban에서 Story 진행(상태 이동)
4)  DEV가 Issue 생성(블로커)
5)  DevReader/PM이 Issue triage/assign
6)  해결 후 READY_FOR_APPROVAL로 전환
7)  CustomerPM이 Approve
8)  Deliverable 업로드
9)  PMO 1차 승인 → CustomerPM 최종 승인
10) Auditor가 Evidence Pack Export

**검증 포인트** - 각 단계에서 권한 없는 행동이 UI/라우트/서버에서
차단됨 - 모든 변경이 Lineage에 남음 - Evidence Pack에 링크/로그/승인
정보가 누락 없이 포함됨

------------------------------------------------------------------------

## 6. 자동화 권장(Playwright/Cypress)

### 6.1 공통 패턴

-   로그인 토큰/쿠키 주입
-   role별 네비게이션 스냅샷 테스트
-   네트워크 요청 감시(특히 mutate 요청이 발생하지 않아야 하는 케이스)

### 6.2 예시 체크(설계 수준)

-   "Sponsor로 Kanban 드래그 시 네트워크 PUT/PATCH 0회"
-   "CustomerPM 이슈 상세에서 Resolve 버튼 DOM에 존재하지 않음"
-   "Auditor 화면에서 Create/Upload 버튼이 DOM에 존재하지 않음"

------------------------------------------------------------------------

## 7. DoD (테스트)

-   Smoke Test 10개 100% 통과
-   Role×Screen 매트릭스 핵심 시나리오(Kanban/Issue/Deliverable/Audit)
    자동화 완료
-   감사 패키지 Export 결과물에 승인/변경/관계 정보 누락 없음
-   회귀 테스트로 Epic/Story ID 혼선 재발 방지(0/0 SP 금지)

------------------------------------------------------------------------

## 부록: 최소 체크리스트(수동 15분 버전)

1)  DEV 로그인 → Kanban 드래그 가능
2)  Sponsor 로그인 → Kanban 드래그 불가 + 배너
3)  PM 로그인 → Backlog에서 Epic 하위 SP 표시
4)  CustomerPM 로그인 → 승인 이슈에서 Approve/Reject만 보임
5)  Auditor 로그인 → /audit/evidence에서 Export만 가능
