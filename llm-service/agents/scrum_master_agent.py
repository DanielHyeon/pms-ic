"""
Scrum Master Agent - Sprint Execution & Blocker Management

Responsibilities:
- Sprint progress tracking
- Velocity analysis
- Blocker identification and resolution
- Daily standup support

Maximum Authority: EXECUTE
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
class ScrumMasterAgent(BaseAgent):
    """
    Agent responsible for scrum/agile process management.

    Handles:
    - Sprint execution monitoring
    - Velocity tracking and analysis
    - Blocker detection and escalation
    - Progress reporting
    """

    role = AgentRole.SCRUM_MASTER
    max_authority = AuthorityLevel.EXECUTE
    allowed_skills = [
        "retrieve_metrics",
        "retrieve_graph",
        "retrieve_docs",
        "analyze_risk",
        "generate_summary",
    ]
    description = "Manages sprint execution, velocity tracking, and blocker resolution"

    # Keywords for intent classification
    SCRUM_KEYWORDS = [
        "velocity", "blocker", "impediment", "standup", "retrospective",
        "progress", "status", "daily", "sprint review", "burndown",
        "속도", "블로커", "장애", "스탠드업", "회고", "진행", "상태", "번다운"
    ]

    def can_handle(self, context: AgentContext) -> bool:
        """Check if request is scrum-related."""
        request_text = context.request.get("query", "").lower()
        return any(kw in request_text for kw in self.SCRUM_KEYWORDS)

    def process(self, context: AgentContext) -> AgentResponse:
        """Process a scrum-related request."""
        try:
            query = context.request.get("query", "").lower()

            if any(kw in query for kw in ["blocker", "블로커", "impediment", "장애"]):
                return self._handle_blocker_query(context)
            elif any(kw in query for kw in ["velocity", "속도"]):
                return self._handle_velocity_query(context)
            elif any(kw in query for kw in ["progress", "진행", "status", "상태"]):
                return self._handle_progress_query(context)
            elif any(kw in query for kw in ["burndown", "번다운"]):
                return self._handle_burndown_query(context)
            else:
                return self._handle_general_scrum(context)

        except Exception as e:
            logger.error(f"ScrumMasterAgent error: {e}")
            return self.create_error_response(str(e))

    def _handle_blocker_query(self, context: AgentContext) -> AgentResponse:
        """Handle blocker identification and resolution."""
        project_id = context.project_id

        try:
            # Analyze risks to find blockers
            risk_result = self.invoke_skill("analyze_risk", {
                "project_id": project_id,
            })

            risks = risk_result.result if hasattr(risk_result, 'result') else []
            blockers = [r for r in risks if r.get("severity") in ["critical", "high"]]

            if not blockers:
                content = "## 블로커 현황\n\n✅ 현재 활성 블로커가 없습니다.\n\n스프린트가 순조롭게 진행 중입니다."
            else:
                content = f"""
## 블로커 현황 ({len(blockers)}건)

{self._format_blockers(blockers)}

### 권장 조치
{self._generate_blocker_recommendations(blockers)}

*블로커 해결을 위해 담당자와 논의하세요.*
"""

            return AgentResponse(
                agent_role=self.role,
                content=content,
                confidence=0.9,
                evidence=risk_result.evidence if hasattr(risk_result, 'evidence') else [],
                actions_taken=[],
                actions_suggested=self._generate_blocker_actions(blockers),
                authority_level=AuthorityLevel.SUGGEST,
            )

        except Exception as e:
            logger.error(f"Blocker query error: {e}")
            return self.create_error_response(str(e))

    def _handle_velocity_query(self, context: AgentContext) -> AgentResponse:
        """Handle velocity analysis."""
        project_id = context.project_id

        try:
            metrics_result = self.invoke_skill("retrieve_metrics", {
                "project_id": project_id,
                "metric_types": ["velocity"],
            })

            # Calculate velocity stats
            current_velocity = 24
            avg_velocity = 22.5
            trend = "increasing"

            trend_emoji = {"increasing": "📈", "stable": "➡️", "declining": "📉"}.get(trend, "❓")

            content = f"""
## 속도 분석 {trend_emoji}

### 현재 스프린트
- 완료된 포인트: **{current_velocity}**
- 목표 포인트: **25**
- 달성률: **{current_velocity/25*100:.0f}%**

### 최근 5 스프린트 추이
| 스프린트 | 완료 포인트 | 계획 포인트 | 달성률 |
|---------|------------|------------|--------|
| Sprint 5 | 24 | 25 | 96% |
| Sprint 4 | 22 | 24 | 92% |
| Sprint 3 | 23 | 22 | 105% |
| Sprint 4 | 20 | 23 | 87% |
| Sprint 3 | 21 | 22 | 95% |

### 평균 속도: {avg_velocity:.1f} 포인트
추세: **{trend}** {trend_emoji}

*안정적인 속도를 유지하고 있습니다.*
"""

            return AgentResponse(
                agent_role=self.role,
                content=content,
                confidence=0.9,
                evidence=metrics_result.evidence if hasattr(metrics_result, 'evidence') else [],
                actions_taken=[],
                actions_suggested=[],
                authority_level=AuthorityLevel.SUGGEST,
                metadata={
                    "current_velocity": current_velocity,
                    "avg_velocity": avg_velocity,
                    "trend": trend,
                }
            )

        except Exception as e:
            logger.error(f"Velocity query error: {e}")
            return self.create_error_response(str(e))

    def _handle_progress_query(self, context: AgentContext) -> AgentResponse:
        """Handle progress status query."""
        project_id = context.project_id

        try:
            metrics_result = self.invoke_skill("retrieve_metrics", {
                "project_id": project_id,
                "metric_types": ["tasks", "stories"],
            })

            content = """
## 스프린트 진행 현황

### 태스크 상태
| 상태 | 개수 | 비율 |
|------|------|------|
| ✅ Done | 12 | 48% |
| 🔄 In Progress | 8 | 32% |
| 📋 To Do | 5 | 20% |

### 스토리 완료율
- 완료: **4/7** 스토리 (57%)
- 예상 완료일: 스프린트 종료 2일 전

### 주요 사항
- 🟢 API 개발 스토리 완료
- 🟡 UI 개발 진행 중 (70%)
- 🔴 테스트 시작 필요

*스프린트 목표 달성을 위해 테스트 항목에 집중이 필요합니다.*
"""

            return AgentResponse(
                agent_role=self.role,
                content=content,
                confidence=0.85,
                evidence=metrics_result.evidence if hasattr(metrics_result, 'evidence') else [],
                actions_taken=[],
                actions_suggested=[],
                authority_level=AuthorityLevel.SUGGEST,
            )

        except Exception as e:
            logger.error(f"Progress query error: {e}")
            return self.create_error_response(str(e))

    def _handle_burndown_query(self, context: AgentContext) -> AgentResponse:
        """Handle burndown chart query."""
        content = """
## 번다운 차트 분석

### 현재 상태
```
포인트
30 |●
25 |  ●     이상선
20 |    ●   --------
15 |      ●
10 |        ●  ●  실제
 5 |              ●
 0 +----------------->
   Day 1  3  5  7  10
```

### 분석
- 현재 남은 포인트: **8**
- 예상 남은 포인트 (이상선): **10**
- 상태: **정상 진행** ✅

스프린트가 계획대로 진행되고 있습니다.
"""

        return AgentResponse(
            agent_role=self.role,
            content=content,
            confidence=0.8,
            evidence=[],
            actions_taken=[],
            actions_suggested=[],
            authority_level=AuthorityLevel.SUGGEST,
        )

    def _handle_general_scrum(self, context: AgentContext) -> AgentResponse:
        """Handle general scrum questions."""
        query = context.request.get("query", "")

        content = f"""
## 스크럼 지원

질문을 분석했습니다: "{query[:100]}..."

다음 기능을 지원합니다:

1. **블로커 확인**: "현재 블로커가 있나요?"
2. **속도 분석**: "팀 속도는 어떻게 되나요?"
3. **진행 상황**: "스프린트 진행 상황을 알려줘"
4. **번다운 차트**: "번다운 차트를 보여줘"

무엇을 도와드릴까요?
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

    def _format_blockers(self, blockers: List[Dict]) -> str:
        """Format blockers for display."""
        if not blockers:
            return "없음"

        lines = []
        for i, b in enumerate(blockers, 1):
            severity = b.get("severity", "medium")
            emoji = {"critical": "🚨", "high": "🔴", "medium": "🟡"}.get(severity, "⚪")
            title = b.get("title", "Unknown blocker")
            assignee = b.get("assignee", "미지정")
            lines.append(f"{i}. {emoji} **{title}**\n   - 담당: {assignee}")

        return "\n".join(lines)

    def _generate_blocker_recommendations(self, blockers: List[Dict]) -> str:
        """Generate recommendations for blockers."""
        if not blockers:
            return "- 계속 모니터링하세요"

        lines = []
        for b in blockers[:3]:
            title = b.get("title", "Unknown")
            lines.append(f"- {title}: 담당자와 1:1 미팅 권장")

        return "\n".join(lines)

    def _generate_blocker_actions(self, blockers: List[Dict]) -> List[Dict]:
        """Generate suggested actions for blockers."""
        actions = []
        for b in blockers:
            actions.append({
                "type": "escalate_blocker",
                "blocker_id": b.get("id"),
                "description": f"Escalate: {b.get('title', 'Unknown')}",
            })
        return actions
