"""
Chat API Routes.

Handles /api/chat/v2 endpoint (Two-Track Workflow).
Legacy /api/chat has been removed - fallback uses chat_legacy() internally.
"""

import os
import re
import string
import logging
from flask import request, jsonify

from . import chat_bp
from services.model_service import get_model_service
from services.prompt_builder import build_prompt
from utils.normalize import normalize_retrieved_docs

logger = logging.getLogger(__name__)

# Generation parameters (optimized for Qwen3/Gemma3)
MAX_TOKENS = int(os.getenv("MAX_TOKENS", "1800"))
TEMPERATURE = float(os.getenv("TEMPERATURE", "0.35"))
TOP_P = float(os.getenv("TOP_P", "0.90"))
MIN_P = float(os.getenv("MIN_P", "0.12"))
REPEAT_PENALTY = float(os.getenv("REPEAT_PENALTY", "1.10"))

# Two-track workflow v2 (lazy loading)
_two_track_workflow = None


def _fallback_to_legacy(message: str, context: list, retrieved_docs: list):
    """
    Fallback handler when Two-Track Workflow fails.
    Loads model and calls chat_legacy() directly.
    """
    model_service = get_model_service()
    try:
        model, rag, _ = model_service.load_model()
    except Exception as load_error:
        logger.error(f"Failed to load model for fallback: {load_error}", exc_info=True)
        return jsonify({
            "error": "Model not available",
            "message": f"Failed to load model: {str(load_error)}",
            "reply": "죄송합니다. 현재 AI 모델을 로드할 수 없습니다. 잠시 후 다시 시도해주세요."
        }), 503

    if model is None:
        logger.error("Model is None after load_model()")
        return jsonify({
            "error": "Model not loaded",
            "message": "Model failed to load",
            "reply": "죄송합니다. 현재 AI 모델을 사용할 수 없습니다. 잠시 후 다시 시도해주세요."
        }), 503

    try:
        return chat_legacy(message, context, model, rag, retrieved_docs)
    except Exception as legacy_error:
        logger.error(f"Legacy chat failed: {legacy_error}", exc_info=True)
        return jsonify({
            "error": "Chat processing failed",
            "message": str(legacy_error),
            "reply": "죄송합니다. 응답 생성 중 오류가 발생했습니다."
        }), 500


def get_two_track_workflow():
    """Get or initialize Two-Track Workflow v2 (lazy loading)."""
    global _two_track_workflow
    if _two_track_workflow is None:
        try:
            from llama_cpp import Llama
            from chat_workflow_v2 import TwoTrackWorkflow
            from service_state import get_state

            state = get_state()
            model_service = get_model_service()

            model_l2, rag, _ = model_service.load_model()
            if model_l2 is None:
                raise RuntimeError("L2 model not loaded")

            model_l1 = model_l2
            l1_path = state.lightweight_model_path
            l2_path = state.medium_model_path or state.current_model_path

            if l1_path and l1_path != l2_path and os.path.exists(l1_path):
                try:
                    logger.info(f"Loading L1 (lightweight) model: {l1_path}")
                    n_ctx = int(os.getenv("LLM_N_CTX", "4096"))
                    n_threads = int(os.getenv("LLM_N_THREADS", "6"))
                    model_l1 = Llama(
                        model_path=l1_path,
                        n_ctx=n_ctx,
                        n_threads=n_threads,
                        verbose=False,
                        n_gpu_layers=0,
                    )
                    logger.info(f"L1 model loaded: {l1_path}")
                except Exception as l1_error:
                    logger.warning(f"Failed to load L1 model, using L2 for both: {l1_error}")
                    model_l1 = model_l2
                    l1_path = l2_path
            else:
                l1_path = l2_path
                logger.info("Using same model for L1 and L2")

            _two_track_workflow = TwoTrackWorkflow(
                llm_l1=model_l1,
                llm_l2=model_l2,
                rag_service=rag,
                model_path_l1=l1_path,
                model_path_l2=l2_path,
            )
            logger.info(f"Two-Track Workflow v2 initialized (L1={os.path.basename(l1_path)}, L2={os.path.basename(l2_path)})")
        except Exception as e:
            logger.error(f"Failed to initialize Two-Track Workflow: {e}")
            raise
    return _two_track_workflow


@chat_bp.route("/api/chat/v2", methods=["POST"])
def chat_v2():
    """
    Two-Track Chat API v2 with Access Control.

    Track A: Fast responses for FAQ, status queries (p95 < 500ms target)
    Track B: Quality responses for reports, analysis (30-90s acceptable)
    """
    try:
        data = request.json
        message = data.get("message", "")
        context = data.get("context", [])
        retrieved_docs = normalize_retrieved_docs(data.get("retrieved_docs", []))
        user_id = data.get("user_id")
        project_id = data.get("project_id")
        user_role = data.get("user_role", "MEMBER")
        user_access_level = data.get("user_access_level")

        if user_access_level is None:
            from rag_service_neo4j import get_access_level
            user_access_level = get_access_level(user_role)

        if not message:
            return jsonify({"error": "Message is required"}), 400

        try:
            workflow = get_two_track_workflow()
        except Exception as workflow_error:
            logger.error(f"Failed to get two-track workflow: {workflow_error}", exc_info=True)
            logger.info("Falling back to legacy chat")
            return _fallback_to_legacy(message, context, retrieved_docs)

        logger.info(f"Processing chat v2: {message[:50]}... (project={project_id}, role={user_role}, level={user_access_level})")
        try:
            result = workflow.run(
                message=message,
                context=context,
                retrieved_docs=retrieved_docs,
                user_id=user_id,
                project_id=project_id,
                user_role=user_role,
                user_access_level=user_access_level,
            )

            reply = result.get("reply")
            if not reply or reply.strip() == "":
                logger.warning("Workflow v2 returned empty reply")
                reply = "죄송합니다. 응답을 생성할 수 없습니다."

            return jsonify({
                "reply": reply,
                "confidence": result.get("confidence", 0.85),
                "track": result.get("track", "track_a"),
                "suggestions": [],
                "metadata": {
                    "intent": result.get("intent"),
                    "rag_docs_count": result.get("rag_docs_count", 0),
                    "workflow": "two_track_v2",
                    "metrics": result.get("metrics", {}),
                    "debug_info": result.get("debug_info", {})
                }
            })

        except Exception as workflow_error:
            logger.error(f"Two-track workflow execution failed: {workflow_error}", exc_info=True)
            logger.info("Falling back to legacy chat after v2 workflow failure")
            return _fallback_to_legacy(message, context, retrieved_docs)

    except Exception as e:
        logger.error(f"Error processing chat v2 request: {e}", exc_info=True)
        return jsonify({
            "error": "Failed to process chat request",
            "message": str(e),
            "reply": "죄송합니다. 현재 AI 서비스가 일시적으로 사용 불가합니다."
        }), 500


def chat_legacy(message: str, context: list, model, rag, retrieved_docs: list = None):
    """레거시 채팅 처리 (LangGraph 없을 때)"""
    from service_state import get_state
    state = get_state()

    try:
        if not retrieved_docs:
            retrieved_docs = []
        if not retrieved_docs and rag:
            retrieved_docs_objs = rag.search(message, top_k=3)
            retrieved_docs = [doc['content'] for doc in retrieved_docs_objs]
            logger.info(f"RAG search found {len(retrieved_docs)} documents")

        model.reset()

        prompt = build_prompt(message, context, retrieved_docs, model_path=state.current_model_path)

        response = model(
            prompt,
            max_tokens=MAX_TOKENS,
            temperature=TEMPERATURE,
            top_p=TOP_P,
            min_p=MIN_P,
            stop=["<end_of_turn>", "<start_of_turn>", "</s>", "<|im_end|>"],
            echo=False,
            repeat_penalty=REPEAT_PENALTY
        )

        reply = response["choices"][0]["text"].strip()
        reply = _clean_legacy_response(reply)

        return jsonify({
            "reply": reply,
            "confidence": 0.85,
            "suggestions": [],
            "metadata": {"workflow": "legacy"}
        })

    except Exception as e:
        logger.error(f"Legacy chat error: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


def _clean_legacy_response(reply: str) -> str:
    """Clean up legacy response from model artifacts."""
    # Remove special tokens
    reply = reply.replace("<start_of_turn>", "").replace("<end_of_turn>", "")
    reply = reply.replace("<|im_end|>", "").replace("|im_end|>", "").replace("<|im_end", "")

    # Remove Qwen3 thinking tokens
    reply = re.sub(r"<think>[\s\S]*?</think>", "", reply)

    # Remove role prefixes
    if reply.startswith("model"):
        reply = reply[5:].strip()
    if reply.startswith("assistant"):
        reply = reply[9:].strip()

    # Clean individual lines
    cleaned_lines = []
    for line in reply.splitlines():
        stripped = line.strip()
        lower = stripped.lower()
        if lower.startswith("assistant:") or lower.startswith("assistant："):
            stripped = stripped.split(":", 1)[1].strip() if ":" in stripped else ""
        elif lower == "assistant":
            stripped = ""
        if stripped.endswith("?"):
            stripped = ""
        if stripped:
            cleaned_lines.append(stripped)

    if cleaned_lines:
        reply = "\n".join(cleaned_lines)

    # Remove trailing artifacts
    if "<start_of_turn>" in reply:
        reply = reply.split("<start_of_turn>")[0].strip()
    if "<|im_end|>" in reply:
        reply = reply.split("<|im_end|>")[0].strip()
    if "|im_end|>" in reply:
        reply = reply.split("|im_end|>")[0].strip()
    if "\n\n\n" in reply:
        reply = reply.split("\n\n\n")[0].strip()

    # Remove control characters
    printable_chars = set(string.printable)
    cleaned_chars = []
    for char in reply:
        if char in printable_chars or ord(char) > 127:
            if ord(char) < 32 and char not in ['\n', '\r', '\t']:
                continue
            cleaned_chars.append(char)
    reply = ''.join(cleaned_chars)

    reply = reply.strip()

    # Remove leading punctuation
    while reply and reply[0] in '.。:：-–—•·':
        reply = reply[1:].strip()

    return reply
