"""
AI Response Schema - Phase 1 Trust & Gates

Standardized AI response format with:
- Authority level classification
- Evidence/source linking
- Confidence scoring
- Failure information
- Action tracking

Reference: docs/ai-architecture/phase1-gates-and-foundation.md
"""

from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime
import uuid


class ResponseStatus(Enum):
    """AI response status."""
    SUCCESS = "success"              # Response generated successfully
    PARTIAL = "partial"              # Partial response (some data missing)
    FAILED = "failed"                # Response generation failed
    PENDING_APPROVAL = "pending_approval"  # Waiting for user approval
    REJECTED = "rejected"            # User rejected the action
    EXPIRED = "expired"              # Approval request expired


@dataclass
class Evidence:
    """Evidence/source information for AI response."""
    source_type: str      # document | issue | task | meeting | decision | sprint
    source_id: str        # ID in source system
    source_title: str     # Human-readable title
    relevance_score: float  # 0-1, relevance to query
    excerpt: Optional[str] = None  # Relevant excerpt
    url: Optional[str] = None      # Link to source


@dataclass
class ActionRecord:
    """Record of an action taken or pending."""
    action_type: str      # create | update | delete | execute
    target_type: str      # task | sprint | report | backlog
    target_id: Optional[str] = None
    description: str = ""
    status: str = "pending"  # pending | completed | failed | cancelled
    executed_at: Optional[str] = None
    error: Optional[str] = None


@dataclass
class AIResponse:
    """
    Standardized AI response schema.

    This schema ensures all AI responses include:
    1. The response content
    2. Authority level and approval requirements
    3. Confidence score and supporting evidence
    4. Status and error information
    5. Actions taken or pending
    6. Metadata for tracing and monitoring
    """

    # Core response
    content: str
    intent: str

    # Authority Gate
    authority_level: str = "suggest"  # suggest | decide | execute | commit
    requires_approval: bool = False
    approval_type: Optional[str] = None  # user | manager | admin
    approval_status: Optional[str] = None  # pending | approved | rejected

    # Confidence & Evidence
    confidence: float = 0.0
    evidence: List[Evidence] = field(default_factory=list)
    has_sufficient_evidence: bool = False

    # Status
    status: ResponseStatus = ResponseStatus.SUCCESS
    error_code: Optional[str] = None
    error_message: Optional[str] = None

    # Failure Recovery
    failure: Optional[Dict[str, Any]] = None
    recovery: Optional[Dict[str, Any]] = None

    # Actions
    actions_taken: List[ActionRecord] = field(default_factory=list)
    actions_pending: List[ActionRecord] = field(default_factory=list)

    # Metadata
    response_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    trace_id: str = ""
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    processing_time_ms: int = 0
    model_used: str = ""
    track: str = ""  # track_a | track_b

    def to_dict(self) -> Dict[str, Any]:
        """Convert response to dictionary for JSON serialization."""
        return {
            "response_id": self.response_id,
            "content": self.content,
            "intent": self.intent,
            "authority": {
                "level": self.authority_level,
                "requires_approval": self.requires_approval,
                "approval_type": self.approval_type,
                "approval_status": self.approval_status,
            },
            "confidence": self.confidence,
            "evidence": [
                {
                    "source_type": e.source_type,
                    "source_id": e.source_id,
                    "source_title": e.source_title,
                    "relevance_score": e.relevance_score,
                    "excerpt": e.excerpt,
                    "url": e.url,
                }
                for e in self.evidence
            ],
            "has_sufficient_evidence": self.has_sufficient_evidence,
            "status": self.status.value,
            "error": {
                "code": self.error_code,
                "message": self.error_message,
            } if self.error_code else None,
            "failure": self.failure,
            "recovery": self.recovery,
            "actions": {
                "taken": [
                    {
                        "action_type": a.action_type,
                        "target_type": a.target_type,
                        "target_id": a.target_id,
                        "description": a.description,
                        "status": a.status,
                        "executed_at": a.executed_at,
                        "error": a.error,
                    }
                    for a in self.actions_taken
                ],
                "pending": [
                    {
                        "action_type": a.action_type,
                        "target_type": a.target_type,
                        "target_id": a.target_id,
                        "description": a.description,
                        "status": a.status,
                    }
                    for a in self.actions_pending
                ],
            },
            "metadata": {
                "trace_id": self.trace_id,
                "timestamp": self.timestamp,
                "processing_time_ms": self.processing_time_ms,
                "model_used": self.model_used,
                "track": self.track,
            },
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "AIResponse":
        """Create AIResponse from dictionary."""
        # Extract evidence
        evidence_data = data.get("evidence", [])
        evidence = [
            Evidence(
                source_type=e.get("source_type", ""),
                source_id=e.get("source_id", ""),
                source_title=e.get("source_title", ""),
                relevance_score=e.get("relevance_score", 0),
                excerpt=e.get("excerpt"),
                url=e.get("url"),
            )
            for e in evidence_data
        ]

        # Extract actions
        actions_data = data.get("actions", {})
        actions_taken = [
            ActionRecord(
                action_type=a.get("action_type", ""),
                target_type=a.get("target_type", ""),
                target_id=a.get("target_id"),
                description=a.get("description", ""),
                status=a.get("status", "completed"),
                executed_at=a.get("executed_at"),
                error=a.get("error"),
            )
            for a in actions_data.get("taken", [])
        ]
        actions_pending = [
            ActionRecord(
                action_type=a.get("action_type", ""),
                target_type=a.get("target_type", ""),
                target_id=a.get("target_id"),
                description=a.get("description", ""),
                status="pending",
            )
            for a in actions_data.get("pending", [])
        ]

        # Extract authority
        authority = data.get("authority", {})

        # Extract metadata
        metadata = data.get("metadata", {})

        # Extract error
        error = data.get("error", {})

        return cls(
            response_id=data.get("response_id", str(uuid.uuid4())),
            content=data.get("content", ""),
            intent=data.get("intent", ""),
            authority_level=authority.get("level", "suggest"),
            requires_approval=authority.get("requires_approval", False),
            approval_type=authority.get("approval_type"),
            approval_status=authority.get("approval_status"),
            confidence=data.get("confidence", 0),
            evidence=evidence,
            has_sufficient_evidence=data.get("has_sufficient_evidence", False),
            status=ResponseStatus(data.get("status", "success")),
            error_code=error.get("code") if error else None,
            error_message=error.get("message") if error else None,
            failure=data.get("failure"),
            recovery=data.get("recovery"),
            actions_taken=actions_taken,
            actions_pending=actions_pending,
            trace_id=metadata.get("trace_id", ""),
            timestamp=metadata.get("timestamp", datetime.utcnow().isoformat()),
            processing_time_ms=metadata.get("processing_time_ms", 0),
            model_used=metadata.get("model_used", ""),
            track=metadata.get("track", ""),
        )

    def add_evidence(self, evidence_item: Evidence) -> None:
        """Add an evidence item to the response."""
        self.evidence.append(evidence_item)

    def add_action_taken(self, action: ActionRecord) -> None:
        """Record an action that was taken."""
        action.status = "completed"
        action.executed_at = datetime.utcnow().isoformat()
        self.actions_taken.append(action)

    def add_action_pending(self, action: ActionRecord) -> None:
        """Record a pending action that requires approval."""
        action.status = "pending"
        self.actions_pending.append(action)

    def set_failure(self, failure_info: Dict[str, Any], recovery_info: Dict[str, Any]) -> None:
        """Set failure and recovery information."""
        self.failure = failure_info
        self.recovery = recovery_info
        self.status = ResponseStatus.FAILED

    def mark_pending_approval(self, approval_type: str = "user") -> None:
        """Mark response as pending approval."""
        self.requires_approval = True
        self.approval_type = approval_type
        self.approval_status = "pending"
        self.status = ResponseStatus.PENDING_APPROVAL

    def approve(self, approved_by: Optional[str] = None) -> None:
        """Approve the pending response."""
        self.approval_status = "approved"
        self.status = ResponseStatus.SUCCESS

    def reject(self, reason: Optional[str] = None) -> None:
        """Reject the pending response."""
        self.approval_status = "rejected"
        self.status = ResponseStatus.REJECTED
        if reason:
            self.error_message = reason


def create_error_response(
    error_code: str,
    error_message: str,
    intent: str = "unknown",
    trace_id: str = "",
) -> AIResponse:
    """Create a standardized error response."""
    return AIResponse(
        content=error_message,
        intent=intent,
        authority_level="suggest",
        requires_approval=False,
        confidence=0.0,
        status=ResponseStatus.FAILED,
        error_code=error_code,
        error_message=error_message,
        trace_id=trace_id,
    )


def create_approval_request(
    content: str,
    intent: str,
    actions: List[ActionRecord],
    approval_type: str = "user",
    trace_id: str = "",
) -> AIResponse:
    """Create a response requesting approval for actions."""
    response = AIResponse(
        content=content,
        intent=intent,
        authority_level="commit",
        requires_approval=True,
        approval_type=approval_type,
        approval_status="pending",
        status=ResponseStatus.PENDING_APPROVAL,
        trace_id=trace_id,
    )
    response.actions_pending = actions
    return response
