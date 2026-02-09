"""
G7: RFP Requirement Extraction Workflow

Purpose:
- Parse RFP document text and extract structured requirements
- Classify requirements by category (FUNCTIONAL / NON_FUNCTIONAL / CONSTRAINT)
- Detect ambiguity and assign confidence scores
- Generate RFP summary with scope, constraints, and risks

Input:
- project_id, rfp_id, run_id
- text: full RFP text or concatenated chunks
- origin_type: EXTERNAL_RFP (default)
- model_name, prompt_version, generation_params (optional overrides)

Output:
- rfp_summary: project goal, scope in/out, constraints, risks
- requirements: list of structured requirements with source tracing
- stats: counts, averages, category breakdown
"""

from typing import TypedDict, List, Dict, Any, Optional
import json
import logging
import re
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


# =============================================================================
# State Definition
# =============================================================================

class RfpExtractionState(CommonWorkflowState):
    """G7 RFP Extraction specific state."""
    rfp_id: str
    run_id: str
    text: str
    origin_type: str
    model_name: str
    prompt_version: str
    generation_params: Dict[str, Any]

    # Intermediate
    extraction_prompt: str

    # Outputs
    rfp_summary: Dict[str, Any]
    requirements: List[Dict[str, Any]]
    stats: Dict[str, Any]
    error: str


# =============================================================================
# Prompt Template
# =============================================================================

EXTRACTION_PROMPT = """당신은 보험/IT 프로젝트 RFP(제안요청서) 분석 전문가입니다.
다음 RFP 문서를 분석하여 요구사항을 구조화된 JSON 형식으로 추출하세요.

[RFP 문서]
{text}

[추출 규칙]
1. 각 요구사항은 독립적이고 검증 가능한 단위로 분리
2. category는 FUNCTIONAL, NON_FUNCTIONAL, CONSTRAINT 중 하나
3. priority_hint는 MUST, SHOULD, COULD, UNKNOWN 중 하나 (문맥 기반 추론)
4. confidence는 0.0~1.0 (추출 확신도)
5. source에 원문 위치 정보 포함
6. 애매하거나 불명확한 표현이 있으면 ambiguity.is_ambiguous=true + questions 작성
7. req_key는 RFP-REQ-001부터 순번 부여

[출력 형식 - 반드시 이 JSON 스키마를 따르세요]
{{
  "rfp_summary": {{
    "project_goal": "프로젝트 목표 한 문장",
    "scope_in": ["범위 포함 항목"],
    "scope_out": ["범위 제외 항목"],
    "key_constraints": ["핵심 제약 조건"],
    "risks": ["식별된 위험"]
  }},
  "requirements": [
    {{
      "req_key": "RFP-REQ-001",
      "text": "요구사항 설명",
      "category": "FUNCTIONAL",
      "priority_hint": "MUST",
      "confidence": 0.92,
      "source": {{
        "section": "섹션 번호",
        "paragraph_id": "문단 ID",
        "quote": "원문 인용 (최대 300자)"
      }},
      "ambiguity": {{
        "is_ambiguous": false,
        "questions": []
      }},
      "duplicates": []
    }}
  ]
}}"""


# =============================================================================
# Workflow Nodes
# =============================================================================

def prepare_prompt(state: RfpExtractionState) -> RfpExtractionState:
    """Build the extraction prompt from input text."""
    text = state.get("text", "")

    if not text or not text.strip():
        return merge_state(state, {
            "error": "RFP text is empty or missing",
            "status": "failed",
        })

    # Truncate extremely long text to stay within context window limits
    max_text_len = int(state.get("generation_params", {}).get("max_text_length", 12000))
    if len(text) > max_text_len:
        logger.warning(
            f"RFP text truncated from {len(text)} to {max_text_len} chars "
            f"(rfp_id={state.get('rfp_id')})"
        )
        text = text[:max_text_len] + "\n\n[... 이하 생략 ...]"

    prompt = EXTRACTION_PROMPT.format(text=text)

    logger.info(
        f"Prepared extraction prompt: text_len={len(text)}, prompt_len={len(prompt)}, "
        f"rfp_id={state.get('rfp_id')}"
    )

    return merge_state(state, {
        "extraction_prompt": prompt,
    })


def extract_requirements(state: RfpExtractionState) -> RfpExtractionState:
    """Call LLM to extract requirements from the RFP text."""
    if state.get("error"):
        return state

    prompt = state.get("extraction_prompt", "")
    if not prompt:
        return merge_state(state, {
            "error": "Extraction prompt was not prepared",
            "status": "failed",
        })

    generation_params = state.get("generation_params", {})
    temperature = generation_params.get("temperature", 0.3)
    top_p = generation_params.get("top_p", 0.9)
    max_tokens = generation_params.get("max_tokens", 4000)

    try:
        from integrations.model_gateway import get_model_gateway, ModelTier
        gateway = get_model_gateway()

        if not gateway or not gateway.l2_loaded:
            logger.warning("L2 model not loaded, cannot extract RFP requirements")
            return merge_state(state, {
                "error": "LLM model is not available (L2 model not loaded)",
                "status": "failed",
            })

        start_time = time.time()
        result = gateway.generate(
            prompt=prompt,
            tier=ModelTier.L2,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        gen_time_ms = (time.time() - start_time) * 1000

        logger.info(
            f"LLM extraction completed: {gen_time_ms:.0f}ms, "
            f"tokens={result.tokens_used}, rfp_id={state.get('rfp_id')}"
        )

        raw_text = result.text

        # Parse JSON from the LLM response
        parsed = _parse_llm_json(raw_text)
        if parsed is None:
            return merge_state(state, {
                "error": f"Failed to parse LLM response as JSON. Raw length: {len(raw_text)}",
                "status": "failed",
            })

        rfp_summary = parsed.get("rfp_summary", {})
        requirements = parsed.get("requirements", [])

        # Validate and normalize extracted requirements
        validated_requirements = _validate_requirements(requirements)

        return merge_state(state, {
            "rfp_summary": _validate_summary(rfp_summary),
            "requirements": validated_requirements,
            "status": "running",
        })

    except Exception as e:
        logger.error(f"RFP extraction failed: {e}", exc_info=True)
        return merge_state(state, {
            "error": f"LLM extraction failed: {str(e)}",
            "status": "failed",
        })


def compute_stats(state: RfpExtractionState) -> RfpExtractionState:
    """Calculate statistics from extracted requirements."""
    if state.get("error"):
        return merge_state(state, {"status": "failed"})

    requirements = state.get("requirements", [])
    total_count = len(requirements)

    if total_count == 0:
        stats = {
            "total_count": 0,
            "ambiguity_count": 0,
            "avg_confidence": 0.0,
            "category_breakdown": {},
        }
        return merge_state(state, {
            "stats": stats,
            "status": "completed",
        })

    ambiguity_count = sum(
        1 for r in requirements
        if r.get("ambiguity", {}).get("is_ambiguous", False)
    )

    confidences = [r.get("confidence", 0.0) for r in requirements]
    avg_confidence = round(sum(confidences) / len(confidences), 2) if confidences else 0.0

    category_breakdown = {}
    for r in requirements:
        cat = r.get("category", "UNKNOWN")
        category_breakdown[cat] = category_breakdown.get(cat, 0) + 1

    stats = {
        "total_count": total_count,
        "ambiguity_count": ambiguity_count,
        "avg_confidence": avg_confidence,
        "category_breakdown": category_breakdown,
    }

    logger.info(
        f"RFP stats computed: total={total_count}, ambiguous={ambiguity_count}, "
        f"avg_conf={avg_confidence}, rfp_id={state.get('rfp_id')}"
    )

    return merge_state(state, {
        "stats": stats,
        "status": "completed",
    })


# =============================================================================
# Helper Functions
# =============================================================================

def _parse_llm_json(raw_text: str) -> Optional[Dict[str, Any]]:
    """
    Extract and parse JSON from LLM response text.

    Handles cases where the LLM wraps JSON in markdown code fences
    or includes preamble text before the JSON.
    """
    if not raw_text or not raw_text.strip():
        logger.warning("Empty LLM response text")
        return None

    text = raw_text.strip()

    # Strategy 1: Direct JSON parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Strategy 2: Extract from markdown code fence (```json ... ```)
    code_fence_match = re.search(r"```(?:json)?\s*\n?(.*?)```", text, re.DOTALL)
    if code_fence_match:
        try:
            return json.loads(code_fence_match.group(1).strip())
        except json.JSONDecodeError:
            pass

    # Strategy 3: Find first { ... last } bracket pair
    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace > first_brace:
        try:
            return json.loads(text[first_brace:last_brace + 1])
        except json.JSONDecodeError:
            pass

    logger.error(f"Could not parse JSON from LLM response (length={len(text)})")
    return None


def _validate_summary(summary: Dict[str, Any]) -> Dict[str, Any]:
    """Validate and normalize the rfp_summary structure."""
    return {
        "project_goal": summary.get("project_goal", ""),
        "scope_in": summary.get("scope_in", []) if isinstance(summary.get("scope_in"), list) else [],
        "scope_out": summary.get("scope_out", []) if isinstance(summary.get("scope_out"), list) else [],
        "key_constraints": summary.get("key_constraints", []) if isinstance(summary.get("key_constraints"), list) else [],
        "risks": summary.get("risks", []) if isinstance(summary.get("risks"), list) else [],
    }


def _validate_requirements(requirements: list) -> List[Dict[str, Any]]:
    """Validate and normalize each requirement entry."""
    valid_categories = {"FUNCTIONAL", "NON_FUNCTIONAL", "CONSTRAINT"}
    valid_priorities = {"MUST", "SHOULD", "COULD", "UNKNOWN"}
    validated = []

    for i, req in enumerate(requirements):
        if not isinstance(req, dict):
            logger.warning(f"Skipping non-dict requirement at index {i}")
            continue

        category = req.get("category", "FUNCTIONAL")
        if category not in valid_categories:
            category = "FUNCTIONAL"

        priority = req.get("priority_hint", "UNKNOWN")
        if priority not in valid_priorities:
            priority = "UNKNOWN"

        confidence = req.get("confidence", 0.5)
        try:
            confidence = float(confidence)
            confidence = max(0.0, min(1.0, confidence))
        except (TypeError, ValueError):
            confidence = 0.5

        source = req.get("source", {})
        if not isinstance(source, dict):
            source = {}

        ambiguity = req.get("ambiguity", {})
        if not isinstance(ambiguity, dict):
            ambiguity = {"is_ambiguous": False, "questions": []}

        validated.append({
            "req_key": req.get("req_key", f"RFP-REQ-{i + 1:03d}"),
            "text": req.get("text", ""),
            "category": category,
            "priority_hint": priority,
            "confidence": round(confidence, 2),
            "source": {
                "section": source.get("section", ""),
                "paragraph_id": source.get("paragraph_id", ""),
                "quote": source.get("quote", "")[:300],
            },
            "ambiguity": {
                "is_ambiguous": bool(ambiguity.get("is_ambiguous", False)),
                "questions": ambiguity.get("questions", []) if isinstance(ambiguity.get("questions"), list) else [],
            },
            "duplicates": req.get("duplicates", []) if isinstance(req.get("duplicates"), list) else [],
        })

    return validated


# =============================================================================
# Workflow Builder
# =============================================================================

def build_rfp_extraction_workflow():
    """Build and compile the G7 RFP extraction workflow."""
    workflow = StateGraph(RfpExtractionState)

    workflow.add_node("prepare_prompt", prepare_prompt)
    workflow.add_node("extract_requirements", extract_requirements)
    workflow.add_node("compute_stats", compute_stats)

    workflow.set_entry_point("prepare_prompt")
    workflow.add_edge("prepare_prompt", "extract_requirements")
    workflow.add_edge("extract_requirements", "compute_stats")
    workflow.add_edge("compute_stats", END)

    return workflow.compile()


def run_rfp_extraction_workflow(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Run the RFP extraction workflow end-to-end.

    Args:
        data: Request data containing rfp_id, text, and optional params.

    Returns:
        dict with rfp_summary, requirements, stats, or error.
    """
    generation_params = data.get("generation_params", {})
    if not isinstance(generation_params, dict):
        generation_params = {}

    initial_state: RfpExtractionState = {
        "project_id": data.get("project_id", ""),
        "user_id": "system",
        "role": "PM",
        "intent": "rfp_extraction",
        "rfp_id": data.get("rfp_id", ""),
        "run_id": data.get("run_id", ""),
        "text": data.get("text", ""),
        "origin_type": data.get("origin_type", "EXTERNAL_RFP"),
        "model_name": data.get("model_name", "gemma-3-12b"),
        "prompt_version": data.get("prompt_version", "v1.0"),
        "generation_params": generation_params,
        "extraction_prompt": "",
        "rfp_summary": {},
        "requirements": [],
        "stats": {},
        "error": "",
        "status": "running",
        "tenant_id": "default",
        "request_id": data.get("run_id", ""),
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
        compiled = build_rfp_extraction_workflow()
        final_state = compiled.invoke(initial_state)
    except Exception as e:
        logger.error(f"RFP extraction workflow failed: {e}", exc_info=True)
        final_state = {
            "rfp_summary": {},
            "requirements": [],
            "stats": {"total_count": 0, "ambiguity_count": 0, "avg_confidence": 0.0, "category_breakdown": {}},
            "error": f"Workflow execution failed: {str(e)}",
            "status": "failed",
        }

    error = final_state.get("error", "")
    if error:
        return {
            "error": error,
            "rfp_summary": final_state.get("rfp_summary", {}),
            "requirements": final_state.get("requirements", []),
            "stats": final_state.get("stats", {}),
        }

    return {
        "rfp_summary": final_state.get("rfp_summary", {}),
        "requirements": final_state.get("requirements", []),
        "stats": final_state.get("stats", {}),
    }
