# P1: Data Query Implementation & Graceful Degradation

**Priority**: High (Significant UX improvement)
**Timeline**: 1-2 days
**Goal**: Make AI Assistant useful even with empty/incomplete data

---

## 0. Completion Definition (MUST satisfy all 4)

P1 is **truly complete** when all of these are simultaneously satisfied:

| # | Criterion | Verification |
|---|-----------|--------------|
| 1 | **Real Query Execution** | All placeholders removed; every intent handler reads from actual DB |
| 2 | **Failure/Empty Separation** | DB failure (timeout/connection/syntax) → "Unable to load" path; Result 0 rows/missing fields → "No data / Incomplete data" path |
| 3 | **Judgment Data Branching** | Tasks "none this week" vs "due_date mostly null" clearly distinguished by `TASK_COUNTS_QUERY` |
| 4 | **KST Week Range Accuracy** | Monday 00:00 KST ~ next Monday 00:00 KST (exclusive), consistent across all environments |

When these 4 are met, users can immediately take action even with no data.

---

## 1. Problem Statement

After P0 (intent routing), we have different handlers for each intent. However:

1. **Handlers query placeholder data** - Need real SQL queries per intent
2. **"No data" message is useless** - Users don't know what to do next
3. **No contextual tips** - Different intents need different guidance

**Before** (P0 only):
```
User: "What's in the backlog?"
AI: Product Backlog
    No backlog items found.
```

**After** (P1):
```
User: "What's in the backlog?"
AI: Product Backlog (as of: 2026-02-03 14:30 KST)
    Project: AI Insurance Claims

    Currently no backlog items registered.

    Next Steps:
    - Click 'Add Story' in Backlog Management menu
    - Start with user stories like "As a [user], I want [feature]..."
    - Set priority (Critical/High/Medium/Low) for ordering
    - Optionally add story points for estimation

    Quick Start Template:
    "As a claims adjuster, I want to auto-classify documents so that..."

    _Data source: PostgreSQL real-time query_
```

---

## 2. Architecture Evaluation

### 2.1 Strengths (Preserve)

| Design Element | Benefit |
|----------------|---------|
| `intent -> handler -> renderer` layer separation | Easy to extend/test |
| Centralized degradation tips (`degradation_tips.py`) | Consistency |
| "Next action" guidance (menu path/template) | High UX impact |
| Query templates in separate file | DB tuning, caching, migration friendly |

### 2.2 Risk Areas (Must Address)

| Risk | Impact | Mitigation |
|------|--------|------------|
| Schema/column mismatch (e.g., `mitigation` field) | Runtime errors or wrong branching | Check field existence before access |
| Status/priority enum inconsistency | Wrong filters, missing data | Centralize enum definitions |
| Timezone issues in date_trunc | KST users see wrong week boundaries | App-side week calculation |
| Missing judgment data for degradation | Cannot distinguish "no data" vs "no due_date" | Handler must populate counts |
| ResponseContract field inconsistency | Renderer crashes or shows wrong info | Enforce contract spec |
| DB failure masked as "no data" | Operations blind to outages | Separate error handling path |
| Scope enforcement on joins | Data leakage across projects | Always filter by project_id |

---

## 3. Known Issues & Solutions (8 Critical Points)

### (A) Week Boundary Type Safety

**Problem**: Passing `week_start`/`week_end` as strings can cause implicit casting/timezone issues when `due_date` is timestamp.

**Solution**: `calculate_kst_week_boundaries()` returns `date` objects, not strings. DB driver handles type binding correctly.

```python
# Good: date object binding
{"week_start": date(2026, 2, 3), "week_end": date(2026, 2, 10)}

# Bad: string that may be misinterpreted
{"week_start": "2026-02-03", "week_end": "2026-02-10"}
```

### (B) Timezone Library Choice

**Problem**: `pytz` adds dependency complexity.

**Solution**: Use Python 3.9+ `zoneinfo` (stdlib). For P1, `pytz` is acceptable but `zoneinfo` is preferred.

```python
from zoneinfo import ZoneInfo
KST = ZoneInfo("Asia/Seoul")
```

### (C) Enum Mismatch → "Always 0 Rows"

**Problem**: Query uses `status NOT IN ('DONE')` but actual data uses `COMPLETED` → silent data loss.

**Solution**: Conservative filters for P1:
- Backlog: `sprint_id IS NULL` is the primary filter
- Status exclusion: Minimal set only (`DONE`, `CANCELLED`, `ARCHIVED`)
- Renderer handles unknown status gracefully

### (D) DB Failure Masked as Empty Data

**Problem**: `except: return {"data": [], "success": True}` makes outages invisible.

**Solution**: Executor failure → `success=False`, `provenance="Unavailable"`, `errors` populated.

```python
# WRONG
except Exception:
    return ResponseContract(success=True, data={"items": []})  # Hides failure!

# CORRECT
except Exception as e:
    return ResponseContract(
        success=False,
        data={"items": []},
        errors=[{"code": "DB_EXCEPTION", "message": str(e)}],
        provenance="Unavailable"
    )
```

### (E) Error Field Structure

**Problem**: `errors: List[Dict[str,str]]` has no schema → hard to track in operations.

**Solution**: Standardize error structure:

```python
{"code": "DB_QUERY_FAILED", "message": "Backlog query failed", "detail": "timeout after 30s"}
```

Required fields: `code`, `message`. Optional: `detail`.

### (F) Duplicate Formatting Functions

**Problem**: `format_degradation_response()` duplicates renderer logic.

**Solution**: **Remove for P1** or defer to P2. Handler selects plan, renderer formats output. Single responsibility.

### (G) Risk Keyword LIKE Performance

**Problem**: `LOWER(description) LIKE '%risk%'` has performance/false-positive issues.

**Solution**: Trust `type='RISK'` first. Keyword fallback only when `type IS NULL`. Minimize LIKE scope.

### (H) Schema Mismatch Runtime Prevention

**Problem**: Full `information_schema` validation exceeds P1 scope.

**Solution**: P1 catches failures and reports them accurately. P2 adds schema validation tests.

---

## 4. PR Structure (3 PRs for Safe Rollback)

### PR-1: Contract + Renderer Defense + Failure Separation (FIRST)

| File | Change |
|------|--------|
| `response_contract.py` | Formalize ResponseContract, add ResponseError |
| `response_renderer.py` | `if not success: render_query_failure` BEFORE intent routing |
| `degradation_tips.py` | Add `DEG_DB_UNAVAILABLE` plan |

**Merge Criterion**: Renderer never crashes on `success=False`.

### PR-2: Query Templates + Handlers + Judgment Data

| File | Change |
|------|--------|
| `query_templates.py` | All SQL templates, `calculate_kst_week_boundaries()` |
| `intent_handlers.py` | Real queries, proper error handling, judgment data |

**Merge Criterion**: All handlers execute real queries, degradation plans selected correctly.

### PR-3: Index Migration + Overdue Section + Polish

| File | Change |
|------|--------|
| Migration script | Recommended indexes |
| `response_renderer.py` | Overdue tasks section, status translation |

**Merge Criterion**: Performance acceptable, output visually correct.

---

## 5. Files to Modify

| File | Change Type | Description |
|------|-------------|-------------|
| `intent_handlers.py` | **MODIFY** | Add real SQL queries, error handling, judgment data |
| `response_renderer.py` | **MODIFY** | Add intent-specific degradation, provenance fallback, overdue section |
| `degradation_tips.py` | **NEW** | Centralized tips/guidance per intent + DB failure plans |
| `query_templates.py` | **NEW** | SQL templates with defensive NULL handling |
| `response_contract.py` | **NEW/MODIFY** | Formalize ResponseContract fields |

---

## 6. ResponseContract Specification (Critical)

All handlers MUST return a ResponseContract with these fields:

```python
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

@dataclass
class ResponseError:
    """Structured error for tracking and debugging"""
    code: str           # e.g., "DB_QUERY_FAILED", "DB_EXCEPTION"
    message: str        # Human-readable message
    detail: Optional[str] = None  # Additional context (optional)

    def to_dict(self) -> Dict[str, str]:
        result = {"code": self.code, "message": self.message}
        if self.detail:
            result["detail"] = self.detail
        return result


@dataclass
class ResponseContract:
    """Standard contract between handler and renderer"""

    # Required fields
    intent: str                           # Intent type (BACKLOG_LIST, SPRINT_PROGRESS, etc.)
    reference_time: str                   # KST formatted string "2026-02-03 14:30 KST"
    scope: Dict[str, Any]                 # Structured scope info
    data: Dict[str, Any]                  # Query result data

    # Status/messaging fields
    success: bool = True                  # False if DB query failed
    warnings: List[str] = field(default_factory=list)   # Warning messages
    tips: List[str] = field(default_factory=list)       # Actionable tips
    errors: List[Dict[str, str]] = field(default_factory=list)  # Structured errors

    # Metadata
    provenance: str = "PostgreSQL"        # Data source: "PostgreSQL", "Neo4j", "Mixed", "Unavailable"

    # Scope structure example:
    # {
    #     "project_id": "uuid",
    #     "project_name": "AI Insurance Claims",
    #     "sprint_id": "uuid" (optional),
    #     "sprint_name": "Sprint 5" (optional),
    #     "period": {"start": "2026-02-03", "end": "2026-02-09"} (optional, ISO format strings)
    # }
```

### Renderer Defense Code (CRITICAL)

```python
def render(contract: ResponseContract) -> str:
    """Render with defensive fallbacks"""

    # Provenance fallback
    provenance = contract.provenance or "PostgreSQL"

    # CRITICAL: If query failed, show system error BEFORE any intent routing
    if not contract.success:
        return render_query_failure(contract, provenance)

    # Route to intent-specific renderer
    renderers = {
        "BACKLOG_LIST": render_backlog_list,
        "SPRINT_PROGRESS": render_sprint_progress,
        "TASK_DUE_THIS_WEEK": render_tasks_due,
        "RISK_ANALYSIS": render_risk_analysis,
    }

    renderer = renderers.get(contract.intent.upper(), render_generic)
    return renderer(contract, provenance)
```

---

## 7. Implementation Details

### 7.1 query_templates.py (NEW FILE)

**Location**: `/llm-service/query_templates.py`

```python
"""
SQL Query Templates for Intent Handlers.

Design Principles:
1. Always filter by project_id (scope enforcement)
2. Use COALESCE/NULLIF for NULL safety
3. Use parameterized week_start/week_end (no date_trunc timezone issues)
4. Include judgment data (counts) for degradation decisions
5. Week boundaries return date objects, not strings
"""

from __future__ import annotations
from typing import Dict, Any
from datetime import datetime, timedelta, date

# Use zoneinfo (Python 3.9+ stdlib) - no external dependency
try:
    from zoneinfo import ZoneInfo
except ImportError:
    # Fallback for Python < 3.9
    import pytz
    class ZoneInfo:
        def __init__(self, tz):
            self._tz = pytz.timezone(tz)
        def __repr__(self):
            return f"ZoneInfo('{self._tz.zone}')"
    # Note: This is a simplified fallback

KST = ZoneInfo("Asia/Seoul")


# =============================================================================
# Helper Functions
# =============================================================================

def calculate_kst_week_boundaries(now: datetime | None = None) -> Dict[str, date]:
    """
    Calculate week start/end in KST timezone.

    Args:
        now: Optional datetime for testing. If None, uses current time.

    Returns:
        Dict with 'week_start' and 'week_end' as date objects.
        week_start: Monday 00:00 KST
        week_end: Next Monday 00:00 KST (exclusive)

    Note: Returns date objects for proper DB driver type binding.
    Scope serialization should use .isoformat() for JSON compatibility.
    """
    if now is None:
        now = datetime.now(KST)
    elif now.tzinfo is None:
        # Assume naive datetime is KST
        now = now.replace(tzinfo=KST)

    # Monday as week start (weekday() returns 0 for Monday)
    days_since_monday = now.weekday()
    week_start_dt = (now - timedelta(days=days_since_monday)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    week_end_dt = week_start_dt + timedelta(days=7)

    return {
        "week_start": week_start_dt.date(),
        "week_end": week_end_dt.date(),
    }


def get_kst_reference_time() -> str:
    """Get current time formatted in KST for display"""
    return datetime.now(KST).strftime("%Y-%m-%d %H:%M KST")


# =============================================================================
# BACKLOG_LIST Queries
# =============================================================================

# Primary: Backlog is defined as "sprint_id IS NULL" (not assigned to any sprint)
# Status filter is secondary - only exclude terminal states
BACKLOG_LIST_QUERY = """
SELECT
    us.id,
    us.title,
    us.description,
    us.status,
    us.priority,
    us.story_points,
    us.created_at,
    us.updated_at,
    u.name as creator_name
FROM user_story us
LEFT JOIN users u ON us.created_by = u.id
WHERE us.project_id = :project_id
  AND us.sprint_id IS NULL
  AND us.status NOT IN ('DONE', 'CANCELLED', 'ARCHIVED')
ORDER BY
    CASE us.priority
        WHEN 'CRITICAL' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'MEDIUM' THEN 3
        WHEN 'LOW' THEN 4
        ELSE 5
    END NULLS LAST,
    us.created_at DESC
LIMIT :limit
"""

BACKLOG_SUMMARY_QUERY = """
SELECT
    COUNT(*) as total,
    COUNT(CASE WHEN priority = 'CRITICAL' THEN 1 END) as critical,
    COUNT(CASE WHEN priority = 'HIGH' THEN 1 END) as high,
    COUNT(CASE WHEN priority = 'MEDIUM' THEN 1 END) as medium,
    COUNT(CASE WHEN priority = 'LOW' THEN 1 END) as low,
    COUNT(CASE WHEN priority IS NULL THEN 1 END) as no_priority,
    COALESCE(SUM(story_points), 0) as total_points,
    COUNT(DISTINCT priority) as priority_diversity
FROM user_story
WHERE project_id = :project_id
  AND sprint_id IS NULL
  AND status NOT IN ('DONE', 'CANCELLED', 'ARCHIVED')
"""


# =============================================================================
# SPRINT_PROGRESS Queries
# =============================================================================

# Defensive date calculations with GREATEST/COALESCE
ACTIVE_SPRINT_QUERY = """
SELECT
    s.id,
    s.name,
    s.goal,
    s.status,
    s.start_date,
    s.end_date,
    CASE
        WHEN s.end_date IS NULL THEN NULL
        WHEN s.end_date < CURRENT_DATE THEN 0
        ELSE (s.end_date - CURRENT_DATE)
    END as days_remaining,
    CASE
        WHEN s.start_date IS NULL THEN NULL
        ELSE GREATEST(0, CURRENT_DATE - s.start_date)
    END as days_elapsed,
    CASE
        WHEN s.start_date IS NULL OR s.end_date IS NULL THEN NULL
        WHEN s.end_date < s.start_date THEN 0
        ELSE (s.end_date - s.start_date)
    END as total_days,
    -- Warning flags for degradation decisions
    CASE WHEN s.end_date < CURRENT_DATE THEN true ELSE false END as is_overdue,
    CASE WHEN s.end_date < s.start_date THEN true ELSE false END as has_invalid_dates
FROM sprint s
WHERE s.project_id = :project_id
  AND s.status = 'ACTIVE'
ORDER BY s.start_date DESC
LIMIT 1
"""

SPRINT_STORIES_QUERY = """
SELECT
    us.id,
    us.title,
    us.status,
    us.story_points,
    us.priority,
    u.name as assignee_name,
    us.assignee_id
FROM user_story us
LEFT JOIN users u ON us.assignee_id = u.id
WHERE us.sprint_id = :sprint_id
  AND us.project_id = :project_id  -- Scope enforcement on join
ORDER BY
    CASE us.status
        WHEN 'IN_PROGRESS' THEN 1
        WHEN 'REVIEW' THEN 2
        WHEN 'READY' THEN 3
        WHEN 'IN_SPRINT' THEN 4
        WHEN 'DONE' THEN 5
        ELSE 6
    END,
    CASE us.priority
        WHEN 'CRITICAL' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'MEDIUM' THEN 3
        WHEN 'LOW' THEN 4
        ELSE 5
    END NULLS LAST
"""

SPRINT_METRICS_QUERY = """
SELECT
    COUNT(*) as total_stories,
    COUNT(CASE WHEN status = 'DONE' THEN 1 END) as done_stories,
    COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) as in_progress,
    COUNT(CASE WHEN status = 'REVIEW' THEN 1 END) as in_review,
    COUNT(CASE WHEN status IN ('READY', 'IN_SPRINT') THEN 1 END) as todo,
    COALESCE(SUM(story_points), 0) as total_points,
    COALESCE(SUM(CASE WHEN status = 'DONE' THEN story_points ELSE 0 END), 0) as done_points,
    COUNT(CASE WHEN assignee_id IS NULL AND status != 'DONE' THEN 1 END) as unassigned_count
FROM user_story
WHERE sprint_id = :sprint_id
  AND project_id = :project_id  -- Scope enforcement
"""


# =============================================================================
# TASK_DUE_THIS_WEEK Queries
# =============================================================================

# Week boundaries are passed as date parameters (calculated in app with KST timezone)
# This avoids PostgreSQL date_trunc timezone issues
TASKS_DUE_THIS_WEEK_QUERY = """
SELECT
    t.id,
    t.title,
    t.status,
    t.priority,
    t.due_date,
    t.estimated_hours,
    t.actual_hours,
    us.title as story_title,
    u.name as assignee_name,
    t.assignee_id
FROM task t
LEFT JOIN user_story us ON t.user_story_id = us.id AND us.project_id = :project_id
LEFT JOIN users u ON t.assignee_id = u.id
WHERE t.project_id = :project_id
  AND t.due_date >= :week_start
  AND t.due_date < :week_end
  AND t.status NOT IN ('DONE', 'CANCELLED')
ORDER BY
    t.due_date ASC,
    CASE t.priority
        WHEN 'CRITICAL' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'MEDIUM' THEN 3
        ELSE 4
    END NULLS LAST
LIMIT :limit
"""

TASKS_OVERDUE_QUERY = """
SELECT
    t.id,
    t.title,
    t.status,
    t.priority,
    t.due_date,
    (CURRENT_DATE - t.due_date) as days_overdue,
    us.title as story_title,
    u.name as assignee_name,
    t.assignee_id
FROM task t
LEFT JOIN user_story us ON t.user_story_id = us.id AND us.project_id = :project_id
LEFT JOIN users u ON t.assignee_id = u.id
WHERE t.project_id = :project_id
  AND t.due_date < CURRENT_DATE
  AND t.status NOT IN ('DONE', 'CANCELLED')
ORDER BY t.due_date ASC
LIMIT 10
"""

# Judgment data for degradation decisions
TASK_COUNTS_QUERY = """
SELECT
    COUNT(*) as all_tasks_count,
    COUNT(CASE WHEN due_date IS NULL AND status NOT IN ('DONE', 'CANCELLED') THEN 1 END) as no_due_date_count,
    COUNT(CASE WHEN status NOT IN ('DONE', 'CANCELLED') THEN 1 END) as active_tasks_count
FROM task
WHERE project_id = :project_id
"""


# =============================================================================
# RISK_ANALYSIS Queries
# =============================================================================

# Tiered approach:
# 1. Explicit RISK type
# 2. Keyword matching in title/description (only when type IS NULL)
# 3. High-severity blockers as fallback

RISKS_FROM_ISSUES_QUERY = """
SELECT
    i.id,
    i.title,
    i.description,
    i.severity,
    i.status,
    i.type,
    i.created_at,
    i.updated_at,
    u.name as assignee_name,
    i.assignee_id,
    creator.name as reporter_name
FROM issue i
LEFT JOIN users u ON i.assignee_id = u.id
LEFT JOIN users creator ON i.reporter_id = creator.id
WHERE i.project_id = :project_id
  AND (
      i.type = 'RISK'
      OR (
          i.type IS NULL AND (
              LOWER(i.title) LIKE '%%risk%%'
              OR LOWER(i.title) LIKE '%%threat%%'
              OR LOWER(i.description) LIKE '%%risk%%'
          )
      )
  )
  AND i.status NOT IN ('CLOSED', 'RESOLVED', 'CANCELLED')
ORDER BY
    CASE i.severity
        WHEN 'CRITICAL' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'MEDIUM' THEN 3
        WHEN 'LOW' THEN 4
        ELSE 5
    END NULLS LAST,
    i.created_at DESC
LIMIT :limit
"""

# Fallback: High-priority blockers that could be risks
BLOCKERS_AS_RISKS_QUERY = """
SELECT
    i.id,
    i.title,
    i.description,
    i.severity,
    i.status,
    i.type,
    i.created_at,
    u.name as assignee_name,
    i.assignee_id
FROM issue i
LEFT JOIN users u ON i.assignee_id = u.id
WHERE i.project_id = :project_id
  AND i.type = 'BLOCKER'
  AND i.severity IN ('CRITICAL', 'HIGH')
  AND i.status NOT IN ('CLOSED', 'RESOLVED', 'CANCELLED')
ORDER BY
    CASE i.severity WHEN 'CRITICAL' THEN 1 ELSE 2 END,
    i.created_at DESC
LIMIT 5
"""


# =============================================================================
# STATUS_METRIC Queries
# =============================================================================

PROJECT_SUMMARY_QUERY = """
SELECT
    p.id,
    p.name,
    p.status,
    p.progress,
    p.start_date,
    p.target_end_date,
    p.budget,
    p.actual_cost
FROM project p
WHERE p.id = :project_id
"""

WIP_STATUS_QUERY = """
SELECT
    COUNT(*) as wip_count,
    COALESCE(
        (SELECT setting_value::int FROM project_settings
         WHERE project_id = :project_id AND setting_key = 'wip_limit'),
        5
    ) as wip_limit
FROM user_story
WHERE project_id = :project_id
  AND status = 'IN_PROGRESS'
"""

STORY_COUNTS_BY_STATUS_QUERY = """
SELECT
    status,
    COUNT(*) as count
FROM user_story
WHERE project_id = :project_id
GROUP BY status
ORDER BY
    CASE status
        WHEN 'DONE' THEN 1
        WHEN 'IN_PROGRESS' THEN 2
        WHEN 'REVIEW' THEN 3
        WHEN 'READY' THEN 4
        WHEN 'IN_SPRINT' THEN 5
        WHEN 'REFINED' THEN 6
        WHEN 'IDEA' THEN 7
        ELSE 8
    END
"""
```

---

### 7.2 degradation_tips.py (NEW FILE)

**Location**: `/llm-service/degradation_tips.py`

```python
"""
Graceful Degradation Tips for Each Intent.

Design Principles:
1. "No data" and "Query failed" are completely different paths
2. Each degradation plan has specific judgment criteria
3. Menu paths must match actual UI IA
4. Templates encourage immediate action
5. Renderer handles formatting - this module only selects plans

Note: format_degradation_response() is REMOVED for P1.
Renderer is the single source of truth for output formatting.
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum


class DegradationType(Enum):
    """Types of degradation scenarios"""
    EMPTY_DATA = "empty_data"          # No records found
    INCOMPLETE_DATA = "incomplete"      # Data exists but missing fields
    QUERY_FAILED = "query_failed"       # DB error, timeout, etc.
    PERMISSION_DENIED = "permission"    # Access denied


@dataclass
class DegradationPlan:
    """Plan for handling missing/incomplete data gracefully"""
    type: DegradationType
    message: str                    # Main message about the situation
    tips: List[str]                 # Actionable next steps
    template: str = ""              # Optional quick-start template
    related_menu: str = ""          # Menu path for the action
    severity: str = "info"          # info, warning, error


# =============================================================================
# System-level Degradation Plans (DB failures, permissions)
# =============================================================================

DEG_DB_UNAVAILABLE = DegradationPlan(
    type=DegradationType.QUERY_FAILED,
    message="Unable to load data at this time.",
    tips=[
        "This is a temporary issue - please try again in a moment",
        "If the problem persists, contact system administrator",
        "Check system status page for any ongoing maintenance",
    ],
    severity="error",
)

DEG_PERMISSION_DENIED = DegradationPlan(
    type=DegradationType.PERMISSION_DENIED,
    message="You don't have permission to view this data.",
    tips=[
        "Contact your Project Manager for access",
        "Check if you have the correct role assigned",
        "You may need to be added to this project first",
    ],
    severity="warning",
)


# =============================================================================
# BACKLOG_LIST Degradation
# =============================================================================

BACKLOG_EMPTY = DegradationPlan(
    type=DegradationType.EMPTY_DATA,
    message="Currently no backlog items registered.",
    tips=[
        "Click 'Add Story' in Backlog Management menu",
        "Write user stories in format: 'As a [user], I want [feature] so that [benefit]'",
        "Set priority (Critical/High/Medium/Low) for backlog ordering",
        "Add story points for estimation (optional but recommended)",
    ],
    template='"As a claims adjuster, I want to auto-classify documents so that I can process claims faster."',
    related_menu="Execution > Backlog Management > Add Story",
)

BACKLOG_NO_PRIORITY = DegradationPlan(
    type=DegradationType.INCOMPLETE_DATA,
    message="Backlog items exist but lack prioritization.",
    tips=[
        "Set priority for each story to enable proper ordering",
        "Use MoSCoW method: Must have, Should have, Could have, Won't have",
        "Consider business value and technical complexity",
        "Review with Product Owner weekly",
    ],
    related_menu="Execution > Backlog Management",
    severity="warning",
)

BACKLOG_LOW_DIVERSITY = DegradationPlan(
    type=DegradationType.INCOMPLETE_DATA,
    message="All backlog items have the same priority.",
    tips=[
        "Differentiate priorities to enable meaningful ordering",
        "Not everything can be 'High' priority",
        "Consider relative importance within the project scope",
    ],
    related_menu="Execution > Backlog Management",
    severity="info",
)


# =============================================================================
# SPRINT_PROGRESS Degradation
# =============================================================================

SPRINT_NO_ACTIVE = DegradationPlan(
    type=DegradationType.EMPTY_DATA,
    message="No active sprint found.",
    tips=[
        "Create a new sprint in Sprint Management",
        "Set sprint duration (typically 1-2 weeks)",
        "Define a clear sprint goal",
        "Move ready stories from backlog to sprint",
    ],
    template="Sprint Goal: 'Complete document classification feature and achieve 85% accuracy'",
    related_menu="Execution > Sprint Management > Create Sprint",
)

SPRINT_NO_STORIES = DegradationPlan(
    type=DegradationType.INCOMPLETE_DATA,
    message="Sprint is active but has no stories assigned.",
    tips=[
        "Move stories from backlog to this sprint",
        "Ensure stories are in 'Ready' status before adding",
        "Don't overload: aim for sustainable velocity",
        "Leave buffer for unexpected issues",
    ],
    related_menu="Execution > Backlog Management > Move to Sprint",
    severity="warning",
)

SPRINT_NO_GOAL = DegradationPlan(
    type=DegradationType.INCOMPLETE_DATA,
    message="Sprint has stories but no defined goal.",
    tips=[
        "Add a sprint goal to align team focus",
        "Goal should be achievable within sprint duration",
        "Make it specific and measurable",
        "Share with stakeholders for visibility",
    ],
    template="'Deliver MVP of automated document classification with >80% accuracy'",
    related_menu="Execution > Sprint Management > Edit Sprint",
    severity="info",
)

SPRINT_OVERDUE = DegradationPlan(
    type=DegradationType.INCOMPLETE_DATA,
    message="Sprint end date has passed but status is still ACTIVE.",
    tips=[
        "Review sprint completion and close it",
        "Move incomplete stories to backlog or next sprint",
        "Conduct sprint retrospective",
        "Update sprint status to COMPLETED or CANCELLED",
    ],
    related_menu="Execution > Sprint Management > Close Sprint",
    severity="warning",
)

SPRINT_INVALID_DATES = DegradationPlan(
    type=DegradationType.INCOMPLETE_DATA,
    message="Sprint has invalid date configuration (end date before start date).",
    tips=[
        "Edit sprint to correct the dates",
        "Ensure end_date > start_date",
    ],
    related_menu="Execution > Sprint Management > Edit Sprint",
    severity="error",
)


# =============================================================================
# TASK_DUE_THIS_WEEK Degradation
# =============================================================================

TASKS_NONE_EXIST = DegradationPlan(
    type=DegradationType.EMPTY_DATA,
    message="No tasks created in this project.",
    tips=[
        "Break down user stories into tasks",
        "Create tasks from Kanban Board",
        "Each task should be completable in 1-2 days",
        "Assign tasks to team members",
    ],
    related_menu="Execution > Kanban Board > Add Task",
)

TASKS_NO_DUE_DATE = DegradationPlan(
    type=DegradationType.INCOMPLETE_DATA,
    message="Tasks exist but most don't have due dates set.",
    tips=[
        "Set due_date when creating or editing tasks",
        "Break stories into tasks with specific deadlines",
        "Use daily standups to track task progress",
        "Review overdue tasks at sprint retrospective",
    ],
    related_menu="Execution > Kanban Board > Edit Task",
    severity="warning",
)

TASKS_NONE_THIS_WEEK = DegradationPlan(
    type=DegradationType.EMPTY_DATA,
    message="No tasks scheduled for this week.",
    tips=[
        "Plan weekly tasks during sprint planning",
        "Ensure active sprint has decomposed stories",
        "Set realistic due dates based on capacity",
        "Consider task dependencies when scheduling",
    ],
    related_menu="Execution > Kanban Board",
)


# =============================================================================
# RISK_ANALYSIS Degradation
# =============================================================================

RISKS_NONE_REGISTERED = DegradationPlan(
    type=DegradationType.EMPTY_DATA,
    message="No risks currently registered.",
    tips=[
        "Register risks via Issue Management with type='RISK'",
        "Set severity: CRITICAL (project failure), HIGH (major delay), MEDIUM (minor impact), LOW (negligible)",
        "Assign an owner responsible for monitoring",
        "Document mitigation and contingency plans",
    ],
    template='''Risk Example:
Title: "AI model accuracy may not meet 90% target"
Severity: HIGH
Mitigation: "Prepare fallback to rule-based classification"
Owner: Tech Lead''',
    related_menu="Quality > Issue Management > New Issue (Type: RISK)",
)

RISKS_HIGH_SEVERITY_UNASSIGNED = DegradationPlan(
    type=DegradationType.INCOMPLETE_DATA,
    message="High-severity risks exist without assigned owners.",
    tips=[
        "Assign owner for each CRITICAL/HIGH risk immediately",
        "Owner is responsible for monitoring and reporting",
        "Schedule risk review meeting with stakeholders",
        "Consider escalating CRITICAL risks to sponsor",
    ],
    related_menu="Quality > Issue Management",
    severity="warning",
)

# Note: RISKS_NO_MITIGATION removed because 'mitigation' field may not exist in schema
# If mitigation tracking is needed, it should be in a separate table (risk_plan)


# =============================================================================
# Degradation Plan Selector
# =============================================================================

def get_degradation_plan(
    intent: str,
    data: Dict[str, Any],
    context: Dict[str, Any] = None,
    query_success: bool = True,
) -> Optional[DegradationPlan]:
    """
    Select appropriate degradation plan based on intent and data state.

    Args:
        intent: Intent type (BACKLOG_LIST, SPRINT_PROGRESS, etc.)
        data: Query result data
        context: Additional context (active sprint, project info, etc.)
        query_success: Whether the DB query succeeded

    Returns:
        DegradationPlan with message and tips, or None if no degradation needed

    IMPORTANT: DB failure takes precedence over all other plans.
    """
    # DB failure takes precedence - NEVER return empty data plan for failed queries
    if not query_success:
        return DEG_DB_UNAVAILABLE

    intent = intent.upper()

    if intent == "BACKLOG_LIST":
        return _get_backlog_degradation(data)
    elif intent == "SPRINT_PROGRESS":
        return _get_sprint_degradation(data)
    elif intent == "TASK_DUE_THIS_WEEK":
        return _get_task_degradation(data)
    elif intent == "RISK_ANALYSIS":
        return _get_risk_degradation(data)

    return None


def _get_backlog_degradation(data: Dict) -> Optional[DegradationPlan]:
    """Backlog-specific degradation logic"""
    items = data.get("items", [])
    summary = data.get("summary", {})

    if not items:
        return BACKLOG_EMPTY

    # Check priority diversity
    no_priority_count = int(summary.get("no_priority", 0) or 0)
    total = int(summary.get("total", len(items)) or len(items))

    if total > 0 and no_priority_count == total:
        return BACKLOG_NO_PRIORITY

    # Check if all items have same priority (low diversity)
    priority_diversity = int(summary.get("priority_diversity", 0) or 0)
    if total > 3 and priority_diversity == 1:
        return BACKLOG_LOW_DIVERSITY

    return None


def _get_sprint_degradation(data: Dict) -> Optional[DegradationPlan]:
    """Sprint-specific degradation logic"""
    sprint = data.get("sprint")
    stories = data.get("stories", [])

    if not sprint:
        return SPRINT_NO_ACTIVE

    # Check for invalid dates FIRST (most severe)
    if sprint.get("has_invalid_dates"):
        return SPRINT_INVALID_DATES

    # Check for overdue sprint
    if sprint.get("is_overdue"):
        return SPRINT_OVERDUE

    if not stories:
        return SPRINT_NO_STORIES

    if not sprint.get("goal"):
        return SPRINT_NO_GOAL

    return None


def _get_task_degradation(data: Dict) -> Optional[DegradationPlan]:
    """
    Task-specific degradation logic.

    Uses judgment data from TASK_COUNTS_QUERY to distinguish:
    - No tasks at all → TASKS_NONE_EXIST
    - Tasks exist but no due dates → TASKS_NO_DUE_DATE
    - Tasks exist with dates, just none this week → TASKS_NONE_THIS_WEEK
    """
    tasks = data.get("tasks", [])

    # Judgment data from TASK_COUNTS_QUERY
    all_tasks_count = int(data.get("all_tasks_count", 0) or 0)
    no_due_date_count = int(data.get("no_due_date_count", 0) or 0)
    active_tasks_count = int(data.get("active_tasks_count", 0) or 0)

    # No tasks at all in the project
    if all_tasks_count == 0:
        return TASKS_NONE_EXIST

    # No tasks this week
    if not tasks:
        # Many tasks without due dates (>=50% of active tasks)
        if active_tasks_count > 0 and no_due_date_count >= active_tasks_count * 0.5:
            return TASKS_NO_DUE_DATE
        # Just no tasks scheduled this week
        return TASKS_NONE_THIS_WEEK

    return None


def _get_risk_degradation(data: Dict) -> Optional[DegradationPlan]:
    """
    Risk-specific degradation logic.

    IMPORTANT: Uses assignee_id (not assignee_name) as source of truth.
    """
    risks = data.get("risks", [])

    if not risks:
        return RISKS_NONE_REGISTERED

    # Check for unassigned high-severity risks (using assignee_id, not name)
    high_unassigned = [
        r for r in risks
        if r.get("severity") in ("CRITICAL", "HIGH") and not r.get("assignee_id")
    ]
    if high_unassigned:
        return RISKS_HIGH_SEVERITY_UNASSIGNED

    return None


# =============================================================================
# Error Helper
# =============================================================================

def make_error(code: str, message: str, detail: str = "") -> Dict[str, str]:
    """Create structured error dict"""
    err = {"code": code, "message": message}
    if detail:
        err["detail"] = detail
    return err
```

---

### 7.3 intent_handlers.py Modifications

Update each handler to:
1. Use real queries with proper parameters
2. Separate DB failure from empty data
3. Provide judgment data for degradation decisions
4. Use date objects for week boundaries

```python
# Add imports at top
from datetime import datetime
from typing import Optional, Dict, Any

# Use zoneinfo (Python 3.9+ stdlib)
try:
    from zoneinfo import ZoneInfo
except ImportError:
    import pytz
    def ZoneInfo(tz):
        return pytz.timezone(tz)

from query_templates import (
    BACKLOG_LIST_QUERY, BACKLOG_SUMMARY_QUERY,
    ACTIVE_SPRINT_QUERY, SPRINT_STORIES_QUERY, SPRINT_METRICS_QUERY,
    TASKS_DUE_THIS_WEEK_QUERY, TASKS_OVERDUE_QUERY, TASK_COUNTS_QUERY,
    RISKS_FROM_ISSUES_QUERY, BLOCKERS_AS_RISKS_QUERY,
    calculate_kst_week_boundaries, get_kst_reference_time,
)
from degradation_tips import (
    get_degradation_plan, make_error,
    DEG_DB_UNAVAILABLE,
)
from response_contract import ResponseContract

KST = ZoneInfo("Asia/Seoul")


def handle_backlog_list(ctx: HandlerContext) -> ResponseContract:
    """
    Handle backlog list queries with real data.

    Returns ResponseContract with:
    - success=True + data: Normal case or empty backlog
    - success=False: DB failure (NOT empty data)
    """
    logger.info(f"Handling BACKLOG_LIST for project {ctx.project_id}")

    executor = get_status_query_executor()
    items = []
    summary = {}
    success = True
    errors = []

    try:
        # Get backlog items
        result = executor.execute_raw_query(
            BACKLOG_LIST_QUERY,
            {"project_id": ctx.project_id, "limit": 20}
        )
        if not result.success:
            success = False
            errors.append(make_error(
                "DB_QUERY_FAILED",
                "Backlog query failed",
                str(getattr(result, "error", ""))
            ))
            logger.error(f"Backlog query failed: {getattr(result, 'error', 'unknown')}")
        else:
            items = result.data or []

        # Get summary stats (only if main query succeeded)
        if success:
            summary_result = executor.execute_raw_query(
                BACKLOG_SUMMARY_QUERY,
                {"project_id": ctx.project_id}
            )
            if summary_result.success and summary_result.data:
                summary = summary_result.data[0] or {}

    except Exception as e:
        success = False
        errors.append(make_error("DB_EXCEPTION", "Backlog query exception", str(e)))
        logger.error(f"Backlog query exception: {e}")

    data = {
        "items": items,
        "count": len(items),
        "summary": summary,
    }

    # Get degradation plan if needed
    plan = get_degradation_plan("BACKLOG_LIST", data, query_success=success)

    # Build warnings/tips based on success state
    if not success:
        warnings = [DEG_DB_UNAVAILABLE.message]
        tips = DEG_DB_UNAVAILABLE.tips
    elif plan:
        warnings = [plan.message]
        tips = plan.tips
    else:
        warnings = []
        tips = []

    return ResponseContract(
        intent="BACKLOG_LIST",
        reference_time=get_kst_reference_time(),
        scope={
            "project_id": ctx.project_id,
            "project_name": ctx.project_name,
        },
        data=data,
        success=success,
        warnings=warnings,
        tips=tips,
        errors=errors,
        provenance="PostgreSQL" if success else "Unavailable",
    )


def handle_sprint_progress(ctx: HandlerContext) -> ResponseContract:
    """Handle sprint progress queries with real data"""
    logger.info(f"Handling SPRINT_PROGRESS for project {ctx.project_id}")

    executor = get_status_query_executor()
    sprint = None
    stories = []
    metrics = {}
    success = True
    errors = []

    try:
        # Get active sprint
        sprint_result = executor.execute_raw_query(
            ACTIVE_SPRINT_QUERY,
            {"project_id": ctx.project_id}
        )
        if not sprint_result.success:
            success = False
            errors.append(make_error(
                "DB_QUERY_FAILED",
                "Sprint query failed",
                str(getattr(sprint_result, "error", ""))
            ))
            logger.error(f"Sprint query failed: {getattr(sprint_result, 'error', 'unknown')}")
        else:
            sprint = sprint_result.data[0] if sprint_result.data else None

        if sprint and success:
            # Get sprint stories with scope enforcement
            story_result = executor.execute_raw_query(
                SPRINT_STORIES_QUERY,
                {"sprint_id": sprint["id"], "project_id": ctx.project_id}
            )
            stories = story_result.data if story_result.success else []

            # Get sprint metrics with scope enforcement
            metrics_result = executor.execute_raw_query(
                SPRINT_METRICS_QUERY,
                {"sprint_id": sprint["id"], "project_id": ctx.project_id}
            )
            if metrics_result.success and metrics_result.data:
                metrics = metrics_result.data[0] or {}

                # Calculate completion rate
                total = int(metrics.get("total_stories", 0) or 0)
                done = int(metrics.get("done_stories", 0) or 0)
                metrics["completion_rate"] = round(done / total * 100, 1) if total > 0 else 0

    except Exception as e:
        success = False
        errors.append(make_error("DB_EXCEPTION", "Sprint progress query exception", str(e)))
        logger.error(f"Sprint progress query exception: {e}")

    data = {
        "sprint": sprint,
        "stories": stories,
        "metrics": metrics,
    }

    # Get degradation plan if needed
    plan = get_degradation_plan("SPRINT_PROGRESS", data, query_success=success)

    # Build warnings/tips based on success state
    if not success:
        warnings = [DEG_DB_UNAVAILABLE.message]
        tips = DEG_DB_UNAVAILABLE.tips
    elif plan:
        warnings = [plan.message]
        tips = plan.tips
    else:
        warnings = []
        tips = []

    scope = {"project_id": ctx.project_id, "project_name": ctx.project_name}
    if sprint:
        scope["sprint_id"] = sprint["id"]
        scope["sprint_name"] = sprint.get("name")

    return ResponseContract(
        intent="SPRINT_PROGRESS",
        reference_time=get_kst_reference_time(),
        scope=scope,
        data=data,
        success=success,
        warnings=warnings,
        tips=tips,
        errors=errors,
        provenance="PostgreSQL" if success else "Unavailable",
    )


def handle_tasks_due_this_week(ctx: HandlerContext) -> ResponseContract:
    """
    Handle tasks due this week queries with real data.

    Week boundaries are calculated in KST and passed as date objects
    to avoid PostgreSQL timezone issues.
    """
    logger.info(f"Handling TASK_DUE_THIS_WEEK for project {ctx.project_id}")

    executor = get_status_query_executor()
    tasks = []
    overdue = []
    task_counts = {}
    success = True
    errors = []

    # Calculate week boundaries in KST (returns date objects)
    week_bounds = calculate_kst_week_boundaries()

    try:
        # Get task counts for degradation judgment (IMPORTANT: run first)
        counts_result = executor.execute_raw_query(
            TASK_COUNTS_QUERY,
            {"project_id": ctx.project_id}
        )
        if counts_result.success and counts_result.data:
            task_counts = counts_result.data[0] or {}

        # Get tasks due this week
        result = executor.execute_raw_query(
            TASKS_DUE_THIS_WEEK_QUERY,
            {
                "project_id": ctx.project_id,
                "week_start": week_bounds["week_start"],  # date object
                "week_end": week_bounds["week_end"],      # date object
                "limit": 30,
            }
        )
        if not result.success:
            success = False
            errors.append(make_error(
                "DB_QUERY_FAILED",
                "Tasks due query failed",
                str(getattr(result, "error", ""))
            ))
            logger.error(f"Tasks due query failed: {getattr(result, 'error', 'unknown')}")
        else:
            tasks = result.data or []

        # Get overdue tasks (only if main query succeeded)
        if success:
            overdue_result = executor.execute_raw_query(
                TASKS_OVERDUE_QUERY,
                {"project_id": ctx.project_id}
            )
            overdue = overdue_result.data if overdue_result.success else []

    except Exception as e:
        success = False
        errors.append(make_error("DB_EXCEPTION", "Tasks due query exception", str(e)))
        logger.error(f"Tasks due query exception: {e}")

    data = {
        "tasks": tasks,
        "count": len(tasks),
        "overdue": overdue,
        "overdue_count": len(overdue),
        # Judgment data for degradation decisions
        "all_tasks_count": int(task_counts.get("all_tasks_count", 0) or 0),
        "no_due_date_count": int(task_counts.get("no_due_date_count", 0) or 0),
        "active_tasks_count": int(task_counts.get("active_tasks_count", 0) or 0),
    }

    # Get degradation plan if needed
    plan = get_degradation_plan("TASK_DUE_THIS_WEEK", data, query_success=success)

    # Build warnings/tips based on success state
    if not success:
        warnings = [DEG_DB_UNAVAILABLE.message]
        tips = DEG_DB_UNAVAILABLE.tips
    elif plan:
        warnings = [plan.message]
        tips = plan.tips
    else:
        warnings = []
        tips = []

    # Scope period uses ISO format strings for JSON serialization
    scope_period = {
        "start": week_bounds["week_start"].isoformat(),
        "end": week_bounds["week_end"].isoformat(),
    }

    return ResponseContract(
        intent="TASK_DUE_THIS_WEEK",
        reference_time=get_kst_reference_time(),
        scope={
            "project_id": ctx.project_id,
            "project_name": ctx.project_name,
            "period": scope_period,
        },
        data=data,
        success=success,
        warnings=warnings,
        tips=tips,
        errors=errors,
        provenance="PostgreSQL" if success else "Unavailable",
    )


def handle_risk_analysis(ctx: HandlerContext) -> ResponseContract:
    """Handle risk analysis queries with real data"""
    logger.info(f"Handling RISK_ANALYSIS for project {ctx.project_id}")

    executor = get_status_query_executor()
    risks = []
    blockers = []
    success = True
    errors = []

    try:
        # Get risks from issues
        result = executor.execute_raw_query(
            RISKS_FROM_ISSUES_QUERY,
            {"project_id": ctx.project_id, "limit": 15}
        )
        if not result.success:
            success = False
            errors.append(make_error(
                "DB_QUERY_FAILED",
                "Risk analysis query failed",
                str(getattr(result, "error", ""))
            ))
            logger.error(f"Risk analysis query failed: {getattr(result, 'error', 'unknown')}")
        else:
            risks = result.data or []

        # If no explicit risks, get high-priority blockers as potential risks
        if success and not risks:
            blocker_result = executor.execute_raw_query(
                BLOCKERS_AS_RISKS_QUERY,
                {"project_id": ctx.project_id}
            )
            blockers = blocker_result.data if blocker_result.success else []

    except Exception as e:
        success = False
        errors.append(make_error("DB_EXCEPTION", "Risk analysis query exception", str(e)))
        logger.error(f"Risk analysis query exception: {e}")

    # Group by severity
    by_severity = {}
    for risk in risks:
        sev = risk.get("severity") or "UNKNOWN"
        if sev not in by_severity:
            by_severity[sev] = []
        by_severity[sev].append(risk)

    data = {
        "risks": risks,
        "count": len(risks),
        "by_severity": by_severity,
        "blockers": blockers,
    }

    # Get degradation plan if needed
    plan = get_degradation_plan("RISK_ANALYSIS", data, query_success=success)

    # Build warnings/tips based on success state
    if not success:
        warnings = [DEG_DB_UNAVAILABLE.message]
        tips = DEG_DB_UNAVAILABLE.tips
    elif plan:
        warnings = [plan.message]
        tips = plan.tips
    else:
        warnings = []
        tips = []

    return ResponseContract(
        intent="RISK_ANALYSIS",
        reference_time=get_kst_reference_time(),
        scope={
            "project_id": ctx.project_id,
            "project_name": ctx.project_name,
        },
        data=data,
        success=success,
        warnings=warnings,
        tips=tips,
        errors=errors,
        provenance="PostgreSQL" if success else "Unavailable",
    )
```

---

### 7.4 response_renderer.py Modifications

Key changes:
1. Query failure check BEFORE intent routing
2. Overdue tasks section for TASK_DUE_THIS_WEEK
3. Defensive status translation

```python
def render(contract: ResponseContract) -> str:
    """Main render function with failure handling"""

    # Provenance fallback
    provenance = contract.provenance or "PostgreSQL"

    # CRITICAL: If query failed, show system error message
    # This check MUST come BEFORE any intent routing
    if not contract.success:
        return render_query_failure(contract, provenance)

    # Route to intent-specific renderer
    renderers = {
        "BACKLOG_LIST": render_backlog_list,
        "SPRINT_PROGRESS": render_sprint_progress,
        "TASK_DUE_THIS_WEEK": render_tasks_due,
        "RISK_ANALYSIS": render_risk_analysis,
    }

    renderer = renderers.get(contract.intent.upper(), render_generic)
    return renderer(contract, provenance)


def render_query_failure(contract: ResponseContract, provenance: str) -> str:
    """
    Render query failure message - NOT the same as empty data.

    This must clearly indicate a system issue, not "no data".
    """
    lines = []

    intent_titles = {
        "BACKLOG_LIST": "Product Backlog",
        "SPRINT_PROGRESS": "Sprint Progress",
        "TASK_DUE_THIS_WEEK": "Tasks Due This Week",
        "RISK_ANALYSIS": "Risk Analysis",
    }
    title = intent_titles.get(contract.intent.upper(), "Data")

    lines.append(f"**{title}** (as of: {contract.reference_time})")
    lines.append(f"Project: {contract.scope.get('project_name', contract.scope.get('project_id'))}")
    lines.append("")

    # Error message (clearly indicates system issue)
    lines.append("Unable to load data at this time.")
    lines.append("")

    # Tips for system error
    if contract.tips:
        lines.append("**What to do**:")
        for tip in contract.tips:
            lines.append(f"  - {tip}")
        lines.append("")
    else:
        lines.append("**What to do**:")
        lines.append("  - Please try again in a moment")
        lines.append("  - If the problem persists, contact system administrator")
        lines.append("")

    lines.append(f"_Data source: {provenance} (temporarily unavailable)_")

    return "\n".join(lines)


def render_tasks_due(contract: ResponseContract, provenance: str) -> str:
    """
    Render tasks due this week with degradation support.

    MUST include overdue section when overdue tasks exist.
    """
    lines = []

    # Header with period
    period = contract.scope.get("period", {})
    pstart, pend = period.get("start"), period.get("end")

    lines.append(f"**Tasks Due This Week** (as of: {contract.reference_time})")
    lines.append(f"Project: {contract.scope.get('project_name', contract.scope.get('project_id'))}")
    if pstart and pend:
        lines.append(f"Period (KST): {pstart} ~ {pend} (exclusive)")
    lines.append("")

    tasks = contract.data.get("tasks", [])
    overdue = contract.data.get("overdue", [])

    # Tasks due this week section
    if tasks:
        lines.append(f"**Due This Week**: {len(tasks)}")
        for t in tasks[:10]:
            title = (t.get("title") or "Untitled")[:60]
            due = t.get("due_date") or "-"
            prio = t.get("priority") or "UNSET"
            assignee = t.get("assignee_name") or "Unassigned"
            status = _translate_status(t.get("status"))
            lines.append(f"  - [{prio}] {title} (due: {due}, {status}, owner: {assignee})")
        if len(tasks) > 10:
            lines.append(f"  - ... and {len(tasks)-10} more")
        lines.append("")
    else:
        # No data - show degradation message
        if contract.warnings:
            lines.append(contract.warnings[0])
            lines.append("")

    # Overdue section (P1 success criterion)
    if overdue:
        lines.append(f"**Overdue**: {len(overdue)}")
        for t in overdue[:10]:
            title = (t.get("title") or "Untitled")[:60]
            due = t.get("due_date") or "-"
            days = t.get("days_overdue") or "?"
            prio = t.get("priority") or "UNSET"
            assignee = t.get("assignee_name") or "Unassigned"
            lines.append(f"  - [{prio}] {title} (due: {due}, {days} days overdue, owner: {assignee})")
        if len(overdue) > 10:
            lines.append(f"  - ... and {len(overdue)-10} more overdue tasks")
        lines.append("")

    # Tips section
    if contract.tips:
        lines.append("**Next Steps**:")
        for tip in contract.tips:
            lines.append(f"  - {tip}")
        lines.append("")

    lines.append(f"_Data source: {provenance} real-time query_")
    return "\n".join(lines)


def render_backlog_list(contract: ResponseContract, provenance: str) -> str:
    """Render backlog list with degradation support"""
    lines = []

    # Header
    lines.append(f"**Product Backlog** (as of: {contract.reference_time})")
    lines.append(f"Project: {contract.scope.get('project_name', contract.scope.get('project_id'))}")
    lines.append("")

    items = contract.data.get("items", [])
    summary = contract.data.get("summary", {})

    if items:
        # Summary stats
        total = int(summary.get("total", len(items)) or len(items))
        critical = int(summary.get("critical", 0) or 0)
        high = int(summary.get("high", 0) or 0)
        total_points = int(summary.get("total_points", 0) or 0)

        lines.append(f"**Total Items**: {total}")
        if total_points > 0:
            lines.append(f"**Total Story Points**: {total_points}")
        if critical > 0 or high > 0:
            lines.append(f"**Priority**: {critical} Critical, {high} High")
        lines.append("")

        # Items by priority
        by_priority = {}
        for item in items:
            prio = item.get("priority") or "UNSET"
            if prio not in by_priority:
                by_priority[prio] = []
            by_priority[prio].append(item)

        priority_order = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "UNSET"]
        priority_markers = {"CRITICAL": "[!]", "HIGH": "[H]", "MEDIUM": "[M]", "LOW": "[L]", "UNSET": "[-]"}

        for prio in priority_order:
            if prio in by_priority:
                marker = priority_markers.get(prio, "[ ]")
                lines.append(f"{marker} **{prio}** ({len(by_priority[prio])})")
                for item in by_priority[prio][:5]:
                    title = (item.get("title") or "Untitled")[:50]
                    points = item.get("story_points") or "-"
                    status = _translate_status(item.get("status"))
                    lines.append(f"  - {title} ({points}pts, {status})")
                if len(by_priority[prio]) > 5:
                    lines.append(f"  - ... and {len(by_priority[prio]) - 5} more")
                lines.append("")
    else:
        # No data - show degradation message
        if contract.warnings:
            lines.append(contract.warnings[0])
            lines.append("")

    # Tips (show for degradation cases)
    if contract.tips:
        lines.append("**Next Steps**:")
        for tip in contract.tips:
            lines.append(f"  - {tip}")
        lines.append("")

    lines.append(f"_Data source: {provenance} real-time query_")

    return "\n".join(lines)


def _translate_status(status: str) -> str:
    """
    Translate status to display text.

    Defensive: Unknown status returns as-is, not an error.
    """
    if not status:
        return "Unknown"

    translations = {
        "IDEA": "Idea",
        "REFINED": "Refined",
        "READY": "Ready",
        "IN_SPRINT": "In Sprint",
        "IN_PROGRESS": "In Progress",
        "REVIEW": "Review",
        "DONE": "Done",
        "CANCELLED": "Cancelled",
        "ARCHIVED": "Archived",
        # Common alternatives
        "TODO": "To Do",
        "COMPLETED": "Completed",
        "CLOSED": "Closed",
    }
    return translations.get(status.upper(), status)
```

---

## 8. Testing Strategy

### 8.1 Required Test Categories (6 Essential Tests)

| # | Test | Why Critical |
|---|------|--------------|
| 1 | Query failure ≠ empty rendering | Prevents ops blindness to outages |
| 2 | Backlog empty plan selection | Validates basic degradation logic |
| 3 | Tasks 3-way branching | Validates judgment data usage |
| 4 | Sprint invalid/overdue flags | Validates warning severity |
| 5 | Risk assignee_id check | Ensures correct unassigned detection |
| 6 | Week boundary Monday start | Validates KST timezone handling |

### 8.2 Test Implementation

```python
import pytest
from unittest.mock import Mock, patch
from datetime import datetime, date
from degradation_tips import (
    get_degradation_plan, DEG_DB_UNAVAILABLE,
    BACKLOG_EMPTY, TASKS_NONE_EXIST, TASKS_NO_DUE_DATE, TASKS_NONE_THIS_WEEK,
    SPRINT_OVERDUE, SPRINT_INVALID_DATES,
)


class TestDegradationPlanSelection:
    """Test degradation plan selection logic"""

    # TEST 1: Query failure ≠ empty rendering
    def test_db_failure_returns_unavailable_plan(self):
        """DB failure must NOT return 'no data' plan"""
        data = {"items": []}
        plan = get_degradation_plan("BACKLOG_LIST", data, query_success=False)

        assert plan is not None
        assert plan == DEG_DB_UNAVAILABLE
        assert "Unable to load" in plan.message
        assert plan.severity == "error"

    def test_db_failure_ignores_data_content(self):
        """Even with data present, query_success=False returns unavailable"""
        data = {"items": [{"id": 1, "title": "Story"}], "count": 1}
        plan = get_degradation_plan("BACKLOG_LIST", data, query_success=False)

        assert plan == DEG_DB_UNAVAILABLE

    # TEST 2: Backlog empty plan selection
    def test_backlog_empty_returns_correct_plan(self):
        """Empty backlog with successful query returns BACKLOG_EMPTY"""
        data = {"items": [], "count": 0, "summary": {}}
        plan = get_degradation_plan("BACKLOG_LIST", data, query_success=True)

        assert plan is not None
        assert plan == BACKLOG_EMPTY
        assert "no backlog items" in plan.message.lower()
        assert len(plan.tips) >= 3
        assert plan.related_menu  # Must have menu path

    # TEST 3: Tasks 3-way branching
    def test_tasks_none_exist(self):
        """No tasks at all shows different message than 'no tasks this week'"""
        data = {
            "tasks": [],
            "all_tasks_count": 0,
            "no_due_date_count": 0,
            "active_tasks_count": 0,
        }
        plan = get_degradation_plan("TASK_DUE_THIS_WEEK", data, query_success=True)

        assert plan is not None
        assert plan == TASKS_NONE_EXIST
        assert "no tasks created" in plan.message.lower()

    def test_tasks_exist_but_no_due_dates(self):
        """Tasks exist but many have no due_date (>=50%)"""
        data = {
            "tasks": [],
            "all_tasks_count": 10,
            "no_due_date_count": 8,  # 80% have no due date
            "active_tasks_count": 10,
        }
        plan = get_degradation_plan("TASK_DUE_THIS_WEEK", data, query_success=True)

        assert plan is not None
        assert plan == TASKS_NO_DUE_DATE
        assert "due date" in plan.message.lower()

    def test_tasks_exist_just_not_this_week(self):
        """Tasks have due dates, just none this week"""
        data = {
            "tasks": [],
            "all_tasks_count": 10,
            "no_due_date_count": 1,  # Only 10% have no due date
            "active_tasks_count": 10,
        }
        plan = get_degradation_plan("TASK_DUE_THIS_WEEK", data, query_success=True)

        assert plan is not None
        assert plan == TASKS_NONE_THIS_WEEK
        assert "this week" in plan.message.lower()

    # TEST 4: Sprint invalid/overdue flags
    def test_sprint_overdue_detected(self):
        """Overdue sprint flag triggers warning"""
        data = {
            "sprint": {"id": 1, "name": "Sprint 5", "is_overdue": True, "has_invalid_dates": False},
            "stories": [{"id": 1}],
        }
        plan = get_degradation_plan("SPRINT_PROGRESS", data, query_success=True)

        assert plan is not None
        assert plan == SPRINT_OVERDUE
        assert plan.severity == "warning"

    def test_sprint_invalid_dates_takes_precedence(self):
        """Invalid dates (more severe) takes precedence over overdue"""
        data = {
            "sprint": {"id": 1, "has_invalid_dates": True, "is_overdue": True},
            "stories": [],
        }
        plan = get_degradation_plan("SPRINT_PROGRESS", data, query_success=True)

        assert plan is not None
        assert plan == SPRINT_INVALID_DATES
        assert plan.severity == "error"

    # TEST 5: Risk assignee_id check
    def test_high_risk_unassigned_by_id(self):
        """High severity risk without assignee_id triggers warning"""
        data = {
            "risks": [
                {"id": 1, "severity": "CRITICAL", "assignee_id": None, "assignee_name": None}
            ],
        }
        plan = get_degradation_plan("RISK_ANALYSIS", data, query_success=True)

        assert plan is not None
        assert "owner" in plan.message.lower() or "unassigned" in plan.message.lower()

    def test_risk_with_name_but_no_id_still_unassigned(self):
        """assignee_name without assignee_id should still flag as unassigned"""
        data = {
            "risks": [
                {"id": 1, "severity": "HIGH", "assignee_id": None, "assignee_name": "John"}
            ],
        }
        plan = get_degradation_plan("RISK_ANALYSIS", data, query_success=True)

        # Should use assignee_id as source of truth, not name
        assert plan is not None
        assert "owner" in plan.message.lower() or "unassigned" in plan.message.lower()


class TestKSTWeekBoundaries:
    """Test KST timezone week calculations"""

    # TEST 6: Week boundary Monday start
    def test_monday_is_week_start(self):
        """Week should start on Monday KST"""
        from query_templates import calculate_kst_week_boundaries, KST

        # Wednesday 2026-02-04 15:00 KST
        test_now = datetime(2026, 2, 4, 15, 0, 0, tzinfo=KST)
        bounds = calculate_kst_week_boundaries(now=test_now)

        assert bounds["week_start"] == date(2026, 2, 2)  # Monday
        assert bounds["week_end"] == date(2026, 2, 9)    # Next Monday

    def test_monday_stays_in_current_week(self):
        """Monday should be week_start of its own week"""
        from query_templates import calculate_kst_week_boundaries, KST

        # Monday 2026-02-02 09:00 KST
        test_now = datetime(2026, 2, 2, 9, 0, 0, tzinfo=KST)
        bounds = calculate_kst_week_boundaries(now=test_now)

        assert bounds["week_start"] == date(2026, 2, 2)  # Same Monday
        assert bounds["week_end"] == date(2026, 2, 9)    # Next Monday

    def test_sunday_is_last_day_of_week(self):
        """Sunday should still be in the Monday-starting week"""
        from query_templates import calculate_kst_week_boundaries, KST

        # Sunday 2026-02-08 23:59 KST
        test_now = datetime(2026, 2, 8, 23, 59, 0, tzinfo=KST)
        bounds = calculate_kst_week_boundaries(now=test_now)

        assert bounds["week_start"] == date(2026, 2, 2)  # Monday of that week
        assert bounds["week_end"] == date(2026, 2, 9)    # Next Monday

    def test_returns_date_objects_not_strings(self):
        """Week boundaries must be date objects for proper DB binding"""
        from query_templates import calculate_kst_week_boundaries

        bounds = calculate_kst_week_boundaries()

        assert isinstance(bounds["week_start"], date)
        assert isinstance(bounds["week_end"], date)


class TestSchemaResiliency:
    """Test handling of missing/unexpected schema elements"""

    def test_missing_priority_field_safe(self):
        """Items without priority field don't crash"""
        data = {
            "items": [
                {"id": 1, "title": "Test"},  # No priority
            ],
            "summary": {},
        }
        # Should not raise
        plan = get_degradation_plan("BACKLOG_LIST", data, query_success=True)
        # May return None or some plan, both acceptable

    def test_null_severity_in_risks(self):
        """NULL severity doesn't crash risk grouping"""
        data = {
            "risks": [
                {"id": 1, "severity": None, "assignee_id": 1},
            ],
        }
        plan = get_degradation_plan("RISK_ANALYSIS", data, query_success=True)
        # Should not raise

    def test_null_values_coerced_to_int(self):
        """None values in counts should be handled as 0"""
        data = {
            "tasks": [],
            "all_tasks_count": None,  # Could come from DB as NULL
            "no_due_date_count": None,
            "active_tasks_count": None,
        }
        plan = get_degradation_plan("TASK_DUE_THIS_WEEK", data, query_success=True)
        assert plan == TASKS_NONE_EXIST  # Treated as 0 tasks


class TestResponseContractRendering:
    """Test renderer handles contract correctly"""

    def test_renderer_uses_provenance_fallback(self):
        """Renderer uses default provenance when not set"""
        from response_renderer import render
        from response_contract import ResponseContract

        contract = ResponseContract(
            intent="BACKLOG_LIST",
            reference_time="2026-02-03 14:30 KST",
            scope={"project_id": "test", "project_name": "Test"},
            data={"items": [], "summary": {}},
            success=True,
            warnings=["Currently no backlog items registered."],
            tips=["Click 'Add Story' in Backlog Management menu"],
            provenance=None,  # Not set
        )

        result = render(contract)
        assert "PostgreSQL" in result  # Default fallback

    def test_query_failure_shows_error_not_empty(self):
        """Query failure must show error message, not 'no data'"""
        from response_renderer import render
        from response_contract import ResponseContract

        contract = ResponseContract(
            intent="BACKLOG_LIST",
            reference_time="2026-02-03 14:30 KST",
            scope={"project_id": "test", "project_name": "Test"},
            data={"items": []},
            success=False,  # Query failed
            provenance="Unavailable",
        )

        result = render(contract)
        assert "Unable to load" in result or "unavailable" in result.lower()
        assert "no backlog items" not in result.lower()  # NOT empty data message
```

---

## 9. Database Index Recommendations (Conservative)

Add these indexes for query performance. **P1 uses minimal status conditions** to avoid enum mismatch issues:

```sql
-- Backlog queries (conservative: no status condition in index)
CREATE INDEX IF NOT EXISTS idx_user_story_backlog
ON user_story(project_id, sprint_id, priority, created_at)
WHERE sprint_id IS NULL;

-- Sprint queries
CREATE INDEX IF NOT EXISTS idx_sprint_active
ON sprint(project_id, status, start_date DESC)
WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_user_story_sprint
ON user_story(sprint_id, project_id, status);

-- Task queries (conservative: simple composite index)
CREATE INDEX IF NOT EXISTS idx_task_due_date
ON task(project_id, due_date);

-- Risk/Issue queries
CREATE INDEX IF NOT EXISTS idx_issue_risk
ON issue(project_id, type, status, severity, created_at);

-- Note: More aggressive partial indexes with status conditions
-- should be added in P2 after enum values are confirmed stable.
```

---

## 10. Implementation Priority (Realistic 1-2 Day Plan)

### Day 1: "Don't Break" (Foundation)

| Task | Description | Risk if Skipped |
|------|-------------|-----------------|
| ResponseContract spec | Define all fields, add to codebase | Renderer crashes |
| Renderer defense code | provenance fallback, success check FIRST | Undefined errors |
| DB failure vs empty data | Separate handling paths in handlers | Ops blind to outages |
| TASK_COUNTS_QUERY | Add judgment data query | Wrong degradation messages |
| DEG_DB_UNAVAILABLE | Add system error plan | Query failures look like "no data" |
| 6 core tests | Validate critical paths | Regressions |

### Day 2: "Quality Up" (Polish)

| Task | Description | Risk if Skipped |
|------|-------------|-----------------|
| KST week calculation | `calculate_kst_week_boundaries()` with date returns | Wrong week shown |
| Overdue tasks section | render_tasks_due shows overdue separately | Missing P1 criterion |
| Status translation | Defensive `_translate_status()` | Unknown status crashes |
| Remove format_degradation_response | Single source of truth in renderer | Duplicate logic confusion |
| Add indexes | Migration script with conservative conditions | Slow queries at scale |

---

## 11. Menu Path Consistency Checklist

Ensure all `related_menu` paths match actual UI navigation:

| Intent | Menu Path | Verified |
|--------|-----------|----------|
| BACKLOG_LIST | Execution > Backlog Management > Add Story | [ ] |
| SPRINT_PROGRESS | Execution > Sprint Management > Create Sprint | [ ] |
| TASK_DUE_THIS_WEEK | Execution > Kanban Board | [ ] |
| RISK_ANALYSIS | Quality > Issue Management > New Issue | [ ] |

---

## 12. Success Criteria Checklist

| # | Criteria | Measurement | Status |
|---|----------|-------------|--------|
| 1 | Real SQL queries execute | No placeholder data in responses | [ ] |
| 2 | Empty data shows tips | Each intent has specific guidance | [ ] |
| 3 | Query failure shows error | "Unable to load" not "no data" | [ ] |
| 4 | Tips are actionable | Include menu paths, templates | [ ] |
| 5 | KST time displayed | All timestamps in KST | [ ] |
| 6 | Overdue tasks highlighted | Separate section for overdue items | [ ] |
| 7 | Risks show severity breakdown | Grouped by CRITICAL/HIGH/MEDIUM/LOW | [ ] |
| 8 | Week boundaries correct | Monday 00:00 KST start | [ ] |
| 9 | Judgment data branching | Tasks 3-way distinction works | [ ] |

---

## 13. Dependencies

- **P0 must be completed first** (intent routing infrastructure)
- Database schema must match expected tables/columns (verify before deploy)
- `status_query_executor` must support `execute_raw_query` method
- Python 3.9+ for `zoneinfo` (or `pytz` fallback)

---

## 14. Key Leverage Points Summary

The 4 changes that make this production-ready:

1. **ResponseContract specification** + renderer defense code (`if not success: render_query_failure` FIRST)
2. **DB failure vs empty data separation** (operations visibility and correct UX)
3. **Judgment data in handlers** (counts/NULL flags from TASK_COUNTS_QUERY for accurate degradation)
4. **KST week calculation in app** (date objects, explicit timezone, testable with `now` injection)

---

## Appendix: Quick Reference - Error Codes

| Code | When Used | Example Detail |
|------|-----------|----------------|
| `DB_QUERY_FAILED` | Query returned `success=False` | "timeout after 30s" |
| `DB_EXCEPTION` | Python exception during query | "Connection refused" |
| `PERMISSION_DENIED` | User lacks access | "Role PM required" |
