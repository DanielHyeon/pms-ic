"""
Phase 2: Skill Library

Provides reusable, composable skills for workflow nodes.

Skill Categories:
- RETRIEVE: Data retrieval from DB/Graph/Vector
- ANALYZE: Analysis and inference
- GENERATE: Content generation
- VALIDATE: Verification and validation
- TRANSFORM: Data transformation

Usage:
    from skills import SkillRegistry

    registry = SkillRegistry()
    skill = registry.get("retrieve_docs")
    result = skill.execute(input_data)
"""

from typing import Dict, Any, List, Optional, Protocol
from dataclasses import dataclass, field
from enum import Enum
from abc import ABC, abstractmethod
import logging

logger = logging.getLogger(__name__)


class SkillCategory(Enum):
    """Categories of skills."""
    RETRIEVE = "retrieve"      # Data retrieval
    ANALYZE = "analyze"        # Analysis/inference
    GENERATE = "generate"      # Content generation
    VALIDATE = "validate"      # Verification
    TRANSFORM = "transform"    # Data transformation


@dataclass
class SkillInput:
    """Standard skill input."""
    data: Dict[str, Any]
    context: Dict[str, Any]
    options: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SkillOutput:
    """Standard skill output."""
    result: Any
    confidence: float
    evidence: List[Dict[str, Any]]
    metadata: Dict[str, Any]
    error: Optional[str] = None

    @property
    def success(self) -> bool:
        return self.error is None


class BaseSkill(ABC):
    """Base class for all skills."""

    name: str
    category: SkillCategory
    description: str
    version: str = "1.0.0"

    @abstractmethod
    def execute(self, input: SkillInput) -> SkillOutput:
        """Execute the skill."""
        pass

    @abstractmethod
    def validate_input(self, input: SkillInput) -> bool:
        """Validate input before execution."""
        pass

    def get_schema(self) -> Dict[str, Any]:
        """Return the skill's input/output schema."""
        return {
            "name": self.name,
            "category": self.category.value,
            "description": self.description,
            "version": self.version,
            "input_schema": self._get_input_schema(),
            "output_schema": self._get_output_schema(),
        }

    def _get_input_schema(self) -> Dict[str, Any]:
        """Override to define input schema."""
        return {
            "type": "object",
            "properties": {
                "data": {"type": "object"},
                "context": {"type": "object"},
                "options": {"type": "object"},
            },
            "required": ["data"],
        }

    def _get_output_schema(self) -> Dict[str, Any]:
        """Override to define output schema."""
        return {
            "type": "object",
            "properties": {
                "result": {"type": "any"},
                "confidence": {"type": "number"},
                "evidence": {"type": "array"},
                "metadata": {"type": "object"},
                "error": {"type": "string", "nullable": True},
            },
        }


# Import skill implementations
from .retrieve_skills import (
    RetrieveDocsSkill,
    RetrieveGraphSkill,
    RetrieveMetricsSkill,
)
from .analyze_skills import (
    AnalyzeRiskSkill,
    AnalyzeDependencySkill,
    AnalyzeSentimentSkill,
)
from .generate_skills import (
    GenerateSummarySkill,
    GenerateReportSkill,
)
from .validate_skills import (
    ValidateEvidenceSkill,
    ValidatePolicySkill,
)
from .registry import SkillRegistry

__all__ = [
    # Base
    "SkillCategory",
    "SkillInput",
    "SkillOutput",
    "BaseSkill",
    # Retrieve
    "RetrieveDocsSkill",
    "RetrieveGraphSkill",
    "RetrieveMetricsSkill",
    # Analyze
    "AnalyzeRiskSkill",
    "AnalyzeDependencySkill",
    "AnalyzeSentimentSkill",
    # Generate
    "GenerateSummarySkill",
    "GenerateReportSkill",
    # Validate
    "ValidateEvidenceSkill",
    "ValidatePolicySkill",
    # Registry
    "SkillRegistry",
]
