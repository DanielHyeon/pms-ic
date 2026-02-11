"""
Intent-specific handlers for AI Assistant.

Each handler:
1. Queries data via db_query.py (with safety guards)
2. Returns minimal fields (title/status only, no description for privacy)
3. Builds ResponseContract for rendering
4. GRACEFULLY DEGRADES on errors (returns empty result + error_code)

============================================================
GRACEFUL DEGRADATION STRATEGY (Risk J) - P1 Enhanced
============================================================
- If query fails: return empty data + error_code + warning message
- If schema mismatch: try fallback query, then empty + warning
- NEVER crash or raise exception to caller
- Always return valid ResponseContract with error_code set
- P1: Use judgment data to distinguish "no data" vs "no due_date set"
- P1: DB failure vs empty data are clearly separated
============================================================

Reference: docs/P1_DATA_QUERY_AND_DEGRADATION.md
"""

import logging
from datetime import datetime, timedelta
from typing import List, Optional, Callable
from dataclasses import dataclass

from contracts.response_contract import ResponseContract, ErrorCode
from query.db_query import execute_query, execute_query_with_fallback, QueryResult
from query.governance_query_templates import (
    ROLE_LIST_QUERY,
    CAPABILITY_CHECK_BY_USER, CAPABILITY_CHECK_ALL,
    DELEGATION_LIST_QUERY, DELEGATION_STATS_QUERY,
    DELEGATION_MAP_QUERY,
    GOVERNANCE_FINDINGS_QUERY, SOD_VIOLATION_CHECK_QUERY,
)
from query.query_templates import (
    BACKLOG_LIST_QUERY, BACKLOG_LIST_FALLBACK_QUERY, BACKLOG_SUMMARY_QUERY,
    ACTIVE_SPRINT_QUERY, SPRINT_STORIES_QUERY, SPRINT_METRICS_QUERY,
    TASKS_DUE_THIS_WEEK_QUERY, TASKS_DUE_THIS_WEEK_FALLBACK_QUERY,
    TASKS_OVERDUE_QUERY, TASK_COUNTS_QUERY,
    RISKS_FROM_ISSUES_QUERY, RISKS_FALLBACK_QUERY, BLOCKERS_AS_RISKS_QUERY,
    COMPLETED_TASKS_QUERY, COMPLETED_TASKS_FALLBACK_QUERY, COMPLETED_TASKS_COUNTS_QUERY,
    TASKS_IN_REVIEW_QUERY, TASKS_IN_PROGRESS_QUERY,
    TASKS_IN_CODE_REVIEW_QUERY, TASKS_IN_TESTING_QUERY, TASKS_BY_STATUS_QUERY,
    KANBAN_OVERVIEW_QUERY, KANBAN_OVERVIEW_FALLBACK_QUERY,
    BACKLOG_TASKS_QUERY,
    SPRINT_TODO_TASKS_QUERY,
    WBS_ENTITY_EXACT_SEARCH_QUERY, WBS_ENTITY_FUZZY_SEARCH_QUERY,
    WBS_ITEM_CHILDREN_QUERY, WBS_GROUP_CHILDREN_QUERY, WBS_PHASE_CHILDREN_QUERY,
    USER_STORY_SEARCH_QUERY,
    calculate_kst_week_boundaries, get_kst_reference_time,
)
from contracts.degradation_tips import (
    get_db_failure_plan, get_empty_data_plan, get_tips_for_intent,
    DegradationReason, DegradationPlan,
    EMPTY_DATA_TIPS, DB_FAILURE_TIPS,
)
from utils.korean_normalizer import apply_typo_corrections, fuzzy_keyword_in_query

logger = logging.getLogger(__name__)

# Use zoneinfo (Python 3.9+ stdlib) - no external dependency
try:
    from zoneinfo import ZoneInfo
    KST = ZoneInfo("Asia/Seoul")
except ImportError:
    import pytz
    KST = pytz.timezone("Asia/Seoul")


# =============================================================================
# Handler Context
# =============================================================================

@dataclass
class HandlerContext:
    """Context passed to all handlers"""
    project_id: str
    user_access_level: int = 6  # Default: MEMBER (lowest)
    user_role: str = "MEMBER"
    message: str = ""


# =============================================================================
# Helper: Create Error Response (Graceful Degradation)
# =============================================================================

def _create_error_response(
    intent: str,
    project_id: str,
    error_message: str,
    error_code: str,
    tips: List[str],
) -> ResponseContract:
    """
    Create a graceful error response instead of crashing.

    GRACEFUL DEGRADATION: Returns valid contract with error_code.
    """
    return ResponseContract(
        intent=intent,
        reference_time=get_kst_reference_time(),
        scope=f"Project: {project_id}",
        data={},
        warnings=[f"Data retrieval failed: {error_message}"],
        tips=tips,
        error_code=error_code,
        provenance="Unavailable",
    )


# =============================================================================
# BACKLOG_LIST Handler (P1 Enhanced)
# =============================================================================

def handle_backlog_list(ctx: HandlerContext) -> ResponseContract:
    """
    Handle backlog list queries with P1 graceful degradation.

    P1 Enhancements:
    - Uses query_templates.py for SQL
    - Gets summary data for degradation decisions
    - Uses degradation_tips.py for proper plan selection
    - Clearly separates DB failure from empty data

    Output: title, status, priority, story_points only
    NO description (privacy concern)
    """
    logger.info(f"[BACKLOG_LIST] project={ctx.project_id}")

    items = []
    backlog_tasks = []
    summary = {}
    db_failed = False

    try:
        # Primary query: Get backlog user stories (sprint_id IS NULL)
        result = execute_query_with_fallback(
            sql=BACKLOG_LIST_QUERY,
            params={"project_id": ctx.project_id, "limit": 20},
            fallback_sql=BACKLOG_LIST_FALLBACK_QUERY,
            limit=20,
        )

        if not result.success:
            db_failed = True
            logger.error(f"Backlog query failed: {result.error}")
        else:
            items = result.data

            # P1: Get summary data for degradation decisions
            summary_result = execute_query(
                BACKLOG_SUMMARY_QUERY,
                {"project_id": ctx.project_id},
                limit=1,
            )
            if summary_result.success and summary_result.data:
                summary = summary_result.data[0]

        # Phase 4A: Also get tasks from the Backlog kanban column
        if not db_failed:
            try:
                tasks_result = execute_query(
                    BACKLOG_TASKS_QUERY,
                    {"project_id": ctx.project_id, "limit": 20},
                    limit=20,
                )
                if tasks_result.success:
                    backlog_tasks = tasks_result.data
            except Exception:
                pass  # Tasks are supplementary, don't fail on this

    except Exception as e:
        logger.exception(f"Unexpected error in handle_backlog_list: {e}")
        db_failed = True

    # P1: Get degradation plan based on data state
    judgment_data = {"items": items, "summary": summary}

    if db_failed:
        plan = DB_FAILURE_TIPS.get("default")
        warnings = [plan.message]
        tips = plan.tips + plan.next_actions
        error_code = ErrorCode.DB_QUERY_FAILED
    elif not items:
        plan = EMPTY_DATA_TIPS.get("backlog_list")
        warnings = [plan.message] if plan else ["No backlog items found"]
        tips = (plan.tips + plan.next_actions) if plan else []
        error_code = None  # Not an error, just empty
    else:
        warnings = []
        tips = []
        error_code = None

    return ResponseContract(
        intent="backlog_list",
        reference_time=get_kst_reference_time(),
        scope=f"Project: {ctx.project_id}",
        data={
            "items": items,
            "tasks": backlog_tasks,
            "count": len(items),
            "task_count": len(backlog_tasks),
            "summary": summary,
            "was_limited": getattr(result, 'was_limited', False) if not db_failed else False,
        },
        warnings=warnings,
        tips=tips,
        error_code=error_code,
        provenance="Unavailable" if db_failed else "realtime",
    )


# =============================================================================
# SPRINT_PROGRESS Handler (P1 Enhanced)
# =============================================================================

def handle_sprint_progress(ctx: HandlerContext) -> ResponseContract:
    """
    Handle sprint progress queries with P1 graceful degradation.

    P1 Enhancements:
    - Uses query_templates.py for SQL
    - Detects sprint overdue/invalid dates flags
    - Uses degradation_tips.py for proper plan selection

    Output: sprint name, goal, dates, story counts by status
    NO assignee details (privacy concern)
    """
    logger.info(f"[SPRINT_PROGRESS] project={ctx.project_id}")

    sprint = None
    stories = []
    todo_tasks = []
    metrics = {"total": 0, "done": 0, "in_progress": 0, "completion_rate": 0}
    db_failed = False

    try:
        # Query active sprint with P1 fields (is_overdue, has_invalid_dates)
        sprint_result = execute_query(
            ACTIVE_SPRINT_QUERY,
            {"project_id": ctx.project_id},
            limit=1,
        )

        if not sprint_result.success:
            db_failed = True
            logger.error(f"Sprint query failed: {sprint_result.error}")
        else:
            sprint = sprint_result.data[0] if sprint_result.data else None

            if sprint:
                # Query stories in sprint
                story_result = execute_query(
                    SPRINT_STORIES_QUERY,
                    {"sprint_id": sprint["id"], "project_id": ctx.project_id},
                )
                stories = story_result.data if story_result.success else []

                # Get sprint metrics
                metrics_result = execute_query(
                    SPRINT_METRICS_QUERY,
                    {"sprint_id": sprint["id"], "project_id": ctx.project_id},
                    limit=1,
                )
                if metrics_result.success and metrics_result.data:
                    raw_metrics = metrics_result.data[0]
                    total = int(raw_metrics.get("total_stories", 0) or 0)
                    done = int(raw_metrics.get("done_stories", 0) or 0)
                    in_progress = int(raw_metrics.get("in_progress", 0) or 0)
                    metrics = {
                        "total": total,
                        "done": done,
                        "in_progress": in_progress,
                        "in_review": int(raw_metrics.get("in_review", 0) or 0),
                        "todo": int(raw_metrics.get("todo", 0) or 0),
                        "completion_rate": round((done / total * 100), 1) if total > 0 else 0,
                        "total_points": int(raw_metrics.get("total_points", 0) or 0),
                        "done_points": int(raw_metrics.get("done_points", 0) or 0),
                    }

                # Phase 4B: Detect "not started" sub-query and get TODO tasks
                _not_started_kws = ["시작 안", "시작 안한", "대기", "아직", "안한", "todo", "할 일"]
                msg_lower = ctx.message.lower()
                if any(kw in msg_lower for kw in _not_started_kws):
                    todo_result = execute_query(
                        SPRINT_TODO_TASKS_QUERY,
                        {"project_id": ctx.project_id, "sprint_id": sprint["id"], "limit": 30},
                        limit=30,
                    )
                    if todo_result.success:
                        todo_tasks = todo_result.data

    except Exception as e:
        logger.exception(f"Unexpected error in handle_sprint_progress: {e}")
        db_failed = True

    # P1: Get degradation plan based on data state
    if db_failed:
        plan = DB_FAILURE_TIPS.get("default")
        warnings = [plan.message]
        tips = plan.tips + plan.next_actions
        error_code = ErrorCode.DB_QUERY_FAILED
    elif not sprint:
        plan = EMPTY_DATA_TIPS.get("sprint_progress")
        warnings = [plan.message] if plan else ["No active sprint found"]
        tips = (plan.tips + plan.next_actions) if plan else []
        error_code = None
    elif sprint.get("has_invalid_dates"):
        warnings = ["Sprint has invalid date configuration (end date before start date)"]
        tips = ["Edit sprint to correct the dates", "Ensure end_date > start_date"]
        error_code = None
    elif sprint.get("is_overdue"):
        warnings = ["Sprint end date has passed but status is still ACTIVE"]
        tips = [
            "Review sprint completion and close it",
            "Move incomplete stories to backlog or next sprint",
            "Conduct sprint retrospective",
        ]
        error_code = None
    else:
        warnings = []
        tips = []
        error_code = None

    scope = f"Project: {ctx.project_id}"
    if sprint:
        scope += f", Sprint: {sprint.get('name', 'Unknown')}"

    return ResponseContract(
        intent="sprint_progress",
        reference_time=get_kst_reference_time(),
        scope=scope,
        data={
            "sprint": sprint,
            "stories": stories,
            "metrics": metrics,
            "todo_tasks": todo_tasks,
        },
        warnings=warnings,
        tips=tips,
        error_code=error_code,
        provenance="Unavailable" if db_failed else "realtime",
    )


# =============================================================================
# TASK_DUE_THIS_WEEK Handler (P1 Enhanced)
# =============================================================================

def handle_tasks_due_this_week(ctx: HandlerContext) -> ResponseContract:
    """
    Handle tasks due this week queries with P1 3-way degradation branching.

    P1 Enhancements:
    - Uses query_templates.py for SQL
    - Gets TASK_COUNTS_QUERY for judgment data
    - Gets overdue tasks separately
    - 3-way degradation: no tasks | no due dates | none this week

    IMPORTANT (Risk 5): Week boundaries calculated in Python (KST).
    Uses date objects with < next_start pattern for accuracy.
    """
    logger.info(f"[TASK_DUE_THIS_WEEK] project={ctx.project_id}")

    tasks = []
    overdue = []
    task_counts = {}
    db_failed = False

    try:
        # Calculate KST week boundaries (returns date objects)
        week_bounds = calculate_kst_week_boundaries()
        week_start = week_bounds["week_start"]
        week_end = week_bounds["week_end"]

        # P1 CRITICAL: Get task counts FIRST for judgment data
        counts_result = execute_query(
            TASK_COUNTS_QUERY,
            {"project_id": ctx.project_id},
            limit=1,
        )
        if counts_result.success and counts_result.data:
            task_counts = counts_result.data[0]

        # Get tasks due this week
        result = execute_query_with_fallback(
            sql=TASKS_DUE_THIS_WEEK_QUERY,
            params={
                "project_id": ctx.project_id,
                "week_start": week_start,
                "week_end": week_end,
                "limit": 30,
            },
            fallback_sql=TASKS_DUE_THIS_WEEK_FALLBACK_QUERY,
            limit=30,
        )

        if not result.success:
            db_failed = True
            logger.error(f"Tasks due query failed: {result.error}")
        else:
            tasks = result.data

            # P1: Get overdue tasks separately
            overdue_result = execute_query(
                TASKS_OVERDUE_QUERY,
                {"project_id": ctx.project_id},
                limit=10,
            )
            if overdue_result.success:
                overdue = overdue_result.data

    except Exception as e:
        logger.exception(f"Unexpected error in handle_tasks_due_this_week: {e}")
        db_failed = True

    # P1: 3-way degradation branching
    all_tasks_count = int(task_counts.get("all_tasks_count", 0) or 0)
    no_due_date_count = int(task_counts.get("no_due_date_count", 0) or 0)
    active_tasks_count = int(task_counts.get("active_tasks_count", 0) or 0)

    if db_failed:
        plan = DB_FAILURE_TIPS.get("default")
        warnings = [plan.message]
        tips = plan.tips + plan.next_actions
        error_code = ErrorCode.DB_QUERY_FAILED
    elif not tasks:
        # Use judgment data to determine the right degradation message
        if all_tasks_count == 0:
            # Case 1: No tasks at all in the project
            warnings = ["No tasks created in this project"]
            tips = [
                "Break down user stories into tasks",
                "Create tasks from Kanban Board",
                "Each task should be completable in 1-2 days",
                "Assign tasks to team members",
            ]
        elif active_tasks_count > 0 and no_due_date_count >= active_tasks_count * 0.5:
            # Case 2: Tasks exist but many (>=50%) have no due_date
            warnings = ["Tasks exist but most don't have due dates set"]
            tips = [
                "Set due_date when creating or editing tasks",
                "Break stories into tasks with specific deadlines",
                "Use daily standups to track task progress",
            ]
        else:
            # Case 3: Tasks have due dates, just none this week
            warnings = ["No tasks scheduled for this week"]
            tips = [
                "Plan weekly tasks during sprint planning",
                "Ensure active sprint has decomposed stories",
                "Set realistic due dates based on capacity",
            ]
        error_code = None
    else:
        warnings = []
        tips = []
        error_code = None

    # Add overdue warning if applicable
    if overdue and not db_failed:
        warnings.append(f"{len(overdue)} overdue task(s) require attention")

    # Scope period uses ISO format strings for display
    scope_period = f"{week_start.isoformat()} ~ {week_end.isoformat()}"

    return ResponseContract(
        intent="task_due_this_week",
        reference_time=get_kst_reference_time(),
        scope=f"Project: {ctx.project_id}, Period: {scope_period}",
        data={
            "tasks": tasks,
            "count": len(tasks),
            "overdue": overdue,
            "overdue_count": len(overdue),
            # Judgment data for debugging/observability
            "all_tasks_count": all_tasks_count,
            "no_due_date_count": no_due_date_count,
            "active_tasks_count": active_tasks_count,
            "was_limited": getattr(result, 'was_limited', False) if not db_failed else False,
        },
        warnings=warnings,
        tips=tips,
        error_code=error_code,
        provenance="Unavailable" if db_failed else "realtime",
    )


# =============================================================================
# RISK_ANALYSIS Handler (P1 Enhanced)
# =============================================================================

def handle_risk_analysis(ctx: HandlerContext) -> ResponseContract:
    """
    Handle risk analysis queries with P1 graceful degradation.

    P1 Enhancements:
    - Uses query_templates.py for SQL (tiered approach)
    - Gets blockers as fallback risks
    - Groups by severity properly

    Output: title, severity, status only
    NO description (may contain sensitive info)

    NOTE: If issue table doesn't have type/severity columns,
    falls back to title-based filtering only.
    """
    logger.info(f"[RISK_ANALYSIS] project={ctx.project_id}")

    risks = []
    blockers = []
    db_failed = False

    try:
        # Primary query: Get risks from issues
        result = execute_query_with_fallback(
            sql=RISKS_FROM_ISSUES_QUERY,
            params={"project_id": ctx.project_id, "limit": 15},
            fallback_sql=RISKS_FALLBACK_QUERY,
            limit=15,
        )

        if not result.success:
            db_failed = True
            logger.error(f"Risk analysis query failed: {result.error}")
        else:
            risks = result.data

            # P1: If no explicit risks, get high-priority blockers as potential risks
            if not risks:
                blocker_result = execute_query(
                    BLOCKERS_AS_RISKS_QUERY,
                    {"project_id": ctx.project_id},
                    limit=5,
                )
                if blocker_result.success:
                    blockers = blocker_result.data

    except Exception as e:
        logger.exception(f"Unexpected error in handle_risk_analysis: {e}")
        db_failed = True

    # Group by severity (defensive: handle None)
    by_severity = {}
    for risk in risks:
        sev = risk.get("severity") or "UNKNOWN"
        if sev not in by_severity:
            by_severity[sev] = []
        by_severity[sev].append(risk)

    # P1: Get degradation plan based on data state
    if db_failed:
        plan = DB_FAILURE_TIPS.get("default")
        warnings = [plan.message]
        tips = plan.tips + plan.next_actions
        error_code = ErrorCode.DB_QUERY_FAILED
    elif not risks:
        plan = EMPTY_DATA_TIPS.get("risk_analysis")
        warnings = [plan.message] if plan else ["No active risks registered"]
        tips = (plan.tips + plan.next_actions) if plan else []
        error_code = None
    else:
        # Check for high-severity unassigned risks (P1 criterion)
        high_unassigned = [
            r for r in risks
            if r.get("severity") in ("CRITICAL", "HIGH") and not r.get("assignee_id")
        ]
        if high_unassigned:
            warnings = [f"{len(high_unassigned)} high-severity risk(s) have no assigned owner"]
            tips = [
                "Assign owner for each CRITICAL/HIGH risk immediately",
                "Owner is responsible for monitoring and reporting",
            ]
        else:
            warnings = []
            tips = ["Update risk status regularly", "Verify mitigation plans for high-risk items"]
        error_code = None

    return ResponseContract(
        intent="risk_analysis",
        reference_time=get_kst_reference_time(),
        scope=f"Project: {ctx.project_id}",
        data={
            "risks": risks,
            "count": len(risks),
            "by_severity": by_severity,
            "blockers": blockers,
            "was_limited": getattr(result, 'was_limited', False) if not db_failed else False,
        },
        warnings=warnings,
        tips=tips,
        error_code=error_code,
        provenance="Unavailable" if db_failed else "realtime",
    )


# =============================================================================
# COMPLETED_TASKS Handler
# =============================================================================

def handle_completed_tasks(ctx: HandlerContext) -> ResponseContract:
    """
    Handle completed tasks list queries.

    Returns list of tasks with status = 'DONE' for the project.
    Output: title, status, priority, completed_at, story_title
    """
    logger.info(f"[COMPLETED_TASKS] project={ctx.project_id}")

    tasks = []
    task_counts = {}
    db_failed = False

    try:
        # Get task counts for judgment data
        counts_result = execute_query(
            COMPLETED_TASKS_COUNTS_QUERY,
            {"project_id": ctx.project_id},
            limit=1,
        )
        if counts_result.success and counts_result.data:
            task_counts = counts_result.data[0]

        # Get completed tasks
        result = execute_query_with_fallback(
            sql=COMPLETED_TASKS_QUERY,
            params={"project_id": ctx.project_id, "limit": 30},
            fallback_sql=COMPLETED_TASKS_FALLBACK_QUERY,
            limit=30,
        )

        if not result.success:
            db_failed = True
            logger.error(f"Completed tasks query failed: {result.error}")
        else:
            tasks = result.data

    except Exception as e:
        logger.exception(f"Unexpected error in handle_completed_tasks: {e}")
        db_failed = True

    # Prepare response
    all_tasks_count = int(task_counts.get("all_tasks_count", 0) or 0)
    completed_count = int(task_counts.get("completed_count", 0) or 0)

    if db_failed:
        plan = DB_FAILURE_TIPS.get("default")
        warnings = [plan.message]
        tips = plan.tips + plan.next_actions
        error_code = ErrorCode.DB_QUERY_FAILED
    elif not tasks:
        if all_tasks_count == 0:
            warnings = ["No tasks created in this project yet"]
            tips = [
                "Create tasks from user stories",
                "Break down work into smaller tasks",
            ]
        else:
            warnings = ["No completed tasks found"]
            tips = [
                "Complete tasks by changing their status to DONE",
                "Check Kanban board for task progress",
            ]
        error_code = None
    else:
        warnings = []
        tips = []
        error_code = None

    return ResponseContract(
        intent="completed_tasks",
        reference_time=get_kst_reference_time(),
        scope=f"Project: {ctx.project_id}",
        data={
            "tasks": tasks,
            "count": len(tasks),
            "all_tasks_count": all_tasks_count,
            "completed_count": completed_count,
            "was_limited": getattr(result, 'was_limited', False) if not db_failed else False,
        },
        warnings=warnings,
        tips=tips,
        error_code=error_code,
        provenance="Unavailable" if db_failed else "realtime",
    )


# =============================================================================
# TASKS_BY_STATUS Handler
# =============================================================================

def handle_tasks_by_status(ctx: HandlerContext) -> ResponseContract:
    """
    Handle tasks filtered by status queries (테스트 중인, 검토 중인, 진행 중인, etc.)

    Returns list of tasks filtered by status.
    Output: title, status, priority, story_title
    """
    logger.info(f"[TASKS_BY_STATUS] project={ctx.project_id}, message={ctx.message}")

    tasks = []
    db_failed = False
    status_filter = "REVIEW"  # Default
    query_params = {"project_id": ctx.project_id, "limit": 30}

    # Detect status from message (with typo tolerance) - 4-way routing
    message_lower = apply_typo_corrections(ctx.message).lower()
    if any(fuzzy_keyword_in_query(kw, message_lower) for kw in ["테스트", "testing", "qa"]):
        status_filter = "TESTING"
        status_label = "테스트 중"
        query = TASKS_IN_TESTING_QUERY
    elif any(fuzzy_keyword_in_query(kw, message_lower) for kw in ["검토", "리뷰", "review", "코드 리뷰"]):
        status_filter = "REVIEW"
        status_label = "코드 리뷰 중"
        query = TASKS_IN_CODE_REVIEW_QUERY
    elif any(fuzzy_keyword_in_query(kw, message_lower) for kw in ["진행", "작업 중", "doing", "wip", "in progress"]):
        status_filter = "IN_PROGRESS"
        status_label = "진행 중"
        query = TASKS_IN_PROGRESS_QUERY
    elif any(fuzzy_keyword_in_query(kw, message_lower) for kw in ["할 일", "대기", "todo", "시작 전"]):
        status_filter = "TODO"
        status_label = "할 일"
        query = TASKS_BY_STATUS_QUERY
        query_params = {"project_id": ctx.project_id, "status": "TODO", "limit": 30}
    else:
        status_label = "검토 중"
        query = TASKS_IN_CODE_REVIEW_QUERY

    try:
        result = execute_query(
            query,
            query_params,
            limit=30,
        )

        if not result.success:
            db_failed = True
            logger.error(f"Tasks by status query failed: {result.error}")
        else:
            tasks = result.data

    except Exception as e:
        logger.exception(f"Unexpected error in handle_tasks_by_status: {e}")
        db_failed = True

    # Prepare response
    if db_failed:
        plan = DB_FAILURE_TIPS.get("default")
        warnings = [plan.message]
        tips = plan.tips + plan.next_actions
        error_code = ErrorCode.DB_QUERY_FAILED
    elif not tasks:
        warnings = [f"{status_label} 태스크가 없습니다"]
        tips = [
            "Kanban 보드에서 태스크 상태를 확인하세요",
            "스프린트에 태스크가 할당되어 있는지 확인하세요",
        ]
        error_code = None
    else:
        warnings = []
        tips = []
        error_code = None

    return ResponseContract(
        intent="tasks_by_status",
        reference_time=get_kst_reference_time(),
        scope=f"Project: {ctx.project_id}",
        data={
            "tasks": tasks,
            "count": len(tasks),
            "status_filter": status_filter,
            "status_label": status_label,
            "was_limited": getattr(result, 'was_limited', False) if not db_failed else False,
        },
        warnings=warnings,
        tips=tips,
        error_code=error_code,
        provenance="Unavailable" if db_failed else "realtime",
    )


# =============================================================================
# KANBAN_OVERVIEW Handler (Phase 2)
# =============================================================================

def handle_kanban_overview(ctx: HandlerContext) -> ResponseContract:
    """
    Handle kanban board overview queries.

    Returns task counts per kanban column for the project.
    Output: column_name, task_count, wip_limit, high_priority_count
    """
    logger.info(f"[KANBAN_OVERVIEW] project={ctx.project_id}")

    columns = []
    db_failed = False

    try:
        result = execute_query_with_fallback(
            sql=KANBAN_OVERVIEW_QUERY,
            params={"project_id": ctx.project_id},
            fallback_sql=KANBAN_OVERVIEW_FALLBACK_QUERY,
            limit=20,
        )

        if not result.success:
            db_failed = True
            logger.error(f"Kanban overview query failed: {result.error}")
        else:
            columns = result.data

    except Exception as e:
        logger.exception(f"Unexpected error in handle_kanban_overview: {e}")
        db_failed = True

    total_tasks = sum(int(c.get("task_count", 0) or 0) for c in columns)
    wip_violations = [
        c for c in columns
        if c.get("wip_limit") and int(c.get("task_count", 0) or 0) > int(c.get("wip_limit", 0))
    ]

    if db_failed:
        plan = DB_FAILURE_TIPS.get("default")
        warnings = [plan.message]
        tips = plan.tips + plan.next_actions
        error_code = ErrorCode.DB_QUERY_FAILED
    elif not columns:
        plan = EMPTY_DATA_TIPS.get("kanban_overview")
        warnings = [plan.message] if plan else ["Kanban board not configured"]
        tips = (plan.tips + plan.next_actions) if plan else []
        error_code = None
    else:
        warnings = []
        tips = []
        if wip_violations:
            for v in wip_violations:
                warnings.append(
                    f"WIP limit exceeded: {v['column_name']} "
                    f"({v['task_count']}/{v['wip_limit']})"
                )
            tips.append("Review and redistribute tasks to stay within WIP limits")
        error_code = None

    return ResponseContract(
        intent="kanban_overview",
        reference_time=get_kst_reference_time(),
        scope=f"Project: {ctx.project_id}",
        data={
            "columns": columns,
            "total_tasks": total_tasks,
            "wip_violations": len(wip_violations),
        },
        warnings=warnings,
        tips=tips,
        error_code=error_code,
        provenance="Unavailable" if db_failed else "realtime",
    )


# =============================================================================
# ENTITY_PROGRESS Handler (P6 Implementation)
# =============================================================================

def handle_entity_progress(ctx: HandlerContext) -> ResponseContract:
    """
    Handle entity-specific progress queries (WBS items, groups, tasks).

    Flow:
    1. Extract entity name from message (regex capture based)
    2. 2-step search: exact match → fuzzy match (ILIKE with escape)
    3. Single match → fetch children aggregate → detailed progress
    4. Multiple matches → apply tie-breaker → best or disambiguation
    5. No WBS match → fallback to user_stories title search
    """
    from utils.entity_resolver import (
        extract_entity_name, select_best_match, calc_weighted_progress,
    )

    logger.info(f"[ENTITY_PROGRESS] project={ctx.project_id}, message={ctx.message}")

    entity_name = extract_entity_name(ctx.message)
    if not entity_name:
        entity_name = ctx.message.strip()

    matches = []
    query_mode = "exact"
    db_failed = False

    try:
        # Step 1: Exact match
        result = execute_query(
            WBS_ENTITY_EXACT_SEARCH_QUERY,
            {"project_id": ctx.project_id, "term": entity_name, "limit": 10},
            limit=10,
        )

        if not result.success:
            db_failed = True
            logger.error(f"WBS exact search failed: {result.error}")
        else:
            matches = [dict(r, match_mode="exact") for r in result.data]

            # Step 2: Fuzzy match if exact returns 0
            if not matches:
                query_mode = "ilike"
                escaped = entity_name.replace("%", "\\%").replace("_", "\\_")
                pattern = f"%{escaped}%"
                fuzzy_result = execute_query(
                    WBS_ENTITY_FUZZY_SEARCH_QUERY,
                    {"project_id": ctx.project_id, "pattern": pattern, "limit": 10},
                    limit=10,
                )
                if fuzzy_result.success:
                    matches = [dict(r, match_mode="ilike") for r in fuzzy_result.data]

            # Step 3: Fallback to user_stories if still 0
            if not matches:
                query_mode = "fallback_story"
                pattern = f"%{entity_name}%"
                story_result = execute_query(
                    USER_STORY_SEARCH_QUERY,
                    {"project_id": ctx.project_id, "pattern": pattern, "limit": 10},
                    limit=10,
                )
                if story_result.success:
                    matches = [dict(r, match_mode="ilike") for r in story_result.data]

    except Exception as e:
        logger.exception(f"Unexpected error in handle_entity_progress: {e}")
        db_failed = True

    # Build response based on match count
    if db_failed:
        plan = DB_FAILURE_TIPS.get("default")
        return ResponseContract(
            intent="entity_progress",
            reference_time=get_kst_reference_time(),
            scope=f"Project: {ctx.project_id}",
            data={},
            warnings=[plan.message],
            tips=plan.tips + plan.next_actions,
            error_code=ErrorCode.DB_QUERY_FAILED,
            provenance="Unavailable",
        )

    if not matches:
        plan = EMPTY_DATA_TIPS.get("entity_progress")
        return ResponseContract(
            intent="entity_progress",
            reference_time=get_kst_reference_time(),
            scope=f"Project: {ctx.project_id}",
            data={"search_term": entity_name, "match_count": 0},
            warnings=[plan.message] if plan else ["해당 이름의 WBS 항목을 찾을 수 없습니다."],
            tips=(plan.tips + plan.next_actions) if plan else [],
            provenance="realtime",
        )

    if len(matches) > 5:
        return ResponseContract(
            intent="entity_progress",
            reference_time=get_kst_reference_time(),
            scope=f"Project: {ctx.project_id}",
            data={
                "search_term": entity_name,
                "match_count": len(matches),
                "disambiguation": [
                    {"name": m.get("name"), "type": m.get("entity_type"),
                     "code": m.get("code"), "status": m.get("status")}
                    for m in matches[:10]
                ],
            },
            warnings=["검색 결과가 너무 많습니다. 더 구체적으로 입력해 주세요."],
            tips=[],
            provenance="realtime",
        )

    # Single or few matches → apply tie-breaker
    if len(matches) == 1:
        best = matches[0]
    else:
        best = select_best_match(matches)

    if best is None:
        # Disambiguation needed
        return ResponseContract(
            intent="entity_progress",
            reference_time=get_kst_reference_time(),
            scope=f"Project: {ctx.project_id}",
            data={
                "search_term": entity_name,
                "match_count": len(matches),
                "disambiguation": [
                    {"name": m.get("name"), "type": m.get("entity_type"),
                     "code": m.get("code"), "status": m.get("status"),
                     "progress": m.get("progress"), "phase_name": m.get("phase_name")}
                    for m in matches
                ],
            },
            warnings=[],
            tips=["원하시는 항목의 전체 이름을 입력해 주세요."],
            provenance="realtime",
        )

    # Fetch children aggregate for the best match
    children_data = {}
    completeness = {}

    try:
        entity_type = best.get("entity_type")
        pid = ctx.project_id
        if entity_type == "phase":
            children_result = execute_query(
                WBS_PHASE_CHILDREN_QUERY,
                {"phase_id": best["id"], "project_id": pid},
            )
            if children_result.success and children_result.data:
                children_data = _build_children_summary(children_result.data)
                completeness = calc_weighted_progress(children_result.data)
        elif entity_type == "wbs_item":
            children_result = execute_query(
                WBS_ITEM_CHILDREN_QUERY,
                {"item_id": best["id"], "project_id": pid},
            )
            if children_result.success and children_result.data:
                children_data = _build_children_summary(children_result.data)
                completeness = calc_weighted_progress(children_result.data)
        elif entity_type == "wbs_group":
            children_result = execute_query(
                WBS_GROUP_CHILDREN_QUERY,
                {"group_id": best["id"], "project_id": pid},
            )
            if children_result.success and children_result.data:
                children_data = _build_children_summary(children_result.data)
                completeness = calc_weighted_progress(children_result.data)
    except Exception as e:
        logger.warning(f"Children aggregate failed for {best.get('id')}: {e}")

    # Build entity data
    progress_val = best.get("progress")
    progress_is_null = best.get("progress_is_null", progress_val is None)

    # Determine calculation method
    if not completeness:
        if progress_is_null:
            completeness = {
                "calculation": "status_based",
                "null_count": 0,
                "null_ratio": 1.0,
                "confidence": "low",
            }
        else:
            completeness = {
                "calculation": "direct",
                "null_count": 0,
                "null_ratio": 0.0,
                "confidence": "medium",
            }

    # Schedule info
    schedule = _build_schedule(best)

    # Effort info
    effort = _build_effort(best)

    data = {
        "entity": {
            "type": best.get("entity_type"),
            "id": best.get("id"),
            "code": best.get("code"),
            "name": best.get("name"),
            "status": best.get("status"),
            "progress": progress_val,
            "progress_is_null": progress_is_null,
        },
        "hierarchy": {
            "phase": best.get("phase_name"),
            "group": best.get("parent_group_name"),
        },
        "schedule": schedule,
        "effort": effort,
        "children": children_data,
        "completeness": {
            "as_of": get_kst_reference_time(),
            "scope": best.get("entity_type"),
            **completeness,
        },
        "provenance": {
            "source": {
                "primary": "project.phases" if best.get("entity_type") == "phase"
                    else f"project.{best.get('entity_type', 'wbs_items')}s"
                    if best.get("entity_type", "").startswith("wbs_")
                    else "task.user_stories",
                "joins": ["project.wbs_groups"]
                    if best.get("entity_type") == "phase"
                    else ["project.wbs_groups", "project.phases"]
                    if best.get("entity_type", "").startswith("wbs_")
                    else [],
            },
            "query_mode": query_mode,
        },
        "disambiguation": None,
    }

    warnings = []
    if progress_is_null and not children_data:
        warnings.append("이 항목의 progress 값이 설정되지 않았습니다.")
    null_count = completeness.get("null_count", 0)
    if null_count > 0 and completeness.get("calculation") != "status_based":
        warnings.append(f"progress 미설정 하위 항목 {null_count}건 (가중 평균에서 제외)")

    return ResponseContract(
        intent="entity_progress",
        reference_time=get_kst_reference_time(),
        scope=f"Project: {ctx.project_id}",
        data=data,
        warnings=warnings,
        tips=[],
        provenance="realtime",
    )


def _build_children_summary(rows: list) -> dict:
    """Build children status summary from aggregate query rows."""
    total = sum(int(r.get("task_count") or r.get("item_count") or 0) for r in rows)
    by_status = {}
    total_estimated = 0
    total_actual = 0

    for r in rows:
        status = r.get("status", "UNKNOWN")
        count = int(r.get("task_count") or r.get("item_count") or 0)
        by_status[status] = count
        total_estimated += int(r.get("total_estimated_hours") or 0)
        total_actual += int(r.get("total_actual_hours") or 0)

    completed = by_status.get("COMPLETED", 0)
    completion_rate = round(completed / total * 100, 1) if total > 0 else 0.0

    result = {
        "total": total,
        "by_status": by_status,
        "completion_rate": completion_rate,
    }

    if total_estimated > 0 or total_actual > 0:
        result["total_estimated_hours"] = total_estimated
        result["total_actual_hours"] = total_actual

    return result


def _build_schedule(entity: dict) -> dict:
    """Build schedule info from entity data."""
    planned_start = entity.get("planned_start_date")
    planned_end = entity.get("planned_end_date")
    actual_start = entity.get("actual_start_date")
    actual_end = entity.get("actual_end_date")

    days_remaining = None
    is_overdue = False

    if planned_end:
        try:
            end_date = planned_end
            if isinstance(end_date, str):
                from datetime import date
                end_date = date.fromisoformat(end_date)
            from datetime import date as date_type
            today = date_type.today()
            delta = (end_date - today).days
            days_remaining = max(0, delta)
            is_overdue = delta < 0
        except (ValueError, TypeError):
            pass

    return {
        "planned_start": str(planned_start) if planned_start else None,
        "planned_end": str(planned_end) if planned_end else None,
        "actual_start": str(actual_start) if actual_start else None,
        "actual_end": str(actual_end) if actual_end else None,
        "days_remaining": days_remaining,
        "is_overdue": is_overdue,
    }


def _build_effort(entity: dict) -> dict:
    """Build effort info from entity data."""
    estimated = entity.get("estimated_hours")
    actual = entity.get("actual_hours")

    estimated_val = int(estimated) if estimated is not None else None
    actual_val = int(actual) if actual is not None else None

    effort_rate = None
    if estimated_val and estimated_val > 0 and actual_val is not None:
        effort_rate = round(actual_val / estimated_val * 100, 1)

    return {
        "estimated_hours": estimated_val,
        "actual_hours": actual_val,
        "effort_rate": effort_rate,
    }


# =============================================================================
# CASUAL Handler
# =============================================================================

def handle_casual(ctx: HandlerContext) -> ResponseContract:
    """Handle casual greetings - no DB query needed"""
    return ResponseContract(
        intent="casual",
        reference_time=get_kst_reference_time(),
        scope="",
        data={"greeting": True},
        warnings=[],
        tips=[],
    )


# =============================================================================
# UNKNOWN Handler (fallback to RAG)
# =============================================================================

def handle_unknown(ctx: HandlerContext) -> ResponseContract:
    """
    Handle unknown intents.

    Returns a contract that signals "use RAG/document_query".
    This is NOT rendered directly - it triggers the document_query path.
    """
    return ResponseContract(
        intent="unknown",
        reference_time=get_kst_reference_time(),
        scope=f"Project: {ctx.project_id}",
        data={"requires_rag": True},
        warnings=[],
        tips=[],
    )


# =============================================================================
# ROLE_LIST Handler (거버넌스: 역할 목록)
# =============================================================================

def handle_role_list(ctx: HandlerContext) -> ResponseContract:
    """역할 목록 + 멤버 수 조회. 미할당 역할 경고 포함."""
    logger.info(f"[ROLE_LIST] project={ctx.project_id}")

    roles = []
    db_failed = False
    warnings = []

    try:
        result = execute_query(
            ROLE_LIST_QUERY,
            {"project_id": ctx.project_id},
            limit=50,
        )
        if not result.success:
            db_failed = True
            logger.error(f"Role list query failed: {result.error}")
        else:
            roles = result.data
            # 멤버 미할당 역할 경고
            empty_roles = [r for r in roles if r.get("member_count", 0) == 0]
            if empty_roles:
                names = ", ".join(r.get("role_name", "") for r in empty_roles)
                warnings.append(f"멤버가 미할당된 역할: {names}")
    except Exception as e:
        logger.exception(f"Unexpected error in handle_role_list: {e}")
        db_failed = True

    if db_failed:
        return _create_error_response("role_list", ctx.project_id, "역할 목록 조회 실패", ErrorCode.DB_QUERY_FAILED, ["프로젝트 DB 연결 상태를 확인하세요"])

    return ResponseContract(
        intent="role_list",
        reference_time=get_kst_reference_time(),
        scope=f"Project: {ctx.project_id}",
        data={"roles": roles, "count": len(roles)},
        warnings=warnings,
        tips=[],
        error_code=None,
        provenance="realtime",
    )


# =============================================================================
# CAPABILITY_CHECK Handler (거버넌스: 권한 확인)
# =============================================================================

def handle_capability_check(ctx: HandlerContext) -> ResponseContract:
    """
    사용자별 유효 권한 조회.
    메시지에서 사용자 이름/ID 추출 시도 → 실패하면 전체 현황 반환.
    """
    logger.info(f"[CAPABILITY_CHECK] project={ctx.project_id}")

    items = []
    db_failed = False
    mode = "all"  # 기본: 전체 현황

    try:
        # 전체 현황 조회 (사용자별 그룹)
        result = execute_query(
            CAPABILITY_CHECK_ALL,
            {"project_id": ctx.project_id},
            limit=100,
        )
        if not result.success:
            db_failed = True
            logger.error(f"Capability check query failed: {result.error}")
        else:
            items = result.data
    except Exception as e:
        logger.exception(f"Unexpected error in handle_capability_check: {e}")
        db_failed = True

    if db_failed:
        return _create_error_response("capability_check", ctx.project_id, "권한 조회 실패", ErrorCode.DB_QUERY_FAILED, ["거버넌스 스키마 상태를 확인하세요"])

    warnings = []
    if not items:
        warnings.append("프로젝트에 할당된 유효 권한이 없습니다")

    return ResponseContract(
        intent="capability_check",
        reference_time=get_kst_reference_time(),
        scope=f"Project: {ctx.project_id}",
        data={"items": items, "count": len(items), "mode": mode},
        warnings=warnings,
        tips=[],
        error_code=None,
        provenance="realtime",
    )


# =============================================================================
# DELEGATION_LIST Handler (거버넌스: 위임 현황)
# =============================================================================

def handle_delegation_list(ctx: HandlerContext) -> ResponseContract:
    """활성 위임 목록 + 통계 + 만료 임박 경고."""
    logger.info(f"[DELEGATION_LIST] project={ctx.project_id}")

    delegations = []
    stats = []
    db_failed = False
    warnings = []

    try:
        result = execute_query(
            DELEGATION_LIST_QUERY,
            {"project_id": ctx.project_id},
            limit=50,
        )
        if not result.success:
            db_failed = True
            logger.error(f"Delegation list query failed: {result.error}")
        else:
            delegations = result.data

        # 통계 조회
        if not db_failed:
            stats_result = execute_query(
                DELEGATION_STATS_QUERY,
                {"project_id": ctx.project_id},
                limit=10,
            )
            if stats_result.success:
                stats = stats_result.data
                # 만료 임박 경고
                for s in stats:
                    expiring = s.get("expiring_soon_count", 0)
                    if expiring and expiring > 0:
                        warnings.append(f"7일 이내 만료 예정 위임: {expiring}건")

    except Exception as e:
        logger.exception(f"Unexpected error in handle_delegation_list: {e}")
        db_failed = True

    if db_failed:
        return _create_error_response("delegation_list", ctx.project_id, "위임 현황 조회 실패", ErrorCode.DB_QUERY_FAILED, ["거버넌스 스키마 상태를 확인하세요"])

    if not delegations:
        warnings.append("활성 또는 대기 중인 위임이 없습니다")

    return ResponseContract(
        intent="delegation_list",
        reference_time=get_kst_reference_time(),
        scope=f"Project: {ctx.project_id}",
        data={
            "delegations": delegations,
            "count": len(delegations),
            "stats": stats,
        },
        warnings=warnings,
        tips=[],
        error_code=None,
        provenance="realtime",
    )


# =============================================================================
# DELEGATION_MAP Handler (거버넌스: 위임 맵/트리)
# =============================================================================

def handle_delegation_map(ctx: HandlerContext) -> ResponseContract:
    """재귀 CTE 위임 트리 조회 + 재위임 깊이 경고."""
    logger.info(f"[DELEGATION_MAP] project={ctx.project_id}")

    edges = []
    db_failed = False
    warnings = []

    try:
        result = execute_query(
            DELEGATION_MAP_QUERY,
            {"project_id": ctx.project_id},
            limit=200,
        )
        if not result.success:
            db_failed = True
            logger.error(f"Delegation map query failed: {result.error}")
        else:
            edges = result.data
            # 재위임 깊이 경고 (depth >= 2)
            deep_chains = [e for e in edges if e.get("depth", 1) >= 2]
            if deep_chains:
                warnings.append(f"재위임 체인 깊이 2 이상: {len(deep_chains)}건 — 체인 관리에 주의가 필요합니다")
    except Exception as e:
        logger.exception(f"Unexpected error in handle_delegation_map: {e}")
        db_failed = True

    if db_failed:
        return _create_error_response("delegation_map", ctx.project_id, "위임 맵 조회 실패", ErrorCode.DB_QUERY_FAILED, ["거버넌스 스키마 상태를 확인하세요"])

    if not edges:
        warnings.append("활성 위임이 없어 위임 맵이 비어 있습니다")

    return ResponseContract(
        intent="delegation_map",
        reference_time=get_kst_reference_time(),
        scope=f"Project: {ctx.project_id}",
        data={"edges": edges, "count": len(edges)},
        warnings=warnings,
        tips=[],
        error_code=None,
        provenance="realtime",
    )


# =============================================================================
# GOVERNANCE_CHECK Handler (거버넌스: 검증 결과)
# =============================================================================

def handle_governance_check(ctx: HandlerContext) -> ResponseContract:
    """최근 거버넌스 검증 결과 + 실시간 SoD 검사 + 심각도별 그룹화."""
    logger.info(f"[GOVERNANCE_CHECK] project={ctx.project_id}")

    findings = []
    sod_violations = []
    db_failed = False
    warnings = []

    try:
        # 최근 검증 결과 조회
        result = execute_query(
            GOVERNANCE_FINDINGS_QUERY,
            {"project_id": ctx.project_id},
            limit=100,
        )
        if not result.success:
            db_failed = True
            logger.error(f"Governance findings query failed: {result.error}")
        else:
            findings = result.data

        # 실시간 SoD 위반 검사
        if not db_failed:
            sod_result = execute_query(
                SOD_VIOLATION_CHECK_QUERY,
                {"project_id": ctx.project_id},
                limit=50,
            )
            if sod_result.success:
                sod_violations = sod_result.data
                if sod_violations:
                    blocking = [v for v in sod_violations if v.get("is_blocking")]
                    if blocking:
                        warnings.append(f"차단 수준 SoD 위반: {len(blocking)}건 — 즉시 조치가 필요합니다")

    except Exception as e:
        logger.exception(f"Unexpected error in handle_governance_check: {e}")
        db_failed = True

    if db_failed:
        return _create_error_response("governance_check", ctx.project_id, "거버넌스 검증 조회 실패", ErrorCode.DB_QUERY_FAILED, ["거버넌스 스키마 상태를 확인하세요"])

    # 심각도별 그룹화
    severity_groups = {}
    for f in findings:
        sev = f.get("severity", "INFO")
        severity_groups.setdefault(sev, []).append(f)

    if not findings and not sod_violations:
        warnings.append("거버넌스 검증 결과가 없습니다. 검증을 실행해 주세요.")

    return ResponseContract(
        intent="governance_check",
        reference_time=get_kst_reference_time(),
        scope=f"Project: {ctx.project_id}",
        data={
            "findings": findings,
            "findings_count": len(findings),
            "sod_violations": sod_violations,
            "sod_count": len(sod_violations),
            "severity_groups": severity_groups,
        },
        warnings=warnings,
        tips=[],
        error_code=None,
        provenance="realtime",
    )


# =============================================================================
# Handler Registry
# =============================================================================

# IMPORTANT: Keys are lowercase snake_case (AnswerType.value)
INTENT_HANDLERS = {
    "backlog_list": handle_backlog_list,
    "sprint_progress": handle_sprint_progress,
    "task_due_this_week": handle_tasks_due_this_week,
    "risk_analysis": handle_risk_analysis,
    "completed_tasks": handle_completed_tasks,
    "tasks_by_status": handle_tasks_by_status,
    "kanban_overview": handle_kanban_overview,
    "entity_progress": handle_entity_progress,
    "casual": handle_casual,
    "unknown": handle_unknown,
    # Governance intents
    "role_list": handle_role_list,
    "capability_check": handle_capability_check,
    "delegation_list": handle_delegation_list,
    "delegation_map": handle_delegation_map,
    "governance_check": handle_governance_check,
    # STATUS_* intents are NOT in this registry
    # They use existing StatusResponseContract path
}


def get_handler(intent: str) -> Optional[Callable[[HandlerContext], ResponseContract]]:
    """
    Get handler function for given intent.

    Args:
        intent: Intent key (lowercase snake_case, e.g., "backlog_list")

    Returns:
        Handler function, or None if not found

    NOTE: Returns None for uppercase keys (strict mode).
    Caller should normalize before calling.
    """
    return INTENT_HANDLERS.get(intent)


def has_dedicated_handler(intent: str) -> bool:
    """Check if intent has a dedicated handler (vs status engine)"""
    return intent in INTENT_HANDLERS
