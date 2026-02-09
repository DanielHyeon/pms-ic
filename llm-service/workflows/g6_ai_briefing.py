"""
G6: AI Briefing Enrichment Workflow

Purpose:
- Enrich rule-based briefing insights with LLM-generated natural language
- Generate headline and body summary from metrics + findings
- Falls back to rule-based templates if LLM unavailable

Input:
- projectId, role, scope, asOf
- rawMetrics: {signals, healthStatus, insightCount}
- ruleFindings: [{type, severity, title, confidence}]
- completeness, missingSignals

Output:
- headline: Korean summary headline (1 sentence)
- body: Korean summary body (3-5 lines)
- generationMethod: HYBRID
"""

from typing import TypedDict, List, Dict, Any, Optional
import logging
import time

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

        def set_entry_point(self, name):
            self.entry = name

        def compile(self):
            return self

    END = "END"

from .common_state import CommonWorkflowState, merge_state

logger = logging.getLogger(__name__)


class BriefingState(CommonWorkflowState):
    """G6 AI Briefing specific state."""
    scope: str
    as_of: str
    raw_metrics: Dict[str, Any]
    rule_findings: List[Dict[str, Any]]
    completeness: str
    missing_signals: List[str]

    # Outputs
    headline: str
    body: str
    generation_method: str


# =============================================================================
# Workflow Nodes
# =============================================================================

def prepare_context(state: BriefingState) -> BriefingState:
    """Format metrics and findings for LLM prompt."""
    role = state.get("role", "PM")
    metrics = state.get("raw_metrics", {})
    findings = state.get("rule_findings", [])

    # Format findings for prompt
    findings_text = ""
    for i, f in enumerate(findings, 1):
        findings_text += f"  {i}. [{f.get('severity', 'UNKNOWN')}] {f.get('title', 'N/A')} (type: {f.get('type', 'N/A')}, confidence: {f.get('confidence', 0):.0%})\n"

    if not findings_text:
        findings_text = "  (none detected)\n"

    context_text = (
        f"Role: {role}\n"
        f"Health Status: {metrics.get('healthStatus', 'UNKNOWN')}\n"
        f"Signals: {', '.join(metrics.get('signals', []))}\n"
        f"Insight Count: {metrics.get('insightCount', 0)}\n"
        f"Completeness: {state.get('completeness', 'UNKNOWN')}\n"
    )

    return merge_state(state, {
        "context_snapshot": {
            "formatted_context": context_text,
            "formatted_findings": findings_text,
        }
    })


def generate_summary(state: BriefingState) -> BriefingState:
    """Generate headline + body using LLM."""
    role = state.get("role", "PM")
    context = state.get("context_snapshot", {})
    findings = state.get("rule_findings", [])

    formatted_context = context.get("formatted_context", "")
    formatted_findings = context.get("formatted_findings", "")

    prompt = f"""당신은 프로젝트 관리 AI 어시스턴트입니다.
다음 프로젝트 데이터를 기반으로 {role} 역할 관점에서 브리핑 요약을 작성하세요.

[프로젝트 상태]
{formatted_context}

[감지된 패턴]
{formatted_findings}

[출력 형식 - 반드시 아래 형식으로 작성]
headline: (핵심 메시지 1문장, 30자 이내)
body: (3~5줄 요약, 각 줄은 '-'로 시작)"""

    try:
        # Try to use model gateway
        from integrations.model_gateway import get_model_gateway, ModelTier
        gateway = get_model_gateway()

        if gateway and gateway.l2_loaded:
            start_time = time.time()
            result = gateway.generate(
                prompt=prompt,
                tier=ModelTier.L2,
                max_tokens=500,
                temperature=0.4,
            )
            gen_time = (time.time() - start_time) * 1000

            headline, body = _parse_summary_response(result.text)
            logger.info(f"LLM briefing generation: {gen_time:.0f}ms, tokens={result.tokens_used}")

            return merge_state(state, {
                "headline": headline,
                "body": body,
                "generation_method": "HYBRID",
                "status": "completed",
            })
        else:
            logger.info("L2 model not loaded, using fallback generation")
            headline, body = _fallback_generation(state)
            return merge_state(state, {
                "headline": headline,
                "body": body,
                "generation_method": "RULE_BASED",
                "status": "completed",
            })
    except Exception as e:
        logger.warning(f"LLM generation failed: {e}, using fallback")
        headline, body = _fallback_generation(state)
        return merge_state(state, {
            "headline": headline,
            "body": body,
            "generation_method": "RULE_BASED",
            "status": "completed",
        })


def observe_briefing(state: BriefingState) -> BriefingState:
    """Log generation metrics."""
    logger.info(
        f"Briefing generated: method={state.get('generation_method')}, "
        f"role={state.get('role')}, "
        f"headline_len={len(state.get('headline', ''))}"
    )
    return state


# =============================================================================
# Helper Functions
# =============================================================================

def _parse_summary_response(text: str) -> tuple:
    """Parse LLM response into headline and body."""
    headline = ""
    body = ""

    lines = text.strip().split("\n")
    in_body = False

    for line in lines:
        stripped = line.strip()
        if stripped.lower().startswith("headline:"):
            headline = stripped[len("headline:"):].strip()
        elif stripped.lower().startswith("body:"):
            body = stripped[len("body:"):].strip()
            in_body = True
        elif in_body and stripped:
            body += "\n" + stripped

    if not headline and lines:
        headline = lines[0].strip()
    if not body and len(lines) > 1:
        body = "\n".join(lines[1:]).strip()

    return headline, body


def _fallback_generation(state: BriefingState) -> tuple:
    """Rule-based Korean summary when LLM is unavailable."""
    findings = state.get("rule_findings", [])
    metrics = state.get("raw_metrics", {})

    # Generate headline from most severe finding
    if not findings:
        headline = "프로젝트가 정상 범위 내에서 진행 중입니다"
    else:
        top = findings[0]
        headline = top.get("title", "프로젝트 상태 업데이트")

    # Generate body from findings
    body_lines = []
    for f in findings[:5]:
        severity = f.get("severity", "INFO")
        title = f.get("title", "")
        body_lines.append(f"- [{severity}] {title}")

    if not body_lines:
        body_lines.append("- 현재 프로젝트에서 주요 위험 신호가 감지되지 않았습니다.")

    body = "\n".join(body_lines)
    return headline, body


# =============================================================================
# Workflow Builder
# =============================================================================

def build_briefing_workflow():
    """Build and compile the G6 briefing workflow."""
    workflow = StateGraph(BriefingState)

    workflow.add_node("prepare_context", prepare_context)
    workflow.add_node("generate_summary", generate_summary)
    workflow.add_node("observe", observe_briefing)

    workflow.set_entry_point("prepare_context")
    workflow.add_edge("prepare_context", "generate_summary")
    workflow.add_edge("generate_summary", "observe")
    workflow.add_edge("observe", END)

    return workflow.compile()


def run_briefing_workflow(data: Dict[str, Any], model=None) -> Dict[str, Any]:
    """
    Run the briefing workflow end-to-end.

    Args:
        data: Request data from Spring Boot
        model: Optional model reference (unused, gateway handles this)

    Returns:
        dict with headline, body, generationMethod
    """
    initial_state: BriefingState = {
        "project_id": data.get("projectId", ""),
        "user_id": "system",
        "role": data.get("role", "PM"),
        "intent": "ai_briefing",
        "scope": data.get("scope", "current_sprint"),
        "as_of": data.get("asOf", ""),
        "raw_metrics": data.get("rawMetrics", {}),
        "rule_findings": data.get("ruleFindings", []),
        "completeness": data.get("completeness", "UNKNOWN"),
        "missing_signals": data.get("missingSignals", []),
        "headline": "",
        "body": "",
        "generation_method": "RULE_BASED",
        "status": "running",
        "tenant_id": "default",
        "request_id": "",
        "trace_id": "",
        "context_snapshot": {},
        "retrieval": {},
        "draft": {},
        "evidence_map": [],
        "confidence": 0.0,
        "policy_result": {},
        "failure": None,
        "decision_gate": {"mode": "suggest", "requires_human_approval": False},
        "result": {},
    }

    try:
        compiled = build_briefing_workflow()
        final_state = compiled.invoke(initial_state)
    except Exception as e:
        logger.error(f"Briefing workflow failed: {e}")
        headline, body = _fallback_generation(initial_state)
        final_state = {
            "headline": headline,
            "body": body,
            "generation_method": "RULE_BASED",
        }

    return {
        "headline": final_state.get("headline", ""),
        "body": final_state.get("body", ""),
        "generationMethod": final_state.get("generation_method", "RULE_BASED"),
    }
