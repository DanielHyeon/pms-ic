"""
Failure Taxonomy - Phase 1 Trust & Gates

Structured failure classification with recovery strategies.

Categories:
- INFORMATION: Missing/outdated/conflicting data
- POLICY: Permission/boundary violations
- TECHNICAL: System/infrastructure issues
- CONFIDENCE: Trust/evidence problems

Reference: docs/ai-architecture/phase1-gates-and-foundation.md
"""

from enum import Enum
from dataclasses import dataclass, field
from typing import Optional, Dict, Any, List
import logging
import time

logger = logging.getLogger(__name__)


class FailureCategory(Enum):
    """High-level failure categories."""
    INFORMATION = "information"    # Data quality/availability issues
    POLICY = "policy"              # Permission/boundary violations
    TECHNICAL = "technical"        # System/infrastructure issues
    CONFIDENCE = "confidence"      # Trust/evidence problems


class FailureCode(Enum):
    """Specific failure codes with recovery strategies."""

    # Information failures
    INFO_MISSING = "info_missing"              # Required information not found
    INFO_OUTDATED = "info_outdated"            # Information is stale
    INFO_CONFLICTING = "info_conflicting"      # Contradictory information
    INFO_AMBIGUOUS = "info_ambiguous"          # Unclear/vague information
    INFO_INCOMPLETE = "info_incomplete"        # Partial information available

    # Policy failures
    POLICY_UNAUTHORIZED = "policy_unauthorized"  # User lacks permission
    POLICY_BOUNDARY = "policy_boundary"          # Data scope violation
    POLICY_PROHIBITED = "policy_prohibited"      # Action is forbidden
    POLICY_RATE_LIMIT = "policy_rate_limit"      # Rate limit exceeded

    # Technical failures
    TECH_LLM_ERROR = "tech_llm_error"          # LLM call failed
    TECH_DB_ERROR = "tech_db_error"            # Database access failed
    TECH_RAG_ERROR = "tech_rag_error"          # RAG search failed
    TECH_TIMEOUT = "tech_timeout"              # Operation timed out
    TECH_RESOURCE = "tech_resource"            # Resource exhausted

    # Confidence failures
    CONF_LOW = "conf_low"                      # Overall confidence too low
    CONF_NO_EVIDENCE = "conf_no_evidence"      # No supporting evidence
    CONF_UNCERTAIN = "conf_uncertain"          # Model uncertain about response
    CONF_HALLUCINATION = "conf_hallucination"  # Detected potential hallucination


@dataclass
class FailureInfo:
    """Detailed failure information."""
    code: FailureCode
    category: FailureCategory
    message: str                # Internal message (for logs)
    user_message: str           # User-facing message
    recovery_hint: str          # Suggestion for user
    is_recoverable: bool        # Can the system recover automatically?
    retry_allowed: bool         # Can the operation be retried?
    max_retries: int = 3
    severity: str = "warning"   # "info" | "warning" | "error" | "critical"


# Failure definition table
FAILURE_DEFINITIONS: Dict[FailureCode, FailureInfo] = {
    # Information failures
    FailureCode.INFO_MISSING: FailureInfo(
        code=FailureCode.INFO_MISSING,
        category=FailureCategory.INFORMATION,
        message="Required information not found in knowledge base",
        user_message="요청하신 정보를 찾을 수 없습니다.",
        recovery_hint="질문을 더 구체적으로 작성하거나 관련 문서를 업로드해주세요.",
        is_recoverable=True,
        retry_allowed=True,
        severity="warning",
    ),
    FailureCode.INFO_OUTDATED: FailureInfo(
        code=FailureCode.INFO_OUTDATED,
        category=FailureCategory.INFORMATION,
        message="Information in knowledge base is outdated",
        user_message="관련 정보가 오래되어 정확하지 않을 수 있습니다.",
        recovery_hint="최신 문서를 확인하거나 담당자에게 문의해주세요.",
        is_recoverable=False,
        retry_allowed=False,
        severity="warning",
    ),
    FailureCode.INFO_CONFLICTING: FailureInfo(
        code=FailureCode.INFO_CONFLICTING,
        category=FailureCategory.INFORMATION,
        message="Conflicting information found in sources",
        user_message="상충되는 정보가 발견되었습니다. 확인이 필요합니다.",
        recovery_hint="어떤 정보가 최신인지 확인해주세요.",
        is_recoverable=True,
        retry_allowed=False,
        severity="warning",
    ),
    FailureCode.INFO_AMBIGUOUS: FailureInfo(
        code=FailureCode.INFO_AMBIGUOUS,
        category=FailureCategory.INFORMATION,
        message="Query is ambiguous or unclear",
        user_message="질문이 모호합니다. 더 구체적으로 말씀해주세요.",
        recovery_hint="어떤 프로젝트/스프린트/항목에 대한 질문인지 명시해주세요.",
        is_recoverable=True,
        retry_allowed=True,
        severity="info",
    ),
    FailureCode.INFO_INCOMPLETE: FailureInfo(
        code=FailureCode.INFO_INCOMPLETE,
        category=FailureCategory.INFORMATION,
        message="Only partial information available",
        user_message="일부 정보만 찾을 수 있었습니다.",
        recovery_hint="전체 정보가 필요하면 담당자에게 문의해주세요.",
        is_recoverable=True,
        retry_allowed=True,
        severity="info",
    ),

    # Policy failures
    FailureCode.POLICY_UNAUTHORIZED: FailureInfo(
        code=FailureCode.POLICY_UNAUTHORIZED,
        category=FailureCategory.POLICY,
        message="User does not have permission for this action",
        user_message="이 작업을 수행할 권한이 없습니다.",
        recovery_hint="관리자에게 권한 요청이 필요합니다.",
        is_recoverable=False,
        retry_allowed=False,
        severity="error",
    ),
    FailureCode.POLICY_BOUNDARY: FailureInfo(
        code=FailureCode.POLICY_BOUNDARY,
        category=FailureCategory.POLICY,
        message="Request violates data boundary policy",
        user_message="요청이 데이터 접근 범위를 벗어납니다.",
        recovery_hint="해당 프로젝트에 대한 접근 권한을 확인해주세요.",
        is_recoverable=False,
        retry_allowed=False,
        severity="error",
    ),
    FailureCode.POLICY_PROHIBITED: FailureInfo(
        code=FailureCode.POLICY_PROHIBITED,
        category=FailureCategory.POLICY,
        message="Requested action is prohibited by policy",
        user_message="이 작업은 정책상 금지되어 있습니다.",
        recovery_hint="다른 방법을 시도하거나 관리자에게 문의해주세요.",
        is_recoverable=False,
        retry_allowed=False,
        severity="error",
    ),
    FailureCode.POLICY_RATE_LIMIT: FailureInfo(
        code=FailureCode.POLICY_RATE_LIMIT,
        category=FailureCategory.POLICY,
        message="Rate limit exceeded for this operation",
        user_message="요청 횟수 제한을 초과했습니다.",
        recovery_hint="잠시 후 다시 시도해주세요.",
        is_recoverable=True,
        retry_allowed=True,
        max_retries=1,
        severity="warning",
    ),

    # Technical failures
    FailureCode.TECH_LLM_ERROR: FailureInfo(
        code=FailureCode.TECH_LLM_ERROR,
        category=FailureCategory.TECHNICAL,
        message="LLM service returned an error",
        user_message="AI 서비스에 일시적인 문제가 발생했습니다.",
        recovery_hint="잠시 후 다시 시도해주세요.",
        is_recoverable=True,
        retry_allowed=True,
        max_retries=3,
        severity="error",
    ),
    FailureCode.TECH_DB_ERROR: FailureInfo(
        code=FailureCode.TECH_DB_ERROR,
        category=FailureCategory.TECHNICAL,
        message="Database access failed",
        user_message="데이터베이스에 접근할 수 없습니다.",
        recovery_hint="잠시 후 다시 시도해주세요.",
        is_recoverable=True,
        retry_allowed=True,
        max_retries=3,
        severity="error",
    ),
    FailureCode.TECH_RAG_ERROR: FailureInfo(
        code=FailureCode.TECH_RAG_ERROR,
        category=FailureCategory.TECHNICAL,
        message="RAG search service failed",
        user_message="검색 서비스에 문제가 발생했습니다.",
        recovery_hint="잠시 후 다시 시도해주세요.",
        is_recoverable=True,
        retry_allowed=True,
        max_retries=2,
        severity="error",
    ),
    FailureCode.TECH_TIMEOUT: FailureInfo(
        code=FailureCode.TECH_TIMEOUT,
        category=FailureCategory.TECHNICAL,
        message="Operation timed out",
        user_message="처리 시간이 초과되었습니다.",
        recovery_hint="요청을 간소화하거나 잠시 후 다시 시도해주세요.",
        is_recoverable=True,
        retry_allowed=True,
        max_retries=2,
        severity="warning",
    ),
    FailureCode.TECH_RESOURCE: FailureInfo(
        code=FailureCode.TECH_RESOURCE,
        category=FailureCategory.TECHNICAL,
        message="System resources exhausted",
        user_message="시스템 자원이 부족합니다.",
        recovery_hint="잠시 후 다시 시도해주세요.",
        is_recoverable=True,
        retry_allowed=True,
        max_retries=1,
        severity="critical",
    ),

    # Confidence failures
    FailureCode.CONF_LOW: FailureInfo(
        code=FailureCode.CONF_LOW,
        category=FailureCategory.CONFIDENCE,
        message="Response confidence below threshold",
        user_message="충분한 확신을 가지고 답변드리기 어렵습니다.",
        recovery_hint="질문을 더 구체적으로 해주시거나 담당자에게 문의해주세요.",
        is_recoverable=True,
        retry_allowed=True,
        severity="warning",
    ),
    FailureCode.CONF_NO_EVIDENCE: FailureInfo(
        code=FailureCode.CONF_NO_EVIDENCE,
        category=FailureCategory.CONFIDENCE,
        message="No supporting evidence found for the response",
        user_message="답변의 근거를 찾을 수 없습니다.",
        recovery_hint="이 답변은 검증이 필요합니다.",
        is_recoverable=False,
        retry_allowed=False,
        severity="warning",
    ),
    FailureCode.CONF_UNCERTAIN: FailureInfo(
        code=FailureCode.CONF_UNCERTAIN,
        category=FailureCategory.CONFIDENCE,
        message="Model is uncertain about the response",
        user_message="정확한 답변을 드리기 어렵습니다.",
        recovery_hint="담당자에게 직접 문의해주세요.",
        is_recoverable=True,
        retry_allowed=True,
        severity="info",
    ),
    FailureCode.CONF_HALLUCINATION: FailureInfo(
        code=FailureCode.CONF_HALLUCINATION,
        category=FailureCategory.CONFIDENCE,
        message="Potential hallucination detected in response",
        user_message="응답의 정확성을 검증할 수 없습니다.",
        recovery_hint="이 정보는 반드시 직접 확인이 필요합니다.",
        is_recoverable=False,
        retry_allowed=False,
        severity="warning",
    ),
}


@dataclass
class RecoveryResult:
    """Result of failure recovery attempt."""
    success: bool
    action: str                    # Action taken
    should_retry: bool             # Should retry the operation?
    modified_state: Optional[Dict[str, Any]] = None  # Modified workflow state
    fallback_response: Optional[str] = None          # Fallback response to user


class FailureHandler:
    """Handles failures with appropriate recovery strategies."""

    def __init__(self):
        self.retry_counts: Dict[str, int] = {}  # trace_id -> retry count
        self.failure_history: List[Dict[str, Any]] = []  # For monitoring

    def handle_failure(
        self,
        code: FailureCode,
        trace_id: str,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Handle a failure and return recovery instructions.

        Args:
            code: The failure code
            trace_id: Unique identifier for this request
            context: Additional context (workflow state, error details)

        Returns:
            Dictionary with failure details and recovery instructions
        """
        failure_info = FAILURE_DEFINITIONS.get(code)
        if not failure_info:
            failure_info = FailureInfo(
                code=code,
                category=FailureCategory.TECHNICAL,
                message=f"Unknown failure: {code.value}",
                user_message="알 수 없는 오류가 발생했습니다.",
                recovery_hint="관리자에게 문의해주세요.",
                is_recoverable=False,
                retry_allowed=False,
                severity="error",
            )

        # Check retry count
        current_retries = self.retry_counts.get(trace_id, 0)
        can_retry = failure_info.retry_allowed and current_retries < failure_info.max_retries

        if can_retry:
            self.retry_counts[trace_id] = current_retries + 1

        # Determine recovery action
        recovery_action = self._determine_recovery_action(
            failure_info, can_retry, context
        )

        # Log failure for monitoring
        failure_record = {
            "trace_id": trace_id,
            "code": code.value,
            "category": failure_info.category.value,
            "severity": failure_info.severity,
            "retry_count": current_retries + 1 if can_retry else current_retries,
            "recovery_action": recovery_action,
            "timestamp": time.time(),
        }
        self.failure_history.append(failure_record)
        logger.warning(f"Failure handled: {code.value} (trace={trace_id}, action={recovery_action})")

        return {
            "failure": {
                "code": code.value,
                "category": failure_info.category.value,
                "severity": failure_info.severity,
                "message": failure_info.message,
                "user_message": failure_info.user_message,
            },
            "recovery": {
                "hint": failure_info.recovery_hint,
                "is_recoverable": failure_info.is_recoverable,
                "can_retry": can_retry,
                "retry_count": current_retries + 1 if can_retry else current_retries,
                "max_retries": failure_info.max_retries,
                "action": recovery_action,
            },
        }

    def _determine_recovery_action(
        self,
        failure: FailureInfo,
        can_retry: bool,
        context: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Determine the appropriate recovery action."""

        if failure.category == FailureCategory.INFORMATION:
            if can_retry:
                return "refine_query"  # Improve query and retry
            if failure.code == FailureCode.INFO_AMBIGUOUS:
                return "ask_clarification"  # Ask user for clarification
            return "ask_human"  # Request additional information from user

        if failure.category == FailureCategory.POLICY:
            if failure.code == FailureCode.POLICY_RATE_LIMIT:
                return "wait_and_retry"
            return "escalate"  # Request permission escalation

        if failure.category == FailureCategory.TECHNICAL:
            if can_retry:
                return "retry_with_backoff"
            return "fallback"  # Use fallback response

        if failure.category == FailureCategory.CONFIDENCE:
            if failure.code == FailureCode.CONF_LOW:
                return "downgrade_to_suggest"  # Downgrade authority level
            if failure.code == FailureCode.CONF_NO_EVIDENCE:
                return "add_disclaimer"  # Add disclaimer to response
            return "ask_verification"  # Ask user to verify

        return "abort"

    def recover(
        self,
        failure_result: Dict[str, Any],
        state: Dict[str, Any],
    ) -> RecoveryResult:
        """
        Execute recovery action and modify state if needed.

        Args:
            failure_result: Result from handle_failure()
            state: Current workflow state

        Returns:
            RecoveryResult with modified state and instructions
        """
        action = failure_result["recovery"]["action"]
        modified_state = dict(state)

        if action == "refine_query":
            # Attempt to refine the query
            modified_state["retry_count"] = state.get("retry_count", 0) + 1
            return RecoveryResult(
                success=True,
                action=action,
                should_retry=True,
                modified_state=modified_state,
            )

        elif action == "downgrade_to_suggest":
            # Downgrade authority level to SUGGEST
            modified_state["authority_level"] = "suggest"
            modified_state["requires_approval"] = False
            return RecoveryResult(
                success=True,
                action=action,
                should_retry=False,
                modified_state=modified_state,
            )

        elif action == "add_disclaimer":
            # Add disclaimer to response
            disclaimer = "\n\n⚠️ 주의: 이 응답은 충분한 근거 없이 생성되었습니다. 중요한 결정 전에 담당자에게 확인해주세요."
            response = state.get("response", "")
            modified_state["response"] = response + disclaimer
            return RecoveryResult(
                success=True,
                action=action,
                should_retry=False,
                modified_state=modified_state,
            )

        elif action == "fallback":
            # Return fallback response
            fallback = failure_result["failure"]["user_message"]
            hint = failure_result["recovery"]["hint"]
            return RecoveryResult(
                success=True,
                action=action,
                should_retry=False,
                fallback_response=f"{fallback}\n\n💡 {hint}",
            )

        elif action == "wait_and_retry":
            # Wait and retry (for rate limiting)
            modified_state["wait_time"] = 5.0  # seconds
            return RecoveryResult(
                success=True,
                action=action,
                should_retry=True,
                modified_state=modified_state,
            )

        elif action in ["ask_human", "ask_clarification", "escalate", "ask_verification"]:
            # These require user interaction
            modified_state["needs_human_input"] = True
            modified_state["human_input_type"] = action
            return RecoveryResult(
                success=True,
                action=action,
                should_retry=False,
                modified_state=modified_state,
            )

        # Default: abort
        return RecoveryResult(
            success=False,
            action="abort",
            should_retry=False,
            fallback_response=failure_result["failure"]["user_message"],
        )

    def clear_retry_count(self, trace_id: str) -> None:
        """Clear retry count for a trace ID (call on success)."""
        if trace_id in self.retry_counts:
            del self.retry_counts[trace_id]

    def get_failure_stats(self) -> Dict[str, Any]:
        """Get failure statistics for monitoring."""
        if not self.failure_history:
            return {"total": 0}

        by_category = {}
        by_code = {}
        by_severity = {}

        for record in self.failure_history:
            cat = record["category"]
            code = record["code"]
            sev = record["severity"]

            by_category[cat] = by_category.get(cat, 0) + 1
            by_code[code] = by_code.get(code, 0) + 1
            by_severity[sev] = by_severity.get(sev, 0) + 1

        return {
            "total": len(self.failure_history),
            "by_category": by_category,
            "by_code": by_code,
            "by_severity": by_severity,
        }


def classify_error(error: Exception) -> FailureCode:
    """Classify an exception into a failure code."""
    error_str = str(error).lower()
    error_type = type(error).__name__.lower()

    # Timeout patterns
    if "timeout" in error_str or "timed out" in error_str:
        return FailureCode.TECH_TIMEOUT

    # Rate limit patterns
    if "rate limit" in error_str or "too many requests" in error_str:
        return FailureCode.POLICY_RATE_LIMIT

    # Not found patterns
    if "not found" in error_str or "no results" in error_str:
        return FailureCode.INFO_MISSING

    # Permission patterns
    if any(p in error_str for p in ["unauthorized", "permission", "forbidden", "access denied"]):
        return FailureCode.POLICY_UNAUTHORIZED

    # Database patterns
    if any(p in error_str for p in ["database", "connection", "sql", "postgres"]):
        return FailureCode.TECH_DB_ERROR

    # Memory/resource patterns
    if any(p in error_str for p in ["memory", "resource", "out of", "exhausted"]):
        return FailureCode.TECH_RESOURCE

    # Default to LLM error
    return FailureCode.TECH_LLM_ERROR


# Singleton instance
_failure_handler: Optional[FailureHandler] = None


def get_failure_handler() -> FailureHandler:
    """Get singleton failure handler instance."""
    global _failure_handler
    if _failure_handler is None:
        _failure_handler = FailureHandler()
    return _failure_handler
