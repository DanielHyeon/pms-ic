"""
OpenAI-Compatible API Routes.

Provides /v1/chat/completions endpoint compatible with OpenAI API format.
This allows the Java backend to use the same API format for both GGUF and vLLM workers.

SSE Format follows OpenAI specification:
- data: {"id":"...","object":"chat.completion.chunk","choices":[{"delta":{"content":"..."},"index":0}]}
- data: [DONE]
"""

import os
import re
import uuid
import time
import json
import logging
from flask import request, jsonify, Response

from . import chat_bp
from services.model_service import get_model_service
from services.prompt_builder import build_prompt
from utils.normalize import normalize_retrieved_docs

logger = logging.getLogger(__name__)

# Generation parameters
MAX_TOKENS = int(os.getenv("MAX_TOKENS", "1800"))
TEMPERATURE = float(os.getenv("TEMPERATURE", "0.35"))
TOP_P = float(os.getenv("TOP_P", "0.90"))
MIN_P = float(os.getenv("MIN_P", "0.12"))
REPEAT_PENALTY = float(os.getenv("REPEAT_PENALTY", "1.10"))


def _clean_token(token: str) -> str:
    """Clean token of special markers."""
    if not token:
        return ""
    token = token.replace("<end_of_turn>", "")
    token = token.replace("<start_of_turn>", "")
    token = token.replace("<|im_end|>", "")
    token = token.replace("|im_end|>", "")
    token = token.replace("</s>", "")
    return token


def _build_messages_prompt(messages: list, model_path: str = None) -> str:
    """
    Build prompt from OpenAI-format messages array.

    Messages format:
    [
        {"role": "system", "content": "..."},
        {"role": "user", "content": "..."},
        {"role": "assistant", "content": "..."},
        ...
    ]
    """
    from service_state import get_state
    state = get_state()

    if model_path is None:
        model_path = state.current_model_path or ""

    model_name = os.path.basename(model_path).lower() if model_path else ""

    # Detect model type for appropriate formatting
    is_gemma = "gemma" in model_name
    is_qwen = "qwen" in model_name

    prompt_parts = []

    for msg in messages:
        role = msg.get("role", "user")
        content = msg.get("content", "")

        if not content:
            continue

        if is_gemma:
            if role == "system":
                prompt_parts.append(f"<start_of_turn>user\n[System]: {content}<end_of_turn>")
            elif role == "user":
                prompt_parts.append(f"<start_of_turn>user\n{content}<end_of_turn>")
            elif role == "assistant":
                prompt_parts.append(f"<start_of_turn>model\n{content}<end_of_turn>")
            elif role == "tool":
                tool_name = msg.get("name", "tool")
                tool_call_id = msg.get("tool_call_id", "")
                prompt_parts.append(f"<start_of_turn>user\n[Tool Result ({tool_name})]: {content}<end_of_turn>")
        elif is_qwen:
            if role == "system":
                prompt_parts.append(f"<|im_start|>system\n{content}<|im_end|>")
            elif role == "user":
                prompt_parts.append(f"<|im_start|>user\n{content}<|im_end|>")
            elif role == "assistant":
                prompt_parts.append(f"<|im_start|>assistant\n{content}<|im_end|>")
            elif role == "tool":
                tool_name = msg.get("name", "tool")
                prompt_parts.append(f"<|im_start|>user\n[Tool Result ({tool_name})]: {content}<|im_end|>")
        else:
            # Generic chat format
            if role == "system":
                prompt_parts.append(f"System: {content}")
            elif role == "user":
                prompt_parts.append(f"User: {content}")
            elif role == "assistant":
                prompt_parts.append(f"Assistant: {content}")
            elif role == "tool":
                tool_name = msg.get("name", "tool")
                prompt_parts.append(f"Tool Result ({tool_name}): {content}")

    # Add assistant turn start
    if is_gemma:
        prompt_parts.append("<start_of_turn>model\n")
    elif is_qwen:
        prompt_parts.append("<|im_start|>assistant\n")
    else:
        prompt_parts.append("Assistant:")

    return "\n".join(prompt_parts)


@chat_bp.route("/v1/chat/completions", methods=["POST"])
def openai_chat_completions():
    """
    OpenAI-compatible /v1/chat/completions endpoint.

    Supports both streaming and non-streaming modes.

    Request format:
    {
        "model": "...",  // ignored - uses loaded model
        "messages": [{"role": "...", "content": "..."}],
        "stream": true/false,
        "max_tokens": 1800,
        "temperature": 0.35,
        "top_p": 0.90
    }

    Response format (non-streaming):
    {
        "id": "chatcmpl-...",
        "object": "chat.completion",
        "created": 1234567890,
        "model": "gemma-3-12b",
        "choices": [{
            "index": 0,
            "message": {"role": "assistant", "content": "..."},
            "finish_reason": "stop"
        }],
        "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
    }
    """
    try:
        data = request.json
        messages = data.get("messages", [])
        stream = data.get("stream", False)
        max_tokens = data.get("max_tokens", MAX_TOKENS)
        temperature = data.get("temperature", TEMPERATURE)
        top_p = data.get("top_p", TOP_P)

        if not messages:
            return jsonify({
                "error": {
                    "message": "messages is required",
                    "type": "invalid_request_error",
                    "code": "missing_required_parameter"
                }
            }), 400

        # Load model
        model_service = get_model_service()
        model, rag, _ = model_service.load_model()

        if model is None:
            return jsonify({
                "error": {
                    "message": "Model not loaded",
                    "type": "server_error",
                    "code": "model_not_available"
                }
            }), 503

        # Get model name for response
        from service_state import get_state
        state = get_state()
        model_name = os.path.basename(state.current_model_path or "unknown")

        # Build prompt from messages
        prompt = _build_messages_prompt(messages, state.current_model_path)

        # Generate completion ID
        completion_id = f"chatcmpl-{uuid.uuid4().hex[:24]}"
        created = int(time.time())

        if stream:
            return _stream_chat_completion(
                model, prompt, completion_id, created, model_name,
                max_tokens, temperature, top_p
            )
        else:
            return _non_stream_chat_completion(
                model, prompt, completion_id, created, model_name,
                max_tokens, temperature, top_p
            )

    except Exception as e:
        logger.error(f"Error in OpenAI compat endpoint: {e}", exc_info=True)
        return jsonify({
            "error": {
                "message": str(e),
                "type": "server_error",
                "code": "internal_error"
            }
        }), 500


def _non_stream_chat_completion(model, prompt, completion_id, created, model_name,
                                 max_tokens, temperature, top_p):
    """Generate non-streaming chat completion."""
    try:
        model.reset()

        response = model(
            prompt,
            max_tokens=max_tokens,
            temperature=temperature,
            top_p=top_p,
            min_p=MIN_P,
            stop=["<end_of_turn>", "<start_of_turn>", "</s>", "<|im_end|>"],
            echo=False,
            repeat_penalty=REPEAT_PENALTY
        )

        reply = response["choices"][0]["text"].strip()
        reply = _clean_token(reply)

        # Remove common artifacts
        reply = re.sub(r"<think>[\s\S]*?</think>", "", reply)

        return jsonify({
            "id": completion_id,
            "object": "chat.completion",
            "created": created,
            "model": model_name,
            "choices": [{
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": reply
                },
                "finish_reason": "stop"
            }],
            "usage": {
                "prompt_tokens": response.get("usage", {}).get("prompt_tokens", 0),
                "completion_tokens": response.get("usage", {}).get("completion_tokens", 0),
                "total_tokens": response.get("usage", {}).get("total_tokens", 0)
            }
        })

    except Exception as e:
        logger.error(f"Non-streaming completion error: {e}", exc_info=True)
        return jsonify({
            "error": {
                "message": str(e),
                "type": "server_error",
                "code": "generation_error"
            }
        }), 500


def _stream_chat_completion(model, prompt, completion_id, created, model_name,
                            max_tokens, temperature, top_p):
    """Generate streaming chat completion with SSE."""

    def generate():
        try:
            model.reset()

            # First chunk - role announcement
            first_chunk = {
                "id": completion_id,
                "object": "chat.completion.chunk",
                "created": created,
                "model": model_name,
                "choices": [{
                    "index": 0,
                    "delta": {"role": "assistant", "content": ""},
                    "finish_reason": None
                }]
            }
            yield f"data: {json.dumps(first_chunk)}\n\n"

            # Stream tokens
            for token_data in model(
                prompt,
                max_tokens=max_tokens,
                temperature=temperature,
                top_p=top_p,
                min_p=MIN_P,
                stop=["<end_of_turn>", "<start_of_turn>", "</s>", "<|im_end|>"],
                echo=False,
                repeat_penalty=REPEAT_PENALTY,
                stream=True
            ):
                token = token_data["choices"][0]["text"]
                token = _clean_token(token)

                if not token:
                    continue

                chunk = {
                    "id": completion_id,
                    "object": "chat.completion.chunk",
                    "created": created,
                    "model": model_name,
                    "choices": [{
                        "index": 0,
                        "delta": {"content": token},
                        "finish_reason": None
                    }]
                }
                yield f"data: {json.dumps(chunk)}\n\n"

            # Final chunk with finish_reason
            final_chunk = {
                "id": completion_id,
                "object": "chat.completion.chunk",
                "created": created,
                "model": model_name,
                "choices": [{
                    "index": 0,
                    "delta": {},
                    "finish_reason": "stop"
                }]
            }
            yield f"data: {json.dumps(final_chunk)}\n\n"
            yield "data: [DONE]\n\n"

        except Exception as e:
            logger.error(f"Streaming error: {e}", exc_info=True)
            error_chunk = {
                "id": completion_id,
                "object": "chat.completion.chunk",
                "created": created,
                "model": model_name,
                "choices": [{
                    "index": 0,
                    "delta": {},
                    "finish_reason": "error"
                }],
                "error": {
                    "message": str(e),
                    "type": "server_error"
                }
            }
            yield f"data: {json.dumps(error_chunk)}\n\n"
            yield "data: [DONE]\n\n"

    return Response(
        generate(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@chat_bp.route("/v1/models", methods=["GET"])
def list_models():
    """
    OpenAI-compatible /v1/models endpoint.
    Lists available models.
    """
    from service_state import get_state
    state = get_state()

    model_name = os.path.basename(state.current_model_path or "unknown")

    return jsonify({
        "object": "list",
        "data": [{
            "id": model_name,
            "object": "model",
            "created": int(time.time()),
            "owned_by": "local",
            "permission": [],
            "root": model_name,
            "parent": None
        }]
    })


@chat_bp.route("/v1/models/<model_id>", methods=["GET"])
def get_model(model_id):
    """
    OpenAI-compatible /v1/models/{model} endpoint.
    Returns model details.
    """
    from service_state import get_state
    state = get_state()

    model_name = os.path.basename(state.current_model_path or "unknown")

    return jsonify({
        "id": model_name,
        "object": "model",
        "created": int(time.time()),
        "owned_by": "local",
        "permission": [],
        "root": model_name,
        "parent": None
    })
