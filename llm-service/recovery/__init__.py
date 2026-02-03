"""
Recovery - Error Recovery and Fallback Handling.

Modules:
- recovery_plan: Recovery planning and execution
- failure_taxonomy: Failure classification
- attempt_tracker: Query attempt tracking
- timeout_retry_handler: Timeout and retry handling
"""

# Exports available from this package
__all__ = [
    "RecoveryPlan",
    "RecoveryAction",
    "AttemptTracker",
    "TimeoutRetryHandler",
    "FailureType",
    "FailureCode",
    "classify_failure",
    "get_failure_handler",
]
