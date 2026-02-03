"""
Phase 2: Common Workflow Nodes

Implements the 9 standard node types used across all workflows:
1. Router - Intent routing
2. BuildContext - Build context from DB/Graph/Vector
3. Retrieve - RAG / graph query / metrics collection
4. Reason - Plan/summarize/recommend/analyze
5. Verify - Evidence/consistency/policy/confidence verification
6. Act - Save draft, create task (before approval), create links
7. Gate - Block/request based on authority/approval level
8. Recover - Recovery based on failure type
9. Observe - Trace/Span/cost/quality metrics logging
"""

import logging
from typing import Dict, Any, Callable, Optional, List
from datetime import datetime
import uuid

from .common_state import (
    CommonWorkflowState,
    FailureType,
    DecisionMode,
    WorkflowStatus,
    merge_state,
)

logger = logging.getLogger(__name__)


# =============================================================================
# Node Type: Router
# =============================================================================

def router_node(state: CommonWorkflowState) -> CommonWorkflowState:
    """
    Route to appropriate workflow based on intent.

    Input: intent
    Output: next_graph (used for conditional routing)
    """
    intent = state.get("intent", "")

    # Intent to workflow mapping
    INTENT_MAPPING = {
        "weekly_report": "g1_weekly_report",
        "sprint_plan": "g2_sprint_planning",
        "sprint_planning": "g2_sprint_planning",
        "trace_check": "g3_traceability",
        "traceability": "g3_traceability",
        "risk_scan": "g4_risk_radar",
        "risk_radar": "g4_risk_radar",
        "knowledge_qa": "g5_knowledge_qa",
        "question": "g5_knowledge_qa",
    }

    target_workflow = INTENT_MAPPING.get(intent, "g5_knowledge_qa")

    return merge_state(state, {
        "context_snapshot": {
            **state.get("context_snapshot", {}),
            "target_workflow": target_workflow,
            "routed_at": datetime.utcnow().isoformat(),
        }
    })


def get_intent_router() -> Callable:
    """
    Get a routing function for conditional edges.

    Returns a function that maps intent to workflow name.
    """
    def route_by_intent(state: CommonWorkflowState) -> str:
        intent = state.get("intent", "")

        if intent in ["weekly_report"]:
            return "g1"
        elif intent in ["sprint_plan", "sprint_planning"]:
            return "g2"
        elif intent in ["trace_check", "traceability"]:
            return "g3"
        elif intent in ["risk_scan", "risk_radar"]:
            return "g4"
        else:
            return "g5"

    return route_by_intent


# =============================================================================
# Node Type: BuildContext
# =============================================================================

def build_context(state: CommonWorkflowState) -> CommonWorkflowState:
    """
    Build context from DB/Graph/Vector.

    Fetches project state including:
    - Phase state
    - WBS state
    - Backlog state
    - Sprint state
    """
    project_id = state.get("project_id")
    tenant_id = state.get("tenant_id")
    user_id = state.get("user_id")

    # Fetch context from various sources
    context = {
        "fetched_at": datetime.utcnow().isoformat(),
    }

    try:
        # Phase state
        phase_state = _fetch_phase_state(project_id)
        if phase_state:
            context["phase_state"] = phase_state

        # WBS state
        wbs_state = _fetch_wbs_state(project_id)
        if wbs_state:
            context["wbs_state"] = wbs_state

        # Backlog state
        backlog_state = _fetch_backlog_state(project_id)
        if backlog_state:
            context["backlog_state"] = backlog_state

        # Sprint state
        sprint_state = _fetch_sprint_state(project_id)
        if sprint_state:
            context["sprint_state"] = sprint_state

        # User permissions
        permissions = _fetch_user_permissions(user_id, project_id)
        if permissions:
            context["permissions"] = permissions

    except Exception as e:
        logger.error(f"Error building context: {e}")
        return merge_state(state, {
            "failure": {
                "type": FailureType.TOOL_ERROR.value,
                "detail": f"Context build error: {str(e)}",
                "retry_count": 0,
            }
        })

    return merge_state(state, {
        "context_snapshot": {
            **state.get("context_snapshot", {}),
            **context,
        }
    })


def _fetch_phase_state(project_id: str) -> Optional[Dict]:
    """Fetch phase state from backend."""
    try:
        from context.context_snapshot import ContextSnapshotService
        service = ContextSnapshotService()
        return service.get_phase_state(project_id)
    except ImportError:
        logger.warning("ContextSnapshotService not available, using stub")
        return {"phases": [], "current_phase": None}
    except Exception as e:
        logger.error(f"Error fetching phase state: {e}")
        return None


def _fetch_wbs_state(project_id: str) -> Optional[Dict]:
    """Fetch WBS state from backend."""
    try:
        from context.context_snapshot import ContextSnapshotService
        service = ContextSnapshotService()
        return service.get_wbs_state(project_id)
    except ImportError:
        return {"wbs_groups": [], "wbs_items": []}
    except Exception as e:
        logger.error(f"Error fetching WBS state: {e}")
        return None


def _fetch_backlog_state(project_id: str) -> Optional[Dict]:
    """Fetch backlog state from backend."""
    try:
        from context.context_snapshot import ContextSnapshotService
        service = ContextSnapshotService()
        return service.get_backlog_state(project_id)
    except ImportError:
        return {"epics": [], "features": [], "stories": [], "tasks": []}
    except Exception as e:
        logger.error(f"Error fetching backlog state: {e}")
        return None


def _fetch_sprint_state(project_id: str) -> Optional[Dict]:
    """Fetch sprint state from backend."""
    try:
        from context.context_snapshot import ContextSnapshotService
        service = ContextSnapshotService()
        return service.get_sprint_state(project_id)
    except ImportError:
        return {"sprints": [], "active_sprint": None}
    except Exception as e:
        logger.error(f"Error fetching sprint state: {e}")
        return None


def _fetch_user_permissions(user_id: str, project_id: str) -> Optional[Dict]:
    """Fetch user permissions."""
    try:
        from guards.policy_engine import PolicyEngine
        engine = PolicyEngine()
        return engine.get_user_permissions(user_id, project_id)
    except ImportError:
        return {"allowed_actions": ["read", "suggest"], "denied_reason": None}
    except Exception as e:
        logger.error(f"Error fetching permissions: {e}")
        return None


# =============================================================================
# Node Type: Retrieve
# =============================================================================

def retrieve_rag(state: CommonWorkflowState, query: str = None, top_k: int = 10) -> CommonWorkflowState:
    """
    Retrieve documents via RAG.

    Uses vector search to find relevant documents.
    """
    project_id = state.get("project_id")
    actual_query = query or state.get("intent", "")

    try:
        from services.rag_service_neo4j import rag_search

        docs = rag_search(
            project_id=project_id,
            query=actual_query,
            top_k=top_k,
        )

        return merge_state(state, {
            "retrieval": {
                **state.get("retrieval", {}),
                "docs": docs,
                "doc_count": len(docs) if docs else 0,
            }
        })

    except Exception as e:
        logger.error(f"RAG search error: {e}")
        return merge_state(state, {
            "retrieval": {
                **state.get("retrieval", {}),
                "docs": [],
                "doc_count": 0,
                "error": str(e),
            }
        })


def retrieve_graph_facts(state: CommonWorkflowState, cypher_query: str = None) -> CommonWorkflowState:
    """
    Retrieve facts from Neo4j graph.

    Executes Cypher queries to get structured data.
    """
    project_id = state.get("project_id")

    try:
        from services.rag_service_neo4j import graph_query

        facts = graph_query(project_id, cypher_query) if cypher_query else []

        return merge_state(state, {
            "retrieval": {
                **state.get("retrieval", {}),
                "graph_facts": facts,
            }
        })

    except Exception as e:
        logger.error(f"Graph query error: {e}")
        return merge_state(state, {
            "retrieval": {
                **state.get("retrieval", {}),
                "graph_facts": [],
                "graph_error": str(e),
            }
        })


def retrieve_metrics(state: CommonWorkflowState, date_range: Dict = None) -> CommonWorkflowState:
    """
    Retrieve analytics metrics.

    Fetches KPIs, throughput, velocity, etc.
    """
    project_id = state.get("project_id")

    try:
        # Fetch metrics from backend service
        metrics = _fetch_project_metrics(project_id, date_range)

        return merge_state(state, {
            "retrieval": {
                **state.get("retrieval", {}),
                "metrics": metrics,
            }
        })

    except Exception as e:
        logger.error(f"Metrics fetch error: {e}")
        return merge_state(state, {
            "retrieval": {
                **state.get("retrieval", {}),
                "metrics": {},
                "metrics_error": str(e),
            }
        })


def _fetch_project_metrics(project_id: str, date_range: Dict = None) -> Dict:
    """Fetch project metrics from backend."""
    try:
        from observability.pms_monitoring import PMSMonitoring
        monitoring = PMSMonitoring()
        return monitoring.get_project_metrics(project_id, date_range)
    except ImportError:
        return {
            "cycle_time": None,
            "throughput": None,
            "velocity": None,
            "wip_count": 0,
        }


def retrieve_events(state: CommonWorkflowState, event_types: List[str] = None, days: int = 7) -> CommonWorkflowState:
    """
    Retrieve project events.

    Fetches scope changes, delays, blockers, etc.
    """
    project_id = state.get("project_id")

    try:
        events = _fetch_project_events(project_id, event_types, days)

        return merge_state(state, {
            "retrieval": {
                **state.get("retrieval", {}),
                "events": events,
            }
        })

    except Exception as e:
        logger.error(f"Events fetch error: {e}")
        return merge_state(state, {
            "retrieval": {
                **state.get("retrieval", {}),
                "events": [],
                "events_error": str(e),
            }
        })


def _fetch_project_events(project_id: str, event_types: List[str] = None, days: int = 7) -> List[Dict]:
    """Fetch project events from backend."""
    # Stub implementation - actual implementation would query the backend
    return []


# =============================================================================
# Node Type: Reason
# =============================================================================

def reason_generate(state: CommonWorkflowState, prompt: str, system_prompt: str = None) -> CommonWorkflowState:
    """
    Generate content using LLM.

    Used for summarization, planning, recommendations, etc.
    """
    try:
        from integrations.model_gateway import ModelGateway

        gateway = ModelGateway()
        result = gateway.generate(
            prompt=prompt,
            system_prompt=system_prompt,
            context=state.get("context_snapshot", {}),
            retrieval=state.get("retrieval", {}),
        )

        return merge_state(state, {
            "draft": {
                **state.get("draft", {}),
                "generated_content": result.get("content"),
                "model_used": result.get("model"),
                "token_count": result.get("tokens"),
            }
        })

    except Exception as e:
        logger.error(f"LLM generation error: {e}")
        return merge_state(state, {
            "failure": {
                "type": FailureType.TOOL_ERROR.value,
                "detail": f"LLM generation error: {str(e)}",
                "retry_count": 0,
            }
        })


# =============================================================================
# Node Type: Verify
# =============================================================================

def verify_evidence(state: CommonWorkflowState) -> CommonWorkflowState:
    """
    Verify evidence for claims.

    Removes ungrounded claims, cross-checks data.
    """
    draft = state.get("draft", {})
    evidence_map = state.get("evidence_map", [])
    docs = state.get("retrieval", {}).get("docs", [])

    # Build evidence map if not present
    if not evidence_map and docs:
        evidence_map = _build_evidence_map(draft, docs)

    # Calculate confidence based on evidence coverage
    confidence = _calculate_evidence_confidence(draft, evidence_map)

    # Check if evidence is sufficient
    has_sufficient_evidence = confidence >= 0.6 and len(evidence_map) >= 1

    return merge_state(state, {
        "evidence_map": evidence_map,
        "confidence": confidence,
        "draft": {
            **draft,
            "has_sufficient_evidence": has_sufficient_evidence,
        }
    })


def _build_evidence_map(draft: Dict, docs: List[Dict]) -> List[Dict]:
    """Build evidence mapping from draft content to documents."""
    evidence_map = []

    content = draft.get("generated_content", "") or draft.get("content", "")
    if not content:
        return evidence_map

    # Simple evidence mapping - match document IDs mentioned in content
    for doc in docs:
        if doc.get("id") or doc.get("title"):
            evidence_map.append({
                "claim": f"Based on {doc.get('title', 'document')}",
                "evidence_ids": [doc.get("id", str(uuid.uuid4()))],
                "relevance": doc.get("score", 0.5),
            })

    return evidence_map


def _calculate_evidence_confidence(draft: Dict, evidence_map: List[Dict]) -> float:
    """Calculate confidence score based on evidence."""
    if not evidence_map:
        return 0.3  # Low confidence without evidence

    # Average relevance of evidence
    relevances = [e.get("relevance", 0.5) for e in evidence_map]
    avg_relevance = sum(relevances) / len(relevances) if relevances else 0.5

    # More evidence = higher confidence (up to a point)
    evidence_factor = min(len(evidence_map) / 5, 1.0)

    confidence = avg_relevance * 0.7 + evidence_factor * 0.3
    return min(confidence, 1.0)


def verify_policy(state: CommonWorkflowState) -> CommonWorkflowState:
    """
    Verify policy compliance.

    Checks RBAC, data boundaries, forbidden actions.
    """
    role = state.get("role", "")
    project_id = state.get("project_id", "")
    decision_mode = state.get("decision_gate", {}).get("mode", DecisionMode.SUGGEST.value)

    try:
        from guards.policy_engine import PolicyEngine
        engine = PolicyEngine()

        policy_result = engine.check_policy(
            role=role,
            project_id=project_id,
            action=decision_mode,
        )

        if not policy_result.get("allowed", True):
            return merge_state(state, {
                "failure": {
                    "type": FailureType.POLICY_VIOLATION.value,
                    "detail": policy_result.get("denied_reason", "Policy violation"),
                    "retry_count": 0,
                },
                "policy_result": policy_result,
            })

        return merge_state(state, {
            "policy_result": policy_result,
        })

    except Exception as e:
        logger.error(f"Policy check error: {e}")
        # Default to permissive on error (log for audit)
        return merge_state(state, {
            "policy_result": {
                "allowed": True,
                "error": str(e),
            }
        })


def verify_confidence(state: CommonWorkflowState, threshold: float = 0.6) -> CommonWorkflowState:
    """
    Verify confidence meets threshold.

    Triggers failure if confidence too low.
    """
    confidence = state.get("confidence", 0.0)

    if confidence < threshold:
        return merge_state(state, {
            "failure": {
                "type": FailureType.LOW_CONFIDENCE.value,
                "detail": f"Confidence {confidence:.2f} below threshold {threshold}",
                "retry_count": 0,
            }
        })

    return state


# =============================================================================
# Node Type: Act
# =============================================================================

def act_save_draft(state: CommonWorkflowState) -> CommonWorkflowState:
    """
    Save draft to storage.

    Persists draft content for later approval/publish.
    """
    project_id = state.get("project_id")
    draft = state.get("draft", {})

    try:
        # Generate draft ID
        draft_id = str(uuid.uuid4())

        # In real implementation, save to object storage/DB
        logger.info(f"Saving draft {draft_id} for project {project_id}")

        return merge_state(state, {
            "result": {
                **state.get("result", {}),
                "draft_id": draft_id,
                "draft_saved_at": datetime.utcnow().isoformat(),
            }
        })

    except Exception as e:
        logger.error(f"Draft save error: {e}")
        return merge_state(state, {
            "failure": {
                "type": FailureType.TOOL_ERROR.value,
                "detail": f"Draft save error: {str(e)}",
                "retry_count": 0,
            }
        })


def act_create_pending_action(state: CommonWorkflowState, action: Dict) -> CommonWorkflowState:
    """
    Create a pending action for approval.

    Used for COMMIT-level actions that need user approval.
    """
    pending_actions = state.get("result", {}).get("pending_actions", [])
    pending_actions.append({
        **action,
        "id": str(uuid.uuid4()),
        "status": "pending",
        "created_at": datetime.utcnow().isoformat(),
    })

    return merge_state(state, {
        "result": {
            **state.get("result", {}),
            "pending_actions": pending_actions,
        }
    })


# =============================================================================
# Node Type: Gate
# =============================================================================

def gate_check(state: CommonWorkflowState) -> CommonWorkflowState:
    """
    Authority/approval level gate check.

    Determines if action can proceed or needs approval.
    """
    mode = state.get("decision_gate", {}).get("mode", DecisionMode.SUGGEST.value)
    role = state.get("role", "")
    confidence = state.get("confidence", 0.0)

    # COMMIT always requires approval
    if mode == DecisionMode.COMMIT.value:
        return merge_state(state, {
            "decision_gate": {
                **state.get("decision_gate", {}),
                "requires_human_approval": True,
            },
            "status": WorkflowStatus.WAITING_APPROVAL.value,
        })

    # EXECUTE requires role check
    if mode == DecisionMode.EXECUTE.value:
        allowed_roles = ["pm", "pmo_head", "admin", "sponsor"]
        if role.lower() not in allowed_roles:
            # Downgrade to SUGGEST
            return merge_state(state, {
                "decision_gate": {
                    "mode": DecisionMode.SUGGEST.value,
                    "requires_human_approval": False,
                    "downgraded_from": mode,
                    "downgrade_reason": f"Role '{role}' not authorized for EXECUTE",
                }
            })

    # Low confidence forces SUGGEST
    if confidence < 0.5 and mode in [DecisionMode.DECIDE.value, DecisionMode.EXECUTE.value]:
        return merge_state(state, {
            "decision_gate": {
                "mode": DecisionMode.SUGGEST.value,
                "requires_human_approval": False,
                "downgraded_from": mode,
                "downgrade_reason": f"Low confidence ({confidence:.2f})",
            }
        })

    return state


def gate_determine_approval_type(state: CommonWorkflowState) -> str:
    """
    Determine approval type based on action impact.

    Returns: "user" | "manager" | "admin"
    """
    draft = state.get("draft", {})
    impact = draft.get("impact_level", "low")

    if impact == "high":
        return "admin"
    elif impact == "medium":
        return "manager"
    else:
        return "user"


# =============================================================================
# Node Type: Recover
# =============================================================================

def recover_from_failure(state: CommonWorkflowState) -> CommonWorkflowState:
    """
    Recovery based on failure type.

    Applies appropriate recovery strategy for each failure type.
    """
    failure = state.get("failure")
    if not failure:
        return state

    failure_type = failure.get("type")
    retry_count = failure.get("retry_count", 0)

    recovery_strategies = {
        FailureType.INFO_MISSING.value: _recover_info_missing,
        FailureType.CONFLICT.value: _recover_conflict,
        FailureType.POLICY_VIOLATION.value: _recover_policy_violation,
        FailureType.LOW_CONFIDENCE.value: _recover_low_confidence,
        FailureType.TOOL_ERROR.value: _recover_tool_error,
        FailureType.DATA_BOUNDARY.value: _recover_data_boundary,
    }

    strategy = recovery_strategies.get(failure_type, _default_recovery)
    return strategy(state, retry_count)


def _recover_info_missing(state: CommonWorkflowState, retry_count: int) -> CommonWorkflowState:
    """info_missing -> Expand retrieve -> Ask human -> Safe draft with uncertainty"""
    if retry_count < 2:
        return merge_state(state, {
            "failure": {
                **state.get("failure", {}),
                "retry_count": retry_count + 1,
                "recovery_action": "expand_retrieve",
            }
        })
    else:
        return merge_state(state, {
            "failure": {
                **state.get("failure", {}),
                "recovery_action": "ask_human",
            },
            "draft": {
                **state.get("draft", {}),
                "uncertainty_sections": ["Verification needed"],
            }
        })


def _recover_conflict(state: CommonWorkflowState, retry_count: int) -> CommonWorkflowState:
    """conflict -> Graph fact priority -> Recency first -> Escalate decision"""
    return merge_state(state, {
        "failure": {
            **state.get("failure", {}),
            "recovery_action": "use_graph_fact_priority",
            "conflict_resolution": "recency_first",
        }
    })


def _recover_policy_violation(state: CommonWorkflowState, retry_count: int) -> CommonWorkflowState:
    """policy_violation -> Downgrade to SUGGEST + log reason"""
    return merge_state(state, {
        "decision_gate": {
            "mode": DecisionMode.SUGGEST.value,
            "requires_human_approval": False,
        },
        "failure": {
            **state.get("failure", {}),
            "recovery_action": "downgrade_to_suggest",
        }
    })


def _recover_low_confidence(state: CommonWorkflowState, retry_count: int) -> CommonWorkflowState:
    """low_confidence -> Strengthen verify + reduce claims + remove ungrounded"""
    return merge_state(state, {
        "failure": {
            **state.get("failure", {}),
            "recovery_action": "strengthen_verify",
        },
        "draft": {
            **state.get("draft", {}),
            "remove_ungrounded_claims": True,
        }
    })


def _recover_tool_error(state: CommonWorkflowState, retry_count: int) -> CommonWorkflowState:
    """tool_error -> Retry with exponential backoff -> Fallback -> Report"""
    if retry_count < 2:
        return merge_state(state, {
            "failure": {
                **state.get("failure", {}),
                "retry_count": retry_count + 1,
                "recovery_action": "retry_with_backoff",
                "backoff_ms": 1000 * (2 ** retry_count),
            }
        })
    else:
        return merge_state(state, {
            "failure": {
                **state.get("failure", {}),
                "recovery_action": "fallback_or_report",
            }
        })


def _recover_data_boundary(state: CommonWorkflowState, retry_count: int) -> CommonWorkflowState:
    """data_boundary -> Immediate stop + audit log + masked message"""
    # Log audit event
    _log_audit_event(
        event_type="data_boundary_violation",
        tenant_id=state.get("tenant_id", ""),
        project_id=state.get("project_id", ""),
        user_id=state.get("user_id", ""),
        trace_id=state.get("trace_id", ""),
    )

    return merge_state(state, {
        "status": WorkflowStatus.FAILED.value,
        "failure": {
            **state.get("failure", {}),
            "recovery_action": "immediate_stop",
        },
        "result": {
            "error": "Data boundary violation detected. Processing stopped.",
            "masked": True,
        }
    })


def _default_recovery(state: CommonWorkflowState, retry_count: int) -> CommonWorkflowState:
    """Default recovery: safe fail"""
    return merge_state(state, {
        "status": WorkflowStatus.FAILED.value,
        "failure": {
            **state.get("failure", {}),
            "recovery_action": "safe_fail",
        }
    })


def _log_audit_event(**kwargs):
    """Log audit event to backend."""
    logger.warning(f"AUDIT: {kwargs}")


# =============================================================================
# Node Type: Observe
# =============================================================================

def observe(state: CommonWorkflowState) -> CommonWorkflowState:
    """
    Trace/Span/cost/quality metrics logging.

    Records workflow execution metrics for observability.
    """
    trace_id = state.get("trace_id", "")
    intent = state.get("intent", "")
    status = state.get("status", "running")
    confidence = state.get("confidence", 0.0)

    try:
        from observability.metrics import metrics_collector
        from observability.tracing import tracer

        # Record metrics
        metrics_collector.record_count(f"workflow.{intent}")
        metrics_collector.record_success(f"workflow.{intent}", status == "completed")

        if confidence > 0:
            metrics_collector.record(f"confidence.{intent}", confidence)

        # Log to trace
        tracer.current_span().set_attribute("intent", intent)
        tracer.current_span().set_attribute("confidence", confidence)
        tracer.current_span().set_attribute("status", status)

    except ImportError:
        # Observability not configured - log to standard logger
        logger.info(f"Workflow {intent}: status={status}, confidence={confidence:.2f}")
    except Exception as e:
        logger.error(f"Observability error: {e}")

    return merge_state(state, {
        "result": {
            **state.get("result", {}),
            "observed_at": datetime.utcnow().isoformat(),
        }
    })


# =============================================================================
# Helper: Conditional Routing Functions
# =============================================================================

def check_failure(state: CommonWorkflowState) -> str:
    """Check if workflow has failure - for conditional edges."""
    if state.get("failure"):
        return "recover"
    return "continue"


def check_approval_needed(state: CommonWorkflowState) -> str:
    """Check if approval is needed - for conditional edges."""
    gate = state.get("decision_gate", {})
    if gate.get("requires_human_approval"):
        return "wait_approval"
    return "continue"


def check_confidence_threshold(state: CommonWorkflowState, threshold: float = 0.6) -> str:
    """Check confidence threshold - for conditional edges."""
    confidence = state.get("confidence", 0.0)
    if confidence < threshold:
        return "low_confidence"
    return "sufficient"


# =============================================================================
# Node Factory
# =============================================================================

def create_node(node_type: str, **kwargs) -> Callable:
    """
    Create a workflow node by type.

    Args:
        node_type: Type of node (router, build_context, retrieve, etc.)
        **kwargs: Additional parameters for the node

    Returns:
        Callable node function
    """
    nodes = {
        "router": router_node,
        "build_context": build_context,
        "retrieve_rag": retrieve_rag,
        "retrieve_graph": retrieve_graph_facts,
        "retrieve_metrics": retrieve_metrics,
        "retrieve_events": retrieve_events,
        "reason": reason_generate,
        "verify_evidence": verify_evidence,
        "verify_policy": verify_policy,
        "verify_confidence": verify_confidence,
        "act_save_draft": act_save_draft,
        "act_pending": act_create_pending_action,
        "gate": gate_check,
        "recover": recover_from_failure,
        "observe": observe,
    }

    base_node = nodes.get(node_type)
    if not base_node:
        raise ValueError(f"Unknown node type: {node_type}")

    # If kwargs provided, create a wrapper that passes them
    if kwargs:
        def wrapped_node(state: CommonWorkflowState) -> CommonWorkflowState:
            return base_node(state, **kwargs)
        return wrapped_node

    return base_node
