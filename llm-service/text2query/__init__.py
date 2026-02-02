"""
Text2Query Package - Dynamic SQL/Cypher generation with self-correction loop.

This package provides:
- Schema-aware query generation for PostgreSQL and Neo4j
- 4-layer validation (syntax, schema, security, performance)
- Self-correction loop with LLM-based error fixing
- Few-shot example management for improved query quality
- Safe query execution with resource guards
"""

from .models import (
    QueryType,
    ValidationErrorType,
    TableInfo,
    NodeLabelInfo,
    RelationshipTypeInfo,
    SchemaContext,
    ValidationError,
    ValidationResult,
    GenerationResult,
    ExecutionResult,
    FewshotExample,
)
from .schema_manager import (
    SchemaManager,
    get_schema_manager,
    PROJECT_SCOPED_TABLES,
    FORBIDDEN_TABLES,
)
from .query_validator import (
    QueryValidator,
    get_query_validator,
)
from .fewshot_manager import (
    FewshotManager,
    get_fewshot_manager,
)
from .query_generator import (
    QueryGenerator,
    get_query_generator,
)
from .query_corrector import (
    QueryCorrector,
    get_query_corrector,
)
from .query_executor import (
    SafeQueryExecutor,
    SafeExecutionConfig,
    QueryTimeoutError,
    get_query_executor,
)
from .hybrid_executor import (
    HybridQueryExecutor,
    HybridExecutionResult,
    get_hybrid_executor,
)

__all__ = [
    # Models
    "QueryType",
    "ValidationErrorType",
    "TableInfo",
    "NodeLabelInfo",
    "RelationshipTypeInfo",
    "SchemaContext",
    "ValidationError",
    "ValidationResult",
    "GenerationResult",
    "ExecutionResult",
    "FewshotExample",
    # Schema Manager
    "SchemaManager",
    "get_schema_manager",
    "PROJECT_SCOPED_TABLES",
    "FORBIDDEN_TABLES",
    # Query Validator
    "QueryValidator",
    "get_query_validator",
    # Few-shot Manager
    "FewshotManager",
    "get_fewshot_manager",
    # Query Generator
    "QueryGenerator",
    "get_query_generator",
    # Query Corrector
    "QueryCorrector",
    "get_query_corrector",
    # Query Executor
    "SafeQueryExecutor",
    "SafeExecutionConfig",
    "QueryTimeoutError",
    "get_query_executor",
    # Hybrid Executor
    "HybridQueryExecutor",
    "HybridExecutionResult",
    "get_hybrid_executor",
]
