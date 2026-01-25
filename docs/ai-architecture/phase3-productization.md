# Phase 3: Productization (Subagent Pool, MCP, Value Metrics)

## 목표
AI 시스템을 "제품"으로 전환: 역할별 에이전트 분리, 도구 표준화, 비즈니스 가치 측정

## 예상 기간
8-12주

## 사전 요구사항
- Phase 1 완료 (Gates & Foundation)
- Phase 2 완료 (Workflow & Skills)

---

## 1. Subagent Pool Architecture

### 1.1 개요

| Agent | 역할 | 주요 Skill | 권한 |
|-------|------|-----------|------|
| **Planner Agent** | 일정/범위/의존성 계획 | optimize_scope, estimate_completion | SUGGEST |
| **Scrum Master Agent** | 스프린트/속도/블로커 관리 | detect_blockers, calculate_velocity | EXECUTE |
| **Reporter Agent** | 보고서 생성/요약 | compose_report, summarize_progress | EXECUTE |
| **Knowledge Curator** | 문서 큐레이션/결정 연결 | curate_documents, link_decisions | SUGGEST |
| **Risk/Quality Agent** | 누락/충돌/품질 점검 | detect_risks, verify_traceability | SUGGEST |
| **Orchestrator Agent** | 에이전트 조율/라우팅 | route_request, coordinate_agents | DECIDE |

### 1.2 Subagent 기본 구조

**파일:** `llm-service/agents/base_agent.py`

```python
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime
import uuid

from authority_classifier import AuthorityLevel
from skills import SkillRegistry, SkillInput, SkillOutput

class AgentRole(Enum):
    PLANNER = "planner"
    SCRUM_MASTER = "scrum_master"
    REPORTER = "reporter"
    KNOWLEDGE_CURATOR = "knowledge_curator"
    RISK_QUALITY = "risk_quality"
    ORCHESTRATOR = "orchestrator"

@dataclass
class AgentContext:
    """Context passed to agents."""
    trace_id: str
    project_id: str
    user_id: str
    user_role: str
    request: Dict[str, Any]
    project_state: Dict[str, Any]
    conversation_history: List[Dict[str, Any]] = field(default_factory=list)
    shared_memory: Dict[str, Any] = field(default_factory=dict)

@dataclass
class AgentResponse:
    """Standard agent response."""
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
        }


class BaseAgent(ABC):
    """Base class for all agents."""

    role: AgentRole
    max_authority: AuthorityLevel
    allowed_skills: List[str]
    description: str

    def __init__(self, skill_registry: SkillRegistry, llm_client):
        self.skills = skill_registry
        self.llm = llm_client
        self.agent_id = str(uuid.uuid4())

    @abstractmethod
    def process(self, context: AgentContext) -> AgentResponse:
        """Process a request and return a response."""
        pass

    @abstractmethod
    def can_handle(self, context: AgentContext) -> bool:
        """Check if this agent can handle the given request."""
        pass

    def invoke_skill(self, skill_name: str, input_data: Dict[str, Any]) -> SkillOutput:
        """Invoke a skill if allowed."""
        if skill_name not in self.allowed_skills:
            raise PermissionError(f"Agent {self.role} not allowed to use skill {skill_name}")

        skill = self.skills.get(skill_name)
        if not skill:
            raise ValueError(f"Skill {skill_name} not found")

        skill_input = SkillInput(data=input_data, context={}, options={})
        return skill.execute(skill_input)

    def request_handoff(
        self,
        to_agent: AgentRole,
        reason: str,
        partial_result: Dict[str, Any] = None
    ) -> AgentResponse:
        """Request handoff to another agent."""
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
            metadata={"partial_result": partial_result},
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
2. Never exceed your maximum authority level
3. If a task requires higher authority or different skills, request a handoff
4. Always provide evidence for your conclusions
5. Be concise and actionable in your responses
"""
```

### 1.3 Planner Agent

**파일:** `llm-service/agents/planner_agent.py`

```python
from typing import Dict, Any, List
from .base_agent import BaseAgent, AgentRole, AgentContext, AgentResponse
from authority_classifier import AuthorityLevel

class PlannerAgent(BaseAgent):
    """Agent responsible for planning and scheduling."""

    role = AgentRole.PLANNER
    max_authority = AuthorityLevel.SUGGEST
    allowed_skills = [
        "retrieve_backlog_items",
        "retrieve_team_capacity",
        "retrieve_dependencies",
        "retrieve_velocity_history",
        "optimize_sprint_scope",
        "detect_dependency_conflicts",
        "estimate_sprint_completion",
    ]
    description = "Plans sprints, schedules, and scope based on capacity and priorities"

    def can_handle(self, context: AgentContext) -> bool:
        """Check if request is planning-related."""
        planning_keywords = [
            "plan", "schedule", "sprint", "scope", "capacity",
            "estimate", "dependency", "priority", "backlog",
            "계획", "일정", "스프린트", "범위", "용량", "추정"
        ]
        request_text = context.request.get("query", "").lower()
        return any(kw in request_text for kw in planning_keywords)

    def process(self, context: AgentContext) -> AgentResponse:
        """Process a planning request."""
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

    def _classify_planning_intent(self, query: str) -> str:
        """Classify the specific planning intent."""
        if any(kw in query.lower() for kw in ["sprint", "스프린트"]):
            return "sprint_planning"
        if any(kw in query.lower() for kw in ["capacity", "용량", "가능"]):
            return "capacity_check"
        if any(kw in query.lower() for kw in ["dependency", "의존", "선행"]):
            return "dependency_analysis"
        return "general"

    def _handle_sprint_planning(self, context: AgentContext) -> AgentResponse:
        """Handle sprint planning request."""
        # 1. Retrieve data
        backlog = self.invoke_skill("retrieve_backlog_items", {
            "project_id": context.project_id,
            "status": ["ready", "refined"],
        })

        capacity = self.invoke_skill("retrieve_team_capacity", {
            "project_id": context.project_id,
            "sprint_duration": 14,  # 2 weeks
        })

        dependencies = self.invoke_skill("retrieve_dependencies", {
            "project_id": context.project_id,
            "item_ids": [item["id"] for item in backlog.result],
        })

        velocity = self.invoke_skill("retrieve_velocity_history", {
            "project_id": context.project_id,
            "sprints": 5,
        })

        # 2. Optimize scope
        optimization = self.invoke_skill("optimize_sprint_scope", {
            "backlog": backlog.result,
            "capacity": capacity.result,
            "dependencies": dependencies.result,
            "velocity": velocity.result,
            "sprint_goal": context.request.get("sprint_goal", ""),
        })

        # 3. Check for conflicts
        conflicts = self.invoke_skill("detect_dependency_conflicts", {
            "selected_items": optimization.result["included"],
            "all_dependencies": dependencies.result,
        })

        # 4. Build response
        included_items = optimization.result["included"]
        excluded_items = optimization.result["excluded"]
        utilization = optimization.result["utilization"]

        content = f"""
## 스프린트 범위 추천

### 포함 권장 항목 ({len(included_items)}개, {sum(i.get('points', 0) for i in included_items)} 포인트)
{self._format_items(included_items[:10])}

### 용량 사용률: {utilization:.0%}

### 제외된 항목 ({len(excluded_items)}개)
{self._format_exclusions(excluded_items[:5], optimization.result.get('exclusion_reasons', {}))}

### 주의사항
{self._format_conflicts(conflicts.result)}

*이 추천은 기존 속도와 용량을 기반으로 합니다. 최종 결정은 팀과 함께 해주세요.*
"""

        return AgentResponse(
            agent_role=self.role,
            content=content,
            confidence=optimization.confidence,
            evidence=backlog.evidence + velocity.evidence,
            actions_taken=[],
            actions_suggested=[
                {"type": "confirm_sprint_scope", "items": [i["id"] for i in included_items]}
            ],
            authority_level=AuthorityLevel.SUGGEST,
            metadata={
                "total_points": sum(i.get('points', 0) for i in included_items),
                "utilization": utilization,
                "conflict_count": len(conflicts.result),
            }
        )

    def _handle_capacity_check(self, context: AgentContext) -> AgentResponse:
        """Handle capacity check request."""
        capacity = self.invoke_skill("retrieve_team_capacity", {
            "project_id": context.project_id,
            "sprint_duration": 14,
        })

        velocity = self.invoke_skill("retrieve_velocity_history", {
            "project_id": context.project_id,
            "sprints": 5,
        })

        avg_velocity = sum(v.get("points", 0) for v in velocity.result) / max(len(velocity.result), 1)
        total_capacity = capacity.result.get("total_points", 0)

        content = f"""
## 팀 용량 분석

### 현재 스프린트 용량
- 총 가용 포인트: **{total_capacity}**
- 최근 5스프린트 평균 속도: **{avg_velocity:.1f}**

### 팀원별 가용 시간
{self._format_team_capacity(capacity.result.get('members', []))}

### 권장 범위
- 보수적 (80%): {int(avg_velocity * 0.8)} 포인트
- 일반적 (100%): {int(avg_velocity)} 포인트
- 공격적 (120%): {int(avg_velocity * 1.2)} 포인트
"""

        return AgentResponse(
            agent_role=self.role,
            content=content,
            confidence=0.85,
            evidence=capacity.evidence + velocity.evidence,
            actions_taken=[],
            actions_suggested=[],
            authority_level=AuthorityLevel.SUGGEST,
        )

    def _handle_dependency_analysis(self, context: AgentContext) -> AgentResponse:
        """Handle dependency analysis request."""
        # Implementation similar to above
        return AgentResponse(
            agent_role=self.role,
            content="Dependency analysis not yet implemented",
            confidence=0.0,
            evidence=[],
            actions_taken=[],
            actions_suggested=[],
            authority_level=AuthorityLevel.SUGGEST,
        )

    def _handle_general_planning(self, context: AgentContext) -> AgentResponse:
        """Handle general planning questions."""
        # Use LLM to generate response based on context
        return AgentResponse(
            agent_role=self.role,
            content="General planning query - please be more specific about what you'd like to plan.",
            confidence=0.5,
            evidence=[],
            actions_taken=[],
            actions_suggested=[],
            authority_level=AuthorityLevel.SUGGEST,
        )

    def _format_items(self, items: List[Dict]) -> str:
        """Format items for display."""
        lines = []
        for i, item in enumerate(items, 1):
            priority_emoji = {"high": "🔴", "medium": "🟡", "low": "🟢"}.get(item.get("priority", "medium"), "⚪")
            lines.append(f"{i}. {priority_emoji} [{item.get('points', '?')}pt] {item.get('title', 'Untitled')}")
        return "\n".join(lines) if lines else "없음"

    def _format_exclusions(self, items: List[Dict], reasons: Dict[str, str]) -> str:
        """Format excluded items with reasons."""
        lines = []
        for item in items:
            reason = reasons.get(item["id"], "기타")
            lines.append(f"- {item.get('title', 'Untitled')}: {reason}")
        return "\n".join(lines) if lines else "없음"

    def _format_conflicts(self, conflicts: List[Dict]) -> str:
        """Format dependency conflicts."""
        if not conflicts:
            return "의존성 충돌 없음 ✅"

        lines = []
        for c in conflicts:
            severity_emoji = {"blocking": "🚫", "warning": "⚠️"}.get(c.get("severity"), "ℹ️")
            lines.append(f"{severity_emoji} {c.get('description', '')}")
        return "\n".join(lines)

    def _format_team_capacity(self, members: List[Dict]) -> str:
        """Format team member capacity."""
        if not members:
            return "팀원 정보 없음"

        lines = []
        for m in members:
            lines.append(f"- {m.get('name', 'Unknown')}: {m.get('available_hours', 0)}시간")
        return "\n".join(lines)
```

### 1.4 Scrum Master Agent

**파일:** `llm-service/agents/scrum_master_agent.py`

```python
from typing import Dict, Any
from .base_agent import BaseAgent, AgentRole, AgentContext, AgentResponse
from authority_classifier import AuthorityLevel

class ScrumMasterAgent(BaseAgent):
    """Agent responsible for scrum/agile process management."""

    role = AgentRole.SCRUM_MASTER
    max_authority = AuthorityLevel.EXECUTE
    allowed_skills = [
        "retrieve_project_metrics",
        "retrieve_recent_changes",
        "retrieve_open_issues",
        "detect_risks",
        "calculate_velocity",
        "identify_blockers",
        "update_task_status",
    ]
    description = "Manages sprint execution, velocity tracking, and blocker resolution"

    def can_handle(self, context: AgentContext) -> bool:
        """Check if request is scrum-related."""
        scrum_keywords = [
            "velocity", "blocker", "impediment", "standup", "retrospective",
            "progress", "status", "daily", "sprint review",
            "속도", "블로커", "장애", "스탠드업", "회고", "진행", "상태"
        ]
        request_text = context.request.get("query", "").lower()
        return any(kw in request_text for kw in scrum_keywords)

    def process(self, context: AgentContext) -> AgentResponse:
        """Process a scrum-related request."""
        query = context.request.get("query", "")

        if "blocker" in query.lower() or "블로커" in query:
            return self._handle_blocker_query(context)
        elif "velocity" in query.lower() or "속도" in query:
            return self._handle_velocity_query(context)
        elif "progress" in query.lower() or "진행" in query:
            return self._handle_progress_query(context)
        else:
            return self._handle_general_scrum(context)

    def _handle_blocker_query(self, context: AgentContext) -> AgentResponse:
        """Handle blocker identification and resolution."""
        issues = self.invoke_skill("retrieve_open_issues", {
            "project_id": context.project_id,
            "include_resolved_this_week": False,
        })

        blockers = [i for i in issues.result if i.get("status") == "blocked" or i.get("is_blocker")]

        if not blockers:
            content = "✅ 현재 활성 블로커가 없습니다."
        else:
            content = f"""
## 현재 블로커 ({len(blockers)}건)

{self._format_blockers(blockers)}

### 권장 조치
{self._generate_blocker_recommendations(blockers)}
"""

        return AgentResponse(
            agent_role=self.role,
            content=content,
            confidence=0.9,
            evidence=issues.evidence,
            actions_taken=[],
            actions_suggested=self._generate_blocker_actions(blockers),
            authority_level=AuthorityLevel.SUGGEST,
        )

    def _handle_velocity_query(self, context: AgentContext) -> AgentResponse:
        """Handle velocity analysis."""
        metrics = self.invoke_skill("retrieve_project_metrics", {
            "project_id": context.project_id,
            "period": "weekly",
        })

        velocity = metrics.result.get("velocity", {})
        current = velocity.get("current", 0)
        average = velocity.get("average", 0)
        trend = velocity.get("trend", "stable")

        trend_emoji = {"increasing": "📈", "stable": "➡️", "declining": "📉"}.get(trend, "❓")

        content = f"""
## 속도 분석

### 현재 스프린트
- 완료 포인트: **{current}**
- 평균 대비: {'+' if current > average else ''}{current - average:.1f}

### 추세 {trend_emoji}
- 5스프린트 평균: **{average:.1f}**
- 추세: **{trend}**

### 분석
{self._analyze_velocity_trend(current, average, trend)}
"""

        return AgentResponse(
            agent_role=self.role,
            content=content,
            confidence=0.85,
            evidence=metrics.evidence,
            actions_taken=[],
            actions_suggested=[],
            authority_level=AuthorityLevel.SUGGEST,
        )

    def _handle_progress_query(self, context: AgentContext) -> AgentResponse:
        """Handle sprint progress query."""
        metrics = self.invoke_skill("retrieve_project_metrics", {
            "project_id": context.project_id,
            "period": "weekly",
        })

        changes = self.invoke_skill("retrieve_recent_changes", {
            "project_id": context.project_id,
            "days": 7,
        })

        summary = metrics.result.get("summary", {})
        completion_rate = metrics.result.get("completion_rate", {})

        content = f"""
## 스프린트 진행 현황

### 태스크 상태
- 완료: {summary.get('completed_tasks', 0)} / {summary.get('total_tasks', 0)}
- 진행 중: {summary.get('in_progress', 0)}
- 차단됨: {summary.get('blocked', 0)}

### 완료율
- 태스크: {completion_rate.get('tasks', 0):.0%}
- 스토리: {completion_rate.get('stories', 0):.0%}

### 최근 변경 (7일)
{self._format_recent_changes(changes.result[:5])}
"""

        return AgentResponse(
            agent_role=self.role,
            content=content,
            confidence=0.9,
            evidence=metrics.evidence + changes.evidence,
            actions_taken=[],
            actions_suggested=[],
            authority_level=AuthorityLevel.SUGGEST,
        )

    def _handle_general_scrum(self, context: AgentContext) -> AgentResponse:
        """Handle general scrum queries."""
        return AgentResponse(
            agent_role=self.role,
            content="스크럼 관련 질문입니다. 구체적으로 블로커, 속도, 진행상황 중 무엇이 궁금하신가요?",
            confidence=0.5,
            evidence=[],
            actions_taken=[],
            actions_suggested=[],
            authority_level=AuthorityLevel.SUGGEST,
        )

    def _format_blockers(self, blockers: list) -> str:
        lines = []
        for b in blockers:
            lines.append(f"🚫 **{b.get('title', 'Untitled')}**")
            lines.append(f"   - 담당: {b.get('assignee', '미정')}")
            lines.append(f"   - 원인: {b.get('blocking_reason', '알 수 없음')}")
            lines.append("")
        return "\n".join(lines)

    def _generate_blocker_recommendations(self, blockers: list) -> str:
        if not blockers:
            return "현재 필요한 조치 없음"

        recommendations = []
        for b in blockers:
            if "외부" in b.get("blocking_reason", ""):
                recommendations.append(f"- {b['title']}: 외부 팀/벤더 연락 필요")
            elif "리뷰" in b.get("blocking_reason", ""):
                recommendations.append(f"- {b['title']}: 코드 리뷰 우선 배정")
            else:
                recommendations.append(f"- {b['title']}: 담당자와 1:1 논의 필요")

        return "\n".join(recommendations)

    def _generate_blocker_actions(self, blockers: list) -> list:
        return [
            {"type": "schedule_meeting", "title": "블로커 해결 미팅", "attendees": list(set(b.get("assignee") for b in blockers if b.get("assignee")))}
        ] if blockers else []

    def _analyze_velocity_trend(self, current: float, average: float, trend: str) -> str:
        if trend == "declining":
            return "⚠️ 속도가 감소 추세입니다. 블로커나 팀 이슈를 점검해보세요."
        elif trend == "increasing":
            return "✅ 속도가 증가 추세입니다. 좋은 흐름을 유지하세요."
        else:
            return "➡️ 속도가 안정적입니다."

    def _format_recent_changes(self, changes: list) -> str:
        if not changes:
            return "최근 변경 없음"

        lines = []
        for c in changes:
            emoji = {"task_completed": "✅", "task_created": "➕", "status_changed": "🔄"}.get(c.get("type"), "📝")
            lines.append(f"{emoji} {c.get('title', 'Unknown')}")
        return "\n".join(lines)
```

### 1.5 Reporter Agent

**파일:** `llm-service/agents/reporter_agent.py`

```python
from typing import Dict, Any
from .base_agent import BaseAgent, AgentRole, AgentContext, AgentResponse
from authority_classifier import AuthorityLevel
from workflows.weekly_report_workflow import create_weekly_report_workflow

class ReporterAgent(BaseAgent):
    """Agent responsible for report generation."""

    role = AgentRole.REPORTER
    max_authority = AuthorityLevel.EXECUTE
    allowed_skills = [
        "retrieve_project_metrics",
        "retrieve_recent_changes",
        "retrieve_open_issues",
        "summarize_progress",
        "detect_risks",
        "compose_report_section",
        "generate_action_items",
    ]
    description = "Generates project reports, summaries, and executive briefings"

    def can_handle(self, context: AgentContext) -> bool:
        """Check if request is report-related."""
        report_keywords = [
            "report", "summary", "briefing", "status update", "weekly",
            "monthly", "dashboard", "overview",
            "보고", "요약", "브리핑", "현황", "주간", "월간"
        ]
        request_text = context.request.get("query", "").lower()
        return any(kw in request_text for kw in report_keywords)

    def process(self, context: AgentContext) -> AgentResponse:
        """Process a report request."""
        query = context.request.get("query", "")

        if "weekly" in query.lower() or "주간" in query:
            return self._generate_weekly_report(context)
        elif "summary" in query.lower() or "요약" in query:
            return self._generate_summary(context)
        else:
            return self._generate_status_update(context)

    def _generate_weekly_report(self, context: AgentContext) -> AgentResponse:
        """Generate a full weekly report using the workflow."""
        # Use the weekly report workflow
        workflow = create_weekly_report_workflow()

        # Prepare initial state
        initial_state = {
            "trace_id": context.trace_id,
            "workflow_type": "weekly_report",
            "project_id": context.project_id,
            "user_id": context.user_id,
            "user_role": context.user_role,
            "original_query": context.request.get("query", ""),
            "intent": "generate_weekly_report",
            "authority_level": "execute",
            "requires_approval": False,
            "project_context": context.project_state,
            "rag_results": [],
            "db_results": [],
            "evidence": [],
            "confidence": 0.0,
        }

        # Run workflow
        final_state = workflow.invoke(initial_state)

        return AgentResponse(
            agent_role=self.role,
            content=final_state.get("report_draft", "Report generation failed"),
            confidence=final_state.get("confidence", 0.0),
            evidence=final_state.get("evidence", []),
            actions_taken=[{"type": "report_generated", "report_type": "weekly"}],
            actions_suggested=[
                {"type": "review_report", "description": "보고서 검토 후 배포"},
                {"type": "schedule_distribution", "description": "이해관계자에게 배포"}
            ],
            authority_level=AuthorityLevel.EXECUTE,
            metadata={
                "report_quality_score": final_state.get("report_quality_score", 0),
                "workflow_status": final_state.get("status", "unknown"),
            }
        )

    def _generate_summary(self, context: AgentContext) -> AgentResponse:
        """Generate a quick project summary."""
        metrics = self.invoke_skill("retrieve_project_metrics", {
            "project_id": context.project_id,
            "period": "weekly",
        })

        changes = self.invoke_skill("retrieve_recent_changes", {
            "project_id": context.project_id,
            "days": 7,
        })

        summary = self.invoke_skill("summarize_progress", {
            "metrics": metrics.result,
            "changes": changes.result,
        })

        return AgentResponse(
            agent_role=self.role,
            content=summary.result.get("content", ""),
            confidence=summary.confidence,
            evidence=metrics.evidence + changes.evidence,
            actions_taken=[],
            actions_suggested=[],
            authority_level=AuthorityLevel.SUGGEST,
        )

    def _generate_status_update(self, context: AgentContext) -> AgentResponse:
        """Generate a brief status update."""
        metrics = self.invoke_skill("retrieve_project_metrics", {
            "project_id": context.project_id,
            "period": "weekly",
        })

        summary = metrics.result.get("summary", {})
        kpis = metrics.result.get("kpis", {})

        content = f"""
## 프로젝트 현황 요약

- **완료율**: {summary.get('completed_tasks', 0)}/{summary.get('total_tasks', 0)} 태스크
- **정시 납기율**: {kpis.get('on_time_delivery', 0):.0%}
- **진행 중**: {summary.get('in_progress', 0)}건
- **블로커**: {summary.get('blocked', 0)}건
"""

        return AgentResponse(
            agent_role=self.role,
            content=content,
            confidence=0.9,
            evidence=metrics.evidence,
            actions_taken=[],
            actions_suggested=[],
            authority_level=AuthorityLevel.SUGGEST,
        )
```

### 1.6 Orchestrator Agent

**파일:** `llm-service/agents/orchestrator_agent.py`

```python
from typing import Dict, Any, List, Optional
from .base_agent import BaseAgent, AgentRole, AgentContext, AgentResponse
from authority_classifier import AuthorityLevel, AuthorityClassifier

class OrchestratorAgent(BaseAgent):
    """Agent responsible for routing requests and coordinating other agents."""

    role = AgentRole.ORCHESTRATOR
    max_authority = AuthorityLevel.DECIDE
    allowed_skills = []  # Orchestrator doesn't use skills directly
    description = "Routes requests to appropriate agents and coordinates multi-agent workflows"

    def __init__(self, skill_registry, llm_client, agent_pool: Dict[AgentRole, BaseAgent]):
        super().__init__(skill_registry, llm_client)
        self.agent_pool = agent_pool
        self.authority_classifier = AuthorityClassifier()

    def can_handle(self, context: AgentContext) -> bool:
        """Orchestrator can handle any request."""
        return True

    def process(self, context: AgentContext) -> AgentResponse:
        """Route request to appropriate agent(s)."""
        # 1. Classify the request
        classification = self._classify_request(context)

        # 2. Select agent(s)
        selected_agents = self._select_agents(classification, context)

        if not selected_agents:
            return self._handle_no_agent(context)

        # 3. Execute with selected agent(s)
        if len(selected_agents) == 1:
            return self._execute_single_agent(selected_agents[0], context)
        else:
            return self._execute_multi_agent(selected_agents, context)

    def _classify_request(self, context: AgentContext) -> Dict[str, Any]:
        """Classify the incoming request."""
        query = context.request.get("query", "")

        # Simple keyword-based classification
        classifications = {
            "planning": ["plan", "sprint", "schedule", "capacity", "계획", "스프린트"],
            "scrum": ["velocity", "blocker", "progress", "standup", "속도", "블로커", "진행"],
            "reporting": ["report", "summary", "briefing", "보고", "요약"],
            "knowledge": ["document", "decision", "policy", "문서", "결정", "정책"],
            "risk": ["risk", "quality", "trace", "리스크", "품질", "추적"],
        }

        detected = []
        for category, keywords in classifications.items():
            if any(kw in query.lower() for kw in keywords):
                detected.append(category)

        return {
            "categories": detected if detected else ["general"],
            "query": query,
            "confidence": 0.8 if detected else 0.5,
        }

    def _select_agents(
        self,
        classification: Dict[str, Any],
        context: AgentContext
    ) -> List[BaseAgent]:
        """Select appropriate agents based on classification."""
        category_to_role = {
            "planning": AgentRole.PLANNER,
            "scrum": AgentRole.SCRUM_MASTER,
            "reporting": AgentRole.REPORTER,
            "knowledge": AgentRole.KNOWLEDGE_CURATOR,
            "risk": AgentRole.RISK_QUALITY,
        }

        selected = []
        for category in classification["categories"]:
            role = category_to_role.get(category)
            if role and role in self.agent_pool:
                agent = self.agent_pool[role]
                if agent.can_handle(context):
                    selected.append(agent)

        # Deduplicate
        return list({a.role: a for a in selected}.values())

    def _execute_single_agent(
        self,
        agent: BaseAgent,
        context: AgentContext
    ) -> AgentResponse:
        """Execute with a single agent."""
        response = agent.process(context)

        # Check for handoff
        if response.requires_handoff and response.handoff_to:
            if response.handoff_to in self.agent_pool:
                # Update context with partial results
                context.shared_memory["handoff_from"] = agent.role.value
                context.shared_memory["partial_result"] = response.metadata.get("partial_result")

                handoff_agent = self.agent_pool[response.handoff_to]
                return handoff_agent.process(context)

        # Wrap response with orchestrator metadata
        response.metadata["orchestrated_by"] = self.role.value
        response.metadata["routing_decision"] = agent.role.value

        return response

    def _execute_multi_agent(
        self,
        agents: List[BaseAgent],
        context: AgentContext
    ) -> AgentResponse:
        """Execute with multiple agents and combine results."""
        responses = []

        for agent in agents:
            try:
                response = agent.process(context)
                responses.append(response)
            except Exception as e:
                responses.append(AgentResponse(
                    agent_role=agent.role,
                    content=f"Error from {agent.role.value}: {str(e)}",
                    confidence=0.0,
                    evidence=[],
                    actions_taken=[],
                    actions_suggested=[],
                    authority_level=AuthorityLevel.SUGGEST,
                ))

        # Combine responses
        combined_content = self._combine_responses(responses)
        combined_evidence = [e for r in responses for e in r.evidence]
        combined_actions = [a for r in responses for a in r.actions_suggested]
        avg_confidence = sum(r.confidence for r in responses) / len(responses)

        return AgentResponse(
            agent_role=self.role,
            content=combined_content,
            confidence=avg_confidence,
            evidence=combined_evidence,
            actions_taken=[],
            actions_suggested=combined_actions,
            authority_level=AuthorityLevel.SUGGEST,
            metadata={
                "agents_used": [r.agent_role.value for r in responses],
                "individual_confidences": {r.agent_role.value: r.confidence for r in responses},
            }
        )

    def _combine_responses(self, responses: List[AgentResponse]) -> str:
        """Combine multiple agent responses."""
        sections = []

        for response in responses:
            if response.content and response.confidence > 0:
                sections.append(f"### {response.agent_role.value.replace('_', ' ').title()} Analysis\n{response.content}")

        return "\n\n---\n\n".join(sections)

    def _handle_no_agent(self, context: AgentContext) -> AgentResponse:
        """Handle case when no agent can handle the request."""
        return AgentResponse(
            agent_role=self.role,
            content="죄송합니다. 이 요청을 처리할 수 있는 적절한 에이전트를 찾지 못했습니다. 질문을 더 구체적으로 해주시겠어요?",
            confidence=0.3,
            evidence=[],
            actions_taken=[],
            actions_suggested=[],
            authority_level=AuthorityLevel.SUGGEST,
        )
```

### 1.7 Agent Pool 초기화

**파일:** `llm-service/agents/__init__.py`

```python
from typing import Dict
from .base_agent import AgentRole, BaseAgent
from .planner_agent import PlannerAgent
from .scrum_master_agent import ScrumMasterAgent
from .reporter_agent import ReporterAgent
from .orchestrator_agent import OrchestratorAgent
from skills.registry import SkillRegistry

def initialize_agent_pool(
    skill_registry: SkillRegistry,
    llm_client
) -> Dict[AgentRole, BaseAgent]:
    """Initialize all agents and return the pool."""

    # Create individual agents
    planner = PlannerAgent(skill_registry, llm_client)
    scrum_master = ScrumMasterAgent(skill_registry, llm_client)
    reporter = ReporterAgent(skill_registry, llm_client)
    # Add more agents as implemented

    # Create pool without orchestrator
    agent_pool = {
        AgentRole.PLANNER: planner,
        AgentRole.SCRUM_MASTER: scrum_master,
        AgentRole.REPORTER: reporter,
    }

    # Create orchestrator with pool reference
    orchestrator = OrchestratorAgent(skill_registry, llm_client, agent_pool)
    agent_pool[AgentRole.ORCHESTRATOR] = orchestrator

    return agent_pool
```

---

## 2. MCP Gateway Architecture

### 2.1 개요

MCP (Model Context Protocol) Gateway는 모든 도구 호출을 표준화하고 관리합니다.

```
[Agent/Workflow] → [MCP Gateway] → [MCP Registry] → [Tool Execution]
                        │
                        ├── Rate Limiting
                        ├── Secret Management
                        ├── Tenant Isolation
                        ├── Cost Tracking
                        └── Observability
```

### 2.2 MCP Tool Definition

**파일:** `llm-service/mcp/tool_definition.py`

```python
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum
from abc import ABC, abstractmethod

class ToolCategory(Enum):
    DATABASE = "database"       # DB operations
    EXTERNAL_API = "external"   # External service calls
    LLM = "llm"                 # LLM invocations
    INTERNAL = "internal"       # Internal computations
    FILE = "file"               # File operations

@dataclass
class ToolCapability:
    """Describes what a tool can do."""
    read: bool = False
    write: bool = False
    delete: bool = False
    execute: bool = False

@dataclass
class ToolSLA:
    """Service Level Agreement for a tool."""
    max_latency_ms: int = 5000
    availability_percent: float = 99.0
    max_retries: int = 3
    timeout_ms: int = 30000

@dataclass
class ToolCost:
    """Cost information for a tool."""
    per_call: float = 0.0
    per_token: float = 0.0
    currency: str = "USD"

@dataclass
class ToolSchema:
    """Schema definition for a tool."""
    name: str
    version: str
    description: str
    category: ToolCategory
    capability: ToolCapability
    sla: ToolSLA
    cost: ToolCost

    # Input/Output schemas (JSON Schema format)
    input_schema: Dict[str, Any] = field(default_factory=dict)
    output_schema: Dict[str, Any] = field(default_factory=dict)

    # Access control
    required_roles: List[str] = field(default_factory=list)
    tenant_scoped: bool = True

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "version": self.version,
            "description": self.description,
            "category": self.category.value,
            "capability": {
                "read": self.capability.read,
                "write": self.capability.write,
                "delete": self.capability.delete,
                "execute": self.capability.execute,
            },
            "sla": {
                "max_latency_ms": self.sla.max_latency_ms,
                "availability_percent": self.sla.availability_percent,
            },
            "cost": {
                "per_call": self.cost.per_call,
                "per_token": self.cost.per_token,
            },
            "input_schema": self.input_schema,
            "output_schema": self.output_schema,
        }


class MCPTool(ABC):
    """Base class for MCP tools."""

    schema: ToolSchema

    @abstractmethod
    def execute(self, input: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the tool."""
        pass

    @abstractmethod
    def validate_input(self, input: Dict[str, Any]) -> bool:
        """Validate input against schema."""
        pass
```

### 2.3 MCP Registry Database Schema

MCP Registry는 6개의 핵심 엔티티로 구성됩니다.

#### 2.3.1 DB 스키마

**파일:** `V20260201__mcp_registry_tables.sql`

```sql
-- MCP Package: 도구 패키지 정의
CREATE TABLE ai.mcp_packages (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(255),
    description TEXT,
    category VARCHAR(50) NOT NULL,  -- database, external, llm, internal, file
    owner VARCHAR(100),
    repository_url VARCHAR(500),
    documentation_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'active',  -- active, deprecated, archived
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- MCP Version: 패키지 버전 관리
CREATE TABLE ai.mcp_versions (
    id BIGSERIAL PRIMARY KEY,
    package_id BIGINT NOT NULL REFERENCES ai.mcp_packages(id),
    version VARCHAR(50) NOT NULL,
    semver_major INTEGER NOT NULL,
    semver_minor INTEGER NOT NULL,
    semver_patch INTEGER NOT NULL,
    changelog TEXT,
    release_notes TEXT,
    min_compatible_version VARCHAR(50),
    deprecated_at TIMESTAMP,
    deprecation_reason TEXT,
    successor_version_id BIGINT REFERENCES ai.mcp_versions(id),
    published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(package_id, version)
);

-- MCP Capability: 도구 기능 정의
CREATE TABLE ai.mcp_capabilities (
    id BIGSERIAL PRIMARY KEY,
    version_id BIGINT NOT NULL REFERENCES ai.mcp_versions(id),
    capability_name VARCHAR(100) NOT NULL,
    description TEXT,
    input_schema JSONB NOT NULL,
    output_schema JSONB NOT NULL,
    can_read BOOLEAN DEFAULT FALSE,
    can_write BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    can_execute BOOLEAN DEFAULT FALSE,
    required_roles TEXT[],  -- array of role names
    tenant_scoped BOOLEAN DEFAULT TRUE,
    project_scoped BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(version_id, capability_name)
);

-- MCP Policy: 도구 사용 정책
CREATE TABLE ai.mcp_policies (
    id BIGSERIAL PRIMARY KEY,
    capability_id BIGINT NOT NULL REFERENCES ai.mcp_capabilities(id),
    policy_type VARCHAR(50) NOT NULL,  -- rate_limit, access_control, data_scope, audit
    policy_name VARCHAR(100) NOT NULL,
    policy_rules JSONB NOT NULL,
    priority INTEGER DEFAULT 0,  -- higher priority rules evaluated first
    enabled BOOLEAN DEFAULT TRUE,
    tenant_id BIGINT,  -- null = global policy
    project_id BIGINT,  -- null = all projects
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- MCP SLA: 서비스 수준 계약
CREATE TABLE ai.mcp_slas (
    id BIGSERIAL PRIMARY KEY,
    capability_id BIGINT NOT NULL REFERENCES ai.mcp_capabilities(id),
    sla_name VARCHAR(100) NOT NULL,
    max_latency_ms INTEGER DEFAULT 5000,
    availability_percent DECIMAL(5,2) DEFAULT 99.00,
    max_retries INTEGER DEFAULT 3,
    retry_delay_ms INTEGER DEFAULT 1000,
    timeout_ms INTEGER DEFAULT 30000,
    circuit_breaker_threshold INTEGER DEFAULT 5,  -- failures before circuit opens
    circuit_breaker_timeout_ms INTEGER DEFAULT 60000,
    priority_level VARCHAR(20) DEFAULT 'normal',  -- low, normal, high, critical
    tenant_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(capability_id, tenant_id, sla_name)
);

-- MCP Telemetry: 도구 호출 메트릭
CREATE TABLE ai.mcp_telemetry (
    id BIGSERIAL PRIMARY KEY,
    capability_id BIGINT NOT NULL REFERENCES ai.mcp_capabilities(id),
    tenant_id BIGINT NOT NULL,
    project_id BIGINT,
    user_id BIGINT,
    trace_id VARCHAR(100),
    span_id VARCHAR(100),
    invocation_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    duration_ms INTEGER NOT NULL,
    success BOOLEAN NOT NULL,
    error_code VARCHAR(50),
    error_message TEXT,
    input_tokens INTEGER,
    output_tokens INTEGER,
    cost_usd DECIMAL(10,6),
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for telemetry queries
CREATE INDEX idx_mcp_telemetry_capability ON ai.mcp_telemetry(capability_id);
CREATE INDEX idx_mcp_telemetry_tenant ON ai.mcp_telemetry(tenant_id);
CREATE INDEX idx_mcp_telemetry_timestamp ON ai.mcp_telemetry(invocation_timestamp);
CREATE INDEX idx_mcp_telemetry_trace ON ai.mcp_telemetry(trace_id);

-- Indexes for policy lookups
CREATE INDEX idx_mcp_policies_capability ON ai.mcp_policies(capability_id);
CREATE INDEX idx_mcp_policies_tenant ON ai.mcp_policies(tenant_id);
CREATE INDEX idx_mcp_policies_type ON ai.mcp_policies(policy_type);
```

#### 2.3.2 MCP Registry Entity Classes

**파일:** `llm-service/mcp/entities.py`

```python
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum

class PackageStatus(Enum):
    ACTIVE = "active"
    DEPRECATED = "deprecated"
    ARCHIVED = "archived"

class PolicyType(Enum):
    RATE_LIMIT = "rate_limit"
    ACCESS_CONTROL = "access_control"
    DATA_SCOPE = "data_scope"
    AUDIT = "audit"

class PriorityLevel(Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class MCPPackage:
    """MCP Package definition."""
    id: int
    name: str
    display_name: str
    description: str
    category: str
    owner: str
    status: PackageStatus = PackageStatus.ACTIVE
    repository_url: Optional[str] = None
    documentation_url: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)

@dataclass
class MCPVersion:
    """MCP Version for a package."""
    id: int
    package_id: int
    version: str
    semver_major: int
    semver_minor: int
    semver_patch: int
    changelog: str = ""
    release_notes: str = ""
    min_compatible_version: Optional[str] = None
    deprecated_at: Optional[datetime] = None
    deprecation_reason: Optional[str] = None
    successor_version_id: Optional[int] = None
    published_at: datetime = field(default_factory=datetime.utcnow)

    @classmethod
    def parse_version(cls, version_str: str) -> tuple:
        """Parse semver string to (major, minor, patch)."""
        parts = version_str.split('.')
        return (
            int(parts[0]) if len(parts) > 0 else 0,
            int(parts[1]) if len(parts) > 1 else 0,
            int(parts[2]) if len(parts) > 2 else 0,
        )

@dataclass
class MCPCapability:
    """MCP Capability (tool function)."""
    id: int
    version_id: int
    capability_name: str
    description: str
    input_schema: Dict[str, Any]
    output_schema: Dict[str, Any]
    can_read: bool = False
    can_write: bool = False
    can_delete: bool = False
    can_execute: bool = False
    required_roles: List[str] = field(default_factory=list)
    tenant_scoped: bool = True
    project_scoped: bool = True

@dataclass
class MCPPolicy:
    """MCP Policy for capability access control."""
    id: int
    capability_id: int
    policy_type: PolicyType
    policy_name: str
    policy_rules: Dict[str, Any]
    priority: int = 0
    enabled: bool = True
    tenant_id: Optional[int] = None
    project_id: Optional[int] = None
    valid_from: datetime = field(default_factory=datetime.utcnow)
    valid_until: Optional[datetime] = None

    def is_active(self) -> bool:
        """Check if policy is currently active."""
        now = datetime.utcnow()
        if not self.enabled:
            return False
        if self.valid_until and now > self.valid_until:
            return False
        return now >= self.valid_from

@dataclass
class MCPSLA:
    """MCP Service Level Agreement."""
    id: int
    capability_id: int
    sla_name: str
    max_latency_ms: int = 5000
    availability_percent: float = 99.0
    max_retries: int = 3
    retry_delay_ms: int = 1000
    timeout_ms: int = 30000
    circuit_breaker_threshold: int = 5
    circuit_breaker_timeout_ms: int = 60000
    priority_level: PriorityLevel = PriorityLevel.NORMAL
    tenant_id: Optional[int] = None

@dataclass
class MCPTelemetry:
    """MCP Telemetry record for a capability invocation."""
    id: int
    capability_id: int
    tenant_id: int
    project_id: Optional[int]
    user_id: Optional[int]
    trace_id: str
    span_id: str
    invocation_timestamp: datetime
    duration_ms: int
    success: bool
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    input_tokens: int = 0
    output_tokens: int = 0
    cost_usd: float = 0.0
    request_size_bytes: int = 0
    response_size_bytes: int = 0
    metadata: Dict[str, Any] = field(default_factory=dict)
```

#### 2.3.3 MCP Registry Service

**파일:** `llm-service/mcp/registry.py`

```python
from typing import Dict, List, Optional
from .entities import (
    MCPPackage, MCPVersion, MCPCapability,
    MCPPolicy, MCPSLA, MCPTelemetry, PackageStatus, PolicyType
)
from .tool_definition import MCPTool, ToolSchema, ToolCategory
import logging

logger = logging.getLogger(__name__)

class MCPRegistry:
    """Registry for MCP tools with full entity management."""

    _instance: Optional['MCPRegistry'] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._packages: Dict[str, MCPPackage] = {}
            cls._instance._versions: Dict[str, List[MCPVersion]] = {}
            cls._instance._capabilities: Dict[int, MCPCapability] = {}
            cls._instance._policies: Dict[int, List[MCPPolicy]] = {}
            cls._instance._slas: Dict[int, MCPSLA] = {}
            cls._instance._tools: Dict[str, MCPTool] = {}
        return cls._instance

    # Package Management
    def register_package(self, package: MCPPackage) -> None:
        """Register a new MCP package."""
        self._packages[package.name] = package
        logger.info(f"Registered MCP package: {package.name}")

    def get_package(self, name: str) -> Optional[MCPPackage]:
        """Get a package by name."""
        return self._packages.get(name)

    def list_packages(self, status: PackageStatus = None) -> List[MCPPackage]:
        """List all packages, optionally filtered by status."""
        packages = list(self._packages.values())
        if status:
            packages = [p for p in packages if p.status == status]
        return packages

    # Version Management
    def register_version(self, version: MCPVersion) -> None:
        """Register a new version for a package."""
        package = self._get_package_by_id(version.package_id)
        if package:
            if package.name not in self._versions:
                self._versions[package.name] = []
            self._versions[package.name].append(version)
            self._versions[package.name].sort(
                key=lambda v: (v.semver_major, v.semver_minor, v.semver_patch),
                reverse=True
            )
            logger.info(f"Registered version {version.version} for {package.name}")

    def get_latest_version(self, package_name: str) -> Optional[MCPVersion]:
        """Get the latest non-deprecated version."""
        versions = self._versions.get(package_name, [])
        for v in versions:
            if not v.deprecated_at:
                return v
        return versions[0] if versions else None

    def get_version(self, package_name: str, version_str: str) -> Optional[MCPVersion]:
        """Get a specific version."""
        versions = self._versions.get(package_name, [])
        for v in versions:
            if v.version == version_str:
                return v
        return None

    # Capability Management
    def register_capability(self, capability: MCPCapability) -> None:
        """Register a capability."""
        self._capabilities[capability.id] = capability
        logger.info(f"Registered capability: {capability.capability_name}")

    def get_capability(self, capability_id: int) -> Optional[MCPCapability]:
        """Get a capability by ID."""
        return self._capabilities.get(capability_id)

    def get_capabilities_for_version(self, version_id: int) -> List[MCPCapability]:
        """Get all capabilities for a version."""
        return [c for c in self._capabilities.values() if c.version_id == version_id]

    # Policy Management
    def register_policy(self, policy: MCPPolicy) -> None:
        """Register a policy for a capability."""
        if policy.capability_id not in self._policies:
            self._policies[policy.capability_id] = []
        self._policies[policy.capability_id].append(policy)
        self._policies[policy.capability_id].sort(key=lambda p: -p.priority)
        logger.info(f"Registered policy: {policy.policy_name}")

    def get_active_policies(
        self,
        capability_id: int,
        tenant_id: int = None,
        policy_type: PolicyType = None
    ) -> List[MCPPolicy]:
        """Get active policies for a capability."""
        policies = self._policies.get(capability_id, [])
        active = [p for p in policies if p.is_active()]

        if tenant_id:
            active = [p for p in active if p.tenant_id is None or p.tenant_id == tenant_id]

        if policy_type:
            active = [p for p in active if p.policy_type == policy_type]

        return active

    # SLA Management
    def register_sla(self, sla: MCPSLA) -> None:
        """Register SLA for a capability."""
        self._slas[sla.capability_id] = sla
        logger.info(f"Registered SLA: {sla.sla_name}")

    def get_sla(self, capability_id: int, tenant_id: int = None) -> Optional[MCPSLA]:
        """Get SLA for a capability, with tenant override."""
        return self._slas.get(capability_id)

    # Tool Registration (for backward compatibility)
    def register(self, tool: MCPTool) -> None:
        """Register a tool (legacy method)."""
        name = tool.schema.name
        version = tool.schema.version
        key = f"{name}@{version}"
        self._tools[key] = tool
        logger.info(f"Registered MCP tool: {key}")

    def get(self, name: str, version: str = None) -> Optional[MCPTool]:
        """Get a tool by name and optional version."""
        if version:
            return self._tools.get(f"{name}@{version}")

        # Get latest version
        versions = self._versions.get(name, [])
        if versions:
            return self._tools.get(f"{name}@{versions[0].version}")

        return None

    def list_tools(self, category: ToolCategory = None) -> List[ToolSchema]:
        """List all registered tools."""
        tools = []
        for tool in self._tools.values():
            if category is None or tool.schema.category == category:
                tools.append(tool.schema)
        return tools

    def deprecate(self, name: str, version: str) -> bool:
        """Mark a tool version as deprecated."""
        key = f"{name}@{version}"
        if key in self._tools:
            self._tools[key].schema.deprecated = True
            logger.warning(f"Deprecated MCP tool: {key}")
            return True
        return False

    def _get_package_by_id(self, package_id: int) -> Optional[MCPPackage]:
        """Get package by ID."""
        for p in self._packages.values():
            if p.id == package_id:
                return p
        return None
```

### 2.4 MCP Gateway

**파일:** `llm-service/mcp/gateway.py`

```python
from typing import Dict, Any, Optional
from dataclasses import dataclass
from datetime import datetime
import time
import threading
from collections import defaultdict
import logging

from .registry import MCPRegistry
from .tool_definition import MCPTool
from observability.metrics import metrics
from observability.tracing import tracer

logger = logging.getLogger(__name__)

@dataclass
class RateLimitConfig:
    """Rate limit configuration."""
    requests_per_minute: int = 60
    requests_per_hour: int = 1000
    burst_size: int = 10

@dataclass
class GatewayConfig:
    """Gateway configuration."""
    rate_limits: Dict[str, RateLimitConfig] = None
    default_timeout_ms: int = 30000
    enable_cost_tracking: bool = True
    enable_tenant_isolation: bool = True

class MCPGateway:
    """Gateway for MCP tool invocations."""

    def __init__(self, registry: MCPRegistry, config: GatewayConfig = None):
        self.registry = registry
        self.config = config or GatewayConfig()

        # Rate limiting
        self._rate_counters = defaultdict(lambda: {"minute": 0, "hour": 0, "last_reset": datetime.utcnow()})
        self._rate_lock = threading.Lock()

        # Cost tracking
        self._cost_by_tenant = defaultdict(float)

    def invoke(
        self,
        tool_name: str,
        input: Dict[str, Any],
        context: Dict[str, Any],
        version: str = None
    ) -> Dict[str, Any]:
        """Invoke a tool through the gateway."""
        trace_id = context.get("trace_id", "unknown")
        tenant_id = context.get("tenant_id", "default")
        user_role = context.get("user_role", "unknown")

        # 1. Get tool
        tool = self.registry.get(tool_name, version)
        if not tool:
            return self._error_response(f"Tool not found: {tool_name}", trace_id)

        # 2. Check rate limits
        if not self._check_rate_limit(tenant_id, tool_name):
            return self._error_response("Rate limit exceeded", trace_id)

        # 3. Check access control
        if not self._check_access(tool, user_role):
            return self._error_response("Access denied", trace_id)

        # 4. Tenant isolation
        if self.config.enable_tenant_isolation:
            input = self._inject_tenant_context(input, tenant_id)

        # 5. Execute with tracing
        with tracer.span(f"mcp.{tool_name}") as span:
            span.set_attribute("tool_name", tool_name)
            span.set_attribute("tenant_id", tenant_id)

            start_time = time.time()
            try:
                # Validate input
                if not tool.validate_input(input):
                    return self._error_response("Invalid input", trace_id)

                # Execute
                result = tool.execute(input, context)

                # Track metrics
                duration_ms = (time.time() - start_time) * 1000
                self._track_metrics(tool_name, duration_ms, True, tool.schema.cost)

                # Track cost
                if self.config.enable_cost_tracking:
                    self._track_cost(tenant_id, tool.schema.cost)

                return {
                    "success": True,
                    "result": result,
                    "metadata": {
                        "tool": tool_name,
                        "version": tool.schema.version,
                        "duration_ms": duration_ms,
                        "trace_id": trace_id,
                    }
                }

            except Exception as e:
                duration_ms = (time.time() - start_time) * 1000
                self._track_metrics(tool_name, duration_ms, False, tool.schema.cost)

                logger.error(f"MCP tool error: {tool_name} - {str(e)}")
                return self._error_response(str(e), trace_id)

    def _check_rate_limit(self, tenant_id: str, tool_name: str) -> bool:
        """Check if request is within rate limits."""
        key = f"{tenant_id}:{tool_name}"

        with self._rate_lock:
            counter = self._rate_counters[key]
            now = datetime.utcnow()

            # Reset counters if needed
            if (now - counter["last_reset"]).seconds >= 60:
                counter["minute"] = 0
            if (now - counter["last_reset"]).seconds >= 3600:
                counter["hour"] = 0
                counter["last_reset"] = now

            # Check limits
            limits = self.config.rate_limits or {}
            tool_limits = limits.get(tool_name, RateLimitConfig())

            if counter["minute"] >= tool_limits.requests_per_minute:
                return False
            if counter["hour"] >= tool_limits.requests_per_hour:
                return False

            # Increment counters
            counter["minute"] += 1
            counter["hour"] += 1

            return True

    def _check_access(self, tool: MCPTool, user_role: str) -> bool:
        """Check if user has access to the tool."""
        required_roles = tool.schema.required_roles
        if not required_roles:
            return True
        return user_role in required_roles

    def _inject_tenant_context(self, input: Dict[str, Any], tenant_id: str) -> Dict[str, Any]:
        """Inject tenant context into input."""
        return {
            **input,
            "_tenant_id": tenant_id,
        }

    def _track_metrics(
        self,
        tool_name: str,
        duration_ms: float,
        success: bool,
        cost: Any
    ) -> None:
        """Track tool invocation metrics."""
        metrics.record_latency(f"mcp.{tool_name}", duration_ms)
        metrics.record_success(f"mcp.{tool_name}", success)
        metrics.record_count(f"mcp.invocations.{tool_name}")

    def _track_cost(self, tenant_id: str, cost: Any) -> None:
        """Track cost by tenant."""
        self._cost_by_tenant[tenant_id] += cost.per_call

    def _error_response(self, message: str, trace_id: str) -> Dict[str, Any]:
        """Create an error response."""
        return {
            "success": False,
            "error": message,
            "metadata": {"trace_id": trace_id},
        }

    def get_tenant_costs(self, tenant_id: str) -> float:
        """Get accumulated costs for a tenant."""
        return self._cost_by_tenant.get(tenant_id, 0.0)
```

### 2.5 MCP Tool Implementations

**파일:** `llm-service/mcp/tools/database_tools.py`

```python
from typing import Dict, Any
from mcp.tool_definition import (
    MCPTool, ToolSchema, ToolCategory,
    ToolCapability, ToolSLA, ToolCost
)

class QueryProjectMetricsTool(MCPTool):
    """MCP tool for querying project metrics."""

    schema = ToolSchema(
        name="query_project_metrics",
        version="1.0.0",
        description="Query project metrics from the database",
        category=ToolCategory.DATABASE,
        capability=ToolCapability(read=True),
        sla=ToolSLA(max_latency_ms=1000, availability_percent=99.9),
        cost=ToolCost(per_call=0.001),
        input_schema={
            "type": "object",
            "properties": {
                "project_id": {"type": "string"},
                "metric_types": {"type": "array", "items": {"type": "string"}},
                "period": {"type": "string", "enum": ["daily", "weekly", "monthly"]},
            },
            "required": ["project_id"],
        },
        output_schema={
            "type": "object",
            "properties": {
                "metrics": {"type": "object"},
                "timestamp": {"type": "string"},
            },
        },
        required_roles=["pm", "pmo_head", "admin"],
        tenant_scoped=True,
    )

    def __init__(self, db_connection):
        self.db = db_connection

    def validate_input(self, input: Dict[str, Any]) -> bool:
        return "project_id" in input

    def execute(self, input: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        project_id = input["project_id"]
        tenant_id = input.get("_tenant_id")
        period = input.get("period", "weekly")

        # Execute query with tenant isolation
        metrics = self._query_metrics(project_id, tenant_id, period)

        return {
            "metrics": metrics,
            "timestamp": datetime.utcnow().isoformat(),
        }

    def _query_metrics(self, project_id: str, tenant_id: str, period: str) -> Dict:
        # Implementation
        pass


class UpdateTaskStatusTool(MCPTool):
    """MCP tool for updating task status."""

    schema = ToolSchema(
        name="update_task_status",
        version="1.0.0",
        description="Update the status of a task",
        category=ToolCategory.DATABASE,
        capability=ToolCapability(read=True, write=True),
        sla=ToolSLA(max_latency_ms=500),
        cost=ToolCost(per_call=0.002),
        input_schema={
            "type": "object",
            "properties": {
                "task_id": {"type": "string"},
                "new_status": {"type": "string", "enum": ["todo", "in_progress", "done", "blocked"]},
                "comment": {"type": "string"},
            },
            "required": ["task_id", "new_status"],
        },
        required_roles=["pm", "developer", "qa"],
        tenant_scoped=True,
    )

    def __init__(self, db_connection):
        self.db = db_connection

    def validate_input(self, input: Dict[str, Any]) -> bool:
        return "task_id" in input and "new_status" in input

    def execute(self, input: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        task_id = input["task_id"]
        new_status = input["new_status"]
        comment = input.get("comment", "")
        user_id = context.get("user_id")

        # Update with audit trail
        result = self._update_status(task_id, new_status, comment, user_id)

        return {
            "success": True,
            "task_id": task_id,
            "previous_status": result["previous"],
            "new_status": new_status,
        }

    def _update_status(self, task_id, new_status, comment, user_id) -> Dict:
        # Implementation
        pass
```

---

## 3. Value Metrics System

### 3.1 개요

비즈니스 가치를 측정하여 "좋은 AI"가 아닌 "좋은 PM 결과"로 평가

| Metric Category | 측정 항목 | 목표 |
|-----------------|----------|------|
| **Efficiency** | 보고서 작성 시간 | 50% 감소 |
| | 회의 준비 시간 | 40% 감소 |
| **Quality** | 이슈 누락률 | < 5% |
| | 요구사항 정합성 | > 95% |
| **Adoption** | AI 응답 채택률 | > 70% |
| | 인간 개입 빈도 | < 20% |

### 3.2 Value Metric Collector

**파일:** `llm-service/value_metrics/collector.py`

```python
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
import threading
from collections import defaultdict

class MetricCategory(Enum):
    EFFICIENCY = "efficiency"
    QUALITY = "quality"
    ADOPTION = "adoption"
    COST = "cost"

@dataclass
class ValueMetric:
    """Single value metric."""
    name: str
    category: MetricCategory
    value: float
    unit: str
    timestamp: datetime
    project_id: Optional[str] = None
    user_id: Optional[str] = None
    context: Dict[str, Any] = field(default_factory=dict)

@dataclass
class MetricDefinition:
    """Definition of a value metric."""
    name: str
    category: MetricCategory
    description: str
    unit: str
    target_value: float
    direction: str  # "higher_better" or "lower_better"
    aggregation: str  # "sum", "avg", "count", "p95"

# Metric definitions
METRIC_DEFINITIONS = {
    # Efficiency metrics
    "report_generation_time_saved": MetricDefinition(
        name="report_generation_time_saved",
        category=MetricCategory.EFFICIENCY,
        description="Time saved by AI-generated reports vs manual (minutes)",
        unit="minutes",
        target_value=30,
        direction="higher_better",
        aggregation="sum",
    ),
    "planning_time_saved": MetricDefinition(
        name="planning_time_saved",
        category=MetricCategory.EFFICIENCY,
        description="Time saved by AI sprint planning assistance (minutes)",
        unit="minutes",
        target_value=60,
        direction="higher_better",
        aggregation="sum",
    ),

    # Quality metrics
    "issue_detection_rate": MetricDefinition(
        name="issue_detection_rate",
        category=MetricCategory.QUALITY,
        description="Percentage of issues correctly detected by AI",
        unit="percent",
        target_value=95,
        direction="higher_better",
        aggregation="avg",
    ),
    "false_positive_rate": MetricDefinition(
        name="false_positive_rate",
        category=MetricCategory.QUALITY,
        description="Percentage of false positives in AI alerts",
        unit="percent",
        target_value=5,
        direction="lower_better",
        aggregation="avg",
    ),
    "traceability_score": MetricDefinition(
        name="traceability_score",
        category=MetricCategory.QUALITY,
        description="Requirement-to-backlog traceability score",
        unit="percent",
        target_value=95,
        direction="higher_better",
        aggregation="avg",
    ),

    # Adoption metrics
    "response_adoption_rate": MetricDefinition(
        name="response_adoption_rate",
        category=MetricCategory.ADOPTION,
        description="Percentage of AI suggestions accepted by users",
        unit="percent",
        target_value=70,
        direction="higher_better",
        aggregation="avg",
    ),
    "human_intervention_rate": MetricDefinition(
        name="human_intervention_rate",
        category=MetricCategory.ADOPTION,
        description="Percentage of AI actions requiring human intervention",
        unit="percent",
        target_value=20,
        direction="lower_better",
        aggregation="avg",
    ),
    "escalation_rate": MetricDefinition(
        name="escalation_rate",
        category=MetricCategory.ADOPTION,
        description="Percentage of requests escalated to humans",
        unit="percent",
        target_value=15,
        direction="lower_better",
        aggregation="avg",
    ),

    # Cost metrics
    "cost_per_report": MetricDefinition(
        name="cost_per_report",
        category=MetricCategory.COST,
        description="Average AI cost per generated report",
        unit="USD",
        target_value=0.50,
        direction="lower_better",
        aggregation="avg",
    ),
    "token_efficiency": MetricDefinition(
        name="token_efficiency",
        category=MetricCategory.COST,
        description="Output quality per 1000 tokens",
        unit="score",
        target_value=0.8,
        direction="higher_better",
        aggregation="avg",
    ),
}


class ValueMetricCollector:
    """Collects and aggregates value metrics."""

    def __init__(self, retention_days: int = 90):
        self._metrics: List[ValueMetric] = []
        self._lock = threading.Lock()
        self._retention = timedelta(days=retention_days)

    def record(
        self,
        name: str,
        value: float,
        project_id: str = None,
        user_id: str = None,
        context: Dict[str, Any] = None
    ) -> None:
        """Record a value metric."""
        definition = METRIC_DEFINITIONS.get(name)
        if not definition:
            raise ValueError(f"Unknown metric: {name}")

        metric = ValueMetric(
            name=name,
            category=definition.category,
            value=value,
            unit=definition.unit,
            timestamp=datetime.utcnow(),
            project_id=project_id,
            user_id=user_id,
            context=context or {},
        )

        with self._lock:
            self._metrics.append(metric)
            self._cleanup_old()

    def get_summary(
        self,
        period_days: int = 30,
        project_id: str = None
    ) -> Dict[str, Any]:
        """Get summary of all metrics."""
        cutoff = datetime.utcnow() - timedelta(days=period_days)

        with self._lock:
            filtered = [
                m for m in self._metrics
                if m.timestamp >= cutoff and (project_id is None or m.project_id == project_id)
            ]

        summary = {}
        for name, definition in METRIC_DEFINITIONS.items():
            values = [m.value for m in filtered if m.name == name]

            if not values:
                summary[name] = {
                    "current": None,
                    "target": definition.target_value,
                    "status": "no_data",
                }
                continue

            # Calculate aggregated value
            if definition.aggregation == "sum":
                current = sum(values)
            elif definition.aggregation == "avg":
                current = sum(values) / len(values)
            elif definition.aggregation == "count":
                current = len(values)
            elif definition.aggregation == "p95":
                sorted_values = sorted(values)
                idx = int(len(sorted_values) * 0.95)
                current = sorted_values[min(idx, len(sorted_values) - 1)]
            else:
                current = sum(values) / len(values)

            # Determine status
            if definition.direction == "higher_better":
                status = "on_track" if current >= definition.target_value else "below_target"
            else:
                status = "on_track" if current <= definition.target_value else "above_target"

            summary[name] = {
                "current": current,
                "target": definition.target_value,
                "unit": definition.unit,
                "status": status,
                "sample_count": len(values),
                "category": definition.category.value,
            }

        return summary

    def get_trends(
        self,
        metric_name: str,
        period_days: int = 30,
        granularity: str = "daily"
    ) -> List[Dict[str, Any]]:
        """Get metric trends over time."""
        cutoff = datetime.utcnow() - timedelta(days=period_days)

        with self._lock:
            filtered = [
                m for m in self._metrics
                if m.name == metric_name and m.timestamp >= cutoff
            ]

        # Group by period
        if granularity == "daily":
            grouper = lambda m: m.timestamp.date()
        elif granularity == "weekly":
            grouper = lambda m: m.timestamp.isocalendar()[:2]
        else:
            grouper = lambda m: (m.timestamp.year, m.timestamp.month)

        groups = defaultdict(list)
        for m in filtered:
            groups[grouper(m)].append(m.value)

        # Calculate per-period aggregates
        definition = METRIC_DEFINITIONS.get(metric_name)
        trends = []

        for period, values in sorted(groups.items()):
            if definition.aggregation == "avg":
                agg = sum(values) / len(values)
            else:
                agg = sum(values)

            trends.append({
                "period": str(period),
                "value": agg,
                "count": len(values),
            })

        return trends

    def _cleanup_old(self) -> None:
        """Remove metrics older than retention period."""
        cutoff = datetime.utcnow() - self._retention
        self._metrics = [m for m in self._metrics if m.timestamp >= cutoff]


# Global instance
value_metrics = ValueMetricCollector()
```

### 3.3 Value Dashboard API

**파일:** `llm-service/routes/value_metrics_routes.py`

```python
from flask import Blueprint, jsonify, request
from value_metrics.collector import value_metrics, METRIC_DEFINITIONS, MetricCategory

value_metrics_bp = Blueprint('value_metrics', __name__)

@value_metrics_bp.route('/api/value-metrics/summary', methods=['GET'])
def get_summary():
    """Get value metrics summary."""
    period_days = request.args.get('period_days', 30, type=int)
    project_id = request.args.get('project_id')

    summary = value_metrics.get_summary(period_days, project_id)

    # Group by category
    by_category = {}
    for name, data in summary.items():
        category = data.get("category", "unknown")
        if category not in by_category:
            by_category[category] = {}
        by_category[category][name] = data

    return jsonify({
        "period_days": period_days,
        "project_id": project_id,
        "by_category": by_category,
        "overall_health": calculate_overall_health(summary),
    })

@value_metrics_bp.route('/api/value-metrics/trends/<metric_name>', methods=['GET'])
def get_trends(metric_name: str):
    """Get metric trends."""
    period_days = request.args.get('period_days', 30, type=int)
    granularity = request.args.get('granularity', 'daily')

    trends = value_metrics.get_trends(metric_name, period_days, granularity)

    definition = METRIC_DEFINITIONS.get(metric_name)

    return jsonify({
        "metric": metric_name,
        "definition": {
            "description": definition.description if definition else "",
            "unit": definition.unit if definition else "",
            "target": definition.target_value if definition else None,
        },
        "trends": trends,
    })

@value_metrics_bp.route('/api/value-metrics/definitions', methods=['GET'])
def get_definitions():
    """Get all metric definitions."""
    return jsonify({
        name: {
            "description": d.description,
            "category": d.category.value,
            "unit": d.unit,
            "target": d.target_value,
            "direction": d.direction,
        }
        for name, d in METRIC_DEFINITIONS.items()
    })


def calculate_overall_health(summary: dict) -> dict:
    """Calculate overall system health score."""
    on_track = 0
    total = 0

    for name, data in summary.items():
        if data.get("status") != "no_data":
            total += 1
            if data.get("status") == "on_track":
                on_track += 1

    health_score = (on_track / total * 100) if total > 0 else 0

    if health_score >= 80:
        status = "healthy"
    elif health_score >= 60:
        status = "warning"
    else:
        status = "critical"

    return {
        "score": health_score,
        "status": status,
        "on_track_count": on_track,
        "total_count": total,
    }
```

---

## 4. Semantic Lifecycle Management

### 4.1 개요

온톨로지, 템플릿, Skill, MCP의 버전과 유효범위 관리

### 4.2 Lifecycle Manager

**파일:** `llm-service/lifecycle/manager.py`

```python
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum

class LifecycleStatus(Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    DEPRECATED = "deprecated"
    ARCHIVED = "archived"

class ResourceType(Enum):
    SKILL = "skill"
    WORKFLOW = "workflow"
    MCP_TOOL = "mcp_tool"
    TEMPLATE = "template"
    ONTOLOGY = "ontology"

@dataclass
class VersionedResource:
    """A versioned resource with lifecycle management."""
    resource_id: str
    resource_type: ResourceType
    name: str
    version: str
    status: LifecycleStatus

    # Scope
    tenant_ids: List[str] = field(default_factory=list)  # Empty = global
    project_ids: List[str] = field(default_factory=list)  # Empty = all projects

    # Lifecycle
    created_at: datetime = field(default_factory=datetime.utcnow)
    activated_at: Optional[datetime] = None
    deprecated_at: Optional[datetime] = None
    deprecation_reason: Optional[str] = None
    successor_version: Optional[str] = None

    # Metadata
    description: str = ""
    changelog: str = ""
    tags: List[str] = field(default_factory=list)


class LifecycleManager:
    """Manages lifecycle of versioned resources."""

    def __init__(self):
        self._resources: Dict[str, VersionedResource] = {}
        self._active_versions: Dict[str, str] = {}  # resource_name -> active_version

    def register(self, resource: VersionedResource) -> None:
        """Register a new resource version."""
        key = f"{resource.name}@{resource.version}"
        self._resources[key] = resource

        # If this is the first version or marked active, set as active
        if resource.status == LifecycleStatus.ACTIVE:
            self._active_versions[resource.name] = resource.version

    def activate(self, name: str, version: str) -> bool:
        """Activate a resource version."""
        key = f"{name}@{version}"
        resource = self._resources.get(key)

        if not resource:
            return False

        # Deactivate current active version
        current_active = self._active_versions.get(name)
        if current_active:
            current_key = f"{name}@{current_active}"
            if current_key in self._resources:
                self._resources[current_key].status = LifecycleStatus.DEPRECATED

        # Activate new version
        resource.status = LifecycleStatus.ACTIVE
        resource.activated_at = datetime.utcnow()
        self._active_versions[name] = version

        return True

    def deprecate(
        self,
        name: str,
        version: str,
        reason: str,
        successor_version: str = None
    ) -> bool:
        """Deprecate a resource version."""
        key = f"{name}@{version}"
        resource = self._resources.get(key)

        if not resource:
            return False

        resource.status = LifecycleStatus.DEPRECATED
        resource.deprecated_at = datetime.utcnow()
        resource.deprecation_reason = reason
        resource.successor_version = successor_version

        # Remove from active if this was active
        if self._active_versions.get(name) == version:
            if successor_version:
                self._active_versions[name] = successor_version
            else:
                del self._active_versions[name]

        return True

    def get_active(self, name: str, tenant_id: str = None, project_id: str = None) -> Optional[VersionedResource]:
        """Get the active version of a resource for a given scope."""
        active_version = self._active_versions.get(name)
        if not active_version:
            return None

        resource = self._resources.get(f"{name}@{active_version}")
        if not resource:
            return None

        # Check scope
        if tenant_id and resource.tenant_ids and tenant_id not in resource.tenant_ids:
            return None

        if project_id and resource.project_ids and project_id not in resource.project_ids:
            return None

        return resource

    def get_all_versions(self, name: str) -> List[VersionedResource]:
        """Get all versions of a resource."""
        return [
            r for r in self._resources.values()
            if r.name == name
        ]

    def check_compatibility(self, name: str, version: str) -> Dict[str, Any]:
        """Check compatibility of a version with current system."""
        key = f"{name}@{version}"
        resource = self._resources.get(key)

        if not resource:
            return {"compatible": False, "reason": "Resource not found"}

        if resource.status == LifecycleStatus.ARCHIVED:
            return {"compatible": False, "reason": "Resource is archived"}

        if resource.status == LifecycleStatus.DEPRECATED:
            return {
                "compatible": True,
                "warning": "Resource is deprecated",
                "successor": resource.successor_version,
            }

        return {"compatible": True}


# Global instance
lifecycle_manager = LifecycleManager()
```

---

## 5. Traceability Rules (T1-T6)

### 5.1 개요

프로젝트 전체에서 요구사항-백로그-WBS-산출물 간의 추적성을 보장하는 규칙 집합입니다.

| Rule | 이름 | 목적 |
|------|------|------|
| **T1** | Requirement Coverage | 모든 요구사항이 백로그로 연결 |
| **T2** | Orphan Detection | 연결 없는 고아 항목 감지 |
| **T3** | WBS Alignment | WBS와 백로그 정합성 |
| **T4** | Dependency Consistency | 의존성 일관성 검증 |
| **T5** | Decision Audit | 의사결정 이력 감사 |
| **T6** | Evidence Grounding | 근거 기반 검증 |

### 5.2 Rule Definitions

**파일:** `llm-service/traceability/rules.py`

```python
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from enum import Enum
from abc import ABC, abstractmethod
from datetime import datetime

class RuleSeverity(Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

class RuleStatus(Enum):
    PASS = "pass"
    FAIL = "fail"
    SKIP = "skip"
    ERROR = "error"

@dataclass
class RuleViolation:
    """A single rule violation."""
    rule_id: str
    severity: RuleSeverity
    message: str
    affected_entity: str
    affected_id: str
    details: Dict[str, Any] = field(default_factory=dict)
    suggested_action: Optional[str] = None

@dataclass
class RuleResult:
    """Result of a rule check."""
    rule_id: str
    rule_name: str
    status: RuleStatus
    violations: List[RuleViolation] = field(default_factory=list)
    checked_count: int = 0
    passed_count: int = 0
    execution_time_ms: int = 0
    timestamp: datetime = field(default_factory=datetime.utcnow)

    @property
    def compliance_rate(self) -> float:
        if self.checked_count == 0:
            return 1.0
        return self.passed_count / self.checked_count


class TraceabilityRule(ABC):
    """Base class for traceability rules."""

    rule_id: str
    rule_name: str
    description: str
    severity: RuleSeverity

    @abstractmethod
    def check(self, context: Dict[str, Any]) -> RuleResult:
        """Execute the rule check."""
        pass


# T1: Requirement Coverage Rule
class T1RequirementCoverage(TraceabilityRule):
    """
    T1: 모든 요구사항이 최소 하나의 백로그 항목으로 연결되어야 함.

    검증 대상:
    - Requirement → UserStory/Task 연결
    - 미연결 요구사항 감지
    """
    rule_id = "T1"
    rule_name = "Requirement Coverage"
    description = "Every requirement must be linked to at least one backlog item"
    severity = RuleSeverity.ERROR

    def check(self, context: Dict[str, Any]) -> RuleResult:
        requirements = context.get("requirements", [])
        requirement_links = context.get("requirement_links", [])

        violations = []
        passed = 0
        linked_req_ids = {link["requirement_id"] for link in requirement_links}

        for req in requirements:
            if req["id"] in linked_req_ids:
                passed += 1
            else:
                violations.append(RuleViolation(
                    rule_id=self.rule_id,
                    severity=self.severity,
                    message=f"Requirement '{req['name']}' has no linked backlog items",
                    affected_entity="requirement",
                    affected_id=str(req["id"]),
                    details={"requirement_code": req.get("code"), "status": req.get("status")},
                    suggested_action="Create or link a UserStory/Task for this requirement"
                ))

        return RuleResult(
            rule_id=self.rule_id,
            rule_name=self.rule_name,
            status=RuleStatus.PASS if not violations else RuleStatus.FAIL,
            violations=violations,
            checked_count=len(requirements),
            passed_count=passed
        )


# T2: Orphan Detection Rule
class T2OrphanDetection(TraceabilityRule):
    """
    T2: 상위 항목과 연결되지 않은 고아 항목 감지.

    검증 대상:
    - UserStory without Epic/Feature
    - Task without UserStory
    - WBS Item without WBS Group
    """
    rule_id = "T2"
    rule_name = "Orphan Detection"
    description = "Detect orphan items without parent links"
    severity = RuleSeverity.WARNING

    def check(self, context: Dict[str, Any]) -> RuleResult:
        stories = context.get("user_stories", [])
        tasks = context.get("tasks", [])
        wbs_items = context.get("wbs_items", [])

        violations = []
        checked = 0
        passed = 0

        # Check orphan stories (no epic or feature)
        for story in stories:
            checked += 1
            if not story.get("epic_id") and not story.get("feature_id"):
                violations.append(RuleViolation(
                    rule_id=self.rule_id,
                    severity=RuleSeverity.WARNING,
                    message=f"UserStory '{story.get('title')}' has no parent Epic/Feature",
                    affected_entity="user_story",
                    affected_id=str(story["id"]),
                    suggested_action="Link this story to an Epic or Feature"
                ))
            else:
                passed += 1

        # Check orphan tasks (no story)
        for task in tasks:
            checked += 1
            if not task.get("user_story_id"):
                violations.append(RuleViolation(
                    rule_id=self.rule_id,
                    severity=RuleSeverity.INFO,
                    message=f"Task '{task.get('title')}' has no parent UserStory",
                    affected_entity="task",
                    affected_id=str(task["id"]),
                    suggested_action="Link this task to a UserStory"
                ))
            else:
                passed += 1

        # Check orphan WBS items
        wbs_group_ids = {g["id"] for g in context.get("wbs_groups", [])}
        for item in wbs_items:
            checked += 1
            if item.get("group_id") not in wbs_group_ids:
                violations.append(RuleViolation(
                    rule_id=self.rule_id,
                    severity=RuleSeverity.ERROR,
                    message=f"WBS Item '{item.get('name')}' references invalid group",
                    affected_entity="wbs_item",
                    affected_id=str(item["id"]),
                    suggested_action="Fix or reassign the WBS group reference"
                ))
            else:
                passed += 1

        return RuleResult(
            rule_id=self.rule_id,
            rule_name=self.rule_name,
            status=RuleStatus.PASS if not violations else RuleStatus.FAIL,
            violations=violations,
            checked_count=checked,
            passed_count=passed
        )


# T3: WBS Alignment Rule
class T3WbsAlignment(TraceabilityRule):
    """
    T3: WBS와 백로그 간의 정합성 검증.

    검증 대상:
    - WBS Group ↔ Feature 연결
    - WBS Item ↔ UserStory 연결
    - WBS Task ↔ Task 연결
    """
    rule_id = "T3"
    rule_name = "WBS Alignment"
    description = "WBS items must align with corresponding backlog items"
    severity = RuleSeverity.WARNING

    def check(self, context: Dict[str, Any]) -> RuleResult:
        wbs_groups = context.get("wbs_groups", [])
        wbs_items = context.get("wbs_items", [])
        features = context.get("features", [])
        stories = context.get("user_stories", [])

        violations = []
        checked = 0
        passed = 0

        # Check WBS Group - Feature alignment
        feature_ids = {f["id"] for f in features}
        for group in wbs_groups:
            checked += 1
            linked_feature = group.get("linked_feature_id")
            if linked_feature and linked_feature not in feature_ids:
                violations.append(RuleViolation(
                    rule_id=self.rule_id,
                    severity=RuleSeverity.ERROR,
                    message=f"WBS Group '{group['name']}' links to invalid Feature",
                    affected_entity="wbs_group",
                    affected_id=str(group["id"]),
                    details={"invalid_feature_id": linked_feature}
                ))
            else:
                passed += 1

        # Check WBS Item - Story alignment
        story_ids = {s["id"] for s in stories}
        for item in wbs_items:
            checked += 1
            linked_stories = item.get("linked_story_ids", [])
            invalid = [sid for sid in linked_stories if sid not in story_ids]
            if invalid:
                violations.append(RuleViolation(
                    rule_id=self.rule_id,
                    severity=RuleSeverity.ERROR,
                    message=f"WBS Item '{item['name']}' links to invalid Stories",
                    affected_entity="wbs_item",
                    affected_id=str(item["id"]),
                    details={"invalid_story_ids": invalid}
                ))
            else:
                passed += 1

        return RuleResult(
            rule_id=self.rule_id,
            rule_name=self.rule_name,
            status=RuleStatus.PASS if not violations else RuleStatus.FAIL,
            violations=violations,
            checked_count=checked,
            passed_count=passed
        )


# T4: Dependency Consistency Rule
class T4DependencyConsistency(TraceabilityRule):
    """
    T4: 의존성의 일관성 검증.

    검증 대상:
    - 순환 의존성 감지
    - 완료되지 않은 선행 항목 감지
    - 존재하지 않는 의존성 참조
    """
    rule_id = "T4"
    rule_name = "Dependency Consistency"
    description = "Dependencies must be consistent and acyclic"
    severity = RuleSeverity.ERROR

    def check(self, context: Dict[str, Any]) -> RuleResult:
        tasks = context.get("tasks", [])
        dependencies = context.get("dependencies", [])

        violations = []
        checked = len(dependencies)
        passed = 0

        task_map = {t["id"]: t for t in tasks}

        # Build dependency graph
        graph = {}
        for dep in dependencies:
            from_id = dep["from_id"]
            to_id = dep["to_id"]
            if from_id not in graph:
                graph[from_id] = []
            graph[from_id].append(to_id)

        # Check for invalid references
        for dep in dependencies:
            if dep["from_id"] not in task_map:
                violations.append(RuleViolation(
                    rule_id=self.rule_id,
                    severity=RuleSeverity.ERROR,
                    message=f"Dependency references non-existent task {dep['from_id']}",
                    affected_entity="dependency",
                    affected_id=str(dep.get("id", "unknown"))
                ))
                continue

            if dep["to_id"] not in task_map:
                violations.append(RuleViolation(
                    rule_id=self.rule_id,
                    severity=RuleSeverity.ERROR,
                    message=f"Dependency references non-existent task {dep['to_id']}",
                    affected_entity="dependency",
                    affected_id=str(dep.get("id", "unknown"))
                ))
                continue

            passed += 1

        # Check for cycles
        cycles = self._detect_cycles(graph)
        for cycle in cycles:
            violations.append(RuleViolation(
                rule_id=self.rule_id,
                severity=RuleSeverity.CRITICAL,
                message=f"Circular dependency detected: {' -> '.join(map(str, cycle))}",
                affected_entity="dependency",
                affected_id="cycle",
                details={"cycle_path": cycle}
            ))

        return RuleResult(
            rule_id=self.rule_id,
            rule_name=self.rule_name,
            status=RuleStatus.PASS if not violations else RuleStatus.FAIL,
            violations=violations,
            checked_count=checked,
            passed_count=passed
        )

    def _detect_cycles(self, graph: Dict) -> List[List]:
        """Detect cycles using DFS."""
        visited = set()
        rec_stack = set()
        cycles = []

        def dfs(node, path):
            visited.add(node)
            rec_stack.add(node)
            path.append(node)

            for neighbor in graph.get(node, []):
                if neighbor not in visited:
                    dfs(neighbor, path)
                elif neighbor in rec_stack:
                    cycle_start = path.index(neighbor)
                    cycles.append(path[cycle_start:] + [neighbor])

            path.pop()
            rec_stack.remove(node)

        for node in graph:
            if node not in visited:
                dfs(node, [])

        return cycles


# T5: Decision Audit Rule
class T5DecisionAudit(TraceabilityRule):
    """
    T5: AI 의사결정 이력 감사.

    검증 대상:
    - EXECUTE/COMMIT 액션에 승인 기록
    - 의사결정에 근거(evidence) 연결
    - 의사결정 사유 기록
    """
    rule_id = "T5"
    rule_name = "Decision Audit"
    description = "AI decisions must have proper audit trail"
    severity = RuleSeverity.CRITICAL

    def check(self, context: Dict[str, Any]) -> RuleResult:
        decisions = context.get("ai_decisions", [])

        violations = []
        checked = len(decisions)
        passed = 0

        for decision in decisions:
            issues = []

            # Check EXECUTE/COMMIT have approval
            authority = decision.get("authority_level", "")
            if authority in ["execute", "commit"]:
                if not decision.get("approved_by"):
                    issues.append("Missing approval for EXECUTE/COMMIT action")
                if not decision.get("approved_at"):
                    issues.append("Missing approval timestamp")

            # Check evidence exists
            if not decision.get("evidence_ids") and not decision.get("evidence"):
                issues.append("No evidence linked to decision")

            # Check rationale exists
            if not decision.get("rationale") and not decision.get("reason"):
                issues.append("No rationale provided for decision")

            if issues:
                violations.append(RuleViolation(
                    rule_id=self.rule_id,
                    severity=self.severity,
                    message=f"Decision audit incomplete: {'; '.join(issues)}",
                    affected_entity="ai_decision",
                    affected_id=str(decision.get("id", "unknown")),
                    details={"issues": issues, "authority_level": authority}
                ))
            else:
                passed += 1

        return RuleResult(
            rule_id=self.rule_id,
            rule_name=self.rule_name,
            status=RuleStatus.PASS if not violations else RuleStatus.FAIL,
            violations=violations,
            checked_count=checked,
            passed_count=passed
        )


# T6: Evidence Grounding Rule
class T6EvidenceGrounding(TraceabilityRule):
    """
    T6: AI 응답의 근거 기반 검증.

    검증 대상:
    - 모든 AI 응답에 근거 포함
    - 근거 소스가 유효한지 확인
    - 근거 신뢰도 점수 검증
    """
    rule_id = "T6"
    rule_name = "Evidence Grounding"
    description = "AI responses must be grounded in valid evidence"
    severity = RuleSeverity.ERROR

    MIN_CONFIDENCE = 0.6
    REQUIRED_EVIDENCE_COUNT = 1

    def check(self, context: Dict[str, Any]) -> RuleResult:
        responses = context.get("ai_responses", [])
        valid_sources = set(context.get("valid_evidence_sources", []))

        violations = []
        checked = len(responses)
        passed = 0

        for response in responses:
            issues = []
            evidence = response.get("evidence", [])

            # Check evidence count
            if len(evidence) < self.REQUIRED_EVIDENCE_COUNT:
                issues.append(f"Insufficient evidence (found {len(evidence)}, need {self.REQUIRED_EVIDENCE_COUNT})")

            # Check evidence sources
            for ev in evidence:
                source_id = ev.get("source_id")
                if valid_sources and source_id not in valid_sources:
                    issues.append(f"Invalid evidence source: {source_id}")

            # Check confidence
            confidence = response.get("confidence", 0)
            if confidence < self.MIN_CONFIDENCE:
                issues.append(f"Low confidence ({confidence:.2f} < {self.MIN_CONFIDENCE})")

            if issues:
                violations.append(RuleViolation(
                    rule_id=self.rule_id,
                    severity=self.severity,
                    message=f"Evidence grounding issues: {'; '.join(issues)}",
                    affected_entity="ai_response",
                    affected_id=str(response.get("id", "unknown")),
                    details={
                        "issues": issues,
                        "evidence_count": len(evidence),
                        "confidence": confidence
                    }
                ))
            else:
                passed += 1

        return RuleResult(
            rule_id=self.rule_id,
            rule_name=self.rule_name,
            status=RuleStatus.PASS if not violations else RuleStatus.FAIL,
            violations=violations,
            checked_count=checked,
            passed_count=passed
        )
```

### 5.3 Traceability Checker Service

**파일:** `llm-service/traceability/checker.py`

```python
from typing import Dict, Any, List
from datetime import datetime
from .rules import (
    TraceabilityRule, RuleResult, RuleStatus,
    T1RequirementCoverage, T2OrphanDetection, T3WbsAlignment,
    T4DependencyConsistency, T5DecisionAudit, T6EvidenceGrounding
)
import logging

logger = logging.getLogger(__name__)

class TraceabilityChecker:
    """Service to run traceability rule checks."""

    def __init__(self):
        self._rules: Dict[str, TraceabilityRule] = {}
        self._register_default_rules()

    def _register_default_rules(self):
        """Register all standard traceability rules."""
        rules = [
            T1RequirementCoverage(),
            T2OrphanDetection(),
            T3WbsAlignment(),
            T4DependencyConsistency(),
            T5DecisionAudit(),
            T6EvidenceGrounding(),
        ]
        for rule in rules:
            self._rules[rule.rule_id] = rule

    def register_rule(self, rule: TraceabilityRule) -> None:
        """Register a custom rule."""
        self._rules[rule.rule_id] = rule
        logger.info(f"Registered traceability rule: {rule.rule_id}")

    def check_all(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Run all registered rules."""
        results = []
        start_time = datetime.utcnow()

        for rule_id, rule in self._rules.items():
            try:
                result = rule.check(context)
                results.append(result)
            except Exception as e:
                logger.error(f"Rule {rule_id} failed: {e}")
                results.append(RuleResult(
                    rule_id=rule_id,
                    rule_name=rule.rule_name,
                    status=RuleStatus.ERROR,
                    violations=[],
                    checked_count=0,
                    passed_count=0
                ))

        end_time = datetime.utcnow()

        # Calculate summary
        total_violations = sum(len(r.violations) for r in results)
        critical_violations = sum(
            len([v for v in r.violations if v.severity.value == "critical"])
            for r in results
        )
        overall_compliance = (
            sum(r.passed_count for r in results) /
            max(sum(r.checked_count for r in results), 1)
        )

        return {
            "timestamp": start_time.isoformat(),
            "duration_ms": int((end_time - start_time).total_seconds() * 1000),
            "summary": {
                "total_rules": len(results),
                "passed_rules": len([r for r in results if r.status == RuleStatus.PASS]),
                "failed_rules": len([r for r in results if r.status == RuleStatus.FAIL]),
                "total_violations": total_violations,
                "critical_violations": critical_violations,
                "overall_compliance_rate": overall_compliance,
            },
            "results": [
                {
                    "rule_id": r.rule_id,
                    "rule_name": r.rule_name,
                    "status": r.status.value,
                    "checked_count": r.checked_count,
                    "passed_count": r.passed_count,
                    "compliance_rate": r.compliance_rate,
                    "violations": [
                        {
                            "severity": v.severity.value,
                            "message": v.message,
                            "entity": v.affected_entity,
                            "entity_id": v.affected_id,
                            "suggested_action": v.suggested_action,
                        }
                        for v in r.violations
                    ],
                }
                for r in results
            ],
        }

    def check_single(self, rule_id: str, context: Dict[str, Any]) -> RuleResult:
        """Run a single rule."""
        rule = self._rules.get(rule_id)
        if not rule:
            raise ValueError(f"Unknown rule: {rule_id}")
        return rule.check(context)


# Global instance
traceability_checker = TraceabilityChecker()
```

### 5.4 Traceability API

**파일:** `llm-service/routes/traceability_routes.py`

```python
from flask import Blueprint, jsonify, request
from traceability.checker import traceability_checker
from services.project_service import get_project_context

traceability_bp = Blueprint('traceability', __name__)

@traceability_bp.route('/api/traceability/check', methods=['POST'])
def run_traceability_check():
    """Run all traceability rules for a project."""
    data = request.json
    project_id = data.get('project_id')

    if not project_id:
        return jsonify({"error": "project_id required"}), 400

    # Get project context (requirements, stories, tasks, etc.)
    context = get_project_context(project_id)

    # Run checks
    results = traceability_checker.check_all(context)

    return jsonify(results)

@traceability_bp.route('/api/traceability/check/<rule_id>', methods=['POST'])
def run_single_rule(rule_id: str):
    """Run a single traceability rule."""
    data = request.json
    project_id = data.get('project_id')

    if not project_id:
        return jsonify({"error": "project_id required"}), 400

    context = get_project_context(project_id)

    try:
        result = traceability_checker.check_single(rule_id, context)
        return jsonify({
            "rule_id": result.rule_id,
            "rule_name": result.rule_name,
            "status": result.status.value,
            "compliance_rate": result.compliance_rate,
            "violations": [
                {
                    "severity": v.severity.value,
                    "message": v.message,
                    "entity": v.affected_entity,
                    "entity_id": v.affected_id,
                }
                for v in result.violations
            ],
        })
    except ValueError as e:
        return jsonify({"error": str(e)}), 404

@traceability_bp.route('/api/traceability/rules', methods=['GET'])
def list_rules():
    """List all available traceability rules."""
    rules = []
    for rule_id, rule in traceability_checker._rules.items():
        rules.append({
            "rule_id": rule.rule_id,
            "rule_name": rule.rule_name,
            "description": rule.description,
            "severity": rule.severity.value,
        })
    return jsonify({"rules": rules})
```

---

## 6. 완료 기준

| 항목 | 체크리스트 |
|------|-----------|
| Subagent Pool | ☐ Planner Agent 동작 |
|               | ☐ Scrum Master Agent 동작 |
|               | ☐ Reporter Agent 동작 |
|               | ☐ Orchestrator 라우팅 동작 |
|               | ☐ Agent 간 Handoff 동작 |
| MCP Gateway   | ☐ Tool Registry 동작 |
|               | ☐ Gateway 라우팅 동작 |
|               | ☐ Rate Limiting 동작 |
|               | ☐ Tenant Isolation 동작 |
|               | ☐ Cost Tracking 동작 |
| Value Metrics | ☐ Metric 수집 동작 |
|               | ☐ Summary API 동작 |
|               | ☐ Trends API 동작 |
|               | ☐ Dashboard 연동 |
| Lifecycle     | ☐ Version 관리 동작 |
|               | ☐ Deprecation 동작 |
|               | ☐ Scope 필터링 동작 |
| Traceability  | ☐ T1-T6 Rules 동작 |
|               | ☐ Checker API 동작 |
|               | ☐ Violation Report 생성 |

---

## 7. 통합 테스트 시나리오

### 6.1 End-to-End Workflow

```python
# Test: Complete sprint planning flow
def test_sprint_planning_e2e():
    # 1. User requests sprint planning
    request = {"query": "다음 스프린트 범위 추천해줘", "project_id": "proj-1"}

    # 2. Orchestrator routes to Planner Agent
    orchestrator = get_orchestrator()
    response = orchestrator.process(AgentContext(...))

    # 3. Verify response
    assert response.agent_role == AgentRole.PLANNER
    assert response.confidence >= 0.7
    assert len(response.evidence) > 0

    # 4. Check metrics recorded
    summary = value_metrics.get_summary(period_days=1)
    assert "planning_time_saved" in summary

    # 5. Check MCP calls tracked
    assert gateway.get_tenant_costs("tenant-1") > 0
```

---

## 8. 다음 단계

Phase 3 완료 후:
- 실제 사용자 피드백 수집 및 반영
- A/B 테스트 프레임워크 구축
- 자동 튜닝 시스템 (메트릭 기반 파라미터 조정)
- 멀티테넌트 확장
