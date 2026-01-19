"""
LangGraph 기반 채팅 워크플로우
RAG와 일반 LLM을 지능적으로 라우팅
"""

from typing import TypedDict, Literal, List, Optional, Union
from langgraph.graph import StateGraph, END
from llama_cpp import Llama
import logging
import re
import os

# RAG 서비스 임포트 (타입 호환성)
try:
    from rag_service_helix import RAGServiceHelix as RAGService
except ImportError:
    try:
        from rag_service import RAGService
    except ImportError:
        RAGService = None

logger = logging.getLogger(__name__)


# 상태 스키마 정의
class ChatState(TypedDict):
    """채팅 워크플로우 상태"""
    message: str  # 사용자 메시지
    context: List[dict]  # 대화 컨텍스트
    intent: Optional[str]  # 의도 분류 결과 (casual, pms_query, general)
    retrieved_docs: List[str]  # RAG 검색 결과
    response: Optional[str]  # 최종 응답
    confidence: float  # 응답 신뢰도
    debug_info: dict  # 디버깅 정보

    # 쿼리 개선 관련 필드
    current_query: str  # 현재 검색 쿼리 (개선될 수 있음)
    retry_count: int  # 재시도 횟수
    extracted_terms: List[str]  # 추출된 핵심 용어


class ChatWorkflow:
    """LangGraph 기반 채팅 워크플로우"""

    def __init__(self, llm: Llama, rag_service: Optional[RAGService] = None, model_path: Optional[str] = None):
        self.llm = llm
        self.rag_service = rag_service
        self.model_path = model_path
        self.graph = self._build_graph()

    def _build_graph(self) -> StateGraph:
        """워크플로우 그래프 구축 (RAG 우선 접근 + 쿼리 개선 루프)"""

        # 그래프 초기화
        workflow = StateGraph(ChatState)

        # 노드 추가
        workflow.add_node("classify_intent_simple", self.classify_intent_simple_node)
        workflow.add_node("rag_search", self.rag_search_node)
        workflow.add_node("verify_rag_quality", self.verify_rag_quality_node)  # ✨ 새 노드
        workflow.add_node("refine_query", self.refine_query_node)              # ✨ 새 노드
        workflow.add_node("refine_intent", self.refine_intent_node)
        workflow.add_node("generate_response", self.generate_response_node)

        # 엔트리 포인트 설정
        workflow.set_entry_point("classify_intent_simple")

        # 간단한 분류 후 라우팅
        workflow.add_conditional_edges(
            "classify_intent_simple",
            self.route_by_simple_intent,
            {
                "casual": "generate_response",  # 명확한 인사 → 바로 응답
                "uncertain": "rag_search"        # 나머지 → RAG 검색
            }
        )

        # RAG 검색 → 품질 검증
        workflow.add_edge("rag_search", "verify_rag_quality")

        # 품질 검증 → 재검색 or 다음 단계 (조건부 라우팅)
        workflow.add_conditional_edges(
            "verify_rag_quality",
            self.should_refine_query,
            {
                "refine": "refine_query",      # 품질 낮음 → 쿼리 개선
                "proceed": "refine_intent"     # 품질 좋음 → 다음 단계
            }
        )

        # 쿼리 개선 → RAG 재검색 (루프 형성)
        workflow.add_edge("refine_query", "rag_search")

        # 의도 재분류 → 응답 생성
        workflow.add_edge("refine_intent", "generate_response")

        # 응답 생성 후 종료
        workflow.add_edge("generate_response", END)

        return workflow.compile()

    def classify_intent_simple_node(self, state: ChatState) -> ChatState:
        """노드 1: 간단한 의도 분류 (명확한 인사말만 처리)"""
        message = state["message"]

        logger.info(f"Simple classification for message: {message[:50]}...")

        # 명확한 인사말만 분류
        intent = self._classify_casual_only(message)

        state["intent"] = intent
        state["debug_info"] = state.get("debug_info", {})
        state["debug_info"]["initial_intent"] = intent

        logger.info(f"Simple intent: {intent}")

        return state

    def _classify_casual_only(self, message: str) -> str:
        """명확한 인사말만 분류 (나머지는 uncertain)"""
        message_lower = message.lower()

        # 명확한 인사 패턴 (짧고 명확한 것만)
        casual_patterns = [
            "안녕", "고마워", "감사", "미안", "죄송",
            "잘가", "반가", "ㅎㅎ", "ㅋㅋ", "ㄱㅅ"
        ]

        # 짧은 메시지 (10자 미만)에서 인사말 체크
        if len(message) < 10:
            for pattern in casual_patterns:
                if pattern in message_lower:
                    return "casual"

        # 나머지는 모두 uncertain (RAG 검색 필요)
        return "uncertain"

    def route_by_simple_intent(self, state: ChatState) -> Literal["casual", "uncertain"]:
        """간단한 의도 기반 라우팅"""
        intent = state.get("intent", "uncertain")
        logger.info(f"Simple routing: {intent}")
        return intent

    def refine_intent_node(self, state: ChatState) -> ChatState:
        """노드 5: RAG 결과 기반 의도 재분류"""
        message = state["message"]
        retrieved_docs = state.get("retrieved_docs", [])

        logger.info(f"Refining intent based on RAG results: {len(retrieved_docs)} docs found")

        # RAG 결과 기반으로 의도 결정
        if len(retrieved_docs) > 0:
            # RAG 문서가 있으면 → PMS 관련 질문
            intent = "pms_query"
            logger.info(f"  ✅ RAG docs found → pms_query")
        else:
            # RAG 문서가 없으면 → 일반 질문
            intent = "general"
            logger.info(f"  ⚠️ No RAG docs → general")

        state["intent"] = intent
        state["debug_info"]["final_intent"] = intent

        return state

    def rag_search_node(self, state: ChatState) -> ChatState:
        """노드 2: RAG 검색 (항상 실행)"""
        # current_query가 설정되어 있으면 사용, 없으면 원본 message 사용
        search_query = state.get("current_query", state["message"])

        logger.info(f"🔍 Performing RAG search for: {search_query[:50]}...")

        # 재시도 횟수 추적
        retry_count = state.get("retry_count", 0)
        logger.info(f"   Retry count: {retry_count}")

        # 요청에서 이미 문서가 전달된 경우, 검색 생략
        if state.get("retrieved_docs") and retry_count == 0:
            logger.info(f"  📄 Using pre-provided docs: {len(state['retrieved_docs'])}")
            state["debug_info"]["rag_docs_count"] = len(state["retrieved_docs"])
            return state

        if self.rag_service:
            try:
                # 항상 메타데이터 필터 없이 검색 (범위를 넓게)
                results = self.rag_service.search(search_query, top_k=5, filter_metadata=None)
                logger.info(f"  📋 RAG service returned {len(results)} results")

                # 유사도 점수 필터링 (relevance_score < 0.3은 제외)
                MIN_RELEVANCE_SCORE = 0.3
                filtered_results = [doc for doc in results if doc.get('relevance_score', 0) >= MIN_RELEVANCE_SCORE]
                logger.info(f"  🎯 Filtered by relevance score (>={MIN_RELEVANCE_SCORE}): {len(filtered_results)} docs")

                if filtered_results:
                    logger.info(f"     Best score: {filtered_results[0].get('relevance_score', 0):.4f}")

                retrieved_docs = [doc['content'] for doc in filtered_results]
                logger.info(f"  📝 Extracted {len(retrieved_docs)} content strings")

                # 추가 토큰 필터링
                retrieved_docs = self._filter_docs_by_query(search_query, retrieved_docs)

                state["retrieved_docs"] = retrieved_docs
                state["debug_info"]["rag_docs_count"] = len(retrieved_docs)
                state["debug_info"][f"search_query_attempt_{retry_count}"] = search_query

                logger.info(f"  ✅ Final RAG results: {len(retrieved_docs)} documents")

            except Exception as e:
                logger.error(f"❌ RAG search failed: {e}", exc_info=True)
                state["retrieved_docs"] = []
                state["debug_info"]["rag_error"] = str(e)
        else:
            logger.warning("RAG service not available")
            state["retrieved_docs"] = []

        return state

    def verify_rag_quality_node(self, state: ChatState) -> ChatState:
        """노드 3: RAG 검색 품질 검증"""
        retrieved_docs = state.get("retrieved_docs", [])
        retry_count = state.get("retry_count", 0)
        current_query = state.get("current_query", state["message"])

        logger.info(f"🔍 Verifying RAG quality: {len(retrieved_docs)} docs, retry: {retry_count}")

        # 품질 평가 기준
        quality_score = 0.0
        quality_reasons = []

        # 1. 문서 개수 확인
        if len(retrieved_docs) >= 3:
            quality_score += 0.4
            quality_reasons.append(f"충분한 문서 수 ({len(retrieved_docs)}개)")
        elif len(retrieved_docs) > 0:
            quality_score += 0.2
            quality_reasons.append(f"일부 문서 발견 ({len(retrieved_docs)}개)")
        else:
            quality_reasons.append("문서 없음")

        # 2. 쿼리와 문서 내용 관련성 확인 (간단한 키워드 매칭)
        if retrieved_docs:
            query_keywords = self._extract_keywords(current_query)
            matched_docs = 0

            for doc in retrieved_docs:
                doc_lower = doc.lower()
                if any(kw.lower() in doc_lower for kw in query_keywords):
                    matched_docs += 1

            match_ratio = matched_docs / len(retrieved_docs)
            if match_ratio >= 0.5:
                quality_score += 0.6
                quality_reasons.append(f"키워드 매칭 양호 ({match_ratio:.0%})")
            elif match_ratio > 0:
                quality_score += 0.3
                quality_reasons.append(f"일부 키워드 매칭 ({match_ratio:.0%})")
            else:
                quality_reasons.append("키워드 매칭 실패")

        state["debug_info"]["rag_quality_score"] = quality_score
        state["debug_info"]["rag_quality_reasons"] = quality_reasons

        logger.info(f"  📊 Quality score: {quality_score:.2f}")
        logger.info(f"  📝 Reasons: {', '.join(quality_reasons)}")

        return state

    def should_refine_query(self, state: ChatState) -> Literal["refine", "proceed"]:
        """RAG 품질 기반 라우팅 결정"""
        quality_score = state["debug_info"].get("rag_quality_score", 0.0)
        retry_count = state.get("retry_count", 0)
        MAX_RETRIES = 2  # 최대 재시도 횟수

        logger.info(f"🔀 Routing decision: quality={quality_score:.2f}, retry={retry_count}/{MAX_RETRIES}")

        # 품질이 충분하거나 최대 재시도 횟수 도달 시 진행
        if quality_score >= 0.6 or retry_count >= MAX_RETRIES:
            logger.info(f"  ✅ Proceeding to next step")
            return "proceed"

        # 품질이 낮고 재시도 가능하면 쿼리 개선
        logger.info(f"  🔄 Refining query (attempt {retry_count + 1})")
        return "refine"

    def refine_query_node(self, state: ChatState) -> ChatState:
        """노드 4: 쿼리 개선 (키워드 추출 및 유사 용어 탐색)"""
        original_query = state["message"]
        current_query = state.get("current_query", original_query)
        retry_count = state.get("retry_count", 0)
        retrieved_docs = state.get("retrieved_docs", [])

        logger.info(f"🔧 Refining query (attempt {retry_count + 1})")
        logger.info(f"   Original: {original_query}")
        logger.info(f"   Current:  {current_query}")

        refined_query = current_query

        # 전략 1: 첫 번째 시도 - 키워드만 추출하여 검색 범위 확대
        if retry_count == 0:
            keywords = self._extract_keywords(original_query)
            if keywords:
                refined_query = " ".join(keywords)
                logger.info(f"  📌 Strategy 1: Extracted keywords → '{refined_query}'")
                state["extracted_terms"] = keywords

        # 전략 2: 두 번째 시도 - 1차 검색 결과에서 유사 용어 찾기
        elif retry_count == 1 and retrieved_docs:
            similar_terms = self._find_similar_terms_in_docs(original_query, retrieved_docs)
            if similar_terms:
                refined_query = similar_terms[0]  # 가장 유사한 용어 사용
                logger.info(f"  🎯 Strategy 2: Found similar term in docs → '{refined_query}'")
                state["extracted_terms"] = similar_terms
            else:
                # 유사 용어를 못 찾았으면 키워드로 폴백
                keywords = self._extract_keywords(original_query)
                refined_query = " ".join(keywords) if keywords else original_query
                logger.info(f"  ⚠️ Strategy 2 fallback: Using keywords → '{refined_query}'")

        state["current_query"] = refined_query
        state["retry_count"] = retry_count + 1
        state["debug_info"][f"refined_query_{retry_count + 1}"] = refined_query

        logger.info(f"  ✨ Refined query: '{refined_query}'")

        return state

    def _extract_keywords(self, query: str) -> List[str]:
        """쿼리에서 핵심 키워드 추출 (조사 제거)"""
        # 불용어 및 조사
        stopwords = {
            "이", "가", "은", "는", "을", "를", "에", "에서", "로", "으로", "의",
            "도", "만", "까지", "부터", "께", "에게", "한테",
            "뭐", "뭐야", "뭔가", "어떻게", "무엇", "대해", "알려줘", "알려주세요",
            "설명", "해줘", "해주세요", "좀", "요", "야"
        }

        # 토큰화 및 불용어 제거
        tokens = []
        for word in query.split():
            # 특수문자 제거
            word = word.strip(".,!?;:()[]{}\"'")
            word_lower = word.lower()

            # 너무 짧거나 불용어면 제외
            if len(word) < 2 or word_lower in stopwords:
                continue

            # 조사 제거 (간단한 휴리스틱)
            for suffix in ["에서", "으로", "에게", "까지", "부터", "에", "를", "을", "이", "가", "은", "는", "의", "도", "만"]:
                if word.endswith(suffix) and len(word) > len(suffix) + 1:
                    word = word[:-len(suffix)]
                    break

            if len(word) >= 2:
                tokens.append(word)

        logger.info(f"  🔑 Extracted keywords: {tokens}")
        return tokens

    def _find_similar_terms_in_docs(self, query: str, docs: List[str]) -> List[str]:
        """1차 검색 결과 문서에서 쿼리와 유사한 용어 찾기 (퍼지 매칭)"""
        from rapidfuzz import fuzz, process

        # 쿼리에서 핵심 키워드 추출
        query_keywords = self._extract_keywords(query)
        if not query_keywords:
            return []

        # 문서에서 모든 2-3 단어 조합 추출
        candidate_terms = set()
        for doc in docs:
            words = doc.split()
            # 2-gram, 3-gram 추출
            for i in range(len(words)):
                for n in [1, 2, 3]:
                    if i + n <= len(words):
                        term = " ".join(words[i:i+n])
                        # 너무 짧거나 긴 용어 제외
                        if 2 <= len(term) <= 20:
                            candidate_terms.add(term)

        # 각 쿼리 키워드에 대해 가장 유사한 용어 찾기
        similar_terms = []
        for keyword in query_keywords:
            matches = process.extract(
                keyword,
                list(candidate_terms),
                scorer=fuzz.ratio,
                limit=3
            )

            # 유사도 70% 이상인 것만 선택
            for match, score, _ in matches:
                if score >= 70 and match.lower() != keyword.lower():
                    similar_terms.append((match, score))
                    logger.info(f"    🔍 '{keyword}' → '{match}' (유사도: {score}%)")

        # 유사도 높은 순으로 정렬
        similar_terms.sort(key=lambda x: x[1], reverse=True)

        # 상위 3개만 반환 (용어만)
        return [term for term, _ in similar_terms[:3]]

    def generate_response_node(self, state: ChatState) -> ChatState:
        """노드 4: 응답 생성"""
        message = state["message"]
        context = state.get("context", [])
        retrieved_docs = state.get("retrieved_docs", [])
        intent = state.get("intent", "general")

        logger.info(f"💬 Generating response: intent={intent}, rag_docs={len(retrieved_docs)}")

        # 1. 명확한 인사말 → 간단한 답변
        if intent == "casual":
            logger.info("  → Casual conversation, returning greeting")
            reply = (
                "안녕하세요! 저는 프로젝트 관리(PMS) 전문 AI 어시스턴트입니다. "
                "프로젝트 일정, 리스크, 이슈, 애자일 방법론 등에 대해 물어보세요!"
            )
            confidence = 0.9
            state["response"] = reply
            state["confidence"] = confidence
            state["debug_info"]["prompt_length"] = 0
            return state

        # 2. RAG 문서 없음 → 도메인 키워드 확인 후 LLM으로 답변 또는 범위 밖 처리
        if len(retrieved_docs) == 0:
            # PMS/애자일 도메인 키워드 목록
            domain_keywords = [
                # 스크럼/애자일
                "스크럼", "scrum", "애자일", "agile", "스프린트", "sprint",
                "백로그", "backlog", "데일리", "daily", "스탠드업", "standup",
                "레트로", "retro", "회고", "플래닝", "planning", "포커", "poker",
                "칸반", "kanban", "번다운", "burndown", "velocity", "벨로시티",
                # 프로젝트 관리 일반
                "wbs", "간트", "gantt", "마일스톤", "milestone", "pmo",
                "리스크", "risk", "이슈", "issue", "태스크", "task",
                "일정", "schedule", "예산", "budget", "자원", "resource",
                "범위", "scope", "품질", "quality", "이해관계자", "stakeholder",
                # 역할
                "pm", "po", "product owner", "scrum master", "스크럼마스터",
            ]

            message_lower = message.lower()
            is_domain_question = any(kw in message_lower for kw in domain_keywords)

            if is_domain_question:
                # 도메인 관련 질문이면 LLM이 일반 지식으로 답변
                logger.info("  → No RAG docs, but domain question detected - using LLM knowledge")
                # RAG 없이 LLM으로 답변 생성 (아래 코드로 진행)
            else:
                logger.info("  → No RAG docs and not domain question, out of scope")
                reply = (
                    "죄송합니다. 해당 질문은 제가 가진 프로젝트 관리 지식 범위를 벗어납니다. "
                    "프로젝트 일정, 진척, 예산, 리스크, 이슈, 또는 애자일 방법론에 대해 질문해주세요."
                )
                confidence = 0.7
                state["response"] = reply
                state["confidence"] = confidence
                state["debug_info"]["prompt_length"] = 0
                return state

        # 3. RAG 문서 있음 → LLM으로 답변 생성
        logger.info(f"  → Generating LLM response with {len(retrieved_docs)} RAG docs")

        # 프롬프트 구성
        prompt = self._build_prompt(message, context, retrieved_docs, intent)

        # Model identity question detection - only for direct questions about the AI itself
        # Use specific patterns to avoid false positives (e.g., "sprint name" shouldn't trigger this)
        original_message_lower = message.lower()
        model_identity_patterns = [
            r"너(는|의)\s*(이름|모델|누구)",  # "너는 누구", "너의 이름"
            r"당신(은|의)\s*(이름|모델|누구)",  # "당신은 누구", "당신의 이름"
            r"(무슨|어떤|뭔)\s*모델",  # "무슨 모델", "어떤 모델"
            r"모델\s*(이름|명)",  # "모델 이름", "모델명"
            r"(what|which)\s*model",  # English patterns
            r"(who|what)\s*are\s*you",
            r"your\s*name",
        ]
        is_model_name_question = any(re.search(pattern, original_message_lower) for pattern in model_identity_patterns)

        logger.info(f"Checking model identity question: message='{message}', is_model_identity_question={is_model_name_question}")
        
        # 정확한 모델 이름 가져오기
        if self.model_path:
            import os
            model_file = os.path.basename(self.model_path)
            if "lfm2" in model_file.lower():
                correct_name = "Llama Forge Model 2 (LFM2)"
            elif "gemma" in model_file.lower():
                correct_name = "Gemma 3"
            elif "qwen" in model_file.lower():
                correct_name = "Qwen3-8B"
            else:
                correct_name = "로컬 LLM"
        else:
            correct_name = "로컬 LLM"
        
        # 모델 이름 질문인 경우 LLM 호출을 건너뛰고 직접 답변
        if is_model_name_question:
            logger.info(f"Model name question detected, returning direct answer: {correct_name}")
            reply = f"저는 {correct_name} 모델입니다."
        else:
            try:
                # KV 캐시 초기화
                self.llm.reset()

                # Generation parameters from environment variables
                temperature = float(os.getenv("TEMPERATURE", "0.35"))
                top_p = float(os.getenv("TOP_P", "0.90"))
                min_p = float(os.getenv("MIN_P", "0.12"))
                repeat_penalty = float(os.getenv("REPEAT_PENALTY", "1.10"))
                max_tokens = int(os.getenv("MAX_TOKENS", "1800"))

                # LLM 추론
                response = self.llm(
                    prompt,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    top_p=top_p,
                    min_p=min_p,
                    stop=["<end_of_turn>", "<start_of_turn>", "</s>", "<|im_end|>"],
                    echo=False,
                    repeat_penalty=repeat_penalty
                )

                reply = response["choices"][0]["text"].strip()

                # 원본 응답 로깅 (디버깅용)
                logger.info(f"Raw model response: {repr(reply)}")

                # 후처리
                reply = self._clean_response(reply)

                # 클리닝 후 응답 로깅
                logger.info(f"Cleaned response: {repr(reply)}")
                
                # 잘못된 모델 이름이 포함되어 있는지 추가 검증
                wrong_names = ["니콜라스", "nicolas", "알렉스", "alex", "사라", "sara", 
                              "gpt-4", "chatgpt", "claude", "gemini", "palm"]
                reply_lower_check = reply.lower()
                has_wrong_name = any(wrong in reply_lower_check for wrong in wrong_names)
                
                if has_wrong_name:
                    logger.warning(f"Detected wrong model name in response, replacing with: {correct_name}")
                    reply = f"저는 {correct_name} 모델입니다."
            except Exception as e:
                logger.error(f"Response generation failed: {e}")
                reply = "죄송합니다. 응답 생성 중 오류가 발생했습니다."

        # 신뢰도 계산
        confidence = self._calculate_confidence(intent, retrieved_docs)

        state["response"] = reply
        state["confidence"] = confidence
        state["debug_info"]["prompt_length"] = len(prompt)

        logger.info(f"Response generated: {reply[:50]}... (confidence: {confidence})")

        return state

    def _filter_docs_by_query(self, message: str, retrieved_docs: List[str]) -> List[str]:
        """질문과 직접 관련된 문서만 남기는 간단한 필터"""
        if not retrieved_docs:
            return []

        stopwords = {
            "프로젝트", "대해", "알려줘", "알려", "해주세요", "해줘",
            "설명", "정보", "현황에", "현황을", "현황은"
        }

        suffixes = ["에서", "에게", "부터", "까지", "으로", "으로써", "으로서",
                    "으로써", "으로", "에서", "으로", "과", "와", "을", "를", "이", "가",
                    "에", "의", "도", "만", "은", "는", "께"]

        tokens = []
        for raw in message.split():
            token = raw.strip(".,!?;:()[]{}\"'").lower()
            if len(token) < 2:
                continue
            for suffix in suffixes:
                if token.endswith(suffix) and len(token) > len(suffix):
                    token = token[: -len(suffix)]
                    break
            if not token or token in stopwords:
                continue
            if len(token) >= 2:
                tokens.append(token)

        logger.info(f"🔍 Filter docs: extracted tokens from '{message}': {tokens}")
        logger.info(f"   - Retrieved docs before filter: {len(retrieved_docs)}")

        if not tokens:
            logger.warning("   ⚠️ No tokens extracted, returning all docs (fallback)")
            return retrieved_docs  # 토큰이 없으면 모든 문서 반환 (벡터 검색을 신뢰)

        filtered = []
        for i, doc in enumerate(retrieved_docs):
            doc_text = (doc or "").lower()
            matched_tokens = [token for token in tokens if token in doc_text]
            if matched_tokens:
                filtered.append(doc)
                logger.info(f"   ✅ Doc {i+1} matched tokens: {matched_tokens}")
            else:
                logger.info(f"   ❌ Doc {i+1} no match (preview: {doc_text[:100]}...)")

        logger.info(f"   - Filtered docs: {len(filtered)}/{len(retrieved_docs)}")

        # 필터링 결과가 없으면 원본 반환 (벡터 검색을 신뢰)
        if not filtered:
            logger.warning("   ⚠️ Filter removed all docs, returning original (trusting vector search)")
            return retrieved_docs

        return filtered

    def _build_prompt(self, message: str, context: List[dict],
                     retrieved_docs: List[str], intent: str) -> str:
        """프롬프트 구성"""

        prompt_parts = []

        tools_json_schema = "없음"
        
        # 현재 사용 중인 모델 정보 가져오기
        model_name = "로컬 LLM"
        if self.model_path:
            # 파일명에서 모델 이름 추출
            import os
            model_file = os.path.basename(self.model_path)
            if "gemma" in model_file.lower():
                model_name = "Gemma 3"
            elif "lfm2" in model_file.lower():
                model_name = "Llama Forge Model 2 (LFM2)"
            elif "qwen" in model_file.lower():
                model_name = "Qwen3-8B"
            elif "llama" in model_file.lower():
                model_name = "Llama 기반 모델"
            else:
                model_name = "로컬 LLM"
        
        system_prompt = """당신은 PMS 관리 어시스턴트이며 프로젝트 관리 및 주간 보고서 작성 담당자입니다.
프로젝트 관리 시스템(PMS)의 태스크, 리스크, 메트릭, 채팅 로그, 문서 등을 기반으로 정확한 주간보고서를 생성하는 것이 주 역할이며 보조로 챗봇 역할도 있습니다.

철칙:
- 제공된 컨텍스트(RAG 검색 결과) 및 외부 사실 자료만 고려할 것, 가정이나 창작 사실을 추가하지 마세요.
- 데이터가 부족하거나 불완전하면 반드시 "데이터가 부족하여 답변을 생성할 수 없습니다. 추가 정보를 확인해 주세요."라고 답변하세요.
- 모든 답변은 자연스럽고 정중한 한국어로 작성하세요. 전문적·객관적 톤 유지.
- hallucination을 피하기 위해: 사실 확인 없이 추측하지 말고, "확인된 바에 따르면" 또는 "데이터 기준" 같은 표현으로 근거 명시.
- 주간 보고서를 요청하지 않고 일상 적인 질문에는 주간보고서 작성 필수 구조를 따르지 않음.
- 주간 보고서 출력은 항상 지정된 구조를 100% 준수하세요. 구조 외 텍스트(인사, 설명, 추가 코멘트) 절대 금지.

주간보고서 작성 필수 구조:
1. 제목: [프로젝트명] 주간보고서 (기간: YYYY-MM-DD ~ YYYY-MM-DD)
2. 요약: 3~5문장으로 핵심 성과·이슈·다음 주 계획을 압축
3. 주요 완료 태스크: 번호 매긴 리스트 (형식: - [태스크명] (담당자: 이름, 완료율: XX%, 완료일: YYYY-MM-DD))
4. 진행 중 주요 리스크 및 대응: 테이블 형식 (열: 위험도(HIGH/MEDIUM/LOW), 리스크 설명, 현재 상태, 대응 계획)
5. 다음 주 주요 계획: 번호 매긴 리스트 (구체적 태스크 3~5개, 담당자·예정 완료일 포함)
6. 핵심 메트릭 요약: bullet points 또는 간단 테이블 (완료율 XX%, 지연 태스크 수 X건, 오픈 리스크 수 X건 등)"""

        # 모델 타입에 따라 프롬프트 형식 선택
        is_gemma = self.model_path and "gemma" in self.model_path.lower()
        is_qwen = self.model_path and "qwen" in self.model_path.lower()

        if is_gemma:
            # Gemma 3: <start_of_turn>user/model 형식 (system role 없음)
            prompt_parts.append(f"<start_of_turn>user\n{system_prompt}<end_of_turn>")
            prompt_parts.append("<start_of_turn>model\n네, 알겠습니다.<end_of_turn>")

            for msg in context[-5:]:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                if role == "user":
                    prompt_parts.append(f"<start_of_turn>user\n{content}<end_of_turn>")
                elif role == "assistant":
                    prompt_parts.append(f"<start_of_turn>model\n{content}<end_of_turn>")

            if retrieved_docs and len(retrieved_docs) > 0:
                # RAG 문서를 간결하게 제공하고 자연스러운 답변 유도
                context_text = ""
                for doc in retrieved_docs[:3]:  # 상위 3개만 사용
                    doc_content = doc if isinstance(doc, str) else doc.get('content', str(doc))
                    # 핵심 내용만 추출 (300자 제한)
                    if len(doc_content) > 300:
                        doc_content = doc_content[:300]
                    context_text += doc_content + "\n"
                user_msg = f"다음 정보를 참고하여 질문에 답변하세요:\n{context_text}\n질문: {message}"
                prompt_parts.append(f"<start_of_turn>user\n{user_msg}<end_of_turn>")
            else:
                prompt_parts.append(f"<start_of_turn>user\n{message}<end_of_turn>")

            prompt_parts.append("<start_of_turn>model\n")
        elif is_qwen:
            # Qwen3: ChatML 형식 + /no_think 모드 (hallucination 최소화)
            prompt_parts.append("<|im_start|>system")
            prompt_parts.append(system_prompt)
            prompt_parts.append("<|im_end|>")

            for msg in context[-5:]:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                if role == "user":
                    prompt_parts.append("<|im_start|>user")
                    prompt_parts.append(content)
                    prompt_parts.append("<|im_end|>")
                elif role == "assistant":
                    prompt_parts.append("<|im_start|>assistant")
                    prompt_parts.append(content)
                    prompt_parts.append("<|im_end|>")

            prompt_parts.append("<|im_start|>user")
            if retrieved_docs and len(retrieved_docs) > 0:
                # RAG documents: limit to 3 docs, 300 chars each
                context_text = ""
                for doc in retrieved_docs[:3]:
                    doc_content = doc if isinstance(doc, str) else doc.get('content', str(doc))
                    if len(doc_content) > 300:
                        doc_content = doc_content[:300]
                    context_text += doc_content + "\n"
                prompt_parts.append(f"다음 정보를 참고하여 질문에 답변하세요:\n{context_text}\n질문: {message} /no_think")
            else:
                prompt_parts.append(f"{message} /no_think")
            prompt_parts.append("<|im_end|>")
            prompt_parts.append("<|im_start|>assistant")
        else:
            # ChatML: <|im_start|>system/user/assistant 형식 (LFM2, Llama 등)
            prompt_parts.append("<|im_start|>system")
            prompt_parts.append(system_prompt)
            prompt_parts.append("<|im_end|>")

            for msg in context[-5:]:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                if role == "user":
                    prompt_parts.append("<|im_start|>user")
                    prompt_parts.append(content)
                    prompt_parts.append("<|im_end|>")
                elif role == "assistant":
                    prompt_parts.append("<|im_start|>assistant")
                    prompt_parts.append(content)
                    prompt_parts.append("<|im_end|>")

            prompt_parts.append("<|im_start|>user")
            if retrieved_docs and len(retrieved_docs) > 0:
                # RAG documents: limit to 3 docs, 300 chars each (same as Gemma)
                context_text = ""
                for doc in retrieved_docs[:3]:
                    doc_content = doc if isinstance(doc, str) else doc.get('content', str(doc))
                    if len(doc_content) > 300:
                        doc_content = doc_content[:300]
                    context_text += doc_content + "\n"
                prompt_parts.append(f"다음 정보를 참고하여 질문에 답변하세요:\n{context_text}\n질문: {message}")
            else:
                prompt_parts.append(message)
            prompt_parts.append("<|im_end|>")
            prompt_parts.append("<|im_start|>assistant")

        return "\n".join(prompt_parts)

    def _clean_response(self, reply: str) -> str:
        """응답 정리"""

        # 모델이 자기 대화를 시작하는 패턴에서 첫 응답만 추출
        for stop_pattern in ["질문:", "\nmodel", "학년\n데요"]:
            if stop_pattern in reply:
                reply = reply.split(stop_pattern)[0].strip()

        # "네, 알겠습니다" 시작 패턴 제거
        if reply.startswith("네, 알겠습니다"):
            reply = reply[len("네, 알겠습니다"):].strip()
            if reply.startswith(".") or reply.startswith("。"):
                reply = reply[1:].strip()

        # Gemma 특수 토큰 제거
        reply = reply.replace("<start_of_turn>", "").replace("<end_of_turn>", "")
        # im_end 토큰 제거 (깨지는 문자 방지)
        reply = reply.replace("<|im_end|>", "").replace("|im_end|>", "").replace("<|im_end", "")

        # 삼중 따옴표로 감싸진 블록 제거 (모델 이름, 구분선, 질문 등 포함)
        reply = re.sub(r"'''[\s\S]*?'''", "", reply)
        reply = re.sub(r'"""[\s\S]*?"""', "", reply)
        if reply.startswith("'''") or reply.startswith('"""'):
            reply = reply[3:].lstrip()
        if reply.endswith("'''") or reply.endswith('"""'):
            reply = reply[:-3].rstrip()
        
        # Qwen3 thinking 토큰 제거
        reply = re.sub(r"<think>[\s\S]*?</think>", "", reply)

        # 모델 이름과 구분선이 포함된 앞부분 제거
        # 예: "Llama Forge Model 2 (LFM2)\n===\n질문내용"
        reply = re.sub(r"^.*?(Llama Forge Model|Gemma|LFM2|Qwen|로컬 LLM).*?\n=+\n.*?\n", "", reply, flags=re.MULTILINE | re.IGNORECASE)
        reply = re.sub(r"^.*?=+\n.*?\n", "", reply, flags=re.MULTILINE)
        
        # 불필요한 role 레이블 제거
        if reply.startswith("model"):
            reply = reply[5:].strip()
        if reply.startswith("assistant"):
            reply = reply[9:].strip()

        # 프롬프트 형식 태그 제거
        reply = reply.replace("<think>", "")
        reply = reply.replace("system", "")
        reply = reply.replace("사용자:", "")
        reply = reply.replace("user:", "")
        reply = reply.replace("USER", "")
        reply = reply.replace("_assistant", "")
        reply = reply.replace("assistant", "")
        
        # "현재 질문에 대한 답변을 작성해 주세요" 같은 프롬프트 텍스트 제거
        unwanted_patterns = [
            "현재 질문에 대한 답변을 작성해 주세요",
            "현재 질문에 대한 답변을 작성해주세요",
            "답변을 작성해 주세요",
            "답변을 작성해주세요",
            "Please write an answer",
            "Write an answer",
            "답변은 3~6문장",
            "핵심 정의",
            "목적/배경",
            "간단한 예시",
        ]
        
        # 메타 설명 텍스트 제거 (뒤에 붙는 불필요한 설명)
        meta_patterns = [
            r"제공된 정보로.*?완벽하게 답변했습니다.*?",
            r"제공된 정보로.*?답변했습니다.*?",
            r"이제 사용자님의 요청대로.*?제공",
            r"이제 사용자의 요청대로.*?제공",
            r"사용자님의 요청대로.*?설명.*?제공",
            r"사용자의 요청대로.*?설명.*?제공",
            r"요청대로.*?한국어로.*?제공",
            r"요청하신.*?한국어로.*?제공",
        ]
        for pattern in meta_patterns:
            reply = re.sub(pattern, "", reply, flags=re.IGNORECASE | re.DOTALL)
        
        # 잘못된 모델 이름 필터링 (모델 이름 질문인 경우)
        wrong_model_names = ["니콜라스", "nicolas", "알렉스", "alex", "사라", "sara", 
                            "gpt-4", "chatgpt", "claude", "gemini", "palm", "gpt4"]
        
        # 정확한 모델 이름 가져오기
        correct_name = "로컬 LLM"
        if self.model_path:
            import os
            model_file = os.path.basename(self.model_path)
            if "lfm2" in model_file.lower():
                correct_name = "Llama Forge Model 2 (LFM2)"
            elif "gemma" in model_file.lower():
                correct_name = "Gemma 3"
            elif "qwen" in model_file.lower():
                correct_name = "Qwen3-8B"
        
        # 잘못된 모델 이름이 포함된 경우 강제로 교체
        reply_lower = reply.lower()
        found_wrong_name = False
        for wrong_name in wrong_model_names:
            if wrong_name.lower() in reply_lower:
                found_wrong_name = True
                # 정확한 모델 이름으로 완전히 교체
                reply = f"저는 {correct_name} 모델입니다."
                break
        
        # Model name keyword detection - only trigger when asking about the model itself
        # Check for explicit model identity questions, not general use of "name" word
        # Keywords like "이름" can appear in normal context (e.g., "sprint's name"), so be more specific
        model_identity_patterns = [
            r"너(는|의)\s*(이름|모델)",  # "너는 이름", "너의 모델"
            r"당신(은|의)\s*(이름|모델)",  # "당신은 이름", "당신의 모델"
            r"(무슨|어떤|뭔)\s*모델",  # "무슨 모델", "어떤 모델"
            r"모델\s*(이름|명)",  # "모델 이름", "모델명"
            r"(what|which)\s*model",  # English patterns
            r"your\s*name",
        ]
        import re as regex_module
        has_model_identity_question = any(regex_module.search(pattern, reply_lower) for pattern in model_identity_patterns)
        has_correct_name = any(correct in reply for correct in ["Llama", "Gemma", "Qwen", "로컬 LLM", "LFM2"])

        if has_model_identity_question and not has_correct_name:
            # This is a model identity question with wrong/missing answer - replace
            reply = f"저는 {correct_name} 모델입니다."
        for pattern in unwanted_patterns:
            reply = reply.replace(pattern, "")
            # 대소문자 구분 없이 제거
            reply = re.sub(re.escape(pattern), "", reply, flags=re.IGNORECASE)

        # assistant 접두어 정리
        cleaned_lines = []
        for line in reply.splitlines():
            stripped = line.strip()
            lower = stripped.lower()
            
            # 모델 이름과 구분선이 포함된 줄 제거
            if re.search(r"(llama forge model|gemma|lfm2|로컬 llm).*?===", lower) or re.search(r"^=+$", stripped):
                stripped = ""
            # 삼중 따옴표로 시작하거나 끝나는 줄 제거
            elif stripped.startswith("'''") or stripped.endswith("'''") or stripped.startswith('"""') or stripped.endswith('"""'):
                stripped = ""
            # 불필요한 패턴 제거
            elif lower.startswith("assistant:") or lower.startswith("assistant："):
                stripped = stripped.split(":", 1)[1].strip() if ":" in stripped else ""
            elif lower == "assistant" or lower == "system" or lower == "user":
                stripped = ""
            elif stripped.startswith("사용자:") or stripped.startswith("사용자："):
                stripped = ""
            elif stripped.startswith("system") or stripped.startswith("user"):
                stripped = ""
            elif "<think>" in stripped.lower():
                stripped = ""
            elif any(pattern in stripped for pattern in unwanted_patterns):
                stripped = ""
            # 메타 설명 텍스트가 포함된 줄 제거
            elif re.search(r"제공된 정보로.*?답변했습니다", lower) or re.search(r"이제 사용자.*?요청대로", lower) or re.search(r"요청.*?한국어로.*?제공", lower):
                stripped = ""
            
            if stripped:
                cleaned_lines.append(stripped)
        
        if cleaned_lines:
            reply = "\n".join(cleaned_lines)
        else:
            # 모든 줄이 제거된 경우 원본에서 첫 번째 의미있는 줄만 사용
            lines = reply.splitlines()
            for line in lines:
                stripped = line.strip()
                if stripped and not any(unwanted in stripped.lower() for unwanted in ["system", "user", "assistant", "사용자", "<redacted"]):
                    reply = stripped
                    break

        # 응답 앞부분에서 모델 이름과 구분선 제거
        # 예: "Llama Forge Model 2 (LFM2)\n===\n질문내용\n\n답변내용" -> "답변내용"
        lines = reply.splitlines()
        start_idx = 0
        for i, line in enumerate(lines):
            stripped = line.strip()
            # 모델 이름이나 구분선이 있는 줄은 건너뛰기
            if re.search(r"(llama forge model|gemma|lfm2|로컬 llm)", stripped, re.IGNORECASE) or re.match(r"^=+$", stripped):
                start_idx = i + 1
            # 사용자 질문처럼 보이는 줄도 건너뛰기 (질문으로 끝나는 경우)
            elif (stripped.endswith("?") or stripped.endswith("주세요") or stripped.endswith("해주세요")) and i < len(lines) - 1:
                start_idx = i + 1
            else:
                break
        
        if start_idx > 0:
            reply = "\n".join(lines[start_idx:]).strip()
        
        # 응답 뒷부분에서 메타 설명 제거
        lines = reply.splitlines()
        end_idx = len(lines)
        for i in range(len(lines) - 1, -1, -1):
            line = lines[i].strip()
            # 메타 설명 패턴이 있으면 그 줄부터 끝까지 제거
            if re.search(r"제공된 정보로.*?답변했습니다", line, re.IGNORECASE) or \
               re.search(r"이제 사용자.*?요청대로", line, re.IGNORECASE) or \
               re.search(r"요청.*?한국어로.*?제공", line, re.IGNORECASE) or \
               re.search(r"완벽하게 답변했습니다", line, re.IGNORECASE):
                end_idx = i
                break
        
        if end_idx < len(lines):
            reply = "\n".join(lines[:end_idx]).strip()

        # 중복 응답 방지
        if "<start_of_turn>" in reply:
            reply = reply.split("<start_of_turn>")[0].strip()
        
        # im_end 토큰이 남아있으면 제거
        if "<|im_end|>" in reply:
            reply = reply.split("<|im_end|>")[0].strip()
        if "|im_end|>" in reply:
            reply = reply.split("|im_end|>")[0].strip()

        # 과도하게 긴 응답 제한
        if "\n\n\n" in reply:
            reply = reply.split("\n\n\n")[0].strip()

        # 반복되는 패턴 제거 (같은 문단이 여러 번 나오는 경우)
        lines = reply.split('\n')
        seen_lines = set()
        unique_lines = []
        for line in lines:
            line_stripped = line.strip()
            if line_stripped and line_stripped not in seen_lines:
                seen_lines.add(line_stripped)
                unique_lines.append(line)
            elif not line_stripped:  # 빈 줄은 유지
                unique_lines.append(line)
        reply = '\n'.join(unique_lines)
        
        # 제어 문자 및 깨지는 문자 제거 (인코딩 문제 방지)
        import string
        # 인쇄 가능한 문자와 공백만 유지
        printable_chars = set(string.printable)
        # 한글, 한자, 일본어 등 유니코드 문자도 허용
        cleaned_chars = []
        for char in reply:
            # 인쇄 가능한 ASCII 문자이거나, 유니코드 문자(한글 등)인 경우만 유지
            if char in printable_chars or ord(char) > 127:
                # 제어 문자 제거 (탭, 줄바꿈, 캐리지 리턴은 유지)
                if ord(char) < 32 and char not in ['\n', '\r', '\t']:
                    continue
                cleaned_chars.append(char)
        reply = ''.join(cleaned_chars)
        
        # 앞뒤 공백 정리
        reply = reply.strip()
        
        # 응답 끝에 남은 불완전한 태그나 특수 문자 제거
        # 예: "<", "<start", "<end", "<|" 등
        while reply and reply[-1] in ['<', '>', '|']:
            reply = reply[:-1].strip()
        
        # 불완전한 태그 패턴 제거 (끝부분에 남은 것들)
        reply = re.sub(r'<[^>]*$', '', reply)  # 끝에 불완전한 태그 제거
        reply = re.sub(r'\|[^>]*$', '', reply)  # 끝에 불완전한 토큰 제거
        
        # 다시 앞뒤 공백 정리
        reply = reply.strip()

        # 응답 시작 부분의 불필요한 문장부호 제거 (., 。, :, ：, -, 등)
        while reply and reply[0] in '.。:：-–—•·':
            reply = reply[1:].strip()

        return reply

    def _calculate_confidence(self, intent: str, retrieved_docs: List[str]) -> float:
        """신뢰도 계산"""

        base_confidence = {
            "casual": 0.95,      # 일상 대화는 높은 신뢰도
            "pms_query": 0.70,   # PMS 질문은 RAG 의존
            "general": 0.80      # 일반 질문은 중간
        }.get(intent, 0.75)

        # RAG 문서가 있으면 신뢰도 증가
        if retrieved_docs and len(retrieved_docs) > 0:
            rag_boost = min(0.15, len(retrieved_docs) * 0.05)
            base_confidence = min(0.95, base_confidence + rag_boost)

        return round(base_confidence, 2)

    def run(self, message: str, context: List[dict] = None, retrieved_docs: List[str] = None) -> dict:
        """워크플로우 실행"""

        initial_state: ChatState = {
            "message": message,
            "context": context or [],
            "intent": None,
            "retrieved_docs": retrieved_docs or [],
            "response": None,
            "confidence": 0.0,
            "debug_info": {},

            # 쿼리 개선 관련 필드 초기화
            "current_query": message,
            "retry_count": 0,
            "extracted_terms": []
        }

        logger.info(f"Starting workflow for message: {message[:50]}...")

        # 그래프 실행
        final_state = self.graph.invoke(initial_state)

        logger.info(f"Workflow completed. Intent: {final_state.get('intent')}, "
                   f"RAG docs: {len(final_state.get('retrieved_docs', []))}, "
                   f"Retries: {final_state.get('retry_count', 0)}")

        # 디버그 정보에 쿼리 개선 정보 추가
        debug_info = final_state.get("debug_info", {})
        if final_state.get("retry_count", 0) > 0:
            debug_info["query_refinement"] = {
                "original_query": message,
                "final_query": final_state.get("current_query", message),
                "retry_count": final_state.get("retry_count", 0),
                "extracted_terms": final_state.get("extracted_terms", [])
            }

        return {
            "reply": final_state.get("response", "응답을 생성할 수 없습니다."),
            "confidence": final_state.get("confidence", 0.0),
            "intent": final_state.get("intent"),
            "rag_docs_count": len(final_state.get("retrieved_docs", [])),
            "debug_info": debug_info
        }
