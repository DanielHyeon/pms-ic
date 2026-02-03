"""
Status Query Executor

Executes validated StatusQueryPlan against PostgreSQL database.
Returns structured results for LLM summarization.

Reference: docs/STATUS_QUERY_IMPLEMENTATION_PLAN.md
"""

import os
import logging
from datetime import datetime, timedelta
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Any, Optional, Callable
from contextlib import contextmanager

import psycopg2
from psycopg2.extras import RealDictCursor

from query.status_query_plan import StatusQueryPlan, QueryScope, TimeRange

logger = logging.getLogger(__name__)


# =============================================================================
# Result Data Classes
# =============================================================================

@dataclass
class MetricResult:
    """Result of a single metric query"""
    metric_name: str
    data: Any
    count: int = 0
    error: Optional[str] = None
    query_time_ms: float = 0.0


@dataclass
class StatusQueryResult:
    """Complete result of status query execution"""
    plan: StatusQueryPlan
    metrics: Dict[str, MetricResult] = field(default_factory=dict)
    generated_at: str = field(default_factory=lambda: datetime.now().isoformat())
    data_freshness: str = "real-time"
    total_query_time_ms: float = 0.0
    errors: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON/LLM consumption"""
        return {
            "generated_at": self.generated_at,
            "data_freshness": self.data_freshness,
            "scope": self.plan.scope.to_dict(),
            "metrics": {
                name: {
                    "data": result.data,
                    "count": result.count,
                    "error": result.error,
                }
                for name, result in self.metrics.items()
            },
            "total_query_time_ms": self.total_query_time_ms,
            "errors": self.errors,
        }

    def get_metric_data(self, metric_name: str) -> Any:
        """Get data for a specific metric"""
        if metric_name in self.metrics:
            return self.metrics[metric_name].data
        return None

    def has_data(self) -> bool:
        """Check if any metric returned data"""
        return any(
            result.data is not None and result.error is None
            for result in self.metrics.values()
        )


# =============================================================================
# Database Connection
# =============================================================================

def get_pg_connection():
    """Get PostgreSQL connection from environment"""
    return psycopg2.connect(
        host=os.getenv("PG_HOST", "postgres"),
        port=int(os.getenv("PG_PORT", "5432")),
        database=os.getenv("PG_DATABASE", "pms_db"),
        user=os.getenv("PG_USER", "pms_user"),
        password=os.getenv("PG_PASSWORD", "pms_password"),
    )


@contextmanager
def get_cursor():
    """Context manager for database cursor"""
    conn = None
    try:
        conn = get_pg_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        yield cursor
        conn.commit()
    except Exception as e:
        if conn:
            conn.rollback()
        raise e
    finally:
        if conn:
            conn.close()


# =============================================================================
# Metric Executors
# =============================================================================

class MetricExecutors:
    """Collection of metric execution functions"""

    @staticmethod
    def story_counts_by_status(
        cursor,
        scope: QueryScope,
        time_range: TimeRange,
        filters: Dict[str, Any],
    ) -> MetricResult:
        """Count stories by status"""
        start_time = datetime.now()

        query = """
            SELECT
                status,
                COUNT(*) as count
            FROM task.user_stories
            WHERE project_id = %s
              AND (%s::text IS NULL OR sprint_id = %s)
            GROUP BY status
            ORDER BY
                CASE status
                    WHEN 'IDEA' THEN 1
                    WHEN 'REFINED' THEN 2
                    WHEN 'READY' THEN 3
                    WHEN 'IN_SPRINT' THEN 4
                    WHEN 'IN_PROGRESS' THEN 5
                    WHEN 'REVIEW' THEN 6
                    WHEN 'DONE' THEN 7
                    WHEN 'CANCELLED' THEN 8
                    ELSE 9
                END
        """

        try:
            cursor.execute(query, (
                scope.project_id,
                scope.sprint_id,
                scope.sprint_id,
            ))
            rows = cursor.fetchall()

            data = {row["status"]: row["count"] for row in rows}
            total = sum(data.values())

            return MetricResult(
                metric_name="story_counts_by_status",
                data=data,
                count=total,
                query_time_ms=(datetime.now() - start_time).total_seconds() * 1000,
            )
        except Exception as e:
            logger.error(f"story_counts_by_status failed: {e}")
            return MetricResult(
                metric_name="story_counts_by_status",
                data=None,
                error=str(e),
            )

    @staticmethod
    def completion_rate(
        cursor,
        scope: QueryScope,
        time_range: TimeRange,
        filters: Dict[str, Any],
    ) -> MetricResult:
        """
        Calculate completion rate.

        Definition (Phase 4-2 documentation):
        - Numerator: Stories with status = 'DONE'
        - Denominator: All stories EXCEPT 'CANCELLED'
        - Scope: Active sprint (if specified) or entire project
        - Basis: Story count (not story points)

        Formula: DONE / (total - CANCELLED) * 100
        """
        start_time = datetime.now()

        query = """
            WITH stats AS (
                SELECT
                    COUNT(*) FILTER (WHERE status = 'DONE') as done,
                    COUNT(*) as total
                FROM task.user_stories
                WHERE project_id = %s
                  AND (%s::text IS NULL OR sprint_id = %s)
                  AND status != 'CANCELLED'
            )
            SELECT
                done,
                total,
                CASE WHEN total > 0
                    THEN ROUND(100.0 * done / total, 1)
                    ELSE 0
                END as rate
            FROM stats
        """

        try:
            cursor.execute(query, (
                scope.project_id,
                scope.sprint_id,
                scope.sprint_id,
            ))
            row = cursor.fetchone()

            if row:
                data = {
                    "done": row["done"],
                    "total": row["total"],
                    "rate": float(row["rate"]),
                }
            else:
                data = {"done": 0, "total": 0, "rate": 0.0}

            return MetricResult(
                metric_name="completion_rate",
                data=data,
                count=data.get("total", 0),
                query_time_ms=(datetime.now() - start_time).total_seconds() * 1000,
            )
        except Exception as e:
            logger.error(f"completion_rate failed: {e}")
            return MetricResult(
                metric_name="completion_rate",
                data=None,
                error=str(e),
            )

    @staticmethod
    def blocked_items(
        cursor,
        scope: QueryScope,
        time_range: TimeRange,
        filters: Dict[str, Any],
    ) -> MetricResult:
        """Get blocked items"""
        start_time = datetime.now()
        limit = filters.get("blocked_top_n", 5)

        # Note: UserStory doesn't have a 'blocked' column, so we check for
        # stories that haven't been updated in a while while IN_PROGRESS
        # In a real implementation, you might have a separate blocker tracking
        query = """
            SELECT
                id,
                title,
                status,
                assignee_id,
                updated_at,
                priority
            FROM task.user_stories
            WHERE project_id = %s
              AND status IN ('IN_PROGRESS', 'REVIEW')
              AND updated_at < NOW() - INTERVAL '3 days'
            ORDER BY updated_at ASC
            LIMIT %s
        """

        try:
            cursor.execute(query, (scope.project_id, limit))
            rows = cursor.fetchall()

            data = [
                {
                    "id": row["id"],
                    "title": row["title"],
                    "status": row["status"],
                    "assignee_id": row["assignee_id"],
                    "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
                    "priority": row["priority"],
                    "days_stale": (datetime.now() - row["updated_at"]).days if row["updated_at"] else 0,
                }
                for row in rows
            ]

            return MetricResult(
                metric_name="blocked_items",
                data=data,
                count=len(data),
                query_time_ms=(datetime.now() - start_time).total_seconds() * 1000,
            )
        except Exception as e:
            logger.error(f"blocked_items failed: {e}")
            return MetricResult(
                metric_name="blocked_items",
                data=None,
                error=str(e),
            )

    @staticmethod
    def overdue_items(
        cursor,
        scope: QueryScope,
        time_range: TimeRange,
        filters: Dict[str, Any],
    ) -> MetricResult:
        """Get overdue items (stories in sprints past end date)"""
        start_time = datetime.now()
        limit = filters.get("overdue_top_n", 5)

        query = """
            SELECT
                us.id,
                us.title,
                us.status,
                us.assignee_id,
                s.name as sprint_name,
                s.end_date as sprint_end
            FROM task.user_stories us
            JOIN task.sprints s ON us.sprint_id = s.id
            WHERE us.project_id = %s
              AND s.end_date < CURRENT_DATE
              AND us.status NOT IN ('DONE', 'CANCELLED')
            ORDER BY s.end_date ASC
            LIMIT %s
        """

        try:
            cursor.execute(query, (scope.project_id, limit))
            rows = cursor.fetchall()

            data = [
                {
                    "id": row["id"],
                    "title": row["title"],
                    "status": row["status"],
                    "assignee_id": row["assignee_id"],
                    "sprint_name": row["sprint_name"],
                    "sprint_end": row["sprint_end"].isoformat() if row["sprint_end"] else None,
                }
                for row in rows
            ]

            return MetricResult(
                metric_name="overdue_items",
                data=data,
                count=len(data),
                query_time_ms=(datetime.now() - start_time).total_seconds() * 1000,
            )
        except Exception as e:
            logger.error(f"overdue_items failed: {e}")
            return MetricResult(
                metric_name="overdue_items",
                data=None,
                error=str(e),
            )

    @staticmethod
    def recent_activity(
        cursor,
        scope: QueryScope,
        time_range: TimeRange,
        filters: Dict[str, Any],
    ) -> MetricResult:
        """Get recent activity"""
        start_time = datetime.now()
        days = filters.get("activity_days", 7)
        limit = filters.get("activity_top_n", 10)

        query = """
            SELECT
                id,
                title,
                status,
                assignee_id,
                updated_at
            FROM task.user_stories
            WHERE project_id = %s
              AND updated_at > NOW() - INTERVAL '%s days'
            ORDER BY updated_at DESC
            LIMIT %s
        """

        try:
            cursor.execute(query, (scope.project_id, days, limit))
            rows = cursor.fetchall()

            data = [
                {
                    "id": row["id"],
                    "title": row["title"],
                    "status": row["status"],
                    "assignee_id": row["assignee_id"],
                    "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
                }
                for row in rows
            ]

            return MetricResult(
                metric_name="recent_activity",
                data=data,
                count=len(data),
                query_time_ms=(datetime.now() - start_time).total_seconds() * 1000,
            )
        except Exception as e:
            logger.error(f"recent_activity failed: {e}")
            return MetricResult(
                metric_name="recent_activity",
                data=None,
                error=str(e),
            )

    @staticmethod
    def active_sprint(
        cursor,
        scope: QueryScope,
        time_range: TimeRange,
        filters: Dict[str, Any],
    ) -> MetricResult:
        """Get active sprint info"""
        start_time = datetime.now()

        query = """
            SELECT
                id,
                name,
                goal,
                status,
                start_date,
                end_date,
                conwip_limit
            FROM task.sprints
            WHERE project_id = %s
              AND status = 'ACTIVE'
            ORDER BY start_date DESC
            LIMIT 1
        """

        try:
            cursor.execute(query, (scope.project_id,))
            row = cursor.fetchone()

            if row:
                # Calculate days remaining
                days_remaining = 0
                if row["end_date"]:
                    days_remaining = max(0, (row["end_date"] - datetime.now().date()).days)

                data = {
                    "id": row["id"],
                    "name": row["name"],
                    "goal": row["goal"],
                    "status": row["status"],
                    "start_date": row["start_date"].isoformat() if row["start_date"] else None,
                    "end_date": row["end_date"].isoformat() if row["end_date"] else None,
                    "conwip_limit": row["conwip_limit"],
                    "days_remaining": days_remaining,
                }
            else:
                data = None

            return MetricResult(
                metric_name="active_sprint",
                data=data,
                count=1 if data else 0,
                query_time_ms=(datetime.now() - start_time).total_seconds() * 1000,
            )
        except Exception as e:
            logger.error(f"active_sprint failed: {e}")
            return MetricResult(
                metric_name="active_sprint",
                data=None,
                error=str(e),
            )

    @staticmethod
    def project_summary(
        cursor,
        scope: QueryScope,
        time_range: TimeRange,
        filters: Dict[str, Any],
    ) -> MetricResult:
        """Get project summary"""
        start_time = datetime.now()

        query = """
            SELECT
                id,
                name,
                description,
                status,
                progress,
                start_date,
                end_date
            FROM project.projects
            WHERE id = %s
        """

        try:
            cursor.execute(query, (scope.project_id,))
            row = cursor.fetchone()

            if row:
                data = {
                    "id": row["id"],
                    "name": row["name"],
                    "description": row["description"][:200] if row["description"] else None,
                    "status": row["status"],
                    "progress": row["progress"],
                    "start_date": row["start_date"].isoformat() if row["start_date"] else None,
                    "end_date": row["end_date"].isoformat() if row["end_date"] else None,
                }
            else:
                data = None

            return MetricResult(
                metric_name="project_summary",
                data=data,
                count=1 if data else 0,
                query_time_ms=(datetime.now() - start_time).total_seconds() * 1000,
            )
        except Exception as e:
            logger.error(f"project_summary failed: {e}")
            return MetricResult(
                metric_name="project_summary",
                data=None,
                error=str(e),
            )

    @staticmethod
    def wip_status(
        cursor,
        scope: QueryScope,
        time_range: TimeRange,
        filters: Dict[str, Any],
    ) -> MetricResult:
        """Get WIP status"""
        start_time = datetime.now()

        # Get WIP count
        wip_query = """
            SELECT COUNT(*) as wip_count
            FROM task.user_stories
            WHERE project_id = %s
              AND status = 'IN_PROGRESS'
        """

        # Get WIP limit from active sprint
        limit_query = """
            SELECT conwip_limit
            FROM task.sprints
            WHERE project_id = %s
              AND status = 'ACTIVE'
            LIMIT 1
        """

        try:
            cursor.execute(wip_query, (scope.project_id,))
            wip_row = cursor.fetchone()
            wip_count = wip_row["wip_count"] if wip_row else 0

            cursor.execute(limit_query, (scope.project_id,))
            limit_row = cursor.fetchone()
            wip_limit = limit_row["conwip_limit"] if limit_row and limit_row["conwip_limit"] else 5

            data = {
                "wip_count": wip_count,
                "wip_limit": wip_limit,
                "utilization": round(100 * wip_count / wip_limit, 1) if wip_limit > 0 else 0,
                "over_limit": wip_count > wip_limit,
            }

            return MetricResult(
                metric_name="wip_status",
                data=data,
                count=wip_count,
                query_time_ms=(datetime.now() - start_time).total_seconds() * 1000,
            )
        except Exception as e:
            logger.error(f"wip_status failed: {e}")
            return MetricResult(
                metric_name="wip_status",
                data=None,
                error=str(e),
            )

    @staticmethod
    def velocity(
        cursor,
        scope: QueryScope,
        time_range: TimeRange,
        filters: Dict[str, Any],
    ) -> MetricResult:
        """Calculate velocity (story points per completed sprint)"""
        start_time = datetime.now()

        query = """
            SELECT
                s.name as sprint_name,
                s.end_date,
                COALESCE(SUM(us.story_points), 0) as points_completed
            FROM task.sprints s
            LEFT JOIN task.user_stories us ON us.sprint_id = s.id AND us.status = 'DONE'
            WHERE s.project_id = %s
              AND s.status = 'COMPLETED'
            GROUP BY s.id, s.name, s.end_date
            ORDER BY s.end_date DESC
            LIMIT 5
        """

        try:
            cursor.execute(query, (scope.project_id,))
            rows = cursor.fetchall()

            sprints = [
                {
                    "sprint_name": row["sprint_name"],
                    "end_date": row["end_date"].isoformat() if row["end_date"] else None,
                    "points_completed": row["points_completed"],
                }
                for row in rows
            ]

            # Calculate average velocity
            total_points = sum(s["points_completed"] for s in sprints)
            avg_velocity = round(total_points / len(sprints), 1) if sprints else 0

            data = {
                "sprints": sprints,
                "average_velocity": avg_velocity,
                "sprint_count": len(sprints),
            }

            return MetricResult(
                metric_name="velocity",
                data=data,
                count=len(sprints),
                query_time_ms=(datetime.now() - start_time).total_seconds() * 1000,
            )
        except Exception as e:
            logger.error(f"velocity failed: {e}")
            return MetricResult(
                metric_name="velocity",
                data=None,
                error=str(e),
            )

    @staticmethod
    def issue_summary(
        cursor,
        scope: QueryScope,
        time_range: TimeRange,
        filters: Dict[str, Any],
    ) -> MetricResult:
        """Get issue summary"""
        start_time = datetime.now()

        query = """
            SELECT
                id,
                title,
                status,
                priority,
                created_at
            FROM project.issues
            WHERE project_id = %s
              AND status NOT IN ('CLOSED', 'RESOLVED')
            ORDER BY
                CASE priority
                    WHEN 'CRITICAL' THEN 1
                    WHEN 'HIGH' THEN 2
                    WHEN 'MEDIUM' THEN 3
                    WHEN 'LOW' THEN 4
                    ELSE 5
                END,
                created_at DESC
            LIMIT 10
        """

        try:
            cursor.execute(query, (scope.project_id,))
            rows = cursor.fetchall()

            data = [
                {
                    "id": row["id"],
                    "title": row["title"],
                    "status": row["status"],
                    "priority": row["priority"],
                    "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                }
                for row in rows
            ]

            return MetricResult(
                metric_name="issue_summary",
                data=data,
                count=len(data),
                query_time_ms=(datetime.now() - start_time).total_seconds() * 1000,
            )
        except Exception as e:
            logger.error(f"issue_summary failed: {e}")
            return MetricResult(
                metric_name="issue_summary",
                data=None,
                error=str(e),
            )

    @staticmethod
    def risk_summary(
        cursor,
        scope: QueryScope,
        time_range: TimeRange,
        filters: Dict[str, Any],
    ) -> MetricResult:
        """Get risk summary - uses issues table with type filter"""
        start_time = datetime.now()

        # Assuming risks are stored in issues table with a type field
        # Adjust based on actual schema
        query = """
            SELECT
                id,
                title,
                status,
                priority,
                created_at
            FROM project.issues
            WHERE project_id = %s
              AND status NOT IN ('CLOSED', 'RESOLVED')
              AND (type = 'RISK' OR title ILIKE '%%risk%%' OR title ILIKE '%%리스크%%')
            ORDER BY
                CASE priority
                    WHEN 'CRITICAL' THEN 1
                    WHEN 'HIGH' THEN 2
                    WHEN 'MEDIUM' THEN 3
                    WHEN 'LOW' THEN 4
                    ELSE 5
                END
            LIMIT 10
        """

        try:
            cursor.execute(query, (scope.project_id,))
            rows = cursor.fetchall()

            data = [
                {
                    "id": row["id"],
                    "title": row["title"],
                    "status": row["status"],
                    "priority": row["priority"],
                    "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                }
                for row in rows
            ]

            return MetricResult(
                metric_name="risk_summary",
                data=data,
                count=len(data),
                query_time_ms=(datetime.now() - start_time).total_seconds() * 1000,
            )
        except Exception as e:
            logger.error(f"risk_summary failed: {e}")
            return MetricResult(
                metric_name="risk_summary",
                data=None,
                error=str(e),
            )


# =============================================================================
# Main Executor
# =============================================================================

class StatusQueryExecutor:
    """
    Executes validated StatusQueryPlan against PostgreSQL.

    Usage:
        executor = StatusQueryExecutor()
        result = executor.execute(plan)
    """

    METRIC_EXECUTORS: Dict[str, Callable] = {
        "story_counts_by_status": MetricExecutors.story_counts_by_status,
        "completion_rate": MetricExecutors.completion_rate,
        "blocked_items": MetricExecutors.blocked_items,
        "overdue_items": MetricExecutors.overdue_items,
        "recent_activity": MetricExecutors.recent_activity,
        "active_sprint": MetricExecutors.active_sprint,
        "project_summary": MetricExecutors.project_summary,
        "wip_status": MetricExecutors.wip_status,
        "velocity": MetricExecutors.velocity,
        "issue_summary": MetricExecutors.issue_summary,
        "risk_summary": MetricExecutors.risk_summary,
    }

    def execute(self, plan: StatusQueryPlan) -> StatusQueryResult:
        """
        Execute the query plan and return results.

        Args:
            plan: Validated StatusQueryPlan

        Returns:
            StatusQueryResult with all metric data
        """
        start_time = datetime.now()
        result = StatusQueryResult(plan=plan)

        if not plan.validated:
            result.errors.append("Plan not validated")
            return result

        if not plan.scope.project_id:
            result.errors.append("project_id is required")
            return result

        # Build filters dict from plan
        filters = {
            "access_level_max": plan.filters.access_level_max,
            "blocked_top_n": plan.output.blocked_top_n,
            "overdue_top_n": plan.output.overdue_top_n,
            "activity_top_n": plan.output.activity_top_n,
            "activity_days": plan.output.activity_days,
        }

        try:
            with get_cursor() as cursor:
                for metric_name in plan.metrics:
                    executor_func = self.METRIC_EXECUTORS.get(metric_name)

                    if executor_func:
                        metric_result = executor_func(
                            cursor,
                            plan.scope,
                            plan.time_range,
                            filters,
                        )
                        result.metrics[metric_name] = metric_result

                        if metric_result.error:
                            result.errors.append(
                                f"{metric_name}: {metric_result.error}"
                            )
                    else:
                        logger.warning(f"No executor for metric: {metric_name}")
                        result.metrics[metric_name] = MetricResult(
                            metric_name=metric_name,
                            data=None,
                            error=f"No executor for metric: {metric_name}",
                        )

        except Exception as e:
            logger.error(f"Query execution failed: {e}")
            result.errors.append(f"Database error: {str(e)}")

        result.total_query_time_ms = (datetime.now() - start_time).total_seconds() * 1000

        logger.info(
            f"StatusQueryExecutor completed: {len(plan.metrics)} metrics, "
            f"{len(result.errors)} errors, {result.total_query_time_ms:.1f}ms"
        )

        return result


# =============================================================================
# Singleton Instance
# =============================================================================

_executor: Optional[StatusQueryExecutor] = None


def get_status_query_executor() -> StatusQueryExecutor:
    """Get singleton executor instance"""
    global _executor
    if _executor is None:
        _executor = StatusQueryExecutor()
    return _executor


def execute_status_query(plan: StatusQueryPlan) -> StatusQueryResult:
    """Convenience function to execute a status query"""
    return get_status_query_executor().execute(plan)
