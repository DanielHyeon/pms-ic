"""
Neo4j Migration Script: Add Access Control Fields to Existing Documents

This script adds default access_level and project_id fields to existing
Document and Chunk nodes in Neo4j for role-based access control.

Usage:
    python migrate_access_levels.py [--dry-run]

Options:
    --dry-run    Show what would be changed without making actual changes
"""

import os
import sys
import logging
from neo4j import GraphDatabase

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

# Default values for migration
DEFAULT_ACCESS_LEVEL = 1  # DEVELOPER/MEMBER level (accessible to all)
DEFAULT_PROJECT_ID = "default"  # Fallback project for unassigned documents


class Neo4jMigration:
    """Migration helper for Neo4j access control fields."""

    def __init__(self, uri: str, user: str, password: str):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))
        logger.info(f"Connected to Neo4j at {uri}")

    def close(self):
        self.driver.close()

    def get_statistics(self) -> dict:
        """Get current statistics about documents and chunks."""
        with self.driver.session() as session:
            # Count documents without access_level
            docs_without_level = session.run(
                """
                MATCH (d:Document)
                WHERE d.access_level IS NULL
                RETURN count(d) as count
                """
            ).single()["count"]

            # Count documents with access_level
            docs_with_level = session.run(
                """
                MATCH (d:Document)
                WHERE d.access_level IS NOT NULL
                RETURN count(d) as count
                """
            ).single()["count"]

            # Count chunks without access_level
            chunks_without_level = session.run(
                """
                MATCH (c:Chunk)
                WHERE c.access_level IS NULL
                RETURN count(c) as count
                """
            ).single()["count"]

            # Count chunks with access_level
            chunks_with_level = session.run(
                """
                MATCH (c:Chunk)
                WHERE c.access_level IS NOT NULL
                RETURN count(c) as count
                """
            ).single()["count"]

            # Count projects
            project_count = session.run(
                """
                MATCH (p:Project)
                RETURN count(p) as count
                """
            ).single()["count"]

            return {
                "docs_without_level": docs_without_level,
                "docs_with_level": docs_with_level,
                "chunks_without_level": chunks_without_level,
                "chunks_with_level": chunks_with_level,
                "project_count": project_count,
            }

    def migrate_documents(self, dry_run: bool = False) -> int:
        """Add default access_level to documents without one."""
        with self.driver.session() as session:
            if dry_run:
                result = session.run(
                    """
                    MATCH (d:Document)
                    WHERE d.access_level IS NULL
                    RETURN count(d) as count
                    """
                )
                count = result.single()["count"]
                logger.info(f"[DRY-RUN] Would update {count} Document nodes")
                return count

            result = session.run(
                """
                MATCH (d:Document)
                WHERE d.access_level IS NULL
                SET d.access_level = $default_level,
                    d.uploaded_by_role = COALESCE(d.uploaded_by_role, 'MEMBER'),
                    d.project_id = COALESCE(d.project_id, $default_project)
                RETURN count(d) as updated
                """,
                default_level=DEFAULT_ACCESS_LEVEL,
                default_project=DEFAULT_PROJECT_ID,
            )
            updated = result.single()["updated"]
            logger.info(f"Updated {updated} Document nodes with default access_level")
            return updated

    def migrate_chunks(self, dry_run: bool = False) -> int:
        """Add default access_level to chunks without one."""
        with self.driver.session() as session:
            if dry_run:
                result = session.run(
                    """
                    MATCH (c:Chunk)
                    WHERE c.access_level IS NULL
                    RETURN count(c) as count
                    """
                )
                count = result.single()["count"]
                logger.info(f"[DRY-RUN] Would update {count} Chunk nodes")
                return count

            result = session.run(
                """
                MATCH (c:Chunk)
                WHERE c.access_level IS NULL
                SET c.access_level = $default_level,
                    c.project_id = COALESCE(c.project_id, $default_project)
                RETURN count(c) as updated
                """,
                default_level=DEFAULT_ACCESS_LEVEL,
                default_project=DEFAULT_PROJECT_ID,
            )
            updated = result.single()["updated"]
            logger.info(f"Updated {updated} Chunk nodes with default access_level")
            return updated

    def sync_chunk_access_from_documents(self, dry_run: bool = False) -> int:
        """
        Sync access_level from Document to its Chunks.
        This ensures chunks inherit access control from their parent document.
        """
        with self.driver.session() as session:
            if dry_run:
                result = session.run(
                    """
                    MATCH (d:Document)-[:HAS_CHUNK]->(c:Chunk)
                    WHERE d.access_level IS NOT NULL
                      AND (c.access_level IS NULL OR c.access_level <> d.access_level)
                    RETURN count(c) as count
                    """
                )
                count = result.single()["count"]
                logger.info(f"[DRY-RUN] Would sync {count} Chunk nodes from parent Document")
                return count

            result = session.run(
                """
                MATCH (d:Document)-[:HAS_CHUNK]->(c:Chunk)
                WHERE d.access_level IS NOT NULL
                SET c.access_level = d.access_level,
                    c.project_id = d.project_id
                RETURN count(c) as synced
                """
            )
            synced = result.single()["synced"]
            logger.info(f"Synced {synced} Chunk nodes with parent Document access_level")
            return synced

    def create_default_project(self, dry_run: bool = False) -> bool:
        """Create a default project node if it doesn't exist."""
        with self.driver.session() as session:
            exists = session.run(
                """
                MATCH (p:Project {project_id: $project_id})
                RETURN count(p) > 0 as exists
                """,
                project_id=DEFAULT_PROJECT_ID,
            ).single()["exists"]

            if exists:
                logger.info(f"Default project '{DEFAULT_PROJECT_ID}' already exists")
                return False

            if dry_run:
                logger.info(f"[DRY-RUN] Would create default Project node '{DEFAULT_PROJECT_ID}'")
                return True

            session.run(
                """
                CREATE (p:Project {
                    project_id: $project_id,
                    name: 'Default Project',
                    description: 'Auto-created default project for migrated documents'
                })
                """,
                project_id=DEFAULT_PROJECT_ID,
            )
            logger.info(f"Created default Project node '{DEFAULT_PROJECT_ID}'")
            return True

    def link_documents_to_default_project(self, dry_run: bool = False) -> int:
        """Link orphan documents (without project relationship) to default project."""
        with self.driver.session() as session:
            if dry_run:
                result = session.run(
                    """
                    MATCH (d:Document)
                    WHERE NOT (d)-[:BELONGS_TO]->(:Project)
                    RETURN count(d) as count
                    """
                )
                count = result.single()["count"]
                logger.info(f"[DRY-RUN] Would link {count} orphan documents to default project")
                return count

            result = session.run(
                """
                MATCH (d:Document)
                WHERE NOT (d)-[:BELONGS_TO]->(:Project)
                WITH d
                MATCH (p:Project {project_id: $project_id})
                MERGE (d)-[:BELONGS_TO]->(p)
                RETURN count(d) as linked
                """,
                project_id=DEFAULT_PROJECT_ID,
            )
            linked = result.single()["linked"]
            logger.info(f"Linked {linked} orphan documents to default project")
            return linked

    def create_index_if_not_exists(self, dry_run: bool = False):
        """Create indexes for access control queries if they don't exist."""
        indexes_to_create = [
            ("idx_chunk_access_level", "Chunk", "access_level"),
            ("idx_chunk_project_id", "Chunk", "project_id"),
            ("idx_document_access_level", "Document", "access_level"),
            ("idx_document_project_id", "Document", "project_id"),
        ]

        with self.driver.session() as session:
            for idx_name, label, prop in indexes_to_create:
                if dry_run:
                    logger.info(f"[DRY-RUN] Would create index {idx_name} on {label}.{prop}")
                    continue

                try:
                    session.run(
                        f"CREATE INDEX {idx_name} IF NOT EXISTS FOR (n:{label}) ON (n.{prop})"
                    )
                    logger.info(f"Created/verified index {idx_name} on {label}.{prop}")
                except Exception as e:
                    logger.warning(f"Index {idx_name} may already exist: {e}")


def main():
    dry_run = "--dry-run" in sys.argv

    if dry_run:
        logger.info("=" * 60)
        logger.info("DRY RUN MODE - No changes will be made")
        logger.info("=" * 60)

    # Get Neo4j connection from environment
    neo4j_uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    neo4j_user = os.getenv("NEO4J_USER", "neo4j")
    neo4j_password = os.getenv("NEO4J_PASSWORD", "password")

    migration = Neo4jMigration(neo4j_uri, neo4j_user, neo4j_password)

    try:
        # Show current statistics
        logger.info("\n=== Current Statistics ===")
        stats = migration.get_statistics()
        logger.info(f"Documents without access_level: {stats['docs_without_level']}")
        logger.info(f"Documents with access_level: {stats['docs_with_level']}")
        logger.info(f"Chunks without access_level: {stats['chunks_without_level']}")
        logger.info(f"Chunks with access_level: {stats['chunks_with_level']}")
        logger.info(f"Project nodes: {stats['project_count']}")

        # Run migration steps
        logger.info("\n=== Running Migration ===")

        # Step 1: Create default project
        migration.create_default_project(dry_run)

        # Step 2: Add default access_level to documents
        migration.migrate_documents(dry_run)

        # Step 3: Add default access_level to chunks
        migration.migrate_chunks(dry_run)

        # Step 4: Sync chunk access from parent documents
        migration.sync_chunk_access_from_documents(dry_run)

        # Step 5: Link orphan documents to default project
        migration.link_documents_to_default_project(dry_run)

        # Step 6: Create indexes for performance
        migration.create_index_if_not_exists(dry_run)

        # Show final statistics
        if not dry_run:
            logger.info("\n=== Final Statistics ===")
            stats = migration.get_statistics()
            logger.info(f"Documents without access_level: {stats['docs_without_level']}")
            logger.info(f"Documents with access_level: {stats['docs_with_level']}")
            logger.info(f"Chunks without access_level: {stats['chunks_without_level']}")
            logger.info(f"Chunks with access_level: {stats['chunks_with_level']}")
            logger.info(f"Project nodes: {stats['project_count']}")

        logger.info("\n=== Migration Complete ===")

    finally:
        migration.close()


if __name__ == "__main__":
    main()
