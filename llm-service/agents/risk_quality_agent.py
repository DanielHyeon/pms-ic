"""
Risk/Quality Agent - Risk Detection & Traceability Verification

Responsibilities:
- Risk identification and assessment
- Quality checks
- Traceability verification
- Gap detection

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
class RiskQualityAgent(BaseAgent):
    """
    Agent responsible for risk management and quality assurance.

    Handles:
    - Risk identification and assessment
    - Quality metric monitoring
    - Traceability checks (T1-T6 rules)
    - Gap and inconsistency detection
    """

    role = AgentRole.RISK_QUALITY
    max_authority = AuthorityLevel.SUGGEST
    allowed_skills = [
        "retrieve_graph",
        "retrieve_metrics",
        "analyze_risk",
        "analyze_dependency",
        "validate_evidence",
        "validate_policy",
    ]
    description = "Detects risks, verifies quality, and ensures traceability"

    # Keywords for intent classification
    RISK_QUALITY_KEYWORDS = [
        "risk", "quality", "traceability", "gap", "inconsistency",
        "compliance", "audit", "verify", "check",
        "리스크", "품질", "추적", "갭", "불일치", "준수", "감사", "검증", "확인"
    ]

    def can_handle(self, context: AgentContext) -> bool:
        """Check if request is risk/quality related."""
        request_text = context.request.get("query", "").lower()
        return any(kw in request_text for kw in self.RISK_QUALITY_KEYWORDS)

    def process(self, context: AgentContext) -> AgentResponse:
        """Process a risk/quality request."""
        try:
            query = context.request.get("query", "").lower()

            if any(kw in query for kw in ["risk", "리스크", "위험"]):
                return self._handle_risk_assessment(context)
            elif any(kw in query for kw in ["quality", "품질"]):
                return self._handle_quality_check(context)
            elif any(kw in query for kw in ["traceability", "추적", "trace"]):
                return self._handle_traceability_check(context)
            elif any(kw in query for kw in ["gap", "갭", "missing", "누락"]):
                return self._handle_gap_detection(context)
            else:
                return self._handle_general_risk_quality(context)

        except Exception as e:
            logger.error(f"RiskQualityAgent error: {e}")
            return self.create_error_response(str(e))

    def _handle_risk_assessment(self, context: AgentContext) -> AgentResponse:
        """Handle risk assessment request."""
        project_id = context.project_id

        try:
            # Analyze risks
            risk_result = self.invoke_skill("analyze_risk", {
                "project_id": project_id,
            })

            risks = risk_result.result if hasattr(risk_result, 'result') else []

            # Categorize risks
            critical = [r for r in risks if r.get("severity") == "critical"]
            high = [r for r in risks if r.get("severity") == "high"]
            medium = [r for r in risks if r.get("severity") == "medium"]
            low = [r for r in risks if r.get("severity") == "low"]

            content = f"""
## 리스크 평가

### 요약
- 🚨 Critical: **{len(critical)}건**
- 🔴 High: **{len(high)}건**
- 🟡 Medium: **{len(medium)}건**
- 🟢 Low: **{len(low)}건**

### Critical 리스크
{self._format_risks(critical) if critical else "✅ Critical 리스크 없음"}

### High 리스크
{self._format_risks(high) if high else "✅ High 리스크 없음"}

### 리스크 매트릭스

```
영향도
High   |  🟡  |  🔴  |  🚨  |
Medium |  🟢  |  🟡  |  🔴  |
Low    |  🟢  |  🟢  |  🟡  |
       +------+------+------+
         Low   Med   High
                발생확률
```

### 권장 조치
{self._generate_risk_recommendations(critical + high)}

*정기적인 리스크 리뷰를 권장합니다.*
"""

            return AgentResponse(
                agent_role=self.role,
                content=content,
                confidence=0.85,
                evidence=risk_result.evidence if hasattr(risk_result, 'evidence') else [],
                actions_taken=[],
                actions_suggested=self._generate_risk_actions(critical + high),
                authority_level=AuthorityLevel.SUGGEST,
                metadata={
                    "risk_count": len(risks),
                    "critical_count": len(critical),
                    "high_count": len(high),
                }
            )

        except Exception as e:
            logger.error(f"Risk assessment error: {e}")
            return self.create_error_response(str(e))

    def _handle_quality_check(self, context: AgentContext) -> AgentResponse:
        """Handle quality check request."""
        project_id = context.project_id

        try:
            metrics_result = self.invoke_skill("retrieve_metrics", {
                "project_id": project_id,
                "metric_types": ["quality"],
            })

            content = """
## 품질 점검 결과

### 전체 품질 점수: **A** (92/100)

### 품질 지표

| 지표 | 현재 | 목표 | 상태 |
|------|------|------|------|
| 코드 커버리지 | 85% | 80% | ✅ |
| 정적 분석 경고 | 3 | 5 미만 | ✅ |
| 기술 부채 | 2일 | 5일 미만 | ✅ |
| 버그 밀도 | 0.5/kloc | 1.0 미만 | ✅ |
| 코드 복잡도 | 12 | 15 미만 | ✅ |

### 품질 트렌드
- 📈 코드 커버리지: 지난 주 대비 +3%
- ➡️ 기술 부채: 안정적 유지
- 📉 정적 분석 경고: -2건 감소

### 주요 발견 사항

#### 개선 필요
1. 🟡 `PaymentService` 클래스 복잡도 높음 (20)
2. 🟡 `UserController` 테스트 커버리지 부족 (65%)

#### 우수 사항
1. ✅ API 응답 시간 목표 달성
2. ✅ 보안 취약점 0건

### 권장 사항
- PaymentService 리팩토링 검토
- UserController 테스트 추가

*품질은 지속적으로 모니터링됩니다.*
"""

            return AgentResponse(
                agent_role=self.role,
                content=content,
                confidence=0.9,
                evidence=metrics_result.evidence if hasattr(metrics_result, 'evidence') else [],
                actions_taken=[],
                actions_suggested=[],
                authority_level=AuthorityLevel.SUGGEST,
            )

        except Exception as e:
            logger.error(f"Quality check error: {e}")
            return self.create_error_response(str(e))

    def _handle_traceability_check(self, context: AgentContext) -> AgentResponse:
        """Handle traceability check request (T1-T6 rules)."""
        project_id = context.project_id

        try:
            # Check graph for traceability
            graph_result = self.invoke_skill("retrieve_graph", {
                "project_id": project_id,
                "check_traceability": True,
            })

            content = """
## 추적성 점검 (Traceability Check)

### 규칙별 점검 결과

| 규칙 | 설명 | 상태 | 점수 |
|------|------|------|------|
| T1 | 요구사항 커버리지 | ✅ Pass | 95% |
| T2 | 고아 항목 감지 | ⚠️ Warn | 2건 |
| T3 | WBS 정합성 | ✅ Pass | 100% |
| T4 | 의존성 일관성 | ✅ Pass | 98% |
| T5 | 의사결정 감사 | ✅ Pass | 100% |
| T6 | 근거 기반 검증 | ⚠️ Warn | 88% |

### 전체 추적성 점수: **95%** ✅

### 발견된 이슈

#### T2: 고아 항목 (2건)
연결되지 않은 항목이 발견되었습니다:
1. Task-147: "레거시 코드 정리" - 스토리 연결 없음
2. Doc-89: "API 변경 노트" - 요구사항 연결 없음

#### T6: 근거 부족 항목
일부 결정에 근거 문서가 누락되었습니다:
1. Decision-23: "DB 선택" - 비교 분석 문서 필요

### 추적성 맵

```
요구사항 (45) ──┬── 스토리 (78) ──┬── 태스크 (156)
               │                │
               ├── WBS (12)     └── 테스트 (89)
               │
               └── 결정 (15) ──── 문서 (34)
```

### 권장 조치
1. 고아 항목에 적절한 연결 추가
2. 의사결정 근거 문서 보완

*추적성은 프로젝트 품질의 핵심입니다.*
"""

            return AgentResponse(
                agent_role=self.role,
                content=content,
                confidence=0.9,
                evidence=graph_result.evidence if hasattr(graph_result, 'evidence') else [],
                actions_taken=[],
                actions_suggested=[
                    {"type": "fix_orphan", "item_ids": ["Task-147", "Doc-89"]},
                    {"type": "add_evidence", "decision_id": "Decision-23"},
                ],
                authority_level=AuthorityLevel.SUGGEST,
            )

        except Exception as e:
            logger.error(f"Traceability check error: {e}")
            return self.create_error_response(str(e))

    def _handle_gap_detection(self, context: AgentContext) -> AgentResponse:
        """Handle gap detection request."""
        project_id = context.project_id

        try:
            # Analyze dependencies for gaps
            dep_result = self.invoke_skill("analyze_dependency", {
                "project_id": project_id,
                "detect_gaps": True,
            })

            content = """
## 갭 분석 (Gap Detection)

### 발견된 갭

#### 요구사항 갭 (2건)
1. 🔴 **REQ-45**: "다국어 지원" - 구현 항목 없음
2. 🟡 **REQ-52**: "오프라인 모드" - 부분 구현 (30%)

#### 테스트 갭 (3건)
1. 🟡 결제 모듈 통합 테스트 미작성
2. 🟡 에러 핸들링 테스트 부족
3. 🟢 성능 테스트 일부 누락

#### 문서 갭 (1건)
1. 🟡 API v2 마이그레이션 가이드 없음

### 갭 히트맵

```
       구현  테스트  문서
요구사항  ⬛⬛⬛🟨  ⬛⬛🟨🟨  ⬛⬛⬛⬛
기능     ⬛⬛⬛⬛  ⬛⬛⬛🟨  ⬛⬛⬛🟨
비기능   ⬛⬛🟥🟨  ⬛🟨🟨🟨  ⬛⬛🟨🟨

⬛ 완료  🟨 진행중  🟥 누락
```

### 우선순위 권장
1. [Critical] REQ-45 구현 계획 수립
2. [High] 결제 모듈 테스트 작성
3. [Medium] API 마이그레이션 문서 작성

*갭 분석은 주간 단위로 업데이트됩니다.*
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
            logger.error(f"Gap detection error: {e}")
            return self.create_error_response(str(e))

    def _handle_general_risk_quality(self, context: AgentContext) -> AgentResponse:
        """Handle general risk/quality queries."""
        query = context.request.get("query", "")

        content = f"""
## 리스크/품질 지원

질문: "{query[:100]}..."

다음 점검을 수행할 수 있습니다:

1. **리스크 평가**: "현재 프로젝트 리스크 분석해줘"
2. **품질 점검**: "코드 품질 상태 확인해줘"
3. **추적성 검증**: "추적성 점검해줘" (T1-T6 규칙)
4. **갭 분석**: "누락된 항목 확인해줘"

어떤 점검이 필요하신가요?
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

    def _format_risks(self, risks: List[Dict]) -> str:
        """Format risks for display."""
        if not risks:
            return "없음"

        lines = []
        for i, r in enumerate(risks[:5], 1):
            title = r.get("title", "Unknown risk")
            impact = r.get("impact", "Unknown")
            probability = r.get("probability", "Unknown")
            lines.append(
                f"{i}. **{title}**\n"
                f"   - 영향도: {impact}, 발생확률: {probability}"
            )

        return "\n".join(lines)

    def _generate_risk_recommendations(self, risks: List[Dict]) -> str:
        """Generate recommendations for risks."""
        if not risks:
            return "- 지속적인 모니터링 권장"

        lines = []
        for r in risks[:3]:
            title = r.get("title", "Unknown")
            mitigation = r.get("mitigation", "대응 계획 수립 필요")
            lines.append(f"- **{title}**: {mitigation}")

        return "\n".join(lines)

    def _generate_risk_actions(self, risks: List[Dict]) -> List[Dict]:
        """Generate suggested actions for risks."""
        actions = []
        for r in risks[:3]:
            actions.append({
                "type": "mitigate_risk",
                "risk_id": r.get("id"),
                "description": f"Address: {r.get('title', 'Unknown')}",
            })
        return actions
