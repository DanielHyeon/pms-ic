"""
Centralized Degradation Tips for Intent Handlers.

Provides context-aware guidance when data is empty, incomplete, or unavailable.
Separates:
- DB failure tips (system issue)
- Empty data tips (user action needed)
- Incomplete data tips (partial information)

Reference: docs/P1_DATA_QUERY_AND_DEGRADATION.md
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from enum import Enum


class DegradationReason(str, Enum):
    """Reason for degradation"""
    DB_FAILURE = "db_failure"           # Database query failed
    DB_TIMEOUT = "db_timeout"           # Query timed out
    EMPTY_DATA = "empty_data"           # No data found (not an error)
    INCOMPLETE_DATA = "incomplete"       # Partial data available
    SCHEMA_MISMATCH = "schema"          # Column doesn't exist
    NO_DUE_DATES = "no_due_dates"       # Tasks exist but no due_date set
    NO_ACTIVE_SPRINT = "no_sprint"      # No active sprint
    NO_RISKS_EXPLICIT = "no_risks"      # No explicit risks registered


@dataclass
class DegradationPlan:
    """Degradation plan with tips and context"""
    reason: DegradationReason
    message: str
    tips: List[str]
    next_actions: List[str] = field(default_factory=list)
    related_menu: Optional[str] = None
    template_example: Optional[str] = None


# =============================================================================
# DB Failure Tips (System Issues)
# =============================================================================

DB_FAILURE_TIPS = {
    "default": DegradationPlan(
        reason=DegradationReason.DB_FAILURE,
        message="Unable to retrieve data from the database.",
        tips=[
            "The system may be experiencing temporary issues",
            "Please try again in a few moments",
            "Contact administrator if the issue persists",
        ],
        next_actions=[
            "Retry the request",
            "Check system status",
        ],
    ),
    "timeout": DegradationPlan(
        reason=DegradationReason.DB_TIMEOUT,
        message="Query took too long to complete.",
        tips=[
            "The request may have been too complex",
            "Try a more specific query",
            "System may be under heavy load",
        ],
        next_actions=[
            "Try a simpler query",
            "Wait a moment and retry",
        ],
    ),
}


# =============================================================================
# Empty Data Tips by Intent
# =============================================================================

EMPTY_DATA_TIPS = {
    "backlog_list": DegradationPlan(
        reason=DegradationReason.EMPTY_DATA,
        message="No backlog items found.",
        tips=[
            "The product backlog is currently empty",
            "New stories can be added via the Backlog Management menu",
            "Backlog items are user stories not yet assigned to a sprint",
        ],
        next_actions=[
            "Click 'Add Story' in Backlog Management",
            "Start with user stories in format: 'As a [user], I want [feature]...'",
            "Set priority (Critical/High/Medium/Low) for ordering",
            "Optionally add story points for estimation",
        ],
        related_menu="Backlog Management",
        template_example='"As a claims adjuster, I want to auto-classify documents so that processing is faster."',
    ),

    "sprint_progress": DegradationPlan(
        reason=DegradationReason.NO_ACTIVE_SPRINT,
        message="No active sprint found.",
        tips=[
            "There is currently no sprint in 'ACTIVE' status",
            "Sprints need to be created and started to track progress",
            "Check if the sprint needs to be activated",
        ],
        next_actions=[
            "Go to 'Sprint Management' to create a sprint",
            "Move items from backlog to the new sprint",
            "Set sprint goal and start date",
            "Change sprint status to 'ACTIVE'",
        ],
        related_menu="Sprint Management",
    ),

    "task_due_this_week": DegradationPlan(
        reason=DegradationReason.EMPTY_DATA,
        message="No tasks due this week.",
        tips=[
            "Great news - no tasks are due this week!",
            "Or tasks may not have due dates set",
            "Check the task board for overall status",
        ],
        next_actions=[
            "Set due dates when creating tasks",
            "Review overdue tasks if any",
            "Use the Kanban board for task management",
        ],
        related_menu="Task Board / Kanban",
    ),

    "task_due_no_due_dates": DegradationPlan(
        reason=DegradationReason.NO_DUE_DATES,
        message="Tasks exist but most don't have due dates set.",
        tips=[
            "There are active tasks, but due_date is not set for most",
            "Setting due dates helps with deadline tracking",
            "Consider adding deadlines to important tasks",
        ],
        next_actions=[
            "Review tasks in Task Board",
            "Add due dates to high-priority tasks",
            "Use sprint end date as a guide for deadlines",
        ],
        related_menu="Task Board",
    ),

    "risk_analysis": DegradationPlan(
        reason=DegradationReason.NO_RISKS_EXPLICIT,
        message="No active risks registered.",
        tips=[
            "No items with type='RISK' found",
            "Risks can be registered via Issue Management",
            "Consider running a risk identification session",
        ],
        next_actions=[
            "Go to 'Issue Management' menu",
            "Create new issue with Type = 'RISK'",
            "Set severity (CRITICAL/HIGH/MEDIUM/LOW)",
            "Assign owner and mitigation plan",
            "Review risks in weekly meetings",
        ],
        related_menu="Issue Management",
        template_example="Risk: 'Third-party API dependency may cause delays' | Severity: HIGH | Mitigation: 'Implement fallback mechanism'",
    ),
}


# =============================================================================
# Helper Functions
# =============================================================================

def get_db_failure_plan(error_type: str = "default") -> DegradationPlan:
    """Get degradation plan for DB failures"""
    return DB_FAILURE_TIPS.get(error_type, DB_FAILURE_TIPS["default"])


def get_empty_data_plan(intent: str) -> DegradationPlan:
    """Get degradation plan for empty data by intent"""
    return EMPTY_DATA_TIPS.get(intent, DegradationPlan(
        reason=DegradationReason.EMPTY_DATA,
        message="No data found.",
        tips=["Try a different query", "Check if data has been created"],
        next_actions=[],
    ))


def get_tips_for_intent(intent: str, has_data: bool = False, judgment_data: Optional[Dict[str, Any]] = None) -> List[str]:
    """
    Get appropriate tips based on intent and data state.

    Args:
        intent: Intent type (e.g., "backlog_list")
        has_data: Whether query returned data
        judgment_data: Additional context for degradation decisions

    Returns:
        List of actionable tips
    """
    if has_data:
        return []  # No tips needed when data exists

    plan = get_empty_data_plan(intent)

    # Check judgment data for more specific tips
    if judgment_data and intent == "task_due_this_week":
        no_due_date_count = judgment_data.get("no_due_date_count", 0)
        active_tasks_count = judgment_data.get("active_tasks_count", 0)

        if active_tasks_count > 0 and no_due_date_count > active_tasks_count * 0.7:
            # More than 70% of tasks have no due_date
            plan = EMPTY_DATA_TIPS.get("task_due_no_due_dates", plan)

    return plan.tips + plan.next_actions


def format_degradation_response(
    intent: str,
    reason: DegradationReason,
    judgment_data: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Format a complete degradation response.

    Args:
        intent: Intent type
        reason: Why degradation is needed
        judgment_data: Context for decision making

    Returns:
        Dict with message, tips, and template
    """
    if reason in (DegradationReason.DB_FAILURE, DegradationReason.DB_TIMEOUT):
        plan = get_db_failure_plan("timeout" if reason == DegradationReason.DB_TIMEOUT else "default")
    else:
        plan = get_empty_data_plan(intent)

    result = {
        "message": plan.message,
        "tips": plan.tips,
        "next_actions": plan.next_actions,
        "related_menu": plan.related_menu,
    }

    if plan.template_example:
        result["template_example"] = plan.template_example

    return result
