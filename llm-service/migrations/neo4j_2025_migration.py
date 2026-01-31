"""
Neo4j 2025.x Migration Script

Migrates from Neo4j 5.26 to Neo4j 2025.x with:
- Cypher 25 syntax
- Native VECTOR<FLOAT, N> type for embeddings
- Updated vector indexes

Usage:
    python -m migrations.neo4j_2025_migration

Or from Python:
    from migrations.neo4j_2025_migration import run_migration
    run_migration()
"""

import os
import sys
import logging
from typing import Optional

from neo4j import GraphDatabase
from neo4j.exceptions import Neo4jError

logger = logging.getLogger(__name__)

# Embedding dimensions for multilingual-e5-large model
EMBEDDING_DIMENSIONS = 1024
BATCH_SIZE = 500


class Neo4j2025Migration:
    """Handles migration to Neo4j 2025.x with Cypher 25 and VECTOR type."""

    def __init__(
        self,
        uri: Optional[str] = None,
        user: Optional[str] = None,
        password: Optional[str] = None,
    ):
        self.uri = uri or os.getenv("NEO4J_URI", "bolt://localhost:7687")
        self.user = user or os.getenv("NEO4J_USER", "neo4j")
        self.password = password or os.getenv("NEO4J_PASSWORD", "pmspassword123")
        self.driver = None

    def connect(self):
        """Establish connection to Neo4j."""
        logger.info(f"Connecting to Neo4j at {self.uri}")
        self.driver = GraphDatabase.driver(
            self.uri, auth=(self.user, self.password)
        )
        # Verify connection
        with self.driver.session() as session:
            result = session.run("RETURN 1 as test")
            result.single()
        logger.info("Connected to Neo4j successfully")

    def close(self):
        """Close the driver connection."""
        if self.driver:
            self.driver.close()
            logger.info("Neo4j connection closed")

    def check_neo4j_version(self) -> str:
        """Check current Neo4j version."""
        with self.driver.session() as session:
            result = session.run("CALL dbms.components() YIELD name, versions")
            record = result.single()
            version = record["versions"][0] if record else "unknown"
            logger.info(f"Neo4j version: {version}")
            return version

    def check_cypher_25_support(self) -> bool:
        """Check if Cypher 25 is supported."""
        with self.driver.session() as session:
            try:
                result = session.run("CYPHER 25 RETURN 1 as test")
                result.single()
                logger.info("Cypher 25 is supported")
                return True
            except Neo4jError as e:
                logger.warning(f"Cypher 25 not supported: {e}")
                return False

    def get_chunk_count(self) -> int:
        """Get total count of chunks with embeddings."""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (c:Chunk)
                WHERE c.embedding IS NOT NULL
                RETURN count(c) as total
            """)
            total = result.single()["total"]
            logger.info(f"Total chunks with embeddings: {total}")
            return total

    def drop_old_vector_index(self):
        """Drop the old vector index before migration."""
        with self.driver.session() as session:
            try:
                # Check if index exists
                result = session.run("""
                    SHOW INDEXES
                    WHERE name = 'chunk_embeddings'
                """)
                records = list(result)

                if records:
                    logger.info("Dropping old vector index 'chunk_embeddings'...")
                    session.run("DROP INDEX chunk_embeddings IF EXISTS")
                    logger.info("Old vector index dropped")
                else:
                    logger.info("No existing 'chunk_embeddings' index to drop")

            except Neo4jError as e:
                logger.warning(f"Error checking/dropping old index: {e}")

    def migrate_embeddings_to_vector_type(self, use_cypher_25: bool = True):
        """
        Convert embeddings from LIST<FLOAT> to VECTOR<FLOAT, 1024>.

        Processes in batches to avoid memory issues with large datasets.
        """
        total = self.get_chunk_count()
        if total == 0:
            logger.info("No chunks to migrate")
            return

        migrated = 0
        cypher_prefix = "CYPHER 25\n" if use_cypher_25 else ""

        logger.info(f"Starting migration of {total} chunks...")

        with self.driver.session() as session:
            while migrated < total:
                # Migrate a batch of chunks
                query = f"""{cypher_prefix}
                    MATCH (c:Chunk)
                    WHERE c.embedding IS NOT NULL
                      AND NOT c.embedding IS :: VECTOR
                    WITH c LIMIT $batch_size
                    SET c.embedding = CAST(c.embedding AS VECTOR<FLOAT, {EMBEDDING_DIMENSIONS}>)
                    RETURN count(c) as batch_count
                """

                try:
                    result = session.run(query, batch_size=BATCH_SIZE)
                    batch_count = result.single()["batch_count"]

                    if batch_count == 0:
                        # No more chunks to migrate
                        break

                    migrated += batch_count
                    progress = 100 * migrated / total
                    logger.info(
                        f"Migrated {migrated}/{total} chunks ({progress:.1f}%)"
                    )

                except Neo4jError as e:
                    logger.error(f"Migration batch failed: {e}")
                    raise

        logger.info(f"Embedding migration completed: {migrated} chunks migrated")

    def create_new_vector_index(self, use_cypher_25: bool = True):
        """Create new vector index with Cypher 25 syntax."""
        cypher_prefix = "CYPHER 25\n" if use_cypher_25 else ""

        with self.driver.session() as session:
            logger.info("Creating new vector index with Cypher 25...")

            query = f"""{cypher_prefix}
                CREATE VECTOR INDEX chunk_embeddings IF NOT EXISTS
                FOR (c:Chunk) ON (c.embedding)
                OPTIONS {{indexConfig: {{
                    `vector.dimensions`: {EMBEDDING_DIMENSIONS},
                    `vector.similarity_function`: 'cosine'
                }}}}
            """

            try:
                session.run(query)
                logger.info("Vector index 'chunk_embeddings' created successfully")
            except Neo4jError as e:
                logger.error(f"Failed to create vector index: {e}")
                raise

    def verify_migration(self, use_cypher_25: bool = True) -> bool:
        """Verify the migration was successful."""
        cypher_prefix = "CYPHER 25\n" if use_cypher_25 else ""
        success = True

        with self.driver.session() as session:
            # 1. Check vector index exists
            result = session.run("""
                SHOW INDEXES
                WHERE type = 'VECTOR' AND name = 'chunk_embeddings'
            """)
            records = list(result)

            if not records:
                logger.error("Vector index 'chunk_embeddings' not found!")
                success = False
            else:
                index_info = records[0]
                logger.info(
                    f"Vector index found: state={index_info.get('state')}, "
                    f"populationPercent={index_info.get('populationPercent')}"
                )

            # 2. Check embeddings are VECTOR type
            query = f"""{cypher_prefix}
                MATCH (c:Chunk)
                WHERE c.embedding IS NOT NULL
                RETURN c.embedding IS :: VECTOR AS is_vector
                LIMIT 1
            """

            result = session.run(query)
            record = result.single()

            if record:
                if record["is_vector"]:
                    logger.info("Embeddings verified as VECTOR type")
                else:
                    logger.error("Embeddings are NOT VECTOR type!")
                    success = False
            else:
                logger.warning("No chunks with embeddings found to verify")

            # 3. Test vector search
            try:
                test_embedding = [0.1] * EMBEDDING_DIMENSIONS
                query = f"""{cypher_prefix}
                    CALL db.index.vector.queryNodes(
                        'chunk_embeddings', 1,
                        CAST($embedding AS VECTOR<FLOAT, {EMBEDDING_DIMENSIONS}>)
                    )
                    YIELD node, score
                    RETURN count(node) as result_count
                """
                result = session.run(query, embedding=test_embedding)
                count = result.single()["result_count"]
                logger.info(f"Vector search test passed (found {count} results)")
            except Neo4jError as e:
                logger.error(f"Vector search test failed: {e}")
                success = False

        return success

    def run_full_migration(self):
        """Run the complete migration process."""
        logger.info("=" * 60)
        logger.info("Starting Neo4j 2025.x Migration")
        logger.info("=" * 60)

        # Step 1: Connect and check version
        self.connect()
        version = self.check_neo4j_version()

        # Step 2: Check Cypher 25 support
        use_cypher_25 = self.check_cypher_25_support()
        if not use_cypher_25:
            logger.warning(
                "Cypher 25 not supported. Running migration with legacy syntax."
            )
            # Fallback for older versions
            logger.error(
                "Please upgrade to Neo4j 2025.x before running this migration"
            )
            return False

        # Step 3: Drop old vector index
        self.drop_old_vector_index()

        # Step 4: Migrate embeddings to VECTOR type
        self.migrate_embeddings_to_vector_type(use_cypher_25=use_cypher_25)

        # Step 5: Create new vector index
        self.create_new_vector_index(use_cypher_25=use_cypher_25)

        # Step 6: Verify migration
        success = self.verify_migration(use_cypher_25=use_cypher_25)

        logger.info("=" * 60)
        if success:
            logger.info("Migration completed successfully!")
        else:
            logger.error("Migration completed with errors!")
        logger.info("=" * 60)

        return success


def run_migration(
    uri: Optional[str] = None,
    user: Optional[str] = None,
    password: Optional[str] = None,
) -> bool:
    """
    Run the Neo4j 2025.x migration.

    Args:
        uri: Neo4j connection URI (default from NEO4J_URI env var)
        user: Neo4j username (default from NEO4J_USER env var)
        password: Neo4j password (default from NEO4J_PASSWORD env var)

    Returns:
        True if migration succeeded, False otherwise
    """
    migration = Neo4j2025Migration(uri=uri, user=user, password=password)
    try:
        return migration.run_full_migration()
    finally:
        migration.close()


if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    # Run migration
    success = run_migration()
    sys.exit(0 if success else 1)
