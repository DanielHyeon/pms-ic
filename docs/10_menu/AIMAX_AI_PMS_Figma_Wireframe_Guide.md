# AIMAX AI‑PMS Figma Wireframe 설계서 (Role Preset 기반)

본 문서는 **AIMAX AI‑PMS 화면 구조를 Figma에서 바로 설계할 수 있도록
정의한 Wireframe 기준 문서**이다.\
모든 화면은 Role이 아닌 **Preset(View Mode)** 개념으로 렌더링되며, 동일
화면이라도 보이는 정보와 CTA가 다르다.

------------------------------------------------------------------------

## 1. 설계 원칙

### 1.1 Preset 기반 렌더링

-   화면은 하나, Preset이 다름
-   Preset = Capability + Scope 조합 결과

### 1.2 정보 밀도 규칙

-   Sponsor / Auditor: 요약 중심
-   PMO / PM: 통제 중심
-   DEV: 실행 중심

### 1.3 Primary CTA는 화면당 1개

-   승인 / 이동 / Export 중 하나만 강조

------------------------------------------------------------------------

## 2. Preset 정의

  Preset              대상
  ------------------- ------------------
  EXEC_SUMMARY        Sponsor
  PMO_CONTROL         PMO
  PM_WORK             PM
  DEV_EXECUTION       DEV / DevReader
  CUSTOMER_APPROVAL   Customer PM
  AUDIT_EVIDENCE      External Auditor

------------------------------------------------------------------------

## 3. 핵심 화면별 Wireframe

------------------------------------------------------------------------

### 3.1 Dashboard

#### Sponsor (EXEC_SUMMARY)

    [ Project Health ]
     ├ Progress % | Risk Count | Budget Burn
     ├ Phase Status Timeline
     └ Key Decisions (Approved / Pending)

    [ View Report ] (Primary CTA)

#### PMO (PMO_CONTROL)

    [ Portfolio Health Table ]
    [ Phase / WBS Deviation ]
    [ Pending Approvals ]
    [ Export Report ]

------------------------------------------------------------------------

### 3.2 Backlog (Epic View)

#### PM / DevReader

    [ Epic Tree ]
     ├ Epic A (SP / Progress)
     │  ├ Story 1
     │  └ Story 2
     └ Epic B

    [ + Add Story ] (Primary CTA)

#### DEV

    [ Epic Tree (Read Only) ]
    (No CTA)

------------------------------------------------------------------------

### 3.3 Kanban Board

#### DEV / DevReader

    [ TODO | IN_PROGRESS | REVIEW | DONE ]

    (Card Drag Enabled)

#### Read‑Only (Sponsor / Customer PM)

    [ TODO | IN_PROGRESS | REVIEW | DONE ]

    (Read‑only Banner)

------------------------------------------------------------------------

### 3.4 Issue & Decision

#### DEV

    [ Issue List ]
    [ + Create Issue ]

#### PM / PMO

    [ Issue List ]
    [ Assign | Triage | Resolve ]

#### Customer PM (CUSTOMER_APPROVAL)

    [ Issue Detail ]
    [ Change Summary ]

    [ Approve ]   [ Reject ]  (Primary CTA)

------------------------------------------------------------------------

### 3.5 Deliverables

#### PM / DEV

    [ Deliverable List ]
    [ Upload ]

#### Customer PM

    [ Deliverable Detail ]
    [ Approve / Reject ]

------------------------------------------------------------------------

### 3.6 Audit Evidence Export (AUDIT_EVIDENCE)

    [ Filter Panel ]
     ├ Date Range
     ├ Entity Type
     ├ Include History / Graph / Files

    [ Evidence List ]

    [ Export Evidence Pack ] (Primary CTA)

------------------------------------------------------------------------

## 4. Figma 컴포넌트 분해 가이드

### 4.1 공통 Components

-   PageHeader
-   SummaryCard
-   DataTable
-   TreeView
-   ApprovalBox
-   ExportPanel

### 4.2 Variant 사용

-   Button: Primary / Secondary / Disabled
-   Banner: Info / Warning / ReadOnly
-   Card: Draggable / Static

------------------------------------------------------------------------

## 5. Figma Frame 구조 권장

    📁 AIMAX_PMS
     ├ Dashboard
     ├ Backlog
     ├ Kanban
     ├ Issue
     ├ Deliverable
     ├ Audit

각 Frame 내부에서 **Preset Variant**로 분기

------------------------------------------------------------------------

## 6. DoD (Wireframe)

-   모든 화면에 Primary CTA 1개 명확히 표시
-   Preset 간 정보 밀도 차이 명확
-   DEV 화면에 승인/Export 없음
-   Auditor 화면에 수정/등록 없음

------------------------------------------------------------------------

## 결론

이 Wireframe 기준을 따르면: - 화면 수 증가 없이 Role 확장 가능 - Figma →
React 변환 시 재설계 없음 - PMO/감사 요구를 UI 레벨에서 자연스럽게 흡수
