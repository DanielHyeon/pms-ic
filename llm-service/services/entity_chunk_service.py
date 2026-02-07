"""
Entity to Chunk Conversion Service

Converts PMS entities (Project, Sprint, Task, etc.) from PostgreSQL
to RAG-searchable Chunks in Neo4j with proper access control.

This enables AI assistant to answer questions about actual project status
instead of hallucinating fake data.

Reference: docs/PMS 최적화 방안.md
"""

import os
import logging
import uuid
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from datetime import datetime, date
from decimal import Decimal
from enum import Enum

logger = logging.getLogger(__name__)

# =============================================================================
# Global Part ID constant - used for chunks visible to all project members
# Explicitly marks global chunks instead of using NULL (prevents accidental exposure)
# =============================================================================
GLOBAL_PART_ID = "GLOBAL"


# =============================================================================
# Access Level Configuration
# =============================================================================

class EntityAccessLevel(Enum):
    """Access levels for different entity types and data sensitivity"""
    # Public to all project members (level 1)
    PROJECT_STATUS = 1
    SPRINT_STATUS = 1
    TASK_STATUS = 1
    USER_STORY_STATUS = 1
    PHASE_STATUS = 1

    # Requires BA/QA level (level 2)
    ISSUE_DETAILS = 2
    DELIVERABLE_STATUS = 2

    # Requires PM level (level 3)
    PROJECT_BUDGET = 3
    SPRINT_METRICS = 3
    RISK_DETAILS = 3

    # Requires PMO_HEAD level (level 4)
    PORTFOLIO_SUMMARY = 4
    STRATEGIC_METRICS = 4


# Role to access level mapping (same as rag_service_neo4j.py)
ROLE_ACCESS_LEVELS = {
    "ADMIN": 6,
    "SPONSOR": 5,
    "PMO_HEAD": 4,
    "PM": 3,
    "BUSINESS_ANALYST": 2,
    "QA": 2,
    "DEVELOPER": 1,
    "MEMBER": 1,
    "AUDITOR": 0,
}


# =============================================================================
# Entity Type Definitions
# =============================================================================

class ChunkEntityType(Enum):
    """Entity types that can be converted to chunks"""
    PROJECT_STATUS = "project_status"
    SPRINT_STATUS = "sprint_status"
    TASK_SUMMARY = "task_summary"
    USER_STORY_SUMMARY = "user_story_summary"
    PHASE_STATUS = "phase_status"
    ISSUE_SUMMARY = "issue_summary"
    DELIVERABLE_STATUS = "deliverable_status"
    DASHBOARD_KPI = "dashboard_kpi"
    EPIC_STATUS = "epic_status"
    WBS_STATUS = "wbs_status"


@dataclass
class EntityChunk:
    """Represents a chunk generated from an entity

    Note: part_id defaults to GLOBAL_PART_ID (not None) for safety.
    Using NULL/None risks accidental exposure of chunks to all users.
    Set part_id explicitly for Part-specific chunks.
    """
    chunk_id: str
    content: str
    entity_type: str
    entity_id: str
    project_id: str
    access_level: int
    title: str
    part_id: str = GLOBAL_PART_ID  # Default to GLOBAL for project-level visibility (not None for safety)
    metadata: Dict[str, Any] = field(default_factory=dict)
    embedding: Optional[List[float]] = None
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())


# =============================================================================
# Text Generators for Each Entity Type
# =============================================================================

class EntityTextGenerator:
    """Generates natural language text from entity data for RAG search"""

    @staticmethod
    def generate_project_status(project: Dict, kpi: Optional[Dict] = None) -> str:
        """Generate project status text"""
        # Include common search terms for better RAG retrieval
        lines = [
            f"[프로젝트 진행 현황] {project.get('name', 'Unknown')}",
            f"",
            f"현재 프로젝트 진행 상황 요약:",
            f"프로젝트명: {project.get('name', 'N/A')}",
            f"현재 상태: {project.get('status', 'N/A')}",
            f"전체 진행률: {project.get('progress', 0)}%",
            f"시작일: {project.get('start_date', 'N/A')}",
            f"종료예정일: {project.get('end_date', 'N/A')}",
        ]

        if project.get('description'):
            lines.append(f"설명: {project.get('description')[:200]}")

        if kpi:
            lines.extend([
                "",
                "[스프린트 현황]",
                f"총 스프린트: {kpi.get('total_sprints', 0)}개",
                f"진행 중: {kpi.get('active_sprints', 0)}개",
                f"완료: {kpi.get('completed_sprints', 0)}개",
                "",
                "[태스크 현황]",
                f"총 태스크: {kpi.get('total_tasks', 0)}개",
                f"완료: {kpi.get('completed_tasks', 0)}개",
                f"진행 중: {kpi.get('in_progress_tasks', 0)}개",
                f"대기 중: {kpi.get('todo_tasks', 0)}개",
                f"완료율: {kpi.get('task_completion_rate', 0)}%",
                "",
                "[스토리 현황]",
                f"총 스토리: {kpi.get('total_stories', 0)}개",
                f"완료: {kpi.get('completed_stories', 0)}개",
                f"총 스토리포인트: {kpi.get('total_story_points', 0)}",
                f"완료 스토리포인트: {kpi.get('completed_story_points', 0)}",
            ])

            if kpi.get('open_issues', 0) > 0:
                lines.extend([
                    "",
                    "[이슈 현황]",
                    f"미해결 이슈: {kpi.get('open_issues', 0)}개",
                    f"고우선순위 이슈: {kpi.get('high_priority_issues', 0)}개",
                ])

        return "\n".join(lines)

    @staticmethod
    def generate_sprint_status(sprint: Dict, project_name: str = "") -> str:
        """Generate sprint status text"""
        status_map = {
            "PLANNED": "계획됨",
            "ACTIVE": "진행 중",
            "COMPLETED": "완료",
        }
        status_kr = status_map.get(sprint.get('status', ''), sprint.get('status', 'N/A'))

        # Include common search terms for better RAG retrieval
        lines = [
            f"[스프린트 진행 현황] {sprint.get('name', 'Unknown')}",
            "",
            f"현재 스프린트 진행 상황:",
        ]

        if project_name:
            lines.append(f"프로젝트: {project_name}")

        lines.extend([
            f"스프린트명: {sprint.get('name', 'N/A')}",
            f"상태: {status_kr}",
            f"목표: {sprint.get('goal', 'N/A')}",
            f"시작일: {sprint.get('start_date', 'N/A')}",
            f"종료일: {sprint.get('end_date', 'N/A')}",
        ])

        if sprint.get('conwip_limit'):
            lines.append(f"WIP 제한: {sprint.get('conwip_limit')}")

        return "\n".join(lines)

    @staticmethod
    def generate_task_summary(tasks: List[Dict], sprint_name: str = "", project_name: str = "") -> str:
        """Generate task summary text for a sprint or project"""
        if not tasks:
            return ""

        # Group by status
        by_status = {}
        for task in tasks:
            status = task.get('status', 'UNKNOWN')
            if status not in by_status:
                by_status[status] = []
            by_status[status].append(task)

        lines = ["[태스크 요약]", ""]

        if project_name:
            lines.append(f"프로젝트: {project_name}")
        if sprint_name:
            lines.append(f"스프린트: {sprint_name}")

        lines.append(f"총 태스크: {len(tasks)}개")
        lines.append("")

        status_order = ["IN_PROGRESS", "TODO", "REVIEW", "DONE", "BACKLOG"]
        status_names = {
            "IN_PROGRESS": "진행 중",
            "TODO": "대기",
            "REVIEW": "검토 중",
            "DONE": "완료",
            "BACKLOG": "백로그",
        }

        for status in status_order:
            if status in by_status:
                status_tasks = by_status[status]
                lines.append(f"[{status_names.get(status, status)}] ({len(status_tasks)}개)")
                for task in status_tasks[:5]:  # Limit to 5 per status
                    priority = task.get('priority', '')
                    priority_mark = "🔴" if priority == "CRITICAL" else "🟠" if priority == "HIGH" else ""
                    lines.append(f"  - {priority_mark}{task.get('title', 'Untitled')}")
                if len(status_tasks) > 5:
                    lines.append(f"  ... 외 {len(status_tasks) - 5}개")
                lines.append("")

        return "\n".join(lines)

    @staticmethod
    def generate_user_story_summary(stories: List[Dict], sprint_name: str = "", project_name: str = "") -> str:
        """Generate user story summary text"""
        if not stories:
            return ""

        total_points = sum(s.get('story_points', 0) or 0 for s in stories)
        completed = [s for s in stories if s.get('status') == 'DONE']
        completed_points = sum(s.get('story_points', 0) or 0 for s in completed)

        lines = ["[사용자 스토리 요약]", ""]

        if project_name:
            lines.append(f"프로젝트: {project_name}")
        if sprint_name:
            lines.append(f"스프린트: {sprint_name}")

        lines.extend([
            f"총 스토리: {len(stories)}개",
            f"완료: {len(completed)}개",
            f"총 스토리포인트: {total_points}",
            f"완료 포인트: {completed_points}",
            "",
        ])

        # List in-progress stories
        in_progress = [s for s in stories if s.get('status') == 'IN_PROGRESS']
        if in_progress:
            lines.append("[진행 중인 스토리]")
            for story in in_progress[:5]:
                points = story.get('story_points', 0) or 0
                lines.append(f"  - {story.get('title', 'Untitled')} ({points}pt)")
            lines.append("")

        return "\n".join(lines)

    @staticmethod
    def generate_phase_status(phase: Dict, project_name: str = "") -> str:
        """Generate phase status text"""
        lines = [
            f"[단계 현황] {phase.get('name', 'Unknown')}",
            "",
        ]

        if project_name:
            lines.append(f"프로젝트: {project_name}")

        lines.extend([
            f"단계명: {phase.get('name', 'N/A')}",
            f"상태: {phase.get('status', 'N/A')}",
            f"진행률: {phase.get('progress', 0)}%",
            f"시작일: {phase.get('start_date', 'N/A')}",
            f"종료일: {phase.get('end_date', 'N/A')}",
        ])

        if phase.get('gate_status'):
            lines.append(f"게이트 상태: {phase.get('gate_status')}")

        if phase.get('description'):
            lines.append(f"설명: {phase.get('description')[:200]}")

        return "\n".join(lines)

    @staticmethod
    def generate_issue_summary(issues: List[Dict], project_name: str = "") -> str:
        """Generate issue summary text"""
        if not issues:
            return ""

        open_issues = [i for i in issues if i.get('status') != 'CLOSED']
        critical = [i for i in open_issues if i.get('priority') in ['CRITICAL', 'HIGH']]

        lines = ["[이슈 현황]", ""]

        if project_name:
            lines.append(f"프로젝트: {project_name}")

        lines.extend([
            f"총 이슈: {len(issues)}개",
            f"미해결: {len(open_issues)}개",
            f"긴급/높음: {len(critical)}개",
            "",
        ])

        if critical:
            lines.append("[긴급 이슈]")
            for issue in critical[:5]:
                lines.append(f"  - [{issue.get('priority')}] {issue.get('title', 'Untitled')}")
            lines.append("")

        return "\n".join(lines)

    @staticmethod
    def generate_epic_status(epic: Dict, project_name: str = "") -> str:
        """Generate epic status text"""
        lines = [
            f"[에픽 현황] {epic.get('name', 'Unknown')}",
            "",
        ]

        if project_name:
            lines.append(f"프로젝트: {project_name}")

        lines.extend([
            f"에픽명: {epic.get('name', 'N/A')}",
            f"상태: {epic.get('status', 'N/A')}",
            f"진행률: {epic.get('progress', 0)}%",
            f"목표: {epic.get('goal', 'N/A')}",
            f"우선순위: {epic.get('priority', 'N/A')}",
            f"비즈니스 가치: {epic.get('business_value', 'N/A')}",
        ])

        if epic.get('total_story_points'):
            lines.append(f"총 스토리포인트: {epic.get('total_story_points')}")

        if epic.get('target_completion_date'):
            lines.append(f"목표 완료일: {epic.get('target_completion_date')}")

        if epic.get('description'):
            lines.append(f"설명: {epic.get('description')[:200]}")

        return "\n".join(lines)

    @staticmethod
    def generate_wbs_group_status(group: Dict, project_name: str = "", phase_name: str = "") -> str:
        """Generate WBS group status text for RAG search"""
        lines = [
            f"[WBS 그룹 현황] {group.get('name', 'Unknown')}",
            "",
        ]

        if project_name:
            lines.append(f"프로젝트: {project_name}")
        if phase_name:
            lines.append(f"단계: {phase_name}")

        progress = group.get('progress')
        progress_str = f"{progress}%" if progress is not None else "미설정"

        lines.extend([
            f"WBS 그룹명: {group.get('name', 'N/A')}",
            f"코드: {group.get('code', 'N/A')}",
            f"상태: {group.get('status', 'N/A')}",
            f"진행률: {progress_str}",
            f"가중치: {group.get('weight', 'N/A')}",
            f"시작일: {group.get('planned_start_date', 'N/A')}",
            f"종료일: {group.get('planned_end_date', 'N/A')}",
        ])

        if group.get('item_count') is not None:
            lines.append(f"하위 항목 수: {group.get('item_count')}개")

        if group.get('description'):
            lines.append(f"설명: {group.get('description')[:300]}")

        return "\n".join(lines)

    @staticmethod
    def generate_wbs_item_status(
        item: Dict, project_name: str = "",
        group_name: str = "", phase_name: str = "",
    ) -> str:
        """Generate WBS item status text for RAG search"""
        lines = [
            f"[WBS 항목 현황] {item.get('name', 'Unknown')}",
            "",
        ]

        if project_name:
            lines.append(f"프로젝트: {project_name}")
        if phase_name:
            lines.append(f"단계: {phase_name}")
        if group_name:
            lines.append(f"WBS 그룹: {group_name}")

        progress = item.get('progress')
        progress_str = f"{progress}%" if progress is not None else "미설정"

        lines.extend([
            f"WBS 항목명: {item.get('name', 'N/A')}",
            f"코드: {item.get('code', 'N/A')}",
            f"상태: {item.get('status', 'N/A')}",
            f"진행률: {progress_str}",
            f"가중치: {item.get('weight', 'N/A')}",
            f"시작일: {item.get('planned_start_date', 'N/A')}",
            f"종료일: {item.get('planned_end_date', 'N/A')}",
        ])

        if item.get('estimated_hours') is not None:
            lines.append(f"예상 공수: {item.get('estimated_hours')}시간")
        if item.get('actual_hours') is not None:
            lines.append(f"실제 공수: {item.get('actual_hours')}시간")
        if item.get('task_count') is not None:
            lines.append(f"하위 태스크 수: {item.get('task_count')}개")

        if item.get('description'):
            lines.append(f"설명: {item.get('description')[:300]}")

        return "\n".join(lines)


# =============================================================================
# Entity Chunk Service
# =============================================================================

class EntityChunkService:
    """
    Service for converting PMS entities to RAG-searchable chunks.

    Usage:
        service = EntityChunkService()
        service.initialize()

        # Full sync - converts all entities to chunks
        result = service.sync_all_entities()

        # Sync specific project
        result = service.sync_project_entities(project_id)
    """

    def __init__(
        self,
        pg_host: str = None,
        pg_port: int = None,
        pg_database: str = None,
        pg_user: str = None,
        pg_password: str = None,
        neo4j_uri: str = None,
        neo4j_user: str = None,
        neo4j_password: str = None,
    ):
        # PostgreSQL config
        self.pg_host = pg_host or os.getenv("PG_HOST", "postgres")
        self.pg_port = pg_port or int(os.getenv("PG_PORT", "5432"))
        self.pg_database = pg_database or os.getenv("PG_DATABASE", "pms_db")
        self.pg_user = pg_user or os.getenv("PG_USER", "pms_user")
        self.pg_password = pg_password or os.getenv("PG_PASSWORD", "pms_password")

        # Neo4j config
        self.neo4j_uri = neo4j_uri or os.getenv("NEO4J_URI", "bolt://neo4j:7687")
        self.neo4j_user = neo4j_user or os.getenv("NEO4J_USER", "neo4j")
        self.neo4j_password = neo4j_password or os.getenv("NEO4J_PASSWORD", "pmspassword123")

        self._pg_conn = None
        self._neo4j_driver = None
        self._embedding_model = None
        self._initialized = False

        self.text_generator = EntityTextGenerator()

    def initialize(self) -> bool:
        """Initialize connections and embedding model"""
        if self._initialized:
            return True

        try:
            # Initialize Neo4j
            from neo4j import GraphDatabase
            self._neo4j_driver = GraphDatabase.driver(
                self.neo4j_uri,
                auth=(self.neo4j_user, self.neo4j_password)
            )
            logger.info(f"Connected to Neo4j at {self.neo4j_uri}")

            # Initialize embedding model
            from sentence_transformers import SentenceTransformer
            embedding_device = os.getenv("EMBEDDING_DEVICE", "cpu")
            self._embedding_model = SentenceTransformer(
                'intfloat/multilingual-e5-large',
                device=embedding_device
            )
            logger.info(f"Embedding model loaded on {embedding_device}")

            # Create indexes for entity chunks
            self._create_indexes()

            self._initialized = True
            return True

        except Exception as e:
            logger.error(f"Failed to initialize EntityChunkService: {e}")
            return False

    def _create_indexes(self):
        """Create Neo4j indexes for entity chunks"""
        with self._neo4j_driver.session() as session:
            indexes = [
                "CREATE INDEX IF NOT EXISTS FOR (c:Chunk) ON (c.entity_type)",
                "CREATE INDEX IF NOT EXISTS FOR (c:Chunk) ON (c.entity_id)",
                "CREATE INDEX IF NOT EXISTS FOR (c:Chunk) ON (c.project_id, c.entity_type)",
                "CREATE INDEX IF NOT EXISTS FOR (c:Chunk) ON (c.part_id)",  # Part-based filtering
                "CREATE INDEX IF NOT EXISTS FOR (c:Chunk) ON (c.project_id, c.part_id)",  # Combined Part filter
            ]
            for index in indexes:
                try:
                    session.run(index)
                except Exception as e:
                    logger.debug(f"Index creation: {e}")

    def _get_pg_connection(self):
        """Get PostgreSQL connection"""
        if self._pg_conn is None or self._pg_conn.closed:
            import psycopg2
            self._pg_conn = psycopg2.connect(
                host=self.pg_host,
                port=self.pg_port,
                database=self.pg_database,
                user=self.pg_user,
                password=self.pg_password,
            )
        return self._pg_conn

    def _generate_embedding(self, text: str) -> List[float]:
        """Generate embedding vector for text"""
        embedding_text = f"passage: {text}"
        return self._embedding_model.encode(embedding_text).tolist()

    def _fetch_query(self, query: str, params: tuple = None) -> List[Dict]:
        """Execute query and return results as list of dicts"""
        conn = self._get_pg_connection()
        cursor = conn.cursor()
        try:
            cursor.execute(query, params or ())
            columns = [desc[0] for desc in cursor.description]
            results = []
            for row in cursor.fetchall():
                record = {}
                for i, col in enumerate(columns):
                    value = row[i]
                    if isinstance(value, datetime):
                        value = value.isoformat()
                    elif isinstance(value, date):
                        value = value.isoformat()
                    elif isinstance(value, Decimal):
                        value = float(value)
                    record[col] = value
                results.append(record)
            return results
        finally:
            cursor.close()

    def _save_chunk(self, chunk: EntityChunk) -> bool:
        """Save chunk to Neo4j

        Note: part_id should never be None - use GLOBAL_PART_ID for project-level visibility.
        This prevents accidental data exposure from forgotten part_id assignments.
        """
        try:
            # Safety check: ensure part_id is never None (use GLOBAL_PART_ID as fallback)
            safe_part_id = chunk.part_id if chunk.part_id else GLOBAL_PART_ID
            if chunk.part_id is None:
                logger.warning(f"Chunk {chunk.chunk_id} has None part_id, defaulting to GLOBAL")

            with self._neo4j_driver.session() as session:
                session.run("""
                    MERGE (c:Chunk {chunk_id: $chunk_id})
                    SET c.content = $content,
                        c.title = $title,
                        c.entity_type = $entity_type,
                        c.entity_id = $entity_id,
                        c.project_id = $project_id,
                        c.part_id = $part_id,
                        c.access_level = $access_level,
                        c.embedding = $embedding,
                        c.structure_type = 'entity',
                        c.synced_at = datetime()
                """,
                    chunk_id=chunk.chunk_id,
                    content=chunk.content,
                    title=chunk.title,
                    entity_type=chunk.entity_type,
                    entity_id=chunk.entity_id,
                    project_id=chunk.project_id,
                    part_id=safe_part_id,  # Never None - GLOBAL for project-level
                    access_level=chunk.access_level,
                    embedding=chunk.embedding,
                )

                # Link to Project node if exists
                session.run("""
                    MATCH (c:Chunk {chunk_id: $chunk_id})
                    MATCH (p:Project {id: $project_id})
                    MERGE (p)-[:HAS_ENTITY_CHUNK]->(c)
                """, chunk_id=chunk.chunk_id, project_id=chunk.project_id)

            return True
        except Exception as e:
            logger.error(f"Failed to save chunk {chunk.chunk_id}: {e}")
            return False

    def _delete_old_chunks(self, project_id: str, entity_type: str):
        """Delete old entity chunks before re-syncing"""
        with self._neo4j_driver.session() as session:
            session.run("""
                MATCH (c:Chunk)
                WHERE c.project_id = $project_id
                  AND c.entity_type = $entity_type
                  AND c.structure_type = 'entity'
                DETACH DELETE c
            """, project_id=project_id, entity_type=entity_type)

    # =========================================================================
    # Sync Methods
    # =========================================================================

    def sync_project_status(self, project_id: str) -> int:
        """Sync project status chunk for a specific project"""
        # Fetch project
        projects = self._fetch_query("""
            SELECT id, name, description, status, start_date, end_date, progress, budget
            FROM project.projects WHERE id = %s
        """, (project_id,))

        if not projects:
            logger.warning(f"Project {project_id} not found")
            return 0

        project = projects[0]

        # Fetch KPI data
        kpis = self._fetch_query("""
            WITH task_stats AS (
                SELECT
                    c.project_id,
                    COUNT(t.id) AS total_tasks,
                    COUNT(CASE WHEN t.status = 'DONE' THEN 1 END) AS completed_tasks,
                    COUNT(CASE WHEN t.status = 'IN_PROGRESS' THEN 1 END) AS in_progress_tasks,
                    COUNT(CASE WHEN t.status = 'TODO' THEN 1 END) AS todo_tasks
                FROM task.tasks t
                JOIN task.kanban_columns c ON t.column_id = c.id
                WHERE c.project_id = %s
                GROUP BY c.project_id
            ),
            story_stats AS (
                SELECT
                    project_id,
                    COUNT(id) AS total_stories,
                    COUNT(CASE WHEN status = 'DONE' THEN 1 END) AS completed_stories,
                    COALESCE(SUM(story_points), 0) AS total_story_points,
                    COALESCE(SUM(CASE WHEN status = 'DONE' THEN story_points ELSE 0 END), 0) AS completed_story_points
                FROM task.user_stories
                WHERE project_id = %s
                GROUP BY project_id
            ),
            sprint_stats AS (
                SELECT
                    project_id,
                    COUNT(id) AS total_sprints,
                    COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) AS active_sprints,
                    COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) AS completed_sprints
                FROM task.sprints
                WHERE project_id = %s
                GROUP BY project_id
            ),
            issue_stats AS (
                SELECT
                    project_id,
                    COUNT(CASE WHEN status != 'CLOSED' THEN 1 END) AS open_issues,
                    COUNT(CASE WHEN priority IN ('CRITICAL', 'HIGH') AND status != 'CLOSED' THEN 1 END) AS high_priority_issues
                FROM project.issues
                WHERE project_id = %s
                GROUP BY project_id
            )
            SELECT
                COALESCE(ts.total_tasks, 0) AS total_tasks,
                COALESCE(ts.completed_tasks, 0) AS completed_tasks,
                COALESCE(ts.in_progress_tasks, 0) AS in_progress_tasks,
                COALESCE(ts.todo_tasks, 0) AS todo_tasks,
                COALESCE(ss.total_stories, 0) AS total_stories,
                COALESCE(ss.completed_stories, 0) AS completed_stories,
                COALESCE(ss.total_story_points, 0) AS total_story_points,
                COALESCE(ss.completed_story_points, 0) AS completed_story_points,
                COALESCE(sps.total_sprints, 0) AS total_sprints,
                COALESCE(sps.active_sprints, 0) AS active_sprints,
                COALESCE(sps.completed_sprints, 0) AS completed_sprints,
                COALESCE(is2.open_issues, 0) AS open_issues,
                COALESCE(is2.high_priority_issues, 0) AS high_priority_issues,
                CASE WHEN COALESCE(ts.total_tasks, 0) > 0
                    THEN ROUND(100.0 * COALESCE(ts.completed_tasks, 0) / ts.total_tasks, 1)
                    ELSE 0 END AS task_completion_rate
            FROM (SELECT 1) dummy
            LEFT JOIN task_stats ts ON TRUE
            LEFT JOIN story_stats ss ON TRUE
            LEFT JOIN sprint_stats sps ON TRUE
            LEFT JOIN issue_stats is2 ON TRUE
        """, (project_id, project_id, project_id, project_id))

        kpi = kpis[0] if kpis else {}

        # Generate text and chunk
        content = self.text_generator.generate_project_status(project, kpi)

        # Delete old chunk
        self._delete_old_chunks(project_id, ChunkEntityType.PROJECT_STATUS.value)

        # Create new chunk
        chunk = EntityChunk(
            chunk_id=f"entity_project_status_{project_id}",
            content=content,
            entity_type=ChunkEntityType.PROJECT_STATUS.value,
            entity_id=project_id,
            project_id=project_id,
            access_level=EntityAccessLevel.PROJECT_STATUS.value,
            title=f"프로젝트 현황: {project.get('name', 'Unknown')}",
            embedding=self._generate_embedding(content),
        )

        if self._save_chunk(chunk):
            logger.info(f"Synced project status chunk for {project_id}")
            return 1
        return 0

    def sync_sprint_statuses(self, project_id: str) -> int:
        """Sync sprint status chunks for a project"""
        # Get project name
        projects = self._fetch_query(
            "SELECT name FROM project.projects WHERE id = %s", (project_id,)
        )
        project_name = projects[0]['name'] if projects else ""

        # Fetch sprints
        sprints = self._fetch_query("""
            SELECT id, name, goal, status, start_date, end_date,
                   project_id, conwip_limit, enable_wip_validation
            FROM task.sprints
            WHERE project_id = %s
            ORDER BY start_date DESC
        """, (project_id,))

        if not sprints:
            return 0

        # Delete old chunks
        self._delete_old_chunks(project_id, ChunkEntityType.SPRINT_STATUS.value)

        count = 0
        for sprint in sprints:
            content = self.text_generator.generate_sprint_status(sprint, project_name)

            chunk = EntityChunk(
                chunk_id=f"entity_sprint_status_{sprint['id']}",
                content=content,
                entity_type=ChunkEntityType.SPRINT_STATUS.value,
                entity_id=sprint['id'],
                project_id=project_id,
                access_level=EntityAccessLevel.SPRINT_STATUS.value,
                title=f"스프린트 현황: {sprint.get('name', 'Unknown')}",
                embedding=self._generate_embedding(content),
            )

            if self._save_chunk(chunk):
                count += 1

        logger.info(f"Synced {count} sprint status chunks for {project_id}")
        return count

    def sync_task_summaries(self, project_id: str) -> int:
        """Sync task summary chunks per sprint"""
        # Get project name
        projects = self._fetch_query(
            "SELECT name FROM project.projects WHERE id = %s", (project_id,)
        )
        project_name = projects[0]['name'] if projects else ""

        # Fetch sprints
        sprints = self._fetch_query("""
            SELECT id, name FROM task.sprints WHERE project_id = %s
        """, (project_id,))

        # Delete old chunks
        self._delete_old_chunks(project_id, ChunkEntityType.TASK_SUMMARY.value)

        count = 0
        for sprint in sprints:
            # Fetch tasks for this sprint
            tasks = self._fetch_query("""
                SELECT t.id, t.title, t.status, t.priority
                FROM task.tasks t
                JOIN task.kanban_columns c ON t.column_id = c.id
                WHERE t.sprint_id = %s
                ORDER BY
                    CASE t.priority
                        WHEN 'CRITICAL' THEN 1
                        WHEN 'HIGH' THEN 2
                        WHEN 'MEDIUM' THEN 3
                        ELSE 4
                    END,
                    t.created_at DESC
            """, (sprint['id'],))

            if not tasks:
                continue

            content = self.text_generator.generate_task_summary(
                tasks, sprint['name'], project_name
            )

            chunk = EntityChunk(
                chunk_id=f"entity_task_summary_{sprint['id']}",
                content=content,
                entity_type=ChunkEntityType.TASK_SUMMARY.value,
                entity_id=sprint['id'],
                project_id=project_id,
                access_level=EntityAccessLevel.TASK_STATUS.value,
                title=f"태스크 요약: {sprint.get('name', 'Unknown')}",
                embedding=self._generate_embedding(content),
            )

            if self._save_chunk(chunk):
                count += 1

        logger.info(f"Synced {count} task summary chunks for {project_id}")
        return count

    def sync_user_story_summaries(self, project_id: str) -> int:
        """Sync user story summary chunks per sprint"""
        # Get project name
        projects = self._fetch_query(
            "SELECT name FROM project.projects WHERE id = %s", (project_id,)
        )
        project_name = projects[0]['name'] if projects else ""

        # Fetch sprints
        sprints = self._fetch_query("""
            SELECT id, name FROM task.sprints WHERE project_id = %s
        """, (project_id,))

        # Delete old chunks
        self._delete_old_chunks(project_id, ChunkEntityType.USER_STORY_SUMMARY.value)

        count = 0
        for sprint in sprints:
            # Fetch stories for this sprint
            stories = self._fetch_query("""
                SELECT id, title, status, priority, story_points
                FROM task.user_stories
                WHERE sprint_id = %s
                ORDER BY priority, created_at DESC
            """, (sprint['id'],))

            if not stories:
                continue

            content = self.text_generator.generate_user_story_summary(
                stories, sprint['name'], project_name
            )

            chunk = EntityChunk(
                chunk_id=f"entity_story_summary_{sprint['id']}",
                content=content,
                entity_type=ChunkEntityType.USER_STORY_SUMMARY.value,
                entity_id=sprint['id'],
                project_id=project_id,
                access_level=EntityAccessLevel.USER_STORY_STATUS.value,
                title=f"스토리 요약: {sprint.get('name', 'Unknown')}",
                embedding=self._generate_embedding(content),
            )

            if self._save_chunk(chunk):
                count += 1

        logger.info(f"Synced {count} user story summary chunks for {project_id}")
        return count

    def sync_phase_statuses(self, project_id: str) -> int:
        """Sync phase status chunks for a project"""
        # Get project name
        projects = self._fetch_query(
            "SELECT name FROM project.projects WHERE id = %s", (project_id,)
        )
        project_name = projects[0]['name'] if projects else ""

        # Fetch phases
        phases = self._fetch_query("""
            SELECT id, name, description, status, start_date, end_date,
                   progress, gate_status, track_type
            FROM project.phases
            WHERE project_id = %s
            ORDER BY order_num
        """, (project_id,))

        if not phases:
            return 0

        # Delete old chunks
        self._delete_old_chunks(project_id, ChunkEntityType.PHASE_STATUS.value)

        count = 0
        for phase in phases:
            content = self.text_generator.generate_phase_status(phase, project_name)

            chunk = EntityChunk(
                chunk_id=f"entity_phase_status_{phase['id']}",
                content=content,
                entity_type=ChunkEntityType.PHASE_STATUS.value,
                entity_id=phase['id'],
                project_id=project_id,
                access_level=EntityAccessLevel.PHASE_STATUS.value,
                title=f"단계 현황: {phase.get('name', 'Unknown')}",
                embedding=self._generate_embedding(content),
            )

            if self._save_chunk(chunk):
                count += 1

        logger.info(f"Synced {count} phase status chunks for {project_id}")
        return count

    def sync_issue_summary(self, project_id: str) -> int:
        """Sync issue summary chunk for a project"""
        # Get project name
        projects = self._fetch_query(
            "SELECT name FROM project.projects WHERE id = %s", (project_id,)
        )
        project_name = projects[0]['name'] if projects else ""

        # Fetch issues
        issues = self._fetch_query("""
            SELECT id, title, status, priority, issue_type
            FROM project.issues
            WHERE project_id = %s
            ORDER BY
                CASE priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 ELSE 3 END,
                created_at DESC
        """, (project_id,))

        if not issues:
            return 0

        # Delete old chunks
        self._delete_old_chunks(project_id, ChunkEntityType.ISSUE_SUMMARY.value)

        content = self.text_generator.generate_issue_summary(issues, project_name)

        chunk = EntityChunk(
            chunk_id=f"entity_issue_summary_{project_id}",
            content=content,
            entity_type=ChunkEntityType.ISSUE_SUMMARY.value,
            entity_id=project_id,
            project_id=project_id,
            access_level=EntityAccessLevel.ISSUE_DETAILS.value,
            title=f"이슈 현황: {project_name}",
            embedding=self._generate_embedding(content),
        )

        if self._save_chunk(chunk):
            logger.info(f"Synced issue summary chunk for {project_id}")
            return 1
        return 0

    def sync_epic_statuses(self, project_id: str) -> int:
        """Sync epic status chunks for a project"""
        # Get project name
        projects = self._fetch_query(
            "SELECT name FROM project.projects WHERE id = %s", (project_id,)
        )
        project_name = projects[0]['name'] if projects else ""

        # Fetch epics
        epics = self._fetch_query("""
            SELECT id, name, description, status, goal, progress,
                   priority, business_value, total_story_points,
                   target_completion_date
            FROM project.epics
            WHERE project_id = %s
            ORDER BY priority, created_at
        """, (project_id,))

        if not epics:
            return 0

        # Delete old chunks
        self._delete_old_chunks(project_id, ChunkEntityType.EPIC_STATUS.value)

        count = 0
        for epic in epics:
            content = self.text_generator.generate_epic_status(epic, project_name)

            chunk = EntityChunk(
                chunk_id=f"entity_epic_status_{epic['id']}",
                content=content,
                entity_type=ChunkEntityType.EPIC_STATUS.value,
                entity_id=epic['id'],
                project_id=project_id,
                access_level=EntityAccessLevel.PROJECT_STATUS.value,
                title=f"에픽 현황: {epic.get('name', 'Unknown')}",
                embedding=self._generate_embedding(content),
            )

            if self._save_chunk(chunk):
                count += 1

        logger.info(f"Synced {count} epic status chunks for {project_id}")
        return count

    def sync_wbs_statuses(self, project_id: str) -> int:
        """Sync WBS group and item status chunks for a project"""
        # Get project name
        projects = self._fetch_query(
            "SELECT name FROM project.projects WHERE id = %s", (project_id,)
        )
        project_name = projects[0]['name'] if projects else ""

        # Delete old WBS chunks
        self._delete_old_chunks(project_id, ChunkEntityType.WBS_STATUS.value)

        count = 0

        # --- WBS Groups ---
        groups = self._fetch_query("""
            SELECT wg.id, wg.code, wg.name, wg.description, wg.status,
                   wg.progress, wg.weight,
                   wg.planned_start_date, wg.planned_end_date,
                   p.name AS phase_name,
                   (SELECT COUNT(*) FROM project.wbs_items wi
                    WHERE wi.group_id = wg.id) AS item_count
            FROM project.wbs_groups wg
            LEFT JOIN project.phases p ON wg.phase_id = p.id
            WHERE p.project_id = %s
            ORDER BY p.order_num, wg.order_num
        """, (project_id,))

        for group in groups:
            content = self.text_generator.generate_wbs_group_status(
                group, project_name, group.get('phase_name', '')
            )

            chunk = EntityChunk(
                chunk_id=f"entity_wbs_group_{group['id']}",
                content=content,
                entity_type=ChunkEntityType.WBS_STATUS.value,
                entity_id=group['id'],
                project_id=project_id,
                access_level=EntityAccessLevel.PROJECT_STATUS.value,
                title=f"WBS 그룹: {group.get('name', 'Unknown')}",
                embedding=self._generate_embedding(content),
            )

            if self._save_chunk(chunk):
                count += 1

        # --- WBS Items ---
        items = self._fetch_query("""
            SELECT wi.id, wi.code, wi.name, wi.description, wi.status,
                   wi.progress, wi.weight,
                   wi.planned_start_date, wi.planned_end_date,
                   wi.estimated_hours, wi.actual_hours,
                   wg.name AS group_name,
                   p.name AS phase_name,
                   (SELECT COUNT(*) FROM project.wbs_tasks wt
                    WHERE wt.item_id = wi.id) AS task_count
            FROM project.wbs_items wi
            LEFT JOIN project.wbs_groups wg ON wi.group_id = wg.id
            LEFT JOIN project.phases p ON wi.phase_id = p.id
            WHERE p.project_id = %s
            ORDER BY p.order_num, wg.order_num, wi.order_num
        """, (project_id,))

        for item in items:
            content = self.text_generator.generate_wbs_item_status(
                item, project_name,
                item.get('group_name', ''),
                item.get('phase_name', ''),
            )

            chunk = EntityChunk(
                chunk_id=f"entity_wbs_item_{item['id']}",
                content=content,
                entity_type=ChunkEntityType.WBS_STATUS.value,
                entity_id=item['id'],
                project_id=project_id,
                access_level=EntityAccessLevel.PROJECT_STATUS.value,
                title=f"WBS 항목: {item.get('name', 'Unknown')}",
                embedding=self._generate_embedding(content),
            )

            if self._save_chunk(chunk):
                count += 1

        logger.info(f"Synced {count} WBS status chunks ({len(groups)} groups, {len(items)} items) for {project_id}")
        return count

    # =========================================================================
    # Orchestration Methods
    # =========================================================================

    def sync_project_entities(self, project_id: str) -> Dict[str, int]:
        """Sync all entity chunks for a specific project"""
        if not self._initialized:
            self.initialize()

        results = {}

        logger.info(f"Starting entity chunk sync for project {project_id}")

        results['project_status'] = self.sync_project_status(project_id)
        results['sprint_statuses'] = self.sync_sprint_statuses(project_id)
        results['task_summaries'] = self.sync_task_summaries(project_id)
        results['user_story_summaries'] = self.sync_user_story_summaries(project_id)
        results['phase_statuses'] = self.sync_phase_statuses(project_id)
        results['issue_summary'] = self.sync_issue_summary(project_id)
        results['epic_statuses'] = self.sync_epic_statuses(project_id)
        results['wbs_statuses'] = self.sync_wbs_statuses(project_id)

        total = sum(results.values())
        logger.info(f"Entity chunk sync completed for {project_id}: {total} chunks created")

        return results

    def sync_all_entities(self) -> Dict[str, Dict[str, int]]:
        """Sync entity chunks for all projects"""
        if not self._initialized:
            self.initialize()

        # Fetch all projects
        projects = self._fetch_query("SELECT id, name FROM project.projects")

        results = {}
        for project in projects:
            project_id = project['id']
            logger.info(f"Syncing entities for project: {project.get('name')} ({project_id})")
            results[project_id] = self.sync_project_entities(project_id)

        total_chunks = sum(
            sum(project_results.values())
            for project_results in results.values()
        )
        logger.info(f"Full entity sync completed: {total_chunks} total chunks across {len(projects)} projects")

        return results

    def get_sync_status(self) -> Dict[str, Any]:
        """Get current sync status"""
        with self._neo4j_driver.session() as session:
            result = session.run("""
                MATCH (c:Chunk)
                WHERE c.structure_type = 'entity'
                RETURN c.entity_type AS entity_type,
                       c.project_id AS project_id,
                       COUNT(*) AS count,
                       MAX(c.synced_at) AS last_synced
                ORDER BY project_id, entity_type
            """)

            stats = [dict(record) for record in result]

        return {
            "initialized": self._initialized,
            "chunk_stats": stats,
        }

    def close(self):
        """Close connections"""
        if self._pg_conn and not self._pg_conn.closed:
            self._pg_conn.close()
        if self._neo4j_driver:
            self._neo4j_driver.close()


# =============================================================================
# Singleton instance
# =============================================================================

_entity_chunk_service: Optional[EntityChunkService] = None


def get_entity_chunk_service() -> EntityChunkService:
    """Get singleton EntityChunkService instance"""
    global _entity_chunk_service
    if _entity_chunk_service is None:
        _entity_chunk_service = EntityChunkService()
    return _entity_chunk_service


# =============================================================================
# CLI for testing
# =============================================================================

if __name__ == "__main__":
    import sys

    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    service = EntityChunkService()

    if not service.initialize():
        print("Failed to initialize service")
        sys.exit(1)

    if len(sys.argv) > 1:
        project_id = sys.argv[1]
        print(f"Syncing entities for project: {project_id}")
        results = service.sync_project_entities(project_id)
    else:
        print("Syncing all entities...")
        results = service.sync_all_entities()

    print(f"Results: {results}")
    service.close()
