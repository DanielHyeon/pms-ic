"""
Text2Query LangGraph Workflow

Integrates Text-to-SQL/Cypher generation into the existing chat workflow.
Implements: generate -> validate -> correct (retry) -> execute -> summarize
"""

import logging
import time
from typing import TypedDict, Literal, Optional, List, Dict, Any

from langgraph.graph import StateGraph, END

from text2query.models import QueryType, ValidationResult, ValidationError, ValidationErrorType
from text2query.query_generator import get_query_generator
from text2query.query_validator import get_query_validator
from text2query.query_corrector import get_query_corrector
from text2query.query_executor import get_query_executor
from text2query.fewshot_manager import get_fewshot_manager

logger = logging.getLogger(__name__)


class Text2QueryState(TypedDict):
    """State for Text2Query workflow."""
    # Input
    question: str
    project_id: str
    user_access_level: int

    # Query type decision
    query_type: str  # "sql" or "cypher"

    # Generation
    generated_query: str
    generation_attempt: int
    fewshot_ids_used: List[str]

    # Validation
    validation_result: Optional[Dict]
    is_valid: bool

    # Correction
    correction_attempt: int
    corrected_query: str

    # Execution
    execution_success: bool
    execution_result: Optional[Dict]
    execution_error: Optional[str]

    # Output
    formatted_response: str
    confidence: float

    # Metrics
    metrics: Dict[str, Any]


class Text2QueryWorkflow:
    """
    LangGraph workflow for Text-to-SQL/Cypher.

    Flow:
    1. classify_query_type -> SQL vs Cypher
    2. generate_query -> LLM generates query
    3. validate_query -> Check syntax, schema, security
    4. (if invalid) correct_query -> Fix errors, retry validate
    5. execute_query -> Run against database
    6. format_response -> Create user-friendly output
    7. learn_from_success -> Store successful query as few-shot
    """

    MAX_CORRECTION_RETRIES = 2

    def __init__(self):
        self.generator = get_query_generator()
        self.validator = get_query_validator()
        self.corrector = get_query_corrector()
        self.executor = get_query_executor()
        self.fewshot_manager = get_fewshot_manager()

        self.graph = self._build_graph()

    def _build_graph(self) -> StateGraph:
        """Build the LangGraph workflow."""
        workflow = StateGraph(Text2QueryState)

        # Add nodes
        workflow.add_node("classify_query_type", self._classify_query_type)
        workflow.add_node("generate_query", self._generate_query)
        workflow.add_node("validate_query", self._validate_query)
        workflow.add_node("correct_query", self._correct_query)
        workflow.add_node("execute_query", self._execute_query)
        workflow.add_node("format_response", self._format_response)
        workflow.add_node("learn_from_success", self._learn_from_success)
        workflow.add_node("handle_failure", self._handle_failure)

        # Set entry point
        workflow.set_entry_point("classify_query_type")

        # Add edges
        workflow.add_edge("classify_query_type", "generate_query")
        workflow.add_edge("generate_query", "validate_query")

        # Conditional: valid -> execute, invalid -> correct
        workflow.add_conditional_edges(
            "validate_query",
            self._route_after_validation,
            {
                "execute": "execute_query",
                "correct": "correct_query",
                "fail": "handle_failure"
            }
        )

        workflow.add_edge("correct_query", "validate_query")

        # Conditional: execution success -> format, failure -> handle
        workflow.add_conditional_edges(
            "execute_query",
            self._route_after_execution,
            {
                "success": "format_response",
                "failure": "handle_failure"
            }
        )

        workflow.add_edge("format_response", "learn_from_success")
        workflow.add_edge("learn_from_success", END)
        workflow.add_edge("handle_failure", END)

        return workflow.compile()

    # =========================================================================
    # Node Implementations
    # =========================================================================

    def _classify_query_type(self, state: Text2QueryState) -> Text2QueryState:
        """Classify whether to use SQL or Cypher."""
        question = state["question"].lower()

        # Cypher indicators: graph relationships, document search
        cypher_keywords = ["문서", "관계", "연결", "그래프", "청크", "chunk", "document"]

        # SQL indicators: metrics, status, lists, counts
        sql_keywords = [
            "상태", "완료율", "목록", "리스트", "스프린트", "스토리",
            "담당자", "개수", "수", "sprint", "story", "task", "issue"
        ]

        cypher_score = sum(1 for kw in cypher_keywords if kw in question)
        sql_score = sum(1 for kw in sql_keywords if kw in question)

        # Default to SQL (most common use case)
        query_type = "sql" if sql_score >= cypher_score else "cypher"

        state["query_type"] = query_type
        state["generation_attempt"] = 0
        state["correction_attempt"] = 0
        state["metrics"] = {"classify_time_ms": 0}

        logger.info(f"Query type classified: {query_type} (sql={sql_score}, cypher={cypher_score})")

        return state

    def _generate_query(self, state: Text2QueryState) -> Text2QueryState:
        """Generate SQL/Cypher query using LLM."""
        start_time = time.time()

        query_type = QueryType.SQL if state["query_type"] == "sql" else QueryType.CYPHER

        result = self.generator.generate(
            question=state["question"],
            project_id=state["project_id"],
            query_type=query_type,
            use_fewshot=True,
            num_fewshot=3
        )

        state["generated_query"] = result.query
        state["fewshot_ids_used"] = result.fewshot_ids_used
        state["generation_attempt"] = state.get("generation_attempt", 0) + 1
        state["metrics"]["generation_time_ms"] = (time.time() - start_time) * 1000

        logger.info(f"Generated query (attempt {state['generation_attempt']}): {result.query[:100]}...")

        return state

    def _validate_query(self, state: Text2QueryState) -> Text2QueryState:
        """Validate the generated/corrected query."""
        start_time = time.time()

        query = state.get("corrected_query") or state["generated_query"]
        query_type = QueryType.SQL if state["query_type"] == "sql" else QueryType.CYPHER

        result = self.validator.validate(
            query=query,
            query_type=query_type,
            project_id=state["project_id"],
            require_project_scope=True
        )

        state["validation_result"] = {
            "is_valid": result.is_valid,
            "errors": [{"type": e.type.value, "message": e.message, "suggestion": e.suggestion} for e in result.errors],
            "has_project_scope": result.has_project_scope
        }
        state["is_valid"] = result.is_valid
        state["metrics"]["validation_time_ms"] = (time.time() - start_time) * 1000

        logger.info(f"Validation result: valid={result.is_valid}, errors={len(result.errors)}")

        return state

    def _route_after_validation(self, state: Text2QueryState) -> Literal["execute", "correct", "fail"]:
        """Route based on validation result."""
        if state["is_valid"]:
            return "execute"

        if state["correction_attempt"] < self.MAX_CORRECTION_RETRIES:
            return "correct"

        return "fail"

    def _correct_query(self, state: Text2QueryState) -> Text2QueryState:
        """Attempt to correct invalid query."""
        start_time = time.time()

        query = state.get("corrected_query") or state["generated_query"]
        query_type = QueryType.SQL if state["query_type"] == "sql" else QueryType.CYPHER

        # Reconstruct ValidationResult from dict
        errors = []
        for err_dict in state["validation_result"].get("errors", []):
            errors.append(ValidationError(
                type=ValidationErrorType(err_dict["type"]),
                message=err_dict["message"],
                suggestion=err_dict.get("suggestion")
            ))

        validation_result = ValidationResult(
            is_valid=False,
            errors=errors,
            has_project_scope=state["validation_result"].get("has_project_scope", False)
        )

        corrected = self.corrector.correct(
            original_query=query,
            query_type=query_type,
            validation_result=validation_result,
            question=state["question"],
            project_id=state["project_id"],
            attempt=state["correction_attempt"] + 1
        )

        state["corrected_query"] = corrected or query
        state["correction_attempt"] = state["correction_attempt"] + 1
        state["metrics"]["correction_time_ms"] = (time.time() - start_time) * 1000

        logger.info(f"Correction attempt {state['correction_attempt']}: {'success' if corrected else 'failed'}")

        return state

    def _execute_query(self, state: Text2QueryState) -> Text2QueryState:
        """Execute the validated query."""
        start_time = time.time()

        query = state.get("corrected_query") or state["generated_query"]
        query_type = QueryType.SQL if state["query_type"] == "sql" else QueryType.CYPHER

        # Ensure LIMIT clause
        query = self.validator.ensure_result_limit(query, query_type)

        result = self.executor.execute(
            query=query,
            query_type=query_type,
            project_id=state["project_id"]
        )

        state["execution_success"] = result.success
        state["execution_result"] = {
            "data": result.data,
            "columns": result.columns,
            "row_count": result.row_count
        } if result.success else None
        state["execution_error"] = result.error
        state["metrics"]["execution_time_ms"] = (time.time() - start_time) * 1000

        logger.info(f"Execution: success={result.success}, rows={result.row_count if result.success else 0}")

        return state

    def _route_after_execution(self, state: Text2QueryState) -> Literal["success", "failure"]:
        """Route based on execution result."""
        return "success" if state["execution_success"] else "failure"

    def _format_response(self, state: Text2QueryState) -> Text2QueryState:
        """Format execution results for user."""
        result = state["execution_result"]

        if not result or result["row_count"] == 0:
            state["formatted_response"] = "No results found."
            state["confidence"] = 0.7
            return state

        # Format as markdown table or list
        formatted = self._format_as_markdown(result)

        state["formatted_response"] = formatted
        state["confidence"] = 0.9 if result["row_count"] > 0 else 0.7

        return state

    def _format_as_markdown(self, result: Dict) -> str:
        """Format result as markdown."""
        data = result["data"]
        columns = result["columns"]
        row_count = result["row_count"]

        if not data or not columns:
            return "No results found."

        lines = [f"**Query Results** ({row_count} rows)\n"]

        # Display columns (max 5)
        display_cols = columns[:5]

        # Table header
        lines.append("| " + " | ".join(display_cols) + " |")
        lines.append("| " + " | ".join(["---"] * len(display_cols)) + " |")

        # Table rows (max 20)
        for row in data[:20]:
            values = []
            for col in display_cols:
                val = row.get(col, "")
                str_val = str(val) if val is not None else ""
                if len(str_val) > 30:
                    str_val = str_val[:30] + "..."
                values.append(str_val)
            lines.append("| " + " | ".join(values) + " |")

        if row_count > 20:
            lines.append(f"\n_... and {row_count - 20} more rows_")

        return "\n".join(lines)

    def _learn_from_success(self, state: Text2QueryState) -> Text2QueryState:
        """Store successful query as few-shot example."""
        if not state["execution_success"]:
            return state

        query = state.get("corrected_query") or state["generated_query"]
        query_type = QueryType.SQL if state["query_type"] == "sql" else QueryType.CYPHER

        try:
            # Extract table names from validation result
            target_tables = []
            if state.get("validation_result"):
                # Simple extraction from query
                if "user_stories" in query.lower():
                    target_tables.append("task.user_stories")
                if "sprints" in query.lower():
                    target_tables.append("task.sprints")
                if "tasks" in query.lower():
                    target_tables.append("task.tasks")

            self.fewshot_manager.add_example(
                question=state["question"],
                query=query,
                query_type=query_type,
                target_tables=target_tables or ["unknown"],
            )
            logger.info("Stored successful query as few-shot example")
        except Exception as e:
            logger.warning(f"Failed to store few-shot example: {e}")

        return state

    def _handle_failure(self, state: Text2QueryState) -> Text2QueryState:
        """Handle query generation/execution failure."""
        error_msg = state.get("execution_error") or "Query generation failed."

        state["formatted_response"] = (
            f"Sorry, there was a problem retrieving the requested data.\n\n"
            f"Error: {error_msg}\n\n"
            f"Please try rephrasing your question or provide more specific criteria."
        )
        state["confidence"] = 0.3

        return state

    # =========================================================================
    # Public API
    # =========================================================================

    def run(
        self,
        question: str,
        project_id: str,
        user_access_level: int = 6
    ) -> Dict[str, Any]:
        """
        Run the Text2Query workflow.

        Args:
            question: Natural language question
            project_id: Project ID for scope
            user_access_level: User's access level (1-6)

        Returns:
            Dictionary with response and metadata
        """
        initial_state: Text2QueryState = {
            "question": question,
            "project_id": project_id,
            "user_access_level": user_access_level,
            "query_type": "sql",
            "generated_query": "",
            "generation_attempt": 0,
            "fewshot_ids_used": [],
            "validation_result": None,
            "is_valid": False,
            "correction_attempt": 0,
            "corrected_query": "",
            "execution_success": False,
            "execution_result": None,
            "execution_error": None,
            "formatted_response": "",
            "confidence": 0.0,
            "metrics": {}
        }

        logger.info(f"Starting Text2Query workflow: {question[:50]}...")

        final_state = self.graph.invoke(initial_state)

        return {
            "response": final_state["formatted_response"],
            "confidence": final_state["confidence"],
            "query_type": final_state["query_type"],
            "query_used": final_state.get("corrected_query") or final_state["generated_query"],
            "execution_success": final_state["execution_success"],
            "row_count": (final_state.get("execution_result") or {}).get("row_count", 0),
            "metrics": final_state["metrics"]
        }


# Singleton
_workflow: Optional[Text2QueryWorkflow] = None


def get_text2query_workflow() -> Text2QueryWorkflow:
    """Get singleton Text2QueryWorkflow instance."""
    global _workflow
    if _workflow is None:
        _workflow = Text2QueryWorkflow()
    return _workflow
