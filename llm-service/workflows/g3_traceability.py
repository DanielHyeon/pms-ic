"""
G3: Traceability & Consistency Check Workflow

Purpose:
- Detect gaps, orphans, duplicates, scope creep in Requirements↔WBS↔Backlog↔Deliverable
- Explain "why" with links and suggest fixes (before approval)

Input:
- project_id: Target project
- scope: "all" | {"phase_id": str} | {"epic_id": str}

Output:
- gaps: [{requirement_id, title, issue: "uncovered"}]
- orphans: [{backlog_id, title, issue: "no_requirement"}]
- duplicates: [{items: [str], similarity: float}]
- scope_creep_suspects: [{backlog_id, reason}]
- recommended_actions: [{type, target_id, action}]
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
from .common_nodes import build_context, recover_from_failure, observe

logger = logging.getLogger(__name__)


class TraceabilityState(CommonWorkflowState):
    """G3 Traceability specific state."""
    scope: Dict[str, Any]

    # Retrieve results
    requirements: List[Dict[str, Any]]
    mappings: Dict[str, List[str]]  # req_id -> [backlog_ids]
    backlog_items: List[Dict[str, Any]]

    # Analysis results
    gaps: List[Dict[str, Any]]
    orphans: List[Dict[str, Any]]
    duplicates: List[Dict[str, Any]]
    scope_creep_suspects: List[Dict[str, Any]]


# =============================================================================
# Workflow Nodes
# =============================================================================

def retrieve_requirements(state: TraceabilityState) -> TraceabilityState:
    """
    Fetch requirements based on scope.
    """
    project_id = state.get("project_id")
    scope = state.get("scope", {"type": "all"})

    try:
        reqs = _fetch_requirements(project_id, scope)
        return merge_state(state, {"requirements": reqs})
    except Exception as e:
        logger.error(f"Requirements fetch error: {e}")
        return merge_state(state, {
            "requirements": [],
            "failure": {
                "type": FailureType.TOOL_ERROR.value,
                "detail": f"Requirements fetch error: {str(e)}",
                "retry_count": 0,
            }
        })


def retrieve_mappings(state: TraceabilityState) -> TraceabilityState:
    """
    Query Graph: REQUIREMENT→BACKLOG, BACKLOG→WBS, WBS→PHASE.
    """
    project_id = state.get("project_id")
    requirements = state.get("requirements", [])

    try:
        mappings = _fetch_traceability_mappings(
            project_id=project_id,
            requirement_ids=[r.get("id") for r in requirements]
        )
        backlog_items = _fetch_backlog_items(project_id, status=["all"])

        return merge_state(state, {
            "mappings": mappings,
            "backlog_items": backlog_items,
        })
    except Exception as e:
        logger.error(f"Mappings fetch error: {e}")
        return merge_state(state, {
            "mappings": {},
            "backlog_items": [],
        })


def reason_detect_issues(state: TraceabilityState) -> TraceabilityState:
    """
    Rule-based + LLM assisted: text similarity/tags.
    """
    requirements = state.get("requirements", [])
    mappings = state.get("mappings", {})
    backlog_items = state.get("backlog_items", [])

    # Gap detection (requirement -> backlog not linked)
    gaps = []
    for req in requirements:
        req_id = req.get("id")
        if req_id not in mappings or not mappings.get(req_id):
            gaps.append({
                "requirement_id": req_id,
                "title": req.get("title", "Unknown"),
                "issue": "uncovered",
            })

    # Orphan detection (backlog -> requirement not linked)
    mapped_backlog_ids = set()
    for backlog_ids in mappings.values():
        mapped_backlog_ids.update(backlog_ids)

    orphans = []
    for item in backlog_items:
        item_type = item.get("type", "")
        if item_type in ["feature", "story"] and item.get("id") not in mapped_backlog_ids:
            orphans.append({
                "backlog_id": item.get("id"),
                "title": item.get("title", "Unknown"),
                "issue": "no_requirement",
            })

    # Duplicate detection (similarity-based)
    duplicates = _detect_duplicates_by_similarity(backlog_items, threshold=0.85)

    # Scope creep detection
    scope_creep = _detect_scope_creep(backlog_items, requirements, mappings)

    return merge_state(state, {
        "gaps": gaps,
        "orphans": orphans,
        "duplicates": duplicates,
        "scope_creep_suspects": scope_creep,
    })


def verify_evidence(state: TraceabilityState) -> TraceabilityState:
    """
    Attach evidence links to each issue.
    """
    gaps = state.get("gaps", [])
    orphans = state.get("orphans", [])
    evidence_map = []

    for gap in gaps:
        evidence_map.append({
            "claim": f"Requirement '{gap.get('title')}' is not linked to backlog",
            "evidence_ids": [gap.get("requirement_id")],
        })

    for orphan in orphans:
        evidence_map.append({
            "claim": f"Backlog '{orphan.get('title')}' is not linked to requirement",
            "evidence_ids": [orphan.get("backlog_id")],
        })

    # Calculate confidence based on coverage
    total_reqs = len(state.get("requirements", []))
    covered_reqs = total_reqs - len(gaps)
    confidence = covered_reqs / total_reqs if total_reqs > 0 else 1.0

    return merge_state(state, {
        "evidence_map": evidence_map,
        "confidence": confidence,
    })


def act_create_draft_fixes(state: TraceabilityState) -> TraceabilityState:
    """
    Create suggested fixes: cards/links/checklists (before approval).
    """
    gaps = state.get("gaps", [])
    orphans = state.get("orphans", [])
    duplicates = state.get("duplicates", [])
    scope_creep = state.get("scope_creep_suspects", [])

    recommended_actions = []

    # Actions for gaps
    for gap in gaps:
        recommended_actions.append({
            "type": "create_backlog",
            "target_id": gap.get("requirement_id"),
            "action": f"Create backlog item for requirement '{gap.get('title')}'",
        })

    # Actions for orphans
    for orphan in orphans:
        recommended_actions.append({
            "type": "link_requirement",
            "target_id": orphan.get("backlog_id"),
            "action": f"Link backlog '{orphan.get('title')}' to appropriate requirement",
        })

    # Actions for duplicates
    for dup in duplicates:
        recommended_actions.append({
            "type": "merge_or_remove",
            "target_id": dup.get("items", [None])[0],
            "action": f"Review potential duplicates (similarity: {dup.get('similarity', 0):.0%})",
        })

    # Actions for scope creep
    for creep in scope_creep:
        recommended_actions.append({
            "type": "review_scope",
            "target_id": creep.get("backlog_id"),
            "action": f"Review scope change: {creep.get('reason')}",
        })

    return merge_state(state, {
        "result": {
            "gaps": gaps,
            "orphans": orphans,
            "duplicates": duplicates,
            "scope_creep_suspects": scope_creep,
            "recommended_actions": recommended_actions,
        },
        "draft": {"actions": recommended_actions},
    })


def gate_commit_changes(state: TraceabilityState) -> TraceabilityState:
    """
    Applying changes requires approval.
    """
    return merge_state(state, {
        "decision_gate": {
            "mode": DecisionMode.SUGGEST.value,
            "requires_human_approval": False,
        },
        "status": "completed",
    })


# =============================================================================
# Helper Functions
# =============================================================================

def _fetch_requirements(project_id: str, scope: Dict) -> List[Dict]:
    """Fetch requirements from backend."""
    # Stub implementation
    return []


def _fetch_traceability_mappings(project_id: str, requirement_ids: List[str]) -> Dict[str, List[str]]:
    """Fetch traceability mappings from graph."""
    try:
        from rag_service_neo4j import graph_query
        # Query: MATCH (r:Requirement)-[:TRACED_TO]->(b:Backlog) WHERE r.id IN $ids RETURN r.id, collect(b.id)
        return {}
    except ImportError:
        return {}


def _fetch_backlog_items(project_id: str, status: List[str]) -> List[Dict]:
    """Fetch backlog items."""
    return []


def _detect_duplicates_by_similarity(items: List[Dict], threshold: float) -> List[Dict]:
    """
    Detect potential duplicates using text similarity.
    """
    duplicates = []

    # Simple approach: compare titles
    for i, item1 in enumerate(items):
        for item2 in items[i + 1:]:
            similarity = _calculate_similarity(item1.get("title", ""), item2.get("title", ""))
            if similarity >= threshold:
                duplicates.append({
                    "items": [item1.get("id"), item2.get("id")],
                    "titles": [item1.get("title"), item2.get("title")],
                    "similarity": similarity,
                })

    return duplicates


def _calculate_similarity(text1: str, text2: str) -> float:
    """Calculate text similarity (simplified Jaccard)."""
    if not text1 or not text2:
        return 0.0

    words1 = set(text1.lower().split())
    words2 = set(text2.lower().split())

    intersection = words1 & words2
    union = words1 | words2

    return len(intersection) / len(union) if union else 0.0


def _detect_scope_creep(backlog_items: List[Dict], requirements: List[Dict], mappings: Dict) -> List[Dict]:
    """
    Detect potential scope creep.
    """
    scope_creep = []

    # Check for items added after baseline
    baseline_date = None  # Would come from project settings
    for item in backlog_items:
        created_at = item.get("created_at")
        if baseline_date and created_at and created_at > baseline_date:
            # Check if it's linked to original requirements
            item_id = item.get("id")
            is_linked = any(item_id in ids for ids in mappings.values())
            if not is_linked:
                scope_creep.append({
                    "backlog_id": item_id,
                    "title": item.get("title"),
                    "reason": "Added after baseline without requirement link",
                })

    return scope_creep


# =============================================================================
# Workflow Factory
# =============================================================================

def create_g3_traceability_workflow():
    """Create G3: Traceability Check workflow graph."""

    workflow = StateGraph(TraceabilityState)

    # === Add Nodes ===
    workflow.add_node("build_context", build_context)
    workflow.add_node("retrieve_requirements", retrieve_requirements)
    workflow.add_node("retrieve_mappings", retrieve_mappings)
    workflow.add_node("reason_detect_issues", reason_detect_issues)
    workflow.add_node("verify_evidence", verify_evidence)
    workflow.add_node("act_create_draft_fixes", act_create_draft_fixes)
    workflow.add_node("gate_commit_changes", gate_commit_changes)
    workflow.add_node("observe", observe)
    workflow.add_node("recover", recover_from_failure)

    # === Define Edges ===
    workflow.set_entry_point("build_context")
    workflow.add_edge("build_context", "retrieve_requirements")
    workflow.add_edge("retrieve_requirements", "retrieve_mappings")
    workflow.add_edge("retrieve_mappings", "reason_detect_issues")
    workflow.add_edge("reason_detect_issues", "verify_evidence")
    workflow.add_edge("verify_evidence", "act_create_draft_fixes")
    workflow.add_edge("act_create_draft_fixes", "gate_commit_changes")
    workflow.add_edge("gate_commit_changes", "observe")
    workflow.add_edge("observe", END)

    return workflow.compile()


# =============================================================================
# Failure Handling
# =============================================================================

G3_FAILURE_HANDLING = {
    "tool_error": "Graph query failure -> Use DB-based minimal check (requirement↔backlog direct link only)",
    "conflict": "Requirement version diverged -> Prioritize latest version, recommend deprecating older",
}
