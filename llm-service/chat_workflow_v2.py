"""
Two-Track LangGraph Chat Workflow v2

Track A (High-frequency, low-cost): Fast responses for FAQ, status queries
Track B (High-value outputs): Quality responses for reports, analysis

Reference: docs/PMS 최적화 방안.md
"""

from typing import TypedDict, Literal, List, Optional, Dict, Any
from langgraph.graph import StateGraph, END
from llama_cpp import Llama
import logging
import re
import os
import time

from policy_engine import get_policy_engine, PolicyAction
from context_snapshot import get_snapshot_manager, ContextSnapshot

logger = logging.getLogger(__name__)


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
    intent: str

    # Monitoring
    metrics: dict
    debug_info: dict


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
        """Build two-track workflow graph"""
        workflow = StateGraph(TwoTrackState)

        # Add nodes
        workflow.add_node("classify_track", self._classify_track_node)
        workflow.add_node("policy_check", self._policy_check_node)
        workflow.add_node("rag_search", self._rag_search_node)
        workflow.add_node("verify_rag_quality", self._verify_rag_quality_node)
        workflow.add_node("refine_query", self._refine_query_node)
        workflow.add_node("compile_context", self._compile_context_node)
        workflow.add_node("generate_response_l1", self._generate_response_l1_node)
        workflow.add_node("generate_response_l2", self._generate_response_l2_node)
        workflow.add_node("verify_response", self._verify_response_node)
        workflow.add_node("monitor", self._monitor_node)

        # Entry point
        workflow.set_entry_point("classify_track")

        # classify_track -> policy_check
        workflow.add_edge("classify_track", "policy_check")

        # policy_check -> conditional routing based on policy result
        workflow.add_conditional_edges(
            "policy_check",
            self._route_after_policy,
            {
                "blocked": "monitor",  # Policy blocked -> end
                "continue": "rag_search"  # Policy passed -> RAG search
            }
        )

        # rag_search -> verify_rag_quality
        workflow.add_edge("rag_search", "verify_rag_quality")

        # verify_rag_quality -> conditional routing
        workflow.add_conditional_edges(
            "verify_rag_quality",
            self._route_after_rag_quality,
            {
                "refine": "refine_query",  # Quality low -> refine
                "track_a": "generate_response_l1",  # Track A -> L1
                "track_b": "compile_context"  # Track B -> compile
            }
        )

        # refine_query -> rag_search (loop)
        workflow.add_edge("refine_query", "rag_search")

        # compile_context -> generate_response_l2
        workflow.add_edge("compile_context", "generate_response_l2")

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
        message = state["message"]

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

        message = state["message"]
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
        if not state.get("policy_passed", True):
            return "blocked"
        return "continue"

    def _rag_search_node(self, state: TwoTrackState) -> TwoTrackState:
        """Node: RAG search with access control filtering"""
        start_time = time.time()

        search_query = state.get("current_query", state["message"])
        retry_count = state.get("retry_count", 0)

        # Access control parameters
        project_id = state.get("project_id")
        user_access_level = state.get("user_access_level", 6)
        user_role = state.get("user_role", "MEMBER")

        logger.info(f"RAG search (retry={retry_count}): {search_query[:50]}... (project={project_id}, level={user_access_level})")

        # Use pre-provided docs if available and first attempt
        if state.get("retrieved_docs") and retry_count == 0:
            logger.info(f"Using pre-provided docs: {len(state['retrieved_docs'])}")
            state["metrics"]["rag_time_ms"] = (time.time() - start_time) * 1000
            return state

        retrieved_docs = []

        if self.rag_service:
            try:
                # Build filter metadata with access control
                filter_metadata = {
                    "project_id": project_id,
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
                if merge_method in ("rrf", "rrf_rerank"):
                    MIN_RELEVANCE_SCORE = 0.005  # RRF: k=60, max score ~0.033
                else:
                    MIN_RELEVANCE_SCORE = 0.3    # Weighted: scores 0-1
                filtered = [
                    doc for doc in results
                    if doc.get('relevance_score', 0) >= MIN_RELEVANCE_SCORE
                ]

                retrieved_docs = [doc['content'] for doc in filtered]
                logger.info(f"RAG found {len(retrieved_docs)} docs (filtered from {len(results)}, threshold={MIN_RELEVANCE_SCORE}, method={merge_method})")

            except Exception as e:
                logger.error(f"RAG search failed: {e}")

        state["retrieved_docs"] = retrieved_docs
        state["debug_info"]["rag_docs_count"] = len(retrieved_docs)
        state["debug_info"]["access_control"] = {
            "project_id": project_id,
            "user_role": user_role,
            "user_access_level": user_access_level,
        }
        state["metrics"]["rag_time_ms"] = (time.time() - start_time) * 1000

        return state

    def _verify_rag_quality_node(self, state: TwoTrackState) -> TwoTrackState:
        """Node: Verify RAG quality"""
        retrieved_docs = state.get("retrieved_docs", [])
        current_query = state.get("current_query", state["message"])

        quality_score = 0.0

        # Score based on document count
        if len(retrieved_docs) >= 3:
            quality_score += 0.4
        elif len(retrieved_docs) > 0:
            quality_score += 0.2

        # Score based on keyword matching
        if retrieved_docs:
            keywords = self._extract_keywords(current_query)
            matched = 0
            for doc in retrieved_docs:
                if any(kw.lower() in doc.lower() for kw in keywords):
                    matched += 1

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
        original_query = state["message"]
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
                "active_sprint": snapshot.now.active_sprint,
                "wip_count": snapshot.now.wip_count,
                "wip_limit": snapshot.now.wip_limit,
                "completion_rate": snapshot.now.sprint_completion_rate,
            }

            next_snapshot = {
                "description": "Upcoming milestones",
                "data": snapshot.next.to_text() if snapshot.next else "",
                "milestones": snapshot.next.upcoming_milestones,
                "pending_reviews": snapshot.next.pending_reviews,
            }

            why_snapshot = {
                "description": "Recent decisions and changes",
                "data": snapshot.why.to_text() if snapshot.why else "",
                "recent_changes": snapshot.why.recent_changes,
                "recent_decisions": snapshot.why.recent_decisions,
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

        message = state["message"]
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
                base_max_tokens = int(os.getenv("MAX_TOKENS", "1800"))

                # Dynamic max_tokens based on track and question type
                if use_l2:
                    # Track B: detailed reports need more tokens
                    max_tokens = int(os.getenv("L2_MAX_TOKENS", "3000"))
                else:
                    # Track A: optimize for simple questions
                    message_lower = message.lower()
                    is_simple_question = any(kw in message_lower for kw in [
                        "무엇", "뭐야", "뭔가요", "이란", "정의", "설명해", "알려줘", "대해"
                    ])
                    is_short_question = len(message) < 30

                    if is_simple_question and is_short_question:
                        max_tokens = min(base_max_tokens, 500)
                        logger.info(f"  → Track A: reduced max_tokens={max_tokens} for simple question")
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

                reply = response["choices"][0]["text"].strip()
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
        response_numbers = set(re.findall(number_pattern, response))
        if response_numbers:
            doc_numbers = set()
            for doc in retrieved_docs:
                doc_numbers.update(re.findall(number_pattern, doc))

            fabricated = response_numbers - doc_numbers
            if fabricated:
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
        verification["passed"] = len(critical_issues) == 0

        if verification["issues"]:
            logger.warning(f"Verification issues: {verification['issues']}")
        else:
            logger.info(f"Verification passed (evidence_score={verification['evidence_score']:.0%})")

        state["debug_info"]["verification"] = verification
        state["metrics"]["verify_time_ms"] = (time.time() - start_time) * 1000

        return state

    def _monitor_node(self, state: TwoTrackState) -> TwoTrackState:
        """Node: Collect and log metrics"""
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

        # Log metrics
        logger.info(f"=== Workflow Metrics ({track.upper()}) ===")
        logger.info(f"  Total time: {total_time:.1f}ms")
        for key, value in metrics.items():
            if key.endswith("_time_ms") and key != "total_time_ms":
                logger.info(f"  {key}: {value:.1f}ms")

        # Check latency targets
        if track == "track_a" and total_time > 500:
            logger.warning(f"Track A latency exceeded target (500ms): {total_time:.1f}ms")
        elif track == "track_b" and total_time > 90000:
            logger.warning(f"Track B latency exceeded target (90s): {total_time:.1f}ms")

        state["metrics"] = metrics

        return state

    # =========================================================================
    # Helper Methods
    # =========================================================================

    def _extract_keywords(self, query: str) -> List[str]:
        """Extract keywords from query"""
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
        if len(message) > 20:
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
            prompt_parts.append(f"<start_of_turn>user\n{system_prompt}<end_of_turn>")
            prompt_parts.append("<start_of_turn>model\n네, 알겠습니다.<end_of_turn>")

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
        Run the two-track workflow with access control.

        Args:
            message: User message
            context: Conversation history
            retrieved_docs: Pre-retrieved RAG documents (optional)
            user_id: User ID for policy checks
            project_id: Project ID for scope validation and RAG filtering
            user_role: User's role for access control (DEVELOPER, PM, etc.)
            user_access_level: Explicit access level (1-6, higher = more access)

        Returns:
            dict with reply, confidence, intent, track, metrics
        """
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
            "metrics": {},
            "debug_info": {},
        }

        logger.info(f"Starting two-track workflow: {message[:50]}...")

        # Run graph
        final_state = self.graph.invoke(initial_state)

        logger.info(
            f"Workflow complete: track={final_state.get('track')}, "
            f"intent={final_state.get('intent')}, "
            f"confidence={final_state.get('confidence')}"
        )

        return {
            "reply": final_state.get("response", "음, 답변을 만들지 못했어요 🤔 다시 질문해주실래요?"),
            "confidence": final_state.get("confidence", 0.0),
            "intent": final_state.get("intent"),
            "track": final_state.get("track"),
            "rag_docs_count": len(final_state.get("retrieved_docs", [])),
            "metrics": final_state.get("metrics", {}),
            "debug_info": final_state.get("debug_info", {}),
        }
