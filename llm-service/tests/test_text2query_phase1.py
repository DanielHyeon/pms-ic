"""
Phase 1 Tests for Text2Query Package.

Tests cover:
1. Data models correctness
2. SchemaManager functionality (with mocking)
3. QueryValidator 4-layer validation
   - Valid queries pass
   - Security violations are caught
   - Project scope enforcement
   - Schema validation
"""

import pytest
from unittest.mock import MagicMock, patch

from text2query.models import (
    QueryType,
    ValidationErrorType,
    TableInfo,
    NodeLabelInfo,
    RelationshipTypeInfo,
    SchemaContext,
    ValidationError,
    ValidationResult,
    GenerationResult,
    ExecutionResult,
    FewshotExample,
)
from text2query.schema_manager import (
    SchemaManager,
    PROJECT_SCOPED_TABLES,
    FORBIDDEN_TABLES,
    KEYWORD_TABLE_MAP,
)
from text2query.query_validator import (
    QueryValidator,
    FORBIDDEN_SQL_PATTERNS,
    FORBIDDEN_CYPHER_PATTERNS,
    MAX_RESULT_ROWS,
)


class TestModels:
    """Test data model classes."""

    def test_query_type_enum(self):
        """Test QueryType enum values."""
        assert QueryType.SQL.value == "sql"
        assert QueryType.CYPHER.value == "cypher"

    def test_validation_error_type_enum(self):
        """Test ValidationErrorType enum values."""
        assert ValidationErrorType.SYNTAX.value == "syntax"
        assert ValidationErrorType.SCHEMA_MISMATCH.value == "schema_mismatch"
        assert ValidationErrorType.SECURITY_VIOLATION.value == "security_violation"
        assert ValidationErrorType.SCOPE_MISSING.value == "scope_missing"

    def test_table_info_dataclass(self):
        """Test TableInfo dataclass creation."""
        table = TableInfo(
            schema="task",
            name="user_stories",
            columns={"id": "uuid", "title": "varchar"},
            primary_key="id",
            foreign_keys=[{"column": "project_id", "references": "project.projects.id"}],
        )
        assert table.schema == "task"
        assert table.name == "user_stories"
        assert "id" in table.columns

    def test_schema_context_to_sql(self):
        """Test SchemaContext SQL context generation."""
        table = TableInfo(
            schema="task",
            name="sprints",
            columns={"id": "uuid", "name": "varchar", "status": "varchar"},
            primary_key="id",
        )
        context = SchemaContext(tables=[table])
        sql_context = context.to_sql_context()

        assert "task.sprints" in sql_context
        assert "id: uuid" in sql_context

    def test_schema_context_to_cypher(self):
        """Test SchemaContext Cypher context generation."""
        label = NodeLabelInfo(
            label="Document",
            properties={"id": "String", "title": "String"},
        )
        rel = RelationshipTypeInfo(
            type="CONTAINS",
            start_label="Document",
            end_label="Chunk",
        )
        context = SchemaContext(node_labels=[label], relationships=[rel])
        cypher_context = context.to_cypher_context()

        assert ":Document" in cypher_context
        assert "CONTAINS" in cypher_context

    def test_validation_result_error_summary(self):
        """Test ValidationResult error summary generation."""
        result = ValidationResult(
            is_valid=False,
            errors=[
                ValidationError(
                    type=ValidationErrorType.SYNTAX,
                    message="Syntax error near 'FROM'",
                ),
                ValidationError(
                    type=ValidationErrorType.SECURITY_VIOLATION,
                    message="DROP not allowed",
                ),
            ],
        )
        summary = result.get_error_summary()
        assert "[syntax]" in summary
        assert "[security_violation]" in summary

    def test_fewshot_example_to_prompt_format(self):
        """Test FewshotExample prompt formatting."""
        example = FewshotExample(
            id="ex-001",
            question="How many stories in sprint?",
            query="SELECT COUNT(*) FROM task.user_stories WHERE sprint_id = :sprint_id",
            query_type=QueryType.SQL,
            target_tables=["task.user_stories"],
        )
        prompt = example.to_prompt_format()
        assert "Q: How many stories in sprint?" in prompt
        assert "SQL: SELECT" in prompt


class TestSchemaManager:
    """Test SchemaManager functionality."""

    def test_project_scoped_tables_defined(self):
        """Test that PROJECT_SCOPED_TABLES is properly defined."""
        assert "task.user_stories" in PROJECT_SCOPED_TABLES
        assert "project.projects" in PROJECT_SCOPED_TABLES
        assert "chat.chat_sessions" in PROJECT_SCOPED_TABLES

    def test_forbidden_tables_defined(self):
        """Test that FORBIDDEN_TABLES is properly defined."""
        assert "auth.password_history" in FORBIDDEN_TABLES
        assert "auth.tokens" in FORBIDDEN_TABLES

    def test_keyword_table_map_korean(self):
        """Test Korean keyword mappings."""
        assert "스프린트" in KEYWORD_TABLE_MAP
        assert "task.sprints" in KEYWORD_TABLE_MAP["스프린트"]

    def test_keyword_table_map_english(self):
        """Test English keyword mappings."""
        assert "sprint" in KEYWORD_TABLE_MAP
        assert "task.sprints" in KEYWORD_TABLE_MAP["sprint"]

    def test_get_relevant_tables_sprint(self):
        """Test relevant table detection for sprint-related questions."""
        manager = SchemaManager()
        tables = manager.get_relevant_tables("How many sprints are in progress?")
        assert "task.sprints" in tables

    def test_get_relevant_tables_korean(self):
        """Test relevant table detection for Korean questions."""
        manager = SchemaManager()
        tables = manager.get_relevant_tables("진행중인 스프린트 목록")
        assert "task.sprints" in tables

    def test_get_relevant_tables_default(self):
        """Test default tables when no keywords match."""
        manager = SchemaManager()
        tables = manager.get_relevant_tables("random question with no keywords xyz")
        # Should return default tables
        assert len(tables) > 0
        assert "project.projects" in tables

    def test_is_project_scoped_table(self):
        """Test project-scoped table detection."""
        manager = SchemaManager()
        assert manager.is_project_scoped_table("task.user_stories")
        assert not manager.is_project_scoped_table("auth.users")

    def test_cache_invalidation(self):
        """Test schema cache invalidation."""
        manager = SchemaManager()
        manager._pg_schema_cache = {"test": "data"}
        manager._cache_timestamp = None  # Force invalid
        manager.invalidate_cache()
        assert manager._pg_schema_cache is None


class TestQueryValidator:
    """Test QueryValidator 4-layer validation."""

    @pytest.fixture
    def validator(self):
        """Create a QueryValidator with mocked schema manager."""
        validator = QueryValidator()
        # Mock schema manager to avoid DB connections
        validator.schema_manager = MagicMock()
        validator.schema_manager.get_pg_schema.return_value = {
            "task.user_stories": TableInfo(
                schema="task",
                name="user_stories",
                columns={"id": "uuid", "title": "varchar", "project_id": "uuid"},
            ),
            "task.sprints": TableInfo(
                schema="task",
                name="sprints",
                columns={"id": "uuid", "name": "varchar", "project_id": "uuid"},
            ),
            "project.projects": TableInfo(
                schema="project",
                name="projects",
                columns={"id": "uuid", "name": "varchar"},
            ),
        }
        validator.schema_manager.get_neo4j_schema.return_value = {
            "labels": [
                NodeLabelInfo(label="Document", properties={"id": "String"}),
                NodeLabelInfo(label="Chunk", properties={"id": "String"}),
            ],
            "relationships": [],
        }
        return validator

    # =========================================================================
    # Valid Query Tests (2 tests required)
    # =========================================================================

    def test_valid_sql_query(self, validator):
        """Test that a valid SQL query passes all validations."""
        # Mock EXPLAIN validation to avoid DB connection
        validator._validate_sql_syntax = MagicMock(return_value=None)

        query = """
        SELECT id, title, status
        FROM task.user_stories
        WHERE project_id = :project_id
        LIMIT 50
        """
        result = validator.validate(
            query,
            QueryType.SQL,
            project_id="proj-001",
            require_project_scope=True,
        )

        # Should pass all layers
        assert result.layer1_syntax_passed
        assert result.layer2_schema_passed
        assert result.layer3_security_passed
        assert result.layer4_performance_passed
        assert result.has_project_scope
        assert result.is_valid

    def test_valid_cypher_query(self, validator):
        """Test that a valid Cypher query passes all validations."""
        query = """
        MATCH (d:Document {project_id: $project_id})
        RETURN d.id, d.title
        LIMIT 50
        """
        result = validator.validate(
            query,
            QueryType.CYPHER,
            project_id="proj-001",
            require_project_scope=True,
        )

        assert result.layer1_syntax_passed
        assert result.layer3_security_passed
        assert result.layer4_performance_passed
        assert result.has_project_scope

    # =========================================================================
    # Security Validation Tests (1 test required)
    # =========================================================================

    def test_security_drop_table_blocked(self, validator):
        """Test that DROP TABLE is blocked."""
        query = "DROP TABLE task.user_stories"
        result = validator.validate(query, QueryType.SQL)

        assert not result.is_valid
        assert not result.layer3_security_passed
        security_errors = [
            e for e in result.errors
            if e.type == ValidationErrorType.SECURITY_VIOLATION
        ]
        assert len(security_errors) > 0
        assert any("DML/DDL not allowed" in e.message for e in security_errors)

    def test_security_delete_blocked(self, validator):
        """Test that DELETE is blocked."""
        query = "DELETE FROM task.user_stories WHERE id = '123'"
        result = validator.validate(query, QueryType.SQL)

        assert not result.is_valid
        security_errors = [
            e for e in result.errors
            if e.type == ValidationErrorType.SECURITY_VIOLATION
        ]
        assert len(security_errors) > 0

    def test_security_sql_injection_comment_blocked(self, validator):
        """Test that SQL comments are blocked (injection vector)."""
        query = "SELECT id FROM task.user_stories -- WHERE restricted = true"
        result = validator.validate(query, QueryType.SQL)

        assert not result.is_valid
        security_errors = [
            e for e in result.errors
            if e.type == ValidationErrorType.SECURITY_VIOLATION
        ]
        assert any("comments not allowed" in e.message for e in security_errors)

    def test_security_cypher_create_blocked(self, validator):
        """Test that CREATE is blocked in Cypher."""
        query = "CREATE (n:MaliciousNode {data: 'evil'})"
        result = validator.validate(query, QueryType.CYPHER)

        assert not result.is_valid
        security_errors = [
            e for e in result.errors
            if e.type == ValidationErrorType.SECURITY_VIOLATION
        ]
        assert len(security_errors) > 0

    # =========================================================================
    # Scope Validation Tests (1 test required)
    # =========================================================================

    def test_scope_missing_project_id_sql(self, validator):
        """Test that queries without project_id scope are rejected."""
        query = """
        SELECT id, title
        FROM task.user_stories
        LIMIT 50
        """
        result = validator.validate(
            query,
            QueryType.SQL,
            project_id="proj-001",
            require_project_scope=True,
        )

        assert not result.is_valid
        assert not result.has_project_scope
        scope_errors = [
            e for e in result.errors
            if e.type == ValidationErrorType.SCOPE_MISSING
        ]
        assert len(scope_errors) > 0
        assert "project_id" in scope_errors[0].message

    def test_scope_valid_with_where_clause(self, validator):
        """Test that queries with WHERE project_id pass scope check."""
        query = """
        SELECT id, title
        FROM task.user_stories
        WHERE project_id = :project_id
        LIMIT 50
        """
        result = validator.validate(
            query,
            QueryType.SQL,
            project_id="proj-001",
            require_project_scope=True,
        )

        assert result.has_project_scope
        scope_errors = [
            e for e in result.errors
            if e.type == ValidationErrorType.SCOPE_MISSING
        ]
        assert len(scope_errors) == 0

    def test_scope_not_required_option(self, validator):
        """Test that scope check can be disabled."""
        query = """
        SELECT id, title
        FROM task.user_stories
        LIMIT 50
        """
        result = validator.validate(
            query,
            QueryType.SQL,
            project_id="proj-001",
            require_project_scope=False,
        )

        # Should not have scope errors when not required
        scope_errors = [
            e for e in result.errors
            if e.type == ValidationErrorType.SCOPE_MISSING
        ]
        assert len(scope_errors) == 0

    # =========================================================================
    # Schema Validation Tests (1 test required)
    # =========================================================================

    def test_schema_nonexistent_table(self, validator):
        """Test that non-existent tables are caught."""
        query = """
        SELECT id, name
        FROM nonexistent_table
        WHERE project_id = :project_id
        LIMIT 50
        """
        result = validator.validate(query, QueryType.SQL)

        schema_errors = [
            e for e in result.errors
            if e.type == ValidationErrorType.SCHEMA_MISMATCH
        ]
        assert len(schema_errors) > 0
        assert "not found in schema" in schema_errors[0].message

    def test_schema_valid_table_passes(self, validator):
        """Test that valid tables pass schema check."""
        query = """
        SELECT id, title
        FROM task.user_stories
        WHERE project_id = :project_id
        LIMIT 50
        """
        result = validator.validate(query, QueryType.SQL)

        schema_errors = [
            e for e in result.errors
            if e.type == ValidationErrorType.SCHEMA_MISMATCH
        ]
        assert len(schema_errors) == 0

    # =========================================================================
    # Performance/Resource Validation Tests
    # =========================================================================

    def test_performance_select_star_blocked(self, validator):
        """Test that SELECT * is blocked."""
        query = """
        SELECT * FROM task.user_stories
        WHERE project_id = :project_id
        LIMIT 50
        """
        result = validator.validate(query, QueryType.SQL)

        assert not result.layer4_performance_passed
        policy_errors = [
            e for e in result.errors
            if e.type == ValidationErrorType.POLICY_VIOLATION
        ]
        assert any("SELECT *" in e.message for e in policy_errors)

    def test_performance_missing_limit_blocked(self, validator):
        """Test that queries without LIMIT are blocked."""
        query = """
        SELECT id, title
        FROM task.user_stories
        WHERE project_id = :project_id
        """
        result = validator.validate(query, QueryType.SQL)

        assert not result.layer4_performance_passed
        policy_errors = [
            e for e in result.errors
            if e.type == ValidationErrorType.POLICY_VIOLATION
        ]
        assert any("LIMIT" in e.message for e in policy_errors)

    def test_performance_excessive_limit_blocked(self, validator):
        """Test that excessive LIMIT values are blocked."""
        query = f"""
        SELECT id, title
        FROM task.user_stories
        WHERE project_id = :project_id
        LIMIT 500
        """
        result = validator.validate(query, QueryType.SQL)

        assert not result.layer4_performance_passed
        policy_errors = [
            e for e in result.errors
            if e.type == ValidationErrorType.POLICY_VIOLATION
        ]
        assert any("exceeds maximum" in e.message for e in policy_errors)

    def test_performance_recursive_cte_blocked(self, validator):
        """Test that RECURSIVE CTEs are blocked."""
        query = """
        WITH RECURSIVE tree AS (
            SELECT id FROM task.user_stories WHERE parent_id IS NULL
        )
        SELECT id FROM tree
        WHERE project_id = :project_id
        LIMIT 50
        """
        result = validator.validate(query, QueryType.SQL)

        security_errors = [
            e for e in result.errors
            if "Recursive" in e.message
        ]
        assert len(security_errors) > 0

    # =========================================================================
    # Utility Function Tests
    # =========================================================================

    def test_ensure_result_limit_adds_limit(self, validator):
        """Test that ensure_result_limit adds LIMIT when missing."""
        query = "SELECT id FROM task.user_stories WHERE project_id = :project_id"
        result = validator.ensure_result_limit(query, QueryType.SQL)

        assert f"LIMIT {MAX_RESULT_ROWS}" in result

    def test_ensure_result_limit_preserves_existing(self, validator):
        """Test that ensure_result_limit preserves existing LIMIT."""
        query = "SELECT id FROM task.user_stories LIMIT 25"
        result = validator.ensure_result_limit(query, QueryType.SQL)

        assert "LIMIT 25" in result
        assert result.count("LIMIT") == 1

    def test_empty_query_fails(self, validator):
        """Test that empty queries fail validation."""
        result = validator.validate("", QueryType.SQL)

        assert not result.is_valid
        assert not result.layer1_syntax_passed
        assert any("empty" in e.message.lower() for e in result.errors)

    def test_too_long_query_fails(self, validator):
        """Test that excessively long queries fail."""
        long_query = "SELECT " + "a" * 6000 + " FROM task.user_stories LIMIT 50"
        result = validator.validate(long_query, QueryType.SQL)

        assert not result.is_valid
        policy_errors = [
            e for e in result.errors
            if e.type == ValidationErrorType.POLICY_VIOLATION
        ]
        assert any("too long" in e.message.lower() for e in policy_errors)


class TestValidationErrorMessages:
    """Test that error messages are clear and actionable."""

    def test_error_has_suggestion(self):
        """Test that ValidationError can have suggestions."""
        error = ValidationError(
            type=ValidationErrorType.SCOPE_MISSING,
            message="Query must filter by project_id",
            suggestion="Add WHERE project_id = :project_id",
        )
        assert error.suggestion is not None
        assert "WHERE" in error.suggestion

    def test_error_has_location(self):
        """Test that ValidationError can have location info."""
        error = ValidationError(
            type=ValidationErrorType.SYNTAX,
            message="Unexpected token",
            location="line 3, column 15",
        )
        assert error.location is not None
        assert "line 3" in error.location


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
