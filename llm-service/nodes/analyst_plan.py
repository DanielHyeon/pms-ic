"""
BMAD Analyst Plan Node - Phase 3: Analyst Plan

Generates AnalystPlan from user query before any retrieval.
No retrieval should happen without a validated AnalystPlan.

Reference: docs/llm-improvement/03-analyst-plan.md
"""

from typing import Dict, Any, List, Optional, Callable, Tuple
import logging

from guards.json_parse import extract_first_json
from guards.output_guard import validate_analyst_output, get_analyst_fallback

logger = logging.getLogger(__name__)


# =============================================================================
# Constants
# =============================================================================

# Valid request types
REQUEST_TYPES = [
    "STATUS_METRIC",
    "STATUS_SUMMARY",
    "STATUS_LIST",
    "HOWTO_POLICY",
    "DESIGN_ARCH",
    "DATA_DEFINITION",
    "TROUBLESHOOTING",
    "KNOWLEDGE_QA",
    "CASUAL",
]

# Valid tracks
TRACKS = ["FAST", "QUALITY"]

# Valid sources
VALID_SOURCES = ["db", "neo4j", "doc", "policy"]


# =============================================================================
# Source Mappings
# =============================================================================

REQUIRED_SOURCES_BY_TYPE: Dict[str, List[str]] = {
    "STATUS_METRIC": ["db"],           # DB only, doc forbidden
    "STATUS_SUMMARY": ["db"],          # DB only, doc forbidden
    "STATUS_LIST": ["db"],             # DB only, doc forbidden
    "HOWTO_POLICY": ["policy", "doc"], # Policy/doc priority
    "DESIGN_ARCH": ["doc", "policy"],  # Doc/policy for architecture
    "DATA_DEFINITION": ["policy", "doc"],
    "TROUBLESHOOTING": ["db", "neo4j"],
    "KNOWLEDGE_QA": ["doc", "neo4j"],
    "CASUAL": [],                      # No evidence needed
}

FORBIDDEN_SOURCES_BY_TYPE: Dict[str, List[str]] = {
    "STATUS_METRIC": ["doc"],
    "STATUS_SUMMARY": ["doc"],
    "STATUS_LIST": ["doc"],
}


# =============================================================================
# Prompt Template
# =============================================================================

ANALYST_PROMPT = """You are BMAD Analyst.
Return ONLY a JSON object that matches this schema (no extra text):

{{
    "intent": "string",
    "request_type": "STATUS_METRIC|STATUS_SUMMARY|STATUS_LIST|HOWTO_POLICY|DESIGN_ARCH|DATA_DEFINITION|TROUBLESHOOTING|KNOWLEDGE_QA|CASUAL",
    "track": "FAST|QUALITY",
    "required_sources": ["db|neo4j|doc|policy", ...],
    "missing_info_questions": ["string (max 1)"],
    "expected_output_schema": "string"
}}

Rules:
- If request_type is STATUS_METRIC/STATUS_SUMMARY/STATUS_LIST, required_sources MUST include "db" and MUST NOT include "doc".
- Keep missing_info_questions empty unless absolutely required. At most one question.
- expected_output_schema must be a stable identifier like "answer_v1_markdown" or "status_v1_json".

User query: {user_query}
"""


# =============================================================================
# Analyst Plan Node
# =============================================================================

def analyst_plan(
    state: Dict[str, Any],
    llm_fn: Optional[Callable[[str], str]] = None
) -> Dict[str, Any]:
    """
    Generate AnalystPlan from user query.
    Validates output against schema and resolves source conflicts.

    Args:
        state: ChatState containing user_query
        llm_fn: Optional LLM function for testing (returns text response)

    Returns:
        Updated state with analyst_plan field
    """
    user_query = state.get("user_query", "")

    logger.info(f"analyst_plan: Processing query: {user_query[:100]}...")

    # If no LLM function provided, use fallback
    if llm_fn is None:
        logger.warning("analyst_plan: No LLM function provided, using fallback")
        return _fallback_plan(state, "no_llm_fn")

    # Generate prompt and call LLM
    prompt = ANALYST_PROMPT.format(user_query=user_query)

    try:
        text = llm_fn(prompt)
    except Exception as e:
        logger.error(f"analyst_plan: LLM call failed: {e}")
        return _fallback_plan(state, f"llm_error:{str(e)}")

    # Parse JSON from response
    try:
        obj = extract_first_json(text)
    except ValueError as e:
        logger.warning(f"analyst_plan: JSON parse failed: {e}")
        return _fallback_plan(state, f"parse_error:{str(e)}")

    # Resolve known source conflicts BEFORE validation
    # This allows fixing LLM mistakes (e.g., doc in STATUS_METRIC)
    obj = resolve_source_conflicts(obj)

    # Enforce question limits
    obj = enforce_question_limits(obj)

    # Validate against schema (after conflict resolution)
    is_valid, errors = validate_analyst_output(obj)
    if not is_valid:
        logger.warning(f"analyst_plan: Validation failed: {errors}")
        return _fallback_plan(state, f"validation_failed:{errors}")

    # Store validated plan
    state["analyst_plan"] = obj

    # Sync with router values (analyst can refine)
    state["request_type"] = obj.get("request_type", state.get("request_type"))
    state["track"] = _resolve_track_conflict(
        state.get("track"),
        obj.get("track"),
        obj.get("request_type")
    )

    logger.info(
        f"analyst_plan: Created plan with intent={obj.get('intent')}, "
        f"type={obj.get('request_type')}, track={state.get('track')}"
    )

    return state


def _fallback_plan(state: Dict[str, Any], reason: str) -> Dict[str, Any]:
    """
    Fallback to safe QUALITY plan when parsing fails.

    Args:
        state: ChatState to update
        reason: Reason for fallback

    Returns:
        Updated state with fallback plan
    """
    fallback = get_analyst_fallback(reason)

    # Preserve existing request_type if available
    if state.get("request_type"):
        fallback["request_type"] = state["request_type"]
        # Adjust sources based on request type
        if fallback["request_type"] in REQUIRED_SOURCES_BY_TYPE:
            fallback["required_sources"] = REQUIRED_SOURCES_BY_TYPE[fallback["request_type"]]

    state["analyst_plan"] = fallback
    state["route_reason"] = f"analyst_plan_fallback:{reason}"

    logger.info(f"analyst_plan: Using fallback plan, reason={reason}")

    return state


# =============================================================================
# Source Conflict Resolution
# =============================================================================

def resolve_source_conflicts(plan: Dict[str, Any]) -> Dict[str, Any]:
    """
    Resolve source conflicts based on request type rules.

    - STATUS types: require db, forbid doc
    - DESIGN/POLICY types: require doc or policy

    Args:
        plan: AnalystPlan object

    Returns:
        Updated plan with resolved sources
    """
    request_type = plan.get("request_type", "")
    sources = plan.get("required_sources", [])

    # Get forbidden sources for this type
    forbidden = FORBIDDEN_SOURCES_BY_TYPE.get(request_type, [])

    # Remove forbidden sources
    if forbidden:
        original_count = len(sources)
        sources = [s for s in sources if s not in forbidden]
        if len(sources) < original_count:
            logger.warning(
                f"resolve_source_conflicts: Removed forbidden sources "
                f"for {request_type}: {forbidden}"
            )

    # Ensure required sources are present
    required = REQUIRED_SOURCES_BY_TYPE.get(request_type, [])
    for req in required:
        if req not in sources:
            sources.append(req)
            logger.info(f"resolve_source_conflicts: Added required source '{req}' for {request_type}")

    plan["required_sources"] = sources
    return plan


def get_required_sources(request_type: str) -> List[str]:
    """
    Get required sources for a request type.

    Args:
        request_type: Request type string

    Returns:
        List of required source names
    """
    return REQUIRED_SOURCES_BY_TYPE.get(request_type, []).copy()


def get_forbidden_sources(request_type: str) -> List[str]:
    """
    Get forbidden sources for a request type.

    Args:
        request_type: Request type string

    Returns:
        List of forbidden source names
    """
    return FORBIDDEN_SOURCES_BY_TYPE.get(request_type, []).copy()


def is_source_allowed(request_type: str, source: str) -> bool:
    """
    Check if a source is allowed for a request type.

    Args:
        request_type: Request type string
        source: Source name to check

    Returns:
        True if source is allowed
    """
    forbidden = FORBIDDEN_SOURCES_BY_TYPE.get(request_type, [])
    return source not in forbidden


# =============================================================================
# Track Conflict Resolution
# =============================================================================

def _resolve_track_conflict(
    router_track: Optional[str],
    analyst_track: Optional[str],
    request_type: Optional[str]
) -> str:
    """
    Resolve track conflicts between Router and Analyst.

    Rules:
    - Analyst can promote FAST → QUALITY
    - Router wins for high-stakes types (DESIGN_ARCH, DATA_DEFINITION)
    - Default to QUALITY if unset

    Args:
        router_track: Track from Router
        analyst_track: Track from Analyst
        request_type: Request type

    Returns:
        Resolved track
    """
    # High-stakes types always use QUALITY
    high_stakes_types = ["DESIGN_ARCH", "DATA_DEFINITION", "HOWTO_POLICY"]
    if request_type in high_stakes_types:
        return "QUALITY"

    # CASUAL can use FAST
    if request_type == "CASUAL":
        return analyst_track or router_track or "FAST"

    # Analyst can promote to QUALITY
    if analyst_track == "QUALITY":
        return "QUALITY"

    # Otherwise use router track or default to QUALITY
    return router_track or analyst_track or "QUALITY"


# =============================================================================
# Question Limit Enforcement
# =============================================================================

def enforce_question_limits(plan: Dict[str, Any]) -> Dict[str, Any]:
    """
    Enforce question limits based on track.

    - FAST track: 0 questions
    - QUALITY track: max 1 question

    Args:
        plan: AnalystPlan object

    Returns:
        Updated plan with enforced limits
    """
    track = plan.get("track", "QUALITY")
    questions = plan.get("missing_info_questions", [])

    if track == "FAST":
        # FAST track: no questions allowed
        if questions:
            logger.warning("enforce_question_limits: Removing questions for FAST track")
            plan["missing_info_questions"] = []
    else:
        # QUALITY track: max 1 question
        if len(questions) > 1:
            logger.warning(
                f"enforce_question_limits: Trimming questions from {len(questions)} to 1"
            )
            plan["missing_info_questions"] = questions[:1]

    return plan


def has_clarification_questions(state: Dict[str, Any]) -> bool:
    """
    Check if analyst plan has clarification questions.

    Args:
        state: ChatState containing analyst_plan

    Returns:
        True if questions exist
    """
    plan = state.get("analyst_plan", {})
    questions = plan.get("missing_info_questions", [])
    return len(questions) > 0


def get_clarification_questions(state: Dict[str, Any]) -> List[str]:
    """
    Get clarification questions from analyst plan.

    Args:
        state: ChatState containing analyst_plan

    Returns:
        List of questions (may be empty)
    """
    plan = state.get("analyst_plan", {})
    return plan.get("missing_info_questions", [])


# =============================================================================
# Helper Functions for Retrieve Integration
# =============================================================================

def get_sources_from_plan(state: Dict[str, Any]) -> List[str]:
    """
    Get required sources from analyst plan.
    Used by Retrieve node to determine which sources to query.

    Args:
        state: ChatState containing analyst_plan

    Returns:
        List of source names
    """
    plan = state.get("analyst_plan", {})
    return plan.get("required_sources", [])


def get_expected_schema(state: Dict[str, Any]) -> str:
    """
    Get expected output schema from analyst plan.

    Args:
        state: ChatState containing analyst_plan

    Returns:
        Schema identifier string
    """
    plan = state.get("analyst_plan", {})
    return plan.get("expected_output_schema", "answer_v1_markdown")


def should_skip_retrieval(state: Dict[str, Any]) -> bool:
    """
    Check if retrieval should be skipped (CASUAL request).

    Args:
        state: ChatState

    Returns:
        True if retrieval should be skipped
    """
    plan = state.get("analyst_plan", {})
    request_type = plan.get("request_type", state.get("request_type"))
    return request_type == "CASUAL"


# =============================================================================
# Exports
# =============================================================================

__all__ = [
    # Main node
    "analyst_plan",
    # Constants
    "REQUEST_TYPES",
    "TRACKS",
    "VALID_SOURCES",
    "REQUIRED_SOURCES_BY_TYPE",
    "FORBIDDEN_SOURCES_BY_TYPE",
    "ANALYST_PROMPT",
    # Source helpers
    "resolve_source_conflicts",
    "get_required_sources",
    "get_forbidden_sources",
    "is_source_allowed",
    # Question helpers
    "enforce_question_limits",
    "has_clarification_questions",
    "get_clarification_questions",
    # Retrieve integration
    "get_sources_from_plan",
    "get_expected_schema",
    "should_skip_retrieval",
]
