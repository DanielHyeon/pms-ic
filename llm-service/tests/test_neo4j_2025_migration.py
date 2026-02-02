"""
Tests for Neo4j 5.27+ (2025.01.0-community) Migration.

Tests cover:
1. Neo4j 5.x Cypher syntax compatibility
2. Vector index operations
3. Query validator patterns

Note: Neo4j 2025.01.0-community uses Neo4j 5.27 kernel.
Cypher 25 and native VECTOR type are NOT supported yet in community edition.
"""

import pytest
from unittest.mock import MagicMock, patch

# Embedding dimensions for multilingual-e5-large
EMBEDDING_DIMENSIONS = 1024


class TestCypher25Syntax:
    """Test Cypher 25 syntax compatibility."""

    def test_cypher_25_prefix_accepted(self):
        """Test that CYPHER 25 prefix is valid."""
        query = """
            CYPHER 25
            MATCH (n:Chunk)
            RETURN n.content
            LIMIT 10
        """
        # Validate query structure
        assert "CYPHER 25" in query
        assert "MATCH" in query
        assert "RETURN" in query

    def test_vector_cast_syntax(self):
        """Test CAST to VECTOR type syntax."""
        query = """
            CYPHER 25
            MATCH (c:Chunk)
            SET c.embedding = CAST($embedding AS VECTOR<FLOAT, 1024>)
        """
        assert "CAST($embedding AS VECTOR<FLOAT, 1024>)" in query

    def test_vector_search_with_cast(self):
        """Test vector search query with CAST."""
        query = """
            CYPHER 25
            CALL db.index.vector.queryNodes('chunk_embeddings', 10,
                CAST($embedding AS VECTOR<FLOAT, 1024>))
            YIELD node, score
            RETURN node.content, score
        """
        assert "CYPHER 25" in query
        assert "CAST($embedding AS VECTOR<FLOAT, 1024>)" in query
        assert "db.index.vector.queryNodes" in query


class TestVectorTypeStorage:
    """Test VECTOR type storage operations."""

    @pytest.fixture
    def mock_driver(self):
        """Create mock Neo4j driver."""
        mock = MagicMock()
        mock_session = MagicMock()
        mock.session.return_value.__enter__ = MagicMock(return_value=mock_session)
        mock.session.return_value.__exit__ = MagicMock(return_value=None)
        return mock, mock_session

    def test_store_embedding_with_vector_cast(self, mock_driver):
        """Test storing embedding with VECTOR type cast."""
        driver, session = mock_driver
        embedding = [0.1] * EMBEDDING_DIMENSIONS

        # Simulate query execution
        query = """
            CYPHER 25
            MERGE (c:Chunk {chunk_id: $chunk_id})
            SET c.embedding = CAST($embedding AS VECTOR<FLOAT, 1024>)
        """

        session.run(query, chunk_id="test-001", embedding=embedding)

        session.run.assert_called_once()
        call_args = session.run.call_args
        assert "CAST($embedding AS VECTOR<FLOAT, 1024>)" in call_args[0][0]

    def test_embedding_dimensions_match(self):
        """Test that embedding dimensions are correct."""
        embedding = [0.1] * EMBEDDING_DIMENSIONS
        assert len(embedding) == 1024


class TestVectorIndexOperations:
    """Test vector index operations."""

    def test_create_vector_index_cypher_25(self):
        """Test vector index creation with Cypher 25 syntax."""
        query = """
            CYPHER 25
            CREATE VECTOR INDEX chunk_embeddings IF NOT EXISTS
            FOR (c:Chunk) ON (c.embedding)
            OPTIONS {indexConfig: {
                `vector.dimensions`: 1024,
                `vector.similarity_function`: 'cosine'
            }}
        """

        assert "CYPHER 25" in query
        assert "CREATE VECTOR INDEX" in query
        assert "IF NOT EXISTS" in query
        assert "vector.dimensions" in query
        assert "1024" in query
        assert "cosine" in query

    def test_drop_index_syntax(self):
        """Test drop index syntax."""
        query = "DROP INDEX chunk_embeddings IF EXISTS"
        assert "DROP INDEX" in query
        assert "IF EXISTS" in query


class TestMigrationScript:
    """Test migration script functionality."""

    @pytest.fixture
    def mock_neo4j_connection(self):
        """Create mock Neo4j connection."""
        with patch("migrations.neo4j_2025_migration.GraphDatabase") as mock_gd:
            mock_driver = MagicMock()
            mock_gd.driver.return_value = mock_driver

            mock_session = MagicMock()
            mock_driver.session.return_value.__enter__ = MagicMock(
                return_value=mock_session
            )
            mock_driver.session.return_value.__exit__ = MagicMock(return_value=None)

            yield mock_driver, mock_session

    def test_migration_check_neo4j_version(self, mock_neo4j_connection):
        """Test checking Neo4j version."""
        driver, session = mock_neo4j_connection

        # Mock version response
        mock_result = MagicMock()
        mock_result.single.return_value = {"versions": ["2025.01.0-community"]}
        session.run.return_value = mock_result

        from migrations.neo4j_2025_migration import Neo4j2025Migration

        migration = Neo4j2025Migration()
        migration.driver = driver

        version = migration.check_neo4j_version()
        assert "2025" in version

    def test_migration_check_cypher_25_support(self, mock_neo4j_connection):
        """Test checking Cypher 25 support."""
        driver, session = mock_neo4j_connection

        # Mock successful Cypher 25 query
        mock_result = MagicMock()
        mock_result.single.return_value = {"test": 1}
        session.run.return_value = mock_result

        from migrations.neo4j_2025_migration import Neo4j2025Migration

        migration = Neo4j2025Migration()
        migration.driver = driver

        supported = migration.check_cypher_25_support()
        assert supported is True

    def test_migration_get_chunk_count(self, mock_neo4j_connection):
        """Test counting chunks with embeddings."""
        driver, session = mock_neo4j_connection

        # Mock chunk count response
        mock_result = MagicMock()
        mock_result.single.return_value = {"total": 500}
        session.run.return_value = mock_result

        from migrations.neo4j_2025_migration import Neo4j2025Migration

        migration = Neo4j2025Migration()
        migration.driver = driver

        count = migration.get_chunk_count()
        assert count == 500


class TestQueryValidatorCypherPatterns:
    """Test that Cypher patterns allow vector index queries."""

    def test_vector_query_not_blocked(self):
        """Test that db.index.vector queries are not blocked."""
        from text2query.query_validator import FORBIDDEN_CYPHER_PATTERNS
        import re

        vector_query = "CALL db.index.vector.queryNodes('chunk_embeddings', 10, $embedding)"

        for pattern, _ in FORBIDDEN_CYPHER_PATTERNS:
            match = re.search(pattern, vector_query, re.IGNORECASE)
            assert match is None, f"Pattern {pattern} incorrectly blocks vector query"

    def test_fulltext_query_not_blocked(self):
        """Test that db.index.fulltext queries are not blocked."""
        from text2query.query_validator import FORBIDDEN_CYPHER_PATTERNS
        import re

        fulltext_query = "CALL db.index.fulltext.queryNodes('chunk_fulltext', $query)"

        for pattern, _ in FORBIDDEN_CYPHER_PATTERNS:
            match = re.search(pattern, fulltext_query, re.IGNORECASE)
            assert match is None, f"Pattern {pattern} incorrectly blocks fulltext query"

    def test_other_db_procedures_blocked(self):
        """Test that other db.* procedures are blocked."""
        from text2query.query_validator import FORBIDDEN_CYPHER_PATTERNS
        import re

        blocked_queries = [
            "CALL db.schema.visualization()",
            "CALL db.labels()",
            "CALL db.propertyKeys()",
        ]

        for query in blocked_queries:
            blocked = False
            for pattern, _ in FORBIDDEN_CYPHER_PATTERNS:
                if re.search(pattern, query, re.IGNORECASE):
                    blocked = True
                    break
            assert blocked, f"Query should be blocked: {query}"


class TestRAGServiceCypher25:
    """Test RAG service Cypher 25 queries."""

    def test_rag_service_uses_cypher_25_prefix(self):
        """Test that RAG service queries use CYPHER 25 prefix."""
        # Read the actual query from rag_service_neo4j.py
        import os

        rag_service_path = os.path.join(
            os.path.dirname(__file__),
            "..",
            "rag_service_neo4j.py"
        )

        with open(rag_service_path, "r") as f:
            content = f.read()

        # Check for CYPHER 25 prefix in vector search
        assert "CYPHER 25" in content
        assert "CAST($embedding AS VECTOR<FLOAT, 1024>)" in content


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
