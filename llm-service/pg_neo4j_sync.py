"""
PostgreSQL to Neo4j Sync Service

Syncs PMS entities from PostgreSQL to Neo4j for relationship queries:
- Projects, Sprints, Tasks, UserStories
- Phases, Deliverables, Issues
- Relationships: BELONGS_TO, DEPENDS_ON, BLOCKED_BY, etc.

Reference: docs/PMS 최적화 방안.md
"""

import os
import logging
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta, date
from decimal import Decimal
from enum import Enum
import time

logger = logging.getLogger(__name__)


# =============================================================================
# Configuration
# =============================================================================

@dataclass
class SyncConfig:
    """Sync configuration"""
    # PostgreSQL - defaults match docker-compose service names
    pg_host: str = field(default_factory=lambda: os.getenv("PG_HOST", "postgres"))
    pg_port: int = field(default_factory=lambda: int(os.getenv("PG_PORT", "5432")))
    pg_database: str = field(default_factory=lambda: os.getenv("PG_DATABASE", "pms_db"))
    pg_user: str = field(default_factory=lambda: os.getenv("PG_USER", "pms_user"))
    pg_password: str = field(default_factory=lambda: os.getenv("PG_PASSWORD", "pms_password"))

    # Neo4j - defaults match docker-compose service names
    neo4j_uri: str = field(default_factory=lambda: os.getenv("NEO4J_URI", "bolt://neo4j:7687"))
    neo4j_user: str = field(default_factory=lambda: os.getenv("NEO4J_USER", "neo4j"))
    neo4j_password: str = field(default_factory=lambda: os.getenv("NEO4J_PASSWORD", "pmspassword123"))

    # Sync settings
    batch_size: int = 100
    max_retries: int = 3
    retry_backoff_seconds: int = 5
    full_sync_interval_hours: int = 24
    incremental_sync_interval_minutes: int = 5


# =============================================================================
# Entity Types
# =============================================================================

class EntityType(Enum):
    """Entity types to sync"""
    PROJECT = "Project"
    SPRINT = "Sprint"
    TASK = "Task"
    USER_STORY = "UserStory"
    PHASE = "Phase"
    DELIVERABLE = "Deliverable"
    ISSUE = "Issue"
    USER = "User"


class RelationType(Enum):
    """Relationship types to sync"""
    BELONGS_TO = "BELONGS_TO"
    DEPENDS_ON = "DEPENDS_ON"
    BLOCKED_BY = "BLOCKED_BY"
    ASSIGNED_TO = "ASSIGNED_TO"
    CREATED_BY = "CREATED_BY"
    PART_OF = "PART_OF"
    HAS_SPRINT = "HAS_SPRINT"
    HAS_TASK = "HAS_TASK"
    HAS_STORY = "HAS_STORY"
    HAS_PHASE = "HAS_PHASE"
    HAS_DELIVERABLE = "HAS_DELIVERABLE"


# =============================================================================
# Sync Result Types
# =============================================================================

@dataclass
class SyncResult:
    """Result of a sync operation"""
    success: bool
    entity_type: str
    records_synced: int = 0
    records_failed: int = 0
    duration_ms: float = 0.0
    error: Optional[str] = None
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class FullSyncResult:
    """Result of a full sync operation"""
    success: bool
    entity_results: Dict[str, SyncResult] = field(default_factory=dict)
    relationship_results: Dict[str, SyncResult] = field(default_factory=dict)
    total_duration_ms: float = 0.0
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())


# =============================================================================
# PostgreSQL Queries
# =============================================================================

class PGQueries:
    """PostgreSQL queries for entity extraction

    Note: These queries match the actual PMS database schema.
    Column names are mapped to match the actual table structures.
    """

    PROJECTS = """
        SELECT id, name, description, status, start_date, end_date,
               progress, budget, created_at, updated_at
        FROM project.projects
        WHERE updated_at > %s OR %s IS NULL
        ORDER BY id
        LIMIT %s OFFSET %s
    """

    SPRINTS = """
        SELECT s.id, s.name, s.goal, s.status, s.start_date, s.end_date,
               s.project_id, s.conwip_limit, s.enable_wip_validation,
               s.created_at, s.updated_at
        FROM task.sprints s
        WHERE s.updated_at > %s OR %s IS NULL
        ORDER BY s.id
        LIMIT %s OFFSET %s
    """

    TASKS = """
        SELECT t.id, t.title, t.description, t.status, t.priority,
               t.sprint_id, t.assignee_id, t.phase_id, t.due_date,
               t.track_type, t.tags, t.order_num,
               t.created_at, t.updated_at
        FROM task.tasks t
        WHERE t.updated_at > %s OR %s IS NULL
        ORDER BY t.id
        LIMIT %s OFFSET %s
    """

    USER_STORIES = """
        SELECT us.id, us.title, us.description, us.status, us.priority,
               us.story_points, us.sprint_id, us.project_id,
               us.epic, us.acceptance_criteria, us.assignee_id,
               us.created_at, us.updated_at
        FROM task.user_stories us
        WHERE us.updated_at > %s OR %s IS NULL
        ORDER BY us.id
        LIMIT %s OFFSET %s
    """

    PHASES = """
        SELECT p.id, p.name, p.description, p.status, p.start_date, p.end_date,
               p.project_id, p.order_num as sequence_number, p.progress,
               p.gate_status, p.track_type,
               p.created_at, p.updated_at
        FROM project.phases p
        WHERE p.updated_at > %s OR %s IS NULL
        ORDER BY p.id
        LIMIT %s OFFSET %s
    """

    DELIVERABLES = """
        SELECT d.id, d.name, d.description, d.status, d.type,
               d.phase_id, d.file_name, d.file_path,
               d.created_at, d.updated_at
        FROM project.deliverables d
        WHERE d.updated_at > %s OR %s IS NULL
        ORDER BY d.id
        LIMIT %s OFFSET %s
    """

    ISSUES = """
        SELECT i.id, i.title, i.description, i.status, i.priority, i.issue_type,
               i.project_id, i.reporter, i.assignee, i.due_date,
               i.resolution, i.resolved_at,
               i.created_at, i.updated_at
        FROM project.issues i
        WHERE i.updated_at > %s OR %s IS NULL
        ORDER BY i.id
        LIMIT %s OFFSET %s
    """

    USERS = """
        SELECT u.id, u.name as full_name, u.email, u.role,
               u.department, u.active as status,
               u.created_at, u.updated_at
        FROM auth.users u
        WHERE u.updated_at > %s OR %s IS NULL
        ORDER BY u.id
        LIMIT %s OFFSET %s
    """

    # Relationship queries - these tables don't exist yet in the schema
    # When implemented, they should be created as junction tables
    TASK_DEPENDENCIES = """
        SELECT 1 WHERE FALSE
    """

    TASK_BLOCKERS = """
        SELECT 1 WHERE FALSE
    """


# =============================================================================
# Neo4j Queries
# =============================================================================

class Neo4jQueries:
    """Neo4j Cypher queries for entity creation"""

    # Create constraints (run once)
    CREATE_CONSTRAINTS = [
        "CREATE CONSTRAINT IF NOT EXISTS FOR (p:Project) REQUIRE p.id IS UNIQUE",
        "CREATE CONSTRAINT IF NOT EXISTS FOR (s:Sprint) REQUIRE s.id IS UNIQUE",
        "CREATE CONSTRAINT IF NOT EXISTS FOR (t:Task) REQUIRE t.id IS UNIQUE",
        "CREATE CONSTRAINT IF NOT EXISTS FOR (us:UserStory) REQUIRE us.id IS UNIQUE",
        "CREATE CONSTRAINT IF NOT EXISTS FOR (ph:Phase) REQUIRE ph.id IS UNIQUE",
        "CREATE CONSTRAINT IF NOT EXISTS FOR (d:Deliverable) REQUIRE d.id IS UNIQUE",
        "CREATE CONSTRAINT IF NOT EXISTS FOR (i:Issue) REQUIRE i.id IS UNIQUE",
        "CREATE CONSTRAINT IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE",
    ]

    # Create indexes for better query performance
    CREATE_INDEXES = [
        "CREATE INDEX IF NOT EXISTS FOR (p:Project) ON (p.status)",
        "CREATE INDEX IF NOT EXISTS FOR (s:Sprint) ON (s.status)",
        "CREATE INDEX IF NOT EXISTS FOR (t:Task) ON (t.status)",
        "CREATE INDEX IF NOT EXISTS FOR (t:Task) ON (t.priority)",
        "CREATE INDEX IF NOT EXISTS FOR (us:UserStory) ON (us.status)",
        "CREATE INDEX IF NOT EXISTS FOR (i:Issue) ON (i.status)",
    ]

    # Merge queries (upsert) - aligned with actual PMS schema
    MERGE_PROJECT = """
        UNWIND $batch AS row
        MERGE (p:Project {id: row.id})
        SET p.name = row.name,
            p.description = row.description,
            p.status = row.status,
            p.start_date = row.start_date,
            p.end_date = row.end_date,
            p.progress = row.progress,
            p.budget = row.budget,
            p.synced_at = datetime()
    """

    MERGE_SPRINT = """
        UNWIND $batch AS row
        MERGE (s:Sprint {id: row.id})
        SET s.name = row.name,
            s.goal = row.goal,
            s.status = row.status,
            s.start_date = row.start_date,
            s.end_date = row.end_date,
            s.conwip_limit = row.conwip_limit,
            s.enable_wip_validation = row.enable_wip_validation,
            s.synced_at = datetime()
        WITH s, row
        WHERE row.project_id IS NOT NULL
        MATCH (p:Project {id: row.project_id})
        MERGE (p)-[:HAS_SPRINT]->(s)
    """

    MERGE_TASK = """
        UNWIND $batch AS row
        MERGE (t:Task {id: row.id})
        SET t.title = row.title,
            t.description = row.description,
            t.status = row.status,
            t.priority = row.priority,
            t.due_date = row.due_date,
            t.track_type = row.track_type,
            t.tags = row.tags,
            t.order_num = row.order_num,
            t.synced_at = datetime()
        WITH t, row
        WHERE row.sprint_id IS NOT NULL
        MATCH (s:Sprint {id: row.sprint_id})
        MERGE (s)-[:HAS_TASK]->(t)
    """

    MERGE_USER_STORY = """
        UNWIND $batch AS row
        MERGE (us:UserStory {id: row.id})
        SET us.title = row.title,
            us.description = row.description,
            us.status = row.status,
            us.priority = row.priority,
            us.story_points = row.story_points,
            us.epic = row.epic,
            us.acceptance_criteria = row.acceptance_criteria,
            us.synced_at = datetime()
        WITH us, row
        WHERE row.sprint_id IS NOT NULL
        MATCH (s:Sprint {id: row.sprint_id})
        MERGE (s)-[:HAS_STORY]->(us)
        WITH us, row
        WHERE row.project_id IS NOT NULL
        MATCH (p:Project {id: row.project_id})
        MERGE (p)-[:HAS_STORY]->(us)
    """

    MERGE_PHASE = """
        UNWIND $batch AS row
        MERGE (ph:Phase {id: row.id})
        SET ph.name = row.name,
            ph.description = row.description,
            ph.status = row.status,
            ph.start_date = row.start_date,
            ph.end_date = row.end_date,
            ph.sequence_number = row.sequence_number,
            ph.progress = row.progress,
            ph.gate_status = row.gate_status,
            ph.track_type = row.track_type,
            ph.synced_at = datetime()
        WITH ph, row
        WHERE row.project_id IS NOT NULL
        MATCH (p:Project {id: row.project_id})
        MERGE (p)-[:HAS_PHASE]->(ph)
    """

    MERGE_DELIVERABLE = """
        UNWIND $batch AS row
        MERGE (d:Deliverable {id: row.id})
        SET d.name = row.name,
            d.description = row.description,
            d.status = row.status,
            d.type = row.type,
            d.file_name = row.file_name,
            d.file_path = row.file_path,
            d.synced_at = datetime()
        WITH d, row
        WHERE row.phase_id IS NOT NULL
        MATCH (ph:Phase {id: row.phase_id})
        MERGE (ph)-[:HAS_DELIVERABLE]->(d)
    """

    MERGE_ISSUE = """
        UNWIND $batch AS row
        MERGE (i:Issue {id: row.id})
        SET i.title = row.title,
            i.description = row.description,
            i.status = row.status,
            i.priority = row.priority,
            i.issue_type = row.issue_type,
            i.reporter = row.reporter,
            i.assignee = row.assignee,
            i.due_date = row.due_date,
            i.resolution = row.resolution,
            i.resolved_at = row.resolved_at,
            i.synced_at = datetime()
        WITH i, row
        WHERE row.project_id IS NOT NULL
        MATCH (p:Project {id: row.project_id})
        MERGE (p)-[:HAS_ISSUE]->(i)
    """

    MERGE_USER = """
        UNWIND $batch AS row
        MERGE (u:User {id: row.id})
        SET u.email = row.email,
            u.full_name = row.full_name,
            u.role = row.role,
            u.department = row.department,
            u.active = row.status,
            u.synced_at = datetime()
    """

    # Relationship queries
    CREATE_TASK_DEPENDENCY = """
        UNWIND $batch AS row
        MATCH (t1:Task {id: row.task_id})
        MATCH (t2:Task {id: row.depends_on_task_id})
        MERGE (t1)-[:DEPENDS_ON]->(t2)
    """

    CREATE_TASK_BLOCKER = """
        UNWIND $batch AS row
        MATCH (t1:Task {id: row.blocked_task_id})
        MATCH (t2:Task {id: row.blocker_task_id})
        MERGE (t1)-[:BLOCKED_BY]->(t2)
    """

    CREATE_TASK_ASSIGNMENT = """
        UNWIND $batch AS row
        MATCH (t:Task {id: row.task_id})
        MATCH (u:User {id: row.assignee_id})
        MERGE (t)-[:ASSIGNED_TO]->(u)
    """


# =============================================================================
# Sync Service
# =============================================================================

class PGNeo4jSyncService:
    """
    Service for syncing PostgreSQL data to Neo4j.

    Usage:
        service = PGNeo4jSyncService()

        # Initialize (creates constraints/indexes)
        service.initialize()

        # Full sync
        result = service.full_sync()

        # Incremental sync (since last sync)
        result = service.incremental_sync()
    """

    def __init__(self, config: Optional[SyncConfig] = None):
        self.config = config or SyncConfig()
        self._pg_conn = None
        self._neo4j_driver = None
        self._last_sync_time: Optional[datetime] = None
        self._initialized = False

    def _get_pg_connection(self):
        """Get PostgreSQL connection"""
        if self._pg_conn is None or self._pg_conn.closed:
            try:
                import psycopg2
                self._pg_conn = psycopg2.connect(
                    host=self.config.pg_host,
                    port=self.config.pg_port,
                    database=self.config.pg_database,
                    user=self.config.pg_user,
                    password=self.config.pg_password,
                )
            except ImportError:
                logger.error("psycopg2 not installed. Run: pip install psycopg2-binary")
                raise
            except Exception as e:
                logger.error(f"Failed to connect to PostgreSQL: {e}")
                raise
        return self._pg_conn

    def _get_neo4j_driver(self):
        """Get Neo4j driver"""
        if self._neo4j_driver is None:
            try:
                from neo4j import GraphDatabase
                self._neo4j_driver = GraphDatabase.driver(
                    self.config.neo4j_uri,
                    auth=(self.config.neo4j_user, self.config.neo4j_password),
                )
            except ImportError:
                logger.error("neo4j driver not installed. Run: pip install neo4j")
                raise
            except Exception as e:
                logger.error(f"Failed to connect to Neo4j: {e}")
                raise
        return self._neo4j_driver

    def initialize(self) -> bool:
        """Initialize Neo4j schema (constraints and indexes)"""
        if self._initialized:
            return True

        try:
            driver = self._get_neo4j_driver()
            with driver.session() as session:
                # Create constraints
                for query in Neo4jQueries.CREATE_CONSTRAINTS:
                    try:
                        session.run(query)
                    except Exception as e:
                        logger.warning(f"Constraint creation warning: {e}")

                # Create indexes
                for query in Neo4jQueries.CREATE_INDEXES:
                    try:
                        session.run(query)
                    except Exception as e:
                        logger.warning(f"Index creation warning: {e}")

            self._initialized = True
            logger.info("Neo4j schema initialized successfully")
            return True

        except Exception as e:
            logger.error(f"Failed to initialize Neo4j schema: {e}")
            return False

    def _fetch_entities(
        self,
        query: str,
        since: Optional[datetime] = None,
        batch_size: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        """Fetch entities from PostgreSQL"""
        batch_size = batch_size or self.config.batch_size
        all_records = []
        offset = 0

        conn = self._get_pg_connection()
        cursor = conn.cursor()

        try:
            while True:
                cursor.execute(query, (since, since, batch_size, offset))
                rows = cursor.fetchall()

                if not rows:
                    break

                # Convert to dict using column names
                columns = [desc[0] for desc in cursor.description]
                for row in rows:
                    record = {}
                    for i, col in enumerate(columns):
                        value = row[i]
                        # Convert types for Neo4j compatibility
                        if isinstance(value, datetime):
                            value = value.isoformat()
                        elif isinstance(value, date):
                            value = value.isoformat()
                        elif isinstance(value, Decimal):
                            value = float(value)
                        record[col] = value
                    all_records.append(record)

                offset += batch_size

                if len(rows) < batch_size:
                    break

        except Exception as e:
            logger.error(f"Failed to fetch entities: {e}")
            raise
        finally:
            cursor.close()

        return all_records

    def _sync_entities(
        self,
        entity_type: EntityType,
        pg_query: str,
        neo4j_query: str,
        since: Optional[datetime] = None,
    ) -> SyncResult:
        """Sync entities of a specific type"""
        start_time = time.time()
        records_synced = 0
        records_failed = 0

        try:
            # Fetch from PostgreSQL
            entities = self._fetch_entities(pg_query, since)

            if not entities:
                return SyncResult(
                    success=True,
                    entity_type=entity_type.value,
                    records_synced=0,
                    duration_ms=(time.time() - start_time) * 1000,
                )

            # Sync to Neo4j in batches
            driver = self._get_neo4j_driver()
            batch_size = self.config.batch_size

            for i in range(0, len(entities), batch_size):
                batch = entities[i:i + batch_size]

                with driver.session() as session:
                    try:
                        session.run(neo4j_query, batch=batch)
                        records_synced += len(batch)
                    except Exception as e:
                        logger.error(f"Failed to sync batch: {e}")
                        records_failed += len(batch)

            duration_ms = (time.time() - start_time) * 1000
            logger.info(
                f"Synced {entity_type.value}: {records_synced} records in {duration_ms:.2f}ms"
            )

            return SyncResult(
                success=records_failed == 0,
                entity_type=entity_type.value,
                records_synced=records_synced,
                records_failed=records_failed,
                duration_ms=duration_ms,
            )

        except Exception as e:
            logger.error(f"Failed to sync {entity_type.value}: {e}")
            return SyncResult(
                success=False,
                entity_type=entity_type.value,
                error=str(e),
                duration_ms=(time.time() - start_time) * 1000,
            )

    def _sync_relationships(
        self,
        relation_type: RelationType,
        pg_query: str,
        neo4j_query: str,
        since: Optional[datetime] = None,
    ) -> SyncResult:
        """Sync relationships of a specific type"""
        start_time = time.time()

        try:
            conn = self._get_pg_connection()
            cursor = conn.cursor()
            cursor.execute(pg_query, (since, since))
            rows = cursor.fetchall()
            cursor.close()

            if not rows:
                return SyncResult(
                    success=True,
                    entity_type=relation_type.value,
                    records_synced=0,
                    duration_ms=(time.time() - start_time) * 1000,
                )

            # Convert to dicts
            columns = [desc[0] for desc in cursor.description]
            relationships = [dict(zip(columns, row)) for row in rows]

            # Sync to Neo4j
            driver = self._get_neo4j_driver()
            with driver.session() as session:
                session.run(neo4j_query, batch=relationships)

            duration_ms = (time.time() - start_time) * 1000
            logger.info(
                f"Synced {relation_type.value}: {len(relationships)} relationships in {duration_ms:.2f}ms"
            )

            return SyncResult(
                success=True,
                entity_type=relation_type.value,
                records_synced=len(relationships),
                duration_ms=duration_ms,
            )

        except Exception as e:
            logger.error(f"Failed to sync {relation_type.value}: {e}")
            return SyncResult(
                success=False,
                entity_type=relation_type.value,
                error=str(e),
                duration_ms=(time.time() - start_time) * 1000,
            )

    def full_sync(self) -> FullSyncResult:
        """Perform full sync of all entities and relationships"""
        start_time = time.time()
        entity_results = {}
        relationship_results = {}

        logger.info("Starting full sync from PostgreSQL to Neo4j")

        # Initialize if needed
        if not self._initialized:
            self.initialize()

        # Sync entities (order matters for relationships)
        entity_mappings = [
            (EntityType.USER, PGQueries.USERS, Neo4jQueries.MERGE_USER),
            (EntityType.PROJECT, PGQueries.PROJECTS, Neo4jQueries.MERGE_PROJECT),
            (EntityType.SPRINT, PGQueries.SPRINTS, Neo4jQueries.MERGE_SPRINT),
            (EntityType.PHASE, PGQueries.PHASES, Neo4jQueries.MERGE_PHASE),
            (EntityType.TASK, PGQueries.TASKS, Neo4jQueries.MERGE_TASK),
            (EntityType.USER_STORY, PGQueries.USER_STORIES, Neo4jQueries.MERGE_USER_STORY),
            (EntityType.DELIVERABLE, PGQueries.DELIVERABLES, Neo4jQueries.MERGE_DELIVERABLE),
            (EntityType.ISSUE, PGQueries.ISSUES, Neo4jQueries.MERGE_ISSUE),
        ]

        for entity_type, pg_query, neo4j_query in entity_mappings:
            result = self._sync_entities(entity_type, pg_query, neo4j_query, since=None)
            entity_results[entity_type.value] = result

        # Sync relationships
        relationship_mappings = [
            (RelationType.DEPENDS_ON, PGQueries.TASK_DEPENDENCIES, Neo4jQueries.CREATE_TASK_DEPENDENCY),
            (RelationType.BLOCKED_BY, PGQueries.TASK_BLOCKERS, Neo4jQueries.CREATE_TASK_BLOCKER),
        ]

        for rel_type, pg_query, neo4j_query in relationship_mappings:
            result = self._sync_relationships(rel_type, pg_query, neo4j_query, since=None)
            relationship_results[rel_type.value] = result

        # Update last sync time
        self._last_sync_time = datetime.now()

        total_duration = (time.time() - start_time) * 1000
        all_success = all(r.success for r in entity_results.values()) and \
                      all(r.success for r in relationship_results.values())

        logger.info(f"Full sync completed in {total_duration:.2f}ms, success={all_success}")

        return FullSyncResult(
            success=all_success,
            entity_results=entity_results,
            relationship_results=relationship_results,
            total_duration_ms=total_duration,
        )

    def incremental_sync(self, since: Optional[datetime] = None) -> FullSyncResult:
        """Perform incremental sync since last sync or specified time"""
        if since is None:
            since = self._last_sync_time

        if since is None:
            logger.info("No last sync time, performing full sync")
            return self.full_sync()

        start_time = time.time()
        entity_results = {}
        relationship_results = {}

        logger.info(f"Starting incremental sync since {since}")

        # Same mappings as full sync but with since parameter
        entity_mappings = [
            (EntityType.USER, PGQueries.USERS, Neo4jQueries.MERGE_USER),
            (EntityType.PROJECT, PGQueries.PROJECTS, Neo4jQueries.MERGE_PROJECT),
            (EntityType.SPRINT, PGQueries.SPRINTS, Neo4jQueries.MERGE_SPRINT),
            (EntityType.PHASE, PGQueries.PHASES, Neo4jQueries.MERGE_PHASE),
            (EntityType.TASK, PGQueries.TASKS, Neo4jQueries.MERGE_TASK),
            (EntityType.USER_STORY, PGQueries.USER_STORIES, Neo4jQueries.MERGE_USER_STORY),
            (EntityType.DELIVERABLE, PGQueries.DELIVERABLES, Neo4jQueries.MERGE_DELIVERABLE),
            (EntityType.ISSUE, PGQueries.ISSUES, Neo4jQueries.MERGE_ISSUE),
        ]

        for entity_type, pg_query, neo4j_query in entity_mappings:
            result = self._sync_entities(entity_type, pg_query, neo4j_query, since=since)
            entity_results[entity_type.value] = result

        # Sync relationships for updated entities
        relationship_mappings = [
            (RelationType.DEPENDS_ON, PGQueries.TASK_DEPENDENCIES, Neo4jQueries.CREATE_TASK_DEPENDENCY),
            (RelationType.BLOCKED_BY, PGQueries.TASK_BLOCKERS, Neo4jQueries.CREATE_TASK_BLOCKER),
        ]

        for rel_type, pg_query, neo4j_query in relationship_mappings:
            result = self._sync_relationships(rel_type, pg_query, neo4j_query, since=since)
            relationship_results[rel_type.value] = result

        # Update last sync time
        self._last_sync_time = datetime.now()

        total_duration = (time.time() - start_time) * 1000
        all_success = all(r.success for r in entity_results.values()) and \
                      all(r.success for r in relationship_results.values())

        logger.info(f"Incremental sync completed in {total_duration:.2f}ms, success={all_success}")

        return FullSyncResult(
            success=all_success,
            entity_results=entity_results,
            relationship_results=relationship_results,
            total_duration_ms=total_duration,
        )

    def sync_single_entity(
        self,
        entity_type: EntityType,
        entity_id: str,
    ) -> SyncResult:
        """Sync a single entity by ID (for real-time updates)"""
        # This would be called via webhook/event from backend
        # Implementation depends on specific entity type
        raise NotImplementedError("Single entity sync not yet implemented")

    def get_sync_status(self) -> Dict[str, Any]:
        """Get current sync status"""
        return {
            "initialized": self._initialized,
            "last_sync_time": self._last_sync_time.isoformat() if self._last_sync_time else None,
            "config": {
                "batch_size": self.config.batch_size,
                "full_sync_interval_hours": self.config.full_sync_interval_hours,
                "incremental_sync_interval_minutes": self.config.incremental_sync_interval_minutes,
            }
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

_sync_service: Optional[PGNeo4jSyncService] = None


def get_sync_service() -> PGNeo4jSyncService:
    """Get singleton sync service instance"""
    global _sync_service
    if _sync_service is None:
        _sync_service = PGNeo4jSyncService()
    return _sync_service
