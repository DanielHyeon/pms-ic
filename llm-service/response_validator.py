"""
Response Validator for Gemma 3 12B Q5 Stability
Detect specific failure patterns and trigger retry
"""

import re
import logging
from typing import Optional, Tuple
from enum import Enum
from dataclasses import dataclass

logger = logging.getLogger(__name__)


class ResponseFailureType(Enum):
    """Response failure type classification"""
    UNABLE_TO_ANSWER = "unable_to_answer"
    INCOMPLETE_RESPONSE = "incomplete_response"
    MALFORMED_RESPONSE = "malformed_response"
    OUT_OF_CONTEXT = "out_of_context"
    REPETITIVE_RESPONSE = "repetitive_response"
    EMPTY_RESPONSE = "empty_response"
    TIMEOUT_CUTOFF = "timeout_cutoff"
    NONE = "none"


@dataclass
class ValidationResult:
    """Response validation result"""
    is_valid: bool
    failure_type: ResponseFailureType
    confidence: float  # 0.0 ~ 1.0
    reason: str
    suggested_retry: bool


class ResponseValidator:
    """
    Gemma 3 LLM response validation
    Detect and classify unstable response patterns
    """

    def __init__(self, min_response_length: int = 10, max_response_length: int = 4000):
        self.min_response_length = min_response_length
        self.max_response_length = max_response_length

        # Define failure patterns
        self.unable_to_answer_patterns = [
            r"unable\s+to\s+answer",
            r"cannot\s+answer",
            r"답변할\s+수\s+없",
            r"답변\s+불가",
            r"모르겠",
            r"알\s+수\s+없",
            r"확실하지\s+않",
            r"판단할\s+수\s+없",
            r"정확한\s+답변\s+제공\s+불가",
            r"죄송.*?답변\s+드릴\s+수\s+없",
        ]

        self.incomplete_patterns = [
            r"\.{3,}$",  # Ends with "..."
            r"등이\s+있습니다\.$",  # Incomplete sentence pattern (Korean)
            r"^\s*(요약|Summary):",  # Incomplete answer
            r"다음과\s+같습니다\.",  # Incomplete ending (Korean)
        ]

        self.repetitive_patterns = [
            r"(.{20,})\1{2,}",  # Same phrase repeated 3+ times
            r"(네|예)\s+(네|예)\s+(네|예)",  # Repetitive affirmation (Korean)
            r"(좋습니다)\s+(좋습니다)",  # Duplicate words (Korean)
        ]

    def validate(self, response: str, original_query: str = "") -> ValidationResult:
        """
        Validate response

        Args:
            response: LLM response text
            original_query: Original question (for context)

        Returns:
            ValidationResult: Validation result
        """
        # Trim whitespace
        response = response.strip() if response else ""

        # 1. Check empty response
        if not response or len(response) == 0:
            return ValidationResult(
                is_valid=False,
                failure_type=ResponseFailureType.EMPTY_RESPONSE,
                confidence=1.0,
                reason="Response is empty",
                suggested_retry=True
            )

        # 2. Length validation
        if len(response) < self.min_response_length:
            return ValidationResult(
                is_valid=False,
                failure_type=ResponseFailureType.INCOMPLETE_RESPONSE,
                confidence=0.8,
                reason=f"Response too short ({len(response)} chars < {self.min_response_length})",
                suggested_retry=True
            )

        if len(response) > self.max_response_length:
            return ValidationResult(
                is_valid=False,
                failure_type=ResponseFailureType.MALFORMED_RESPONSE,
                confidence=0.6,
                reason=f"Response too long ({len(response)} chars > {self.max_response_length})",
                suggested_retry=False
            )

        # 3. "Unable to Answer" pattern validation
        result = self._check_unable_to_answer(response)
        if result:
            return result

        # 4. Incomplete response pattern
        result = self._check_incomplete_response(response)
        if result:
            return result

        # 5. Repetitive response validation
        result = self._check_repetitive_response(response)
        if result:
            return result

        # 6. Timeout cutoff response validation
        result = self._check_timeout_cutoff(response)
        if result:
            return result

        # 7. Malformed response validation
        result = self._check_malformed_response(response)
        if result:
            return result

        # All checks passed
        return ValidationResult(
            is_valid=True,
            failure_type=ResponseFailureType.NONE,
            confidence=0.95,
            reason="Response is valid",
            suggested_retry=False
        )

    def _check_unable_to_answer(self, response: str) -> Optional[ValidationResult]:
        """Check 'Unable to answer' patterns"""
        response_lower = response.lower()

        for pattern in self.unable_to_answer_patterns:
            if re.search(pattern, response_lower, re.IGNORECASE | re.DOTALL):
                logger.warning(f"Detected 'Unable to Answer' pattern: {pattern}")
                return ValidationResult(
                    is_valid=False,
                    failure_type=ResponseFailureType.UNABLE_TO_ANSWER,
                    confidence=0.95,
                    reason=f"Response contains unable-to-answer pattern: {pattern}",
                    suggested_retry=True
                )

        return None

    def _check_incomplete_response(self, response: str) -> Optional[ValidationResult]:
        """Check incomplete response patterns"""
        for pattern in self.incomplete_patterns:
            if re.search(pattern, response, re.IGNORECASE | re.DOTALL):
                logger.warning(f"Detected incomplete pattern: {pattern}")
                return ValidationResult(
                    is_valid=False,
                    failure_type=ResponseFailureType.INCOMPLETE_RESPONSE,
                    confidence=0.7,
                    reason=f"Response contains incomplete pattern: {pattern}",
                    suggested_retry=True
                )

        return None

    def _check_repetitive_response(self, response: str) -> Optional[ValidationResult]:
        """Check repetitive response patterns"""
        for pattern in self.repetitive_patterns:
            matches = re.findall(pattern, response, re.IGNORECASE | re.DOTALL)
            if matches:
                logger.warning(f"Detected repetitive pattern: {pattern}")
                return ValidationResult(
                    is_valid=False,
                    failure_type=ResponseFailureType.REPETITIVE_RESPONSE,
                    confidence=0.8,
                    reason="Response contains repetitive phrases",
                    suggested_retry=True
                )

        return None

    def _check_timeout_cutoff(self, response: str) -> Optional[ValidationResult]:
        """Check for timeout-induced cutoff response"""
        # Characteristic: Abruptly ending sentence (incomplete ending)
        timeout_patterns = [
            r"[^\.\!\?:\n]$",  # Ends without period
            r"^.{5,10}$",  # Too short without period
            r",\s*$",  # Ends with comma
            r":\s*$",  # Ends with colon
            r"^\d{1,3}\.\s",  # List format with only one item
        ]

        # Additional heuristic: Sentence doesn't end properly
        period_count = response.count(".")
        comma_count = response.count(",")
        sentence_count = len(re.split(r"[.!?\n]", response))

        if period_count == 0 and comma_count > 2 and len(response) > 100:
            logger.warning("Detected likely timeout cutoff: no period in long response")
            return ValidationResult(
                is_valid=False,
                failure_type=ResponseFailureType.TIMEOUT_CUTOFF,
                confidence=0.6,
                reason="Suspected timeout cutoff - response truncated",
                suggested_retry=True
            )

        return None

    def _check_malformed_response(self, response: str) -> Optional[ValidationResult]:
        """Check for malformed response"""
        malformed_patterns = [
            r"^```",  # Only code block
            r"^```[\s\S]*```$",  # Only code block format
            r"^#{6,}",  # Too many heading markers
            r"^[\s\-\*]{3,}$",  # Only separator line
            r"^(?:[\s\-\*])*$",  # Only whitespace and symbols
        ]

        for pattern in malformed_patterns:
            if re.search(pattern, response, re.MULTILINE):
                logger.warning(f"Detected malformed pattern: {pattern}")
                return ValidationResult(
                    is_valid=False,
                    failure_type=ResponseFailureType.MALFORMED_RESPONSE,
                    confidence=0.85,
                    reason="Response format is malformed",
                    suggested_retry=True
                )

        return None

    def should_retry(self, validation_result: ValidationResult) -> bool:
        """Determine whether to retry"""
        return validation_result.suggested_retry and not validation_result.is_valid

    def get_retry_suggestion(self, validation_result: ValidationResult) -> str:
        """Suggest retry strategy"""
        suggestions = {
            ResponseFailureType.UNABLE_TO_ANSWER: "Need to improve query keywords",
            ResponseFailureType.INCOMPLETE_RESPONSE: "Need clearer question",
            ResponseFailureType.MALFORMED_RESPONSE: "Need to reformat query",
            ResponseFailureType.REPETITIVE_RESPONSE: "Need to retry with different keywords",
            ResponseFailureType.TIMEOUT_CUTOFF: "Timeout - retry with reduced context",
            ResponseFailureType.EMPTY_RESPONSE: "Need to check LLM service status",
        }
        return suggestions.get(validation_result.failure_type, "Retry after improving query")


class BatchResponseValidator:
    """Batch response validation (for monitoring/metrics)"""

    def __init__(self):
        self.validator = ResponseValidator()
        self.failure_counts = {}
        self.total_validations = 0

    def validate_batch(self, responses: list, queries: list = None) -> list:
        """Batch validation"""
        if queries is None:
            queries = [""] * len(responses)

        results = []
        for response, query in zip(responses, queries):
            result = self.validator.validate(response, query)
            results.append(result)

            # Update statistics
            if not result.is_valid:
                failure_type = result.failure_type.value
                self.failure_counts[failure_type] = self.failure_counts.get(failure_type, 0) + 1

            self.total_validations += 1

        return results

    def get_stats(self) -> dict:
        """Return statistics"""
        return {
            "total_validations": self.total_validations,
            "failure_counts": self.failure_counts,
            "failure_rate": (sum(self.failure_counts.values()) / self.total_validations
                           if self.total_validations > 0 else 0.0),
            "most_common_failure": max(self.failure_counts.items(), key=lambda x: x[1], default=(None, 0))
        }

    def reset_stats(self):
        """Reset statistics"""
        self.failure_counts = {}
        self.total_validations = 0
