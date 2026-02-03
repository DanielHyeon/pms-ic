"""
LLM Tools - MCP tools for LLM operations

Provides LLM-based text generation, summarization, and embedding.
"""

from typing import Dict, Any, List, Optional
import logging

from .. import ToolDefinition, ToolCategory, AccessLevel
from ..registry import get_registry

logger = logging.getLogger(__name__)


# LLM client (lazy loaded)
_llm_client = None


def _get_llm():
    """Get LLM client."""
    global _llm_client
    if _llm_client is None:
        try:
            # Try to import from model_gateway
            from integrations.model_gateway import get_gateway
            _llm_client = get_gateway()
        except ImportError:
            logger.warning("model_gateway not available, using stub")
            _llm_client = StubLLMClient()

    return _llm_client


class StubLLMClient:
    """Stub LLM client for when model_gateway is not available."""

    def generate(self, prompt: str, **kwargs) -> str:
        return f"[LLM Response for: {prompt[:50]}...]"

    def embed(self, text: str) -> List[float]:
        # Return dummy embedding
        return [0.0] * 768


# Tool implementations

def generate_text(
    prompt: str,
    max_tokens: int = 1024,
    temperature: float = 0.7,
    system_prompt: str = None
) -> Dict[str, Any]:
    """
    Generate text using LLM.

    Args:
        prompt: Input prompt
        max_tokens: Maximum tokens to generate
        temperature: Sampling temperature
        system_prompt: Optional system prompt

    Returns:
        Generated text and metadata
    """
    llm = _get_llm()

    try:
        full_prompt = prompt
        if system_prompt:
            full_prompt = f"{system_prompt}\n\n{prompt}"

        response = llm.generate(
            prompt=full_prompt,
            max_tokens=max_tokens,
            temperature=temperature,
        )

        # Handle different response types
        if isinstance(response, dict):
            text = response.get("text", response.get("content", str(response)))
            tokens_used = response.get("tokens_used", 0)
        else:
            text = str(response)
            tokens_used = len(text.split())  # Rough estimate

        return {
            "text": text,
            "tokens_used": tokens_used,
            "model": "gemma-12b",
        }

    except Exception as e:
        logger.error(f"generate_text error: {e}")
        return {"text": "", "error": str(e)}


def generate_summary(
    content: str,
    max_length: int = 200,
    style: str = "concise"
) -> Dict[str, Any]:
    """
    Generate summary of content.

    Args:
        content: Content to summarize
        max_length: Maximum summary length in words
        style: Summary style (concise, detailed, bullet)

    Returns:
        Summary text
    """
    llm = _get_llm()

    style_instructions = {
        "concise": "Provide a brief, concise summary.",
        "detailed": "Provide a detailed summary with key points.",
        "bullet": "Provide a bullet-point summary of key points.",
    }

    prompt = f"""Summarize the following content in {max_length} words or less.
{style_instructions.get(style, style_instructions['concise'])}

Content:
{content[:4000]}  # Limit input length

Summary:"""

    try:
        response = llm.generate(
            prompt=prompt,
            max_tokens=max_length * 2,
            temperature=0.3,
        )

        if isinstance(response, dict):
            summary = response.get("text", response.get("content", str(response)))
        else:
            summary = str(response)

        return {
            "summary": summary.strip(),
            "original_length": len(content),
            "summary_length": len(summary.split()),
            "style": style,
        }

    except Exception as e:
        logger.error(f"generate_summary error: {e}")
        return {"summary": "", "error": str(e)}


def classify_intent(
    query: str,
    categories: List[str] = None
) -> Dict[str, Any]:
    """
    Classify the intent of a query.

    Args:
        query: User query
        categories: Possible categories (optional)

    Returns:
        Classification result with confidence
    """
    default_categories = [
        "planning",
        "status",
        "report",
        "search",
        "risk",
        "general",
    ]

    categories = categories or default_categories

    llm = _get_llm()

    prompt = f"""Classify the following query into one of these categories: {', '.join(categories)}

Query: "{query}"

Respond with only the category name."""

    try:
        response = llm.generate(
            prompt=prompt,
            max_tokens=50,
            temperature=0.1,
        )

        if isinstance(response, dict):
            intent = response.get("text", response.get("content", "general"))
        else:
            intent = str(response)

        intent = intent.strip().lower()

        # Validate intent is in categories
        if intent not in [c.lower() for c in categories]:
            intent = "general"

        # Calculate confidence based on keyword matching
        confidence = 0.8
        query_lower = query.lower()

        if intent == "planning" and any(k in query_lower for k in ["plan", "sprint", "schedule"]):
            confidence = 0.95
        elif intent == "status" and any(k in query_lower for k in ["status", "progress", "how"]):
            confidence = 0.95
        elif intent == "report" and any(k in query_lower for k in ["report", "summary", "weekly"]):
            confidence = 0.95

        return {
            "intent": intent,
            "confidence": confidence,
            "categories": categories,
        }

    except Exception as e:
        logger.error(f"classify_intent error: {e}")
        return {"intent": "general", "confidence": 0.5, "error": str(e)}


def embed_text(
    text: str,
    model: str = "multilingual-e5-large"
) -> Dict[str, Any]:
    """
    Generate embedding for text.

    Args:
        text: Text to embed
        model: Embedding model to use

    Returns:
        Embedding vector
    """
    llm = _get_llm()

    try:
        # Use embed method if available, otherwise generate
        if hasattr(llm, 'embed'):
            embedding = llm.embed(text)
        else:
            # Generate dummy embedding based on text
            import hashlib
            hash_bytes = hashlib.sha256(text.encode()).digest()
            embedding = [b / 255.0 for b in hash_bytes] * 24  # 768 dims

        return {
            "embedding": embedding,
            "dimensions": len(embedding),
            "model": model,
            "text_length": len(text),
        }

    except Exception as e:
        logger.error(f"embed_text error: {e}")
        return {"embedding": [], "error": str(e)}


# Tool definitions

generate_text_tool = ToolDefinition(
    name="generate_text",
    description="Generate text using LLM",
    category=ToolCategory.LLM,
    handler=generate_text,
    input_schema={
        "type": "object",
        "properties": {
            "prompt": {"type": "string", "description": "Input prompt"},
            "max_tokens": {"type": "integer", "default": 1024},
            "temperature": {"type": "number", "default": 0.7},
            "system_prompt": {"type": "string", "description": "Optional system prompt"},
        },
        "required": ["prompt"],
    },
    output_schema={
        "type": "object",
        "properties": {
            "text": {"type": "string"},
            "tokens_used": {"type": "integer"},
        },
    },
    access_level=AccessLevel.PROJECT,
    rate_limit=30,
    cost_per_call=0.01,
    tags=["llm", "generate", "text"],
)

generate_summary_tool = ToolDefinition(
    name="generate_summary",
    description="Generate summary of content",
    category=ToolCategory.LLM,
    handler=generate_summary,
    input_schema={
        "type": "object",
        "properties": {
            "content": {"type": "string", "description": "Content to summarize"},
            "max_length": {"type": "integer", "default": 200},
            "style": {
                "type": "string",
                "enum": ["concise", "detailed", "bullet"],
                "default": "concise",
            },
        },
        "required": ["content"],
    },
    access_level=AccessLevel.PROJECT,
    rate_limit=20,
    cost_per_call=0.02,
    tags=["llm", "summary", "text"],
)

classify_intent_tool = ToolDefinition(
    name="classify_intent",
    description="Classify the intent of a query",
    category=ToolCategory.LLM,
    handler=classify_intent,
    input_schema={
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "User query"},
            "categories": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Possible categories",
            },
        },
        "required": ["query"],
    },
    access_level=AccessLevel.PROJECT,
    rate_limit=60,
    cost_per_call=0.005,
    tags=["llm", "classify", "intent"],
)

embed_text_tool = ToolDefinition(
    name="embed_text",
    description="Generate embedding vector for text",
    category=ToolCategory.LLM,
    handler=embed_text,
    input_schema={
        "type": "object",
        "properties": {
            "text": {"type": "string", "description": "Text to embed"},
            "model": {"type": "string", "default": "multilingual-e5-large"},
        },
        "required": ["text"],
    },
    access_level=AccessLevel.PROJECT,
    rate_limit=100,
    cost_per_call=0.001,
    tags=["llm", "embedding", "vector"],
)


def register_llm_tools():
    """Register all LLM tools with the registry."""
    registry = get_registry()
    registry.register(generate_text_tool)
    registry.register(generate_summary_tool)
    registry.register(classify_intent_tool)
    registry.register(embed_text_tool)
    logger.info("Registered 4 LLM tools")
