"""
SQL Query Templates for Intent Handlers.

Design Principles:
1. Always filter by project_id (scope enforcement)
2. Use COALESCE/NULLIF for NULL safety
3. Use parameterized week_start/week_end (no date_trunc timezone issues)
4. Include judgment data (counts) for degradation decisions
5. Week boundaries return date objects, not strings

Reference: docs/P1_DATA_QUERY_AND_DEGRADATION.md
"""

from __future__ import annotations
from typing import Dict, Any
from datetime import datetime, timedelta, date

# Use zoneinfo (Python 3.9+ stdlib) - no external dependency
try:
    from zoneinfo import ZoneInfo
except ImportError:
    import pytz
    class ZoneInfo:
        def __init__(self, tz):
            self._tz = pytz.timezone(tz)
        def __repr__(self):
            return f"ZoneInfo('{self._tz.zone}')"

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


def get_kst_now() -> datetime:
    """Get current datetime in KST"""
    return datetime.now(KST)


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
FROM task.user_stories us
LEFT JOIN auth.users u ON us.created_by = u.id
WHERE us.project_id = %(project_id)s
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
LIMIT %(limit)s
"""

# Fallback: Without priority column
BACKLOG_LIST_FALLBACK_QUERY = """
SELECT
    us.id,
    us.title,
    us.status,
    us.story_points,
    us.created_at
FROM task.user_stories us
WHERE us.project_id = %(project_id)s
  AND us.sprint_id IS NULL
  AND us.status NOT IN ('DONE', 'CANCELLED', 'ARCHIVED')
ORDER BY us.created_at DESC
LIMIT %(limit)s
"""

# Judgment data for degradation decisions
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
FROM task.user_stories
WHERE project_id = %(project_id)s
  AND sprint_id IS NULL
  AND status NOT IN ('DONE', 'CANCELLED', 'ARCHIVED')
"""


# =============================================================================
# SPRINT_PROGRESS Queries
# =============================================================================

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
    CASE WHEN s.end_date < CURRENT_DATE THEN true ELSE false END as is_overdue,
    CASE WHEN s.end_date < s.start_date THEN true ELSE false END as has_invalid_dates
FROM task.sprints s
WHERE s.project_id = %(project_id)s
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
    us.priority
FROM task.user_stories us
WHERE us.sprint_id = %(sprint_id)s
  AND us.project_id = %(project_id)s
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
FROM task.user_stories
WHERE sprint_id = %(sprint_id)s
  AND project_id = %(project_id)s
"""

# Fallback: Last completed sprint when no active sprint
LAST_COMPLETED_SPRINT_QUERY = """
SELECT
    s.id,
    s.name,
    s.goal,
    s.status,
    s.start_date,
    s.end_date
FROM task.sprints s
WHERE s.project_id = %(project_id)s
  AND s.status = 'COMPLETED'
ORDER BY s.end_date DESC
LIMIT 1
"""


# =============================================================================
# TASK_DUE_THIS_WEEK Queries
# =============================================================================

# Week boundaries are passed as date parameters (calculated in app with KST timezone)
TASKS_DUE_THIS_WEEK_QUERY = """
SELECT
    t.id,
    t.title,
    t.status,
    t.priority,
    t.due_date,
    t.estimated_hours,
    us.title as story_title
FROM task.tasks t
LEFT JOIN task.user_stories us ON t.user_story_id = us.id AND us.project_id = %(project_id)s
WHERE t.project_id = %(project_id)s
  AND t.due_date >= %(week_start)s
  AND t.due_date < %(week_end)s
  AND t.status NOT IN ('DONE', 'CANCELLED')
ORDER BY
    t.due_date ASC,
    CASE t.priority
        WHEN 'CRITICAL' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'MEDIUM' THEN 3
        ELSE 4
    END NULLS LAST
LIMIT %(limit)s
"""

# Fallback: Without story join
TASKS_DUE_THIS_WEEK_FALLBACK_QUERY = """
SELECT
    id,
    title,
    status,
    due_date
FROM task.tasks
WHERE project_id = %(project_id)s
  AND due_date >= %(week_start)s
  AND due_date < %(week_end)s
  AND status NOT IN ('DONE', 'CANCELLED')
ORDER BY due_date ASC
LIMIT %(limit)s
"""

# Overdue tasks
TASKS_OVERDUE_QUERY = """
SELECT
    t.id,
    t.title,
    t.status,
    t.priority,
    t.due_date,
    (CURRENT_DATE - t.due_date) as days_overdue,
    us.title as story_title
FROM task.tasks t
LEFT JOIN task.user_stories us ON t.user_story_id = us.id AND us.project_id = %(project_id)s
WHERE t.project_id = %(project_id)s
  AND t.due_date < CURRENT_DATE
  AND t.status NOT IN ('DONE', 'CANCELLED')
ORDER BY t.due_date ASC
LIMIT 10
"""

# Judgment data: Task counts to distinguish "no tasks this week" vs "due_date mostly null"
TASK_COUNTS_QUERY = """
SELECT
    COUNT(*) as all_tasks_count,
    COUNT(CASE WHEN due_date IS NULL AND status NOT IN ('DONE', 'CANCELLED') THEN 1 END) as no_due_date_count,
    COUNT(CASE WHEN status NOT IN ('DONE', 'CANCELLED') THEN 1 END) as active_tasks_count
FROM task.tasks
WHERE project_id = %(project_id)s
"""


# =============================================================================
# RISK_ANALYSIS Queries
# =============================================================================

# Tiered approach:
# 1. Explicit RISK type
# 2. Keyword matching in title (only when type IS NULL)
# 3. High-severity blockers as fallback

RISKS_FROM_ISSUES_QUERY = """
SELECT
    i.id,
    i.title,
    i.severity,
    i.status,
    i.type,
    i.created_at,
    i.updated_at
FROM project.issues i
WHERE i.project_id = %(project_id)s
  AND (
      i.type = 'RISK'
      OR (
          i.type IS NULL AND (
              LOWER(i.title) LIKE '%%risk%%'
              OR LOWER(i.title) LIKE '%%위험%%'
              OR LOWER(i.title) LIKE '%%리스크%%'
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
LIMIT %(limit)s
"""

# Fallback: Without type column
RISKS_FALLBACK_QUERY = """
SELECT
    id,
    title,
    status,
    created_at
FROM project.issues
WHERE project_id = %(project_id)s
  AND (
      LOWER(title) LIKE '%%risk%%'
      OR LOWER(title) LIKE '%%위험%%'
      OR LOWER(title) LIKE '%%리스크%%'
  )
  AND status NOT IN ('CLOSED', 'RESOLVED', 'CANCELLED')
ORDER BY created_at DESC
LIMIT %(limit)s
"""

# Fallback: High-priority blockers that could be risks
BLOCKERS_AS_RISKS_QUERY = """
SELECT
    i.id,
    i.title,
    i.severity,
    i.status,
    i.type,
    i.created_at
FROM project.issues i
WHERE i.project_id = %(project_id)s
  AND i.type = 'BLOCKER'
  AND i.severity IN ('CRITICAL', 'HIGH')
  AND i.status NOT IN ('CLOSED', 'RESOLVED', 'CANCELLED')
ORDER BY
    CASE i.severity WHEN 'CRITICAL' THEN 1 ELSE 2 END,
    i.created_at DESC
LIMIT 5
"""

# Judgment data: Risk counts by type
RISK_COUNTS_QUERY = """
SELECT
    COUNT(*) as total_issues,
    COUNT(CASE WHEN type = 'RISK' THEN 1 END) as explicit_risks,
    COUNT(CASE WHEN type = 'BLOCKER' AND severity IN ('CRITICAL', 'HIGH') THEN 1 END) as high_blockers,
    COUNT(CASE WHEN status NOT IN ('CLOSED', 'RESOLVED', 'CANCELLED') THEN 1 END) as active_issues
FROM project.issues
WHERE project_id = %(project_id)s
"""


# =============================================================================
# Enhanced Sprint Queries (P2)
# =============================================================================

# Sprint Burndown: Daily remaining story points
SPRINT_BURNDOWN_QUERY = """
WITH date_series AS (
    SELECT generate_series(
        s.start_date::date,
        LEAST(s.end_date::date, CURRENT_DATE),
        '1 day'::interval
    )::date as burn_date
    FROM task.sprints s
    WHERE s.id = %(sprint_id)s
      AND s.project_id = %(project_id)s
),
daily_done AS (
    SELECT
        us.updated_at::date as done_date,
        COALESCE(SUM(us.story_points), 0) as points_done
    FROM task.user_stories us
    WHERE us.sprint_id = %(sprint_id)s
      AND us.project_id = %(project_id)s
      AND us.status = 'DONE'
    GROUP BY us.updated_at::date
),
total_points AS (
    SELECT COALESCE(SUM(story_points), 0) as total
    FROM task.user_stories
    WHERE sprint_id = %(sprint_id)s
      AND project_id = %(project_id)s
)
SELECT
    ds.burn_date,
    tp.total - COALESCE(
        SUM(dd.points_done) OVER (ORDER BY ds.burn_date),
        0
    ) as remaining_points,
    tp.total as total_points
FROM date_series ds
CROSS JOIN total_points tp
LEFT JOIN daily_done dd ON dd.done_date <= ds.burn_date
GROUP BY ds.burn_date, tp.total
ORDER BY ds.burn_date
"""

# Sprint Velocity History: Past sprint completion rates
SPRINT_VELOCITY_HISTORY_QUERY = """
SELECT
    s.id,
    s.name,
    s.start_date,
    s.end_date,
    COUNT(us.id) as total_stories,
    COUNT(CASE WHEN us.status = 'DONE' THEN 1 END) as completed_stories,
    COALESCE(SUM(us.story_points), 0) as total_points,
    COALESCE(SUM(CASE WHEN us.status = 'DONE' THEN us.story_points ELSE 0 END), 0) as completed_points,
    ROUND(
        COUNT(CASE WHEN us.status = 'DONE' THEN 1 END)::numeric /
        NULLIF(COUNT(us.id), 0) * 100, 1
    ) as completion_rate,
    ROUND(
        COALESCE(SUM(CASE WHEN us.status = 'DONE' THEN us.story_points ELSE 0 END), 0)::numeric /
        NULLIF(s.end_date - s.start_date, 0), 2
    ) as velocity_per_day
FROM task.sprints s
LEFT JOIN task.user_stories us ON us.sprint_id = s.id AND us.project_id = %(project_id)s
WHERE s.project_id = %(project_id)s
  AND s.status = 'COMPLETED'
GROUP BY s.id, s.name, s.start_date, s.end_date
ORDER BY s.end_date DESC
LIMIT %(limit)s
"""

# Sprint Health Indicators: Warning signals for active sprint
SPRINT_HEALTH_INDICATORS_QUERY = """
WITH sprint_data AS (
    SELECT
        s.id,
        s.start_date,
        s.end_date,
        s.end_date - s.start_date as total_days,
        CURRENT_DATE - s.start_date as elapsed_days,
        s.end_date - CURRENT_DATE as remaining_days
    FROM task.sprints s
    WHERE s.id = %(sprint_id)s
      AND s.project_id = %(project_id)s
),
story_metrics AS (
    SELECT
        COUNT(*) as total_stories,
        COUNT(CASE WHEN status = 'DONE' THEN 1 END) as done,
        COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'BLOCKED' THEN 1 END) as blocked,
        COUNT(CASE WHEN assignee_id IS NULL AND status NOT IN ('DONE', 'CANCELLED') THEN 1 END) as unassigned,
        COALESCE(SUM(story_points), 0) as total_points,
        COALESCE(SUM(CASE WHEN status = 'DONE' THEN story_points ELSE 0 END), 0) as done_points
    FROM task.user_stories
    WHERE sprint_id = %(sprint_id)s
      AND project_id = %(project_id)s
)
SELECT
    sd.total_days,
    sd.elapsed_days,
    sd.remaining_days,
    sm.total_stories,
    sm.done,
    sm.in_progress,
    sm.blocked,
    sm.unassigned,
    sm.total_points,
    sm.done_points,
    -- Health indicators
    ROUND(sm.done::numeric / NULLIF(sm.total_stories, 0) * 100, 1) as completion_rate,
    ROUND(sd.elapsed_days::numeric / NULLIF(sd.total_days, 0) * 100, 1) as time_elapsed_pct,
    CASE
        WHEN sd.remaining_days <= 0 THEN 'OVERDUE'
        WHEN sm.blocked > 0 THEN 'AT_RISK'
        WHEN sm.unassigned > 2 THEN 'NEEDS_ATTENTION'
        WHEN (sm.done::numeric / NULLIF(sm.total_stories, 0)) <
             (sd.elapsed_days::numeric / NULLIF(sd.total_days, 0) * 0.8) THEN 'BEHIND'
        ELSE 'ON_TRACK'
    END as health_status,
    -- Expected vs actual progress
    ROUND(sd.elapsed_days::numeric / NULLIF(sd.total_days, 0) * sm.total_points, 1) as expected_done_points,
    CASE
        WHEN sm.done_points >= (sd.elapsed_days::numeric / NULLIF(sd.total_days, 0) * sm.total_points)
        THEN true ELSE false
    END as is_on_pace
FROM sprint_data sd
CROSS JOIN story_metrics sm
"""

# Sprint comparison: Current vs ideal burndown
SPRINT_IDEAL_BURNDOWN_QUERY = """
WITH sprint_info AS (
    SELECT
        id,
        start_date,
        end_date,
        end_date - start_date as total_days
    FROM task.sprints
    WHERE id = %(sprint_id)s
      AND project_id = %(project_id)s
),
total_scope AS (
    SELECT COALESCE(SUM(story_points), 0) as total_points
    FROM task.user_stories
    WHERE sprint_id = %(sprint_id)s
      AND project_id = %(project_id)s
)
SELECT
    si.start_date,
    si.end_date,
    si.total_days,
    ts.total_points,
    ROUND(ts.total_points::numeric / NULLIF(si.total_days, 0), 2) as ideal_daily_burn,
    ts.total_points - (
        SELECT COALESCE(SUM(story_points), 0)
        FROM task.user_stories
        WHERE sprint_id = %(sprint_id)s
          AND project_id = %(project_id)s
          AND status = 'DONE'
    ) as current_remaining
FROM sprint_info si
CROSS JOIN total_scope ts
"""


# =============================================================================
# COMPLETED_TASKS Queries
# =============================================================================

# Get completed tasks for a project
COMPLETED_TASKS_QUERY = """
SELECT
    t.id,
    t.title,
    t.status,
    t.priority,
    t.due_date,
    t.updated_at,
    us.story_points,
    us.title as story_title
FROM task.tasks t
LEFT JOIN task.user_stories us ON t.user_story_id = us.id AND us.project_id = %(project_id)s
WHERE t.project_id = %(project_id)s
  AND t.status = 'DONE'
ORDER BY
    t.updated_at DESC,
    CASE t.priority
        WHEN 'CRITICAL' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'MEDIUM' THEN 3
        WHEN 'LOW' THEN 4
        ELSE 5
    END
LIMIT %(limit)s
"""

# Fallback: Without completed_at column (older schema)
COMPLETED_TASKS_FALLBACK_QUERY = """
SELECT
    t.id,
    t.title,
    t.status,
    t.priority,
    t.due_date,
    us.title as story_title
FROM task.tasks t
LEFT JOIN task.user_stories us ON t.user_story_id = us.id AND us.project_id = %(project_id)s
WHERE t.project_id = %(project_id)s
  AND t.status = 'DONE'
ORDER BY t.updated_at DESC
LIMIT %(limit)s
"""

# Judgment data: Completed task counts
COMPLETED_TASKS_COUNTS_QUERY = """
SELECT
    COUNT(*) as all_tasks_count,
    COUNT(CASE WHEN status = 'DONE' THEN 1 END) as completed_count,
    COUNT(CASE WHEN status NOT IN ('DONE', 'CANCELLED') THEN 1 END) as active_count
FROM task.tasks
WHERE project_id = %(project_id)s
"""


# =============================================================================
# TASKS_BY_STATUS Queries
# =============================================================================

# Get tasks filtered by status (REVIEW, IN_PROGRESS, etc.)
TASKS_BY_STATUS_QUERY = """
SELECT
    t.id,
    t.title,
    t.status,
    t.priority,
    t.due_date,
    us.story_points,
    us.title as story_title
FROM task.tasks t
LEFT JOIN task.user_stories us ON t.user_story_id = us.id AND us.project_id = %(project_id)s
WHERE t.project_id = %(project_id)s
  AND t.status = %(status)s
ORDER BY
    CASE t.priority
        WHEN 'CRITICAL' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'MEDIUM' THEN 3
        WHEN 'LOW' THEN 4
        ELSE 5
    END,
    t.updated_at DESC
LIMIT %(limit)s
"""

# Get tasks in review/testing status (legacy combined query)
TASKS_IN_REVIEW_QUERY = """
SELECT
    t.id,
    t.title,
    t.status,
    t.priority,
    t.due_date,
    us.story_points,
    us.title as story_title
FROM task.tasks t
LEFT JOIN task.user_stories us ON t.user_story_id = us.id AND us.project_id = %(project_id)s
WHERE t.project_id = %(project_id)s
  AND t.status IN ('REVIEW', 'IN_REVIEW', 'TESTING', 'QA')
ORDER BY
    CASE t.priority
        WHEN 'CRITICAL' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'MEDIUM' THEN 3
        WHEN 'LOW' THEN 4
        ELSE 5
    END,
    t.updated_at DESC
LIMIT %(limit)s
"""

# Phase 3: Separate code review and testing queries
TASKS_IN_CODE_REVIEW_QUERY = """
SELECT
    t.id,
    t.title,
    t.status,
    t.priority,
    t.due_date,
    us.story_points,
    us.title as story_title
FROM task.tasks t
LEFT JOIN task.user_stories us ON t.user_story_id = us.id AND us.project_id = %(project_id)s
WHERE t.project_id = %(project_id)s
  AND t.status IN ('REVIEW', 'IN_REVIEW')
ORDER BY
    CASE t.priority
        WHEN 'CRITICAL' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'MEDIUM' THEN 3
        WHEN 'LOW' THEN 4
        ELSE 5
    END,
    t.updated_at DESC
LIMIT %(limit)s
"""

TASKS_IN_TESTING_QUERY = """
SELECT
    t.id,
    t.title,
    t.status,
    t.priority,
    t.due_date,
    us.story_points,
    us.title as story_title
FROM task.tasks t
LEFT JOIN task.user_stories us ON t.user_story_id = us.id AND us.project_id = %(project_id)s
WHERE t.project_id = %(project_id)s
  AND t.status IN ('TESTING', 'QA')
ORDER BY
    CASE t.priority
        WHEN 'CRITICAL' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'MEDIUM' THEN 3
        WHEN 'LOW' THEN 4
        ELSE 5
    END,
    t.updated_at DESC
LIMIT %(limit)s
"""

# Get tasks in progress status
TASKS_IN_PROGRESS_QUERY = """
SELECT
    t.id,
    t.title,
    t.status,
    t.priority,
    t.due_date,
    us.story_points,
    us.title as story_title
FROM task.tasks t
LEFT JOIN task.user_stories us ON t.user_story_id = us.id AND us.project_id = %(project_id)s
WHERE t.project_id = %(project_id)s
  AND t.status IN ('IN_PROGRESS', 'DOING', 'WIP')
ORDER BY
    CASE t.priority
        WHEN 'CRITICAL' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'MEDIUM' THEN 3
        WHEN 'LOW' THEN 4
        ELSE 5
    END,
    t.updated_at DESC
LIMIT %(limit)s
"""


# =============================================================================
# KANBAN_OVERVIEW Queries (Phase 2)
# =============================================================================

# Kanban board summary: task counts per column
KANBAN_OVERVIEW_QUERY = """
SELECT
    kc.name as column_name,
    kc.order_num,
    kc.color,
    kc.wip_limit,
    COUNT(t.id) as task_count,
    COUNT(CASE WHEN t.priority IN ('CRITICAL', 'HIGH') THEN 1 END) as high_priority_count
FROM task.kanban_columns kc
LEFT JOIN task.tasks t ON t.column_id = kc.id
WHERE kc.project_id = %(project_id)s
GROUP BY kc.id, kc.name, kc.order_num, kc.color, kc.wip_limit
ORDER BY kc.order_num
"""

# Fallback: without wip_limit/color columns
KANBAN_OVERVIEW_FALLBACK_QUERY = """
SELECT
    kc.name as column_name,
    kc.order_num,
    COUNT(t.id) as task_count
FROM task.kanban_columns kc
LEFT JOIN task.tasks t ON t.column_id = kc.id
WHERE kc.project_id = %(project_id)s
GROUP BY kc.id, kc.name, kc.order_num
ORDER BY kc.order_num
"""


# =============================================================================
# BACKLOG_TASKS Query (Phase 4A)
# =============================================================================

# Tasks in the backlog kanban column (complements user_stories backlog)
BACKLOG_TASKS_QUERY = """
SELECT
    t.id,
    t.title,
    t.status,
    t.priority,
    t.due_date,
    us.title as story_title
FROM task.tasks t
JOIN task.kanban_columns kc ON t.column_id = kc.id
LEFT JOIN task.user_stories us ON t.user_story_id = us.id AND us.project_id = %(project_id)s
WHERE kc.project_id = %(project_id)s
  AND kc.order_num = 1
ORDER BY
    CASE t.priority
        WHEN 'CRITICAL' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'MEDIUM' THEN 3
        WHEN 'LOW' THEN 4
        ELSE 5
    END,
    t.created_at DESC
LIMIT %(limit)s
"""


# =============================================================================
# SPRINT_TODO_TASKS Query (Phase 4B)
# =============================================================================

# Tasks in active sprint that haven't started (status = TODO)
SPRINT_TODO_TASKS_QUERY = """
SELECT
    t.id,
    t.title,
    t.status,
    t.priority,
    t.due_date,
    us.title as story_title
FROM task.tasks t
LEFT JOIN task.user_stories us ON t.user_story_id = us.id AND us.project_id = %(project_id)s
WHERE t.project_id = %(project_id)s
  AND t.sprint_id = %(sprint_id)s
  AND t.status = 'TODO'
ORDER BY
    CASE t.priority
        WHEN 'CRITICAL' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'MEDIUM' THEN 3
        WHEN 'LOW' THEN 4
        ELSE 5
    END
LIMIT %(limit)s
"""


# =============================================================================
# WBS Entity Progress Queries (P6 Implementation)
# =============================================================================

# Step 1: Exact name match across WBS hierarchy (priority-ordered UNION ALL)
# NULL preservation: progress returned as-is, progress_is_null flag separate
# Priority 0 = phase, 1 = item, 2 = group, 3 = task
WBS_ENTITY_EXACT_SEARCH_QUERY = """
SELECT
    0 AS priority,
    'phase' AS entity_type,
    p.id, NULL AS code, p.name, p.status,
    p.progress,
    NULL AS planned_start_date, NULL AS planned_end_date,
    NULL AS actual_start_date, NULL AS actual_end_date,
    NULL AS estimated_hours, NULL AS actual_hours,
    NULL AS parent_group_name,
    p.name AS phase_name,
    (p.progress IS NULL) AS progress_is_null
FROM project.phases p
WHERE p.project_id = %(project_id)s
  AND LOWER(p.name) = LOWER(%(term)s)

UNION ALL

SELECT
    1 AS priority,
    'wbs_item' AS entity_type,
    wi.id, wi.code, wi.name, wi.status,
    wi.progress,
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
    wi.name AS parent_group_name,
    p.name AS phase_name,
    (wt.progress IS NULL) AS progress_is_null
FROM project.wbs_tasks wt
JOIN project.wbs_items wi ON wt.item_id = wi.id
JOIN project.wbs_groups wg ON wt.group_id = wg.id
JOIN project.phases p ON wg.phase_id = p.id
WHERE p.project_id = %(project_id)s
  AND LOWER(wt.name) = LOWER(%(term)s)

ORDER BY priority, name
LIMIT %(limit)s
"""

# Step 2: Fuzzy match (ILIKE with escape) - only when exact returns 0 rows
# Pattern generation: f"%{term.replace('%','\\%').replace('_','\\_')}%"
WBS_ENTITY_FUZZY_SEARCH_QUERY = """
SELECT
    0 AS priority,
    'phase' AS entity_type,
    p.id, NULL AS code, p.name, p.status,
    p.progress,
    NULL AS planned_start_date, NULL AS planned_end_date,
    NULL AS actual_start_date, NULL AS actual_end_date,
    NULL AS estimated_hours, NULL AS actual_hours,
    NULL AS parent_group_name,
    p.name AS phase_name,
    (p.progress IS NULL) AS progress_is_null
FROM project.phases p
WHERE p.project_id = %(project_id)s
  AND p.name ILIKE %(pattern)s ESCAPE '\\'

UNION ALL

SELECT
    1 AS priority,
    'wbs_item' AS entity_type,
    wi.id, wi.code, wi.name, wi.status,
    wi.progress,
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
  AND wi.name ILIKE %(pattern)s ESCAPE '\\'

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
  AND wg.name ILIKE %(pattern)s ESCAPE '\\'

UNION ALL

SELECT
    3 AS priority,
    'wbs_task' AS entity_type,
    wt.id, wt.code, wt.name, wt.status,
    wt.progress,
    wt.planned_start_date, wt.planned_end_date,
    wt.actual_start_date, wt.actual_end_date,
    wt.estimated_hours, wt.actual_hours,
    wi.name AS parent_group_name,
    p.name AS phase_name,
    (wt.progress IS NULL) AS progress_is_null
FROM project.wbs_tasks wt
JOIN project.wbs_items wi ON wt.item_id = wi.id
JOIN project.wbs_groups wg ON wt.group_id = wg.id
JOIN project.phases p ON wg.phase_id = p.id
WHERE p.project_id = %(project_id)s
  AND wt.name ILIKE %(pattern)s ESCAPE '\\'

ORDER BY priority, name
LIMIT %(limit)s
"""

# WBS item children (tasks) aggregate - NULL-safe weighted progress
# COALESCE(weight, 100): treat NULL weight as default 100 to prevent
# silent exclusion from weighted average when weight column is unset
WBS_ITEM_CHILDREN_QUERY = """
SELECT
    wt.status,
    COUNT(*) AS task_count,
    SUM(wt.progress * COALESCE(wt.weight, 100))
        FILTER (WHERE wt.progress IS NOT NULL) AS weighted_progress_nonnull,
    SUM(COALESCE(wt.weight, 100))
        FILTER (WHERE wt.progress IS NOT NULL) AS total_weight_nonnull,
    COUNT(*) FILTER (WHERE wt.progress IS NULL) AS null_progress_count,
    COUNT(*) AS total_count,
    SUM(COALESCE(wt.estimated_hours, 0)) AS total_estimated_hours,
    SUM(COALESCE(wt.actual_hours, 0)) AS total_actual_hours
FROM project.wbs_tasks wt
WHERE wt.item_id = %(item_id)s
GROUP BY wt.status
ORDER BY wt.status
"""

# WBS group children (items) aggregate - NULL-safe
WBS_GROUP_CHILDREN_QUERY = """
SELECT
    wi.status,
    COUNT(*) AS item_count,
    SUM(wi.progress * COALESCE(wi.weight, 100))
        FILTER (WHERE wi.progress IS NOT NULL) AS weighted_progress_nonnull,
    SUM(COALESCE(wi.weight, 100))
        FILTER (WHERE wi.progress IS NOT NULL) AS total_weight_nonnull,
    COUNT(*) FILTER (WHERE wi.progress IS NULL) AS null_progress_count,
    COUNT(*) AS total_count
FROM project.wbs_items wi
WHERE wi.group_id = %(group_id)s
GROUP BY wi.status
ORDER BY wi.status
"""

# WBS phase children (groups) aggregate - NULL-safe
# Includes groups from child phases (parent_id) for hierarchical phases
WBS_PHASE_CHILDREN_QUERY = """
SELECT
    wg.status,
    COUNT(*) AS item_count,
    SUM(wg.progress * COALESCE(wg.weight, 100))
        FILTER (WHERE wg.progress IS NOT NULL) AS weighted_progress_nonnull,
    SUM(COALESCE(wg.weight, 100))
        FILTER (WHERE wg.progress IS NOT NULL) AS total_weight_nonnull,
    COUNT(*) FILTER (WHERE wg.progress IS NULL) AS null_progress_count,
    COUNT(*) AS total_count
FROM project.wbs_groups wg
WHERE wg.phase_id IN (
    SELECT %(phase_id)s
    UNION ALL
    SELECT id FROM project.phases WHERE parent_id = %(phase_id)s
)
GROUP BY wg.status
ORDER BY wg.status
"""

# WBS project overview - group-level progress summary
WBS_PROJECT_OVERVIEW_QUERY = """
SELECT
    wg.id AS group_id,
    wg.code,
    wg.name,
    wg.status,
    wg.progress,
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
ORDER BY p.name, wg.order_num
"""

# User story title search (fallback when no WBS match)
USER_STORY_SEARCH_QUERY = """
SELECT
    4 AS priority,
    'user_story' AS entity_type,
    us.id, NULL AS code, us.title AS name, us.status,
    NULL AS progress,
    NULL AS planned_start_date, NULL AS planned_end_date,
    NULL AS actual_start_date, NULL AS actual_end_date,
    NULL AS estimated_hours, NULL AS actual_hours,
    NULL AS parent_group_name,
    NULL AS phase_name,
    true AS progress_is_null
FROM task.user_stories us
WHERE us.project_id = %(project_id)s
  AND LOWER(us.title) LIKE LOWER(%(pattern)s)
  AND us.status NOT IN ('DONE', 'CANCELLED', 'ARCHIVED')
ORDER BY us.updated_at DESC
LIMIT %(limit)s
"""
