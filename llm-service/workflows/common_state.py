"""
Phase 2: Common Workflow State Schema

Defines the CommonWorkflowState used by all LangGraph workflows.
This ensures consistent structure across G1-G5 workflow templates.
"""

from typing import TypedDict, List, Dict, Any, Optional
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime


class DecisionMode(Enum):
    """Authority levels for AI actions."""
    SUGGEST = "suggest"      # Information provision only
    DECIDE = "decide"        # AI self-judgment
    EXECUTE = "execute"      # Reversible system changes
    COMMIT = "commit"        # Permanent changes (requires approval)


class FailureType(Enum):
    """Failure types for workflow recovery."""
    INFO_MISSING = "info_missing"           # Required data/docs/estimates missing
    CONFLICT = "conflict"                   # Conflicting evidence/definitions/states
    POLICY_VIOLATION = "policy_violation"   # RBAC/data boundary/forbidden actions
    LOW_CONFIDENCE = "low_confidence"       # Verification threshold not met
    TOOL_ERROR = "tool_error"               # MCP call error/timeout/invalid schema
    DATA_BOUNDARY = "data_boundary"         # Cross-project/tenant data risk


class WorkflowStatus(Enum):
    """Workflow execution status."""
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    WAITING_APPROVAL = "waiting_approval"
    CANCELLED = "cancelled"


class CommonWorkflowState(TypedDict, total=False):
    """
    Common Workflow State - inherited by all workflows.

    This TypedDict defines the standard fields that all
    G1-G5 workflow templates share.
    """

    # === Identifiers ===
    tenant_id: str
    project_id: str
    user_id: str
    role: str  # PO/PM/SM/Dev/Viewer
    request_id: str
    trace_id: str

    # === Intent ===
    intent: str  # weekly_report / sprint_plan / trace_check / risk_scan / knowledge_qa

    # === Context Snapshot ===
    context_snapshot: Dict[str, Any]
    # Contains: phase_state, wbs_state, backlog_state, sprint_state, kanban_state

    # === Retrieval Results ===
    retrieval: Dict[str, Any]
    # - docs[]: vector search results
    # - graph_facts[]: neo4j query results
    # - metrics[]: analytics data
    # - events[]: event log

    # === Intermediate Outputs ===
    draft: Dict[str, Any]  # Report draft / recommended scope / risk list etc.

    # === Evidence Mapping ===
    evidence_map: List[Dict[str, Any]]  # [{claim: str, evidence_ids: [str]}]

    # === Confidence ===
    confidence: float  # 0~1

    # === Policy Result ===
    policy_result: Dict[str, Any]
    # - allowed_actions: List[str]
    # - denied_reason: Optional[str]

    # === Failure Information ===
    failure: Optional[Dict[str, Any]]
    # - type: FailureType
    # - detail: str
    # - retry_count: int
    # - recovery_action: str

    # === Decision Gate ===
    decision_gate: Dict[str, Any]
    # - mode: DecisionMode
    # - requires_human_approval: bool

    # === Final Output ===
    result: Dict[str, Any]
    status: str  # running / completed / failed / waiting_approval


@dataclass
class WorkflowContext:
    """
    Runtime context for workflow execution.

    Provides helper methods for accessing common state fields.
    """
    state: CommonWorkflowState

    @property
    def project_id(self) -> str:
        return self.state.get("project_id", "")

    @property
    def user_id(self) -> str:
        return self.state.get("user_id", "")

    @property
    def role(self) -> str:
        return self.state.get("role", "")

    @property
    def trace_id(self) -> str:
        return self.state.get("trace_id", "")

    @property
    def is_failed(self) -> bool:
        return self.state.get("failure") is not None

    @property
    def is_completed(self) -> bool:
        return self.state.get("status") == WorkflowStatus.COMPLETED.value

    @property
    def requires_approval(self) -> bool:
        gate = self.state.get("decision_gate", {})
        return gate.get("requires_human_approval", False)

    def get_confidence(self) -> float:
        return self.state.get("confidence", 0.0)

    def get_evidence_count(self) -> int:
        return len(self.state.get("evidence_map", []))

    def add_failure(
        self,
        failure_type: FailureType,
        detail: str,
        retry_count: int = 0
    ) -> Dict[str, Any]:
        """Create a failure dict."""
        return {
            "type": failure_type.value,
            "detail": detail,
            "retry_count": retry_count,
            "recovery_action": None,
        }


@dataclass
class Evidence:
    """Evidence item linked to a claim."""
    source_type: str  # document, issue, task, meeting, sprint, etc.
    source_id: str
    title: str
    excerpt: Optional[str] = None
    relevance_score: float = 0.0
    url: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "source_type": self.source_type,
            "source_id": self.source_id,
            "title": self.title,
            "excerpt": self.excerpt,
            "relevance_score": self.relevance_score,
            "url": self.url,
        }


@dataclass
class EvidenceMap:
    """Mapping from claim to evidence."""
    claim: str
    evidence_ids: List[str]
    evidence: List[Evidence] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "claim": self.claim,
            "evidence_ids": self.evidence_ids,
            "evidence": [e.to_dict() for e in self.evidence],
        }


def create_initial_state(
    project_id: str,
    user_id: str,
    role: str,
    intent: str,
    tenant_id: str = "default",
    request_id: Optional[str] = None,
    trace_id: Optional[str] = None,
) -> CommonWorkflowState:
    """
    Create initial workflow state with required fields.

    Args:
        project_id: Target project ID
        user_id: Requesting user ID
        role: User's role (PO/PM/SM/Dev/Viewer)
        intent: Workflow intent (weekly_report/sprint_plan/etc.)
        tenant_id: Tenant identifier (default: "default")
        request_id: Optional request ID
        trace_id: Optional trace ID for observability

    Returns:
        CommonWorkflowState with initialized fields
    """
    import uuid

    return CommonWorkflowState(
        tenant_id=tenant_id,
        project_id=project_id,
        user_id=user_id,
        role=role,
        request_id=request_id or str(uuid.uuid4()),
        trace_id=trace_id or str(uuid.uuid4()),
        intent=intent,
        context_snapshot={},
        retrieval={},
        draft={},
        evidence_map=[],
        confidence=0.0,
        policy_result={},
        failure=None,
        decision_gate={
            "mode": DecisionMode.SUGGEST.value,
            "requires_human_approval": False,
        },
        result={},
        status=WorkflowStatus.RUNNING.value,
    )


def merge_state(
    base: CommonWorkflowState,
    updates: Dict[str, Any]
) -> CommonWorkflowState:
    """
    Merge updates into base state immutably.

    Args:
        base: Current workflow state
        updates: Fields to update

    Returns:
        New state with merged updates
    """
    return {**base, **updates}
