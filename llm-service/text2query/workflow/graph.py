"""
Text2Query LangGraph Workflow

Defines the workflow graph connecting all Phase 1-3 components.
"""
import logging
from typing import Optional, Literal, Dict, Any

from langgraph.graph import StateGraph, END

from .state import Text2QueryState, WorkflowConfig, create_initial_state
from .nodes import (
    intent_node,
    semantic_node,
    fewshot_node,
    reasoning_node,
    generation_node,
    validation_node,
    correction_node,
    execution_node,
    finalize_node,
)

logger = logging.getLogger(__name__)


def create_text2query_graph(
    config: Optional[WorkflowConfig] = None
) -> StateGraph:
    """
    Create the Text2Query LangGraph workflow.

    The workflow implements the following pipeline:

    ```
    START
      ↓
    [intent] ─────────────────────────────────────┐
      ↓                                           ↓
    (if TEXT_TO_SQL or TEXT_TO_CYPHER)    (if GENERAL/etc)
      ↓                                           ↓
    [semantic]                                  [END]
      ↓
    [fewshot]
      ↓
    [reasoning] (conditional: complex queries only)
      ↓
    [generation]
      ↓
    [validation] ←─────────────────────────┐
      ↓                                    │
    (if valid)         (if invalid)        │
      ↓                    ↓               │
    [execution]      [correction] ─────────┘
      ↓                (max 3 attempts)
    [finalize]
      ↓
    END
    ```

    Args:
        config: Workflow configuration (optional)

    Returns:
        Compiled LangGraph StateGraph
    """
    if config is None:
        config = WorkflowConfig()

    # Create the graph with state schema
    graph = StateGraph(Text2QueryState)

    # === Add Nodes ===
    # Each node is wrapped to inject config

    graph.add_node("intent", lambda state: intent_node(state, config))
    graph.add_node("semantic", lambda state: semantic_node(state, config))
    graph.add_node("fewshot", lambda state: fewshot_node(state, config))
    graph.add_node("reasoning", lambda state: reasoning_node(state, config))
    graph.add_node("generation", lambda state: generation_node(state, config))
    graph.add_node("validation", lambda state: validation_node(state, config))
    graph.add_node("correction", lambda state: correction_node(state, config))
    graph.add_node("execution", lambda state: execution_node(state, config))
    graph.add_node("finalize", lambda state: finalize_node(state, config))

    # === Define Edges ===

    # Start with intent classification
    graph.set_entry_point("intent")

    # After intent: route based on intent type
    def route_after_intent(state: Text2QueryState) -> str:
        """Route based on intent classification."""
        intent = state.get("intent_type", "TEXT_TO_SQL")

        if intent in ["TEXT_TO_SQL", "TEXT_TO_CYPHER"]:
            return "semantic"
        elif intent == "GENERAL":
            # General questions don't need query generation
            if config.allow_general:
                return "finalize"
            return "semantic"  # Fallback to query generation
        elif intent == "CLARIFICATION_NEEDED":
            # Need more info from user
            return "finalize"
        elif intent == "MISLEADING_QUERY":
            # Potentially harmful query
            return "finalize"
        else:
            # Default to query generation
            return "semantic"

    graph.add_conditional_edges(
        "intent",
        route_after_intent,
        {
            "semantic": "semantic",
            "finalize": "finalize",
        }
    )

    # Linear flow: semantic -> fewshot -> reasoning -> generation
    graph.add_edge("semantic", "fewshot")
    graph.add_edge("fewshot", "reasoning")
    graph.add_edge("reasoning", "generation")
    graph.add_edge("generation", "validation")

    # After validation: route based on validity and correction attempts
    def route_after_validation(state: Text2QueryState) -> str:
        """Route based on validation result."""
        is_valid = state.get("is_valid", False)
        attempts = state.get("correction_attempts", 0)
        max_attempts = state.get("max_correction_attempts", config.max_correction_attempts)

        if is_valid:
            return "execution"
        elif attempts < max_attempts:
            return "correction"
        else:
            return "finalize"  # Max attempts reached, give up

    graph.add_conditional_edges(
        "validation",
        route_after_validation,
        {
            "execution": "execution",
            "correction": "correction",
            "finalize": "finalize",
        }
    )

    # After correction: re-validate
    graph.add_edge("correction", "validation")

    # After execution: finalize
    graph.add_edge("execution", "finalize")

    # Finalize -> END
    graph.add_edge("finalize", END)

    return graph


class Text2QueryWorkflow:
    """
    High-level wrapper for the Text2Query workflow.

    Provides a simple interface for running queries through the pipeline.
    """

    def __init__(self, config: Optional[WorkflowConfig] = None):
        """
        Initialize the workflow.

        Args:
            config: Optional workflow configuration
        """
        self.config = config or WorkflowConfig()
        self._graph = None
        self._compiled = None

    @property
    def graph(self) -> StateGraph:
        """Get or create the workflow graph."""
        if self._graph is None:
            self._graph = create_text2query_graph(self.config)
        return self._graph

    @property
    def compiled(self):
        """Get or compile the workflow."""
        if self._compiled is None:
            self._compiled = self.graph.compile()
        return self._compiled

    def run(
        self,
        question: str,
        project_id: int,
        user_id: Optional[str] = None,
        user_role: str = "USER",
        session_id: Optional[str] = None,
        **kwargs
    ) -> Text2QueryState:
        """
        Run a query through the workflow.

        Args:
            question: User's natural language question
            project_id: Project ID for scoping
            user_id: Optional user ID
            user_role: User role
            session_id: Optional session ID
            **kwargs: Additional state overrides

        Returns:
            Final workflow state with results
        """
        # Initialize tracing
        if self.config.enable_tracing:
            try:
                from ..observability import get_tracer
                tracer = get_tracer(enable_file_export=self.config.trace_to_file)
                tracer.start_trace(f"text2query_{project_id}")
            except Exception as e:
                logger.warning(f"Tracing init failed: {e}")

        # Create initial state
        initial_state = create_initial_state(
            question=question,
            project_id=project_id,
            user_id=user_id,
            user_role=user_role,
            session_id=session_id
        )

        # Apply any overrides
        initial_state.update(kwargs)

        # Run the workflow
        try:
            result = self.compiled.invoke(initial_state)
            return result
        except Exception as e:
            logger.error(f"Workflow execution failed: {e}")
            return {
                **initial_state,
                "success": False,
                "error": f"Workflow execution failed: {e}",
            }

    async def arun(
        self,
        question: str,
        project_id: int,
        user_id: Optional[str] = None,
        user_role: str = "USER",
        session_id: Optional[str] = None,
        **kwargs
    ) -> Text2QueryState:
        """
        Async version of run.

        Args:
            Same as run()

        Returns:
            Final workflow state with results
        """
        # Initialize tracing
        if self.config.enable_tracing:
            try:
                from ..observability import get_tracer
                tracer = get_tracer(enable_file_export=self.config.trace_to_file)
                tracer.start_trace(f"text2query_{project_id}")
            except Exception as e:
                logger.warning(f"Tracing init failed: {e}")

        # Create initial state
        initial_state = create_initial_state(
            question=question,
            project_id=project_id,
            user_id=user_id,
            user_role=user_role,
            session_id=session_id
        )

        # Apply any overrides
        initial_state.update(kwargs)

        # Run the workflow async
        try:
            result = await self.compiled.ainvoke(initial_state)
            return result
        except Exception as e:
            logger.error(f"Async workflow execution failed: {e}")
            return {
                **initial_state,
                "success": False,
                "error": f"Workflow execution failed: {e}",
            }

    def get_response(
        self,
        question: str,
        project_id: int,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Convenience method that returns just the response portion.

        Args:
            question: User's question
            project_id: Project ID
            **kwargs: Additional arguments

        Returns:
            Response dictionary with query results
        """
        result = self.run(question, project_id, **kwargs)
        return result.get("response", {
            "success": result.get("success", False),
            "error": result.get("error"),
            "query": result.get("generated_query"),
            "query_type": result.get("query_type"),
        })


# Singleton instance
_workflow: Optional[Text2QueryWorkflow] = None


def get_text2query_workflow(
    config: Optional[WorkflowConfig] = None
) -> Text2QueryWorkflow:
    """
    Get or create the Text2Query workflow singleton.

    Args:
        config: Optional configuration (only used on first call)

    Returns:
        Text2QueryWorkflow instance
    """
    global _workflow
    if _workflow is None:
        _workflow = Text2QueryWorkflow(config)
    return _workflow


def reset_text2query_workflow() -> None:
    """Reset the workflow singleton (for testing)."""
    global _workflow
    _workflow = None
