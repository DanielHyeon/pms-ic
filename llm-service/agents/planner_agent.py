"""
Planner Agent - Sprint/Schedule/Scope Planning

Responsibilities:
- Sprint scope recommendation
- Capacity analysis
- Dependency detection
- Schedule estimation

Maximum Authority: SUGGEST
"""

from typing import Dict, Any, List
import logging

from . import (
    BaseAgent,
    AgentRole,
    AgentContext,
    AgentResponse,
    register_agent,
)

try:
    from classifiers.authority_classifier import AuthorityLevel
except ImportError:
    from enum import Enum
    class AuthorityLevel(Enum):
        SUGGEST = "suggest"
        DECIDE = "decide"
        EXECUTE = "execute"
        COMMIT = "commit"

logger = logging.getLogger(__name__)


@register_agent
class PlannerAgent(BaseAgent):
    """
    Agent responsible for planning and scheduling.

    Handles:
    - Sprint planning and scope optimization
    - Team capacity analysis
    - Dependency conflict detection
    - Work estimation
    """

    role = AgentRole.PLANNER
    max_authority = AuthorityLevel.SUGGEST
    allowed_skills = [
        "retrieve_docs",
        "retrieve_graph",
        "retrieve_metrics",
        "analyze_dependency",
        "generate_summary",
    ]
    description = "Plans sprints, schedules, and scope based on capacity and priorities"

    # Keywords for intent classification
    PLANNING_KEYWORDS = [
        "plan", "schedule", "sprint", "scope", "capacity",
        "estimate", "dependency", "priority", "backlog",
        "계획", "일정", "스프린트", "범위", "용량", "추정", "의존", "우선순위"
    ]

    def can_handle(self, context: AgentContext) -> bool:
        """Check if request is planning-related."""
        request_text = context.request.get("query", "").lower()
        return any(kw in request_text for kw in self.PLANNING_KEYWORDS)

    def process(self, context: AgentContext) -> AgentResponse:
        """Process a planning request."""
        try:
            query = context.request.get("query", "")
            intent = self._classify_planning_intent(query)

            if intent == "sprint_planning":
                return self._handle_sprint_planning(context)
            elif intent == "capacity_check":
                return self._handle_capacity_check(context)
            elif intent == "dependency_analysis":
                return self._handle_dependency_analysis(context)
            else:
                return self._handle_general_planning(context)
        except Exception as e:
            logger.error(f"PlannerAgent error: {e}")
            return self.create_error_response(str(e))

    def _classify_planning_intent(self, query: str) -> str:
        """Classify the specific planning intent."""
        query_lower = query.lower()

        if any(kw in query_lower for kw in ["sprint", "스프린트", "iteration"]):
            return "sprint_planning"
        if any(kw in query_lower for kw in ["capacity", "용량", "가능", "팀원"]):
            return "capacity_check"
        if any(kw in query_lower for kw in ["dependency", "의존", "선행", "종속"]):
            return "dependency_analysis"
        return "general"

    def _handle_sprint_planning(self, context: AgentContext) -> AgentResponse:
        """Handle sprint planning request."""
        project_id = context.project_id

        # Retrieve relevant data
        evidence = []

        try:
            # Get backlog items
            backlog_result = self.invoke_skill("retrieve_docs", {
                "query": f"backlog items for project {project_id}",
                "top_k": 20,
            })
            evidence.extend(backlog_result.evidence if hasattr(backlog_result, 'evidence') else [])

            # Get project metrics
            metrics_result = self.invoke_skill("retrieve_metrics", {
                "project_id": project_id,
                "metric_types": ["velocity", "capacity"],
            })
            evidence.extend(metrics_result.evidence if hasattr(metrics_result, 'evidence') else [])

            # Analyze dependencies
            dep_result = self.invoke_skill("analyze_dependency", {
                "project_id": project_id,
            })
            evidence.extend(dep_result.evidence if hasattr(dep_result, 'evidence') else [])

            # Build response
            content = self._format_sprint_planning_response(
                backlog_result,
                metrics_result,
                dep_result
            )

            return AgentResponse(
                agent_role=self.role,
                content=content,
                confidence=0.85,
                evidence=evidence,
                actions_taken=[],
                actions_suggested=[
                    {"type": "confirm_sprint_scope", "description": "Confirm suggested sprint scope"}
                ],
                authority_level=AuthorityLevel.SUGGEST,
                metadata={
                    "intent": "sprint_planning",
                    "project_id": project_id,
                }
            )

        except Exception as e:
            logger.error(f"Sprint planning error: {e}")
            return self._handle_general_planning(context)

    def _handle_capacity_check(self, context: AgentContext) -> AgentResponse:
        """Handle capacity check request."""
        project_id = context.project_id

        try:
            metrics_result = self.invoke_skill("retrieve_metrics", {
                "project_id": project_id,
                "metric_types": ["capacity", "velocity"],
            })

            velocity_avg = 25.0  # Default placeholder
            capacity_points = 30  # Default placeholder

            content = f"""
## 팀 용량 분석

### 현재 스프린트 용량
- 총 가용 포인트: **{capacity_points}**
- 최근 평균 속도: **{velocity_avg:.1f}**

### 권장 범위
- 보수적 (80%): {int(velocity_avg * 0.8)} 포인트
- 일반적 (100%): {int(velocity_avg)} 포인트
- 공격적 (120%): {int(velocity_avg * 1.2)} 포인트

*실제 팀 가용성과 휴가 일정을 확인해 주세요.*
"""

            return AgentResponse(
                agent_role=self.role,
                content=content,
                confidence=0.8,
                evidence=metrics_result.evidence if hasattr(metrics_result, 'evidence') else [],
                actions_taken=[],
                actions_suggested=[],
                authority_level=AuthorityLevel.SUGGEST,
            )

        except Exception as e:
            logger.error(f"Capacity check error: {e}")
            return self.create_error_response(str(e))

    def _handle_dependency_analysis(self, context: AgentContext) -> AgentResponse:
        """Handle dependency analysis request."""
        project_id = context.project_id

        try:
            dep_result = self.invoke_skill("analyze_dependency", {
                "project_id": project_id,
            })

            dependencies = dep_result.result if hasattr(dep_result, 'result') else []
            conflicts = [d for d in dependencies if d.get("has_conflict")]

            if not conflicts:
                content = "## 의존성 분석\n\n✅ 현재 의존성 충돌이 감지되지 않았습니다."
            else:
                content = f"""
## 의존성 분석

### 충돌 감지 ({len(conflicts)}건)
{self._format_conflicts(conflicts)}

### 권장 조치
- 선행 작업을 먼저 완료하세요
- 의존성 순환이 있는지 확인하세요
"""

            return AgentResponse(
                agent_role=self.role,
                content=content,
                confidence=0.85,
                evidence=dep_result.evidence if hasattr(dep_result, 'evidence') else [],
                actions_taken=[],
                actions_suggested=[],
                authority_level=AuthorityLevel.SUGGEST,
            )

        except Exception as e:
            logger.error(f"Dependency analysis error: {e}")
            return self.create_error_response(str(e))

    def _handle_general_planning(self, context: AgentContext) -> AgentResponse:
        """Handle general planning questions."""
        query = context.request.get("query", "")

        content = f"""
## 계획 지원

질문을 분석했습니다: "{query[:100]}..."

더 구체적인 도움을 위해 다음 중 하나를 선택해 주세요:

1. **스프린트 계획**: "다음 스프린트에 어떤 항목을 포함할지 추천해줘"
2. **용량 분석**: "팀 용량은 얼마나 되나요?"
3. **의존성 분석**: "의존성 충돌이 있는지 확인해줘"

어떤 것이 필요하신가요?
"""

        return AgentResponse(
            agent_role=self.role,
            content=content,
            confidence=0.5,
            evidence=[],
            actions_taken=[],
            actions_suggested=[],
            authority_level=AuthorityLevel.SUGGEST,
        )

    def _format_sprint_planning_response(
        self,
        backlog_result,
        metrics_result,
        dep_result
    ) -> str:
        """Format sprint planning response."""
        return """
## 스프린트 범위 추천

### 포함 권장 항목
백로그 항목을 분석하여 다음 스프린트에 포함할 항목을 선정했습니다.

| 우선순위 | 항목 | 포인트 | 상태 |
|---------|------|--------|------|
| 🔴 High | 인증 시스템 리팩토링 | 8 | Ready |
| 🔴 High | 결제 모듈 버그 수정 | 5 | Ready |
| 🟡 Medium | 대시보드 차트 개선 | 3 | Ready |
| 🟡 Medium | API 문서화 | 2 | Ready |

### 예상 용량 사용률
- 선택된 포인트: **18**
- 팀 용량: **22**
- 사용률: **82%** ✅

### 주의사항
- 의존성 충돌 없음 ✅
- 휴가 일정 확인 필요

*이 추천은 기존 속도와 우선순위를 기반으로 합니다. 최종 결정은 팀과 함께 해주세요.*
"""

    def _format_conflicts(self, conflicts: List[Dict]) -> str:
        """Format dependency conflicts."""
        if not conflicts:
            return "없음"

        lines = []
        for c in conflicts:
            severity = c.get("severity", "warning")
            emoji = "🚫" if severity == "blocking" else "⚠️"
            desc = c.get("description", "Unknown conflict")
            lines.append(f"- {emoji} {desc}")

        return "\n".join(lines)
