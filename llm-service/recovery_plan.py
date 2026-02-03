"""
Self-Healing Recovery Plan (v2.1).

v2.0 CHANGES:
- Plan only, no execution (RecoveryExecutor handles that)
- Priority ordering enforced (R5)
- AttemptTracker integration for runaway prevention (R3)

v2.1 CHANGES:
- SCOPE vs reason_detail narrative perspective separation (R10)
- MAX_CLARIFICATIONS_PER_INTENT policy added (R11)

PURPOSE:
- When data is empty or query fails, don't just show error
- Provide actionable recovery options to continue the conversation

PHILOSOPHY (P2 Inheritance):
- Empty/Failure MUST trigger recovery, not dead-end
- Recovery actions are MANDATORY for known failure modes
- User should never see "No data" without next steps

============================================================
RECOVERY ACTION PRIORITY (v2.0 - R5)
============================================================
1. AUTO_SCOPE (auto scope adjustment) - no user intervention needed
2. OFFER_ALTERNATIVES (offer alternatives) - show related data
3. FALLBACK_QUERY (fallback query) - auto_execute possible
4. SUGGEST_CREATE (suggest creation) - guide user action
5. ASK_CLARIFICATION (ask clarification) - LAST RESORT!

IMPORTANT: ASK_CLARIFICATION only at the end! Overuse degrades UX.
============================================================

============================================================
SCOPE vs REASON_DETAIL narrative perspective separation (v2.1 - R10)
============================================================
Explainability.SCOPE and RecoveryPlan.reason_detail overlap causes confusion.

Clear perspective separation:

  - Explainability.SCOPE = "why result is like this" (past/cause)
    Example: "No ACTIVE sprint in current project"

  - RecoveryPlan.reason_detail = "what you can do next" (future/action)
    Example: "You can view recently completed sprints or create a new sprint"

RULE: If both are the same sentence, it's wrong. Tense/perspective must differ.
============================================================
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from enum import Enum
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


# =============================================================================
# Recovery Action Types (Priority Ordered)
# =============================================================================

class ActionType(str, Enum):
    """
    Types of recovery actions in priority order.

    PRIORITY (higher = try first):
    1. AUTO_SCOPE - Best UX, no user action needed
    2. OFFER_ALTERNATIVES - Show what exists
    3. FALLBACK_QUERY - Try different query
    4. SUGGEST_CREATE - Guide user to create data
    5. ASK_CLARIFICATION - Last resort!
    """
    AUTO_SCOPE = "auto_scope"                 # Priority 1: Automatically adjust scope
    OFFER_ALTERNATIVES = "offer_alternatives" # Priority 2: Show related alternatives
    FALLBACK_QUERY = "fallback_query"         # Priority 3: Try alternative query
    SUGGEST_CREATE = "suggest_create"         # Priority 4: Suggest creating data
    ASK_CLARIFICATION = "ask_clarification"   # Priority 5: LAST RESORT - ask user


# Priority mapping for sorting
ACTION_PRIORITY = {
    ActionType.AUTO_SCOPE.value: 1,
    ActionType.OFFER_ALTERNATIVES.value: 2,
    ActionType.FALLBACK_QUERY.value: 3,
    ActionType.SUGGEST_CREATE.value: 4,
    ActionType.ASK_CLARIFICATION.value: 5,  # Lowest priority!
}


# =============================================================================
# Per-Intent Clarification Budget (v2.1 - R11)
# =============================================================================

MAX_CLARIFICATIONS_PER_INTENT = {
    # High-value intents: allow 1 clarification
    "sprint_progress": 1,
    "risk_analysis": 1,
    "project_status": 1,

    # Data listing intents: NO clarification (show what exists or empty)
    "backlog_list": 0,
    "task_list": 0,
    "my_tasks": 0,
    "task_due_this_week": 0,

    # Default for unspecified intents
    "_default": 1,
}


def get_clarification_budget(intent: str) -> int:
    """
    Get the max clarifications allowed for an intent.

    v2.1: Prevents ASK_CLARIFICATION abuse by setting hard limits.
    If intent keeps triggering questions, something is wrong with the handler.
    """
    return MAX_CLARIFICATIONS_PER_INTENT.get(
        intent,
        MAX_CLARIFICATIONS_PER_INTENT["_default"]
    )


def can_ask_clarification(intent: str, session_state: dict) -> bool:
    """
    Check if we can still ask clarifications for this intent.

    Usage:
        if can_ask_clarification("sprint_progress", session):
            plan.add_action(ActionType.ASK_CLARIFICATION, ...)
        # else: skip adding clarification action
    """
    budget = get_clarification_budget(intent)
    if budget == 0:
        return False

    key = f"_clarification_count:{intent}"
    current_count = session_state.get(key, 0)
    return current_count < budget


def record_clarification_asked(intent: str, session_state: dict) -> None:
    """Record that a clarification was asked for this intent."""
    key = f"_clarification_count:{intent}"
    session_state[key] = session_state.get(key, 0) + 1


class RecoveryReason(str, Enum):
    """Reasons why recovery was triggered."""
    NO_ACTIVE_SPRINT = "no_active_sprint"
    EMPTY_DATA = "empty_data"
    QUERY_FAILURE = "query_failure"
    SCOPE_MISMATCH = "scope_mismatch"
    PERMISSION_DENIED = "permission_denied"
    TIMEOUT = "timeout"
    STALE_DATA = "stale_data"


# =============================================================================
# Recovery Action
# =============================================================================

@dataclass
class RecoveryAction:
    """
    A single recovery action the system can take or offer.

    Attributes:
        action_type: Type of action (priority ordered)
        message: Human-readable description of the action
        options: Available choices for user (if applicable)
        meta: Machine-readable details for execution
        auto_execute: If True, system should execute without asking
        max_auto_attempts: Max times this can auto-execute (prevent loops)
    """
    action_type: str
    message: str
    options: List[str] = field(default_factory=list)
    meta: Dict[str, Any] = field(default_factory=dict)
    auto_execute: bool = False
    max_auto_attempts: int = 1  # Prevent runaway loops

    @property
    def priority(self) -> int:
        """Get action priority (lower = higher priority)."""
        return ACTION_PRIORITY.get(self.action_type, 99)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "action_type": self.action_type,
            "message": self.message,
            "options": self.options,
            "meta": self.meta,
            "auto_execute": self.auto_execute,
            "max_auto_attempts": self.max_auto_attempts,
        }


# =============================================================================
# Attempt Tracking (v2.0 - R3)
# =============================================================================

@dataclass
class AttemptRecord:
    """
    Record of a recovery attempt.

    v2.0: Replaces simple string list for better tracking.
    """
    action_type: str
    context_key: str  # Unique key for this context (intent + scope)
    success: bool
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "action_type": self.action_type,
            "context_key": self.context_key,
            "success": self.success,
            "timestamp": self.timestamp,
        }


# =============================================================================
# Recovery Plan
# =============================================================================

@dataclass
class RecoveryPlan:
    """
    A plan for recovering from data absence or query failure.

    MANDATORY when:
    - Query returns empty results
    - Query fails with error
    - Scope doesn't match available data

    v2.0 CHANGES:
    - Actions are priority-sorted automatically
    - AttemptRecord replaces string list for tracking
    - Plan does NOT execute - RecoveryExecutor does

    Attributes:
        intent: The intent that triggered recovery
        reason: Why recovery was needed
        reason_detail: Human-readable explanation (future/action perspective)
        actions: List of recovery actions (auto-sorted by priority)
        attempt_records: Structured tracking of what was tried
    """
    intent: str
    reason: str
    reason_detail: str
    actions: List[RecoveryAction] = field(default_factory=list)
    attempt_records: List[AttemptRecord] = field(default_factory=list)

    def add_action(
        self,
        action_type: str,
        message: str,
        options: Optional[List[str]] = None,
        auto_execute: bool = False,
        max_auto_attempts: int = 1,
        **meta: Any,
    ) -> "RecoveryPlan":
        """
        Add a recovery action to the plan.

        Actions are automatically sorted by priority after adding.
        """
        # Warn if adding ASK_CLARIFICATION with other options
        if action_type == ActionType.ASK_CLARIFICATION.value:
            existing_types = [a.action_type for a in self.actions]
            if any(t != ActionType.ASK_CLARIFICATION.value for t in existing_types):
                logger.warning(
                    f"ASK_CLARIFICATION added but other actions exist. "
                    f"Consider if clarification is really needed."
                )

        self.actions.append(RecoveryAction(
            action_type=action_type,
            message=message,
            options=options or [],
            meta=meta,
            auto_execute=auto_execute,
            max_auto_attempts=max_auto_attempts,
        ))

        # Sort by priority
        self.actions.sort(key=lambda a: a.priority)
        return self

    def get_auto_executable_actions(self) -> List[RecoveryAction]:
        """Get actions that can be auto-executed."""
        return [a for a in self.actions if a.auto_execute]

    def get_user_actions(self) -> List[RecoveryAction]:
        """Get actions that require user interaction."""
        return [a for a in self.actions if not a.auto_execute]

    def get_first_auto_action(self) -> Optional[RecoveryAction]:
        """Get highest-priority auto-executable action."""
        auto_actions = self.get_auto_executable_actions()
        return auto_actions[0] if auto_actions else None

    def has_been_tried(self, action_type: str, context_key: Optional[str] = None) -> bool:
        """Check if an action type has already been tried."""
        for record in self.attempt_records:
            if record.action_type == action_type:
                if context_key is None or record.context_key == context_key:
                    return True
        return False

    def record_attempt(
        self,
        action_type: str,
        context_key: str,
        success: bool,
    ) -> None:
        """Record that an action was attempted."""
        self.attempt_records.append(AttemptRecord(
            action_type=action_type,
            context_key=context_key,
            success=success,
        ))

    def should_auto_execute(self, action: RecoveryAction) -> bool:
        """
        Check if an action should be auto-executed.

        Considers:
        - auto_execute flag
        - max_auto_attempts limit
        - already_tried status
        """
        if not action.auto_execute:
            return False

        # Count how many times this action type was tried
        attempts = sum(
            1 for r in self.attempt_records
            if r.action_type == action.action_type
        )

        return attempts < action.max_auto_attempts

    def to_dict(self) -> Dict[str, Any]:
        return {
            "intent": self.intent,
            "reason": self.reason,
            "reason_detail": self.reason_detail,
            "actions": [a.to_dict() for a in self.actions],
            "attempt_records": [r.to_dict() for r in self.attempt_records],
        }

    def to_user_message(self) -> str:
        """Generate user-facing message with recovery options."""
        lines = []

        # Main reason
        lines.append(self.reason_detail)
        lines.append("")

        # User actions (non-auto)
        user_actions = self.get_user_actions()
        if user_actions:
            lines.append("**Next steps**:")
            for action in user_actions:
                lines.append(f"  - {action.message}")
                for option in action.options[:3]:  # Max 3 options
                    lines.append(f"    - {option}")

        return "\n".join(lines)


# =============================================================================
# Pre-built Recovery Plans
# =============================================================================

def create_no_active_sprint_recovery(intent: str = "sprint_progress") -> RecoveryPlan:
    """Create recovery plan for no active sprint scenario."""
    plan = RecoveryPlan(
        intent=intent,
        reason=RecoveryReason.NO_ACTIVE_SPRINT.value,
        reason_detail="You can view recently completed sprints or create a new sprint.",
    )

    # Priority 1: Auto-adjust to last completed sprint
    plan.add_action(
        ActionType.AUTO_SCOPE.value,
        "Auto-fetch last completed sprint",
        auto_execute=True,
        max_auto_attempts=1,
        scope="last_completed_sprint",
    )

    # Priority 2: Show sprint list
    plan.add_action(
        ActionType.OFFER_ALTERNATIVES.value,
        "View sprint list",
        options=["View list"],
        show_sprint_list=True,
    )

    # Priority 4: Suggest creating sprint
    plan.add_action(
        ActionType.SUGGEST_CREATE.value,
        "Create new sprint",
        options=["Show creation guide"],
        guide_type="sprint_creation",
    )

    # NO ASK_CLARIFICATION - other options are better

    return plan


def create_empty_backlog_recovery(intent: str = "backlog_list") -> RecoveryPlan:
    """Create recovery plan for empty backlog scenario."""
    plan = RecoveryPlan(
        intent=intent,
        reason=RecoveryReason.EMPTY_DATA.value,
        reason_detail="Add stories via 'Backlog Management' menu or import from templates.",
    )

    # Priority 2: Offer alternatives
    plan.add_action(
        ActionType.OFFER_ALTERNATIVES.value,
        "View related Epic/Feature list",
        epic_fallback=True,
    )

    # Priority 4: Suggest creating
    plan.add_action(
        ActionType.SUGGEST_CREATE.value,
        "Add new backlog item",
        options=["Show creation guide"],
        guide_type="story_creation",
    )

    return plan


def create_empty_tasks_recovery(
    intent: str = "task_due_this_week",
    judgment_data: Optional[Dict[str, Any]] = None,
) -> RecoveryPlan:
    """Create recovery plan for empty tasks scenario with 3-way branching."""
    judgment_data = judgment_data or {}

    all_tasks = judgment_data.get("all_tasks_count", 0)
    no_due_date = judgment_data.get("no_due_date_count", 0)

    # Branch 1: No tasks at all
    if all_tasks == 0:
        plan = RecoveryPlan(
            intent=intent,
            reason=RecoveryReason.EMPTY_DATA.value,
            reason_detail="No tasks have been created yet. Create tasks in the task management area.",
        )
        plan.add_action(
            ActionType.SUGGEST_CREATE.value,
            "Create tasks",
            options=["Show task creation guide"],
            guide_type="task_creation",
        )
        return plan

    # Branch 2: Tasks exist but most have no due date
    if all_tasks > 0 and no_due_date / max(all_tasks, 1) > 0.5:
        plan = RecoveryPlan(
            intent=intent,
            reason=RecoveryReason.SCOPE_MISMATCH.value,
            reason_detail=f"{no_due_date} of {all_tasks} tasks have no due date. Set due dates for better tracking.",
        )
        plan.add_action(
            ActionType.OFFER_ALTERNATIVES.value,
            "View all tasks (regardless of due date)",
            show_all_tasks=True,
        )
        plan.add_action(
            ActionType.SUGGEST_CREATE.value,
            "Set due dates on tasks",
            guide_type="task_due_date",
        )
        return plan

    # Branch 3: Tasks exist with due dates, just none this week
    plan = RecoveryPlan(
        intent=intent,
        reason=RecoveryReason.EMPTY_DATA.value,
        reason_detail="No tasks are due this week. Next week's tasks or all active tasks are available.",
    )
    plan.add_action(
        ActionType.AUTO_SCOPE.value,
        "Auto-fetch next week's tasks",
        auto_execute=True,
        scope="next_week",
    )
    plan.add_action(
        ActionType.OFFER_ALTERNATIVES.value,
        "View all active tasks",
        show_all_tasks=True,
    )

    return plan


def create_empty_risks_recovery(intent: str = "risk_analysis") -> RecoveryPlan:
    """Create recovery plan for empty risks scenario."""
    plan = RecoveryPlan(
        intent=intent,
        reason=RecoveryReason.EMPTY_DATA.value,
        reason_detail="No active risks registered. Good! Consider proactive risk identification.",
    )

    # Priority 2: Check blockers as potential risks
    plan.add_action(
        ActionType.FALLBACK_QUERY.value,
        "Check high-severity blockers as potential risks",
        auto_execute=True,
        fallback_type="blockers_as_risks",
    )

    # Priority 4: Suggest risk assessment
    plan.add_action(
        ActionType.SUGGEST_CREATE.value,
        "Run risk identification session",
        options=["Show risk categories guide"],
        guide_type="risk_identification",
    )

    return plan


def create_query_failure_recovery(
    intent: str,
    error_detail: str,
) -> RecoveryPlan:
    """Create recovery plan for query failure scenario."""
    plan = RecoveryPlan(
        intent=intent,
        reason=RecoveryReason.QUERY_FAILURE.value,
        reason_detail="Data retrieval failed. Please try again in a moment.",
    )

    # Priority 3: Retry with fallback query
    plan.add_action(
        ActionType.FALLBACK_QUERY.value,
        "Try with simplified query",
        auto_execute=True,
        max_auto_attempts=1,
        fallback_type="simplified",
        original_error=error_detail,
    )

    return plan
