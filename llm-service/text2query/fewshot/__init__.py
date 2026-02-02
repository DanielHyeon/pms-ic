"""
Few-shot Example Management Module

Provides vector-based few-shot example storage and retrieval.
"""

from .vector_fewshot_manager import (
    VectorFewshotManager,
    FewshotExample,
    get_vector_fewshot_manager,
    reset_vector_fewshot_manager,
    DEFAULT_SQL_EXAMPLES,
    DEFAULT_CYPHER_EXAMPLES,
)

__all__ = [
    "VectorFewshotManager",
    "FewshotExample",
    "get_vector_fewshot_manager",
    "reset_vector_fewshot_manager",
    "DEFAULT_SQL_EXAMPLES",
    "DEFAULT_CYPHER_EXAMPLES",
]
