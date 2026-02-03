"""
AttemptTracker: Prevents runaway recovery loops (v2.0 - R3).

PURPOSE:
- Prevent infinite auto-recovery loops
- Track what's been tried in a session
- Enforce max attempts per action type

PHILOSOPHY:
- Auto-recovery is good, but must have limits
- If recovery keeps failing, stop trying and show error
- Session-scoped tracking for conversation continuity

============================================================
RUNAWAY DETECTION
============================================================
Signs of a runaway:
1. Same action type executed > MAX_ATTEMPTS times
2. Total auto-executions > GLOBAL_LIMIT per session
3. Recovery success rate < MIN_SUCCESS_RATE

When detected:
- Stop auto-execution
- Log warning
- Show user actions instead
============================================================
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


# =============================================================================
# Configuration Constants
# =============================================================================

# Max attempts per action type per session
MAX_ATTEMPTS_PER_ACTION = {
    "auto_scope": 2,
    "fallback_query": 2,
    "offer_alternatives": 1,
    "suggest_create": 1,
    "ask_clarification": 1,
    "_default": 1,
}

# Global limits
GLOBAL_AUTO_EXECUTION_LIMIT = 5  # Max auto-executions per session
MIN_SUCCESS_RATE_THRESHOLD = 0.2  # Below 20% success = stop trying


# =============================================================================
# Recovery Success Criteria (v2.1 - R8)
# =============================================================================

RECOVERY_SUCCESS_CRITERIA = {
    # Minimum rows to consider recovery successful
    "min_rows": 1,
    # Status values that indicate success
    "success_statuses": ["ok"],
    # Status values that indicate partial success (still counts)
    "partial_statuses": ["ok", "empty"],  # empty with fallback data is partial success
}


def is_recovery_successful(
    result: Dict[str, Any],
    criteria: Optional[Dict[str, Any]] = None,
) -> bool:
    """
    Check if a recovery attempt was successful.

    v2.1 (R8): Uses CRITERIA constant instead of ad-hoc checks.

    Args:
        result: The result of the recovery attempt
        criteria: Optional override for success criteria

    Returns:
        True if recovery was successful
    """
    criteria = criteria or RECOVERY_SUCCESS_CRITERIA

    # Check status
    status = result.get("status", "error")
    if status not in criteria["partial_statuses"]:
        return False

    # Check row count for data results
    data = result.get("data", {})
    if isinstance(data, dict):
        # Check common data patterns
        for key in ["items", "tasks", "stories", "risks", "rows"]:
            if key in data:
                items = data[key]
                if isinstance(items, list) and len(items) >= criteria["min_rows"]:
                    return True

    # If status is OK and no specific data check failed, consider it success
    return status in criteria["success_statuses"]


# =============================================================================
# Attempt Record
# =============================================================================

@dataclass
class TrackedAttempt:
    """Record of a tracked recovery attempt."""
    action_type: str
    intent: str
    context_key: str
    success: bool
    timestamp: datetime = field(default_factory=datetime.utcnow)
    details: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "action_type": self.action_type,
            "intent": self.intent,
            "context_key": self.context_key,
            "success": self.success,
            "timestamp": self.timestamp.isoformat(),
            "details": self.details,
        }


# =============================================================================
# Attempt Tracker
# =============================================================================

@dataclass
class AttemptTracker:
    """
    Tracks recovery attempts to prevent runaway loops.

    Usage:
        tracker = AttemptTracker()

        # Before auto-executing
        if tracker.can_attempt("auto_scope", "sprint_progress"):
            result = execute_recovery(...)
            tracker.record_attempt("auto_scope", "sprint_progress", success=True)

        # Check for runaway
        if tracker.is_runaway():
            logger.warning("Recovery runaway detected!")
    """
    session_id: str = ""
    attempts: List[TrackedAttempt] = field(default_factory=list)
    _action_counts: Dict[str, int] = field(default_factory=dict)
    _intent_counts: Dict[str, int] = field(default_factory=dict)

    def can_attempt(
        self,
        action_type: str,
        intent: str,
        context_key: Optional[str] = None,
    ) -> bool:
        """
        Check if we can attempt a recovery action.

        Returns False if:
        - Max attempts for this action type exceeded
        - Global auto-execution limit exceeded
        - Runaway detected
        """
        # Check action-specific limit
        max_attempts = MAX_ATTEMPTS_PER_ACTION.get(
            action_type,
            MAX_ATTEMPTS_PER_ACTION["_default"]
        )
        current_count = self._action_counts.get(action_type, 0)
        if current_count >= max_attempts:
            logger.debug(
                f"Max attempts reached for {action_type}: "
                f"{current_count}/{max_attempts}"
            )
            return False

        # Check global limit
        total_auto = sum(
            1 for a in self.attempts
            if a.action_type in ["auto_scope", "fallback_query"]
        )
        if total_auto >= GLOBAL_AUTO_EXECUTION_LIMIT:
            logger.warning(
                f"Global auto-execution limit reached: {total_auto}"
            )
            return False

        # Check for runaway
        if self.is_runaway():
            logger.warning("Recovery runaway detected, blocking attempt")
            return False

        return True

    def record_attempt(
        self,
        action_type: str,
        intent: str,
        context_key: str,
        success: bool,
        **details: Any,
    ) -> None:
        """Record a recovery attempt."""
        attempt = TrackedAttempt(
            action_type=action_type,
            intent=intent,
            context_key=context_key,
            success=success,
            details=details,
        )
        self.attempts.append(attempt)

        # Update counts
        self._action_counts[action_type] = (
            self._action_counts.get(action_type, 0) + 1
        )
        self._intent_counts[intent] = (
            self._intent_counts.get(intent, 0) + 1
        )

        # Log for debugging
        logger.debug(
            f"Recorded attempt: {action_type}/{intent} "
            f"success={success} total={len(self.attempts)}"
        )

    def is_runaway(self) -> bool:
        """
        Detect if we're in a runaway state.

        Returns True if:
        - Too many total attempts
        - Success rate too low
        """
        if len(self.attempts) < 3:
            return False  # Need enough data

        # Check total attempts (soft limit)
        if len(self.attempts) > 10:
            return True

        # Check success rate
        successes = sum(1 for a in self.attempts if a.success)
        rate = successes / len(self.attempts)
        if rate < MIN_SUCCESS_RATE_THRESHOLD:
            logger.warning(
                f"Low recovery success rate: {rate:.1%} "
                f"({successes}/{len(self.attempts)})"
            )
            return True

        return False

    def get_success_rate(self) -> float:
        """Get overall success rate."""
        if not self.attempts:
            return 1.0  # No attempts = no failures
        successes = sum(1 for a in self.attempts if a.success)
        return successes / len(self.attempts)

    def get_action_count(self, action_type: str) -> int:
        """Get count for a specific action type."""
        return self._action_counts.get(action_type, 0)

    def get_intent_count(self, intent: str) -> int:
        """Get count for a specific intent."""
        return self._intent_counts.get(intent, 0)

    def get_recent_failures(self, limit: int = 5) -> List[TrackedAttempt]:
        """Get recent failed attempts."""
        failures = [a for a in self.attempts if not a.success]
        return failures[-limit:] if failures else []

    def reset(self) -> None:
        """Reset tracker (new session)."""
        self.attempts = []
        self._action_counts = {}
        self._intent_counts = {}

    def to_dict(self) -> Dict[str, Any]:
        return {
            "session_id": self.session_id,
            "total_attempts": len(self.attempts),
            "success_rate": self.get_success_rate(),
            "action_counts": self._action_counts,
            "intent_counts": self._intent_counts,
            "is_runaway": self.is_runaway(),
            "attempts": [a.to_dict() for a in self.attempts[-10:]],  # Last 10
        }


# =============================================================================
# Session-scoped Tracker
# =============================================================================

# Global tracker registry (keyed by session_id)
_trackers: Dict[str, AttemptTracker] = {}


def get_tracker(session_id: str) -> AttemptTracker:
    """Get or create tracker for a session."""
    if session_id not in _trackers:
        _trackers[session_id] = AttemptTracker(session_id=session_id)
    return _trackers[session_id]


def clear_tracker(session_id: str) -> None:
    """Clear tracker for a session."""
    if session_id in _trackers:
        del _trackers[session_id]


def clear_all_trackers() -> None:
    """Clear all trackers (for testing)."""
    _trackers.clear()
