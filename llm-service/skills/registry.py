"""
Skill Registry - Central registry for skill discovery and execution

Provides:
- Skill registration and discovery
- Skill execution with validation
- Skill versioning and lifecycle
"""

from typing import Dict, Any, List, Optional, Type
import logging

from . import (
    BaseSkill,
    SkillCategory,
    SkillInput,
    SkillOutput,
    RetrieveDocsSkill,
    RetrieveGraphSkill,
    RetrieveMetricsSkill,
    AnalyzeRiskSkill,
    AnalyzeDependencySkill,
    AnalyzeSentimentSkill,
    GenerateSummarySkill,
    GenerateReportSkill,
    ValidateEvidenceSkill,
    ValidatePolicySkill,
)

logger = logging.getLogger(__name__)


class SkillRegistry:
    """
    Central registry for managing and discovering skills.

    Usage:
        registry = SkillRegistry()

        # Get skill by name
        skill = registry.get("retrieve_docs")
        result = skill.execute(SkillInput(data={...}))

        # List skills by category
        retrieve_skills = registry.list_by_category(SkillCategory.RETRIEVE)

        # Execute skill directly
        result = registry.execute("analyze_risk", data={...})
    """

    # Default skills to register
    DEFAULT_SKILLS: List[Type[BaseSkill]] = [
        # Retrieve
        RetrieveDocsSkill,
        RetrieveGraphSkill,
        RetrieveMetricsSkill,
        # Analyze
        AnalyzeRiskSkill,
        AnalyzeDependencySkill,
        AnalyzeSentimentSkill,
        # Generate
        GenerateSummarySkill,
        GenerateReportSkill,
        # Validate
        ValidateEvidenceSkill,
        ValidatePolicySkill,
    ]

    def __init__(self, auto_register: bool = True):
        """
        Initialize skill registry.

        Args:
            auto_register: If True, register default skills automatically
        """
        self._skills: Dict[str, BaseSkill] = {}
        self._skills_by_category: Dict[SkillCategory, List[str]] = {
            category: [] for category in SkillCategory
        }

        if auto_register:
            self._register_defaults()

    def _register_defaults(self):
        """Register default skills."""
        for skill_class in self.DEFAULT_SKILLS:
            self.register(skill_class())

    def register(self, skill: BaseSkill) -> None:
        """
        Register a skill.

        Args:
            skill: Skill instance to register

        Raises:
            ValueError: If skill with same name already registered
        """
        name = skill.name

        if name in self._skills:
            existing = self._skills[name]
            logger.warning(f"Replacing skill '{name}' (v{existing.version}) with v{skill.version}")

        self._skills[name] = skill
        self._skills_by_category[skill.category].append(name)

        logger.info(f"Registered skill: {name} (v{skill.version}, category: {skill.category.value})")

    def unregister(self, name: str) -> bool:
        """
        Unregister a skill.

        Args:
            name: Skill name to unregister

        Returns:
            True if skill was unregistered, False if not found
        """
        if name not in self._skills:
            return False

        skill = self._skills.pop(name)
        self._skills_by_category[skill.category].remove(name)

        logger.info(f"Unregistered skill: {name}")
        return True

    def get(self, name: str) -> Optional[BaseSkill]:
        """
        Get a skill by name.

        Args:
            name: Skill name

        Returns:
            Skill instance or None if not found
        """
        return self._skills.get(name)

    def list_all(self) -> List[Dict[str, Any]]:
        """
        List all registered skills.

        Returns:
            List of skill schemas
        """
        return [skill.get_schema() for skill in self._skills.values()]

    def list_by_category(self, category: SkillCategory) -> List[BaseSkill]:
        """
        List skills by category.

        Args:
            category: Skill category

        Returns:
            List of skills in category
        """
        names = self._skills_by_category.get(category, [])
        return [self._skills[name] for name in names if name in self._skills]

    def list_names(self) -> List[str]:
        """
        List all skill names.

        Returns:
            List of skill names
        """
        return list(self._skills.keys())

    def execute(
        self,
        name: str,
        data: Dict[str, Any],
        context: Dict[str, Any] = None,
        options: Dict[str, Any] = None,
    ) -> SkillOutput:
        """
        Execute a skill by name.

        Args:
            name: Skill name
            data: Skill input data
            context: Optional context
            options: Optional execution options

        Returns:
            Skill output

        Raises:
            ValueError: If skill not found
        """
        skill = self.get(name)
        if not skill:
            return SkillOutput(
                result=None,
                confidence=0.0,
                evidence=[],
                metadata={},
                error=f"Skill '{name}' not found"
            )

        input = SkillInput(
            data=data,
            context=context or {},
            options=options or {},
        )

        try:
            return skill.execute(input)
        except Exception as e:
            logger.error(f"Skill execution error ({name}): {e}")
            return SkillOutput(
                result=None,
                confidence=0.0,
                evidence=[],
                metadata={"skill": name},
                error=str(e)
            )

    def execute_chain(
        self,
        chain: List[Dict[str, Any]],
        initial_data: Dict[str, Any] = None,
    ) -> List[SkillOutput]:
        """
        Execute a chain of skills sequentially.

        Each skill's output can be passed to the next skill.

        Args:
            chain: List of skill configs [{name, data_transform, options}]
            initial_data: Initial input data

        Returns:
            List of outputs from each skill

        Example:
            chain = [
                {"name": "retrieve_docs", "data_transform": lambda d: {"query": d["question"]}},
                {"name": "generate_summary", "data_transform": lambda d: {"content": d["result"]}},
            ]
            results = registry.execute_chain(chain, {"question": "What is the project status?"})
        """
        results = []
        current_data = initial_data or {}

        for step in chain:
            name = step.get("name")
            transform = step.get("data_transform", lambda x: x)
            options = step.get("options", {})

            # Transform data for this step
            step_data = transform(current_data)

            # Execute skill
            output = self.execute(name, step_data, options=options)
            results.append(output)

            # Update data for next step
            if output.success:
                current_data = {
                    **current_data,
                    "result": output.result,
                    "confidence": output.confidence,
                    "evidence": output.evidence,
                }

        return results

    def search(self, query: str) -> List[BaseSkill]:
        """
        Search skills by name or description.

        Args:
            query: Search query

        Returns:
            List of matching skills
        """
        query_lower = query.lower()
        matches = []

        for skill in self._skills.values():
            if (query_lower in skill.name.lower() or
                query_lower in skill.description.lower() or
                query_lower in skill.category.value):
                matches.append(skill)

        return matches

    def get_schema(self, name: str) -> Optional[Dict[str, Any]]:
        """
        Get skill schema by name.

        Args:
            name: Skill name

        Returns:
            Skill schema or None
        """
        skill = self.get(name)
        return skill.get_schema() if skill else None

    def get_all_schemas(self) -> Dict[str, Dict[str, Any]]:
        """
        Get all skill schemas.

        Returns:
            Dict mapping skill name to schema
        """
        return {name: skill.get_schema() for name, skill in self._skills.items()}


# Global registry instance
_global_registry: Optional[SkillRegistry] = None


def get_registry() -> SkillRegistry:
    """
    Get the global skill registry.

    Returns:
        Global SkillRegistry instance
    """
    global _global_registry
    if _global_registry is None:
        _global_registry = SkillRegistry()
    return _global_registry


def register_skill(skill: BaseSkill) -> None:
    """
    Register a skill in the global registry.

    Args:
        skill: Skill to register
    """
    get_registry().register(skill)


def execute_skill(name: str, data: Dict, **kwargs) -> SkillOutput:
    """
    Execute a skill from the global registry.

    Args:
        name: Skill name
        data: Input data
        **kwargs: Additional options

    Returns:
        Skill output
    """
    return get_registry().execute(name, data, **kwargs)
