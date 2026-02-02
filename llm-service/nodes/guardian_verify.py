"""
BMAD Guardian Verify Node - Phase 2: Guardian System

Main verification node that combines:
1. Policy check (first - no retry allowed)
2. Evidence check
3. Contract check (QUALITY track only)

Returns verdict: PASS, RETRY, or FAIL with reasons and required actions.

Reference: docs/llm-improvement/02-guardian-system.md
"""

from typing import Dict, Any, List, Optional
import logging

from guards.evidence_check import check_evidence
from guards.contract_check import check_contract
from guards.policy_check import check_policy

logger = logging.getLogger(__name__)


# =============================================================================
# Constants
# =============================================================================

MAX_RETRY = 2  # Maximum retry attempts before FAIL

# Valid verdicts
VERDICT_PASS = "PASS"
VERDICT_RETRY = "RETRY"
VERDICT_FAIL = "FAIL"

# Risk levels
RISK_HIGH = "high"
RISK_MED = "med"
RISK_LOW = "low"


# =============================================================================
# Guardian Verify Node
# =============================================================================

def guardian_verify(
    state: Dict[str, Any],
    user_context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Main Guardian verification node.

    Combines policy, evidence, and contract checks to produce
    a verdict (PASS/RETRY/FAIL) with reasons and required actions.

    Args:
        state: ChatState containing all workflow data
        user_context: Optional user context for permission checks

    Returns:
        Updated state with 'guardian' field containing:
        - verdict: "PASS", "RETRY", or "FAIL"
        - reasons: List of failure/retry reasons
        - required_actions: List of actions to take
        - risk_level: "high", "med", or "low"
    """
    retry_count = state.get("retry_count", 0)
    track = state.get("track", "QUALITY")
    reasons: List[str] = []
    actions: List[str] = []

    logger.info(
        f"guardian_verify: track={track}, retry_count={retry_count}, "
        f"request_type={state.get('request_type')}"
    )

    # ==========================================================================
    # Step 0: Policy Check (FIRST - no retry allowed for policy violations)
    # ==========================================================================

    policy_ok, policy_reason, policy_actions = check_policy(state, user_context)

    if not policy_ok:
        logger.warning(f"guardian_verify: Policy check failed: {policy_reason}")
        state["guardian"] = {
            "verdict": VERDICT_FAIL,
            "reasons": [policy_reason],
            "required_actions": policy_actions or ["SAFE_REFUSAL"],
            "risk_level": RISK_HIGH
        }
        return state

    # ==========================================================================
    # Step 1: Evidence Check
    # ==========================================================================

    evidence_ok, evidence_reason, evidence_actions = check_evidence(state)

    if not evidence_ok:
        reasons.append(evidence_reason)
        actions.extend(evidence_actions)

        # QUALITY track can RETRY if under limit
        if track == "QUALITY" and retry_count < MAX_RETRY:
            logger.info(
                f"guardian_verify: Evidence check failed, triggering RETRY. "
                f"Reason: {evidence_reason}"
            )
            state["guardian"] = {
                "verdict": VERDICT_RETRY,
                "reasons": reasons,
                "required_actions": _deduplicate(actions),
                "risk_level": RISK_MED
            }
            return state

        # Max retries exceeded or FAST track - FAIL
        logger.warning(
            f"guardian_verify: Evidence check failed, FAIL. "
            f"Reason: {evidence_reason}"
        )
        state["guardian"] = {
            "verdict": VERDICT_FAIL,
            "reasons": reasons,
            "required_actions": ["ASK_MINIMAL_QUESTION"],
            "risk_level": RISK_MED
        }
        return state

    # ==========================================================================
    # Step 2: Contract Check (QUALITY track only)
    # ==========================================================================

    if track == "QUALITY":
        contract_ok, contract_reason, contract_actions = check_contract(state)

        if not contract_ok:
            reasons.append(contract_reason)
            actions.extend(contract_actions)

            # Can RETRY if under limit
            if retry_count < MAX_RETRY:
                logger.info(
                    f"guardian_verify: Contract check failed, triggering RETRY. "
                    f"Reason: {contract_reason}"
                )
                state["guardian"] = {
                    "verdict": VERDICT_RETRY,
                    "reasons": reasons,
                    "required_actions": _deduplicate(actions),
                    "risk_level": RISK_LOW
                }
                return state

            # Max retries exceeded - FAIL
            logger.warning(
                f"guardian_verify: Contract check failed, FAIL. "
                f"Reason: {contract_reason}"
            )
            state["guardian"] = {
                "verdict": VERDICT_FAIL,
                "reasons": reasons,
                "required_actions": ["SAFE_REFUSAL"],
                "risk_level": RISK_LOW
            }
            return state

    # ==========================================================================
    # Step 3: All Checks Passed
    # ==========================================================================

    logger.info("guardian_verify: All checks passed, PASS")
    state["guardian"] = {
        "verdict": VERDICT_PASS,
        "reasons": [],
        "required_actions": [],
        "risk_level": RISK_LOW
    }
    return state


# =============================================================================
# Verdict Decision Helper
# =============================================================================

def decide_verdict(
    evidence_ok: bool,
    contract_ok: bool,
    policy_ok: bool,
    retry_count: int,
    max_retry: int = MAX_RETRY
) -> str:
    """
    Decision matrix for Guardian verdict.

    Args:
        evidence_ok: Evidence check result
        contract_ok: Contract check result
        policy_ok: Policy check result
        retry_count: Current retry count
        max_retry: Maximum allowed retries

    Returns:
        Verdict string: "PASS", "RETRY", or "FAIL"
    """
    # Policy violation is immediate FAIL (no retry)
    if not policy_ok:
        return VERDICT_FAIL

    # Evidence or contract issues can RETRY
    if not evidence_ok or not contract_ok:
        if retry_count < max_retry:
            return VERDICT_RETRY
        return VERDICT_FAIL

    return VERDICT_PASS


# =============================================================================
# Helper Functions
# =============================================================================

def _deduplicate(items: List[str]) -> List[str]:
    """Remove duplicates while preserving order."""
    seen = set()
    result = []
    for item in items:
        if item not in seen:
            seen.add(item)
            result.append(item)
    return result


def get_guardian_summary(state: Dict[str, Any]) -> str:
    """
    Get a human-readable summary of Guardian verdict.

    Args:
        state: State containing 'guardian' field

    Returns:
        Summary string
    """
    guardian = state.get("guardian", {})
    verdict = guardian.get("verdict", "UNKNOWN")
    reasons = guardian.get("reasons", [])
    actions = guardian.get("required_actions", [])

    summary = f"Verdict: {verdict}"
    if reasons:
        summary += f"\nReasons: {', '.join(reasons)}"
    if actions:
        summary += f"\nRequired Actions: {', '.join(actions)}"

    return summary


def should_retry(state: Dict[str, Any]) -> bool:
    """Check if state indicates a RETRY verdict."""
    guardian = state.get("guardian", {})
    return guardian.get("verdict") == VERDICT_RETRY


def should_pass(state: Dict[str, Any]) -> bool:
    """Check if state indicates a PASS verdict."""
    guardian = state.get("guardian", {})
    return guardian.get("verdict") == VERDICT_PASS


def should_fail(state: Dict[str, Any]) -> bool:
    """Check if state indicates a FAIL verdict."""
    guardian = state.get("guardian", {})
    return guardian.get("verdict") == VERDICT_FAIL


# =============================================================================
# Exports
# =============================================================================

__all__ = [
    "guardian_verify",
    "decide_verdict",
    "get_guardian_summary",
    "should_retry",
    "should_pass",
    "should_fail",
    "MAX_RETRY",
    "VERDICT_PASS",
    "VERDICT_RETRY",
    "VERDICT_FAIL",
    "RISK_HIGH",
    "RISK_MED",
    "RISK_LOW",
]
