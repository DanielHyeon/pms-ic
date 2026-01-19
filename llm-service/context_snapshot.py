"""
Context Snapshot Service - Now/Next/Why Snapshots

Generates context snapshots for LLM prompts:
- Now: Current sprint state, today's tasks, active blockers
- Next: Upcoming milestones, pending decisions
- Why: Recent decisions, change log (last 5-10 changes)

Reference: docs/PMS 최적화 방안.md
"""

import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from enum import Enum
import json

logger = logging.getLogger(__name__)


# =============================================================================
# Snapshot Types
# =============================================================================

@dataclass
class NowSnapshot:
    """Current state snapshot"""
    # Sprint info
    active_sprint: Optional[Dict] = None  # {id, name, goal, status, progress}
    sprint_days_remaining: int = 0

    # Tasks
    my_tasks_today: List[Dict] = field(default_factory=list)  # [{id, title, status, priority}]
    in_progress_tasks: List[Dict] = field(default_factory=list)
    blocked_tasks: List[Dict] = field(default_factory=list)

    # Blockers and risks
    active_blockers: List[Dict] = field(default_factory=list)  # [{id, description, blocker_type}]
    high_risks: List[Dict] = field(default_factory=list)  # [{id, description, level}]

    # Metrics
    sprint_completion_rate: float = 0.0
    wip_count: int = 0
    wip_limit: int = 5

    # Timestamp
    generated_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_text(self) -> str:
        """Convert to text format for LLM context"""
        lines = ["=== NOW (Current State) ==="]

        if self.active_sprint:
            lines.append(f"\nSprint: {self.active_sprint.get('name', 'Unknown')}")
            lines.append(f"  Goal: {self.active_sprint.get('goal', 'N/A')}")
            lines.append(f"  Progress: {self.sprint_completion_rate:.0%}")
            lines.append(f"  Days remaining: {self.sprint_days_remaining}")

        if self.my_tasks_today:
            lines.append(f"\nMy Tasks Today ({len(self.my_tasks_today)}):")
            for task in self.my_tasks_today[:5]:
                lines.append(f"  - [{task.get('status', '?')}] {task.get('title', 'Untitled')}")

        if self.blocked_tasks:
            lines.append(f"\nBlocked Tasks ({len(self.blocked_tasks)}):")
            for task in self.blocked_tasks[:3]:
                lines.append(f"  - {task.get('title', 'Untitled')}: {task.get('blocker_reason', 'Unknown reason')}")

        if self.high_risks:
            lines.append(f"\nHigh Risks ({len(self.high_risks)}):")
            for risk in self.high_risks[:3]:
                lines.append(f"  - {risk.get('description', 'Unknown risk')}")

        lines.append(f"\nWIP: {self.wip_count}/{self.wip_limit}")

        return "\n".join(lines)


@dataclass
class NextSnapshot:
    """Upcoming items snapshot"""
    # Milestones
    upcoming_milestones: List[Dict] = field(default_factory=list)  # [{id, name, due_date, status}]
    next_sprint: Optional[Dict] = None

    # Pending items
    pending_reviews: List[Dict] = field(default_factory=list)  # [{id, title, reviewer}]
    pending_decisions: List[Dict] = field(default_factory=list)  # [{id, description, owner}]
    upcoming_deliverables: List[Dict] = field(default_factory=list)  # [{id, name, due_date}]

    # Planned work
    next_tasks: List[Dict] = field(default_factory=list)  # Tasks planned for next

    # Timestamp
    generated_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_text(self) -> str:
        """Convert to text format for LLM context"""
        lines = ["=== NEXT (Upcoming) ==="]

        if self.upcoming_milestones:
            lines.append(f"\nUpcoming Milestones ({len(self.upcoming_milestones)}):")
            for milestone in self.upcoming_milestones[:5]:
                lines.append(f"  - {milestone.get('name', 'Untitled')} (Due: {milestone.get('due_date', 'TBD')})")

        if self.pending_reviews:
            lines.append(f"\nPending Reviews ({len(self.pending_reviews)}):")
            for review in self.pending_reviews[:3]:
                lines.append(f"  - {review.get('title', 'Untitled')}")

        if self.pending_decisions:
            lines.append(f"\nPending Decisions ({len(self.pending_decisions)}):")
            for decision in self.pending_decisions[:3]:
                lines.append(f"  - {decision.get('description', 'Unknown')}")

        if self.upcoming_deliverables:
            lines.append(f"\nUpcoming Deliverables ({len(self.upcoming_deliverables)}):")
            for deliverable in self.upcoming_deliverables[:3]:
                lines.append(f"  - {deliverable.get('name', 'Untitled')} (Due: {deliverable.get('due_date', 'TBD')})")

        return "\n".join(lines)


@dataclass
class WhySnapshot:
    """Context and decisions snapshot"""
    # Recent changes
    recent_changes: List[Dict] = field(default_factory=list)  # [{timestamp, type, description, author}]

    # Decisions
    recent_decisions: List[Dict] = field(default_factory=list)  # [{timestamp, decision, rationale, author}]

    # Context
    project_context: Optional[str] = None
    sprint_context: Optional[str] = None

    # Timestamp
    generated_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_text(self) -> str:
        """Convert to text format for LLM context"""
        lines = ["=== WHY (Context & Decisions) ==="]

        if self.recent_changes:
            lines.append(f"\nRecent Changes ({len(self.recent_changes)}):")
            for change in self.recent_changes[:10]:
                lines.append(f"  - [{change.get('timestamp', '?')}] {change.get('description', 'Unknown change')}")

        if self.recent_decisions:
            lines.append(f"\nRecent Decisions ({len(self.recent_decisions)}):")
            for decision in self.recent_decisions[:5]:
                lines.append(f"  - {decision.get('decision', 'Unknown')}")
                if decision.get('rationale'):
                    lines.append(f"    Rationale: {decision.get('rationale')}")

        if self.project_context:
            lines.append(f"\nProject Context: {self.project_context}")

        if self.sprint_context:
            lines.append(f"\nSprint Context: {self.sprint_context}")

        return "\n".join(lines)


@dataclass
class ContextSnapshot:
    """Combined context snapshot (Now/Next/Why)"""
    now: NowSnapshot
    next: NextSnapshot
    why: WhySnapshot
    project_id: Optional[str] = None
    user_id: Optional[str] = None
    generated_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        return {
            "now": asdict(self.now),
            "next": asdict(self.next),
            "why": asdict(self.why),
            "project_id": self.project_id,
            "user_id": self.user_id,
            "generated_at": self.generated_at,
        }

    def to_text(self) -> str:
        """Convert to text format for LLM context"""
        parts = [
            self.now.to_text(),
            "",
            self.next.to_text(),
            "",
            self.why.to_text(),
        ]
        return "\n".join(parts)

    def to_json(self) -> str:
        """Convert to JSON string"""
        return json.dumps(self.to_dict(), ensure_ascii=False, indent=2)


# =============================================================================
# Snapshot Manager
# =============================================================================

class SnapshotManager:
    """
    Manages context snapshot generation and caching.

    Usage:
        manager = SnapshotManager()

        # Generate snapshot (would connect to PostgreSQL in production)
        snapshot = manager.generate_snapshot(
            project_id="proj-123",
            user_id="user-456"
        )

        # Get text for LLM context
        context_text = snapshot.to_text()
    """

    def __init__(
        self,
        cache_ttl_seconds: int = 300,  # 5 minutes
        redis_client = None,
    ):
        self.cache_ttl = cache_ttl_seconds
        self.redis = redis_client
        self._memory_cache: Dict[str, tuple] = {}  # {key: (snapshot, timestamp)}

    def _cache_key(self, project_id: str, user_id: str) -> str:
        """Generate cache key"""
        return f"snapshot:{project_id}:{user_id}"

    def _get_from_cache(self, key: str) -> Optional[ContextSnapshot]:
        """Get snapshot from cache"""
        # Try Redis first
        if self.redis:
            try:
                data = self.redis.get(key)
                if data:
                    return self._deserialize(data)
            except Exception as e:
                logger.warning(f"Redis cache read failed: {e}")

        # Fall back to memory cache
        if key in self._memory_cache:
            snapshot, timestamp = self._memory_cache[key]
            if datetime.now().timestamp() - timestamp < self.cache_ttl:
                return snapshot
            else:
                del self._memory_cache[key]

        return None

    def _set_cache(self, key: str, snapshot: ContextSnapshot):
        """Set snapshot in cache"""
        # Try Redis first
        if self.redis:
            try:
                self.redis.setex(key, self.cache_ttl, snapshot.to_json())
            except Exception as e:
                logger.warning(f"Redis cache write failed: {e}")

        # Always update memory cache as fallback
        self._memory_cache[key] = (snapshot, datetime.now().timestamp())

    def _deserialize(self, data: str) -> ContextSnapshot:
        """Deserialize snapshot from JSON"""
        d = json.loads(data)
        return ContextSnapshot(
            now=NowSnapshot(**d.get("now", {})),
            next=NextSnapshot(**d.get("next", {})),
            why=WhySnapshot(**d.get("why", {})),
            project_id=d.get("project_id"),
            user_id=d.get("user_id"),
            generated_at=d.get("generated_at", datetime.now().isoformat()),
        )

    def generate_snapshot(
        self,
        project_id: Optional[str] = None,
        user_id: Optional[str] = None,
        force_refresh: bool = False,
        # Data providers (in production, these would come from PostgreSQL)
        sprint_data: Optional[Dict] = None,
        tasks_data: Optional[List[Dict]] = None,
        blockers_data: Optional[List[Dict]] = None,
        risks_data: Optional[List[Dict]] = None,
        milestones_data: Optional[List[Dict]] = None,
        changes_data: Optional[List[Dict]] = None,
        decisions_data: Optional[List[Dict]] = None,
    ) -> ContextSnapshot:
        """
        Generate context snapshot.

        In production, this would query PostgreSQL for real data.
        For now, it uses provided data or generates mock data.
        """
        cache_key = self._cache_key(project_id or "default", user_id or "default")

        # Check cache unless force refresh
        if not force_refresh:
            cached = self._get_from_cache(cache_key)
            if cached:
                logger.debug(f"Returning cached snapshot for {cache_key}")
                return cached

        logger.info(f"Generating new snapshot for project={project_id}, user={user_id}")

        # Generate NOW snapshot
        now = self._generate_now(
            sprint_data=sprint_data,
            tasks_data=tasks_data,
            blockers_data=blockers_data,
            risks_data=risks_data,
            user_id=user_id,
        )

        # Generate NEXT snapshot
        next_snap = self._generate_next(
            milestones_data=milestones_data,
            tasks_data=tasks_data,
        )

        # Generate WHY snapshot
        why = self._generate_why(
            changes_data=changes_data,
            decisions_data=decisions_data,
        )

        snapshot = ContextSnapshot(
            now=now,
            next=next_snap,
            why=why,
            project_id=project_id,
            user_id=user_id,
        )

        # Cache the snapshot
        self._set_cache(cache_key, snapshot)

        return snapshot

    def _generate_now(
        self,
        sprint_data: Optional[Dict] = None,
        tasks_data: Optional[List[Dict]] = None,
        blockers_data: Optional[List[Dict]] = None,
        risks_data: Optional[List[Dict]] = None,
        user_id: Optional[str] = None,
    ) -> NowSnapshot:
        """Generate NOW snapshot"""
        now = NowSnapshot()

        if sprint_data:
            now.active_sprint = sprint_data
            # Calculate days remaining
            if sprint_data.get("end_date"):
                try:
                    end_date = datetime.fromisoformat(sprint_data["end_date"])
                    now.sprint_days_remaining = max(0, (end_date - datetime.now()).days)
                except Exception:
                    pass

        if tasks_data:
            # Filter user's tasks
            user_tasks = [t for t in tasks_data if t.get("assignee_id") == user_id] if user_id else tasks_data

            # Today's tasks
            now.my_tasks_today = [
                t for t in user_tasks
                if t.get("status") in ["TODO", "IN_PROGRESS"]
            ][:10]

            # In progress
            now.in_progress_tasks = [
                t for t in user_tasks
                if t.get("status") == "IN_PROGRESS"
            ]

            # Blocked
            now.blocked_tasks = [
                t for t in tasks_data
                if t.get("is_blocked", False)
            ]

            # WIP count
            now.wip_count = len(now.in_progress_tasks)

            # Completion rate
            total = len([t for t in tasks_data if t.get("sprint_id") == sprint_data.get("id")]) if sprint_data else 0
            done = len([t for t in tasks_data if t.get("status") == "DONE" and t.get("sprint_id") == sprint_data.get("id")]) if sprint_data else 0
            now.sprint_completion_rate = done / total if total > 0 else 0.0

        if blockers_data:
            now.active_blockers = blockers_data[:5]

        if risks_data:
            now.high_risks = [r for r in risks_data if r.get("level") == "HIGH"][:5]

        return now

    def _generate_next(
        self,
        milestones_data: Optional[List[Dict]] = None,
        tasks_data: Optional[List[Dict]] = None,
    ) -> NextSnapshot:
        """Generate NEXT snapshot"""
        next_snap = NextSnapshot()

        if milestones_data:
            # Sort by due date, filter upcoming
            upcoming = sorted(
                [m for m in milestones_data if m.get("status") != "COMPLETED"],
                key=lambda x: x.get("due_date", "9999-99-99")
            )
            next_snap.upcoming_milestones = upcoming[:5]

        if tasks_data:
            # Pending reviews
            next_snap.pending_reviews = [
                t for t in tasks_data
                if t.get("status") == "REVIEW"
            ][:5]

            # Next tasks (TODO with high priority)
            next_snap.next_tasks = [
                t for t in tasks_data
                if t.get("status") == "TODO" and t.get("priority") in ["HIGH", "CRITICAL"]
            ][:5]

        return next_snap

    def _generate_why(
        self,
        changes_data: Optional[List[Dict]] = None,
        decisions_data: Optional[List[Dict]] = None,
    ) -> WhySnapshot:
        """Generate WHY snapshot"""
        why = WhySnapshot()

        if changes_data:
            # Sort by timestamp, most recent first
            sorted_changes = sorted(
                changes_data,
                key=lambda x: x.get("timestamp", ""),
                reverse=True
            )
            why.recent_changes = sorted_changes[:10]

        if decisions_data:
            sorted_decisions = sorted(
                decisions_data,
                key=lambda x: x.get("timestamp", ""),
                reverse=True
            )
            why.recent_decisions = sorted_decisions[:5]

        return why

    def invalidate_cache(self, project_id: str, user_id: Optional[str] = None):
        """Invalidate cached snapshot"""
        if user_id:
            key = self._cache_key(project_id, user_id)
            if self.redis:
                try:
                    self.redis.delete(key)
                except Exception as e:
                    logger.warning(f"Redis cache invalidation failed: {e}")
            if key in self._memory_cache:
                del self._memory_cache[key]
        else:
            # Invalidate all user snapshots for this project
            pattern = f"snapshot:{project_id}:*"
            keys_to_delete = [k for k in self._memory_cache.keys() if k.startswith(f"snapshot:{project_id}:")]
            for key in keys_to_delete:
                del self._memory_cache[key]


# =============================================================================
# Singleton instance
# =============================================================================

_snapshot_manager: Optional[SnapshotManager] = None


def get_snapshot_manager() -> SnapshotManager:
    """Get singleton snapshot manager instance"""
    global _snapshot_manager
    if _snapshot_manager is None:
        _snapshot_manager = SnapshotManager()
    return _snapshot_manager
