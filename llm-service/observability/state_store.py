"""
BMAD State Store - Phase 6: Observability

Store states for debugging and analysis.

Reference: docs/llm-improvement/06-observability-metrics.md
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from collections import deque
import threading
import logging
import json

logger = logging.getLogger(__name__)


# =============================================================================
# State Store
# =============================================================================

class StateStore:
    """
    Store states for debugging and analysis.

    Thread-safe storage with configurable retention.
    """

    def __init__(
        self,
        max_entries: int = 1000,
        retention_hours: int = 24
    ):
        """
        Initialize state store.

        Args:
            max_entries: Maximum entries to retain
            retention_hours: Hours to retain entries
        """
        self.max_entries = max_entries
        self.retention_hours = retention_hours
        self._failed_states: deque = deque(maxlen=max_entries)
        self._all_states: deque = deque(maxlen=max_entries)
        self._lock = threading.Lock()

    def _create_entry(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a store entry from state.

        Args:
            state: ChatState dictionary

        Returns:
            Store entry dictionary
        """
        guardian = state.get("guardian", {})

        return {
            "timestamp": datetime.utcnow().isoformat(),
            "trace_id": state.get("trace_id", "no-trace"),
            "track": state.get("track", "unknown"),
            "request_type": state.get("request_type", "unknown"),
            "user_query": state.get("user_query", "")[:200],  # Truncate
            "guardian_verdict": guardian.get("verdict"),
            "guardian_reasons": guardian.get("reasons", []),
            "guardian_risk_level": guardian.get("risk_level"),
            "evidence_count": len(state.get("evidence", [])),
            "retry_count": state.get("retry_count", 0),
            "timings_ms": state.get("timings_ms", {}),
            "has_draft": bool(state.get("draft_answer")),
            "has_final": bool(state.get("final_answer")),
        }

    def store_state(self, state: Dict[str, Any]) -> None:
        """
        Store any state (for analysis).

        Args:
            state: ChatState dictionary
        """
        entry = self._create_entry(state)

        with self._lock:
            self._all_states.append(entry)

        logger.debug(f"store_state: trace_id={entry['trace_id']}")

    def store_failed_state(self, state: Dict[str, Any]) -> None:
        """
        Store state when Guardian returns FAIL.

        Args:
            state: ChatState dictionary
        """
        entry = self._create_entry(state)

        with self._lock:
            self._failed_states.append(entry)
            self._all_states.append(entry)

        logger.info(
            f"store_failed_state: trace_id={entry['trace_id']}, "
            f"reasons={entry['guardian_reasons']}"
        )

    def get_failed_states(
        self,
        limit: int = 100,
        reason_filter: Optional[str] = None,
        track_filter: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Get failed states with optional filtering.

        Args:
            limit: Maximum entries to return
            reason_filter: Filter by reason substring
            track_filter: Filter by track type

        Returns:
            List of failed state entries
        """
        with self._lock:
            states = list(self._failed_states)

        # Apply filters
        if reason_filter:
            states = [
                s for s in states
                if any(reason_filter in r for r in s.get("guardian_reasons", []))
            ]

        if track_filter:
            states = [s for s in states if s.get("track") == track_filter]

        # Return most recent
        return states[-limit:]

    def get_recent_states(self, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get most recent states.

        Args:
            limit: Maximum entries to return

        Returns:
            List of state entries
        """
        with self._lock:
            return list(self._all_states)[-limit:]

    def get_state_by_trace(self, trace_id: str) -> Optional[Dict[str, Any]]:
        """
        Get state by trace ID.

        Args:
            trace_id: Trace ID to find

        Returns:
            State entry or None
        """
        with self._lock:
            for state in reversed(self._all_states):
                if state.get("trace_id") == trace_id:
                    return state
        return None

    def query_states(
        self,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        track: Optional[str] = None,
        verdict: Optional[str] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """
        Query states with filters.

        Args:
            start_time: Start of time range
            end_time: End of time range
            track: Track filter
            verdict: Verdict filter
            limit: Maximum entries

        Returns:
            List of matching state entries
        """
        with self._lock:
            states = list(self._all_states)

        # Time filter
        if start_time:
            states = [
                s for s in states
                if datetime.fromisoformat(s["timestamp"]) >= start_time
            ]

        if end_time:
            states = [
                s for s in states
                if datetime.fromisoformat(s["timestamp"]) <= end_time
            ]

        # Track filter
        if track:
            states = [s for s in states if s.get("track") == track]

        # Verdict filter
        if verdict:
            states = [s for s in states if s.get("guardian_verdict") == verdict]

        return states[-limit:]

    def get_stats(self) -> Dict[str, Any]:
        """
        Get store statistics.

        Returns:
            Statistics dictionary
        """
        with self._lock:
            all_count = len(self._all_states)
            failed_count = len(self._failed_states)

            # Verdict distribution
            verdicts = {}
            for state in self._all_states:
                v = state.get("guardian_verdict", "unknown")
                verdicts[v] = verdicts.get(v, 0) + 1

            # Track distribution
            tracks = {}
            for state in self._all_states:
                t = state.get("track", "unknown")
                tracks[t] = tracks.get(t, 0) + 1

            # Reason frequency
            reasons = {}
            for state in self._failed_states:
                for reason in state.get("guardian_reasons", []):
                    reasons[reason] = reasons.get(reason, 0) + 1

        return {
            "total_states": all_count,
            "failed_states": failed_count,
            "fail_rate": failed_count / all_count if all_count > 0 else 0,
            "verdict_distribution": verdicts,
            "track_distribution": tracks,
            "top_failure_reasons": dict(
                sorted(reasons.items(), key=lambda x: -x[1])[:10]
            ),
        }

    def clear(self) -> None:
        """Clear all stored states."""
        with self._lock:
            self._failed_states.clear()
            self._all_states.clear()
        logger.info("StateStore cleared")

    def cleanup_old_entries(self) -> int:
        """
        Remove entries older than retention period.

        Returns:
            Number of entries removed
        """
        cutoff = datetime.utcnow() - timedelta(hours=self.retention_hours)
        removed = 0

        with self._lock:
            # Clean failed states
            while self._failed_states:
                oldest = self._failed_states[0]
                ts = datetime.fromisoformat(oldest["timestamp"])
                if ts < cutoff:
                    self._failed_states.popleft()
                    removed += 1
                else:
                    break

            # Clean all states
            while self._all_states:
                oldest = self._all_states[0]
                ts = datetime.fromisoformat(oldest["timestamp"])
                if ts < cutoff:
                    self._all_states.popleft()
                    removed += 1
                else:
                    break

        if removed > 0:
            logger.info(f"StateStore cleanup: removed {removed} old entries")

        return removed


# =============================================================================
# Global Instance
# =============================================================================

_state_store: StateStore = None


def get_state_store() -> StateStore:
    """
    Get the global state store.

    Returns:
        Global StateStore instance
    """
    global _state_store
    if _state_store is None:
        _state_store = StateStore()
    return _state_store


# Convenience alias
state_store = get_state_store()


# =============================================================================
# Helper Functions
# =============================================================================

def store_if_failed(state: Dict[str, Any]) -> None:
    """
    Store state if Guardian verdict is FAIL.

    Args:
        state: ChatState dictionary
    """
    guardian = state.get("guardian", {})
    if guardian.get("verdict") == "FAIL":
        get_state_store().store_failed_state(state)


def store_completed_state(state: Dict[str, Any]) -> None:
    """
    Store completed request state.

    Args:
        state: ChatState dictionary
    """
    store = get_state_store()
    store.store_state(state)

    # Also store to failed if FAIL
    if state.get("guardian", {}).get("verdict") == "FAIL":
        store.store_failed_state(state)


# =============================================================================
# Exports
# =============================================================================

__all__ = [
    "StateStore",
    "get_state_store",
    "state_store",
    "store_if_failed",
    "store_completed_state",
]
