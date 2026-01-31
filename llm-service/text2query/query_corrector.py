"""
Query Corrector for fixing validation errors.

Uses LLM to correct queries based on validation error feedback.
Implements the self-correction loop pattern from text2cypher_llama_agent.
"""

import logging
import re
from typing import Optional, Protocol

from .models import QueryType, ValidationResult
from .prompts.correction import CORRECTION_PROMPT

logger = logging.getLogger(__name__)


class LLMService(Protocol):
    """Protocol for LLM service interface."""

    def generate(
        self, prompt: str, max_tokens: int = 500, temperature: float = 0.1
    ) -> str:
        """Generate text from prompt."""
        ...


class QueryCorrector:
    """
    Corrects invalid queries using LLM and error feedback.

    Implements self-correction loop:
    1. Receive invalid query + validation errors
    2. Generate correction prompt with error context
    3. Ask LLM to fix the query
    4. Return corrected query for re-validation
    """

    MAX_RETRIES = 2

    def __init__(self, llm_service: Optional[LLMService] = None):
        self.llm_service = llm_service

    def correct(
        self,
        original_query: str,
        query_type: QueryType,
        validation_result: ValidationResult,
        question: str,
        project_id: str,
        attempt: int = 1,
    ) -> Optional[str]:
        """
        Attempt to correct an invalid query.

        Args:
            original_query: The invalid query
            query_type: SQL or CYPHER
            validation_result: Validation errors
            question: Original user question
            project_id: Project ID for scope
            attempt: Current correction attempt number

        Returns:
            Corrected query string, or None if correction failed
        """
        if attempt > self.MAX_RETRIES:
            logger.warning(f"Max correction retries ({self.MAX_RETRIES}) exceeded")
            return None

        # Build correction prompt
        error_summary = self._format_errors(validation_result)

        prompt = CORRECTION_PROMPT.format(
            query_type=query_type.value.upper(),
            original_query=original_query,
            errors=error_summary,
            question=question,
            project_id=project_id,
        )

        try:
            corrected = self._call_llm(prompt)
            corrected = self._clean_query(corrected, query_type)

            logger.info(f"Correction attempt {attempt}: generated corrected query")
            return corrected

        except Exception as e:
            logger.error(f"Correction failed: {e}")
            return None

    def _format_errors(self, validation_result: ValidationResult) -> str:
        """Format validation errors for the correction prompt."""
        lines = []

        for error in validation_result.errors:
            line = f"- [{error.type.value}] {error.message}"
            if error.suggestion:
                line += f" (Suggestion: {error.suggestion})"
            lines.append(line)

        return "\n".join(lines)

    def _call_llm(self, prompt: str) -> str:
        """Call LLM for correction."""
        if self.llm_service:
            return self.llm_service.generate(
                prompt=prompt, max_tokens=500, temperature=0.1
            )

        try:
            from services.model_service import get_model_service

            model_service = get_model_service()

            return model_service.generate(
                prompt=prompt,
                max_tokens=500,
                temperature=0.1,
                stop=["```", "\n\n\n"],
            )
        except ImportError:
            logger.warning("model_service not available, using mock response")
            # Return a mock corrected response for testing
            return "SELECT id, title FROM task.user_stories WHERE project_id = :project_id LIMIT 50"

    def _clean_query(self, response: str, query_type: QueryType) -> str:
        """Extract and clean query from response."""
        response = response.strip()

        # Remove markdown
        if "```" in response:
            match = re.search(
                r"```(?:sql|cypher)?\s*(.+?)```", response, re.DOTALL | re.IGNORECASE
            )
            if match:
                response = match.group(1).strip()

        # Find query start
        if query_type == QueryType.SQL:
            match = re.search(
                r"(SELECT\s+.+?)(?:;|$)", response, re.IGNORECASE | re.DOTALL
            )
            if match:
                response = match.group(1).strip()
        else:
            match = re.search(
                r"(MATCH\s+.+?)(?:;|$)", response, re.IGNORECASE | re.DOTALL
            )
            if match:
                response = match.group(1).strip()

        return response


# Singleton
_corrector: Optional[QueryCorrector] = None


def get_query_corrector() -> QueryCorrector:
    """Get singleton QueryCorrector instance."""
    global _corrector
    if _corrector is None:
        _corrector = QueryCorrector()
    return _corrector
