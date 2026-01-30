"""
BMAD Light Policy Gate - Phase 5: FAST Track

First line of defense for FAST track requests.
Blocks obviously unsafe requests before any processing.

Reference: docs/llm-improvement/05-fast-track-guardian.md
"""

from typing import Dict, Any, List
import logging

logger = logging.getLogger(__name__)


# =============================================================================
# Policy Constants
# =============================================================================

BANNED_KEYWORDS: List[str] = [
    "api key",
    "apikey",
    "password",
    "token",
    "secret",
    "credential",
    "private key",
    "auth token",
    "access token",
    "bearer token",
]

SENSITIVE_TOPICS: List[str] = [
    "permission",
    "access level",
    "security",
    "delete",
    "remove all",
    "drop table",
    "truncate",
    "grant",
    "revoke",
]


# =============================================================================
# Light Policy Gate Functions
# =============================================================================

def light_policy_gate(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Minimal policy check for FAST track.
    Blocks obviously unsafe requests before any processing.

    Args:
        state: ChatState dictionary

    Returns:
        Updated state with guardian verdict if blocked
    """
    query = state.get("user_query", "").lower()

    # Check for banned keywords (immediate rejection)
    banned_match = check_banned_keywords(query)
    if banned_match:
        logger.info(f"light_policy_gate: Blocked banned keyword: {banned_match}")
        state["guardian"] = {
            "verdict": "FAIL",
            "reasons": [f"policy:banned_keyword({banned_match})"],
            "required_actions": [],
            "risk_level": "high",
        }
        state["final_answer"] = (
            "Your request may contain sensitive information. "
            "Please remove sensitive data and try again."
        )
        return state

    # Check for sensitive topics (upgrade to QUALITY)
    sensitive_match = check_sensitive_topics(query)
    if sensitive_match:
        logger.info(f"light_policy_gate: Sensitive topic detected: {sensitive_match}")
        state["guardian"] = {
            "verdict": "FAIL",
            "reasons": [f"policy:sensitive_topic({sensitive_match})"],
            "required_actions": [],
            "risk_level": "med",
        }
        # Mark for QUALITY upgrade instead of exit
        state["_upgrade_to_quality"] = True
        return state

    # Pass - continue FAST path
    logger.debug("light_policy_gate: Query passed policy check")
    return state


def check_banned_keywords(query: str) -> str:
    """
    Check if query contains banned keywords.

    Args:
        query: Lowercase user query string

    Returns:
        Matched keyword or empty string if none found
    """
    for keyword in BANNED_KEYWORDS:
        if keyword in query:
            return keyword
    return ""


def check_sensitive_topics(query: str) -> str:
    """
    Check if query contains sensitive topics.

    Args:
        query: Lowercase user query string

    Returns:
        Matched topic or empty string if none found
    """
    for topic in SENSITIVE_TOPICS:
        if topic in query:
            return topic
    return ""


def is_policy_blocked(state: Dict[str, Any]) -> bool:
    """
    Check if state was blocked by policy gate.

    Args:
        state: ChatState dictionary

    Returns:
        True if blocked (guardian verdict is FAIL)
    """
    guardian = state.get("guardian", {})
    return guardian.get("verdict") == "FAIL"


def is_upgrade_required(state: Dict[str, Any]) -> bool:
    """
    Check if state requires QUALITY upgrade.

    Args:
        state: ChatState dictionary

    Returns:
        True if upgrade to QUALITY is required
    """
    return state.get("_upgrade_to_quality", False)


def get_policy_reason(state: Dict[str, Any]) -> str:
    """
    Get the policy failure reason from state.

    Args:
        state: ChatState dictionary

    Returns:
        First reason string or empty if none
    """
    guardian = state.get("guardian", {})
    reasons = guardian.get("reasons", [])
    return reasons[0] if reasons else ""


# =============================================================================
# Exports
# =============================================================================

__all__ = [
    # Main function
    "light_policy_gate",
    # Helper functions
    "check_banned_keywords",
    "check_sensitive_topics",
    "is_policy_blocked",
    "is_upgrade_required",
    "get_policy_reason",
    # Constants
    "BANNED_KEYWORDS",
    "SENSITIVE_TOPICS",
]
