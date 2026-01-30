"""
BMAD State Contracts - Phase 1: State & Contract Design

TypedDict definitions for structured state management across BMAD roles:
- ChatState: Main workflow state
- AnalystPlan: Analyst stage output
- ArchitectSpec: Architect stage output
- GuardianReport: Guardian verification output
- EvidenceItem: Evidence structure

Reference: docs/llm-improvement/01-state-contract-design.md
"""

from typing import TypedDict, Literal, List, Optional, Dict, Any
from enum import Enum


# =============================================================================
# Request Type Classification
# =============================================================================

class RequestType(str, Enum):
    """
    Request type classification for routing and evidence rules.

    STATUS_* types: Require db source, forbid doc source
    DESIGN/HOWTO types: Require doc or policy source
    """
    STATUS_METRIC = "STATUS_METRIC"        # Quantitative metrics (velocity, completion rate)
    STATUS_SUMMARY = "STATUS_SUMMARY"      # Sprint/project status summary
    STATUS_LIST = "STATUS_LIST"            # List of items (tasks, blockers, risks)
    HOWTO_POLICY = "HOWTO_POLICY"          # How-to guides, policy questions
    DESIGN_ARCH = "DESIGN_ARCH"            # Architecture, design decisions
    DATA_DEFINITION = "DATA_DEFINITION"    # Data definitions, schema questions
    TROUBLESHOOTING = "TROUBLESHOOTING"    # Problem diagnosis, debugging
    KNOWLEDGE_QA = "KNOWLEDGE_QA"          # General knowledge Q&A
    CASUAL = "CASUAL"                       # Casual conversation, greetings


class Track(str, Enum):
    """
    Execution track classification.

    FAST: Lightweight validation, minimal evidence, quick response
    QUALITY: Full BMAD loop with retries, strict evidence requirements
    """
    FAST = "FAST"
    QUALITY = "QUALITY"


class GuardianVerdict(str, Enum):
    """Guardian verification verdicts."""
    PASS = "PASS"      # All checks passed, proceed to finalize
    RETRY = "RETRY"    # Recoverable issues, retry with guidance
    FAIL = "FAIL"      # Unrecoverable issues, safe exit required


class RiskLevel(str, Enum):
    """Risk level classification for Guardian reports."""
    LOW = "low"
    MEDIUM = "med"
    HIGH = "high"


# =============================================================================
# Evidence Structure
# =============================================================================

class EvidenceItem(TypedDict):
    """
    Evidence item structure for grounding responses.

    source: Evidence source type (db, neo4j, doc, policy)
    ref: Unique reference identifier (query_id, chunk_id, etc.)
    snippet: Relevant excerpt or value
    confidence: Relevance/confidence score (0.0-1.0)
    """
    source: Literal["db", "neo4j", "doc", "policy"]
    ref: str
    snippet: str
    confidence: float


# =============================================================================
# BMAD Stage Outputs
# =============================================================================

class AnalystPlan(TypedDict):
    """
    Analyst stage output - planning intent, scope, and sources.

    Entry ticket for Retrieve stage.
    """
    intent: str                              # Intent label (e.g., "query_sprint_velocity")
    request_type: str                        # RequestType enum value
    track: str                               # Track enum value (FAST/QUALITY)
    required_sources: List[str]              # Sources to query: ["db", "neo4j", "doc", "policy"]
    missing_info_questions: List[str]        # Clarifying questions (max 1, prefer 0)
    expected_output_schema: str              # Output schema identifier


class ArchitectSpec(TypedDict):
    """
    Architect stage output - response structure and constraints.

    Entry ticket for Generate stage.
    """
    response_format: Literal["markdown", "json", "hybrid"]
    domain_terms: List[str]                  # Domain-specific terms to use
    forbidden_content: List[str]             # Content patterns to avoid
    required_sections: List[str]             # Required response sections


class GuardianReport(TypedDict):
    """
    Guardian verification output - quality gate judgment.

    Determines PASS/RETRY/FAIL with actionable guidance.
    """
    verdict: str                             # GuardianVerdict enum value
    reasons: List[str]                       # Failure/retry reasons
    required_actions: List[str]              # Actions to take on RETRY
    risk_level: str                          # RiskLevel enum value


# =============================================================================
# Main Chat State
# =============================================================================

class ChatState(TypedDict, total=False):
    """
    Main BMAD workflow state.

    Extends the existing TwoTrackState with BMAD-specific fields.
    Uses total=False to make all fields optional for incremental updates.
    """
    # Input
    user_query: str                          # Original user query
    message: str                             # Alias for user_query (compatibility)
    context: List[Dict[str, Any]]            # Conversation context
    user_id: Optional[str]
    project_id: Optional[str]

    # Access control
    user_role: Optional[str]
    user_access_level: int

    # Routing (Phase 1)
    track: str                               # Track enum value (FAST/QUALITY)
    request_type: str                        # RequestType enum value
    route_reason: str                        # Routing decision explanation

    # BMAD Stage Outputs
    analyst_plan: AnalystPlan                # Analyst stage output
    architect_spec: ArchitectSpec            # Architect stage output
    guardian: GuardianReport                 # Guardian verification output

    # Evidence (Phase 1)
    evidence: List[EvidenceItem]             # Collected evidence items
    has_sufficient_evidence: bool

    # RAG/Retrieval
    retrieved_docs: List[str]
    rag_results: List[Dict[str, Any]]
    rag_quality_score: float
    current_query: str

    # Generation
    draft_answer: str                        # Draft before Guardian verification
    final_answer: str                        # Final verified answer
    compiled_context: str                    # Context for generation

    # Retry Loop
    retry_count: int                         # Current retry count (max 2-3)

    # Response metadata
    response: str                            # Legacy field (use final_answer)
    confidence: float
    intent: str

    # Authority Gate
    authority_level: str                     # suggest | decide | execute | commit
    requires_approval: bool
    approval_type: Optional[str]

    # Failure handling
    failure: Optional[Dict[str, Any]]
    recovery: Optional[Dict[str, Any]]

    # Observability
    trace_id: str
    response_id: str
    timings_ms: Dict[str, int]               # Node timing measurements
    metrics: Dict[str, Any]
    debug_info: Dict[str, Any]

    # Status Query Engine (existing)
    answer_type: str
    answer_type_confidence: float
    status_query_plan: Optional[Dict[str, Any]]
    status_query_result: Optional[Dict[str, Any]]
    status_response_contract: Optional[Dict[str, Any]]
    use_status_workflow: bool

    # FAST track specific
    _upgrade_to_quality: bool                # Flag to upgrade FAST to QUALITY


# =============================================================================
# Track Policy Table
# =============================================================================

TRACK_POLICY = {
    Track.FAST: {
        "min_evidence": 0,          # No minimum, but recommend 1
        "source_diversity": 0,      # No diversity requirement
        "min_confidence": 0.0,      # No minimum confidence
        "allow_retry": False,       # No retry loop
        "guardian_type": "light",   # Rule-based only
    },
    Track.QUALITY: {
        "min_evidence": 2,          # Minimum 2 evidence items
        "source_diversity": 2,      # At least 2 different sources recommended
        "min_confidence": 0.65,     # Minimum average confidence
        "allow_retry": True,        # RETRY loop allowed
        "max_retry": 2,             # Maximum retry count
        "guardian_type": "full",    # Rule + model-based
    }
}


# =============================================================================
# Required Sources by Request Type
# =============================================================================

REQUIRED_SOURCES_BY_TYPE: Dict[str, List[str]] = {
    RequestType.STATUS_METRIC.value: ["db"],
    RequestType.STATUS_SUMMARY.value: ["db"],
    RequestType.STATUS_LIST.value: ["db"],
    RequestType.HOWTO_POLICY.value: ["policy", "doc"],
    RequestType.DESIGN_ARCH.value: ["doc", "policy"],
    RequestType.DATA_DEFINITION.value: ["policy", "doc"],
    RequestType.TROUBLESHOOTING.value: ["db", "neo4j"],
    RequestType.KNOWLEDGE_QA.value: ["doc", "neo4j"],
    RequestType.CASUAL.value: [],
}

FORBIDDEN_SOURCES_BY_TYPE: Dict[str, List[str]] = {
    RequestType.STATUS_METRIC.value: ["doc"],
    RequestType.STATUS_SUMMARY.value: ["doc"],
    RequestType.STATUS_LIST.value: ["doc"],
}


# =============================================================================
# Helper Functions
# =============================================================================

def get_track_policy(track: str) -> Dict[str, Any]:
    """Get policy configuration for a track."""
    try:
        track_enum = Track(track)
        return TRACK_POLICY.get(track_enum, TRACK_POLICY[Track.QUALITY])
    except ValueError:
        return TRACK_POLICY[Track.QUALITY]


def get_required_sources(request_type: str) -> List[str]:
    """Get required sources for a request type."""
    return REQUIRED_SOURCES_BY_TYPE.get(request_type, ["doc"])


def get_forbidden_sources(request_type: str) -> List[str]:
    """Get forbidden sources for a request type."""
    return FORBIDDEN_SOURCES_BY_TYPE.get(request_type, [])


def is_source_allowed(request_type: str, source: str) -> bool:
    """Check if a source is allowed for the given request type."""
    forbidden = get_forbidden_sources(request_type)
    return source not in forbidden


def create_initial_state(
    user_query: str,
    user_id: Optional[str] = None,
    project_id: Optional[str] = None,
    context: Optional[List[Dict[str, Any]]] = None
) -> ChatState:
    """Create initial ChatState with default values."""
    import uuid

    return ChatState(
        user_query=user_query,
        message=user_query,
        context=context or [],
        user_id=user_id,
        project_id=project_id,
        track=Track.QUALITY.value,
        request_type=RequestType.KNOWLEDGE_QA.value,
        route_reason="",
        evidence=[],
        has_sufficient_evidence=False,
        retrieved_docs=[],
        rag_results=[],
        rag_quality_score=0.0,
        current_query=user_query,
        draft_answer="",
        final_answer="",
        compiled_context="",
        retry_count=0,
        response="",
        confidence=0.0,
        intent="",
        authority_level="suggest",
        requires_approval=False,
        approval_type=None,
        failure=None,
        recovery=None,
        trace_id=str(uuid.uuid4())[:8],
        response_id=str(uuid.uuid4()),
        timings_ms={},
        metrics={},
        debug_info={},
        _upgrade_to_quality=False,
    )
