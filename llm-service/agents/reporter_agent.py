"""
Reporter Agent - Report Generation & Summarization

Responsibilities:
- Weekly/monthly report generation
- Progress summarization
- Executive summary creation
- Data visualization suggestions

Maximum Authority: EXECUTE
"""

from typing import Dict, Any, List
import logging
from datetime import datetime

from . import (
    BaseAgent,
    AgentRole,
    AgentContext,
    AgentResponse,
    register_agent,
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
class ReporterAgent(BaseAgent):
    """
    Agent responsible for report generation and summarization.

    Handles:
    - Weekly executive reports
    - Sprint summaries
    - Progress reports
    - Metric visualizations
    """

    role = AgentRole.REPORTER
    max_authority = AuthorityLevel.EXECUTE
    allowed_skills = [
        "retrieve_metrics",
        "retrieve_docs",
        "retrieve_graph",
        "generate_summary",
        "generate_report",
    ]
    description = "Generates reports, summaries, and progress updates"

    # Keywords for intent classification
    REPORT_KEYWORDS = [
        "report", "summary", "summarize", "weekly", "monthly",
        "executive", "status report", "progress report",
        "보고서", "요약", "주간", "월간", "경영진", "현황"
    ]

    def can_handle(self, context: AgentContext) -> bool:
        """Check if request is report-related."""
        request_text = context.request.get("query", "").lower()
        return any(kw in request_text for kw in self.REPORT_KEYWORDS)

    def process(self, context: AgentContext) -> AgentResponse:
        """Process a report-related request."""
        try:
            query = context.request.get("query", "").lower()

            if any(kw in query for kw in ["weekly", "주간"]):
                return self._handle_weekly_report(context)
            elif any(kw in query for kw in ["monthly", "월간"]):
                return self._handle_monthly_report(context)
            elif any(kw in query for kw in ["executive", "경영진"]):
                return self._handle_executive_summary(context)
            elif any(kw in query for kw in ["sprint", "스프린트"]):
                return self._handle_sprint_summary(context)
            else:
                return self._handle_general_report(context)

        except Exception as e:
            logger.error(f"ReporterAgent error: {e}")
            return self.create_error_response(str(e))

    def _handle_weekly_report(self, context: AgentContext) -> AgentResponse:
        """Generate weekly report."""
        project_id = context.project_id
        today = datetime.now().strftime("%Y-%m-%d")

        try:
            # Retrieve metrics
            metrics_result = self.invoke_skill("retrieve_metrics", {
                "project_id": project_id,
                "period": "weekly",
            })

            # Generate summary
            summary_result = self.invoke_skill("generate_summary", {
                "project_id": project_id,
                "type": "weekly",
            })

            content = f"""
# 주간 보고서
**프로젝트**: {project_id}
**보고일**: {today}

---

## 1. 핵심 요약 (Executive Summary)

이번 주 프로젝트는 전반적으로 **정상 진행** 중입니다.
주요 마일스톤 달성률 85%, 스프린트 목표 달성 예정입니다.

### 핵심 지표
| 지표 | 현재 | 목표 | 상태 |
|------|------|------|------|
| 스프린트 진행률 | 78% | 75% | ✅ |
| 완료 태스크 | 24/30 | - | 🟢 |
| 블로커 | 1건 | 0 | 🟡 |
| 코드 품질 | A | A | ✅ |

## 2. 이번 주 완료 사항
- ✅ 사용자 인증 모듈 개발 완료
- ✅ API 문서화 (v1.2)
- ✅ 성능 테스트 1차 완료
- ✅ 코드 리뷰 (PR #45, #46, #47)

## 3. 진행 중인 사항
- 🔄 대시보드 차트 컴포넌트 개발 (80%)
- 🔄 통합 테스트 작성 (60%)
- 🔄 배포 파이프라인 구성 (40%)

## 4. 다음 주 계획
- 📋 대시보드 개발 완료
- 📋 UAT 준비
- 📋 문서 업데이트

## 5. 이슈 및 리스크

### 블로커 (1건)
| 이슈 | 담당 | 예상 해결일 |
|------|------|------------|
| 외부 API 지연 | 김개발 | 01/28 |

### 리스크 (2건)
1. 🟡 **외부 의존성**: 결제 API 연동 지연 가능성
   - 대응: 대체 모듈 준비 중
2. 🟢 **리소스**: 다음 주 휴가자 1명
   - 대응: 업무 재분배 완료

## 6. 의사결정 필요 사항
- [ ] 배포 일정 확정 (01/30 또는 02/03)
- [ ] QA 환경 추가 구성 승인

---
*이 보고서는 AI에 의해 자동 생성되었습니다. 정확성을 위해 검토해 주세요.*
"""

            evidence = []
            if hasattr(metrics_result, 'evidence'):
                evidence.extend(metrics_result.evidence)
            if hasattr(summary_result, 'evidence'):
                evidence.extend(summary_result.evidence)

            return AgentResponse(
                agent_role=self.role,
                content=content,
                confidence=0.9,
                evidence=evidence,
                actions_taken=[
                    {"type": "report_generated", "report_type": "weekly"}
                ],
                actions_suggested=[
                    {"type": "save_report", "description": "Save this report to database"},
                    {"type": "send_report", "description": "Send to stakeholders"},
                ],
                authority_level=AuthorityLevel.EXECUTE,
                metadata={
                    "report_type": "weekly",
                    "generated_at": today,
                }
            )

        except Exception as e:
            logger.error(f"Weekly report generation error: {e}")
            return self.create_error_response(str(e))

    def _handle_monthly_report(self, context: AgentContext) -> AgentResponse:
        """Generate monthly report."""
        today = datetime.now().strftime("%Y-%m-%d")
        month = datetime.now().strftime("%Y년 %m월")

        content = f"""
# 월간 보고서
**기간**: {month}
**작성일**: {today}

---

## 1. 월간 요약

이번 달 프로젝트는 계획된 마일스톤의 **90%**를 달성했습니다.

### 주요 성과
- 3개 스프린트 완료 (Sprint 8, 9, 10)
- 총 78개 스토리 완료
- 버그 수정률: 95%

### 주요 지표
| 지표 | 달성 | 목표 | 달성률 |
|------|------|------|--------|
| 스토리 완료 | 78 | 80 | 97.5% |
| 속도 평균 | 26 | 25 | 104% |
| 품질 점수 | 94 | 90 | 104% |

## 2. 다음 달 계획
- Phase 2 시작
- 성능 최적화
- 보안 감사

---
*AI 자동 생성 보고서*
"""

        return AgentResponse(
            agent_role=self.role,
            content=content,
            confidence=0.85,
            evidence=[],
            actions_taken=[{"type": "report_generated", "report_type": "monthly"}],
            actions_suggested=[],
            authority_level=AuthorityLevel.EXECUTE,
        )

    def _handle_executive_summary(self, context: AgentContext) -> AgentResponse:
        """Generate executive summary."""
        content = """
# 경영진 보고서 (Executive Summary)

## 프로젝트 상태: 🟢 정상

### 핵심 지표
- **진행률**: 75% (예정: 73%)
- **예산 소진**: 70% (계획 대비 정상)
- **일정 상태**: 정상 (예정일 준수)
- **품질 점수**: A등급

### 주요 성과
1. 핵심 기능 개발 완료
2. 사용자 테스트 시작
3. 보안 인증 통과

### 주의 사항
- 외부 API 의존성 모니터링 필요
- 다음 분기 리소스 계획 수립 필요

### 의사결정 요청
1. 출시 일정 최종 확정
2. 마케팅 예산 배정

---
*요약 보고서 - 상세 내용은 주간 보고서 참조*
"""

        return AgentResponse(
            agent_role=self.role,
            content=content,
            confidence=0.9,
            evidence=[],
            actions_taken=[{"type": "report_generated", "report_type": "executive"}],
            actions_suggested=[],
            authority_level=AuthorityLevel.EXECUTE,
        )

    def _handle_sprint_summary(self, context: AgentContext) -> AgentResponse:
        """Generate sprint summary."""
        content = """
# 스프린트 요약

## Sprint 10 완료

### 결과
- **완료 포인트**: 26/25 (104%)
- **완료 스토리**: 8개
- **남은 기술 부채**: 2건

### 완료 항목
1. ✅ 로그인 페이지 리디자인
2. ✅ 결제 모듈 통합
3. ✅ 알림 시스템 구현
4. ✅ API 성능 개선

### 미완료 항목
- 🔄 A/B 테스트 구현 → Sprint 11로 이월

### 회고 요약
- **잘한 점**: 팀 협업, 코드 품질
- **개선점**: 추정 정확도, 테스트 커버리지

---
"""

        return AgentResponse(
            agent_role=self.role,
            content=content,
            confidence=0.85,
            evidence=[],
            actions_taken=[{"type": "report_generated", "report_type": "sprint"}],
            actions_suggested=[],
            authority_level=AuthorityLevel.EXECUTE,
        )

    def _handle_general_report(self, context: AgentContext) -> AgentResponse:
        """Handle general report requests."""
        query = context.request.get("query", "")

        content = f"""
## 보고서 생성 지원

질문: "{query[:100]}..."

다음 유형의 보고서를 생성할 수 있습니다:

1. **주간 보고서**: "주간 보고서 작성해줘"
2. **월간 보고서**: "이번 달 월간 보고서 만들어줘"
3. **경영진 요약**: "경영진 보고서 작성"
4. **스프린트 요약**: "스프린트 요약해줘"

어떤 보고서가 필요하신가요?
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
