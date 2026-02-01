"""
Structured LLM Generator

Enforces JSON schema output from LLM responses using Pydantic models.
"""
import json
import logging
from typing import Type, TypeVar, Protocol, Optional, Any

from pydantic import BaseModel, ValidationError

logger = logging.getLogger(__name__)

T = TypeVar('T', bound=BaseModel)


class LLMService(Protocol):
    """Protocol for LLM service dependency."""

    def generate(
        self,
        prompt: str,
        max_tokens: int = 2000,
        temperature: float = 0,
        response_format: Optional[dict] = None
    ) -> str:
        """Generate text from prompt."""
        ...


class StructuredGenerator:
    """
    Generates structured responses using JSON schema enforcement.

    Features:
    - Pydantic model validation
    - Automatic retry on parse failure
    - Fallback extraction for non-compliant responses
    - Support for various LLM providers
    """

    def __init__(self, llm_service: LLMService):
        self.llm = llm_service

    def generate(
        self,
        prompt: str,
        response_model: Type[T],
        max_retries: int = 2,
        temperature: float = 0
    ) -> T:
        """
        Generate a structured response conforming to the given model.

        Args:
            prompt: The generation prompt
            response_model: Pydantic model class for response validation
            max_retries: Number of retries on parse failure
            temperature: LLM temperature setting

        Returns:
            Validated response model instance

        Raises:
            ValueError: If unable to generate valid response after retries
        """
        # Build JSON schema from Pydantic model
        schema = response_model.model_json_schema()

        # Append schema instruction to prompt
        schema_prompt = self._build_schema_prompt(prompt, schema)

        for attempt in range(max_retries + 1):
            try:
                # Generate with response format hint
                response = self.llm.generate(
                    prompt=schema_prompt,
                    max_tokens=2000,
                    temperature=temperature,
                    response_format={
                        "type": "json_schema",
                        "json_schema": {
                            "name": response_model.__name__,
                            "schema": schema
                        }
                    }
                )

                # Parse and validate
                parsed = self._extract_json(response)
                return response_model.model_validate(parsed)

            except json.JSONDecodeError as e:
                logger.warning(
                    f"Structured generation attempt {attempt + 1} failed (JSON decode): {e}"
                )
                if attempt == max_retries:
                    raise ValueError(
                        f"Failed to generate valid JSON for {response_model.__name__} "
                        f"after {max_retries + 1} attempts. Last error: {e}"
                    )

            except ValidationError as e:
                logger.warning(
                    f"Structured generation attempt {attempt + 1} failed (validation): {e}"
                )
                if attempt == max_retries:
                    raise ValueError(
                        f"Failed to generate valid {response_model.__name__} "
                        f"after {max_retries + 1} attempts. Validation error: {e}"
                    )

            # Adjust prompt for retry
            schema_prompt = self._build_retry_prompt(
                prompt, schema, str(e) if 'e' in dir() else "Parse error"
            )

    def generate_with_fallback(
        self,
        prompt: str,
        response_model: Type[T],
        fallback_extractor: callable = None
    ) -> Optional[T]:
        """
        Generate with fallback for non-critical operations.

        Returns None instead of raising on failure.
        """
        try:
            return self.generate(prompt, response_model)
        except ValueError as e:
            logger.error(f"Structured generation failed with fallback: {e}")
            if fallback_extractor:
                try:
                    return fallback_extractor(prompt)
                except Exception as fe:
                    logger.error(f"Fallback extractor also failed: {fe}")
            return None

    def _build_schema_prompt(self, prompt: str, schema: dict) -> str:
        """Build prompt with JSON schema instruction."""
        # Simplify schema for prompt (remove unnecessary fields)
        simplified_schema = self._simplify_schema(schema)
        schema_str = json.dumps(simplified_schema, indent=2)

        return f"""{prompt}

## Response Format
You MUST respond with a valid JSON object conforming to this schema:

```json
{schema_str}
```

Important:
- Respond with ONLY the JSON object, no additional text or markdown
- Ensure all required fields are present
- Use proper JSON syntax (double quotes, no trailing commas)"""

    def _build_retry_prompt(
        self,
        prompt: str,
        schema: dict,
        error: str
    ) -> str:
        """Build prompt for retry after failure."""
        simplified_schema = self._simplify_schema(schema)
        schema_str = json.dumps(simplified_schema, indent=2)

        return f"""{prompt}

## Response Format
You MUST respond with a valid JSON object conforming to this schema:

```json
{schema_str}
```

IMPORTANT: Your previous response was invalid.
Error: {error}

Please ensure your response:
1. Is valid JSON (proper syntax)
2. Contains all required fields
3. Has correct data types
4. Has no additional text or markdown wrapping

Respond with ONLY the JSON object."""

    def _simplify_schema(self, schema: dict) -> dict:
        """Simplify schema for prompt (remove metadata)."""
        # Remove $defs and references for cleaner prompt
        simplified = {}

        if "properties" in schema:
            simplified["properties"] = {}
            for key, value in schema["properties"].items():
                if isinstance(value, dict):
                    prop = {"type": value.get("type", "string")}
                    if "description" in value:
                        prop["description"] = value["description"]
                    if "enum" in value:
                        prop["enum"] = value["enum"]
                    if "default" in value:
                        prop["default"] = value["default"]
                    simplified["properties"][key] = prop
                else:
                    simplified["properties"][key] = value

        if "required" in schema:
            simplified["required"] = schema["required"]

        return simplified

    def _extract_json(self, response: str) -> dict:
        """Extract JSON from response, handling markdown blocks."""
        response = response.strip()

        # Try direct parse first
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            pass

        # Try extracting from markdown code block
        if "```json" in response:
            start = response.find("```json") + 7
            end = response.find("```", start)
            if end > start:
                content = response[start:end].strip()
                return json.loads(content)

        if "```" in response:
            start = response.find("```") + 3
            # Skip language identifier if present
            if response[start:start+1].isalpha():
                newline = response.find("\n", start)
                if newline > start:
                    start = newline + 1
            end = response.find("```", start)
            if end > start:
                content = response[start:end].strip()
                return json.loads(content)

        # Try finding JSON object boundaries
        start = response.find("{")
        end = response.rfind("}") + 1
        if start >= 0 and end > start:
            content = response[start:end]
            return json.loads(content)

        raise json.JSONDecodeError(
            "No valid JSON found in response",
            response,
            0
        )


# Singleton instance
_structured_generator: Optional[StructuredGenerator] = None


def get_structured_generator(llm_service: LLMService = None) -> StructuredGenerator:
    """
    Get or create structured generator singleton.

    Args:
        llm_service: LLM service to use. Required on first call.

    Returns:
        StructuredGenerator instance
    """
    global _structured_generator
    if _structured_generator is None:
        if llm_service is None:
            raise ValueError("LLM service required for first initialization")
        _structured_generator = StructuredGenerator(llm_service)
    return _structured_generator


def reset_structured_generator() -> None:
    """Reset the structured generator singleton (for testing)."""
    global _structured_generator
    _structured_generator = None
