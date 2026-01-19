"""
Model Gateway - L1/L2 Model Abstraction

Manages multiple LLM models for different use cases:
- L1 (LFM2): Fast responses for Track A (FAQ, status queries)
- L2 (Gemma-3-12B): Quality responses for Track B (reports, analysis)

Reference: docs/PMS 최적화 방안.md
"""

import os
import logging
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field
from enum import Enum
from llama_cpp import Llama

logger = logging.getLogger(__name__)


# =============================================================================
# Configuration
# =============================================================================

class ModelTier(Enum):
    """Model tier classification"""
    L1 = "l1"  # Fast model (LFM2)
    L2 = "l2"  # Quality model (Gemma-3-12B)


@dataclass
class ModelConfig:
    """Configuration for a model"""
    path: str
    tier: ModelTier
    n_ctx: int = 4096
    n_threads: int = 6
    n_gpu_layers: int = 0
    max_tokens: int = 1800
    temperature: float = 0.35
    top_p: float = 0.90
    min_p: float = 0.12
    repeat_penalty: float = 1.10

    @classmethod
    def from_env(cls, tier: ModelTier) -> "ModelConfig":
        """Create config from environment variables"""
        prefix = tier.value.upper()

        if tier == ModelTier.L1:
            default_path = os.getenv("L1_MODEL_PATH", "./models/lfm2-3b.gguf")
            default_max_tokens = 1200  # Faster, shorter responses
        else:
            default_path = os.getenv("L2_MODEL_PATH",
                                      os.getenv("MODEL_PATH", "./models/google.gemma-3-12b-pt.Q5_K_M.gguf"))
            default_max_tokens = 3000  # Longer, more detailed responses

        return cls(
            path=os.getenv(f"{prefix}_MODEL_PATH", default_path),
            tier=tier,
            n_ctx=int(os.getenv(f"{prefix}_N_CTX", os.getenv("LLM_N_CTX", "4096"))),
            n_threads=int(os.getenv(f"{prefix}_N_THREADS", os.getenv("LLM_N_THREADS", "6"))),
            n_gpu_layers=int(os.getenv(f"{prefix}_N_GPU_LAYERS", os.getenv("LLM_N_GPU_LAYERS", "0"))),
            max_tokens=int(os.getenv(f"{prefix}_MAX_TOKENS", str(default_max_tokens))),
            temperature=float(os.getenv(f"{prefix}_TEMPERATURE", os.getenv("TEMPERATURE", "0.35"))),
            top_p=float(os.getenv(f"{prefix}_TOP_P", os.getenv("TOP_P", "0.90"))),
            min_p=float(os.getenv(f"{prefix}_MIN_P", os.getenv("MIN_P", "0.12"))),
            repeat_penalty=float(os.getenv(f"{prefix}_REPEAT_PENALTY", os.getenv("REPEAT_PENALTY", "1.10"))),
        )


@dataclass
class GenerationResult:
    """Result from model generation"""
    text: str
    model_tier: ModelTier
    model_path: str
    tokens_used: int = 0
    generation_time_ms: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)


# =============================================================================
# Model Gateway
# =============================================================================

class ModelGateway:
    """
    Gateway for managing L1/L2 models.

    Usage:
        gateway = ModelGateway()

        # Load models
        gateway.load_l1()  # Optional - only if LFM2 available
        gateway.load_l2()

        # Generate with appropriate tier
        result = gateway.generate(
            prompt="...",
            tier=ModelTier.L1  # or L2
        )

        # Or use convenience methods
        result = gateway.generate_fast(prompt)  # Uses L1
        result = gateway.generate_quality(prompt)  # Uses L2
    """

    def __init__(self):
        self._l1_model: Optional[Llama] = None
        self._l2_model: Optional[Llama] = None
        self._l1_config: Optional[ModelConfig] = None
        self._l2_config: Optional[ModelConfig] = None
        self._active_tier: Optional[ModelTier] = None

    @property
    def l1_loaded(self) -> bool:
        return self._l1_model is not None

    @property
    def l2_loaded(self) -> bool:
        return self._l2_model is not None

    @property
    def l1_config(self) -> Optional[ModelConfig]:
        return self._l1_config

    @property
    def l2_config(self) -> Optional[ModelConfig]:
        return self._l2_config

    def load_l1(self, config: Optional[ModelConfig] = None) -> bool:
        """Load L1 (fast) model"""
        if config is None:
            config = ModelConfig.from_env(ModelTier.L1)

        if not os.path.exists(config.path):
            logger.warning(f"L1 model not found at {config.path}, skipping L1 load")
            return False

        try:
            logger.info(f"Loading L1 model from {config.path}")
            self._l1_model = Llama(
                model_path=config.path,
                n_ctx=config.n_ctx,
                n_threads=config.n_threads,
                n_gpu_layers=config.n_gpu_layers,
                verbose=False,
            )
            self._l1_config = config
            logger.info(f"L1 model loaded successfully: {config.path}")
            return True

        except Exception as e:
            logger.error(f"Failed to load L1 model: {e}")
            self._l1_model = None
            return False

    def load_l2(self, config: Optional[ModelConfig] = None) -> bool:
        """Load L2 (quality) model"""
        if config is None:
            config = ModelConfig.from_env(ModelTier.L2)

        if not os.path.exists(config.path):
            logger.error(f"L2 model not found at {config.path}")
            return False

        try:
            logger.info(f"Loading L2 model from {config.path}")
            self._l2_model = Llama(
                model_path=config.path,
                n_ctx=config.n_ctx,
                n_threads=config.n_threads,
                n_gpu_layers=config.n_gpu_layers,
                verbose=False,
            )
            self._l2_config = config
            logger.info(f"L2 model loaded successfully: {config.path}")
            return True

        except Exception as e:
            logger.error(f"Failed to load L2 model: {e}")
            self._l2_model = None
            return False

    def load_single_model(self, model: Llama, model_path: str, as_tier: ModelTier = ModelTier.L2):
        """
        Load a single pre-existing model as both L1 and L2.
        Useful when only one model is available.
        """
        config = ModelConfig(
            path=model_path,
            tier=as_tier,
            max_tokens=int(os.getenv("MAX_TOKENS", "1800")),
            temperature=float(os.getenv("TEMPERATURE", "0.35")),
            top_p=float(os.getenv("TOP_P", "0.90")),
        )

        # Use same model for both tiers
        self._l1_model = model
        self._l2_model = model
        self._l1_config = config
        self._l2_config = config

        logger.info(f"Single model loaded as both L1 and L2: {model_path}")

    def unload_l1(self):
        """Unload L1 model to free memory"""
        if self._l1_model and self._l1_model != self._l2_model:
            del self._l1_model
            self._l1_model = None
            self._l1_config = None
            logger.info("L1 model unloaded")

    def unload_l2(self):
        """Unload L2 model to free memory"""
        if self._l2_model and self._l2_model != self._l1_model:
            del self._l2_model
            self._l2_model = None
            self._l2_config = None
            logger.info("L2 model unloaded")

    def get_model(self, tier: ModelTier) -> Optional[Llama]:
        """Get model for specified tier"""
        if tier == ModelTier.L1:
            return self._l1_model
        return self._l2_model

    def get_config(self, tier: ModelTier) -> Optional[ModelConfig]:
        """Get config for specified tier"""
        if tier == ModelTier.L1:
            return self._l1_config
        return self._l2_config

    def generate(
        self,
        prompt: str,
        tier: ModelTier = ModelTier.L2,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        stop: Optional[List[str]] = None,
        fallback_to_other_tier: bool = True,
    ) -> GenerationResult:
        """
        Generate text using specified model tier.

        Args:
            prompt: The prompt to send to the model
            tier: Which model tier to use (L1 or L2)
            max_tokens: Override max tokens (uses config default if None)
            temperature: Override temperature (uses config default if None)
            stop: Stop sequences
            fallback_to_other_tier: If requested tier unavailable, use other

        Returns:
            GenerationResult with generated text and metadata
        """
        import time

        # Select model and config
        model = self.get_model(tier)
        config = self.get_config(tier)

        # Fallback if requested tier unavailable
        if model is None and fallback_to_other_tier:
            other_tier = ModelTier.L2 if tier == ModelTier.L1 else ModelTier.L1
            model = self.get_model(other_tier)
            config = self.get_config(other_tier)
            if model:
                logger.warning(f"Falling back from {tier.value} to {other_tier.value}")
                tier = other_tier

        if model is None or config is None:
            raise RuntimeError(f"No model available for tier {tier.value}")

        # Prepare parameters
        gen_max_tokens = max_tokens or config.max_tokens
        gen_temperature = temperature or config.temperature
        gen_stop = stop or ["<end_of_turn>", "<start_of_turn>", "</s>", "<|im_end|>"]

        # Reset KV cache
        model.reset()

        # Generate
        start_time = time.time()

        try:
            response = model(
                prompt,
                max_tokens=gen_max_tokens,
                temperature=gen_temperature,
                top_p=config.top_p,
                min_p=config.min_p,
                repeat_penalty=config.repeat_penalty,
                stop=gen_stop,
                echo=False,
            )

            generation_time = (time.time() - start_time) * 1000
            text = response["choices"][0]["text"].strip()

            # Get token usage
            tokens_used = response.get("usage", {}).get("completion_tokens", 0)

            return GenerationResult(
                text=text,
                model_tier=tier,
                model_path=config.path,
                tokens_used=tokens_used,
                generation_time_ms=generation_time,
                metadata={
                    "max_tokens": gen_max_tokens,
                    "temperature": gen_temperature,
                }
            )

        except Exception as e:
            logger.error(f"Generation failed: {e}")
            raise

    def generate_fast(
        self,
        prompt: str,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> GenerationResult:
        """Generate using L1 (fast) model"""
        return self.generate(
            prompt=prompt,
            tier=ModelTier.L1,
            max_tokens=max_tokens or 1200,  # Shorter for fast responses
            **kwargs
        )

    def generate_quality(
        self,
        prompt: str,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> GenerationResult:
        """Generate using L2 (quality) model"""
        return self.generate(
            prompt=prompt,
            tier=ModelTier.L2,
            max_tokens=max_tokens or 3000,  # Longer for quality responses
            **kwargs
        )

    def health_check(self) -> Dict[str, Any]:
        """Return health status of models"""
        return {
            "l1": {
                "loaded": self.l1_loaded,
                "path": self._l1_config.path if self._l1_config else None,
            },
            "l2": {
                "loaded": self.l2_loaded,
                "path": self._l2_config.path if self._l2_config else None,
            },
            "shared_model": self._l1_model == self._l2_model if (self._l1_model and self._l2_model) else False,
        }


# =============================================================================
# Evidence Validator
# =============================================================================

class EvidenceValidator:
    """
    Validates that L1 responses are grounded in evidence.

    L1 responses should:
    - Not contain speculation
    - Reference provided context
    - Admit when information is insufficient
    """

    SPECULATION_PATTERNS = [
        r"아마도",
        r"추측컨대",
        r"제 생각에는",
        r"확실하지 않지만",
        r"probably",
        r"i think",
        r"maybe",
    ]

    GROUNDING_PATTERNS = [
        r"문서에 따르면",
        r"자료에 의하면",
        r"기록에",
        r"according to",
        r"based on",
    ]

    def validate(self, response: str, context_provided: bool = True) -> Dict[str, Any]:
        """
        Validate response for evidence grounding.

        Returns:
            {
                "valid": bool,
                "issues": list of issues found,
                "has_grounding": bool,
                "speculation_detected": bool,
            }
        """
        import re

        issues = []
        has_grounding = False
        speculation_detected = False

        response_lower = response.lower()

        # Check for speculation
        for pattern in self.SPECULATION_PATTERNS:
            if re.search(pattern, response_lower):
                speculation_detected = True
                issues.append(f"Speculation pattern detected: {pattern}")
                break

        # Check for grounding (only if context was provided)
        if context_provided:
            for pattern in self.GROUNDING_PATTERNS:
                if re.search(pattern, response_lower):
                    has_grounding = True
                    break

        # Response is valid if no speculation or has explicit grounding
        valid = not speculation_detected or has_grounding

        return {
            "valid": valid,
            "issues": issues,
            "has_grounding": has_grounding,
            "speculation_detected": speculation_detected,
        }


# =============================================================================
# Singleton instance
# =============================================================================

_model_gateway: Optional[ModelGateway] = None


def get_model_gateway() -> ModelGateway:
    """Get singleton model gateway instance"""
    global _model_gateway
    if _model_gateway is None:
        _model_gateway = ModelGateway()
    return _model_gateway
