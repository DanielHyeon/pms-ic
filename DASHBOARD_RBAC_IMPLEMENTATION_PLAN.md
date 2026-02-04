# Dashboard RBAC Implementation Plan

> **Version:** 1.0
> **Date:** 2026-02-04
> **Scope:** 3 dashboards + PartDashboard route + Capability-based permission system
> **Prerequisite:** Dashboard reliability plan (completed), StatisticsPage mock->real migration (completed)

---

## Overview

Implement the finalized RBAC policy for all dashboard views:
- **Dashboard** (`/`) — Universal access, role-scoped content
- **PMO Console** (`/pmo-console`) — pmo_head, pm, admin (+sponsor view-only option)
- **Statistics** (`/statistics`) — sponsor, pmo_head, pm, auditor, admin, **+business_analyst**
- **PartDashboard** (`/parts/:partId/dashboard`) — New route, capability-gated

### Current State

| Item | Status |
|------|--------|
| `rolePermissions.ts` | 9 capabilities, no dashboard-specific ones |
| `menuConfig.ts` / `menuAccessByRole` | BA missing `statistics`; no `part-dashboard` entry |
| `router/index.tsx` | No `/parts/:partId/dashboard` route (404 bug) |
| `ProtectedRoute.tsx` | Supports `requiredRoles` prop but not used on most routes |
| `PartDashboard.tsx` | Component exists, fully implemented, not routed |
| `Dashboard.tsx` | Internal role checks (portfolio/budget/read-only) — correct direction |
| `PmoConsolePage.tsx` | No role-based content filtering internally |
| `StatisticsPage.tsx` | No role-based content filtering internally |

---

## Phase 1: Capability System Extension

**Goal:** Add dashboard-specific capabilities to `rolePermissions.ts` so all components reference a single source of truth.

### Step 1.1 — Add new capability constants and functions

**File:** `src/utils/rolePermissions.ts`

Add the following role arrays and exported functions:

```
// Dashboard-specific capabilities
VIEW_DASHBOARD_ROLES      = [all 8 roles]
VIEW_PMO_CONSOLE_ROLES    = ['pmo_head', 'pm', 'admin']
MANAGE_PMO_CONSOLE_ROLES  = ['pmo_head', 'admin']
VIEW_STATISTICS_ROLES     = ['sponsor', 'pmo_head', 'pm', 'auditor', 'business_analyst', 'admin']
EXPORT_STATISTICS_ROLES   = ['admin', 'pmo_head', 'auditor']
VIEW_PART_DASHBOARD_ROLES = ['admin', 'pmo_head', 'pm', 'business_analyst', 'developer', 'qa']
```

New exported functions:
```typescript
canViewPmoConsole(role)       → VIEW_PMO_CONSOLE_ROLES.includes(role)
canManagePmoConsole(role)     → MANAGE_PMO_CONSOLE_ROLES.includes(role)
canViewStatistics(role)       → VIEW_STATISTICS_ROLES.includes(role)
canExportStatistics(role)     → EXPORT_STATISTICS_ROLES.includes(role)
canViewPartDashboard(role)    → VIEW_PART_DASHBOARD_ROLES.includes(role)
```

### Step 1.2 — Extend `RolePermissions` interface

Add the new booleans to the `RolePermissions` interface and `getRolePermissions()` function:

```typescript
interface RolePermissions {
  // ... existing 9 fields ...
  canViewPmoConsole: boolean;
  canManagePmoConsole: boolean;
  canViewStatistics: boolean;
  canExportStatistics: boolean;
  canViewPartDashboard: boolean;
}
```

### Step 1.3 — Verification

- `npx tsc --noEmit` — no new errors
- Existing consumers of `getRolePermissions()` continue to work (additive change only)

---

## Phase 2: Menu Access Update

**Goal:** Fix `menuAccessByRole` so sidebar visibility matches the RBAC policy.

### Step 2.1 — Add `statistics` to `business_analyst`

**File:** `src/config/menuConfig.ts`

```diff
  business_analyst: [
    'dashboard',
    'rfp',
    'requirements',
    'traceability',
    'phases',
    'backlog',
    'meetings',
    'ai-assistant',
    'education',
    'lineage',
    'reports',
+   'statistics',
    'settings',
  ],
```

### Step 2.2 — (Optional) Add `pmo-console` to `sponsor`

Only if confirmed by policy holder. If applied:

```diff
  sponsor: [
    'dashboard',
    'rfp',
    'requirements',
    'traceability',
    'lineage',
    'phases',
    'reports',
    'statistics',
+   'pmo-console',
    'roles',
    'education',
    'settings',
  ],
```

### Step 2.3 — Verification

- Login as `business_analyst` → sidebar shows "Statistics" menu
- Login as `sponsor` → sidebar shows/hides "PMO Console" per decision
- All other roles unchanged

---

## Phase 3: PartDashboard Route Registration (404 Fix)

**Goal:** Register `/parts/:partId/dashboard` route and make PartDashboard accessible.

### Step 3.1 — Add lazy import and withUserRole wrapper

**File:** `src/router/index.tsx`

```typescript
const PartDashboard = lazy(() => import('../app/components/PartDashboard'));
const PartDashboardWithRole = withUserRole(PartDashboard);
```

### Step 3.2 — Add route definition

Insert after the existing `parts` route:

```typescript
{
  path: 'parts/:partId/dashboard',
  element: (
    <SuspenseWrapper>
      <PartDashboardWithRole />
    </SuspenseWrapper>
  ),
},
```

### Step 3.3 — Update PartDashboard to accept `partId` from URL params

**File:** `src/app/components/PartDashboard.tsx`

Currently PartDashboard manages its own `activePartId` state via a dropdown selector. When accessed via `/parts/:partId/dashboard`, it should:

1. Read `partId` from `useParams()`
2. If `partId` exists in URL, use it as the initial `activePartId` (pre-select in dropdown)
3. If no `partId` in URL (fallback), keep current behavior (first part in list)

```typescript
import { useParams } from 'react-router-dom';

// Inside component:
const { partId: urlPartId } = useParams<{ partId: string }>();
// Use urlPartId as initial value for activePartId state
```

### Step 3.4 — Fix navigation in PartComparisonView

**File:** `src/app/components/statistics/PartComparisonView.tsx`

The current broken navigation:
```typescript
navigate(`/parts/${partId}/dashboard`);
```

This will now work since the route exists. No code change needed here — just verify it navigates correctly after Step 3.2.

### Step 3.5 — Verification

- Navigate to `/parts/some-part-id/dashboard` → PartDashboard loads (not 404)
- Statistics > Parts tab > click row → navigates to PartDashboard
- Direct URL access without auth → redirects to login

---

## Phase 4: Route-Level Access Control

**Goal:** Add role-based route guards so unauthorized URL access returns 403, not content.

### Step 4.1 — Enhance ProtectedRoute usage on dashboard routes

**File:** `src/router/index.tsx`

Currently `ProtectedRoute` wraps the entire Layout but individual routes don't use `requiredRoles`. Add role restrictions to sensitive routes:

```typescript
// PMO Console — restricted
{
  path: 'pmo-console',
  element: (
    <ProtectedRoute requiredRoles={['pmo_head', 'pm', 'admin']}>
      <SuspenseWrapper>
        <PmoConsolePageWithRole />
      </SuspenseWrapper>
    </ProtectedRoute>
  ),
},

// Statistics — restricted
{
  path: 'statistics',
  element: (
    <ProtectedRoute requiredRoles={['sponsor', 'pmo_head', 'pm', 'auditor', 'business_analyst', 'admin']}>
      <SuspenseWrapper>
        <StatisticsPageWithRole />
      </SuspenseWrapper>
    </ProtectedRoute>
  ),
},

// PartDashboard — restricted
{
  path: 'parts/:partId/dashboard',
  element: (
    <ProtectedRoute requiredRoles={['admin', 'pmo_head', 'pm', 'business_analyst', 'developer', 'qa']}>
      <SuspenseWrapper>
        <PartDashboardWithRole />
      </SuspenseWrapper>
    </ProtectedRoute>
  ),
},
```

### Step 4.2 — Improve ProtectedRoute 403 behavior

**File:** `src/router/ProtectedRoute.tsx`

Currently, unauthorized role access silently redirects to `/`. Change to show a 403 message:

```typescript
if (requiredRoles && user?.role && !requiredRoles.includes(user.role)) {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="text-center">
        <div className="text-6xl text-gray-300 mb-4">403</div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">
          Access Denied
        </h2>
        <p className="text-gray-500 mb-4">
          You do not have permission to access this page.
        </p>
        <button onClick={() => navigate('/')} className="...">
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
```

### Step 4.3 — Verification

- Login as `developer` → navigate to `/pmo-console` → 403 page shown
- Login as `developer` → navigate to `/statistics` → 403 page shown
- Login as `business_analyst` → navigate to `/statistics` → page loads
- Login as `auditor` → navigate to `/parts/x/dashboard` → 403 page shown (auditor excluded)

---

## Phase 5: Dashboard Internal Role-Based Content Filtering

**Goal:** Each dashboard shows/hides sections and controls based on role capabilities.

### Step 5.1 — Dashboard.tsx (already partially done)

**File:** `src/app/components/Dashboard.tsx`

Current internal checks are correct. Standardize to use `rolePermissions.ts` functions:

| Section | Capability | Roles |
|---------|-----------|-------|
| Portfolio Overview | `canViewPortfolio(role)` | pmo_head, admin |
| Budget Cards | `canViewBudget(role)` | sponsor, pmo_head, pm, admin |
| Read-only Banner | `isReadOnly(role)` | auditor, business_analyst |
| Edit/Action Buttons | `canEdit(role)` | all except auditor, business_analyst |

Replace any inline role checks like `role === 'pmo_head' || role === 'admin'` with the centralized functions.

### Step 5.2 — PmoConsolePage.tsx — Add read-only mode

**File:** `src/app/components/PmoConsolePage.tsx`

Add role-based content filtering:

```typescript
import { canManagePmoConsole, isReadOnly } from '../../utils/rolePermissions';

// Inside component:
const canManage = canManagePmoConsole(userRole);
const readOnly = isReadOnly(userRole);

// Hide action buttons (assign, adjust, reassign) when !canManage
// Show read-only banner when readOnly
// PM can view but cannot use organization-level controls (canManage=false for pm)
```

Specific widget controls:
- **Status change dropdowns** — only if `canManage`
- **Assignment buttons** — only if `canManage`
- **Refresh/filter** — always visible (read operation)
- **Export** — controlled by `canExportStatistics(role)`

### Step 5.3 — StatisticsPage.tsx — Add read-only mode + export control

**File:** `src/app/components/StatisticsPage.tsx`

```typescript
import { isReadOnly, canExportStatistics } from '../../utils/rolePermissions';

// Read-only banner for auditor/business_analyst
// Export button visibility controlled by canExportStatistics(role)
// No edit controls in statistics (already view-only), but ensure
// drill-down navigation respects read-only state
```

### Step 5.4 — PartDashboard.tsx — Role-based section visibility

**File:** `src/app/components/PartDashboard.tsx`

Apply the PartDashboard View Matrix:

```typescript
import { isReadOnly, canViewPortfolio } from '../../utils/rolePermissions';

// Section visibility by role:
const showExecution = true;  // All roles with access
const showQuality = !['developer'].includes(userRole);  // Hide detailed quality from dev (show summary)
const showRiskBlockers = true;  // All roles
const showPeopleOwnership = ['admin', 'pmo_head', 'pm'].includes(userRole);  // Sensitive section
const showCompare = canViewPortfolio(userRole) || ['pm', 'business_analyst'].includes(userRole);
const readOnly = isReadOnly(userRole);

// Read-only banner for auditor/business_analyst/sponsor
// Hide mutation controls for read-only roles
```

### Step 5.5 — Verification

- Login as each of the 8 roles, visit each accessible dashboard
- Confirm sections show/hide according to the RBAC matrix
- Confirm read-only banner appears for auditor/business_analyst
- Confirm action buttons hidden for read-only roles

---

## Phase 6: Build & Integration Testing

### Step 6.1 — TypeScript compilation

```bash
npx tsc --noEmit
```

Fix any type errors introduced by the changes.

### Step 6.2 — Vite build

```bash
npx vite build
```

Ensure production build succeeds.

### Step 6.3 — Manual test matrix

| Role | `/` | `/pmo-console` | `/statistics` | `/parts/:id/dashboard` | Expected Behavior |
|------|-----|----------------|---------------|------------------------|-------------------|
| admin | Full | Full + manage | Full + export | Full | All features |
| pmo_head | Full + portfolio | Full + manage | Full + export | Full | All features |
| pm | Standard | View-only (no org controls) | Full | Scoped to project parts | No portfolio, no org manage |
| sponsor | Standard + budget | 403 (or view-only if opted) | View + export | 403 (or view-only if opted) | Read-only where accessible |
| developer | Standard | 403 | 403 | Execution-focused | No quality detail, no people |
| qa | Standard | 403 | 403 | Quality-focused | No people section |
| business_analyst | Standard (read-only) | 403 | View (read-only) | View (read-only) | Read-only banner everywhere |
| auditor | Standard (read-only) | 403 | View (read-only) | 403 | Strictest read-only |

### Step 6.4 — Docker integration test

```bash
docker compose build --no-cache frontend
docker compose up -d
```

Login with each role account and verify dashboard access through the full stack.

---

## Phase 7: (Future) Server-Side Enforcement

> **Note:** This phase is documented for completeness but is NOT part of the current frontend implementation scope.

Frontend guards are necessary for UX but insufficient for security. Server-side enforcement should be added:

### Step 7.1 — API-level role checks

Backend endpoints should verify:
- Dashboard aggregate API: user has project access
- Part dashboard API: `partId` is in user's `allowed_part_ids`
- PMO console mutation APIs: user has `MANAGE_PMO_CONSOLE` capability
- Statistics export API: user has `EXPORT_STATISTICS` capability

### Step 7.2 — Data scope enforcement

```java
@PreAuthorize("@projectSecurity.hasRole(#projectId, 'PM')")
```

Extend to part-level scoping:
```java
@PreAuthorize("@partSecurity.canAccess(#partId)")
```

---

## File Change Summary

| File | Change Type | Phase |
|------|------------|-------|
| `src/utils/rolePermissions.ts` | **Modify** — Add 5 new capabilities | Phase 1 |
| `src/config/menuConfig.ts` | **Modify** — Add `statistics` to BA | Phase 2 |
| `src/router/index.tsx` | **Modify** — Add PartDashboard route + ProtectedRoute wrappers | Phase 3, 4 |
| `src/router/ProtectedRoute.tsx` | **Modify** — 403 UI instead of silent redirect | Phase 4 |
| `src/app/components/PartDashboard.tsx` | **Modify** — URL param support + role-based sections | Phase 3, 5 |
| `src/app/components/Dashboard.tsx` | **Modify** — Standardize to use rolePermissions functions | Phase 5 |
| `src/app/components/PmoConsolePage.tsx` | **Modify** — Add read-only mode + manage checks | Phase 5 |
| `src/app/components/StatisticsPage.tsx` | **Modify** — Add read-only banner + export control | Phase 5 |

**Total files changed:** 8
**New files:** 0

---

## Decision Log

| ID | Decision | Rationale |
|----|----------|-----------|
| D1 | BA gets `/statistics` access | BA analyzes phase/task data for requirements scoping |
| D2 | Sponsor `/pmo-console` = pending confirmation | View-only mode needed first; default to 403 |
| D3 | Sponsor `/parts/:id/dashboard` = pending confirmation | Same as D2 |
| D4 | Auditor excluded from PartDashboard | Auditor role focuses on audit-logs/reports, not operational part metrics |
| D5 | 403 page instead of silent redirect | Better UX + audit trail vs. confusing redirect |
| D6 | `developer`/`qa` get PartDashboard | They need part-level execution/quality visibility for their work |
| D7 | People/Ownership section restricted | Sensitive data (workload per person) — admin/pmo_head/pm only |
