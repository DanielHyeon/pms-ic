"""
Enhanced Query Corrector

Intelligent SQL correction with error-specific strategies.
Supports up to 3 correction attempts with targeted fixes.
"""
import logging
from typing import Optional, Protocol, Callable
from dataclasses import dataclass

from ..response_models import CorrectionResponse
from ..llm.structured_generator import StructuredGenerator
from .correction_strategies import (
    get_correction_strategy,
    CorrectionStrategy,
    ErrorCategory,
)

logger = logging.getLogger(__name__)


@dataclass
class CorrectionResult:
    """Result of query correction attempt."""
    success: bool
    corrected_query: str
    attempts: int
    final_error: Optional[str] = None
    strategy_used: Optional[str] = None
    error_analysis: Optional[str] = None
    fix_applied: Optional[str] = None


class ValidatorProtocol(Protocol):
    """Protocol for query validator."""
    def validate(
        self,
        query: str,
        query_type: str,
        project_id: int,
        require_project_scope: bool
    ) -> object:
        ...


CORRECTION_PROMPT = """You are a SQL debugging expert. Fix the following SQL query error.

## Original Question
{question}

## Invalid SQL
```sql
{invalid_sql}
```

## Error Message
{error_message}

## Error Analysis
Category: {error_category}
{strategy_hint}

## Database Schema Context
{schema_context}

## Correction Guidelines
1. Analyze the root cause of the error
2. Apply the MINIMUM necessary fix - don't rewrite the entire query
3. Preserve the original query intent
4. Ensure project_id filter is present for scoped tables
5. Add LIMIT if missing
6. Use schema-qualified table names (schema.table)

{example_fix}

Fix the SQL and explain your correction. Provide the complete corrected query."""


class EnhancedQueryCorrector:
    """
    Multi-attempt query correction with intelligent strategies.

    Features:
    - Error categorization for targeted fixes
    - Strategy-specific prompts
    - Up to 3 correction attempts
    - Structured correction response
    - Progressive fixing with context from previous attempts
    """

    MAX_ATTEMPTS = 3

    def __init__(
        self,
        generator: StructuredGenerator,
        validator: Optional[ValidatorProtocol] = None,
        schema_context_builder: Optional[Callable] = None
    ):
        """
        Initialize the corrector.

        Args:
            generator: Structured generator for LLM calls
            validator: Optional validator for checking corrections
            schema_context_builder: Optional function to build schema context
        """
        self.generator = generator
        self.validator = validator
        self.schema_context_builder = schema_context_builder

    def correct(
        self,
        question: str,
        invalid_sql: str,
        error_message: str,
        project_id: int,
        schema_context: Optional[str] = None,
        max_attempts: Optional[int] = None
    ) -> CorrectionResult:
        """
        Attempt to correct an invalid SQL query.

        Args:
            question: Original user question
            invalid_sql: The SQL that failed validation
            error_message: Error message from validation
            project_id: Project ID for scope filtering
            schema_context: Optional schema context for correction
            max_attempts: Override default max attempts

        Returns:
            CorrectionResult with success status and corrected query
        """
        max_attempts = max_attempts or self.MAX_ATTEMPTS
        current_sql = invalid_sql
        current_error = error_message
        previous_attempts = []

        for attempt in range(max_attempts):
            logger.info(f"Correction attempt {attempt + 1}/{max_attempts}")

            # Get strategy for current error
            strategy = get_correction_strategy(current_error)

            # Build schema context if not provided
            if schema_context is None and self.schema_context_builder:
                schema_context = self.schema_context_builder(question)

            # Generate correction
            correction = self._generate_correction(
                question=question,
                invalid_sql=current_sql,
                error_message=current_error,
                schema_context=schema_context or "Schema context not available",
                strategy=strategy,
                previous_attempts=previous_attempts
            )

            if correction is None:
                logger.warning(f"Correction attempt {attempt + 1} failed to generate")
                continue

            corrected_sql = correction.corrected_sql

            # Validate if validator is available
            if self.validator:
                try:
                    validation_result = self.validator.validate(
                        query=corrected_sql,
                        query_type="sql",
                        project_id=project_id,
                        require_project_scope=True
                    )

                    if validation_result.is_valid:
                        logger.info(f"Correction successful on attempt {attempt + 1}")
                        return CorrectionResult(
                            success=True,
                            corrected_query=corrected_sql,
                            attempts=attempt + 1,
                            strategy_used=strategy.category.value,
                            error_analysis=correction.error_analysis,
                            fix_applied=correction.fix_applied
                        )

                    # Get new error for next attempt
                    current_error = (
                        validation_result.get_first_error_message()
                        if hasattr(validation_result, 'get_first_error_message')
                        else str(validation_result.errors[0]) if validation_result.errors else "Unknown error"
                    )

                except Exception as e:
                    logger.warning(f"Validation error on attempt {attempt + 1}: {e}")
                    current_error = str(e)
            else:
                # No validator - assume correction is valid
                logger.info(f"Correction generated (no validation) on attempt {attempt + 1}")
                return CorrectionResult(
                    success=True,
                    corrected_query=corrected_sql,
                    attempts=attempt + 1,
                    strategy_used=strategy.category.value,
                    error_analysis=correction.error_analysis,
                    fix_applied=correction.fix_applied
                )

            # Track for next attempt
            previous_attempts.append({
                "sql": corrected_sql,
                "error": current_error,
                "fix_attempted": correction.fix_applied
            })
            current_sql = corrected_sql

            logger.warning(f"Correction attempt {attempt + 1} still has errors: {current_error[:100]}")

        # All attempts failed
        return CorrectionResult(
            success=False,
            corrected_query=current_sql,
            attempts=max_attempts,
            final_error=current_error,
            strategy_used=strategy.category.value if 'strategy' in dir() else None
        )

    def _generate_correction(
        self,
        question: str,
        invalid_sql: str,
        error_message: str,
        schema_context: str,
        strategy: CorrectionStrategy,
        previous_attempts: list
    ) -> Optional[CorrectionResponse]:
        """Generate a correction using the LLM."""
        try:
            # Build example fix hint
            example_fix = ""
            if strategy.example_fix:
                example_fix = f"\n## Example Fix Pattern\n{strategy.example_fix}\n"

            # Add previous attempts context if any
            previous_context = ""
            if previous_attempts:
                previous_context = "\n## Previous Correction Attempts (Failed)\n"
                for i, attempt in enumerate(previous_attempts, 1):
                    previous_context += f"\nAttempt {i}:\n"
                    previous_context += f"- SQL: {attempt['sql'][:200]}...\n"
                    previous_context += f"- Error: {attempt['error'][:200]}\n"
                    previous_context += f"- Fix tried: {attempt['fix_attempted']}\n"
                previous_context += "\nAvoid repeating these fixes. Try a different approach.\n"

            prompt = CORRECTION_PROMPT.format(
                question=question,
                invalid_sql=invalid_sql,
                error_message=error_message,
                error_category=strategy.category.value,
                strategy_hint=strategy.prompt_modifier,
                schema_context=schema_context,
                example_fix=example_fix + previous_context
            )

            return self.generator.generate(
                prompt=prompt,
                response_model=CorrectionResponse,
                temperature=0
            )

        except Exception as e:
            logger.error(f"Failed to generate correction: {e}")
            return None

    def correct_simple(
        self,
        invalid_sql: str,
        error_message: str
    ) -> str:
        """
        Simple correction without validation loop.

        Useful for quick fixes or when validator is not available.
        """
        strategy = get_correction_strategy(error_message)

        prompt = f"""Fix this SQL error:

SQL: {invalid_sql}
Error: {error_message}
{strategy.prompt_modifier}

Return only the corrected SQL, no explanation."""

        # Use raw LLM generation for simplicity
        response = self.generator.llm.generate(prompt, max_tokens=500, temperature=0)

        # Extract SQL from response
        sql = response.strip()
        if sql.startswith("```"):
            lines = sql.split("\n")
            sql = "\n".join(lines[1:-1] if lines[-1] == "```" else lines[1:])

        return sql.strip()


def get_enhanced_corrector(
    generator: StructuredGenerator,
    validator: Optional[ValidatorProtocol] = None,
    schema_context_builder: Optional[Callable] = None
) -> EnhancedQueryCorrector:
    """Factory function for enhanced corrector."""
    return EnhancedQueryCorrector(
        generator=generator,
        validator=validator,
        schema_context_builder=schema_context_builder
    )
