"""
Response Contract for Intent Handlers.

IMPORTANT: Use error_code for error detection, NOT string matching on warnings.

This module provides a standardized response contract between handlers and renderers.
Key features:
- error_code field for structured error detection (Risk K)
- Clear separation of data, warnings, and tips
- Consistent interface for all intent handlers
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


# =============================================================================
# Error Codes (Structured Error Detection - Risk K)
# =============================================================================

class ErrorCode:
    """
    Structured error codes for graceful degradation.

    Use these instead of matching warning message strings.
    This prevents fragile string-based error detection.
    """
    DB_QUERY_FAILED = "DB_QUERY_FAILED"      # Database query execution failed
    DB_TIMEOUT = "DB_TIMEOUT"                 # Query timed out
    SCHEMA_MISMATCH = "SCHEMA_MISMATCH"       # Column/table doesn't exist
    FALLBACK_USED = "FALLBACK_USED"           # Fallback query was used (informational)
    NO_DATA = "NO_DATA"                       # Query succeeded but no results
    VALIDATION_ERROR = "VALIDATION_ERROR"     # Input validation failed
    PERMISSION_DENIED = "PERMISSION_DENIED"   # Access denied


# =============================================================================
# Response Contract
# =============================================================================

@dataclass
class ResponseContract:
    """
    Generic response contract for intent handlers.

    This contract standardizes the interface between handlers and renderers.
    All handlers MUST return a ResponseContract instance.

    Attributes:
        intent: The classified intent (lowercase snake_case, e.g., "backlog_list")
        reference_time: KST timestamp string (e.g., "2026-02-04 14:30 KST")
        scope: Context scope description (e.g., "Project: ABC")
        data: Response data (intent-specific structure)
        warnings: Warning messages for user display
        tips: Actionable next steps for user
        provenance: Data source identifier ("realtime", "cached", "fallback")
        error_code: Structured error code (use instead of string matching)

    Usage:
        # Normal response
        contract = ResponseContract(
            intent="backlog_list",
            reference_time="2026-02-04 14:30 KST",
            scope="Project: PMS-IC",
            data={"items": [...], "count": 5},
        )

        # Error response
        contract = ResponseContract(
            intent="backlog_list",
            reference_time="2026-02-04 14:30 KST",
            scope="Project: PMS-IC",
            data={},
            warnings=["Failed to query data"],
            error_code=ErrorCode.DB_QUERY_FAILED,
        )
    """
    intent: str
    reference_time: str
    scope: str
    data: Dict[str, Any]
    warnings: List[str] = field(default_factory=list)
    tips: List[str] = field(default_factory=list)
    provenance: str = "realtime"
    error_code: Optional[str] = None  # CRITICAL: Use this for error detection

    def has_data(self) -> bool:
        """
        Check if response has meaningful data.

        Returns:
            True if data contains actual content, False otherwise
        """
        if not self.data:
            return False

        # Check common data patterns
        if "items" in self.data:
            return len(self.data["items"]) > 0
        if "tasks" in self.data:
            return len(self.data["tasks"]) > 0
        if "risks" in self.data:
            return len(self.data["risks"]) > 0
        if "sprint" in self.data:
            return self.data["sprint"] is not None
        if "stories" in self.data:
            return len(self.data["stories"]) > 0

        return len(self.data) > 0

    def has_error(self) -> bool:
        """
        Check if response represents an error condition.

        IMPORTANT: Use this instead of checking warning message strings.
        """
        return self.error_code is not None

    def is_fallback(self) -> bool:
        """Check if fallback was used (informational, not error)"""
        return self.error_code == ErrorCode.FALLBACK_USED

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            "intent": self.intent,
            "reference_time": self.reference_time,
            "scope": self.scope,
            "data": self.data,
            "warnings": self.warnings,
            "tips": self.tips,
            "provenance": self.provenance,
            "error_code": self.error_code,
            "has_data": self.has_data(),
            "has_error": self.has_error(),
        }


# =============================================================================
# Factory Functions
# =============================================================================

def create_error_response(
    intent: str,
    scope: str,
    error_message: str,
    error_code: str,
    tips: Optional[List[str]] = None,
    reference_time: Optional[str] = None,
) -> ResponseContract:
    """
    Create a graceful error response instead of crashing.

    GRACEFUL DEGRADATION: Returns valid contract with error_code.

    Args:
        intent: The intent type (lowercase snake_case)
        scope: Project/context scope
        error_message: Human-readable error description
        error_code: Structured error code from ErrorCode class
        tips: Actionable next steps
        reference_time: Optional timestamp (auto-generated if not provided)
    """
    from datetime import datetime
    try:
        from zoneinfo import ZoneInfo
        KST = ZoneInfo("Asia/Seoul")
    except ImportError:
        import pytz
        KST = pytz.timezone("Asia/Seoul")

    if reference_time is None:
        reference_time = datetime.now(KST).strftime("%Y-%m-%d %H:%M KST")

    return ResponseContract(
        intent=intent,
        reference_time=reference_time,
        scope=scope,
        data={},
        warnings=[f"Data retrieval failed: {error_message}"],
        tips=tips or ["Please contact the administrator if the issue persists"],
        error_code=error_code,
    )


def create_empty_response(
    intent: str,
    scope: str,
    message: str,
    tips: Optional[List[str]] = None,
    reference_time: Optional[str] = None,
) -> ResponseContract:
    """
    Create a response for empty data (no error, just no results).

    Args:
        intent: The intent type
        scope: Project/context scope
        message: Message explaining the empty state
        tips: Actionable next steps
        reference_time: Optional timestamp
    """
    from datetime import datetime
    try:
        from zoneinfo import ZoneInfo
        KST = ZoneInfo("Asia/Seoul")
    except ImportError:
        import pytz
        KST = pytz.timezone("Asia/Seoul")

    if reference_time is None:
        reference_time = datetime.now(KST).strftime("%Y-%m-%d %H:%M KST")

    return ResponseContract(
        intent=intent,
        reference_time=reference_time,
        scope=scope,
        data={},
        warnings=[message],
        tips=tips or [],
        error_code=None,  # Not an error, just empty
    )
