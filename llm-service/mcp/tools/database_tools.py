"""
Database Tools - MCP tools for database operations

Provides read-only access to project data through PostgreSQL.
"""

from typing import Dict, Any, List, Optional
import logging

from .. import ToolDefinition, ToolCategory, AccessLevel
from ..registry import get_registry

logger = logging.getLogger(__name__)


# Database connection (lazy loaded)
_db_connection = None


def _get_db():
    """Get database connection."""
    global _db_connection
    if _db_connection is None:
        try:
            import psycopg2
            import os

            _db_connection = psycopg2.connect(
                host=os.getenv("DB_HOST", "localhost"),
                port=os.getenv("DB_PORT", "5433"),
                database=os.getenv("DB_NAME", "pms_db"),
                user=os.getenv("DB_USER", "pms_user"),
                password=os.getenv("DB_PASSWORD", ""),
            )
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            return None

    return _db_connection


# Tool implementations

def get_project(project_id: str) -> Dict[str, Any]:
    """
    Get project by ID.

    Args:
        project_id: Project ID

    Returns:
        Project data dict
    """
    db = _get_db()
    if not db:
        return {"error": "Database not available"}

    try:
        cursor = db.cursor()
        cursor.execute(
            """
            SELECT id, name, description, status, start_date, end_date,
                   progress, created_at, updated_at
            FROM project.projects
            WHERE id = %s
            """,
            (project_id,)
        )
        row = cursor.fetchone()
        cursor.close()

        if not row:
            return {"error": f"Project {project_id} not found"}

        return {
            "id": row[0],
            "name": row[1],
            "description": row[2],
            "status": row[3],
            "start_date": str(row[4]) if row[4] else None,
            "end_date": str(row[5]) if row[5] else None,
            "progress": row[6],
            "created_at": str(row[7]) if row[7] else None,
            "updated_at": str(row[8]) if row[8] else None,
        }

    except Exception as e:
        logger.error(f"get_project error: {e}")
        return {"error": str(e)}


def list_projects(
    status: str = None,
    limit: int = 50,
    offset: int = 0
) -> Dict[str, Any]:
    """
    List projects with optional filtering.

    Args:
        status: Filter by status
        limit: Max results
        offset: Pagination offset

    Returns:
        List of projects
    """
    db = _get_db()
    if not db:
        return {"projects": [], "error": "Database not available"}

    try:
        cursor = db.cursor()

        query = """
            SELECT id, name, status, progress, start_date, end_date
            FROM project.projects
            WHERE 1=1
        """
        params = []

        if status:
            query += " AND status = %s"
            params.append(status)

        query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])

        cursor.execute(query, params)
        rows = cursor.fetchall()
        cursor.close()

        projects = [
            {
                "id": row[0],
                "name": row[1],
                "status": row[2],
                "progress": row[3],
                "start_date": str(row[4]) if row[4] else None,
                "end_date": str(row[5]) if row[5] else None,
            }
            for row in rows
        ]

        return {"projects": projects, "count": len(projects)}

    except Exception as e:
        logger.error(f"list_projects error: {e}")
        return {"projects": [], "error": str(e)}


def get_tasks(
    project_id: str,
    status: str = None,
    sprint_id: str = None,
    limit: int = 100
) -> Dict[str, Any]:
    """
    Get tasks for a project.

    Args:
        project_id: Project ID
        status: Filter by status
        sprint_id: Filter by sprint
        limit: Max results

    Returns:
        List of tasks
    """
    db = _get_db()
    if not db:
        return {"tasks": [], "error": "Database not available"}

    try:
        cursor = db.cursor()

        query = """
            SELECT t.id, t.title, t.status, t.priority, t.assignee_id,
                   t.story_points, t.sprint_id
            FROM task.tasks t
            JOIN project.projects p ON t.project_id = p.id
            WHERE t.project_id = %s
        """
        params = [project_id]

        if status:
            query += " AND t.status = %s"
            params.append(status)

        if sprint_id:
            query += " AND t.sprint_id = %s"
            params.append(sprint_id)

        query += " ORDER BY t.priority DESC, t.created_at DESC LIMIT %s"
        params.append(limit)

        cursor.execute(query, params)
        rows = cursor.fetchall()
        cursor.close()

        tasks = [
            {
                "id": row[0],
                "title": row[1],
                "status": row[2],
                "priority": row[3],
                "assignee_id": row[4],
                "story_points": row[5],
                "sprint_id": row[6],
            }
            for row in rows
        ]

        return {"tasks": tasks, "count": len(tasks)}

    except Exception as e:
        logger.error(f"get_tasks error: {e}")
        return {"tasks": [], "error": str(e)}


def get_sprints(
    project_id: str,
    status: str = None,
    limit: int = 20
) -> Dict[str, Any]:
    """
    Get sprints for a project.

    Args:
        project_id: Project ID
        status: Filter by status
        limit: Max results

    Returns:
        List of sprints
    """
    db = _get_db()
    if not db:
        return {"sprints": [], "error": "Database not available"}

    try:
        cursor = db.cursor()

        query = """
            SELECT id, name, status, start_date, end_date, goal
            FROM task.sprints
            WHERE project_id = %s
        """
        params = [project_id]

        if status:
            query += " AND status = %s"
            params.append(status)

        query += " ORDER BY start_date DESC LIMIT %s"
        params.append(limit)

        cursor.execute(query, params)
        rows = cursor.fetchall()
        cursor.close()

        sprints = [
            {
                "id": row[0],
                "name": row[1],
                "status": row[2],
                "start_date": str(row[3]) if row[3] else None,
                "end_date": str(row[4]) if row[4] else None,
                "goal": row[5],
            }
            for row in rows
        ]

        return {"sprints": sprints, "count": len(sprints)}

    except Exception as e:
        logger.error(f"get_sprints error: {e}")
        return {"sprints": [], "error": str(e)}


def get_metrics(
    project_id: str,
    metric_types: List[str] = None
) -> Dict[str, Any]:
    """
    Get project metrics.

    Args:
        project_id: Project ID
        metric_types: Types of metrics to retrieve

    Returns:
        Metrics dict
    """
    # Calculate metrics from database
    db = _get_db()
    if not db:
        return {"metrics": {}, "error": "Database not available"}

    try:
        cursor = db.cursor()
        metrics = {}

        # Task counts by status
        cursor.execute(
            """
            SELECT status, COUNT(*)
            FROM task.tasks
            WHERE project_id = %s
            GROUP BY status
            """,
            (project_id,)
        )
        task_counts = dict(cursor.fetchall())
        metrics["tasks"] = {
            "total": sum(task_counts.values()),
            "by_status": task_counts,
        }

        # Sprint velocity (completed points per sprint)
        cursor.execute(
            """
            SELECT s.name, COALESCE(SUM(t.story_points), 0) as points
            FROM task.sprints s
            LEFT JOIN task.tasks t ON t.sprint_id = s.id AND t.status = 'DONE'
            WHERE s.project_id = %s AND s.status = 'COMPLETED'
            GROUP BY s.id, s.name
            ORDER BY s.end_date DESC
            LIMIT 5
            """,
            (project_id,)
        )
        velocity_data = cursor.fetchall()
        velocities = [row[1] for row in velocity_data]
        metrics["velocity"] = {
            "history": [{"sprint": row[0], "points": row[1]} for row in velocity_data],
            "average": sum(velocities) / len(velocities) if velocities else 0,
        }

        cursor.close()
        return {"metrics": metrics, "project_id": project_id}

    except Exception as e:
        logger.error(f"get_metrics error: {e}")
        return {"metrics": {}, "error": str(e)}


# Tool definitions

get_project_tool = ToolDefinition(
    name="get_project",
    description="Get project details by ID",
    category=ToolCategory.DATABASE,
    handler=get_project,
    input_schema={
        "type": "object",
        "properties": {
            "project_id": {"type": "string", "description": "Project ID"},
        },
        "required": ["project_id"],
    },
    output_schema={
        "type": "object",
        "properties": {
            "id": {"type": "string"},
            "name": {"type": "string"},
            "status": {"type": "string"},
            "progress": {"type": "number"},
        },
    },
    access_level=AccessLevel.PROJECT,
    rate_limit=120,
    tags=["project", "read"],
)

list_projects_tool = ToolDefinition(
    name="list_projects",
    description="List all projects with optional filtering",
    category=ToolCategory.DATABASE,
    handler=list_projects,
    input_schema={
        "type": "object",
        "properties": {
            "status": {"type": "string", "description": "Filter by status"},
            "limit": {"type": "integer", "default": 50},
            "offset": {"type": "integer", "default": 0},
        },
    },
    access_level=AccessLevel.TENANT,
    rate_limit=60,
    tags=["project", "list", "read"],
)

get_tasks_tool = ToolDefinition(
    name="get_tasks",
    description="Get tasks for a project",
    category=ToolCategory.DATABASE,
    handler=get_tasks,
    input_schema={
        "type": "object",
        "properties": {
            "project_id": {"type": "string", "description": "Project ID"},
            "status": {"type": "string", "description": "Filter by status"},
            "sprint_id": {"type": "string", "description": "Filter by sprint"},
            "limit": {"type": "integer", "default": 100},
        },
        "required": ["project_id"],
    },
    access_level=AccessLevel.PROJECT,
    rate_limit=120,
    tags=["task", "read"],
)

get_sprints_tool = ToolDefinition(
    name="get_sprints",
    description="Get sprints for a project",
    category=ToolCategory.DATABASE,
    handler=get_sprints,
    input_schema={
        "type": "object",
        "properties": {
            "project_id": {"type": "string", "description": "Project ID"},
            "status": {"type": "string", "description": "Filter by status"},
            "limit": {"type": "integer", "default": 20},
        },
        "required": ["project_id"],
    },
    access_level=AccessLevel.PROJECT,
    rate_limit=60,
    tags=["sprint", "read"],
)

get_metrics_tool = ToolDefinition(
    name="get_metrics",
    description="Get project metrics (tasks, velocity, etc.)",
    category=ToolCategory.DATABASE,
    handler=get_metrics,
    input_schema={
        "type": "object",
        "properties": {
            "project_id": {"type": "string", "description": "Project ID"},
            "metric_types": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Types of metrics to retrieve",
            },
        },
        "required": ["project_id"],
    },
    access_level=AccessLevel.PROJECT,
    rate_limit=30,
    tags=["metrics", "analytics", "read"],
)


def register_database_tools():
    """Register all database tools with the registry."""
    registry = get_registry()
    registry.register(get_project_tool)
    registry.register(list_projects_tool)
    registry.register(get_tasks_tool)
    registry.register(get_sprints_tool)
    registry.register(get_metrics_tool)
    logger.info("Registered 5 database tools")
