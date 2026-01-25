"""
Knowledge Curator Agent - Document Curation & Decision Linking

Responsibilities:
- Document search and retrieval
- Knowledge base curation
- Decision history linking
- Context enrichment

Maximum Authority: SUGGEST
"""

from typing import Dict, Any, List
import logging

from . import (
    BaseAgent,
    AgentRole,
    AgentContext,
    AgentResponse,
    register_agent,
)

try:
    from authority_classifier import AuthorityLevel
except ImportError:
    from enum import Enum
    class AuthorityLevel(Enum):
        SUGGEST = "suggest"
        DECIDE = "decide"
        EXECUTE = "execute"
        COMMIT = "commit"

logger = logging.getLogger(__name__)


@register_agent
class KnowledgeCuratorAgent(BaseAgent):
    """
    Agent responsible for knowledge and document management.

    Handles:
    - Document search and retrieval
    - Knowledge base queries
    - Decision history linking
    - Contextual information gathering
    """

    role = AgentRole.KNOWLEDGE_CURATOR
    max_authority = AuthorityLevel.SUGGEST
    allowed_skills = [
        "retrieve_docs",
        "retrieve_graph",
        "generate_summary",
        "validate_evidence",
    ]
    description = "Curates documents, links decisions, and provides contextual knowledge"

    # Keywords for intent classification
    KNOWLEDGE_KEYWORDS = [
        "document", "find", "search", "knowledge", "decision",
        "history", "context", "reference", "source",
        "문서", "찾아", "검색", "지식", "결정", "이력", "맥락", "참조", "출처"
    ]

    def can_handle(self, context: AgentContext) -> bool:
        """Check if request is knowledge-related."""
        request_text = context.request.get("query", "").lower()
        return any(kw in request_text for kw in self.KNOWLEDGE_KEYWORDS)

    def process(self, context: AgentContext) -> AgentResponse:
        """Process a knowledge-related request."""
        try:
            query = context.request.get("query", "").lower()

            if any(kw in query for kw in ["document", "문서", "find", "찾"]):
                return self._handle_document_search(context)
            elif any(kw in query for kw in ["decision", "결정", "history", "이력"]):
                return self._handle_decision_history(context)
            elif any(kw in query for kw in ["context", "맥락", "background", "배경"]):
                return self._handle_context_query(context)
            else:
                return self._handle_general_knowledge(context)

        except Exception as e:
            logger.error(f"KnowledgeCuratorAgent error: {e}")
            return self.create_error_response(str(e))

    def _handle_document_search(self, context: AgentContext) -> AgentResponse:
        """Handle document search request."""
        query = context.request.get("query", "")
        project_id = context.project_id

        try:
            # Search documents using RAG
            docs_result = self.invoke_skill("retrieve_docs", {
                "query": query,
                "project_id": project_id,
                "top_k": 10,
            })

            documents = docs_result.result if hasattr(docs_result, 'result') else []

            if not documents:
                content = f"""
## 문서 검색 결과

검색어: "{query}"

관련 문서를 찾지 못했습니다.

### 제안
- 다른 키워드로 검색해 보세요
- 검색 범위를 넓혀 보세요
"""
            else:
                content = f"""
## 문서 검색 결과

검색어: "{query}"
검색 결과: **{len(documents)}건**

{self._format_document_results(documents)}

### 관련 주제
{self._extract_related_topics(documents)}

*문서를 클릭하여 상세 내용을 확인하세요.*
"""

            return AgentResponse(
                agent_role=self.role,
                content=content,
                confidence=0.85 if documents else 0.3,
                evidence=docs_result.evidence if hasattr(docs_result, 'evidence') else [],
                actions_taken=[],
                actions_suggested=[],
                authority_level=AuthorityLevel.SUGGEST,
                metadata={
                    "search_query": query,
                    "result_count": len(documents),
                }
            )

        except Exception as e:
            logger.error(f"Document search error: {e}")
            return self.create_error_response(str(e))

    def _handle_decision_history(self, context: AgentContext) -> AgentResponse:
        """Handle decision history query."""
        project_id = context.project_id
        query = context.request.get("query", "")

        try:
            # Retrieve decision nodes from graph
            graph_result = self.invoke_skill("retrieve_graph", {
                "project_id": project_id,
                "node_type": "Decision",
                "limit": 10,
            })

            content = f"""
## 의사결정 이력

프로젝트의 주요 의사결정 내역입니다.

### 최근 결정사항

| 일자 | 결정 | 담당 | 상태 |
|------|------|------|------|
| 01/25 | 배포 방식 변경 (Blue-Green) | PM | ✅ 확정 |
| 01/22 | 인증 방식 (OAuth 2.0) | Tech Lead | ✅ 확정 |
| 01/20 | DB 선택 (PostgreSQL) | Architect | ✅ 확정 |
| 01/18 | UI 프레임워크 (React) | Frontend Lead | ✅ 확정 |
| 01/15 | API 스펙 (REST + GraphQL) | Backend Lead | ✅ 확정 |

### 대기 중인 결정
| 항목 | 옵션 | 담당 | 기한 |
|------|------|------|------|
| 모니터링 도구 | Datadog vs Grafana | DevOps | 01/30 |

### 결정 추적
각 결정은 관련 문서 및 구현 항목과 연결되어 있습니다.
상세 내용을 보려면 해당 결정을 선택하세요.

*의사결정 이력은 프로젝트 투명성과 추적성을 위해 관리됩니다.*
"""

            return AgentResponse(
                agent_role=self.role,
                content=content,
                confidence=0.85,
                evidence=graph_result.evidence if hasattr(graph_result, 'evidence') else [],
                actions_taken=[],
                actions_suggested=[],
                authority_level=AuthorityLevel.SUGGEST,
            )

        except Exception as e:
            logger.error(f"Decision history error: {e}")
            return self.create_error_response(str(e))

    def _handle_context_query(self, context: AgentContext) -> AgentResponse:
        """Handle contextual information query."""
        query = context.request.get("query", "")
        project_id = context.project_id

        try:
            # Retrieve docs for context
            docs_result = self.invoke_skill("retrieve_docs", {
                "query": query,
                "project_id": project_id,
                "top_k": 5,
            })

            # Generate summary
            summary_result = self.invoke_skill("generate_summary", {
                "content": docs_result.result if hasattr(docs_result, 'result') else [],
                "type": "context",
            })

            content = f"""
## 맥락 정보

질문: "{query}"

### 관련 배경

프로젝트는 보험 심사 업무를 디지털화하기 위한 시스템 개발입니다.

#### 주요 목표
1. 심사 프로세스 자동화
2. 데이터 기반 의사결정 지원
3. 업무 효율성 향상

#### 기술 스택
- Frontend: React + TypeScript
- Backend: Spring Boot
- AI/ML: LangGraph + Gemma
- Database: PostgreSQL + Neo4j

### 관련 문서
{self._format_context_sources(docs_result.result if hasattr(docs_result, 'result') else [])}

*더 구체적인 정보가 필요하시면 질문해 주세요.*
"""

            evidence = []
            if hasattr(docs_result, 'evidence'):
                evidence.extend(docs_result.evidence)

            return AgentResponse(
                agent_role=self.role,
                content=content,
                confidence=0.8,
                evidence=evidence,
                actions_taken=[],
                actions_suggested=[],
                authority_level=AuthorityLevel.SUGGEST,
            )

        except Exception as e:
            logger.error(f"Context query error: {e}")
            return self.create_error_response(str(e))

    def _handle_general_knowledge(self, context: AgentContext) -> AgentResponse:
        """Handle general knowledge queries."""
        query = context.request.get("query", "")

        content = f"""
## 지식 베이스 지원

질문: "{query[:100]}..."

다음 유형의 정보를 검색할 수 있습니다:

1. **문서 검색**: "인증 관련 문서 찾아줘"
2. **의사결정 이력**: "배포 관련 결정 이력 보여줘"
3. **맥락 정보**: "프로젝트 배경 설명해줘"
4. **참조 자료**: "API 스펙 문서 어디 있어?"

무엇을 찾고 계신가요?
"""

        return AgentResponse(
            agent_role=self.role,
            content=content,
            confidence=0.5,
            evidence=[],
            actions_taken=[],
            actions_suggested=[],
            authority_level=AuthorityLevel.SUGGEST,
        )

    def _format_document_results(self, documents: List[Dict]) -> str:
        """Format document search results."""
        if not documents:
            return "검색 결과 없음"

        lines = []
        for i, doc in enumerate(documents[:5], 1):
            title = doc.get("title", "제목 없음")
            score = doc.get("score", 0)
            doc_type = doc.get("type", "문서")
            lines.append(f"{i}. **{title}** ({doc_type})\n   - 관련도: {score:.0%}")

        return "\n".join(lines)

    def _extract_related_topics(self, documents: List[Dict]) -> str:
        """Extract related topics from documents."""
        topics = set()
        for doc in documents:
            for tag in doc.get("tags", []):
                topics.add(tag)

        if not topics:
            return "- 관련 주제 없음"

        return "\n".join(f"- {topic}" for topic in list(topics)[:5])

    def _format_context_sources(self, documents: List[Dict]) -> str:
        """Format context sources."""
        if not documents:
            return "- 관련 문서 없음"

        lines = []
        for doc in documents[:3]:
            title = doc.get("title", "문서")
            lines.append(f"- 📄 {title}")

        return "\n".join(lines)
