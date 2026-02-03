"""
Two-Track LangGraph Chat Workflow v2

Track A (High-frequency, low-cost): Fast responses for FAQ, status queries
Track B (High-value outputs): Quality responses for reports, analysis

Reference: docs/PMS 최적화 방안.md
"""

from typing import TypedDict, Literal, List, Optional, Dict, Any
from langgraph.graph import StateGraph, END
from llama_cpp import Llama
from datetime import datetime
import logging
import re
import os
import time
import uuid

from guards.policy_engine import get_policy_engine, PolicyAction
from context.context_snapshot import get_snapshot_manager, ContextSnapshot

# Phase 1: Gates & Foundation imports
from classifiers.authority_classifier import get_authority_classifier, AuthorityLevel, AuthorityResult
from recovery.failure_taxonomy import get_failure_handler, FailureCode, classify_error
from services.evidence_service import get_evidence_service, EvidenceItem
from schemas.ai_response import AIResponse, Evidence, ResponseStatus, create_error_response

# Status Query Engine imports
from classifiers.answer_type_classifier import (
    get_answer_type_classifier, classify_answer_type, is_status_query,
    AnswerType, AnswerTypeResult
)
from query.status_query_plan import (
    StatusQueryPlan, create_default_plan, validate_plan,
    get_plan_generation_prompt, parse_llm_plan_response
)
from query.status_query_executor import get_status_query_executor, StatusQueryResult
from guards.source_policy_gate import get_source_policy_gate, get_status_summarization_prompt
from query.text_to_sql import get_dynamic_query_executor, format_query_result
from contracts.status_response_contract import (
    build_status_response, create_no_data_response, StatusResponseContract
)

# P0: Intent Routing & Handler Implementation
from workflows.intent_handlers import (
    get_handler,
    has_dedicated_handler,
    HandlerContext,
    INTENT_HANDLERS
)
from contracts.response_renderer import render as render_intent_response

logger = logging.getLogger(__name__)


# =============================================================================
# RAG Scope Decision & Fallback Helpers
# =============================================================================

DOC_SEEK_KEYWORDS = (
    "문서", "가이드", "정책", "규정", "템플릿", "위키", "링크",
    "노션", "컨플루언스", "어디", "보여줘", "찾아줘", "참조",
    "근거", "자료", "원문", "파일", "경로", "위치"
)

PROJECT_FORCE_KEYWORDS = (
    "이 프로젝트", "우리 프로젝트", "해당 프로젝트",
    "프로젝트 내", "프로젝트에서", "현재 프로젝트", "본 프로젝트"
)

GENERAL_HOWTO_KEYWORDS = (
    "뭐야", "무엇", "정의", "의미", "설명", "차이", "장단점",
    "언제", "왜", "어떻게", "개념", "용어", "정리해줘", "알려줘"
)


def _contains_any(text: str, keywords: tuple) -> bool:
    """Check if text contains any of the keywords"""
    return any(k in text for k in keywords) if text else False


def decide_search_project_id_for_howto(
    query: str,
    project_id: Optional[str],
) -> Optional[str]:
    """
    Determine search scope for HOWTO_POLICY queries.
    - Project/doc signal -> project_id (project-first)
    - General concept question -> None (global, includes 'default')
    """
    q = (query or "").strip()
    if not q:
        return None

    project_forced = _contains_any(q, PROJECT_FORCE_KEYWORDS)
    if project_id and project_id in q:
        project_forced = True

    doc_seek = _contains_any(q, DOC_SEEK_KEYWORDS)
    general_howto = _contains_any(q, GENERAL_HOWTO_KEYWORDS)

    if project_forced or doc_seek:
        return project_id
    if general_howto:
        return None
    return None  # Default to global for better recall


def max_relevance_score(results: List[Dict[str, Any]]) -> float:
    """Get maximum relevance score from results"""
    if not results:
        return 0.0
    return max((r.get("relevance_score", 0.0) for r in results), default=0.0)


def should_fallback_to_global(
    primary_project_id: Optional[str],
    results: List[Dict[str, Any]],
    min_results: int = 1,
    min_max_score: float = 0.01,
) -> bool:
    """Determine if fallback to global search is needed"""
    if primary_project_id is None:
        return False
    if not results or len(results) < min_results:
        return True
    return max_relevance_score(results) < min_max_score


def merge_results_project_first(
    project_results: List[Dict[str, Any]],
    global_results: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Merge results with project-first priority, dedupe by metadata.doc_id"""
    merged = []
    seen = set()

    for r in (project_results or []):
        doc_id = (r.get("metadata") or {}).get("doc_id")
        key = doc_id or r.get("chunk_id") or id(r)
        if key not in seen:
            seen.add(key)
            merged.append(r)

    for r in (global_results or []):
        doc_id = (r.get("metadata") or {}).get("doc_id")
        key = doc_id or r.get("chunk_id") or id(r)
        if key not in seen:
            seen.add(key)
            merged.append(r)

    return merged


# =============================================================================
# State Schema
# =============================================================================

class TwoTrackState(TypedDict):
    """Two-track workflow state"""
    # Input
    message: str
    context: List[dict]
    user_id: Optional[str]
    project_id: Optional[str]

    # Access control
    user_role: Optional[str]
    user_access_level: int

    # Track routing
    track: str  # "track_a" or "track_b"

    # Policy check
    policy_result: dict
    policy_passed: bool

    # RAG
    retrieved_docs: List[str]
    rag_results: List[dict]  # Raw RAG results with metadata (Phase 1)
    rag_quality_score: float

    # Query refinement (Track A)
    current_query: str
    retry_count: int

    # Context compilation (Track B)
    compiled_context: str
    now_snapshot: dict
    next_snapshot: dict
    why_snapshot: dict

    # Response
    response: str
    confidence: float

    # P0: Intent Routing - Single state key for intent routing
    # CRITICAL: All modules use state["intent"] only (NOT "answer_type" for routing)
    intent: str

    # Phase 1: Authority Gate
    authority_level: str  # suggest | decide | execute | commit
    requires_approval: bool
    approval_type: Optional[str]

    # Phase 1: Evidence
    evidence: List[dict]
    has_sufficient_evidence: bool

    # Phase 1: Failure handling
    failure: Optional[dict]
    recovery: Optional[dict]

    # Phase 1: Response metadata
    trace_id: str
    response_id: str

    # Monitoring
    metrics: dict
    debug_info: dict

    # Status Query Engine (Phase 2)
    answer_type: str  # "status_metric", "status_list", "howto_policy", etc.
    answer_type_confidence: float
    status_query_plan: Optional[dict]
    status_query_result: Optional[dict]
    status_response_contract: Optional[dict]
    use_status_workflow: bool


# =============================================================================
# Track Router - Determines Track A or Track B
# =============================================================================

# Simple question patterns - always use Track A (fast path)
SIMPLE_QUESTION_PATTERNS = [
    # Explanation requests (Korean)
    "뭐야", "뭔가요", "무엇인가요", "어떤 건가요",
    "알려줘", "알려주세요", "설명해줘", "설명해주세요",
    "얘기해줘", "얘기해주세요", "이야기해줘", "이야기해주세요",
    "에 대해", "대해서", "란", "이란",
    # Definition/concept questions (English)
    "what is", "what are", "tell me about", "explain",
]

# Keywords that indicate high-value output requests (Track B)
# These require actual project data compilation and longer responses
HIGH_VALUE_KEYWORDS = [
    # Korean - Detailed explanation requests (use L2 for quality)
    "자세하게", "자세히", "상세하게", "상세히", "구체적으로",
    "깊이있게", "깊이 있게", "심층적으로", "더 알려줘", "더 설명해줘",
    # Korean - Report/Document generation
    "주간보고", "주간 보고", "보고서 작성", "리포트 작성",
    "스프린트계획 세워", "스프린트 계획 수립", "스프린트플래닝 진행",
    "영향도분석", "영향도 분석", "임팩트분석",
    "회고 진행", "회고 작성", "레트로 진행",
    "리파인먼트 진행", "백로그정리", "백로그 정리",
    # Korean - Analysis with project context
    "프로젝트 분석", "스프린트 분석", "진척 분석",
    "리스크 분석", "이슈 분석", "성과 분석",
    # Korean - Summary of actual data
    "프로젝트 요약", "스프린트 요약", "진행상황 요약",
    "이번주 요약", "금주 요약",
    # English
    "weekly report", "sprint plan", "sprint planning",
    "impact analysis", "retrospective", "refinement",
    "project analysis", "sprint analysis",
    "in detail", "detailed", "thoroughly", "elaborate",
]


def classify_track(message: str) -> str:
    """Classify message into Track A or Track B

    Track A: Fast responses for simple questions, definitions, explanations
    Track B: High-value outputs requiring project data compilation or detailed explanations
    """
    if not message:
        return "track_a"

    message_lower = message.lower()

    # First, check for high-value keywords (detailed explanation, reports, analysis)
    # These take priority over simple patterns
    for keyword in HIGH_VALUE_KEYWORDS:
        if keyword in message_lower:
            logger.info(f"Track B keyword matched: '{keyword}'")
            return "track_b"

    # Then, check for simple question patterns - Track A (fast path)
    for pattern in SIMPLE_QUESTION_PATTERNS:
        if pattern in message_lower:
            logger.info(f"Track A: Simple question pattern matched: '{pattern}'")
            return "track_a"

    # Very long requests with specific data requests likely need Track B
    if len(message) > 300 and any(kw in message_lower for kw in ["현재", "이번", "금주", "지난주"]):
        logger.info(f"Track B: Long message with time context ({len(message)} chars)")
        return "track_b"

    # Default to Track A (fast path)
    return "track_a"


# =============================================================================
# Two-Track Workflow Class
# =============================================================================

class TwoTrackWorkflow:
    """
    Two-Track LangGraph Workflow

    Track A: classify_track -> policy_check -> rag_search -> generate_response_l1 -> monitor
    Track B: classify_track -> policy_check -> rag_search -> compile_context -> generate_response_l2 -> verify -> monitor
    """

    def __init__(
        self,
        llm_l1: Optional[Llama] = None,
        llm_l2: Optional[Llama] = None,
        rag_service = None,
        model_path_l1: Optional[str] = None,
        model_path_l2: Optional[str] = None,
    ):
        """
        Initialize two-track workflow.

        Args:
            llm_l1: LFM2 or fast model for Track A
            llm_l2: Gemma-3-12B or quality model for Track B
            rag_service: RAG service instance
            model_path_l1: Path to L1 model (for prompt formatting)
            model_path_l2: Path to L2 model (for prompt formatting)
        """
        # If only one model provided, use it for both tracks
        self.llm_l1 = llm_l1
        self.llm_l2 = llm_l2 or llm_l1
        self.rag_service = rag_service
        self.model_path_l1 = model_path_l1
        self.model_path_l2 = model_path_l2 or model_path_l1

        # Build the graph
        self.graph = self._build_graph()

        logger.info("TwoTrackWorkflow initialized")
        logger.info(f"  L1 model: {model_path_l1}")
        logger.info(f"  L2 model: {model_path_l2}")

    def _build_graph(self) -> StateGraph:
        """Build two-track workflow graph with Phase 1 gates and Status Query Engine"""
        workflow = StateGraph(TwoTrackState)

        # Add nodes - Original workflow
        workflow.add_node("classify_track", self._classify_track_node)
        workflow.add_node("policy_check", self._policy_check_node)
        workflow.add_node("rag_search", self._rag_search_node)
        workflow.add_node("extract_evidence", self._extract_evidence_node)  # Phase 1
        workflow.add_node("verify_rag_quality", self._verify_rag_quality_node)
        workflow.add_node("refine_query", self._refine_query_node)
        workflow.add_node("compile_context", self._compile_context_node)
        workflow.add_node("classify_authority", self._classify_authority_node)  # Phase 1
        workflow.add_node("generate_response_l1", self._generate_response_l1_node)
        workflow.add_node("generate_response_l2", self._generate_response_l2_node)
        workflow.add_node("verify_response", self._verify_response_node)
        workflow.add_node("monitor", self._monitor_node)

        # Add nodes - Status Query Engine (Phase 2)
        workflow.add_node("classify_answer_type", self._classify_answer_type_node)
        workflow.add_node("execute_status_query", self._execute_status_query_node)
        workflow.add_node("build_status_response", self._build_status_response_node)
        workflow.add_node("summarize_status", self._summarize_status_node)

        # P0: Add intent handler nodes
        workflow.add_node("casual_response", self._casual_response_node)
        workflow.add_node("intent_handler", self._execute_intent_handler_node)

        # Entry point
        workflow.set_entry_point("classify_track")

        # classify_track -> policy_check
        workflow.add_edge("classify_track", "policy_check")

        # policy_check -> classify_answer_type (NEW: determine if status query)
        workflow.add_conditional_edges(
            "policy_check",
            self._route_after_policy,
            {
                "blocked": "monitor",  # Policy blocked -> end
                "continue": "classify_answer_type"  # Policy passed -> classify answer type
            }
        )

        # classify_answer_type -> conditional routing based on answer type
        # P0: Enhanced routing with dedicated intent handlers
        workflow.add_conditional_edges(
            "classify_answer_type",
            self._route_after_answer_type,
            {
                "casual_response": "casual_response",        # P0: Casual greetings
                "intent_handler": "intent_handler",          # P0: Dedicated handlers
                "execute_status_query": "execute_status_query",  # Status queries -> direct DB
                "document_query": "rag_search",              # Document queries -> RAG
            }
        )

        # P0: Intent handler goes to monitor (end)
        workflow.add_edge("casual_response", "monitor")
        workflow.add_edge("intent_handler", "monitor")

        # Status Query workflow
        workflow.add_edge("execute_status_query", "build_status_response")
        workflow.add_edge("build_status_response", "summarize_status")
        workflow.add_edge("summarize_status", "monitor")

        # rag_search -> extract_evidence (Phase 1)
        workflow.add_edge("rag_search", "extract_evidence")

        # extract_evidence -> verify_rag_quality
        workflow.add_edge("extract_evidence", "verify_rag_quality")

        # verify_rag_quality -> conditional routing
        workflow.add_conditional_edges(
            "verify_rag_quality",
            self._route_after_rag_quality,
            {
                "refine": "refine_query",  # Quality low -> refine
                "track_a": "classify_authority",  # Track A -> authority check
                "track_b": "compile_context"  # Track B -> compile
            }
        )

        # refine_query -> rag_search (loop)
        workflow.add_edge("refine_query", "rag_search")

        # compile_context -> classify_authority (Phase 1: check authority before generation)
        workflow.add_edge("compile_context", "classify_authority")

        # classify_authority -> conditional routing based on authority
        workflow.add_conditional_edges(
            "classify_authority",
            self._route_after_authority,
            {
                "track_a": "generate_response_l1",
                "track_b": "generate_response_l2",
                "blocked": "monitor",  # Authority denied
            }
        )

        # generate_response_l1 -> monitor (Track A ends)
        workflow.add_edge("generate_response_l1", "monitor")

        # generate_response_l2 -> verify_response
        workflow.add_edge("generate_response_l2", "verify_response")

        # verify_response -> monitor
        workflow.add_edge("verify_response", "monitor")

        # monitor -> END
        workflow.add_edge("monitor", END)

        return workflow.compile()

    # =========================================================================
    # Node Implementations
    # =========================================================================

    def _classify_track_node(self, state: TwoTrackState) -> TwoTrackState:
        """Node: Classify into Track A or Track B"""
        start_time = time.time()
        message = state.get("message") or ""

        track = classify_track(message)

        state["track"] = track
        state["metrics"] = state.get("metrics", {})
        state["metrics"]["classify_time_ms"] = (time.time() - start_time) * 1000
        state["debug_info"] = state.get("debug_info", {})
        state["debug_info"]["track"] = track

        logger.info(f"Classified as {track.upper()}: {message[:50]}...")

        return state

    def _policy_check_node(self, state: TwoTrackState) -> TwoTrackState:
        """Node: L0 Policy enforcement using PolicyEngine"""
        start_time = time.time()

        message = state.get("message") or ""
        user_id = state.get("user_id")
        project_id = state.get("project_id")
        user_role = state.get("user_role")

        # Use the full PolicyEngine for comprehensive checks
        policy_engine = get_policy_engine()
        result = policy_engine.check_request(
            message=message,
            user_id=user_id,
            project_id=project_id,
        )

        policy_result = {
            "passed": result.passed,
            "action": result.action.value,
            "checks": {
                check_name: {
                    "action": check_result.action.value,
                    "warnings": check_result.warnings,
                }
                for check_name, check_result in result.checks.items()
            },
            "blocked_reason": result.blocked_reason,
            "warnings": result.warnings,
        }

        # If PII was masked, update the message
        if result.modified_message:
            state["message"] = result.modified_message
            state["current_query"] = result.modified_message
            logger.info("PII masked in message")

        state["policy_result"] = policy_result
        state["policy_passed"] = result.passed
        state["metrics"]["policy_time_ms"] = (time.time() - start_time) * 1000

        if result.warnings:
            logger.warning(f"Policy warnings: {result.warnings}")

        logger.info(f"Policy check: {'PASSED' if result.passed else 'BLOCKED'} (action={result.action.value})")

        return state

    def _route_after_policy(self, state: TwoTrackState) -> Literal["blocked", "continue"]:
        """Route after policy check"""
        return "continue" if state.get("policy_passed", True) else "blocked"

    # =========================================================================
    # Status Query Engine Nodes (Phase 2)
    # =========================================================================

    def _classify_answer_type_node(self, state: TwoTrackState) -> TwoTrackState:
        """Node: Classify answer type to determine routing path.

        P0 CRITICAL CHANGES:
        - Single state key: state["intent"] only (NOT state["answer_type"] for routing)
        - Intent value = lowercase snake_case (e.g., "backlog_list")
        - Fallback is UNKNOWN -> RAG, NOT status_metric
        """
        start_time = time.time()
        message = state.get("message") or ""

        # Classify answer type
        classifier = get_answer_type_classifier()
        result = classifier.classify(message)

        # ============================================================
        # CRITICAL: Single state key - use "intent" ONLY
        # DO NOT use "answer_type" for routing decisions
        # ============================================================
        intent_value = result.answer_type.value  # e.g., "backlog_list"
        state["intent"] = intent_value

        # Keep answer_type as read-only alias for legacy compatibility
        # But NEVER read from this for routing decisions
        state["answer_type"] = intent_value  # Alias only, DO NOT USE for routing
        state["answer_type_confidence"] = result.confidence
        state["use_status_workflow"] = classifier.is_status_query(result.answer_type)

        state["debug_info"]["answer_type"] = {
            "type": intent_value,
            "intent": intent_value,  # P0: Add intent for clarity
            "confidence": result.confidence,
            "matched_patterns": result.matched_patterns,
            "metrics_requested": getattr(result, 'metrics_requested', []),
            "time_context": getattr(result, 'time_context', 'current'),
            "reasoning": result.reasoning,
        }
        state["debug_info"]["classifier_result"] = {
            "intent": intent_value,
            "confidence": result.confidence,
            "matched_patterns": result.matched_patterns,
        }
        state["metrics"]["answer_type_time_ms"] = (time.time() - start_time) * 1000

        logger.info(
            f"Classified intent: {intent_value} "
            f"(confidence={result.confidence:.2f}, has_handler={has_dedicated_handler(intent_value)})"
        )

        return state

    def _normalize_intent(self, raw_intent: str) -> str:
        """
        Normalize intent to lowercase snake_case.

        STRICT MODE: Normalizes and logs warning if needed.
        """
        if not raw_intent:
            return "unknown"

        normalized = raw_intent.lower().strip()

        if normalized != raw_intent:
            logger.warning(
                f"Intent normalization applied: '{raw_intent}' -> '{normalized}'. "
                "Upstream should return lowercase."
            )

        return normalized

    def _route_after_answer_type(self, state: TwoTrackState) -> Literal[
        "casual_response", "intent_handler", "execute_status_query", "document_query"
    ]:
        """
        Route based on answer type classification.

        P0 Routing rules:
        1. casual -> casual_response
        2. Dedicated handler exists -> intent_handler
        3. status_metric/status_list -> execute_status_query (existing path)
        4. unknown/howto -> document_query (RAG) - NOT status!

        IMPORTANT:
        - Reads from state["intent"] ONLY
        - Normalizes at entry (strict mode)

        CRITICAL (Risk 10): Return values MUST match actual graph node names exactly.
        """
        # Get and normalize intent (single normalization point)
        raw_intent = state.get("intent", "unknown")
        intent = self._normalize_intent(raw_intent)
        state["intent"] = intent  # Store normalized value back

        logger.debug(f"Routing intent: {intent}")

        # 1. Casual: direct response
        if intent == "casual":
            return "casual_response"

        # 2. Dedicated handlers (backlog, sprint, task, risk)
        if has_dedicated_handler(intent):
            return "intent_handler"

        # 3. Status queries: use existing status engine
        if intent in ("status_metric", "status_list", "status_drilldown"):
            return "execute_status_query"

        # 4. CRITICAL: Unknown/howto -> RAG, NOT status
        # This prevents regression to "all questions -> status template"
        logger.info(f"Intent '{intent}' routed to document_query (RAG)")
        return "document_query"

    # =========================================================================
    # P0: Intent Handler Nodes (New in P0)
    # =========================================================================

    def _casual_response_node(self, state: TwoTrackState) -> TwoTrackState:
        """Node: Handle casual greetings directly"""
        state["response"] = (
            "안녕하세요! PMS 어시스턴트입니다 😊\n"
            "프로젝트 일정, 백로그, 리스크, 이슈 등에 대해 무엇이든 물어보세요!"
        )
        state["confidence"] = 1.0
        state["debug_info"]["handler"] = "casual"
        logger.info("Casual response generated")
        return state

    def _execute_intent_handler_node(self, state: TwoTrackState) -> TwoTrackState:
        """
        Node: Execute intent-specific handler.

        For: backlog_list, sprint_progress, task_due_this_week, risk_analysis
        Uses handlers from intent_handlers.py with graceful degradation.
        """
        start_time = time.time()

        # Read from state["intent"] ONLY
        intent = state.get("intent", "unknown")
        project_id = state.get("project_id")
        user_access_level = state.get("user_access_level", 6)
        user_role = state.get("user_role", "MEMBER")
        message = state.get("message", "")

        if not project_id:
            logger.warning("No project_id for intent handler, using default")
            project_id = "proj-001"  # fallback

        # Create handler context
        ctx = HandlerContext(
            project_id=project_id,
            user_access_level=user_access_level,
            user_role=user_role,
            message=message,
        )

        # Get handler
        handler = get_handler(intent)

        if handler is None:
            # Should not happen if routing is correct
            logger.error(f"No handler for intent: {intent}")
            state["response"] = "Unable to process this request."
            state["confidence"] = 0.3
            return state

        # Execute handler (graceful degradation built into handlers)
        try:
            contract = handler(ctx)

            # Render response using intent-specific renderer
            response_text = render_intent_response(contract)

            # Update state
            state["response"] = response_text
            state["confidence"] = 0.95 if contract.has_data() else 0.7
            state["debug_info"]["handler"] = intent
            state["debug_info"]["has_data"] = contract.has_data()
            state["debug_info"]["error_code"] = contract.error_code  # Track errors

            logger.info(
                f"Intent handler executed: {intent}, "
                f"has_data={contract.has_data()}, error_code={contract.error_code}"
            )

        except Exception as e:
            logger.exception(f"Intent handler failed: {e}")
            state["response"] = f"An error occurred while processing your request: {str(e)}"
            state["confidence"] = 0.3
            state["debug_info"]["handler_error"] = str(e)

        state["metrics"]["handler_time_ms"] = (time.time() - start_time) * 1000

        return state

    def _execute_status_query_node(self, state: TwoTrackState) -> TwoTrackState:
        """Node: Execute status query against database

        Uses hybrid approach:
        - STATUS_LIST queries: Use Text-to-SQL for dynamic query generation
        - STATUS_METRIC queries: Use predefined metric executors
        """
        start_time = time.time()

        project_id = state.get("project_id")
        user_access_level = state.get("user_access_level", 6)
        query = state.get("message", "")

        if not project_id:
            logger.warning("No project_id for status query, using default")
            project_id = "proj-001"  # fallback

        answer_type_info = state.get("debug_info", {}).get("answer_type", {})
        answer_type = answer_type_info.get("type", "status_metric")

        logger.info(f"Executing status query: answer_type={answer_type}")

        # Check if this is a LIST query that needs dynamic SQL
        if answer_type == "status_list":
            # Use Text-to-SQL for list queries
            try:
                dynamic_executor = get_dynamic_query_executor()
                result = dynamic_executor.execute_natural_query(query, project_id)

                if result.success and result.row_count > 0:
                    # Format result and store
                    formatted_response = format_query_result(result, query, "markdown")
                    state["status_query_result"] = {
                        "dynamic_query": True,
                        "formatted_response": formatted_response,
                        "data": result.data,
                        "row_count": result.row_count,
                        "sql_used": result.sql_used,
                        "execution_time_ms": result.execution_time_ms,
                    }
                    state["status_query_plan"] = {"type": "dynamic", "query": query}

                    logger.info(
                        f"Dynamic query executed: {result.row_count} rows, "
                        f"{result.execution_time_ms:.1f}ms"
                    )
                    state["metrics"]["status_query_time_ms"] = (time.time() - start_time) * 1000
                    return state
                else:
                    logger.info(f"Dynamic query returned no results, falling back to metrics")
                    # Fall through to metric-based approach

            except Exception as e:
                logger.warning(f"Dynamic query failed, falling back to metrics: {e}")
                # Fall through to metric-based approach

        # Metric-based approach for STATUS_METRIC or fallback
        plan = create_default_plan(project_id, user_access_level)

        if metrics_requested := answer_type_info.get("metrics_requested", []):
            plan.metrics = list(set(plan.metrics + metrics_requested))

        # Always include these core metrics for status queries
        core_metrics = ["story_counts_by_status", "completion_rate", "active_sprint", "project_summary"]
        plan.metrics = list(set(plan.metrics + core_metrics))

        # Validate the plan
        plan = validate_plan(plan, user_access_level, project_id)

        # Execute the query
        executor = get_status_query_executor()
        try:
            query_result = executor.execute(plan)
            state["status_query_result"] = query_result.to_dict()
            state["status_query_plan"] = plan.to_dict()

            logger.info(
                f"Status query executed: {len(plan.metrics)} metrics, "
                f"{query_result.total_query_time_ms:.1f}ms"
            )

        except Exception as e:
            logger.error(f"Status query execution failed: {e}")
            state["status_query_result"] = {"errors": [str(e)]}
            state["status_query_plan"] = plan.to_dict()

        state["metrics"]["status_query_time_ms"] = (time.time() - start_time) * 1000

        return state

    def _build_status_response_node(self, state: TwoTrackState) -> TwoTrackState:
        """Node: Build structured status response from query results"""
        start_time = time.time()

        project_id = state.get("project_id", "unknown")
        query_result_dict = state.get("status_query_result", {})

        # Check if this is a dynamic query result (Text-to-SQL)
        if query_result_dict.get("dynamic_query"):
            # Dynamic query result - use pre-formatted response
            formatted_response = query_result_dict.get("formatted_response", "")

            # Create a minimal contract with the dynamic response
            contract = StatusResponseContract()
            contract.reference_time = datetime.now().strftime("%Y-%m-%d %H:%M KST")
            contract.scope = f"프로젝트: {project_id}"
            contract.data_source = "PostgreSQL 동적 쿼리"
            contract._dynamic_response = formatted_response  # Store for later use

            state["status_response_contract"] = {
                "dynamic_response": formatted_response,
                "row_count": query_result_dict.get("row_count", 0),
                "data": query_result_dict.get("data", []),
                "has_data": True,
            }
            state["debug_info"]["status_contract"] = {
                "has_data": True,
                "dynamic_query": True,
                "row_count": query_result_dict.get("row_count", 0),
            }
            state["metrics"]["build_response_time_ms"] = (time.time() - start_time) * 1000
            return state

        # Check if we have valid results
        if query_result_dict.get("errors") and not query_result_dict.get("metrics"):
            # No data available
            contract = create_no_data_response(
                project_id,
                reason="데이터베이스 조회 실패: " + ", ".join(query_result_dict.get("errors", []))
            )
        else:
            # Build response from query result
            # Reconstruct StatusQueryResult from dict
            from query.status_query_executor import StatusQueryResult, MetricResult
            from query.status_query_plan import StatusQueryPlan

            plan_dict = state.get("status_query_plan", {})
            plan = StatusQueryPlan.from_dict(plan_dict) if plan_dict else create_default_plan(project_id)

            # Create a minimal StatusQueryResult
            query_result = StatusQueryResult(plan=plan)
            query_result.generated_at = query_result_dict.get("generated_at", "")

            # Populate metrics from dict
            metrics_dict = query_result_dict.get("metrics", {})
            for metric_name, metric_data in metrics_dict.items():
                query_result.metrics[metric_name] = MetricResult(
                    metric_name=metric_name,
                    data=metric_data.get("data"),
                    count=metric_data.get("count", 0),
                    error=metric_data.get("error"),
                )

            contract = build_status_response(query_result, project_id)

        state["status_response_contract"] = contract.to_dict()
        state["debug_info"]["status_contract"] = {
            "has_data": contract.has_data(),
            "data_gaps": contract.data_gaps,
            "total_stories": contract.total_stories,
            "completion_rate": contract.completion_rate,
        }
        state["metrics"]["build_response_time_ms"] = (time.time() - start_time) * 1000

        return state

    def _summarize_status_node(self, state: TwoTrackState) -> TwoTrackState:
        """Node: Generate final status response (using contract text or LLM summary)"""
        start_time = time.time()

        contract_dict = state.get("status_response_contract", {})

        # Check if this is a dynamic query response
        if contract_dict.get("dynamic_response"):
            # Use the pre-formatted dynamic response
            response_text = contract_dict["dynamic_response"]
            confidence = 0.95
            state["response"] = response_text
            state["confidence"] = confidence
            state["intent"] = "status_query"
            state["metrics"]["summarize_time_ms"] = (time.time() - start_time) * 1000
            return state

        # Reconstruct contract for text generation
        contract = StatusResponseContract()
        contract.reference_time = contract_dict.get("reference_time", "")
        contract.scope = contract_dict.get("scope", "")
        contract.data_source = contract_dict.get("data_source", "")

        project_info = contract_dict.get("project", {})
        contract.project_name = project_info.get("name")
        contract.project_status = project_info.get("status")
        contract.project_progress = project_info.get("progress")

        sprint_info = contract_dict.get("sprint", {})
        contract.sprint_name = sprint_info.get("name")
        contract.sprint_status = sprint_info.get("status")
        contract.sprint_days_remaining = sprint_info.get("days_remaining")

        metrics_info = contract_dict.get("metrics", {})
        contract.completion_rate = metrics_info.get("completion_rate")
        contract.total_stories = metrics_info.get("total_stories", 0)
        contract.done_stories = metrics_info.get("done_stories", 0)
        contract.in_progress_stories = metrics_info.get("in_progress_stories", 0)
        contract.story_counts_by_status = metrics_info.get("story_counts_by_status", {})
        contract.wip_count = metrics_info.get("wip_count", 0)
        contract.wip_limit = metrics_info.get("wip_limit", 5)

        lists_info = contract_dict.get("lists", {})
        contract.blocked_items = lists_info.get("blocked_items", [])
        contract.overdue_items = lists_info.get("overdue_items", [])
        contract.recent_activity = lists_info.get("recent_activity", [])

        contract.data_gaps = contract_dict.get("data_gaps", [])

        # Generate response text from contract
        if contract.has_data():
            response_text = contract.to_text()
            confidence = 0.95  # High confidence when data-backed
        else:
            response_text = (
                "현재 조회 가능한 프로젝트 데이터가 부족합니다.\n\n"
                f"📍 {contract.scope}\n"
                f"⚠️ {', '.join(contract.data_gaps) if contract.data_gaps else '데이터 없음'}\n\n"
                "프로젝트에 스토리나 스프린트가 등록되어 있는지 확인해주세요."
            )
            confidence = 0.7

        state["response"] = response_text
        state["confidence"] = confidence
        state["intent"] = "status_query"
        state["metrics"]["summarize_time_ms"] = (time.time() - start_time) * 1000

        logger.info(f"Status response generated: {len(response_text)} chars, confidence={confidence}")

        return state

    def _extract_evidence_node(self, state: TwoTrackState) -> TwoTrackState:
        """Node: Extract evidence from RAG results (Phase 1)"""
        start_time = time.time()

        rag_results = state.get("rag_results", [])

        # Use evidence service to extract evidence
        evidence_service = get_evidence_service()
        evidence_result = evidence_service.extract_from_rag(
            rag_results,
            query=state.get("current_query") or state.get("message") or ""
        )

        # Convert to dict format for state
        evidence_list = evidence_service.to_dict_list(evidence_result.items)

        state["evidence"] = evidence_list
        state["has_sufficient_evidence"] = evidence_result.has_sufficient_evidence
        state["debug_info"]["evidence_count"] = len(evidence_list)
        state["debug_info"]["evidence_score"] = evidence_result.total_score
        state["metrics"]["evidence_time_ms"] = (time.time() - start_time) * 1000

        logger.info(
            f"Evidence extracted: {len(evidence_list)} items "
            f"(sufficient={evidence_result.has_sufficient_evidence}, "
            f"score={evidence_result.total_score:.2f})"
        )

        return state

    def _classify_authority_node(self, state: TwoTrackState) -> TwoTrackState:
        """Node: Classify authority level for the response (Phase 1)"""
        start_time = time.time()

        intent = state.get("intent", "general_question")
        user_role = state.get("user_role", "member")
        confidence = state.get("confidence", 0.5)
        has_evidence = state.get("has_sufficient_evidence", False)

        # Use authority classifier
        classifier = get_authority_classifier()
        result = classifier.classify(
            intent=intent,
            user_role=user_role,
            confidence=confidence,
            has_evidence=has_evidence,
        )

        state["authority_level"] = result.level.value
        state["requires_approval"] = result.requires_approval
        state["approval_type"] = result.approval_type

        state["debug_info"]["authority"] = {
            "level": result.level.value,
            "requires_approval": result.requires_approval,
            "approval_type": result.approval_type,
            "reason": result.reason,
            "downgrade_reason": result.downgrade_reason,
        }
        state["metrics"]["authority_time_ms"] = (time.time() - start_time) * 1000

        logger.info(
            f"Authority classified: {result.level.value} "
            f"(approval={result.requires_approval}, type={result.approval_type})"
        )

        # If authority check resulted in downgrade, log it
        if result.downgrade_reason:
            logger.warning(f"Authority downgraded: {result.downgrade_reason}")

        return state

    def _route_after_authority(self, state: TwoTrackState) -> Literal["track_a", "track_b", "blocked"]:
        """Route after authority classification (Phase 1)"""
        track = state.get("track", "track_a")
        authority_level = state.get("authority_level", "suggest")

        # If COMMIT level but not approved, block for now
        # (In full implementation, this would trigger approval flow)
        if authority_level == "commit" and state.get("requires_approval", False):
            # For now, we'll still generate but mark as pending approval
            logger.info("COMMIT action requires approval, continuing with response generation")

        return track

    def _rag_search_node(self, state: TwoTrackState) -> TwoTrackState:
        """Node: RAG search with access control filtering + scope decision"""
        start_time = time.time()

        search_query = state.get("current_query") or state.get("message") or ""
        retry_count = state.get("retry_count", 0)

        # Access control parameters
        project_id = state.get("project_id")
        user_access_level = state.get("user_access_level", 6)
        user_role = state.get("user_role", "MEMBER")
        answer_type = (state.get("answer_type") or "").strip().lower()

        logger.info(f"RAG search (retry={retry_count}): {search_query[:50]}... "
                    f"(project={project_id}, level={user_access_level}, type={answer_type})")

        # Use pre-provided docs if available and first attempt
        if state.get("retrieved_docs") and retry_count == 0:
            logger.info(f"Using pre-provided docs: {len(state['retrieved_docs'])}")
            state["metrics"]["rag_time_ms"] = (time.time() - start_time) * 1000
            return state

        # ========================================
        # Scope Decision (HOWTO_POLICY only)
        # ========================================
        if answer_type == "howto_policy":
            primary_project_id = decide_search_project_id_for_howto(
                query=search_query,
                project_id=project_id,
            )
        else:
            primary_project_id = project_id

        retrieved_docs = []
        filtered = []
        fallback_used = False

        if self.rag_service:
            try:
                # Build filter metadata
                filter_metadata = {
                    "project_id": primary_project_id,
                    "user_access_level": user_access_level,
                }

                results = self.rag_service.search(
                    search_query,
                    top_k=5,
                    filter_metadata=filter_metadata
                )

                # Filter by relevance score
                # RRF scores are much lower (max ~0.033) than weighted scores (0-1)
                merge_method = os.getenv("HYBRID_MERGE_METHOD", "rrf").lower()
                MIN_RELEVANCE_SCORE = 0.005 if merge_method in ("rrf", "rrf_rerank") else 0.3
                filtered = [
                    doc for doc in results
                    if doc.get('relevance_score', 0) >= MIN_RELEVANCE_SCORE
                ]

                logger.info(f"RAG primary search: {len(filtered)} docs "
                            f"(project_id={primary_project_id}, max_score={max_relevance_score(filtered):.4f})")

                # ========================================
                # 2-pass Fallback (HOWTO_POLICY only)
                # ========================================
                FALLBACK_MIN_SCORE = 0.01 if merge_method in ("rrf", "rrf_rerank") else 0.2

                if answer_type == "howto_policy" and should_fallback_to_global(
                    primary_project_id=primary_project_id,
                    results=filtered,
                    min_results=1,
                    min_max_score=FALLBACK_MIN_SCORE,
                ):
                    fallback_filter = {
                        "project_id": None,  # global (includes 'default')
                        "user_access_level": user_access_level,
                    }
                    fallback_results = self.rag_service.search(
                        search_query,
                        top_k=5,
                        filter_metadata=fallback_filter
                    )
                    fallback_filtered = [
                        doc for doc in fallback_results
                        if doc.get('relevance_score', 0) >= MIN_RELEVANCE_SCORE
                    ]

                    filtered = merge_results_project_first(filtered, fallback_filtered)
                    fallback_used = True
                    logger.info(f"RAG fallback: merged to {len(filtered)} docs "
                                f"(fallback_count={len(fallback_filtered)})")

                retrieved_docs = [doc['content'] for doc in filtered]
                state["rag_results"] = filtered

            except Exception as e:
                logger.error(f"RAG search failed: {e}")
                # Phase 1: Handle RAG failure
                failure_handler = get_failure_handler()
                failure_result = failure_handler.handle_failure(
                    FailureCode.TECH_RAG_ERROR,
                    state.get("trace_id", "unknown"),
                    {"error": str(e)}
                )
                state["failure"] = failure_result.get("failure")
                state["recovery"] = failure_result.get("recovery")

        state["retrieved_docs"] = retrieved_docs
        state["rag_results"] = state.get("rag_results", [])
        state["debug_info"]["rag_docs_count"] = len(retrieved_docs)
        state["debug_info"]["access_control"] = {
            "project_id": project_id,
            "primary_project_id": primary_project_id,
            "user_role": user_role,
            "user_access_level": user_access_level,
            "fallback_used": fallback_used,
        }
        state["metrics"]["rag_time_ms"] = (time.time() - start_time) * 1000

        return state

    def _verify_rag_quality_node(self, state: TwoTrackState) -> TwoTrackState:
        """Node: Verify RAG quality"""
        retrieved_docs = state.get("retrieved_docs", [])
        current_query = state.get("current_query") or state.get("message") or ""

        quality_score = 0.0

        # Score based on document count
        if len(retrieved_docs) >= 3:
            quality_score += 0.4
        elif len(retrieved_docs) > 0:
            quality_score += 0.2

        # Score based on keyword matching
        if retrieved_docs:
            keywords = self._extract_keywords(current_query)
            matched = sum(
                any(kw.lower() in doc.lower() for kw in keywords)
                for doc in retrieved_docs
            )

            if matched / len(retrieved_docs) >= 0.5:
                quality_score += 0.6
            elif matched > 0:
                quality_score += 0.3

        state["rag_quality_score"] = quality_score
        state["debug_info"]["rag_quality_score"] = quality_score

        logger.info(f"RAG quality score: {quality_score:.2f}")

        return state

    def _route_after_rag_quality(self, state: TwoTrackState) -> Literal["refine", "track_a", "track_b"]:
        """Route after RAG quality check"""
        quality_score = state.get("rag_quality_score", 0.0)
        retry_count = state.get("retry_count", 0)
        track = state.get("track", "track_a")

        MAX_RETRIES = 2
        QUALITY_THRESHOLD = 0.6

        # If quality is low and retries available, refine query
        if quality_score < QUALITY_THRESHOLD and retry_count < MAX_RETRIES:
            logger.info(f"Quality low ({quality_score:.2f}), refining query...")
            return "refine"

        # Route to appropriate track
        return track

    def _refine_query_node(self, state: TwoTrackState) -> TwoTrackState:
        """Node: Refine query for better RAG results"""
        original_query = state.get("message") or ""
        retry_count = state.get("retry_count", 0)

        # Extract keywords and rebuild query
        keywords = self._extract_keywords(original_query)
        refined_query = " ".join(keywords) if keywords else original_query

        state["current_query"] = refined_query
        state["retry_count"] = retry_count + 1
        state["debug_info"][f"refined_query_{retry_count + 1}"] = refined_query

        logger.info(f"Refined query: {refined_query}")

        return state

    def _compile_context_node(self, state: TwoTrackState) -> TwoTrackState:
        """Node: Compile 3-package context for Track B (Now/Next/Why)"""
        start_time = time.time()

        retrieved_docs = state.get("retrieved_docs", [])
        project_id = state.get("project_id")
        user_id = state.get("user_id")

        # Use SnapshotManager for Now/Next/Why context
        snapshot_manager = get_snapshot_manager()

        try:
            # Generate context snapshot (uses cache if available)
            snapshot = snapshot_manager.generate_snapshot(
                project_id=project_id,
                user_id=user_id,
            )

            now_snapshot = {
                "description": "Current sprint state",
                "data": snapshot.now.to_text() if snapshot.now else "",
                "active_sprint": snapshot.now.active_sprint if snapshot.now else None,
                "wip_count": snapshot.now.wip_count if snapshot.now else 0,
                "wip_limit": snapshot.now.wip_limit if snapshot.now else 5,
                "completion_rate": snapshot.now.sprint_completion_rate if snapshot.now else 0.0,
            }

            next_snapshot = {
                "description": "Upcoming milestones",
                "data": snapshot.next.to_text() if snapshot.next else "",
                "milestones": snapshot.next.upcoming_milestones if snapshot.next else [],
                "pending_reviews": snapshot.next.pending_reviews if snapshot.next else [],
            }

            why_snapshot = {
                "description": "Recent decisions and changes",
                "data": snapshot.why.to_text() if snapshot.why else "",
                "recent_changes": snapshot.why.recent_changes if snapshot.why else [],
                "recent_decisions": snapshot.why.recent_decisions if snapshot.why else [],
            }

            # Build compiled context with snapshot data
            context_parts = []

            # Add Now/Next/Why snapshot text
            snapshot_text = snapshot.to_text()
            if snapshot_text.strip():
                context_parts.append(snapshot_text)

        except Exception as e:
            logger.warning(f"Failed to generate snapshot: {e}")
            now_snapshot = {"description": "Current sprint state", "data": []}
            next_snapshot = {"description": "Upcoming milestones", "data": []}
            why_snapshot = {"description": "Recent decisions and changes", "data": []}
            context_parts = []

        # Add RAG docs
        if retrieved_docs:
            context_parts.append("\n=== Reference Documents ===")
            for i, doc in enumerate(retrieved_docs[:5], 1):
                doc_preview = doc[:500] if len(doc) > 500 else doc
                context_parts.append(f"[Doc {i}] {doc_preview}")

        compiled_context = "\n\n".join(context_parts)

        state["compiled_context"] = compiled_context
        state["now_snapshot"] = now_snapshot
        state["next_snapshot"] = next_snapshot
        state["why_snapshot"] = why_snapshot
        state["metrics"]["compile_time_ms"] = (time.time() - start_time) * 1000

        logger.info(f"Compiled context: {len(compiled_context)} chars (snapshot + {len(retrieved_docs)} docs)")

        return state

    def _generate_response_l1_node(self, state: TwoTrackState) -> TwoTrackState:
        """Node: Generate response using L1 model (fast, Track A)"""
        return self._generate_response(state, use_l2=False)

    def _generate_response_l2_node(self, state: TwoTrackState) -> TwoTrackState:
        """Node: Generate response using L2 model (quality, Track B)"""
        return self._generate_response(state, use_l2=True)

    def _generate_response(self, state: TwoTrackState, use_l2: bool = False) -> TwoTrackState:
        """Generate response using specified model tier"""
        start_time = time.time()

        message = state.get("message") or ""
        context = state.get("context", [])
        retrieved_docs = state.get("retrieved_docs", [])
        compiled_context = state.get("compiled_context", "")
        track = state.get("track", "track_a")

        llm = self.llm_l2 if use_l2 else self.llm_l1
        model_path = self.model_path_l2 if use_l2 else self.model_path_l1

        model_tier = "L2" if use_l2 else "L1"
        logger.info(f"Generating response ({model_tier}, {track}): {message[:50]}...")

        # Handle casual greetings
        if self._is_casual_greeting(message):
            reply = self._get_greeting_response()
            state["response"] = reply
            state["confidence"] = 0.95
            state["intent"] = "casual"
            state["metrics"]["generate_time_ms"] = (time.time() - start_time) * 1000
            return state

        # Handle no RAG docs
        if not retrieved_docs and not compiled_context:
            reply = self._get_out_of_scope_response()
            state["response"] = reply
            state["confidence"] = 0.7
            state["intent"] = "general"
            state["metrics"]["generate_time_ms"] = (time.time() - start_time) * 1000
            return state

        # Build prompt
        if use_l2 and compiled_context:
            prompt = self._build_l2_prompt(message, context, compiled_context, model_path)
        else:
            prompt = self._build_l1_prompt(message, context, retrieved_docs, model_path)

        # Generate response
        try:
            if llm:
                llm.reset()

                # Generation parameters
                temperature = float(os.getenv("TEMPERATURE", "0.35"))
                top_p = float(os.getenv("TOP_P", "0.90"))

                # Dynamic max_tokens based on track and question type
                if use_l2:
                    # Track B: detailed reports need more tokens
                    max_tokens = int(os.getenv("L2_MAX_TOKENS", "3000"))
                else:
                    # Track A: optimize for simple questions
                    base_max_tokens = int(os.getenv("MAX_TOKENS", "1800"))
                    message_lower = message.lower()
                    is_simple_question = any(kw in message_lower for kw in [
                        "무엇", "뭐야", "뭔가요", "이란", "정의", "설명해", "알려줘", "대해"
                    ])
                    is_short_question = len(message) < 30

                    if is_simple_question and is_short_question:
                        max_tokens = min(base_max_tokens, 800)
                        logger.info(f"  → Track A: max_tokens={max_tokens} for definition question")
                    else:
                        max_tokens = base_max_tokens

                response = llm(
                    prompt,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    top_p=top_p,
                    stop=["<end_of_turn>", "<start_of_turn>", "</s>", "<|im_end|>"],
                    echo=False,
                )

                choices = response.get("choices") if response else None
                if choices and len(choices) > 0:
                    text = choices[0].get("text")
                    reply = text.strip() if text else ""
                else:
                    reply = ""
                    logger.warning("LLM response has no choices")

                reply = self._clean_response(reply, model_path)
            else:
                reply = "LLM not available."

        except Exception as e:
            logger.error(f"Response generation failed: {e}")
            reply = "Failed to generate response."

        # Calculate confidence
        confidence = self._calculate_confidence(retrieved_docs, track)

        state["response"] = reply
        state["confidence"] = confidence
        state["intent"] = "pms_query" if retrieved_docs else "general"
        state["metrics"]["generate_time_ms"] = (time.time() - start_time) * 1000
        state["debug_info"]["model_tier"] = model_tier
        state["debug_info"]["prompt_length"] = len(prompt)

        logger.info(f"Response generated ({model_tier}): {reply[:50]}...")

        return state

    def _verify_response_node(self, state: TwoTrackState) -> TwoTrackState:
        """Node: Verify response quality (Track B only)"""
        start_time = time.time()

        response = state.get("response", "")
        retrieved_docs = state.get("retrieved_docs", [])
        message = state.get("message", "")

        verification = {
            "passed": True,
            "issues": [],
            "evidence_score": 0.0,
            "grounded_terms": [],
        }

        # 1. Check response length
        if len(response) < 50:
            verification["issues"].append("Response too short")

        # 2. Evidence checking - verify response is grounded in retrieved docs
        if retrieved_docs:
            # Extract key terms from response
            response_terms = set(self._extract_keywords(response))
            doc_terms = set()
            for doc in retrieved_docs:
                doc_terms.update(self._extract_keywords(doc))

            # Calculate grounding score
            if response_terms:
                grounded = response_terms & doc_terms
                verification["grounded_terms"] = list(grounded)[:10]
                verification["evidence_score"] = len(grounded) / len(response_terms)

                if verification["evidence_score"] < 0.2:
                    verification["issues"].append(
                        f"Low evidence grounding ({verification['evidence_score']:.0%})"
                    )
        else:
            # No docs but Track B expects grounded response
            verification["issues"].append("No reference documents for grounding")

        # 3. Check for hallucination patterns
        hallucination_patterns = [
            (r"제가 생각하기에", "personal opinion"),
            (r"아마도", "uncertainty marker"),
            (r"추측컨대", "speculation"),
            (r"확실하지 않지만", "uncertainty marker"),
            (r"일반적으로 알려진", "vague reference"),
            (r"보통은", "generalization"),
        ]
        for pattern, pattern_type in hallucination_patterns:
            if re.search(pattern, response):
                verification["issues"].append(f"Potential hallucination ({pattern_type})")

        # 4. Check for fabricated statistics/numbers not in source
        number_pattern = r'\b\d{2,}%|\b\d+\.\d+%'
        if response_numbers := set(re.findall(number_pattern, response)):
            doc_numbers = set()
            for doc in retrieved_docs:
                doc_numbers.update(re.findall(number_pattern, doc))

            if fabricated := response_numbers - doc_numbers:
                verification["issues"].append(
                    f"Potentially fabricated statistics: {list(fabricated)[:3]}"
                )

        # 5. Apply PolicyEngine response check
        try:
            policy_engine = get_policy_engine()
            policy_result = policy_engine.check_response(response)
            if policy_result.warnings:
                verification["issues"].extend(
                    [f"Policy: {w}" for w in policy_result.warnings]
                )
            if policy_result.modified_message:
                state["response"] = policy_result.modified_message
                verification["issues"].append("Response modified by policy engine")
        except Exception as e:
            logger.warning(f"Policy response check failed: {e}")

        # Determine pass/fail
        critical_issues = [i for i in verification["issues"] if "hallucination" in i.lower() or "fabricated" in i.lower()]
        verification["passed"] = not critical_issues

        if verification["issues"]:
            logger.warning(f"Verification issues: {verification['issues']}")
        else:
            logger.info(f"Verification passed (evidence_score={verification['evidence_score']:.0%})")

        state["debug_info"]["verification"] = verification
        state["metrics"]["verify_time_ms"] = (time.time() - start_time) * 1000

        return state

    def _monitor_node(self, state: TwoTrackState) -> TwoTrackState:
        """Node: Collect and log metrics including Phase 1 data"""
        metrics = state.get("metrics", {})

        # Calculate total time
        total_time = sum(
            v for k, v in metrics.items()
            if k.endswith("_time_ms")
        )
        metrics["total_time_ms"] = total_time

        # Track-specific metrics
        track = state.get("track", "track_a")
        metrics["track"] = track

        # Phase 1: Add authority and evidence metrics
        metrics["authority_level"] = state.get("authority_level", "suggest")
        metrics["requires_approval"] = state.get("requires_approval", False)
        metrics["evidence_count"] = len(state.get("evidence", []))
        metrics["has_sufficient_evidence"] = state.get("has_sufficient_evidence", False)
        metrics["has_failure"] = state.get("failure") is not None

        # Log metrics
        trace_id = state.get("trace_id", "unknown")
        logger.info(f"=== Workflow Metrics ({track.upper()}, trace={trace_id}) ===")
        logger.info(f"  Total time: {total_time:.1f}ms")
        for key, value in metrics.items():
            if key.endswith("_time_ms") and key != "total_time_ms":
                logger.info(f"  {key}: {value:.1f}ms")

        # Phase 1: Log authority and evidence
        logger.info(f"  Authority: {metrics['authority_level']} (approval={metrics['requires_approval']})")
        logger.info(f"  Evidence: {metrics['evidence_count']} items (sufficient={metrics['has_sufficient_evidence']})")

        # Check latency targets
        if track == "track_a" and total_time > 500:
            logger.warning(f"Track A latency exceeded target (500ms): {total_time:.1f}ms")
        elif track == "track_b" and total_time > 90000:
            logger.warning(f"Track B latency exceeded target (90s): {total_time:.1f}ms")

        # Phase 1: Log failure if present
        if state.get("failure"):
            failure = state["failure"]
            logger.warning(
                f"  Failure: {failure.get('code', 'unknown')} - {failure.get('message', '')}"
            )

        state["metrics"] = metrics

        return state

    # =========================================================================
    # Helper Methods
    # =========================================================================

    def _extract_keywords(self, query: str) -> List[str]:
        """Extract keywords from query"""
        if not query:
            return []

        stopwords = {
            "이", "가", "은", "는", "을", "를", "에", "에서", "로", "으로", "의",
            "도", "만", "까지", "부터", "께", "에게", "한테",
            "뭐", "뭐야", "어떻게", "무엇", "대해", "알려줘", "알려주세요",
            "설명", "해줘", "해주세요", "좀", "요", "야"
        }

        tokens = []
        for word in query.split():
            word = word.strip(".,!?;:()[]{}\"'")
            if len(word) < 2 or word.lower() in stopwords:
                continue

            # Remove common suffixes
            for suffix in ["에서", "으로", "에게", "까지", "부터", "에", "를", "을", "이", "가", "은", "는", "의"]:
                if word.endswith(suffix) and len(word) > len(suffix) + 1:
                    word = word[:-len(suffix)]
                    break

            if len(word) >= 2:
                tokens.append(word)

        return tokens

    def _is_casual_greeting(self, message: str) -> bool:
        """Check if message is a casual greeting"""
        if not message or len(message) > 20:
            return False

        greetings = ["안녕", "고마워", "감사", "반가워", "ㅎㅎ", "ㅋㅋ"]
        message_lower = message.lower()

        return any(g in message_lower for g in greetings)

    def _get_greeting_response(self) -> str:
        """Get greeting response"""
        return (
            "안녕하세요! PMS 도우미예요 😊 "
            "프로젝트 일정, 리스크, 이슈 등 궁금한 거 있으면 편하게 물어봐 주세요!"
        )

    def _get_out_of_scope_response(self) -> str:
        """Get out of scope response"""
        return (
            "음, 그건 제가 도움드리기 어려운 내용이에요 😅 "
            "프로젝트 일정, 진척, 리스크, 이슈 같은 PMS 관련 질문이면 도와드릴 수 있어요!"
        )

    def _build_l1_prompt(
        self,
        message: str,
        context: List[dict],
        retrieved_docs: List[str],
        model_path: Optional[str]
    ) -> str:
        """Build prompt for L1 (fast) response"""
        message_lower = message.lower()

        # Ultra-short prompt for simple definition questions
        is_definition = any(kw in message_lower for kw in ["뭐야", "뭔가요", "무엇", "이란", "란"])
        is_short = len(message) < 30

        if is_definition and is_short:
            system_prompt = "당신은 프로젝트 관리 전문가입니다. 컨텍스트를 활용해 정의와 핵심 특징을 적절하게 설명하세요."
        else:
            system_prompt = """당신은 PMS 전문 어시스턴트입니다.
규칙: 컨텍스트 활용, 추측 금지, 핵심 위주로 적절하게 답변."""

        return self._build_prompt(message, context, retrieved_docs, system_prompt, model_path)

    def _build_l2_prompt(
        self,
        message: str,
        context: List[dict],
        compiled_context: str,
        model_path: Optional[str]
    ) -> str:
        """Build prompt for L2 (quality) response"""
        message_lower = message.lower()

        # Check if this is a report request
        report_keywords = ["주간보고", "보고서", "리포트", "weekly report"]
        is_report_request = any(kw in message_lower for kw in report_keywords)

        if is_report_request:
            system_prompt = """당신은 PMS 관리 어시스턴트이며 프로젝트 관리 및 주간 보고서 작성 담당자입니다.

철칙:
- 제공된 컨텍스트만 사용하세요. 추측하지 마세요.
- 데이터가 부족하면 "데이터가 부족합니다"라고 답변하세요.
- 전문적이고 객관적인 톤을 유지하세요.

주간보고서 구조:
1. 제목: [프로젝트명] 주간보고서 (기간: YYYY-MM-DD ~ YYYY-MM-DD)
2. 요약: 3~5문장
3. 주요 완료 태스크: 리스트
4. 진행 중 리스크: 테이블
5. 다음 주 계획: 리스트
6. 핵심 메트릭: bullet points"""
        else:
            # General L2 prompt for analysis/summary without report structure
            system_prompt = """당신은 PMS 관리 어시스턴트입니다.

철칙:
- 제공된 컨텍스트만 사용하세요. 추측하지 마세요.
- 데이터가 부족하면 "데이터가 부족합니다"라고 답변하세요.
- 전문적이고 객관적인 톤을 유지하세요.
- 질문에 맞는 형식으로 답변하세요 (불필요한 보고서 형식 사용 금지)."""

        # Use compiled context instead of raw docs
        return self._build_prompt(message, context, [compiled_context], system_prompt, model_path)

    def _build_prompt(
        self,
        message: str,
        context: List[dict],
        docs: List[str],
        system_prompt: str,
        model_path: Optional[str]
    ) -> str:
        """Build model-specific prompt"""
        prompt_parts = []

        is_gemma = model_path and "gemma" in model_path.lower()
        is_qwen = model_path and "qwen" in model_path.lower()

        if is_gemma:
            # Gemma format
            prompt_parts.extend([
                f"<start_of_turn>user\n{system_prompt}<end_of_turn>",
                "<start_of_turn>model\n네, 알겠습니다.<end_of_turn>"
            ])

            for msg in context[-5:]:
                role = "user" if msg.get("role") == "user" else "model"
                prompt_parts.append(f"<start_of_turn>{role}\n{msg.get('content', '')}<end_of_turn>")

            if docs:
                context_text = "\n".join(doc[:500] for doc in docs[:5])
                prompt_parts.append(f"<start_of_turn>user\n참고 정보:\n{context_text}\n\n질문: {message}<end_of_turn>")
            else:
                prompt_parts.append(f"<start_of_turn>user\n{message}<end_of_turn>")

            prompt_parts.append("<start_of_turn>model\n")

        elif is_qwen:
            # Qwen ChatML format with /no_think
            prompt_parts.append(f"<|im_start|>system\n{system_prompt}<|im_end|>")

            for msg in context[-5:]:
                role = msg.get("role", "user")
                prompt_parts.append(f"<|im_start|>{role}\n{msg.get('content', '')}<|im_end|>")

            if docs:
                context_text = "\n".join(doc[:500] for doc in docs[:5])
                prompt_parts.append(f"<|im_start|>user\n참고 정보:\n{context_text}\n\n질문: {message} /no_think<|im_end|>")
            else:
                prompt_parts.append(f"<|im_start|>user\n{message} /no_think<|im_end|>")

            prompt_parts.append("<|im_start|>assistant\n")

        else:
            # Default ChatML format (LFM2, Llama, etc.)
            prompt_parts.append(f"<|im_start|>system\n{system_prompt}<|im_end|>")

            # Limit context for simple questions
            message_lower = message.lower()
            is_simple = len(message) < 30 and any(kw in message_lower for kw in ["뭐야", "무엇", "이란"])

            for msg in context[-3:] if is_simple else context[-5:]:
                role = msg.get("role", "user")
                prompt_parts.append(f"<|im_start|>{role}\n{msg.get('content', '')}<|im_end|>")

            if docs:
                # Reduce context for simple definition questions
                doc_limit = 3 if is_simple else 5
                char_limit = 400 if is_simple else 500
                context_text = "\n".join(doc[:char_limit] for doc in docs[:doc_limit])
                prompt_parts.append(f"<|im_start|>user\n참고:\n{context_text}\n\n질문: {message}<|im_end|>")
            else:
                prompt_parts.append(f"<|im_start|>user\n{message}<|im_end|>")

            prompt_parts.append("<|im_start|>assistant\n")

        return "\n".join(prompt_parts)

    def _clean_response(self, reply: str, model_path: Optional[str] = None) -> str:
        """Clean up model response"""
        if not reply:
            return ""

        # Remove special tokens
        tokens_to_remove = [
            "<start_of_turn>", "<end_of_turn>",
            "<|im_start|>", "<|im_end|>",
            "</s>", "<think>", "</think>"
        ]
        for token in tokens_to_remove:
            reply = reply.replace(token, "")

        # Remove role labels
        for label in ["model", "assistant", "user", "system"]:
            if reply.lower().startswith(label):
                reply = reply[len(label):].strip()
                if reply.startswith(":"):
                    reply = reply[1:].strip()

        # Remove duplicate lines
        lines = reply.split('\n')
        seen = set()
        unique_lines = []
        for line in lines:
            stripped = line.strip()
            if stripped and stripped not in seen:
                seen.add(stripped)
                unique_lines.append(line)
            elif not stripped:
                unique_lines.append(line)
        reply = '\n'.join(unique_lines)

        # Clean up leading punctuation
        while reply and reply[0] in '.。:：-–—':
            reply = reply[1:].strip()

        return reply.strip()

    def _calculate_confidence(self, retrieved_docs: List[str], track: str) -> float:
        """Calculate response confidence"""
        base = 0.7 if track == "track_a" else 0.75

        if retrieved_docs:
            boost = min(0.15, len(retrieved_docs) * 0.05)
            base = min(0.95, base + boost)

        return round(base, 2)

    # =========================================================================
    # Public API
    # =========================================================================

    def run(
        self,
        message: str,
        context: List[dict] = None,
        retrieved_docs: List[str] = None,
        user_id: Optional[str] = None,
        project_id: Optional[str] = None,
        user_role: Optional[str] = None,
        user_access_level: int = 6,
    ) -> dict:
        """
        Run the two-track workflow with access control and Phase 1 gates.

        Args:
            message: User message
            context: Conversation history
            retrieved_docs: Pre-retrieved RAG documents (optional)
            user_id: User ID for policy checks
            project_id: Project ID for scope validation and RAG filtering
            user_role: User's role for access control (DEVELOPER, PM, etc.)
            user_access_level: Explicit access level (1-6, higher = more access)

        Returns:
            dict with reply, confidence, intent, track, authority, evidence, metrics
        """
        # Generate unique IDs for tracing
        trace_id = str(uuid.uuid4())[:8]
        response_id = str(uuid.uuid4())

        initial_state: TwoTrackState = {
            "message": message,
            "context": context or [],
            "user_id": user_id,
            "project_id": project_id,
            "user_role": user_role or "MEMBER",
            "user_access_level": user_access_level,
            "track": "track_a",
            "policy_result": {},
            "policy_passed": True,
            "retrieved_docs": retrieved_docs or [],
            "rag_results": [],  # Phase 1: Raw RAG results
            "rag_quality_score": 0.0,
            "current_query": message,
            "retry_count": 0,
            "compiled_context": "",
            "now_snapshot": {},
            "next_snapshot": {},
            "why_snapshot": {},
            "response": "",
            "confidence": 0.0,
            "intent": "",
            # Phase 1: Authority Gate
            "authority_level": "suggest",
            "requires_approval": False,
            "approval_type": None,
            # Phase 1: Evidence
            "evidence": [],
            "has_sufficient_evidence": False,
            # Phase 1: Failure handling
            "failure": None,
            "recovery": None,
            # Phase 1: Tracing
            "trace_id": trace_id,
            "response_id": response_id,
            # Monitoring
            "metrics": {},
            "debug_info": {},
            # Status Query Engine (Phase 2)
            "answer_type": "",
            "answer_type_confidence": 0.0,
            "status_query_plan": None,
            "status_query_result": None,
            "status_response_contract": None,
            "use_status_workflow": False,
        }

        logger.info(f"Starting two-track workflow (trace={trace_id}): {message[:50]}...")

        # Run graph
        final_state = self.graph.invoke(initial_state)

        logger.info(
            f"Workflow complete (trace={trace_id}): track={final_state.get('track')}, "
            f"intent={final_state.get('intent')}, "
            f"confidence={final_state.get('confidence')}, "
            f"authority={final_state.get('authority_level')}"
        )

        return {
            "reply": final_state.get("response", "음, 답변을 만들지 못했어요 🤔 다시 질문해주실래요?"),
            "confidence": final_state.get("confidence", 0.0),
            "intent": final_state.get("intent"),
            "track": final_state.get("track"),
            "rag_docs_count": len(final_state.get("retrieved_docs", [])),
            "authority": {
                "level": final_state.get("authority_level", "suggest"),
                "requires_approval": final_state.get("requires_approval", False),
                "approval_type": final_state.get("approval_type"),
            },
            "evidence": final_state.get("evidence", []),
            "has_sufficient_evidence": final_state.get("has_sufficient_evidence", False),
            "failure": final_state.get("failure"),
            "recovery": final_state.get("recovery"),
            "trace_id": trace_id,
            "response_id": response_id,
            "metrics": final_state.get("metrics", {}),
            "debug_info": final_state.get("debug_info", {}),
            "answer_type": final_state.get("answer_type", ""),
            "used_status_workflow": final_state.get("use_status_workflow", False),
        }

    def run_with_ai_response(
        self,
        message: str,
        context: List[dict] = None,
        retrieved_docs: List[str] = None,
        user_id: Optional[str] = None,
        project_id: Optional[str] = None,
        user_role: Optional[str] = None,
        user_access_level: int = 6,
    ) -> AIResponse:
        """
        Run workflow and return full AIResponse object (Phase 1).

        This method is useful for integrations that need the full
        standardized response schema with all Phase 1 fields.
        """
        result = self.run(
            message=message,
            context=context,
            retrieved_docs=retrieved_docs,
            user_id=user_id,
            project_id=project_id,
            user_role=user_role,
            user_access_level=user_access_level,
        )

        # Convert evidence to Evidence objects
        evidence_items = [
            Evidence(
                source_type=e.get("source_type", "document"),
                source_id=e.get("source_id", ""),
                source_title=e.get("title", "Unknown"),
                relevance_score=e.get("relevance_score", 0),
                excerpt=e.get("excerpt"),
                url=e.get("url"),
            )
            for e in result.get("evidence", [])
        ]

        # Determine status
        if result.get("failure"):
            status = ResponseStatus.FAILED
        elif result.get("authority", {}).get("requires_approval"):
            status = ResponseStatus.PENDING_APPROVAL
        else:
            status = ResponseStatus.SUCCESS

        return AIResponse(
            response_id=result.get("response_id", ""),
            content=result.get("reply", ""),
            intent=result.get("intent", ""),
            authority_level=result.get("authority", {}).get("level", "suggest"),
            requires_approval=result.get("authority", {}).get("requires_approval", False),
            approval_type=result.get("authority", {}).get("approval_type"),
            confidence=result.get("confidence", 0.0),
            evidence=evidence_items,
            has_sufficient_evidence=result.get("has_sufficient_evidence", False),
            status=status,
            failure=result.get("failure"),
            recovery=result.get("recovery"),
            trace_id=result.get("trace_id", ""),
            processing_time_ms=int(result.get("metrics", {}).get("total_time_ms", 0)),
            model_used=self.model_path_l2 if result.get("track") == "track_b" else self.model_path_l1,
            track=result.get("track", ""),
        )
