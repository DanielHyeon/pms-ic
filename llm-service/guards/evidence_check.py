"""
BMAD Evidence Check - Phase 2: Guardian System

Validates evidence sufficiency for BMAD workflow responses.

Rules:
- QUALITY track: min 2 evidence, source diversity >= 2, confidence >= 0.60
- FAST track: min 1 evidence preferred, no strict requirements
- STATUS types (METRIC/SUMMARY/LIST): require db, forbid doc
- HOWTO/DESIGN/DATA types: require doc OR policy

Reference: docs/llm-improvement/02-guardian-system.md
"""

from typing import List, Tuple, Any, Dict
import logging

logger = logging.getLogger(__name__)


# =============================================================================
# Required Actions Enum Values
# =============================================================================

# Evidence-related actions
EVIDENCE_ACTIONS = [
    "ADD_EVIDENCE",
    "RETRIEVE_MORE",
    "DIVERSIFY_SOURCES",
    "REMOVE_DOC_EVIDENCE",
    "USE_DB_ONLY",
    "RETRIEVE_DB",
    "RETRIEVE_DOC",
    "RETRIEVE_POLICY",
    "REFINE_QUERY",
]


# =============================================================================
# Evidence Check Function
# =============================================================================

def check_evidence(state: Dict[str, Any]) -> Tuple[bool, str, List[str]]:
    """
    Validate evidence sufficiency based on track and request type.

    Args:
        state: ChatState containing track, request_type, evidence

    Returns:
        (ok, reason, required_actions)
        - ok: True if evidence is sufficient
        - reason: Explanation string (e.g., "ok", "insufficient_evidence_count(<2)")
        - required_actions: List of suggested actions if not ok
    """
    request_type = state.get("request_type", "")
    track = state.get("track", "QUALITY")
    evidence: List[Dict[str, Any]] = state.get("evidence", []) or []

    logger.debug(
        f"check_evidence: track={track}, request_type={request_type}, "
        f"evidence_count={len(evidence)}"
    )

    # ==========================================================================
    # QUALITY Track Requirements
    # ==========================================================================

    if track == "QUALITY":
        # Minimum 2 evidence items
        if len(evidence) < 2:
            return (
                False,
                f"insufficient_evidence_count({len(evidence)}<2)",
                ["ADD_EVIDENCE", "RETRIEVE_MORE"]
            )

        # Source diversity check (at least 2 different sources)
        sources = {e.get("source") for e in evidence if e.get("source")}
        if len(sources) < 2:
            return (
                False,
                f"low_source_diversity({len(sources)}<2)",
                ["DIVERSIFY_SOURCES", "RETRIEVE_MORE"]
            )

    # ==========================================================================
    # Request Type Specific Rules
    # ==========================================================================

    sources = {e.get("source") for e in evidence if e.get("source")}

    # STATUS types: DB required, doc forbidden
    if request_type in ("STATUS_METRIC", "STATUS_SUMMARY", "STATUS_LIST"):
        if "doc" in sources:
            return (
                False,
                "status_request_must_not_use_doc_as_primary",
                ["REMOVE_DOC_EVIDENCE", "USE_DB_ONLY"]
            )
        if evidence and "db" not in sources:
            return (
                False,
                "status_request_requires_db",
                ["USE_DB_ONLY", "RETRIEVE_DB"]
            )

    # Design/Policy/Data types: doc or policy required
    if request_type in ("HOWTO_POLICY", "DATA_DEFINITION", "DESIGN_ARCH"):
        if ("doc" not in sources) and ("policy" not in sources):
            if track == "QUALITY":
                return (
                    False,
                    "design_policy_requires_doc_or_policy",
                    ["RETRIEVE_DOC", "RETRIEVE_POLICY"]
                )

    # ==========================================================================
    # Confidence Check (QUALITY Track)
    # ==========================================================================

    if track == "QUALITY" and evidence:
        confidences = [e.get("confidence", 0.0) for e in evidence]
        avg_conf = sum(confidences) / len(confidences)

        if avg_conf < 0.60:
            return (
                False,
                f"low_evidence_confidence(avg={avg_conf:.2f}<0.60)",
                ["RETRIEVE_MORE", "REFINE_QUERY"]
            )

    # All checks passed
    logger.debug("check_evidence: All checks passed")
    return True, "ok", []


# =============================================================================
# Helper Functions
# =============================================================================

def get_evidence_sources(evidence: List[Dict[str, Any]]) -> List[str]:
    """Extract unique source types from evidence list."""
    return list({e.get("source") for e in evidence if e.get("source")})


def calculate_average_confidence(evidence: List[Dict[str, Any]]) -> float:
    """Calculate average confidence score from evidence list."""
    if not evidence:
        return 0.0
    confidences = [e.get("confidence", 0.0) for e in evidence]
    return sum(confidences) / len(confidences)


def has_required_source(evidence: List[Dict[str, Any]], source: str) -> bool:
    """Check if evidence list contains a specific source type."""
    sources = get_evidence_sources(evidence)
    return source in sources


def has_forbidden_source(
    evidence: List[Dict[str, Any]],
    forbidden: List[str]
) -> Tuple[bool, List[str]]:
    """
    Check if evidence list contains forbidden source types.

    Returns:
        (has_forbidden, list_of_found_forbidden_sources)
    """
    sources = get_evidence_sources(evidence)
    found = [s for s in sources if s in forbidden]
    return bool(found), found


# =============================================================================
# Exports
# =============================================================================

__all__ = [
    "check_evidence",
    "get_evidence_sources",
    "calculate_average_confidence",
    "has_required_source",
    "has_forbidden_source",
    "EVIDENCE_ACTIONS",
]
