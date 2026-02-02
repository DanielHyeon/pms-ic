"""
BMAD Policy Check - Phase 2: Guardian System

Validates requests and responses against security policies.

Checks:
- Permission level violations
- Forbidden topics/expressions
- Sensitive data exposure potential
- Project-scoped access control

Reference: docs/llm-improvement/02-guardian-system.md

Note: This is a lightweight policy check for BMAD workflow.
For production, integrate with the full L0 Policy Engine.
"""

from typing import List, Tuple, Any, Dict, Optional
import re
import logging

logger = logging.getLogger(__name__)


# =============================================================================
# Policy-related Actions
# =============================================================================

POLICY_ACTIONS = [
    "DENY_ACCESS",
    "REDACT_SENSITIVE",
    "ESCALATE_TO_ADMIN",
    "REQUEST_PERMISSION",
    "SAFE_REFUSAL",
]


# =============================================================================
# Forbidden Patterns (Lightweight Check)
# =============================================================================

# Topics that should trigger policy review
SENSITIVE_TOPICS = [
    r"password",
    r"api[_\s]?key",
    r"secret[_\s]?key",
    r"access[_\s]?token",
    r"private[_\s]?key",
    r"credentials",
    r"ssn\b",  # Social Security Number
    r"credit[_\s]?card",
    r"\bpin\b",
]

# Patterns that indicate data exposure risk
DATA_EXPOSURE_PATTERNS = [
    r"select\s+\*\s+from",  # SQL wildcard select
    r"show\s+all\s+users",
    r"list\s+all\s+passwords",
    r"dump\s+(database|table)",
    r"export\s+all\s+data",
]

# Forbidden output patterns
FORBIDDEN_OUTPUT_PATTERNS = [
    r"(?:password|secret|key)\s*[=:]\s*['\"]?\S+['\"]?",  # Exposed secrets
    r"Bearer\s+[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+",  # JWT tokens
]


# =============================================================================
# Policy Check Functions
# =============================================================================

def check_policy(
    state: Dict[str, Any],
    user_context: Optional[Dict[str, Any]] = None
) -> Tuple[bool, str, List[str]]:
    """
    Validate request/response against security policies.

    Args:
        state: ChatState containing query, draft_answer, etc.
        user_context: Optional user context (permissions, project_id, etc.)

    Returns:
        (ok, reason, required_actions)
        - ok: True if policy check passes
        - reason: Explanation string
        - required_actions: Actions to take if not ok
    """
    user_query = state.get("user_query") or state.get("query", "")
    draft_answer = state.get("draft_answer", "")
    request_type = state.get("request_type", "")

    logger.debug(f"check_policy: request_type={request_type}")

    # ==========================================================================
    # Query Policy Check
    # ==========================================================================

    query_result = check_query_policy(user_query)
    if not query_result[0]:
        return query_result

    # ==========================================================================
    # Response Policy Check
    # ==========================================================================

    if draft_answer:
        response_result = check_response_policy(draft_answer)
        if not response_result[0]:
            return response_result

    # ==========================================================================
    # Permission Check (if user context provided)
    # ==========================================================================

    if user_context:
        permission_result = check_permissions(request_type, user_context)
        if not permission_result[0]:
            return permission_result

    # All checks passed
    logger.debug("check_policy: All checks passed")
    return True, "ok", []


def check_query_policy(query: str) -> Tuple[bool, str, List[str]]:
    """
    Check if user query violates any policies.

    Args:
        query: User's input query

    Returns:
        (ok, reason, required_actions)
    """
    if not query:
        return True, "ok", []

    query_lower = query.lower()

    # Check for sensitive topics in query
    for pattern in SENSITIVE_TOPICS:
        if re.search(pattern, query_lower, re.IGNORECASE):
            logger.warning(f"check_query_policy: Sensitive topic detected: {pattern}")
            return (
                False,
                f"query_contains_sensitive_topic",
                ["SAFE_REFUSAL", "REQUEST_PERMISSION"]
            )

    # Check for data exposure requests
    for pattern in DATA_EXPOSURE_PATTERNS:
        if re.search(pattern, query_lower, re.IGNORECASE):
            logger.warning(f"check_query_policy: Data exposure pattern: {pattern}")
            return (
                False,
                "query_requests_bulk_data_exposure",
                ["DENY_ACCESS", "SAFE_REFUSAL"]
            )

    return True, "ok", []


def check_response_policy(response: str) -> Tuple[bool, str, List[str]]:
    """
    Check if response contains policy violations.

    Args:
        response: Draft response text

    Returns:
        (ok, reason, required_actions)
    """
    if not response:
        return True, "ok", []

    # Check for forbidden output patterns
    for pattern in FORBIDDEN_OUTPUT_PATTERNS:
        if re.search(pattern, response, re.IGNORECASE):
            logger.warning(f"check_response_policy: Forbidden pattern: {pattern}")
            return (
                False,
                "response_exposes_sensitive_data",
                ["REDACT_SENSITIVE", "SAFE_REFUSAL"]
            )

    return True, "ok", []


def check_permissions(
    request_type: str,
    user_context: Dict[str, Any]
) -> Tuple[bool, str, List[str]]:
    """
    Check if user has permission for request type.

    Args:
        request_type: Type of request being made
        user_context: User context with roles/permissions

    Returns:
        (ok, reason, required_actions)
    """
    user_role = user_context.get("role", "MEMBER")
    project_roles = user_context.get("project_roles", [])

    # Define permission requirements by request type
    permission_map = {
        "STATUS_METRIC": ["PM", "PMO_HEAD", "SPONSOR", "ADMIN"],
        "STATUS_SUMMARY": ["PM", "PMO_HEAD", "SPONSOR", "ADMIN", "DEVELOPER", "QA"],
        "STATUS_LIST": ["PM", "PMO_HEAD", "SPONSOR", "ADMIN", "DEVELOPER", "QA", "MEMBER"],
        # Other types are generally accessible
    }

    required_roles = permission_map.get(request_type, [])

    if required_roles:
        # Check if user has any required role
        has_permission = (
            user_role in required_roles or
            any(r in required_roles for r in project_roles)
        )

        if not has_permission:
            logger.warning(
                f"check_permissions: User lacks permission. "
                f"Required: {required_roles}, Has: {user_role}, {project_roles}"
            )
            return (
                False,
                f"insufficient_permission_for_{request_type}",
                ["DENY_ACCESS", "REQUEST_PERMISSION"]
            )

    return True, "ok", []


# =============================================================================
# Helper Functions
# =============================================================================

def has_sensitive_data(text: str) -> bool:
    """Quick check if text might contain sensitive data."""
    text_lower = text.lower()
    for pattern in SENSITIVE_TOPICS:
        if re.search(pattern, text_lower, re.IGNORECASE):
            return True
    return False


def redact_sensitive_patterns(text: str) -> str:
    """
    Redact sensitive patterns from text.

    Returns text with sensitive data replaced by [REDACTED].
    """
    result = text

    for pattern in FORBIDDEN_OUTPUT_PATTERNS:
        result = re.sub(pattern, "[REDACTED]", result, flags=re.IGNORECASE)

    return result


# =============================================================================
# Exports
# =============================================================================

__all__ = [
    "check_policy",
    "check_query_policy",
    "check_response_policy",
    "check_permissions",
    "has_sensitive_data",
    "redact_sensitive_patterns",
    "POLICY_ACTIONS",
    "SENSITIVE_TOPICS",
    "DATA_EXPOSURE_PATTERNS",
    "FORBIDDEN_OUTPUT_PATTERNS",
]
