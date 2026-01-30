"""
BMAD Retry Bump Node - Phase 2: Guardian System

Simple node to increment retry counter when Guardian returns RETRY verdict.

Reference: docs/llm-improvement/02-guardian-system.md
"""

from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)


# =============================================================================
# Retry Bump Node
# =============================================================================

def bump_retry(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Increment retry counter for RETRY loop.

    Called when Guardian returns RETRY verdict.
    Increments retry_count by 1.

    Args:
        state: ChatState to update

    Returns:
        Updated state with incremented retry_count
    """
    current_count = state.get("retry_count", 0)
    new_count = current_count + 1

    state["retry_count"] = new_count

    logger.info(f"bump_retry: Incremented retry_count from {current_count} to {new_count}")

    return state


def reset_retry(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Reset retry counter to 0.

    Call this when starting a new query or after successful completion.

    Args:
        state: ChatState to update

    Returns:
        Updated state with retry_count = 0
    """
    state["retry_count"] = 0

    logger.debug("reset_retry: Reset retry_count to 0")

    return state


def get_retry_count(state: Dict[str, Any]) -> int:
    """
    Get current retry count from state.

    Args:
        state: ChatState

    Returns:
        Current retry count (0 if not set)
    """
    return state.get("retry_count", 0)


def can_retry(state: Dict[str, Any], max_retry: int = 2) -> bool:
    """
    Check if more retries are allowed.

    Args:
        state: ChatState
        max_retry: Maximum allowed retries

    Returns:
        True if retry_count < max_retry
    """
    return get_retry_count(state) < max_retry


# =============================================================================
# Exports
# =============================================================================

__all__ = [
    "bump_retry",
    "reset_retry",
    "get_retry_count",
    "can_retry",
]
