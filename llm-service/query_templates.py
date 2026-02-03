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
FROM user_story us
LEFT JOIN users u ON us.created_by = u.id
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
FROM user_story us
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
FROM user_story
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
FROM sprint s
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
FROM user_story us
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
FROM user_story
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
FROM sprint s
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
FROM task t
LEFT JOIN user_story us ON t.user_story_id = us.id AND us.project_id = %(project_id)s
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
FROM task
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
FROM task t
LEFT JOIN user_story us ON t.user_story_id = us.id AND us.project_id = %(project_id)s
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
FROM task
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
FROM issue i
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
FROM issue
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
FROM issue i
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
FROM issue
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
    FROM sprint s
    WHERE s.id = %(sprint_id)s
      AND s.project_id = %(project_id)s
),
daily_done AS (
    SELECT
        us.updated_at::date as done_date,
        COALESCE(SUM(us.story_points), 0) as points_done
    FROM user_story us
    WHERE us.sprint_id = %(sprint_id)s
      AND us.project_id = %(project_id)s
      AND us.status = 'DONE'
    GROUP BY us.updated_at::date
),
total_points AS (
    SELECT COALESCE(SUM(story_points), 0) as total
    FROM user_story
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
FROM sprint s
LEFT JOIN user_story us ON us.sprint_id = s.id AND us.project_id = %(project_id)s
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
    FROM sprint s
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
    FROM user_story
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
    FROM sprint
    WHERE id = %(sprint_id)s
      AND project_id = %(project_id)s
),
total_scope AS (
    SELECT COALESCE(SUM(story_points), 0) as total_points
    FROM user_story
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
        FROM user_story
        WHERE sprint_id = %(sprint_id)s
          AND project_id = %(project_id)s
          AND status = 'DONE'
    ) as current_remaining
FROM sprint_info si
CROSS JOIN total_scope ts
"""
