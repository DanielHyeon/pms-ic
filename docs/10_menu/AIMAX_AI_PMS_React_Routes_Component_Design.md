# AIMAX AI-PMS React 라우트/컴포넌트 분해 설계서 (Preset/Capability 기반)

본 문서는 Figma Wireframe(2단계)을 **React 코드 구조로 1:1 변환**하기
위한 실행 설계서다.\
핵심 목표는 다음 3가지다.

1)  **라우트/메뉴/버튼 권한이 동일 규칙(Capability)로 동작**\
2)  Role이 늘어도 화면 수가 폭증하지 않도록 **Preset(View Mode)으로
    분기**\
3)  Feature 단위로 분해하여 **독립 개발/테스트/리팩터링이 가능한 구조**

------------------------------------------------------------------------

## 1. 기술 전제

-   React + React Router (v6/v7 계열)
-   TypeScript
-   상태: TanStack Query + (Zustand/Redux/Context 중 택1)
-   DnD: dnd-kit 권장
-   권한: Capability + Scope (앞 문서 준수)

------------------------------------------------------------------------

## 2. 핵심 개념: Preset(View Mode)

### 2.1 ViewMode 정의

Preset은 "역할"이 아니라, **해당 화면에서 어떤 정보/행동을 허용할지
결정하는 모드**다.

  ViewMode            의미               대표 대상
  ------------------- ------------------ ------------------
  EXEC_SUMMARY        요약/결정 중심     Sponsor
  PMO_CONTROL         통제/리포트/승인   PMO
  PM_WORK             계획/조정/관리     PM
  DEV_EXECUTION       실행/흐름/내작업   DEV/DevReader
  CUSTOMER_APPROVAL   승인/반려 전용     Customer PM
  AUDIT_EVIDENCE      증빙 Export 전용   External Auditor

### 2.2 ViewMode 결정 규칙

-   `computeCapabilities(ctx)` 결과를 기반으로
    `deriveViewMode(ctx, caps)`를 산출
-   라우트 진입 시 ViewMode를 Page에 주입
-   Page는 ViewMode에 따라 **Component Variant** 또는 **SubPage**를 선택

------------------------------------------------------------------------

## 3. 라우트 설계 (최종)

### 3.1 Public Routes

-   `/login`
-   `/logout`
-   `/unauthorized`

### 3.2 App Routes

    /dashboard

    /requirements
    /requirements/:reqId
    /trace/requirements/:reqId   (Requirement Trace View)

    /backlog
    /backlog/epics/:epicId

    /wbs
    /phases

    /kanban
    /sprints
    /sprints/:sprintId
    /my-work

    /issues
    /issues/:issueId
    /decisions
    /deliverables
    /deliverables/:deliverableId

    /lineage
    /lineage/:entityType/:entityId

    /reports
    /stats

    /pmo
    /pmo/health

    /audit/evidence              (External Auditor 프리셋 전용)

    /admin/project
    /admin/system

### 3.3 Capability Gate (핵심)

-   라우트 보호는 Role이 아니라 Capability로 한다.
-   메뉴 노출도 동일 Capability를 사용한다.

------------------------------------------------------------------------

## 4. 폴더 구조 (Feature-first 권장)

    src/
      app/
        AppShell.tsx
        routes.tsx
        layout/
          SideNav.tsx
          TopBar.tsx
          PageLayout.tsx
        auth/
          useAccessContext.ts
          useCapabilities.ts
          ProtectedRoute.tsx
          deriveViewMode.ts
      config/
        menuConfig.ts
      types/
        auth.ts
        domain/
          requirement.ts
          backlog.ts
          issue.ts
          deliverable.ts
      features/
        dashboard/
          pages/
            DashboardPage.tsx
          components/
            ProjectHealthCards.tsx
            DecisionSummary.tsx
            PortfolioWidget.tsx
          api/
            dashboardApi.ts
        requirements/
          pages/
            RequirementsPage.tsx
            RequirementDetailPage.tsx
            RequirementTracePage.tsx
          components/
            RequirementTable.tsx
            RequirementFilters.tsx
            RequirementLinkPanel.tsx
          api/
            requirementsApi.ts
        backlog/
          pages/
            BacklogPage.tsx
            EpicDetailPage.tsx
          components/
            EpicTree.tsx
            EpicTreeRow.tsx
            StoryRow.tsx
            BacklogToolbar.tsx
            BacklogContextPanel.tsx
          api/
            backlogApi.ts
        execution/
          kanban/
            pages/
              KanbanPage.tsx
            components/
              KanbanBoard.tsx
              KanbanColumn.tsx
              KanbanCard.tsx
              ReadOnlyBanner.tsx
            dnd/
              useKanbanDnd.ts
          sprints/
            pages/
              SprintsPage.tsx
              SprintDetailPage.tsx
            components/
              SprintPanel.tsx
              SprintBurndown.tsx
          myWork/
            pages/
              MyWorkPage.tsx
            components/
              MyWorkList.tsx
        control/
          issues/
            pages/
              IssuesPage.tsx
              IssueDetailPage.tsx
            components/
              IssueList.tsx
              IssueCard.tsx
              IssueFilters.tsx
              IssueContextPanel.tsx
              IssueApprovalBox.tsx        (Customer PM 전용)
              IssueResolveActions.tsx     (PM/PMO/DevReader)
            api/
              issuesApi.ts
          decisions/
            pages/
              DecisionsPage.tsx
            components/
              DecisionBoard.tsx
          deliverables/
            pages/
              DeliverablesPage.tsx
              DeliverableDetailPage.tsx
            components/
              DeliverableList.tsx
              DeliverableApprovalBox.tsx
            api/
              deliverablesApi.ts
          tests/
            pages/
              TestsPage.tsx
            components/
              TestSuiteTable.tsx
        traceability/
          pages/
            LineagePage.tsx
            EntityLineagePage.tsx
          components/
            LineageGraph.tsx
            ImpactPanel.tsx
            ChangeTimeline.tsx
          api/
            lineageApi.ts
        pmo/
          pages/
            PmoDashboardPage.tsx
            HealthMatrixPage.tsx
          components/
            PortfolioKpis.tsx
            ProjectHealthMatrix.tsx
            DrilldownProjectTable.tsx
          api/
            pmoApi.ts
        audit/
          pages/
            AuditEvidencePage.tsx
          components/
            EvidenceFilterPanel.tsx
            EvidenceSelectionList.tsx
            EvidencePreviewPanel.tsx
            ExportButton.tsx
          api/
            auditApi.ts
        admin/
          pages/
            ProjectAdminPage.tsx
            SystemAdminPage.tsx
          components/
            RoleMatrixEditor.tsx
            UserManagementTable.tsx
      shared/
        components/
          Can.tsx
          EmptyState.tsx
          ConfirmDialog.tsx
          Toast.tsx
        utils/
          format.ts
          ids.ts
        api/
          http.ts
          errors.ts

**의도** - features/는 도메인 단위로 분리 - 공용 컴포넌트는 shared로
이동 - 권한/모드는 app/auth에 집중

------------------------------------------------------------------------

## 5. AppShell/Layout 분해

### 5.1 AppShell.tsx

-   로그인/권한 컨텍스트 로딩
-   SideNav 메뉴 렌더(권한 기반 숨김)
-   TopBar: 프로젝트 선택/검색/알림
-   Outlet: Page 렌더

### 5.2 PageLayout.tsx 규칙

-   모든 Page는 `PageLayout`을 사용
-   상단은 PageHeader (title + filters + primary CTA)
-   본문은 "Main + RightPanel(옵션)" 기본 2열 구조

------------------------------------------------------------------------

## 6. 화면별 구현 패턴 (ViewMode 분기)

### 6.1 KanbanPage.tsx

-   `view_kanban` required
-   `manage_kanban` 없으면:
    -   카드 draggable disabled
    -   onDragEnd early return
    -   ReadOnlyBanner 표시

### 6.2 IssueDetailPage.tsx

ViewMode에 따라 하단 액션 영역이 완전히 달라진다.

-   CUSTOMER_APPROVAL:
    -   IssueApprovalBox(Approve/Reject only)
    -   Resolve/Assign/Triage 숨김
-   PMO_CONTROL / PM_WORK:
    -   IssueResolveActions(Assign/Triage/Resolve)
-   AUDIT_EVIDENCE:
    -   Issue는 상세 보기만 허용(수정/코멘트도 필요시 제한)

### 6.3 LineagePage.tsx

-   탐색 화면(그래프/영향)
-   Auditor는 기본 진입점이 `/audit/evidence`이며, Lineage는 읽기만

### 6.4 AuditEvidencePage.tsx

-   export_audit_evidence required
-   증빙 패키지 빌더 UI
-   Primary CTA = Export

------------------------------------------------------------------------

## 7. 권한 적용 레이어 (3중 방어)

1)  **Menu/Navigation**: 권한 없는 메뉴 숨김
2)  **Route Guard**: requiredCapabilities 미충족 시 차단
3)  **Action Guard**: 버튼/드래그/승인 등 상호작용 차단

> 최종 보안은 백엔드에서 강제한다(필수). 프론트는 UX/오작동 방지 목적.

------------------------------------------------------------------------

## 8. 개발 순서 (PR 단위)

### PR-1 App Shell + Auth Foundation

-   auth.ts / rolePermissions.ts / menuConfig.ts / routes.tsx
-   SideNav 권한 숨김 + ProtectedRoute 적용
-   deriveViewMode 구현

### PR-2 Backlog + Kanban (Execution Core)

-   BacklogPage / EpicTree
-   KanbanPage DnD (manage_kanban 차단 포함)
-   공통 RightPanel 패턴 적용

### PR-3 Control Suite (Issues/Deliverables/Decision)

-   IssuesPage + IssueDetailPage
-   Customer PM 승인 전용 UI
-   Deliverable Approval

### PR-4 Traceability + Audit

-   LineagePage 완성
-   AuditEvidencePage 전용 프리셋

### PR-5 PMO Screens

-   PMO Dashboard + Health Matrix
-   Drill-down (project read-only preset)

------------------------------------------------------------------------

## 9. DoD (React 분해 설계)

-   라우트 트리와 메뉴가 1:1 정합
-   모든 주요 화면은 ViewMode로 분기 가능
-   Kanban Drag 권한 차단이 UI/핸들러/서버호출 3중 방어
-   Customer PM은 Approve/Reject 외 액션이 노출되지 않음
-   Auditor는 AuditEvidencePage에서 Export 중심 UX가 완결됨
-   Feature 폴더 구조로 독립 개발 가능

------------------------------------------------------------------------

## 결론

이 분해 설계는 "역할이 늘어도 UI/코드가 무너지지 않는 구조"를 목표로
한다.\
Figma Wireframe(2단계)와 결합하면, 재설계 없이 React 구현으로 직행
가능하다.
