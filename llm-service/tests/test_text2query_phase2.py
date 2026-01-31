"""
Phase 2 Tests for Text2Query Package.

Tests cover:
1. FewshotManager functionality
2. QueryGenerator with mock LLM
3. QueryCorrector with mock LLM
4. Self-correction loop integration
5. SafeQueryExecutor configuration
"""

import pytest
from unittest.mock import MagicMock, patch

from text2query.models import (
    QueryType,
    ValidationResult,
    ValidationError,
    ValidationErrorType,
    GenerationResult,
    ExecutionResult,
    FewshotExample,
)
from text2query.fewshot_manager import FewshotManager, get_fewshot_manager
from text2query.query_generator import QueryGenerator
from text2query.query_corrector import QueryCorrector
from text2query.query_validator import QueryValidator
from text2query.query_executor import SafeQueryExecutor, SafeExecutionConfig


class TestFewshotManager:
    """Test FewshotManager functionality."""

    def test_default_examples_loaded(self):
        """Test that default examples are loaded on initialization."""
        manager = FewshotManager()
        sql_examples = manager.get_all_examples(QueryType.SQL)
        cypher_examples = manager.get_all_examples(QueryType.CYPHER)

        assert len(sql_examples) >= 3
        assert len(cypher_examples) >= 2

    def test_get_similar_examples_sql(self):
        """Test similar example retrieval for SQL."""
        manager = FewshotManager()
        examples = manager.get_similar_examples(
            "How many stories are in progress?",
            QueryType.SQL,
            k=3,
        )

        assert len(examples) == 3
        assert all(ex.query_type == QueryType.SQL for ex in examples)
        # First example should have highest similarity score
        assert examples[0].similarity_score >= examples[1].similarity_score

    def test_get_similar_examples_cypher(self):
        """Test similar example retrieval for Cypher."""
        manager = FewshotManager()
        examples = manager.get_similar_examples(
            "Find documents in the project",
            QueryType.CYPHER,
            k=2,
        )

        assert len(examples) == 2
        assert all(ex.query_type == QueryType.CYPHER for ex in examples)

    def test_add_example(self):
        """Test adding a new example."""
        manager = FewshotManager()
        initial_count = len(manager.get_all_examples(QueryType.SQL))

        new_example = manager.add_example(
            question="What is the sprint velocity?",
            query="SELECT AVG(story_points) FROM task.user_stories WHERE status = 'DONE'",
            query_type=QueryType.SQL,
            target_tables=["task.user_stories"],
            keywords=["velocity", "sprint", "average"],
        )

        assert new_example.id.startswith("sql-")
        assert len(manager.get_all_examples(QueryType.SQL)) == initial_count + 1

    def test_similarity_scoring(self):
        """Test that keyword matches increase similarity score."""
        manager = FewshotManager()

        # Question with matching keywords should score higher
        examples = manager.get_similar_examples(
            "list all sprints with their status",
            QueryType.SQL,
            k=5,
        )

        # Find the sprint example
        sprint_example = next(
            (ex for ex in examples if "sprints" in ex.question.lower()), None
        )
        assert sprint_example is not None
        assert sprint_example.similarity_score > 0


class TestQueryGenerator:
    """Test QueryGenerator with mock LLM."""

    @pytest.fixture
    def mock_llm_service(self):
        """Create mock LLM service."""
        mock = MagicMock()
        mock.generate.return_value = """SELECT us.id, us.title, us.status
FROM task.user_stories us
WHERE us.project_id = :project_id
ORDER BY us.priority
LIMIT 50"""
        return mock

    @pytest.fixture
    def generator(self, mock_llm_service):
        """Create QueryGenerator with mock LLM."""
        generator = QueryGenerator(llm_service=mock_llm_service)
        # Mock schema manager
        generator.schema_manager = MagicMock()
        generator.schema_manager.get_schema_context.return_value = MagicMock(
            to_sql_context=MagicMock(return_value="## PostgreSQL Schema\n"),
            to_cypher_context=MagicMock(return_value="## Neo4j Schema\n"),
        )
        return generator

    # =========================================================================
    # Week 2 Success Criteria: QueryGenerator produces valid SQL for 3 samples
    # =========================================================================

    def test_generate_sql_sample1(self, generator, mock_llm_service):
        """Test SQL generation for sample question 1: User stories."""
        mock_llm_service.generate.return_value = """SELECT us.id, us.title, us.status
FROM task.user_stories us
WHERE us.project_id = :project_id
LIMIT 50"""

        result = generator.generate(
            question="List all user stories",
            project_id="proj-001",
            query_type=QueryType.SQL,
        )

        assert isinstance(result, GenerationResult)
        assert result.query_type == QueryType.SQL
        assert "SELECT" in result.query
        assert "user_stories" in result.query
        assert result.generation_time_ms > 0

    def test_generate_sql_sample2(self, generator, mock_llm_service):
        """Test SQL generation for sample question 2: Sprint count."""
        mock_llm_service.generate.return_value = """SELECT COUNT(*) as sprint_count
FROM task.sprints s
WHERE s.project_id = :project_id AND s.status = 'ACTIVE'
LIMIT 1"""

        result = generator.generate(
            question="How many active sprints?",
            project_id="proj-001",
            query_type=QueryType.SQL,
        )

        assert "SELECT" in result.query
        assert "COUNT" in result.query
        assert "sprints" in result.query

    def test_generate_sql_sample3(self, generator, mock_llm_service):
        """Test SQL generation for sample question 3: Tasks with JOINs."""
        mock_llm_service.generate.return_value = """SELECT t.id, t.title, us.title as story_title
FROM task.tasks t
JOIN task.user_stories us ON t.user_story_id = us.id
WHERE us.project_id = :project_id
LIMIT 50"""

        result = generator.generate(
            question="Show tasks with their parent stories",
            project_id="proj-001",
            query_type=QueryType.SQL,
        )

        assert "SELECT" in result.query
        assert "JOIN" in result.query
        assert "tasks" in result.query

    def test_generate_cypher(self, generator, mock_llm_service):
        """Test Cypher query generation."""
        mock_llm_service.generate.return_value = """MATCH (d:Document)
WHERE d.project_id = $project_id
RETURN d.id, d.title
LIMIT 50"""

        result = generator.generate(
            question="Find all documents",
            project_id="proj-001",
            query_type=QueryType.CYPHER,
        )

        assert result.query_type == QueryType.CYPHER
        assert "MATCH" in result.query
        assert "Document" in result.query

    def test_fewshot_examples_included(self, generator, mock_llm_service):
        """Test that few-shot examples are used in generation."""
        result = generator.generate(
            question="List sprints",
            project_id="proj-001",
            query_type=QueryType.SQL,
            use_fewshot=True,
            num_fewshot=3,
        )

        assert len(result.fewshot_ids_used) == 3

    def test_fewshot_disabled(self, generator, mock_llm_service):
        """Test generation without few-shot examples."""
        result = generator.generate(
            question="List sprints",
            project_id="proj-001",
            query_type=QueryType.SQL,
            use_fewshot=False,
        )

        assert len(result.fewshot_ids_used) == 0

    def test_query_cleaning_removes_markdown(self, generator):
        """Test that markdown code blocks are removed."""
        cleaned = generator._clean_query(
            "```sql\nSELECT * FROM test\n```",
            QueryType.SQL,
        )
        assert "```" not in cleaned
        assert "SELECT" in cleaned

    def test_query_cleaning_extracts_select(self, generator):
        """Test that SELECT statement is extracted from verbose response."""
        cleaned = generator._clean_query(
            "Here is the query:\nSELECT id FROM test; Let me explain...",
            QueryType.SQL,
        )
        assert cleaned.startswith("SELECT")
        assert "Let me" not in cleaned


class TestQueryCorrector:
    """Test QueryCorrector with mock LLM."""

    @pytest.fixture
    def mock_llm_service(self):
        """Create mock LLM service."""
        mock = MagicMock()
        mock.generate.return_value = """SELECT us.id, us.title
FROM task.user_stories us
WHERE us.project_id = :project_id
LIMIT 50"""
        return mock

    @pytest.fixture
    def corrector(self, mock_llm_service):
        """Create QueryCorrector with mock LLM."""
        return QueryCorrector(llm_service=mock_llm_service)

    # =========================================================================
    # Week 2 Success Criteria: QueryCorrector fixes scope_missing errors
    # =========================================================================

    def test_correct_scope_missing_error(self, corrector, mock_llm_service):
        """Test that corrector fixes scope_missing errors."""
        original_query = "SELECT id, title FROM task.user_stories LIMIT 50"

        validation_result = ValidationResult(
            is_valid=False,
            has_project_scope=False,
            errors=[
                ValidationError(
                    type=ValidationErrorType.SCOPE_MISSING,
                    message="Query must filter by project_id",
                    suggestion="Add WHERE project_id = :project_id",
                )
            ],
        )

        corrected = corrector.correct(
            original_query=original_query,
            query_type=QueryType.SQL,
            validation_result=validation_result,
            question="List user stories",
            project_id="proj-001",
        )

        assert corrected is not None
        assert "project_id" in corrected

    def test_correct_max_retries_exceeded(self, corrector):
        """Test that correction fails after max retries."""
        validation_result = ValidationResult(
            is_valid=False,
            errors=[
                ValidationError(
                    type=ValidationErrorType.SYNTAX,
                    message="Syntax error",
                )
            ],
        )

        result = corrector.correct(
            original_query="INVALID QUERY",
            query_type=QueryType.SQL,
            validation_result=validation_result,
            question="Test",
            project_id="proj-001",
            attempt=3,  # Exceeds MAX_RETRIES
        )

        assert result is None

    def test_error_formatting(self, corrector):
        """Test that errors are formatted correctly for the prompt."""
        validation_result = ValidationResult(
            is_valid=False,
            errors=[
                ValidationError(
                    type=ValidationErrorType.SCOPE_MISSING,
                    message="Missing project_id",
                    suggestion="Add WHERE clause",
                ),
                ValidationError(
                    type=ValidationErrorType.POLICY_VIOLATION,
                    message="Missing LIMIT",
                    suggestion="Add LIMIT 50",
                ),
            ],
        )

        formatted = corrector._format_errors(validation_result)

        assert "[scope_missing]" in formatted
        assert "[policy_violation]" in formatted
        assert "Suggestion:" in formatted


class TestSelfCorrectionLoop:
    """Test the full self-correction loop integration."""

    @pytest.fixture
    def mock_llm_service(self):
        """Create mock LLM service that returns corrected query."""
        mock = MagicMock()

        # First call: returns invalid query (no project_id)
        # Second call: returns corrected query
        def generate_side_effect(*args, **kwargs):
            prompt = args[0] if args else kwargs.get("prompt", "")
            if "Validation Errors" in prompt or "Fix the query" in prompt:
                # This is a correction prompt
                return """SELECT id, title FROM task.user_stories
WHERE project_id = :project_id
LIMIT 50"""
            else:
                # Initial generation
                return "SELECT id, title FROM task.user_stories LIMIT 50"

        mock.generate.side_effect = generate_side_effect
        return mock

    @pytest.fixture
    def validator(self):
        """Create QueryValidator with mocked schema manager."""
        validator = QueryValidator()
        validator.schema_manager = MagicMock()
        validator.schema_manager.get_pg_schema.return_value = {
            "task.user_stories": MagicMock(name="user_stories"),
        }
        validator._validate_sql_syntax = MagicMock(return_value=None)
        return validator

    def test_self_correction_loop(self, mock_llm_service, validator):
        """Test full self-correction loop: generate -> validate -> correct -> validate."""
        generator = QueryGenerator(llm_service=mock_llm_service)
        generator.schema_manager = MagicMock()
        generator.schema_manager.get_schema_context.return_value = MagicMock(
            to_sql_context=MagicMock(return_value=""),
        )

        corrector = QueryCorrector(llm_service=mock_llm_service)

        # Step 1: Generate initial query
        gen_result = generator.generate(
            question="List user stories",
            project_id="proj-001",
            query_type=QueryType.SQL,
            use_fewshot=False,
        )

        # Step 2: Validate (should fail due to missing project_id)
        val_result = validator.validate(
            gen_result.query,
            QueryType.SQL,
            project_id="proj-001",
            require_project_scope=True,
        )

        # Initial query should fail validation (missing project_id)
        assert not val_result.has_project_scope

        # Step 3: Correct the query
        corrected_query = corrector.correct(
            original_query=gen_result.query,
            query_type=QueryType.SQL,
            validation_result=val_result,
            question="List user stories",
            project_id="proj-001",
        )

        assert corrected_query is not None
        assert "project_id" in corrected_query

        # Step 4: Re-validate (should pass)
        final_result = validator.validate(
            corrected_query,
            QueryType.SQL,
            project_id="proj-001",
            require_project_scope=True,
        )

        assert final_result.has_project_scope


class TestSafeExecutionConfig:
    """Test SafeExecutionConfig and SafeQueryExecutor configuration."""

    def test_default_config(self):
        """Test default configuration values."""
        config = SafeExecutionConfig()

        assert config.timeout_ms == 5000
        assert config.max_rows == 100
        assert config.max_memory_mb == 256
        assert config.enable_cost_check is True
        assert config.cost_threshold == 10000

    def test_custom_config(self):
        """Test custom configuration values."""
        config = SafeExecutionConfig(
            timeout_ms=10000,
            max_rows=50,
            max_memory_mb=128,
            enable_cost_check=False,
        )

        assert config.timeout_ms == 10000
        assert config.max_rows == 50
        assert config.max_memory_mb == 128
        assert config.enable_cost_check is False

    def test_executor_with_config(self):
        """Test executor uses provided config."""
        config = SafeExecutionConfig(max_rows=25)
        executor = SafeQueryExecutor(config=config)

        assert executor.config.max_rows == 25

    def test_executor_default_config(self):
        """Test executor uses default config when none provided."""
        executor = SafeQueryExecutor()

        assert executor.config.max_rows == 100
        assert executor.config.timeout_ms == 5000


class TestPromptTemplates:
    """Test that prompt templates are properly formatted."""

    def test_sql_generation_prompt_placeholders(self):
        """Test SQL generation prompt has required placeholders."""
        from text2query.prompts.sql_generation import SQL_GENERATION_PROMPT

        assert "{schema}" in SQL_GENERATION_PROMPT
        assert "{fewshot_examples}" in SQL_GENERATION_PROMPT
        assert "{question}" in SQL_GENERATION_PROMPT
        assert "{project_id}" in SQL_GENERATION_PROMPT
        assert "{max_rows}" in SQL_GENERATION_PROMPT

    def test_cypher_generation_prompt_placeholders(self):
        """Test Cypher generation prompt has required placeholders."""
        from text2query.prompts.cypher_generation import CYPHER_GENERATION_PROMPT

        assert "{schema}" in CYPHER_GENERATION_PROMPT
        assert "{fewshot_examples}" in CYPHER_GENERATION_PROMPT
        assert "{question}" in CYPHER_GENERATION_PROMPT
        assert "{project_id}" in CYPHER_GENERATION_PROMPT
        assert "{max_rows}" in CYPHER_GENERATION_PROMPT

    def test_correction_prompt_placeholders(self):
        """Test correction prompt has required placeholders."""
        from text2query.prompts.correction import CORRECTION_PROMPT

        assert "{query_type}" in CORRECTION_PROMPT
        assert "{original_query}" in CORRECTION_PROMPT
        assert "{errors}" in CORRECTION_PROMPT
        assert "{question}" in CORRECTION_PROMPT
        assert "{project_id}" in CORRECTION_PROMPT


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
