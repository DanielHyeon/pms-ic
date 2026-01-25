"""
Decision Authority Gate - Phase 1 Trust & Gates

Classifies AI actions into 4 authority levels:
- SUGGEST: Information provision only (safe default)
- DECIDE: AI self-judgment (no user confirmation needed)
- EXECUTE: System changes (reversible actions)
- COMMIT: Permanent changes (requires user approval)

Reference: docs/ai-architecture/phase1-gates-and-foundation.md
"""

from enum import Enum
from typing import Optional
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


class AuthorityLevel(Enum):
    """AI action authority levels."""
    SUGGEST = "suggest"      # Information provision only
    DECIDE = "decide"        # AI self-judgment
    EXECUTE = "execute"      # Reversible system changes
    COMMIT = "commit"        # Permanent changes (requires approval)


@dataclass
class AuthorityResult:
    """Result of authority classification."""
    level: AuthorityLevel
    reason: str
    requires_approval: bool
    approval_type: Optional[str] = None  # "user" | "manager" | "admin"
    downgrade_reason: Optional[str] = None  # If authority was limited


# Intent -> Authority mapping
INTENT_AUTHORITY_MAP = {
    # Information queries - always safe (SUGGEST)
    "project_status_query": AuthorityLevel.SUGGEST,
    "backlog_query": AuthorityLevel.SUGGEST,
    "report_query": AuthorityLevel.SUGGEST,
    "knowledge_qa": AuthorityLevel.SUGGEST,
    "sprint_query": AuthorityLevel.SUGGEST,
    "task_query": AuthorityLevel.SUGGEST,
    "user_query": AuthorityLevel.SUGGEST,
    "metric_query": AuthorityLevel.SUGGEST,
    "schedule_query": AuthorityLevel.SUGGEST,
    "risk_query": AuthorityLevel.SUGGEST,
    "general_question": AuthorityLevel.SUGGEST,
    "casual": AuthorityLevel.SUGGEST,
    "greeting": AuthorityLevel.SUGGEST,

    # AI internal decisions (DECIDE)
    "intent_classification": AuthorityLevel.DECIDE,
    "rag_retrieval": AuthorityLevel.DECIDE,
    "confidence_assessment": AuthorityLevel.DECIDE,
    "track_routing": AuthorityLevel.DECIDE,
    "query_refinement": AuthorityLevel.DECIDE,

    # Executable actions - reversible (EXECUTE)
    "generate_report_draft": AuthorityLevel.EXECUTE,
    "create_backlog_draft": AuthorityLevel.EXECUTE,
    "update_task_status": AuthorityLevel.EXECUTE,
    "create_draft": AuthorityLevel.EXECUTE,
    "update_draft": AuthorityLevel.EXECUTE,
    "generate_summary": AuthorityLevel.EXECUTE,
    "create_meeting_notes": AuthorityLevel.EXECUTE,

    # Commit actions - require approval (COMMIT)
    "finalize_sprint": AuthorityLevel.COMMIT,
    "approve_deliverable": AuthorityLevel.COMMIT,
    "delete_item": AuthorityLevel.COMMIT,
    "publish_report": AuthorityLevel.COMMIT,
    "archive_project": AuthorityLevel.COMMIT,
    "close_sprint": AuthorityLevel.COMMIT,
    "merge_items": AuthorityLevel.COMMIT,
    "bulk_update": AuthorityLevel.COMMIT,
}

# Role -> Maximum allowed authority
ROLE_MAX_AUTHORITY = {
    "ADMIN": AuthorityLevel.COMMIT,
    "admin": AuthorityLevel.COMMIT,
    "PMO_HEAD": AuthorityLevel.COMMIT,
    "pmo_head": AuthorityLevel.COMMIT,
    "PM": AuthorityLevel.EXECUTE,
    "pm": AuthorityLevel.EXECUTE,
    "DEVELOPER": AuthorityLevel.EXECUTE,
    "developer": AuthorityLevel.EXECUTE,
    "QA": AuthorityLevel.EXECUTE,
    "qa": AuthorityLevel.EXECUTE,
    "BUSINESS_ANALYST": AuthorityLevel.SUGGEST,
    "business_analyst": AuthorityLevel.SUGGEST,
    "SPONSOR": AuthorityLevel.SUGGEST,
    "sponsor": AuthorityLevel.SUGGEST,
    "AUDITOR": AuthorityLevel.SUGGEST,
    "auditor": AuthorityLevel.SUGGEST,
    "MEMBER": AuthorityLevel.SUGGEST,
    "member": AuthorityLevel.SUGGEST,
}

# Approval type by intent
INTENT_APPROVAL_TYPE = {
    "delete_item": "manager",
    "publish_report": "manager",
    "finalize_sprint": "user",
    "close_sprint": "user",
    "approve_deliverable": "manager",
    "archive_project": "admin",
    "merge_items": "user",
    "bulk_update": "manager",
}


def _authority_rank(level: AuthorityLevel) -> int:
    """Get numeric rank for authority level comparison."""
    return ["suggest", "decide", "execute", "commit"].index(level.value)


class AuthorityClassifier:
    """
    Classifies the authority level required for an AI action.

    Applies multiple gates to ensure AI actions are properly scoped:
    1. Intent-based classification (default authority for action type)
    2. Confidence-based downgrade (low confidence = SUGGEST only)
    3. Evidence-based downgrade (no evidence = cannot EXECUTE/COMMIT)
    4. Role-based limiting (user role caps maximum authority)
    """

    def __init__(
        self,
        confidence_threshold: float = 0.7,
        require_evidence_for_execute: bool = True,
    ):
        """
        Initialize authority classifier.

        Args:
            confidence_threshold: Minimum confidence for EXECUTE/COMMIT
            require_evidence_for_execute: If True, EXECUTE/COMMIT requires evidence
        """
        self.confidence_threshold = confidence_threshold
        self.require_evidence_for_execute = require_evidence_for_execute

    def classify(
        self,
        intent: str,
        user_role: str = "member",
        confidence: float = 0.5,
        has_evidence: bool = False,
    ) -> AuthorityResult:
        """
        Classify the authority level for an AI action.

        Args:
            intent: The classified intent of the request
            user_role: The role of the requesting user
            confidence: AI confidence score (0-1)
            has_evidence: Whether the response has supporting evidence

        Returns:
            AuthorityResult with level, approval requirements, and reasoning
        """
        downgrades = []

        # 1. Get base authority from intent
        base_authority = INTENT_AUTHORITY_MAP.get(intent, AuthorityLevel.SUGGEST)
        current_authority = base_authority

        # 2. Low confidence forces SUGGEST
        if confidence < self.confidence_threshold:
            if _authority_rank(current_authority) > _authority_rank(AuthorityLevel.SUGGEST):
                downgrades.append(
                    f"confidence ({confidence:.2f}) below threshold ({self.confidence_threshold})"
                )
                current_authority = AuthorityLevel.SUGGEST

        # 3. No evidence blocks EXECUTE/COMMIT
        if self.require_evidence_for_execute and not has_evidence:
            if current_authority.value in ["execute", "commit"]:
                downgrades.append("no supporting evidence provided")
                current_authority = AuthorityLevel.SUGGEST

        # 4. Apply role-based limit
        max_authority = ROLE_MAX_AUTHORITY.get(user_role, AuthorityLevel.SUGGEST)
        if _authority_rank(current_authority) > _authority_rank(max_authority):
            downgrades.append(f"role '{user_role}' limited to {max_authority.value}")
            current_authority = max_authority

        # 5. Determine approval requirements
        requires_approval = current_authority == AuthorityLevel.COMMIT
        approval_type = INTENT_APPROVAL_TYPE.get(intent) if requires_approval else None

        # Build reason string
        reason_parts = [f"intent='{intent}'", f"role='{user_role}'"]
        if confidence != 0.5:  # Only include if explicitly provided
            reason_parts.append(f"confidence={confidence:.2f}")
        if has_evidence:
            reason_parts.append("has_evidence=True")

        reason = f"Authority classification: {', '.join(reason_parts)}"

        # Add downgrade reason if applicable
        downgrade_reason = None
        if downgrades and current_authority != base_authority:
            downgrade_reason = f"Downgraded from {base_authority.value}: {'; '.join(downgrades)}"
            logger.info(f"Authority downgrade: {base_authority.value} -> {current_authority.value}: {downgrade_reason}")

        logger.debug(f"Authority classified: {current_authority.value} (intent={intent}, role={user_role})")

        return AuthorityResult(
            level=current_authority,
            reason=reason,
            requires_approval=requires_approval,
            approval_type=approval_type,
            downgrade_reason=downgrade_reason,
        )

    def can_execute(self, result: AuthorityResult) -> bool:
        """Check if the action can be executed without approval."""
        if result.requires_approval:
            return False
        return result.level.value in ["decide", "execute"]

    def can_auto_commit(self, result: AuthorityResult, user_role: str) -> bool:
        """
        Check if a COMMIT action can be auto-approved.
        Only ADMIN and PMO_HEAD can auto-approve COMMIT actions.
        """
        if not result.requires_approval:
            return True
        return user_role.upper() in ["ADMIN", "PMO_HEAD"]


# Singleton instance
_authority_classifier: Optional[AuthorityClassifier] = None


def get_authority_classifier() -> AuthorityClassifier:
    """Get singleton authority classifier instance."""
    global _authority_classifier
    if _authority_classifier is None:
        _authority_classifier = AuthorityClassifier()
    return _authority_classifier
