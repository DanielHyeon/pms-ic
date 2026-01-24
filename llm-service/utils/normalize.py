"""
Normalization utilities for LLM Service.
"""

from typing import List, Union, Dict, Any


def normalize_retrieved_docs(retrieved_docs: Any) -> List[str]:
    """
    Normalize retrieved docs from request payload.

    Handles various input formats and returns a list of strings.

    Args:
        retrieved_docs: Documents in various formats (list, dict, str, None)

    Returns:
        List of document content strings
    """
    if not retrieved_docs:
        return []

    if isinstance(retrieved_docs, list):
        normalized = []
        for doc in retrieved_docs:
            if isinstance(doc, str):
                normalized.append(doc)
            elif isinstance(doc, dict):
                normalized.append(str(doc.get("content", doc)))
            else:
                normalized.append(str(doc))
        return normalized

    return [str(retrieved_docs)]
