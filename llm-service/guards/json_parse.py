"""
BMAD JSON Parser - Phase 1: State & Contract Design

Robust JSON extraction from LLM outputs.

LLMs often return JSON with surrounding text, markdown code blocks,
or other formatting. This module provides utilities to reliably
extract valid JSON from such outputs.

Reference: docs/llm-improvement/01-state-contract-design.md
"""

import json
import re
from typing import Dict, Any, Optional, Union, List
import logging

logger = logging.getLogger(__name__)


# =============================================================================
# JSON Extraction Patterns
# =============================================================================

# Pattern to match JSON code blocks (```json ... ``` or ``` ... ```)
CODE_BLOCK_PATTERN = re.compile(
    r'```(?:json)?\s*\n?(.*?)\n?```',
    re.DOTALL | re.IGNORECASE
)

# Pattern to match raw JSON objects { ... }
JSON_OBJECT_PATTERN = re.compile(
    r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}',
    re.DOTALL
)

# Pattern to match JSON arrays [ ... ]
JSON_ARRAY_PATTERN = re.compile(
    r'\[[^\[\]]*(?:\[[^\[\]]*\][^\[\]]*)*\]',
    re.DOTALL
)


# =============================================================================
# Main Extraction Functions
# =============================================================================

def extract_first_json(text: str) -> Dict[str, Any]:
    """
    Extract the first valid JSON object from text.

    Handles:
    - JSON in markdown code blocks (```json ... ```)
    - Raw JSON objects in text
    - JSON with surrounding text/explanation

    Args:
        text: Raw text potentially containing JSON

    Returns:
        Parsed JSON as dictionary

    Raises:
        ValueError: If no valid JSON found
    """
    if not text or not text.strip():
        raise ValueError("Empty input text")

    # Strategy 1: Try direct parse (text is pure JSON)
    try:
        result = json.loads(text.strip())
        if isinstance(result, dict):
            return result
    except json.JSONDecodeError:
        pass

    # Strategy 2: Extract from markdown code block
    code_blocks = CODE_BLOCK_PATTERN.findall(text)
    for block in code_blocks:
        try:
            result = json.loads(block.strip())
            if isinstance(result, dict):
                logger.debug("Extracted JSON from code block")
                return result
        except json.JSONDecodeError:
            continue

    # Strategy 3: Find JSON object pattern in text
    json_candidates = _find_json_candidates(text)
    for candidate in json_candidates:
        try:
            result = json.loads(candidate)
            if isinstance(result, dict):
                logger.debug("Extracted JSON from text pattern")
                return result
        except json.JSONDecodeError:
            continue

    # Strategy 4: Try to fix common JSON issues
    fixed_text = _fix_common_json_issues(text)
    try:
        result = json.loads(fixed_text)
        if isinstance(result, dict):
            logger.debug("Extracted JSON after fixing common issues")
            return result
    except json.JSONDecodeError:
        pass

    raise ValueError(f"No valid JSON object found in text (length={len(text)})")


def extract_json_array(text: str) -> List[Any]:
    """
    Extract the first valid JSON array from text.

    Args:
        text: Raw text potentially containing JSON array

    Returns:
        Parsed JSON array as list

    Raises:
        ValueError: If no valid JSON array found
    """
    if not text or not text.strip():
        raise ValueError("Empty input text")

    # Strategy 1: Try direct parse
    try:
        result = json.loads(text.strip())
        if isinstance(result, list):
            return result
    except json.JSONDecodeError:
        pass

    # Strategy 2: Extract from code block
    code_blocks = CODE_BLOCK_PATTERN.findall(text)
    for block in code_blocks:
        try:
            result = json.loads(block.strip())
            if isinstance(result, list):
                return result
        except json.JSONDecodeError:
            continue

    # Strategy 3: Find array pattern
    matches = JSON_ARRAY_PATTERN.findall(text)
    for match in matches:
        try:
            result = json.loads(match)
            if isinstance(result, list):
                return result
        except json.JSONDecodeError:
            continue

    raise ValueError(f"No valid JSON array found in text (length={len(text)})")


def try_extract_json(text: str, default: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
    """
    Try to extract JSON, returning default on failure.

    Args:
        text: Raw text potentially containing JSON
        default: Default value to return on failure

    Returns:
        Parsed JSON or default value
    """
    try:
        return extract_first_json(text)
    except ValueError:
        return default


# =============================================================================
# Helper Functions
# =============================================================================

def _find_json_candidates(text: str) -> List[str]:
    """
    Find potential JSON object strings in text.

    Uses bracket matching to find complete JSON objects.
    """
    candidates = []

    # Find all opening braces
    start_indices = [i for i, c in enumerate(text) if c == '{']

    for start in start_indices:
        # Try to find matching closing brace
        depth = 0
        in_string = False
        escape_next = False

        for i in range(start, len(text)):
            char = text[i]

            if escape_next:
                escape_next = False
                continue

            if char == '\\':
                escape_next = True
                continue

            if char == '"' and not escape_next:
                in_string = not in_string
                continue

            if in_string:
                continue

            if char == '{':
                depth += 1
            elif char == '}':
                depth -= 1
                if depth == 0:
                    candidate = text[start:i + 1]
                    candidates.append(candidate)
                    break

    return candidates


def _fix_common_json_issues(text: str) -> str:
    """
    Attempt to fix common JSON formatting issues.

    Handles:
    - Trailing commas
    - Single quotes instead of double quotes
    - Unquoted keys
    - Missing quotes around string values
    """
    # Remove potential leading/trailing text
    # Find first { and last }
    first_brace = text.find('{')
    last_brace = text.rfind('}')

    if first_brace == -1 or last_brace == -1:
        return text

    json_text = text[first_brace:last_brace + 1]

    # Fix trailing commas before } or ]
    json_text = re.sub(r',\s*([\]}])', r'\1', json_text)

    # Fix single quotes to double quotes (careful with apostrophes)
    # Only replace if it looks like a JSON string delimiter
    json_text = re.sub(r"'([^']*)'(\s*[,:\]}])", r'"\1"\2', json_text)

    # Fix unquoted keys
    json_text = re.sub(r'(\{|\,)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:', r'\1"\2":', json_text)

    return json_text


def validate_json_structure(obj: Any, expected_type: type = dict) -> bool:
    """
    Validate that parsed JSON has expected structure.

    Args:
        obj: Parsed JSON object
        expected_type: Expected Python type (dict, list, etc.)

    Returns:
        True if structure is valid
    """
    return isinstance(obj, expected_type)


def safe_json_dumps(obj: Any, indent: int = 2) -> str:
    """
    Safely serialize object to JSON string.

    Handles non-serializable objects gracefully.
    """
    def default_handler(o):
        if hasattr(o, '__dict__'):
            return o.__dict__
        return str(o)

    try:
        return json.dumps(obj, indent=indent, default=default_handler, ensure_ascii=False)
    except Exception as e:
        logger.error(f"JSON serialization error: {e}")
        return json.dumps({"error": str(e), "type": str(type(obj))})


# =============================================================================
# Exports
# =============================================================================

__all__ = [
    "extract_first_json",
    "extract_json_array",
    "try_extract_json",
    "validate_json_structure",
    "safe_json_dumps",
]
