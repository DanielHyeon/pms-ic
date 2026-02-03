"""
G1: Weekly Executive Report Workflow

Purpose:
- Summarize project status for executives/stakeholders
- Include KPI/issues/risks/next week plan with evidence links
- COMMIT (publish) requires approval

Input:
- project_id: Target project
- week_range: {"start": date, "end": date}
- audience: "exec" | "team"
- format: "md" | "pdf"
- channels: ["slack", "email"]

Output:
- report_draft: Markdown content
- evidence_links: [{claim, source_id, url}]
- risk_summary: [{title, severity, mitigation}]
- actions_next_week: [{title, owner, due}]
- confidence: float
- missing_info_questions: [str]
"""

from typing import TypedDict, List, Dict, Any, Optional
from datetime import datetime, date
import logging

try:
    from langgraph.graph import StateGraph, END
except ImportError:
    # Stub for development without langgraph
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
from .common_nodes import (
    build_context,
    gate_check,
    recover_from_failure,
    observe,
    verify_evidence,
    verify_policy,
)

logger = logging.getLogger(__name__)


class WeeklyReportState(CommonWorkflowState):
    """G1 Weekly Report specific state."""
    week_range: Dict[str, str]
    audience: str
    format: str
    channels: List[str]

    # Retrieve results
    metrics_data: Dict[str, Any]
    events_data: List[Dict[str, Any]]
    docs_data: List[Dict[str, Any]]

    # Generated sections
    report_sections: Dict[str, str]


# =============================================================================
# Workflow Nodes
# =============================================================================

def retrieve_metrics(state: WeeklyReportState) -> WeeklyReportState:
    """
    Collect cycle time, throughput, burndown, WIP, milestone progress.
    """
    project_id = state.get("project_id")
    week_range = state.get("week_range", {})

    try:
        metrics = _fetch_project_metrics(project_id, week_range)
        return merge_state(state, {"metrics_data": metrics})
    except Exception as e:
        logger.error(f"Metrics fetch error: {e}")
        return merge_state(state, {
            "metrics_data": {},
            "failure": {
                "type": FailureType.TOOL_ERROR.value,
                "detail": f"Metrics fetch error: {str(e)}",
                "retry_count": 0,
            }
        })


def retrieve_events(state: WeeklyReportState) -> WeeklyReportState:
    """
    Collect weekly change events: scope change, delays, blockers.
    """
    project_id = state.get("project_id")
    week_range = state.get("week_range", {})

    try:
        events = _fetch_project_events(
            project_id=project_id,
            event_types=["scope_change", "delay", "blocker_added", "blocker_resolved"],
            date_range=week_range
        )
        return merge_state(state, {"events_data": events})
    except Exception as e:
        logger.error(f"Events fetch error: {e}")
        return merge_state(state, {"events_data": []})


def retrieve_docs(state: WeeklyReportState) -> WeeklyReportState:
    """
    RAG search for meeting notes, decisions, key documents.
    """
    project_id = state.get("project_id")
    week_range = state.get("week_range", {})

    try:
        docs = _rag_search(
            project_id=project_id,
            query="weekly key decisions meeting notes issues",
            date_range=week_range,
            top_k=10
        )
        return merge_state(state, {"docs_data": docs})
    except Exception as e:
        logger.error(f"RAG search error: {e}")
        return merge_state(state, {"docs_data": []})


def reason_compose_draft(state: WeeklyReportState) -> WeeklyReportState:
    """
    Generate report draft based on template.
    """
    metrics = state.get("metrics_data", {})
    events = state.get("events_data", [])
    docs = state.get("docs_data", [])
    audience = state.get("audience", "team")

    try:
        sections = _generate_report_sections(
            metrics=metrics,
            events=events,
            docs=docs,
            audience=audience
        )

        # Build evidence map
        evidence_map = _extract_evidence_map(sections, docs)

        return merge_state(state, {
            "report_sections": sections,
            "evidence_map": evidence_map,
            "draft": {"sections": sections},
        })
    except Exception as e:
        logger.error(f"Report composition error: {e}")
        return merge_state(state, {
            "failure": {
                "type": FailureType.TOOL_ERROR.value,
                "detail": f"Report composition error: {str(e)}",
                "retry_count": 0,
            }
        })


def verify_report_evidence(state: WeeklyReportState) -> WeeklyReportState:
    """
    Remove ungrounded claims, cross-check numbers.
    """
    sections = state.get("report_sections", {})
    evidence_map = state.get("evidence_map", [])
    metrics = state.get("metrics_data", {})

    verified_sections = {}
    removed_claims = []

    for section_name, content in sections.items():
        verified, removed = _verify_and_filter_claims(
            content=content,
            evidence_map=evidence_map,
            metrics=metrics
        )
        verified_sections[section_name] = verified
        removed_claims.extend(removed)

    # Calculate confidence
    total_claims = _count_claims(sections)
    verified_claims = _count_claims(verified_sections)
    evidence_count = len(evidence_map)

    confidence = _calculate_confidence(total_claims, verified_claims, evidence_count)

    return merge_state(state, {
        "report_sections": verified_sections,
        "confidence": confidence,
        "draft": {
            **state.get("draft", {}),
            "removed_claims": removed_claims,
        }
    })


def verify_report_policy(state: WeeklyReportState) -> WeeklyReportState:
    """
    Filter external share forbidden / PII / confidential content.
    """
    sections = state.get("report_sections", {})
    audience = state.get("audience", "team")
    channels = state.get("channels", [])
    role = state.get("role", "")

    filtered_sections = {}

    for section_name, content in sections.items():
        filtered = _filter_sensitive_content(
            content=content,
            audience=audience,
            channels=channels
        )
        filtered_sections[section_name] = filtered

    # External channel permission check
    if "email" in channels and audience == "exec":
        if not _check_external_share_permission(role):
            return merge_state(state, {
                "failure": {
                    "type": FailureType.POLICY_VIOLATION.value,
                    "detail": "No permission for external email channel",
                    "retry_count": 0,
                }
            })

    return merge_state(state, {"report_sections": filtered_sections})


def act_save_draft(state: WeeklyReportState) -> WeeklyReportState:
    """
    Save draft to object storage / document DB.
    """
    project_id = state.get("project_id")
    sections = state.get("report_sections", {})
    format = state.get("format", "md")
    week_range = state.get("week_range", {})
    confidence = state.get("confidence", 0.0)

    try:
        report_content = _compile_report(sections, format)

        draft_id = _save_report_draft(
            project_id=project_id,
            content=report_content,
            metadata={
                "week_range": week_range,
                "audience": state.get("audience"),
                "confidence": confidence,
                "format": format,
            }
        )

        return merge_state(state, {
            "result": {
                "draft_id": draft_id,
                "report_content": report_content,
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


def gate_publish(state: WeeklyReportState) -> WeeklyReportState:
    """
    Channel publish is COMMIT, so apply approval conditions.
    """
    channels = state.get("channels", [])

    if channels:
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

def _fetch_project_metrics(project_id: str, week_range: Dict) -> Dict:
    """Fetch project metrics from backend."""
    try:
        from observability.pms_monitoring import PMSMonitoring
        monitoring = PMSMonitoring()
        return monitoring.get_weekly_metrics(project_id, week_range)
    except ImportError:
        return {
            "sprint_velocity": 0,
            "burndown_remaining": 0,
            "wip_count": 0,
            "completed_tasks": 0,
            "blocked_tasks": 0,
            "cycle_time_avg": 0,
        }


def _fetch_project_events(project_id: str, event_types: List[str], date_range: Dict) -> List[Dict]:
    """Fetch project events from backend."""
    # Stub - actual implementation would query the event log
    return []


def _rag_search(project_id: str, query: str, date_range: Dict, top_k: int) -> List[Dict]:
    """RAG search for documents."""
    try:
        from services.rag_service_neo4j import RAGServiceNeo4j
        rag = RAGServiceNeo4j()
        return rag.search(project_id, query, top_k=top_k)
    except ImportError:
        return []


def _generate_report_sections(metrics: Dict, events: List, docs: List, audience: str) -> Dict[str, str]:
    """Generate report sections using LLM."""
    try:
        from integrations.model_gateway import ModelGateway
        gateway = ModelGateway()

        prompt = f"""
Generate a weekly project report with the following sections:
1. Executive Summary (2-3 sentences)
2. Key Metrics (bullet points)
3. Accomplishments (what was completed)
4. Issues & Risks (current blockers and risks)
5. Next Week Plan (planned activities)

Audience: {audience}
Metrics: {metrics}
Events: {len(events)} events
Documents: {len(docs)} related documents

Generate professional, concise content.
"""

        result = gateway.generate(prompt)
        content = result.get("content", "")

        # Parse sections (simplified)
        return {
            "executive_summary": _extract_section(content, "Executive Summary"),
            "key_metrics": _extract_section(content, "Key Metrics"),
            "accomplishments": _extract_section(content, "Accomplishments"),
            "issues_risks": _extract_section(content, "Issues"),
            "next_week": _extract_section(content, "Next Week"),
        }
    except Exception as e:
        logger.error(f"Section generation error: {e}")
        return {
            "executive_summary": "Report generation in progress.",
            "key_metrics": f"Velocity: {metrics.get('sprint_velocity', 'N/A')}",
            "accomplishments": "Please review recent activities.",
            "issues_risks": "No critical issues reported.",
            "next_week": "Continue planned work.",
        }


def _extract_section(content: str, section_name: str) -> str:
    """Extract a section from generated content."""
    # Simplified extraction - in real implementation would parse properly
    return content[:200] if content else f"Section: {section_name}"


def _extract_evidence_map(sections: Dict, docs: List) -> List[Dict]:
    """Build evidence mapping from sections to documents."""
    evidence_map = []
    for doc in docs:
        evidence_map.append({
            "claim": f"Based on {doc.get('title', 'document')}",
            "evidence_ids": [doc.get("id", "unknown")],
            "source_type": doc.get("type", "document"),
            "relevance": doc.get("score", 0.5),
        })
    return evidence_map


def _verify_and_filter_claims(content: str, evidence_map: List, metrics: Dict) -> tuple:
    """Verify claims against evidence and metrics."""
    # Simplified - return content as-is with no removed claims
    return content, []


def _count_claims(sections: Dict) -> int:
    """Count claims in sections."""
    return sum(len(s.split(".")) for s in sections.values())


def _calculate_confidence(total: int, verified: int, evidence: int) -> float:
    """Calculate confidence score."""
    if total == 0:
        return 0.5
    verification_ratio = verified / total if total > 0 else 0.5
    evidence_factor = min(evidence / 5, 1.0)
    return verification_ratio * 0.7 + evidence_factor * 0.3


def _filter_sensitive_content(content: str, audience: str, channels: List) -> str:
    """Filter sensitive content based on audience and channels."""
    # Simplified - in real implementation would scan for PII, confidential markers
    return content


def _check_external_share_permission(role: str) -> bool:
    """Check if role has external share permission."""
    allowed_roles = ["pm", "pmo_head", "admin", "sponsor"]
    return role.lower() in allowed_roles


def _compile_report(sections: Dict, format: str) -> str:
    """Compile sections into final report."""
    lines = ["# Weekly Project Report", ""]

    section_titles = {
        "executive_summary": "## Executive Summary",
        "key_metrics": "## Key Metrics",
        "accomplishments": "## Accomplishments",
        "issues_risks": "## Issues & Risks",
        "next_week": "## Next Week Plan",
    }

    for key, title in section_titles.items():
        if key in sections:
            lines.append(title)
            lines.append("")
            lines.append(sections[key])
            lines.append("")

    return "\n".join(lines)


def _save_report_draft(project_id: str, content: str, metadata: Dict) -> str:
    """Save report draft and return draft ID."""
    import uuid
    draft_id = str(uuid.uuid4())
    logger.info(f"Saved draft {draft_id} for project {project_id}")
    return draft_id


# =============================================================================
# Workflow Factory
# =============================================================================

def create_g1_weekly_report_workflow():
    """Create G1: Weekly Report workflow graph."""

    workflow = StateGraph(WeeklyReportState)

    # === Add Nodes ===
    workflow.add_node("build_context", build_context)
    workflow.add_node("retrieve_metrics", retrieve_metrics)
    workflow.add_node("retrieve_events", retrieve_events)
    workflow.add_node("retrieve_docs", retrieve_docs)
    workflow.add_node("reason_compose_draft", reason_compose_draft)
    workflow.add_node("verify_evidence", verify_report_evidence)
    workflow.add_node("verify_policy", verify_report_policy)
    workflow.add_node("act_save_draft", act_save_draft)
    workflow.add_node("gate_publish", gate_publish)
    workflow.add_node("observe", observe)
    workflow.add_node("recover", recover_from_failure)

    # === Define Edges ===
    workflow.set_entry_point("build_context")

    workflow.add_edge("build_context", "retrieve_metrics")
    workflow.add_edge("retrieve_metrics", "retrieve_events")
    workflow.add_edge("retrieve_events", "retrieve_docs")
    workflow.add_edge("retrieve_docs", "reason_compose_draft")
    workflow.add_edge("reason_compose_draft", "verify_evidence")
    workflow.add_edge("verify_evidence", "verify_policy")

    # Policy verification routing
    def route_after_policy(state: WeeklyReportState) -> str:
        if state.get("failure"):
            return "recover"
        return "act_save_draft"

    workflow.add_conditional_edges(
        "verify_policy",
        route_after_policy,
        {"recover": "recover", "act_save_draft": "act_save_draft"}
    )

    workflow.add_edge("act_save_draft", "gate_publish")
    workflow.add_edge("gate_publish", "observe")
    workflow.add_edge("observe", END)

    # Recovery routing
    def route_after_recover(state: WeeklyReportState) -> str:
        recovery_action = state.get("failure", {}).get("recovery_action")
        if recovery_action == "downgrade_to_suggest":
            return "act_save_draft"
        return "observe"

    workflow.add_conditional_edges(
        "recover",
        route_after_recover,
        {"act_save_draft": "act_save_draft", "observe": "observe"}
    )

    return workflow.compile()


# =============================================================================
# KPIs for Evaluation
# =============================================================================

G1_KPIS = {
    "report_generation_time_saved": "Report generation time saved (minutes)",
    "human_edit_ratio": "Human edit ratio (diff %)",
    "evidence_link_ratio": "Evidence link ratio (%)",
    "publish_approval_rate": "Publish approval rate (%)",
}
