"""
Structured Response Models

Pydantic models for enforcing JSON schema on all LLM outputs.
Ensures consistent, validated responses from query generation pipeline.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from enum import Enum


class SQLGenerationResponse(BaseModel):
    """Structured response for SQL generation."""

    class Config:
        json_schema_extra = {
            "example": {
                "sql": "SELECT COUNT(*) FROM task.tasks WHERE project_id = :project_id",
                "confidence": 0.95,
                "tables_used": ["task.tasks"],
                "reasoning": "Counting tasks with project filter",
                "warnings": []
            }
        }

    sql: str = Field(
        ...,
        description="Generated SQL query",
        min_length=10
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Confidence score for the generated SQL"
    )
    tables_used: List[str] = Field(
        default_factory=list,
        description="List of tables referenced in the query"
    )
    reasoning: Optional[str] = Field(
        None,
        description="Explanation of query construction logic"
    )
    warnings: List[str] = Field(
        default_factory=list,
        description="Any warnings about the query"
    )


class CypherGenerationResponse(BaseModel):
    """Structured response for Cypher generation."""

    class Config:
        json_schema_extra = {
            "example": {
                "cypher": "MATCH (d:Document {project_id: $project_id}) RETURN d",
                "confidence": 0.9,
                "node_types": ["Document"],
                "relationship_types": [],
                "reasoning": "Finding documents by project"
            }
        }

    cypher: str = Field(
        ...,
        description="Generated Cypher query",
        min_length=10
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0
    )
    node_types: List[str] = Field(
        default_factory=list,
        description="Node labels used in the query"
    )
    relationship_types: List[str] = Field(
        default_factory=list,
        description="Relationship types traversed"
    )
    reasoning: Optional[str] = None


class ReasoningStep(BaseModel):
    """Single step in chain-of-thought reasoning."""

    step_number: int = Field(..., ge=1, description="Step sequence number")
    description: str = Field(..., description="What this step accomplishes")
    sql_fragment: Optional[str] = Field(
        None,
        description="SQL fragment for this step"
    )
    tables_involved: List[str] = Field(
        default_factory=list,
        description="Tables involved in this step"
    )


class QueryReasoningResponse(BaseModel):
    """Structured response for query reasoning (Chain-of-Thought)."""

    class Config:
        json_schema_extra = {
            "example": {
                "understanding": "User wants to count tasks by status",
                "steps": [
                    {"step_number": 1, "description": "Identify tasks table", "tables_involved": ["task.tasks"]},
                    {"step_number": 2, "description": "Group by status column", "sql_fragment": "GROUP BY status"}
                ],
                "estimated_complexity": "simple",
                "requires_joins": False,
                "aggregation_needed": True
            }
        }

    understanding: str = Field(
        ...,
        description="Summary of what the user is asking"
    )
    steps: List[ReasoningStep] = Field(
        ...,
        description="Step-by-step query construction plan",
        min_length=1
    )
    estimated_complexity: Literal["simple", "moderate", "complex"] = Field(
        "moderate",
        description="Estimated query complexity"
    )
    requires_joins: bool = Field(
        False,
        description="Whether the query needs JOIN operations"
    )
    aggregation_needed: bool = Field(
        False,
        description="Whether aggregation (GROUP BY) is needed"
    )


class CorrectionResponse(BaseModel):
    """Structured response for SQL correction."""

    class Config:
        json_schema_extra = {
            "example": {
                "corrected_sql": "SELECT COUNT(*) FROM task.tasks WHERE status = 'DONE'",
                "error_analysis": "Column name was misspelled",
                "fix_applied": "Changed 'taskStatus' to 'status'",
                "confidence": 0.9
            }
        }

    corrected_sql: str = Field(
        ...,
        description="Corrected SQL query",
        min_length=10
    )
    error_analysis: str = Field(
        ...,
        description="Analysis of what was wrong"
    )
    fix_applied: str = Field(
        ...,
        description="Description of the fix applied"
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0
    )


class ErrorType(str, Enum):
    """Types of validation errors."""
    SYNTAX = "syntax_error"
    SCHEMA = "schema_error"
    SECURITY = "security_violation"
    SCOPE = "scope_error"
    PERFORMANCE = "performance_issue"
    LOGIC = "logic_error"
    UNKNOWN = "unknown"


class ValidationErrorDetail(BaseModel):
    """Detailed validation error information."""

    error_type: ErrorType
    message: str
    location: Optional[str] = Field(
        None,
        description="Location in query where error occurred"
    )
    suggestion: Optional[str] = Field(
        None,
        description="Suggested fix for the error"
    )


class QueryValidationResponse(BaseModel):
    """Structured validation result."""

    class Config:
        json_schema_extra = {
            "example": {
                "is_valid": False,
                "errors": [
                    {"error_type": "schema_error", "message": "Table 'users' not found", "suggestion": "Use 'auth.users'"}
                ],
                "warnings": ["Query may be slow without index"],
                "sanitized_query": None
            }
        }

    is_valid: bool = Field(..., description="Whether the query passed validation")
    errors: List[ValidationErrorDetail] = Field(
        default_factory=list,
        description="List of validation errors"
    )
    warnings: List[str] = Field(
        default_factory=list,
        description="Non-blocking warnings"
    )
    sanitized_query: Optional[str] = Field(
        None,
        description="Sanitized version of the query if available"
    )

    def has_errors_of_type(self, error_type: ErrorType) -> bool:
        """Check if validation has errors of a specific type."""
        return any(e.error_type == error_type for e in self.errors)

    def get_first_error_message(self) -> Optional[str]:
        """Get the first error message or None."""
        return self.errors[0].message if self.errors else None


class IntentClassificationResponse(BaseModel):
    """Structured response for intent classification."""

    intent: Literal["TEXT_TO_SQL", "TEXT_TO_CYPHER", "GENERAL", "MISLEADING_QUERY", "CLARIFICATION_NEEDED"]
    confidence: float = Field(..., ge=0.0, le=1.0)
    rephrased_question: Optional[str] = None
    reasoning: Optional[str] = None
    relevant_models: List[str] = Field(default_factory=list)
    missing_parameters: List[str] = Field(default_factory=list)
    suggested_clarification: Optional[str] = None
