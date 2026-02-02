"""
Phase 3 Tests for Text2Query LangGraph Workflow.

Tests cover:
1. Query type classification
2. Workflow node functions
3. Routing logic
4. End-to-end workflow with mocked dependencies
5. Response formatting
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
)


class TestText2QueryWorkflow:
    """Test Text2QueryWorkflow LangGraph implementation."""

    @pytest.fixture
    def mock_generator(self):
        """Create mock QueryGenerator."""
        mock = MagicMock()
        mock.generate.return_value = GenerationResult(
            query="SELECT id, title FROM task.user_stories WHERE project_id = :project_id LIMIT 50",
            query_type=QueryType.SQL,
            is_valid=False,
            fewshot_ids_used=["sql-001", "sql-002"],
            generation_time_ms=100.0,
        )
        return mock

    @pytest.fixture
    def mock_validator(self):
        """Create mock QueryValidator."""
        mock = MagicMock()
        mock.validate.return_value = ValidationResult(
            is_valid=True,
            has_project_scope=True,
            errors=[],
        )
        mock.ensure_result_limit.return_value = (
            "SELECT id, title FROM task.user_stories WHERE project_id = :project_id LIMIT 50"
        )
        return mock

    @pytest.fixture
    def mock_corrector(self):
        """Create mock QueryCorrector."""
        mock = MagicMock()
        mock.correct.return_value = (
            "SELECT id, title FROM task.user_stories WHERE project_id = :project_id LIMIT 50"
        )
        return mock

    @pytest.fixture
    def mock_executor(self):
        """Create mock SafeQueryExecutor."""
        mock = MagicMock()
        mock.execute.return_value = ExecutionResult(
            success=True,
            data=[
                {"id": "1", "title": "Story 1"},
                {"id": "2", "title": "Story 2"},
            ],
            columns=["id", "title"],
            row_count=2,
            execution_time_ms=50.0,
        )
        return mock

    @pytest.fixture
    def mock_fewshot_manager(self):
        """Create mock FewshotManager."""
        mock = MagicMock()
        mock.add_example.return_value = MagicMock(id="sql-new")
        return mock

    @pytest.fixture
    def workflow_instance(
        self,
        mock_generator,
        mock_validator,
        mock_corrector,
        mock_executor,
        mock_fewshot_manager,
    ):
        """Create Text2QueryWorkflow with mocked dependencies."""
        from workflows.text2query_workflow import Text2QueryWorkflow

        workflow = Text2QueryWorkflow()
        workflow.generator = mock_generator
        workflow.validator = mock_validator
        workflow.corrector = mock_corrector
        workflow.executor = mock_executor
        workflow.fewshot_manager = mock_fewshot_manager
        return workflow

    # =========================================================================
    # Query Type Classification Tests
    # =========================================================================

    def test_classify_query_type_sql_korean(self, workflow_instance):
        """Test SQL classification for Korean question."""
        state = {
            "question": "진행중인 스프린트 목록을 보여줘",
            "project_id": "proj-001",
            "user_access_level": 6,
        }

        result = workflow_instance._classify_query_type(state)

        assert result["query_type"] == "sql"

    def test_classify_query_type_sql_english(self, workflow_instance):
        """Test SQL classification for English question."""
        state = {
            "question": "Show me all tasks in the current sprint",
            "project_id": "proj-001",
            "user_access_level": 6,
        }

        result = workflow_instance._classify_query_type(state)

        assert result["query_type"] == "sql"

    def test_classify_query_type_cypher(self, workflow_instance):
        """Test Cypher classification for document-related question."""
        state = {
            "question": "문서 관계를 보여줘",
            "project_id": "proj-001",
            "user_access_level": 6,
        }

        result = workflow_instance._classify_query_type(state)

        assert result["query_type"] == "cypher"

    def test_classify_query_type_default_sql(self, workflow_instance):
        """Test default to SQL when no keywords match."""
        state = {
            "question": "random question without keywords",
            "project_id": "proj-001",
            "user_access_level": 6,
        }

        result = workflow_instance._classify_query_type(state)

        # Should default to SQL (most common)
        assert result["query_type"] == "sql"

    # =========================================================================
    # Routing Logic Tests
    # =========================================================================

    def test_route_after_validation_valid(self, workflow_instance):
        """Test routing to execute when validation passes."""
        state = {"is_valid": True, "correction_attempt": 0}

        result = workflow_instance._route_after_validation(state)

        assert result == "execute"

    def test_route_after_validation_needs_correction(self, workflow_instance):
        """Test routing to correct when validation fails."""
        state = {"is_valid": False, "correction_attempt": 0}

        result = workflow_instance._route_after_validation(state)

        assert result == "correct"

    def test_route_after_validation_max_retries(self, workflow_instance):
        """Test routing to fail after max correction retries."""
        state = {"is_valid": False, "correction_attempt": 2}

        result = workflow_instance._route_after_validation(state)

        assert result == "fail"

    def test_route_after_execution_success(self, workflow_instance):
        """Test routing to success after successful execution."""
        state = {"execution_success": True}

        result = workflow_instance._route_after_execution(state)

        assert result == "success"

    def test_route_after_execution_failure(self, workflow_instance):
        """Test routing to failure after failed execution."""
        state = {"execution_success": False}

        result = workflow_instance._route_after_execution(state)

        assert result == "failure"

    # =========================================================================
    # Node Function Tests
    # =========================================================================

    def test_generate_query_node(self, workflow_instance, mock_generator):
        """Test generate_query node updates state correctly."""
        state = {
            "question": "List user stories",
            "project_id": "proj-001",
            "query_type": "sql",
            "generation_attempt": 0,
            "metrics": {},
        }

        result = workflow_instance._generate_query(state)

        assert result["generated_query"] != ""
        assert result["generation_attempt"] == 1
        assert len(result["fewshot_ids_used"]) > 0
        assert "generation_time_ms" in result["metrics"]
        mock_generator.generate.assert_called_once()

    def test_validate_query_node(self, workflow_instance, mock_validator):
        """Test validate_query node updates state correctly."""
        state = {
            "question": "List user stories",
            "project_id": "proj-001",
            "query_type": "sql",
            "generated_query": "SELECT id FROM task.user_stories LIMIT 50",
            "corrected_query": "",
            "metrics": {},
        }

        result = workflow_instance._validate_query(state)

        assert result["is_valid"] is True
        assert result["validation_result"]["has_project_scope"] is True
        assert "validation_time_ms" in result["metrics"]
        mock_validator.validate.assert_called_once()

    def test_correct_query_node(self, workflow_instance, mock_corrector):
        """Test correct_query node updates state correctly."""
        state = {
            "question": "List user stories",
            "project_id": "proj-001",
            "query_type": "sql",
            "generated_query": "SELECT id FROM task.user_stories LIMIT 50",
            "corrected_query": "",
            "correction_attempt": 0,
            "validation_result": {
                "is_valid": False,
                "errors": [{"type": "scope_missing", "message": "Missing project_id"}],
                "has_project_scope": False,
            },
            "metrics": {},
        }

        result = workflow_instance._correct_query(state)

        assert result["correction_attempt"] == 1
        assert result["corrected_query"] != ""
        assert "correction_time_ms" in result["metrics"]
        mock_corrector.correct.assert_called_once()

    def test_execute_query_node(self, workflow_instance, mock_executor):
        """Test execute_query node updates state correctly."""
        state = {
            "question": "List user stories",
            "project_id": "proj-001",
            "query_type": "sql",
            "generated_query": "SELECT id FROM task.user_stories WHERE project_id = :project_id LIMIT 50",
            "corrected_query": "",
            "metrics": {},
        }

        result = workflow_instance._execute_query(state)

        assert result["execution_success"] is True
        assert result["execution_result"]["row_count"] == 2
        assert "execution_time_ms" in result["metrics"]
        mock_executor.execute.assert_called_once()

    # =========================================================================
    # Response Formatting Tests
    # =========================================================================

    def test_format_response_with_data(self, workflow_instance):
        """Test response formatting with data."""
        state = {
            "execution_result": {
                "data": [
                    {"id": "1", "title": "Story 1"},
                    {"id": "2", "title": "Story 2"},
                ],
                "columns": ["id", "title"],
                "row_count": 2,
            }
        }

        result = workflow_instance._format_response(state)

        assert "**Query Results**" in result["formatted_response"]
        assert "2 rows" in result["formatted_response"]
        assert result["confidence"] == 0.9

    def test_format_response_empty(self, workflow_instance):
        """Test response formatting with no data."""
        state = {
            "execution_result": {
                "data": [],
                "columns": [],
                "row_count": 0,
            }
        }

        result = workflow_instance._format_response(state)

        assert "No results" in result["formatted_response"]
        assert result["confidence"] == 0.7

    def test_format_response_null_result(self, workflow_instance):
        """Test response formatting with null result."""
        state = {"execution_result": None}

        result = workflow_instance._format_response(state)

        assert result["confidence"] == 0.7

    def test_handle_failure_node(self, workflow_instance):
        """Test handle_failure node creates error response."""
        state = {"execution_error": "Connection timeout"}

        result = workflow_instance._handle_failure(state)

        assert "Sorry" in result["formatted_response"]
        assert "Connection timeout" in result["formatted_response"]
        assert result["confidence"] == 0.3

    # =========================================================================
    # Markdown Formatting Tests
    # =========================================================================

    def test_format_as_markdown_table(self, workflow_instance):
        """Test markdown table generation."""
        result = {
            "data": [
                {"id": "1", "title": "Story 1", "status": "DONE"},
                {"id": "2", "title": "Story 2", "status": "IN_PROGRESS"},
            ],
            "columns": ["id", "title", "status"],
            "row_count": 2,
        }

        markdown = workflow_instance._format_as_markdown(result)

        assert "| id | title | status |" in markdown
        assert "| --- | --- | --- |" in markdown
        assert "| 1 | Story 1 | DONE |" in markdown

    def test_format_as_markdown_truncates_long_values(self, workflow_instance):
        """Test that long values are truncated."""
        result = {
            "data": [
                {"id": "1", "title": "A" * 50},
            ],
            "columns": ["id", "title"],
            "row_count": 1,
        }

        markdown = workflow_instance._format_as_markdown(result)

        assert "..." in markdown

    def test_format_as_markdown_limits_rows(self, workflow_instance):
        """Test that rows are limited to 20."""
        result = {
            "data": [{"id": str(i), "title": f"Story {i}"} for i in range(30)],
            "columns": ["id", "title"],
            "row_count": 30,
        }

        markdown = workflow_instance._format_as_markdown(result)

        assert "and 10 more rows" in markdown

    # =========================================================================
    # Learn from Success Tests
    # =========================================================================

    def test_learn_from_success_stores_example(self, workflow_instance, mock_fewshot_manager):
        """Test that successful queries are stored."""
        state = {
            "question": "List user stories",
            "project_id": "proj-001",
            "query_type": "sql",
            "generated_query": "SELECT id FROM task.user_stories WHERE project_id = :project_id LIMIT 50",
            "corrected_query": "",
            "execution_success": True,
            "validation_result": {},
        }

        workflow_instance._learn_from_success(state)

        mock_fewshot_manager.add_example.assert_called_once()

    def test_learn_from_success_skips_failed(self, workflow_instance, mock_fewshot_manager):
        """Test that failed queries are not stored."""
        state = {
            "execution_success": False,
        }

        workflow_instance._learn_from_success(state)

        mock_fewshot_manager.add_example.assert_not_called()


class TestText2QueryWorkflowIntegration:
    """Integration tests for the complete workflow."""

    @pytest.fixture
    def workflow_with_all_mocks(self):
        """Create workflow with all dependencies mocked."""
        with patch("workflows.text2query_workflow.get_query_generator") as mock_gen, \
             patch("workflows.text2query_workflow.get_query_validator") as mock_val, \
             patch("workflows.text2query_workflow.get_query_corrector") as mock_cor, \
             patch("workflows.text2query_workflow.get_query_executor") as mock_exe, \
             patch("workflows.text2query_workflow.get_fewshot_manager") as mock_few:

            # Setup mock returns
            generator = MagicMock()
            generator.generate.return_value = GenerationResult(
                query="SELECT id, title FROM task.user_stories WHERE project_id = :project_id LIMIT 50",
                query_type=QueryType.SQL,
                fewshot_ids_used=["sql-001"],
            )
            mock_gen.return_value = generator

            validator = MagicMock()
            validator.validate.return_value = ValidationResult(
                is_valid=True,
                has_project_scope=True,
            )
            validator.ensure_result_limit.return_value = (
                "SELECT id, title FROM task.user_stories WHERE project_id = :project_id LIMIT 50"
            )
            mock_val.return_value = validator

            corrector = MagicMock()
            mock_cor.return_value = corrector

            executor = MagicMock()
            executor.execute.return_value = ExecutionResult(
                success=True,
                data=[{"id": "1", "title": "Story 1"}],
                columns=["id", "title"],
                row_count=1,
            )
            mock_exe.return_value = executor

            fewshot = MagicMock()
            mock_few.return_value = fewshot

            from workflows.text2query_workflow import Text2QueryWorkflow
            workflow = Text2QueryWorkflow()

            yield workflow

    def test_run_successful_query(self, workflow_with_all_mocks):
        """Test running a successful query through the workflow."""
        result = workflow_with_all_mocks.run(
            question="List user stories",
            project_id="proj-001",
            user_access_level=6,
        )

        assert result["execution_success"] is True
        assert result["query_type"] == "sql"
        assert result["confidence"] > 0.5
        assert "Query Results" in result["response"]


class TestWorkflowState:
    """Test workflow state initialization and structure."""

    def test_initial_state_structure(self):
        """Test that initial state has all required fields."""
        from workflows.text2query_workflow import Text2QueryState

        # Check that Text2QueryState has all required keys
        required_keys = [
            "question",
            "project_id",
            "user_access_level",
            "query_type",
            "generated_query",
            "generation_attempt",
            "fewshot_ids_used",
            "validation_result",
            "is_valid",
            "correction_attempt",
            "corrected_query",
            "execution_success",
            "execution_result",
            "execution_error",
            "formatted_response",
            "confidence",
            "metrics",
        ]

        # TypedDict should have all these as annotations
        assert all(key in Text2QueryState.__annotations__ for key in required_keys)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
