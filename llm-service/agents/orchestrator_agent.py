"""
Orchestrator Agent - Request Routing & Agent Coordination

Responsibilities:
- Route requests to appropriate agents
- Coordinate multi-agent interactions
- Handle agent handoffs
- Manage conversation flow

Maximum Authority: DECIDE
"""

from typing import Dict, Any, List, Optional, Type
import logging

from . import (
    BaseAgent,
    AgentRole,
    AgentContext,
    AgentResponse,
    register_agent,
    get_agent_class,
    create_agent,
)

try:
    from authority_classifier import AuthorityLevel
except ImportError:
    from enum import Enum
    class AuthorityLevel(Enum):
        SUGGEST = "suggest"
        DECIDE = "decide"
        EXECUTE = "execute"
        COMMIT = "commit"

logger = logging.getLogger(__name__)


@register_agent
class OrchestratorAgent(BaseAgent):
    """
    Central orchestrator that routes requests and coordinates agents.

    Handles:
    - Intent classification and agent routing
    - Multi-agent conversation management
    - Handoff coordination
    - Fallback handling
    """

    role = AgentRole.ORCHESTRATOR
    max_authority = AuthorityLevel.DECIDE
    allowed_skills = [
        "retrieve_docs",
        "generate_summary",
    ]
    description = "Routes requests to appropriate agents and coordinates responses"

    # Agent routing configuration
    AGENT_ROUTING = {
        AgentRole.PLANNER: {
            "keywords": ["plan", "schedule", "sprint", "scope", "capacity", "estimate",
                        "계획", "일정", "스프린트", "범위", "용량", "추정"],
            "priority": 2,
        },
        AgentRole.SCRUM_MASTER: {
            "keywords": ["velocity", "blocker", "progress", "status", "standup", "burndown",
                        "속도", "블로커", "진행", "상태", "스탠드업", "번다운"],
            "priority": 2,
        },
        AgentRole.REPORTER: {
            "keywords": ["report", "summary", "weekly", "monthly", "executive",
                        "보고서", "요약", "주간", "월간", "경영진"],
            "priority": 3,
        },
        AgentRole.KNOWLEDGE_CURATOR: {
            "keywords": ["document", "find", "search", "knowledge", "decision", "history",
                        "문서", "찾", "검색", "지식", "결정", "이력"],
            "priority": 1,
        },
        AgentRole.RISK_QUALITY: {
            "keywords": ["risk", "quality", "traceability", "gap", "audit", "verify",
                        "리스크", "품질", "추적", "갭", "감사", "검증"],
            "priority": 2,
        },
    }

    def __init__(self, skill_registry=None, llm_client=None):
        super().__init__(skill_registry, llm_client)
        self._agent_instances: Dict[AgentRole, BaseAgent] = {}

    def can_handle(self, context: AgentContext) -> bool:
        """Orchestrator can handle any request."""
        return True

    def process(self, context: AgentContext) -> AgentResponse:
        """Process request by routing to appropriate agent(s)."""
        try:
            query = context.request.get("query", "")

            # 1. Classify intent and select agent
            target_role = self._classify_and_route(query)

            if target_role:
                # 2. Get or create agent instance
                agent = self._get_agent(target_role)

                if agent and agent.can_handle(context):
                    # 3. Process with selected agent
                    response = agent.process(context)

                    # 4. Handle handoff if needed
                    if response.requires_handoff and response.handoff_to:
                        return self._handle_handoff(context, response)

                    return response

            # 5. Fallback to general response
            return self._handle_fallback(context)

        except Exception as e:
            logger.error(f"OrchestratorAgent error: {e}")
            return self.create_error_response(str(e))

    def _classify_and_route(self, query: str) -> Optional[AgentRole]:
        """Classify query and determine target agent."""
        query_lower = query.lower()

        # Score each agent based on keyword matches
        scores: Dict[AgentRole, float] = {}

        for role, config in self.AGENT_ROUTING.items():
            keywords = config["keywords"]
            priority = config["priority"]

            # Count keyword matches
            matches = sum(1 for kw in keywords if kw in query_lower)

            if matches > 0:
                # Score = matches * priority
                scores[role] = matches * priority

        if not scores:
            return None

        # Return agent with highest score
        return max(scores, key=scores.get)

    def _get_agent(self, role: AgentRole) -> Optional[BaseAgent]:
        """Get or create agent instance."""
        if role not in self._agent_instances:
            agent = create_agent(role, skill_registry=self.skills, llm_client=self.llm)
            if agent:
                self._agent_instances[role] = agent

        return self._agent_instances.get(role)

    def _handle_handoff(
        self,
        context: AgentContext,
        previous_response: AgentResponse
    ) -> AgentResponse:
        """Handle handoff to another agent."""
        target_role = previous_response.handoff_to

        if not target_role:
            return previous_response

        # Update context with partial results
        context.shared_memory["previous_response"] = previous_response.to_dict()
        context.shared_memory["handoff_reason"] = previous_response.handoff_reason

        # Get target agent
        target_agent = self._get_agent(target_role)

        if not target_agent:
            return AgentResponse(
                agent_role=self.role,
                content=f"Handoff to {target_role.value} failed: agent not available",
                confidence=0.0,
                evidence=[],
                actions_taken=[],
                actions_suggested=[],
                authority_level=AuthorityLevel.SUGGEST,
                error=f"Agent {target_role.value} not available",
            )

        # Process with target agent
        response = target_agent.process(context)

        # Add handoff metadata
        response.metadata["handoff_from"] = previous_response.agent_role.value
        response.metadata["handoff_reason"] = previous_response.handoff_reason

        return response

    def _handle_fallback(self, context: AgentContext) -> AgentResponse:
        """Handle requests that don't match any specific agent."""
        query = context.request.get("query", "")

        content = f"""
## 안녕하세요! 프로젝트 관리 AI입니다.

질문을 분석했습니다: "{query[:100]}..."

다음과 같은 도움을 드릴 수 있습니다:

### 📋 계획 (Planner)
- 스프린트 계획
- 용량 분석
- 의존성 관리

### 🏃 스크럼 (Scrum Master)
- 진행 상황 확인
- 블로커 관리
- 속도 분석

### 📊 보고서 (Reporter)
- 주간/월간 보고서
- 경영진 요약
- 스프린트 리뷰

### 📚 지식 (Knowledge Curator)
- 문서 검색
- 의사결정 이력
- 참조 자료

### ⚠️ 리스크/품질 (Risk/Quality)
- 리스크 평가
- 품질 점검
- 추적성 검증

어떤 것이 필요하신가요?
"""

        return AgentResponse(
            agent_role=self.role,
            content=content,
            confidence=0.6,
            evidence=[],
            actions_taken=[],
            actions_suggested=[],
            authority_level=AuthorityLevel.SUGGEST,
            metadata={"fallback": True},
        )

    def route_to_agent(
        self,
        role: AgentRole,
        context: AgentContext
    ) -> AgentResponse:
        """
        Explicitly route to a specific agent.

        Args:
            role: Target agent role
            context: Request context

        Returns:
            Agent response
        """
        agent = self._get_agent(role)

        if not agent:
            return self.create_error_response(f"Agent {role.value} not available")

        return agent.process(context)

    def get_agent_status(self) -> Dict[str, Any]:
        """Get status of all agents."""
        status = {}

        for role in AgentRole:
            if role == AgentRole.ORCHESTRATOR:
                continue

            agent = self._agent_instances.get(role)
            status[role.value] = {
                "available": agent is not None,
                "status": agent.status.value if agent else "not_initialized",
            }

        return status

    def list_capabilities(self) -> List[Dict[str, Any]]:
        """List capabilities of all available agents."""
        capabilities = []

        for role, config in self.AGENT_ROUTING.items():
            agent_class = get_agent_class(role)
            if agent_class:
                capabilities.append({
                    "role": role.value,
                    "description": agent_class.description if hasattr(agent_class, 'description') else "",
                    "max_authority": agent_class.max_authority.value if hasattr(agent_class, 'max_authority') else "suggest",
                    "keywords": config["keywords"],
                })

        return capabilities
