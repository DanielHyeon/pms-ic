"""
Agents Module - Subagent Pool for AI-PMS

Provides role-specific agents for project management tasks:
- Orchestrator: Request routing and agent coordination
- Planner: Sprint/schedule/scope planning
- Scrum Master: Sprint execution and blocker management
- Reporter: Report generation and summarization
- Knowledge Curator: Document curation and decision linking
- Risk/Quality: Risk detection and traceability verification
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, Type
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime
import uuid
import logging

logger = logging.getLogger(__name__)


# Import from Phase 1
try:
    from authority_classifier import AuthorityLevel
except ImportError:
    class AuthorityLevel(Enum):
        """Fallback AuthorityLevel if not available."""
        SUGGEST = "suggest"
        DECIDE = "decide"
        EXECUTE = "execute"
        COMMIT = "commit"


# Import from Phase 2
try:
    from skills import SkillRegistry, SkillInput, SkillOutput, get_registry
except ImportError:
    SkillRegistry = None
    SkillInput = None
    SkillOutput = None
    get_registry = None


class AgentRole(Enum):
    """Roles for specialized agents."""
    PLANNER = "planner"
    SCRUM_MASTER = "scrum_master"
    REPORTER = "reporter"
    KNOWLEDGE_CURATOR = "knowledge_curator"
    RISK_QUALITY = "risk_quality"
    ORCHESTRATOR = "orchestrator"


class AgentStatus(Enum):
    """Status of an agent execution."""
    IDLE = "idle"
    PROCESSING = "processing"
    WAITING_HANDOFF = "waiting_handoff"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class AgentContext:
    """
    Context passed to agents for processing.

    Attributes:
        trace_id: Unique identifier for tracing
        project_id: Target project ID
        user_id: Requesting user ID
        user_role: User's role (PM, Developer, etc.)
        request: Original request data
        project_state: Current project state snapshot
        conversation_history: Previous messages in conversation
        shared_memory: Data shared between agents
    """
    trace_id: str
    project_id: str
    user_id: str
    user_role: str
    request: Dict[str, Any]
    project_state: Dict[str, Any] = field(default_factory=dict)
    conversation_history: List[Dict[str, Any]] = field(default_factory=list)
    shared_memory: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "trace_id": self.trace_id,
            "project_id": self.project_id,
            "user_id": self.user_id,
            "user_role": self.user_role,
            "request": self.request,
            "project_state": self.project_state,
            "conversation_history": self.conversation_history,
        }


@dataclass
class AgentResponse:
    """
    Standard response from an agent.

    Attributes:
        agent_role: Role of the responding agent
        content: Main response content (markdown)
        confidence: Confidence score (0.0-1.0)
        evidence: Supporting evidence list
        actions_taken: Actions already executed
        actions_suggested: Actions requiring approval
        authority_level: Authority level of response
        requires_handoff: Whether handoff to another agent is needed
        handoff_to: Target agent for handoff
        handoff_reason: Reason for handoff
        metadata: Additional metadata
    """
    agent_role: AgentRole
    content: str
    confidence: float
    evidence: List[Dict[str, Any]]
    actions_taken: List[Dict[str, Any]]
    actions_suggested: List[Dict[str, Any]]
    authority_level: AuthorityLevel
    requires_handoff: bool = False
    handoff_to: Optional[AgentRole] = None
    handoff_reason: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None

    @property
    def success(self) -> bool:
        return self.error is None and self.confidence > 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "agent_role": self.agent_role.value,
            "content": self.content,
            "confidence": self.confidence,
            "evidence": self.evidence,
            "actions_taken": self.actions_taken,
            "actions_suggested": self.actions_suggested,
            "authority_level": self.authority_level.value,
            "requires_handoff": self.requires_handoff,
            "handoff_to": self.handoff_to.value if self.handoff_to else None,
            "handoff_reason": self.handoff_reason,
            "metadata": self.metadata,
            "error": self.error,
        }


class BaseAgent(ABC):
    """
    Base class for all agents.

    Each agent has:
    - A specific role (planner, scrum_master, etc.)
    - Maximum authority level (SUGGEST, DECIDE, EXECUTE, COMMIT)
    - List of allowed skills
    - Processing logic for its domain

    Example:
        class MyAgent(BaseAgent):
            role = AgentRole.PLANNER
            max_authority = AuthorityLevel.SUGGEST
            allowed_skills = ["retrieve_backlog", "optimize_scope"]
            description = "Plans sprints and schedules"

            def can_handle(self, context):
                return "plan" in context.request.get("query", "").lower()

            def process(self, context):
                # Processing logic
                return AgentResponse(...)
    """

    role: AgentRole
    max_authority: AuthorityLevel
    allowed_skills: List[str]
    description: str

    def __init__(self, skill_registry=None, llm_client=None):
        """
        Initialize agent.

        Args:
            skill_registry: SkillRegistry instance (optional)
            llm_client: LLM client for generation (optional)
        """
        self.skills = skill_registry or (get_registry() if get_registry else None)
        self.llm = llm_client
        self.agent_id = str(uuid.uuid4())
        self.status = AgentStatus.IDLE
        self._created_at = datetime.utcnow()

    @abstractmethod
    def process(self, context: AgentContext) -> AgentResponse:
        """
        Process a request and return a response.

        Args:
            context: AgentContext with request details

        Returns:
            AgentResponse with results
        """
        pass

    @abstractmethod
    def can_handle(self, context: AgentContext) -> bool:
        """
        Check if this agent can handle the given request.

        Args:
            context: AgentContext with request details

        Returns:
            True if this agent can handle the request
        """
        pass

    def invoke_skill(self, skill_name: str, input_data: Dict[str, Any]) -> Any:
        """
        Invoke a skill if allowed.

        Args:
            skill_name: Name of skill to invoke
            input_data: Data to pass to skill

        Returns:
            SkillOutput or dict with results

        Raises:
            PermissionError: If skill not in allowed_skills
            ValueError: If skill not found
        """
        if skill_name not in self.allowed_skills:
            raise PermissionError(
                f"Agent {self.role.value} not allowed to use skill {skill_name}"
            )

        if not self.skills:
            logger.warning(f"No skill registry available, returning mock for {skill_name}")
            return {"result": None, "confidence": 0.0, "evidence": []}

        skill = self.skills.get(skill_name)
        if not skill:
            raise ValueError(f"Skill {skill_name} not found")

        if SkillInput:
            skill_input = SkillInput(data=input_data, context={}, options={})
            return skill.execute(skill_input)
        else:
            return skill.execute(input_data)

    def request_handoff(
        self,
        to_agent: AgentRole,
        reason: str,
        partial_result: Dict[str, Any] = None
    ) -> AgentResponse:
        """
        Request handoff to another agent.

        Args:
            to_agent: Target agent role
            reason: Reason for handoff
            partial_result: Any partial results to pass

        Returns:
            AgentResponse indicating handoff request
        """
        return AgentResponse(
            agent_role=self.role,
            content=f"Requesting handoff to {to_agent.value}: {reason}",
            confidence=0.0,
            evidence=[],
            actions_taken=[],
            actions_suggested=[],
            authority_level=AuthorityLevel.SUGGEST,
            requires_handoff=True,
            handoff_to=to_agent,
            handoff_reason=reason,
            metadata={"partial_result": partial_result or {}},
        )

    def create_error_response(self, error: str) -> AgentResponse:
        """Create an error response."""
        return AgentResponse(
            agent_role=self.role,
            content=f"Error: {error}",
            confidence=0.0,
            evidence=[],
            actions_taken=[],
            actions_suggested=[],
            authority_level=AuthorityLevel.SUGGEST,
            error=error,
        )

    def get_system_prompt(self) -> str:
        """Get the system prompt for this agent."""
        return f"""
You are the {self.role.value} agent in a Project Management AI system.

Role: {self.description}
Maximum Authority: {self.max_authority.value}
Available Skills: {', '.join(self.allowed_skills)}

Guidelines:
1. Only use skills you are allowed to use
2. Never exceed your maximum authority level ({self.max_authority.value})
3. If a task requires higher authority or different skills, request a handoff
4. Always provide evidence for your conclusions
5. Be concise and actionable in your responses
6. Use Korean for user-facing content when appropriate
"""

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__} role={self.role.value} id={self.agent_id[:8]}>"


# Agent registry for discovery
_agent_registry: Dict[AgentRole, Type[BaseAgent]] = {}


def register_agent(agent_class: Type[BaseAgent]) -> Type[BaseAgent]:
    """
    Decorator to register an agent class.

    Example:
        @register_agent
        class MyAgent(BaseAgent):
            role = AgentRole.PLANNER
            ...
    """
    if hasattr(agent_class, 'role'):
        _agent_registry[agent_class.role] = agent_class
        logger.info(f"Registered agent: {agent_class.role.value}")
    return agent_class


def get_agent_class(role: AgentRole) -> Optional[Type[BaseAgent]]:
    """Get agent class by role."""
    return _agent_registry.get(role)


def list_registered_agents() -> List[AgentRole]:
    """List all registered agent roles."""
    return list(_agent_registry.keys())


def create_agent(role: AgentRole, **kwargs) -> Optional[BaseAgent]:
    """
    Create an agent instance by role.

    Args:
        role: Agent role to create
        **kwargs: Arguments to pass to agent constructor

    Returns:
        Agent instance or None if not found
    """
    agent_class = get_agent_class(role)
    if agent_class:
        return agent_class(**kwargs)
    return None


# Import concrete agents (will be defined in separate files)
from .planner_agent import PlannerAgent
from .scrum_master_agent import ScrumMasterAgent
from .reporter_agent import ReporterAgent
from .knowledge_curator_agent import KnowledgeCuratorAgent
from .risk_quality_agent import RiskQualityAgent
from .orchestrator_agent import OrchestratorAgent


__all__ = [
    # Enums
    "AgentRole",
    "AgentStatus",
    # Data classes
    "AgentContext",
    "AgentResponse",
    # Base class
    "BaseAgent",
    # Registry functions
    "register_agent",
    "get_agent_class",
    "list_registered_agents",
    "create_agent",
    # Concrete agents
    "PlannerAgent",
    "ScrumMasterAgent",
    "ReporterAgent",
    "KnowledgeCuratorAgent",
    "RiskQualityAgent",
    "OrchestratorAgent",
]
