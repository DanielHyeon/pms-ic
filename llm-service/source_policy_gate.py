"""
Source Policy Gate

Enforces source restrictions by answer type to prevent hallucination.
Status queries can ONLY use database results, not RAG documents.

Reference: docs/STATUS_QUERY_IMPLEMENTATION_PLAN.md
"""

import logging
from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional
from enum import Enum

from answer_type_classifier import AnswerType

logger = logging.getLogger(__name__)


# =============================================================================
# Policy Definitions
# =============================================================================

class DocumentUsage(Enum):
    """How documents can be used in response"""
    NONE = "none"                    # Documents not allowed at all
    SUPPLEMENT_ONLY = "supplement"   # Only as supplementary info (marked as "reference")
    PRIMARY = "primary"              # Documents are primary source


@dataclass
class SourcePolicy:
    """Policy for a specific answer type"""
    allowed_sources: List[str]       # ["database", "snapshot", "document_rag"]
    forbidden_sources: List[str]     # Sources explicitly blocked
    document_usage: DocumentUsage    # How documents can be used
    require_db_data: bool = False    # Must have DB data to respond


# Policy definitions by answer type
SOURCE_POLICIES: Dict[AnswerType, SourcePolicy] = {
    AnswerType.STATUS_METRIC: SourcePolicy(
        allowed_sources=["database", "snapshot"],
        forbidden_sources=["document_rag"],
        document_usage=DocumentUsage.NONE,
        require_db_data=True,
    ),
    AnswerType.STATUS_LIST: SourcePolicy(
        allowed_sources=["database", "snapshot"],
        forbidden_sources=["document_rag"],
        document_usage=DocumentUsage.NONE,
        require_db_data=True,
    ),
    AnswerType.STATUS_DRILLDOWN: SourcePolicy(
        allowed_sources=["database", "snapshot"],
        forbidden_sources=["document_rag"],
        document_usage=DocumentUsage.NONE,
        require_db_data=True,
    ),
    AnswerType.HOWTO_POLICY: SourcePolicy(
        allowed_sources=["document_rag"],
        forbidden_sources=[],
        document_usage=DocumentUsage.PRIMARY,
        require_db_data=False,
    ),
    AnswerType.MIXED: SourcePolicy(
        allowed_sources=["database", "snapshot", "document_rag"],
        forbidden_sources=[],
        document_usage=DocumentUsage.SUPPLEMENT_ONLY,
        require_db_data=True,
    ),
    AnswerType.CASUAL: SourcePolicy(
        allowed_sources=[],
        forbidden_sources=["database", "document_rag"],
        document_usage=DocumentUsage.NONE,
        require_db_data=False,
    ),
}


# =============================================================================
# Context Builder
# =============================================================================

@dataclass
class FilteredContext:
    """Context filtered by source policy"""
    answer_type: AnswerType
    policy: SourcePolicy

    # Database results (primary for status queries)
    db_data: Optional[Dict[str, Any]] = None
    has_db_data: bool = False

    # Document results (for howto or supplement)
    documents: List[Dict] = field(default_factory=list)
    document_label: str = ""  # "Reference" or "Primary Source"

    # Validation
    can_respond: bool = True
    block_reason: Optional[str] = None
    warnings: List[str] = field(default_factory=list)


class SourcePolicyGate:
    """
    Enforces source restrictions by answer type.

    This is the key component that prevents PDF documents from being used
    as evidence for status queries, eliminating the hallucination problem.
    """

    def __init__(self):
        self.policies = SOURCE_POLICIES

    def get_policy(self, answer_type: AnswerType) -> SourcePolicy:
        """Get policy for answer type"""
        return self.policies.get(answer_type, self.policies[AnswerType.HOWTO_POLICY])

    def filter_context(
        self,
        answer_type: AnswerType,
        db_results: Optional[Dict[str, Any]] = None,
        rag_results: Optional[List[Dict]] = None,
    ) -> FilteredContext:
        """
        Filter context based on answer type policy.

        Args:
            answer_type: Classified answer type
            db_results: Results from StatusQueryExecutor
            rag_results: Results from RAG search

        Returns:
            FilteredContext with only allowed sources
        """
        policy = self.get_policy(answer_type)
        context = FilteredContext(
            answer_type=answer_type,
            policy=policy,
        )

        # Check if DB data is available
        if db_results:
            # Check if there's actual data (not just errors)
            has_data = any(
                metric.get("data") is not None
                for metric in db_results.get("metrics", {}).values()
            ) if isinstance(db_results.get("metrics"), dict) else bool(db_results)

            context.has_db_data = has_data

            if "database" in policy.allowed_sources:
                context.db_data = db_results
            else:
                context.warnings.append("Database results filtered out by policy")

        # Check if documents are allowed
        if rag_results:
            if "document_rag" in policy.forbidden_sources:
                context.warnings.append(
                    f"Document RAG results blocked for {answer_type.value} queries"
                )
                logger.info(f"Blocking {len(rag_results)} RAG documents for {answer_type.value}")
            elif policy.document_usage == DocumentUsage.NONE:
                context.warnings.append("Documents not allowed for this query type")
            elif policy.document_usage == DocumentUsage.SUPPLEMENT_ONLY:
                # Include documents but mark as supplement
                context.documents = rag_results[:2]  # Limit to 2 for supplement
                context.document_label = "Reference (not primary source)"
            elif policy.document_usage == DocumentUsage.PRIMARY:
                context.documents = rag_results
                context.document_label = "Primary Source"

        # Validate: can we respond?
        if policy.require_db_data and not context.has_db_data:
            context.can_respond = False
            context.block_reason = "Status query requires database data but none available"

        return context

    def should_skip_rag(self, answer_type: AnswerType) -> bool:
        """Check if RAG search should be skipped entirely for this answer type"""
        policy = self.get_policy(answer_type)
        return "document_rag" in policy.forbidden_sources

    def should_use_db(self, answer_type: AnswerType) -> bool:
        """Check if database query should be executed for this answer type"""
        policy = self.get_policy(answer_type)
        return "database" in policy.allowed_sources

    def get_no_data_message(self, answer_type: AnswerType) -> str:
        """Get appropriate message when no data is available"""
        if answer_type in {
            AnswerType.STATUS_METRIC,
            AnswerType.STATUS_LIST,
            AnswerType.STATUS_DRILLDOWN,
        }:
            return (
                "현재 조회 가능한 데이터가 부족합니다. "
                "프로젝트에 스토리나 스프린트가 등록되어 있는지 확인해주세요."
            )
        elif answer_type == AnswerType.HOWTO_POLICY:
            return (
                "관련 문서를 찾지 못했습니다. "
                "질문을 더 구체적으로 해주시거나, 다른 키워드로 검색해주세요."
            )
        else:
            return "요청하신 정보를 찾지 못했습니다."


# =============================================================================
# LLM Prompt Modifiers
# =============================================================================

def get_status_summarization_prompt(
    db_results: Dict[str, Any],
    answer_type: AnswerType,
) -> str:
    """
    Generate LLM prompt for status summarization.

    CRITICAL: This prompt explicitly forbids using any information
    not present in the provided data.
    """
    import json

    data_json = json.dumps(db_results, ensure_ascii=False, indent=2)

    return f"""You are a PMS assistant. Summarize the project status based ONLY on the provided data.

STRICT RULES - YOU MUST FOLLOW:
1. Use ONLY the data provided below. Do NOT make up any numbers or facts.
2. If data is missing, zero, or null, say "데이터 없음" or "0건" - do NOT guess or estimate.
3. Do NOT reference any documents, PDFs, or external knowledge.
4. Do NOT mention team names, project names, or statistics that are not in the data below.
5. Be concise and factual. Use Korean.

DATA (this is the ONLY source you can use):
{data_json}

Generate a natural Korean summary of the project status. Include:
- 진행률/완료율 (if available in data)
- 상태별 스토리 수 (if available in data)
- 차단/지연 항목 (if available in data)
- WIP 현황 (if available in data)

If any metric is not in the data, skip it - do NOT make up values.
"""


def get_howto_prompt(
    documents: List[Dict],
    question: str,
) -> str:
    """Generate LLM prompt for how-to questions using documents"""
    doc_texts = []
    for i, doc in enumerate(documents[:5], 1):
        content = doc.get("content", "")[:500]
        title = doc.get("title", f"Document {i}")
        doc_texts.append(f"[{title}]\n{content}")

    context = "\n\n---\n\n".join(doc_texts)

    return f"""You are a PMS assistant. Answer the question based on the provided documents.

DOCUMENTS:
{context}

QUESTION: {question}

Answer in Korean. If the documents don't contain relevant information, say so.
"""


# =============================================================================
# Singleton Instance
# =============================================================================

_gate: Optional[SourcePolicyGate] = None


def get_source_policy_gate() -> SourcePolicyGate:
    """Get singleton gate instance"""
    global _gate
    if _gate is None:
        _gate = SourcePolicyGate()
    return _gate
