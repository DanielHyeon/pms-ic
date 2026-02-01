"""
SQL Correction Module

Provides intelligent error-specific correction strategies.
"""

from .correction_strategies import (
    ErrorCategory,
    CorrectionStrategy,
    ERROR_PATTERNS,
    CORRECTION_STRATEGIES,
    categorize_error,
    get_correction_strategy,
)
from .enhanced_corrector import (
    EnhancedQueryCorrector,
    CorrectionResult,
    get_enhanced_corrector,
)

__all__ = [
    "ErrorCategory",
    "CorrectionStrategy",
    "ERROR_PATTERNS",
    "CORRECTION_STRATEGIES",
    "categorize_error",
    "get_correction_strategy",
    "EnhancedQueryCorrector",
    "CorrectionResult",
    "get_enhanced_corrector",
]
