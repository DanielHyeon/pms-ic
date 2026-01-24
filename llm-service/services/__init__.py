"""
Service layer for LLM Service.

Business logic extracted from app.py.
"""

# Lazy imports to avoid circular dependencies and missing optional dependencies
# Use explicit imports when needed:
#   from services.model_service import ModelService, get_model_service
#   from services.prompt_builder import PromptBuilder, build_prompt

__all__ = ['ModelService', 'get_model_service', 'PromptBuilder', 'build_prompt']


def __getattr__(name):
    """Lazy import handler for module attributes."""
    if name in ('ModelService', 'get_model_service'):
        from .model_service import ModelService, get_model_service
        return ModelService if name == 'ModelService' else get_model_service
    elif name == 'PromptBuilder':
        from .prompt_builder import PromptBuilder
        return PromptBuilder
    elif name == 'build_prompt':
        from .prompt_builder import build_prompt
        return build_prompt
    raise AttributeError(f"module 'services' has no attribute '{name}'")
