"""
Centralized Degradation Tips for Intent Handlers.

Provides context-aware guidance when data is empty, incomplete, or unavailable.
Separates:
- DB failure tips (system issue)
- Empty data tips (user action needed)
- Incomplete data tips (partial information)

Reference: docs/P1_DATA_QUERY_AND_DEGRADATION.md
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from enum import Enum


class DegradationReason(str, Enum):
    """Reason for degradation"""
    DB_FAILURE = "db_failure"           # Database query failed
    DB_TIMEOUT = "db_timeout"           # Query timed out
    EMPTY_DATA = "empty_data"           # No data found (not an error)
    INCOMPLETE_DATA = "incomplete"       # Partial data available
    SCHEMA_MISMATCH = "schema"          # Column doesn't exist
    NO_DUE_DATES = "no_due_dates"       # Tasks exist but no due_date set
    NO_ACTIVE_SPRINT = "no_sprint"      # No active sprint
    NO_RISKS_EXPLICIT = "no_risks"      # No explicit risks registered


@dataclass
class DegradationPlan:
    """Degradation plan with tips and context"""
    reason: DegradationReason
    message: str
    tips: List[str]
    next_actions: List[str] = field(default_factory=list)
    related_menu: Optional[str] = None
    template_example: Optional[str] = None


# =============================================================================
# DB Failure Tips (System Issues)
# =============================================================================

DB_FAILURE_TIPS = {
    "default": DegradationPlan(
        reason=DegradationReason.DB_FAILURE,
        message="데이터베이스에서 정보를 가져올 수 없습니다.",
        tips=[
            "시스템에 일시적인 문제가 발생했을 수 있습니다",
            "잠시 후 다시 시도해 주세요",
            "문제가 지속되면 관리자에게 문의해 주세요",
        ],
        next_actions=[
            "요청 다시 시도",
            "시스템 상태 확인",
        ],
    ),
    "timeout": DegradationPlan(
        reason=DegradationReason.DB_TIMEOUT,
        message="쿼리 실행 시간이 초과되었습니다.",
        tips=[
            "요청이 너무 복잡했을 수 있습니다",
            "더 구체적인 질문을 시도해 보세요",
            "시스템에 부하가 많을 수 있습니다",
        ],
        next_actions=[
            "더 간단한 질문 시도",
            "잠시 기다린 후 재시도",
        ],
    ),
}


# =============================================================================
# Empty Data Tips by Intent
# =============================================================================

EMPTY_DATA_TIPS = {
    "backlog_list": DegradationPlan(
        reason=DegradationReason.EMPTY_DATA,
        message="백로그 항목이 없습니다.",
        tips=[
            "제품 백로그가 현재 비어있습니다",
            "백로그 관리 메뉴에서 새 스토리를 추가할 수 있습니다",
            "백로그 항목은 아직 스프린트에 할당되지 않은 사용자 스토리입니다",
        ],
        next_actions=[
            "백로그 관리에서 '스토리 추가' 클릭",
            "'사용자로서, 나는 [기능]을 원한다...' 형식으로 시작하세요",
            "우선순위(긴급/높음/중간/낮음) 설정",
            "추정을 위한 스토리 포인트 추가(선택)",
        ],
        related_menu="백로그 관리",
        template_example='"보험심사 담당자로서, 나는 문서를 자동 분류하여 처리 속도를 높이고 싶다."',
    ),

    "sprint_progress": DegradationPlan(
        reason=DegradationReason.NO_ACTIVE_SPRINT,
        message="활성 스프린트가 없습니다.",
        tips=[
            "현재 '활성' 상태인 스프린트가 없습니다",
            "진행 상황을 추적하려면 스프린트를 생성하고 시작해야 합니다",
            "스프린트를 활성화해야 하는지 확인하세요",
        ],
        next_actions=[
            "'스프린트 관리'에서 스프린트 생성",
            "백로그에서 새 스프린트로 항목 이동",
            "스프린트 목표 및 시작일 설정",
            "스프린트 상태를 '활성'으로 변경",
        ],
        related_menu="스프린트 관리",
    ),

    "task_due_this_week": DegradationPlan(
        reason=DegradationReason.EMPTY_DATA,
        message="이번 주 마감 태스크가 없습니다.",
        tips=[
            "좋은 소식입니다 - 이번 주 마감 태스크가 없습니다!",
            "또는 태스크에 마감일이 설정되지 않았을 수 있습니다",
            "전체 상태는 태스크 보드에서 확인하세요",
        ],
        next_actions=[
            "태스크 생성 시 마감일 설정",
            "기한 초과 태스크가 있는지 검토",
            "태스크 관리에는 칸반 보드 활용",
        ],
        related_menu="태스크 보드 / 칸반",
    ),

    "task_due_no_due_dates": DegradationPlan(
        reason=DegradationReason.NO_DUE_DATES,
        message="태스크는 있지만 대부분 마감일이 설정되지 않았습니다.",
        tips=[
            "활성 태스크가 있지만 대부분 마감일이 설정되지 않았습니다",
            "마감일 설정은 일정 추적에 도움이 됩니다",
            "중요한 태스크에 마감일을 추가하는 것을 고려하세요",
        ],
        next_actions=[
            "태스크 보드에서 태스크 검토",
            "우선순위가 높은 태스크에 마감일 추가",
            "스프린트 종료일을 마감일 가이드로 활용",
        ],
        related_menu="태스크 보드",
    ),

    "kanban_overview": DegradationPlan(
        reason=DegradationReason.EMPTY_DATA,
        message="칸반 보드 정보가 없습니다.",
        tips=[
            "칸반 보드가 아직 설정되지 않았습니다",
            "프로젝트 설정에서 칸반 보드를 활성화할 수 있습니다",
            "칸반 컬럼은 태스크 워크플로우를 시각화합니다",
        ],
        next_actions=[
            "프로젝트 설정에서 칸반 보드 활성화",
            "기본 컬럼(백로그, 할 일, 진행 중, 검토, 완료) 생성",
            "WIP 제한을 설정하여 병목 방지",
            "태스크를 칸반 컬럼에 배치",
        ],
        related_menu="칸반 보드 설정",
    ),

    "entity_progress": DegradationPlan(
        reason=DegradationReason.EMPTY_DATA,
        message="해당 이름의 WBS 항목을 찾을 수 없습니다.",
        tips=[
            "WBS 항목 이름을 정확하게 입력해 주세요",
            "WBS 구조가 아직 생성되지 않았을 수 있습니다",
            "유사한 이름의 항목이 있는지 확인해 보세요",
        ],
        next_actions=[
            "WBS 관리 화면에서 항목 확인",
            "'WBS 현황 보여줘'로 전체 구조 조회",
        ],
        related_menu="WBS 관리",
    ),

    "risk_analysis": DegradationPlan(
        reason=DegradationReason.NO_RISKS_EXPLICIT,
        message="등록된 활성 리스크가 없습니다.",
        tips=[
            "유형='RISK'인 항목이 없습니다",
            "이슈 관리에서 리스크를 등록할 수 있습니다",
            "리스크 식별 세션을 진행하는 것을 고려하세요",
        ],
        next_actions=[
            "'이슈 관리' 메뉴로 이동",
            "유형 = 'RISK'로 새 이슈 생성",
            "심각도(긴급/높음/중간/낮음) 설정",
            "담당자 및 완화 계획 지정",
            "주간 회의에서 리스크 검토",
        ],
        related_menu="이슈 관리",
        template_example="리스크: '외부 API 의존성으로 지연 발생 가능' | 심각도: 높음 | 완화방안: '대체 메커니즘 구현'",
    ),
}


# =============================================================================
# Helper Functions
# =============================================================================

def get_db_failure_plan(error_type: str = "default") -> DegradationPlan:
    """Get degradation plan for DB failures"""
    return DB_FAILURE_TIPS.get(error_type, DB_FAILURE_TIPS["default"])


def get_empty_data_plan(intent: str) -> DegradationPlan:
    """Get degradation plan for empty data by intent"""
    return EMPTY_DATA_TIPS.get(intent, DegradationPlan(
        reason=DegradationReason.EMPTY_DATA,
        message="데이터를 찾을 수 없습니다.",
        tips=["다른 질문을 시도해 보세요", "데이터가 생성되었는지 확인하세요"],
        next_actions=[],
    ))


def get_tips_for_intent(intent: str, has_data: bool = False, judgment_data: Optional[Dict[str, Any]] = None) -> List[str]:
    """
    Get appropriate tips based on intent and data state.

    Args:
        intent: Intent type (e.g., "backlog_list")
        has_data: Whether query returned data
        judgment_data: Additional context for degradation decisions

    Returns:
        List of actionable tips
    """
    if has_data:
        return []  # No tips needed when data exists

    plan = get_empty_data_plan(intent)

    # Check judgment data for more specific tips
    if judgment_data and intent == "task_due_this_week":
        no_due_date_count = judgment_data.get("no_due_date_count", 0)
        active_tasks_count = judgment_data.get("active_tasks_count", 0)

        if active_tasks_count > 0 and no_due_date_count > active_tasks_count * 0.7:
            # More than 70% of tasks have no due_date
            plan = EMPTY_DATA_TIPS.get("task_due_no_due_dates", plan)

    return plan.tips + plan.next_actions


def format_degradation_response(
    intent: str,
    reason: DegradationReason,
    judgment_data: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Format a complete degradation response.

    Args:
        intent: Intent type
        reason: Why degradation is needed
        judgment_data: Context for decision making

    Returns:
        Dict with message, tips, and template
    """
    if reason in (DegradationReason.DB_FAILURE, DegradationReason.DB_TIMEOUT):
        plan = get_db_failure_plan("timeout" if reason == DegradationReason.DB_TIMEOUT else "default")
    else:
        plan = get_empty_data_plan(intent)

    result = {
        "message": plan.message,
        "tips": plan.tips,
        "next_actions": plan.next_actions,
        "related_menu": plan.related_menu,
    }

    if plan.template_example:
        result["template_example"] = plan.template_example

    return result
