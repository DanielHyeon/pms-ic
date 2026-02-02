"""
Text2Query Workflow Nodes

LangGraph nodes that integrate Phase 1-3 components.
Each node takes state, performs an operation, and returns updated state.
"""
import logging
import time
from typing import Optional, Dict, Any
from datetime import datetime

from .state import Text2QueryState, WorkflowConfig

logger = logging.getLogger(__name__)


def intent_node(
    state: Text2QueryState,
    config: WorkflowConfig
) -> Text2QueryState:
    """
    Intent classification node.

    Determines the type of query (TEXT_TO_SQL, TEXT_TO_CYPHER, GENERAL, etc.)
    using the Phase 1 IntentClassifier.
    """
    start = time.time()

    try:
        from ..intent import get_intent_classifier, IntentType

        classifier = get_intent_classifier()
        result = classifier.classify(
            question=state["question"],
            use_llm=True
        )

        # Update state
        updates: Dict[str, Any] = {
            "intent_type": result.intent.value,
            "intent_confidence": result.confidence,
            "intent_reasoning": result.reasoning,
        }

        if result.rephrased_question:
            updates["rephrased_question"] = result.rephrased_question

        # Record timing
        duration = (time.time() - start) * 1000
        state["node_timings"]["intent"] = duration

        logger.info(
            f"Intent classified: {result.intent.value} "
            f"(confidence={result.confidence:.2f}, {duration:.0f}ms)"
        )

        return {**state, **updates}

    except Exception as e:
        logger.error(f"Intent classification failed: {e}")
        return {
            **state,
            "intent_type": "TEXT_TO_SQL",  # Default fallback
            "intent_confidence": 0.5,
            "node_timings": {**state.get("node_timings", {}), "intent": (time.time() - start) * 1000}
        }


def semantic_node(
    state: Text2QueryState,
    config: WorkflowConfig
) -> Text2QueryState:
    """
    Semantic layer resolution node.

    Uses MDL to map business terms to database schema.
    Finds relevant models and generates schema context.

    IMPORTANT: Skips SQL table retrieval for TEXT_TO_CYPHER intent
    since Cypher queries use Neo4j graph schema, not PostgreSQL tables.
    """
    start = time.time()

    if not config.enable_semantic_layer:
        return state

    # Check intent type - skip SQL table retrieval for CYPHER queries
    intent_type = state.get("intent_type", "TEXT_TO_SQL")

    if intent_type == "TEXT_TO_CYPHER":
        # For Cypher queries, don't retrieve PostgreSQL tables
        duration = (time.time() - start) * 1000
        state["node_timings"]["semantic"] = duration

        logger.info(
            f"Semantic layer: skipped for CYPHER intent ({duration:.0f}ms)"
        )

        return {
            **state,
            "relevant_models": [],
            "schema_context": "",
            "metrics_context": "",
            "join_hints": [],
        }

    try:
        from ..semantic import get_semantic_layer

        semantic_layer = get_semantic_layer()
        question = state.get("rephrased_question") or state["question"]

        # Find relevant models with dynamic thresholding
        relevant_models = semantic_layer.find_relevant_models(question)
        model_names = [m.name for m in relevant_models[:config.max_relevant_models]]

        # Generate schema context
        schema_context = semantic_layer.generate_schema_context(model_names)

        # Get metrics context
        metrics_context = "\n".join([
            f"- {m.display_name or m.name}: {m.description or 'No description'}"
            for m in semantic_layer.metrics.values()
        ])

        # Get join hints
        join_hints = []
        if len(model_names) >= 2:
            for i, m1 in enumerate(model_names[:-1]):
                for m2 in model_names[i+1:]:
                    rel = semantic_layer.find_join_path(m1, m2)
                    if rel:
                        join_hints.append(
                            f"{m1} -> {m2}: JOIN ON {rel.join_condition}"
                        )

        duration = (time.time() - start) * 1000
        state["node_timings"]["semantic"] = duration

        logger.info(
            f"Semantic layer: {len(model_names)} models, "
            f"{len(join_hints)} join hints ({duration:.0f}ms)"
        )

        return {
            **state,
            "relevant_models": model_names,
            "schema_context": schema_context,
            "metrics_context": metrics_context,
            "join_hints": join_hints,
        }

    except Exception as e:
        logger.warning(f"Semantic layer failed: {e}")
        return {
            **state,
            "relevant_models": [],
            "schema_context": "",
            "node_timings": {**state.get("node_timings", {}), "semantic": (time.time() - start) * 1000}
        }


def fewshot_node(
    state: Text2QueryState,
    config: WorkflowConfig
) -> Text2QueryState:
    """
    Few-shot example retrieval node.

    Retrieves similar query examples using vector similarity.
    """
    start = time.time()

    try:
        from ..fewshot import get_vector_fewshot_manager
        from ..models import QueryType

        manager = get_vector_fewshot_manager()
        question = state.get("rephrased_question") or state["question"]

        # Determine query type
        query_type = QueryType.SQL
        if state.get("intent_type") == "TEXT_TO_CYPHER":
            query_type = QueryType.CYPHER

        # Retrieve similar examples
        examples = manager.get_similar_examples(
            question=question,
            query_type=query_type,
            top_k=config.max_fewshot_examples,
            min_similarity=config.min_fewshot_similarity
        )

        fewshot_dicts = [ex.to_dict() for ex in examples]
        fewshot_ids = [ex.id for ex in examples]

        duration = (time.time() - start) * 1000
        state["node_timings"]["fewshot"] = duration

        logger.info(f"Few-shot: {len(examples)} examples retrieved ({duration:.0f}ms)")

        return {
            **state,
            "fewshot_examples": fewshot_dicts,
            "fewshot_ids_used": fewshot_ids,
        }

    except Exception as e:
        logger.warning(f"Few-shot retrieval failed: {e}")
        return {
            **state,
            "fewshot_examples": [],
            "fewshot_ids_used": [],
            "node_timings": {**state.get("node_timings", {}), "fewshot": (time.time() - start) * 1000}
        }


def reasoning_node(
    state: Text2QueryState,
    config: WorkflowConfig,
    generator=None
) -> Text2QueryState:
    """
    Chain-of-thought reasoning node.

    Analyzes complex queries and creates step-by-step plans.
    Only runs for queries above complexity threshold.
    """
    start = time.time()

    if not config.enable_reasoning:
        return {**state, "use_reasoning": False}

    # Check if reasoning should be used
    from ..nodes import should_use_reasoning
    if not should_use_reasoning({"question": state["question"]}):
        logger.debug("Reasoning skipped (simple query)")
        return {**state, "use_reasoning": False}

    try:
        from ..nodes import reasoning_node as core_reasoning_node
        from ..llm import get_structured_generator

        if generator is None:
            generator = get_structured_generator()

        # Build reasoning state
        reasoning_state = {
            "question": state.get("rephrased_question") or state["question"],
            "project_id": state["project_id"],
            "user_role": state.get("user_role", "USER"),
            "previous_context": state.get("metrics_context"),
        }

        # Run reasoning
        result = core_reasoning_node(reasoning_state, generator)

        duration = (time.time() - start) * 1000
        state["node_timings"]["reasoning"] = duration

        reasoning_response = result.get("reasoning")
        if reasoning_response:
            logger.info(
                f"Reasoning: complexity={reasoning_response.estimated_complexity}, "
                f"joins={reasoning_response.requires_joins} ({duration:.0f}ms)"
            )

            return {
                **state,
                "use_reasoning": True,
                "reasoning_result": reasoning_response.model_dump() if hasattr(reasoning_response, 'model_dump') else None,
                "query_complexity": reasoning_response.estimated_complexity,
                "relevant_tables": result.get("relevant_tables", []),
            }

        return {**state, "use_reasoning": False}

    except Exception as e:
        logger.warning(f"Reasoning failed: {e}")
        return {
            **state,
            "use_reasoning": False,
            "node_timings": {**state.get("node_timings", {}), "reasoning": (time.time() - start) * 1000}
        }


def generation_node(
    state: Text2QueryState,
    config: WorkflowConfig,
    generator=None
) -> Text2QueryState:
    """
    Query generation node.

    Generates SQL/Cypher using LLM with context from semantic layer,
    few-shot examples, and optional reasoning.
    """
    start = time.time()

    try:
        from ..llm import get_structured_generator
        from ..response_models import SQLGenerationResponse, CypherGenerationResponse
        from ..knowledge import get_sql_knowledge

        if generator is None:
            generator = get_structured_generator()

        question = state.get("rephrased_question") or state["question"]
        is_cypher = state.get("intent_type") == "TEXT_TO_CYPHER"

        # Build context
        schema_context = state.get("schema_context", "")
        if not schema_context:
            # Fallback to knowledge manager
            knowledge = get_sql_knowledge()
            schema_context = knowledge.get_full_context(include_patterns=True)

        # Build few-shot context
        fewshot_context = ""
        for ex in state.get("fewshot_examples", [])[:3]:
            fewshot_context += f"\nQ: {ex['question']}\n"
            fewshot_context += f"A: {ex['query']}\n"

        # Build reasoning context
        reasoning_context = ""
        if state.get("use_reasoning") and state.get("reasoning_result"):
            reasoning = state["reasoning_result"]
            reasoning_context = f"""
## Query Planning (Chain-of-Thought)
Understanding: {reasoning.get('understanding', '')}
Complexity: {reasoning.get('estimated_complexity', 'unknown')}
Requires JOINs: {reasoning.get('requires_joins', False)}
Steps:
"""
            for step in reasoning.get("steps", []):
                reasoning_context += f"  {step.get('step_number', '?')}. {step.get('description', '')}\n"

        # Build generation prompt
        prompt = f"""Generate a {'Cypher' if is_cypher else 'PostgreSQL'} query for the following question.

## Question
{question}

## Database Schema
{schema_context}

{reasoning_context}

## Similar Examples
{fewshot_context if fewshot_context else "No similar examples available."}

## Rules
1. ALWAYS filter by project_id = :project_id for project-scoped tables
2. Use schema-qualified table names (e.g., task.tasks, not just tasks)
3. Add LIMIT 100 to prevent large result sets
4. Use explicit column names, never SELECT *
5. Return valid {'Cypher' if is_cypher else 'SQL'} only

Generate the query with confidence score and list of tables used."""

        # Generate with structured output
        response_model = CypherGenerationResponse if is_cypher else SQLGenerationResponse
        result = generator.generate(
            prompt=prompt,
            response_model=response_model,
            temperature=0
        )

        # Extract query
        query = result.cypher if is_cypher else result.sql

        duration = (time.time() - start) * 1000
        state["node_timings"]["generation"] = duration

        logger.info(
            f"Generated {'Cypher' if is_cypher else 'SQL'}: "
            f"confidence={result.confidence:.2f} ({duration:.0f}ms)"
        )

        return {
            **state,
            "query_type": "cypher" if is_cypher else "sql",
            "generated_query": query,
            "generation_confidence": result.confidence,
            "generation_warnings": getattr(result, 'warnings', []) or [],
            "relevant_tables": getattr(result, 'tables_used', []) or state.get("relevant_tables", []),
        }

    except Exception as e:
        logger.error(f"Generation failed: {e}")
        return {
            **state,
            "success": False,
            "error": f"Query generation failed: {e}",
            "node_timings": {**state.get("node_timings", {}), "generation": (time.time() - start) * 1000}
        }


def validation_node(
    state: Text2QueryState,
    config: WorkflowConfig
) -> Text2QueryState:
    """
    Query validation node.

    Validates the generated query through 4 layers:
    syntax, schema, security, performance.
    """
    start = time.time()

    try:
        from ..query_validator import get_query_validator
        from ..models import QueryType

        validator = get_query_validator()
        query = state.get("generated_query", "")
        query_type = QueryType.CYPHER if state.get("query_type") == "cypher" else QueryType.SQL

        result = validator.validate(
            query=query,
            query_type=query_type,
            project_id=str(state["project_id"]),
            require_project_scope=config.require_project_scope
        )

        duration = (time.time() - start) * 1000
        state["node_timings"]["validation"] = duration

        # Convert errors to dicts
        errors = [
            {
                "type": e.type.value,
                "message": e.message,
                "location": e.location,
                "suggestion": e.suggestion
            }
            for e in result.errors
        ]

        logger.info(
            f"Validation: {'PASS' if result.is_valid else 'FAIL'} "
            f"(layers: L1={result.layer1_syntax_passed}, L2={result.layer2_schema_passed}, "
            f"L3={result.layer3_security_passed}, L4={result.layer4_performance_passed}) "
            f"({duration:.0f}ms)"
        )

        return {
            **state,
            "is_valid": result.is_valid,
            "validation_errors": errors,
            "validation_warnings": result.warnings,
            "validation_passed_layers": {
                "syntax": result.layer1_syntax_passed,
                "schema": result.layer2_schema_passed,
                "security": result.layer3_security_passed,
                "performance": result.layer4_performance_passed,
            },
            "current_error": result.get_error_summary() if not result.is_valid else None,
        }

    except Exception as e:
        logger.error(f"Validation failed: {e}")
        return {
            **state,
            "is_valid": False,
            "validation_errors": [{"type": "unknown", "message": str(e)}],
            "current_error": str(e),
            "node_timings": {**state.get("node_timings", {}), "validation": (time.time() - start) * 1000}
        }


def correction_node(
    state: Text2QueryState,
    config: WorkflowConfig,
    generator=None
) -> Text2QueryState:
    """
    Query correction node.

    Uses error-specific strategies to fix validation errors.
    Supports up to 3 correction attempts.
    """
    start = time.time()

    # Check attempt limit
    attempts = state.get("correction_attempts", 0)
    max_attempts = state.get("max_correction_attempts", config.max_correction_attempts)

    if attempts >= max_attempts:
        logger.warning(f"Max correction attempts ({max_attempts}) reached")
        return {
            **state,
            "success": False,
            "error": f"Query correction failed after {max_attempts} attempts",
        }

    try:
        from ..correction import get_enhanced_corrector, categorize_error
        from ..llm import get_structured_generator

        if generator is None:
            generator = get_structured_generator()

        corrector = get_enhanced_corrector(generator=generator)

        error_message = state.get("current_error", "Unknown error")
        question = state.get("rephrased_question") or state["question"]

        # Categorize error for strategy
        error_category = categorize_error(error_message)

        # Attempt correction
        result = corrector.correct(
            question=question,
            invalid_sql=state.get("generated_query", ""),
            error_message=error_message,
            project_id=state["project_id"],
            schema_context=state.get("schema_context"),
            max_attempts=1  # Single attempt per node call
        )

        duration = (time.time() - start) * 1000
        state["node_timings"][f"correction_{attempts + 1}"] = duration

        # Track history
        correction_history = state.get("correction_history", [])
        correction_history.append({
            "attempt": attempts + 1,
            "error": error_message,
            "strategy": error_category.value,
            "success": result.success,
            "corrected_query": result.corrected_query,
        })

        logger.info(
            f"Correction attempt {attempts + 1}: "
            f"{'SUCCESS' if result.success else 'PARTIAL'} "
            f"(strategy={error_category.value}) ({duration:.0f}ms)"
        )

        return {
            **state,
            "generated_query": result.corrected_query,
            "correction_attempts": attempts + 1,
            "correction_history": correction_history,
            "correction_strategy": error_category.value,
            # Reset validation for re-check
            "is_valid": False,
        }

    except Exception as e:
        logger.error(f"Correction failed: {e}")
        return {
            **state,
            "correction_attempts": attempts + 1,
            "success": False,
            "error": f"Correction failed: {e}",
            "node_timings": {**state.get("node_timings", {}), f"correction_{attempts + 1}": (time.time() - start) * 1000}
        }


def execution_node(
    state: Text2QueryState,
    config: WorkflowConfig
) -> Text2QueryState:
    """
    Query execution node.

    Executes the validated query safely with guards.
    """
    start = time.time()

    if not config.execute_queries:
        logger.info("Query execution disabled by config")
        return {
            **state,
            "executed": False,
            "success": True,
            "response": {
                "query": state.get("generated_query"),
                "query_type": state.get("query_type"),
                "execution_skipped": True,
            }
        }

    if not state.get("is_valid"):
        logger.warning("Cannot execute invalid query")
        return {
            **state,
            "executed": False,
            "success": False,
            "error": "Query validation failed",
        }

    try:
        from ..query_executor import get_query_executor
        from ..models import QueryType

        executor = get_query_executor()
        query = state.get("generated_query", "")
        query_type = QueryType.CYPHER if state.get("query_type") == "cypher" else QueryType.SQL

        result = executor.execute(
            query=query,
            query_type=query_type,
            project_id=str(state["project_id"]),
            timeout_seconds=config.query_timeout_seconds
        )

        duration = (time.time() - start) * 1000
        state["node_timings"]["execution"] = duration

        if result.success:
            logger.info(
                f"Execution: SUCCESS ({result.row_count} rows, {duration:.0f}ms)"
            )

            return {
                **state,
                "executed": True,
                "execution_result": {
                    "data": result.data,
                    "columns": result.columns,
                    "row_count": result.row_count,
                },
                "row_count": result.row_count,
                "success": True,
                "end_time": datetime.now().isoformat(),
                "response": {
                    "success": True,
                    "query": query,
                    "query_type": state.get("query_type"),
                    "data": result.data,
                    "columns": result.columns,
                    "row_count": result.row_count,
                }
            }
        else:
            logger.warning(f"Execution failed: {result.error}")
            return {
                **state,
                "executed": True,
                "execution_error": result.error,
                "success": False,
                "error": result.error,
                "end_time": datetime.now().isoformat(),
            }

    except Exception as e:
        logger.error(f"Execution failed: {e}")
        return {
            **state,
            "executed": False,
            "execution_error": str(e),
            "success": False,
            "error": f"Execution failed: {e}",
            "end_time": datetime.now().isoformat(),
            "node_timings": {**state.get("node_timings", {}), "execution": (time.time() - start) * 1000}
        }


def finalize_node(
    state: Text2QueryState,
    config: WorkflowConfig
) -> Text2QueryState:
    """
    Finalization node.

    Records final metrics and prepares response.
    """
    try:
        from ..observability import get_metrics_collector, get_tracer, QueryMetrics

        # Record metrics
        if config.enable_metrics:
            collector = get_metrics_collector()
            metrics = QueryMetrics(
                query_id=state.get("trace_id", "unknown"),
                intent_type=state.get("intent_type", ""),
                intent_confidence=state.get("intent_confidence", 0),
                generation_time_ms=state.get("node_timings", {}).get("generation", 0),
                validation_time_ms=state.get("node_timings", {}).get("validation", 0),
                correction_attempts=state.get("correction_attempts", 0),
                total_time_ms=sum(state.get("node_timings", {}).values()),
                prompt_tokens=state.get("prompt_tokens", 0),
                completion_tokens=state.get("completion_tokens", 0),
                total_tokens=state.get("total_tokens", 0),
                success=state.get("success", False),
                error_type=state.get("error", "")[:50] if state.get("error") else None,
                query_type=state.get("query_type", ""),
                tables_used=state.get("relevant_tables", []),
                complexity=state.get("query_complexity", "simple"),
                used_semantic_layer=bool(state.get("schema_context")),
                used_fewshot=bool(state.get("fewshot_examples")),
                fewshot_count=len(state.get("fewshot_examples", [])),
            )
            collector.record(metrics)

        # End trace
        if config.enable_tracing:
            tracer = get_tracer()
            tracer.end_trace()

        state["end_time"] = datetime.now().isoformat()

        logger.info(
            f"Workflow complete: success={state.get('success')}, "
            f"total_time={sum(state.get('node_timings', {}).values()):.0f}ms"
        )

        return state

    except Exception as e:
        logger.warning(f"Finalization error: {e}")
        return state
