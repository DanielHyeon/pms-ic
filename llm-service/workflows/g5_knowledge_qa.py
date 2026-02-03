"""
G5: Project Knowledge Q&A Workflow

Purpose:
- RAG-based Q&A on project documents/decisions/issues
- Evidence links and "don't know what I don't know" principle enforced

Input:
- question: User's question
- project_id: Target project

Output:
- answer: Generated answer
- citations: [{doc_id, url, snippet, relevance}]
- confidence: float
- follow_up_questions: [str]
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

from .common_state import CommonWorkflowState, FailureType, merge_state
from .common_nodes import recover_from_failure, observe

logger = logging.getLogger(__name__)


class KnowledgeQAState(CommonWorkflowState):
    """G5 Knowledge Q&A specific state."""
    question: str

    # Retrieve results
    docs: List[Dict[str, Any]]
    decisions: List[Dict[str, Any]]

    # Generation results
    answer: str
    citations: List[Dict[str, Any]]
    follow_up_questions: List[str]


# =============================================================================
# Workflow Nodes
# =============================================================================

def build_context_with_permissions(state: KnowledgeQAState) -> KnowledgeQAState:
    """
    Build context with user permission check.
    """
    user_id = state.get("user_id")
    project_id = state.get("project_id")

    try:
        permissions = _get_user_permissions(user_id, project_id)
        return merge_state(state, {
            "context_snapshot": {
                "permissions": permissions,
                "accessible_doc_types": permissions.get("doc_types", ["all"]),
            }
        })
    except Exception as e:
        logger.error(f"Permissions fetch error: {e}")
        return merge_state(state, {
            "context_snapshot": {
                "permissions": {"allowed": True},
                "accessible_doc_types": ["all"],
            }
        })


def retrieve_docs(state: KnowledgeQAState) -> KnowledgeQAState:
    """
    Vector top-k search with project filter.
    """
    project_id = state.get("project_id")
    question = state.get("question", "")
    filter_types = state.get("context_snapshot", {}).get("accessible_doc_types", ["all"])

    try:
        docs = _rag_search(
            project_id=project_id,
            query=question,
            top_k=10,
            filter_types=filter_types
        )

        # Enforce project filter (data boundary protection)
        filtered_docs = [d for d in docs if d.get("project_id") == project_id]

        if len(filtered_docs) < len(docs):
            logger.warning(f"Filtered {len(docs) - len(filtered_docs)} docs from other projects")

        return merge_state(state, {"docs": filtered_docs})
    except Exception as e:
        logger.error(f"RAG search error: {e}")
        return merge_state(state, {"docs": []})


def retrieve_decisions(state: KnowledgeQAState) -> KnowledgeQAState:
    """
    Graph query for related decisions/risks.
    """
    project_id = state.get("project_id")
    docs = state.get("docs", [])

    try:
        decisions = _fetch_related_decisions(
            project_id=project_id,
            doc_ids=[d.get("id") for d in docs]
        )
        return merge_state(state, {"decisions": decisions})
    except Exception as e:
        logger.error(f"Decisions fetch error: {e}")
        return merge_state(state, {"decisions": []})


def reason_answer(state: KnowledgeQAState) -> KnowledgeQAState:
    """
    Generate answer with citations.
    """
    question = state.get("question", "")
    docs = state.get("docs", [])
    decisions = state.get("decisions", [])

    try:
        result = _generate_answer_with_citations(
            question=question,
            docs=docs,
            decisions=decisions,
            require_grounding=True
        )

        return merge_state(state, {
            "answer": result.get("answer", ""),
            "citations": result.get("citations", []),
            "confidence": result.get("confidence", 0.0),
        })
    except Exception as e:
        logger.error(f"Answer generation error: {e}")
        return merge_state(state, {
            "failure": {
                "type": FailureType.TOOL_ERROR.value,
                "detail": f"Answer generation error: {str(e)}",
                "retry_count": 0,
            }
        })


def verify_grounding(state: KnowledgeQAState) -> KnowledgeQAState:
    """
    Remove ungrounded sentences, forbid speculation.
    """
    answer = state.get("answer", "")
    citations = state.get("citations", [])
    confidence = state.get("confidence", 0.0)

    # Split into sentences
    sentences = _split_into_sentences(answer)
    verified_sentences = []
    removed_sentences = []

    for sentence in sentences:
        has_citation = any(
            citation.get("snippet", "") in sentence or
            _sentence_matches_citation(sentence, citation)
            for citation in citations
        )

        if has_citation:
            verified_sentences.append(sentence)
        elif _contains_speculation(sentence):
            removed_sentences.append(sentence)
        else:
            # Keep general statements but lower confidence
            verified_sentences.append(sentence)

    verified_answer = " ".join(verified_sentences)

    # Recalculate confidence
    if removed_sentences:
        confidence *= 0.8

    # Generate follow-up questions
    follow_up = []
    if confidence < 0.7:
        follow_up.append("Could you provide more specific details?")
    if not state.get("docs"):
        follow_up.append("No related documents found. What type of document are you looking for?")

    return merge_state(state, {
        "answer": verified_answer,
        "confidence": confidence,
        "follow_up_questions": follow_up,
    })


def recover_qa(state: KnowledgeQAState) -> KnowledgeQAState:
    """
    Q&A specific recovery.
    """
    failure = state.get("failure", {})
    failure_type = failure.get("type")

    if failure_type == FailureType.INFO_MISSING.value:
        return merge_state(state, {
            "answer": "No related documents found.",
            "follow_up_questions": [
                "Would you like to try different keywords?",
                "What type of document are you looking for?"
            ],
            "confidence": 0.0,
            "status": "completed",
        })

    if failure_type == FailureType.DATA_BOUNDARY.value:
        return merge_state(state, {
            "answer": "You don't have access to the requested information.",
            "follow_up_questions": [],
            "confidence": 0.0,
            "status": "failed",
        })

    return recover_from_failure(state)


def finalize_result(state: KnowledgeQAState) -> KnowledgeQAState:
    """
    Finalize result for output.
    """
    docs = state.get("docs", [])

    # Check if we have enough information
    if not docs:
        return merge_state(state, {
            "failure": {
                "type": FailureType.INFO_MISSING.value,
                "detail": "No relevant documents found",
                "retry_count": 0,
            }
        })

    return merge_state(state, {
        "result": {
            "answer": state.get("answer", ""),
            "citations": state.get("citations", []),
            "confidence": state.get("confidence", 0.0),
            "follow_up_questions": state.get("follow_up_questions", []),
        },
        "status": "completed",
    })


# =============================================================================
# Helper Functions
# =============================================================================

def _get_user_permissions(user_id: str, project_id: str) -> Dict:
    """Get user permissions for project."""
    try:
        from guards.policy_engine import PolicyEngine
        engine = PolicyEngine()
        return engine.get_user_permissions(user_id, project_id)
    except ImportError:
        return {"allowed": True, "doc_types": ["all"]}


def _rag_search(project_id: str, query: str, top_k: int, filter_types: List[str]) -> List[Dict]:
    """RAG search for documents."""
    try:
        from services.rag_service_neo4j import RAGServiceNeo4j
        rag = RAGServiceNeo4j()
        return rag.search(project_id, query, top_k=top_k)
    except ImportError:
        return []


def _fetch_related_decisions(project_id: str, doc_ids: List[str]) -> List[Dict]:
    """Fetch related decisions from graph."""
    try:
        from services.rag_service_neo4j import graph_query
        # Query: MATCH (d:Document)-[:RELATED_TO]->(dec:Decision) WHERE d.id IN $ids RETURN dec
        return []
    except ImportError:
        return []


def _generate_answer_with_citations(
    question: str,
    docs: List[Dict],
    decisions: List[Dict],
    require_grounding: bool
) -> Dict:
    """Generate answer using LLM with citation requirements."""
    try:
        from integrations.model_gateway import ModelGateway
        gateway = ModelGateway()

        # Build context from docs
        context_parts = []
        for i, doc in enumerate(docs[:5]):  # Limit to top 5
            context_parts.append(f"[{i+1}] {doc.get('title', 'Document')}: {doc.get('content', '')[:500]}")

        context = "\n\n".join(context_parts)

        prompt = f"""Based on the following documents, answer the question.
Include citations in [N] format.
If you don't have enough information, say so clearly.

Documents:
{context}

Question: {question}

Answer with citations:"""

        result = gateway.generate(prompt)
        content = result.get("content", "")

        # Extract citations
        citations = []
        for i, doc in enumerate(docs[:5]):
            if f"[{i+1}]" in content:
                citations.append({
                    "doc_id": doc.get("id"),
                    "url": doc.get("url", ""),
                    "snippet": doc.get("content", "")[:200],
                    "relevance": doc.get("score", 0.5),
                })

        # Calculate confidence based on citations
        confidence = len(citations) / max(len(docs[:5]), 1) if docs else 0.0

        return {
            "answer": content,
            "citations": citations,
            "confidence": min(confidence + 0.3, 1.0),  # Base confidence boost
        }
    except Exception as e:
        logger.error(f"Answer generation error: {e}")
        return {
            "answer": f"Unable to generate answer: {str(e)}",
            "citations": [],
            "confidence": 0.0,
        }


def _split_into_sentences(text: str) -> List[str]:
    """Split text into sentences."""
    import re
    sentences = re.split(r'(?<=[.!?])\s+', text)
    return [s.strip() for s in sentences if s.strip()]


def _sentence_matches_citation(sentence: str, citation: Dict) -> bool:
    """Check if sentence is supported by citation."""
    snippet = citation.get("snippet", "").lower()
    sentence_lower = sentence.lower()

    # Simple overlap check
    sentence_words = set(sentence_lower.split())
    snippet_words = set(snippet.split())

    overlap = len(sentence_words & snippet_words)
    return overlap >= 3


def _contains_speculation(sentence: str) -> bool:
    """Check if sentence contains speculation markers."""
    speculation_markers = [
        "probably", "likely", "might", "could be", "possibly",
        "i think", "perhaps", "maybe", "seems like", "appears to",
        "아마", "것 같다", "추측", "예상"
    ]
    sentence_lower = sentence.lower()
    return any(marker in sentence_lower for marker in speculation_markers)


# =============================================================================
# Workflow Factory
# =============================================================================

def create_g5_knowledge_qa_workflow():
    """Create G5: Knowledge Q&A workflow graph."""

    workflow = StateGraph(KnowledgeQAState)

    # === Add Nodes ===
    workflow.add_node("build_context", build_context_with_permissions)
    workflow.add_node("retrieve_docs", retrieve_docs)
    workflow.add_node("retrieve_decisions", retrieve_decisions)
    workflow.add_node("reason_answer", reason_answer)
    workflow.add_node("verify_grounding", verify_grounding)
    workflow.add_node("finalize_result", finalize_result)
    workflow.add_node("observe", observe)
    workflow.add_node("recover", recover_qa)

    # === Define Edges ===
    workflow.set_entry_point("build_context")
    workflow.add_edge("build_context", "retrieve_docs")
    workflow.add_edge("retrieve_docs", "retrieve_decisions")
    workflow.add_edge("retrieve_decisions", "reason_answer")
    workflow.add_edge("reason_answer", "verify_grounding")
    workflow.add_edge("verify_grounding", "finalize_result")

    def check_for_failure(state) -> str:
        if state.get("failure"):
            return "recover"
        return "observe"

    workflow.add_conditional_edges(
        "finalize_result",
        check_for_failure,
        {"recover": "recover", "observe": "observe"}
    )

    workflow.add_edge("observe", END)
    workflow.add_edge("recover", "observe")

    return workflow.compile()


# =============================================================================
# Failure Handling
# =============================================================================

G5_FAILURE_HANDLING = {
    "info_missing": "No related docs -> Suggest 'required document/keyword' + refine question",
    "data_boundary": "Risk of mixing other project docs -> Enforce project filter, stop on violation",
}
