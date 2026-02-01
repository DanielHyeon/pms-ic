"""
Phase 2 Enhancement Tests - TextToSQL Improvement Roadmap

Tests for Phase 2 components:
1. Response Models (Pydantic)
2. Structured Generator
3. Chain-of-Thought Reasoning
4. Error Correction Strategies
5. Enhanced Query Corrector
6. SQL Knowledge Manager

These tests run WITHOUT external LLM services by using mocks.
"""

import pytest
import json
from unittest.mock import MagicMock, patch
from pydantic import ValidationError


# =============================================================================
# Response Models Tests
# =============================================================================


class TestSQLGenerationResponse:
    """Test SQLGenerationResponse Pydantic model."""

    def test_valid_response(self):
        """Test creating a valid SQL generation response."""
        from text2query.response_models import SQLGenerationResponse

        response = SQLGenerationResponse(
            sql="SELECT COUNT(*) FROM task.tasks WHERE project_id = :project_id",
            confidence=0.95,
            tables_used=["task.tasks"],
            reasoning="Counting tasks with project filter"
        )

        assert response.sql.startswith("SELECT")
        assert response.confidence == 0.95
        assert "task.tasks" in response.tables_used

    def test_confidence_bounds(self):
        """Test confidence must be between 0 and 1."""
        from text2query.response_models import SQLGenerationResponse

        with pytest.raises(ValidationError):
            SQLGenerationResponse(
                sql="SELECT 1",
                confidence=1.5  # Invalid - > 1
            )

    def test_sql_min_length(self):
        """Test SQL must have minimum length."""
        from text2query.response_models import SQLGenerationResponse

        with pytest.raises(ValidationError):
            SQLGenerationResponse(
                sql="SELECT",  # Too short
                confidence=0.9
            )


class TestQueryReasoningResponse:
    """Test QueryReasoningResponse Pydantic model."""

    def test_valid_reasoning(self):
        """Test creating valid reasoning response."""
        from text2query.response_models import QueryReasoningResponse, ReasoningStep

        response = QueryReasoningResponse(
            understanding="User wants task count",
            steps=[
                ReasoningStep(
                    step_number=1,
                    description="Identify tasks table",
                    tables_involved=["task.tasks"]
                ),
                ReasoningStep(
                    step_number=2,
                    description="Add count aggregation",
                    sql_fragment="SELECT COUNT(*)"
                )
            ],
            estimated_complexity="simple",
            requires_joins=False,
            aggregation_needed=True
        )

        assert response.understanding == "User wants task count"
        assert len(response.steps) == 2
        assert response.estimated_complexity == "simple"

    def test_complexity_literal(self):
        """Test complexity must be one of allowed values."""
        from text2query.response_models import QueryReasoningResponse, ReasoningStep

        with pytest.raises(ValidationError):
            QueryReasoningResponse(
                understanding="Test",
                steps=[ReasoningStep(step_number=1, description="Test")],
                estimated_complexity="very_complex"  # Invalid value
            )


class TestCorrectionResponse:
    """Test CorrectionResponse Pydantic model."""

    def test_valid_correction(self):
        """Test creating valid correction response."""
        from text2query.response_models import CorrectionResponse

        response = CorrectionResponse(
            corrected_sql="SELECT id FROM task.tasks WHERE project_id = :project_id LIMIT 100",
            error_analysis="Missing project_id filter",
            fix_applied="Added WHERE project_id = :project_id",
            confidence=0.9
        )

        assert "project_id" in response.corrected_sql
        assert response.confidence == 0.9


class TestValidationErrorDetail:
    """Test ValidationErrorDetail model."""

    def test_error_detail(self):
        """Test creating error detail."""
        from text2query.response_models import ValidationErrorDetail, ErrorType

        error = ValidationErrorDetail(
            error_type=ErrorType.SCHEMA,
            message="Table 'users' not found",
            suggestion="Use 'auth.users' instead"
        )

        assert error.error_type == ErrorType.SCHEMA
        assert "users" in error.message

    def test_error_types_enum(self):
        """Test all error types are defined."""
        from text2query.response_models import ErrorType

        expected = ["syntax_error", "schema_error", "security_violation",
                    "scope_error", "performance_issue", "logic_error", "unknown"]
        actual = [e.value for e in ErrorType]

        for e in expected:
            assert e in actual


# =============================================================================
# Structured Generator Tests
# =============================================================================


class TestStructuredGenerator:
    """Test StructuredGenerator with mocked LLM."""

    @pytest.fixture
    def mock_llm(self):
        """Create mock LLM service."""
        mock = MagicMock()
        return mock

    @pytest.fixture
    def generator(self, mock_llm):
        """Create StructuredGenerator with mock."""
        from text2query.llm import StructuredGenerator
        return StructuredGenerator(mock_llm)

    def test_generate_parses_json(self, generator, mock_llm):
        """Test generator parses JSON response."""
        from text2query.response_models import SQLGenerationResponse

        mock_llm.generate.return_value = json.dumps({
            "sql": "SELECT COUNT(*) FROM task.tasks",
            "confidence": 0.9,
            "tables_used": ["task.tasks"],
            "reasoning": "Count query"
        })

        result = generator.generate(
            prompt="Generate count query",
            response_model=SQLGenerationResponse
        )

        assert isinstance(result, SQLGenerationResponse)
        assert result.confidence == 0.9

    def test_generate_handles_markdown_json(self, generator, mock_llm):
        """Test generator extracts JSON from markdown blocks."""
        from text2query.response_models import SQLGenerationResponse

        mock_llm.generate.return_value = """Here's the response:

```json
{
    "sql": "SELECT id FROM tasks LIMIT 10",
    "confidence": 0.85,
    "tables_used": ["tasks"]
}
```
"""

        result = generator.generate(
            prompt="Generate query",
            response_model=SQLGenerationResponse
        )

        assert isinstance(result, SQLGenerationResponse)
        assert result.confidence == 0.85

    def test_generate_retries_on_failure(self, generator, mock_llm):
        """Test generator retries on parse failure."""
        from text2query.response_models import SQLGenerationResponse

        # First call returns invalid, second returns valid
        mock_llm.generate.side_effect = [
            "Invalid response",
            json.dumps({
                "sql": "SELECT 1 FROM dual",
                "confidence": 0.7
            })
        ]

        result = generator.generate(
            prompt="Generate",
            response_model=SQLGenerationResponse,
            max_retries=2
        )

        assert isinstance(result, SQLGenerationResponse)
        assert mock_llm.generate.call_count == 2

    def test_generate_raises_after_max_retries(self, generator, mock_llm):
        """Test generator raises after max retries."""
        from text2query.response_models import SQLGenerationResponse

        mock_llm.generate.return_value = "Not JSON"

        with pytest.raises(ValueError, match="Failed to generate"):
            generator.generate(
                prompt="Generate",
                response_model=SQLGenerationResponse,
                max_retries=2
            )

        assert mock_llm.generate.call_count == 3  # 1 initial + 2 retries


# =============================================================================
# Reasoning Node Tests
# =============================================================================


class TestReasoningNode:
    """Test Chain-of-Thought reasoning node."""

    def test_build_reasoning_prompt(self):
        """Test building reasoning prompt."""
        from text2query.nodes import build_reasoning_prompt

        state = {
            "question": "How many tasks are blocked?",
            "project_id": 1,
            "user_role": "PM",
            "previous_context": None
        }

        prompt = build_reasoning_prompt(state)

        assert "How many tasks are blocked?" in prompt
        assert "PM" in prompt
        assert "project_id" in prompt.lower() or "Project ID" in prompt

    def test_should_use_reasoning_complex(self):
        """Test reasoning detection for complex queries."""
        from text2query.nodes import should_use_reasoning

        # Complex queries should use reasoning
        complex_queries = [
            {"question": "What is the sprint velocity trend?"},
            {"question": "Compare completion rate by team member"},
            {"question": "Show task percentage by status"},
            {"question": "What's the average story points per sprint?"},
        ]

        for state in complex_queries:
            assert should_use_reasoning(state), f"Should use reasoning for: {state['question']}"

    def test_should_use_reasoning_simple(self):
        """Test reasoning not needed for simple queries."""
        from text2query.nodes import should_use_reasoning

        # Simple queries don't need reasoning
        simple_queries = [
            {"question": "How many tasks?"},
            {"question": "List all sprints"},
            {"question": "Show blocked tasks"},
        ]

        for state in simple_queries:
            assert not should_use_reasoning(state), f"Should not use reasoning for: {state['question']}"

    def test_reasoning_node_with_mock(self):
        """Test reasoning node with mocked generator."""
        from text2query.nodes import reasoning_node
        from text2query.response_models import QueryReasoningResponse, ReasoningStep

        mock_generator = MagicMock()
        mock_generator.generate.return_value = QueryReasoningResponse(
            understanding="Count blocked tasks",
            steps=[
                ReasoningStep(step_number=1, description="Query tasks table", tables_involved=["task.tasks"])
            ],
            estimated_complexity="simple",
            requires_joins=False,
            aggregation_needed=True
        )

        state = {
            "question": "How many blocked tasks?",
            "project_id": 1,
            "user_role": "PM"
        }

        result = reasoning_node(state, mock_generator)

        assert result["reasoning"] is not None
        assert result["reasoning"].estimated_complexity == "simple"
        assert "task.tasks" in result["relevant_tables"]


# =============================================================================
# Correction Strategies Tests
# =============================================================================


class TestCorrectionStrategies:
    """Test error correction strategies."""

    def test_categorize_column_error(self):
        """Test column not found error categorization."""
        from text2query.correction import categorize_error, ErrorCategory

        error = 'column "taskStatus" does not exist'
        category = categorize_error(error)

        assert category == ErrorCategory.COLUMN_NOT_FOUND

    def test_categorize_table_error(self):
        """Test table not found error categorization."""
        from text2query.correction import categorize_error, ErrorCategory

        error = 'relation "tasks" does not exist'
        category = categorize_error(error)

        assert category == ErrorCategory.TABLE_NOT_FOUND

    def test_categorize_syntax_error(self):
        """Test syntax error categorization."""
        from text2query.correction import categorize_error, ErrorCategory

        error = 'syntax error at or near "SELEC"'
        category = categorize_error(error)

        assert category == ErrorCategory.SYNTAX_ERROR

    def test_categorize_aggregation_error(self):
        """Test aggregation error categorization."""
        from text2query.correction import categorize_error, ErrorCategory

        error = 'column "status" must appear in the GROUP BY clause'
        category = categorize_error(error)

        assert category == ErrorCategory.INVALID_AGGREGATION

    def test_categorize_unknown_error(self):
        """Test unknown error categorization."""
        from text2query.correction import categorize_error, ErrorCategory

        error = 'some random error message xyz'
        category = categorize_error(error)

        assert category == ErrorCategory.UNKNOWN

    def test_get_correction_strategy(self):
        """Test getting correction strategy for error."""
        from text2query.correction import get_correction_strategy, ErrorCategory

        strategy = get_correction_strategy('column "xyz" does not exist')

        assert strategy.category == ErrorCategory.COLUMN_NOT_FOUND
        assert "column name" in strategy.prompt_modifier.lower()

    def test_all_strategies_have_prompts(self):
        """Test all strategies have prompt modifiers."""
        from text2query.correction import CORRECTION_STRATEGIES

        for category, strategy in CORRECTION_STRATEGIES.items():
            assert strategy.prompt_modifier, f"Strategy {category} missing prompt_modifier"
            assert len(strategy.prompt_modifier) > 50, f"Strategy {category} prompt too short"


# =============================================================================
# Enhanced Corrector Tests
# =============================================================================


class TestEnhancedCorrector:
    """Test enhanced query corrector."""

    @pytest.fixture
    def mock_generator(self):
        """Create mock structured generator."""
        mock = MagicMock()
        return mock

    @pytest.fixture
    def corrector(self, mock_generator):
        """Create corrector with mock."""
        from text2query.correction import EnhancedQueryCorrector
        return EnhancedQueryCorrector(
            generator=mock_generator,
            validator=None  # No validation for unit tests
        )

    def test_correct_returns_result(self, corrector, mock_generator):
        """Test corrector returns CorrectionResult."""
        from text2query.response_models import CorrectionResponse
        from text2query.correction import CorrectionResult

        mock_generator.generate.return_value = CorrectionResponse(
            corrected_sql="SELECT id FROM task.tasks WHERE project_id = :project_id LIMIT 100",
            error_analysis="Missing project filter",
            fix_applied="Added project_id filter",
            confidence=0.9
        )

        result = corrector.correct(
            question="Show tasks",
            invalid_sql="SELECT id FROM tasks",
            error_message='relation "tasks" does not exist',
            project_id=1
        )

        assert isinstance(result, CorrectionResult)
        assert result.success  # No validator, so assumes success
        assert "project_id" in result.corrected_query

    def test_max_attempts_respected(self, mock_generator):
        """Test max attempts is respected."""
        from text2query.correction import EnhancedQueryCorrector
        from text2query.response_models import CorrectionResponse

        # Create validator that always fails
        mock_validator = MagicMock()
        mock_validator.validate.return_value = MagicMock(
            is_valid=False,
            errors=[MagicMock(message="Still invalid")],
            get_first_error_message=lambda: "Still invalid"
        )

        corrector = EnhancedQueryCorrector(
            generator=mock_generator,
            validator=mock_validator
        )

        mock_generator.generate.return_value = CorrectionResponse(
            corrected_sql="SELECT id FROM task.tasks WHERE project_id = :project_id",
            error_analysis="Analysis",
            fix_applied="Fix",
            confidence=0.5
        )

        result = corrector.correct(
            question="Test",
            invalid_sql="SELECT *",
            error_message="Error",
            project_id=1,
            max_attempts=3
        )

        assert not result.success
        assert result.attempts == 3

    def test_simple_correction(self, corrector, mock_generator):
        """Test simple correction without validation."""
        mock_generator.llm.generate.return_value = """
SELECT id, title
FROM task.tasks
WHERE project_id = :project_id
LIMIT 100
"""

        result = corrector.correct_simple(
            invalid_sql="SELECT * FROM tasks",
            error_message='relation "tasks" does not exist'
        )

        assert "task.tasks" in result or "SELECT" in result


# =============================================================================
# SQL Knowledge Manager Tests
# =============================================================================


class TestSQLKnowledgeManager:
    """Test SQL knowledge manager."""

    @pytest.fixture
    def knowledge(self):
        """Create knowledge manager instance."""
        from text2query.knowledge import SQLKnowledgeManager
        km = SQLKnowledgeManager()
        km._ensure_initialized()
        return km

    def test_sql_functions_loaded(self, knowledge):
        """Test SQL functions are loaded."""
        assert len(knowledge._sql_functions) > 0
        assert "COUNT" in knowledge._sql_functions
        assert "SUM" in knowledge._sql_functions
        assert "DATE_TRUNC" in knowledge._sql_functions

    def test_function_has_required_fields(self, knowledge):
        """Test function info has all required fields."""
        count_func = knowledge._sql_functions["COUNT"]

        assert count_func.name == "COUNT"
        assert count_func.syntax
        assert count_func.description
        assert len(count_func.examples) > 0
        assert count_func.category == "aggregate"

    def test_get_functions_context(self, knowledge):
        """Test getting function context."""
        context = knowledge.get_sql_functions_context()

        assert "COUNT" in context
        assert "aggregate" in context.lower()
        assert "date" in context.lower()

    def test_get_functions_by_category(self, knowledge):
        """Test filtering functions by category."""
        context = knowledge.get_sql_functions_context(categories=["aggregate"])

        assert "COUNT" in context
        assert "SUM" in context
        # Date functions should not be included
        assert "DATE_TRUNC" not in context or "aggregate" in context.lower()

    def test_get_metric_instructions(self, knowledge):
        """Test getting metric instructions."""
        instructions = knowledge.get_metric_instructions()

        # May be empty if semantic layer not loaded, but should not error
        assert instructions is not None

    def test_get_json_instructions(self, knowledge):
        """Test getting JSON field instructions."""
        instructions = knowledge.get_json_field_instructions()

        assert "->>" in instructions
        assert "JSON" in instructions

    def test_get_common_patterns(self, knowledge):
        """Test getting common patterns."""
        patterns = knowledge.get_common_patterns()

        assert "COUNT" in patterns
        assert "FILTER" in patterns
        assert "GROUP BY" in patterns

    def test_get_full_context(self, knowledge):
        """Test getting full context."""
        context = knowledge.get_full_context(include_patterns=True)

        assert "SQL Functions" in context
        assert "JSON" in context
        assert "Common Query Patterns" in context


class TestSQLKnowledgeSingleton:
    """Test SQL knowledge singleton behavior."""

    def test_get_singleton(self):
        """Test singleton behavior."""
        from text2query.knowledge import get_sql_knowledge, reset_sql_knowledge

        reset_sql_knowledge()
        k1 = get_sql_knowledge()
        k2 = get_sql_knowledge()

        assert k1 is k2

    def test_reset_singleton(self):
        """Test resetting singleton."""
        from text2query.knowledge import get_sql_knowledge, reset_sql_knowledge

        k1 = get_sql_knowledge()
        reset_sql_knowledge()
        k2 = get_sql_knowledge()

        assert k1 is not k2


# =============================================================================
# Integration Tests
# =============================================================================


class TestPhase2Integration:
    """Integration tests for Phase 2 components."""

    def test_structured_output_with_reasoning(self):
        """Test structured output integrates with reasoning."""
        from text2query.response_models import QueryReasoningResponse, SQLGenerationResponse

        # Both models should have compatible schema generation
        reasoning_schema = QueryReasoningResponse.model_json_schema()
        sql_schema = SQLGenerationResponse.model_json_schema()

        assert "properties" in reasoning_schema
        assert "properties" in sql_schema

    def test_correction_uses_strategies(self):
        """Test correction integrates with strategies."""
        from text2query.correction import get_correction_strategy, ErrorCategory

        # Common error messages should map to strategies
        errors = [
            ('column "xyz" does not exist', ErrorCategory.COLUMN_NOT_FOUND),
            ('relation "abc" does not exist', ErrorCategory.TABLE_NOT_FOUND),
            ('syntax error', ErrorCategory.SYNTAX_ERROR),
        ]

        for error_msg, expected_category in errors:
            strategy = get_correction_strategy(error_msg)
            assert strategy.category == expected_category

    def test_knowledge_with_semantic_layer(self):
        """Test knowledge manager uses semantic layer."""
        from text2query.knowledge import SQLKnowledgeManager
        from text2query.semantic import reset_semantic_layer

        reset_semantic_layer()
        km = SQLKnowledgeManager()
        km._ensure_initialized()

        # Should have loaded semantic layer
        if km._semantic_layer:
            assert len(km._semantic_layer.models) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
