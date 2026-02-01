"""
Text2Query Workflow State

Defines the state schema for the LangGraph workflow.
"""
from typing import TypedDict, Optional, List, Dict, Any, Literal
from dataclasses import dataclass, field
from datetime import datetime


class Text2QueryState(TypedDict, total=False):
    """
    State for the Text2Query LangGraph workflow.

    This state flows through all nodes and accumulates results.
    """
    # === Input Fields ===
    question: str                          # User's natural language question
    project_id: int                        # Project scope for queries
    user_id: Optional[str]                 # User ID for tracking
    user_role: str                         # User role for permission context
    session_id: Optional[str]              # Chat session ID

    # === Tracing Fields ===
    trace_id: str                          # Distributed trace ID
    span_ids: Dict[str, str]               # Node -> span_id mapping

    # === Intent Classification (Phase 1) ===
    intent_type: str                       # TEXT_TO_SQL, TEXT_TO_CYPHER, GENERAL, etc.
    intent_confidence: float               # Confidence score 0-1
    intent_reasoning: Optional[str]        # Why this intent was classified
    rephrased_question: Optional[str]      # Clarified/rephrased version

    # === Semantic Layer (Phase 1) ===
    relevant_models: List[str]             # MDL models relevant to question
    schema_context: str                    # Generated schema context for LLM
    metrics_context: Optional[str]         # Available metrics/calculated fields
    join_hints: List[str]                  # Suggested JOIN paths

    # === Few-shot Examples (Phase 1) ===
    fewshot_examples: List[Dict[str, Any]] # Retrieved similar examples
    fewshot_ids_used: List[str]            # IDs of examples used

    # === Reasoning (Phase 2) ===
    use_reasoning: bool                    # Whether to use CoT reasoning
    reasoning_result: Optional[Dict]       # QueryReasoningResponse as dict
    query_complexity: str                  # simple, moderate, complex
    relevant_tables: List[str]             # Tables identified by reasoning

    # === Generation (Phase 2) ===
    query_type: str                        # sql or cypher
    generated_query: str                   # Generated query
    generation_confidence: float           # Generation confidence 0-1
    generation_warnings: List[str]         # Warnings from generation

    # === Validation ===
    is_valid: bool                         # Overall validation result
    validation_errors: List[Dict]          # List of validation errors
    validation_warnings: List[str]         # Non-blocking warnings
    validation_passed_layers: Dict[str, bool]  # Which layers passed

    # === Correction (Phase 2) ===
    correction_attempts: int               # Number of correction attempts
    max_correction_attempts: int           # Max allowed (default 3)
    correction_history: List[Dict]         # History of corrections
    current_error: Optional[str]           # Current error being corrected
    correction_strategy: Optional[str]     # Error category strategy used

    # === Execution ===
    executed: bool                         # Whether query was executed
    execution_result: Optional[Dict]       # Execution result data
    execution_error: Optional[str]         # Execution error if any
    row_count: int                         # Number of rows returned

    # === Token Tracking (Phase 3) ===
    prompt_tokens: int                     # Total prompt tokens used
    completion_tokens: int                 # Total completion tokens used
    total_tokens: int                      # Total tokens used

    # === Timing ===
    start_time: str                        # ISO timestamp of start
    end_time: Optional[str]                # ISO timestamp of end
    node_timings: Dict[str, float]         # Node -> duration_ms

    # === Output ===
    success: bool                          # Overall success
    error: Optional[str]                   # Final error message if failed
    response: Optional[Dict]               # Final structured response


@dataclass
class WorkflowConfig:
    """
    Configuration for the Text2Query workflow.

    Allows customization of workflow behavior.
    """
    # Reasoning settings
    enable_reasoning: bool = True
    reasoning_complexity_threshold: str = "moderate"  # Trigger reasoning above this

    # Correction settings
    max_correction_attempts: int = 3
    enable_error_strategies: bool = True

    # Few-shot settings
    max_fewshot_examples: int = 3
    min_fewshot_similarity: float = 0.5

    # Semantic layer settings
    enable_semantic_layer: bool = True
    max_relevant_models: int = 5

    # Validation settings
    require_project_scope: bool = True
    max_result_rows: int = 100

    # Observability settings
    enable_tracing: bool = True
    enable_metrics: bool = True
    enable_cost_tracking: bool = True
    trace_to_file: bool = False

    # Execution settings
    execute_queries: bool = True
    query_timeout_seconds: float = 5.0

    # Routing settings
    allow_cypher: bool = True
    allow_general: bool = True  # Allow non-query responses

    def to_dict(self) -> Dict[str, Any]:
        """Convert config to dictionary."""
        return {
            "enable_reasoning": self.enable_reasoning,
            "reasoning_complexity_threshold": self.reasoning_complexity_threshold,
            "max_correction_attempts": self.max_correction_attempts,
            "enable_error_strategies": self.enable_error_strategies,
            "max_fewshot_examples": self.max_fewshot_examples,
            "min_fewshot_similarity": self.min_fewshot_similarity,
            "enable_semantic_layer": self.enable_semantic_layer,
            "max_relevant_models": self.max_relevant_models,
            "require_project_scope": self.require_project_scope,
            "max_result_rows": self.max_result_rows,
            "enable_tracing": self.enable_tracing,
            "enable_metrics": self.enable_metrics,
            "enable_cost_tracking": self.enable_cost_tracking,
            "execute_queries": self.execute_queries,
            "query_timeout_seconds": self.query_timeout_seconds,
        }


def create_initial_state(
    question: str,
    project_id: int,
    user_id: Optional[str] = None,
    user_role: str = "USER",
    session_id: Optional[str] = None
) -> Text2QueryState:
    """
    Create initial state for workflow execution.

    Args:
        question: User's natural language question
        project_id: Project ID for scoping
        user_id: Optional user ID
        user_role: User role (default: USER)
        session_id: Optional session ID

    Returns:
        Initialized Text2QueryState
    """
    import uuid
    from datetime import datetime

    return Text2QueryState(
        # Input
        question=question,
        project_id=project_id,
        user_id=user_id,
        user_role=user_role,
        session_id=session_id,

        # Tracing
        trace_id=str(uuid.uuid4())[:32],
        span_ids={},

        # Initialize empty collections
        relevant_models=[],
        join_hints=[],
        fewshot_examples=[],
        fewshot_ids_used=[],
        relevant_tables=[],
        generation_warnings=[],
        validation_errors=[],
        validation_warnings=[],
        validation_passed_layers={},
        correction_history=[],
        node_timings={},

        # Defaults
        intent_confidence=0.0,
        generation_confidence=0.0,
        correction_attempts=0,
        max_correction_attempts=3,
        prompt_tokens=0,
        completion_tokens=0,
        total_tokens=0,
        row_count=0,
        use_reasoning=False,
        is_valid=False,
        executed=False,
        success=False,

        # Timestamps
        start_time=datetime.now().isoformat(),
        end_time=None,
    )
