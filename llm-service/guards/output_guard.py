"""
BMAD Output Guard - Phase 1: State & Contract Design

Validates LLM outputs for each BMAD role:
- Analyst: Intent planning output
- Architect: Response structure specification
- Guardian: Verification judgment

Wraps LLM calls to enforce structured outputs.

Reference: docs/llm-improvement/01-state-contract-design.md
"""

from typing import Dict, Any, Tuple, List, Optional, Callable
import logging

from contracts.schemas import (
    validate_role_output,
    ANALYST_OUTPUT_SCHEMA,
    ARCHITECT_OUTPUT_SCHEMA,
    GUARDIAN_OUTPUT_SCHEMA,
)
from guards.json_parse import extract_first_json

logger = logging.getLogger(__name__)


# =============================================================================
# Output Guard Class
# =============================================================================

class OutputGuard:
    """
    Guards LLM outputs for BMAD roles.

    Ensures structured outputs match expected schemas and constraints.
    """

    def __init__(self, role: str, max_retries: int = 2):
        """
        Initialize output guard for a specific role.

        Args:
            role: BMAD role (ANALYST, ARCHITECT, GUARDIAN)
            max_retries: Maximum retry attempts for invalid output
        """
        self.role = role.upper()
        self.max_retries = max_retries
        self._validate_role()

    def _validate_role(self) -> None:
        """Validate that the role is supported."""
        supported_roles = ["ANALYST", "ARCHITECT", "GUARDIAN"]
        if self.role not in supported_roles:
            raise ValueError(f"Unsupported role: {self.role}. Must be one of {supported_roles}")

    def validate(self, output: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """
        Validate output against role schema and constraints.

        Args:
            output: Parsed JSON output from LLM

        Returns:
            (is_valid, list_of_errors)
        """
        return validate_role_output(self.role, output)

    def parse_and_validate(self, raw_text: str) -> Tuple[bool, Optional[Dict[str, Any]], List[str]]:
        """
        Parse raw LLM text and validate against schema.

        Args:
            raw_text: Raw text output from LLM

        Returns:
            (is_valid, parsed_object_or_none, list_of_errors)
        """
        # Step 1: Parse JSON from text
        try:
            obj = extract_first_json(raw_text)
        except ValueError as e:
            return False, None, [f"JSON parse error: {str(e)}"]

        # Step 2: Validate against schema
        is_valid, errors = self.validate(obj)

        return is_valid, obj if is_valid else obj, errors

    def guard_llm_call(
        self,
        llm_fn: Callable[[str], str],
        prompt: str,
        on_retry: Optional[Callable[[str, List[str]], str]] = None
    ) -> Tuple[bool, Optional[Dict[str, Any]], List[str]]:
        """
        Guard an LLM call with validation and retry logic.

        Args:
            llm_fn: Function that takes prompt and returns LLM text output
            prompt: Initial prompt for LLM
            on_retry: Optional function to modify prompt on retry (prompt, errors) -> new_prompt

        Returns:
            (is_valid, parsed_object_or_none, list_of_errors)
        """
        current_prompt = prompt
        all_errors: List[str] = []

        for attempt in range(self.max_retries + 1):
            # Call LLM
            try:
                raw_output = llm_fn(current_prompt)
            except Exception as e:
                all_errors.append(f"LLM call error (attempt {attempt + 1}): {str(e)}")
                continue

            # Parse and validate
            is_valid, obj, errors = self.parse_and_validate(raw_output)

            if is_valid:
                logger.info(f"OutputGuard[{self.role}]: Valid output on attempt {attempt + 1}")
                return True, obj, []

            # Log validation errors
            all_errors.extend(errors)
            logger.warning(
                f"OutputGuard[{self.role}]: Invalid output on attempt {attempt + 1}: {errors}"
            )

            # Prepare retry prompt if not last attempt
            if attempt < self.max_retries:
                if on_retry:
                    current_prompt = on_retry(prompt, errors)
                else:
                    current_prompt = self._default_retry_prompt(prompt, errors)

        # All retries exhausted
        logger.error(f"OutputGuard[{self.role}]: All retries exhausted. Errors: {all_errors}")
        return False, obj if 'obj' in dir() else None, all_errors

    def _default_retry_prompt(self, original_prompt: str, errors: List[str]) -> str:
        """Generate default retry prompt with error feedback."""
        error_str = "\n".join(f"- {e}" for e in errors)
        return f"""{original_prompt}

IMPORTANT: Your previous response had validation errors:
{error_str}

Please fix these issues and return ONLY a valid JSON object matching the schema.
Do not include any text before or after the JSON object."""


# =============================================================================
# Convenience Functions
# =============================================================================

def create_analyst_guard(max_retries: int = 2) -> OutputGuard:
    """Create output guard for Analyst role."""
    return OutputGuard("ANALYST", max_retries)


def create_architect_guard(max_retries: int = 2) -> OutputGuard:
    """Create output guard for Architect role."""
    return OutputGuard("ARCHITECT", max_retries)


def create_guardian_guard(max_retries: int = 1) -> OutputGuard:
    """Create output guard for Guardian role (fewer retries)."""
    return OutputGuard("GUARDIAN", max_retries)


def validate_analyst_output(output: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """Validate Analyst output."""
    return validate_role_output("ANALYST", output)


def validate_architect_output(output: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """Validate Architect output."""
    return validate_role_output("ARCHITECT", output)


def validate_guardian_output(output: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """Validate Guardian output."""
    return validate_role_output("GUARDIAN", output)


# =============================================================================
# Fallback Generators
# =============================================================================

def get_analyst_fallback(reason: str = "parse_error") -> Dict[str, Any]:
    """
    Generate fallback Analyst output when parsing/validation fails.

    Returns safe QUALITY track plan with policy-only sources.
    """
    return {
        "intent": reason,
        "request_type": "KNOWLEDGE_QA",
        "track": "QUALITY",
        "required_sources": ["policy"],
        "missing_info_questions": [],
        "expected_output_schema": "answer_v1_markdown"
    }


def get_architect_fallback(reason: str = "parse_error") -> Dict[str, Any]:
    """
    Generate fallback Architect output when parsing/validation fails.

    Returns minimal safe specification.
    """
    return {
        "response_format": "markdown",
        "domain_terms": ["Backlog", "Sprint", "UserStory"],
        "forbidden_content": [
            "inventing facts",
            "unauthorized access",
            "policy violation"
        ],
        "required_sections": ["Summary", "Evidence", "Answer"]
    }


def get_guardian_fallback(
    verdict: str = "FAIL",
    reason: str = "parse_error"
) -> Dict[str, Any]:
    """
    Generate fallback Guardian output when parsing/validation fails.

    Returns FAIL verdict with safe refusal action by default.
    """
    return {
        "verdict": verdict,
        "reasons": [reason],
        "required_actions": ["SAFE_REFUSAL"] if verdict == "FAIL" else [],
        "risk_level": "med"
    }


# =============================================================================
# Exports
# =============================================================================

__all__ = [
    "OutputGuard",
    "create_analyst_guard",
    "create_architect_guard",
    "create_guardian_guard",
    "validate_analyst_output",
    "validate_architect_output",
    "validate_guardian_output",
    "get_analyst_fallback",
    "get_architect_fallback",
    "get_guardian_fallback",
]
