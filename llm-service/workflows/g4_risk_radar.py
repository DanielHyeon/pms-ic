"""
G4: Risk & Impact Radar Workflow

Purpose:
- Auto-detect and update risks based on events (delay/scope change/blocker/resource change)
- Maintain "Risk Register" and supply to weekly reports/dashboards

Input:
- project_id: Target project
- event_window: Days to look back (e.g., 7)
- risk_policy: {probability_threshold: float, impact_threshold: str}

Output:
- risk_items: [{id, title, probability, impact, priority, mitigation, evidence}]
- impact_map: {phases_affected, sprints_affected, kpis_affected}
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
from .common_nodes import recover_from_failure, observe

logger = logging.getLogger(__name__)


class RiskRadarState(CommonWorkflowState):
    """G4 Risk Radar specific state."""
    event_window: int
    risk_policy: Dict[str, Any]

    # Retrieve results
    events: List[Dict[str, Any]]
    topology: Dict[str, Any]

    # Analysis results
    risk_items: List[Dict[str, Any]]
    impact_map: Dict[str, Any]


# =============================================================================
# Workflow Nodes
# =============================================================================

def retrieve_events(state: RiskRadarState) -> RiskRadarState:
    """
    Fetch project events within window.
    """
    project_id = state.get("project_id")
    event_window = state.get("event_window", 7)

    try:
        events = _fetch_project_events(
            project_id=project_id,
            days=event_window,
            event_types=[
                "delay", "scope_change", "blocker_added",
                "resource_change", "estimate_change", "priority_change"
            ]
        )
        return merge_state(state, {"events": events})
    except Exception as e:
        logger.error(f"Events fetch error: {e}")
        return merge_state(state, {"events": []})


def retrieve_topology(state: RiskRadarState) -> RiskRadarState:
    """
    Fetch dependencies/assignments/milestones.
    """
    project_id = state.get("project_id")

    try:
        topology = _fetch_project_topology(project_id)
        return merge_state(state, {"topology": topology})
    except Exception as e:
        logger.error(f"Topology fetch error: {e}")
        return merge_state(state, {"topology": {}})


def reason_infer_risks(state: RiskRadarState) -> RiskRadarState:
    """
    Pattern detection: schedule slip, WIP overflow, blocker increase.
    """
    events = state.get("events", [])
    topology = state.get("topology", {})
    risk_policy = state.get("risk_policy", {})

    risks = []

    # Pattern 1: Schedule slip (multiple delays)
    delay_events = [e for e in events if e.get("type") == "delay"]
    if len(delay_events) >= 3:
        risks.append({
            "id": f"risk-delay-{state.get('project_id')}",
            "title": "Schedule Delay Trend",
            "probability": min(0.3 + len(delay_events) * 0.1, 0.9),
            "impact": "high",
            "pattern": "schedule_slip",
            "evidence": [e.get("id") for e in delay_events],
            "mitigation": "Consider scope adjustment or resource addition",
        })

    # Pattern 2: WIP overflow
    wip_count = topology.get("wip_count", 0)
    wip_limit = topology.get("wip_limit", 10)
    if wip_count > wip_limit * 1.2:
        risks.append({
            "id": f"risk-wip-{state.get('project_id')}",
            "title": "WIP Limit Exceeded",
            "probability": 0.8,
            "impact": "medium",
            "pattern": "wip_overflow",
            "evidence": [f"current_wip:{wip_count}", f"limit:{wip_limit}"],
            "mitigation": "Focus on completing in-progress work",
        })

    # Pattern 3: Blocker increase
    blocker_events = [e for e in events if e.get("type") == "blocker_added"]
    if len(blocker_events) >= 2:
        risks.append({
            "id": f"risk-blocker-{state.get('project_id')}",
            "title": "Blocker Increase",
            "probability": 0.7,
            "impact": "high",
            "pattern": "blocker_increase",
            "evidence": [e.get("id") for e in blocker_events],
            "mitigation": "Assign dedicated blocker resolution",
        })

    # Pattern 4: Resource change
    resource_events = [e for e in events if e.get("type") == "resource_change"]
    if resource_events:
        risks.append({
            "id": f"risk-resource-{state.get('project_id')}",
            "title": "Resource Change Impact",
            "probability": 0.6,
            "impact": "medium",
            "pattern": "resource_change",
            "evidence": [e.get("id") for e in resource_events],
            "mitigation": "Review workload distribution and knowledge transfer",
        })

    # Pattern 5: Scope change
    scope_events = [e for e in events if e.get("type") == "scope_change"]
    if len(scope_events) >= 2:
        risks.append({
            "id": f"risk-scope-{state.get('project_id')}",
            "title": "Scope Change Frequency",
            "probability": 0.65,
            "impact": "high",
            "pattern": "scope_change",
            "evidence": [e.get("id") for e in scope_events],
            "mitigation": "Implement formal change control process",
        })

    # Calculate priority for each risk
    for risk in risks:
        risk["priority"] = _calculate_risk_priority(risk["probability"], risk["impact"])

    return merge_state(state, {"risk_items": risks})


def verify_risks(state: RiskRadarState) -> RiskRadarState:
    """
    Merge duplicate risks, verify evidence.
    """
    risks = state.get("risk_items", [])

    # Merge duplicates
    merged_risks = _merge_duplicate_risks(risks)

    # Verify evidence - demote risks without sufficient evidence to watchlist
    verified_risks = []
    for risk in merged_risks:
        evidence_count = len(risk.get("evidence", []))
        if evidence_count < 1:
            risk["priority"] = max(risk.get("priority", 0) - 1, 0)
            risk["status"] = "watchlist"
        else:
            risk["status"] = "active"
        verified_risks.append(risk)

    # Calculate overall confidence
    total_evidence = sum(len(r.get("evidence", [])) for r in verified_risks)
    confidence = min(total_evidence / 10, 1.0) if verified_risks else 0.5

    return merge_state(state, {
        "risk_items": verified_risks,
        "confidence": confidence,
    })


def act_upsert_risk_register(state: RiskRadarState) -> RiskRadarState:
    """
    Save to DB and calculate impact map.
    """
    project_id = state.get("project_id")
    risks = state.get("risk_items", [])
    topology = state.get("topology", {})

    try:
        # Save each risk
        for risk in risks:
            _upsert_risk_item(project_id, risk)

        # Calculate impact map
        impact_map = _calculate_impact_map(risks, topology)

        return merge_state(state, {
            "impact_map": impact_map,
            "result": {
                "risk_items": risks,
                "impact_map": impact_map,
            },
            "status": "completed",
        })
    except Exception as e:
        logger.error(f"Risk register upsert error: {e}")
        return merge_state(state, {
            "failure": {
                "type": FailureType.TOOL_ERROR.value,
                "detail": f"Risk register error: {str(e)}",
                "retry_count": 0,
            }
        })


# =============================================================================
# Helper Functions
# =============================================================================

def _fetch_project_events(project_id: str, days: int, event_types: List[str]) -> List[Dict]:
    """Fetch project events."""
    # Stub - actual implementation would query event log
    return []


def _fetch_project_topology(project_id: str) -> Dict:
    """Fetch project topology (dependencies, assignments, milestones)."""
    return {
        "wip_count": 0,
        "wip_limit": 10,
        "phases": [],
        "sprints": [],
        "critical_path": [],
    }


def _calculate_risk_priority(probability: float, impact: str) -> int:
    """Calculate risk priority score (1-10)."""
    impact_scores = {"low": 1, "medium": 2, "high": 3}
    impact_score = impact_scores.get(impact, 2)
    return int(probability * impact_score * 3.3)  # Scale to 1-10


def _merge_duplicate_risks(risks: List[Dict]) -> List[Dict]:
    """Merge duplicate risks based on pattern."""
    seen_patterns = {}
    merged = []

    for risk in risks:
        pattern = risk.get("pattern", "unknown")
        if pattern in seen_patterns:
            # Merge evidence
            seen_patterns[pattern]["evidence"].extend(risk.get("evidence", []))
            # Take higher probability
            if risk.get("probability", 0) > seen_patterns[pattern].get("probability", 0):
                seen_patterns[pattern]["probability"] = risk["probability"]
        else:
            seen_patterns[pattern] = risk
            merged.append(risk)

    return merged


def _upsert_risk_item(project_id: str, risk: Dict):
    """Upsert risk item to database."""
    logger.info(f"Upserting risk {risk.get('id')} for project {project_id}")
    # Actual implementation would save to database


def _calculate_impact_map(risks: List[Dict], topology: Dict) -> Dict:
    """Calculate impact map for risks."""
    phases_affected = set()
    sprints_affected = set()
    kpis_affected = set()

    for risk in risks:
        impact = risk.get("impact", "low")
        if impact == "high":
            # High impact affects current phase/sprint
            phases_affected.add("current_phase")
            sprints_affected.add("current_sprint")
            if risk.get("pattern") == "schedule_slip":
                kpis_affected.add("schedule_performance")
            if risk.get("pattern") == "wip_overflow":
                kpis_affected.add("throughput")

    return {
        "phases_affected": list(phases_affected),
        "sprints_affected": list(sprints_affected),
        "kpis_affected": list(kpis_affected),
    }


# =============================================================================
# Workflow Factory
# =============================================================================

def create_g4_risk_radar_workflow():
    """Create G4: Risk Radar workflow graph."""

    workflow = StateGraph(RiskRadarState)

    # === Add Nodes ===
    workflow.add_node("retrieve_events", retrieve_events)
    workflow.add_node("retrieve_topology", retrieve_topology)
    workflow.add_node("reason_infer_risks", reason_infer_risks)
    workflow.add_node("verify_risks", verify_risks)
    workflow.add_node("act_upsert_risk_register", act_upsert_risk_register)
    workflow.add_node("observe", observe)
    workflow.add_node("recover", recover_from_failure)

    # === Define Edges ===
    workflow.set_entry_point("retrieve_events")
    workflow.add_edge("retrieve_events", "retrieve_topology")
    workflow.add_edge("retrieve_topology", "reason_infer_risks")
    workflow.add_edge("reason_infer_risks", "verify_risks")
    workflow.add_edge("verify_risks", "act_upsert_risk_register")
    workflow.add_edge("act_upsert_risk_register", "observe")
    workflow.add_edge("observe", END)

    return workflow.compile()


# =============================================================================
# Failure Handling
# =============================================================================

G4_FAILURE_HANDLING = {
    "low_confidence": "Insufficient evidence risks -> Demote to 'watchlist'",
    "policy_violation": "Cannot access specific team data -> Use anonymized/aggregated inference only",
}
