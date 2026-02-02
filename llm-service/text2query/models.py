"""
Data models for Text2Query system.

This module defines all data classes used throughout the Text2Query package:
- Query type enums
- Schema information (tables, nodes, relationships)
- Validation results
- Generation and execution results
- Few-shot examples
"""

from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from enum import Enum


class QueryType(Enum):
    """Type of query to generate."""
    SQL = "sql"
    CYPHER = "cypher"


class ValidationErrorType(Enum):
    """Types of validation errors."""
    SYNTAX = "syntax"
    SCHEMA_MISMATCH = "schema_mismatch"
    SECURITY_VIOLATION = "security_violation"
    POLICY_VIOLATION = "policy_violation"
    SCOPE_MISSING = "scope_missing"


@dataclass
class TableInfo:
    """PostgreSQL table information."""
    schema: str
    name: str
    columns: Dict[str, str]  # column_name -> data_type
    primary_key: Optional[str] = None
    foreign_keys: List[Dict[str, str]] = field(default_factory=list)
    description: Optional[str] = None


@dataclass
class NodeLabelInfo:
    """Neo4j node label information."""
    label: str
    properties: Dict[str, str]  # property_name -> type_hint
    indexes: List[str] = field(default_factory=list)


@dataclass
class RelationshipTypeInfo:
    """Neo4j relationship type information."""
    type: str
    start_label: str
    end_label: str
    properties: Dict[str, str] = field(default_factory=dict)


@dataclass
class SchemaContext:
    """Schema context for LLM prompt generation."""
    tables: List[TableInfo] = field(default_factory=list)
    node_labels: List[NodeLabelInfo] = field(default_factory=list)
    relationships: List[RelationshipTypeInfo] = field(default_factory=list)
    join_hints: List[str] = field(default_factory=list)

    def to_sql_context(self, max_tables: int = 10) -> str:
        """Generate SQL schema context string for LLM prompt."""
        lines = ["## PostgreSQL Schema\n"]
        for table in self.tables[:max_tables]:
            cols = ", ".join(f"{c}: {t}" for c, t in table.columns.items())
            lines.append(f"### {table.schema}.{table.name}")
            lines.append(f"Columns: {cols}")
            if table.primary_key:
                lines.append(f"PK: {table.primary_key}")
            if table.foreign_keys:
                fks = ", ".join(
                    f"{fk['column']} -> {fk['references']}"
                    for fk in table.foreign_keys
                )
                lines.append(f"FK: {fks}")
            lines.append("")
        return "\n".join(lines)

    def to_cypher_context(self) -> str:
        """Generate Cypher schema context string for LLM prompt."""
        lines = ["## Neo4j Schema\n"]
        lines.append("### Node Labels")
        for label in self.node_labels:
            props = ", ".join(f"{p}: {t}" for p, t in label.properties.items())
            lines.append(f"- (:{label.label} {{{props}}})")
        lines.append("\n### Relationships")
        for rel in self.relationships:
            lines.append(f"- (:{rel.start_label})-[:{rel.type}]->(:{rel.end_label})")
        return "\n".join(lines)


@dataclass
class ValidationError:
    """Single validation error with details."""
    type: ValidationErrorType
    message: str
    location: Optional[str] = None  # e.g., "line 3, column 15"
    suggestion: Optional[str] = None


@dataclass
class ValidationResult:
    """Result of query validation through all layers."""
    is_valid: bool
    errors: List[ValidationError] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    has_project_scope: bool = False
    extracted_tables: List[str] = field(default_factory=list)
    extracted_columns: List[str] = field(default_factory=list)

    # Layer-specific results for logging
    layer1_syntax_passed: bool = True
    layer2_schema_passed: bool = True
    layer3_security_passed: bool = True
    layer4_performance_passed: bool = True

    def get_error_summary(self) -> str:
        """Get summary of all errors for logging or correction."""
        return "; ".join(f"[{e.type.value}] {e.message}" for e in self.errors)

    def get_first_error(self) -> Optional[ValidationError]:
        """Get the first error if any."""
        return self.errors[0] if self.errors else None


@dataclass
class GenerationResult:
    """Result of query generation from LLM."""
    query: str
    query_type: QueryType
    is_valid: bool = False
    validation_result: Optional[ValidationResult] = None
    explanation: str = ""
    fewshot_ids_used: List[str] = field(default_factory=list)
    generation_time_ms: float = 0.0
    correction_attempts: int = 0


@dataclass
class ExecutionResult:
    """Result of query execution."""
    success: bool
    data: List[Dict[str, Any]] = field(default_factory=list)
    columns: List[str] = field(default_factory=list)
    row_count: int = 0
    error: Optional[str] = None
    execution_time_ms: float = 0.0
    query_used: str = ""


@dataclass
class FewshotExample:
    """Few-shot example for query generation."""
    id: str
    question: str
    query: str
    query_type: QueryType
    target_tables: List[str]
    target_schemas: List[str] = field(default_factory=list)
    keywords: List[str] = field(default_factory=list)
    similarity_score: float = 0.0
    success_count: int = 0
    failure_count: int = 0

    def to_prompt_format(self) -> str:
        """Format example for inclusion in LLM prompt."""
        return f"Q: {self.question}\n{self.query_type.value.upper()}: {self.query}"
