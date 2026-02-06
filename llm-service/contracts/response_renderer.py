"""
Intent-aware response renderer.

IMPORTANT:
- This renders NON-STATUS intents only
- STATUS_METRIC/STATUS_LIST use existing StatusResponseContract.to_text()
- This separation prevents conflicts with existing status logic
- Error detection uses contract.error_code, NOT string matching
"""

import logging
from typing import List
from contracts.response_contract import ResponseContract

logger = logging.getLogger(__name__)


# =============================================================================
# Main Renderer
# =============================================================================

def render(contract: ResponseContract) -> str:
    """
    Render ResponseContract to text based on intent.

    Args:
        contract: ResponseContract with data

    Returns:
        Formatted text for user

    NOTE: STATUS_* intents should NOT reach here.
    They use StatusResponseContract.to_text() directly.
    """
    intent = contract.intent.lower()

    renderers = {
        "backlog_list": render_backlog_list,
        "sprint_progress": render_sprint_progress,
        "task_due_this_week": render_tasks_due_this_week,
        "risk_analysis": render_risk_analysis,
        "completed_tasks": render_completed_tasks,
        "tasks_by_status": render_tasks_by_status,
        "casual": render_casual,
        "status_list": render_status_list,
    }

    renderer = renderers.get(intent, render_default)
    return renderer(contract)


# =============================================================================
# Intent-Specific Renderers
# =============================================================================

def render_backlog_list(contract: ResponseContract) -> str:
    """
    Render backlog list with priority grouping and P1 summary stats.

    P1 Enhancements:
    - Shows summary statistics (total points, priority breakdown)
    - Better handling of empty/degraded states
    """
    lines = []

    # Header (distinct from Project Status - uses different emoji)
    lines.append(f"📋 **제품 백로그** (기준: {contract.reference_time})")
    lines.append(f"📍 {contract.scope}")
    lines.append("")

    # ============================================================
    # CRITICAL (Risk K): Use error_code, NOT string matching
    # ============================================================
    if contract.has_error():
        for warning in contract.warnings:
            lines.append(f"⚠️ {warning}")
        lines.append("")
        _append_tips(lines, contract.tips)
        lines.append(f"_데이터 출처: {contract.provenance}_")
        return "\n".join(lines)

    items = contract.data.get("items", [])
    count = contract.data.get("count", 0)
    summary = contract.data.get("summary", {})

    if items:
        # P1: Summary stats
        total = int(summary.get("total", count) or count)
        total_points = int(summary.get("total_points", 0) or 0)
        critical_count = int(summary.get("critical", 0) or 0)
        high_count = int(summary.get("high", 0) or 0)

        lines.append(f"**전체 항목**: {total}개")
        if total_points > 0:
            lines.append(f"**총 스토리 포인트**: {total_points}")
        if critical_count > 0 or high_count > 0:
            lines.append(f"**우선순위**: 긴급 {critical_count}개, 높음 {high_count}개")
        if contract.data.get("was_limited"):
            lines.append("_(더 많은 항목이 있을 수 있습니다)_")
        lines.append("")

        # Group by priority
        by_priority = {}
        for item in items:
            prio = item.get("priority") or "UNSET"
            if prio not in by_priority:
                by_priority[prio] = []
            by_priority[prio].append(item)

        priority_order = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "UNSET"]
        priority_emoji = {"CRITICAL": "🔴", "HIGH": "🟠", "MEDIUM": "🟡", "LOW": "🟢", "UNSET": "⚪"}

        for prio in priority_order:
            if prio in by_priority:
                emoji = priority_emoji.get(prio, "⚪")
                lines.append(f"{emoji} **{prio}** ({len(by_priority[prio])}개)")
                for item in by_priority[prio][:5]:
                    title = (item.get("title") or "제목없음")[:50]
                    points = item.get("story_points") or "-"
                    status = _translate_status(item.get("status"))
                    lines.append(f"  - {title} ({points}pt, {status})")
                if len(by_priority[prio]) > 5:
                    lines.append(f"  - ... 외 {len(by_priority[prio]) - 5}개")
                lines.append("")
    else:
        # P1: Show degradation message from warnings
        for warning in contract.warnings:
            lines.append(f"ℹ️ {warning}")
        lines.append("")

    _append_tips(lines, contract.tips)
    lines.append(f"_데이터 출처: {contract.provenance}_")
    return "\n".join(lines)


def render_sprint_progress(contract: ResponseContract) -> str:
    """
    Render sprint progress with completion bar and P1 enhancements.

    P1 Enhancements:
    - Shows days remaining/elapsed
    - Detects overdue/invalid sprint warnings
    - Shows story points progress
    """
    lines = []

    lines.append(f"🏃 **스프린트 진행 현황** (기준: {contract.reference_time})")
    lines.append(f"📍 {contract.scope}")
    lines.append("")

    # Use error_code for error detection (Risk K)
    if contract.has_error():
        for warning in contract.warnings:
            lines.append(f"⚠️ {warning}")
        lines.append("")
        _append_tips(lines, contract.tips)
        lines.append(f"_데이터 출처: {contract.provenance}_")
        return "\n".join(lines)

    sprint = contract.data.get("sprint")
    metrics = contract.data.get("metrics", {})
    stories = contract.data.get("stories", [])

    if sprint:
        lines.append(f"**스프린트**: {sprint.get('name')}")
        if sprint.get("goal"):
            lines.append(f"**목표**: {sprint.get('goal')}")
        lines.append(f"**기간**: {sprint.get('start_date')} ~ {sprint.get('end_date')}")

        # P1: Days remaining/elapsed
        days_remaining = sprint.get("days_remaining")
        days_elapsed = sprint.get("days_elapsed")
        if days_remaining is not None:
            if days_remaining > 0:
                lines.append(f"**남은 일수**: {days_remaining}일")
            elif days_remaining == 0:
                lines.append("**남은 일수**: 오늘이 마지막 날!")
        if days_elapsed is not None:
            lines.append(f"**경과 일수**: {days_elapsed}일")
        lines.append("")

        # P1: Sprint warnings (overdue/invalid)
        if sprint.get("is_overdue"):
            lines.append("⚠️ **스프린트 기한 초과** - 종료하거나 연장을 검토해 주세요")
        if sprint.get("has_invalid_dates"):
            lines.append("🚨 **날짜 오류** - 종료일이 시작일보다 이전입니다")
        if sprint.get("is_overdue") or sprint.get("has_invalid_dates"):
            lines.append("")

        # Metrics
        total = int(metrics.get("total", 0) or 0)
        done = int(metrics.get("done", 0) or 0)
        in_progress = int(metrics.get("in_progress", 0) or 0)
        rate = float(metrics.get("completion_rate", 0) or 0)

        lines.append(f"**완료율**: {rate:.1f}% ({done}/{total}개 스토리 완료)")
        lines.append(f"**진행 중**: {in_progress}개")

        # P1: Story points if available
        total_points = int(metrics.get("total_points", 0) or 0)
        done_points = int(metrics.get("done_points", 0) or 0)
        if total_points > 0:
            points_rate = round(done_points / total_points * 100, 1)
            lines.append(f"**스토리 포인트**: {done_points}/{total_points}pt ({points_rate}%)")
        lines.append("")

        # Progress bar
        filled = int(rate / 10)
        bar = "█" * filled + "░" * (10 - filled)
        lines.append(f"[{bar}] {rate:.0f}%")
        lines.append("")

        # Story breakdown by status
        if stories:
            status_counts = {}
            for story in stories:
                status = story.get("status", "UNKNOWN")
                status_counts[status] = status_counts.get(status, 0) + 1

            lines.append("**상태별 현황**:")
            status_order = ["IN_PROGRESS", "REVIEW", "READY", "IN_SPRINT", "DONE", "BLOCKED"]
            for status in status_order:
                if status in status_counts:
                    status_display = _translate_status(status)
                    lines.append(f"  - {status_display}: {status_counts[status]}")
            # Handle any other statuses
            for status, cnt in sorted(status_counts.items()):
                if status not in status_order:
                    status_display = _translate_status(status)
                    lines.append(f"  - {status_display}: {cnt}")
            lines.append("")

            # Story list with details
            lines.append("**스토리 목록**:")
            for story in stories:
                title = story.get("title", "Unknown")
                points = story.get("story_points") or story.get("storyPoints", 0)
                status = story.get("status", "UNKNOWN")
                status_display = _translate_status(status)
                lines.append(f"  - {title} ({points}pt, {status_display})")
            lines.append("")
    else:
        # P1: Show degradation message from warnings
        for warning in contract.warnings:
            lines.append(f"ℹ️ {warning}")
        lines.append("")

    _append_tips(lines, contract.tips)
    lines.append(f"_데이터 출처: {contract.provenance}_")
    return "\n".join(lines)


def render_tasks_due_this_week(contract: ResponseContract) -> str:
    """
    Render tasks grouped by due date with P1 overdue section.

    P1 Enhancements:
    - Separate overdue tasks section
    - Shows judgment data context in warnings
    - Priority indicators in task display
    """
    lines = []

    lines.append(f"📅 **이번 주 마감 태스크** (기준: {contract.reference_time})")
    lines.append(f"📍 {contract.scope}")
    lines.append("")

    # Use error_code for error detection (Risk K)
    if contract.has_error():
        for warning in contract.warnings:
            lines.append(f"⚠️ {warning}")
        lines.append("")
        _append_tips(lines, contract.tips)
        lines.append(f"_데이터 출처: {contract.provenance}_")
        return "\n".join(lines)

    tasks = contract.data.get("tasks", [])
    overdue = contract.data.get("overdue", [])
    count = contract.data.get("count", 0)

    # P1: Overdue tasks section (MUST come first - urgent)
    if overdue:
        lines.append(f"🚨 **기한 초과**: {len(overdue)}개")
        for task in overdue[:10]:
            title = task.get("title", "제목없음")[:50]
            due = str(task.get("due_date", ""))[:10]
            days = task.get("days_overdue", "?")
            priority = task.get("priority", "")
            priority_marker = _get_priority_marker(priority)
            lines.append(f"  - {priority_marker} {title}")
            lines.append(f"    └─ 마감일: {due} ({days}일 초과)")
        if len(overdue) > 10:
            lines.append(f"  - ... 외 {len(overdue) - 10}개 초과 태스크")
        lines.append("")

    # Tasks due this week
    if tasks:
        lines.append(f"📋 **이번 주 마감**: {count}개")
        if contract.data.get("was_limited"):
            lines.append("_(더 많은 항목이 있을 수 있습니다)_")
        lines.append("")

        # Group by due date
        by_date = {}
        for task in tasks:
            due = str(task.get("due_date", "Unknown"))[:10]
            if due not in by_date:
                by_date[due] = []
            by_date[due].append(task)

        for date in sorted(by_date.keys()):
            lines.append(f"**{date}** ({len(by_date[date])}개)")
            for task in by_date[date]:
                title = task.get("title", "제목없음")[:40]
                status = _translate_status(task.get("status"))
                story = task.get("story_title", "")
                priority = task.get("priority", "")
                priority_marker = _get_priority_marker(priority)
                lines.append(f"  - {priority_marker} [{status}] {title}")
                if story:
                    lines.append(f"    └─ 스토리: {story[:25]}")
            lines.append("")
    elif not overdue:
        # Show warning only if no tasks AND no overdue
        for warning in contract.warnings:
            lines.append(f"ℹ️ {warning}")
        lines.append("")

    _append_tips(lines, contract.tips)
    lines.append(f"_데이터 출처: {contract.provenance}_")
    return "\n".join(lines)


def _get_priority_marker(priority: str | None) -> str:
    """Get priority marker emoji"""
    if not priority:
        return "⚪"
    markers = {
        "CRITICAL": "🔴",
        "HIGH": "🟠",
        "MEDIUM": "🟡",
        "LOW": "🟢",
    }
    return markers.get(priority.upper(), "⚪")


def render_risk_analysis(contract: ResponseContract) -> str:
    """Render risks grouped by severity"""
    lines = []

    lines.append(f"⚠️ **리스크 분석** (기준: {contract.reference_time})")
    lines.append(f"📍 {contract.scope}")
    lines.append("")

    # Use error_code for error detection (Risk K)
    if contract.has_error():
        for warning in contract.warnings:
            lines.append(f"⚠️ {warning}")
        lines.append("")
        _append_tips(lines, contract.tips)
        lines.append(f"_데이터 출처: {contract.provenance}_")
        return "\n".join(lines)

    risks = contract.data.get("risks", [])
    count = contract.data.get("count", 0)
    by_severity = contract.data.get("by_severity", {})

    if risks:
        lines.append(f"**활성 리스크**: {count}개")
        if contract.data.get("was_limited"):
            lines.append(f"_(더 많은 항목이 있을 수 있습니다)_")
        lines.append("")

        severity_emoji = {"CRITICAL": "🔴", "HIGH": "🟠", "MEDIUM": "🟡", "LOW": "🟢", "UNKNOWN": "⚪"}
        severity_order = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "UNKNOWN"]

        for sev in severity_order:
            if sev in by_severity and by_severity[sev]:
                emoji = severity_emoji.get(sev, "⚪")
                sev_risks = by_severity[sev]
                lines.append(f"{emoji} **{sev}** ({len(sev_risks)}개)")
                for risk in sev_risks[:3]:
                    title = risk.get("title", "제목없음")[:50]
                    status = _translate_status(risk.get("status"))
                    lines.append(f"  - {title} ({status})")
                lines.append("")

        # Summary alert
        critical_count = len(by_severity.get("CRITICAL", []))
        high_count = len(by_severity.get("HIGH", []))
        if critical_count > 0:
            lines.append(f"🚨 **알림**: {critical_count}개 긴급 리스크가 즉각적인 조치가 필요합니다")
        elif high_count > 0:
            lines.append(f"⚠️ **참고**: {high_count}개 높은 위험도 항목이 주의가 필요합니다")
        lines.append("")
    else:
        lines.append("등록된 활성 리스크가 없습니다.")
        lines.append("")

    _append_tips(lines, contract.tips)
    lines.append(f"_데이터 출처: {contract.provenance}_")
    return "\n".join(lines)


def render_tasks_by_status(contract: ResponseContract) -> str:
    """
    Render tasks filtered by status (테스트 중인, 검토 중인, 진행 중인, etc.)
    """
    lines = []

    data = contract.data
    status_label = data.get("status_label", "상태별")

    lines.append(f"🔍 **{status_label} 태스크** (기준: {contract.reference_time})")
    if contract.scope:
        lines.append(f"📍 {contract.scope}")
    lines.append("")

    if contract.has_error():
        for warning in contract.warnings:
            lines.append(f"⚠️ {warning}")
        lines.append("")
        _append_tips(lines, contract.tips)
        lines.append(f"_데이터 출처: {contract.provenance}_")
        return "\n".join(lines)

    tasks = data.get("tasks", [])
    count = data.get("count", 0)

    if tasks:
        lines.append(f"**조회 결과**: {count}개")
        if data.get("was_limited"):
            lines.append("_(최근 30개만 표시)_")
        lines.append("")

        # Task list
        lines.append(f"**{status_label} 태스크 목록**:")
        for task in tasks[:20]:
            title = task.get("title", "제목없음")[:50]
            priority = task.get("priority", "")
            priority_marker = _get_priority_marker(priority)
            story_title = task.get("story_title", "")
            status = _translate_status(task.get("status", ""))

            lines.append(f"  - {priority_marker} {title} ({status})")
            if story_title:
                lines.append(f"    └─ 스토리: {story_title[:30]}")

        if len(tasks) > 20:
            lines.append(f"  - ... 외 {len(tasks) - 20}개")
        lines.append("")
    else:
        for warning in contract.warnings:
            lines.append(f"ℹ️ {warning}")
        lines.append("")

    _append_tips(lines, contract.tips)
    lines.append(f"_데이터 출처: {contract.provenance}_")
    return "\n".join(lines)


def render_completed_tasks(contract: ResponseContract) -> str:
    """
    Render completed tasks list.

    Shows tasks with status = 'DONE' for the project.
    """
    lines = []

    lines.append(f"✅ **완료된 태스크** (기준: {contract.reference_time})")
    if contract.scope:
        lines.append(f"📍 {contract.scope}")
    lines.append("")

    if contract.has_error():
        for warning in contract.warnings:
            lines.append(f"⚠️ {warning}")
        lines.append("")
        _append_tips(lines, contract.tips)
        lines.append(f"_데이터 출처: {contract.provenance}_")
        return "\n".join(lines)

    data = contract.data
    tasks = data.get("tasks", [])
    count = data.get("count", 0)
    all_tasks = data.get("all_tasks_count", 0)
    completed_count = data.get("completed_count", 0)

    if tasks:
        # Summary
        lines.append(f"**완료 현황**: {completed_count}개 완료 (전체 {all_tasks}개 중)")
        if data.get("was_limited"):
            lines.append("_(최근 30개만 표시)_")
        lines.append("")

        # Task list
        lines.append("**완료된 태스크 목록**:")
        for task in tasks[:20]:
            title = task.get("title", "제목없음")[:50]
            priority = task.get("priority", "")
            priority_marker = _get_priority_marker(priority)
            story_title = task.get("story_title", "")

            lines.append(f"  - {priority_marker} {title}")
            if story_title:
                lines.append(f"    └─ 스토리: {story_title[:30]}")

        if len(tasks) > 20:
            lines.append(f"  - ... 외 {len(tasks) - 20}개")
        lines.append("")
    else:
        for warning in contract.warnings:
            lines.append(f"ℹ️ {warning}")
        lines.append("")

    _append_tips(lines, contract.tips)
    lines.append(f"_데이터 출처: {contract.provenance}_")
    return "\n".join(lines)


def render_casual(contract: ResponseContract) -> str:
    """Render casual greeting"""
    return (
        "안녕하세요! PMS 어시스턴트입니다 😊\n"
        "프로젝트 일정, 백로그, 리스크, 이슈 등에 대해 무엇이든 물어보세요!"
    )


def render_status_list(contract: ResponseContract) -> str:
    """
    Render status list queries (completed tasks, blocked items, etc.)

    Handles generic STATUS_LIST intent with actual data display.
    """
    lines = []

    lines.append(f"📋 **상태 조회 결과** (기준: {contract.reference_time})")
    if contract.scope:
        lines.append(f"📍 {contract.scope}")
    lines.append("")

    if contract.has_error():
        for warning in contract.warnings:
            lines.append(f"⚠️ {warning}")
        lines.append("")
        _append_tips(lines, contract.tips)
        lines.append(f"_데이터 출처: {contract.provenance}_")
        return "\n".join(lines)

    data = contract.data
    items = data.get("items") or data.get("tasks") or data.get("stories") or []
    count = data.get("count", len(items) if items else 0)

    if items and isinstance(items, list):
        lines.append(f"**조회 결과**: {count}개")
        lines.append("")

        # Group by status if available
        by_status = {}
        for item in items:
            if isinstance(item, dict):
                status = item.get("status", "UNKNOWN")
                if status not in by_status:
                    by_status[status] = []
                by_status[status].append(item)

        if by_status:
            status_emoji = {
                "DONE": "✅", "COMPLETED": "✅", "완료": "✅",
                "IN_PROGRESS": "🔄", "진행 중": "🔄",
                "BLOCKED": "🚫", "차단됨": "🚫",
                "TODO": "📝", "READY": "📝",
            }
            status_order = ["DONE", "COMPLETED", "IN_PROGRESS", "BLOCKED", "TODO", "READY"]

            # Sort statuses
            sorted_statuses = sorted(
                by_status.keys(),
                key=lambda s: status_order.index(s) if s in status_order else 99
            )

            for status in sorted_statuses:
                status_items = by_status[status]
                emoji = status_emoji.get(status, "📌")
                status_display = _translate_status(status)
                lines.append(f"{emoji} **{status_display}** ({len(status_items)}개)")
                for item in status_items[:10]:
                    title = item.get("title") or item.get("name") or item.get("id", "항목")
                    points = item.get("story_points") or item.get("storyPoints")
                    if points:
                        lines.append(f"  - {title} ({points}pt)")
                    else:
                        lines.append(f"  - {title}")
                if len(status_items) > 10:
                    lines.append(f"  - ... 외 {len(status_items) - 10}개")
                lines.append("")
    else:
        lines.append("조회된 항목이 없습니다.")
        lines.append("")

    _append_tips(lines, contract.tips)
    lines.append(f"_데이터 출처: {contract.provenance}_")
    return "\n".join(lines)


def render_default(contract: ResponseContract) -> str:
    """Default fallback - renders actual data from contract"""
    lines = []
    lines.append(f"📝 **응답** (기준: {contract.reference_time})")
    if contract.scope:
        lines.append(f"📍 {contract.scope}")
    lines.append("")

    if contract.has_data():
        data = contract.data
        # Try to render items/tasks/stories if present
        items = data.get("items") or data.get("tasks") or data.get("stories") or []
        count = data.get("count", len(items) if items else 0)

        if items and isinstance(items, list):
            lines.append(f"**조회 결과**: {count}개")
            lines.append("")
            for item in items[:20]:  # Limit to 20 items
                if isinstance(item, dict):
                    title = item.get("title") or item.get("name") or item.get("id", "항목")
                    status = item.get("status", "")
                    status_display = _translate_status(status) if status else ""
                    if status_display:
                        lines.append(f"  - {title} ({status_display})")
                    else:
                        lines.append(f"  - {title}")
                else:
                    lines.append(f"  - {item}")
            if len(items) > 20:
                lines.append(f"  - ... 외 {len(items) - 20}개")
            lines.append("")
        elif data:
            # Render raw data keys if no recognizable list structure
            lines.append("**조회된 데이터**:")
            for key, value in data.items():
                if key not in ("was_limited", "error_code"):
                    if isinstance(value, (list, dict)):
                        lines.append(f"  - {key}: {len(value) if isinstance(value, list) else '(object)'}")
                    else:
                        lines.append(f"  - {key}: {value}")
            lines.append("")
    else:
        lines.append("요청하신 정보를 찾을 수 없습니다.")

    _append_tips(lines, contract.tips)
    lines.append(f"_데이터 출처: {contract.provenance}_")
    return "\n".join(lines)


# =============================================================================
# Helpers
# =============================================================================

def _append_tips(lines: List[str], tips: List[str]) -> None:
    """Append tips section if tips exist"""
    if tips:
        lines.append("")
        lines.append("💡 **다음 단계**:")
        for tip in tips:
            lines.append(f"  - {tip}")
        lines.append("")


def _translate_status(status: str | None) -> str:
    """Translate status to human-readable form"""
    if not status:
        return "알 수 없음"

    translations = {
        "IDEA": "아이디어",
        "REFINED": "정제됨",
        "READY": "준비완료",
        "BACKLOG": "백로그",
        "IN_SPRINT": "스프린트 중",
        "IN_PROGRESS": "진행 중",
        "REVIEW": "검토 중",
        "DONE": "완료",
        "CANCELLED": "취소됨",
        "BLOCKED": "차단됨",
        "OPEN": "진행 중",
        "CLOSED": "종료",
        "TODO": "할 일",
        "ACTIVE": "활성",
        "COMPLETED": "완료",
    }

    return translations.get(status.upper(), status)
