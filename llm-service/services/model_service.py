"""
Model Service - LLM Model Loading and Management.

Extracted from app.py. Handles:
- Model loading and unloading
- GPU memory management
- RAG service initialization
"""

import os
import gc
import time
import logging
from typing import Optional, Tuple, Any

from llama_cpp import Llama

logger = logging.getLogger(__name__)


class ModelService:
    """
    Service for managing LLM model lifecycle.

    Handles model loading, unloading, and GPU memory management.
    Uses singleton state for model persistence across requests.
    """

    def __init__(self, state):
        """
        Initialize ModelService with state manager.

        Args:
            state: LLMServiceState singleton instance
        """
        self.state = state
        self.default_model_path = os.getenv(
            "MODEL_PATH",
            "./models/google.gemma-3-12b-pt.Q5_K_M.gguf"
        )

    def load_model(self, model_path: Optional[str] = None) -> Tuple[Any, Any, Any]:
        """
        Load model and RAG service (singleton state).

        Args:
            model_path: Path to model file. Uses current or default if None.

        Returns:
            Tuple of (llm, rag_service, chat_workflow)
            Note: chat_workflow is always None (v2 workflow uses separate initialization)

        Raises:
            FileNotFoundError: If model file doesn't exist
            RuntimeError: If model loading fails
        """
        if model_path is None:
            model_path = self.state.current_model_path

        if not os.path.exists(model_path):
            error_msg = f"Model file not found: {model_path}"
            logger.error(error_msg)
            raise FileNotFoundError(error_msg)

        if self.state.llm is None or model_path != self.state.current_model_path:
            self._load_llm(model_path)

        if self.state.llm is None:
            raise RuntimeError(f"Model is None after load attempt. Path: {model_path}")

        self._ensure_rag_service()

        return self.state.get_all()

    def _load_llm(self, model_path: str) -> None:
        """Load LLM model with environment-based configuration."""
        logger.info(f"Loading model from {model_path}")

        try:
            if self.state.llm is not None:
                logger.info("Unloading previous model...")
                self._unload_model(self.state.llm)
                self.state.llm = None

            logger.info(f"Initializing Llama model: {model_path}")
            n_ctx = int(os.getenv("LLM_N_CTX", "4096"))
            n_threads = int(os.getenv("LLM_N_THREADS", "6"))
            n_gpu_layers = int(os.getenv("LLM_N_GPU_LAYERS", "0"))

            self.state.llm = Llama(
                model_path=model_path,
                n_ctx=n_ctx,
                n_threads=n_threads,
                verbose=True,
                n_gpu_layers=n_gpu_layers
            )
            self.state.current_model_path = model_path
            logger.info(f"Model loaded successfully: {model_path}")

        except Exception as e:
            logger.error(f"Failed to load model: {e}", exc_info=True)
            self.state.llm = None
            raise RuntimeError(f"Failed to load model from {model_path}: {str(e)}") from e

    def _ensure_rag_service(self) -> None:
        """Initialize RAG service if not already loaded."""
        if self.state.rag_service is None:
            try:
                logger.info("Loading RAG service with Neo4j (vector + graph)...")
                from rag_service_neo4j import RAGServiceNeo4j
                self.state.rag_service = RAGServiceNeo4j()
                logger.info("RAG service with Neo4j loaded successfully")
            except Exception as e:
                logger.error(f"Failed to load RAG service: {e}", exc_info=True)
                self.state.rag_service = None

    def _unload_model(self, llm_instance: Any) -> None:
        """
        Unload a model and release GPU memory.

        Args:
            llm_instance: The Llama model instance to unload
        """
        if llm_instance is None:
            return

        logger.info("Unloading model to free GPU memory...")

        try:
            if hasattr(llm_instance, 'close'):
                try:
                    llm_instance.close()
                except Exception as close_error:
                    logger.warning(f"Error calling close(): {close_error}")
            del llm_instance
        except Exception as del_error:
            logger.warning(f"Error deleting model: {del_error}")

        for _ in range(3):
            gc.collect()

        self._cleanup_gpu_memory()
        logger.info("Model unloaded successfully")

    def _cleanup_gpu_memory(self) -> None:
        """Clear GPU memory if torch is available."""
        try:
            import torch
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                torch.cuda.synchronize()
                time.sleep(0.5)
                try:
                    free_mem = torch.cuda.get_device_properties(0).total_memory - torch.cuda.memory_allocated(0)
                    logger.info(f"GPU memory after cleanup - Free: {free_mem / 1024**3:.2f} GB")
                except Exception as mem_error:
                    logger.warning(f"Could not get GPU memory info: {mem_error}")
        except ImportError:
            logger.debug("torch not available, skipping GPU memory cleanup")
        except Exception as e:
            logger.warning(f"GPU memory cleanup failed: {e}")

    def change_model(self, new_model_path: str) -> dict:
        """
        Change the current model to a new one.

        Unloads old model first to avoid OOM errors.

        Args:
            new_model_path: Path to the new model file

        Returns:
            Dict with status, currentModel, message, workflow_initialized

        Raises:
            FileNotFoundError: If model file doesn't exist
            RuntimeError: If model loading fails
        """
        self._verify_model_file_exists(new_model_path)

        logger.info(f"Changing model from {self.state.current_model_path} to {new_model_path}")
        old_model_path = self.state.current_model_path

        # Unload old model first
        old_llm = self.state.llm
        self.state.llm = None
        self.state.chat_workflow = None
        self._unload_model(old_llm)
        old_llm = None

        new_llm = None
        try:
            new_llm = self._load_new_model(new_model_path)
            self.state.llm = new_llm
            self.state.current_model_path = new_model_path

            self._ensure_rag_service()

            logger.info(f"Model successfully changed to {new_model_path}")

            return {
                "status": "success",
                "currentModel": self.state.current_model_path,
                "message": f"Model successfully changed to {new_model_path}"
            }

        except Exception as load_error:
            if new_llm is not None:
                try:
                    self._unload_model(new_llm)
                except Exception:
                    pass

            self._attempt_restore_model(old_model_path)
            logger.error(f"Failed to load new model: {load_error}", exc_info=True)
            raise load_error

    def _verify_model_file_exists(self, model_path: str) -> None:
        """Verify that model file exists."""
        logger.info(f"Checking if model file exists: {model_path}")
        if not os.path.exists(model_path):
            logger.error(f"Model file not found: {model_path}")
            model_dir = os.path.dirname(model_path) if os.path.dirname(model_path) else "./models"
            logger.info(f"Model directory: {model_dir}, exists: {os.path.exists(model_dir)}")
            if os.path.exists(model_dir):
                try:
                    files = os.listdir(model_dir)
                    logger.info(f"Files in model directory: {files[:10]}")
                except Exception as e:
                    logger.error(f"Failed to list directory: {e}")
            raise FileNotFoundError(f"Model file not found: {model_path}")

    def _load_new_model(self, model_path: str) -> Llama:
        """Load new model with environment-based configuration."""
        logger.info(f"Loading new model: {model_path}")
        if os.path.exists(model_path):
            file_size = os.path.getsize(model_path)
            logger.info(f"Model file size: {file_size / (1024*1024*1024):.2f} GB")

        gc.collect()
        self._cleanup_gpu_memory()

        n_ctx = int(os.getenv("LLM_N_CTX", "2048"))
        n_threads = int(os.getenv("LLM_N_THREADS", "6"))
        n_gpu_layers = int(os.getenv("LLM_N_GPU_LAYERS", "35"))

        logger.info(f"Model config: n_ctx={n_ctx}, n_threads={n_threads}, n_gpu_layers={n_gpu_layers}")

        try:
            new_llm = Llama(
                model_path=model_path,
                n_ctx=n_ctx,
                n_threads=n_threads,
                verbose=True,
                n_gpu_layers=n_gpu_layers
            )
            logger.info(f"New model loaded successfully: {model_path}")
            return new_llm
        except Exception as llama_error:
            logger.error(f"Llama model initialization failed: {llama_error}", exc_info=True)
            raise RuntimeError(f"Model initialization failed: {str(llama_error)}") from llama_error

    def _attempt_restore_model(self, old_model_path: str) -> None:
        """Attempt to restore previous model after failed load."""
        logger.warning(f"Failed to load new model, attempting to restore previous model: {old_model_path}")
        try:
            if old_model_path and os.path.exists(old_model_path):
                restored_llm = self._load_new_model(old_model_path)
                self.state.llm = restored_llm
                self.state.current_model_path = old_model_path
                logger.info(f"Previous model restored: {old_model_path}")
            else:
                logger.error("Cannot restore previous model - path not available")
        except Exception as restore_error:
            logger.error(f"Failed to restore previous model: {restore_error}")

    def get_available_models(self) -> list:
        """Get list of available GGUF models in models directory."""
        models_dir = "./models"
        if not os.path.exists(models_dir):
            return []

        models = []
        for file in os.listdir(models_dir):
            if file.endswith(".gguf"):
                file_path = os.path.join(models_dir, file)
                file_size = os.path.getsize(file_path)
                models.append({
                    "name": file,
                    "path": file_path,
                    "size": file_size,
                    "size_mb": round(file_size / (1024 * 1024), 2),
                    "is_current": file_path == self.state.current_model_path
                })
        return models


# Singleton instance
_model_service: Optional[ModelService] = None


def get_model_service() -> ModelService:
    """Get singleton ModelService instance."""
    global _model_service
    if _model_service is None:
        from service_state import get_state
        _model_service = ModelService(get_state())
    return _model_service
