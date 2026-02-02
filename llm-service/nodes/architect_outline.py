"""
BMAD Architect Outline Node - Phase 4: Architect Spec

Generates ArchitectSpec defining response structure before generation.
No generation should happen without a validated ArchitectSpec.

Reference: docs/llm-improvement/04-architect-spec.md
"""

from typing import Dict, Any, List, Optional, Callable
import logging

from guards.json_parse import extract_first_json
from guards.output_guard import validate_architect_output, get_architect_fallback
from contracts.section_templates import (
    SECTION_TEMPLATES,
    DOMAIN_TERMS,
    build_spec_from_template,
    get_section_template,
    get_domain_terms,
    get_forbidden_content,
)

logger = logging.getLogger(__name__)


# =============================================================================
# Constants
# =============================================================================

# Valid response formats
RESPONSE_FORMATS = ["markdown", "json", "hybrid"]

# Section count limits
MIN_SECTIONS = 1
MAX_SECTIONS = 8


# =============================================================================
# Prompt Template
# =============================================================================

ARCHITECT_PROMPT = """You are BMAD Architect.
Return ONLY a JSON object that matches this schema:

{{
    "response_format": "markdown|json|hybrid",
    "domain_terms": ["string", ...],
    "forbidden_content": ["string", ...],
    "required_sections": ["string", ...]
}}

Rules:
- required_sections must be minimal but sufficient (3-8 sections).
- forbidden_content must include:
  - making up facts/numbers without evidence
  - disallowed sensitive content
  - any policy-prohibited items
- domain_terms must include key PMS terms relevant to the query.

User query: {user_query}
Request type: {request_type}
Track: {track}
"""


# =============================================================================
# Architect Outline Node
# =============================================================================

def architect_outline(
    state: Dict[str, Any],
    llm_fn: Optional[Callable[[str], str]] = None
) -> Dict[str, Any]:
    """
    Generate ArchitectSpec defining response contract.
    Validates output against schema and applies template defaults.

    Args:
        state: ChatState containing user_query, request_type, track
        llm_fn: Optional LLM function for testing (returns text response)

    Returns:
        Updated state with architect_spec field
    """
    user_query = state.get("user_query", "")
    request_type = state.get("request_type", "KNOWLEDGE_QA")
    track = state.get("track", "QUALITY")

    logger.info(
        f"architect_outline: Processing request_type={request_type}, track={track}"
    )

    # If no LLM function provided, use template-based spec
    if llm_fn is None:
        logger.info("architect_outline: No LLM function, using template")
        return _template_spec(state, request_type)

    # Generate prompt and call LLM
    prompt = ARCHITECT_PROMPT.format(
        user_query=user_query,
        request_type=request_type,
        track=track
    )

    try:
        text = llm_fn(prompt)
    except Exception as e:
        logger.error(f"architect_outline: LLM call failed: {e}")
        return _fallback_spec(state, f"llm_error:{str(e)}")

    # Parse JSON from response
    try:
        obj = extract_first_json(text)
    except ValueError as e:
        logger.warning(f"architect_outline: JSON parse failed: {e}")
        return _fallback_spec(state, f"parse_error:{str(e)}")

    # Merge with template defaults (ensure completeness)
    obj = merge_with_template(obj, request_type)

    # Enforce section limits
    obj = enforce_section_limits(obj)

    # Validate against schema (after merge/enforce)
    is_valid, errors = validate_architect_output(obj)
    if not is_valid:
        logger.warning(f"architect_outline: Validation failed: {errors}")
        return _fallback_spec(state, f"validation_failed:{errors}")

    # Store validated spec
    state["architect_spec"] = obj

    logger.info(
        f"architect_outline: Created spec with format={obj.get('response_format')}, "
        f"sections={len(obj.get('required_sections', []))}"
    )

    return state


def _template_spec(state: Dict[str, Any], request_type: str) -> Dict[str, Any]:
    """
    Use pure template-based spec when no LLM is available.

    Args:
        state: ChatState to update
        request_type: Request type for template selection

    Returns:
        Updated state with template-based spec
    """
    spec = build_spec_from_template(request_type)
    state["architect_spec"] = spec
    state["route_reason"] = f"{state.get('route_reason', '')}|architect_template".strip("|")

    logger.info(f"architect_outline: Using template spec for {request_type}")

    return state


def _fallback_spec(state: Dict[str, Any], reason: str) -> Dict[str, Any]:
    """
    Fallback to safe spec when parsing fails.

    Args:
        state: ChatState to update
        reason: Reason for fallback

    Returns:
        Updated state with fallback spec
    """
    fallback = get_architect_fallback(reason)

    # Try to use request_type template if available
    request_type = state.get("request_type")
    if request_type and request_type in SECTION_TEMPLATES:
        template = get_section_template(request_type)
        fallback["required_sections"] = template.get(
            "required_sections",
            fallback["required_sections"]
        )
        fallback["domain_terms"] = get_domain_terms(request_type)
        fallback["forbidden_content"] = template.get(
            "forbidden_content",
            fallback["forbidden_content"]
        )

    state["architect_spec"] = fallback
    state["route_reason"] = f"{state.get('route_reason', '')}|architect_fallback:{reason}".strip("|")

    logger.info(f"architect_outline: Using fallback spec, reason={reason}")

    return state


# =============================================================================
# Merge and Validation Helpers
# =============================================================================

def merge_with_template(spec: Dict[str, Any], request_type: str) -> Dict[str, Any]:
    """
    Merge LLM-generated spec with template defaults.
    Ensures all required fields are present and valid.

    Args:
        spec: LLM-generated spec
        request_type: Request type for template lookup

    Returns:
        Merged spec
    """
    template = get_section_template(request_type)

    # Ensure response_format is valid
    if spec.get("response_format") not in RESPONSE_FORMATS:
        spec["response_format"] = template.get("response_format", "markdown")

    # Ensure domain_terms exists and has content
    if not spec.get("domain_terms"):
        spec["domain_terms"] = get_domain_terms(request_type)

    # Ensure forbidden_content exists and has content
    if not spec.get("forbidden_content"):
        spec["forbidden_content"] = template.get(
            "forbidden_content",
            ["inventing facts"]
        )

    # Add standard forbidden content if missing
    standard_forbidden = ["inventing facts", "unauthorized access"]
    for item in standard_forbidden:
        if not any(item.lower() in fc.lower() for fc in spec.get("forbidden_content", [])):
            spec.setdefault("forbidden_content", []).append(item)

    # Ensure required_sections exists
    if not spec.get("required_sections"):
        spec["required_sections"] = template.get(
            "required_sections",
            ["Summary", "Evidence", "Answer"]
        )

    return spec


def enforce_section_limits(spec: Dict[str, Any]) -> Dict[str, Any]:
    """
    Enforce section count limits (1-8 sections).

    Args:
        spec: ArchitectSpec object

    Returns:
        Updated spec with enforced limits
    """
    sections = spec.get("required_sections", [])

    if len(sections) < MIN_SECTIONS:
        logger.warning(f"enforce_section_limits: Adding minimum section")
        spec["required_sections"] = ["Summary"]
    elif len(sections) > MAX_SECTIONS:
        logger.warning(
            f"enforce_section_limits: Trimming sections from {len(sections)} to {MAX_SECTIONS}"
        )
        spec["required_sections"] = sections[:MAX_SECTIONS]

    return spec


def validate_spec_for_request_type(
    spec: Dict[str, Any],
    request_type: str
) -> tuple[bool, List[str]]:
    """
    Validate that spec is appropriate for the request type.

    Args:
        spec: ArchitectSpec to validate
        request_type: Request type for context

    Returns:
        (is_valid, list_of_warnings)
    """
    warnings: List[str] = []

    # STATUS types should use hybrid or json format for metrics
    if request_type.startswith("STATUS"):
        if spec.get("response_format") == "json":
            # JSON is acceptable but hybrid is preferred
            pass
        forbidden = spec.get("forbidden_content", [])
        has_no_speculation = any(
            "speculation" in f.lower() or "estimated" in f.lower()
            for f in forbidden
        )
        if not has_no_speculation:
            warnings.append(
                f"STATUS type should forbid speculation/estimates"
            )

    # DESIGN_ARCH should have architecture-related sections
    if request_type == "DESIGN_ARCH":
        sections = [s.lower() for s in spec.get("required_sections", [])]
        has_arch_section = any(
            "arch" in s or "component" in s or "design" in s
            for s in sections
        )
        if not has_arch_section:
            warnings.append(
                "DESIGN_ARCH should have architecture-related sections"
            )

    return len(warnings) == 0, warnings


# =============================================================================
# Helper Functions for Generate Integration
# =============================================================================

def get_spec_from_state(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Get ArchitectSpec from state.

    Args:
        state: ChatState containing architect_spec

    Returns:
        ArchitectSpec dictionary (or default)
    """
    return state.get("architect_spec", {})


def get_response_format_from_spec(state: Dict[str, Any]) -> str:
    """
    Get response format from ArchitectSpec.

    Args:
        state: ChatState containing architect_spec

    Returns:
        Response format string
    """
    spec = get_spec_from_state(state)
    return spec.get("response_format", "markdown")


def get_sections_from_spec(state: Dict[str, Any]) -> List[str]:
    """
    Get required sections from ArchitectSpec.

    Args:
        state: ChatState containing architect_spec

    Returns:
        List of section names
    """
    spec = get_spec_from_state(state)
    return spec.get("required_sections", ["Summary", "Evidence", "Answer"])


def get_forbidden_from_spec(state: Dict[str, Any]) -> List[str]:
    """
    Get forbidden content from ArchitectSpec.

    Args:
        state: ChatState containing architect_spec

    Returns:
        List of forbidden content patterns
    """
    spec = get_spec_from_state(state)
    return spec.get("forbidden_content", ["inventing facts"])


def get_domain_terms_from_spec(state: Dict[str, Any]) -> List[str]:
    """
    Get domain terms from ArchitectSpec.

    Args:
        state: ChatState containing architect_spec

    Returns:
        List of domain terms
    """
    spec = get_spec_from_state(state)
    return spec.get("domain_terms", [])


def should_use_json_format(state: Dict[str, Any]) -> bool:
    """
    Check if response should be in JSON format.

    Args:
        state: ChatState

    Returns:
        True if JSON format is required
    """
    return get_response_format_from_spec(state) == "json"


# =============================================================================
# Exports
# =============================================================================

__all__ = [
    # Main node
    "architect_outline",
    # Constants
    "RESPONSE_FORMATS",
    "MIN_SECTIONS",
    "MAX_SECTIONS",
    "ARCHITECT_PROMPT",
    # Merge helpers
    "merge_with_template",
    "enforce_section_limits",
    "validate_spec_for_request_type",
    # State helpers
    "get_spec_from_state",
    "get_response_format_from_spec",
    "get_sections_from_spec",
    "get_forbidden_from_spec",
    "get_domain_terms_from_spec",
    "should_use_json_format",
]
