"""
Schema Graph Regression Tests

Essential tests to prevent regression in the Text2Query pipeline:
1. Intent Contract Test - intent-based retriever routing
2. Project Scope Enforcement Test - project_id in WHERE clause
3. Schema Label Alignment Test (Cypher) - valid Neo4j labels
4. JOIN Path Validity Test - proper JOIN conditions

These tests ensure the benchmark runner and actual workflow maintain
the same contract, preventing silent failures.
"""

import pytest
import re
from typing import List


class TestIntentContract:
    """
    Test 1: Intent Contract Test

    Verifies that:
    - TEXT_TO_SQL intent triggers SQL table retrieval
    - TEXT_TO_CYPHER intent skips SQL tables
    - GENERAL/CLARIFICATION/MISLEADING have no table retrieval
    """

    def test_sql_intent_retrieves_tables(self):
        """TEXT_TO_SQL intent should retrieve PostgreSQL tables."""
        from text2query.schema_graph import get_policy_engine

        policy = get_policy_engine()

        assert policy.should_retrieve_sql_tables("TEXT_TO_SQL") is True
        assert policy.should_retrieve_graph_schema("TEXT_TO_SQL") is False

    def test_cypher_intent_skips_sql_tables(self):
        """TEXT_TO_CYPHER intent should NOT retrieve PostgreSQL tables."""
        from text2query.schema_graph import get_policy_engine

        policy = get_policy_engine()

        assert policy.should_retrieve_sql_tables("TEXT_TO_CYPHER") is False
        assert policy.should_retrieve_graph_schema("TEXT_TO_CYPHER") is True

    def test_general_intent_no_table_retrieval(self):
        """GENERAL intent should not retrieve any tables."""
        from text2query.schema_graph import get_policy_engine

        policy = get_policy_engine()

        assert policy.should_retrieve_sql_tables("GENERAL") is False
        assert policy.should_retrieve_graph_schema("GENERAL") is False

    def test_clarification_intent_no_table_retrieval(self):
        """CLARIFICATION_NEEDED intent should not retrieve any tables."""
        from text2query.schema_graph import get_policy_engine

        policy = get_policy_engine()

        assert policy.should_retrieve_sql_tables("CLARIFICATION_NEEDED") is False
        assert policy.should_retrieve_graph_schema("CLARIFICATION_NEEDED") is False

    def test_misleading_intent_no_table_retrieval(self):
        """MISLEADING_QUERY intent should not retrieve any tables."""
        from text2query.schema_graph import get_policy_engine

        policy = get_policy_engine()

        assert policy.should_retrieve_sql_tables("MISLEADING_QUERY") is False
        assert policy.should_retrieve_graph_schema("MISLEADING_QUERY") is False


class TestProjectScopeEnforcement:
    """
    Test 2: Project Scope Enforcement Test

    Verifies that:
    - All SQL queries have project_id scope in WHERE clause
    - Tables without direct project_id get bridge tables added
    - Bridge JOIN is used when needed (e.g., task.tasks → task.user_stories)
    """

    def test_table_with_project_id_detected(self):
        """Tables with project_id column should be detected."""
        from text2query.schema_graph import get_schema_graph

        schema = get_schema_graph()

        # These tables have direct project_id
        assert schema.has_project_id("project.projects") is False  # projects IS the project
        assert schema.has_project_id("project.phases") is True
        assert schema.has_project_id("task.sprints") is True
        assert schema.has_project_id("task.user_stories") is True
        # task.tasks does NOT have project_id - it gets scope via user_stories
        assert schema.has_project_id("task.tasks") is False

    def test_project_scope_table_for_tasks(self):
        """task.tasks should have project scope available via user_stories."""
        from text2query.schema_graph import get_policy_engine

        policy = get_policy_engine()

        tables = ["task.tasks"]
        result_tables, scope_table = policy.ensure_project_scope(tables)

        # task.tasks gets project_id via user_stories bridge table
        assert scope_table == "task.user_stories"
        assert "task.tasks" in result_tables
        assert "task.user_stories" in result_tables

    def test_project_scope_table_for_users(self):
        """auth.users (non-project-scoped) should work without project scope."""
        from text2query.schema_graph import get_policy_engine

        policy = get_policy_engine()

        tables = ["auth.users"]
        result_tables, scope_table = policy.ensure_project_scope(tables)

        # Users don't have project_id, but ensure_project_scope should handle this
        assert scope_table is not None  # Will use heuristic or return the table itself

    def test_multi_table_project_scope(self):
        """Multi-table queries should have correct project scope."""
        from text2query.schema_graph import get_policy_engine

        policy = get_policy_engine()

        tables = ["task.tasks", "auth.users"]
        result_tables, scope_table = policy.ensure_project_scope(tables)

        # task.tasks doesn't have project_id directly, so user_stories is added as bridge
        assert scope_table == "task.user_stories"
        assert "task.user_stories" in result_tables


class TestCypherSchemaAlignment:
    """
    Test 3: Schema Label Alignment Test (Cypher)

    Verifies that:
    - Generated Cypher queries use valid Neo4j labels
    - Labels in queries match the defined schema
    - No hardcoded invalid labels
    """

    def test_cypher_label_selection(self):
        """Cypher schema should select valid labels based on keywords."""
        from text2query.schema_graph import get_cypher_schema

        cypher = get_cypher_schema()

        # Test label selection
        assert cypher.select_label(["chunk"]) == "Chunk"
        assert cypher.select_label(["document"]) == "Document"
        assert cypher.select_label(["rfp"]) == "Chunk"  # RFP content in chunks
        assert cypher.select_label(["unknown"]) == "Chunk"  # Default

    def test_cypher_relationship_selection(self):
        """Cypher schema should select valid relationships."""
        from text2query.schema_graph import get_cypher_schema

        cypher = get_cypher_schema()

        assert cypher.select_relationship(["dependency"]) == "DEPENDS_ON"
        assert cypher.select_relationship(["related"]) == "RELATED_TO"
        assert cypher.select_relationship(["reference"]) == "REFERENCES"
        assert cypher.select_relationship(["unknown"]) is None

    def test_cypher_label_validation(self):
        """Cypher queries should only use valid labels."""
        from text2query.schema_graph import get_cypher_schema

        cypher = get_cypher_schema()

        # Valid query with node label
        valid, invalid = cypher.validate_labels("MATCH (c:Chunk) RETURN c")
        assert valid is True
        assert invalid == []

        # Invalid query with unknown node label
        valid, invalid = cypher.validate_labels("MATCH (x:InvalidLabel) RETURN x")
        assert valid is False
        assert "InvalidLabel" in invalid

        # Relationship types should not be validated as labels
        valid, invalid = cypher.validate_labels("MATCH (a:Chunk)-[r:DEPENDS_ON]->(b:Chunk)")
        assert valid is True  # Only validates node labels

    def test_generated_cypher_has_valid_labels(self):
        """Generated mock Cypher should use valid node labels."""
        from benchmark_text2query_accuracy import _generate_mock_cypher
        from text2query.schema_graph import get_cypher_schema

        cypher_schema = get_cypher_schema()

        # Generate various Cypher queries
        queries = [
            _generate_mock_cypher(["chunk", "content"]),
            _generate_mock_cypher(["shortest", "path"]),
            _generate_mock_cypher(["dependency", "requirement"]),
            _generate_mock_cypher([]),  # Default case
        ]

        for query in queries:
            # Validate node labels only (relationship types validated separately)
            valid, invalid = cypher_schema.validate_labels(query)
            assert valid, f"Query has invalid node labels {invalid}: {query}"

            # Also validate relationship types
            valid_rel, invalid_rel = cypher_schema.validate_relationships(query)
            assert valid_rel, f"Query has invalid relationship types {invalid_rel}: {query}"


class TestJoinPathValidity:
    """
    Test 4: JOIN Path Validity Test

    Verifies that:
    - Multi-table queries have proper JOIN conditions
    - No cross joins (missing ON conditions)
    - JOIN conditions use correct foreign keys
    - Alias mapping is deterministic
    """

    def test_join_clause_generation(self):
        """Schema graph should generate valid JOIN clauses."""
        from text2query.schema_graph import get_schema_graph

        schema = get_schema_graph()

        tables = ["task.tasks", "auth.users"]
        join_clause, alias_map, project_alias = schema.build_join_clause(tables)

        # Should have aliases for both tables
        assert "task.tasks" in alias_map
        assert "auth.users" in alias_map
        assert alias_map["task.tasks"] == "t1"

        # Should have a JOIN clause
        assert "JOIN" in join_clause or join_clause == ""

    def test_join_determinism(self):
        """JOIN clause generation should be deterministic."""
        from text2query.schema_graph import get_schema_graph

        schema = get_schema_graph()

        tables = ["task.user_stories", "task.sprints"]

        # Generate JOIN clause twice
        result1 = schema.build_join_clause(tables)
        result2 = schema.build_join_clause(tables)

        # Should be identical
        assert result1[0] == result2[0]  # JOIN clause
        assert result1[1] == result2[1]  # alias_map
        assert result1[2] == result2[2]  # project_alias

    def test_no_cross_join(self):
        """Generated SQL should not have cross joins."""
        from benchmark_text2query_accuracy import _generate_mock_sql

        # Multi-table query
        sql = _generate_mock_sql(
            ["task.tasks", "auth.users"],
            ["COUNT", "GROUP BY"]
        )

        # If JOIN exists, it should have ON clause
        if "JOIN" in sql:
            join_count = sql.count("JOIN")
            on_count = sql.count(" ON ")
            assert join_count == on_count, f"Missing ON clause: {sql}"

    def test_generated_sql_has_project_scope(self):
        """Generated SQL should always have project_id in WHERE."""
        from benchmark_text2query_accuracy import _generate_mock_sql

        test_cases = [
            (["task.tasks"], ["COUNT"]),
            (["task.user_stories"], ["SUM"]),
            (["task.sprints", "task.user_stories"], ["AVG"]),
            (["project.issues"], ["COUNT", "GROUP BY"]),
        ]

        for tables, keywords in test_cases:
            sql = _generate_mock_sql(tables, keywords)

            # Should have project_id in WHERE clause
            assert "project_id" in sql.lower(), f"Missing project_id: {sql}"
            assert "where" in sql.lower(), f"Missing WHERE: {sql}"


class TestSemanticLayerMetricHints:
    """
    Additional test for metric-aware semantic layer mapping.
    """

    def test_metric_hint_detection(self):
        """Semantic layer should detect metric hints."""
        from text2query.semantic import get_semantic_layer

        semantic = get_semantic_layer()

        # Test Korean metric patterns
        hint = semantic.get_metric_hint("프로젝트별 완료율")
        assert hint is not None
        assert hint.metric_type == "rate"

        hint = semantic.get_metric_hint("스프린트 벨로시티")
        assert hint is not None
        assert "sprints" in hint.tables

    def test_metric_hint_tables(self):
        """Metric hints should include correct tables."""
        from text2query.semantic import get_semantic_layer

        semantic = get_semantic_layer()

        # Burndown should include sprints and user_stories
        hint = semantic.get_metric_hint("Sprint burndown data")
        if hint:
            assert "sprints" in hint.tables or "user_stories" in hint.tables


class TestIntegration:
    """
    Integration tests for the full pipeline.
    """

    def test_benchmark_sql_flow(self):
        """Full SQL benchmark flow should work end-to-end."""
        from text2query.intent import get_intent_classifier, reset_intent_classifier
        from text2query.semantic import get_semantic_layer, reset_semantic_layer
        from text2query.schema_graph import get_policy_engine, reset_schema_graph
        from benchmark_text2query_accuracy import _generate_mock_sql

        # Reset singletons
        reset_intent_classifier()
        reset_semantic_layer()
        reset_schema_graph()

        # Get components
        classifier = get_intent_classifier()
        semantic = get_semantic_layer()
        policy = get_policy_engine()

        # Test question
        question = "차단된 태스크 몇 개야?"

        # 1. Classify intent
        result = classifier.classify(question)
        assert result.intent.value == "TEXT_TO_SQL"

        # 2. Check policy allows SQL table retrieval
        assert policy.should_retrieve_sql_tables(result.intent.value)

        # 3. Get relevant tables
        models = semantic.find_relevant_models(question)
        tables = [m.full_table_name for m in models]
        assert "task.tasks" in tables

        # 4. Generate mock SQL
        sql = _generate_mock_sql(tables, ["COUNT", "BLOCKED"])

        # 5. Verify SQL has required elements
        assert "COUNT" in sql
        assert "project_id" in sql.lower()
        assert "WHERE" in sql

    def test_benchmark_cypher_flow(self):
        """Full Cypher benchmark flow should work end-to-end."""
        from text2query.intent import get_intent_classifier, reset_intent_classifier
        from text2query.schema_graph import get_policy_engine, get_cypher_schema, reset_schema_graph
        from benchmark_text2query_accuracy import _generate_mock_cypher

        # Reset singletons
        reset_intent_classifier()
        reset_schema_graph()

        # Get components
        classifier = get_intent_classifier()
        policy = get_policy_engine()
        cypher_schema = get_cypher_schema()

        # Test question
        question = "문서와 관련된 요구사항을 찾아줘"

        # 1. Classify intent
        result = classifier.classify(question)
        assert result.intent.value == "TEXT_TO_CYPHER"

        # 2. Check policy skips SQL tables
        assert not policy.should_retrieve_sql_tables(result.intent.value)
        assert policy.should_retrieve_graph_schema(result.intent.value)

        # 3. Generate mock Cypher
        cypher = _generate_mock_cypher(["MATCH", "Document", "RELATED_TO"])

        # 4. Verify Cypher has valid node labels
        valid, invalid = cypher_schema.validate_labels(cypher)
        assert valid, f"Invalid node labels: {invalid}"

        # 5. Verify Cypher has valid relationship types
        valid_rel, invalid_rel = cypher_schema.validate_relationships(cypher)
        assert valid_rel, f"Invalid relationship types: {invalid_rel}"


class TestSecurityBypassPrevention:
    """
    Test 5: Security Bypass Prevention Tests

    Verifies that:
    - OR 1=1 and similar bypass patterns are rejected
    - Subqueries without project_id scope are rejected
    - FORBIDDEN_TABLES cannot be queried
    - Sensitive columns (password_hash) are blocked
    """

    def test_or_bypass_detected(self):
        """OR 1=1 bypass pattern should be rejected."""
        from text2query.query_validator import detect_bypass_patterns

        bypass_queries = [
            "SELECT * FROM task.tasks WHERE project_id = '1' OR 1=1",
            "SELECT * FROM task.tasks WHERE project_id = '1' OR TRUE",
            "SELECT * FROM task.tasks WHERE project_id = '1' OR 'a'='a'",
            "SELECT * FROM task.tasks WHERE (project_id = '1' OR 1=1)",
            "SELECT * FROM task.tasks WHERE project_id = '1' or true",  # lowercase
        ]

        for query in bypass_queries:
            errors = detect_bypass_patterns(query)
            assert len(errors) > 0, f"Should detect bypass in: {query}"
            assert any("bypass" in e.message.lower() for e in errors), \
                f"Error message should mention bypass: {query}"

    def test_legitimate_or_not_blocked(self):
        """Legitimate OR conditions should not be blocked."""
        from text2query.query_validator import detect_bypass_patterns

        legitimate_queries = [
            "SELECT * FROM task.tasks WHERE project_id = '1' OR project_id = '2'",
            "SELECT * FROM task.tasks WHERE status = 'DONE' OR status = 'BLOCKED'",
            "SELECT * FROM task.tasks WHERE id = 1 OR id = 2",
        ]

        for query in legitimate_queries:
            errors = detect_bypass_patterns(query)
            assert len(errors) == 0, f"Should NOT flag legitimate OR: {query}"

    def test_forbidden_tables_blocked(self):
        """FORBIDDEN_TABLES like auth.password_history should be rejected."""
        from text2query.query_validator import validate_forbidden_tables

        forbidden_queries = [
            "SELECT * FROM auth.password_history LIMIT 10",
            "SELECT * FROM auth.tokens WHERE user_id = '1' LIMIT 10",
            "SELECT * FROM auth.refresh_tokens LIMIT 10",
        ]

        for query in forbidden_queries:
            errors = validate_forbidden_tables(query)
            assert len(errors) > 0, f"Should block forbidden table: {query}"
            assert any("forbidden" in e.message.lower() for e in errors), \
                f"Error should mention 'forbidden': {query}"

    def test_allowed_tables_not_blocked(self):
        """Normal tables like auth.users should be allowed."""
        from text2query.query_validator import validate_forbidden_tables

        allowed_queries = [
            "SELECT id, username FROM auth.users WHERE project_id = '1' LIMIT 10",
            "SELECT * FROM task.tasks WHERE project_id = '1' LIMIT 10",
        ]

        for query in allowed_queries:
            errors = validate_forbidden_tables(query)
            assert len(errors) == 0, f"Should allow table: {query}"

    def test_password_hash_column_blocked(self):
        """Selecting password_hash column should be rejected."""
        from text2query.query_validator import validate_column_denylist

        denied_queries = [
            ("SELECT id, password_hash FROM auth.users LIMIT 10", ["auth.users"]),
            ("SELECT u.password_hash FROM auth.users u LIMIT 10", ["auth.users"]),
            ("SELECT password FROM auth.users LIMIT 10", ["auth.users"]),
        ]

        for query, tables in denied_queries:
            errors = validate_column_denylist(query, tables)
            assert len(errors) > 0, f"Should block sensitive column: {query}"

    def test_safe_columns_allowed(self):
        """Selecting safe columns should be allowed."""
        from text2query.query_validator import validate_column_denylist

        safe_queries = [
            ("SELECT id, username, email FROM auth.users LIMIT 10", ["auth.users"]),
            ("SELECT id, status FROM task.tasks LIMIT 10", ["task.tasks"]),
        ]

        for query, tables in safe_queries:
            errors = validate_column_denylist(query, tables)
            # Note: email is in SENSITIVE_COLUMNS but not COLUMN_DENYLIST
            # so it should be allowed (warning, not block)
            password_errors = [e for e in errors if "password" in e.message.lower()]
            assert len(password_errors) == 0, f"Should allow safe columns: {query}"

    def test_subquery_without_scope_detected(self):
        """Subquery without project_id at top level should be flagged."""
        from text2query.query_validator import check_project_scope_integrity, extract_table_aliases

        # This subquery bypasses scope - the inner query has no project_id
        query = """
        SELECT * FROM (
            SELECT id, status FROM task.tasks
        ) AS sub
        WHERE sub.id > 10
        LIMIT 10
        """

        alias_map = extract_table_aliases(query)
        scoped_tables = ["task.tasks"]

        valid, error = check_project_scope_integrity(query, alias_map, scoped_tables)
        # Should fail because no project_id filter at top level
        assert valid is False or error is not None, \
            "Subquery without top-level project_id should be flagged"

    def test_valid_scope_with_alias(self):
        """Query with valid alias.project_id should pass."""
        from text2query.query_validator import check_project_scope_integrity, extract_table_aliases

        query = """
        SELECT t.id, t.status
        FROM task.tasks t
        WHERE t.project_id = '12345'
        LIMIT 10
        """

        alias_map = extract_table_aliases(query)
        scoped_tables = ["task.tasks"]

        valid, error = check_project_scope_integrity(query, alias_map, scoped_tables)
        assert valid is True, f"Valid scope should pass: {error}"


class TestValidatorIntegration:
    """
    Test 6: Full Validator Integration Tests

    Verifies the QueryValidator correctly combines all security checks.
    """

    def test_full_validation_blocks_bypass(self):
        """Full validation should reject OR bypass."""
        from text2query.query_validator import get_query_validator, QueryValidator
        from text2query.models import QueryType

        validator = QueryValidator()

        query = "SELECT id FROM task.tasks WHERE project_id = '1' OR 1=1 LIMIT 10"
        result = validator.validate(query, QueryType.SQL, require_project_scope=True)

        assert result.is_valid is False, "Should reject OR bypass"
        assert any("bypass" in str(e.message).lower() for e in result.errors), \
            "Should have bypass error message"

    def test_full_validation_blocks_forbidden_table(self):
        """Full validation should reject forbidden table access."""
        from text2query.query_validator import QueryValidator
        from text2query.models import QueryType

        validator = QueryValidator()

        query = "SELECT * FROM auth.tokens WHERE user_id = '1' LIMIT 10"
        result = validator.validate(query, QueryType.SQL, require_project_scope=False)

        assert result.is_valid is False, "Should reject forbidden table"
        assert any("forbidden" in str(e.message).lower() for e in result.errors), \
            "Should have forbidden error message"

    def test_full_validation_accepts_valid_query(self):
        """Full validation should accept valid query with proper scope."""
        from text2query.query_validator import QueryValidator
        from text2query.models import QueryType

        validator = QueryValidator()

        query = """
        SELECT t.id, t.status
        FROM task.tasks t
        JOIN task.user_stories us ON t.user_story_id = us.id
        WHERE us.project_id = '12345'
        LIMIT 50
        """
        result = validator.validate(query, QueryType.SQL, require_project_scope=True)

        # May have schema errors if DB not available, but security should pass
        security_errors = [e for e in result.errors
                         if "bypass" in str(e.message).lower()
                         or "forbidden" in str(e.message).lower()]
        assert len(security_errors) == 0, f"Should accept valid query: {security_errors}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
