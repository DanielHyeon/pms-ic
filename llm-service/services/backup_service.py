"""
Backup Service for PostgreSQL and Neo4j databases.

Provides functionality to create, restore, and manage database backups.
"""

import os
import subprocess
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, asdict
from enum import Enum
import threading
import psycopg2
from neo4j import GraphDatabase

logger = logging.getLogger(__name__)


class BackupType(Enum):
    POSTGRES = "POSTGRES"
    NEO4J = "NEO4J"
    FULL = "FULL"


class BackupStatus(Enum):
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


@dataclass
class BackupConfig:
    """Configuration for backup service."""
    # PostgreSQL settings
    pg_host: str = os.getenv("PG_HOST", "postgres")
    pg_port: int = int(os.getenv("PG_PORT", "5432"))
    pg_database: str = os.getenv("PG_DATABASE", "pms_db")
    pg_user: str = os.getenv("PG_USER", "pms_user")
    pg_password: str = os.getenv("PG_PASSWORD", "pms_password")

    # Neo4j settings
    neo4j_uri: str = os.getenv("NEO4J_URI", "bolt://neo4j:7687")
    neo4j_user: str = os.getenv("NEO4J_USER", "neo4j")
    neo4j_password: str = os.getenv("NEO4J_PASSWORD", "pmspassword123")

    # Backup settings
    backup_dir: str = os.getenv("BACKUP_DIR", "/app/backups")
    max_backups: int = int(os.getenv("MAX_BACKUPS", "10"))


@dataclass
class BackupResult:
    """Result of a backup operation."""
    backup_id: str
    backup_type: str
    backup_name: str
    file_path: str
    file_size_bytes: int
    status: str
    duration_ms: int
    error_message: Optional[str] = None
    created_at: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class BackupService:
    """Service for database backup and restore operations."""

    _instance = None
    _lock = threading.Lock()

    def __new__(cls, config: Optional[BackupConfig] = None):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self, config: Optional[BackupConfig] = None):
        if self._initialized:
            return

        self.config = config or BackupConfig()
        self._current_backup: Optional[Dict[str, Any]] = None
        self._backup_lock = threading.Lock()

        # Ensure backup directory exists
        Path(self.config.backup_dir).mkdir(parents=True, exist_ok=True)

        self._initialized = True
        logger.info(f"BackupService initialized. Backup dir: {self.config.backup_dir}")

    def get_status(self) -> Dict[str, Any]:
        """Get current backup status."""
        with self._backup_lock:
            if self._current_backup:
                return {
                    "is_running": True,
                    "backup_type": self._current_backup.get("backup_type"),
                    "backup_name": self._current_backup.get("backup_name"),
                    "started_at": self._current_backup.get("started_at"),
                    "progress": self._current_backup.get("progress", 0),
                }
            return {"is_running": False}

    def create_backup(
        self,
        backup_type: str,
        created_by: str,
        pg_conn_string: Optional[str] = None
    ) -> BackupResult:
        """
        Create a database backup.

        Args:
            backup_type: Type of backup (POSTGRES, NEO4J, FULL)
            created_by: Username who triggered the backup
            pg_conn_string: Optional PostgreSQL connection string for recording history

        Returns:
            BackupResult with backup details
        """
        start_time = datetime.now()
        timestamp = start_time.strftime("%Y%m%d_%H%M%S")
        backup_name = f"pms_backup_{backup_type.lower()}_{timestamp}"
        backup_id = f"{backup_type.lower()}-{timestamp}"

        with self._backup_lock:
            if self._current_backup:
                raise RuntimeError("Another backup is already in progress")

            self._current_backup = {
                "backup_id": backup_id,
                "backup_type": backup_type,
                "backup_name": backup_name,
                "started_at": start_time.isoformat(),
                "progress": 0,
            }

        try:
            file_path = ""
            file_size = 0

            if backup_type in [BackupType.POSTGRES.value, BackupType.FULL.value]:
                pg_result = self._backup_postgres(backup_name)
                file_path = pg_result["file_path"]
                file_size += pg_result["file_size"]
                self._update_progress(50 if backup_type == BackupType.FULL.value else 100)

            if backup_type in [BackupType.NEO4J.value, BackupType.FULL.value]:
                neo4j_result = self._backup_neo4j(backup_name)
                if backup_type == BackupType.FULL.value:
                    file_path = f"{self.config.backup_dir}/{backup_name}"
                else:
                    file_path = neo4j_result["file_path"]
                file_size += neo4j_result["file_size"]
                self._update_progress(100)

            end_time = datetime.now()
            duration_ms = int((end_time - start_time).total_seconds() * 1000)

            result = BackupResult(
                backup_id=backup_id,
                backup_type=backup_type,
                backup_name=backup_name,
                file_path=file_path,
                file_size_bytes=file_size,
                status=BackupStatus.COMPLETED.value,
                duration_ms=duration_ms,
                created_at=start_time.isoformat(),
            )

            # Record in database if connection provided
            if pg_conn_string:
                self._record_backup_history(pg_conn_string, result, created_by)

            # Cleanup old backups
            self._cleanup_old_backups()

            logger.info(f"Backup completed: {backup_name}, size: {file_size} bytes")
            return result

        except Exception as e:
            logger.error(f"Backup failed: {e}")
            end_time = datetime.now()
            duration_ms = int((end_time - start_time).total_seconds() * 1000)

            result = BackupResult(
                backup_id=backup_id,
                backup_type=backup_type,
                backup_name=backup_name,
                file_path="",
                file_size_bytes=0,
                status=BackupStatus.FAILED.value,
                duration_ms=duration_ms,
                error_message=str(e),
                created_at=start_time.isoformat(),
            )

            if pg_conn_string:
                self._record_backup_history(pg_conn_string, result, created_by)

            raise

        finally:
            with self._backup_lock:
                self._current_backup = None

    def _update_progress(self, progress: int):
        """Update current backup progress."""
        with self._backup_lock:
            if self._current_backup:
                self._current_backup["progress"] = progress

    def _backup_postgres(self, backup_name: str) -> Dict[str, Any]:
        """Create PostgreSQL backup using pg_dump."""
        file_path = f"{self.config.backup_dir}/{backup_name}_postgres.sql"

        env = os.environ.copy()
        env["PGPASSWORD"] = self.config.pg_password

        cmd = [
            "pg_dump",
            "-h", self.config.pg_host,
            "-p", str(self.config.pg_port),
            "-U", self.config.pg_user,
            "-d", self.config.pg_database,
            "-f", file_path,
            "--clean",
            "--if-exists",
        ]

        logger.info(f"Running PostgreSQL backup: {' '.join(cmd)}")

        result = subprocess.run(
            cmd,
            env=env,
            capture_output=True,
            text=True,
            timeout=600,  # 10 minutes timeout
        )

        if result.returncode != 0:
            raise RuntimeError(f"pg_dump failed: {result.stderr}")

        file_size = os.path.getsize(file_path)
        logger.info(f"PostgreSQL backup created: {file_path}, size: {file_size}")

        return {"file_path": file_path, "file_size": file_size}

    def _backup_neo4j(self, backup_name: str) -> Dict[str, Any]:
        """Create Neo4j backup using APOC export (online backup)."""
        file_path = f"{self.config.backup_dir}/{backup_name}_neo4j.json"

        driver = GraphDatabase.driver(
            self.config.neo4j_uri,
            auth=(self.config.neo4j_user, self.config.neo4j_password)
        )

        try:
            with driver.session() as session:
                # Export all nodes and relationships as JSON
                export_data = {"nodes": [], "relationships": []}

                # Export nodes
                nodes_result = session.run("""
                    MATCH (n)
                    RETURN labels(n) as labels, properties(n) as props, id(n) as id
                """)
                for record in nodes_result:
                    export_data["nodes"].append({
                        "id": record["id"],
                        "labels": record["labels"],
                        "properties": dict(record["props"])
                    })

                # Export relationships
                rels_result = session.run("""
                    MATCH (a)-[r]->(b)
                    RETURN type(r) as type, properties(r) as props,
                           id(a) as start_id, id(b) as end_id
                """)
                for record in rels_result:
                    export_data["relationships"].append({
                        "type": record["type"],
                        "properties": dict(record["props"]) if record["props"] else {},
                        "start_id": record["start_id"],
                        "end_id": record["end_id"]
                    })

                # Write to file
                with open(file_path, "w", encoding="utf-8") as f:
                    json.dump(export_data, f, indent=2, default=str)

                file_size = os.path.getsize(file_path)
                logger.info(f"Neo4j backup created: {file_path}, size: {file_size}")

                return {"file_path": file_path, "file_size": file_size}

        finally:
            driver.close()

    def restore_backup(
        self,
        backup_id: str,
        pg_conn_string: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Restore from a backup.

        Args:
            backup_id: ID of backup to restore
            pg_conn_string: PostgreSQL connection string

        Returns:
            Dict with restore status
        """
        # Find backup in history
        backup_info = self._find_backup(backup_id, pg_conn_string)
        if not backup_info:
            raise ValueError(f"Backup not found: {backup_id}")

        backup_type = backup_info["backup_type"]
        backup_name = backup_info["backup_name"]

        start_time = datetime.now()

        try:
            if backup_type in [BackupType.POSTGRES.value, BackupType.FULL.value]:
                self._restore_postgres(backup_name)

            if backup_type in [BackupType.NEO4J.value, BackupType.FULL.value]:
                self._restore_neo4j(backup_name)

            end_time = datetime.now()
            duration_ms = int((end_time - start_time).total_seconds() * 1000)

            return {
                "status": "COMPLETED",
                "backup_id": backup_id,
                "backup_name": backup_name,
                "duration_ms": duration_ms,
            }

        except Exception as e:
            logger.error(f"Restore failed: {e}")
            raise

    def _restore_postgres(self, backup_name: str):
        """Restore PostgreSQL from backup."""
        file_path = f"{self.config.backup_dir}/{backup_name}_postgres.sql"

        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Backup file not found: {file_path}")

        env = os.environ.copy()
        env["PGPASSWORD"] = self.config.pg_password

        cmd = [
            "psql",
            "-h", self.config.pg_host,
            "-p", str(self.config.pg_port),
            "-U", self.config.pg_user,
            "-d", self.config.pg_database,
            "-f", file_path,
        ]

        logger.info(f"Running PostgreSQL restore: {' '.join(cmd)}")

        result = subprocess.run(
            cmd,
            env=env,
            capture_output=True,
            text=True,
            timeout=600,
        )

        if result.returncode != 0:
            raise RuntimeError(f"psql restore failed: {result.stderr}")

        logger.info(f"PostgreSQL restored from: {file_path}")

    def _restore_neo4j(self, backup_name: str):
        """Restore Neo4j from backup."""
        file_path = f"{self.config.backup_dir}/{backup_name}_neo4j.json"

        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Backup file not found: {file_path}")

        with open(file_path, "r", encoding="utf-8") as f:
            export_data = json.load(f)

        driver = GraphDatabase.driver(
            self.config.neo4j_uri,
            auth=(self.config.neo4j_user, self.config.neo4j_password)
        )

        try:
            with driver.session() as session:
                # Clear existing data
                session.run("MATCH (n) DETACH DELETE n")

                # Create nodes with id mapping
                id_map = {}
                for node in export_data["nodes"]:
                    labels_str = ":".join(node["labels"]) if node["labels"] else "Node"
                    result = session.run(
                        f"CREATE (n:{labels_str} $props) RETURN id(n) as new_id",
                        props=node["properties"]
                    )
                    new_id = result.single()["new_id"]
                    id_map[node["id"]] = new_id

                # Create relationships
                for rel in export_data["relationships"]:
                    start_id = id_map.get(rel["start_id"])
                    end_id = id_map.get(rel["end_id"])
                    if start_id is not None and end_id is not None:
                        session.run(
                            f"""
                            MATCH (a), (b)
                            WHERE id(a) = $start_id AND id(b) = $end_id
                            CREATE (a)-[r:{rel['type']}]->(b)
                            SET r = $props
                            """,
                            start_id=start_id,
                            end_id=end_id,
                            props=rel["properties"]
                        )

                logger.info(f"Neo4j restored from: {file_path}")

        finally:
            driver.close()

    def list_backups(self, pg_conn_string: Optional[str] = None, limit: int = 20) -> List[Dict[str, Any]]:
        """List all backups from history."""
        if pg_conn_string:
            try:
                conn = psycopg2.connect(pg_conn_string)
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT id, backup_type, backup_name, file_path, file_size_bytes,
                           status, error_message, created_by, duration_ms, started_at, completed_at
                    FROM admin.backup_history
                    ORDER BY created_at DESC
                    LIMIT %s
                """, (limit,))
                rows = cursor.fetchall()
                conn.close()

                return [
                    {
                        "id": str(row[0]),
                        "backup_type": row[1],
                        "backup_name": row[2],
                        "file_path": row[3],
                        "file_size_bytes": row[4],
                        "status": row[5],
                        "error_message": row[6],
                        "created_by": row[7],
                        "duration_ms": row[8],
                        "started_at": row[9].isoformat() if row[9] else None,
                        "completed_at": row[10].isoformat() if row[10] else None,
                    }
                    for row in rows
                ]
            except Exception as e:
                logger.error(f"Failed to list backups from DB: {e}")

        # Fallback: list from filesystem
        backups = []
        backup_dir = Path(self.config.backup_dir)
        if backup_dir.exists():
            for file in sorted(backup_dir.glob("pms_backup_*.sql"), reverse=True)[:limit]:
                stat = file.stat()
                backups.append({
                    "id": file.stem,
                    "backup_type": "POSTGRES" if "_postgres" in file.name else "UNKNOWN",
                    "backup_name": file.stem,
                    "file_path": str(file),
                    "file_size_bytes": stat.st_size,
                    "status": "COMPLETED",
                    "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                })

        return backups

    def delete_backup(self, backup_id: str, pg_conn_string: Optional[str] = None) -> bool:
        """Delete a backup."""
        backup_info = self._find_backup(backup_id, pg_conn_string)
        if not backup_info:
            raise ValueError(f"Backup not found: {backup_id}")

        # Delete files
        backup_name = backup_info["backup_name"]
        for suffix in ["_postgres.sql", "_neo4j.json"]:
            file_path = f"{self.config.backup_dir}/{backup_name}{suffix}"
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"Deleted backup file: {file_path}")

        # Delete from DB
        if pg_conn_string:
            try:
                conn = psycopg2.connect(pg_conn_string)
                cursor = conn.cursor()
                cursor.execute("DELETE FROM admin.backup_history WHERE id = %s", (backup_id,))
                conn.commit()
                conn.close()
            except Exception as e:
                logger.error(f"Failed to delete backup from DB: {e}")

        return True

    def _find_backup(self, backup_id: str, pg_conn_string: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Find backup by ID."""
        if pg_conn_string:
            try:
                conn = psycopg2.connect(pg_conn_string)
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT id, backup_type, backup_name, file_path
                    FROM admin.backup_history
                    WHERE id::text = %s OR backup_name = %s
                """, (backup_id, backup_id))
                row = cursor.fetchone()
                conn.close()

                if row:
                    return {
                        "id": str(row[0]),
                        "backup_type": row[1],
                        "backup_name": row[2],
                        "file_path": row[3],
                    }
            except Exception as e:
                logger.error(f"Failed to find backup in DB: {e}")

        # Fallback: search filesystem
        backup_dir = Path(self.config.backup_dir)
        for file in backup_dir.glob(f"*{backup_id}*"):
            return {
                "id": backup_id,
                "backup_type": "POSTGRES" if "_postgres" in file.name else "NEO4J",
                "backup_name": file.stem.replace("_postgres", "").replace("_neo4j", ""),
                "file_path": str(file),
            }

        return None

    def _record_backup_history(
        self,
        pg_conn_string: str,
        result: BackupResult,
        created_by: str
    ):
        """Record backup in history table."""
        try:
            conn = psycopg2.connect(pg_conn_string)
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO admin.backup_history
                (backup_type, backup_name, file_path, file_size_bytes, status,
                 error_message, created_by, duration_ms, started_at, completed_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                result.backup_type,
                result.backup_name,
                result.file_path,
                result.file_size_bytes,
                result.status,
                result.error_message,
                created_by,
                result.duration_ms,
                result.created_at,
                datetime.now().isoformat() if result.status == BackupStatus.COMPLETED.value else None,
            ))
            conn.commit()
            conn.close()
            logger.info(f"Backup recorded in history: {result.backup_name}")
        except Exception as e:
            logger.error(f"Failed to record backup history: {e}")

    def _cleanup_old_backups(self):
        """Remove old backups exceeding max_backups limit."""
        backup_dir = Path(self.config.backup_dir)
        all_backups = sorted(
            backup_dir.glob("pms_backup_*"),
            key=lambda f: f.stat().st_mtime,
            reverse=True
        )

        # Group by backup name (remove suffix)
        backup_names = set()
        for f in all_backups:
            name = f.stem.replace("_postgres", "").replace("_neo4j", "")
            backup_names.add(name)

        backup_names_list = sorted(backup_names, reverse=True)

        # Delete old ones
        for old_name in backup_names_list[self.config.max_backups:]:
            for suffix in ["_postgres.sql", "_neo4j.json"]:
                old_path = backup_dir / f"{old_name}{suffix}"
                if old_path.exists():
                    old_path.unlink()
                    logger.info(f"Cleaned up old backup: {old_path}")


# Singleton accessor
_backup_service: Optional[BackupService] = None


def get_backup_service(config: Optional[BackupConfig] = None) -> BackupService:
    """Get or create the backup service singleton."""
    global _backup_service
    if _backup_service is None:
        _backup_service = BackupService(config)
    return _backup_service
