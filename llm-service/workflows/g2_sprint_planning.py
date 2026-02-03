"""
G2: Sprint Scope Recommendation Workflow

Purpose:
- Recommend backlog items for sprint based on capacity, priority, dependencies
- Default to SUGGEST, COMMIT (finalize) requires approval

Input:
- project_id: Target project
- sprint_id: Existing sprint or None for new
- team_capacity: Points available
- constraints: {vacation_days, bottleneck_skills, must_include}
- priority_policy: "WSJF" | "High-first" | "Deadline-first"

Output:
- sprint_candidate_items: [{id, title, points, rationale, risk, dependencies}]
- capacity_usage: float (0~1)
- risk_notes: [str]
- excluded_items_with_reason: [{id, reason}]
"""

from typing import TypedDict, List, Dict, Any, Optional
from datetime import datetime
import logging

try:
    from langgraph.graph import StateGraph, END
except ImportError:
    class StateGraph:
        def __init__(self, state_type):
            self.nodes = {}
            self.edges = []
            self.entry = None

        def add_node(self, name, fn):
            self.nodes[name] = fn

        def add_edge(self, src, dst):
            self.edges.append((src, dst))

        def add_conditional_edges(self, src, fn, mapping):
            pass

        def set_entry_point(self, name):
            self.entry = name

        def compile(self):
            return self

    END = "END"

from .common_state import CommonWorkflowState, DecisionMode, FailureType, merge_state
from .common_nodes import build_context, gate_check, recover_from_failure, observe

logger = logging.getLogger(__name__)


class SprintPlanningState(CommonWorkflowState):
    """G2 Sprint Planning specific state."""
    sprint_id: Optional[str]
    team_capacity: int
    constraints: Dict[str, Any]
    priority_policy: str

    # Retrieve results
    backlog_items: List[Dict[str, Any]]
    dependencies: List[Dict[str, Any]]

    # Optimization results
    candidate_items: List[Dict[str, Any]]
    excluded_items: List[Dict[str, Any]]
    capacity_usage: float

    # Request commit flag
    request_commit: bool


# =============================================================================
# Workflow Nodes
# =============================================================================

def retrieve_backlog(state: SprintPlanningState) -> SprintPlanningState:
    """
    Query backlog with priority/estimates/status.
    """
    project_id = state.get("project_id")

    try:
        items = _fetch_backlog_items(
            project_id=project_id,
            status=["ready", "refined"],
            include_estimates=True
        )
        return merge_state(state, {"backlog_items": items})
    except Exception as e:
        logger.error(f"Backlog fetch error: {e}")
        return merge_state(state, {
            "backlog_items": [],
            "failure": {
                "type": FailureType.TOOL_ERROR.value,
                "detail": f"Backlog fetch error: {str(e)}",
                "retry_count": 0,
            }
        })


def retrieve_dependencies(state: SprintPlanningState) -> SprintPlanningState:
    """
    Query Graph: backlog↔wbs↔phase dependencies.
    """
    project_id = state.get("project_id")
    backlog_items = state.get("backlog_items", [])

    try:
        deps = _fetch_dependencies_from_graph(
            project_id=project_id,
            item_ids=[item.get("id") for item in backlog_items]
        )
        return merge_state(state, {"dependencies": deps})
    except Exception as e:
        logger.error(f"Dependencies fetch error: {e}")
        return merge_state(state, {"dependencies": []})


def reason_optimize_scope(state: SprintPlanningState) -> SprintPlanningState:
    """
    Heuristic/optimization: maximize value, minimize risk, satisfy dependencies.
    """
    backlog = state.get("backlog_items", [])
    dependencies = state.get("dependencies", [])
    capacity = state.get("team_capacity", 0)
    constraints = state.get("constraints", {})
    policy = state.get("priority_policy", "High-first")

    try:
        result = _optimize_sprint_scope(
            backlog=backlog,
            dependencies=dependencies,
            capacity=capacity,
            constraints=constraints,
            policy=policy
        )

        return merge_state(state, {
            "candidate_items": result["included"],
            "excluded_items": result["excluded"],
            "capacity_usage": result["utilization"],
            "draft": result,
        })
    except Exception as e:
        logger.error(f"Scope optimization error: {e}")
        return merge_state(state, {
            "failure": {
                "type": FailureType.TOOL_ERROR.value,
                "detail": f"Optimization error: {str(e)}",
                "retry_count": 0,
            }
        })


def verify_constraints(state: SprintPlanningState) -> SprintPlanningState:
    """
    Check capacity overflow / dependency conflict / blocked items.
    """
    candidate_items = state.get("candidate_items", [])
    dependencies = state.get("dependencies", [])
    capacity_usage = state.get("capacity_usage", 0.0)

    issues = []

    # Capacity check
    if capacity_usage > 1.0:
        issues.append({
            "type": "capacity_exceeded",
            "detail": f"Capacity exceeded: {capacity_usage:.0%}",
        })

    # Dependency conflict check
    conflicts = _check_dependency_conflicts(candidate_items, dependencies)
    if conflicts:
        issues.append({
            "type": "dependency_conflict",
            "detail": f"{len(conflicts)} dependency conflicts",
            "conflicts": conflicts,
        })

    # Blocked items check
    blocked = [item for item in candidate_items if item.get("status") == "blocked"]
    if blocked:
        issues.append({
            "type": "blocked_included",
            "detail": f"{len(blocked)} blocked items included",
            "items": [b.get("id") for b in blocked],
        })

    if issues:
        return merge_state(state, {
            "failure": {
                "type": FailureType.CONFLICT.value,
                "detail": issues,
                "retry_count": 0,
            }
        })

    return state


def verify_policy(state: SprintPlanningState) -> SprintPlanningState:
    """
    Check sprint create/modify permission.
    """
    role = state.get("role", "")
    sprint_id = state.get("sprint_id")

    if not _check_sprint_permission(role, sprint_id):
        return merge_state(state, {
            "failure": {
                "type": FailureType.POLICY_VIOLATION.value,
                "detail": "No permission to create/modify sprint",
                "retry_count": 0,
            }
        })

    return state


def act_create_draft(state: SprintPlanningState) -> SprintPlanningState:
    """
    Create draft sprint (status: DRAFT, before approval).
    """
    project_id = state.get("project_id")
    sprint_id = state.get("sprint_id")
    candidate_items = state.get("candidate_items", [])
    capacity_usage = state.get("capacity_usage", 0.0)

    try:
        draft_sprint = _create_draft_sprint(
            project_id=project_id,
            sprint_id=sprint_id,
            items=candidate_items,
            capacity_usage=capacity_usage,
        )

        return merge_state(state, {
            "result": {
                "draft_sprint_id": draft_sprint["id"],
                "candidate_items": candidate_items,
                "excluded_items": state.get("excluded_items", []),
                "capacity_usage": capacity_usage,
            },
            "decision_gate": {
                "mode": DecisionMode.SUGGEST.value,
                "requires_human_approval": False,
            },
        })
    except Exception as e:
        logger.error(f"Draft sprint creation error: {e}")
        return merge_state(state, {
            "failure": {
                "type": FailureType.TOOL_ERROR.value,
                "detail": f"Draft creation error: {str(e)}",
                "retry_count": 0,
            }
        })


def gate_commit_sprint(state: SprintPlanningState) -> SprintPlanningState:
    """
    Finalize sprint only on approval (COMMIT).
    """
    request_commit = state.get("request_commit", False)

    if request_commit:
        return merge_state(state, {
            "decision_gate": {
                "mode": DecisionMode.COMMIT.value,
                "requires_human_approval": True,
            },
            "status": "waiting_approval",
        })

    return merge_state(state, {"status": "completed"})


# =============================================================================
# Helper Functions
# =============================================================================

def _fetch_backlog_items(project_id: str, status: List[str], include_estimates: bool) -> List[Dict]:
    """Fetch backlog items from backend."""
    # Stub implementation
    return []


def _fetch_dependencies_from_graph(project_id: str, item_ids: List[str]) -> List[Dict]:
    """Fetch dependencies from Neo4j."""
    try:
        from services.rag_service_neo4j import graph_query
        # Query dependencies
        return []
    except ImportError:
        return []


def _optimize_sprint_scope(
    backlog: List[Dict],
    dependencies: List[Dict],
    capacity: int,
    constraints: Dict,
    policy: str
) -> Dict:
    """
    Optimize sprint scope using greedy/knapsack approach.
    """
    # Sort by priority policy
    if policy == "WSJF":
        sorted_items = sorted(backlog, key=lambda x: _calculate_wsjf(x), reverse=True)
    elif policy == "Deadline-first":
        sorted_items = sorted(backlog, key=lambda x: x.get("due_date", "9999-12-31"))
    else:  # High-first
        priority_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        sorted_items = sorted(backlog, key=lambda x: priority_order.get(x.get("priority", "medium"), 2))

    # Must-include items
    must_include_ids = set(constraints.get("must_include", []))

    # Greedy selection
    included = []
    excluded = []
    total_points = 0

    # First, add must-include items
    for item in sorted_items:
        if item.get("id") in must_include_ids:
            points = item.get("points", 0) or item.get("estimate", 0)
            included.append({
                **item,
                "rationale": "Must include (constraint)",
                "risk": "low",
            })
            total_points += points

    # Then fill remaining capacity
    for item in sorted_items:
        if item.get("id") in must_include_ids:
            continue

        points = item.get("points", 0) or item.get("estimate", 0)

        if total_points + points <= capacity:
            included.append({
                **item,
                "rationale": f"High priority ({policy})",
                "risk": _assess_item_risk(item),
            })
            total_points += points
        else:
            excluded.append({
                "id": item.get("id"),
                "title": item.get("title"),
                "reason": "Capacity exceeded",
            })

    utilization = total_points / capacity if capacity > 0 else 0.0

    return {
        "included": included,
        "excluded": excluded,
        "utilization": utilization,
        "total_points": total_points,
    }


def _calculate_wsjf(item: Dict) -> float:
    """Calculate Weighted Shortest Job First score."""
    business_value = item.get("business_value", 5)
    time_criticality = item.get("time_criticality", 5)
    risk_opportunity = item.get("risk_opportunity", 5)
    job_size = item.get("points", 1) or 1

    cost_of_delay = business_value + time_criticality + risk_opportunity
    return cost_of_delay / job_size


def _assess_item_risk(item: Dict) -> str:
    """Assess risk level of backlog item."""
    if item.get("has_blockers"):
        return "high"
    if item.get("dependencies", []):
        return "medium"
    return "low"


def _check_dependency_conflicts(items: List[Dict], dependencies: List[Dict]) -> List[Dict]:
    """Check for dependency conflicts in selected items."""
    conflicts = []
    selected_ids = {item.get("id") for item in items}

    for dep in dependencies:
        if dep.get("dependent_id") in selected_ids and dep.get("dependency_id") not in selected_ids:
            conflicts.append({
                "item": dep.get("dependent_id"),
                "missing_dependency": dep.get("dependency_id"),
            })

    return conflicts


def _check_sprint_permission(role: str, sprint_id: Optional[str]) -> bool:
    """Check if role has permission for sprint operations."""
    allowed_roles = ["pm", "pmo_head", "admin", "scrum_master"]
    return role.lower() in allowed_roles


def _create_draft_sprint(project_id: str, sprint_id: Optional[str], items: List[Dict], capacity_usage: float) -> Dict:
    """Create draft sprint."""
    import uuid

    return {
        "id": sprint_id or str(uuid.uuid4()),
        "project_id": project_id,
        "status": "draft",
        "item_count": len(items),
        "capacity_usage": capacity_usage,
    }


# =============================================================================
# Workflow Factory
# =============================================================================

def create_g2_sprint_planning_workflow():
    """Create G2: Sprint Planning workflow graph."""

    workflow = StateGraph(SprintPlanningState)

    # === Add Nodes ===
    workflow.add_node("build_context", build_context)
    workflow.add_node("retrieve_backlog", retrieve_backlog)
    workflow.add_node("retrieve_dependencies", retrieve_dependencies)
    workflow.add_node("reason_optimize_scope", reason_optimize_scope)
    workflow.add_node("verify_constraints", verify_constraints)
    workflow.add_node("verify_policy", verify_policy)
    workflow.add_node("act_create_draft", act_create_draft)
    workflow.add_node("gate_commit_sprint", gate_commit_sprint)
    workflow.add_node("observe", observe)
    workflow.add_node("recover", recover_from_failure)

    # === Define Edges ===
    workflow.set_entry_point("build_context")
    workflow.add_edge("build_context", "retrieve_backlog")
    workflow.add_edge("retrieve_backlog", "retrieve_dependencies")
    workflow.add_edge("retrieve_dependencies", "reason_optimize_scope")
    workflow.add_edge("reason_optimize_scope", "verify_constraints")

    def route_after_constraints(state) -> str:
        if state.get("failure"):
            return "recover"
        return "verify_policy"

    workflow.add_conditional_edges(
        "verify_constraints",
        route_after_constraints,
        {"recover": "recover", "verify_policy": "verify_policy"}
    )

    def route_after_policy(state) -> str:
        if state.get("failure"):
            return "recover"
        return "act_create_draft"

    workflow.add_conditional_edges(
        "verify_policy",
        route_after_policy,
        {"recover": "recover", "act_create_draft": "act_create_draft"}
    )

    workflow.add_edge("act_create_draft", "gate_commit_sprint")
    workflow.add_edge("gate_commit_sprint", "observe")
    workflow.add_edge("observe", END)
    workflow.add_edge("recover", "observe")

    return workflow.compile()


# =============================================================================
# Failure Handling
# =============================================================================

G2_FAILURE_HANDLING = {
    "info_missing": "Many items without estimates -> Generate 'estimate request list'",
    "conflict": "Priority policy conflict (PO vs team rules) -> Escalate to Decision object",
    "low_confidence": "Dependency graph is weak -> Recommend conservative scope reduction",
}
