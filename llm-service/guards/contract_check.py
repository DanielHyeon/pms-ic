"""
BMAD Contract Check - Phase 2 & 4: Guardian System + Architect Spec

Validates draft response against ArchitectSpec contract.

Checks:
- Required sections are present (as headers or in content)
- Forbidden content is not present
- Domain terms are used appropriately
- STATUS types have evidence references for numbers
- Format compliance (markdown/json/hybrid)
- Hallucination pattern detection

Reference: docs/llm-improvement/02-guardian-system.md
Reference: docs/llm-improvement/04-architect-spec.md
"""

from typing import List, Tuple, Any, Dict
import re
import json
import logging

logger = logging.getLogger(__name__)


# =============================================================================
# Contract-related Actions
# =============================================================================

CONTRACT_ACTIONS = [
    "ADD_REQUIRED_SECTIONS",
    "REMOVE_FORBIDDEN_CONTENT",
    "USE_DOMAIN_TERMS",
    "REGENERATE_DRAFT",
]


# =============================================================================
# Contract Check Function
# =============================================================================

def check_contract(state: Dict[str, Any]) -> Tuple[bool, str, List[str]]:
    """
    Validate draft response against ArchitectSpec contract.

    Args:
        state: ChatState containing architect_spec and draft_answer

    Returns:
        (ok, reason, required_actions)
        - ok: True if draft meets contract requirements
        - reason: Explanation string
        - required_actions: List of suggested actions if not ok
    """
    spec = state.get("architect_spec") or {}
    draft = state.get("draft_answer") or ""

    if not draft:
        return False, "no_draft_answer", ["REGENERATE_DRAFT"]

    required_sections = spec.get("required_sections", [])
    forbidden_content = spec.get("forbidden_content", [])
    domain_terms = spec.get("domain_terms", [])

    logger.debug(
        f"check_contract: required_sections={required_sections}, "
        f"forbidden={forbidden_content}, domain_terms={domain_terms}"
    )

    # ==========================================================================
    # Section Check
    # ==========================================================================

    if required_sections:
        missing = check_required_sections(draft, required_sections)
        if missing:
            return (
                False,
                f"missing_required_sections={missing}",
                ["ADD_REQUIRED_SECTIONS", "REGENERATE_DRAFT"]
            )

    # ==========================================================================
    # Forbidden Content Check
    # ==========================================================================

    if forbidden_content:
        found = check_forbidden_content(draft, forbidden_content)
        if found:
            return (
                False,
                f"forbidden_content_detected={found}",
                ["REMOVE_FORBIDDEN_CONTENT", "REGENERATE_DRAFT"]
            )

    # ==========================================================================
    # Domain Terms Usage Check
    # ==========================================================================

    if domain_terms:
        used = check_domain_terms_usage(draft, domain_terms)
        if len(used) == 0:
            return (
                False,
                "domain_terms_not_used",
                ["USE_DOMAIN_TERMS", "REGENERATE_DRAFT"]
            )

    # ==========================================================================
    # STATUS Evidence Check (Phase 4)
    # ==========================================================================

    request_type = state.get("request_type", "")
    if request_type.startswith("STATUS"):
        ok, reason, actions = check_status_evidence(draft)
        if not ok:
            return ok, reason, actions

    # ==========================================================================
    # Format Compliance Check (Phase 4)
    # ==========================================================================

    response_format = spec.get("response_format", "markdown")
    format_ok, format_reason = validate_response_format(draft, response_format)
    if not format_ok:
        return False, format_reason, ["FIX_JSON_FORMAT", "REGENERATE_DRAFT"]

    # All checks passed
    logger.debug("check_contract: All checks passed")
    return True, "ok", []


# =============================================================================
# Helper Functions
# =============================================================================

def check_required_sections(draft: str, required_sections: List[str]) -> List[str]:
    """
    Check if required sections are present in draft.

    Looks for sections as:
    - Markdown headers (## Section or # Section)
    - Plain text containing section name

    Args:
        draft: Draft response text
        required_sections: List of required section names

    Returns:
        List of missing section names
    """
    missing = []

    for section in required_sections:
        if not section:
            continue

        # Check for exact match
        if section in draft:
            continue

        # Check for markdown header format (case-insensitive)
        header_pattern = rf"#{{1,3}}\s*{re.escape(section)}"
        if re.search(header_pattern, draft, re.IGNORECASE):
            continue

        # Check for section name anywhere (case-insensitive)
        if section.lower() in draft.lower():
            continue

        missing.append(section)

    return missing


def check_forbidden_content(
    draft: str,
    forbidden_content: List[str]
) -> List[str]:
    """
    Check if forbidden content is present in draft.

    Args:
        draft: Draft response text
        forbidden_content: List of forbidden phrases/terms

    Returns:
        List of found forbidden content
    """
    draft_lower = draft.lower()
    found = []

    for content in forbidden_content:
        if not content:
            continue
        if content.lower() in draft_lower:
            found.append(content)

    return found


def check_domain_terms_usage(
    draft: str,
    domain_terms: List[str]
) -> List[str]:
    """
    Check which domain terms are used in draft.

    Args:
        draft: Draft response text
        domain_terms: List of expected domain terms

    Returns:
        List of used domain terms
    """
    used = []

    for term in domain_terms:
        if not term:
            continue
        # Case-sensitive check for domain terms (e.g., "Sprint" vs "sprint")
        if term in draft:
            used.append(term)

    return used


def validate_response_format(
    draft: str,
    expected_format: str
) -> Tuple[bool, str]:
    """
    Validate response format matches expected format.

    Args:
        draft: Draft response text
        expected_format: Expected format ("markdown", "json", "hybrid")

    Returns:
        (is_valid, reason)
    """
    if expected_format == "markdown":
        # Check for markdown indicators
        has_headers = bool(re.search(r'^#{1,6}\s', draft, re.MULTILINE))
        has_lists = bool(re.search(r'^[-*]\s', draft, re.MULTILINE))
        has_code = bool(re.search(r'```', draft))

        if has_headers or has_lists or has_code:
            return True, "valid_markdown"
        # Plain text is also acceptable for markdown
        return True, "plain_text_acceptable"

    elif expected_format == "json":
        # Check if response is valid JSON
        import json
        try:
            json.loads(draft)
            return True, "valid_json"
        except json.JSONDecodeError:
            return False, "invalid_json_format"

    elif expected_format == "hybrid":
        # Hybrid allows both markdown and embedded JSON
        return True, "hybrid_accepted"

    return True, "unknown_format_accepted"


# =============================================================================
# Phase 4: Enhanced Validation Functions
# =============================================================================

def check_status_evidence(draft: str) -> Tuple[bool, str, List[str]]:
    """
    Check that STATUS type responses have evidence references for numbers.

    Args:
        draft: Draft answer text

    Returns:
        (is_valid, reason, actions)
    """
    # Find numeric values (including percentages)
    numbers = re.findall(r'\b\d+(?:\.\d+)?%?\b', draft)

    if not numbers:
        # No numbers, no need for references
        return True, "ok", []

    # Check for evidence references [1], [2], etc.
    references = re.findall(r'\[\d+\]', draft)

    # Also check for inline source mentions
    source_mentions = re.findall(
        r'\b(from|according to|source:|based on|DB|database)\b',
        draft,
        re.IGNORECASE
    )

    if not references and not source_mentions:
        logger.info(
            f"check_status_evidence: Found {len(numbers)} numbers without evidence"
        )
        return False, "numbers_without_evidence_reference", [
            "ADD_EVIDENCE_REFERENCES", "REGENERATE_DRAFT"
        ]

    return True, "ok", []


def check_evidence_density(
    draft: str,
    min_references: int = 1
) -> Tuple[bool, str, List[str]]:
    """
    Check if draft has sufficient evidence references.

    Args:
        draft: Draft answer text
        min_references: Minimum number of references required

    Returns:
        (is_valid, reason, actions)
    """
    references = re.findall(r'\[\d+\]', draft)

    if len(references) < min_references:
        return False, f"insufficient_evidence_refs={len(references)}", [
            "ADD_EVIDENCE", "REGENERATE_DRAFT"
        ]

    return True, "ok", []


def check_section_depth(
    draft: str,
    required_sections: List[str],
    min_chars_per_section: int = 50
) -> Tuple[bool, str, List[str]]:
    """
    Check if each section has sufficient content.

    Args:
        draft: Draft answer text
        required_sections: List of required section names
        min_chars_per_section: Minimum characters per section

    Returns:
        (is_valid, reason, actions)
    """
    shallow_sections = []

    for i, section in enumerate(required_sections):
        if not section:
            continue

        # Find section start
        pattern = rf"^##?\s*{re.escape(section)}[:\s]*"
        match = re.search(pattern, draft, re.MULTILINE | re.I)

        if not match:
            continue

        section_start = match.end()

        # Find next section or end
        if i < len(required_sections) - 1:
            next_section = required_sections[i + 1]
            next_pattern = rf"^##?\s*{re.escape(next_section)}[:\s]*"
            next_match = re.search(
                next_pattern,
                draft[section_start:],
                re.MULTILINE | re.I
            )
            section_end = section_start + next_match.start() if next_match else len(draft)
        else:
            section_end = len(draft)

        section_content = draft[section_start:section_end].strip()

        if len(section_content) < min_chars_per_section:
            shallow_sections.append(section)

    if shallow_sections:
        return False, f"shallow_sections={shallow_sections}", [
            "ADD_REQUIRED_SECTIONS", "REGENERATE_DRAFT"
        ]

    return True, "ok", []


def check_hallucination_patterns(draft: str) -> Tuple[bool, str, List[str]]:
    """
    Check for common hallucination patterns.

    Args:
        draft: Draft answer text

    Returns:
        (is_valid, reason, actions)
    """
    hallucination_patterns = [
        r"I think",
        r"I believe",
        r"probably",
        r"might be",
        r"could be around",
        r"approximately \d+%\s+completion",  # Guessed percentages
        r"based on my knowledge",
        r"as far as I know",
    ]

    for pattern in hallucination_patterns:
        if re.search(pattern, draft, re.IGNORECASE):
            logger.info(f"check_hallucination_patterns: Found pattern: {pattern}")
            return False, f"hallucination_pattern_detected={pattern}", [
                "REMOVE_FORBIDDEN_CONTENT", "REGENERATE_DRAFT"
            ]

    return True, "ok", []


def full_contract_check(
    state: Dict[str, Any],
    strict: bool = False
) -> Tuple[bool, str, List[str]]:
    """
    Perform full contract validation with all checks.

    Args:
        state: ChatState with architect_spec and draft_answer
        strict: If True, apply stricter validation rules

    Returns:
        (is_valid, reason, actions)
    """
    # Basic contract check
    ok, reason, actions = check_contract(state)
    if not ok:
        return ok, reason, actions

    draft = state.get("draft_answer", "")
    spec = state.get("architect_spec", {})

    # Additional checks for strict mode
    if strict:
        # Hallucination check
        ok, reason, actions = check_hallucination_patterns(draft)
        if not ok:
            return ok, reason, actions

        # Evidence density check
        if state.get("request_type", "").startswith("STATUS"):
            ok, reason, actions = check_evidence_density(draft, min_references=1)
            if not ok:
                return ok, reason, actions

        # Section depth check
        required_sections = spec.get("required_sections", [])
        if required_sections:
            ok, reason, actions = check_section_depth(
                draft,
                required_sections,
                min_chars_per_section=30
            )
            if not ok:
                return ok, reason, actions

    return True, "ok", []


# =============================================================================
# Exports
# =============================================================================

__all__ = [
    # Main functions
    "check_contract",
    "full_contract_check",
    # Helper functions
    "check_required_sections",
    "check_forbidden_content",
    "check_domain_terms_usage",
    "validate_response_format",
    # Phase 4 functions
    "check_status_evidence",
    "check_evidence_density",
    "check_section_depth",
    "check_hallucination_patterns",
    # Constants
    "CONTRACT_ACTIONS",
]
