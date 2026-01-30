"""
BMAD Light Guardian - Phase 5: FAST Track

Rule-based validation for FAST track responses.
No model-based checks - only deterministic rules.

Reference: docs/llm-improvement/05-fast-track-guardian.md
"""

from typing import Dict, Any, List
import re
import random
import logging

logger = logging.getLogger(__name__)


# =============================================================================
# Configuration
# =============================================================================

SAMPLING_RATE = 0.10  # Start with 10%

MIN_RESPONSE_LENGTH = 20

SENSITIVE_PATTERNS: List[str] = [
    r"password",
    r"secret",
    r"token",
    r"api[_\s]?key",
    r"credential",
    r"private[_\s]?key",
    r"bearer",
]

DEFINITIVE_PHRASES: List[str] = [
    r"definitely",
    r"absolutely",
    r"guaranteed",
    r"always",
    r"never",
    r"100%",
    r"certainly",
    r"undoubtedly",
]


# =============================================================================
# Light Guardian Functions
# =============================================================================

def light_guardian(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Rule-based validation for FAST track.
    No model-based checks - only deterministic rules.

    Args:
        state: ChatState dictionary

    Returns:
        Updated state with guardian verdict
    """
    draft = state.get("draft_answer", "") or ""
    evidence = state.get("evidence", []) or []

    # Rule 1: Response length check (too short might be incomplete)
    if len(draft.strip()) < MIN_RESPONSE_LENGTH:
        logger.info(f"light_guardian: Response too short ({len(draft.strip())} chars)")
        state["guardian"] = {
            "verdict": "FAIL",
            "reasons": ["response_too_short"],
            "required_actions": [],
            "risk_level": "low"
        }
        return state

    # Rule 2: Numbers without evidence
    has_numbers = bool(re.search(r'\b\d+(?:\.\d+)?%?\b', draft))
    if has_numbers and len(evidence) == 0:
        logger.info("light_guardian: Numbers found without evidence")
        state["guardian"] = {
            "verdict": "FAIL",
            "reasons": ["numbers_without_evidence_in_fast_track"],
            "required_actions": [],
            "risk_level": "med"
        }
        return state

    # Rule 3: Sensitive keyword leak
    sensitive_match = check_sensitive_leak(draft)
    if sensitive_match:
        logger.warning(f"light_guardian: Potential sensitive leak: {sensitive_match}")
        state["guardian"] = {
            "verdict": "FAIL",
            "reasons": ["potential_sensitive_leak"],
            "required_actions": [],
            "risk_level": "high"
        }
        return state

    # Rule 4: Definitive claims check
    definitive_match = check_definitive_claims(draft, evidence)
    if definitive_match:
        logger.info(f"light_guardian: Definitive claim without strong evidence: {definitive_match}")
        state["guardian"] = {
            "verdict": "FAIL",
            "reasons": ["definitive_claim_without_strong_evidence"],
            "required_actions": [],
            "risk_level": "low"
        }
        return state

    # All rules passed
    logger.debug("light_guardian: All rules passed")
    state["guardian"] = {
        "verdict": "PASS",
        "reasons": [],
        "required_actions": [],
        "risk_level": "low"
    }
    return state


def check_sensitive_leak(draft: str) -> str:
    """
    Check for sensitive keyword leaks in response.

    Args:
        draft: Response text

    Returns:
        Matched pattern or empty string
    """
    for pattern in SENSITIVE_PATTERNS:
        if re.search(pattern, draft, re.IGNORECASE):
            return pattern
    return ""


def check_definitive_claims(draft: str, evidence: List[Any]) -> str:
    """
    Check for definitive claims without strong evidence.

    Args:
        draft: Response text
        evidence: Evidence list

    Returns:
        Matched phrase or empty string
    """
    for phrase in DEFINITIVE_PHRASES:
        if re.search(rf"\b{phrase}\b", draft, re.IGNORECASE):
            if len(evidence) < 2:
                return phrase
    return ""


# =============================================================================
# Sampling Functions
# =============================================================================

def should_apply_light_guardian() -> bool:
    """
    Probabilistic sampling for gradual rollout.

    Returns:
        True if Light Guardian should be applied
    """
    return random.random() < SAMPLING_RATE


def light_guardian_with_sampling(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Apply Light Guardian with sampling.

    Args:
        state: ChatState dictionary

    Returns:
        Updated state with guardian verdict
    """
    if not should_apply_light_guardian():
        # Skip validation, assume PASS
        logger.debug("light_guardian_with_sampling: Skipped by sampling")
        state["guardian"] = {
            "verdict": "PASS",
            "reasons": ["sampling_skip"],
            "required_actions": [],
            "risk_level": "low"
        }
        return state

    return light_guardian(state)


def set_sampling_rate(rate: float) -> None:
    """
    Set the sampling rate for Light Guardian.

    Args:
        rate: New sampling rate (0.0 to 1.0)
    """
    global SAMPLING_RATE
    SAMPLING_RATE = max(0.0, min(1.0, rate))
    logger.info(f"Light Guardian sampling rate set to: {SAMPLING_RATE}")


def get_sampling_rate() -> float:
    """
    Get the current sampling rate.

    Returns:
        Current sampling rate
    """
    return SAMPLING_RATE


# =============================================================================
# Helper Functions
# =============================================================================

def get_verdict(state: Dict[str, Any]) -> str:
    """
    Get guardian verdict from state.

    Args:
        state: ChatState dictionary

    Returns:
        Verdict string ("PASS", "FAIL", or "")
    """
    guardian = state.get("guardian", {})
    return guardian.get("verdict", "")


def get_risk_level(state: Dict[str, Any]) -> str:
    """
    Get risk level from state.

    Args:
        state: ChatState dictionary

    Returns:
        Risk level string
    """
    guardian = state.get("guardian", {})
    return guardian.get("risk_level", "low")


def is_high_risk(state: Dict[str, Any]) -> bool:
    """
    Check if state has high risk level.

    Args:
        state: ChatState dictionary

    Returns:
        True if high risk
    """
    return get_risk_level(state) == "high"


# =============================================================================
# Exports
# =============================================================================

__all__ = [
    # Main functions
    "light_guardian",
    "light_guardian_with_sampling",
    # Sampling functions
    "should_apply_light_guardian",
    "set_sampling_rate",
    "get_sampling_rate",
    # Check functions
    "check_sensitive_leak",
    "check_definitive_claims",
    # Helper functions
    "get_verdict",
    "get_risk_level",
    "is_high_risk",
    # Constants
    "SAMPLING_RATE",
    "MIN_RESPONSE_LENGTH",
    "SENSITIVE_PATTERNS",
    "DEFINITIVE_PHRASES",
]
