"""
Status Response Contract

Structured output format for status responses.
Ensures consistent, data-grounded responses with proper metadata.

Reference: docs/STATUS_QUERY_IMPLEMENTATION_PLAN.md
"""

import json
import logging
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Dict, List, Any, Optional

from status_query_executor import StatusQueryResult

logger = logging.getLogger(__name__)


# =============================================================================
# Response Contract
# =============================================================================

@dataclass
class StatusResponseContract:
    """
    Mandatory structure for status responses.

    This contract ensures:
    1. Reference time is always shown (data freshness)
    2. Scope is clearly stated (project/sprint)
    3. All numbers are from DB (not hallucinated)
    4. Missing data is explicitly noted
    """

    # Metadata (always present)
    reference_time: str = ""           # "2026-01-27 15:30 KST"
    scope: str = ""                    # "프로젝트: AI 보험심사, 스프린트: Sprint 5"
    data_source: str = "PostgreSQL"    # Data source identifier

    # Project info
    project_name: Optional[str] = None
    project_status: Optional[str] = None
    project_progress: Optional[int] = None

    # Sprint info
    sprint_name: Optional[str] = None
    sprint_status: Optional[str] = None
    sprint_days_remaining: Optional[int] = None

    # Core metrics
    completion_rate: Optional[float] = None
    total_stories: int = 0
    done_stories: int = 0
    in_progress_stories: int = 0
    story_counts_by_status: Dict[str, int] = field(default_factory=dict)

    # WIP
    wip_count: int = 0
    wip_limit: int = 5
    wip_over_limit: bool = False

    # Lists
    blocked_items: List[Dict] = field(default_factory=list)
    overdue_items: List[Dict] = field(default_factory=list)
    recent_activity: List[Dict] = field(default_factory=list)

    # Summary (LLM generated from data, optional)
    summary: Optional[str] = None

    # Data gaps (what's missing)
    data_gaps: List[str] = field(default_factory=list)

    # Raw data for debugging
    raw_metrics: Dict[str, Any] = field(default_factory=dict)

    def has_data(self) -> bool:
        """Check if any meaningful data is present"""
        return (
            self.total_stories > 0 or
            self.completion_rate is not None or
            bool(self.story_counts_by_status) or
            self.project_name is not None
        )

    def to_text(self) -> str:
        """Convert to natural language response text"""
        lines = []

        # Header with reference time
        lines.append(f"📊 **프로젝트 현황** (기준: {self.reference_time})")
        lines.append(f"📍 {self.scope}")
        lines.append("")

        # Project info
        if self.project_name:
            status_kr = self._translate_status(self.project_status)
            lines.append(f"**프로젝트**: {self.project_name}")
            if self.project_status:
                lines.append(f"  상태: {status_kr}")
            if self.project_progress is not None:
                lines.append(f"  전체 진행률: {self.project_progress}%")
            lines.append("")

        # Sprint info
        if self.sprint_name:
            lines.append(f"**현재 스프린트**: {self.sprint_name}")
            if self.sprint_days_remaining is not None:
                lines.append(f"  남은 기간: {self.sprint_days_remaining}일")
            lines.append("")

        # Completion rate
        if self.completion_rate is not None:
            lines.append(f"**스토리 진행률**: {self.completion_rate:.1f}% ({self.done_stories}/{self.total_stories} 완료)")
        elif self.total_stories > 0:
            lines.append(f"**전체 스토리**: {self.total_stories}건")

        # Status breakdown
        if self.story_counts_by_status:
            status_parts = []
            for status, count in self.story_counts_by_status.items():
                status_kr = self._translate_status(status)
                status_parts.append(f"{status_kr}: {count}")
            lines.append(f"**상태별**: {', '.join(status_parts)}")

        # WIP status
        if self.wip_count > 0 or self.wip_limit > 0:
            wip_status = "⚠️ 초과" if self.wip_over_limit else "✅ 정상"
            lines.append(f"**WIP**: {self.wip_count}/{self.wip_limit} ({wip_status})")

        # Blocked items
        if self.blocked_items:
            lines.append("")
            lines.append(f"🚫 **정체된 항목** ({len(self.blocked_items)}건):")
            for item in self.blocked_items[:3]:
                title = item.get("title", "Unknown")[:40]
                days = item.get("days_stale", 0)
                lines.append(f"  - {title} ({days}일 정체)")

        # Overdue items
        if self.overdue_items:
            lines.append("")
            lines.append(f"⏰ **지연 항목** ({len(self.overdue_items)}건):")
            for item in self.overdue_items[:3]:
                title = item.get("title", "Unknown")[:40]
                sprint = item.get("sprint_name", "")
                lines.append(f"  - {title} (스프린트: {sprint})")

        # Recent activity
        if self.recent_activity:
            lines.append("")
            lines.append(f"📝 **최근 활동** (최근 {len(self.recent_activity)}건):")
            for item in self.recent_activity[:3]:
                title = item.get("title", "Unknown")[:30]
                status = self._translate_status(item.get("status", ""))
                lines.append(f"  - {title} → {status}")

        # Summary (if provided)
        if self.summary:
            lines.append("")
            lines.append(f"💡 **요약**: {self.summary}")

        # Data gaps warning
        if self.data_gaps:
            lines.append("")
            lines.append(f"⚠️ **데이터 부족**: {', '.join(self.data_gaps)}")

        # Footer with data source
        lines.append("")
        lines.append(f"_데이터 출처: {self.data_source}_")

        return "\n".join(lines)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "reference_time": self.reference_time,
            "scope": self.scope,
            "data_source": self.data_source,
            "project": {
                "name": self.project_name,
                "status": self.project_status,
                "progress": self.project_progress,
            },
            "sprint": {
                "name": self.sprint_name,
                "status": self.sprint_status,
                "days_remaining": self.sprint_days_remaining,
            },
            "metrics": {
                "completion_rate": self.completion_rate,
                "total_stories": self.total_stories,
                "done_stories": self.done_stories,
                "in_progress_stories": self.in_progress_stories,
                "story_counts_by_status": self.story_counts_by_status,
                "wip_count": self.wip_count,
                "wip_limit": self.wip_limit,
            },
            "lists": {
                "blocked_items": self.blocked_items,
                "overdue_items": self.overdue_items,
                "recent_activity": self.recent_activity,
            },
            "summary": self.summary,
            "data_gaps": self.data_gaps,
        }

    def to_json(self) -> str:
        """Convert to JSON string"""
        return json.dumps(self.to_dict(), ensure_ascii=False, indent=2)

    def _translate_status(self, status: Optional[str]) -> str:
        """Translate status to Korean"""
        if not status:
            return "알 수 없음"

        translations = {
            # Story statuses
            "IDEA": "아이디어",
            "REFINED": "정제됨",
            "READY": "준비됨",
            "IN_SPRINT": "스프린트 내",
            "IN_PROGRESS": "진행 중",
            "REVIEW": "리뷰 중",
            "DONE": "완료",
            "CANCELLED": "취소됨",
            "BLOCKED": "차단됨",
            # Project statuses
            "PLANNING": "계획 중",
            "ON_HOLD": "보류",
            "COMPLETED": "완료",
            # Sprint statuses
            "PLANNED": "계획됨",
            "ACTIVE": "활성",
        }

        return translations.get(status.upper(), status)


# =============================================================================
# Contract Builder
# =============================================================================

class StatusResponseBuilder:
    """Builds StatusResponseContract from query results"""

    def build(
        self,
        query_result: StatusQueryResult,
        project_id: str,
    ) -> StatusResponseContract:
        """
        Build response contract from query result.

        Args:
            query_result: Result from StatusQueryExecutor
            project_id: Project ID for scope

        Returns:
            StatusResponseContract populated with data
        """
        contract = StatusResponseContract()

        # Set metadata
        contract.reference_time = datetime.now().strftime("%Y-%m-%d %H:%M KST")
        contract.data_source = "PostgreSQL 실시간 조회"

        # Store raw metrics for debugging
        contract.raw_metrics = query_result.to_dict().get("metrics", {})

        # Extract project summary
        project_data = self._get_metric_data(query_result, "project_summary")
        if project_data:
            contract.project_name = project_data.get("name")
            contract.project_status = project_data.get("status")
            contract.project_progress = project_data.get("progress")
            contract.scope = f"프로젝트: {contract.project_name or project_id}"
        else:
            contract.scope = f"프로젝트: {project_id}"
            contract.data_gaps.append("프로젝트 정보 없음")

        # Extract active sprint
        sprint_data = self._get_metric_data(query_result, "active_sprint")
        if sprint_data:
            contract.sprint_name = sprint_data.get("name")
            contract.sprint_status = sprint_data.get("status")
            contract.sprint_days_remaining = sprint_data.get("days_remaining")
            contract.scope += f", 스프린트: {contract.sprint_name}"
        else:
            contract.data_gaps.append("활성 스프린트 없음")

        # Extract completion rate
        completion_data = self._get_metric_data(query_result, "completion_rate")
        if completion_data:
            contract.completion_rate = completion_data.get("rate")
            contract.total_stories = completion_data.get("total", 0)
            contract.done_stories = completion_data.get("done", 0)

        # Extract story counts by status
        counts_data = self._get_metric_data(query_result, "story_counts_by_status")
        if counts_data:
            contract.story_counts_by_status = counts_data
            contract.total_stories = sum(counts_data.values())
            contract.done_stories = counts_data.get("DONE", 0)
            contract.in_progress_stories = counts_data.get("IN_PROGRESS", 0)

        # Extract WIP status
        wip_data = self._get_metric_data(query_result, "wip_status")
        if wip_data:
            contract.wip_count = wip_data.get("wip_count", 0)
            contract.wip_limit = wip_data.get("wip_limit", 5)
            contract.wip_over_limit = wip_data.get("over_limit", False)

        # Extract blocked items
        blocked_data = self._get_metric_data(query_result, "blocked_items")
        if blocked_data:
            contract.blocked_items = blocked_data

        # Extract overdue items
        overdue_data = self._get_metric_data(query_result, "overdue_items")
        if overdue_data:
            contract.overdue_items = overdue_data

        # Extract recent activity
        activity_data = self._get_metric_data(query_result, "recent_activity")
        if activity_data:
            contract.recent_activity = activity_data

        # Check for data completeness
        if contract.total_stories == 0:
            contract.data_gaps.append("등록된 스토리 없음")

        return contract

    def _get_metric_data(
        self,
        query_result: StatusQueryResult,
        metric_name: str,
    ) -> Any:
        """Get data for a specific metric"""
        if metric_name in query_result.metrics:
            result = query_result.metrics[metric_name]
            if result.error is None:
                return result.data
        return None


# =============================================================================
# No Data Response
# =============================================================================

def create_no_data_response(
    project_id: str,
    reason: str = "데이터가 부족합니다",
) -> StatusResponseContract:
    """Create a response contract for when no data is available"""
    contract = StatusResponseContract(
        reference_time=datetime.now().strftime("%Y-%m-%d %H:%M KST"),
        scope=f"프로젝트: {project_id}",
        data_source="PostgreSQL",
        data_gaps=[reason],
    )
    return contract


# =============================================================================
# Singleton Builder
# =============================================================================

_builder: Optional[StatusResponseBuilder] = None


def get_status_response_builder() -> StatusResponseBuilder:
    """Get singleton builder instance"""
    global _builder
    if _builder is None:
        _builder = StatusResponseBuilder()
    return _builder


def build_status_response(
    query_result: StatusQueryResult,
    project_id: str,
) -> StatusResponseContract:
    """Convenience function to build response contract"""
    return get_status_response_builder().build(query_result, project_id)
