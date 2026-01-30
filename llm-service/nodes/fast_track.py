"""
BMAD FAST Track - Phase 5: Decision Logic and Generation

Handles FAST track specific logic:
- Decision routing after Light Guardian
- FAST answer generation with simple prompt
- Safe exit handling

Reference: docs/llm-improvement/05-fast-track-guardian.md
"""

from typing import Dict, Any, List, Callable, Optional
import logging

logger = logging.getLogger(__name__)


# =============================================================================
# Configuration
# =============================================================================

# Request types that should upgrade to QUALITY on failure
UPGRADE_REQUEST_TYPES: List[str] = [
    "DESIGN_ARCH",
    "HOWTO_POLICY",
    "DATA_DEFINITION",
    "TROUBLESHOOTING",
]

# Safe exit message
SAFE_EXIT_MESSAGE = (
    "I've limited my response to ensure safety. "
    "(Insufficient evidence or potential sensitivity)\n"
    "For a detailed answer, I can use the QUALITY path "
    "with full verification."
)

# FAST track generation prompt
FAST_PROMPT = """Answer concisely and safely.
If you lack evidence, avoid definitive claims and offer next steps.

User query: {user_query}
"""


# =============================================================================
# Decision Functions
# =============================================================================

def fast_guard_decision(state: Dict[str, Any]) -> str:
    """
    Decision logic after Light Guardian.

    Args:
        state: ChatState dictionary

    Returns:
        Decision string: "end", "upgrade", or "safe_exit"
    """
    verdict = (state.get("guardian") or {}).get("verdict", "PASS")

    if verdict == "PASS":
        # Success - finalize
        if not state.get("final_answer"):
            state["final_answer"] = state.get("draft_answer", "")
        logger.debug("fast_guard_decision: PASS -> end")
        return "end"

    # FAIL handling
    request_type = state.get("request_type", "")

    # Complex request types should upgrade to QUALITY
    if request_type in UPGRADE_REQUEST_TYPES:
        logger.info(f"fast_guard_decision: FAIL + {request_type} -> upgrade")
        return "upgrade"

    # Check if marked for upgrade
    if state.get("_upgrade_to_quality"):
        logger.info("fast_guard_decision: FAIL + _upgrade_to_quality -> upgrade")
        return "upgrade"

    # Otherwise, safe exit with limited response
    logger.info("fast_guard_decision: FAIL -> safe_exit")
    return "safe_exit"


def apply_safe_exit(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Apply safe exit response to state.

    Args:
        state: ChatState dictionary

    Returns:
        Updated state with safe exit message
    """
    state["final_answer"] = SAFE_EXIT_MESSAGE
    state["_safe_exit"] = True
    logger.info("apply_safe_exit: Applied safe exit message")
    return state


def should_upgrade_to_quality(state: Dict[str, Any]) -> bool:
    """
    Check if FAST track should upgrade to QUALITY.

    Args:
        state: ChatState dictionary

    Returns:
        True if should upgrade
    """
    decision = fast_guard_decision(state)
    return decision == "upgrade"


def is_safe_exit(state: Dict[str, Any]) -> bool:
    """
    Check if state is in safe exit mode.

    Args:
        state: ChatState dictionary

    Returns:
        True if safe exit was applied
    """
    return state.get("_safe_exit", False)


# =============================================================================
# Generation Functions
# =============================================================================

def generate_fast_answer(
    state: Dict[str, Any],
    llm_fn: Optional[Callable[[str], str]] = None
) -> Dict[str, Any]:
    """
    Quick generation for FAST track.
    No ArchitectSpec - just direct response.

    Args:
        state: ChatState dictionary
        llm_fn: Optional LLM function for generation

    Returns:
        Updated state with draft_answer
    """
    user_query = state.get("user_query", "")
    prompt = FAST_PROMPT.format(user_query=user_query)

    if llm_fn:
        try:
            draft = llm_fn(prompt)
            state["draft_answer"] = draft
            logger.debug(f"generate_fast_answer: Generated {len(draft)} chars")
        except Exception as e:
            logger.error(f"generate_fast_answer: LLM error: {e}")
            state["draft_answer"] = ""
    else:
        # Fallback without LLM - minimal response
        state["draft_answer"] = f"Regarding your question about: {user_query}"
        logger.debug("generate_fast_answer: Using fallback (no LLM)")

    return state


def get_fast_prompt(user_query: str) -> str:
    """
    Get formatted FAST track prompt.

    Args:
        user_query: User's question

    Returns:
        Formatted prompt string
    """
    return FAST_PROMPT.format(user_query=user_query)


# =============================================================================
# FAST Track Pipeline
# =============================================================================

def run_fast_pipeline(
    state: Dict[str, Any],
    llm_fn: Optional[Callable[[str], str]] = None
) -> Dict[str, Any]:
    """
    Run complete FAST track pipeline.

    Pipeline:
    1. Light Policy Gate
    2. Generate (if passed)
    3. Light Guardian
    4. Decision (end/upgrade/safe_exit)

    Args:
        state: ChatState dictionary
        llm_fn: Optional LLM function

    Returns:
        Updated state after pipeline
    """
    from nodes.light_policy_gate import light_policy_gate, is_policy_blocked
    from nodes.light_guardian import light_guardian

    # Step 1: Light Policy Gate
    state = light_policy_gate(state)
    if is_policy_blocked(state):
        logger.info("run_fast_pipeline: Blocked by policy gate")
        return state

    # Step 2: Generate
    state = generate_fast_answer(state, llm_fn)

    # Step 3: Light Guardian
    state = light_guardian(state)

    # Step 4: Decision
    decision = fast_guard_decision(state)

    if decision == "safe_exit":
        state = apply_safe_exit(state)

    return state


def is_fast_track(state: Dict[str, Any]) -> bool:
    """
    Check if state is on FAST track.

    Args:
        state: ChatState dictionary

    Returns:
        True if track is FAST
    """
    return state.get("track", "").upper() == "FAST"


def mark_for_quality_upgrade(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Mark state for upgrade to QUALITY track.

    Args:
        state: ChatState dictionary

    Returns:
        Updated state with upgrade marker
    """
    state["_upgrade_to_quality"] = True
    logger.info("mark_for_quality_upgrade: State marked for QUALITY upgrade")
    return state


# =============================================================================
# Exports
# =============================================================================

__all__ = [
    # Decision functions
    "fast_guard_decision",
    "apply_safe_exit",
    "should_upgrade_to_quality",
    "is_safe_exit",
    # Generation functions
    "generate_fast_answer",
    "get_fast_prompt",
    # Pipeline functions
    "run_fast_pipeline",
    "is_fast_track",
    "mark_for_quality_upgrade",
    # Constants
    "UPGRADE_REQUEST_TYPES",
    "SAFE_EXIT_MESSAGE",
    "FAST_PROMPT",
]
