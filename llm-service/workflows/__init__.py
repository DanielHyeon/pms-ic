"""
Phase 2: LangGraph Workflow Templates

This package contains:
- Common state schema (CommonWorkflowState)
- Common node types (9 standard nodes)
- 5 workflow templates (G1-G5)

Workflow Templates:
- G1: Weekly Executive Report - Project status summary for stakeholders
- G2: Sprint Scope Recommendation - Backlog to sprint planning
- G3: Traceability Check - Requirement-deliverable consistency
- G4: Risk Radar - Risk detection and impact analysis
- G5: Knowledge Q&A - Project knowledge retrieval with evidence
"""

from .common_state import (
    CommonWorkflowState,
    DecisionMode,
    FailureType,
    WorkflowStatus,
    WorkflowContext,
    Evidence,
    EvidenceMap,
    create_initial_state,
    merge_state,
)

from .common_nodes import (
    # Core nodes
    router_node,
    build_context,
    retrieve_rag,
    retrieve_graph_facts,
    retrieve_metrics,
    retrieve_events,
    reason_generate,
    verify_evidence,
    verify_policy,
    verify_confidence,
    act_save_draft,
    act_create_pending_action,
    gate_check,
    recover_from_failure,
    observe,
    # Helpers
    get_intent_router,
    check_failure,
    check_approval_needed,
    check_confidence_threshold,
    gate_determine_approval_type,
    create_node,
)

# Workflow factories will be imported once created
__all__ = [
    # State
    "CommonWorkflowState",
    "DecisionMode",
    "FailureType",
    "WorkflowStatus",
    "WorkflowContext",
    "Evidence",
    "EvidenceMap",
    "create_initial_state",
    "merge_state",
    # Nodes
    "router_node",
    "build_context",
    "retrieve_rag",
    "retrieve_graph_facts",
    "retrieve_metrics",
    "retrieve_events",
    "reason_generate",
    "verify_evidence",
    "verify_policy",
    "verify_confidence",
    "act_save_draft",
    "act_create_pending_action",
    "gate_check",
    "recover_from_failure",
    "observe",
    # Helpers
    "get_intent_router",
    "check_failure",
    "check_approval_needed",
    "check_confidence_threshold",
    "gate_determine_approval_type",
    "create_node",
    # Workflows
    "create_g1_weekly_report_workflow",
    "create_g2_sprint_planning_workflow",
    "create_g3_traceability_workflow",
    "create_g4_risk_radar_workflow",
    "create_g5_knowledge_qa_workflow",
    # Router
    "WorkflowRouter",
]


def create_g1_weekly_report_workflow():
    """Create G1 Weekly Report workflow."""
    from .g1_weekly_report import create_g1_weekly_report_workflow as create
    return create()


def create_g2_sprint_planning_workflow():
    """Create G2 Sprint Planning workflow."""
    from .g2_sprint_planning import create_g2_sprint_planning_workflow as create
    return create()


def create_g3_traceability_workflow():
    """Create G3 Traceability workflow."""
    from .g3_traceability import create_g3_traceability_workflow as create
    return create()


def create_g4_risk_radar_workflow():
    """Create G4 Risk Radar workflow."""
    from .g4_risk_radar import create_g4_risk_radar_workflow as create
    return create()


def create_g5_knowledge_qa_workflow():
    """Create G5 Knowledge Q&A workflow."""
    from .g5_knowledge_qa import create_g5_knowledge_qa_workflow as create
    return create()


class WorkflowRouter:
    """
    Routes requests to appropriate workflow based on intent.

    Usage:
        router = WorkflowRouter()
        result = await router.run(project_id, user_id, role, intent, **kwargs)
    """

    def __init__(self):
        self._workflows = {}

    def _get_workflow(self, intent: str):
        """Get or create workflow for intent."""
        intent_mapping = {
            "weekly_report": ("g1", create_g1_weekly_report_workflow),
            "sprint_plan": ("g2", create_g2_sprint_planning_workflow),
            "sprint_planning": ("g2", create_g2_sprint_planning_workflow),
            "trace_check": ("g3", create_g3_traceability_workflow),
            "traceability": ("g3", create_g3_traceability_workflow),
            "risk_scan": ("g4", create_g4_risk_radar_workflow),
            "risk_radar": ("g4", create_g4_risk_radar_workflow),
            "knowledge_qa": ("g5", create_g5_knowledge_qa_workflow),
            "question": ("g5", create_g5_knowledge_qa_workflow),
        }

        key, factory = intent_mapping.get(intent, ("g5", create_g5_knowledge_qa_workflow))

        if key not in self._workflows:
            self._workflows[key] = factory()

        return self._workflows[key]

    async def run(
        self,
        project_id: str,
        user_id: str,
        role: str,
        intent: str,
        **kwargs
    ) -> dict:
        """
        Run appropriate workflow for intent.

        Args:
            project_id: Target project ID
            user_id: Requesting user ID
            role: User's role
            intent: Workflow intent
            **kwargs: Additional workflow-specific parameters

        Returns:
            Workflow result dict
        """
        workflow = self._get_workflow(intent)

        initial_state = create_initial_state(
            project_id=project_id,
            user_id=user_id,
            role=role,
            intent=intent,
            **{k: v for k, v in kwargs.items() if k in ["tenant_id", "request_id", "trace_id"]}
        )

        # Add workflow-specific inputs
        for key, value in kwargs.items():
            if key not in ["tenant_id", "request_id", "trace_id"]:
                initial_state[key] = value

        # Run workflow
        result = await workflow.ainvoke(initial_state)
        return result

    def run_sync(
        self,
        project_id: str,
        user_id: str,
        role: str,
        intent: str,
        **kwargs
    ) -> dict:
        """Synchronous version of run()."""
        import asyncio
        return asyncio.run(self.run(project_id, user_id, role, intent, **kwargs))
