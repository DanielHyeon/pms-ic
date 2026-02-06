"""
LLM Service - Flask API Server

로컬 LLM 서비스 (GGUF 모델 사용)
llama-cpp-python을 사용하여 GGUF 모델을 실행합니다.

Refactored to use modular architecture:
- routes/ : API route handlers
- services/ : Business logic
- utils/ : Utility functions
"""

import os
import logging

from flask import Flask, jsonify
from flask_cors import CORS

from service_state import get_state, LLMServiceState
from services.model_service import get_model_service
from routes import register_blueprints

# Flask app initialization
app = Flask(__name__)
CORS(app)

# Logging configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Singleton state manager
state: LLMServiceState = get_state()

# Default model path
DEFAULT_MODEL_PATH = os.getenv("MODEL_PATH", "./models/google.gemma-3-12b-pt.Q5_K_M.gguf")


# =============================================================================
# Core Routes (health check - kept in main app)
# =============================================================================

@app.route("/health", methods=["GET"])
def health():
    """헬스 체크"""
    health_info = state.health_status()
    health_info["status"] = "healthy"
    return jsonify(health_info)


# =============================================================================
# Blueprint Registration
# =============================================================================

register_blueprints(app)


# =============================================================================
# Initialization
# =============================================================================

def _init_redis_cache():
    """Initialize Redis connection for normalization cache (best-effort)."""
    from services.normalization_cache import init_normalization_cache
    try:
        import redis as redis_lib
        from config.database import get_redis_config
        config = get_redis_config()
        redis_client = redis_lib.Redis(
            host=config.host,
            port=config.port,
            password=config.password or None,
            db=config.db,
            socket_connect_timeout=0.1,
            socket_timeout=0.15,
            retry_on_timeout=False,
            health_check_interval=30,
            decode_responses=True,
        )
        redis_client.ping()
        init_normalization_cache(redis_client)
        state.redis_client = redis_client
        logger.info("Redis connected for normalization cache")
    except Exception as e:
        logger.warning(f"Redis unavailable ({e}), using memory-only cache")
        init_normalization_cache(None)


def init_llm_service():
    """Initialize LLM service on startup (싱글톤 상태 사용)"""
    try:
        logger.info("=" * 60)
        logger.info("Initializing LLM service on startup...")
        logger.info(f"Model path: {DEFAULT_MODEL_PATH}")
        logger.info("=" * 60)

        # Initialize Redis for normalization cache (optional)
        _init_redis_cache()

        model_service = get_model_service()
        model_service.load_model()

        logger.info("=" * 60)
        logger.info("LLM service initialized successfully!")
        logger.info(f"  - Model loaded: {state.is_model_loaded}")
        logger.info(f"  - RAG service loaded: {state.is_rag_loaded}")
        logger.info(f"  - Chat workflow loaded: {state.is_workflow_loaded}")
        logger.info(f"  - Redis connected: {state.redis_client is not None}")
        logger.info("=" * 60)
    except Exception as e:
        logger.error("=" * 60)
        logger.error(f"Failed to initialize LLM service on startup: {e}", exc_info=True)
        logger.warning("Service will start anyway - model will be loaded on first request")
        logger.error("=" * 60)


# =============================================================================
# Legacy Compatibility Functions (for imports from other modules)
# =============================================================================

def load_model(model_path=None):
    """
    Legacy wrapper for backward compatibility.

    Use services.model_service.get_model_service().load_model() instead.
    """
    model_service = get_model_service()
    return model_service.load_model(model_path)


def build_prompt(message, context=None, retrieved_docs=None, model_path=None):
    """
    Legacy wrapper for backward compatibility.

    Use services.prompt_builder.build_prompt() instead.
    """
    from services.prompt_builder import build_prompt as _build_prompt
    return _build_prompt(message, context, retrieved_docs, model_path)


def normalize_retrieved_docs(retrieved_docs):
    """
    Legacy wrapper for backward compatibility.

    Use utils.normalize.normalize_retrieved_docs() instead.
    """
    from utils.normalize import normalize_retrieved_docs as _normalize
    return _normalize(retrieved_docs)


# =============================================================================
# Main Entry Point
# =============================================================================

if __name__ == "__main__":
    # debugpy remote debugging setup (VS Code)
    if os.getenv("DEBUG_MODE", "").lower() == "true":
        try:
            import debugpy
            debug_port = int(os.getenv("DEBUG_PORT", "5678"))
            debugpy.listen(("0.0.0.0", debug_port))
            logger.info(f"debugpy listening on 0.0.0.0:{debug_port}")
            logger.info("Waiting for VS Code debugger to attach...")
            if os.getenv("DEBUG_WAIT_FOR_CLIENT", "").lower() == "true":
                debugpy.wait_for_client()
                logger.info("Debugger attached!")
        except ImportError:
            logger.warning("debugpy not installed, remote debugging disabled")
        except Exception as e:
            logger.warning(f"Failed to start debugpy: {e}")

    # Initialize LLM service before starting
    init_llm_service()

    port = int(os.getenv("PORT", "8000"))
    app.run(host="0.0.0.0", port=port, debug=False)
