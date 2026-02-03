"""
Database Admin Routes for LLM Service.

Provides REST API endpoints for:
- Neo4j synchronization (full/incremental)
- Database backup and restore
- Database statistics
"""

import os
import logging
import threading
from datetime import datetime
from typing import Optional
from flask import request, jsonify
from dataclasses import asdict

from . import db_admin_bp
from migrations.pg_neo4j_sync import PGNeo4jSyncService, SyncConfig, get_sync_service
from services.backup_service import get_backup_service, BackupConfig
from services.entity_chunk_service import get_entity_chunk_service

logger = logging.getLogger(__name__)


# ============================================
# Configuration
# ============================================

def get_pg_conn_string() -> str:
    """Get PostgreSQL connection string from environment."""
    host = os.getenv("PG_HOST", "postgres")
    port = os.getenv("PG_PORT", "5432")
    database = os.getenv("PG_DATABASE", "pms_db")
    user = os.getenv("PG_USER", "pms_user")
    password = os.getenv("PG_PASSWORD", "pms_password")
    return f"postgresql://{user}:{password}@{host}:{port}/{database}"


# ============================================
# Sync Status Tracking (in-memory)
# ============================================

_sync_status = {
    "is_syncing": False,
    "sync_type": None,
    "current_entity": None,
    "progress": 0,
    "started_at": None,
    "error": None,
}
_sync_lock = threading.Lock()


def _update_sync_status(**kwargs):
    """Update sync status safely."""
    with _sync_lock:
        _sync_status.update(kwargs)


def _reset_sync_status():
    """Reset sync status."""
    with _sync_lock:
        _sync_status.update({
            "is_syncing": False,
            "sync_type": None,
            "current_entity": None,
            "progress": 0,
            "started_at": None,
            "error": None,
        })


# ============================================
# Sync Endpoints
# ============================================

@db_admin_bp.route("/api/admin/db/sync", methods=["POST"])
def trigger_sync():
    """
    Trigger PostgreSQL to Neo4j synchronization.

    Request body:
        {
            "sync_type": "full" | "incremental",
            "triggered_by": "username"
        }

    Returns:
        {
            "message": "Sync started",
            "sync_type": "full",
            "sync_id": "..."
        }
    """
    data = request.json or {}
    sync_type = data.get("sync_type", "full").lower()
    triggered_by = data.get("triggered_by", "admin")

    if sync_type not in ["full", "incremental"]:
        return jsonify({"error": "Invalid sync_type. Must be 'full' or 'incremental'"}), 400

    with _sync_lock:
        if _sync_status["is_syncing"]:
            return jsonify({"error": "A sync is already in progress"}), 409

    # Start sync in background thread
    _update_sync_status(
        is_syncing=True,
        sync_type=sync_type,
        current_entity="Initializing...",
        progress=0,
        started_at=datetime.now().isoformat(),
        error=None,
    )

    thread = threading.Thread(
        target=_run_sync_async,
        args=(sync_type, triggered_by),
        daemon=True
    )
    thread.start()

    return jsonify({
        "message": "Sync started",
        "sync_type": sync_type,
    })


def _run_sync_async(sync_type: str, triggered_by: str):
    """Run sync in background thread."""
    pg_conn = get_pg_conn_string()
    start_time = datetime.now()

    try:
        sync_service = get_sync_service()

        # Define progress callback
        entity_list = ["Project", "Sprint", "Phase", "Task", "UserStory", "Epic", "Feature", "WbsGroup", "WbsItem", "User"]
        total_entities = len(entity_list)

        for i, entity in enumerate(entity_list):
            _update_sync_status(
                current_entity=entity,
                progress=int((i / total_entities) * 100)
            )

        if sync_type == "full":
            result = sync_service.full_sync()
        else:
            result = sync_service.incremental_sync()

        _update_sync_status(progress=100, current_entity="Completed")

        # Record in history
        _record_sync_history(
            pg_conn=pg_conn,
            sync_type=sync_type.upper(),
            status="COMPLETED",
            triggered_by=triggered_by,
            result=result,
            start_time=start_time,
        )

        logger.info(f"Sync completed: {sync_type}")

    except Exception as e:
        logger.error(f"Sync failed: {e}")
        _update_sync_status(error=str(e))

        _record_sync_history(
            pg_conn=pg_conn,
            sync_type=sync_type.upper(),
            status="FAILED",
            triggered_by=triggered_by,
            error_message=str(e),
            start_time=start_time,
        )

    finally:
        _reset_sync_status()


def _record_sync_history(
    pg_conn: str,
    sync_type: str,
    status: str,
    triggered_by: str,
    result=None,
    error_message: str = None,
    start_time: datetime = None,
):
    """Record sync operation in history table."""
    import psycopg2
    import json

    end_time = datetime.now()
    duration_ms = int((end_time - start_time).total_seconds() * 1000) if start_time else 0

    entities_synced = {}
    total_synced = 0
    total_failed = 0

    if result:
        # Extract entity results from sync result
        if hasattr(result, "entity_results"):
            for entity_name, entity_result in result.entity_results.items():
                entities_synced[entity_name] = entity_result.records_synced
                total_synced += entity_result.records_synced
                total_failed += entity_result.records_failed

    try:
        conn = psycopg2.connect(pg_conn)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO admin.sync_history
            (sync_type, status, entities_synced, total_records_synced, total_records_failed,
             error_message, triggered_by, duration_ms, started_at, completed_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            sync_type,
            status,
            json.dumps(entities_synced),
            total_synced,
            total_failed,
            error_message,
            triggered_by,
            duration_ms,
            start_time.isoformat() if start_time else None,
            end_time.isoformat(),
        ))
        conn.commit()
        conn.close()
        logger.info(f"Sync history recorded: {sync_type} - {status}")
    except Exception as e:
        logger.error(f"Failed to record sync history: {e}")


@db_admin_bp.route("/api/admin/db/sync/status", methods=["GET"])
def get_sync_status():
    """
    Get current sync status.

    Returns:
        {
            "is_syncing": bool,
            "sync_type": "full" | "incremental" | null,
            "current_entity": string | null,
            "progress": 0-100,
            "started_at": ISO timestamp | null,
            "error": string | null
        }
    """
    with _sync_lock:
        return jsonify(_sync_status.copy())


@db_admin_bp.route("/api/admin/db/sync/history", methods=["GET"])
def get_sync_history():
    """
    Get sync history.

    Query params:
        limit: int (default 10)

    Returns:
        {
            "data": [
                {
                    "id": "uuid",
                    "sync_type": "FULL" | "INCREMENTAL",
                    "status": "COMPLETED" | "FAILED",
                    "entities_synced": {...},
                    "total_records_synced": int,
                    "duration_ms": int,
                    "triggered_by": "username",
                    "started_at": ISO timestamp,
                    "completed_at": ISO timestamp
                }
            ]
        }
    """
    import psycopg2

    limit = request.args.get("limit", 10, type=int)
    pg_conn = get_pg_conn_string()

    try:
        conn = psycopg2.connect(pg_conn)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, sync_type, status, entities_synced, total_records_synced,
                   total_records_failed, error_message, triggered_by, duration_ms,
                   started_at, completed_at
            FROM admin.sync_history
            ORDER BY created_at DESC
            LIMIT %s
        """, (limit,))
        rows = cursor.fetchall()
        conn.close()

        history = []
        for row in rows:
            history.append({
                "id": str(row[0]),
                "sync_type": row[1],
                "status": row[2],
                "entities_synced": row[3] or {},
                "total_records_synced": row[4],
                "total_records_failed": row[5],
                "error_message": row[6],
                "triggered_by": row[7],
                "duration_ms": row[8],
                "started_at": row[9].isoformat() if row[9] else None,
                "completed_at": row[10].isoformat() if row[10] else None,
            })

        return jsonify({"data": history})

    except Exception as e:
        logger.error(f"Failed to get sync history: {e}")
        return jsonify({"data": [], "error": str(e)}), 500


# ============================================
# Backup Endpoints
# ============================================

@db_admin_bp.route("/api/admin/db/backup", methods=["POST"])
def create_backup():
    """
    Create a database backup.

    Request body:
        {
            "backup_type": "POSTGRES" | "NEO4J" | "FULL",
            "created_by": "username"
        }

    Returns:
        {
            "message": "Backup started",
            "backup_name": "pms_backup_full_20260201_120000"
        }
    """
    data = request.json or {}
    backup_type = data.get("backup_type", "FULL").upper()
    created_by = data.get("created_by", "admin")

    if backup_type not in ["POSTGRES", "NEO4J", "FULL"]:
        return jsonify({"error": "Invalid backup_type"}), 400

    backup_service = get_backup_service()

    # Check if backup already running
    status = backup_service.get_status()
    if status["is_running"]:
        return jsonify({"error": "A backup is already in progress"}), 409

    # Start backup in background
    pg_conn = get_pg_conn_string()

    thread = threading.Thread(
        target=_run_backup_async,
        args=(backup_type, created_by, pg_conn),
        daemon=True
    )
    thread.start()

    return jsonify({
        "message": "Backup started",
        "backup_type": backup_type,
    })


def _run_backup_async(backup_type: str, created_by: str, pg_conn: str):
    """Run backup in background thread."""
    try:
        backup_service = get_backup_service()
        result = backup_service.create_backup(
            backup_type=backup_type,
            created_by=created_by,
            pg_conn_string=pg_conn,
        )
        logger.info(f"Backup completed: {result.backup_name}")
    except Exception as e:
        logger.error(f"Backup failed: {e}")


@db_admin_bp.route("/api/admin/db/backup/status", methods=["GET"])
def get_backup_status():
    """
    Get current backup status.

    Returns:
        {
            "is_running": bool,
            "backup_type": string | null,
            "backup_name": string | null,
            "progress": 0-100,
            "started_at": ISO timestamp | null
        }
    """
    backup_service = get_backup_service()
    return jsonify(backup_service.get_status())


@db_admin_bp.route("/api/admin/db/backups", methods=["GET"])
def list_backups():
    """
    List all backups.

    Query params:
        limit: int (default 20)

    Returns:
        {
            "data": [
                {
                    "id": "uuid",
                    "backup_type": "POSTGRES" | "NEO4J" | "FULL",
                    "backup_name": string,
                    "file_size_bytes": int,
                    "status": "COMPLETED" | "FAILED",
                    "created_by": string,
                    "started_at": ISO timestamp
                }
            ]
        }
    """
    limit = request.args.get("limit", 20, type=int)
    pg_conn = get_pg_conn_string()

    backup_service = get_backup_service()
    backups = backup_service.list_backups(pg_conn_string=pg_conn, limit=limit)

    return jsonify({"data": backups})


@db_admin_bp.route("/api/admin/db/restore/<backup_id>", methods=["POST"])
def restore_backup(backup_id: str):
    """
    Restore from a backup.

    Request body:
        {
            "confirm": true
        }

    Returns:
        {
            "message": "Restore started",
            "backup_id": "..."
        }
    """
    data = request.json or {}

    if not data.get("confirm"):
        return jsonify({"error": "Confirmation required. Set confirm=true"}), 400

    pg_conn = get_pg_conn_string()

    # Start restore in background
    thread = threading.Thread(
        target=_run_restore_async,
        args=(backup_id, pg_conn),
        daemon=True
    )
    thread.start()

    return jsonify({
        "message": "Restore started",
        "backup_id": backup_id,
    })


def _run_restore_async(backup_id: str, pg_conn: str):
    """Run restore in background thread."""
    try:
        backup_service = get_backup_service()
        result = backup_service.restore_backup(
            backup_id=backup_id,
            pg_conn_string=pg_conn,
        )
        logger.info(f"Restore completed: {result}")
    except Exception as e:
        logger.error(f"Restore failed: {e}")


@db_admin_bp.route("/api/admin/db/backups/<backup_id>", methods=["DELETE"])
def delete_backup(backup_id: str):
    """
    Delete a backup.

    Returns:
        {
            "message": "Backup deleted",
            "backup_id": "..."
        }
    """
    pg_conn = get_pg_conn_string()

    try:
        backup_service = get_backup_service()
        backup_service.delete_backup(backup_id=backup_id, pg_conn_string=pg_conn)

        return jsonify({
            "message": "Backup deleted",
            "backup_id": backup_id,
        })
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        logger.error(f"Failed to delete backup: {e}")
        return jsonify({"error": str(e)}), 500


# ============================================
# Statistics Endpoint
# ============================================

@db_admin_bp.route("/api/admin/db/stats", methods=["GET"])
def get_db_stats():
    """
    Get database statistics.

    Returns:
        {
            "postgres": {
                "tables": int,
                "total_rows": int,
                "size_bytes": int
            },
            "neo4j": {
                "nodes": int,
                "relationships": int,
                "labels": [...]
            },
            "last_sync_at": ISO timestamp | null,
            "last_backup_at": ISO timestamp | null
        }
    """
    import psycopg2
    from neo4j import GraphDatabase

    pg_conn = get_pg_conn_string()
    stats = {
        "postgres": {},
        "neo4j": {},
        "last_sync_at": None,
        "last_backup_at": None,
    }

    # PostgreSQL stats
    try:
        conn = psycopg2.connect(pg_conn)
        cursor = conn.cursor()

        # Table count
        cursor.execute("""
            SELECT COUNT(*) FROM information_schema.tables
            WHERE table_schema IN ('project', 'task', 'auth', 'chat', 'report', 'admin')
        """)
        stats["postgres"]["tables"] = cursor.fetchone()[0]

        # Total rows (approximate)
        cursor.execute("""
            SELECT SUM(n_live_tup) FROM pg_stat_user_tables
        """)
        result = cursor.fetchone()[0]
        stats["postgres"]["total_rows"] = int(result) if result else 0

        # Database size
        cursor.execute("""
            SELECT pg_database_size(current_database())
        """)
        stats["postgres"]["size_bytes"] = cursor.fetchone()[0]

        # Last sync time
        cursor.execute("""
            SELECT completed_at FROM admin.sync_history
            WHERE status = 'COMPLETED'
            ORDER BY completed_at DESC LIMIT 1
        """)
        row = cursor.fetchone()
        if row and row[0]:
            stats["last_sync_at"] = row[0].isoformat()

        # Last backup time
        cursor.execute("""
            SELECT completed_at FROM admin.backup_history
            WHERE status = 'COMPLETED'
            ORDER BY completed_at DESC LIMIT 1
        """)
        row = cursor.fetchone()
        if row and row[0]:
            stats["last_backup_at"] = row[0].isoformat()

        conn.close()

    except Exception as e:
        logger.error(f"Failed to get PostgreSQL stats: {e}")
        stats["postgres"]["error"] = str(e)

    # Neo4j stats
    try:
        neo4j_uri = os.getenv("NEO4J_URI", "bolt://neo4j:7687")
        neo4j_user = os.getenv("NEO4J_USER", "neo4j")
        neo4j_password = os.getenv("NEO4J_PASSWORD", "pmspassword123")

        driver = GraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_password))
        with driver.session() as session:
            # Node count
            result = session.run("MATCH (n) RETURN count(n) as count")
            stats["neo4j"]["nodes"] = result.single()["count"]

            # Relationship count
            result = session.run("MATCH ()-[r]->() RETURN count(r) as count")
            stats["neo4j"]["relationships"] = result.single()["count"]

            # Labels
            result = session.run("CALL db.labels()")
            stats["neo4j"]["labels"] = [record["label"] for record in result]

        driver.close()

    except Exception as e:
        logger.error(f"Failed to get Neo4j stats: {e}")
        stats["neo4j"]["error"] = str(e)

    return jsonify(stats)


# ============================================
# Entity Chunk Sync Endpoints
# ============================================

_entity_sync_status = {
    "is_syncing": False,
    "current_project": None,
    "progress": 0,
    "started_at": None,
    "error": None,
    "results": None,
}
_entity_sync_lock = threading.Lock()


def _update_entity_sync_status(**kwargs):
    """Update entity sync status safely."""
    with _entity_sync_lock:
        _entity_sync_status.update(kwargs)


def _reset_entity_sync_status():
    """Reset entity sync status."""
    with _entity_sync_lock:
        _entity_sync_status.update({
            "is_syncing": False,
            "current_project": None,
            "progress": 0,
            "started_at": None,
            "error": None,
            "results": None,
        })


@db_admin_bp.route("/api/admin/db/entity-chunks/sync", methods=["POST"])
def trigger_entity_chunk_sync():
    """
    Trigger Entity to Chunk synchronization for RAG.

    Converts PMS entities (Project, Sprint, Task, etc.) to searchable chunks
    with proper access control levels.

    Request body:
        {
            "project_id": "proj-001" (optional, sync all if not provided),
            "triggered_by": "username"
        }

    Returns:
        {
            "message": "Entity chunk sync started",
            "project_id": "proj-001" | "all"
        }
    """
    data = request.json or {}
    project_id = data.get("project_id")
    triggered_by = data.get("triggered_by", "admin")

    with _entity_sync_lock:
        if _entity_sync_status["is_syncing"]:
            return jsonify({"error": "An entity sync is already in progress"}), 409

    # Start sync in background thread
    _update_entity_sync_status(
        is_syncing=True,
        current_project=project_id or "all",
        progress=0,
        started_at=datetime.now().isoformat(),
        error=None,
        results=None,
    )

    thread = threading.Thread(
        target=_run_entity_sync_async,
        args=(project_id, triggered_by),
        daemon=True
    )
    thread.start()

    return jsonify({
        "message": "Entity chunk sync started",
        "project_id": project_id or "all",
    })


def _run_entity_sync_async(project_id: Optional[str], triggered_by: str):
    """Run entity chunk sync in background thread."""
    try:
        service = get_entity_chunk_service()

        if not service.initialize():
            raise RuntimeError("Failed to initialize EntityChunkService")

        if project_id:
            _update_entity_sync_status(current_project=project_id, progress=50)
            results = {project_id: service.sync_project_entities(project_id)}
        else:
            results = service.sync_all_entities()

        _update_entity_sync_status(progress=100, results=results)
        logger.info(f"Entity chunk sync completed: {results}")

    except Exception as e:
        logger.error(f"Entity chunk sync failed: {e}")
        _update_entity_sync_status(error=str(e))

    finally:
        _update_entity_sync_status(is_syncing=False)


@db_admin_bp.route("/api/admin/db/entity-chunks/sync/status", methods=["GET"])
def get_entity_chunk_sync_status():
    """
    Get current entity chunk sync status.

    Returns:
        {
            "is_syncing": bool,
            "current_project": string | null,
            "progress": 0-100,
            "started_at": ISO timestamp | null,
            "error": string | null,
            "results": {...} | null
        }
    """
    with _entity_sync_lock:
        return jsonify(_entity_sync_status.copy())


@db_admin_bp.route("/api/admin/db/entity-chunks/stats", methods=["GET"])
def get_entity_chunk_stats():
    """
    Get entity chunk statistics.

    Returns:
        {
            "initialized": bool,
            "chunk_stats": [
                {
                    "entity_type": "project_status",
                    "project_id": "proj-001",
                    "count": 1,
                    "last_synced": ISO timestamp
                }
            ],
            "total_chunks": int
        }
    """
    try:
        service = get_entity_chunk_service()

        if not service._initialized:
            service.initialize()

        status = service.get_sync_status()

        # Calculate total chunks
        total = sum(stat.get("count", 0) for stat in status.get("chunk_stats", []))
        status["total_chunks"] = total

        return jsonify(status)

    except Exception as e:
        logger.error(f"Failed to get entity chunk stats: {e}")
        return jsonify({"error": str(e)}), 500


@db_admin_bp.route("/api/admin/db/entity-chunks/project/<project_id>", methods=["POST"])
def sync_project_entity_chunks(project_id: str):
    """
    Sync entity chunks for a specific project.

    This is a synchronous endpoint (waits for completion).

    Returns:
        {
            "message": "Sync completed",
            "project_id": "proj-001",
            "results": {
                "project_status": 1,
                "sprint_statuses": 3,
                "task_summaries": 3,
                ...
            }
        }
    """
    try:
        service = get_entity_chunk_service()

        if not service.initialize():
            return jsonify({"error": "Failed to initialize service"}), 500

        results = service.sync_project_entities(project_id)

        return jsonify({
            "message": "Sync completed",
            "project_id": project_id,
            "results": results,
            "total_chunks": sum(results.values()),
        })

    except Exception as e:
        logger.error(f"Failed to sync project entity chunks: {e}")
        return jsonify({"error": str(e)}), 500


@db_admin_bp.route("/api/admin/db/entity-chunks/project/<project_id>", methods=["DELETE"])
def delete_project_entity_chunks(project_id: str):
    """
    Delete all entity chunks for a specific project.

    Returns:
        {
            "message": "Entity chunks deleted",
            "project_id": "proj-001"
        }
    """
    from neo4j import GraphDatabase

    try:
        neo4j_uri = os.getenv("NEO4J_URI", "bolt://neo4j:7687")
        neo4j_user = os.getenv("NEO4J_USER", "neo4j")
        neo4j_password = os.getenv("NEO4J_PASSWORD", "pmspassword123")

        driver = GraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_password))

        with driver.session() as session:
            result = session.run("""
                MATCH (c:Chunk)
                WHERE c.project_id = $project_id
                  AND c.structure_type = 'entity'
                WITH c, count(*) as cnt
                DETACH DELETE c
                RETURN cnt
            """, project_id=project_id)

            deleted_count = result.single()
            deleted = deleted_count["cnt"] if deleted_count else 0

        driver.close()

        return jsonify({
            "message": "Entity chunks deleted",
            "project_id": project_id,
            "deleted_count": deleted,
        })

    except Exception as e:
        logger.error(f"Failed to delete entity chunks: {e}")
        return jsonify({"error": str(e)}), 500
