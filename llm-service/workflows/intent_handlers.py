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
from query.query_templates import (
    BACKLOG_LIST_QUERY, BACKLOG_LIST_FALLBACK_QUERY, BACKLOG_SUMMARY_QUERY,
    ACTIVE_SPRINT_QUERY, SPRINT_STORIES_QUERY, SPRINT_METRICS_QUERY,
    TASKS_DUE_THIS_WEEK_QUERY, TASKS_DUE_THIS_WEEK_FALLBACK_QUERY,
    TASKS_OVERDUE_QUERY, TASK_COUNTS_QUERY,
    RISKS_FROM_ISSUES_QUERY, RISKS_FALLBACK_QUERY, BLOCKERS_AS_RISKS_QUERY,
    COMPLETED_TASKS_QUERY, COMPLETED_TASKS_FALLBACK_QUERY, COMPLETED_TASKS_COUNTS_QUERY,
    TASKS_IN_REVIEW_QUERY, TASKS_IN_PROGRESS_QUERY,
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
    summary = {}
    db_failed = False

    try:
        # Primary query: Get backlog items
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
            "count": len(items),
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
    status_filter = "REVIEW"  # Default to review/testing

    # Detect status from message (with typo tolerance)
    message_lower = apply_typo_corrections(ctx.message).lower()
    if any(fuzzy_keyword_in_query(kw, message_lower) for kw in ["테스트", "검토", "리뷰", "review", "testing", "qa"]):
        status_filter = "REVIEW"
        query = TASKS_IN_REVIEW_QUERY
    elif any(fuzzy_keyword_in_query(kw, message_lower) for kw in ["진행", "작업 중", "doing", "wip", "in progress"]):
        status_filter = "IN_PROGRESS"
        query = TASKS_IN_PROGRESS_QUERY
    else:
        # Default to review
        query = TASKS_IN_REVIEW_QUERY

    try:
        result = execute_query(
            query,
            {"project_id": ctx.project_id, "limit": 30},
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
        status_name = "테스트/검토" if status_filter == "REVIEW" else "진행"
        warnings = [f"{status_name} 중인 태스크가 없습니다"]
        tips = [
            "Kanban 보드에서 태스크 상태를 확인하세요",
            "스프린트에 태스크가 할당되어 있는지 확인하세요",
        ]
        error_code = None
    else:
        warnings = []
        tips = []
        error_code = None

    status_label = "테스트/검토 중" if status_filter == "REVIEW" else "진행 중"

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
    "casual": handle_casual,
    "unknown": handle_unknown,
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
