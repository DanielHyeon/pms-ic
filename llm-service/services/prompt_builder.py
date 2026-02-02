"""
Prompt Builder Service - Model-specific prompt formatting.

Extracted from app.py. Supports:
- Gemma 3: user/model turns only (no system role)
- Qwen3: ChatML format with /no_think mode
- ChatML (LFM2/Llama): system/user/assistant roles
"""

import logging
from typing import List, Dict, Optional, Union

logger = logging.getLogger(__name__)


class PromptBuilder:
    """
    Build model-specific prompts for different LLM architectures.

    Detects model type from path and applies appropriate format.
    """

    SYSTEM_PROMPT = """Role: 전략적 프로젝트 파트너 "시너지(Synergy)"
당신은 프로젝트의 성공을 고민하는 지능형 파트너입니다. RAG 시스템의 지식을 바탕으로 자연스럽고 깊이 있는 답변을 제공하세요.

1. 대화 원칙: 능동적 경청, 공감, 풍부한 답변 구조(결론-근거-제언).
2. RAG 지침: 제공된 컨텍스트를 현재 맥락에 맞춰 재해석하고 출처를 명시할 것.
3. 전문성: 일정, 우선순위, 리스크 감지 및 협업 가이드 제공.
4. 스타일: 전문적이고 고무적인 톤, 한국어 중심, 가독성을 위한 마크다운 활용.
"""

    def __init__(self, model_path: Optional[str] = None):
        """
        Initialize PromptBuilder.

        Args:
            model_path: Path to model file for format detection
        """
        self.model_path = model_path
        self._model_type = self._detect_model_type()

    def _detect_model_type(self) -> str:
        """Detect model type from path."""
        if not self.model_path:
            return "chatml"

        path_lower = self.model_path.lower()
        if "gemma" in path_lower:
            return "gemma"
        elif "qwen" in path_lower:
            return "qwen"
        return "chatml"

    @property
    def is_gemma(self) -> bool:
        """Check if model is Gemma."""
        return self._model_type == "gemma"

    @property
    def is_qwen(self) -> bool:
        """Check if model is Qwen."""
        return self._model_type == "qwen"

    def build(
        self,
        message: str,
        context: List[Dict[str, str]] = None,
        retrieved_docs: List[Union[str, Dict]] = None,
        system_prompt: Optional[str] = None
    ) -> str:
        """
        Build prompt with model-specific format.

        Args:
            message: Current user message
            context: Previous conversation messages [{role, content}]
            retrieved_docs: Retrieved RAG documents
            system_prompt: Optional custom system prompt

        Returns:
            Formatted prompt string
        """
        context = context or []
        retrieved_docs = retrieved_docs or []
        system_prompt = system_prompt or self.SYSTEM_PROMPT

        if self.is_gemma:
            return self._build_gemma_prompt(message, context, retrieved_docs, system_prompt)
        elif self.is_qwen:
            return self._build_qwen_prompt(message, context, retrieved_docs, system_prompt)
        else:
            return self._build_chatml_prompt(message, context, retrieved_docs, system_prompt)

    def _build_gemma_prompt(
        self,
        message: str,
        context: List[Dict[str, str]],
        retrieved_docs: List[Union[str, Dict]],
        system_prompt: str
    ) -> str:
        """Build Gemma 3 format prompt (user/model only, no system role)."""
        parts = []

        # System instruction as first user message
        first_user_msg = f"[시스템 지침]\n{system_prompt}\n\n[대화 시작]"
        parts.append(f"<start_of_turn>user\n{first_user_msg}<end_of_turn>")
        parts.append("<start_of_turn>model\n네, 이해했습니다. 프로젝트 관리 관련 질문에 상세히 답변하겠습니다.<end_of_turn>")

        # Context messages (last 5)
        self._append_context_gemma(parts, context)

        # Current question with RAG docs
        user_content = self._build_user_content(message, retrieved_docs)
        parts.append(f"<start_of_turn>user\n{user_content}<end_of_turn>")
        parts.append("<start_of_turn>model\n")

        return "\n".join(parts)

    def _build_qwen_prompt(
        self,
        message: str,
        context: List[Dict[str, str]],
        retrieved_docs: List[Union[str, Dict]],
        system_prompt: str
    ) -> str:
        """Build Qwen3 ChatML format with /no_think mode."""
        parts = []
        parts.append(f"<|im_start|>system\n{system_prompt}<|im_end|>")

        # Context messages (last 5)
        self._append_context_chatml(parts, context)

        # Current question with RAG docs + /no_think suffix
        user_content = self._build_user_content(message, retrieved_docs)
        user_content += " /no_think"
        parts.append(f"<|im_start|>user\n{user_content}<|im_end|>")
        parts.append("<|im_start|>assistant\n")

        return "\n".join(parts)

    def _build_chatml_prompt(
        self,
        message: str,
        context: List[Dict[str, str]],
        retrieved_docs: List[Union[str, Dict]],
        system_prompt: str
    ) -> str:
        """Build ChatML format for LFM2/Llama."""
        parts = []
        parts.append(f"<|im_start|>system\n{system_prompt}<|im_end|>")

        # Context messages (last 5)
        self._append_context_chatml(parts, context)

        # Current question with RAG docs
        user_content = self._build_user_content(message, retrieved_docs)
        parts.append(f"<|im_start|>user\n{user_content}<|im_end|>")
        parts.append("<|im_start|>assistant\n")

        return "\n".join(parts)

    def _append_context_gemma(self, parts: List[str], context: List[Dict[str, str]]) -> None:
        """Append context messages in Gemma format."""
        for msg in context[-5:]:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if not content:
                continue
            if role == "user":
                parts.append(f"<start_of_turn>user\n{content}<end_of_turn>")
            elif role == "assistant":
                parts.append(f"<start_of_turn>model\n{content}<end_of_turn>")

    def _append_context_chatml(self, parts: List[str], context: List[Dict[str, str]]) -> None:
        """Append context messages in ChatML format."""
        for msg in context[-5:]:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if not content:
                continue
            if role == "user":
                parts.append(f"<|im_start|>user\n{content}<|im_end|>")
            elif role == "assistant":
                parts.append(f"<|im_start|>assistant\n{content}<|im_end|>")

    def _build_user_content(self, message: str, retrieved_docs: List[Union[str, Dict]]) -> str:
        """Build user content with optional RAG documents."""
        if not retrieved_docs:
            return message

        docs_text = self._format_docs(retrieved_docs)
        return f"질문: {message}\n\n참고 문서:\n{docs_text}\n\n위 참고 문서를 바탕으로 질문에 상세히 답변해주세요."

    def _format_docs(self, docs: List[Union[str, Dict]]) -> str:
        """Format retrieved documents for prompt."""
        formatted = []
        for i, doc in enumerate(docs, 1):
            if isinstance(doc, str):
                content = doc
            elif isinstance(doc, dict):
                content = doc.get('content', str(doc))
            else:
                content = str(doc)
            formatted.append(f"[문서 {i}]\n{content}")
        return "\n\n".join(formatted)


def build_prompt(
    message: str,
    context: List[Dict[str, str]] = None,
    retrieved_docs: List[Union[str, Dict]] = None,
    model_path: Optional[str] = None
) -> str:
    """
    Legacy function for backward compatibility.

    Args:
        message: Current user message
        context: Previous conversation messages
        retrieved_docs: Retrieved RAG documents
        model_path: Path to model file for format detection

    Returns:
        Formatted prompt string
    """
    builder = PromptBuilder(model_path)
    return builder.build(message, context, retrieved_docs)
