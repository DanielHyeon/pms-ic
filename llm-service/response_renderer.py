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
from response_contract import ResponseContract

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
        "casual": render_casual,
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
    lines.append(f"📋 **Product Backlog** (as of: {contract.reference_time})")
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
        lines.append(f"_Data source: {contract.provenance}_")
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

        lines.append(f"**Total items**: {total}")
        if total_points > 0:
            lines.append(f"**Total story points**: {total_points}")
        if critical_count > 0 or high_count > 0:
            lines.append(f"**Priority**: {critical_count} Critical, {high_count} High")
        if contract.data.get("was_limited"):
            lines.append("_(More items may exist)_")
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
                lines.append(f"{emoji} **{prio}** ({len(by_priority[prio])} items)")
                for item in by_priority[prio][:5]:
                    title = (item.get("title") or "Untitled")[:50]
                    points = item.get("story_points") or "-"
                    status = _translate_status(item.get("status"))
                    lines.append(f"  - {title} ({points}pts, {status})")
                if len(by_priority[prio]) > 5:
                    lines.append(f"  - ... and {len(by_priority[prio]) - 5} more")
                lines.append("")
    else:
        # P1: Show degradation message from warnings
        for warning in contract.warnings:
            lines.append(f"ℹ️ {warning}")
        lines.append("")

    _append_tips(lines, contract.tips)
    lines.append(f"_Data source: {contract.provenance}_")
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

    lines.append(f"🏃 **Sprint Progress** (as of: {contract.reference_time})")
    lines.append(f"📍 {contract.scope}")
    lines.append("")

    # Use error_code for error detection (Risk K)
    if contract.has_error():
        for warning in contract.warnings:
            lines.append(f"⚠️ {warning}")
        lines.append("")
        _append_tips(lines, contract.tips)
        lines.append(f"_Data source: {contract.provenance}_")
        return "\n".join(lines)

    sprint = contract.data.get("sprint")
    metrics = contract.data.get("metrics", {})
    stories = contract.data.get("stories", [])

    if sprint:
        lines.append(f"**Sprint**: {sprint.get('name')}")
        if sprint.get("goal"):
            lines.append(f"**Goal**: {sprint.get('goal')}")
        lines.append(f"**Period**: {sprint.get('start_date')} ~ {sprint.get('end_date')}")

        # P1: Days remaining/elapsed
        days_remaining = sprint.get("days_remaining")
        days_elapsed = sprint.get("days_elapsed")
        if days_remaining is not None:
            if days_remaining > 0:
                lines.append(f"**Days remaining**: {days_remaining}")
            elif days_remaining == 0:
                lines.append("**Days remaining**: Last day!")
        if days_elapsed is not None:
            lines.append(f"**Days elapsed**: {days_elapsed}")
        lines.append("")

        # P1: Sprint warnings (overdue/invalid)
        if sprint.get("is_overdue"):
            lines.append("⚠️ **Sprint is overdue** - consider closing or extending")
        if sprint.get("has_invalid_dates"):
            lines.append("🚨 **Invalid dates** - end date is before start date")
        if sprint.get("is_overdue") or sprint.get("has_invalid_dates"):
            lines.append("")

        # Metrics
        total = int(metrics.get("total", 0) or 0)
        done = int(metrics.get("done", 0) or 0)
        in_progress = int(metrics.get("in_progress", 0) or 0)
        rate = float(metrics.get("completion_rate", 0) or 0)

        lines.append(f"**Completion**: {rate:.1f}% ({done}/{total} stories done)")
        lines.append(f"**In Progress**: {in_progress}")

        # P1: Story points if available
        total_points = int(metrics.get("total_points", 0) or 0)
        done_points = int(metrics.get("done_points", 0) or 0)
        if total_points > 0:
            points_rate = round(done_points / total_points * 100, 1)
            lines.append(f"**Story Points**: {done_points}/{total_points} pts ({points_rate}%)")
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

            lines.append("**Status breakdown**:")
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
    else:
        # P1: Show degradation message from warnings
        for warning in contract.warnings:
            lines.append(f"ℹ️ {warning}")
        lines.append("")

    _append_tips(lines, contract.tips)
    lines.append(f"_Data source: {contract.provenance}_")
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

    lines.append(f"📅 **Tasks Due This Week** (as of: {contract.reference_time})")
    lines.append(f"📍 {contract.scope}")
    lines.append("")

    # Use error_code for error detection (Risk K)
    if contract.has_error():
        for warning in contract.warnings:
            lines.append(f"⚠️ {warning}")
        lines.append("")
        _append_tips(lines, contract.tips)
        lines.append(f"_Data source: {contract.provenance}_")
        return "\n".join(lines)

    tasks = contract.data.get("tasks", [])
    overdue = contract.data.get("overdue", [])
    count = contract.data.get("count", 0)

    # P1: Overdue tasks section (MUST come first - urgent)
    if overdue:
        lines.append(f"🚨 **Overdue**: {len(overdue)} task(s)")
        for task in overdue[:10]:
            title = task.get("title", "Untitled")[:50]
            due = str(task.get("due_date", ""))[:10]
            days = task.get("days_overdue", "?")
            priority = task.get("priority", "")
            priority_marker = _get_priority_marker(priority)
            lines.append(f"  - {priority_marker} {title}")
            lines.append(f"    └─ Due: {due} ({days} days overdue)")
        if len(overdue) > 10:
            lines.append(f"  - ... and {len(overdue) - 10} more overdue tasks")
        lines.append("")

    # Tasks due this week
    if tasks:
        lines.append(f"📋 **Due This Week**: {count} task(s)")
        if contract.data.get("was_limited"):
            lines.append("_(More items may exist)_")
        lines.append("")

        # Group by due date
        by_date = {}
        for task in tasks:
            due = str(task.get("due_date", "Unknown"))[:10]
            if due not in by_date:
                by_date[due] = []
            by_date[due].append(task)

        for date in sorted(by_date.keys()):
            lines.append(f"**{date}** ({len(by_date[date])} tasks)")
            for task in by_date[date]:
                title = task.get("title", "Untitled")[:40]
                status = _translate_status(task.get("status"))
                story = task.get("story_title", "")
                priority = task.get("priority", "")
                priority_marker = _get_priority_marker(priority)
                lines.append(f"  - {priority_marker} [{status}] {title}")
                if story:
                    lines.append(f"    └─ Story: {story[:25]}")
            lines.append("")
    elif not overdue:
        # Show warning only if no tasks AND no overdue
        for warning in contract.warnings:
            lines.append(f"ℹ️ {warning}")
        lines.append("")

    _append_tips(lines, contract.tips)
    lines.append(f"_Data source: {contract.provenance}_")
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

    lines.append(f"⚠️ **Risk Analysis** (as of: {contract.reference_time})")
    lines.append(f"📍 {contract.scope}")
    lines.append("")

    # Use error_code for error detection (Risk K)
    if contract.has_error():
        for warning in contract.warnings:
            lines.append(f"⚠️ {warning}")
        lines.append("")
        _append_tips(lines, contract.tips)
        lines.append(f"_Data source: {contract.provenance}_")
        return "\n".join(lines)

    risks = contract.data.get("risks", [])
    count = contract.data.get("count", 0)
    by_severity = contract.data.get("by_severity", {})

    if risks:
        lines.append(f"**Active risks**: {count}")
        if contract.data.get("was_limited"):
            lines.append(f"_(More items may exist)_")
        lines.append("")

        severity_emoji = {"CRITICAL": "🔴", "HIGH": "🟠", "MEDIUM": "🟡", "LOW": "🟢", "UNKNOWN": "⚪"}
        severity_order = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "UNKNOWN"]

        for sev in severity_order:
            if sev in by_severity and by_severity[sev]:
                emoji = severity_emoji.get(sev, "⚪")
                sev_risks = by_severity[sev]
                lines.append(f"{emoji} **{sev}** ({len(sev_risks)} items)")
                for risk in sev_risks[:3]:
                    title = risk.get("title", "Untitled")[:50]
                    status = _translate_status(risk.get("status"))
                    lines.append(f"  - {title} ({status})")
                lines.append("")

        # Summary alert
        critical_count = len(by_severity.get("CRITICAL", []))
        high_count = len(by_severity.get("HIGH", []))
        if critical_count > 0:
            lines.append(f"🚨 **Alert**: {critical_count} critical risks require immediate action")
        elif high_count > 0:
            lines.append(f"⚠️ **Note**: {high_count} high-risk items need attention")
        lines.append("")
    else:
        lines.append("No active risks registered.")
        lines.append("")

    _append_tips(lines, contract.tips)
    lines.append(f"_Data source: {contract.provenance}_")
    return "\n".join(lines)


def render_casual(contract: ResponseContract) -> str:
    """Render casual greeting"""
    return (
        "Hello! I'm the PMS Assistant 😊\n"
        "Feel free to ask about project schedules, backlog, risks, issues, and more!"
    )


def render_default(contract: ResponseContract) -> str:
    """Default fallback - should rarely be used"""
    lines = []
    lines.append(f"📝 **Response** (as of: {contract.reference_time})")
    if contract.scope:
        lines.append(f"📍 {contract.scope}")
    lines.append("")

    if contract.has_data():
        lines.append("Data retrieved successfully.")
    else:
        lines.append("Could not find the requested information.")

    _append_tips(lines, contract.tips)
    lines.append(f"_Data source: {contract.provenance}_")
    return "\n".join(lines)


# =============================================================================
# Helpers
# =============================================================================

def _append_tips(lines: List[str], tips: List[str]) -> None:
    """Append tips section if tips exist"""
    if tips:
        lines.append("")
        lines.append("💡 **Next steps**:")
        for tip in tips:
            lines.append(f"  - {tip}")
        lines.append("")


def _translate_status(status: str | None) -> str:
    """Translate status to human-readable form"""
    if not status:
        return "Unknown"

    translations = {
        "IDEA": "Idea",
        "REFINED": "Refined",
        "READY": "Ready",
        "BACKLOG": "Backlog",
        "IN_SPRINT": "In Sprint",
        "IN_PROGRESS": "In Progress",
        "REVIEW": "Review",
        "DONE": "Done",
        "CANCELLED": "Cancelled",
        "BLOCKED": "Blocked",
        "OPEN": "Open",
        "CLOSED": "Closed",
        "TODO": "To Do",
        "ACTIVE": "Active",
        "COMPLETED": "Completed",
    }

    return translations.get(status.upper(), status)
